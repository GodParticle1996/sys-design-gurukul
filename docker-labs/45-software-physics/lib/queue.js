function schedule(arrivals, workMs, slots = 1) {
  if (!Number.isInteger(slots) || slots < 1 ||
      !Number.isFinite(workMs) || workMs <= 0) {
    throw Error('valid slots aur workMs chahiye');
  }
  const free = Array(slots).fill(0);
  let previous = -Infinity;
  return arrivals.map((at, i) => {
    if (!Number.isFinite(at) || at < 0 || at < previous) {
      throw Error('arrivals sorted aur nonnegative hon');
    }
    previous = at;
    const lane = free.indexOf(Math.min(...free));
    const start = Math.max(at, free[lane]);
    const end = start + workMs;
    free[lane] = end;
    return { id: i + 1, at, start, end,
      wait: start - at, total: end - at };
  });
}
function summarize(rows) {
  if (!rows.length) throw Error('rows chahiye');
  const duration = Math.max(...rows.map(r => r.end))
    - Math.min(...rows.map(r => r.at));
  const area = rows.reduce((s, r) => s + r.total, 0);
  const events = rows.flatMap(r =>
    [[r.at, 1], [r.end, -1]])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let inside = 0, peak = 0;
  for (const [, change] of events) {
    inside += change;
    peak = Math.max(peak, inside);
  }
  return { duration, area, peak,
    meanW: area / rows.length,
    rate: rows.length * 1000 / duration,
    meanL: area / duration };
}
module.exports = { schedule, summarize };
