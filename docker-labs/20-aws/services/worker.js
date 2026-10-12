/* Ek worker process. Normal request → jawab. "Poison" request (ek khaas customer ki kharab request) → process CRASH.
   (Asli zindagi: kisi parser bug ko trigger karne wali request — jo bhi worker use chhuye, mar jaaye.) */
const http = require('http');
const PORT = +process.env.PORT;
http.createServer((req, res) => {
  if (req.url.includes('poison=1')) { console.log(`[worker :${PORT}] 💀 poison request — crash`); process.exit(1); }
  res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true, worker: PORT }));
}).listen(PORT, '0.0.0.0');
