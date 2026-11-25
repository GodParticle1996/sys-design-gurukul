/* 📟 On-call shift 'chaichat' — stories track, level notion-scale (engine: oncall.js)
   Ek startup ki raat, teen companies ki seekh (stories track ke levels se):
     1 FrontPageMeltdown (Reddit, st-reddit-cache)  har read par listing banti hai → service 13s, 500 rps saturated
                         → sim precompute ("key to speed is to precompute") → 2ms
     2 ViralChannelHerd  (Discord, st-discord-hot)  ek viral channel ki EK key: 100 misses ek saath → cache coalesce → 1 query
     3 BigGuildStalls    (Jira, st-jira-tenant)     ek bada tenant saajha DB ka 80% CPU → baaki dashboards 10s
                         → tenant quota (ya alag replica) → 180ms
   Sab perfsim par chala ke dekha (2026-11-25). */
(function () {
  const HOT = 'GET /transactions/1 -n 100';
  const INC = [
    { id: 'FrontPageMeltdown', sev: '🔴 SEV1', text: 'ChaiChat ka front page viral — 500 rps aur har request par poori listing dobara sort ho rahi hai. Site saturated.',
      fixed: s => !!s.sys.api.precomputed,
      verify: r => r.kind === 'load' && r.rps >= 500 && !r.saturated,
      verifyText: 'load --rps 500 --duration 8 — saturated nahi',
      hints: [
        'load --rps 500 --duration 8 — ek request ka service time kitna? Har read par kya kaam ho raha hai?',
        'Reddit ka sabak (st-reddit-cache): listing har read par mat banao — vote aane par list mein post ki jagah badlo, read sirf bani list padhe. "Key to speed is to precompute."',
        'sim precompute, phir load --rps 500 --duration 8.',
      ] },
    { id: 'ViralChannelHerd', sev: '🟠 SEV2', text: 'Ek channel viral: uske latest messages ki EK cache key expire hote hi 100 requests ek saath DB par.',
      onFire: s => { s.sys.api.cache = { ttlSec: 5, jitterPct: 40, hitRate: 0.9, entries: {} }; },
      fixed: s => !!(s.sys.api.cache && s.sys.api.cache.singleFlight),
      verify: r => r.kind === 'http' && r.repeat >= 100 && r.cache === 'MISS' && r.dbQueries === 1,
      verifyText: `key expire hone do (sim advance 10), phir ${HOT} — 1 DB query`,
      hints: [
        `${HOT} — cache MISS par kitni DB queries?`,
        'Discord ka sabak (st-discord-hot): hot partition par sab ek hi cheez maang rahe hain. Pehli request DB se laaye, baaki usi jawab ka intezaar karein — request coalescing.',
        `cache coalesce --misses 100 --on, sim advance 10, phir ${HOT}.`,
      ] },
    { id: 'BigGuildStalls', sev: '🟠 SEV2', text: 'Sabse bade tenant "MegaMart" ka monthly report chal raha — baaki 39,999 tenants ke dashboards 10 second.',
      fixed: s => { const t = s.sys.tenancy; const q = t.quota.mega; return (q >= 5 && q <= 50) || !!t.replica.mega; },
      verify: r => r.kind === 'tenant-load' && r.othersP99 < 1000,
      verifyText: 'tenant load — baaki dashboards 1s se kam',
      hints: [
        'tenant load — saajha DB ka CPU kaun le raha hai?',
        'Jira ka sabak (st-jira-tenant): ek bada tenant baaki sab ka hissa kha sakta hai. Uska hissa baandho — ya use apni jagah do.',
        'tenant quota mega --cpu 20 (ya tenant replica mega), phir tenant load.',
      ] },
  ];

  SD.oncall.add({
    id: 'chaichat', start: 22 * 60 + 40, INC,
    build: ({ risky }) => ({
      sys: { name: 'chaichat-api', api: { countTotal: false }, deps: { ranker: { p50: 150, p99: 200, errorRate: 0 } } },
      goal: '<b>ChaiChat, 22:40.</b> Ek chhota startup — aaj raat achanak viral. Team ne Reddit, Discord aur Jira ki kahaniyan padhi hain; ab unhe kaam mein lene ka waqt. Shuru: <code>runbook</code>.',
      placeholder: 'runbook   (phir: load --rps 500 --duration 8)',
      runbook: `# ChaiChat on-call runbook
Front page:   load --rps 500 --duration 8 · sim precompute (listings pehle se bano)
Viral key:    ${HOT} · cache coalesce --misses N --on · sim advance <s>
Communities:  tenant load · tenant quota <id> --cpu N · tenant replica <id>
Yaad rakho:   Reddit — precompute · Discord — coalescing · Jira — tenant isolation
Mat chhuna:   sim reset · sim inject`,
      responses: [],
      successText: `<b>Raat ki kahani:</b> front page har read par sort ho raha tha — Reddit ki tarah listing pehle se banayi (1) →
        viral channel ki ek key par 100 requests ek saath — Discord ki tarah coalescing (2) →
        ek bade community ki report ne sabka DB le liya — Jira ki tarah tenant ka hissa baandha (3).<br>
        <b>Seekh:</b> company kahaniyan "trivia" nahi — har ek ek <b>pattern</b> hai jo tumhari raat bachata hai: kaam pehle se karo, ek jaisi maang ko samet lo, ek tenant ko sabka hissa mat khaane do.`,
      solution: [
        'runbook', 'load --rps 500 --duration 8', 'sim precompute', 'load --rps 500 --duration 8',
        HOT, 'cache coalesce --misses 100 --on', 'sim advance 10', HOT,
        'tenant load', 'tenant quota mega --cpu 20', 'tenant load',
      ],
    }),
  });

  SD.addLab('notion-scale', {
    type: 'oncall', id: 'oncall-stories', shift: 'chaichat', title: '📟 On-call shift: teen kahaniyon wali raat',
    instructions: 'Reddit, Discord aur Jira ki seekh — ek raat mein. Har command = 1 minute. Theek karo, phir pakka karo.',
  });
})();
