/* N×N grid ka road network. Har 10va row/column = highway (tez), baaki gallis (dheemi).
   Edge ka weight = time (seconds) = doori / speed. Node id = y * N + x. */
function build(N, seed) {
  let s = seed >>> 0; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const head = new Int32Array(N * N).fill(-1), nxt = [], to = [], w = [];
  const add = (a, b, t) => { to.push(b); w.push(t); nxt.push(head[a]); head[a] = to.length - 1; };
  const LEN = 100;                                                   // har edge 100 meter
  const speed = (x, y, horiz) => ((horiz ? y : x) % 10 === 0 ? 16.7 : 8.3) * (0.8 + 0.4 * rnd());   // m/s (60 vs 30 kmph)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const id = y * N + x;
    if (x + 1 < N) { const t = LEN / speed(x, y, true); add(id, id + 1, t); add(id + 1, id, t); }
    if (y + 1 < N) { const t = LEN / speed(x, y, false); add(id, id + N, t); add(id + N, id, t); }
  }
  return { N, head, nxt, to, w, LEN, MAXSPEED: 16.7 * 1.2 };
}
class Heap {                                                          // chhota binary heap
  constructor() { this.a = []; }
  push(k, v) { const a = this.a; a.push([k, v]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
  get size() { return this.a.length; }
}
function dijkstra(g, src, dst) {
  const n = g.N * g.N, dist = new Float64Array(n).fill(Infinity), done = new Uint8Array(n);
  const h = new Heap(); dist[src] = 0; h.push(0, src); let settled = 0, relaxed = 0;
  while (h.size) {
    const [d, u] = h.pop(); if (done[u]) continue; done[u] = 1; settled++;
    if (u === dst) break;
    for (let e = g.head[u]; e !== -1; e = g.nxt[e]) { const v = g.to[e], nd = d + g.w[e]; relaxed++; if (nd < dist[v]) { dist[v] = nd; h.push(nd, v); } }
  }
  return { cost: dist[dst], settled, relaxed };
}
function astar(g, src, dst) {
  const N = g.N, n = N * N, dist = new Float64Array(n).fill(Infinity), done = new Uint8Array(n);
  const hx = dst % N, hy = (dst / N) | 0;
  const hfn = u => { const x = u % N, y = (u / N) | 0; return (Math.abs(x - hx) + Math.abs(y - hy)) * g.LEN / g.MAXSPEED; };   // admissible
  const h = new Heap(); dist[src] = 0; h.push(hfn(src), src); let settled = 0, relaxed = 0;
  while (h.size) {
    const [, u] = h.pop(); if (done[u]) continue; done[u] = 1; settled++;
    if (u === dst) break;
    const d = dist[u];
    for (let e = g.head[u]; e !== -1; e = g.nxt[e]) { const v = g.to[e], nd = d + g.w[e]; relaxed++; if (nd < dist[v]) { dist[v] = nd; h.push(nd + hfn(v), v); } }
  }
  return { cost: dist[dst], settled, relaxed };
}
function bidirectional(g, src, dst) {
  const n = g.N * g.N;
  const D = [new Float64Array(n).fill(Infinity), new Float64Array(n).fill(Infinity)];
  const done = [new Uint8Array(n), new Uint8Array(n)], H = [new Heap(), new Heap()];
  D[0][src] = 0; H[0].push(0, src); D[1][dst] = 0; H[1].push(0, dst);
  let best = Infinity, settled = 0, relaxed = 0;
  while (H[0].size && H[1].size) {
    for (const side of [0, 1]) {
      const [d, u] = H[side].pop(); if (done[side][u]) continue; done[side][u] = 1; settled++;
      if (done[1 - side][u]) best = Math.min(best, d + D[1 - side][u]);
      for (let e = g.head[u]; e !== -1; e = g.nxt[e]) { const v = g.to[e], nd = d + g.w[e]; relaxed++; if (nd < D[side][v]) { D[side][v] = nd; H[side].push(nd, v); if (done[1 - side][v]) best = Math.min(best, nd + D[1 - side][v]); } }
    }
    if (H[0].a.length && H[1].a.length && H[0].a[0][0] + H[1].a[0][0] >= best) break;
  }
  return { cost: best, settled, relaxed };
}
/* Cell overlay (CRP jaisa): naksha cells mein baanto, har cell ke BORDER nodes ke beech ka time pehle se nikaalo.
   Query: apne cell ke andar asli sadkein, beech mein border-to-border "shortcuts" — beech ke cells ke andar ki gallis chhui hi nahi jaati. */
function preprocess(g, cell, onlyCell) {
  const N = g.N, per = Math.ceil(N / cell), t0 = Date.now();
  const cellOf = u => (((u / N) | 0) / cell | 0) * per + ((u % N) / cell | 0);
  const bIndex = new Int32Array(N * N).fill(-1);
  const borders = Array.from({ length: per * per }, () => []);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const inX = x % cell, inY = y % cell;
    if (inX === 0 || inY === 0 || inX === cell - 1 || inY === cell - 1 || x === N - 1 || y === N - 1) { const u = y * N + x; bIndex[u] = borders[cellOf(u)].length; borders[cellOf(u)].push(u); }
  }
  const rows = new Map();                                              // border node → us cell ke sab borders tak ka time
  let dijkstras = 0, shortcuts = 0;
  const cells = onlyCell != null ? [onlyCell] : [...Array(per * per).keys()];
  for (const c of cells) {
    const list = borders[c];
    for (const b of list) {
      dijkstras++;
      const dist = new Map([[b, 0]]), h = new Heap(); h.push(0, b); const seen = new Set();
      while (h.size) {
        const [d, u] = h.pop(); if (seen.has(u)) continue; seen.add(u);
        for (let e = g.head[u]; e !== -1; e = g.nxt[e]) { const v = g.to[e]; if (cellOf(v) !== c) continue; const nd = d + g.w[e]; if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); h.push(nd, v); } }
      }
      const row = new Float64Array(list.length).fill(Infinity);
      list.forEach((b2, i) => { const d = dist.get(b2); if (d != null && b2 !== b) { row[i] = d; shortcuts++; } });
      rows.set(b, row);
    }
  }
  return { cell, per, borders, rows, bIndex, cellOf, ms: Date.now() - t0, dijkstras, shortcuts };
}
function overlayQuery(g, ov, src, dst) {
  const N = g.N, n = N * N, csrc = ov.cellOf(src), cdst = ov.cellOf(dst);
  const hx = dst % N, hy = (dst / N) | 0;
  const hfn = u => (Math.abs(u % N - hx) + Math.abs(((u / N) | 0) - hy)) * g.LEN / g.MAXSPEED;
  const dist = new Float64Array(n).fill(Infinity), done = new Uint8Array(n);
  const h = new Heap(); dist[src] = 0; h.push(hfn(src), src); let settled = 0, relaxed = 0;
  while (h.size) {
    const [, u] = h.pop(); if (done[u]) continue; done[u] = 1; settled++;
    const d = dist[u];
    if (u === dst) return { cost: d, settled, relaxed };
    const cu = ov.cellOf(u), bi = ov.bIndex[u];
    if (cu === csrc || cu === cdst || bi < 0) {                        // shuru/aakhri cell: asli sadkein
      for (let e = g.head[u]; e !== -1; e = g.nxt[e]) { const v = g.to[e], nd = d + g.w[e]; relaxed++; if (nd < dist[v]) { dist[v] = nd; h.push(nd + hfn(v), v); } }
    }
    if (bi >= 0) {                                                     // border node: shortcut se seedha doosre border par
      const row = ov.rows.get(u), list = ov.borders[cu];
      for (let i = 0; i < list.length; i++) { const s = row[i]; if (!isFinite(s)) continue; const v = list[i], nd = d + s; relaxed++; if (nd < dist[v]) { dist[v] = nd; h.push(nd + hfn(v), v); } }
      for (let e = g.head[u]; e !== -1; e = g.nxt[e]) { const v = g.to[e]; if (ov.cellOf(v) === cu) continue; const nd = d + g.w[e]; relaxed++; if (nd < dist[v]) { dist[v] = nd; h.push(nd + hfn(v), v); } }
    }
  }
  return { cost: Infinity, settled, relaxed };
}
module.exports = { build, dijkstra, astar, bidirectional, preprocess, overlayQuery, Heap };
