/* First Principles — FAANG Senior Engineer.
   Source credit: The Physics of Software (dDOKu20juEc), numbered video 1/15.
   Evidence: docker-labs/45-software-physics/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "app", "icon": "🍽️", "label": "KhanaKart", "x": 140, "y": 105}, {"id": "path", "icon": "🛣️", "label": "raasta", "x": 445, "y": 105}, {"id": "data", "icon": "🗃️", "label": "data", "x": 750, "y": 105}];
const EDGES = [{"from": "app", "to": "path"}, {"from": "path", "to": "data"}];
VISUALS["fp-physics-code"] = { t: 'Pehle wait, kaam aur data ka raasta samjho. Phir design chuno.',
  html: SD.viz.svg(HERO, EDGES, {nodes:{app:{tone:'acc',badge:'sawaal pehle'},path:{tone:'slow',badge:'wait gino'},data:{tone:'ok',badge:'kaam gino'}}}, {w:890,h:215}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-physics-code",
  "icon": "💻",
  "group": "🧪 Physics of Software",
  "title": "Physics 3 · Code — calls ghataao ya wait overlap karo?",
  "badge": "Call Khoji",
  "objectives": [
    "Sequential loop mein wait exactly kahan hai?",
    "Bounded batch aur bounded parallel ka code kaise alag hai?",
    "Output order aur error handling kaise bache?",
    "Wahi functions ko real HTTP se kaise jodein?"
  ],
  "lesson": [
    "<h3>💻 await ko hata dein toh sab theek?</h3><p>Cache call ka wait dikha. Ab KhanaKart ko decide karna hai: ek request mein zyada keys, ya limited requests saath?</p><p>Wahi runnable code kholte hain jo lab ne use kiya.</p>"
  ],
  "stages": [
    {
      "type": "cards",
      "title": "🔍 Wahi helpers: ek-ek wait aur bounded batch",
      "goal": "lib/lookups.js ki actual lines. tools/slowmo.js aur tools/compare.js dono yahi functions import karte hain.",
      "steps": [
        {
          "title": "1. Loop mein wait kahan hai?",
          "say": "<code>for</code> ke andar <code>await get(key)</code> hai. Is key ka reply aayega tabhi next iteration chalega.",
          "line": "6-12",
          "ask": {
            "q": "Agle independent lookup ko yeh code kab shuru karta hai?",
            "choices": ["Previous reply await hone ke baad next lookup","Function entry par saare independent lookups saath","Function return ke baad callback next lookup start kare"],
            "answer": 0,
            "explain": "Shown loop mein await iteration ke andar hai, isliye starts sequential hain. Promise-all style concurrent start is code mein absent hai. Next iteration loop ke andar resume hoti hai, return ke baad nahi.",
            "hint": "Line 9 aur loop ka agla chakkar dekho."
          , choiceExplanations: ["Shown loop mein await iteration ke andar hai, isliye starts sequential hain.","Promise-all style concurrent start is code mein absent hai.","Next iteration loop ke andar resume hoti hai, return ke baad nahi."] }
        },
        {
          "title": "2. Batch ka size chhota aur valid kyun?",
          "say": "<code>checkLimit</code> zero, negative aur fractional size reject karta hai. Loop ko positive integer chahiye. Endpoint ki maximum batch limit bhi alag respect karni hai; HTTP lab endpoint max 4 keys leta hai.",
          "line": "13-16"
        },
        {
          "title": "3. Saari keys ek unlimited packet mein?",
          "say": "<code>slice(i, i + size)</code> har request ka bounded hissa banata hai. Aakhri hissa chhota reh sakta hai. Size 2 aur five keys par hisson ki ginti socho.",
          "line": 17,
          "ask": {
            "q": "5 independent keys, batch size 2. Requests?",
            "choices": ["3 requests; two full batches aur one partial batch","2 requests; final unmatched key skip hoti hai","5 requests; chunk length request count nahi badalti"],
            "answer": 0,
            "explain": "ceil(5 / 2) = 3 batches; final partial chunk ko bhi request milti hai. Partial last chunk drop karna intended complete result contract todta hai. Each bulk request multiple keys carry kar sakti hai.",
            "hint": "Aakhri ek key ko bhi reply chahiye."
          , choiceExplanations: ["ceil(5 / 2) = 3 batches; final partial chunk ko bhi request milti hai.","Partial last chunk drop karna intended complete result contract todta hai.","Each bulk request multiple keys carry kar sakti hai."] }
        },
        {
          "title": "4. Wait ab kis cheez ka hai?",
          "say": "<code>getMany(part)</code> ek hissa ek request mein leta hai. Agla hissa pichhle hissa ke reply ke baad. <code>...</code> values ko final list mein jodta hai. Keys ka input order endpoint ke output contract se match hona chahiye.",
          "line": "18-20"
        },
        {
          "title": "5. Failure aur consistency ka contract kahan?",
          "say": "Lookup fail ho toh helper reject karta hai; fake empty success nahi deta. Real endpoint par timeout, response size, missing keys aur partial errors ka contract tay karo. Ek batch request apne aap atomic snapshot nahi ban jaati.",
          "line": "13-21"
        }
      ],
      "lesson": "🎯 <b>Asli baat:</b> Batch request overhead share karta hai. Size limit, order aur failure contract phir bhi tumhari zimmedari hain.",
      "code": {
        "title": "lib/lookups.js",
        "file": "docker-labs/45-software-physics/lib/lookups.js",
        "from": 6,
        "text": "async function sequential(keys, get) {\n  const values = [];\n  for (const key of keys) {\n    values.push(await get(key));\n  }\n  return values;\n}\nasync function batched(keys, getMany, size = 4) {\n  checkLimit(size);\n  const values = [];\n  for (let i = 0; i < keys.length; i += size) {\n    const part = keys.slice(i, i + size);\n    values.push(...await getMany(part));\n  }\n  return values;\n}"
      }
    },
    {
      "type": "cards",
      "title": "🧵 Batch API nahi. Do requests saath chala sakte hain?",
      "goal": "lib/parallel.js ki actual lines. Concurrency overlap hai; batching alag operation hai.",
      "steps": [
        {
          "title": "1. Values kis order mein rakhni hain?",
          "say": "<code>values</code> ko input jitni jagah di. <code>next</code> agle unclaimed key ka index hai. Network replies alag order mein aa sakti hain.",
          "line": "2-5"
        },
        {
          "title": "2. Agla index do workers ko same mil jayega?",
          "say": "Har worker <code>next++</code> se index leta hai. Index lena <code>await</code> se pehle synchronous hota hai. Is single JavaScript event loop mein doosra worker baad mein next index lega. Yeh distributed lock nahi hai.",
          "line": "6-9"
        },
        {
          "title": "3. Har worker ke andar await kyun?",
          "say": "Ek worker apna lookup poora hone tak next key nahi leta. Do workers hain toh max do get calls in flight. Har reply apne original index par store hoti hai.",
          "line": "7-10",
          "ask": {
            "q": "Slow reply baad mein aayi. Output ko kaunsa order milega?",
            "choices": ["Input key order; result original index par aata","Completion order; fastest response pehle push hoti","Lexical key order; helper har run keys sort karta"],
            "answer": 0,
            "explain": "Helper original index retain karke out-of-order completion ke bawajood input order preserve karta hai. Push-on-completion this helper ka storage strategy nahi. Original index preserve karna lexical sort nahi.",
            "hint": "Line 9 par push nahi; indexed assignment hai."
          , choiceExplanations: ["Helper original index retain karke out-of-order completion ke bawajood input order preserve karta hai.","Push-on-completion this helper ka storage strategy nahi.","Original index preserve karna lexical sort nahi."] }
        },
        {
          "title": "4. Kitne workers bante hain?",
          "say": "<code>min(limit, keys.length)</code> workers. <code>Promise.all</code> yahan bounded workers par hai, saari keys par nahi. Request limit 2 ka matlab process ke is call mein max do concurrent lookups hai.",
          "line": "12-13"
        },
        {
          "title": "5. Calls kam hui ya bas overlap?",
          "say": "HTTP run mein parallel2 ne 12 items ke liye <b>12 calls</b> hi bheji. Peak 2 tha. Batch4 ne 3 calls bheji. Failure par outer promise reject hota hai; doosre workers baaki keys bhi le sakte hain. I/O cancellation ya fail-fast stop is helper mein nahi. Global/shared-service limits is local limit ke alag hain.",
          "line": "12-14",
          "ask": {
            "q": "Har incoming user max 2 requests kare. Kya poori service par bhi max 2 hi hongi?",
            "choices": ["Nahi; per-request caps multiple users mein add hote","Haan; local two-worker pool global semaphore hai","Haan; Promise.all incoming users ko serialize karta"],
            "answer": 0,
            "explain": "Two concurrent dependency calls per user multiplied by simultaneous users global offered concurrency badha sakti hai. Local function scope across requests coordination provide nahi karta. Promise.all global admission control nahi.",
            "hint": "Ek user aur poore fleet ki boundary alag hai."
          , choiceExplanations: ["Two concurrent dependency calls per user multiplied by simultaneous users global offered concurrency badha sakti hai.","Local function scope across requests coordination provide nahi karta.","Promise.all global admission control nahi."] }
        }
      ],
      "lesson": "🎯 <b>Asli baat:</b> Bounded parallelism wait overlap karta hai. Calls ki ginti aur shared dependency ka total load phir bhi gino.",
      "code": {
        "title": "lib/parallel.js",
        "file": "docker-labs/45-software-physics/lib/parallel.js",
        "from": 1,
        "text": "const { checkLimit } = require('./lookups');\nasync function parallel(keys, get, limit = 2) {\n  checkLimit(limit);\n  const values = new Array(keys.length);\n  let next = 0;\n  async function worker() {\n    while (next < keys.length) {\n      const i = next++;\n      values[i] = await get(keys[i]);\n    }\n  }\n  const n = Math.min(limit, keys.length);\n  await Promise.all(Array.from({ length: n }, worker));\n  return values;\n}"
      }
    },
    {
      "type": "cards",
      "title": "🔌 Apne app mein wire kaise karein?",
      "goal": "tools/mini.js ki actual lines. Five keys aur process-local Map; yeh HTTP timing test nahi. tools/compare.js same helpers ko HTTP functions deta hai.",
      "steps": [
        {
          "title": "1. Helper aur data source alag kyun?",
          "say": "Helpers import hue. Five known keys aur ek Map banayi. Helper ko storage ka naam nahi chahiye; helper ko function milta hai.",
          "line": "1-5"
        },
        {
          "title": "2. getMany ka contract kya?",
          "say": "Function keys ki list leta hai aur usi order mein values deta hai. <code>calls</code> har invocation par ek badhta hai. Is memory example mein artificial delay bhi nahi hai.",
          "line": "6-9"
        },
        {
          "title": "3. Five keys ko size 2 se bheja",
          "say": "<pre>batch2: 1,2,3,4,5 calls=3</pre>Actual run mein values 1..5 sab aayi. Batch size 2 ne requests 3 ki.",
          "line": "10-13"
        },
        {
          "title": "4. Wahi data one-key function se?",
          "say": "<code>one</code> ek key ko one-element list mein lapet kar value nikaalta hai. Ab bounded parallel helper ko one-key function milta hai.",
          "line": "14-16"
        },
        {
          "title": "5. Real HTTP par adapter kahan badlega?",
          "say": "<pre>parallel2: 1,2,3,4,5 calls=5</pre>Memory wiring mein parallel2 ne 5 one-key calls ki. Real HTTP compare mein <code>one</code> → <code>/one</code>, <code>many</code> → <code>/many</code>. Timeout aur non-2xx check <code>lib/util.js</code> mein hain. Next terminal run poora menu ka wall time naapta hai.",
          "line": "17-18"
        }
      ],
      "lesson": "🎯 <b>Asli baat:</b> App ki I/O functions inject karo. Same helper ko model, memory demo aur actual HTTP mein reuse karo.",
      "code": {
        "title": "tools/mini.js",
        "file": "docker-labs/45-software-physics/tools/mini.js",
        "from": 1,
        "text": "const { batched } = require('../lib/lookups');\nconst { parallel } = require('../lib/parallel');\nconst keys = ['thali', 'chai', 'roti', 'dal', 'lassi'];\nconst store = new Map(keys.map((key, i) => [key, i + 1]));\nlet calls = 0;\nasync function getMany(part) {\n  calls++;\n  return part.map(key => store.get(key));\n}\n(async () => {\n  const values = await batched(keys, getMany, 2);\n  console.log('batch2: ' + values.join(',') +\n    ' calls=' + calls);\n  calls = 0;\n  const one = async key => (await getMany([key]))[0];\n  const parallelValues = await parallel(keys, one, 2);\n  console.log('parallel2: ' + parallelValues.join(',') +\n    ' calls=' + calls);"
      }
    },
    {
      "type": "cards",
      "title": "📚 Real Redis mein yahi idea kaise milta hai?",
      "goal": "<a href=\"https://redis.io/docs/latest/develop/using-commands/pipelining/\" target=\"_blank\" rel=\"noopener\">Redis ki official documentation</a> se. Redis is lab mein chalaya nahi gaya. Hamara HTTP /many Redis pipeline nahi hai.",
      "steps": [
        {
          "title": "1. Har command ke reply ka wait zaroori?",
          "say": "Documentation ke mutabiq Redis pipelining mein kai commands bhej sakte ho bina har command ke reply ka wait kiye. Isse repeated request/reply waits aur socket I/O overhead ghatt sakte hain."
        },
        {
          "title": "2. Pipeline ko unlimited kyun na karein?",
          "say": "Server ko replies ke liye memory rakhni padti hai. Official docs bounded batches ki salah deti hain. Apne payloads aur client/service limits se size choose karo; is HTTP lab ki 4-key limit Redis ki default nahi hai."
        },
        {
          "title": "3. Kya pipeline data dependency hata deti hai?",
          "say": "Agar pehle read ke result se agla command banta hai, command abhi ready hi nahi. Pipelining is dependency ko apne aap solve nahi karti. Atomicity, consistency aur transaction guarantees bhi alag contract hain.",
          "ask": {
            "q": "Lab ka HTTP batch successful hua. Kya Redis production performance prove hui?",
            "choices": ["Nahi; HTTP lab measured, Redis process run nahi hua","Haan; cache label transport implementation same karta","Haan; key count Redis throughput directly measure karta"],
            "answer": 0,
            "explain": "Redis process/protocol run nahi hua; lab fixed-cost lesson demonstrate karta hai, Redis production claim nahi. Conceptual similarity implementation identity nahi. Request cardinality alone actual Redis performance sample nahi.",
            "hint": "Goal mein run ki boundary padho."
          , choiceExplanations: ["Redis process/protocol run nahi hua; lab fixed-cost lesson demonstrate karta hai, Redis production claim nahi.","Conceptual similarity implementation identity nahi.","Request cardinality alone actual Redis performance sample nahi."] }
        }
      ],
      "lesson": "🎯 <b>Asli baat:</b> Repeated wait ka idea products mein milta hai. API shape aur guarantees ko product docs se alag verify karo."
    },
    {
      "type": "docker",
      "title": "🌐 Real HTTP mein counts aur time dono dekho",
      "project": "45-software-physics",
      "exercise": "ex1-http",
      "goal": "Pehle memory wiring. Phir self-contained tool apna HTTP child shuru/stop karega. Har lookup request par artificial 40 ms wait hai; real WAN/Redis test nahi.",
      "why": "Node 18+ chahiye. Neeche ka output isi lab ke captures se hai. Docker compose abhi chalayi nahi gayi.",
      "steps": [
        {
          "text": "App root se tiny adapter example.",
          "cmd": "cd docker-labs/45-software-physics && node tools/mini.js",
          "expect": "batch2: 1,2,3,4,5 calls=3\nparallel2: 1,2,3,4,5 calls=5"
        },
        {
          "text": "Isi lab folder se actual HTTP compare; koi pehle se server nahi chahiye.",
          "cmd": "node tools/compare.js",
          "expect": "ASLI HTTP; server par artificial wait 40 ms/request; 12 items\nsequential: calls=12 items=12 peak=1 elapsed=518.0 ms\nbatch4: calls=3 items=12 peak=1 elapsed=129.0 ms\nparallel2: calls=12 items=12 peak=2 elapsed=255.6 ms"
        }
      ],
      "observe": {
        "q": "Parallel2 mein calls 12 aur batch4 mein 3 thi. Kya dono ne same cheez badli?",
        "choices": ["Parallel overlaps waits; batch reduces request count","Parallel reduces values; batch overlaps same calls","Parallel serializes keys; batch sends no replies"],
        "answer": 0,
        "explain": "Concurrency and aggregation different transformations hain: four-value batches fewer trips, parallelism overlapping trips. Parallel result contract values omit nahi karta. Bounded parallel starts overlap karte hain; batch bhi results return karta hai.",
        "hint": "Calls, items aur peak ko saath padho."
      , choiceExplanations: ["Concurrency and aggregation different transformations hain: four-value batches fewer trips, parallelism overlapping trips.","Parallel result contract values omit nahi karta.","Bounded parallel starts overlap karte hain; batch bhi results return karta hai."] },
      "lesson": "Capture mein exact milliseconds badal sakte hain. Values, calls, bounded peak aur run ki conditions compare karo."
    }
  ],
  "interview": {
    "title": "Interview Round — pehle raasta, phir tool",
    "instructions": "KhanaKart ka haal dekho. Phir wajah ke saath jawab chuno. 🎤",
    "questions": [
      {
        "q": "Bounded parallel mein output order kaise bachta hai?",
        "choices": ["Result ko original input index par assign karo","Har completed reply result array mein push karo","Har reply ko result array ke first slot par likho"],
        "answer": 0,
        "explain": "Index mapping output ordering ko completion timing se independent rakhti hai. Push completion order preserve karega, input order nahi. Same slot overwrite hone se values lose hongi.",
        "hint": "values[i] dekho."
      , choiceExplanations: ["Index mapping output ordering ko completion timing se independent rakhti hai.","Push completion order preserve karega, input order nahi.","Same slot overwrite hone se values lose hongi."] },
      {
        "q": "Batch size 4 hai. Endpoint max 2 keys allow karta hai. Kya helper ka default safe hai?",
        "choices": ["Nahi; batch ko endpoint max two ke andar rakho","Haan; client default endpoint validation override karta","Haan; two batches reject hon toh four keys drop karo"],
        "answer": 0,
        "explain": "Client chunk size API contract aur payload limits ke compatible honi chahiye. Server contract client default se change nahi hota. Silent omission success nahi; size fix/error handle chahiye.",
        "hint": "App aur endpoint ki limits match karo."
      , choiceExplanations: ["Client chunk size API contract aur payload limits ke compatible honi chahiye.","Server contract client default se change nahi hota.","Silent omission success nahi; size fix/error handle chahiye."] }
    ]
  },
  "success": [
    "Sequential wait ki actual line dikha sakte ho",
    "Partial batch aur bounded parallel wire kar sakte ho",
    "Input order aur failure propagation samajhte ho",
    "HTTP results ko Redis benchmark nahi kehte"
  ],
  "cards": [
    {
      "front": "Batch vs parallel?",
      "back": "Batch multiple keys ko ek request mein jodta hai. Parallel alag requests ka wait overlap karta hai."
    },
    {
      "front": "Promise.all hamesha unlimited?",
      "back": "Nahi. Is code mein Promise.all sirf bounded worker promises par hai, har key par nahi."
    },
    {
      "front": "Local concurrency cap global cap hai?",
      "back": "Nahi. Har incoming user/fleet instance ki calls jud sakti hain; shared budget alag chahiye."
    }
  ]
}
]);
})();
