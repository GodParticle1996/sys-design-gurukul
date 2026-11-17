'use strict';
// Run recovery decisions against actual SQLite without opening a network port.
const { parseArgs } = require('node:util');
const { EventStore } = require('./store.cjs');

function experiment({ head = 4, retain = 3, cursor = 1 } = {}) {
  for (const [name, value, min] of [['head', head, 0], ['retain', retain, 1], ['cursor', cursor, 0]]) {
    if (!Number.isSafeInteger(value) || value < min || value > 100) throw new Error(`${name}: ${min} through 100 ka integer do.`);
  }
  const store = new EventStore(':memory:', retain);
  try {
    store.create('order-41');
    const states = ['accepted', 'cooking', 'ready', 'delivered'];
    for (let seq = 1; seq <= head; seq++) store.append('order-41', states[seq % states.length]);
    const result = store.resume('order-41', cursor);
    return {
      stream: 'order-41', retention: retain, head,
      replayFloor: store.head('order-41').floor,
      retainedSequences: store.db.prepare('SELECT seq FROM events WHERE stream_id=? ORDER BY seq').all('order-41').map(row => row.seq),
      requestedCursor: cursor, mode: result.mode, rows: result.rows,
      meaning: result.mode === 'reset'
        ? 'Missing history delete ho chuki hai. Current screen ko full snapshot do; deleted side effects recover nahi hue.'
        : result.rows.length
          ? 'Cursor ke baad ki poori retained history ascending order mein mili.'
          : 'Is saved head tak koi missing event nahi. Future updates alag aayengi.'
    };
  } finally { store.close(); }
}

if (require.main === module) {
  try {
    const { values } = parseArgs({ options: { head: { type: 'string', default: '4' }, retain: { type: 'string', default: '3' }, cursor: { type: 'string', default: '1' } } });
    for (const [name, value] of Object.entries(values)) if (!/^\d+$/.test(value)) throw new Error(`--${name}: nonnegative integer do.`);
    console.log(JSON.stringify(experiment(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value)]))), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 2; }
}
module.exports = { experiment };
