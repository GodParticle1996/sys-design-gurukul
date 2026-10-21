const { createBus } = require('../lib/bus');
const { viaEvent } = require('../lib/order');
const bus = createBus(['kitchen', 'notify']);
const orders = [];

(async () => {
  const answer = await viaEvent({ id: 1, item: 'thali' }, {
    save: async order => orders.push(order),
    publish: async event => bus.publish(event),
  });
  console.log('API:', answer.status);
  console.log('notify pending:', bus.pending('notify'));

  const event = bus.read('kitchen');
  console.log('kitchen:', event.type, event.data.id);
  bus.ack('kitchen', event.id);
  console.log('kitchen pending:', bus.pending('kitchen'));
  console.log('notify pending:', bus.pending('notify'));
})().catch(e => { console.error(e); process.exitCode = 1; });
