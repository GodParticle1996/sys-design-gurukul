/* Routing service — 300×300 ka road graph (90,000 junctions, ~180,000 sadkein) memory mein.
   GET /route?algo=dijkstra|astar|bidir|overlay&from=x,y&to=x,y
   POST /jam {x, y, factor}  → us ilaake ki sadkein dheemi (traffic), phir /recompute
   POST /recompute {mode: full|cell}  → overlay dobara banao (poora naksha ya sirf wo cell) */
const { serve } = require('../lib/util');
const G = require('../lib/graph');
const PORT = +process.env.PORT || 5001, N = +(process.env.GRID || 300), CELL = +(process.env.CELL || 15);
const g = G.build(N, 7);
let ov = G.preprocess(g, CELL);
console.log(`[maps] graph ${N}x${N} = ${N * N} junctions | overlay cell=${CELL}: ${ov.dijkstras} border nodes, ${ov.shortcuts} shortcuts, ${ov.ms} ms`);
const id = s => { const [x, y] = s.split(',').map(Number); return y * N + x; };
serve(PORT, {
  'GET /route': (req, res, url) => {
    const from = id(url.searchParams.get('from')), to = id(url.searchParams.get('to')), algo = url.searchParams.get('algo') || 'dijkstra';
    const t = process.hrtime.bigint();
    const r = algo === 'astar' ? G.astar(g, from, to) : algo === 'bidir' ? G.bidirectional(g, from, to) : algo === 'overlay' ? G.overlayQuery(g, ov, from, to) : G.dijkstra(g, from, to);
    return { algo, minutes: +(r.cost / 60).toFixed(2), settled: r.settled, relaxed: r.relaxed, ms: +(Number(process.hrtime.bigint() - t) / 1e6).toFixed(1) };
  },
  'POST /jam': (req, res, url, p, b) => {                             // ek ilaake ki sab sadkein `factor` guna dheemi
    const cx = +b.x, cy = +b.y, r = +(b.radius || 7), f = +(b.factor || 4);
    let edges = 0;
    for (let y = Math.max(0, cy - r); y <= Math.min(N - 1, cy + r); y++) for (let x = Math.max(0, cx - r); x <= Math.min(N - 1, cx + r); x++) {
      const u = y * N + x;
      for (let e = g.head[u]; e !== -1; e = g.nxt[e]) { g.w[e] *= f; edges++; }
    }
    return { jammedEdges: edges, cell: ov.cellOf(cy * N + cx) };
  },
  'POST /recompute': (req, res, url, p, b) => {
    const t = Date.now();
    if (b.mode === 'cell') { const c = +b.cell, part = G.preprocess(g, CELL, c); for (const [k, v] of part.rows) ov.rows.set(k, v); return { mode: 'cell', cell: c, borderNodes: part.dijkstras, ms: Date.now() - t }; }
    ov = G.preprocess(g, CELL); return { mode: 'full', borderNodes: ov.dijkstras, shortcuts: ov.shortcuts, ms: Date.now() - t };
  },
  'GET /stats': () => ({ N, cell: CELL, junctions: N * N, borderNodes: ov.dijkstras, shortcuts: ov.shortcuts, preprocessMs: ov.ms }),
}, () => console.log(`[maps] :${PORT}`));
