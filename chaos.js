/* =====================================================================
   System Gurukul — 🎲 Chaos round   (stage type: 'chaos')
   Kal raat ek deploy mein EK cheez galat badli. Deck ke 6–8 cards mein se ek
   random chhupi galti system mein hai. Tumhe: probe chalao → lakshan dekho →
   kaaran dhoondho → theek karo → pakka karo → aakhir mein batao "kya toota tha?"
   Dobara khelo toh nayi galti (pichhle 2 cards nahi aate).

   Jodna (data-chaos-<track>.js, IIFE ke andar):
   SD.chaos.addDeck({
     id: 'data', title: 'Data deck',
     sys: { ... },                      // SWASTH base system (perfsim stage.sys jaisa) — har card isi par ek badlaav
     alert: 'HTML — sab cards ke liye EK jaisa shuruaati alert (galti ka naam nahi)',
     runbook: 'saada text — probe commands + tools', placeholder: 'input ka placeholder',
     cards: [ {
       id: 'count-on', title: 'List har request par poori ginti (COUNT) kar rahi hai',   // aakhir ke sawal ka option
       sys: { api: { countTotal: true } },          // base par EK badlaav (objects merge, arrays replace)
       fixed: sim => bool,                           // galti theek hui? (sim.sys)
       verify: (rec, sim) => bool,                   // fix ke BAAD ka record (wahi probe)
       verifyText: 'dashboard ka GET dobara',
       hints: ['dekho', 'socho', 'lagbhag hal'], solution: ['poora hal'],
       why: 'HTML — kya toota, kaise pehchaana, kyun yeh fix',
     } ],
   })
   stage: { type: 'chaos', id: 'chaos-data', deck: 'data', title, intro? }
   SD.chaos.mission(deckId, cardId) → terminal stage (validator har card ko isi se chalata hai).
   Buttons ki classes (validator): cx-opt (data-id), cx-again, cx-next.
   ===================================================================== */
