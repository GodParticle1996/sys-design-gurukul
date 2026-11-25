/* =====================================================================
   System Gurukul — ⚡ Lakshan → fix drill   (stage type: 'drill')
   Dashboard ka ek lakshan dikhta hai (numbers, log line) → 3 options mein se
   sahi DIAGNOSIS → FIX chuno. Ghadi sirf FAISLE ka samay ginti hai: jawab ke
   baad "kyun" padhte waqt ghadi ruki rehti hai (padhna mufat, sochna tez).
   Har round mein EK hi koshish. Har baar pool se `pick` rounds; pichhli baar
   wale rounds dobara kam aate hain (SD.state.labs.seen).

   Jodna (data file, IIFE ke andar):
     SD.addLab('boss-resil', {
       type: 'drill', id: 'drill-resil', title: '⚡ Lakshan → fix: Resilience',
       intro: 'HTML (1–2 line)',
       pick: 8,                 // har run mein kitne rounds
       par: 64,                 // itne second (sirf faisle ka samay) mein sab sahi = ⭐⭐⭐
       rounds: [ {              // pool: kam se kam pick + 4
         sym: 'p99 4.2s · CPU 11%\npool: 50/50 busy, 180 waiting',   // saada text, \n = nayi line
         good: 'Pool khaali nahi ho raha → lambi transaction dhoondho',  // saada text
         bad: ['App servers 2x karo', 'DB ka bada instance lo'],     // 2–3 lalchaane wale galat (saada text)
         why: 'HTML — 1–2 line: sahi kyun, galat kyun',
         level: 'pool',         // jis level mein yeh sikhaya gaya (validator check karta hai)
       } ],
     })
   Validator: har round ke fields, level id, option length bias (sahi option sabse
   lamba/chhota na dikhe), aur poora win-walk (har round sahi → stage poora).
   Buttons ki classes (validator inhi se chalata hai): dl-start, dl-opt (data-i:
   0 = good), dl-next, dl-again, dl-done.
   ===================================================================== */
