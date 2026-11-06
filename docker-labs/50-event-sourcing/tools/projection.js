/* ex2-projection: 10 accounts (₹100 each). Har account se ek withdraw ₹30, ek ke baad ek. Phir store vs read model.
   dual     : handler store mein likhta hai, phir listener ko bhejta hai (video jaisa). 4th command par likhne ke baad,
              bhejne se pehle handler crash.
   together : catch-up projector; 4th withdraw (pos 24) apply karne ke baad, checkpoint se pehle crash. Ek transaction.
   split    : wahi crash, par apply aur checkpoint alag transactions mein.
   read     : koi crash nahi. Har command ke turant baad read model padho; phir minPos ke saath padho. */
const { open } = require('../lib/store');
const E = require('../lib/events');
const { fold } = require('../lib/account');
const { catchUp } = require('../lib/projector');
const { call } = require('../lib/http');
const { withStack, waitFor } = require('./stack');
const H = 'http://localhost:5911', L = 'http://localhost:5912', P = 'http://localhost:5913';
const up = base => call(base, '/health').then(() => true, () => false);
async function run(mode) {
  return withStack(async ({ db, service, crashes }) => {
    const d = open(db);
    for (let i = 1; i <= 10; i++) E.append(d, `a${i}`, 0, [{ type: 'Opened', data: {} }, { type: 'Deposited', data: { amount: 100 } }]);
    catchUp(d, 'balances');                                     // read model pehle 20 events tak taiyaar
    const dual = mode === 'dual';
    await service('handler', { PORT: '5911', MODE: 'expected', PUBLISH: dual ? 'dual' : '', LISTENER: L, CRASH_ON: dual ? '4' : '' }, true);
    if (dual) await service('listener', { PORT: '5912' });
    else await service('projector', { PORT: '5913', MODE: mode === 'split' ? 'split' : 'together',
      CRASH_AT_POS: mode === 'read' ? '' : '24', POLL_MS: '50' }, true);
    const res = { ok: 0, error: 0, readsNow: 0, readsMin: 0, staleNow: 0, staleMin: 0, waits: [] };
    for (let i = 1; i <= 10; i++) {
      await waitFor(() => up(H), 'handler wapas nahi aaya');
      let r;
      try { r = await call(H, '/withdraw', { account: `a${i}`, amount: 30 }); res.ok++; }
      catch (_) { res.error++; continue; }                      // client ko error mila
      if (mode === 'read') {                                    // read fail ho toh exercise fail — adhura result nahi
        const now = await call(P, `/balance?account=a${i}`);
        res.readsNow++; if (now.balance !== 70) res.staleNow++;
        const after = await call(P, `/balance?account=a${i}&minPos=${r.pos}`);
        res.readsMin++; if (after.balance !== 70) res.staleMin++;
        res.waits.push(after.waitedMs);
      }
    }
    const last = d.prepare('SELECT max(pos) p FROM events').get().p;
    if (!dual) await waitFor(async () => (await up(P)) && (await call(P, '/state')).checkpoint === last, 'projector store tak nahi pahuncha');
    else await new Promise(r => setTimeout(r, 100));
    const wrong = [];
    for (let i = 1; i <= 10; i++) {
      const store = fold(E.readStream(d, `a${i}`)).balance;
      const read = d.prepare('SELECT balance FROM balances WHERE account = ?').get(`a${i}`).balance;
      if (store !== read) wrong.push(`a${i} store=${store} read=${read}`);
    }
    return { mode, ...res, crashes: crashes.count, wrong };
  });
}
(async () => {
  const modes = process.argv[2] ? [process.argv[2]] : ['dual', 'together', 'split', 'read'];
  for (const m of modes) {
    const r = await run(m);
    if (m === 'read') console.log(`read     command-ok=${r.ok} turant-padha-purana=${r.staleNow}/${r.readsNow} minPos-ke-saath-purana=${r.staleMin}/${r.readsMin}` +
      ` intezaar=${Math.min(...r.waits)}–${Math.max(...r.waits)} ms galat=${r.wrong.length}`);
    else console.log(`${r.mode.padEnd(8)} command-ok=${r.ok} client-ko-error=${r.error} crash=${r.crashes}` +
      ` store≠read-model=${r.wrong.length}${r.wrong.length ? ' [' + r.wrong.join('; ') + ']' : ''}`);
  }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
