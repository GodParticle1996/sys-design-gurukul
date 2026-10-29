/* =====================================================================
   System Gurukul — DOCKER LAB renderer
   Ek stage jo learner ko laptop par asli services chalwata hai.

   games.js apne top level par `const el, shuffle, shake, escapeHtml`
   declare karti hai — isliye YEH POORI FILE ek IIFE ke andar hai.

   Contract wahi: (stage, arena, onDone) → onDone({ firstTry, total })

   stage = {
     type: 'docker', title,
     project: '01-reddit',            // docker-labs/<project>
     exercise: 'ex1-facts-answers',   // project README mein likha naam
     goal: 'HTML — kya karna hai',
     why?: 'HTML — scenario',
     steps: [{ text, cmd?, expect? }],
     observe: { q, choices, answer, explain },
   }

   Har button ki apni CLASS hai (dk-tick, dk-opt, dk-done) — validator
   buttons ko class se pakadta hai, text se kabhi nahi.
   ===================================================================== */
(function () {
  const el = SD.el, escapeHtml = SD.escapeHtml, shake = SD.shake;

  function goalBox(text) {
    const g = el('div', 'lab-goal');
    g.appendChild(el('h4', null, '🎯 GOAL'));
    g.appendChild(el('div', 'lab-goal-text', text));
    return g;
  }

  /* ek MCQ card — sahi par onRight(firstTryBool), galat par shake + Dojo card */
  function askCard(q, cls, tag, onRight) {
    const card = el('div', 'dk-askcard');
    card.appendChild(el('div', 'dk-ask-q', '🤔 ' + q.q));
    const fb = el('div', 'dk-ask-fb');
    let wrong = false, done = false;
    SD.shuffle(q.choices.map((c, i) => ({ c, i }))).forEach(({ c, i }) => {
      const b = el('button', 'dk-optbtn ' + cls, c);
      b.dataset.i = String(i);
      b.onclick = () => {
        if (done || b.disabled) return;
        if (i === q.answer) {
          done = true;
          b.classList.add('right');
          fb.className = 'dk-ask-fb good';
          fb.innerHTML = '✅ ' + SD.choiceFeedback(q, i);
          onRight(!wrong);
        } else {
          if (!wrong) SD.noteMistake(q.q, `<b>${q.choices[q.answer]}</b><br>${q.explain || ''}`, tag);
          wrong = true;
          b.classList.add('wrong');
          b.disabled = true;
          shake(card);
          fb.className = 'dk-ask-fb bad';
          fb.innerHTML = '❌ ' + SD.choiceFeedback(q, i);
        }
      };
      card.appendChild(b);
    });
    card.appendChild(fb);
    return card;
  }

  SD.renderers.docker = function renderDocker(stage, arena, onDone) {
    const steps = stage.steps || [];
    const ticked = steps.map(() => false);
    let asked = false;

    arena.appendChild(goalBox(stage.goal));
    arena.appendChild(el('div', 'lab-scenario dk-verification', SD.labDone(stage)
      ? '✅ Yeh lab tum pehle chala chuke ho. Chaho toh dobara chalao, ya seedha neeche ka sawaal karo.'
      : '🐳 Laptop par har step chalao aur ✔ dabao. Laptop paas nahi? Neeche se seedha sawaal karo — lab baad mein kar lena.'));

    const where = el('div', 'dk-where');
    where.innerHTML = `📁 <code>sys-design-gurukul/docker-labs/${escapeHtml(stage.project)}</code>` +
      (stage.exercise ? ` · exercise <code>${escapeHtml(stage.exercise)}</code>` : '') +
      `<div class="dk-note">${stage.runtimeNote || `Docker nahi hai? Har project <code>npm install &amp;&amp; npm start ${escapeHtml(stage.exercise || '')}</code> se bhi chalta hai (Node.js 18+). Poori details project ke <code>README.md</code> mein.`}</div>`;
    arena.appendChild(where);
    if (stage.why) arena.appendChild(el('div', 'lab-scenario', stage.why));

    const list = el('ol', 'dk-steps');
    steps.forEach((s, idx) => {
      const li = el('li', 'dk-step');
      li.appendChild(el('div', 'dk-text', s.text));
      if (s.cmd) {
        const row = el('div', 'dk-cmdrow');
        row.appendChild(el('pre', 'dk-cmd', escapeHtml(s.cmd)));
        const copy = el('button', 'btn ghost small dk-copy', '📋 Copy');
        copy.onclick = () => {
          try {
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
              Promise.resolve(navigator.clipboard.writeText(s.cmd)).then(() => { copy.textContent = '✅ Copied'; }, () => { copy.textContent = 'Select karke copy karo'; });
            } else copy.textContent = 'Select karke copy karo';
          } catch (e) { copy.textContent = 'Select karke copy karo'; }
        };
        row.appendChild(copy);
        li.appendChild(row);
      }
      if (s.expect) {
        const ex = el('details', 'dk-expect');
        ex.innerHTML = `<summary>👀 Kya dikhna chahiye?</summary><pre>${escapeHtml(s.expect)}</pre>`;
        li.appendChild(ex);
      }
      const tick = el('button', 'btn small dk-tick', '✔ Ho gaya');
      tick.setAttribute('aria-pressed', 'false');
      tick.onclick = () => {
        ticked[idx] = !ticked[idx];
        tick.className = 'btn small dk-tick' + (ticked[idx] ? ' good' : '');
        tick.textContent = ticked[idx] ? '✅ Ho gaya' : '✔ Ho gaya';
        tick.setAttribute('aria-pressed', String(ticked[idx]));
        li.className = 'dk-step' + (ticked[idx] ? ' done' : '');
        if (ticked.every(Boolean)) SD.markLabDone(stage);
        maybeAsk();
      };
      li.appendChild(tick);
      list.appendChild(li);
    });
    arena.appendChild(list);

    const askSlot = el('div', 'dk-ask');
    arena.appendChild(askSlot);
    const skip = el('button', 'btn ghost small dk-skip', 'Abhi laptop paas nahi — seedha sawaal karo');
    skip.onclick = () => {
      skip.remove();
      /* lab ka asli captured output khol do — sawaal usi se jawab diya ja sakta hai */
      list.querySelectorAll('.dk-expect').forEach(d => { d.open = true; });
      ask(true);
    };
    arena.appendChild(skip);

    let observationRight = false, observationFirst = false, doneButton = null;
    function maybeAsk() {
      if (ticked.every(Boolean)) { skip.remove(); ask(false); }
      syncDone();
    }
    /* Sawaal sahi = stage poora. Lab ke steps sirf yeh batate hain ki lab chala ya baad ke liye bacha. */
    function syncDone() {
      if (!doneButton) return;
      doneButton.disabled = !observationRight;
      doneButton.textContent = ticked.every(Boolean) ? 'Aage badho →' : 'Aage badho → (🐳 lab baad mein)';
    }
    function ask(preview) {
      if (asked) return;
      asked = true;
      if (preview) askSlot.appendChild(el('div', 'dk-preview-note', 'Upar har step ka asli output khul gaya hai — usi se jawab do. Level map par 🐳 nishaan lab yaad dilayega.'));
      askSlot.appendChild(askCard(stage.observe, 'dk-opt', '🐳 Docker lab', first => {
        observationRight = true;
        observationFirst = first;
        if (first) SD.addXP(SD.XP_PER_ITEM);
        if (stage.lesson) askSlot.appendChild(el("div", "lab-win", stage.lesson));
        const done = el('button', 'btn big dk-done', 'Aage badho →');
        doneButton = done;
        let continued = false;
        done.onclick = () => { if (continued || done.disabled || !observationRight) return; continued = true; onDone({ firstTry: observationFirst ? 1 : 0, total: 1, verification: ticked.every(Boolean) ? 'self-reported' : 'skipped' }); };
        askSlot.appendChild(done);
        syncDone();
      }));
    }
  };
})();
