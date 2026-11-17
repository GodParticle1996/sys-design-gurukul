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
      { at: ['link'], set: { link: { tone: 'good', sub: 'jud gaya' }, mum: { tone: '', sub: 'balance: ₹500' }, del: { tone: '', sub: 'balance: ₹500' } }, say: 'PACELC: partition na ho (Else), tab bhi chunav hai: Latency ya Consistency. Har write Delhi ke ack ka intezaar kare (consistent, dheema) ya nahi (tez, thoda purana).' },
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
      { from: 'api', to: 'pri', label: 'apna data: primary se', tone: 'good', set: { user: { tone: 'good', sub: 'nayi photo ✅' }, rep: { tone: '', sub: '2 s peeche' } }, say: 'Pattern 1: apna likha primary se padho. Pattern 2: write ke baad primary par raho; replica pakad le tab replica se padho. Sirf kuch second rukne se taaza data pakka nahi.' },
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
      { from: 'mono', to: 'timer', label: 'duration ✅', tone: 'good', set: { timer: { tone: 'good', sub: 'duration ke liye' } }, say: 'Duration hamesha monotonic clock se: kabhi peeche nahi jaati. Wall clock sirf logs, display aur certificate expiry ke liye.' },
      { from: 'a', to: 'db', label: "'Riya S' · t=.050", say: "Server A ki ghadi 50 ms aage hai. Server A ne naam 'Riya S' likha; timestamp .050." },
      { from: 'b', to: 'db', label: "'Riya Sharma' · t=.020", tone: 'bad', set: { db: { tone: 'bad', sub: "'Riya S' jeeta 😱" } }, say: "Server B ne asal waqt mein BAAD mein 'Riya Sharma' likha, par Server B ki ghadi .020 kehti hai. Last-write-wins ne 'Riya S' rakha: naya write chup-chaap gaya." },
      { at: ['db'], set: { db: { tone: 'gold', sub: 'Lamport / vector / HLC' } }, say: 'Logical clocks: Lamport ka number kaaran ka kram rakhta hai; chhota number asal mein pehle hone ka saboot nahi. Vector clock concurrent writes pehchaanta hai. HLC mein wall clock aur counter milte hain.' },
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
      { from: 'n1', to: 'n3', label: 'vote do (term 3)', set: { n3: { tone: 'good', sub: 'vote ✓' }, n1: { tone: 'good', sub: 'LEADER · term 3' } }, say: 'Node 1 ko 3/5 votes (khud samet) mile: majority. Term 3 ka leader. Term chunav ka badhta number hai. Purana leader bada term dekhkar pad chhodta hai; majority bina naya write commit nahi kar sakta.' },
      { from: 'client', to: 'n1', label: 'x = 10', say: 'Client write bhejta hai: x = 10. Leader apne log mein entry UNCOMMITTED likhta hai.' },
      { from: 'n1', to: 'n4', label: 'AppendEntries', say: 'Leader followers ko AppendEntries bhejta hai. Followers apne log mein likh kar ack karte hain.' },
      { from: 'n1', to: 'n5', label: 'AppendEntries', set: { n4: { sub: 'ack ✓' }, n5: { sub: 'ack ✓' } }, say: 'Is term ki entry 3/5 nodes par pakki likhi gayi: commit. Agle leader ke paas entry bachne ke liye majority ke saath vote dete waqt log ki jaanch bhi zaroori hai.' },
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
      { from: 'bus', to: 'inv2', label: 'stock ghatao', tone: 'good', say: 'inventory-service event sunkar apne DB mein stock ghatata hai. Alag DB se failure ka daayra ghat sakta hai; doosri services ke zaroori kaam phir bhi ruk sakte hain.' },
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
      { from: 'orch', to: 'order', label: '↩ order cancel', tone: 'gold', set: { order: { tone: 'gold', sub: 'cancelled' } }, say: 'Phir order cancel. Sudhaar ke kadam bhi fail ho sakte hain: unka status rakho, retry karo, zaroorat par insaan sambhaale.' },
      { at: ['orch'], say: 'Choreography (har service event sun kar agla kadam) vs orchestration (ek orchestrator sab chalata hai). Saga mein isolation nahi: beech mein koi "pending" order dekh sakta hai, isliye pending state saaf dikhao.' },
    ],
  },

  outbox: {
    intro: 'Order DB mein save hua, par Kafka tak event <b>kabhi nahi pahuncha</b>. Sabse chhupa hua data-loss bug.',
    nodes: [
      { id: 'broker', col: 1, row: 0, icon: '📨', label: 'Kafka' },
      { id: 'inv', col: 2, row: 0, icon: '📦', label: 'inventory-service' },
      { id: 'api', col: 0, row: 1, icon: '🧾', label: 'order-service', tone: 'accent' },
      { id: 'db', col: 1, row: 1, icon: '🗄️', label: 'orders DB' },
      { id: 'relay', col: 2, row: 1, icon: '🔁', label: 'Relay', sub: 'polling ya CDC' },
    ],
    steps: [
      { from: 'api', to: 'db', label: 'save(order) ✅', tone: 'good', say: 'Dual write: order-service pehle order DB mein save karta hai ✅.' },
      { from: 'api', to: 'broker', label: 'publish(event) — crash 💥', tone: 'bad', set: { broker: { tone: 'bad', sub: 'event gaya hi nahi' }, inv: { tone: 'bad', sub: 'pata hi nahi' } }, say: 'Event bhejne se pehle crash. Order DB mein hai, event kabhi nahi gaya; inventory-service ko pata hi nahi. Chup-chaap data inconsistency.' },
      { at: ['api'], say: 'Kram ulta karo toh ulta problem: event chala gaya, order bana hi nahi. Bina saajhe commit protocol ke do systems mein atomic write nahi milta.' },
      { from: 'api', to: 'db', label: 'orders + outbox, 1 COMMIT', tone: 'good', set: { db: { tone: 'good', sub: 'order + outbox row' }, broker: { tone: '', sub: '' }, inv: { tone: '', sub: '' } }, say: 'Outbox: order aur event dono usi DB ki do tables mein, EK transaction mein. Atomic ✅. Beech mein doosra system hai hi nahi.' },
      { from: 'db', to: 'relay', label: 'naye outbox rows', say: 'Alag relay process outbox padhta hai: polling (har kuch second SELECT) ya CDC (DB ka log padhna, DB par kam load).' },
      { from: 'relay', to: 'broker', label: 'publish, phir mark sent', tone: 'good', say: 'Relay Kafka ko event bhejta hai, phir outbox row ko "sent" mark karta hai.' },
      { from: 'broker', to: 'inv', label: 'OrderPlaced', tone: 'gold', say: 'Relay publish ke baad, mark karne se pehle crash ho toh event dobara jaayega. Outbox at-least-once deta hai, exactly-once nahi: inventory-service idempotent chahiye.' },
    ],
  },

  exactlyonce: {
    intro: 'Cashback consumer ne Riya ko ₹50 diye, phir <b>ACK se pehle crash</b>. Broker ab kya kare?',
    nodes: [
      { id: 'broker', col: 0, row: 1, icon: '📨', label: 'Broker', sub: 'msg m-77', tone: 'accent' },
      { id: 'cons', col: 1, row: 1, icon: '👷', label: 'cashback consumer' },
      { id: 'db', col: 2, row: 1, icon: '🗄️', label: 'wallet DB', sub: 'Riya: ₹500' },
    ],
    steps: [
      { from: 'broker', to: 'cons', label: 'm-77: ₹50 cashback', say: 'Consumer message m-77 leta hai: Riya ko ₹50 cashback.' },
      { from: 'cons', to: 'db', label: '+₹50', tone: 'good', set: { db: { sub: 'Riya: ₹550' } }, say: 'Sahi consumer ne ek transaction mein m-77 ki processed ID aur ₹50 credit dono likhe. Riya ka balance ₹550.' },
      { at: ['cons'], set: { cons: { tone: 'bad', sub: 'ACK se pehle crash 💥' } }, say: 'ACK bhejne se PEHLE crash. Broker ko pata nahi: kaam hua ya nahi? Dono haalat broker ko ek jaisi dikhti hain.' },
      { at: ['broker'], say: 'Do hi raaste: dobara bhejo (at-least-once → duplicate ka khatra) ya mat bhejo (at-most-once → data loss). Teesra koi nahi.' },
      { from: 'broker', to: 'cons', label: 'm-77 dobara', tone: 'gold', set: { cons: { tone: '', sub: 'restart hua' } }, say: 'Broker m-77 dobara bhejta hai (at-least-once). Naive consumer phir ₹50 jodta: ₹600 😱.' },
      { from: 'cons', to: 'db', label: 'INSERT m-77 + credit, 1 txn', tone: 'good', set: { db: { tone: 'good', sub: 'm-77 pehle se → skip' } }, say: 'Processed ID aur credit pehli delivery par ek transaction mein likhe the. Dobara m-77 ka INSERT unique key se rukta hai: naya credit nahi. Riya ka balance ₹550 hi.' },
      { at: ['db'], say: 'At-least-once + idempotent processing = effectively-once. Broker ka "exactly-once" broker ke apne scope tak hai; bahar ke side effects (SMS, bank) ka nahi.' },
    ],
  },

  streams: {
    intro: '"Kafka bhi toh queue hi hai na?" Nahi. Queue ek to-do list hai; Kafka ek <b>log</b> — ek itihaas.',
    nodes: [
      { id: 'g1', col: 2, row: 0, icon: '🕵️', label: 'fraud group', sub: 'offset 1,204' },
      { id: 'prod', col: 0, row: 1, icon: '💸', label: 'pay-api', sub: 'PaymentDone events', tone: 'accent' },
      { id: 'log', col: 1, row: 1, icon: '📜', label: 'Kafka topic (log)', sub: '7 din retention' },
      { id: 'g2', col: 2, row: 1, icon: '📊', label: 'analytics group', sub: 'offset 980' },
      { id: 'g3', col: 2, row: 2, icon: '🎁', label: 'rewards group (naya)', sub: 'bache events se' },
    ],
    steps: [
      { from: 'prod', to: 'log', label: 'append', say: 'pay-api har payment ka event log ke aakhir mein jodta hai. Message padhne ke baad bhi retention tak rehta hai.' },
      { from: 'log', to: 'g1', label: 'fraud check', say: 'Har consumer group ko poora data milta hai. fraud group apna offset khud rakhta hai.' },
      { from: 'log', to: 'g2', label: 'apni speed se', say: 'analytics group alag speed se padhta hai. Dono groups ek doosre ko nahi rokte.' },
      { from: 'log', to: 'g3', label: 'bache events replay', tone: 'good', set: { g3: { tone: 'good' } }, say: 'Naya rewards group sirf retention mein bache events replay kar sakta hai. Bug se galat ginti hui? Bache data ka offset peeche karo. Delete ho chuka data replay nahi hota.' },
      { at: ['log'], set: { log: { tone: 'gold', sub: '6 partitions' } }, say: 'Partitions = parallelism ki hadd: 6 partitions par ek group mein zyada se zyada 6 consumers kaam karte hain. Ordering sirf partition ke andar.' },
      { at: ['g2'], say: 'Event time (payment kab hua) vs processing time (kab padha). Late events ke liye watermark: "is waqt tak ke events aa chuke maano".' },
    ],
  },

  scheduling: {
    intro: '50,000 users ko bill due hone se 5 din pehle reminder bhejna hai. Har ghante <b>2 crore rows</b> scan karoge?',
    nodes: [
      { id: 'cron', col: 0, row: 0, icon: '⏰', label: 'Hourly cron', sub: 'poori table scan' },
      { id: 'cards', col: 1, row: 0, icon: '🗄️', label: 'cards table', sub: '2 crore rows' },
      { id: 'lock', col: 2, row: 1, icon: '👑', label: 'Leader lock', sub: 'TTL + fencing token' },
      { id: 'bill', col: 0, row: 2, icon: '🧾', label: 'Bill aaya', sub: 'ya due date badli' },
      { id: 'rem', col: 1, row: 2, icon: '📅', label: 'reminders table', sub: 'reminder_at (index)' },
      { id: 'worker', col: 2, row: 2, icon: '👷', label: 'Workers' },
      { id: 'sms', col: 3, row: 2, icon: '📲', label: 'SMS provider' },
    ],
    steps: [
      { from: 'cron', to: 'cards', label: 'WHERE due_date …', tone: 'bad', set: { cards: { tone: 'bad', sub: '2 crore scan / ghanta' } }, say: 'Polling: har ghante 2 crore cards scan, 50,000 reminders mile. Wahi bimari jo deep pagination mein thi: jawab ke liye poora data chhuna.' },
      { from: 'bill', to: 'rem', label: 'reminder_at = due − 5 din', tone: 'good', set: { cards: { tone: '', sub: '2 crore rows' } }, say: 'Sawaal ulta karo: bill aaye ya due date badle, tabhi ek baar reminder_at likh do (user ke timezone mein).' },
      { from: 'worker', to: 'rem', label: 'reminder_at <= now()', tone: 'good', set: { rem: { tone: 'good' } }, say: 'Workers sirf abhi tak due rows padhte hain: index par chhota range scan. Due date badli? Bas ek row update.' },
      { at: ['worker'], set: { worker: { sub: 'FOR UPDATE SKIP LOCKED' } }, say: 'FOR UPDATE SKIP LOCKED locked rows chhodta hai. Transaction khatam toh lock chhoot gaya: kaam ka claim save karo, warna doosra worker wahi row phir utha sakta hai.' },
      { from: 'worker', to: 'sms', label: 'SMS, phir mark sent', say: 'SMS bhejo, phir row "sent" mark karo. SMS ke baad, mark se pehle crash = dobara SMS. Exactly-once namumkin: at-least-once + idempotency key.' },
      { at: ['lock'], set: { lock: { tone: 'gold' } }, say: 'Scheduler raat 3 baje mara? TTL lock se naya leader aa sakta hai. Resource khud fencing token jaanche toh purane leader ka write rukta hai. Dobara SMS rokne ke liye idempotency alag chahiye.' },
      { at: ['rem'], say: 'Scale par: time buckets (har minute ka bucket), partitions, aur stagger: sab reminders 9:00:00 par nahi, 9:00–9:05 mein bikhar kar.' },
    ],
  },

  locks: {
    intro: 'Worker A ke paas lock hai… <b>ya Worker A ko aisa lagta hai</b>. Distributed lock jhooth kaise bolta hai?',
    nodes: [
      { id: 'a', col: 0, row: 0, icon: '👷', label: 'Worker A' },
      { id: 'lock', col: 1, row: 1, icon: '🔐', label: 'Lock service', sub: 'TTL 30 s' },
      { id: 'b', col: 0, row: 2, icon: '👷', label: 'Worker B' },
      { id: 'store', col: 2, row: 1, icon: '🗄️', label: 'Storage', sub: 'last token: 0' },
    ],
    steps: [
      { from: 'a', to: 'lock', label: 'lock do', tone: 'good', set: { a: { tone: 'good', sub: 'lock ✓ · token 33' } }, say: 'Worker A lock leta hai (TTL 30 s). Saath mein fencing token 33 milta hai.' },
      { at: ['a'], set: { a: { tone: 'bad', sub: 'GC pause 40 s ⏸️' } }, say: 'Worker A ka GC pause: 40 second. Worker A ko pata hi nahi ki waqt beeta.' },
      { from: 'b', to: 'lock', label: 'lock do', tone: 'gold', set: { lock: { tone: 'gold', sub: 'A ka expire → B' }, b: { tone: 'good', sub: 'lock ✓ · token 34' } }, say: '30 second par Worker A ka lock expire hua. Lock Worker B ko mila, token 34.' },
      { from: 'b', to: 'store', label: 'write · token 34', tone: 'good', set: { store: { sub: 'last token: 34' } }, say: 'Worker B storage par likhta hai, token 34 ke saath.' },
      { from: 'a', to: 'store', label: 'write · token 33', tone: 'bad', set: { a: { tone: 'bad', sub: 'jaaga, likhne laga' }, store: { tone: 'good', sub: '33 < 34 → REJECT' } }, say: 'Worker A jaaga aur likhne laga: khud ko abhi bhi maalik samajhta hai. Storage token 33 dekhta hai, 34 se chhota → REJECT. Fencing token ne double write roka.' },
      { at: ['lock'], say: 'Lease liveness ke liye, fence safety ke liye. Redlock pause se nahi bachata: lock service ko Worker A ke pause ka pata hi nahi chalta.' },
      { at: ['store'], say: 'Kabhi lock ki jagah DB unique constraint ya shart wala update kaafi hai. Partition se kaam baanto; worker badle toh purane worker ki likhai rokne ka niyam phir bhi chahiye.' },
    ],
  },

  'lock-choices': {
    intro: 'Taala chahiye? Kaunsa — Redis, ZooKeeper, Postgres? Ya <b>taala chahiye bhi nahi</b>?',
    nodes: [
      { id: 'redis', col: 0, row: 0, icon: '⚡', label: 'Redis SET NX EX', sub: 'lease, tez' },
      { id: 'zk', col: 1, row: 0, icon: '🦓', label: 'ZooKeeper / etcd', sub: 'line mein number' },
      { id: 'pg', col: 2, row: 0, icon: '🐘', label: 'Postgres advisory', sub: 'session ke saath' },
      { id: 'none', col: 3, row: 0, icon: '🚫', label: 'Koi taala nahi', sub: 'ON CONFLICT / version' },
      { id: 'w', col: 1, row: 2, icon: '👥', label: '100 waiters', tone: 'accent' },
    ],
    steps: [
      { at: ['redis'], say: 'Redis SET NX EX: lease, tez. Khatra: pause ke baad purana holder. Resource ko token jaanchna padega.' },
      { at: ['zk'], say: 'ZooKeeper/etcd: session expiry, aur sequential node se line mein number. Har waiter sirf apne aage wale ko dekhta hai.' },
      { from: 'w', to: 'zk', label: 'sabko jagao: 5,050', tone: 'bad', say: 'Lab 36: 100 waiters. Lock chhootne par "sabko jagao" = 5,050 wake-ups; sab daudte hain, ek jeet-ta hai (thundering herd).' },
      { from: 'w', to: 'zk', label: 'line mein agla: 100', tone: 'good', say: '"Line mein agla" (ZooKeeper jaisa): sirf agle waiter ko jagao. Kul 100 wake-ups.' },
      { at: ['pg'], say: 'Postgres advisory lock: session khatam hote hi lock chhoot jaata hai. DB pehle se hai, toh naya system nahi chahiye. DB failure par bartaav test karo.' },
      { at: ['none'], set: { none: { tone: 'good' } }, say: 'Kya taala chahiye bhi? Idempotent write (ON CONFLICT) ya optimistic concurrency (version column) se aksar kaam chal jaata hai.' },
      { at: ['redis', 'zk', 'pg'], say: 'Granularity: poori table nahi, sirf ek row ka taala. Ordering: do taale chahiye toh hamesha ek hi kram mein lo (chhota id pehle), warna deadlock.' },
    ],
  },

  contention: {
    intro: 'Seat A-12 ek hai, khareedaar do: Riya aur Aman. Dono ko <b>"free"</b> dikha. Ab?',
    nodes: [
      { id: 'a', col: 0, row: 0, icon: '📱', label: 'Riya', tone: 'accent' },
      { id: 'db', col: 1, row: 1, icon: '🗄️', label: 'seats table', sub: 'A-12: free' },
      { id: 'b', col: 0, row: 2, icon: '📱', label: 'Aman', tone: 'accent' },
      { id: 'hold', col: 2, row: 1, icon: '⏳', label: 'Reservation', sub: 'hold 10 min (TTL)' },
    ],
    steps: [
      { from: 'a', to: 'db', label: 'SELECT → free', say: 'Riya ki request: seat A-12 free hai? Haan.' },
      { from: 'b', to: 'db', label: 'SELECT → free', say: 'Aman ki request bhi: free hai? Haan. Riya ki request ne abhi UPDATE nahi kiya.' },
      { from: 'a', to: 'db', label: 'UPDATE → sold', say: 'Riya ki request UPDATE karti hai: sold.' },
      { from: 'b', to: 'db', label: 'UPDATE → sold', tone: 'bad', set: { db: { tone: 'bad', sub: 'A-12: do log 💥' } }, say: 'Aman ki request bhi: sold. Ek seat, do log. Transaction atomicity deti hai, "beech mein koi na aaye" nahi. READ COMMITTED par dono SELECT safal.' },
      { at: ['db'], set: { db: { tone: 'good', sub: "WHERE status='free'" } }, say: "Ilaaj: condition update ke andar: UPDATE … WHERE status='free'. Ek hi request safal; doosri ko 0 rows. Ya pessimistic: SELECT … FOR UPDATE." },
      { from: 'db', to: 'hold', label: 'hold 10 min', tone: 'good', say: 'Checkout ka asli pattern: reservation. Seat 10 minute hold (TTL). Payment aaye toh hold ka maalik aur expiry jaancho, phir sold.' },
      { at: ['db'], say: 'Lock ke andar kabhi network call nahi (payment API lock pakde rakhegi). Conflict kam toh optimistic (version check); garam row par pessimistic.' },
    ],
  },

  'boss-dist': {
    intro: 'FINAL BOSS: poora order system. Har kadam par ek purana sabak lagta hai.',
    nodes: [
      { id: 'orch', col: 2, row: 0, icon: '🎼', label: 'Saga orchestrator' },
      { id: 'app', col: 0, row: 1, icon: '📱', label: 'App', tone: 'accent' },
      { id: 'os', col: 1, row: 1, icon: '🧾', label: 'order-service' },
      { id: 'broker', col: 2, row: 1, icon: '📨', label: 'Broker' },
      { id: 'svc', col: 3, row: 1, icon: '🧩', label: '3 services', sub: 'inventory, payment, ship' },
      { id: 'db', col: 1, row: 2, icon: '🗄️', label: 'orders DB', sub: 'order + outbox' },
      { id: 'rm', col: 2, row: 2, icon: '📖', label: 'Read model', sub: 'Delhi pending orders' },
    ],
    steps: [
      { from: 'app', to: 'os', label: 'Idempotency-Key', tone: 'good', say: '1. App Idempotency-Key ke saath order bhejta hai. Double-submit safe; order pending.' },
      { from: 'os', to: 'db', label: 'order + outbox, 1 txn', tone: 'good', say: '2. Order aur outbox row ek durable transaction mein. Relay rukne par event DB mein bachta hai; bhejne ke liye relay ki recovery aur retry chahiye.' },
      { from: 'db', to: 'broker', label: 'relay → event', say: 'Relay outbox se event broker tak le jaata hai.' },
      { from: 'broker', to: 'orch', label: 'OrderPlaced', say: '3. Saga orchestrator flow chalata hai, taaki poora flow ek jagah dikhe.' },
      { from: 'orch', to: 'svc', label: 'reserve → charge → ship', say: '4. Har service idempotent: at-least-once mein duplicates aa sakte hain, isliye ek hi kaam dobara lagne se bachao.' },
      { at: ['svc', 'orch'], set: { svc: { tone: 'bad', sub: 'payment fail ❌' }, orch: { tone: 'gold', sub: 'compensate: ulta kram' } }, say: '5. Payment fail? Compensate: stock chhodo, order cancel. User ko state dikhao, kyunki saga mein isolation nahi.' },
      { from: 'broker', to: 'rm', label: 'events', tone: 'good', say: '6. "Delhi ke pending orders" ke liye read model, kyunki cross-service JOIN gaya.' },
      { at: ['os'], say: 'Kai services mein apne aap ek transaction nahi milta. Retry par dohra asar roko, status dikhao, aur jahan mumkin ho sudhaar ka kadam rakho. Bheja SMS wapas nahi aata.' },
    ],
  },

});
