const { createOrders } = require('../lib/orders');
const { createBus } = require('../lib/bus');
const { createConsumer } = require('../lib/consumer');
const { event, seed, needs } = require('../lib/events');
async function trace(mode) {
  if (!['thin', 'fat'].includes(mode)) throw Error('mode must be thin or fat');
  const orders = createOrders(), bus = createBus(), rows = [];
  const workers = Object.fromEntries(Object.keys(needs).map(name => [name,
    createConsumer({ name, mode, load: async id => orders.read(id) })]));
  function record(atMs, action, observation) {
    rows.push({ atMs, action, reads: orders.stats().reads, pending: bus.state(),
      ...(observation ? { observation } : {}) });
  }
  const v1 = orders.save(42, seed());
  record(0, 'Owner saved #42 v1');
  bus.publish(event(mode, v1));
  record(10, `Published ${mode} v1; three queued copies`);
  const v2 = orders.save(42, { address: '99 Mango Lane', phone: '+1-555-0199', items: ['idli'] });
  record(20, 'Owner saved #42 v2 before consumers ran');
  bus.publish(event(mode, v2));
  record(30, `Published ${mode} v2; six queued copies`);
  for (const version of [1, 2]) {
    for (const [index, name] of Object.keys(needs).entries()) {
      const entry = bus.read(name);
      const result = await workers[name].accept(entry.event);
      bus.ack(name, entry.receipt);
      record(version * 100 + index * 10, `${name} completed event v${version} + ack`, result.observation);
    }
  }
  return { mode, clock: 'fixed; all delays artificial; shared lib model, no HTTP in this tool', rows };
}
async function cli() {
  const args = process.argv.slice(2), index = args.indexOf('--mode');
  const result = await trace(index < 0 ? 'thin' : args[index + 1]);
  if (args.includes('--json')) return console.log(JSON.stringify(result, null, 2));
  console.log(`mode=${result.mode} | ${result.clock}`);
  let previous = 0;
  for (const row of result.rows) {
    if (!args.includes('--fast')) await new Promise(r => setTimeout(r, row.atMs - previous));
    console.log(`${String(row.atMs).padStart(3)} ms | ${row.action} | reads=${row.reads}` +
      ` pending=${Object.values(row.pending).join('/')} | saw=${JSON.stringify(row.observation || null)}`);
    previous = row.atMs;
  }
}
if (require.main === module) cli().catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { trace };
