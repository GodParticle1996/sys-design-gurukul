#!/usr/bin/env node
'use strict';
/* Find audit-style clipped English left in multiple-choice text (dev/REVIEW.md, decision 1).

     node dev/rewrite/scan.js                 per-track and per-level counts
     node dev/rewrite/scan.js <levelId>…      the flagged strings of those levels

   A string is flagged when it reads like the 2026-10-23 audit's fragments: almost no Hinglish
   glue words ("hai", "nahi", "ko", "mein" …) and mostly English words, e.g.
   "Stale least-loaded policy round-robin mode ban gayi". Options, reasons, explanations and
   hints are scanned; lesson prose is not. */
const { loadApp } = require('../load-app');

const GLUE = new Set(('hai hain tha thi the ho hota hoti hote nahi na ka ki ke ko se mein me par pe aur ya toh to bhi hi jo jab tak '
  + 'kya kyun kaise kitna kitni kitne wala wali wale apna apni apne sab koi kuch ek do teen agar phir lekin isliye kyunki jaise '
  + 'karo karta karti karte kar diya liya gaya gayi raha rahi rahe sakta sakti sakte chahiye milta milti dekho dekhta').split(' '));
const words = s => String(s).replace(/<[^>]+>/g, ' ').toLowerCase().match(/[a-z][a-z'-]*/g) || [];

function clipped(s) {
  const w = words(s);
  if (w.length < 5) return false;
  const glue = w.filter(x => GLUE.has(x)).length;
  return glue / w.length < 0.12;
}

function strings(level) {
  const out = [];
  (function walk(o, p) {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach((v, i) => walk(v, `${p}[${i}]`));
    if (Array.isArray(o.choices) && o.choices.every(c => typeof c === 'string')) {
      o.choices.forEach((c, i) => out.push([`${p}.choices[${i}]`, c]));
      (o.choiceExplanations || []).forEach((c, i) => out.push([`${p}.reason[${i}]`, c]));
      ['explain', 'hint'].forEach(k => { if (typeof o[k] === 'string') out.push([`${p}.${k}`, o[k]]); });
    }
    Object.entries(o).forEach(([k, v]) => { if (v && typeof v === 'object' && k !== 'choices') walk(v, p ? `${p}.${k}` : k); });
  })(level, '');
  return out;
}

module.exports = { clipped };
if (require.main === module) main();

function main() {
  const ids = process.argv.slice(2);
  const app = loadApp();
  if (ids.length) {
    app.levels.filter(({ level }) => ids.includes(level.id)).forEach(({ level }) => {
      const hits = strings(level).filter(([, s]) => clipped(s));
      console.log(`\n== ${level.id}: ${hits.length}`);
      hits.forEach(([p, s]) => console.log(`  ${p}: ${String(s).replace(/<[^>]+>/g, '').slice(0, 140)}`));
    });
  } else {
    const byTrack = new Map();
    app.levels.forEach(({ track, level }) => {
      const n = strings(level).filter(([, s]) => clipped(s)).length;
      if (!byTrack.has(track.id)) byTrack.set(track.id, []);
      byTrack.get(track.id).push([level.id, n]);
    });
    let total = 0;
    for (const [t, ls] of byTrack) {
      const sum = ls.reduce((a, [, n]) => a + n, 0); total += sum;
      console.log(`${t.padEnd(14)} ${String(sum).padStart(5)}   ${ls.filter(([, n]) => n).map(([id, n]) => `${id}:${n}`).join(' ')}`);
    }
    console.log(`${'total'.padEnd(14)} ${String(total).padStart(5)}`);
  }
}
