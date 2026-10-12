/* ex2 — stored listing kab sadti hai?
   CLOCK=submitted : rank = log10(score) + t_submitted/45000   (Reddit — ghadi se nahi badalta)
   CLOCK=now       : rank = log10(score) / (age + 2)^1.5       (Hacker News jaisa decay)

   Lab mein waqt TEZ chalta hai: 1 asli second = 1 simulated ghanta (SPEED se badlo). */
const { serve } = require('../lib/util');
const PORT = +(process.env.PORT || 4102);
const CLOCK = process.env.CLOCK || 'submitted';
const POSTS = +(process.env.POSTS || 2000);
const HOURS_PER_SECOND = +(process.env.SPEED || 1);
const BOOT = Date.now();

/* har post: score aur "kitne ghante pehle submit hua tha" (boot ke waqt) */
const posts = [];
for (let i = 0; i < POSTS; i++) posts.push({ id: 'p' + i, score: 1 + Math.floor(Math.random() * 400), age0: Math.random() * 48 });

const simHours = () => ((Date.now() - BOOT) / 1000) * HOURS_PER_SECOND;
const ageH = p => p.age0 + simHours();

function rankOf(p) {
  if (CLOCK === 'now') return Math.log10(Math.max(1, p.score)) / Math.pow(ageH(p) + 2, 1.5);
  /* submission time: post ka janam-samay kabhi nahi badalta */
  return Math.log10(Math.max(1, p.score)) + (-p.age0 * 3600) / 45000;
}
const truth = n => posts.slice().sort((a, b) => rankOf(b) - rankOf(a)).slice(0, n).map(p => p.id);

let listing = truth(1000);              /* stored answer — boot par ek baar bana */
let rebuilds = 0, repairs = 0;

function repair(post) {                 /* ek vote aaya: sirf us post ki jagah theek karo */
  const i = listing.indexOf(post.id);
  if (i > -1) listing.splice(i, 1);
  const r = rankOf(post);
  const byId = new Map(posts.map(p => [p.id, p]));
  let pos = listing.findIndex(id => rankOf(byId.get(id)) < r);
  if (pos < 0) pos = listing.length;
  listing.splice(pos, 0, post.id);
  listing = listing.slice(0, 1000);
  repairs++;
}

serve(PORT, {
  'POST /vote': (req, res, url, p, body) => {
    const post = posts.find(x => x.id === ((body && body.postId) || 'p0')) || posts[0];
    post.score++;
    repair(post);
    return { ok: true, id: post.id, score: post.score };
  },
  'GET /listing': () => ({ items: listing.slice(0, 25) }),           /* stored answer */
  'GET /truth': () => ({ items: truth(25) }),                        /* abhi ki sachchai */
  'POST /rebuild': () => { listing = truth(1000); rebuilds++; return { ok: true, rebuilds }; },
  'GET /stats': () => ({ clock: CLOCK, posts: POSTS, simHours: +simHours().toFixed(1), rebuilds, repairs }),
}, () => console.log(`  rank-service   → http://localhost:${PORT}  (CLOCK=${CLOCK} · 1 second = ${HOURS_PER_SECOND} simulated ghanta)`));
