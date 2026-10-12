/* Agent runner — ek "agent" ke tool calls chalata hai. Agent koi AI model nahi: tasks/*.json mein likhe tool calls
   ka ek script hai (taaki lab har baar same chale). Har tool call CONTAINMENT layer se guzarti hai:
     1. network egress  — sirf ALLOW list ke hosts
     2. filesystem      — sirf /workspace ke andar
     3. budget          — max tool calls, max CPU ms
     4. monitor         — shak waale pattern par ALERT, aur KILL switch
   MODE=none    → koi deewar nahi (sirf gin-ti)
   MODE=walls   → deewarein (egress, fs, budget) — par monitor/kill nahi
   MODE=contain → deewarein + monitor + kill switch
   Har faisla ek audit log mein (tools/audit.js use padhta hai). */
const fs = require('fs');
const path = require('path');
const { serve, burn } = require('../lib/util');

const PORT = +process.env.PORT || 4802;
const WEB = `http://${process.env.WEB_HOST || 'localhost'}:${process.env.WEB_PORT || 4801}`;
const WORKSPACE = path.resolve(__dirname, '..', 'workspace');

const POLICY = {
  allowHosts: ['docs.internal'],
  maxCalls: 40,
  maxCpuMs: 400,
  alert: { deniedInWindow: 3, windowCalls: 10, callsAfterDone: 2 },
};

function newRun(mode, task) {
  return { mode, task, calls: 0, cpuMs: 0, allowed: 0, blocked: 0, alerts: [], killedAt: null, done: false,
           afterDone: 0, recentDenied: [], leakedBytes: 0, log: [] };
}

async function toolCall(run, call) {
  const contain = run.mode === 'contain' || run.mode === 'walls';
  run.calls++;
  const rec = { n: run.calls, tool: call.tool, arg: call.host || call.path || '', decision: 'allow', why: '' };

  if (contain) {
    if (run.calls > POLICY.maxCalls) { rec.decision = 'deny'; rec.why = 'budget: max calls'; }
    else if (run.cpuMs > POLICY.maxCpuMs) { rec.decision = 'deny'; rec.why = 'budget: cpu'; }
    else if (call.tool === 'fetch' || call.tool === 'post') {
      if (!POLICY.allowHosts.includes(call.host)) { rec.decision = 'deny'; rec.why = `egress: ${call.host} allowlist mein nahi`; }
    } else if (call.tool === 'read' || call.tool === 'write') {
      const p = path.resolve(WORKSPACE, call.path);
      if (!p.startsWith(WORKSPACE + path.sep)) { rec.decision = 'deny'; rec.why = 'fs: /workspace ke bahar'; }
    }
  }

  if (rec.decision === 'allow') {
    run.allowed++;
    if (call.tool === 'fetch') { await fetch(WEB + call.url, { headers: { host: call.host } }).then(r => r.json()); }
    if (call.tool === 'post') {
      const body = { data: call.data };
      await fetch(WEB + call.url, { method: 'POST', headers: { 'content-type': 'application/json', host: call.host }, body: JSON.stringify(body) });
      if (call.host !== 'docs.internal') run.leakedBytes += JSON.stringify(body).length;
    }
    if (call.tool === 'read') {
      try { rec.bytes = fs.readFileSync(path.resolve(WORKSPACE, call.path), 'utf8').length; } catch (e) { rec.bytes = 0; }
      if (!path.resolve(WORKSPACE, call.path).startsWith(WORKSPACE + path.sep)) run.readOutside = (run.readOutside || 0) + 1;
    }
    if (call.tool === 'write') fs.writeFileSync(path.join(WORKSPACE, path.basename(call.path)), call.data || '');
    if (call.tool === 'think') { const t = Date.now(); burn(call.ms || 20); run.cpuMs += Date.now() - t; }
  } else {
    run.blocked++;
    run.recentDenied.push(run.calls);
  }
  if (call.tool === 'done') { run.done = true; }
  else if (run.done) run.afterDone++;

  /* MONITOR — sirf contain mode mein alert/kill */
  if (run.mode === 'contain' && run.killedAt === null) {
    const w = run.recentDenied.filter(n => n > run.calls - POLICY.alert.windowCalls);
    if (w.length >= POLICY.alert.deniedInWindow) run.alerts.push({ at: run.calls, why: `${w.length} denied calls in last ${POLICY.alert.windowCalls}` });
    if (run.afterDone >= POLICY.alert.callsAfterDone) run.alerts.push({ at: run.calls, why: 'task "done" ke baad bhi calls chal rahi hain' });
    if (run.alerts.length) run.killedAt = run.calls;
  }
  run.log.push(rec);
  return rec;
}

serve(PORT, {
  'POST /run': async (req, res, url, p, body) => {
    const mode = (body && body.mode) || process.env.MODE || 'none';
    const taskName = (body && body.task) || 'research';
    const task = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tasks', taskName + '.json'), 'utf8'));
    await fetch(WEB + '/reset', { method: 'POST' });
    const run = newRun(mode, taskName);
    for (const call of task.calls) {
      if (run.killedAt !== null) break;
      await toolCall(run, call);
    }
    const out = await fetch(WEB + '/received').then(r => r.json());
    fs.writeFileSync(path.join(__dirname, '..', 'workspace', `audit-${taskName}-${mode}.json`), JSON.stringify(run.log, null, 1));
    return { mode, task: taskName, planned: task.calls.length, executed: run.calls, allowed: run.allowed, blocked: run.blocked,
             readOutsideWorkspace: run.readOutside || 0, reachedPaste: out.count, leakedBytes: out.bytes,
             cpuMs: run.cpuMs, alerts: run.alerts, killedAt: run.killedAt };
  },
  /* ek akela tool call — sirf policy ka faisla (audit ke liye). Kuch execute nahi hota. */
  'POST /probe': async (req, res, url, p, call) => {
    const run = newRun('contain', 'probe');
    const saved = { fetch: global.fetch };
    global.fetch = async () => ({ json: async () => ({}) });      // probe mein asli network nahi
    try { const rec = await toolCall(run, Object.assign({ url: '/x' }, call)); return { decision: rec.decision, why: rec.why }; }
    finally { global.fetch = saved.fetch; }
  },
  'GET /policy': () => POLICY,
}, () => console.log(`runner → http://localhost:${PORT}   (MODE=${process.env.MODE || 'none'})`));
