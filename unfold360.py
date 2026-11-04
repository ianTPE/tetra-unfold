"""把等距圓柱（2:1）360 照片展開成四面體平面圖，數學與 index.html 的 planeToGeo 相同。

需要: pip install numpy pillow
用法: python unfold360.py <equirect.jpg> <out_dir>

版面：和 index.html 相同的 √3 × 1 長方形（四面體的一條邊直立在中央）。
擺法：相機水平時，水平中線就是地平線，上半張全部是天空、下半張全部是地面；
      畫面正中央是正前方，正後方在四個角，天頂在上邊 1/4、3/4 處，天底在下邊 1/4、3/4 處。
      四個角落頂點：上下邊中央（仰角 ±54.7°），左右邊中點（地平線上，方位 ±125.3°）。
雙方向：B 是 A 繞垂直軸轉 180°。任何方向離其中一張的角落至少 35.3°，地平線上也是。

輸出:
  A_plain.jpg / A_equal.jpg   方向 A，未校正（同一面內直線保持直線）/ 面積校正（每個像素的立體角相同）
  B_plain.jpg / B_equal.jpg   方向 B
  A_plain_folds.jpg           A 加上四面體摺線
  A_tiled.jpg                 A 往四周拼接一圈，用來檢查邊緣是否接得起來
"""
import sys, os
import numpy as np
from PIL import Image, ImageDraw

SQ3 = np.sqrt(3); ROW = SQ3 / 2
MAP_W, MAP_H = SQ3, 1.0


def norm(a): return a / np.linalg.norm(a, axis=-1, keepdims=True)


# 正四面體頂點；格點 (i, j) 的類別 k = (i&1) + 2*(j&1)。讓三角形 (0,0)(1,0)(0,1) 從外面看是逆時針，畫面才不會鏡像
V = norm(np.array([[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]], float))
if np.dot(np.cross(V[1] - V[0], V[2] - V[0]), V[3]) > 0: V[[1, 2]] = V[[2, 1]]

# 四面體本體 → 相機座標（x 前、y 左、z 上）。中央直立的邊 V0V1 的方向當「上」，
# 它的中點當「前」，於是水平中線 = 地平線
_UP = norm(V[1] - V[0]); _FRONT = norm(V[0] + V[1])
HORIZON = np.array([_FRONT, np.cross(_UP, _FRONT), _UP])


def rotZ(a):
    c, s = np.cos(a), np.sin(a); return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def plane_to_sphere(x, y, M, equal):
    """格子座標 (x, y) → 單位向量（M：四面體本體 → 輸出座標）"""
    b = y / ROW; a = x - b * 0.5
    i = np.floor(a).astype(int); j = np.floor(b).astype(int)
    fa = a - i; fb = b - j; ci = i & 1; cj = j & 1
    up = fa + fb < 1
    k0 = np.where(up, ci + 2*cj, (ci ^ 1) + 2*(cj ^ 1))
    k1 = (ci ^ 1) + 2*cj
    k2 = ci + 2*(cj ^ 1)
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


def display_to_sphere(X, Y, M, equal):
    """畫面座標 (X, Y)（地圖是 [0, √3] × [0, 1]）→ 單位向量。格子轉 90°：(x, y) = (Y, ROW − X)"""
    return plane_to_sphere(Y, ROW - X, M, equal)


def display_grid(width, x0=0.0, y0=0.0, w=MAP_W, h=MAP_H):
    height = int(round(width * h / w))
    X = x0 + (np.arange(width) + 0.5) / width * w
    Y = y0 + h - (np.arange(height) + 0.5) / height * h    # 影像 y 往下，畫面 Y 往上
    return np.meshgrid(X, Y)


def camera_dirs(width, equal, Q=np.eye(3), **region):
    """展開圖每個像素在相機座標裡的方向。Q 是額外的旋轉（例如雙方向的 B，或穩定畫面用的修正）"""
    X, Y = display_grid(width, **region)
    return display_to_sphere(X, Y, Q @ HORIZON, equal)


