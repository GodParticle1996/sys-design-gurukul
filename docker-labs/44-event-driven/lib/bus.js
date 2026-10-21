/* Ek topic, har subscription ki apni RAM wali line.
   Har line ka ek worker. No disk, no network guarantees.
   read() nahi mitata; ack() ke baad entry hatti hai. */
function createBus(names, cap = 20) {
  const queues = new Map(names.map(n => [n, []]));
  function queue(name) {
    if (!queues.has(name)) throw Error('unknown queue');
    return queues.get(name);
  }
  return {
    publish(event) {
      if (!event.id || !event.type) {
        throw Error('id aur type chahiye');
      }
      const targets = [...queues.values()];
      if (targets.some(q => q.length >= cap)) {
        throw Error('queue full');
      }
      for (const q of targets) {
        q.push(structuredClone(event));
      }
      return targets.length;
    },
    read(name) {
      return structuredClone(queue(name)[0] || null);
    },
    ack(name, id) {
      const q = queue(name);
      if (!q.length || q[0].id !== id) return false;
      q.shift();
      return true;
    },
    pending(name) {
      return queue(name).length;
    },
  };
}
module.exports = { createBus };
