/* =====================================================================
   System Gurukul — soch.js : 🧠 Soch Akhada   (CSS: extra.css)
   Soch-vichaar wale scenario sawal: ek asli jaisi samasya, 3–5 chhote kadam
   (har jawab par turant feedback), saare hal ki tulna, phir interviewer ka twist.

   Data (data-soch-*.js):  SD.registerScenarios([ { ... } ])
     { id, icon, title, topic, hard: 1|2|3, levels: ['levelId', ...],
       story: 'HTML', facts: ['HTML', ...],
       steps: [{ t: 'Asli wajah', q: 'HTML', a: [[jawab, kyun], ...] }],   // a[0] HAMESHA sahi jawab
       fixes: [{ n: 'Hal ka naam', how, cost, when }],
       twist: { q, a: [[jawab, kyun], ...] },                              // a[0] sahi
       asli: 'HTML — ek line ka nichod', say: 'HTML — interview mein aise bolo' }

   Niyam (EXTENDING.md §11): renderer apna state scenario data par nahi likhta; har button ki
   apni class hai (so-opt, so-next, so-done) — validator class se pakadta hai. Poori file IIFE mein.
   ===================================================================== */
(function () {
  const el = SD.el;

  SD.scenarios = [];
  SD.registerScenarios = function (list) { SD.scenarios.push(...list); };

  const TOPICS = [
    { id: 'flow',   icon: '🧭', name: 'Request ka raasta' },
    { id: 'api',    icon: '🔌', name: 'API' },
    { id: 'data',   icon: '🗄️', name: 'Data' },
    { id: 'resil',  icon: '🛡️', name: 'Resilience' },
    { id: 'dist',   icon: '🌐', name: 'Distributed' },
    { id: 'sec',    icon: '🔐', name: 'Security' },
    { id: 'obs',    icon: '📈', name: 'Observability aur cost' },
    { id: 'design', icon: '🏗️', name: 'Poora design' },
  ];
  const topicOf = id => TOPICS.find(t => t.id === id) || { id, icon: '🧠', name: id };
  const HARD = ['', 'Aasaan', 'Beech ka', 'Mushkil'];
  const stars = n => '★'.repeat(n) + '☆'.repeat(3 - n);
  const doneStars = id => (SD.state.soch && SD.state.soch[id]) || 0;

  function findLevel(id) {
    for (const track of SD.tracks) {
      const levels = SD.levelSets[track.id] || [];
      const i = levels.findIndex(l => l.id === id);
      if (i > -1) return { track, level: levels[i], open: SD.trackUnlocked(track) && (track.freeOrder || i === 0 || SD.state.completed.includes(levels[i - 1].id)) };
    }
    return null;
  }

  /* ------------------------------------------------------------------
     ek sawal: jawab shuffle hote hain; galat jawab par uska apna kaaran, phir dobara koshish
     ------------------------------------------------------------------ */
  function askBox(sc, head, q, answers, onRight) {
    const box = el('div', 'so-ask');
    box.appendChild(el('div', 'quiz-progress', head));
    box.appendChild(el('div', 'question', q));
    const choices = el('div', 'choices'), fb = el('div', 'feedback');
    const buttons = [];
    let wrong = false, done = false;
    SD.shuffle(answers.map((a, i) => ({ a, i }))).forEach(({ a, i }) => {
      const b = el('button', 'choice so-opt', a[0]);
      b.dataset.i = String(i);
      b.onclick = () => {
        if (done || b.disabled) return;
        if (i === 0) {
          done = true;
          b.classList.add('correct');
          buttons.forEach(x => { x.disabled = true; });
          const others = answers.slice(1).map(o => `<li><b>${o[0]}</b>: ${o[1]}</li>`).join('');
          fb.className = 'feedback good';
          fb.innerHTML = `✅ ${a[1]}<details class="choice-reasons"><summary>Baaki jawab kyun nahi?</summary><ul>${others}</ul></details>`;
          onRight(!wrong);
        } else {
          if (!wrong) SD.noteMistake(`🧠 ${sc.title} — ${q}`, `<b>${answers[0][0]}</b><br>${answers[0][1]}`, '🧠 Soch Akhada');
          wrong = true;
          b.classList.add('wrong');
          b.disabled = true;
          SD.shake(b);
          fb.className = 'feedback bad';
          fb.innerHTML = `❌ ${a[1]}<br><b>Ek baar aur socho.</b> Upar "Haalaat" dobara padho.`;
        }
      };
      buttons.push(b);
      choices.appendChild(b);
    });
    box.append(choices, fb);
    return box;
  }

  /* ------------------------------------------------------------------
     RENDER — ek scenario. mount = khaali element; hooks = { onList, onNext, onLevel }
     ------------------------------------------------------------------ */
  function render(sc, mount, hooks) {
    hooks = hooks || {};
    const topic = topicOf(sc.topic);
    const steps = sc.steps, parts = steps.length + 1;           /* +1 = twist */
    let firstTry = 0, finished = false;

    mount.appendChild(el('div', 'crumb', `🧠 Soch Akhada · ${topic.icon} ${topic.name} · ${HARD[sc.hard] || ''}`));
    mount.appendChild(el('h2', 'level-h', `${sc.icon} ${sc.title}`));
    mount.appendChild(el('div', 'so-scene',
      `<h4>📋 Haalaat</h4><p>${sc.story}</p><ul>${sc.facts.map(f => `<li>${f}</li>`).join('')}</ul>`));
    /* scene (scene.js): ghatna kadam-dar-kadam. Sirf jo hua woh dikhata hai — wajah ya hal ka naam nahi (sawaal wahi poochhte hain). */
    if (sc.scene && typeof SD.renderScene === 'function') {
      const dia = el('div', 'diagram so-scene-dia', `<div class="dg-title">🎬 Ghatna kadam-dar-kadam</div>`);
      dia.appendChild(SD.renderScene(sc.scene));
      mount.appendChild(dia);
    }
    const log = el('div', 'so-log');
    const stage = el('div', 'so-stage');
    mount.append(log, stage);

    function nextButton(text, go) {
      const b = el('button', 'btn big so-next', text);
      b.onclick = () => { if (b.disabled) return; b.disabled = true; go(); };
      stage.appendChild(b);
      b.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function showStep(i) {
      stage.innerHTML = '';
      const s = steps[i];
      stage.appendChild(askBox(sc, `Kadam ${i + 1} / ${steps.length} · ${s.t}`, s.q, s.a, first => {
        if (first) firstTry++;
        nextButton(i + 1 < steps.length ? 'Agla kadam →' : 'Saare hal ki tulna dekho →', () => {
          log.appendChild(el('div', 'so-logline', `✔ <b>Kadam ${i + 1} · ${s.t}:</b> ${s.a[0][0]}`));
          if (i + 1 < steps.length) showStep(i + 1); else showCompare();
        });
      }));
    }

    function showCompare() {
      stage.innerHTML = '';
      const box = el('div', 'guide-compare so-compare');
      box.innerHTML = '<h3>⚖️ Tulna: saare hal ek saath</h3><table><thead><tr><th>Hal</th><th>Kaise kaam karta hai</th><th>Keemat</th><th>Kab chuno</th></tr></thead><tbody>' +
        sc.fixes.map(f => `<tr><td data-label="Hal">${f.n}</td><td data-label="Kaise kaam karta hai">${f.how}</td><td data-label="Keemat">${f.cost}</td><td data-label="Kab chuno">${f.when}</td></tr>`).join('') +
        '</tbody></table>';
      stage.appendChild(box);
      nextButton('Ab interviewer ka twist →', showTwist);
    }

    function showTwist() {
      stage.innerHTML = '';
      stage.appendChild(el('div', 'iv-bubble', `<div class="iv-avatar">🧑‍💼</div><div class="iv-q"><b>Twist:</b> ${sc.twist.q}</div>`));
      stage.appendChild(askBox(sc, 'Interviewer ka twist', 'Ab tum kya karoge?', sc.twist.a, first => {
        if (first) firstTry++;
        nextButton('Nichod dekho →', finish);
      }));
    }

    function finish() {
      if (finished) return;
      finished = true;
      stage.innerHTML = '';
      const got = firstTry / parts >= 0.9 ? 3 : firstTry / parts >= 0.6 ? 2 : 1;
      const firstClear = !doneStars(sc.id);
      SD.state.soch = SD.state.soch || {};
      SD.state.soch[sc.id] = Math.max(doneStars(sc.id), got);
      SD.saveState();
      if (firstClear) SD.commitXP(firstTry * SD.XP_PER_ITEM);
      else SD.touchStreak();

      const end = el('div', 'so-end pop');
      end.innerHTML = `<div class="big-stars">${stars(got)}</div>
        <div class="sum-detail">${firstTry}/${parts} pehli baar mein sahi${firstClear ? ` · +${firstTry * SD.XP_PER_ITEM} XP` : ' · dobara khela (XP nahi)'}</div>
        <p class="asli">🎯 <b>Asli baat:</b> ${sc.asli}</p>
        <div class="so-say"><h4>🎤 Interview mein aise bolo</h4><p>${sc.say}</p></div>`;
      stage.appendChild(end);

      const related = (sc.levels || []).map(findLevel).filter(Boolean);
      if (related.length) {
        const rel = el('div', 'so-related');
        rel.appendChild(el('h4', null, '📚 Yeh topic app mein yahan seekho'));
        related.forEach(r => {
          const label = `${r.track.icon} ${r.track.name} → ${r.level.icon} ${r.level.title}`;
          if (r.open && hooks.onLevel) {
            const b = el('button', 'btn small ghost so-level', label);
            b.onclick = () => hooks.onLevel(r.level);
            rel.appendChild(b);
          } else rel.appendChild(el('p', 'so-locked', `${label}${r.open ? '' : ' (abhi locked)'}`));
        });
        stage.appendChild(rel);
      }

      const row = el('div', 'btnrow center');
      const list = el('button', 'btn ghost so-done', 'Saare scenarios');
      list.onclick = () => { if (hooks.onList) hooks.onList(); };
      row.appendChild(list);
      const nxt = nextScenario(sc);
      if (nxt && hooks.onNext) {
        const b = el('button', 'btn big so-nextsc', `Agla scenario: ${nxt.icon} ${nxt.title} →`);
        b.onclick = () => hooks.onNext(nxt);
        row.appendChild(b);
      }
      stage.appendChild(row);
      if (hooks.onFinish) hooks.onFinish({ firstTry, total: parts, stars: got });
    }

    showStep(0);
  }

  /* agla scenario: pehle usi topic ka jo abhi nahi hua, phir koi bhi jo nahi hua */
  function nextScenario(sc) {
    const rest = SD.scenarios.filter(x => x.id !== sc.id && !doneStars(x.id));
    return rest.find(x => x.topic === sc.topic) || rest[0] || null;
  }

  /* ------------------------------------------------------------------
     SCREENS (browser) — app.js ke SD.ui par tike hain
     ------------------------------------------------------------------ */
  let lastTopic = 'all';
  const appEl = () => document.getElementById('app');

  function clearScreen() {
    if (SD.ui && SD.ui.leaveSession) SD.ui.leaveSession();
    const app = appEl();
    app.innerHTML = '';
    window.scrollTo(0, 0);
    return app;
  }

  function play(sc) {
    const app = clearScreen();
    if (SD.nav) SD.nav.set('soch/' + sc.id);
    const wrap = el('section', 'panel so-panel');
    const back = el('button', 'btn ghost small', '← Saare scenarios');
    back.onclick = () => showList();
    wrap.appendChild(back);
    const body = el('div', 'so-body');
    wrap.appendChild(body);
    app.appendChild(wrap);
    render(sc, body, { onList: () => showList(), onNext: play, onLevel: lvl => SD.ui.showIntro(lvl) });
  }

  function showList(topicId) {
    if (topicId) lastTopic = topicId;
    const app = clearScreen();
    if (SD.nav) SD.nav.set('soch');
    const all = SD.scenarios;
    const doneCount = all.filter(s => doneStars(s.id)).length;
    const wrap = el('section', 'panel so-panel');
    const back = el('button', 'btn ghost small', '← Home');
    back.onclick = () => SD.ui.showHome();
    wrap.appendChild(back);
    wrap.appendChild(el('h2', 'level-h', '🧠 Soch Akhada'));
    wrap.appendChild(el('p', 'instructions',
      `Yahan ratta nahi, <b>sochna</b> hai. Har scenario ek asli jaisi samasya hai: pehle asli wajah pakdo, phir hal chuno, phir us hal ki keemat samjho. Ant mein interviewer ek twist deta hai. <b>${doneCount} / ${all.length}</b> ho gaye.`));

    const chips = el('div', 'so-chips');
    const used = TOPICS.filter(t => all.some(s => s.topic === t.id));
    [{ id: 'all', icon: '🧠', name: 'Sab' }].concat(used).forEach(t => {
      const mine = t.id === 'all' ? all : all.filter(s => s.topic === t.id);
      const chip = el('button', 'so-chip' + (lastTopic === t.id ? ' on' : ''), `${t.icon} ${t.name} <span>${mine.filter(s => doneStars(s.id)).length}/${mine.length}</span>`);
      chip.onclick = () => showList(t.id);
      chips.appendChild(chip);
    });
    wrap.appendChild(chips);

    const grid = el('div', 'so-grid');
    all.filter(s => lastTopic === 'all' || s.topic === lastTopic).forEach(sc => {
      const t = topicOf(sc.topic), got = doneStars(sc.id);
      const card = el('div', 'so-card' + (got ? ' done' : ''), `
        <div class="so-card-icon">${sc.icon}</div>
        <div class="so-card-body">
          <div class="so-card-title">${sc.title}</div>
          <div class="so-card-meta">${t.icon} ${t.name} · ${HARD[sc.hard] || ''}</div>
        </div>
        <div class="so-card-state">${got ? stars(got) : '▶ Socho'}</div>`);
      SD.makeInteractive(card, () => play(sc), `Scenario: ${SD.plainText(sc.title)}`);
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
    app.appendChild(wrap);
  }

  /* home page ki patti ka card */
  function homeCard() {
    const all = SD.scenarios, doneCount = all.filter(s => doneStars(s.id)).length;
    const card = el('div', 'stripcard clickable so-home', `
      <div class="strip-icon">🧠</div>
      <div>
        <div class="strip-title">Soch Akhada</div>
        <div class="strip-sub">${all.length} soch-vichaar wale scenario · <b>${doneCount} ho gaye</b>. Asli samasya, kadam-dar-kadam hal, phir twist.</div>
      </div>`);
    SD.makeInteractive(card, () => showList());
    return card;
  }

  /* level ke intro / complete screen par: is level ke topic wale scenarios */
  function linkBox(level) {
    const mine = SD.scenarios.filter(s => (s.levels || []).includes(level.id));
    if (!mine.length) return null;
    const box = el('div', 'so-link');
    box.appendChild(el('p', null, `🧠 <b>Soch Akhada:</b> is level ke topic par ${mine.length} soch-vichaar wala scenario hai. Level ke baad khud sochkar dekho:`));
    mine.forEach(sc => {
      const b = el('button', 'btn small ghost', `${sc.icon} ${sc.title}${doneStars(sc.id) ? ' ✔' : ''}`);
      b.onclick = () => play(sc);
      box.appendChild(b);
    });
    return box;
  }

  SD.soch = { TOPICS, render, play, showList, homeCard, linkBox, findLevel, doneStars };
})();
