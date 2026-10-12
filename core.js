/* =====================================================================
   SQL Gurukul — Core: state, XP, streak, spaced repetition, registry
   Loaded FIRST. Everything lives under the global `SD` namespace so
   content files (data-*.js) can self-register levels & cards.
   (Ported from kubegurukul/core.js — SQL & MySQL edition)
   ===================================================================== */

/* kuch purane browsers/webviews mein scrollIntoView nahi hota — app na toote */
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView)
  Element.prototype.scrollIntoView = function () {};

const SD = {
  STORE_KEY: 'sysdesigngurukul-v1',
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
    xp: 0,
    completed: [],        // level ids
    stars: {},            // levelId -> 1..3
    dojo: {},             // cardId -> { box, due (ms), front, back, tag }
    streak: { last: null, count: 0, best: 0 },
    levelStarts: 0,       // for pop-quiz cadence
  };
};

SD.loadState = function () {
  try {
    const s = JSON.parse(localStorage.getItem(SD.STORE_KEY));
    if (s && typeof s.xp === 'number' && Array.isArray(s.completed)) {
      // forward-compat: fill any missing keys added in later versions
      return Object.assign(SD.defaultState(), s);
    }
  } catch (e) { /* corrupted store — start fresh */ }
  return SD.defaultState();
};
SD.saveState = function () { localStorage.setItem(SD.STORE_KEY, JSON.stringify(SD.state)); };
SD.state = SD.loadState();

/* ---------------- DOM helpers ---------------- */
SD.el = function (tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
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

/* ---------------- XP & ranks ---------------- */
SD.currentRank = function () {
  let r = RANKS[0];
  for (const rank of RANKS) if (SD.state.xp >= rank.xp) r = rank;
  return r;
};
SD.nextRank = function () { return RANKS.find(r => r.xp > SD.state.xp) || null; };
SD.addXP = function (n) {
  if (SD.session && SD.session.replay) return;
  if (n <= 0) return;
  SD.state.xp += n;
  SD.touchStreak();
  SD.saveState();
  if (typeof renderTopbar === 'function') renderTopbar();
  SD.floatXP(n);
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
