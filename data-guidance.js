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
  };
  const topics = {}, byLevel = {};
  function add(id, levels, guide) {
    const ids = levels.split(/\s+/).filter(Boolean);
    if (topics[id]) throw new Error('Duplicate guidance topic: ' + id);
    topics[id] = { ...guide, levels: ids, sources: guide.sources.map(key => sources[key]) };
    ids.forEach(level => { if (byLevel[level]) throw new Error('Duplicate guidance assignment: ' + level); byLevel[level] = id; });
  }

  add('physics', 'fp-physics-kyun fp-physics-kaise fp-physics-code fp-physics-kab', {
    title: 'Pehle wait aur work ko alag gino',
    why: 'Menu RAM mein hai, phir bhi har remote reply ka intezaar checkout ko dheema kar sakta hai.',
    concept: 'Latency ek kaam ka elapsed wait hai; throughput har second poora kaam. Batching calls ghataati hai; bounded parallelism kuch wait overlap karti hai.',
    example: 'Kalpanik four independent calls, har call ka fixed wait 40 ms: serial wait 160 ms. Same result aur error behavior ke bina speed comparison adhura hai.',
    handsOn: 'Slow motion mein pehle serial timeline padho, phir bounded batch dekho. Calls ki count aur elapsed wait compare karo; physics-model number ko hardware measurement mat bolo.',
    use: 'Jab measured latency ka bada hissa remote round trips, bytes ya repeated work mein ho.',
    avoid: 'Unknown keys ki dependency ho toh sab calls ek batch mein bhejne ka assumption mat banao.',
    compare: [{ choice: 'Batch', when: 'Keys independent aur pehle pata hon', tradeoff: 'Fewer calls; batch size, partial errors aur payload bound chahiye' }, { choice: 'Parallel', when: 'Independent calls aur spare downstream budget ho', tradeoff: 'Wait overlap; total concurrency aur memory badh sakti hai' }],
    tree: ['Keys ek doosre ke result par depend? Haan → dependency path pehle samjho.', 'Independent keys aur batch API? Haan → bounded batch compare karo.', 'Batch API nahi? Concurrency cap ke saath same-work experiment karo.'],
    mistake: 'Warm page-cache file timing ko raw SSD latency ya invented cost units ko cloud bill bol dena.',
    production: 'Per-request cap fleet-wide cap nahi. Hazaar concurrent users ek chhota parallel loop bhi huge fan-out bana sakte hain.',
    followup: 'Faster variant mein same values, errors aur total work kaise prove karoge?', sources: ['stream', 'overload'],
  });
  add('request-path', 'lifecycle networking boundaries st-cf-anycast st-cf-defense', {
    title: 'Request kahan rukti hai?', why: 'App ka CPU khaali ho sakta hai, jabki DNS, connection setup ya edge admission par user wait kar raha ho.',
    concept: 'Request path = naam resolve → connection/security handshake → proxy → app → data/dependency → response. Warm connection aur cold setup ka cost alag hai.',
    example: 'Cloudflare wale public case ko historical architecture ki misaal samjho. Kalpanik checkout mein 80 ms setup aur 20 ms app ho toh app ko half karne se total 90 ms hota hai.',
    handsOn: 'Diagram ya trace mein har hop ka naam padho. First failing/slow boundary identify karo; healthy downstream box ko badalne se pehle us boundary ka evidence dekho.',
    use: 'Jab browser slow ho par app execution timing healthy dikhe, ya failures region/network ke hisaab se badlein.', avoid: 'Sirf end-to-end average dekhkar ek service ko culprit mat maano.',
    compare: [{ choice: 'Edge/proxy', when: 'Connection, routing, coarse admission', tradeoff: 'Central policy useful; business authorization phir bhi app contract hai' }, { choice: 'Application', when: 'Resource ownership aur business invariants', tradeoff: 'Business context milta hai; edge ka network timing control nahi' }],
    tree: ['Request app tak aayi? Nahi → DNS/TLS/proxy route dekho.', 'App tak aayi, dependency span slow? Haan → us boundary ko isolate karo.', 'Har hop normal? Client queue, connection reuse aur measurement units dekho.'],
    mistake: 'HTTP success ko poore business workflow ka completion samajhna.', production: 'Cached DNS, persistent connections, routing changes aur regional paths alag users ko alag latency dete hain.',
    followup: 'Same endpoint ek city mein slow aur doosri mein normal ho toh pehla comparison kya loge?', sources: ['http', 'traces'],
  });
  add('capacity-math', 'numbers estimation napkin', {
    title: 'Units se capacity ka pehla estimate', why: 'Daily users ko requests per second samajhkar machine count nikaaloge toh peak capacity miss ho sakti hai.',
    concept: 'Rate, service time, payload size aur concurrent work ko units ke saath gino. Approximation ka goal order of magnitude aur sensitivity samajhna hai.',
    example: 'Kalpanik 10,000 requests/s × 0.1 s average in-flight time = stable conditions mein lagbhag 1,000 active requests. Peak, retries aur burst alag inputs hain.',
    handsOn: 'Given inputs likho, seconds/bytes ki units normalize karo, multiplication type karo. Wrong magnitude par calculation padho aur corrected estimate submit karo.',
    use: 'Design sizing, experiment budget aur interview sanity check ke liye.', avoid: 'One precise decimal ko unknown arrival pattern ya production benchmark ka proof mat banao.',
    compare: [{ choice: 'Analytical estimate', when: 'Early design aur unknown-scale sensitivity', tradeoff: 'Fast; assumptions explicitly label karni padengi' }, { choice: 'Representative load run', when: 'Candidate implementation ki real bottleneck jaanani ho', tradeoff: 'Measured evidence; workload/cache boundaries match chahiye' }],
    tree: ['Inputs same time unit mein? Nahi → pehle normalize karo.', 'Peak aur sustained load alag? Haan → dono budgets nikalo.', 'Estimate target se door? Dominant parameter ka experiment chuno.'],
    mistake: 'Bits/bytes, decimal/binary units aur average/peak ko mix kar dena.', production: 'Retries, skewed hot keys aur dependency pools capacity ko aggregate user count se pehle limit kar sakte hain.',
    followup: 'Ek input 10x galat nikla toh kaunsa design decision sabse pehle badlega?', sources: ['overload', 'signals'],
  });
  add('tail-latency', 'latency fanout gs-fanout', {
    title: 'Average ke peeche chhupa slow user', why: '1,000 shards mein har shard ka chhota slow-tail chance bhi full request ko frequently delay kar sakta hai.',
    concept: 'p99: measured population ka lagbhag 99% latency is boundary tak hai. Fan-out completion often required branches ke maximum ya quorum rule par depend karti hai.',
    example: 'Google Search ka fan-out public case course mein hai. Kalpanik independent branches mein all-fast chance product hota hai; correlated failures ko independent mat maano.',
    handsOn: 'Percentile chart mein p50 aur p99 compare karo. Fan-out badalne par required-results rule aur slowest span dekho; sirf average throughput se win declare mat karo.',
    use: 'Interactive deadlines, large fan-out, uneven request costs aur tail SLO ke liye.', avoid: 'Different request populations ke percentiles ko average karke global p99 mat nikalo.',
    compare: [{ choice: 'Wait all', when: 'Every branch result required ho', tradeoff: 'Complete response; slowest dependency tail dominate kar sakti hai' }, { choice: 'Bounded partial/quorum', when: 'Business contract incomplete result allow kare', tradeoff: 'Lower wait; correctness/freshness boundary explicit chahiye' }],
    tree: ['All results necessary? Haan → deadline, redundancy aur slow branches bound karo.', 'Partial result allowed? Haan → missing sections clearly label karo.', 'Hedging soch rahe? Duplicate work aur cancellation budget pehle gino.'],
    mistake: 'p99 ko ek user ki maximum latency ya global hard guarantee bol dena.', production: 'GC, cache misses, noisy neighbors aur correlated network congestion tail ko inflate karte hain.',
    followup: 'Hedged request latency ghataaye par backend load badhaaye toh admission kaise bound karoge?', sources: ['signals', 'overload'],
  });
  add('async-events', 'syncasync scheduling ed-kyun ed-kaise ed-code ed-kab', {
    title: 'Accepted aur completed ka farak', why: 'Notification service band ho toh order save ko unnecessarily rokna business ko dependency outage se jod deta hai.',
    concept: 'Synchronous call result ka wait karti hai. Async acceptance future work ka promise hai; durable ownership, retry aur completion status alag design karne hote hain.',
    example: 'Kalpanik order save ke baad kitchen, notification aur analytics teen consumers ko apni copy/progress chahiye. Ek competing queue sabko event broadcast nahi karti.',
    handsOn: 'Event timeline mein save, publish aur ack alag dekho. Consumer fail hone par producer ka response aur pending work check karo; accepted ko delivered mat mark karo.',
    use: 'Independent work, bursts aur delayed completion jahan product allow kare.', avoid: 'Payment authorization jaisa immediate business decision bina explicit pending-state contract async mat banaao.',
    compare: [{ choice: 'Direct call', when: 'Current response ke liye result abhi chahiye', tradeoff: 'Simple result flow; latency/failure coupling' }, { choice: 'Event + consumers', when: 'Independent reactions aur eventual completion allowed', tradeoff: 'Loose timing coupling; duplicate, ordering aur lag handle karo' }],
    tree: ['Result abhi response ke liye required? Haan → bounded sync call.', 'Baad mein complete ho sakta? Haan → durable acceptance/status design.', 'Multiple independent recipients? Har recipient ka subscription/progress define karo.'],
    mistake: 'Publish log dikhte hi consumer work complete samajhna.', production: 'Broker outage, unacknowledged deliveries, poison messages aur schema changes consumers ko alag speed par chalaate hain.',
    followup: 'DB commit successful par event publish fail ho toh recovery owner kaun hai?', sources: ['kafka', 'http'],
  });
  add('service-boundaries', 'decompose st-reddit-strangle prime-boundary-tax prime-replicate prime-when-split', {
    title: 'Boundary kya khareedti hai?', why: 'Har local call ko network hop banaane se deployment freedom mile bina latency, serialization aur operational bill badh sakta hai.',
    concept: 'Service boundary independent ownership, scaling ya failure isolation ke liye choose karo. Monolith bhi multiple copies se scale ho sakta hai.',
    example: 'Reddit migration aur Prime Video ke course cases historical examples hain; unke workload-specific results ko har company ke liye monolith verdict mat banao.',
    handsOn: 'Canvas mein boundary ka specific benefit chuno. Har new hop ke latency, data owner aur rollback consequence review karo; failed design ko revise karke hi aage badho.',
    use: 'Jab independently changing teams, security domains ya materially different scaling/failure needs hon.', avoid: 'Sirf code lines ya fashionable service count ke liye split mat karo.',
    compare: [{ choice: 'Module in one deployment', when: 'Shared transactions/team aur cheap calls valuable hon', tradeoff: 'Lower boundary tax; deployment/failure coupling rahega' }, { choice: 'Separate service', when: 'Independent ownership/isolation ka measured benefit ho', tradeoff: 'Network contract, discovery, consistency aur ops cost' }],
    tree: ['Independent reason likh sakte ho? Nahi → module pehle.', 'Reason hai, data owner clear? Nahi → ownership resolve karo.', 'Boundary justified? Strangler/canary aur rollback path ke saath migrate karo.'],
    mistake: 'Microservices ko request throughput badhne ka automatic mechanism samajhna.', production: 'Shared DB, distributed transactions aur synchronized deploys nominal services ko phir tightly couple kar dete hain.',
    followup: 'Service split ke baad cross-service JOIN aur schema ownership kaise badlenge?', sources: ['http', 'traces'],
  });
  add('http-contract', 'naming verbs versioning errors', {
    title: 'API ek client contract hai', why: 'Server deploy successful ho sakta hai jabki purana mobile app response shape ya status semantics se toot jaaye.',
    concept: 'Resource identity, method semantics, status code aur structured error stable contract banate hain. Safe aur idempotent HTTP terms business outcome ke exact synonyms nahi.',
    example: 'Kalpanik async report creation 202 plus status URL de sakti hai; 202 report file ready hone ka proof nahi.',
    handsOn: 'Scenario ke method/status ko match karo. Error mein machine code, useful message aur retryability reason padho; breaking change ko old client ki nazar se classify karo.',
    use: 'Multiple independently deployed clients aur long-lived integrations mein.', avoid: 'HTTP 200 ke andar hidden failure ya ambiguous optional field se client ko guess karne par majboor mat karo.',
    compare: [{ choice: 'Additive compatible change', when: 'Old client unknown field safely ignore kare', tradeoff: 'Gradual rollout possible; validation/enum assumptions still verify karo' }, { choice: 'Versioned breaking change', when: 'Existing semantics incompatible hon', tradeoff: 'Clear migration; versions/support window ka cost' }],
    tree: ['Old valid client same result samajhega? Haan → compatibility test.', 'Meaning/type/required field badla? Haan → migration/version plan.', 'Error retryable? Status plus documented machine reason consistent rakho.'],
    mistake: 'PUT idempotent hai isliye every response identical hoga sochna.', production: 'Proxy retries, stale clients aur mixed-version fleets implicit assumptions ko expose karte hain.',
    followup: 'Delete dobara karne par status alag ho sakta hai phir bhi method idempotent kaise?', sources: ['http'],
  });
  add('pagination', 'offset-pain cursor filtering', {
    title: 'Client param bhi query-cost promise hai', why: 'Deep page ya arbitrary sort ek small response ke liye millions of rows examine kara sakta hai.',
    concept: 'Offset preceding results skip karta hai; keyset stable ordered boundary se seek karta hai. Index order, tie-breaker aur filter semantics design ka hissa hain.',
    example: 'Kalpanik last boundary (created_at,id) hai. Same timestamp ke multiple rows ko id tie-breaker distinguish karta hai.',
    handsOn: 'Mission mein baseline request/plan dekho, fix lagao, phir fresh response aur rows-examined compare karo. Cursor opaque hone se authorization replace nahi hoti.',
    use: 'Large ordered feeds aur sequential navigation mein keyset compare karo.', avoid: 'Arbitrary page-number jumps ya changing sort/filter ko old cursor ke saath silently reuse mat karo.',
    compare: [{ choice: 'Offset', when: 'Small sets ya random page access important ho', tradeoff: 'Simple page number; deep scans/changes ke effects' }, { choice: 'Keyset cursor', when: 'Stable ordered sequential traversal ho', tradeoff: 'Bounded seek possible; unique order/cursor contract chahiye' }],
    tree: ['Deep sequential scan? Haan → indexed keyset evaluate.', 'Stable unique order? Nahi → tie-breaker add karo.', 'Sort/filter change hua? Haan → cursor reject/reset contract follow karo.'],
    mistake: 'Base64 cursor ko encryption ya safe authorization boundary samajhna.', production: 'Concurrent inserts/deletes, nullable sort keys aur unbounded fields/expand queries correctness aur cost dono badalte hain.',
    followup: 'Cursor se deleted boundary row ya changed sort order kaise handle karoge?', sources: ['pg', 'http'],
  });
  add('authorization', 'auth notion-permissions st-jira-query', {
    title: 'Identity se resource permission tak', why: 'Search fast ho par private document leak kare toh system ka main contract toot gaya.',
    concept: 'Authentication identity establish karti hai; authorization har resource/action par allowed scope check karti hai. Tenant ID from client trusted fact nahi.',
    example: 'Notion permission ancestry aur Jira query authorization ke public case paths course mein hain. Kalpanik document move se cached inherited permission stale ho sakti hai.',
    handsOn: 'Allowed identity ke saath correct resource scope dekho. Denied identity, moved resource aur stale cache scenario compare karo; 401/403/404 ka reason contract se jodo.',
    use: 'Multi-tenant data, inherited permissions, private search aur user-scoped actions ke liye.', avoid: 'Gateway login success ko har object par access proof mat banao.',
    compare: [{ choice: 'Read-time permission check', when: 'Current access enforce karna critical ho', tradeoff: 'Fresh decision; query/runtime cost' }, { choice: 'Cached/materialized permission', when: 'Read speed aur scale important ho', tradeoff: 'Invalidation, ancestry changes aur revoke lag define karo' }],
    tree: ['Authenticated? Nahi → identity flow.', 'Resource tenant/action allowed? Nahi → deny according to disclosure policy.', 'Permission cached? Revoke/move invalidation aur stale window test karo.'],
    mistake: 'Spoofable tenant header, guessed object ID ya cache key mein missing user scope ko harmless samajhna.', production: 'Inherited access changes descendants aur cached search results dono ko affect karte hain.',
    followup: 'Permission revoke ke baad already materialized search hits kitni der dikh sakte hain?', sources: ['http', 'tx'],
  });
  add('idempotency', 'idempotency exactlyonce gmail-delivery', {
    title: 'Response kho gaya; operation hua ya nahi?', why: 'Timeout ke baad fresh payment request bhejne se customer double charge ho sakta hai.',
    concept: 'Stable operation identity plus durable atomic dedup repeat attempts ko same logical effect se jodte hain. Header alone dedup implement nahi karta.',
    example: 'Stripe ka documented idempotency contract source mein hai; API versions/retention semantics alag ho sakti hain. Course ka toy payment same logical key reuse sikhata hai.',
    handsOn: 'Same key/body retry karo aur actual side-effect count dekho. Badle body ya nayi key ka contrast padho; old success record ke saath current state bhi verify karo.',
    use: 'Payments, order creation aur at-least-once delivery ke side effects par.', avoid: 'Read-only request aur non-idempotent write ko same retry policy se mat chalao.',
    compare: [{ choice: 'Same logical operation + key', when: 'Documented retry contract aur retention valid ho', tradeoff: 'Dedup possible; scope/body atomicity enforce hon' }, { choice: 'Status/reconciliation', when: 'Commit outcome uncertain aur safe retry unknown ho', tradeoff: 'Extra workflow; duplicate effect se bachne ka controlled path' }],
    tree: ['Outcome known? Haan → status return.', 'Unknown, safe idempotency supported? Haan → same operation/key/body.', 'Support uncertain? Reconcile/status query; new key se repeat side effect mat create karo.'],
    mistake: 'Timeout ko operation rollback ka proof ya exactly-once transport ko external-effect guarantee samajhna.', production: 'Dedup expiry, two concurrent first attempts aur crash-between-effect-and-record race sab test karne padte hain.',
    followup: 'Email send aur dedup row ke beech crash aaye toh atomicity boundary kya hai?', sources: ['idem', 'kafka'],
  });
  add('fair-admission', 'ratelimit nn-kyun nn-kaise nn-code nn-lib nn-kab colab-rationing', {
    title: 'Kiski capacity, kiski baari?', why: 'Ek tenant ka bulk import low-volume customers ki interactive requests ko timeout kara sakta hai.',
    concept: 'Rate limit admissions bound karti hai; fair scheduling ready work ki turns baantti hai; hard partition capacity reserve karti hai.',
    example: 'Kalpanik tenant A 10,000 jobs bheje, B one small job. Global FIFO B ko poore bulk ke peeche rakhegi; per-tenant scheduling wait isolate kar sakti hai.',
    handsOn: 'Per-tenant wait/error graph dekho. Token rate aur burst alag adjust karo; idle capacity, rejected work aur quiet-tenant p99 ko saath compare karo.',
    use: 'Multi-tenant APIs, GPU jobs, bulk import aur background workers mein.', avoid: 'IP ko authenticated tenant ka exact substitute ya request count ko CPU-time fairness mat maano.',
    compare: [{ choice: 'Rate/burst cap', when: 'Admission budget ya abuse bound chahiye', tradeoff: 'Predictable allowance; fixed quota idle capacity borrow nahi karta' }, { choice: 'Work-conserving fair queue', when: 'Service share aur spare capacity use dono chahiye', tradeoff: 'Per-tenant queues/state; variable job cost account karo' }],
    tree: ['Total demand capacity se upar? Haan → admission/capacity budget.', 'One tenant doosre ko block kare? Haan → scoped queues/concurrency.', 'Hard isolation contract? Haan → reserved capacity ka utilization cost accept karo.'],
    mistake: 'CPU request ko hard quota, CPU limit ko reservation, ya every 429 ko abuse proof bol dena.', production: 'NAT identities, spoofed headers, fixed-window bursts aur long nonpreemptive jobs naive fairness ko todte hain.',
    followup: '10 ms aur 10 second jobs ko equal request turns dena kitna fair hai?', sources: ['cpu', 'overload'],
  });
  add('query-index', 'modeling btree composite indextypes nplus1', {
    title: 'Access pattern se data aur index', why: 'Index add karne ke baad bhi filter/sort order mismatch ho toh expensive scan chal sakti hai.',
    concept: 'Data model ownership/invariants preserve kare; index selected predicates/order ko accelerate kare. More indexes write, storage aur maintenance overhead laate hain.',
    example: 'Kalpanik tenant-scoped recent orders ke liye (tenant_id,created_at,id) access path compare karo; real DB plan exact query aur statistics par depend karega.',
    handsOn: 'Baseline rows examined/plan padho. Ek targeted index ya batching change ke baad wahi query phir chalao; write cost aur returned rows bhi same verify karo.',
    use: 'Repeated expensive reads, joins, stable sorts aur demonstrated N+1 paths par.', avoid: 'Har column ka index ya ORM method count ko actual query count ka proof mat banao.',
    compare: [{ choice: 'Composite ordered index', when: 'Known filter prefix aur sort pattern ho', tradeoff: 'Specific access fast; alternate predicates/write maintenance cost' }, { choice: 'Batch/join/projection', when: 'Repeated per-row remote/DB calls dominate karein', tradeoff: 'Fewer calls; result fan-out/payload aur limits check karo' }],
    tree: ['Round trips dominant? Haan → batching/N+1 path dekho.', 'Rows examined dominant? Haan → predicates/order/index plan.', 'Low selectivity/full scan appropriate? Statistics aur actual workload compare karo.'],
    mistake: 'Small output ko small query work samajhna, ya invented simulator plan ko production PostgreSQL benchmark bolna.', production: 'Data skew, stale stats, cold cache aur write amplification candidate index ka actual benefit badalte hain.',
    followup: 'Index read p99 improve kare par write latency double ho toh acceptance criteria kya?', sources: ['pg'],
  });
  add('storage-engine', 'ids storage engines', {
    title: 'Storage ka write/read/space sauda', why: 'One benchmark mein fast write wala engine compaction ya range-scan workload mein alag bottleneck dikha sakta hai.',
    concept: 'Ordered trees, logs, sorted runs aur compaction data layout ke choices hain. Logical database label alone storage workload predict nahi karta.',
    example: 'Kalpanik append-heavy telemetry aur point-update ledger ka read/write/retention mix alag hai. Sortable ID locality de sakti hai; privacy/hot partition effects bhi hain.',
    handsOn: 'Lab ke same operation count par read, write aur space counters compare karo. Compaction/background work ko zero-cost mat maano; model output label padho.',
    use: 'Persistent workload ke measured read/write patterns, range needs aur durability constraints ke basis par.', avoid: 'LSM = every write cheap, ya UUID = every database slow jaisa universal rule mat banao.',
    compare: [{ choice: 'B-tree style layout', when: 'Ordered lookups/ranges aur in-place page access suitable ho', tradeoff: 'Page updates/splits aur cache locality matter karte hain' }, { choice: 'LSM style layout', when: 'Buffered writes/sorted runs useful hon', tradeoff: 'Read, write aur space amplification/compaction budget' }],
    tree: ['Access pattern explicit? Nahi → workload define karo.', 'Foreground timing hi measured? Background merge/write work bhi count karo.', 'Layout candidate chosen? Recovery, tail latency aur cost representative data par verify karo.'],
    mistake: 'Sequential-vs-random folklore ko warm cached file results par force karna.', production: 'Compaction debt, disk headroom, hot key locality aur recovery replay tail spikes la sakte hain.',
    followup: 'Write amplification ka bill kaun bharega jab ingest rate sustained high ho?', sources: ['pg', 'part'],
  });
  add('connection-pools', 'pool yt-vitess', {
    title: 'Pool cap ek queue bhi hai', why: 'Application CPU low ho sakta hai jab requests database connection ka wait karke timeout ho rahi hon.',
    concept: 'Connection pool limited concurrent DB sessions reuse karta hai. Queue wait plus query/service time total user wait banate hain.',
    example: 'Kalpanik 20 app replicas each pool 100 hon toh potential 2,000 DB connections bante hain; per-process size ko total server budget se jodo.',
    handsOn: 'Active, idle, wait aur query duration saath padho. Pool size change ke baad fresh load test se DB pressure aur p99 verify karo; cap increase ko automatic fix mat maano.',
    use: 'Connection setup cost amortize aur DB concurrency bound karne ke liye.', avoid: 'DB already saturated ho toh har replica ka pool bada karke queue DB ke andar mat shift karo.',
    compare: [{ choice: 'Smaller bounded pool', when: 'DB capacity protect aur local admission bound chahiye', tradeoff: 'Queue wait/rejection explicit handle karni hogi' }, { choice: 'Larger pool', when: 'Measured spare DB capacity aur excessive pool wait ho', tradeoff: 'Concurrency/locks/memory badh sakte hain' }],
    tree: ['Pool wait high? Query/DB utilization dekho.', 'DB saturated? Query cost/admission pehle.', 'DB spare aur cap binding? Controlled pool-size test karo.'],
    mistake: 'CPU low ka matlab database spare hai, ya max connections hi optimal concurrency hai sochna.', production: 'Leaks, long transactions, rolling deploy replica overlap aur fan-out total sessions ko surprise karte hain.',
    followup: 'Autoscaling app replicas double kare toh total DB admission budget kaise preserve karoge?', sources: ['overload', 'pg'],
  });
  add('cache-policy', 'caching stampede cache-invalidation eviction probabilistic conshash st-reddit-cache', {
    title: 'Cache hit se zyada: miss aur stale data ka vaada', why: 'Happy-path cache speed achhi ho sakti hai jab simultaneous expiry origin ko crash kara de.',
    concept: 'Cache extra copy hai. TTL, invalidation, eviction, key scope, miss coalescing aur origin fallback correctness/capacity contract define karte hain.',
    example: 'Reddit listing cache course ka historical case hai. Kalpanik 10,000 readers same key miss karein toh request coalescing one logical fill share kar sakti hai.',
    handsOn: 'Cache-on aur cache-miss/bypass state dono ka fresh load compare karo. Update ke baad har layer ka stale window dekho; hit rate alone ko success mat maano.',
    use: 'Repeated reads, bounded stale-data tolerance aur protected origin capacity ho.', avoid: 'Authoritative ledger record ya permission scope ko unversioned shared cache entry se replace mat karo.',
    compare: [{ choice: 'Cache-aside', when: 'App miss/fill logic own kare', tradeoff: 'Flexible; race, coalescing aur invalidation handle karo' }, { choice: 'Materialized read view', when: 'Known expensive derived query repeated ho', tradeoff: 'Fast reads; event lag/rebuild/ownership cost' }],
    tree: ['Stale result allowed? Nahi → authoritative consistency path.', 'Allowed, repeated read? Cache key/scope + TTL define.', 'Miss storm possible? Coalesce/jitter/stale fallback aur origin budget test karo.'],
    mistake: 'Bloom positive ko definite membership, eviction ko durability policy ya cache delete ko every-layer invalidation samajhna.', production: 'Cold starts, hot keys, correlated expiries aur invalidation races miss pressure ko multiply karte hain.',
    followup: 'Cache fail ho toh origin ko full traffic bhejna safe hai? Kis evidence se?', sources: ['cache', 'overload'],
  });
  add('partitioning', 'sharding st-slack-shard st-discord-model st-discord-hot st-insta-postgres notion-scale', {
    title: 'Shard key hi request ka raasta hai', why: 'Total dataset evenly split ho sakta hai jab ek viral channel ya giant tenant one shard ko saturate kar de.',
    concept: 'Partition logical data split hai; shard distribution units/servers define karta hai; replica copy hai. Access locality aur skew shard-key design ko drive karte hain.',
    example: 'Slack workspace, Discord channel aur Notion workspace ke cases different workloads/eras se hain; ek company ki key ko universal best key mat banao.',
    handsOn: 'Per-key/tenant load dekho. Key change ya replica change ke baad reads/writes ka route, hot partition aur rebalance movement compare karo.',
    use: 'Measured storage/throughput limit aur stable access boundaries ko distribute karna ho.', avoid: 'Total row count bada hai isliye turant shard karo, bina query/routing/rebalance plan ke.',
    compare: [{ choice: 'Tenant/key locality', when: 'Most operations one ownership group mein hon', tradeoff: 'Cheap local queries; large/hot tenant imbalance' }, { choice: 'Hash/range spread', when: 'Distribution ya ordered pruning primary ho', tradeoff: 'Skew/range hotspots aur cross-shard query cost' }],
    tree: ['Current node/query tuning enough? Haan → operational simplicity rakho.', 'Distribution needed? Query key aur invariants choose karo.', 'One group huge/hot? Split/route/isolate strategy pehle plan karo.'],
    mistake: 'Replica count badha kar write partition/hot key automatically split ho jaayega sochna.', production: 'Resharding lag, dual routing, metadata availability aur uneven partitions operational incidents banaate hain.',
    followup: 'One tenant half fleet use kare toh uske existing keyspace ko live split kaise karoge?', sources: ['part', 'kafka'],
  });
  add('migration', 'migrations st-discord-migrate dropbox-magic-migration', {
    title: 'Migration mein rollback bhi data flow hai', why: 'New database sahi return kare phir bhi cutover ke baad old side stale ho toh rollback unsafe ho sakta hai.',
    concept: 'Expand compatibility → copy/backfill → live changes catch up → compare → gradual read/write cutover → contract removal.',
    example: 'Discord aur Dropbox public migration stories course mein era-specific examples hain; backfill speed alone live correctness prove nahi karti.',
    handsOn: 'Mission ka unsafe cutover dekho, phir compatibility/backfill/fresh verification steps follow karo. Last observation current reads/writes aur rollback state dono check kare.',
    use: 'Large live datasets, mixed versions aur low downtime requirements mein.', avoid: 'Unverified dual write ko atomic ya one checksum ko every future write ka proof mat maano.',
    compare: [{ choice: 'Big-bang cutover', when: 'Small data aur approved downtime acceptable ho', tradeoff: 'Simple phase count; large blast/rollback window' }, { choice: 'Incremental migration', when: 'Live traffic aur staged verification chahiye', tradeoff: 'More temporary compatibility/replication logic' }],
    tree: ['Old/new versions compatible? Nahi → expand first.', 'Backfill plus live changes caught up? Nahi → cutover wait.', 'Verified and rollback current? Haan → small slice then expand.'],
    mistake: 'Backfill complete ko zero lag, conflict-free writes aur rollback-safe ka combined proof bolna.', production: 'DDL locks, long transactions, replica lag aur out-of-order changes migration plans ko test karte hain.',
    followup: 'Cutover ke baad new-only writes aaye; rollback mein unka owner kaun?', sources: ['tx', 'backup'],
  });
  add('timeout-breaker', 'timeouts breaker cb-kyun cb-kaise cb-code cb-lib cb-kab', {
    title: 'Wait bound karo, repeated sickness ko isolate karo', why: 'Optional recommendation call latke toh shared workers se login bhi unavailable ho sakta hai.',
    concept: 'Timeout one call ka wait bound karta hai. Circuit breaker shared failure history se future attempts short-circuit karta hai; fallback product semantics decide karti hai.',
    example: 'Kalpanik recs timeout 300ms, six-call sample gate, open cooldown 2s teaching knobs hain. Ye values every real service ke recommended defaults nahi.',
    handsOn: 'Closed → open → bounded half-open probe trace karo. Failed probe par cooldown reset aur successful recovery par traffic behavior dekho; harmful design slot ko revise karo.',
    use: 'Repeat remote failures, resource retention aur optional dependency degradation mein.', avoid: 'Every 4xx ko infrastructure sickness ya successful few probes ko full-load recovery proof mat maano.',
    compare: [{ choice: 'Timeout', when: 'Per-attempt waiting resources bound chahiye', tradeoff: 'Each request phir attempt kar sakti; remote work cancellation alag hai' }, { choice: 'Circuit breaker', when: 'Failure pattern par scoped admission stop chahiye', tradeoff: 'Window/sample/cooldown tuning aur fallback correctness' }],
    tree: ['Call wait unbounded? Deadline/timeout add karo.', 'Repeated failure resource burn? Shared scoped breaker consider karo.', 'Recovering? Bounded probes aur load ramp; operation failure domains verify karo.'],
    mistake: 'Breaker object har request mein naya banaana, ya aggregate score se explicitly unsafe choice ko cancel karna.', production: 'Low-volume windows, grouped healthy endpoints aur cold recovery par sudden full traffic false trips/recrashes la sakte hain.',
    followup: 'Breaker per attempt ya whole retry operation ko record karega? Statistics ka meaning kya hoga?', sources: ['retry', 'overload'],
  });
  add('retries', 'retries rt-kyun rt-kaise rt-code rt-lib rt-kab', {
    title: 'Retry request bachaye ya outage badhaaye?', why: '2 second ki dependency blip clients ki synchronized retries se minutes tak overload bana sakti hai.',
    concept: 'Eligible safe errors, maximum total attempts, overall deadline, capped backoff aur independent jitter ek bounded retry policy banaate hain.',
    example: 'Three layers each 3 total attempts → worst-case 27 calls. Three retries means initial+3 attempts; terminology clearly likho.',
    handsOn: 'No retry, deterministic backoff aur jitter traces compare karo. Same user action ke total downstream calls gino; payment timeout par same operation identity dekho.',
    use: 'Documented transient errors jahan repeated operation safe aur latency budget remaining ho.', avoid: 'Unknown-outcome side effects, permanent errors, expired deadlines aur open-circuit rejection ko blindly retry mat karo.',
    compare: [{ choice: 'One retry owner', when: 'Request chain ka total attempt budget manage karna ho', tradeoff: 'Predictable amplification; error/context outer layer ko chahiye' }, { choice: 'Retries every hop', when: 'Explicit shared budget/transparent policy prove ho', tradeoff: 'Uncoordinated nesting multiplicative pressure la sakti hai' }],
    tree: ['Operation safe to repeat? Nahi → status/reconcile.', 'Error transient aur deadline bachi? Nahi → return useful failure.', 'Haan → bounded independent jitter, server delay guidance aur budget follow.'],
    mistake: 'randomize option ko full-jitter formula ya timeout ko server rollback samajhna.', production: 'Retry budgets aur admission control recovery ko protect karte hain; library defaults user SLA ya server capacity nahi jaante.',
    followup: 'Retry-After server delay caller deadline se lamba ho toh client kya return kare?', sources: ['retry', 'http', 'idem'],
  });
  add('backpressure', 'shedding backpressure bp-kyun bp-kaise bp-code bp-lib bp-kab st-slack-queue', {
    title: 'Queue full hone ki khabar upstream tak', why: 'Bounded downstream queue ke bahar blocked HTTP handlers khud unbounded queue ban sakte hain.',
    concept: 'Backpressure producer ko demand feedback se slow karta hai. Rejection/drop policy accepted work, loss aur freshness ko explicitly define karti hai.',
    example: 'Kalpanik arrivals 5/s aur completions 1/s sustained ho toh backlog net 4/s badhta hai. Extra RAM service rate nahi badhaati.',
    handsOn: 'Block, reject, drop-new aur drop-old runs mein pending work ka location aur customer status dekho. Node write(false) par same chunk resend mat karo; next writes drain tak roko.',
    use: 'Streams/bulk producer ko slow kiya ja sake; API par bounded admission aur cooperative retry guidance ho.', avoid: 'Payment accepted bolkar volatile queue mein silent drop mat karo. Freshness-only data aur durable orders ki policy alag rakho.',
    compare: [{ choice: 'Block/await', when: 'Producer actual source generation rok sake', tradeoff: 'Natural pacing; unbounded callers outside queue ko bound karo' }, { choice: 'Reject/drop', when: 'Immediate admission decision ya lossy freshness allowed ho', tradeoff: 'Useful error/drop metrics; data-loss contract explicit chahiye' }],
    tree: ['Must preserve every accepted job? Durable ownership/admission.', 'Producer slow ho sakta? Haan → bounded await feedback.', 'Cannot slow? Reject before commit; lossy state ho toh age-aware drop + metrics.'],
    mistake: 'highWaterMark ko hard memory cap, queue length ko capacity ya standard Retry-After ko milliseconds bolna.', production: 'Rejection bhi CPU/network work hai. Overload ko edge par bound karo; queue slope, wait age, drops aur fairness saath monitor karo.',
    followup: 'Bounded queue bharte hi RAM phir kyun badh sakti hai? Queue ke bahar kya wait kar raha hai?', sources: ['stream', 'overload', 'http'],
  });
  add('cells-isolation', 'bulkhead blast st-cf-fleet rbx-instances rbx-cells', {
    title: 'Ek failure ka maximum daayra', why: 'Three copies same credential, queue, config aur control plane share karein toh one mistake sabko saath gira sakti hai.',
    concept: 'Bulkheads pools/concurrency isolate karte hain. Cells independent serving slices define karti hain; shared dependencies ko diagram mein phir trace karna padta hai.',
    example: 'Roblox instance/cell aur Cloudflare fleet course cases historical designs hain. Kalpanik 10 cells mein one-cell config rollout ideally serving subset expose kare, shared control-plane mutation phir bhi global ho sakti hai.',
    handsOn: 'Fault aur recovery dono diagrams mein shared corners identify karo. Cell count badalne par spare capacity, routing aur common dependencies ka cost compare karo.',
    use: 'Multi-tenant workloads, risky deploys, regional/cell failover aur independent critical features mein.', avoid: 'Only node/process count ko independent failure domains ka proof mat maano.',
    compare: [{ choice: 'Shared pool', when: 'Utilization aur simple operations primary hon', tradeoff: 'Spare capacity share; noisy/failure coupling larger' }, { choice: 'Isolated pool/cell', when: 'Bounded blast radius essential ho', tradeoff: 'Reserved headroom, routing aur duplicated operational cost' }],
    tree: ['One pool can exhaust all critical work? Isolate budget.', 'One change can reach all cells? Stagger and separate ownership.', 'Failover needs global service? Recovery dependency ko bhi isolate/test karo.'],
    mistake: 'Serving path separate hai isliye deploy, auth aur recovery path bhi separate honge maan lena.', production: 'Shared DNS, secrets, deployment systems aur reconnect herds isolation boundary bypass kar sakte hain.',
    followup: 'One cell outage par remaining cells ke load budget mein kitni spare capacity chahiye?', sources: ['overload', 'cpu'],
  });
  add('recovery', 'replication replicas-backups dr-kyun dr-kaise dr-code dr-lib dr-kab gmail-consistency', {
    title: 'Copy, backup aur recovery promise', why: 'Accidental DELETE replicas par bhi copy ho sakta hai; replica hona purane correct data ka backup nahi.',
    concept: 'RPO acceptable data-loss time window; RTO restore-service time target. Async lag, backup interval, replay and failover fencing alag costs hain.',
    example: 'Kalpanik RPO 5min aur RTO 30min business targets hain; observed replication lag/restore drill target meet hone ka evidence denge.',
    handsOn: 'Failure ke pehle committed data aur replica/backup position dekho. Restore ke baad actual missing records aur recovery elapsed compare karo; self-reported lab ko cloud failover proof mat bolo.',
    use: 'Disaster, data corruption, region loss aur accidental operator changes ke liye explicit recovery requirements.', avoid: 'Replica ko backup, successful snapshot API ko tested restore ya active-active ko zero-conflict default mat maano.',
    compare: [{ choice: 'Async replica/warm standby', when: 'Shorter service restoration aur some loss budget acceptable ho', tradeoff: 'Lag/fencing/capacity readiness test chahiye' }, { choice: 'Backup + log replay', when: 'Historical recovery aur independent protected copy chahiye', tradeoff: 'Restore duration, missing logs aur retention budget' }],
    tree: ['Failure type node loss ya bad data? Recovery path alag choose karo.', 'Loss/time targets known? Nahi → business target first.', 'Restored state checked? Nahi → drill incomplete, copy count enough nahi.'],
    mistake: 'Remote copy send initiation ko durable acknowledgement samajhna.', production: 'Recovery keys, DNS, credentials aur control plane unavailable hon toh healthy backup bhi timely serve nahi karega.',
    followup: 'Old primary wapas aaye toh split-brain writes ko kaun fence karega?', sources: ['backup', 'raft'],
  });
  add('observability', 'observability slo aws-scale-rate', {
    title: 'User signal se failure boundary tak', why: 'CPU aur overall averages green ho sakte hain jab ek tenant ki p99 ya accepted-work completion fail ho rahi ho.',
    concept: 'Metrics rate/distribution dikhate hain, logs discrete context, traces request spans. SLI population/window define karta hai; SLO target business tradeoff hai.',
    example: 'Amazon failure-at-scale lesson rate ko size se jodta hai. Kalpanik 1M requests mein 0.1% errors = 1,000 affected requests; window aur retries accounting explicit rakho.',
    handsOn: 'Latency, traffic, errors, saturation aur one business outcome compare karo. Trace se dominant span locate karo; fix ke baad fresh measurement lo.',
    use: 'Diagnosis, alerting, capacity planning aur production experiment stop conditions ke liye.', avoid: 'Missing telemetry ko zero errors, successful HTTP ko correct business result ya p99 ko average percentile mat maano.',
    compare: [{ choice: 'Symptom alert', when: 'User-visible availability/latency degradation detect ho', tradeoff: 'Relevant page; root cause ke liye drill-down chahiye' }, { choice: 'Cause/resource signal', when: 'Specific saturation/failure boundary investigate karna ho', tradeoff: 'Debug depth; symptom impact independently verify karo' }],
    tree: ['User outcome broken? SLI population/window establish.', 'Which segment? Tenant/region/operation breakdown.', 'Where time/failure begins? Spans/resources correlate; fresh after-fix sample compare.'],
    mistake: 'Successful telemetry pipeline ko monitored system healthy hone ka proof samajhna.', production: 'Cardinality, dropped traces, shared monitoring outages aur silent data corruption observability blind spots hain.',
    followup: 'Monitoring bhi failed region mein ho toh recovery decision kis independent evidence se loge?', sources: ['signals', 'traces'],
  });
  add('chaos-experiments', 'chaos ch-kyun ch-kaise ch-code ch-kab', {
    title: 'Chhota hypothesis, chhota fault, clear stop', why: 'Replica count resilience ka daava hai; bounded failure experiment actual user impact aur recovery verify karta hai.',
    concept: 'Hypothesis + steady-state baseline + scoped fault + control comparison + stop condition + cleanup = controlled experiment.',
    example: 'Kalpanik one test instance kill se retry/failover hypothesis evaluate karo. Real production fault injection is course ke browser simulator se execute nahi hoti.',
    handsOn: 'Fault se pehle baseline padho. One fault type aur radius choose karo; stop threshold cross par experiment abort aur cleanup observe karo.',
    use: 'Known safe staging slice aur approved blast radius mein measured resilience assumptions validate karne ke liye.', avoid: 'Active incident, untested rollback, unknown data-loss behavior ya missing stop control ke saath experiment mat start karo.',
    compare: [{ choice: 'Unit/model test', when: 'Deterministic branch/state invariant prove karna ho', tradeoff: 'Cheap/repeatable; real environment coupling miss ho sakti hai' }, { choice: 'Bounded fault experiment', when: 'Integrated failure/recovery behavior evaluate ho', tradeoff: 'Realistic evidence; isolation, cleanup aur authorization chahiye' }],
    tree: ['Baseline and hypothesis explicit? Nahi → write them first.', 'Fault radius and abort ready? Nahi → do not inject.', 'Run complete? Cleanup, actual user impact aur recovery evidence record karo.'],
    mistake: 'Kill succeeded ko system resilience passed ya single clean run ko universal proof bol dena.', production: 'Different faults expose different missing controls: slow dependency, dropped packets, bad data aur capacity loss equal tests nahi.',
    followup: 'Experiment ke dauraan telemetry unavailable ho toh stop behavior kya hoga?', sources: ['signals', 'overload'],
  });
  add('consistency', 'cap eventual clocks consensus consensus-split multiregion', {
    title: 'Partition mein kaunsa vaada bachana hai?', why: 'Do regions independently accept conflicting writes karein toh recovery par one business invariant toot sakta hai.',
    concept: 'Consensus quorum ek ordered decision history coordinate karta hai. CAP partition-time availability/linearizability tradeoff hai; consistency ke multiple business meanings hote hain.',
    example: 'Raft original paper aur Spanner original design sources hain. Kalpanik five voters ka majority three; minority ke do nodes safe quorum writes acknowledge nahi kar sakte.',
    handsOn: 'Partition replay mein 2|3 groups ke responses dekho. Majority, term/epoch, committed vs uncommitted state aur client-visible status alag note karo.',
    use: 'Shared ordered state, leader election aur strong write/read contracts mein.', avoid: 'Physical timestamp alone se cross-machine causal order ya CAP ko everyday pick-any-two slogan mat banao.',
    compare: [{ choice: 'Quorum/strong coordination', when: 'Single history/invariant availability se zyada critical ho', tradeoff: 'Partition/RTT par some operations unavailable/slow ho sakti hain' }, { choice: 'Async/eventual operation', when: 'Conflict/lag product semantics allow kare', tradeoff: 'Local progress; reconciliation and stale-read UX own karo' }],
    tree: ['Invariant concurrent decisions tolerate karta? Nahi → coordinate/fence.', 'Network split? Required quorum reachable? Nahi → safe failure/read policy.', 'Lag allowed? Bound/reconcile and label stale state.'],
    mistake: 'Majority alive ko quorum reachable, wall clock ko perfect order ya replica read ko automatically current samajhna.', production: 'Terms, leases, clock uncertainty, retries aur stale leaders safe acknowledgement boundaries test karte hain.',
    followup: 'Client ko timeout mila par quorum commit ho gaya; safe retry aur read-your-write ka contract kya?', sources: ['raft', 'clock', 'tx'],
  });
  add('distributed-workflow', 'dbperservice querying saga outbox boss-dist', {
    title: 'Data owner alag, atomicity boundary alag', why: 'Order DB commit ho aur event publish miss ho toh kitchen ko accepted order ka pata nahi chalega.',
    concept: 'One local transaction atomic ho sakti hai; service boundaries cross karte hi durable messages, idempotent consumers aur explicit compensation/reconciliation chahiye.',
    example: 'Kalpanik order+outbox one DB transaction mein write hote hain. Relay duplicate publish kar sakta hai; consumer ko stable event ID se dedup karna padega.',
    handsOn: 'Save, commit, publish, process, ack order trace karo. Har crash boundary par durable owner identify karo; compensation ko original DB rollback mat bolo.',
    use: 'Independent service data ownership aur asynchronous business workflow mein.', avoid: 'Dual writes ko atomic, outbox ko duplicate-free transport ya saga compensation ko invisible undo mat maano.',
    compare: [{ choice: 'Local transaction', when: 'Invariant one database ownership boundary mein ho', tradeoff: 'Atomic commit; ownership coupling' }, { choice: 'Outbox/saga', when: 'Multiple independent owners coordinate karte hon', tradeoff: 'Recovery logic, repeated delivery aur temporary states' }],
    tree: ['One DB boundary mein invariant? Transaction/constraint prefer.', 'Cross-owner event? Durable outbox/relay + consumer dedup.', 'Later step fails? Explicit compensatable action or manual reconciliation plan.'],
    mistake: 'Payment refund ko original charge kabhi hua hi nahi ke equivalent samajhna.', production: 'Out-of-order events, poison messages, partial compensation aur long-running workflows business state expose karte hain.',
    followup: 'Relay publish ke baad ack se pehle crash kare toh event lost hoga ya duplicate?', sources: ['tx', 'kafka', 'idem'],
  });
  add('stream-processing', 'streams adclick', {
    title: 'Event ka waqt aur arrival ka waqt', why: 'Late mobile events ko arrival-time bucket mein rakhne se yesterday ke ad bill ya leaderboard galat ho sakte hain.',
    concept: 'Log retained ordered partitions ka sequence hai. Event-time windows/watermarks lateness ki policy define karte hain; global event order automatic nahi.',
    example: 'Kalpanik click 12:00 par hua, network se 12:03 par aaya. Window choice business timestamp aur allowed lateness se decide hogi.',
    handsOn: 'Same event ID duplicate bhejo, late event add karo, watermark/window outputs dekho. Counts aur retained dedup state compare karo.',
    use: 'Replay, independent consumer progress, time aggregation aur high-volume event pipelines mein.', avoid: 'Queue ack ko external effect atomicity ya watermark ko no-more-late-events guarantee mat maano.',
    compare: [{ choice: 'Processing-time window', when: 'Arrival timing acceptable aur simple local ops chahiye', tradeoff: 'Network delays output grouping badal sakte hain' }, { choice: 'Event-time window', when: 'Business event timestamp matters', tradeoff: 'Watermarks, state retention aur late corrections own karo' }],
    tree: ['Event timestamp meaningful/trusted? Define validation.', 'Late arrivals expected? Allowed lateness/correction policy.', 'Duplicates possible? Durable ID/dedup lifetime and replay semantics.'],
    mistake: 'Same partition order ko every key/global total order bolna.', production: 'Partition skew, stalled consumer, replay bursts aur watermark lag state/memory grow karte hain.',
    followup: 'Dedup retention expire hone ke baad old log replay karein toh billing kaise safe rahegi?', sources: ['kafka', 'eventtime'],
  });
  add('concurrency-control', 'locks lock-choices contention ticketmaster', {
    title: 'Ek seat ko do buyers se bachao', why: 'Read-then-write ke beech two requests same available seat dekhkar dono payment accept kar sakti hain.',
    concept: 'Constraint, atomic conditional update, transaction isolation ya fenced lock shared invariant protect karte hain. Lease expire hone ke baad stale worker ab bhi run kar sakta hai.',
    example: 'Kalpanik remaining= 1 par conditional decrement only if remaining>0 ek successful writer allow kare; exact DB transaction semantics verify karo.',
    handsOn: 'Competing buyers ke outcomes aur final available/sold counts dekho. Expired holder ya duplicate retry par same invariant hold hona chahiye.',
    use: 'Inventory, unique assignment, money aur shared mutable resource invariants mein.', avoid: 'Application mutex ko multiple-server protection, lock lease ko process-stop signal ya check-then-set ko atomic mat maano.',
    compare: [{ choice: 'DB constraint/conditional write', when: 'Invariant data owner enforce kar sakta ho', tradeoff: 'Short atomic boundary; conflict/retry handling chahiye' }, { choice: 'Distributed lease/lock', when: 'External coordinated work necessary ho', tradeoff: 'Fencing token, expiry, ownership and crash recovery required' }],
    tree: ['One data owner constraint laga sakta? Haan → simplest atomic primitive.', 'Lock needed? Expired holder ko downstream fence karega?', 'Contended hot key? Admission/queue serialization aur timeout budget compare karo.'],
    mistake: 'Lock acquired message ko actual protected write success ka proof samajhna.', production: 'Hot spots, deadlocks, lease pauses aur lost responses outcome reconciliation maangte hain.',
    followup: 'Old lock holder long GC pause se wapas aaye toh new owner ke write ko kaise protect karoge?', sources: ['tx', 'raft'],
  });
  add('design-review', 'classify antipattern chooser coffeeshop review boss-shapes boss-flow boss-api boss-data boss-resil boss-uber flashcrowd', {
    title: 'Requirements se design decisions tak', why: 'Pretty boxes traffic, correctness aur failure constraints meet na karein toh interview aur production dono mein design fail hai.',
    concept: 'Workload shape → invariant → data flow → capacity/failure budget → candidate tradeoffs → validation. Ek good choice unrelated unsafe choice ko cancel nahi karti.',
    example: 'Kalpanik flash sale ko search feed jaisa eventual inventory contract dena oversell kara sakta hai; URL shortener ka read-heavy tradeoff payment ledger par copy mat karo.',
    handsOn: 'Har canvas slot pick karo, Design review karao aur every option ka why padho. Requirement-breaking picks fix karo; pass tabhi jab threshold aur safety constraints dono meet hon.',
    use: 'Open-ended design, architecture review aur multi-symptom boss exercises mein.', avoid: 'Technology-name checklist ko requirement evidence ya aggregate score ko safety waiver mat banao.',
    compare: [{ choice: 'Simple direct design', when: 'Current scale/invariants easily meet hon', tradeoff: 'Low ops cost; future boundary limits explicit rakho' }, { choice: 'Specialized distributed design', when: 'Measured requirement simpler option se meet na ho', tradeoff: 'Capacity/isolation benefit; recovery/consistency complexity' }],
    tree: ['User outcome aur invariant written? Nahi → pehle define.', 'Bottleneck/capacity quantified? Nahi → napkin + representative measurement.', 'Failure changes result? Recovery/status/rollback path complete karo.'],
    mistake: 'One unsafe critical decision ko multiple positive design points se pass kar dena.', production: 'Data skew, partial failure, stale caches, retries aur shared dependencies happy-path diagrams se bahar break karte hain.',
    followup: '10x traffic aur one dependency loss same time ho toh pehla invariant kaunsa bachana hai?', sources: ['overload', 'tx', 'signals'],
  });
  add('search-ranking', 'search crawler st-reddit-facts st-reddit-rank st-jira-index gs-index gs-crawl gs-rank', {
    title: 'Read time par kitna kaam karna hai?', why: 'Har query par poore corpus ko scan ya every candidate ko expensive model dena low-latency search ko impossible bana sakta hai.',
    concept: 'Inverted/materialized indexes candidates precompute karte hain. Retrieval aur ranking alag budgets hain; index freshness aur permission filtering correctness ka part hain.',
    example: 'Google Search, Reddit ranking aur Jira index stories different historical workloads hain. Kalpanik 1M candidates → 1,000 cheap shortlist → 20 expensive rerank ka staged cost gino.',
    handsOn: 'Candidate count, rows/postings scanned aur final result compare karo. Write/update ke baad index lag/rebuild dekho; stale result aur missing permission ko relevance issue mat bolo.',
    use: 'Many queries repeated over large searchable corpus aur limited response budget ho.', avoid: 'Search index ko authoritative transactional truth ya ranking score ko permission check mat banao.',
    compare: [{ choice: 'Compute on read', when: 'Small corpus ya rare query aur fresh joins needed hon', tradeoff: 'Simple updates; read cost high ho sakti hai' }, { choice: 'Precomputed index + staged rank', when: 'Repeated low-latency broad retrieval ho', tradeoff: 'Update lag, rebuild, storage aur candidate-recall budget' }],
    tree: ['Exact key lookup? Direct index simpler ho sakta hai.', 'Text/broad retrieval? Candidate index choose karo.', 'Expensive rank? Recall/latency metrics ke saath shortlist stages evaluate karo.'],
    mistake: 'Higher ranking speed ko all relevant authorized results retained hone ka proof samajhna.', production: 'Index drift, deletions, stale permissions aur hot popular queries silent correctness issues banaate hain.',
    followup: 'Index repair ke dauraan serving continue karte hue missing/deleted results kaise detect karoge?', sources: ['pg', 'signals'],
  });
  add('media-pipeline', 'media youtube yt-upload yt-transcode yt-deliver', {
    title: 'Badi bytes ka path app se alag socho', why: 'Video bytes application workers se proxy karne se business API memory, network aur upload retry pressure share karegi.',
    concept: 'Control plane authorize/metadata own kare; data path object upload/delivery handle kare. Async transcode ready variants create kare; upload complete playable-ready nahi.',
    example: 'YouTube public stories course mein historical systems hain. Kalpanik 1GiB upload ko parts mein resume karna failed last part ko poori file repeat karne se bachata hai.',
    handsOn: 'Authorize → upload → verify → process → publish-ready flow order karo. Failed part aur incomplete transcode ke user-visible status ko alag check karo.',
    use: 'Large immutable blobs, distributed delivery aur CPU-heavy variants ke liye.', avoid: 'Presigned URL ko unlimited permission, uploaded key ko trusted content ya pending upload ko ready asset mat maano.',
    compare: [{ choice: 'App-proxied bytes', when: 'Small traffic ya required transformation at proxy ho', tradeoff: 'Simple central path; worker/network cost share' }, { choice: 'Authorized direct object path', when: 'Large bytes and scalable transfer needed ho', tradeoff: 'Scoped URL expiry, validation, integrity and completion workflow' }],
    tree: ['Large transfer app saturate kare? Direct authorized path evaluate.', 'Upload integrity/type verified? Nahi → quarantine/pending.', 'Required variants ready? Haan → publish metadata; otherwise status return.'],
    mistake: 'One signed link ko permanent public URL ya file extension ko content validation samajhna.', production: 'Abandoned multipart parts, repeated callbacks, CDN invalidation aur failed variants durable cleanup/status require karte hain.',
    followup: 'Client upload complete bol de par object verify fail ho toh public status kya hoga?', sources: ['blobs', 'http'],
  });
  add('realtime-messaging', 'realtime whatsapp st-slack-boot st-slack-fanout wa-connections wa-store-forward', {
    title: 'Connection, delivery aur read receipt alag hain', why: 'Millions of mostly idle sockets bhi memory/session routing lete hain; send success offline recipient read proof nahi.',
    concept: 'Connection transport live channel deta hai. Store-and-forward durable message ownership deta hai; recipient delivery/read acknowledgement separate states hain.',
    example: 'Slack aur WhatsApp case values public-source era ki snapshots hain, current fleet limits nahi. Kalpanik 20k idle clients aur 20k active senders ka capacity budget alag hai.',
    handsOn: 'Message persist, fan-out, device acknowledgement aur reconnect replay order dekho. Offline/repeated connection par final message count aur order compare karo.',
    use: 'Chat, live collaboration aur timely server-to-client updates mein.', avoid: 'WebSocket connection alive ko user online/read ya one process restart ko durable messages safe hone ka proof mat maano.',
    compare: [{ choice: 'Polling/SSE', when: 'Simple periodic ya one-way updates enough hon', tradeoff: 'Simple protocol; polling overhead/one-way limits' }, { choice: 'WebSocket + durable store', when: 'Bidirectional low-latency channel chahiye', tradeoff: 'Session routing, backpressure, reconnect and message state' }],
    tree: ['One-way push? SSE consider.', 'Interactive two-way? WebSocket/session budget.', 'Recipient offline/connection drops? Durable owner, replay cursor aur dedup define karo.'],
    mistake: 'Transport acknowledgement ko application processing/read receipt samajhna.', production: 'Reconnect storms, huge boot payloads, slow clients aur group fan-out per-socket budget ko multiply karte hain.',
    followup: 'Client last acknowledgement kho de toh reconnect par duplicate message ka behavior kya?', sources: ['http', 'kafka', 'overload'],
  });
  add('geo-routing', 'geo maps-graph maps-crp maps-traffic maps-tiles-s2', {
    title: 'Nearby aur fastest route same query nahi', why: 'Straight-line nearest driver road network par slower ho sakta hai; current speed poore future trip ka ETA nahi.',
    concept: 'Spatial cells candidates prune karte hain; exact geometry final filter deti hai. Route graph topology aur travel-time weights alag concerns hain.',
    example: 'Maps topics public papers/product examples par based hain. Kalpanik 2km circle cover cells false-positive candidates include kar sakti hain; final exact distance filter chahiye.',
    handsOn: 'Candidate cells aur exact results compare karo. Route weight/traffic update badlo aur visited nodes plus selected path verify karo; toy timing ko live Maps SLA mat bolo.',
    use: 'Nearby search, spatial partitioning aur changing-cost route planning mein.', avoid: 'Single latitude/longitude range ko exact radius, tile adjacency ko shortest path ya static speed ko guaranteed ETA mat maano.',
    compare: [{ choice: 'Spatial index/cell cover', when: 'Nearby candidate pruning chahiye', tradeoff: 'Fast candidate set; boundaries/exact-distance final check' }, { choice: 'Graph route preprocessing', when: 'Repeated road path queries aur weight changes hon', tradeoff: 'Precompute/update cost; topology assumptions matter' }],
    tree: ['Nearby objects? Cell candidates + exact geometry.', 'Drivable fastest route? Road graph + travel-time model.', 'Traffic weights change? Separate topology preprocessing from metric customization where supported.'],
    mistake: 'Crow-fly distance ko road travel time ya cell match ko exact geofence proof samajhna.', production: 'Dateline/poles, stale position, unavailable roads aur time-dependent traffic naive filters ko break karte hain.',
    followup: 'Candidate pruning fast ho par boundary results miss hon toh correctness kaise test karoge?', sources: ['geo', 'pg'],
  });
  add('ledger', 'ledger', {
    title: 'Paise ka invariant approximate nahi', why: 'Retries, concurrent updates ya rounding balance ko silently corrupt kar sakte hain.',
    concept: 'Durable journal/entries source of truth ho; balanced accounting, exact units aur atomic invariant enforce karo. Display balance derived ho sakta hai.',
    example: 'Kalpanik debit 100 minor units aur credit 100 same transaction mein recorded hon. Floating display representation ko accounting arithmetic mat banao.',
    handsOn: 'Canvas mein authority, atomicity aur idempotency choices review karo. Duplicate/concurrent effect ke baad entry totals aur final balance consistent hon.',
    use: 'Money, credits, inventory-like auditable assets aur reconciliation workflows mein.', avoid: 'Eventually updated cache ko final financial authority ya compensation ko history erase mat banao.',
    compare: [{ choice: 'Mutable cached balance', when: 'Read acceleration ke liye derived view ho', tradeoff: 'Fast display; journal reconciliation/versioning needed' }, { choice: 'Atomic auditable entries', when: 'Financial truth and invariant enforce karna ho', tradeoff: 'Careful transaction design and correction entries' }],
    tree: ['Operation duplicate? Stable identity/dedup.', 'Entries balanced and atomic? Nahi → reject/reconcile.', 'Display differs? Authoritative journal compare; corrective audit path follow.'],
    mistake: 'Success response alone se financial side effect exactly once hua maan lena.', production: 'Unknown commit outcome, reconciliation gaps, currency units aur administrative corrections audit trail require karte hain.',
    followup: 'Incorrect transfer ko delete karoge ya reversing entries likhoge, aur kyun?', sources: ['tx', 'idem'],
  });

  add('poison-messages', 'dlq', {
    title: 'Ek bad message se poori line na roko', why: 'Same poison payload ko endless retry karne se valid pending jobs bhi progress kho sakti hain.',
    concept: 'Retryable transient failure aur deterministic invalid input alag classify karo. Bounded attempts ke baad quarantine/DLQ diagnosis aur controlled replay ke liye hai.',
    example: 'Kalpanik email template field missing ho toh network retry missing field generate nahi karega; valid later notifications ka independent progress chahiye.',
    handsOn: 'Incident mein repeated failing message aur healthy backlog compare karo. Payload reason identify karke quarantine/fix/replay choose karo; delete-all shortcut completion nahi.',
    use: 'Independent messages jahan one invalid job stream ko stall kar sakti ho.', avoid: 'DLQ ko unmonitored permanent trash ya infinite redrive loop mat banao.',
    compare: [{ choice: 'Retry with bound', when: 'Transient service/network failure probable ho', tradeoff: 'Recovery chance; delay/attempt budget' }, { choice: 'Quarantine + repair', when: 'Payload/schema/business error deterministic ho', tradeoff: 'Manual/automated repair and replay ownership' }],
    tree: ['Same input repeat se fix hoga? Haan → bounded retry.', 'Nahi → useful reason plus quarantine.', 'Repair ready? Idempotent controlled replay with completion evidence.'],
    mistake: 'Queue depth zero ko all jobs successfully processed hone ka proof samajhna.', production: 'Schema version mismatch, expired payloads aur mass redrive duplicate side effects la sakte hain.',
    followup: 'DLQ replay ke baad already-completed effects ko kaise duplicate-free rakhenge?', sources: ['kafka', 'idem'],
  });
  add('degradation', 'degrade', {
    title: 'Kaunsa adhoora result allowed hai?', why: 'Optional recommendations fail ho toh checkout ko block karna useful core service bhi unavailable bana sakta hai.',
    concept: 'Fallback business semantics ka decision hai: stale, partial, simplified ya explicit unavailable. Critical invariant ko silent default se replace nahi karna.',
    example: 'Kalpanik home feed cached recommendations dikha sakti hai; payment authorization ko assumed-approved return karna valid fallback nahi.',
    handsOn: 'Scenario ko critical/optional tier mein classify karo. User ko actual missing/stale section ka indication aur safe next action dikhna chahiye.',
    use: 'Optional enrichment aur explicitly stale/partial-tolerant products mein.', avoid: 'Permissions, money ya security decision ko fabricated success fallback mat do.',
    compare: [{ choice: 'Stale/partial response', when: 'Business stale window aur missing section allow kare', tradeoff: 'Useful continuity; freshness/completeness communicate karo' }, { choice: 'Explicit fail closed', when: 'Wrong result dena denial se zyada harmful ho', tradeoff: 'Correctness/security protected; operation unavailable' }],
    tree: ['Wrong result harmful invariant todta? Haan → fail safely.', 'Stale data allowed? Bound and label age.', 'Optional section unavailable? Omit/simplify with clear status.'],
    mistake: 'Fallback response 200 hai isliye business success count kar dena.', production: 'Fallback cache cold ho sakti hai; recovery surge aur fallback dependencies ke budgets bhi test karo.',
    followup: 'Fallback ne user decision galat kiya toh primary service SLO mein kaise count karoge?', sources: ['http', 'signals'],
  });
  add('product-views', 'bitly leaderboard notion-blocks gmail-state gmail-search-hot', {
    title: 'Authoritative data aur fast product view', why: 'Same document/message ko every product view ke liye duplicate truth banaane se updates drift aur reconciliation badha sakte hain.',
    concept: 'Stable identity/ownership source of truth define karti hai; read views query patterns ko optimize karti hain. Denormalization explicit consistency contract hai.',
    example: 'Notion block aur Gmail state public course cases hain. Kalpanik leaderboard ka sorted read view scores ki authoritative update stream se rebuild ho sakna chahiye.',
    handsOn: 'Canvas/matching mein write owner aur read structure alag chuno. Update ke baad key lookup, ranking/order aur access rules same logical record se agree karein.',
    use: 'Many product views over stable entities, hot reads aur rebuildable derived state mein.', avoid: 'Cache/rank/read model ko unowned independent editable truth mat banaao.',
    compare: [{ choice: 'Normalized authoritative model', when: 'Shared invariant and consistent update boundary chahiye', tradeoff: 'Reliable ownership; read joins/cost possible' }, { choice: 'Derived read structure', when: 'Specific fast lookup/order required ho', tradeoff: 'Extra state, update lag, rebuild/versioning' }],
    tree: ['Record ka sole writer/owner clear? Nahi → define.', 'Read access expensive? Derived view consider.', 'Rebuild/invalidation possible? Nahi → recovery plan before shipping.'],
    mistake: 'Fast lookup path ko unique ID collision, authorization ya read-after-write semantics ka substitute samajhna.', production: 'Hot/cold tiers, historical state aur view repair online serving ko affect karte hain.',
    followup: 'Derived index corrupt ho toh source of truth se users ko serve karte hue kaise rebuild karoge?', sources: ['pg', 'tx', 'cache'],
  });
  add('blob-storage', 'dropbox dropbox-erasure', {
    title: 'Blob content, metadata aur redundancy alag', why: 'File bytes safe ho sakti hain jab directory metadata ya version ownership lost ho; redundancy count alone complete file recovery nahi.',
    concept: 'Content addressing/dedup byte identity handle karti hai; metadata versions/permissions references own karte hain. Replication aur erasure coding durability/cost tradeoffs hain.',
    example: 'Dropbox Magic Pocket story historical scale ka case hai. Kalpanik 6+4 coding mein recovery assumptions independent fragment failures aur codec validation se defined hoti hain.',
    handsOn: 'Blob/metadata/version flow order karo. Fragment loss experiment mein actual reconstruct checksum compare karo; metadata permission/recovery ko separate verify karo.',
    use: 'Large immutable objects, versioned file sync aur storage efficiency requirements mein.', avoid: 'Dedup hash ko user authorization ya data placement ko tested recovery proof mat banao.',
    compare: [{ choice: 'Full replicas', when: 'Simple reads/recovery and enough storage budget ho', tradeoff: 'Higher byte copies; straightforward replacement' }, { choice: 'Erasure coding', when: 'Large cold/warm blob scale par storage efficiency matter kare', tradeoff: 'Reconstruction CPU/network, fragment placement and repair complexity' }],
    tree: ['Object immutable/checksummed? Define byte identity.', 'Metadata owners/versions safe? Verify separately.', 'Redundancy chosen? Correlated fault and repair-headroom tests karo.'],
    mistake: 'Stored fragments ka count dekhkar readable file aur intact metadata assume karna.', production: 'Repair storms, missing indexes, deleted keys aur correlated racks/storage failures nominal redundancy ko defeat kar sakte hain.',
    followup: 'Many disks fail together toh repair network budget serving traffic se kaise share hoga?', sources: ['blobs', 'backup'],
  });
  add('rollout-recovery', 'pm-config pm-regex pm-split pm-thread pm-spiral pm-crowdstrike pm-crowdstrike-lanes pm-crowdstrike-recovery pm-crowdstrike-domain pm-datadog pm-datadog-rules pm-datadog-recovery pm-datadog-fixes rollout boss-feed', {
    title: 'Change aur recovery ka radius alag review karo', why: 'Globally pushed config ya patch one shared assumption todkar healthy replicas ko same minute fail kara sakti hai.',
    concept: 'Config/content/schema bhi input hai. Validate contract, limit rollout scope, observe user/business metrics, and preserve independent rollback/recovery access.',
    example: 'Cloudflare, CrowdStrike, Datadog aur other postmortems dated historical evidence hain. Toy reproductions selected mechanism dikhati hain, exact whole outage ya current company architecture nahi.',
    handsOn: 'Replay mein first bad change, detection, mitigation aur restored outcome alag mark karo. Recovery diagram mein credentials/network/monitoring dependencies phir inspect karo.',
    use: 'Code, config, content, kernel/agent aur fleet patch changes mein.', avoid: 'Small healthy canary ko rare failure proof ya rollback button ko accessible recovery path ka proof mat maano.',
    compare: [{ choice: 'Global immediate change', when: 'Only truly necessary scoped emergency with evidence/controls ho', tradeoff: 'Fast reach; largest simultaneous blast radius' }, { choice: 'Rings/canary + holds', when: 'Representative exposure and observation possible ho', tradeoff: 'Slower rollout; sample power and rollback path needed' }],
    tree: ['Input contract validated? Nahi → stop.', 'Representative small ring healthy for relevant window? Nahi → hold/rollback.', 'Recovery path survives same fault? Verify before broadening.'],
    mistake: 'Serving diagram par isolation dekhkar deployment, auth aur recovery diagram skip karna.', production: 'Reconnect herds, inaccessible boot loops, corrupted shared rules aur missing independent telemetry recovery ko incident se lamba kar sakte hain.',
    followup: '100-user canary rare 1-in-10k error miss kare toh rollout confidence kaise quantify karoge?', sources: ['launch', 'signals', 'overload'],
  });
  add('ml-retrieval', 'vectors tt-feedback-loop tt-embeddings tt-pipeline tt-ranking', {
    title: 'Model ke aas-paas pipeline bhi system hai', why: 'Fast model stale features, wrong joins ya missing candidates ke saath good recommendations guarantee nahi karta.',
    concept: 'Feature freshness, training/serving consistency, candidate retrieval aur ranking budgets together output quality define karte hain. ANN approximate candidate search hai.',
    example: 'TikTok public case historical workload ka example hai. Kalpanik 1M embeddings par HNSW search breadth badalne se recall, latency aur memory ka tradeoff measure karo.',
    handsOn: 'Knobs badalte hue recall target, latency aur memory saath dekho. Event join/window mein late labels aur dropped examples count karo; top score alone ko quality proof mat maano.',
    use: 'Large semantic retrieval, staged recommendation aur feedback pipelines mein.', avoid: 'Embedding distance ko exact truth, sampled engagement ko unbiased preference ya fast ANN ko complete recall mat banao.',
    compare: [{ choice: 'Exact retrieval/batch features', when: 'Small set ya slow freshness enough ho', tradeoff: 'Simple/reproducible; scale/freshness cost' }, { choice: 'ANN/online pipeline', when: 'Large candidate set ya fresh feedback required ho', tradeoff: 'Recall/consistency/lag and operational state' }],
    tree: ['Quality metric and ground truth defined? Nahi → define.', 'Retrieval recall limiting? ANN breadth/index compare.', 'Freshness limiting? Timestamp/join/lag evidence inspect before bigger model.'],
    mistake: 'Latency-only tuning se relevant candidates drop hone ya feedback bias ko ignore karna.', production: 'Hot embedding keys, delayed labels, schema evolution aur feature skew serving/training divergence create karte hain.',
    followup: 'Offline recall badhi par online conversion ghati; kaunsi pipeline/control comparisons loge?', sources: ['ann', 'eventtime', 'signals'],
  });
  add('tenant-storage', 'st-jira-tenant', {
    title: 'Tenant data ka boundary kitna hard?', why: 'One large customer ka hot table, migration ya restore shared database ke unrelated tenants ko impact kar sakta hai.',
    concept: 'Shared table, schema aur database-per-tenant isolation/ops units alag hain. Routing directory, connection budget aur tenant-specific lifecycle design ka part hain.',
    example: 'Jira course case ek public historical database-per-tenant design batata hai; every SaaS ke liye wahi arrangement best nahi.',
    handsOn: 'Canvas mein data placement ke saath tenant directory, connection limits aur region/recovery choices bhi pick karo. One unsafe isolation assumption ko unrelated points se pass na hone do.',
    use: 'Tenant restore/compliance/ownership ya skew isolation important ho.', avoid: 'Database-per-tenant ko dedicated physical machine ya zero shared-dependency failure samajhna.',
    compare: [{ choice: 'Shared table + tenant scope', when: 'Many small tenants aur simple fleet ops chahiye', tradeoff: 'Efficient pooling; every query/limit scope enforce karo' }, { choice: 'Separate database/schema', when: 'Lifecycle/isolation benefit justify kare', tradeoff: 'Routing, schema rollout, connections and metadata scale' }],
    tree: ['Hard lifecycle/isolation requirement? Document it.', 'Tenant count/skew known? Connection and migration budget.', 'Routing metadata lost? Recovery and safe default-deny plan.'],
    mistake: 'Client-supplied tenant route ko authorization ke bina trust karna.', production: 'Huge tenant, directory cache drift aur mass schema migrations control-plane pressure laate hain.',
    followup: 'Tenant ko new region migrate karte waqt stale router writes kahan jaayengi?', sources: ['part', 'tx', 'overload'],
  });
  add('compute-storage', 'st-snow-split st-snow-warehouse', {
    title: 'Compute aur storage ko alag scale karna', why: 'Two analytical teams same compute pool share karein toh one heavy query doosri team ke latency budget ko consume kar sakti hai.',
    concept: 'Separated durable storage aur compute warehouses independent compute sizing/lifecycle enable karte hain. Remote data access phir caching, pruning aur transfer budgets maangta hai.',
    example: 'Snowflake historical architecture lesson aur current warehouse docs alag evidence hain. Kalpanik cold warehouse versus warmed cache same scan ko alag time de sakte hain.',
    handsOn: 'Read bytes, pruning, cache state aur compute size compare karo. Scale compute alone se unchanged remote bytes/network bottleneck solve hoga assume mat karo.',
    use: 'Independent query workloads aur elastic analytical compute mein.', avoid: 'Remote storage ko zero-latency local RAM ya every bigger warehouse ko proportional speedup mat banao.',
    compare: [{ choice: 'Shared compute pool', when: 'Small predictable analytic workload aur utilization priority ho', tradeoff: 'Simpler capacity; noisy query coupling' }, { choice: 'Separate compute warehouses', when: 'Independent workloads/isolation/elasticity chahiye', tradeoff: 'Cold starts, cache locality and separate compute billing' }],
    tree: ['Queue/concurrency bottleneck? Workload isolation/compute scale.', 'Bytes scanned dominate? Pruning/layout/cache inspect.', 'Cold-start dominant? Lifecycle and warm-state cost compare.'],
    mistake: 'Warm cache result ko unqualified storage benchmark ya pricing promise bolna.', production: 'Metadata/pruning, cross-warehouse caches, workload skew aur suspended-compute startup measurements ko change karte hain.',
    followup: 'Compute double hua par query time unchanged; next measured boundary kaunsi?', sources: ['warehouse', 'pg'],
  });
  add('runtime-efficiency', 'st-air-memory st-air-live st-air-rust stripe-no-rewrite stripe-tooling stripe-gil wa-contention', {
    title: 'Rewrite se pehle actual hot work', why: 'More machines ya language rewrite lock contention, repeated view computation ya serial runtime bottleneck ko automatically fix nahi karte.',
    concept: 'Profile CPU, waits, allocation, synchronization aur test/development feedback separately. Optimization hypothesis same-correctness representative experiment se verify karo.',
    example: 'Airtable, Stripe aur WhatsApp course stories historical engineering choices hain; Python/Ruby/Node runtime behavior ko unke exact version/workload context se alag universal verdict mat banao.',
    handsOn: 'Equal work/result ke saath one variable compare karo: lock partitioning, process count, diff update ya selective tests. Correctness/coverage drop ko speed win mat gino.',
    use: 'Measured dominant runtime, contention ya productivity bottleneck clearly identified ho.', avoid: 'CPU low par blindly threads, CPU high par blindly rewrite, ya fewer tests ko equivalent verification assume mat karo.',
    compare: [{ choice: 'Targeted architecture/runtime change', when: 'Hot path cause measured aur locally fixable ho', tradeoff: 'Focused benefit; profile and correctness proof needed' }, { choice: 'Rewrite/new platform', when: 'Existing constraints material aur migration benefit proven ho', tradeoff: 'Large compatibility, operational and validation cost' }],
    tree: ['Where time/work goes measured? Nahi → profile first.', 'One bounded change sufficient? Haan → compare equal work.', 'Rewrite justified? Dual-run/result parity and incremental migration.'],
    mistake: 'Same endpoint response count ko same algorithmic work aur test coverage ke barabar samajhna.', production: 'Runtime versions, thread safety, GC, skew aur lock/cache behavior lab-to-production result badalte hain.',
    followup: 'Selective test graph ek transitive dependency miss kare toh fallback safety kya hai?', sources: ['runtime', 'signals', 'tx'],
  });
  add('untrusted-code', 'st-cf-edge rbx-luau ai-safety-filter ai-containment ai-incident-model colab-isolation colab-disposable replit-full-env replit-isolation replit-undo', {
    title: 'Model ka jawab aur execution authority alag', why: 'Instruction-following model malicious content se steer ho sakta hai; real credentials/network/files tak unrestricted authority actual damage boundary hai.',
    concept: 'Policy/filter intent classify karte hain; sandbox/capabilities enforce execution boundaries. Disposable runtime state aur durable user artifacts ka owner separate rakho.',
    example: 'Cloudflare/Roblox/Colab/Replit public cases different isolation layers explain karte hain. Course ke process/toy simulations actual VM escape resistance ya provider product limits prove nahi karte.',
    handsOn: 'Architecture mein filesystem, network, credentials aur dev/prod boundary ke holes classify karo. Undo test state restore dikhata hai; external side effects separately enumerate karo.',
    use: 'Unknown user/agent code aur untrusted inputs ko bounded execution dene mein.', avoid: 'Prompt refusal ko security wall, plain container ko every threat isolation ya snapshot ko sent email/payment undo mat samjho.',
    compare: [{ choice: 'Policy/model filter', when: 'Requested behavior classify/guide karna ho', tradeoff: 'Useful signal; execution authority enforce nahi karta' }, { choice: 'Sandbox + scoped capabilities', when: 'Real access/resource boundaries enforce hon', tradeoff: 'Compatibility, monitoring, lifecycle and defense layers' }],
    tree: ['What can code access? Define threat/capability budget.', 'Untrusted execution? Strong supported boundary and scoped secrets.', 'Reversible action? State snapshot plus external side-effect reconciliation.'],
    mistake: 'Good model behavior ke test ko adversarial containment proof samajhna.', production: 'Shared kernel/host interfaces, metadata credentials, network egress aur privileged management APIs boundary bypass kar sakte hain.',
    followup: 'Sandbox filesystem rollback hua par external DB write ho chuki; product undo ka contract kya?', sources: ['sandbox', 'cpu', 'signals'],
  });
  add('end-to-end', 'wa-e2e', {
    title: 'Encryption keys ka lifecycle bhi design hai', why: 'Server storage encrypted ho sakti hai jab server hi decryption key own kare; user-to-user confidentiality ka contract alag hai.',
    concept: 'End-to-end encryption authorized endpoints ko plaintext/key access tak limit karti hai. Identity verification, device changes, group membership aur key evolution separate requirements hain.',
    example: 'WhatsApp group-encryption historical course case ko current full protocol guarantee mat banao. Signal specification primary cryptographic design reference hai.',
    handsOn: 'Group participants badlo aur key/distribution work compare karo. Toy encryption count se formal security, metadata privacy ya endpoint safety infer mat karo.',
    use: 'Threat model mein server/operator se message content protect karna ho.', avoid: 'Encryption ko authenticated identity, endpoint compromise protection ya metadata invisibility ka automatic substitute mat banao.',
    compare: [{ choice: 'Transport/server encryption', when: 'Link/storage exposure se protect karna ho', tradeoff: 'Server may still access plaintext under its key model' }, { choice: 'End-to-end protocol', when: 'Only authorized endpoints content read karein', tradeoff: 'Key verification, multi-device/group and recovery complexity' }],
    tree: ['Adversary who? Endpoint/server/network scope define.', 'Keys who owns? Match confidentiality promise.', 'Member/device changes? Rekey, authentication and history access rules.'],
    mistake: 'AES use hua isliye protocol authenticated aur forward secure hai assume karna.', production: 'Lost devices, group membership churn, out-of-order messages aur backup recovery key lifecycle ko complex banaate hain.',
    followup: 'New device join par old history access aur identity trust ka decision kaun leta hai?', sources: ['e2e'],
  });
  add('matchmaking', 'rbx-matchmaker', {
    title: 'Fast assignment ya best possible match?', why: 'Nearest available instance choose karne se latency ghategi par skill/friend/capacity requirements toot sakti hain.',
    concept: 'Matchmaking constrained candidate retrieval plus ranking/assignment hai. Hard safety/capacity constraints aur soft preference scores alag rakho.',
    example: 'Roblox public story historical example hai. Kalpanik 20k join requests par exhaustive all-to-all comparison ka cost aur bounded candidate policy compare karo.',
    handsOn: 'Candidates, rejected constraints aur final assignments dekho. Low latency ke saath room capacity aur stated match criteria verify karo; aggregate score hard violation waive nahi kare.',
    use: 'Interactive join, dispatch aur limited-capacity assignment systems mein.', avoid: 'One weighted score se invalid capacity/security choice ko compensate mat karo.',
    compare: [{ choice: 'Greedy bounded assignment', when: 'Tight response budget and sufficient candidates ho', tradeoff: 'Fast; global optimum may miss' }, { choice: 'Broader search/batching', when: 'Wait budget allows better joint choices', tradeoff: 'Quality potential; compute and user wait higher' }],
    tree: ['Hard constraints valid? Nahi → exclude candidate.', 'Enough candidates in latency budget? Rank and reserve.', 'No valid match? Clear wait/fallback/cancel policy; invalid room assign nahi.'],
    mistake: 'Highest score ko feasible assignment ka proof samajhna.', production: 'Concurrent reservation races, stale capacity and regional scarcity assignment accuracy change karte hain.',
    followup: 'Two matchmakers same last slot choose karein toh capacity invariant ka atomic owner kaun?', sources: ['tx', 'overload'],
  });
  add('accelerator-network', 'ds-constraint ds-moe ds-mla-fp8 aws-srd', {
    title: 'Compute, memory aur wire ka shared budget', why: 'GPU arithmetic fast ho sakti hai jab cross-device communication ya KV-cache memory total throughput ko limit kare.',
    concept: 'MoE routing, low-precision arithmetic, KV representation aur network transport different bottlenecks target karte hain. Model quality/correctness same budget ka constraint hai.',
    example: 'DeepSeek-V3 technical report aur EC2 EFA docs implementation-specific sources hain. Toy SRD/communication simulations real NIC benchmark ya generalized transport guarantee nahi.',
    handsOn: 'Compute, transferred bytes, memory and quality/error constraints compare karo. Precision ya active experts badalne par only speed/memory ko success criterion mat banao.',
    use: 'Measured model-serving/training memory, communication aur utilization constraints mein.', avoid: 'Total parameters ko active compute, lower precision ko free accuracy ya more paths ko no congestion guarantee mat banao.',
    compare: [{ choice: 'More compute/memory', when: 'That resource is measured limiting budget', tradeoff: 'Hardware cost; communication/quality bottleneck remain' }, { choice: 'Algorithm/representation/topology change', when: 'Work/bytes/locality can materially improve', tradeoff: 'Numerical validation, routing and compatibility cost' }],
    tree: ['Compute busy? Arithmetic utilization/active work.', 'Memory full? Representation/context/KV budget.', 'Wire dominates? Communication volume/topology/transport representative test.'],
    mistake: 'Toy arithmetic savings ko actual model training cost ya accuracy claim bana dena.', production: 'Hot experts, all-to-all traffic, heterogeneous kernels and numerical outliers average-only budget ko break karte hain.',
    followup: 'Memory half hui par p99 worse hua; candidate kernels/network path mein kya measure karoge?', sources: ['ml', 'efa', 'signals'],
  });
  add('bounded-work', 'aws-constant-work aws-proofs', {
    title: 'Steady-state simplicity aur invariant proof', why: 'Rare state transition par expensive repair logic tab fail ho sakti hai jab system already outage/recovery pressure mein ho.',
    concept: 'Predictable bounded work some operational states simplify kar sakta hai. Tests examples explore karte hain; formal reasoning stated model ke invariants verify karti hai.',
    example: 'Amazon course case constant-work aur formal assurance ko context-specific techniques batata hai. More predictable work higher baseline cost bhi la sakta hai.',
    handsOn: 'Delta versus constant work mein baseline load, burst and convergence compare karo. Proof exercise mein assumption, invariant and counterexample alag identify karo.',
    use: 'Critical control state, bounded configurations aur rare-but-severe state-machine failures mein.', avoid: 'Formal model passed ko implementation, hardware aur external dependencies automatically correct bolna.',
    compare: [{ choice: 'Change-triggered delta work', when: 'Steady traffic small and transitions manageable hon', tradeoff: 'Lower baseline; rare burst/state handling complexity' }, { choice: 'Bounded periodic/constant work', when: 'Predictability justifies recurring overhead', tradeoff: 'Simpler capacity shape; baseline work/cost greater ho sakti hai' }],
    tree: ['Failure invariant explicit? Nahi → write model.', 'Assumptions match implementation? Check mapping.', 'Rare transition overload? Bound work and test recovery population.'],
    mistake: 'Small exhaustive model ko unbounded production-state exploration samajhna.', production: 'Specification gaps, stale configuration, network partitions and rollout behavior model-to-code boundary par verify karne hote hain.',
    followup: 'Proof correct hai par code stale epoch accept karta hai; verification boundary mein kya missing tha?', sources: ['raft', 'launch'],
  });
  add('peer-distribution', 'bt-swarm bt-rarest bt-titfortat bt-dht', {
    title: 'Peers help karte hain, origin aur trust phir bhi chahiye', why: 'One rare missing piece poore swarm ko completion se rok sakta hai, chahe aggregate uploaded bytes high ho.',
    concept: 'Piece availability/integrity, peer discovery aur upload incentives separate mechanisms hain. DHT peers locate karti hai, file bytes store karna iska main function nahi.',
    example: 'BitTorrent BEP3/BEP5 primary protocol references hain. Kalpanik many downloaders upload karein toh origin pressure share hota hai; zero seed/rare piece still limiting ho sakti hai.',
    handsOn: 'Rarest-piece availability, per-peer upload and completed files compare karo. DHT trace mein queried contact referrals aur actual file transfer distinguish karo.',
    use: 'Same large content ko many cooperative peers distribute karna ho.', avoid: 'More peers ko guaranteed speedup, piece hash ko trusted publisher identity ya DHT ko global file store mat maano.',
    compare: [{ choice: 'Origin/CDN', when: 'Predictable publisher control and availability needed ho', tradeoff: 'Managed delivery; centralized capacity/cost' }, { choice: 'Peer swarm', when: 'Many recipients can share verified pieces', tradeoff: 'Availability, incentives, discovery and adversarial peers' }],
    tree: ['Content identity/integrity known? Verify.', 'Needed pieces available? Seed/repair before speed claims.', 'Peers discovered? Transfer verified pieces with bounded incentives/admission.'],
    mistake: 'Total transferred bytes ko every peer has complete verified file ka proof samajhna.', production: 'NAT, churn, free riders, malicious referrals and disappearing rare pieces swarm quality ko change karte hain.',
    followup: 'All popular pieces copied par last rare piece unavailable ho toh useful progress metric kya?', sources: ['peer', 'dht'],
  });
  add('moving-network', 'starlink-leo starlink-schedule starlink-lasers starlink-anchor', {
    title: 'Moving path, stable user identity', why: 'Physical link move/change ho toh raw path ko session identity banaane se healthy handover bhi connection interruption ban sakta hai.',
    concept: 'Propagation, processing, route length and handover contribute latency. Stable logical anchors can hide topology churn but path stretch/coordination cost laate hain.',
    example: 'Starlink course details source-era snapshots hain; toy orbital/path timings live service promises nahi. Kalpanik shorter satellite hop ka full internet path phir bhi longer ho sakta hai.',
    handsOn: 'Physical link, chosen route aur logical anchor alag trace karo. Handover mein disruption and path latency compare karo; only geometric distance se user p99 derive na karo.',
    use: 'Mobile/churning topology, scheduled handover aur session continuity design mein.', avoid: 'Shorter first-hop distance ko best full path ya anchor ko zero-cost indirection mat banao.',
    compare: [{ choice: 'Direct changing route', when: 'Low stretch and rapid re-routing supported ho', tradeoff: 'Topology churn/session changes expose ho sakte hain' }, { choice: 'Stable logical anchor', when: 'Session identity continuity valuable ho', tradeoff: 'Extra route stretch, state and anchor availability budget' }],
    tree: ['Is delay propagation ya handover? Separate measure.', 'Topology predictably changes? Planned transition evaluate.', 'Stable session needed? Anchor scope and failover contract define.'],
    mistake: 'Speed of light lower bound ko achieved network latency bol dena.', production: 'Weather/load/routing, moving coverage and anchor failure simple geometry-only model se bahar hain.',
    followup: 'Anchor lost ho toh stable identity ko new path par migrate karte waqt state ka owner kaun?', sources: ['http', 'nginx', 'signals'],
  });
  add('randomized-coordination', 'rn-kyun rn-kaise rn-code rn-kab', {
    title: 'Sab ek hi smart choice karein toh herd banta hai', why: 'Stale global-minimum snapshot dekhkar multiple requests/proxies same server par rush kar sakte hain.',
    concept: 'Independent sampling/timing correlated decisions ko spread karti hai. Power-of-two sampled candidates mein lower observed load choose karta hai; global optimum guarantee nahi.',
    example: 'Raft random election timers split-vote chance reduce karte hain. Kalpanik local request counter current local work hai; NGINX least_conn active connections ka different signal hai.',
    handsOn: 'Same stale telemetry ke saath deterministic-minimum, random, round robin aur two-choice compare karo. Queue tails dekho; toy counter ko global CPU truth mat bolo.',
    use: 'Retry/expiry/election synchronization aur load-selection herd reduce karne ke liye.', avoid: 'Sticky-key requirements ko pure random routing ya security randomness ko arbitrary pseudo-random choice se replace mat karo.',
    compare: [{ choice: 'Deterministic global minimum', when: 'Accurate coordinated current state feasible ho', tradeoff: 'Good local decision; shared stale snapshots herd la sakti hain' }, { choice: 'Independent two-choice', when: 'Cheap load sampling with less correlated choices chahiye', tradeoff: 'Not exact optimum; load signal/sampling semantics matter' }],
    tree: ['Affinity/invariant requires fixed owner? Hash/ownership first.', 'Same stale signal many choosers use? Decorrelation consider.', 'Random added? Distribution, floors, ties and collision tests verify.'],
    mistake: 'Random collision ek baar hua toh algorithm broken, ya randomize true means full jitter assume karna.', production: 'Multiple proxies only apna work dekhte hain; multiplexed connections aur heterogeneous request cost load signal ko imperfect banaate hain.',
    followup: 'All local proxies same healthy node ko low load dekhte hain; coordination bina correlation kaise reduce karoge?', sources: ['nginx', 'raft', 'retry'],
  });
  add('health-checks', 'hc-kyun hc-kaise hc-code hc-lib hc-kab', {
    title: 'Restart chahiye, traffic chahiye, ya startup time?', why: 'Shared DB blip ko liveness failure bana doge toh all healthy app processes restart hoke recovery aur slow ho sakti hai.',
    concept: 'Startup app initialize hone ko gate karti hai; readiness traffic eligibility; liveness restart-worthy local failure. Probe action and business acceptance same question nahi.',
    example: 'Kalpanik local event loop hung ho toh restart useful ho sakta; shared DB down ho toh every app restart DB repair nahi karega.',
    handsOn: 'DB failure aur local hang traces compare karo. Probe result, endpoint membership aur restart count alag dekho; readiness dependency decision workload se justify karo.',
    use: 'Container/process lifecycle and traffic admission ko separate operate karne mein.', avoid: 'Every dependency check liveness mein daalna, readiness always local ya readiness always all dependencies jaisa universal rule mat banao.',
    compare: [{ choice: 'Liveness local health', when: 'Restart local irrecoverable condition improve kare', tradeoff: 'Avoid shared dependency cascade; thresholds tolerate normal stalls' }, { choice: 'Readiness business ability', when: 'Instance request contract meet kar sake/na kar sake', tradeoff: 'Dependency scope/fallback matters; fleet-wide drain risk' }],
    tree: ['App startup complete nahi? Startup budget.', 'Restart local failure fix karega? Haan → liveness candidate.', 'Can this instance safely serve contract? Readiness decision with fallback/dependency policy.'],
    mistake: 'Probe 200 ko end-to-end useful success ya process restart ko dependency recovery samajhna.', production: 'Threshold/delay timing, mass unready instances, shared checks and warmup behavior outage length badha sakte hain.',
    followup: 'Shared dependency down aur useful stale fallback available ho toh readiness kya kahegi?', sources: ['probes', 'signals'],
  });
  add('cost-model', 'unitcost dropbox-rent-own', {
    title: 'Per-request bill mein saari copies aur work', why: 'Storage price per GiB low ho par transfer, replicas, requests, repair aur staffing total decision reverse kar sakte hain.',
    concept: 'Cost model scope/units/horizon ke saath use karo. Fixed vs variable cost, utilization and operational capability compare karo; current prices separately verify karne hote hain.',
    example: 'Dropbox own-vs-rent course case historical workload ka tradeoff hai. Kalpanik 100 fixed units +0.01 per request model current cloud quote ya universal break-even nahi.',
    handsOn: 'Inputs, period aur included components list padho. Same useful completed requests par total cost calculate karo; failed/dropped work ko free throughput mat gino.',
    use: 'Architecture alternatives, buy/build and unit economics evaluate karne mein.', avoid: 'Old public bill, invented units ya one utilization snapshot ko live procurement recommendation mat banao.',
    compare: [{ choice: 'Managed/rented capacity', when: 'Elasticity and reduced operations important hon', tradeoff: 'Variable bill, transfer/request charges and vendor contract' }, { choice: 'Owned/specialized stack', when: 'Stable high volume plus operational expertise justify kare', tradeoff: 'Fixed capital, staffing, repair and capacity risk' }],
    tree: ['Same workload/availability scope? Nahi → normalize.', 'All fixed/variable/replica/transfer costs included? Nahi → model complete karo.', 'Sensitivity changed by utilization/traffic? Compare multiple scenarios before decision.'],
    mistake: 'Cache add karke authoritative origin copy ka cost hata dena.', production: 'Unused headroom, incident repair, egress and long-term commitments observed monthly unit cost change karte hain.',
    followup: 'Traffic half ho aur availability target same rahe toh cheaper design kaunsa hoga?', sources: ['blobs', 'signals'],
  });

  const allLevels = Object.values(SD.levelSets).flat();
  const known = new Set(allLevels.map(level => level.id));
  Object.keys(byLevel).forEach(id => { if (!known.has(id)) throw new Error('Guidance references missing level: ' + id); });
  allLevels.forEach(level => { if (!byLevel[level.id]) throw new Error('Level needs a major-topic decision guide: ' + level.id); });
  SD.guidance = { topics, byLevel };
})();
