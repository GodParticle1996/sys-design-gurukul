/* Swarm — ek process mein 1 origin (seeder) + N peers. Har peer ka apna HTTP server hai (alag port).
   Pieces ke ASLI bytes jaate hain, receiver har piece ka SHA-1 khud check karta hai.
   POST /start {mode:'origin'|'swarm', peers, malicious}  → GET /status */
const http = require('http');
const crypto = require('crypto');
const { serve, sleep, host } = require('../lib/util');
const PORT = +process.env.PORT || 4882;
const BASE = +process.env.PEER_BASE_PORT || 5000;
const PIECES = +process.env.PIECES || 32, PIECE_KB = +process.env.PIECE_KB || 64;
const ORIGIN_RATE = +process.env.ORIGIN_RATE || 20;       // origin: 20 pieces/sec upload
const PEER_RATE = +process.env.PEER_RATE || 4;            // aam peer: 4 pieces/sec upload
const TRACKER = `http://${host('tracker')}:4881`;
const ME = process.env.ADVERTISE || '127.0.0.1';
const agent = new http.Agent({ keepAlive: true, maxSockets: 256 });

function makeTorrent() {
  const data = [], hashes = [];
  for (let i = 0; i < PIECES; i++) {
    const b = crypto.createHash('sha512').update('movie-piece-' + i).digest();
    const buf = Buffer.alloc(PIECE_KB * 1024); for (let k = 0; k < buf.length; k += 64) b.copy(buf, k);
    data.push(buf); hashes.push(crypto.createHash('sha1').update(buf).digest('hex'));
  }
  const info_hash = crypto.createHash('sha1').update(hashes.join('')).digest('hex');
  return { data, hashes, info_hash };
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const rq = http.get(url, { agent }, res => { const c = []; res.on('data', d => c.push(d)); res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(c) })); });
    rq.on('error', reject); rq.setTimeout(3000, () => rq.destroy(new Error('timeout')));
  });
}

let run = null;
function peerServer(peer) {
  return new Promise(resolve => {
    peer.server = http.createServer((req, res) => {
      if (req.url === '/bitfield') { const s = JSON.stringify([...peer.have]); res.writeHead(200, { 'content-type': 'application/json' }); return res.end(s); }
      const m = req.url.match(/^\/piece\/(\d+)$/);
      if (!m || !peer.have.has(+m[1])) { res.writeHead(404); return res.end(); }
      const now = Date.now();                                            // upload speed limit (token bucket)
      peer.tokens = Math.min(peer.rate, peer.tokens + (now - peer.last) / 1000 * peer.rate); peer.last = now;
      if (peer.tokens < 1) { res.writeHead(503); return res.end(); }
      peer.tokens -= 1; peer.uploaded++;
      let buf = run.t.data[+m[1]];
      if (peer.malicious) { buf = Buffer.from(buf); buf[7] ^= 0x55; }       // ek byte badla — bas itna kaafi hai
      res.writeHead(200, { 'content-type': 'application/octet-stream' }); res.end(buf);
    }).listen(peer.port, () => resolve());
  });
}

async function download(peer) {
  const t = run.t;
  let list = [], nextAnnounce = 0;
  while (peer.have.size < PIECES && run.running) {
    if (Date.now() >= nextAnnounce) {
      if (run.mode === 'origin') list = [{ peer_id: 'origin', addr: `${ME}:${BASE}` }];
      else {
        try {
          const r = await fetch(TRACKER + '/announce', { method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ info_hash: t.info_hash, peer_id: peer.id, addr: `${ME}:${peer.port}`, left: PIECES - peer.have.size }) }).then(r => r.json());
          list = r.peers;
        } catch (e) { list = []; }
      }
      nextAnnounce = Date.now() + 1000;
    }
    const cands = list.filter(x => !peer.banned.has(x.peer_id)).sort(() => Math.random() - 0.5).slice(0, 6);
    const fields = [];
    for (const c of cands) { try { const r = await httpGet(`http://${c.addr}/bitfield`); fields.push({ c, have: new Set(JSON.parse(r.body)) }); } catch (e) {} }
    const avail = new Map();                                                  // rarest-first: jo piece sabse kam logon ke paas hai
    for (const f of fields) for (const i of f.have) if (!peer.have.has(i)) avail.set(i, (avail.get(i) || 0) + 1);
    if (!avail.size) { await sleep(40); continue; }
    const order = [...avail.entries()].sort((a, b) => a[1] - b[1] || Math.random() - 0.5).map(x => x[0]);
    let got = false;
    for (const i of order.slice(0, 4)) {
      const src = fields.filter(f => f.have.has(i)).sort(() => Math.random() - 0.5)[0];
      let r; try { r = await httpGet(`http://${src.c.addr}/piece/${i}`); } catch (e) { continue; }
      if (r.status !== 200) continue;                                       // 503 = uska upload bhara hua
      run.bytes += r.body.length;
      const ok = crypto.createHash('sha1').update(r.body).digest('hex') === t.hashes[i];
      if (!ok) { run.corrupt++; peer.banned.add(src.c.peer_id); run.bans++; continue; }   // hash galat → wo peer ban
      peer.have.add(i); got = true;
      if (src.c.peer_id === 'origin') run.fromOrigin++;
    }
    if (!got) await sleep(40);
  }
  if (peer.have.size === PIECES && peer.done == null) peer.done = Date.now() - run.start;
}

