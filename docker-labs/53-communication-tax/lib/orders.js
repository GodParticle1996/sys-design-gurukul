'use strict';
// Seeded KhanaKart orders: same seed → same orders, every run.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const CITIES = ['Bengaluru', 'Mumbai', 'Pune', 'Delhi', 'Kolkata', 'Hyderabad', 'Chennai', 'Jaipur'];
const DISHES = ['masala dosa', 'paneer tikka', 'veg biryani', 'chole bhature', 'idli sambar', 'dal makhani', 'butter naan', 'gulab jamun', 'filter coffee', 'pav bhaji'];

function makeOrders(seed, n) {
  const rand = rng(seed);
  const pick = list => list[Math.floor(rand() * list.length)];
  return Array.from({ length: n }, (_, i) => ({
    id: 1000000 + i,
    userId: 1 + Math.floor(rand() * 500000),
    amountPaise: 5000 + Math.floor(rand() * 145000),
    city: pick(CITIES),
    items: Array.from({ length: 1 + Math.floor(rand() * 4) }, () => pick(DISHES)),
    paid: rand() < 0.9,
  }));
}
module.exports = { rng, makeOrders };
