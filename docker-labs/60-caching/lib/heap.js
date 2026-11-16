'use strict';
// Min-heap of [time, seq, fn] events for the timeline models.
function heap() {
  const a = []; let seq = 0;
  const less = (i, j) => a[i][0] < a[j][0] || (a[i][0] === a[j][0] && a[i][1] < a[j][1]);
  const swap = (i, j) => { const t = a[i]; a[i] = a[j]; a[j] = t; };
  return {
    push(t, fn) { a.push([t, seq++, fn]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (!less(i, p)) break; swap(i, p); i = p; } },
    pop() { const top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && less(l, m)) m = l; if (r < a.length && less(r, m)) m = r; if (m === i) break; swap(i, m); i = m; } } return top; },
    get size() { return a.length; },
  };
}
module.exports = { heap };
