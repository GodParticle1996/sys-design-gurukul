/* =====================================================================
   System Gurukul — 📟 On-call shift   (stage type: 'oncall')
   Ek raat, ek live system (perfsim), 3–4 JUDE hue alerts — har agla alert
   pichhle fix ke baad dikhta hai. Har command = shift ki ghadi mein 1 minute.
   Alert tab RESOLVE hota hai jab (1) haalat theek ho (`fixed`) AUR (2) fix ke
   BAAD tumne pakka kiya (`verify`). Khatarnaak commands simulator rok deta hai
   aur report card mein ginta hai. Aakhir mein report card: MTTR, hints, grade.

   stage: { type: 'oncall', id: 'oncall-<naam>', shift: '<shift id>', title, intro?: 'HTML' }

   🧩 Nayi shift (data-oncall-<track>.js, IIFE ke andar):
   SD.oncall.add({
     id: 'nightcart', start: 20 * 60 + 52,          // ghadi 20:52 se
     INC: [ {
       id: 'SearchStarved', sev: '🔴 SEV1' | '🟠 SEV2', text: 'pager ka sandesh',
       fixed: sim => bool,                          // haalat theek? (sim.sys / sim.records)
       verify: /^load\b/ | (rec, sim) => bool,       // fix ke BAAD ka command (regex) ya record (function)
       verifyText: 'kya chala kar pakka karna hai',
       hints: ['1', '2', '3 (lagbhag poora hal)'],
       onFire?: (sim, print) => {},                 // alert aate hi system mein kuch badlo (sim.sys)
       // record par tika fixed()? sim.records.slice(sim.oc.incs[i].firedRec) = is alert ke aane ke baad ke records
     } ],
     build: ({ risky }) => ({
       sys: { ... },                                 // shuruaati system (perfsim stage.sys jaisa)
       goal: 'HTML', runbook: 'saada text (runbook command dikhata hai)',
       responses: [ risky(/^drop index\b/i, 'Index mat giraao — ...'), ... ],
       successText: 'HTML (root cause chain + seekh)', solution: [ 'poora hal, kram se' ],
     }),
     reconcile?: (sim) => {},                        // har minute (optional)
   })
   Engine khud jodta hai: ghadi, alerts ka kram, tasks, hints per alert, pager, report card,
   aur do default rokein: `sim reset` (production restart) aur `sim inject` (raat 3 baje fault nahi daalte).
   SD.oncall.mission(onUpdate, shiftId) → poora terminal stage (validator isi se chalata hai).
   ===================================================================== */
