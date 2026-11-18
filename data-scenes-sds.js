/* =====================================================================
   System Gurukul — Scenes: 🎥 System Design School tracks (sds-routing, sds-contracts, sds-live)
   Kadam-dar-kadam diagrams (scene.js). Numbers wahi jo level ke lesson mein hain.
   Load order: sabhi data-sds-*.js ke baad (VISUALS pehle ban chuke hon).
   ===================================================================== */
SD.addScenes({

  'sds-routing-path': {
    intro: 'Ek shop app, do services. Request ko pehle <b>service</b> milti hai, phir us service ka <b>instance</b>.',
    nodes: [
      { id: 'client', col: 0, row: 1, icon: '📱', label: 'Client', sub: 'Alice ka phone' },
      { id: 'entry', col: 1, row: 1, icon: '🚦', label: 'API entry', tone: 'accent' },
      { id: 'oa', col: 2, row: 0, icon: '🖥️', label: 'orders-a', sub: 'orders ki copy 1' },
      { id: 'ob', col: 2, row: 1, icon: '🖥️', label: 'orders-b', sub: 'orders ki copy 2' },
      { id: 'img', col: 2, row: 2, icon: '🖼️', label: 'images-a', sub: 'image service' },
    ],
    steps: [
      { from: 'client', to: 'entry', label: 'GET /orders/7 + token', say: 'Client order 7 maangta hai. API entry token jaanchti hai: request Alice ki hai. Order dekhne ki ijaazat order service khud jaanchegi.' },
      { at: ['entry'], set: { entry: { sub: 'service: orders' } }, say: 'Path /orders se service chuni gayi: orders. Ab orders ke do instances mein se ek chunna hai.' },
      { from: 'entry', to: 'oa', label: 'baari 1 · round robin', tone: 'good', say: 'Round robin matlab baari-baari. Pehli baari orders-a ki. Request ki copy har server ko nahi jaati, sirf ek ko.' },
      { from: 'entry', to: 'img', label: 'GET /images/logo.png', tone: 'good', say: 'Agli request image ki hai. Wahi entry point images pool chunta hai. Orders ki round-robin baari kharch nahi hui.' },
      { from: 'entry', to: 'ob', label: 'baari 2 · orders-b', tone: 'good', say: 'Agli order request orders-b ko jaati hai. Pehle service, phir us service ka instance: do alag faisle.' },
    ],
  },

  'sds-routing-debug': {
    intro: 'Har gateway ka apna niyam hai: Alice ki 10 second mein <b>2 requests</b>. Product poore system mein sirf 2 chahta hai.',
    nodes: [
      { id: 'alice', col: 0, row: 1, icon: '👤', label: 'Alice', tone: 'accent' },
      { id: 'ga', col: 1, row: 0, icon: '🚪', label: 'Gateway A', sub: 'counter: 0' },
      { id: 'gb', col: 1, row: 2, icon: '🚪', label: 'Gateway B', sub: 'counter: 0' },
      { id: 'pool', col: 2, row: 1, icon: '🖥️', label: 'orders pool', sub: 'orders-a, orders-b' },
    ],
    steps: [
      { from: 'alice', to: 'ga', label: 'request 1 → 200', tone: 'good', set: { ga: { sub: 'counter: 1' } }, say: 'Load balancer pehli request Gateway A ko deta hai. Gateway A use maanta hai aur apna counter 1 karta hai.' },
      { from: 'alice', to: 'gb', label: 'request 2 → 200', tone: 'good', set: { gb: { sub: 'counter: 1' } }, say: 'Agli request Gateway B ko jaati hai. Gateway B ka counter alag hai, toh wo bhi 1 karta hai aur maan leta hai.' },
      { at: ['ga', 'gb'], set: { ga: { tone: 'bad', sub: 'counter: 2' }, gb: { tone: 'bad', sub: 'counter: 2' } }, say: 'Do aur requests: Gateway A aur Gateway B dono 2 tak pahunche. Kul chaar requests andar gayi, jabki hadd sirf 2 thi.' },
      { at: ['pool'], set: { pool: { sub: 'orders-c bhi juda' } }, say: 'Team ne naya backend orders-c joda. Backend ki kshamata badhi, par gateway ke counters wahi rahe.' },
      { from: 'alice', to: 'ga', label: 'agli request → 429', tone: 'bad', say: 'Wahi 10 second ki window hai. Gateway A apni 2 requests maan chuka hai, toh agli request ko 429 deta hai. orders-c jodne se counter nahi badla.' },
      { at: ['ga', 'gb'], set: { ga: { tone: 'good', sub: 'saanjha quota' }, gb: { tone: 'good', sub: 'saanjha quota' } }, say: 'Sakht global hadd ke liye saanjha quota chahiye. Saanjhi state giri toh request maano ya roko, ye niyam bhi pehle tay karo.' },
    ],
  },

  'sds-contracts-kyun': {
    intro: 'Server ne <b>201 Created</b> bola. User ne link khola aur <b>404</b> aaya. Galti kahan hui?',
    nodes: [
      { id: 'client', col: 0, row: 1, icon: '📱', label: 'Client', sub: 'abc → menu chahiye' },
      { id: 'jobs', col: 1, row: 0, icon: '📋', label: 'Saved jobs', sub: 'khaali' },
      { id: 'links', col: 2, row: 1, icon: '💾', label: 'Link DB', sub: 'abc nahi hai' },
    ],
    steps: [
      { from: 'client', to: 'jobs', label: 'POST abc → menu', set: { jobs: { sub: 'abc: pending' } }, say: 'Client abc ke liye lamba URL bhejta hai. Server sirf pending job save karta hai. Link DB mein abhi kuch nahi.' },
      { from: 'jobs', to: 'client', label: '201 Created (jaldi)', tone: 'bad', say: 'Bug: server turant 201 Created bol deta hai. Vaada tha ki link chalega, par mapping abhi bani hi nahi.' },
      { from: 'client', to: 'links', label: 'GET /s/abc → 404', tone: 'bad', say: 'User turant link kholta hai. Redirect sirf Link DB padhta hai. abc wahan nahi mila, toh 404.' },
      { from: 'jobs', to: 'links', label: 'worker commit', tone: 'good', set: { links: { tone: 'good', sub: 'abc → menu' }, jobs: { tone: 'good', sub: 'abc: done' } }, say: 'Worker ab mapping commit karta hai. Ab redirect chalega, par pehle diya gaya 201 jhootha nikla.' },
      { at: ['client'], set: { client: { tone: 'good', sub: 'commit ke baad 201' } }, say: 'Ilaaj: commit ke baad hi 201 do, ya imaandaar 202 aur status URL do. Jawab ka vaada sach hona chahiye.' },
    ],
  },

  'sds-contracts-kaise': {
    intro: 'Kaam dheema hai, toh client ko <b>202 + status</b> do. Worker fail ho jaaye, tab kya dikhana hai?',
    nodes: [
      { id: 'client', col: 0, row: 1, icon: '📱', label: 'Client', sub: 'processing...' },
      { id: 'jobs', col: 1, row: 1, icon: '📋', label: 'Saved jobs', tone: 'accent' },
      { id: 'worker', col: 2, row: 1, icon: '⚙️', label: 'Worker' },
      { id: 'links', col: 3, row: 1, icon: '💾', label: 'Link DB', sub: 'abc nahi hai' },
    ],
    steps: [
      { from: 'client', to: 'jobs', label: 'POST abc → menu', set: { jobs: { sub: 'abc: pending' } }, say: 'Kaam dheema hai, isliye server pakka job save karta hai. Link DB abhi khaali hai.' },
      { from: 'jobs', to: 'client', label: '202 + /jobs/abc', tone: 'good', say: 'Client ko 202 aur status URL milta hai. UI processing dikhati hai. Chalne laayak link ka vaada abhi nahi hua.' },
      { from: 'jobs', to: 'worker', label: 'job uthao', tone: 'bad', set: { worker: { tone: 'bad', sub: 'transaction fail' } }, say: 'Worker job uthata hai, par transaction fail hota hai. Job pending hi rehta hai. Client ko done bolna galat hoga.' },
      { from: 'worker', to: 'links', label: 'retry: mapping + done', tone: 'good', set: { worker: { tone: 'good', sub: 'retry safal' }, links: { tone: 'good', sub: 'abc → menu' }, jobs: { tone: 'good', sub: 'abc: done' } }, say: 'Retry safal hota hai. Mapping aur job ka done, dono ek transaction mein save hote hain.' },
      { at: ['client'], set: { client: { tone: 'good', sub: 'status done → 302' } }, say: 'Client status done dekhta hai, phir link kholta hai: 302. Pending, success aur failure, teeno user ko saaf dikhe.' },
    ],
  },

  'sds-contracts-code': {
    intro: 'Analytics ko "link bana" ka event bhejna hai. Bhejne wala beech mein gira. Kya event <b>do baar</b> ginega?',
    nodes: [
      { id: 'app', col: 0, row: 1, icon: '💾', label: 'App DB', sub: 'mapping + outbox', tone: 'accent' },
      { id: 'relay', col: 1, row: 1, icon: '📮', label: 'Relay', sub: 'niyat padhta hai' },
      { id: 'consumer', col: 2, row: 1, icon: '📊', label: 'Analytics', sub: 'count: 0' },
    ],
    steps: [
      { at: ['app'], set: { app: { sub: 'intent: unsent' } }, say: 'Link mapping aur created:abc bhejne ki niyat ek transaction mein commit hui. Analytics abhi nahi badli.' },
      { from: 'relay', to: 'consumer', label: 'created:abc', tone: 'good', set: { consumer: { sub: 'count: 1 · id darj' } }, say: 'Relay event bhejta hai. Analytics pehli baar event ID darj karti hai, aur usi transaction mein count 1 karti hai.' },
      { at: ['relay'], set: { relay: { tone: 'bad', sub: 'sent likhne se pehle gira' } }, say: 'Relay sent likhne se pehle gir gaya. Restart par wahi niyat App DB mein unsent dikhti hai.' },
      { from: 'relay', to: 'consumer', label: 'created:abc (dobara)', tone: 'gold', set: { relay: { tone: 'good', sub: 'retry' } }, say: 'Retry wahi event ID dobara bhejti hai. Analytics ID pehchaanti hai, toh count 1 hi rehta hai.' },
      { at: ['app'], set: { app: { tone: 'good', sub: 'intent: sent' } }, say: 'Relay ab niyat ko sent maark karta hai. Outbox khoi niyat bachata hai. Consumer ki idempotency dobara asar rokti hai.' },
    ],
  },

  'sds-contracts-kab': {
    intro: 'Video upload hua. Kya video ab <b>chalne laayak</b> hai? Har haalat ka alag saboot chahiye.',
    nodes: [
      { id: 'phone', col: 0, row: 1, icon: '📱', label: 'Phone', sub: 'video bhej raha' },
      { id: 'store', col: 1, row: 0, icon: '🗄️', label: 'Object storage' },
      { id: 'db', col: 1, row: 2, icon: '💾', label: 'Metadata DB' },
      { id: 'enc', col: 2, row: 1, icon: '⚙️', label: 'Encoder' },
      { id: 'cdn', col: 3, row: 1, icon: '🌐', label: 'CDN', sub: 'abhi kuch nahi' },
    ],
    steps: [
      { from: 'phone', to: 'store', label: 'parts upload', say: 'Phone video ke parts seedhe object storage ko bhejta hai. Fail hua part dobara bheja ja sakta hai.' },
      { at: ['store'], set: { store: { tone: 'good', sub: 'complete · v2 · checksum' } }, say: 'Saare parts aane ke baad S3 ka CompleteMultipartUpload safal hona chahiye. Phir app object version aur checksum jaanchti hai. Video abhi chalne laayak nahi.' },
      { at: ['db'], set: { db: { tone: 'good', sub: 'metadata + job saved' } }, say: 'App upload jaanch ke metadata aur job ek transaction mein save karti hai. Commit fail ho, toh object reh sakta hai aur job nahi banti; tab milaan karo.' },
      { from: 'store', to: 'enc', label: 'v2 ke bytes', tone: 'good', say: 'Encoder na badalne wale version v2 ke bytes padhta hai. File ke naam par bharosa nahi, kyunki naam ke upar likha ja sakta hai.' },
      { at: ['enc', 'store', 'db', 'cdn'], set: { enc: { tone: 'good', sub: 'outputs saved' }, db: { tone: 'good', sub: 'playable' }, cdn: { sub: 'viewer ki ijaazat jaancho' } }, say: 'Encoder outputs object storage mein save karta hai. App zaroori outputs aur manifest jaanch ke video playable batati hai. CDN se playback aur viewer ki ijaazat bhi jaancho.' },
    ],
  },

  'sds-webhook': {
    intro: 'Shop service order ka event bhejti hai. Receipt kho gayi, event dobara aaya. Order <b>do baar</b> badlega?',
    nodes: [
      { id: 'sender', col: 0, row: 1, icon: '📤', label: 'Shop service' },
      { id: 'recv', col: 1, row: 1, icon: '📥', label: 'Receiver', tone: 'accent' },
      { id: 'queue', col: 2, row: 1, icon: '📦', label: 'Durable queue' },
      { id: 'worker', col: 3, row: 1, icon: '⚙️', label: 'Worker' },
    ],
    steps: [
      { from: 'sender', to: 'recv', label: 'POST evt-1', say: 'Shop service evt-1 bhejti hai. Receiver signature aur message ka format jaanchta hai.' },
      { from: 'recv', to: 'queue', label: 'evt-1 save', tone: 'good', set: { queue: { sub: 'evt-1 save' } }, say: 'Queue save ka vaada poora karke pushti deti hai. Tabhi receiver 2xx jawab bhej sakta hai.' },
      { at: ['recv'], set: { recv: { tone: 'bad', sub: 'Timeout' } }, say: 'Receiver event save hone ke baad, jawab bhejne se pehle gir gaya. Shop service ko timeout mila: nateeja pata nahi.' },
      { from: 'sender', to: 'recv', label: 'POST evt-1 (dobara)', tone: 'gold', set: { recv: { tone: 'accent', sub: 'wapas chalu' } }, say: 'Shop service wahi evt-1 dobara bhejti hai, shayad naye signature ke saath. Signature sahi hai, par event pehle aa chuka.' },
      { from: 'recv', to: 'sender', label: '200 · event save hai', tone: 'good', say: 'Receiver dobara aaya event sambhal ke 200 deta hai. Worker ka kaam abhi baaki hai.' },
      { from: 'queue', to: 'worker', label: 'evt-1', tone: 'good', set: { worker: { sub: 'evt-1 darj + update' } }, say: 'Worker evt-1 ko pehli baar darj karta hai, aur usi transaction mein order ka update lagata hai.' },
      { from: 'worker', to: 'queue', label: 'commit ke baad ack', tone: 'good', say: 'Worker commit ke baad queue ko ack bhejta hai. Ack queue tak na pahunche, toh evt-1 worker ko phir mil sakta hai.' },
      { at: ['worker'], set: { worker: { tone: 'good', sub: 'duplicate: skip' } }, say: 'Duplicate evt-1 aaya, toh ID pehle se darj milti hai; update dobara nahi lagta. Receipt, commit aur ack, teeno alag seemaayein hain.' },
    ],
  },

  'sds-live-kyun': {
    intro: 'Kitchen ne order <b>ready</b> kar diya. Customer ki screen abhi bhi <b>cooking</b> kyun dikha rahi hai?',
    nodes: [
      { id: 'screen', col: 0, row: 1, icon: '📱', label: 'Customer screen', sub: 'cooking' },
      { id: 'api', col: 1, row: 1, icon: '🔌', label: 'API server' },
      { id: 'db', col: 2, row: 1, icon: '💾', label: 'Order DB', sub: 'cooking' },
      { id: 'kitchen', col: 3, row: 1, icon: '🍳', label: 'Kitchen' },
    ],
    steps: [
      { from: 'screen', to: 'api', label: 'poll: order-41?', say: 'Customer ki screen har 5 second poochhti hai: order-41 ka status kya hai? Jawab aata hai: cooking.' },
      { from: 'kitchen', to: 'db', label: 'ready save', tone: 'good', set: { db: { tone: 'good', sub: 'ready' } }, say: 'Kitchen ne ready save kiya. Order DB sahi hai, par screen ne abhi dobara nahi poochha.' },
      { at: ['screen'], set: { screen: { tone: 'bad', sub: 'abhi bhi cooking' } }, say: 'Screen purani hai. Agle poll tak lagbhag 5 second ka intezaar ho sakta hai, upar se network ki der.' },
      { from: 'screen', to: 'api', label: 'agla poll', tone: 'good', set: { screen: { tone: 'good', sub: 'ready' } }, say: 'Agla poll ready laata hai. 600 screens har 5 second mein poochhein, toh ausat 120 requests/s. Sab saath poochhein, toh ek pal mein zyada requests aa sakti hain.' },
    ],
  },

  'sds-live-kaise': {
    intro: 'Connection ek <b>sadak</b> hai, history ek <b>register</b>. Sadak khulne se chhooti entries apne aap nahi aati.',
    nodes: [
      { id: 'browser', col: 0, row: 1, icon: '📱', label: 'Browser', sub: 'cursor 1' },
      { id: 'api', col: 1, row: 1, icon: '🔌', label: 'API server' },
      { id: 'log', col: 2, row: 1, icon: '📒', label: 'Event history', sub: 'v1' },
    ],
    steps: [
      { from: 'api', to: 'browser', label: 'v1 · cooking', tone: 'good', say: 'Browser ne version 1 lagaaya. Browser ka cursor ab 1 hai.' },
      { at: ['browser', 'log'], set: { browser: { tone: 'bad', sub: 'Wi-Fi toota' }, log: { sub: 'v1, v2, v3' } }, say: 'Connection toot gaya. Is beech server ne version 2 (ready) aur version 3 (delivered) save kiye.' },
      { from: 'browser', to: 'api', label: 'reconnect · cursor 1', tone: 'gold', set: { browser: { tone: 'accent', sub: 'cursor 1' } }, say: 'Browser dobara juda. App ne version 1 laga diya tha, isliye app ka cursor 1 hai. Sirf aage ke updates sune, toh 2 aur 3 chhoot jaayenge.' },
      { from: 'api', to: 'log', label: 'order-41, seq > 1', say: 'Server history se order-41 ke seq > 1 wale badlaav, badhte kram mein padhta hai.' },
      { from: 'api', to: 'browser', label: 'replay v2, v3', tone: 'good', set: { browser: { tone: 'good', sub: 'v3 · delivered' } }, say: 'Screen ne 2 aur 3 kram se lagaaye. Screen delivered dikhati hai aur app ka cursor 3 ho gaya. Sadak khulna aur register se entries laana alag kaam hain.' },
    ],
  },

  'sds-live-code': {
    intro: 'History mein sirf aakhri 3 badlaav (2, 3, 4) bache hain. Do screens alag cursor ke saath wapas judti hain.',
    nodes: [
      { id: 'sa', col: 0, row: 0, icon: '📱', label: 'Screen A', sub: 'cursor 1' },
      { id: 'sb', col: 0, row: 2, icon: '📱', label: 'Screen B', sub: 'cursor 0' },
      { id: 'api', col: 1, row: 1, icon: '🔌', label: 'API server' },
      { id: 'log', col: 2, row: 1, icon: '📒', label: 'History', sub: 'rows 2, 3, 4' },
    ],
    steps: [
      { at: ['log'], set: { log: { tone: 'accent', sub: 'aakhri version 4' } }, say: 'History mein 2, 3, 4 bache hain. Cursor 1 ka matlab version 1 pehle hi laga tha. Isliye 1 sabse purana cursor hai jisse poora replay mil sakta hai.' },
      { from: 'sa', to: 'api', label: 'resume · cursor 1', say: 'Screen A ka cursor 1 hai. Chhoote badlaav 2, 3, 4 abhi history mein rakhe hain.' },
      { from: 'api', to: 'sa', label: 'replay 2, 3, 4', tone: 'good', set: { sa: { tone: 'good', sub: 'poori · v4' } }, say: 'Server kram mein 2, 3, 4 bhejta hai. Screen A poori ho gayi.' },
      { from: 'sb', to: 'api', label: 'resume · cursor 0', tone: 'bad', say: 'Screen B ka cursor 0 hai. Version 1 gayab hai, toh poora replay ho hi nahi sakta.' },
      { from: 'api', to: 'sb', label: 'reset · snapshot v4', tone: 'gold', set: { sb: { tone: 'gold', sub: 'snapshot se v4' } }, say: 'Server chupchaap adhoora replay nahi karta. Snapshot se screen theek hoti hai, par chhoote payment jaise asar wapas nahi aate.' },
    ],
  },

  'sds-live-kab': {
    intro: 'Protocol ka naam yaad mat karo. Teen sawaal poochho: <b>disha</b>, <b>taazgi</b>, aur <b>recovery</b>.',
    nodes: [
      { id: 'need', col: 0, row: 1, icon: '❓', label: 'Zaroorat', tone: 'accent' },
      { id: 'poll', col: 1, row: 0, icon: '🔁', label: 'Polling' },
      { id: 'sse', col: 1, row: 1, icon: '📺', label: 'SSE + HTTP' },
      { id: 'ws', col: 1, row: 2, icon: '🔌', label: 'WebSocket' },
    ],
    steps: [
      { from: 'need', to: 'poll', label: '30 s purana chalega', tone: 'good', say: 'Andar ki report, 20 users, 30 second purana data chalega: polling se shuru karo aur asli bojh naapo.' },
      { from: 'need', to: 'sse', label: 'zyadatar server updates', tone: 'good', say: 'Order updates zyadatar server bhejta hai. SSE aur alag HTTP cancel request se shuru kar sakte ho. Update ki der aur dobara judne ka niyam jaancho.' },
      { from: 'need', to: 'ws', label: 'dono taraf baar-baar', tone: 'good', say: 'Saath likhne wala cursor: dono taraf baar-baar messages. WebSocket socho, par reconnect aur seemit buffers phir bhi banao.' },
      { at: ['sse', 'ws'], set: { sse: { sub: 'recovery app banati hai' }, ws: { sub: 'recovery app banati hai' } }, say: 'Protocol ka naam history nahi deta. Har chunaav mein chhoote events ka replay ya snapshot ka niyam app ko khud banana hai.' },
    ],
  },

});
