/* Upload edge — kamzor mobile link ki nakal.
   Har connection ka ek random "maut ka point" (exponential, average LINK_MB = 30 MB): utne bytes ke baad link toot jaata hai.
   Link speed ~LINK_MBPS (default 80 MB/s) — server padhne ki raftaar dheemi karta hai.
   POST /blob                   → poori file ek request mein (toota = shuru se)
   POST /session → {id}; PUT /chunk/:id/:n ; POST /finish/:id {chunks, sha256}  → resumable, sirf toota chunk dobara */
const crypto = require('crypto');
const { serve, json } = require('../lib/util');
const PORT = +process.env.PORT || 4961, LINK_MB = +(process.env.LINK_MB || 30), MBPS = +(process.env.LINK_MBPS || 80);
const sessions = new Map(); let received = 0, drops = 0, seq = 0;

function readFlaky(req) {                              // body padho; beech mein link toot sakta hai
  return new Promise((resolve, reject) => {
    const death = -Math.log(1 - Math.random()) * LINK_MB * 1024 * 1024;
    const parts = []; let got = 0; const t0 = Date.now();
    req.on('data', d => {
      got += d.length; received += d.length;
      if (got > death) { drops++; req.socket.destroy(); return reject(new Error('link toota')); }
      parts.push(d);
      const ahead = got / (MBPS * 1048.576) - (Date.now() - t0);                   // link ki speed se aage? thoda ruko
      if (ahead > 5) { req.pause(); setTimeout(() => req.resume(), ahead); }
    });
    req.on('end', () => resolve(Buffer.concat(parts)));
    req.on('error', reject);
  });
}
function raw(port, routes) {                          // util.serve body ko JSON parse karta hai; yahan binary chahiye
  require('http').createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    for (const [k, fn] of Object.entries(routes)) {
      const [m, p] = k.split(' '); if (m !== req.method) continue;
      const re = new RegExp('^' + p.replace(/:\w+/g, '([^/]+)') + '$'); const mm = u.pathname.match(re); if (!mm) continue;
      try { const out = await fn(req, res, mm.slice(1)); if (out && !res.writableEnded) json(res, 200, out); } catch (e) { if (!res.writableEnded && !req.socket.destroyed) json(res, 500, { error: e.message }); }
      return;
    }
    json(res, 404, { error: 'not found' });
  }).listen(port, () => console.log(`[edge] :${port} — link average ${LINK_MB} MB par toot-ta hai, ~${MBPS} MB/s`));
}
raw(PORT, {
  'POST /blob': async req => { const b = await readFlaky(req); return { ok: true, bytes: b.length, sha256: crypto.createHash('sha256').update(b).digest('hex') }; },
  'POST /session': async () => { const id = 's' + (++seq); sessions.set(id, new Map()); return { id }; },
  'PUT /chunk/:id/:n': async (req, res, [id, n]) => { const b = await readFlaky(req); sessions.get(id).set(+n, b); return { ok: true, n: +n }; },
  'GET /have/:id': async (req, res, [id]) => ({ have: [...sessions.get(id).keys()] }),               // "kaunse chunks pahunch gaye?"
  'POST /finish/:id': async (req, res, [id]) => {
    const s = sessions.get(id), n = s.size; const all = Buffer.concat([...Array(n).keys()].map(i => s.get(i)));
    sessions.delete(id);
    return { ok: true, chunks: n, bytes: all.length, sha256: crypto.createHash('sha256').update(all).digest('hex'), next: 'queue → transcode job' };
  },
  'GET /stats': async () => ({ receivedMB: +(received / 1048576).toFixed(1), drops }),
  'POST /reset': async () => { received = 0; drops = 0; return { ok: true }; },
});
