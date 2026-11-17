'use strict';
// node test/mutate.js — copies the lab to a temp folder, breaks one line at a time, and checks that `node --test` fails.
// Every line below is a deliberate bug that would change a number or claim the lab teaches.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), { spawnSync } = require('node:child_process');
const MUTATIONS = [
  ['lib/stats.js', 'Math.ceil(p / 100 * s.length) - 1', 'Math.floor(p / 100 * s.length)', 'nearest-rank percentile'],
  ['lib/latency.js', 'lo + (hi - lo) * (rank - cum) / counts[i]', 'hi', 'histogram interpolation inside a bucket'],
  ['lib/latency.js', 'if (!total || Number.isNaN(p)) return NaN;', '', 'empty histogram → NaN'],
  ['lib/mesh.js', 'if (/^0+$/.test(trace) || /^0+$/.test(parent)) return null;', '', 'all-zero ids are invalid'],
  ['lib/mesh.js', 'walk(mine.filter(s => s.parent === null || !ids.has(s.parent)), 0);', 'walk(mine.filter(s => s.parent === null), 0);', 'a caller trace still renders'],
  ['lib/mesh.js', "const clock = svc => Date.now() + (skewMs[svc] || 0);", 'const clock = svc => Date.now();', 'skewed product clock'],
  ['lib/cost.js', 'series * (86400 / scrapeS) * bytesPerSample', 'series * bytesPerSample * 20', 'metric bytes per day'],
  ['lib/cost.js', "if (e || s || coin) add('tail', e, s);", "if (e || s) add('tail', e, s);", 'tail sampling keeps 1% of normal traces'],
  ['lib/queue.js', 'const start = Math.max(t, free[k])', 'const start = Math.max(t, free[0])', 'earliest free cashier'],
  ['lib/queue.js', 'if (w > 1e-9) waited++', 'if (w > 30) waited++', 'who waited'],
  ['lib/queue.js', 'p99Wait: pct(waits, 99)', 'p99Wait: waits[waits.length - 1]', 'queue p99'],
  ['lib/queue.js', 'rho / (2 * (1 - rho)) * S', 'rho / (1 - rho) * S', 'M/D/1 formula'],
  ['lib/queue.js', 'const last = term * a / c / (1 - a / c); return last / (sum + last);', 'return 0.3;', 'Erlang C'],
  ['lib/budget.js', 'const b = 1 - slo, burn', 'const b = 0.001, burn', 'thresholds follow the SLO'],
  ['lib/budget.js', 'over = (x, th) => x > th * (1 + 1e-9)', 'over = (x, th) => x >= th * (1 - 1e-9)', 'strict burn thresholds'],
  ['lib/budget.js', 'over(burn(avg, 60), 14.4) && over(burn(avg, 5), 14.4)', 'over(burn(avg, 60), 14.4)', '1-hour rule needs its 5-min window'],
  ['lib/budget.js', 'fires: avg => over(burn(avg, 360), 6) && over(burn(avg, 30), 6) }', 'fires: avg => false }', '6-hour page fires'],
  ['lib/budget.js', 'over(burn(avg, 4320), 1) && over(burn(avg, 360), 1)', 'over(burn(avg, 4320), 1)', '3-day ticket needs its 6-hour window'],
  ['lib/budget.js', 'budgetUsedPct: (prefix[first + 1] - prefix[start]) / total * 100', 'budgetUsedPct: 0', 'budget at detection'],
];
const lab = path.join(__dirname, '..'), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lab64-mut-'));
fs.cpSync(lab, tmp, { recursive: true });
// Run the suite once. 'pass' and 'fail' come from node --test itself; anything else (spawn error, signal, timeout,
// a crash before any test ran) is an infrastructure error and must never count as a caught mutation.
function suite() {
  const r = spawnSync(process.execPath, ['--test', 'test/core.test.js'], { cwd: tmp, encoding: 'utf8', timeout: 120000 });
  if (r.error || r.signal) return { kind: 'infra', why: r.error ? r.error.message : `signal ${r.signal}` };
  const failed = Number((/^ℹ fail (\d+)/m.exec(r.stdout) || [])[1]), passed = Number((/^ℹ pass (\d+)/m.exec(r.stdout) || [])[1]);
  if (!Number.isFinite(failed) || !Number.isFinite(passed)) return { kind: 'infra', why: 'no test summary' };
  if (r.status === 0 && failed === 0) return { kind: 'pass' };
  const name = (/^✖ (.+?) \(\d/m.exec(r.stdout) || [])[1] || '?';
  return { kind: 'fail', why: name };
}
const base = suite();
if (base.kind !== 'pass') {
  console.log(`baseline did not pass (${base.kind}: ${base.why || 'tests failed'}) — fix that first; no mutation score.`);
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(2);
}
let missed = 0, infra = 0;
for (const [file, from, to, claim] of MUTATIONS) {
  const f = path.join(tmp, file), src = fs.readFileSync(f, 'utf8');
  if (src.split(from).length !== 2) throw new Error(`mutation anchor not found once: ${file}: ${from}`);
  fs.writeFileSync(f, src.replace(from, to));
  const r = suite();
  fs.writeFileSync(f, src);
  if (r.kind === 'pass') missed++;
  if (r.kind === 'infra') infra++;
  console.log(`${r.kind === 'pass' ? 'MISSED' : r.kind === 'infra' ? 'ERROR ' : 'caught'}  ${claim}${r.kind === 'fail' ? `  (failed: ${r.why})` : r.kind === 'infra' ? `  (${r.why})` : ''}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${MUTATIONS.length - missed - infra} / ${MUTATIONS.length} mutations caught${infra ? ` · ${infra} infrastructure errors` : ''}`);
process.exitCode = missed || infra ? 1 : 0;
