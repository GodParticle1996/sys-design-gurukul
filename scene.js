/* =====================================================================
   System Gurukul — Scene player (kadam-dar-kadam SVG diagram)

   Static diagram mein do cheezein nahi dikhti thi: (1) kaun sa dabba kya hai, (2) kya kis KRAM mein hota hai.
   Scene dono dikhata hai: learner "Agla kadam" dabata hai, ek teer + chalta hua packet dikhta hai, aur neeche
   EK vaakya batata hai ki is kadam mein kaun kisko kya bhej raha hai. Dabbe par click = "yeh dabba kya hai".

   Kube Gurukul ke scene.js se liya (2026-11-15). Scene data ALAG files mein hai (data-scenes-*.js), visuals.js mein nahi:
     SD.addScenes({ 'level-id': { intro, nodes, groups, steps } });   // VISUALS['level-id'] pehle se hona chahiye
   Level intro mein scene dikhta hai, aur purana static `html` neeche "📋 Poori tasveer ek saath" (band dabba) mein rehta hai.
   Soch Akhada scenario mein bhi `scene: {...}` field ho sakta hai (soch.js kahani ke neeche dikhata hai).

   Scene ka shape:
     {
       scene: {
         intro: 'HTML — shuru mein dikhne wali ek line (optional)',
         nodes: [ { id: 'api', col: 1, row: 0, icon: '🚪', label: 'API Server', sub: 'ek hi darwaza',
                    tone: 'accent'|'good'|'bad'|'gold'|'muted', about: 'HTML — click par dikhta hai' } ],
         groups: [ { label: 'Control Plane', cols: [1, 2], rows: [0, 0], tone: 'accent' } ],   // dashed dabba (optional)
         steps: [ { from: 'kubectl', to: 'api', label: 'apply',          // teer + us par likha shabd
                    say: 'HTML — is kadam mein kya hua (EK-DO vaakya, dabbon ke naam ke saath)',
                    tone: 'good'|'bad'|'gold',                           // teer ka rang (default neela)
                    bend: 40,                                            // teer ko mod do (beech ke dabbe se bachne ke liye)
                    at: ['etcd'],                                        // bina teer ke: sirf in dabbon ko highlight karo
                    set: { pod: { tone: 'good', sub: 'Running' } } } ],  // is kadam se dabbe ka rang/subtitle badal do (aage tak rehta hai)
       },
     };
   Grid: col = baayen se 0,1,2,3 (zyada se zyada 4 column, warna phone par padhna mushkil)  row = upar se 0,1,2…
   Ek cell mein ek hi dabba.  `say` mein yeh/woh/isse mat likho — dabbe ka naam likho (validator pakadta hai).
   Poori file IIFE mein hai (app.js ke global `el` se takrav na ho).
   ===================================================================== */
