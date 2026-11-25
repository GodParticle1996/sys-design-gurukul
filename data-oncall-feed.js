/* 📟 On-call shift 'edgepost' — boss-feed (engine: oncall.js; fleet plugin: perfsim-pro.js)
   Cloudflare 18 Nov 2025 ka aakaar (data-feed.js pm-config) — trigger / amplifier / blind spot:
     1 EdgeFlicker5xx    har 5 min nayi feature file: 230 (hadd 200 → panic) / 60 → outage flicker, "DDoS?"
                         → fleet generator pause + fleet rollback → 0/6 down
     2 BotScoresStale    generator band rakhna bhi nuksaan; ClickHouse fix kal → fleet validate on + generator resume
                         → 230 wali file REJECT, 5xx 0  (config = input; panic ki jagah purani file)
     3 StatusPageLied    status page internal probes se — proxy gira toh "hara" → fleet probe external
   Sab perfsim par chala ke dekha (2026-11-25). */
(function () {
  const F = s => s.sys.fleet;
  const INC = [
    { id: 'EdgeFlicker5xx', sev: '🔴 SEV1', text: 'Saare regions mein 5xx — aate hain, chale jaate hain, phir aate hain. On-call chat: "DDoS hai kya?"',
      fixed: s => !F(s).generator && F(s).down === 0,
      verify: r => r.kind === 'fleet' && ((r.op === 'run' && r.errMinutes === 0) || (r.op === 'status' && r.down === 0)),
      verifyText: 'fleet status ya fleet run 10 — 0/6 down',
      hints: [
        'fleet status, phir fleet history — pichhle 30 minute mein kya DEPLOY hua? Failure ka koi period hai?',
        'Har 5 minute ek nayi feature file — kabhi 230 features (proxy ki hadd 200), kabhi 60. Attack nahi, apni hi config. Pehle khoon roko: nayi files band, aur sab regions purani achhi file par.',
        'fleet generator pause, fleet rollback, phir fleet run 10.',
      ] },
    { id: 'BotScoresStale', sev: '🟠 SEV2', text: 'Generator band hai toh bot scores purane ho rahe — spam bots ghus rahe. Generator chalana padega, par ClickHouse ka fix kal tak: file kabhi bhi 200 se badi ho sakti hai.',
      fixed: s => !!F(s).validate && !!F(s).generator,
      verify: r => r.kind === 'fleet' && r.op === 'run' && r.rejected >= 1 && r.errMinutes === 0,
      verifyText: 'fleet run 10 — kharab file REJECT, 5xx 0',
      hints: [
        'fleet status — validate kya hai? Generator band rakhna bhi ek nuksaan hai.',
        'Config ek INPUT hai — apni banayi file ko bhi user ke input jaisa jaancho. 200 se badi file: reject + alert + purani file par raho. Panic kabhi nahi.',
        'fleet validate on, fleet generator resume, phir fleet run 10.',
      ] },
    { id: 'StatusPageLied', sev: '🟠 SEV2', text: 'Customers twitter par: "20 minute tak 5xx — aapka status page hara kyun tha?"',
      fixed: s => F(s).probes === 'external',
      verify: r => r.kind === 'fleet' && r.op === 'status' && r.probes === 'external',
      verifyText: 'fleet status — status page bahar ke probes se',
      hints: [
        'fleet status — status page kis raaste se probe karta hai?',
        'Probes usi proxy ke andar se jaate the jo gira tha — gire hue system ne apni hi report di. Sawaal: "kya main is system ko is system ke BINA dekh sakta hoon?"',
        'fleet probe external, phir fleet status.',
      ] },
  ];

  SD.oncall.add({
    id: 'edgepost', start: 2 * 60 + 20, INC,
    build: ({ risky }) => ({
      sys: { name: 'edgepost-proxy' },
      goal: '<b>EdgePost, 02:20.</b> 6 regions mein edge proxy. Bot Management har 5 minute ek "feature file" banata hai, aur proxy use padhta hai (hadd: 200 features). Shuru: <code>runbook</code>.',
      placeholder: 'runbook   (phir: fleet status)',
      runbook: `# EdgePost on-call runbook
Haal:         fleet status (regions + status page) · fleet history (pichhle pushes)
Dekhna:       fleet run 10  (10 minute = 2 feature-file slots)
Rokna:        fleet generator pause|resume · fleet rollback (sab regions last-known-good par)
Bachav:       fleet validate on|off · fleet staged on|off · fleet probe internal|external
Anjaan outage ke 4 sawaal:
  1. pichhle 30 min mein kya DEPLOY hua? (config, permission, flag bhi deploy hain)
  2. failure ka koi PERIOD hai? (har 5 min → koi generator/cron)
  3. bahar ka load hatane se theek hota hai?
  4. kya main is system ko is system ke BINA dekh sakta hoon?
Mat chhuna:   validate off · sim reset · sim inject`,
      responses: [
        risky(/^fleet validate\s+off\b/i, 'Validation band karna mana — agli badi file phir sab regions mein panic karayegi.'),
      ],
      successText: `<b>Raat ki kahani:</b> ClickHouse ke permission change ne feature file ko 200 se bada kar diya — par sirf aadhe nodes par, toh outage flicker kar raha tha aur attack jaisa dikha (1) →
        generator roka, purani file (trigger rok, khoon band) → generator chalana zaroori tha, toh config ko <b>input</b> maana: badi file reject, purani par (2) →
        aur status page poori der hara tha kyunki probes usi gire hue proxy se jaate the (3) → bahar se probe.<br>
        <b>Seekh (trigger / amplifier / blind spot):</b> trigger (permission change) rokna mushkil; <b>amplifier</b> (hadd + panic, global push) design ka kaam — validation, graceful degradation, staged rollout; <b>blind spot</b> (monitoring usi raaste) monitoring ka kaam.<br>
        <b>Postmortem action items:</b> generated config ka schema + row-count check · panic ki jagah LKG · config bhi staged (fleet staged on: 1 region → baaki) · status page bahar se.`,
      solution: [
        'runbook', 'fleet status', 'fleet history', 'fleet run 10', 'fleet generator pause', 'fleet rollback', 'fleet run 10',
        'fleet status', 'fleet validate on', 'fleet generator resume', 'fleet run 10',
        'fleet probe external', 'fleet status',
      ],
    }),
  });

  SD.addLab('boss-feed', {
    type: 'oncall', id: 'oncall-feed', shift: 'edgepost', title: '📟 On-call shift: flicker karta outage',
    instructions: 'Edge proxy, 6 regions, ek feature file. Har command = 1 minute. Trigger roko, amplifier todo, blind spot band karo.',
  });
})();
