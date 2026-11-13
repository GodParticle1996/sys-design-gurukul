'use strict';
// N shards, each a worker thread (lib/shard-worker.js) with its own SQLite file in a temp folder.
// call(i, op, ...args) sends one request to shard i; the main thread is the router.
const { Worker } = require('node:worker_threads');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
class Cluster {
  constructor(n, name = 'shard') {
    this.dir = fs.mkdtempSync(path.join(os.tmpdir(), `lab57-${name}-`));
    this.pending = new Map(); this.seq = 0; this.calls = 0;
    this.workers = Array.from({ length: n }, (_, i) => {
      const w = new Worker(path.join(__dirname, 'shard-worker.js'), { workerData: { file: path.join(this.dir, `${name}${i}.db`) } });
      w.on('message', m => { const p = this.pending.get(m.id); this.pending.delete(m.id); if (m.error) p.reject(new Error(`shard ${i}: ${m.error}`)); else p.resolve(m.result); });
      w.on('error', e => { for (const p of this.pending.values()) p.reject(e); this.pending.clear(); });
      return w;
    });
  }
  get n() { return this.workers.length; }
  call(i, op, ...args) {
    const id = ++this.seq; this.calls++;
    return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.workers[i].postMessage({ id, op, args }); });
  }
  each(op, ...args) { return Promise.all(this.workers.map((_, i) => this.call(i, op, ...args))); }
  async busy() { const b = await this.each('busy'); this.calls -= this.n; return b; }   // ms each shard spent working since the last busy()
  async close() { await Promise.all(this.workers.map(w => w.terminate())); fs.rmSync(this.dir, { recursive: true, force: true }); }
}
module.exports = { Cluster };
