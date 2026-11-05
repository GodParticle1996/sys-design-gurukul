/* Playlist · 2 EDA Core. Source credit: Software Developer Diaries,
   A Beginner's Guide to Event-Driven Architecture (RojKJnF_WWQ).
   Numbers: docker-labs/44-event-driven/captures; source code byte-checked. */
(function () {
const HERO = [{"id": "order", "icon": "🧾", "label": "order", "x": 140, "y": 105}, {"id": "line", "icon": "📬", "label": "alag lines", "x": 445, "y": 105}, {"id": "work", "icon": "🍳", "label": "alag kaam", "x": 750, "y": 105}];
const EDGES = [{"from": "order", "to": "line"}, {"from": "line", "to": "work"}];
VISUALS["ed-kab"] = { t: "Pehle business ka promise. Phir acceptance, completion, durability aur duplicates ko alag naapo.", html: SD.viz.svg(HERO, EDGES, { nodes: { order: {tone:'acc',badge:'order save'}, line: {tone:'slow',badge:'apni-apni copy'}, work: {tone:'ok',badge:'kaam + ack'} } }, {w:890,h:215}) };
SD.registerLevels('sdd-eda', [
{
  "id": "ed-kab",
  "icon": "⚖️",
  "group": "📣 Event-Driven Architecture",
  "title": "EDA 4 · Kab — intezaar kahan hataayein, kahan rakhein",
  "badge": "Khabar Panch",
  "objectives": [
    "Kaunsa kaam order ke jawab ke baad ho sakta hai?",
    "Duplicate effect aur missing event ka khatra kahan hai?",
    "Publish ka successful jawab durability kyun prove nahi karta?"
  ],
  "lesson": [
    "<h3>⚖️ Notification baad mein chalegi. Payment bhi?</h3><p>Asha thodi der baad confirmation message dekh sakti hai. Par agar app abhi \"payment approved\" keh rahi hai, app ko payment ka result pata hona chahiye.</p><p>Faisla technology ke naam se nahi; business ke promise se shuru karo.</p>"
  ],
  "stages": [
    {
      "type": "bins",
      "title": "⚖️ Kahan khabar, kahan turant jawab?",
      "instructions": "Har situation mein business ko jo promise chahiye, uske hisaab se pehla raasta chuno.",
      "bins": [
        {
          "id": "event",
          "label": "📬 Baad mein alag kaam"
        },
        {
          "id": "wait",
          "label": "⏳ Pakka jawab pehle"
        },
        {
          "id": "simple",
          "label": "🧩 Seedha local code"
        }
      ],
      "items": [
        {
          "text": "Order accepted hai; confirmation message thodi der baad ja sakta hai",
          "bin": "event",
          "explain": "Notify alag reaction hai. Pending aur failure track karo; accepted ko delivered mat bolo."
        },
        {
          "text": "Order ki khabar kitchen aur analytics dono ko chahiye; dono ki apni progress hai",
          "bin": "event",
          "explain": "Alag subscriptions. Ek ka ack doosre ko complete nahi karta."
        },
        {
          "text": "API abhi user ko payment approved kehna chahti hai, par payment ka result pata nahi",
          "bin": "wait",
          "explain": "Approved kehne se pehle authoritative result chahiye. Ya promise badlo: payment pending."
        },
        {
          "text": "Aakhri thali kisi aur ko na mile: abhi stock reservation confirm karni hai",
          "bin": "wait",
          "explain": "Reservation ka rule authoritative store par enforce karo. Sirf baad ka event oversell nahi rokta."
        },
        {
          "text": "Ek process mein input validate karke total nikaalna hai; koi alag consumer nahi",
          "bin": "simple",
          "explain": "Function call kaafi ho sakti hai. Broker se extra moving parts aayenge."
        },
        {
          "text": "Chhote admin form ka ek record edit karke wahi saved record dikhana hai",
          "bin": "simple",
          "explain": "Pehle seedha request aur DB transaction. Alag background reaction ho tab event socho."
        },
        {
          "text": "Notification ka worker band hai; order receive karna jaari rakhna hai",
          "bin": "event",
          "explain": "Line ka cap, pending age, recovery aur failure state tay karo. Memory broker ki hadd bhi dekho."
        },
        {
          "text": "User ko abhi kehna hai ki kitchen ne order accept kar liya; kitchen ka jawab abhi nahi aaya",
          "bin": "wait",
          "explain": "Kitchen accepted ka promise kitchen ke actual jawab ke baad. Tab tak order pending dikh sakta hai."
        }
      ],
      "lesson": "🎯 <b>Asli baat:</b> jiska pakka result abhi chahiye, uska wait kahin na kahin rahega. Alag background reaction ko order ke response se alag kar sakte ho."
    },
    {
      "type": "cards",
      "title": "🧨 Kaam alag hua; ab kya-kya toot sakta hai?",
      "goal": "Numbers tools/limits.js aur tools/crash.js ke runs se hain. Duplicate aur cap demo same library par chalte hain. Restart wala run asli child process restart karta hai.",
      "steps": [
        {
          "title": "1. Kaam ho gaya, par ack nahi pahuncha?",
          "say": "<pre>kaam ke baad ack na pahunche: same id do baar padha · SMS 2\nid yaad rakhi (isi process mein): SMS 1</pre>Demo mein same entry ack se pehle do baar padhi. Dono baar SMS effect hua: 2. ID yaad rakhi toh 1. Par ID wala Set sirf is process ki memory mein hai.",
          "ask": {
            "q": "SMS effect ho gaya, ack nahi pahuncha. Entry dobara padhi toh kya khatra?",
            "choices": [
              "Wahi SMS dobara ja sakta hai — effect ko event ID se dedupe karna padega",
              "Ack nahi aaya toh broker provider se pehla SMS wapas le lega",
              "Ack nahi aaya, matlab pehla SMS gaya hi nahi tha — dobara bhejo",
            ],
            "answer": 0,
            "hint": "Consumer ka effect aur broker ka ack do alag cheezein hain.",
            "explain": "Kaam ho gaya par ack nahi pahuncha → entry dobara aayegi aur SMS dobara ja sakta hai. Consumer ko event ID ke saath pakka dedupe chahiye (memory ka Set restart par khaali ho jaata hai). Ack broker ki entry hai, SMS ko wapas nahi leta.",
            "choiceExplanations": [
              "Kaam ho gaya par ack nahi pahuncha → entry dobara aayegi aur SMS dobara ja sakta hai. Consumer ko event ID ke saath pakka dedupe chahiye (memory ka Set restart par khaali ho jaata hai). Ack broker ki entry hai, SMS ko wapas nahi leta.",
              "Ack broker ka record hai. Bhej diya SMS koi wapas nahi le sakta.",
              "Ack na aana effect ko anjaan chhodta hai — SMS ja chuka ho sakta hai.",
            ],
          }
        },
        {
          "title": "2. Publish ka successful jawab mila. Restart par bach gaya?",
          "say": "<pre>asli broker process restart: kitchen 4 → 0 · notify 4 → 0\npublish ke HTTP jawab mil chuke the; RAM ki 8 pending copies gayi</pre>Tool ne sirf apna broker process restart kiya. Kitchen aur notify ki 4–4 pending copies gayin. Broker ne RAM mein rakha tha, disk par nahi.",
          "ask": {
            "q": "Publish ko HTTP success milna kya disk durability prove karta hai?",
            "choices": [
              "RAM wala broker restart par copies kho sakta hai, jaise 8 gayi",
              "HTTP success ka matlab data disk par likh diya gaya",
              "JSON event restart ke baad apne aap wapas aa jaata hai",
            ],
            "answer": 0,
            "hint": "Broker code mein file ya database write hai?",
            "explain": "Is broker ne copies RAM mein rakhi thi; restart par 8 copies gayi, jabki publish ko HTTP success mil chuka tha. Durability HTTP jawab se nahi, broker ke storage aur ack ke contract se pata chalti hai.",
            "choiceExplanations": [
              "Is broker ne copies RAM mein rakhi thi; restart par 8 copies gayi, jabki publish ko HTTP success mil chuka tha. Durability HTTP jawab se nahi, broker ke storage aur ack ke contract se pata chalti hai.",
              "HTTP status disk ka vaada nahi karta. Broker kya karta hai, wahi dekho.",
              "Format storage nahi hai. RAM mein rakha JSON restart par chala jaata hai.",
            ],
          }
        },
        {
          "title": "3. Notification band rahe aur line bhar jaaye?",
          "say": "<pre>cap 2: saved 3 · kitchen pending 2 · notify pending 2 · publish fail 1\nsave + publish ek transaction nahi: order #3 save hua, event nahi gaya</pre>Cap 2 tha. Teesra order save hua, publish fail. Yahan order aur event ka gap dikha. <b>⚠️ Ek aam galatfehmi:</b> \"Do awaits likh diye, dono ek saath commit honge.\" Is code mein koi transaction nahi."
        },
        {
          "title": "4. Consumer ka naam nahi jaante, toh coupling khatam?",
          "say": "Producer ko kitchen ka address nahi pata. Phir bhi consumers ko <code>OrderPlaced</code> ka matlab aur data fields samajhne padte hain. Schema ya meaning todoge toh consumers toot sakte hain. Event ID se logs jodo; pending kaam ki ginti aur umr dekho. Contract aur operations ki zimmedari ab bhi hai."
        }
      ],
      "lesson": "🎯 <b>Asli baat:</b> Event flow wait ki jagah badalta hai. Duplicate effects, durable storage, bounded backlog aur save/publish gap ko alag solve karna padta hai."
    },
    {
      "type": "docker",
      "title": "🧪 Do galtiyan khud dekho",
      "project": "44-event-driven",
      "exercise": "ex2-limits",
      "goal": "Pehle same library ke duplicate aur cap scenarios; phir broker ka asli process restart. Koi pehle se service nahi chahiye.",
      "why": "Node 18+ chahiye. Neeche ka output isi lab ke captured run se hai; Docker ki compose file chalayi nahi gayi.",
      "steps": [
        {
          "text": "Lab folder mein limits chalao.",
          "cmd": "cd docker-labs/44-event-driven && node tools/limits.js",
          "expect": "fanout: kitchen pending 0 · notify pending 1\nkaam ke baad ack na pahunche: same id do baar padha · SMS 2\nid yaad rakhi (isi process mein): SMS 1\nbroker ki RAM dobara bani: pending copies 8 → 0 · chaar events ki dono copies gayi\ncap 2: saved 3 · kitchen pending 2 · notify pending 2 · publish fail 1\nsave + publish ek transaction nahi: order #3 save hua, event nahi gaya"
        },
        {
          "text": "Isi folder mein controlled broker restart. Tool sirf apna child process rokta hai; port 5404 chahiye.",
          "cmd": "node tools/crash.js",
          "expect": "asli broker process restart: kitchen 4 → 0 · notify 4 → 0\npublish ke HTTP jawab mil chuke the; RAM ki 8 pending copies gayi"
        }
      ],
      "observe": {
        "q": "Publish ka reply milne ke baad bhi copies gayin, aur save ke baad publish fail bhi hua. Kya sirf broker jodna reliable delivery ke liye kaafi hai?",
        "choices": [
          "Durability, save + publish ka saath, aur duplicate ka ilaaj alag chahiye",
          "Broker lagate hi save aur publish apne aap atomic ho jaate hain",
          "202 ka jawab consumer tak pahunchne ki pakki raseed hai",
        ],
        "answer": 0,
        "explain": "Poori reliability teen jagah chahiye: producer ka gap (save ke baad publish fail), broker ki durability (restart par copies gayi), aur consumer ka duplicate effect. Queue jodna akela atomic commit nahi deta.",
        "choiceExplanations": [
          "Poori reliability teen jagah chahiye: producer ka gap (save ke baad publish fail), broker ki durability (restart par copies gayi), aur consumer ka duplicate effect. Queue jodna akela atomic commit nahi deta.",
          "Alag systems ke beech queue jodna atomic commit nahi deta.",
          "202 producer ka jawab hai, consumer ke kaam ki raseed nahi.",
        ],
      },
      "lesson": "Pehle business promise likho. Phir us promise ko failure ke saath chala ke naapo."
    }
  ],
  "interview": {
    "title": "Interview Round — ek order ka safar",
    "instructions": "Pehle KhanaKart ka haal socho. Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Har saved order ka event chahiye. Save ke baad process band ho sakta hai. Kya save(); publish(); kaafi?",
        "choices": [
          "Order aur event ka irada ek hi DB transaction mein likho; relay baad mein bheje",
          "Do awaits ek ke baad ek hain, toh dono ko ek atomic transaction maan lo",
          "Try/catch jod do — process crash wala gap bhi try/catch se khatam ho jaayega",
        ],
        "answer": 0,
        "explain": "Transactional outbox: order aur event ka irada ek hi DB transaction mein likho; relay baad mein retry kar ke bhejta hai. Duplicates phir bhi aa sakte hain — consumer dedupe kare. Ek ke baad ek await crash se nahi bachata.",
        "choiceExplanations": [
          "Transactional outbox: order aur event ka irada ek hi DB transaction mein likho; relay baad mein retry kar ke bhejta hai. Duplicates phir bhi aa sakte hain — consumer dedupe kare. Ek ke baad ek await crash se nahi bachata.",
          "Kram atomic nahi. Save aur publish ke beech process mar sakta hai.",
          "Process mar jaaye toh catch chalta hi nahi.",
        ],
      },
      {
        "q": "Notify consumer band hai; API 202 de rahi hai. Healthy kehne ke liye kya dekhein?",
        "choices": [
          "Pending kaam, sabse purana kitna, failures aur recovery — sirf API jawab nahi",
          "Sirf API ki tez median — median kam hai toh consumer bhi theek hai",
          "Sirf broker process zinda hai ya nahi — pending kaam ki fikr mat karo",
        ],
        "answer": 0,
        "explain": "Async pipeline ki sehat: kitna kaam pending hai, sabse purana kitna purana, kitne fail/retry, aur recovery ka trend. Tez jawab (fast enqueue) atke hue consumer ko chhupa sakta hai.",
        "choiceExplanations": [
          "Async pipeline ki sehat: kitna kaam pending hai, sabse purana kitna purana, kitne fail/retry, aur recovery ka trend. Tez jawab (fast enqueue) atke hue consumer ko chhupa sakta hai.",
          "Tez jawab atke hue consumer ko chhupa sakta hai.",
          "Process zinda hona kaam aage badhne ka saboot nahi.",
        ],
      }
    ]
  },
  "success": [
    "Business promise ke hisaab se wait ya background kaam chun sakte ho",
    "Duplicate effect aur save/publish gap pehchaan sakte ho",
    "Publish reply ko durability ka saboot nahi maanoge"
  ],
  "cards": [
    {
      "front": "EDA kab faayda deta hai?",
      "back": "Jab alag reactions baad mein chal sakti hain, apni progress rakhni hai, aur operations ki keemat manzoor hai."
    },
    {
      "front": "Reliable delivery ka matlab sirf queue?",
      "back": "Nahi. Lab mein successful publish ke baad RAM loss hua; saved order ka publish fail hua; same event ka effect do baar hua."
    },
    {
      "front": "Stock/payment ka promise?",
      "back": "Jo result abhi confirmed kehna hai, uska authoritative result lo. Pending promise ho toh UI mein pending hi dikhao."
    }
  ]
}
]);
})();