(function () {
  const SHIFTS = {};
  const hhmm = (start, clock) => {
    const m = (start == null ? 22 * 60 : start) + (clock || 0);
    return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  };
  const add = def => { SHIFTS[def.id] = def; return def; };
  const get = id => SHIFTS[id];
  const ids = () => Object.keys(SHIFTS);

  function verified(inc, cur, sim) {
    if (inc.verify instanceof RegExp) return sim.history.slice(cur.fixedIdx).some(h => inc.verify.test(h));
    return sim.records.slice(cur.fixedRec).some(r => { try { return !!inc.verify(r, sim); } catch (e) { return false; } });
  }

  /* ---------- har command = 1 minute ---------- */
  function tick(def, sim, print, onUpdate) {
    const c = sim.oc, INC = def.INC;
    if (!c || c.over) return;
    c.clock++;
    if (def.reconcile) def.reconcile(sim);
    const k = c.inc, cur = c.incs[k], inc = INC[k];
    if (!cur.fixedAt && inc.fixed(sim)) { cur.fixedAt = c.clock; cur.fixedIdx = sim.history.length; cur.fixedRec = sim.records.length; }
    if (cur.fixedAt && !inc.fixed(sim)) { cur.fixedAt = null; cur.nudged = false; }   // baad ke command ne fix tod diya
    if (cur.fixedAt && !cur.verified && verified(inc, cur, sim)) cur.verified = true;
    if (cur.fixedAt && cur.verified) {
      cur.resolved = c.clock;
      cur.hints = sim.hintPos['i' + k] || 0;
      print('task', `📟 ${hhmm(c.start, c.clock)}  ✅ RESOLVED  ${inc.id} — MTTR ${cur.resolved - cur.fired} min`);
      if (k + 1 < INC.length) {
        c.inc = k + 1;
        c.incs[k + 1].fired = c.clock;
        c.incs[k + 1].firedRec = sim.records.length;   // record-wale fixed() checks: "alert aane ke BAAD" ke records
        if (INC[k + 1].onFire) INC[k + 1].onFire(sim, print);
        print('err', `📟 ${hhmm(c.start, c.clock)}  [FIRING] ${INC[k + 1].sev} ${INC[k + 1].id} — ${INC[k + 1].text}`);
      } else { c.over = true; print('task', `📟 ${hhmm(c.start, c.clock)}  🌅 Saare alerts shaant. Shift handover ka waqt.`); }
    } else if (cur.fixedAt && !cur.verified && !cur.nudged) {
      cur.nudged = true;
      print('sys', `(📟 ${inc.id} ki haalat theek lag rahi hai — resolve karne se pehle <b>${inc.verifyText}</b>)`);
    }
    if (onUpdate) onUpdate(c);
  }

  function init(def, sim, print, onUpdate) {
    sim.oc = { clock: 0, start: def.start, inc: 0, over: false, risky: 0, riskyList: [], incs: def.INC.map((x, i) => ({ fired: i === 0 ? 0 : null, firedRec: 0 })) };
    const first = def.INC[0];
    if (first.onFire) first.onFire(sim, print);
    print('err', `📟 ${hhmm(def.start, 0)}  [FIRING] ${first.sev} ${first.id} — ${first.text}`);
    print('sys', `Pager tumhare paas hai. <b>runbook</b> likho — kya chhoona mana hai aur kahan dekhna hai. Har command = 1 minute.`);
    if (onUpdate) onUpdate(sim.oc);
  }

  /* ---------- poora terminal stage: shift ka build() + engine ke hisse ---------- */
  function mission(onUpdate, id) {
    const def = get(id);
    if (!def) throw new Error('oncall: shift "' + id + '" registered nahi hai');
    const INC = def.INC;
    const risky = (re, why) => ({ re, err: true, out: s => {
      if (s.oc) { s.oc.risky++; s.oc.riskyList.push(why.split(' — ')[0]); }
      return '(simulator ne roka — report card mein gina jaayega) ' + why;
    } });
    const b = def.build({ risky });
    const base = [
      risky(/^sim reset\b/i, 'Reset mana — poora production restart karne se raat ke saare sabut (aur users ke session) chale jaate hain. Ek-ek cheez theek karo.'),
      risky(/^sim inject\b/i, 'Fault inject mana — on-call shift mein production par naya fault nahi daalte (woh chaos test ka kaam hai). Aur bahar ke provider ki speed tumhare haath mein nahi.'),
    ];
    const runbook = b.runbook ? [{ re: /^(cat\s+)?runbook(\.md)?$/i, out: b.runbook }] : [];
    const T = INC.map((inc, i) => ({ text: `📟 Alert ${i + 1} — theek karo, phir pakka karo`, check: s => !!(s.oc && s.oc.incs[i].resolved) }));
    return Object.assign({ hints: INC[0].hints }, b, {
      type: 'terminal', oncall: true, shift: def.id, tasks: T, success: SD.allTasks(T),
      responses: base.concat(runbook, b.responses || []),
      placeholder: b.placeholder || 'runbook',
      onInit: (sim, print) => init(def, sim, print, onUpdate),
      onTick: (sim, print) => tick(def, sim, print, onUpdate),
      hintsFor: sim => ({ key: 'i' + sim.oc.inc, list: INC[sim.oc.inc].hints }),
    });
  }

  SD.oncall = { add, get, ids, mission, hhmm };

  /* =====================================================================
     📟 renderer — pager panel + perfsim terminal + aakhir mein report card
     ===================================================================== */
  const el = SD.el;
  SD.renderers.oncall = function renderOncall(stage, arena, onDone) {
    const S = SD.oncall.get(stage.shift);
    if (!S) { arena.appendChild(el('div', 'feedback bad', 'Yeh on-call shift load nahi hui. Page reload karke dobara kholo.')); return; }
    const INC = S.INC;
    const pager = el('div', 'oc-pager');
    const sub = el('div', 'oc-term');
    const after = el('div', 'lab-after');
    let last = null, finished = false;
    function paint(c) {
      last = c;
      const k = c.inc, cur = c.incs[k];
      pager.innerHTML = `<div class="oc-top"><span class="oc-clock">🕙 ${hhmm(c.start, c.clock)}</span><span>Alert ${Math.min(k + 1, INC.length)} / ${INC.length}</span>${c.risky ? `<span class="oc-risky">⚠️ roke gaye: ${c.risky}</span>` : ''}</div>` +
        (c.over ? '<div class="oc-alert ok">🌅 <b>Saare alerts shaant.</b> Shift handover.</div>'
          : `<div class="oc-alert ${INC[k].sev.includes('SEV1') ? 'sev1' : 'sev2'}">📟 <b>[FIRING] ${INC[k].sev} ${INC[k].id}</b> — ${INC[k].text}
            <div class="oc-steps"><span class="${cur.fixedAt ? 'ok' : ''}">${cur.fixedAt ? '✅' : '⬜'} theek karo</span><span class="${cur.verified ? 'ok' : ''}">${cur.verified ? '✅' : '⬜'} pakka karo — ${INC[k].verifyText}</span></div></div>`) +
        `<div class="oc-done">${c.incs.map((x, i) => x.resolved ? `<span>✅ ${INC[i].id} · ${x.resolved - x.fired} min</span>` : '').join('')}</div>`;
    }
    const m = SD.oncall.mission(paint, S.id);
    if (stage.intro) arena.appendChild(el('div', 'oc-intro', stage.intro));
    arena.append(pager, sub, after);
    function finish() {
      if (finished || !last) return;
      finished = true;
      const c = last;
      const rows = c.incs.map((x, i) => `<tr><td>${INC[i].sev.split(' ')[0]} ${INC[i].id.replace(/([a-z])([A-Z])/g, '$1<wbr>$2')}</td><td>${hhmm(c.start, x.fired)}</td><td><b>${x.resolved - x.fired} min</b></td><td>${x.hints ? '💡 ' + x.hints : '—'}</td><td>${x.verified ? '✅' : '—'}</td></tr>`).join('');
      const totalHints = c.incs.reduce((a, x) => a + (x.hints || 0), 0);
      const grade = totalHints <= 1 && c.risky === 0 ? 'A' : totalHints <= 4 && c.risky <= 1 ? 'B' : 'C';
      const clean = c.incs.filter(x => !x.hints).length;
      const card = el('div', 'oc-card pop', `<div class="oc-head"><div class="oc-grade g${grade}">${grade}</div>
        <div><b>📋 Shift report card</b><br>${hhmm(c.start, 0)} – ${hhmm(c.start, c.clock)} · ${c.clock} min</div></div>
        <div class="oc-tblwrap"><table class="oc-tbl"><tr><th>Alert</th><th>Aaya</th><th>MTTR</th><th>Hints</th><th title="pakka kiya">✔</th></tr>${rows}</table></div>
        <div>⚠️ Roke gaye khatarnaak commands: <b>${c.risky}</b>${c.risky ? ' — ' + c.riskyList.map(SD.escapeHtml).join(' · ') : ' — 👏 koi nahi'}</div>
        <div class="dl-rules">Grade: A = ≤1 hint + 0 khatarnaak · B = ≤4 hints + ≤1 khatarnaak · C = baaki. Dobara khelo toh ghadi aur ginti naye sire se.</div>`);
      const again = el('button', 'btn ghost oc-again', '🔁 Shift dobara (behtar grade ke liye)');
      again.onclick = () => { arena.innerHTML = ''; renderOncall(stage, arena, onDone); };
      const next = el('button', 'btn big oc-next', 'Aage badho →');
      next.onclick = () => { next.disabled = true; again.disabled = true; onDone({ firstTry: clean, total: INC.length }); };
      SD.state.labs = SD.state.labs || { drill: {}, oncall: {}, seen: {} };
      const prev = SD.state.labs.oncall[stage.id];
      if (!prev || 'ABC'.indexOf(grade) < 'ABC'.indexOf(prev.grade) || (grade === prev.grade && c.clock < prev.mins)) { SD.state.labs.oncall[stage.id] = { grade, mins: c.clock }; SD.saveState(); }
      after.append(card, again, next);
      if (after.scrollIntoView) after.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    arena._oncall = { mission: m, sub, finish, INC };
    arena._oncall.ctl = SD.renderers.terminal(m, sub, () => finish());   // { sim, run } — validator isi se chalata hai
  };
})();
