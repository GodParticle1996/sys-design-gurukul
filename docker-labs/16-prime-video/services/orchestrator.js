/* "Step Functions" — har state transition ek request. Account limit: LIMIT transitions / second (poore account ke liye).
   Lab mein 200/s (asli limit hazaaron mein hoti hai — hum scale chhota rakh rahe hain, pattern wahi).
   Limit se upar → 429 (throttled). Har transition ka bill ($25 per million). */
const http = require('http');
const PORT = +process.env.PORT || 4862, LIMIT = +(process.env.LIMIT || 200);
let windowStart = Date.now(), inWindow = 0; const st = { transitions: 0, throttled: 0 };
http.createServer((req, res) => {
  if (req.url === '/stats') return res.end(JSON.stringify(st));
  if (req.url === '/reset') { st.transitions = st.throttled = 0; return res.end('{}'); }
  const now = Date.now(); if (now - windowStart >= 1000) { windowStart = now; inWindow = 0; }
  if (inWindow >= LIMIT) { st.throttled++; res.writeHead(429); return res.end('{}'); }
  inWindow++; st.transitions++; res.end('{"ok":1}');
}).listen(PORT, () => console.log(`orchestrator → :${PORT}  (account limit ${LIMIT} transitions/s)`));
