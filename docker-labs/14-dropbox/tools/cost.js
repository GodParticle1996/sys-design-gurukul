#!/usr/bin/env node
/* Rent vs own — ek khurdara hisaab (video ke numbers: S3 ~2¢/GB-month list, egress ~9¢/GB).
   node tools/cost.js --pb 500 --egress 0.3 --discount 0.5
   --pb        : kitna data (petabytes)
   --egress    : har mahine data ka kitna hissa download hota hai (0.3 = 30%)
   --discount  : bade customer ki chhoot (0.5 = aadhi keemat)
   Own: hardware + DC ka fixed kharcha (team, jagah, bijli, network) — FIXED_M dollars/saal + per-PB kharcha. */
const args = require('./args')();
const pb = +(args.pb || 500), eg = +(args.egress || 0.3), disc = +(args.discount || 0.5);
const GB = pb * 1e6;
const cloud = (GB * 0.02 * 12 + GB * eg * 0.09 * 12) * disc;           // storage + egress, per saal
const FIXED_M = 40e6;                                                    // team + DCs + network contracts
const ownPerPb = 60e3 * 1.67;                                            // hardware/PB/saal (amortized) × erasure overhead
const own = FIXED_M + pb * ownPerPb;
const f = x => '$' + (x / 1e6).toFixed(1) + 'M';
console.log(`${pb} PB, egress ${Math.round(eg * 100)}%/mahina, chhoot ${Math.round((1 - disc) * 100)}%`);
console.log(`  cloud (S3 + egress) : ${f(cloud)} / saal`);
console.log(`  apna (fixed $40M + hardware) : ${f(own)} / saal`);
console.log(`  → ${own < cloud ? 'APNA sasta: ' + f(cloud - own) + ' / saal bachat' : 'CLOUD sasta: apna banane mein ' + f(own - cloud) + ' / saal zyada'}`);
