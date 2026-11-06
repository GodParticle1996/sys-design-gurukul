/* ex2-conflict: ek account (1,000), 20 events "+10", do consumer processes, ek hi SQLite file.
   modes: unsafe (padho → 20 ms → likho) | cas (version wahi ho tabhi likho, warna dobara) | atomic (balance = balance + 10)
   Phir bina broker: "set" events aur "delta" events ulte kram mein. */
const { open } = require('../lib/store');
const { withStack, drain } = require('./stack');
const { call } = require('../lib/http');
async function run(mode) {
  return withStack(async ({ db, consumer, call: b }) => {
    await b('/reset', { leaseMs: 5000 });
    const d = open(db);
    d.prepare('INSERT INTO account VALUES (?, ?, ?)').run('a1', 1000, 0);
    for (let i = 0; i < 20; i++) await b('/publish', { key: 'a1', body: { account: 'a1', delta: 10 } });
    await Promise.all(['5811', '5812'].map((PORT, i) =>
      consumer({ PORT, NAME: 'AB'[i], ROLE: 'balance', MODE: mode, GAP_MS: '20' })));
    await drain(b);
    const tries = (await call('http://localhost:5811', '/state')).tries + (await call('http://localhost:5812', '/state')).tries;
    const { balance, version } = d.prepare('SELECT balance, version FROM account').get();
    return { mode, balance, lost: (1200 - balance) / 10, writes: 20, tries, version };
  });
}
function reorder() {                                   // broker ke bina: kram ka asar
  const sets = [90, 100], deltas = [100, -30];
  const lastSet = xs => xs.at(-1);
  const sum = (start, xs, noNegative) => xs.reduce((bal, d) => (noNegative && bal + d < 0 ? bal : bal + d), start);
  return [
    `set events (balance = 90, phir 100): sahi kram ${lastSet(sets)} · ulta kram ${lastSet([...sets].reverse())}`,
    `delta events (+100, −30) 1000 se: sahi kram ${sum(1000, deltas)} · ulta kram ${sum(1000, [...deltas].reverse())}`,
    `delta events 0 se, niyam "balance minus mein nahi": sahi kram ${sum(0, deltas, true)} · ulta kram ${sum(0, [...deltas].reverse(), true)} (−30 reject)`,
  ];
}
(async () => {
  const modes = process.argv[2] ? [process.argv[2]] : ['unsafe', 'cas', 'atomic'];
  for (const m of modes) {
    const r = await run(m);
    console.log(`${r.mode.padEnd(7)} balance=${r.balance} (sahi 1200) khoye-updates=${r.lost} koshishein=${r.tries} version=${r.version}`);
  }
  if (!process.argv[2]) reorder().forEach(l => console.log(l));
})().catch(e => { console.error(e.message); process.exitCode = 1; });
