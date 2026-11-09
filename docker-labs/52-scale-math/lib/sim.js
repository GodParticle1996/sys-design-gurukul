'use strict';
// Seeded models for lab 52. Everything here is a simulation: no network, no real servers.
const { rng, exp } = require('./stats');

// ex1: request times with a small group of very slow requests.
// fast: 30 ms floor + exponential(15 ms); slow: uniform 2–8 s.
function tailSample(seed, n, slowShare) {
  if (!(n > 0)) throw new Error('tailSample: n must be > 0');
  if (!(slowShare >= 0 && slowShare < 1)) throw new Error('tailSample: slowShare must be in [0, 1)');
  const rand = rng(seed);
  const out = new Array(n);
  let slow = 0;
  for (let i = 0; i < n; i++) {
    if (rand() < slowShare) { out[i] = 2000 + rand() * 6000; slow++; }
    else out[i] = 30 + exp(rand, 15);
  }
  return { times: out, slow };
}

// ex2: one page calls `calls` services in parallel and waits for all of them.
// mode 'independent': every call is slow (1 s) with chance p on its own.
// mode 'shared': one shared hiccup (chance p per page) makes every call slow together.
function fanout(seed, pages, calls, p, mode) {
  if (!(calls >= 1)) throw new Error('fanout: calls must be >= 1');
  if (mode !== 'independent' && mode !== 'shared') throw new Error('fanout: unknown mode ' + mode);
  const rand = rng(seed);
  const page = new Array(pages);
  let slowCalls = 0;
  for (let i = 0; i < pages; i++) {
    const hiccup = mode === 'shared' && rand() < p;
    let worst = 0;
    for (let c = 0; c < calls; c++) {
      const slow = mode === 'shared' ? hiccup : rand() < p;
      const t = slow ? 1000 + rand() * 10 : 10 + exp(rand, 5);
      if (slow) slowCalls++;
      if (t > worst) worst = t;
    }
    page[i] = worst;
  }
  return { page, slowCallShare: slowCalls / (pages * calls) };
}

// ex3: one worker, one FIFO line. Random (Poisson) arrivals.
// service 'random': exponential with mean serviceMs; 'fixed': exactly serviceMs.
function queueRun(seed, n, rho, serviceMs, service) {
  if (!(rho > 0 && rho < 1)) throw new Error('queueRun: rho must be in (0, 1)');
  if (service !== 'random' && service !== 'fixed') throw new Error('queueRun: unknown service ' + service);
  const rand = rng(seed);
  const gapMean = serviceMs / rho;
  const resp = new Array(n);
  const waits = new Array(n);
  let t = 0, freeAt = 0, busy = 0;
  for (let i = 0; i < n; i++) {
    t += exp(rand, gapMean);
    const svc = service === 'fixed' ? serviceMs : exp(rand, serviceMs);
    const start = Math.max(t, freeAt);
    freeAt = start + svc;
    busy += svc;
    waits[i] = start - t;
    resp[i] = freeAt - t;
  }
  return { resp, waits, busyShare: busy / freeAt };
}

// Tiny binary heap ordered by (t, seq) so ties resolve the same way every run.
class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(e) {
    const a = this.a; a.push(e);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (less(a[i], a[p])) { [a[i], a[p]] = [a[p], a[i]]; i = p; } else break;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && less(a[l], a[m])) m = l;
        if (r < a.length && less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]]; i = m;
      }
    }
    return top;
  }
}
function less(x, y) { return x.t < y.t || (x.t === y.t && x.seq < y.seq); }

