/* "Sentry" — gVisor ke sentry ka chhota khilona. Untrusted code (tools/workload.js --mode sentry) har file operation
   seedha OS se nahi karta: ek message is process ko bhejta hai (ek khuli TCP connection, ek line = ek "syscall"),
   sentry check karta hai (path sirf data/ ke andar, operation allowlist mein) aur khud karta hai.
   Asli gVisor Linux ke syscalls isi tarah pakadta hai (seccomp / KVM) — hamara khilona usse dheema hai,
   par PATTERN wahi: kharcha sirf un kaamon par jo OS ko pukarte hain. */
const fs = require('fs');
const net = require('net');
const path = require('path');
const PORT = +process.env.PORT || 4811;
const ROOT = path.resolve(__dirname, '..', 'data');
const ALLOW = new Set(['write', 'read', 'unlink']);
let calls = 0, denied = 0;

function handle(b) {
  calls++;
  const full = path.resolve(ROOT, String(b.path || ''));
  if (!ALLOW.has(b.op) || !full.startsWith(ROOT + path.sep)) { denied++; return { err: 'EPERM' }; }
  try {
    if (b.op === 'write') { fs.writeFileSync(full, b.data || ''); return { ok: 1 }; }
    if (b.op === 'read') return { data: fs.readFileSync(full, 'utf8') };
    if (b.op === 'unlink') { fs.unlinkSync(full); return { ok: 1 }; }
  } catch (e) { return { err: e.code || 'EIO' }; }
}

net.createServer(sock => {
  sock.setNoDelay(true);
  let buf = '';
  sock.on('data', d => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      let reply;
      try { reply = handle(JSON.parse(line)); } catch (e) { reply = { err: 'EINVAL' }; }
      sock.write(JSON.stringify(reply) + '\n');
    }
  });
  sock.on('error', () => {});
}).listen(PORT, () => console.log(`sentry → tcp://localhost:${PORT}  (sirf data/ ke andar write/read/unlink)`));
process.on('SIGTERM', () => { console.log(`sentry: ${calls} calls, ${denied} denied`); process.exit(0); });
