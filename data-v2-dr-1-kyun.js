/* =====================================================================
   🛡️ Playlist · 1 Resilience — topic: DISASTER RECOVERY (paanch chhote levels)
     1 Kyun    → samasya pehle: region gaya, backup tha — phir bhi orders der tak fail, aur kuch "ho gaya" wale kho gaye (yeh file)
     2 Kaise   → doosre region mein kya chalu rakhein; "ho gaya" pehle ya copy pehle; purana pata; galti bhi copy hoti hai
     3 Code    → jis line par data khota hai (lib/replicator.js), router ka faisla (lib/failover.js)
     4 Library → AWS mein yahi chaar tareeke (documentation se)
     5 Kab     → kaunsa tareeka, kis keemat par; naapi hui galtiyan; sach ya galatfehmi
   Har number docker-labs/40-disaster-recovery ke asli run se hai (us folder ka README dekho): slow motion = tools/slowmo.js,
   asli raftaar = tools/dr.js (ex1). Lab mein samay chhota kiya gaya hai (asli duniya ke ghante = lab ke second); kram asli hai.
   Source video (credit): Software Developer Diaries — "This architecture will save your system.. here's how".
   ===================================================================== */
(function () {

/* router → region A (asli) / region B (bachav) · A → S3 (backup) */
const NODES = [
  { id: 'rt', icon: '🧭', label: 'router', x: 130, y: 180 },
  { id: 'a', icon: '🏙️', label: 'region A', x: 445, y: 80 },
  { id: 'b', icon: '🏝️', label: 'region B', x: 445, y: 280 },
  { id: 's3', icon: '🗄️', label: 'backup', x: 750, y: 180, kind: 'db' },
];
const EDGES = [{ from: 'rt', to: 'a' }, { from: 'rt', to: 'b' }, { from: 'a', to: 's3' }, { from: 's3', to: 'b' }, { from: 'a', to: 'b', dashed: true }];
const VIZ = { w: 890, h: 365, focus: ['a', 'b', 's3'] };   // phone par dono region aur backup hamesha dikhein; router ki baat vars table mein hai

VISUALS['dr-kyun'] = {
  t: 'Region A gaya. Backup mein sirf #1–#6 the. #7, #8, #9 ko "ho gaya" mil chuka tha — yeh teeno sirf A mein the',
  html: SD.viz.svg(NODES, EDGES, {
    nodes: { rt: { tone: 'slow', badge: 'A se jawab nahi' }, a: { tone: 'bad', badge: 'gaya · #7–#9 saath' }, b: { tone: 'idle', badge: 'kuch nahi chal raha' }, s3: { tone: 'ok', badge: '#1–#6' } },
    flows: [{ from: 'rt', to: 'a', label: '#10 ✗', tone: 'bad' }],
  }, VIZ),
};

SD.registerLevels('sdd-resil', [
{
  id: 'dr-kyun',
  icon: '🌋',
  group: '🌋 Disaster Recovery',
  title: 'Disaster Recovery 1 · Kyun — backup tha, phir bhi orders gaye',
  badge: 'Aafat Jasoos',
  objectives: [
    'Region A gaya. Backup tha. Phir orders itni der tak fail kyun hote rahe?',
    'Jin grahakon ko "ho gaya" dikha tha, unme se kuch ke orders kahan gaye?',
    'Lagataar copy se kya sudharta hai — aur kya phir bhi rehta hai?',
    'RTO, RPO, failover, backup, replication: kaunsa naam kis cheez ka hai?',
  ],
  lesson: [
    `<h3>🌋 "Backup toh hai" — par do sawaalon ka jawab kisi ke paas nahi tha</h3>
     <p>KhanaKart ka poora system ek hi <b>region</b> mein chalta hai: region A. (Region = cloud ka ek sheher, jahan tumhari machines rakhi hain.) Ek doosra region bhi hai, region B — "aafat ke liye".</p>
     <p>Bachav ka intezaam: region A har thodi der mein orders ka <b>backup</b> ek doosri jagah rakh deta hai. Team befikar thi: "backup toh hai."</p>
     <p>Ek din region A poora chala gaya. (Bijli, network, aag — wajah koi bhi ho.) Subah ka hisaab:</p>
     <pre>lab, asli raftaar (50 orders/second, teen run; lab ke second = asli duniya ke ghante):
orders fail hote rahe                    16.3–16.4 second tak — 680–689 orders
"ho gaya" dikha tha, par order kho gaya   50 orders</pre>
     <p>Do sawaal, jinka jawab aafat se pehle kisi ne nahi likha tha: <b>kitni der tak band rahenge?</b> Aur: <b>kitne orders kho denge?</b></p>
     <p class="tip">👉 Agle screen par wahi din slow motion mein: har 0.5 second par ek order. Do cheezein dekhte rehna — har order <b>kahan-kahan</b> rakha hai, aur router orders ko <b>kahan bhej raha hai</b>.</p>`,
  ],
  stages: [
    /* ---------------- 1. samasya: sirf backup ---------------- */
    {
      type: 'dryrun',
      title: '🔍 Slow motion — region A gaya, aur sirf backup tha',
      goal: 'Har click = ek ghatna. Teen cheezein dekho: <b>order kahan-kahan rakha hai</b>, <b>router kise bhej raha hai</b>, aur <b>grahak ko kya dikha</b>.',
      nodes: NODES, edges: EDGES, viz: VIZ,
      vars: [
        { id: 'a', label: 'Region A mein orders' },
        { id: 's3', label: 'Backup mein orders' },
        { id: 'only', label: 'Sirf A mein (backup tak nahi pahunche)' },
        { id: 'rt', label: 'Router orders kahan bhej raha hai' },
        { id: 'ord', label: 'Is order ka kya hua' },
      ],
      steps: [
        {
          clock: 'shuruaat',
          say: `Har 0.5 second par ek order aata hai. <b>Router</b> har order ko region A par bhejta hai. Region A order rakh leta hai aur grahak ko kehta hai: <b>"ho gaya"</b>.<br><br>
            Bachav ke do intezaam:
            <ul>
              <li>Region A har <b>3 second</b> par apne orders ka backup ek doosri jagah bhejta hai.</li>
              <li>Router har 0.5 second par region A se poochhta hai "theek ho?". Lagataar <b>3 baar</b> jawab na aaye, toh router saare orders region B par bhejne lagta hai.</li>
            </ul>
            Region B mein aam din <b>kuch nahi chalta</b>. Zaroorat padi, tab banega.`,
          nodes: { rt: { tone: 'ok', badge: 'sab A par' }, a: { tone: 'ok', badge: 'chal raha hai' }, b: { tone: 'idle', badge: 'kuch nahi chal raha' }, s3: { tone: 'idle', badge: 'khaali' } },
          vars: { a: '0', s3: '0', only: '0', rt: 'region A', ord: '—' },
        },
        {
          clock: '0.00–3.00 s',
          say: 'Orders #1 se #6: sab region A par, sab ko "ho gaya".<br><br>3.00 s par backup chala: <b>#1–#6</b> backup mein pahunch gaye.',
          flows: [{ from: 'a', to: 's3', label: '#1–#6', tone: 'ok' }],
          nodes: { s3: { tone: 'ok', badge: '#1–#6' } },
          vars: { a: '6 (#1–#6)', s3: '6 (#1–#6)', only: '0', ord: '#1–#6 ✓ "ho gaya"' },
        },
        {
          clock: '3.00–4.00 s',
          say: 'Backup ke baad teen orders aur aaye: #7, #8, #9. Teeno ko region A ne rakh liya, aur teeno grahakon ko "ho gaya" dikha.',
          flows: [{ from: 'rt', to: 'a', label: '#9 ✓', tone: 'ok' }],
          nodes: { a: { tone: 'ok', badge: '9 orders' } },
          vars: { a: '9 (#1–#9)', only: '?', ord: '#7, #8, #9 ✓ "ho gaya"' },
          ask: {
            q: '#7, #8 aur #9 ko "ho gaya" mil chuka hai. Abhi teenon orders ki copy kahan hai?',
            choices: [
              'Sirf A mein; agla backup chalne tak teenon orders ki doosri copy nahi bani hai',
              'A aur backup mein; "ho gaya" bolne se pehle har order backup tak pahunchta hai',
              'A aur B mein; router har naya order dono regions mein saath-saath rakh deta hai',
              'Sirf backup mein; order bachane ke baad A apne paas ki copy hata deta hai',
            ],
            answer: 0,
            hint: 'Pichhle backup mein kaunse orders the? #7–#9 pichhle backup se pehle aaye ya baad mein?',
            explain: 'Lab mein "ho gaya" ka matlab hai ki A ne order rakh liya. Pichhle backup mein #1–#6 the; #7–#9 backup ke baad aaye. Abhi #7–#9 sirf A mein hain. Har app ka "ho gaya" kitni copies ka vaada karta hai, alag se dekhna padta hai.',
            choiceExplanations: [
              'Lab mein "ho gaya" ka matlab hai ki A ne order rakh liya. Pichhle backup mein #1–#6 the; #7–#9 backup ke baad aaye. Abhi #7–#9 sirf A mein hain. Har app ka "ho gaya" kitni copies ka vaada karta hai, alag se dekhna padta hai.',
              'Lab mein A backup ke jawab ka intezaar karke "ho gaya" nahi bolta. Backup ki apni alag ghadi hai.',
              'Router har order A ko bhejta hai. B mein abhi na app chalu hai, na orders ki copy pahunchi hai.',
              'Backup banane se A ka order nahi mitta. A order apne paas rakhta hai aur baad mein copy bhejta hai.',
            ],
          },
        },
        {
          clock: '4.00 s',
          say: '💥 <b>Region A gaya.</b> Poora region: machines bhi, aur un machines par rakhe orders bhi.<br><br>4.50 s par #10 aaya. Router ne #10 ko region A par hi bheja → ✗. Router ko abhi pata nahi.',
          flows: [{ from: 'rt', to: 'a', label: '#10 ✗', tone: 'bad' }],
          nodes: { rt: { tone: 'slow', badge: 'sab A par' }, a: { tone: 'bad', badge: 'gaya' } },
          vars: { a: '💥 gaya (4.00 s par)', only: '3 (#7–#9) — A ke saath gaye', ord: '#10 ✗ (A band hai)' },
          ask: {
            q: 'A ke jaane ke baad router pehli baar orders B par kis pal bhejega?',
            choices: [
              '5.50 s par; router ko lagataar teesra nakaam jawab tab milta hai',
              '4.00 s par; A ke band hote hi router ko apne aap khabar milti hai',
              '4.50 s par; pehla nakaam jawab milte hi router B par chala jaata hai',
              '5.00 s par; do nakaam jawab milne par router ki ginti poori hoti hai',
            ],
            answer: 0,
            hint: 'Har aadhe second par ek check likho, phir router ke niyam ke hisaab se gino.',
            explain: 'Tay ghadi wale slow motion mein check 4.50, 5.00 aur 5.50 s par fail hote hain. Router ka niyam lagataar teen fail ka hai, toh 5.50 s par orders B par jaate hain. A ka jaana aur router ko pata chalna alag pal hain.',
            choiceExplanations: [
              'Tay ghadi wale slow motion mein check 4.50, 5.00 aur 5.50 s par fail hote hain. Router ka niyam lagataar teen fail ka hai, toh 5.50 s par orders B par jaate hain. A ka jaana aur router ko pata chalna alag pal hain.',
              '4.00 s ka check A ke jaane se pehle ho chuka tha. Router ko A se band hone ki alag khabar nahi milti.',
              '4.50 s par sirf pehla check fail hua. Router ko lagataar teen fail chahiye.',
              '5.00 s tak do check fail hue. Teesra fail 5.50 s par aayega.',
            ],
          },
        },
        {
          clock: '5.50 s',
          say: 'Router ne maan liya: region A gaya. Ab saare orders region B par.<br><br>Par region B mein <b>kuch tha hi nahi</b>. Pehle machines aur DB banane padenge: lab mein 6 second (asli duniya mein: ghante).<br><br>#12 → B ✗ · #13 → B ✗ · … har order ko ek hi jawab: "B abhi ban raha hai".',
          flows: [{ from: 'rt', to: 'b', label: '#12 ✗', tone: 'bad' }],
          nodes: { rt: { tone: 'slow', badge: 'sab B par' }, b: { tone: 'slow', badge: 'ban raha hai (6 s)' } },
          vars: { rt: 'region B (5.50 s se)', ord: '#12 se #23 ✗ (B abhi ban raha hai)' },
        },
        {
          clock: '11.50 s',
          say: 'Region B ban gaya. Ab backup se orders wapas laane hain.',
          nodes: { b: { tone: 'ok', badge: 'ban gaya' } },
          vars: { ord: '—' },
          ask: {
            q: 'B ban gaya. Rakhe hue backup se ab kaunse orders wapas milenge?',
            choices: [
              '#1–#6 milenge; aakhri poora backup teen second par bana tha',
              '#1–#9 milenge; "ho gaya" wale sab orders backup mein aate hain',
              '#1–#11 milenge; router ko mile sab orders backup mein aate hain',
              '#7–#9 milenge; restore sabse naya bacha hua batch hi laata hai',
            ],
            answer: 0,
            hint: 'Backup banne ka pal dekho. Us pal tak kaunse orders backup mein pahunch chuke the?',
            explain: '3.00 s wale backup mein #1–#6 the. #7–#9 ko A ne rakh liya tha, par agla backup jaane se pehle A chala gaya. #10 aur #11 A ke band hone par fail hue; backup mein kabhi pahunche hi nahi.',
            choiceExplanations: [
              '3.00 s wale backup mein #1–#6 the. #7–#9 ko A ne rakh liya tha, par agla backup jaane se pehle A chala gaya. #10 aur #11 A ke band hone par fail hue; backup mein kabhi pahunche hi nahi.',
              'A ka "ho gaya" backup pahunchne ka saboot nahi tha. #7–#9 ki copy A se bahar nahi gayi.',
              'Router ko order milne se backup nahi banta. #10 aur #11 toh A mein bhi nahi rakhe gaye.',
              'Restore rakha hua backup padhta hai. #7–#9 agle backup ke intezaar mein A par hi reh gaye.',
            ],
          },
        },
        {
          clock: '11.50 s · wapas chalu',
          say: 'Restore ke baad #24 → B ✓. Orders phir se chalne lage — region A ke jaane ke <b>7.50 second baad</b>.',
          flows: [{ from: 's3', to: 'b', label: '#1–#6', tone: 'ok' }, { from: 'rt', to: 'b', label: '#24 ✓', tone: 'ok' }],
          nodes: { rt: { tone: 'ok', badge: 'sab B par' }, b: { tone: 'ok', badge: '#1–#6 + naye' } },
          vars: { a: 'gaya', s3: '6 (#1–#6)', only: '#7–#9: kahin nahi', rt: 'region B', ord: '#24 ✓' },
        },
        {
          clock: 'nateeja',
          say: `Do alag nuksaan:
            <ul>
              <li><b>Samay:</b> region A 4.00 s par gaya; orders 11.50 s par phir chale. <b>14 orders fail</b> hue (#10 se #23).</li>
              <li><b>Data:</b> #7, #8, #9 — <b>3 orders</b> jinke grahakon ko "ho gaya" dikha tha, par jo ab kahin nahi hain.</li>
            </ul>
            Pehla nuksaan grahak ko <b>usi waqt</b> dikha (error). Doosra nuksaan grahak ko <b>baad mein</b> dikhega — jab khaana kabhi nahi aayega.`,
          nodes: { a: { tone: 'bad', badge: '#7–#9 saath gaye' }, b: { tone: 'ok', badge: '7.50 s baad chalu' } },
          vars: { a: 'gaya', s3: '#1–#6', only: '3 orders kho gaye', rt: 'region B', ord: '14 fail · 3 kho gaye' },
        },
        {
          clock: 'asli raftaar',
          say: `Lab mein wahi, asli raftaar par: 50 orders/second, region A 4 second par gaya. (Teen run. Lab ke second asli duniya ke ghanton ki jagah hain.)
            <ul>
              <li>Orders <b>16.3–16.4 second</b> tak fail hote rahe: 680–689 orders.</li>
              <li><b>50 orders</b> ko "ho gaya" mila tha, par region B mein nahi hain.</li>
            </ul>`,
          nodes: { rt: { tone: 'slow', badge: 'lab: 16.3–16.4 s fail' }, a: { tone: 'bad', badge: 'gaya' }, b: { tone: 'ok', badge: 'lab: 50 kho gaye' }, s3: { tone: 'ok', badge: 'backup' } },
          vars: { a: 'lab: 4 s par gaya', s3: 'lab: har 3 s par backup', only: 'lab: 50 orders kho gaye', rt: 'lab: 16.3–16.4 s baad B chala', ord: 'lab: 680–689 fail' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> aafat ke do nuksaan hote hain, aur dono alag cheezon se bante hain. <b>Kitni der band:</b> pata chalna + doosre region ko banana. <b>Kitna data gaya:</b> jo orders abhi sirf yahin the — yaani aakhri backup ke baad ke saare.',
    },

    /* ---------------- 2. pehla ilaaj: lagataar copy ---------------- */
    {
      type: 'dryrun',
      title: '✂️ Pehla ilaaj: lagataar copy — aadha kaam',
      goal: 'Wahi orders, wahi 4.00 s par region A ka jaana. Ab region B mein ek DB chalu hai, aur region A har 1 second par naye orders usme copy karta hai. Dekho dono nuksaan kitne ghate — aur kya bacha.',
      nodes: NODES, edges: EDGES, viz: VIZ,
      vars: [
        { id: 'a', label: 'Region A mein orders' },
        { id: 'b', label: 'Region B ke DB mein' },
        { id: 'only', label: 'Sirf A mein (copy ke intezaar mein)' },
        { id: 'ord', label: 'Orders ka kya hua' },
      ],
      steps: [
        {
          clock: 'pichhli baar',
          say: 'Pichhli baar 3 orders kho gaye aur orders 7.50 second band rahe. Tum is team mein ho. Sujhaav aata hai:<br><br><b>"3 second ka backup bahut der hai. Region B mein ek DB chalu rakho, aur region A har 1 second par naye orders usme copy kare. B ka app band hi rakho — kharcha bachega; zaroorat padi toh chala lenge."</b>',
          nodes: { rt: { tone: 'ok', badge: 'sab A par' }, a: { tone: 'ok', badge: 'chal raha hai' }, b: { tone: 'idle', badge: 'DB chalu · app band' }, s3: { tone: 'idle', badge: '' } },
          vars: { a: '0', b: '0', only: '0', ord: '—' },
          ask: {
            q: 'Har second copy bhejne aur B ka DB pehle se chalu rakhne se kaunsa nuksaan ghatega?',
            choices: [
              'Kam data khoyega aur app jaldi lautega; dono nuksaan zero hona zaroori nahi',
              'Data khona band ho jaayega, par B ka app khulne mein pehle jitna waqt hi lagega',
              'App turant poora traffic le lega, par teen second jitna purana data hi milega',
              'Roz ka kharcha ghat jaayega, par data khona aur band rehna pehle jitna rahega',
            ],
            answer: 0,
            hint: 'Copy ke do chakkaron ke beech order aaye toh kahan rahega? B ka app abhi chalu hai?',
            explain: 'Copy har 3 s ki jagah har 1 s par jaayegi, toh A mein akela bacha data kam ho sakta hai. B ka DB pehle se hai, toh poora B banana nahi padega. Phir bhi copy ke beech orders aa sakte hain aur B ka app chalu karna baaki hai.',
            choiceExplanations: [
              'Copy har 3 s ki jagah har 1 s par jaayegi, toh A mein akela bacha data kam ho sakta hai. B ka DB pehle se hai, toh poora B banana nahi padega. Phir bhi copy ke beech orders aa sakte hain aur B ka app chalu karna baaki hai.',
              'Har second copy bhi turant copy nahi hai. B ka DB tayyar hone se B ko dobara banane ka kaam bhi bachega.',
              'B ka app abhi band hai, toh orders turant nahi chalenge. Copy ka fasla bhi ab teen se ek second hua hai.',
              'Chalta DB aur baar-baar copy ka roz ka kharcha hai. Badli taiyaari aur copy se lab ke dono nuksaan ghate.',
            ],
          },
        },
        {
          clock: '0.00–4.00 s',
          say: `Har second copy chalti hai:
            <pre>1.00 s  📦 copy: A → B   #1, #2 (2 order)
2.00 s  📦 copy: A → B   #3, #4 (2 order)
3.00 s  📦 copy: A → B   #5, #6 (2 order)
4.00 s  📦 copy: A → B   #7, #8 (2 order)
4.00 s  #9  → A ✓   A mein: 9 · B tak pahunche: 8 · raaste mein: 1</pre>
            4.00 s par #9 aaya aur use "ho gaya" mila — copy ke theek baad.`,
          flows: [{ from: 'a', to: 'b', tone: 'ok' }],   // label nahi: A ke badge par chadh jaata hai (copy ki lines upar text mein hain)
          nodes: { a: { tone: 'ok', badge: '9 orders' }, b: { tone: 'ok', badge: 'DB: #1–#8' } },
          vars: { a: '9 (#1–#9)', b: '8 (#1–#8)', only: '1 (#9)', ord: '#1–#9 ✓ "ho gaya"' },
        },
        {
          clock: '4.00–5.50 s',
          say: '💥 4.00 s: region A gaya — #9 ke saath.<br><br>4.50 s aur 5.00 s: #10, #11 → A ✗. 5.50 s par router ne maan liya, aur orders region B par bhejne laga.',
          flows: [{ from: 'rt', to: 'a', label: '#10 ✗', tone: 'bad' }],
          nodes: { rt: { tone: 'slow', badge: 'A se jawab nahi' }, a: { tone: 'bad', badge: 'gaya · #9 saath' } },
          vars: { a: '💥 gaya (4.00 s par)', only: '#9 — A ke saath gaya', ord: '#10, #11 ✗' },
        },
        {
          clock: '5.50–8.50 s',
          say: 'Region B ka DB tayyar hai, aur usme #1–#8 hain. Par B ka <b>app band tha</b>: chalu hone mein 3 second.<br><br>#12 se #17 → B ✗ ("B ka app boot ho raha hai"). 8.50 s par app khul gaya.',
          flows: [{ from: 'rt', to: 'b', label: '#12 ✗', tone: 'bad' }],
          nodes: { rt: { tone: 'slow', badge: 'sab B par' }, b: { tone: 'slow', badge: 'app boot (3 s)' } },
          vars: { ord: '#12–#17 ✗ (app boot ho raha hai)' },
        },
        {
          clock: 'nateeja',
          say: `<div class="dr-scroll"><table>
              <tr><th>Kya naapa</th><th>Sirf backup (har 3 s)</th><th>Lagataar copy (har 1 s) + B ka DB chalu</th></tr>
              <tr><td>Orders phir se chale, A ke jaane ke kitni der baad</td><td>7.50 s</td><td><b>4.50 s</b></td></tr>
              <tr><td>Fail hue orders</td><td>14</td><td><b>8</b></td></tr>
              <tr><td>"Ho gaya" mila, par kho gaye</td><td>3 (#7–#9)</td><td><b>1 (#9)</b></td></tr>
            </table></div>
            Dono nuksaan ghate. Par ek order phir bhi khoya.`,
          nodes: { b: { tone: 'ok', badge: 'chalu · #9 nahi hai' } },
          vars: { a: 'gaya', b: '#1–#8 + naye', only: '1 order kho gaya (#9)', ord: '8 fail · 1 kho gaya' },
          ask: {
            q: 'Har second copy chalne ke baad bhi #9 B mein nahi mila. Kis pal ke fark se #9 khoya?',
            choices: [
              '#9 ko "ho gaya" mil gaya, par agle copy ke chakkar se pehle hi A chala gaya',
              '#9 ki copy B tak ja chuki thi, par B ka app band hone se order bhi mit gaya',
              '#9 ko router ne B par bhej diya tha, par B mein abhi order ki jagah nahi thi',
              '#9 ko A ne lene se mana kiya tha, par router ne phir bhi "ho gaya" bol diya',
            ],
            answer: 0,
            hint: '#9 aane ka pal aur copy chalne ka pal milao. Dono mein pehle kya hua?',
            explain: '4.00 s par copy #7 aur #8 ko le gayi. Copy ke baad #9 aaya, A ne #9 rakh liya aur "ho gaya" keh diya. Agli copy 5.00 s par hoti, par A 4.00 s par hi chala gaya. Jaldi-jaldi copy se nuksaan ka mauka ghat-ta hai; zero ki guarantee nahi milti.',
            choiceExplanations: [
              '4.00 s par copy #7 aur #8 ko le gayi. Copy ke baad #9 aaya, A ne #9 rakh liya aur "ho gaya" keh diya. Agli copy 5.00 s par hoti, par A 4.00 s par hi chala gaya. Jaldi-jaldi copy se nuksaan ka mauka ghat-ta hai; zero ki guarantee nahi milti.',
              'B ka DB #9 tak pahuncha hi nahi tha. B ka app band hone se DB mein rakhe orders nahi mitte.',
              '#9 A par gaya tha aur safal hua tha. B ki capacity se pehle copy pahunchne ka sawaal hai.',
              '#9 ko A ne rakh liya tha. Dikkat jhoothe jawab ki nahi, doosri copy banne se pehle A ke jaane ki hai.',
            ],
          },
        },
        {
          clock: 'asli raftaar',
          say: `Lab mein dono tareeke, asli raftaar par (50 orders/second, teen run):
            <div class="dr-scroll"><table>
              <tr><th>Tareeka</th><th>Aam din region B mein</th><th>Fail hote rahe</th><th>Fail orders</th><th>Kho gaye</th></tr>
              <tr><td>Sirf backup</td><td>kuch nahi</td><td>16.3–16.4 s</td><td>680–689</td><td>50</td></tr>
              <tr><td>Lagataar copy, B ka DB chalu</td><td>DB chalu, app band</td><td><b>6.4–6.5 s</b></td><td><b>283–286</b></td><td><b>5</b></td></tr>
            </table></div>
            Doosre khaane par dhyaan do: nuksaan ghatane ke liye region B mein <b>kuch hamesha chalu</b> rakhna pada. Doosre region ka kharcha roz ka hai, aafat ho ya na ho.`,
          nodes: { rt: { tone: 'ok', badge: 'lab: 6.4–6.5 s fail' }, b: { tone: 'ok', badge: 'lab: 5 kho gaye' } },
          vars: { a: 'lab: 4 s par gaya', b: 'lab: DB hamesha chalu', only: 'lab: 50 → 5 kho gaye', ord: 'lab: 680–689 → 283–286 fail' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> copy jitni jaldi-jaldi, khoya data utna kam. Doosre region mein jitna zyada pehle se chalu, wapsi utni tez. Dono ki keemat hai: region B ka roz ka kharcha. Aur jab tak "ho gaya" copy se pehle bola jaata hai, khoye data ke zero hone ki guarantee nahi.',
    },

    /* ---------------- 3. idea: bahi-khata ---------------- */
    {
      type: 'cards',
      title: '📒 Tum dekh chuke ho — dukaan ka bahi-khata',
      goal: 'Chaar chhote cards. Har card ek hi sawaal ka jawab deta hai. Naam sabse aakhir mein aayenge.',
      steps: [
        {
          title: '1. Seth ka khata, aur raat ki photocopy',
          say: 'Kirana dukaan. Seth ke paas ek <b>bahi-khata</b> hai: kis grahak par kitna udhaar hai, sab khate mein likha hai.<br><br>Seth samajhdaar hai: har raat dukaan band karke khate ki <b>photocopy</b> ghar le jaata hai.<br><br>Ek din dopahar 3 baje dukaan mein aag lag gayi. Khata jal gaya.<br><br><b>KhanaKart mein:</b> khata = orders ka DB · dukaan = region A · raat ki photocopy = backup.',
        },
        {
          title: '2. Do nuksaan, do alag wajah',
          say: 'Seth ke paas kal raat ki photocopy hai. Phir bhi do nuksaan hue:<br><br><b>Pehla:</b> aaj subah se 3 baje tak ka udhaar sirf jale hue khate mein tha. Kis par kitna — ab koi nahi bata sakta.<br><br><b>Doosra:</b> nayi dukaan dhoondhne, saaman bharne aur dobara kholne mein ek hafta laga. Us hafte koi bikri nahi.<br><br><b>KhanaKart mein:</b> pehla nuksaan = #7, #8, #9 (aakhri backup ke baad ke orders) · doosra nuksaan = 7.50 second jab orders fail hote rahe.',
        },
        {
          title: '3. Seth kya alag kar sakta tha?',
          say: 'Seth ki ek doosri branch bhi hai, doosre mohalle mein.',
          ask: {
            q: 'Dukaan ki aag se khata gaya aur nayi dukaan kholne mein hafta laga. Agli baar dono nuksaan kaise ghatenge?',
            choices: [
              'Nayi entries doosri branch mein likhwao, aur branch pehle se khuli rakho',
              'Nayi entries dukaan ki tijori mein rakho, aur doosri branch baad mein dhoondho',
              'Doosri branch pehle se khuli rakho, par nayi entries pehli dukaan mein hi likho',
              'Nayi entries doosri branch mein likhwao, par branch kholne ka intezaam taal do',
            ],
            answer: 0,
            hint: 'Khate ki entries bachane aur bikri dobara shuru karne ke liye alag-alag kya chahiye?',
            explain: 'Doosri branch mein taaza khata rahe toh aag ke baad kam entries khoyengi. Branch pehle se khuli ho toh bikri jaldi lautegi. Dono taiyaari ka kharcha hai: entries likhne ka aur khuli branch ka.',
            choiceExplanations: [
              'Doosri branch mein taaza khata rahe toh aag ke baad kam entries khoyengi. Branch pehle se khuli ho toh bikri jaldi lautegi. Dono taiyaari ka kharcha hai: entries likhne ka aur khuli branch ka.',
              'Tijori bhi jalne wali dukaan mein hai. Aur doosri branch baad mein dhoondhne se bikri lautne mein der hogi.',
              'Khuli branch samay bachayegi, par bina taaza khate ke aaj ki entries phir kho sakti hain.',
              'Doosri jagah khata bach sakta hai, par branch kholne ka intezaam na ho toh bikri phir der se lautegi.',
            ],
          },
        },
        {
          title: '4. In cheezon ke naam',
          say: `<div class="dr-scroll"><table>
              <tr><th>Jo dekha</th><th>Naam</th></tr>
              <tr><td>Poora region chale jaane jaisi badi aafat ke liye tayyari</td><td><b>Disaster recovery</b> (DR)</td></tr>
              <tr><td>Thodi-thodi der mein data ki copy doosri jagah rakhna</td><td><b>Backup</b></td></tr>
              <tr><td>Har naya order lagataar doosre region ke DB mein copy karna</td><td><b>Replication</b></td></tr>
              <tr><td>Router ka orders ko doosre region par bhejne lagna</td><td><b>Failover</b></td></tr>
              <tr><td>"Kitni der mein wapas chalu?" — jo samay tumne tay kiya</td><td><b>RTO</b> (recovery time objective)</td></tr>
              <tr><td>"Kitna data khona manzoor?" — jo hadd tumne tay ki</td><td><b>RPO</b> (recovery point objective)</td></tr>
            </table></div>
            RTO aur RPO naape hue number nahi hain — dono <b>lakshya</b> hain, jo business pehle se likhta hai. Lab ke number batate hain ki kaunsa tareeka kaunsa lakshya paa sakta hai.<br><br>
            ⚠️ <b>Ek aam galatfehmi:</b> "Backup hai, toh hum bache hue hain." Backup nahi batata ki wapas aane mein kitni der lagegi, aur aakhri backup ke baad ka data ja sakta hai. Lab: sirf backup → 16.3–16.4 s band, 50 orders kho gaye.`,
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> aafat ki tayyari do sawaalon se shuru hoti hai, tareeke se nahi: <b>kitni der band reh sakte hain</b> (RTO), aur <b>kitna data kho sakte hain</b> (RPO). Jawab business deta hai; tareeka jawab ke baad chuna jaata hai.',
    },

    /* ---------------- 4. naam pakke karo ---------------- */
    {
      type: 'match',
      title: 'Jo ho raha hai, us cheez ka naam',
      instructions: 'Baayein taraf jo ho raha hai, daayein taraf us cheez ka naam.',
      pairs: [
        { left: 'Region A har 3 second par apne orders ki copy doosri jagah rakh deta hai', right: 'Backup', explain: 'Copy purani hoti hai: aakhri backup ke baad ke orders usme nahi hote. Slow motion: #7–#9 kho gaye.' },
        { left: 'Region A har naya order thodi der mein region B ke DB mein bhi likh deta hai', right: 'Replication', explain: 'Lagataar copy. Slow motion: har 1 s par → sirf #9 khoya.' },
        { left: 'Router 3 baar jawab na milne par saare orders region B par bhejne lagta hai', right: 'Failover', explain: 'Slow motion: 5.50 s par. A ke jaane aur failover ke beech 1.50 s gaye.' },
        { left: '"Region jaaye, toh hum zyada se zyada 1 ghante mein wapas chalu ho jaayenge"', right: 'RTO', explain: 'Samay ka lakshya. Isme pata chalna, doosre region ko tayyar karna — sab juda hai.' },
        { left: '"Region jaaye, toh zyada se zyada aakhri 5 minute ka data khona manzoor hai"', right: 'RPO', explain: 'Data ka lakshya. Copy kitni purani ho sakti hai, RPO se tay hota hai.' },
        { left: 'Poora region chale jaane jaisi aafat ke liye pehle se ki gayi tayyari', right: 'Disaster recovery', explain: 'Backup, replication, doosra region, failover — sab disaster recovery ke hisse hain.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — samasya samjhao',
    instructions: 'Interviewer yahan "kyun" sunna chahta hai, naam nahi. 🎤',
    questions: [
      {
        q: 'Har raat backup doosre region mein jaata hai. A chala jaaye toh data aur service ki wapsi kaise aankoge?',
        choices: [
          'Aakhri safal backup se data milega; app lautne ka samay alag se naapna padega',
          'Aakhri safal backup se aaj ka bhi data milega; app bas kholna hi baaki rahega',
          'Backup banne mein jitna samay laga, app lautne mein utna hi samay maan lenge',
          'Naye region mein machines ban gayin, toh aakhri safal order tak data mil jaayega',
        ],
        answer: 0,
        explain: 'Roz ka backup lagbhag ek din tak ka data gap chhod sakta hai, agar agla backup abhi nahi bana. Gap aakhri safal backup se gino. Machines, DB, app aur restore chala ke dekho; backup hone se service lautne ka samay pata nahi chalta.',
        choiceExplanations: [
          'Roz ka backup lagbhag ek din tak ka data gap chhod sakta hai, agar agla backup abhi nahi bana. Gap aakhri safal backup se gino. Machines, DB, app aur restore chala ke dekho; backup hone se service lautne ka samay pata nahi chalta.',
          'Aakhri backup ke baad ki entries backup mein nahi hain. App kholne se pehle data restore aur taiyaari bhi lag sakti hai.',
          'Backup banana aur backup se poora app chalana alag kaam hain. Dono ka samay barabar maan nahi sakte.',
          'Nayi machines data nahi bana sakti. Backup mein na pahuncha order alag surakshit copy ke bina nahi milega.',
        ],
      },
      {
        q: 'Business RTO aur RPO likh raha hai. Dono mein kaunsi hadd tay hoti hai?',
        choices: [
          'RTO: kitni der service band reh sakti hai; RPO: kitne waqt ka data khona manzoor hai',
          'RTO: kitne waqt ka data khona manzoor hai; RPO: kitni der service band reh sakti hai',
          'RTO: backup banane mein kitna waqt lagega; RPO: backup restore mein kitna waqt lagega',
          'RTO: doosra region kitni der mein banega; RPO: doosra app kitne orders le sakta hai',
        ],
        answer: 0,
        explain: 'RTO service lautne ke liye manzoor samay ki hadd hai. RPO manzoor data loss ko waqt mein batata hai: recovery point kitna purana ho sakta hai. Dono business ke lakshya hain; lab mein naapa nateeja batata hai ki lakshya poore hue ya nahi.',
        choiceExplanations: [
          'RTO service lautne ke liye manzoor samay ki hadd hai. RPO manzoor data loss ko waqt mein batata hai: recovery point kitna purana ho sakta hai. Dono business ke lakshya hain; lab mein naapa nateeja batata hai ki lakshya poore hue ya nahi.',
          'Dono naam ulat gaye. RTO band rehne ke samay ka, RPO khoye data ke waqt ka lakshya hai.',
          'Backup banana aur restore karna taiyaari ke kaam hain. RPO restore ka samay nahi, data loss ki hadd hai.',
          'Region banane ka waqt RTO par asar daal sakta hai, par RTO poori service ki wapsi hai. RPO app ki capacity nahi hai.',
        ],
      },
    ],
  },
  success: [
    'Bata sakte ho ki backup ke bawajood orders der tak fail kyun hue, aur kuch "ho gaya" wale orders kyun khoye',
    'Dono nuksaan ki wajah alag-alag bata sakte ho: doosri jagah kitni tayyar hai, aur copy kitni purani hai',
    'Backup, replication, failover, RTO aur RPO ko pehchaan sakte ho',
  ],
  cards: [
    { front: 'Aafat ke do nuksaan?', back: '<b>Samay</b> (kitni der band) aur <b>data</b> (kitne "ho gaya" wale orders khoye). Slow motion, sirf backup: 7.50 s band, 14 fail, 3 khoye. Lab: 16.3–16.4 s, 50 khoye.' },
    { front: 'Khoya data kis se tay hota hai?', back: 'Doosri jagah ki copy kitni purani hai. Backup har 3 s → #7–#9 khoye. Copy har 1 s → sirf #9. "Ho gaya" copy se pehle bola jaaye, toh zero ki guarantee nahi.' },
    { front: 'Band rehne ka samay kis se tay hota hai?', back: 'Pata chalna (router: 3 baar jawab nahi = 1.50 s) + doosre region ko jo banana ya chalana pade. Kuch nahi chal raha → 7.50 s. DB chalu, app band → 4.50 s.' },
    { front: 'RTO aur RPO?', back: '<b>RTO</b>: kitni der mein wapas chalu (samay ka lakshya). <b>RPO</b>: kitna data khona manzoor (data ka lakshya). Dono business pehle se likhta hai; tareeka lakshya ke baad.' },
  ],
},
]);

})();
