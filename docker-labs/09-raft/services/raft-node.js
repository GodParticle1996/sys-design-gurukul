/* Ek chhota Raft node (seekhne ke liye — production nahi).
   Terms, RequestVote, AppendEntries, quorum commit, random election timeouts.
   ID=1..5, port = 4900 + ID. Doosre nodes ke ports PEERS mein.
   SAME_TIMEOUT=1 → sab ka election timeout barabar (split votes dekhne ke liye). */
const { serve, post, sleep } = require('../lib/util');
const ID = +(process.env.ID || 1);
const PORT = 4900 + ID;
const N = +(process.env.NODES || 5);
const PEERS = Array.from({ length: N }, (_, i) => i + 1).filter(i => i !== ID);
const HB = 80, TMIN = 300, TMAX = 600;
const SAME = process.env.SAME_TIMEOUT === '1';

let term = 0, votedFor = null, role = 'follower', leaderId = null;
let log = [{ term: 0, cmd: null }];              /* index 0 = khaali sentinel */
let commitIndex = 0, deadline = 0, elections = 0;
let down = false; const blocked = new Set();
const nextIndex = {}, matchIndex = {};

const quorum = Math.floor(N / 2) + 1;
/* SAME_TIMEOUT: sab ka timeout 450 ms aur ghadi ke ek hi "grid" par — asli duniya mein
   jab sab ek jaisa timeout rakhein aur ek hi heartbeat ke baad ek saath jaagein */
const resetTimer = () => {
  deadline = SAME ? Math.ceil((Date.now() + 450) / HB) * HB : Date.now() + TMIN + Math.random() * (TMAX - TMIN);
};
resetTimer();

async function rpc(peer, path, body) {
  if (down || blocked.has(peer)) throw new Error('unreachable');
  const r = await Promise.race([post(`http://localhost:${4900 + peer}${path}`, body), sleep(250).then(() => { throw new Error('timeout'); })]);
  if (r && r.unreachable) throw new Error('unreachable');
  return r;
}
function stepDown(t) { if (t > term) { term = t; votedFor = null; } if (role !== 'follower') role = 'follower'; }

async function startElection() {
  role = 'candidate'; term++; votedFor = ID; elections++; resetTimer();
  const myTerm = term, lastIdx = log.length - 1, lastTerm = log[lastIdx].term;
  let votes = 1;
  await Promise.all(PEERS.map(async p => {
    try {
      const r = await rpc(p, '/rv', { term: myTerm, candidateId: ID, lastLogIndex: lastIdx, lastLogTerm: lastTerm });
      if (r.term > term) stepDown(r.term);
      else if (r.granted && role === 'candidate' && term === myTerm) votes++;
    } catch (e) {}
  }));
  if (role === 'candidate' && term === myTerm && votes >= quorum) {
    role = 'leader'; leaderId = ID;
    PEERS.forEach(p => { nextIndex[p] = log.length; matchIndex[p] = 0; });
    console.log(`  [node ${ID}] LEADER — term ${term} (${votes}/${N} votes)`);
    heartbeat();
  }
}

async function replicateTo(p) {
  const ni = nextIndex[p] || log.length;
  const prevIdx = ni - 1;
  const entries = log.slice(ni);
  try {
    const r = await rpc(p, '/ae', { term, leaderId: ID, prevLogIndex: prevIdx, prevLogTerm: log[prevIdx] ? log[prevIdx].term : 0, entries, leaderCommit: commitIndex });
    if (r.term > term) { stepDown(r.term); return; }
    if (r.success) { matchIndex[p] = prevIdx + entries.length; nextIndex[p] = matchIndex[p] + 1; }
    else nextIndex[p] = Math.max(1, ni - 1);
  } catch (e) {}
}
function advanceCommit() {
  for (let i = log.length - 1; i > commitIndex; i--) {
    if (log[i].term !== term) continue;
    const acks = 1 + PEERS.filter(p => (matchIndex[p] || 0) >= i).length;
    if (acks >= quorum) { commitIndex = i; break; }
  }
}
async function heartbeat() { if (role !== 'leader' || down) return; await Promise.all(PEERS.map(replicateTo)); advanceCommit(); }

function tick() {
  if (down) return;
  if (role === 'leader') heartbeat();
  else if (Date.now() >= deadline) startElection();
}
if (SAME) {                                       /* sab nodes ek hi pal par tick karein */
  (function aligned() { setTimeout(() => { tick(); aligned(); }, HB - (Date.now() % HB)); })();
} else setInterval(tick, HB);

serve(PORT, {
  'POST /rv': (req, res, url, p, b) => {
    if (down || blocked.has(b.candidateId)) return { unreachable: true };
    if (b.term > term) stepDown(b.term);
    const last = log.length - 1;
    const upToDate = b.lastLogTerm > log[last].term || (b.lastLogTerm === log[last].term && b.lastLogIndex >= last);
    let granted = false;
    if (b.term === term && (votedFor === null || votedFor === b.candidateId) && upToDate) { votedFor = b.candidateId; granted = true; resetTimer(); }
    return { term, granted };
  },
  'POST /ae': (req, res, url, p, b) => {
    if (down || blocked.has(b.leaderId)) return { unreachable: true };
    if (b.term < term) return { term, success: false };
    if (b.term > term || role !== 'follower') stepDown(b.term);
    term = b.term; leaderId = b.leaderId; resetTimer();
    if (!log[b.prevLogIndex] || log[b.prevLogIndex].term !== b.prevLogTerm) return { term, success: false };
    log = log.slice(0, b.prevLogIndex + 1).concat(b.entries);       /* conflict wale uncommitted entries hat jaate hain */
    if (b.leaderCommit > commitIndex) commitIndex = Math.min(b.leaderCommit, log.length - 1);
    return { term, success: true };
  },
  'POST /write': async (req, res, url, p, b) => {
    if (down) return { unreachable: true };
    if (role !== 'leader') return { ok: false, notLeader: true, leaderId };
    log.push({ term, cmd: b.cmd });
    const idx = log.length - 1, t0 = Date.now();
    while (Date.now() - t0 < 1500) {
      await heartbeat();
      if (commitIndex >= idx) return { ok: true, committed: true, index: idx, term, ms: Date.now() - t0 };
      if (role !== 'leader') break;
      await sleep(40);
    }
    return { ok: false, committed: false, reason: 'majority ka ack nahi mila (timeout)', index: idx };
  },
  'GET /state': () => ({ id: ID, role, term, leaderId, commitIndex, elections, down, log: log.slice(1).map((e, i) => ({ i: i + 1, term: e.term, cmd: e.cmd, committed: i + 1 <= commitIndex })) }),
  'POST /admin/stop': () => { down = true; role = 'follower'; return { id: ID, down }; },
  'POST /admin/start': () => { down = false; resetTimer(); return { id: ID, down }; },
  'POST /admin/block': (req, res, url, p, b) => { blocked.clear(); (b.peers || []).forEach(x => blocked.add(x)); return { id: ID, blocked: [...blocked] }; },
}, () => console.log(`  raft-node ${ID} → http://localhost:${PORT}${SAME ? '  (SAME_TIMEOUT)' : ''}`));
