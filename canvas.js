/* =====================================================================
   System Gurukul — Design Canvas (stage type: 'design')

   Decision-first stage. Ek scenario + requirements diye jaate hain, aur
   tum har "slot" ke liye ek component/strategy chunte ho. Phir DESIGN
   REVIEW hota hai — har slot par verdict, score, aur SAARE options ka
   tradeoff khulta hai (sirf tumhare chune hue ka nahi — asli seekh wahi hai).

   Stage shape:
   {
     type: 'design', title, instructions,
     brief: 'HTML — scenario',
     requirements: ['500 rps peak', 'p99 < 200ms', 'koi order na khoye'],
     slots: [{
       id: 'paging', label: 'Pagination strategy', icon: '📄',
       note: 'optional — slot ke neeche chhoti line',
       options: [
         { id:'offset', label:'?page=N&limit=50', score:-2, why:'gehre page par...' },
         { id:'cursor', label:'?cursor=<opaque>',  score: 3, why:'...' },
       ],
     }],
     pass: 8,                       // itna score chahiye
     verdicts: { great:'HTML', ok:'HTML', bad:'HTML' },   // optional
   }
   ===================================================================== */

SD.renderers.design = function renderDesign(stage, arena, onDone) {
  const slots = stage.slots || [];
  const picks = {};                 // slotId -> optionId
  let submitted = 0;                // kitni baar review kiya
  let firstTryGood = 0;

  const bestOf = slot => Math.max(...slot.options.map(o => o.score));
  const maxScore = slots.reduce((a, s) => a + bestOf(s), 0);
  const passMark = stage.pass != null ? stage.pass : Math.ceil(maxScore * 0.7);

  /* ---------- brief ---------- */
  const brief = SD.el('div', 'dsn-brief');
  brief.innerHTML = `
    <h4>🏗️ Design brief</h4>
    <div>${stage.brief || ''}</div>
    ${(stage.requirements || []).length ? `<ul class="dsn-reqs">${
      stage.requirements.map(r => `<li>${r}</li>`).join('')}</ul>` : ''}`;
  arena.appendChild(brief);

  /* ---------- board ---------- */
  const board = SD.el('div', 'dsn-board');
  arena.appendChild(board);

  slots.forEach((slot, si) => {
    if (si > 0) board.appendChild(SD.el('div', 'dsn-arrow', '▸'));
    const card = SD.el('div', 'dsn-slot');
    card.innerHTML = `
      <div class="dsn-slot-head"><span class="dsn-icon">${slot.icon || '⬜'}</span>
        <span class="dsn-slot-label">${slot.label}</span></div>
      ${slot.note ? `<div class="dsn-slot-note">${slot.note}</div>` : ''}`;
    const opts = SD.el('div', 'dsn-opts');
    slot.options.forEach(o => {
      const b = SD.el('button', 'dsn-opt', o.label);
      b.onclick = () => {
        if (board.classList.contains('reviewed')) return;
        picks[slot.id] = o.id;
        Array.prototype.forEach.call(opts.children, x => x.classList.remove('sel'));
        b.classList.add('sel');
        reviewBtn.disabled = Object.keys(picks).length < slots.length;
        reviewBtn.textContent = reviewBtn.disabled
          ? `Abhi ${slots.length - Object.keys(picks).length} decision baaki`
          : '🔍 Design review karao';
      };
      b._opt = o;
      opts.appendChild(b);
    });
    card.appendChild(opts);
    card._slot = slot; card._opts = opts;
    board.appendChild(card);
  });

  const reviewBtn = SD.el('button', 'btn big', `Abhi ${slots.length} decision baaki`);
  reviewBtn.disabled = true;
  const btnrow = SD.el('div', 'btnrow center');
  btnrow.appendChild(reviewBtn);
  arena.appendChild(btnrow);

  const reportEl = SD.el('div', 'dsn-report');
  arena.appendChild(reportEl);

  /* ---------- review ---------- */
  reviewBtn.onclick = () => {
    submitted++;
    let score = 0, good = 0;
    const rows = [];

    Array.prototype.forEach.call(board.children, card => {
      if (!card._slot) return;
      const slot = card._slot;
      const chosen = slot.options.find(o => o.id === picks[slot.id]);
      const best = bestOf(slot);
      score += chosen.score;
      const isBest = chosen.score === best;
      if (isBest) good++;
      /* har option ka tradeoff kholo — sirf chune hue ka nahi */
      Array.prototype.forEach.call(card._opts.children, b => {
        const o = b._opt;
        b.classList.add(o.score === best ? 'good' : o.score > 0 ? 'okay' : 'bad');
        if (o.id === picks[slot.id]) b.classList.add('chosen');
      });
      const why = SD.el('div', 'dsn-why');
      why.innerHTML = slot.options.map(o => `
        <div class="dsn-why-row ${o.score === best ? 'is-good' : o.score > 0 ? 'is-okay' : 'is-bad'}${o.id === picks[slot.id] ? ' is-chosen' : ''}">
          <span class="dsn-why-mark">${o.score === best ? '✅' : o.score > 0 ? '🟡' : '❌'}</span>
          <span class="dsn-why-body"><b>${o.label}</b>${o.id === picks[slot.id] ? ' <i>← tumne yeh chuna</i>' : ''}<br>${o.why}</span>
        </div>`).join('');
      card.appendChild(why);
      card._why = why;
      rows.push({ slot, chosen, isBest });
    });

    if (submitted === 1) firstTryGood = good;
    board.classList.add('reviewed');

    const pct = maxScore ? Math.max(0, Math.round((score / maxScore) * 100)) : 0;
    const passed = score >= passMark;
    const verdicts = stage.verdicts || {};
    const verdict = passed
      ? (score === maxScore ? (verdicts.great || 'Har decision sahi. Yeh design production mein tikega.')
                            : (verdicts.ok || 'Design chal jaayega — par upar dekho, kuch decisions behtar ho sakte the.'))
      : (verdicts.bad || 'Yeh design pehle bade traffic spike par toot jaayega. Neeche tradeoffs padho aur dobara socho.');

    reportEl.innerHTML = `
      <div class="dsn-scorebox ${passed ? 'pass' : 'fail'}">
        <div class="dsn-score">${score} <span>/ ${maxScore}</span></div>
        <div class="dsn-bar"><div class="dsn-bar-fill" style="width:${pct}%"></div></div>
        <div class="dsn-verdict">${passed ? '✅' : '⚠️'} ${verdict}</div>
        <div class="dsn-detail">${good}/${slots.length} decisions best-in-class · pass mark ${passMark}</div>
      </div>`;

    btnrow.innerHTML = '';
    if (!passed) {
      const again = SD.el('button', 'btn', '↻ Dobara design karo');
      again.onclick = () => {
        board.classList.remove('reviewed');
        Array.prototype.forEach.call(board.children, card => {
          if (!card._slot) return;
          if (card._why) { card._why.remove(); card._why = null; }
          Array.prototype.forEach.call(card._opts.children, b => {
            b.classList.remove('good', 'okay', 'bad', 'chosen', 'sel');
          });
        });
        Object.keys(picks).forEach(k => delete picks[k]);
        reportEl.innerHTML = '';
        btnrow.innerHTML = '';
        reviewBtn.disabled = true;
        reviewBtn.textContent = `Abhi ${slots.length} decision baaki`;
        btnrow.appendChild(reviewBtn);
      };
      btnrow.appendChild(again);
    }
    const nextBtn = SD.el('button', 'btn big' + (passed ? '' : ' ghost'), passed ? 'Aage badho →' : 'Chhodo, aage badho →');
    nextBtn.onclick = () => onDone({ firstTry: firstTryGood, total: slots.length });
    btnrow.appendChild(nextBtn);
    reportEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
};
