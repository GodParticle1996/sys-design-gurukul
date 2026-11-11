/* First Principles — FAANG Senior Engineer.
   Source credit: The Physics of Persistence: B-Trees vs LSM-Trees (RAuIWs3ne9g), numbered video 5/15.
   Evidence: docker-labs/55-persistence/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "log", "icon": "📒", "label": "wal.log", "x": 150, "y": 105}, {"id": "kv", "icon": "🔁", "label": "open()", "x": 445, "y": 105}, {"id": "bus", "icon": "🚌", "label": "group commit", "x": 750, "y": 105}];
const EDGES = [{"from": "log", "to": "kv"}, {"from": "kv", "to": "bus"}];
VISUALS["fp-per-code"] = { t: "50 lines ka KV store, aur har line ek vaada: \"done\" kaha toh crash ke baad bhi milega.", html: SD.viz.svg(HERO, EDGES, { nodes: { log: {tone:'acc',badge:'poonchh?'}, kv: {tone:'ok',badge:'replay'}, bus: {tone:'busy',badge:'ek fsync'} } }, {w:890,h:215}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-per-code",
  "icon": "💾",
  "group": "💾 Physics of Persistence",
  "title": "Persistence 3 · Code — recovery, group commit aur adhoore writes",
  "badge": "Recovery Kaarigar",
  "objectives": [
    "Recovery kaunsa adhoora record kaat-ti hai, aur kab ruk jaati hai?",
    "Group commit ek fsync mein kai commits kaise le jaata hai?",
    "Adhoore writes aur nayi file ke naam ko kaise pakka karte hain?"
  ],
  "lesson": [
    "<h3>💻 Chhoti files, bade vaade</h3><p>Lab 55 ka KV store 50 lines ka hai, par har line ek vaada nibhaati hai: \"done\" kaha toh crash ke baad bhi milega. Codex ki review ne do jagah vaada tootta dikhaya — aadhe writes aur nayi file ka naam — aur ek jagah recovery zaroorat se zyada kaat rahi thi.</p><p>Pehle code, phir bugs.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🔁 open(): register, phir notepad",
      "goal": "lib/kv.js. Bijli ke baad restart. table.snap mein order-41, 42. wal.log mein order-43, 44 — aur aakhir mein order-45 ka aadha record.",
      "code": {
        "title": "lib/kv.js",
        "file": "docker-labs/55-persistence/lib/kv.js",
        "from": 14,
        "text": "  open() {\n    this.map = new Map();\n    const snap = this.disk.read('table.snap');\n    let fromSnapshot = 0;\n    if (snap) {\n      const s = decodeAll(snap);\n      if (s.records.length !== 1 || s.stop) throw new Error('table.snap is damaged: ' + (s.stop || 'wrong record count'));\n      for (const [k, v] of JSON.parse(s.records[0])) this.map.set(k, v);\n      fromSnapshot = this.map.size;\n    }\n    const log = this.disk.read('wal.log') || Buffer.alloc(0);\n    const r = decodeAll(log);\n    // A crash mid-append leaves the LAST record with fewer bytes than its header promises: that tail was never\n    // acknowledged, so it is cut (or later records would hide behind it). A checksum mismatch — even in the last\n    // record — may be bit rot in a record that WAS acknowledged: stop, and leave the log untouched for repair.\n    const tail = r.stop === 'torn header' || r.stop === 'torn record';\n    if (r.stop && !tail) throw new Error(`wal.log is damaged at byte ${r.at} (${r.stop}); log left unchanged — repair from a backup or replica`);\n    for (const rec of r.records) { const { k, v } = JSON.parse(rec); this.map.set(k, v); }\n    this.wal = this.disk.open('wal.log');\n    if (r.stop) this.disk.truncate(this.wal, r.at);\n    return { fromSnapshot, replayed: r.records.length, stop: r.stop, cutAt: r.stop ? r.at : null };\n  }"
      },
      "vars": [
        {
          "id": "map",
          "label": "RAM mein table"
        },
        {
          "id": "log",
          "label": "Log ka haal"
        },
        {
          "id": "act",
          "label": "Faisla"
        }
      ],
      "steps": [
        {
          "title": "1. Register",
          "say": "Line 16–22: table.snap padho. decodeAll records aur rukne ki wajah deta hai; line 20 ka snapshot guard theek ek poora record maangta hai. Guard fail ho toh error. RAM mein 41, 42.",
          "line": "16-22",
          "vars": {
            "map": "41, 42",
            "log": "—",
            "act": "snapshot theek"
          }
        },
        {
          "title": "2. Notepad padho",
          "say": "Line 24–25: wal.log ko decodeAll se padho. 43 aur 44 poore, phir order-45 ke bytes kam — <code>stop: 'torn record'</code>, <code>at</code> = 45 ka shuru.",
          "line": "24-25",
          "vars": {
            "map": "41, 42",
            "log": "43, 44 + aadha 45",
            "act": "?"
          }
        },
        {
          "title": "3. Poonchh ya kharabi?",
          "say": "Line 29: <code>tail</code> sirf tab sach hai jab <b>aakhri</b> record ka header poora aur sahi ho (header ka apna checksum), par data ke bytes kam hon. Lab maanta hai ki aisa sirf append ke beech crash se hota hai. Is restart mein order-45 ke bytes kam: tail.",
          "line": "29-30",
          "vars": {
            "map": "41, 42",
            "log": "43, 44 + aadha 45",
            "act": "tail → kaatna theek"
          },
          "ask": {
            "q": "Socho is baar 3 records hain aur record 2 ka checksum fail, record 3 theek. Line 29–30 kya karengi?",
            "choices": [
              "Error dengi aur log ko haath nahi lagayengi — beech ki kharabi corruption hai, backup/replica se theek karo",
              "Record 2 se log kaat dengi — kharab record ke baad ka sab kuch bekaar maan ke hata dengi",
              "Record 2 chhod ke record 3 replay kar dengi — kharab record skip karna sabse aasaan raasta hai"
            ],
            "answer": 0,
            "hint": "Record 2 aakhri record hai kya?",
            "explain": "Crash ke beech append sirf aakhri record adhoora chhod sakta hai. Beech ka checksum fail matlab chupi kharabi. Kaatne se record 3 (jise \"done\" mila tha) aur kharabi ka saboot dono mit jaate. Pehle code ki review mein checksum kharabi par valid baad ke records mitne ka bug mila tha. Ab: error, log jaisa tha waisa, repair backup ya replica se. Aakhri record ka checksum fail ho, ya kisi header ka checksum fail ho, tab bhi error.",
            "choiceExplanations": [
              "Crash ke beech append sirf aakhri record adhoora chhod sakta hai. Beech ka checksum fail matlab chupi kharabi. Kaatne se record 3 (jise \"done\" mila tha) aur kharabi ka saboot dono mit jaate. Pehle code ki review mein checksum kharabi par valid baad ke records mitne ka bug mila tha. Ab: error, log jaisa tha waisa, repair backup ya replica se. Aakhri record ka checksum fail ho, ya kisi header ka checksum fail ho, tab bhi error.",
              "Kaatna record 3 ko mita deta, jabki record 3 theek aur acknowledged tha.",
              "Record 2 ka badlaav kho jaata, aur record 3 galat base par lagta; chupke se aage badhna galat."
            ]
          }
        },
        {
          "title": "4. Replay",
          "say": "Line 31: 43 aur 44 RAM ki table par upar se lagao. Ab 41–44.",
          "line": "31",
          "vars": {
            "map": "41, 42, 43, 44",
            "log": "43, 44 + aadha 45",
            "act": "replay"
          }
        },
        {
          "title": "5. Kaato, phir khulo",
          "say": "Line 32: wal.log kholo (nayi file ho toh folder ka bhi fsync). Line 33: log ko <code>r.at</code> par kaato — sirf order-45 ke aadhe bytes jaate hain.",
          "line": "32-34",
          "vars": {
            "map": "41–44",
            "log": "43, 44",
            "act": "aadha 45 kata"
          },
          "ask": {
            "q": "Line 33 log ko <code>r.at</code> par kaat-ti hai, 0 par kyun nahi?",
            "choices": [
              "0 par kaatne se 43 aur 44 bhi mit jaate — agle crash par table.snap mein sirf 41, 42 hote",
              "0 par kaatna mana hai — OS khaali file ko truncate karne nahi deta, error aata hai",
              "Koi farq nahi — 43 aur 44 RAM mein aa chuke, toh log mein rehne ki zaroorat nahi"
            ],
            "answer": 0,
            "hint": "43 aur 44 abhi disk par kahan likhe hain?",
            "explain": "43 aur 44 sirf log mein pakke hain; table.snap mein nahi. Log 0 par kaata toh agle crash par dono gaye. <code>r.at</code> par kaatne se sirf aadha record jaata hai. Lab ka test valid prefix bachne aur sirf adhoora tail katne ki jaanch karta hai: a=1 bacha, aur file ka size sirf poore records jitna.",
            "choiceExplanations": [
              "43 aur 44 sirf log mein pakke hain; table.snap mein nahi. Log 0 par kaata toh agle crash par dono gaye. <code>r.at</code> par kaatne se sirf aadha record jaata hai. Lab ka test valid prefix bachne aur sirf adhoora tail katne ki jaanch karta hai: a=1 bacha, aur file ka size sirf poore records jitna.",
              "OS khaali ya bhari kisi bhi file ko truncate karne deta hai.",
              "RAM bijli ke saath jaati hai; agle crash ke liye 43, 44 ka disk par hona zaroori."
            ]
          }
        }
      ],
      "lesson": "Recovery: snapshot, phir log replay. Sahi header par kam bytes wala aakhri record kaato, aur sirf utna hi; lab ki shart hai ki adhoora tail sirf crash se banta hai. Header ya data ka checksum mismatch kahin bhi ho — ruk jao, log mat chhuo."
    },
    {
      "type": "dryrun",
      "title": "🚌 flusher(): ek fsync, kai commits",
      "goal": "lib/commit.js, group commit. Teen clients A, B, C. Har client \"done\" milne tak rukta hai. Ek write + fsync ~1.3 ms.",
      "code": {
        "title": "lib/commit.js",
        "file": "docker-labs/55-persistence/lib/commit.js",
        "from": 22,
        "text": "  let pending = [], flushing = null, failed = null, lock = Promise.resolve();\n  async function flusher() {\n    while (pending.length) {\n      const batch = pending; pending = [];\n      try { await writeAll(fh, Buffer.concat(batch.map(x => x.buf))); await fh.sync(); }\n      catch (e) { failed = e; for (const x of [...batch, ...pending]) x.fail(e); pending = []; break; }\n      batches.push(batch.length); for (const x of batch) x.done();\n    }\n    flushing = null;\n  }\n  const commitGroup = buf => new Promise((done, fail) => {\n    if (failed) return fail(failed);           // store has failed: no new commits\n    pending.push({ buf, done, fail });\n    if (!flushing) flushing = flusher();\n  });"
      },
      "vars": [
        {
          "id": "pending",
          "label": "pending (line)"
        },
        {
          "id": "disk",
          "label": "Disk par"
        },
        {
          "id": "fsyncs",
          "label": "fsyncs"
        }
      ],
      "steps": [
        {
          "title": "1. A aaya",
          "say": "Line 34–35: A ka commit <code>pending</code> mein. Koi flusher nahi chal raha, toh flusher shuru.",
          "line": "34-35",
          "vars": {
            "pending": "A",
            "disk": "—",
            "fsyncs": "0"
          }
        },
        {
          "title": "2. Bus chali",
          "say": "Line 25: flusher poori line utha leta hai — batch = [A], pending khaali. Line 26: A ke bytes poore likho (writeAll), phir fsync. ~1.3 ms lagenge.",
          "line": "25-26",
          "vars": {
            "pending": "—",
            "disk": "A likh raha…",
            "fsyncs": "1 chal raha"
          }
        },
        {
          "title": "3. B aur C aaye",
          "say": "fsync chal hi raha hai. B aur C ke commits <code>pending</code> mein; <code>flushing</code> pehle se set hai, toh naya flusher nahi.",
          "line": "34-35",
          "vars": {
            "pending": "B, C",
            "disk": "A likh raha…",
            "fsyncs": "1 chal raha"
          },
          "ask": {
            "q": "A ka fsync khatam. A, B aur C — teeno ko \"done\" milne tak kul kitne fsync lagenge?",
            "choices": [
              "2 — A akela ek mein, phir B aur C saath agle ek mein (line 24 ka loop)",
              "3 — har commit ko apna alag fsync chahiye, warna B aur C ka \"done\" pakka nahi",
              "1 — B aur C chalte hue fsync mein beech se jud jaate hain, naya fsync nahi"
            ],
            "answer": 0,
            "hint": "Line 24: A ke baad pending mein kya bacha?",
            "explain": "A ka fsync B aur C ke aane se pehle shuru ho chuka tha, toh A akela. Loop (line 24) pending mein B, C dekhta hai: ek writeAll, ek fsync, dono ko done. Kul 2. Lab mein 64 clients par ~32 commits ek fsync mein.",
            "choiceExplanations": [
              "A ka fsync B aur C ke aane se pehle shuru ho chuka tha, toh A akela. Loop (line 24) pending mein B, C dekhta hai: ek writeAll, ek fsync, dono ko done. Kul 2. Lab mein 64 clients par ~32 commits ek fsync mein.",
              "B aur C ek hi fsync mein saath pakke hote hain; har commit ka alag fsync zaroori nahi.",
              "Chalte fsync ne B aur C ke bytes likhe hi nahi the; agla fsync chahiye."
            ]
          }
        },
        {
          "title": "4. Done",
          "say": "Line 28: batch ke har commit ko <code>done()</code>. Clients ab aage badhte hain.",
          "line": "28",
          "vars": {
            "pending": "—",
            "disk": "A, B, C",
            "fsyncs": "2"
          }
        },
        {
          "title": "5. Agar fsync fail ho?",
          "say": "Line 27: write ya fsync mein error aaye toh store <code>failed</code>. Batch ke <b>har</b> commit aur line mein khade commits ko <code>fail(e)</code>, loop ruk jaata hai. Line 33: naye commits turant fail. Kisi ko \"done\" nahi.",
          "line": "26-33",
          "vars": {
            "pending": "—",
            "disk": "pata nahi",
            "fsyncs": "error"
          },
          "ask": {
            "q": "B aur C ke saanjhe fsync mein disk error aaya. Sirf B ko fail karke C ko \"done\" de sakte ho?",
            "choices": [
              "Nahi — ek hi fsync tha; pata nahi kaunse bytes pahunche, toh batch ka koi bhi \"done\" sach nahi",
              "Haan — C ke bytes baad mein likhe gaye the, toh C ke bytes disk par pahunch gaye honge",
              "Haan — fsync dobara chala do aur success aaye toh C ko \"done\"; dobara koshish hamesha safe hai"
            ],
            "answer": 0,
            "hint": "Ek fsync ne kis-kis ke bytes pakke karne the?",
            "explain": "Ek fsync poore batch ke liye tha. Fail hua toh kisi ka pakkapan saabit nahi. Aur fsync ko dobara chala ke success maan lena khatarnak hai: Linux par error ke baad gande pages chhoot sakte hain. PostgreSQL mein WAL ke fsync ka fail hona PANIC deta hai; data files ke flush fail par bhi default data_sync_retry = off PANIC deta hai. Restart valid WAL se recovery karta hai.",
            "choiceExplanations": [
              "Ek fsync poore batch ke liye tha. Fail hua toh kisi ka pakkapan saabit nahi. Aur fsync ko dobara chala ke success maan lena khatarnak hai: Linux par error ke baad gande pages chhoot sakte hain. PostgreSQL mein WAL ke fsync ka fail hona PANIC deta hai; data files ke flush fail par bhi default data_sync_retry = off PANIC deta hai. Restart valid WAL se recovery karta hai.",
              "Kram se pahunchna fsync ki guarantee nahi; error ke baad koi bhi byte adhoora ho sakta hai.",
              "Error ke baad doosra fsync success de sakta hai jabki bytes chhoot gaye; dobara koshish par bharosa nahi."
            ]
          }
        }
      ],
      "lesson": "Group commit: fsync chalte waqt aaye commits agli bus mein. Ek bus = ek write + ek fsync. Bus fail toh har sawaari fail — kisi ko jhootha \"done\" nahi."
    },
    {
      "type": "cards",
      "title": "🔍 Codex ne kya pakda",
      "goal": "Lab 55 ki pehli review mein Codex ne do gambhir chhed pakde. Dono asli databases bhi sambhalte hain.",
      "lesson": "write() kam bytes likh sakta hai: tab tak likho jab tak saare bytes na jaayein. Nayi file ka naam folder ke fsync se pakka hota hai.",
      "steps": [
        {
          "title": "1. Kam bytes",
          "say": "<code>write()</code> maange se kam bytes likh sakta hai, aur ginti lautata hai. Pehle ka code ginti dekhta hi nahi tha. Ab <code>writeAllSync</code> aur <code>writeAll</code> loop mein likhte hain; zero progress = error.",
          "ask": {
            "q": "Pehle ke code mein checkpoint ki table file aadhi likhi gayi, phir bhi rename aur log khaali. Restart par?",
            "choices": [
              "table.snap \"damaged\", aur log pehle hi khaali — orders ki koi achhi copy nahi bachi",
              "Kuch nahi — rename sirf poori file par hota hai, aadhi file kabhi rename nahi hoti",
              "Log se sab wapas — checkpoint ke baad bhi log mein saare purane orders bache rehte hain"
            ],
            "answer": 0,
            "hint": "Checkpoint ke baad log ka kya hota hai?",
            "explain": "Rename ko file ki lambai ki parwaah nahi; aadhi file bhi table.snap ban jaati. Checkpoint phir log ko 0 kar deta. Restart: snapshot kharab, log khaali — achhi copy kahin nahi. Review mein short snapshot write ke baad achha WAL mitne ka bug mila. Ab writeAll saare bytes likhta hai, tabhi fsync, rename aur log khaali.",
            "choiceExplanations": [
              "Rename ko file ki lambai ki parwaah nahi; aadhi file bhi table.snap ban jaati. Checkpoint phir log ko 0 kar deta. Restart: snapshot kharab, log khaali — achhi copy kahin nahi. Review mein short snapshot write ke baad achha WAL mitne ka bug mila. Ab writeAll saare bytes likhta hai, tabhi fsync, rename aur log khaali.",
              "Rename naam badalta hai; file poori hai ya nahi, nahi jaanchta.",
              "Checkpoint ka aakhri kadam log ko 0 karna hai."
            ]
          }
        },
        {
          "title": "2. Naam bhi pakka karo",
          "say": "Naya <code>wal.log</code> bana, orders likhe, file ka fsync hua — par file ka <b>naam</b> folder (directory) mein ek entry hai. File ka fsync folder ki entry ko pakka nahi karta. Ab nayi file banne par folder ka bhi fsync (<code>disk.js open()</code>)."
        },
        {
          "title": "3. Naam",
          "say": "Maange se kam bytes likhna: <b>short write</b>. Saare bytes tak dohraana: <b>write-all loop</b>. Folder mein file ke naam ka record: <b>directory entry</b>. Crash se adhoora chhoota aakhri record: <b>torn tail</b>; checksum se na milne wala data: <b>corruption</b>."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Tests aur asli crash",
      "project": "55-persistence",
      "exercise": "ex2-crash",
      "goal": "14 tests: adhoore writes, header aur data checksum kharabi, torn tail, group commit, fail-stop, asli SIGKILL. Phir crash ka asli run.",
      "why": "Node 22+ chahiye. Tests asli files, fsync aur ek asli child process chalate hain; samay badlega.",
      "steps": [
        {
          "text": "Lab folder se: saare tests.",
          "cmd": "cd docker-labs/55-persistence && npm test",
          "expect": "npm notice run lab-55-persistence@1.0.0 test\nnpm notice run node --test test/*.test.js\n✔ crc32 matches the standard check value, and catches every single-bit flip in the payload (1.237538ms)\n✔ WAL reader trusts records up to a torn tail or a damaged header, and nothing after (0.958486ms)\n✔ a flipped length bit in an acknowledged record stops recovery and changes no byte (0.704435ms)\n✔ only sync=none + power cut loses acknowledged puts (model disk) (4.910074ms)\n✔ open() cuts a torn tail, so records appended later can be read (36.484659ms)\n✔ checkpoint + replay: the table and the log together give every key back (real files) (362.249621ms)\n✔ SIGKILL of the writing process loses no acknowledged put, even without fsync (real process) (50.850523ms)\n✔ group commit shares fsyncs between waiting clients; every commit is written once (real file) (192.669776ms)\n✔ B+tree finds every key at any page size; a cold lookup reads one page per level, or one with inner pages pinned (330.860617ms)\n✔ LSM: newest value wins across flushes and compactions; bloom filters never hide a key (19.62366ms)\n✔ SSD model: sequential overwrites copy nothing; random overwrites copy more as the drive fills (6.204377ms)\n✔ recovery stops on a checksum mismatch anywhere, even in the last record, and leaves the file untouched (31.993968ms)\n✔ short writes: every byte is written before fsync and \"done\"; no progress is an error; a new log name is made durable (271.66698ms)\n✔ fail-stop: after a write error no later commit is acknowledged, and the file closes after I/O settles (9.578379ms)\nℹ tests 14\nℹ suites 0\nℹ pass 14\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 1405.932696"
        },
        {
          "text": "Asli crash.",
          "cmd": "npm start -- ex2-crash",
          "expect": "REAL RUN: Node v24.18.0, linux; child process killed with SIGKILL after it reported 5,000 acks\n\nsync     killed by   acked to parent   records in wal.log after restart   acked but missing   log end\nnone     SIGKILL               5,000                              5,000                   0   clean\ncommit   SIGKILL               5,000                              5,000                   0   clean\nkill -9 ends the PROCESS, not the OS: bytes already handed to write() are in the page cache and reach the disk later.\nA power cut also ends the OS — see ex0 (model) for what sync=none loses then.\n\n== torn tail: the last record is cut in half (power failed mid-write) ==\nwal.log: 118 bytes; reader trusts 3 records, stops at byte 102: torn record\nif the torn bytes stay and order-5 is appended after them: reader finds 3 records — order-5 is invisible\nKV.open(): replayed 3, cut the log at byte 102 (torn record)\nafter cutting, order-5 appended, reopened: order-5 = 50, keys = 4"
        }
      ],
      "observe": {
        "q": "Ek test write() ko har baar sirf aadhe bytes likhne deta hai. Test kya jaanchta hai?",
        "choices": [
          "Saare records poore likhe jaayein aur reopen par sab milein; zero progress par error aaye",
          "write() ko aadha likhne par turant error aaye, taaki order dobara bheja ja sake",
          "Aadhe likhe records reopen par apne aap chhod diye jaayein, baaki theek padhe jaayein"
        ],
        "answer": 0,
        "hint": "Test ke assert reopen ke baad kitne keys maangte hain?",
        "explain": "Aadha-aadha likhne wala fs bhi saare 21 keys poore likhwata hai: writeAll loop chalta rehta hai. Reopen par 21 keys. Aur 0 bytes likhne wale fs par \"no progress\" error. Group commit ke dono modes bhi aadhe writes par poore bytes likhte hain. Loop hatao toh test fail — jaancha gaya. Folder ka fsync bhi alag assert: folder khula, aur usi folder fd par fsync hua.",
        "choiceExplanations": [
          "Aadha-aadha likhne wala fs bhi saare 21 keys poore likhwata hai: writeAll loop chalta rehta hai. Reopen par 21 keys. Aur 0 bytes likhne wale fs par \"no progress\" error. Group commit ke dono modes bhi aadhe writes par poore bytes likhte hain. Loop hatao toh test fail — jaancha gaya. Folder ka fsync bhi alag assert: folder khula, aur usi folder fd par fsync hua.",
          "Kam bytes likhna error nahi; bache bytes dobara likhne hote hain.",
          "Poora likhna zaroori hai; adhoore record ko \"done\" kehna hi bug tha."
        ]
      },
      "lesson": "Tests short writes, folder ka asli fsync, header aur data checksum par rukna, sirf adhoora tail kaatna, aur error ke baad fail-stop jaanchte hain. Har guard hata ke chalaya: related test fail hua. Sirf commit.js line 33 ka guard bacha, kyunki is harness mein failure ke baad koi naya commit aata hi nahi."
    }
  ],
  "interview": {
    "title": "Interview Round — recovery code",
    "instructions": "Pehle socho: kharabi kahan hai, kis byte ka pakkapan saabit hai, aur kaatne se kya mitega? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Restart ke baad service nahi uthti: \"wal.log is damaged at byte 4,096 (checksum mismatch)\". Log mein aage aur records hain. Teammate kehta hai: \"log wahin kaat do, service chalu karo.\" Kya karoge?",
        "choices": [
          "Log mat kaato — copy bachao, replica ya backup se sahi records lao; aage ke records acknowledged ho sakte hain",
          "Kaat do — checksum fail ka matlab hai crash, aur crash ke baad ka sab kuch waise bhi adhoora hota hai",
          "Checksum check band kar do — record padh lo, ek-do bit ki galti se data mein farq nahi padta",
          "Log delete karke sirf table.snap se uthao — snapshot hamesha poora aur sabse naya hota hai"
        ],
        "answer": 0,
        "explain": "Beech ka checksum fail crash ki poonchh nahi; aage ke poore records ko \"done\" mila tha. Kaatna un records ko aur kharabi ka saboot, dono mita deta. Pehle file ki copy, phir replica/backup se repair. Lab ka open() beech ki kharabi par error deta hai aur log nahi chhoota.",
        "choiceExplanations": [
          "Beech ka checksum fail crash ki poonchh nahi; aage ke poore records ko \"done\" mila tha. Kaatna un records ko aur kharabi ka saboot, dono mita deta. Pehle file ki copy, phir replica/backup se repair. Lab ka open() beech ki kharabi par error deta hai aur log nahi chhoota.",
          "Crash sirf aakhri record adhoora chhodta hai; is log mein kharabi beech mein hai.",
          "Galat bit kisi rakam ya ID ko badal sakti hai; galat data chupchaap chalana khatarnak.",
          "Snapshot checkpoint tak ka hai; checkpoint ke baad ke saare acknowledged orders sirf log mein hain."
        ]
      },
      {
        "q": "Group commit ke ek batch ka fsync EIO (disk error) deta hai. Kya karoge?",
        "choices": [
          "Batch aur line ke har commit ko fail karo, naye commits roko; dobara fsync par bharosa nahi — recovery karo",
          "Sirf aakhri commit ko fail karo — pehle ke commits ke bytes pehle likhe gaye, toh pahunch gaye honge",
          "fsync dobara chalao, success aaye toh sab ko \"done\" — disk error aksar ek pal ki gadbad hoti hai",
          "Error ko log karo aur sab ko \"done\" do — bytes OS ke page cache mein toh hain hi"
        ],
        "answer": 0,
        "explain": "Ek fsync poore batch ke liye tha; fail hua toh kisi ka pakkapan saabit nahi. Log mein ab adhoora batch ho sakta hai, toh store ko failed maano. Linux par fsync error ke baad gande pages chhoot sakte hain, aur agla fsync success de sakta hai jabki bytes gaye. PostgreSQL WAL fsync fail par PANIC deta hai (data files ke liye default data_sync_retry = off bhi). Phir valid WAL se recovery.",
        "choiceExplanations": [
          "Ek fsync poore batch ke liye tha; fail hua toh kisi ka pakkapan saabit nahi. Log mein ab adhoora batch ho sakta hai, toh store ko failed maano. Linux par fsync error ke baad gande pages chhoot sakte hain, aur agla fsync success de sakta hai jabki bytes gaye. PostgreSQL WAL fsync fail par PANIC deta hai (data files ke liye default data_sync_retry = off bhi). Phir valid WAL se recovery.",
          "Fsync kram ki guarantee nahi deta; pehle likhe bytes bhi adhoore ho sakte hain.",
          "Error ke baad ka success jhootha ho sakta hai; bytes chhoot chuke ho sakte hain.",
          "Page cache bijli ke saath jaata hai; \"done\" jhootha ho jaayega."
        ]
      }
    ]
  },
  "success": [
    "Recovery ka tail-vs-corruption faisla code se samjha sakte ho",
    "Group commit ka loop aur fail hone par bartav samjha sakte ho",
    "Adhoore writes aur folder fsync ki zaroorat bata sakte ho"
  ],
  "cards": [
    {
      "front": "Recovery kab kaate, kab ruke?",
      "back": "Sirf aakhri record jiska header sahi ho par data ke bytes kam hon: r.at par kaato (shart: adhoora tail sirf crash se). Header ya data checksum mismatch kahin bhi: error, log jaisa hai waisa, repair backup/replica se."
    },
    {
      "front": "Group commit ka fail?",
      "back": "Ek batch = ek write + ek fsync. Fail hua toh batch ke har commit ko fail. Line ke baaki commits bhi fail, naye commits band. fsync dobara chala ke success par bharosa nahi (PostgreSQL: WAL fsync fail = PANIC, phir valid WAL se recovery)."
    },
    {
      "front": "Adhoore writes aur nayi file?",
      "back": "write() kam bytes likh sakta hai: loop karo jab tak saare na jaayein, zero progress = error. Nayi file ka naam folder ke fsync se pakka hota hai."
    }
  ]
}
]);
})();
