/* 14 sec ka din: t=4 par 10,000 health checks ek saath badalte hain (bura din).
   node tools/storm.js --sync delta|constant [--drop 0.01]
   Har second: kitne badlaav, har DNS server ne kitna kaam kiya (messages, KB), aur DNS ki copy SACH se kitni alag (drift). */
const args = require('./args')();
const { get, post, sleep, host } = require('../lib/util');
const C = `http://${host('checks')}:4921`;
const DNS = ['dns1', 'dns2', 'dns3'].map((h, i) => `http://${host(h)}:${4922 + i}`);
const buf = async u => new Uint8Array(await (await fetch(u)).arrayBuffer());
(async () => {
  await post(C + '/mode', { sync: args.sync || 'delta', drop: args.drop != null ? +args.drop : 0.01 });
  await sleep(1200); await get(C + '/stats');
  let prev = await Promise.all(DNS.map(d => get(d + '/work')));
  console.log(`sync=${args.sync || 'delta'} drop=${args.drop != null ? args.drop : 0.01}`);
  console.log(' sec  badlaav   kaam/DNS server (msgs, KB)   drift (DNS copy ≠ sach, max of 3)');
  const peak = { msgs: 0, kb: 0 };
  for (let t = 1; t <= 14; t++) {
    if (t === 4) await post(C + '/storm', { n: 10000 });
    await sleep(1000);
    const st = await get(C + '/stats');
    const now = await Promise.all(DNS.map(d => get(d + '/work')));
    const dm = Math.round(now.reduce((s, w, i) => s + w.msgs - prev[i].msgs, 0) / 3), dk = Math.round(now.reduce((s, w, i) => s + w.bytes - prev[i].bytes, 0) / 3 / 1024);
    peak.msgs = Math.max(peak.msgs, dm); peak.kb = Math.max(peak.kb, dk);
    prev = now;
    const truth = await buf(C + '/truth');
    const drift = Math.max(...await Promise.all(DNS.map(async d => { const v = await buf(d + '/view'); let x = 0; for (let i = 0; i < truth.length; i++) if (v[i] !== truth[i]) x++; return x; })));
    console.log(`${String(t).padStart(4)}  ${String(st.changes_since_last).padStart(7)}   ${String(dm).padStart(8)} msgs ${String(dk).padStart(6)} KB      ${String(drift).padStart(6)}${t === 4 ? '   ← storm' : ''}`);
  }
  console.log(`\npeak kaam: ${peak.msgs} msgs/sec, ${peak.kb} KB/sec per DNS server`);
})();
