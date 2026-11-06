/* ex3-replay: ek process, asli SQLite file (temp folder).
   history : a1 ke 4 events, har event ke baad balance; v3 par balance kya tha (as-of).
   replay  : ek account ke 100,350 events. Shuru se fold vs snapshot (har 1,000 events par) + baaki tail.
   upcast  : 2 purane (schema 1, MoneyAdded {amt}) + 2 naye events. Bina upcaster vs upcaster ke saath; events table ka hash. */
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), crypto = require('node:crypto');
const { open } = require('../lib/store');
const E = require('../lib/events');
const { fold, EMPTY } = require('../lib/account');
const ms = t0 => Number(process.hrtime.bigint() - t0) / 1e6;
function history(d) {
  E.append(d, 'a1', 0, [{ type: 'Opened', data: {} }, { type: 'Deposited', data: { amount: 50, source: 'ravi' } },
    { type: 'Deposited', data: { amount: 60, source: 'salary' } }, { type: 'Withdrawn', data: { amount: 20 } }]);
  const evs = E.readStream(d, 'a1');
  let s = EMPTY;
  const parts = evs.map(e => { s = fold([e], s); return `v${e.version} ${e.type}${e.data.amount ? ' ' + e.data.amount : ''}${e.data.source ? ' (' + e.data.source + ')' : ''} → ${s.balance}`; });
  return `history  ${parts.join(' · ')} · as-of v3 = ${fold(evs.filter(e => e.version <= 3)).balance}`;
}
function replay(d, total = 100350, every = 1000) {
  const ins = d.prepare('INSERT INTO events (stream, version, type, schema, data) VALUES (?, ?, ?, 2, ?)');
  d.exec('BEGIN');
  ins.run('big', 1, 'Opened', '{}');
  for (let v = 2; v <= total; v++) ins.run('big', v, v % 2 ? 'Withdrawn' : 'Deposited', JSON.stringify({ amount: v % 2 ? 5 : 10 }));
  d.exec('COMMIT');
  let s = EMPTY;                                            // snapshot banao: har 1,000 events par aakhri haalat
  for (const e of E.readStream(d, 'big')) { s = fold([e], s); if (e.version % every === 0) d.prepare('INSERT OR REPLACE INTO snapshots VALUES (?, ?, ?)').run('big', e.version, JSON.stringify(s)); }
  let t0 = process.hrtime.bigint();
  const all = E.readStream(d, 'big'), full = fold(all), fullMs = ms(t0);
  t0 = process.hrtime.bigint();
  const snap = d.prepare('SELECT version, state FROM snapshots WHERE stream = ?').get('big');
  const tail = E.readStream(d, 'big', snap.version), fast = fold(tail, JSON.parse(snap.state)), snapMs = ms(t0);
  return `replay   ${total.toLocaleString('en-IN')} events: shuru se ${all.length.toLocaleString('en-IN')} padhe, ${fullMs.toFixed(1)} ms` +
    ` · snapshot v${snap.version.toLocaleString('en-IN')} + ${tail.length} padhe, ${snapMs.toFixed(1)} ms · balance ${full.balance} / ${fast.balance}`;
}
function upcast(d) {
  const ins = d.prepare('INSERT INTO events (stream, version, type, schema, data) VALUES (?, ?, ?, ?, ?)');
  [['Opened', 1, {}], ['MoneyAdded', 1, { amt: 50 }], ['MoneyAdded', 1, { amt: 30 }], ['Deposited', 2, { amount: 70, source: 'upi' }],
    ['Withdrawn', 2, { amount: 20 }]].forEach(([t, sc, data], i) => ins.run('old', i + 1, t, sc, JSON.stringify(data)));
  const hash = () => crypto.createHash('sha256').update(JSON.stringify(d.prepare('SELECT stream, version, type, schema, data FROM events WHERE stream = ? ORDER BY version').all('old'))).digest('hex').slice(0, 12);
  const before = hash(), evs = E.readStream(d, 'old');
  const naive = fold(evs, EMPTY, { upcasting: false }).balance, up = fold(evs).balance;
  return `upcast   5 events (2 purane schema 1): bina upcaster balance=${naive} · upcaster ke saath ${up} · events table hash ${before} → ${hash()}`;
}
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lab50-')), d = open(path.join(dir, 'lab.db'));
try {
  const parts = process.argv[2] ? [process.argv[2]] : ['history', 'replay', 'upcast'];
  for (const p of parts) console.log({ history, replay, upcast }[p](d));
} catch (e) { console.error(e.message); process.exitCode = 1; }
finally { d.close(); fs.rmSync(dir, { recursive: true, force: true }); }
