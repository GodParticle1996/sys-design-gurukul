/* Live traffic — har second RATE naye messages old-store par */
const { post, sleep } = require('../lib/util');
const RATE = +(process.env.RATE || 500);
const OLD = 'http://localhost:' + (process.env.OLD_PORT || 4721);
console.log(`  writer    → ${RATE} msg/s old-store par`);
(async () => { while (true) { const t = Date.now(); const jobs = []; for (let i = 0; i < RATE / 10; i++) jobs.push(post(OLD + '/write', {}).catch(() => {})); await Promise.all(jobs); await sleep(Math.max(0, 100 - (Date.now() - t))); } })();
