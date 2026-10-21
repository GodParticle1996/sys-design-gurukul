const { sequential, batched } = require('../lib/lookups');
const { sleep } = require('../lib/util');
const mode = process.argv.includes('--batch') ? 'batch' : 'sequential';
const fast = process.argv.includes('--fast') || process.argv.includes('--json');
const keys = ['dish-1','dish-2','dish-3','dish-4'];
let ms=0, calls=0, ready=0;
const trace=[];
function mark(text, phase) {
  const row={ms,text,phase,calls,ready}; trace.push(row);
  if (!process.argv.includes('--json')) {
    console.log(`${ms} ms | ${text} | calls=${calls} ready=${ready}/4`);
  }
}
async function read(part) {
  calls++;
  mark('bheje: '+part.join(', '), 'send');
  if (!fast) await sleep(400);
  ms+=40; ready+=part.length;
  mark('mile: '+part.join(', '), 'reply');
  return part.map(key => ({key}));
}
(async () => {
  mark('MODEL: har request ka fixed wait 40 ms; '+mode, 'start');
  if (mode==='batch') await batched(keys, read, 4);
  else await sequential(keys, async key => (await read([key]))[0]);
  mark('Asha ka menu tayyar', 'done');
  if (process.argv.includes('--json')) console.log(JSON.stringify(trace,null,2));
})().catch(e => { console.error(e); process.exitCode=1; });
