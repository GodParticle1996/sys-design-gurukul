/* 200 nodes, 5 regions, 3 clouds — par saari machines par ek hi Ubuntu, ek hi package mirror, ek hi auto-update job, ek hi UTC ghadi.
   Bug sirf un machines par chalta hai jinke cilium rules PEHLE se lage hain (yaani jo hafton se chal rahi hain).
   Fresh boot ki hui machine par bug dikhta hi nahi. node tools/fleet.js */
const REGIONS = ['us-east (AWS)', 'us-west (AWS)', 'eu-west (Azure)', 'ap-south (GCP)', 'eu-north (GCP)'];
const fleet = Array.from({ length: 200 }, (_, i) => ({ id: i, region: REGIONS[i % 5], uptimeDays: 20 + (i * 7) % 300 }));
const dies = n => n.uptimeDays > 0;                                   // in-place patch + purane rules = maut
function run(mode) {
  const log = []; let dead = 0, stopped = null;
  if (mode === 'same-clock') {
    fleet.forEach(n => { if (dies(n)) dead++; });
    log.push(`06:00 — saari 200 machines ne ek hi minute mein patch liya (same cron, same UTC ghadi)`);
    log.push(`06:00 — ${dead} nodes dark. Monitoring bhi inhi nodes par thi → alert kisi ko nahi mila`);
    log.push(`06:40 — customer ne bataya. Tab tak rokne ko kuch bacha hi nahi tha`);
    stopped = 40;
  } else {
    const fresh = mode === 'staged-fresh-canary';
    const canaries = fleet.slice(0, 4).map(n => ({ ...n, uptimeDays: fresh ? 0 : n.uptimeDays }));
    const canaryDead = canaries.filter(dies).length;
    log.push(`06:00 — wave 1: 4 canary machines (${fresh ? 'abhi-abhi boot ki hui, saaf' : 'prod jaisi — hafton purani'})`);
    if (canaryDead) {
      dead = canaryDead; stopped = 5;
      log.push(`06:02 — ${canaryDead}/4 canary dark → 06:05 rollout HALT. Baaki 196 machines bach gayi`);
    } else {
      log.push(`06:05 — canary sab green ✅ ("test pass") → wave 2: baaki 196 machines`);
      dead = fleet.slice(4).filter(dies).length;
      log.push(`06:06 — ${dead} nodes dark. Canary ne bug pakda hi nahi kyunki wo fresh-boot thi (bug sirf in-place par)`);
      stopped = 40;
    }
  }
  return { mode, dead, stopped, log };
}
for (const m of ['same-clock', 'staged-fresh-canary', 'staged-aged-canary']) {
  const r = run(m);
  console.log(`\n=== ${m} ===`); r.log.forEach(l => console.log('  ' + l));
  console.log(`  NATEEJA: ${r.dead}/200 nodes dark (${Math.round(100 * r.dead / 200)}% fleet), rokne mein ${r.stopped} min`);
}
console.log('\nStaged rollout tabhi kaam karta hai jab canary us HAALAT mein ho jisme prod hai (purani, in-place patch wali).');
console.log('"Multi-region" ne yahan kuch nahi bachaya — 5 regions, 3 clouds, par upar ek hi package mirror aur ek hi ghadi.');
