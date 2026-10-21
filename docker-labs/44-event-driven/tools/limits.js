const { createBus } = require('../lib/bus');
const { viaEvent } = require('../lib/order');
const event = id => ({id:'order-'+id,type:'OrderPlaced',data:{id}});
(async () => {
  let bus=createBus(['kitchen','notify']);
  bus.publish(event(1));
  bus.ack('kitchen',bus.read('kitchen').id);
  console.log(`fanout: kitchen pending ${bus.pending('kitchen')} · notify pending ${bus.pending('notify')}`);
  let sent=0;
  for(let i=0;i<2;i++){const e=bus.read('notify');if(e)sent++;}
  bus.ack('notify','order-1');
  console.log(`kaam ke baad ack na pahunche: same id do baar padha · SMS ${sent}`);
  bus=createBus(['notify']);bus.publish(event(1));
  const seen=new Set();sent=0;
  for(let i=0;i<2;i++){const e=bus.read('notify');if(!seen.has(e.id)){sent++;seen.add(e.id);}}
  bus.ack('notify','order-1');
  console.log(`id yaad rakhi (isi process mein): SMS ${sent}`);
  bus=createBus(['kitchen','notify']);
  for(let id=1;id<=4;id++)bus.publish(event(id));
  const before=bus.pending('kitchen')+bus.pending('notify');
  bus=createBus(['kitchen','notify']);
  console.log(`broker ki RAM dobara bani: pending copies ${before} → ${bus.pending('kitchen')+bus.pending('notify')} · chaar events ki dono copies gayi`);
  bus=createBus(['kitchen','notify'],2);let saved=0, failed=0;
  for(let id=1;id<=3;id++){
    try{await viaEvent({id},{save:async()=>saved++,publish:async e=>bus.publish(e)});}
    catch(_){failed++;}
  }
  console.log(`cap 2: saved ${saved} · kitchen pending ${bus.pending('kitchen')} · notify pending ${bus.pending('notify')} · publish fail ${failed}`);
  console.log('save + publish ek transaction nahi: order #3 save hua, event nahi gaya');
})().catch(e=>{console.error(e);process.exitCode=1;});
