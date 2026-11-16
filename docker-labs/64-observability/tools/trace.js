'use strict';
// ex1 — metric → trace → log, on four real HTTP services (127.0.0.1). The 300 ms db join is an injected sleep.
const { startMesh, runLoad, tree } = require('../lib/mesh');
const { percentile, mean } = require('../lib/stats');
const f = x => x.toFixed(1);

(async () => {
  console.log('ex1 — "waqt kahan gaya?" (asli HTTP, ek hi machine par; db ka 300 ms join ek daala hua sleep; product ki ghadi 50 ms peeche — maana hua)\n');
  const m = await startMesh(); await runLoad(m); m.close();
  const gw = m.spans.filter(s => s.service === 'gateway'), d = gw.map(s => s.durMs);
  console.log('1) Metric (gateway, 200 requests):');
  console.log(`   average ${f(mean(d))} ms · p50 ${f(percentile(d, 50))} ms · p99 ${f(percentile(d, 99))} ms · max ${f(Math.max(...d))} ms · 100 ms se upar: ${d.filter(x => x > 100).length}`);
  console.log('   → metric batata hai KI kuch dheema hai. Kahan dheema, metric nahi batata.\n');

  const slow = gw.reduce((a, b) => (b.durMs > a.durMs ? b : a));
  console.log(`2) Sabse dheema request ka trace (trace_id ${slow.trace.slice(0, 8)}…), parent span id se joda:`);
  for (const s of tree(m.spans, slow.trace)) console.log(`   ${'  '.repeat(s.depth)}${s.service.padEnd(8)} ${s.op.padEnd(10)} ${f(s.durMs).padStart(6)} ms`);
  console.log('   → waqt db mein gaya. Har span ki duration span wali machine ki ghadi se naapi, isliye ghadi ka farq duration nahi bigaadta.\n');

  const lines = m.logs.filter(l => l.trace_id === slow.trace).sort((a, b) => a.ts - b.ts);
  const t0 = m.logs.find(l => l.trace_id === slow.trace && l.service === 'gateway').ts;
  console.log('3) Sabse dheeme request ke trace_id wale logs, timestamp se sort (jaisa video kehta hai):');
  for (const l of lines) console.log(`   ${String(l.ts - t0).padStart(5)} ms  ${l.service.padEnd(8)} ${l.msg}`);
  console.log('   → "price dhoondh raha" gateway ke "request aaya" se PEHLE dikh raha hai: product ki ghadi 50 ms peeche hai.');
  console.log('     "price mila" bhi db ke "query khatam" se pehle — asambhav. trace_id se logs mil jaate hain, par alag machines\n     ke timestamps ka kram bharosemand nahi. Kaun kiske andar chala, parent span id batata hai.\n');

  const b = await startMesh({ dropHeaderAt: 'product' }); await runLoad(b); b.close();
  const bslow = b.spans.filter(s => s.service === 'gateway').reduce((a, c) => (c.durMs > a.durMs ? c : a));
  console.log('4) Ab product traceparent header aage nahi bhejta (ek bhooli hui line):');
  for (const s of tree(b.spans, bslow.trace)) console.log(`   ${'  '.repeat(s.depth)}${s.service.padEnd(8)} ${s.op.padEnd(10)} ${f(s.durMs).padStart(6)} ms`);
  const orphans = b.spans.filter(s => s.service === 'db' && s.parent === null).length;
  console.log(`   → product ke 300 ms ke andar kya hua, trace mein nahi. db ke ${orphans} spans apne alag, akele traces mein chale gaye.`);
  console.log('     Trace utna hi poora jitna har hop par header aage jaata hai. OpenTelemetry jaisi library header apne aap aage bhejti hai;\n     service mesh (jaise Istio) mein bhi app ko header aage bhejna padta hai.');
})();
