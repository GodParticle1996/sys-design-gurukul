/* ex4-evolve: do consumer processes (strict :6001, tolerant :6002), asli HTTP. Producer PaymentCaptured ke 4 roop bhejta hai,
   har roop ke 100 events, dono consumers ko:
   v1-purana      { orderId, amount }
   v2-naya-field  { orderId, amount, method }        — field joda (additive)
   v3-naam-badla  { orderId, total }                 — amount ka naam total kar diya (breaking)
   v4-dono-field  { orderId, amount, total }         — expand: migration ke dauraan purana aur naya, dono */
const { call } = require('../lib/http');
const { withServices } = require('./stack');
const C = { strict: 'http://localhost:6001', tolerant: 'http://localhost:6002' };
const PHASES = [
  ['v1-purana', i => ({ orderId: `o${i}`, amount: 100 + i })],
  ['v2-naya-field', i => ({ orderId: `o${i}`, amount: 100 + i, method: 'upi' })],
  ['v3-naam-badla', i => ({ orderId: `o${i}`, total: 100 + i })],
  ['v4-dono-field', i => ({ orderId: `o${i}`, amount: 100 + i, total: 100 + i })],
];
(async () => {
  await withServices([['consumer', { PORT: '6001', MODE: 'strict' }], ['consumer', { PORT: '6002', MODE: 'tolerant' }]], async () => {
    for (const [name, make] of PHASES) {
      const res = { strict: { ok: 0, no: 0, why: new Set() }, tolerant: { ok: 0, no: 0, why: new Set() } };
      for (let i = 1; i <= 100; i++) {
        const event = { specversion: '1.0', id: `${name}-${i}`, source: '/payments', type: 'PaymentCaptured', data: make(i) };
        for (const k of Object.keys(C)) {
          try { await call(C[k], '/event', event); res[k].ok++; }
          catch (e) {                                   // sirf 422 = schema ne mana kiya; timeout, network, 5xx = experiment fail
            if (e.status !== 422) throw Error(`${k} consumer: ${e.message} — schema ka nateeja nahi, experiment fail`);
            res[k].no++; res[k].why.add(e.message);
          }
        }
      }
      const show = k => res[k].no ? `mana ${res[k].no}/100 (${[...res[k].why].join('; ')})` : `theek ${res[k].ok}/100`;
      console.log(`${name.padEnd(14)} strict: ${show('strict')} · tolerant: ${show('tolerant')}`);
    }
    const t = await call(C.tolerant, '/state'), s = await call(C.strict, '/state');
    if (s.rejected !== 300 || t.rejected !== 100 || s.ok + s.rejected !== 400 || t.ok + t.rejected !== 400)
      throw Error(`consumer ki apni ginti tool se nahi mili: strict ${s.ok}/${s.rejected}, tolerant ${t.ok}/${t.rejected}`);
    console.log(`kul            strict theek=${s.ok} mana=${s.rejected} · tolerant theek=${t.ok} mana=${t.rejected} · tolerant ka jod ₹${t.sum.toLocaleString('en-IN')}`);
  });
})().catch(e => { console.error(e.message); process.exitCode = 1; });
