/* =====================================================================
   System Gurukul — PerfSim Pro: naye command groups (2026-11-15)
   Production tracks (🔐 Security, 📟 Observability + cost, 🎤 Interview designs) ke missions ke liye.

   Kaise judta hai: perfsim.js ke exec() mein ek chhota hook hai — SD.perfsimPlugins ki har entry
   { match: /^tenant\b/i, help: [...], run(api, norm) } ko try karta hai. api = { sim, print, table, panel, rec, err }.
   State sim.sys ke andar rehti hai (SD.defaultSys ko yahan badhaya hai), isliye `sim reset` sab saaf kar deta hai
   aur mission ka `sys` in hisson ko override kar sakta hai.

   Numbers ek chhote, saaf model se aate hain (asli cloud bill ya asli DB nahi) — har output ke neeche likha hai.
   Commands:
     tenant status | tenant export <id> | tenant isolation app-filter|rls | tenant load | tenant quota <id> --cpu N | tenant replica <id>
     token list aman | token use <token> | token revoke aman | token mode jwt-30d|denylist|short | token wait <min>
     cost show | cost tag on|off | cost unit | cost fix <feature> --lever cache|rightsize|cdn
     capacity plan --peak P --per-server S [--target T] [--spare K] | capacity fail --servers N --peak P --per-server S
     fanout --mode write|read|hybrid [--celeb-threshold N]
     kv status | kv put aman <rupaye> | kv get aman | kv config --w N --r N | kv down|up a|b|c | kv repair
   ===================================================================== */
