/* =====================================================================
   System Gurukul — explain.js
   "Samjhane" wale do auzaar (arpitbhayaniclasses se laaye, yahan badhaye):

   1. SD.viz.svg(nodes, edges, state, opts) — services ka chhota SVG diagram
        nodes : [{ id, label, icon, x, y, kind? }]      (x/y = box ka centre)
        edges : [{ from, to, dashed? }]                 (hamesha dikhne wali patli lines)
        state : { nodes: { id: { tone, badge } }, flows: [{ from, to, label, tone, back? }] }
        opts  : { w, h }                                (viewBox; default 1000 × 520)
        tone  : ok | slow | bad | busy | idle | new | acc

   2. DRYRUN renderer — ek click = ek badlaav. Type 'dryrun' (request ka safar) aur
      type 'cards' (chhote explanation cards) dono yahi renderer chalate hain.

      stage = { type, title, goal?,
                nodes?, edges?, viz?: { w, h, focus? },     // diagram (optional); focus = phone par hamesha dikhne wale node ids
                vars?:   [{ id, label }],                   // "andar ka haal" table (optional)
                panels?: [{ id, title }],                   // lines ki list (optional)
                code?:   { title, file?, from?, text },     // asli file ka tukda (optional)
                steps: [{ title?, say, clock?, flows?, nodes?, vars?, panels?, line?, ask? }],
                lesson }
      - nodes / vars / panels ki state PICHLE steps se chalti aati hai jab tak badle nahi.
      - vars ki value: text, ya cells ka array — 'ok' ✓ · 'bad' ✗ · 'free' · 'busy:#5' · 'wait:#9' · 'skip'.
        Jo value is step mein badli, woh chamakti hai.
      - line: code ki kaunsi line(s) is step mein chali — 12, [12, 13], ya '12-15' (asli file ke line number).
      - ask: { q, choices, answer, explain, hint? } — sahi jawab ke bina "Agla" band.

   Contract (games.js jaisa): (stage, arena, onDone) → onDone({ firstTry, total })
   Do niyam (labs.js wale): renderer apna state LEVEL DATA par nahi likhta; har button ki
   apni CLASS hai (dr-prev, dr-next, dr-opt, dr-done) — validator class se pakadta hai.
   Poori file IIFE mein — games.js ke top-level `const el` se takraav na ho.
   ===================================================================== */
