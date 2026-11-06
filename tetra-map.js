// 四面體地圖的投影和繪圖。index.html 和 launch.html 共用這一份，要在 <canvas id="map"> 之後載入

// 頁面用這兩個掛鉤加上自己的內容
const mapHooks = {
  // 要標示圓形範圍時傳回 { v: 圓心的單位向量, cos: 半徑的 cos }。可以另外給 rgb 和 mix（0 到 1）改變顏色和濃度
  tint: () => null,
  // 畫在地圖上面的圖層，參數是畫面涵蓋的平面範圍
  layers: (x0, x1, y0, y1) => {},
};

// ---------------------------------------------------------------------------
// 幾何設定
//
// 格子座標 (x, y)：用邊長 1 的正三角形格子鋪滿，有一組邊是水平的。
// 正四面體的表面 = 平面 ÷（繞每個格點轉 180°）。格點 (i, j) 依奇偶分成 4 類，
// 正好對應四面體的 4 個頂點；每個小三角形就是四面體的一個面。
//
// 畫面座標 (X, Y)：把格子轉 90°，讓一條邊直立在地圖的垂直中線上，
// 兩端的頂點分別在上邊中央和下邊中央。地圖是 √3 × 1 的長方形，
// 內部沒有頂點，四個邊的中點各有一個頂點；繞這些點轉 180° 就得到
// 上下左右相鄰的地圖，所以可以無限拼接。
// ---------------------------------------------------------------------------
const SQ3 = Math.sqrt(3);
const ROW = SQ3 / 2;                 // 一列三角形的高度
const MAP_W = SQ3, MAP_H = 1;
// 畫面 → 格子：(x, y) = (Y, ROW − X)，是轉 90°，不是鏡射
const dispToLat = (X, Y) => [Y, ROW - X];
const latToDisp = (x, y) => [ROW - y, x];
const TW = 4096, TH = 2048;          // 等距圓柱貼圖大小
const COLORS = ['#2b9cc8', '#ee7b30', '#9cbb4a', '#f3c641', '#b9926a'];
const OCEAN = '#cbe7ef';
const DEG = Math.PI / 180;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };
const fromLonLat = (lon, lat) => [Math.cos(lat * DEG) * Math.cos(lon * DEG), Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG)];

// 四面體頂點（單位球上），格點類別 k = (i&1) + 2*(j&1)
const V = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(norm);
// 讓三角形 (0,0)(1,0)(0,1) 從外面看是逆時針，地圖才不會左右顛倒
if (dot(cross(sub(V[1], V[0]), sub(V[2], V[0])), V[3]) > 0) [V[1], V[2]] = [V[2], V[1]];
const VX = V.map(v => v[0]), VY = V.map(v => v[1]), VZ = V.map(v => v[2]);

// 畫面上的頂點：上邊中央 = 頂點 1、下邊中央 = 頂點 0、左邊中點 = 頂點 2、右邊中點 = 頂點 3。
// 中央直立的邊是頂點 0–1。
//
// 基本擺法 B：頂點 1 在北極，頂點 0 在經度 0、南緯 19.47°（離北極 109.47°），
// 頂點 2、3 在經度 ±120°、南緯 19.47°。之後再整個轉到中央經線 CENTER_LON。
// 上下拖曳時繞「垂直於中央經線的水平軸」轉，北極和南極就沿著中央那條邊上下移動。
const CENTER_LON = 90;            // 用國界資料算過：北極、南極兩種擺法的角落頂點都離陸地最遠
const EDGE = Math.acos(-1 / 3) / DEG;          // 四面體一條邊在球面上的角度 109.47°
const SOUTH_PITCH = 180 - EDGE;               // 轉這麼多，南極就落在下邊中央的頂點
function baseMatrix() {
  const S = 90 - EDGE;
  const G = [[0, S], [0, 90], [120, S], [-120, S]].map(p => fromLonLat(p[0], p[1]));
  const build = g => {
    const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let k = 0; k < 4; k++)
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) M[r][c] += 0.75 * g[k][r] * V[k][c];
    return M;
  };
  let M = build(G);
  // 頂點 2、3 對調只會左右交換，用來修正鏡像
  if (dot(M[0], cross(M[1], M[2])) < 0) { [G[2], G[3]] = [G[3], G[2]]; M = build(G); }
  // 浮點誤差，正交化一下
  const c0 = norm([M[0][0], M[1][0], M[2][0]]);
  let c1 = [M[0][1], M[1][1], M[2][1]];
  const d = dot(c0, c1);
  c1 = norm([c1[0] - d * c0[0], c1[1] - d * c0[1], c1[2] - d * c0[2]]);
  const c2 = cross(c0, c1);
  return [[c0[0], c1[0], c2[0]], [c0[1], c1[1], c2[1]], [c0[2], c1[2], c2[2]]];
}
const R0 = baseMatrix();