(function () {
  const baseDefault = SD.defaultSys;
  SD.defaultSys = function () {
    const s = baseDefault();
    s.tenancy = { isolation: 'app-filter', exportFilter: false, quota: {}, replica: {} };
    s.tokens = { mode: 'jwt-30d', issued: 'jwt-30d', ageMin: 1440, revoked: false, minutesSinceRevoke: 0 }; /* issued = Aman ke maujooda tokens kis mode mein bane; ageMin = tokens kitne minute purane (1 din) */
    s.cost = { tags: false, fixed: {} };
    s.kv = { n: 3, w: 1, r: 1, latest: 1, reps: { a: { v: 100, ver: 1 }, b: { v: 100, ver: 1 }, c: { v: 100, ver: 1 } }, down: { a: false, b: false, c: false } };
    return s;
  };
  const P = SD.perfsimPlugins = SD.perfsimPlugins || [];
  const lakh = n => '₹' + (Math.round(n * 10) / 10) + ' lakh';
  const num = n => Number(n).toLocaleString('en-IN');
  const crore = n => (n / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 1 }) + ' crore';
  const word = (norm, i) => (norm.split(/\s+/)[i] || '').toLowerCase();
  const own = (obj, k) => Object.prototype.hasOwnProperty.call(obj, k);   /* 'constructor' jaise naam tenant/token nahi */

  /* ------------------------------------------------------------------ TENANT */
  const TENANTS = {
    sharma: { name: 'Sharma Sweets', rows: 12000, cpu: 0.5 },
    mega: { name: 'MegaMart', rows: 5000000, cpu: 80 },
  };
  const OTHER_ROWS = 488000, OTHER_TENANTS = 39998, OTHER_CPU = 30;
  P.push({
    match: /^tenant\b/i,
    help: ['TENANTS (multi-tenant ChaiPay merchant dashboard)',
      '  tenant status                     tenants, isolation, quotas',
      '  tenant export sharma              ek merchant ka export chalao',
      '  tenant isolation rls              row-level security (ya app-filter)',
      '  tenant load                       1 tareekh ka ghanta: MegaMart report + baaki dashboards',
      '  tenant quota mega --cpu 20        ek tenant ka CPU hissa bandho',
      '  tenant replica mega               bade tenant ko alag read replica'],
    run(api, norm) {
      const { sim, print, table, panel, rec, err } = api;
      const T = sim.sys.tenancy;
      const verb = word(norm, 1), arg = word(norm, 2);
      const need = id => { if (!own(TENANTS, id)) err(`400 — tenant '${id || ''}' nahi mila. Tenants: ${Object.keys(TENANTS).join(', ')}`); return TENANTS[id]; };
      if (!verb || verb === 'status') {
        table(['tenant', 'rows (orders)', 'CPU quota', 'replica'], Object.keys(TENANTS).map(id => [id + ' · ' + TENANTS[id].name, num(TENANTS[id].rows), T.quota[id] ? T.quota[id] + '%' : '—', T.replica[id] ? 'alag' : 'saajha'])
          .concat([['+ ' + num(OTHER_TENANTS) + ' aur merchants', num(OTHER_ROWS), '—', 'saajha']]));
        print('ok', `isolation: ${T.isolation}${T.isolation === 'app-filter' ? ' (har query mein developer khud WHERE merchant_id lagata hai)' : ' (database khud merchant_id ka filter lagata hai)'}`);
        return rec({ kind: 'tenant', op: 'status', isolation: T.isolation });
      }
      if (verb === 'export') {
        const t = need(arg);
        const safe = T.isolation === 'rls' || T.exportFilter;
        const rows = safe ? t.rows : TENANTS.sharma.rows + TENANTS.mega.rows + OTHER_ROWS;
        const leaked = rows - t.rows;
        if (leaked) {
          print('err', `⚠️ LEAK — ${t.name} ke export mein ${num(rows)} rows aaye: ${num(leaked)} rows ${num(OTHER_TENANTS + 1)} doosre merchants ke.\n   Naye export code mein WHERE merchant_id = ? lagana bhool gaye (isolation: ${T.isolation}).`);
        } else {
          print('ok', `✅ ${t.name} ke export mein sirf ${num(rows)} rows — sab ${t.name} ke apne.` + (T.isolation === 'rls' ? '\n   RLS policy ne filter lagaya, chahe code bhool jaaye.' : ''));
        }
        return rec({ kind: 'tenant-export', tenant: arg, rows, leaked, isolation: T.isolation });
      }
      if (verb === 'isolation') {
        if (!['app-filter', 'rls'].includes(arg)) err('400 — isolation app-filter ya rls do');
        T.isolation = arg;
        if (arg === 'rls') panel('Row-level security ON', [
          "ALTER TABLE orders ENABLE ROW LEVEL SECURITY;",
          "CREATE POLICY by_tenant ON orders USING (merchant_id = current_setting('app.merchant_id')::bigint);",
          'App ka DB role superuser ya BYPASSRLS wala nahi. Table owner bhi policy se bach jaata hai,',
          '  jab tak FORCE ROW LEVEL SECURITY na lagao.',
          "Har request ke transaction mein: SELECT set_config('app.merchant_id', $1, true);",
          '  $1 = verified token ka merchant. true = sirf is transaction tak (SET LOCAL jaisa),',
          '  kyunki pool ka connection agli request ko milta hai.']);
        else print('ok', 'isolation: app-filter — har query mein filter developer ki yaaddasht par.');
        return rec({ kind: 'tenant', op: 'isolation', mode: arg });
      }
      if (verb === 'quota') {
        const t = need(arg);
        const cpu = Number((norm.match(/--cpu\s+(\S+)/i) || [])[1]);
        if (!Number.isFinite(cpu) || cpu < 5 || cpu > 80) err('400 — --cpu 5 se 80 ke beech do (percent)');
        T.quota[arg] = cpu;
        print('ok', `${t.name} ki queries ab database ka zyada se zyada ${cpu}% CPU le sakti hain (baaki line mein rukti hain).`);
        return rec({ kind: 'tenant', op: 'quota', tenant: arg, cpu });
      }
      if (verb === 'replica') {
        const t = need(arg);
        T.replica[arg] = true;
        print('ok', `${t.name} ki reports ab alag read replica par jaayengi. Kharcha: +₹1.2 lakh/mahina (replica server).`);
        return rec({ kind: 'tenant', op: 'replica', tenant: arg });
      }
      if (verb === 'load') {
        const d = TENANTS.mega;
        let dtCpu = d.cpu, dtReportMin = 15;
        if (T.replica.mega) { dtCpu = 0; }
        else if (T.quota.mega && T.quota.mega < dtCpu) { dtReportMin = Math.round(15 * dtCpu / T.quota.mega); dtCpu = T.quota.mega; }
        const cpu = OTHER_CPU + dtCpu;
        const othersP99 = cpu >= 100 ? 10000 : cpu > 85 ? 2400 : cpu > 70 ? 600 : 180;
        table(['kaun', 'DB CPU', 'nateeja'], [
          ['MegaMart report (50 lakh rows)', T.replica.mega ? '0% (alag replica)' : dtCpu + '%', `report ${dtReportMin} min mein`],
          [num(OTHER_TENANTS + 1) + ' baaki merchants', OTHER_CPU + '%', 'dashboard p99 ' + (othersP99 >= 1000 ? (othersP99 / 1000) + ' s' : othersP99 + ' ms')],
          ['kul (saajha primary)', Math.min(cpu, 100) + '%' + (cpu > 100 ? ' (maang ' + cpu + '%)' : ''), cpu >= 100 ? '💀 sab line mein' : '✅ jagah hai'],
        ]);
        print('ok', 'Model: CPU maang 100% se upar = sab queries line mein. Asli DB par numbers alag honge; dhaancha wahi.');
        return rec({ kind: 'tenant-load', othersP99, dtReportMin, cpu, quota: T.quota.mega || 0, replica: !!T.replica.mega });
      }
      err(`400 — 'tenant ${verb}' samajh nahi aaya. 'help' dekho.`);
    },
  });

  /* ------------------------------------------------------------------ TOKEN */
  const TOKENS = { 't-old': 'Aman ka purana phone (chori hua)', 't-new': 'Aman ka naya phone' };
  P.push({
    match: /^token\b/i,
    help: ['TOKENS (Aman ka phone chori hua)',
      '  token list aman                   Aman ke tokens',
      '  token use t-old                   chor purane token se GET /balance karta hai',
      '  token revoke aman                 auth-service mein Aman ke saare sessions radd',
      '  token mode denylist               services har request par revoke list jaanchein (ya jwt-30d, short)',
      '  token wait 15                     itne minute aage badho'],
    run(api, norm) {
      const { sim, print, table, rec, err } = api;
      const K = sim.sys.tokens;
      const verb = word(norm, 1), arg = word(norm, 2);
      if (verb === 'list') {
        if (arg !== 'aman') err("400 — 'token list aman' likho");
        const left = Math.max(0, 43200 - K.ageMin);
        table(['token', 'device', 'umar'], Object.keys(TOKENS).map(k => [k, TOKENS[k], K.issued === 'short' ? '15 min (refresh se naya)' : left ? `30 din ka; ${Math.ceil(left / 1440)} din baaki` : 'expire ho gaya']));
        return rec({ kind: 'token', op: 'list' });
      }
      if (verb === 'use') {
        if (!own(TOKENS, arg)) err(`400 — token '${arg}' nahi mila. Tokens: ${Object.keys(TOKENS).join(', ')}`);
        let status = 200, why = 'wallet-api ne token ka signature aur expiry jaanchi — dono theek. Revoke list kisi ne nahi dekhi.';
        /* Pehle expiry: 30 din wala token apni umar poori hone par khud band. */
        if (K.issued === 'jwt-30d' && K.ageMin >= 43200) { status = 401; why = 'Token ki 30 din ki expiry (exp) poori ho gayi. Revoke ke bina bhi band — par itne din chor ke paas khula raha.'; }
        else if (K.revoked && K.mode === 'denylist') { status = 401; why = 'wallet-api ne revoke list jaanchi: Aman ke sessions radd hain.' + (arg === 't-new' ? ' Aman naye phone par dobara login karega aur naya token lega.' : ''); }
        else if (K.issued === 'short' && !K.revoked) why = 'Access token 15 min ka hai, par chor ke paas phone hai: refresh token se naya access token mil jaata hai. Revoke ke bina rukega nahi.';
        else if (K.issued === 'short' && K.minutesSinceRevoke >= 15) { status = 401; why = 'Access token 15 min mein expire hua, aur refresh token auth-service ne radd kar diya.'; }
        else if (K.issued === 'short') why = `Access token abhi ${15 - K.minutesSinceRevoke} min aur chalega (short TTL); refresh nahi milega.`;
        else if (K.revoked) why = `Token 30 din wala JWT hai: signature theek, expiry mein ${Math.ceil((43200 - K.ageMin) / 1440)} din baaki. wallet-api revoke list nahi dekhti (mode: ${K.mode}).`;
        print(status === 200 ? 'err' : 'ok', `GET /v1/balance  (Bearer ${arg})  →  ${status} ${status === 200 ? 'OK — balance dikh gaya' : 'Unauthorized'}\n   ${why}`);
        return rec({ kind: 'token-use', token: arg, status, mode: K.mode, revoked: K.revoked });
      }
      if (verb === 'revoke') {
        if (arg !== 'aman') err("400 — 'token revoke aman' likho");
        if (K.revoked) { print('ok', 'Aman ke sessions pehle se radd hain. Revoke ka samay wahi rehta hai.'); return rec({ kind: 'token', op: 'revoke', again: true }); }
        K.revoked = true; K.minutesSinceRevoke = 0;
        print('ok', 'auth-service: Aman ke saare sessions aur refresh tokens radd. Revoke list mein t-old, t-new.' +
          (K.mode === 'jwt-30d' ? '\n   Dhyaan: services token khud jaanchti hain aur revoke list nahi dekhtin.' : ''));
        return rec({ kind: 'token', op: 'revoke' });
      }
      if (verb === 'mode') {
        if (!['jwt-30d', 'denylist', 'short'].includes(arg)) err('400 — mode jwt-30d, denylist ya short do');
        K.mode = arg;
        print('ok', { 'jwt-30d': 'Token 30 din chalta hai; services sirf signature aur expiry dekhti hain.',
          denylist: 'Services har request par revoke list (tez cache) jaanchti hain. Ek lookup ka kharcha har request par.',
          short: 'Naye access tokens 15 min ke, refresh token auth-service ke paas. ' + (K.issued === 'short' ? 'Aman ke tokens bhi 15 min wale hain.' : 'Dhyaan: pehle se jaari t-old abhi bhi 30 din ka hai — mode badalne se purana token chhota nahi hota.') }[arg]);
        return rec({ kind: 'token', op: 'mode', mode: arg });
      }
      if (verb === 'wait') {
        const m = Number(arg);
        if (!Number.isFinite(m) || m <= 0 || m > 100000) err('400 — minute ki ginti do, jaise token wait 15');
        K.ageMin += m;
        if (K.revoked) K.minutesSinceRevoke += m;
        print('ok', `${m} minute aage badhe. Tokens ab ${Math.floor(K.ageMin / 1440)} din ${K.ageMin % 1440 ? Math.round((K.ageMin % 1440) / 60) + ' ghante ' : ''}purane.`);
        return rec({ kind: 'token', op: 'wait', minutes: m });
      }
      err(`400 — 'token ${verb}' samajh nahi aaya. 'help' dekho.`);
    },
  });

  /* ------------------------------------------------------------------ COST */
  const FEATURES = [
    { id: 'payments-core', name: 'Payments (core)', compute: 8, db: 5, net: 2 },
    { id: 'statement-pdf', name: 'Statement PDF (naya)', compute: 6, db: 2, net: 0, lever: 'cache', after: { compute: 1.5, db: 0.5, net: 0 },
      why: 'Har download par PDF dobara ban raha tha. Mahine ka PDF ek baar banao, S3 par rakho.' },
    { id: 'reco', name: 'Recommendations (naya)', compute: 5, db: 2, net: 1, lever: 'rightsize', after: { compute: 2, db: 1.5, net: 0.5 },
      why: 'Servers 70% waqt khaali the. Chhote servers + autoscaling.' },
    { id: 'analytics-export', name: 'Analytics export (naya)', compute: 1, db: 0, net: 4, lever: 'cdn', after: { compute: 1, db: 0, net: 1 },
      why: 'Badi files har baar seedhe origin se. Compression + CDN se egress kam.' },
  ];
  const PAYMENTS = 30000000;
  const lines = C => FEATURES.map(f => { const v = C.fixed[f.id] ? f.after : f; return { f, compute: v.compute, db: v.db, net: v.net, total: v.compute + v.db + v.net }; });
  const totalOf = C => lines(C).reduce((a, l) => a + l.total, 0);
  P.push({
    match: /^cost\b/i,
    help: ['COST (ChaiPay ka cloud bill · model: ₹ lakh / mahina)',
      '  cost show                         bill dekho',
      '  cost tag on                       har resource par team/feature ka tag',
      '  cost unit                         ek payment ka kharcha (3 crore payments / mahina)',
      '  cost fix statement-pdf --lever cache     levers: cache · rightsize · cdn'],
    run(api, norm) {
      const { sim, print, table, panel, rec, err } = api;
      const C = sim.sys.cost;
      const verb = word(norm, 1), arg = word(norm, 2);
      if (verb === 'show') {
        const L = lines(C), total = totalOf(C);
        const sum = k => L.reduce((a, l) => a + l[k], 0);
        if (!C.tags) {
          panel('Cloud bill — is mahine', [`Compute   ${lakh(sum('compute'))}`, `Database  ${lakh(sum('db'))}`, `Network   ${lakh(sum('net'))}`,
            `Kul       ${lakh(total)}   (pichhla mahina ₹18 lakh)`, 'Untagged: 100% — kaun sa feature kitna kha raha hai, pata nahi.']);
          return rec({ kind: 'cost', view: 'resource', tags: false, total });
        }
        const sorted = L.slice().sort((a, b) => b.total - a.total);
        table(['feature', 'compute', 'database', 'network', 'kul'], sorted.map(l => [l.f.name, lakh(l.compute), lakh(l.db), lakh(l.net), lakh(l.total)]));
        print('ok', `Kul ${lakh(total)}. Sabse bada naya kharcha: ${sorted.find(l => l.f.id !== 'payments-core').f.name}.`);
        return rec({ kind: 'cost', view: 'feature', tags: true, total, top: sorted[0].f.id });
      }
      if (verb === 'tag') {
        if (!['on', 'off'].includes(arg)) err('400 — cost tag on ya off');
        C.tags = arg === 'on';
        print('ok', C.tags ? 'Har server, DB aur bucket par tag: team + feature. Ab bill feature ke hisaab se tootega.' : 'Tags band.');
        return rec({ kind: 'cost', op: 'tag', tags: C.tags });
      }
      if (verb === 'unit') {
        const total = totalOf(C), per = total * 1e5 / PAYMENTS;
        print('ok', `${lakh(total)} ÷ ${num(PAYMENTS)} payments = ₹${per.toFixed(3)} har payment`);
        return rec({ kind: 'cost-unit', total, perUnit: Math.round(per * 1000) / 1000 });
      }
      if (verb === 'fix') {
        if (!C.tags) err('400 — pehle `cost tag on`: bina tags ke pata hi nahi kaunsa feature kitna kha raha hai');
        const f = FEATURES.find(x => x.id === arg);
        if (!f || !f.lever) err(`400 — feature '${arg}' theek karne layak nahi mila. Naye features: ${FEATURES.filter(x => x.lever).map(x => x.id).join(', ')}`);
        const lever = (norm.match(/--lever\s+(\S+)/i) || [])[1];
        if (!lever) err('400 — --lever do: cache, rightsize ya cdn');
        if (lever.toLowerCase() !== f.lever) err(`400 — '${lever}' se ${f.name} ka kharcha nahi ghatega. Socho: kharcha compute, database ya network mein hai?`);
        C.fixed[f.id] = true;
        const before = f.compute + f.db + f.net, after = f.after.compute + f.after.db + f.after.net;
        print('ok', `${f.name}: ${lakh(before)} → ${lakh(after)}. ${f.why}`);
        return rec({ kind: 'cost', op: 'fix', feature: f.id, lever: f.lever });
      }
      err(`400 — 'cost ${verb || ''}' samajh nahi aaya. 'help' dekho.`);
    },
  });

  /* ------------------------------------------------------------------ CAPACITY */
  const flag = (norm, k) => { const m = norm.match(new RegExp('--' + k + '\\s+(\\S+)', 'i')); return m ? Number(m[1]) : undefined; };
  P.push({
    match: /^capacity\b/i,
    help: ['CAPACITY (kitne servers?)',
      '  capacity plan --peak 2400 --per-server 400 [--target 60] [--spare 1]',
      '  capacity fail --servers 6 --peak 2400 --per-server 400     ek server mare toh?'],
    run(api, norm) {
      const { print, panel, rec, err } = api;
      const verb = word(norm, 1);
      const peak = flag(norm, 'peak'), per = flag(norm, 'per-server');
      const good = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;
      if (!good(peak, 1, 1e7) || !good(per, 1, 1e6)) err('400 — --peak aur --per-server positive numbers do (rps)');
      if (verb === 'plan') {
        const target = flag(norm, 'target') == null ? 100 : flag(norm, 'target');
        const spare = flag(norm, 'spare') == null ? 0 : flag(norm, 'spare');
        if (!good(target, 10, 100) || !Number.isInteger(spare) || spare < 0 || spare > 50) err('400 — --target 10 se 100 (percent), --spare 0 ya zyada poora number');
        const base = Math.ceil(peak / (per * target / 100)), servers = base + spare;
        if (servers > 100000) err('400 — plan 1,00,000 servers se upar ja raha hai; model ki hadd 1,00,000 (capacity fail ki bhi yahi hadd)');
        const util = peak / (servers * per) * 100, shown = Math.round(util * 10) / 10;
        panel('Capacity plan', [`peak ${num(peak)} rps ÷ (${num(per)} rps/server × ${target}% target) = ${base} servers`, `+ spare ${spare} = ${servers} servers`,
          `Model: saare ${servers} servers traffic lete hain. Peak par har server ~${shown}% busy.`,
          util > 85 ? 'Koi jagah nahi bachi: burst, GC pause ya ek server ki maut par overload.' : `Target ${target}% planning ki hadd hai; asli load upar ki line mein.`]);
        return rec({ kind: 'capacity', op: 'plan', peak, per, target, spare, servers, util: shown });
      }
      if (verb === 'fail') {
        const n = flag(norm, 'servers');
        if (!Number.isInteger(n) || n < 2 || n > 100000) err('400 — --servers 2 ya zyada poora number do');
        const raw = peak / ((n - 1) * per) * 100, util = Math.round(raw * 10) / 10;
        const ok = raw <= 85;   /* bina rounding ke tulna: 85.4% bhi overload */
        const shown = !ok && util <= 85 ? '85% se thoda upar' : util + '%';
        print(ok ? 'ok' : 'err', `${n} mein se 1 server mara → baaki ${n - 1} par peak: ${shown} ${ok ? '✅ jhel liya' : '💀 overload (model ki hadd 85% se upar: queue aur timeouts)'}`);
        return rec({ kind: 'capacity', op: 'fail', servers: n, peak, per, util, survived: ok });
      }
      err(`400 — 'capacity ${verb}' samajh nahi aaya. plan ya fail.`);
    },
  });

  /* ------------------------------------------------------------------ FANOUT */
  const FEED = { users: 5e7, friends: 200, postsPerDay: 1e7, celebs: 100, celebFollowers: 5e6, celebPostsPerDay: 20 };
  P.push({
    match: /^fanout\b/i,
    help: ['FANOUT (feed · aam users ke 1 crore posts/din, har ek ke 200 dost; 100 celebrities × 50 lakh followers × 20 posts/din)',
      '  fanout --mode write | read | hybrid [--celeb-threshold 100000]   (what-if: production nahi badalta)',
      '  fanout status                     production abhi kis mode par hai',
      '  fanout use hybrid --celeb-threshold 100000   production ka mode badlo',
      '  fanout run                        production feed ka ek din (copies, p99, edit, cold feed, gayab dost)',
      '  fanout entry id|full · fanout hydrate batch|each · fanout skip-inactive on|off'],
    run(api, norm) {
      const { sim, table, print, panel, rec, err } = api;
      /* production ka feed mode (on-call shift isi ko badalti hai); what-if calculator ise nahi chhoota */
      if (!sim.sys.feed) sim.sys.feed = { mode: 'write', threshold: 100000 };
      const F = sim.sys.feed;
      /* iv-feed lesson (data-pro-iv-1.js design canvas): inbox mein ~500 post ids (post badle toh ek jagah badlo) ·
         post cache + EK batch read (har id ki alag query = 500 queries, N+1) · 6 mahine se gayab users ko push mat karo.
         Gayab doston ka hissa is example ka maana hua: har aam user ke 200 mein se 50. skipInactive default false —
         purane stages (designlive shift) ke numbers waise hi rahein. */
      if (F.entry == null) F.entry = 'id';
      if (F.hydrate == null) F.hydrate = 'batch';
      if (F.skipInactive == null) F.skipInactive = false;
      const sub = (norm.split(/\s+/)[1] || '').toLowerCase(), subArg = (norm.split(/\s+/)[2] || '').toLowerCase();
      if (sub === 'entry') {
        if (!['id', 'full'].includes(subArg)) err('400 — fanout entry id|full');
        F.entry = subArg; print('ok', subArg === 'id' ? 'Inbox mein ab sirf post id; post ka data post cache se.' : 'Inbox mein ab poora post (text + photo URL) copy hoga.');
        return rec({ kind: 'fanout', op: 'entry', entry: F.entry });
      }
      if (sub === 'hydrate') {
        if (!['batch', 'each'].includes(subArg)) err('400 — fanout hydrate batch|each');
        F.hydrate = subArg; print('ok', subArg === 'batch' ? 'Feed ke saare ids ek batch read mein (post cache, miss par posts DB).' : 'Har id ke liye alag query, ek-ek karke.');
        return rec({ kind: 'fanout', op: 'hydrate', hydrate: F.hydrate });
      }
      if (sub === 'skip-inactive') {
        if (!['on', 'off'].includes(subArg)) err('400 — fanout skip-inactive on|off');
        F.skipInactive = subArg === 'on'; print('ok', F.skipInactive ? '6 mahine se gayab users ko push band; lautne par pull se feed banegi.' : 'Gayab users ko bhi har post push hogi.');
        return rec({ kind: 'fanout', op: 'skip-inactive', skipInactive: F.skipInactive });
      }
      const verb = /^fanout\s+(status|use|run)\b/i.test(norm) ? norm.split(/\s+/)[1].toLowerCase() : 'whatif';
      let mode, thr;
      if (verb === 'status' || verb === 'run') { mode = F.mode; thr = F.threshold; }
      else {
        mode = (verb === 'use' ? (norm.split(/\s+/)[2] || '') : ((norm.match(/--mode\s+(\S+)/i) || [])[1] || '')).toLowerCase();
        if (!['write', 'read', 'hybrid'].includes(mode)) err(verb === 'use' ? '400 — fanout use write | read | hybrid [--celeb-threshold N]' : '400 — --mode write, read ya hybrid do');
        const thrRaw = flag(norm, 'celeb-threshold');
        if (mode !== 'hybrid' && thrRaw != null) err('400 — --celeb-threshold sirf hybrid mode mein');
        thr = thrRaw == null ? 100000 : thrRaw;
        if (!Number.isFinite(thr) || thr < 1000 || thr > 1e8) err('400 — --celeb-threshold 1000 se 10 crore ke beech do');
      }
      /* postsPerDay = aam users ke posts; celebrity posts alag (100 × 20 = 2,000). */
      const sourcePosts = FEED.postsPerDay + FEED.celebs * FEED.celebPostsPerDay;
      const normalCopies = FEED.postsPerDay * FEED.friends, celebCopies = FEED.celebs * FEED.celebPostsPerDay * FEED.celebFollowers;
      let inboxCopies, feedMs, celebLagMin, celebPushed = false;
      if (mode === 'write') { inboxCopies = normalCopies + celebCopies; feedMs = 20; celebLagMin = Math.round(FEED.celebFollowers / 50000 / 60); }
      else if (mode === 'read') { inboxCopies = 0; feedMs = 800; celebLagMin = 0; }
      else { celebPushed = thr > FEED.celebFollowers; /* ≥ threshold followers = pull */ inboxCopies = normalCopies + (celebPushed ? celebCopies : 0); feedMs = celebPushed ? 20 : 60; celebLagMin = celebPushed ? Math.round(FEED.celebFollowers / 50000 / 60) : 0; }
      const INACTIVE = 50, dormant = FEED.postsPerDay * INACTIVE, pushNormal = mode !== 'read';
      if (verb !== 'whatif' && F.skipInactive && pushNormal) inboxCopies -= dormant;
      if (verb === 'run') {
        sim.timeSec += 60;
        const stale = F.entry === 'full' && pushNormal ? FEED.friends - (F.skipInactive ? INACTIVE : 0) : 0;
        const queries = F.hydrate === 'batch' ? 1 : 500, dormantCopies = pushNormal && !F.skipInactive ? dormant : 0;
        panel(`FEED — ek din (production: ${mode}${mode === 'hybrid' ? `, ≥ ${num(thr)} followers = pull` : ''})`, [
          `inbox copies     ${inboxCopies ? crore(inboxCopies) : '0'}/din`,
          `feed p99         ${feedMs} ms ${feedMs <= 200 ? '✅' : '❌'} (SLO 200 ms)`,
          `celebrity post   ${celebLagMin ? celebLagMin + ' min tak late ❌ (50 lakh inbox writes)' : 'turant ✅'}`,
          `post edit        ${!pushNormal ? 'inbox nahi (read mode) — ek jagah badla ✅' : stale ? `Riya ne caption badla → ${stale} inbox copies mein PURANA ❌ (har copy alag badlo)` : 'Riya ne caption badla → inbox mein sirf id, sab feeds mein naya ✅'}`,
          `cold feed        500 post ids → ${queries === 1 ? '1 batch read ✅' : '500 alag queries ❌ (N+1)'}`,
          `gayab dost       ${!pushNormal ? '— (read mode)' : dormantCopies ? `${crore(dormantCopies)} copies/din 6 mahine se gayab doston ko ❌ (koi padhega nahi)` : `${crore(dormant)} copies/din bachi ✅ (lautne par pull)`}`,
        ]);
        return rec({ kind: 'fanout', op: 'run', prod: true, mode, threshold: mode === 'hybrid' ? thr : null, sourcePosts, inboxCopies, feedMs, celebLagMin,
          entry: F.entry, staleCopies: stale, hydrate: F.hydrate, coldQueries: queries, skipInactive: F.skipInactive, dormantCopies });
      }
      if (verb === 'use') { F.mode = mode; F.threshold = thr; print('ok', `Production feed ab ${mode}${mode === 'hybrid' ? ` (≥ ${num(thr)} followers = pull)` : ''} par.`); }
      if (verb === 'status') print('ok', 'PRODUCTION feed:');
      table(['mode', 'naye posts / din', 'inbox copies / din', 'feed p99', 'celebrity post ka lag'], [[mode + (mode === 'hybrid' ? ` (≥ ${num(thr)} followers = pull)` : ''), num(sourcePosts), inboxCopies ? crore(inboxCopies) : '0', feedMs + ' ms', celebLagMin ? celebLagMin + ' min tak' : 'turant (padhte waqt)']]);
      print('ok', { write: 'Post karte hi har dost ki inbox mein copy. Padhna sasta; celebrity ka ek post = 50 lakh writes.',
        read: 'Post sirf ek baar likho; feed khulne par 200 doston ke posts jodo. Likhna sasta, padhna mehenga.',
        hybrid: celebPushed ? `Threshold ${num(thr)} celebrities ke 50 lakh followers se upar hai, toh celebrities bhi push ho rahi hain — write mode jaisa bojh.` : 'Aam users push (write par), celebrities pull (padhte waqt). Dono ka sasta hissa.' }[mode] + '  (Model ke chune hue numbers; feed ka SLO: p99 200 ms. Celebrity lag maan ke: 50,000 inbox writes/second.)');
      return rec({ kind: 'fanout', op: verb, prod: verb !== 'whatif', mode, threshold: mode === 'hybrid' ? thr : null, sourcePosts, inboxCopies, feedMs, celebLagMin });
    },
  });
  /* ------------------------------------------------------------------ KV (quorum) */
  /* Ek key (balance:aman), 3 replicas a, b, c. put pehle W zinda replicas par likhta hai (a → b → c kram mein);
     baaki replicas tab tak purane rehte hain jab tak `kv repair` (anti-entropy) na chale.
     get R zinda replicas padhta hai — model sabse buri kismat maanta hai: pehle woh replicas jo sabse peeche hain.
     Isliye R + W ≤ N par stale read dikhta hai, aur R + W > N par overlap se taaza value milti hai. */
  const KV_NODES = ['a', 'b', 'c'];
  P.push({
    match: /^kv\b/i,
    help: ['KV STORE (Dynamo jaisa · key balance:aman · 3 replicas a, b, c)',
      '  kv status                         replicas aur config',
      '  kv put aman 500                   W replicas par likho',
      '  kv get aman                       R replicas se padho (sabse peeche wale pehle)',
      '  kv config --w 2 --r 2             quorum badlo (1–3)',
      '  kv down b   ·   kv up b           ek replica band / chalu',
      '  kv repair                         anti-entropy: zinda replicas ko taaza karo'],
    run(api, norm) {
      const { sim, print, table, rec, err } = api;
      const K = sim.sys.kv;
      const verb = word(norm, 1), arg = word(norm, 2);
      const live = () => KV_NODES.filter(n => !K.down[n]);
      const rupee = v => '₹' + num(v);
      if (!verb || verb === 'status') {
        table(['replica', 'haal', 'balance:aman', 'version'], KV_NODES.map(n => [n, K.down[n] ? '💀 band' : 'zinda', rupee(K.reps[n].v), 'v' + K.reps[n].ver + (K.reps[n].ver < K.latest ? ' (peeche)' : '')]));
        print('ok', `N = ${K.n}, W = ${K.w}, R = ${K.r} → R + W = ${K.r + K.w} ${K.r + K.w > K.n ? '> N: fixed replicas par overlap, agar aakhri write isi W se hua; config badalna purane data ko nahi phailaata' : '≤ N: read aur write ke replicas alag ho sakte hain'}`);
        return rec({ kind: 'kv', op: 'status', w: K.w, r: K.r });
      }
      if (verb === 'config') {
        const w = Number((norm.match(/--w\s+(\S+)/i) || [])[1]), r = Number((norm.match(/--r\s+(\S+)/i) || [])[1]);
        if (![w, r].every(x => Number.isInteger(x) && x >= 1 && x <= 3)) err('400 — --w aur --r dono 1 se 3 ke beech do');
        K.w = w; K.r = r;
        print('ok', `W = ${w}, R = ${r}. R + W = ${w + r} ${w + r > K.n ? '> 3 → fixed replicas par overlap, agar write naye W se poora ho. Purana write config badalne se nahi phailta.' : '≤ 3 → overlap ki guarantee nahi: purana balance padh sakte ho.'}`);
        return rec({ kind: 'kv', op: 'config', w, r, quorum: w + r > K.n });
      }
      if (verb === 'down' || verb === 'up') {
        if (!KV_NODES.includes(arg)) err('400 — replica a, b ya c do');
        K.down[arg] = verb === 'down';
        print('ok', verb === 'down' ? `Replica ${arg} band. Zinda: ${live().join(', ') || 'koi nahi'}.` : `Replica ${arg} wapas. Data abhi purana ho sakta hai — kv repair se taaza hoga.`);
        return rec({ kind: 'kv', op: verb, node: arg });
      }
      if (verb === 'repair') {
        const up = live();
        if (!up.length) err('503 — koi replica zinda nahi; repair kis par karein?');
        const best = Math.max(...up.map(n => K.reps[n].ver));
        const src = up.find(n => K.reps[n].ver === best);
        up.forEach(n => { K.reps[n] = { ...K.reps[src] }; });
        print('ok', `Anti-entropy: zinda replicas (${up.join(', ')}) ab v${best} par. Asli systems Merkle tree se farak dhoondhte hain.`);
        return rec({ kind: 'kv', op: 'repair', ver: best });
      }
      if (verb === 'put') {
        if (arg !== 'aman') err("400 — key sirf aman hai: 'kv put aman 500'");
        const amount = word(norm, 3), v = Number(amount);
        if (amount === '' || !Number.isInteger(v) || v < 0 || v > 10000000) err('400 — rupaye ka poora number do, jaise kv put aman 500');
        const up = live();
        if (up.length < K.w) err(`503 — sirf ${up.length} replica zinda, W = ${K.w} chahiye. Write fail: consistency ki keemat availability.`);
        const ver = K.latest + 1, acked = up.slice(0, K.w);
        acked.forEach(n => { K.reps[n] = { v, ver }; });
        K.latest = ver;
        print('ok', `PUT balance:aman = ${rupee(v)} (v${ver}) → ack ${acked.join(', ')} (W = ${K.w}).${acked.length < K.n ? ' Baaki replicas abhi purane; replication baad mein pahunchega.' : ' Teeno replicas taaza.'}`);
        return rec({ kind: 'kv', op: 'put', value: v, ver, w: K.w, r: K.r, acked: acked.length });
      }
      if (verb === 'get') {
        if (arg !== 'aman') err("400 — key sirf aman hai: 'kv get aman'");
        const up = live();
        if (up.length < K.r) err(`503 — sirf ${up.length} replica zinda, R = ${K.r} chahiye. Read fail.`);
        const read = up.slice().sort((x, y) => K.reps[x].ver - K.reps[y].ver).slice(0, K.r);
        const best = read.reduce((m, n) => K.reps[n].ver > K.reps[m].ver ? n : m, read[0]);
        const { v, ver } = K.reps[best], stale = ver < K.latest;
        print(stale ? 'err' : 'ok', `GET balance:aman → ${rupee(v)} (v${ver}) · padhe: ${read.join(', ')} (R = ${K.r})` +
          (stale ? `\n   ⚠️ STALE — sabse naya v${K.latest} hai. Padhe gaye replicas par aakhri write nahi mila. Config badalne se purana write nahi phailta; overlap ke liye us write ka W aur read ka R dekho.` : '\n   ✅ Sabse naya version mila.'));
        return rec({ kind: 'kv', op: 'get', value: v, ver, latest: K.latest, stale, w: K.w, r: K.r });
      }
      err(`400 — 'kv ${verb}' samajh nahi aaya. 'help' dekho.`);
    },
  });
})();

