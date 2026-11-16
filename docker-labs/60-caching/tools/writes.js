'use strict';
// ex2 (ASLI): write-through vs group commit vs write-back vs OS page cache — real fsync, real SIGKILL.
const fs = require('node:fs');
const { run } = require('../lib/writes');
const n = x => Math.round(x).toLocaleString('en-IN');
const sysctl = f => { try { return Number(fs.readFileSync(`/proc/sys/vm/${f}`, 'utf8')) / 100; } catch { return null; } };
(async () => {
  console.log('Ek chhota store (child process). 1.6 s chalao, phir SIGKILL (jaise process crash). Phir file padho: jin writes');
  console.log('ko "ho gaya" bola gaya tha, unmein se kitni sach mein file mein hain? (16-byte records, is machine ki disk)\n');
  const modes = [
    ['through', 1000, 'write-through: har write ka apna fsync, phir ack'],
    ['group', 1000, 'group commit: 256 pending writes, EK fsync, phir sabka ack'],
    ['back', 1000, 'write-back: memory se ack, har 1 s flush + fsync'],
    ['back', 100, 'write-back: memory se ack, har 100 ms flush + fsync'],
    ['os', 1000, 'OS page cache: write() karke ack, fsync kabhi nahi'],
  ];
  console.log('tareeka                                                       writes/sec   "ho gaya" bola   file mein   khoye');
  for (const [mode, flush, label] of modes) {
    const r = await run(mode, 1600, flush);
    const rate = mode === 'back' || mode === 'os' ? `${n(r.perSec)}*` : n(r.perSec);
    console.log(`${label.padEnd(60)} ${rate.padStart(10)}   ${n(r.acked).padStart(14)}   ${n(r.onDisk).padStart(9)}   ${n(r.lost).padStart(6)}`);
  }
  console.log('\n* write-back aur page cache ko 1,00,000 writes/sec diye gaye (memory se ack, isliye aur bhi le sakte the).');
  console.log('→ Write-through sabse dheema (har write = ek fsync). Group commit wahi pakkapan deta hai, ek fsync ko sau writes mein');
  console.log('  baant kar — par har write ko ek fsync jitna (~1 ms) rukna padta hai. Write-back tez, par flush se pehle crash = writes gayi.');
  const exp = sysctl('dirty_expire_centisecs'), wb = sysctl('dirty_writeback_centisecs');
  console.log(`→ OS page cache: process mara, par data kernel ke paas tha, isliye 0 khoye. Bijli jaaye ya kernel crash ho toh`);
  console.log(`  ${exp !== null ? `lagbhag ${exp} s` : 'kuch seconds'} tak ka data ja sakta hai (is machine par dirty_expire = ${exp ?? '?'} s, flusher har ${wb ?? '?'} s jaagta hai).`);
  console.log('  Process crash aur power loss alag khatre hain — "write-back" kahan hai (app ki memory ya kernel), wahi tay karta hai.');
})();
