const { needs } = require('./events');
function createBus() {
  const queues = Object.fromEntries(Object.keys(needs).map(name => [name, []]));
  let receipt = 0;
  return {
    publish(event) {
      for (const queue of Object.values(queues)) {
        queue.push({ receipt: ++receipt, event: structuredClone(event) });
      }
      return { copies: Object.keys(queues).length };
    },
    read(name) {
      if (!queues[name]) throw Error('unknown consumer');
      return structuredClone(queues[name][0] || null);
    },
    ack(name, token) {
      if (!queues[name]?.length || queues[name][0].receipt !== token) throw Error('wrong receipt');
      queues[name].shift();
      return { acked: true };
    },
    state: () => Object.fromEntries(Object.entries(queues).map(([name, q]) => [name, q.length])),
  };
}
module.exports = { createBus };