/* =====================================================================
   JOBS — notification queues (2026-11-25, on-call shifts boss-flow / boss-iv)
   OTP (transactional) aur campaign (bulk) — ek provider (FCM) ki hadd 1000 rps (data-flow.js boss-flow).
   Model (har `jobs run S`):
     shared FIFO   → OTP poore campaign backlog ke peeche: age = backlog ÷ bheje gaye/sec
     split lanes   → OTP pehle; par provider budget saajha: koshish > 1000/s → 429 sab par barabar
     cap campaign  → campaign ki koshish baandho; OTP + campaign ≤ hadd = 429 nahi
     poison        → ek job hamesha fail; bina DLQ campaign lane usi ko retry karti rehti hai
     dedup / usercap → duplicate events aur ek user ko bahut offers
   ===================================================================== */
(function () {
  const baseDefault = SD.defaultSys;
  SD.defaultSys = function () {
    const s = baseDefault();
    s.jobs = { providerRps: 1000, workerRps: 1500, lanes: 'shared', capCampaign: 0, otpRps: 40, backlog: 5000000,
      poison: false, dlq: false, dlqCount: 0, dedup: false, dupRate: 0, userCap: 0, offersPerUser: 0 };
    return s;
  };
  const num = n => Math.round(n).toLocaleString('en-IN');
  const dur = sec => !isFinite(sec) ? '∞ (kabhi nahi)' : sec < 90 ? Math.round(sec) + 's' : sec < 5400 ? Math.round(sec / 60) + ' min' : (Math.round(sec / 360) / 10) + ' ghante';
  const word = (norm, i) => (norm.split(/\s+/)[i] || '').toLowerCase();
  (SD.perfsimPlugins = SD.perfsimPlugins || []).push({
    match: /^jobs\b/i,
    help: ['JOBS (notifications: OTP + campaign, provider FCM 1000 rps)',
      '  jobs status                       lanes, backlog, provider, guards',
      '  jobs run 60                       60 second chalao (OTP age, 429, campaign, poison)',
      '  jobs split priority               OTP ki alag lane (jobs lanes shared = wapas)',
      '  jobs cap campaign 800             campaign ki koshish/sec baandho (0 = hatao)',
      '  jobs dlq on                       3 koshish ke baad kharab job DLQ mein',
      '  jobs dedup on · jobs usercap 3    duplicate events roko · ek user ko din mein max offers'],
    run(api, norm) {
      const { sim, print, panel, rec, err } = api;
      const J = sim.sys.jobs;
      const verb = word(norm, 1), arg = word(norm, 2);
      const onoff = v => { if (!['on', 'off'].includes(v)) err('400 — on ya off likho'); return v === 'on'; };
      if (!verb || verb === 'status') {
        panel('JOBS', [
          `lanes            ${J.lanes === 'split' ? 'split — OTP ki alag lane ✅' : 'shared FIFO — OTP aur campaign ek hi line'}`,
          `provider (FCM)   ${num(J.providerRps)} rps hadd · workers ${num(J.workerRps)}/s koshish karte hain`,
          `campaign cap     ${J.capCampaign ? num(J.capCampaign) + '/s' : '— (workers jitna tez)'}`,
          `campaign backlog ${num(J.backlog)} notifications`,
          `OTP aane ki dar  ${num(J.otpRps)}/s · target: 30s ke andar pahunche`,
          `DLQ              ${J.dlq ? 'ON (3 koshish, phir park)' : 'OFF — fail job baar-baar retry'}${J.dlqCount ? ' · parked ' + J.dlqCount : ''}`,
          `dedup            ${J.dedup ? 'ON (event_id + user + channel)' : 'OFF'}`,
          `user cap         ${J.userCap ? J.userCap + ' offers/din' : '—'}`,
        ]);
        return rec({ kind: 'jobs', op: 'status', lanes: J.lanes, capCampaign: J.capCampaign, dlq: J.dlq, dedup: J.dedup, userCap: J.userCap });
      }
      if (verb === 'split' || verb === 'lanes') {
        const v = verb === 'split' ? 'split' : arg;
        if (!['split', 'shared'].includes(v)) err('400 — jobs split priority | jobs lanes shared');
        J.lanes = v;
        print('ok', v === 'split' ? 'OTP ab apni lane mein — campaign ke peeche nahi lagega. (Provider ka budget abhi bhi saajha hai.)' : 'Lanes wapas shared FIFO.');
        return rec({ kind: 'jobs', op: 'lanes', lanes: v });
      }
      if (verb === 'cap') {
        if (arg !== 'campaign') err('400 — jobs cap campaign <rps>');
        const v = parseInt(word(norm, 3), 10);
        if (!Number.isInteger(v) || v < 0 || v > 100000) err('400 — 0 se 100000 ke beech number do (0 = cap hatao)');
        J.capCampaign = v;
        print('ok', v ? `Campaign ab max ${num(v)}/s koshish karega.` : 'Campaign cap hata.');
        return rec({ kind: 'jobs', op: 'cap', capCampaign: v });
      }
      if (verb === 'dlq') { J.dlq = onoff(arg); print('ok', `DLQ ${J.dlq ? 'ON' : 'OFF'}`); return rec({ kind: 'jobs', op: 'dlq', dlq: J.dlq }); }
      if (verb === 'dedup') { J.dedup = onoff(arg); print('ok', `Dedup ${J.dedup ? 'ON — event_id + user + channel ki key, retry window tak yaad' : 'OFF'}`); return rec({ kind: 'jobs', op: 'dedup', dedup: J.dedup }); }
      if (verb === 'usercap') {
        const v = parseInt(arg, 10);
        if (!Number.isInteger(v) || v < 0 || v > 100) err('400 — 0 se 100 ke beech (0 = hatao)');
        J.userCap = v; print('ok', v ? `Har user ko din mein max ${v} marketing offers.` : 'User cap hata.');
        return rec({ kind: 'jobs', op: 'usercap', userCap: v });
      }
      if (verb === 'run') {
        const S = arg ? parseInt(arg, 10) : 60;
        if (!Number.isInteger(S) || S < 1 || S > 3600) err('400 — 1 se 3600 second: jobs run 60');
        sim.timeSec += S;
        const P = J.providerRps;
        let camp = J.capCampaign ? Math.min(J.capCampaign, J.workerRps) : J.workerRps;
        let poisonRetries = 0, parked = 0, campBlocked = false;
        if (J.poison) {
          if (J.dlq) { parked = 1; J.poison = false; J.dlqCount++; }
          else { poisonRetries = camp * S; campBlocked = true; }
        }
        let otpAgeSec, throttledRps, campaignRps, otpThrottlePct;
        if (J.lanes === 'split') {
          const tries = J.otpRps + (campBlocked ? 0 : camp);
          const frac = tries > P ? (tries - P) / tries : 0;
          throttledRps = Math.round(tries * frac);
          otpThrottlePct = Math.round(frac * 100);
          otpAgeSec = frac > 0 ? 8 : 1;              // 429 ke baad backoff wali retry
          campaignRps = campBlocked ? 0 : Math.round(camp * (1 - frac));
        } else {
          const tries = campBlocked ? 0 : camp;       // poison sabse aage: poori line ruki
          const sent = Math.min(tries, P);
          throttledRps = Math.max(0, tries - P);
          otpThrottlePct = tries ? Math.round(throttledRps / tries * 100) : 0;
          otpAgeSec = sent ? J.backlog / sent : Infinity;
          campaignRps = sent;
        }
        J.backlog = Math.max(0, J.backlog - campaignRps * S);
        const dupSent = J.dedup ? 0 : Math.round(J.otpRps * J.dupRate * S);
        const offers = J.offersPerUser ? (J.userCap ? Math.min(J.userCap, J.offersPerUser) : J.offersPerUser) : 0;
        const ok = otpAgeSec <= 30;
        panel(`JOBS RUN — ${S}s`, [
          `lanes            ${J.lanes === 'split' ? 'split (OTP alag)' : 'shared FIFO'}`,
          `provider (FCM)   hadd ${num(P)}/s · 429 ${throttledRps ? num(throttledRps) + '/s ❌' : '0 ✅'}`,
          `OTP              ${num(J.otpRps)}/s aaye · age p99 ${dur(otpAgeSec)} ${ok ? '✅' : '❌'} (target 30s)` + (J.lanes === 'split' && otpThrottlePct ? ` · ${otpThrottlePct}% pehli koshish mein 429` : ''),
          `campaign         ${num(campaignRps)}/s bheje · backlog ${num(J.backlog)}` + (campaignRps ? ` · ETA ~${dur(J.backlog / campaignRps)}` : ''),
          ...(campBlocked ? [`poison           ek hi job ${num(poisonRetries)} baar retry — campaign lane ruki ❌`] : parked ? ['poison           1 kharab job 3 koshish ke baad DLQ mein ✅ — lane chal padi'] : []),
          ...(J.dupRate ? [`duplicates       ${dupSent ? num(dupSent) + ' notifications do baar gaye ❌' : '0 ✅ (dedup)'}`] : []),
          ...(offers ? [`offers per user  ${offers}/din ${J.userCap ? '✅' : '❌ (cap nahi)'}`] : []),
        ]);
        return rec({ kind: 'jobs', op: 'run', secs: S, lanes: J.lanes, otpAgeSec: isFinite(otpAgeSec) ? Math.round(otpAgeSec) : 999999, otpThrottlePct, throttledRps, campaignRps, backlog: J.backlog, poisonRetries, parked, dupSent, offersPerUser: offers });
      }
      err(`400 — 'jobs ${verb}' samajh nahi aaya. 'help' dekho.`);
    },
  });
})();

