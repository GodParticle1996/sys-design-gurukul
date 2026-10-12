/* Store and forward: server message tab tak rakhta hai jab tak deliver na ho — phir bhool jaata hai.
   Riya chat1 par, Aman chat2 par. Aman ka phone band hota hai, phir chat1 par wapas aata hai.
   node tools/offline.js */
const net = require('net');
const onLines = require('../lib/line');
const { get, sleep, host } = require('../lib/util');
const REG = `http://${host('registry')}:5013`;
function phone(user, server, port) {
  const s = net.connect(port, host(server)); s.setNoDelay(true); s.inbox = []; s.acks = [];
  onLines(s, l => { if (l.startsWith('MSG')) s.inbox.push(l.slice(4)); else s.acks.push(l); });
  s.write(`HELLO ${user}\n`); return s;
}
const reg = () => get(REG + '/stats');
(async () => {
  let riya = phone('riya', 'chat1', 5011), aman = phone('aman', 'chat2', 5012);
  await sleep(300);
  for (let i = 1; i <= 3; i++) riya.write(`SEND aman live message ${i}\n`);
  await sleep(300);
  console.log(`1) Dono online (alag servers): Aman ko mile ${aman.inbox.length}: ${JSON.stringify(aman.inbox)}`);
  console.log(`   Riya ko ACKs: ${JSON.stringify(riya.acks.slice(-3))}   registry mein stored: ${(await reg()).storedNow}`);
  aman.destroy(); await sleep(300);
  for (let i = 1; i <= 5; i++) riya.write(`SEND aman offline message ${i}\n`);
  await sleep(300);
  const r1 = await reg();
  console.log(`\n2) Aman ka phone band. Riya ne 5 bheje → ACKs ${JSON.stringify(riya.acks.slice(-2))}…   registry mein stored: ${r1.storedNow}`);
  aman = phone('aman', 'chat1', 5011);                                // is baar DUSRE server se juda
  await sleep(400);
  const r2 = await reg();
  console.log(`\n3) Aman wapas (is baar chat1 par): READY ke saath mile ${aman.inbox.length}: ${JSON.stringify(aman.inbox)}`);
  console.log(`   registry mein ab stored: ${r2.storedNow}   (kabhi ${r2.everStored} store hue, ${r2.drained} deliver hoke mitaaye)`);
  console.log('\nServer ek dakiya hai, library nahi: message tab tak jab tak phone tak na pahunche — phir server se gayab.');
  console.log('History phone par rehti hai. Isi liye WhatsApp ke server itne chhote (aur sasta) reh sake.');
  riya.destroy(); aman.destroy(); process.exit(0);
})();
