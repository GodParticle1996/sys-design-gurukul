/* ex2 ka doosra hissa · "kitni der baad aana" — Retry-After kitna ho?
   Wahi A → B → C (tools/client.js: 150 workers). C bhara ho toh B kya jawab de, chhe tareeke:
     503 aage badha do · 429 bina Retry-After · 429 + Retry-After 50 / 250 / 1000 / 3000 ms
   Har tareeke ke liye B ko chalte-chalte badalta hai (GET /config) aur tools/client.js chalata hai.
   Pehle services: npm start ex2-propagation          node tools/hint.js [--secs 15] */
const { execFileSync } = require('child_process');
const path = require('path');
const { get, host } = require('../lib/util');
const args = require('./args')();
const SECS = String(args.secs || 15), B = `http://${host('b')}:4852`;

const ROWS = [
  { name: '503 aage badha diya (koi signal nahi)', propagate: 0, ra: 250 },
  { name: '429, par Retry-After nahi', propagate: 1, ra: 0 },
  { name: '429 + Retry-After 50 ms', propagate: 1, ra: 50 },
  { name: '429 + Retry-After 250 ms', propagate: 1, ra: 250 },
  { name: '429 + Retry-After 1000 ms', propagate: 1, ra: 1000 },
  { name: '429 + Retry-After 3000 ms', propagate: 1, ra: 3000 },
];
const HEADS = ['C bhara ho toh B ka jawab              ', 'A ne bheje', 'kaam poore', 'tries/kaam', 'C ne thukraye', 'B ne 429 diye', 'ek worker ke kaam: kam / beech / zyada', 'khaali haath workers', 'sabse lamba intezaar'];

(async () => {
  console.log(`A (150 workers) → B → C (~200 kaam/s, ek saath 44) · har tareeka ${SECS} s\n`);
  console.log(HEADS.join('   '));
  for (const r of ROWS) {
    await get(`${B}/config?propagate=${r.propagate}&retryAfterMs=${r.ra}`);
    const out = execFileSync(process.execPath, [path.join(__dirname, 'client.js'), '--secs', SECS], { encoding: 'utf8' });
    const a = /A: (\d+) requests bheje → (\d+) kaam poore \(([\d.]+) tries per success\) \| p50 (\d+) ms p99 (\d+) ms/.exec(out);
    const b = /C ne (\d+) thukraye \(bekaar kaam\), (\d+) ko 429/.exec(out);
    const w = /sabse kam (\d+), beech wala (\d+), sabse zyada (\d+) \| jin workers ka ek bhi kaam poora nahi hua: (\d+) \| ek kaam par sabse lamba intezaar ([\d.]+) s/.exec(out);
    if (!a || !b || !w) { console.log(out); continue; }
    const cells = [r.name, a[1], a[2], a[3], b[1], b[2], `${w[1]} / ${w[2]} / ${w[3]}`, w[4], w[5] + ' s'];
    console.log(cells.map((v, i) => (i === 0 ? v.padEnd(HEADS[i].length) : v.padStart(HEADS[i].length))).join('   '));
  }
  await get(`${B}/config?propagate=${process.env.PROPAGATE === '1' ? 1 : 0}&retryAfterMs=250`);   // B ko wapas shuruaati haal mein
})();