(function () {
  const el = SD.el, esc = SD.escapeHtml;
  const now = () => Date.now();
  const FAST = 6;   // ⚡ = itne second ke andar sahi
  const levelTitle = id => {
    let t = null;
    Object.keys(SD.levelSets).forEach(k => (SD.levelSets[k] || []).forEach(l => { if (l.id === id) t = l; }));
    return t ? `${t.icon || ''} ${t.title}`.trim() : id;
  };
  const lines = s => String(s).split('\n').map(x => `<div>${esc(x)}</div>`).join('');

  /* pool se `pick` rounds: pehle woh jo pichhli baar nahi dikhe */
  function choose(stage) {
    const all = stage.rounds.map((r, i) => ({ r, i }));
    const seen = new Set(((SD.state.labs || {}).seen || {})['drill:' + stage.id] || []);
    const fresh = SD.shuffle(all.filter(o => !seen.has(String(o.i))));
    const old = SD.shuffle(all.filter(o => seen.has(String(o.i))));
    const n = Math.min(stage.pick || 8, all.length);
    return fresh.concat(old).slice(0, n);
  }

  SD.drill = { choose, FAST };

  SD.renderers.drill = function renderDrill(stage, arena, onDone) {
    const picked = choose(stage);
    const total = picked.length;
    SD.state.labs = SD.state.labs || { drill: {}, oncall: {}, seen: {} };
    SD.state.labs.seen['drill:' + stage.id] = picked.map(o => String(o.i));
    SD.saveState();
    const best = SD.state.labs.drill[stage.id];

    let k = 0, right = 0, fast = 0, used = 0, tRound = 0, answered = false, over = false, optBtns = [], nextBtn = null;
    const log = [];
    const box = el('div', 'dl-box');
    box.appendChild(el('div', 'dl-intro', `${stage.intro || ''}
      <div class="dl-rules">${total} rounds · har round mein <b>ek</b> koshish · ghadi sirf <b>sochne</b> ka samay ginti hai
      (jawab ke baad padhna mufat) · ⚡ = ${FAST}s ke andar sahi · keyboard: <b>1 2 3</b> chuno, <b>Enter</b> = agla.
      ${stage.par ? `<br>Lakshya: <b>${total}/${total}</b>, kul <b>${stage.par}s</b> se kam.` : ''}${best ? ` Pichhla best: <b>${best.score}/${total}</b> · <b>${best.secs}s</b>.` : ''}</div>`));
    const startBtn = el('button', 'btn big dl-start', '▶ Shuru karo');
    const top = el('div', 'dl-top');
    const sym = el('div', 'dl-sym');
    const opts = el('div', 'choices dl-opts');
    const fb = el('div', 'feedback');
    const nav = el('div', 'dl-nav');
    const after = el('div', 'lab-after');
    box.appendChild(startBtn);
    arena.appendChild(box);

    const fmt = s => `${Math.floor(s)}s`;
    function paintTop() {
      top.innerHTML = `<span>Round <b>${Math.min(k + 1, total)}</b> / ${total}</span><span>✅ ${right}</span><span>⚡ ${fast}</span><span class="dl-clock">⏱ ${fmt(used)}</span>`;
    }
    function show() {
      answered = false;
      const { r } = picked[k];
      sym.innerHTML = `<div class="dl-sym-h">📊 Dashboard pe yeh dikh raha hai</div>${lines(r.sym)}`;
      opts.innerHTML = ''; fb.className = 'feedback'; fb.innerHTML = ''; nav.innerHTML = '';
      optBtns = []; nextBtn = null;
      const ch = [r.good].concat(r.bad).map((t, i) => ({ t, i }));
      SD.shuffle(ch).forEach((c, n) => {
        const b = el('button', 'choice dl-opt', `<span class="dl-key">${n + 1}</span> ${esc(c.t)}`);
        b.dataset.i = String(c.i);
        b.onclick = () => pickOpt(b, c.i);
        optBtns.push(b);
        opts.appendChild(b);
      });
      paintTop();
      tRound = now();
    }
    function pickOpt(btn, i) {
      if (answered || over) return;
      answered = true;
      const secs = Math.max(0, (now() - tRound) / 1000);
      used += secs;
      const { r } = picked[k];
      const ok = i === 0;
      optBtns.forEach(b => {
        b.disabled = true;
        if (b.dataset.i === '0') b.classList.add('correct');
      });
      if (!ok) { btn.classList.add('wrong'); if (SD.shake) SD.shake(btn); }
      const quick = ok && secs <= FAST;
      if (ok) { right++; SD.addXP(SD.XP_PER_ITEM); if (quick) fast++; }
      else SD.noteMistake(`⚡ Lakshan: ${String(r.sym).replace(/\n/g, ' · ')}`, `<b>${esc(r.good)}</b><br>${r.why}`);
      log.push({ i: picked[k].i, ok, secs });
      fb.className = 'feedback ' + (ok ? 'good' : 'bad');
      fb.innerHTML = `${ok ? (quick ? '⚡' : '✅') : '❌'} <b>${ok ? 'Sahi' : 'Sahi jawab: ' + esc(r.good)}</b> <span class="dl-secs">(${secs.toFixed(1)}s)</span><br>${r.why}
        <div class="dl-where">📚 Yeh yahan sikhaya gaya: ${esc(levelTitle(r.level))}</div>`;
      const nx = el('button', 'btn dl-next', k + 1 < total ? 'Agla round →' : 'Report card →');
      nx.onclick = () => { if (over) return; k++; if (k < total) show(); else finish(); };
      nav.appendChild(nx);
      nextBtn = nx;
      paintTop();
      if (nx.focus) { try { nx.focus(); } catch (e) { /* headless */ } }
    }
    function finish() {
      over = true;
      const secs = Math.round(used);
      paintTop();
      [sym, opts, fb, nav].forEach(n => { n.style.display = 'none'; });
      const stars = right === total && (!stage.par || secs <= stage.par) ? 3 : right >= Math.ceil(total * 0.75) ? 2 : 1;
      const prev = SD.state.labs.drill[stage.id];
      const better = !prev || right > prev.score || (right === prev.score && secs < prev.secs);
      if (better) { SD.state.labs.drill[stage.id] = { score: right, secs }; SD.saveState(); }
      const misses = log.filter(x => !x.ok).map(x => stage.rounds[x.i]);
      const slow = log.filter(x => x.ok && x.secs > FAST * 2).map(x => stage.rounds[x.i]);
      const win = el('div', 'lab-win pop dl-card',
        `<div class="dl-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
        <div><b>${right}/${total} sahi</b> · sochne ka samay <b>${secs}s</b>${stage.par ? ` (lakshya ${stage.par}s)` : ''} · ⚡ ${fast}${better && prev ? ' — <b>naya best!</b>' : ''}</div>` +
        (misses.length ? `<div class="dl-miss"><b>Dobara padho:</b>${misses.map(r => `<div>❌ ${esc(String(r.sym).split('\n')[0])} → <b>${esc(r.good)}</b> <span class="dl-where">(${esc(levelTitle(r.level))})</span></div>`).join('')}</div>` : '<div>Ek bhi galti nahi. 🔥</div>') +
        (slow.length ? `<div class="dl-miss"><b>Sahi, par dheere (${FAST * 2}s+):</b>${slow.map(r => `<div>🐢 ${esc(String(r.sym).split('\n')[0])}</div>`).join('')}</div>` : '') +
        `<div class="dl-rules">⭐⭐⭐ = sab sahi + lakshya se kam samay · ⭐⭐ = 75%+ sahi. Dobara khelo toh pool se naye rounds aate hain.</div>`);
      const again = el('button', 'btn ghost dl-again', '🔁 Dobara (naye rounds)');
      again.onclick = () => { arena.innerHTML = ''; renderDrill(stage, arena, onDone); };
      const done = el('button', 'btn big dl-done', 'Aage badho →');
      done.onclick = () => { done.disabled = true; again.disabled = true; onDone({ firstTry: right, total }); };
      after.append(win, again, done);
      if (after.scrollIntoView) after.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    startBtn.onclick = () => {
      if (k || answered || top.isConnected) return;
      startBtn.style.display = 'none';
      box.append(top, sym, opts, fb, nav, after);
      show();
    };
    /* keyboard: 1/2/3 = option, Enter = agla. Box page se hat jaaye toh listener khud hat jaata hai. */
    if (typeof document !== 'undefined' && document.addEventListener) {
      const onKey = e => {
        if (box.isConnected === false) { document.removeEventListener('keydown', onKey); return; }
        if (over || !top.isConnected || /^(INPUT|TEXTAREA)$/.test((e.target || {}).tagName || '')) return;
        const n = parseInt(e.key, 10);
        if (!answered && n >= 1 && n <= optBtns.length) { e.preventDefault(); optBtns[n - 1].click(); }
        else if (answered && e.key === 'Enter' && nextBtn && e.target !== nextBtn) { e.preventDefault(); nextBtn.click(); }
      };
      document.addEventListener('keydown', onKey);
    }
  };
})();
