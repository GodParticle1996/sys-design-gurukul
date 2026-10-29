/* =====================================================================
   System Gurukul — Core: state, XP, streak, spaced repetition, registry
   Loaded FIRST. Everything lives under the global `SD` namespace so
   content files (data-*.js) can self-register levels & cards.
   (kubegurukul/core.js se shuru hua — System Gurukul edition)
   ===================================================================== */

/* kuch purane browsers/webviews mein scrollIntoView nahi hota — app na toote */
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView)
  Element.prototype.scrollIntoView = function () {};

const SD = {
  STORE_KEY: 'sysdesigngurukul-v1',
  SCHEMA_VERSION: 2,
  XP_PER_ITEM: 10,
  PERFECT_BONUS: 20,
  TERMINAL_XP: 30,       // base XP for completing a hands-on mission
  HINT_COST: 5,          // XP shaved off a terminal mission per hint
  CARD_XP: 5,            // XP per due flashcard reviewed
  POP_XP: 5,             // bonus XP per correct pop-quiz answer
  SRS_INTERVALS: [1, 3, 7, 16, 35],   // days — SM-2-lite boxes

  levelSets: {},         // trackId -> [level, ...]  (filled by data-*.js)
  tracks: [],            // filled by data-core.js
  state: null,
  session: null,
};

/* ---------------- level registry (extensibility hook) ----------------
   A data file calls:  SD.registerLevels('api', [ {...}, {...} ])
   Multiple calls append — so you can add ONE new level from ANY file. */
SD.registerLevels = function (trackId, levels) {
  if (!SD.levelSets[trackId]) SD.levelSets[trackId] = [];
  SD.levelSets[trackId].push(...levels);
};

/* Naya level track ke BEECH mein daalna ho (aur boss ko aakhir mein rakhna ho):
     SD.registerLevelsAfter('data', 'indexing', [ {...} ])
   Agar `afterId` nahi mila toh normal append ho jaata hai. */
SD.registerLevelsAfter = function (trackId, afterId, levels) {
  if (!SD.levelSets[trackId]) SD.levelSets[trackId] = [];
  const arr = SD.levelSets[trackId];
  const i = arr.findIndex(l => l.id === afterId);
  if (i < 0) arr.push(...levels);
  else arr.splice(i + 1, 0, ...levels);
};

/* Maujooda level ko BADHANA (naya video, wahi topic — naya level nahi banana):
     SD.extendLevel('scheduling', { objectives:[], lesson:[], stages:[], success:[],
                                    cards:[], interview:[questions] })
   Har cheez us level ke aakhir mein judti hai. Level na mile toh ERROR —
   chupchaap kuch na hona sabse bura bug hota. */
SD.extendLevel = function (levelId, add) {
  let lvl = null;
  Object.keys(SD.levelSets).forEach(t => (SD.levelSets[t] || []).forEach(l => { if (l.id === levelId) lvl = l; }));
  if (!lvl) throw new Error(`SD.extendLevel: level '${levelId}' nahi mila — file order check karo`);
  ['objectives', 'lesson', 'stages', 'success', 'cards'].forEach(k => {
    if (add[k] && add[k].length) lvl[k] = (lvl[k] || []).concat(add[k]);
  });
  if (add.interview && add.interview.length) {
    lvl.interview = lvl.interview || { title: 'Interview Round', instructions: '', questions: [] };
    lvl.interview.questions = lvl.interview.questions.concat(add.interview);
  }
  if (add.homework) lvl.homework = (lvl.homework || '') + add.homework;
  return lvl;
};

/* ---------------- persistence ---------------- */
SD.defaultState = function () {
  return {
    schemaVersion: SD.SCHEMA_VERSION,
    xp: 0,
    completed: [],        // level ids
    stars: {},            // levelId -> 1..3
    dojo: {},             // cardId -> { box, due (ms), front, back, tag }
    streak: { last: null, count: 0, best: 0 },
    levelStarts: 0,       // for pop-quiz cadence
    checkpoint: null,     // challenge boundary; partial answers/sim state are not saved
    theme: 'system',
    popBonus: { day: null, keys: [] },
    labsDone: [],         // 'project/exercise' — laptop par chalaaye gaye docker labs (self-reported ✔)
  };
};

