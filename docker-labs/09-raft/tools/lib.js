const { get, post, sleep } = require('../lib/util');
const NODES = [1, 2, 3, 4, 5];
const url = id => `http://localhost:${4900 + id}`;
async function states() { return Promise.all(NODES.map(id => get(url(id) + '/state').catch(() => ({ id, role: '?', down: true })))); }
async function waitLeader(exclude = [], ms = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const st = await states();
    const leaders = st.filter(s => s.role === 'leader' && !s.down && !exclude.includes(s.id));
    if (leaders.length) { const top = leaders.sort((a, b) => b.term - a.term)[0]; return { leader: top, ms: Date.now() - t0, st }; }
    await sleep(30);
  }
  return { leader: null, ms: Date.now() - t0 };
}
module.exports = { NODES, url, states, waitLeader, get, post, sleep };