function matMul(A, B) {
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) C[r][c] = A[r][0] * B[0][c] + A[r][1] * B[1][c] + A[r][2] * B[2][c];
  return C;
}
function rotZ(a) { const c = Math.cos(a), s = Math.sin(a); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; }
function rotY(a) { const c = Math.cos(a), s = Math.sin(a); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; }
function rotX(a) { const c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]]; }

// ---------------------------------------------------------------------------
// 狀態
// ---------------------------------------------------------------------------
const state = {
  tiled: true, equal: false, folds: false, grat: true, limit: true,
  yaw: 0, pitch: 0, roll: 0,
  cx: MAP_W / 2, cy: MAP_H / 2, scale: 300,
  mode: 'rotate',
};
let M = R0;
let geoVersion = 0;                  // 方向或投影模式改變時加一，用來更新機場位置的快取
function updateMatrix() {
  geoVersion++;
  M = matMul(rotZ((CENTER_LON + state.yaw) * DEG), matMul(rotY(state.pitch * DEG), matMul(rotX(state.roll * DEG), R0)));
}

// 畫面座標 (X, Y) → 地理座標的單位向量，寫入 out
function planeToGeo(X, Y, out) {
  const x = Y, y = ROW - X;
  const b = y / ROW, a = x - b * 0.5;
  const i = Math.floor(a), j = Math.floor(b);
  const fa = a - i, fb = b - j;
  const ci = i & 1, cj = j & 1;
  let k0, k1, k2, w0, w1, w2;
  if (fa + fb < 1) {                 // 向上的三角形 (i,j)(i+1,j)(i,j+1)
    k0 = ci + 2 * cj; k1 = (ci ^ 1) + 2 * cj; k2 = ci + 2 * (cj ^ 1);
    w0 = 1 - fa - fb; w1 = fa; w2 = fb;
  } else {                           // 向下的三角形 (i+1,j+1)(i+1,j)(i,j+1)
    k0 = (ci ^ 1) + 2 * (cj ^ 1); k1 = (ci ^ 1) + 2 * cj; k2 = ci + 2 * (cj ^ 1);
    w0 = fa + fb - 1; w1 = 1 - fb; w2 = 1 - fa;
  }
  // 四面體面上的點（離球心 1/3）
  const qx = w0 * VX[k0] + w1 * VX[k1] + w2 * VX[k2];
  const qy = w0 * VY[k0] + w1 * VY[k1] + w2 * VY[k2];
  const qz = w0 * VZ[k0] + w1 * VZ[k1] + w2 * VZ[k2];
  let px, py, pz;
  if (state.equal) {
    // 面積校正：沿著從面中心出發的每條射線重新分配距離，
    // 讓每個細扇形裡的球面面積和平面面積成比例，邊界保持不動
    const opp = 6 - k0 - k1 - k2;
    const nx = -VX[opp], ny = -VY[opp], nz = -VZ[opp];
    const dx = qx - nx / 3, dy = qy - ny / 3, dz = qz - nz / 3;
    const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const t = 1 - 3 * Math.min(w0, w1, w2);
    if (r < 1e-12 || t < 1e-12) { px = nx; py = ny; pz = nz; }
    else {
      const re = r / t;
      const cosEdge = 1 / Math.sqrt(1 + 9 * re * re);
      const cosT = 1 - t * t * (1 - cosEdge);
      const sinT = Math.sqrt(Math.max(0, 1 - cosT * cosT)) / r;
      px = nx * cosT + dx * sinT; py = ny * cosT + dy * sinT; pz = nz * cosT + dz * sinT;
    }
  } else {
    // 單純的心射投影：直接從球心把面上的點推到球面
    const l = Math.sqrt(qx * qx + qy * qy + qz * qz);
    px = qx / l; py = qy / l; pz = qz / l;
  }
  out[0] = M[0][0] * px + M[0][1] * py + M[0][2] * pz;
  out[1] = M[1][0] * px + M[1][1] * py + M[1][2] * pz;
  out[2] = M[2][0] * px + M[2][1] * py + M[2][2] * pz;
}

