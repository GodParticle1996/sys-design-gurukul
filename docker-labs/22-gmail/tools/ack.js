/* 200 mails aate hain. Mail #120 ke baad site A gir jaati hai.
   User ko "delivered" kitne bole? Aur site B (jo bachi hai) par sach mein kitne hain?
   node tools/ack.js */
const { post, get, host } = require('../lib/util');
const F = `http://${host('frontend')}:4983`, B = `http://${host('store-b')}:4982`, A = `http://${host('store-a')}:4981`;
(async () => {
  console.log('ack mode        user ko "delivered" bola   site B par asli mails   KHO GAYE   ack latency');
  for (const ack of ['before', 'after']) {
    await post(A + '/reset'); await post(B + '/reset'); await post(F + '/mode', { ack, crashAfter: 120 });
    let ok = 0; const lat = [];
    for (let i = 1; i <= 200; i++) { const t = Date.now(); const r = await post(F + '/deliver', { id: `m${i}`, from: 'boss@work.com', subject: 'Salary slip ' + i, labels: ['inbox'] }); if (r.ok) { ok++; lat.push(Date.now() - t); } }
    await new Promise(r => setTimeout(r, 300));
    const b = await get(B + '/stats');
    const avg = (lat.reduce((a, x) => a + x, 0) / lat.length).toFixed(2);
    console.log(`${ack.padEnd(15)} ${String(ok).padStart(12)}             ${String(b.mails).padStart(12)}       ${String(ok - b.mails).padStart(6)}      ${avg} ms`);
  }
  console.log('\nsite A mail #120 ke baad gir gayi. ACK=before: jo mails sirf A par thi (background replication baaki tha) — woh gayi.');
  console.log('ACK=after: "delivered" tabhi bola jab DONO sites par likha ja chuka tha → ek bhi mail nahi khoya.');
})();
