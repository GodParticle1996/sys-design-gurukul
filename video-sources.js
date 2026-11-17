/* Optional source videos. No player/network request until the learner clicks Play. */
(function () {
  SD.videoLibrary = [
    {id:'pyxsGki1epE',title:'Design Search Autocomplete – System Design Interview w/ Ex-Google Engineer',channel:'System Design School',
      reviewNote:'Full English captions aur saari 559 two-second interval images (24 contact sheets) review hui; baaki 1,014 caption/scene-boundary candidates alag se nahi dekhe. Compressed trie ka lookup/split, bottom-up list, decay aur half-life, multi-shard swap, router table ka t–v gap, shard-down shart aur replicas per shard ke exercises iv-typeahead mein jode hain. Ek slide ka 1.5M/s aur estimation ka 12 GB alag assumptions ke saath note kiye hain.',
      levels:['iv-typeahead'],chapters:[[0,'Ask — top 10 per keystroke'],[53,'Requirements'],[107,'Estimates — 500K/s (one slide says 1.5M)'],[143,'Database version'],[195,'Trie with stored top 10'],[314,'Memory and compressed trie'],[426,'Inserting cardboard — edge split'],[583,'Sharding by range'],[657,'Skew — router table gap in app'],[737,'Debounce'],[758,'Short-prefix cache'],[801,'Replicas — per-shard copies in app'],[848,'Pipeline'],[906,'Decay — half-life in app'],[965,'Pointer swap — one build across shards in app'],[996,'Trending list'],[1013,'Failures — shard-down condition in app'],[1048,'Follow-ups']]},

    {id:'blMWTUVX43U',title:'System Design Was HARD Until I Learned These 10 Patterns',channel:'System Design School',
      reviewNote:'Full English captions aur saari 495 two-second interval images (21 contact sheets) review hui; 968 caption-boundary candidates alag se nahi dekhe. Pattern-spotting, source numbers ki shartein (80%/19%, retry time, token bucket, 400/410 parts, copies vs servers), HyperLogLog ka standard error aur failed refund recovery ke exercises jode hain.',
      levels:['classify','probabilistic','saga'],chapters:[[0,'37 questions, 10 patterns'],[43,'Photo app — one server'],[66,'Scaling reads — cache, replicas, CDN, precompute'],[161,'Scaling writes — 80% and 19% conditions in app'],[272,'Async work — retry total time in app'],[355,'Fan-out — hybrid threshold'],[436,'Hot keys — copies versus servers in app'],[511,'Counting — HyperLogLog standard error in app'],[584,'Large files — 400 versus 410 parts'],[662,'Real-time push'],[734,'Special indexes'],[797,'Handling failure — refund failure in app'],[949,'Which patterns a question needs']]},

    {id:'e8H8d0irqLg',title:'How to Solve (Almost) Any System Design Interview (1 Method)',channel:'System Design School',
      reviewNote:'Full captions aur all 1,743 available candidate images reviewed; one final candidate missing. Seven existing-course stages, six local experiments aur SQL search/hold exercises added. Queue graph, readiness, chat receipts, seat expiry aur feed threshold ki assumptions explicit hain.',
      levels:['sds-contracts-kab','cc-workers','youtube','bitly','search','whatsapp','ticketmaster','fanout'],chapters:[[0,'Common design — contract first'],[50,'Read and write paths'],[132,'Template components'],[283,'Four-step method'],[318,'LeetCode — queue math qualified'],[457,'YouTube — upload version and readiness'],[577,'URL shortener — commit and fresh read'],[662,'Post search — full-text and revisions'],[741,'Chat — durable receipts and recovery'],[875,'Ticketmaster — admission versus ownership'],[1005,'Feed — hybrid merge and workload threshold'],[1062,'Recap']]},

    {id:'4qUoPbU5jf8',title:'Design LeetCode – System Design Interview w/ Ex-Google Engineer',channel:'System Design School',
      reviewNote:'Full captions aur all 2,323 extracted images review hue hain. Existing Colab isolation, Workers aur Leaderboard mein six interactive stages aur six local experiments hain. SQL Gurukul companion real SQLite verdict/rejudge/outbox/rebuild practice karti hai. Source ke read-only, retry aur score assumptions clearly qualify kiye hain.',
      levels:['colab-isolation','cc-workers','leaderboard'],chapters:[[0,'Contest scenario'],[20,'Requirements'],[197,'API and durable acceptance'],[290,'Schema — SQL companion'],[358,'Naive execution'],[417,'Isolation — access and resource rules clarified'],[704,'Queue burst and recovery'],[819,'Fair dispatch'],[920,'Verdict retries — generation guard added'],[1011,'Harness and trusted checker'],[1162,'Leaderboard'],[1313,'Packed score — bounds and precision'],[1381,'Read scaling and rebuild'],[1424,'Polling versus push'],[1468,'Whole design — durable handoffs added'],[1528,'Follow-up decisions'],[1650,'Recap']]},
    {id:'Ooy-KpRH66M',title:'Step-by-Step Roadmap to Mastering System Design for Interviews',channel:'System Design School',
      reviewNote:'Full captions aur all 1,036 available extracted images review hue hain; 1 final candidate missing hai. Existing Success course mein four interactive exercises, five local experiments aur topic-to-practice map hain. CAP, counter uniqueness aur OAuth claims clearly qualify kiye hain.',
      levels:['sds-contracts-kab'],chapters:[[0,'Learning roadmap'],[68,'Interview expectations — role guidance, not a hiring guarantee'],[98,'ID generation — uniqueness conditions in app'],[123,'Requirements and quality'],[183,'CAP — partition condition clarified in app'],[266,'API design'],[319,'Authentication — OAuth/OIDC distinction in app'],[396,'High-level design'],[515,'Deep dives'],[568,'Data and cache practice'],[630,'Consistency, failover and observability'],[697,'Recap']]},
    {id:'TYl0HiOLKUc',title:'System Design Interview: Design Uber w/ a Google Engineer',channel:'System Design School',
      reviewNote:'Full captions aur all 1,031 available extracted images review hue hain; 1 final candidate missing hai. Existing Geo aur Ride Hailing lessons mein five interactive stages aur six local experiments hain. SQL Gurukul mein spatial index mechanics aur real SQLite practical hai.',
      levels:['geo','boss-uber'],chapters:[[0,'Scenario'],[33,'Requirements'],[88,'Average rates — peak qualification in app'],[130,'Architecture'],[262,'Driver updates'],[283,'Matching — omitted offer boundaries added in app'],[320,'Location fanout'],[348,'Protocol choices'],[406,'QUIC — historical source context'],[439,'Naive distance query'],[478,'PostGIS — database companion'],[524,'Geohash coverage'],[568,'Quadtree — incomplete source code replaced by original lab'],[611,'S2 and Hilbert'],[673,'H3 — geometry qualifications in app']]},
    {id:'iNDHmtDxm30',title:'Idempotency & Retries in System Design Interviews',channel:'System Design School',
      reviewNote:'Full English captions aur all 1,138 available extracted images review hue hain. Existing idempotency, exactly-once aur retry lessons mein five interactive stages aur local practical experiments hain. Database mechanics SQL Gurukul companion mein hain.',
      levels:['idempotency','exactlyonce','retries'],chapters:[[0,'Timeout ambiguity'],[54,'Lost request versus lost reply'],[132,'Intended idempotent effect'],[204,'Stable operation keys'],[320,'Concurrent retries'],[400,'Crash and local transaction'],[460,'External effect and unknown result'],[551,'Queues and job occurrence'],[636,'Exactly-once scope — source claim qualified in app'],[696,'Retry decisions'],[720,'Waits versus total deadline'],[750,'Jitter — average is not a cap'],[780,'Retention window'],[794,'Interview summary']]},
    {id:'0XWJoDIpY_g',title:'Concurrency Was HARD Until I Learned These 16 Concepts',channel:'System Design School',
      reviewNote:'Full English caption content aur all 976 available extracted images review hue hain; 1 final candidate missing hai. Existing concurrency/booking courses mein original exercises, Java lab links aur SQL Gurukul database companion jode hain.',
      levels:['cc-start','cc-race','cc-locks','cc-stuck','cc-pool','cc-queue','cc-workers','ticketmaster'],chapters:[[0,'Last seat'],[40,'Processes and threads'],[63,'Concurrency versus parallelism'],[92,'Lost update'],[132,'Critical section'],[159,'Mutex'],[194,'Deadlock'],[224,'Semaphore — ownership distinction in app'],[259,'Atomic operations'],[298,'Thread pool'],[320,'Event loop and await'],[360,'Queue and ownership'],[396,'Multiple servers'],[434,'Pessimistic — SQL companion'],[468,'Optimistic — internal locks and zero-row result clarified'],[515,'Distributed lease and fencing'],[571,'Idempotency'],[607,'Recap — ownership qualifications in app']]},
    {id:'zgMYBhenPOI',title:'Caching Was HARD Until I Learned These 17 Concepts',channel:'System Design School',
      reviewNote:'English captions aur all 949 available extracted images review hue hain; 2 final candidates missing hain. Existing caching, stampede aur eviction lessons mein five interactive stages aur seven runnable experiments jode hain. Source assumptions aur freshness limits explicitly explain ki hain.',
      levels:['caching','stampede','eviction','cache-invalidation'],chapters:[[0,'Product store workload'],[52,'Cache copy'],[73,'Hit and miss'],[107,'Popularity assumptions'],[126,'Cache-aside'],[147,'TTL — freshness conditions in app'],[187,'LRU'],[221,'Memory estimate'],[241,'Cache keys'],[271,'Write policies'],[309,'Invalidation races'],[363,'Stampede and coordination scope'],[411,'Jitter — expiry is not traffic'],[441,'Negative caching and Bloom filters'],[478,'Cache layers'],[513,'Distribution'],[551,'Hot copies versus machines'],[590,'Failure and cold-start budget']]},
    {id:'5PJKrdzKGEQ',title:'How Would You Scale This? (System Design Interview)',channel:'System Design School',
      reviewNote:'Full English captions aur 940 extracted images review hue hain; 1 final candidate missing hai. Scaling decisions, cache race, replica freshness aur backlog ke original exercises jode hain. SQL mechanics SQL Gurukul companion mein hain.',
      levels:['fp-scale-kab'],chapters:[[0,'Photo app scenario'],[36,'Traffic units'],[83,'Separate database'],[107,'Query work — executable SQL in companion'],[145,'Vertical scaling'],[177,'Stateless app instances'],[208,'Horizontal scaling'],[231,'Autoscaling'],[245,'Cache — race qualified in app'],[285,'CDN'],[332,'Replicas'],[354,'Lag — timer limit in app'],[388,'Failover — acknowledgement boundaries in app'],[421,'Sharding'],[470,'Hot keys'],[511,'Queue — ongoing arrivals included in app'],[548,'CQRS'],[576,'Regions']]},
    {id:'15sgUqScHgs',title:'10 Most Common System Design Interview Mistakes',channel:'System Design School',
      reviewNote:'Full English captions aur 846 extracted images review hue hain; 1 final candidate missing hai. Existing Success course mein guided design review, contest-window calculation aur failure decisions jode hain.',
      levels:['sds-contracts-kab'],chapters:[[0,'Conversation and scope'],[43,'Quality requirements'],[91,'Data flow'],[146,'Buzzwords'],[206,'Tradeoffs'],[266,'Levels of detail'],[306,'Simple diagrams'],[405,'Calculation scope — contest window clarified in app'],[456,'Technology choices'],[493,'Failure scenarios']]},
    {id:'XvnppkWqJbs',title:'Message Queues vs Pub/Sub | System Design',channel:'System Design School',
      reviewNote:'Full transcript aur 717 extracted images review hue hain; 1 final candidate missing hai. Existing EDA course mein topology, retention aur retry guarantees ke original exercises jode hain.',
      levels:['ed-kyun','ed-kaise','ed-code','ed-kab'],chapters:[[0,'Queue and work sharing'],[58,'Ordering — qualifications in app'],[87,'Queue tradeoffs'],[175,'Pub/Sub fanout'],[253,'Pub/Sub tradeoffs — retention correction in app'],[350,'Choosing — exactly-once claim corrected in app'],[394,'Order tasks and routing'],[463,'Sports updates']]},
    {id:'PgDaJEjlBuI',title:'Multithreading vs Multiprocessing | System Design',channel:'System Design School',
      reviewNote:'Full transcript aur 438 extracted images review hue hain. Runtime-specific rules, copied/shared memory aur failure boundaries ke exercises existing Concurrency course mein hain.',
      levels:['cc-start','cc-race','cc-stuck','cc-workers'],chapters:[[0,'Threads and shared resources'],[18,'Waiting and overlap'],[36,'Thread tradeoffs'],[84,'GIL — build-specific qualification in app'],[105,'Processes'],[153,'Process tradeoffs'],[224,'Choosing'],[248,'Web server thread pool'],[270,'Partitioned data analysis']]},
    {id:'jjhdQwQBBuA',title:'Event Sourcing vs CRUD | System Design',channel:'System Design School',
      reviewNote:'Full transcript aur 382 extracted images review hue hain; 1 final candidate missing hai. Existing Event Sourcing lessons mein safe replay, fee correction aur audit alternatives ke exercises jode hain.',
      levels:['es-kyun','es-kaise','es-code','es-kab'],chapters:[[0,'Event history'],[19,'State from events'],[49,'Tradeoffs — rollback claim qualified in app'],[82,'CRUD'],[104,'Direct updates'],[130,'CRUD tradeoffs'],[159,'Choosing a pattern'],[180,'Account history'],[200,'Time and history'],[214,'Corrections and limits'],[226,'Inventory example']]},
    {id:'ryzF1vO7N4w',title:'Throughput vs Latency | System Design',channel:'System Design School',
      reviewNote:'Full transcript aur 240 extracted images review hue hain; 2 final candidates missing record hue. Existing Scale lesson mein explicit window, units aur queue trace joda hai.',
      levels:['fp-scale-kyun','fp-scale-kaise'],chapters:[[0,'Throughput'],[18,'Units'],[30,'Resources and bottlenecks'],[52,'Latency'],[66,'Measurement tools'],[74,'Possible improvements'],[86,'Gaming'],[97,'Comparison'],[116,'Use cases'],[140,'Pipeline'],[152,'Video startup']]},
    {id:'htQlfMV0Dys',title:'REST vs GraphQL | System Design',channel:'System Design School',
      reviewNote:'Full transcript aur 484 extracted images review hue hain. Source ka schema snippet executable nahi tha; app mein valid schema, query aur real runtime lab alag diye hain.',
      levels:['filtering'],chapters:[[0,'REST basics'],[29,'Resource example'],[41,'Stateless interaction'],[55,'Layers'],[69,'REST tradeoffs'],[137,'GraphQL'],[163,'Query and response'],[186,'Schema illustration — syntax corrected in app'],[196,'Subscriptions'],[205,'GraphQL tradeoffs'],[257,'Decision'],[287,'Older Twitter illustration'],[316,'GitHub query illustration']]},
    {id:'AV4Ei1qW89o',title:'File Storage vs Object Storage | System Design',channel:'System Design School',
      reviewNote:'Full transcript aur 435 extracted images review hue hain. File operations, partial object move aur complete-release publication ke original exercises jode gaye hain.',
      levels:['storage','dropbox'],chapters:[[0,'File storage'],[15,'Directory tree'],[44,'Filesystems and protocols'],[63,'File tradeoffs'],[121,'Object storage'],[159,'Object tradeoffs'],[210,'Choosing operations'],[252,'Shared drive'],[271,'Media objects']]},
    {id:'KGM9eSPeZ04',title:'API Gateway vs Load Balancer | System Design',channel:'System Design School',
      reviewNote:'Full transcript aur 454 extracted images review hue hain. Service routing, instance selection, DNS aur API policies ke original exercises jode gaye hain.',
      levels:['sds-routing-path','sds-routing-debug'],chapters:[[0,'API Gateway'],[20,'Responsibilities'],[34,'Tradeoffs'],[80,'Load balancer'],[95,'Health and selection'],[122,'Layer 4'],[147,'Layer 7'],[175,'DNS routing'],[233,'When to use'],[264,'Combined example']]},
    {id:'4C9SVQVmUxs',title:'System Design Interview: Design a Webhook Service w/ a Google Engineer',channel:'System Design School',
      reviewNote:'Full transcript aur 621 extracted images review hue hain. Intake receipt, worker acknowledgement, duplicate effects aur signature ke exercises jode gaye hain.',
      levels:['sds-webhook'],chapters:[[0,'Intro'],[14,'Webhook vs polling'],[62,'Requirements'],[134,'Architecture'],[221,'Two acknowledgements'],[280,'Failures'],[335,'Duplicates'],[388,'Signature verification']]},
    { id: 'X_DdIXrmWOo', title: 'Server-Sent Events vs WebSockets | System Design', channel: 'System Design School',
      reviewNote: 'Transcript aur 501 extracted frames review hue hain. App mein handshake, direction, binary payload aur recovery ki explanations jodi gayi hain. Yeh har encoded frame dekhne ka claim nahi hai.',
      levels: ['sds-live-kyun', 'sds-live-kaise', 'sds-live-code', 'sds-live-kab', 'realtime'],
      chapters: [[0, 'Intro'], [20, 'Server-Sent Events'], [102, 'WebSockets'], [203, 'When to Use Each'], [249, 'SSE example'], [279, 'WebSocket example']] },
    { id: 'OWVaX_cBrh8', title: 'Master System Design Interviews: 5 Key Questions & a Winning Template', channel: 'System Design School',
      reviewNote: 'Full transcript aur 2,045 extracted images review hue hain. Success timing, async job status aur failure recovery ke original exercises jode gaye hain.',
      levels: ['sds-contracts-kyun', 'sds-contracts-kaise', 'sds-contracts-code', 'sds-contracts-kab', 'sds-live-kab', 'whatsapp', 'bitly', 'dropbox', 'youtube'],
      chapters: [[0, 'Intro'], [39, 'Twitter'], [493, 'WhatsApp'], [775, 'URL Shortener'], [1016, 'Dropbox'], [1240, 'Netflix']] }
  ];
  SD.renderVideoSources = function (level) {
    const videos = SD.videoLibrary.filter(v => v.levels.includes(level.id));
    if (!videos.length) return null;
    const box = SD.el('details', 'lesson-card');
    box.appendChild(SD.el('summary', null, '🎬 Related videos — System Design School'));
    box.appendChild(SD.el('p', null, 'Video dekhna optional hai. App ke examples aur exercises independently banaye gaye hain. Har video ka review status neeche diya hai.'));
    for (const video of videos) {
      const section = SD.el('section');
      section.appendChild(SD.el('h3', null, video.title));
      section.appendChild(SD.el('p', null, video.reviewNote));
      const player = SD.el('div');
      const play = SD.el('button', 'btn small', '▶ Yahin video chalao');
      const watch = SD.el('a', 'btn small ghost', 'YouTube par kholo ↗');
      watch.href = `https://www.youtube.com/watch?v=${video.id}`; watch.target = '_blank'; watch.rel = 'noopener noreferrer';
      function start(seconds) {
        player.innerHTML = '';
        const frame = document.createElement('iframe');
        frame.title = `${video.title} — ${video.channel}`;
        frame.src = `https://www.youtube-nocookie.com/embed/${video.id}?start=${seconds}`;
        frame.style.width = '100%'; frame.style.aspectRatio = '16 / 9'; frame.style.border = '0';
        frame.allow = 'encrypted-media; picture-in-picture; fullscreen'; frame.allowFullscreen = true;
        frame.referrerPolicy = 'strict-origin-when-cross-origin';
        player.appendChild(frame);
      }
      play.onclick = () => start(0);
      const controls = SD.el('div', 'btnrow'); controls.append(play, watch); section.append(controls, player);
      const chapters = SD.el('div', 'btnrow');
      for (const [seconds, title] of video.chapters) {
        const label = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} · ${title}`;
        const link = SD.el('a', 'btn small ghost', label);
        link.href = `https://www.youtube.com/watch?v=${video.id}&t=${seconds}s`; link.target = '_blank'; link.rel = 'noopener noreferrer';
        chapters.appendChild(link);
      }
      section.appendChild(chapters); box.appendChild(section);
    }
    return box;
  };
})();
