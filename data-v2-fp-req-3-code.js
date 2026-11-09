/* First Principles — FAANG Senior Engineer.
   Source credit: The Anatomy of a Request (kt1tW0El6Gg), numbered video 4/15.
   Evidence: docker-labs/54-request-anatomy/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "name", "icon": "🔤", "label": "nameBytes()", "x": 140, "y": 105}, {"id": "loop", "icon": "🔁", "label": "resolve()", "x": 445, "y": 105}, {"id": "lb", "icon": "🧩", "label": "L4 · L7", "x": 750, "y": 105}];
const EDGES = [{"from": "name", "to": "loop"}, {"from": "loop", "to": "lb"}];
VISUALS["fp-req-code"] = { t: "19 bytes ka naam, har jawab ki jaanch karta resolver, aur proxy ki do lines jo L4 ko L7 se alag karti hain.", html: SD.viz.svg(HERO, EDGES, { nodes: { name: {tone:'acc',badge:'03 api 09 … 00'}, loop: {tone:'acc',badge:'referral → glue'}, lb: {tone:'ok',badge:'connection vs request'} } }, {w:890,h:215}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-req-code",
  "icon": "🛣️",
  "group": "🛣️ Anatomy of a Request",
  "title": "Request 3 · Code — DNS ke bytes, resolver ka loop, proxy ki do lines",
  "badge": "Resolver Kaarigar",
  "objectives": [
    "DNS naam wire par kaise likha jaata hai, aur 63/255 ki hadd kyun?",
    "Resolver referral ko kaise jaanch ke follow karta hai?",
    "L4 aur L7 ka farq code ki kaunsi line mein hai?"
  ],
  "lesson": [
    "<h3>💻 Chhote code mein bade faisle</h3><p>Lab 54 ka DNS haath ka likha hai — library nahi — toh har line dikhti hai: naam bytes mein kaise jaata hai, resolver kis jawab par bharosa kare, server kab jawab de aur kab aage bheje.</p><p>Codex ki review ne is code mein kai asli bugs pakde, jaise ek jawab ke saath aaya anjaana record copy mein chala jaana (cache poisoning). Pehle code, phir bugs.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🔤 nameBytes(): naam ko wire ke bytes mein",
      "goal": "lib/dnswire.js. DNS packet mein naam text nahi jaata: har label ke aage label ki lambai ka ek byte, aur aakhir mein 0. api.khanakart.com likho.",
      "code": {
        "title": "lib/dnswire.js",
        "file": "docker-labs/54-request-anatomy/lib/dnswire.js",
        "from": 20,
        "text": "function labelsOf(name) {\n  const c = canon(name);\n  if (c === '.') return [];\n  const labels = c.slice(0, -1).split('.');\n  for (const l of labels) if (!LABEL.test(l)) throw new Error('bad label: \"' + l + '\" (letters, digits, - or _, 1–63 bytes)');\n  return labels;\n}\n\nfunction nameBytes(name) {\n  const out = [];\n  for (const l of labelsOf(name)) out.push(Buffer.from([l.length]), Buffer.from(l, 'ascii'));\n  out.push(Buffer.from([0]));                  // root label ends the name\n  const buf = Buffer.concat(out);\n  if (buf.length > 255) throw new Error('name longer than 255 bytes');\n  return buf;\n}"
      },
      "vars": [
        {
          "id": "labels",
          "label": "Labels"
        },
        {
          "id": "bytes",
          "label": "Bytes (hex / text)"
        },
        {
          "id": "len",
          "label": "Kul bytes"
        }
      ],
      "steps": [
        {
          "title": "1. Labels mein todo",
          "say": "Line 21: naam ko chhote akshar aur aakhri dot wala roop (api.khanakart.com.). Line 23: dots par todo. Line 24: har label sirf letters, digits, - ya _, 1–63 bytes — warna error.",
          "line": "21-25",
          "vars": {
            "labels": "api · khanakart · com",
            "bytes": "—",
            "len": "—"
          }
        },
        {
          "title": "2. Har label: lambai + akshar",
          "say": "Line 30: har label se pehle label ki lambai ka ek byte, phir akshar.",
          "line": "30",
          "vars": {
            "labels": "api · khanakart · com",
            "bytes": "03 api · 09 khanakart · 03 com",
            "len": "?"
          },
          "ask": {
            "q": "Line 31 aakhir mein 00 jodti hai. api.khanakart.com wire par kitne bytes?",
            "choices": [
              "19 — teen lambai ke bytes + 15 akshar + aakhri 00",
              "17 — jitne akshar text \"api.khanakart.com\" mein, utne bytes",
              "15 — sirf akshar jaate hain, lambai aur dots nahi"
            ],
            "answer": 0,
            "hint": "Lambai ke bytes kitne aur akshar kitne?",
            "explain": "Lambai ke 3 bytes (03, 09, 03) + akshar 3 + 9 + 3 = 15 + aakhri root byte 00 = 19. Dots wire par nahi jaate; har lambai ka byte batata hai ki agla label kitna lamba.",
            "choiceExplanations": [
              "Lambai ke 3 bytes (03, 09, 03) + akshar 3 + 9 + 3 = 15 + aakhri root byte 00 = 19. Dots wire par nahi jaate; har lambai ka byte batata hai ki agla label kitna lamba.",
              "Text mein 2 dots aur 15 akshar = 17 characters. Wire par dots ki jagah lambai ke bytes aur ek aakhri 00: 19.",
              "Lambai ke bytes ke bina padhne wala label ki seema kaise jaanega? 3 lambai bytes aur 00 bhi jaate hain."
            ]
          }
        },
        {
          "title": "3. Hadd",
          "say": "Line 31: root ka 00. Line 33: poora naam 255 bytes se zyada toh error. Byte ki banawat: upar ke do bits 00 = label, neeche ke 6 bits lambai; upar ke do bits 11 = compression pointer (naam packet mein pehle likha hai).",
          "line": "31-34",
          "vars": {
            "labels": "—",
            "bytes": "03 61 70 69 09 6b … 03 63 6f 6d 00",
            "len": "19"
          },
          "ask": {
            "q": "Ek label 63 bytes se lamba kyun nahi ho sakta?",
            "choices": [
              "Lambai ke byte ke upar ke do bits pointer ke liye hain (11 = pointer); bache 6 bits mein 63 tak",
              "63 se lamba label memory mein nahi samata — har DNS server ke paas sirf 64 bytes ka buffer hota hai",
              "63 ek purani gine hui hadd hai — koi technical wajah nahi, sirf parampara"
            ],
            "answer": 0,
            "hint": "Do bits pointer ke tag ke liye gaye. Bache 6 bits mein sabse bada number?",
            "explain": "Lambai ke byte ke upar ke do bits 11 hon toh byte label nahi, compression pointer hai (aage ka naam packet mein pehle likha hai). Bache 6 bits: 0 se 63. Isliye label 1–63 bytes.",
            "choiceExplanations": [
              "Lambai ke byte ke upar ke do bits 11 hon toh byte label nahi, compression pointer hai (aage ka naam packet mein pehle likha hai). Bache 6 bits: 0 se 63. Isliye label 1–63 bytes.",
              "Buffer ki baat nahi; lambai ka byte hi 6 bits ka bachta hai.",
              "Wajah byte ke bits mein hai: do bits pointer ke liye rakhe gaye."
            ]
          }
        }
      ],
      "lesson": "Wire par naam = lambai + akshar, har label ke liye, aakhir mein 00. Label 63 tak kyunki byte ke do bits pointer ke liye hain; poora naam 255 tak."
    },
    {
      "type": "dryrun",
      "title": "🔁 resolve(): referral se agle server tak",
      "goal": "lib/dns.js. Resolver ki copy khaali; api.khanakart.com ka A record chahiye. Shabd: A = IPv4 address record; NS = name server ka naam; referral = agle zone ke servers ka pata; glue = NS naam ka address; AA = \"main hi zone ka maalik hoon\" flag. NODATA = naam hai, maanga type nahi; NXDOMAIN = naam hi nahi; SERVFAIL = resolution fail.",
      "code": {
        "title": "lib/dns.js",
        "file": "docker-labs/54-request-anatomy/lib/dns.js",
        "from": 138,
        "text": "  async function resolve(qname, type = TYPE.A) {\n    const name = canon(qname), trace = [];\n    const hit = get(name, type);\n    if (hit) { stats.cacheHits++; return { answers: hit, rcode: RCODE.NOERROR, trace, fromCache: true }; }\n    let server = closest(name);\n    for (let hop = 0; hop < 8; hop++) {\n      const label = Object.values(ZONES).find(z => z.ip === server.ip)?.label || server.ip;\n      stats.upstream++;\n      const { reply, ms, tries } = await ask(server.ip, PORT, name, type, { timeoutMs, attempts, bindIp: ip });\n      trace.push({ server: label, ms, tries });\n      if (reply.rcode === RCODE.NXDOMAIN) return { answers: [], rcode: RCODE.NXDOMAIN, trace };\n      if (reply.rcode !== RCODE.NOERROR) return { answers: [], rcode: RCODE.SERVFAIL, trace };\n      const answers = reply.answers.filter(r => r.name === name && r.type === type && r.data);\n      if (answers.length) { put(answers); return { answers: get(name, type) || answers, rcode: RCODE.NOERROR, trace }; }\n      // a referral must point to a zone that contains the name and is deeper than the server we just asked\n      const ns = reply.authority.filter(r => r.type === TYPE.NS && r.data && isUnder(name, r.name)\n        && r.name !== server.zone && isUnder(r.name, server.zone));\n      if (!ns.length) {                         // NODATA: the name exists, the type does not (or an unusable reply)\n        return { answers: [], rcode: (reply.flags & FLAG.AA) && !reply.authority.length ? RCODE.NOERROR : RCODE.SERVFAIL, trace };\n      }\n      const zone = ns[0].name, nsSet = ns.filter(r => r.name === zone);\n      const glue = reply.additional.filter(a => a.type === TYPE.A && a.data && nsSet.some(n => n.data === a.name)\n        && isUnder(a.name, server.zone));      // only glue for these NS names, within what the asked server may speak for\n      if (!glue.length) return { answers: [], rcode: RCODE.SERVFAIL, trace };   // this lab does not chase glue-less referrals\n      put(nsSet); put(glue);\n      server = { ip: glue[0].data, zone };\n    }\n    return { answers: [], rcode: RCODE.SERVFAIL, trace };\n  }"
      },
      "vars": [
        {
          "id": "server",
          "label": "Ab kisse poochha"
        },
        {
          "id": "got",
          "label": "Jawab mein"
        },
        {
          "id": "kept",
          "label": "Copy mein rakha"
        }
      ],
      "steps": [
        {
          "title": "1. Copy khaali",
          "say": "Line 140: copy mein nahi. Line 142: closest() — copy mein koi gehra zone nahi, toh root se shuru (zone \".\").",
          "line": "140-142",
          "vars": {
            "server": "root (zone .)",
            "got": "—",
            "kept": "—"
          }
        },
        {
          "title": "2. Root ka referral",
          "say": "Line 146: root se poochha. Line 150: answers khaali. Line 153–154: authority mein com. NS — naam com. ke andar hai, aur com. root se gehra. Line 159: additional mein a.gtld-servers.net ka A (glue).",
          "line": "146-160",
          "vars": {
            "server": "root",
            "got": "com. NS + glue",
            "kept": "?"
          },
          "ask": {
            "q": "Maan lo root ke jawab ke additional mein \"bank.example A 6.6.6.6\" bhi chhupa hai. Line 162 copy mein kya rakhegi?",
            "choices": [
              "Sirf com. NS aur a.gtld-servers.net ka glue — bank.example kisi NS ka naam nahi, chhaant diya",
              "Saare additional records — jo server ne bheja, sab copy mein, taaki agli baar kaam aaye",
              "Kuch nahi — referral wale jawab ka koi record copy mein nahi jaata"
            ],
            "answer": 0,
            "hint": "Line 159 glue kis shart par rakhti hai?",
            "explain": "Line 159: glue sirf validated referral ke NS naamon ka (aur poochhe gaye server ke zone ke andar). bank.example kisi NS ka naam nahi — chhoot gaya. Pehle ka code saare additional copy mein daal deta tha: Codex ne dikhaya ki agla bank.example lookup bina poochhe 6.6.6.6 deta. Is bug ka naam cache poisoning hai.",
            "choiceExplanations": [
              "Line 159: glue sirf validated referral ke NS naamon ka (aur poochhe gaye server ke zone ke andar). bank.example kisi NS ka naam nahi — chhoot gaya. Pehle ka code saare additional copy mein daal deta tha: Codex ne dikhaya ki agla bank.example lookup bina poochhe 6.6.6.6 deta. Is bug ka naam cache poisoning hai.",
              "Saare additional rakhna hi bug tha: koi bhi server kisi bhi naam ka galat IP copy mein daal deta.",
              "NS aur glue rakhna zaroori hai — agli baar .com seedha poochhne ke liye (sibling lookup 46 ms)."
            ]
          }
        },
        {
          "title": "3. Agla server",
          "say": "Line 162: com. NS aur glue copy mein. Line 163: ab TLD (127.0.0.3, zone com.). Loop dobara: TLD bhi referral deta hai — khanakart.com NS + ns1 ka glue.",
          "line": "162-163",
          "vars": {
            "server": "TLD → khanakart.com",
            "got": "khanakart.com NS + glue",
            "kept": "com. · khanakart.com NS + glue"
          }
        },
        {
          "title": "4. Asli jawab",
          "say": "Authoritative: api.khanakart.com A 10.0.0.12. Line 150: sirf poochhe gaye naam aur type se milne wala record. Line 151: copy mein rakho, lautao.",
          "line": "150-151",
          "vars": {
            "server": "authoritative",
            "got": "10.0.0.12 (TTL 300)",
            "kept": "+ api A"
          },
          "ask": {
            "q": "Authoritative ke jawab mein AA=0, RCODE=NOERROR, authority khaali, aur answer mein sirf \"unrelated.example A 6.6.6.6\". Line 150–156 kya karengi?",
            "choices": [
              "Line 150 khaali list deti hai; NS nahi, AA bhi nahi — toh SERVFAIL, koi IP nahi",
              "unrelated.example ka IP api.khanakart.com ke jawab ki tarah lauta dengi — jawab toh aaya hai",
              "Line 151 unrelated.example ko copy mein rakh ke dobara root se poochhegi"
            ],
            "answer": 0,
            "hint": "Line 150 ka filter kya milaata hai?",
            "explain": "Line 150 sirf poochhe gaye naam aur type ke records rakhti hai: kuch nahi bacha. Line 153 mein NS bhi nahi. Line 156: AA=1 aur authority khaali hota toh NODATA (naam hai, type nahi); yahan AA=0, toh SERVFAIL. Galat naam ka jawab kabhi safalta nahi.",
            "choiceExplanations": [
              "Line 150 sirf poochhe gaye naam aur type ke records rakhti hai: kuch nahi bacha. Line 153 mein NS bhi nahi. Line 156: AA=1 aur authority khaali hota toh NODATA (naam hai, type nahi); yahan AA=0, toh SERVFAIL. Galat naam ka jawab kabhi safalta nahi.",
              "Pehle ka code kisi bhi answer ko safalta maanta tha. Line 150 ab naam aur type milaati hai.",
              "Line 151 sirf filter ke baad bache records rakhti hai; unrelated.example filter mein hi chhoot gaya."
            ]
          }
        }
      ],
      "lesson": "Resolver har jawab ko jaanchta hai: answer sirf poochhe gaye naam-type ka, referral sirf gehre zone ka, glue sirf validated referral ke NS ka. Baaki sab chhoot jaata hai — warna copy zeher ban jaati hai."
    },
    {
      "type": "cards",
      "title": "🧩 Do proxy lines, aur zone cut ka kram",
      "goal": "services/lb.js mein L4 aur L7 ka farq do lines mein dikhta hai. lib/dns.js ka answer() batata hai server kab jawab de, kab aage bheje.",
      "lesson": "L4 backend connection par chunta hai, L7 har request par. Server pehle dekhta hai ki naam kisi child zone ka toh nahi — tab referral; apna data baad mein.",
      "steps": [
        {
          "title": "1. L4: ek line, ek connection",
          "say": "<code>services/lb.js</code> line 23: <code>const target = [a, b][turn++ % 2];</code> — naya connection aate hi backend tay. Line 25: phir bas bytes copy (<code>client.pipe(up)</code>).",
          "ask": {
            "q": "Client ek keep-alive connection par 1,000 requests bhejta hai. Line 23 kitni baar chalegi?",
            "choices": [
              "Ek baar — connection aane par; saari 1,000 requests connection ke liye chune gaye backend ko",
              "1,000 baar — L4 har request par apna backend naye sire se chunta hai",
              "Do baar — ek baar /api ke liye aur ek baar /img requests ke liye"
            ],
            "answer": 0,
            "hint": "Line 23 kis callback ke andar hai: connection ya request?",
            "explain": "Line 23 net.createServer ke connection callback mein hai — ek connection, ek baar. Line 23 ke baad line 25 sirf bytes copy karti hai, request dekhti hi nahi. Lab ex4 A: keep-alive par /img bhi 100% A.",
            "choiceExplanations": [
              "Line 23 net.createServer ke connection callback mein hai — ek connection, ek baar. Line 23 ke baad line 25 sirf bytes copy karti hai, request dekhti hi nahi. Lab ex4 A: keep-alive par /img bhi 100% A.",
              "L4 ko request ka pata hi nahi — sirf bytes. Request L7 padhta hai.",
              "L4 path nahi padhta; /api aur /img L4 ke liye bas bytes hain."
            ]
          }
        },
        {
          "title": "2. L7: har request ka path",
          "say": "Line 33: <code>const target = req.url.startsWith('/img/') ? b : a;</code> — http.createServer ke request callback mein, har request par. Isliye /img → B, chahe connection ek hi ho. Keemat: har request ko parse karna (lab: ~2.2–2.6× CPU)."
        },
        {
          "title": "3. Zone cut pehle",
          "say": "<code>lib/dns.js</code> line 44: pehle dekho naam kisi delegation (child zone) ke andar hai? Toh referral (line 45–47), AA nahi. Line 49–51: apna data — jawab, NODATA (naam hai, type nahi) ya NXDOMAIN.",
          "ask": {
            "q": ".com ke TLD server se poochha: \"khanakart.com ka NS?\" TLD ke paas delegation ka NS record hai. Sahi jawab?",
            "choices": [
              "Referral, AA ke bina — authoritative jawab khanakart.com ka apna server dega",
              "AA ke saath answer — TLD ke paas record hai, toh TLD hi asli maalik hai",
              "NXDOMAIN — TLD sirf .com ke naam jaanta hai, khanakart.com ke nahi"
            ],
            "answer": 0,
            "hint": "Delegation ka NS record kiska data hai — parent ka ya child ka?",
            "explain": "Delegation ka NS parent (TLD) ke paas sirf raasta batane ke liye hai. Asli, authoritative NS child zone (khanakart.com ka server) deta hai. Pehle ka code exact match pehle dekhta tha aur TLD AA ke saath jawab de deta tha — Codex ne pakda; ab line 44 zone cut pehle dekhti hai.",
            "choiceExplanations": [
              "Delegation ka NS parent (TLD) ke paas sirf raasta batane ke liye hai. Asli, authoritative NS child zone (khanakart.com ka server) deta hai. Pehle ka code exact match pehle dekhta tha aur TLD AA ke saath jawab de deta tha — Codex ne pakda; ab line 44 zone cut pehle dekhti hai.",
              "Record rakhna maalik hona nahi. Parent ka NS bas referral hai.",
              "Naam maujood hai — child zone mein. TLD ko referral dena hai, NXDOMAIN nahi."
            ]
          }
        },
        {
          "title": "4. Codex ne aur kya pakda",
          "say": "Pehle ke lab mein: 255 bytes se lamba naam decode ho jaata tha aur jawab banate waqt server crash kar sakta tha; <code>ask()</code> kisi bhi address se aaya jawab maan leta tha; record ka data apni lambai se bahar padha jaata tha; \"type nahi\" ko \"naam nahi\" (NXDOMAIN) bata deta tha. Sab theek kiye, aur har ilaaj ka test hai jo purane code par fail hota hai."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Lab ke 13 tests, aur asli DNS",
      "project": "54-request-anatomy",
      "exercise": "ex1-dns",
      "goal": "Wire format, authoritative logic, ask() ki jaanch, cache poisoning, TTL, loss, L4/L7 — sab tests. Phir asli UDP chain.",
      "why": "Node 22+ chahiye. Tests asli UDP sockets aur processes chalate hain (127.0.0.1–.6, ports 6510, 6587–6598); samay badlega.",
      "steps": [
        {
          "text": "Lab folder se: saare tests.",
          "cmd": "cd docker-labs/54-request-anatomy && npm test",
          "expect": "npm notice run lab-54-request-anatomy@1.0.0 test\nnpm notice run node --test test/*.test.js\n✔ DNS wire format: round trip of a reply with answer, referral and glue (1.757928ms)\n✔ DNS names: pointers followed; overlong, aliased or invalid names refused (0.444639ms)\n✔ DNS records: A and NS data lengths, class, IPv4 text are checked (0.462181ms)\n✔ authoritative logic: referral before data, NODATA vs NXDOMAIN, parent never answers for the child (0.215666ms)\n✔ a malformed or overlong query does not crash a server; normal queries still work (53.929483ms)\n✔ ask() accepts only the real reply: right source, QR, ID, name and type (22.065459ms)\n✔ resolver trusts only relevant records: unrelated answers and extra glue are not cached (74.074628ms)\n✔ real UDP chain: cold walks root → TLD → authoritative, warm is cached, NXDOMAIN, NODATA, c-ares agrees (221.264566ms)\n✔ TTL: the cached answer counts down and expires; then the resolver asks again (134.63382ms)\n✔ UDP loss: a retried lookup waits the timeout; total loss fails after the last try (1515.677082ms)\n✔ L4 proxy is path-blind (one connection → one backend); L7 routes each request by path (135.451039ms)\n✔ WAF: an attack is caught by its rule; a clean body passes all 2,000 rules (15.541769ms)\n✔ BGP model: per-prefix choice by LOCAL_PREF then AS path; forwarding by longest prefix; helpers (0.369562ms)\nℹ tests 13\nℹ suites 0\nℹ pass 13\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 2216.944035"
        },
        {
          "text": "Asli DNS chain.",
          "cmd": "npm start -- ex1-dns",
          "expect": "REAL RUN: Node v24.18.0; real UDP packets in DNS wire format; MODEL delays: you ↔ resolver 5 ms, root 20, TLD 30, authoritative 40 ms\n\nlookups through the resolver (as your laptop would):\n  api.khanakart.com     100 ms  resolver asked 3 server(s)  → 10.0.0.12 (TTL 300 s)   cold: root → TLD → authoritative\n  api.khanakart.com       6 ms  resolver asked 0 server(s)  → 10.0.0.12 (TTL 300 s)   warm: from the resolver cache\n  img.khanakart.com      46 ms  resolver asked 1 server(s)  → 10.0.0.13 (TTL 300 s)   sibling: .com and khanakart.com referrals cached\n  nope.khanakart.com     47 ms  resolver asked 1 server(s)  → NXDOMAIN   name does not exist (this lab does not cache NXDOMAIN)\n\n1,000 more lookups of api.khanakart.com within its TTL: resolver asked 0 upstream servers (root +0, authoritative +0)\nNode's own resolver (c-ares) via this resolver: khanakart.com → [{\"address\":\"10.0.0.10\",\"ttl\":300}]\nqueries seen: root 1, TLD 1, authoritative 4"
        }
      ],
      "observe": {
        "q": "Ek test nakli root server banata hai jo referral ke saath \"bank.example A 6.6.6.6\" bhejta hai. Test kya jaanchta hai?",
        "choices": [
          "Resolver asli referral follow kare, par bank.example copy mein na jaaye",
          "Resolver nakli root ko pehchaan ke nakli root se baat hi na kare",
          "Resolver bank.example ka IP jaldi lautaye, kyunki IP pehle se mil gaya"
        ],
        "answer": 0,
        "hint": "Test ke aakhri do assert kya maangte hain?",
        "explain": "Test do baat maangta hai: api.khanakart.com ka asli jawab (10.0.0.12) referral follow karke aaye, aur copy mein bank.example ki koi key na ho. Glue filter hatao toh poisoning wala test fail hota hai — jaancha gaya.",
        "choiceExplanations": [
          "Test do baat maangta hai: api.khanakart.com ka asli jawab (10.0.0.12) referral follow karke aaye, aur copy mein bank.example ki koi key na ho. Glue filter hatao toh poisoning wala test fail hota hai — jaancha gaya.",
          "Resolver ko pata nahi ki root nakli hai; sirf records ki jaanch karta hai.",
          "bank.example ka IP rakhna hi poisoning hai — test ulta jaanchta hai ki bank.example copy mein na ho."
        ]
      },
      "lesson": "13 tests core scenarios aur DNS regression guards jaanchte hain. Naam ki hadd, source check, glue filter, zone cut ka kram aur retry timing ke mutation checks par related tests fail hue."
    }
  ],
  "interview": {
    "title": "Interview Round — DNS code",
    "instructions": "Pehle socho: kaunsa jawab bharose layak hai, aur kharab packet par code kya karega? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Ek resolver library jawab ko sirf 16-bit ID se milaati hai, aur outgoing query ka source port hamesha 53 rakhti hai. Kya khatra hai?",
        "choices": [
          "Attacker ID ke anumaan bhej ke nakli jawab ghusa sakta hai — random port, address aur question bhi milao",
          "Koi khatra nahi — 16-bit ID ke 65,536 mumkin maan hain, sahi anumaan lagbhag namumkin hai",
          "Sirf speed ka nuksaan — ek port par saare sawaal line mein lagte hain, security ka koi farq nahi",
          "Khatra tabhi jab resolver TCP use kare — UDP par nakli jawab bhejna mumkin hi nahi"
        ],
        "answer": 0,
        "explain": "65,536 ID kam hain: attacker asli jawab se pehle hazaaron anumaan bhej sakta hai (2008 ka Kaminsky attack). Random source port attacker ko ID ke saath port bhi guess karwata hai; faayda available unpredictable ports aur NAT par depend karta hai. Jawab ka source address, port, ID, naam aur type milaana zaroori; lab ka ask() source address, port, ID, naam aur type milaata hai.",
        "choiceExplanations": [
          "65,536 ID kam hain: attacker asli jawab se pehle hazaaron anumaan bhej sakta hai (2008 ka Kaminsky attack). Random source port attacker ko ID ke saath port bhi guess karwata hai; faayda available unpredictable ports aur NAT par depend karta hai. Jawab ka source address, port, ID, naam aur type milaana zaroori; lab ka ask() source address, port, ID, naam aur type milaata hai.",
          "Attacker ek sawaal ke jawab se pehle hazaaron anumaan bhej sakta hai; 65,536 kaafi nahi.",
          "Fixed port + sirf ID = anumaan aasaan; sawaal security ka hai.",
          "UDP par nakli source wala packet bhejna aasaan hai; isliye hi jaanch chahiye."
        ]
      },
      {
        "q": "Ek DNS parser compression pointer bina kisi jaanch ke follow karta hai. Kharab packet kya kar sakta hai?",
        "choices": [
          "Khud ki ya aage ki taraf pointer loop banata hai — parser atakta hai; sirf peeche, ginti ke saath",
          "Kuch nahi — compression pointer sirf naam chhota karta hai, parser ko koi khatra nahi",
          "Sirf galat naam padha jaayega — atakna mumkin nahi, kyunki packet ki lambai seemit hai",
          "Parser crash ho jaayega, par sirf tab jab naam 63 se lamba label rakhe"
        ],
        "answer": 0,
        "explain": "Pointer 0xC0 0x0C khud ki taraf ishaara kare toh anant loop: packet chhota hai, par loop ki koi hadd nahi. Lab ka readName: pointer sirf peeche (line 'target >= pos' par error), 16 hops tak, aur poora naam 255 bytes tak — compression se bhi.",
        "choiceExplanations": [
          "Pointer 0xC0 0x0C khud ki taraf ishaara kare toh anant loop: packet chhota hai, par loop ki koi hadd nahi. Lab ka readName: pointer sirf peeche (line 'target >= pos' par error), 16 hops tak, aur poora naam 255 bytes tak — compression se bhi.",
          "Pointer ka loop parser ko hamesha ke liye ghuma sakta hai — chhota packet, anant kaam.",
          "Packet ki lambai seemit hai, par loop ek hi bytes ko baar-baar padhta hai.",
          "Label ki hadd alag jaanch hai; loop pointer se banta hai."
        ]
      }
    ]
  },
  "success": [
    "DNS naam ke wire bytes gin sakte ho aur 63/255 ki hadd samjha sakte ho",
    "Resolver ka referral loop aur har jawab ki jaanch samjha sakte ho",
    "L4/L7 ka farq aur zone cut ka kram code mein dikha sakte ho"
  ],
  "cards": [
    {
      "front": "api.khanakart.com wire par?",
      "back": "03 api 09 khanakart 03 com 00 = 19 bytes. Label 1–63 (do bits pointer ke liye), poora naam 255 bytes tak."
    },
    {
      "front": "Resolver kis record par bharosa kare?",
      "back": "Answer: sirf poochhe gaye naam aur type. Referral: sirf NS jo naam ko contain kare aur gehra ho. Glue: sirf validated referral ke NS naamon ka. Baaki chhodo (cache poisoning)."
    },
    {
      "front": "Zone cut ka kram?",
      "back": "Pehle delegation (child zone) dekho → referral, AA nahi. Phir apna data: jawab (AA), NODATA (naam hai, type nahi), ya NXDOMAIN."
    }
  ]
}
]);
})();
