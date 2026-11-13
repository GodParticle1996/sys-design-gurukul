'use strict';
// ex2 core: a primary and two replicas; one-way delays are a MODEL (setTimeout), the timers are real.
const REPLICAS = [{ name: 'paas (1 ms)', oneWay: 1 }, { name: 'door (30 ms)', oneWay: 30 }];
const MODES = ['async', 'sync-any-1', 'sync-all'];

function cluster() {
  const reps = REPLICAS.map(r => ({ ...r, applied: new Set() }));
  let dead = false;
  function write(id, mode) {                                           // resolves when the client is told "ho gaya"
    const acks = reps.map(rep => new Promise(res => setTimeout(() => {
      if (dead) return;                                                 // primary died before this packet arrived: lost
      rep.applied.add(id);
      setTimeout(() => { if (!dead) res(); }, rep.oneWay);              // ack travels back; a dead primary answers nobody
    }, rep.oneWay)));
    if (mode === 'async') return Promise.resolve();
    if (mode === 'sync-any-1') return Promise.any(acks);
    return Promise.all(acks);
  }
  return { reps, write, kill: () => { dead = true; } };
}

module.exports = { REPLICAS, MODES, cluster };
