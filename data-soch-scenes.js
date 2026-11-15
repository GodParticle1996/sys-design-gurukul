/* =====================================================================
   System Gurukul — Soch Akhada: har scenario ki ghatna kadam-dar-kadam (scene.js)
   NIYAM: scene sirf GHATNA dikhata hai — kaun kya bheja, kis dabbe ne kya dekha.
   Asli wajah ya hal ka naam scene mein MAT likho; scenario ke sawaal wahi poochhte hain.
   Data scenario ke `scene` field mein jaata hai (soch.js kahani ke neeche dikhata hai).
   ===================================================================== */
(function () {
  const S = {

    'stale-balance': { nodes: [
      { id: 'riya', col: 0, row: 0, icon: '👩', label: 'Riya', tone: 'accent' },
      { id: 'api', col: 1, row: 1, icon: '⚙️', label: 'wallet-api' },
      { id: 'pri', col: 2, row: 0, icon: '✍️', label: 'pg-primary' },
      { id: 'rep', col: 2, row: 2, icon: '🪞', label: 'pg-replica-1' },
      { id: 'aman', col: 0, row: 2, icon: '👨', label: 'Aman', tone: 'accent' },
    ], steps: [
      { from: 'riya', to: 'api', label: 'Aman ko ₹100', say: 'Riya Aman ko ₹100 bhejti hai.' },
      { from: 'api', to: 'pri', label: 'write', tone: 'good', set: { pri: { sub: 'Aman: ₹600' } }, say: 'wallet-api write pg-primary par karta hai. Riya ko "Success" dikhta hai.' },
      { from: 'aman', to: 'api', label: 'turant app kholi', say: 'Aman turant app kholta hai.' },
      { from: 'api', to: 'rep', label: 'read', tone: 'bad', set: { rep: { tone: 'bad', sub: 'Aman: ₹500' }, aman: { tone: 'bad', sub: '₹500 dikha 🤔' } }, say: 'Read pg-replica-1 se jaata hai. Aman ko ₹500 dikhta hai. 2 second baad refresh par ₹600.' },
    ] },

    'cache-stampede': { nodes: [
      { id: 'users', col: 0, row: 1, icon: '👥', label: 'Home screen', sub: '20,000 req/s', tone: 'accent' },
      { id: 'redis', col: 1, row: 1, icon: '🧠', label: 'Redis', sub: 'offers:today · TTL 60 s' },
      { id: 'db', col: 2, row: 1, icon: '🗄️', label: 'offers-db', sub: 'query 800 ms' },
    ], steps: [
      { from: 'users', to: 'redis', label: 'HIT', tone: 'good', say: '59 second tak sab theek: har request Redis se jawab paati hai.' },
      { at: ['redis'], set: { redis: { tone: 'bad', sub: 'key expire hui' } }, say: '60ve second par key offers:today expire hoti hai.' },
      { from: 'redis', to: 'db', label: 'MISS, MISS, MISS…', tone: 'bad', set: { db: { tone: 'bad', sub: 'CPU 100% 🔥' } }, say: 'Nayi key banne mein 800 ms lagte hain. Us beech aane wali har request MISS paati hai aur offers-db tak jaati hai.' },
      { at: ['users'], set: { users: { tone: 'bad', sub: 'screen 4 s 😴' } }, say: 'Home screen 4 second leti hai. Har 60 second par wahi kahani.' },
    ] },

    'stale-offer-cache': { nodes: [
      { id: 'm', col: 0, row: 0, icon: '🍬', label: 'Sharma Sweets', tone: 'accent' },
      { id: 'mapi', col: 1, row: 0, icon: '⚙️', label: 'merchant-api' },
      { id: 'mdb', col: 2, row: 0, icon: '🗄️', label: 'merchant-db', sub: 'cashback 10%' },
      { id: 'redis', col: 2, row: 1, icon: '🧠', label: 'Redis', sub: 'merchant:42 = 10%' },
      { id: 'app', col: 1, row: 1, icon: '📱', label: 'User app' },
    ], steps: [
      { from: 'm', to: 'mapi', label: 'cashback 10% → 5%', say: 'Sharma Sweets dashboard par cashback 10% se 5% karta hai.' },
      { from: 'mapi', to: 'mdb', label: 'UPDATE', tone: 'good', set: { mdb: { tone: 'good', sub: 'cashback 5% ✅' } }, say: 'merchant-api merchant-db update kar deta hai.' },
      { from: 'app', to: 'redis', label: 'merchant:42?', tone: 'bad', set: { redis: { tone: 'bad', sub: 'ab bhi 10% · TTL 10 min' } }, say: 'User app cashback Redis se padhti hai. Wahan ab bhi 10% hai.' },
      { at: ['app'], set: { app: { tone: 'bad', sub: '300 payments @ 10%' } }, say: '10 minute tak app 10% dikhati rahi. 300 logon ne 10% maankar payment kiya.' },
    ] },

    'hot-shard': { nodes: [
      { id: 'd11', col: 0, row: 1, icon: '🏏', label: 'DreamTeam11', sub: '40% transactions', tone: 'accent' },
      { id: 'route', col: 1, row: 1, icon: '#️⃣', label: 'hash(merchant) % 8' },
      { id: 's3', col: 2, row: 1, icon: '🗄️', label: 'Shard 3' },
      { id: 'rest', col: 2, row: 0, icon: '🗄️', label: 'Baaki 7 shards', sub: '15% CPU' },
    ], steps: [
      { from: 'd11', to: 'route', label: 'naye payments', say: 'IPL final ki raat DreamTeam11 akela 40% naye payments la raha hai.' },
      { from: 'route', to: 's3', label: 'merchant 42 → 3', tone: 'bad', set: { s3: { tone: 'bad', sub: '95% CPU 🔥' } }, say: 'Shard ka faisla merchant_id se hota hai. DreamTeam11 ke saare rows shard 3 par.' },
      { from: 'route', to: 'rest', label: 'baaki merchants', tone: 'good', say: 'Baaki merchants 7 shards par bante hain: 15% CPU.' },
    ] },

    'pool-exhaust': { nodes: [
      { id: 'u', col: 0, row: 0, icon: '📄', label: '25 statement PDFs', sub: 'subah 9 baje' },
      { id: 'o', col: 0, row: 2, icon: '👥', label: 'Baaki requests', tone: 'accent' },
      { id: 'api', col: 1, row: 1, icon: '⚙️', label: 'wallet-api', sub: 'CPU 12%' },
      { id: 'pool', col: 2, row: 1, icon: '⏳', label: 'DB pool', sub: '20 connections' },
      { id: 'db', col: 3, row: 1, icon: '🗄️', label: 'pg-primary', sub: 'CPU 20%' },
    ], steps: [
      { from: 'u', to: 'api', label: '25 log ek saath', say: 'Subah 9 baje 25 log ek saath mahine ka statement PDF maangte hain.' },
      { from: 'api', to: 'pool', label: 'connection lo', set: { pool: { tone: 'bad', sub: '20/20 busy' } }, say: 'Har statement query 8 second leti hai. 20 connections statement queries ke paas.' },
      { from: 'pool', to: 'db', label: '8 s query ×20', say: 'pg-primary ka CPU sirf 20%.' },
      { from: 'o', to: 'api', label: 'balance, history', tone: 'bad', set: { o: { tone: 'bad', sub: '30% timeout (5 s)' } }, say: 'Baaki requests ko connection nahi milta. 5 second baad 30% timeout. wallet-api ka CPU 12%.' },
    ] },

    'migration-lock': { nodes: [
      { id: 'dev', col: 0, row: 0, icon: '🧑‍💻', label: 'Developer', sub: 'dopahar 2 baje' },
      { id: 'tbl', col: 1, row: 1, icon: '🗄️', label: 'transactions', sub: '40 crore rows' },
      { id: 'pay', col: 0, row: 2, icon: '💳', label: 'Payments', tone: 'accent' },
    ], steps: [
      { from: 'dev', to: 'tbl', label: 'ALTER … TYPE BIGINT', tone: 'gold', set: { tbl: { tone: 'gold', sub: 'migration chal raha' } }, say: 'Developer amount column INTEGER se BIGINT karta hai.' },
      { from: 'pay', to: 'tbl', label: 'INSERT payment', tone: 'bad', set: { pay: { tone: 'bad', sub: 'latke hue ⏳' } }, say: 'Usi pal se har payment latak jaata hai.' },
      { at: ['tbl'], set: { tbl: { tone: 'good', sub: 'migration poora' }, pay: { tone: 'good', sub: 'chal pade' } }, say: '25 minute baad migration poora hota hai, aur payments apne aap chal padte hain.' },
    ] },

    'nplus1-screen': { nodes: [
      { id: 'app', col: 0, row: 1, icon: '📱', label: 'Recent txns screen', tone: 'accent' },
      { id: 'api', col: 1, row: 1, icon: '⚙️', label: 'wallet-api', sub: 'region A' },
      { id: 'db', col: 3, row: 1, icon: '🗄️', label: 'Database', sub: 'region B' },
      { id: 'net', col: 2, row: 0, icon: '🌐', label: 'Round trip', sub: '30 ms har baar' },
    ], steps: [
      { from: 'app', to: 'api', label: 'screen kholo', say: 'User Recent transactions screen kholta hai: 50 transactions, har ek ke saath merchant ka naam.' },
      { from: 'api', to: 'db', label: 'query 1: 50 txns', say: 'Pehli query: user ke 50 transactions (12 ms).' },
      { from: 'api', to: 'db', label: 'merchant id=? × 50', tone: 'bad', set: { db: { tone: 'bad', sub: '51 queries' } }, say: 'Phir 50 baar: SELECT * FROM merchants WHERE id = ?. Har query DB mein 2 ms.' },
      { at: ['net', 'app'], set: { app: { tone: 'bad', sub: '1.8 s 😴' } }, say: 'wallet-api aur database alag region mein: har query ka aana-jaana 30 ms. Screen 1.8 second leti hai.' },
    ] },

    'double-debit': { nodes: [
      { id: 'riya', col: 0, row: 1, icon: '📱', label: 'Riya (metro)', sub: 'kamzor network', tone: 'accent' },
      { id: 'api', col: 1, row: 1, icon: '⚙️', label: 'pay-api' },
      { id: 'bank', col: 2, row: 1, icon: '🏦', label: 'Riya ka account', sub: '₹5,000' },
    ], steps: [
      { from: 'riya', to: 'api', label: 'POST /payments ₹500', say: 'Riya ₹500 ka payment karti hai.' },
      { from: 'api', to: 'bank', label: '−₹500', set: { bank: { sub: '₹4,500' } }, say: 'pay-api tak request pahunchi aur ₹500 kat gaye.' },
      { from: 'api', to: 'riya', label: 'jawab kho gaya', tone: 'bad', say: 'Jawab raaste mein kho gaya. 10 second baad app "Dobara koshish karo" dikhati hai.' },
      { from: 'riya', to: 'api', label: 'POST /payments ₹500', tone: 'gold', say: 'Riya button dabati hai. App wahi request dobara bhejti hai.' },
      { from: 'api', to: 'bank', label: '−₹500 (phir)', tone: 'bad', set: { bank: { tone: 'bad', sub: '₹4,000 😱' } }, say: 'pay-api ne doosri request ko bhi naya payment maana. Riya ke ₹1,000 kat gaye.' },
    ] },

    'deep-offset': { nodes: [
      { id: 'm', col: 0, row: 1, icon: '🏪', label: 'Bada merchant', sub: 'page 40,000', tone: 'accent' },
      { id: 'api', col: 1, row: 1, icon: '⚙️', label: 'transactions-api' },
      { id: 'db', col: 2, row: 1, icon: '🗄️', label: 'Postgres', sub: '2.4 crore rows' },
    ], steps: [
      { from: 'm', to: 'api', label: 'page=1', tone: 'good', say: 'Page 1 turant khulta hai.' },
      { from: 'm', to: 'api', label: 'page=40000&size=50', say: 'Merchant page 40,000 kholta hai.' },
      { from: 'api', to: 'db', label: 'OFFSET 1,999,950', tone: 'bad', set: { db: { tone: 'bad', sub: '9 s · kabhi timeout' } }, say: 'SQL: ORDER BY created_at DESC LIMIT 50 OFFSET 1999950. Page 9 second leta hai, kabhi timeout.' },
    ] },

    'rate-limit-nat': { nodes: [
      { id: 'hostel', col: 0, row: 0, icon: '🏫', label: 'Hostel', sub: '3,000 students, 1 IP' },
      { id: 'gw', col: 1, row: 1, icon: '🚪', label: 'api-gateway', sub: '100 req/min per IP' },
      { id: 'bots', col: 0, row: 2, icon: '🤖', label: 'Bot farm', sub: '5,000 IPs' },
      { id: 'api', col: 2, row: 1, icon: '⚙️', label: 'ChaiPay APIs' },
    ], steps: [
      { from: 'hostel', to: 'gw', label: 'ek hi public IP', tone: 'bad', set: { hostel: { tone: 'bad', sub: '429 Too Many Requests' } }, say: 'Hostel ka saara traffic ek public IP se nikalta hai (NAT). 3,000 students ko 429 milta hai.' },
      { from: 'bots', to: 'gw', label: '50 req/min per IP', say: 'Bot har IP se sirf 50 request per minute bhejta hai.' },
      { from: 'gw', to: 'api', label: 'bots aaram se andar', tone: 'bad', say: 'Bot farm ki requests limit ke neeche hain, isliye andar aa jaati hain.' },
    ] },

    'breaking-change': { nodes: [
      { id: 'api', col: 1, row: 1, icon: '⚙️', label: 'wallet-api', sub: 'naya deploy' },
      { id: 'web', col: 2, row: 0, icon: '🌐', label: 'Web app', sub: 'usi din update' },
      { id: 'old', col: 2, row: 2, icon: '📱', label: 'Purani Android app', sub: '60% users' },
    ], steps: [
      { at: ['api'], set: { api: { sub: 'balance → balance_paise' } }, say: 'wallet-api response mein field balance hata kar balance_paise kar diya.' },
      { from: 'api', to: 'web', label: 'balance_paise', tone: 'good', say: 'Web app usi din update hui. Sab theek.' },
      { from: 'api', to: 'old', label: 'balance_paise', tone: 'bad', set: { old: { tone: 'bad', sub: 'balance ₹0 dikha 😱' } }, say: 'Purani Android app balance field dhoondti hai. Field nahi mila, toh app ₹0 dikhati hai. Paisa kisi ka nahi gaya.' },
    ] },

    'sync-chain': { nodes: [
      { id: 'u', col: 0, row: 1, icon: '📱', label: 'User', sub: '"Pay" dabaya', tone: 'accent' },
      { id: 'api', col: 1, row: 1, icon: '⚙️', label: 'pay-api' },
      { id: 'fraud', col: 2, row: 0, icon: '🕵️', label: 'Fraud check', sub: '150 ms' },
      { id: 'debit', col: 3, row: 0, icon: '💸', label: 'Paisa kaatna', sub: '200 ms' },
      { id: 'sms', col: 2, row: 1, icon: '✉️', label: 'SMS', sub: '900 ms (kabhi 5 s)' },
      { id: 'cb', col: 2, row: 2, icon: '🎁', label: 'Cashback', sub: '400 ms' },
      { id: 'an', col: 3, row: 2, icon: '📊', label: 'Analytics', sub: '450 ms' },
    ], steps: [
      { from: 'u', to: 'api', label: 'Pay', say: 'User "Pay" dabata hai.' },
      { from: 'api', to: 'fraud', label: '1', say: 'pay-api ek ke baad ek kaam karta hai. Pehle fraud check.' },
      { at: ['debit', 'sms', 'cb', 'an'], say: 'Phir paisa kaatna, SMS, cashback, analytics — har ek ke khatam hone ka intezaar.' },
      { at: ['u'], set: { u: { tone: 'bad', sub: '2.1 s · kabhi 6 s' } }, say: 'Poora payment 2.1 second. Jis din SMS provider dheema, 6 second, aur log button dobara dabate hain.' },
    ] },

    'tail-latency': { nodes: [
      { id: 'home', col: 0, row: 1, icon: '🏠', label: 'Home screen', tone: 'accent' },
      { id: 'agg', col: 1, row: 1, icon: '⚙️', label: 'home-api' },
      { id: 's1', col: 2, row: 0, icon: '💰', label: 'balance' },
      { id: 's2', col: 2, row: 1, icon: '🎁', label: 'offers' },
      { id: 's3', col: 2, row: 2, icon: '🧾', label: 'bills + 7 aur' },
    ], steps: [
      { from: 'home', to: 'agg', label: 'screen kholo', say: 'Home screen ek request mein 10 services ko call karti hai.' },
      { at: ['s1', 's2', 's3'], set: { s1: { sub: '99% < 100 ms' }, s2: { sub: '99% < 100 ms' }, s3: { sub: '99% < 100 ms' } }, say: 'Har service ka dashboard: "99% requests 100 ms se kam". 1% lagbhag 1 second.' },
      { at: ['agg'], say: 'Saari 10 calls ek saath jaati hain. Screen tab tak rukti hai jab tak saari 10 jawab na de dein.' },
      { at: ['home'], set: { home: { tone: 'bad', sub: '~10 mein 1 dheemi' } }, say: 'Phir bhi har 10 mein se lagbhag 1 home screen 1 second se zyada leti hai.' },
    ] },

    'long-conn-skew': { nodes: [
      { id: 'phones', col: 0, row: 1, icon: '📱', label: 'Phone apps', sub: 'WebSocket, ghanton', tone: 'accent' },
      { id: 'lb', col: 1, row: 1, icon: '⚖️', label: 'Load balancer' },
      { id: 'old', col: 2, row: 0, icon: '🖥️', label: '4 purane servers', sub: '90% CPU' },
      { id: 'new', col: 2, row: 2, icon: '🖥️', label: '4 naye servers' },
    ], steps: [
      { from: 'phones', to: 'lb', label: 'lambe connections', say: 'Phone apps notify-gateway se ghanton tak khule WebSocket connections rakhti hain.' },
      { at: ['new'], set: { new: { tone: 'good', sub: 'abhi jode' } }, say: 'Purane 4 servers 90% CPU par the. Team 4 naye servers jodti hai.' },
      { from: 'lb', to: 'new', label: 'sirf naye connections', say: 'Load balancer sirf naye connections baantta hai, sabse kam connection wale server ko.' },
      { at: ['old', 'new'], set: { old: { tone: 'bad', sub: '1 ghante baad: 85%' }, new: { tone: 'bad', sub: '1 ghante baad: 5%' } }, say: '1 ghante baad: purane servers 85%, naye sirf 5%.' },
    ] },

    'retry-storm': { nodes: [
      { id: 'pay', col: 0, row: 1, icon: '⚙️', label: 'pay-api', sub: 'timeout 1 s', tone: 'accent' },
      { id: 'led', col: 1, row: 1, icon: '📒', label: 'ledger-service', sub: '2,000 req/s' },
      { id: 'db', col: 2, row: 1, icon: '🗄️', label: 'ledger DB', sub: 'ek dheemi query' },
    ], steps: [
      { at: ['db', 'led'], set: { led: { tone: 'gold', sub: 'ab 2 s per request' } }, say: 'Ek dheemi query ki wajah se ledger-service 2 second lene lagi.' },
      { from: 'pay', to: 'led', label: '1 s timeout → fail', tone: 'bad', say: 'pay-api ka timeout 1 second: request fail.' },
      { from: 'pay', to: 'led', label: 'turant 3 retries', tone: 'bad', set: { led: { tone: 'bad', sub: '8,000 req/s' } }, say: 'Fail hote hi pay-api turant 3 baar retry karta hai, bina ruke. ledger-service par 8,000 request har second.' },
      { at: ['led'], set: { led: { tone: 'bad', sub: 'poori tarah giri 💀' } }, say: '5 minute mein ledger-service poori tarah gir gayi.' },
    ] },

    'hung-dependency': { nodes: [
      { id: 'u', col: 0, row: 1, icon: '👥', label: 'Requests', sub: '40% pay · 60% balance', tone: 'accent' },
      { id: 'pay', col: 1, row: 1, icon: '⚙️', label: 'pay-api', sub: '200 worker threads' },
      { id: 'fraud', col: 2, row: 1, icon: '🕵️', label: 'fraud-check' },
    ], steps: [
      { at: ['fraud'], set: { fraud: { tone: 'bad', sub: 'chuppi (error bhi nahi)' } }, say: 'fraud-check jawab dena band karta hai: error nahi, bas chuppi.' },
      { from: 'pay', to: 'fraud', label: 'payment calls, bina timeout', tone: 'bad', set: { pay: { tone: 'bad', sub: 'threads intezaar mein' } }, say: 'Payment requests fraud-check ke jawab ka intezaar karti rehti hain.' },
      { from: 'u', to: 'pay', label: 'balance dekhna', tone: 'bad', set: { pay: { tone: 'bad', sub: '200/200 threads busy' }, u: { tone: 'bad', sub: 'sab band' } }, say: '3 minute mein pay-api saari requests lena band kar deta hai — balance dekhna bhi, jiska fraud-check se koi lena-dena nahi.' },
    ] },

    'poison-message': { nodes: [
      { id: 'q', col: 0, row: 1, icon: '📮', label: 'cashback queue', tone: 'accent' },
      { id: 'w', col: 1, row: 1, icon: '👷', label: 'cashback-worker' },
      { id: 'db', col: 2, row: 1, icon: '🗄️', label: 'wallet DB' },
    ], steps: [
      { from: 'q', to: 'w', label: 'amount: "abc"', tone: 'bad', say: 'Raat 1 baje queue mein ek message aata hai: amount ki jagah "abc".' },
      { at: ['w'], set: { w: { tone: 'bad', sub: 'crash 💥' } }, say: 'Worker crash hota hai. Message queue mein sabse aage laut aata hai.' },
      { from: 'q', to: 'w', label: 'wahi message phir', tone: 'bad', say: 'Worker phir wahi message uthata hai, phir crash. Baar-baar.' },
      { at: ['q'], set: { q: { tone: 'bad', sub: '6 lakh atke' } }, say: 'Queue kram se chalti hai. Subah tak 6 lakh cashback atke pade hain.' },
    ] },

    'flash-sale': { nodes: [
      { id: 'u', col: 0, row: 1, icon: '🌊', label: 'Users', sub: '12:00:00 → 60,000 req/s', tone: 'accent' },
      { id: 'pay', col: 1, row: 1, icon: '⚙️', label: 'pay-api', sub: 'capacity 8,000 req/s' },
      { id: 'as', col: 1, row: 0, icon: '📈', label: 'Autoscaling', sub: 'naye server: 3 min' },
      { id: 'tix', col: 2, row: 1, icon: '🎟️', label: 'Tickets', sub: 'sirf 10,000' },
    ], steps: [
      { from: 'u', to: 'pay', label: '60,000 req/s', tone: 'bad', say: '12:00:00 par bojh 3,000 se 60,000 request/second.' },
      { at: ['pay'], set: { pay: { tone: 'bad', sub: 'har request 30 s' } }, say: '20 second mein har request 30 second lene lagi.' },
      { at: ['as'], say: 'Autoscaling naye servers 3 minute mein laata hai.' },
      { from: 'u', to: 'pay', label: '10 s timeout → retry', tone: 'bad', set: { tix: { tone: 'bad', sub: 'lagbhag koi nahi bika' } }, say: 'App 10 second par timeout hokar retry karti hai. Lagbhag koi payment poora nahi hua.' },
    ] },

    'optional-dep': { nodes: [
      { id: 'u', col: 0, row: 1, icon: '🛒', label: 'Checkout screen', tone: 'accent' },
      { id: 'pay', col: 1, row: 1, icon: '⚙️', label: 'pay-api' },
      { id: 'rw', col: 2, row: 1, icon: '⭐', label: 'rewards-service' },
    ], steps: [
      { from: 'u', to: 'pay', label: 'checkout kholo', say: 'User checkout screen kholta hai.' },
      { from: 'pay', to: 'rw', label: '"20 reward points" line', tone: 'bad', set: { rw: { tone: 'bad', sub: 'aaj band 💤' } }, say: 'pay-api jawab mein reward points ki line jodne ke liye rewards-service ko call karta hai. rewards-service aaj band hai.' },
      { from: 'pay', to: 'u', label: '500', tone: 'bad', set: { u: { tone: 'bad', sub: '"Something went wrong"' } }, say: 'Call fail hui toh pay-api poora jawab 500 kar deta hai. Checkout khulta hi nahi.' },
    ] },

    'replica-not-backup': { nodes: [
      { id: 'eng', col: 0, row: 1, icon: '😰', label: 'Engineer', sub: 'WHERE bhool gaya', tone: 'accent' },
      { id: 'pri', col: 1, row: 1, icon: '✍️', label: 'pg-primary', sub: 'merchants table' },
      { id: 'rep', col: 2, row: 1, icon: '🪞', label: 'pg-replica-1' },
      { id: 'bk', col: 1, row: 2, icon: '💾', label: 'Aakhri backup', sub: '6 din purana' },
    ], steps: [
      { from: 'eng', to: 'pri', label: 'DELETE FROM merchants', tone: 'bad', set: { pri: { tone: 'bad', sub: 'merchants: 0 rows' } }, say: 'Engineer galti se production par DELETE FROM merchants chala deta hai.' },
      { from: 'pri', to: 'rep', label: 'har badlaav copy', tone: 'bad', set: { rep: { tone: 'bad', sub: 'merchants: 0 rows' } }, say: 'Team sochti hai: "pg-replica-1 hai na." 1 second ke andar pg-replica-1 ki table bhi khaali.' },
      { at: ['bk'], set: { bk: { tone: 'gold', sub: '6 din purana, test nahi' } }, say: 'Aakhri backup 6 din purana hai, aur kabhi restore karke dekha nahi gaya.' },
    ] },

    'dual-write': { nodes: [
      { id: 'pay', col: 0, row: 1, icon: '⚙️', label: 'pay-api', tone: 'accent' },
      { id: 'db', col: 1, row: 0, icon: '🗄️', label: 'pay-db' },
      { id: 'k', col: 1, row: 2, icon: '📨', label: 'Kafka', sub: '90 s band' },
      { id: 'cb', col: 2, row: 2, icon: '🎁', label: 'cashback-service' },
    ], steps: [
      { from: 'pay', to: 'db', label: '1. commit payment', tone: 'good', say: 'pay-api pehle payment pay-db mein commit karta hai.' },
      { from: 'pay', to: 'k', label: '2. PaymentDone ❌', tone: 'bad', set: { k: { tone: 'bad', sub: 'band tha · event gaya nahi' } }, say: 'Phir Kafka par event bhejta hai. Kafka 90 second band tha; code sirf error log karke aage badh gaya.' },
      { at: ['cb'], set: { cb: { tone: 'bad', sub: '1,200 cashback gayab' } }, say: '1,200 payments pay-db mein hain, Kafka mein unke events nahi. cashback-service ko pata hi nahi chala.' },
    ] },

    'saga-half': { nodes: [
      { id: 'aman', col: 0, row: 1, icon: '👨', label: 'Aman', tone: 'accent' },
      { id: 'book', col: 1, row: 0, icon: '💺', label: 'booking-service' },
      { id: 'pay', col: 1, row: 1, icon: '💳', label: 'pay-service' },
      { id: 'tix', col: 1, row: 2, icon: '🎟️', label: 'ticket-service' },
    ], steps: [
      { from: 'aman', to: 'book', label: '1. seat roko', tone: 'good', set: { book: { tone: 'good', sub: 'seat ruki' } }, say: 'booking-service seat rok leta hai.' },
      { from: 'aman', to: 'pay', label: '2. paisa kaato', tone: 'good', set: { pay: { tone: 'good', sub: '₹250 kata' } }, say: 'pay-service Aman ka paisa kaat leta hai.' },
      { from: 'aman', to: 'tix', label: '3. ticket banao', tone: 'bad', set: { tix: { tone: 'bad', sub: 'fail ❌' } }, say: 'ticket-service fail ho jaata hai.' },
      { at: ['aman'], set: { aman: { tone: 'bad', sub: 'na ticket, na paisa' }, book: { tone: 'gold', sub: 'seat ab bhi ruki' } }, say: 'Pichhle kadam wapas nahi hote. Aman ke paas na ticket, na paisa, aur seat ruki hui.' },
    ] },

    'dup-consume': { nodes: [
      { id: 'k', col: 0, row: 1, icon: '📨', label: 'Kafka', sub: 'PaymentDone', tone: 'accent' },
      { id: 'w', col: 1, row: 1, icon: '👷', label: 'cashback-worker' },
      { id: 'db', col: 2, row: 1, icon: '🗄️', label: 'wallet DB' },
    ], steps: [
      { from: 'k', to: 'w', label: 'payment_id p-9', say: 'Worker PaymentDone padhta hai (payment_id p-9).' },
      { from: 'w', to: 'db', label: '+₹50', tone: 'good', say: 'Worker ₹50 cashback jod deta hai.' },
      { at: ['w'], set: { w: { tone: 'bad', sub: 'deploy: band 💥' } }, say: 'Deploy mein worker band hua, Kafka ko "padh liya" kehne se pehle.' },
      { from: 'k', to: 'w', label: 'p-9 dobara', tone: 'gold', set: { w: { tone: '', sub: 'naya worker' } }, say: 'Naya worker wahi message dobara padhta hai.' },
      { from: 'w', to: 'db', label: '+₹50 (phir)', tone: 'bad', set: { db: { tone: 'bad', sub: '300 logon ko ₹100' } }, say: 'Phir ₹50 jodta hai. 300 logon ko cashback do baar mila.' },
    ] },

    'lock-gc': { nodes: [
      { id: 'a', col: 0, row: 0, icon: '👷', label: 'Worker A' },
      { id: 'lock', col: 1, row: 1, icon: '🔐', label: 'Redis lock', sub: '30 s' },
      { id: 'b', col: 0, row: 2, icon: '👷', label: 'Worker B' },
      { id: 'db', col: 2, row: 1, icon: '🗄️', label: 'settlement-db' },
    ], steps: [
      { from: 'a', to: 'lock', label: 'lock liya', tone: 'good', say: 'Worker A Redis mein 30 second ka lock leta hai aur settlement shuru.' },
      { at: ['a'], set: { a: { tone: 'bad', sub: '40 s atka ⏸️' } }, say: 'Worker A 40 second ke liye atak jaata hai.' },
      { from: 'b', to: 'lock', label: 'lock liya', tone: 'gold', set: { lock: { tone: 'gold', sub: 'A ka expire → B' } }, say: 'Lock expire hua. Worker B lock leta hai aur kaam shuru karta hai.' },
      { from: 'b', to: 'db', label: 'paisa bhejo', say: 'Worker B merchants ko paisa bhejta hai.' },
      { from: 'a', to: 'db', label: 'paisa bhejo (jaaga)', tone: 'bad', set: { db: { tone: 'bad', sub: '900 merchants: 2 baar' } }, say: 'Worker A jaagta hai aur kaam jaari rakhta hai. settlement-db kisi lock ko nahi jaanta. 900 merchants ko paisa do baar gaya.' },
    ] },

    'last-coupon': { nodes: [
      { id: 'u', col: 0, row: 1, icon: '👥', label: '5,000 log', sub: 'raat 9 baje', tone: 'accent' },
      { id: 'cs', col: 1, row: 1, icon: '⚙️', label: 'coupon-service', sub: '10 servers' },
      { id: 'db', col: 2, row: 1, icon: '🗄️', label: 'coupon DB', sub: 'count = 99' },
    ], steps: [
      { from: 'u', to: 'cs', label: 'coupon do', say: 'Raat 9 baje 5,000 log ek saath coupon maangte hain.' },
      { from: 'cs', to: 'db', label: 'count padho → 99', say: 'Kai requests ek saath count padhti hain: 99. "100 se kam hai, coupon do."' },
      { from: 'cs', to: 'db', label: 'count = 100 likho', tone: 'bad', set: { db: { tone: 'bad', sub: '137 coupons diye' } }, say: 'Har request apna "count + 1" likhti hai. Padhna aur likhna do alag queries. 100 ki jagah 137 coupons gaye.' },
    ] },

    'split-brain': { nodes: [
      { id: 'mum', col: 0, row: 1, icon: '🏢', label: 'Mumbai', sub: 'primary · zinda' },
      { id: 'net', col: 1, row: 1, icon: '🔗', label: 'Network' },
      { id: 'che', col: 2, row: 1, icon: '🏢', label: 'Chennai', sub: 'standby' },
      { id: 'scr', col: 2, row: 0, icon: '🤖', label: 'Failover script' },
    ], steps: [
      { at: ['net'], set: { net: { tone: 'bad', sub: '4 min toota ✂️' } }, say: 'Mumbai aur Chennai ke beech network 4 minute toota. Mumbai zinda tha.' },
      { from: 'scr', to: 'che', label: '"Mumbai mar gaya"', tone: 'bad', set: { che: { tone: 'bad', sub: 'ab primary bhi' } }, say: 'Script sirf dekhti hai "kya Mumbai dikh raha hai?" Nahi dikha, toh Chennai ko primary bana diya.' },
      { at: ['mum', 'che'], set: { mum: { tone: 'bad', sub: 'writes le raha' } }, say: '4 minute tak dono taraf ke users payment karte rahe, dono jagah writes.' },
      { at: ['net'], set: { net: { tone: 'good', sub: 'jud gaya' } }, say: 'Network juda toh Mumbai aur Chennai ke paas alag-alag balance the.' },
    ] },

    'cron-triple': { nodes: [
      { id: 's1', col: 0, row: 0, icon: '🖥️', label: 'Server 1', sub: 'cron 9:00' },
      { id: 's2', col: 0, row: 1, icon: '🖥️', label: 'Server 2', sub: 'cron 9:00' },
      { id: 's3', col: 0, row: 2, icon: '🖥️', label: 'Server 3', sub: 'cron 9:00' },
      { id: 'sms', col: 1, row: 1, icon: '📲', label: 'SMS provider' },
      { id: 'users', col: 2, row: 1, icon: '👥', label: '20 lakh users' },
    ], steps: [
      { from: 's1', to: 'sms', label: '20 lakh SMS', say: 'Subah 9 baje Server 1 par cron chalta hai: 20 lakh reminders.' },
      { from: 's2', to: 'sms', label: '20 lakh SMS', tone: 'gold', say: 'Server 2 par bhi wahi cron, wahi waqt.' },
      { from: 's3', to: 'sms', label: '20 lakh SMS', tone: 'bad', say: 'Server 3 par bhi. Servers ko ek doosre ka pata nahi.' },
      { from: 'sms', to: 'users', label: '3-3 SMS', tone: 'bad', set: { users: { tone: 'bad', sub: 'bill ₹18 lakh 😱' } }, say: 'Har user ko 3 SMS. SMS ka bill ₹6 lakh ki jagah ₹18 lakh.' },
    ] },

    'idor-statement': { nodes: [
      { id: 'st', col: 0, row: 1, icon: '🧑‍🎓', label: 'Student', sub: 'apna sahi token', tone: 'accent' },
      { id: 'api', col: 1, row: 1, icon: '⚙️', label: 'wallet-api', sub: 'token sahi? ✓' },
      { id: 'db', col: 2, row: 1, icon: '🗄️', label: 'statements' },
    ], steps: [
      { from: 'st', to: 'api', label: '?user_id=1042', tone: 'good', say: 'Student apna statement kholta hai: user_id=1042.' },
      { from: 'st', to: 'api', label: '?user_id=1043', tone: 'bad', say: 'URL mein 1042 ko 1043 karta hai. Token wahi, apna, sahi.' },
      { from: 'api', to: 'db', label: 'user 1043 ka statement', tone: 'bad', set: { db: { tone: 'bad', sub: '2 lakh download 😱' } }, say: 'wallet-api sirf token jaanchta hai. Kiska statement, URL tay karta hai. Script se 2 lakh statements download.' },
    ] },

    'leaked-token': { nodes: [
      { id: 'thief', col: 0, row: 0, icon: '🦹', label: 'Chor', sub: 'Aman ka phone' },
      { id: 'aman', col: 0, row: 2, icon: '👨', label: 'Aman', sub: 'naya phone', tone: 'accent' },
      { id: 'auth', col: 1, row: 2, icon: '🔑', label: 'auth-service', sub: 'JWT · 30 din' },
      { id: 'svc', col: 1, row: 0, icon: '⚙️', label: 'wallet-api' },
    ], steps: [
      { from: 'aman', to: 'auth', label: 'password badla', tone: 'good', say: 'Aman ka phone chori hua. Aman doosre phone se turant password badalta hai.' },
      { from: 'thief', to: 'svc', label: 'purana JWT', tone: 'bad', set: { svc: { tone: 'bad', sub: 'token khud jaancha ✓' } }, say: 'Chor purane phone ka token bhejta hai. wallet-api token khud jaanchta hai; auth-service se poochhta nahi.' },
      { at: ['thief'], set: { thief: { tone: 'bad', sub: '3 hafte tak access' } }, say: 'Token 30 din ka hai. Chor 3 hafte tak Aman ka balance aur history dekhta raha.' },
    ] },

    'tenant-leak': { nodes: [
      { id: 'm', col: 0, row: 1, icon: '🍬', label: 'Sharma Sweets', sub: 'export', tone: 'accent' },
      { id: 'api', col: 1, row: 1, icon: '⚙️', label: 'export feature', sub: 'naya code' },
      { id: 'db', col: 2, row: 1, icon: '🗄️', label: 'orders table', sub: '40,000 merchants' },
    ], steps: [
      { from: 'm', to: 'api', label: 'mera export do', say: 'Sharma Sweets naya export feature chalata hai.' },
      { from: 'api', to: 'db', label: 'SELECT … (filter bhoola)', tone: 'bad', say: 'Developer WHERE merchant_id = ? lagana bhool gaya. Code mein aisi 600 queries hain; review mein pakda nahi gaya.' },
      { from: 'db', to: 'm', label: 'sabke orders', tone: 'bad', bend: 140, set: { m: { tone: 'bad', sub: 'doosron ke orders 😱' } }, say: 'Sharma Sweets ke export mein doosre merchants ke orders aa gaye.' },
    ] },

    'noisy-tenant': { nodes: [
      { id: 'd11', col: 0, row: 0, icon: '🏏', label: 'DreamTeam11', sub: '50 lakh rows report' },
      { id: 'others', col: 0, row: 2, icon: '🏪', label: '40,000 merchants', tone: 'accent' },
      { id: 'api', col: 1, row: 1, icon: '⚙️', label: 'dashboard-api' },
      { id: 'db', col: 2, row: 1, icon: '🗄️', label: 'Database', sub: 'saajha' },
    ], steps: [
      { from: 'd11', to: 'api', label: '1 tareekh: bada report', say: 'Har mahine 1 tareekh ko DreamTeam11 50 lakh rows ka report nikaalta hai.' },
      { from: 'api', to: 'db', label: 'bhaari queries', tone: 'bad', set: { db: { tone: 'bad', sub: '80% CPU' } }, say: 'Report ki queries database ka 80% CPU le leti hain. Kisi merchant par koi hadd nahi.' },
      { from: 'others', to: 'api', label: 'chhoti queries', tone: 'bad', set: { others: { tone: 'bad', sub: 'dashboard 10 s' } }, say: 'Baaki 40,000 merchants ki chhoti queries bhi usi database par. Us ghante dashboard 10 second.' },
    ] },

    'alert-fatigue': { nodes: [
      { id: 'mon', col: 0, row: 1, icon: '📟', label: 'Monitoring', sub: 'CPU, disk, restarts' },
      { id: 'riya', col: 1, row: 1, icon: '👩‍💻', label: 'Riya (on-call)' },
      { id: 'pay', col: 2, row: 1, icon: '💳', label: 'Payments' },
    ], steps: [
      { from: 'mon', to: 'riya', label: '214 alerts', tone: 'bad', set: { riya: { tone: 'bad', sub: 'phone silent 🔕' } }, say: 'Raat bhar 214 alerts: "CPU 80%", "disk 70%", "pod restart". 211 par kuch karna hi nahi tha. Riya phone silent kar deti hai.' },
      { at: ['pay'], set: { pay: { tone: 'bad', sub: '3 baje: 40 min fail' } }, say: 'Raat 3 baje payments 40 minute fail hote hain.' },
      { from: 'mon', to: 'riya', label: 'usi bheed mein ek', tone: 'bad', say: 'Us ghatna ka alert bhi unhi 214 mein tha. Kisi ne nahi dekha.' },
    ] },

    'slow-hop': { nodes: [
      { id: 'u', col: 0, row: 1, icon: '💳', label: 'Payment', sub: 'p99 2.4 s', tone: 'accent' },
      { id: 'a', col: 1, row: 0, icon: '⚙️', label: 'service 1–2' },
      { id: 'b', col: 2, row: 1, icon: '⚙️', label: 'service 3–4' },
      { id: 'c', col: 1, row: 2, icon: '⚙️', label: 'service 5–6' },
    ], steps: [
      { from: 'u', to: 'a', label: 'hop', say: 'Ek payment 6 services se guzarta hai.' },
      { from: 'a', to: 'b', label: 'hop', say: 'Har service apne log alag likhti hai. Ek payment ke logs jodne wala koi id nahi.' },
      { from: 'b', to: 'c', label: 'hop', say: 'Har team: "hamari service tez hai". Har service ka average theek dikhta hai.' },
      { at: ['u'], set: { u: { tone: 'bad', sub: '2 din: koi jawab nahi' } }, say: 'Sabse dheeme 1% payments 2.4 second. 2 din se koi nahi bata pa raha ki waqt kahan ja raha hai.' },
    ] },

    'bill-doubled': { nodes: [
      { id: 'bill', col: 0, row: 1, icon: '🧾', label: 'Cloud bill', sub: '₹18L → ₹36L', tone: 'bad' },
      { id: 'cmp', col: 1, row: 0, icon: '🖥️', label: 'Compute', sub: '₹20 lakh' },
      { id: 'db', col: 1, row: 1, icon: '🗄️', label: 'Database', sub: '₹9 lakh' },
      { id: 'net', col: 1, row: 2, icon: '🌐', label: 'Network', sub: '₹7 lakh' },
      { id: 'cto', col: 2, row: 1, icon: '🧑‍💼', label: 'CTO', sub: '"paisa kahan gaya?"' },
    ], steps: [
      { at: ['bill'], say: 'Cloud bill ek mahine mein ₹18 lakh se ₹36 lakh. Users sirf 10% badhe.' },
      { at: ['cmp', 'db', 'net'], say: 'Bill bas itna batata hai: compute ₹20 lakh, database ₹9 lakh, network ₹7 lakh. Kisi resource par team ya feature ka label nahi.' },
      { from: 'db', to: 'cto', label: '?', tone: 'gold', say: 'Pichhle mahine 3 naye features live hue. Kisi ko nahi pata ki ek payment ka kharcha kitna hai. CTO ka sawaal khula hai.' },
    ] },

    'error-budget': { nodes: [
      { id: 'bud', col: 1, row: 0, icon: '💰', label: 'Error budget', sub: '30 din: ~43 min' },
      { id: 'd1', col: 0, row: 1, icon: '🚀', label: 'Kharab deploy 1', sub: '100% users par' },
      { id: 'd2', col: 2, row: 1, icon: '🚀', label: 'Kharab deploy 2', sub: '100% users par' },
      { id: 'prod', col: 1, row: 2, icon: '🧑‍💼', label: 'Product team', sub: 'kal bada launch' },
    ], steps: [
      { at: ['bud'], say: 'SLO: 30 din ke 99.9% waqt payment available. Fail hone ki chhoot lagbhag 43 minute.' },
      { from: 'd1', to: 'bud', label: 'minute gaye', tone: 'bad', say: 'Pehla kharab deploy seedha 100% users par gaya.' },
      { from: 'd2', to: 'bud', label: 'aur minute gaye', tone: 'bad', set: { bud: { tone: 'bad', sub: '40 gaye · 3 min bache' } }, say: 'Doosra bhi. 10ve din tak 40 minute kharch; agle 20 din ke liye 3 minute bache.' },
      { from: 'prod', to: 'bud', label: 'kal launch?', tone: 'gold', say: 'Product team kal bada feature launch karna chahti hai. Engineering kehti hai "khatra hai". Bahas jaari.' },
    ] },

    'design-feed': { nodes: [
      { id: 'celeb', col: 0, row: 0, icon: '⭐', label: 'Celebrity', sub: '50 lakh followers' },
      { id: 'riya', col: 0, row: 2, icon: '👩', label: 'Riya', sub: '200 dost', tone: 'accent' },
      { id: 'feed', col: 1, row: 1, icon: '📰', label: 'Activity feed' },
      { id: 'readers', col: 2, row: 1, icon: '👥', label: '5 crore users', sub: 'feed kholte rehte' },
    ], steps: [
      { from: 'riya', to: 'feed', label: 'Aman ko pay kiya', say: 'Riya ka public payment: "Riya ne Aman ko pay kiya". Riya ke 200 dost.' },
      { from: 'celeb', to: 'feed', label: 'din mein ~20 post', tone: 'gold', say: 'Ek celebrity ke 50 lakh followers; din mein lagbhag 20 post.' },
      { from: 'readers', to: 'feed', label: 'feed kholo (200 ms)', tone: 'gold', say: 'Feed kholna bahut zyada hota hai, post karna kam. Feed 200 ms mein khulni chahiye. Ab design tumhara.' },
    ] },

    'design-rate-limiter': { nodes: [
      { id: 'users', col: 0, row: 1, icon: '👥', label: 'Users', sub: '50,000 req/s', tone: 'accent' },
      { id: 'gw', col: 1, row: 1, icon: '🚪', label: 'api-gateway', sub: '12 servers' },
      { id: 'api', col: 2, row: 1, icon: '⚙️', label: 'ChaiPay APIs' },
    ], steps: [
      { from: 'users', to: 'gw', label: '50,000 req/s', say: '50,000 requests har second, 12 gateway servers par bikhri hui.' },
      { at: ['gw'], set: { gw: { tone: 'gold', sub: 'har user: 100/min' } }, say: 'Shart: har user 100 request per minute. Ginti saare 12 servers ke beech saajhi. Limiter 1–2 ms se zyada nahi le sakta.' },
      { from: 'gw', to: 'api', label: 'limiter band ho toh?', tone: 'gold', say: 'Aur limiter khud band ho jaaye toh bhi payments chalne chahiye. Ab design tumhara.' },
    ] },

    'design-typeahead': { nodes: [
      { id: 'u', col: 0, row: 1, icon: '⌨️', label: 'User', sub: "'s' → 'sh' → 'sha'", tone: 'accent' },
      { id: 'api', col: 1, row: 1, icon: '⚙️', label: 'suggest-api', sub: '100 ms ke andar' },
      { id: 'm', col: 2, row: 1, icon: '🏪', label: '1 crore merchants' },
      { id: 'new', col: 2, row: 0, icon: '🆕', label: 'Naya merchant', sub: 'kuch min baad chalega' },
    ], steps: [
      { from: 'u', to: 'api', label: 'har akshar par request', say: 'User "sha" likhta hai: har akshar par ek request.' },
      { from: 'api', to: 'm', label: "'sha' se shuru?", tone: 'gold', say: '1 crore merchants mein se "Sharma Sweets", "Shah Medical". Jawab 100 ms mein, warna user aage likh chuka.' },
      { at: ['new', 'u'], say: 'Zyadatar log wahi kuch hazaar mashhoor shuruaati akshar likhte hain. Naya merchant kuch minute baad dikhe toh chalega. Ab design tumhara.' },
    ] },

    'design-notification': { nodes: [
      { id: 'otp', col: 0, row: 0, icon: '🔐', label: 'OTP', sub: '5 s mein' },
      { id: 'alert', col: 0, row: 1, icon: '💳', label: 'Payment alert' },
      { id: 'offer', col: 0, row: 2, icon: '🎁', label: 'Diwali offers', sub: '2 crore ek saath' },
      { id: 'ns', col: 1, row: 1, icon: '📣', label: 'Notification system', sub: '5 crore / din' },
      { id: 'sms', col: 2, row: 1, icon: '📲', label: 'SMS · push · email', sub: 'SMS kabhi 30 s fail' },
    ], steps: [
      { from: 'otp', to: 'ns', label: 'OTP: 5 s', tone: 'gold', say: 'OTP 5 second mein pahunchna chahiye.' },
      { from: 'offer', to: 'ns', label: '2 crore ek saath', tone: 'gold', say: 'Diwali par 2 crore offers ek saath; offer 1 ghante mein bhi chalega.' },
      { from: 'ns', to: 'sms', label: 'bhejo', say: 'SMS provider kabhi-kabhi 30 second fail hota hai. Ek notification user ko do baar nahi jaana chahiye. Ab design tumhara.' },
    ] },

    'design-transfer': { nodes: [
      { id: 'riya', col: 0, row: 1, icon: '👩', label: 'Riya', sub: '₹500 bhejo', tone: 'accent' },
      { id: 'api', col: 1, row: 1, icon: '⚙️', label: 'transfer-api', sub: '2,000 / sec' },
      { id: 'r', col: 2, row: 0, icon: '👛', label: 'Riya ka wallet', sub: '−₹500' },
      { id: 'a', col: 2, row: 2, icon: '👛', label: 'Aman ka wallet', sub: '+₹500' },
      { id: 'aud', col: 3, row: 1, icon: '🧑‍⚖️', label: 'Auditor', sub: '"balance kaise bana?"' },
    ], steps: [
      { from: 'riya', to: 'api', label: '₹500 → Aman', say: 'Riya Aman ko ₹500 bhejti hai. Network par wahi request dobara aa sakti hai.' },
      { at: ['r', 'a'], set: { r: { tone: 'gold' }, a: { tone: 'gold' } }, say: 'Shart: Riya ka balance ghatna aur Aman ka badhna — dono ho, ya koi nahi. Paisa na bane, na gayab ho.' },
      { at: ['aud'], say: 'Auditor kabhi bhi poochh sakta hai: "Riya ka balance kaise bana?" Ab design tumhara.' },
    ] },
  };

  const byId = {};
  (SD.scenarios || []).forEach(s => { byId[s.id] = s; });
  Object.keys(S).forEach(id => {
    if (byId[id]) byId[id].scene = S[id];
    else if (SD.sceneOrphans) SD.sceneOrphans.push('soch:' + id);
  });
})();
