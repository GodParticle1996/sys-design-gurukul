/* Playlist · EDA Core topic 3: EDA tradeoffs. Source credit: Software Developer Diaries (Of-br0OG5ic, ttEYKoP53DM).
   Numbers: docker-labs/48-eda-tradeoffs/captures; source code byte-checked. */
(function () {
const HERO = [{"id": "flow", "icon": "⏱️", "label": "flow.js", "x": 140, "y": 105}, {"id": "queue", "icon": "⏳", "label": "queue.js", "x": 445, "y": 105}, {"id": "step", "icon": "🔗", "label": "step.js", "x": 750, "y": 105}];
const EDGES = [{"from": "flow", "to": "queue"}, {"from": "queue", "to": "step"}];
VISUALS["et-code"] = { t: "Teen chhoti files: reject ya line, retention ka jhaadu, aur failure ki khabar.", html: SD.viz.svg(HERO, EDGES, { nodes: { flow: {tone:'acc',badge:'reject ya line'}, queue: {tone:'slow',badge:'retention'}, step: {tone:'bad',badge:'OrderFailed?'} } }, {w:890,h:215}) };
SD.registerLevels('sdd-eda', [
{
  "id": "et-code",
  "icon": "💻",
  "group": "⚖️ EDA Tradeoffs",
  "title": "Tradeoff 3 · Code — reject, retention aur failure ki khabar ki asli lines",
  "badge": "Line Lohaar",
  "objectives": [
    "Code mein reject aur line ka farak kis line par hai?",
    "Retention ka jhaadu message ko kab aur kahan hataata hai?",
    "Direct mein failure apne aap kaise laut-ta hai, events mein kyun nahi?",
    "Asli system mein kya naapna aur tay karna hai?"
  ],
  "lesson": [
    "<h3>💻 Lab 48 ki teen chhoti files</h3><p>Ek tick ka hisaab, retention ka jhaadu, aur ek kadam jo fail ho sakta hai. Chamakti line ko state ke saath padho — code panes mein asli lab files ki lines hain.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "⏱️ Ek tick: reject ya line?",
      "goal": "lib/flow.js ka loop har tick (second ya minute) chalta hai. Sale ka pehla second: 60 aaye, capacity 20.",
      "code": {
        "title": "lib/flow.js",
        "file": "docker-labs/48-eda-tradeoffs/lib/flow.js",
        "from": 11,
        "text": "    const now = i * tickMs, cap = down(i) ? 0 : workers * perWorker;\n    const n = arrivals(i);\n    arrived += n;\n    if (!queue) {\n      done += Math.min(n, cap);\n      rejected += Math.max(0, n - cap);\n    } else {\n      for (let k = 0; k < n; k++) q.publish({ i }, now);\n      for (let k = 0; k < cap; k++) {\n        const m = q.take(now);\n        if (!m) break;\n        done++;\n        maxWaitMs = Math.max(maxWaitMs, m.waitedMs);\n      }"
      },
      "vars": [
        {
          "id": "n",
          "label": "Is tick aaye (n)"
        },
        {
          "id": "cap",
          "label": "Capacity (cap)"
        },
        {
          "id": "done",
          "label": "Hue"
        },
        {
          "id": "rej",
          "label": "Reject"
        },
        {
          "id": "line",
          "label": "Line"
        }
      ],
      "steps": [
        {
          "title": "1. Is tick ki capacity",
          "say": "Line 11: consumer band ho toh 0, warna workers × har worker ki raftaar. Yahan 1 × 20 = 20.",
          "line": "11",
          "vars": {
            "n": "—",
            "cap": "20",
            "done": "0",
            "rej": "0",
            "line": "0"
          }
        },
        {
          "title": "2. Kitne aaye",
          "say": "Lines 12–13: is tick 60 aaye; kul aaye mein jode.",
          "line": "12-13",
          "vars": {
            "n": "60",
            "cap": "20",
            "done": "0",
            "rej": "0",
            "line": "0"
          }
        },
        {
          "title": "3. Bina line: jitna ho sake, baaki mana",
          "say": "Lines 14–16: queue nahi. Capacity tak kaam hua, baaki aane wale tick mein hi reject.",
          "line": "14-16",
          "vars": {
            "n": "60",
            "cap": "20",
            "done": "20",
            "rej": "40",
            "line": "0"
          },
          "ask": {
            "q": "queue = false, n = 60, cap = 20. Is tick ke baad kya hua?",
            "choices": [
              "20 hue, 40 reject — line 16 capacity se upar ka hissa gin ke chhod deti hai",
              "60 hue — line 15 sab ko capacity ke andar le aati hai",
              "20 hue, 40 agle tick ke liye bache — reject sirf agle tick ginta hai"
            ],
            "answer": 0,
            "hint": "Math.min(n, cap) aur Math.max(0, n − cap).",
            "explain": "Line 15: Math.min(60, 20) = 20 hue. Line 16: Math.max(0, 60 − 20) = 40 reject. Bina line ke koi aur jagah nahi jahan 40 ruk sakein — agle tick mein reject hue 40 orders wapas nahi aate.",
            "choiceExplanations": [
              "Line 15: Math.min(60, 20) = 20 hue. Line 16: Math.max(0, 60 − 20) = 40 reject. Bina line ke koi aur jagah nahi jahan 40 ruk sakein — agle tick mein reject hue 40 orders wapas nahi aate.",
              "Math.min(60, 20) = 20. Capacity se zyada kaam ek tick mein nahi hota.",
              "Bina line ke kuch bachta nahi. Agle tick ke n mein sirf naye aane wale hain."
            ]
          }
        },
        {
          "title": "4. Line ke saath: pehle sab andar",
          "say": "Line 18: queue chalu ho toh saare 60 line mein, apne aane ke waqt ke saath.",
          "line": "18",
          "vars": {
            "n": "60",
            "cap": "20",
            "done": "0",
            "rej": "0",
            "line": "60"
          }
        },
        {
          "title": "5. Capacity tak nikaalo",
          "say": "Lines 19–22: capacity tak line se messages uthao; line khaali ho toh ruk jao. Har mile message par done badhta hai. 20 hue, 40 line mein bache.",
          "line": "19-22",
          "vars": {
            "n": "60",
            "cap": "20",
            "done": "20",
            "rej": "0",
            "line": "40"
          }
        },
        {
          "title": "6. Intezaar gino",
          "say": "Line 23: har uthaye message ka intezaar dekho, sabse bada yaad rakho. Burst ke poore run mein sabse lamba intezaar 20 s tha.",
          "line": "23",
          "vars": {
            "n": "60",
            "cap": "20",
            "done": "20",
            "rej": "0",
            "line": "40"
          }
        }
      ],
      "lesson": "Farak lines 14–16 vs 18–23 ka hai. Bina line ke extra kaam aane wale tick mein hi mana. Line ke saath extra kaam rukta hai — aur rukne ka waqt line 23 ginti hai. Raftaar (cap) dono mein wahi."
    },
    {
      "type": "dryrun",
      "title": "⏳ Retention ka jhaadu: purana message kahan gaya?",
      "goal": "lib/queue.js. Retention 60 min. Abhi 61va minute hai; line ke aage wala message minute 0 par aaya tha.",
      "code": {
        "title": "lib/queue.js",
        "file": "docker-labs/48-eda-tradeoffs/lib/queue.js",
        "from": 7,
        "text": "  function sweep(now) {\n    while (items.length && now - items[0].at > ttlMs) {\n      const old = items.shift();\n      if (dlq) dead.push(old); else expired++;\n    }\n  }\n  return {\n    publish(msg, now) { items.push({ msg, at: now }); },\n    take(now) {\n      sweep(now);\n      const head = items.shift();\n      return head ? { msg: head.msg, waitedMs: now - head.at } : null;"
      },
      "vars": [
        {
          "id": "head",
          "label": "Aage wala message"
        },
        {
          "id": "expired",
          "label": "Phenke"
        },
        {
          "id": "dead",
          "label": "Dead-letter"
        }
      ],
      "steps": [
        {
          "title": "1. Kitna purana?",
          "say": "Line 8: aage wala message 61 − 0 = 61 minute purana; retention 60. Shart sach.",
          "line": "8",
          "vars": {
            "head": "minute 0 wala (61 min)",
            "expired": "0",
            "dead": "0"
          }
        },
        {
          "title": "2. Hatao — par kahan?",
          "say": "Lines 9–10: message line se hataya. dlq chalu ho toh dead mein, warna sirf ginti badhi.",
          "line": "9-10",
          "vars": {
            "head": "minute 1 wala (60 min)",
            "expired": "1",
            "dead": "0"
          },
          "ask": {
            "q": "dlq = false. Line 10 ke baad hataya hua message kahan hai?",
            "choices": [
              "Kahin nahi — sirf expired ginti badhi; message ka data ab kisi ke paas nahi",
              "dead line mein — line 10 har expire hue message ko dead line mein daalti hai",
              "Line ke peeche — line 9 message ko wapas line ke aakhir mein bhej deti hai"
            ],
            "answer": 0,
            "hint": "dlq false ho toh line 10 kya karti hai?",
            "explain": "dlq false ho toh line 10 sirf expired++ karti hai. Message ka object kahin nahi rakha gaya — gaya. Isliye lab mein bina dead-letter wali setting mein 600 messages chupchaap gaye.",
            "choiceExplanations": [
              "dlq false ho toh line 10 sirf expired++ karti hai. Message ka object kahin nahi rakha gaya — gaya. Isliye lab mein bina dead-letter wali setting mein 600 messages chupchaap gaye.",
              "dead.push sirf dlq true hone par chalta hai.",
              "items.shift() aage se hataata hai; wapas kahin push nahi hota."
            ]
          }
        },
        {
          "title": "3. Agla message",
          "say": "Loop phir line 8 par: minute 1 wala 60 minute purana — 60 > 60 nahi. Ruk gaya.",
          "line": "8",
          "vars": {
            "head": "minute 1 wala (60 min)",
            "expired": "1",
            "dead": "0"
          }
        },
        {
          "title": "4. Consumer ko kya milta hai?",
          "say": "Lines 15–18: take() pehle sweep chalata hai, phir aage wala deta hai. Consumer ko expire hua message kabhi dikhta hi nahi — consumer ke aane se pehle jhaadu lag chuka.",
          "line": "15-18",
          "vars": {
            "head": "minute 1 wala diya",
            "expired": "1",
            "dead": "0"
          }
        }
      ],
      "lesson": "Retention ka jhaadu (sweep) take() aur stats() se pehle chalta hai. Expire hua message consumer tak nahi pahunchta: dlq ho toh dead line mein, warna sirf ek ginti. Isliye retention aur dead-letter ki setting soch ke rakho."
    },
    {
      "type": "dryrun",
      "title": "🔗 Stock khatam: failure kaun batayega?",
      "goal": "lib/step.js — payment, stock aur confirm teeno yahi code chalate hain. Order #4: gulab-jamun, jo stock mein khatam hai.",
      "code": {
        "title": "lib/step.js",
        "file": "docker-labs/48-eda-tradeoffs/lib/step.js",
        "from": 11,
        "text": "    async direct(order) {\n      await work(order);\n      const rest = next ? await call(next, '/do', order) : { steps: [] };\n      return { status: 'confirmed', steps: [name, ...rest.steps] };\n    },\n    async onEvent(event, publish, failEvents) {\n      try {\n        await work(event.data);\n      } catch (e) {\n        if (failEvents) await publish('failed', { type: 'OrderFailed', reason: e.message });\n        return { ok: false, reason: e.message };\n      }\n      await publish(null, { type: `${name}Done` });\n      return { ok: true };"
      },
      "vars": [
        {
          "id": "path",
          "label": "Raasta"
        },
        {
          "id": "stock",
          "label": "stock ka kaam"
        },
        {
          "id": "user",
          "label": "User ko kya dikha"
        }
      ],
      "steps": [
        {
          "title": "1. Direct: har kadam agle ka intezaar",
          "say": "Lines 11–14: stock apna kaam (line 12) karta hai, phir confirm ko call karke jawab ka intezaar (line 13).",
          "line": "11-14",
          "vars": {
            "path": "direct",
            "stock": "chal raha",
            "user": "intezaar"
          }
        },
        {
          "title": "2. Direct: kaam fail",
          "say": "Line 12 par work() ne error phenka: \"stock: gulab-jamun khatam\". Line 13 chali hi nahi. lib/http.js ne error ko HTTP 503 + error body banaya; payment ke call helper ne 503 par error throw kiya, aur yahi raasta api se user tak — lab mein 64–85 ms mein.",
          "line": "12",
          "vars": {
            "path": "direct",
            "stock": "fail",
            "user": "error: stock khatam"
          },
          "ask": {
            "q": "Direct raaste mein failure user tak kisne pahunchaya?",
            "choices": [
              "HTTP helper ne error ko 503 + error body banaya; caller helper ne 503 par throw kiya",
              "stock ne alag se OrderFailed ki khabar bheji, aur wahi khabar api se user tak gayi",
              "Kisi ne nahi — direct raaste mein bhi user ko pending hi dikhta hai, error nahi"
            ],
            "answer": 0,
            "hint": "Direct mein har kadam pichhle kadam ke await par ruka hai.",
            "explain": "stock ka error server helper pakad kar HTTP 503 aur error body mein bhejta hai. payment ka call helper 503 dekh kar error throw karta hai. payment aur api par yahi helper error ko aage lautata hai. Har process ke andar await error ko upar le jaata hai; HTTP ke paar error pahunchane ka code lib/http.js mein hai.",
            "choiceExplanations": [
              "stock ka error server helper pakad kar HTTP 503 aur error body mein bhejta hai. payment ka call helper 503 dekh kar error throw karta hai. payment aur api par yahi helper error ko aage lautata hai. Har process ke andar await error ko upar le jaata hai; HTTP ke paar error pahunchane ka code lib/http.js mein hai.",
              "Direct raasta line 13 tak hi jaata hai; publish ka code onEvent mein hai.",
              "Lab mein direct ka order #104 seedha error ke saath laut-ta hai, pending nahi."
            ]
          }
        },
        {
          "title": "3. Events: kaam fail",
          "say": "Ab events: line 18 par work() fail, catch (line 19) mein aaye. Pichhla kadam (payment) kab ka aage badh chuka — koi await yahan nahi ruka.",
          "line": "18-19",
          "vars": {
            "path": "events",
            "stock": "fail",
            "user": "pending"
          }
        },
        {
          "title": "4. Khabar bhejein ya nahi?",
          "say": "Line 20: failEvents chalu ho tabhi OrderFailed publish. Band ho toh line 21 sirf lautata hai — khabar kahin nahi gayi.",
          "line": "20-21",
          "vars": {
            "path": "events (failEvents band)",
            "stock": "fail",
            "user": "pending"
          },
          "ask": {
            "q": "failEvents band hai. api ko order #4 ke baare mein kya pata chalega?",
            "choices": [
              "Kuch nahi — koi done ya failed khabar nahi aayegi, order pending hi rahega",
              "api ko error mil jaayega, kyunki line 21 error ka reason lauta deti hai",
              "Broker apne aap order ko failed likh dega, kyunki stock ne message ack kiya"
            ],
            "answer": 0,
            "hint": "Line 21 ka return kisko milta hai?",
            "explain": "Line 21 ka return sirf stock-service ke apne loop ko milta hai. api tak koi khabar nahi gayi, toh order #4 pending: lab mein 1,500 ms baad bhi teeno runs mein pending.",
            "choiceExplanations": [
              "Line 21 ka return sirf stock-service ke apne loop ko milta hai. api tak koi khabar nahi gayi, toh order #4 pending: lab mein 1,500 ms baad bhi teeno runs mein pending.",
              "Return stock ke poll loop ko milta hai, api ko nahi. api sirf done/failed topics padhta hai.",
              "Broker ack ko sirf line se hataane ke liye leta hai; order ki haalat broker nahi likhta."
            ]
          }
        },
        {
          "title": "5. Safal kaam: agli khabar",
          "say": "Line 23: kaam safal ho toh stock agle topic par stockDone khabar bhejta hai. confirm-service stockDone khabar padhti hai.",
          "line": "23",
          "vars": {
            "path": "events",
            "stock": "safal (doosre order par)",
            "user": "pending → confirmed"
          }
        }
      ],
      "lesson": "Direct raaste mein HTTP helper (503 + error) aur await ki zanjeer failure ko user tak laate hain; alag OrderFailed ki zaroorat nahi padi. Events mein har failure ki khabar (OrderFailed) khud bhejni padti hai, aur api ko OrderFailed padhna padta hai — warna order hamesha pending."
    },
    {
      "type": "cards",
      "title": "🔧 Apne system mein: dekhna kya hai?",
      "goal": "Asli system mein backlog aur message age naapo; retention, failure ki khabar aur pending ki deadline tay karo.",
      "lesson": "Backlog aur sabse purane message ki umar par alert. Retention aur dead-letter soch ke set karo. Events ke chain mein failure ki khabar, order ki pehchaan aur pending ki deadline khud banao.",
      "steps": [
        {
          "title": "1. Do number dekho",
          "say": "Line mein kitne (<b>backlog</b>) aur sabse purana kitni der se (<b>age of oldest message</b>). Backlog bada par umar chhoti = bas bheed. Umar badhti jaaye = consumer peeche chhoot raha hai."
        },
        {
          "title": "2. Retention aur dead-letter khud set karo",
          "say": "Consumer sabse lamba kitni der band reh sakta hai? Retention band rehne ke sabse lambe waqt se zyada rakho. Dead-letter mein pade messages ka owner tay karo — dead-letter khud kuch nahi karta."
        },
        {
          "title": "3. Events ki chain mein pending ki deadline",
          "say": "Order event se aage badhta hai, toh har kadam failure ki khabar bheje, order id har khabar mein chale (taaki logs mein ek order ka poora raasta mile), aur tay waqt mein confirm na hue order par alert do aur status dobara jaancho. Sirf deadline paar hone se kaam fail ya cancel nahi hota.",
          "ask": {
            "q": "failEvents chalu karna bhool gaye. Order hamesha pending dikhega. Sabse saste mein kaise pakdoge?",
            "choices": [
              "Order ki pending age ko deadline se compare karke alert do",
              "Sirf broker queue depth par alert do; queue depth har atka order pakad legi",
              "Sirf api ke 5xx par alert do; 5xx har failed order pakad lenge"
            ],
            "answer": 0,
            "hint": "Kis cheez ki ginti badhegi agar failure ki khabar na aaye?",
            "explain": "Lamba pending ek warning hai: kaam dheema ho sakta hai, ya nateeje ki khabar der se aayi ya kho gayi ho sakti hai. Har order par deadline rakho; deadline paar ho toh alert aur status ki jaanch karo. Pakka failure ya cancellation pata chale tabhi failed likho. Lab mein #204 ke liye failure ki khabar bheji hi nahi gayi.",
            "choiceExplanations": [
              "Lamba pending ek warning hai: kaam dheema ho sakta hai, ya nateeje ki khabar der se aayi ya kho gayi ho sakti hai. Har order par deadline rakho; deadline paar ho toh alert aur status ki jaanch karo. Pakka failure ya cancellation pata chale tabhi failed likho. Lab mein #204 ke liye failure ki khabar bheji hi nahi gayi.",
              "stock failed message ack kar chuka ho sakta hai; queue khaali hote hue bhi api par order pending rahega.",
              "api pehle 202 de chuka hai; baad ka stock failure zaroori nahi ki api ka 5xx bane."
            ]
          }
        }
      ]
    }
  ],
  "interview": {
    "title": "Interview Round — code ki nazar se",
    "instructions": "Code ki line socho, phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Consumer code expire hue messages ko kabhi nahi dekhta, isliye team ka dashboard \"0 failed\" dikhata hai. Phir bhi orders gayab hain. Kya jodoge?",
        "choices": [
          "Broker ki expired / dead-letter ginti aur backlog-age bhi dashboard par lao",
          "Consumer mein retry badha do, taaki failed messages dobara aayein",
          "Consumer code mein try/catch lagao, taaki expire hue messages pakde jaayein",
          "Dashboard se failed hata do, kyunki failed 0 hai toh kuch gayab nahi hua"
        ],
        "answer": 0,
        "explain": "Lab ki queue.js mein sweep take() se pehle chalta hai: consumer ko expire hua message dikhta hi nahi. Isliye ginti broker ke paas hai (expired / dead-letter) — wahi dashboard par chahiye, saath mein backlog-age.",
        "choiceExplanations": [
          "Lab ki queue.js mein sweep take() se pehle chalta hai: consumer ko expire hua message dikhta hi nahi. Isliye ginti broker ke paas hai (expired / dead-letter) — wahi dashboard par chahiye, saath mein backlog-age.",
          "Expire hue message consumer tak aate hi nahi, toh consumer ka retry expire hue messages ko nahi chhoo sakta.",
          "try/catch sirf aaye hue message par chalta hai. Expire hua message consumer ke code tak nahi aata.",
          "Consumer ka failed=0 sirf consumer ki ginti hai; broker ne messages hataye, consumer ne nahi."
        ]
      },
      {
        "q": "Checkout ko events par le gaye: payment → stock → confirm. Ab kuch orders hamesha \"processing\" dikhte hain. Code mein sabse sambhavit kami?",
        "choices": [
          "Kisi kadam par failure ki khabar publish nahi hoti, aur pending ki deadline nahi",
          "Broker ne events ka kram ulta kar diya, isliye confirm pehle chala",
          "Events ki wajah se payment-service ka CPU zyada ho gaya, isliye order atka",
          "Direct calls bhi aise hi atakte hain — events ka is mein koi haath nahi"
        ],
        "answer": 0,
        "explain": "Direct mein HTTP helper aur await ki zanjeer failure lautate hain. Events mein har kadam ko OrderFailed khud bhejna padta hai, aur api ko padhna. Na khabar, na deadline = hamesha processing. Lab: failEvents band par #204 1,500 ms baad bhi pending.",
        "choiceExplanations": [
          "Direct mein HTTP helper aur await ki zanjeer failure lautate hain. Events mein har kadam ko OrderFailed khud bhejna padta hai, aur api ko padhna. Na khabar, na deadline = hamesha processing. Lab: failEvents band par #204 1,500 ms baad bhi pending.",
          "Confirm sirf reserved topic padhta hai, jo stock ke safal hone par hi aata hai. Lab ke is flow mein confirm se pehle stock ki safal khabar aani zaroori hai.",
          "Zyada CPU se order dheema hota hai, hamesha atakta nahi. Hamesha atakna khoyi khabar ki nishani hai.",
          "Lab mein direct ka failed order 64–85 ms mein error ke saath laut-ta hai; atakta nahi."
        ]
      }
    ]
  },
  "success": [
    "Reject aur line ka farak code ki line se dikha sakte ho",
    "Expire hue message ka raasta (phenko ya dead-letter) samjha sakte ho",
    "Events ki chain mein failure ki khabar aur deadline kyun chahiye, bata sakte ho"
  ],
  "cards": [
    {
      "front": "Reject vs line, code mein?",
      "back": "Bina line: Math.max(0, n − cap) aane wale tick mein hi reject. Line: sab publish, cap tak take — baaki rukte hain."
    },
    {
      "front": "Expire hua message consumer ko dikhta hai?",
      "back": "Nahi. Sweep take() se pehle chalta hai. Ginti broker ke paas hai (expired / dead-letter)."
    },
    {
      "front": "Events ki chain mein failure?",
      "back": "Khud batana padta hai (OrderFailed) aur padhna padta hai; saath mein pending ki deadline."
    }
  ]
}
]);
})();
