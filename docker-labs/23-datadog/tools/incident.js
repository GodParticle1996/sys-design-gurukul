/* 8 March 2023, 06:00 UTC. Ubuntu unattended-upgrades ne systemd ka security patch lagaya → systemd-networkd ne apni config
   "reapply" ki — aur jo rules use apne config mein nahi mile, saaf kar diye.
   node tools/incident.js --case reboot-test     (CI/test machine: boot order networkd → cilium)
   node tools/incident.js --case in-place        (asli prod machine: hafton se chal rahi hai)
   Fix dekhne ke liye service ka env badlo:
     PROTO=cilium npm start ex1-rules            → cilium apne rules par apna naam (protocol tag) lagata hai
     MANAGE_FOREIGN=0 npm start ex1-rules        → networkd dusron ke rules ko haath nahi lagata */
const args = require('./args')();
const { post, get, host, sleep } = require('../lib/util');
const K = `http://${host('kernel')}:4991`, N = `http://${host('networkd')}:4993`, C = `http://${host('cilium')}:4992`;
const pods = async n => { let ok = 0; for (let i = 0; i < n; i++) if ((await post(K + '/packet', { fwmark: '0x200' })).delivered) ok++; return ok; };
const showRules = async () => console.log(`  ip rule: ${(await get(K + '/rules')).rules.map(r => `${r.selector} → ${r.table} [${r.proto || 'koi proto tag nahi'}]`).join('  |  ') || '(khaali)'}`);
(async () => {
  const cs = args.case || 'in-place';
  const cfg = { networkd: await get(N + '/stats'), cilium: await get(C + '/stats') };
  console.log(`config: cilium proto=${cfg.cilium.proto || 'koi nahi'}, networkd manageForeign=${cfg.networkd.manageForeign}, pehchante hain: ${cfg.networkd.knownProtos.join(',')}\n`);
  await post(K + '/boot');
  if (cs === 'reboot-test') {
    console.log('CASE reboot-test — machine abhi reboot hui (CI ka test machine)');
    console.log('  boot: systemd-networkd pehle chala (us waqt cilium ke rules the hi nahi)');
    await post(N + '/reapply');
    console.log('  boot: phir cilium agent chala, apne rules daale');
    await post(C + '/install');
  } else {
    console.log('CASE in-place — machine hafton se chal rahi hai, cilium ke rules pehle se lage hue hain');
    await post(C + '/install');
  }
  await sleep(50); await showRules();
  console.log(`  pod packets: ${await pods(100)} / 100 pahunche`);
  if (cs === 'reboot-test') {
    console.log('\n✅ Test pass — reboot ke baad sab chalta hai. Isi liye ye bug 27 mahine chhupa raha.');
    console.log('   (prod machines reboot nahi hoti thi — unpe patch IN-PLACE lagta hai. Ab wahi case chalao.)');
    return;
  }
  const r = await post(N + '/reapply');
  console.log(`\n06:00 UTC — systemd patch → networkd reapply → ${r.cleaned} rule(s) saaf: ${(r.removedRules || []).map(x => x.selector + ' [' + (x.proto || 'koi tag nahi') + '] jo cilium ne banaya tha').join(', ') || 'koi nahi'}`);
  await sleep(50); await showRules();
  const after = await pods(100);
  console.log(`  pod packets: ${after} / 100 pahunche  ${after === 0 ? '💀 node dark — control plane se bhi katt gaya' : '✅ bach gaya'}`);
})();