/* =====================================================================
   FLEET — edge config rollout (2026-11-25, on-call shift boss-feed)
   Cloudflare 18 Nov 2025 (data-feed.js pm-config): feature file har 5 minute banti hai; proxy ki hardcoded
   hadd 200 features (aam ~60). ClickHouse ke nodes aadhe update → file baari-baari KHARAB (230) / THEEK (60)
   → outage "flicker" karta hai. Model (har `fleet run N`, 5-minute slots):
     generator ON  → har slot nayi file (230, 60, 230, …)        · paused → koi nayi file nahi
     validate ON   → 200 se badi file REJECT, purani (LKG) par raho · OFF → panic → 5xx
     staged ON     → nayi file pehle 1 region (canary); kharab nikli toh wahin ruki · OFF → saare 6 regions ek saath
     probes        → internal = proxy ke andar se (proxy gira toh status page purana "hara") · external = user ka raasta
   ===================================================================== */
(function () {
  const baseDefault = SD.defaultSys;
  const REGIONS = ['mumbai', 'delhi', 'singapore', 'frankfurt', 'virginia', 'saopaulo'];
  SD.defaultSys = function () {
    const s = baseDefault();
    s.fleet = { cur: 230, lkg: 60, generator: true, slot: 0, validate: false, staged: false, probes: 'internal', down: REGIONS.length, log: [] };
    return s;
  };
  const LIMIT = 200, PATTERN = [60, 230];   // agla slot theek, phir kharab, … (flicker)
  const word = (norm, i) => (norm.split(/\s+/)[i] || '').toLowerCase();
  (SD.perfsimPlugins = SD.perfsimPlugins || []).push({
    match: /^fleet\b/i,
    help: ['FLEET (edge config: feature file har 5 min; proxy ki hadd 200 features)',
      '  fleet status · fleet history          regions ka haal · pichhle pushes (kya deploy hua?)',
      '  fleet run 10                          10 minute dekho (2 slots)',
      '  fleet generator pause|resume · fleet rollback   nayi files roko · sab regions LKG par',
      '  fleet validate on|off · fleet staged on|off · fleet probe internal|external'],
    run(api, norm) {
      const { sim, print, table, panel, rec, err } = api;
      const F = sim.sys.fleet;
      const verb = word(norm, 1), arg = word(norm, 2);
      const onoff = v => { if (!['on', 'off'].includes(v)) err('400 — on ya off likho'); return v === 'on'; };
      const lied = () => F.probes === 'internal' && F.down > 0;
      if (!verb || verb === 'status') {
        table(['region', 'feature file', 'users ko'], REGIONS.map((r, i) => [r, (i < F.down ? F.cur : F.lkg) + ' features', i < F.down ? '5xx ❌' : '200 ✅']));
        print(F.down ? 'err' : 'ok', `status page (${F.probes} probes): ${lied() ? '🟢 "sab theek" — par probes khud gire hue proxy ke andar se jaate hain (purana data!)' : F.down ? `🔴 ${F.down}/6 regions down` : '🟢 sab theek'}` +
          `\ngenerator ${F.generator ? 'ON (har 5 min nayi file)' : 'PAUSED'} · validate ${F.validate ? 'ON' : 'OFF'} · staged ${F.staged ? 'ON (canary pehle)' : 'OFF (sab regions ek saath)'}`);
        return rec({ kind: 'fleet', op: 'status', down: F.down, probes: F.probes, statusPageLied: lied() });
      }
      if (verb === 'history') {
        print('ok', ['pichhle 30 minute ke deploys:', '  -30 min  ClickHouse permission change (security ke liye) — nodes ek-ek karke',
          ...(F.log.length ? F.log.slice(-6) : ['  -25 min  feature file 230 features → sab regions', '  -20 min  feature file 60 features → sab regions', '  -15 min  feature file 230 features → sab regions', '  -10 min  feature file 60 features → sab regions', '   -5 min  feature file 230 features → sab regions'])].join('\n'));
        return rec({ kind: 'fleet', op: 'history' });
      }
      if (verb === 'generator') {
        if (!['pause', 'resume'].includes(arg)) err('400 — fleet generator pause | resume');
        F.generator = arg === 'resume';
        print('ok', F.generator ? 'Generator chalu — har 5 minute nayi feature file.' : 'Generator PAUSED — nayi files nahi banengi. (Jo file abhi lagi hai, woh lagi rahegi.)');
        return rec({ kind: 'fleet', op: 'generator', generator: F.generator });
      }
      if (verb === 'rollback') {
        F.down = 0; F.cur = F.lkg;
        print('ok', `Saare regions last-known-good file (${F.lkg} features) par.`);
        return rec({ kind: 'fleet', op: 'rollback', down: 0 });
      }
      if (verb === 'validate') { F.validate = onoff(arg); print('ok', F.validate ? `Proxy ab har nayi file jaanchega: ${LIMIT} se zyada features → REJECT + alert, purani file par rahega.` : 'Validation band — badi file par proxy panic karega.'); return rec({ kind: 'fleet', op: 'validate', validate: F.validate }); }
      if (verb === 'staged') { F.staged = onoff(arg); print('ok', F.staged ? 'Staged rollout: nayi file pehle 1 region (canary); kharab nikli toh wahin rukegi.' : 'Staged band — har file saare regions par ek saath.'); return rec({ kind: 'fleet', op: 'staged', staged: F.staged }); }
      if (verb === 'probe') {
        if (!['internal', 'external'].includes(arg)) err('400 — fleet probe internal | external');
        F.probes = arg; print('ok', arg === 'external' ? 'Status page ab bahar se (user ke raaste) probe karta hai.' : 'Status page proxy ke andar se probe karta hai.');
        return rec({ kind: 'fleet', op: 'probe', probes: arg });
      }
      if (verb === 'run') {
        const N = arg ? parseInt(arg, 10) : 10;
        if (!Number.isInteger(N) || N < 5 || N > 60 || N % 5) err('400 — 5 ke guna mein minute do (5–60): fleet run 10');
        sim.timeSec += N * 60;
        let errMinutes = 0, maxDown = F.down, rejected = 0, pushes = 0, liedSlots = 0;
        const lines = [];
        for (let k = 0; k < N / 5; k++) {
          errMinutes += F.down ? 5 : 0;           // is slot ki shuruaat mein jo down hain, 5 minute down
          if (lied()) liedSlots++;
          if (!F.generator) { lines.push(`  +${(k + 1) * 5} min  koi nayi file nahi (generator paused) · ${F.down}/6 down`); continue; }
          const feat = PATTERN[F.slot % 2]; F.slot++; pushes++;
          if (feat > LIMIT && F.validate) { rejected++; lines.push(`  +${(k + 1) * 5} min  nayi file ${feat} features → REJECT (validate) · purani par · ${F.down}/6 down`); }
          else if (feat > LIMIT) {
            const hit = F.staged ? 1 : REGIONS.length;
            F.down = Math.max(F.down, hit); F.cur = feat;
            lines.push(`  +${(k + 1) * 5} min  nayi file ${feat} features → ${F.staged ? 'canary (mumbai) par PANIC, rollout ruka' : 'SAB regions par PANIC'} · ${F.down}/6 down`);
            if (F.staged) { F.down = 0; F.cur = F.lkg; }   // canary kharab → wahin wapas LKG (agle slot tak)
          } else { F.down = 0; F.cur = feat; F.lkg = feat; lines.push(`  +${(k + 1) * 5} min  nayi file ${feat} features → sab theek · 0/6 down`); }
          maxDown = Math.max(maxDown, F.down, feat > LIMIT && !F.validate ? (F.staged ? 1 : REGIONS.length) : 0);
        }
        F.log.push(...lines.map(l => l.replace(/^\s+\+/, '  ')));
        panel(`FLEET RUN — ${N} min`, [...lines, `5xx wale minute: ${errMinutes} · REJECT: ${rejected} · status page ne jhooth bola: ${liedSlots ? liedSlots + ' slot ❌' : 'nahi ✅'}`]);
        return rec({ kind: 'fleet', op: 'run', minutes: N, errMinutes, maxDown, rejected, pushes, liedSlots, down: F.down });
      }
      err(`400 — 'fleet ${verb}' samajh nahi aaya. 'help' dekho.`);
    },
  });
})();

