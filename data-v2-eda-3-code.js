/* Playlist · 2 EDA Core. Source credit: Software Developer Diaries,
   A Beginner's Guide to Event-Driven Architecture (RojKJnF_WWQ).
   Numbers: docker-labs/44-event-driven/captures; source code byte-checked. */
(function () {
const HERO = [{"id": "order", "icon": "🧾", "label": "order", "x": 140, "y": 105}, {"id": "line", "icon": "📬", "label": "alag lines", "x": 445, "y": 105}, {"id": "work", "icon": "🍳", "label": "alag kaam", "x": 750, "y": 105}];
const EDGES = [{"from": "order", "to": "line"}, {"from": "line", "to": "work"}];
VISUALS["ed-code"] = { t: "Har await, copy aur ack ki line asli file se. Accepted ke peeche kya sach mein hua?", html: SD.viz.svg(HERO, EDGES, { nodes: { order: {tone:'acc',badge:'order save'}, line: {tone:'slow',badge:'apni-apni copy'}, work: {tone:'ok',badge:'kaam + ack'} } }, {w:890,h:215}) };
SD.registerLevels('sdd-eda', [
{
  "id": "ed-code",
  "icon": "💻",
  "group": "📣 Event-Driven Architecture",
  "title": "EDA 3 · Code — save, publish aur ack ki asli lines",
  "badge": "Khabar Lohaar",
  "objectives": [
    "Order API ka wait code ki kis line par badalta hai?",
    "Publish, read aur ack ka asli code kya karta hai?",
    "Apni app mein callbacks kaise wire karein?",
    "Node EventEmitter lagane se kya milta hai aur kya baaki rehta hai?"
  ],
  "lesson": [
    "<h3>💻 Teen chhoti files, wahi lab ka code</h3><p>Order ka flow, broker ki line, aur apni app ki wiring. Code ki chamakti line ko state ke saath padho. Yeh asli files ke tukde hain.</p><p>Ek sawaal saath rakho: is line ke baad kya sach mein poora hua?</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "💻 Order ka rasta: await kis cheez ka?",
      "goal": "lib/order.js ko HTTP API aur slow motion dono chalate hain. Har click par chalti lines dekho.",
      "code": {
        "title": "lib/order.js",
        "file": "docker-labs/44-event-driven/lib/order.js",
        "from": 3,
        "text": "async function direct(order, io) {\n  await io.save(order);\n  await io.kitchen(order);\n  await io.notify(order);\n  return { status: 'completed' };\n}\n\nasync function viaEvent(order, io) {\n  await io.save(order);\n  await io.publish({\n    id: `order-${order.id}`,\n    type: 'OrderPlaced',\n    data: order,\n  });\n  return { status: 'accepted' };\n}"
      },
      "vars": [
        {
          "id": "saved",
          "label": "Order save"
        },
        {
          "id": "pending",
          "label": "Kitchen / notify pending"
        },
        {
          "id": "reply",
          "label": "API ka promise"
        }
      ],
      "steps": [
        {
          "title": "1. Seedhe calls kis kram mein?",
          "line": "3-8",
          "say": "<code>direct()</code> save, kitchen aur notify teenon ko await karta hai. Notify fail ho toh line 7 ka completed return nahi chalta. Wahi 503 wala slow motion yaad karo.",
          "vars": {
            "saved": "1",
            "pending": "0 / 0",
            "reply": "notify ka intezaar"
          }
        },
        {
          "title": "2. Naye raste mein pehla kaam?",
          "line": "10-11",
          "say": "<code>viaEvent()</code> bhi pehle order save karta hai. Save hona publish hona nahi. Abhi kitchen ya notify ki line mein entry nahi.",
          "vars": {
            "saved": "1",
            "pending": "0 / 0",
            "reply": "abhi nahi"
          }
        },
        {
          "title": "3. Khabar mein kya jaata hai?",
          "line": "12-16",
          "say": "<code>id</code> is khabar ki pehchaan hai. <code>type</code> ho chuki baat: OrderPlaced. <code>data</code> mein is lab ka order ID aur thali hai. Publish ko await kiya: is lab ka broker dono copies rakhkar jawab deta hai.",
          "vars": {
            "pending": "1 / 1"
          }
        },
        {
          "title": "4. Return mein completed kyun nahi?",
          "line": 17,
          "say": "Publish ka jawab milne par line 17 <code>accepted</code> lautati hai. HTTP service is result ko 202 banati hai. Is function mein kitchen ya notify ke poora hone ka intezaar nahi.",
          "vars": {
            "reply": "accepted"
          },
          "ask": {
            "q": "Publish fail ho toh line 17 se accepted milega?",
            "choices": [
              "Nahi. Await error aage bhejega; save ka effect phir bhi reh sakta hai",
              "Haan, accepted hamesha return hoga",
              "Nahi, par saved order bhi apne aap rollback hoga"
            ],
            "answer": 0,
            "hint": "Line 11 aur line 12 do alag operations hain.",
            "explain": "Cap wale run mein saved 3, par sirf 2 events ki copies thi. Save + publish ek transaction nahi."
          }
        }
      ],
      "lesson": "🎯 <b>Asli baat:</b> naya flow consumer ke kaam ka wait hataata hai. Broker ko publish ka wait aur save/publish ke beech ka failure ab bhi hain."
    },
    {
      "type": "dryrun",
      "title": "📬 Broker ke andar: copy, read, ack",
      "goal": "lib/bus.js lab ka chhota RAM broker hai. Har subscription ka ek worker; worker ownership aur disk recovery is code mein nahi.",
      "code": {
        "title": "lib/bus.js",
        "file": "docker-labs/44-event-driven/lib/bus.js",
        "from": 4,
        "text": "function createBus(names, cap = 20) {\n  const queues = new Map(names.map(n => [n, []]));\n  function queue(name) {\n    if (!queues.has(name)) throw Error('unknown queue');\n    return queues.get(name);\n  }\n  return {\n    publish(event) {\n      if (!event.id || !event.type) {\n        throw Error('id aur type chahiye');\n      }\n      const targets = [...queues.values()];\n      if (targets.some(q => q.length >= cap)) {\n        throw Error('queue full');\n      }\n      for (const q of targets) {\n        q.push(structuredClone(event));\n      }\n      return targets.length;\n    },\n    read(name) {\n      return structuredClone(queue(name)[0] || null);\n    },\n    ack(name, id) {\n      const q = queue(name);\n      if (!q.length || q[0].id !== id) return false;\n      q.shift();\n      return true;\n    },\n    pending(name) {\n      return queue(name).length;\n    },\n  };\n}"
      },
      "vars": [
        {
          "id": "k",
          "label": "Kitchen pending"
        },
        {
          "id": "n",
          "label": "Notify pending"
        },
        {
          "id": "cap",
          "label": "Har line ki hadd"
        }
      ],
      "steps": [
        {
          "title": "1. Do naam, do alag arrays?",
          "line": "4-9",
          "say": "<code>names.map()</code> har subscription ke liye naya array banaata hai. Kitchen aur notify ek hi array nahi baantte. Anjaan queue ka naam do toh queue() error deta hai.",
          "vars": {
            "k": "0",
            "n": "0",
            "cap": "20 (lab setting)"
          }
        },
        {
          "title": "2. ID aur type kyun jaanchein?",
          "line": "11-18",
          "say": "ID ya type nahi toh event reject. Phir <b>saari lines</b> ki hadd check hoti hai. Koi line bhari ho toh copy daalne se pehle error. Yeh check loop ke pehle hai."
        },
        {
          "title": "3. Ek event ki do copies kaise?",
          "line": "19-22",
          "say": "Har target array mein <code>structuredClone(event)</code> push hota hai. Kitchen ki data copy badalne se notify ki data copy nahi badalti. Return 2 sirf copies ki ginti hai, kaam ki completion nahi.",
          "vars": {
            "k": "1",
            "n": "1"
          }
        },
        {
          "title": "4. Padhne par entry kyun nahi hati?",
          "line": "24-26",
          "say": "<code>queue(name)[0]</code> head padhta hai. Shift yahan nahi hai. Worker ko apni data copy milti hai; broker ki entry kaam ke baad ke ack tak rehti hai.",
          "ask": {
            "q": "Kitchen ne read() kar liya. Pending kitni?",
            "choices": [
              "Kitchen 1, notify 1",
              "Kitchen 0, notify 1",
              "Dono 0"
            ],
            "answer": 0,
            "hint": "Read wale code mein array se hataane wali line dhoondo.",
            "explain": "Read mein shift nahi. Sirf kaam shuru karne ki copy mili."
          }
        },
        {
          "title": "5. Kaam poora: kis line ka ack?",
          "line": "27-32",
          "say": "Ack mein subscription ka naam aur event ID aate hain. Head ki ID nahi mili toh false. Sahi ID par sirf us array ka <code>shift()</code>. Mini run mein kitchen ack karta hai, notify nahi.",
          "vars": {
            "k": "0",
            "n": "1"
          },
          "ask": {
            "q": "Kitchen ka ack notify ko bhi mitaata hai?",
            "choices": [
              "Nahi. queue(name) ne kitchen ka array chuna",
              "Haan, event ID dono jagah ek hi hai",
              "Haan, sab consumers ki ek progress hai"
            ],
            "answer": 0,
            "hint": "Naam kis array ko chunta hai?",
            "explain": "Ek event ki copies ki progress alag hai. Notify ka ack abhi baaki hai."
          }
        },
        {
          "title": "6. Ek aur run: cap 2 par teesra publish?",
          "line": "15-21",
          "say": "<code>tools/limits.js</code> naya bus cap 2 ke saath banaata hai. Dono lines mein 2 copies hain. Teesra order save ho gaya. Kya publish aadhi copies daal sakta hai?",
          "vars": {
            "k": "2",
            "n": "2",
            "cap": "2 (naya run)"
          },
          "ask": {
            "q": "Hadd ki check loop se pehle hai. Teesre event ka kya hoga?",
            "choices": [
              "Publish reject; kisi line mein teesri copy nahi. Par order ka pehle wala save reh gaya",
              "Kitchen ko teesri copy, notify ko nahi",
              "Cap ke baad bhi line bina hadd badhegi"
            ],
            "answer": 0,
            "hint": "Error ka return loop tak pahunchne deta hai?",
            "explain": "Lab bus fanout se pehle cap check karta hai. Yeh process ke andar ka niyam hai; DB aur broker ko ek transaction nahi banaata."
          }
        }
      ],
      "lesson": "🎯 <b>Asli baat:</b> alag arrays alag progress deti hain. Read kaam nahi mitaata. Ack sahi subscription ki entry hataata hai. Disk ke bina yeh yaad restart par nahi bachegi."
    },
    {
      "type": "dryrun",
      "title": "🔌 Apni app mein sabse chhoti wiring",
      "goal": "tools/mini.js sach mein yahi chalaata hai. Is demo mein save aur broker dono isi process ki memory mein hain.",
      "code": {
        "title": "tools/mini.js",
        "file": "docker-labs/44-event-driven/tools/mini.js",
        "from": 1,
        "text": "const { createBus } = require('../lib/bus');\nconst { viaEvent } = require('../lib/order');\nconst bus = createBus(['kitchen', 'notify']);\nconst orders = [];\n\n(async () => {\n  const answer = await viaEvent({ id: 1, item: 'thali' }, {\n    save: async order => orders.push(order),\n    publish: async event => bus.publish(event),\n  });\n  console.log('API:', answer.status);\n  console.log('notify pending:', bus.pending('notify'));\n\n  const event = bus.read('kitchen');\n  console.log('kitchen:', event.type, event.data.id);\n  bus.ack('kitchen', event.id);\n  console.log('kitchen pending:', bus.pending('kitchen'));\n  console.log('notify pending:', bus.pending('notify'));"
      },
      "steps": [
        {
          "title": "1. Broker aur order function kahan se?",
          "line": "1-4",
          "say": "Wahi do files import hui. Kitchen aur notify ki subscriptions pehle se hain. Orders ka array lab ka chhota memory store hai."
        },
        {
          "title": "2. Business flow ko IO kaise diya?",
          "line": "7-10",
          "say": "<code>save</code> order ko array mein rakhta hai. <code>publish</code> broker mein copies rakhta hai. HTTP API inhi callbacks ko real fetch calls se wire karti hai; business function wahi rehta hai."
        },
        {
          "title": "3. API accepted, par notify pending?",
          "line": "11-12",
          "say": "<pre>API: accepted\nnotify pending: 1</pre>Yeh mini run ka exact output hai. Consumer ka kaam abhi nahi chala.",
          "ask": {
            "q": "Notify pending 1 ho aur API accepted kahe: kya yeh galti hai?",
            "choices": [
              "Nahi, agar API ka vaada sirf accepted hai aur pending status sach dikhaya jaata hai",
              "Haan, accepted ka matlab SMS delivered hai",
              "Haan, publish par saare consumers chal chuke hote hain"
            ],
            "answer": 0,
            "hint": "Accepted aur completed ko alag rakho.",
            "explain": "Response ka promise consumer ki actual completion se bada nahi hona chahiye."
          }
        },
        {
          "title": "4. Apna kaam, phir apna ack?",
          "line": "14-18",
          "say": "<pre>API: accepted\nnotify pending: 1\nkitchen: OrderPlaced 1\nkitchen pending: 0\nnotify pending: 1</pre>Kitchen apni entry padhta aur ack karta hai. Notify ka worker is mini mein chala hi nahi, isliye notify pending 1 hai."
        }
      ],
      "lesson": "🎯 <b>Asli baat:</b> apne app mein pehle save, publish aur consumer ke kaam ki boundaries saaf karo. Callbacks badlo, business promise saaf rakho."
    },
    {
      "type": "cards",
      "title": "🧰 Node EventEmitter: event ka naam, par kaunsa wait?",
      "goal": "Yahan Node ka built-in EventEmitter sach mein chalaaya hai. Official source: <a href=\"https://nodejs.org/api/events.html#asynchronous-vs-synchronous\" target=\"_blank\" rel=\"noopener\">Node Events documentation</a>. Yeh alag process wala message broker nahi hai.",
      "steps": [
        {
          "title": "1. Normal listener kab chalta hai?",
          "say": "<pre>emit se pehle\nlistener chala\nemit ke baad</pre>Emit ke pehle aur baad ke beech listener chala. Documentation ke mutabiq EventEmitter listeners registration ke kram mein synchronously call karta hai."
        },
        {
          "title": "2. Async listener diya toh emit kya await karega?",
          "say": "<pre>async emit se pehle\nasync listener shuru\nasync emit ke baad\nasync listener poora</pre>Async listener await tak abhi chala, baaki kaam baad mein poora hua. Emit ke baad wali line pehle aa gayi.",
          "ask": {
            "q": "Async emit ke baad wali line aa gayi. Kya listener ka kaam poora hua?",
            "choices": [
              "Nahi. Output mein async listener poora baad mein aata hai",
              "Haan, emit sab async listeners ko await karta hai",
              "Haan, async function turant poora ho jaata hai"
            ],
            "answer": 0,
            "hint": "Aakhri do output lines ka kram padho.",
            "explain": "Listener invoke hona aur uske async kaam ka poora hona alag hai."
          }
        },
        {
          "title": "3. emit() lagaane se kya apne aap mil gaya?",
          "say": "<b>⚠️ Ek aam galatfehmi:</b> \"Event naam diya, toh reliable background delivery mil gayi.\" Is emitter demo mein disk queue, alag worker process, ack ya retry wiring nahi hai. In cheezon ka intezaam alag se chahiye."
        }
      ],
      "lesson": "🎯 <b>Asli baat:</b> EventEmitter ko samajhkar use karo. Listener call hona, async kaam poora hona, aur durable message delivery teen alag promises hain."
    }
  ],
  "interview": {
    "title": "Interview Round — ek order ka safar",
    "instructions": "Pehle KhanaKart ka haal socho. Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "viaEvent() mein publish reject hua. Saved order ka kya hua?",
        "choices": [
          "Save alag operation tha; order reh sakta hai, event nahi gaya",
          "Save apne aap rollback ho gaya",
          "Event hamesha publish hota hai"
        ],
        "answer": 0,
        "explain": "Lib/order.js do alag awaits karta hai. Lab ne transactional outbox implement nahi kiya."
      },
      {
        "q": "Native EventEmitter mein async listener lagaaya. emit() return ho gaya. Kya kaam complete?",
        "choices": [
          "Zaroori nahi; listener ka async kaam abhi pending ho sakta hai",
          "Haan; emit() sab promises wait karta hai",
          "Haan; event ka naam completion hai"
        ],
        "answer": 0,
        "explain": "Actual output mein async emit ke baad pehle, listener poora baad mein aaya."
      }
    ]
  },
  "success": [
    "Order API ke await aur return ka promise padh sakte ho",
    "Asli bus code mein publish, read aur ack samajh sakte ho",
    "Mini app ki wiring aur native EventEmitter ka farak dekh sakte ho"
  ],
  "cards": [
    {
      "front": "Publish mein cap check pehle kyun?",
      "back": "Koi line full ho toh copies daalne se pehle reject. Yeh lab ka in-process niyam hai, distributed transaction nahi."
    },
    {
      "front": "Save + publish atomic hain?",
      "back": "Is lab mein nahi. Teesra order saved, par cap full hone par teesra event publish nahi hua."
    },
    {
      "front": "EventEmitter ka emit()?",
      "back": "Listeners ko call karta hai. Async listener ke promise ka intezaar nahi karta; async kaam ki completion alag hai."
    }
  ]
}
]);
})();
