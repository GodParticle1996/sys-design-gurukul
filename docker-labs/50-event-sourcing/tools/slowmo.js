/* ex0-slowmo: nakli ghadi par wahi event store (lib/events.js), fold (lib/account.js) aur projector (lib/projector.js), RAM SQLite.
   --story race  --mode any|expected  : a1 mein ₹100; A aur B dono ₹80 nikaalne aaye, dono ne v2 padha
   --story dual  --mode dual|catchup  : withdraw ₹30 store mein likha, phir handler crash — read model tak kaise pahunche?
   --story cache --mode cache|tail    : A ke cache mein a1 = ₹100 (v2); B ne ₹80 nikaale; ab A ko ₹80 ka command
   Saare ms lab ke tay kiye hue hain. --json bhi. */
const { open } = require('../lib/store');
const E = require('../lib/events');
const { fold } = require('../lib/account');
const { catchUp } = require('../lib/projector');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const story = arg('--story', 'race'), mode = arg('--mode', { race: 'any', dual: 'dual', cache: 'cache' }[story]);
const db = open(':memory:'), rows = [];
const bal = () => fold(E.readStream(db, 'a1')).balance;
const readModel = () => db.prepare('SELECT balance FROM balances WHERE account = ?').get('a1')?.balance ?? '—';
const log = (t, say, cols) => rows.push({ t, say, ...cols });
E.append(db, 'a1', 0, [{ type: 'Opened', data: {} }, { type: 'Deposited', data: { amount: 100 } }]);
function tryAppend(expected, amount) {
  try { return E.append(db, 'a1', expected, [{ type: 'Withdrawn', data: { amount } }]); }
  catch (e) { if (e instanceof E.Conflict) return { conflict: e.message }; throw e; }
}
if (story === 'race') {
  const st = () => ({ store: bal(), version: fold(E.readStream(db, 'a1')).version });
  log(0, 'a1: Opened, Deposited 100', st());
  const a = fold(E.readStream(db, 'a1')); log(0, `A ne padha: balance ${a.balance}, v${a.version}`, st());
  const b = fold(E.readStream(db, 'a1')); log(0, `B ne padha: balance ${b.balance}, v${b.version}`, st());
  tryAppend(mode === 'any' ? 'any' : a.version, 80); log(20, `A: ${a.balance} ≥ 80, Withdrawn 80 likha`, st());
  const r = tryAppend(mode === 'any' ? 'any' : b.version, 80);
  if (!r.conflict) log(20, `B: ${b.balance} ≥ 80, Withdrawn 80 likha (bina version jaanch)`, st());
  else {
    log(20, `B ka likhna mana: ${r.conflict}`, st());
    const b2 = fold(E.readStream(db, 'a1')); log(20, `B ne dobara padha: balance ${b2.balance}, v${b2.version}`, st());
    log(40, `B: ${b2.balance} < 80 — command mana`, st());
  }
} else if (story === 'dual') {
  catchUp(db, 'balances');
  const st = () => ({ store: bal(), read: readModel() });
  log(0, 'a1 = 100; read model bhi 100 (checkpoint pos 2)', st());
  E.append(db, 'a1', 2, [{ type: 'Withdrawn', data: { amount: 30 } }]); log(5, 'handler ne Withdrawn 30 store mein likha (pos 3)', st());
  log(6, 'handler crash — client ko error mila', st());
  if (mode === 'dual') log(50, 'listener tak event kabhi nahi bheja gaya; listener store nahi padhta', st());
  else { catchUp(db, 'balances'); log(50, 'projector ne store padha: checkpoint 2 ke baad pos 3 mila, apply kiya', st()); }
} else {
  const st = () => ({ store: bal(), cache: cache.balance });
  const cache = fold(E.readStream(db, 'a1'));
  log(0, `A ke cache mein a1: balance ${cache.balance}, v${cache.version}`, st());
  E.append(db, 'a1', 2, [{ type: 'Withdrawn', data: { amount: 80 } }]); log(10, 'B ne Withdrawn 80 likha (v3)', st());
  if (mode === 'cache') {
    log(20, `A: cache mila, wahi lauta diya — balance ${cache.balance}`, st());
    tryAppend('any', 80); log(20, `A: ${cache.balance} ≥ 80, Withdrawn 80 likha`, st());
  } else {
    const tail = E.readStream(db, 'a1', cache.version), fresh = fold(tail, cache);
    log(20, `A: cache v${cache.version} + store se v${cache.version} ke baad ${tail.length} event → balance ${fresh.balance}`, st());
    log(20, `A: ${fresh.balance} < 80 — command mana`, st());
  }
}
if (process.argv.includes('--json')) console.log(JSON.stringify({ story, mode, rows }, null, 2));
else {
  console.log(`story=${story} mode=${mode} | nakli ghadi; lab ke tay ms`);
  for (const r of rows) console.log(`${String(r.t).padStart(3)} ms  ${r.say} | ` +
    Object.entries(r).filter(([k]) => !['t', 'say'].includes(k)).map(([k, v]) => `${k}=${v}`).join(' '));
}
