/* =====================================================================
   🛡️ Playlist · 1 Resilience — topic: RANDOMNESS (chaar chhote levels)
     1 Kyun  → samasya pehle: purani jaankari + ek hi niyam = jhund (yeh file)
     2 Kaise → do sikke (do mein se behtar), aur LB ki apni taaza ginti
     3 Code  → chaaron tareeke asli code mein; NGINX aur Envoy mein wahi
     4 Kab   → sikka kahan uchhaalein, kahan nahi; wahi auzaar retries aur leader chunne mein
   Har number docker-labs/41-load-balancing ke asli run se hai (us folder ka README dekho): slow motion = tools/slowmo.js,
   asli raftaar = tools/algos.js (ex1). Leader chunne wale number docker-labs/09-raft se.
   Source video (credit): Software Developer Diaries — "The Secret Weapon Behind Resilient Distributed Systems".
   (Is video ka retries wala hissa Retries levels mein hai; Chaos Monkey wala hissa Chaos levels mein.)
   ===================================================================== */
(function () {

/* load balancer + teen servers */
const NODES = [
  { id: 'lb', icon: '🚦', label: 'load balancer', x: 160, y: 180 },
  { id: 's1', icon: '🖥️', label: 'S1', x: 690, y: 65 },
  { id: 's2', icon: '🖥️', label: 'S2', x: 690, y: 180 },
  { id: 's3', icon: '🖥️', label: 'S3', x: 690, y: 290 },
];
const EDGES = [{ from: 'lb', to: 's1' }, { from: 'lb', to: 's2' }, { from: 'lb', to: 's3' }];
const VIZ = { w: 890, h: 365, focus: ['s1', 's2', 's3'] };   // phone par servers hamesha dikhein; load balancer ki baat vars table mein hai
const jobs = n => (n ? Array.from({ length: n }, () => 'busy') : 'khaali');
const to = (s, label, tone) => [{ from: 'lb', to: s, label, tone: tone || 'acc' }];

VISUALS['rn-kyun'] = {
  t: 'LB ko S3 sabse khaali dikha — ek second purani jaankari se. Chaaron requests S3 par gayi',
  html: SD.viz.svg(NODES, EDGES, {
    nodes: { lb: { tone: 'slow', badge: 'dikha: S1 2 · S2 1 · S3 0' }, s1: { tone: 'idle', badge: 'asal mein: 1' }, s2: { tone: 'idle', badge: 'asal mein: 0 — khaali' }, s3: { tone: 'bad', badge: 'asal mein: 3' } },
    flows: [{ from: 'lb', to: 's3', label: '#1–#4', tone: 'bad' }],
  }, VIZ),
};

SD.registerLevels('sdd-resil', [
{
  id: 'rn-kyun',
  icon: '🎲',
  group: '🎲 Randomness',
  title: 'Randomness 1 · Kyun — sabse samajhdaar niyam, sabse lambi line',
  badge: 'Jhund Jasoos',
  objectives: [
    '"Har request sabse khaali server ko bhejo" — yeh niyam ek server par dher kaise laga deta hai?',
    'Do servers khaali baithe the. Load balancer ko yeh kyun nahi dikha?',
    'Jaankari dekhna hi band kar dein (baari-baari) toh kya sudharta hai — aur kya bigadta hai?',
    'Load balancer, round robin, least loaded, herding: kaunsa naam kis cheez ka hai?',
  ],
  lesson: [
    `<h3>🚦 "Sabse khaali ko bhejo" — isme galat kya ho sakta hai?</h3>
     <p>KhanaKart ki <b>menu-service</b> teen servers par chalti hai. Teeno servers ke aage ek <b>load balancer</b> khada hai: har request ko teen mein se ek server par bhejta hai.</p>
     <p>Team ne load balancer ko sabse samajhdaar lagne wala niyam diya: <b>"har request us server ko bhejo jis par abhi sabse kam kaam hai."</b> Servers har second apna haal load balancer ko bhejte hain.</p>
     <p>Shukravaar dopahar menu kabhi turant khulta hai, kabhi der se. Dashboard ajeeb hai: ek server par dher laga hai, aur baaki do lagbhag khaali baithe hain. Agle second dher kisi doosre server par hai.</p>
     <pre>lab, asli raftaar (5 servers, 300 requests/second, teen run):
"sabse khaali ko bhejo", jaankari 0.5 s purani  → ek server ki line 92–106 tak
"baari-baari", koi jaankari nahi               → line 8–9 tak</pre>
     <p>Jis niyam ke paas jaankari thi, usi niyam ne bina jaankari wale niyam se kai guna lambi line banayi.</p>
     <p class="tip">👉 Agle screen par wahi dopahar slow motion mein: teen servers, har 0.25 second par ek request. Dekho ki load balancer ko kya dikhta hai — aur asal mein kya ho raha hai.</p>`,
  ],
  stages: [
    /* ---------------- 1. samasya: jhund ---------------- */
    {
      type: 'dryrun',
      title: '🔍 Slow motion — sabse khaali ko bhejo',
      goal: 'Har click = ek ghatna. Do cheezein saath-saath dekho: <b>load balancer ko kya dikh raha hai</b>, aur <b>asal mein har server par kitna kaam hai</b>.',
      nodes: NODES, edges: EDGES, viz: VIZ,
      vars: [
        { id: 'seen', label: 'Load balancer ko dikh raha hai' },
        { id: 'age', label: 'Yeh jaankari kitni purani hai' },
        { id: 's1', label: 'S1 par asal mein' },
        { id: 's2', label: 'S2 par asal mein' },
        { id: 's3', label: 'S3 par asal mein' },
      ],
      steps: [
        {
          clock: 'shuruaat',
          say: 'Teen servers: S1, S2, S3. Har server ek waqt mein <b>ek</b> request karta hai, aur ek request par <b>0.6 second</b> lagta hai. Baaki requests us server ki line mein khadi rehti hain.<br><br>Requests har <b>0.25 second</b> par aati hain. Shuru mein S1 par 2 kaam hain, S2 par 1, S3 khaali.<br><br>Servers <b>har 1 second</b> par load balancer ko apna haal bhejte hain.',
          nodes: { lb: { tone: 'ok', badge: 'niyam: sabse khaali ko' }, s1: { tone: 'busy', badge: '2 kaam' }, s2: { tone: 'busy', badge: '1 kaam' }, s3: { tone: 'idle', badge: 'khaali' } },
          vars: { seen: '—', age: '—', s1: jobs(2), s2: jobs(1), s3: jobs(0) },
        },
        {
          clock: '0.00 s',
          say: 'Servers ne haal bheja: <b>S1 2 · S2 1 · S3 0</b>. Usi pal request <b>#1</b> aayi. Sabse khaali S3 hai → #1 S3 par.<br><br>Sahi faisla.',
          flows: to('s3', '#1', 'ok'),
          nodes: { lb: { tone: 'ok', badge: 'dikha: S1 2 · S2 1 · S3 0' }, s3: { tone: 'busy', badge: '1 kaam' } },
          vars: { seen: 'S1 2 · S2 1 · <b>S3 0</b>', age: 'abhi aayi', s3: jobs(1) },
        },
        {
          clock: '0.25 s',
          say: 'Request <b>#2</b> aayi. Servers agla haal 1.00 s par bhejenge. Tab tak load balancer ke paas wahi purana haal hai.',
          nodes: { lb: { tone: 'slow', badge: 'dikha: S1 2 · S2 1 · S3 0' } },
          vars: { age: '0.25 s purani' },
          ask: {
            q: 'Load balancer ko abhi bhi dikh raha hai: S1 2 · S2 1 · S3 0. Asal mein S3 par ab 1 kaam hai. #2 kahan jaayegi?',
            choices: [
              'S3 par — load balancer ke hisaab se S3 abhi bhi khaali hai',
              'S2 par — ab S2 aur S3 barabar hain',
              'S1 par — baari S1 ki hai',
              'Kahin nahi — load balancer naye haal ka intezaar karega',
            ],
            answer: 0,
            hint: 'Load balancer faisla kis par karta hai: jo asal mein hai, ya jo use dikh raha hai?',
            explain: 'Load balancer ko apni hi bheji hui #1 ka pata nahi. Load balancer ko sirf servers ka bheja haal dikhta hai, aur yeh haal 0.25 s purana hai. Slow motion ki line: <code>#2 → S3 (LB ko dikha: S1 2 · S2 1 · S3 0) asal mein ab: S1 2 · S2 1 · S3 2</code>',
          },
        },
        {
          clock: '0.50–0.75 s',
          say: '<b>#3</b> aur <b>#4</b> bhi S3 par. Load balancer ko ab bhi "S3 0" hi dikh raha hai.<br><br>Asal mein: S3 par <b>3 kaam</b>. S2 apna kaam 0.6 s par khatam kar chuka — <b>S2 khaali baitha hai</b>. S1 par bas 1 bacha hai.',
          flows: to('s3', '#3 #4', 'bad'),
          nodes: { lb: { tone: 'slow', badge: 'dikha: S1 2 · S2 1 · S3 0' }, s1: { tone: 'ok', badge: '1 kaam' }, s2: { tone: 'idle', badge: 'khaali baitha hai' }, s3: { tone: 'bad', badge: '3 kaam' } },
          vars: { age: '0.75 s purani', s1: jobs(1), s2: jobs(0), s3: jobs(3) },
        },
        {
          clock: '1.00 s',
          say: 'Naya haal aaya: <b>S1 1 · S2 0 · S3 3</b>. Ab load balancer ko pata chala ki S3 bhara hai aur S2 khaali.',
          nodes: { lb: { tone: 'ok', badge: 'dikha: S1 1 · S2 0 · S3 3' } },
          vars: { seen: 'S1 1 · <b>S2 0</b> · S3 3', age: 'abhi aayi' },
          ask: {
            q: 'Agle ek second mein chaar requests aayengi: #5, #6, #7, #8. Yeh kahan jaayengi?',
            choices: [
              'Chaaron S2 par — ab S2 sabse khaali dikh raha hai, aur agle ek second tak yahi dikhega',
              'Ek-ek karke S1, S2, S3, S1 par',
              'Do S1 par, do S2 par',
              'Chaaron S3 par — S3 ki aadat pad gayi hai',
            ],
            answer: 0,
            hint: 'Pichhle second mein kya hua tha, jab S3 sabse khaali dikh raha tha?',
            explain: 'Wahi galti, doosre server par. Slow motion: #5, #6, #7, #8 → S2. 1.75 s par asal mein: <code>S1 0 · S2 3 · S3 2</code>.',
          },
        },
        {
          clock: '1.00–2.75 s',
          say: '#5 se #8: chaaron <b>S2</b> par. 2.00 s par naya haal: S1 0 · S2 3 · S3 1 → #9 se #12: chaaron <b>S1</b> par.<br><br>Dher ghoom raha hai: S3 → S2 → S1 → phir S3. Har second ek server par chaar ka dher lagta hai, aur baaki do apna purana kaam nipta ke khaali baith jaate hain.',
          flows: to('s1', '#9–#12', 'bad'),
          nodes: { lb: { tone: 'slow', badge: 'dikha: S1 0 · S2 3 · S3 1' }, s1: { tone: 'bad', badge: '3 kaam' }, s2: { tone: 'busy', badge: '2 kaam' }, s3: { tone: 'idle', badge: 'khaali' } },
          vars: { seen: '<b>S1 0</b> · S2 3 · S3 1', age: '0.75 s purani', s1: jobs(3), s2: jobs(2), s3: jobs(0) },
        },
        {
          clock: 'nateeja',
          say: `24 requests ka hisaab:
            <ul>
              <li>Har server ko mili: <b>8 · 8 · 8</b>. Ginti mein bilkul barabar.</li>
              <li>Ek request ka kaam 0.6 second ka hai. Par ek request ka ausat samay <b>1.13 s</b> raha, aur sabse lamba <b>1.65 s</b>.</li>
            </ul>
            Barabar ginti ka matlab barabar bojh nahi. Har server ko 8 requests <b>chaar-chaar ke dher</b> mein mili.`,
          nodes: { lb: { tone: 'slow', badge: 'har second ek naya "sabse khaali"' }, s1: { tone: 'ok', badge: '8 requests' }, s2: { tone: 'ok', badge: '8 requests' }, s3: { tone: 'ok', badge: '8 requests' } },
          vars: { seen: 'har second badalta hai', age: '0 se 1 s', s1: '8 requests, chaar-chaar ke dher mein', s2: '8 requests, chaar-chaar ke dher mein', s3: '8 requests, chaar-chaar ke dher mein' },
        },
        {
          clock: 'asli raftaar',
          say: `Lab mein wahi niyam asli raftaar par: 5 servers, <b>300 requests/second</b>. Servers har 0.5 second par haal bhejte hain. Aadhe second mein ~150 requests aati hain — aur sab ko wahi "sabse khaali" server dikhta hai.
            <ul>
              <li>Ek server ki line <b>92–106</b> tak pahunchi.</li>
              <li>Sabse dheemi 1% requests ko <b>629–1,060 ms</b> lage (teen run). (Bina line ke sabse dheemi 1% ko ~204 ms lagte hain: lab ki 10% requests khud hi 200 ms ki hain.)</li>
            </ul>
            Teen run mein line: 106 · 92 · 93.`,
          nodes: { lb: { tone: 'slow', badge: 'lab: jaankari 0.5 s purani' }, s1: { tone: 'idle', badge: '' }, s2: { tone: 'bad', badge: 'lab: line 92–106' }, s3: { tone: 'idle', badge: '' } },
          flows: to('s2', '~150', 'bad'),
          vars: { seen: 'lab: 0.5 s purana haal', age: 'lab: 0 se 0.5 s', s1: 'lab: 5 servers', s2: 'lab: ek ki line 92–106', s3: 'lab: sabse dheemi 1% → 629–1,060 ms' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> jab bahut saare faisle <b>ek hi purani jaankari</b> par <b>ek hi niyam</b> se liye jaate hain, toh sab ek hi jagah pahunchte hain. "Sabse achha" chunna tab ulta padta hai jab sab wahi chunein.<br>Is bheed ka naam: <b>herding</b> (jhund).',
    },

    /* ---------------- 2. pehla ilaaj: jaankari dekho hi mat ---------------- */
    {
      type: 'dryrun',
      title: '🔁 Pehla ilaaj: jaankari dekho hi mat — aadha kaam',
      goal: 'Wahi teen servers, wahi requests. Load balancer ka niyam badal gaya hai. Dekho kya sudhra — aur ek dheema server aate hi kya hua.',
      nodes: NODES, edges: EDGES, viz: VIZ,
      vars: [
        { id: 'rule', label: 'Load balancer ka niyam' },
        { id: 'avg', label: 'Ek request ka ausat samay' },
        { id: 'worst', label: 'Sabse lamba' },
        { id: 's3', label: 'S3 par asal mein' },
      ],
      steps: [
        {
          clock: 'pichhli baar',
          say: 'Pichhli baar "sabse khaali ko bhejo" ne dher ghumaya: ausat 1.13 s, sabse lamba 1.65 s. Tum is team mein ho. Sujhaav aata hai: <b>"Purani jaankari se toh bina jaankari achha. Baari-baari bhejo: S1, S2, S3, S1, S2, S3…"</b>',
          nodes: { lb: { tone: 'ok', badge: 'niyam: baari-baari' }, s1: { tone: 'busy', badge: '2 kaam' }, s2: { tone: 'busy', badge: '1 kaam' }, s3: { tone: 'idle', badge: 'khaali' } },
          vars: { rule: 'sabse khaali ko (purani jaankari)', avg: '1.13 s', worst: '1.65 s', s3: jobs(0) },
          ask: {
            q: 'Baari-baari se kya badlega?',
            choices: [
              'Dher khatam: koi server lagataar chaar requests nahi paayega. Par load balancer ab kisi server ka haal dekhega hi nahi',
              'Kuch nahi badlega — dher phir bhi lagega',
              'Har request sabse khaali server par jaayegi',
              'Requests kam ho jaayengi',
            ],
            answer: 0,
            hint: 'Baari-baari mein ek server ko agli request kab milti hai? Aur kya is niyam ko load ki zaroorat hai?',
            explain: 'Har server ko har teesri request milti hai: 0.75 second mein ek. Kaam 0.6 second ka hai, toh server ke paas saans lene ki jagah hai. Par niyam andha hai.',
          },
        },
        {
          clock: '0.00 s',
          say: 'Request #1 → <b>S1</b>: baari S1 ki thi. S1 par pehle se 2 kaam the; S3 khaali baitha tha.<br><br>#1 ko <b>1.80 s</b> lage — poore run mein sabse lamba.',
          flows: to('s1', '#1', 'slow'),
          nodes: { s1: { tone: 'bad', badge: '3 kaam' }, s3: { tone: 'idle', badge: 'khaali baitha hai' } },
          vars: { rule: 'baari-baari (koi jaankari nahi)', avg: '—', worst: '1.80 s (#1)' },
        },
        {
          clock: '6 s ka nateeja',
          say: `Uske baad sab theek chala. Har server ko 8 requests, aur har ek ko nayi request 0.75 second ke fasle par mili.
            <div class="dr-scroll"><table>
              <tr><th>Niyam</th><th>Ausat samay</th><th>Sabse lamba</th></tr>
              <tr><td>Sabse khaali ko (purani jaankari)</td><td>1.13 s</td><td>1.65 s</td></tr>
              <tr><td>Baari-baari</td><td><b>0.85 s</b></td><td>1.80 s</td></tr>
            </table></div>
            Ausat sudhar gaya. Bina kisi jaankari ke.`,
          nodes: { lb: { tone: 'ok', badge: 'baari-baari' }, s1: { tone: 'ok', badge: '8 requests' }, s2: { tone: 'ok', badge: '8 requests' }, s3: { tone: 'ok', badge: '8 requests' } },
          vars: { avg: '0.85 s', worst: '1.80 s', s3: jobs(1) },
        },
        {
          clock: 'ek din baad',
          say: 'Ek din S3 ki disk kharab hone lagi. S3 ab har request par <b>1.8 second</b> lagata hai — teen guna.',
          nodes: { s3: { tone: 'slow', badge: 'teen guna dheema' } },
          vars: { rule: 'baari-baari · S3 teen guna dheema', avg: '—', worst: '—' },
          ask: {
            q: 'Baari-baari ab S3 ko kitna hissa dega?',
            choices: [
              'Utna hi — har teesri request. Baari-baari ko pata hi nahi ki S3 dheema hai',
              'Kam — baari-baari dheeme server ko pehchaan leta hai',
              'Kuch nahi — S3 ko apne aap hata diya jaayega',
              'Zyada — taaki S3 jaldi kaam nipta sake',
            ],
            answer: 0,
            hint: 'Baari-baari kya-kya dekhta hai? (Pichhle sawaal ka jawab yaad karo.)',
            explain: 'S3 ko har 0.75 second par ek request milti rahi, jabki S3 ko ek request mein 1.8 second lagte hain. Line sirf badh sakti hai.',
          },
        },
        {
          clock: '0.50–5.75 s',
          say: 'S3 par kaam: 0.50 s par 1 · 1.25 s par 2 · 2.00 s par 3 · 3.50 s par 4 · 5.00 s par 5 · 5.75 s par <b>6</b>.<br><br>S1 aur S2 is beech aaraam se chal rahe hain: S1 par 1 se 3 kaam, S2 par 1 se 2.',
          flows: to('s3', 'har 3ri', 'bad'),
          nodes: { lb: { tone: 'slow', badge: 'baari-baari · andha' }, s1: { tone: 'ok', badge: '1–3 kaam' }, s2: { tone: 'ok', badge: '1–2 kaam' }, s3: { tone: 'bad', badge: '6 kaam, badh rahe' } },
          vars: { s3: jobs(6) },
        },
        {
          clock: '8 s ka nateeja',
          say: `<ul>
              <li>S3 ko 24 mein se <b>8</b> requests mili — barabar hissa.</li>
              <li>Sabse lambi request: <b>4.95 s</b> (kaam 0.6 s ka tha).</li>
              <li>8 second par S3 ki <b>4 requests abhi bhi adhoori</b>.</li>
            </ul>`,
          nodes: { s3: { tone: 'bad', badge: '4 adhoori · sabse lamba 4.95 s' } },
          vars: { avg: '1.46 s', worst: '4.95 s', s3: '8 requests mili · 4 abhi bhi adhoori' },
        },
        {
          clock: 'asli raftaar',
          say: `Lab mein wahi: 5 servers, ek teen guna dheema, 300 requests/second, 8 second.
            <ul>
              <li>Baari-baari ne dheeme server ko barabar hissa diya: <b>480</b> requests — utni hi jitni baaki har server ko.</li>
              <li>Dheeme server ki line: <b>91–113</b> (teen run).</li>
              <li>Sabse dheemi 1% requests: <b>1.8–3.0 second</b>.</li>
            </ul>
            "Koi bhi ek" (random) ka haal bhi yahi: line 139–152.`,
          nodes: { lb: { tone: 'slow', badge: 'lab: baari-baari' }, s1: { tone: 'ok', badge: '' }, s2: { tone: 'ok', badge: '' }, s3: { tone: 'bad', badge: 'lab: line 91–113' } },
          vars: { rule: 'lab: baari-baari, ek server dheema', avg: '—', worst: 'lab: sabse dheemi 1% → 1.8–3.0 s', s3: 'lab: dheeme server ki line 91–113' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> jaankari na dekhne se jhund nahi banta — par load balancer andha ho jaata hai: bhare ya dheeme server ko bhi barabar hissa.<br>Chahiye kuch aisa jo jaankari <b>dekhe</b>, par jisme sab ek hi "sabse achha" na chunein. Agla level isi ka hai.',
    },

    /* ---------------- 3. idea: toll plaza ---------------- */
    {
      type: 'cards',
      title: '🛣️ Yeh tum dekh chuke ho — toll plaza ki lanes',
      goal: 'Chaar chhote cards. Har card ek hi sawaal ka jawab deta hai. Naam sabse aakhir mein aayenge.',
      steps: [
        {
          title: '1. "Lane 7 khaali hai" sunke kya hota hai?',
          say: 'Highway ka toll plaza, 12 lanes. Radio par announcement hota hai: <b>"Lane 7 khaali hai."</b><br><br>Announcement sabne suna. Sab lane 7 ki taraf mud gaye. Do minute mein lane 7 sabse lambi hai — aur lane 6 aur 8 khaali pade hain.<br><br><b>KhanaKart mein:</b> announcement = servers ka bheja haal · gaadiyan = requests · "sab lane 7 mein" = chaaron requests S3 par.',
        },
        {
          title: '2. Announcement band kar dein toh?',
          say: 'Toll wale announcement band kar dete hain. Ab ek aadmi gate par khada hai: "tum lane 1, tum lane 2, tum lane 3…"<br><br>Yeh theek chalta hai — jab tak lane 3 ka booth wala dheema na ho. Tab bhi har teesri gaadi lane 3 mein bheji jaati hai, aur lane 3 ki line highway tak pahunch jaati hai.<br><br><b>KhanaKart mein:</b> yahi baari-baari tha. Dheeme S3 ko barabar hissa mila: sabse lambi request 4.95 s.',
        },
        {
          title: '3. Log asal mein kya karte hain?',
          say: 'Socho tum khud toll par pahunche ho. Na koi announcement hai, na gate wala aadmi.',
          ask: {
            q: 'Tum lane kaise chunte ho?',
            choices: [
              'Saamne ki do-teen lanes par nazar daalte ho, aur jo lane chhoti dikhe, usi lane mein chale jaate ho',
              'Gaadi rok ke baarah ki baarah lanes ginte ho, phir sabse chhoti mein jaate ho',
              'Hamesha lane 1 mein',
              'Aankh band karke koi bhi lane',
            ],
            answer: 0,
            hint: 'Baarah lanes ginne mein kitna waqt lagega? Aur aankh band karke jaane mein kya khatra hai?',
            explain: 'Har driver apne saamne ki <b>alag</b> do lanes dekhta hai. Isliye sab ek hi lane mein nahi pahunchte — aur phir bhi koi lambi lane mein nahi jaata. Agla level isi tareeke ka hai.',
          },
        },
        {
          title: '4. In cheezon ke naam',
          say: `<div class="dr-scroll"><table>
              <tr><th>Jo dekha</th><th>Naam</th></tr>
              <tr><td>Jo har request ko kisi ek server par bhejta hai</td><td><b>Load balancer</b></td></tr>
              <tr><td>Baari-baari: S1, S2, S3, S1…</td><td><b>Round robin</b></td></tr>
              <tr><td>Koi bhi ek server, bina kuch dekhe</td><td><b>Random</b></td></tr>
              <tr><td>Jis server par sabse kam kaam ho, usi server ko bhejo</td><td><b>Least loaded</b> (load ki ginti connections se ho toh <b>least connections</b>)</td></tr>
              <tr><td>Purani jaankari par sab ka ek hi jagah pahunchna</td><td><b>Herding</b></td></tr>
            </table></div>
            ⚠️ <b>Ek aam galatfehmi:</b> "Random sabse achha tareeka hai." Random jhund nahi banata, yeh sach hai. Par random bhi andha hai: dheeme server ko barabar hissa deta hai. Lab mein ek dheeme server ke saath random ki line: 139–152.`,
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> do alag galtiyan hain. <b>Andha hona</b> (baari-baari, random): bhare ya dheeme server ko barabar hissa. <b>Jhund</b> (purani jaankari se "sabse khaali"): sab ek hi server par. Achha tareeka dono se bachta hai.',
    },

    /* ---------------- 4. naam pakke karo ---------------- */
    {
      type: 'match',
      title: 'Jo ho raha hai, uska naam',
      instructions: 'Baayein taraf jo ho raha hai, daayein taraf uska naam.',
      pairs: [
        { left: 'Requests S1, S2, S3, S1, S2, S3 par jaati hain — koi haal nahi dekha jaata', right: 'Round robin', explain: 'Baari-baari. Slow motion: ausat 0.85 s. Par dheeme S3 ko bhi har teesri request: sabse lamba 4.95 s.' },
        { left: 'Load balancer us server ko bhejta hai jis par sabse kam kaam dikh raha hai', right: 'Least loaded', explain: 'Achha tab, jab jaankari taaza ho. Purani jaankari par yahi niyam jhund banata hai.' },
        { left: 'Ek second purana haal: "S3 khaali". Chaaron requests S3 par', right: 'Herding', explain: 'Purani jaankari + sab par ek hi niyam. Lab: ek server ki line 92–106 tak.' },
        { left: 'Load balancer sikka uchhaal ke koi bhi server chun leta hai', right: 'Random', explain: 'Jhund nahi banata, par andha hai. Lab: ek dheeme server ke saath line 139–152.' },
        { left: 'Teen servers ke aage khada, har request ko ek server par bhejne wala', right: 'Load balancer', explain: 'Asli duniya mein NGINX, Envoy, HAProxy, ya cloud ka load balancer.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — samasya samjhao',
    instructions: 'Interviewer yahan "kyun" sunna chahta hai, naam nahi. 🎤',
    questions: [
      {
        q: '"Hamara load balancer har server ka CPU dekh ke sabse khaali server ko bhejta hai. Phir bhi graph mein ek server spike karta hai, phir doosra, phir teesra. Kyun?"',
        choices: [
          'CPU ki jaankari kuch der purani hoti hai. Us beech aayi saari requests ko wahi "sabse khaali" server dikhta hai, toh sab usi server par jaati hain. Agli jaankari mein wahi server bhara dikhta hai, aur dher agle server par chala jaata hai. Ilaaj: load balancer ki apni taaza ginti, ya do random servers mein se behtar',
          'Servers ke CPU alag-alag company ke hain',
          'Load balancer mein bug hai; restart karo',
          'Requests ka size alag-alag hai',
        ],
        answer: 0,
        explain: 'Slow motion: #1–#4 → S3, #5–#8 → S2, #9–#12 → S1. Lab: 0.5 s purani jaankari par ek server ki line 92–106; baari-baari mein 8–9.',
      },
      {
        q: '"Round robin sabse simple hai aur requests barabar baant-ta hai. Use hi rakh lein?"',
        choices: [
          'Tab theek, jab saare servers ek jaise hon aur requests lagbhag ek jaisi. Round robin ginti barabar karta hai, bojh nahi: ek dheema server ho toh dheeme server ko bhi barabar hissa milta hai, aur dheeme server ki line badhti jaati hai',
          'Haan — barabar ginti hi sabse zaroori hai',
          'Nahi — round robin hamesha galat hai',
          'Round robin sirf do servers ke liye hai',
        ],
        answer: 0,
        explain: 'Lab: ek server teen guna dheema → round robin ne dheeme server ko phir bhi 480 requests di; dheeme server ki line 91–113, sabse dheemi 1% requests 1.8–3.0 s.',
      },
    ],
  },
  success: [
    'Bata sakte ho ki "sabse khaali ko bhejo" purani jaankari par dher kaise banata hai',
    'Andhe tareeke (baari-baari, random) kya bachate hain aur kahan haarte hain — number ke saath',
    'Load balancer, round robin, random, least loaded aur herding ko pehchaan sakte ho',
  ],
  cards: [
    { front: 'Herding (jhund) kab banta hai?', back: 'Jab bahut saare faisle ek hi <b>purani</b> jaankari par ek hi niyam se hote hain. Slow motion: 1 s purana haal → #1–#4 sab S3 par. Lab: 0.5 s purana haal → ek server ki line 92–106.' },
    { front: 'Barabar ginti = barabar bojh?', back: 'Nahi. Slow motion: har server ko 8 requests, par chaar-chaar ke dher mein → ausat 1.13 s (kaam 0.6 s ka).' },
    { front: 'Baari-baari (round robin) kahan haarta hai?', back: 'Jab servers ya requests ek jaisi na hon. Slow motion: dheeme S3 ko barabar hissa → sabse lamba 4.95 s. Lab: line 91–113.' },
    { front: 'Do alag galtiyan?', back: '<b>Andha hona</b> (round robin, random): bhare/dheeme ko barabar hissa. <b>Jhund</b> (purani jaankari se least loaded): sab ek hi par. Achha tareeka dono se bachta hai.' },
  ],
},
]);

})();
