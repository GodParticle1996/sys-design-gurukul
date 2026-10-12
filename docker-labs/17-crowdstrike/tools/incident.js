#!/usr/bin/env node
/* node tools/incident.js --validator spec|contract --rollout global|rings [--fix-after 3]
   1. fleet reset (sab par Feb wala wildcard content)
   2. July wala channel 291 publish (field 21 mein asli value)
   3. --fix-after second baad fixed content publish (78 minute = video; yahan seconds)
   4. har second fleet ki haalat, phir 8 second baad final */
const args = require('./args')();
const { post, get, sleep } = require('../lib/util');
const C = `http://${process.env.CLOUD_HOST || 'localhost'}:4871`, F = `http://${process.env.FLEET_HOST || 'localhost'}:4872`;
const V = args.validator || 'spec', R = args.rollout || 'global', FIX = +(args['fix-after'] || 3);
(async () => {
  await post(C + '/publish', { file: 'c291-wildcard.json', validator: 'spec', rollout: 'global' });
  await post(F + '/reset'); await sleep(600);
  const p = await fetch(C + '/publish', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ file: 'c291-real21.json', validator: V, rollout: R }) }).then(r => r.json());
  console.log(`publish c291 (jul-19) validator=${V} rollout=${R} → ${p.rejected ? '🛑 REJECTED: ' + p.why : 'published'}`);
  for (let t = 1; t <= 8; t++) {
    await sleep(1000);
    if (t === FIX) { await post(C + '/publish', { file: 'c291-fix.json', validator: V, rollout: 'global' }); console.log(`  t=${t}s  → FIX publish kiya (revert)`); }
    const s = await get(F + '/stats'), cs = await get(C + '/status');
    console.log(`  t=${t}s  up=${String(s.up).padStart(3)} bootloop=${String(s.bootloop).padStart(3)} manual=${String(s.manual).padStart(3)} | kabhi crash hue: ${s.everCrashed} | agent restarts ${s.agentRestarts} | rings open ${cs.ringsOpen}${cs.halted ? ' (HALTED)' : ''}`);
  }
})().catch(e => { console.error('cloud/fleet chal rahe hain? npm start ex1-content-push —', e.message); process.exit(1); });
