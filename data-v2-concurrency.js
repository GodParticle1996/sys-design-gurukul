/* Concurrency — original build/break/fix course requested 2026-10-29.
   Java 21 platform threads; lab 46 captures are real host runs unless labelled MODEL.
   Loaded after data-guidance.js so this self-contained track can add its own guides. */
(function () {
  const PROJECT = '46-concurrency';
  // Filled with verbatim source slices and measured stdout; validator/evidence test check both.
  const CODE = {};
  const OUTPUT = {};
  CODE.race = {"title": "RaceLab.java", "file": "docker-labs/46-concurrency/src/RaceLab.java", "from": 30, "text": "    void incrementLocked() {\n        lock.lock();\n        try {\n            value = value + 1;\n        } finally {\n            lock.unlock();\n        }\n    }"};
  CODE.queue = {"title": "QueueLab.java", "file": "docker-labs/46-concurrency/src/QueueLab.java", "from": 20, "text": "        void put(T item) throws InterruptedException {\n            Objects.requireNonNull(item);\n            lock.lockInterruptibly();\n            try {\n                while (items.size() == capacity) {\n                    waits++;\n                    notFull.await();\n                }\n                items.addLast(item);\n                notEmpty.signal();\n            } finally {\n                lock.unlock();\n            }\n        }\n\n        T take() throws InterruptedException {\n            lock.lockInterruptibly();\n            try {\n                while (items.isEmpty()) notEmpty.await();\n                T item = items.removeFirst();\n                notFull.signal();\n                return item;\n            } finally {\n                lock.unlock();\n            }\n        }"};
  CODE.pool = {"title": "PoolLab.java", "file": "docker-labs/46-concurrency/src/PoolLab.java", "from": 15, "text": "        Lease borrow(long timeoutMillis) throws InterruptedException {\n            if (timeoutMillis < 0) throw new IllegalArgumentException(\"negative timeout\");\n            if (!permits.tryAcquire(timeoutMillis, TimeUnit.MILLISECONDS)) return null;\n            Integer id = free.poll();\n            if (id == null) {\n                permits.release();\n                throw new IllegalStateException(\"Permit without a free connection\");\n            }\n            return new Lease(id, this);\n        }"};
  CODE.deadlock = {"title": "DeadlockLab.java", "file": "docker-labs/46-concurrency/src/DeadlockLab.java", "from": 32, "text": "    private static Thread worker(ReentrantLock first, ReentrantLock second, CountDownLatch ready, String name) {\n        Thread t = new Thread(() -> {\n            try {\n                first.lockInterruptibly();\n                try {\n                    ready.countDown();\n                    LabSupport.await(ready);\n                    second.lockInterruptibly();\n                    try { /* Opposite order deliberately prevents reaching this point. */ }\n                    finally { second.unlock(); }\n                } finally { first.unlock(); }\n            } catch (InterruptedException expected) {\n                Thread.currentThread().interrupt();\n            }\n        }, name);\n        t.setDaemon(true);\n        return t;\n    }"};
  CODE.workers = {"title": "WorkersLab.java", "file": "docker-labs/46-concurrency/src/WorkersLab.java", "from": 11, "text": "        String execute(String key, String body) {\n            return orders.compute(key, (id, existing) -> {\n                if (existing != null) {\n                    if (!existing.body().equals(body)) throw new IllegalArgumentException(\"same key, different body\");\n                    return existing;\n                }\n                return new Order(body, \"order-\" + effects.incrementAndGet());\n            }).result();\n        }\n    }"};
  CODE.executor = {"title": "WorkersLab.java", "file": "docker-labs/46-concurrency/src/WorkersLab.java", "from": 22, "text": "    static Result executor(boolean bounded) throws InterruptedException {\n        BlockingQueue<Runnable> queue = bounded ? new ArrayBlockingQueue<>(2) : new LinkedBlockingQueue<>();\n        ThreadPoolExecutor pool = new ThreadPoolExecutor(2, 2, 0, TimeUnit.MILLISECONDS,\n            queue, new ThreadPoolExecutor.AbortPolicy());"};
  OUTPUT["ex0-basics"] = "MODEL: ek core A/B ka kaam baari-baari chala sakta hai; do cores zaroori nahi.\nASLI JAVA PLATFORM THREADS; JVM states, OS scheduler measurement nahi\nbefore start=NEW\nmonitor held by main=BLOCKED\ntimed latch await=TIMED_WAITING\nafter join=TERMINATED\nthread changed parent field=7\nseparate JVM field=0\nJava RUNNABLE mein ready ya CPU par chal raha thread ho sakta hai; alag RUNNING enum nahi.\n";
  OUTPUT["ex1-race"] = "ASLI JAVA THREADS; read barrier jaan-boojhkar lagaya hai\nbroken: expected=2 actual=1\nmutex: expected=2 actual=2\natomic increment: expected=2 actual=2\nreentrant: holds=2 -> 1 -> 0\nother key enters: coarse=false fine=true\nimmutable snapshot unchanged=true\n";
  OUTPUT["ex2-queue"] = "ASLI JAVA THREADS; capacity=2, ek producer C ke liye rukta hai\nbroken unbounded intake: waiting=5 consumer abhi shuru nahi hua\nfull: size=2 producer=WAITING offer(X)=false\nafter take(A): producer resumed; remaining=B,C\nreceived=A,B,C empty poll=null\n";
  OUTPUT["ex3-pool"] = "LOGICAL CONNECTIONS; asli Semaphore, DB/socket nahi\nbroken missing close: permits=1/2\nbroken raw double release: permits=3/2\nborrowed=1,2 permits=0\nthird borrow with 20 ms deadline=timed out\nafter failure + double close: permits=2 free=2\n";
  OUTPUT["ex4-deadlock"] = "ASLI JAVA THREADS; opposite lock order, interruptible cleanup\ndeadlock detected=true; demo threads stopped\nsame lock order: completed=2/2\nMODEL livelock: 4 rounds dono raasta badalte rahe; completed=0\nMODEL starvation: 4 premium jobs chune; normal job waiting=4 rounds\nFinite model trace infinite starvation prove nahi karti; selection rule ko dekho.\n";
  OUTPUT["ex5-workers"] = "ASLI JAVA EXECUTOR; first 2 jobs latch par roke, phir 3 aur bheje\nunbounded: active=2 queued=3 rejected=0 completed=5\nbounded: active=2 queued=2 rejected=1 completed=4\ncheck-then-act: same key, effects=2\natomic per-key claim: requests=4 effects=1 replies=order-1 x4\nsame key different body rejected=true\nBOUNDARY: one JVM, memory only; crash/multi-pod/external charge guarantee nahi.\n";
  OUTPUT["test"] = "24 concurrency behavior checks pass\n";

  function ask(q, choices, reasons, hint) {
    return { q, choices, answer: 0, explain: reasons[0], choiceExplanations: reasons,
      hint: hint || 'Upar ki ginti aur kaam ka kram dobara dekho.' };
  }
  function nodes(labels) {
    return labels.map((label, i) => ({ id: 'n' + i, label, x: 310, y: 80 + i * 175 }));
  }
  function walk(title, labels, vars, steps, lesson) {
    return { type: 'dryrun', title, goal: 'Ek click par ek badlaav. Pehle agla nateeja socho, phir trace dekho.',
      nodes: nodes(labels), edges: [{ from: 'n0', to: 'n1' }, { from: 'n1', to: 'n2' }],
      viz: { w: 620, h: 535, focus: ['n1'] }, vars: vars.map(([id, label]) => ({ id, label })), steps, lesson };
  }
  function cards(title, steps, lesson, code) {
    return { type: 'cards', title, steps, lesson, ...(code ? { code } : {}) };
  }
  function lab(exercise, title, question) {
    return { type: 'docker', title, project: PROJECT, exercise,
      runtimeNote: 'Host par <b>JDK 21+</b> aur Node.js 18+ chahiye. <code>npm install</code> nahi chahiye. Docker optional hai; README mein alag container command hai.',
      goal: 'Lab folder mein command chalao. Pehle broken case ka nateeja likho; phir fixed case aur test compare karo.',
      why: 'Java ke asli threads chalte hain. Neeche captured output bhi hai. Commands chhoti, local aur apne aap band hone wali hain.',
      steps: [
        { text: 'JDK aur compiler ki version dekho; dono 21 ya naye hon.', cmd: 'java -version\njavac -version' },
        { text: 'Broken aur repaired cases ek saath chalao. Sirf last line nahi, dono ka farak dekho.',
          cmd: 'node start.js ' + exercise, expect: OUTPUT[exercise] },
        { text: 'Apne experiment ke baad behavior checks chalao. Lab README mein har file ka build task hai.',
          cmd: 'node start.js test', expect: OUTPUT.test },
      ], observe: question };
  }
  function interview(questions) {
    return { title: 'Apna design samjhao', instructions: 'Scenario ki hadd dekho. Sirf tool ka naam chunna kaafi nahi.', questions };
  }
  function hero(id, title, labels, badges) {
    const ns = nodes(labels);
    VISUALS[id] = { t: title, html: SD.viz.svg(ns, [{ from: 'n0', to: 'n1' }, { from: 'n1', to: 'n2' }],
      { nodes: Object.fromEntries(badges.map((badge, i) => ['n' + i, { tone: i === 1 ? 'slow' : 'acc', badge }])) },
      { w: 620, h: 535 }) };
  }

  SD.tracks.unshift({ id: 'concurrency', icon: '🧵', name: 'Concurrency — khud todo, phir sambhalo',
    blurb: '20 concepts, paanch build–break–fix labs. Ek hi counter, bhari queue, kam connections, atke taale aur duplicate orders. Pehle prediction, phir slow motion, asli Java aur system design ka faisla.',
    certTitle: 'CONCURRENCY KARIGAR', certSub: '20 concepts · 5 build–break–fix labs',
    motto: 'Threads ki ginti se pehle poochho: kaun badlega, kaun rukega, kaun poora hoga?',
    formula: 'Shared state + sahi kram + seemit jagah + useful progress', alwaysUnlocked: true, freeOrder: true });

  const levels = [
    {
      id: 'cc-start', icon: '🧵', group: '🧵 1 · Kaam ka kram', title: 'Concurrency 1 · Ek waqt mein do kaam?', badge: 'Kram Khoji',
      objectives: ['Concurrency aur parallel execution ka farak dekho', 'Process aur thread ki memory boundary samjho', 'Thread ke state ko CPU progress ka proof mat maano'],
      lesson: ['<h3>Ek cook, do orders</h3><p>Asha ki chai ubal rahi hai. Cook chai ka wait karte hue Kabir ka toast banata hai. Dono orders ek hi time window mein aage badhe. Do cooks ek saath kaam karein toh ek aur tarah ka overlap milta hai.</p><p>Is course mein pehle kaam ka kram dikhega. Phir Java ke asli threads aur paanch chhote failure labs milenge.</p>'],
      stages: [
        walk('Ek core par do orders', ['Chai ka order', 'Ek CPU core', 'Toast ka order'], [['a', 'Order A'], ['b', 'Order B'], ['cpu', 'CPU ka kaam']], [
          { title: '1. Dono orders khule hain', say: '<b>Concurrency</b> mein kai tasks ek time window mein progress karte hain. Ek core ready kaam baari-baari chala sakta hai. Is MODEL mein A ko reply ka wait hai; B ka agla step ready hai.', vars: { a: 'Reply ka wait', b: 'Ready', cpu: 'B chala sakta hai' },
            ask: ask('A reply ka wait kar raha hai. Ek core B ka ready step chalaata hai. Kya concurrency hui?',
              ['Haan, dono tasks ka safar ek hi time window mein aage badha.', 'Nahi, dono tasks ko ek hi pal CPU par chalna zaroori tha.', 'Nahi, A ka reply aane tak B ka order shuru nahi ho sakta.'],
              ['Dono tasks ka lifetime overlap karta hai aur dono progress karte hain. Ek core par bhi concurrency ho sakti hai.', 'Ek hi pal execution parallelism ka sawaal hai; concurrency ko do cores nahi chahiye.', 'A ka wait B ke independent ready kaam ko apne aap nahi rokta.']) },
          { title: '2. Ek hi pal ki tasveer', say: '<b>Parallelism</b> mein do tasks sach mein ek hi pal execute karte hain. Is CPU example mein do cores par A aur B ke instructions chal sakte hain. Concurrency mein interleaving bhi ho sakti hai, parallel execution bhi.', vars: { a: 'Core 1 par kaam', b: 'Core 2 par kaam', cpu: 'Do cores ka example' } },
          { title: '3. Ek core ki interleaving', say: 'Trace: A ka ek step → B ka ek step → A ka agla step. Har pal sirf ek step execute hua. Timeline tasks ka kram dikhati hai; real CPU speed ka measurement nahi.', vars: { a: 'Do steps hue', b: 'Ek step hua', cpu: 'Ek core, baari-baari' },
            ask: ask('Is ek-core trace mein A/B baari-baari chale. Trace kya dikhati hai?',
              ['Concurrency dikhi; A aur B ka same-pal execution nahi dikha.', 'Parallel execution dikha; har switch par ek naya core jud gaya.', 'Sirf sequential orders dikhe; A poora hua tabhi B shuru hua.'],
              ['Ek-core model mein interleaving hai. A ke khatam hone se pehle B chala, par same-pal CPU execution nahi hua.', 'Task switch naya core nahi banata. Is model mein ek hi core diya gaya hai.', 'B ka step A ke dono steps ke beech tha; A ka poora order pehle finish nahi hua.']) },
          { title: '4. Zyada threads se do guna speed?', say: 'Agar kaam ek hi locked counter ya ek hi slow database par atka hai, threads badhaane se wait badh sakta hai. CPU work, I/O wait aur shared bottleneck alag dekho.', vars: { cpu: 'Speed abhi naapi nahi' } },
          { title: '5. Progress ka hisaab', say: 'Useful completions, wait aur errors naapna speed ke daave se pehle aata hai. Concurrency scheduling ka mauka deti hai; workload ki capacity alag sawaal hai.',
            ask: ask('Do threads ban gaye. Kya application ab do guna tez hone ka saboot mil gaya?',
              ['Nahi, same useful work ka elapsed time aur bottleneck naapna padega.', 'Haan, har naya thread poore program ki processing capacity jod deta hai.', 'Haan, do threads par shared data ka wait aadha ho jaana tay hai.'],
              ['Thread count speed ka measurement nahi. Same results, workload aur waits ke saath compare karo.', 'Thread CPU core ya downstream capacity nahi banata.', 'Shared resource par contention badh bhi sakta hai; half wait ki guarantee nahi.']) },
        ], 'Concurrency tasks ko overlap kar sakti hai. Parallel execution same-pal kaam hai. Speed workload par naapte hain.'),
        cards('Process, thread aur Java ke states', [
          { title: '1. Memory kiski?', say: '<b>Process</b> ka apna address space hota hai. <b>Threads</b> ek process ke resources aur heap share karte hain; har thread ka apna stack hota hai. Processes IPC ya explicitly shared memory se baat kar sakte hain. Threads ki sharing sasti ho sakti hai, par coordination chahiye.' },
          { title: '2. Parent ka field badla', say: 'Lab mein thread parent ka field 7 karta hai. Alag Java process ka same-named static field 0 se shuru hota hai. Koi shared-memory mechanism configure nahi kiya.',
            ask: ask('Parent ka thread field=7 karta hai. Fresh JVM child ka field=0 kyun hai?',
              ['Thread parent ka heap share karta hai; child process ka field alag hai.', 'Thread ka stack child process ko milta hai; parent ka heap copy nahi hota.', 'Child ko CPU baad mein mila, isliye field 7 pahunchne mein der lagi.'],
              ['Fresh JVM ka address space aur initialized static field alag hai. Ordinary static field automatically shared nahi hota.', 'Thread ka stack child process ke saath share nahi hota; stack/heap ko mix mat karo.', 'Is example mein field replication ka koi mechanism hi nahi. CPU delay se 7 transfer nahi hoga.']) },
          { title: '3. Common model aur Java ka enum', say: 'Common sketch: new → runnable/running → blocked ya waiting → terminated. Java 21 enum alag hai: <code>NEW, RUNNABLE, BLOCKED, WAITING, TIMED_WAITING, TERMINATED</code>. Java mein RUNNING alag enum nahi. RUNNABLE thread CPU par chal bhi sakta hai ya CPU ka wait kar sakta hai.',
            ask: ask('Java getState() RUNNABLE bolta hai. Kis baat ka proof mila?',
              ['Thread runnable state mein hai; isi pal CPU milne ka proof nahi mila.', 'Thread isi pal instructions chala raha hai; CPU ka wait ab khatam hai.', 'Thread shared data ko lock kar chuka hai; doosra thread enter nahi karega.'],
              ['JVM state OS scheduling ki exact tasveer nahi. RUNNABLE ready/executing dono ko cover kar sakta hai.', 'RUNNABLE ko running-on-CPU ka timestamped proof mat bolo.', 'RUNNABLE lock ownership ka signal nahi; ownership alag check hoti hai.']) },
          { title: '4. Blocked ka precise matlab', say: 'Java <code>BLOCKED</code> monitor enter karne ka wait hai. <code>WAITING</code> mein indefinite wait aur <code>TIMED_WAITING</code> mein timed wait aa sakta hai. Har library lock-wait ko Java BLOCKED mat bolo. Lab timed latch par TIMED_WAITING dikhata hai.' },
        ], 'Process isolation aur thread sharing alag hain. JVM state ka naam lock ownership, fairness ya useful progress prove nahi karta.'),
        lab('ex0-basics', 'Local warm-up · states aur memory', ask('Captured run mein monitor par BLOCKED aur latch par TIMED_WAITING mila. Sahi reading?',
          ['Do alag wait reasons dekhe; thread ke naam se CPU usage nahi niklega.', 'Dono states ka matlab thread CPU par continuously kaam kar raha tha.', 'Timed wait ka matlab child process parent ka field share kar raha tha.'],
          ['Monitor wait aur timed latch wait ke state alag hain. Captured run CPU utilization benchmark nahi.', 'Waiting states ka matlab useful CPU execution lagataar chalna nahi.', 'Wait duration aur process memory sharing alag mechanisms hain.'])),
      ],
      interview: interview([
        ask('Ek event loop A ka reply wait karte hue B chalaata hai. Do threads nahi hain. Concurrency?',
          ['Haan, overlapping tasks ko ek thread bhi interleave kar sakta hai.', 'Nahi, concurrency ke liye har task ka apna CPU core chahiye.', 'Nahi, ek thread par ek task poora hone tak doosra shuru nahi hota.'],
          ['Concurrency tasks ke overlapping progress ka concept hai, sirf thread count ka nahi.', 'Multiple cores parallel execution mein madad karte hain; concurrency ka prerequisite nahi.', 'Async/event-loop scheduling tasks ke steps interleave kar sakti hai.']),
        ask('Do processes ne ek database row badli. Alag memory se race apne aap ruk gayi?',
          ['Nahi, database row ab bhi shared resource hai; update guard chahiye.', 'Haan, process ki private memory database ki row ko bhi alag kar deti hai.', 'Haan, processes mein thread sharing nahi, isliye same row badal nahi sakte.'],
          ['Process isolation application heap ko separate karti hai. Database, files aur services shared ho sakte hain.', 'Private address space database ki ek row ki do isolated copies nahi banata.', 'Processes IPC/database APIs se same external state tak pahunch sakte hain.']),
      ]),
      success: ['Concurrency aur parallelism ko timeline se alag kar sakte ho', 'Process/thread memory aur JVM state ki hadd bata sakte ho'],
      homework: 'BasicsLab.java mein timed latch wait dekho. JDK docs se WAITING aur TIMED_WAITING compare karo; state ko CPU benchmark mat bolo.',
      cards: [{ front: 'Concurrency aur parallelism?', back: 'Concurrency: overlapping tasks ka progress. Parallelism: ek hi pal execution. Dono saath bhi ho sakte hain.' }, { front: 'Process aur thread?', back: 'Process ka address space alag; threads same process ka heap share karte hain aur apne stacks rakhte hain.' }, { front: 'Java mein RUNNING?', back: 'Alag enum nahi. RUNNABLE CPU par chalna ya CPU ke liye ready hona cover kar sakta hai.' }],
    },

    {
      id: 'cc-race', icon: '🔢', group: '🔢 2 · Shared state', title: 'Concurrency 2 · Do increments, nateeja ek', badge: 'Counter Rakshak',
      objectives: ['Race condition ko forced interleaving se reproduce karo', 'Mutex, atomic increment aur reentrant lock ka scope samjho', 'Coarse/fine locks aur immutable snapshot ka tradeoff dekho'],
      lesson: ['<h3>Dono cashiers ne 0 padha</h3><p>Do cashiers ek counter par ek-ek order jodte hain. Dono 0 padhkar 1 likhein toh do orders ke baad bhi count 1 rahega. Pehle lost update banao; phir poore read–add–write ko bachao.</p>'],
      stages: [
        walk('Lost update ko ek-ek step mein todo', ['Thread A', 'Shared count', 'Thread B'], [['a', 'A ka local read'], ['count', 'Shared count'], ['b', 'B ka local read']], [
          { title: '1. Shared counter ka rule', say: '<b>Thread</b> process ke andar execution ka ek flow hai. A aur B same <b>shared count</b> badalte hain. <b>Race condition</b> mein result operations ke kram par depend karke galat ho sakta hai. Is trace mein increment teen steps hai: read → add → write.', vars: { a: 'Abhi nahi padha', count: '0', b: 'Abhi nahi padha' } },
          { title: '2. Dono ne read kiya', say: 'Lab ka barrier A aur B dono ko read poora karne deta hai, phir write kholta hai. Dono ke local before mein 0 hai. <code>volatile</code> individual read/write ki visibility deta hai; poora increment ek operation nahi banata.', vars: { a: '0', b: '0' },
            ask: ask('A aur B dono before=0 padh chuke hain. Dono before+1 likhenge. Aakhri count?',
              ['1, kyunki dono apne local 0 se 1 banaakar same counter par likhenge.', '2, kyunki volatile har write se pehle local value ko latest count se jod dega.', '1 ya 2, kyunki write ka order badalne se saved local before bhi badal jaayega.'],
              ['Dono writes value 1 rakhti hain. Ek logical increment lost hua.', 'volatile individual shared reads/writes ki visibility deta hai; saved local before ko refresh karke increment atomic nahi karta.', 'Dono reads barrier se pehle 0 ho chuki hain. Writes ka order local before nahi badalta; dono value 1 likhti hain.']) },
          { title: '3. Bug luck par depend nahi', say: 'Barrier sirf is bad interleaving ko repeatable banata hai. Real requests bhi read aur write ke beech interleave ho sakti hain. Race ke liye same-pal execution zaroori nahi.', vars: { count: '1, expected 2' } },
          { title: '4. Poora critical section bachao', say: '<b>Mutex</b> ek waqt par ek owner ko protected code mein aane deta hai. Read–add–write ka poora hissa <b>critical section</b> hai. Sab writers ko same lock maanna hoga.', vars: { a: 'Lock → 0+1 → unlock', count: '1', b: 'Ab lock lekar 1+1' },
            ask: ask('Sirf final write ko lock kiya, reads pehle ki tarah dono 0 rahe. Bug ruka?',
              ['Nahi, stale local values ab bhi 1 likhengi; poora increment guard karo.', 'Haan, do final writes alag pal par hongi, isliye count 2 ho jaayega.', 'Haan, final write ka lock pehle ho chuke read ko apne aap fresh karega.'],
              ['Protected write akela earlier read ko fresh nahi karta. Read se update tak same lock chahiye.', 'Serialized writes bhi 1 ke baad 1 hi likhengi jab local values stale hain.', 'Lock later lene se code pehle ka read dobara execute nahi karta.']) },
          { title: '5. Finally mein unlock', say: 'Mutex variant poore increment par lock leta hai aur finally mein unlock karta hai. Result 2 hai. <b>Atomic operation</b> apne defined scope mein indivisible update deta hai; <code>AtomicInteger.incrementAndGet()</code> bhi is single counter ko 2 karta hai.', vars: { count: 'Mutex 2 · atomic 2', b: 'Poora hua' },
            ask: ask('Balance aur stock do alag atomic counters hain. Kya dono ka business update ek saath atomic hua?',
              ['Nahi, har counter ka operation atomic hai; joint rule ko alag guard chahiye.', 'Haan, atomic class ke sab objects milkar ek hi transaction bana dete hain.', 'Haan, atomic increment ke beech exception se pehle dono values commit hoti hain.'],
              ['Single-variable atomicity multi-field invariant ya external effect ko transaction nahi banati.', 'Alag atomic objects ek joint transaction automatically nahi banate.', 'Exception, partial work aur cross-resource commit ke liye alag design chahiye.']) },
        ], 'Race same-pal chalne ka naam nahi. Correctness ke liye operation ka scope aur sab writers ka coordination dekho.'),
        cards('Taala kitna bada? Aur kya badalna hi zaroori hai?', [
          { title: '1. Coarse ya fine?', say: '<b>Coarse-grained locking</b>: kai keys ke liye ek bada lock. <b>Fine-grained locking</b>: alag keys ya chhote regions ke locks. Lab mein A ka lock held hai; B ke alag key ka tryLock coarse par fail, fine par pass hota hai. Throughput ka benchmark nahi.',
            ask: ask('Do accounts ki transfer mein fine locks lagaye. Kya sirf chhote locks se design complete hai?',
              ['Nahi, dono accounts ka rule aur locks lene ka consistent order chahiye.', 'Haan, alag locks wale accounts ka combined balance apne aap safe rahega.', 'Haan, do chhote locks lene se ek hi waqt par dono accounts lock hote hain.'],
              ['Per-key locks independent work allow karte hain, par multi-key rule aur acquisition order phir bhi design karne hain.', 'Combined balance ko transfer ke poore update ke scope mein protect karna hoga.', 'Do acquisitions alag operations hain; all-at-once guarantee nahi.']) },
          { title: '2. Same thread phir lock le', say: '<b>Reentrant lock</b> same owner thread ko dobara lock lene deta hai. Hold count 2 par ek unlock ke baad count 1 rahega. Doosra thread tab tak owner nahi banta.',
            ask: ask('Same thread ne lock do baar liya, ek baar chhoda. Doosra thread enter kar sakta hai?',
              ['Nahi, ek hold baaki hai; matching doosra unlock bhi karna padega.', 'Haan, pehla unlock lock ka poora ownership record mita deta hai.', 'Haan, reentrant ka matlab doosre thread ko bhi nested entry milti hai.'],
              ['Reentrancy acquisition count rakhti hai. Har successful lock ke liye matching unlock chahiye.', 'Ek unlock ek hold ghataata hai; saare holds nahi mitaata.', 'Reentrancy same owner ke liye hai, doosre owner ki mutual exclusion nahi hataati.']) },
          { title: '3. Immutable snapshot', say: '<b>Immutability</b> mein object banne ke baad value mutate nahi hoti. Lab <code>List.copyOf</code> se strings ki snapshot leta hai. Source list baad mein badle toh snapshot nahi badalti. Mutable nested objects ki deep copy is API ka promise nahi.',
            ask: ask('Final field mein mutable list ka reference rakha. Kya poori list immutable ho gayi?',
              ['Nahi, reference ko reassign nahi kar sakte; list ke items badal sakte hain.', 'Haan, final reference list aur har nested object ko freeze kar deta hai.', 'Haan, final field milte hi sab concurrent updates automatically reject honge.'],
              ['Reference stability aur object immutability alag hain. Nested values aur publication bhi check karo.', 'final modifier deep freeze nahi karta.', 'List ke mutation methods final reference se automatically disable nahi hote.']) },
          { title: '4. Immutable se kya nahi milta?', say: 'Immutable snapshots sharing ko aasaan banati hain. Nayi snapshot publish karna, do updates ka conflict aur external payment ki deduplication alag rules maangte hain. Atomic operation ko non-preemptible CPU code bhi mat samjho: guarantee observers ko update ke scope ki hai.' },
        ], 'Single counter: atomic increment ya poora mutex section. Multi-field rule: common boundary. Independent keys: finer locks ka measured tradeoff.', CODE.race),
        lab('ex1-race', 'Lab 1 · race banao aur repair karo', ask('Broken=1, mutex=2, atomic=2 mila. Lab ne kya establish kiya?',
          ['Forced lost update reproduce hua; dono repairs ne is counter ke increments bachaye.', 'Mutex aur atomic ki speed barabar hai; do threads par timing ka saboot mil gaya.', 'Har shared-state workflow mein do atomic increments ek transaction ke barabar hain.'],
          ['Count correctness is scenario mein verify hui. Throughput ya multi-field atomicity measure nahi hui.', 'Lab time compare nahi karta; equal final counts equal speed nahi.', 'Independent atomic operations broader transaction automatically nahi banati.'])),
      ],
      interview: interview([
        ask('Single-thread async server mein do requests old stock padhkar await ke baad stock likhti hain. Race?',
          ['Haan, read aur write ke beech requests interleave hokar stock galat kar sakti hain.', 'Nahi, ek CPU thread par requests ka shared stock badalne ka kram fixed rahega.', 'Nahi, await ke baad server pehle request ka local stock doosri request ko dega.'],
          ['Logical race ke liye multiple CPU threads zaroori nahi. Read–await–write ke beech shared state badal sakti hai.', 'Async suspension requests ke logical operations interleave kar sakti hai.', 'Local stale value ko await automatically coordinate ya refresh nahi karta.']),
        ask('Ek global lock se alag customer profiles ki updates wait kar rahi hain. Agla sensible step?',
          ['Contention naapkar per-profile locks socho; multi-profile rules aur order bhi rakho.', 'Har statement ka alag lock banao; combined update ke rules baad mein dekh lenge.', 'Locks hataakar final references rakho; profile ki mutable fields safe ho jaayengi.'],
          ['Finer scope independent work help kar sakta hai; complexity aur multi-key invariants ka cost bhi hai.', 'Statements ke beech interleaving combined update ko tod sakti hai.', 'final reference mutable fields ko thread-safe nahi banaata.']),
      ]),
      success: ['Lost update ko bina timing luck reproduce kar sakte ho', 'Atomicity, lock scope aur immutability ki boundary bata sakte ho'],
      homework: 'RaceLab.java mein ek naya fixed method khud banao. Broken baseline rakho. Sirf write par lock lagaakar pehle failure dekho; phir read–add–write guard karo.',
      cards: [{ front: 'Atomic increment kya bachata hai?', back: 'Us counter ka one-step update; do counters ka joint business rule nahi.' }, { front: 'Coarse ya fine?', back: 'Bada lock simple par unrelated work rok sakta hai. Fine locks independent work allow karte hain; ordering aur invariants mushkil ho sakte hain.' }, { front: 'Reentrant ka owner?', back: 'Same thread dobara acquire kar sakta hai. Har acquire ka matching unlock chahiye.' }, { front: 'Immutable ka matlab final reference?', back: 'Nahi. Object aur nested values ki mutability alag dekho; safe publication bhi matter karti hai.' }],
    },
    {
      id: 'cc-queue', icon: '📦', group: '📦 3 · Kaam ki line', title: 'Concurrency 3 · Queue bhari, producer kahan?', badge: 'Queue Sambhalak',
      objectives: ['Producer–consumer buffer khud banao', 'Condition variable ke saath predicate dobara check karo', 'Capacity wait, nonwaiting API aur backpressure ka farak dekho'],
      lesson: ['<h3>Do shelf slots, teesra parcel</h3><p>Producer parcel banata hai. Consumer parcel uthata hai. Beech ki shelf queue hai. Shelf ki do jagah bhar gayi toh teesra parcel kahan jaayega? Pehle policy chuno; phir code likho.</p>'],
      stages: [
        walk('Capacity 2: A, B aur pending C', ['Producer', 'Queue: 2 slots', 'Consumer'], [['queue', 'Shelf ka haal'], ['producer', 'Producer'], ['consumer', 'Consumer']], [
          { title: '1. Kaun banata, kaun uthata?', say: '<b>Producer</b> kaam banaata hai; <b>consumer</b> kaam process karta hai. Beech ki queue ka size bina hadd badh sakta hai. Broken run mein consumer shuru hone se pehle paanch items add hue; queue mein 5 items hain.', vars: { queue: 'Broken: 5 items', producer: '5 add kiye', consumer: 'Abhi shuru nahi' } },
          { title: '2. Bounded buffer', say: '<b>Bounded</b> queue ki capacity tay hai. Fixed buffer ki capacity 2 hai: A aur B dono andar. <b>Blocking put(C)</b> calling thread ko jagah milne tak wait karata hai. Is demo mein sirf ek producer wait karta hai.', vars: { queue: 'A, B · 2/2', producer: 'put(C) ka wait', consumer: 'A utha sakta hai' },
            ask: ask('A/B dono slots mein hain. Producer put(C) par ruka hai. C abhi kahan hai?',
              ['Producer ke pending call mein hai; queue ke andar abhi A aur B hain.', 'Queue ke teesre slot mein hai; blocked producer extra slot bana deta hai.', 'Consumer C process kar chuka hai; put ka wait sirf reply likhne ka hai.'],
              ['Capacity 2 hai. C insert hone se pehle producer wait karta hai.', 'Blocked producer queue ki capacity nahi badhaata.', 'Consumer ne C liya hi nahi; pending admission completion nahi.']) },
          { title: '3. Condition variable ka kaam', say: '<b>Mutex lock</b> queue bookkeeping ko ek owner deta hai. <b>Condition variable</b> waiter ko sleep aur wake ka mechanism deti hai. <code>await()</code> queue lock chhodta hai; return se pehle queue ka lock dobara leta hai. Full hone par producer <code>while</code> mein check karta hai.' },
          { title: '4. Signal, par jagah nahi', say: 'Test jaan-boojhkar full queue par signal bhejta hai. Jagah ab bhi 0 hai. Signal condition true hone ka certificate nahi: doosra thread slot le sakta hai ya wake bina useful change ke aa sakta hai.',
            ask: ask('Full queue par signal aaya, lock dobara mila, par size ab bhi 2 hai. Producer kya kare?',
              ['Size dobara check karke wait kare; C insert karne ki jagah abhi nahi.', 'Signal mil gaya toh C add kare; signal queue ki capacity reserve karta hai.', 'Size 2 hote hue B hataakar C daale; await ka matlab purana item replace hai.'],
              ['Predicate ko while mein check karo. Wake-up ka matlab slot reservation nahi.', 'Condition signal permission token nahi; protected state ko dobara padhna padta hai.', 'Is buffer ki policy lossless wait hai, drop-oldest nahi. Signal policy nahi badalta.']) },
          { title: '5. Consumer A uthata hai', say: '<code>take()</code> A hataata hai, phir notFull ko signal karta hai. Producer lock lekar C add karta hai. Queue B,C hai. Consumer ko A,B,C same order mein milte hain.', vars: { queue: 'B, C · 2/2', producer: 'C add hua', consumer: 'A mila' } },
          { title: '6. Backpressure ki boundary', say: '<b>Backpressure</b> intake ko consumer ki capacity ka signal deta hai. Is bounded producer ko wait milta hai, isliye producer aur kaam nahi banaata. Hazaar independent HTTP handlers ko wait karaao toh queue ke bahar pending calls ki memory badh sakti hai.',
            ask: ask('Queue capacity 2 hai, par har nayi request alag handler banaakar put par wait karti hai. Total memory bounded?',
              ['Nahi, queued items bounded hain; pending handlers ki ginti bhi bound karo.', 'Haan, queue ki do slots process ke saare pending calls ko bhi limit karti hain.', 'Haan, await par rukte hi handler ki request aur payload memory se hat jaate hain.'],
              ['Queue slots ke bahar bhi requests, stacks aur payloads memory rakh sakte hain. Admission/deadline policy chahiye.', 'Queue capacity process-wide request count ka automatic guard nahi.', 'Waiting pending work ka state/payload apne aap free nahi karta.']) },
        ], 'Bounded queue ke saath producers, waiters aur overload policy bhi bound karo. Signal ke baad predicate dobara check karo.'),
        cards('Put, offer, take, poll', [
          { title: '1. Wait karna ya abhi jawab?', say: '<code>put</code> full queue par capacity ka wait karta hai. <code>offer</code> capacity ka wait kiye bina false de sakta hai. <code>take</code> empty queue par data ka wait karta hai; <code>poll</code> empty queue par null deta hai. False/null ke baad caller ko policy chahiye.',
            ask: ask('Full queue par offer(C)=false mila. C kaam ka kya haal hai?',
              ['C accept nahi hua; caller reject, baad mein try ya doosra route chune.', 'C accept hua; false sirf consumer ko abhi jagane ka signal deta hai.', 'C pending waiter ban gaya; caller ko dobara kuch karna nahi padega.'],
              ['Is queue ki offer implementation false par item add nahi karti. Caller outcome handle kare.', 'Node stream write(false) se is queue ki offer(false) ka contract alag hai.', 'offer capacity wait register nahi karta. false ko pending success mat samjho.']) },
          { title: '2. Non-blocking ka kaunsa meaning?', say: 'API sense mein non-blocking ya nonwaiting call data/capacity ke liye nahi rukti. Is lab ki offer/poll phir bhi short bookkeeping lock leti hain. Formal <b>lock-free</b> progress guarantee alag concept hai; immediate capacity result se lock-free algorithm prove nahi hota.',
            ask: ask('Offer capacity ka wait nahi karta, par bookkeeping lock leta hai. Kya algorithm lock-free hai?',
              ['Nahi, capacity ka wait na karna lock-free progress ka proof nahi hai.', 'Haan, false return karne wali har queue formal lock-free hoti hai.', 'Haan, short lock ka wait CPU scheduling se alag hota hai, isliye lock nahi ginta.'],
              ['API wait policy aur algorithm ki progress guarantee ko alag naam do.', 'Return value alone algorithm ki synchronization aur progress nahi bataati.', 'Short critical section ka lock bhi lock hai aur contend ho sakta hai.']) },
          { title: '3. Blocking wait vs busy retry', say: 'Sleeping wait calling thread ko useful CPU work se rokta hai, par spin loop ki tarah lagataar retry nahi karta. Nonwaiting offer ko tight loop mein chalaoge toh CPU waste ho sakta hai. Deadline, cancellation aur retry budget chuno.' },
          { title: '4. Khud todkar dekho', say: '<code>Buffer.put</code> ke while ko if karo. Behavior test full queue par signal bhejega; wrong insertion ya stuck wait ko pakdega. Phir while restore karo. Production mein standard tested queue ko pehle consider karo.' },
        ], 'Backpressure drop/reject se alag policy ho sakti hai. Har caller ko admission outcome samajhna chahiye.', CODE.queue),
        lab('ex2-queue', 'Lab 2 · producer–consumer buffer banao', ask('Queue ka trace A,B,C deta hai aur full par offer(X)=false hai. Kya X process hua?',
          ['Nahi, X reject hua; C ne capacity ka wait kiya aur baad mein add hua.', 'Haan, false capacity warning hai; X queue mein hai aur consumer baad mein lega.', 'Nahi, X pending hai; jagah milne par queue X ko khud add karke consumer ko degi.'],
          ['offer(X) admission fail hua; put(C) ka contract alag hai. FIFO output A,B,C hai.', 'Is buffer ki offer false par X accept nahi karti. False-as-warning doosri APIs ka contract ho sakta hai.', 'offer pending wait register nahi karta; automatic later admission ka promise nahi.'])),
      ],
      interview: interview([
        ask('Signal ke baad condition while mein kyun check karni chahiye?',
          ['Wake tak state badal sakti hai; signal akela item ya slot reserve nahi karta.', 'While har wake par capacity badhaata hai; if mein queue ka size fixed rehta hai.', 'While consumer ko producer se zyada CPU deta hai; if se order ulta ho jaata hai.'],
          ['Wake-up ko condition true rehne ka proof mat maano. State ko lock ke andar check karo.', 'while syntax queue capacity nahi badalti; predicate recheck hota hai.', 'Loop syntax scheduler ki CPU fairness ya FIFO guarantee nahi banati.']),
        ask('Consumer baar-baar empty poll karta hai aur CPU badh raha hai. Kaunsa change fit hai?',
          ['Data aane ka blocking wait ya notification use karo; cancellation bhi rakho.', 'Poll ko aur threads mein chalao; empty queue se useful items jaldi milenge.', 'Queue ki capacity badhao; empty queue ka tight retry loop apne aap rukega.'],
          ['Idle wait ko signal/data se wake karo; shutdown/deadline par unblock karne ka path chahiye.', 'Empty queue par more pollers useful work create nahi karte.', 'Capacity badalne se no-data busy loop ka policy nahi badalta.']),
      ]),
      success: ['Bounded FIFO aur condition recheck implement kar sakte ho', 'Nonwaiting API ko formal lock-free guarantee se alag rakh sakte ho'],
      homework: 'QueueLab.Buffer ko pehle paper par put/take rules se banao. while→if experiment chalao, phir restore karo. README ke test se false offer aur interrupted wait verify karo.',
      cards: [{ front: 'Signal ka matlab condition true?', back: 'Nahi. Same lock dobara lekar predicate while mein check karo.' }, { front: 'Queue bounded toh process memory bounded?', back: 'Nahi. Pending producers, request handlers aur payloads ki alag limits chahiye.' }, { front: 'Offer false ka matlab?', back: 'Is buffer mein item accept nahi hua. Caller overload policy handle kare.' }, { front: 'Nonwaiting aur lock-free?', back: 'Capacity/data ka wait nahi aur formal progress guarantee alag claims hain.' }],
    },
    {
      id: 'cc-pool', icon: '🔌', group: '🔌 4 · Limited resources', title: 'Concurrency 4 · Do connections, teesra caller', badge: 'Permit Paalak',
      objectives: ['Semaphore se capacity 2 enforce karo', 'Permit aur actual connection alag track karo', 'Failure, timeout aur duplicate close par capacity conserve karo'],
      lesson: ['<h3>Do chabiyan, teen customers</h3><p>Do rooms hain aur do chabiyan hain. Teesra customer wait kare ya deadline par laut jaaye. Sirf chabiyon ki ginti room ko assign nahi karti; room ka ID aur return bhi track karna hoga.</p><p>Lab logical connection IDs use karta hai. Java synchronization asli hai; database connection nahi khulta.</p>'],
      stages: [
        walk('Pool capacity 2', ['Caller A/B', '2 connection IDs', 'Caller C'], [['free', 'Free connections'], ['permits', 'Available permits'], ['c', 'Caller C']], [
          { title: '1. Mutex aur semaphore', say: '<b>Mutex</b> protected code ka ek owner rakhta hai. <b>Semaphore</b> available permits ginta hai: acquire par ek kam, release par ek zyada. Capacity 2 ke liye shuru mein 2 permits hain. Java semaphore ownership record nahi rakhta.', vars: { free: 'ID 1, ID 2', permits: '2', c: 'Abhi nahi aaya' } },
          { title: '2. Do borrowers andar', say: 'A permit aur ID 1 leta hai. B permit aur ID 2 leta hai. Permit capacity ka gate hai; free-ID structure alag hai aur thread-safe hona chahiye.', vars: { free: 'Koi nahi', permits: '0', c: '20 ms tak wait karega' },
            ask: ask('C ne 20 ms deadline ke saath borrow kiya. Dono leases held rahin. C ko kya milega?',
              ['Timeout ka result; capacity 2 hai aur koi connection return nahi hua.', 'Naya ID 3; timed borrow capacity ki limit ko temporarily badha deta hai.', 'ID 1 ki shared copy; semaphore ek connection ko do callers ko de sakta hai.'],
              ['Available permit nahi mila toh borrow null deta hai. Actual scheduling delay exact 20 ms hone ka promise nahi.', 'Timed wait extra connection ya permit create nahi karta.', 'Is pool mein leased ID free list se nikalta hai; same active ID dobara nahi milta.']) },
          { title: '3. Query fail ho gayi', say: 'A ka query code exception throw karta hai. <code>try-with-resources</code> lease close karta hai. Close ID ko free list mein daalta hai, phir permit release karta hai. Permit pehle release karoge toh doosra caller ID se pehle gate paar kar sakta hai.', vars: { free: 'ID 1 wapas', permits: '1', c: 'Ab borrow kar sakta hai' },
            ask: ask('Query failure par close chhoot gaya. Fixed-capacity pool mein kya ghat sakta hai?',
              ['Free capacity leak hogi; agle borrowers unused resource ke bawajood wait karenge.', 'Semaphore query ka exception dekhkar permit automatically release kar dega.', 'Resource leak nahi hoga; method se return hote hi lease ka gate khul jaata hai.'],
              ['Semaphore ko failure ka automatic pata nahi. Cleanup path resource aur permit dono return kare.', 'Semaphore query code ka lifecycle inspect nahi karta.', 'Ordinary return ya exception explicit/structured close ka replacement nahi.']) },
          { title: '4. Do baar return?', say: 'Raw Java semaphore par extra release available count badha sakta hai. Lab ek acquisition ke baad do releases se 3/2 dikhata hai. Fixed <b>lease</b> resource ka temporary handle hai; close ka atomic once-only guard duplicate return rokta hai.', vars: { permits: 'Broken raw release: 3/2', free: 'Fixed lease: har ID ek baar', c: 'Duplicate return reject' },
            ask: ask('Lease close do baar call hua. Pool ka sahi result kya rehna chahiye?',
              ['ID aur permit ek hi baar wapas aayein; total capacity 2 hi rahe.', 'ID ek baar aur permit do baar aaye; semaphore extra callers sambhaal lega.', 'Permit ek baar aur ID do baar aaye; free-list count speed improve karega.'],
              ['Resource aur permit ki conservation saath chahiye. close idempotent rakho.', 'Extra permit borrower ko nonexistent/free-na-hua resource tak le ja sakta hai.', 'Duplicate ID se same connection do borrowers ko mil sakta hai.']) },
          { title: '5. Fixed result', say: 'Failure aur duplicate close ke baad fixed pool mein permits=2 aur free IDs=2 milte hain. Concurrent test chhe callers chalakar peak borrowed=2 aur end capacity=2 verify karta hai.', vars: { permits: '2', free: '2 unique IDs', c: 'Policy ke mutabik result' } },
        ], 'Semaphore capacity ginta hai; resource assignment, validation aur cleanup ka design alag chahiye.'),
        cards('Semaphore pool ka contract', [
          { title: '1. Wait karte hue pool lock?', say: 'Resource return karne wale code ko global pool lock chahiye. Borrower global lock pakadkar permit ka wait karega toh return path ruk sakta hai. Lab thread-safe free list use karta hai aur permit wait ke dauraan list ka lock hold nahi karta.',
            ask: ask('Borrower global pool lock pakadkar permit ka wait kare, returner ko global pool lock chahiye. Risk?',
              ['Returner capacity wapas nahi kar paayega; lock hold karke wait cycle ban sakti hai.', 'Koi risk nahi; permit ka wait global bookkeeping lock ko khud chhod deta hai.', 'Sirf caller ki speed badhegi; lock pakadne se free connections tay ho jaate hain.'],
              ['Wait dependency ko trace karo: borrower ko permit, returner ko borrower ka lock chahiye.', 'Semaphore acquire arbitrary application lock ko release nahi karta.', 'Lock resource create nahi karta; return path ko block karna progress rok sakta hai.']) },
          { title: '2. Fair semaphore ka scope', say: 'Lab <code>new Semaphore(2, true)</code> use karta hai. Fair acquisition ki ordering API ke internal arrival points par apply hoti hai. Scheduler ko har caller ko turant CPU dene ki guarantee nahi. Untimed tryAcquire ka fairness contract bhi alag hai.' },
          { title: '3. Connection sach mein healthy?', say: 'Permit free hona connection ki health ka proof nahi. Real database pool ko connection validation, broken connection replacement, borrow deadline aur query deadline alag handle karne padte hain.',
            ask: ask('Permit mil gaya, par database socket toot chuka hai. Semaphore kya establish karta hai?',
              ['Sirf local capacity admission hua; connection health alag validate karni hai.', 'Database healthy hai; successful acquire remote connection par ping karta hai.', 'Query safe hai; permit lene se database transaction automatically commit hoti hai.'],
              ['Semaphore ka state local count hai, remote DB health nahi.', 'Generic semaphore network health check nahi karta.', 'Permit transaction boundary ya success acknowledgment nahi.']) },
          { title: '4. Khud build karo', say: 'PoolLab.java mein pehle borrow/close ko paper par likho. Failure ko lease ke andar throw karo aur counts dekho. close ka once-only guard hataoge toh duplicate ID/permit test fail hona chahiye; guard restore karo.' },
        ], 'Capacity, health aur ownership alag cheezein hain. Cleanup failure paths par bhi verify karo.', CODE.pool),
        lab('ex3-pool', 'Lab 3 · semaphore connection pool banao', ask('Raw double release 3/2 dikhata hai, fixed lease ke baad permits=2/free=2. Repair kya hai?',
          ['Once-only close resource aur permit dono ko exactly ek baar return karta hai.', 'Fair semaphore apne aap count 3 ko 2 karta hai; lease guard zaroori nahi.', 'Semaphore count ki jagah free-list count print karne se leak fix ho gaya.'],
          ['Raw semaphore maximum-capacity invariant enforce nahi karta. Lease cleanup guard duplicate return rokta hai.', 'Fairness waiting order ke baare mein hai, over-release count repair ke baare mein nahi.', 'Wrong metric chhupaana repair nahi; actual ID aur permit conservation check hui.'])),
      ],
      interview: interview([
        ask('Chaar pods par har pod ka connection semaphore 10 hai. Database ke liye global cap 10 mila?',
          ['Nahi, local limits milkar 40 connections allow kar sakti hain; global budget baanto.', 'Haan, semaphore ka count 10 sab processes ke beech automatically share hota hai.', 'Haan, database ke connection IDs alag hone se total limit 10 bani rehti hai.'],
          ['Process-local semaphore fleet-wide counter nahi. Pods, replicas aur DB budget ko include karo.', 'Ordinary in-JVM semaphore doosre processes ko coordinate nahi karta.', 'Unique IDs resource count ka global cap nahi banaate.']),
        ask('Pool borrow timeout aur query timeout ko ek hi cheez maano?',
          ['Nahi, pehla connection paane ka wait hai; doosra query work ki deadline hai.', 'Haan, borrow ka timer query ke end tak permit ka wait ginta rehta hai.', 'Haan, query timer connection ki free-list aur semaphore count reset kar deta hai.'],
          ['Waiting for admission aur executing operation alag phases hain; end-to-end deadline budget baanto.', 'Is borrow API ka wait acquire par khatam hota hai, query ke end par nahi.', 'Query timeout generic pool state ko reset karne ka protocol nahi.']),
      ]),
      success: ['Semaphore aur free-ID list se small pool bana sakte ho', 'Failure aur duplicate close par capacity wapas verify kar sakte ho'],
      homework: 'Logical pool ko database benchmark mat bolo. Pehle close ka duplicate guard hataakar test failure dekho. Restore karke chhe simultaneous borrowers ka peak aur end counts check karo.',
      cards: [{ front: 'Semaphore kya ginta hai?', back: 'Permits. Connection IDs, health aur ownership ka alag design chahiye.' }, { front: 'Extra release safe?', back: 'Generic Java semaphore upper resource limit enforce nahi karta. Lease ka once-only return guard rakho.' }, { front: 'Fair semaphore aur CPU fairness?', back: 'Acquisition ordering scheduler ko turant CPU dene ki guarantee nahi.' }, { front: 'Local cap global cap?', back: 'Nahi. Har process ka cap fleet ke total resource budget mein add hota hai.' }],
    },
    {
      id: 'cc-stuck', icon: '🔒', group: '🔒 5 · Useful progress', title: 'Concurrency 5 · Dono zinda, kaam kyun band?', badge: 'Progress Pehredaar',
      objectives: ['Jaan-boojhkar deadlock banao aur detect karo', 'Deadlock, livelock aur starvation ko progress se alag karo', 'Lock order, bounded retry aur fairness ka sahi scope chuno'],
      lesson: ['<h3>Stock ki chabi aur wallet ki chabi</h3><p>Asha stock ka taala pakadkar wallet ka wait karti hai. Kabir wallet ka taala pakadkar stock ka wait karta hai. Dono ka process zinda hai, par koi order poora nahi hota.</p><p>Lab apne Java threads ki wait cycle detect karke interruptible cleanup karta hai. Asli production deadlock apne aap recover hone ka promise nahi.</p>'],
      stages: [
        walk('Opposite lock order ka wait cycle', ['Thread A', 'Stock / wallet locks', 'Thread B'], [['a', 'Thread A'], ['b', 'Thread B'], ['done', 'Orders complete']], [
          { title: '1. Do protected resources', say: '<b>Lock</b> protected resource ka ek owner rakhta hai. <b>Deadlock</b> mein tasks ek wait cycle mein phans jaate hain. Lab ke do platform threads stock aur wallet ke <b>ReentrantLock</b> lete hain; same owner dobara lock le sakta hai, doosra owner nahi.', vars: { a: 'Stock le liya', b: 'Wallet le liya', done: '0/2' } },
          { title: '2. Barrier ke baad doosra lock', say: 'Barrier dono threads ko pehla lock hold karne tak rokta hai. Ab A wallet maangta hai; B stock maangta hai. A ko B ka lock chahiye aur B ko A ka lock.', vars: { a: 'Stock held → wallet wait', b: 'Wallet held → stock wait' },
            ask: ask('A stock hold karke wallet wait kare, B wallet hold karke stock wait kare. Progress?',
              ['Dono wait cycle mein phanse hain; lock release ka normal path nahi pahunchta.', 'A ka reentrant lock B ko bhi enter dega; dono updates saath finish honge.', 'Do locks hain isliye do cores dene par dono missing locks mil jaayenge.'],
              ['Har task ko doosre ka held resource chahiye. CPU available hona missing ownership ko solve nahi karta.', 'Reentrancy same thread ke liye hai; doosre owner ko entry nahi deti.', 'CPU cores lock ownership release nahi karte; dependency cycle bani rehti hai.']) },
          { title: '3. Real detector, bounded cleanup', say: 'Java ThreadMXBean is demo ke dono thread IDs ko deadlock report mein dhoondhta hai. Demo <code>lockInterruptibly()</code> use karta hai, phir dono threads interrupt karta hai. finally acquired locks chhodta hai. Plain <code>lock()</code> ko interrupt karna aisa escape guarantee nahi deta.',
            ask: ask('Demo interrupt se band hua. Kya production ka plain lock() deadlock bhi isi tarah cure hoga?',
              ['Nahi, demo interruptible acquisition aur finally cleanup par depend karta hai.', 'Haan, Thread.interrupt kisi bhi held lock ko owner se zabardasti chheen leta hai.', 'Haan, deadlock detector Java ke sab locks ko automatically unlock kar deta hai.'],
              ['Interrupt cooperative mechanism hai. Wait API aur cleanup behavior dekhna zaroori hai.', 'interrupt arbitrary locks ko forcibly release nahi karta.', 'ThreadMXBean detection report karta hai; application cleanup ka replacement nahi.']) },
          { title: '4. Same order ka repair', say: 'Fixed variant har path par pehle stock, phir wallet leta hai. Barrier locks ke beech nahi rakha. Ek thread wait kar sakta hai, par opposite-order cycle nahi banegi.', vars: { a: 'Stock → wallet → release', b: 'Stock → wallet → release', done: '2/2 in fixed run' } },
          { title: '5. Fine locks ki checklist', say: 'Multi-resource updates mein lock order ek jagah define karo. Pehle lock hold karke unknown callback ya slow network call karoge toh naye waits jud sakte hain. Har participating path ka order verify karo.',
            ask: ask('Do transfer paths stock→wallet use karte hain, teesra wallet→stock. Repair complete?',
              ['Nahi, teesra path opposite cycle phir bana sakta hai; sab paths same order lein.', 'Haan, do sahi paths teesre path ka lock order runtime par badal denge.', 'Haan, third path ko fair lock dene se opposite order ki dependency mit jaayegi.'],
              ['Order rule tab kaam karega jab saare relevant acquisition paths rule follow karein.', 'Ek path ka code doosre path ka acquisition order rewrite nahi karta.', 'Fair waiting order resource dependency cycle ko break nahi karti.']) },
          { title: '6. Zinda thread, useful result?', say: 'CPU, heartbeat aur alive count akela progress nahi dikhata. Completed jobs, oldest pending age aur waits ka evidence rakho. Is lab ne counts aur lock cycle verify ki; production performance benchmark nahi kiya.' },
        ], 'Deadlock ka repair resource dependency ko badalta hai. Sirf aur threads ya CPU badhaana wait cycle nahi hataata.'),
        cards('Deadlock, livelock, starvation', [
          { title: '1. Dono raasta badalte rahe', say: '<b>Livelock</b>: tasks active rehte hain, par useful work nahi hota. MODEL: har round A/B same side choose karte hain, clash dekhkar dono side badalte hain. Chaar rounds baad moves hue, completions 0. Waiting deadlock aur active livelock alag hain.',
            ask: ask('Dono workers har clash par ek saath same side badalte rahe; kaam 0. Kaunsa pattern?',
              ['Livelock: reactions chal rahi hain, par useful completion nahi ho rahi.', 'Deadlock: dono workers ek held lock par bina koi state badle so rahe hain.', 'Healthy progress: har side change ek completed business operation gina jaayega.'],
              ['Active retries/reactions progress ki guarantee nahi. Same synchronized reaction no-work cycle bana sakti hai.', 'Is trace mein workers state badal rahe hain; indefinitely blocked lock wait nahi.', 'Attempt ya movement business completion nahi. Useful result ka metric alag rakho.']) },
          { title: '2. Priority se ek job bahar', say: '<b>Starvation</b>: doosre tasks progress karte hain, par ek task ko CPU, lock ya service baar-baar nahi milti. MODEL ki selection rule naya premium job aate hi normal job ko chhod deti hai. Chaar rounds ka wait infinite starvation ka proof nahi; endless premium arrivals par rule ka risk dekho.',
            ask: ask('Premium jobs finish hoti rahi, normal job baar-baar nahi chuni gayi. Kaunsa risk?',
              ['Starvation: system progress karta hai, par ek task ko service nahi mil rahi.', 'Deadlock: premium aur normal dono queues mein ek bhi task finish nahi hua.', 'Livelock: premium jobs bhi sirf state badal rahi hain, koi useful work nahi hua.'],
              ['Progress ko per-task/per-tenant bhi dekho. Aggregate throughput unlucky task ka wait chhupa sakta hai.', 'Premium completions diye gaye hain; total no-progress deadlock ka trace nahi.', 'Premium useful work finish ho raha hai; no-work reactions wali livelock trace nahi.']) },
          { title: '3. Fairness aur retry limits', say: 'Queued fairness ya aging waiting tasks ko chance de sakti hai. <b>Aging</b> mein purane task ki priority badhti hai. Livelock ke retry budget aur independent delay symmetry todne mein madad kar sakte hain, par completion ki universal guarantee nahi.',
            ask: ask('CPU high hai, retries high hain, completions 0. Pehla useful investigation?',
              ['Retry/state trace aur completion dekho; active no-work cycle ko check karo.', 'Thread count badhao; high CPU par aur retries missing capacity ko fill karengi.', 'Sirf alive count dekho; zinda workers ka matlab useful work finish ho raha hai.'],
              ['Busy hona progress nahi. Attempts, waits aur useful completions ka relation inspect karo.', 'More competing retries overload/livelock ko aur badha sakti hain.', 'Alive/heartbeat progress invariant ka replacement nahi.']) },
          { title: '4. Khud break–fix karo', say: 'DeadlockLab.ordered mein ek path ka order ulta karke thread joins ka timeout dekho; daemon/process guard ko mat hatao. Fixed version mein same total order restore karo. Model se scheduler ki real fairness benchmark claim mat karo.' },
        ], 'Deadlock: wait cycle. Livelock: active no-work cycle. Starvation: baaki tasks aage, ek task denied. Alag cause ke liye alag repair.', CODE.deadlock),
        lab('ex4-deadlock', 'Lab 4 · deadlock banao, detect karo, saaf karo', ask('Detector ne do demo thread IDs dekhe; fixed same-order run 2/2 complete hua. Kya prove hua?',
          ['Is opposite-order deadlock ko reproduce kiya; same-order case ne dono jobs finish kiye.', 'Java har deadlock ko detect karke application ke business changes rollback karta hai.', 'Do jobs complete hui, isliye scheduler ki har future task ko fair service milti rahegi.'],
          ['Demo ki controlled schedule aur cleanup verify hui. Result ko arbitrary production recovery guarantee mat banao.', 'Detection, lock cleanup aur business rollback alag operations hain.', 'Finite completions har future task ki fairness ka proof nahi.'])),
      ],
      interview: interview([
        ask('Fair lock laga diya, par A/B opposite order se do resources lete hain. Deadlock risk?',
          ['Risk baaki hai; fairness wait order ko badalti hai, resource cycle ko nahi.', 'Risk khatam; fair lock dono resources ka ownership ek hi thread ko de deta hai.', 'Risk khatam; fair lock pehla held resource wait shuru hote hi release kar deta hai.'],
          ['Consistent resource acquisition order ya doosri cycle-breaking policy chahiye.', 'Per-lock fairness multi-lock all-at-once acquisition nahi banaati.', 'Fair lock arbitrary held resources automatically release nahi karta.']),
        ask('Total throughput theek, ek tenant ka oldest wait badhta jaa raha hai. Kya investigate karoge?',
          ['Per-tenant queueing aur selection rule dekho; starvation aggregate mein chhup sakti hai.', 'Sirf total completions rakho; aggregate healthy ho toh har tenant ko chance milta hai.', 'Global CPU badhao; purane tenant ka wait CPU availability se hi decide hota hai.'],
          ['Aggregate average individual denial chhupa sakta hai. Fairness, aging aur tenant budgets dekho.', 'Useful work kisi aur tenant ka ho sakta hai; total count individual progress nahi.', 'Priority/admission/lock policy bhi denial ka cause ho sakti hai.']),
      ]),
      success: ['Deadlock ko bounded local demo mein reproduce/detect kar sakte ho', 'No progress ke teen patterns se alag diagnosis nikaal sakte ho'],
      homework: 'Do tasks ke wait-for arrows khud banao. Opposite order aur fixed order compare karo. Livelock model mein same reaction rule aur starvation model mein endless-priority assumption likho.',
      cards: [{ front: 'Deadlock?', back: 'Tasks held resources ke wait cycle mein hain; normal release path nahi pahunchta.' }, { front: 'Livelock?', back: 'Tasks react kar rahe hain, par useful work finish nahi hota.' }, { front: 'Starvation?', back: 'Doosre tasks progress karte hain, ek task ko service baar-baar nahi milti.' }, { front: 'Fairness se deadlock cure?', back: 'Nahi. Wait order aur resource dependency cycle alag design questions hain.' }],
    },
    {
      id: 'cc-workers', icon: '🏭', group: '🏭 6 · Kaam admit aur dedupe karo', title: 'Concurrency 6 · Do workers, do waiting slots', badge: 'Worker Nirmata',
      objectives: ['Thread pool ki worker aur queue limits alag set karo', 'Full executor ka rejection caller tak pahunchao', 'Concurrent duplicate key par local effect ek baar karo'],
      lesson: ['<h3>Do cooks, par wait-list kitni?</h3><p>Har order par naya cook rakhna zaroori nahi. Do cooks reuse kar sakte hain. Par waiting orders ki list bina hadd badhegi toh sirf cook count limit karna kaafi nahi.</p><p>Phir ek aur bug: same payment request do workers ko mil gayi. Pool limit duplicate effect ko nahi rokta.</p>'],
      stages: [
        walk('2 workers + 2 waiting slots', ['Submitter', '2 workers / 2 slots', 'Caller ka outcome'], [['active', 'Active jobs'], ['waiting', 'Waiting jobs'], ['outcome', 'Latest admission']], [
          { title: '1. Worker reuse', say: '<b>Thread pool</b> workers ko tasks ke liye reuse karta hai. Java executor mein current/max workers aur waiting queue alag settings hain. Is lab mein workers fixed 2 hain. Tasks ko latch par rok kar waiting count repeatably dekhenge.', vars: { active: '0/2', waiting: '0', outcome: 'Abhi koi job nahi' } },
          { title: '2. Jobs 1/2 active', say: 'Do jobs active ho gayi aur latch par wait kar rahi hain. Agli jobs worker milne tak queue mein rahengi. <b>Unbounded queue</b> mein lab ki teen extra jobs teeno accept hoti hain.', vars: { active: '2/2', waiting: 'Unbounded: 3', outcome: '5/5 accepted' } },
          { title: '3. Bounded executor', say: '<b>Bounded queue</b> ki capacity 2 karo. Jobs 3 aur 4 wait karengi. Java <b>AbortPolicy</b> full executor par rejection exception caller ko deti hai. Job 5 accept nahi hui.', vars: { waiting: 'Bounded: 2/2', outcome: 'Job 5 rejected' },
            ask: ask('Do active, do waiting; fifth submit par AbortPolicy ne reject kiya. Useful work ka haal?',
              ['Chaar jobs accepted hain; paanchvi ko caller ko explicitly handle karna hai.', 'Paanch jobs accepted hain; rejection exception ka matlab fifth job baad mein chalegi.', 'Do jobs accepted hain; queue mein rakhi do jobs rejection ke saath delete ho gayi.'],
              ['Full queue rejection fifth task ka admission fail hai. Other accepted work alag hai.', 'AbortPolicy rejected job ko baad ke execution ke liye save nahi karti.', 'Existing queued jobs rejection se automatically cancel nahi hoti.']) },
          { title: '4. Latch khola', say: 'Unbounded run 5 accepted jobs finish karta hai. Bounded run 4 accepted jobs finish karta hai, 1 reject hai. Fewer accepted jobs ko faster throughput ka proof mat bolo.', vars: { active: 'Shutdown ke baad 0', waiting: '0', outcome: 'Bounded: 4 done, 1 rejected' },
            ask: ask('Bounded run 4 complete, unbounded 5 complete. Kya bounded pool ne same work tez kiya?',
              ['Nahi, accepted work alag hai; yahan admission bound verify hua, speed nahi.', 'Haan, chaar completions ka matlab har job paanch completions se tez thi.', 'Haan, rejection se fifth job ka business result bina execute hue mil gaya.'],
              ['Same-work latency comparison nahi hua. Rejected request ka outcome caller handle kare.', 'Completion count per-job timing ya throughput ratio nahi deta.', 'Rejected execution successful business result create nahi karti.']) },
          { title: '5. Backpressure ya silent loss?', say: '<b>Backpressure</b> overload ka signal intake tak pahunchata hai. Caller rejection ko ignore karega toh kaam kho sakta hai. CallerRunsPolicy jaisi policy submitter ko kaam karwa sakti hai; caller event-loop ho toh block hone ka risk evaluate karo.' },
          { title: '6. Fixed workers ka matlab bounded queue?', say: 'Java <code>Executors.newFixedThreadPool(2)</code> unbounded waiting queue use karta hai. Worker cap 2 hai, pending backlog ki cap nahi. Lab explicit ThreadPoolExecutor aur ArrayBlockingQueue(2) compare karta hai.',
            ask: ask('CPU threads fixed 2 hain, par waiting queue unbounded hai. Kya overload memory risk gaya?',
              ['Nahi, pending tasks badh sakte hain; queue limit aur rejection policy bhi chahiye.', 'Haan, worker count 2 pending tasks ke saare references bhi do par limit karta hai.', 'Haan, queued tasks sirf names rakhte hain; request payload memory mein nahi rehta.'],
              ['Execution concurrency aur waiting memory separate budgets hain.', 'Worker setting waiting collection ki capacity set nahi karti.', 'Runnable closures/request tasks payloads aur other state retain kar sakti hain.']) },
        ], 'Thread cap aur queue cap dono chahiye. Rejection ko accepted/completed ka label mat do.'),
        cards('Same key, do workers: idempotency under concurrency', [
          { title: '1. Thread-safe map, unsafe workflow', say: '<b>Idempotency</b> mein same logical operation repeat hone par business effect dobara nahi lagna chahiye. <b>Race</b> tab bhi ho sakti hai jab map ki individual get/put thread-safe hon. Broken code mein do requests same key absent dekhti hain, phir dono effect karti hain.',
            ask: ask('ConcurrentHashMap par pehle get(key), phir effect, phir put(key) kiya. Duplicate effect ruka?',
              ['Nahi, dono requests absent dekh sakti hain; poora claim/effect rule guard karo.', 'Haan, map thread-safe hai isliye get aur baad ka effect ek atomic step ban gaye.', 'Haan, last put pehla external effect rollback karke sirf latest result rakh lega.'],
              ['Thread-safe methods ka sequence apne aap atomic workflow nahi hota.', 'Concurrent map individual operations protect karta hai, arbitrary gap/code nahi.', 'Map value overwrite external/local business effect ko undo nahi karta.']) },
          { title: '2. Same key ka atomic local claim', say: '<b>Atomic</b> ka matlab defined operation ka indivisible update hai. Lab per-key <code>compute</code> ke andar same payload check aur ek in-memory counter effect karta hai. Chaar requests ko same order-1 result milta hai; effect count 1. Naya key independent operation hai.',
            ask: ask('Same idempotency key ke saath pehle 100 INR, phir 200 INR payload aaya. Sahi policy?',
              ['Payload conflict reject karo; same key ko naya operation banaakar charge mat karo.', 'Purana result overwrite karo; key same hone se extra charge bhi repeat hi maana jaayega.', '200 INR charge karo aur 200 INR ka result cache karo; different body ko compare karna zaroori nahi.'],
              ['Key scope aur payload contract explicit rakho. Different operation same key se silently run nahi hona chahiye.', 'Repeated identity ke saath changed operation ko overwrite karna duplicate/conflicting effect chhupa sakta hai.', 'Body mismatch ignore karne se caller ko wrong result ya double charge mil sakta hai.']) },
          { title: '3. Process crash ya doosra pod?', say: 'Lab ka map aur counter ek JVM ki memory mein hain. Real order/payment ko durable unique claim aur local transaction chahiye. Remote provider ke side effect ke liye stable provider idempotency key, supported contract aur unknown outcome ka status/reconciliation path chahiye. Network call ko map compute mein rakh dena distributed transaction nahi.',
            ask: ask('Payment apply hua, response se pehle JVM crash. In-memory dedup map se restart par safety?',
              ['Nahi, map kho sakta hai; durable operation record aur payment contract chahiye.', 'Haan, atomic compute map ke contents ko disk par persist karke hi return karta hai.', 'Haan, fixed worker pool apne saare previous business effects restart par yaad rakhta hai.'],
              ['Local atomicity crash recovery ya remote effect dedup guarantee nahi. Unknown outcome resolve karna padta hai.', 'ConcurrentHashMap durable storage nahi.', 'Thread pool execution facility hai, business operation ledger nahi.']) },
          { title: '4. Build task aur production choice', say: 'WorkersLab.java mein bounded executor pehle khud configure karo: workers=2, queue=2, explicit rejection, shutdown. Dedup ke broken baseline ke saath fixed per-key claim banao. Production DB/provider design ki recovery policy alag likho.' },
        ], 'Same key ke concurrent callers ko one local effect mil sakta hai. Multi-process, crash aur external effects ki boundary alag enforce karo.', CODE.workers),
        lab('ex5-workers', 'Lab 5 · bounded thread pool aur duplicate execution', ask('Bounded run 2 active/2 queued/1 rejected, fixed dedup effects=1. Kya guarantee mili?',
          ['Local admission bound aur same-JVM duplicate effect control verify hua.', 'Har pod aur database par global queue cap aur exactly-once payment prove hua.', 'Reject hui fifth job durable storage mein hai; restart par pool chala dega.'],
          ['Lab ek JVM aur memory state ka hai. Rejected task ki caller policy aur durable external workflow alag hain.', 'Local structures global coordination ya provider guarantees prove nahi karte.', 'AbortPolicy rejected task ko durable queue mein persist nahi karti.'])),
      ],
      interview: interview([
        ask('Bounded executor full hua aur caller ne rejection ignore kiya. Backpressure ka result?',
          ['Capacity bound bacha, par caller ka kaam kho sakta hai; admission outcome propagate karo.', 'Queue bound hai isliye rejected task bhi consumer tak exactly ek baar pahunch jaayega.', 'Caller ko result dene ki zaroorat nahi; worker count overload ka jawab complete karta hai.'],
          ['Bounded memory aur correct business delivery alag requirements hain. Rejection handle/communicate karo.', 'Rejected task accepted queue ka part nahi.', 'Concurrency settings user-visible success/rejection contract ka replacement nahi.']),
        ask('Payment retry par nayi idempotency key bana di. Timeout ne pehle payment ka outcome nahi bataya. Risk?',
          ['Pehle charge ho chuka ho sakta hai; nayi key duplicate charge ko naya operation bana degi.', 'Risk nahi; timeout ka matlab provider ne payment apply nahi ki, nayi key safe hai.', 'Risk nahi; bounded thread pool same body dekhkar nayi key ko purani key se mila dega.'],
          ['Same logical operation ke supported key/body contract ko reuse karo; ambiguous result ko status/reconciliation se resolve karo.', 'Timeout missing response hai, missing committed effect ka proof nahi.', 'Executor body-based durable dedup implement nahi karta.']),
      ]),
      success: ['Bounded executor aur caller rejection contract bana sakte ho', 'Thread-safe map aur concurrent idempotent workflow ko alag samajh sakte ho'],
      homework: 'Pool ki worker count badle bina queue size badlo aur fifth job ka admission predict karo. Per-key dedup ke liye two-request trace banao; restart aur external charge ki boundary alag likho.',
      cards: [{ front: 'Fixed thread pool ka backlog bounded?', back: 'Java newFixedThreadPool ki waiting queue unbounded hai. Explicit queue/rejection policy choose karo.' }, { front: 'Rejected = accepted?', back: 'Nahi. Caller ko outcome aur retry/admission policy handle karni hai.' }, { front: 'Thread-safe get + put = idempotent workflow?', back: 'Nahi. Absent check aur effect ke beech concurrent caller enter kar sakta hai.' }, { front: 'One-JVM dedup = exactly-once payment?', back: 'Nahi. Durable record, payload/key contract aur remote provider/status recovery alag chahiye.' }],
    },
  ];

  levels.find(level => level.id === 'cc-workers').stages[0].code = CODE.executor;

  // Authored visual states: each transition matches the text and state table beside the diagram.
  const traces = {
    'cc-start': {
      0: { n0: ['slow', 'Reply ka wait'], n1: ['busy', 'B ka ready step'], n2: ['busy', 'Toast aage badha'] },
      1: { n0: ['busy', 'Core 1'], n1: ['acc', 'Do-core example'], n2: ['busy', 'Core 2'] },
      2: { n0: ['busy', 'A: do steps'], n1: ['acc', 'Ek core, baari-baari'], n2: ['ok', 'B: ek step'] },
    },
    'cc-race': {
      0: { n0: ['idle', 'Read baaki'], n1: ['idle', 'Count 0'], n2: ['idle', 'Read baaki'] },
      1: { n0: ['busy', 'Local before 0'], n1: ['slow', 'Dono ne 0 padha'], n2: ['busy', 'Local before 0'] },
      2: { n1: ['bad', 'Actual 1, expected 2'] },
      3: { n0: ['ok', 'Same mutex'], n1: ['acc', 'Whole increment'], n2: ['slow', 'Pehle owner ka wait'] },
      4: { n1: ['ok', 'Fixed count 2'], n2: ['ok', 'Doosra update poora'] },
    },
    'cc-queue': {
      0: { n0: ['busy', 'Intake chalta raha'], n1: ['bad', 'Unbounded: 5 items'], n2: ['idle', 'Shuru nahi'] },
      1: { n0: ['slow', 'C ka put pending'], n1: ['slow', 'A, B · full 2/2'], n2: ['acc', 'A utha sakta hai'] },
      3: { n0: ['slow', 'Predicate phir check'], n1: ['slow', 'Ab bhi full'] },
      4: { n0: ['ok', 'C add hua'], n1: ['ok', 'B, C · 2/2'], n2: ['ok', 'A mila'] },
    },
    'cc-pool': {
      0: { n0: ['idle', 'Borrow baaki'], n1: ['ok', '2 permits / 2 IDs'], n2: ['idle', 'Abhi nahi aaya'] },
      1: { n0: ['busy', 'IDs 1/2 leased'], n1: ['slow', '0 permits'], n2: ['slow', 'Deadline ka wait'] },
      2: { n1: ['ok', 'ID 1, permit wapas'], n2: ['acc', 'Borrow ab possible'] },
      3: { n1: ['bad', 'Raw double release 3/2'] },
      4: { n1: ['ok', 'Fixed 2 permits / 2 IDs'], n2: ['ok', 'Clear outcome'] },
    },
    'cc-stuck': {
      0: { n0: ['busy', 'Stock held'], n1: ['slow', 'Dono first locks held'], n2: ['busy', 'Wallet held'] },
      1: { n0: ['slow', 'Wallet ka wait'], n1: ['bad', 'Cycle: completed 0'], n2: ['slow', 'Stock ka wait'] },
      2: { n1: ['acc', 'Detect → interruptible cleanup'] },
      3: { n0: ['ok', 'Stock → wallet'], n1: ['ok', 'Fixed: completed 2'], n2: ['ok', 'Stock → wallet'] },
    },
    'cc-workers': {
      0: { n0: ['idle', '5 jobs bhejega'], n1: ['idle', 'Workers 0/2'], n2: ['idle', 'Outcome baaki'] },
      1: { n0: ['busy', '5 accepted'], n1: ['slow', '2 active / 3 waiting'], n2: ['idle', 'Unbounded backlog'] },
      2: { n0: ['busy', 'Job 5 submit'], n1: ['slow', '2 active / 2 waiting'], n2: ['bad', 'Job 5 rejected'] },
      3: { n1: ['ok', 'Accepted 4 finish'], n2: ['acc', '1 rejected, success nahi'] },
    },
  };
  levels.forEach(level => Object.entries(traces[level.id]).forEach(([index, state]) => {
    level.stages[0].steps[index].nodes = Object.fromEntries(Object.entries(state).map(([id, [tone, badge]]) => [id, { tone, badge }]));
  }));

  levels.forEach(level => {
    const diagram = level.stages.find(stage => stage.type === 'dryrun');
    const first = diagram.steps[0].nodes;
    hero(level.id, level.title, diagram.nodes.map(n => n.label), diagram.nodes.map(n => first[n.id]?.badge || n.label));
  });
  SD.registerLevels('concurrency', levels);
  const docs = {
    processes: 'https://docs.oracle.com/javase/tutorial/essential/concurrency/procthread.html',
    states: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Thread.State.html',
    locks: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/ReentrantLock.html',
    atomic: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/atomic/package-summary.html',
    condition: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/Condition.html',
    semaphore: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/Semaphore.html',
    liveness: 'https://docs.oracle.com/javase/tutorial/essential/concurrency/starvelive.html',
    executor: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html',
    dedup: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html',
    payments: 'https://docs.stripe.com/api/idempotent_requests',
  };
  function guide(level, data, keys) {
    const id = 'concurrency-' + level;
    SD.guidance.topics[id] = { ...data, levels: [level], sources: keys.map(key => ({ title: 'Primary source · ' + key, url: docs[key] })) };
    SD.guidance.byLevel[level] = id;
  }
  guide('cc-start', {
    title: 'Ek cook ki baari aur do cooks ka same-pal kaam',
    why: 'Chai ka wait chal raha ho toh toast ka ready kaam aage badh sakta hai.',
    concept: 'Concurrency tasks ka overlapping progress hai. Parallelism same-pal execution hai. Thread shared process resources use karta hai; process ka address space alag hai.',
    example: 'Lab mein thread parent field 7 karta hai; fresh JVM ka same field 0 hai. Koi shared-memory transport configure nahi.',
    handsOn: 'BasicsLab ka monitor wait, timed latch aur process child dekho. JVM state ko CPU utilization mat bolo.',
    use: 'Independent ready work ya I/O wait overlap karna ho; workload aur shared bottleneck pehle samjho.',
    avoid: 'Thread count ko speedup ya RUNNABLE ko isi pal CPU execution ka proof samajhna.',
    compare: [{ choice: 'Threads', when: 'Same process resources ke saath kaam share karna hai', tradeoff: 'Sharing sasti ho sakti hai; coordination aur failure coupling chahiye' }, { choice: 'Processes', when: 'Address-space isolation chahiye', tradeoff: 'IPC/explicit sharing ka contract aur resource overhead dekho' }],
    tree: ['Tasks independent ready steps rakhte hain? Timeline banao.', 'CPU work hai ya I/O wait? Alag measurements rakho.', 'Shared resource bottleneck? Concurrency badhaane se pehle capacity aur correctness dekho.'],
    mistake: 'Concurrency ko sirf multiple threads ya sirf interleaving tak seemit karna.',
    production: 'Processes bhi same database/files share kar sakte hain. Private heap external resource ki race nahi mitaata.',
    followup: 'Ek core par do async requests same stock update kar rahi hon toh galat result kaise aayega?',
  }, ['processes', 'states']);
  guide('cc-race', {
    title: 'Dono cashiers ka padha 0, dono ka likha 1',
    why: 'Do accepted orders ke baad shared count 1 reh gaya.',
    concept: 'Read–add–write ko ek protected unit banao. Mutex sab participating writers ko coordinate karta hai; single atomic increment us counter ko update karta hai.',
    example: 'Barrier ke baad broken count 1; full mutex section aur atomic increment dono 2. Speed compare nahi hui.',
    handsOn: 'RaceLab mein sirf write protect karke pehle failure samjho. Reentrant holds aur coarse/fine key availability compare karo.',
    use: 'Shared mutable state ka exact invariant aur mutation scope pata ho.',
    avoid: 'Do independent atomic fields ko transaction ya final reference ko deeply immutable bolna.',
    compare: [{ choice: 'Coarse lock', when: 'Combined invariant simple common boundary maangta hai', tradeoff: 'Unrelated work bhi wait kar sakta hai' }, { choice: 'Fine locks', when: 'Independent keys par contention measured hai', tradeoff: 'Multi-key updates, lock lifecycle aur total order design karo' }],
    tree: ['Data mutate karna zaroori? Immutable value/snapshot consider karo.', 'Sirf ek counter update? Atomic operation ka scope dekho.', 'Multi-field/multi-key rule? Common boundary aur acquisition order define karo.'],
    mistake: 'Stale read ke baad sirf final write ko lock karna.',
    production: 'Short locks, exceptions par finally, safe publication aur nested mutable objects inspect karo.',
    followup: 'Stock aur balance ke joint update ko do atomic increments se kaunsi galti mil sakti hai?',
  }, ['locks', 'atomic']);
  guide('cc-queue', {
    title: 'Shelf ki do jagah, producer ka teesra parcel',
    why: 'Consumer ke bina intake chalta raha toh waiting work badhta rahega.',
    concept: 'Bounded FIFO capacity define karti hai. Condition wait queue lock chhodkar sleep karta hai; return par lock lekar predicate dobara check hota hai.',
    example: 'A/B queue mein; C ka put wait karta hai. A nikalne par B/C bachte hain. Full offer(X) false par X accepted nahi.',
    handsOn: 'Full-queue signal test mein while→if se behavior todo. Interrupted producer ke baad queue usable rehni chahiye.',
    use: 'Ek bounded producer ko consumer capacity ka signal dena ho.',
    avoid: 'Queue ke bahar unbounded request handlers ko wait karaakar total memory bounded bolna.',
    compare: [{ choice: 'Blocking put/take', when: 'Calling thread ko wait karna acceptable hai', tradeoff: 'Deadline/cancellation aur outer waiter bounds chahiye' }, { choice: 'Nonwaiting offer/poll', when: 'Caller abhi admission outcome handle karega', tradeoff: 'False/null par explicit policy; tight retry loop CPU waste kar sakta hai' }],
    tree: ['Queue full? Wait, reject ya use-case ke mutabik drop choose karo.', 'Waiters bounded? Nahi → caller admission bhi limit karo.', 'Signal mila? Lock ke andar predicate phir check karo.'],
    mistake: 'Signal ko free slot ka reservation samajhna.',
    production: 'API nonwaiting hona formal lock-free progress proof nahi. Is lab ke bookkeeping methods lock use karte hain.',
    followup: 'Queue capacity 100 aur das hazaar waiting HTTP handlers mein memory kahan rahegi?',
  }, ['condition']);
  guide('cc-pool', {
    title: 'Do chabiyan: permit aur room ID dono wapas chahiye',
    why: 'Missing close se free capacity leak; duplicate close se fake capacity create ho sakti hai.',
    concept: 'Semaphore capacity gate hai, resource registry nahi. Lease once-only return karta hai; actual free resource thread-safe list mein track hota hai.',
    example: 'Broken raw double release 3/2. Fixed failure/double-close ke baad permits=2 aur free=2.',
    handsOn: 'PoolLab mein exception lease ke andar throw karo. Concurrent borrowers mein peak aur unique active resource IDs check karo.',
    use: 'Local finite resource budget ho aur borrow/return ownership clear ho.',
    avoid: 'Permit ko healthy database connection ya process-local cap ko fleet-wide budget bolna.',
    compare: [{ choice: 'Mutex', when: 'Ek owner ko critical section mein entry deni hai', tradeoff: 'Critical section ka scope aur ownership matter karte hain' }, { choice: 'Semaphore', when: 'N resource admissions count karne hain', tradeoff: 'Over-release, assignment, validation aur cleanup ko alag guard chahiye' }],
    tree: ['Borrow deadline hai? Exhaustion ka explicit result do.', 'Query fail? Lease finally/structured close se return karo.', 'Pool across pods? Per-pod aur global DB budget saath calculate karo.'],
    mistake: 'Global bookkeeping lock hold karke capacity ka wait karna, jab returner ko global pool lock chahiye.',
    production: 'Pool timeout aur query deadline alag phases hain. Connection health/replacement real pool ki extra responsibilities hain.',
    followup: 'Resource free list mein daalne se pehle permit release karoge toh kya race ho sakti hai?',
  }, ['semaphore']);
  guide('cc-stuck', {
    title: 'A stock pakde, B wallet pakde: normal exit ka raasta kahan?',
    why: 'Threads zinda rehkar bhi orders finish karna band kar sakte hain.',
    concept: 'Deadlock wait cycle hai; livelock active no-work reaction hai; starvation mein kuch tasks ko service nahi milti jabki baaki progress karte hain.',
    example: 'Real opposite-order lock cycle detector ko mila; interruptible demo cleanup hua. Same-order variant 2/2 finish hua.',
    handsOn: 'DeadlockLab ke wait-for arrows khud banao. Model ke finite rounds ko infinite scheduling proof mat bolo.',
    use: 'Completed work/oldest wait ka issue ho, sirf alive/CPU metrics healthy lagte hon.',
    avoid: 'Fair lock ya aur cores ko multi-lock dependency cycle ka automatic repair samajhna.',
    compare: [{ choice: 'Consistent lock order', when: 'Multiple held resources ka cycle ban sakta hai', tradeoff: 'Saare paths same rule follow karein; unknown callbacks ke waits dekho' }, { choice: 'Fair admission / aging', when: 'Ek task baar-baar service se deny hota hai', tradeoff: 'Task fairness aur throughput ka tradeoff; CPU scheduler control alag hai' }],
    tree: ['Held-resource wait cycle? Acquisition dependency fix karo.', 'State/retry badal raha par completions 0? Livelock pattern inspect karo.', 'Baaki progress par ek task wait? Selection fairness aur budgets dekho.'],
    mistake: 'Interrupt ko arbitrary held lock ki forced release samajhna.',
    production: 'Demo lockInterruptibly aur finally par depend karta hai. Detector business rollback nahi karta.',
    followup: 'Premium work finish hota rahe aur normal job wait kare toh total throughput kya chhupa raha hai?',
  }, ['locks', 'liveness']);
  guide('cc-workers', {
    title: 'Do cooks aur do waiting seats; fifth order ko clear jawab',
    why: 'Worker reuse unbounded backlog ya duplicate payment ko apne aap nahi rokta.',
    concept: 'Thread count, waiting queue aur rejection policy alag set karo. Concurrent duplicate key ka claim/effect single local boundary mein protect karo.',
    example: '2 active + 2 waiting par fifth reject. Same-JVM per-key compute chaar identical requests par ek local counter effect karta hai.',
    handsOn: 'WorkersLab mein queue capacity badalkar admission predict karo. Broken get/effect/put aur fixed per-key claim compare karo.',
    use: 'Finite worker/resource budget aur explicit caller admission contract ho.',
    avoid: 'Rejected task ko accepted, ConcurrentHashMap ko durable ledger ya local compute ko exactly-once external payment bolna.',
    compare: [{ choice: 'Unbounded waiting queue', when: 'Backlog already independently bounded aur justified ho', tradeoff: 'Fixed workers pending memory bound nahi karte' }, { choice: 'Bounded executor', when: 'Pending work aur active work dono ka budget chahiye', tradeoff: 'Overload ka rejection caller tak handle/propagate karna padega' }],
    tree: ['Queue full? Rejection/drop/wait ka user-visible contract define karo.', 'Duplicate logical operation? Same key/body aur atomic claim design karo.', 'Crash ya external side effect? Durable record aur provider status/recovery contract chahiye.'],
    mistake: 'Thread-safe get aur put ke beech effect ko automatically atomic samajhna.',
    production: 'Remote payment ko map compute mein chala dena distributed transaction nahi; ambiguous success ko reconcile karo.',
    followup: 'Charge successful, response lost, process restarted: same logical payment ko kaise resolve karoge?',
  }, ['executor', 'dedup', 'payments']);
})();
