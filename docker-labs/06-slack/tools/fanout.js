/* 'general' channel (300 members) par M messages. Kitne deliveries, kitne bekaar, kitni long-haul copies. */
const { get, post } = require('../lib/util');
const a = require('./args')();
const M = +(a.messages || 50);
const cs = 'http://localhost:' + (process.env.PORT || 4603);
const edge = 'http://localhost:' + (process.env.EDGE_PORT || 4604);
(async () => {
  await post(edge + '/reset', {}); await post(cs + '/reset', {});
  const t = Date.now();
  for (let i = 0; i < M; i++) await post(cs + '/send', { id: 'm' + i, channel: 'general' });
  const s = await get(cs + '/stats'), e = await get(edge + '/stats');
  const useful = 300 * M;
  console.log(`FANOUT=${String(s.fanout).padEnd(9)} EDGE=${s.edge ? 1 : 0}   delivered: ${s.deliveredCount.toLocaleString('en-IN')}   ` +
    `bekaar (non-members): ${(s.deliveredCount - useful).toLocaleString('en-IN')}   long-haul copies: ${s.longHaul.toLocaleString('en-IN')}   time: ${Date.now() - t} ms`);
})();
