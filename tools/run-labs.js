#!/usr/bin/env node
'use strict';
/* Real run of every command a lab README tells the learner to type — without Docker.
   `node validate.js` and `node tools/lab-lint.js` read text; this one starts the servers and runs the tools.

     node tools/run-labs.js                       → every lab (about 25 minutes)
     node tools/run-labs.js 06-slack 13-stripe    → only these
     LAB_LOGS=/some/dir node tools/run-labs.js    → where the logs go (default: <os tmp>/sdg-lab-logs)
     TOOL_TIMEOUT=240000                          → ms allowed for one command

   How it works
     * Each lab is COPIED to a temp folder and run there, so a lab's runtime files (data/, workspace/) never
       show up in `git status`. After the run it lists what the lab wrote; a file outside data/ or workspace/
       is reported as a problem (it would dirty the repo for a learner, and .gitignore does not cover it).
     * It reads the README top to bottom: ```bash blocks, `npm start ex → node tools/x.js` summary lines, and
       "$ command" lines inside plain output blocks.
     * `npm start <ex>` starts in the background. The next `npm start` stops the previous one — exactly the
       "Terminal 1: Ctrl+C, then start again" a learner does. A start that exits by itself (labs 45+) is waited for.
     * A tool under a heading "## ex2-foo — …" with no server running gets `npm start ex2-foo` started first.
     * Skipped on purpose: `docker …`, `cd …`, `npm install …`, and any line with a <placeholder> or "…".
     * Not counted as a problem: a tool that says its npm library is missing ("… nahi mila … npm install x"),
       and a command with a --kill… / --crash… flag (it exits non-zero on purpose).

   Reading the result
     problems=N counts: non-zero exit, timeout, a start that crashed, a file written outside data/|workspace/.
     flags=…  are things to LOOK at in the log, not proven bugs: NaN, undefined, EADDRINUSE, a stack trace.
     A clean summary only proves the commands run. Whether the numbers teach the right idea is still a human
     (or careful agent) read of the log against the README's printed output. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const LABS = path.join(ROOT, 'docker-labs');
const OUT = process.env.LAB_LOGS || path.join(os.tmpdir(), 'sdg-lab-logs');
const TOOL_TIMEOUT = +process.env.TOOL_TIMEOUT || 240000;
const only = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const exOf = h => (h.match(/^(ex\d+-[a-z0-9-]+)/) || [])[1];

function parse(readme) {
  const out = []; let block = null, heading = '(top)';
  const push = raw => {
    let line = raw.replace(/\s+#.*$/, '').trim();
    if (!line || line.startsWith('#')) return;
    line = line.replace(/^cd \S+\s*&&\s*/, '');
    const env = {};
    for (;;) { const m = line.match(/^([A-Z][A-Z0-9_]*)=(\S+)\s+(.*)$/); if (!m) break; env[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); line = m[3]; }
    out.push({ heading, env, line });
  };
  for (const raw of readme.split('\n')) {
    if (/^```/.test(raw)) { block = block ? null : (/^```bash/.test(raw) ? 'bash' : 'plain'); continue; }
    if (!block) { const m = raw.match(/^#{2,3} (.*)/); if (m) heading = m[1]; continue; }
    if (block === 'plain') { if (/^\$ /.test(raw)) push(raw.slice(2)); continue; }
    const code = raw.replace(/\s+#.*$/, '');                      // a "→" inside a trailing comment is not a summary arrow
    const m = /→/.test(code) && code.match(/^\s*(npm start \S+)?\s*→\s*((?:node|java) .*)$/);
    if (m) { if (m[1]) push(m[1]); push(m[2]); } else if (!/→/.test(code)) push(code);
  }
  return out;
}

const killGroup = (p, sig) => { try { process.kill(-p.pid, sig); } catch (e) {} };

function runTool(line, cwd, env, log) {
  return new Promise(resolve => {
    const t0 = Date.now();
    const p = spawn('bash', ['-c', line], { cwd, env: { ...process.env, ...env }, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let timedOut = false;
    const to = setTimeout(() => { timedOut = true; log(`\n!!! TIMEOUT after ${TOOL_TIMEOUT} ms\n`); killGroup(p, 'SIGKILL'); }, TOOL_TIMEOUT);
    p.stdout.on('data', log); p.stderr.on('data', log);
    p.on('close', (code, sig) => { clearTimeout(to); log(`\n<<< exit=${code} sig=${sig} ${Date.now() - t0} ms\n`); resolve(timedOut ? 'timeout' : code); });
  });
}

function snapshot(dir, base = dir, map = new Map()) {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, d.name);
    if (d.isDirectory()) { if (d.name !== 'node_modules') snapshot(f, base, map); }
    else if (d.isFile()) { const s = fs.statSync(f); map.set(path.relative(base, f), s.size + ':' + s.mtimeMs); }
  }
  return map;
}

async function runLab(name) {
  const src = path.join(LABS, name);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdg-' + name + '-'));
  fs.cpSync(src, dir, { recursive: true, filter: f => path.basename(f) !== 'node_modules' });
  const before = snapshot(dir);
  const logFile = path.join(OUT, name + '.log');
  const fd = fs.openSync(logFile, 'w');
  let text = '';
  const log = s => { s = String(s); text += s; fs.writeSync(fd, s); };
  const readme = fs.readFileSync(path.join(src, 'README.md'), 'utf8');
  const startSrc = fs.readFileSync(path.join(src, 'start.js'), 'utf8');
  const steps = parse(readme);
  let svc = null, problems = 0;
  const problem = why => { problems++; log(`\n!!! PROBLEM: ${why}\n`); };

  /* `npm start -- exN` (labs 47+) runs to completion → wait for it. `npm start exN` (labs 01–46) is a server → keep it running. */
  const start = async (args, env, heading, label, toCompletion) => {
    await stop();
    log(`\n===== [${heading}] START ${label}\n`);
    const p = spawn(process.execPath, ['start.js', ...args], { cwd: dir, env: { ...process.env, ...env }, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const me = svc = { p, exited: false, out: '', tools: 0, ex: args[0], heading };
    p.stdout.on('data', d => { me.out += d; log(d); }); p.stderr.on('data', d => { me.out += d; log(d); });
    p.on('close', code => { me.exited = true; log(`\n<<< start exit=${code}\n`); if (code && !me.killed) problem(`"npm start ${args.join(' ')}" exited with code ${code}`); });
    if (toCompletion) {
      const t0 = Date.now();
      while (!me.exited && Date.now() - t0 < TOOL_TIMEOUT) await sleep(100);
      if (!me.exited) { problem(`"npm start -- ${args.join(' ')}" did not finish in ${TOOL_TIMEOUT} ms`); me.killed = true; killGroup(p, 'SIGKILL'); await sleep(200); }
      return;
    }
    for (let i = 0; i < 15 && !me.exited; i++) await sleep(100);   // give servers time to listen
  };
  const looksLikeServer = s => /localhost:\d+|listening|:\d{4}\b/i.test(s.out);
  async function stop() {
    if (!svc) return;
    const s = svc; svc = null;
    if (!s.exited && !s.tools && !looksLikeServer(s)) {   // a run-to-completion exercise: let it finish
      const t0 = Date.now();
      while (!s.exited && Date.now() - t0 < TOOL_TIMEOUT) await sleep(200);
      if (!s.exited) problem('start neither exited nor looked like a server');
    }
    if (!s.exited) { s.killed = true; killGroup(s.p, 'SIGTERM'); await sleep(400); killGroup(s.p, 'SIGKILL'); await sleep(100); }
  }

  for (const s of steps) {
    const envTxt = Object.entries(s.env).map(([k, v]) => `${k}=${v} `).join('');
    if (/[<…]|\.\.\./.test(s.line) || /^(docker|cd|npm install|npm i)\b/.test(s.line)) { log(`\n(skip) ${s.line}\n`); continue; }
    const st = s.line.match(/^(?:npm start|node start\.js)\s*(.*)$/);
    if (st && !/&&|;|\|/.test(st[1])) {
      await start(st[1].split(/\s+/).filter(a => a && a !== '--'), s.env, s.heading, envTxt + s.line, /^--(\s|$)/.test(st[1]));
    } else if (/^(node |java |npm test|curl )/.test(s.line) || st) {
      const ex = exOf(s.heading);
      const other = svc && !svc.exited && svc.ex !== ex && svc.heading !== s.heading;   // a server left over from an earlier section
      if (ex && (!svc || svc.exited || other) && startSrc.includes(ex))
        await start([ex], {}, s.heading, `npm start ${ex}   (auto: tool under this heading, its server was not running)`, !/npm start ex/.test(readme));
      if (svc) svc.tools++;
      log(`\n----- [${s.heading}] $ ${envTxt}${s.line}\n`);
      const at = text.length;
      const code = await runTool(s.line, dir, s.env, log);
      if (code !== 0) {
        if (/npm install \S+/.test(text.slice(at)) && /nahi mila/.test(text.slice(at))) log('(ok: tool needs an npm library that is not installed — README says so)\n');
        else if (/--(kill|crash)/.test(s.line)) log('(ok: this command crashes on purpose)\n');
        else problem(`exit ${code}: ${envTxt}${s.line}`);
      }
    } else log(`\n(skip) ${s.line}\n`);
  }
  await stop();

  const after = snapshot(dir);
  const wrote = [...after.keys()].filter(f => before.get(f) !== after.get(f));
  const outside = wrote.filter(f => !/^(data|workspace)\//.test(f));
  if (wrote.length) log(`\nfiles the lab wrote: ${wrote.slice(0, 40).join(', ')}${wrote.length > 40 ? ` … (+${wrote.length - 40})` : ''}\n`);
  if (outside.length) problem(`writes outside data/ and workspace/: ${outside.slice(0, 8).join(', ')}`);
  fs.closeSync(fd);
  fs.rmSync(dir, { recursive: true, force: true });

  const flags = [];
  if (/\bNaN\b/.test(text)) flags.push('NaN');
  if (/\bundefined\b/.test(text)) flags.push('undefined');
  if (/EADDRINUSE/.test(text)) flags.push('EADDRINUSE');
  if (/^\s+at .+:\d+:\d+\)?$/m.test(text)) flags.push('stack-trace');
  return { problems, flags, logFile };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const labs = fs.readdirSync(LABS).filter(d => /^\d\d-/.test(d) && (!only.length || only.includes(d))).sort();
  let bad = 0;
  for (const l of labs) {
    const t0 = Date.now(); let r;
    try { r = await runLab(l); } catch (e) { r = { problems: 'CRASH ' + e.message, flags: [] }; }
    if (r.problems) bad++;
    console.log(`${r.problems ? '❌' : '✅'} ${l.padEnd(24)} problems=${r.problems}  ${((Date.now() - t0) / 1000).toFixed(0)}s${r.flags.length ? '  flags=' + r.flags.join(',') : ''}`);
  }
  console.log(`\n${bad ? '❌' : '✅'} ${labs.length} labs run · ${bad} with problems · logs: ${OUT}`);
  process.exit(bad ? 1 : 0);
})();