async function stop() {
  if (!run) return;
  run.running = false;
  await Promise.all(run.all.map(p => new Promise(r => p.server.close(() => r()))));
}

serve(PORT, {
  'POST /start': async (req, res, url, p, b) => {
    await stop();
    try { await fetch(TRACKER + '/reset', { method: 'POST' }); } catch (e) {}
    b = b || {};
    const N = +(b.peers || 40), mal = +(b.malicious || 0);
    const t = makeTorrent();
    run = { t, mode: b.mode || 'swarm', running: true, start: Date.now(), bytes: 0, corrupt: 0, bans: 0, fromOrigin: 0, all: [] };
    const origin = { id: 'origin', port: BASE, have: new Set(t.data.keys()), rate: ORIGIN_RATE, tokens: ORIGIN_RATE, last: Date.now(), uploaded: 0, banned: new Set() };
    run.origin = origin; run.all.push(origin); await peerServer(origin);
    if (run.mode === 'swarm') await fetch(TRACKER + '/announce', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ info_hash: t.info_hash, peer_id: 'origin', addr: `${ME}:${BASE}`, left: 0 }) });
    run.peers = [];
    for (let i = 0; i < N; i++) {
      const peer = { id: 'p' + i, port: BASE + 1 + i, have: new Set(), rate: PEER_RATE, tokens: PEER_RATE, last: Date.now(), uploaded: 0, banned: new Set(), malicious: i >= N - mal, done: null };
      if (peer.malicious) peer.have = new Set(t.data.keys());                // jhootha: "mere paas sab hai"
      run.peers.push(peer); run.all.push(peer); await peerServer(peer);
    }
    for (const p of run.peers.filter(p => p.malicious))                    // jhoothe peers bhi tracker ko bolte hain "main seeder hoon"
      await fetch(TRACKER + '/announce', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ info_hash: t.info_hash, peer_id: p.id, addr: `${ME}:${p.port}`, left: 0 }) });
    run.peers.filter(p => !p.malicious).forEach(p => download(p));
    return { ok: true, mode: run.mode, peers: N, malicious: mal, pieces: PIECES, fileMB: +(PIECES * PIECE_KB / 1024).toFixed(1), info_hash: t.info_hash.slice(0, 12) };
  },
  'GET /status': () => {
    if (!run) return { running: false };
    const honest = run.peers.filter(p => !p.malicious);
    const done = honest.filter(p => p.done != null).map(p => p.done).sort((a, b) => a - b);
    const q = f => done.length ? done[Math.min(done.length - 1, Math.floor(f * done.length))] : null;
    return { mode: run.mode, elapsed_ms: Date.now() - run.start, peers: honest.length, finished: done.length, p50_ms: q(0.5), last_ms: done.length === honest.length ? done[done.length - 1] : null,
      origin_uploaded_pieces: run.origin.uploaded, pieces_needed: honest.length * PIECES, peer_uploaded_pieces: honest.reduce((s, p) => s + p.uploaded, 0),
      corrupt_pieces_caught: run.corrupt, bans: run.bans };
  },
  'POST /stop': async () => { await stop(); return { ok: true }; },
}, () => console.log(`[swarm] :${PORT} — origin :${BASE}, peers :${BASE + 1}..  (${PIECES} pieces x ${PIECE_KB} KB, origin ${ORIGIN_RATE}/s, peer ${PEER_RATE}/s)`));
