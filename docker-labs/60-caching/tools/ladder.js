'use strict';
// ex0: memory ladder on THIS machine — pointer chasing, page cache, O_DIRECT disk read, fsync, loopback TCP.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), net = require('node:net');
const { measure, sweep } = require('../lib/ladder');
const { human } = require('../lib/human');
const { percentile } = require('../lib/stats');

const mhz = Number((fs.readFileSync('/proc/cpuinfo', 'utf8').match(/cpu MHz\s*:\s*([\d.]+)/) || [])[1]) || 3000;
const ghz = mhz / 1000;
const rows = [];
const row = (kind, name, ns) => rows.push({ kind, name, ns });

console.log(`CPU: ${(os.cpus()[0] || {}).model || '?'} — ${ghz.toFixed(2)} GHz (/proc/cpuinfo), 1 cycle = ${(1 / ghz).toFixed(2)} ns\n`);
console.log('A. Pointer chasing: har hop ek random 64-byte line se agla pata padhta hai (CPU andaza nahi laga sakta).\n');
console.log('data ka size     ns / hop');
const curve = [[16, 2e7], [32, 2e7], [256, 2e7], [1024, 2e7], [4096, 1e7], [8192, 5e6], [65536, 4e6], [262144, 4e6]];
const got = {};
for (const [kb, hops] of curve) {
  const ns = measure(kb * 1024, hops); got[kb] = ns;
  console.log(`${(kb >= 1024 ? kb / 1024 + ' MB' : kb + ' KB').padEnd(14)} ${ns.toFixed(1).padStart(8)}`);
}
row('ASLI', 'L1 (32 KB data)', got[32]); row('ASLI', 'L2 (1 MB data)', got[1024]); row('ASLI', 'L3 (4 MB data)', got[4096]);
row('ASLI', 'RAM (256 MB data, TLB miss samet)', got[262144]);

console.log('\nB. Spatial locality: wahi 3.2 crore ints (128 MB), ek baar seedhe kram mein, ek baar random kram mein.');
const seq = sweep(1 << 25, false), rnd = sweep(1 << 25, true);
console.log(`seedha kram: ${seq.toFixed(2)} ns / int     random kram: ${rnd.toFixed(2)} ns / int     → ${(rnd / seq).toFixed(0)}× farq`);
console.log('Seedhe kram mein ek 64-byte line 16 ints laati hai aur CPU agli lines pehle se mangwa leta hai (prefetch).');

// C. Disk and network, real
const f = path.join(os.tmpdir(), 'lab60-ladder.bin'), MB = 256;
{
  const b = Buffer.alloc(1 << 20, 7), fd = fs.openSync(f, 'w');
  for (let i = 0; i < MB; i++) fs.writeSync(fd, b);
  fs.fsyncSync(fd); fs.closeSync(fd);
}
const buf = Buffer.allocUnsafeSlow(8192);
const fdc = fs.openSync(f, 'r'), pc = [];
for (let i = 0; i < 64; i++) fs.readSync(fdc, buf, 0, 4096, i * 4096);
for (let i = 0; i < 4000; i++) { const t = process.hrtime.bigint(); fs.readSync(fdc, buf, 0, 4096, (i % 64) * 4096); pc.push(Number(process.hrtime.bigint() - t)); }
row('ASLI', '4 KB read, OS page cache se (RAM)', percentile(pc, 50));
let direct = null;
try {
  const fdd = fs.openSync(f, fs.constants.O_RDONLY | fs.constants.O_DIRECT), d = [];
  let x = 12345;
  for (let i = 0; i < 400; i++) { x = (x * 1103515245 + 12345) >>> 0; const t = process.hrtime.bigint(); fs.readSync(fdd, buf, 0, 4096, (x % (MB * 256)) * 4096); d.push(Number(process.hrtime.bigint() - t)); }
  direct = percentile(d, 50); fs.closeSync(fdd);
  row('ASLI', '4 KB random read, disk se (O_DIRECT)', direct);
} catch (e) { console.log(`\n(O_DIRECT nahi chala: ${e.code}; disk read ki row chhod di)`); }
fs.closeSync(fdc); fs.unlinkSync(f); // 256 MB test file temp folder mein nahi chhodte
const w = path.join(os.tmpdir(), 'lab60-fsync.bin'), fdw = fs.openSync(w, 'w'), fsy = [], e = Buffer.alloc(128, 1);
for (let i = 0; i < 200; i++) { fs.writeSync(fdw, e); const t = process.hrtime.bigint(); fs.fsyncSync(fdw); fsy.push(Number(process.hrtime.bigint() - t)); }
fs.closeSync(fdw); fs.unlinkSync(w);
row('ASLI', 'write + fsync (disk tak pakka)', percentile(fsy, 50));

const srv = net.createServer(s => s.on('data', d => s.write(d)));
srv.listen(0, '127.0.0.1', () => {
  const c = net.connect(srv.address().port, '127.0.0.1');
  c.setNoDelay(true);
  const rtt = []; let n = 0, t;
  const ping = () => { t = process.hrtime.bigint(); c.write('x'); };
  c.on('data', () => { rtt.push(Number(process.hrtime.bigint() - t)); if (++n < 2000) ping(); else done(); });
  c.on('connect', ping);
  function done() {
    c.destroy(); srv.close();
    row('ASLI', 'TCP round trip, isi machine par (loopback)', percentile(rtt.slice(200), 50));
    row('MODEL', 'round trip doosre region tak (video: 150 ms)', 150e6);
    console.log(`\nC. Ladder, "1 cycle = 1 second" scale par (${ghz.toFixed(2)} GHz). ASLI = is machine par naapa, MODEL = maana hua.\n`);
    console.log('                                                  asli samay     cycles          agar 1 cycle = 1 s');
    for (const r of rows) {
      const t = r.ns < 1e3 ? `${r.ns.toFixed(1)} ns` : r.ns < 1e6 ? `${(r.ns / 1e3).toFixed(1)} µs` : `${(r.ns / 1e6).toFixed(1)} ms`;
      console.log(`${r.kind.padEnd(6)} ${r.name.padEnd(42)} ${t.padStart(10)}  ${Math.round(r.ns * ghz).toLocaleString('en-IN').padStart(13)}   ${human(r.ns, ghz)}`);
    }
    const l1 = rows[0].ns;
    console.log(`\nL1 se${direct ? ' disk read tak ' + Math.round(direct / l1).toLocaleString('en-IN') + '×,' : ''} fsync tak ${Math.round(rows.find(r => r.name.startsWith('write')).ns / l1).toLocaleString('en-IN')}×, doosre region tak ${Math.round(150e6 / l1).toLocaleString('en-IN')}×.`);
    console.log('Note: L1 ki row mein JS loop ka kaam bhi shaamil hai; RAM ki row mein TLB miss (page table walk) bhi. WSL ki disk ek virtual disk hai.');
  }
});
