const { call } = require('./http');
const { needs } = require('./events');
const { createExposure } = require('./exposure');
function createConsumer({ name, mode, guard = true, owner, load = id => call(owner, `/orders/${id}`) }) {
  const copies = new Map(), seen = [];
  let skipped = 0, resyncs = 0, failures = 0;
  const exposure = createExposure(name);
  return {
    async accept(e) {
      exposure.count(e.state || e.changes || {}, 'event');
      const before = copies.get(e.id);
      if (mode !== 'thin' && guard && before && e.version <= before.version) {
        skipped++;
        return { status: 'ignored', eventVersion: e.version };
      }
      let state;
      if (mode === 'thin') state = await load(e.id);
      else if (mode === 'fat') state = structuredClone(e.state);
      else if (guard && e.version !== (before?.version || 0) + 1) {
        state = await load(e.id);
        if (state.version < e.version) throw Error('owner snapshot behind delta');
        resyncs++;
      } else state = { ...before, ...structuredClone(e.changes), id: e.id, version: e.version };
      if (mode === 'thin' || (mode === 'delta' && guard && e.version !== (before?.version || 0) + 1)) {
        exposure.count(state, 'callback');
      }
      if (mode !== 'thin') copies.set(e.id, state);
      const observation = { id: e.id, eventVersion: e.version, stateVersion: state.version,
        [needs[name]]: structuredClone(state[needs[name]]) };
      seen.push(observation);
      return { status: 'completed', observation };
    },
    fail() { failures++; },
    state: () => ({ completed: seen.length, skipped, resyncs, failures, ...exposure.state(),
      copies: [...copies.values()].map(row => structuredClone(row)), seen: structuredClone(seen) }),
  };
}
module.exports = { createConsumer };
