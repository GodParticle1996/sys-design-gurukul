/* =====================================================================
   System Gurukul — Scenes: 🧭 Request ka Safar (flow track)
   Kadam-dar-kadam diagrams (scene.js). Shape: scene.js ke upar likha hai.
   Numbers wahi jo level ke lesson aur purane diagram mein hain.
   ===================================================================== */
SD.addScenes({

  lifecycle: {
    intro: 'Riya ChaiPay app mein <b>"Mere orders"</b> kholti hai. Request <code>GET /orders</code> kahan-kahan se guzarti hai?',
    nodes: [
      { id: 'dns', col: 0, row: 0, icon: '🧭', label: 'DNS', sub: 'naam → IP', about: 'Domain naam (api.chaipay.in) ko IP address mein badalta hai.' },
      { id: 'phone', col: 0, row: 1, icon: '📱', label: 'Riya ka phone', sub: 'GET /orders', tone: 'accent' },
      { id: 'cdn', col: 1, row: 1, icon: '🌍', label: 'CDN edge', sub: 'Riya ke shehar mein', about: 'Paas ka server. Public cheezein (images, JS) yahin se mil jaati hain.' },
      { id: 'lb', col: 2, row: 1, icon: '⚖️', label: 'Load balancer', sub: '~1 ms', about: 'Request ko kai servers mein se ek healthy server par bhejta hai.' },
      { id: 'gw', col: 3, row: 1, icon: '🚪', label: 'API gateway', sub: 'auth · rate limit', about: 'Ek darwaza: token check, rate limit, routing.' },
      { id: 'db', col: 0, row: 2, icon: '🗄️', label: 'Postgres', sub: '~5–20 ms' },
      { id: 'pool', col: 1, row: 2, icon: '⏳', label: 'DB pool', sub: '20 connections', about: 'DB connections ka chhota set. Sab busy hon toh request line (queue) mein rukti hai.' },
      { id: 'app', col: 2, row: 2, icon: '⚙️', label: 'orders-api', sub: '~5 ms CPU' },
      { id: 'cache', col: 3, row: 2, icon: '🧠', label: 'Redis cache', sub: '~1 ms' },
    ],
    steps: [
      { from: 'phone', to: 'dns', label: 'api.chaipay.in ka IP?', say: 'Riya ka phone pehle DNS se IP poochhta hai: pehli baar ~20 ms, phone ke cache mein ho toh 0 ms.' },
      { from: 'phone', to: 'cdn', label: 'TCP + TLS handshake', say: 'Phone CDN edge se TCP + TLS handshake karta hai: ~80 ms. Keep-alive connection pehle se khuli ho toh handshake ka kharcha 0.' },
      { from: 'cdn', to: 'lb', label: 'MISS: aage bhejo', say: '<code>GET /orders</code> har user ka alag data hai, isliye CDN par HIT nahi hota. CDN edge request ko load balancer tak bhejta hai.' },
      { from: 'lb', to: 'gw', label: 'healthy server chuna', say: 'CDN edge load balancer tak nayi HTTPS connection banata hai. Load balancer (~1 ms) origin TLS kholta hai aur request ek healthy API gateway ko deta hai.' },
      { from: 'gw', to: 'app', label: 'token ✓ limit ✓', say: 'API gateway token jaanchta hai aur rate limit lagata hai. Sab theek hai, toh request orders-api tak pahunchti hai.' },
      { from: 'app', to: 'cache', label: 'GET orders:riya', tone: 'gold', set: { cache: { sub: 'MISS' } }, say: 'orders-api pehle Redis cache dekhta hai (~1 ms). HIT hota toh jawab yahin se wapas chala jaata. Abhi MISS hua.' },
      { from: 'app', to: 'pool', label: 'connection do', say: 'orders-api ko DB connection chahiye. DB pool mein 20 connections hain. Sab busy hon toh request yahin queue mein rukti hai.' },
      { from: 'pool', to: 'db', label: 'SELECT … ~10 ms', tone: 'good', say: 'Connection mila. Postgres ne query ~10 ms mein chalayi. Ab jawab ulti disha mein wapas Riya ke phone tak jaata hai.' },
      { at: ['pool'], set: { pool: { tone: 'bad', sub: 'queue: 300 requests ⏳' }, db: { tone: 'bad', sub: 'ab 8 second 😱' } }, say: 'Asli khatra: Postgres 8 second slow ho jaaye toh pool ki saari 20 connections atak jaati hain. CPU 10% dikhta hai, health check green, phir bhi timeout. Outage queue se aata hai.' },
    ],
  },

  networking: {
    intro: 'Riya Mumbai se pehli baar ChaiPay kholti hai. Request bhejne se <b>pehle</b> kitna waqt nikal jaata hai?',
    nodes: [
      { id: 'dns', col: 0, row: 0, icon: '🧭', label: 'DNS resolver', sub: '~30 ms' },
      { id: 'phone', col: 0, row: 1, icon: '📱', label: 'Riya ka phone', sub: 'pehli request', tone: 'accent' },
      { id: 'lb', col: 1, row: 1, icon: '⚖️', label: 'L7 load balancer', sub: 'HTTP padhta hai', about: 'L7 = HTTP level. Path aur headers padh kar faisla karta hai. L4 sirf IP aur port dekhta hai.' },
      { id: 's1', col: 2, row: 0, icon: '⚙️', label: 'wallet-api #1', sub: '12 connections' },
      { id: 's2', col: 2, row: 1, icon: '⚙️', label: 'wallet-api #2', sub: '3 connections' },
      { id: 's3', col: 2, row: 2, icon: '⚙️', label: 'wallet-api #3', sub: '40 connections · dheema' },
    ],
    steps: [
      { from: 'phone', to: 'dns', label: 'api.chaipay.in?', say: 'Pehla kadam: DNS lookup, ~30 ms. Abhi tak HTTP request nahi gayi; DNS ke packets gaye hain.' },
      { from: 'phone', to: 'lb', label: 'SYN → SYN-ACK → ACK', say: 'TCP handshake: 1 RTT (round trip time). Server tak ek round trip ~40 ms ho toh 40 ms aur gaye.' },
      { from: 'phone', to: 'lb', label: 'TLS: keys ka exchange', tone: 'gold', set: { phone: { sub: '~150 ms, HTTP abhi baaki' } }, say: 'TLS handshake: 1–2 RTT aur. Ab tak ~150 ms nikal gaye, aur asli request abhi shuru bhi nahi hui.' },
      { from: 'lb', to: 's2', label: 'GET /balance', tone: 'good', set: { s3: { tone: 'bad' } }, say: 'L7 load balancer HTTP request padhta hai. Least-connections rule se wallet-api #2 chuna gaya (sirf 3 connections). Dheema wallet-api #3 bach gaya.' },
      { at: ['phone', 'lb'], set: { lb: { tone: 'good', sub: 'connection khuli hai ♻️' } }, say: 'Doosri request pehle se khuli connection (keep-alive) par jaati hai. DNS, TCP aur TLS dobara nahi chahiye. Connection dobara istemaal karna sasta hai.' },
      { from: 'phone', to: 'lb', label: '1 packet kho gaya', tone: 'bad', say: 'HTTP/2 mein khoya TCP packet baad ke bytes ki delivery rokta hai (head-of-line blocking). HTTP/3 (QUIC, UDP par) mein missing bytes wali streams rukti hain; doosri streams chal sakti hain.' },
    ],
  },

  boundaries: {
    intro: 'Har kaam ki ek sahi layer hai. Riya ka <code>GET /balance</code> aur ek spam bot — dono ko kaun kahan rokta hai?',
    nodes: [
      { id: 'bot', col: 0, row: 0, icon: '🤖', label: 'Spam bot', sub: '1000 req/s', tone: 'bad' },
      { id: 'phone', col: 0, row: 1, icon: '📱', label: 'Riya ka app', tone: 'accent' },
      { id: 'cdn', col: 1, row: 1, icon: '🌍', label: 'CDN', sub: 'sirf public cheezein' },
      { id: 'gw', col: 2, row: 1, icon: '🚪', label: 'API gateway', sub: 'AuthN · rate limit' },
      { id: 'svc', col: 3, row: 1, icon: '⚙️', label: 'wallet-api', sub: 'AuthZ · business rules' },
      { id: 'db', col: 3, row: 2, icon: '🗄️', label: 'Postgres', sub: 'constraints · transaction' },
    ],
    steps: [
      { from: 'phone', to: 'cdn', label: 'app.js, logo.png', tone: 'good', say: 'Riya ka app JS aur images CDN se leta hai. Public cheezein sabke liye ek jaisi hain, isliye CDN par cache karna sahi hai.' },
      { from: 'cdn', to: 'gw', label: 'balance: cache mat karo', say: 'Balance har user ka alag hai. CDN balance cache kare toh Riya ka balance Aman ko dikh sakta hai. Isliye CDN request seedha API gateway ko deta hai.' },
      { at: ['gw'], set: { gw: { tone: 'good', sub: 'token ✓ = riya' } }, say: 'API gateway token jaanchta hai: tum kaun ho (AuthN). Token galat hota toh request yahin ruk jaati, wallet-api tak pahunchti hi nahi.' },
      { from: 'bot', to: 'gw', label: '1000 req/s', tone: 'bad', set: { gw: { sub: '429 Too Many Requests' } }, say: 'Spam bot 1000 request/second bhejta hai. Rate limit gateway par hai, isliye faltu requests baahar hi ruk jaati hain. wallet-api ke threads aur DB connections bache rehte hain.' },
      { from: 'gw', to: 'svc', label: 'user = riya', say: 'wallet-api AuthZ karta hai: kya Riya wallet W-42 dekh sakti hai? Wallet ke maalik ki jaankari sirf wallet-api ke paas hai, gateway ke paas nahi.' },
      { from: 'svc', to: 'db', label: 'WHERE owner = riya', tone: 'good', say: 'Postgres aakhri deewar hai: constraint (balance >= 0) aur transaction galat data ko andar aane se rokte hain. Reject jitna baahar ho sake, utna sasta.' },
    ],
  },

  latency: {
    intro: 'Dashboard bolta hai "average 110 ms, sab theek". Phir bhi users shikayat kar rahe hain. Kyun?',
    nodes: [
      { id: 'dash', col: 0, row: 0, icon: '📊', label: 'Dashboard', sub: 'average ≈ 110 ms 😊' },
      { id: 'users', col: 0, row: 1, icon: '👥', label: '100 users', sub: 'home page khola', tone: 'accent' },
      { id: 'page', col: 1, row: 1, icon: '⚙️', label: 'home-page-api' },
      { id: 'profile', col: 2, row: 0, icon: '👤', label: 'profile-api', sub: '1% requests slow' },
      { id: 'offers', col: 2, row: 1, icon: '🎁', label: 'offers-api', sub: '1% requests slow' },
      { id: 'balance', col: 2, row: 2, icon: '💰', label: 'balance-api', sub: '1% requests slow' },
    ],
    steps: [
      { from: 'users', to: 'page', label: '100 requests', say: '100 users ne home page khola. 98 requests 10 ms mein aayi, 2 requests 5,000 ms mein.' },
      { at: ['dash'], set: { dash: { tone: 'bad', sub: 'p99 = 5,000 ms 😡' } }, say: 'Average ≈ 110 ms dikhata hai, "sab theek". Lekin p99 = 5,000 ms: har 100 mein se 2 requests ke 5 second barbaad. Average outliers ko chhupata hai; p50, p95, p99 teeno dekho.' },
      { from: 'page', to: 'profile', label: 'call 1', say: 'home-page-api ab 3 services ko parallel call karta hai. Pehli call: profile-api.' },
      { from: 'page', to: 'offers', label: 'call 2', say: 'Doosri call: offers-api. Har service mein 1% requests slow hain.' },
      { from: 'page', to: 'balance', label: 'call 3', say: 'Teesri call: balance-api. Page tabhi ready hai jab teeno jawab aa jaayein.' },
      { at: ['page'], set: { page: { tone: 'bad', sub: '~3% requests slow' } }, say: 'Calls ek doosre se independent hon toh P(koi ek slow) = 1 − 0.99³ ≈ 3%. 10 calls par 9.6%, 100 calls par 63%. Tail amplification: har extra call dheemi request ko aam bana deti hai.' },
    ],
  },

  numbers: {
    intro: 'Har number ko <b>1 billion se guna</b> karo, toh insaani waqt banta hai. orders-api ka code kahan se data laata hai?',
    nodes: [
      { id: 'l1', col: 0, row: 0, icon: '⚡', label: 'L1 cache', sub: '0.5 ns · insaan: 0.5 sec' },
      { id: 'ram', col: 1, row: 0, icon: '🧩', label: 'RAM', sub: '100 ns · insaan: 100 sec' },
      { id: 'ssd', col: 2, row: 0, icon: '💾', label: 'SSD random read', sub: '100 µs · insaan: 27 ghante' },
      { id: 'code', col: 1, row: 1, icon: '⚙️', label: 'orders-api code', tone: 'accent' },
      { id: 'dc', col: 2, row: 1, icon: '🏢', label: 'Same-DC server', sub: '0.5 ms · insaan: 6 din' },
      { id: 'far', col: 2, row: 2, icon: '🌎', label: 'Doosra continent', sub: '150 ms · insaan: 5 saal' },
    ],
    steps: [
      { from: 'code', to: 'l1', label: '0.5 ns', tone: 'good', say: 'L1 cache CPU ke sabse paas hai: 0.5 ns. Insaani paimane par 0.5 second.' },
      { from: 'code', to: 'ram', label: '100 ns', tone: 'good', say: 'RAM: 100 ns, insaani paimane par 100 second. L1 se 200 guna door.' },
      { from: 'code', to: 'ssd', label: '100 µs', tone: 'gold', say: 'SSD random read: 100 µs = 27 ghante. RAM se 1000 guna dheema. Caching ka poora karan yahi farak hai.' },
      { from: 'code', to: 'dc', label: '0.5 ms round trip', tone: 'gold', say: 'Same data-center ke doosre server tak round trip: 0.5 ms = 6 din. 20 service hops = 10 ms sirf network par, bina kaam kiye.' },
      { from: 'code', to: 'far', label: '150 ms round trip', tone: 'bad', say: 'Doosre continent tak round trip: 150 ms = 5 saal. p99 200 ms ke SLO mein baaki saare kaam ke liye sirf ~50 ms bachte hain. Ilaaj architecture: data user ke paas rakho.' },
      { at: ['code'], set: { code: { tone: 'bad', sub: 'loop mein network call 😱' } }, say: 'Loop ke andar network call = har chakkar par "6 din" ka intezaar. 1000 serial same-DC calls × 0.5 ms = 500 ms. Calls ko batch karo.' },
    ],
  },

  estimation: {
    intro: 'Interviewer: "12 lakh users/din, har user 2 requests. Kitne servers, kitni storage?" Andaza nahi, hisaab.',
    nodes: [
      { id: 'dau', col: 0, row: 0, icon: '👥', label: '24 lakh req/din', tone: 'accent' },
      { id: 'avg', col: 1, row: 0, icon: '➗', label: '≈ 28 rps', sub: 'average' },
      { id: 'peak', col: 2, row: 0, icon: '📈', label: '≈ 84 rps', sub: 'peak = 3 × average' },
      { id: 'store', col: 1, row: 1, icon: '📦', label: '≈ 4.8 GB/din', sub: '2 KB har request' },
      { id: 'year', col: 2, row: 1, icon: '🗄️', label: '≈ 5.3 TB/saal', sub: '3 copies ke saath' },
      { id: 'little', col: 1, row: 2, icon: '🧮', label: "Little's Law", sub: 'L = λ × W' },
      { id: 'conns', col: 0, row: 2, icon: '🔌', label: 'Average 10 andar', sub: 'pool: 10 + headroom' },
    ],
    steps: [
      { from: 'dau', to: 'avg', label: '÷ 86,400 s', say: '12 lakh users × 2 requests ÷ 86,400 second ≈ 28 rps average. Shortcut: 1 din ≈ 10⁵ second, aur 1 million/din ≈ 12 rps.' },
      { from: 'avg', to: 'peak', label: '× 3', tone: 'gold', say: 'Design average ke liye nahi, peak ke liye. Consumer app mein peak ≈ 3 × average = 84 rps. Flash sale mein 50× bhi ho sakta hai.' },
      { from: 'avg', to: 'store', label: '28 × 2 KB × 86,400', say: 'Storage: 28 rps × 2 KB × 86,400 s ≈ 4.8 GB har din.' },
      { from: 'store', to: 'year', label: '× 365 × 3 copies', say: '4.8 GB × 365 ≈ 1.8 TB/saal. Replication ki 3 copies ke saath ≈ 5.3 TB. Budget meeting mein yahi number chahiye.' },
      { at: ['little'], say: "Little's Law: ek saath andar requests (L) = aane ki rate (λ) × har request ka waqt (W). Poore Resilience track ki neev yahi formula hai." },
      { from: 'little', to: 'conns', label: '500 rps × 0.02 s', tone: 'good', say: '500 rps × 20 ms = average 10 requests ek saath andar. Agar DB connection 20 ms pakdi rahe, toh pool DB capacity, burst aur headroom se chuno.' },
      { at: ['conns'], set: { conns: { tone: 'bad', sub: 'ab average 100 😱' } }, say: 'Postgres 20 ms se 200 ms ho jaaye: 500 × 0.2 = average 100 requests andar. Chhota pool turant bhar jaata hai aur queue banti hai.' },
    ],
  },

  syncasync: {
    intro: 'Riya ka order place hone mein <b>3.2 second</b> lagte the. Kaunsa kaam sync rahe, kaunsa queue mein jaaye?',
    nodes: [
      { id: 'db', col: 1, row: 0, icon: '🗄️', label: 'orders DB', sub: '20 ms' },
      { id: 'pay', col: 2, row: 0, icon: '💳', label: 'payment', sub: '400 ms' },
      { id: 'user', col: 0, row: 1, icon: '📱', label: 'Riya', sub: 'POST /orders', tone: 'accent' },
      { id: 'api', col: 1, row: 1, icon: '⚙️', label: 'order-api' },
      { id: 'q', col: 2, row: 1, icon: '📮', label: 'Queue', sub: 'email · warehouse · PDF', about: 'Kaam ki line. Producer daal ke aage badh jaata hai; workers apni speed se uthate hain.' },
      { id: 'email', col: 3, row: 0, icon: '✉️', label: 'email-service', sub: '800 ms' },
      { id: 'wh', col: 3, row: 1, icon: '📦', label: 'warehouse', sub: '300 ms' },
      { id: 'pdf', col: 3, row: 2, icon: '📄', label: 'invoice PDF', sub: '1,500 ms' },
    ],
    steps: [
      { from: 'user', to: 'api', label: 'POST /orders', say: 'Pehle order-api 6 kaam ek ke baad ek sync karta tha: 3.2 second. Email service down ho toh order hi fail, jabki order ban chuka tha.' },
      { from: 'api', to: 'db', label: 'INSERT order', say: 'Sync kaam #1: order DB mein likho (20 ms). Riya ke jawab ke liye zaroori hai.' },
      { from: 'api', to: 'pay', label: 'charge ₹499', say: 'Sync kaam #2: payment (400 ms). Payment fail ho toh poora order radd karna padega, isliye sync.' },
      { from: 'api', to: 'q', label: 'baaki 4 kaam', tone: 'gold', say: 'Email, warehouse, analytics aur invoice PDF queue mein daal do. Test: kya Riya ke jawab ke liye zaroori hai? Nahi. Kya fail hone par order radd hoga? Nahi.' },
      { from: 'api', to: 'user', label: '201 Created · 420 ms', tone: 'good', say: 'Riya 420 ms mein free. Pehle 3.2 second lagte the.' },
      { from: 'q', to: 'email', label: 'email bhejo', tone: 'bad', set: { email: { tone: 'bad', sub: 'down 😴' } }, say: 'email-service down hai. Message queue mein pada rehta hai aur email-service wapas aane par chala jaata hai. Order phir bhi safal.' },
      { from: 'q', to: 'wh', label: 'stock ghatao', say: 'Workers apni speed se kaam uthate hain, isliye spike queue mein smooth ho jaata hai.' },
      { from: 'q', to: 'pdf', label: 'PDF banao', say: 'Async free nahi hai: Riya ko invoice turant nahi dikhega (consistency ki keemat). Aur queue ki lambai par limit aur alert rakho; unbounded queue ek jaal hai.' },
    ],
  },

  fanout: {
    intro: 'Product page ko <b>5 services</b> ka data chahiye. Parallel bhejna tez hai — par chhupa hua tax kya hai?',
    nodes: [
      { id: 'user', col: 0, row: 1, icon: '📱', label: 'Aman', sub: 'GET /product/42', tone: 'accent' },
      { id: 'page', col: 1, row: 1, icon: '📄', label: 'product-api' },
      { id: 'catalog', col: 1, row: 0, icon: '📚', label: 'catalog', sub: 'misaal: 40 ms' },
      { id: 'pricing', col: 2, row: 0, icon: '🏷️', label: 'pricing', sub: 'misaal: 60 ms' },
      { id: 'inventory', col: 2, row: 1, icon: '📦', label: 'inventory', sub: 'misaal: 90 ms' },
      { id: 'reviews', col: 2, row: 2, icon: '⭐', label: 'reviews', sub: 'misaal: 120 ms' },
      { id: 'reco', col: 1, row: 2, icon: '🤖', label: 'recommend', sub: 'misaal: 200 ms' },
    ],
    steps: [
      { from: 'user', to: 'page', label: 'GET /product/42', say: 'product-api ko 5 services ka data chahiye. Ek ke baad ek (serial) call karo toh time = sabka jod = 510 ms.' },
      { at: ['catalog', 'pricing', 'inventory', 'reviews', 'reco'], say: 'Parallel bhejo toh paanchon calls ek saath chalti hain. Total = sabse dheemi call = recommend ka 200 ms. Parallel behtar hai, lekin…' },
      { from: 'page', to: 'reviews', label: '1% slow', tone: 'bad', set: { page: { tone: 'bad', sub: '~4.9% requests slow' } }, say: 'Har service mein 1% requests slow hain. Calls independent hon toh P(paanch mein se koi ek slow) = 1 − 0.99⁵ ≈ 4.9%. Ek call ka 1% paanch calls mein ~5% ban gaya.' },
      { at: ['reviews', 'reco'], set: { reviews: { tone: 'muted', sub: 'page ke BAAD load' }, reco: { tone: 'muted', sub: 'page ke BAAD load' } }, say: 'Ilaaj 1: reviews aur recommend optional hain. Dono ko page load hone ke baad alag se lao. Main page sirf 3 zaroori calls ka intezaar kare.' },
      { from: 'page', to: 'inventory', label: 'p95 par doosri copy', tone: 'gold', say: 'Ilaaj 2, hedged request: inventory apne p95 time tak jawab na de, toh doosre server ko doosri copy bhejo. Jo jawab pehle aaye, wahi lo.' },
      { at: ['page'], set: { page: { tone: 'good', sub: 'kam calls + timeouts' } }, say: 'Ilaaj 3: kam calls. Catalog, pricing aur inventory ek batch endpoint se lao. Aur har call par timeout rakho, taaki ek dheemi service poora page na roke.' },
    ],
  },

  decompose: {
    intro: 'ChaiPay ka monolith bada ho gaya. Kya monolith ko todna chahiye? Pehle dekho, todne par <b>kya mehenga</b> ho jaata hai.',
    nodes: [
      { id: 'mono', col: 0, row: 0, icon: '📦', label: 'Monolith', sub: 'orders + payments', tone: 'good' },
      { id: 'mdb', col: 0, row: 1, icon: '🗄️', label: 'Ek Postgres', sub: 'ACID muft' },
      { id: 'os', col: 2, row: 0, icon: '🧾', label: 'orders-service' },
      { id: 'ps', col: 3, row: 0, icon: '💳', label: 'payments-service' },
      { id: 'odb', col: 2, row: 1, icon: '🗄️', label: 'orders DB' },
      { id: 'pdb', col: 3, row: 1, icon: '🗄️', label: 'payments DB' },
    ],
    groups: [
      { label: 'Pehle', cols: [0, 0], rows: [0, 1], tone: 'good' },
      { label: 'Todne ke baad', cols: [2, 3], rows: [0, 1], tone: 'gold' },
    ],
    steps: [
      { at: ['mono'], say: 'Monolith mein orders code payments code ko call karta hai: function call, 0.001 ms. Fail hone ka koi network khatra nahi.' },
      { from: 'mono', to: 'mdb', label: 'BEGIN … COMMIT', tone: 'good', say: 'Ek Postgres mein order aur payment records ek transaction mein hon, toh ROLLBACK dono badlav hataata hai. Bank ka charge alag hai; DB rollback bank ka charge nahi mitaata.' },
      { from: 'os', to: 'ps', label: 'HTTP call · 5 ms', tone: 'gold', say: 'Todne ke baad wahi call network call ban gayi: 0.001 ms se 5 ms. Ab call fail bhi ho sakti hai, toh timeout aur retry chahiye.' },
      { at: ['odb', 'pdb'], say: 'Har service ka apna DB hai. Ek local transaction ab dono DB par nahi chal sakti. ROLLBACK ki jagah saga: compensating actions (refund, order cancel) khud likho.' },
      { from: 'os', to: 'pdb', label: 'seedha query ❌', tone: 'bad', set: { pdb: { tone: 'bad', sub: 'do services likh rahi' } }, say: 'Jaal: orders-service seedha payments DB padhne-likhne lage toh distributed monolith ban jaata hai. Deploy alag, par ek schema badla toh dono tootenge.' },
      { at: ['os', 'ps'], set: { ps: { sub: 'alag team · alag release' } }, say: 'Todne ki 4 asli wajahein: alag team ownership, alag scaling shape, blast radius (recommendation gire toh checkout na gire), alag tech ya compliance. "Microservices modern hain" wajah nahi.' },
    ],
  },

  'boss-flow': {
    intro: 'Marketing team ek baar mein <b>50 lakh users</b> ko push notification bhejna chahti hai. Poora flow dekho.',
    nodes: [
      { id: 'app', col: 0, row: 1, icon: '📣', label: 'Marketing app', sub: 'campaign: offer-77', tone: 'accent' },
      { id: 'gw', col: 1, row: 1, icon: '🚪', label: 'API gateway', sub: 'AuthN · rate limit' },
      { id: 'napi', col: 2, row: 1, icon: '⚙️', label: 'notify-api', sub: 'validate · dedupe key' },
      { id: 'dlq', col: 3, row: 0, icon: '🪦', label: 'DLQ', sub: 'kharab messages' },
      { id: 'q', col: 3, row: 1, icon: '📮', label: 'Queue', sub: 'buffer · retry' },
      { id: 'fcm', col: 2, row: 2, icon: '📨', label: 'FCM / APNs', sub: 'provider ki limit' },
      { id: 'workers', col: 3, row: 2, icon: '👷', label: 'Workers', sub: 'dedupe record' },
    ],
    steps: [
      { from: 'app', to: 'gw', label: 'POST /notifications', say: 'Marketing app campaign bhejta hai. API gateway token jaanchta hai aur per-user rate limit lagata hai, taaki koi spam na kar sake.' },
      { from: 'gw', to: 'napi', label: 'dedupe_key: offer-77', say: 'notify-api request validate karta hai aur campaign ke saath dedupe key pakke storage mein likhta hai. Campaign dobara aaye toh naya campaign nahi banta.' },
      { from: 'napi', to: 'app', label: '202 Accepted', tone: 'good', bend: 130, say: 'notify-api turant 202 Accepted deta hai, 200 nahi: kaam abhi hua nahi, sirf maan liya gaya hai. Status ke liye /notifications/:id endpoint.' },
      { from: 'napi', to: 'q', label: '50 lakh jobs', say: '50 lakh jobs queue mein jaati hain. Spike queue mein smooth hota hai; notify-api ko FCM ka intezaar nahi karna padta.' },
      { from: 'q', to: 'workers', label: 'job uthao', say: 'Workers queue se jobs uthate hain. FCM aur APNs ki apni rate limit hai, isliye workers bhejne ki speed control karte hain.' },
      { from: 'workers', to: 'fcm', label: 'push bhejo', tone: 'good', say: 'Worker FCM/APNs ko push bhejta hai aur har notification ka record rakhta hai, taaki retry duplicate na bheje. Crash ke beech kabhi duplicate phir bhi ja sakta hai (at-least-once).' },
      { from: 'q', to: 'dlq', label: '3 baar fail', tone: 'bad', set: { dlq: { tone: 'bad' } }, say: 'Jo job 3 baar fail ho (jaise galat device token), DLQ mein chali jaati hai. Ek kharab message poori queue nahi rokta; engineer DLQ baad mein dekhta hai.' },
    ],
  },

});
