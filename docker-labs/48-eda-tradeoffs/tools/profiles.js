/* Lab ke tay scenario (asli traffic ka measurement nahi). */
const sale = i => (i < 10 ? 60 : 10);              // pehle 10 s: 60 orders/s, phir 10/s
module.exports = {
  burst: { arrivals: sale, perWorker: 20, ticks: 60, tickMs: 1000, unit: 's' },
  sustained: { arrivals: () => 10000, perWorker: 200, ticks: 10, tickMs: 60000, unit: 'min' },
  offline: { arrivals: () => 20, perWorker: 50, ticks: 200, tickMs: 60000, unit: 'min', down: i => i < 90 },
};
