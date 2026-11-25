/* 📟 On-call shift 'monthend' — boss-sec (engine: oncall.js; tenant plugin: perfsim-pro.js)
     1 ExportLeak          Sharma ke export mein 55,00,000 rows (54,88,000 doosron ke) → tenant isolation rls → 12,000, leak 0
     2 DashboardsStalled   MegaMart report 80% CPU, baaki dashboards p99 10s         → tenant quota mega --cpu 20 → 180ms
     3 ReportBreached      quota ke baad MegaMart report 60 min (SLA 20)             → tenant replica mega → 15 min, dashboards 180ms
   Sab perfsim par chala ke dekha (2026-11-25). */
(function () {
  const T = s => s.sys.tenancy || { quota: {}, replica: {} };
  const INC = [
    { id: 'ExportLeak', sev: '🔴 SEV1', text: 'Sharma Sweets: "hamare export mein 55 lakh rows aayi — doosre merchants ka data!"',
      fixed: s => T(s).isolation === 'rls' || !!T(s).exportFilter,
      verify: r => r.kind === 'tenant-export' && r.leaked === 0,
      verifyText: 'Sharma ka export dobara chalao — leak 0',
      hints: [
        'tenant status, phir tenant export sharma — kitni rows aayi, kiski?',
        'Naya export code WHERE merchant_id lagana bhool gaya. app-filter mein har developer ko har query mein yaad rakhna padta hai — ek bhool = leak. Database khud har query par filter lagaye.',
        'tenant isolation rls, phir tenant export sharma dobara: sirf 12,000 rows, sab Sharma ki.',
      ] },
    { id: 'DashboardsStalled', sev: '🔴 SEV1', text: 'Exports wapas khule. 1 tareekh ka ghanta: 39,999 merchants ke dashboards p99 10s.',
      fixed: s => { const q = T(s).quota.mega; return (q >= 5 && q <= 50) || !!T(s).replica.mega; },
      verify: r => r.kind === 'tenant-load' && r.othersP99 < 1000,
      verifyText: 'tenant load dobara — baaki dashboards 1s se kam',
      hints: [
        'tenant load — DB ka CPU kaun kha raha hai, aur baaki merchants ka kya haal hai?',
        'MegaMart ki report akeli 80% CPU le rahi hai, baaki sab line mein. Ek tenant ka hissa baandho, taaki baaki saans le sakein.',
        'tenant quota mega --cpu 20, phir tenant load: baaki dashboards ~180ms.',
      ] },
    { id: 'ReportBreached', sev: '🟠 SEV2', text: 'MegaMart: "month-end report ab 60 min le rahi — subah board meeting hai, SLA 20 min."',
      fixed: s => !!T(s).replica.mega,
      verify: r => r.kind === 'tenant-load' && r.dtReportMin <= 20 && r.othersP99 < 1000,
      verifyText: 'tenant load dobara — report ≤ 20 min aur dashboards < 1s',
      hints: [
        'tenant load dobara — MegaMart ki report kitni der le rahi hai, aur kyun?',
        'Quota ne baaki merchants ko bachaya, par MegaMart ko bhookha kar diya. Bade tenant ko saajha primary se bahar apni jagah do.',
        'tenant replica mega (+₹1.2 lakh/mahina), phir tenant load: report 15 min, dashboards 180ms.',
      ] },
  ];

  SD.oncall.add({
    id: 'monthend', start: 1 * 60 + 45, INC,
    build: ({ risky }) => ({
      sys: { name: 'chaipay-merchant' },
      goal: '<b>ChaiPay, 01:45 — month-end.</b> 40,000 merchants ek hi database par. Pager tumhare paas hai — har alert theek karo, phir <b>pakka</b> karo. Shuru: <code>runbook</code>.',
      placeholder: 'runbook',
      runbook: `# ChaiPay on-call runbook — month-end (1 tareekh)
Tenants:      tenant status · tenant export <id> · tenant load
Isolation:    tenant isolation rls | app-filter    (app-filter = har query mein developer khud WHERE lagaye)
Bojh:         tenant quota <id> --cpu N             (ek tenant ka CPU hissa)
              tenant replica <id>                   (bade tenant ko alag read replica — ₹1.2 lakh/mahina)
SLA:          MegaMart month-end report ≤ 20 min · merchant dashboard p99 < 1s
Mat chhuna:   RLS hatana · kisi tenant ko 0% CPU · sim reset · sim inject`,
      responses: [
        risky(/^tenant isolation app-filter\b/i, 'RLS hatana mana — leak wapas aa jaayega. Ek bhooli hui WHERE = sabka data bahar.'),
        risky(/^tenant quota \S+ --cpu\s+0\b/i, '0% CPU mana — yeh tenant ko band karna hai, hadd lagana nahi. Sabse bada customer bina warning ke ruk jaayega.'),
      ],
      successText: `<b>Raat ki kahani:</b> naye export code ne WHERE merchant_id bhula diya — app-filter mein ek bhool = leak (1) → RLS se database khud filter lagata hai →
        exports khule toh MegaMart ki report ne saajha DB ka 80% CPU le liya, baaki 39,999 line mein (2) → quota ne baaki bachaye →
        par MegaMart ki report 60 min (3) → alag read replica: dono khush.<br>
        <b>Seekh:</b> multi-tenant mein do khatre — <b>data ka leak</b> (isolation database mein, code mein nahi) aur <b>noisy neighbour</b> (quota se bachao, bade tenant ko alag jagah). Har fix ka asar agle tenant par dekho.<br>
        <b>Postmortem action items:</b> RLS default · per-tenant quota policy · bade tenants ke liye replica plan (aur uska kharcha) · export par leak test.`,
      solution: [
        'runbook', 'tenant status', 'tenant export sharma', 'tenant isolation rls', 'tenant export sharma',
        'tenant load', 'tenant quota mega --cpu 20', 'tenant load',
        'tenant replica mega', 'tenant load',
      ],
    }),
  });

  SD.addLab('boss-sec', {
    type: 'oncall', id: 'oncall-sec', shift: 'monthend', title: '📟 On-call shift: month-end ki raat',
    instructions: 'Ek database, 40,000 merchants, jude hue alerts. Har command = 1 minute. Theek karo, phir pakka karo.',
  });
})();