/* =====================================================================
   RT — realtime gateways (2026-11-25: on-call shift 'chatdock' + chaos deck 'shapes', level realtime;
   data-shapes.js 'realtime' lesson). 10 lakh concurrent ÷ 50,000 per node = 20 gateways. Ek node ~1,000
   reconnects/second sambhalta hai (auth + subscriptions + "kya miss hua"). Model:
     send      100 members ka group: 90 online, 10 offline. persist OFF = jise live push nahi mila, uska message
               hamesha ke liye gaya. Online mein se sirf 5 sender ke gateway par (90 ÷ 20 gateways); pubsub OFF = baaki
               85 tak push pahunchta hi nahi ("gateway-3 ko pata hi nahi B kahan hai"). 30 online members 2 min se chup;
               proxy/NAT ~60s idle par connection chupchaap kaat dete hain (nginx / AWS ALB ka default 60s) —
               heartbeat (ping < 60s) na ho toh server unhe "online" maanta rehta hai aur push hawa mein jaata hai.
     restart   ek gateway ke 50,000 clients: bina jitter ~1 second mein sab baaki 19 par → 2,632/node → overload → cascade
               full jitter ~30 second mein phailata hai → 88/node/second
     reconnect 3 din baad lauti user ka backlog 40,000 messages → bina hadd ~12s tak us gateway par sab ruke
   Default mein persist/jitter/backlog-limit TOOTE hain (shift unhe theek karti hai); pubsub/heartbeat SWASTH hain.
   ===================================================================== */
