/* First Principles — FAANG Senior Engineer.
   Source credit: Master the Math of Scale (04ip8kPZXsM), numbered video 2/15.
   Evidence: docker-labs/52-scale-math/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "cook", "icon": "🍳", "label": "cooks", "x": 140, "y": 105}, {"id": "oven", "icon": "🔥", "label": "ek tandoor", "x": 445, "y": 105}, {"id": "cab", "icon": "🚕", "label": "doosri cab", "x": 750, "y": 105}];
const EDGES = [{"from": "cook", "to": "oven"}, {"from": "oven", "to": "cab"}];
VISUALS["fp-scale-kab"] = { t: "Cooks dugne, khaana utna hi der se — ek tandoor. Doosri cab book ki — kab madad, kab aur jam?", html: SD.viz.svg(HERO, EDGES, { nodes: { cook: {tone:'ok',badge:'20 cooks'}, oven: {tone:'slow',badge:'akela hissa'}, cab: {tone:'acc',badge:'p95 ke baad'} } }, {w:890,h:215}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-scale-kab",
  "icon": "📈",
  "group": "📈 Math of Scale",
  "title": "Scale 4 · Kab — machines badhao, copy bhejo, ya akela hissa dhoondo?",
  "badge": "Scale Ganitagya",
  "objectives": [
    "Akela (serial) hissa speed-up ki chhat kaise banata hai?",
    "Hedged request kab tail kaatti hai, kab nuksaan karti hai?",
    "Machines badhane se pehle kya dhoondna hai?"
  ],
  "lesson": [
    "<h3>🍳 Shaadi ka khaana: 20 cooks, ek tandoor</h3><p>Halwai ne cooks dugne kiye, par khaana utna hi der se aaya. Sabzi jaldi kat gayi; roti ek hi tandoor se aati rahi.</p><p>Aur jab ek cab der kare, log doosri bhi book kar lete hain. Kab ye chaal kaam karti hai, kab sabko aur fansaati hai — dono naapo.</p>"
  ],
  "stages": [
    {
      "type": "cards",
      "title": "🍳 20 cooks, ek tandoor",
      "goal": "Shaadi ke khaane mein sabzi kaatna 20 log saath kar sakte hain. Roti ek hi tandoor mein lagti hai. Cooks badhao — khaana kitna jaldi?",
      "lesson": "Akela hissa speed-up ki chhat banata hai: 5% akela kaam ho toh speed-up 20× se upar nahi. Machines badhane se pehle akela hissa dhoondo aur chhota karo.",
      "steps": [
        {
          "title": "1. Akela hissa",
          "say": "100 minute ka kaam: 95 minute sabzi (cooks baant sakte), 5 minute tandoor (ek hi). 1 cook: 100 min. 10 cooks: 5 + 95 ÷ 10 = 14.5 min. 100 cooks: 5 + 0.95 = 5.95 min.",
          "ask": {
            "q": "95% kaam baant sakte ho, 5% sirf akela chalta hai. Anant cooks ho jaayein toh kaam kitna tez?",
            "choices": [
              "Zyada se zyada 20 guna — 5% wala hissa hamesha utna hi samay lega",
              "Anant guna — cooks anant hain, toh samay shunya ke paas pahunch jaayega",
              "95 guna — 95% kaam baant sakte hain, toh speed bhi 95 guna tak jaayegi"
            ],
            "answer": 0,
            "hint": "Anant cooks par 95% wala hissa kitna samay leta hai, aur 5% wala?",
            "explain": "Baantne wala hissa shunya ke paas, par 5% wala hissa 5 minute hi rahega. 100 ÷ 5 = 20 guna chhat. Formula (Amdahl's law): speed-up = 1 ÷ (s + (1 − s) ÷ n); s = 0.05 par n anant → 20×.",
            "choiceExplanations": [
              "Baantne wala hissa shunya ke paas, par 5% wala hissa 5 minute hi rahega. 100 ÷ 5 = 20 guna chhat. Formula (Amdahl's law): speed-up = 1 ÷ (s + (1 − s) ÷ n); s = 0.05 par n anant → 20×.",
              "Akela hissa cooks ke saath chhota nahi hota. 5 minute hamesha bachte hain.",
              "Speed-up ki chhat 1 ÷ s se aati hai: 1 ÷ 0.05 = 20, 95 nahi."
            ]
          }
        },
        {
          "title": "2. Naam",
          "say": "Is niyam ka naam <b>Amdahl's law</b>: speed-up = 1 ÷ (s + (1 − s) ÷ n), s = akela (serial) hissa, n = workers. 5% par: 8 workers → 5.9×, 64 → 15.4×, 1024 → 19.6×. Akela hissa code mein aksar ek global lock, ek leader node, ek DB row ya ek counter hota hai."
        },
        {
          "title": "3. Lock wala akela hissa",
          "say": "Lab ex4 do tarah ka akela hissa naapta hai. <b>phase</b>: 5% kaam pehle akele, baaki sab rukte hain — formula yahi maanta hai. <b>lock</b>: har worker apna kaam karta hai, bas har 20th unit ek shared lock pakad ke. Jab ek worker lock mein hai, baaki workers apna bina-lock kaam karte rehte hain.",
          "ask": {
            "q": "12 workers par lock 5% wala run Amdahl ki line (7.74×) se upar 8.48–9.03× gaya. Matlab 20× ki chhat bhi tooti?",
            "choices": [
              "Nahi — lock ka kul kaam kabhi saath nahi chalta; chhat ab bhi 1 ÷ 0.05 = 20×",
              "Haan — lock wale kaam ko workers ne saath chala liya, isliye chhat bhi badhi",
              "Haan — Amdahl's law sirf purane single-core CPUs par lagta tha, aaj nahi"
            ],
            "answer": 0,
            "hint": "Lock ke andar wala 5% kaam ek pal mein kitne workers kar sakte hain?",
            "explain": "Line se upar isliye, kyunki lock wale pal mein baaki workers bina-lock kaam karte rahe; formula maanta hai ki serial hisse mein sab rukte hain. Par lock ka kaam ek waqt ek hi worker karta hai: 2000 units ka 5% (~25 ms) kabhi saath nahi chalega. Total samay 25 ms se kam nahi ho sakta, toh chhat 20× hi.",
            "choiceExplanations": [
              "Line se upar isliye, kyunki lock wale pal mein baaki workers bina-lock kaam karte rahe; formula maanta hai ki serial hisse mein sab rukte hain. Par lock ka kaam ek waqt ek hi worker karta hai: 2000 units ka 5% (~25 ms) kabhi saath nahi chalega. Total samay 25 ms se kam nahi ho sakta, toh chhat 20× hi.",
              "Lock ka kaam ek-ek karke hi chala — lock ka matlab hi yahi hai.",
              "Lab aaj ke 14-CPU machine par chala. Formula ki chhat aaj bhi lagti hai; sirf line ka aakaar badla."
            ]
          }
        },
        {
          "title": "4. Bottleneck khisakta hai",
          "say": "Video ki kahani: algorithm tez kiya → disk par atke → cache lagaya → network card bhar gaya → bada card lagaya → kernel ka lock. Ek bottleneck hatao, agla saamne aata hai. Sawaal: bottleneck <i>kahan</i> khiskao? Network bandwidth khareed sakte ho; DB lock contention ke liye design badalna padta hai. Lab ex4 lock 20%: 8 se 12 workers par speed-up badha hi nahi (3.65–4.05× → 3.74–3.87×), aur lock 88–89% samay held tha — shared lock ab bottleneck hai."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Asli threads: 5% aur 20% akela kaam",
      "project": "52-scale-math",
      "exercise": "ex4-amdahl",
      "goal": "2000 CPU units. Main thread akele, phir 1–12 worker threads: phase 5%, lock 5% aur lock 20%.",
      "why": "ex4 asli run hai: timing tumhari machine, CPU count aur us pal ke load par badlegi. Lab ke teen runs: 12 workers par phase 5% 6.28–6.64×, lock 5% 8.48–9.03×, lock 20% 3.74–3.87×.",
      "steps": [
        {
          "text": "Lab folder se (das-pandrah second lagte hain).",
          "cmd": "cd docker-labs/52-scale-math && npm start -- ex4-amdahl",
          "expect": "REAL RUN: Node v24.18.0, 14 logical CPUs, worker_threads; 2000 CPU work units; timings change run to run\nphase = 5% of units run alone first on the main thread (the \"foundation\"), then 95% split across workers\nlock 5%  = all units split across workers; every 20th unit runs while holding one shared lock\nlock 20% = same, but every 5th unit runs under the lock\neach time = median of 3 runs; workers are started and warmed up before timing\n\nmain thread alone, all 2000 units: 523 ms\n\nworkers  amdahl 5%  phase 5%          lock 5%           amdahl 20%  lock 20%\n      1      1.00×  522 ms  1.00×     521 ms  1.00×          1.00×  523 ms  1.00×\n      2      1.90×  277 ms  1.89×     264 ms  1.98×          1.67×  268 ms  1.95×\n      4      3.48×  157 ms  3.33×     139 ms  3.76×          2.50×  152 ms  3.45×\n      8      5.93×   95 ms  5.48×      77 ms  6.82×          3.33×  129 ms  4.05×\n     12      7.74×   79 ms  6.64×      58 ms  9.03×          3.75×  135 ms  3.87×\n\nlock detail (median run): locked units, lock held ÷ wall time, average wait per lock\nworkers  lock 5%: units  held    wait/lock   lock 20%: units  held    wait/lock\n      1             100     5%    0.00 ms              400    20%    0.00 ms\n      2             100    10%    0.02 ms              400    40%    0.01 ms\n      4             100    20%    0.04 ms              400    77%    0.15 ms\n      8             100    37%    0.08 ms              400    88%    1.11 ms\n     12             100    52%    0.31 ms              400    88%    2.28 ms\n\nMODEL: Amdahl speed-up = 1 ÷ (s + (1 − s) ÷ n), s = serial share\nn          s = 1%    s = 5%    s = 20%\n2             2.0×     1.9×      1.7×\n4             3.9×     3.5×      2.5×\n8             7.5×     5.9×      3.3×\n16           13.9×     9.1×      4.0×\n64           39.3×    15.4×      4.7×\n1024         91.2×    19.6×      5.0×\ninfinite    100.0×    20.0×      5.0×"
        },
        {
          "text": "npm start -- ex4-amdahl dobara chalao: asli run ke numbers thode badalte hain.",
          "cmd": "npm start -- ex4-amdahl",
          "expect": "REAL RUN: Node v24.18.0, 14 logical CPUs, worker_threads; 2000 CPU work units; timings change run to run\nphase = 5% of units run alone first on the main thread (the \"foundation\"), then 95% split across workers\nlock 5%  = all units split across workers; every 20th unit runs while holding one shared lock\nlock 20% = same, but every 5th unit runs under the lock\neach time = median of 3 runs; workers are started and warmed up before timing\n\nmain thread alone, all 2000 units: 484 ms\n\nworkers  amdahl 5%  phase 5%          lock 5%           amdahl 20%  lock 20%\n      1      1.00×  495 ms  0.98×     489 ms  0.99×          1.00×  492 ms  0.98×\n      2      1.90×  273 ms  1.77×     263 ms  1.84×          1.67×  257 ms  1.88×\n      4      3.48×  157 ms  3.08×     142 ms  3.41×          2.50×  158 ms  3.06×\n      8      5.93×  101 ms  4.77×      77 ms  6.26×          3.33×  133 ms  3.65×\n     12      7.74×   77 ms  6.28×      56 ms  8.67×          3.75×  128 ms  3.77×\n\nlock detail (median run): locked units, lock held ÷ wall time, average wait per lock\nworkers  lock 5%: units  held    wait/lock   lock 20%: units  held    wait/lock\n      1             100     5%    0.00 ms              400    20%    0.00 ms\n      2             100    10%    0.01 ms              400    39%    0.01 ms\n      4             100    20%    0.06 ms              400    77%    0.19 ms\n      8             100    38%    0.08 ms              400    88%    1.12 ms\n     12             100    53%    0.29 ms              400    89%    2.16 ms\n\nMODEL: Amdahl speed-up = 1 ÷ (s + (1 − s) ÷ n), s = serial share\nn          s = 1%    s = 5%    s = 20%\n2             2.0×     1.9×      1.7×\n4             3.9×     3.5×      2.5×\n8             7.5×     5.9×      3.3×\n16           13.9×     9.1×      4.0×\n64           39.3×    15.4×      4.7×\n1024         91.2×    19.6×      5.0×\ninfinite    100.0×    20.0×      5.0×"
        }
      ],
      "observe": {
        "q": "Pehle run mein lock 20%: 8 workers par 4.05×, 12 par 3.87×. Workers badhe, speed nahi badhi. Kyun?",
        "choices": [
          "Lock wala 20% kaam ek-ek karke chalta hai; lock ~88% samay bhara — shared lock bottleneck",
          "12 workers ke liye machine mein CPU kam pad gaye — 14 CPUs mein 12 threads nahi chalte",
          "Worker threads shuru hone mein itna samay lagta hai ki 12 par sab barbaad hota hai"
        ],
        "answer": 0,
        "hint": "20% lock par chhat kitni hai, aur lock haath badalne mein kya kharch hota hai?",
        "explain": "Lock ka kaam 523 ms ka 20% ≈ 105 ms; ek waqt ek worker, toh chhat 5×. Lab ki lock detail: 8 aur 12 workers par lock wall time ka 88–89% held, aur har lock ka ausat intezaar ~1.1 se ~2.2 ms. Workers badhane se lock ki line bas lambi hoti hai. 5× se neeche rukne ki poori wajah lab alag se nahi naapta.",
        "choiceExplanations": [
          "Lock ka kaam 523 ms ka 20% ≈ 105 ms; ek waqt ek worker, toh chhat 5×. Lab ki lock detail: 8 aur 12 workers par lock wall time ka 88–89% held, aur har lock ka ausat intezaar ~1.1 se ~2.2 ms. Workers badhane se lock ki line bas lambi hoti hai. 5× se neeche rukne ki poori wajah lab alag se nahi naapta.",
          "14 logical CPUs par 12 threads chal jaate hain; lock 5% wala run 12 par 9.03× tak gaya.",
          "Lab mein workers timing se pehle hi shuru aur garam kiye jaate hain."
        ]
      },
      "lesson": "Akela hissa chhat banata hai. Lock wala akela hissa formula se behtar chal sakta hai, par chhat 1 ÷ s hi rehti hai; aur jab lock poora bhar jaaye, workers badhana bekaar."
    },
    {
      "type": "cards",
      "title": "🚕 Do cab book karo, jo pehle aaye",
      "goal": "Ola par cab book ki. 5 minute mein nahi aayi toh doosri app se bhi book karo, jo cab pehle aaye us cab mein baitho, doosri cancel. Dheemi requests ke saath bhi yahi kar sakte hain.",
      "lesson": "Hedging alag-alag (independent) dheemapan ko kaatti hai. Request khud bhaari ho toh doosri copy service time nahi ghataati — sirf line ka intezaar bacha sakti hai, aur kaam badhati hai; naap ke dekho. Busy system par bina budget aur cancel ke hedging line badha ke sab bigaad sakti hai.",
      "steps": [
        {
          "title": "1. Hedged request",
          "say": "Request ek server ko bhejo. p95 jitna intezaar ho gaya aur jawab nahi aaya, toh request ki doosri copy doosre server ko bhejo. Jo copy pehle jawab de, pehla jawab lo; doosri cancel. Sirf ~5% requests p95 se aage jaati hain, toh doosri copy bhi ~5% ko — jab tak copies khud latency na badlein.",
          "ask": {
            "q": "Dono servers ka dheemapan alag-alag, har ek 1% baar. Dono copies ek saath dheemi hone ka chance?",
            "choices": [
              "0.01 × 0.01 = 0.0001, yaani 0.01% — par sirf jab dheemapan sach mein alag-alag ho",
              "0.01 × 0.01 = 0.1, yaani 10% — do dheemi copies ka chance ek copy se zyada",
              "2% — do copies hain, aur har copy ka dheema hone ka chance 1%"
            ],
            "answer": 0,
            "hint": "0.01 × 0.01 ko decimal mein likho.",
            "explain": "0.01 × 0.01 = 0.0001 = 0.01%. Video ne 0.01 × 0.01 ko 0.1 likha tha — galat. Ye hisaab sirf tab sahi hai jab doosre server ka dheemapan pehle se alag ho. Dean & Barroso: \"The technique works because the source of latency is often not inherent in the particular request but rather due to other forms of interference.\"",
            "choiceExplanations": [
              "0.01 × 0.01 = 0.0001 = 0.01%. Video ne 0.01 × 0.01 ko 0.1 likha tha — galat. Ye hisaab sirf tab sahi hai jab doosre server ka dheemapan pehle se alag ho. Dean & Barroso: \"The technique works because the source of latency is often not inherent in the particular request but rather due to other forms of interference.\"",
              "0.01 × 0.01 = 0.0001, 0.1 nahi. Dono chhote number ka guna aur chhota hota hai.",
              "2% kam se kam ek copy ke dheeme hone ka mote taur par chance hai; dono ek saath dheemi hone ka nahi."
            ]
          }
        },
        {
          "title": "2. Paper ka asli number",
          "say": "Video: hedging se tail \"100×\" ghati. Paper ka benchmark: \"sending a hedging request after a 10ms delay reduces the 99.9th-percentile latency for retrieving all 1,000 values from 1,800ms to 74ms while sending just 2% more requests\" — ek benchmark, ~24×. Lab ex5 (30% load): p99 201 → 138 ms."
        },
        {
          "title": "3. Request khud bhaari ho toh?",
          "say": "Ab dheemapan server mein nahi, request mein hai: 1% requests bhaari, kisi bhi server par 200 ms.",
          "ask": {
            "q": "1% requests har server par 200 ms leti hain. p95 ke baad doosri copy bhejo toh p99?",
            "choices": [
              "Lab (seed 52) mein bigda — copy bhi 200 ms leti hai aur doosre server ka kaam badhati hai",
              "Aadha — doosra server khaali hai, toh bhaari request doosre server par jaldi poori hogi",
              "Aadha — har bhaari request ki do copies, toh har copy ke hisse aadha kaam"
            ],
            "answer": 0,
            "hint": "Bhaari request doosre server par kitna samay legi?",
            "explain": "Bhaari request har jagah 200 ms leti hai; doosri copy sirf line ka intezaar bacha sakti hai, aur extra kaam jodti hai. Lab ex5 heavy (seed 52), 30% load: p99 204 ms se 227–299 ms — in runs mein har hedging policy ne bigaada. Budget + cancel par copies sirf 1.2% chali, par extra kaam 18.2% ms — bhaari duplicate mehenge. Doosre server ki chhoti line kabhi intezaar ghata sakti hai, toh apne workload par extra ms aur line ka intezaar naapo.",
            "choiceExplanations": [
              "Bhaari request har jagah 200 ms leti hai; doosri copy sirf line ka intezaar bacha sakti hai, aur extra kaam jodti hai. Lab ex5 heavy (seed 52), 30% load: p99 204 ms se 227–299 ms — in runs mein har hedging policy ne bigaada. Budget + cancel par copies sirf 1.2% chali, par extra kaam 18.2% ms — bhaari duplicate mehenge. Doosre server ki chhoti line kabhi intezaar ghata sakti hai, toh apne workload par extra ms aur line ka intezaar naapo.",
              "Doosra server khaali ho tab bhi bhaari request 200 ms legi; copy sirf line ka intezaar bacha sakti hai.",
              "Doosri copy poora kaam dobara karti hai — kaam baant-ti nahi, dohraati hai."
            ]
          }
        },
        {
          "title": "4. Busy system: budget aur cancel",
          "say": "Lab ex5, 60% load: bina hadd ki hedging ne 89% requests ki doosri copy bheji, p50 59 s. Copies ne line badhayi → zyada requests p95 se aage → aur copies. Budget (max 5% copies) ne bhaagna roka, par bina cancel 85% load par p99 785 → 2758 ms. Budget + cancel (line mein khadi copy hatao): har load par p99 behtar. Paper bhi: \"naive implementations of this technique typically add unacceptable additional load\"."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Hedging: kam load, busy load, bhaari request",
      "project": "52-scale-math",
      "exercise": "ex5-hedge",
      "goal": "Do servers, 1,00,000 requests. 30%, 60% aur 85% load par: no hedge, hedge, hedge + budget, hedge + budget + cancel.",
      "why": "Node 22+ chahiye. Seeded simulation (seed 52), teeno runs byte-identical. Hedge wait = har row ke load par bina hedge wali p95.",
      "steps": [
        {
          "text": "Lab folder se: 1% copies us server par 200 ms (alag-alag).",
          "cmd": "cd docker-labs/52-scale-math && npm start -- ex5-hedge",
          "expect": "MODEL: seeded simulation (seed 52), two servers, one worker and one FIFO line each, 1,00,000 requests per row\nnormal work: random, avg 8 ms\nstragglers: 1% of copies hit a 200 ms pause on that server only (independent)\nhedge wait = p95 of the no-hedge row at the same load; budget = at most 5% of requests get a spare copy\ncancel = a spare copy still waiting in line is dropped once the other copy answers (a running copy is not stopped)\ncopies sent = spare copies sent; copies run = spare copies that started; extra ms = service time of extra copies ÷ first copies\n\nload  policy                 hedge wait  p50       p99       p99.9     copies sent  copies run  extra ms  busy\n 30%  no hedge                         —    8.3 ms    201 ms    308 ms         0.0%        0.0%      0.0%  29.8%\n 30%  hedge                       115 ms    8.5 ms    146 ms    211 ms         5.3%        5.3%      5.6%  31.5%\n 30%  hedge + budget              115 ms    8.6 ms    150 ms    243 ms         4.9%        4.9%      4.9%  31.3%\n 30%  hedge + budget + cancel     115 ms    8.3 ms    138 ms    199 ms         4.3%        1.5%      1.6%  30.3%\n 60%  no hedge                         —   15.8 ms    361 ms    532 ms         0.0%        0.0%      0.0%  59.5%\n 60%  hedge                       209 ms    59.2 s   143.5 s   144.4 s        89.3%       89.3%     90.1%  95.9%\n 60%  hedge + budget              209 ms   18.2 ms    441 ms    766 ms         5.0%        5.0%      5.0%  62.7%\n 60%  hedge + budget + cancel     209 ms   16.3 ms    254 ms    379 ms         4.2%        1.3%      1.3%  60.4%\n 85%  no hedge                         —   73.9 ms    785 ms    968 ms         0.0%        0.0%      0.0%  84.3%\n 85%  hedge                       540 ms   186.8 s   383.5 s   387.3 s        96.8%       96.8%     96.6%  99.1%\n 85%  hedge + budget              540 ms    187 ms   2758 ms   3876 ms         5.0%        5.0%      5.0%  88.7%\n 85%  hedge + budget + cancel     540 ms   73.4 ms    677 ms    948 ms         3.9%        0.4%      0.4%  84.6%"
        },
        {
          "text": "Ab 1% requests khud bhaari (har server par 200 ms).",
          "cmd": "npm start -- ex5-hedge heavy",
          "expect": "MODEL: seeded simulation (seed 52), two servers, one worker and one FIFO line each, 1,00,000 requests per row\nnormal work: random, avg 8 ms\nstragglers: 1% of requests are heavy and take 200 ms on either server (same request, same slowness)\nhedge wait = p95 of the no-hedge row at the same load; budget = at most 5% of requests get a spare copy\ncancel = a spare copy still waiting in line is dropped once the other copy answers (a running copy is not stopped)\ncopies sent = spare copies sent; copies run = spare copies that started; extra ms = service time of extra copies ÷ first copies\n\nload  policy                 hedge wait  p50       p99       p99.9     copies sent  copies run  extra ms  busy\n 30%  no hedge                         —    8.4 ms    204 ms    333 ms         0.0%        0.0%      0.0%  30.1%\n 30%  hedge                       123 ms   10.3 ms    299 ms    436 ms        11.6%       11.6%     29.2%  38.9%\n 30%  hedge + budget              123 ms    9.7 ms    270 ms    417 ms         5.0%        5.0%     21.4%  36.5%\n 30%  hedge + budget + cancel     123 ms    9.4 ms    227 ms    371 ms         5.0%        1.2%     18.2%  35.6%\n 60%  no hedge                         —   16.3 ms    372 ms    572 ms         0.0%        0.0%      0.0%  60.2%\n 60%  hedge                       223 ms    73.4 s   157.3 s   158.0 s        94.6%       94.6%     94.9%  98.2%\n 60%  hedge + budget              223 ms   22.2 ms    563 ms    950 ms         5.0%        5.0%      9.7%  66.2%\n 60%  hedge + budget + cancel     223 ms   19.2 ms    408 ms    629 ms         5.0%        0.6%      5.8%  63.7%\n 85%  no hedge                         —   86.8 ms    960 ms   1329 ms         0.0%        0.0%      0.0%  85.3%\n 85%  hedge                       639 ms   179.1 s   382.9 s   385.9 s        93.8%       93.8%     93.5%  99.4%\n 85%  hedge + budget              639 ms    258 ms   2506 ms   3060 ms         4.9%        4.9%      6.6%  90.8%\n 85%  hedge + budget + cancel     639 ms    109 ms   1091 ms   1352 ms         4.9%        0.2%      1.1%  86.1%"
        }
      ],
      "observe": {
        "q": "60% load, bina budget: 89.3% requests ki doosri copy, p50 59.2 s. Hedge wait p95 (209 ms) tha, jo ~5% requests ko lagna chahiye tha. Kya hua?",
        "choices": [
          "Copies se line badhi → zyada requests 209 ms se aage → aur copies: chakkar",
          "Simulation ka bug — p95 ke baad hamesha 5% hi copies jaati hain, 89% ho hi nahi sakta",
          "60% load par servers ka kaam dheema ho gaya, isliye har request 209 ms se aage gayi"
        ],
        "answer": 0,
        "hint": "Doosri copy kahan khadi hoti hai, aur us line ka baaki requests par kya asar?",
        "explain": "209 ms bina hedge wali p95 thi. Copies ne servers ka kaam badhaya (busy 59.5% → 95.9%), line lambi hui, aur zyada requests 209 ms se aage gayi — har ek ki aur copy. Ek apne aap badhne wala chakkar (feedback loop) ban gaya. Fixed p95 wait ~5% copies tabhi deta hai jab copies khud latency na badlein; isliye budget aur cancel.",
        "choiceExplanations": [
          "209 ms bina hedge wali p95 thi. Copies ne servers ka kaam badhaya (busy 59.5% → 95.9%), line lambi hui, aur zyada requests 209 ms se aage gayi — har ek ki aur copy. Ek apne aap badhne wala chakkar (feedback loop) ban gaya. Fixed p95 wait ~5% copies tabhi deta hai jab copies khud latency na badlein; isliye budget aur cancel.",
          "5% ka hisaab bina hedge wali duniya ka hai. Copies duniya badal deti hain — p95 khud aage khisak jaati hai.",
          "Normal kaam har load par avg 8 ms hai. Badha intezaar line ka hai, kaam ka nahi."
        ]
      },
      "lesson": "Hedging kam load par aur alag-alag dheemapan par kaam aayi. Bhaari request wale seed 52 runs mein p99 bigda. Busy system par budget + cancel ke bina khatarnaak."
    },
    {
      "type": "bins",
      "title": "⚖️ Kya karoge: hedge, mat karo, ya akela hissa dhoondo?",
      "instructions": "Dheemapan ek server ki alag dikkat (GC, background kaam, ek raaste ka blip) se ho aur dobara bhejna safe ho toh 🪞 chuno. Dobara bhejna khatarnaak ho, ya request khud bhaari ho aur doosri copy ke paas bachane ko intezaar na ho toh 🚫 chuno. Machines badhane par bhi speed na badhe toh 🔍 chuno.",
      "bins": [
        {
          "id": "hedge",
          "label": "🪞 Hedge (budget + cancel)"
        },
        {
          "id": "no",
          "label": "🚫 Hedge mat karo"
        },
        {
          "id": "serial",
          "label": "🔍 Akela hissa dhoondo"
        }
      ],
      "items": [
        {
          "text": "Search ke 50 replicas; kabhi ek replica GC mein 200 ms rukta hai. Load 30%, read-only query",
          "bin": "hedge",
          "explain": "GC wala dheemapan ek replica ka hai, request ka nahi; doosra replica aksar tez. Read-only, toh dobara bhejna safe. Budget + cancel ke saath."
        },
        {
          "text": "Monthly report query har replica par 3 s service leti hai; replicas ki lines khaali hain",
          "bin": "no",
          "explain": "Lines khaali hain, toh doosri copy ke paas bachane ko koi intezaar nahi. Doosri copy bhi 3 s legi aur doosre replica ka 3 s kaam khaayegi. Lab ex5 heavy (seed 52): hedging ne p99 bigaada."
        },
        {
          "text": "Payment API, idempotency key nahi: doosri request se paisa do baar kat sakta hai",
          "bin": "no",
          "explain": "Hedging ek hi request do baar bhejti hai. Dobara bhejna safe na ho toh hedge nahi — pehle idempotency key."
        },
        {
          "text": "Read-only cache lookup, 3 replicas alag switches aur network paths par; kabhi sirf ek replica ka path rukta hai. Load kam",
          "bin": "hedge",
          "explain": "Dheemapan ek replica ke path tak simit hai; doosra replica alag path par hai. Lookup dobara bhejna safe hai — naape hue delay, budget aur cancel ke saath hedge."
        },
        {
          "text": "Workers 4 se 16 kiye, speed 3.7× par ruki; profile mein ek global lock",
          "bin": "serial",
          "explain": "Lock wala kaam ek-ek karke chalta hai — lock hi chhat hai. Workers nahi, lock ke andar ka kaam chhota karo ya lock baanto."
        },
        {
          "text": "Har order ek hi \"inventory\" DB row update karta hai; servers dugne kiye, throughput nahi badha",
          "bin": "serial",
          "explain": "Ek row par sab line mein — akela hissa. Row baanto (jaise har warehouse ki apni row) ya kaam ko jodna (batch) seekho."
        },
        {
          "text": "Leader node har write ko kram mein lagata hai; nodes 3 se 6 kiye, writes nahi badhe",
          "bin": "serial",
          "explain": "Saari writes ek leader se guzarti hain — serial hissa. Nodes badhane se padhna badh sakta hai, likhna nahi. Sharding jaisa design chahiye."
        }
      ],
      "lesson": "Pehle poochho: dheemapan kahan se aata hai, aur dobara bhejna safe hai? Hedging server ki alag dikkat ke liye. Machines se speed na badhe toh akela hissa dhoondo."
    }
  ],
  "interview": {
    "title": "Interview Round — scale ke faisle",
    "instructions": "Pehle socho: kaam ka kaunsa hissa akela chalta hai, aur dheemapan kahan se aata hai? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Batch job ko 8 se 64 machines par le gaye, par time sirf 2.5× ghata. Profile: ek global counter har record par lock leta hai. Agla kadam?",
        "choices": [
          "Lock wala hissa chhota karo — counter ko har machine par alag gino, aakhir mein jodo",
          "Machines 64 se 256 kar do — 4 guna machines, toh kaam bhi lagbhag 4 guna tez",
          "Har machine ka CPU bada kar do — tez CPU par lock bhi jaldi chhootega, sab theek",
          "Batch ko raat mein chalao — din ke traffic se takraav hi dheemapan ki asli wajah hai"
        ],
        "answer": 0,
        "explain": "Lock wala hissa serial hai; machines badhane se sirf lock ki line lambi hoti hai. Har machine apna counter rakhe aur aakhir mein jode — serial hissa lagbhag shunya. Amdahl: chhat 1 ÷ s; s ghatao, machines nahi.",
        "choiceExplanations": [
          "Lock wala hissa serial hai; machines badhane se sirf lock ki line lambi hoti hai. Har machine apna counter rakhe aur aakhir mein jode — serial hissa lagbhag shunya. Amdahl: chhat 1 ÷ s; s ghatao, machines nahi.",
          "Serial hissa chhota nahi hoga; chhat 1 ÷ s se upar nahi jaayegi. Lab ex4 lock 20%: 8 se 12 workers par kuch nahi badha.",
          "Tez CPU har kaam tez karta hai, par lock ek waqt ek hi machine ko deta hai — speed-up ki chhat 1 ÷ s.",
          "Profile ne global lock dikhaya; samay badalne se lock nahi hatega."
        ]
      },
      {
        "q": "Search service 100 shards se jawab jodti hai; p99 kharab hai, servers 70% busy hain. Team ka niyam: hedging tabhi jab teen cheezein hon — is workload par naapa hua delay, copies ki pakki hadd, aur line mein khadi haari copy ka cancel. Kaunsa plan teeno poore karta hai?",
        "choices": [
          "Is workload ki p95 par doosri copy, max 5% copies, aur line mein khadi haari copy cancel",
          "p95 par doosri copy aur max 5% copies; line mein khadi haari copy ko bhi chalne do",
          "p95 par doosri copy aur cancel; hadd nahi chahiye, p95 khud copies ko 5% par rakhta hai",
          "Paper wala 10 ms delay, max 5% copies aur cancel — paper ke benchmark mein yahi chala"
        ],
        "answer": 0,
        "explain": "Teeno shartein sirf pehle plan mein: delay is workload se naapa (p95), copies ki pakki hadd (5%), aur line mein khadi haari copy cancel. Lab ex5: bina hadd 60% load par runaway (89% copies); hadd ke saath bina cancel 85% par p99 785 → 2758 ms; budget + cancel har load par p99 behtar. Paper: \"The client cancels remaining outstanding requests once the first result is received.\"",
        "choiceExplanations": [
          "Teeno shartein sirf pehle plan mein: delay is workload se naapa (p95), copies ki pakki hadd (5%), aur line mein khadi haari copy cancel. Lab ex5: bina hadd 60% load par runaway (89% copies); hadd ke saath bina cancel 85% par p99 785 → 2758 ms; budget + cancel har load par p99 behtar. Paper: \"The client cancels remaining outstanding requests once the first result is received.\"",
          "Cancel ke bina haari copies bhi chalti hain — lab mein 85% load par p99 785 → 2758 ms.",
          "p95 bina hedge wali duniya ka hai; copies line badhati hain aur p95 khisak jaati hai — lab mein 60% par 89% copies.",
          "10 ms paper ke BigTable benchmark ka number hai; is search service ka delay yahan naapna padega."
        ]
      }
    ]
  },
  "success": [
    "Amdahl se speed-up ki chhat nikaal sakte ho",
    "Hedging ki teen shartein bata sakte ho: alag dheemapan, safe dobara bhejna, budget + cancel",
    "Machines badhane se pehle akela hissa dhoond sakte ho"
  ],
  "cards": [
    {
      "front": "5% akela kaam — anant machines par speed-up?",
      "back": "Zyada se zyada 1 ÷ 0.05 = 20×. Amdahl: 1 ÷ (s + (1 − s) ÷ n). 8 workers → 5.9×."
    },
    {
      "front": "Hedged request kab kaam karti hai?",
      "back": "Jab dheemapan server ki alag dikkat ho (GC, blip), request ka apna nahi; dobara bhejna safe ho; aur busy system par budget + cancel ho."
    },
    {
      "front": "Bina budget hedging ka khatra?",
      "back": "Copies line badhati hain → zyada requests p95 se aage → aur copies. Lab: 60% load par 89% copies, p50 59 s."
    }
  ]
}
]);
})();
