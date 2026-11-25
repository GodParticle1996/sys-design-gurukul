/* 📟 On-call shift 'ledgermove' — boss-data (engine: oncall.js; migrate: perfsim.js)
   boss-data ka chaos deck index/count/pool sikhata hai; yeh shift data track ka MIGRATION hissa:
     1 ReplicaLag111s    raat ka backfill 1 lakh ke batch se → replica lag 111s → migrate backfill --batch 5000 → lag 1s
     2 ChecksumMismatch  chhote batch ki copy mein dual-write OFF tha → 41,204 rows nayi table mein nahi
                         → migrate rollback · dual-write on · backfill --batch 5000 → verify match
     3 CutoverWindow     change window khuli — cutover sirf saboot (verify) ke saath, dual-write ON rehte
   Sab perfsim par chala ke dekha (2026-11-25). */
(function () {
  const M = s => s.sys.migration || {};
  const INC = [
    { id: 'ReplicaLag111s', sev: '🔴 SEV1', text: 'Read replicas 111 second peeche — users ko apni nayi payment "pending" dikh rahi hai. Raat ka migration job chal raha hai.',
      fixed: s => s.sys.db.replicaLagSec <= 5,
      verify: r => r.kind === 'metrics' || (r.kind === 'migrate' && r.op === 'status'),
      verifyText: 'metrics dobara — replica lag kam hona chahiye',
      hints: [
        'metrics — db.replica.lag_s kitna hai? Phir migrate status — job kis batch size se chal raha hai?',
        'Ek batch mein 1 lakh rows = ek lambi transaction: locks, undo log aur replica lag. Copy chhote batches (1k–10k) mein karo.',
        'migrate backfill --batch 5000, phir metrics: lag ~1s.',
      ] },
    { id: 'ChecksumMismatch', sev: '🔴 SEV1', text: 'Nightly verify job: nayi table mein hazaaron rows kam! Cutover aaj raat ki change window mein hona hai.',
      fixed: s => { const m = M(s); return !!m.dualWrite && m.drift === 0 && m.backfilled === m.total; },
      verify: r => r.kind === 'migrate' && r.op === 'verify' && r.verified,
      verifyText: 'migrate verify — checksum match',
      hints: [
        'migrate verify — kitni rows mel nahi khaati? migrate status — dual-write ON hai?',
        'Backfill ek snapshot copy karta hai. Copy chalte waqt aaye naye writes nayi table tak pahunche hi nahi, kyunki dual-write OFF tha. Rollback karo, PEHLE dual-write, phir copy.',
        'migrate rollback, migrate dual-write on, migrate backfill --batch 5000, phir migrate verify.',
      ] },
    { id: 'CutoverWindow', sev: '🟠 SEV2', text: 'Change window khul gayi. PM: "cutover abhi karo, subah ka traffic aane se pehle."',
      fixed: s => { const m = M(s); return !!m.cutover && !!m.verified && !!m.dualWrite; },
      verify: r => r.kind === 'migrate' && r.op === 'status' && r.cutover,
      verifyText: 'migrate status — cutover ho gaya aur dual-write ab bhi ON (rollback ek flag door)',
      hints: [
        'migrate status — verify ho chuka? dual-write ON hai? Tabhi cutover safe hai.',
        'Cutover = reads nayi table se. Saboot (verify) ke saath karo, aur dual-write abhi band mat karo — kuch gadbad ho toh purani table taaza rahe.',
        'migrate cutover, phir migrate status.',
      ] },
  ];

  SD.oncall.add({
    id: 'ledgermove', start: 2 * 60 + 12, INC,
    build: ({ risky }) => ({
      sys: { name: 'ledgerdesk', db: { replicaLagSec: 111 },
        migration: { dualWrite: false, backfilled: 9500000, total: 24286450, drift: 0, verified: false, cutover: false, writesDuring: 0, batch: 100000 } },
      goal: '<b>LedgerDesk, 02:12.</b> transactions table (2.4 crore rows) nayi table mein ja rahi hai — online, bina downtime. Pager tumhare paas hai. Shuru: <code>runbook</code>.',
      placeholder: 'runbook   (phir: metrics)',
      runbook: `# LedgerDesk on-call runbook — online migration ki raat
Haal:         metrics (db.replica.lag_s) · migrate status · sim status
Migration:    migrate backfill --batch N · migrate verify · migrate dual-write on|off
              migrate rollback · migrate cutover
Kram:         dual-write ON → backfill (chhote batch) → verify → cutover → (kuch din baad) dual-write off
Niyam:        "jaldi" nahi, "kisi ko pata na chale" — chhote batch, saboot ke saath cutover.
Mat chhuna:   dual-write off (cutover ke baad bhi kuch din) · DROP INDEX · sim reset · sim inject`,
      responses: [
        risky(/^migrate dual-?write\s+(off|false|0)\b/i, 'Dual-write band karna mana — rollback ka raasta band ho jaayega, aur naye writes phir chhootenge.'),
        risky(/^drop\s+index\b/i, 'Index mat giraao — migration ki raat production index girana = har query full scan.'),
      ],
      successText: `<b>Raat ki kahani:</b> backfill 1 lakh ke batch mein chal raha tha — har batch ek lambi transaction, replica lag 111s (1) →
        chhote batch se lag gaya, par dual-write OFF tha: copy ke dauraan aaye 41,204 writes nayi table tak pahunche hi nahi (2) →
        rollback, pehle dual-write, phir copy, phir verify ✅ → cutover sirf saboot ke saath, dual-write ON rehte (3).<br>
        <b>Seekh:</b> online migration ka kram — <b>dual-write → backfill (chhote batch) → verify → cutover</b>. Verify optional nahi: bina uske data <b>chupchaap</b> galat hota hai.<br>
        <b>Postmortem action items:</b> backfill job mein batch ki hadd · verify ko continuous job · cutover checklist mein "verify match + dual-write ON".`,
      solution: [
        'runbook', 'metrics', 'migrate status', 'migrate backfill --batch 5000', 'metrics',
        'migrate verify', 'migrate rollback', 'migrate dual-write on', 'migrate backfill --batch 5000', 'migrate verify',
        'migrate status', 'migrate cutover', 'migrate status',
      ],
    }),
  });

  SD.addLab('boss-data', {
    type: 'oncall', id: 'oncall-data', shift: 'ledgermove', title: '📟 On-call shift: migration ki raat',
    instructions: 'Ek badi table, online migration, jude hue alerts. Har command = 1 minute. Theek karo, phir pakka karo.',
  });
})();
