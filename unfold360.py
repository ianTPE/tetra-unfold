"""把等距圓柱（2:1）360 照片展開成四面體平面圖，數學與 index.html 的 planeToGeo 相同。

需要: pip install numpy pillow
用法: python unfold360.py <equirect.jpg> <out_dir> [--map]

方向（預設 upright）:
  upright  天頂在長方形上邊、天底在下邊，牆面的東西大致直立；
           四個角落在仰角 ±35°，水平線離角落至少 35°。
           B 是 A 再繞垂直軸轉 90°（轉 180° 會和 A 完全相同）。
  --map    世界地圖方向（四個角落在太平洋、北大西洋、南大西洋、印度洋），B 是 A 轉 180°。

輸出:
  A_plain.jpg / A_equal.jpg   方向 A，未校正 / 面積校正
  B_plain.jpg / B_equal.jpg   方向 B，角落和 A 錯開
  A_plain_folds.jpg           A 加上四面體摺線
  A_tiled.jpg                 A 的 2×2 拼接，用來檢查邊緣是否接得起來
"""
import sys, os
import numpy as np
from PIL import Image, ImageDraw

SQ3 = np.sqrt(3); ROW = SQ3 / 2; DEG = np.pi / 180

def norm(a): return a / np.linalg.norm(a)
def lonlat(lon, lat):
    return np.array([np.cos(lat*DEG)*np.cos(lon*DEG), np.cos(lat*DEG)*np.sin(lon*DEG), np.sin(lat*DEG)])

V = np.array([norm(np.array(v, float)) for v in [[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]]])
if np.dot(np.cross(V[1]-V[0], V[2]-V[0]), V[3]) > 0: V[[1, 2]] = V[[2, 1]]

def initial_matrix():
    G = [lonlat(*p) for p in [(-160, 0), (-35, 55), (-35, -55), (91, 0)]]
    build = lambda g: sum(0.75 * np.outer(g[k], V[k]) for k in range(4))
    M = build(G)
    if np.linalg.det(M) < 0: G[1], G[2] = G[2], G[1]; M = build(G)
    c0 = norm(M[:, 0]); c1 = M[:, 1] - np.dot(c0, M[:, 1]) * c0; c1 = norm(c1)
    return np.column_stack([c0, c1, np.cross(c0, c1)])

def rotZ(a):
    c, s = np.cos(a), np.sin(a); return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])

def upright_matrix():
    """天頂 = 邊 V2V3 的中點（長方形上邊），天底 = 邊 V0V1 的中點（下邊）；
    再轉到讓照片正前方（經度 0）落在長方形正中央。"""
    e3 = norm(V[2] + V[3]); e1 = norm(V[2] - V[3]); e2 = np.cross(e3, e1)
    return rotZ(-np.pi / 2) @ np.array([e1, e2, e3])

def plane_to_sphere(x, y, M, equal):
    b = y / ROW; a = x - b * 0.5
    i = np.floor(a).astype(int); j = np.floor(b).astype(int)
    fa = a - i; fb = b - j; ci = i & 1; cj = j & 1
    up = fa + fb < 1
    k0 = np.where(up, ci + 2*cj, (ci^1) + 2*(cj^1))
    k1 = (ci^1) + 2*cj
    k2 = ci + 2*(cj^1)
    w0 = np.where(up, 1 - fa - fb, fa + fb - 1)
    w1 = np.where(up, fa, 1 - fb)
    w2 = np.where(up, fb, 1 - fa)
    q = w0[..., None]*V[k0] + w1[..., None]*V[k1] + w2[..., None]*V[k2]
    if equal:
        n = -V[6 - k0 - k1 - k2]
        d = q - n / 3
        r = np.linalg.norm(d, axis=-1)
        t = 1 - 3 * np.minimum(np.minimum(w0, w1), w2)
        with np.errstate(divide='ignore', invalid='ignore'):
            re = r / t
            cosE = 1 / np.sqrt(1 + 9 * re * re)
            cosT = 1 - t * t * (1 - cosE)
            sinT = np.sqrt(np.maximum(0, 1 - cosT**2)) / r
        p = n * cosT[..., None] + d * sinT[..., None]
        bad = (r < 1e-12) | (t < 1e-12)
        p[bad] = n[bad]
    else:
        p = q / np.linalg.norm(q, axis=-1, keepdims=True)
    return p @ M.T

def sample(img, p):
    H, W, _ = img.shape
    lon = np.arctan2(p[..., 1], p[..., 0]); lat = np.arcsin(np.clip(p[..., 2], -1, 1))
    # 影像的 x 軸直接當成經度用，和地圖貼圖完全一樣；展開後的左右方向就和原始照片一致
    u = ((lon + np.pi) / (2*np.pi) * W - 0.5) % W
    v = np.clip((np.pi/2 - lat) / np.pi * H - 0.5, 0, H - 1)
    u0 = np.floor(u).astype(int); v0 = np.floor(v).astype(int)
    du = (u - u0)[..., None]; dv = (v - v0)[..., None]
    u1 = (u0 + 1) % W; v1 = np.minimum(v0 + 1, H - 1)
    f = img.astype(np.float32)
    out = (f[v0, u0]*(1-du)*(1-dv) + f[v0, u1]*du*(1-dv) + f[v1, u0]*(1-du)*dv + f[v1, u1]*du*dv)
    return np.clip(out, 0, 255).astype(np.uint8)

def render(img, M, equal, width, x0=0.0, y0=0.0, w=2.0, h=ROW):
    height = int(round(width * h / w))
    xs = x0 + (np.arange(width) + 0.5) / width * w
    ys = y0 + h - (np.arange(height) + 0.5) / height * h   # 影像 y 往下，平面 y 往上
    X, Y = np.meshgrid(xs, ys)
    return sample(img, plane_to_sphere(X, Y, M, equal))

def draw_folds(im, w=2.0, h=ROW, x0=0.0, y0=0.0):
    d = ImageDraw.Draw(im); W, H = im.size
    to = lambda x, y: ((x - x0) / w * W, (y0 + h - y) / h * H)
    for jj in range(-1, 3):
        y = jj * ROW
        d.line([to(-1, y), to(5, y)], fill=(255, 60, 60), width=2)
        for ii in range(-4, 6):
            for s in (+1, -1):
                xa = ii + jj * 0.5
                d.line([to(xa, y), to(xa + s * 0.5 * 2, y + ROW * 2)], fill=(255, 60, 60), width=2)
    return im

if __name__ == '__main__':
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    img = np.asarray(Image.open(src).convert('RGB'))
    if '--map' in sys.argv[3:]:
        A = initial_matrix(); B = rotZ(np.pi) @ A
    else:
        A = upright_matrix(); B = rotZ(np.pi / 2) @ A
    Image.fromarray(img).resize((2048, 1024), Image.LANCZOS).save(f'{out}/0_equirect.jpg', quality=90)
    for name, M in (('A', A), ('B', B)):
        for mode, eq in (('plain', False), ('equal', True)):
            Image.fromarray(render(img, M, eq, 2400)).save(f'{out}/{name}_{mode}.jpg', quality=90)
    draw_folds(Image.open(f'{out}/A_plain.jpg')).save(f'{out}/A_plain_folds.jpg', quality=90)
    # 2×2 拼接：證明邊緣接得起來
    Image.fromarray(render(img, A, False, 2400, x0=-1.0, y0=-ROW / 2, w=4.0, h=2 * ROW)).save(f'{out}/A_tiled.jpg', quality=90)
    print('done')
