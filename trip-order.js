// 排行程順序的算法。網頁（index.html）和命令列工具（plan_route.js）共用這一份
const EARTH_R = 6371.0088;           // 地球平均半徑（公里）
const MAX_STOPS = 30;
const EXACT_STOPS = 16;              // 這個站數以內算得出真正最短的順序，超過就用近似算法

// 最順的順序：第一站固定當出發地。d 是各站之間的距離表，第 0 站是出發地，傳回的順序也從 0 開始
// 動態規劃（Held-Karp）：記住「走過哪些站、停在哪一站」的最短距離，不必一個一個排法試。
// 16 站要算約 700 萬步，瞬間完成；只試排法的話要 15! ≈ 1.3 兆種
function exactOrder(d, round) {
  const n = d.length - 1, size = 1 << n;
  const dp = new Float64Array(size * n).fill(Infinity), from = new Int8Array(size * n);
  for (let j = 0; j < n; j++) dp[(1 << j) * n + j] = d[0][j + 1];
  for (let mask = 1; mask < size; mask++) {
    for (let j = 0; j < n; j++) {
      const cur = dp[mask * n + j];
      if (cur === Infinity) continue;
      for (let k = 0; k < n; k++) {
        if (mask & (1 << k)) continue;
        const at = (mask | (1 << k)) * n + k, len = cur + d[j + 1][k + 1];
        if (len < dp[at]) { dp[at] = len; from[at] = j; }
      }
    }
  }
  let mask = size - 1, end = 0, best = Infinity;
  for (let j = 0; j < n; j++) {
    const len = dp[mask * n + j] + (round ? d[j + 1][0] : 0);
    if (len < best) { best = len; end = j; }
  }
  const order = [];
  while (mask) {
    order.push(end + 1);
    const prev = from[mask * n + end];
    mask ^= 1 << end;
    end = prev;
  }
  order.push(0);
  return order.reverse();
}

// 近似算法：從「每次飛最近的一站」開始，反覆翻轉一段（2-opt）、搬動一小段（or-opt），直到改不動。
// 多試幾個略有不同的起點，取最好的。亂數的種子固定，同一趟每次算出來都一樣
function approxOrder(d, round) {
  const m = d.length;
  const length = o => {
    let s = round ? d[o[m - 1]][0] : 0;
    for (let k = 0; k + 1 < m; k++) s += d[o[k]][o[k + 1]];
    return s;
  };
  let seed = 1;
  const random = () => (seed = seed * 48271 % 2147483647) / 2147483647;
  let best = null, bestLen = Infinity;
  for (let run = 0; run < 60; run++) {
    let o = [0];
    const left = new Set(d.keys()); left.delete(0);
    while (left.size) {
      const last = o[o.length - 1], near = [...left].sort((x, y) => d[last][x] - d[last][y]);
      const next = run && near.length > 1 && random() < 0.25 ? near[1] : near[0];
      o.push(next); left.delete(next);
    }
    let len = length(o), improved = true;
    const tryOrder = c => {
      const l = length(c);
      if (l < len - 1e-9) { o = c; len = l; improved = true; }
    };
    while (improved) {
      improved = false;
      for (let i = 1; i < m - 1; i++) {
        for (let k = i + 1; k < m; k++) {
          tryOrder([...o.slice(0, i), ...o.slice(i, k + 1).reverse(), ...o.slice(k + 1)]);
        }
      }
      for (let size = 1; size <= 3; size++) {
        for (let i = 1; i + size <= m; i++) {
          const piece = o.slice(i, i + size), rest = [...o.slice(0, i), ...o.slice(i + size)];
          for (let at = 1; at <= rest.length; at++) {
            if (at !== i) tryOrder([...rest.slice(0, at), ...piece, ...rest.slice(at)]);
          }
        }
      }
    }
    if (len < bestLen) { bestLen = len; best = o; }
  }
  return best;
}

// 依站數選算法。來回行程順著走、反著走一樣長，固定先飛近的那一站，結果才不會時左時右
function bestOrder(d, round) {
  const order = (d.length <= EXACT_STOPS ? exactOrder : approxOrder)(d, round);
  if (round && d[0][order[order.length - 1]] < d[0][order[1]]) order.splice(1, order.length - 1, ...order.slice(1).reverse());
  return order;
}

if (typeof module !== 'undefined') module.exports = { EARTH_R, MAX_STOPS, EXACT_STOPS, exactOrder, approxOrder, bestOrder };
