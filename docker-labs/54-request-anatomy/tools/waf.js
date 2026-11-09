'use strict';
// ex5-waf: REAL CPU. A toy WAF scans each request body with N regex rules. Clean bodies (no rule matches) are the
// expensive case: every rule reads every byte. Time = median of 5 after one untimed run; elapsed/CPU in ms.
const { rules, scan } = require('../lib/waf');
const { rng } = require('../lib/dns');

const rand = rng(54);
const order = () => JSON.stringify({ id: 1000 + Math.floor(rand() * 9000), city: 'Pune', items: ['masala dosa', 'chai'], note: 'jaldi bhejo' });
const jsonOf = bytes => {                     // complete orders, then one padded note to hit the exact size; valid JSON
  const list = [];
  while (JSON.stringify(list).length + 120 < bytes) list.push(JSON.parse(order()));
  const pad = { id: 1, city: 'Pune', items: ['chai'], note: '' };
  list.push(pad);
  pad.note = 'x'.repeat(bytes - JSON.stringify(list).length);
  const out = JSON.stringify(list);
  if (out.length !== bytes || !Array.isArray(JSON.parse(out))) throw new Error('JSON body build failed');
  return out;
};
const b64Of = bytes => Buffer.from(Array.from({ length: Math.ceil(bytes * 3 / 4) }, () => Math.floor(rand() * 256))).toString('base64').slice(0, bytes);
const bodies = [['1 KB JSON order', jsonOf(1024)], ['100 KB JSON', jsonOf(100 * 1024)], ['1 MB image upload (base64)', b64Of(1024 * 1024)]];

function time(fn) {
  fn();
  const wall = [], cpu = [];
  for (let i = 0; i < 5; i++) {
    const c0 = process.cpuUsage(), t0 = process.hrtime.bigint();
    fn();
    wall.push(Number(process.hrtime.bigint() - t0) / 1e6);
    const c = process.cpuUsage(c0); cpu.push((c.user + c.system) / 1000);
  }
  const med = xs => xs.sort((a, b) => a - b)[2];
  return `${med(wall).toFixed(2)}/${med(cpu).toFixed(1)}`;
}

console.log(`REAL RUN: Node ${process.version}; one request body scanned by N regex rules on one thread; elapsed/CPU ms per request`);
console.log('bodies are clean (no rule matches), so every rule reads every byte; timings change run to run');
console.log('');
const counts = [20, 100, 500, 2000];
console.log('body                           ' + counts.map(n => `${n} rules`.padStart(14)).join(''));
for (const [label, body] of bodies) {
  const row = counts.map(n => { const rs = rules(n); if (scan(rs, body) !== -1) throw new Error('clean body matched'); return time(() => scan(rs, body)).padStart(14); });
  console.log(label.padEnd(30) + ' ' + row.join(''));
}
console.log('');
const attack = '{"q":"1 UNION SELECT password FROM users"}';
console.log(`attack body ${attack} → caught by rule #${scan(rules(2000), attack) + 1} (first match stops the scan)`);
const rs = rules(2000);
console.log(`1 MB upload with only the ${20} base rules on its URL and headers (body skipped): ${time(() => scan(rs.slice(0, 20), '/upload?name=photo.jpg content-type: image/jpeg'))} ms`);
