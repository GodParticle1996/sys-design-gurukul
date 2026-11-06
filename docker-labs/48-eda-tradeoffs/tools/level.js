/* ex1-level: burst vs lagataar zyada load. --profile burst|sustained, --workers N, --no-queue */
const { simulate } = require('../lib/flow');
const profiles = require('./profiles');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const name = arg('--profile', 'burst'), workers = +arg('--workers', 1), queue = !process.argv.includes('--no-queue');
const p = profiles[name];
if (!p || name === 'offline') { console.error('--profile burst|sustained'); process.exit(1); }
const rows = simulate({ ...p, workers, queue });
const u = p.unit, per = p.tickMs / 1000, last = rows.at(-1);
const peak = rows.reduce((a, r) => (r.depth > a.depth ? r : a), rows[0]);
const empty = rows.find((r, i) => i > 0 && r.depth === 0 && rows[i - 1].depth > 0);
const drained = peak.depth === 0 ? 'line bani hi nahi' : empty ? `${empty.tick + 1} ${u}` : 'run ke ant tak nahi';
console.log(`profile=${name} workers=${workers} queue=${queue} | capacity ${workers * p.perWorker}/${u}`);
const every = rows.length > 20 ? 5 : 1;
for (const r of rows.filter((r, i) => (i + 1) % every === 0))
  console.log(`${String(r.tick + 1).padStart(3)} ${u}  aaye=${r.arrived} hue=${r.done} reject=${r.rejected} line=${r.depth} sabse-purana=${r.oldestMs / 1000 / per} ${u}`);
console.log(`peak line=${peak.depth} (${peak.tick + 1} ${u}) · khaali hui=${drained}` +
  ` · sabse lamba intezaar=${last.maxWaitMs / 1000 / per} ${u} · reject=${last.rejected}`);
