// node dev/rewrite/locate.js level:"question start" ... — prints {level, path, q, choices, choiceExplanations, explain} as a JSON patch skeleton
const { loadApp } = require('../load-app');
const app = loadApp();
const out = [];
for (const arg of process.argv.slice(2)) {
  const i = arg.indexOf(':'); const id = arg.slice(0, i), start = arg.slice(i + 1);
  const lv = app.levels.find(x => x.level.id === id);
  if (!lv) { console.error('no level ' + id); process.exit(1); }
  const hits = [];
  (function walk(o, p) {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach((v, k) => walk(v, `${p}[${k}]`));
    if (typeof o.q === 'string' && Array.isArray(o.choices) && o.q.startsWith(start)) hits.push({ level: id, path: p.replace(/^\./, ''), q: o.q, choices: o.choices, choiceExplanations: o.choiceExplanations, explain: o.explain });
    for (const [k, v] of Object.entries(o)) walk(v, `${p}.${k}`);
  })(lv.level, '');
  if (hits.length !== 1) { console.error(`${arg}: ${hits.length} matches`); process.exit(1); }
  out.push(hits[0]);
}
console.log(JSON.stringify(out, null, 1));
