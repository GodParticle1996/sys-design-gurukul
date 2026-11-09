/* First Principles — FAANG Senior Engineer.
   Source credit: The Cost of Communication (YOR9hAFoe2o), numbered video 3/15.
   Evidence: docker-labs/53-communication-tax/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "enc", "icon": "🔢", "label": "writeVarint()", "x": 140, "y": 105}, {"id": "dec", "icon": "📖", "label": "readVarint()", "x": 445, "y": 105}, {"id": "guard", "icon": "🛡️", "label": "seema jaanch", "x": 750, "y": 105}];
const EDGES = [{"from": "enc", "to": "dec"}, {"from": "dec", "to": "guard"}];
VISUALS["fp-comm-code"] = { t: "150 = 96 01. Likhna 7-7 bits mein, padhna byte-byte — aur kharab bytes par seema ki jaanch.", html: SD.viz.svg(HERO, EDGES, { nodes: { enc: {tone:'acc',badge:'08 96 01'}, dec: {tone:'acc',badge:'byte-byte'}, guard: {tone:'ok',badge:'seema ✓'} } }, {w:890,h:215}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-comm-code",
  "icon": "📡",
  "group": "📡 Cost of Communication",
  "title": "Communication 3 · Code — varint, seema aur keep-alive",
  "badge": "Bytes Kaarigar",
  "objectives": [
    "Varint 150 ko 96 01 kaise banata hai?",
    "Protobuf integer padhna \"seedha copy\" kyun nahi?",
    "Decoder ko kaun si seemaayein jaanchni chahiye, aur keep-alive code mein kahan hai?"
  ],
  "lesson": [
    "<h3>💻 Bytes ka hisaab</h3><p>Objects ko bhejne layak bytes banana: <b>serialization</b>. <b>Protocol Buffers (Protobuf)</b> mein dono taraf ek <b>schema</b> hota hai — har field ka number aur type pehle se tay. Lab ke Order mein id = field 1, userId = 2, amountPaise = 3. Har field se pehle ek <b>key</b> jaata hai jo field number aur <b>wire type</b> jodta hai; wire type 0 ka matlab number <b>varint</b> mein, 7-7 bits. Lab ka pehla order JSON mein 147 bytes, Protobuf mein 77.</p><p>Lab 53 ka <b>lib/proto.js</b> haath ka likha hai — library nahi — toh har line dikhti hai.</p><p>Saath mein Codex ke pakde hue bugs bhi: kharab bytes par decoder chup-chaap galat jawab deta tha.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🔢 writeVarint(150): 7-7 bits ka khel",
      "goal": "lib/proto.js. Number ko text ki jagah binary mein likhna: har byte mein 7 bits number ke, aur upar wala 1 bit batata hai \"aur byte aayega\". Number 150 likho.",
      "code": {
        "title": "lib/proto.js",
        "file": "docker-labs/53-communication-tax/lib/proto.js",
        "from": 23,
        "text": "function writeVarint(buf, pos, n) {\n  checkNumber(n);\n  while (n >= 128) {\n    buf[pos++] = (n % 128) | 128;              // low 7 bits, top bit 1 = \"aur byte aayega\"\n    n = Math.floor(n / 128);\n  }\n  buf[pos++] = n;                              // last byte, top bit 0\n  return pos;\n}"
      },
      "vars": [
        {
          "id": "n",
          "label": "n"
        },
        {
          "id": "bytes",
          "label": "Likhe bytes (hex)"
        },
        {
          "id": "note",
          "label": "Kyun"
        }
      ],
      "steps": [
        {
          "title": "1. Pehle jaanch",
          "say": "Line 24: n ek non-negative safe integer hai? 150 theek. (Infinity, −1 ya 1.5 jaise number yahin ruk jaate hain.)",
          "line": "24",
          "vars": {
            "n": "150",
            "bytes": "—",
            "note": "safe integer ✓"
          }
        },
        {
          "title": "2. Pehla byte",
          "say": "Line 25: 150 ≥ 128, toh ek byte kaafi nahi. Line 26: neeche ke 7 bits = 150 % 128 = 22, aur upar ka bit 1 (| 128).",
          "line": "25-26",
          "vars": {
            "n": "150",
            "bytes": "?",
            "note": "22 + 128"
          },
          "ask": {
            "q": "Line 26 kaunsa byte likhegi?",
            "choices": [
              "0x96 (150) — 22 aur upar ka \"aur byte aayega\" bit 128, dono jode",
              "0x16 (22) — sirf neeche ke 7 bits; upar ka bit kabhi nahi lagta",
              "0x01 (1) — pehle bada hissa likha jaata hai, chhota baad mein"
            ],
            "answer": 0,
            "hint": "22 | 128 kitna hota hai?",
            "explain": "22 | 128 = 150 = 0x96. Upar ka bit 1 kehta hai: \"aakhri byte nahi\". Varint chhota hissa pehle likhta hai.",
            "choiceExplanations": [
              "22 | 128 = 150 = 0x96. Upar ka bit 1 kehta hai: \"aakhri byte nahi\". Varint chhota hissa pehle likhta hai.",
              "Upar ka bit hi padhne wale ko batata hai ki aur byte aayega. Line 26 ka | 128 yahi lagata hai.",
              "Varint neeche ke 7 bits pehle likhta hai; bada hissa (1) agle byte mein."
            ]
          }
        },
        {
          "title": "3. Aakhri byte",
          "say": "Line 27: n = floor(150 ÷ 128) = 1. Ab 1 < 128, loop band. Line 29: aakhri byte 01, upar ka bit 0.",
          "line": "27-29",
          "vars": {
            "n": "1",
            "bytes": "96 01",
            "note": "top bit 0 = khatam"
          }
        },
        {
          "title": "4. Spec se milao",
          "say": "Field 1, wire type 0 ka key byte: (1 << 3) | 0 = 08. Poora: <b>08 96 01</b> — Protobuf ki official encoding guide ka udaharan. Lab ka pehla test yahi jaanchta hai.",
          "line": "29-30",
          "vars": {
            "n": "—",
            "bytes": "08 96 01",
            "note": "spec jaisa ✓"
          },
          "ask": {
            "q": "Order ka amountPaise = 124034. JSON mein \"124034\" 6 characters hai. Varint mein kitne bytes?",
            "choices": [
              "3 bytes — 124034 128² (16,384) se bada, 128³ (20,97,152) se chhota",
              "6 bytes — har digit ka ek byte, bilkul jaise JSON mein hota hai",
              "4 bytes — har number hamesha 4 bytes ka int32 hi banta hai"
            ],
            "answer": 0,
            "hint": "Har byte 7 bits deta hai: 1 byte < 128, 2 bytes < 16,384, 3 bytes < 20,97,152.",
            "explain": "124034 ≥ 16,384 aur < 20,97,152, toh 3 bytes: 82 C9 07. JSON ke 6 characters ki jagah 3 bytes — Protobuf ke chhote hone ki ek wajah yahi hai.",
            "choiceExplanations": [
              "124034 ≥ 16,384 aur < 20,97,152, toh 3 bytes: 82 C9 07. JSON ke 6 characters ki jagah 3 bytes — Protobuf ke chhote hone ki ek wajah yahi hai.",
              "Varint digits nahi likhta; binary mein 7-7 bits likhta hai.",
              "Varint ka size number par tika hai: 1 se 8 bytes (is lab mein). 4-byte fixed payload fixed32, sfixed32 aur float jaise types mein hota hai."
            ]
          }
        }
      ],
      "lesson": "Varint: har byte mein 7 bits number ke, upar ka bit \"aur aayega\". Chhote number chhote bytes: 150 = 96 01, 124034 = 3 bytes."
    },
    {
      "type": "dryrun",
      "title": "📖 readVarint(): byte-byte jodna",
      "goal": "lib/proto.js. Bytes 96 01 padh ke 150 wapas banao. Video kehta hai Protobuf ke integers \"4 bytes seedhe register mein\" jaate hain — code dekho.",
      "code": {
        "title": "lib/proto.js",
        "file": "docker-labs/53-communication-tax/lib/proto.js",
        "from": 33,
        "text": "function readVarint(buf, pos, end = buf.length) {\n  let n = 0, mul = 1, b, count = 0;\n  do {\n    if (pos >= end) throw new Error('varint: ran past the end of its message');\n    if (++count > MAX_VARINT_BYTES) throw new Error('varint: too long for this lab');\n    b = buf[pos++];\n    n += (b & 127) * mul;                      // 7 bits at a time, lowest first\n    mul *= 128;\n  } while (b & 128);\n  if (n > Number.MAX_SAFE_INTEGER) throw new Error('varint: value above 2^53 − 1 is not supported');\n  return [n, pos];\n}"
      },
      "vars": [
        {
          "id": "b",
          "label": "b (byte)"
        },
        {
          "id": "n",
          "label": "n"
        },
        {
          "id": "mul",
          "label": "mul"
        }
      ],
      "steps": [
        {
          "title": "1. Pehla byte",
          "say": "Line 38: b = 0x96. Line 39: neeche ke 7 bits (0x96 & 127 = 22) × mul 1 = 22. Line 40: mul = 128. Line 41: upar ka bit 1, toh loop chalu.",
          "line": "38-41",
          "vars": {
            "b": "0x96",
            "n": "22",
            "mul": "128"
          }
        },
        {
          "title": "2. Doosra byte",
          "say": "Line 38: b = 0x01. Line 39: 1 × 128 = 128 jodo.",
          "line": "38-41",
          "vars": {
            "b": "0x01",
            "n": "?",
            "mul": "16384"
          },
          "ask": {
            "q": "n kitna hua, aur loop chalega?",
            "choices": [
              "150, aur loop band — 0x01 ka upar ka bit 0 hai",
              "128, aur loop chalega — har varint mein kam se kam teen bytes hote hain",
              "23, aur loop band — doosra byte bas 1 jodta hai"
            ],
            "answer": 0,
            "hint": "22 + 1 × 128?",
            "explain": "22 + 128 = 150. 0x01 ka upar ka bit 0, toh line 41 loop rokti hai. Har byte ek alag kadam: padho, 7 bits nikaalo, sahi jagah jodo, upar ka bit dekho.",
            "choiceExplanations": [
              "22 + 128 = 150. 0x01 ka upar ka bit 0, toh line 41 loop rokti hai. Har byte ek alag kadam: padho, 7 bits nikaalo, sahi jagah jodo, upar ka bit dekho.",
              "Varint ki lambai upar ke bit se tay hoti hai; 150 ke liye do bytes kaafi.",
              "Doosra byte 7 bits aage ka hissa hai, isliye mul 128 se guna."
            ]
          }
        },
        {
          "title": "3. Seema ki jaanch",
          "say": "Line 36: message ki seema (end) paar hui toh error. Line 37: 8 bytes se lamba varint mana. Line 42: 2^53 − 1 se bada number mana — JavaScript itna bada number theek se rakh nahi sakta.",
          "line": "36-42",
          "vars": {
            "b": "—",
            "n": "150",
            "mul": "—"
          },
          "ask": {
            "q": "Video: \"Protobuf integer 4 bytes seedhe register mein, parse nahi\". readVarint ke baad kya kahoge?",
            "choices": [
              "Galat — varint ko har byte padh ke jodna padta hai; har number 4 bytes ka nahi hota",
              "Sahi — readVarint bas ek copy hai, loop kabhi bhi ek baar se zyada nahi chalta",
              "Sahi — Protobuf har number ke liye theek 4 bytes rakhta hai, isliye parse nahi"
            ],
            "answer": 0,
            "hint": "Line 35–41 ka loop kitni baar chala?",
            "explain": "150 ke liye loop do baar chala: byte padho, 7 bits nikaalo, jodo. Varint ko decode karna padta hai. JSON se CPU ya samay kam lagega ya zyada, implementation aur data par naapo. Fixed-width types (fixed32, fixed64, float, double) ka payload 4 ya 8 little-endian bytes hota hai — varint wala loop nahi, par field aur message ki jaanch phir bhi hoti hai.",
            "choiceExplanations": [
              "150 ke liye loop do baar chala: byte padho, 7 bits nikaalo, jodo. Varint ko decode karna padta hai. JSON se CPU ya samay kam lagega ya zyada, implementation aur data par naapo. Fixed-width types (fixed32, fixed64, float, double) ka payload 4 ya 8 little-endian bytes hota hai — varint wala loop nahi, par field aur message ki jaanch phir bhi hoti hai.",
              "150 par hi loop do baar chala. Bade numbers par 3–8 baar.",
              "Varint ka size number par tika hai: 150 = 2 bytes, 124034 = 3 bytes."
            ]
          }
        }
      ],
      "lesson": "Varint padhna bhi kaam hai: har byte ka loop. Aur decoder ko seema jaanchni padti hai — message ka end, varint ki lambai, number ki hadd."
    },
    {
      "type": "cards",
      "title": "🛡️ Codex ne pakda: decoder ko seema chahiye",
      "goal": "Pehle lab ka decoder sahi data par chalta tha, par kharab bytes par chup-chaap galat jawab deta tha. Codex ki review se chaar ilaaj.",
      "lesson": "Network se aane wale bytes par bharosa mat karo. Har read apne message ki seema ke andar, har number ki hadd, har string ka UTF-8. Asli kaam mein official library lo.",
      "steps": [
        {
          "title": "1. Aadha Order, poora maana",
          "say": "Bytes <code>0a 04 22 02 61</code>: list kehti hai \"Order 4 bytes ka\", par buffer mein sirf 3 bache. Order ke andar city 2 bytes ki, mila sirf 1 (\"a\").",
          "ask": {
            "q": "Purana decoder (bina seema jaanch) kya karta tha?",
            "choices": [
              "city: \"a\" lauta deta — adhoore Order ko poora maan leta, koi error nahi",
              "Error deta — JavaScript ka Buffer khatam hote hi apne aap error phenkta hai",
              "Khaali Order lautata — adhoora data dekhte hi saare fields 0 kar deta"
            ],
            "answer": 0,
            "hint": "Buffer ke bahar padhne par toString kya karta hai?",
            "explain": "toString buffer ke bahar ke bytes chup-chaap chhod deta hai: \"a\" mila, koi error nahi. Ab line 132 jaanchti hai ki Order baaki buffer mein samata hai, aur line 99 har field ko Order ki seema mein rakhti hai.",
            "choiceExplanations": [
              "toString buffer ke bahar ke bytes chup-chaap chhod deta hai: \"a\" mila, koi error nahi. Ab line 132 jaanchti hai ki Order baaki buffer mein samata hai, aur line 99 har field ko Order ki seema mein rakhti hai.",
              "Buffer ke bahar padhne par Node error nahi deta; jitna hai utna deta hai. Isliye jaanch code mein chahiye.",
              "Purana decoder fields bhar raha tha; city \"a\" ban gayi."
            ]
          }
        },
        {
          "title": "2. Infinity par atka encoder",
          "say": "Purana <code>varintSize(Infinity)</code>: Infinity ÷ 128 = Infinity, loop kabhi khatam nahi. Jaanch sirf likhte waqt thi — size ginne ke baad. Ab line 17 size ginne se pehle jaanchti hai. Test is case ko time limit ke saath chalata hai, taaki bug laut aaye toh test fail ho, atke nahi."
        },
        {
          "title": "3. Kharab UTF-8 chup-chaap badla",
          "say": "Bytes <code>22 01 ff</code>: city ka ek byte 0xff — UTF-8 mein 0xff kabhi nahi aata. Purana decoder 0xff ko chup-chaap � (U+FFFD) bana deta tha. Ab line 56 <code>isUtf8</code> se mana karti hai: proto3 strings valid UTF-8 honi chahiye."
        },
        {
          "title": "4. Keep-alive code mein ek line",
          "say": "<code>tools/reuse.js</code> line 64: <code>new http.Agent({ keepAlive: true, maxSockets: 1 })</code> — ek socket khula rakho aur dobara use karo. Line 15: <code>agent: false</code> + <code>connection: close</code> — har maang naya connection.",
          "ask": {
            "q": "Line 116 wahi agent (keepAlive, maxSockets: 1) 50 maangon ke liye ek saath use karti hai, RTT 20 ms. Kya hoga?",
            "choices": [
              "Line lagegi — ek socket, ek waqt ek maang (lab ka client pipelining nahi karta): ~1,050 ms",
              "Agent 50 sockets khol dega — keepAlive ka matlab hai jitne chahiye utne khule sockets",
              "~23 ms — keepAlive socket par saari maangein ek saath chali jaati hain"
            ],
            "answer": 0,
            "hint": "maxSockets: 1 ka matlab?",
            "explain": "maxSockets: 1 = zyada se zyada ek socket. Baaki 49 maangein agent ki line mein rukti hain. Lab ex1 B: 1,052–1,055 ms. Garam socket handshake bachata hai, line nahi todta.",
            "choiceExplanations": [
              "maxSockets: 1 = zyada se zyada ek socket. Baaki 49 maangein agent ki line mein rukti hain. Lab ex1 B: 1,052–1,055 ms. Garam socket handshake bachata hai, line nahi todta.",
              "keepAlive socket ko khula rakhta hai; ginti maxSockets tay karta hai — yahan 1.",
              "23 ms HTTP/2 ka tha: ek connection par 50 streams saath. HTTP/1.1 agent bina pipelining ke ek-ek bhejta hai."
            ]
          }
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Lab ke 11 tests",
      "project": "53-communication-tax",
      "exercise": "ex2-serialize",
      "goal": "Spec ka udaharan, kharab input ka mana hona, delay proxy ka kram, aur server ki connection ginti — sab tests ek saath. Phir wahi decoder asli data par.",
      "why": "Node 22+ chahiye. Kuch tests asli processes aur sockets chalate hain (ports 6391–6396); samay machine par badlega.",
      "steps": [
        {
          "text": "Lab folder se: saare tests.",
          "cmd": "cd docker-labs/53-communication-tax && npm test",
          "expect": "✔ varint matches the Protobuf spec example: field 1 = 150 → 08 96 01 (1.576986ms)\n✔ varint round trip at the edges; bad numbers refused (0.811534ms)\n✔ encoder refuses bad numbers before sizing (an Infinity id used to loop forever) (3.728705ms)\n✔ decoder refuses malformed input: nested lengths, long varints, bad keys, bad UTF-8 (0.469374ms)\n✔ order round trip, multi-byte text, false bool not written (0.295433ms)\n✔ decoder skips an unknown length-delimited field and refuses a truncated one (0.30943ms)\n✔ 1,000 orders: list round trip equals JSON, and protobuf is smaller (10.132554ms)\n✔ geo model: San Francisco → London ≈ 8,616 km, RTT = 2 × distance ÷ 200,000 km/s (0.253955ms)\n✔ delay proxy keeps distinct chunks in order and adds the modelled delays (175.285113ms)\n✔ delay proxy: a client that sends and closes at once still gets its whole reply (203.777625ms)\n✔ server counts connections: 3 requests without keep-alive = 3 new, with keep-alive = 0 new (48.913071ms)\nℹ tests 11\nℹ suites 0\nℹ pass 11\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 486.25673"
        },
        {
          "text": "Wahi encoder/decoder 1,00,000 orders par (UTF-8 jaanch samet).",
          "cmd": "npm start -- ex2-serialize",
          "expect": "REAL RUN: Node v24.18.0; 1,00,000 seeded orders; each time = median of 5; timings change run to run\nprotobuf = hand-written Protobuf wire format (varint + length-delimited) in plain JavaScript, no library\nround trip: decode(encode(orders)) equals the original for both formats\n\none order, JSON : {\"id\":1000000,\"userId\":32157,\"amountPaise\":124034,\"city\":\"Bengaluru\",\"items\":[\"masala dosa\",\"dal makhani\",\"masala dosa\",\"gulab jamun\"],\"paid\":true}\none order bytes: JSON 147, protobuf 77\n\ntimes = elapsed/CPU ms (CPU = user + system of the whole process); objects ↔ wire bytes for both formats\nformat     bytes      gzip bytes   encode     decode\nJSON        12.57 MB     1.57 MB   30/30 ms   39/59 ms\nprotobuf     5.77 MB     1.54 MB   37/46 ms  70/119 ms\n\nprotobuf ÷ JSON bytes: 46%; after gzip: 98%\ngzip of the JSON: 122/123 ms to compress, 13/13 ms to decompress (elapsed/CPU)\n\ngzip depends on how much goes in ONE compressed response (bytes, same seeded orders):\norders per response   JSON gzip   protobuf gzip   protobuf ÷ JSON\n                  1         138              86               62%\n                 10         379             351               93%\n                100       1,925           1,941              101%\n              1,000      16,270          15,992               98%\n           1,00,000   15,73,156       15,37,532               98%"
        }
      ],
      "observe": {
        "q": "Infinity wala test encoder ko ek VM mein 500 ms ki time limit ke saath chalata hai. Seedha encodeOrder() kyun nahi bulaata?",
        "choices": [
          "Bug lautne par encoder atakta — time limit test fail karti hai, suite atakta nahi",
          "VM mein encoder tez chalta hai, isliye test jaldi aur bina rukawat khatam hota hai",
          "Seedha bulaane par Infinity apne aap 0 ban jaata hai, isliye bug dikhta hi nahi"
        ],
        "answer": 0,
        "hint": "Purana encoder Infinity par kya karta tha?",
        "explain": "Purana varintSize Infinity par anant loop mein ghoomta tha. Seedha bulaao toh test kabhi khatam nahi hota — CI bas latka rehta. VM ki time limit loop ko 500 ms par tod deti hai aur test saaf fail hota hai.",
        "choiceExplanations": [
          "Purana varintSize Infinity par anant loop mein ghoomta tha. Seedha bulaao toh test kabhi khatam nahi hota — CI bas latka rehta. VM ki time limit loop ko 500 ms par tod deti hai aur test saaf fail hota hai.",
          "VM se raftaar nahi badhti. Time limit ka kaam hai atakne wale bug ko fail mein badalna.",
          "Infinity ÷ 128 = Infinity; 0 nahi banta. Isi wajah se loop khatam nahi hota tha."
        ]
      },
      "lesson": "Tests sirf sahi raasta nahi, kharab input bhi jaanchte hain. Atakne wale bug ke test ko time limit chahiye."
    }
  ],
  "interview": {
    "title": "Interview Round — wire format",
    "instructions": "Pehle socho: kitne bytes, kitne kadam, aur kharab input par kya hoga? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Protobuf schema banate waqt senior kehta hai: \"Sabse zyada bheje jaane wale fields ko numbers 1–15 do.\" Kyun?",
        "choices": [
          "Key bhi varint hai — (field << 3) | wire; 1–15 ka key ek byte, 16–2047 ka do, bade ka zyada",
          "1–15 wale fields pehle decode hote hain, isliye 1–15 ka parse sabse tez hota hai",
          "16 se upar ke field numbers proto3 mein allowed nahi hain, isliye 1–15 hi chuno",
          "1–15 wale fields gzip mein behtar sikudte hain, isliye network par chhote jaate hain"
        ],
        "answer": 0,
        "explain": "Key = (field_number << 3) | wire_type, ek varint. Field 15: 15 × 8 = 120 < 128 → ek byte. Field 16: 128 → do bytes (80 01); 2048 se teen. Har message mein har baar jaane wale field par 16–2047 ke muqable ek byte bachta hai, bade numbers ke muqable aur zyada.",
        "choiceExplanations": [
          "Key = (field_number << 3) | wire_type, ek varint. Field 15: 15 × 8 = 120 < 128 → ek byte. Field 16: 128 → do bytes (80 01); 2048 se teen. Har message mein har baar jaane wale field par 16–2047 ke muqable ek byte bachta hai, bade numbers ke muqable aur zyada.",
          "Decode ka kram bytes ke kram se chalta hai, field number se nahi.",
          "Field numbers 2^29 − 1 tak ho sakte hain (kuch ranges reserved). 16 bilkul theek hai, bas key do bytes ka (2048 se teen).",
          "Bachat key ke size ki hai, compression ki nahi."
        ]
      },
      {
        "q": "Team internet se aane wale bytes ke liye apna Protobuf parser likh rahi hai. Review mein sabse pehle kya maangoge?",
        "choices": [
          "Har read message ki seema mein, varint ki lambai aur hadd, valid keys, UTF-8 — ya official library",
          "Poore buffer ka end jaancho — har nested Order ko apni alag seema dena zaroori nahi",
          "Varint ko 10 bytes tak padh lo — JavaScript Number har uint64 value theek rakh lega",
          "UTF-8 decode se string ban jaaye toh input sahi maano, chahe replacement character aa jaaye"
        ],
        "answer": 0,
        "explain": "Lab 53 ka parser sahi data par round-trip test pass karta tha, phir bhi kharab bytes par adhoora Order (city \"a\"), wrap hua key (field 1) aur badla hua UTF-8 chup-chaap lautata tha, aur Infinity par encoder atak jaata tha. Seema ki har jaanch chahiye — ya official library.",
        "choiceExplanations": [
          "Lab 53 ka parser sahi data par round-trip test pass karta tha, phir bhi kharab bytes par adhoora Order (city \"a\"), wrap hua key (field 1) aur badla hua UTF-8 chup-chaap lautata tha, aur Infinity par encoder atak jaata tha. Seema ki har jaanch chahiye — ya official library.",
          "Har nested Order ki apni seema chahiye; warna pehla Order agle Order ke bytes padh sakta hai (lab: 0a 01 08 0a 00).",
          "JavaScript Number sirf 2^53 − 1 tak har integer theek rakhta hai. Lab ki safe-integer hadd alag se jaanchni padti hai.",
          "Replacement character kharab UTF-8 ko chhupa deta hai. String fields ke bytes ko badalne se pehle jaancho (lab: isUtf8)."
        ]
      }
    ]
  },
  "success": [
    "Varint haath se bana aur padh sakte ho",
    "Bata sakte ho ki Protobuf integer padhna bhi parse hai",
    "Decoder ki seema jaanch aur keep-alive ki code line pehchaan sakte ho"
  ],
  "cards": [
    {
      "front": "150 ka varint?",
      "back": "96 01: pehla byte 22 + 128 (aur aayega), doosra 1. Field 1 ke saath: 08 96 01 (Protobuf spec ka udaharan)."
    },
    {
      "front": "Protobuf field key?",
      "back": "(field_number << 3) | wire_type, ek varint. Fields 1–15: key ek byte. 16 aur upar: do ya zyada bytes."
    },
    {
      "front": "Haath ke decoder ki zaroori jaanch?",
      "back": "Har read message ki seema mein, varint ki lambai aur hadd, field number 0 nahi, key 32 bits mein, strings valid UTF-8."
    }
  ]
}
]);
})();
