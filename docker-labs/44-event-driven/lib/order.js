/* Dono flows services/orders.js aur slowmo.js chalate hain.
   save + publish ek transaction NAHI hain. */
async function direct(order, io) {
  await io.save(order);
  await io.kitchen(order);
  await io.notify(order);
  return { status: 'completed' };
}

async function viaEvent(order, io) {
  await io.save(order);
  await io.publish({
    id: `order-${order.id}`,
    type: 'OrderPlaced',
    data: order,
  });
  return { status: 'accepted' };
}
module.exports = { direct, viaEvent };