(function () {
  const baseDefault = SD.defaultSys;
  SD.defaultSys = function () {
    const s = baseDefault();
    s.rt = { users: 1000000, perNode: 50000, nodes: 20, persist: false, jitter: false, backlogLimit: 0, pubsub: true, heartbeatSec: 25 };
    return s;
  };
  const num = n => Math.round(n).toLocaleString('en-IN');
  const word = (norm, i) => (norm.split(/\s+/)[i] || '').toLowerCase();
  const PER_NODE_RECONNECT = 1000, MISSED = 40000, MS_PER_MSG = 0.3;
  const IDLE_CUT = 60, SAME_GW = 5, IDLE = 30, SAME_GW_IDLE = 2;
  const hbOk = R => R.heartbeatSec > 0 && R.heartbeatSec < IDLE_CUT;
  (SD.perfsimPlugins = SD.perfsimPlugins || []).push({
    match: /^rt\b/i,
    help: ['RT (realtime chat: 20 gateways × 50,000 sockets)',
      '  rt status                           gateways aur settings',
      '  rt send                             100 members ke group mein ek message (10 offline)',
      '  rt restart gateway-3                ek gateway ka deploy — uske clients reconnect karenge',
      '  rt reconnect riya                   3 din baad lauti user ka backlog',
      '  rt persist on|off · rt jitter on|off · rt backlog-limit <N>',
      '  rt pubsub on|off · rt heartbeat <sec> (0 = band)'],
    run(api, norm) {
      const { sim, print, panel, rec, err } = api;
      const R = sim.sys.rt;
      const verb = word(norm, 1), arg = word(norm, 2);
      const onoff = v => { if (!['on', 'off'].includes(v)) err('400 — on ya off likho'); return v === 'on'; };
      if (!verb || verb === 'status') {
        panel('RT GATEWAYS', [
          `users online     ${num(R.users)}${hbOk(R) ? '' : ' (registry ka andaaza — bina ping sach pata nahi)'} · ${R.nodes} gateways × ${num(R.perNode)} sockets`,
          `persist          ${R.persist ? 'ON — pehle store, phir push ✅' : 'OFF — sirf push (offline ko kuch nahi)'}`,
          `pubsub           ${R.pubsub ? 'ON — gateways ke beech Redis pub/sub (har gateway tak message)' : 'OFF — har gateway sirf apne sockets jaanta hai'}`,
          `heartbeat        ${R.heartbeatSec > 0 ? 'har ' + R.heartbeatSec + 's ping/pong' : '— (koi ping nahi)'} · proxy/NAT idle cut ~${IDLE_CUT}s`,
          `reconnect        ${R.jitter ? 'exponential backoff + full jitter (~30s mein phaila)' : 'fixed 1s — sab ek saath'}`,
          `backlog limit    ${R.backlogLimit ? num(R.backlogLimit) + ' messages, phir "aur load karo"' : '— (jitna miss hua, sab ek saath)'}`,
        ]);
        return rec({ kind: 'rt', op: 'status', persist: R.persist, jitter: R.jitter, backlogLimit: R.backlogLimit, pubsub: R.pubsub, heartbeatSec: R.heartbeatSec });
      }
      if (verb === 'pubsub') { R.pubsub = onoff(arg); print('ok', R.pubsub ? 'Pub/sub ON: gateway message ko channel par daalta hai; jis gateway par member ka socket hai, wahi push karta hai.' : 'Pub/sub band — har gateway sirf apne sockets tak.'); return rec({ kind: 'rt', op: 'pubsub', pubsub: R.pubsub }); }
      if (verb === 'heartbeat') {
        const v = parseInt(arg, 10);
        if (!Number.isInteger(v) || v < 0 || v > 300) err('400 — rt heartbeat <0 se 300 second> (0 = band)');
        R.heartbeatSec = v;
        print('ok', v ? `Ab har ${v}s ping/pong: idle connection zinda rehti hai, aur jo pong na de use server band karke "offline" maanta hai.${v >= IDLE_CUT ? ` Dhyaan: proxy/NAT ~${IDLE_CUT}s idle par kaat dete hain.` : ''}` : 'Heartbeat band.');
        return rec({ kind: 'rt', op: 'heartbeat', heartbeatSec: v });
      }
      if (verb === 'persist') { R.persist = onoff(arg); print('ok', R.persist ? 'Ab har message pehle log/DB mein, phir connected logon ko push. Reconnect par client last_seen_id se gap bharega.' : 'Persist band — sirf push.'); return rec({ kind: 'rt', op: 'persist', persist: R.persist }); }
      if (verb === 'jitter') { R.jitter = onoff(arg); print('ok', R.jitter ? 'Clients ab exponential backoff + full jitter se reconnect karenge.' : 'Jitter band — fixed 1s.'); return rec({ kind: 'rt', op: 'jitter', jitter: R.jitter }); }
      if (verb === 'backlog-limit') {
        const v = parseInt(arg, 10);
        if (!Number.isInteger(v) || v < 0 || v > 100000) err('400 — 0 se 100000 ke beech (0 = hadd nahi)');
        R.backlogLimit = v; print('ok', v ? `Reconnect par max ${num(v)} messages; baaki "aur load karo" se pagination.` : 'Backlog limit hata.');
        return rec({ kind: 'rt', op: 'backlog-limit', backlogLimit: v });
      }
      if (verb === 'send') {
        sim.timeSec++;
        const online = 90, offline = 10;
        const reach = R.pubsub ? online : SAME_GW;                       // jin members ke gateway tak message pahuncha
        const ghost = hbOk(R) ? 0 : (R.pubsub ? IDLE : SAME_GW_IDLE);    // "online" dikhte, socket beech raste mar chuka
        const pushed = reach - ghost, missedOnline = online - pushed;
        const lost = R.persist ? 0 : missedOnline + offline;
        const lines = [`group "dinner-plans" (100 members, alag-alag gateways par): ${pushed} ko turant push ✅`];
        if (!R.pubsub) lines.push(`❌ ${online - SAME_GW} online members doosre gateways par — sender ke gateway-3 ko pata hi nahi woh kahan hain, unhe push gaya hi nahi`);
        if (ghost) lines.push(`❌ ${ghost} "online" members ke socket ~${IDLE_CUT}s idle par proxy/NAT ne chupchaap kaat diye — server ko pata nahi, push hawa mein gaya`);
        lines.push(`${offline} offline → ${R.persist ? 'store hua, reconnect par milega ✅' : 'store hi nahi hua'}`);
        if (missedOnline) lines.push(R.persist ? `(message store hai, toh ${missedOnline} online members ko app refresh/dobara kholne par milega — live nahi)` : '');
        if (lost) lines.push(`❌ ${lost} ke liye message HAMESHA ke liye gaya (sirf push tha, store nahi)`);
        print(lost || missedOnline ? 'err' : 'ok', lines.filter(Boolean).join('\n'));
        return rec({ kind: 'rt', op: 'send', online, offline, lost, pushed, missedOnline, ghost, pubsub: R.pubsub, heartbeatSec: R.heartbeatSec });
      }
      if (verb === 'restart') {
        if (!/^gateway-\d+$/.test(arg)) err('400 — rt restart gateway-3');
        sim.timeSec += 30;
        const conns = R.perNode, rest = R.nodes - 1;
        const spreadSec = R.jitter ? 30 : 1;
        const perNodeRate = conns / spreadSec / rest;
        const over = perNodeRate > PER_NODE_RECONNECT;
        const cascade = over ? 3 : 0;
        panel(`RESTART ${arg}`, [
          `${num(conns)} clients reconnect · ${R.jitter ? '~30s mein phaile (jitter)' : '~1 second mein ek saath'}`,
          `baaki ${rest} gateways par: ${num(perNodeRate)} reconnects/node/second (hadd ~${num(PER_NODE_RECONNECT)})`,
          over ? `💥 OVERLOAD — ${cascade} aur gateways gire, unke ${num(cascade * conns)} clients bhi reconnect… cascade` : '✅ sab gateways hadd ke andar',
        ]);
        return rec({ kind: 'rt', op: 'restart', perNodeRate: Math.round(perNodeRate), cascade, jitter: R.jitter });
      }
      if (verb === 'reconnect') {
        sim.timeSec++;
        const sent = R.backlogLimit ? Math.min(R.backlogLimit, MISSED) : MISSED;
        const blockedMs = Math.round(sent * MS_PER_MSG);
        print(blockedMs > 1000 ? 'err' : 'ok', `${arg || 'riya'} 3 din baad lauti: ${num(MISSED)} messages miss hue → ${num(sent)} ek saath bheje` +
          (R.backlogLimit ? ` + "aur load karo" ✅` : '') + ` · us gateway par baaki users ${blockedMs > 1000 ? (blockedMs / 1000).toFixed(1) + 's ruke ❌' : blockedMs + 'ms ✅'}`);
        return rec({ kind: 'rt', op: 'reconnect', sent, blockedMs });
      }
      err(`400 — 'rt ${verb}' samajh nahi aaya. 'help' dekho.`);
    },
  });
})();

/* =====================================================================
   CANARY — release gate ka ganit (2026-11-26, chaos deck 'feed', level rollout; data-feed.js 'rollout' lesson)
   Service 20,000 rps · baseline error 0.1% · naya version +0.02 percentage point (0.12%).
   Samples chahiye n ≈ 16 × p × (1 − p) ÷ delta² = 16 × 0.001 × 0.999 ÷ 0.0002² ≈ 3,99,600 (lesson: ~4,00,000).
   5% canary = 1,000 rps → ~400s (~6.7 min) mein farak dikhta hai. Budget: detect ≤ 15 min, canary ≤ 5%.
   Mitigation: automatic ~1 min, insaan ~20 min (lesson readout; Cloudflare 2019: detect 3 min, mitigate 25 min).
   `canary run` = ek rehearsal release jisme yahi chhupa +0.02pp regression hai:
     bake ke andar n samples mile → gate pakadta hai → rollback (auto 1 min / manual 20 min)
     bake khatam, samples kam → gate andha PASS → 100% par promote, control group gaya → 1 ghante tak kisi ko pata nahi
   ===================================================================== */
(function () {
  const baseDefault = SD.defaultSys;
  SD.defaultSys = function () {
    const s = baseDefault();
    s.canary = { trafficPct: 5, bakeMin: 15, autoRollback: true };
    return s;
  };
  const RPS = 20000, P = 0.001, DELTA = 0.0002, NEED = Math.round(16 * P * (1 - P) / (DELTA * DELTA));
  const AUTO_MIN = 1, HUMAN_MIN = 20, BLIND_MIN = 60, BUDGET_MIN = 15, BUDGET_PCT = 5;
  const num = n => Math.round(n).toLocaleString('en-IN');
  const min1 = m => (Math.round(m * 10) / 10).toFixed(1);
  const word = (norm, i) => (norm.split(/\s+/)[i] || '').toLowerCase();
  /* gate ka hisaab — status aur run dono isi se */
  SD.canaryModel = C => {
    const canaryRps = RPS * C.trafficPct / 100, samples = canaryRps * C.bakeMin * 60;
    const detectMin = NEED / canaryRps / 60, detected = samples >= NEED;
    const mitigationMin = detected ? (C.autoRollback ? AUTO_MIN : HUMAN_MIN) : null;
    const v2Rps = detected ? canaryRps : RPS;                       // andha PASS = sab par
    const exposedMin = detected ? detectMin + mitigationMin : C.bakeMin + BLIND_MIN;
    const extraErrors = detected ? canaryRps * DELTA * exposedMin * 60 : canaryRps * DELTA * C.bakeMin * 60 + RPS * DELTA * BLIND_MIN * 60;
    return { canaryRps, samples, detectMin, detected, mitigationMin, blastPct: detected ? C.trafficPct : 100, v2Rps, exposedMin, extraErrors };
  };
  (SD.perfsimPlugins = SD.perfsimPlugins || []).push({
    match: /^canary\b/i,
    help: ['CANARY (release gate · service 20,000 rps · baseline error 0.1% · naye version mein chhupa +0.02pp)',
      '  canary status                       settings aur gate ka hisaab',
      '  canary run                          ek rehearsal release chalao (gate pakadta hai ya nahi?)',
      '  canary set traffic <1-50> · canary set bake <1-60 min> · canary rollback auto|manual'],
    run(api, norm) {
      const { sim, print, panel, rec, err } = api;
      const C = sim.sys.canary;
      const verb = word(norm, 1), arg = word(norm, 2), val = word(norm, 3);
      if (!verb || verb === 'status') {
        const m = SD.canaryModel(C);
        panel('CANARY GATE', [
          `service          ${num(RPS)} rps · baseline error 0.1% · pakadna hai +0.02pp`,
          `samples chahiye  n ≈ 16 × p × (1 − p) ÷ delta² ≈ ${num(NEED)}`,
          `canary traffic   ${C.trafficPct}% = ${num(m.canaryRps)} rps (budget ≤ ${BUDGET_PCT}%)`,
          `bake             ${C.bakeMin} min → ${num(m.samples)} samples`,
          `rollback         ${C.autoRollback ? 'automatic (error baseline se upar → canary khud band)' : 'manual (pager → insaan → button)'}`,
        ]);
        return rec({ kind: 'canary', op: 'status', trafficPct: C.trafficPct, bakeMin: C.bakeMin, autoRollback: C.autoRollback, samples: Math.round(m.samples), need: NEED });
      }
      if (verb === 'set') {
        const v = parseInt(val, 10);
        if (arg === 'traffic') { if (!Number.isInteger(v) || v < 1 || v > 50) err('400 — canary set traffic <1 se 50 %>'); C.trafficPct = v; print('ok', `Canary ab ${v}% traffic (${num(RPS * v / 100)} rps) par.`); }
        else if (arg === 'bake') { if (!Number.isInteger(v) || v < 1 || v > 60) err('400 — canary set bake <1 se 60 minute>'); C.bakeMin = v; print('ok', `Gate ab ${v} minute dekhega, phir faisla.`); }
        else err('400 — canary set traffic <N> ya canary set bake <min>');
        return rec({ kind: 'canary', op: 'set', trafficPct: C.trafficPct, bakeMin: C.bakeMin });
      }
      if (verb === 'rollback') {
        if (!['auto', 'manual'].includes(arg)) err('400 — canary rollback auto ya manual');
        C.autoRollback = arg === 'auto';
        print('ok', C.autoRollback ? 'Rollback automatic: error baseline se upar gaya toh canary khud band.' : 'Rollback manual: gate alert bhejega, insaan rollback karega.');
        return rec({ kind: 'canary', op: 'rollback', autoRollback: C.autoRollback });
      }
      if (verb === 'run') {
        const m = SD.canaryModel(C);
        sim.timeSec += Math.round(m.exposedMin * 60);
        const lines = [
          `v2 → canary ${C.trafficPct}% = ${num(m.canaryRps)} rps · bake ${C.bakeMin} min · chhupa regression 0.1% → 0.12%`,
          m.detected
            ? `gate             ${min1(m.detectMin)} min par ${num(NEED)} samples — farak PAKDA ✅`
            : `gate             bake khatam: ${num(m.samples)} samples (chahiye ~${num(NEED)}) → andha PASS ❌`,
          m.detected
            ? `rollback         ${C.autoRollback ? `automatic — ${AUTO_MIN} min mein canary band ✅` : `pager → insaan jaaga → ~${HUMAN_MIN} min baad rollback ❌`}`
            : `promote          v2 100% par; control group gaya, 0.02pp kisi alert mein nahi: ${BLIND_MIN}+ min ❌`,
          `blast radius     ${m.blastPct}% traffic par v2 ${m.blastPct > BUDGET_PCT ? `❌ (budget ${BUDGET_PCT}%; bada bug = ${m.blastPct}% users)` : '✅'}`,
          `nuksaan          v2 par ${min1(m.exposedMin)} min · ~${num(m.extraErrors)} extra failed requests`,
        ];
        panel('CANARY RUN', lines);
        return rec({ kind: 'canary', op: 'run', trafficPct: C.trafficPct, bakeMin: C.bakeMin, autoRollback: C.autoRollback, samples: Math.round(m.samples), need: NEED,
          detected: m.detected, detectMin: m.detected ? Math.round(m.detectMin * 10) / 10 : null, mitigationMin: m.mitigationMin, blastPct: m.blastPct,
          exposedMin: Math.round(m.exposedMin * 10) / 10, extraErrors: Math.round(m.extraErrors) });
      }
      err(`400 — 'canary ${verb}' samajh nahi aaya. 'help' dekho.`);
    },
  });
})();

