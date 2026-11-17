'use strict';
// ex4 — error budget and two alerting styles on one 30-day month, minute by minute (model).
// Traffic is flat, so a minute's error rate is that minute's share of failed requests.
const DAYS = 30, MINUTES = DAYS * 1440;
const budgetMinutes = (slo, days = DAYS) => (1 - slo) * days * 1440;

// Alert rules. avg(W) = rolling average error rate over the last W minutes (one-minute resolution). Numbers from the Google SRE Workbook
// ("Alerting on SLOs"): approach 1 is the plain threshold; Table 5-8 is the multiwindow, multi-burn-rate set (99.9% SLO).
// The plain thresholds are inclusive (≥), as in Workbook approach 1; the burn-rate expressions are strict (>), as in the
// Workbook. A relative tolerance of 1e-9 keeps exact boundaries (e.g. 0.2% × 5/10 = 0.1%) from flipping on rounding.
const atLeast = (x, th) => x >= th * (1 - 1e-9), over = (x, th) => x > th * (1 + 1e-9);
function rules(slo) {
  const b = 1 - slo, burn = (avg, W) => avg(W) / b;
  return [
    { id: 'video', kind: 'page', label: 'error rate ≥ 1%, 10 min (video ka 1%; window maana)', fires: avg => atLeast(avg(10), 0.01) },
    { id: 'threshold', kind: 'page', label: 'error rate ≥ SLO ki seema (99.9% par 0.1%), 10 min', fires: avg => atLeast(avg(10), b) },
    { id: 'burn-1h', kind: 'page', label: 'burn > 14.4 (1 ghanta aur 5 min)', fires: avg => over(burn(avg, 60), 14.4) && over(burn(avg, 5), 14.4) },
    { id: 'burn-6h', kind: 'page', label: 'burn > 6 (6 ghante aur 30 min)', fires: avg => over(burn(avg, 360), 6) && over(burn(avg, 30), 6) },
    { id: 'burn-3d', kind: 'ticket', label: 'burn > 1 (3 din aur 6 ghante)', fires: avg => over(burn(avg, 4320), 1) && over(burn(avg, 360), 1) },
  ];
}

// An incident: `rate` errors for `minutes`, starting on day 10. Everything else is error-free.
const INCIDENTS = [
  { id: 'outage-20m', label: 'poora outage, 20 min', rate: 1, minutes: 20 },
  { id: '2pct-6h', label: '2% errors, 6 ghante', rate: 0.02, minutes: 360 },
  { id: '0.3pct-7d', label: '0.3% errors, 7 din', rate: 0.003, minutes: 7 * 1440 },
  { id: '5pct-5m', label: '5% errors, 5 min', rate: 0.05, minutes: 5 },
  { id: '0.2pct-10m', label: '0.2% errors, 10 min', rate: 0.002, minutes: 10 },
];
function run(incident, slo = 0.999) {
  const start = 10 * 1440, rate = new Float64Array(MINUTES);
  for (let m = start; m < start + incident.minutes; m++) rate[m] = incident.rate;
  const prefix = new Float64Array(MINUTES + 1);
  for (let m = 0; m < MINUTES; m++) prefix[m + 1] = prefix[m] + rate[m];
  const total = (1 - slo) * MINUTES;                  // budget, in "fully failed minutes"
  const out = {}, end = start + incident.minutes;
  for (const r of rules(slo)) {
    let first = null, last = null;
    for (let m = start; m < MINUTES; m++) {
      const avg = W => (prefix[m + 1] - prefix[Math.max(0, m + 1 - W)]) / W;
      if (r.fires(avg)) { if (first === null) first = m; last = m; }
      else if (m >= end && first !== null) break;      // fired and has now stopped after the incident
    }
    // afterMin: minutes from incident start to the first firing minute (1 = the incident's first minute).
    // resetMin: minutes the alert keeps firing after the incident has ended (its reset time).
    out[r.id] = first === null ? null : { afterMin: first - start + 1, budgetUsedPct: (prefix[first + 1] - prefix[start]) / total * 100,
      resetMin: Math.max(0, last - end + 1) };
  }
  return { budgetPct: incident.rate * incident.minutes / total * 100, alerts: out };
}
module.exports = { DAYS, MINUTES, budgetMinutes, rules, INCIDENTS, run };
