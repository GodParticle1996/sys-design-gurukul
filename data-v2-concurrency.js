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
            ask: ask("A ka reply abhi nahi aaya, toh ek core B ka ready step chala deta hai. Kya A aur B concurrently chal rahe hain?",
              [
                "Dono kaam ek hi waqt ke daayre mein aage badhe, bhale core ek hi tha",
                "Concurrency tabhi hai jab A aur B dono ek hi pal mein CPU par chalein",
                "Jab tak A ka reply na aaye, B ka kaam shuru hi nahi ho sakta",
              ],
              [
                "Cook ne chai ke intezaar mein toast banaya — dono orders ek hi waqt ke daayre mein aage badhe. Concurrency ke liye do cores zaroori nahi; ek core bhi baari-baari dono kaam aage badha sakta hai.",
                "Ek hi pal dono ka CPU par chalna zaroori nahi. A ke intezaar mein B ka step chala, toh dono kaam ek hi waqt ke daayre mein aage badhe.",
                "A ka intezaar B ko nahi rokta. Cook chai ubalne tak khada nahi rehta — toast bana leta hai.",
              ],
              "Lesson ka cook yaad karo: chai ubalte waqt toast banaya. Kya dono orders ek hi waqt ke daayre mein aage badhe?") },
          { title: '2. Ek hi pal ki tasveer', say: '<b>Parallelism</b> mein do tasks sach mein ek hi pal execute karte hain. Is CPU example mein do cores par A aur B ke instructions chal sakte hain. Concurrency mein interleaving bhi ho sakti hai, parallel execution bhi.', vars: { a: 'Core 1 par kaam', b: 'Core 2 par kaam', cpu: 'Do cores ka example' } },
          { title: '3. Ek core ki interleaving', say: 'Trace: A ka ek step → B ka ek step → A ka agla step. Har pal sirf ek step execute hua. Timeline tasks ka kram dikhati hai; real CPU speed ka measurement nahi.', vars: { a: 'Do steps hue', b: 'Ek step hua', cpu: 'Ek core, baari-baari' },
            ask: ask("Is ek-core trace mein A/B baari-baari chale. Trace kya dikhati hai?",
              [
                "Concurrency — A aur B baari-baari aage badhe, par kisi pal dono saath nahi chale",
                "Parallelism — dono tasks khule hain, isliye baari-baari ke steps bhi ek hi pal ka kaam hain",
                "Seedha ek ke baad ek — A poora khatam hua, tabhi B ka pehla step shuru hua",
              ],
              [
                "Ek core par kaam baari-baari chala: A ka step, B ka step, phir A ka. Har pal sirf ek step — isliye parallelism nahi. Timeline sirf kram dikhati hai, CPU ki raftaar nahi.",
                "Tasks ka khula rehna ek hi pal mein chalna nahi hai. Trace mein har pal sirf ek task ka step chala.",
                "B ka step A ke do steps ke beech chala. A poora hone se pehle B shuru ho chuka tha.",
              ],
              "Har pal kitne steps chal rahe the — ek ya do? Aur A khatam hone se pehle B shuru hua ya baad mein?") },
          { title: '4. Zyada threads se do guna speed?', say: 'Agar kaam ek hi locked counter ya ek hi slow database par atka hai, threads badhaane se wait badh sakta hai. CPU work, I/O wait aur shared bottleneck alag dekho.', vars: { cpu: 'Speed abhi naapi nahi' } },
          { title: '5. Progress ka hisaab', say: 'Useful completions, wait aur errors naapna speed ke daave se pehle aata hai. Concurrency scheduling ka mauka deti hai; workload ki capacity alag sawaal hai.',
            ask: ask("Do threads bana diye. Kya ab app do guna tez ho gaya?",
              [
                "Pata nahi — wahi kaam pehle aur baad mein naapna padega, aur dekhna hoga atkan kahan hai",
                "Haan — har naya thread app mein ek aur CPU jitni taakat jod deta hai, toh raftaar dugni",
                "Haan — do threads hone par shared data ka intezaar apne aap aadha ho jaata hai",
              ],
              [
                "Thread ki ginti raftaar ka saboot nahi. Wahi kaam, wahi bojh pehle aur baad mein naapo — kitne kaam poore hue, kitna intezaar, kitne errors. Atkan (ek lock, ek dheema database) wahi rahe toh zyada threads intezaar badha bhi sakte hain.",
                "Thread naya CPU core nahi banata, na database ki taakat badhata hai.",
                "Shared cheez par do threads ladenge — intezaar badh bhi sakta hai. Aadha hone ki koi guarantee nahi.",
              ],
              "Pichhla step yaad karo: dono threads ek hi locked counter ya ek hi dheeme database par atke hon toh kya hoga?") },
        ], 'Concurrency tasks ko overlap kar sakti hai. Parallel execution same-pal kaam hai. Speed workload par naapte hain.'),
        cards('Process, thread aur Java ke states', [
          { title: '1. Memory kiski?', say: '<b>Process</b> ka apna address space hota hai. <b>Threads</b> ek process ke resources aur heap share karte hain; har thread ka apna stack hota hai. Processes IPC ya explicitly shared memory se baat kar sakte hain. Threads ki sharing sasti ho sakti hai, par coordination chahiye.' },
          { title: '2. Parent ka field badla', say: 'Lab mein thread parent ka field 7 karta hai. Alag Java process ka same-named static field 0 se shuru hota hai. Koi shared-memory mechanism configure nahi kiya.',
            ask: ask("Parent process ka thread field = 7 kar deta hai. Naye JVM (alag process) mein wahi field 0 kyun hai?",
              [
                "Thread parent ki memory baant-ta hai; naya process apni alag memory mein 0 se shuru hota hai",
                "Naye process ko parent ka stack milta hai, heap nahi — isliye field ki value nahi pahunchi",
                "Naye process ko CPU der se mila, isliye field mein 7 likha jaana abhi baaki hai",
              ],
              [
                "Har process ka apna address space hai. Naya JVM apni memory mein static field 0 se shuru karta hai. Do processes ke beech value bhejni ho toh IPC, file ya database jaisa koi raasta chahiye — is lab mein aisa kuch nahi.",
                "Stack har thread ka apna hota hai, aur kisi doosre process ko nahi milta. Process ki memory poori alag hai.",
                "Der se CPU milne par bhi 7 nahi aayega — value bhejne ka koi raasta hi nahi bana.",
              ],
              "Threads ek hi process ki memory baant-te hain. Alag process ki memory kiski hai?") },
          { title: '3. Common model aur Java ka enum', say: 'Common sketch: new → runnable/running → blocked ya waiting → terminated. Java 21 enum alag hai: <code>NEW, RUNNABLE, BLOCKED, WAITING, TIMED_WAITING, TERMINATED</code>. Java mein RUNNING alag enum nahi. RUNNABLE thread CPU par chal bhi sakta hai ya CPU ka wait kar sakta hai.',
            ask: ask("Java ka getState() RUNNABLE bata raha hai. RUNNABLE se kya pakka pata chalta hai?",
              [
                "Thread chalne ke liye taiyaar hai — par isi pal CPU par chal raha hai, aisa pakka nahi",
                "Thread isi pal CPU par instructions chala raha hai — CPU ka intezaar khatam ho gaya",
                "Thread ne shared data ka lock le liya hai — doosra thread ab andar nahi aa sakta",
              ],
              [
                "Java mein RUNNING naam ki alag state nahi. RUNNABLE thread CPU par chal raha ho sakta hai, ya CPU milne ka intezaar kar raha ho sakta hai. Java ki state OS ke scheduler ki poori tasveer nahi.",
                "RUNNABLE mein CPU ka intezaar bhi shaamil hai. Isi pal chalne ka saboot nahi.",
                "RUNNABLE lock ke baare mein kuch nahi batata. Lock kiske paas hai, alag se dekhna padta hai.",
              ],
              "Card ki aakhri line padho: RUNNABLE thread CPU par chal bhi sakta hai, aur…?") },
          { title: '4. Blocked ka precise matlab', say: 'Java <code>BLOCKED</code> monitor enter karne ka wait hai. <code>WAITING</code> mein indefinite wait aur <code>TIMED_WAITING</code> mein timed wait aa sakta hai. Har library lock-wait ko Java BLOCKED mat bolo. Lab timed latch par TIMED_WAITING dikhata hai.' },
        ], 'Process isolation aur thread sharing alag hain. JVM state ka naam lock ownership, fairness ya useful progress prove nahi karta.'),
        lab('ex0-basics', 'Local warm-up · states aur memory', ask("Captured run mein monitor par BLOCKED aur latch par TIMED_WAITING mila. Sahi matlab kya hai?",
          [
            "Do alag intezaar dikhe — ek taale ka, ek tay waqt tak; CPU kitna chala, states se pata nahi",
            "Dono states mein thread lagataar CPU par kaam kar raha tha, bas naam alag-alag hain",
            "TIMED_WAITING ka matlab child process parent ki memory baant raha tha",
          ],
          [
            "BLOCKED: thread monitor (synchronized ka taala) milne ka intezaar kar raha hai. TIMED_WAITING: thread tay waqt tak ruka hai (yahan latch par). Dono intezaar hain. Captured run CPU ka istemaal nahi naapta.",
            "Dono states intezaar ki hain. Intezaar karta thread CPU par kaam nahi kar raha.",
            "Intezaar ka waqt aur process ki memory alag cheezein hain. Child process ki memory alag hi rahi.",
          ],
          "BLOCKED kis cheez ka intezaar hai, TIMED_WAITING kis cheez ka? Kya kisi state mein CPU ka kaam dikh raha hai?")),
      ],
      interview: interview([
        ask("\"Ek event loop A ke reply ka intezaar karte hue B chala deta hai, aur thread sirf ek hai. Kya event loop concurrency de raha hai?\"",
          [
            "Ek thread bhi kai kaam baari-baari aage badha sakta hai, jaise cook ne kiya",
            "Concurrency ke liye har kaam ko apna alag CPU core chahiye hota hai, ek kaafi nahi",
            "Ek thread par ek kaam poora hone se pehle doosra kaam shuru ho hi nahi sakta",
          ],
          [
            "Concurrency kaamon ke overlap hone ka naam hai, threads ki ginti ka nahi. Event loop A ke intezaar mein B chala ke dono ko aage badhata hai — Node.js aur browser isi tarah chalte hain.",
            "Kai cores parallel chalane mein madad karte hain. Concurrency ke liye zaroori nahi.",
            "Event loop await par kaam rok ke doosra kaam utha leta hai. Kaam beech mein badalte rehte hain.",
          ],
          "Concurrency ki pehchaan kya thi: kai cores, ya kai kaamon ka ek hi waqt mein aage badhna?"),
        ask("\"Do processes ki apni memory alag hai. Dono database ki ek hi row badalte hain. Kya alag memory dono updates ko apne aap sambhaal legi?\"",
          [
            "Row dono ki saajhi hai; dono updates ka kram alag se sambhaalna padega",
            "Har process ki alag memory database ki row ki bhi alag copy bana deti hai",
            "Alag process ka matlab alag database connection, jo ek doosre ka kaam nahi chhoote",
          ],
          [
            "Alag process sirf app ki apni memory alag karta hai. Database, files aur doosri services dono processes ke liye saajhi hain — saajhi cheez par dono ke badlaav takra sakte hain. Takraav kaise hota hai aur kaise rokte hain, agla level dikhata hai.",
            "Database ki row ek hi hai. Process ki apni memory row ki alag copy nahi banati.",
            "Alag connection bhi wahi database aur wahi row badalte hain. Dono ke badlaav ek hi row par takra sakte hain.",
          ],
          "App ki apni memory aur database ki row ko alag-alag dekho. Row kiski memory mein hai?"),
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
            ask: ask("A aur B dono ne count 0 padh liya. Ab dono apna 0 + 1 likhenge. Aakhri count kya hoga?",
              [
                "1 — dono ne apna padha hua 0 + 1 likha, toh ek jod mit gaya",
                "2 — volatile har write se pehle taaza count padh ke 1 jodega",
                "1 ya 2 — likhne ka kram badle toh padha hua 0 bhi badal jaayega",
              ],
              [
                "Dono ne 0 padha tha, dono ne 1 likha — ek order ka jod kho gaya. Is galti ka naam lost update hai. volatile sirf ek read ya ek write ko sabko dikhata hai; padhna-jodna-likhna teeno ek saath nahi bachata.",
                "volatile pehle padha hua 0 dobara nahi padhta, na padhna-jodna-likhna ek kaam banata hai.",
                "Dono reads pehle hi 0 de chuki hain. Likhne ka kram badle, dono 1 hi likhengi.",
              ],
              "Lesson ke do cashiers yaad karo: dono ne 0 padha tha. Dono kya likhenge?") },
          { title: '3. Bug luck par depend nahi', say: 'Barrier sirf is bad interleaving ko repeatable banata hai. Real requests bhi read aur write ke beech interleave ho sakti hain. Race ke liye same-pal execution zaroori nahi.', vars: { count: '1, expected 2' } },
          { title: '4. Poora critical section bachao', say: '<b>Mutex</b> ek waqt par ek owner ko protected code mein aane deta hai. Read–add–write ka poora hissa <b>critical section</b> hai. Sab writers ko same lock maanna hoga.', vars: { a: 'Lock → 0+1 → unlock', count: '1', b: 'Ab lock lekar 1+1' },
            ask: ask("Sirf aakhri write par lock lagaya; padhna pehle jaisa, bina lock. Dono ne phir 0 padha. Bug ruka?",
              [
                "Dono ke paas purana 0 hai; lock mein bhi dono 1 hi likhenge",
                "Dono writes ab alag-alag pal par hongi, toh count 2 hoga",
                "Write ka lock, pehle ho chuke read ko apne aap taaza kar dega",
              ],
              [
                "Mutex (lock) ek waqt mein ek hi thread ko andar aane deta hai. Par sirf write bachaya toh dono ke haath mein purana 0 pehle se hai. Padhna-jodna-likhna poora hissa ek hi lock ke andar ho — is hisse ka naam critical section hai.",
                "Alag pal par likhne se bhi dono 1 hi likhengi — dono ke paas purana 0 hai.",
                "Lock baad mein lene se pehle wala read dobara nahi chalta.",
              ],
              "Lock lagne tak dono ke haath mein kaunsa number hai? Kya lock us number ko badalta hai?") },
          { title: '5. Finally mein unlock', say: 'Mutex variant poore increment par lock leta hai aur finally mein unlock karta hai. Result 2 hai. <b>Atomic operation</b> apne defined scope mein indivisible update deta hai; <code>AtomicInteger.incrementAndGet()</code> bhi is single counter ko 2 karta hai.', vars: { count: 'Mutex 2 · atomic 2', b: 'Poora hua' },
            ask: ask("Balance aur stock do alag atomic counters hain. Kya order ka update (balance ghatao + stock ghatao) ek saath atomic hua?",
              [
                "Har counter apne aap mein atomic hai; dono ka saath wala niyam alag banana padta hai",
                "Atomic class ke saare objects milkar apne aap ek hi transaction bana dete hain",
                "Dono atomic hain, toh beech mein exception aaye tab bhi dono badlaav ho jaayenge",
              ],
              [
                "AtomicInteger ek counter ka badlaav bina tukde ke karta hai. Do counters ka saath badalna alag niyam hai. Ek common lock doosre threads ko beech ki aadhi haalat dekhne se rokta hai — agar sab threads wahi lock lein. Par lock ke andar pehle badlaav ke baad exception aaye, toh lock pehla badlaav wapas nahi karta. \"Dono ya koi nahi\" chahiye toh transaction chahiye, ya failure par purani haalat lautane ka niyam.",
                "Alag atomic objects apne aap judte nahi. Har ek ka vaada sirf apne liye hai.",
                "Pehla badla aur phir exception aaya, toh doosra nahi badlega — aadha kaam reh jaayega.",
              ],
              "Atomic ka vaada kitni cheezon par hai: ek counter par, ya do counters par milkar?") },
        ], 'Race same-pal chalne ka naam nahi. Correctness ke liye operation ka scope aur sab writers ka coordination dekho.'),
        cards('Taala kitna bada? Aur kya badalna hi zaroori hai?', [
          { title: '1. Coarse ya fine?', say: '<b>Coarse-grained locking</b>: kai keys ke liye ek bada lock. <b>Fine-grained locking</b>: alag keys ya chhote regions ke locks. Lab mein A ka lock held hai; B ke alag key ka tryLock coarse par fail, fine par pass hota hai. Throughput ka benchmark nahi.',
            ask: ask("Do accounts ke transfer mein har account ka alag (chhota) lock lagaya. Kya design poora ho gaya?",
              [
                "Transfer mein dono accounts saath badalte hain, toh dono ke locks saath chahiye",
                "Alag locks wale dono accounts ka milkar balance apne aap sahi rahega",
                "Do chhote locks lene se dono accounts ek hi pal mein ek saath lock ho jaate hain",
              ],
              [
                "Chhote (fine) locks alag accounts ke kaam ko saath chalne dete hain. Par transfer do accounts ek saath badalta hai — dono ke locks chahiye. Ek baat aage ke liye: do locks lene ka kram har jagah ek hi rakho. Kram ulta ho toh do threads ek doosre ka lock maangte hue phans sakte hain — Stuck wala level yahi dikhata hai.",
                "Paisa ek account se nikla aur doosre mein gaya — dono badlaav ek saath bachane padenge.",
                "Do locks do alag kadam mein milte hain. Beech mein doosra thread aa sakta hai.",
              ],
              "Transfer mein kitne accounts ek saath badalte hain? Ek account ka lock doosre account ko bachata hai?") },
          { title: '2. Same thread phir lock le', say: '<b>Reentrant lock</b> same owner thread ko dobara lock lene deta hai. Hold count 2 par ek unlock ke baad count 1 rahega. Doosra thread tab tak owner nahi banta.',
            ask: ask("Ek thread ne wahi lock do baar liya (reentrant), aur ek baar chhoda. Kya doosra thread ab andar aa sakta hai?",
              [
                "Ek hold abhi baaki hai; doosre unlock tak lock pehle thread ka hai",
                "Pehla unlock hi lock ka poora malik-record mita deta hai, ginti nahi",
                "Reentrant ka matlab doosre thread ko bhi andar aane ki chhoot hai",
              ],
              [
                "Reentrant lock wahi thread dobara le sakta hai, aur har baar ginti badhti hai. Count 2 → ek unlock → count 1. Lock tab khulta hai jab count 0 ho. Har lock ke saath ek unlock.",
                "Ek unlock ek hi ginti ghatata hai. 2 se 1 hua, 0 nahi.",
                "Reentrant sirf lock ke maalik thread ke liye hai. Doosre thread ke liye lock band hi rehta hai.",
              ],
              "Hold count 2 tha. Ek unlock ke baad count kitna bacha?") },
          { title: '3. Immutable snapshot', say: 'Java mein <code>final</code> field ka matlab: field ek baar set ho gayi, toh field ko kisi doosre object par nahi badal sakte. <b>Immutability</b> mein object banne ke baad value mutate nahi hoti. Lab <code>List.copyOf</code> se strings ki snapshot leta hai. Source list baad mein badle toh snapshot nahi badalti. Mutable nested objects ki deep copy is API ka promise nahi.',
            ask: ask("final field mein ek mutable list rakhi. Kya poori list ab immutable ho gayi?",
              [
                "Final sirf reference pakka karta hai; list ke items ab bhi badal sakte hain",
                "Final reference ke saath list aur andar ka har object bhi jam jaata hai",
                "Final field hote hi list par saare concurrent updates apne aap ruk jaate hain",
              ],
              [
                "final ka matlab: field kisi doosri list ko point nahi karegi. List ke andar add/remove phir bhi chalta hai. Na badalne wali snapshot chahiye toh List.copyOf jaisi immutable copy banao (lab mein List.copyOf); nested objects ki deep copy List.copyOf ka vaada nahi.",
                "final andar ke objects ko nahi jamata. Deep freeze nahi hota.",
                "List ke add/remove final reference se band nahi hote.",
              ],
              "Card mein final ka matlab dobara padho: final kya pakka karta hai — kaunsi list, ya list ke andar ka saamaan?") },
          { title: '4. Immutable se kya nahi milta?', say: 'Immutable snapshots sharing ko aasaan banati hain. Nayi snapshot publish karna, do updates ka conflict aur external payment ki deduplication alag rules maangte hain. Atomic operation ko non-preemptible CPU code bhi mat samjho: guarantee observers ko update ke scope ki hai.' },
        ], 'Single counter: atomic increment ya poora mutex section. Multi-field rule: common boundary. Independent keys: finer locks ka measured tradeoff.', CODE.race),
        lab('ex1-race', 'Lab 1 · race banao aur repair karo', ask("Lab mein broken = 1, mutex = 2, atomic = 2 mila. Lab ne kya saabit kiya?",
          [
            "Lost update dobara bana, aur dono ilaaj ne is counter ke dono jod bachaye",
            "Mutex aur atomic ki raftaar barabar hai — do threads par timing ka saboot mila",
            "Har shared-state kaam mein do atomic increments ek transaction ke barabar hain",
          ],
          [
            "Lab ne sirf aakhri count dekha: broken mein 1, dono ilaaj mein 2. Waqt ya raftaar nahi naapi, na kai fields ka saath badalna.",
            "Lab waqt naapta hi nahi. Barabar count ka matlab barabar raftaar nahi.",
            "Alag atomic operations milkar transaction nahi bante (sawaal 3).",
          ],
          "Lab ne kya naapa: sirf aakhri count, ya waqt bhi?")),
      ],
      interview: interview([
        ask("\"Single-thread async server mein do requests purana stock padhti hain, await karti hain, phir stock likhti hain. Kya race ho sakti hai?\"",
          [
            "Await ke beech doosri request ghus ke wahi purana stock likh sakti hai",
            "Ek thread par requests ka stock badalne ka kram hamesha tay rehta hai",
            "Await ke baad server pehli request ka padha stock doosri ko de dega",
          ],
          [
            "Race ke liye kai CPU threads zaroori nahi. Padhna → await → likhna ke beech doosri request chal jaati hai — dono purane stock se likhti hain, ek bikri kho jaati hai. Await ke beech saajhi cheez ko lock ya atomic update se bachao.",
            "await par request ruk jaati hai aur event loop doosri request chala deta hai. Kram tay nahi.",
            "await ke baad koi apne aap taaza stock nahi deta — har request apna purana padha hua stock rakhti hai.",
          ],
          "Race ke liye kai CPU threads zaroori hain, ya bas padhne aur likhne ke beech kisi aur ka ghus aana?"),
        ask("\"Ek global lock ki wajah se alag-alag customers ki profile updates ek doosre ka intezaar kar rahi hain. Agla sahi kadam?\"",
          [
            "Intezaar naapo, phir har profile ka alag lock socho; do-profile kaam ka niyam aur kram rakho",
            "Har statement ka alag lock banao — saath badalne wale update ke niyam baad mein dekhenge",
            "Locks hata ke references final kar do — profile ki badalti fields apne aap safe ho jaayengi",
          ],
          [
            "Chhote locks alag customers ko saath chalne dete hain — par pehle naapo ki intezaar sach mein lock ka hai. Do profiles saath badalne wale update ko dono locks ek tay kram mein chahiye. Chhote locks ki keemat: zyada complexity.",
            "Statements ke beech doosra thread ghus ke saath wala update tod sakta hai.",
            "final reference badalti fields ko thread-safe nahi banata (sawaal 6).",
          ],
          "Kya alag customers ek hi data badal rahe hain? Aur do profiles ek saath badalne wale update ka kya?"),
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
            ask: ask("Queue ke dono slots mein A aur B hain. Producer put(C) par ruka hai. C abhi kahan hai?",
              [
                "Producer ke haath mein — put(C) abhi poora nahi hua; queue mein bas A aur B hain",
                "Queue ki teesri jagah mein — ruka hua producer ek extra jagah bana deta hai",
                "Consumer ke paas — C process ho chuka, put sirf jawab likhne ka intezaar kar raha",
              ],
              [
                "Capacity 2 hai, dono jagah bhari. put(C) tab tak lautta nahi jab tak jagah na bane — C abhi producer ke haath mein hai, queue mein nahi.",
                "Rukne se capacity nahi badhti. Queue mein abhi bhi do hi jagah hain.",
                "Consumer ne C liya hi nahi. C abhi queue tak pahuncha hi nahi.",
              ],
              "Capacity 2 hai aur dono slots bhare hain. Kya rukne se teesri jagah banti hai?") },
          { title: '3. Condition variable ka kaam', say: '<b>Mutex lock</b> queue bookkeeping ko ek owner deta hai. <b>Condition variable</b> waiter ko sleep aur wake ka mechanism deti hai. <code>await()</code> queue lock chhodta hai; return se pehle queue ka lock dobara leta hai. Full hone par producer <code>while</code> mein check karta hai.' },
          { title: '4. Signal, par jagah nahi', say: 'Test jaan-boojhkar full queue par signal bhejta hai. Jagah ab bhi 0 hai. Signal condition true hone ka certificate nahi: doosra thread slot le sakta hai ya wake bina useful change ke aa sakta hai.',
            ask: ask("Bhari queue par signal aaya, lock dobara mila — par size ab bhi 2 hai. Producer kya kare?",
              [
                "Size dobara check kare aur phir wait kare — C daalne ki jagah abhi nahi bani",
                "Signal mil gaya toh C daal de — signal producer ke liye ek jagah pakki kar deta hai",
                "B hata ke C daal de — size 2 par await ka matlab purana item badalna hai",
              ],
              [
                "Signal sirf jagata hai, jagah pakki nahi karta: beech mein doosra thread jagah le sakta hai, ya thread bina wajah bhi jaag sakta hai. Isliye wait hamesha while loop mein — jaagte hi shart dobara padho (lab: while (items.size() == capacity)).",
                "Signal koi token nahi. Lock milne ke baad bhi size khud padhna padta hai.",
                "Queue bhari ho toh producer wait karta hai. Purana item hata ke naya daalna is queue ka niyam nahi.",
              ],
              "Signal ka matlab \"shayad kuch badla\" hai ya \"tumhare liye jagah pakki\"? Code mein wait ke chaaron taraf kaunsa loop hai?") },
          { title: '5. Consumer A uthata hai', say: '<code>take()</code> A hataata hai, phir notFull ko signal karta hai. Producer lock lekar C add karta hai. Queue B,C hai. Consumer ko A,B,C same order mein milte hain.', vars: { queue: 'B, C · 2/2', producer: 'C add hua', consumer: 'A mila' } },
          { title: '6. Backpressure ki boundary', say: '<b>Backpressure</b> intake ko consumer ki capacity ka signal deta hai. Is bounded producer ko wait milta hai, isliye producer aur kaam nahi banaata. Hazaar independent HTTP handlers ko wait karaao toh queue ke bahar pending calls ki memory badh sakti hai.',
            ask: ask("Queue ki capacity 2 hai, par har nayi request apna alag handler bana ke put par ruk jaati hai. Kya kul memory bounded hai?",
              [
                "Queue ke items seemit hain, par ruke handlers ki ginti bhi seemit karni padegi",
                "Queue ke do slots process ke saare ruke calls ko bhi apne aap seemit karte hain",
                "Await par rukte hi handler ki request aur payload memory se hat jaate hain",
              ],
              [
                "Queue mein sirf 2 items, par bahar har ruka handler apni request, stack aur payload pakde hai — aur nayi requests aati rahin toh ruke handlers badhte jaate hain. Handlers ki ginti par bhi hadd chahiye, ya turant mana (admission) aur deadline.",
                "Queue ki capacity sirf queue ke andar ki ginti hai. Bahar ruke calls ki koi hadd nahi.",
                "Ruka hua handler apna saara data pakde rehta hai. Intezaar memory khaali nahi karta.",
              ],
              "Queue ke andar kitne items hain? Aur queue ke bahar, ruke hue handlers kya pakde baithe hain?") },
        ], 'Bounded queue ke saath producers, waiters aur overload policy bhi bound karo. Signal ke baad predicate dobara check karo.'),
        cards('Put, offer, take, poll', [
          { title: '1. Wait karna ya abhi jawab?', say: '<code>put</code> full queue par capacity ka wait karta hai. <code>offer</code> capacity ka wait kiye bina false de sakta hai. <code>take</code> empty queue par data ka wait karta hai; <code>poll</code> empty queue par null deta hai. False/null ke baad caller ko policy chahiye.',
            ask: ask("Bhari queue par offer(C) ne false diya. C ka kya hua?",
              [
                "C andar nahi gaya — caller chune: mana kare, baad mein try kare ya doosra raasta le",
                "C andar chala gaya — false sirf consumer ko abhi jagane ka ishaara hai",
                "C intezaar ki line mein lag gaya — jagah bante hi queue C ko khud daal degi",
              ],
              [
                "offer jagah ka intezaar nahi karta: bhari queue par turant false, aur C andar nahi gaya. false ke baad kya karna hai, caller ka faisla hai.",
                "Is queue ka offer false par C ko andar nahi daalta. false ka matlab: C ke liye jagah nahi mili.",
                "offer koi intezaar register nahi karta. false ko \"baad mein ho jaayega\" mat samjho.",
              ],
              "Card dekho: offer jagah ka intezaar karta hai ya turant jawab deta hai? false ka matlab kya?") },
          { title: '2. Non-blocking ka kaunsa meaning?', say: 'API sense mein non-blocking ya nonwaiting call data/capacity ke liye nahi rukti. Is lab ki offer/poll phir bhi short bookkeeping lock leti hain. Formal <b>lock-free</b> progress guarantee alag concept hai; immediate capacity result se lock-free algorithm prove nahi hota.',
            ask: ask("offer jagah ka intezaar nahi karta, par andar ek chhota lock leta hai. Kya offer lock-free hai?",
              [
                "Jagah ka intezaar na karna lock-free ka saboot nahi; chhota lock bhi lock hai",
                "False lautane wali har queue apne aap formal lock-free hoti hai",
                "Chhote lock ka intezaar CPU scheduling jaisa hai, isliye lock nahi ginta",
              ],
              [
                "\"Non-blocking API\" ka matlab: data ya jagah ke liye nahi rukta. \"Lock-free algorithm\" ek alag, pakka vaada hai ki koi na koi thread hamesha aage badhega. Is lab ka offer chhota lock leta hai — lock par bhi kheencha-taani ho sakti hai.",
                "Return value se andar ka tareeka nahi pata chalta. false lautana lock-free ka saboot nahi.",
                "Chhota lock bhi lock hai — do threads lock par ek doosre ka intezaar kar sakte hain.",
              ],
              "Card mein do alag baatein hain: \"intezaar nahi karta\" aur \"lock-free\". Kya pehli baat se doosri saabit hoti hai?") },
          { title: '3. Blocking wait vs busy retry', say: 'Sleeping wait calling thread ko useful CPU work se rokta hai, par spin loop ki tarah lagataar retry nahi karta. Nonwaiting offer ko tight loop mein chalaoge toh CPU waste ho sakta hai. Deadline, cancellation aur retry budget chuno.' },
          { title: '4. Khud todkar dekho', say: '<code>Buffer.put</code> ke while ko if karo. Behavior test full queue par signal bhejega; wrong insertion ya stuck wait ko pakdega. Phir while restore karo. Production mein standard tested queue ko pehle consider karo.' },
        ], 'Backpressure drop/reject se alag policy ho sakti hai. Har caller ko admission outcome samajhna chahiye.', CODE.queue),
        lab('ex2-queue', 'Lab 2 · producer–consumer buffer banao', ask("Lab trace A, B, C deta hai, aur bhari queue par offer(X) = false. Kya X process hua?",
          [
            "Nahi — X mana ho gaya; C ne jagah ka intezaar kiya aur baad mein andar gaya",
            "Haan — false bas chetavni hai; X queue mein hai aur consumer baad mein lega",
            "Nahi abhi — X ruka hua hai; jagah milte hi queue X ko khud andar daal degi",
          ],
          [
            "offer(X) ne turant mana kiya — X kabhi andar nahi gaya. put(C) ne jagah ka intezaar kiya, isliye output A, B, C hai.",
            "Is buffer ka offer false par X nahi leta. \"false = sirf chetavni\" kisi aur API ka niyam ho sakta hai.",
            "offer intezaar register nahi karta. X ko baad mein khud daalne ka koi vaada nahi.",
          ],
          "put(C) aur offer(X) mein kaun intezaar karta hai, aur kaun turant false deta hai?")),
      ],
      interview: interview([
        ask("\"Signal ke baad condition ko if ki jagah while mein kyun check karte hain?\"",
          [
            "Jaagne tak haalat badal sakti hai — signal akela item ya jagah pakki nahi karta",
            "while har baar jaagne par queue ki capacity badha deta hai; if mein size tay rehta hai",
            "while consumer ko producer se zyada CPU deta hai; if se kaam ka kram ulta hota hai",
          ],
          [
            "Jaagna is baat ka saboot nahi ki shart ab bhi sach hai: beech mein doosra thread jagah le sakta hai, aur bina wajah bhi jaagna (spurious wakeup) ho sakta hai. while har baar jaagne par lock ke andar shart dobara padhta hai.",
            "while sirf shart dobara padhta hai. Capacity code ki tay setting hai.",
            "Loop CPU baantne ya kram ka vaada nahi karta — sirf shart dobara padhta hai.",
          ],
          "Jaagne aur lock milne ke beech kya doosra thread aa sakta hai? Kya thread bina signal ke bhi jaag sakta hai?"),
        ask("\"Consumer baar-baar khaali queue par poll karta hai aur CPU badh raha hai. Kaunsa badlaav theek hai?\"",
          [
            "Data aane tak ruko — take() jaisa intezaar ya notification; band karne ka raasta bhi rakho",
            "poll ko aur threads mein chalao — khaali queue se kaam ke items jaldi milne lagenge",
            "Queue ki capacity badha do — khaali queue ka tez chakkar apne aap ruk jaayega",
          ],
          [
            "Khaali queue par poll() turant null deta hai, toh loop CPU jalata rehta hai (busy loop). take() data aane tak sota hai. Shutdown ya deadline par sote thread ko jagane ka raasta bhi chahiye (interrupt).",
            "Khaali queue par zyada pollers kaam nahi banate — sirf zyada CPU jalate hain.",
            "Capacity bhari queue ki hadd hai. Khaali queue ka chakkar capacity se nahi rukta.",
          ],
          "Khaali queue par poll() turant null deta hai. Toh loop kitni tezi se ghoom raha hai? Data aane tak sone ka tareeka kya hai?"),
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
            ask: ask("Dono connections A aur B ke paas hain. C ne 20 ms ki deadline ke saath borrow kiya. C ko kya milega?",
              [
                "Timeout (null) — capacity 2 hai, aur 20 ms mein koi connection wapas nahi aaya",
                "Naya ID 3 — deadline wala borrow thodi der ke liye capacity badha deta hai",
                "ID 1 ki saajhi copy — semaphore ek connection do callers ko de sakta hai",
              ],
              [
                "Permit nahi mila toh borrow 20 ms baad null lautata hai (lab: \"third borrow with 20 ms deadline = timed out\"). 20 ms theek-theek ka vaada nahi — thread thoda der se bhi jaag sakta hai.",
                "Intezaar se na permit banta hai, na connection. Capacity 2 hi rehti hai.",
                "Is pool mein ID free list se nikalta hai — chalta hua ID dobara kisi ko nahi milta.",
              ],
              "Capacity 2 hai aur dono connections abhi A aur B ke paas hain. Kya intezaar karne se nayi jagah banti hai?") },
          { title: '3. Query fail ho gayi', say: 'A ka query code exception throw karta hai. <code>try-with-resources</code> lease close karta hai. Close ID ko free list mein daalta hai, phir permit release karta hai. Permit pehle release karoge toh doosra caller ID se pehle gate paar kar sakta hai.', vars: { free: 'ID 1 wapas', permits: '1', c: 'Ab borrow kar sakta hai' },
            ask: ask("Query fail hui aur close chhoot gaya. Tay capacity wale pool mein kya hoga?",
              [
                "Capacity chupchaap ghategi — connection khaali hote hue bhi agle borrowers ruke rahenge",
                "Semaphore query ka exception dekh ke permit apne aap wapas kar dega, kuch nahi bigdega",
                "Kuch nahi hoga — method se bahar aate hi lease ka gate apne aap khul jaata hai",
              ],
              [
                "Semaphore ko query ke fail hone ka pata hi nahi. close() hi ID aur permit dono wapas karta hai — isliye try-with-resources (ya finally) mein close. Lab: close bhoolne par permits = 1/2.",
                "Semaphore sirf ginti rakhta hai. Query ka code kab fail hua, semaphore nahi dekhta.",
                "Method se bahar aana ya exception close ki jagah nahi leta. close() bulana padta hai.",
              ],
              "Connection aur permit kaun wapas karta hai: semaphore khud, ya close()?") },
          { title: '4. Do baar return?', say: 'Raw Java semaphore par extra release available count badha sakta hai. Lab ek acquisition ke baad do releases se 3/2 dikhata hai. Fixed <b>lease</b> resource ka temporary handle hai; close ka atomic once-only guard duplicate return rokta hai.', vars: { permits: 'Broken raw release: 3/2', free: 'Fixed lease: har ID ek baar', c: 'Duplicate return reject' },
            ask: ask("Lease ka close() do baar bula diya gaya. Pool mein sahi nateeja kya rehna chahiye?",
              [
                "ID aur permit ek-ek baar hi wapas aayein — kul capacity 2 hi rahe",
                "ID ek baar, permit do baar — semaphore ek extra caller sambhal lega",
                "Permit ek baar, ID do baar — free list badi hone se pool tez chalega",
              ],
              [
                "ID aur permit dono ki ginti bachi rehni chahiye. close() ke andar ek baar wala pahra hai: closed flag ko compareAndSet(false, true) sirf tab true karta hai jab flag abhi false ho. Pehla close ID aur permit lautata hai; doosra close kuch nahi karta. Lab: double close ke baad permits = 2, free = 2.",
                "Extra permit ek aise caller ko andar le aayega jiske liye koi khaali connection nahi.",
                "Ek ID free list mein do baar = ek hi connection do callers ko mil sakta hai.",
              ],
              "Raw semaphore par do release kiye toh lab ne 3/2 dikhaya tha. Sahi pool mein kul kitna rehna chahiye?") },
          { title: '5. Fixed result', say: 'Failure aur duplicate close ke baad fixed pool mein permits=2 aur free IDs=2 milte hain. Concurrent test chhe callers chalakar peak borrowed=2 aur end capacity=2 verify karta hai.', vars: { permits: '2', free: '2 unique IDs', c: 'Policy ke mutabik result' } },
        ], 'Semaphore capacity ginta hai; resource assignment, validation aur cleanup ka design alag chahiye.'),
        cards('Semaphore pool ka contract', [
          { title: '1. Wait karte hue pool lock?', say: 'Resource return karne wale code ko global pool lock chahiye. Borrower global lock pakadkar permit ka wait karega toh return path ruk sakta hai. Lab thread-safe free list use karta hai aur permit wait ke dauraan list ka lock hold nahi karta.',
            ask: ask("Borrower global pool lock pakad ke permit ka intezaar kare, aur connection lautane wale ko wahi global lock chahiye. Khatra kya hai?",
              [
                "Lautane wala connection wapas nahi kar paayega — dono ek doosre ke intezaar mein",
                "Koi khatra nahi — permit ka intezaar pakda hua global lock apne aap chhod deta hai",
                "Sirf caller tez hoga — lock pakadne se khaali connections pakke ho jaate hain, bas",
              ],
              [
                "Intezaar ki kadiyan jodo: borrower ko permit chahiye; permit tab milega jab lautane wala connection wapas kare; lautane wale ko borrower ka pakda hua lock chahiye. Gola ban gaya — koi aage nahi badhega. Lab permit ke intezaar mein koi lock nahi pakadta.",
                "Semaphore ka acquire aapka pakda hua koi aur lock nahi chhodta.",
                "Lock connection nahi banata. Lautane ka raasta rokna sabko rok deta hai.",
              ],
              "Borrower kiska intezaar kar raha hai? Lautane wala kiska? Kya dono ek doosre ka intezaar kar rahe hain?") },
          { title: '2. Fair semaphore ka scope', say: 'Lab <code>new Semaphore(2, true)</code> use karta hai. Fair acquisition ki ordering API ke internal arrival points par apply hoti hai. Scheduler ko har caller ko turant CPU dene ki guarantee nahi. Untimed tryAcquire ka fairness contract bhi alag hai.' },
          { title: '3. Connection sach mein healthy?', say: 'Permit free hona connection ki health ka proof nahi. Real database pool ko connection validation, broken connection replacement, borrow deadline aur query deadline alag handle karne padte hain.',
            ask: ask("Permit mil gaya, par database ka socket toot chuka hai. Permit se kya pakka hua?",
              [
                "Sirf itna ki local capacity mein jagah mili — connection ki sehat alag se jaanchni hogi",
                "Database theek hai — permit milte hi semaphore remote connection ko ping kar leta hai",
                "Query safe hai — permit lete hi database ka transaction apne aap commit hota hai",
              ],
              [
                "Semaphore sirf ek local ginti hai. Asli database pool ko connection jaanchna, toote connection badalna, aur borrow ki deadline aur query ki deadline alag sambhalni padti hain.",
                "Semaphore network par kuch nahi karta — koi ping nahi.",
                "Permit transaction ya safalta ka vaada nahi. Sirf andar aane ki ijaazat hai.",
              ],
              "Semaphore kya ginta hai: local jagah, ya database ki sehat?") },
          { title: '4. Khud build karo', say: 'PoolLab.java mein pehle borrow/close ko paper par likho. Failure ko lease ke andar throw karo aur counts dekho. close ka once-only guard hataoge toh duplicate ID/permit test fail hona chahiye; guard restore karo.' },
        ], 'Capacity, health aur ownership alag cheezein hain. Cleanup failure paths par bhi verify karo.', CODE.pool),
        lab('ex3-pool', 'Lab 3 · semaphore connection pool banao', ask("Raw semaphore ne double release par 3/2 dikhaya; fixed lease ke baad permits = 2, free = 2. Asli repair kya tha?",
          [
            "Ek baar wala close — ID aur permit dono theek ek-ek baar wapas aate hain",
            "Fair semaphore — fair semaphore 3 ko apne aap 2 kar deta hai, pahra zaroori nahi",
            "Sirf permit ek baar lautao — ID har close par free list mein jaaye toh koi dikkat nahi",
          ],
          [
            "Raw semaphore apni chhat nahi jaanta — zyada release se ginti 3 ho jaati hai. Lease ke close() ka ek baar wala pahra doosre return ko rokta hai.",
            "Fair ka matlab intezaar ka kram (pehle aao, pehle pao). Zyada release ki ginti theek nahi karta.",
            "ID do baar free list mein aaya toh agle do borrowers ko ek hi connection mil sakta hai. ID aur permit dono ek baar lautane hain.",
          ],
          "Kya semaphore khud zyada release rokta hai? Fixed version mein close() ke andar kya naya hai?")),
      ],
      interview: interview([
        ask("\"Chaar pods hain, har pod ka connection semaphore 10. Kya database ke liye kul hadd 10 bani?\"",
          [
            "Chaaron milkar 40 connections khol sakte hain; database ka budget pods mein baanto",
            "Semaphore ki ginti 10 saare processes ke beech apne aap baant li jaati hai",
            "Har connection ka ID alag hai, isliye kul hadd 10 hi bani rehti hai",
          ],
          [
            "Process ke andar ka semaphore sirf us process ki ginti rakhta hai. 4 × 10 = 40. Database ka kul budget pods, replicas aur deploy ke waqt ki extra pods mein baanto.",
            "JVM ke andar ka semaphore doosre processes se baat nahi karta.",
            "Alag ID ginti par kul chhat nahi lagate.",
          ],
          "Har pod ka semaphore kiski memory mein hai? Kya pods ek doosre ki ginti dekhte hain?"),
        ask("\"Pool ka borrow timeout aur query timeout — kya dono ek hi cheez hain?\"",
          [
            "Pehla connection milne ka intezaar hai; doosra query ke kaam ki deadline",
            "Borrow ka timer query khatam hone tak permit ka intezaar ginta rehta hai",
            "Query ka timer free list aur semaphore ki ginti reset kar deta hai",
          ],
          [
            "Andar aane ka intezaar aur kaam karna do alag hisse hain. User ki poori deadline dono mein baanto — jaise 200 ms borrow + 800 ms query.",
            "borrow ka intezaar permit milte hi khatam. Query ka waqt alag ginta hai.",
            "Query timeout free list ya permit ki ginti reset nahi karta. Aur timeout ka matlab \"driver ne query rokne ki koshish ki\" hai — database mein query sach mein ruki ya nahi, driver aur connection ki haalat se pata chalta hai.",
          ],
          "Borrow ka intezaar kab khatam hota hai: connection milte hi, ya query poori hone par?"),
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
            ask: ask("A ne stock pakda aur wallet maang raha hai; B ne wallet pakda aur stock maang raha hai. Ab kya hoga?",
              [
                "Dono ek doosre ke lock par atke — bahar se koi na chhudaaye toh aage nahi badhenge",
                "A ka reentrant lock B ko bhi andar aane dega, aur dono updates saath poore ho jaayenge",
                "Do locks hain, toh do cores dene par dono ko apna-apna chahiye wala lock mil jaayega",
              ],
              [
                "A ko B ka lock chahiye, B ko A ka — intezaar ka gola ban gaya. Is gole ka naam deadlock hai. Khaali CPU hone se kisi ka pakda hua lock nahi chhootta. Lab ka demo baad mein dono threads ko interrupt karta hai (lockInterruptibly), aur finally mein locks chhoot jaate hain — bina us cleanup ke dono atke rehte.",
                "Reentrant sirf lock ke maalik thread ke liye hai. B ke liye A ka lock band hai.",
                "CPU cores lock nahi chhudwate. Gola waisa hi rehta hai.",
              ],
              "A ko wallet chahiye — wallet kiske paas hai? Aur B ko stock?") },
          { title: '3. Real detector, bounded cleanup', say: 'Java ThreadMXBean is demo ke dono thread IDs ko deadlock report mein dhoondhta hai. Demo <code>lockInterruptibly()</code> use karta hai, phir dono threads interrupt karta hai. finally acquired locks chhodta hai. Plain <code>lock()</code> ko interrupt karna aisa escape guarantee nahi deta.',
            ask: ask("Demo interrupt se band hua. Kya production mein plain lock() wala deadlock bhi aise hi theek hoga?",
              [
                "Demo lockInterruptibly() par tika hai; plain lock() interrupt se nahi chhootta",
                "Thread.interrupt kisi bhi pakde hue lock ko maalik se zabardasti chheen leta hai",
                "Deadlock detector Java ke saare locks apne aap khol deta hai, koi bhi lock ho",
              ],
              [
                "Interrupt ek darkhwast hai, zabardasti nahi. lockInterruptibly() par ruka thread interrupt sun ke nikal aata hai, aur finally pakde locks chhod deta hai. Plain lock() par ruka thread interrupt ke baad bhi ruka rehta hai. ThreadMXBean sirf deadlock batata hai, theek nahi karta.",
                "interrupt kisi ka lock nahi chheenta. Sirf jagane ki darkhwast bhejta hai.",
                "Detector sirf report deta hai (kaunse threads atke). Locks kholna app ka kaam hai.",
              ],
              "Demo ne lock kaise liya tha: lock() ya lockInterruptibly()? Kya interrupt kisi ka lock chheen sakta hai?") },
          { title: '4. Same order ka repair', say: 'Fixed variant har path par pehle stock, phir wallet leta hai. Barrier locks ke beech nahi rakha. Ek thread wait kar sakta hai, par opposite-order cycle nahi banegi.', vars: { a: 'Stock → wallet → release', b: 'Stock → wallet → release', done: '2/2 in fixed run' } },
          { title: '5. Fine locks ki checklist', say: 'Multi-resource updates mein lock order ek jagah define karo. Pehle lock hold karke unknown callback ya slow network call karoge toh naye waits jud sakte hain. Har participating path ka order verify karo.',
            ask: ask("Do transfer raaste stock → wallet kram mein lock lete hain, teesra wallet → stock. Kya repair poora hai?",
              [
                "Teesra raasta ulta gola phir bana sakta hai; sab raaste ek hi kram mein lein",
                "Teesra raasta kam chalta hai, toh do aam raaston ka sahi kram kaafi hai",
                "Teesre raaste ko fair lock de do, toh ulte kram wala gola apne aap mit jaayega",
              ],
              [
                "Kram ka niyam tabhi kaam karta hai jab har raasta niyam maane. Kram ek jagah likho (jaise ID ke hisaab se), aur lock pakad ke anjaan callback ya dheema network call mat karo.",
                "Kam chalne wala raasta bhi kisi doosre thread ke saath ulta intezaar bana sakta hai. Har raaste ka kram sahi hona chahiye.",
                "Fair lock sirf intezaar ka kram badalta hai, gola nahi todta.",
              ],
              "Deadlock ke liye kitne ulte raaste chahiye? Teesra raasta pehle do mein se kisi ke saath kya bana sakta hai?") },
          { title: '6. Zinda thread, useful result?', say: 'CPU, heartbeat aur alive count akela progress nahi dikhata. Completed jobs, oldest pending age aur waits ka evidence rakho. Is lab ne counts aur lock cycle verify ki; production performance benchmark nahi kiya.' },
        ], 'Deadlock ka repair resource dependency ko badalta hai. Sirf aur threads ya CPU badhaana wait cycle nahi hataata.'),
        cards('Deadlock, livelock, starvation', [
          { title: '1. Dono raasta badalte rahe', say: '<b>Livelock</b>: tasks active rehte hain, par useful work nahi hota. MODEL: har round A/B same side choose karte hain, clash dekhkar dono side badalte hain. Chaar rounds baad moves hue, completions 0. Waiting deadlock aur active livelock alag hain.',
            ask: ask("Dono workers har takkar par ek saath ek hi taraf hat-te rahe; poora hua kaam 0. Kaunsa pattern hai?",
              [
                "Livelock — dono hil rahe hain aur jawab de rahe hain, par koi kaam poora nahi ho raha",
                "Deadlock — dono workers ek pakde hue lock par bina kuch badle chupchaap so rahe hain",
                "Sab theek — har baar taraf badalna ek poora hua kaam gina jaayega, toh progress hai",
              ],
              [
                "Livelock: kaam karne wale zinda aur vyast hain, par kuch poora nahi hota. Deadlock mein sab ruke rehte hain; livelock mein sab hilte rehte hain. MODEL: 4 rounds, completed = 0.",
                "Is trace mein workers har round state badal rahe hain — koi lock par ruka nahi.",
                "Hilna kaam nahi hai. Kaam ki ginti (completed) 0 hi rahi.",
              ],
              "Galiyare mein do log aamne-saamne: dono baar-baar ek hi taraf hat-te hain. Dono so rahe hain, ya hil rahe hain par aage nahi badh rahe?") },
          { title: '2. Priority se ek job bahar', say: '<b>Starvation</b>: doosre tasks progress karte hain, par ek task ko CPU, lock ya service baar-baar nahi milti. MODEL ki selection rule naya premium job aate hi normal job ko chhod deti hai. Chaar rounds ka wait infinite starvation ka proof nahi; endless premium arrivals par rule ka risk dekho.',
            ask: ask("Premium jobs poori hoti rahi, par normal job baar-baar nahi chuni gayi. Kaunsa khatra hai?",
              [
                "Starvation — system aage badh raha hai, par ek job ko baari mil hi nahi rahi",
                "Deadlock — premium aur normal dono lines mein ek bhi job poori nahi hui",
                "Livelock — premium jobs bhi sirf state badal rahi hain, koi kaam poora nahi hua",
              ],
              [
                "Starvation: baaki sab aage badhte hain, par ek kaam ko CPU, lock ya baari baar-baar nahi milti. Kul ginti theek dikh sakti hai — har kaam ka intezaar alag dekho. (Model ke 4 round hamesha ki bhookh ka saboot nahi; niyam ka khatra dekho.)",
                "Premium jobs poori ho rahi hain — sab ruke hote toh deadlock hota.",
                "Premium jobs ka kaam sach mein poora ho raha hai — sirf hilna nahi.",
              ],
              "Kya system mein kuch bhi aage badh raha hai? Agar haan, toh dikkat sabki hai ya ek job ki?") },
          { title: '3. Fairness aur retry limits', say: 'Queued fairness ya aging waiting tasks ko chance de sakti hai. <b>Aging</b> mein purane task ki priority badhti hai. Livelock ke retry budget aur independent delay symmetry todne mein madad kar sakte hain, par completion ki universal guarantee nahi.',
            ask: ask("CPU zyada, retries zyada, par poore hue kaam 0. Pehle kya jaancho?",
              [
                "Retries ka trace aur poore kaam dekho — sab hil rahe hain par kuch poora nahi?",
                "Threads aur badhao — zyada CPU par aur retries kami ko apne aap bhar dengi",
                "Sirf zinda workers gino — workers zinda hain toh kaam bhi poora ho raha hai",
              ],
              [
                "Vyast hona progress nahi. Koshishein, intezaar aur poore kaam saath dekho. Livelock ke liye retries ki hadd aur alag-alag random intezaar (jitter) symmetry todte hain — par har haal mein poora hone ki guarantee nahi.",
                "Zyada retries bhide hue system mein livelock aur bojh dono badha sakti hain.",
                "Zinda hona (heartbeat) kaam poora hone ka saboot nahi.",
              ],
              "Kya vyast hona aur kaam poora hona ek hi cheez hai? Retries aur poore kaam ka rishta kahan dikhega?") },
          { title: '4. Khud break–fix karo', say: 'DeadlockLab.ordered mein ek path ka order ulta karke thread joins ka timeout dekho; daemon/process guard ko mat hatao. Fixed version mein same total order restore karo. Model se scheduler ki real fairness benchmark claim mat karo.' },
        ], 'Deadlock: wait cycle. Livelock: active no-work cycle. Starvation: baaki tasks aage, ek task denied. Alag cause ke liye alag repair.', CODE.deadlock),
        lab('ex4-deadlock', 'Lab 4 · deadlock banao, detect karo, saaf karo', ask("Detector ne demo ke dono thread IDs pakde; same-order run mein 2/2 poore hue. Kya saabit hua?",
          [
            "Ulte kram wala deadlock dobara bana aur pakda gaya; same kram mein dono jobs poori hui",
            "Java har deadlock pakad ke app ke business badlaav bhi apne aap rollback kar deta hai",
            "Do jobs poori hui, toh scheduler aage bhi har task ko barabar baari deta rahega",
          ],
          [
            "Demo ka tay schedule aur safai jaanchi gayi. Is nateeje ko production recovery ki guarantee mat samjho: pakadna, lock kholna aur business rollback teen alag kaam hain.",
            "Pakadna, lock kholna aur business rollback alag-alag kaam hain. Java sirf pakadta hai.",
            "Do poore kaam aage ki har baari ka saboot nahi.",
          ],
          "Lab ne kitna dikhaya: is ek deadlock ko banana aur pakadna, ya har production deadlock ka ilaaj?")),
      ],
      interview: interview([
        ask("\"Fair lock laga diya, par A aur B do resources ulte kram mein lete hain. Kya deadlock ka khatra gaya?\"",
          [
            "Fair lock intezaar ka kram badalta hai, ulta gola nahi todta",
            "Fair lock dono resources ek hi thread ko ek saath de deta hai",
            "Fair lock intezaar shuru hote hi pehla pakda lock chhod deta hai",
          ],
          [
            "Sab raaste ek hi kram mein locks lein. Ek aur tareeka: doosra lock waqt par na mile (tryLock + timeout) toh pehla lock chhod ke baad mein koshish karo. Fair lock sirf intezaar karne walon ki baari sambhaalta hai; do resources lene ka kram nahi badalta.",
            "Har lock ki fairness alag hai. Do locks ek saath lene ka vaada nahi.",
            "Fair lock kisi ka pakda hua lock apne aap nahi chhudwata.",
          ],
          "Fair lock kya badalta hai: intezaar ka kram, ya locks lene ka kram?"),
        ask("\"Kul throughput theek hai, par ek tenant ka sabse purana intezaar badhta ja raha hai. Kya jaanchoge?\"",
          [
            "Har tenant ki line aur chunne ka niyam — kul ginti ek tenant ki bhookh chhupa leti hai",
            "Sirf kul poore kaam — kul theek hai toh har tenant ko apni baari mil hi rahi hogi",
            "Poore system ka CPU badhao — purane tenant ka intezaar sirf CPU se hi tay hota hai",
          ],
          [
            "Ausat ek tenant ka intezaar chhupa leta hai. Fairness, aging (purane kaam ki priority badhana) aur har tenant ka budget dekho.",
            "Poora hua kaam kisi aur tenant ka ho sakta hai. Kul ginti har tenant ki progress nahi.",
            "Chunne ka niyam, priority ya lock bhi intezaar badha sakte hain — sirf CPU nahi.",
          ],
          "Kul ginti theek ho toh kya har tenant ko baari mil rahi hai? Starvation kahan chhupti hai?"),
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
            ask: ask("Do jobs chal rahi hain, do intezaar mein; paanchvi submit par AbortPolicy ne reject kiya. Kaam ka haal kya hai?",
              [
                "Chaar jobs andar hain; paanchvi bahar — caller ko khud tay karna hai ki ab kya kare",
                "Paanchon jobs andar hain — reject ka matlab paanchvi job thodi der baad chalegi",
                "Sirf do jobs bachi — reject hote hi intezaar wali do jobs bhi hata di gayi",
              ],
              [
                "Queue bhari thi, isliye paanchvi job ko andar aane se mana hua (AbortPolicy caller ko exception deti hai). Andar aa chuki chaar jobs par koi asar nahi.",
                "AbortPolicy reject hui job ko baad ke liye kahin nahi rakhti.",
                "Intezaar wali jobs reject se cancel nahi hoti.",
              ],
              "Rasoi socho: 2 cook kaam par, bahar 2 kursiyan bhari. Paanchva grahak kahan baithega?") },
          { title: '4. Latch khola', say: 'Unbounded run 5 accepted jobs finish karta hai. Bounded run 4 accepted jobs finish karta hai, 1 reject hai. Fewer accepted jobs ko faster throughput ka proof mat bolo.', vars: { active: 'Shutdown ke baad 0', waiting: '0', outcome: 'Bounded: 4 done, 1 rejected' },
            ask: ask("Bounded run mein 4 jobs poori hui, unbounded mein 5. Kya bounded pool ne wahi kaam tez kiya?",
              [
                "Andar aaya kaam hi alag tha; yahan bas andar aane ki hadd jaanchi, raftaar nahi",
                "Chaar ka poora hona dikhata hai ki har job paanch wale run se tez chali",
                "Reject se paanchvi job ka nateeja bina chale hi mil gaya, toh kaam bacha",
              ],
              [
                "Bounded run ne 4 li aur 1 lautayi; unbounded ne 5 li. Ginti alag kaam ki hai, raftaar ki nahi. Reject hui job ka kya karna hai, caller ka faisla hai.",
                "Poore hue kaam ki ginti kisi job ka waqt nahi batati.",
                "Reject hui job chali hi nahi — koi nateeja nahi bana.",
              ],
              "Dono runs mein kitna kaam andar aaya? Kya lab ne kisi job ka waqt naapa?") },
          { title: '5. Backpressure ya silent loss?', say: '<b>Backpressure</b> overload ka signal intake tak pahunchata hai. Caller rejection ko ignore karega toh kaam kho sakta hai. CallerRunsPolicy jaisi policy submitter ko kaam karwa sakti hai; caller event-loop ho toh block hone ka risk evaluate karo.' },
          { title: '6. Fixed workers ka matlab bounded queue?', say: 'Java <code>Executors.newFixedThreadPool(2)</code> unbounded waiting queue use karta hai. Worker cap 2 hai, pending backlog ki cap nahi. Lab explicit ThreadPoolExecutor aur ArrayBlockingQueue(2) compare karta hai.',
            ask: ask("Worker threads tay 2 hain, par intezaar ki queue bina hadd ki hai. Kya overload mein memory ka khatra gaya?",
              [
                "Intezaar wali jobs badhti rahengi; queue ki hadd aur reject ka niyam bhi chahiye",
                "2 workers ki hadd intezaar wali saari jobs ko bhi 2 par hi rok deti hai",
                "Queue mein jobs ka bas naam rehta hai; request ka data memory mein nahi rehta",
              ],
              [
                "Java ka Executors.newFixedThreadPool(2) bina hadd ki queue lagata hai: kaam karne wale 2, par intezaar ki koi chhat nahi. Kaam ki hadd aur intezaar ki hadd do alag budget hain. Lab ThreadPoolExecutor + ArrayBlockingQueue(2) se dono hadd lagata hai.",
                "Worker ki setting queue ki capacity nahi lagati.",
                "Har job (Runnable) apna request data aur state pakde rehti hai.",
              ],
              "Do cook tay hain. Bahar kursiyan kitni hain? Bheed badhe toh bahar kya badhega?") },
        ], 'Thread cap aur queue cap dono chahiye. Rejection ko accepted/completed ka label mat do.'),
        cards('Same key, do workers: idempotency under concurrency', [
          { title: '1. Thread-safe map, unsafe workflow', say: '<b>Idempotency</b> mein same logical operation repeat hone par business effect dobara nahi lagna chahiye. <b>Race</b> tab bhi ho sakti hai jab map ki individual get/put thread-safe hon. Broken code mein do requests same key absent dekhti hain, phir dono effect karti hain.',
            ask: ask("ConcurrentHashMap par pehle get(key), phir effect, phir put(key). Kya duplicate effect ruka?",
              [
                "Dono requests key ko khaali dekh sakti hain; poora check-aur-effect ek saath bachao",
                "Map thread-safe hai, toh get aur baad ka effect apne aap ek hi step ban gaye",
                "Aakhri put pehle wala effect wapas le lega aur sirf naya nateeja rakhega",
              ],
              [
                "Map ki ek-ek call safe hai, par get aur effect ke beech doosri request aa sakti hai. Lab: broken code mein dono requests ne key khaali dekhi aur effect 2 baar hua. Key jaanchna aur pehla effect karna ek hi kadam mein bachana padega — agla card dikhata hai kaise.",
                "Map har call ko alag bachata hai — calls ke beech ka gap nahi.",
                "Map mein value badalne se pehle hua effect (jaise charge) wapas nahi hota.",
              ],
              "Map ki har call thread-safe hai. Par get aur put ke beech doosri request kya kar sakti hai?") },
          { title: '2. Same key ka atomic local claim', say: '<b>Atomic</b> ka matlab defined operation ka indivisible update hai. Lab per-key <code>compute</code> ke andar same payload check aur ek in-memory counter effect karta hai. Chaar requests ko same order-1 result milta hai; effect count 1. Naya key independent operation hai.',
            ask: ask("Wahi idempotency key, pehle 100 INR, phir 200 INR ka payload aaya. Sahi niyam kya hai?",
              [
                "Payload ka takraav mana karo — wahi key par naya operation bana ke charge mat karo",
                "Purana nateeja badal do — key wahi hai, toh 200 ka charge bhi dobara wala hi gino",
                "200 INR charge karo aur 200 ka nateeja rakh lo — body milaane ki zaroorat nahi",
              ],
              [
                "Key ka matlab \"ek hi operation\" hai, toh body bhi wahi honi chahiye. Lab: wahi key par alag body → reject (same key different body rejected = true). Naya operation chahiye toh nayi key.",
                "Badla hua operation purani key ke peeche chhupana galat charge chhupata hai.",
                "Body na milaane par caller ko galat nateeja ya do baar charge mil sakta hai.",
              ],
              "Wahi key ka matlab \"wahi operation\". Kya 200 INR wahi operation hai?") },
          { title: '3. Process crash ya doosra pod?', say: 'Lab ka map aur counter ek JVM ki memory mein hain. Real order/payment ko durable unique claim aur local transaction chahiye. Remote provider ke side effect ke liye stable provider idempotency key, supported contract aur unknown outcome ka status/reconciliation path chahiye. Network call ko map compute mein rakh dena distributed transaction nahi.',
            ask: ask("Payment ho gaya, par jawab se pehle JVM crash. Restart ke baad memory wala dedup map kitna bachayega?",
              [
                "Kuch nahi — map memory ke saath gaya; pakka record aur payment ka contract chahiye",
                "Poora bachayega — atomic compute map ko disk par likh ke hi wapas lautata hai",
                "Poora bachayega — fixed worker pool restart ke baad pichhle effects yaad rakhta hai",
              ],
              [
                "ConcurrentHashMap memory mein hai — crash ke saath khatam. Asli order/payment ko database mein pakka unique claim chahiye, aur payment provider ki apni idempotency key, aur nateeja na pata ho toh status jaanchne ka raasta. Network call ko compute ke andar mat rakho — compute us key ka lock pakde rehta hai.",
                "ConcurrentHashMap disk par kuch nahi likhta.",
                "Thread pool kaam chalane ki machine hai, effects ka khaata nahi.",
              ],
              "Map kahan rehta hai: disk par ya process ki memory mein? Crash ke baad memory ka kya hota hai?") },
          { title: '4. Build task aur production choice', say: 'WorkersLab.java mein bounded executor pehle khud configure karo: workers=2, queue=2, explicit rejection, shutdown. Dedup ke broken baseline ke saath fixed per-key claim banao. Production DB/provider design ki recovery policy alag likho.' },
        ], 'Same key ke concurrent callers ko one local effect mil sakta hai. Multi-process, crash aur external effects ki boundary alag enforce karo.', CODE.workers),
        lab('ex5-workers', 'Lab 5 · bounded thread pool aur duplicate execution', ask("Bounded run: 2 active / 2 queued / 1 rejected; fixed dedup mein effects = 1. Kya guarantee mili?",
          [
            "Ek JVM ke andar: andar aane ki hadd aur wahi key par ek hi effect — bas itna jaancha",
            "Har pod aur database par kul queue ki hadd aur exactly-once payment saabit hua",
            "Reject hui paanchvi job pakki jagah rakhi gayi; restart par pool paanchvi job chala dega",
          ],
          [
            "Lab ek JVM aur us JVM ki memory ka hai. Reject hui job ka kya karna hai (caller ka niyam), aur bahar ka pakka workflow — dono alag kaam hain.",
            "Ek JVM ke andar ki cheezein kai pods ya provider ki guarantee saabit nahi karti.",
            "AbortPolicy reject hui job ko kahin save nahi karti.",
          ],
          "Lab kitne JVM aur kahan ka data dekhta hai? Kya pods ya database lab mein the?")),
      ],
      interview: interview([
        ask("\"Bounded executor bhar gaya aur caller ne reject ko nazarandaaz kar diya. Backpressure ka kya nateeja?\"",
          [
            "Memory bachi, par caller ka kaam chupchaap kho sakta hai — reject ka nateeja aage batao",
            "Queue ki hadd hai, isliye reject hui job bhi consumer tak theek ek baar pahunchegi",
            "Caller ko kuch batane ki zaroorat nahi — worker ki ginti overload ka poora jawab hai",
          ],
          [
            "Hadd ne memory bachayi, par kaam ka sahi pahunchna alag zaroorat hai. Reject ko sambhalo: user ko \"abhi nahi\" batao, baad mein try karo, ya kahin pakka rakho.",
            "Reject hui job queue ka hissa bani hi nahi.",
            "Thread settings user ko \"hua\" ya \"nahi hua\" batane ki jagah nahi le sakti.",
          ],
          "Memory ka kya hua? Aur user ka kaam kahan gaya?"),
        ask("\"Payment retry par nayi idempotency key bana di. Timeout ne pehli payment ka nateeja nahi bataya. Khatra kya hai?\"",
          [
            "Pehla charge ho chuka ho sakta hai; nayi key duplicate charge ko naya operation bana degi",
            "Koi khatra nahi — timeout ka matlab provider ne payment ki hi nahi, nayi key safe hai",
            "Koi khatra nahi — bounded thread pool wahi body dekh ke nayi key ko purani se mila dega",
          ],
          [
            "Wahi operation ke liye wahi key aur wahi body dobara bhejo (provider ke contract ke hisaab se). Nateeja na pata ho toh status jaancho ya hisaab milao (reconciliation).",
            "Timeout sirf jawab ka na aana hai — payment hui ya nahi, pata nahi.",
            "Executor body ke hisaab se koi pakka dedup nahi karta.",
          ],
          "Timeout ka matlab \"payment nahi hui\" hai, ya \"jawab nahi aaya\"? Nayi key server ko kya batati hai?"),
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
