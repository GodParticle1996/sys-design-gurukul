/* =====================================================================
   System Gurukul — Scenes: 🌐 Distributed (dist track)
   Kadam-dar-kadam diagrams (scene.js). Numbers wahi jo level ke lesson mein hain.
   ===================================================================== */
SD.addScenes({

  cap: {
    intro: 'ChaiPay ke do data centers: Mumbai aur Delhi. Beech ka network <b>kat gaya</b>. Ab kya chunoge?',
    nodes: [
      { id: 'user', col: 0, row: 1, icon: '📱', label: 'Riya (Mumbai)', tone: 'accent' },
      { id: 'mum', col: 1, row: 1, icon: '🏢', label: 'Mumbai DC', sub: 'balance: ₹500' },
      { id: 'link', col: 2, row: 1, icon: '🔗', label: 'Network link' },
      { id: 'del', col: 3, row: 1, icon: '🏢', label: 'Delhi DC', sub: 'balance: ₹500' },
      { id: 'aman', col: 3, row: 2, icon: '📱', label: 'Aman (Delhi)' },
    ],
    steps: [
      { at: ['mum', 'del'], say: 'Mumbai DC aur Delhi DC har write ek doosre ko copy karte hain.' },
      { at: ['link'], set: { link: { tone: 'bad', sub: 'kat gaya ✂️' } }, say: 'Network link kat gaya (partition). P optional nahi: cable katti hai, switch marte hain. Asli sawaal: partition mein C chunoge ya A?' },
      { from: 'user', to: 'mum', label: '₹500 bhejo', say: 'Riya Mumbai mein ₹500 bhejti hai. Mumbai DC Delhi DC tak khabar nahi pahuncha sakta.' },
      { at: ['mum'], set: { mum: { tone: 'gold', sub: 'CP: "abhi nahi"' } }, say: 'CP chuna: Mumbai DC error deta hai, "abhi nahi bata sakte". Galat jawab se behtar. Sahi jagah: bank balance, inventory, seat booking, permissions.' },
      { from: 'aman', to: 'del', label: 'feed dikhao', tone: 'good', set: { del: { tone: 'good', sub: 'AP: purana data' } }, say: 'AP chuna: Delhi DC purana data dikhata hai. Kuch na dikhane se behtar. Sahi jagah: likes, feed, recommendations, analytics.' },
      { at: ['link'], set: { link: { tone: 'good', sub: 'jud gaya' }, mum: { tone: '', sub: 'balance: ₹0' }, del: { tone: '', sub: 'balance: ₹0' } }, say: 'PACELC: partition na ho (Else), tab bhi chunav hai: Latency ya Consistency. Har write Delhi ke ack ka intezaar kare (consistent, dheema) ya nahi (tez, thoda purana).' },
      { at: ['mum', 'del'], say: 'Faisla per-operation hai, per-system nahi: ChaiPay mein balance CP, transaction history ki feed AP.' },
    ],
  },

  eventual: {
    intro: 'Riya ne profile photo badli, page reload kiya — <b>purani photo</b>. Bug? Nahi. System sahi tha, UX galat tha.',
    nodes: [
      { id: 'user', col: 0, row: 1, icon: '📱', label: 'Riya', tone: 'accent' },
      { id: 'api', col: 1, row: 1, icon: '⚙️', label: 'profile-api' },
      { id: 'pri', col: 2, row: 0, icon: '✍️', label: 'Primary' },
      { id: 'rep', col: 2, row: 2, icon: '🪞', label: 'Replica', sub: '2 s peeche' },
    ],
    steps: [
      { from: 'user', to: 'api', label: 'nayi photo', say: 'Riya nayi profile photo upload karti hai.' },
      { from: 'api', to: 'pri', label: 'UPDATE photo', tone: 'good', say: 'profile-api primary par likhta hai. Save ✅.' },
      { from: 'api', to: 'rep', label: 'GET (reload)', tone: 'bad', set: { rep: { tone: 'bad', sub: 'purani photo' } }, say: 'Page reload hua; read replica se gaya. Replica 2 second peeche: PURANI photo.' },
      { at: ['user'], set: { user: { tone: 'bad', sub: 'dobara upload 😡' } }, say: 'Riya: "save nahi hua?" Dobara upload, ab do photos. 2 second baad sab sync, par Riya ja chuki thi.' },
      { from: 'api', to: 'pri', label: 'apna data: primary se', tone: 'good', set: { user: { tone: 'good', sub: 'nayi photo ✅' }, rep: { tone: '', sub: '2 s peeche' } }, say: 'Pattern 1: user ka apna data primary se (read-your-own-writes). Pattern 2, sticky reads: write ke baad kuch second primary se. Doosron ka data replica se chalega.' },
      { at: ['user'], set: { user: { sub: 'optimistic UI' } }, say: 'Pattern 3, optimistic UI: nayi photo turant UI mein dikhao, background mein confirm. Pattern 4: "Processing…" dikhao, state chhupao mat.' },
      { at: ['pri', 'rep'], say: 'Kahan eventual nahi chalega: paisa, stock ka aakhri item, permissions (access hataya toh turant lagu ho).' },
    ],
  },

  clocks: {
    intro: 'Do ghadiyan, do alag kaam. Galat ghadi chuni toh <b>timeout toot-te hain</b> aur <b>data chup-chaap kho jaata hai</b>.',
    nodes: [
      { id: 'wall', col: 0, row: 0, icon: '🕰️', label: 'Wall clock', sub: 'peeche ja sakti hai' },
      { id: 'timer', col: 1, row: 0, icon: '⏱️', label: 'Timeout code', sub: 'elapsed = end − start' },
      { id: 'mono', col: 0, row: 1, icon: '⏳', label: 'Monotonic clock', sub: 'kabhi peeche nahi' },
      { id: 'a', col: 2, row: 0, icon: '🖥️', label: 'Server A', sub: 'ghadi 50 ms aage' },
      { id: 'db', col: 3, row: 1, icon: '🗄️', label: 'DB (last-write-wins)' },
      { id: 'b', col: 2, row: 2, icon: '🖥️', label: 'Server B', sub: 'ghadi sahi' },
    ],
    steps: [
      { from: 'wall', to: 'timer', label: 'duration wall clock se ❌', tone: 'bad', set: { timer: { tone: 'bad', sub: 'elapsed = −200 ms 😵' } }, say: 'Duration ke liye wall clock: NTP ghadi 200 ms peeche kare toh elapsed negative. Timeout, rate limiter aur breaker ka ganit toot jaata hai.' },
      { from: 'mono', to: 'timer', label: 'duration ✅', tone: 'good', set: { timer: { tone: 'good', sub: 'hamesha sahi' } }, say: 'Duration hamesha monotonic clock se: kabhi peeche nahi jaati. Wall clock sirf logs, display aur certificate expiry ke liye.' },
      { from: 'a', to: 'db', label: "'Riya S' · t=.050", say: "Server A ki ghadi 50 ms aage hai. Server A ne naam 'Riya S' likha; timestamp .050." },
      { from: 'b', to: 'db', label: "'Riya Sharma' · t=.020", tone: 'bad', set: { db: { tone: 'bad', sub: "'Riya S' jeeta 😱" } }, say: "Server B ne asal waqt mein BAAD mein 'Riya Sharma' likha, par Server B ki ghadi .020 kehti hai. Last-write-wins ne 'Riya S' rakha: naya write chup-chaap gaya." },
      { at: ['db'], set: { db: { tone: 'gold', sub: 'Lamport / vector / HLC' } }, say: 'Logical clocks: samay ki jagah KRAM. Lamport counter kram deta hai; vector clock batata hai ki do writes concurrent the. Hybrid clock (HLC) dono ka mel.' },
      { at: ['db'], say: 'Last-write-wins kab theek? Jab koi bhi version chal jaaye aur thoda data khona manzoor ho ("last seen", cache). Paisa ya cart par nahi.' },
    ],
  },

  consensus: {
    intro: 'Paanch machines, koi bhi kabhi bhi mar sakti hai. Phir bhi <b>ek hi sach</b> kaise? Raft ka jawab.',
    nodes: [
      { id: 'n2', col: 1, row: 0, icon: '🖥️', label: 'node 2', sub: 'follower' },
      { id: 'n3', col: 2, row: 1, icon: '🖥️', label: 'node 3', sub: 'follower' },
      { id: 'client', col: 0, row: 1, icon: '📱', label: 'Client', tone: 'accent' },
      { id: 'n1', col: 1, row: 1, icon: '🖥️', label: 'node 1', sub: 'follower' },
      { id: 'n4', col: 1, row: 2, icon: '🖥️', label: 'node 4', sub: 'follower' },
      { id: 'n5', col: 2, row: 2, icon: '🖥️', label: 'node 5', sub: 'follower' },
    ],
    steps: [
      { at: ['n1'], set: { n1: { tone: 'gold', sub: 'candidate · term 3' } }, say: 'Purane leader ki heartbeat band. Node 1 ka random timeout (150–300 ms) sabse pehle khatam hua: node 1 candidate bana, term 3, khud ko vote.' },
      { from: 'n1', to: 'n2', label: 'vote do (term 3)', set: { n2: { tone: 'good', sub: 'vote ✓' } }, say: 'Node 1 sabse vote maangta hai. Random timeout isliye ki sab ek saath candidate na banein aur votes na bant jaayein.' },
      { from: 'n1', to: 'n3', label: 'vote do (term 3)', set: { n3: { tone: 'good', sub: 'vote ✓' }, n1: { tone: 'good', sub: 'LEADER · term 3' } }, say: 'Node 1 ko 3/5 votes (khud samet) mile: majority. Term 3 ka leader. Term = chunav ka saal; purane term ka leader bekaar.' },
      { from: 'client', to: 'n1', label: 'x = 10', say: 'Client write bhejta hai: x = 10. Leader apne log mein entry UNCOMMITTED likhta hai.' },
      { from: 'n1', to: 'n4', label: 'AppendEntries', say: 'Leader followers ko AppendEntries bhejta hai. Followers apne log mein likh kar ack karte hain.' },
      { from: 'n1', to: 'n5', label: 'AppendEntries', set: { n4: { sub: 'ack ✓' }, n5: { sub: 'ack ✓' } }, say: '3/5 ack (leader samet) = quorum → entry COMMITTED. Majority kyun? Do majorities hamesha overlap karti hain, isliye agla leader is entry ko dekhega hi.' },
      { from: 'n1', to: 'client', label: 'ok ✅', tone: 'good', say: 'Commit ke baad state machine par apply, phir client ko jawab. Data tab "sach" hai jab majority ke paas durable ho.' },
    ],
  },

  'consensus-split': {
    intro: 'Network do tukde: 2 | 3. Purana leader chhote tukde mein phans gaya. <b>Kaun commit kar sakta hai?</b>',
    nodes: [
      { id: 'n1', col: 0, row: 0, icon: '🖥️', label: 'node 1', sub: 'purana leader · term 3' },
      { id: 'cA', col: 1, row: 0, icon: '📱', label: 'Client A' },
      { id: 'n4', col: 2, row: 0, icon: '🖥️', label: 'node 4' },
      { id: 'n2', col: 0, row: 1, icon: '🖥️', label: 'node 2' },
      { id: 'n3', col: 2, row: 1, icon: '🖥️', label: 'node 3' },
      { id: 'cB', col: 1, row: 2, icon: '📱', label: 'Client B' },
      { id: 'n5', col: 2, row: 2, icon: '🖥️', label: 'node 5' },
    ],
    groups: [
      { label: 'Minority', cols: [0, 0], rows: [0, 1], tone: 'bad' },
      { label: 'Majority', cols: [2, 2], rows: [0, 2], tone: 'good' },
    ],
    steps: [
      { at: ['n1', 'n2'], say: 'Network do tukde: node 1 (purana leader) aur node 2 ek taraf; node 3, 4, 5 doosri taraf.' },
      { from: 'cA', to: 'n1', label: 'y = 20', say: 'Client A purane leader node 1 ko y = 20 bhejta hai.' },
      { from: 'n1', to: 'n2', label: 'AppendEntries', tone: 'bad', set: { n1: { tone: 'bad', sub: '2/5 ack → commit nahi' } }, say: 'Sirf node 2 ack karta hai: 2/5, majority nahi → commit nahi. Client A ko timeout. System jhooth nahi bolta: consistency pehle, availability baad mein.' },
      { at: ['n3'], set: { n3: { tone: 'good', sub: 'LEADER · term 4' } }, say: 'Majority taraf (3, 4, 5) mein heartbeat band → naya chunav, term 4, node 3 leader.' },
      { from: 'cB', to: 'n3', label: 'y = 30', tone: 'good', set: { n4: { sub: 'ack ✓' }, n5: { sub: 'ack ✓' } }, say: 'Client B node 3 ko y = 30 bhejta hai: 3/5 ack → committed ✅.' },
      { from: 'n3', to: 'n1', label: 'term 4 > term 3', tone: 'gold', bend: -60, set: { n1: { tone: '', sub: 'follower · y = 30' } }, say: 'Network theek: node 1 bada term (4) dekhta hai aur step down karta hai. Uncommitted y = 20 phenka, committed y = 30 copy.' },
      { at: ['n1', 'n2', 'n3', 'n4', 'n5'], say: '3 nodes: quorum 2, 1 failure jhelta hai. 4 nodes: quorum 3, phir bhi sirf 1. 5 nodes: quorum 3, 2 failures. Isliye odd ginti. Consensus khud mat banao: etcd ya ZooKeeper lo.' },
    ],
  },

  dbperservice: {
    intro: 'order-service aur inventory-service ek hi database share karti hain. <b>Aazadi</b> kahan gayi?',
    nodes: [
      { id: 'os', col: 0, row: 0, icon: '🧾', label: 'order-service' },
      { id: 'shared', col: 1, row: 1, icon: '🗄️', label: 'Shared DB', sub: 'orders table' },
      { id: 'inv', col: 0, row: 2, icon: '📦', label: 'inventory-service' },
      { id: 'os2', col: 2, row: 0, icon: '🧾', label: 'order-service' },
      { id: 'odb', col: 3, row: 0, icon: '🗄️', label: 'orders DB', sub: 'sirf order-service' },
      { id: 'bus', col: 2, row: 1, icon: '📣', label: 'Events / API' },
      { id: 'inv2', col: 2, row: 2, icon: '📦', label: 'inventory-service' },
      { id: 'idb', col: 3, row: 2, icon: '🗄️', label: 'inventory DB' },
    ],
    groups: [
      { label: 'Shared DB', cols: [0, 1], rows: [0, 2], tone: 'bad' },
      { label: 'DB per service', cols: [2, 3], rows: [0, 2], tone: 'good' },
    ],
    steps: [
      { from: 'os', to: 'shared', label: 'orders LIKHTA hai', say: 'order-service orders table mein likhta hai.' },
      { from: 'inv', to: 'shared', label: 'orders bhi LIKHTA hai', tone: 'bad', say: 'inventory-service bhi orders table mein likhta hai. Ab ek migration = dono services ka coordination; independent deploy gaya.' },
      { at: ['shared'], set: { shared: { tone: 'bad', sub: 'maalik koi nahi' } }, say: 'Ek slow query dono ko girati hai, aur schema ka maalik koi nahi. Distributed monolith. "Sirf padhenge" bhi coupling hai: column rename hua toh doosri service tooti.' },
      { from: 'os2', to: 'odb', label: 'apna data', tone: 'good', say: 'DB per service: order-service apne orders DB ka akela maalik. Schema badalna order-service ki marzi.' },
      { from: 'os2', to: 'bus', label: 'OrderPlaced event', say: 'Doosri services ko data API ya events se milta hai, table se kabhi nahi.' },
      { from: 'bus', to: 'inv2', label: 'stock ghatao', tone: 'good', say: 'inventory-service event sunta hai aur apne inventory DB mein stock ghatata hai. Ek DB gire toh sirf ek service.' },
      { at: ['odb', 'idb'], set: { odb: { tone: 'gold' }, idb: { tone: 'gold' } }, say: 'Keemat: JOIN gaya, dono DB par ek transaction gayi, foreign key gayi. Ilaaj agle levels mein: cross-service query aur saga.' },
    ],
  },

  querying: {
    intro: 'Admin ko chahiye: <b>"Delhi ke users ke pending orders"</b>. Monolith mein ek JOIN tha. Ab users aur orders alag services mein hain.',
    nodes: [
      { id: 'us', col: 1, row: 0, icon: '👤', label: 'user-service', sub: '50,000 Delhi users' },
      { id: 'q', col: 0, row: 1, icon: '📊', label: 'Admin dashboard', sub: 'Delhi + pending', tone: 'accent' },
      { id: 'rm', col: 2, row: 1, icon: '📖', label: 'Read model', sub: 'delhi_pending_orders' },
      { id: 'os', col: 1, row: 2, icon: '🧾', label: 'order-service' },
    ],
    steps: [
      { from: 'q', to: 'us', label: 'Delhi ke users?', say: 'Monolith mein ek JOIN, 5 ms. Services mein naive tareeka: pehle user-service se Delhi ke 50,000 users.' },
      { from: 'q', to: 'os', label: 'har user ke orders × 50,000', tone: 'bad', set: { os: { tone: 'bad', sub: '50,000 calls 😵' } }, say: 'Phir order-service ko har user ke liye ek call: 50,000 calls. N+1 ka distributed roop.' },
      { at: ['q'], say: 'API composition (gateway calls karke app mein jode) chhoti queries ke liye theek hai. Badi query par fan-out aur tail latency maar deti hai.' },
      { from: 'us', to: 'rm', label: 'UserMoved event', set: { os: { tone: '', sub: '' } }, say: 'CQRS read model: user events (city badli) se ek denormalized table bharo.' },
      { from: 'os', to: 'rm', label: 'OrderPlaced event', say: 'Order events (naya order, status badla) bhi usi read model table mein jaate hain: city + status + order ek row mein.' },
      { from: 'q', to: 'rm', label: 'ek tez query', tone: 'good', set: { rm: { tone: 'good' } }, say: 'Ab ek query, ek table, tez. Keemat: read model thoda purana (events ka lag) aur extra jagah.' },
      { at: ['rm'], say: 'Aur raaste: zaroori fields ki apni local copy (local JOIN), ya search index. Chunav query ki zaroorat se karo: data kitna taaza chahiye, aur query ka shape kya hai.' },
    ],
  },

  saga: {
    intro: 'Order, stock, payment — teen services, teen DB. Payment fail hua. <b>ROLLBACK</b> nahi hai. Ab kya?',
    nodes: [
      { id: 'orch', col: 0, row: 1, icon: '🎼', label: 'Saga orchestrator', tone: 'accent' },
      { id: 'order', col: 1, row: 0, icon: '🧾', label: 'order-service' },
      { id: 'stock', col: 1, row: 1, icon: '📦', label: 'stock-service' },
      { id: 'pay', col: 1, row: 2, icon: '💳', label: 'payment-service' },
    ],
    steps: [
      { at: ['orch'], set: { orch: { tone: 'bad', sub: '2PC: coordinator mara' } }, say: '2PC: coordinator sabse "ready?" poochhta hai. Prepare ke baad coordinator mar jaaye toh sab locks pakde latke rehte hain. Availability sabse kamzor participant jaisi.' },
      { from: 'orch', to: 'order', label: '1. order (pending)', tone: 'good', set: { orch: { tone: 'accent', sub: 'saga' }, order: { sub: 'pending' } }, say: 'Saga: chhote local transactions ki shrinkhala. Kadam 1: order banao, status pending.' },
      { from: 'orch', to: 'stock', label: '2. stock reserve', tone: 'good', set: { stock: { sub: '1 reserved' } }, say: 'Kadam 2: stock reserve karo.' },
      { from: 'orch', to: 'pay', label: '3. charge', tone: 'bad', set: { pay: { tone: 'bad', sub: 'card decline ❌' } }, say: 'Kadam 3: payment fail, card decline.' },
      { from: 'orch', to: 'stock', label: '↩ stock chhodo', tone: 'gold', set: { stock: { tone: 'gold', sub: 'released' } }, say: 'Compensate, ulte kram mein: pehle stock chhodo. Har kadam ka apna compensating action pehle se likha hota hai.' },
      { from: 'orch', to: 'order', label: '↩ order cancel', tone: 'gold', set: { order: { tone: 'gold', sub: 'cancelled' } }, say: 'Phir order cancel. Saga khatam: sab kuch ek saaf haalat mein.' },
      { at: ['orch'], say: 'Choreography (har service event sun kar agla kadam) vs orchestration (ek orchestrator sab chalata hai). Saga mein isolation nahi: beech mein koi "pending" order dekh sakta hai, isliye pending state saaf dikhao.' },
    ],
  },

});
