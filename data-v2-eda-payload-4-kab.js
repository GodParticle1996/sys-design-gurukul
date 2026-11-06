/* Playlist · EDA Core topic 2: event payloads. Source credit: Software Developer Diaries,
   A Beginner's Guide to Event-Driven Architecture (RojKJnF_WWQ); Martin Fowler, "What do you mean by Event-Driven?".
   Numbers: docker-labs/47-event-payloads/captures. */
(function () {
const HERO = [{"id": "thin", "icon": "🔔", "label": "patla", "x": 140, "y": 105}, {"id": "fat", "icon": "📦", "label": "mota", "x": 445, "y": 105}, {"id": "delta", "icon": "✏️", "label": "sirf badlaav", "x": 750, "y": 105}];
const EDGES = [{"from": "thin", "to": "fat"}, {"from": "fat", "to": "delta"}];
VISUALS["ep-kab"] = { t: "Teen tarah ki khabar, teen kharche. Kaam ke hisaab se chuno, aadat se nahi.", html: SD.viz.svg(HERO, EDGES, { nodes: { thin: {tone:'slow',badge:'owner par calls'}, fat: {tone:'ok',badge:'apni copy'}, delta: {tone:'busy',badge:'gap pakdo'} } }, {w:890,h:215}) };
SD.registerLevels('sdd-eda', [
{
  "id": "ep-kab",
  "icon": "⚖️",
  "group": "📦 Event Payloads",
  "title": "Payload 4 · Kab — patli khabar, moti khabar ya sirf badlaav?",
  "badge": "Parchi Paarkhi",
  "objectives": [
    "Kis haal mein patli, moti ya sirf badlaav wali khabar chunein?",
    "Kam bytes ka matlab kam kharcha kyun nahi?",
    "Nazuk data khabar aur owner ke jawab mein kaise bachayein?"
  ],
  "lesson": [
    "<h3>⚖️ Teen khabrein, teen kharche</h3><p>Ab tak dekha: patli khabar owner ko bulati hai, moti khabar copy banati hai, sirf badlaav ko gap pakadna padta hai. Ab har situation mein sahi khabar chuno.</p>"
  ],
  "stages": [
    {
      "type": "bins",
      "title": "⚖️ Kaunsi khabar kahan?",
      "instructions": "Har situation mein socho: consumer ko kya chahiye, owner par kitna bharosa, aur data kitna nazuk hai.",
      "bins": [
        {
          "id": "thin",
          "label": "🔔 Patla event + wapas call"
        },
        {
          "id": "fat",
          "label": "📦 Mota event, apni copy"
        },
        {
          "id": "delta",
          "label": "✏️ Sirf badlaav + version"
        }
      ],
      "items": [
        {
          "text": "Payment ka result hamesha taaza chahiye; purani copy par refund nahi bhej sakte",
          "bin": "thin",
          "explain": "Faisla abhi ke sach par hai, toh owner se taaza data lo. Owner band ho toh pending rakho, purani copy par mat chalo."
        },
        {
          "text": "Event mein card number aur poora pata daalna padega, par sirf ek consumer ko chahiye",
          "bin": "thin",
          "explain": "Nazuk data har subscriber tak failana mehenga hai. Sirf ID bhejo; jis consumer ko zaroorat hai, zaroorat wala consumer apni permission ke saath owner se maange — aur owner ka jawab bhi permission ke hisaab se sirf zaroori fields lautaye."
        },
        {
          "text": "delivery-service ko order-service ke band hone par bhi kaam karte rehna hai",
          "bin": "fat",
          "explain": "Kaam ka data event mein ho toh delivery apni copy se chal sakti hai. Copy thodi purani ho sakti hai; thodi purani copy manzoor ho tabhi local-copy wala raasta lo."
        },
        {
          "text": "Paanch consumers har event par ek jaisi order details maangte hain aur owner par read load bhaari hai",
          "bin": "fat",
          "explain": "Har consumer ki wapas call bachti hai. Kharcha: bada event aur har consumer ke paas data ki copy."
        },
        {
          "text": "Menu mein ek dish ka sirf daam badla; poora menu 2 MB ka hai aur roz hazaar baar badalta hai",
          "bin": "delta",
          "explain": "Har baar poora menu bhejna bhaari hai. Sirf badlaav bhejo, par har badlaav par version do aur gap dikhe toh resync karo."
        },
        {
          "text": "Consumer ke paas pehle se poori copy hai; sirf badle fields chahiye, aur version gap pakadne ka code hai",
          "bin": "delta",
          "explain": "Delta tab chalta hai jab consumer ke paas shuruaati copy ho aur chhoota hua badlaav pakad sake."
        },
        {
          "text": "Analytics ki shuruaati copy pehle se bani hai. Har nayi khabar par analytics ko order ka abhi ka data owner se lena hai",
          "bin": "thin",
          "explain": "Patli khabar ID deti hai; analytics owner ko call karke abhi ka order leta hai. Owner band ho toh analytics ruk sakta hai. Shuruaati copy banana (backfill) alag kaam hai, jo teeno tarah ki khabron ke saath ho sakta hai."
        },
        {
          "text": "Kitchen ko sirf thali aur quantity chahiye, aur kitchen order-service par nirbhar nahi rehna chahta",
          "bin": "fat",
          "explain": "Kitchen ke kaam ka data event mein bhejo — sirf items aur quantity. Phone notify ko chahiye, toh kitchen ki khabar alag payload ho, aur notify ka phone kitchen ki line mein na jaaye."
        }
      ]
    },
    {
      "type": "cards",
      "title": "📏 Hisaab: bytes, reads aur phone kahan-kahan gaya",
      "lesson": "Kharcha poore raaste ka gino: khabar ke bytes, owner calls aur copies. Nazuk data khabar aur owner ke jawab, dono mein chhaanto.",
      "goal": "Lab 47 ka size-spread run: 4 orders, har order par 3 khabrein (shuruaat, pata badla, phone badla), 3 consumers. Asli HTTP, teen baar same nateeja.",
      "steps": [
        {
          "title": "1. Sabse chhoti khabar = sabse sasti?",
          "say": "12 khabrein × 3 consumers. Khabron ke kul bytes: patli <b>1,548</b>, moti <b>5,172</b>, sirf badlaav <b>3,492</b>. Owner par reads: patli <b>36</b>, moti <b>0</b>, badlaav <b>0</b>.",
          "ask": {
            "q": "Patli khabar ke bytes sabse kam hain. Kya patli khabar ka kul kharcha bhi sabse kam hai?",
            "choices": [
              "Zaroori nahi — 36 owner calls ke jawab (poora order) in bytes mein gine hi nahi gaye",
              "Haan — bytes sabse kam hain, toh network aur owner dono par bojh sabse kam hai",
              "Nahi — patli khabar broker mein moti khabar se zyada jagah gherti hai"
            ],
            "answer": 0,
            "hint": "Bytes kis cheez ke gine gaye: khabron ke, ya owner calls ke bhi?",
            "explain": "1,548, 5,172 aur 3,492 bytes sirf fanout khabron ke JSON ke hain. Patli khabar par har consumer owner ko call karta hai — 36 calls, har jawab mein poora order — jo is ginti mein nahi. Kharcha poore raaste ka dekho: khabar + calls + owner ka bojh.",
            "choiceExplanations": [
              "1,548, 5,172 aur 3,492 bytes sirf fanout khabron ke JSON ke hain. Patli khabar par har consumer owner ko call karta hai — 36 calls, har jawab mein poora order — jo is ginti mein nahi. Kharcha poore raaste ka dekho: khabar + calls + owner ka bojh.",
              "Owner par 36 reads ka bojh sirf patli khabar par hai. Kam bytes ka matlab kam bojh nahi.",
              "Patli khabar 43 bytes ki hai, moti 144 ki. Broker mein patli khabar kam jagah leti hai."
            ]
          }
        },
        {
          "title": "2. Kitchen tak phone kaise pahuncha?",
          "say": "Kitchen ko sirf thali chahiye. Phir bhi kitchen tak phone pahuncha: moti khabar se <b>12</b> baar, sirf badlaav se <b>8</b> baar — aur patli khabar mein bhi <b>12</b> baar.",
          "ask": {
            "q": "Patli khabar mein phone tha hi nahi. Phir kitchen tak phone 12 baar kaise pahuncha?",
            "choices": [
              "Owner ki call poora order lautati hai — phone call ke jawab mein aaya",
              "Broker ne patli khabar mein chupke se phone jod diya, kitchen ke liye",
              "Kitchen ne notify-service se phone maang liya, jaanch ke liye"
            ],
            "answer": 0,
            "hint": "Patli khabar ke baad kitchen kya karta hai?",
            "explain": "Patli khabar ke baad kitchen owner ko call karta hai, aur is lab ka owner poora order lautata hai — phone samet. Nazuk data bachana hai toh do jagah chhaanto: har consumer ki khabar mein sirf us consumer ke kaam ke fields (alag payload, alag delivery), aur owner ka jawab bhi permission ke hisaab se sirf zaroori fields.",
            "choiceExplanations": [
              "Patli khabar ke baad kitchen owner ko call karta hai, aur is lab ka owner poora order lautata hai — phone samet. Nazuk data bachana hai toh do jagah chhaanto: har consumer ki khabar mein sirf us consumer ke kaam ke fields (alag payload, alag delivery), aur owner ka jawab bhi permission ke hisaab se sirf zaroori fields.",
              "Broker khabar nahi badalta; producer ka poora event payload har consumer tak pahunchta hai.",
              "Is lab mein consumers ek doosre se baat nahi karte. Phone owner ke jawab se aaya."
            ]
          }
        },
        {
          "title": "3. Teen kharche, ek faisla",
          "say": "Patli khabar: owner par reads aur owner par nirbharta. Moti khabar: bada event, har consumer ke paas copy, nazuk data ka failaav. Sirf badlaav: chhota event, par gap pakadna aur resync. Kaam ke fields hi bhejna = consumer ke hisaab se <b>chhaanta hua data</b>. Event ka format badla toh har consumer par asar — format sambhalna agle topics ka kaam hai."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Bytes, reads aur phone ka hisaab — asli HTTP par",
      "project": "47-event-payloads",
      "exercise": "ex6-size-spread",
      "goal": "Teeno modes: 4 orders × 3 khabrein × 3 consumers. Khabron ke bytes, owner par reads, aur bina zaroorat ke pahunche fields gino.",
      "why": "Node 18+ chahiye. Bytes sirf khabron ke JSON ke hain — HTTP headers, acks aur owner calls ke jawab is ginti mein nahi. Neeche ka output captured HTTP runs se hai (--brief); teeno runs byte-identical.",
      "steps": [
        {
          "text": "Lab folder se: bytes, reads aur fields ka failaav.",
          "cmd": "cd docker-labs/47-event-payloads && npm start -- ex6-size-spread --brief",
          "expect": "HTTP between child processes\nmode=thin orders=4 consumers=3 publishedEvents=12 deliveredEvents=36 publishedBytes=516 fanoutBytes=1548 reads=36 consumersReceivingUnusedEventFields=0 unusedEventFieldDeliveries=0 consumersReceivingUnusedEventPhone=0 unusedEventPhoneDeliveries=0 kitchenUnusedEventPhoneDeliveries=0 unusedCallbackFieldDeliveries=72 unusedCallbackPhoneDeliveries=24 kitchenUnusedCallbackPhoneDeliveries=12 consumersReceivingUnusedFieldsViaEitherPath=3\nmode=fat orders=4 consumers=3 publishedEvents=12 deliveredEvents=36 publishedBytes=1724 fanoutBytes=5172 reads=0 consumersReceivingUnusedEventFields=3 unusedEventFieldDeliveries=72 consumersReceivingUnusedEventPhone=2 unusedEventPhoneDeliveries=24 kitchenUnusedEventPhoneDeliveries=12 unusedCallbackFieldDeliveries=0 unusedCallbackPhoneDeliveries=0 kitchenUnusedCallbackPhoneDeliveries=0 consumersReceivingUnusedFieldsViaEitherPath=3\nmode=delta orders=4 consumers=3 publishedEvents=12 deliveredEvents=36 publishedBytes=1164 fanoutBytes=3492 reads=0 consumersReceivingUnusedEventFields=3 unusedEventFieldDeliveries=40 consumersReceivingUnusedEventPhone=2 unusedEventPhoneDeliveries=16 kitchenUnusedEventPhoneDeliveries=8 unusedCallbackFieldDeliveries=0 unusedCallbackPhoneDeliveries=0 kitchenUnusedCallbackPhoneDeliveries=0 consumersReceivingUnusedFieldsViaEitherPath=3"
        },
        {
          "text": "\"Abhi\" ya \"tab\": owner v2 par, khabrein v1 aur v2 baaki.",
          "cmd": "npm start -- ex3-now-then --brief",
          "expect": "HTTP between child processes\nmode=thin ownerVersionBeforeConsumption=2 reads=6\nmode=fat ownerVersionBeforeConsumption=2 reads=0"
        }
      ],
      "observe": {
        "q": "Patli khabar: kitchenUnusedEventPhoneDeliveries=0, par kitchenUnusedCallbackPhoneDeliveries=12. Do counters mila ke kya matlab nikla?",
        "choices": [
          "Khabar mein phone nahi tha, par owner call ke jawab mein tha — dono raaste chhaanto",
          "Patli khabar mein phone chhupa tha; event ke counter ne phone ko gina hi nahi",
          "12 baar kitchen ne galti se notify ki khabar padh li, isliye phone pahuncha"
        ],
        "answer": 0,
        "hint": "Event aur callback alag-alag gine gaye hain.",
        "explain": "Event wale counter mein 0, callback wale mein 12: phone khabar se nahi, owner ke jawab se aaya. Patli khabar apne aap nazuk data nahi bachati — owner ka jawab bhi sirf zaroori fields de, tabhi bachat hai.",
        "choiceExplanations": [
          "Event wale counter mein 0, callback wale mein 12: phone khabar se nahi, owner ke jawab se aaya. Patli khabar apne aap nazuk data nahi bachati — owner ka jawab bhi sirf zaroori fields de, tabhi bachat hai.",
          "Patli khabar sirf {type, id, version} hai, 43 bytes. Phone usme hai hi nahi.",
          "Har consumer ki apni line hai; kitchen sirf apni line padhta hai."
        ]
      },
      "lesson": "Kam bytes ka matlab kam kharcha nahi, aur patli khabar ka matlab privacy nahi. Kharcha poore raaste ka gino: khabar, owner calls, copies — aur nazuk data khabar aur owner ke jawab, dono mein chhaanto."
    }
  ],
  "interview": {
    "title": "Interview Round — patla, mota ya badlaav?",
    "instructions": "Pehle consumer ki zaroorat aur data ki nazakat socho. Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Team ne har OrderUpdated event mein poora customer profile daal diya: phone, pata, payment ka tareeka. 12 services subscribe karti hain. Security review mein kya sawaal uthega?",
        "choices": [
          "Subscribers ko zaroorat se zyada profile data mila; fields aur delivery permissions jaancho",
          "Consumer code phone na padhe toh phone receive karna exposure mein nahi gina jaata",
          "Event retention ek din kar do toh extra fields subscribers tak pahunchna band ho jaata",
          "Schema mein phone optional kar do toh producer ka bheja phone subscribers tak nahi jaata"
        ],
        "answer": 0,
        "explain": "Mota event data ki copy har subscriber tak le jaata hai. Har consumer ke liye kaam ke fields ka alag payload aur delivery permission tay karo; nazuk data ID ke peeche owner ke paas rakho, aur owner ka jawab bhi sirf zaroori fields de. Is lab ka shared broker fields nahi chhaant-ta.",
        "choiceExplanations": [
          "Mota event data ki copy har subscriber tak le jaata hai. Har consumer ke liye kaam ke fields ka alag payload aur delivery permission tay karo; nazuk data ID ke peeche owner ke paas rakho, aur owner ka jawab bhi sirf zaroori fields de. Is lab ka shared broker fields nahi chhaant-ta.",
          "Field receive hua toh exposure hua, chahe consumer code field use na kare.",
          "Retention storage ki muddat badalti hai; delivery ke waqt profile phir bhi pahunchta hai.",
          "Optional field bhi payload mein bheja gaya ho toh shared delivery se sab subscribers ko milta hai."
        ]
      },
      {
        "q": "Consumer ki copy v7 par thi. v8 mein pata badla, par v8 chhoot gaya. Consumer ne v9 ka phone wala delta seedha laga diya, bina version jaanche ya owner se poori copy laaye. Pata galat kyun raha?",
        "choices": [
          "Version gap ki jaanch aur gap par resync nahi chala, toh v8 ka pata kabhi nahi aaya",
          "Delta events mein hamesha poora purana aur naya state dono bhejna chahiye tha",
          "Consumer ko har event do baar padhna chahiye tha, taaki koi event chhoote nahi",
          "Broker ko events ka kram ulta karke bhejna chahiye tha, taaki naya pehle aaye"
        ],
        "answer": 0,
        "explain": "Is delta run mein v8 ne pata aur v9 ne sirf phone badla. v8 chhoota toh pata galat raha. Lagataar versions mein 7 ke baad 9 dikhe toh gap pakdo aur owner se poori copy lo.",
        "choiceExplanations": [
          "Is delta run mein v8 ne pata aur v9 ne sirf phone badla. v8 chhoota toh pata galat raha. Lagataar versions mein 7 ke baad 9 dikhe toh gap pakdo aur owner se poori copy lo.",
          "Delta ke liye poora purana aur naya state bhejna zaroori nahi. Valid naya full snapshot current copy theek kar sakta hai; chhoote event par hone wala SMS phir bhi alag se dekhna padega.",
          "Do baar padhne se chhoota event milta nahi. Version ki ginti hi batati hai ki kuch chhoota.",
          "Kram ulta karne se dikkat aur badhegi. Version se purane aur chhoote events dono pakde jaate hain."
        ]
      }
    ]
  },
  "success": [
    "Situation dekh ke patli, moti ya delta khabar chun sakte ho",
    "Bytes, owner reads aur copies ko saath gin ke kharcha bata sakte ho",
    "Nazuk data ko khabar aur owner ke jawab dono mein chhaant-ne ki baat samjha sakte ho"
  ],
  "cards": [
    {
      "front": "Mota event kab?",
      "back": "Consumer ko owner ke band hone par bhi chalna hai, aur thodi purani copy manzoor hai."
    },
    {
      "front": "Patla event kab?",
      "back": "Faisla taaze data par hai, ya data nazuk hai aur har subscriber tak nahi failana."
    },
    {
      "front": "Delta event ki shart?",
      "back": "Shuruaati copy + har event par version + gap dikhe toh resync. Version aur resync ke bina galti chupchaap rehti hai."
    }
  ]
}
]);
})();