// planeToGeo 的反函數：地理座標的單位向量 → 畫面座標 (X, Y)。
// 地圖無限拼接，同一個地點有很多份；這裡回傳其中一份，其他的用 copyTransforms 取得。
// UP_TRI[opp]：格子裡對頂點是 opp 的向上三角形，三個頂點的 [類別, x, y]
const UP_TRI = [0, 1, 2, 3].map(opp => {
  const ci = (opp & 1) ^ 1, cj = (opp >> 1) ^ 1;
  const pos = (i, j) => [i + j / 2, j * ROW];
  return [[ci + 2 * cj, ...pos(ci, cj)], [(ci ^ 1) + 2 * cj, ...pos(ci + 1, cj)], [ci + 2 * (cj ^ 1), ...pos(ci, cj + 1)]];
});
function geoToPlane(g) {
  // 世界座標 → 四面體本體座標（M 是旋轉矩陣，反矩陣就是轉置）
  const px = M[0][0] * g[0] + M[1][0] * g[1] + M[2][0] * g[2];
  const py = M[0][1] * g[0] + M[1][1] * g[1] + M[2][1] * g[2];
  const pz = M[0][2] * g[0] + M[1][2] * g[1] + M[2][2] * g[2];
  // 落在哪一面：離哪個頂點最遠，就是那個頂點對面的面
  let opp = 0, md = Infinity;
  for (let k = 0; k < 4; k++) { const d = px * VX[k] + py * VY[k] + pz * VZ[k]; if (d < md) { md = d; opp = k; } }
  const nx = -VX[opp], ny = -VY[opp], nz = -VZ[opp];
  const pn = px * nx + py * ny + pz * nz;          // 和面中心夾角的 cos
  let qx = px / (3 * pn), qy = py / (3 * pn), qz = pz / (3 * pn);   // 從球心射到面上
  const tri = UP_TRI[opp];
  // 正四面體頂點兩兩內積 −1/3，所以重心座標 w = (3·q·V + 1) / 4
  const bary = (x, y, z) => tri.map(([k]) => (3 * (x * VX[k] + y * VY[k] + z * VZ[k]) + 1) / 4);
  let w = bary(qx, qy, qz);
  if (state.equal) {
    // 面積校正的反運算：沿同一條射線，把角度換回平面上的距離
    const dx = qx - nx / 3, dy = qy - ny / 3, dz = qz - nz / 3;
    const r = Math.hypot(dx, dy, dz), tg = 1 - 3 * Math.min(w[0], w[1], w[2]);
    if (r > 1e-12 && tg > 1e-12) {
      const re = r / tg, cosE = 1 / Math.sqrt(1 + 9 * re * re);
      const t = Math.sqrt(Math.max(0, (1 - pn) / (1 - cosE)));
      const f = re * t / r;
      qx = nx / 3 + dx * f; qy = ny / 3 + dy * f; qz = nz / 3 + dz * f;
      w = bary(qx, qy, qz);
    }
  }
  return latToDisp(w[0] * tri[0][1] + w[1] * tri[1][1] + w[2] * tri[2][1],
                   w[0] * tri[0][2] + w[1] * tri[1][2] + w[2] * tri[2][2]);
}

