#!/usr/bin/env node
/* Wahi 20 files (har ek 1 MB) do tareeke se:
     rep : 3 copies, 3 alag disks par
     ec  : Reed-Solomon 6 data + 4 parity = 10 chunks, 10 alag disks par
   Phir 2 / 4 / 5 disks maaro aur saari files wapas padh ke SHA-256 milao.   */
const crypto = require('crypto');
const { encode, decode } = require('../lib/rs');
const D = `http://${process.env.DISKS_HOST || 'localhost'}:4841`;
const K = 6, M = 4, FILES = 20, SIZE = 1 << 20;
const req = (method, p, body) => fetch(D + p, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }).then(async r => ({ status: r.status, body: await r.json() }));
const MB = b => (b / (1 << 20)).toFixed(1) + ' MB';

async function writeAll(files) {
  for (let f = 0; f < FILES; f++) {
    const data = files[f];
    for (let c = 0; c < 3; c++) await req('PUT', `/disk/${(f + c) % 10}/rep-${f}`, { b64: data.toString('base64') });
    const e = encode(data, K, M);
    for (let i = 0; i < K + M; i++) await req('PUT', `/disk/${(f + i) % 10}/ec-${f}-${i}`, { b64: Buffer.from(e.chunks[i]).toString('base64') });
  }
}
async function readRep(f) {
  for (let c = 0; c < 3; c++) { const r = await req('GET', `/disk/${(f + c) % 10}/rep-${f}`); if (r.status === 200) return Buffer.from(r.body.b64, 'base64'); }
  return null;
}
async function readEc(f) {
  const chunks = [];
  for (let i = 0; i < K + M; i++) { if (chunks.filter(Boolean).length === K) { chunks.push(null); continue; }   // K mil gaye → baaki mat padho
    const r = await req('GET', `/disk/${(f + i) % 10}/ec-${f}-${i}`); chunks.push(r.status === 200 ? new Uint8Array(Buffer.from(r.body.b64, 'base64')) : null); }
  try { return Buffer.from(decode(chunks, K, M, SIZE)); } catch (e) { return null; }
}

(async () => {
  await req('POST', '/reset');
  const files = Array.from({ length: FILES }, () => crypto.randomBytes(SIZE));
  const sums = files.map(f => crypto.createHash('sha256').update(f).digest('hex'));
  await writeAll(files);
  const repUsed = (await req('GET', '/stats?prefix=rep-')).body.used, ecUsed = (await req('GET', '/stats?prefix=ec-')).body.used;
  const logical = FILES * SIZE;
  console.log(`${FILES} files × 1 MB = ${MB(logical)} asli data`);
  console.log(`  disk par — 3× replication: ${MB(repUsed)} (${(repUsed / logical).toFixed(2)}×)   |   6+4 erasure coding: ${MB(ecUsed)} (${(ecUsed / logical).toFixed(2)}×)`);
  console.log(`\ndisks mare | 3× replication: files bachi | 6+4 erasure coding: files bachi`);
  for (const kill of [[3], [3, 4], [2, 3, 4, 5], [1, 2, 3, 4, 5]]) {
    await req('POST', '/heal');
    for (const n of kill) await req('POST', `/disk/${n}/down`);
    let rep = 0, ec = 0;
    for (let f = 0; f < FILES; f++) {
      const a = await readRep(f); if (a && crypto.createHash('sha256').update(a).digest('hex') === sums[f]) rep++;
      const b = await readEc(f); if (b && crypto.createHash('sha256').update(b).digest('hex') === sums[f]) ec++;
    }
    console.log(`${String(kill.length).padStart(10)} | ${String(rep).padStart(2)}/${FILES}${' '.repeat(22)} | ${String(ec).padStart(2)}/${FILES}`);
  }
  // REPAIR: disk 3 hamesha ke liye gayi (wipe) — naya disk bharne ke liye kitna padhna pada?
  await req('POST', '/heal'); await req('POST', '/disk/3/wipe'); await req('POST', '/stats/zero');
  let repRead = 0, ecRead = 0;
  for (let f = 0; f < FILES; f++) {
    for (let c = 0; c < 3; c++) if ((f + c) % 10 === 3) { const a = await readRep(f); repRead += a.length; }
    for (let i = 0; i < K + M; i++) if ((f + i) % 10 === 3) {
      const chunks = []; let got = 0;
      for (let j = 0; j < K + M; j++) { if (j === i || got === K) { chunks.push(null); continue; } const r = await req('GET', `/disk/${(f + j) % 10}/ec-${f}-${j}`); const c = r.status === 200 ? new Uint8Array(Buffer.from(r.body.b64, 'base64')) : null; if (c) { got++; ecRead += c.length; } chunks.push(c); }
    }
  }
  console.log(`\nek disk hamesha ke liye gayi — naya disk bharne ke liye network se padhna pada:`);
  console.log(`  3× replication: ${MB(repRead)}   |   6+4 erasure coding: ${MB(ecRead)}  (har khoye chunk ke liye 6 chunks padho)`);
})().catch(e => { console.error('disks chal rahe hain? npm start ex1-erasure —', e.message); process.exit(1); });
