/* Dusra GPU — beech mein THROTTLED link (H800 jaisa: compute poora, chip-to-chip bandwidth kam).
   Yahan link ~LINK_MBPS MB/s (default 200). Har gradient chunk: [4-byte length][bytes] → poora aaya → "ACK\n". */
const net = require('net');
const PORT = +process.env.PORT || 5081, MBPS = +(process.env.LINK_MBPS || 200);
let total = 0;
net.createServer(sock => {
  let need = -1, got = 0, head = Buffer.alloc(0), busyUntil = 0;
  sock.on('data', d => {
    total += d.length;
    const now = Date.now();                                           // link ek pipe hai: pichhla data nikla nahi toh naya line mein
    busyUntil = Math.max(busyUntil, now) + d.length / (MBPS * 1048.576);
    if (busyUntil - now > 2) { sock.pause(); setTimeout(() => sock.resume(), busyUntil - now); }
    let off = 0;
    while (off < d.length) {
      if (need < 0) { const take = Math.min(4 - head.length, d.length - off); head = Buffer.concat([head, d.subarray(off, off + take)]); off += take; if (head.length === 4) { need = head.readUInt32BE(0); got = 0; head = Buffer.alloc(0); } continue; }
      const take = Math.min(need - got, d.length - off); got += take; off += take;
      if (got === need) { sock.write('ACK\n'); need = -1; }
    }
  });
  sock.on('error', () => {});
}).listen(PORT, () => console.log(`[peer-gpu] :${PORT} link ~${MBPS} MB/s`));
