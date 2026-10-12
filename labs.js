/* =====================================================================
   System Gurukul — Interactive Labs
   replay | tradeoff | estimate | archdiff

   games.js apne top level par `const el, shuffle, shake, escapeHtml`
   declare karti hai. Do script ek hi naam ko top level par `const` nahi
   kar sakte — browser SyntaxError phenk dega. Isliye YEH POORI FILE ek
   IIFE ke andar hai. Naya lab likho toh IIFE ke andar hi likhna.

   Har renderer ka contract wahi hai jo games.js ka hai:
     (stage, arena, onDone) → onDone({ firstTry, total })

   ✍️ LIKHNE KA NIYAM (ADHD): kisi bhi line mein "yeh / woh / uska / isse"
   ko kisi pehle bataye hue naam ki jagah mat likho. Naam DOBARA likho.
   Har vaakya apne aap mein poora padha jaana chahiye — pichhli line yaad
   rakhne ki zaroorat na pade.
   ===================================================================== */
(function () {
  const el = SD.el, escapeHtml = SD.escapeHtml, shake = SD.shake;

  /* validate.js ke sandbox mein timers nahi hote — autoplay optional hai */
  const hasTimers = typeof setInterval === 'function';
  const stopTimer = t => { if (t && typeof clearInterval === 'function') clearInterval(t); };

  /* har lab ke upar ek dikhta hua goal — "finish line kahan hai" */
  function goalBox(title, text) {
    const g = el('div', 'lab-goal');
    g.appendChild(el('h4', null, title));
    g.appendChild(el('div', 'lab-goal-text', text));
    return g;
  }
  function tone3(frac, dir) {
    /* frac 0..1 — dir 'lower' matlab chhota accha, 'higher' matlab bada accha */
    const bad = dir === 'higher' ? frac < 0.34 : frac > 0.66;
    const warn = dir === 'higher' ? frac < 0.67 : frac > 0.33;
    return bad ? 'bad' : warn ? 'warn' : 'ok';
  }

  /* =====================================================================
     LAB 1 — REPLAY: asli outage ki timeline scrub karo
     stage = { type:'replay', incident, metrics:[{id,label,unit,max,dir}],
               frames:[{t,event,metrics:{},note?,ask?{q,choices,answer,explain}}],
               lesson }
     Frame par `ask` ho toh replay RUK jaata hai — jawab ke bina aage nahi.
     ===================================================================== */
  SD.renderers.replay = function renderReplay(stage, arena, onDone) {
    const frames = stage.frames || [];
    const metrics = stage.metrics || [];
    const askCount = frames.filter(f => f.ask).length;
    let idx = -1, timer = null, firstTry = 0, done = false;
    /* Jawab ka hisaab YAHAN rakho, frame object par NAHI — frame level data hai
       aur usko chhoone se dobara khelne par saare sawaal "pehle se ho chuke"
       nikal aate hain. */
    const answered = frames.map(() => false);

    arena.appendChild(goalBox('🔥 POSTMORTEM REPLAY',
      stage.goal || 'Timeline aage badhao. Jahan sawaal aaye, wahan replay rukega — jawab do tabhi aage chalega.'));

    /* ---- header: incident ka naam + ghadi ---- */
    const head = el('div', 'rp-head');
    head.appendChild(el('div', 'rp-inc', '🔥 ' + escapeHtml(stage.incident || 'Incident')));
    const clock = el('div', 'rp-clock', '--:--');
    head.appendChild(clock);
    arena.appendChild(head);

    /* ---- live metric bars ---- */
    const mWrap = el('div', 'rp-metrics');
    const mNodes = {};
    metrics.forEach(m => {
      const row = el('div', 'rp-metric');
      row.appendChild(el('div', 'rp-mlabel', escapeHtml(m.label)));
      const track = el('div', 'rp-track');
      const fill = el('div', 'rp-fill');
      fill.style.width = '0%';
      track.appendChild(fill);
      row.appendChild(track);
      const val = el('div', 'rp-mval', '—');
      row.appendChild(val);
      mWrap.appendChild(row);
      mNodes[m.id] = { fill, val, def: m };
    });
    if (metrics.length) arena.appendChild(mWrap);

    /* ---- timeline ticks ---- */
    const tl = el('div', 'rp-timeline');
    const ticks = frames.map((f, i) => {
      const tk = el('div', 'rp-tick');
      tk.appendChild(el('span', 'rp-tick-t', escapeHtml(f.t)));
      if (f.ask) tk.classList.add('has-ask');
      tl.appendChild(tk);
      return tk;
    });
    arena.appendChild(tl);

    /* ---- event log ---- */
    const log = el('div', 'rp-log');
    arena.appendChild(log);

    /* ---- question slot ---- */
    const askSlot = el('div', 'rp-ask-slot');
    arena.appendChild(askSlot);

    /* ---- controls ---- */
    const ctl = el('div', 'rp-ctl');
    const playBtn = el('button', 'btn rp-play', hasTimers ? '▶ Play' : '⏭ Agla frame');
    const stepBtn = el('button', 'btn ghost rp-step', '⏭ Agla frame');
    ctl.appendChild(playBtn);
    if (hasTimers) ctl.appendChild(stepBtn);
    arena.appendChild(ctl);

    const finish = el('div', 'rp-finish');
    arena.appendChild(finish);

    function paintMetrics(vals) {
      Object.keys(mNodes).forEach(id => {
        const n = mNodes[id];
        if (!vals || vals[id] == null) return;
        const v = vals[id];
        const frac = Math.max(0, Math.min(1, v / (n.def.max || 100)));
        n.fill.style.width = Math.round(frac * 100) + '%';
        n.fill.className = 'rp-fill ' + tone3(frac, n.def.dir || 'lower');
        n.val.textContent = v + (n.def.unit || '');
      });
    }

    function pause() { stopTimer(timer); timer = null; playBtn.textContent = hasTimers ? '▶ Play' : '⏭ Agla frame'; }

    function step() {
      if (done) return;
      if (idx >= 0 && frames[idx] && frames[idx].ask && !answered[idx]) return; /* sawaal pending hai */
      idx++;
      if (idx >= frames.length) { pause(); complete(); return; }
      const f = frames[idx];
      ticks.forEach((tk, i) => {
        tk.classList.remove('now');
        if (i <= idx) tk.classList.add('past');
      });
      ticks[idx].classList.add('now');
      clock.textContent = f.t;
      paintMetrics(f.metrics);

      const line = el('div', 'rp-line' + (f.tone ? ' ' + f.tone : ''));
      line.appendChild(el('span', 'rp-line-t', escapeHtml(f.t)));
      line.appendChild(el('span', 'rp-line-e', f.event));
      log.appendChild(line);
      if (f.note) log.appendChild(el('div', 'rp-note', f.note));

      if (f.ask) { pause(); showAsk(f); }
    }

    function showAsk(f) {
      const at = idx;
      askSlot.innerHTML = '';
      const card = el('div', 'rp-ask');
      card.appendChild(el('div', 'rp-ask-q', '⏸ ' + f.ask.q));
      let wrong = false;
      const opts = el('div', 'rp-ask-opts');
      (f.ask.choices || []).forEach((c, i) => {
        const b = el('button', 'rp-opt', c);
        b.onclick = () => {
          if (answered[at]) return;
          if (i === f.ask.answer) {
            answered[at] = true;
            if (!wrong) firstTry++;
            b.classList.add('right');
            card.appendChild(el('div', 'rp-ask-ex', '✅ ' + f.ask.explain));
            const go = el('button', 'btn rp-go', 'Replay aage chalao →');
            go.onclick = () => { askSlot.innerHTML = ''; step(); };
            card.appendChild(go);
          } else {
            wrong = true;
            b.classList.add('wrong');
            b.disabled = true;
            shake(card);
            SD.noteMistake(f.ask.q, f.ask.choices[f.ask.answer], '🔥 ' + (stage.incident || 'Postmortem'));
            if (f.ask.wrongHints && f.ask.wrongHints[i])
              card.appendChild(el('div', 'rp-ask-wr', '❌ ' + f.ask.wrongHints[i]));
          }
        };
        opts.appendChild(b);
      });
      card.appendChild(opts);
      askSlot.appendChild(card);
    }

    function complete() {
      if (done) return;
      done = true;
      ctl.innerHTML = '';
      if (stage.lesson) finish.appendChild(el('div', 'lab-win', stage.lesson));
      const b = el('button', 'btn big rp-done', 'Aage badho →');
      b.onclick = () => onDone({ firstTry: askCount ? firstTry : 1, total: askCount || 1 });
      finish.appendChild(b);
    }

    playBtn.onclick = () => {
      if (!hasTimers) { step(); return; }
      if (timer) { pause(); return; }
      playBtn.textContent = '⏸ Pause';
      timer = setInterval(step, stage.speedMs || 1800);
      step();
    };
    stepBtn.onclick = () => { pause(); step(); };

    /* pehla frame turant dikhao — khaali screen se shuru mat karo */
    step();
  };

  /* =====================================================================
     LAB 2 — TRADEOFF: knob ghumao, asli number badle
     stage = { type:'tradeoff', goal, scenario,
               knobs:[{id,label,min,max,step,value,unit,note}],
               readouts:k=>[{label,value,tone}],
               bars:k=>[{label,pct,text,tone}],
               verdict:k=>({ok,text}),
               check:k=>bool, lesson, quiz? }
     ===================================================================== */
  SD.renderers.tradeoff = function renderTradeoff(stage, arena, onDone) {
    const knobs = stage.knobs || [];
    const k = {};
    knobs.forEach(kn => { k[kn.id] = kn.value; });
    let firstTry = 0, total = 1, solved = false, touched = false;

    arena.appendChild(goalBox('🎯 GOAL', stage.goal || 'Knobs ghumao jab tak verdict hara na ho jaye.'));
    if (stage.scenario) arena.appendChild(el('div', 'lab-scenario', stage.scenario));

    const panel = el('div', 'td-panel');

    /* ---- knobs ---- */
    const kWrap = el('div', 'td-knobs');
    const kVals = {};
    knobs.forEach(kn => {
      const row = el('div', 'td-knob');
      const top = el('div', 'td-krow');
      top.appendChild(el('span', 'td-klabel', escapeHtml(kn.label)));
      const vv = el('span', 'td-kval', String(kn.value) + (kn.unit || ''));
      top.appendChild(vv);
      row.appendChild(top);
      const input = el('input', 'td-slider');
      input.type = 'range';
      input.min = String(kn.min); input.max = String(kn.max);
      input.step = String(kn.step || 1); input.value = String(kn.value);
      input.addEventListener('input', () => {
        k[kn.id] = Number(input.value);
        vv.textContent = String(k[kn.id]) + (kn.unit || '');
        touched = true;
        paint();
      });
      row.appendChild(input);
      if (kn.note) row.appendChild(el('div', 'td-knote', kn.note));
      kVals[kn.id] = { input, vv, def: kn };
      kWrap.appendChild(row);
    });
    panel.appendChild(kWrap);

    /* ---- readouts + bars + verdict ---- */
    const outWrap = el('div', 'td-out');
    const roWrap = el('div', 'td-readouts');
    const barWrap = el('div', 'td-bars');
    const verdict = el('div', 'td-verdict');
    outWrap.appendChild(roWrap);
    outWrap.appendChild(barWrap);
    outWrap.appendChild(verdict);
    panel.appendChild(outWrap);
    arena.appendChild(panel);

    const winSlot = el('div', 'td-win-slot');
    arena.appendChild(winSlot);

    function paint() {
      roWrap.innerHTML = '';
      (stage.readouts ? stage.readouts(k) : []).forEach(r => {
        const c = el('div', 'td-ro ' + (r.tone || ''));
        c.appendChild(el('div', 'td-ro-l', escapeHtml(r.label)));
        c.appendChild(el('div', 'td-ro-v', r.value));
        roWrap.appendChild(c);
      });
      barWrap.innerHTML = '';
      (stage.bars ? stage.bars(k) : []).forEach(b => {
        const row = el('div', 'td-bar');
        row.appendChild(el('div', 'td-blabel', escapeHtml(b.label)));
        const track = el('div', 'td-track');
        const fill = el('div', 'td-fill ' + (b.tone || ''));
        fill.style.width = Math.max(0, Math.min(100, b.pct)) + '%';
        track.appendChild(fill);
        row.appendChild(track);
        row.appendChild(el('div', 'td-btext', b.text));
        barWrap.appendChild(row);
      });
      const v = stage.verdict ? stage.verdict(k) : { ok: false, text: '' };
      verdict.className = 'td-verdict ' + (v.ok ? 'good' : 'bad');
      verdict.innerHTML = (v.ok ? '✅ ' : '⚠️ ') + v.text;

      if (!solved && stage.check && stage.check(k)) {
        solved = true;
        if (!touched) firstTry = 0; else firstTry = 1;
        win();
      }
    }

    function win() {
      knobs.forEach(kn => { kVals[kn.id].input.disabled = true; });
      const box = el('div', 'lab-win');
      box.innerHTML = stage.lesson || '✅ Goal poora.';
      winSlot.appendChild(box);
      if (stage.quiz) {
        total = 2;
        askQuiz();
      } else {
        const b = el('button', 'btn big td-next', 'Aage badho →');
        b.onclick = () => onDone({ firstTry, total });
        winSlot.appendChild(b);
      }
    }

    function askQuiz() {
      const q = stage.quiz;
      const card = el('div', 'td-quiz');
      card.appendChild(el('div', 'td-quiz-q', q.q));
      let wrong = false;
      (q.choices || []).forEach((c, i) => {
        const b = el('button', 'rp-opt', c);
        b.onclick = () => {
          if (card._done) return;
          if (i === q.answer) {
            card._done = true;
            b.classList.add('right');
            if (!wrong) firstTry++;
            card.appendChild(el('div', 'rp-ask-ex', '✅ ' + q.explain));
            const nx = el('button', 'btn big td-next', 'Aage badho →');
            nx.onclick = () => onDone({ firstTry, total });
            card.appendChild(nx);
          } else {
            wrong = true;
            b.classList.add('wrong');
            b.disabled = true;
            shake(card);
            SD.noteMistake(q.q, q.choices[q.answer], '🎚️ Tradeoff');
          }
        };
        card.appendChild(b);
      });
      winSlot.appendChild(card);
    }

    paint();
  };

  /* =====================================================================
     LAB 3 — ESTIMATE: napkin math, pehle tumhara guess phir asli calculation
     stage = { type:'estimate', problems:[{q, unit, answer, tol?, given?[],
                                           steps:[], lesson?}] }
     Sahi ka matlab: SAHI ORDER OF MAGNITUDE. Estimation ka asli hunar
     yahi hai — exact number nahi, sahi paimana.
     ===================================================================== */
  SD.renderers.estimate = function renderEstimate(stage, arena, onDone) {
    const probs = stage.problems || [];
    let i = 0, firstTry = 0;

    arena.appendChild(goalBox('🧮 NAPKIN MATH',
      stage.goal || 'Pehle apna andaaza likho, phir asli calculation khulegi. Sahi hone ka matlab hai SAHI ORDER OF MAGNITUDE — exact number nahi.'));

    const slot = el('div', 'es-slot');
    arena.appendChild(slot);

    /* "5k" "2.5M" "1.2 crore" "1e6" "3,500" — sab parse ho jaate hain */
    function parseNum(raw) {
      let s = String(raw).trim().toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ');
      if (!s) return NaN;
      let mult = 1;
      if (/\bcrore\b|\bcr\b/.test(s)) { mult = 1e7; s = s.replace(/\bcrore\b|\bcr\b/g, ''); }
      else if (/\blakh\b|\blac\b/.test(s)) { mult = 1e5; s = s.replace(/\blakh\b|\blac\b/g, ''); }
      else if (/[kK]$/.test(s.trim())) { mult = 1e3; s = s.trim().slice(0, -1); }
      else if (/[mM]$/.test(s.trim())) { mult = 1e6; s = s.trim().slice(0, -1); }
      else if (/[bB]$/.test(s.trim())) { mult = 1e9; s = s.trim().slice(0, -1); }
      else if (/[tT]$/.test(s.trim())) { mult = 1e12; s = s.trim().slice(0, -1); }
      const n = parseFloat(s);
      return isNaN(n) ? NaN : n * mult;
    }
    function fmt(n) {
      if (n >= 1e12) return (n / 1e12).toFixed(2) + ' trillion';
      if (n >= 1e9) return (n / 1e9).toFixed(2) + ' billion';
      if (n >= 1e6) return (n / 1e6).toFixed(2) + ' million';
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
      return String(Math.round(n * 100) / 100);
    }

    function show() {
      slot.innerHTML = '';
      if (i >= probs.length) { onDone({ firstTry, total: probs.length }); return; }
      const p = probs[i];
      const card = el('div', 'es-card');
      card.appendChild(el('div', 'es-count', `Sawaal ${i + 1} / ${probs.length}`));
      card.appendChild(el('div', 'es-q', p.q));
      if (p.given && p.given.length) {
        const g = el('ul', 'es-given');
        p.given.forEach(x => g.appendChild(el('li', null, x)));
        card.appendChild(g);
      }

      const row = el('div', 'es-inrow');
      const input = el('input', 'es-input');
      input.type = 'text';
      input.placeholder = 'apna andaaza — 5k, 2.5M, 1.2 crore, 30000 …';
      const unit = el('span', 'es-unit', p.unit || '');
      const go = el('button', 'btn es-go', 'Andaaza jama karo');
      row.appendChild(input); row.appendChild(unit); row.appendChild(go);
      card.appendChild(row);

      const fb = el('div', 'es-fb');
      card.appendChild(fb);
      let tried = false;

      go.onclick = () => {
        if (card._done) return;
        const guess = parseNum(input.value);
        if (isNaN(guess) || guess <= 0) {
          fb.innerHTML = '<div class="es-bad">Ek number likho — "5k", "2.5M", "1.2 crore" ya "30000" sab chalte hain.</div>';
          shake(card);
          return;
        }
        card._done = true;
        const tol = p.tol == null ? 0.5 : p.tol;          /* log10 mein doori */
        const off = Math.abs(Math.log10(guess / p.answer));
        const right = off <= tol;
        if (right && !tried) firstTry++;
        if (!right) SD.noteMistake(p.q, `${fmt(p.answer)} ${p.unit || ''} — ${(p.steps || []).join(' → ')}`, '🧮 Napkin math');

        fb.innerHTML = '';
        fb.appendChild(el('div', 'es-verdict ' + (right ? 'ok' : 'bad'),
          right
            ? `✅ Sahi paimane par. Tumhara andaaza <b>${fmt(guess)}</b>, asli jawab <b>${fmt(p.answer)} ${escapeHtml(p.unit || '')}</b>.`
            : `❌ Paimana chook gaya. Tumhara andaaza <b>${fmt(guess)}</b>, asli jawab <b>${fmt(p.answer)} ${escapeHtml(p.unit || '')}</b> — farak lagbhag <b>${Math.round(Math.pow(10, off))}x</b> ka hai.`));
        const st = el('div', 'es-steps');
        st.appendChild(el('h5', null, '📐 Calculation'));
        (p.steps || []).forEach(s => st.appendChild(el('div', 'es-step', s)));
        fb.appendChild(st);
        if (p.lesson) fb.appendChild(el('div', 'es-lesson', p.lesson));
        const nx = el('button', 'btn big es-next', i + 1 < probs.length ? 'Agla sawaal →' : 'Lab khatam →');
        nx.onclick = () => { i++; show(); };
        fb.appendChild(nx);
      };
      input.addEventListener('keydown', e => { if (e.key === 'Enter') go.onclick(); });

      slot.appendChild(card);
    }
    show();
  };

  /* =====================================================================
     LAB 4 — ARCHDIFF: diagram mein chhupi hui galtiyan pakdo
     stage = { type:'archdiff', brief, nodes:[{id,label,sub,row}],
               flaws:[{id,why}], fine:{id:'kyun theek hai'}, lesson }
     Galat click bhi kuch sikhata hai — har sahi box ka bhi apna reason hai.
     ===================================================================== */
  SD.renderers.archdiff = function renderArchdiff(stage, arena, onDone) {
    const nodes = stage.nodes || [];
    const flaws = stage.flaws || [];
    const flawIds = flaws.map(f => f.id);
    const fine = stage.fine || {};
    let found = 0, wrong = 0;

    arena.appendChild(goalBox('🕵️ GALTIYAN PAKDO',
      stage.goal || `Is design mein <b>${flaws.length}</b> galtiyan chhupi hain. Har box par click karke batao ki kaunsa box galat hai.`));
    if (stage.brief) arena.appendChild(el('div', 'lab-scenario', stage.brief));

    const counter = el('div', 'ad-counter');
    arena.appendChild(counter);
    function paintCount() {
      counter.innerHTML = `🎯 Mile: <b>${found}</b> / ${flaws.length} &nbsp;·&nbsp; ❌ Galat click: <b>${wrong}</b>`;
    }
    paintCount();

    const board = el('div', 'ad-board');
    const rows = {};
    nodes.forEach(n => {
      const r = String(n.row == null ? 0 : n.row);
      if (!rows[r]) { rows[r] = el('div', 'ad-row'); board.appendChild(rows[r]); }
      const card = el('div', 'ad-node');
      card.dataset.id = n.id;
      card.appendChild(el('div', 'ad-nlabel', n.label));
      if (n.sub) card.appendChild(el('div', 'ad-nsub', n.sub));
      const why = el('div', 'ad-why');
      card.appendChild(why);
      card.onclick = () => {
        if (card._done) return;
        card._done = true;
        const f = flaws.find(x => x.id === n.id);
        if (f) {
          found++;
          card.classList.add('flaw');
          why.innerHTML = '🚨 ' + f.why;
        } else {
          wrong++;
          card.classList.add('fine');
          why.innerHTML = '✅ ' + (fine[n.id] || 'Yeh box theek hai — yahan koi galti nahi.');
          SD.noteMistake(`${stage.title || 'Architecture diff'} — "${n.label}" ko galti samjha`,
            fine[n.id] || 'Yeh box theek hai.', '🕵️ Architecture diff');
          shake(card);
        }
        paintCount();
        if (found === flaws.length) finish();
      };
      rows[r].appendChild(card);
    });
    arena.appendChild(board);

    const slot = el('div', 'ad-finish');
    arena.appendChild(slot);

    function finish() {
      if (stage.lesson) slot.appendChild(el('div', 'lab-win', stage.lesson));
      const b = el('button', 'btn big ad-done', 'Aage badho →');
      b.onclick = () => onDone({ firstTry: Math.max(0, flaws.length - wrong), total: flaws.length });
      slot.appendChild(b);
    }
  };
})();
