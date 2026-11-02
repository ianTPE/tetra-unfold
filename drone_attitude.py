"""無人機姿態測試：只靠 360 畫面判斷哪邊是天。

模擬無人機在任意姿態（包含倒過來）拍到的 360 畫面，在機身座標下用地平線擺法展開
（相機水平時，上半張 = 天、下半張 = 地），再用最簡單的規則估計「上」的方向：
  又亮又偏藍的像素當天空（門檻用 Otsu 自動決定），全黑的「沒有資料」區域不算，
  上方向 ≈ 天空像素方向的平均 − 地面像素方向的平均。
用面積校正模式的小圖（128 × 74 像素），每個像素的立體角相同，所以直接平均就好。

這只是示範用的簡單規則，不是完整的姿態估計：實際使用時應該和 IMU 結合，
平常用 IMU，受干擾、加速度計不可靠時，用畫面的天地方向來校正。

需要: pip install numpy pillow
用法: python drone_attitude.py <out_dir> <photo1.jpg> [photo2.jpg ...]
輸出: 每張照片的 *_1_level.jpg（水平時）、*_2_tilted.jpg（傾斜時）、*_3_stabilized.jpg（用估計結果轉回水平），
      以及 report.json（300 個隨機姿態的誤差統計）
"""
import sys, os, time, json
import numpy as np
from PIL import Image, ImageDraw
from unfold360 import unfold, camera_dirs, norm

EST_W = 128                       # 估計用的小圖寬度
TRIALS = 300


def random_rotation(rng):
    q = rng.normal(size=4); q /= np.linalg.norm(q)
    a, b, c, d = q
    return np.array([[a*a+b*b-c*c-d*d, 2*(b*c-a*d), 2*(b*d+a*c)],
                     [2*(b*c+a*d), a*a-b*b+c*c-d*d, 2*(c*d-a*b)],
                     [2*(b*d-a*c), 2*(c*d+a*b), a*a-b*b-c*c+d*d]])


def euler(roll, pitch, yaw):
    r, p, y = np.radians([roll, pitch, yaw])
    Rx = np.array([[1, 0, 0], [0, np.cos(r), -np.sin(r)], [0, np.sin(r), np.cos(r)]])
    Ry = np.array([[np.cos(p), 0, np.sin(p)], [0, 1, 0], [-np.sin(p), 0, np.cos(p)]])
    Rz = np.array([[np.cos(y), -np.sin(y), 0], [np.sin(y), np.cos(y), 0], [0, 0, 1]])
    return Rz @ Ry @ Rx


def otsu(x):
    h, edges = np.histogram(x, 128)
    c = (edges[:-1] + edges[1:]) / 2
    w0 = np.cumsum(h); w1 = w0[-1] - w0
    m0 = np.cumsum(h * c) / np.maximum(w0, 1)
    m1 = (np.sum(h * c) - np.cumsum(h * c)) / np.maximum(w1, 1)
    return c[np.argmax(w0 * w1 * (m0 - m1) ** 2)]


def estimate_up(pix, dirs):
    f = pix.reshape(-1, 3).astype(np.float32)
    d = dirs.reshape(-1, 3)
    valid = f.max(1) > 12                                  # 全黑 = 相機拍不到的地方
    f, d = f[valid], d[valid]
    score = f.mean(1) + 0.5 * (f[:, 2] - f[:, 0])          # 亮度 + 偏藍
    sky = score > otsu(score)
    return norm(d[sky].mean(0) - d[~sky].mean(0))


def rotation_to(a, b):
    v = np.cross(a, b); c = float(a @ b)
    if np.linalg.norm(v) < 1e-12:
        return np.eye(3) if c > 0 else np.diag([1.0, -1.0, -1.0])
    K = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + K + K @ K / (1 + c)


def mark_horizon(im):
    d = ImageDraw.Draw(im); w, h = im.size
    d.line([(0, h / 2), (w, h / 2)], fill=(255, 220, 0), width=2)
    return im


def angle(a, b):
    return float(np.degrees(np.arccos(np.clip(a @ b, -1, 1))))


if __name__ == '__main__':
    out, photos = sys.argv[1], sys.argv[2:]
    os.makedirs(out, exist_ok=True)
    dirs = camera_dirs(EST_W, True)
    up_world = np.array([0, 0, 1.0])
    rng = np.random.default_rng(42)
    report = {}
    for path in photos:
        name = os.path.splitext(os.path.basename(path))[0]
        img = np.asarray(Image.open(path).convert('RGB').resize((2048, 1024), Image.LANCZOS))

        mark_horizon(Image.fromarray(unfold(img, 1200))).save(f'{out}/{name}_1_level.jpg', quality=88)
        R = euler(70, 40, 25)                               # 大角度傾斜的例子
        Image.fromarray(unfold(img, 1200, R=R)).save(f'{out}/{name}_2_tilted.jpg', quality=88)
        est = estimate_up(unfold(img, EST_W, True, R=R), dirs)
        stab = unfold(img, 1200, R=R, Q=rotation_to(up_world, est))
        mark_horizon(Image.fromarray(stab)).save(f'{out}/{name}_3_stabilized.jpg', quality=88)

        errs, ms = [], []
        for _ in range(TRIALS):
            R = random_rotation(rng)
            small = unfold(img, EST_W, True, R=R)
            t0 = time.perf_counter()
            est = estimate_up(small, dirs)
            ms.append(1000 * (time.perf_counter() - t0))
            errs.append(angle(est, R.T @ up_world))
        errs = np.array(errs)
        report[name] = dict(median_deg=round(float(np.median(errs)), 1), p90_deg=round(float(np.percentile(errs, 90)), 1),
                            max_deg=round(float(errs.max()), 1), upside_down=int((errs > 90).sum()), trials=TRIALS,
                            ms_per_estimate=round(float(np.median(ms)), 2))
        print(name, report[name], flush=True)
    json.dump(report, open(f'{out}/report.json', 'w'), indent=1)