def sample(img, p):
    """從等距圓柱影像取色（雙線性）。影像往右 = 經度增加，和照片原本的左右方向一致"""
    H, W, _ = img.shape
    lon = np.arctan2(p[..., 1], p[..., 0]); lat = np.arcsin(np.clip(p[..., 2], -1, 1))
    u = ((lon + np.pi) / (2*np.pi) * W - 0.5) % W
    v = np.clip((np.pi/2 - lat) / np.pi * H - 0.5, 0, H - 1)
    u0 = np.floor(u).astype(int); v0 = np.floor(v).astype(int)
    du = (u - u0)[..., None]; dv = (v - v0)[..., None]
    u1 = (u0 + 1) % W; v1 = np.minimum(v0 + 1, H - 1)
    f = img.astype(np.float32)
    out = (f[v0, u0]*(1-du)*(1-dv) + f[v0, u1]*du*(1-dv) + f[v1, u0]*(1-du)*dv + f[v1, u1]*du*dv)
    return np.clip(out, 0, 255).astype(np.uint8)


def unfold(img, width, equal=False, R=np.eye(3), Q=np.eye(3), **region):
    """把世界座標的等距圓柱影像，依相機姿態 R（相機座標 → 世界座標）展開"""
    return sample(img, camera_dirs(width, equal, Q, **region) @ R.T)


def draw_folds(im, x0=0.0, y0=0.0, w=MAP_W, h=MAP_H, color=(255, 60, 60)):
    """在展開圖上畫四面體摺線（在格子座標裡畫，再轉回畫面）"""
    d = ImageDraw.Draw(im); PW, PH = im.size
    to = lambda x, y: ((ROW - y - x0) / w * PW, (y0 + h - x) / h * PH)   # 格子 → 畫面 → 像素
    lx0, lx1, ly0, ly1 = y0 - 1, y0 + h + 1, ROW - (x0 + w) - 1, ROW - x0 + 1
    for j in range(int(np.floor(ly0 / ROW)), int(np.ceil(ly1 / ROW)) + 1):
        d.line([to(lx0, j * ROW), to(lx1, j * ROW)], fill=color, width=2)
    span = (ly1 - ly0) / SQ3
    for s in (1, -1):
        for n in range(int(np.floor(lx0 - span)) - 1, int(np.ceil(lx1 + span)) + 2):
            d.line([to(n + s * ly0 / SQ3, ly0), to(n + s * ly1 / SQ3, ly1)], fill=color, width=2)
    return im


if __name__ == '__main__':
    src, out = sys.argv[1], sys.argv[2]
    img = np.asarray(Image.open(src).convert('RGB'))
    H, W = img.shape[:2]
    if abs(W / H - 2) > 0.01:
        sys.exit(f'{src} is {W} x {H}. An equirectangular 360 photo must be 2:1, so this would give a wrong result.')
    os.makedirs(out, exist_ok=True)
    Image.fromarray(img).resize((2048, 1024), Image.LANCZOS).save(f'{out}/0_equirect.jpg', quality=90)
    for name, Q in (('A', np.eye(3)), ('B', rotZ(np.pi))):
        for mode, eq in (('plain', False), ('equal', True)):
            Image.fromarray(unfold(img, 2400, eq, Q=Q)).save(f'{out}/{name}_{mode}.jpg', quality=90)
    draw_folds(Image.open(f'{out}/A_plain.jpg')).save(f'{out}/A_plain_folds.jpg', quality=90)
    # 往四周拼接一圈：證明邊緣接得起來
    big = dict(x0=-MAP_W / 2, y0=-0.5, w=2 * MAP_W, h=2.0)
    Image.fromarray(unfold(img, 2400, **big)).save(f'{out}/A_tiled.jpg', quality=90)
    print('done')
