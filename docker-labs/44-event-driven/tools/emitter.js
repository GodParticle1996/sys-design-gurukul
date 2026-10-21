const { EventEmitter } = require('node:events');
const { setTimeout: sleep } = require('node:timers/promises');
const bus = new EventEmitter();
bus.on('OrderPlaced', () => console.log('listener chala'));
console.log('emit se pehle');
bus.emit('OrderPlaced');
console.log('emit ke baad');

const asyncBus = new EventEmitter();
asyncBus.on('OrderPlaced', async () => {
  console.log('async listener shuru');
  await sleep(20);
  console.log('async listener poora');
});
console.log('async emit se pehle');
asyncBus.emit('OrderPlaced');
console.log('async emit ke baad');
