/* Matchmaker — player ne "Play" dabaya. Kis instance mein daalein?
   POLICY=fill-first → pehla instance jismein jagah ho (sirf bharna — sasta, par baaki kuch nahi dekhna)
   POLICY=nearest    → sirf latency: paas wale DC ka instance, dost ka koi khayal nahi
   POLICY=smart      → 5 cheezein tolo: (1) latency (2) dost kahan hain (3) load — party ke liye jagah bachao
                       (4) developer rule: region ke hisaab se (5) naya instance mehenga — pehle purane bharo
   Har instance ki capacity 40 (developer ne tay ki). */
const { serve } = require('../lib/util');
const PORT = +process.env.PORT || 5031, CAP = 40;
let POLICY = process.env.POLICY || 'smart';
const DCS = ['mumbai', 'singapore', 'frankfurt', 'virginia', 'oregon', 'sao-paulo'];
const PING = {                                                         // player region → DC ping (ms)
  india: [25, 70, 140, 210, 240, 300], sea: [70, 20, 170, 230, 180, 320], europe: [140, 170, 20, 90, 150, 200],
  'us-east': [210, 230, 90, 15, 70, 130], 'us-west': [240, 180, 150, 70, 20, 180], brazil: [300, 320, 200, 130, 180, 25],
};
let instances = [], players = new Map();                               // player → {inst, region, group}
function place(p) {
  const reservedFor = i => Object.values(i.reserved).reduce((a, x) => a + x, 0);
  const room = i => CAP - i.players.length - reservedFor(i);           // dosto ke liye rakhi seats ginti mein nahi
  const pingOf = i => PING[p.region][DCS.indexOf(i.dc)];
  const nearestDc = DCS[PING[p.region].indexOf(Math.min(...PING[p.region]))];
  let best = null;
  if (POLICY === 'smart' && p.group != null) best = instances.find(i => i.reserved[p.group] > 0) || null;   // (2) dost ne seat rakhi hai
  if (best) best.reserved[p.group]--;
  else if (POLICY === 'fill-first') best = instances.find(i => room(i) > 0) || null;
  else if (POLICY === 'nearest') best = instances.find(i => room(i) > 0 && i.dc === nearestDc) || null;
  else {
    const need = p.group != null ? p.groupSize : 1;                    // (3) poori party ke liye jagah chahiye
    let bestScore = Infinity;
    for (const i of instances) {
      if (room(i) < need || pingOf(i) > 120) continue;                // (1)+(4) door ka DC nahi
      const score = pingOf(i) - i.players.length * 0.5;               // (5) bhare hue ko pehle bharo — naya server paisa
      if (score < bestScore) { bestScore = score; best = i; }
    }
    if (best && p.group != null && p.groupSize > 1) best.reserved[p.group] = p.groupSize - 1;
  }
  if (!best) {                                                         // naya instance
    const dc = POLICY === 'fill-first' ? DCS[Math.floor(Math.random() * DCS.length)] : nearestDc;
    best = { id: instances.length, dc, players: [], reserved: {} }; instances.push(best);
    if (POLICY === 'smart' && p.group != null && p.groupSize > 1) best.reserved[p.group] = p.groupSize - 1;
  }
  best.players.push(p.id); players.set(p.id, { inst: best.id, region: p.region, group: p.group });
  return { instance: best.id, dc: best.dc, ping: pingOf(best) };
}
serve(PORT, {
  'POST /join': (req, res, url, q, b) => place(b),
  'POST /policy': (req, res, url, q, b) => { POLICY = b.policy; instances = []; players = new Map(); return { POLICY }; },
  'GET /stats': () => {
    const groups = new Map();
    for (const [id, v] of players) if (v.group != null) { if (!groups.has(v.group)) groups.set(v.group, new Set()); groups.get(v.group).add(v.inst); }
    const together = [...groups.values()].filter(s => s.size === 1).length;
    let pingSum = 0; for (const [, v] of players) pingSum += PING[v.region][DCS.indexOf(instances[v.inst].dc)];
    return { policy: POLICY, players: players.size, instances: instances.length, avgFill: +(100 * players.size / (instances.length * CAP)).toFixed(1),
      groups: groups.size, groupsTogether: together, avgPing: Math.round(pingSum / players.size) };
  },
}, () => console.log(`[matchmaker] :${PORT} policy=${POLICY}`));
