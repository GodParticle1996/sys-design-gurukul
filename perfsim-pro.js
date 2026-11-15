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
        print(ok ? 'ok' : 'err', `${n} mein se 1 server mara → baaki ${n - 1} par peak: ${util}% ${ok ? '✅ jhel liya' : '💀 overload (model ki hadd 85% se upar: queue aur timeouts)'}`);
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
      '  fanout --mode write | read | hybrid [--celeb-threshold 100000]'],
    run(api, norm) {
      const { table, print, rec, err } = api;
      const mode = ((norm.match(/--mode\s+(\S+)/i) || [])[1] || '').toLowerCase();
      if (!['write', 'read', 'hybrid'].includes(mode)) err('400 — --mode write, read ya hybrid do');
      const thrRaw = flag(norm, 'celeb-threshold');
      if (mode !== 'hybrid' && thrRaw != null) err('400 — --celeb-threshold sirf hybrid mode mein');
      const thr = thrRaw == null ? 100000 : thrRaw;
      if (!Number.isFinite(thr) || thr < 1000 || thr > 1e8) err('400 — --celeb-threshold 1000 se 10 crore ke beech do');
      /* postsPerDay = aam users ke posts; celebrity posts alag (100 × 20 = 2,000). */
      const sourcePosts = FEED.postsPerDay + FEED.celebs * FEED.celebPostsPerDay;
      const normalCopies = FEED.postsPerDay * FEED.friends, celebCopies = FEED.celebs * FEED.celebPostsPerDay * FEED.celebFollowers;
      let inboxCopies, feedMs, celebLagMin, celebPushed = false;
      if (mode === 'write') { inboxCopies = normalCopies + celebCopies; feedMs = 20; celebLagMin = Math.round(FEED.celebFollowers / 50000 / 60); }
      else if (mode === 'read') { inboxCopies = 0; feedMs = 800; celebLagMin = 0; }
      else { celebPushed = thr > FEED.celebFollowers; /* ≥ threshold followers = pull */ inboxCopies = normalCopies + (celebPushed ? celebCopies : 0); feedMs = celebPushed ? 20 : 60; celebLagMin = celebPushed ? Math.round(FEED.celebFollowers / 50000 / 60) : 0; }
      table(['mode', 'naye posts / din', 'inbox copies / din', 'feed p99', 'celebrity post ka lag'], [[mode + (mode === 'hybrid' ? ` (≥ ${num(thr)} followers = pull)` : ''), num(sourcePosts), inboxCopies ? crore(inboxCopies) : '0', feedMs + ' ms', celebLagMin ? celebLagMin + ' min tak' : 'turant (padhte waqt)']]);
      print('ok', { write: 'Post karte hi har dost ki inbox mein copy. Padhna sasta; celebrity ka ek post = 50 lakh writes.',
        read: 'Post sirf ek baar likho; feed khulne par 200 doston ke posts jodo. Likhna sasta, padhna mehenga.',
        hybrid: celebPushed ? `Threshold ${num(thr)} celebrities ke 50 lakh followers se upar hai, toh celebrities bhi push ho rahi hain — write mode jaisa bojh.` : 'Aam users push (write par), celebrities pull (padhte waqt). Dono ka sasta hissa.' }[mode] + '  (Model ke chune hue numbers; feed ka SLO: p99 200 ms. Celebrity lag maan ke: 50,000 inbox writes/second.)');
      return rec({ kind: 'fanout', mode, threshold: mode === 'hybrid' ? thr : null, sourcePosts, inboxCopies, feedMs, celebLagMin });
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
        print('ok', `N = ${K.n}, W = ${K.w}, R = ${K.r} → R + W = ${K.r + K.w} ${K.r + K.w > K.n ? '> N: har read mein kam se kam ek taaza replica aata hai' : '≤ N: read aur write ke replicas alag ho sakte hain'}`);
        return rec({ kind: 'kv', op: 'status', w: K.w, r: K.r });
      }
      if (verb === 'config') {
        const w = Number((norm.match(/--w\s+(\S+)/i) || [])[1]), r = Number((norm.match(/--r\s+(\S+)/i) || [])[1]);
        if (![w, r].every(x => Number.isInteger(x) && x >= 1 && x <= 3)) err('400 — --w aur --r dono 1 se 3 ke beech do');
        K.w = w; K.r = r;
        print('ok', `W = ${w}, R = ${r}. R + W = ${w + r} ${w + r > K.n ? '> 3 → quorum overlap: read aur write kam se kam ek replica par milte hain.' : '≤ 3 → overlap ki guarantee nahi: purana balance padh sakte ho.'}`);
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
        const v = Number(word(norm, 3));
        if (!Number.isInteger(v) || v < 0 || v > 10000000) err('400 — rupaye ka poora number do, jaise kv put aman 500');
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
          (stale ? `\n   ⚠️ STALE — sabse naya v${K.latest} hai. Padhe gaye replicas tak write abhi pahuncha nahi (R + W = ${K.r + K.w} ≤ ${K.n}).` : '\n   ✅ Sabse naya version mila.'));
        return rec({ kind: 'kv', op: 'get', value: v, ver, latest: K.latest, stale, w: K.w, r: K.r });
      }
      err(`400 — 'kv ${verb}' samajh nahi aaya. 'help' dekho.`);
    },
  });
})();