(function () {
  const el = SD.el;
  const CW = 214, CH = 116, BW = 150, BH = 68, PAD = 14, TOP = 12;   /* cell 214×116, dabba 150×68 → dabbon ke beech teer ke liye 64px / 48px jagah */
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const center = n => ({ x: PAD + n.col * CW + CW / 2, y: PAD + TOP + n.row * CH + CH / 2 });

  /* scene ki galtiyan (validator aur browser dono yahi function chalate hain) */
  SD.sceneProblems = function (scene) {
    const out = [];
    if (!scene || !Array.isArray(scene.nodes) || !scene.nodes.length) return ['scene.nodes khaali hai'];
    const ids = new Set(), cells = new Set();
    scene.nodes.forEach(n => {
      if (!n.id) out.push('node bina id ke');
      if (ids.has(n.id)) out.push(`node id '${n.id}' do baar`);
      ids.add(n.id);
      if (!Number.isInteger(n.col) || !Number.isInteger(n.row) || n.col < 0 || n.row < 0) out.push(`node '${n.id}': col/row 0 ya usse bade poore number hone chahiye`);
      const c = n.col + ',' + n.row;
      if (cells.has(c)) out.push(`node '${n.id}': cell (${c}) mein pehle se ek dabba hai`);
      cells.add(c);
      if (!n.label) out.push(`node '${n.id}': label nahi hai`);
      if (String(n.label || '').length > 20) out.push(`node '${n.id}': label 20 akshar se lamba hai (dabbe se bahar niklega)`);
      if (String(n.sub || '').length > 26) out.push(`node '${n.id}': sub 26 akshar se lamba hai (dabbe se bahar niklega)`);
    });
    if (scene.nodes.some(n => n.col > 3)) out.push('4 se zyada column (col 0–3 tak hi) — phone par dabbe bahut chhote ho jaate hain');
    if (!Array.isArray(scene.steps) || scene.steps.length < 2) out.push('scene.steps mein kam se kam 2 kadam chahiye');
    if (Array.isArray(scene.steps) && scene.steps.length > 10) out.push('10 se zyada kadam — scene ko chhota karo (ek scene = ek kahani)');
    (scene.steps || []).forEach((s, i) => {
      const w = `step ${i + 1}`;
      if (!s.say) out.push(`${w}: 'say' nahi hai (har kadam ko ek vaakya chahiye)`);
      ['from', 'to'].forEach(k => { if (s[k] != null && !ids.has(s[k])) out.push(`${w}: ${k} '${s[k]}' koi node nahi hai`); });
      if ((s.from == null) !== (s.to == null)) out.push(`${w}: from aur to dono do, ya dono mat do (sirf highlight ke liye 'at' use karo)`);
      if (s.from != null && s.from === s.to) out.push(`${w}: from aur to ek hi dabba hai — 'at' use karo`);
      (s.at || []).forEach(a => { if (!ids.has(a)) out.push(`${w}: at '${a}' koi node nahi hai`); });
      if (s.from == null && !(s.at || []).length) out.push(`${w}: na teer (from/to) hai na 'at' — learner ko pata nahi chalega kahan dekhna hai`);
      Object.keys(s.set || {}).forEach(a => { if (!ids.has(a)) out.push(`${w}: set '${a}' koi node nahi hai`); });
      if (String(s.label || '').length > 28) out.push(`${w}: teer ka label 28 akshar se lamba hai`);
      if (s.from != null && ids.has(s.from) && ids.has(s.to) && s.from !== s.to) {
        const hit = edgeCrosses(scene, s);
        if (hit) out.push(`${w}: teer '${s.from}' → '${s.to}' dabbe '${hit}' ke upar se guzarta hai — 'bend' badhao (~90) ya dabbon ki jagah badlo`);
        else if (s.label) {
          /* label ke liye koi khaali jagah mili? (na mile toh label kisi dabbe ko dhakega) */
          const cols = Math.max(...scene.nodes.map(n => n.col)) + 1, rows = Math.max(...scene.nodes.map(n => n.row)) + 1;
          const W = PAD * 2 + cols * CW, H = PAD * 2 + TOP + rows * CH, lw = String(s.label).length * 6.6 + 16;
          const byId = {}; scene.nodes.forEach(n => { byId[n.id] = n; });
          const at = placeLabel(edgePath(byId[s.from], byId[s.to], s.bend, lw), lw, scene.nodes, W, H);
          if (labelHits(scene.nodes, at.x, at.y, lw, W, H)) out.push(`${w}: label '${s.label}' ke liye khaali jagah nahi — label chhota karo ya dabbon ke beech jagah chhodo`);
        }
      }
    });
    (scene.groups || []).forEach((g, i) => {
      if (!Array.isArray(g.cols) || !Array.isArray(g.rows) || g.cols.length !== 2 || g.rows.length !== 2) out.push(`group ${i + 1}: cols: [se, tak] aur rows: [se, tak] chahiye`);
    });
    return out;
  };

  /* teer A ke kinare se B ke kinare tak (dabbe ke andar se nahi) */
  function edgePoints(a, b) {
    const A = center(a), B = center(b);
    const dx = B.x - A.x, dy = B.y - A.y;
    const t = Math.min(dx ? (BW / 2 + 5) / Math.abs(dx) : Infinity, dy ? (BH / 2 + 5) / Math.abs(dy) : Infinity);
    return { x1: A.x + dx * t, y1: A.y + dy * t, x2: B.x - dx * t, y2: B.y - dy * t };
  }
  /* teer ka path + label ki jagah. Label teer ke BAGAL mein baithta hai (teer ya arrowhead ko dhakta nahi):
     seedhe teer par upar ki taraf (khade teer par daayen), mude hue teer par mod ke bahar ki taraf. */
  function edgePath(a, b, bend, labelW) {
    const p = edgePoints(a, b);
    const len = Math.hypot(p.x2 - p.x1, p.y2 - p.y1) || 1;
    const nx = -(p.y2 - p.y1) / len, ny = (p.x2 - p.x1) / len;
    const off = (labelW || 0) / 2 * Math.abs(nx) + 10 * Math.abs(ny) + 8;
    let bx = (p.x1 + p.x2) / 2, by = (p.y1 + p.y2) / 2, d, sign, pts;
    if (!bend) {
      d = `M${p.x1.toFixed(1)} ${p.y1.toFixed(1)} L${p.x2.toFixed(1)} ${p.y2.toFixed(1)}`;
      sign = Math.abs(ny) > 0.05 ? (ny > 0 ? -1 : 1) : (nx > 0 ? 1 : -1);
      pts = t => ({ x: p.x1 + (p.x2 - p.x1) * t, y: p.y1 + (p.y2 - p.y1) * t });
    } else {
      const cx = bx + nx * bend, cy = by + ny * bend;
      d = `M${p.x1.toFixed(1)} ${p.y1.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${p.x2.toFixed(1)} ${p.y2.toFixed(1)}`;
      sign = bend > 0 ? 1 : -1;
      pts = t => ({ x: (1 - t) * (1 - t) * p.x1 + 2 * (1 - t) * t * cx + t * t * p.x2, y: (1 - t) * (1 - t) * p.y1 + 2 * (1 - t) * t * cy + t * t * p.y2 });
      bx += nx * bend / 2; by += ny * bend / 2;            /* mude hue teer ka beech ka bindu */
    }
    return { d, bx, by, nx, ny, off, sign, pts, mx: bx + nx * off * sign, my: by + ny * off * sign };
  }
  /* kya (x,y) par rakha w×h ka label kisi dabbe ko ya diagram ke kinare ko chhuta hai? */
  function labelHits(nodes, x, y, w, W, H) {
    if (x - w / 2 < 2 || x + w / 2 > W - 2 || y - 10 < 2 || y + 10 > H - 2) return true;
    return nodes.some(n => { const c = center(n); return Math.abs(x - c.x) < (BW + w) / 2 + 3 && Math.abs(y - c.y) < (BH + 20) / 2 + 3; });
  }
  /* label ke liye pehli khaali jagah. Pasand ka kram:
       1. teer ke beech mein, teer ke BAGAL mein (pasand ki taraf, phir doosri taraf, phir thoda aur door)
          — lamba label do paas-paas ke dabbon ke beech nahi samata, tab label dabbon ke upar/neeche wali khaali patti mein jaata hai
       2. teer ke saath thoda aage/peechhe sarak kar, bagal mein
       3. teer ki line ke UPAR hi (line ka chhota hissa dhakta hai, par koi dabba ya arrowhead nahi)
     Kuch na mile toh purani jagah (validator isko galti ginta hai). */
  function placeLabel(e, w, nodes, W, H) {
    const free = (x, y) => !labelHits(nodes, x, y, w, W, H);
    for (const t of [0.5, 0.36, 0.64]) {
      const q = e.pts(t), far = t === 0.5 ? 60 : 24;
      for (let extra = 0; extra <= far; extra += 6) {
        for (const sg of [e.sign, -e.sign]) {
          const x = q.x + e.nx * (e.off + extra) * sg, y = q.y + e.ny * (e.off + extra) * sg;
          if (free(x, y)) return { x, y };
        }
      }
    }
    for (const t of [0.5, 0.42, 0.58, 0.34, 0.66, 0.26]) { const q = e.pts(t); if (free(q.x, q.y)) return { x: q.x, y: q.y }; }
    return { x: e.mx, y: e.my };
  }
  /* teer kisi TEESRE dabbe ke upar se guzarta hai? (validator ke liye) */
  function edgeCrosses(scene, s) {
    const byId = {}; scene.nodes.forEach(n => { byId[n.id] = n; });
    const e = edgePath(byId[s.from], byId[s.to], s.bend, 0);
    for (const n of scene.nodes) {
      if (n.id === s.from || n.id === s.to) continue;
      const c = center(n);
      for (let k = 1; k < 24; k++) { const q = e.pts(k / 24); if (Math.abs(q.x - c.x) < BW / 2 + 2 && Math.abs(q.y - c.y) < BH / 2 + 2) return n.id; }
    }
    return null;
  }

  /* step i tak ke saare `set` jod kar har dabbe ka abhi ka rang/subtitle */
  function stateAt(scene, i) {
    const st = {};
    scene.nodes.forEach(n => { st[n.id] = { tone: n.tone || '', sub: n.sub || '' }; });
    for (let k = 0; k <= i; k++) Object.entries((scene.steps[k] || {}).set || {}).forEach(([id, v]) => { if (st[id]) Object.assign(st[id], v); });
    return st;
  }

  SD.sceneSvg = function (scene, i, uid) {
    const cols = Math.max(...scene.nodes.map(n => n.col)) + 1, rows = Math.max(...scene.nodes.map(n => n.row)) + 1;
    const W = PAD * 2 + cols * CW, H = PAD * 2 + TOP + rows * CH;
    const byId = {}; scene.nodes.forEach(n => { byId[n.id] = n; });
    const st = stateAt(scene, i);
    const step = i >= 0 ? scene.steps[i] : null;
    const on = new Set(step ? [step.from, step.to].concat(step.at || []).filter(Boolean) : []);
    const mk = `sc-arrow-${uid}`;
    let svg = `<svg class="sc-svg" viewBox="0 0 ${W} ${H}" style="max-width:${W}px" role="img" aria-label="${esc(scene.aria || 'diagram')}">` +
      `<defs>${['', 'good', 'bad', 'gold'].map(t => `<marker id="${mk}${t}" class="sc-mk ${t}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z"/></marker>`).join('')}</defs>`;
    (scene.groups || []).forEach(g => {
      const x = PAD + g.cols[0] * CW + 5, y = PAD + TOP + g.rows[0] * CH + 3;
      const w = (g.cols[1] - g.cols[0] + 1) * CW - 10, h = (g.rows[1] - g.rows[0] + 1) * CH - 6;
      svg += `<g class="sc-group ${g.tone || ''}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12"/>` +
        `<text x="${x + 10}" y="${y - 4}">${esc(g.label)}</text></g>`;
    });
    /* pichhle kadamon ke teer halke — tasveer dheere-dheere banti hai */
    const drawn = new Set();   /* do dabbon ke beech ek hi halki line (aane-jaane ke do teer milkar "lens" bana dete the) */
    for (let k = 0; k < i; k++) {
      const s = scene.steps[k];
      if (s.from == null) continue;
      const pair = [s.from, s.to].sort().join('|');
      if (drawn.has(pair)) continue;
      drawn.add(pair);
      svg += `<path class="sc-edge past" d="${edgePath(byId[s.from], byId[s.to], 0).d}"/>`;
    }
    scene.nodes.forEach(n => {
      const c = center(n), x = c.x - BW / 2, y = c.y - BH / 2, s = st[n.id];
      const cls = 'sc-node ' + (s.tone || '') + (step ? (on.has(n.id) ? ' on' : ' dim') : '') + (n.about ? ' has-about' : '');
      svg += `<g class="${cls}" data-id="${esc(n.id)}"><rect x="${x}" y="${y}" width="${BW}" height="${BH}" rx="11"/>` +
        `<text class="sc-ic" x="${c.x}" y="${y + 23}">${esc(n.icon || '')}</text>` +
        `<text class="sc-lb" x="${c.x}" y="${y + 43}">${esc(n.label)}</text>` +
        (s.sub ? `<text class="sc-sb" x="${c.x}" y="${y + 58}">${esc(s.sub)}</text>` : '') + `</g>`;
    });
    if (step && step.from != null) {
      const lw = step.label ? String(step.label).length * 6.6 + 16 : 0;
      const e = edgePath(byId[step.from], byId[step.to], step.bend, lw), t = step.tone || '';
      svg += `<path class="sc-edge now ${t}" d="${e.d}" marker-end="url(#${mk}${t})"/>`;
      if (!SD.sceneStill) svg += `<circle class="sc-dot ${t}" r="5"><animateMotion dur="1.4s" repeatCount="indefinite" path="${e.d}"/></circle>`;
      if (step.label) {
        const w = lw, at = placeLabel(e, w, scene.nodes, W, H);
        svg += `<g class="sc-elabel ${t}"><rect x="${(at.x - w / 2).toFixed(1)}" y="${(at.y - 10).toFixed(1)}" width="${w.toFixed(1)}" height="20" rx="10"/>` +
          `<text x="${at.x.toFixed(1)}" y="${(at.y + 4).toFixed(1)}">${esc(step.label)}</text></g>`;
      }
    }
    return svg + '</svg>';
  };

  let uidSeq = 0;
  SD.renderScene = function (scene) {
    const uid = ++uidSeq;
    const box = el('div', 'scene');
    const bad = SD.sceneProblems(scene);
    if (bad.length) { box.innerHTML = `<div class="sc-say">⚠️ Diagram ka data galat hai: ${esc(bad[0])}</div>`; return box; }
    const stage = el('div', 'sc-stage');
    const say = el('div', 'sc-say');
    const ctrl = el('div', 'sc-ctrl');
    const back = el('button', 'btn small ghost', '← Pichla');
    const next = el('button', 'btn small', 'Agla kadam →');
    const count = el('span', 'sc-count');
    const again = el('button', 'btn small ghost', '↺ Shuru se');
    ctrl.append(back, next, count, again);
    box.append(stage, say, ctrl);
    const n = scene.steps.length;
    let i = -1;

    function paint() {
      stage.innerHTML = SD.sceneSvg(scene, i, uid);
      if (i < 0) say.innerHTML = (scene.intro ? scene.intro + ' ' : '') +
        `<span class="sc-how">Diagram <b>${n} kadam</b> mein chalta hai. <b>"▶ Pehla kadam"</b> dabao.` +
        (scene.nodes.some(x => x.about) ? ' Kisi dabbe par click karo: us dabbe ka kaam neeche dikhega.' : '') + `</span>`;
      else say.innerHTML = `<span class="sc-num">${i + 1}</span>${scene.steps[i].say}`;
      count.textContent = i < 0 ? `0 / ${n}` : `Kadam ${i + 1} / ${n}`;
      back.disabled = i < 0;
      next.disabled = i >= n - 1;
      next.textContent = i < 0 ? '▶ Pehla kadam' : i >= n - 1 ? '✓ Aakhri kadam' : 'Agla kadam →';
      again.style.display = i < 0 ? 'none' : '';
      centerActive();
    }
    /* phone par diagram screen se chauda hota hai (stage sideways scroll karta hai). Har kadam par chamakte dabbon ko beech mein lao,
       warna abhi wala teer screen ke bahar chhupa reh jaata hai. */
    function centerActive() {
      try {
        if (!(stage.scrollWidth > stage.clientWidth + 4)) return;
        const on = stage.querySelectorAll('.sc-node.on, .sc-edge.now');
        if (!on.length) { stage.scrollLeft = 0; return; }
        const s = stage.getBoundingClientRect();
        let lo = Infinity, hi = -Infinity;
        on.forEach(x => { const r = x.getBoundingClientRect(); lo = Math.min(lo, r.left); hi = Math.max(hi, r.right); });
        const target = stage.scrollLeft + (lo + hi) / 2 - (s.left + s.width / 2);
        stage.scrollTo({ left: Math.max(0, target), behavior: SD.sceneStill ? 'auto' : 'smooth' });
      } catch (e) { /* sirf suvidha */ }
    }
    next.onclick = () => { if (i < n - 1) { i++; paint(); } };
    back.onclick = () => { if (i >= 0) { i--; paint(); } };
    again.onclick = () => { i = -1; paint(); };
    /* dabbe par click → "yeh dabba kya hai" */
    stage.addEventListener('click', e => {
      const g = e.target && e.target.closest && e.target.closest('[data-id]');
      if (!g) return;
      const node = scene.nodes.find(x => x.id === g.getAttribute('data-id'));
      if (!node || !node.about) return;
      say.innerHTML = `<span class="sc-num">?</span><b>${esc(node.icon || '')} ${esc(node.label)}</b> — ${node.about}`;
    });
    paint();
    return box;
  };

  /* data-scenes-*.js yahi bulate hain. VISUALS[id] na mile toh id ko SD.sceneOrphans mein rakho (validator fail karta hai). */
  SD.sceneOrphans = [];
  SD.addScenes = function (map) {
    Object.keys(map).forEach(id => {
      if (typeof VISUALS === 'undefined' || !VISUALS[id]) { SD.sceneOrphans.push(id); return; }
      VISUALS[id].scene = map[id];
    });
  };

  /* motion kam chahiye? → chalta hua packet band (teer aur text wahi rehte hain) */
  try { SD.sceneStill = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { SD.sceneStill = false; }
})();
