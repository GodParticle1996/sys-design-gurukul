/* 64 MB video, kamzor link. node tools/upload.js --mode blob|chunked [--mb 64] [--chunk 4]
   blob: link toota → poori file shuru se.   chunked: file 4 MB ke tukdon mein; toota → sirf wo tukda dobara. */
const http = require('http');
const crypto = require('crypto');
const args = require('./args')();
const { get, post, host } = require('../lib/util');
const H = host('edge'), MB = +(args.mb || 64), CH = +(args.chunk || 4);
const file = crypto.randomBytes(MB * 1048576), want = crypto.createHash('sha256').update(file).digest('hex');
function send(method, path, body) {
  return new Promise(resolve => {
    const rq = http.request({ host: H, port: 4961, method, path, headers: { 'content-length': body.length }, agent: false }, r => {
      let s = ''; r.on('data', d => (s += d)); r.on('end', () => { try { resolve(JSON.parse(s)); } catch (e) { resolve(null); } });
    });
    rq.on('error', () => resolve(null));
    rq.end(body);
  });
}
(async () => {
  const T = +(args.trials || 5), sum = {};
  console.log(`${MB} MB file, link average ~30 MB par toot-ta hai.  "link par gaye" = server tak sach mein pahunche bytes (adhoore bhi)\n`);
  for (let trial = 1; trial <= T; trial++) for (const mode of args.mode ? [args.mode] : ['blob', 'chunked']) {
    await post(`http://${H}:4961/reset`);
    const t0 = Date.now(); let attempts = 0, sha = null, sent = 0;
    if (mode === 'blob') {
      while (attempts < 40) { attempts++; sent += file.length; const r = await send('POST', '/blob', file); if (r && r.ok) { sha = r.sha256; break; } }
    } else {
      const { id } = await post(`http://${H}:4961/session`);
      const n = Math.ceil(MB / CH);
      for (let i = 0; i < n; i++) {
        const part = file.subarray(i * CH * 1048576, (i + 1) * CH * 1048576);
        for (;;) { attempts++; sent += part.length; const r = await send('PUT', `/chunk/${id}/${i}`, part); if (r && r.ok) break; }
      }
      const r = await post(`http://${H}:4961/finish/${id}`); sha = r.sha256;
    }
    const st = await get(`http://${H}:4961/stats`), secs = (Date.now() - t0) / 1000;
    const s = sum[mode] = sum[mode] || { mb: 0, secs: 0, drops: 0 }; s.mb += st.receivedMB; s.secs += secs; s.drops += st.drops;
    console.log(`#${trial} ${mode.padEnd(8)} requests ${String(attempts).padStart(3)}   link toota ${String(st.drops).padStart(3)} baar   link par gaye ${String(Math.round(st.receivedMB)).padStart(4)} MB (${(st.receivedMB / MB).toFixed(1)}x)   time ${secs.toFixed(1)} s   sha256 ${sha === want ? 'MATCH ✅' : 'nahi mila ❌'}`);
  }
  console.log('\naverage:');
  for (const [m, s] of Object.entries(sum)) console.log(`  ${m.padEnd(8)} link par ${Math.round(s.mb / T)} MB (${(s.mb / T / MB).toFixed(1)}x file)   ${(s.secs / T).toFixed(1)} s   ${(s.drops / T).toFixed(1)} baar toota`);
})();
