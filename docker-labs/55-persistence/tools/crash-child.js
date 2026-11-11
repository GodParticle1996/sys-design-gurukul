'use strict';
// Child for ex2: keep putting orders into the KV store and print "ack N" after each put returns.
const { KV } = require('../lib/kv');
const { RealDisk } = require('../lib/disk');
const [dir, sync] = process.argv.slice(2);
const kv = new KV(new RealDisk(dir), { sync });
kv.open();
let n = 0;
(function loop() {
  for (let i = 0; i < 50; i++) { n++; kv.put('order-' + n, n * 10); process.stdout.write('ack ' + n + '\n'); }
  setImmediate(loop);
})();
