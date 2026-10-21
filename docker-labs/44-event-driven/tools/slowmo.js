const { createBus } = require('../lib/bus');
const { direct, viaEvent } = require('../lib/order');
const { sleep } = require('../lib/http');
const modeArg = process.argv.indexOf('--mode');
const mode = process.argv.find(a => a.startsWith('--mode='))?.split('=')[1]
  || (modeArg >= 0 ? process.argv[modeArg + 1] : 'events');
if (!['direct','events'].includes(mode)) throw Error('--mode direct|events chahiye');
const fast = process.argv.includes('--fast') || process.argv.includes('--json');
let t = 0, saved = 0, kitchen = 0, notify = 0, response = 'intezaar';
const bus = createBus(['kitchen','notify']);
const trace = [];
function mark(text, focus) {
  const row = { ms: t, text, focus, saved, kitchen, notify, response,
    kitchenPending: bus.pending('kitchen'), notifyPending: bus.pending('notify') };
  trace.push(row);
  if (!process.argv.includes('--json')) console.log(`${(t/1000).toFixed(2)} s  ${text} | saved=${saved} kitchen=${kitchen} notify=${notify} pending=${row.kitchenPending}/${row.notifyPending} HTTP=${response}`);
}
async function wait(ms) { if (!fast) await sleep(ms); t += ms; }
(async () => {
  mark('Asha ne order #1 bheja', 'app');
  const io = {
    save: async () => { saved++; mark('Order #1 save hua', 'db'); },
    kitchen: async () => { await wait(100); kitchen++; mark('Kitchen ne #1 liya', 'kitchen'); },
    notify: async () => { await wait(1000); throw Error('notify band'); },
    publish: async event => { await wait(10); bus.publish(event); mark('OrderPlaced ki do copies line mein', 'bus'); },
  };
  if (mode === 'direct') {
    try { await direct({id:1,item:'thali'}, io); response='200'; }
    catch (_) { mark('Notify ka jawab fail', 'notify'); response='503'; }
    mark('Asha ko jawab: order save tha, par HTTP fail', 'app');
  } else {
    await viaEvent({id:1,item:'thali'}, io); response='202';
    mark('Asha ko accepted mila; kitchen/notify abhi baaki', 'app');
    await wait(10); const k=bus.read('kitchen'); mark('Kitchen ne apni copy padhi; entry abhi line mein', 'kitchen');
    await wait(100); kitchen++; bus.ack('kitchen',k.id); mark('Kitchen ka kaam + ack; sirf kitchen ki copy hati', 'kitchen');
    mark('Notify band hai; notify ki copy line mein ruki', 'notify');
    await wait(1380); const n=bus.read('notify'); mark('Notify wapas; purani copy padhi', 'notify');
    await wait(100); notify++; bus.ack('notify',n.id); mark('Notify ka kaam + ack; notify ki copy bhi hati', 'notify');
  }
  if (process.argv.includes('--json')) console.log(JSON.stringify(trace,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
