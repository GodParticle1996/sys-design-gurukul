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
          "say": "<pre>kaam ke baad ack na pahunche: same id do baar padha · SMS 2\nid yaad rakhi (isi process mein): SMS 1</pre>Demo mein same entry ack se pehle do baar padhi. Dono baar SMS effect hua: 2. ID yaad rakhi toh 1. Par yeh Set isi process ki memory hai.",
          "ask": {
            "q": "SMS effect ho gaya, ack nahi pahuncha. Entry dobara padhi toh kya khatra?",
            "choices": ["Duplicate effect risk; event ID se dedupe chahiye","Missing ack prior SMS ko provider se undo karega","Missing ack prove karta hai pehla SMS nahi bheja"],
            "answer": 0,
            "hint": "Consumer ka effect aur broker ka ack do alag cheezein hain.",
            "explain": "Effect-before-ack crash redelivery par effect repeat kar sakta hai; durable consumer dedupe/transaction boundary design chahiye. Acknowledgment broker metadata hai, external SMS rollback nahi. Ack failure effect outcome ko ambiguous chhod sakti hai."
          , choiceExplanations: ["Effect-before-ack crash redelivery par effect repeat kar sakta hai; durable consumer dedupe/transaction boundary design chahiye.","Acknowledgment broker metadata hai, external SMS rollback nahi.","Ack failure effect outcome ko ambiguous chhod sakti hai."] }
        },
        {
          "title": "2. Publish ka successful jawab mila. Restart par bach gaya?",
          "say": "<pre>asli broker process restart: kitchen 4 → 0 · notify 4 → 0\npublish ke HTTP jawab mil chuke the; RAM ki 8 pending copies gayi</pre>Tool ne sirf apna broker process restart kiya. Kitchen aur notify ki 4–4 pending copies gayin. Broker ne RAM mein rakha tha, disk par nahi.",
          "ask": {
            "q": "Publish ko HTTP success milna kya disk durability prove karta hai?",
            "choices": ["Nahi; in-memory broker restart par copies kho sakta","Haan; HTTP success disk fsync ka built-in promise hai","Haan; JSON event data restart ke baad khud restore hota"],
            "answer": 0,
            "hint": "Broker code mein file ya database write hai?",
            "explain": "Durability successful HTTP response se infer nahi hoti; broker storage/ack contract verify karo. HTTP status durable storage semantics define nahi karta. Serialization format persistent storage ka replacement nahi."
          , choiceExplanations: ["Durability successful HTTP response se infer nahi hoti; broker storage/ack contract verify karo.","HTTP status durable storage semantics define nahi karta.","Serialization format persistent storage ka replacement nahi."] }
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
        "choices": ["Durability, atomic publish intent aur dedupe chahiye","Broker install se save/publish atomic ho jaate hain","202 producer response consumer delivery prove karta"],
        "answer": 0,
        "explain": "End-to-end reliability producer gap, broker persistence aur duplicate consumer effects teen boundaries cover karti hai. Separate systems ko queue add karna atomic commit nahi deta. Acceptance response downstream completion receipt nahi."
      , choiceExplanations: ["End-to-end reliability producer gap, broker persistence aur duplicate consumer effects teen boundaries cover karti hai.","Separate systems ko queue add karna atomic commit nahi deta.","Acceptance response downstream completion receipt nahi."] },
      "lesson": "Pehle business promise likho. Phir us promise ko failure ke saath chala ke naapo."
    }
  ],
  "interview": {
    "title": "Interview Round — ek order ka safar",
    "instructions": "Pehle KhanaKart ka haal socho. Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Har saved order ka event chahiye. Save ke baad process band ho sakta hai. Kya save(); publish(); kaafi?",
        "choices": ["Order aur publish intent transaction mein record karo","Do awaits sequential hain; atomic transaction maan lo","Try/catch jodo; process-crash gap eliminate ho jaayega"],
        "answer": 0,
        "explain": "Transactional outbox order aur event intent same durable transaction mein record karke relay retry enable kar sakti hai; duplicates phir bhi handle karo. Sequencing alone crash atomicity nahi. Process death application catch code ko execute karne ki guarantee nahi deti."
      , choiceExplanations: ["Transactional outbox order aur event intent same durable transaction mein record karke relay retry enable kar sakti hai; duplicates phir bhi handle karo.","Sequencing alone crash atomicity nahi.","Process death application catch code ko execute karne ki guarantee nahi deti."] },
      {
        "q": "Notify consumer band hai; API 202 de rahi hai. Healthy kehne ke liye kya dekhein?",
        "choices": ["Backlog age, failures aur recovery trend dekho","API median low ho toh consumer health pass maano","Broker process alive ho toh pending work ignore karo"],
        "answer": 0,
        "explain": "Async pipeline health acceptance ke saath completion lag, oldest work aur failed/retried delivery se assess hoti hai. Fast enqueue blocked consumer ko hide kar sakta hai. Process availability useful hai, end-to-end progress ka proof nahi."
      , choiceExplanations: ["Async pipeline health acceptance ke saath completion lag, oldest work aur failed/retried delivery se assess hoti hai.","Fast enqueue blocked consumer ko hide kar sakta hai.","Process availability useful hai, end-to-end progress ka proof nahi."] }
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
