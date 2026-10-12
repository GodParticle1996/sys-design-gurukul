/* ex3 — permissions kahan lagti hain?
   PERM=after  : pehle search, phir har result par permission check
   PERM=inside : user ke visible projects query ke ANDAR — engine baaki ko chhoota hi nahi */
const { serve, burn } = require('../lib/util');
const PORT = +(process.env.PORT || 4320);
const PERM = process.env.PERM || 'after';
const ISSUES = +(process.env.ISSUES || 300000);
const PROJECTS = +(process.env.PROJECTS || 2000);
const SHARDS = +(process.env.SHARDS || 64);
const CHECK_US = +(process.env.CHECK_US || 3);       /* ek permission check ka kharcha (microseconds) */

/* issues ko project ke hisaab se shards mein rakho — "jo saath query hota hai woh saath rahe" */
const shards = Array.from({ length: SHARDS }, () => []);
for (let i = 0; i < ISSUES; i++) {
  const project = i % PROJECTS;
  shards[project % SHARDS].push({ id: i, project, open: i % 3 !== 0, secured: i % 5000 === 0 });
}
/* har user ko kuch projects dikhte hain */
const visible = {};
for (let u = 0; u < 5; u++) visible['user' + u] = new Set(Array.from({ length: 40 }, (_, k) => (u * 40 + k) % PROJECTS));
visible['analyst'] = new Set(Array.from({ length: 80 }, (_, k) => k * 7 % PROJECTS));

function canSee(user, issue) {
  burn(CHECK_US / 1000);                              /* asli permission check ka kharcha */
  if (!visible[user].has(issue.project)) return false;
  return !issue.secured;                              /* issue-level security wale alag se */
}

serve(PORT, {
  'GET /search': (req, res, url) => {
    const user = url.searchParams.get('user') || 'analyst';
    const project = url.searchParams.get('project');
    const page = +(url.searchParams.get('page') || 1), size = 20;
    const t0 = Date.now();
    let checks = 0, scanned = 0, shardsTouched = 0;

    const vis = visible[user] || new Set();
    const shardList = project != null
      ? [shards[(+project) % SHARDS]]                                     /* project-scoped query */
      : (PERM === 'inside'
          ? shards.filter((_, i) => [...vis].some(p => p % SHARDS === i)) /* sirf visible projects wale shards */
          : shards);                                                     /* poora index */

    let matched = 0;
    const out = [];
    for (const sh of shardList) {
      shardsTouched++;
      for (const it of sh) {
        if (project != null && it.project !== +project) continue;
        scanned++;
        if (!it.open) continue;
        if (PERM === 'inside' && !vis.has(it.project)) continue;          /* query ke andar hi filter */
        matched++;
        if (PERM === 'after') { checks++; if (!canSee(user, it)) continue; }
        else if (it.secured) { checks++; if (!canSee(user, it)) continue; }
        if (out.length < page * size) out.push(it.id);
      }
    }
    return { user, matched, permissionChecks: checks, scanned, shardsTouched, totalShards: SHARDS, ms: Date.now() - t0, returned: Math.min(size, out.length) };
  },
  'GET /stats': () => ({ perm: PERM, issues: ISSUES, projects: PROJECTS, shards: SHARDS }),
}, () => console.log(`  search → http://localhost:${PORT}  (${ISSUES.toLocaleString('en-IN')} issues · ${PROJECTS} projects · ${SHARDS} shards · PERM=${PERM})`));
