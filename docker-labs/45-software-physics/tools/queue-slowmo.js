const { schedule, summarize } = require('../lib/queue');
const rows=schedule([0,50,100,150],100,1);
const events=rows.flatMap(r=>[
  {ms:r.at,kind:'aaya',id:r.id,priority:1},
  {ms:r.start,kind:'shuru',id:r.id,priority:2},
  {ms:r.end,kind:'poora',id:r.id,priority:0},
]).sort((a,b)=>a.ms-b.ms || a.priority-b.priority || a.id-b.id);
let waiting=[],active=[],done=0;
const trace=events.map(e=>{
  if(e.kind==='aaya') waiting.push(e.id);
  if(e.kind==='shuru') {
    waiting=waiting.filter(id=>id!==e.id); active.push(e.id);
  }
  if(e.kind==='poora') { active=active.filter(id=>id!==e.id); done++; }
  return {...e,waiting:waiting.slice(),active:active.slice(),done,
    inside:waiting.length+active.length};
});
if(process.argv.includes('--json')) console.log(JSON.stringify(trace,null,2));
else {
  console.log('MODEL: same queue.js schedule; equal clock par end, arrival, start');
  for(const r of trace) console.log(`${r.ms} ms #${r.id} ${r.kind}: wait=[${r.waiting}] active=[${r.active}] done=${r.done} inside=${r.inside}`);
  const s=summarize(rows);
  console.log(`poore window ka average=${s.meanL}; peak=${s.peak}; dono alag`);
}
