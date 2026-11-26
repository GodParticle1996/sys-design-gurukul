/* 🎲 Chaos deck 'shapes' — shapes track, level realtime (engine: chaos.js; rt plugin: perfsim-pro.js)
   Swasth base: persist ON · pubsub ON · heartbeat 25s (proxy/NAT idle cut ~60s) · jitter ON · backlog-limit 500.
   Probes (base par): rt send → 90 ko turant push, 10 offline store · rt restart gateway-3 → 88/node/s, cascade nahi ·
   rt reconnect riya → 500 bheje, baaki users 150ms.
   Har card EK badlaav (perfsim par chala ke dekha, 2026-11-26):
     persist-off     rt send → 10 offline ke liye message hamesha ke liye gaya
     pubsub-off      rt send → sirf 5 ko push (sender ke gateway wale), 85 online ko kuch nahi
     heartbeat-off   rt send → 30 "online" sockets pehle hi kat chuke, push hawa mein · status: koi ping nahi
     heartbeat-slow  rt send → wahi 30 · status: ping har 90s (idle cut 60s)
     jitter-off      rt restart gateway-3 → 2,632/node/s (hadd ~1,000), 3 aur gateways gire
     backlog-off     rt reconnect riya → 40,000 ek saath, baaki users 12s ruke
   (Isi level ki on-call shift 'chatdock' persist/jitter/backlog ko alert ke saath sikhati hai; yahan alert nahi —
   teen probes se khud dhoondhna hai, aur pubsub/heartbeat naye hain.) */
