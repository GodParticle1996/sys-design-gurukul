'use strict';
// MODEL: a B+tree of numeric keys whose nodes are "pages", read and written through a buffer pool (LRU).
// A page not in the pool costs one disk read. A changed (dirty) page costs one disk write when it is pushed out of the
// pool or when checkpoint() flushes it. Leaves hold whole rows (clustered, like InnoDB); inner pages hold keys only.
class BPlusTree {
  constructor({ leafCap, innerCap, poolPages }) {
    this.leafCap = leafCap; this.innerCap = innerCap; this.poolPages = poolPages;
    this.pages = new Map(); this.nextId = 0;
    this.pool = new Map(); this.dirty = new Set(); this.pinned = new Set();
    this.stats = { reads: 0, writes: 0, splits: 0 };
    this.root = this.newPage(true).id;
  }
  newPage(leaf) {
    const p = { id: this.nextId++, leaf, keys: [], vals: leaf ? [] : null, kids: leaf ? null : [] };
    this.pages.set(p.id, p); this.touch(p.id, true, true); return p;
  }
  touch(id, dirty, fresh = false) {
    if (this.pool.has(id)) this.pool.delete(id);
    else {
      if (!fresh) this.stats.reads++;
      if (this.pool.size >= this.poolPages) {
        let victim; for (const id of this.pool.keys()) if (!this.pinned.has(id)) { victim = id; break; }
        this.pool.delete(victim);
        if (this.dirty.delete(victim)) this.stats.writes++;
      }
    }
    this.pool.set(id, true);
    if (dirty) this.dirty.add(id);
    return this.pages.get(id);
  }
  static pos(keys, k) { let lo = 0, hi = keys.length; while (lo < hi) { const m = (lo + hi) >> 1; if (keys[m] <= k) lo = m + 1; else hi = m; } return lo; }
  get(k) {
    let p = this.touch(this.root, false);
    while (!p.leaf) p = this.touch(p.kids[BPlusTree.pos(p.keys, k)], false);
    const i = BPlusTree.pos(p.keys, k) - 1;
    return i >= 0 && p.keys[i] === k ? p.vals[i] : undefined;
  }
  put(k, v) {
    const path = [];
    let p = this.touch(this.root, false);
    while (!p.leaf) { const i = BPlusTree.pos(p.keys, k); path.push([p, i]); p = this.touch(p.kids[i], false); }
    const i = BPlusTree.pos(p.keys, k);
    if (i > 0 && p.keys[i - 1] === k) { p.vals[i - 1] = v; this.touch(p.id, true); return; }
    p.keys.splice(i, 0, k); p.vals.splice(i, 0, v); this.touch(p.id, true);
    let node = p;
    while (node.keys.length > (node.leaf ? this.leafCap : this.innerCap)) {
      this.stats.splits++;
      const right = this.newPage(node.leaf), mid = node.keys.length >> 1;
      let sep;
      if (node.leaf) { right.keys = node.keys.splice(mid); right.vals = node.vals.splice(mid); sep = right.keys[0]; }
      else { sep = node.keys[mid]; right.keys = node.keys.splice(mid + 1); node.keys.pop(); right.kids = node.kids.splice(mid + 1); }
      this.touch(node.id, true);
      if (!path.length) {
        const root = this.newPage(false); root.keys = [sep]; root.kids = [node.id, right.id]; this.root = root.id; break;
      }
      const [parent, at] = path.pop();
      parent.keys.splice(at, 0, sep); parent.kids.splice(at + 1, 0, right.id); this.touch(parent.id, true);
      node = parent;
    }
  }
  checkpoint() { this.stats.writes += this.dirty.size; this.dirty.clear(); }
  shape() {
    let height = 1, p = this.pages.get(this.root);
    while (!p.leaf) { height++; p = this.pages.get(p.kids[0]); }
    let leaves = 0, rows = 0; for (const q of this.pages.values()) if (q.leaf) { leaves++; rows += q.keys.length; }
    return { height, pages: this.pages.size, leaves, inner: this.pages.size - leaves, leafFill: rows / (leaves * this.leafCap) };
  }
  innerIds() { return [...this.pages.values()].filter(p => !p.leaf).map(p => p.id); }
  coldPool(pinIds, spare = 1) {               // restart: only pinIds stay in RAM (never evicted), plus `spare` free pages
    this.checkpoint(); this.pool = new Map(); this.pinned = new Set(pinIds);
    for (const id of pinIds) this.pool.set(id, true);
    this.poolPages = pinIds.length + spare;
  }
}
module.exports = { BPlusTree };