SD.normalizeState = function (s) {
  const out = SD.defaultState();
  if (!s || typeof s !== 'object' || Array.isArray(s)) return out;
  const count = n => Number.isSafeInteger(n) && n >= 0;
  if (count(s.xp)) out.xp = s.xp;
  if (Array.isArray(s.completed)) out.completed = [...new Set(s.completed.filter(x => typeof x === 'string'))];
  if (s.stars && typeof s.stars === 'object' && !Array.isArray(s.stars))
    Object.entries(s.stars).forEach(([id, n]) => {
      if (!['__proto__', 'constructor', 'prototype'].includes(id) && Number.isInteger(n) && n >= 1 && n <= 3) out.stars[id] = n;
    });
  if (s.dojo && typeof s.dojo === 'object' && !Array.isArray(s.dojo))
    Object.entries(s.dojo).forEach(([id, c]) => {
      if (['__proto__', 'constructor', 'prototype'].includes(id) || !c || typeof c !== 'object') return;
      if (typeof c.front !== 'string' || typeof c.back !== 'string') return;
      out.dojo[id] = { front: c.front, back: c.back, tag: typeof c.tag === 'string' ? c.tag : '',
        box: count(c.box) ? Math.min(c.box, SD.SRS_INTERVALS.length - 1) : 0,
        due: Number.isFinite(c.due) && c.due >= 0 ? c.due : Date.now() };
    });
  if (s.streak && typeof s.streak === 'object') {
    out.streak.last = typeof s.streak.last === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.streak.last) ? s.streak.last : null;
    out.streak.count = count(s.streak.count) ? s.streak.count : 0;
    out.streak.best = Math.max(out.streak.count, count(s.streak.best) ? s.streak.best : 0);
  }
  if (count(s.levelStarts)) out.levelStarts = s.levelStarts;
  if (['light', 'dark', 'system'].includes(s.theme)) out.theme = s.theme;
  if (Array.isArray(s.labsDone)) out.labsDone = [...new Set(s.labsDone.filter(x => typeof x === 'string' && x.length <= 200))];
  if (s.popBonus && typeof s.popBonus.day === 'string' && Array.isArray(s.popBonus.keys))
    out.popBonus = { day: s.popBonus.day, keys: [...new Set(s.popBonus.keys.filter(x => typeof x === 'string'))] };
  const cp = s.checkpoint;
  if (cp && typeof cp.levelId === 'string' && count(cp.stageIdx) && count(cp.firstTry) && count(cp.total) && cp.firstTry <= cp.total)
    out.checkpoint = { levelId: cp.levelId, stageIdx: cp.stageIdx, firstTry: cp.firstTry, total: cp.total, pendingXP: count(cp.pendingXP) ? cp.pendingXP : 0,
      stages: Array.isArray(cp.stages) && cp.stages.every(x => typeof x === 'string') ? cp.stages.slice() : [] };
  return out;
};
SD.loadState = function () {
  try { return SD.normalizeState(JSON.parse(localStorage.getItem(SD.STORE_KEY))); }
  catch (e) { return SD.defaultState(); }
};
SD.saveState = function () {
  try {
    localStorage.setItem(SD.STORE_KEY, JSON.stringify(SD.state));
    SD.storageError = false;
    return true;
  } catch (e) { SD.storageError = true; return false; }
};
SD.state = SD.loadState();

SD.applyTheme = function () {
  const media = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: light)');
  const theme = SD.state.theme === 'system' ? (media && media.matches ? 'light' : 'dark') : SD.state.theme;
  if (document.documentElement) document.documentElement.dataset.theme = theme;
  return theme;
};
SD.applyTheme();
if (typeof window.matchMedia === 'function') {
  const media = window.matchMedia('(prefers-color-scheme: light)');
  if (media.addEventListener) media.addEventListener('change', () => SD.applyTheme());
}

