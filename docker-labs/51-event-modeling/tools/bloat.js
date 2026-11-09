/* ex3-bloat: 10,000 orders. Har order ke events: OrderPlaced (order team), PaymentCaptured (payment team),
   OrderShipped + OrderDelivered (shipping team). Naya subscriber "loyalty": har ₹100 par 1 point — loyalty ko
   PaymentCaptured par customerId chahiye, par sirf OrderPlaced mein customerId hai. Envelope CloudEvents jaisa.
   modes: addfield-sab (video ka bura example: OrderPlaced ke baad ke teeno events ke data mein customerId) |
          addfield (sirf PaymentCaptured ke data mein) | metadata (sirf PaymentCaptured ke envelope mein extension
          attribute customerid) | readmodel (loyalty OrderPlaced se apni orderId → customerId copy banata hai).
   Payment aur order alag topics se aate hain: OrderPlaced 0–30 ms der se, payment 25–35 ms par (seeded) — kuch payments apne
   OrderPlaced se pehle pahunchte hain. */
const N = 10000;
function rng(seed) { return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function events(mode) {
  const out = [], r = rng(51);
  for (let i = 1; i <= N; i++) {
    const order = `o${i}`, customer = `c${1 + (i % 2500)}`, total = 200 + Math.floor(r() * 4800), t0 = i * 10;
    const all = mode === 'addfield-sab' ? { customerId: customer } : {};                 // shipping events mein bhi
    const add = mode === 'addfield' || mode === 'addfield-sab' ? { customerId: customer } : {};
    const ext = mode === 'metadata' ? { customerid: customer } : {};
    const ev = (type, source, at, data, x = {}) => ({ specversion: '1.0', id: `${order}-${type}`, source, type, time: at, ...x, data });
    out.push({ at: t0 + Math.floor(r() * 30), e: ev('OrderPlaced', '/orders', t0, { orderId: order, customerId: customer, items: 3, total }, {}) });
    out.push({ at: t0 + 25 + Math.floor(r() * 10), e: ev('PaymentCaptured', '/payments', t0 + 25, { orderId: order, amount: total, method: 'upi', ...add }, ext) });
    out.push({ at: t0 + 500, e: ev('OrderShipped', '/shipping', t0 + 500, { orderId: order, carrier: 'BlueDart', ...all }) });
    out.push({ at: t0 + 900, e: ev('OrderDelivered', '/shipping', t0 + 900, { orderId: order, ...all }) });
  }
  return out.sort((a, b) => a.at - b.at || 0).map(x => x.e);   // loyalty ko aane ka kram
}
function loyalty(stream, mode, park) {
  const owner = new Map(), points = new Map(), parked = [];
  let parkedCount = 0, lost = 0;
  const credit = (c, amount) => points.set(c, (points.get(c) || 0) + Math.floor(amount / 100));
  for (const e of stream) {
    if (e.type === 'OrderPlaced') {
      owner.set(e.data.orderId, e.data.customerId);
      for (let i = parked.length - 1; i >= 0; i--) if (parked[i].data.orderId === e.data.orderId) { credit(e.data.customerId, parked[i].data.amount); parked.splice(i, 1); }
    }
    if (e.type !== 'PaymentCaptured') continue;
    const c = mode.startsWith('addfield') ? e.data.customerId : mode === 'metadata' ? e.customerid : owner.get(e.data.orderId);
    if (c) credit(c, e.data.amount);
    else if (park) { parked.push(e); parkedCount++; }
    else lost++;
  }
  return { points, parkedCount, lost, stillParked: parked.length };
}
const truth = loyalty(events('addfield'), 'addfield', false).points;
const total = [...truth.values()].reduce((a, b) => a + b, 0);
const bytes = mode => events(mode).reduce((a, e) => a + Buffer.byteLength(JSON.stringify(e)), 0);
const base = bytes('none');
function changes(mode) {                         // baseline se kaunse event types ka data ya envelope badla, aur kis team (source) ka
  const shape = e => ({ data: Object.keys(e.data).join(), env: Object.keys(e).filter(k => k !== 'data').join() });
  const first = list => Object.fromEntries(list.filter(e => e.id.startsWith('o1-')).map(e => [e.type, e]));
  const a = first(events('none')), b = first(events(mode));
  const types = Object.keys(a).filter(t => JSON.stringify(shape(a[t])) !== JSON.stringify(shape(b[t])));
  return { schemas: types.filter(t => shape(a[t]).data !== shape(b[t]).data).length, teams: new Set(types.map(t => a[t].source)).size };
}
const modes = process.argv.slice(2).length ? process.argv.slice(2) : ['addfield-sab', 'addfield', 'metadata', 'readmodel'];
console.log(`baseline     ${N.toLocaleString('en-IN')} orders, ${(4 * N).toLocaleString('en-IN')} events, ${(base / 1e6).toFixed(2)} MB · loyalty ke sahi points ${total.toLocaleString('en-IN')}`);
for (const m of modes) {
  const s = events(m), b = bytes(m), { schemas, teams } = changes(m);
  const ok = r => [...truth].every(([c, p]) => r.points.get(c) === p);
  if (m !== 'readmodel') { const r = loyalty(s, m, false); console.log(`${m.padEnd(12)} payload-schemas-badle=${schemas} producer-teams-badli=${teams} bytes=+${((b - base) / 1e3).toFixed(0)} KB points-sahi=${ok(r) ? 'haan' : 'nahi'}`); continue; }
  const naive = loyalty(s, m, false), parked = loyalty(s, m, true);
  console.log(`${m.padEnd(12)} payload-schemas-badle=${schemas} producer-teams-badli=${teams} bytes=+${((b - base) / 1e3).toFixed(0)} KB · OrderPlaced se pehle aaye payments=${parked.parkedCount}` +
    ` · bina parking: ${naive.lost} payments ke points gaye · parking ke saath: points-sahi=${ok(parked) && !parked.stillParked ? 'haan' : 'nahi'}`);
}
