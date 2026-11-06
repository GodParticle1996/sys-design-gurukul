/* Playlist · EDA Core topic 5: Event sourcing. Source credit: Software Developer Diaries,
   "Event Sourcing: Genius or Just Over-Engineering?" (wXg_aON4oj8).
   Numbers: docker-labs/50-event-sourcing/captures. */
(function () {
const HERO = [{"id": "hist", "icon": "📜", "label": "itihaas chahiye?", "x": 140, "y": 105}, {"id": "read", "icon": "🔎", "label": "padhna dheema?", "x": 445, "y": 105}, {"id": "cost", "icon": "💸", "label": "kharcha utha sakte?", "x": 750, "y": 105}];
const EDGES = [{"from": "hist", "to": "read"}, {"from": "read", "to": "cost"}];
VISUALS["es-kab"] = { t: "Teen sawaal: itihaas product ka hissa hai, dikkat sirf padhne ki hai, aur versioning-projections ka kharcha utha sakte ho?", html: SD.viz.svg(HERO, EDGES, { nodes: { hist: {tone:'acc',badge:'haan → events'}, read: {tone:'acc',badge:'haan → read model'}, cost: {tone:'slow',badge:'mitana, versions'} } }, {w:890,h:215}) };
SD.registerLevels('sdd-eda', [
{
  "id": "es-kab",
  "icon": "⚖️",
  "group": "📒 Event Sourcing",
  "title": "Sourcing 4 · Kab — passbook kahan, slate kahan?",
  "badge": "Passbook Pandit",
  "objectives": [
    "Kis hisse mein event sourcing ka kharcha banta hai?",
    "Kahan seedha CRUD ya alag read model kaafi hai?",
    "Mitana, versioning aur read models ka kharcha kaise socho?"
  ],
  "lesson": [
    "<h3>⚖️ Har kaam ko passbook nahi chahiye</h3><p>Bank ke khaate ko passbook chahiye. Ravi ke ghar ke address ko nahi; address ke liye aakhri value hi kaafi hai.</p><p>Neeche har situation ko sahi dibbe mein daalo, phir passbook ke chhupe kharche dekho.</p>"
  ],
  "stages": [
    {
      "type": "bins",
      "title": "⚖️ Passbook chahiye, ya slate kaafi hai?",
      "instructions": "Har situation mein poochho: itihaas aur purani tareekh ki haalat product ka hissa hai? Ya sirf aakhri haalat chahiye, aur dikkat bas padhne ki raftaar hai?",
      "bins": [
        {
          "id": "es",
          "label": "📒 Event sourcing"
        },
        {
          "id": "crud",
          "label": "🗂️ Seedha CRUD (+ audit table)"
        },
        {
          "id": "cqrs",
          "label": "🔎 CRUD + alag read model"
        }
      ],
      "items": [
        {
          "text": "Bank wallet: har paise ka hisaab, aur dispute mein \"us din kitna tha\" saabit karna",
          "bin": "es",
          "explain": "Itihaas aur kisi bhi pal ki haalat hi product hai — event sourcing ka seedha kaam."
        },
        {
          "text": "User profile: naam, photo, notification settings; bas aakhri value chahiye",
          "bin": "crud",
          "explain": "Itihaas ki koi maang nahi. Events, projections aur versioning ka kharcha bekaar."
        },
        {
          "text": "Product search page: orders DB par bhari JOINs se page dheema; likhne ka model theek chal raha hai",
          "bin": "cqrs",
          "explain": "Dikkat padhne mein hai: alag read model (search index ya denormalized table) bana do. Likhne wale model ko events mein badalna zaroori nahi."
        },
        {
          "text": "Insurance claim: regulator har badlaav ka kab-kisne-kya maangta hai, aur purani tareekh ka status",
          "bin": "es",
          "explain": "Poora itihaas aur purani haalat regulator ki maang hai — events se dono seedhe milte hain."
        },
        {
          "text": "Blog comments: likho, edit karo, mitao; koi audit maang nahi",
          "bin": "crud",
          "explain": "Simple CRUD. Mitana bhi aasaan rehta hai — event sourcing mein mitana mushkil hota."
        },
        {
          "text": "Admin dashboard: roz ke orders aur revenue ke counters; thoda purana dikhe toh chalega",
          "bin": "cqrs",
          "explain": "Pehle se jode hue counters ka read model kaafi hai. Source CRUD bhi ho sakta hai (outbox ya CDC se updates)."
        },
        {
          "text": "Trading order book: har order ka itihaas replay karke bugs aur fraud dhoondhna",
          "bin": "es",
          "explain": "Replay hi kaam hai: events dobara chala ke dekhna ki kab kya hua."
        },
        {
          "text": "Internal settings jo saal mein do baar badlein; kisne badla, ek line mein chahiye",
          "bin": "crud",
          "explain": "Kabhi-kabhi ka badlaav + ek audit table (usi transaction mein) kaafi. Poora event sourcing bhaari padega."
        }
      ]
    },
    {
      "type": "cards",
      "title": "⚠️ Passbook ke chhupe kharche",
      "goal": "Event sourcing ke faayde dikh gaye. Ab kharche: mitana, versioning, read models ki dekhbhaal, aur faisla kitne bade hisse par.",
      "lesson": "Event sourcing ek hisse ka faisla hai, poori company ka nahi. Mitane ka intezaam, versioning aur read models ka kharcha pehle din se socho.",
      "steps": [
        {
          "title": "1. Mitana mushkil",
          "say": "Events kabhi nahi badalte. Par user kehta hai \"mera data mitao\" (GDPR jaise kanoon). Phone aur email events mein likhe hain toh?",
          "ask": {
            "q": "Personal data events mein ho aur mitana pade, toh aam tareeka kya hai?",
            "choices": [
              "Personal data events se bahar rakho, ya har user ki key se encrypt karo aur key mita do",
              "UPDATE chala ke events se phone aur email hata do — kanoon ke liye yahi ek chhoot hai",
              "Kuch mat karo — events immutable hain, toh mitane ka kanoon event store par lagta hi nahi"
            ],
            "answer": 0,
            "hint": "Kanoon pattern dekh ke badalta hai?",
            "explain": "Personal data alag, mit sakne wale store mein rakho; event mein bacha id bhi pehchaan jod sakta hai. Crypto-shredding chuno toh har user ki key ki saari recoverable copies mitni chahiye. Read models, snapshots, logs aur backups mein personal data ka bhi intezaam karo. Sirf key mitana kanoon ke paalan ka apne aap saboot nahi — design pehle din se karo.",
            "choiceExplanations": [
              "Personal data alag, mit sakne wale store mein rakho; event mein bacha id bhi pehchaan jod sakta hai. Crypto-shredding chuno toh har user ki key ki saari recoverable copies mitni chahiye. Read models, snapshots, logs aur backups mein personal data ka bhi intezaam karo. Sirf key mitana kanoon ke paalan ka apne aap saboot nahi — design pehle din se karo.",
              "Event store badalna audit ka bharosa todta hai, aur copies (snapshots, read models, backups) mein data phir bhi reh jaata hai.",
              "Mitane ka haq data par lagta hai, storage ke tareeke par nahi. Events mein personal data hai toh kanoon events par bhi lagta hai."
            ]
          }
        },
        {
          "title": "2. Versioning hamesha",
          "say": "Har event ka roop saalon tak padhna padega. Naya field, naya naam — upcasters badhte jaate hain, aur har upcaster ka test chahiye."
        },
        {
          "title": "3. Read models ki dekhbhaal",
          "say": "Har read model = alag table, alag projector, alag checkpoint. Naya read model chahiye toh shuru se replay. Lab: ek account ke 1,00,350 events 137–144 ms; bade store par poora replay ghanton ka kaam ho sakta hai."
        },
        {
          "title": "4. Kitne bade hisse par?",
          "say": "Microsoft ke pattern page par: adopt karne ke baad pattern \"constrains future design decisions in the parts of the system that use it\". Faisla system ke us hisse ka hai jahan pattern laga.",
          "ask": {
            "q": "Startup: \"Hum poora system event sourcing par banayenge — users, settings, ledger, sab.\" Aapki salaah?",
            "choices": [
              "Sirf ledger jaise hisse mein lagao jahan itihaas chahiye; baaki hisse seedha CRUD",
              "Theek hai — ek pattern poore system par ho toh team ke liye seekhna aasaan rahega",
              "Event sourcing ki jagah Kafka lagao — Kafka mein events rakhna hi event sourcing hai"
            ],
            "answer": 0,
            "hint": "Users aur settings ko itihaas chahiye?",
            "explain": "Event sourcing ka kharcha (versioning, projections, mitana, debugging) sirf un hisson mein uthao jahan faayda ho: itihaas, audit, purani haalat. Users aur settings ko itihaas nahi chahiye. Aur Kafka ek broker hai; event sourcing ek tareeka — Kafka ke bina bhi chalta hai, aur Kafka lagane se event sourcing nahi ho jaata.",
            "choiceExplanations": [
              "Event sourcing ka kharcha (versioning, projections, mitana, debugging) sirf un hisson mein uthao jahan faayda ho: itihaas, audit, purani haalat. Users aur settings ko itihaas nahi chahiye. Aur Kafka ek broker hai; event sourcing ek tareeka — Kafka ke bina bhi chalta hai, aur Kafka lagane se event sourcing nahi ho jaata.",
              "Ek pattern sab jagah lagane se har chhote CRUD par bhi versioning, projections aur mitane ka kharcha aata hai.",
              "Kafka par events bhejna event sourcing nahi hai. Event sourcing mein events hi sach ka source hote hain, aur stream ka version jaanch ke likhna padta hai."
            ]
          }
        },
        {
          "title": "5. Naam",
          "say": "<b>Event sourcing</b> = sach ka source events. <b>CQRS</b> = likhne aur padhne ke alag model. <b>Kafka</b> = ek broker. Teeno alag; event sourcing aksar CQRS ke saath aata hai, par ek doosre ke bina bhi chalte hain."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Lambi passbook aur purana roop — asli SQLite mein",
      "project": "50-event-sourcing",
      "exercise": "ex3-replay",
      "goal": "Ek account ke 1,00,350 events: shuru se fold vs snapshot. Phir 2 purane schema ke events: bina upcaster vs saath.",
      "why": "Node 24+ chahiye. Tool ek temp SQLite file banata aur mita deta hai. Teen runs: shuru se 137–144 ms, snapshot se 0.5 ms; padhe gaye events aur balance har baar wahi.",
      "steps": [
        {
          "text": "Lab folder se: replay ka kharcha.",
          "cmd": "cd docker-labs/50-event-sourcing && npm start -- ex3-replay replay",
          "expect": "replay   1,00,350 events: shuru se 1,00,350 padhe, 144.4 ms · snapshot v1,00,000 + 350 padhe, 0.5 ms · balance 250880 / 250880"
        },
        {
          "text": "Purane schema ke events.",
          "cmd": "npm start -- ex3-replay upcast",
          "expect": "upcast   5 events (2 purane schema 1): bina upcaster balance=50 · upcaster ke saath 130 · events table hash 58836a9feb0d → 58836a9feb0d"
        }
      ],
      "observe": {
        "q": "Ek account ka replay budget se dheema hai (lab: 1,00,350 events, 137–144 ms). Snapshot ya stream badalne se pehle kya jaanchoge?",
        "choices": [
          "Account ki business boundary, stream ki growth aur replay ka budget; phir snapshot ya redesign",
          "Sirf events table ka index — index sahi ho toh replay kabhi bhi dheema ho hi nahi sakta",
          "Sirf user ki shikaayat — jab tak koi complain na kare, replay ki raftaar theek hi maano"
        ],
        "answer": 0,
        "hint": "Snapshot aur stream badalna — dono kab sahi hain?",
        "explain": "Lamba account stream apne aap galat nahi. Replay ka kharcha maapo; snapshot se usi stream ka replay tez hota hai (lab: 0.5 ms; Microsoft: \"every N events\"). Saal band karna business ka asli niyam ho tab stream badalna socho — purani stream band karna aur nayi stream ka opening balance, dono surakshit hone chahiye.",
        "choiceExplanations": [
          "Lamba account stream apne aap galat nahi. Replay ka kharcha maapo; snapshot se usi stream ka replay tez hota hai (lab: 0.5 ms; Microsoft: \"every N events\"). Saal band karna business ka asli niyam ho tab stream badalna socho — purani stream band karna aur nayi stream ka opening balance, dono surakshit hone chahiye.",
          "(stream, version) par index pehle se hai. Index dhoondhna tez karta hai, par 1,00,350 events padhna aur jodna phir bhi padta hai — lab mein yahi 137–144 ms.",
          "Shikaayat aane tak command dheemi chal chuki hoti hai. Budget pehle tay karo aur replay maapo."
        ]
      },
      "lesson": "Replay ka kharcha maapo; snapshot usi stream ka padhna tez karta hai, par events ki jagah nahi leta. Stream ki boundary business ke niyam se chuno. Upcaster purane events ko padhte waqt naya roop deta hai, aur events table jaisa tha waisa rehta hai."
    }
  ],
  "interview": {
    "title": "Interview Round — design review",
    "instructions": "Pehle socho: itihaas chahiye, ya bas aaj ki haalat aur tez padhna? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Food delivery startup poochhta hai: \"Orders ke liye event sourcing lagayein?\" Zaroorat: order status dikhana, restaurant ko bhejna, roz ka report. Koi audit maang nahi. Aapki salaah?",
        "choices": [
          "Abhi seedha CRUD + events (outbox) kaafi; itihaas ki maang aaye tab socho",
          "Haan — event-driven system mein event sourcing hamesha zaroori hota hai",
          "Haan — event sourcing lagate hi system apne aap tez aur scalable ho jaata hai",
          "Nahi — event sourcing sirf banks ke liye bana hai, kisi aur kaam ka nahi"
        ],
        "answer": 0,
        "explain": "Events bhejna (EDA) aur events ko sach ka source banana (event sourcing) alag faisle hain. Status, notification aur report CRUD + outbox se ban jaate hain. Itihaas, audit ya purani haalat ki maang ho tab event sourcing ka kharcha banta hai.",
        "choiceExplanations": [
          "Events bhejna (EDA) aur events ko sach ka source banana (event sourcing) alag faisle hain. Status, notification aur report CRUD + outbox se ban jaate hain. Itihaas, audit ya purani haalat ki maang ho tab event sourcing ka kharcha banta hai.",
          "EDA mein services events se baat karti hain; har service ka data events mein rakhna zaroori nahi.",
          "Likhna (append) sasta hai, par read models, replay aur versioning ka kharcha bhi aata hai. Tez hona apne aap nahi hota.",
          "Insurance, ticketing, trading, inventory — itihaas chahiye toh event sourcing kaam ka hai."
        ]
      },
      {
        "q": "Ledger ke purane events mein amount, category aur transaction ka waqt likha hai. Abhi read model mein sirf account ka total balance hai. Purane mahinon ke category-wise totals ka naya read model chahiye, bina har request par poora ledger jode. Kaise banaoge?",
        "choices": [
          "Naya projector checkpoint 0 se chalao: purane events replay karke read model bharo",
          "Aaj se naye events se hi bharo — purane mahinon ka data ab kahin se nahi milega",
          "Purane read model ki table copy karke naya column jodo; events padhne ki zaroorat nahi",
          "Har request par poore ledger ke events jodo; read model banane ki zaroorat hi nahi"
        ],
        "answer": 0,
        "explain": "Event sourcing ka bada faayda: naya read model purane events se bhi ban jaata hai. Naya projector checkpoint 0 se chalao, purane events replay hon, phir naye events ke saath chalta rahe. Replay isliye kaam karta hai kyunki category aur waqt events mein likhe gaye the. Sirf aakhri haalat rakhne wale CRUD se purane badlaav nahi milte; CRUD ke saath poori history table ho toh purani jaankari mil sakti hai — event sourcing mein events hi sach ka source hain.",
        "choiceExplanations": [
          "Event sourcing ka bada faayda: naya read model purane events se bhi ban jaata hai. Naya projector checkpoint 0 se chalao, purane events replay hon, phir naye events ke saath chalta rahe. Replay isliye kaam karta hai kyunki category aur waqt events mein likhe gaye the. Sirf aakhri haalat rakhne wale CRUD se purane badlaav nahi milte; CRUD ke saath poori history table ho toh purani jaankari mil sakti hai — event sourcing mein events hi sach ka source hain.",
          "Purane events store mein hain — replay se purane mahine bhi bharte hain.",
          "Purane read model mein sirf total balance hai; category aur mahine ki jaankari total balance wali table mein kabhi thi hi nahi.",
          "Har request par poora ledger jodna har baar replay ka kharcha hai — read model isi kharche se bachata hai."
        ]
      }
    ]
  },
  "success": [
    "Event sourcing kis hisse mein lagana hai, chun sakte ho",
    "CRUD, alag read model aur event sourcing ka farq bata sakte ho",
    "Mitane, versioning aur read models ka kharcha pehle se gin sakte ho"
  ],
  "cards": [
    {
      "front": "Event sourcing kab?",
      "back": "Jab itihaas, audit ya purani tareekh ki haalat product ka hissa ho — ledger, claims, trading."
    },
    {
      "front": "Event sourcing aur Kafka?",
      "back": "Alag. Kafka ek broker; event sourcing = sach ka source events. Kafka ke bina bhi chalta hai."
    },
    {
      "front": "Personal data aur immutable events?",
      "back": "Personal data alag, mit sakne wale store mein rakho. Crypto-shredding mein har user ki key ki saari recoverable copies mitao; plaintext copies aur bache identifiers ka bhi intezaam chahiye."
    }
  ]
}
]);
})();