/* ---------------- DOM helpers ---------------- */
SD.el = function (tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
/* Tap, Enter and Space share one action, including div-based diagram controls. */
SD.makeInteractive = function (node, action, label) {
  node.tabIndex = 0;
  if (node.setAttribute) node.setAttribute('role', 'button');
  if (label && node.setAttribute) node.setAttribute('aria-label', label);
  if (action) node.onclick = action;
  node.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (!node.disabled && !(node.getAttribute && node.getAttribute('aria-disabled') === 'true')) node.click();
  });
  return node;
};
SD.choiceFeedback = function (q, index) {
  const reasons = q.choiceExplanations || [];
  if (index !== q.answer) return reasons[index] || q.explain || 'Question ke constraints aur observed result ko compare karo.';
  const alternatives = q.choices.map((choice, i) => i === q.answer || !reasons[i] ? '' :
    `<li><b>${choice}</b>: ${reasons[i]}</li>`).join('');
  return (reasons[index] || q.explain || '') + (alternatives ? `<details class="choice-reasons"><summary>Baaki options kyun nahi?</summary><ul>${alternatives}</ul></details>` : '');
};
SD.shuffle = function (arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
SD.shake = function (node) {
  node.classList.remove('shake');
  void node.offsetWidth;
  node.classList.add('shake');
};
SD.escapeHtml = function (s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};
/* HTML → saada text (aria-label ke liye): tags hatao aur aam entities wapas badlo, warna screen reader "&lt;id&gt;" padhta hai. */
SD.plainText = function (html) {
  const ENT = { lt: '<', gt: '>', amp: '&', quot: '"', '#39': "'", nbsp: ' ' };
  return String(html).replace(/<[^>]*>/g, '').replace(/&(lt|gt|amp|quot|#39|nbsp);/g, (m, k) => ENT[k]).replace(/\s+/g, ' ').trim();
};

/* ---------------- XP & ranks ---------------- */
SD.currentRank = function () {
  let r = RANKS[0];
  for (const rank of RANKS) if (SD.state.xp >= rank.xp) r = rank;
  return r;
};
SD.nextRank = function () { return RANKS.find(r => r.xp > SD.state.xp) || null; };
SD.addXP = function (n) {
  if (!Number.isSafeInteger(n) || n <= 0) return;
  if (SD.session) {
    if (SD.session.replay || SD.session.completed) return;
    SD.session.pendingXP = (SD.session.pendingXP || 0) + n;
    return;
  }
  SD.commitXP(n);
};
SD.commitXP = function (n) {
  if (!Number.isSafeInteger(n) || n <= 0) return;
  SD.state.xp += n;
  SD.touchStreak();
  SD.saveState();
  if (SD.ui) SD.ui.renderTopbar();
  SD.floatXP(n);
};
SD.awardPopBonus = function (keys) {
  const today = SD.todayStr();
  if (SD.state.popBonus.day !== today) SD.state.popBonus = { day: today, keys: [] };
  let count = 0;
  keys.forEach(key => { if (!SD.state.popBonus.keys.includes(key)) { SD.state.popBonus.keys.push(key); count++; } });
  SD.commitXP(count * SD.POP_XP); SD.saveState();
  return count * SD.POP_XP;
};
SD.floatXP = function (n) {
  const bar = document.getElementById('topbar');
  const f = SD.el('div', 'xp-float', `+${n} XP`);
  bar.appendChild(f);
  setTimeout(() => f.remove(), 1200);
};

/* ---------------- daily streak ---------------- */
SD.todayStr = function () {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
SD.touchStreak = function () {
  const s = SD.state.streak;
  const today = SD.todayStr();
  if (s.last === today) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  s.count = (s.last === yesterday) ? s.count + 1 : 1;
  s.best = Math.max(s.best, s.count);
  s.last = today;
  SD.saveState();
};
SD.streakAlive = function () {
  const s = SD.state.streak;
  if (!s.last) return false;
  const today = SD.todayStr();
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  return s.last === today || s.last === yesterday;
};

/* ---------------- Revision Dojo: SM-2-lite spaced repetition ----------
   Card = { box, due, front, back, tag }.  box indexes SRS_INTERVALS.
   - level complete  -> level.cards enter the deck (due tomorrow)
   - wrong answer    -> auto "mistake card" (due tomorrow, box 0)
   - review correct  -> box+1 (capped), due = now + interval[box]
   - review wrong    -> box = 0, due tomorrow                      */
SD.DAY = 24 * 60 * 60 * 1000;

SD.addCard = function (id, front, back, tag) {
  if (SD.state.dojo[id]) return; // already in the deck
  SD.state.dojo[id] = { box: 0, due: Date.now() + SD.DAY, front, back, tag: tag || '' };
  SD.saveState();
};

/* called by game renderers on a wrong answer — turns the mistake into a card */
SD.noteMistake = function (front, back, tag) {
  if (SD.session && SD.session.replay) return;
  if (!front || !back) return;
  // stable id from the front text so the same mistake never duplicates
  let h = 0;
  for (let i = 0; i < front.length; i++) h = ((h << 5) - h + front.charCodeAt(i)) | 0;
  SD.addCard('mistake-' + Math.abs(h), front, back, tag || '🙈 Galti se seekho');
};

SD.enrollLevelCards = function (level) {
  (level.cards || []).forEach((c, i) =>
    SD.addCard(`${level.id}-c${i}`, c.front, c.back, `${level.icon} ${level.title}`));
};

SD.dueCards = function () {
  const now = Date.now();
  return Object.entries(SD.state.dojo)
    .filter(([, c]) => c.due <= now)
    .map(([id, c]) => ({ id, ...c }));
};

SD.reviewCard = function (id, remembered) {
  const c = SD.state.dojo[id];
  if (!c) return;
  if (remembered) {
    c.box = Math.min(c.box + 1, SD.SRS_INTERVALS.length - 1);
    c.due = Date.now() + SD.SRS_INTERVALS[c.box] * SD.DAY;
  } else {
    c.box = 0;
    c.due = Date.now() + SD.DAY;
  }
  SD.saveState();
};

/* ---------------- pop-quiz question harvesting ----------------
   Pulls MCQs from already-completed levels (quiz stages + interview). */
SD.harvestQuestions = function () {
  const qs = [];
  SD.tracks.forEach(t => (SD.levelSets[t.id] || []).forEach(lvl => {
    if (!SD.state.completed.includes(lvl.id)) return;
    (lvl.stages || []).forEach(st => {
      if (st.type === 'quiz') (st.questions || []).forEach(q => qs.push({ ...q, from: lvl }));
    });
    if (lvl.interview) (lvl.interview.questions || []).forEach(q => {
      if (q.choices) qs.push({ ...q, from: lvl });
    });
  }));
  return qs;
};

/* ---------------- docker labs ----------------
   Docker stage sawaal se poora hota hai; lab khud chalana alag se yaad rakha jaata hai.
   Ek hi lab exercise kai levels mein aa sakti hai — ek baar chalaayi toh sab jagah ho gayi. */
SD.labKey = stage => `${stage.project}/${stage.exercise || ''}`;
SD.labDone = stage => SD.state.labsDone.includes(SD.labKey(stage));
SD.markLabDone = function (stage) {
  if (SD.labDone(stage)) return;
  SD.state.labsDone.push(SD.labKey(stage));
  SD.saveState();
};
SD.pendingLabs = level => (level.stages || []).map((stage, index) => ({ stage, index }))
  .filter(({ stage }) => stage.type === 'docker' && !SD.labDone(stage));

/* ---------------- track helpers ---------------- */
SD.trackOf = function (level) {
  return SD.tracks.find(t => (SD.levelSets[t.id] || []).includes(level));
};
SD.levelsOf = function (track) { return SD.levelSets[track.id] || []; };
SD.trackProgress = function (track) {
  const levels = SD.levelsOf(track);
  const done = levels.filter(l => SD.state.completed.includes(l.id)).length;
  return { done, total: levels.length, complete: done === levels.length && levels.length > 0 };
};
SD.trackUnlocked = function (track) {
  /* Side-tracks (jaise 📡 The Feed) hamesha khule rehte hain — unmein naya
     content kabhi bhi aa sakta hai, isliye unhe pichhle track par mat roko. */
  if (track.alwaysUnlocked) return true;
  /* pichhla "kram wala" track dhoondo — beech ke hamesha-khule side-tracks ko chhod do,
     warna list mein upar rakha ek side-track agle core track ko lock kar dega */
  for (let i = SD.tracks.indexOf(track) - 1; i >= 0; i--) {
    if (!SD.tracks[i].alwaysUnlocked) return SD.trackProgress(SD.tracks[i]).complete;
  }
  return true;
};
