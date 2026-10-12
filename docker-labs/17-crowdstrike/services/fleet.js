/* 500 Windows machines (ek process mein simulation). Har machine:
   - har 200 ms cloud se apni RING ka content poochti hai (network ho toh)
   - har tick 20 named-pipe events apne loaded rule par chalati hai
   MODE=kernel : rule ne array ke bahar padha → poori MACHINE crash (BSOD) → reboot →
                 BOOT-START driver network se PEHLE disk wala content load karta hai → phir crash (boot loop).
                 Har reboot par 10% chance ki network pehle aa jaaye aur naya content mil jaaye.
                 Fix aane ke baad Microsoft ki salah: 15 baar reboot karo — phir bhi nahi → haath se (safe mode, file delete).
   MODE=user   : wahi galti → sirf AGENT process marta hai, machine chalti rehti hai, agent restart hota hai. */
const { serve } = require('../lib/util');
const { evaluate, namedPipeEvent } = require('../lib/sensor');
const PORT = +process.env.PORT || 4872, N = 500, MODE = process.env.MODE || 'kernel';
const CLOUD = `http://${process.env.CLOUD_HOST || 'localhost'}:4871`;
let s = 7; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const ringOf = i => (i < 5 ? 0 : i < 50 ? 1 : i < 250 ? 2 : 3);     // 1% / 10% / 50% / 100%
let hosts;
function reset() {
  hosts = Array.from({ length: N }, (_, i) => ({ id: i, ring: ringOf(i), state: 'up', disk: null, rule: null, reboots: 0, agentRestarts: 0, everCrashed: false }));
}
reset();
const byRing = {};
async function tick() {
  const cache = {};
  const status = await fetch(`${CLOUD}/status`).then(r => r.json());
  const fixOut = /fix$/.test(status.version);
  for (const h of hosts) {
    if (h.state === 'manual') continue;
    if (h.state === 'bootloop') {
      if (fixOut) h.reboots++;                              // "15 reboots" ki ginti fix aane ke baad
      if (rnd() < 0.10) {                                   // network pehle aa gaya → cloud se naya content
        const c = cache[h.ring] || (cache[h.ring] = await fetch(`${CLOUD}/content?ring=${h.ring}`).then(r => r.json()));
        if (c.version) { h.disk = c; }
      }
      h.rule = h.disk && h.disk.rule;                       // boot-start: disk wala content
      try { for (let i = 0; i < 20; i++) evaluate(h.rule, namedPipeEvent(i)); h.state = 'up'; }
      catch (e) { if (h.reboots >= 15) h.state = 'manual'; }  // Microsoft: "15 baar reboot karo" — phir haath se
      continue;
    }
    const c = cache[h.ring] || (cache[h.ring] = await fetch(`${CLOUD}/content?ring=${h.ring}`).then(r => r.json()));
    if (c.version && (!h.disk || h.disk.version !== c.version)) { h.disk = c; h.rule = c.rule; }
    if (!h.rule) continue;
    try { for (let i = 0; i < 20; i++) evaluate(h.rule, namedPipeEvent(i + Math.floor(rnd() * 7))); }
    catch (e) {
      h.everCrashed = true;
      if (MODE === 'kernel') { h.state = 'bootloop'; }
      else { h.agentRestarts++; h.rule = null; h.disk = { version: h.disk.version + '-quarantined' }; }   // user mode: agent mara, machine zinda; kharab content quarantine
    }
  }
  Object.keys(byRing).forEach(k => delete byRing[k]);
  hosts.forEach(h => { if (h.everCrashed) byRing[h.ring] = (byRing[h.ring] || 0) + 1; });
  await fetch(`${CLOUD}/health`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(byRing) });
}
let busy = false;
setInterval(async () => { if (busy) return; busy = true; try { await tick(); } catch (e) {} busy = false; }, 200);
serve(PORT, {
  'GET /stats': () => {
    const c = st => hosts.filter(h => h.state === st).length;
    return { mode: MODE, up: c('up'), bootloop: c('bootloop'), manual: c('manual'), everCrashed: hosts.filter(h => h.everCrashed).length,
             agentRestarts: hosts.reduce((a, h) => a + h.agentRestarts, 0), crashedByRing: byRing };
  },
  'POST /reset': () => { reset(); return { ok: 1 }; },
}, () => console.log(`fleet → :${PORT}  (${N} machines, MODE=${MODE})`));
