/* Major-topic decision guides. Explicit level assignments keep coverage
   reviewable; adding a level requires choosing its teaching context.
   Examples marked kalpanik are arithmetic/design inputs, not live claims.
   Public company stories retain their original sources and historical era. */
(function () {
  const sources = {
    http: { title: 'HTTP semantics — RFC 9110', url: 'https://www.rfc-editor.org/rfc/rfc9110.html' },
    retry: { title: 'Amazon Builders Library — timeouts and retries', url: 'https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/' },
    pg: { title: 'PostgreSQL — index tradeoffs', url: 'https://www.postgresql.org/docs/current/indexes.html' },
    part: { title: 'PostgreSQL — partitioning', url: 'https://www.postgresql.org/docs/current/ddl-partitioning.html' },
    tx: { title: 'PostgreSQL — transaction isolation', url: 'https://www.postgresql.org/docs/current/transaction-iso.html' },
    backup: { title: 'PostgreSQL — backup and PITR', url: 'https://www.postgresql.org/docs/current/continuous-archiving.html' },
    cache: { title: 'Redis — eviction policies', url: 'https://redis.io/docs/latest/develop/reference/eviction/' },
    stream: { title: 'Node.js — streams and backpressure', url: 'https://nodejs.org/api/stream.html' },
    overload: { title: 'Google SRE — handling overload', url: 'https://sre.google/sre-book/handling-overload/' },
    signals: { title: 'Google SRE — monitoring', url: 'https://sre.google/sre-book/monitoring-distributed-systems/' },
    tailatscale: { title: 'Dean & Barroso — The Tail at Scale (CACM 2013)', url: 'https://research.google/pubs/the-tail-at-scale/' },
    traces: { title: 'OpenTelemetry — traces', url: 'https://opentelemetry.io/docs/concepts/signals/traces/' },
    kafka: { title: 'Apache Kafka — design and delivery semantics', url: 'https://kafka.apache.org/41/design/design/' },
    eventtime: { title: 'Apache Flink — event time and watermarks', url: 'https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/time/' },
    raft: { title: 'Raft — original extended paper', url: 'https://raft.github.io/raft.pdf' },
    clock: { title: 'Spanner — original paper', url: 'https://research.google/pubs/spanner-googles-globally-distributed-database/' },
    nginx: { title: 'NGINX — upstream selection methods', url: 'https://nginx.org/en/docs/http/ngx_http_upstream_module.html' },
    probes: { title: 'Kubernetes — startup, readiness and liveness', url: 'https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/' },
    cpu: { title: 'Kubernetes — requests and limits', url: 'https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/' },
    idem: { title: 'Stripe — idempotency contract', url: 'https://docs.stripe.com/api/idempotent_requests' },
    blobs: { title: 'Amazon S3 — presigned URLs', url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html' },
    geo: { title: 'S2 — developer guide', url: 'https://s2geometry.io/devguide/' },
    peer: { title: 'BitTorrent — BEP 3 protocol', url: 'https://www.bittorrent.org/beps/bep_0003.html' },
    dht: { title: 'BitTorrent — BEP 5 DHT', url: 'https://www.bittorrent.org/beps/bep_0005.html' },
    sandbox: { title: 'gVisor — security architecture', url: 'https://gvisor.dev/docs/architecture_guide/intro/' },
    e2e: { title: 'Signal — Double Ratchet specification', url: 'https://signal.org/docs/specifications/doubleratchet/' },
    ann: { title: 'HNSW — original research paper', url: 'https://arxiv.org/abs/1603.09320' },
    ml: { title: 'DeepSeek-V3 — technical report', url: 'https://arxiv.org/abs/2412.19437' },
    efa: { title: 'Amazon EC2 — Elastic Fabric Adapter', url: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/efa.html' },
    runtime: { title: 'Node.js — event loop and worker pool', url: 'https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop' },
    warehouse: { title: 'Snowflake — warehouse architecture', url: 'https://docs.snowflake.com/en/user-guide/warehouses-overview' },
    launch: { title: 'Google SRE — reliable product launches', url: 'https://sre.google/sre-book/reliable-product-launches/' },
    ecst: { title: 'Martin Fowler — What do you mean by "Event-Driven"?', url: 'https://martinfowler.com/articles/201701-event-driven.html' },
    leveling: { title: 'Azure — Queue-Based Load Leveling pattern', url: 'https://learn.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling' },
    sqsdlq: { title: 'Amazon SQS — dead-letter queues', url: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html' },
    rmqack: { title: 'RabbitMQ — consumer acknowledgements and publisher confirms', url: 'https://www.rabbitmq.com/docs/confirms' },
    kafkaintro: { title: 'Apache Kafka — introduction: partitions and ordering', url: 'https://kafka.apache.org/41/getting-started/introduction/' },
    eventsourcing: { title: 'Azure — Event Sourcing pattern', url: 'https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing' },
    kurrentappend: { title: 'Kurrent (EventStoreDB) — appending events and expected revision', url: 'https://docs.kurrent.io/clients/node/v1.3/appending-events.html' },
    propertysourcing: { title: 'Oskar Dudycz — Anti-patterns in event modelling: Property Sourcing', url: 'https://event-driven.io/en/property-sourcing/' },
    tolerantreader: { title: 'Martin Fowler — Tolerant Reader', url: 'https://martinfowler.com/bliki/TolerantReader.html' },
    protobufenc: { title: 'Protocol Buffers — encoding (varint, keys, length-delimited)', url: 'https://protobuf.dev/programming-guides/encoding/' },
    tls13: { title: 'RFC 8446 — TLS 1.3 (handshake, 0-RTT replay)', url: 'https://www.rfc-editor.org/rfc/rfc8446' },
    http2spec: { title: 'RFC 9113 — HTTP/2 (streams and multiplexing)', url: 'https://www.rfc-editor.org/rfc/rfc9113' },
    dnsspec: { title: 'RFC 1034 — DNS concepts (resolvers, delegation, TTL)', url: 'https://www.rfc-editor.org/rfc/rfc1034' },
    ecs: { title: 'RFC 7871 — EDNS Client Subnet', url: 'https://www.rfc-editor.org/rfc/rfc7871' },
    bgpspec: { title: 'RFC 4271 — BGP-4 (route selection)', url: 'https://www.rfc-editor.org/rfc/rfc4271' },
    gfs: { title: 'The Google File System (SOSP 2003)', url: 'https://research.google/pubs/the-google-file-system/' },
    fast08: { title: 'An Analysis of Data Corruption in the Storage Stack (FAST 2008)', url: 'https://www.usenix.org/conference/fast-08/analysis-data-corruption-storage-stack' },
    wiredtiger: { title: 'WiredTiger Architecture Guide — B-Trees', url: 'https://source.wiredtiger.com/develop/arch-btree.html' },
    dynamo: { title: "Dynamo: Amazon's Highly Available Key-value Store (SOSP 2007)", url: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf' },
    spanner: { title: "Spanner: Google's Globally-Distributed Database (OSDI 2012)", url: 'https://research.google/pubs/spanner-googles-globally-distributed-database-2/' },
    pgvector: { title: 'pgvector — exact and approximate vector search in Postgres', url: 'https://github.com/pgvector/pgvector' },
    karger: { title: 'Karger et al. — Consistent Hashing and Random Trees (STOC 1997)', url: 'https://people.csail.mit.edu/karger/Papers/web.pdf' },
    rediscluster: { title: 'Redis Cluster specification — 16,384 hash slots', url: 'https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/' },
    twsnowflake: { title: 'Twitter Snowflake (2010) — README and IdWorker', url: 'https://github.com/twitter-archive/snowflake/tree/snowflake-2010' },
    rfc9562: { title: 'RFC 9562 — UUIDs, including time-ordered UUIDv7 (May 2024)', url: 'https://www.rfc-editor.org/rfc/rfc9562.html' },
    stripemig: { title: 'Stripe — Online migrations at scale', url: 'https://stripe.com/blog/online-migrations' },
  };
  const topics = {}, byLevel = {};
  function add(id, levels, guide) {
    const ids = levels.split(/\s+/).filter(Boolean);
    if (topics[id]) throw new Error('Duplicate guidance topic: ' + id);
    topics[id] = { ...guide, levels: ids, sources: guide.sources.map(key => sources[key]) };
    ids.forEach(level => { if (byLevel[level]) throw new Error('Duplicate guidance assignment: ' + level); byLevel[level] = id; });
  }

  add('physics', 'fp-physics-kyun fp-physics-kaise fp-physics-code fp-physics-kab', {
    title: 'Chakkar ghatao, phir server bada karo',
    misaal: 'Asha ki chai, roti, dal aur lassi ki list runner ke paas hai. Har cheez alag poochhne par counter tak naya chakkar lagta hai. Ek saath poochhne se baar-baar ka wait bach sakta hai.',
    asli: 'Data paas aur tez ho, tab bhi door ke har jawab ka wait jud sakta hai.',
    points: [
      '<b>Batch:</b> sawaal pehle pata hon toh chhoti list ek saath bhejo.',
      '<b>Parallel:</b> independent calls limited ginti mein saath chalao, taaki wait overlap ho.',
      '<b>Jaanch:</b> tez version ke values aur errors purane version jaise hi hone chahiye.',
    ],
    use: 'Menu ke har price ke liye alag remote call ho rahi ho.',
    avoid: 'Agli key pichhle jawab se milti ho toh saari keys pehle se saath mat maano.',
    mistake: 'Har request mein chhoti limit dekar poori fleet ka load bhi bounded maan lena.',
    compare: [
      { choice: 'Batch mein poochho', when: 'Saari keys ka pehle se pata ho', tradeoff: 'Calls ghatti hain; list ki size par hadd rakho' },
      { choice: 'Limited calls saath chalao', when: 'Batch ka raasta na ho, par calls independent hon', tradeoff: 'Wait overlap hota hai; dependency par load badh sakta hai' },
    ],
    followup: 'Tez version wahi values aur errors deta hai: kaise jaanchoge?',
    sources: ['stream', 'overload'],
  });
  add('scale', 'fp-scale-kyun fp-scale-kaise fp-scale-code fp-scale-kab', {
    title: 'Ausat nahi, tail dekho; machines se pehle akela hissa',
    misaal: 'Tapri par Ambani aaye toh ausat kamai karodon mein, par tapri par baithe logon ki kamai ausat ke aaspaas nahi. Thali sabse dheemi katori ka intezaar karti hai. 20 cooks bhi ek tandoor se roti tez nahi nikaal sakte.',
    asli: 'Bade scale par rare dheemapan aam ho jaata hai: percentiles naapo, load mein jagah chhodo, akela hissa ghatao.',
    points: [
      '<b>Tail:</b> ausat ki jagah p50, p95, p99 alag dekho; fan-out mein alag-alag dheemapan 1 − 0.99^N se badhta hai.',
      '<b>Knee:</b> lab ke ek-worker model mein mean response time kaam ÷ (1 − load); bhare system par har point mehenga.',
      '<b>Chhat:</b> akela (serial) hissa s ho toh speed-up 1 ÷ s se upar nahi jaata.',
      '<b>Hedge:</b> p95 ke baad doosri copy, budget aur cancel ke saath; sirf alag dheemapan aur safe request par.',
    ],
    use: 'Dashboard ka ausat theek ho par users atakte hon, ya machines badhane par bhi speed na badhe.',
    avoid: 'Busy servers par bina budget ya cancel ke hedging, aur bina naape bhaari requests par doosri copy.',
    mistake: 'Ausat latency par SLO rakhna, aur 1 − 0.99^N ko shared dheemapan par bhi laga dena.',
    compare: [
      { choice: 'Machines badhao', when: 'Kaam baant sakte ho aur akela hissa chhota ho', tradeoff: 'Chhat 1 ÷ s; lock wala hissa line banata hai' },
      { choice: 'Hedged request', when: 'Dheemapan server ki alag dikkat ho, request safe ho', tradeoff: 'Baseline p95 se ~5% extra requests; pakki hadd rakho, extra ms alag naapo' },
    ],
    followup: 'Load 70% se 90% hua: p99 kitna badhega, aur kis resource ka saturation pehle dekhoge?',
    sources: ['tailatscale', 'signals'],
  });
  add('comm', 'fp-comm-kyun fp-comm-kaise fp-comm-code fp-comm-kab', {
    title: 'Har call ka bill: round trips, handshake, bytes aur CPU',
    misaal: 'Raju paanch cheezein paanch chakkar mein laaya: dukaan ka kaam 10 second, raasta 50 minute. Dabbawala ek thaile mein 50 dabbe le jaaye toh ek chakkar. Card par poore pate ki jagah mehmaan ka number.',
    asli: 'Network call ka bill round trips × RTT + kaam hai; code tez karne se pehle round trips aur connections gino.',
    points: [
      '<b>Bill:</b> poore TCP + TLS 1.3 handshake wale naye connection par teen round trips; khule connection par ek.',
      '<b>Line:</b> garam HTTP/1.1 socket bina pipelining maangein ek-ek bhejta hai; HTTP/2 ek connection par kai streams chalata hai.',
      '<b>Bytes vs CPU:</b> Protobuf bytes bachata hai; gzip ke baad farq response ke size par tika. CPU apne stack par naapo.',
      '<b>Doori:</b> fiber mein har 1,000 km ka aana-jaana ≥ 10 ms; CDN edge handshakes user ke paas karta hai.',
    ],
    use: 'Server ka kaam chhota ho par call lambi, screen kai calls ek ke baad ek kare, ya har maang naya connection khole.',
    avoid: 'Bina profile ke "JSON dheema hai" maan ke format badalna, aur payment jaisi maang 0-RTT data mein bhejna.',
    mistake: 'Round trips mein samay ja raha ho tab server ka code tez karna, aur pooling ko multiplexing samajhna.',
    compare: [
      { choice: 'Connection pool / keep-alive', when: 'Har maang par naya connection; handshake ka samay aur CPU', tradeoff: 'Handshake bachta hai; pool ke kai sockets maangein saath chala sakte hain. Khule connections gino' },
      { choice: 'HTTP/2 multiplexing', when: 'Ek host se kai maangein ek saath chahiye', tradeoff: 'Ek connection par streams saath; TCP par packet loss saari streams rokta hai' },
      { choice: 'Chunky call / batch', when: 'Tiki hui calls, ya chhote writes ek ke baad ek', tradeoff: 'Round trips aur kernel ke safar ghatte; server par jodne ka kaam badhta hai' },
    ],
    followup: 'Mumbai ke users, server US-East, checkout mein 7 round trips. Kaunse teen badlaav sabse zyada samay bachayenge?',
    sources: ['protobufenc', 'tls13', 'http2spec'],
  });
  add('req', 'fp-req-kyun fp-req-kaise fp-req-code fp-req-kab', {
    title: 'Request ka safar: DNS, packet, raasta aur darwaze',
    misaal: 'Dost ko parcel bhejna: pehle pata dhoondo (DNS), lifaafe mein daalo (packet), courier apne contracts se raasta chune (BGP). Society ke gate par guard, lobby mein receptionist, aur flat ka maalik khud darwaza khole.',
    asli: 'App ka code chalne se pehle DNS, raasta aur kai darwaze samay lete hain; har kadam ka bill alag naapo.',
    points: [
      '<b>DNS:</b> cold lookup mein root → TLD → authoritative ke round trips; valid copy upstream ko bachati hai (lab: 6–7 ms).',
      '<b>Loss:</b> gira UDP sawaal poora timeout rukta hai; chhota loss median kam badalta hai, ausat aur tail badhte hain.',
      '<b>Raasta:</b> BGP ek prefix mein policy, phir AS path chunta hai; forwarding sabse lamba prefix. Anycast hamesha paas nahi.',
      '<b>Darwaze:</b> edge handshake paas karta hai; lab mein WAF ~rules × bytes; L4 connection par, L7 request par.',
    ],
    use: 'Pehli request dheemi ho par handler tez, users door ke PoP par pahunchein, ya bade uploads par edge/WAF dheema ho.',
    avoid: 'Data center move ke din TTL badalna, upload format par bekaar text rules chalana, aur gateway ke bharose service checks hatana.',
    mistake: 'Geo DNS ko user ka IP dikhta hai maan lena; asal mein aam taur par resolver ka IP dikhta hai (ECS na ho toh).',
    compare: [
      { choice: 'Lamba TTL', when: 'IP kam badalta hai, lookups ka bojh ghatana hai', tradeoff: 'Kam sawaal aur tez lookup; IP badalne par purana pata der tak' },
      { choice: 'L4 load balancer', when: 'Lambe connections, path routing nahi chahiye', tradeoff: 'Sasta aur tez; path nahi dekhta, keep-alive par ek backend' },
      { choice: 'L7 load balancer', when: 'Path ya header se route, retries, auth', tradeoff: 'Har request padhta hai; lab ke ek keep-alive connection par ~2.2–2.6× proxy CPU' },
    ],
    followup: 'Mumbai PoP paas hai, phir bhi Dubai ke users Frankfurt jaate hain. Kaunse do numbers maangoge aur kya badloge?',
    sources: ['dnsspec', 'ecs', 'bgpspec'],
  });
  add('per', 'fp-per-kyun fp-per-kaise fp-per-code fp-per-kab', {
    title: 'Pakkapan ki physics: page cache, WAL, B-tree aur LSM',
    misaal: 'Cashier har bill notepad ki agli line mein likhta hai, raat ko register bharta hai. Whiteboard tez par bijli ke saath mit-ta hai. Godown maal seedha rack par rakhta hai, ya dher mein rakh ke baad mein chhaant-ta hai.',
    asli: '"Done" tab sach hai jab poora write aur safal fsync ho chuka ho; har engine pakkepan ka bill alag jagah bharta hai.',
    points: [
      '<b>fsync:</b> write() sirf page cache (RAM) tak; app crash bachta hai, power cut ki guarantee nahi. Group commit fsync baant-ta hai.',
      '<b>WAL:</b> pehle log mein append + fsync, table baad mein (checkpoint). Recovery: table, phir log; crash se adhoora aakhri record kaato, checksum fail par ruko.',
      '<b>Checksum:</b> chupi kharabi pakadta hai, theek nahi karta; theek karne ke liye doosri copy chahiye.',
      '<b>Engine:</b> random keys par B-tree ke page writes bikharte hain; LSM sasta likhta hai, bill compaction mein. Apna workload naapo.',
    ],
    use: 'API "saved" kahe par power cut ke baad data gayab ho, likhne ka bill samajh na aaye, ya engine aur key design chunna ho.',
    avoid: 'fsync se pehle "done" bolna, har commit par akela fsync jab kai clients hon, aur bina doosri copy ke checksum par bharosa.',
    mistake: '"B-tree mein 4 levels = har query 4 disk reads" maan lena. Lab ke clustered model mein inner pages pinned hon toh ~1 leaf read; PostgreSQL heap table mein heap page bhi lag sakta hai.',
    compare: [
      { choice: 'B-tree', when: 'Padhna zyada ho, range queries chahiye, keys badhti hon', tradeoff: 'Inner pages RAM mein hon toh lookup ~1 leaf read; random keys par writes bahut saare pages mein' },
      { choice: 'LSM-tree', when: 'Likhna bahut zyada ho aur keys random hon', tradeoff: 'Append sasta; compaction ka bill, missing keys ke liye bloom filter chahiye' },
      { choice: 'Group commit', when: 'Kai clients ek saath "done" ka intezaar', tradeoff: 'Har commit pakka, fsyncs kam; akele client ko faayda nahi' },
    ],
    followup: 'Payments service har commit par fsync karti hai aur 64 users par ~280 ms rukti hai. Kya naapoge aur kya badloge?',
    sources: ['gfs', 'fast08', 'wiredtiger'],
  });
  add('tax', 'fp-tax-kyun fp-tax-kaise fp-tax-code fp-tax-kab', {
    title: 'Data ka shape: sawaal pehle, database baad mein',
    misaal: 'Rishtedaaron ki har diary mein address likha toh shift hone par har diary badalni padti hai. Library mein catalogue ho toh kitaab turant milti hai, chahe library kitni bhi badi ho.',
    asli: 'Har shape kisi ek sawaal ke liye tez hai; database ka naam nahi, access pattern aur index dekho.',
    points: [
      '<b>Copies:</b> document mein data copy karna padhna tez karta hai, par har copy badalne ka zimma app par; crash beech mein ho toh transaction chahiye.',
      '<b>Join tax:</b> lab mein (har user ke 5 orders, garam cache) index wala join 10,000 se 10 lakh users par lagbhag same; bina index har query poori table padhti hai. Matching rows, sort aur thanda cache bhi kharcha badhate hain.',
      '<b>Graph:</b> 2-hop par walk index wale SQL se ~8–9× tez, par index wala SQL bhi sub-millisecond; seconds sirf bina index. Gehre traversals graph ki asli jagah.',
      '<b>Schema on read:</b> schema hamesha hai — table mein, ya har reader aur migration mein; galat reader chupchaap kam ginta hai.',
    ],
    use: 'Naya feature ya naya database chunna ho, query bade data par dheemi lage, ya data ki copies sync se bahar jaane lagen.',
    avoid: 'Brand dekh ke database chunna, EXPLAIN dekhe bina migration, aur bina transaction ke kai copies badalna.',
    mistake: '"SQL bade data par join se marta hai" maan lena. Lab 56 ex2, teen runs: indexed query 7.7–9.4 → 10.8–14.2 µs (10,000 → 10 lakh users), bina index 1.2–1.4 → 139.9–161.4 ms. Pehle plan aur matching rows naapo.',
    compare: [
      { choice: 'Relational', when: 'Transactions, join, group, sawaal pehle se pata na hon', tradeoff: 'Lachila aur sahi; index na ho toh scan' },
      { choice: 'Document / key-value', when: 'Ek page ya ek key ka data ek saath, kam rishte', tradeoff: 'Us sawaal par tez; doosre sawaal ke liye field index ya secondary index chahiye, warna scan; copies ka zimma app par' },
      { choice: 'Graph / vector', when: 'Gehre rishte (hops) ya matlab ki samaanta', tradeoff: 'Us sawaal ke liye bana index; baaki sawaal aur sync ka kaam alag' },
    ],
    followup: 'Team \'doston ke dost\' feature ke liye Neo4j lana chahti hai kyunki Postgres query 4 second leti hai. Kya naapoge aur kya badloge?',
    sources: ['dynamo', 'spanner', 'pgvector'],
  });
  add('shard', 'fp-shard-kyun fp-shard-kaise fp-shard-code fp-shard-kab', {
    title: 'Sharding: shard key sawaalon se, aur shard karne se pehle ruko',
    misaal: 'Station par 4 ticket counters. Board kahe "yatra ke mahine ke counter par jaao" toh aaj sab ek counter par. Board kahe "ticket number ke hisaab se" toh bheed bant\'ti hai, par "aaj ke saare tickets" ginne ke liye chaaron counters se poochna padta hai.',
    asli: 'Shard key tay karti hai kaunsa sawaal ek shard par rukta hai aur kaunsa sab par jaata hai. Ek key ki bheed, cross-shard joins aur migrations sharding ka kharcha hain.',
    points: [
      '<b>Range vs hash:</b> lab 57 ex1 — samay se range sharding par aaj ke 200,000 / 200,000 writes ek shard par (97% busy, baaki 0%). Hash writes baant\'ta hai, par ek ghante ki report chaaron shards par (kaam ~3×). Shard jodne par <code>hash % N</code> N/(N+1) keys hilaata hai; ring ya slots sirf naye ka hissa.',
      '<b>Hot key:</b> ek key ek shard par rehti hai, vnodes se nahi bant\'ti. Sub-keys (ex2: 10) writes ~1.5–2.2× badhaati hain — takraav ki wajah se 10× nahi — aur total ke liye k counters padhne padte hain (shard-wise batch mein calls kam).',
      '<b>IDs:</b> UUIDv4 primary key se 10 lakh inserts ~10× dheeme (ex3). Snowflake / UUIDv7 naye rows ko latest samay ke paas jodte hain (lab ka UUIDv7 ek ms ke andar random). Snowflake unique tabhi: machine id exclusive, ghadi peeche na jaaye, restart par pichhle ms se aage, aur 41-bit khidki ke andar.',
      '<b>Migration:</b> backfill ki purani copy naye data ko mita sakti hai; atomic version check + tombstone (ex5 A, dual writes fail na hon: 0 galat). Best-effort dual write + sample check galtiyan chhupa deta hai; lab mein 0 tak tabhi pahunche jab live writes rok kar poori row ka compare aur repair hua — asli cutover mein CDC/outbox catch-up.',
    ],
    use: 'Writes ya data ek machine ki had paar karein, ek tenant/user ka data saath rakhna ho, ya live system ko bina downtime naye storage par le jaana ho.',
    avoid: 'Reads ki samasya ko sharding se theek karna (pehle index, cache, read replicas), samay ya auto-increment ko range shard key banana, aur bina version check ke backfill chalana.',
    mistake: '"Vnodes se load perfectly barabar" ya "key ko 10 mein todo toh writes 10×" maan lena. Lab 57 ex2: 10 sub-keys 8 mein se sirf 5 shards par giri, ek shard par 40% votes; writes ~1.5–2.2×.',
    compare: [
      { choice: 'Range shard key', when: 'Range sawaal (samay, id ranges) zyada, key badhti nahi', tradeoff: 'Range query sirf un shards par jinke ranges chhooti hai; badhti key par hot tail' },
      { choice: 'Hash shard key', when: 'Point lookups zyada, writes baantne hain', tradeoff: 'Alag keys lagbhag bant\'ti hain, par hot key ek shard bharti hai; range aur bina-key sawaal kai shards par' },
      { choice: 'Abhi shard mat karo', when: 'Measured write load aur data ek machine ki capacity mein, reads index/cache/replicas se sambhal rahe', tradeoff: 'Sab simple (joins, transactions); ek machine ki had baad mein' },
    ],
    followup: 'Chat app: messages ko message_id ke hash se shard kiya. Ab "ek conversation ke aakhri 50 messages" har shard par jaata hai. Shard key kya karoge, aur purana data kaise le jaaoge?',
    sources: ['karger', 'dynamo', 'rediscluster', 'twsnowflake', 'rfc9562', 'stripemig'],
  });
  add('request-path', 'lifecycle networking boundaries st-cf-anycast st-cf-defense', {
    title: 'Browser slow hai: app tak request pahunchi?',
    misaal: 'Request ke safar mein browser pehle address poochhta hai, phir connection banaata hai. App ka kaam baad mein aata hai. App tez ho toh bhi pehle ke wait bach sakte hain.',
    asli: 'Poore safar mein pehli dheemi jagah dhoondo, phir badlaav karo.',
    points: [
      '<b>Setup:</b> nayi connection ka wait purani connection reuse karne se bach sakta hai.',
      '<b>Trace:</b> har mod ka waqt dekho, taaki app se pehle ka wait bhi dikhe.',
      '<b>Boundary:</b> resource ki ijazat app jaanche, kyunki app ko business ka gyaan hai.',
    ],
    use: 'Browser slow ho par app ka execution time normal dikhe.',
    avoid: 'Request app tak aayi hi nahi toh app ka CPU badhaane se shuru mat karo.',
    mistake: 'HTTP success ko poora business kaam khatam hone ka proof maan lena.',
    compare: [
      { choice: 'Edge par dekho', when: 'Request app tak nahi pahunchi ho', tradeoff: 'Connection ka raasta dikhega; business ki ijazat app mein jaancho' },
      { choice: 'App mein dekho', when: 'Request pahunchi ho aur andar wait ho', tradeoff: 'Dheemi dependency milegi; browser ka wait alag dekho' },
    ],
    followup: 'Same endpoint ek city mein slow hai aur doosri mein normal. Kaunse timings pehle milaaoge?',
    sources: ['http', 'traces'],
  });
  add('capacity-math', 'numbers estimation napkin', {
    title: 'Roz ke users se peak capacity kaise niklegi?',
    misaal: 'Maan lo 12 lakh users roz do requests bhejte hain. Roz ki ginti ko seconds mein baantne se average milta hai. Rush hour ke liye alag estimate chahiye.',
    asli: 'Capacity ka andaaza sahi units se shuru hota hai; average ko peak mat samjho.',
    points: [
      '<b>Rate:</b> din ki requests ko seconds mein baanto, taaki per-second load mile.',
      '<b>Peak:</b> bheed ka input alag rakho, kyunki average rush hour nahi bataata.',
      '<b>Jaanch:</b> andaaze ke baad wahi workload chalao, taaki pata ho ki asli atkan kya hai.',
    ],
    use: 'Design ke shuru mein machine count ka paimana samajhna ho.',
    avoid: 'Arrival pattern pata na ho toh exact decimal ko pakka answer mat bolo.',
    mistake: 'Bits aur bytes ko milaakar network ka budget nikaalna.',
    compare: [
      { choice: 'Pehle kaagaz par gino', when: 'Design abhi shuru ho', tradeoff: 'Paimana jaldi milta hai; assumptions likho' },
      { choice: 'Workload chalao', when: 'Candidate design ki capacity jaanani ho', tradeoff: 'Saboot milta hai; wahi load use karo' },
    ],
    followup: 'Ek input 10 guna galat nikla toh kaunsa design faisla sabse pehle badlega?',
    sources: ['overload', 'signals'],
  });
  add('tail-latency', 'latency fanout gs-fanout', {
    title: 'Page sabse dheeme jawab ka wait karega?',
    misaal: 'Product page catalog, price, stock, reviews aur recommendations maangta hai. Saare jawab chahiye hon toh ek dheemi service poora page rok sakti hai.',
    asli: 'Average tez ho sakta hai, phir bhi kuch users bahut der ruk sakte hain.',
    points: [
      '<b>p99:</b> measured requests mein lagbhag 99% ka waqt is hadd tak hai.',
      '<b>Fan-out:</b> saare results chahiye hon toh sabse dheemi branch ka wait hota hai.',
      '<b>Partial:</b> kuch results chhodna business allow kare tabhi adhura jawab do.',
    ],
    use: 'Interactive page ka average theek ho par slow users ki complaints aa rahi hon.',
    avoid: 'Alag request groups ke p99 ka average lekar global p99 mat nikaalo.',
    mistake: 'p99 ko har user ki maximum latency ka vaada maan lena.',
    compare: [
      { choice: 'Saare replies lo', when: 'Har result zaroori ho', tradeoff: 'Jawab poora hoga; slowest branch ka wait hoga' },
      { choice: 'Kuch replies chhodo', when: 'Business missing section ko allow kare', tradeoff: 'Wait ghat sakta hai; missing hissa saaf dikhao' },
    ],
    followup: 'Extra copy bhejkar wait ghata, par backend ka load badha. Kitna extra kaam allow karoge?',
    sources: ['signals', 'overload'],
  });
  add('async-events', 'syncasync scheduling ed-kyun ed-kaise ed-code ed-kab', {
    title: 'Parchi le li: khana bhi taiyaar hua?',
    misaal: 'Asha ki parchi counter ne rakh li. Kitchen kaam kar sakti hai, bhale message bhejne wala band ho. Parchi lena thali taiyaar hone ka vaada nahi.',
    asli: 'Kaam lena aur kaam poora karna alag haalat hain; app ka jawab farq saaf rakhe.',
    points: [
      '<b>Accepted:</b> order liya gaya hai, baad ka kaam abhi baaki ho sakta hai.',
      '<b>Copies:</b> kitchen aur notification ko alag khabar do, taaki dono apni raftaar se chalein.',
      '<b>Durability:</b> baad ka kaam restart ke baad bhi bachna chahiye.',
    ],
    use: 'Notification baad mein bhej sakte ho, par order ka jawab abhi dena ho.',
    avoid: 'Payment approved bolna ho toh result jaane bina success mat do.',
    mistake: 'Publish ka log dekhkar kitchen ka kaam bhi poora maan lena.',
    compare: [
      { choice: 'Seedha call karo', when: 'Current jawab ko result abhi chahiye', tradeoff: 'Result milega; dependency ka wait bhi judega' },
      { choice: 'Baad ke kaam ki khabar do', when: 'Business der se completion allow kare', tradeoff: 'Jawab jaldi aa sakta hai; pending kaam ka owner chahiye' },
    ],
    followup: 'Order save hua par khabar publish nahi hui. Kitchen tak khabar pahunchane ka owner kaun hai?',
    sources: ['kafka', 'http'],
  });
  add('event-payloads', 'ep-kyun ep-kaise ep-code ep-kab', {
    title: 'Khabar mein kitna data: ghanti, parchi ya sirf badlaav?',
    misaal: 'Munshi sirf ghanti bajaye toh har helper register padhne daudta hai, aur munshi chhutti par ho toh sab ruk jaate hain. Parchi ki copy saath do toh helper apni diary se kaam karte hain — par diary ko sahi rakhna padta hai.',
    asli: 'Patli khabar owner par reads aur nirbharta laati hai; moti khabar copies, version aur nazuk data ka kharcha.',
    points: [
      '<b>Patli khabar:</b> reads = khabrein × consumers, aur data owner ka abhi ka milta hai.',
      '<b>Moti khabar:</b> consumer apni copy se chalta hai; sirf bada version likho.',
      '<b>Sirf badlaav:</b> shuruaati copy + lagataar versions; gap par resync, aakhri khoya badlaav alag jaancho.',
    ],
    use: 'Consumer ko owner band hone par bhi chalna ho aur thodi purani copy manzoor ho: kaam ka data event mein bhejo.',
    avoid: 'Nazuk data (phone, pata) har subscriber tak mat failao; har consumer ko alag payload, sirf kaam ke fields.',
    mistake: 'Version jaanche bina har event copy par likh dena: purana event naye data ko mita deta hai.',
    compare: [
      { choice: 'Patli khabar + call', when: 'Faisla taaze data par ho', tradeoff: 'Owner par reads; owner band toh kaam band' },
      { choice: 'Moti khabar', when: 'Consumer ko owner se azaad chalna ho', tradeoff: 'Bada event; har jagah copy aur version check' },
      { choice: 'Sirf badlaav', when: 'Data bada ho, badlaav chhote', tradeoff: 'Lagataar version check, gap par resync, aakhri khoye badlaav ki alag jaanch' },
    ],
    followup: 'Ek delta chhoota aur agla event kabhi nahi aaya. Consumer ko gap ka pata kaise chalega?',
    sources: ['ecst', 'kafka'],
  });
  add('eda-tradeoffs', 'et-kyun et-kaise et-code et-kab', {
    title: 'Line lagao, seedha bulao, ya raftaar badhao?',
    misaal: 'Diwali ki bheed mein token line ne har grahak ko jagah di, par sabse purana 20 second ruka. Roz 50 guna bheed ho toh line ghanton lambi. Grahak thali ke liye khada ho toh token \"pending\" hi deta hai.',
    asli: 'Line thodi der ki bheed aur band consumer sambhaalti hai; user ka intezaar aur roz ka farak nahi.',
    points: [
      '<b>Burst:</b> line reject ko intezaar mein badalti hai; khaali = backlog / (nikalna − aana).',
      '<b>Band consumer:</b> line sirf retention tak rakhti hai; phir phenko ya dead-letter.',
      '<b>Chain:</b> user ko nateeja abhi chahiye toh events se zaroori kaam ka intezaar nahi mitta.',
    ],
    use: 'Alag reactions, thodi der ki bheed, ya consumer ka band rehna — jab der manzoor ho.',
    avoid: 'User screen par nateeja maang raha ho, ya aana roz nikalne se zyada ho.',
    mistake: 'Band rehne se chhoti retention: messages expire. Failure ki khabar ya pending deadline nahi: orders hamesha pending.',
    compare: [
      { choice: 'Line / events', when: 'Der manzoor, bheed thodi der ki', tradeoff: 'Reject bache; intezaar, retention aur status ka hisaab' },
      { choice: 'Seedha call', when: 'User abhi nateeja maange', tradeoff: 'Seedha jawab aur error; dependency ka wait juda' },
      { choice: 'Raftaar badhao', when: 'Aana roz nikalne se zyada', tradeoff: 'Workers ka kharcha, ya kaam kam/shed karna' },
    ],
    followup: 'Consumer 3 din band raha aur retention 1 din thi. Kitna kaam bachega, aur kaise pata chalega?',
    sources: ['leveling', 'sqsdlq'],
  });
  add('eda-races', 'er-kyun er-kaise er-code er-kab', {
    title: 'Ulta kram, khoya update, dohra kaam: kaunsa ilaaj?',
    misaal: 'Do waiter, ek board: dheema waiter purani parchi baad mein likhta hai. Do cashier, ek gullak: dono ne 1,000 padha, ek ₹10 gaya. Cashier bill likh ke behosh: parchi wapas aayi, bill do baar.',
    asli: 'Har consumer ke liye teen sawaal: kram chahiye, do writers hain, message dobara aa sakta hai?',
    points: [
      '<b>Kram:</b> ek key ke events ek waqt ek consumer ko, kram mein (Kafka: key se partition; RabbitMQ: key se queues + SAC).',
      '<b>Do writers:</b> atomic update, ya version ki shart ke saath likho aur fail par dobara.',
      '<b>Redelivery:</b> producer ki stable id, kaam ke saath ek transaction mein unique.',
    ],
    use: 'Har naye consumer ke review mein teeno sawaal poochho — teeno ka ilaaj alag hai.',
    avoid: 'Idempotency key user + amount ya aane ke waqt se mat banao.',
    mistake: 'Ek test pass hone ko saboot maanna: race timing par tiki hai aur kabhi-kabhi hi dikhti hai.',
    compare: [
      { choice: 'Key se routing', when: 'Ek cheez ke events kram mein chahiye', tradeoff: 'Kram bachta; busy key ek consumer par atak sakti hai' },
      { choice: 'Version / atomic', when: 'Do writers ek value badlein', tradeoff: 'Update nahi khota; CAS mein dobara koshish' },
      { choice: 'Stable id + transaction', when: 'Kaam ho ke bhi message dobara aaye', tradeoff: 'Dohra kaam nahi; keys kitni der rakhni hain, tay karo' },
    ],
    followup: 'Payment gateway par charge hua, apni DB mein key likhne se pehle crash. Dohra charge kaun rokega?',
    sources: ['rmqack', 'kafkaintro'],
  });
  add('eda-sourcing', 'es-kyun es-kaise es-code es-kab', {
    title: 'Passbook ya slate: event sourcing kab, aur sahi kaise?',
    misaal: 'Slate par sirf aakhri balance; passbook mein har jama-nikaasi ki line. Galti ho toh line nahi mitti, sudhaar ki nayi line judti hai. Do cashier ne ek hi purana panna dekha — doosre ka likhna mana.',
    asli: 'Sach ka source events hain; haalat events jod ke banti hai, aur events kabhi badle nahi jaate.',
    points: [
      '<b>Likhna:</b> jo version padha, append mein wahi maango; mismatch par dobara padho.',
      '<b>Read model:</b> projector store se checkpoint ke baad padhe; read model aur checkpoint ek transaction mein.',
      '<b>Tez padhna:</b> replay ka kharcha maapo; zaroorat ho toh snapshot + baaki events. Snapshot events ki jagah nahi leta.',
      '<b>Purana roop:</b> upcaster padhte waqt purane event ko naya roop deta hai, aur event ka data kabhi update nahi hota.',
    ],
    use: 'Jahan itihaas, audit ya purani tareekh ki haalat product ka hissa ho — ledger, claims, trading.',
    avoid: 'Profile, settings, simple CRUD; ya jab team versioning aur projections ka kharcha na utha sake.',
    mistake: 'Event sourcing, CQRS aur Kafka ko ek hi cheez maanna, ya poore system par ek saath laga dena.',
    compare: [
      { choice: 'Event sourcing', when: 'Itihaas hi product hai', tradeoff: 'Audit aur replay; versioning, projections, mitana mushkil' },
      { choice: 'CRUD + audit table', when: 'Aakhri haalat kaafi hai, bas kabhi-kabhi jaanna hai ki kisne badla', tradeoff: 'Seedha rehta hai; itihaas utna hi jitna audit table mein likha gaya' },
      { choice: 'CRUD + alag read model', when: 'Padhna dheema, likhna theek', tradeoff: 'Padhna tez ho jaata hai, par read model thoda peeche chalta hai' },
    ],
    followup: 'Transfer do accounts (do streams) badalta hai, aur expected version ek stream ka hai. Paisa beech mein na atke, kaise?',
    sources: ['eventsourcing', 'kurrentappend'],
  });
  add('eda-modeling', 'em-kyun em-kaise em-code em-kab', {
    title: 'Event ka design: kaam ka naam, poora fact, aur roop badalna',
    misaal: 'Naya pata teen postcards par bheja toh courier aadha naya pata le gaya; ek chitthi mein bheja toh poora. Passbook mein "balance badla" nahi, "ATM se nikaale" likho.',
    asli: 'Event ek business kaam ki ghatna hai: naam, kaat aur data usi kaam se tay karo, consumer se nahi.',
    points: [
      '<b>Kaat:</b> ek kaam ke saare field ek event mein; apne workflow wale field ka alag event.',
      '<b>Naam:</b> beete kaal mein ghatna (CashWithdrawn), haalat (BalanceUpdated) nahi.',
      '<b>Data:</b> us fact ki poori baat ho; kisi ek consumer ke liye har event mein field mat jodo.',
      '<b>Roop:</b> naya field jodo; naam badalna ho toh pehle readers taiyaar, phir dono field, phir purana hatao.',
    ],
    use: 'Har naye event ke review mein: kaunsa kaam hua, kaun-kaun padhega, aur roop kaise badlega.',
    avoid: 'Bina business wajah har field ka event; workflow ko ghatna chahiye tab generic Updated; ek consumer ke liye har event mein field.',
    mistake: 'Metadata mein field daal ke maan lena ki coupling gayi — producer ko phir bhi field bharna padta hai.',
    compare: [
      { choice: 'Har event mein field', when: 'Field sach mein us fact ka hissa ho', tradeoff: 'Seedha; par har producer badalta hai aur event bhari hota hai' },
      { choice: 'Metadata mein field', when: 'Jab jaankari event ki pehchaan ho: id, source, waqt ya tracing', tradeoff: 'Payload saaf rehta hai; producer ki coupling wahi rehti hai' },
      { choice: 'Consumer ki apni copy', when: 'Jaankari kisi aur event mein pehle se ho', tradeoff: 'Producer nahi badalta; consumer ko kram aur parking sambhaalni padti hai' },
    ],
    followup: 'Do teams ek hi event ka naam badalna chahti hain, aur ek consumer strict hai. Rollout ka kram kya hoga?',
    sources: ['propertysourcing', 'tolerantreader'],
  });
  add('service-boundaries', 'decompose st-reddit-strangle prime-boundary-tax prime-replicate prime-when-split', {
    title: 'Har nayi service ka fayda kya hai?',
    misaal: 'Prime Video ki kahani mein converter aur detectors ke beech frames bhejna mehenga tha. Kaam ek service mein aaya toh frames memory mein rahe. Independent streams ke liye poori service ki aur copies chal sakti thin.',
    asli: 'Alag service tab banao jab alag ownership ya capacity ka fayda nayi doori ka kharcha vasool kare.',
    points: [
      '<b>Boundary:</b> har network call wait aur failure ka naya mauka laati hai.',
      '<b>Scale:</b> independent kaam ho toh ek monolith ki bhi kai copies chal sakti hain.',
      '<b>Case:</b> Prime Video ka historical result har workload ka verdict nahi hai.',
    ],
    use: 'Alag team ko apna deploy aur alag capacity chahiye ho.',
    avoid: 'Sirf code ki lines badhi hain toh service split mat karo.',
    mistake: 'Services badhaane ko throughput badhne ki guarantee maan lena.',
    compare: [
      { choice: 'Ek deployment mein modules', when: 'Team aur data ka kaam saath ho', tradeoff: 'Calls ka kharcha kam hoga; deployment saath judega' },
      { choice: 'Alag service banao', when: 'Independent ownership ka fayda saaf ho', tradeoff: 'Alag deploy milega; network ka kharcha aayega' },
    ],
    followup: 'Service split ke baad data ka malik aur cross-service query ka raasta kaise tay karoge?',
    sources: ['http', 'traces'],
  });
  add('http-contract', 'naming verbs versioning errors', {
    title: 'Kya purana client naya jawab samjhega?',
    misaal: 'Server ka naya version aa gaya, par do saal purana mobile app abhi bhi wahi API bula raha hai. Field ka naam badalne se server chal sakta hai aur client toot sakta hai.',
    asli: 'API client ke saath vaada hai; server deploy karne se purane clients nahi badalte.',
    points: [
      '<b>Resource:</b> URL bataaye kis cheez par kaam hai, taaki client naam se raasta samjhe.',
      '<b>Status:</b> code bataaye request ka nateeja kya hua, taaki client agla kadam le.',
      '<b>Idempotent:</b> dobara bhejne ka intended asar ek baar jaisa ho; response badal sakta hai.',
    ],
    use: 'Alag waqt update hone wale mobile clients ko API deni ho.',
    avoid: 'Failure ko 200 ke andar chhupaakar client se guess mat karwao.',
    mistake: 'Field ka type badal kar change ko sirf cleanup samajhna.',
    compare: [
      { choice: 'Compatible addition karo', when: 'Purana client naya field ignore kar sakta ho', tradeoff: 'Gradual rollout ho sakta hai; purane client se jaancho' },
      { choice: 'Naya version do', when: 'Purana matlab ya type badalna ho', tradeoff: 'Migration ka raasta saaf hai; purana version bhi sambhaalo' },
    ],
    followup: 'DELETE dobara karne par status badla, par asar wahi raha. Method idempotent kaise hai?',
    sources: ['http'],
  });
  add('pagination', 'offset-pain cursor filtering', {
    title: 'Har page par pehli row se kyun gino?',
    misaal: 'Transaction API gehri page ke liye bahut rows ginti aur phenk deti hai. Client ko sirf 50 rows milti hain. Aakhri dekhe nishaan se chalna sawaal hi badal deta hai.',
    asli: 'Chhota response sasti query ka proof nahi; DB ko kitni rows chhooni padi, dekho.',
    points: [
      '<b>Offset:</b> pehle ke results skip karta hai, isliye gehri page mehengi ho sakti hai.',
      '<b>Keyset:</b> indexed nishaan se aage padhta hai, taaki pehle ki rows phir na ginni padein.',
      '<b>Tie-breaker:</b> same timestamp wali rows ke liye id bhi order mein rakho.',
    ],
    use: 'Badi transaction history mein ek page ke baad agli page dikhani ho.',
    avoid: 'Sort ya filter badle toh purana cursor chupchaap reuse mat karo.',
    mistake: 'Base64 cursor ko access ki ijazat maan lena.',
    compare: [
      { choice: 'Offset rakho', when: 'Data chhota ho ya page number par jump chahiye', tradeoff: 'API aasan hai; deep pages mehengi ho sakti hain' },
      { choice: 'Keyset rakho', when: 'Stable order mein aage badhna ho', tradeoff: 'Seek sasta ho sakta hai; unique order chahiye' },
    ],
    followup: 'Aakhri dekhi row delete ho jaaye toh agli page ka nishaan kaise kaam karega?',
    sources: ['pg', 'http'],
  });
  add('authorization', 'auth notion-permissions st-jira-query', {
    title: 'Login hua: private page bhi dekh sakte ho?',
    misaal: 'Notion ki kahani mein top page share karne se neeche ke blocks ki ijazat badalti hai. Ek document doosri jagah move hua toh purani cached permission galat access de sakti hai.',
    asli: 'Identity sahi hona aur kisi resource ko dekhne ki ijazat hona alag baatein hain.',
    points: [
      '<b>Authentication:</b> request bhejne wale ki identity verify karo.',
      '<b>Authorization:</b> har resource par maanga gaya action allowed hai ya nahi, jaancho.',
      '<b>Revoke:</b> access hate toh purani cached permission bhi badlo.',
    ],
    use: 'Private documents ke search results user ko dikhane hon.',
    avoid: 'Client ka tenant header bina verification ke identity mat maano.',
    mistake: 'Gateway par login pass hua toh har object allowed hoga maan lena.',
    compare: [
      { choice: 'Har read par permission jaancho', when: 'Abhi ka access enforce karna zaroori ho', tradeoff: 'Fresh faisla milega; read ka kaam badhega' },
      { choice: 'Permission cache karo', when: 'Reads tez chahiye hon', tradeoff: 'Wait ghatega; revoke par purani copy badalni padegi' },
    ],
    followup: 'Permission revoke ke baad cached search hit kitni der dikh sakti hai?',
    sources: ['http', 'tx'],
  });
  add('idempotency', 'idempotency exactlyonce gmail-delivery', {
    title: 'Jawab kho gaya: payment dobara karni hai?',
    misaal: 'Maan lo ₹4,999 ka charge ho gaya, par jawab kho gaya. Client ko request kho jaana aur jawab kho jaana ek jaisa dikhta hai. Nayi payment banaane se doosra charge ho sakta hai.',
    asli: 'Ek logical kaam ki pehchaan dobara use karo, taaki repeat attempt ka asar dobara na lage.',
    points: [
      '<b>Key:</b> same payment ki retry mein same key aur body bhejo.',
      '<b>Dedup:</b> duplicate rokne ka record durable aur atomic hona chahiye.',
      '<b>Timeout:</b> jawab na aana rollback ka proof nahi; safe retry na ho toh status jaancho.',
    ],
    use: 'Payment ka jawab kho gaya ho aur same operation ka retry contract ho.',
    avoid: 'Payment ka result unknown ho toh nayi key se dobara mat bhejo.',
    mistake: 'Header jodkar maan lena ki duplicate charge rokne ka kaam bhi ho gaya.',
    compare: [
      { choice: 'Same key se retry karo', when: 'Same kaam ka contract abhi valid ho', tradeoff: 'Duplicate rok sakte ho; record ki retention jaancho' },
      { choice: 'Status jaancho', when: 'Safe retry ka vaada pata na ho', tradeoff: 'Extra workflow hoga; naya charge banaane se bachoge' },
    ],
    followup: 'Charge aur dedup record ke beech crash aaye toh duplicate kaise rokoge?',
    sources: ['idem', 'kafka'],
  });
  add('fair-admission', 'ratelimit nn-kyun nn-kaise nn-code nn-lib nn-kab colab-rationing', {
    title: 'Annapurna ki bheed mein Bholu ki baari kahan?',
    misaal: 'KhanaKart ki ek line mein Annapurna ke bulk requests aa gaye. Bholu Dhaba ka chhota order accept bhi peeche phans gaya. Kul service chal rahi thi, par Bholu ka kaam fail hua.',
    asli: 'Andar kitna kaam aaye aur agla turn kiska ho: do alag faisle hain.',
    points: [
      '<b>Hadd:</b> har tenant ka rate roko, taaki ek tenant saari jagah na le.',
      '<b>Baari:</b> alag tenant ki lines se turns do, taaki shaant tenant peeche na phase.',
      '<b>Cost:</b> barabar request turns ka matlab barabar CPU waqt nahi hai.',
    ],
    use: 'Ek bulk import doosre customers ke interactive requests rok raha ho.',
    avoid: 'Shared IP ko ek hi tenant ki identity mat maano.',
    mistake: 'Sirf total success dekhna jab shaant tenant ka wait badh raha ho.',
    compare: [
      { choice: 'Har tenant ki hadd', when: 'Andar aane ka budget chahiye', tradeoff: 'Bheed rukegi; fixed quota khaali capacity chhod sakta hai' },
      { choice: 'Har tenant ki baari', when: 'Khaali capacity bhi use karni ho', tradeoff: 'Doosre ko spare turns milte hain; alag lines chahiye' },
    ],
    followup: '10 ms aur 10 second ke jobs ko equal turns dena kitna fair hoga?',
    sources: ['cpu', 'overload'],
  });
  add('query-index', 'modeling btree composite indextypes nplus1', {
    title: 'Phone book kis naam se sorted hai?',
    misaal: 'Phone book surname, phir first name se sorted hai. Sharma jaldi milta hai. Sirf Priya dhoondhne par poori kitaab padhni pad sakti hai.',
    asli: 'Index app ke sawaal ko fit hona chahiye; sirf index jodna kaafi nahi.',
    points: [
      '<b>Order:</b> pehle filter aur sort dekho, phir milta index chuno.',
      '<b>N+1:</b> har row par alag call ho toh saath data laakar chakkar ghatao.',
      '<b>Kharcha:</b> har index ko writes par bhi update karna padta hai.',
    ],
    use: 'Recent tenant orders ki wahi query baar-baar mehengi pad rahi ho.',
    avoid: 'Har column par index banaakar write ka kharcha mat badhao.',
    mistake: 'Thodi rows return hui toh DB ne bhi thoda kaam kiya hoga maan lena.',
    compare: [
      { choice: 'Query ka index banao', when: 'Rows dhoondhne mein zyada kaam ho', tradeoff: 'Reads tez ho sakti hain; writes par kharcha badhega' },
      { choice: 'Calls saath karo', when: 'Har row ke liye naya DB chakkar ho', tradeoff: 'Chakkar ghatenge; jawab ki size par hadd rakho' },
    ],
    followup: 'Read p99 sudhri par writes dheemi hui. Index accept karne ka niyam kya hoga?',
    sources: ['pg'],
  });
  add('storage-engine', 'ids storage engines', {
    title: 'Abhi sahi jagah likho, ya baad mein chhaanto?',
    misaal: 'Ek raasta har write par sahi page badalta hai. Doosra pehle writes jama karta hai, phir purane tukde milaata hai. Tez write ka bacha kaam baad mein aa sakta hai.',
    asli: 'Engine ka fayda apne read aur write ke mix par naapna padta hai.',
    points: [
      '<b>B-tree:</b> sahi page par badlaav karta hai, isliye page updates ka kharcha dekho.',
      '<b>LSM:</b> writes jama karta hai, isliye baad ke safai kaam ka budget rakho.',
      '<b>Compaction:</b> purane tukde milaate waqt reads ka wait badh sakta hai.',
    ],
    use: 'Persistent workload ke liye read aur write ka sauda choose karna ho.',
    avoid: 'Sirf fast-write benchmark dekhkar engine final mat karo.',
    mistake: 'LSM ka matlab har workload mein sasti write samajhna.',
    compare: [
      { choice: 'B-tree dekho', when: 'Ordered reads aur ranges zaroori hon', tradeoff: 'Page updates ka kharcha hai; apna workload naap lo' },
      { choice: 'LSM dekho', when: 'Writes jama karne se fayda ho', tradeoff: 'Safai baad mein hoti hai; disk ki jagah bachaakar rakho' },
    ],
    followup: 'Writes lagataar tez aa rahi hain. Bachi safai kaam ke liye kitni jagah aur waqt rakhoge?',
    sources: ['pg', 'part'],
  });
  add('connection-pools', 'pool yt-vitess', {
    title: 'CPU khaali hai: connection ka wait toh nahi?',
    misaal: 'Maan lo CPU 10% hai aur health green hai. Request ka peecha karne par query chhoti milti hai, par connection lene mein lagbhag saara waqt gaya.',
    asli: 'User ka wait sirf query ka waqt nahi; connection milne ki line bhi gino.',
    points: [
      '<b>Pool:</b> connections reuse karta hai aur ek saath DB kaam ki hadd rakhta hai.',
      '<b>Wait:</b> connection lene ka waqt query ke waqt se alag naapo.',
      '<b>Fleet:</b> har app copy ka pool jodkar DB ka total budget jaancho.',
    ],
    use: 'Requests timeout ho rahi hon par app ka CPU low ho.',
    avoid: 'DB pehle se bhari ho toh har app ka pool bada mat karo.',
    mistake: 'DB ke max connections ko sabse achhi concurrency maan lena.',
    compare: [
      { choice: 'Chhota pool rakho', when: 'DB ka budget bachana ho', tradeoff: 'Line dikhegi; wait ki deadline rakho' },
      { choice: 'Pool bada karo', when: 'DB mein measured spare capacity ho', tradeoff: 'Zyada kaam chal sakta hai; DB ka load phir naapo' },
    ],
    followup: 'App ki copies dugni ho gayin. DB ka total connection budget kaise bachaoge?',
    sources: ['overload', 'pg'],
  });
  add('cache-policy', 'caching stampede cache-invalidation eviction probabilistic conshash st-reddit-cache', {
    title: 'Sab copies ek saath expire hui toh?',
    misaal: 'Cache ki keys ek saath expire hoti hain. Saare readers seedhe DB par pahunchte hain. Tez hit wala system ek hi pal mein origin par bheed bhej deta hai.',
    asli: 'Cache extra copy hai; purani copy aur miss ke waqt ka niyam pehle socho.',
    points: [
      '<b>TTL:</b> waqt poora ho toh copy expire hoti hai, data badla ho ya nahi.',
      '<b>Invalidation:</b> asli data badle toh related copy ko bhi hatao.',
      '<b>Stampede:</b> same miss ke readers ko ek fill share karao, taaki DB par bheed na jaaye.',
    ],
    use: 'Mehenga jawab baar-baar chahiye ho aur thodi der purana data allowed ho.',
    avoid: 'Private user ka jawab sabke liye shared key mein mat rakho.',
    mistake: 'Cache girte hi DB ko saara traffic bhejna safe maan lena.',
    compare: [
      { choice: 'Miss par copy bharo', when: 'App read aur fill sambhaalti ho', tradeoff: 'Aasan hai; ek hi fill share karne ka niyam rakho' },
      { choice: 'Read view pehle banao', when: 'Wahi mehenga derived sawaal baar-baar aata ho', tradeoff: 'Reads tez hongi; update mein der ho sakti hai' },
    ],
    followup: 'Cache fail ho toh DB kitna traffic le sakti hai? Kaise naapoge?',
    sources: ['cache', 'overload'],
  });
  add('partitioning', 'sharding st-slack-shard st-discord-model st-discord-hot st-insta-postgres notion-scale', {
    title: 'Ek bada workspace poora shard bhar de toh?',
    misaal: 'Slack ki purani kahani mein workspace ka data ek jagah tha. Queries aasaan thin. Bahut bada workspace aaya toh ek shard par bheed thi aur paas ka shard khaali tha.',
    asli: 'Data ki key query ko paas rakhti hai, par wahi key load ki deewar bhi ban sakti hai.',
    points: [
      '<b>Partition:</b> data ka logical tukda hai; copy banaana alag kaam hai.',
      '<b>Shard:</b> data ka load baantne ka hissa hai; routing ko sahi hissa pata hona chahiye.',
      '<b>Hotspot:</b> ek key par bheed ho toh total free capacity bhi seedhi madad nahi karti.',
    ],
    use: 'Measured storage ya throughput limit ko kai servers par baantna ho.',
    avoid: 'Sirf row count bada hai toh bina routing plan ke shard mat karo.',
    mistake: 'Replicas badhaane se ek hot write key bhi split ho jaayegi maan lena.',
    compare: [
      { choice: 'Tenant ka data paas rakho', when: 'Zyada queries ek tenant ki hon', tradeoff: 'Local kaam sasta hai; bada tenant ek jagah bhar sakta hai' },
      { choice: 'Keys ko aur baanto', when: 'Ek tenant ka load ek shard se bada ho', tradeoff: 'Load batega; cross-shard query mehengi ho sakti hai' },
    ],
    followup: 'Ek tenant aadhi fleet use karta hai. Chalti service mein data kaise split karoge?',
    sources: ['part', 'kafka'],
  });
  add('migration', 'migrations st-discord-migrate dropbox-magic-migration', {
    title: 'Purana data copy hua: naye writes ka kya?',
    misaal: 'Pehle backfill karne se copy ke dauraan aate naye writes chhoot sakte hain. Purane records pahunch gaye hon, tab bhi naya store adhura ho sakta hai.',
    asli: 'Purani copy ke saath live badlaav bhi pakdo, phir traffic badlo.',
    points: [
      '<b>Live writes:</b> backfill se pehle naye badlaav pahunchane ka raasta chalu karo.',
      '<b>Verify:</b> nayi jagah ka jawab purani jagah se milao, phir reads badlo.',
      '<b>Rollback:</b> cutover ke baad bhi wapsi wali jagah par zaroori data bacha ho.',
    ],
    use: 'Bada live dataset nayi table ya store par le jaana ho.',
    avoid: 'Do jagah write bhejna apne aap atomic hai, aisa mat maano.',
    mistake: 'Backfill complete ko zero lag aur safe rollback ka proof maan lena.',
    compare: [
      { choice: 'Ek saath badlo', when: 'Data chhota ho aur downtime manzoor ho', tradeoff: 'Phases kam hain; ek galti ka asar bada ho sakta hai' },
      { choice: 'Dheere traffic badlo', when: 'Service chalti rakhni ho', tradeoff: 'Compare kar sakte ho; temporary dono raaste sambhaalo' },
    ],
    followup: 'Naye store par new-only writes aa gayin. Wapas jaate waqt writes kahan milengi?',
    sources: ['tx', 'backup'],
  });
  add('timeout-breaker', 'timeouts breaker cb-kyun cb-kaise cb-code cb-lib cb-kab', {
    title: 'Recs atki: login bhi kyun ruk gaya?',
    misaal: 'KhanaKart ki recommendations latak gayin aur app ke workers pakad liye. Login ka kaam bhi ruk gaya. Optional dabbe ka wait poori app ka wait ban gaya.',
    asli: 'Ek call ka wait roko; repeated bimaari mile toh kuch der poochhna hi roko.',
    points: [
      '<b>Timeout:</b> ek call ka wait bound karta hai, taaki caller aage badh sake.',
      '<b>Breaker:</b> failure history dekhkar agle calls kuch der rokta hai.',
      '<b>Recovery:</b> kuch probes pass hon toh bhi poori bheed ek saath mat bhejo.',
    ],
    use: 'Ek remote service baar-baar slow ho aur shared workers pakad rahi ho.',
    avoid: 'Har request par naya breaker mat banao; purani failure history chahiye.',
    mistake: 'Timeout ko remote kaam cancel ho jaane ka proof maan lena.',
    compare: [
      { choice: 'Sirf timeout rakho', when: 'Ek call ka wait bound chahiye', tradeoff: 'Caller bachega; agli request phir wait kar sakti hai' },
      { choice: 'Breaker bhi rakho', when: 'Lagataar failures pehle se dikh rahe hon', tradeoff: 'Turant doosra jawab de sakte ho; recovery dheere parkho' },
    ],
    followup: 'Do probes pass hue. Kya ab saara traffic wapas bhejna safe hai?',
    sources: ['retry', 'overload'],
  });
  add('retries', 'retries rt-kyun rt-kaise rt-code rt-lib rt-kab', {
    title: 'Dobara bhejo — par kab, kitni baar, aur kitna ruk ke?',
    misaal: 'Payment-service giri, aur chhe phones har 300 ms par dobara bhejte rahe. Service uthte hi chhe ek saath aaye, aur service phir giri. Rukna kaafi nahi tha — alag-alag pal lautna bhi zaroori tha.',
    asli: 'Retry chhoti dikkat bachata hai, par bina niyam ke khud bheed bana deta hai:',
    points: [
      '<b>Backoff:</b> har fail ke baad pehle se zyada ruko — 300, 600, 1200 ms.',
      '<b>Jitter:</b> har phone apna random waqt chune, taaki sab ek hi pal na lautein.',
      '<b>Hadd:</b> koshishon ki ginti aur user ki deadline, dono par limit rakho.',
    ],
    use: 'Jawab na aaye, ya 429/5xx aaye, aur request dobara bhejna safe ho.',
    avoid: 'Teen layers sab 3 baar koshish karein toh ek click par 3 × 3 × 3 = 27 calls. Retry ek hi layer par rakho.',
    mistake: 'Sirf backoff laga ke maan lena ki bheed toot gayi. Random wait ke bina sab phir ek hi pal lautte hain.',
    compare: [
      { choice: 'Backoff + random wait', when: 'Server ne rukne ka waqt na bataya ho', tradeoff: 'Bheed bikhar jaati hai; par kabhi wait 0 ke paas bhi aa sakta hai' },
      { choice: 'Server ka Retry-After maano', when: '429/503 ke saath server waqt bataye', tradeoff: 'Server ko pata hai kab jagah hogi; deadline nikal jaaye toh error do' },
    ],
    followup: 'Retry-After 5 second kehta hai, par user ki deadline 2 second mein khatam. Client kya kare?',
    sources: ['retry', 'http', 'idem'],
  });
  add('backpressure', 'shedding backpressure bp-kyun bp-kaise bp-code bp-lib bp-kab st-slack-queue', {
    title: 'Tanki bhari: motor ko kisne bataya?',
    misaal: 'KhanaKart mein dispatch ek order per second karta hai, par orders tez aate hain. Line badhti hai. Badi memory sirf crash ko der karti hai; dispatch ki raftaar nahi badhti.',
    asli: 'Bhari line ki khabar us jagah tak pahunchao jahan naya kaam rok sakte ho.',
    points: [
      '<b>Backlog:</b> maan lo 5 orders/s aaye aur 1/s nikle, toh line 4/s badhegi.',
      '<b>Backpressure:</b> jagah na ho toh producer ko rukne ka signal do.',
      '<b>Hadd:</b> queue ke bahar wait karte callers ko bhi bound karo.',
    ],
    use: 'File bhejne wala program dheeme receiver ka wait kar sakta ho.',
    avoid: 'Payment accept ki hai toh bhari line se order chupchaap mat girao.',
    mistake: 'Queue badi karke kaam karne ki raftaar bhi badh gayi maan lena.',
    compare: [
      { choice: 'Producer ko roko', when: 'Bhejne wala wait kar sakta ho', tradeoff: 'Kaam bachega; bahar waiters ki hadd bhi rakho' },
      { choice: 'Saaf mana karo', when: 'Request abhi accept nahi kar sakte ho', tradeoff: 'Caller ko pata chalega; retry ka niyam do' },
    ],
    followup: 'Queue bounded hai, phir bhi RAM badh rahi hai. Bahar kaun wait kar raha hai?',
    sources: ['stream', 'overload', 'http'],
  });
  add('cells-isolation', 'bulkhead blast st-cf-fleet rbx-instances rbx-cells', {
    title: 'Alag copies hain: girne ka raasta bhi alag hai?',
    misaal: 'Roblox ki purani kahani mein backend ek shared control system par tiki thi. Ek dikkat ne bahut services roki. Kai app copies bhi ek shared dependency se saath gir sakti hain.',
    asli: 'Ek failure ka asar chhote hisse tak rokna ho toh shared raaste bhi jaancho.',
    points: [
      '<b>Bulkhead:</b> critical kaam ka pool alag rakho, taaki optional kaam saare workers na le.',
      '<b>Cell:</b> serving ka alag hissa banao, taaki ek failure sab users tak na phaile.',
      '<b>Shared:</b> deploy ya auth ka common raasta alag cells ko bhi saath gira sakta hai.',
    ],
    use: 'Risky rollout ka asar sirf users ke ek chhote hisse tak rakhna ho.',
    avoid: 'Sirf node count ko independent failure domains ka proof mat maano.',
    mistake: 'Serving alag hai toh recovery ka shared raasta bhi safe hoga maan lena.',
    compare: [
      { choice: 'Pool share karo', when: 'Khaali capacity ka use pehli zaroorat ho', tradeoff: 'Utilization achha hai; failure ka asar bada ho sakta hai' },
      { choice: 'Pool ya cell alag karo', when: 'Failure ka daayra chhota chahiye', tradeoff: 'Asar ruk sakta hai; extra capacity ka kharcha hai' },
    ],
    followup: 'Ek cell gaya toh bache cells ke paas kitni spare capacity honi chahiye?',
    sources: ['overload', 'cpu'],
  });
  add('recovery', 'replication replicas-backups dr-kyun dr-kaise dr-code dr-lib dr-kab gmail-consistency', {
    title: 'Bahi ki copy hai: galat delete bhi copy hua?',
    misaal: 'Kirana bahi ki photocopy udhaar ka record bachaati hai. Par lagataar copy mein galat delete bhi pahunch sakta hai. Purane waqt ki copy ka kaam alag hai.',
    asli: 'Kitna data loss aur kitni der band rehna manzoor hai: pehle dono targets tay karo.',
    points: [
      '<b>RPO:</b> kitne waqt ka data loss manzoor hai, business se poochho.',
      '<b>RTO:</b> service kitni der mein wapas chahiye, business se poochho.',
      '<b>Backup:</b> purane sahi data par lautne ka raasta rakho, kyunki replica galti bhi copy karta hai.',
    ],
    use: 'Region loss ke liye recovery ka tareeka choose karna ho.',
    avoid: 'Snapshot ban gaya toh restore bhi waqt par ho jaayega mat maano.',
    mistake: 'Copy bhejne ko copy durable pahunchne ka acknowledgement maan lena.',
    compare: [
      { choice: 'Standby taiyaar rakho', when: 'Service jaldi wapas chahiye', tradeoff: 'Wait kam ho sakta hai; copying ka lag jaancho' },
      { choice: 'Backup se lautao', when: 'Purane sahi waqt par jaana ho', tradeoff: 'History milegi; restore ka waqt naapna padega' },
    ],
    followup: 'Purana primary wapas aaya. Do jagah writes chalne se kaun rokega?',
    sources: ['backup', 'raft'],
  });
  add('observability', 'observability slo aws-scale-rate', {
    title: 'Health hara hai: checkout ka kaam bhi hua?',
    misaal: 'Process ka health check pass hota hai, par asli requests connection ka wait karti hain. Machine zinda hona user ka kaam poora hone ka saboot nahi.',
    asli: 'User ki dikkat se shuru karo, phir request ka peecha karke waqt ka thikaana dhoondo.',
    points: [
      '<b>Metrics:</b> kitni requests fail ya slow hui, pehle gino.',
      '<b>Traces:</b> ek request mein waqt kahan gaya, dekho.',
      '<b>Logs:</b> us request par kya hua, detail padho.',
    ],
    use: 'Checkout fail ho raha ho par CPU aur health graph normal hon.',
    avoid: 'Telemetry missing ho toh zero errors mat maano.',
    mistake: 'Monitoring chal rahi hai toh app bhi healthy hogi maan lena.',
    compare: [
      { choice: 'User symptom par alert do', when: 'Availability ya wait bigad raha ho', tradeoff: 'Impact saaf hai; wajah phir dhoondho' },
      { choice: 'Resource ka wait dekho', when: 'Atkan ki jagah jaanani ho', tradeoff: 'Debug detail hai; user impact alag milao' },
    ],
    followup: 'Monitoring bhi failed region mein hai. Recovery ke liye kis independent signal par bharosa karoge?',
    sources: ['signals', 'traces'],
  });
  add('chaos-experiments', 'chaos ch-kyun ch-kaise ch-code ch-kab', {
    title: 'Teen copies hain: ek gire toh chala kar dekha?',
    misaal: 'KhanaKart ki menu-service ki teen copies thin. Ek copy mari, par load balancer purani list par requests bhejta raha. Copies thin; dead copy ko hataane ka bachav nahi tha.',
    asli: 'Chhoti planned chot dekar user ka nateeja naapo; sirf copy giraana test pass nahi hai.',
    points: [
      '<b>Baseline:</b> pehle healthy din ka haal naapo, taaki pata ho ki farq kya hai.',
      '<b>Hypothesis:</b> chhote fault ke baad ka expected nateeja pehle likho.',
      '<b>Stop:</b> nuksaan ki hadd par roko aur fault wapas lo.',
    ],
    use: 'Approved chhote test slice mein failover ka daava jaanchna ho.',
    avoid: 'Rollback test nahi hua ho toh fault experiment shuru mat karo.',
    mistake: 'Browser ke model ko real production resilience ka proof maan lena.',
    compare: [
      { choice: 'Model test karo', when: 'State ka niyam repeatably jaanchna ho', tradeoff: 'Sasta hai; real environment ki coupling chhoot sakti hai' },
      { choice: 'Chhota fault do', when: 'Integrated recovery ka saboot chahiye', tradeoff: 'Realistic hai; safe daayra aur cleanup chahiye' },
    ],
    followup: 'Fault ke dauraan measurement band ho jaaye toh experiment kya kare?',
    sources: ['signals', 'overload'],
  });
  add('consistency', 'cap eventual clocks consensus consensus-split multiregion', {
    title: 'Kamre alag ho gaye: final faisla kaun kare?',
    misaal: 'Paanch kamre dhaage wale phones se baat karte hain. Raasta tootkar teen aur do kamre alag hue. Dono groups apna final sach likhein toh decisions takra sakte hain.',
    asli: 'Network tootne par ek hi history aur har jagah jawab dene ka vaada takra sakta hai.',
    points: [
      '<b>Quorum:</b> maan lo 5 voters hain; safe majority ke liye 3 ko baat kar paana chahiye.',
      '<b>CAP:</b> network toote toh ek hi sach bachaane ke liye kuch operations rokne pad sakte hain.',
      '<b>Clock:</b> physical timestamp akela machines ke beech causal order ka proof nahi hai.',
    ],
    use: 'Shared state mein sabko ek ordered decision history chahiye ho.',
    avoid: 'Majority machines zinda hain toh reachable quorum bhi hai, aisa mat maano.',
    mistake: 'Replica se read ko hamesha abhi ka data maan lena.',
    compare: [
      { choice: 'Milkar final faisla karo', when: 'Ek history bachaana zaroori ho', tradeoff: 'Kuch operations ruk sakte hain; conflicting sach se bachoge' },
      { choice: 'Local kaam jaari rakho', when: 'Business conflict aur der se sync allow kare', tradeoff: 'Progress hogi; baad mein takraav suljhaana padega' },
    ],
    followup: 'Client ko timeout mila par write commit hui. Safe retry ka contract kya hoga?',
    sources: ['raft', 'clock', 'tx'],
  });
  add('distributed-workflow', 'dbperservice querying saga outbox boss-dist', {
    title: 'Order save hua: kitchen ko khabar kahan mili?',
    misaal: 'Order DB mein likh gaya, par event bhejne se pehle crash hua. Kitchen ko order ka pata nahi chala. Kram ulta karna bhi adhure kaam ka naya raasta hai.',
    asli: 'Order aur bhejne layak khabar ek saath bachao, phir khabar pahunchane ka owner rakho.',
    points: [
      '<b>Outbox:</b> order aur khabar ko ek hi DB transaction mein likho.',
      '<b>Relay:</b> publish dobara ho sakta hai, isliye consumer duplicate effect roke.',
      '<b>Compensation:</b> refund original charge ko history se mitaata nahi hai.',
    ],
    use: 'Alag services apna data own karti hon aur order ki khabar chahiye ho.',
    avoid: 'Do systems ko alag writes bhejkar atomic commit mat maano.',
    mistake: 'Outbox ko duplicate-free delivery ki guarantee maan lena.',
    compare: [
      { choice: 'Local transaction rakho', when: 'Poora niyam ek DB owner ke andar ho', tradeoff: 'Atomic commit milta hai; ownership ek boundary mein hogi' },
      { choice: 'Outbox se khabar bhejo', when: 'Doosri service ko baad mein kaam karna ho', tradeoff: 'Khabar bachegi; repeat delivery sambhaalni padegi' },
    ],
    followup: 'Relay publish ke baad ack se pehle crash kare toh duplicate kaise aa sakta hai?',
    sources: ['tx', 'kafka', 'idem'],
  });
  add('stream-processing', 'streams adclick', {
    title: 'Click kab hua, aur kab pahuncha?',
    misaal: 'Maan lo click 12:00 par hua, par network ke baad 12:03 par aaya. Ad bill mein click ko arrival ke waqt rakhoge toh business ka time bucket galat ho sakta hai.',
    asli: 'Event ka waqt aur pahunchne ka waqt alag hain; bucket business ke hisaab se chuno.',
    points: [
      '<b>Log:</b> events bache rehte hain, taaki har reader apni jagah se dobara padh sake.',
      '<b>Event-time:</b> kaam kab hua, us waqt se window banao jab business ko wahi chahiye.',
      '<b>Watermark:</b> late data ki policy ka signal hai; aakhri late event ka proof nahi.',
    ],
    use: 'Late mobile clicks se waqt ke hisaab ka bill banana ho.',
    avoid: 'Ek partition ke order ko poore system ka global order mat bolo.',
    mistake: 'Consumer ka ack dekhkar external charge bhi atomic hua maan lena.',
    compare: [
      { choice: 'Arrival ka waqt lo', when: 'Arrival ke hisaab se grouping allowed ho', tradeoff: 'Aasan hai; network delay bucket badal sakti hai' },
      { choice: 'Event ka waqt lo', when: 'Business ko hone ka asli waqt chahiye', tradeoff: 'Late data ka rule chahiye; purana nateeja badal sakta hai' },
    ],
    followup: 'Dedup record expire ho gaya. Purana log replay karke billing safe kaise rakhoge?',
    sources: ['kafka', 'eventtime'],
  });
  add('concurrency-control', 'locks lock-choices contention ticketmaster', {
    title: 'Purana lock holder jaaga: kya ab bhi likh sakta hai?',
    misaal: 'A ka lock expire hua jab A pause tha. B ko naya lock mila. A jaaga toh A aur B dono likhne lage; expiry ne A ko roka nahi.',
    asli: 'Resource ka niyam write ke waqt enforce karo; lock milna akela kaafi nahi.',
    points: [
      '<b>Constraint:</b> data owner ko hi last item do baar bikne se rokne do.',
      '<b>Conditional write:</b> maan lo remaining=1 hai; item bacha ho tabhi ginti ghatao.',
      '<b>Fencing:</b> storage purane token wale writer ko reject kare, taaki stale owner na likhe.',
    ],
    use: 'Ek seat ko do buyers se bachaana ho.',
    avoid: 'Ek app ka mutex kai servers ki writes protect karta hai, aisa mat maano.',
    mistake: 'Lock acquired ka log dekhkar protected write successful maan lena.',
    compare: [
      { choice: 'DB par niyam enforce karo', when: 'Data owner atomic write kar sakta ho', tradeoff: 'Boundary chhoti hai; conflict ka jawab do' },
      { choice: 'Lease ke saath fencing rakho', when: 'External kaam coordinate karna ho', tradeoff: 'Stale writer ruk sakta hai; storage ko token samajhna chahiye' },
    ],
    followup: 'A lambi pause se lauta, par B naya owner hai. Storage A ki write kaise roke?',
    sources: ['tx', 'raft'],
  });
  add('design-review', 'classify antipattern chooser coffeeshop review boss-shapes boss-flow boss-api boss-data boss-resil boss-uber flashcrowd', {
    title: 'Coffee shop ka pehla design sawaal kya hai?',
    misaal: 'Coffee shop ko orders lene, machines baantne aur ready cup bataane hain. Pehle rush hour aur order ka vaada samjho. Boxes banaane se pehle kaam ka aakaar saaf ho.',
    asli: 'Design ka pehla sawaal: kaunsa vaada kabhi nahi tootna chahiye?',
    points: [
      '<b>Requirement:</b> pehle user ka kaam aur scale likho, taaki tool ki wajah saaf ho.',
      '<b>Invariant:</b> zaroori niyam ko har design choice par jaancho.',
      '<b>Failure:</b> ek dependency gayi ho tab bhi user ka nateeja parkho.',
    ],
    use: 'Open-ended architecture review mein design ki wajah samjhaani ho.',
    avoid: 'Technology names ki checklist ko requirement ka saboot mat maano.',
    mistake: 'Ek unsafe critical choice ko kai achhe points se cancel kar dena.',
    compare: [
      { choice: 'Seedha design rakho', when: 'Current scale aur niyam meet ho rahe hon', tradeoff: 'Ops ka kharcha kam hai; limits saaf rakho' },
      { choice: 'Special design banao', when: 'Simple design measured need poori na kare', tradeoff: 'Capacity mil sakti hai; recovery mushkil hogi' },
    ],
    followup: 'Traffic 10 guna hai aur ek dependency bhi gayi. Pehle kaunsa vaada bachaoge?',
    sources: ['overload', 'tx', 'signals'],
  });
  add('search-ranking', 'search crawler st-reddit-facts st-reddit-rank st-jira-index gs-index gs-crawl gs-rank', {
    title: 'Har query par poora corpus kyun padhein?',
    misaal: 'Google Search ki purani kahani mein bhaari kaam query se pehle hota hai. Query par pehle sasti chhaantai hoti hai, phir bache candidates ko dhyaan se rank kiya jaata hai.',
    asli: 'Bade set par sasta kaam karo, phir chhote set par mehenga kaam karo.',
    points: [
      '<b>Index:</b> pehle se bani structure se relevant candidates dhoondho.',
      '<b>Ranking:</b> bache candidates par mehenga kaam karo, taaki jawab ka budget bache.',
      '<b>Permission:</b> result ki rank achhi ho, tab bhi user ki ijazat jaancho.',
    ],
    use: 'Bade corpus par baar-baar low-wait search chahiye ho.',
    avoid: 'Search index ko authoritative transactional truth mat maano.',
    mistake: 'Shortlist tez hui toh relevant results bhi bache honge maan lena.',
    compare: [
      { choice: 'Read par compute karo', when: 'Data chhota ho ya query kam aati ho', tradeoff: 'Updates aasan hain; read ka kaam zyada ho sakta hai' },
      { choice: 'Index aur staged rank rakho', when: 'Broad queries ka kaam baar-baar aata ho', tradeoff: 'Reads tez hain; naya data pahunchne mein der ho sakti hai' },
    ],
    followup: 'Index repair ke dauraan deleted results ko user tak pahunchne se kaise rokoge?',
    sources: ['pg', 'signals'],
  });
  add('media-pipeline', 'media youtube yt-upload yt-transcode yt-deliver', {
    title: 'Upload hua: video dekhne layak bhi hua?',
    misaal: 'YouTube ki kahani mein, jaise shaadi mein khaana pehle banta hai, phir parosa jaata hai. Video bhi pehle taiyaar hota hai, phir bahut logon ko diya jaata hai. Upload aur dekhna ek hi kaam nahi.',
    asli: 'Badi file ki bytes aur app ke business kaam ka raasta alag socho.',
    points: [
      '<b>Upload:</b> app ijazat de, phir badi bytes seedhe object store tak jaa sakein.',
      '<b>Transcode:</b> upload ke baad dekhne layak versions banaane ka kaam baaki ho sakta hai.',
      '<b>Validation:</b> client ke complete bolne par file ko bina jaanche ready mat karo.',
    ],
    use: 'Badi immutable video file bahut users ko deni ho.',
    avoid: 'Signed link ko permanent public permission mat maano.',
    mistake: 'File extension dekhkar content safe aur sahi maan lena.',
    compare: [
      { choice: 'Bytes app se bhejo', when: 'Traffic chhota ho', tradeoff: 'Raasta aasan hai; app ke workers aur network use honge' },
      { choice: 'Direct object path do', when: 'Badi files ka transfer chahiye', tradeoff: 'App bachegi; link ki hadd aur file ki jaanch chahiye' },
    ],
    followup: 'Client complete bolta hai par object verify nahi hua. Public status kya dikhna chahiye?',
    sources: ['blobs', 'http'],
  });
  add('realtime-messaging', 'realtime whatsapp st-slack-boot st-slack-fanout wa-connections wa-store-forward', {
    title: 'Ek tick, do tick, blue tick: same baat hai?',
    misaal: 'WhatsApp ki kahani mein ek tick server tak, do ticks phone tak, blue ticks read tak ki khabar hain. Aman offline ho toh message pending rehta hai, phir phone lautne par milta hai.',
    asli: 'Connection khula hona, message pahunchna aur message padhna alag states hain.',
    points: [
      '<b>Connection:</b> live channel ke liye idle clients ki memory bhi gino.',
      '<b>Delivery:</b> offline recipient ka pending message bachne ka owner ho.',
      '<b>Receipt:</b> transport ka ack padh liya jaane ka proof nahi hai.',
    ],
    use: 'Chat mein offline user ko lautne par message dena ho.',
    avoid: 'WebSocket alive hai toh user ne message padha hoga, aisa mat maano.',
    mistake: 'Process restart hua toh pending messages safe honge maan lena.',
    compare: [
      { choice: 'Polling ya SSE lo', when: 'Periodic ya ek-tarfa updates kaafi hon', tradeoff: 'Raasta aasan hai; polling ka extra kaam ho sakta hai' },
      { choice: 'WebSocket lo', when: 'Dono taraf turant updates chahiye hon', tradeoff: 'Live channel hai; reconnect ka raasta bhi chahiye' },
    ],
    followup: 'Client ka aakhri acknowledgement kho gaya. Reconnect par repeat message ka kya behavior hoga?',
    sources: ['http', 'kafka', 'overload'],
  });
  add('geo-routing', 'geo maps-graph maps-crp maps-traffic maps-tiles-s2', {
    title: 'Paas ka driver sabse jaldi aayega?',
    misaal: 'Maps ki kahani mein ETA ko aage ki sadak ka traffic bhi sochna hai. Abhi ki speed poore safar ka promise nahi. Nearby driver dhoondhna aur jaldi pahunchne ka raasta alag sawaal hain.',
    asli: 'Pehle nearby candidates chhaanto, phir safar ka waqt alag gino.',
    points: [
      '<b>Cells:</b> jagah ke chhote hisse se candidates ghatao.',
      '<b>Distance:</b> cell ke extra candidates par exact doori bhi jaancho.',
      '<b>Route:</b> seedhi doori ko sadak ka travel time mat maano.',
    ],
    use: 'Nearby driver aur badalte traffic ke saath ETA nikaalni ho.',
    avoid: 'Ek lat/lng box ko exact radius mat maano.',
    mistake: 'Cell boundary par sahi driver chhodkar fast search ko correct maan lena.',
    compare: [
      { choice: 'Cells se nearby dhoondo', when: 'Candidates jaldi chhaantne hon', tradeoff: 'Kaam ghatega; exact distance baad mein jaancho' },
      { choice: 'Road graph par route lo', when: 'Safar ka waqt nikaalna ho', tradeoff: 'Sadak ka raasta milega; badalta traffic sambhaalo' },
    ],
    followup: 'Search tez hai par cell boundary ke drivers chhoot rahe hain. Jaanch kaise karoge?',
    sources: ['geo', 'pg'],
  });
  add('ledger', 'ledger', {
    title: 'Balance ka number mila: hisaab bhi samjha sakte ho?',
    misaal: 'Purane balance par naya number likhne se history kho gayi. Entries rakho toh top-up, order aur refund se balance ka hisaab dobara nikal sakta hai.',
    asli: 'Paise ka sach durable entries hon; screen ka total entries se milna chahiye.',
    points: [
      '<b>Journal:</b> har debit aur credit ka record bachao, taaki hisaab jaanch sako.',
      '<b>Atomic:</b> transfer ki dono entries saath likho, taaki paisa adhura na hile.',
      '<b>Units:</b> accounting exact chhoti units mein karo, floating display se nahi.',
    ],
    use: 'Money ka auditable record aur reconciliation chahiye ho.',
    avoid: 'Eventually updated cache ko final balance ki authority mat banao.',
    mistake: 'Success response ko financial effect exactly once hone ka proof maan lena.',
    compare: [
      { choice: 'Balance ki fast view do', when: 'Display jaldi chahiye', tradeoff: 'Read tez hai; entries ke sum se milaate raho' },
      { choice: 'Atomic entries likho', when: 'Paise ka sach record karna ho', tradeoff: 'Audit milta hai; correction bhi entry se karo' },
    ],
    followup: 'Galat transfer delete karoge ya reversing entries likhoge, aur kyun?',
    sources: ['tx', 'idem'],
  });

  add('poison-messages', 'dlq', {
    title: 'Ek kharab message poori line kyun roke?',
    misaal: 'Malformed message consumer ko baar-baar crash karta hai. Har delivery par wahi failure milta hai. Peeche ke sahi messages ki baari aati hi nahi.',
    asli: 'Temporary failure ko retry do; pakka kharab message alag rakhkar baaki line chalao.',
    points: [
      '<b>Retry:</b> temporary network failure ho toh limited attempts se sudhar sakta hai.',
      '<b>DLQ:</b> baar-baar fail message ko alag rakho, taaki sahi kaam aage badhe.',
      '<b>Replay:</b> repair ke baad bhejo toh pehle ho chuke effects dobara mat lagao.',
    ],
    use: 'Ek invalid payload baaki independent notifications rok raha ho.',
    avoid: 'DLQ ko bina alert ka permanent kachra-dabba mat banao.',
    mistake: 'Queue depth zero dekhkar sab jobs successful maan lena.',
    compare: [
      { choice: 'Limited retry do', when: 'Temporary failure ka chance ho', tradeoff: 'Kaam bach sakta hai; attempts ki hadd rakho' },
      { choice: 'Alag rakhkar repair karo', when: 'Same payload har baar fail hota ho', tradeoff: 'Baaki line chalegi; repair ka owner chahiye' },
    ],
    followup: 'DLQ replay par pehle se completed effect dobara kaise rokoge?',
    sources: ['kafka', 'idem'],
  });
  add('degradation', 'degrade', {
    title: 'Recommendations band: product page bhi band karein?',
    misaal: 'Recommendations fail hone se poora product page gir raha tha. Price aur Buy button chal rahe hon toh optional dabbe ke bina bhi grahak khareed sakta hai.',
    asli: 'Kaunsa adhura jawab allowed hai, incident se pehle business ke saath tay karo.',
    points: [
      '<b>Core:</b> zaroori faisla pata na ho toh saaf error do.',
      '<b>Optional:</b> extra section fail ho toh baaki useful page chalao.',
      '<b>Stale:</b> purana data allowed ho toh freshness user ko saaf batao.',
    ],
    use: 'Recommendations fail hon par checkout ka zaroori kaam chal sakta ho.',
    avoid: 'Payment ka jawab nahi pata toh assumed-approved mat bolo.',
    mistake: 'Fallback ka HTTP 200 dekhkar business success count karna.',
    compare: [
      { choice: 'Purana ya partial jawab do', when: 'Business adhura result allow karta ho', tradeoff: 'Useful kaam chalta hai; kami saaf batao' },
      { choice: 'Saaf mana karo', when: 'Galat jawab denial se zyada harmful ho', tradeoff: 'Correctness bachi hai; operation unavailable hoga' },
    ],
    followup: 'Stock pata nahi hai. In stock dikhaoge, purana stock, ya saaf error: kyun?',
    sources: ['http', 'signals'],
  });
  add('product-views', 'bitly leaderboard notion-blocks gmail-state gmail-search-hot', {
    title: 'Ek block kai views mein: sach kahan badlega?',
    misaal: 'Notion ki kahani mein LEGO eent jaise ek block ko kai views mein dikha sakte ho. Har view ko alag editable sach banaoge toh copies ek doosre se alag pad sakti hain.',
    asli: 'Entity ka ek saaf owner rakho; fast views ko source ke data se banaao.',
    points: [
      '<b>Identity:</b> entity ki stable pehchaan rakho, taaki views ek hi cheez ko refer karein.',
      '<b>View:</b> khaas read ko tez karne ke liye extra structure banaao.',
      '<b>Rebuild:</b> view kharab ho toh source of truth se dobara bana sako.',
    ],
    use: 'Wahi entity kai screens par alag order mein dikhani ho.',
    avoid: 'Read model ko bina owner ka independent editable truth mat banao.',
    mistake: 'Fast lookup ko permission check ka badal maan lena.',
    compare: [
      { choice: 'Normalized sach rakho', when: 'Shared update ka ek owner chahiye', tradeoff: 'Ownership saaf hai; reads mein joins lag sakte hain' },
      { choice: 'Derived view banao', when: 'Khaas lookup ya order tez chahiye', tradeoff: 'Reads tez hain; update mein der ho sakti hai' },
    ],
    followup: 'Fast view corrupt hai. Users ko serve karte hue view kaise rebuild karoge?',
    sources: ['pg', 'tx', 'cache'],
  });
  add('blob-storage', 'dropbox dropbox-erasure', {
    title: 'File ke tukde hain: wapas file banegi?',
    misaal: 'Dropbox ki purani kahani mein poori copies ke badle data aur parity ke tukde rakhe jaate hain. Jagah bachti hai, par file wapas banaane aur repair ka kaam badhta hai.',
    asli: 'Bytes bachne ke saath file ka pata aur ownership ka record bhi bachna chahiye.',
    points: [
      '<b>Metadata:</b> versions aur permissions ka record file bytes se alag sambhaalo.',
      '<b>Dedup:</b> same bytes ki pehchaan access ki ijazat nahi deti.',
      '<b>Erasure coding:</b> jagah bachaati hai, par repair mein extra network aur compute lag sakta hai.',
    ],
    use: 'Large immutable files mein storage efficiency chahiye ho.',
    avoid: 'Fragments ka count sahi ho toh bhi complete file recovery prove mat maano.',
    mistake: 'Bytes safe hain toh metadata bhi safe hoga maan lena.',
    compare: [
      { choice: 'Full replicas rakho', when: 'Simple recovery chahiye aur storage budget ho', tradeoff: 'Copies zyada hain; replacement seedha hai' },
      { choice: 'Erasure coding lo', when: 'Bade cold data par jagah bachaani ho', tradeoff: 'Bytes bachti hain; repair ka kaam badhta hai' },
    ],
    followup: 'Kai disks saath gayin. Repair aur serving ka network budget kaise baantoge?',
    sources: ['blobs', 'backup'],
  });
  add('rollout-recovery', 'pm-config pm-regex pm-split pm-thread pm-spiral pm-crowdstrike pm-crowdstrike-lanes pm-crowdstrike-recovery pm-crowdstrike-domain pm-datadog pm-datadog-rules pm-datadog-recovery pm-datadog-fixes rollout boss-feed', {
    title: 'Patch wapas hai: machine fix tak pahunch paayegi?',
    misaal: 'CrowdStrike ki purani kahani mein kharab content boot par phir crash kara raha tha. Fix cloud par tha, par machine network aane se pehle gir rahi thi. Rollback hona aur recovery pahunchna alag baatein thin.',
    asli: 'Change chhote daayre mein bhejo aur wapsi ka aisa raasta rakho jo khud change se na toote.',
    points: [
      '<b>Input:</b> config bhi machine ka behavior badalti hai, isliye contract jaancho.',
      '<b>Canary:</b> representative chhote group par user ka nateeja dekho, phir aage badho.',
      '<b>Recovery:</b> broken serving path ke bina bhi fix pahunchne ka raasta rakho.',
    ],
    use: 'Code ya config ka change poori fleet tak bhejna ho.',
    avoid: 'Chhoti healthy sample ko rare failure na hone ka proof mat maano.',
    mistake: 'Rollback button hai toh boot-loop machine tak fix pahunch jaayega maan lena.',
    compare: [
      { choice: 'Ek saath change bhejo', when: 'Evidence ke saath scoped emergency mein zaroori ho', tradeoff: 'Pahunch tez hai; ek saath nuksaan ka daayra bada hai' },
      { choice: 'Waves mein change bhejo', when: 'Exposure ko dheere badha sakte ho', tradeoff: 'Waqt lagega; nuksaan chhote hisse par pakad sakte ho' },
    ],
    followup: 'Maan lo error 10,000 mein ek request par hai. 100-user canary se kitna bharosa milega?',
    sources: ['launch', 'signals', 'overload'],
  });
  add('ml-retrieval', 'vectors tt-feedback-loop tt-embeddings tt-pipeline tt-ranking', {
    title: 'Taste ab badla: model kal ki pasand kyun de?',
    misaal: 'TikTok ki purani kahani mein cooking videos ke baad cricket pasand aane laga. Sirf raat ka update dekhe toh system session ki nayi pasand miss kar sakta hai.',
    asli: 'Fast model kaafi nahi; sahi waqt ka data aur sahi candidates bhi chahiye.',
    points: [
      '<b>Features:</b> jo data serve karte waqt pata tha, wahi training ke example se milao.',
      '<b>Retrieval:</b> bade set se chhota candidate set nikaalo, phir mehenga kaam karo.',
      '<b>ANN:</b> andaaze ki search tez ho sakti hai, par relevant candidates chhoot sakte hain.',
    ],
    use: 'Bade set mein semantic search ya fresh recommendations chahiye hon.',
    avoid: 'Embedding ki doori ko user ki exact preference mat maano.',
    mistake: 'Sirf latency ghataana aur chhoote relevant results na ginna.',
    compare: [
      { choice: 'Exact search karo', when: 'Set chhota ho', tradeoff: 'Result repeatable hai; bada set mehenga pad sakta hai' },
      { choice: 'Approximate search karo', when: 'Set bada ho aur wait ka budget chhota ho', tradeoff: 'Wait ghat sakta hai; relevant results chhootna naapo' },
    ],
    followup: 'Offline result sudhra par online conversion ghati. Kaunse data aur comparison jaanchoge?',
    sources: ['ann', 'eventtime', 'signals'],
  });
  add('tenant-storage', 'st-jira-tenant', {
    title: 'Har company ka DB: machine bhi alag hai?',
    misaal: 'Jira ki purani kahani mein har tenant ka apna database tha, par kai databases ek host par rehte the. Data ki boundary mili; shared machine ka load phir bhi doosron par pad sakta tha.',
    asli: 'Tenant ki data boundary aur physical resource boundary alag faisle hain.',
    points: [
      '<b>Shared table:</b> har query mein sahi tenant ka scope enforce karo.',
      '<b>Separate DB:</b> tenant ka restore aur lifecycle alag ho sakta hai.',
      '<b>Routing:</b> customer ko sahi DB tak bhejo, par route ko permission ka proof mat maano.',
    ],
    use: 'Tenant ka alag restore ya data residency sambhaalni ho.',
    avoid: 'Database-per-tenant ko dedicated physical machine mat maano.',
    mistake: 'Client ke tenant route par bina authorization ke bharosa karna.',
    compare: [
      { choice: 'Shared table rakho', when: 'Bahut chhote tenants ko efficiently chalana ho', tradeoff: 'Pool share hota hai; har query ka scope enforce karo' },
      { choice: 'Alag DB rakho', when: 'Tenant ka lifecycle alag chahiye', tradeoff: 'Boundary saaf hai; bahut DBs ka ops kharcha badhega' },
    ],
    followup: 'Tenant ko naya region diya, par router purana hai. Nayi write ko kaise bachaoge?',
    sources: ['part', 'tx', 'overload'],
  });
  add('compute-storage', 'st-snow-split st-snow-warehouse', {
    title: 'Wahi data, alag teams: CPU kyun share karein?',
    misaal: 'Snowflake ki purani kahani mein loading, dashboards aur data science ek hi stored data padhte hain. Alag compute groups hon toh ek team ki bhaari query doosri team ki CPU line nahi bharti.',
    asli: 'Data ki durable copy aur query chalaane ki capacity ko alag badha sakte ho.',
    points: [
      '<b>Storage:</b> durable data compute band hone par bhi bacha rahe.',
      '<b>Warehouse:</b> independent workload ko apna compute do, taaki doosri query se wait na jude.',
      '<b>Cache:</b> warm run ka waqt cold run se alag ho sakta hai.',
    ],
    use: 'Do analytical teams ko alag capacity aur query isolation chahiye ho.',
    avoid: 'Bada warehouse har query ko utne hi ratio se tez karega, aisa mat maano.',
    mistake: 'Warm run ko bina context storage benchmark bol dena.',
    compare: [
      { choice: 'Compute share karo', when: 'Load chhota aur predictable ho', tradeoff: 'Khaali CPU use hoti hai; bhaari query doosron ko rok sakti hai' },
      { choice: 'Compute alag karo', when: 'Teams ko independent capacity chahiye', tradeoff: 'Isolation milegi; cold start aur alag bill ka kharcha hai' },
    ],
    followup: 'Compute dugna kiya par query ka waqt nahi ghata. Agli boundary kya naapoge?',
    sources: ['warehouse', 'pg'],
  });
  add('runtime-efficiency', 'st-air-memory st-air-live st-air-rust stripe-no-rewrite stripe-tooling stripe-gil wa-contention', {
    title: 'Mic ek hai: singers badhaane se gaana tez hoga?',
    misaal: 'Stripe ki purani kahani mein ek Ruby process ka ek mic hai. Singers baari-baari bolte hain. Zyada threads banaana akela CPU kaam ko sab cores par nahi baant deta.',
    asli: 'Rewrite se pehle naapo ki kaam, wait ya sharing mein asli atkan kahan hai.',
    points: [
      '<b>Profile:</b> hot work naapo, taaki fix guess par na ho.',
      '<b>Contention:</b> shared resource par wait ho toh sirf workers mat badhao.',
      '<b>Correctness:</b> tez version ko wahi kaam sahi karna chahiye.',
    ],
    use: 'Measured hot path ya shared lock app ko rok raha ho.',
    avoid: 'Ek runtime version ki kahani ko har language ka universal verdict mat banao.',
    mistake: 'Same response count ko same kaam aur same test coverage maan lena.',
    compare: [
      { choice: 'Targeted fix karo', when: 'Measured atkan local change se hat sakti ho', tradeoff: 'Scope chhota hai; wahi workload se jaancho' },
      { choice: 'Rewrite karo', when: 'Purani boundary rok rahi ho aur fayda prove ho', tradeoff: 'Naya raasta milega; compatibility aur migration ka bada kharcha hai' },
    ],
    followup: 'Selected tests mein ek transitive dependency chhoot gayi. Verification ka fallback kya hoga?',
    sources: ['runtime', 'signals', 'tx'],
  });
  add('untrusted-code', 'st-cf-edge rbx-luau ai-safety-filter ai-containment ai-incident-model colab-isolation colab-disposable replit-full-env replit-isolation replit-undo', {
    title: 'Recipe likhna alag, rasoi ki chaabi dena alag',
    misaal: 'Replit ki kahani mein coding tool sirf recipe nahi likhta, khaana bhi banaata hai. Agent command chala sakta hai toh galat instruction ka asar real files aur bahar ke systems tak jaa sakta hai.',
    asli: 'Model ka achha jawab aur model ke haathon ki allowed pahunch alag control karo.',
    points: [
      '<b>Filter:</b> request par guidance deta hai, par real access ki deewar nahi hai.',
      '<b>Sandbox:</b> files aur network ki pahunch enforce karo, taaki galat command ka daayra chhota ho.',
      '<b>Undo:</b> local snapshot lautana pehle bheja email ya payment wapas nahi karta.',
    ],
    use: 'Unknown user ya agent ka code limited authority ke saath chalaana ho.',
    avoid: 'Chhote demo ka pass hona asli machine ki poori security ka proof nahi hai.',
    mistake: 'Model ne test mein refuse kiya toh containment bhi prove hui maan lena.',
    compare: [
      { choice: 'Policy se guide karo', when: 'Requested behavior samajhna ho', tradeoff: 'Useful signal hai; real access enforce nahi hota' },
      { choice: 'Execution ki hadd lagao', when: 'Real files ya network tak haath pahunchte hon', tradeoff: 'Asar bound hoga; runtime ki compatibility sambhaalni padegi' },
    ],
    followup: 'Files rollback hui, par external DB write ho chuki. Product ka undo vaada kya hoga?',
    sources: ['sandbox', 'cpu', 'signals'],
  });
  add('end-to-end', 'wa-e2e', {
    title: 'Band lifafa: chaabi kiske paas hai?',
    misaal: 'WhatsApp ki purani kahani mein server band lifafe aage bhejta hai. Server ko message padhne ki chaabi nahi milni chahiye. Naya phone jodne par chaabi kisko mile, alag sawaal hai.',
    asli: 'Sirf allowed devices content padhein, isliye chaabiyon ka poora safar sambhaalo.',
    points: [
      '<b>E2E:</b> message padhne ki chaabi sirf allowed devices ke paas ho.',
      '<b>Identity:</b> saamne wala endpoint sahi hai ya nahi, verify karne ka raasta do.',
      '<b>Keys:</b> device aur group membership badle toh access ka niyam badlo.',
    ],
    use: 'Threat model mein server operator se message content chhupaana ho.',
    avoid: 'Encryption ko compromised phone ke khilaaf automatic bachav mat maano.',
    mistake: 'Ek encryption algorithm use hua toh poora protocol safe hoga maan lena.',
    compare: [
      { choice: 'Link aur storage encrypt karo', when: 'Raaste ya disk ki exposure se bachna ho', tradeoff: 'Data protected hai; server ke paas plaintext ho sakta hai' },
      { choice: 'End-to-end protocol lo', when: 'Sirf endpoints ko content padhna ho', tradeoff: 'Server se content chhupega; device recovery mushkil hogi' },
    ],
    followup: 'Naya device joda. Purani history deni hai aur identity trust kaise karna hai: faisla kaun lega?',
    sources: ['e2e'],
  });
  add('matchmaking', 'rbx-matchmaker', {
    title: 'Play dabaya: paas ka server hi sahi match hai?',
    misaal: 'Roblox ki purani kahani mein nearest server se ping kam hua, par doston ke liye seats bhi chahiye thin. Achha match sirf paas nahi; poore group ko jagah bhi de.',
    asli: 'Pehle allowed matches chuno, phir pasand ka score lagao.',
    points: [
      '<b>Capacity:</b> server full ho toh achha score bhi jagah nahi banaata.',
      '<b>Preference:</b> dost aur kam wait ko allowed candidates ke beech tolo.',
      '<b>Reservation:</b> last slot par concurrent claims ko atomic owner sambhaale.',
    ],
    use: 'Limited seats mein players ya dispatch jobs assign karne hon.',
    avoid: 'Security ya capacity ki manaahi ko weighted score se cancel mat karo.',
    mistake: 'Highest score ko feasible assignment ka proof maan lena.',
    compare: [
      { choice: 'Jaldi bounded choice karo', when: 'Response budget chhota ho', tradeoff: 'Match tez hai; best joint choice chhoot sakti hai' },
      { choice: 'Thoda wait karke search ko badhao', when: 'Quality ke liye wait allowed ho', tradeoff: 'Behtar group mil sakta hai; compute aur wait badhenge' },
    ],
    followup: 'Do matchmakers ne wahi last slot chuni. Capacity ka atomic owner kaun hoga?',
    sources: ['tx', 'overload'],
  });
  add('accelerator-network', 'ds-constraint ds-moe ds-mla-fp8 aws-srd', {
    title: 'Truck tez hai: sadak bhi utna maal le sakti hai?',
    misaal: 'DeepSeek ki kahani mein trucks tez hain, par sadak patli hai. GPU ka hisaab tez chale toh bhi devices ke beech data ka safar poori training ko rok sakta hai.',
    asli: 'Compute badhaane se pehle dekho ki atkan hisaab, memory ya data ke safar mein hai.',
    points: [
      '<b>MoE:</b> har token par chune experts ka kaam hota hai, poore parameters ka nahi.',
      '<b>Memory:</b> representation chhoti ho toh bhi wahi quality milti hai ya nahi, jaancho.',
      '<b>Network:</b> toy path demo ko real hardware ki speed ka proof mat bolo.',
    ],
    use: 'Measured training ya serving mein communication ya memory limit ho.',
    avoid: 'Lower precision ko free accuracy ka vaada mat maano.',
    mistake: 'Toy arithmetic saving ko actual model training cost bol dena.',
    compare: [
      { choice: 'Measured resource badhao', when: 'Wahi resource asli atkan ho', tradeoff: 'Capacity mil sakti hai; doosri boundary phir bhi rok sakti hai' },
      { choice: 'Work ya bytes ghatao', when: 'Representation ya locality sudhar sakti ho', tradeoff: 'Kharcha ghat sakta hai; quality dobara jaancho' },
    ],
    followup: 'Memory aadhi hui par p99 badhi. Agla measurement kis kaam aur kis raaste par loge?',
    sources: ['ml', 'efa', 'signals'],
  });
  add('bounded-work', 'aws-constant-work aws-proofs', {
    title: 'Rush hour par bhi machine wahi kaam kare?',
    misaal: 'Amazon ki kahani mein coffee machine har minute cup banaati hai. Barista sirf order par kaam karta hai. Machine ka kuch kaam waste ho sakta hai, par rush hour mein naya kaam ka dher nahi banta.',
    asli: 'Kabhi extra regular kaam karna mushkil waqt ka achanak kaam ghata sakta hai.',
    points: [
      '<b>Delta:</b> sirf badlaav par kaam karo toh aam din ka kharcha kam ho sakta hai.',
      '<b>Constant work:</b> recurring bounded kaam se capacity ka andaaza aasan ho sakta hai.',
      '<b>Proof:</b> model ke andar niyam sahi ho, tab bhi asli code alag jaancho.',
    ],
    use: 'Rare state change critical system mein bahut bhaari kaam laata ho.',
    avoid: 'Chhote model ki exhaustive jaanch ko poori production state ki jaanch mat bolo.',
    mistake: 'Formal proof pass hua toh code bhi har jagah sahi hai maan lena.',
    compare: [
      { choice: 'Badlaav par kaam karo', when: 'Transitions ka load sambhaal sakte ho', tradeoff: 'Baseline kharcha kam hai; rare burst sambhaalna padega' },
      { choice: 'Regular bounded kaam karo', when: 'Predictable capacity ka fayda extra kharcha justify kare', tradeoff: 'Shape saaf hai; shaant waqt bhi kaam hoga' },
    ],
    followup: 'Model sahi hai par code purana epoch accept karta hai. Verification ki kaunsi boundary chhooti?',
    sources: ['raft', 'launch'],
  });
  add('peer-distribution', 'bt-swarm bt-rarest bt-titfortat bt-dht', {
    title: 'Mela bada hai: aakhri tukda kiske paas hai?',
    misaal: 'BitTorrent ki kahani mein library ki series ke aakhri volumes kam logon ke paas hain. Sab pehle volumes maangte rahein toh common parts badhenge, par rare volume gaya toh series adhuri rahegi.',
    asli: 'Peers se bhaar baant sakte ho; har zaroori piece ki availability alag dekho.',
    points: [
      '<b>Pieces:</b> rare tukde bachao, taaki poori file banne ka raasta bacha rahe.',
      '<b>Hash:</b> piece ki integrity jaancho; publisher ki identity alag verify karo.',
      '<b>DHT:</b> peers dhoondhti hai, poori file store karne ka vaada nahi deti.',
    ],
    use: 'Wahi badi file bahut cooperative recipients ko deni ho.',
    avoid: 'Peers badhe hain toh speed zaroor badhegi, aisa mat maano.',
    mistake: 'Transferred bytes badhi toh har peer ki complete file bhi ban gayi maan lena.',
    compare: [
      { choice: 'Origin ya CDN use karo', when: 'Publisher control aur predictable availability chahiye', tradeoff: 'Managed delivery hai; central capacity ka kharcha hai' },
      { choice: 'Peers se pieces baanto', when: 'Recipients verified pieces share kar sakte hon', tradeoff: 'Origin ka load batega; missing pieces aur churn sambhaalo' },
    ],
    followup: 'Common pieces sabke paas hain, par aakhri rare piece gayi. Useful progress ka metric kya hoga?',
    sources: ['peer', 'dht'],
  });
  add('moving-network', 'starlink-leo starlink-schedule starlink-lasers starlink-anchor', {
    title: 'Satellite badla: session ki pehchaan bhi badle?',
    misaal: 'Starlink ki purani kahani mein satellite badalte hain, par IP zameen ke point se judi rehti hai. Raasta hilta hai; stable siron se session ki pehchaan bach sakti hai.',
    asli: 'Badalte physical raaste ke upar stable logical pehchaan rakh sakte ho.',
    points: [
      '<b>Handover:</b> agle link par jaane ka waqt session ke wait mein gino.',
      '<b>Anchor:</b> stable point pehchaan bachaata hai, par raasta lamba kar sakta hai.',
      '<b>Latency:</b> light ki minimum travel limit achieved network timing nahi hai.',
    ],
    use: 'Moving topology mein session ko baar-baar login se bachaana ho.',
    avoid: 'First hop chhota hai toh poora internet path bhi shortest hoga mat maano.',
    mistake: 'Toy orbital timing ko live service ka vaada maan lena.',
    compare: [
      { choice: 'Raasta seedha badlo', when: 'Session rapid route change sambhaal sakta ho', tradeoff: 'Extra detour kam hai; topology ka badlaav dikh sakta hai' },
      { choice: 'Stable anchor rakho', when: 'Session ki pehchaan bachaana zaroori ho', tradeoff: 'Continuity milegi; anchor ki availability bhi chahiye' },
    ],
    followup: 'Anchor hi kho gaya. Naye raaste par session state ka owner kaun hoga?',
    sources: ['http', 'nginx', 'signals'],
  });
  add('randomized-coordination', 'rn-kyun rn-kaise rn-code rn-kab', {
    title: 'Sabko S2 khaali dikha: ab bheed ka raasta kya hai?',
    misaal: 'KhanaKart ki menu-service ke teen servers hain. Purani report mein S2 khaali dikhta hai. Har request wahi smart choice kare toh nayi bheed S2 par hi jama hoti hai.',
    asli: 'Bahut log ek hi purani jaankari se ek saath faisla karein toh choices ko thoda alag karo.',
    points: [
      '<b>Sampling:</b> har request do alag random servers chune, phir kam load wala le.',
      '<b>Signal:</b> har proxy ko apna load dikhta hai, poore system ka load zaroori nahi.',
      '<b>Random:</b> jhund ka chance ghataata hai, best choice ki guarantee nahi deta.',
    ],
    use: 'Kai proxies purani report dekhkar ek hi server ko bhar rahe hon.',
    avoid: 'User ki key ko same server chahiye ho toh blind random routing mat lagao.',
    mistake: 'Ek random collision dekhkar algorithm toot gaya maan lena.',
    compare: [
      { choice: 'Global minimum lo', when: 'Accurate current state coordinate kar sakte ho', tradeoff: 'Achha choice mil sakta hai; stale report se jhund banega' },
      { choice: 'Do random mein behtar lo', when: 'Saste samples se choices baantni hon', tradeoff: 'Choices bikhrengi; exact best ka vaada nahi hai' },
    ],
    followup: 'Sab proxies ko ek node khaali dikhta hai. Coordination ke bina choices kaise baantoge?',
    sources: ['nginx', 'raft', 'retry'],
  });
  add('health-checks', 'hc-kyun hc-kaise hc-code hc-lib hc-kab', {
    title: 'Restart karein, traffic rokein, ya ruk jaayein?',
    misaal: 'Dhaba ki gas line gayi toh rasoiye badalne se khana nahi banega. Rasoiya tabhi badlo jab dikkat rasoiye mein ho. Aur lassi ka counter gas ke bina bhi chal sakta hai.',
    asli: 'Health check ek nahi, teen alag sawaal poochhta hai:',
    points: [
      '<b>Startup:</b> naya pod ab tak taiyaar hua? Nahi hua toh thoda waqt do, restart mat karo.',
      '<b>Readiness:</b> is pod ko abhi grahak bhejein? Nahi toh sirf traffic roko; pod chalta rehta hai.',
      '<b>Liveness:</b> kya restart se theek hoga? Sirf pod ki apni atki haalat ke liye, jaise atka hua event loop.',
    ],
    use: 'Pod khud atka ho aur restart se wapas aa sake → liveness. Pod abhi kaam nahi le sakta → readiness.',
    avoid: 'Shared DB ka check liveness mein mat daalo. DB gira toh saare pods restart honge, aur DB phir bhi theek nahi hoga.',
    mistake: 'Probe ka 200 dekh ke "sab theek" maan lena. 200 sirf itna kehta hai ki probe ka chhota sawaal paas hua.',
    compare: [
      { choice: 'Liveness: sirf pod ki apni haalat', when: 'Restart se pod sach mein theek ho sakta ho', tradeoff: 'DB girne par restart ki lehar nahi aati; atki haalat pakadne ki hadd soch ke rakho' },
      { choice: 'Readiness: DB se bhi poochho', when: 'DB ke bina pod koi kaam ka jawab de hi nahi sakta', tradeoff: 'DB girte hi saare pods ek saath traffic se bahar ho sakte hain; fail open ka niyam socho' },
    ],
    followup: 'DB band hai, par pod purana cache wala jawab de sakta hai. Readiness kya kahe, aur kyun?',
    sources: ['probes', 'signals'],
  });
  add('cost-model', 'unitcost dropbox-rent-own', {
    title: 'Kiraya ya apna ghar: poora bill gina?',
    misaal: 'Dropbox ki purani kahani mein kiraye aur apne ghar ka sauda hai. Chhote uncertain stay ke liye kiraya useful hai. Stable zaroorat mein apna ghar socho, par repair aur dekhbhaal ka bill bhi hai.',
    asli: 'Ek resource ki rate se faisla mat karo; wahi scope aur duration ka poora kharcha gino.',
    points: [
      '<b>Fixed:</b> owned capacity ka kharcha kam traffic par bhi rehta hai.',
      '<b>Variable:</b> requests aur transfer badhein toh bill badal sakta hai.',
      '<b>Utilization:</b> khaali headroom ka kharcha bhi per-request hisaab mein rakho.',
    ],
    use: 'Architecture ke buy-versus-build options compare karne hon.',
    avoid: 'Purane public bill ko aaj ka cloud quote mat maano.',
    mistake: 'Cache jodkar asli data ki origin copy ka kharcha hata dena.',
    compare: [
      { choice: 'Managed capacity lo', when: 'Elasticity aur kam ops ka fayda ho', tradeoff: 'Bill badal sakta hai; transfer ka charge bhi gino' },
      { choice: 'Apna stack chalao', when: 'Stable volume aur operations ka hunar ho', tradeoff: 'Control milega; staffing aur repair ka fixed kharcha hai' },
    ],
    followup: 'Traffic aadha hua, par availability target wahi hai. Kaunsa design ab sasta padega?',
    sources: ['blobs', 'signals'],
  });

  const allLevels = Object.values(SD.levelSets).flat();
  const known = new Set(allLevels.map(level => level.id));
  Object.keys(byLevel).forEach(id => { if (!known.has(id)) throw new Error('Guidance references missing level: ' + id); });
  allLevels.forEach(level => { if (!byLevel[level.id]) throw new Error('Level needs a major-topic decision guide: ' + level.id); });
  SD.guidance = { topics, byLevel };
})();
