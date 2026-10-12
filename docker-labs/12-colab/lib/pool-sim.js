/* GPU pool simulation (services/pool.js isse chalata hai) */
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function simulate(policy, gpus, seed) {
  const r = rng(seed);
  const users = [];
  // din bhar aane wale log
  for (let i = 0; i < 900; i++) users.push({ kind: 'interactive', arrive: Math.floor(r() * 1300), active: 20 + Math.floor(r() * 100), idle: Math.floor(r() * 480) });
  for (let i = 0; i < 40; i++) users.push({ kind: 'trainer', arrive: Math.floor(r() * 600), active: 600 + Math.floor(r() * 1200), idle: 0 });
  for (let i = 0; i < 30; i++) users.push({ kind: 'miner', arrive: Math.floor(r() * 120), active: 1440, idle: 0 });
  users.forEach((u, i) => Object.assign(u, { id: i, state: 'waiting', gotAt: null, used: 0, idleFor: 0, heldFor: 0, noInteract: 0, waited: 0 }));

  let free = gpus;
  const gpuMin = { useful: 0, idleHeld: 0, miner: 0, empty: 0 };
  for (let t = 0; t < 1440; t++) {
    // 1. jo GPU pakde baithe hain unka ek minute
    for (const u of users) {
      if (u.state !== 'running') continue;
      u.heldFor++;
      const computing = u.used < u.active;
      if (computing) {
        u.used++;
        if (u.kind === 'miner') { gpuMin.miner++; u.noInteract++; } else gpuMin.useful++;
        u.idleFor = 0;
      } else {
        gpuMin.idleHeld++; u.idleFor++;
      }
      const done = u.kind === 'interactive' ? (u.used >= u.active && u.idleFor >= u.idle) : u.used >= u.active;
      let reclaim = false;
      if (policy !== 'none' && u.idleFor >= 90) reclaim = true;              // idle reclaim (idle + colab)
      if (policy === 'colab') {
        if (u.heldFor >= 720) reclaim = true;                               // 12 ghante ki hadd
        if (u.kind === 'miner' && u.noInteract >= 60) reclaim = true;       // abuse detection
      }
      if (done || reclaim) { u.state = reclaim && !done ? 'reclaimed' : 'finished'; free++; }
    }
    // 2. intezaar karne walon ko GPU (colab: interactive pehle)
    let queue = users.filter(u => u.state === 'waiting' && u.arrive <= t);
    if (policy === 'colab') queue.sort((a, b) => (a.kind === 'interactive' ? 0 : 1) - (b.kind === 'interactive' ? 0 : 1) || a.arrive - b.arrive);
    else queue.sort((a, b) => a.arrive - b.arrive);
    for (const u of queue) {
      if (!free) { u.waited++; continue; }
      if (policy === 'colab' && u.kind === 'miner' && u.seenMiner) { u.state = 'blocked'; continue; }
      free--; u.state = 'running'; u.gotAt = t;
    }
    gpuMin.empty += free;
    users.forEach(u => { if (u.state === 'reclaimed' && u.kind === 'miner') u.seenMiner = true; });
  }
  const inter = users.filter(u => u.kind === 'interactive');
  const served = inter.filter(u => u.gotAt !== null && u.gotAt - u.arrive <= 5).length;
  const avgWait = inter.filter(u => u.gotAt !== null).reduce((s, u) => s + (u.gotAt - u.arrive), 0) / Math.max(1, inter.filter(u => u.gotAt !== null).length);
  const total = gpus * 1440;
  const pctOf = x => Math.round(x / total * 1000) / 10;
  return {
    policy, gpus,
    interactiveServedIn5min: Math.round(served / inter.length * 1000) / 10,
    interactiveNeverServed: inter.filter(u => u.gotAt === null).length,
    avgWaitMin: Math.round(avgWait),
    gpuTime: { usefulPct: pctOf(gpuMin.useful), idleHeldPct: pctOf(gpuMin.idleHeld), minerPct: pctOf(gpuMin.miner), emptyPct: pctOf(gpuMin.empty) },
    reclaimed: users.filter(u => u.state === 'reclaimed').length,
  };
}

module.exports = { simulate };