/* =====================================================================
   CLICKS — ad click pipeline (2026-11-26, chaos deck 'builds', level adclick; data-builds.js 'adclick' lesson)
   browser → ingest → Kafka (partition by ad_id, 12 partitions) → Flink (event-time 1-min window) → OLAP → dashboard/billing.
   `clicks run` = 08:59 wali window ek baar chalao:
     late      10,00,000 clicks, 4% late (lesson simulator) · pakde = late × min(1, watermark ÷ 30)  (stream window wala formula)
     clock     click 8:59:58 par hua, 9:00:03 par pahuncha → event time = 08:59 ✅ · processing time = 09:00 ❌
     workers   ek partition ek consumer — consumers > partitions = baaki khaali (lesson: --partitions 12 --consumers 20)
     hot ad    peak 10 lakh/s, ek ad (Super Bowl) 40% = 4,00,000/s · baaki 6,00,000/s 12 partitions par (50,000 each)
               salts N → ad_id:0…N-1 alag partitions par → sabse bhaari partition 50,000 + 4,00,000 ÷ N
   ===================================================================== */
(function () {
  const baseDefault = SD.defaultSys;
  SD.defaultSys = function () {
    const s = baseDefault();
    s.clicks = { watermarkSec: 30, clock: 'event', partitions: 12, consumers: 12, salts: 8 };
    return s;
  };
  const EVENTS = 1000000, LATE_PCT = 4, PEAK = 1000000, HOT_PCT = 40;
  const num = n => Math.round(n).toLocaleString('en-IN');
  const word = (norm, i) => (norm.split(/\s+/)[i] || '').toLowerCase();
  SD.clicksModel = K => {
    const late = EVENTS * LATE_PCT / 100, caught = K.watermarkSec <= 0 ? 0 : Math.round(late * Math.min(1, K.watermarkSec / 30));
    const hotRps = PEAK * HOT_PCT / 100, restPer = (PEAK - hotRps) / K.partitions, spread = Math.min(K.salts, K.partitions);
    const hottest = restPer + hotRps / spread, avg = PEAK / K.partitions;
    const active = Math.min(K.consumers, K.partitions);
    return { late, caught, dropped: late - caught, wrongMinute: K.clock !== 'event', active, idle: Math.max(0, K.consumers - K.partitions),
      hotRps, hottest, avg, hotSkewed: hottest > 2 * avg };
  };
  (SD.perfsimPlugins = SD.perfsimPlugins || []).push({
    match: /^clicks\b/i,
    help: ['CLICKS (ad click pipeline · Kafka 12 partitions by ad_id → Flink 1-min window → billing)',
      '  clicks status                       pipeline ki settings',
      '  clicks run                          08:59 wali window chalao (late clicks, minute, workers, hot ad)',
      '  clicks set watermark <sec> · clicks set clock event|processing · clicks set consumers <N> · clicks set salts <N>'],
    run(api, norm) {
      const { sim, print, panel, rec, err } = api;
      const K = sim.sys.clicks;
      const verb = word(norm, 1), arg = word(norm, 2), val = word(norm, 3);
      if (!verb || verb === 'status') {
        panel('CLICK PIPELINE', [
          `kafka            ${K.partitions} partitions (key: ad_id${K.salts > 1 ? ` + salt 0…${K.salts - 1} hot ad ke liye` : ''})`,
          `consumers        ${K.consumers}`,
          `window           1 min · ${K.clock === 'event' ? 'event time (click kab hua)' : 'processing time (event kab pahuncha)'}`,
          `watermark        ${K.watermarkSec ? K.watermarkSec + 's tak late events ka intezaar' : '— (window ghadi par band)'}`,
          `hot ad salts     ${K.salts}`,
        ]);
        return rec({ kind: 'clicks', op: 'status', ...K });
      }
      if (verb === 'set') {
        if (arg === 'clock') { if (!['event', 'processing'].includes(val)) err('400 — clicks set clock event|processing'); K.clock = val; print('ok', `Window ab ${val} time se.`); }
        else {
          const v = parseInt(val, 10);
          const lim = { watermark: [0, 600], consumers: [1, 100], salts: [1, 64] }[arg];
          if (!lim) err('400 — clicks set watermark|clock|consumers|salts <value>');
          if (!Number.isInteger(v) || v < lim[0] || v > lim[1]) err(`400 — ${arg}: ${lim[0]} se ${lim[1]} ke beech`);
          K[{ watermark: 'watermarkSec', consumers: 'consumers', salts: 'salts' }[arg]] = v;
          print('ok', { watermark: v ? `Window ab ${v}s tak late clicks ka intezaar karegi.` : 'Watermark hata — window ghadi par band.', consumers: `${v} consumers.`, salts: v > 1 ? `Hot ad ki key ab ${v} tukdon mein (ad_id:0…${v - 1}); dashboard tukde jodta hai.` : 'Salt nahi — hot ad ek hi key par.' }[arg]);
        }
        return rec({ kind: 'clicks', op: 'set', ...K });
      }
      if (verb === 'run') {
        sim.timeSec += 60;
        const m = SD.clicksModel(K);
        panel('CLICKS RUN — window 08:59', [
          `late clicks      ${num(EVENTS)} clicks, ${num(m.late)} late (${LATE_PCT}%) → ${m.dropped ? `${num(m.dropped)} chhoote ❌ (bill se gayab)` : 'sab pakde ✅'}`,
          `8:59:58 ka click 9:00:03 par pahuncha → ${m.wrongMinute ? '09:00 window ❌ (campaign 9:00 par khatam, bill se bahar)' : '08:59 window mein ✅'}`,
          `workers          ${K.partitions} partitions · ${K.consumers} consumers → ${m.active} kaam par${m.idle ? `, ${m.idle} khaali ❌ (1 partition = 1 consumer)` : ' ✅'}`,
          `hot ad           ${num(m.hotRps)}/s (${HOT_PCT}%) · sabse bhaari partition ${num(m.hottest)}/s (ausat ${num(m.avg)}) ${m.hotSkewed ? '❌ hot partition' : '✅'}`,
        ]);
        return rec({ kind: 'clicks', op: 'run', late: m.late, caught: m.caught, dropped: m.dropped, wrongMinute: m.wrongMinute, partitions: K.partitions, consumers: K.consumers,
          active: m.active, idle: m.idle, salts: K.salts, hottestRps: Math.round(m.hottest), avgRps: Math.round(m.avg), hotSkewed: m.hotSkewed });
      }
      err(`400 — 'clicks ${verb}' samajh nahi aaya. 'help' dekho.`);
    },
  });
})();

/* =====================================================================
   EXPERIMENT — chaos experiment aur uske guards (2026-11-26, chaos deck 'sdd-resil', level ch-kab;
   data-v2-chaos-4-kab.js — tools/faults.js aur tools/experiment.js ke asli output, 100 req/s, 4 s ki chot):
     zombie  (payments: health check + retry)  bimaar instance tak 133 · + passive ejection → 4 · fail 0, p99 28 / 24 ms
     slow    (payments, + retry + ejection)     fail 0, par 36 requests > 200 ms, p99 515 ms (ejection bina 133, p99 517)
     search  (sirf health check)                abort rule < 80% (har 500 ms) → ABORT 0.5 s, 17 fail · bina rule 6.0 s, 200 fail
             (kharab haalat mein 68% safal — 50% wala rule kabhi nahi bajta)
     staging (instance 3 pehle se zombie)       steady 68% → "shuru hi mat karo" · bina baseline check chot shuru
   Hypothesis: ≥ 95% safal; latency naapo toh "safal" = 200 ms ke andar.
   ===================================================================== */
