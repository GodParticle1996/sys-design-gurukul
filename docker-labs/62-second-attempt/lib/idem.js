'use strict';
// ASLI code (in memory): a success-path payment API with an idempotency-key store, inspired by Stripe API v1.
// A request with a key: first time → do the work, remember a COPY of the response. Same key again → that saved response,
// no new charge. Same key while the first is still running → 409. Same key with different parameters → 422 (the lab's
// choice; Stripe returns an error). Finished keys are forgotten after `ttlMs` (the lab prunes at exactly 24 h; Stripe v1 may
// prune any time after 24 h). A running entry is owned by a token; after `leaseMs` another request may take it over, and a
// stale owner can no longer charge or overwrite the record (the token check and the charge are one DB transaction).
const norm = o => JSON.stringify(Object.keys(o).sort().reduce((a, k) => ((a[k] = o[k]), a), {}));
const copy = o => JSON.parse(JSON.stringify(o));
function payments({ ttlMs = 24 * 3600e3, leaseMs = 60e3, useKeys = true, lockInFlight = true, ownership = true } = {}) {
  const store = new Map();                                   // key → { state, params (normalized), response, at, token }
  let charges = 0, nextId = 1, nextToken = 1;
  const begin = (key, params, now) => {
    if (useKeys && key) {
      const e = store.get(key);
      const alive = e && (e.state === 'done' ? now - e.at < ttlMs : now - e.at < leaseMs);
      if (alive) {
        if (e.params !== norm(params)) return { status: 422, body: 'same key, different parameters' };
        if (e.state === 'running' && lockInFlight) return { status: 409, body: 'same key still running' };
        if (e.state === 'done') return { status: 200, body: copy(e.response), replay: true };
      }
      const token = nextToken++;
      store.set(key, { state: 'running', params: norm(params), at: now, token });
      return { status: 'started', key, token };
    }
    return { status: 'started', key, token: null };
  };
  const finish = (key, params, token, now = 0) => {
    if (useKeys && key) {
      const e = store.get(key);
      if (ownership && (!e || e.token !== token || e.state !== 'running')) return { status: 409, body: 'stale owner: not charged' };
      charges++;
      const response = { id: `ch_${nextId++}`, amount: params.amount };
      if (e) Object.assign(e, { state: 'done', response: copy(response), at: now });
      return { status: 200, body: response };
    }
    charges++;
    return { status: 200, body: { id: `ch_${nextId++}`, amount: params.amount } };
  };
  const charge = (key, params, now) => { const b = begin(key, params, now); return b.status === 'started' ? finish(key, params, b.token, now) : b; };
  return { begin, finish, charge, charges: () => charges };
}
// Users table where ids may be reused, and a balance that can be incremented or set.
function users({ reuseIds = true } = {}) {
  const rows = new Map(); let next = 10, version = 0;
  return {
    create(name) { const id = reuseIds ? 10 : `u_${next++}`; rows.set(id, { name, v: ++version }); return id; },
    del(id, ifVersion) { const r = rows.get(id); if (!r) return 404; if (ifVersion !== undefined && r.v !== ifVersion) return 412; rows.delete(id); return 204; },
    get: id => rows.get(id),
  };
}
function balance(start = 500) {
  let b = start, v = 0;
  return {
    add(x) { b += x; v++; return b; },
    set(x, ifV) { if (ifV !== undefined && ifV !== v) return { status: 412, b }; b = x; v++; return { status: 200, b }; },
    get: () => ({ b, v }),
  };
}
module.exports = { payments, users, balance };
