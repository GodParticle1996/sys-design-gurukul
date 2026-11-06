/* ex0-slowmo: sale ka burst, nakli ghadi par. --mode direct (queue nahi) | queue. --json */
const { simulate } = require('../lib/flow');
const { burst } = require('./profiles');
const modeIndex = process.argv.indexOf('--mode');
const mode = (process.argv.find(a => a.startsWith('--mode=')) || '').slice(7)
  || (modeIndex >= 0 ? process.argv[modeIndex + 1] : 'queue');
if (!['direct', 'queue'].includes(mode)) { console.error('--mode direct|queue'); process.exit(1); }
const rows = simulate({ ...burst, queue: mode === 'queue' });
const say = {
  0: 'Sale shuru: har second 60 order, recs-service 20/s sambhalta hai',
  4: 'Burst ka 5va second',
  9: 'Burst ka aakhri second',
  10: 'Burst khatam: ab 10 order/s',
  19: '20va second',
  29: '30va second',
  48: '49va second',
  49: '50va second',
  59: 'Aakhri (60va) second',
};
const out = Object.keys(say).map(Number).map(i => ({ t: i + 1, say: say[i], ...rows[i] }));
if (process.argv.includes('--json')) console.log(JSON.stringify({ mode, scenario: 'burst', rows: out }, null, 2));
else {
  console.log(`mode=${mode} | nakli ghadi; lab ke tay numbers (60/s burst, 20/s capacity)`);
  for (const r of out) console.log(`${String(r.t).padStart(2)} s  ${r.say} | aaye=${r.arrived} hue=${r.done}` +
    ` reject=${r.rejected} line=${r.depth} sabse-purana=${r.oldestMs / 1000} s`);
}