(function () {
  const baseDefault = SD.defaultSys;
  SD.defaultSys = function () {
    const s = baseDefault();
    s.experiment = { eject: true, abortPct: 80, baseline: true, latency: true };
    return s;
  };
  const word = (norm, i) => (norm.split(/\s+/)[i] || '').toLowerCase();
  const HEAD = (c, t) => `chot             ${c} · instance 2 · ${t || '4 s'} · 100 req/s`;
  (SD.perfsimPlugins = SD.perfsimPlugins || []).push({
    match: /^experiment\b/i,
    help: ['EXPERIMENT (game day: chaos experiment ke guards · numbers ch-kab lab ke)',
      '  experiment status                   guards aur services',
      '  experiment run zombie|slow          payments (health check + retry) par chot',
      '  experiment run search               search (sirf health check) par zombie chot',
      '  experiment run staging              staging par chot (wahan instance 3 pehle se bimaar)',
      '  experiment set eject on|off · experiment set abort <pct>|off · experiment set baseline on|off · experiment set latency on|off'],
    run(api, norm) {
      const { sim, print, panel, rec, err } = api;
      const E = sim.sys.experiment;
      const verb = word(norm, 1), arg = word(norm, 2), val = word(norm, 3);
      const onoff = v => { if (!['on', 'off'].includes(v)) err('400 — on ya off likho'); return v === 'on'; };
      if (!verb || verb === 'status') {
        panel('GAME DAY', [
          `payments         health check + retry${E.eject ? ' + passive ejection (asli requests fail hon toh instance hatao)' : ' (passive ejection band)'}`,
          `search           sirf health check`,
          `abort rule       ${E.abortPct ? `safal < ${E.abortPct}% → turant roko (har 500 ms naap)` : '— (koi rok nahi; chot poore 6 s)'}`,
          `baseline check   ${E.baseline ? 'chot se pehle steady state ≥ 95%? warna shuru hi mat karo' : '— (bina jaanche shuru)'}`,
          `hypothesis       ≥ 95% safal · ${E.latency ? '"safal" = jawab aaya AUR 200 ms ke andar' : '"safal" = jawab aaya (waqt nahi gina)'}`,
        ]);
        return rec({ kind: 'experiment', op: 'status', ...E });
      }
      if (verb === 'set') {
        if (arg === 'eject') E.eject = onoff(val);
        else if (arg === 'baseline') E.baseline = onoff(val);
        else if (arg === 'latency') E.latency = onoff(val);
        else if (arg === 'abort') {
          if (val === 'off') E.abortPct = 0;
          else { const v = parseInt(val, 10); if (!Number.isInteger(v) || v < 10 || v > 99) err('400 — experiment set abort <10 se 99> ya off'); E.abortPct = v; }
        } else err('400 — experiment set eject|abort|baseline|latency <value>');
        print('ok', 'Theek. experiment status mein dekho.');
        return rec({ kind: 'experiment', op: 'set', ...E });
      }
      if (verb !== 'run') err(`400 — 'experiment ${verb}' samajh nahi aaya. 'help' dekho.`);
      sim.timeSec += 10;
      let L, r;
      if (arg === 'zombie') {
        const toBad = E.eject ? 4 : 133, p99 = E.eject ? 24 : 28;
        L = [HEAD('zombie (health check hara, asli calls fail)'), `payments         safal 100% · fail 0 · p99 ${p99} ms`,
          `bimaar tak       ${toBad} requests bimaar instance par ${toBad > 20 ? '❌ (har ek ka retry = double kaam)' : '✅ (jaldi hataya)'}`,
          `faisla           hypothesis tika`];
        r = { scenario: 'zombie', fails: 0, toBad, p99, verdict: 'tika' };
      } else if (arg === 'slow') {
        const slow = E.eject ? 36 : 133, p99 = E.eject ? 515 : 517;
        const pct = E.latency ? Math.round((400 - slow) / 400 * 1000) / 10 : 100;
        const verdict = pct >= 95 ? 'tika' : 'toota';
        L = [HEAD('dheema instance'), `payments         jawab 100% aaye · ${slow} requests 200 ms se dheemi · p99 ${p99} ms`,
          `hypothesis       ≥ 95% safal · ${E.latency ? `200 ms ke andar ${pct}%` : 'safal 100% (waqt nahi gina)'}`,
          `faisla           ${verdict === 'tika' ? 'hypothesis tika ✅ — report: "sab theek"' : `hypothesis TOOTA — report: ${slow} dheemi, p99 ${p99} ms (sach)`}`];
        r = { scenario: 'slow', fails: 0, slow, p99, verdict, slowReported: E.latency };
      } else if (arg === 'search') {
        const aborted = E.abortPct > 0 && 68 < E.abortPct;
        const faultSec = aborted ? 0.5 : 6.0, fails = aborted ? 17 : 200;
        L = [HEAD('zombie, service search (sirf health check)', '6 s tak'), `steady           100% → chot ke baad 68% safal`,
          aborted ? `abort rule       0.5 s par 68% < ${E.abortPct}% → ABORT ✅` : `abort rule       ${E.abortPct ? `68% < ${E.abortPct}%? nahi — rule nahi baja` : 'nahi'} → chot poore 6.0 s ❌`,
          `users par        ${fails} requests fail${aborted ? '' : ' ❌'} · faisla: hypothesis toota${aborted ? ' (jaldi roka)' : ''}`];
        r = { scenario: 'search', aborted, faultSec, fails, verdict: 'toota' };
      } else if (arg === 'staging') {
        const started = !E.baseline;
        const aborted = started && E.abortPct > 0 && 68 < E.abortPct;
        L = [HEAD('zombie, service staging (instance 3 pehle se zombie)', '6 s tak'), `steady           68% safal — chot se PEHLE`,
          E.baseline ? 'baseline check   68% < 95% → shuru hi mat karo ✅ (pehle system theek karo)'
            : `baseline check   nahi → instance 2 par bhi chot shuru ❌${aborted ? ' · 0.5 s par ABORT' : ' · 6.0 s'}`,
          started ? 'faisla           kuch nahi seekha — 68% chot se pehle hi tha; bimaar system ko aur chot di ❌' : 'faisla           experiment nahi chala (sahi)'];
        r = { scenario: 'staging', baselinePct: 68, started, aborted };
      } else err('400 — experiment run zombie | slow | search | staging');
      panel(`EXPERIMENT — ${arg}`, L);
      return rec({ kind: 'experiment', op: 'run', ...r });
    },
  });
})();

/* =====================================================================
   CHAIN — timeout, deadline, retries aur DLQ (2026-11-26, chaos deck 'fp-core', level fp-retry-kab;
   data-v2-fp-retry-4-kab.js — docker-labs/62-second-attempt ex2-deadline aur ex4-dlq-mttr ke asli output):
     run      user → A → B → C; C ek baar 20 s latka; user 10 s rukta hai; A→B 3 s, B→C 1 s; har layer 3 koshish, 100 ms backoff
              deadline aage + C cancel maane → C par 9 calls, C 8.4 s, user ke jaane ke baad 0 s
              deadline aage, C cancel na maane → C 180 s, user ke baad 127.8 s · deadline hi nahi → wahi (C ko pata hi nahi)
     retries  10 s deadline, 3 s timeout, backoff 2/4/8 s: koshish 1 (0–3), 2 (5–8) kaam ki; 3 (12–15), 4 (23–26) user ke baad
     dlq      SQS standard: DLQ retention PEHLE bheje samay se ginti; messages pehle 72 ghante mein barabar fail.
              lost = (72 + jaanch ka intezaar − retention) ÷ 72  → 4 din/48 h = 33% · 14 din/300 h = 50% · 14 din/48 h = 0%
   ===================================================================== */
(function () {
  const baseDefault = SD.defaultSys;
  SD.defaultSys = function () {
    const s = baseDefault();
    s.chain = { deadline: true, cancel: true, retryStop: true, dlqRetentionDays: 14, dlqAlert: true };
    return s;
  };
  const word = (norm, i) => (norm.split(/\s+/)[i] || '').toLowerCase();
  const ROWS = {   /* lab 62 ex2: [A, B, C thread-samay, C bekaar kaam, user ke jaane ke baad] */
    blind: [9.2, 9.6, 180.0, 180.0, 127.8], nocancel: [9.2, 9.0, 180.0, 180.0, 127.8], ok: [9.2, 9.0, 8.4, 8.4, 0.0] };
  SD.chainDlqLost = (retDays, waitH) => Math.round(Math.max(0, Math.min(1, (72 + waitH - retDays * 24) / 72)) * 100);
  (SD.perfsimPlugins = SD.perfsimPlugins || []).push({
    match: /^chain\b/i,
    help: ['CHAIN (user → A → B → C · timeout, deadline, retries, DLQ · numbers lab 62 ke)',
      '  chain status                        settings',
      '  chain run                           ek request: C ek baar 20 s latka, user 10 s rukta hai',
      '  chain retries                       10 s deadline mein retries ka hisaab (backoff 2/4/8 s)',
      '  chain dlq                           DLQ mein messages jaanch se pehle mit toh nahi rahe?',
      '  chain set deadline|cancel|retry-stop|dlq-alert on|off · chain set dlq-retention <din>'],
    run(api, norm) {
      const { sim, print, panel, rec, err } = api;
      const K = sim.sys.chain;
      const verb = word(norm, 1), arg = word(norm, 2), val = word(norm, 3);
      const onoff = v => { if (!['on', 'off'].includes(v)) err('400 — on ya off likho'); return v === 'on'; };
      const waitH = K.dlqAlert ? 48 : 300;
      if (!verb || verb === 'status') {
        panel('CHAIN SETTINGS', [
          `deadline         ${K.deadline ? 'aage bhejte hain (har call ke saath "kitna samay bacha")' : '— (sirf timeouts; neeche wale ko samay ka pata nahi)'}`,
          `C cancel         ${K.cancel ? 'deadline par kaam rokta hai (cooperative cancellation)' : 'nahi — deadline aaye toh bhi kaam karta rehta hai'}`,
          `retries          ${K.retryStop ? 'agli koshish deadline mein fit na ho toh ruko' : 'hamesha 4 koshish (deadline nahi dekhte)'}`,
          `DLQ              SQS standard · retention ${K.dlqRetentionDays} din (source 4 din) · ${K.dlqAlert ? 'depth/umar par alert (on-call ~48 ghante mein dekhta hai)' : 'koi alert nahi'}`,
        ]);
        return rec({ kind: 'chain', op: 'status', ...K });
      }
      if (verb === 'set') {
        const key = { deadline: 'deadline', cancel: 'cancel', 'retry-stop': 'retryStop', 'dlq-alert': 'dlqAlert' }[arg];
        if (key) K[key] = onoff(val);
        else if (arg === 'dlq-retention') { const v = parseInt(val, 10); if (!Number.isInteger(v) || v < 1 || v > 14) err('400 — SQS retention 1 se 14 din'); K.dlqRetentionDays = v; }
        else err('400 — chain set deadline|cancel|retry-stop|dlq-alert on|off · chain set dlq-retention <din>');
        print('ok', 'Theek. chain status mein dekho.');
        return rec({ kind: 'chain', op: 'set', ...K });
      }
      if (verb === 'run') {
        sim.timeSec += 30;
        const row = !K.deadline ? ROWS.blind : K.cancel ? ROWS.ok : ROWS.nocancel;
        const [a, b, c, waste, after] = row;
        panel('CHAIN RUN — user → A → B → C', [
          `haalat           C ek baar 20 s latka · user 10 s rukta hai · A→B 3 s, B→C 1 s · har layer 3 koshish`,
          `C par calls      9 (3 × 3)`,
          `thread-samay     A ${a.toFixed(1)} s · B ${b.toFixed(1)} s · C ${c.toFixed(1)} s`,
          `C ka bekaar kaam ${waste.toFixed(1)} s · user ke jaane ke baad ${after.toFixed(1)} s ${after > 1 ? '❌ (zombie kaam)' : '✅'}`,
        ]);
        return rec({ kind: 'chain', op: 'run', callsC: 9, threadA: a, threadB: b, threadC: c, cWaste: waste, afterUser: after });
      }
      if (verb === 'retries') {
        const tries = [[0, 3], [5, 8], [12, 15], [23, 26]];
        const L = tries.map(([s, e], i) => s + 3 <= 10 ? `koshish ${i + 1}       ${s}–${e} s ✓ deadline ke andar`
          : K.retryStop ? `koshish ${i + 1}       ${s} s par shuru hoti — deadline khatam, NAHI bheji ✅` : `koshish ${i + 1}       ${s}–${e} s ✗ user ja chuka (bekaar) ❌`);
        const wasted = K.retryStop ? 0 : 2;
        panel('RETRY PLAN — user 10 s · timeout 3 s · backoff 2, 4, 8 s', [...L, `→ kaam ki 2 · bekaar ${wasted}`]);
        return rec({ kind: 'chain', op: 'retries', useful: 2, wasted });
      }
      if (verb === 'dlq') {
        const lost = SD.chainDlqLost(K.dlqRetentionDays, waitH);
        panel('DLQ — SQS standard (retention pehle bheje samay se)', [
          `fail hote hain   pehle 72 ghante mein (barabar) · source retention 4 din`,
          `DLQ retention    ${K.dlqRetentionDays} din`,
          `koi dekhta hai   ${K.dlqAlert ? 'alert → ~48 ghante baad' : 'koi alert nahi → ~300 ghante (12.5 din) baad'}`,
          `jaanch se pehle mit gaye  ${lost}% ${lost ? '❌' : '✅'}`,
        ]);
        return rec({ kind: 'chain', op: 'dlq', retentionDays: K.dlqRetentionDays, waitH, lostPct: lost });
      }
      err(`400 — 'chain ${verb}' samajh nahi aaya. 'help' dekho.`);
    },
  });
})();
