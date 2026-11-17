'use strict';

// Explicit one-key, immediately visible operation model. No cloud/network emulation.
class Objects {
  constructor() { this.items = new Map(); this.clock = 0; }
  get(key) {
    const item = this.items.get(key);
    if (!item) throw new Error(`Missing object: ${key}`);
    return { ...item };
  }
  put(key, body, expectedVersion) {
    if (expectedVersion !== undefined && this.items.get(key)?.version !== expectedVersion) {
      throw new Error('Precondition failed');
    }
    const version = ++this.clock;
    this.items.set(key, { body, version });
    return version;
  }
  list(prefix) { return [...this.items.keys()].filter(k => k.startsWith(prefix)).sort(); }
  copy(source, target) { return this.put(target, this.get(source).body); }
  delete(key) { this.items.delete(key); }
}

// Immutable generation keys must stay available while any reader uses their manifest.
function readRelease(store, manifestBody) {
  const keys = JSON.parse(manifestBody);
  return keys.map(key => store.get(key).body);
}

module.exports = { Objects, readRelease };