// 拼接的對稱：平移 a·(0, 2) + b·(√3, 1)，以及先繞上邊中央 (ROW, 1) 轉 180° 再平移。
// 每個元素 [s, ox, oy] 表示 (X, Y) → (s·X + ox, s·Y + oy)。列出會落在 [x0,x1]×[y0,y1] 附近的那些。
function copyTransforms(x0, x1, y0, y1) {
  const out = [];
  for (let b = Math.floor((x0 - MAP_W) / SQ3) - 1; b <= Math.ceil(x1 / SQ3) + 1; b++) {
    for (let a = Math.floor((y0 - b - 2) / 2) - 1; a <= Math.ceil((y1 - b + 1) / 2) + 1; a++) {
      const tx = b * SQ3, ty = 2 * a + b;
      out.push([1, tx, ty], [-1, 2 * ROW + tx, 2 + ty]);
    }
  }
  return out;
}
// 同一個地點離 ref 最近的那一份
function nearestCopy(P, ref) {
  let best = P, bd = Infinity;
  for (const [s, ox, oy] of copyTransforms(ref[0] - 2, ref[0] + 2, ref[1] - 2, ref[1] + 2)) {
    const X = s * P[0] + ox, Y = s * P[1] + oy, d = (X - ref[0]) ** 2 + (Y - ref[1]) ** 2;
    if (d < bd) { bd = d; best = [X, Y]; }
  }
  return best;
}

// ---------------------------------------------------------------------------
// 貼圖：先把世界地圖畫成等距圓柱投影，再逐像素反查
// ---------------------------------------------------------------------------
let topo, features, colorIdx;
let tex32, texDim32;                 // 正常 / 拼接區外淡化
let ids32, IW = 2048, IH = 1024;    // 國家編號貼圖，用來顯示滑過的國名

function assignColors() {
  const geoms = topo.objects.countries.geometries;
  const nb = topojson.neighbors(geoms);
  const order = d3.range(geoms.length).sort((a, b) => nb[b].length - nb[a].length);
  const used = new Array(COLORS.length).fill(0);
  colorIdx = new Array(geoms.length).fill(-1);
  for (const i of order) {
    const taken = new Set(nb[i].map(n => colorIdx[n]));
    let best = -1;
    for (let c = 0; c < COLORS.length; c++)
      if (!taken.has(c) && (best < 0 || used[c] < used[best])) best = c;
    if (best < 0) best = i % COLORS.length;
    colorIdx[i] = best;
    used[best]++;
  }
}

function buildTexture() {
  const cv = document.createElement('canvas');
  cv.width = TW; cv.height = TH;
  const ctx = cv.getContext('2d');
  const proj = d3.geoEquirectangular().scale(TW / (2 * Math.PI)).translate([TW / 2, TH / 2]);
  const path = d3.geoPath(proj, ctx);

  ctx.fillStyle = OCEAN;
  ctx.fillRect(0, 0, TW, TH);
  if (state.grat) {
    ctx.beginPath(); path(d3.geoGraticule().step([15, 15])());
    ctx.strokeStyle = 'rgba(70, 140, 165, 0.35)'; ctx.lineWidth = 2; ctx.stroke();
  }
  features.forEach((f, i) => {
    ctx.beginPath(); path(f);
    ctx.fillStyle = f.id === '010' ? '#fbfdfe' : COLORS[colorIdx[i]];
    ctx.fill();
  });
  ctx.beginPath(); path(topojson.mesh(topo, topo.objects.countries, (a, b) => a !== b));
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.beginPath(); path(topojson.mesh(topo, topo.objects.countries, (a, b) => a === b));
  ctx.strokeStyle = 'rgba(30, 80, 100, 0.45)'; ctx.lineWidth = 1.4; ctx.stroke();

  const data = ctx.getImageData(0, 0, TW, TH).data;
  tex32 = new Uint32Array(data.buffer);
  // 拼接區外：往白色混 35%
  const dim = new Uint8ClampedArray(data.length);
  for (let p = 0; p < data.length; p += 4) {
    dim[p] = data[p] * 0.65 + 89;
    dim[p + 1] = data[p + 1] * 0.65 + 89;
    dim[p + 2] = data[p + 2] * 0.65 + 89;
    dim[p + 3] = 255;
  }
  texDim32 = new Uint32Array(dim.buffer);
}

