#!/usr/bin/env node
'use strict';
/* Static lint for docker-labs/ — the mistakes that pass `node validate.js` but break the lab for a learner.
   It never starts a service. For a real run of every README command use tools/run-labs.js.

     node tools/lab-lint.js            → every lab
     node tools/lab-lint.js 02-cloudflare 13-stripe

   What it catches (each one was a real bug found in the 2026-11 lab review):
     CHAIN     `npm start <ex> && node tools/x.js` — the server never exits, so the tool never runs
     ENV-TOOL  `VAR=x node tools/t.js` where t.js (and what it requires) never reads VAR → the prefix does nothing
     ENV-START `VAR=x npm start <ex>` where no service / start.js reads VAR
     FLAG      `node tools/t.js --flag` where t.js never mentions that flag
     TOOL      a command names a tools/ file that does not exist
     EXERCISE  README / app stage / compose profile / start.js disagree about exercise names
     FILE      start.js or docker-compose.yml points at a service file that does not exist
     ELLIPSIS  a runnable block has a command ending in "..." (cannot be pasted) */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LABS = path.join(ROOT, 'docker-labs');
const only = process.argv.slice(2);
const problems = [];
const add = (lab, kind, msg, where) => problems.push({ lab, kind, msg, where });
const read = f => { try { return fs.readFileSync(f, 'utf8'); } catch (e) { return ''; } };

/* ---- commands a learner is told to run: README (bash blocks, "$ " lines, "→" summary lines) + app stages ---- */
function readmeCommands(readme) {
  const out = []; let block = null;
  readme.split('\n').forEach((raw, i) => {
    if (/^```/.test(raw)) { block = block ? null : (/^```bash/.test(raw) ? 'bash' : 'plain'); return; }
    if (!block) return;
    const where = 'README.md:' + (i + 1);
    if (block === 'bash') {
      if (/→/.test(raw)) {
        const m = raw.match(/^\s*(npm start \S+)?\s*→\s*((?:node|java) .*)$/);
        if (m) { if (m[1]) out.push({ line: m[1], where }); out.push({ line: m[2], where }); }
      } else out.push({ line: raw, where });
    } else if (/^\$ /.test(raw)) out.push({ line: raw.slice(2), where });
  });
  return out;
}
function stageCommands() {
  const byLab = {};
  let app;
  try { app = require(path.join(ROOT, 'dev', 'load-app.js')).loadApp(); } catch (e) { console.error('⚠️  app load failed, stage commands skipped: ' + e.message); return byLab; }
  const SD = app.SD || app;
  for (const lv of Object.values(SD.levelSets).flat()) (lv.stages || []).forEach((st, si) => {
    if (st.type !== 'docker' || !st.project) return;
    const list = byLab[st.project] = byLab[st.project] || [];
    if (st.exercise) list.push({ exercise: st.exercise, where: `${lv.id} stage ${si}` });
    (st.steps || []).forEach((s, i) => String(s.cmd || '').split('\n').forEach(line => list.push({ line, where: `${lv.id} stage ${si} step ${i}` })));
  });
  return byLab;
}

/* a tool's source plus every local file it requires (one hop is not enough: tools/x.js → tools/lib.js → lib/util.js) */
function sourceClosure(file, seen = new Set()) {
  if (seen.has(file) || !fs.existsSync(file)) return '';
  seen.add(file);
  const src = read(file);
  let all = src;
  for (const m of src.matchAll(/require\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g)) {
    let dep = path.resolve(path.dirname(file), m[1]);
    if (!fs.existsSync(dep) && fs.existsSync(dep + '.js')) dep += '.js';
    if (fs.existsSync(dep) && fs.statSync(dep).isFile()) all += '\n' + sourceClosure(dep, seen);
  }
  return all;
}
const allJs = dir => !fs.existsSync(dir) ? '' : fs.readdirSync(dir, { withFileTypes: true }).map(d =>
  d.isDirectory() ? allJs(path.join(dir, d.name)) : /\.(js|java|mjs)$/.test(d.name) ? read(path.join(dir, d.name)) : '').join('\n');
/* VAR must be READ from the environment — a console.log label like "SANDBOX=light" does not count */
const readsEnv = (src, name) =>
  new RegExp(`\\benv\\s*(?:\\.\\s*${name}\\b|\\[\\s*['"\`]${name}['"\`]\\s*\\])`).test(src) ||
  new RegExp(`\\{[^}]*\\b${name}\\b[^}]*\\}\\s*=\\s*process\\.env`).test(src) ||
  new RegExp(`getenv\\(\\s*"${name}"`).test(src);
const camel = s => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

function splitEnv(line) {
  const env = [];
  for (;;) { const m = line.match(/^([A-Z][A-Z0-9_]*)=(\S+)\s+(.*)$/); if (!m) break; env.push(m[1]); line = m[3]; }
  return { env, rest: line };
}