(function () {
  const R = s => s.sys.rt;
  const hbOk = s => R(s).heartbeatSec > 0 && R(s).heartbeatSec < 60;
  const sendOk = f => r => r.kind === 'rt' && r.op === 'send' && f(r);
  const H1 = 'runbook ke teeno probe chalao: rt send, rt restart gateway-3, rt reconnect riya. Kaunsa jawab galat hai? Phir rt status — us hisse ki setting padho.';

  SD.chaos.addDeck({
    id: 'shapes', title: 'Realtime deck',
    sys: { name: 'chatdock-rt', rt: { persist: true, pubsub: true, heartbeatSec: 25, jitter: true, backlogLimit: 500 } },
    alert: '<b>📟 20:40 — ChatDock.</b> Kal raat saare chat gateways naye config template se dobara bane. Aaj support par teen tarah ki shikayatein: "message aaya hi nahi", "der se aaya", "chat atak gaya". Template mein <b>ek</b> setting galat hai. Shuru: <code>runbook</code>.',
    placeholder: 'runbook   (phir: rt send)',
    runbook: `# ChatDock gateways — probes
1. Group message:  rt send               → sabko turant push, offline ke liye store
2. Deploy drill:   rt restart gateway-3  → cascade nahi (har gateway ~1,000 reconnects/second tak)
3. Lambi chhutti:  rt reconnect riya     → us gateway ke baaki users 1 second se kam ruke
Settings:          rt status · rt persist on|off · rt pubsub on|off · rt heartbeat <sec>
                   rt jitter on|off · rt backlog-limit <N>
Niyam:             ek baar mein EK badlaav, phir wahi probe dobara.`,
    cards: [
      { id: 'persist-off', title: 'Messages store hona band (persist off — sirf push)',
        sys: { rt: { persist: false } },
        fixed: s => !!R(s).persist, verify: sendOk(r => r.lost === 0), verifyText: 'rt send — kisi ka message gaya nahi',
        hints: [H1, 'rt send: online ko mila, par 10 offline members ka message HAMESHA ke liye gaya. rt status: message kahin rakha bhi ja raha hai?', 'rt persist on, phir rt send.'],
        solution: ['runbook', 'rt send', 'rt status', 'rt persist on', 'rt send'],
        why: 'WebSocket sirf tez raasta hai, source of truth nahi. Persist band = jo connected nahi tha, uska message kahin rakha hi nahi. <b>Pehle store, phir push</b> — reconnect par last_seen_id se gap bharo.' },
      { id: 'pubsub-off', title: 'Gateways ke beech pub/sub band (har gateway sirf apne sockets jaanta hai)',
        sys: { rt: { pubsub: false } },
        fixed: s => !!R(s).pubsub, verify: sendOk(r => r.missedOnline === 0), verifyText: 'rt send — saare 90 online ko turant push',
        hints: [H1, 'rt send: sirf 5 ko push, 85 online members ko kuch nahi. Woh 5 kaun hain — sender ke hi gateway wale. rt status: gateways aapas mein baat karte hain?', 'rt pubsub on, phir rt send.'],
        solution: ['runbook', 'rt send', 'rt status', 'rt pubsub on', 'rt send'],
        why: 'User A gateway-3 par, B gateway-17 par. Bina <b>pub/sub</b> gateway-3 ko pata hi nahi B kahan hai — sirf apne sockets tak push. 20 gateways = zyada-tar members chhoot gaye. Gateway sockets rakhe, routing pub/sub kare.' },
      { id: 'heartbeat-off', title: 'Heartbeat (ping/pong) band ho gaya',
        sys: { rt: { heartbeatSec: 0 } },
        fixed: hbOk, verify: sendOk(r => r.ghost === 0), verifyText: 'rt send — koi mara hua "online" socket nahi',
        hints: [H1, 'rt send: 30 "online" members ka socket pehle hi kat chuka tha, server ko pata nahi. rt status: idle connection ko zinda kaun rakhta hai?', 'rt heartbeat 25 (60s se kam), phir rt send.'],
        solution: ['runbook', 'rt send', 'rt status', 'rt heartbeat 25', 'rt send'],
        why: 'Proxy/NAT ~60s idle connection chupchaap kaat dete hain. Ping na ho toh server mare socket ko "online" maanta hai, push hawa mein. <b>Heartbeat</b> idle cut se chhota: connection zinda, aur jo pong na de use offline maano.' },
      { id: 'heartbeat-slow', title: 'Heartbeat 25s se 90s kar diya gaya',
        sys: { rt: { heartbeatSec: 90 } },
        fixed: hbOk, verify: sendOk(r => r.ghost === 0), verifyText: 'rt send — koi mara hua "online" socket nahi',
        hints: [H1, 'rt send: 30 sockets kat chuke the. rt status: ping hai — par kitni der mein ek? Aur proxy/NAT kitni der idle sehte hain?', 'rt heartbeat 25, phir rt send.'],
        solution: ['runbook', 'rt send', 'rt status', 'rt heartbeat 25', 'rt send'],
        why: 'Ping hai, par 90s mein ek — proxy/NAT 60s par hi kaat dete hain. Heartbeat ka hona kaafi nahi; woh <b>idle cut se chhota</b> ho (25–30s aam hai). Setting maujood hai, par kaam nahi kar rahi.' },
      { id: 'jitter-off', title: 'Reconnect ka jitter band (sab clients fixed 1s baad)',
        sys: { rt: { jitter: false } },
        fixed: s => !!R(s).jitter, verify: r => r.kind === 'rt' && r.op === 'restart' && r.cascade === 0, verifyText: 'rt restart gateway-3 — cascade nahi',
        hints: [H1, 'rt restart gateway-3: 50,000 clients ~1 second mein lautte hain — baaki gateways par 2,632/node/second, hadd ~1,000. Cascade. rt status: reconnect kaise hota hai?', 'rt jitter on, phir rt restart gateway-3.'],
        solution: ['runbook', 'rt restart gateway-3', 'rt status', 'rt jitter on', 'rt restart gateway-3'],
        why: 'Sab clients theek 1s baad ek saath lautte hain — har gateway ki hadd se 2.6x, gateways girte jaate hain. <b>Exponential backoff + full jitter</b> lautna ~30s mein phailata hai: 88/node/second.' },
      { id: 'backlog-off', title: 'Reconnect par backlog ki hadd hat gayi',
        sys: { rt: { backlogLimit: 0 } },
        fixed: s => R(s).backlogLimit >= 100 && R(s).backlogLimit <= 2000, verify: r => r.kind === 'rt' && r.op === 'reconnect' && r.blockedMs <= 1000, verifyText: 'rt reconnect riya — baaki users 1s se kam ruke',
        hints: [H1, 'rt reconnect riya: 40,000 messages ek saath — us gateway ke baaki users 12 second ruke. rt status: ek baar mein kitne messages bheje jaate hain?', 'rt backlog-limit 500, phir rt reconnect riya.'],
        solution: ['runbook', 'rt reconnect riya', 'rt status', 'rt backlog-limit 500', 'rt reconnect riya'],
        why: 'Lambi chhutti ke baad 40,000 messages ek hi baar mein = gateway 12s busy, baaki sab atke. <b>Hadd + pagination</b>: pehle 500, baaki "aur load karo" par — 150ms.' },
    ],
  });

  SD.addLab('realtime', {
    type: 'chaos', id: 'chaos-shapes', deck: 'shapes', title: '🎲 Chaos round: naya gateway template',
    instructions: 'Teen probe, ek galat setting. Dhoondho, EK badlaav se theek karo, pakka karo — phir batao kya toota tha.',
  });
})();
