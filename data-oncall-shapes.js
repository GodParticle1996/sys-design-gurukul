/* 📟 On-call shift 'chatdock' — shapes track, level realtime (engine: oncall.js; rt plugin: perfsim-pro.js)
   Realtime shape ke teen sawaal (data-shapes.js realtime lesson):
     1 MessagesLostOffline  sirf push: 10 offline members ke liye message hamesha ke liye gaya → rt persist on → store, reconnect par milega
     2 ReconnectStorm       gateway deploy: 50,000 clients ~1s mein → 2,632/node/s (hadd ~1,000) → cascade → rt jitter on → 88/node/s
     3 BacklogBlocksGateway 3 din baad lauti user: 40,000 messages ek saath → gateway 12s ruka → rt backlog-limit 500 → 150ms
   Sab perfsim par chala ke dekha (2026-11-25). */
(function () {
  const R = s => s.sys.rt;
  const INC = [
    { id: 'MessagesLostOffline', sev: '🔴 SEV1', text: 'Users: "phone band tha, wapas aayi toh group ke messages gayab!" Support ke paas 300 tickets.',
      fixed: s => !!R(s).persist,
      verify: r => r.kind === 'rt' && r.op === 'send' && r.lost === 0,
      verifyText: 'rt send — offline members ke liye message store ho',
      hints: [
        'rt status, phir rt send — online ko mila, offline ka kya hua?',
        'WebSocket sirf tez raasta hai, source of truth nahi. Jo connected nahi tha, uske liye message kahin RAKHA hi nahi gaya. Pehle store, phir push — reconnect par last_seen_id se gap bharo.',
        'rt persist on, phir rt send.',
      ] },
    { id: 'ReconnectStorm', sev: '🔴 SEV1', text: 'gateway-3 ka deploy 22:00 par hai. Pichhli baar deploy ke baad 4 gateways ek ke baad ek gire the.',
      fixed: s => !!R(s).jitter,
      verify: r => r.kind === 'rt' && r.op === 'restart' && r.cascade === 0,
      verifyText: 'rt restart gateway-3 — cascade nahi',
      hints: [
        'rt restart gateway-3 — 50,000 clients kitni der mein lautte hain, aur baaki gateways par kitna bojh?',
        'Saare clients theek 1 second baad ek saath — har gateway ki reconnect hadd se 2.6x. Wahi retry storm. Lautna phailao: backoff + full jitter.',
        'rt jitter on, phir rt restart gateway-3.',
      ] },
    { id: 'BacklogBlocksGateway', sev: '🟠 SEV2', text: 'Ek user 3 din baad online hui — us gateway ke baaki users ka chat 12 second atak gaya.',
      fixed: s => R(s).backlogLimit >= 100 && R(s).backlogLimit <= 2000,
      verify: r => r.kind === 'rt' && r.op === 'reconnect' && r.blockedMs <= 1000,
      verifyText: 'rt reconnect riya — gateway 1s se kam ruka',
      hints: [
        'rt reconnect riya — kitne messages ek saath gaye, aur gateway kitni der ruka?',
        'Ek user ka 40,000 messages ka backlog ek hi baar mein = us gateway par sab ka nuksaan. Hadd lagao: thode messages, baaki "aur load karo" (pagination).',
        'rt backlog-limit 500, phir rt reconnect riya.',
      ] },
  ];

  SD.oncall.add({
    id: 'chatdock', start: 21 * 60 + 30, INC,
    build: ({ risky }) => ({
      sys: { name: 'chatdock-rt' },
      goal: '<b>ChatDock, 21:30.</b> 10 lakh log online — 20 WebSocket gateways, har ek par 50,000 sockets. Pager tumhare paas hai. Shuru: <code>runbook</code>.',
      placeholder: 'runbook   (phir: rt status)',
      runbook: `# ChatDock realtime runbook
Haal:         rt status
Test:         rt send (group message) · rt restart gateway-3 (deploy jaisa) · rt reconnect riya (3 din baad lauti)
Settings:     rt persist on|off · rt jitter on|off · rt backlog-limit <N>
Yaad rakho:   socket = tez raasta, source of truth nahi · reconnect = retry storm · ek user sabko na roke
Mat chhuna:   persist off · sim reset · sim inject`,
      responses: [
        risky(/^rt persist\s+off\b/i, 'Persist band karna mana — offline users ke messages phir hamesha ke liye jaayenge.'),
      ],
      successText: `<b>Raat ki kahani:</b> messages sirf push ho rahe the — offline member ke liye kuch rakha hi nahi gaya (1) → pehle store, phir push →
        gateway deploy par 50,000 clients ek second mein lautte, baaki gateways ki hadd se 2.6x — cascade (2) → backoff + full jitter →
        aur ek lambe offline user ke 40,000 messages ne poora gateway 12s roka (3) → backlog ki hadd + pagination.<br>
        <b>Seekh:</b> realtime mein connection ek <b>resource</b> hai: message ka ghar (store), lautne ki raftaar (jitter), aur ek user ka hissa (limit) — teeno design mein pehle se.<br>
        <b>Postmortem action items:</b> persist-then-push default · client SDK mein jitter · gateway deploy dheere (rolling) · backlog pagination.`,
      solution: [
        'runbook', 'rt status', 'rt send', 'rt persist on', 'rt send',
        'rt restart gateway-3', 'rt jitter on', 'rt restart gateway-3',
        'rt reconnect riya', 'rt backlog-limit 500', 'rt reconnect riya',
      ],
    }),
  });

  SD.addLab('realtime', {
    type: 'oncall', id: 'oncall-shapes', shift: 'chatdock', title: '📟 On-call shift: 10 lakh sockets ki raat',
    instructions: 'Realtime chat live hai. Har command = 1 minute. Theek karo, phir pakka karo — khatarnaak commands gine jaate hain.',
  });
})();