(function () {
  const DECKS = {};
  const clone = o => JSON.parse(JSON.stringify(o));
  function merge(base, over) {
    Object.keys(over || {}).forEach(k => {
      const b = base[k], o = over[k];
      if (o && typeof o === 'object' && !Array.isArray(o) && b && typeof b === 'object' && !Array.isArray(b)) merge(b, o);
      else base[k] = (o && typeof o === 'object') ? clone(o) : o;
    });
    return base;
  }
  const addDeck = d => { DECKS[d.id] = d; return d; };
  const deck = id => DECKS[id];
  const ids = () => Object.keys(DECKS);

  /* pichhle 2 cards chhod kar random; SD.state.labs.seen['chaos:<deck>'] */
  function pick(d) {
    SD.state.labs = SD.state.labs || { drill: {}, oncall: {}, seen: {} };
    const key = 'chaos:' + d.id, seen = SD.state.labs.seen[key] || [];
    const fresh = d.cards.filter(c => !seen.slice(-2).includes(c.id));
    const pool = fresh.length ? fresh : d.cards;
    const c = pool[Math.floor(Math.random() * pool.length)];
    SD.state.labs.seen[key] = seen.concat(c.id).slice(-4);
    SD.saveState();
    return c;
  }

  function mission(deckId, cardId) {
    const d = deck(deckId);
    if (!d) throw new Error('chaos: deck "' + deckId + '" registered nahi hai');
    const card = cardId == null ? null : d.cards.find(c => c.id === cardId);
    if (cardId != null && !card) throw new Error('chaos: card "' + cardId + '" deck "' + deckId + '" mein nahi');
    const sys = merge(clone(d.sys || {}), card ? card.sys : {});
    const T = [
      { text: '🔎 Chhupi galti dhoondho aur theek karo', check: s => !!(s.cx && s.cx.fixedAt != null) },
      { text: '✅ Pakka karo — ' + (card ? card.verifyText : 'probe dobara'), check: s => !!(s.cx && s.cx.verified) },
    ];
    const responses = [{ re: /^sim inject\b/i, err: true, out: 'Chaos round mein galti pehle se chhupi hai — nayi mat daalo. Probe chalao aur dhoondho.' }];
    if (d.runbook) responses.push({ re: /^(cat\s+)?runbook(\.md)?$/i, out: d.runbook });
    return {
      type: 'terminal', chaos: true, deck: d.id, card: card && card.id, sys, goal: d.alert, tasks: T, success: SD.allTasks(T),
      responses: responses.concat(d.responses || []), placeholder: d.placeholder || 'runbook',
      hints: card ? card.hints : [], solution: card ? card.solution : [],
      successText: 'Galti theek hui aur pakki bhi. Ab neeche batao — <b>kya toota tha?</b>',
      onInit: sim => { sim.cx = { fixedAt: null, fixedRec: 0, verified: false, rev0: sim.revision }; },
      onTick: sim => {
        if (!card) return;
        const c = sim.cx, f = !!card.fixed(sim);
        if (f && c.fixedAt == null) { c.fixedAt = sim.history.length; c.fixedRec = sim.records.length; }
        if (!f) { c.fixedAt = null; c.verified = false; return; }
        if (!c.verified && sim.records.slice(c.fixedRec).some(r => { try { return !!card.verify(r, sim); } catch (e) { return false; } })) c.verified = true;
      },
    };
  }

  SD.chaos = { addDeck, deck, ids, mission, pick, merge };

  /* =====================================================================
     🎲 renderer — terminal (chhupi galti ke saath) → "kya toota tha?" → reveal
     ===================================================================== */
  const el = SD.el, esc = SD.escapeHtml;
  SD.renderers.chaos = function renderChaos(stage, arena, onDone) {
    const d = deck(stage.deck);
    if (!d) { arena.appendChild(el('div', 'feedback bad', 'Yeh chaos deck load nahi hua. Page reload karke dobara kholo.')); return; }
    const card = pick(d);
    const m = mission(d.id, card.id);
    arena.appendChild(el('div', 'cx-head', `🎲 <b>Chaos round</b> · ${d.cards.length} mein se <b>ek</b> chhupi galti · dobara khelo toh nayi` +
      (stage.intro ? `<div class="cx-intro">${stage.intro}</div>` : '')));
    const sub = el('div', 'cx-term');
    const after = el('div', 'lab-after');
    arena.append(sub, after);
    let revealed = false;
    function reveal() {
      if (revealed) return;
      revealed = true;
      const sim = ctl.sim, changes = sim.revision - ((sim.cx || {}).rev0 || 0);
      const need = (card.solution || []).filter(x => /^(sim (set|add|scale|precompute)|create (unique )?index|drop index|cache coalesce|migrate (rollback|dual-write)|tenant (isolation|quota|replica)|token mode|kv (repair|up))\b/i.test(x)).length;
      const others = SD.shuffle(d.cards.filter(c => c.id !== card.id)).slice(0, 2);
      const q = el('div', 'cx-q', '<b>🔎 Kya toota tha?</b> Kal raat ki deploy mein kaunsi cheez galat badli thi?');
      const opts = el('div', 'choices');
      const fb = el('div', 'feedback');
      let answered = false;
      const btns = [];
      SD.shuffle([card].concat(others)).forEach(c => {
        const b = el('button', 'choice cx-opt', esc(c.title));
        b.dataset.id = c.id;
        b.onclick = () => {
          if (answered) return;
          answered = true;
          const ok = c.id === card.id;
          btns.forEach(x => { x.disabled = true; if (x.dataset.id === card.id) x.classList.add('correct'); });
          if (!ok) { b.classList.add('wrong'); SD.noteMistake(`🎲 Chaos (${d.title}): lakshan se kaaran`, `<b>${esc(card.title)}</b><br>${card.why}`); }
          else SD.addXP(SD.XP_PER_ITEM);
          fb.className = 'feedback ' + (ok ? 'good' : 'bad');
          fb.innerHTML = `${ok ? '✅ Sahi pakda!' : '❌ Asli galti: <b>' + esc(card.title) + '</b>'}<br>${card.why}
            <div class="dl-where">🔧 Tumne <b>${changes}</b> badlaav kiye${need ? ` · hal mein <b>${need}</b> chahiye tha` : ''}${changes > need + 2 ? ' — andaaze se sab kuch badalna production mein naye bug laata hai; pehle naapo, phir ek badlaav.' : ''}</div>`;
          const again = el('button', 'btn ghost cx-again', '🎲 Nayi galti (dobara)');
          again.onclick = () => { arena.innerHTML = ''; renderChaos(stage, arena, onDone); };
          const next = el('button', 'btn big cx-next', 'Aage badho →');
          next.onclick = () => { next.disabled = true; again.disabled = true; onDone({ firstTry: (sim.hintsUsed === 0 ? 1 : 0) + (ok ? 1 : 0), total: 2 }); };
          after.append(again, next);
        };
        btns.push(b);
        opts.appendChild(b);
      });
      after.append(q, opts, fb);
      if (after.scrollIntoView) after.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    const ctl = SD.renderers.terminal(m, sub, () => reveal());
    arena._chaos = { ctl, card, deck: d, mission: m };
  };
})();
