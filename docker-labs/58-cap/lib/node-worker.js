'use strict';
// A replica that answers pings. 'pause' makes it busy for `ms` (like a long GC pause): it cannot answer meanwhile.
const { parentPort } = require('node:worker_threads');
parentPort.on('message', m => {
  if (m.type === 'ping') parentPort.postMessage({ type: 'pong', seq: m.seq });
  else if (m.type === 'pause') { const end = performance.now() + m.ms; while (performance.now() < end) { /* frozen */ } }
});