function lintLab(lab, stageCmds) {
  const dir = path.join(LABS, lab);
  const readme = read(path.join(dir, 'README.md'));
  const startSrc = read(path.join(dir, 'start.js'));
  const compose = read(path.join(dir, 'docker-compose.yml'));
  const serviceSrc = startSrc + '\n' + allJs(path.join(dir, 'services')) + '\n' + allJs(path.join(dir, 'lib')) + '\n' + allJs(path.join(dir, 'src'));

  /* exercise names */
  const exStart = new Set([...startSrc.matchAll(/['"`](ex\d+-[a-z0-9-]+)['"`]/g)].map(m => m[1]));
  const exCompose = new Set([...compose.matchAll(/\bex\d+-[a-z0-9-]+/g)].map(m => m[0]));
  const known = exStart.size ? exStart : null;
  if (known && compose) {
    for (const ex of exStart) if (!exCompose.has(ex) && readme.includes('--profile ' + ex)) add(lab, 'EXERCISE', `README says "--profile ${ex}" but docker-compose.yml has no such profile`, 'docker-compose.yml');
    for (const ex of exCompose) if (!exStart.has(ex)) add(lab, 'EXERCISE', `docker-compose.yml profile '${ex}' is not an exercise in start.js`, 'docker-compose.yml');
  }

  /* files named by start.js and compose */
  for (const m of startSrc.matchAll(/['"`]((?:services|tools|src)\/[\w./-]+\.(?:js|mjs))['"`]/g))
    if (!fs.existsSync(path.join(dir, m[1]))) add(lab, 'FILE', `start.js → ${m[1]} does not exist`, 'start.js');
  for (const m of compose.matchAll(/node\s+((?:services|tools|src)\/[\w./-]+\.js)/g))
    if (!fs.existsSync(path.join(dir, m[1]))) add(lab, 'FILE', `docker-compose.yml → ${m[1]} does not exist`, 'docker-compose.yml');

  const cmds = readmeCommands(readme).concat(stageCmds || []);
  for (const c of cmds) {
    if (c.exercise) {   // the stage prints "npm start <exercise>" as a hint, so a short "ex2" for start.js's "ex2-hot-rank" is a broken hint
      const full = known && !known.has(c.exercise) && [...known].find(k => k.startsWith(c.exercise + '-'));
      if (full) add(lab, 'EXERCISE', `stage exercise '${c.exercise}' should be the full start.js name '${full}'`, c.where);
      continue;
    }
    let line = String(c.line || '').replace(/\s+#.*$/, '').trim();
    if (!line || line.startsWith('#')) continue;
    line = line.replace(/^cd \S+\s*&&\s*/, '');
    if (/(npm start|node start\.js)\s+(?!--)[^&|;]*&&/.test(line)) add(lab, 'CHAIN', `blocking server chained with &&: ${line}`, c.where);
    if (/\s\.\.\.$|\s…$/.test(line) && /^(node|npm|[A-Z_]+=)/.test(line)) add(lab, 'ELLIPSIS', `command cannot be pasted: ${line}`, c.where);
    for (const part of line.split(/\s*(?:&&|;)\s*/)) {
      const { env, rest } = splitEnv(part.trim());
      const st = rest.match(/^(?:npm start|node start\.js)\s+(?:--\s+)?(\S+)/);
      if (st) {
        if (known && /^ex\d/.test(st[1]) && !known.has(st[1])) add(lab, 'EXERCISE', `'${st[1]}' is not an exercise in start.js`, c.where);
        for (const v of env) if (!readsEnv(serviceSrc, v)) add(lab, 'ENV-START', `${v}= on "npm start" but no service/start.js/lib reads ${v}`, c.where);
        continue;
      }
      const tool = rest.match(/^node\s+((?:tools|test|src)\/[\w./-]+\.js)\b(.*)$/);
      if (!tool) continue;
      const file = path.join(dir, tool[1]);
      if (!fs.existsSync(file)) { add(lab, 'TOOL', `${tool[1]} does not exist`, c.where); continue; }
      const src = sourceClosure(file);
      for (const v of env) if (!readsEnv(src, v)) {
        const serverSide = readsEnv(serviceSrc, v);
        add(lab, 'ENV-TOOL', `${v}= on ${tool[1]} but the tool never reads it` + (serverSide ? ` (a SERVICE reads it → it belongs on "npm start", after a restart)` : ''), c.where);
      }
      for (const f of tool[2].matchAll(/(?:^|\s)--([a-z][a-z0-9-]*)/g)) {
        const flag = f[1];
        if (!src.includes(flag) && !src.includes(camel(flag))) add(lab, 'FLAG', `--${flag} is never mentioned in ${tool[1]}`, c.where);
      }
    }
  }
}

const stage = stageCommands();
const labs = fs.readdirSync(LABS).filter(d => /^\d\d-/.test(d) && (!only.length || only.includes(d))).sort();
labs.forEach(l => lintLab(l, stage[l]));

const seen = new Set();
const uniq = problems.filter(p => { const k = [p.lab, p.kind, p.msg].join('|'); if (seen.has(k)) return false; seen.add(k); return true; });
let last = '';
for (const p of uniq) {
  if (p.lab !== last) { console.log('\n' + p.lab); last = p.lab; }
  console.log(`  ${p.kind.padEnd(9)} ${p.msg}   [${p.where}]`);
}
console.log(`\n${uniq.length ? '❌' : '✅'} ${labs.length} labs linted · ${uniq.length} problem(s)`);
process.exit(uniq.length ? 1 : 0);
