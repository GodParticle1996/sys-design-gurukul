/* =====================================================================
   System Gurukul — 📟 Observability aur Kharcha (track pro-obs), hissa 4
   Levels: obs-oncall (incident response), boss-obs (design canvas + twists).
   ===================================================================== */
(() => {
SD.registerLevels('pro-obs', [
/* ---------------------------------------------------------------- O7 */
{
  id: 'obs-oncall',
  icon: '🚒',
  title: 'Raat 3 baje ka incident — kaun kya kare?',
  badge: 'Incident Commander',
  objectives: [
    'Pehle dard roko (<b>mitigate</b>), wajah baad mein',
    'Teen kirdaar: <b>Incident Commander</b>, Ops lead, Comms lead',
    'Severity (SEV1/2/3) jaldi tay karo',
    '<b>Blameless postmortem</b>: insaan nahi, system badlo',
  ],
  lesson: [
    `<h3>🚒 Misaal: aag aur fire brigade</h3>
     <p>Fire brigade pehle aag bujhati hai. Aag kaise lagi, ye jaanch baad mein. Jaanch ke liye aag jalne nahi dete.</p>
     <p>Aur ek commander hota hai jo kaam baant-ta hai. Sab ek saath pipe nahi pakadte.</p>
     <p class="tip">🎯 <b>Asli baat:</b> incident ka pehla lakshya users ka dard rokna (<b>mitigate</b>): rollback, traffic hatao, feature flag band.
       Root cause (asli wajah) baad mein, aaram se.</p>`,
    `<h3>👥 Teen kirdaar</h3>
     <table>
       <tr><th>Kirdaar</th><th>Kaam</th></tr>
       <tr><td><b>Incident Commander (IC)</b></td><td>Faisle aur kaam baant-na. Khud debug nahi karta — poori tasveer dekhta hai.</td></tr>
       <tr><td><b>Ops lead</b></td><td>System par haath: rollback, config, traffic.</td></tr>
       <tr><td><b>Comms lead</b></td><td>Status page, support team, leadership — har 30 minute update.</td></tr>
     </table>
     <p>Ek channel, ek incident doc jismein timeline likhi jaaye. IC thak jaaye toh saaf handoff: "ab IC Priya hai".</p>
     <p>Chhoti team mein ek insaan do kirdaar le sakta hai. Par IC aur debug ek saath karna mushkil hai.</p>`,
    `<h3>🎚️ Severity</h3>
     <table>
       <tr><th>SEV</th><th>Kab</th><th>Kya</th></tr>
       <tr><td><b>SEV1</b></td><td>Paise atke ya bahut users par asar (payments fail)</td><td>Sab haath, status page, har 30 min update</td></tr>
       <tr><td><b>SEV2</b></td><td>Ek feature toota, workaround hai</td><td>On-call + ek madadgar, status page soch ke</td></tr>
       <tr><td><b>SEV3</b></td><td>Chhota asar</td><td>Kaam ke ghanton mein</td></tr>
     </table>
     <p>Severity jaldi tay karo. Shak ho toh upar wali chuno — baad mein neeche karna aasaan hai.</p>`,
    `<h3>📝 Blameless postmortem</h3>
     <ul>
       <li><b>Timeline:</b> kab shuru, kab pata chala, kab mitigate, kab theek.</li>
       <li><b>Asar:</b> kitne users, kitne minute, kitna ₹, kitna error budget.</li>
       <li><b>Wajah aur contributing factors:</b> bug kaise test se bach nikla? Alert der se kyun aaya?</li>
       <li><b>Action items:</b> har item ka owner aur date.</li>
     </ul>
     <p>Sawaal "kisne galti ki" nahi. Sawaal: <b>"system ne galti hone kaise di?"</b> Dosh lagaoge toh log agli baar galti chhupayenge.</p>`,
  ],
  stages: [
    {
      type: 'incident',
      title: '🚨 Raat 2:47 — payments fail ho rahe hain',
      instructions: 'Tum on-call ho. Har kadam par sahi faisla chuno.',
      pager: `<b>#payments-oncall</b> — 2:47 AM<br>
        Burn-rate alert: payment success rate <b>82%</b> (SLO 99.9%). 1 ghante aur 5 minute, dono khidkiyan laal.<br>
        Support: "users bol rahe hain paisa kata par payment fail dikha."`,
      start: 'first',
      nodes: {
        first: {
          text: 'Pehla kadam?',
          choices: [
            { t: 'Incident declare karo, SEV1, khud IC bano, ek channel kholo', good: true, next: 'mitigate', explain: 'Paise atke = SEV1. Declare karne se madad aati hai aur sab ek jagah. Pehle 5 minute ka sabse zaroori kaam.' },
            { t: 'Seedha logs mein ghus jao; akele jaldi theek kar loge', good: false, explain: 'Akele debug mein 40 minute nikal sakte hain, aur kisi ko pata nahi ki kya chal raha hai. Pehle declare karo.' },
            { t: 'Pehle root cause pakka karo, phir kisi ko batao', good: false, explain: 'Wajah dhoondhte-dhoondhte users ka paisa atka rahega. Batana aur rokna pehle.' },
            { t: 'Manager ko call karke unke jawab ka intezaar karo', good: false, explain: 'Manager ko khabar do, par intezaar mat karo. On-call ke paas kaam shuru karne ka haq hai.' },
          ],
        },
        mitigate: {
          sitrep: '📈 Graph: 2:41 par payment-api ka naya deploy. Uske turant baad errors 18%.',
          text: 'Ab kya?',
          choices: [
            { t: 'Turant rollback; deploy aur errors ka samay milta hai', good: true, next: 'comms', explain: 'Deploy ke baad errors = sabse sasta mitigation rollback. Bug dhoondhna kal subah.' },
            { t: 'Naye deploy mein bug dhoondh ke abhi hotfix likho', good: false, explain: 'Raat 3 baje thake dimaag se naya code = naya bug. Pehle purane, chalte version par wapas jao.' },
            { t: 'payment-api ke pods double karo; load badha hoga', good: false, explain: 'Errors deploy ke saath shuru hue, traffic ke saath nahi. Zyada pods mein wahi bug.' },
            { t: 'Pehle status page; system ka kaam uske baad', good: false, explain: 'Comms zaroori hai, par Ops lead ka kaam (rollback) usse rukna nahi chahiye. Dono saath — alag log.' },
          ],
        },
        comms: {
          sitrep: '✅ Rollback 2:58. Success rate wapas 99.9%. Kuch payments "kata par fail" haalat mein.',
          text: 'Grahakon aur team ko kya batana hai?',
          choices: [
            { t: 'Status page: kya hua, kab theek, atke paise ka kya, agla update kab', good: true, next: 'post', explain: 'Users ko sabse zyada chinta atke paise ki hai. Saaf, chhoti baat, aur agle update ka samay.' },
            { t: 'Kuch nahi; theek ho gaya hai, batane se bas panic hoga', good: false, explain: 'Jinke paise atke, unhe jawab chahiye. Chuppi se support tickets aur bharosa dono bigadte hain.' },
            { t: 'Poori technical detail aur deploy karne wale ka naam', good: false, explain: 'Users ko asar aur agla kadam chahiye, naam nahi. Naam dena blameless culture todta hai.' },
            { t: 'Likh do ki partner bank ki galti thi, taaki ChaiPay bach jaaye', good: false, explain: 'Jhooth pakda jaata hai — aur bank partner naraaz. Sach likho.' },
          ],
        },
        post: {
          sitrep: '🗒️ Agle din postmortem meeting.',
          text: 'Postmortem mein kya likhoge?',
          choices: [
            { t: 'Timeline, asar, test kaise chooka, owner + date wale action items', good: true, next: 'end', explain: 'System ka sawaal: test mein kya chhoota, canary kyun nahi pakda. Har action item ka owner aur date.' },
            { t: 'Deploy karne wale developer ka naam aur ek warning', good: false, explain: 'Dosh se log galtiyan chhupate hain. Agli baar incident der se declare hoga.' },
            { t: 'Bas ek line likho: "aage se dhyaan rakhenge"', good: false, explain: '"Dhyaan" koi system badlaav nahi. Wahi galti phir hogi.' },
            { t: 'Postmortem ki zaroorat nahi; rollback se sab theek ho gaya', good: false, explain: 'Rollback ne dard roka, bug abhi bhi code mein hai. Wajah aur sudhaar postmortem mein.' },
          ],
        },
        end: {
          end: true,
          text: 'Incident band. 11 minute mein mitigate.',
          summary: `<b>Seekh:</b> incident mein raftaar faisle se aati hai, akele hero se nahi.
            <br><br><b>Chaar niyam:</b>
            <br>1. Jaldi declare, severity, IC.
            <br>2. Pehle mitigate (rollback, flag), wajah baad mein.
            <br>3. Saaf comms: asar, agla kadam, agla update ka samay.
            <br>4. Blameless postmortem: system badlo, insaan ko dosh mat do.`,
        },
      },
    },
    {
      type: 'order',
      title: 'Incident ke kadam — sahi kram',
      instructions: 'Ek SEV1 incident ke kaam sahi kram mein lagao.',
      steps: [
        { text: 'Incident declare karo aur severity tay karo', explain: 'Declare karte hi madad aur ek channel. Severity se pata chalta hai kitne haath chahiye.' },
        { text: 'IC tay karo; Ops aur Comms ke kirdaar baanto', explain: 'Ek faisla lene wala, baaki apne-apne kaam par.' },
        { text: 'Mitigate: rollback, traffic hatao ya feature flag band', explain: 'Users ka dard rokna sabse pehle.' },
        { text: 'Status page aur support ko update, agle update ka samay', explain: 'Comms lead ka kaam, Ops ke saath-saath.' },
        { text: 'Recovery jaancho: SLO metrics wapas normal?', explain: 'Andaaze se "theek ho gaya" mat bolo. Graph se pakka karo.' },
        { text: 'Blameless postmortem: timeline, asar, wajah, action items', explain: 'Agle din, aaram se. System badlo.' },
      ],
    },
    {
      type: 'quiz',
      title: 'On-call ke faisle',
      questions: [
        {
          q: 'Incident Commander khud debug kyun nahi karta?',
          choices: [
            'IC faisle aur taal-mel sambhalta hai; debug mein poori tasveer chhoot-ti',
            'IC ko technical samajh nahi hoti; isliye debug doosre karte hain',
            'Niyam hai; IC sirf manager ban sakta hai, engineer nahi',
            'Debug ka kaam sirf support team ka hota hai, engineers ka nahi',
          ],
          answer: 0,
          explain: 'Debug mein dhyaan ek jagah atak jaata hai. IC ko dekhna hai: kaun kya kar raha hai, comms gaya ya nahi, kya madad chahiye. Achha engineer bhi IC ban sakta hai — bas us waqt debug nahi karta.',
          choiceExplanations: [
            'Debug mein dhyaan ek jagah atak jaata hai. IC ko dekhna hai: kaun kya kar raha hai, comms gaya ya nahi, kya madad chahiye. Achha engineer bhi IC ban sakta hai — bas us waqt debug nahi karta.',
            'IC aksar senior engineer hi hota hai. Kaam alag hai, samajh nahi.',
            'Koi bhi trained insaan IC ban sakta hai.',
            'Debug engineers ka kaam hai, Ops lead ke saath.',
          ],
        },
        {
          q: 'Rollback se sab theek, par root cause abhi pata nahi. Incident band karoge?',
          choices: [
            'Haan, mitigated; wajah postmortem mein, aur woh deploy tab tak dobara nahi',
            'Nahi; jab tak root cause na mile, incident khula aur sab jaage rahein',
            'Haan, aur wahi deploy kal subah dobara kar do; shayad us raat ka mausam tha',
            'Nahi; pehle saare logs ka backup lo, phir sochna ki band karna hai ya nahi',
          ],
          answer: 0,
          explain: 'Users ka dard ruk gaya = mitigated. Wajah dhoondhna din ka kaam hai. Bas jab tak wajah na mile, woh deploy dobara mat chalao.',
          choiceExplanations: [
            'Users ka dard ruk gaya = mitigated. Wajah dhoondhna din ka kaam hai. Bas jab tak wajah na mile, woh deploy dobara mat chalao.',
            'Thaki team raat bhar jaage toh galtiyan badhti hain. Mitigation ke baad aaram.',
            'Bina wajah jaane wahi deploy = wahi incident.',
            'Logs ka saboot zaroori hai, par usse incident khula rakhne ki zaroorat nahi.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Incident response',
    instructions: 'SRE aur on-call ke sawaal. 🎤',
    questions: [
      {
        q: '"Apne kisi incident ke baare mein batao." Achhe jawab mein kya ho?',
        choices: [
          'Asar, kaise pakda, kaise mitigate kiya, asli wajah, aur system mein kya badla',
          'Kisne galti ki aur usse kya saza mili, taaki seriousness dikhe',
          'Sirf technical bug ki detail; asar aur comms interviewer ko nahi chahiye',
          'Aisa incident chuno jismein koi galti nahi thi, taaki achha lage',
        ],
        answer: 0,
        explain: 'Interviewer dekhna chahta hai: tum dard kaise rokte ho, comms kaise karte ho, aur sabak ko system badlaav mein kaise badalte ho.',
        choiceExplanations: [
          'Interviewer dekhna chahta hai: tum dard kaise rokte ho, comms kaise karte ho, aur sabak ko system badlaav mein kaise badalte ho.',
          'Dosh ki kahani blameless culture ke ulat hai. Ye red flag hai.',
          'Asar aur comms hi seniority dikhate hain.',
          'Bina galti ka incident sikhaata kam hai. Imaandaari zyada achhi lagti hai.',
        ],
      },
      {
        q: 'Har postmortem mein 15 action items, par 3 mahine baad 2 hi poore. Kya karoge?',
        choices: [
          'Kam, asli items; har ek ka owner aur date; review meeting mein track',
          'Aur zyada items likho, taaki kuch toh poore ho jaayein',
          'Action items band karo; postmortem padhna hi kaafi seekh hai',
          'Jo team items poore na kare, uske bonus kaato',
        ],
        answer: 0,
        explain: 'Teen asli items jo poore hon, pandrah adhoore items se behtar. Owner, date aur hafte ki review se items zinda rehte hain.',
        choiceExplanations: [
          'Teen asli items jo poore hon, pandrah adhoore items se behtar. Owner, date aur hafte ki review se items zinda rehte hain.',
          'Zyada items = zyada adhoore items.',
          'Bina badlaav ke wahi incident phir hoga.',
          'Saza se log items chhote likhenge ya chhupayenge.',
        ],
      },
    ],
  },
  success: [
    'Incident declare karke kirdaar baantna',
    'Pehle mitigate, phir wajah',
    'Blameless postmortem aur kaam ke action items likhna',
  ],
  homework: `Apne kisi purane bug ya outage ka chhota postmortem likho (ek page):
    timeline, asar, wajah, kaise test se bacha, aur 3 action items owner aur date ke saath. "Kisne" shabd ek baar bhi mat likho.`,
  cards: [
    { front: 'Incident ka pehla lakshya?', back: 'Mitigate: users ka dard roko (rollback, flag, traffic hatao). Wajah baad mein.' },
    { front: 'Teen kirdaar?', back: 'Incident Commander (faisle), Ops lead (system par haath), Comms lead (status page, updates).' },
    { front: 'Severity ka niyam?', back: 'Jaldi tay karo; shak ho toh upar wali. Neeche karna aasaan hai.' },
    { front: 'Blameless postmortem?', back: '"System ne galti hone kaise di?" — timeline, asar, wajah, owner + date wale action items.' },
  ],
},

/* ---------------------------------------------------------------- BOSS */
{
  id: 'boss-obs',
  icon: '👑',
  title: 'Boss — ChaiPay ka production plan: nazar, alert aur kharcha',
  badge: 'Nigraani Nawab',
  objectives: [
    'Ek design mein: metrics, tracing, alerts, capacity, kharcha aur on-call',
    'Har faisle ki keemat bolna',
    'Interviewer ke twists: Diwali, monitoring ka bill, dependency ka SLO',
  ],
  lesson: [
    `<h3>🏁 Boss: ek plan, chhe faisle</h3>
     <p>ChaiPay payments: <b>3 crore payments/mahina</b>, Diwali peak 2,400/second, 40,000 merchants, SLO 99.9%.</p>
     <table>
       <tr><th>Faisla</th><th>Pichhla level</th></tr>
       <tr><td>Metrics ke labels</td><td>Cardinality</td></tr>
       <tr><td>Tracing aur sampling</td><td>Distributed tracing</td></tr>
       <tr><td>Alerts</td><td>Burn rate</td></tr>
       <tr><td>Servers</td><td>Capacity</td></tr>
       <tr><td>Kharcha</td><td>Bill aur unit cost</td></tr>
       <tr><td>Incident</td><td>On-call</td></tr>
     </table>
     <p class="tip">🎯 Achha production plan har sawaal ka jawab number ke saath deta hai: kitni series, kitna sampling, kab page, kitne servers, ek payment kitne ka.</p>`,
  ],
  stages: [
    {
      type: 'design',
      title: 'Design Canvas — ChaiPay production plan',
      instructions: 'Har slot par sabse theek faisla chuno. Review mein saare options ka "kyun" padho.',
      brief: `ChaiPay payments: 3 crore/mahina, Diwali peak 2,400/second, 40,000 merchants, SLO 99.9%.
        Monitoring ka bill kaabu mein, on-call team raat ko sirf asli dard par jaage, aur har feature ka kharcha dikhe.`,
      requirements: ['SLO 99.9%', 'Peak 2,400/s, ek server mare tab bhi', 'Monitoring bill kaabu mein', 'Bekaar pages nahi'],
      pass: 17,
      slots: [
        {
          id: 'metrics', label: 'Metrics ke labels', icon: '🏷️',
          options: [
            { id: 'bounded', label: 'Route, status, region labels; merchant_id logs mein', score: 3, why: 'Gini-chuni values label mein. Ek merchant ka sawaal logs aur traces se.' },
            { id: 'all', label: 'Har cheez label: merchant_id aur user_id bhi', score: -3, why: 'Series crore mein. Monitoring ki memory aur bill phatega.' },
            { id: 'avg', label: 'Sirf average latency, kam se kam labels rakho', score: -1, why: 'Sasta, par average tail chhupata hai. p99 ke liye histogram chahiye.' },
          ],
        },
        {
          id: 'tracing', label: 'Tracing aur sampling', icon: '🧵',
          options: [
            { id: 'tail', label: 'OpenTelemetry + tail sampling: errors, dheeme, 1%', score: 3, why: 'Har failed aur dheemi payment ka trace bachta hai. Collector ka kharcha manzoor.' },
            { id: 'head', label: 'Sirf 1% head sampling; baaki traces chhod do', score: -1, why: 'Sasta, par 0.05% failed payments ka trace zyadatar nahi milega.' },
            { id: 'none', label: 'Tracing nahi; har service ke logs alag-alag padho', score: -2, why: 'Kai services mein dheemi payment dhoondhna ghanton ka kaam.' },
          ],
        },
        {
          id: 'alerts', label: 'Alerts', icon: '📟',
          options: [
            { id: 'burn', label: 'Burn rate: 14.4× aur 6× par page, 1× par ticket', score: 3, why: 'Budget ki raftaar par page. Do khidkiyan: jaldi pakdo, theek hote hi chup.' },
            { id: 'cpu', label: 'CPU 80% se upar jaate hi on-call ko turant page', score: -2, why: 'CPU cause hai, symptom nahi. Users theek hon tab bhi raat ko page.' },
            { id: 'thresh', label: 'Error rate 1% se upar 5 minute par page', score: -1, why: 'Kam traffic par shor, aur dheema rissaav chhoot jaata hai.' },
          ],
        },
        {
          id: 'capacity', label: 'Diwali ke servers', icon: '🧮',
          options: [
            { id: 'plan', label: 'Peak ÷ (per-server × 60%) + spare, 3 AZ mein', score: 3, why: 'Ek server ya ek AZ jaaye tab bhi peak jhelo. Keemat: zyada servers.' },
            { id: 'avg', label: 'Average traffic ke hisaab se servers gino', score: -3, why: 'Peak average ka kai guna. Diwali par outage.' },
            { id: 'auto', label: 'Autoscaling laga do; spare ki zaroorat nahi', score: -1, why: 'Naya server minton mein aata hai; peak aur failure seconds mein.' },
          ],
        },
        {
          id: 'cost', label: 'Kharche ki nazar', icon: '💹',
          options: [
            { id: 'tags', label: 'Zaroori tags + showback + unit cost dashboard', score: 3, why: 'Har feature ka kharcha dikhe aur ek payment ki keemat roz.' },
            { id: 'month', label: 'Mahine ke ant mein poora bill dekh lenge, bas', score: -2, why: 'Uchhal ek mahine baad pata chalega, aur kis feature se — pata nahi.' },
            { id: 'cut', label: 'Har team ke bill par 10% ka seedha cut', score: -1, why: 'Andha cut: bade kharche wala bach jaata hai, SLO toot sakta hai.' },
          ],
        },
        {
          id: 'oncall', label: 'Incident aur on-call', icon: '🚒',
          options: [
            { id: 'roles', label: 'Rotation, IC/Ops/Comms, blameless postmortem', score: 3, why: 'Faisle saaf, comms saath, aur sabak system mein jaata hai.' },
            { id: 'whoever', label: 'Jo jaaga ho wahi theek kare, bina kirdaar', score: -2, why: 'Sab ek saath debug karte hain, comms koi nahi karta.' },
            { id: 'blame', label: 'Postmortem mein galti karne wale ka naam', score: -3, why: 'Log galtiyan chhupayenge; incident der se declare honge.' },
          ],
        },
      ],
      verdicts: {
        great: '🏆 Har faisla number ke saath: kitni series, kya sampling, kab page, kitne servers, kitne ka payment. Yahi production plan hai.',
        ok: '👍 Zyadatar sahi. Ek faisla kamzor hai — us faisle ka raat 3 baje ka asar socho.',
        bad: '🤔 Kai faisle andaaze par hain. Pichhle levels ke missions dobara dekho: capacity, bill, unit cost.',
      },
    },
    {
      type: 'quiz',
      title: 'Interviewer ke twists',
      questions: [
        {
          q: 'Diwali par traffic 5 guna hone wala hai. Do hafte pehle kya karoge?',
          choices: [
            '5× par load test, capacity plan, risky deploys par rok, pehle se scale-up',
            'Kuch nahi; autoscaling apne aap 5 guna traffic sambhal lega',
            'Diwali ke din saare engineers office mein bula lo, bas',
            'Naye features jaldi launch karo, taaki Diwali par users ko milein',
          ],
          answer: 0,
          explain: 'Pehle naapo (load test), phir plan (capacity + spare), phir risk ghatao (deploy freeze), phir pehle se scale. Din ke liye on-call aur war room bhi.',
          choiceExplanations: [
            'Pehle naapo (load test), phir plan (capacity + spare), phir risk ghatao (deploy freeze), phir pehle se scale. Din ke liye on-call aur war room bhi.',
            'Autoscaling ki bhi hadd hai (quota, DB connections) aur der lagti hai. 5× ka test zaroori.',
            'Log hain par plan nahi. Bina capacity ke log bhi kuch nahi kar sakte.',
            'Naye features = naya risk theek peak ke waqt.',
          ],
        },
        {
          q: 'Monitoring vendor ka bill app ke cloud bill se bhi zyada ho gaya. Kya karoge?',
          choices: [
            'Bina-hadd labels hatao; logs ka volume, retention ghatao; tail sampling',
            'Monitoring band karo; app chal raha hai, dekhne ki zaroorat kam hai',
            'Vendor badlo; doosra vendor sab kuch sasta deta hai',
            'Sabka retention 1 din kar do; purana data kisi kaam ka nahi',
          ],
          answer: 0,
          explain: 'Bill aksar teen jagah se: high-cardinality metrics, bhaari debug logs, aur 100% traces. Teeno ko soch ke kaato; zaroori data (SLO, incidents) bachao.',
          choiceExplanations: [
            'Bill aksar teen jagah se: high-cardinality metrics, bhaari debug logs, aur 100% traces. Teeno ko soch ke kaato; zaroori data (SLO, incidents) bachao.',
            'Andha app = agla incident der se pakda jaayega.',
            'Data ka volume wahi rahega. Jad theek karo.',
            'Postmortem aur trend ke liye kuch data hafton chahiye. Retention data ki kism se tay karo.',
          ],
        },
        {
          q: 'Partner bank ka SLO 99.5% hai. ChaiPay ka payment SLO 99.9% kaise ho sakta hai?',
          choices: [
            'Fallback ho tabhi: doosra bank ya queue; warna 99.5% hi sach hai',
            'Retries laga do; teen retries se 99.5% apne aap 99.9% ban jaata hai',
            'Bank ka SLO hamara SLO nahi; contract mein 99.9% likh do, bas',
            'Monitoring se; zyada dashboards se availability badh jaati hai',
          ],
          answer: 0,
          explain: 'Ek zaroori dependency se zyada available hona mushkil hai. Doosra raasta (doosra bank) ya async (queue) chahiye. Retries sirf choti, alag-alag failures mein madad karte hain; bank poora gira toh retry kaam nahi aata.',
          choiceExplanations: [
            'Ek zaroori dependency se zyada available hona mushkil hai. Doosra raasta (doosra bank) ya async (queue) chahiye. Retries sirf choti, alag-alag failures mein madad karte hain; bank poora gira toh retry kaam nahi aata.',
            'Bank 30 minute gira toh har retry bhi fail. Retries outage ko nahi mitate.',
            'Contract mein likhne se system nahi badalta. Vaada todoge.',
            'Dashboards dekhte hain, theek nahi karte.',
          ],
        },
      ],
    },
  ],
  interview: {
    title: 'Interview Round — Production readiness',
    instructions: 'Aakhri do sawaal. 🎤',
    questions: [
      {
        q: 'Naya service production mein jaane se pehle kya-kya taiyaar ho?',
        choices: [
          'SLO alerts, dashboards, traces, runbook, capacity plan, rollback',
          'Unit tests 90% coverage; baaki sab production mein dekh lenge',
          'Ek bada dashboard jismein har metric ho; alerts baad mein',
          'Sirf load test; agar load test paas toh service taiyaar',
        ],
        answer: 0,
        explain: 'Production readiness = kya naapoge (SLO), kab jagaoge (alerts), kaise dhoondhoge (traces, dashboards), kya karoge (runbook, rollback), kitna chahiye (capacity).',
        choiceExplanations: [
          'Production readiness = kya naapoge (SLO), kab jagaoge (alerts), kaise dhoondhoge (traces, dashboards), kya karoge (runbook, rollback), kitna chahiye (capacity).',
          'Tests code ko jaanchte hain, production ki haalat ko nahi.',
          'Sau metrics ka dashboard raat 3 baje kuch nahi batata. Alerts aur runbook pehle.',
          'Load test ek hissa hai. Alerts, rollback aur runbook bhi chahiye.',
        ],
      },
      {
        q: 'Observability ke teen signals ka kaam ek line mein?',
        choices: [
          'Metrics: kuch gadbad hai; traces: kahan; logs: kya hua us request mein',
          'Teeno ek hi kaam karte hain; jo sasta ho woh rakho',
          'Logs sabse zaroori; metrics aur traces logs se ban jaate hain',
          'Metrics sirf finance ke liye; engineers ko logs chahiye',
        ],
        answer: 0,
        explain: 'Metric alert batata hai dikkat hai. Trace batata hai kis service mein. Log batata hai us request mein kya hua. Teeno trace_id se jude.',
        choiceExplanations: [
          'Metric alert batata hai dikkat hai. Trace batata hai kis service mein. Log batata hai us request mein kya hua. Teeno trace_id se jude.',
          'Har signal alag sawaal ka jawab hai. Ek ko hatane se ek sawaal andha.',
          'Logs se metrics banana mehenga aur dheema. Alerts metrics par.',
          'Metrics engineers ke alerts aur capacity ka aadhar hain.',
        ],
      },
    ],
  },
  success: [
    'Poore production plan ko numbers ke saath design karna',
    'Har faisle ki keemat bolna',
    'Peak, monitoring bill aur dependency SLO ke twists sambhalna',
  ],
  homework: `Apni kisi service ki "production readiness checklist" likho: SLO, alerts (burn rate), dashboards, tracing, runbook, capacity, rollback, kharcha.
    Har line ke saamne likho: hai / nahi / adhoora. Sabse bada "nahi" kaunsa hai?`,
  cards: [
    { front: 'Production plan ke chhe faisle?', back: 'Labels, sampling, alerts, capacity, kharcha, on-call — har ek number ke saath.' },
    { front: 'Dependency ka SLO kam ho toh?', back: 'Tumhara SLO usse zyada tabhi jab fallback (doosra raasta) ya async (queue) ho.' },
    { front: 'Monitoring bill phata?', back: 'High-cardinality labels, bhaari logs, 100% traces — teeno soch ke kaato.' },
    { front: 'Teen signals?', back: 'Metrics: gadbad hai. Traces: kahan. Logs: kya hua. trace_id se jude.' },
  ],
},
]);

/* ---------------------------------------------------------------- VISUALS */
VISUALS['obs-oncall'] = {
  t: 'Incident: declare → mitigate → comms → postmortem',
  html: `
    <div class="dg-flow">
      <span class="dg-pill bad">📟 page 2:47</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">declare SEV1 + IC</span><span class="dg-arrow">→</span>
      <span class="dg-pill acc">rollback 2:58</span><span class="dg-arrow">→</span>
      <span class="dg-pill">status page</span><span class="dg-arrow">→</span>
      <span class="dg-pill good">blameless postmortem</span>
    </div>
    <div class="dg-grid">
      <div class="dg-node is-accent"><span class="ni">🧭</span><span class="nl">Incident Commander</span><span class="ns">faisle, kaam baant-na</span></div>
      <div class="dg-node"><span class="ni">🔧</span><span class="nl">Ops lead</span><span class="ns">rollback, config</span></div>
      <div class="dg-node"><span class="ni">📣</span><span class="nl">Comms lead</span><span class="ns">status page, updates</span></div>
    </div>`,
};
VISUALS['boss-obs'] = {
  t: 'ChaiPay production plan — chhe faisle',
  html: `
    <div class="dg-grid">
      <div class="dg-node"><span class="ni">🏷️</span><span class="nl">Labels</span><span class="ns">gini-chuni; merchant_id logs mein</span></div>
      <div class="dg-node"><span class="ni">🧵</span><span class="nl">Tracing</span><span class="ns">tail sampling: errors + dheeme</span></div>
      <div class="dg-node"><span class="ni">📟</span><span class="nl">Alerts</span><span class="ns">burn rate 14.4× / 6× / 1×</span></div>
      <div class="dg-node"><span class="ni">🧮</span><span class="nl">Capacity</span><span class="ns">60% target + spare, 3 AZ</span></div>
      <div class="dg-node"><span class="ni">💹</span><span class="nl">Kharcha</span><span class="ns">tags + showback + unit cost</span></div>
      <div class="dg-node"><span class="ni">🚒</span><span class="nl">On-call</span><span class="ns">IC/Ops/Comms, blameless</span></div>
    </div>`,
};

SD.addScenes({
  'obs-oncall': {
    intro: 'Raat <b>2:47</b>. Burn-rate alert: payment success rate 82%. Tum on-call ho.',
    nodes: [
      { id: 'page', col: 0, row: 0, icon: '📟', label: 'Page 2:47', sub: 'success 82%', tone: 'bad' },
      { id: 'ic', col: 1, row: 0, icon: '🧭', label: 'Incident Commander', sub: 'SEV1 declare' },
      { id: 'ops', col: 2, row: 0, icon: '🔧', label: 'Ops lead' },
      { id: 'deploy', col: 3, row: 0, icon: '🚀', label: 'payment-api deploy', sub: '2:41 par' },
      { id: 'comms', col: 2, row: 1, icon: '📣', label: 'Comms lead' },
      { id: 'status', col: 3, row: 1, icon: '🌐', label: 'Status page' },
      { id: 'pm', col: 1, row: 1, icon: '📝', label: 'Postmortem', sub: 'agle din' },
    ],
    steps: [
      { from: 'page', to: 'ic', label: 'declare SEV1', say: 'Paise atke, toh SEV1. On-call incident declare karta hai aur khud Incident Commander banta hai. Ek channel khulta hai.' },
      { from: 'ic', to: 'ops', label: 'rollback dekho', say: 'IC kaam baant-ta hai. Ops lead graph dekhta hai: 2:41 par deploy, turant baad errors.' },
      { from: 'ops', to: 'deploy', label: 'rollback', tone: 'good', set: { deploy: { tone: 'good', sub: 'rollback 2:58' } }, say: 'Rollback. 2:58 tak success rate wapas 99.9%. Wajah dhoondhna baad mein.' },
      { from: 'ic', to: 'comms', label: 'users ko batao', say: 'Saath-saath Comms lead: status page aur support ko update.' },
      { from: 'comms', to: 'status', label: 'asar + agla update', tone: 'gold', set: { status: { tone: 'gold', sub: 'atke paise: 24 ghante' } }, say: 'Status page: kya hua, kab theek hua, atke paise ka kya hoga, agla update kab.' },
      { at: ['pm'], set: { pm: { tone: 'good', sub: 'system badlo' } }, say: 'Agle din blameless postmortem: bug test se kaise bacha? Canary kyun nahi pakda? Action items owner aur date ke saath.' },
    ],
  },
  'boss-obs': {
    intro: 'ChaiPay ka production plan. Ek dheemi payment se shuru karke chhe faisle dekho.',
    nodes: [
      { id: 'user', col: 0, row: 0, icon: '📱', label: 'Payment', sub: 'dheemi, 2.4 s', tone: 'accent' },
      { id: 'metric', col: 1, row: 0, icon: '🏷️', label: 'Metrics', sub: 'route, status' },
      { id: 'alert', col: 2, row: 0, icon: '📟', label: 'Burn-rate alert' },
      { id: 'oncall', col: 3, row: 0, icon: '🚒', label: 'On-call IC' },
      { id: 'trace', col: 3, row: 1, icon: '🧵', label: 'Trace', sub: 'tail sampled' },
      { id: 'cap', col: 2, row: 1, icon: '🧮', label: 'Capacity', sub: '60% + spare' },
      { id: 'cost', col: 1, row: 1, icon: '💹', label: 'Unit cost', sub: '₹0.077 / payment' },
    ],
    steps: [
      { from: 'user', to: 'metric', label: 'p99 histogram', say: 'Har payment metric mein: route, status, region labels. merchant_id label nahi, logs mein.' },
      { from: 'metric', to: 'alert', label: 'burn 14.4×', tone: 'bad', say: 'p99 aur errors badhe. Burn rate 14.4×, dono khidkiyan laal.' },
      { from: 'alert', to: 'oncall', label: 'page', tone: 'bad', say: 'On-call ko page. Incident declare, IC, pehle mitigate.' },
      { from: 'oncall', to: 'trace', label: 'sabse lamba span', say: 'Tail sampling ne dheemi payment ka trace bachaya. Sabse lamba span: bank-adapter.' },
      { from: 'trace', to: 'cap', label: 'peak jhela?', say: 'Capacity plan: 60% target aur spare, isliye ek server ki maut bhi incident nahi bani.' },
      { from: 'cap', to: 'cost', label: 'keemat', tone: 'gold', say: 'Har faisle ki keemat unit cost mein dikhti hai: ek payment ka kharcha roz dashboard par.' },
    ],
  },
});

(SD.guidanceExtra = SD.guidanceExtra || []).push(
  { id: 'pro-obs-oncall', levels: 'obs-oncall', guide: {
    title: 'Pehle wajah dhoondho ya pehle dard roko?',
    misaal: 'Fire brigade pehle aag bujhati hai, jaanch baad mein. Ek commander kaam baant-ta hai, sab ek saath pipe nahi pakadte.',
    asli: 'Incident mein pehle mitigate karo, kirdaar baanto, saaf comms karo. Wajah aur sudhaar blameless postmortem mein.',
    points: [
      '<b>Declare jaldi:</b> severity, IC, ek channel.',
      '<b>Mitigate:</b> rollback ya flag; naya hotfix raat ko nahi.',
      '<b>Postmortem:</b> system ka sawaal, owner + date wale items.',
    ],
    use: 'Users ko dard ho aur ek se zyada log kaam par hon.',
    avoid: 'Postmortem mein insaan ka naam aur dosh mat likho.',
    mistake: 'Akele debug karte rehna aur incident declare na karna.',
    compare: [
      { choice: 'Rollback / feature flag', when: 'Badlaav ke baad dikkat shuru hui', tradeoff: 'Tez aur bharosemand; naya feature kuch der band' },
      { choice: 'Raat ko hotfix', when: 'Rollback mumkin nahi (data migration ho chuki)', tradeoff: 'Seedha ilaaj; thake dimaag se naya bug ka risk' },
    ],
    followup: 'Deploy ke saath ek DB migration bhi chali thi, toh rollback se purana code naye schema par chalega. Ab kya?',
    sources: [
      { title: 'Google SRE Book — Managing Incidents', url: 'https://sre.google/sre-book/managing-incidents/' },
      { title: 'Google SRE Book — Postmortem Culture: Learning from Failure', url: 'https://sre.google/sre-book/postmortem-culture/' },
    ],
  } },
  { id: 'pro-obs-boss', levels: 'boss-obs', guide: {
    title: 'Sab kuch naapo, ya sahi cheez naapo?',
    misaal: 'Doctor har test nahi karwata; lakshan dekh ke sahi test. Production plan bhi sahi signals, sahi alerts aur sahi kharche ka hisaab hai.',
    asli: 'Production plan ke chhe faisle — labels, sampling, alerts, capacity, kharcha, on-call — har ek number aur keemat ke saath.',
    points: [
      '<b>Nazar:</b> gini-chuni labels, tail-sampled traces, trace_id se jude logs.',
      '<b>Jagana:</b> burn rate par page; har page par action.',
      '<b>Kharcha:</b> capacity ki keemat aur unit cost roz dikhe.',
    ],
    use: 'Naya service production mein jaa raha ho ya bada peak aane wala ho.',
    avoid: 'Har metric ka dashboard banake maan lena ki observability ho gayi.',
    mistake: 'Dependency ke SLO se zyada SLO ka vaada bina fallback ke.',
    compare: [
      { choice: 'Sab kuch rakho (100% traces, saare labels)', when: 'Chhota system, kam traffic', tradeoff: 'Kuch nahi chhoot-ta; scale par bill aur shor' },
      { choice: 'Chun ke rakho (bounded labels, tail sampling)', when: 'Bada traffic, bill aur on-call ka dhyaan', tradeoff: 'Kam bill, kam shor; chunne ke niyam soch ke banane padte hain' },
    ],
    followup: 'Plan ka bajat aadha ho gaya. Chhe mein se kaunse teen faisle bilkul nahi chhodoge?',
    sources: [
      'signals',
      { title: 'Google SRE Workbook — Alerting on SLOs', url: 'https://sre.google/workbook/alerting-on-slos/' },
      { title: 'Google SRE Book — Managing Incidents', url: 'https://sre.google/sre-book/managing-incidents/' },
    ],
  } },
);
})();
