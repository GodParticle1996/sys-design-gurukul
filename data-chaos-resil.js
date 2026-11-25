/* 🎲 Chaos deck 'resil' — resil track, level chaos (engine: chaos.js)
   Swasth base: ledger aaj raat dheema (p99 3s) aur sale ka traffic (refresh ×2.5) — par guards sahi:
   timeout 600 · breaker OPEN (cooldown 30s) · fallback · bulkhead 10 · admission 400/s.
   Base par: GET /transactions/1 → 200, p99 147ms · load --pattern detail --rps 300 → saturated nahi, reject 0.
   Har card EK guard bigaadta hai (perfsim par chala ke dekha, 2026-11-25):
     no-fallback    GET 504 (breaker khula, par user ko kuch nahi)
     no-breaker     GET 200 par p99 956ms; load saturated, p99 10.9s
     cooldown-1s    GET p99 956ms (har request trial); load theek — status: cooldown 1s
     no-admission   load saturated, p99 4.3s
     admission-low  load "theek" par 5,730 log reject (hadd 30/s)
   (bulkhead hataane wala card nahi: breaker khula ho toh ledger calls 1ms mein fail hoti hain, pool bhookha hi nahi hota.) */
(function () {
  const L = s => (s.sys.deps || {}).ledger || {};
  const getOk = r => r.kind === 'http' && r.status === 200 && r.p99 < 200;
  const loadOk = r => r.kind === 'load' && r.pattern === 'detail' && r.rps >= 300 && !r.saturated && r.rejectedRequests < 1000;
  const admOk = s => { const a = s.sys.api.admission; return !!a && a.maxRps >= 250 && a.maxRps <= 480; };
  const H1 = 'Pehle probe: GET /transactions/1 aur load --pattern detail --rps 300. Phir sim status — ledger ki line mein kaunse guards hain?';
  const GETS = ['GET /transactions/2', 'GET /transactions/3', 'GET /transactions/4', 'GET /transactions/5', 'GET /transactions/6'];

  SD.chaos.addDeck({
    id: 'resil', title: 'Resilience deck',
    sys: {
      name: 'nightcart-api', retryAmp: 2.5,
      api: { admission: { maxRps: 400, queueSec: 8 } }, app: { bulkheads: { ledger: 10 } },
      deps: {
        ledger: { p50: 1800, p99: 3000, errorRate: 0, timeoutMs: 600, breaker: { threshold: 0.5, windowSec: 20, halfOpenAfter: 30 },
          breakerState: 'open', openUntilSec: 100000, outcomes: [], fallback: 'last known status' },
        search: { p50: 60, p99: 100, errorRate: 0 },
      },
    },
    alert: '<b>📟 21:05 — Mega Sale chal rahi hai.</b> Ledger (bahar ka provider) shaam se dheema hai (3s) — yeh pata hai, guards isi ke liye hain. Par kal raat ke "resilience config cleanup" ke baad shikayatein aa rahi hain. <b>Ek</b> guard galat hai. Shuru: <code>runbook</code>.',
    placeholder: 'runbook   (phir: GET /transactions/1)',
    runbook: `# NightCart runbook — "cleanup ke baad gadbad"
Probe:        GET /transactions/1               order status (SLO p99 < 200ms, 200 OK)
              load --pattern detail --rps 300   sale ka traffic (saturated nahi, reject kam)
Guards dekho: sim status  (ledger: timeout · breaker HAALAT (cooldown) · fallback · bulkhead · admission)
Guards badlo: sim add timeout|breaker|fallback|bulkhead ledger … · sim add admission --max-rps N --queue S
              (breaker dobara add = naya, CLOSED; 4 fail ke baad phir OPEN)
Niyam:        ek baar mein EK badlaav, phir wahi probe dobara.`,
    cards: [
      { id: 'no-fallback', title: 'Ledger ka fallback cleanup mein hat gaya',
        sys: { deps: { ledger: { fallback: null } } },
        fixed: s => !!L(s).fallback, verify: getOk, verifyText: 'GET /transactions/<id> — 200, p99 < 200ms',
        hints: [H1, 'GET 504 de raha hai, par jaldi (p99 147ms) — breaker khula hai, ledger ko pukaara hi nahi. Toh user ko 504 kyun? Breaker ke baad user ko kya milna tha?',
          "sim add fallback ledger 'last known status', phir GET /transactions/2."],
        solution: ['runbook', 'GET /transactions/1', 'sim status', "sim add fallback ledger 'last known status'", 'GET /transactions/2'],
        why: 'Breaker ne ledger ko bachaya (calls 1ms mein ruk gayi), par <b>fallback</b> ke bina user ko seedha 504. Breaker = "koshish band", fallback = "user ko kuch kaam ka". Dono saath chahiye.' },
      { id: 'no-breaker', title: 'Ledger ka circuit breaker cleanup mein hat gaya',
        sys: { deps: { ledger: { breaker: null, breakerState: null, openUntilSec: null } } },
        fixed: s => !!L(s).breaker, verify: getOk, verifyText: 'breaker khulne tak GET bhejo — phir 200, p99 < 200ms',
        hints: [H1, 'GET 200 hai par p99 956ms — har request ledger ke 600ms timeout tak ruk rahi hai. Load bhi saturated. sim status: ledger par breaker hai?',
          'sim add breaker ledger, phir GET /transactions/2 … /6 — 4 fail ke baad OPEN, phir fallback tez.'],
        solution: ['runbook', 'GET /transactions/1', 'sim status', 'sim add breaker ledger'].concat(GETS),
        why: 'Bina breaker har request ledger ka 600ms intezaar karti hai — fallback mile tab bhi <b>dheema</b>. Breaker baar-baar fail hoti dependency ko pukaarna band karta hai, toh fallback turant milta hai aur pool khaali rehta hai.' },
      { id: 'cooldown-1s', title: 'Breaker ka cooldown 30s se 1s kar diya gaya',
        sys: { deps: { ledger: { breaker: { threshold: 0.5, windowSec: 20, halfOpenAfter: 1 }, openUntilSec: 0 } } },
        fixed: s => !!L(s).breaker && L(s).breaker.halfOpenAfter >= 10, verify: getOk, verifyText: 'breaker khulne tak GET bhejo — phir 200, p99 < 200ms',
        hints: [H1, 'Breaker maujood hai, phir bhi GET p99 956ms — har request ledger tak ja rahi hai. sim status mein breaker ka cooldown dekho.',
          'sim add breaker ledger --half-open 30, phir GET /transactions/2 … /6.'],
        solution: ['runbook', 'GET /transactions/1', 'sim status', 'sim add breaker ledger --half-open 30'].concat(GETS),
        why: 'Cooldown 1s = breaker har second "half-open" hokar trial bhejta hai — dheeme ledger par har trial 600ms ka timeout. Breaker hai, par kaam nahi kar raha. Cooldown itna rakho ki dependency ko <b>saans</b> mile.' },
      { id: 'no-admission', title: 'Admission control (waiting room) cleanup mein hat gaya',
        sys: { api: { admission: null } },
        fixed: admOk, verify: loadOk, verifyText: 'load --pattern detail --rps 300 — saturated nahi',
        hints: [H1, 'GET theek hai par load saturated, p99 4s+. CAPACITY panel: offered (300 × 2.5 = 750) vs capacity — kaun rok raha tha?',
          'sim add admission --max-rps 400 --queue 8, phir load --pattern detail --rps 300.'],
        solution: ['runbook', 'load --pattern detail --rps 300', 'sim status', 'sim add admission --max-rps 400 --queue 8', 'load --pattern detail --rps 300'],
        why: 'Sale ka 750/s offered, capacity ~495/s. Admission control utne hi andar leta tha jitne backend sambhal sake; use hataate hi <b>sab</b> andar, sab dheeme. Backend ko bachana = kuch logon ko waiting room mein rakhna.' },
      { id: 'admission-low', title: 'Waiting room ki hadd 400/s se 30/s kar di gayi',
        sys: { api: { admission: { maxRps: 30, queueSec: 1 } } },
        fixed: admOk, verify: loadOk, verifyText: 'load --pattern detail --rps 300 — reject 1,000 se kam',
        hints: [H1, 'Load "saturated nahi" dikhta hai — par waiting/rejected line padho. Hazaaron log bahar. sim status: admission ki hadd kitni?',
          'sim add admission --max-rps 400 --queue 8 (capacity ~495 se neeche), phir load --pattern detail --rps 300.'],
        solution: ['runbook', 'load --pattern detail --rps 300', 'sim status', 'sim add admission --max-rps 400 --queue 8', 'load --pattern detail --rps 300'],
        why: 'Hadd 30/s par backend aaraam se — dashboard hara — par 5,730 log reject. Admission ki hadd <b>capacity ke paas</b> (thoda neeche) rakho; bahut neeche = asli users ko bina wajah lautaana. Sirf "saturated nahi" dekhna kaafi nahi.' },
    ],
  });

  SD.addLab('chaos', {
    type: 'chaos', id: 'chaos-resil', deck: 'resil', title: '🎲 Chaos round: guards ki cleanup',
    instructions: 'Ek guard chupchaap bigda hai. Probe chalao, sim status padho, EK badlaav se theek karo — phir batao kya toota tha.',
  });
})();