function buildIdTexture() {
  const cv = document.createElement('canvas');
  cv.width = IW; cv.height = IH;
  const ctx = cv.getContext('2d');
  const path = d3.geoPath(d3.geoEquirectangular().scale(IW / (2 * Math.PI)).translate([IW / 2, IH / 2]), ctx);
  features.forEach((f, i) => {
    const n = i + 1;
    ctx.fillStyle = `rgb(${n & 255},${(n >> 8) & 255},0)`;
    ctx.beginPath(); path(f); ctx.fill();
  });
  ids32 = new Uint32Array(ctx.getImageData(0, 0, IW, IH).data.buffer);
}

// ---------------------------------------------------------------------------
// 繪製
// ---------------------------------------------------------------------------
const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d');
const buf = document.createElement('canvas');
const bctx = buf.getContext('2d');
let dpr = 1, bgColor = 0;

function readBg() {
  const c = document.createElement('canvas'); c.width = c.height = 1;
  const x = c.getContext('2d');
  x.fillStyle = getComputedStyle(document.body).backgroundColor;
  x.fillRect(0, 0, 1, 1);
  bgColor = new Uint32Array(x.getImageData(0, 0, 1, 1).data.buffer)[0];
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
}

function fitView() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  state.scale = Math.min(w * 0.9 / MAP_W, h * 0.8 / MAP_H);
  state.cx = MAP_W / 2; state.cy = MAP_H / 2;
}

function draw(q) {
  if (!tex32) return;
  const W = Math.max(1, Math.round(canvas.width * q));
  const H = Math.max(1, Math.round(canvas.height * q));
  if (buf.width !== W || buf.height !== H) { buf.width = W; buf.height = H; }
  const img = bctx.createImageData(W, H);
  const out = new Uint32Array(img.data.buffer);
  const S = state.scale * dpr * q;
  const g = [0, 0, 0];
  const tiled = state.tiled;
  // 圈內的像素混入淡紫色（直接用球面上的距離判斷，跨摺線、拼接都正確）
  const tint = mapHooks.tint(), rc = tint ? tint.v : null, rcos = tint ? tint.cos : 2;
  const rgb = tint && tint.rgb || [122, 79, 208], mix = tint && tint.mix || 0.28, keep = 1 - mix;
  const addR = rgb[0] * mix, addG = rgb[1] * mix, addB = rgb[2] * mix;
  let k = 0;
  for (let py = 0; py < H; py++) {
    const y = state.cy - (py + 0.5 - H / 2) / S;
    const rowIn = y >= 0 && y < MAP_H;
    for (let px = 0; px < W; px++, k++) {
      const x = state.cx + (px + 0.5 - W / 2) / S;
      const inMain = rowIn && x >= 0 && x < MAP_W;
      if (!inMain && !tiled) { out[k] = bgColor; continue; }
      planeToGeo(x, y, g);
      const lon = Math.atan2(g[1], g[0]);
      const lat = Math.asin(Math.max(-1, Math.min(1, g[2])));
      let u = ((lon / (2 * Math.PI) + 0.5) * TW) | 0;
      let v = ((0.5 - lat / Math.PI) * TH) | 0;
      if (u >= TW) u = TW - 1;
      if (v >= TH) v = TH - 1;
      const c = (inMain ? tex32 : texDim32)[v * TW + u];
      if (rc && g[0] * rc[0] + g[1] * rc[1] + g[2] * rc[2] >= rcos) {
        out[k] = 0xff000000 | ((((c >> 16) & 255) * keep + addB) << 16)
          | ((((c >> 8) & 255) * keep + addG) << 8) | ((c & 255) * keep + addR);
      } else out[k] = c;
    }
  }
  bctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
  drawOverlay();
}

