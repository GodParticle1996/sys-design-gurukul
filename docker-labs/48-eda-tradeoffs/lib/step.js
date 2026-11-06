/* Ek kadam (payment, stock, confirm). Dono raaste wahi kaam karte hain:
   direct: agla kadam HTTP par bulao aur jawab ka intezaar karo.
   events: kaam ke baad agle topic par khabar daalo. */
const { call, sleep } = require('./http');
function createStep({ name, workMs, failItem, next }) {
  async function work(order) {
    await sleep(workMs);
    if (order.item === failItem) throw Error(`${name}: ${order.item} khatam`);
  }
  return {
    async direct(order) {
      await work(order);
      const rest = next ? await call(next, '/do', order) : { steps: [] };
      return { status: 'confirmed', steps: [name, ...rest.steps] };
    },
    async onEvent(event, publish, failEvents) {
      try {
        await work(event.data);
      } catch (e) {
        if (failEvents) await publish('failed', { type: 'OrderFailed', reason: e.message });
        return { ok: false, reason: e.message };
      }
      await publish(null, { type: `${name}Done` });
      return { ok: true };
    },
  };
}
module.exports = { createStep };
