// node dev/rewrite/standins.js <level|track:ID> ... — prints every option text, reason, step "say" or
// question field that still has a pronoun stand-in, in full, so it can be fixed with replace.js
const { loadApp } = require('../load-app');
const STAND_IN = require('./standin-re');
const app = loadApp();
const ids = process.argv.slice(2).flatMap(a => a.startsWith('track:')
  ? app.levels.filter(x => x.track.id === a.slice(6)).map(x => x.level.id) : [a]);
const visible = s => s.replace(/<[^>]+>/g, '');
let n = 0;
for (const id of ids) {
  const lv = app.levels.find(x => x.level.id === id);
  if (!lv) { console.error('no level ' + id); process.exit(1); }
  (function walk(o, p) {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach((v, i) => walk(v, `${p}[${i}]`));
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'string' && ['t', 'explain', 'why', 'label', 'q', 'hint', 'say', 'text', 'sitrep'].includes(k) && STAND_IN.test(visible(v))) {
        n++; console.log(`${id} ${p}.${k} [${visible(v).match(STAND_IN)[0]}]\n  ${v}`);
      } else if (Array.isArray(v) && ['choices', 'choiceExplanations'].includes(k)) {
        v.forEach((s, i) => { if (typeof s === 'string' && STAND_IN.test(visible(s))) { n++; console.log(`${id} ${p}.${k}[${i}] [${visible(s).match(STAND_IN)[0]}]\n  ${s}`); } });
      }
      if (v && typeof v === 'object') walk(v, `${p}.${k}`);
    }
  })(lv.level, '');
}
console.log(`${n} stand-ins`);