function toScreen(x, y) {
  return [(canvas.clientWidth / 2 + (x - state.cx) * state.scale) * dpr,
          (canvas.clientHeight / 2 - (y - state.cy) * state.scale) * dpr];
}

function drawOverlay() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const x0 = state.cx - w / 2 / state.scale, x1 = state.cx + w / 2 / state.scale;
  const y0 = state.cy - h / 2 / state.scale, y1 = state.cy + h / 2 / state.scale;
  ctx.save();
  if (state.folds) {
    // 在格子座標裡畫摺線，再轉回畫面
    const lx0 = y0, lx1 = y1, ly0 = ROW - x1, ly1 = ROW - x0;
    const T = (x, y) => { const d = latToDisp(x, y); return toScreen(d[0], d[1]); };
    ctx.strokeStyle = 'rgba(20, 50, 70, 0.45)';
    ctx.lineWidth = 1 * dpr;
    ctx.setLineDash([5 * dpr, 4 * dpr]);
    ctx.beginPath();
    for (let j = Math.floor(ly0 / ROW); j <= Math.ceil(ly1 / ROW); j++) {
      const a = T(lx0, j * ROW), b = T(lx1, j * ROW);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    // 斜線：x ∓ y/√3 = n
    const span = (ly1 - ly0) / SQ3;
    for (const s of [1, -1]) {
      for (let n = Math.floor(lx0 - span) - 1; n <= Math.ceil(lx1 + span) + 1; n++) {
        const a = T(n + s * ly0 / SQ3, ly0), b = T(n + s * ly1 / SQ3, ly1);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // 四面體的四個頂點
    const colors = ['#d43d3d', '#7a4fd0', '#1b9a6a', '#d08a12'];
    for (let j = Math.floor(ly0 / ROW) - 1; j <= Math.ceil(ly1 / ROW) + 1; j++) {
      for (let i = Math.floor(lx0 - j / 2) - 1; i <= Math.ceil(lx1 - j / 2) + 1; i++) {
        const p = T(i + j / 2, j * ROW);
        ctx.fillStyle = colors[(i & 1) + 2 * (j & 1)];
        ctx.beginPath(); ctx.arc(p[0], p[1], 4 * dpr, 0, 2 * Math.PI); ctx.fill();
      }
    }
  }
  if (state.tiled) {
    const a = toScreen(0, MAP_H), b = toScreen(MAP_W, 0);
    ctx.strokeStyle = 'rgba(20, 50, 70, 0.7)';
    ctx.lineWidth = 1.5 * dpr;
    ctx.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
  }
  mapHooks.layers(x0, x1, y0, y1);
  ctx.restore();
}

// 把幾條折線畫到畫面上所有看得到的拷貝（T 是 copyTransforms 的結果）
function strokePaths(paths, T, x0, x1, y0, y1) {
  for (const pts of paths) {
    let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
    for (const [X, Y] of pts) { bx0 = Math.min(bx0, X); bx1 = Math.max(bx1, X); by0 = Math.min(by0, Y); by1 = Math.max(by1, Y); }
    for (const [s, ox, oy] of T) {
      const cx0 = s > 0 ? bx0 + ox : ox - bx1, cx1 = s > 0 ? bx1 + ox : ox - bx0;
      const cy0 = s > 0 ? by0 + oy : oy - by1, cy1 = s > 0 ? by1 + oy : oy - by0;
      if (cx1 < x0 || cx0 > x1 || cy1 < y0 || cy0 > y1) continue;
      pts.forEach(([X, Y], i) => {
        const p = toScreen(s * X + ox, s * Y + oy);
        if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]);
      });
    }
  }
}
