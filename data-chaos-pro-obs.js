/* 🎲 Chaos deck 'pro-obs' — obs-unit
   Base: tags on, PDF cache, recommendation servers ka size traffic ke hisaab se, exports CDN se, buffer pool 128 MB.
   Base probes: cost show → feature ki rows; cost unit → ₹0.077/payment; recommendations list → p99 185 ms.
   tags-gone              ₹23 lakh ka bill wahi, lekin sirf resource ka hisaab
   statement-pdf-bill     ₹0.097/payment, PDF ki row ₹8 lakh
   reco-bill              ₹0.090/payment, recommendations ki row ₹8 lakh
   analytics-export-bill  ₹0.087/payment, export ki row ₹5 lakh
   db-memory              usi list ka p99 296 ms, buffer cache mein sirf 9.5% table */
(function () {
  const H1 = 'Pehle feature ki rows aur ek payment ka kharcha padho. Phir list ka p99 dekho. Kis jagah par farak hai?';

  SD.chaos.addDeck({
    id: 'pro-obs', title: 'ChaiPay ka bill aur raftaar',
    sys: {
      name: 'chaipay-cloud',
      cost: { tags: true, fixed: { 'statement-pdf': true, reco: true, 'analytics-export': true } },
      api: { countTotal: false, primaryTable: 'recommendations' },
      db: { bufferPoolMB: 128, tables: {
        recommendations: { rows: 400000, rowBytes: 220, pk: 'id', cols: ['id', 'created_at'],
          indexes: [{ name: 'rec_pk', cols: ['id'], unique: true }] },
      } },
    },
    alert: '<b>📟 09:30 — ChaiPay.</b> Kal raat platform team ne cloud settings nayi file se lagayin. Subah finance aur on-call ki saajhi jaanch laal hai. Bill aur list ki raftaar dekhkar wajah dhoondho. Shuru karo <code>runbook</code> se.',
    placeholder: 'runbook',
    runbook: `# ChaiPay ki subah ki jaanch
1. cost show → bill mein PDF, recommendations aur analytics export ki alag rows hon.
2. cost unit → ek payment par ₹0.08 se kam kharcha ho.
3. GET /recommendations?limit=10 → list khule aur p99 200 ms ke andar ho.
Settings: cost show mein feature ka bill padho. sim status mein DB ka buffer pool dekho.
Badlo: cost tag on · cost fix <feature> --lever <cache|rightsize|cdn> · sim set db.bufferPoolMB <MB>
Niyam: ek baar mein EK badlaav, phir wahi probe dobara.`,
    cards: [
      { id: 'tags-gone', title: 'Bill se feature tags hat gaye',
        sys: { cost: { tags: false } }, fixed: s => s.sys.cost.tags,
        verify: r => r.kind === 'cost' && r.view === 'feature' && r.tags,
        verifyText: 'cost show — feature ki rows dikhein',
        hints: [H1, 'Kul kharcha wahi hai. Kya bill mein feature ke naam mil rahe hain?', 'cost tag on, phir cost show.'],
        solution: ['runbook', 'cost show', 'cost unit', 'cost tag on', 'cost show'],
        why: 'Bill mein sirf compute, database aur network bache. <b>Feature tags</b> lagne se har team apne feature ki row dekh sakti hai.' },
      { id: 'statement-pdf-bill', title: 'PDF har download par dobara banta hai',
        sys: { cost: { fixed: { 'statement-pdf': false } } }, fixed: s => s.sys.cost.fixed['statement-pdf'],
        verify: r => r.kind === 'cost-unit' && r.perUnit < 0.08,
        verifyText: 'cost unit — payment ka kharcha budget mein',
        hints: [H1, 'PDF ki row mein compute badha. Taiyaar statement ka kya hua?', 'cost fix statement-pdf --lever cache, phir cost unit.'],
        solution: ['runbook', 'cost unit', 'cost show', 'cost fix statement-pdf --lever cache', 'cost unit'],
        why: 'Har download par statement banane se kharcha badha. <b>Taiyaar PDF</b> rakhne se agle download par wahi file milti hai.' },
      { id: 'reco-bill', title: 'Recommendations ke liye bade servers wapas aaye',
        sys: { cost: { fixed: { reco: false } } }, fixed: s => s.sys.cost.fixed.reco,
        verify: r => r.kind === 'cost-unit' && r.perUnit < 0.08,
        verifyText: 'cost unit — payment ka kharcha budget mein',
        hints: [H1, 'Recommendations ki compute aur DB lines badhin. Servers ka size dekho.', 'cost fix reco --lever rightsize, phir cost unit.'],
        solution: ['runbook', 'cost unit', 'cost show', 'cost fix reco --lever rightsize', 'cost unit'],
        why: 'Kam traffic par bhi bade servers ka bill aa raha hai. <b>Rightsizing</b> se servers ka size workload ke hisaab se hota hai. List ka p99 bhi jaancho.' },
      { id: 'analytics-export-bill', title: 'Export seedha origin se jaata hai',
        sys: { cost: { fixed: { 'analytics-export': false } } }, fixed: s => s.sys.cost.fixed['analytics-export'],
        verify: r => r.kind === 'cost-unit' && r.perUnit < 0.08,
        verifyText: 'cost unit — payment ka kharcha budget mein',
        hints: [H1, 'Analytics export ki network line badhi. Baar-baar maangi gayi file kahan se aa rahi hai?', 'cost fix analytics-export --lever cdn, phir cost unit.'],
        solution: ['runbook', 'cost unit', 'cost show', 'cost fix analytics-export --lever cdn', 'cost unit'],
        why: 'Har download origin se jaane par network bill badha. <b>CDN</b> baar-baar maangi gayi file user ke paas wali copy se deta hai.' },
      { id: 'db-memory', title: 'Recommendations DB ki memory ghat gayi',
        sys: { db: { bufferPoolMB: 8 } }, fixed: s => s.sys.db.bufferPoolMB >= 128,
        verify: r => r.kind === 'http' && r.method === 'GET' && r.path === '/recommendations?limit=10' && r.status === 200 && r.p99 <= 200,
        verifyText: 'GET /recommendations?limit=10 — list ka p99 budget mein',
        hints: [H1, 'Bill theek hai. Query plan mein kitni table memory mein hai? Sim status mein buffer pool dekho.', 'sim set db.bufferPoolMB 128, phir GET /recommendations?limit=10.'],
        solution: ['runbook', 'GET /recommendations?limit=10', 'sim status', 'sim set db.bufferPoolMB 128', 'GET /recommendations?limit=10'],
        why: 'DB ki <b>buffer memory</b> ghatne par usi scan ko disk se zyada padhna pada. Memory wapas do aur wahi list kholkar p99 jaancho.' },
    ],
  });

  SD.addLab('obs-unit', {
    type: 'chaos', id: 'chaos-pro-obs', deck: 'pro-obs', title: '🎲 Chaos round: ChaiPay ka bill aur raftaar',
    instructions: 'Bill ki row aur list ki raftaar se galti pehchaano. Ek setting sudhaaro aur wahi jaanch dobara karo.',
  });
})();
