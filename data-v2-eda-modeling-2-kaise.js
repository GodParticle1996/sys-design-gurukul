/* Playlist · EDA Core topic 6: Event modeling. Source credit: Software Developer Diaries,
   "4 Event-Modeling Mistakes in Event-Driven Architectures" (m3mY3Ra-BcI); anti-patterns from Oskar Dudycz.
   Numbers: docker-labs/51-event-modeling/captures. */
(function () {
const HERO = [{"id": "prof", "icon": "🧑", "label": "profile service", "x": 150, "y": 55}, {"id": "ord", "icon": "📦", "label": "order service", "x": 150, "y": 295}, {"id": "bus", "icon": "📬", "label": "bus", "x": 500, "y": 190}, {"id": "lab", "icon": "🏷️", "label": "label service", "x": 810, "y": 55}, {"id": "ver", "icon": "✉️", "label": "email verifier", "x": 810, "y": 295}];
const EDGES = [{"from": "prof", "to": "bus"}, {"from": "ord", "to": "bus"}, {"from": "bus", "to": "lab"}, {"from": "bus", "to": "ver"}];
VISUALS["em-kaise"] = { t: "Ek kaam, ek event: AddressChanged mein poora pata, EmailChangeRequested alag. Label sahi, verifier sirf apne kaam par.", html: SD.viz.svg(HERO, EDGES, { nodes: { prof: {tone:'ok',badge:'kaam ke naam'}, ord: {tone:'ok',badge:'o1'}, bus: {tone:'busy',badge:''}, lab: {tone:'ok',badge:'poora naya'}, ver: {tone:'ok',badge:'1 baar'} } }, {w:890,h:330}) };
SD.registerLevels('sdd-eda', [
{
  "id": "em-kaise",
  "icon": "🔧",
  "group": "🧩 Event Modeling",
  "title": "Modeling 2 · Kaise — kaam ka naam, ek aur field, aur roop badalna",
  "badge": "Ghatna Sevak",
  "objectives": [
    "Events ko business ke kaam ke hisaab se kaise kaatein?",
    "Ek consumer ko naya field chahiye — teen raaston ka kharcha?",
    "Event ka roop badlein toh consumers kaise na tootein?"
  ],
  "lesson": [
    "<h3>📛 Postcard nahi, ek chitthi</h3><p>Ravi ab naya pata ek hi chitthi mein bhejta hai: street, shehar aur pin saath. Email badalne ki chitthi alag, kyunki bank naya email verify karega.</p><p>Wahi din, wahi orders — is baar courier ko kya mila? Pehle dekho.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "📛 Kaam ke naam ka event — wahi din, naya design",
      "goal": "Wahi Ravi, wahi saves, wahi orders beech mein. Is baar profile service business ke kaam ke hisaab se event bhejta hai: ghar badla = AddressChanged (poora naya address), email badla = EmailChangeRequested. Lab 51 ka ex1-granular intent --trace.",
      "nodes": [
        {
          "id": "prof",
          "icon": "🧑",
          "label": "profile service",
          "x": 150,
          "y": 55
        },
        {
          "id": "ord",
          "icon": "📦",
          "label": "order service",
          "x": 150,
          "y": 295
        },
        {
          "id": "bus",
          "icon": "📬",
          "label": "bus",
          "x": 500,
          "y": 190
        },
        {
          "id": "lab",
          "icon": "🏷️",
          "label": "label service",
          "x": 810,
          "y": 55
        },
        {
          "id": "ver",
          "icon": "✉️",
          "label": "email verifier",
          "x": 810,
          "y": 295
        }
      ],
      "edges": [
        {
          "from": "prof",
          "to": "bus"
        },
        {
          "from": "ord",
          "to": "bus"
        },
        {
          "from": "bus",
          "to": "lab"
        },
        {
          "from": "bus",
          "to": "ver"
        }
      ],
      "viz": {
        "w": 910,
        "h": 370
      },
      "vars": [
        {
          "id": "addr",
          "label": "Label service ki copy"
        },
        {
          "id": "labels",
          "label": "Chhape labels"
        },
        {
          "id": "ver",
          "label": "Verifier jaaga"
        }
      ],
      "steps": [
        {
          "title": "Ghar badla — ek event",
          "clock": "msg 1",
          "say": "<b>AddressChanged</b> { street: Lake View 5, city: Bengaluru, pin: 560001 }. Teeno field ek saath; label service ki copy ek hi kadam mein poori nayi.",
          "nodes": {
            "prof": {
              "tone": "ok",
              "badge": "save"
            },
            "ord": {
              "tone": "idle",
              "badge": ""
            },
            "bus": {
              "tone": "busy",
              "badge": "1 event"
            },
            "lab": {
              "tone": "ok",
              "badge": "poora naya"
            },
            "ver": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "addr": "Lake View 5, Bengaluru, 560001",
            "labels": "—",
            "ver": "0"
          },
          "flows": [
            {
              "from": "prof",
              "to": "bus",
              "label": "",
              "tone": "acc"
            },
            {
              "from": "bus",
              "to": "lab",
              "label": "",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "o1 pack hua",
          "clock": "msg 2",
          "say": "Ab <b>OrderPacked o1</b> aaya, theek pehle jaisi jagah par.",
          "nodes": {
            "prof": {
              "tone": "idle",
              "badge": ""
            },
            "ord": {
              "tone": "ok",
              "badge": "o1"
            },
            "bus": {
              "tone": "busy",
              "badge": "o1"
            },
            "lab": {
              "tone": "ok",
              "badge": "label"
            },
            "ver": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "addr": "Lake View 5, Bengaluru, 560001",
            "labels": "o1: ?",
            "ver": "0"
          },
          "flows": [
            {
              "from": "ord",
              "to": "bus",
              "label": "o1",
              "tone": "acc"
            },
            {
              "from": "bus",
              "to": "lab",
              "label": "o1",
              "tone": "ok"
            }
          ],
          "ask": {
            "q": "o1 ke label par kaunsa address chhapa?",
            "choices": [
              "Lake View 5, Bengaluru, 560001 — label service tak poora naya address ek saath pahunch chuka tha",
              "Lake View 5, Pune, 411001 — city aur pin ke events abhi bhi raste mein the, pichhli baar jaisa",
              "MG Road 12, Pune, 411001 — save poora hone tak label service purana address hi rakhta hai"
            ],
            "answer": 0,
            "hint": "Is design mein ghar badalne ke kitne events hain?",
            "explain": "Ghar badalna ek event tha, toh label service ke paas beech ka koi aadha pal nahi raha: ya poora purana, ya poora naya. Lab: intent mode mein 0 / 2 labels mile-jule (field mode mein 2 / 2).",
            "choiceExplanations": [
              "Ghar badalna ek event tha, toh label service ke paas beech ka koi aadha pal nahi raha: ya poora purana, ya poora naya. Lab: intent mode mein 0 / 2 labels mile-jule (field mode mein 2 / 2).",
              "City aur pin alag events the hi nahi — AddressChanged mein teeno saath aaye.",
              "Label service ne AddressChanged laga diya tha; ab naya address hi label service ki copy hai."
            ]
          }
        },
        {
          "title": "Email — alag event",
          "clock": "msg 3",
          "say": "<b>EmailChangeRequested</b> { ravi@new.in }. Verifier EmailChangeRequested sunta hai. Lab mein verifier ek baar jaaga aur ek kaam ki email request gini; mail bhejna lab ke model ka hissa nahi.",
          "nodes": {
            "prof": {
              "tone": "ok",
              "badge": "email"
            },
            "ord": {
              "tone": "idle",
              "badge": ""
            },
            "bus": {
              "tone": "busy",
              "badge": "1 event"
            },
            "lab": {
              "tone": "idle",
              "badge": ""
            },
            "ver": {
              "tone": "ok",
              "badge": "jaaga"
            }
          },
          "vars": {
            "addr": "Lake View 5, Bengaluru, 560001",
            "labels": "o1 sahi",
            "ver": "1 (kaam ka 1)"
          },
          "flows": [
            {
              "from": "prof",
              "to": "bus",
              "label": "email",
              "tone": "acc"
            },
            {
              "from": "bus",
              "to": "ver",
              "label": "verify",
              "tone": "ok"
            }
          ],
          "ask": {
            "q": "Email bhi usi form mein badla tha. Email ko AddressChanged ke andar kyun nahi daala?",
            "choices": [
              "Email badalna alag kaam hai — verification ka apna workflow shuru karta hai",
              "Optional email wala AddressChanged bus par mana ho jaata, kyunki shakal badal jaati",
              "Naam se fark nahi padta — verifier har event ke payload mein email dhoondh leta"
            ],
            "answer": 0,
            "hint": "Email badalne ke baad kaun-sa naya kaam shuru hota hai?",
            "explain": "Ek event = ek business kaam. Ghar badalna label aur courier ka kaam hai; email badalna verification shuru karta hai. Alag naam se verifier sirf apne kaam par jaagta hai. Dudycz bhi kehte hain: \"sometimes it makes sense to create field change events\" — jab field ka apna workflow ho.",
            "choiceExplanations": [
              "Ek event = ek business kaam. Ghar badalna label aur courier ka kaam hai; email badalna verification shuru karta hai. Alag naam se verifier sirf apne kaam par jaagta hai. Dudycz bhi kehte hain: \"sometimes it makes sense to create field change events\" — jab field ka apna workflow ho.",
              "Lab ka bus event ki shakal jaanchta hi nahi. Asli dikkat: AddressChanged naam se pata nahi chalta ki email bhi badla.",
              "Naam alag na ho toh verifier ko har save kholna padta. Lab ka generic roop: verifier 3 baar jaaga, kaam ka 1."
            ]
          }
        },
        {
          "title": "Naam aur photo",
          "clock": "msg 4–6",
          "say": "<b>OrderPacked o2</b>, phir <b>NameChanged</b>, <b>PhotoChanged</b>. Label sahi chhapa; verifier nahi jaaga. Lab: verifier 1 baar jaaga, kaam ka 1 (generic mein 3 baar, kaam ka 1).",
          "nodes": {
            "prof": {
              "tone": "ok",
              "badge": "naam, photo"
            },
            "ord": {
              "tone": "ok",
              "badge": "o2"
            },
            "bus": {
              "tone": "busy",
              "badge": ""
            },
            "lab": {
              "tone": "ok",
              "badge": "o2 sahi"
            },
            "ver": {
              "tone": "idle",
              "badge": "so raha"
            }
          },
          "vars": {
            "addr": "Lake View 5, Bengaluru, 560001",
            "labels": "o1, o2 sahi",
            "ver": "1 (kaam ka 1)"
          },
          "flows": [
            {
              "from": "ord",
              "to": "bus",
              "label": "o2",
              "tone": "acc"
            },
            {
              "from": "bus",
              "to": "lab",
              "label": "o2",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Niyam",
          "clock": "niyam",
          "say": "Event ka naam business ka kaam, beete hue kaal mein: <b>AddressChanged</b>, <b>EmailChangeRequested</b>. Ek kaam ke saare field ek event mein; alag workflow wala kaam alag event mein. Is tareeke ko <b>intent ke hisaab se events</b> kehte hain.",
          "nodes": {
            "prof": {
              "tone": "ok",
              "badge": ""
            },
            "ord": {
              "tone": "idle",
              "badge": ""
            },
            "bus": {
              "tone": "idle",
              "badge": ""
            },
            "lab": {
              "tone": "ok",
              "badge": ""
            },
            "ver": {
              "tone": "ok",
              "badge": ""
            }
          },
          "vars": {
            "addr": "Lake View 5, Bengaluru, 560001",
            "labels": "2 / 2 sahi",
            "ver": "1 (kaam ka 1)"
          }
        }
      ],
      "lesson": "Events ko business ke kaam ke hisaab se kaato: ek kaam ke saare field ek event mein (beech ka aadha pal hi nahi bachta), aur apne workflow wale kaam ka alag event. Naam beete hue kaam ka, consumer ki zaroorat ka nahi."
    },
    {
      "type": "dryrun",
      "title": "🔧 Event ka roop badla — kaunsa consumer toota?",
      "goal": "PaymentCaptured { orderId, amount }. Do consumers: strict (data mein anjaana field aaya toh event mana) aur tolerant (sirf orderId aur amount padhta hai, baaki chhod deta hai). Har roop ke 100 events, asli processes — lab 51 ka ex4-evolve.",
      "nodes": [
        {
          "id": "pay",
          "icon": "💳",
          "label": "payment service",
          "x": 140,
          "y": 165
        },
        {
          "id": "strict",
          "icon": "🧱",
          "label": "strict consumer",
          "x": 700,
          "y": 75
        },
        {
          "id": "tol",
          "icon": "🌿",
          "label": "tolerant consumer",
          "x": 700,
          "y": 255
        }
      ],
      "edges": [
        {
          "from": "pay",
          "to": "strict"
        },
        {
          "from": "pay",
          "to": "tol"
        }
      ],
      "viz": {
        "w": 890,
        "h": 330
      },
      "vars": [
        {
          "id": "ev",
          "label": "Event ka data"
        },
        {
          "id": "strict",
          "label": "Strict"
        },
        {
          "id": "tol",
          "label": "Tolerant"
        }
      ],
      "steps": [
        {
          "title": "v1 — shuru",
          "clock": "v1",
          "say": "{ orderId, amount }. Dono consumers ne 100 / 100 padh liye.",
          "nodes": {
            "pay": {
              "tone": "ok",
              "badge": "v1"
            },
            "strict": {
              "tone": "ok",
              "badge": "100 theek"
            },
            "tol": {
              "tone": "ok",
              "badge": "100 theek"
            }
          },
          "vars": {
            "ev": "orderId, amount",
            "strict": "100 theek",
            "tol": "100 theek"
          },
          "flows": [
            {
              "from": "pay",
              "to": "strict",
              "label": "v1",
              "tone": "ok"
            },
            {
              "from": "pay",
              "to": "tol",
              "label": "v1",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "v2 — naya field",
          "clock": "v2",
          "say": "Payment team ne <b>method: \"upi\"</b> joda. Purane field waise hi.",
          "nodes": {
            "pay": {
              "tone": "busy",
              "badge": "+method"
            },
            "strict": {
              "tone": "slow",
              "badge": "?"
            },
            "tol": {
              "tone": "slow",
              "badge": "?"
            }
          },
          "vars": {
            "ev": "orderId, amount, method",
            "strict": "?",
            "tol": "?"
          },
          "flows": [
            {
              "from": "pay",
              "to": "strict",
              "label": "v2",
              "tone": "acc"
            },
            {
              "from": "pay",
              "to": "tol",
              "label": "v2",
              "tone": "acc"
            }
          ],
          "ask": {
            "q": "Naya field jodne par kya hoga?",
            "choices": [
              "Strict 100 / 100 mana karega (anjaana field); tolerant method chhod ke 100 padhega",
              "Dono 100 / 100 padhenge — field joda hai, koi purana field hataya ya badla nahi",
              "Dono 100 / 100 mana karenge — consumers ko har naya roop pehle se pata hona chahiye"
            ],
            "answer": 0,
            "hint": "Strict consumer anjaane field ke saath kya karta hai?",
            "explain": "Strict consumer anjaana field dekhte hi event mana karta hai — method ne strict consumer se sau ke sau events chhudwa diye. Tolerant consumer sirf jo chahiye wahi padhta hai. Lab: v2 par strict mana 100, tolerant theek 100. Fowler: \"be as tolerant as possible when reading data from a service\".",
            "choiceExplanations": [
              "Strict consumer anjaana field dekhte hi event mana karta hai — method ne strict consumer se sau ke sau events chhudwa diye. Tolerant consumer sirf jo chahiye wahi padhta hai. Lab: v2 par strict mana 100, tolerant theek 100. Fowler: \"be as tolerant as possible when reading data from a service\".",
              "Producer ke liye naya field jodna safe badlaav tha, par strict consumer anjaana field bardaasht nahi karta.",
              "Tolerant consumer naya field chhod deta hai; tolerant ko naya roop pehle se jaanna zaroori nahi."
            ]
          }
        },
        {
          "title": "v3 — naam badla",
          "clock": "v3",
          "say": "Ab team ne <b>amount</b> ka naam <b>total</b> kar diya: { orderId, total }.",
          "nodes": {
            "pay": {
              "tone": "busy",
              "badge": "amount → total"
            },
            "strict": {
              "tone": "bad",
              "badge": "mana"
            },
            "tol": {
              "tone": "slow",
              "badge": "?"
            }
          },
          "vars": {
            "ev": "orderId, total",
            "strict": "100 mana",
            "tol": "?"
          },
          "flows": [
            {
              "from": "pay",
              "to": "strict",
              "label": "v3",
              "tone": "bad"
            },
            {
              "from": "pay",
              "to": "tol",
              "label": "v3",
              "tone": "acc"
            }
          ],
          "ask": {
            "q": "Tolerant consumer v3 ke saath kya karega?",
            "choices": [
              "100 / 100 mana — tolerant bhi amount padhta hai, aur amount ab hai hi nahi",
              "100 / 100 theek — tolerant anjaana total chhod deta hai, toh v3 bhi chal jaayega",
              "100 / 100 theek — tolerant total ko apne aap amount samajh ke padh leta hai"
            ],
            "answer": 0,
            "hint": "Tolerant consumer kaunsa field padhta hai?",
            "explain": "Tolerant hona anjaana field chhodna hai, gayab field banana nahi. amount gaya toh tolerant ke paas padhne ko kuch nahi bacha. Lab: v3 par dono 100 mana. Jis field par reader nirbhar hai, us field ka naam badalna ya hatana us reader ko todta hai.",
            "choiceExplanations": [
              "Tolerant hona anjaana field chhodna hai, gayab field banana nahi. amount gaya toh tolerant ke paas padhne ko kuch nahi bacha. Lab: v3 par dono 100 mana. Jis field par reader nirbhar hai, us field ka naam badalna ya hatana us reader ko todta hai.",
              "total chhoot gaya, par amount bhi nahi tha — tolerant ka zaroori field hi gayab tha.",
              "Code mein total ko amount maanne wali koi line nahi. Field ka naam hi contract hai."
            ]
          }
        },
        {
          "title": "v4 — dono bhejo",
          "clock": "v4",
          "say": "Migration ka tareeka: kuch waqt <b>amount aur total, dono</b> bhejo. Tolerant: 100 theek. Strict: phir bhi 100 mana — total strict ke liye anjaana hai.",
          "nodes": {
            "pay": {
              "tone": "ok",
              "badge": "dono"
            },
            "strict": {
              "tone": "bad",
              "badge": "mana"
            },
            "tol": {
              "tone": "ok",
              "badge": "100 theek"
            }
          },
          "vars": {
            "ev": "orderId, amount, total",
            "strict": "100 mana",
            "tol": "100 theek"
          },
          "flows": [
            {
              "from": "pay",
              "to": "strict",
              "label": "v4",
              "tone": "bad"
            },
            {
              "from": "pay",
              "to": "tol",
              "label": "v4",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Contract",
          "clock": "baad mein",
          "say": "Jab saare consumers total padhne lagein, tab amount hatao. Pehle failao (<b>expand</b>), phir sametho (<b>contract</b>). Sahi kram mein strict consumers ko v4 se pehle hi dono field ke layak banao (lab mein v4 par strict anjaana total ki wajah se toota), ya tolerant banao.",
          "nodes": {
            "pay": {
              "tone": "ok",
              "badge": "sirf total"
            },
            "strict": {
              "tone": "ok",
              "badge": "badla gaya"
            },
            "tol": {
              "tone": "ok",
              "badge": "total padhta"
            }
          },
          "vars": {
            "ev": "orderId, total",
            "strict": "(update ke baad) theek",
            "tol": "(update ke baad) theek"
          }
        }
      ],
      "lesson": "Naya field jodna tolerant readers ke liye safe hai; strict reader har naye field par toot-ta hai. Jis field par readers nirbhar hain, us field ka naam badalna un sab readers ko todta hai — pehle strict readers ko dono field ke layak banao, phir dono field bhejo (expand), consumers naye par aayein, phir purana hatao (contract)."
    },
    {
      "type": "cards",
      "title": "➕ \"Bas ek aur field\" — teen raaste",
      "goal": "Naya loyalty service har ₹100 par 1 point deta hai. Loyalty ko PaymentCaptured par customerId chahiye — par customerId sirf OrderPlaced mein hai.",
      "lesson": "Har event mein field jodna aur metadata mein daalna, dono mein producer teams badalti hain. Consumer ka apna read model producers ko nahi chhoota, par kram ka kaam consumer par aata hai.",
      "steps": [
        {
          "title": "1. Teen raaste ka hisaab",
          "say": "Lab: 10,000 orders, 40,000 events. <b>Har event mein customerId</b> (video ka bura example): 3 schemas, 2 teams, +617 KB — jabki shipping events loyalty padhta bhi nahi. <b>Sirf PaymentCaptured mein:</b> 1 schema, payment team, +206 KB. <b>PaymentCaptured ke metadata mein:</b> payload saaf, par payment team phir bhi badli, +206 KB. <b>Loyalty ka apna read model</b> (OrderPlaced se order → customer): 0 schemas, 0 teams, +0 KB.",
          "ask": {
            "q": "Team kehti hai: \"customerId metadata mein daal do, payload saaf rahega, kisi ko badalna nahi padega.\" Sahi hai?",
            "choices": [
              "Nahi — payment team ko phir bhi har PaymentCaptured par customerId bharna padega",
              "Haan — metadata sirf ek broker ki setting hai, producer ka code nahi badalta hai",
              "Haan — metadata mein data jodne se event ka size bilkul nahi badhta, bas jagah badalti"
            ],
            "answer": 0,
            "hint": "Metadata mein customerId kaun bharega?",
            "explain": "Metadata payload ko saaf rakhta hai, coupling ko nahi hataata: payment service ko har event par customer ka pata rakhna padta hai. Lab: metadata mein bhi payment team badli aur +206 KB — sirf PaymentCaptured mein field jodne jitna. CloudEvents mein aisi jaankari ke liye extension attributes hain — jagah standard hai, kharcha wahi.",
            "choiceExplanations": [
              "Metadata payload ko saaf rakhta hai, coupling ko nahi hataata: payment service ko har event par customer ka pata rakhna padta hai. Lab: metadata mein bhi payment team badli aur +206 KB — sirf PaymentCaptured mein field jodne jitna. CloudEvents mein aisi jaankari ke liye extension attributes hain — jagah standard hai, kharcha wahi.",
              "Metadata event ke envelope ka hissa hai; producer hi likhta hai. Broker customerId nahi jaanta.",
              "Lab: PaymentCaptured mein field ya metadata, dono +206 KB. Bytes wahi; bas field ki jagah alag."
            ]
          }
        },
        {
          "title": "2. Read model ka kaam",
          "say": "Loyalty ke apne read model mein ek dikkat: OrderPlaced aur PaymentCaptured alag topics se aate hain. Lab mein 10,000 mein se 369 payments apne OrderPlaced se pehle pahunche.",
          "ask": {
            "q": "Loyalty ko order service par turant call ki nirbharta nahi chahiye. PaymentCaptured aa gaya, par apni copy mein order ka customer nahi mila. Saare points bachaane ke liye kya kare?",
            "choices": [
              "Payment ko rok ke rakho (park); OrderPlaced aate hi points jodo",
              "Payment chhod do — customer na mila toh points dena zaroori nahi",
              "Har aise payment par order service ko call karke customer poochho"
            ],
            "answer": 0,
            "hint": "Chhodne se kya khota hai, aur har baar call karne se kya judta hai?",
            "explain": "Payment ko park karo aur OrderPlaced aate hi points jodo. Lab: bina parking 369 payments ke points gaye; parking ke saath saare 2,55,519 points sahi. Har baar order service ko call karna clickbait event wali dikkat wapas laata hai.",
            "choiceExplanations": [
              "Payment ko park karo aur OrderPlaced aate hi points jodo. Lab: bina parking 369 payments ke points gaye; parking ke saath saare 2,55,519 points sahi. Har baar order service ko call karna clickbait event wali dikkat wapas laata hai.",
              "Lab: chhodne par 369 payments ke points hamesha ke liye gaye.",
              "Order service ko call karke customer mil sakta hai, par call ki nirbharta is sawaal ki shart todti hai — aur har call order service par bojh bhi hai."
            ]
          }
        },
        {
          "title": "3. Clickbait ka hisaab",
          "say": "Patli khabar (\"order 42 badla\") par har consumer owner ko call karta hai. EDA topic 2 ke lab 47 mein: 4 events × 3 consumers = 12 owner reads. Video is badhne ko \"exponential\" kehta hai — asal mein calls ka badhna seedha guna hai: events double toh calls double."
        },
        {
          "title": "4. Naam",
          "say": "Sirf jo chahiye wahi padhne wala consumer: <b>tolerant reader</b>. Pehle dono field, phir purana hatao: <b>expand / contract</b>. Business data ke bahar ki jaankari (id, source, time, trace id): <b>metadata</b> — CloudEvents mein context attributes. Har consumer ki zaroorat ke liye apni copy: <b>read model</b>."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Ek aur field, aur schema badalna — asli processes",
      "project": "51-event-modeling",
      "exercise": "ex4-evolve",
      "goal": "Pehle 10,000 orders par loyalty ke teen raaste. Phir do consumer processes par PaymentCaptured ke chaar roop.",
      "why": "Node 22+ chahiye. ex3 ek process, seeded kram; ex4 do consumer processes asli HTTP par. Teeno runs byte-identical rahe.",
      "steps": [
        {
          "text": "Lab folder se: loyalty ko customerId.",
          "cmd": "cd docker-labs/51-event-modeling && npm start -- ex3-bloat",
          "expect": "baseline     10,000 orders, 40,000 events, 6.18 MB · loyalty ke sahi points 2,55,519\naddfield-sab payload-schemas-badle=3 producer-teams-badli=2 bytes=+617 KB points-sahi=haan\naddfield     payload-schemas-badle=1 producer-teams-badli=1 bytes=+206 KB points-sahi=haan\nmetadata     payload-schemas-badle=0 producer-teams-badli=1 bytes=+206 KB points-sahi=haan\nreadmodel    payload-schemas-badle=0 producer-teams-badli=0 bytes=+0 KB · OrderPlaced se pehle aaye payments=369 · bina parking: 369 payments ke points gaye · parking ke saath: points-sahi=haan"
        },
        {
          "text": "Strict aur tolerant consumer, schema ke chaar roop.",
          "cmd": "npm start -- ex4-evolve",
          "expect": "v1-purana      strict: theek 100/100 · tolerant: theek 100/100\nv2-naya-field  strict: mana 100/100 (anjaana field method) · tolerant: theek 100/100\nv3-naam-badla  strict: mana 100/100 (anjaana field total) · tolerant: mana 100/100 (amount nahi)\nv4-dono-field  strict: mana 100/100 (anjaana field total) · tolerant: theek 100/100\nkul            strict theek=100 mana=300 · tolerant theek=300 mana=100 · tolerant ka jod ₹45,150"
        }
      ],
      "observe": {
        "q": "v4 mein amount aur total dono the, phir bhi strict ne 100 / 100 mana kiye. Kyun?",
        "choices": [
          "Strict har anjaana field par mana karta hai, aur total anjaana tha",
          "v4 mein amount ki value galat thi, isliye strict ne sab mana kiye",
          "Strict ek hi roop padh sakta hai — v1 ke baad har naya roop mana"
        ],
        "answer": 0,
        "hint": "Strict consumer ki shart kya hai?",
        "explain": "Strict consumer data ka har key pehchaanta hai; lab ka strict reader total nahi pehchaanta, toh v4 bhi mana. Purana field saath rehne se purane readers chal sakte hain, bas naya field accept ya ignore kar sakein. Pehle strict reader ko dono field accept karna sikhao, phir amount aur total saath bhejo.",
        "choiceExplanations": [
          "Strict consumer data ka har key pehchaanta hai; lab ka strict reader total nahi pehchaanta, toh v4 bhi mana. Purana field saath rehne se purane readers chal sakte hain, bas naya field accept ya ignore kar sakein. Pehle strict reader ko dono field accept karna sikhao, phir amount aur total saath bhejo.",
          "v4 mein amount wahi tha jo v1 mein; tolerant ne 100 theek padhe.",
          "Strict ki shart roop ka number nahi, anjaana field hai — v1 jaisa data hota toh theek padhta."
        ]
      },
      "lesson": "Ek aur field ke teen raaste, teeno ka kharcha alag: schemas, teams, bytes ya kram. Naam badalne se pehle readers dono field ke layak hon. Producer kuch waqt dono field bheje; readers total par aa jaayein, tab amount hatao. Purane events dobara padhne hain toh total na milne par amount padhne ka fallback rakho."
    }
  ],
  "interview": {
    "title": "Interview Round — event ka contract",
    "instructions": "Pehle socho: naya field kis kaam ka fact hai, aur kaun-kaun is event ko padhta hai? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Notification team ko OrderShipped par customer ko SMS bhejna hai. OrderShipped mein orderId hai; OrderPlaced mein orderId aur customerId; customer events mein customerId aur phone. Shipping team kehti hai \"bas phone ka field jod dete hain\". Aapki salaah?",
        "choices": [
          "Notification order aur customer events se copies rakhe; orderId → customerId → phone nikale",
          "Jod do — optional field hai, tolerant readers chhod denge, kisi ka kuch nahi bigdega",
          "Phone envelope ke metadata mein daal do — payload saaf rahega aur shipping team nahi badlegi",
          "Notification har OrderShipped par customer service ko call kare — phone hamesha taaza milega"
        ],
        "answer": 0,
        "explain": "Notification OrderPlaced se orderId → customerId aur customer events se customerId → phone ki copies rakhe. OrderShipped par dono entries se phone nikale. Koi zaroori entry abhi nahi mili toh notification park kare; entries milne par SMS bheje. Har shipment mein phone jodne se shipping producer badalta hai, aur phone sab shipment consumers tak pahunchta hai.",
        "choiceExplanations": [
          "Notification OrderPlaced se orderId → customerId aur customer events se customerId → phone ki copies rakhe. OrderShipped par dono entries se phone nikale. Koi zaroori entry abhi nahi mili toh notification park kare; entries milne par SMS bheje. Har shipment mein phone jodne se shipping producer badalta hai, aur phone sab shipment consumers tak pahunchta hai.",
          "Tolerant readers todenge nahi, par phone har consumer tak jaayega aur shipping team ko customer data rakhna padega.",
          "Metadata mein bhi shipping service ko phone bharna padega — coupling wahi, aur phone phir bhi har consumer tak.",
          "Har event par call = clickbait wali dikkat: customer service down toh SMS atke, aur calls events × consumers badhein."
        ]
      },
      {
        "q": "Payment event mein amount ka naam total karna hai. 6 consumers hain; do strict hain (anjaana field par mana). Rollout plan?",
        "choices": [
          "Pehle strict consumers badlo; phir dono field bhejo; sab total par aayein, tab amount hatao",
          "Ek hi release mein naam badal do — consumers error dekhenge aur apna code jaldi theek kar lenge",
          "Naya event type PaymentCapturedV2 bana do aur usi release mein purana event bhejna band kar do",
          "Schema registry laga do — registry naam badalne ko apne aap compatible banake chala deti hai"
        ],
        "answer": 0,
        "explain": "amount par nirbhar har reader naam badalne se toot-ta hai. Strict consumers naya field (total) dekhte hi mana karenge, toh strict consumers ko pehle badlo. Phir expand: dono field; sab consumers total par aayein; phir contract: amount hatao. Lab: v3 (sirf total) par dono consumers 100 mana; v4 (dono) par tolerant theek, strict mana.",
        "choiceExplanations": [
          "amount par nirbhar har reader naam badalne se toot-ta hai. Strict consumers naya field (total) dekhte hi mana karenge, toh strict consumers ko pehle badlo. Phir expand: dono field; sab consumers total par aayein; phir contract: amount hatao. Lab: v3 (sirf total) par dono consumers 100 mana; v4 (dono) par tolerant theek, strict mana.",
          "Ek release mein badalna = lab ka v3: har consumer ke 100 / 100 events mana, jab tak sab theek na hon.",
          "Naya type theek raasta ho sakta hai, par purana turant band karne se purane consumers bhookhe rehte hain.",
          "Registry badlaav ko jaanch ke rok sakti hai; naam badalne ko compatible nahi bana sakti."
        ]
      }
    ]
  },
  "success": [
    "Business ke kaam ke hisaab se events kaat sakte ho",
    "Ek aur field ke teen raaston ka kharcha bata sakte ho",
    "Expand / contract se schema badal sakte ho"
  ],
  "cards": [
    {
      "front": "Event kahan kaatein?",
      "back": "Business ke kaam par: ek kaam ke saare field ek event mein; apne workflow wale kaam (email verification) ka alag event."
    },
    {
      "front": "Metadata mein field daalne se coupling gayi?",
      "back": "Nahi. Producer ko phir bhi field bharna padta hai. Lab: metadata mein bhi payment team badli, +206 KB — field jodne jitna."
    },
    {
      "front": "Tolerant reader kya bachata hai?",
      "back": "Anjaana field jodne par reader chalta rehta hai. Reader ka zaroori field hatane ya naam badalne se dikkat hoti hai — pehle reader taiyaar karo, zaroorat ho toh expand / contract. Jo field reader padhta hi nahi, us badlaav se reader nahi tootta."
    },
    {
      "front": "Read model se field lo — kya dhyaan?",
      "back": "Kram. Lab: 369 payments apne OrderPlaced se pehle aaye; park karo, chhodo mat."
    }
  ]
}
]);
})();
