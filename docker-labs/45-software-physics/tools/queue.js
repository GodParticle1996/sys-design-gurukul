const { schedule, summarize } = require('../lib/queue');
const rows = schedule([0,50,100,150], 100, 1);
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({rows,summary:summarize(rows)},null,2));
} else {
  console.log('MODEL: arrivals 0,50,100,150 ms; 1 worker; work 100 ms');
  for (const r of rows) console.log(`#${r.id}: aaya=${r.at} start=${r.start} end=${r.end} wait=${r.wait} total=${r.total} ms`);
  const s=summarize(rows);
  console.log(`poora window=${s.duration} ms; area=${s.area} request-ms; peak=${s.peak}`);
  console.log(`hisaab: lambda=${s.rate.toFixed(2)}/s W=${s.meanW.toFixed(2)} ms L=${s.meanL.toFixed(2)}`);
  console.log(`check: ${(s.rate*s.meanW/1000).toFixed(2)} = ${s.meanL.toFixed(2)} (averages; har pal ki ginti nahi)`);
}