// ex5: two identical servers, each with one worker and its own FIFO line.
// A request goes to a random server. Normal work: exponential(8 ms).
// stragglers 'independent': 1% of copies hit a 200 ms pause (GC, background task) on that server only.
// stragglers 'heavy': 1% of requests are heavy and take 200 ms on whichever server runs them.
// policy 'none' | 'hedge' (spare copy after hedgeAfter ms, runs to the end)
//        'hedge-cancel' (a spare copy still waiting in line is dropped once the other copy finishes).
// budget: at most this share of the requests seen so far may get a spare copy (e.g. 0.05), checked at every hedge.
function hedgeRun(seed, n, opts) {
  const { rho, policy, hedgeAfter = 0, stragglers, budget = Infinity } = opts;
  if (!['none', 'hedge', 'hedge-cancel'].includes(policy)) throw new Error('hedgeRun: unknown policy ' + policy);
  if (!['independent', 'heavy'].includes(stragglers)) throw new Error('hedgeRun: unknown stragglers ' + stragglers);
  if (policy !== 'none' && !(hedgeAfter > 0)) throw new Error('hedgeRun: hedgeAfter must be > 0');
  const rand = rng(seed);
  const meanService = 0.99 * 8 + 0.01 * 200;
  const lambda = (2 * rho) / meanService;
  const servers = [0, 1].map(() => ({ line: [], busy: false, busyMs: 0 }));
  const heap = new Heap();
  let seq = 0, t = 0, firstMs = 0, extraMs = 0;
  const reqs = new Array(n);
  for (let i = 0; i < n; i++) {
    t += exp(rand, 1 / lambda);
    const heavy = stragglers === 'heavy' && rand() < 0.01;
    reqs[i] = { id: i, at: t, heavy, done: -1, home: rand() < 0.5 ? 0 : 1, copiesRun: 0, hedged: false };
    heap.push({ t, seq: seq++, kind: 'arrive', req: reqs[i] });
  }
  const serviceFor = req => {
    if (stragglers === 'heavy') return req.heavy ? 200 : exp(rand, 8);
    return rand() < 0.01 ? 200 : exp(rand, 8);
  };
  const tryStart = (s, now) => {
    const sv = servers[s];
    while (!sv.busy && sv.line.length) {
      const req = sv.line.shift();
      if (req.done >= 0 && policy === 'hedge-cancel') continue; // spare copy no longer needed
      const svc = serviceFor(req);
      if (req.copiesRun === 0) firstMs += svc; else extraMs += svc;
      sv.busy = true; sv.busyMs += svc; req.copiesRun++;
      heap.push({ t: now + svc, seq: seq++, kind: 'finish', req, server: s });
    }
  };
  let hedges = 0, arrived = 0, end = 0;
  while (heap.size) {
    const e = heap.pop();
    end = e.t;
    if (e.kind === 'arrive') {
      arrived++;
      servers[e.req.home].line.push(e.req);
      tryStart(e.req.home, e.t);
      if (policy !== 'none') heap.push({ t: e.t + hedgeAfter, seq: seq++, kind: 'hedge', req: e.req });
    } else if (e.kind === 'hedge') {
      if (e.req.done < 0 && hedges + 1 <= budget * arrived) {
        const other = 1 - e.req.home;
        e.req.hedged = true; hedges++;
        servers[other].line.push(e.req);
        tryStart(other, e.t);
      }
    } else {
      servers[e.server].busy = false;
      if (e.req.done < 0) e.req.done = e.t;
      tryStart(e.server, e.t);
    }
  }
  const resp = reqs.map(r => r.done - r.at);
  const copies = reqs.reduce((a, r) => a + r.copiesRun, 0);
  return {
    resp,
    hedgedShare: hedges / n,                 // spare copies sent
    extraStartedShare: (copies - n) / n,     // spare copies that actually ran (cancel drops queued ones)
    extraWorkShare: extraMs / firstMs,       // service time of extra copies ÷ service time of first copies
    busyShare: (servers[0].busyMs + servers[1].busyMs) / (2 * end),
  };
}

// ex4 model: Amdahl's law. s = serial share, n = workers.
function amdahl(s, n) {
  return 1 / (s + (1 - s) / n);
}

module.exports = { tailSample, fanout, queueRun, hedgeRun, amdahl, Heap };