(function () {
  const el = SD.el, shake = SD.shake, escapeHtml = SD.escapeHtml;

  /* ------------------------------------------------------------------
     SD.viz
     ------------------------------------------------------------------ */
  const NW = 190, NH = 70;
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* box ki chaudai label ki lambai se — lamba naam bahar na nikle */
  function widthOf(n) { return Math.max(NW, Math.round(84 + String(n.label || '').length * 12.8)); }

  /* line ko box ki deewar par khatam karo, centre par nahi — arrow saaf dikhe */
  function clip(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const edge = n => {
      const sx = dx === 0 ? Infinity : (widthOf(n) / 2 + 6) / Math.abs(dx);
      const sy = dy === 0 ? Infinity : (NH / 2 + 6) / Math.abs(dy);
      return Math.min(sx, sy, 0.45);
    };
    const sa = edge(a), sb = edge(b);
    return { x1: a.x + dx * sa, y1: a.y + dy * sa, x2: b.x - dx * sb, y2: b.y - dy * sb };
  }

  /* har SVG ke arrowhead (marker) ka apna id — ek page par do diagram ho sakte hain (stage ka dry run + chhupa hua
     "Concept diagram"); ek jaisa id hota toh browser chhupe hue diagram ka marker dhoondhta aur arrowhead gayab ho jaate */
  let svgSeq = 0;

  SD.viz = {
    svg(nodes, edges, state, opts) {
      state = state || {};
      const uid = 'ah' + (++svgSeq);
      const W = (opts && opts.w) || 1000, H = (opts && opts.h) || 520;
      const map = {};
      nodes.forEach(n => { map[n.id] = n; });
      const ns = state.nodes || {};
      const tones = ['ok', 'bad', 'slow', 'acc'];
      let out = `<svg class="ms-svg" viewBox="0 0 ${W} ${H}" role="img"><defs>` +
        tones.map(t => `<marker id="${uid}-${t}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ah ${t}"/></marker>`).join('') +
        '</defs>';

      (edges || []).forEach(e => {
        const a = map[e.from], b = map[e.to];
        if (!a || !b) return;
        const c = clip(a, b);
        out += `<line class="ms-edge${e.dashed ? ' dashed' : ''}" x1="${c.x1}" y1="${c.y1}" x2="${c.x2}" y2="${c.y2}"/>`;
      });

      const labels = [];
      (state.flows || []).forEach(f => {
        const a = map[f.from], b = map[f.to];
        if (!a || !b) return;
        const tone = f.tone || 'acc';
        const off = f.back ? 12 : (f.offset || 0);
        const c = clip(a, b);
        const len = Math.hypot(c.x2 - c.x1, c.y2 - c.y1) || 1;
        const nx = -(c.y2 - c.y1) / len * off, ny = (c.x2 - c.x1) / len * off;
        const x1 = c.x1 + nx, y1 = c.y1 + ny, x2 = c.x2 + nx, y2 = c.y2 + ny;
        out += `<line class="ms-flow ${tone}${f.stuck ? ' stuck' : ''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#${uid}-${tones.indexOf(tone) > -1 ? tone : 'acc'})"/>`;
        if (f.label) {
          const segLen = Math.hypot(x2 - x1, y2 - y1);
          const w = Math.min(460, 20 + String(f.label).length * 10.2);
          /* label arrow ke UPAR rehta hai (wapsi wali flow ka NEECHE) — arrow ko dhakna nahi chahiye.
             Label do boxes ke beech ki jagah se chauda ho toh aur upar uthao, taaki box ke kone na dhake. */
          const fits = segLen >= w + 8;
          const mx = (c.x1 + c.x2) / 2, my = (c.y1 + c.y2) / 2 + (f.back ? (fits ? 30 : -84) : (fits ? -26 : -50));
          labels.push(`<g class="ms-flabel ${tone}"><rect x="${mx - w / 2}" y="${my - 17}" width="${w}" height="30" rx="8"/><text x="${mx}" y="${my + 4}">${esc(f.label)}</text></g>`);
        }
      });

      nodes.forEach(n => {
        const st = ns[n.id] || {};
        const tone = st.tone || n.tone || 'idle';
        const nw = widthOf(n);
        const x = n.x - nw / 2, y = n.y - NH / 2;
        out += `<g class="ms-node ${tone}${n.kind ? ' k-' + n.kind : ''}" data-id="${esc(n.id)}">` +
          `<rect x="${x}" y="${y}" width="${nw}" height="${NH}" rx="${n.kind === 'db' || n.kind === 'queue' ? 24 : 12}"/>` +
          `<text class="ms-ico" x="${x + 30}" y="${n.y + 10}">${esc(n.icon || '📦')}</text>` +
          `<text class="ms-lbl" x="${x + 56}" y="${n.y + 8}">${esc(n.label)}</text>`;
        if (st.badge != null && st.badge !== '') {
          const bw = Math.min(380, 24 + String(st.badge).length * 9.2);
          out += `<g class="ms-badge ${tone}"><rect x="${n.x - bw / 2}" y="${n.y + NH / 2 + 6}" width="${bw}" height="28" rx="14"/><text x="${n.x}" y="${n.y + NH / 2 + 26}">${esc(st.badge)}</text></g>`;
        }
        out += '</g>';
      });
      /* labels sabse aakhir mein — koi node unhe na dhake */
      return out + labels.join('') + '</svg>';
    },
  };

  /* ------------------------------------------------------------------
     chhote helpers
     ------------------------------------------------------------------ */
  function goalBox(text) {
    const g = el('div', 'lab-goal');
    g.appendChild(el('h4', null, '🎯 GOAL'));
    g.appendChild(el('div', 'lab-goal-text', text));
    return g;
  }

  /* ek MCQ card — sahi par onRight(firstTryBool); galat par shake + ishaara + Dojo card */
  function askCard(q, onRight) {
    const card = el('div', 'ms-ask');
    card.appendChild(el('div', 'ms-ask-q', '🤔 ' + q.q));
    const fb = el('div', 'ms-ask-fb');
    let wrong = false, done = false;
    SD.shuffle(q.choices.map((c, i) => ({ c, i }))).forEach(({ c, i }) => {
      const b = el('button', 'ms-opt dr-opt', c);
      b.dataset.i = String(i);
      b.onclick = () => {
        if (done || b.disabled) return;
        if (i === q.answer) {
          done = true;
          b.classList.add('right');
          fb.className = 'ms-ask-fb good';
          fb.innerHTML = '✅ ' + (q.explain || 'Sahi!');
          onRight(!wrong);
        } else {
          if (!wrong) SD.noteMistake(q.q, `<b>${q.choices[q.answer]}</b><br>${q.explain || ''}`, '🔍 Dry run');
          wrong = true;
          b.classList.add('wrong');
          b.disabled = true;
          shake(card);
          fb.className = 'ms-ask-fb bad';
          fb.innerHTML = '❌ Nahi. ' + (q.hint || 'Upar ka haal dobara dekho, phir ek aur try karo.');
        }
      };
      card.appendChild(b);
    });
    card.appendChild(fb);
    return card;
  }

  const CELL = { ok: '✓', bad: '✗', free: '', busy: '⏳', wait: '…', skip: '⛔' };
  function cellsHtml(arr) {
    return '<span class="dr-cells">' + arr.map(tok => {
      const parts = String(tok).split(':'), tone = parts[0];
      const known = Object.prototype.hasOwnProperty.call(CELL, tone);
      const text = parts.length > 1 ? parts.slice(1).join(':') : (known ? CELL[tone] : tone);
      return `<i class="dr-cell ${known ? tone : 'text'}">${escapeHtml(text)}</i>`;
    }).join('') + '</span>';
  }

  /* line: 12 | [12, 13] | '12-15'  →  Set of line numbers */
  function lineSet(line) {
    const out = new Set();
    if (line == null) return out;
    (Array.isArray(line) ? line : [line]).forEach(x => {
      const m = String(x).match(/^(\d+)-(\d+)$/);
      if (m) { for (let k = +m[1]; k <= +m[2]; k++) out.add(k); }
      else out.add(+x);
    });
    return out;
  }
  SD.dryrunLines = lineSet;                       /* validator bhi yahi use karta hai */

  /* ------------------------------------------------------------------
     DRYRUN / CARDS
     ------------------------------------------------------------------ */
  SD.renderers.dryrun = function renderDryrun(stage, arena, onDone) {
    const steps = stage.steps || [];
    const answered = {};                          /* stepIndex -> firstTry bool (LOCAL state) */
    let i = 0, finished = false;

    if (stage.goal) arena.appendChild(goalBox(stage.goal));
    const wrap = el('div', 'dr-wrap');
    const top = el('div', 'dr-top');
    const counter = el('div', 'dr-counter');
    const clock = el('div', 'dr-clock');
    top.append(counter, clock);
    wrap.appendChild(top);

    const hasDiagram = (stage.nodes || []).length > 0;
    const diagram = el('div', 'dr-diagram');
    const stateBox = el('div', 'dr-state');
    const codeBox = el('div', 'dr-codebox');
    if (hasDiagram) wrap.appendChild(diagram);
    const cols = el('div', 'dr-cols' + (stage.code && (stage.vars || stage.panels) ? ' two' : ''));
    if (stage.code) cols.appendChild(codeBox);
    if (stage.vars || stage.panels) cols.appendChild(stateBox);
    if (stage.code || stage.vars || stage.panels) wrap.appendChild(cols);

    const say = el('div', 'dr-say');
    const askSlot = el('div', 'dr-ask');
    const nav = el('div', 'dr-nav');
    const prev = el('button', 'btn ghost dr-prev', '← Pichla');
    const next = el('button', 'btn big dr-next', 'Agla step →');
    nav.append(prev, next);
    const endSlot = el('div', 'dr-end');
    wrap.append(say, askSlot, nav, endSlot);
    arena.appendChild(wrap);

    function stateAt(k) {
      const nodes = {}, pans = {}, vars = {};
      let clk = '';
      for (let j = 0; j <= k; j++) {
        const s = steps[j];
        Object.assign(nodes, s.nodes || {});
        Object.assign(pans, s.panels || {});
        Object.assign(vars, s.vars || {});
        if (s.clock) clk = s.clock;
      }
      return { nodes, pans, vars, clk, flows: steps[k].flows || [] };
    }

    function paint() {
      const s = steps[i];
      const st = stateAt(i);
      const before = i > 0 ? stateAt(i - 1).vars : {};
      counter.innerHTML = `Step <b>${i + 1}</b> / ${steps.length}` +
        `<span class="dr-dots">${steps.map((_, k) => `<i class="${k < i ? 'seen' : k === i ? 'on' : ''}"></i>`).join('')}</span>`;
      clock.textContent = st.clk ? '⏱ ' + st.clk : '';
      if (hasDiagram) {
        diagram.innerHTML = SD.viz.svg(stage.nodes, stage.edges || [], { nodes: st.nodes, flows: st.flows }, stage.viz);
        /* phone par diagram apne dabbe se chauda rakha jaata hai (padhne layak). Jahan is step ka kaam ho raha hai, wahan le chalo. */
        if (diagram.scrollWidth > diagram.clientWidth + 4) {
          /* viz.focus: jab ek node door ho (load balancer → servers) aur dono phone par ek saath na aa sakein, tab hamesha yahi nodes dikhao */
          const focus = stage.viz && stage.viz.focus;
          const ids = focus ? focus.slice() : Object.keys(s.nodes || {});
          if (!focus) (s.flows || []).forEach(f => ids.push(f.from, f.to));
          const xs = stage.nodes.filter(n => ids.indexOf(n.id) > -1).map(n => n.x);
          if (xs.length) {
            const mid = (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2 / ((stage.viz && stage.viz.w) || 1000);
            diagram.scrollLeft = Math.max(0, mid * diagram.scrollWidth - diagram.clientWidth / 2);
          }
        }
      }

      let html = '';
      if (stage.vars) {
        html += '<table class="dr-vars">' + stage.vars.map(v => {
          const val = st.vars[v.id];
          const changed = i > 0 && JSON.stringify(val) !== JSON.stringify(before[v.id]);
          const shown = Array.isArray(val) ? cellsHtml(val) : (val == null || val === '' ? '<span class="muted">—</span>' : val);
          return `<tr class="${changed ? 'changed' : ''}"><th>${v.label}</th><td>${shown}${changed ? '<span class="dr-chg">badla</span>' : ''}</td></tr>`;
        }).join('') + '</table>';
      }
      (stage.panels || []).forEach(p => {
        const lines = st.pans[p.id] || [];
        html += `<div class="dr-panel"><div class="dr-ptitle">${p.title}</div>` +
          (lines.length ? lines.map(l => `<div class="dr-pline">${l}</div>`).join('') : '<div class="dr-pline muted">—</div>') + '</div>';
      });
      stateBox.innerHTML = html;

      if (stage.code) {
        const on = lineSet(s.line), from = stage.code.from || 1;
        codeBox.innerHTML = (stage.code.title ? `<div class="dr-ptitle dr-file">${stage.code.title}</div>` : '') +
          '<pre class="dr-code">' + String(stage.code.text).split('\n').map((ln, k) =>
            `<span class="dr-ln${on.has(from + k) ? ' on' : ''}"><b>${from + k}</b>${escapeHtml(ln) || ' '}</span>`).join('') + '</pre>';
        /* chalti hui line dikhe — sirf code ke dabbe ke andar scroll (page nahi hilta) */
        const pre = codeBox.querySelector('.dr-code'), cur = codeBox.querySelector('.dr-ln.on');
        if (pre && cur && typeof cur.offsetTop === 'number') pre.scrollTop = Math.max(0, cur.offsetTop - 70);
      }

      say.innerHTML = (s.title ? `<h3 class="dr-stitle">${s.title}</h3>` : '') + (s.say || '');
      /* phone par chaudi table har row = ek card ban jaati hai (CSS). Uske liye har cell ko apne column ka naam chahiye. */
      say.querySelectorAll('table').forEach(t => {
        const heads = Array.prototype.map.call(t.querySelectorAll('tr:first-child th'),
          th => th.innerHTML.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').trim());
        if (!heads.length) return;
        t.classList.add('dr-stack');
        Array.prototype.forEach.call(t.querySelectorAll('tr'), tr =>
          Array.prototype.forEach.call(tr.querySelectorAll('td'), (td, k) => { if (heads[k]) td.setAttribute('data-th', heads[k]); }));
      });
      askSlot.innerHTML = '';
      prev.disabled = i === 0;
      next.disabled = !!(s.ask && answered[i] === undefined);
      next.textContent = i === steps.length - 1 ? 'Poora hua ✔' : 'Agla step →';
      if (s.ask) {
        if (answered[i] === undefined) {
          askSlot.appendChild(askCard(s.ask, first => { answered[i] = first; next.disabled = false; }));
        } else {
          askSlot.appendChild(el('div', 'ms-ask-fb good', `✅ <b>${s.ask.choices[s.ask.answer]}</b><br>${s.ask.explain || ''}`));
        }
      }
    }

    prev.onclick = () => { if (i > 0) { i--; paint(); } };
    next.onclick = () => {
      if (next.disabled) return;
      if (i < steps.length - 1) {
        i++; paint();
        /* naya haal dikhe: step ka upari hissa screen ke upar nikal gaya ho, ya chipke hue topbar ke peeche ho, toh wapas le aao */
        const r = wrap.getBoundingClientRect(), bar = document.getElementById('topbar');
        const barH = bar ? bar.getBoundingClientRect().height || 0 : 0;
        if (r.top < barH + 4) wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (finished) return;
      finished = true;
      nav.style.display = 'none';
      if (stage.lesson) endSlot.appendChild(el('div', 'lab-win', stage.lesson));
      const asks = Object.keys(answered);
      const done = el('button', 'btn big dr-done', 'Aage badho →');
      done.onclick = () => onDone({ firstTry: asks.filter(k => answered[k]).length, total: asks.length });
      endSlot.appendChild(done);
    };
    paint();
  };

  SD.renderers.cards = SD.renderers.dryrun;
})();
