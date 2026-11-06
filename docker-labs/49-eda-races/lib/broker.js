/* RAM broker, competing consumers. receive() ek message lease par deta hai;
   ack na aaye aur lease khatam ho toh message dobara milta hai (attempt badhta hai).
   keyed: true ho toh ek key ka ek hi message ek waqt par lease par; kaam lease se lamba chale toh purana worker phir bhi likh sakta hai. */
function createBroker({ leaseMs = 300, keyed = false } = {}) {
  const items = [];
  let nextId = 1;
  return {
    publish(body, key) {
      const id = `m${nextId++}`;
      items.push({ id, key, body, attempt: 0, until: 0 });
      return id;
    },
    receive(now) {
      const busy = new Set(items.filter(m => m.until > now).map(m => m.key));
      const m = items.find(x => x.until <= now && !(keyed && busy.has(x.key)));
      if (!m) return null;
      m.attempt++;
      m.until = now + leaseMs;
      return { id: m.id, key: m.key, body: m.body, attempt: m.attempt };
    },
    ack(id, attempt) {                                  // attempt bhi mile tabhi: lease ke baad naye worker ko di gayi delivery ka ack purana worker nahi kar sakta
      const i = items.findIndex(m => m.id === id && m.attempt === attempt);
      if (i >= 0) items.splice(i, 1);
      return i >= 0;
    },
    pending: () => items.length,
  };
}
module.exports = { createBroker };
