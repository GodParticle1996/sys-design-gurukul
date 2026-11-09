/* ex1-granular: Ravi ghar badalta hai (Pune → Bengaluru) aur usi form mein email bhi. Baad mein do aur saves: naam, photo.
   Bus par profile ke events ke beech do orders pack hote hain (alag service ke events beech mein aate hain).
   Label service har OrderPacked par label chhaapta hai. Modes: field | generic | intent. --trace: har message ke baad haalat. */
const { toEvents, labelPrinter, verifier } = require('../lib/profile');
const OLD = { street: 'MG Road 12', city: 'Pune', pin: '411001' };
const NEW = { street: 'Lake View 5', city: 'Bengaluru', pin: '560001' };
function run(mode, trace) {
  const save1 = toEvents(mode, 'ravi', { ...NEW, email: 'ravi@new.in' });
  const packed = n => ({ type: 'OrderPacked', data: { order: `o${n}` } });
  const bus = [];                                  // pehle save ke messages ke beech orders aate hain
  save1.forEach((e, i) => { bus.push(e); if (i < 2) bus.push(packed(i + 1)); });
  if (save1.length < 3) for (let n = save1.length + 1; n <= 2; n++) bus.push(packed(n));
  bus.push(...toEvents(mode, 'ravi', { name: 'Ravi Kumar' }), ...toEvents(mode, 'ravi', { photo: 'ravi2.jpg' }));
  const lp = labelPrinter(OLD), vf = verifier(mode), lines = [];
  for (const e of bus) {
    lp.on(e); vf.on(e);
    if (trace) lines.push(`  ${e.type.padEnd(20)} ${JSON.stringify(e.data).slice(0, 60).padEnd(60)} | label-service: ${lp.addr.street}, ${lp.addr.city}, ${lp.addr.pin}`);
  }
  const mixed = lp.labels.filter(l => !(l.street === NEW.street && l.city === NEW.city && l.pin === NEW.pin) && !(l.street === OLD.street && l.city === OLD.city && l.pin === OLD.pin));
  return { mode, messages: bus.filter(e => e.type !== 'OrderPacked').length, labels: lp.labels, mixed, verifier: vf.st, lines };
}
const arg = process.argv.slice(2), trace = arg.includes('--trace'), modes = arg.filter(a => !a.startsWith('--'));
for (const m of modes.length ? modes : ['field', 'generic', 'intent']) {
  const r = run(m, trace);
  if (trace) { console.log(`mode=${m} | bus ka kram (OrderPacked = alag service ka event)`); r.lines.forEach(l => console.log(l)); }
  console.log(`${r.mode.padEnd(8)} profile-messages=${r.messages} mile-jule-labels=${r.mixed.length}/${r.labels.length}` +
    (r.mixed.length ? ' [' + r.mixed.map(l => `${l.order}: ${l.street}, ${l.city}, ${l.pin}`).join('; ') + ']' : '') +
    ` verifier-jaaga=${r.verifier.woke} (kaam ka ${r.verifier.useful})`);
}
