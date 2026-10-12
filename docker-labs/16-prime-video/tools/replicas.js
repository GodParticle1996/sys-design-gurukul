#!/usr/bin/env node
/* ex2 — monolith ko COPIES se scale karo. Streams aapas mein baat nahi karte, toh ek patla router bas streams baant deta hai.
   node tools/replicas.js --streams 200 --copies 1|2|4|8
   Har copy ek alag process (poori pipeline ek process mein). Phir: detectors RAM mein nahi samaate → copies ko alag
   detector-SUBSET do (same code, alag config). */
const { execFile } = require('child_process');
const path = require('path');
const args = require('./args')();
const STREAMS = +(args.streams || 200), COPIES = +(args.copies || 4), SECS = 8;
const per = Math.ceil(STREAMS / COPIES);
const run = () => new Promise(res => execFile(process.execPath, [path.join(__dirname, 'pipeline.js'), '--mode', 'mono', '--streams', String(per), '--secs', String(SECS)], (e, out) => res(out)));
(async () => {
  const outs = await Promise.all(Array.from({ length: COPIES }, run));
  const total = outs.reduce((s, o) => s + +(o.match(/: (\d+) video-seconds/) || [0, 0])[1], 0);
  const rt = total / STREAMS / SECS;
  console.log(`${STREAMS} streams, ${COPIES} copies (${per} streams har copy): ${total} video-seconds in ${SECS} s → har stream ${rt.toFixed(2)}× real-time ${rt >= 1 ? '✅' : '❌'}`);
  if (args.detectors) {
    // detector models aur unki RAM (GB) — ek instance mein 8 GB
    const D = { 'block-corruption': 3, 'freeze': 2, 'av-sync': 2.5, 'audio-clipping': 1.5, 'caption-sync': 2, 'color-banding': 3.5 };
    const total = Object.values(D).reduce((a, b) => a + b, 0);
    console.log(`\n6 detectors = ${total} GB models, instance RAM = 8 GB → sab ek copy mein nahi samaate. Config se baanto:`);
    const groups = [[]]; let used = 0;
    for (const [n, gb] of Object.entries(D).sort((a, b) => b[1] - a[1])) { if (used + gb > 8) { groups.push([]); used = 0; } groups[groups.length - 1].push(`${n} (${gb})`); used += gb; }
    groups.forEach((g, i) => console.log(`  copy-type ${i + 1}: DETECTORS=${g.join(', ')}`));
    console.log(`  → same code, ${groups.length} configs. Router har stream ko har config ki ek copy par bhejta hai.`);
  }
})();
