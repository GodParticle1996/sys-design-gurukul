/* Original practice after the detailed OWVaX_cBrh8 transcript/visual review.
   Source diagrams motivate the questions; runnable examples are our own. */
(function () {
  const q = (question, choices, answer, feedback) => ({q:question,choices,answer,explain:feedback[answer],choiceExplanations:feedback});
  const refs = '<p>References: <a href="https://www.rfc-editor.org/rfc/rfc9110.html#section-15.3.3" target="_blank" rel="noopener noreferrer">HTTP response meanings</a> · <a href="https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html" target="_blank" rel="noopener noreferrer">Transactional outbox</a>. Examples independently banaye gaye hain.</p>';
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
    blurb:'Short link kab usable hai? Queue, database commit aur user ke result ko alag trace karo. Chaar core levels aur webhook practice. Projects, debugging aur interviews ke liye.',
    certTitle:'CONTRACT DESIGNER',certSub:'Async Work — Practical and Interview',motto:'Har success response ka promise clear rakho.',
    formula:'User ka promise → completion boundary → read path → failure recovery',alwaysUnlocked:true,freeOrder:true});
  const levels = [
    {
      id:'sds-contracts-kyun',icon:'🧾',group:'Success ka matlab',title:'Success 1 · Kyun — created bola, link nahi chala',badge:'Promise Khoji',
      objectives:['Accepted aur completed ka farq pehchaano.','Queue mein saved job aur saved URL mapping alag trace karo.','Chat ke saved, delivered aur read states alag samjho.'],
      lesson:[
        '<h3>Receipt milna aur order milna</h3><p>Restaurant ki receipt bolti hai: order le liya. Receipt milne ka matlab khana ready nahi hai. Software mein bhi response ka promise clear hona chahiye.</p><p><b>Contract</b> ka matlab API ka agreed promise. Is example mein product kehta hai: short link created bolne ke baad link turant use ho sakega. User long URL deta hai; server <code>abc → https://example.com/menu</code> mapping save karta hai. Mapping short code aur destination ka pair hai.</p>',
        '<h3>Teen alag observations</h3><p><b>Accepted:</b> kaam receive hua. Hamare durable-job example mein pending job save hui hai. <b>Committed:</b> database transaction successful hui. <b>Readable:</b> actual redirect path ko mapping mil rahi hai.</p><p>Queue mein job hona mapping table mein row hone ke barabar nahi. Primary database par row hone se lagging replica par row turant hone ka proof bhi nahi milta.</p>',
        '<h3>Response codes ko naam do</h3><p><code>201 Created</code>: resource create ho chuka hai. <code>202 Accepted</code>: processing accept hui, abhi complete nahi. <code>302</code>: is lab ka redirect destination mila. <code>404</code>: requested mapping nahi mili.</p><p>Sirf 202 number durable storage, eventual success ya retries guarantee nahi karta. Job storage aur completion policy application ko banani hai.</p>',
        '<p>Related video shortener ko queue se database tak le jaata hai. Video exact success-response timing specify nahi karta. Neeche ka early-success bug hamara original experiment hai.</p>',refs
      ],
      stages:[
        walk('Queue receipt se broken link tak','Har step par predict karo: job saved hai, mapping saved hai, ya dono? Arrows current write action dikhate hain.',nodes,[
          step('Request aayi','Client abc short code ke liye URL bhejta hai. Is fresh run mein koi job ya mapping nahi.',{response:'Abhi nahi',job:'Absent',mapping:'Absent',read:'Abhi nahi'}),
          step('Sirf job save hui','Server durable jobs table mein pending work save karta hai. Worker ne link mapping abhi nahi likhi.',{job:'Pending'},'client','jobs','save job'),
          step('Bug: created jaldi bola','Server 201 Created bhej deta hai. Response ki speed achhi dikhti hai, lekin promised link ready nahi.',{response:'201 Created'},null,null,null,
            q('Worker paused hai. Redirect same Link DB ko abhi padhega. Kya milega?',['302; saved job hi mapping hai','404; mapping abhi absent hai','202; redirect khud job banayega'],1,
              ['Jobs aur links alag tables hain. Redirect sirf links padhta hai.','Queue acceptance se Link DB mein mapping nahi bani.','Is redirect handler ka contract job create karna nahi hai.'])),
          step('User ko 404 mila','Redirect query mein abc absent hai. Yeh observation Link DB ki hai; diagram mein koi worker write nahi hui.',{read:'404 — not found'}),
          step('Worker ab commit karta hai','Worker mapping aur completion state save karta hai. Kaam pehle accepted tha; ab complete hua.',{job:'Done',mapping:'abc → menu'},'jobs','db','commit mapping'),
          step('Ab redirect chalta hai','Same redirect read ab destination paata hai. Baad mein fix hona pehle diye promise ko sahi nahi banata.',{read:'302 — destination'},null,null,null,
            q('Bug ka seedha repair kya ho sakta hai?',['Created se pehle commit; ya pending contract do','Client ko har 404 par cache clear karwao','Queue ko rename karke database bolo'],0,
              ['Synchronous completion aur explicit asynchronous pending dono valid contracts ho sakte hain.','Client cache clear karne se missing database row nahi banti.','Component ka naam badalne se data visibility nahi badalti.']))
        ],'Fast response tab useful hai jab response ka promise sach ho.'),
        {type:'quiz',title:'Chat mein kaunsi state prove hui?',instructions:'Har question mein sirf observed boundary tak conclusion nikalo.',questions:[
          q('Message database transaction commit hui. Recipient ka phone offline hai. Kya keh sakte ho?',['Recipient ne message padh liya','Recipient device ne message receive kiya','Server ne message save kar liya'],2,
            ['Read receipt ka evidence nahi hai.','Offline device tak delivery prove nahi hui.','Commit server-side save ka evidence hai; device delivery alag step hai.']),
          q('Push provider ne request accept ki. Recipient app se acknowledgement nahi aaya. State?', ['Notification attempt accepted; device receipt unknown','Device par message delivered; read unknown','Device ne read kar liya; receipt pending'],0,
            ['Provider acceptance aur recipient device acknowledgement alag observations hain.','Provider acceptance akela device delivery prove nahi karta.','Read state ke liye recipient-side evidence chahiye.'])
        ]}
      ],
      interview:{title:'Interview · promise pehle',questions:[q('Shortener diagram banane se pehle kaunsa sawaal success timing decide karega?', ['Logo ka colour kya hai?','Created ke turant baad link usable hona chahiye?','Queue box left mein hoga ya right?'],1,
        ['Brand colour write/read consistency decide nahi karta.','Read-after-create requirement write completion aur read routing dono ko affect karti hai.','Drawing position implementation guarantee nahi hai.'])]},
      success:['Job receipt ko completed result se alag explain kar sakte ho.'],cards:[{front:'Accepted, committed, readable?',back:'Accepted: work receive hua. Committed: transaction complete. Readable: chosen reader ko result milta hai. Har boundary alag verify karo.'}]
    },
    {
      id:'sds-contracts-kaise',icon:'🔀',group:'Success ka matlab',title:'Success 2 · Kaise — wait karo ya pending dikhao',badge:'Boundary Designer',
      objectives:['Synchronous create ka response boundary choose karo.','Async job status ka lifecycle samjho.','Cache aur replica ke read-after-create gap ko pehchaano.'],
      lesson:[
        '<h3>Option A: mapping abhi banao</h3><p>Small URL mapping ko transaction mein save karo. Commit successful hone par 201 response do. Is lesson ka redirect same primary database padhta hai, isliye committed row visible hai.</p><p>Optional analytics baad mein ho sakti hai. Link usable hone ke liye analytics complete hone ka wait tabhi chahiye jab product ka actual requirement ho.</p>',
        '<h3>Option B: kaam pending rakho</h3><p>Slow work accept karna ho toh durable job save karo. Client ko 202, operation ID aur status URL do. UI “processing” dikhaye. Worker successful commit ke baad status done kare. Permanent failure ke liye failed state aur useful reason do.</p><p>Status response ki expiry, retry policy aur maximum wait define karo. Hamari small lab pending/done aur retryable failure dikhati hai; production deadline scheduler implement nahi karti.</p>',
        '<h3>Read path bhi promise ka hissa hai</h3><p>Replica primary ki copy hai. Copy update hone mein delay ho sakta hai. Negative cache ka matlab pehle mila “not found” result cache mein rakhna. Dono cases mein primary commit ke baad bhi redirect stale 404 de sakta hai.</p><p>New link ke reads primary par route karna, version catch-up tak bounded wait, ya stale negative entry hataana possible policies hain. Actual cache aur replica path par read-after-create test karo.</p>',refs
      ],
      stages:[
        walk('Option A · response se pehle commit','Is run mein redirect primary database padhta hai. Queue critical creation path mein required nahi.',pair,[
          step('Naya synchronous run','Fresh abc mapping banana hai. Client abhi result ka wait kar raha hai.',{response:'Waiting',job:'Not needed',mapping:'Absent',read:'Abhi nahi'}),
          step('Mapping commit','Database mapping save karta hai. Failure hoti toh created response nahi bhejte.',{mapping:'abc → menu'},'client','db','commit mapping'),
          step('Created response','Successful commit ke baad 201 aur short-link location milte hain.',{response:'201 Created'},'db','client','201 Created'),
          step('Immediate redirect','Primary read mapping paata hai. Replica ya cache add karoge toh wahi guarantee dobara test karo.',{read:'302 — destination'},null,null,null,
            q('Analytics service slow hai. Link already committed hai. Kya zaroori hai?',['Har redirect analytics ka wait kare','Har create ko pending bana do','Required analytics intent save karo; delivery retry alag rakho'],2,
              ['Analytics agar optional side work hai toh redirect ko rokna unnecessary dependency hai.','Analytics slow hone se already usable link pending nahi ban jaata.','Business row aur event intent ek local transaction mein save kar sakte ho; external delivery alag retry hoti hai.']))
        ],'Commit-before-response ke saath actual read path bhi verify karo.'),
        walk('Option B · pending se done tak','Client tab tak result ready assume nahi karta jab tak job completion na dikhe.',nodes,[
          step('Job durably save hui','Fresh run mein only pending job save hui. Link DB abhi empty hai.',{response:'Waiting',job:'Pending',mapping:'Absent',read:'Not ready'},'client','jobs','save job'),
          step('202 aur status location','Client ko /jobs/abc diya. UI processing dikhati hai; usable short link ka promise abhi nahi.',{response:'202 Accepted'},'jobs','client','202 + status'),
          step('Worker ki retryable failure','Worker transaction fail hui. Job pending rehti hai. Mapping aur done state commit nahi hoti.',{job:'Pending — retry',mapping:'Absent'},null,null,null,
            q('Worker fail hua. Client ko done bolna safe hai?', ['Haan, kyunki 202 pehle mil gaya','Nahi; completed result abhi absent hai','Haan, kyunki job ID unique hai'],1,
              ['202 future success ka proof nahi hai.','Pending aur failed result ko completed se alag rakhna contract ka part hai.','Unique identity work completion prove nahi karti.'])),
          step('Retry successful','Worker mapping aur job done ek transaction mein save karta hai.',{job:'Done',mapping:'abc → menu'},'jobs','db','commit result'),
          step('Client completion dekhta hai','Status done ke baad client short link use karta hai. Is primary-only model mein redirect 302 deta hai.',{response:'Job status: done',read:'302 — destination'})
        ],'Async workflow mein pending, success aur failure user ko clearly dikhne chahiye.')
      ],
      interview:{title:'Interview · stale read diagnose karo',questions:[q('Primary par abc row hai. Sirf replica-backed redirect 404 deta hai. Agla check?', ['Response label ko 202 kar do','Replica applied position aur read routing inspect karo','ID encoding Base62 se Base64 kar do'],1,
        ['Label change actual stale reader ka reason nahi samjhaata.','Primary/replica difference replication lag ya routing ko directly investigate karne ka evidence hai.','Encoding badalne se existing row replica par jaldi nahi pahunchti.'])]},
      success:['Do valid completion contracts aur unka client behavior explain kar sakte ho.'],cards:[{front:'201 ke baad bhi 404 kyun?',back:'Primary commit ke baad lagging replica ya stale negative cache read ho sakta hai. Creation aur actual redirect path ko saath test karo.'}]
    },
    {
      id:'sds-contracts-code',icon:'🧪',group:'Success ka matlab',title:'Success 3 · Code — failure khud reproduce karo',badge:'Failure Investigator',
      objectives:['Early, sync aur pending runs ka output predict karo.','Worker crash par partial transaction ka result inspect karo.','Retry ke duplicate event ko consumer par handle karo.'],
      lesson:[
        '<h3>Apne computer par run karo</h3><p><code>sys-design-gurukul</code> folder mein Node.js 24+ use karo. Har run fresh SQLite data use karta hai. Commands HTTP-style results print karti hain; HTTP server nahi chalati.</p><pre>node practical-labs/async-contracts/run.cjs early\nnode practical-labs/async-contracts/run.cjs sync\nnode practical-labs/async-contracts/run.cjs pending\nnode practical-labs/async-contracts/run.cjs retry\nnode practical-labs/async-contracts/test.cjs</pre><p><a href="practical-labs/async-contracts/README.md" target="_blank" rel="noopener noreferrer">Run guide aur change-it-yourself exercises</a> · <a href="practical-labs/async-contracts/store.cjs" target="_blank" rel="noopener noreferrer">Actual lab code</a></p>',
        '<h3>Prediction pehle, output baad mein</h3><p><code>early</code>: 201 ke turant baad 404. <code>sync</code>: 201 ke baad 302. <code>pending</code>: 202, pending job, worker ke baad done aur 302. Har output ke saamne likho: kaunsi durable row abhi exist karti hai?</p>',
        '<h3>Outbox: bhejne ka saved record</h3><p>Outbox table mein event bhejne ka intent save hota hai. Mapping aur intent ek application transaction mein commit hote hain. Relay saved intent padhta hai aur analytics consumer ko deliver karta hai.</p><p>Consumer ne apply kar diya, lekin sender acknowledgement save karne se pehle fail hua. Retry same event dubara la sakti hai. Consumer event ID aur actual counter update apni ek transaction mein save karta hai. Yeh idempotency hai: duplicate se result dobara change nahi hota.</p>',
        '<p>Lab mein application aur analytics alag SQLite databases hain. Test child process ko transaction ke beech aur consumer commit ke baad abruptly exit karta hai. Yeh external broker, power loss ya multi-worker concurrency ka test nahi hai.</p>',refs
      ],
      stages:[
        {type:'cards',title:'Return se pehle kya complete hua?',goal:'Actual lab ke createLink() branches trace karo. Early branch intentionally wrong hai.',
          code:{title:'createLink — actual lab code',file:'practical-labs/async-contracts/store.cjs',from:86,text:"function createLink(store, mode, code, url) {\n  if (mode === 'sync') {\n    store.createNow(code, url);\n    return {status:201, location:'/s/' + code, state:'created'};\n  }\n  if (!['early', 'pending'].includes(mode)) throw Error('Unknown mode');\n  store.enqueue(code, url);\n  if (mode === 'early') return {status:201, location:'/s/' + code, state:'created'}; // Intentional bug.\n  return {status:202, location:'/jobs/' + code, state:'pending'};\n}"},
          steps:[
            {title:'Sync branch ka wait',say:'createNow() transaction commit hone par return karta hai. Failure throw hui toh 201 wali line execute nahi hoti.',line:[87,88,89]},
            {title:'Async branch ki boundary',say:'enqueue() sirf pending job save karta hai. Link mapping ke liye worker abhi chalna baaki hai.',line:92,
              ask:q('enqueue() successful hua. redirect(abc) same database padhe. Worker abhi nahi chala. Result?', ['302, kyunki job commit hui','404, kyunki links row absent hai','500, kyunki har queue async hai'],1,
                ['Jobs row aur links row alag hain.','Redirect links table query karta hai. Worker mapping insert karega.','Async work hona server exception ka evidence nahi.'])},
            {title:'Intentional wrong return',say:'Early branch pending work ko created bolti hai. Problem code ke return contract mein hai.',line:93},
            {title:'Truthful pending return',say:'Pending branch status location deti hai. Client completion check karega; 202 future success guarantee nahi karta.',line:94}
          ],lesson:'Return value ko us point tak actually completed work se match karo.'},
        {type:'cards',title:'Consumer apply kar chuka; sender ko pata nahi',goal:'Retry se duplicate delivery kyun aati hai? Har step par sender aur consumer state alag dekho.',
          vars:[{id:'intent',label:'Sender intent'},{id:'seen',label:'Consumer event ID'},{id:'count',label:'Analytics count'}],steps:[
            {title:'One local commit',say:'Link mapping aur created:abc intent application DB mein commit hue. Analytics abhi update nahi hui.',vars:{intent:'Unsent',seen:'Absent',count:'0'}},
            {title:'Consumer commit',say:'Consumer created:abc ID aur counter update apni transaction mein save karta hai.',vars:{seen:'created:abc',count:'1'}},
            {title:'Sender abruptly exits',say:'Sender ne sent flag abhi save nahi kiya. Restart par same intent unsent dikhega.',vars:{intent:'Still unsent'},
              ask:q('Sender ab retry karega. Delivery exactly once hui maan sakte ho?', ['Haan, database transaction use hui thi','Haan, consumer ne count badha diya','Nahi; acknowledgement gap duplicate la sakta hai'],2,
                ['Local transaction dono databases aur delivery ko ek atomic operation nahi banati.','Consumer commit ke baare mein sender ko durable acknowledgement abhi nahi hai.','Retry same event ID dubara deliver kar sakti hai.'])},
            {title:'Same event ID dubara aayi',say:'Consumer seen ID pehchaanta hai. Counter 1 hi rehta hai. Seen ID aur counter ek transaction mein hain.',vars:{count:'1 — unchanged'}},
            {title:'Sender progress save karta hai',say:'Successful retry ke baad sender intent sent mark karta hai. Next relay pass mein pending intent nahi.',vars:{intent:'Sent'},
              ask:q('Consumer seen ID aur counter ko alag commits mein save kare toh?', ['Beech mein crash se lost ya repeated effect ho sakta hai','Same event ID hone se dono commits atomic ho jaate hain','Sender ka sent flag consumer transaction replace karta hai'],0,
                ['Mark-seen-before-effect par effect miss ho sakta hai; effect-before-mark par duplicate apply ho sakti hai.','ID identity deta hai; separate writes ko atomic nahi banata.','Sender state consumer ki local effect transaction replace nahi karti.'])}
          ],lesson:'Outbox lost intent ka gap address karta hai. Consumer idempotency duplicate effect ka gap address karti hai.'}
      ],
      interview:{title:'Debugging · proof ko naam do',questions:[q('Crash test mein reopened DB par mapping absent, job pending aur outbox empty hai. Kya prove hua?', ['External broker ne message exactly once deliver kiya','Us process-exit point par uncommitted transaction recover hui','Har hardware power failure safe hai'],1,
        ['Test mein external broker nahi hai.','Test observed transaction boundary ko verify karta hai.','Process exit storage hardware power loss ka same failure nahi hai.'])]},
      success:['Expected output, failure point aur test boundary explain kar sakte ho.'],cards:[{front:'Outbox ke baad duplicates kyun?',back:'Consumer apply kar sakta hai aur sender sent flag se pehle fail ho sakta hai. Stable event ID aur atomic consumer deduplication chahiye.'}]
    },
    {
      id:'sds-contracts-kab',icon:'🎯',group:'Success ka matlab',title:'Success 4 · Kab — template ko situation se badlo',badge:'Requirement Seeker',
      objectives:['Queue ko concrete workload se justify karo.','Large file bytes aur job metadata alag rakho.','Cache hit par authorization aur media publication ka decision lo.'],
      lesson:[
        '<h3>Har write ko queue chahiye?</h3><p>Small mapping ka measured commit required latency mein fit ho raha hai. Immediate link use chahiye. Direct transaction reasonable starting point hai. Slow video encoding, retryable email aur bursty background work ko queue se independently process karna useful ho sakta hai.</p><p>Queue ka backlog badhe toh completion wait badhta hai. Queue capacity, oldest-job age, worker throughput aur failure count monitor karo. Queue database outage ko unlimited time tak harmless nahi banaati.</p>',
        '<h3>File ka content aur file ka kaam</h3><p>Large bytes object storage mein rakho. Job mein object key, immutable version, checksum aur operation ID jaise small metadata bhejo. Worker ko exactly kaunsi bytes process karni hain, clear hona chahiye.</p><p>Upload complete hona, metadata publish hona aur converted video playable hona alag states hain. Object storage aur database automatically ek transaction share nahi karte. Orphan objects aur missing jobs recover karne ka process chahiye.</p>',
        '<h3>Cache hit permission nahi hai</h3><p>Cached file milna user ko file padhne ka right nahi deta. Permission check ke baad hi bytes release karo. Cached permission aur signed link use karte ho toh revocation kitni der mein effective honi chahiye, define karo.</p><p>CDN media bytes users ke paas serve kar sakta hai. Application metadata, access decisions aur playable manifest handle kar sakti hai. Har video segment ko application server se pass karna universal requirement nahi.</p>',
        '<p>Upload reference: <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html" target="_blank" rel="noopener noreferrer">Multipart upload lifecycle</a>. Implementation practice ke liye existing Bitly, Dropbox, WhatsApp aur video-service lessons ke source chapters bhi dekho.</p>'
      ],
      stages:[
        {type:'quiz',title:'Requirement se design choose karo',instructions:'Har choice ke saath failure mode aur missing evidence dekho.',questions:[
          q('Small link write measured latency budget mein fit hai. User immediately share karega. Simple first design?', ['Queue first; created response turant','Commit mapping; ensure redirect read sees it','Encoding worker complete hone tak wait'],1,
            ['Async acceptance possible hai, lekin usable-created promise ke liye completion boundary solve karni padegi.','Required result chhota aur timely hai. Queue mandatory nahi.','URL mapping ke liye video encoding worker irrelevant dependency hai.']),
          q('Multi-GB video background encoding mein bhejna hai. Queue job ka useful payload?', ['Full movie har retry message mein inline','Mutable filename alone, version ke bina','Immutable object reference aur operation metadata'],2,
            ['Large bytes har retry mein duplicate transfer aur broker limits ka issue bana sakti hain.','Filename overwrite ho sakta hai; worker unintended bytes process kar sakta hai.','Stable identity se worker intended object fetch aur verify kar sakta hai.']),
          q('File cache hit hai. User ki permission revoke ho chuki hai. Bytes bhejne se pehle?', ['Current access policy enforce karo','Cache hit ko old permission ka proof maano','Pehle bytes bhejo; metadata baad mein check karo'],0,
            ['Object availability aur authorization alag checks hain. Required revocation freshness enforce karo.','Cached bytes user ka current right prove nahi karti.','Sensitive bytes bhejne ke baad permission reject karna exposure undo nahi karta.']),
          q('Database 10 minutes down tha. Queue oldest-job age badh rahi hai. Recovery ke baad kya measure karo?', ['Sirf database process running hai ya nahi','Arrival rate, drain rate, backlog age aur errors','Sirf latest queue message ka size'],1,
            ['Database up hona backlog complete hone ka proof nahi.','Workers arrival se faster useful work complete karein tab backlog drain ho sakta hai. Retry failures bhi include karo.','Single message size backlog waiting time ka complete signal nahi.'])
        ]},
        {type:'cards',title:'Uploaded se playable tak','goal':'Original media workflow. Ek completion state ko agle state ka proof mat banao.',steps:[
          {title:'Parts upload hue',say:'Multipart upload mein parts independently aa sakte hain. Failed part retry ho sakta hai. Pending parts se final object ready assume mat karo.'},
          {title:'Object complete aur identified',say:'Upload completion ke baad exact object/version verify karo. Ab metadata aur processing intent database mein publish karne ka step aata hai.'},
          {title:'Metadata transaction fail hui',say:'Object bytes bach sakti hain, lekin processing job absent hai. Reconciliation pending upload record aur object identity compare karke retry ya cleanup decide kar sakti hai.',ask:q('Blob storage aur metadata DB alag hain. Sirf DB transaction kya guarantee karti hai?', ['Object upload aur DB commit dono atomic hain','Sirf included DB changes atomic hain','Har orphan object automatically delete hoga'],1,
            ['Do systems ke operations ek local DB transaction se atomic nahi bante.','Cross-system completion aur cleanup alag workflow maangte hain.','Cleanup policy aur execution banana padega.'])},
          {title:'Encoding complete; publication baaki',say:'Required media outputs aur manifest ready hone ke baad playable state publish karo. CDN availability aur access policy verify karo. Upload accepted ko playable mat bolo.'}
        ],lesson:'State names user ko next valid action batayein: uploading, processing, playable ya failed.'}
      ],
      interview:{title:'Interview · choice plus tradeoff',questions:[q('Interviewer poochhta hai: same template chat aur Netflix dono mein chalega? Best response?', ['Same boxes draw karke complete maan lo','Dono ke liye always same NoSQL choose karo','Shared components lo; guarantees aur data paths separately define karo'],2,
        ['Chat delivery aur media processing ki completion boundaries different hain.','Storage choice queries, consistency aur scale se justify honi chahiye.','Reusable components useful hain; workload-specific contracts still decide correctness.'])]},
      success:['Template ko requirement, failure aur evidence se adapt kar sakte ho.'],cards:[{front:'Architecture diagram ka next question?',back:'Har arrow par kya data jaata hai? Sender kab success bolta hai? Failure ke baad kaun retry karta hai? Reader ko result kab dikhta hai?'}]
    }
  ];
  for (const level of levels) VISUALS[level.id]={t:'Job acceptance aur result storage alag boundaries hain',html:SD.viz.svg(nodes,[{from:'client',to:'jobs'},{from:'jobs',to:'db'}],{},{w:960,h:220})};
  SD.registerLevels('sds-contracts',levels);
  SD.guidance.topics['sds-contracts']={title:'Success response ka exact promise define karo',
    misaal:'Restaurant receipt order acceptance dikhati hai. Khana ready aur customer ko serve hona alag states hain.',
    asli:'Request accepted, database committed, result readable aur device acknowledged separate boundaries hain.',
    points:['<b>Contract:</b> 201 ke liye required resource created ho; pending work ke liye 202 aur completion status do.','<b>Read path:</b> primary commit ke baad replica/cache behavior verify karo.','<b>Recovery:</b> durable intent aur duplicate handling ko separately test karo.'],
    use:'Shorteners, chat delivery, background jobs aur media-processing workflows.',avoid:'Simple timely writes mein queue add karne se pehle concrete benefit aur completion cost dekho.',
    mistake:'Queue receipt ko usable result ya device receipt samajh lena.',
    compare:[{choice:'Commit before created',when:'Small result ko immediately use karna hai',tradeoff:'Client commit latency wait karta hai; read visibility bhi ensure karo'},{choice:'Accepted plus status',when:'Work slow hai ya background mein finish ho sakta hai',tradeoff:'Pending/failure UI, durable jobs aur completion monitoring chahiye'}],
    followup:'Worker result commit karke response se pehle fail ho gaya. Retry same logical operation ko kaise pehchaane?',
    sources:[{title:'HTTP response semantics',url:'https://www.rfc-editor.org/rfc/rfc9110.html#section-15.3.3'},{title:'Transactional outbox',url:'https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html'}],levels:levels.map(l=>l.id)};
  levels.forEach(l=>{SD.guidance.byLevel[l.id]='sds-contracts';});
})();
