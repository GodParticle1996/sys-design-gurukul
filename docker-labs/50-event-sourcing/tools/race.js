/* ex1-race: 20 accounts, har ek mein ₹100. Do handler processes (A, B), ek SQLite file. Har account par ek saath
   do withdraw ₹80 — ek A ko, ek B ko. Padhne aur likhne ke beech 20 ms ka kaam. Lab barrier: dono handlers ke padhne
   ke baad hi koi likhta hai, taaki race har baar dikhe (asli system mein ye overlap kabhi-kabhi hota hai).
   modes: any (video jaisa: padho, jaancho, bina version ke jodo) | expected (jo version padha, wahi likhte waqt maango) */
const { open } = require('../lib/store');
const E = require('../lib/events');
const { fold } = require('../lib/account');
const { call } = require('../lib/http');
const { withStack } = require('./stack');
const N = 20;
async function run(mode) {
  return withStack(async ({ db, service }) => {
    const d = open(db);
    for (let i = 1; i <= N; i++) E.append(d, `a${i}`, 0, [{ type: 'Opened', data: {} }, { type: 'Deposited', data: { amount: 100 } }]);
    await Promise.all(['5901', '5902'].map(PORT => service('handler', { PORT, MODE: mode, GAP_MS: '20', BARRIER: '2' })));
    const out = await Promise.all(Array.from({ length: N }, (_, i) => Promise.all(['5901', '5902'].map(p =>
      call(`http://localhost:${p}`, '/withdraw', { account: `a${i + 1}`, amount: 80 })))));
    const results = out.flat();
    const finals = Array.from({ length: N }, (_, i) => fold(E.readStream(d, `a${i + 1}`)).balance);
    return { mode, ok: results.filter(r => r.result === 'ok').length, rejected: results.filter(r => r.result === 'rejected').length,
      retried: results.filter(r => r.tries > 1).length, minus: finals.filter(b => b < 0).length,
      finals: [...new Set(finals)].sort((a, b) => a - b), events: d.prepare('SELECT count(*) c FROM events').get().c };
  });
}
(async () => {
  const modes = process.argv[2] ? [process.argv[2]] : ['any', 'expected'];
  for (const m of modes) {
    const r = await run(m);
    console.log(`${r.mode.padEnd(8)} withdraw-ok=${r.ok}/${N * 2} mana=${r.rejected} dobara-padha=${r.retried}` +
      ` minus-balance=${r.minus}/${N} aakhri-balance=[${r.finals.join(',')}] events=${r.events}`);
  }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
