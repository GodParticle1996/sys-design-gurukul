const { call } = require('./stack');
const { event, seed, bytes } = require('../lib/events');
const { withStack, reset, save, publish, drain, states, main } = require('./stack');
async function run() {
  return withStack(async ({ urls }) => {
    const results = [];
    for (const mode of ['thin', 'fat', 'delta']) {
      await reset(urls, mode);
      const eventBytes = [];
      for (let id = 42; id < 46; id++) {
        const sizes = [];
        for (const changes of [seed(id), { address: '99 Mango Lane' }, { phone: '+1-555-0199' }]) {
          const row = await save(urls, id, changes), payload = event(mode, row, changes);
          sizes.push(bytes(payload));
          await publish(urls, payload);
          await drain(urls); // Each consumer sees every version; no callback coalescing here.
        }
        eventBytes.push(sizes);
      }
      const consumers = await states(urls), all = Object.values(consumers);
      const publishedBytes = eventBytes.flat().reduce((a, b) => a + b, 0);
      results.push({ mode, orders: 4, consumers: 3, publishedEvents: 12, deliveredEvents: 36,
        eventBytesByOrderAndVersion: eventBytes, publishedBytes, fanoutBytes: publishedBytes * 3,
        reads: (await call(urls.orders, '/stats')).reads,
        consumersReceivingUnusedEventFields: all.filter(c => c.extraFields > 0).length,
        unusedEventFieldDeliveries: all.reduce((n, c) => n + c.extraFields, 0),
        consumersReceivingUnusedEventPhone: all.filter(c => c.phoneUnused > 0).length,
        unusedEventPhoneDeliveries: all.reduce((n, c) => n + c.phoneUnused, 0),
        kitchenUnusedEventPhoneDeliveries: consumers.kitchen.phoneUnused,
        unusedCallbackFieldDeliveries: all.reduce((n, c) => n + c.callbackExtraFields, 0),
        unusedCallbackPhoneDeliveries: all.reduce((n, c) => n + c.callbackPhoneUnused, 0),
        kitchenUnusedCallbackPhoneDeliveries: consumers.kitchen.callbackPhoneUnused,
        consumersReceivingUnusedFieldsViaEitherPath: all.filter(c => c.extraFields + c.callbackExtraFields > 0).length });
    }
    return results;
  });
}
if (require.main === module) main(run);
module.exports = { run };
