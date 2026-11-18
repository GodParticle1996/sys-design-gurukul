/* Original practice after the detailed OWVaX_cBrh8 transcript/visual review.
   Source diagrams motivate the questions; runnable examples are our own. */
(function () {
  const q = (question, choices, answer, feedback) => ({q:question,choices,answer,explain:feedback[answer],choiceExplanations:feedback});
  const refs = '<p>References: <a href="https://www.rfc-editor.org/rfc/rfc9110.html#section-15.3.3" target="_blank" rel="noopener noreferrer">HTTP response meanings</a> · <a href="https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html" target="_blank" rel="noopener noreferrer">Transactional outbox</a>. Udaharan hamare apne banaye hue hain.</p>';
  const diagram = (names) => names.map((label,i)=>({id:['client','jobs','db'][i],label,icon:['📱','📋','💾'][i],x:140+i*340,y:120}));
  const nodes = diagram(['Client','Saved jobs','Link DB']);
  const pair = [{id:'client',label:'Client',icon:'📱',x:140,y:120},{id:'db',label:'Link DB',icon:'💾',x:660,y:120}];
  const variables = [{id:'response',label:'Client ko jawab'},{id:'job',label:'Job state'},{id:'mapping',label:'Saved link'},{id:'read',label:'Redirect result'}];
  function walk(title, goal, ns, steps, lesson) {
    return {type:'dryrun',title,goal,nodes:ns,edges:ns.slice(1).map((n,i)=>({from:ns[i].id,to:n.id})),
      viz:{w:ns.length===3?960:800,h:220,mobile:{w:340,h:ns.length===3?625:385,nodes:ns.map((n,i)=>({...n,x:170,y:60+i*240})),hideBadges:true}},
      vars:variables,steps,lesson};
  }
  const step = (title,say,vars,from,to,label,ask) => ({title,say,vars:vars||{},
    nodes:from?{[from]:{tone:'busy'},[to]:{tone:'ok'}}:{},flows:from?[{from,to,label,tone:'acc'}]:[],...(ask?{ask}:{})});
  SD.tracks.unshift({id:'sds-contracts',icon:'🧭',name:'System Design School · Success ka matlab',
    blurb:'Short link kab chalne laayak hai? Queue, database commit aur user ka nateeja alag-alag trace karo. Chaar mukhya levels aur webhook practice. Projects, debugging aur interviews ke liye.',
    certTitle:'CONTRACT DESIGNER',certSub:'Async Work — Practical and Interview',motto:'Har success jawab ka vaada saaf rakho.',
    formula:'User ka vaada → poora hone ki seema → padhne ka raasta → failure se recovery',alwaysUnlocked:true,freeOrder:true});
  const levels = [
    {
      id:'sds-contracts-kyun',icon:'🧾',group:'Success ka matlab',title:'Success 1 · Kyun — created bola, link nahi chala',badge:'Promise Khoji',
      objectives:['"Le liya" (accepted) aur "poora hua" (completed) ka farq pehchaano.','Queue mein save job aur save URL mapping alag trace karo.','Chat ke saved, delivered aur read, teeno haalat alag samjho.'],
      lesson:[
        '<h3>Receipt milna aur khana milna</h3><p>Restaurant ki receipt kehti hai: order le liya. Receipt milne ka matlab khana tayyar nahi. Software mein bhi jawab ka vaada saaf hona chahiye.</p><p><b>Contract</b> = API ka maana hua vaada. Is udaharan mein product kehta hai: "created" bolne ke baad short link turant chalega. User lamba URL deta hai; server <code>abc → https://example.com/menu</code> mapping save karta hai. Mapping = short code aur destination ki jodi.</p>',
        '<h3>Teen alag cheezein dikhti hain</h3><p><b>Accepted:</b> kaam mil gaya. Hamare pakke-job wale udaharan mein pending job save hua. <b>Committed:</b> database ka transaction safal hua. <b>Readable:</b> asli redirect ke raaste ko mapping mil rahi hai.</p><p>Queue mein job hona mapping table mein row hone ke barabar nahi. Primary database par row hona, peeche chal rahi replica par turant row hone ka saboot bhi nahi.</p>',
        '<h3>Response codes ka naam lo</h3><p><code>201 Created</code> = resource bana; is exercise mein vaada hai ki short link ab chalega. <code>202 Accepted</code> = server ne processing ke liye request le li, nateeja baaki hai. <code>302</code> = doosre URL par bhejta hai. Is lab ka <code>404</code> batata hai ki redirect ke read mein mapping nahi mili.</p><p>Sirf 202 number pakki storage, aage ki safalta ya retries ki guarantee nahi deta. Job ki storage aur poora karne ka niyam app ko khud banana hai.</p>',
        '<p>Juda hua video shortener ko queue se database tak le jaata hai. Video ye theek nahi batata ki success jawab kab dena hai. Neeche ka "jaldi success" wala bug hamara apna experiment hai.</p>',refs
      ],
      stages:[
        walk('Queue receipt se toote link tak','Har kadam par andaaza lagao: job save hua, mapping save hui, ya dono? Teer abhi ka likhne wala kaam dikhate hain.',nodes,[
          step('Request aayi','Client abc short code ke liye URL bhejta hai. Is naye run mein koi job ya mapping nahi.',{response:'Abhi nahi',job:'Absent',mapping:'Absent',read:'Abhi nahi'}),
          step('Sirf job save hua','Server pakki jobs table mein pending kaam save karta hai. Worker ne abhi link ki mapping nahi likhi.',{job:'Pending'},'client','jobs','save job'),
          step('Bug: jaldi "created" bola','Server 201 Created bhej deta hai. Jawab tez dikhta hai, par vaada kiya link tayyar nahi.',{response:'201 Created'},null,null,null,
            q('Worker ruka hai. Redirect abhi usi Link DB ko padhega. Kya milega?',['302; save job hi mapping hai','404; mapping abhi nahi hai','202; redirect khud job banayega'],1,
              ['Jobs aur links alag tables hain. Redirect sirf links padhta hai.','Queue ke lene se Link DB mein mapping nahi bani.','Is redirect handler ka kaam job banana nahi.'])),
          step('User ko 404 mila','Redirect query mein abc nahi hai. Ye Link DB se dekha gaya nateeja hai; diagram mein worker ne kuch nahi likha.',{read:'404 — not found'}),
          step('Worker ab commit karta hai','Worker mapping aur "poora hua" haalat save karta hai. Kaam pehle accepted tha; ab poora hua.',{job:'Done',mapping:'abc → menu'},'jobs','db','commit mapping'),
          step('Ab redirect chalta hai','Wahi redirect read ab destination paata hai. Baad mein theek hona pehle diye vaade ko sahi nahi banata.',{read:'302 — destination'},null,null,null,
            q('Bug ka seedha ilaaj kya ho sakta hai?',["Created se pehle commit; ya pending bolo",'Har 404 par client se cache saaf karwao','Queue ka naam badal ke database bolo'],0,
              ['Turant poora karna aur saaf "pending" bolna, dono sahi niyam ho sakte hain.','Client ka cache saaf karne se gayab database row nahi banti.','Hisse ka naam badalne se data dikhna nahi badalta.']))
        ],'Tez jawab tabhi kaam ka hai jab jawab ka vaada sach ho.'),
        {type:'quiz',title:'Chat mein kaunsi haalat saabit hui?',instructions:'Har sawaal mein sirf dikhi hui seema tak hi nateeja nikaalo.',questions:[
          q('Message ka database transaction commit hua. Paane wale ka phone offline hai. Kya keh sakte ho?',['Paane wale ne message padh liya','Paane wale ke device ko message mila','Server ne message save kar liya'],2,
            ['Read receipt ka koi saboot nahi.','Offline device tak pahunchna saabit nahi hua.','Commit server par save hone ka saboot hai; device tak pahunchna alag kadam hai.']),
          q('Push provider ne request le li. Paane wali app se ack nahi aaya. Haalat kya hai?', ["Koshish maani gayi; device ka milna pata nahi",'Device par message pahuncha; padhna pata nahi','Device ne padh liya; receipt abhi baaki hai'],0,
            ['Provider ka lena aur paane wale device ka ack, alag cheezein hain.','Sirf provider ka lena device tak pahunchna saabit nahi karta.','Padhne ke liye paane wale ki taraf ka saboot chahiye.'])
        ]}
      ],
      interview:{title:'Interview · pehle vaada',questions:[q('Shortener ka diagram banane se pehle kaunsa sawaal success ka samay tay karega?', ["Logo ka rang user ko kab dikhana hai?",'Created ke turant baad link chalna chahiye?',"Queue ka dabba diagram mein kis taraf rakhein?"],1,
        ['Brand ka rang likhne/padhne ki consistency tay nahi karta.','"Banate hi padho" ki zaroorat likhne ka poora hona aur read ka raasta, dono par asar daalti hai.','Diagram mein jagah implementation ki guarantee nahi.'])]},
      success:['Job ki receipt ko poore hue nateeje se alag samjha sakte ho.'],cards:[{front:'Accepted, committed, readable?',back:'Accepted: kaam mila. Committed: transaction poora. Readable: chune reader ko nateeja milta hai. Har seema alag jaancho.'}]
    },
    {
      id:'sds-contracts-kaise',icon:'🔀',group:'Success ka matlab',title:'Success 2 · Kaise — ruko ya pending dikhao',badge:'Boundary Designer',
      objectives:['Synchronous create mein client mapping commit hone tak jawab ka intezaar karta hai. Tay karo kis kadam ke baad success dena hai.','Async job ki haalat ki zindagi samjho.','Cache aur replica ke "banate hi padho" wale gap ko pehchaano.'],
      lesson:[
        '<h3>Raasta A: mapping abhi banao</h3><p>Chhoti URL mapping ko transaction mein save karo. Commit safal hone par 201 jawab do. Is lesson ka redirect usi primary database ko padhta hai, isliye commit hui row dikhti hai.</p><p>Analytics jaisa vaikalpik kaam baad mein ho sakta hai. Link chalne ke liye analytics poori hone ka intezaar tabhi karo jab product ki sach mein ye zaroorat ho.</p>',
        '<h3>Raasta B: kaam pending rakho</h3><p>Dheema kaam lena hai, toh pakka job save karo. Client ko 202, operation ID aur status URL do. UI "processing" dikhaye. Worker mapping aur job ki "done" haalat ek hi transaction mein save karta hai. Commit safal ho, tab client ko "done" dikhao. Hamesha ki failure ke liye "failed" haalat aur kaam ka kaaran do.</p><p>Status jawab ki expiry, retry ka niyam aur zyada se zyada intezaar tay karo. Hamari chhoti lab pending/done aur retry hone wali failure dikhati hai; production ka deadline scheduler nahi banati.</p>',
        '<h3>Padhne ka raasta bhi vaade ka hissa hai</h3><p>Replica primary ki copy hai. Copy update hone mein der ho sakti hai. Negative cache = pehle mila "not found" nateeja cache mein rakhna. Dono haalat mein primary commit ke baad bhi redirect purana 404 de sakta hai.</p><p>Naye link ko primary se padho, ya replica par zaroori version tak seemit intezaar karo. Purana "nahi mila" cache hatao, aur pehle se chal rahi request ko purana jawab phir bharne se roko. Asli cache aur replica ke raaste par "banate hi padho" test karo.</p>',refs
      ],
      stages:[
        walk('Raasta A · jawab se pehle commit','Is run mein redirect primary database padhta hai. Link banane ke raaste mein queue zaroori nahi.',pair,[
          step('Naya turant wala run','Naya abc mapping banana hai. Client abhi nateeje ka intezaar kar raha hai.',{response:'Waiting',job:'Not needed',mapping:'Absent',read:'Abhi nahi'}),
          step('Mapping commit','Database mapping save karta hai. Failure hoti, toh "created" jawab nahi bhejte.',{mapping:'abc → menu'},'client','db','commit mapping'),
          step('Created jawab','Safal commit ke baad 201 aur short-link ki location milti hai.',{response:'201 Created'},'db','client','201 Created'),
          step('Turant redirect','Primary read mapping paata hai. Replica ya cache jodoge, toh wahi guarantee dobara test karo.',{read:'302 — destination'},null,null,null,
            q('Link turant chalna chahiye. Analytics ka event bhi baad mein pakka bhejna hai. Analytics service dheemi hai. Link banate waqt kya karo?',["Har redirect ko analytics poori hone tak roko",'Har create ko pending bana do',"Mapping aur niyat ek transaction mein; event retry"],2,
              ['Redirect ko analytics ka intezaar karwana faltu dependency hai.','Analytics dheemi hone se chalne laayak link pending nahi ban jaata.','Mapping commit ho, toh short link chalao. Relay save hui niyat se analytics event baad mein bhejti hai, aur fail ho toh retry karti hai.']))
        ],'Jawab se pehle commit karo, aur asli read ka raasta bhi jaancho.'),
        walk('Raasta B · pending se done tak','Client tab tak nateeja tayyar nahi maanta jab tak job poora hota na dikhe.',nodes,[
          step('Job pakka save hua','Naye run mein sirf pending job save hua. Link DB abhi khaali hai.',{response:'Waiting',job:'Pending',mapping:'Absent',read:'Not ready'},'client','jobs','save job'),
          step('202 aur status ki location','Client ko /jobs/abc mila. UI processing dikhati hai; chalne laayak short link ka vaada abhi nahi.',{response:'202 Accepted'},'jobs','client','202 + status'),
          step('Worker ki retry hone wali failure','Worker ka transaction fail hua. Job pending rehta hai. Mapping aur "done" haalat commit nahi hoti.',{job:'Pending — retry',mapping:'Absent'},null,null,null,
            q('Worker fail hua. Kya client ko "done" bolna surakshit hai?', ['Haan, kyunki 202 pehle mil gaya tha',"Nahi; poora nateeja abhi nahi hai",'Haan, kyunki job ID unique hai'],1,
              ['202 aage ki safalta ka saboot nahi.','Pending aur failed nateeje ko poore se alag rakhna niyam ka hissa hai.','Unique pehchaan kaam poora hona saabit nahi karti.'])),
          step('Retry safal','Worker mapping aur job "done" ek transaction mein save karta hai.',{job:'Done',mapping:'abc → menu'},'jobs','db','commit result'),
          step('Client poora hona dekhta hai','Status "done" ke baad client short link use karta hai. Is sirf-primary model mein redirect 302 deta hai.',{response:'Job status: done',read:'302 — destination'})
        ],'Async workflow mein pending, success aur failure user ko saaf dikhne chahiye.')
      ],
      interview:{title:'Interview · purana read pakdo',questions:[q('Primary par abc row hai. Sirf replica wala redirect 404 deta hai. Agla kya jaancho?', ['Jawab ka label 202 kar do',"Replica ki position aur read ka raasta dekho",'ID encoding Base62 se Base64 kar do'],1,
        ['Label badalne se purane reader ka kaaran nahi samajh aata.','Primary aur replica ka farq replication lag ya routing seedhe jaanchne ka saboot hai.','Encoding badalne se purani row replica par jaldi nahi pahunchti.'])]},
      success:['Poora hone ke do sahi niyam aur unme client ka bartaav samjha sakte ho.'],cards:[{front:'201 ke baad bhi 404 kyun?',back:'Primary commit ke baad peeche chalti replica ya purana "nahi mila" cache padha ja sakta hai. Banana aur asli redirect ka raasta, dono saath test karo.'}]
    },
    {
      id:'sds-contracts-code',icon:'🧪',group:'Success ka matlab',title:'Success 3 · Code — failure khud dobara banao',badge:'Failure Investigator',
      objectives:['Early, sync aur pending runs ke output ka andaaza lagao.','Worker crash par adhoore transaction ka nateeja dekho.','Retry se aaye duplicate event ko consumer par sambhalo.'],
      lesson:[
        '<h3>Apne computer par chalao</h3><p><code>sys-design-gurukul</code> folder mein Node.js 24+ use karo. Har run naya SQLite data use karta hai. Commands HTTP jaise nateeje print karti hain; HTTP server nahi chalati.</p><pre>node practical-labs/async-contracts/run.cjs early\nnode practical-labs/async-contracts/run.cjs sync\nnode practical-labs/async-contracts/run.cjs pending\nnode practical-labs/async-contracts/run.cjs retry\nnode practical-labs/async-contracts/test.cjs</pre><p><a href="practical-labs/async-contracts/README.md" target="_blank" rel="noopener noreferrer">Run guide aur change-it-yourself exercises</a> · <a href="practical-labs/async-contracts/store.cjs" target="_blank" rel="noopener noreferrer">Actual lab code</a></p>',
        '<h3>Pehle andaaza, phir output</h3><p><code>early</code>: 201 ke turant baad 404. <code>sync</code>: 201 ke baad 302. <code>pending</code>: 202, pending job, worker ke baad done aur 302. Har output ke saamne likho: abhi kaunsi pakki row maujood hai?</p>',
        '<h3>Outbox: bhejne ka save hua record</h3><p>Outbox table mein event bhejne ki niyat save hoti hai. Mapping aur niyat ek app transaction mein commit hote hain. Relay save hui niyat padhta hai aur analytics consumer ko pahunchata hai.</p><p>Consumer ne asar laga diya, par bhejne wala apna ack save karne se pehle gir gaya. Retry wahi event dobara la sakti hai. Consumer event ID ko ek hi baar darj kar sakta hai. Nayi ID darj ho, tabhi usi transaction mein counter badhao; ID pehle se darj ho, toh counter wahi rahe. Isi ko idempotency kehte hain: duplicate aane par nateeja dobara nahi badalta.</p>',
        '<p>Lab mein app aur analytics ke alag SQLite databases hain. Test child process ko transaction ke beech mein, aur consumer commit ke baad, achaanak band karta hai. Ye bahar ke broker, bijli jaane ya kai workers ke saath-saath chalne ka test nahi hai.</p>',refs
      ],
      stages:[
        {type:'cards',title:'Return se pehle kya poora hua?',goal:'Asli lab ke createLink() ki shaakhaayein (branches) trace karo. Early wali shaakha jaan-boojh kar galat hai.',
          code:{title:'createLink — actual lab code',file:'practical-labs/async-contracts/store.cjs',from:86,text:"function createLink(store, mode, code, url) {\n  if (mode === 'sync') {\n    store.createNow(code, url);\n    return {status:201, location:'/s/' + code, state:'created'};\n  }\n  if (!['early', 'pending'].includes(mode)) throw Error('Unknown mode');\n  store.enqueue(code, url);\n  if (mode === 'early') return {status:201, location:'/s/' + code, state:'created'}; // Intentional bug.\n  return {status:202, location:'/jobs/' + code, state:'pending'};\n}"},
          steps:[
            {title:'Sync shaakha ka intezaar',say:'createNow() transaction commit hone par laut-ta hai. Failure throw hui, toh 201 wali line chalti hi nahi.',line:[87,88,89]},
            {title:'Async shaakha ki seema',say:'enqueue() sirf pending job save karta hai. Link mapping ke liye worker ka chalna abhi baaki hai.',line:92,
              ask:q('enqueue() safal hua. redirect(abc) wahi database padhe. Worker abhi nahi chala. Nateeja?', ['302, kyunki job commit ho gaya','404, kyunki links ki row nahi hai','500, kyunki har queue async hai'],1,
                ['Jobs ki row aur links ki row alag hain.','Redirect links table se padhta hai. Mapping worker daalega.','Async kaam hona server ke error ka saboot nahi.'])},
            {title:'Jaan-boojh kar galat return',say:'Early shaakha pending kaam ko "created" bolti hai. Galti code ke return wale vaade mein hai.',line:93},
            {title:'Sachcha pending return',say:'Pending shaakha status ki location deti hai. Client poora hona khud jaanchega; 202 aage ki safalta ki guarantee nahi.',line:94}
          ],lesson:'Return value ko us pal tak sach mein poore hue kaam se milaao.'},
        {type:'cards',title:'Consumer ne asar laga diya; bhejne wale ko pata nahi',goal:'Retry se duplicate kyun aata hai? Har kadam par bhejne wale aur consumer ki haalat alag dekho.',
          vars:[{id:'intent',label:'Sender intent'},{id:'seen',label:'Consumer event ID'},{id:'count',label:'Analytics count'}],steps:[
            {title:'Ek local commit',say:'Link mapping aur created:abc ki niyat app DB mein commit hui. Analytics abhi update nahi hui.',vars:{intent:'Unsent',seen:'Absent',count:'0'}},
            {title:'Consumer ka commit',say:'Consumer created:abc ID pehli baar darj karta hai, aur usi transaction mein counter badhata hai.',vars:{seen:'created:abc',count:'1'}},
            {title:'Bhejne wala achaanak band',say:'Bhejne wale ne "sent" ka nishaan abhi save nahi kiya. Restart par wahi niyat "unsent" dikhegi.',vars:{intent:'Still unsent'},
              ask:q('Bhejne wala ab retry karega. Kya delivery theek ek baar hui maan sakte ho?', ['Haan, database transaction use hua tha','Haan, consumer ne ginti badha di',"Nahi; ACK ke gap se duplicate aa sakta hai"],2,
                ['Local transaction dono databases aur delivery ko ek atomic kaam nahi banata.','Consumer ke commit ka pakka ack abhi bhejne wale ke paas nahi.','Retry wahi event ID dobara pahuncha sakti hai.'])},
            {title:'Wahi event ID dobara aayi',say:'Consumer dekhi hui ID pehchaanta hai. Counter 1 hi rehta hai. Dekhi ID aur counter ek transaction mein hain.',vars:{count:'1 — unchanged'}},
            {title:'Bhejne wala pragati save karta hai',say:'Safal retry ke baad bhejne wala niyat ko "sent" maark karta hai. Agle relay pass mein koi pending niyat nahi.',vars:{intent:'Sent'},
              ask:q('Consumer dekhi ID aur counter alag commits mein save kare, toh?', ['Beech ke crash se asar chhoot ya dohra sakta','Wahi event ID hone se dono commits atomic ho jaate','Bhejne wale ka sent nishaan consumer ka transaction hai'],0,
                ['Pehle "dekha" likha toh asar chhoot sakta hai; pehle asar laga toh duplicate lag sakta hai.','ID pehchaan deti hai; alag writes ko atomic nahi banati.','Bhejne wale ki haalat consumer ke local asar ke transaction ki jagah nahi leti.'])}
          ],lesson:'Outbox khoi niyat wala gap bharta hai. Consumer ki idempotency dobara asar wala gap bharti hai.'}
      ],
      interview:{title:'Debugging · saboot ka naam lo',questions:[q('Crash test mein dobara khule DB par mapping nahi, job pending aur outbox khaali hai. Kya saabit hua?', ['Bahar ke broker ne message theek ek baar bheja',"Us band hone ki jagah par adhoora kaam wapas hua",'Har hardware bijli failure surakshit hai'],1,
        ['Test mein koi bahar ka broker nahi.','Test dikhi transaction ki seema jaanchta hai.','Process band hona aur storage ki bijli jaana ek jaisa failure nahi.'])]},
      success:['Umeed wala output, failure ki jagah aur test ki seema samjha sakte ho.'],cards:[{front:'Outbox ke baad bhi duplicates kyun?',back:'Consumer asar laga sakta hai, aur bhejne wala "sent" nishaan se pehle gir sakta hai. Pakki event ID aur consumer par atomic dedupe chahiye.'}]
    },
    {
      id:'sds-contracts-kab',icon:'🎯',group:'Success ka matlab',title:'Success 4 · Kab — template ko haalat ke hisaab se badlo',badge:'Requirement Seeker',
      objectives:['Queue ko thos kaam (workload) se samjhao.','Badi file ke bytes aur job ka metadata alag rakho.','Cache hit par authorization aur media publish ka faisla lo.'],
      lesson:[
        '<h3>Kya har write ko queue chahiye?</h3><p>Chhoti mapping ka naapa hua commit zaroori latency mein fit ho raha hai. Link turant chahiye. Seedha transaction achhi shuruaat hai. Dheema video encoding, retry hone wali email aur ek saath aane wala background kaam, inhe queue se alag process karna kaam ka ho sakta hai.</p><p>Queue ki line badhe, toh poora hone ka intezaar badhta hai. Queue ki kshamata, sabse purane job ki umar, workers ki raftaar aur failures ki ginti dekho. Queue database ke down hone ko be-hadd samay tak bekhatar nahi banati.</p>',
        '<h3>File ka content aur file ka kaam</h3><p>Bade bytes object storage mein rakho. Job mein chhota metadata bhejo: object key, na badalne wala version, checksum aur operation ID. Worker ko saaf pata hona chahiye ki theek kaunse bytes process karne hain.</p><p>Upload poora hona, metadata publish hona aur badla hua video chalne laayak hona, teeno alag haalatein hain. Object storage aur database apne aap ek transaction nahi baant-te. Bekaar (orphan) objects aur gayab jobs sambhalne ka tareeka chahiye.</p>',
        '<h3>Cache hit permission nahi hai</h3><p>Cache mein file milna user ko file padhne ka haq nahi deta. Permission jaanchne ke baad hi bytes do. Cached permission ya signed link use karo, toh tay karo ki permission cheenne ka asar kitni der mein hona chahiye.</p><p>CDN media ke bytes users ke paas se de sakta hai. App metadata, access ke faisle aur chalne layak manifest sambhal sakti hai. Har video segment app server se guzarna har jagah ki zaroorat nahi.</p>',
        '<p>Upload reference: <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html" target="_blank" rel="noopener noreferrer">Multipart upload lifecycle</a>. Practice ke liye Bitly, Dropbox, WhatsApp aur video-service lessons ke source chapters bhi dekho.</p>'
      ],
      stages:[
        {type:'quiz',title:'Zaroorat se design chuno',instructions:'Har chunaav ke saath failure ka tareeka aur gayab saboot dekho.',questions:[
          q('Chhota link write naape latency budget mein fit hai. User turant share karega. Pehla seedha design?', ['Pehle queue; created jawab turant',"Mapping commit karo; redirect ko dikhne do",'Encoding worker poora hone tak ruko'],1,
            ['Async lena ho sakta hai, par "created matlab chalne laayak" vaade ke liye poora hone ki seema suljhani padegi.','Zaroori nateeja chhota aur samay par hai. Queue zaroori nahi.','URL mapping ke liye video encoding worker faltu dependency hai.']),
          q('Kai GB ka video background encoding mein bhejna hai. Queue job mein kaam ka payload?', ['Har retry message mein poori movie andar','Bina version ka badalne wala filename','Na badalne wala object reference aur job metadata'],2,
            ['Bade bytes har retry mein dobara transfer aur broker ki hadd ki dikkat bana sakte hain.','Filename ke upar likha ja sakta hai; worker galat bytes process kar sakta hai.','Pakki pehchaan se worker sahi object laa ke jaanch sakta hai.']),
          q('File ka cache hit hai. User ki permission cheeni ja chuki hai. Bytes bhejne se pehle?', ["Bytes se pehle abhi ka access niyam jaancho",'Cache hit ko purani permission ka saboot maano','Pehle bytes bhejo; metadata baad mein jaancho'],0,
            ['Object maujood hona aur authorization alag jaanch hain. Zaroori cheenne ki taazgi laagu karo.','Cache ke bytes user ka abhi ka haq saabit nahi karte.','Sensitive bytes bhejne ke baad permission mana karna nuksaan wapas nahi leta.']),
          q('Database 10 minute down tha. Queue ke sabse purane job ki umar badh rahi hai. Wapas aane ke baad kya naapo?', ['Sirf database ka process chal raha hai ya nahi',"Aane/poore jobs ki raftaar, purana intezaar, errors",'Sirf sabse naye queue message ka size'],1,
            ['Database chalu hona line khatam hone ka saboot nahi.','Har second kitne jobs aaye aur kitne poore hue, ye gino. Poore hone ki raftaar zyada ho, toh ruka kaam ghatega. Sabse purana ruka job kitni der se wait kar raha hai aur kitni retries fail hui, ye bhi dekho.','Ek message ka size line ke intezaar ka poora ishaara nahi.'])
        ]},
        {type:'cards',title:'Upload se chalne laayak tak','goal':'Media workflow. Ek poori haalat ko agli haalat ka saboot mat banao.',steps:[
          {title:'Parts upload hue',say:'Multipart upload mein parts alag-alag aa sakte hain; fail hua part phir bhejo. Saare parts aane ke baad S3 ka CompleteMultipartUpload safal hona chahiye, tabhi aakhri object banta hai. Adhoora upload chhodna ho, toh us upload ID ke parts abort karo ya lifecycle rule se saaf karo.'},
          {title:'Object poora aur pehchaana gaya',say:'Upload poora hone ke baad theek object/version jaancho. Ab metadata aur processing ki niyat database mein publish karne ka kadam aata hai.'},
          {title:'Metadata transaction fail hua',say:'Object ke bytes bach sakte hain, par processing job nahi bana. Milaan (reconciliation) pending upload record aur object ki pehchaan milaa ke retry ya safai tay kar sakta hai.',ask:q('Blob storage aur metadata DB alag hain. Sirf DB transaction kya guarantee deta hai?', ['Object upload aur DB commit dono atomic hain',"Sirf transaction ke DB badlaav atomic hain",'Har bekaar object apne aap delete hoga'],1,
            ['Do systems ke kaam ek local DB transaction se atomic nahi bante.','Kai systems ka poora hona aur safai alag workflow maangte hain.','Safai ka niyam aur uska chalna khud banana padega.'])},
          {title:'Encoding poori; publish baaki',say:'Zaroori media outputs aur manifest tayyar hone ke baad "chalne laayak" haalat publish karo. CDN par milna aur access ka niyam jaancho. Upload accept hone ko chalne laayak mat kaho.'}
        ],lesson:'Haalat ke naam user ko agla sahi kadam batayein: uploading, processing, playable ya failed.'}
      ],
      interview:{title:'Interview · chunaav aur tradeoff',questions:[q('Interviewer poochta hai: kya ek hi template chat aur Netflix dono mein chalega? Sabse achha jawab?', ['Wahi dabbe bana ke poora maan lo',"Dono kaamon ke liye ek hi NoSQL chuno","Hisse dobara use karo; guarantees alag tay karo"],2,
        ['Chat delivery aur media processing ke poora hone ki seemaayein alag hain.','Storage ka chunaav queries, consistency aur scale se samjhana chahiye.','Dobara use hone wale hisse kaam ke hain; sahi-galat phir bhi kaam ke hisaab ke niyam tay karte hain.'])]},
      success:['Template ko zaroorat, failure aur saboot ke hisaab se badal sakte ho.'],cards:[{front:'Architecture diagram ke baad agla sawaal?',back:'Har teer par kya data jaata hai? Bhejne wala success kab bolta hai? Failure ke baad kaun retry karta hai? Padhne wale ko nateeja kab dikhta hai?'}]
    }
  ];
  for (const level of levels) VISUALS[level.id]={t:'Job acceptance aur result storage alag boundaries hain',html:SD.viz.svg(nodes,[{from:'client',to:'jobs'},{from:'jobs',to:'db'}],{},{w:960,h:220})};
  SD.registerLevels('sds-contracts',levels);
  SD.guidance.topics['sds-contracts']={title:'Success jawab ka theek vaada tay karo',
    misaal:'Restaurant ki receipt order lena dikhati hai. Khana tayyar hona aur grahak ko parosna alag haalatein hain.',
    asli:'Request lena, database commit, nateeja padhne laayak hona aur device ka ack, ye alag seemaayein hain.',
    points:['<b>Vaada:</b> 201 ke liye zaroori resource ban chuka ho; pending kaam ke liye 202 aur poora hone ka status do.','<b>Padhne ka raasta:</b> primary commit ke baad replica/cache ka bartaav jaancho.','<b>Recovery:</b> pakki niyat aur duplicate sambhalna alag-alag test karo.'],
    use:'Shorteners, chat delivery, background jobs aur media-processing workflows.',avoid:'Seedhe, samay par hone wale writes mein queue jodne se pehle thos faayda aur poora hone ki keemat dekho.',
    mistake:'Queue ki receipt ko chalne laayak nateeja ya device ki receipt samajh lena.',
    compare:[{choice:'Commit before created',when:'Chhota nateeja turant use karna hai',tradeoff:'Client commit ki der tak rukta hai; read mein dikhna bhi pakka karo'},{choice:'Accepted plus status',when:'Kaam dheema hai ya background mein poora ho sakta hai',tradeoff:'Pending/failure UI, pakke jobs aur poora hone ki nigrani chahiye'}],
    followup:'Worker nateeja commit karke jawab se pehle gir gaya. Retry wahi logical kaam kaise pehchaane?',
    sources:[{title:'HTTP response semantics',url:'https://www.rfc-editor.org/rfc/rfc9110.html#section-15.3.3'},{title:'Transactional outbox',url:'https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html'}],levels:levels.map(l=>l.id)};
  levels.forEach(l=>{SD.guidance.byLevel[l.id]='sds-contracts';});
})();
