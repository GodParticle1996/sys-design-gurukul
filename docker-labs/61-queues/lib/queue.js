'use strict';
// A task queue like SQS standard: receive hides a message for `visibility` seconds; delete removes it.
// Not deleted in time → it becomes visible again and another worker gets it (at-least-once).
function queue({ visibility = 30, retention = 4 * 86400 } = {}) {
  const msgs = [];                                      // { id, body, sentAt, visibleAt, receives, gone }
  let next = 1;
  return {
    send(body, now) { msgs.push({ id: next++, body, sentAt: now, visibleAt: now, receives: 0, gone: false }); },
    receive(now) {
      for (const m of msgs) {
        if (m.gone) continue;
        if (now - m.sentAt >= retention) { m.gone = 'expired'; continue; }
        if (m.visibleAt <= now) { m.visibleAt = now + visibility; m.receives++; return { id: m.id, body: m.body, receipt: `${m.id}:${m.receives}` }; }
      }
      return null;
    },
    delete(receipt) { const m = msgs.find(x => `${x.id}:${x.receives}` === receipt); if (m && !m.gone) { m.gone = 'deleted'; return true; } return false; },
    stats: () => ({ waiting: msgs.filter(m => !m.gone).length, expired: msgs.filter(m => m.gone === 'expired').length }),
  };
}
module.exports = { queue };
