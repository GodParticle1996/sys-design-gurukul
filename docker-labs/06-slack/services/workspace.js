/* ex1 — workspace ka "core". Teen boot models:
   full   : poora snapshot (har user, har channel)
   lazy   : khaali boot; client har missing user ke liye alag /user call karta hai
   inject : khaali boot; events ke saath missing profiles "edge" pehle hi jod deta hai */
const { serve, burn } = require('../lib/util');
const PORT = +(process.env.PORT || 4601);
const USERS = +(process.env.USERS || 20000);
const BOOT = process.env.BOOT || 'full';

const users = [];
for (let i = 0; i < USERS; i++) users.push({ id: 'U' + i, name: 'user-' + i, title: 'Engineer ' + (i % 40), tz: 'Asia/Kolkata', avatar: 'https://cdn.example/a/' + i + '.png', status: i % 7 ? 'active' : 'away' });
const channels = Array.from({ length: Math.round(USERS / 20) }, (_, i) => ({ id: 'C' + i, name: 'chan-' + i, members: 20 }));
const fullSnapshot = JSON.stringify({ users, channels });
let coreRequests = 0, coreBytes = 0;

/* events: har client ko 30 recent messages milte hain, har ek kisi random user ko mention karta hai */
function events(inject) {
  const ev = [];
  for (let i = 0; i < 30; i++) {
    const u = users[Math.floor(Math.random() * USERS)];
    ev.push(inject ? { type: 'message', text: 'hi <@' + u.id + '>', mentions: [u] } : { type: 'message', text: 'hi <@' + u.id + '>', mentions: [u.id] });
  }
  return ev;
}

serve(PORT, {
  'GET /boot': (req, res) => {
    coreRequests++;
    burn(BOOT === 'full' ? 25 : 0.3);                          /* snapshot banana mehenga hai */
    const body = BOOT === 'full' ? fullSnapshot : JSON.stringify({ users: [], channels: channels.slice(0, 20) });
    coreBytes += body.length;
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(body);
  },
  'GET /events': (req, res) => {
    coreRequests++;
    const body = JSON.stringify({ events: events(BOOT === 'inject') });
    coreBytes += body.length;
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(body);
  },
  'GET /user/:id': (req, res, url, p) => { coreRequests++; const u = users[+p.id.slice(1)] || users[0]; coreBytes += 200; return u; },
  'GET /stats': () => ({ boot: BOOT, users: USERS, coreRequests, coreBytes }),
  'POST /reset': () => { coreRequests = 0; coreBytes = 0; return { ok: true }; },
}, () => console.log(`  workspace → http://localhost:${PORT}  (BOOT=${BOOT} · ${USERS.toLocaleString('en-IN')} users)`));
