const needs = { delivery: 'address', notify: 'phone', kitchen: 'items' };
function event(mode, order, changes) {
  const envelope = { type: 'OrderChanged', id: order.id, version: order.version };
  if (mode === 'fat') envelope.state = structuredClone(order);
  if (mode === 'delta') envelope.changes = structuredClone(changes);
  return envelope;
}
function seed(id = 42) {
  return { id, address: '12 Neem Road', phone: '+1-555-0100', items: ['dal', 'roti'] };
}
const bytes = value => Buffer.byteLength(JSON.stringify(value), 'utf8');
module.exports = { needs, event, seed, bytes };
