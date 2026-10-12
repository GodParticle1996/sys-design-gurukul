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
            q: '#7, #8 aur #9 ko "ho gaya" mil chuka hai. Yeh teen orders abhi kahan-kahan rakhe hain?',
            choices: [
              'Sirf region A mein. Agla backup 6.00 s par jaayega — tab tak yeh teeno kisi doosri jagah nahi hain',
              'Region A mein aur backup mein — "ho gaya" ka matlab hi hai ki backup ho chuka',
              'Region A aur region B, dono mein',
              'Sirf backup mein',
            ],
            answer: 0,
            hint: 'Backup kab-kab chalta hai? Pichhla backup kab chala tha, aur yeh orders kab aaye?',
            explain: 'Slow motion ki line: <code>4.00 s #9 → A ✓ A mein: 9 · S3 tak pahunche: 6 · raaste mein: 3</code>. "Ho gaya" sirf itna kehta hai ki region A ne order rakh liya.',
          },
        },
        {
          clock: '4.00 s',
          say: '💥 <b>Region A gaya.</b> Poora region: machines bhi, aur un machines par rakhe orders bhi.<br><br>4.50 s par #10 aaya. Router ne #10 ko region A par hi bheja → ✗. Router ko abhi pata nahi.',
          flows: [{ from: 'rt', to: 'a', label: '#10 ✗', tone: 'bad' }],
          nodes: { rt: { tone: 'slow', badge: 'sab A par' }, a: { tone: 'bad', badge: 'gaya' } },
          vars: { a: '💥 gaya (4.00 s par)', only: '3 (#7–#9) — A ke saath gaye', ord: '#10 ✗ (A band hai)' },
          ask: {
            q: 'Router orders ko region B par kab bhejna shuru karega?',
            choices: [
              '5.50 s par. Router har 0.5 second par poochhta hai, aur lagataar 3 baar jawab na aane par hi maanta hai ki region A gaya: 4.50, 5.00, 5.50',
              'Turant — 4.00 s par hi',
              'Kabhi nahi — kisi insaan ko button dabana padega',
              '10 minute baad',
            ],
            answer: 0,
            hint: 'Router ka niyam kya tha: kitni baar "jawab nahi"? Aur sawaal kitni der par poochha jaata hai?',
            explain: 'Slow motion: <code>5.50 s 🩺 A ✗ (lagataar fail 3/3) → FAILOVER</code>. A ke jaane aur router ko pata chalne ke beech 1.50 second gaye — us beech #10 aur #11 fail hue.',
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
            q: 'Backup se region B mein kaunse orders aayenge?',
            choices: [
              '#1 se #6 — jo 3.00 s wale backup mein the. #7, #8, #9 kisi backup mein gaye hi nahi the',
              '#1 se #9 — saare, kyunki sab ko "ho gaya" mila tha',
              '#1 se #11',
              'Koi nahi',
            ],
            answer: 0,
            hint: 'Aakhri backup kab chala tha? Us backup mein kaunse orders the?',
            explain: 'Slow motion: <code>11.50 s 🚪 B ban gaya · S3 se restore: 6 order wapas (#1–#6) · app chalu</code>. #7, #8, #9 ke grahakon ko "ho gaya" dikha tha — aur ab in orders ka kahin koi record nahi.',
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
            q: 'Is badlaav se kya sudhrega?',
            choices: [
              'Kam orders khoyenge (copy ab 3 ki jagah har 1 second par hai), aur wapsi tez hogi (B ko banana nahi, sirf app chalana hai). Par dono nuksaan zero nahi honge',
              'Ab ek bhi order nahi khoyega',
              'Orders bilkul fail nahi honge',
              'Kuch nahi badlega',
            ],
            answer: 0,
            hint: 'Copy ke do chakkaron ke beech jo orders aate hain, woh kahan hote hain? Aur B ka app chalu hone mein waqt lagega ya nahi?',
            explain: 'Copy jaldi-jaldi → "sirf A mein" wale orders kam. B ka DB pehle se hai → banana nahi padta. Par copy turant nahi hai, aur app ko chalu hone mein waqt lagta hai.',
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
            q: 'Copy har second chal rahi thi. Phir bhi #9 kyun khoya?',
            choices: [
              'Region A ne #9 ko rakhte hi "ho gaya" keh diya — copy ka intezaar nahi kiya. Agli copy 5.00 s par jaati, par A 4.00 s par hi chala gaya',
              'Copy mein bug tha',
              'Region B ka DB bhara hua tha',
              'Router ne #9 ko gira diya',
            ],
            answer: 0,
            hint: '"Ho gaya" kab bola gaya: copy se pehle, ya copy ke baad?',
            explain: 'Jab tak "ho gaya" copy se <b>pehle</b> bola jaata hai, kuch orders hamesha "raaste mein" honge. Copy tez karne se yeh ginti ghat-ti hai, zero nahi hoti. (Zero karne ka tareeka aur uski keemat: agla level.)',
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
            Doosre khaane par dhyaan do: nuksaan ghatane ke liye region B mein <b>kuch hamesha chalu</b> rakhna pada. Yeh kharcha roz ka hai, aafat ho ya na ho.`,
          nodes: { rt: { tone: 'ok', badge: 'lab: 6.4–6.5 s fail' }, b: { tone: 'ok', badge: 'lab: 5 kho gaye' } },
          vars: { a: 'lab: 4 s par gaya', b: 'lab: DB hamesha chalu', only: 'lab: 50 → 5 kho gaye', ord: 'lab: 680–689 → 283–286 fail' },
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> copy jitni jaldi-jaldi, khoya data utna kam. Doosre region mein jitna zyada pehle se chalu, wapsi utni tez. Dono ki keemat hai: region B ka roz ka kharcha. Aur jab tak "ho gaya" copy se pehle bola jaata hai, khoya data zero nahi hota.',
    },

    /* ---------------- 3. idea: bahi-khata ---------------- */
    {
      type: 'cards',
      title: '📒 Yeh tum dekh chuke ho — dukaan ka bahi-khata',
      goal: 'Chaar chhote cards. Har card ek hi sawaal ka jawab deta hai. Naam sabse aakhir mein aayenge.',
      steps: [
        {
          title: '1. Seth ka khata, aur raat ki photocopy',
          say: 'Kirana dukaan. Seth ke paas ek <b>bahi-khata</b> hai: kis grahak par kitna udhaar hai, sab usi mein likha hai.<br><br>Seth samajhdaar hai: har raat dukaan band karke khate ki <b>photocopy</b> ghar le jaata hai.<br><br>Ek din dopahar 3 baje dukaan mein aag lag gayi. Khata jal gaya.<br><br><b>KhanaKart mein:</b> khata = orders ka DB · dukaan = region A · raat ki photocopy = backup.',
        },
        {
          title: '2. Do nuksaan, do alag wajah',
          say: 'Seth ke paas kal raat ki photocopy hai. Phir bhi do nuksaan hue:<br><br><b>Pehla:</b> aaj subah se 3 baje tak jo udhaar diya, woh sirf jale hue khate mein tha. Kis par kitna — ab koi nahi bata sakta.<br><br><b>Doosra:</b> nayi dukaan dhoondhne, saaman bharne aur dobara kholne mein ek hafta laga. Us hafte koi bikri nahi.<br><br><b>KhanaKart mein:</b> pehla nuksaan = #7, #8, #9 (aakhri backup ke baad ke orders) · doosra nuksaan = 7.50 second jab orders fail hote rahe.',
        },
        {
          title: '3. Seth kya alag kar sakta tha?',
          say: 'Seth ki ek doosri branch bhi hai, doosre mohalle mein.',
          ask: {
            q: 'Agli baar dono nuksaan kam kaise honge?',
            choices: [
              'Munshi har entry thodi-thodi der mein doosri branch ke khate mein bhi likhe (khoya data kam), aur doosri branch pehle se khuli rahe (wapsi tez). Dono ka kharcha hai: ek munshi, aur ek chalti dukaan',
              'Photocopy ko dukaan mein hi tijori mein rakhe',
              'Khata likhna hi band kar de',
              'Aag bujhane ka sylinder kharid le — bas itna kaafi hai',
            ],
            answer: 0,
            hint: 'Pehla nuksaan kis cheez se bana: photocopy kitni purani thi? Doosra nuksaan kis cheez se: nayi dukaan kab tayyar thi?',
            explain: 'Khoya data = doosri jagah ki copy kitni purani hai. Band rehne ka samay = doosri jagah kitni tayyar hai. Slow motion mein yahi dikha: 3 → 1 khoye orders, 7.50 → 4.50 second.',
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
            RTO aur RPO naape hue number nahi hain — yeh <b>lakshya</b> hain, jo business pehle se likhta hai. Lab ke number batate hain ki kaunsa tareeka kaunsa lakshya paa sakta hai.<br><br>
            ⚠️ <b>Ek aam galatfehmi:</b> "Backup hai, toh hum bache hue hain." Backup yeh nahi batata ki wapas aane mein kitni der lagegi, aur aakhri backup ke baad ka data hamesha jaata hai. Lab: sirf backup → 16.3–16.4 s band, 50 orders kho gaye.`,
        },
      ],
      lesson: '🎯 <b>Asli baat:</b> aafat ki tayyari do sawaalon se shuru hoti hai, tareeke se nahi: <b>kitni der band reh sakte hain</b> (RTO), aur <b>kitna data kho sakte hain</b> (RPO). Jawab business deta hai; tareeka uske baad chuna jaata hai.',
    },

    /* ---------------- 4. naam pakke karo ---------------- */
    {
      type: 'match',
      title: 'Jo ho raha hai, uska naam',
      instructions: 'Baayein taraf jo ho raha hai, daayein taraf uska naam.',
      pairs: [
        { left: 'Region A har 3 second par apne orders ki copy doosri jagah rakh deta hai', right: 'Backup', explain: 'Copy purani hoti hai: aakhri backup ke baad ke orders usme nahi hote. Slow motion: #7–#9 kho gaye.' },
        { left: 'Region A har naya order thodi der mein region B ke DB mein bhi likh deta hai', right: 'Replication', explain: 'Lagataar copy. Slow motion: har 1 s par → sirf #9 khoya.' },
        { left: 'Router 3 baar jawab na milne par saare orders region B par bhejne lagta hai', right: 'Failover', explain: 'Slow motion: 5.50 s par. A ke jaane aur failover ke beech 1.50 s gaye.' },
        { left: '"Region jaaye, toh hum zyada se zyada 1 ghante mein wapas chalu ho jaayenge"', right: 'RTO', explain: 'Samay ka lakshya. Isme pata chalna, doosre region ko tayyar karna — sab juda hai.' },
        { left: '"Region jaaye, toh zyada se zyada aakhri 5 minute ka data khona manzoor hai"', right: 'RPO', explain: 'Data ka lakshya. Copy kitni purani ho sakti hai, isi se tay hota hai.' },
        { left: 'Poora region chale jaane jaisi aafat ke liye pehle se ki gayi tayyari', right: 'Disaster recovery', explain: 'Backup, replication, doosra region, failover — sab isi ke hisse hain.' },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — samasya samjhao',
    instructions: 'Interviewer yahan "kyun" sunna chahta hai, naam nahi. 🎤',
    questions: [
      {
        q: '"Humara DR plan: har raat ka backup doosre region mein rakha jaata hai. Region chala jaaye, toh kya hoga?"',
        choices: [
          'Do alag nuksaan honge. Data: aakhri backup ke baad ka sab kuch jaayega — zyada se zyada ek din ka. Samay: doosre region mein kuch chal nahi raha, toh machines aur DB banana, phir restore — ghante. Pehle business se poochho ki kitna data aur kitna samay manzoor hai; phir dekho ki raat ka backup un lakshyon mein aata hai ya nahi',
          'Kuch nahi — backup hai, toh turant wapas aa jaayenge',
          'Sirf thoda dheema chalega',
          'Backup se region wapas nahi aata, isliye backup bekaar hai',
        ],
        answer: 0,
        explain: 'Lab (samay chhota kiya hua): sirf backup → 16.3–16.4 s band, 50 orders kho gaye. Lagataar copy + B ka DB chalu → 6.4–6.5 s, 5 kho gaye.',
      },
      {
        q: '"RTO aur RPO mein farak kya hai?"',
        choices: [
          'RTO samay ka lakshya hai: aafat ke baad kitni der mein wapas chalu. RPO data ka lakshya hai: kitne samay ka data khona manzoor. RTO is par nirbhar hai ki doosri jagah kitni tayyar hai; RPO is par ki doosri jagah ki copy kitni purani ho sakti hai. Dono business tay karta hai',
          'Dono ek hi cheez ke do naam hain',
          'RTO data ke liye hai, RPO samay ke liye',
          'RTO backup ka size hai, RPO uski speed',
        ],
        answer: 0,
        explain: 'Slow motion: sirf backup → band 7.50 s, khoye 3. Lagataar copy → band 4.50 s, khoya 1. Do alag number, do alag wajah.',
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
    { front: 'Khoya data kis se tay hota hai?', back: 'Doosri jagah ki copy kitni purani hai. Backup har 3 s → #7–#9 khoye. Copy har 1 s → sirf #9. "Ho gaya" copy se pehle bola jaaye, toh zero kabhi nahi.' },
    { front: 'Band rehne ka samay kis se tay hota hai?', back: 'Pata chalna (router: 3 baar jawab nahi = 1.50 s) + doosre region ko jo banana ya chalana pade. Kuch nahi chal raha → 7.50 s. DB chalu, app band → 4.50 s.' },
    { front: 'RTO aur RPO?', back: '<b>RTO</b>: kitni der mein wapas chalu (samay ka lakshya). <b>RPO</b>: kitna data khona manzoor (data ka lakshya). Dono business pehle se likhta hai; tareeka uske baad.' },
  ],
},
]);

})();
