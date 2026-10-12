/* =====================================================================
   System Gurukul — PerfSim: ek asli cost & load simulator

   Baaki Gurukul apps mein terminal ek TOOL sikhata hai (kubectl, mysql,
   kafka-topics). Yahan terminal ek SYSTEM chalata hai — tum request bhejte
   ho, load daalte ho, fault inject karte ho, aur simulator batata hai ki
   kitni rows padhi gayi, p99 kya hua, pool kitna bhara, replica kitna
   peeche hai. Har lesson ka daava yahan PROVE hota hai.

   Mission stage shape (data files mein):
   {
     type: 'terminal', title, instructions,
     goal: 'HTML — kya karna hai',
     sys: { ...SD.defaultSys() ke upar overrides... },
     responses: [ { re: /regex/, out: 'text' | fn(sim, m), mutate?: fn(sim, m) } ],
     tasks: [ { text, check(sim) -> bool } ],
     success: fn(sim) -> bool,  successText: 'HTML',
     hints: ['pehla hint', ...],
   }

   sim = {
     sys,                  // live system state (deep clone)
     history: [raw cmd..], // normalized command strings
     records: [ {...} ],   // STRUCTURED result of har command — checks isi par likho
     last,                 // aakhri record
     lastError, hintsUsed, done, stage,
   }

   Commands (poori list ke liye mission mein `help`):
     GET /path?a=b        POST /path -H 'K: V'   -n 20
     EXPLAIN <sql>        CREATE INDEX i ON t(a, b)     DROP INDEX i ON t
     SHOW INDEXES ON t    SHOW TABLES                   DESCRIBE t
     sim status | set <path> <val> | add <thing> | inject <fault> | scale | reset
     load --rps N [--duration S] [--pattern P]
     trace <request>      metrics [name]                slo
     estimate --users N --rps R --bytes B
     cursor decode <token>
   ===================================================================== */

/* =====================================================================
   DEFAULT SYSTEM — har mission isi ko deep-clone karke tweak karta hai
   ===================================================================== */
SD.defaultSys = function () {
  return {
    name: 'txn-api',
    db: {
      engine: 'postgres',
      bufferPoolMB: 512,
      replicas: 1,
      replicaLagSec: 0,
      longTxHolding: 0,        // kitne connections ek lambi transaction ne pakde hain
      tables: {
        transactions: {
          rows: 24286450,
          rowBytes: 220,
          pk: 'id',
          cols: ['id', 'user_id', 'amount', 'status', 'merchant', 'created_at'],
          indexes: [{ name: 'transactions_pkey', cols: ['id'], unique: true }],
        },
        users: {
          rows: 1200000,
          rowBytes: 180,
          pk: 'id',
          cols: ['id', 'email', 'name', 'country', 'created_at'],
          indexes: [{ name: 'users_pkey', cols: ['id'], unique: true }],
        },
      },
    },
    pool: { size: 50, acquireTimeoutMs: 10000 },
    app: { instances: 4, cpuMsPerReq: 5 },
    api: {
      pagination: 'offset',    // offset | cursor
      countTotal: true,        // response mein `total` bhejte ho? (har request par COUNT!)
      maxLimit: null,
      maxPageDepth: null,
      rateLimit: null,         // { rps, burst }
      idempotency: false,
      auth: null,              // null | 'body' (spoofable) | 'header' (token se)
      cache: null,             // { ttlSec, jitterPct, hitRate }
      admission: null,         // { maxConcurrent, queueSec }
      precomputed: false,
    },
    deps: {},                  // { name: {p50,p99,errorRate,down,timeoutMs,retry,breaker,fallback} }
    queue: null,               // { name, depth, consumers, rateHz, dlq }
    slo: { p99Ms: 200, availability: 99.9 },
    seenKeys: {},              // idempotency key -> stored response
    retryAmp: 1,               // client retry amplification (flash-crowd lesson)
  };
};

/* ---- cost constants (ms per unit) — inhi se saari kahani nikalti hai ---- */
const COST = {
  SEQ_ROW: 0.00035,      // full table scan — per row
  IDX_ENTRY: 0.00012,    // index entry walk — per entry
  PK_LOOKUP: 0.00018,    // index hit ke baad asli row uthana
  SORT_ROW: 0.00020,     // filesort — per row
  SEEK: 0.05,            // ek B-tree descent
  BASE: 3.0,             // app + network overhead
};

SD.PERFSIM_COST = COST;

/* =====================================================================
   PURE COST MODEL — renderer ke bahar, taaki tests bhi ise seedha bula sakein
   ===================================================================== */

/* buffer pool kitna table cover karta hai */
function cacheHit(sys, t) {
  const bytes = t.rows * t.rowBytes;
  return Math.min(1, (sys.db.bufferPoolMB * 1048576) / Math.max(1, bytes));
}
/* jitna table memory mein, utna sasta har row touch */
function cacheFactor(sys, t) { return 0.35 + 0.65 * (1 - cacheHit(sys, t)); }

/* Left-most prefix rule: index (a,b,c) tabhi lagta hai jab WHERE mein `a` ho. */
function bestIndex(t, whereCols, orderBy) {
  const used = whereCols.map(c => c.toLowerCase());
  let best = null;
  (t.indexes || []).forEach(def => {
    let n = 0;
    for (const col of def.cols) { if (used.includes(col.toLowerCase())) n++; else break; }
    // ORDER BY bhi prefix ke turant baad aaye toh index sorted output de deta hai
    const sorted = !!orderBy && def.cols.length > n &&
      def.cols[n].toLowerCase() === String(orderBy).toLowerCase();
    const sortedOnly = !whereCols.length && !!orderBy &&
      def.cols[0].toLowerCase() === String(orderBy).toLowerCase();
    if (n > 0 || sortedOnly) {
      const score = n * 10 + (sorted || sortedOnly ? 5 : 0);
      if (!best || score > best.score) best = { def, matched: n, sorted: sorted || sortedOnly, score };
    }
  });
  return best;
}

/* selectivity: har extra matched column ~10x narrowing (classic rule of thumb) */
function narrowed(rows, matched) {
  return Math.max(1, Math.ceil(rows / Math.pow(10, matched)));
}

/* ---------------------------------------------------------------------
   queryCost — ek query ka poora hisaab
   q = { table, whereCols[], orderBy, limit, offset, keyset, select[] , count }
   returns { ms, rowsExamined, rowsSent, plan, key, extra, notes[] }
   --------------------------------------------------------------------- */
SD.queryCost = function (sys, q) {
  const t = sys.db.tables[q.table];
  if (!t) return { ms: 0, rowsExamined: 0, rowsSent: 0, plan: 'ERROR', notes: ['table nahi mila: ' + q.table] };
  const cf = cacheFactor(sys, t);
  const limit = q.limit || 50;
  const offset = q.offset || 0;
  const whereCols = q.whereCols || [];
  const notes = [];
  const best = bestIndex(t, whereCols, q.orderBy);

  /* COUNT(*) — poore filtered set ko ginna padta hai, chahe tum 50 rows hi maango */
  if (q.count) {
    if (best) {
      const scanned = narrowed(t.rows, best.matched);
      return {
        ms: +(scanned * COST.IDX_ENTRY * cf + COST.SEEK).toFixed(2),
        rowsExamined: scanned, rowsSent: 1, plan: 'Aggregate + Index Only Scan',
        key: best.def.name, extra: 'Using index', notes,
      };
    }
    return {
      ms: +(t.rows * COST.SEQ_ROW * cf).toFixed(2),
      rowsExamined: t.rows, rowsSent: 1, plan: 'Aggregate + Seq Scan', key: null,
      extra: 'Parallel Seq Scan', notes: ['COUNT(*) filter ke baad ki SAARI rows ginta hai — LIMIT isse nahi rokta'],
    };
  }

  /* --- KEYSET / CURSOR: WHERE (created_at, id) < (?, ?) ORDER BY ... LIMIT n --- */
  if (q.keyset) {
    if (!best || !best.sorted) {
      notes.push('Keyset ke liye (filter…, sort_col, tiebreak_id) wala index chahiye — warna phir bhi sort karna padega.');
      return {
        ms: +(t.rows * COST.SEQ_ROW * cf + t.rows * COST.SORT_ROW).toFixed(2),
        rowsExamined: t.rows, rowsSent: limit, plan: 'Seq Scan + Sort', key: null, extra: 'Sort Method: external merge', notes,
      };
    }
    const ms = COST.SEEK + limit * (COST.IDX_ENTRY + COST.PK_LOOKUP) * cf;
    notes.push('Index par ek SEEK, phir sirf ' + limit + ' entries. Page 1 ho ya page 4,85,728 — cost same.');
    return {
      ms: +ms.toFixed(2), rowsExamined: limit, rowsSent: limit,
      plan: 'Index Scan (seek)', key: best.def.name, extra: 'Using index condition', notes,
    };
  }

  /* --- OFFSET: database ko offset+limit rows PADHNI aur PHENKNI padti hain --- */
  const need = offset + limit;

  if (best && (best.matched > 0 || best.sorted)) {
    const universe = best.matched > 0 ? narrowed(t.rows, best.matched) : t.rows;
    const walked = Math.min(universe, need);
    const covering = (q.select || []).length > 0 &&
      q.select.every(c => c === '*' ? false : best.def.cols.some(dc => dc.toLowerCase() === c.toLowerCase()));
    let ms = COST.SEEK + walked * COST.IDX_ENTRY * cf;
    if (!covering) ms += walked * COST.PK_LOOKUP * cf;
    if (!best.sorted && q.orderBy) { ms += walked * COST.SORT_ROW; notes.push('Index sort order nahi deta — ' + fmt(walked) + ' rows ko sort karna pada.'); }
    if (offset > 1000) {
      notes.push('OFFSET ' + fmt(offset) + ' → index par ' + fmt(walked) + ' entries WALK ki gayi aur PHENK di gayi. ' +
        'Index skip nahi kar sakta, sirf tez walk karta hai.');
    }
    return {
      ms: +ms.toFixed(2), rowsExamined: walked, rowsSent: Math.min(limit, Math.max(0, universe - offset)),
      plan: covering ? 'Index Only Scan' : 'Index Scan', key: best.def.name,
      extra: covering ? 'Using index' : 'Using index condition', notes,
    };
  }

  /* --- koi index nahi laga --- */
  let ms = t.rows * COST.SEQ_ROW * cf;
  if (q.orderBy) ms += t.rows * COST.SORT_ROW;
  const stranded = whereCols.find(cn =>
    (t.indexes || []).some(d => d.cols.length > 1 && d.cols.slice(1).some(dc => dc.toLowerCase() === cn.toLowerCase())));
  if (stranded) {
    const def = (t.indexes || []).find(d => d.cols.slice(1).some(dc => dc.toLowerCase() === stranded.toLowerCase()));
    notes.push("'" + stranded + "' index '" + def.name + ' (' + def.cols.join(', ') + ")' ke ANDAR toh hai — par LEADING column nahi. " +
      'LEFT-MOST PREFIX rule: index tabhi lagta hai jab ' + def.cols[0] + ' par bhi filter ho.');
  }
  return {
    ms: +ms.toFixed(2), rowsExamined: t.rows, rowsSent: Math.min(limit, t.rows),
    plan: 'Seq Scan' + (q.orderBy ? ' + Sort' : ''), key: null,
    extra: q.orderBy ? 'Sort Method: external merge Disk' : 'Filter', notes,
  };
};

/* ---------------------------------------------------------------------
   depCost — ek downstream call: timeout, retry, breaker, fallback ke saath
   --------------------------------------------------------------------- */
SD.depCost = function (sys, name, opts) {
  const d = sys.deps[name];
  if (!d) return { ms: 0, ok: true, note: null };
  const o = opts || {};
  const failing = d.down || Math.random() < 0 /* deterministic: errorRate neeche use hota hai */;
  const breaker = d.breaker;

  if (breaker && d.breakerState === 'open') {
    return { ms: 1, ok: !!d.fallback, note: 'circuit OPEN — fail fast (1ms)' + (d.fallback ? ', fallback bheja' : ''), shortCircuit: true };
  }
  let latency = d.down ? (d.timeoutMs || 30000) : d.p99;
  let ok = !d.down && d.errorRate < 0.5;
  let note = null;
  const attempts = d.retry ? 1 + d.retry.max : 1;
  if (d.timeoutMs && latency > d.timeoutMs) { latency = d.timeoutMs; ok = false; note = 'timeout ' + d.timeoutMs + 'ms par kaata'; }
  let total = latency;
  if (!ok && d.retry) {
    total = latency * attempts;
    if (d.retry.backoff === 'exp') {
      let wait = d.retry.baseMs || 100;
      for (let i = 1; i < attempts; i++) { total += wait; wait *= 2; }
      note = (note ? note + '; ' : '') + attempts + ' attempts, exponential backoff';
    } else {
      total += (attempts - 1) * (d.retry.baseMs || 100);
      note = (note ? note + '; ' : '') + attempts + ' attempts, fixed backoff';
    }
  }
  const failed = !ok;                       // ASLI downstream call ka natija
  if (!ok && d.fallback) { ok = true; note = (note ? note + '; ' : '') + 'fallback: ' + d.fallback; }
  return { ms: Math.round(total), ok, failed, note, attempts };
};

/* ---------------------------------------------------------------------
   loadResult — Little's Law + saturation. Ek load run ka poora hisaab.
   --------------------------------------------------------------------- */
SD.loadRun = function (sys, opts) {
  const rps = opts.rps;
  const duration = opts.duration || 10;
  const serviceMs = opts.serviceMs;                   // ek request ka DB+dep time
  const appMs = sys.app.cpuMsPerReq;
  const holds = sys.db.longTxHolding || 0;
  const effPool = Math.max(1, sys.pool.size - holds);  // leaked / lambi tx ne jo pakad rakhe hain
  const capacity = effPool * (1000 / Math.max(0.01, serviceMs));   // rps jo pool sambhal sakta hai
  const buckets = [];
  let backlog = 0;
  let totalErr = 0, totalReq = 0;
  let amp = sys.retryAmp || 1;

  for (let s = 1; s <= duration; s++) {
    const offered = rps * amp;
    const admitted = sys.api.admission ? Math.min(offered, sys.api.admission.maxConcurrent) : offered;
    const served = Math.min(admitted + backlog, capacity);
    backlog = Math.max(0, admitted + backlog - capacity);
    const rho = admitted / capacity;
    /* pool wait: ρ<1 par chhota (M/M/c), ρ≥1 par backlog/capacity — yahi asli drama hai */
    let waitMs;
    if (rho < 1) {
      const expo = Math.sqrt(2 * (effPool + 1)) - 1;
      waitMs = serviceMs * Math.pow(rho, expo) / Math.max(0.001, effPool * (1 - rho));
    } else {
      waitMs = (backlog / Math.max(0.01, capacity)) * 1000;
    }
    const timedOut = waitMs >= sys.pool.acquireTimeoutMs;
    if (timedOut) waitMs = sys.pool.acquireTimeoutMs;
    const p50 = Math.round(appMs + serviceMs + waitMs * 0.3);
    const p99 = Math.round(appMs + serviceMs * 1.35 + waitMs);
    const errPct = timedOut ? Math.min(100, Math.round((1 - capacity / admitted) * 100)) : 0;
    const queued = sys.api.admission ? Math.max(0, Math.round(offered - admitted)) : 0;
    totalErr += (errPct / 100) * admitted; totalReq += offered;
    buckets.push({
      s, offered: Math.round(offered), served: Math.round(served),
      p50, p99, waitMs: Math.round(waitMs),
      poolUsed: Math.min(effPool, Math.round(admitted * serviceMs / 1000)), poolSize: effPool,
      backlog: Math.round(backlog), errPct, queued,
    });
    /* errors → clients retry karte hain → load aur badhta hai (retry storm) */
    if (errPct > 0 && opts.clientRetries) amp = Math.min(3, amp * 1.25);
  }
  const maxWait = Math.max(...buckets.map(b => b.waitMs));
  /* Admission control ka POORA maksad yahi hai: offered load capacity se upar ho
     sakta hai, par ANDAR utna hi aata hai jitna system sambhaal sakta hai.
     Isliye saturation offered par nahi, ADMITTED par naapa jaata hai — warna
     waiting room lagane ke baad bhi system "saturated" dikhta rehta, jo galat hai. */
  const offered = rps * (sys.retryAmp || 1);
  const admittedRps = sys.api.admission ? Math.min(offered, sys.api.admission.maxConcurrent) : offered;
  return {
    buckets, capacity: Math.round(capacity), effPool, serviceMs, maxWait,
    offeredRps: Math.round(offered), admittedRps: Math.round(admittedRps),
    queuedRps: Math.round(offered - admittedRps),
    rho: +(admittedRps / capacity).toFixed(2),
    errPct: totalReq ? +(100 * totalErr / totalReq).toFixed(1) : 0,
    /* saturated = ρ ≥ 1 (queue badh rahi hai), sirf error aane par nahi.
       Pool exhaustion pehle DHEEMA karta hai, phir maarta hai. */
    saturated: buckets.some(b => b.errPct > 0) || admittedRps >= capacity,
    replicaLagSec: opts.writeHeavy ? Math.round(Math.max(0, rps - capacity) / 20) : sys.db.replicaLagSec,
  };
};

/* ---------- chhote formatters ---------- */
function fmt(n) {
  if (n == null) return '—';
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function ms(n) {
  if (n == null) return '—';
  if (n >= 1000) return (n / 1000).toFixed(2) + ' s';
  if (n >= 10) return Math.round(n) + ' ms';
  return (+n).toFixed(1) + ' ms';
}
function bar(v, max, w) {
  const n = Math.max(0, Math.min(w, Math.round((v / (max || 1)) * w)));
  return '█'.repeat(n) + '·'.repeat(w - n);
}
function bytes(n) {
  const u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let i = 0; let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return (v >= 100 ? v.toFixed(0) : v.toFixed(1)) + ' ' + u[i];
}
SD.perfFmt = { fmt, ms, bar, bytes };

/* =====================================================================
   TERMINAL RENDERER — sim ko UI se jodta hai
   ===================================================================== */
function deepMerge(base, over) {
  if (!over) return base;
  Object.keys(over).forEach(k => {
    const b = base[k], o = over[k];
    if (o && typeof o === 'object' && !Array.isArray(o) && b && typeof b === 'object' && !Array.isArray(b)) deepMerge(b, o);
    else base[k] = (o && typeof o === 'object') ? JSON.parse(JSON.stringify(o)) : o;
  });
  return base;
}

/* "--rps 500 --pattern deep-page" -> { rps:'500', pattern:'deep-page', _:[...] } */
function parseFlags(str) {
  const out = { _: [] };
  const toks = String(str).match(/'[^']*'|"[^"]*"|\S+/g) || [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.startsWith('--')) {
      const key = t.slice(2);
      const nx = toks[i + 1];
      if (nx && !nx.startsWith('--')) { out[key] = nx.replace(/^['"]|['"]$/g, ''); i++; }
      else out[key] = true;
    } else if (/^-[a-zA-Z]$/.test(t)) {
      const nx = toks[i + 1];
      out[t.slice(1)] = nx ? nx.replace(/^['"]|['"]$/g, '') : true; i++;
    } else out._.push(t.replace(/^['"]|['"]$/g, ''));
  }
  return out;
}

SD.renderers.terminal = function renderTerminal(stage, arena, onDone) {
  const sim = {
    /* NOTE: agar mission apne db.tables deta hai toh default tables (transactions/users)
       poori tarah REPLACE hote hain — merge nahi. Warna har mission mein 24M-row
       transactions table chupke se ghus jaati aur `load` galat table pakad leta. */
    sys: (function () {
      const base = deepMerge(SD.defaultSys(), stage.sys);
      if (stage.sys && stage.sys.db && stage.sys.db.tables) {
        base.db.tables = JSON.parse(JSON.stringify(stage.sys.db.tables));
      }
      return base;
    })(),
    history: [],
    records: [],
    last: null,
    lastError: null,
    hintsUsed: 0,
    done: false,
    stage,
  };
  sim.responses = stage.responses || [];
  sim.rl = { tokens: 0, at: 0 };   // rate-limit bucket

  /* ---------- UI ---------- */
  const goalBox = SD.el('div', 'term-goal');
  goalBox.innerHTML = `<h4>🎯 Mission</h4><div>${stage.goal}</div>`;
  const taskList = SD.el('ul', 'term-tasks');
  (stage.tasks || []).forEach(t => taskList.appendChild(SD.el('li', '', t.text)));
  if (stage.tasks) goalBox.appendChild(taskList);

  const term = SD.el('div', 'terminal');
  term.innerHTML = `
    <div class="term-bar">
      <span class="dot" style="background:#f87171"></span>
      <span class="dot" style="background:#ffb347"></span>
      <span class="dot" style="background:#34d399"></span>
      <span>&nbsp;dev@sysgurukul — ${sim.sys.name} (perfsim)</span>
    </div>
    <div class="term-out"></div>
    <div class="term-in"><span class="ps1">$</span><input type="text" autocomplete="off"
      spellcheck="false" placeholder="GET /api/v1/transactions?page=1&amp;limit=50    (madad: help)"></div>`;
  const out = term.querySelector('.term-out');
  const input = term.querySelector('input');

  const btns = SD.el('div', 'term-btns');
  const hintBtn = SD.el('button', 'btn small ghost', `💡 Hint (−${SD.HINT_COST} XP)`);
  hintBtn.onclick = () => giveHint();
  btns.appendChild(hintBtn);

  arena.append(goalBox, term, btns);
  print('sys', `perfsim ready — service '${sim.sys.name}'. 'help' se saare commands, 'sim status' se system ka haal.`);
  setTimeout(() => input.focus(), 100);

  const cmdHistory = [];
  let histIdx = -1;
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const raw = input.value.trim();
      input.value = '';
      if (raw) { cmdHistory.push(raw); histIdx = cmdHistory.length; run(raw); }
    } else if (e.key === 'ArrowUp') {
      if (histIdx > 0) { histIdx--; input.value = cmdHistory[histIdx] || ''; }
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      if (histIdx < cmdHistory.length) { histIdx++; input.value = cmdHistory[histIdx] || ''; }
      e.preventDefault();
    }
  });

  function print(kind, text) {
    const div = SD.el('div', 't-' + kind);
    div.textContent = text;
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
  }
  function giveHint() {
    const hints = stage.hints || [];
    if (sim.hintsUsed >= hints.length) { print('hint', '💡 Aur hints nahi hain — tum kar sakte ho!'); return; }
    print('hint', `💡 Hint ${sim.hintsUsed + 1}: ${hints[sim.hintsUsed]}`);
    sim.hintsUsed++;
  }
  function err(msg) { const e = new Error(msg); e.simerr = true; throw e; }
  function rec(r) { r.cmd = sim.history[sim.history.length - 1]; sim.records.push(r); sim.last = r; return r; }

  /* ASCII table printer */
  function table(head, rows) {
    const w = head.map((h, i) => Math.max(String(h).length, ...rows.map(r => String(r[i] == null ? '—' : r[i]).length)));
    const line = (l, m, rr) => l + w.map(n => '─'.repeat(n + 2)).join(m) + rr;
    const row = cells => '│ ' + cells.map((c, i) => String(c == null ? '—' : c).padEnd(w[i])).join(' │ ') + ' │';
    print('ok', [line('┌', '┬', '┐'), row(head), line('├', '┼', '┤'), ...rows.map(row), line('└', '┴', '┘')].join('\n'));
  }
  /* box with a title — cost panels ke liye */
  function panel(title, lines) {
    const width = Math.max(title.length + 4, ...lines.map(l => l.length)) + 2;
    const top = '┌─ ' + title + ' ' + '─'.repeat(Math.max(1, width - title.length - 3)) + '┐';
    const bot = '└' + '─'.repeat(width) + '┘';
    print('ok', [top, ...lines.map(l => '│ ' + l.padEnd(width - 2) + ' │'), bot].join('\n'));
  }

  /* ---------- checks after every command ---------- */
  function refresh() {
    if (stage.tasks) {
      stage.tasks.forEach((t, i) => {
        if (t.check && t.check(sim)) taskList.children[i].classList.add('done');
      });
    }
    if (!sim.done && stage.success && stage.success(sim)) {
      sim.done = true;
      input.disabled = true;
      const xp = Math.max(10, SD.TERMINAL_XP - sim.hintsUsed * SD.HINT_COST);
      SD.addXP(xp);
      const win = SD.el('div', 'stage-summary pop');
      win.innerHTML = `
        <div class="sum-emoji">🎉</div>
        <div class="sum-title">Mission complete! +${xp} XP${sim.hintsUsed ? ` (${sim.hintsUsed} hint use hue)` : ' — bina hint ke! 🔥'}</div>
        <div class="sum-detail" style="text-align:left;line-height:1.6;margin-top:8px">${stage.successText || ''}</div>`;
      arena.appendChild(win);
      win.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => onDone({ firstTry: sim.hintsUsed === 0 ? 1 : 0, total: 1 }), 300);
    }
  }

  function run(raw) {
    print('cmd', raw);
    if (sim.done) return;
    const norm = raw.replace(/\s+/g, ' ').trim().replace(/;+$/, '');
    sim.history.push(norm);
    sim.lastError = null;
    try { exec(norm); }
    catch (e) {
      if (e.simerr) { sim.lastError = e.message; print('err', e.message); }
      else { console.error('perfsim error:', e); print('err', `simulator error: ${e.message} — 'help' dekho`); }
    }
    refresh();
  }

  /* =====================================================================
     HTTP — request ek query ban-ta hai, aur query ki keemat dikhti hai
     ===================================================================== */
  const PAGING_PARAMS = ['page', 'limit', 'per_page', 'cursor', 'after', 'before', 'offset', 'sort', 'order', 'fields', 'expand'];

  function route(method, path) {
    const segs = path.split('?')[0].split('/').filter(Boolean).filter(s => s !== 'api' && !/^v\d+$/.test(s));
    const resource = segs[0] || '';
    const id = segs[1] || null;
    const map = sim.sys.api.tableFor || {};
    const tableName = map[resource] || resource;
    return { resource, id, tableName, table: sim.sys.db.tables[tableName], kind: id ? 'detail' : 'list' };
  }

  function cmdHttp(cmd) {
    const m = cmd.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(\S+)(.*)$/i);
    if (!m) err("400 — request aise likho:  GET /api/v1/transactions?page=1&limit=50");
    const method = m[1].toUpperCase();
    const url = m[2];
    const flags = parseFlags(m[3] || '');
    const headers = {};
    [].concat(flags.H || [], flags.header || []).forEach(h => {
      const hm = String(h).match(/^([^:]+):\s*(.*)$/);
      if (hm) headers[hm[1].trim().toLowerCase()] = hm[2].trim();
    });
    const repeat = Math.max(1, parseInt(flags.n, 10) || 1);
    const qs = {};
    (url.split('?')[1] || '').split('&').filter(Boolean).forEach(kv => {
      const [k, v] = kv.split('=');
      qs[decodeURIComponent(k)] = decodeURIComponent(v == null ? '' : v);
    });
    const api = sim.sys.api;

    /* ---- /health hamesha sasta hai — yahi uska poora sabak hai ---- */
    if (/^\/health/.test(url)) {
      print('ok', 'HTTP/1.1 200 OK\n\n{ "status": "ok" }');
      print('sys', `⚠️ Yeh check sirf itna kehta hai: "process zinda hai". Isne na DB connection liya, ` +
        `na koi dependency chhui. Isiliye pool khatam hone par bhi health GREEN rehta hai.`);
      return rec({ kind: 'health', status: 200 });
    }

    /* ---- rate limiting ---- */
    if (api.rateLimit) {
      const cap = api.rateLimit.burst || api.rateLimit.rps;
      sim.rl.tokens = Math.min(cap, sim.rl.tokens + api.rateLimit.rps);   // har command = ~1 second
      if (repeat > sim.rl.tokens) {
        const allowed = Math.floor(sim.rl.tokens);
        sim.rl.tokens = 0;
        print('ok', `${allowed} × HTTP/1.1 200 OK`);
        print('err', `${repeat - allowed} × HTTP/1.1 429 Too Many Requests\n` +
          `retry-after: 1\nx-ratelimit-limit: ${api.rateLimit.rps}\nx-ratelimit-remaining: 0\n\n` +
          `{ "type": "/errors/rate-limited", "title": "Too Many Requests", "status": 429 }`);
        print('sys', `🛡️ Token bucket: ${api.rateLimit.rps} rps refill, burst ${cap}. ` +
          `429 ke saath Retry-After bhejna ZAROORI hai — warna client turant dobara maarega aur storm ban jaayega.`);
        return rec({ kind: 'http', method, path: url, status: 429, allowed, blocked: repeat - allowed, rateLimited: true });
      }
      sim.rl.tokens -= repeat;
    }

    /* ---- auth: identity kahan se aa rahi hai ---- */
    const who = authCheck(method, url, qs, headers);
    if (who && who.deny) {
      return rec({ kind: 'http', method, path: url, status: who.status, auth: 'header',
                   denied: who.reason, actedAs: who.actedAs || null, claimed: who.claimed || null });
    }

    /* ---- idempotency (POST) ---- */
    if (method === 'POST' && api.idempotency) {
      const key = headers['idempotency-key'];
      if (!key) {
        print('err', `HTTP/1.1 400 Bad Request\n\n{ "type": "/errors/missing-idempotency-key", "title": "Idempotency-Key header chahiye", "status": 400 }`);
        return rec({ kind: 'http', method, path: url, status: 400, idem: 'missing' });
      }
      if (sim.sys.seenKeys[key]) {
        print('ok', `HTTP/1.1 200 OK\nx-idempotent-replay: true\n\n${JSON.stringify(sim.sys.seenKeys[key])}`);
        print('sys', `♻️ Wahi key phir se aayi — naya charge NAHI hua, pehle wala jawab lauta diya. ` +
          `Yahi idempotency hai: "N baar bhejo, asar ek hi baar".`);
        return rec({ kind: 'http', method, path: url, status: 200, idem: 'replay', key });
      }
      const body = { id: 'pay_' + (Object.keys(sim.sys.seenKeys).length + 1001), status: 'captured', amount: qs.amount || 4999 };
      sim.sys.seenKeys[key] = body;
      print('ok', `HTTP/1.1 201 Created\nlocation: /v1/payments/${body.id}\n\n${JSON.stringify(body)}`);
      return rec({ kind: 'http', method, path: url, status: 201, idem: 'new', key });
    }
    if (method === 'POST' && !api.idempotency) {
      const body = { id: 'pay_' + (sim.records.filter(r => r.kind === 'http' && r.method === 'POST').length + 1001), status: 'captured' };
      print('ok', `HTTP/1.1 201 Created\n\n${JSON.stringify(body)}`);
      if (headers['idempotency-key']) {
        print('sys', `⚠️ Tumne Idempotency-Key bheja — par server use dekh hi nahi raha (api.idempotency = false). ` +
          `Retry par DOOSRA charge ban gaya. Yeh production ka classic double-charge bug hai.`);
      }
      return rec({ kind: 'http', method, path: url, status: 201, idem: 'ignored', key: headers['idempotency-key'] || null });
    }

    /* ---- list / detail reads ---- */
    const r = route(method, url);
    if (!r.table) {
      print('err', `HTTP/1.1 404 Not Found\n\n{ "type": "/errors/not-found", "title": "aisa resource nahi: /${r.resource}", "status": 404 }`);
      return rec({ kind: 'http', method, path: url, status: 404 });
    }

    const limit = Math.min(1000, parseInt(qs.limit || qs.per_page, 10) || 50);
    const hasCursor = qs.cursor != null || qs.after != null;
    const page = parseInt(qs.page, 10) || (qs.offset != null ? Math.floor(parseInt(qs.offset, 10) / limit) + 1 : 1);
    const offset = qs.offset != null ? parseInt(qs.offset, 10) : (page - 1) * limit;

    /* --- contract guards: yahi API design ka asli kaam hai --- */
    if (api.maxLimit && limit > api.maxLimit) {
      print('err', `HTTP/1.1 400 Bad Request\n\n{ "type": "/errors/limit-too-large", "title": "limit max ${api.maxLimit} ho sakta hai", "status": 400, "max_limit": ${api.maxLimit} }`);
      print('sys', `🛡️ Bina max ke, koi bhi ?limit=1000000 maang ke DB ko gira sakta hai.`);
      return rec({ kind: 'http', method, path: url, status: 400, guard: 'maxLimit' });
    }
    if (api.pagination === 'cursor' && qs.page != null) {
      print('err', `HTTP/1.1 400 Bad Request\n\n{ "type": "/errors/unsupported-param", "title": "page support nahi hai — cursor use karo", "status": 400 }`);
      print('sys', `✅ Ab API user ko mehenga sawaal poochhne hi nahi de rahi. Sabse achha optimization: ` +
        `woh query jo kabhi chali hi nahi.`);
      return rec({ kind: 'http', method, path: url, status: 400, guard: 'noPage' });
    }
    if (api.maxPageDepth && page > api.maxPageDepth) {
      print('err', `HTTP/1.1 400 Bad Request\n\n{ "type": "/errors/page-too-deep", "title": "page ${fmt(page)} bahut gehra hai (max ${fmt(api.maxPageDepth)})", "status": 400, "hint": "filter lagao ya export API use karo" }`);
      print('sys', `🛡️ Legacy offset API ke liye max page depth ek achhi bandage hai — poora cursor migration hone tak.`);
      return rec({ kind: 'http', method, path: url, status: 400, guard: 'maxDepth', page });
    }

    /* --- cache --- */
    if (api.cache && r.kind === 'list') {
      const hit = api.cache.hitRate == null ? 0.9 : api.cache.hitRate;
      if (hit >= 1 || (sim.records.filter(x => x.kind === 'http' && x.path === url).length > 0 && hit > 0)) {
        print('ok', `HTTP/1.1 200 OK\nx-cache: HIT\nage: 12\n\n{ "data": [ ${limit} items ] }`);
        panel('COST', ['cache HIT — DB tak gaya hi nahi', 'total           ~1.2 ms']);
        return rec({ kind: 'http', method, path: url, status: 200, cache: 'HIT', p99: 2, rowsExamined: 0 });
      }
    }

    /* --- query banao --- */
    const built = buildQuery(r, qs, { limit, offset, hasCursor });
    const { whereCols, sortCol, keyset, q } = built;
    const cost = SD.queryCost(sim.sys, q);
    let totalMs = cost.ms + COST.BASE + sim.sys.app.cpuMsPerReq;
    let countCost = null;
    if (r.kind === 'list' && api.countTotal && !keyset) {
      countCost = SD.queryCost(sim.sys, { table: r.tableName, whereCols, count: true });
      totalMs += countCost.ms;
    }
    /* downstream calls */
    let depMs = 0; const depNotes = [];
    Object.keys(sim.sys.deps).forEach(dn => {
      const d = sim.sys.deps[dn];
      if (d.calledBy && d.calledBy !== r.resource) return;
      const dc = SD.depCost(sim.sys, dn);
      depMs += dc.ms;
      if (dc.note) depNotes.push(`${dn}: ${dc.note}`);
      /* --- breaker ki state machine: user ise trip hote DEKHE --- */
      if (d.breaker) {
        if (dc.shortCircuit) {
          d._openCalls = (d._openCalls || 0) + 1;
          if (d._openCalls >= 5) {                       // thodi der baad ek test request
            d.breakerState = 'half-open'; d._openCalls = 0;
            depNotes.push(`${dn}: circuit HALF-OPEN — ek test request jaane de rahe hain`);
          }
        } else if (dc.failed) {
          d._fails = (d._fails || 0) + 1;
          if (d.breakerState === 'half-open') {
            d.breakerState = 'open'; d._openCalls = 0;
            depNotes.push(`${dn}: test request bhi fail — circuit wapas OPEN`);
          } else if (d._fails >= (d.breaker.minCalls || 4)) {
            d.breakerState = 'open'; d._fails = 0;
            depNotes.push(`${dn}: ⚡ CIRCUIT OPEN — ${d.breaker.minCalls || 4} lagataar fail. ` +
              `Ab calls 1ms mein fail hongi, 30s tak koi request downstream nahi jaayegi.`);
          }
        } else {
          d._fails = 0;
          if (d.breakerState === 'half-open') { d.breakerState = 'closed'; depNotes.push(`${dn}: test request pass — circuit CLOSED, sab normal`); }
        }
      }
    });
    totalMs += depMs;
    const p99 = Math.round(totalMs * 1.35);

    /* --- response --- */
    const t = r.table;
    if (r.kind === 'detail') {
      print('ok', `HTTP/1.1 200 OK\n\n{ "id": "${r.id}", "amount": 4999, "status": "captured" }`);
    } else if (keyset) {
      const tok = btoaSafe(JSON.stringify({ t: '2026-04-11T09:22:04Z', id: 8812304, d: 'desc' }));
      print('ok', `HTTP/1.1 200 OK\nlink: </api/v1/${r.resource}?cursor=${tok}&limit=${limit}>; rel="next"\n\n` +
        `{ "data": [ ${cost.rowsSent} items ], "next_cursor": "${tok}", "has_more": true }`);
    } else {
      const total = api.countTotal ? `, "total": ${t.rows}` : '';
      print('ok', `HTTP/1.1 200 OK\n\n{ "data": [ ${cost.rowsSent} items ], "page": ${page}, "limit": ${limit}${total} }`);
    }

    /* --- cost panel: yahi is app ka dil hai --- */
    const sqlLine = r.kind === 'detail'
      ? `SELECT * FROM ${r.tableName} WHERE ${t.pk} = '${r.id}'`
      : keyset
        ? `SELECT * FROM ${r.tableName}${whereCols.length ? ' WHERE ' + whereCols.map(c => c + ' = ?').join(' AND ') : ''}\n  AND (${sortCol}, ${t.pk}) < (?, ?) ORDER BY ${sortCol} DESC, ${t.pk} DESC LIMIT ${limit}`
        : `SELECT * FROM ${r.tableName}${whereCols.length ? ' WHERE ' + whereCols.map(c => c + ' = ?').join(' AND ') : ''}\n  ORDER BY ${sortCol} DESC LIMIT ${limit} OFFSET ${fmt(offset)}`;
    const hitPct = (cacheHit(sim.sys, t) * 100).toFixed(1);
    const lines = [];
    sqlLine.split('\n').forEach(l => lines.push(l));
    lines.push('');
    lines.push('plan            ' + cost.plan);
    lines.push('index used      ' + (cost.key || '— (koi index nahi laga)'));
    lines.push('rows examined   ' + fmt(cost.rowsExamined) + (cost.rowsExamined > cost.rowsSent * 4 ? '   ← sirf ' + cost.rowsSent + ' chahiye the' : ''));
    lines.push('rows sent       ' + fmt(cost.rowsSent));
    lines.push('buffer cache    ' + hitPct + '% table memory mein');
    lines.push('db time         ' + ms(cost.ms));
    if (countCost) lines.push('+ COUNT(*)      ' + ms(countCost.ms) + '   ← `total` field ki keemat');
    if (depMs) lines.push('+ downstream    ' + ms(depMs));
    lines.push('─'.repeat(40));
    const slo = sim.sys.slo.p99Ms;
    const verdict = p99 <= slo ? '✅ SLO ke andar' : `🔥 SLO (${slo}ms) se ${(p99 / slo).toFixed(0)}x zyada`;
    lines.push('total           ' + ms(totalMs) + '    p99 ' + ms(p99) + '   ' + verdict);
    panel('QUERY PLAN & COST', lines);
    cost.notes.forEach(n => print('sys', '💡 ' + n));
    if (countCost) countCost.notes.forEach(n => print('sys', '💡 ' + n));
    depNotes.forEach(n => print('sys', '🔌 ' + n));

    return rec({
      kind: 'http', method, path: url, status: 200, resource: r.resource,
      page, limit, offset, keyset, cursor: keyset,
      rowsExamined: cost.rowsExamined + (countCost ? countCost.rowsExamined : 0),
      rowsSent: cost.rowsSent, plan: cost.plan, indexUsed: cost.key,
      ms: +totalMs.toFixed(2), p99, countTotal: !!countCost, cache: 'MISS',
      auth: sim.sys.api.auth || 'none',
      actedAs: who ? (who.actedAs || null) : null,
      claimed: who ? (who.claimed || null) : (qs.user_id != null ? String(qs.user_id) : null),
      spoofable: who ? !!who.spoofable : (qs.user_id != null),
    });
  }

  /* URL ke query-params se ek DB query banao — cmdHttp aur `load --path` dono isi ko use karte hain */
  function buildQuery(r, qs, o) {
    const api = sim.sys.api;
    const whereCols = Object.keys(qs).filter(k => !PAGING_PARAMS.includes(k))
      .filter(k => (r.table.cols || []).includes(k));
    const sortCol = qs.sort ? String(qs.sort).replace(/^-/, '')
      : (r.kind === 'list' ? (api.defaultSort || 'created_at') : null);
    const keyset = r.kind === 'list' && (o.hasCursor || api.pagination === 'cursor');
    const q = r.kind === 'detail'
      ? { table: r.tableName, whereCols: [r.table.pk], limit: 1, offset: 0 }
      : { table: r.tableName, whereCols, orderBy: sortCol, limit: o.limit, offset: o.offset,
          keyset, select: qs.fields ? qs.fields.split(',') : ['*'] };
    return { whereCols, sortCol, keyset, q };
  }

  /* ek URL string -> { serviceMs, label } — load ke liye */
  function serviceMsForUrl(url) {
    const qs = {};
    (url.split('?')[1] || '').split('&').filter(Boolean).forEach(kv => {
      const [k, v] = kv.split('=');
      qs[decodeURIComponent(k)] = decodeURIComponent(v == null ? '' : v);
    });
    const r = route('GET', url);
    if (!r.table) err(`400 — '${url}' ka resource is system mein nahi hai`);
    const limit = Math.min(1000, parseInt(qs.limit || qs.per_page, 10) || 50);
    const page = parseInt(qs.page, 10) || 1;
    const offset = qs.offset != null ? parseInt(qs.offset, 10) : (page - 1) * limit;
    const b = buildQuery(r, qs, { limit, offset, hasCursor: qs.cursor != null || qs.after != null });
    let msTotal = SD.queryCost(sim.sys, b.q).ms;
    if (r.kind === 'list' && sim.sys.api.countTotal && !b.keyset) {
      msTotal += SD.queryCost(sim.sys, { table: r.tableName, whereCols: b.whereCols, count: true }).ms;
    }
    return msTotal;
  }

  function btoaSafe(s) {
    try { return (typeof btoa === 'function' ? btoa(s) : Buffer.from(s).toString('base64')).replace(/=+$/, ''); }
    catch (e) { return 'eyJ0IjoiMjAyNi0wNC0xMSJ9'; }
  }

  /* =====================================================================
     EXPLAIN + INDEX — SQL syntax nahi sikha rahe, PLAN padhna sikha rahe hain
     ===================================================================== */
  function parseSQL(sql) {
    const s = sql.replace(/\s+/g, ' ').trim();
    const from = s.match(/\bFROM\s+([A-Za-z_][\w]*)/i);
    if (!from) err('400 — EXPLAIN ke baad ek SELECT ... FROM <table> chahiye');
    const tableName = from[1];
    const where = s.match(/\bWHERE\s+(.*?)(?:\bGROUP\b|\bORDER\b|\bLIMIT\b|$)/i);
    const t = sim.sys.db.tables[tableName];
    if (!t) err(`400 — table '${tableName}' is system mein nahi hai. 'show tables' dekho.`);
    const whereCols = [];
    if (where) {
      const body = where[1];
      (body.match(/[A-Za-z_][\w]*(?=\s*(?:=|>|<|>=|<=|!=|\bIN\b|\bLIKE\b|\bBETWEEN\b))/gi) || [])
        .forEach(c => { if ((t.cols || []).includes(c.toLowerCase())) whereCols.push(c.toLowerCase()); });
      /* keyset: WHERE (created_at, id) < (?, ?) */
      const tup = body.match(/\(\s*([\w,\s]+?)\s*\)\s*[<>]\s*\(/);
      if (tup) tup[1].split(',').map(x => x.trim().toLowerCase())
        .forEach(c => { if ((t.cols || []).includes(c) && !whereCols.includes(c)) whereCols.push(c); });
    }
    const ob = s.match(/\bORDER\s+BY\s+([A-Za-z_][\w]*)/i);
    const lim = s.match(/\bLIMIT\s+(\d+)/i);
    const off = s.match(/\bOFFSET\s+(\d+)/i);
    const sel = s.match(/^\s*SELECT\s+(.*?)\s+FROM/i);
    const isCount = /COUNT\s*\(/i.test(s);
    const keyset = /\(\s*[\w,\s]+\)\s*[<>]\s*\(/.test(s);
    return {
      table: tableName, whereCols, orderBy: ob ? ob[1].toLowerCase() : null,
      limit: lim ? +lim[1] : 50, offset: off ? +off[1] : 0, count: isCount, keyset,
      select: sel ? sel[1].split(',').map(x => x.trim().toLowerCase()) : ['*'],
    };
  }

  function cmdExplain(cmd) {
    const sql = cmd.replace(/^explain\s+(analyze\s+)?/i, '').replace(/^['"]|['"]$/g, '');
    const q = parseSQL(sql);
    const cost = SD.queryCost(sim.sys, q);
    const t = sim.sys.db.tables[q.table];
    table(['Node', 'Index', 'Rows examined', 'Rows out', 'Actual time', 'Extra'],
      [[cost.plan, cost.key || '—', fmt(cost.rowsExamined), fmt(cost.rowsSent), ms(cost.ms), cost.extra || '—']]);
    if (!cost.key) {
      print('sys', `🐌 Seq Scan — poori table (${fmt(t.rows)} rows) padhi ja rahi hai.`);
    } else {
      print('sys', `⚡ Index '${cost.key}' laga — ${fmt(cost.rowsExamined)} entries touch hui.`);
    }
    cost.notes.forEach(n => print('sys', '💡 ' + n));
    return rec({ kind: 'explain', sql, table: q.table, plan: cost.plan, indexUsed: cost.key, rowsExamined: cost.rowsExamined, ms: cost.ms, offset: q.offset, keyset: q.keyset });
  }

  function cmdCreateIndex(cmd) {
    const m = cmd.match(/^create\s+(unique\s+)?index\s+(\w+)\s+on\s+(\w+)\s*\(([^)]*)\)/i);
    if (!m) err("400 — aise likho:  CREATE INDEX ix_txn_user_time ON transactions(user_id, created_at)");
    const [, uniq, name, tn, colStr] = m;
    const t = sim.sys.db.tables[tn];
    if (!t) err(`400 — table '${tn}' nahi mila`);
    const cols = colStr.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
    const bad = cols.find(c => !(t.cols || []).includes(c));
    if (bad) err(`400 — column '${bad}' table '${tn}' mein nahi hai. Columns: ${(t.cols || []).join(', ')}`);
    if ((t.indexes || []).some(i => i.name === name)) err(`400 — index '${name}' already exists`);
    t.indexes = t.indexes || [];
    t.indexes.push({ name, cols, unique: !!uniq });
    const buildMs = Math.round(t.rows * 0.0004);
    print('ok', `CREATE INDEX\nTime: ${fmt(buildMs)} ms`);
    print('sys', `📈 Index ban gaya (${cols.join(', ')}). Yaad rakho — har index ek TAX hai: ` +
      `ab har INSERT/UPDATE/DELETE ko yeh index bhi update karna padega, aur disk par ~${bytes(t.rows * cols.length * 12)} extra lagega.`);
    return rec({ kind: 'index', op: 'create', name, table: tn, cols });
  }

  function cmdDropIndex(cmd) {
    const m = cmd.match(/^drop\s+index\s+(\w+)(?:\s+on\s+(\w+))?/i);
    if (!m) err('400 — aise likho:  DROP INDEX ix_name ON transactions');
    const name = m[1];
    let found = null;
    Object.keys(sim.sys.db.tables).forEach(tn => {
      const t = sim.sys.db.tables[tn];
      const i = (t.indexes || []).findIndex(x => x.name === name);
      if (i > -1) { found = tn; t.indexes.splice(i, 1); }
    });
    if (!found) err(`400 — index '${name}' nahi mila`);
    print('ok', 'DROP INDEX');
    return rec({ kind: 'index', op: 'drop', name, table: found });
  }

  function cmdShowIndexes(cmd) {
    const m = cmd.match(/(?:on|from)\s+(\w+)/i);
    const names = m ? [m[1]] : Object.keys(sim.sys.db.tables);
    const rows = [];
    names.forEach(tn => {
      const t = sim.sys.db.tables[tn];
      if (!t) err(`400 — table '${tn}' nahi mila`);
      (t.indexes || []).forEach(ix => ix.cols.forEach((c, i) =>
        rows.push([tn, ix.name, i + 1, c, ix.unique ? 'UNIQUE' : 'non-unique', fmt(t.rows)])));
    });
    if (!rows.length) { print('sys', 'Koi index nahi hai — sirf heap.'); return rec({ kind: 'showIndexes', rows: 0 }); }
    table(['Table', 'Index', 'Seq_in_index', 'Column', 'Type', 'Table rows'], rows);
    print('sys', `💡 Seq_in_index dekho — composite index mein KRAM hi sab kuch hai. Index tabhi lagta hai jab Seq 1 wale column par filter ho.`);
    return rec({ kind: 'showIndexes', rows: rows.length });
  }

  /* =====================================================================
     sim ... — system ko badlo
     ===================================================================== */
  function setPath(obj, path, val) {
    const parts = path.split('.');
    let o = obj;
    for (let i = 0; i < parts.length - 1; i++) { if (o[parts[i]] == null) o[parts[i]] = {}; o = o[parts[i]]; }
    let v = val;
    if (/^-?\d+(\.\d+)?$/.test(val)) v = parseFloat(val);
    else if (val === 'true') v = true; else if (val === 'false') v = false;
    else if (val === 'null' || val === 'none') v = null;
    o[parts[parts.length - 1]] = v;
    return v;
  }

  function cmdSim(cmd) {
    const rest = cmd.replace(/^sim\s+/i, '');
    const verb = rest.split(' ')[0].toLowerCase();
    const args = rest.slice(verb.length).trim();
    const f = parseFlags(args);
    const sys = sim.sys;

    if (verb === 'status') return simStatus();
    if (verb === 'reset') { sim.sys = deepMerge(SD.defaultSys(), stage.sys); print('ok', 'System reset ho gaya.'); return rec({ kind: 'sim', op: 'reset' }); }

    if (verb === 'set') {
      const [path, ...v] = args.split(' ');
      if (!path || !v.length) err("400 — aise:  sim set api.pagination cursor    |    sim set pool.size 200");
      const val = setPath(sys, path, v.join(' '));
      print('ok', `${path} = ${JSON.stringify(val)}`);
      return rec({ kind: 'sim', op: 'set', path, value: val });
    }

    if (verb === 'scale') {
      const what = f._[0], n = parseInt(f._[1], 10);
      if (!what || isNaN(n)) err('400 — aise:  sim scale app 40   |   sim scale replicas 5   |   sim scale pool 200');
      if (what === 'app') sys.app.instances = n;
      else if (what === 'replicas') sys.db.replicas = n;
      else if (what === 'pool') sys.pool.size = n;
      else err("400 — sirf 'app', 'replicas' ya 'pool' scale kar sakte ho");
      print('ok', `${what} = ${n}`);
      print('sys', what === 'pool'
        ? `⚠️ Pool badhana muft nahi hai — har connection DB par ek backend process/thread hai. 500 connections aksar 50 se DHEEME hote hain (context switching + lock contention). Pehle service time ghatao, phir pool badhao.`
        : `📈 ${what} ab ${n}. 'load' dobara chalao aur farak dekho.`);
      return rec({ kind: 'sim', op: 'scale', what, n });
    }

    if (verb === 'precompute') {
      sys.api.precomputed = true;
      sys.api.serviceMsOverride = 2;
      print('ok', 'Results materialize ho gaye — roll_number → poora result object, ek KV store mein.');
      print('sys', `⚡ Ab read path "embarrassingly simple" hai: ek key lookup. Koi JOIN nahi, koi rank calculation nahi. ` +
        `Aur kyunki result IMMUTABLE hai, use jitna chaaho replicate karo — conflict ho hi nahi sakta.`);
      return rec({ kind: 'sim', op: 'precompute' });
    }

    if (verb === 'add') {
      const what = String(f._[0] || '').toLowerCase();
      const target = f._[1];
      if (what === 'cache') {
        sys.api.cache = { ttlSec: +(f.ttl || 60), jitterPct: +(f.jitter || 0), hitRate: f['hit-rate'] != null ? +f['hit-rate'] : 0.9 };
        print('ok', `Cache on — TTL ${sys.api.cache.ttlSec}s, jitter ${sys.api.cache.jitterPct}%`);
        if (!sys.api.cache.jitterPct) print('sys', `⚠️ Jitter 0 hai. Agar 10,000 keys ek saath cache hui thi, toh woh ek saath EXPIRE hongi — ` +
          `aur us ek second mein 10,000 requests seedha DB par. Isi ko cache stampede kehte hain.`);
        else print('sys', `✅ TTL par ±${sys.api.cache.jitterPct}% jitter — expiry bikhar gayi, stampede nahi hoga.`);
        return rec({ kind: 'sim', op: 'add', what: 'cache', cfg: sys.api.cache });
      }
      if (what === 'timeout') {
        const t = parseInt(f._[2] || f.ms, 10);
        if (!target || isNaN(t)) err('400 — aise:  sim add timeout ledger 500');
        sys.deps[target] = sys.deps[target] || { p50: 40, p99: 120, errorRate: 0 };
        sys.deps[target].timeoutMs = t;
        print('ok', `${target}: timeout = ${t}ms`);
        print('sys', `⏱️ Timeout ke bina call HAMESHA ke liye latak sakti hai — aur us beech woh ek thread + ek connection pakde rehti hai. ` +
          `Timeout woh vachan hai jo tum apne CALLER se karte ho.`);
        return rec({ kind: 'sim', op: 'add', what: 'timeout', target, ms: t });
      }
      if (what === 'retry') {
        if (!target) err('400 — aise:  sim add retry ledger --max 3 --backoff exp --jitter full');
        sys.deps[target] = sys.deps[target] || { p50: 40, p99: 120, errorRate: 0 };
        sys.deps[target].retry = { max: +(f.max || 3), backoff: f.backoff || 'fixed', jitter: f.jitter || 'none', baseMs: +(f.base || 100) };
        const R = sys.deps[target].retry;
        print('ok', `${target}: retry max=${R.max} backoff=${R.backoff} jitter=${R.jitter}`);
        if (R.jitter === 'none') print('sys', `🌩️ Jitter ke bina saare clients THEEK ek jaise wait karenge — aur EK SAATH dobara maarenge. ` +
          `Backoff ne bharam diya ki load kam hoga, par storm sirf sanchronize ho gaya.`);
        else print('sys', `✅ Jitter '${R.jitter}' — har client alag time par retry karega, load phail jaayega.`);
        return rec({ kind: 'sim', op: 'add', what: 'retry', target, cfg: R });
      }
      if (what === 'breaker' || what === 'circuit-breaker') {
        if (!target) err('400 — aise:  sim add breaker ledger --threshold 0.5 --window 20');
        sys.deps[target] = sys.deps[target] || { p50: 40, p99: 120, errorRate: 0 };
        sys.deps[target].breaker = { threshold: +(f.threshold || 0.5), windowSec: +(f.window || 20), halfOpenAfter: +(f['half-open'] || 30) };
        sys.deps[target].breakerState = 'closed';
        sys.deps[target]._fails = 0; sys.deps[target]._openCalls = 0;
        print('ok', `${target}: circuit breaker on (threshold ${sys.deps[target].breaker.threshold * 100}%, window ${sys.deps[target].breaker.windowSec}s)`);
        print('sys', `🔌 States: CLOSED (sab normal) → OPEN (fail fast, 1ms) → HALF-OPEN (ek test request) → CLOSED. ` +
          `Breaker ka kaam downstream ko bachana NAHI — TUMHE bachana hai, taaki tumhare threads uske intezaar mein na mar jaayein.`);
        return rec({ kind: 'sim', op: 'add', what: 'breaker', target, cfg: sys.deps[target].breaker });
      }
      if (what === 'fallback') {
        if (!target) err("400 — aise:  sim add fallback ledger 'last known balance'");
        sys.deps[target] = sys.deps[target] || { p50: 40, p99: 120, errorRate: 0 };
        sys.deps[target].fallback = f._.slice(2).join(' ') || 'stale cached value';
        print('ok', `${target}: fallback = "${sys.deps[target].fallback}"`);
        print('sys', `🪂 Graceful degradation: adhoora jawab > koi jawab nahi. Par user ko BATAO ki data purana hai.`);
        return rec({ kind: 'sim', op: 'add', what: 'fallback', target });
      }
      if (what === 'admission' || what === 'waiting-room') {
        sys.api.admission = { maxConcurrent: +(f['max-concurrent'] || f.max || 150000), queueSec: +(f.queue || 8) };
        print('ok', `Admission control on — ${fmt(sys.api.admission.maxConcurrent)} rps andar, baaki waiting room mein (~${sys.api.admission.queueSec}s)`);
        print('sys', `🚪 8 second wait > sabko 503. Aur yeh retries ko bhi rokta hai — warna 12 lakh requests 30 lakh ban jaati hain.`);
        return rec({ kind: 'sim', op: 'add', what: 'admission', cfg: sys.api.admission });
      }
      if (what === 'ratelimit' || what === 'rate-limit') {
        sys.api.rateLimit = { rps: +(f.rps || 100), burst: +(f.burst || f.rps || 200) };
        print('ok', `Rate limit on — ${sys.api.rateLimit.rps} rps, burst ${sys.api.rateLimit.burst}`);
        return rec({ kind: 'sim', op: 'add', what: 'ratelimit', cfg: sys.api.rateLimit });
      }
      if (what === 'bulkhead') {
        sys.app.bulkheads = sys.app.bulkheads || {};
        sys.app.bulkheads[target || 'default'] = +(f.max || 20);
        print('ok', `Bulkhead: '${target || 'default'}' ke liye max ${+(f.max || 20)} concurrent`);
        print('sys', `🚢 Jahaz ke compartments jaise — ek dependency ka doobna poore service ko nahi le doobta. ` +
          `Bina bulkhead ke ek slow dependency SAARE threads kha jaati hai.`);
        return rec({ kind: 'sim', op: 'add', what: 'bulkhead', target, max: +(f.max || 20) });
      }
      if (what === 'dlq') {
        sys.queue = sys.queue || { name: target || 'events', depth: 0, consumers: 3, rateHz: 500 };
        sys.queue.dlq = true;
        print('ok', `DLQ on for queue '${sys.queue.name}'`);
        print('sys', `☠️ Bina DLQ ke ek poison message poore consumer ko infinite loop mein daal deta hai — ` +
          `aur uske peeche ka SAARA traffic ruk jaata hai.`);
        return rec({ kind: 'sim', op: 'add', what: 'dlq' });
      }
      err(`400 — 'sim add ${what}' pata nahi. Options: cache, timeout, retry, breaker, fallback, admission, ratelimit, bulkhead, dlq`);
    }

    if (verb === 'inject') {
      const what = String(f._[0] || '').toLowerCase();
      const target = f._[1];
      if (what === 'latency') {
        const v = parseInt(f._[2], 10);
        sys.deps[target] = sys.deps[target] || { p50: 40, p99: 120, errorRate: 0 };
        sys.deps[target].p50 = Math.round(v * 0.6); sys.deps[target].p99 = v;
        print('err', `💉 '${target}' ab ${v}ms le raha hai.`);
        return rec({ kind: 'sim', op: 'inject', what, target, value: v });
      }
      if (what === 'down') {
        sys.deps[target] = sys.deps[target] || { p50: 40, p99: 120, errorRate: 0 };
        sys.deps[target].down = true; sys.deps[target].errorRate = 1;
        print('err', `💉 '${target}' DOWN hai — saari calls fail.`);
        return rec({ kind: 'sim', op: 'inject', what, target });
      }
      if (what === 'error') {
        const v = parseFloat(f._[2]);
        sys.deps[target] = sys.deps[target] || { p50: 40, p99: 120, errorRate: 0 };
        sys.deps[target].errorRate = v;
        print('err', `💉 '${target}' ka error rate ab ${(v * 100).toFixed(0)}%.`);
        return rec({ kind: 'sim', op: 'inject', what, target, value: v });
      }
      if (what === 'long-tx' || what === 'leak') {
        const holds = parseInt(f.holds || f._[1], 10) || 45;
        sys.db.longTxHolding = holds;
        print('err', `💉 ${holds} connections ek lambi transaction ne pakad rakhe hain (pool size ${sys.pool.size}).`);
        print('sys', `😈 Dhyaan do: CPU nahi badhega. Memory nahi badhegi. Health check GREEN rahega. ` +
          `Sirf requests intezaar karengi. 'load' chalao aur 'trace' se dekho.`);
        return rec({ kind: 'sim', op: 'inject', what: 'long-tx', holds });
      }
      if (what === 'flash' || what === 'flash-crowd') {
        sys.retryAmp = 2.5;
        print('err', `💉 Flash crowd mode — clients ghabra ke retry kar rahe hain (load ×2.5).`);
        return rec({ kind: 'sim', op: 'inject', what: 'flash' });
      }
      err(`400 — 'sim inject ${what}' pata nahi. Options: latency, down, error, long-tx, flash`);
    }
    err(`400 — 'sim ${verb}' pata nahi. Try: sim status | set | add | inject | scale | precompute | reset`);
  }

  function simStatus() {
    const sys = sim.sys;
    const rows = [];
    Object.keys(sys.db.tables).forEach(tn => {
      const t = sys.db.tables[tn];
      rows.push([tn, fmt(t.rows), bytes(t.rows * t.rowBytes), (t.indexes || []).map(i => i.name + '(' + i.cols.join(',') + ')').join('  ') || '—']);
    });
    table(['Table', 'Rows', 'Size', 'Indexes'], rows);
    const eff = sys.pool.size - (sys.db.longTxHolding || 0);
    const lines = [
      'pagination      ' + sys.api.pagination + (sys.api.countTotal ? '   (+ total count har request par)' : ''),
      'max limit       ' + (sys.api.maxLimit || '— (koi guard nahi)'),
      'max page depth  ' + (sys.api.maxPageDepth ? fmt(sys.api.maxPageDepth) : '— (koi guard nahi)'),
      'cache           ' + (sys.api.cache ? `TTL ${sys.api.cache.ttlSec}s, jitter ${sys.api.cache.jitterPct}%` : '—'),
      'rate limit      ' + (sys.api.rateLimit ? sys.api.rateLimit.rps + ' rps' : '—'),
      'idempotency     ' + (sys.api.idempotency ? 'on' : '—'),
      'admission       ' + (sys.api.admission ? fmt(sys.api.admission.maxConcurrent) + ' concurrent' : '—'),
      '',
      'app instances   ' + sys.app.instances,
      'db pool         ' + sys.pool.size + (sys.db.longTxHolding ? `   ⚠️ ${sys.db.longTxHolding} atke hue → effective ${eff}` : ''),
      'buffer pool     ' + sys.db.bufferPoolMB + ' MB',
      'replicas        ' + sys.db.replicas + '   lag ' + sys.db.replicaLagSec + 's',
      'SLO             p99 < ' + sys.slo.p99Ms + 'ms · ' + sys.slo.availability + '% available',
    ];
    Object.keys(sys.deps).forEach(dn => {
      const d = sys.deps[dn];
      lines.push(`dep ${dn.padEnd(11)} p99 ${d.p99}ms${d.down ? ' 🔴 DOWN' : ''}` +
        (d.timeoutMs ? ` · timeout ${d.timeoutMs}ms` : ' · ⚠️ no timeout') +
        (d.retry ? ` · retry×${d.retry.max}` : '') + (d.breaker ? ' · breaker' : '') + (d.fallback ? ' · fallback' : ''));
    });
    panel('SYSTEM', lines);
    return rec({ kind: 'status' });
  }

  /* =====================================================================
     load — Little's Law live
     ===================================================================== */
  const PATTERNS = {
    'shallow': { desc: 'page 1-3, limit 50', build: () => ({ page: 2 }) },
    'deep-page': { desc: 'gehre offset pages', build: () => ({ page: 485728 }) },
    'cursor': { desc: 'keyset cursor', build: () => ({ keyset: true }) },
    'detail': { desc: 'GET /:id', build: () => ({ detail: true }) },
    'flash': { desc: 'sab ek saath, ek hi key', build: () => ({ detail: true }) },
  };

  function cmdLoad(cmd) {
    const f = parseFlags(cmd.replace(/^load\s*/i, ''));
    const rps = parseInt(f.rps, 10) || 100;
    const duration = Math.min(30, parseInt(f.duration, 10) || 8);
    const sys = sim.sys;
    const pname = f.path ? 'path' : (f.pattern || 'shallow');
    const p = f.path ? { desc: f.path, build: () => ({}) } : PATTERNS[pname];
    if (!p) err(`400 — pattern '${pname}' pata nahi. Options: ${Object.keys(PATTERNS).join(', ')}  (ya --path '/api/v1/...' do)`);
    const shape = p.build();

    /* ek request ka service time nikalo */
    let serviceMs;
    if (sys.api.precomputed) serviceMs = sys.api.serviceMsOverride || 2;
    else if (f.path) {
      serviceMs = serviceMsForUrl(f.path);
      if (sys.api.cache) serviceMs = serviceMs * (1 - (sys.api.cache.hitRate == null ? 0.9 : sys.api.cache.hitRate)) + 1.2;
      Object.keys(sys.deps).forEach(dn => { serviceMs += SD.depCost(sys, dn).ms; });
    }
    else {
      const tn = sys.api.primaryTable || Object.keys(sys.db.tables)[0];
      const t = sys.db.tables[tn];
      const q = shape.detail
        ? { table: tn, whereCols: [t.pk], limit: 1 }
        : { table: tn, whereCols: [], orderBy: sys.api.defaultSort || 'created_at', limit: 50,
            offset: shape.keyset ? 0 : ((shape.page || 1) - 1) * 50, keyset: !!shape.keyset, select: ['*'] };
      const c = SD.queryCost(sys, q);
      serviceMs = c.ms;
      if (sys.api.countTotal && !shape.keyset && !shape.detail) serviceMs += SD.queryCost(sys, { table: tn, whereCols: [], count: true }).ms;
      if (sys.api.cache) serviceMs = serviceMs * (1 - (sys.api.cache.hitRate == null ? 0.9 : sys.api.cache.hitRate)) + 1.2;
      Object.keys(sys.deps).forEach(dn => { serviceMs += SD.depCost(sys, dn).ms; });
    }
    serviceMs = Math.max(0.5, serviceMs);

    const res = SD.loadRun(sys, { rps, duration, serviceMs, clientRetries: sys.retryAmp > 1, writeHeavy: !!f.write });
    print('sys', `load: ${fmt(rps)} rps · ${duration}s · pattern '${pname}' (${p.desc}) · service time ${ms(serviceMs)}`);
    const maxP99 = Math.max(...res.buckets.map(b => b.p99));
    table(['sec', 'offered', 'served', 'p50', 'p99', 'pool', 'pool wait', 'queue', 'err%'],
      res.buckets.map(b => [b.s, fmt(b.offered), fmt(b.served), ms(b.p50), ms(b.p99),
        `${b.poolUsed}/${b.poolSize}`, ms(b.waitMs), fmt(b.backlog), b.errPct ? b.errPct + '%' : '—']));
    print('ok', res.buckets.map(b => `  ${String(b.s).padStart(2)}s ${bar(b.p99, maxP99, 34)} ${ms(b.p99)}`).join('\n'));

    const lines = [
      'ek request ka service time   ' + ms(serviceMs),
      'effective pool               ' + res.effPool + (res.effPool < sys.pool.size ? `  (${sys.pool.size} mein se ${sys.pool.size - res.effPool} atke hue!)` : ''),
      "Little's Law capacity        " + fmt(res.capacity) + ' rps   = pool ' + res.effPool + ' × (1000 / ' + ms(serviceMs) + ')',
      'offered load                 ' + fmt(res.offeredRps) + ' rps' + ((sys.retryAmp || 1) > 1 ? `  (${fmt(rps)} asli × ${sys.retryAmp} retry amplification)` : ''),
    ].concat(sys.api.admission ? [
      'admission control            ' + fmt(res.admittedRps) + ' rps ANDAR, ' + fmt(res.queuedRps) + ' waiting room mein',
    ] : []).concat([
      'utilization ρ                ' + res.rho.toFixed(2) + (sys.api.admission ? '   (admitted ÷ capacity)' : ''),
      '',
      res.saturated
        ? '🔥 SATURATED — ρ ≥ 1. Queue badhti gayi, pool wait timeout tak pahuncha, requests marne lagi.'
        : '✅ Capacity ke andar. Queue nahi bani.',
    ]);
    if (res.saturated) {
      lines.push('   Note: CPU abhi bhi kam hai. Server "aaram se" baitha hai —');
      lines.push('   kyunki kaam karne ke liye connection hi nahi mil raha.');
    }
    panel("CAPACITY", lines);
    return rec({
      kind: 'load', rps, duration, pattern: pname, serviceMs: +serviceMs.toFixed(2),
      capacity: res.capacity, saturated: res.saturated, maxP99, errPct: res.errPct,
      effPool: res.effPool, p99: maxP99, rho: res.rho, maxWait: res.maxWait,
      poolStarved: res.maxWait > 100,
    });
  }

  /* =====================================================================
     trace — EK request ka waterfall. "CPU 10% par timeout" ka jawab yahi hai.
     ===================================================================== */
  function cmdTrace(cmd) {
    const sys = sim.sys;
    const target = cmd.replace(/^trace\s*/i, '').trim() || 'GET /api/v1/transactions?page=2&limit=50';
    const holds = sys.db.longTxHolding || 0;
    const eff = Math.max(1, sys.pool.size - holds);
    const lastLoad = [...sim.records].reverse().find(r => r.kind === 'load');
    const serviceMs = lastLoad ? lastLoad.serviceMs : 20;
    const capacity = eff * (1000 / serviceMs);
    const rps = lastLoad ? lastLoad.rps : 100;
    const poolWait = lastLoad && lastLoad.maxWait != null
      ? Math.max(1, Math.round(lastLoad.maxWait))
      : (rps > capacity ? Math.min(sys.pool.acquireTimeoutMs, Math.round((rps - capacity) / capacity * 1000 * 2)) : 1);
    const appMs = sys.app.cpuMsPerReq;
    const spans = [
      ['lb → app', 2],
      ['auth middleware', 1],
      ['app handler (CPU)', appMs],
      ['⏳ pool.acquire()', poolWait],
      ['db query', Math.round(serviceMs)],
      ['serialize json', 2],
    ];
    Object.keys(sys.deps).forEach(dn => spans.splice(4, 0, ['→ ' + dn, SD.depCost(sys, dn).ms]));
    const total = spans.reduce((a, b) => a + b[1], 0);
    print('sys', `trace: ${target}`);
    print('ok', spans.map(([n, v]) => {
      const pct = total ? v / total : 0;
      return '  ' + n.padEnd(20) + String(ms(v)).padStart(9) + '  ' + bar(v, total, 30) + ' ' + (pct * 100).toFixed(0) + '%';
    }).join('\n') + '\n  ' + 'TOTAL'.padEnd(20) + String(ms(total)).padStart(9));
    const worst = spans.slice().sort((a, b) => b[1] - a[1])[0];
    if (worst[0].includes('pool.acquire')) {
      panel('DIAGNOSIS', [
        'Sabse zyada waqt ' + worst[0] + ' mein gaya — ' + ms(worst[1]),
        '',
        'Request KAAM nahi kar rahi. Woh ek CONNECTION ka intezaar kar rahi hai.',
        'Isiliye:  CPU 10%  ·  memory theek  ·  /health green  ·  phir bhi timeout.',
        '',
        'Query optimize karne se kuch nahi hoga — SQL sirf ' + ms(serviceMs) + ' le raha hai.',
        'Bottleneck DB nahi, DB ke SAAMNE ki QUEUE hai.',
        '',
        'Ab yeh dekho:  pool wait time · active vs idle connections ·',
        'threads waiting · lambi transactions · leaked connections.',
      ]);
    } else {
      panel('DIAGNOSIS', ['Sabse mehenga span: ' + worst[0] + ' — ' + ms(worst[1]) + ' (' + (100 * worst[1] / total).toFixed(0) + '%)',
        '', 'p99 par sirf ghoorna kaafi nahi — WAQT KAHAN GAYA, yeh dekho.']);
    }
    return rec({ kind: 'trace', total: Math.round(total), poolWait, worst: worst[0], spans });
  }

  /* =====================================================================
     metrics / slo / estimate
     ===================================================================== */
  function cmdMetrics() {
    const sys = sim.sys;
    const lastLoad = [...sim.records].reverse().find(r => r.kind === 'load');
    const holds = sys.db.longTxHolding || 0;
    const eff = sys.pool.size - holds;
    const starved = !!(lastLoad && lastLoad.poolStarved);
    const cpu = starved ? 10 : 34;
    table(['Metric', 'Value', 'Kya keh raha hai'], [
      ['cpu.utilization', cpu + '%', cpu < 20 ? 'app BUSY nahi hai' : 'normal'],
      ['memory.used', '41%', 'koi pressure nahi'],
      ['health.check', '200 OK 🟢', 'process ZINDA hai — bas itna'],
      ['http.p99', lastLoad ? ms(lastLoad.maxP99) : '—', lastLoad && lastLoad.maxP99 > sys.slo.p99Ms ? '🔥 SLO todh raha hai' : 'theek'],
      ['db.pool.size', String(sys.pool.size), ''],
      ['db.pool.active', String(Math.max(0, eff < sys.pool.size ? sys.pool.size : Math.round(sys.pool.size * 0.4))), holds ? '⚠️ ' + holds + ' ek hi lambi tx ne pakde hain' : ''],
      ['db.pool.wait_ms', starved ? ms(lastLoad.maxWait) : '2 ms', starved ? '🔥 YAHI ASLI SIGNAL HAI' : 'theek'],
      ['db.pool.queue_depth', starved ? fmt(lastLoad.rps - lastLoad.capacity) : '0', starved ? 'queue badh rahi hai' : ''],
      ['db.pool.utilization', starved ? '100%' : '40%', starved ? 'saturated — ρ = ' + lastLoad.rho : ''],
      ['db.replica.lag_s', String(sys.db.replicaLagSec), sys.db.replicaLagSec > 5 ? '⚠️ read-after-write tootega' : ''],
    ]);
    panel('SATURATION — CPU ke ALAWA jo bhi bhar sakta hai', [
      'db connection pool   ·   thread pool   ·   http connection pool',
      'file descriptors     ·   queue capacity ·  worker slots',
      'downstream rate limits',
      '',
      'CPU aur memory sirf DO resources hain. Utilization batata hai',
      '"kitna use ho raha hai" — SATURATION batata hai "kitna INTEZAAR ho raha hai".',
      'Outage hamesha saturation se aata hai.',
    ]);
    return rec({ kind: 'metrics', cpu, poolWaitHigh: starved });
  }

  function cmdSlo(cmd) {
    const f = parseFlags(cmd.replace(/^slo\s*/i, ''));
    const sys = sim.sys;
    const avail = parseFloat(f.availability || sys.slo.availability);
    const days = parseInt(f.days, 10) || 30;
    const budgetMin = (100 - avail) / 100 * days * 24 * 60;
    panel('ERROR BUDGET', [
      'target availability   ' + avail + '%',
      'window                ' + days + ' din',
      'error budget          ' + budgetMin.toFixed(1) + ' minutes  (' + (budgetMin / 60).toFixed(2) + ' ghante)',
      '',
      '99%     → ' + (0.01 * days * 24 * 60).toFixed(0) + ' min/mahina',
      '99.9%   → ' + (0.001 * days * 24 * 60).toFixed(0) + ' min/mahina',
      '99.99%  → ' + (0.0001 * days * 24 * 60).toFixed(1) + ' min/mahina',
      '99.999% → ' + (0.00001 * days * 24 * 60 * 60).toFixed(0) + ' SECONDS/mahina',
      '',
      'Har extra 9 ki keemat ~10x hai. "100% uptime" ek target nahi,',
      'ek galatfehmi hai — budget hi woh cheez hai jo deploy karne ki',
      'ijaazat deti hai.',
    ]);
    return rec({ kind: 'slo', avail, budgetMin: +budgetMin.toFixed(1) });
  }

  function cmdEstimate(cmd) {
    const f = parseFlags(cmd.replace(/^estimate\s*/i, ''));
    const users = parseFloat(f.users || 0);
    const rps = parseFloat(f.rps || 0);
    const bytesPer = parseFloat(f.bytes || 0);
    const days = parseFloat(f.days || 365);
    const peak = parseFloat(f.peak || 3);
    if (!users && !rps) err("400 — aise:  estimate --users 12000000 --rps 500 --bytes 2048 --days 365");
    const writesPerSec = rps || (users * (parseFloat(f['per-user-per-day'] || 2)) / 86400);
    const lines = [
      'daily active users    ' + fmt(users),
      'average write rps     ' + fmt(writesPerSec),
      'peak rps (×' + peak + ')       ' + fmt(writesPerSec * peak) + '   ← isi ke liye design karo, average ke liye nahi',
      '',
      'bytes per record      ' + bytes(bytesPer),
      'per day               ' + bytes(writesPerSec * 86400 * bytesPer),
      'per year              ' + bytes(writesPerSec * 86400 * 365 * bytesPer),
      'in ' + days + ' days          ' + bytes(writesPerSec * 86400 * days * bytesPer),
      'with 3x replication   ' + bytes(writesPerSec * 86400 * days * bytesPer * 3),
      '',
      'peak bandwidth        ' + bytes(writesPerSec * peak * bytesPer) + '/s',
    ];
    if (rps) {
      lines.push('');
      lines.push('agar ek request 20ms leti hai:');
      lines.push('  concurrency (L=λW)  ' + fmt(rps * 0.02) + '   ← itne connections/threads ek saath busy');
      lines.push('  pool 50 ki capacity ' + fmt(50 * 50) + ' rps');
    }
    panel('BACK OF THE ENVELOPE', lines);
    print('sys', `💡 Yaad rakho: 1 din ≈ 86,400 second. 1 lakh/din ≈ 1.2 rps. 1 million/din ≈ 12 rps. Peak = average × 2-5.`);
    return rec({ kind: 'estimate', users, rps: writesPerSec, peak: writesPerSec * peak });
  }

  function cmdCursor(cmd) {
    const m = cmd.match(/^cursor\s+(decode|encode)\s+(.*)$/i);
    if (!m) err("400 — aise:  cursor decode eyJ0IjoiMjAyNi0wNC0xMSJ9");
    if (m[1].toLowerCase() === 'decode') {
      let json;
      try { json = typeof atob === 'function' ? atob(m[2]) : Buffer.from(m[2], 'base64').toString(); }
      catch (e) { json = '{"t":"2026-04-11T09:22:04Z","id":8812304,"d":"desc"}'; }
      if (!/^\s*\{/.test(json)) json = '{"t":"2026-04-11T09:22:04Z","id":8812304,"d":"desc"}';
      print('ok', json);
      print('sys', `🔑 Cursor ke andar: last_seen sort value (t), tie-breaker id, aur direction. ` +
        `Client ise KABHI khud na banaye — server banata hai, server padhta hai. Isi liye ise OPAQUE rakho: ` +
        `kal tum query strategy badal do, clients nahi tootenge.`);
      return rec({ kind: 'cursor', op: 'decode', json });
    }
    const tok = btoaSafe(m[2]);
    print('ok', tok);
    return rec({ kind: 'cursor', op: 'encode', token: tok });
  }

  function cmdShowTables() {
    table(['Table', 'Rows', 'Size', 'Columns'],
      Object.keys(sim.sys.db.tables).map(tn => {
        const t = sim.sys.db.tables[tn];
        return [tn, fmt(t.rows), bytes(t.rows * t.rowBytes), (t.cols || []).join(', ')];
      }));
    return rec({ kind: 'showTables' });
  }

  /* =====================================================================
     AUTH — identity kahan se aati hai (api.auth: null | 'body' | 'header')
     Yeh block cmdHttp ke andar se bulaaya jaata hai. null lautao = aage badho.
     ===================================================================== */
  function authCheck(method, url, qs, headers) {
    const mode = sim.sys.api.auth;
    const claimed = qs.user_id != null ? String(qs.user_id) : null;

    if (!mode) {
      if (claimed) print('sys', `🚨 Koi auth hi nahi hai. Kisi bhi user ka data maang lo — ` +
        `<code>?user_id=${claimed}</code> ne bina kuch poochhe woh de diya. Yeh "IDOR" hai (Insecure Direct Object Reference), ` +
        `aur yeh OWASP ki #1 API vulnerability hai.`);
      return null;
    }

    if (mode === 'body' || mode === 'param') {
      const who = claimed || 'anonymous';
      print('sys', `🚨 Identity REQUEST ke andar se li ja rahi hai (<code>user_id=${who}</code>). ` +
        `Request ka har hissa client ke kaabu mein hai — woh jo chaahe likh sakta hai. ` +
        `Server ne bas maan liya ki tum ${who} ho. Yeh authentication nahi, <b>bharosa</b> hai.`);
      return { actedAs: who, claimed, spoofable: true };
    }

    /* mode === 'header' — sirf verified token se identity */
    const raw = headers['authorization'] || '';
    const bm = raw.match(/^Bearer\s+(\S+)$/i);
    if (!bm) {
      print('err', `HTTP/1.1 401 Unauthorized\nwww-authenticate: Bearer\n\n` +
        `{ "type": "/errors/unauthenticated", "title": "Authorization header chahiye", "status": 401 }`);
      print('sys', `🔐 401 = "tum kaun ho, pata nahi". (403 = "pata hai, par ijaazat nahi".) ` +
        `Do alag cheezein hain — client inhe alag tarah handle karta hai: 401 par login bhejo, 403 par nahi.`);
      return { deny: true, status: 401, reason: 'no-token' };
    }
    const tok = bm[1];
    if (/^expired/i.test(tok)) {
      print('err', `HTTP/1.1 401 Unauthorized\n\n` +
        `{ "type": "/errors/token-expired", "title": "Token expire ho gaya", "status": 401 }`);
      print('sys', `⏳ JWT self-contained hai — server use bina DB dekhe verify kar leta hai. ` +
        `Yahi uska faayda hai aur yahi uski kami: <b>token ko beech mein revoke nahi kar sakte</b>. ` +
        `Isiliye access token ki umar chhoti rakho (5–15 min) aur refresh token se naya lo.`);
      return { deny: true, status: 401, reason: 'expired' };
    }
    const um = tok.match(/^u(\d+)$/i);
    const actedAs = um ? um[1] : tok;
    if (claimed && claimed !== actedAs) {
      print('err', `HTTP/1.1 403 Forbidden\n\n` +
        `{ "type": "/errors/forbidden", "title": "user ${claimed} ka data tumhara nahi hai", "status": 403 }`);
      print('sys', `🛡️ Token kehta hai tum <b>user ${actedAs}</b> ho, par query <b>user ${claimed}</b> maang rahi hai. ` +
        `Server ne TOKEN par bharosa kiya, query par nahi — yahi sahi kram hai.`);
      return { deny: true, status: 403, reason: 'idor', actedAs, claimed };
    }
    print('sys', `✅ Identity <b>header</b> se aayi (token: user ${actedAs}) — request ke body/query se NAHI. ` +
      `Ab client jhooth nahi bol sakta, kyunki token par server ka signature hai.`);
    return { actedAs, claimed, spoofable: false };
  }

  /* =====================================================================
     CACHE LAB — eviction policy, hot key, request coalescing
     ===================================================================== */
  function cmdCache(cmd) {
    const rest = cmd.replace(/^cache\s*/i, '');
    const verb = (rest.split(' ')[0] || '').toLowerCase();
    const f = parseFlags(rest.slice(verb.length).trim());

    if (verb === 'sim') {
      const policy = String(f.policy || 'lru').toLowerCase();
      if (!/^(lru|lfu|fifo)$/.test(policy)) err("400 — policy sirf lru, lfu ya fifo:  cache sim --policy lru --size 3 --keys 'a b a b c d'");
      const size = Math.max(1, parseInt(f.size, 10) || 3);
      const keys = String(f.keys || 'a b a b a b c d e f a b').trim().split(/[\s,]+/).filter(Boolean);
      const cache = [];                       // [{ k, freq, seq }]
      let hits = 0, clock = 0;
      const trace = [];
      keys.forEach(k => {
        clock++;
        const e = cache.find(x => x.k === k);
        if (e) { hits++; e.freq++; e.used = clock; trace.push(`${k}  HIT `); return; }
        let evicted = '';
        if (cache.length >= size) {
          let vi = 0;
          if (policy === 'lru') cache.forEach((x, i) => { if (x.used < cache[vi].used) vi = i; });
          else if (policy === 'lfu') cache.forEach((x, i) => { if (x.freq < cache[vi].freq || (x.freq === cache[vi].freq && x.used < cache[vi].used)) vi = i; });
          else cache.forEach((x, i) => { if (x.seq < cache[vi].seq) vi = i; });     // fifo
          evicted = cache[vi].k;
          cache.splice(vi, 1);
        }
        cache.push({ k, freq: 1, used: clock, seq: clock });
        trace.push(`${k}  miss${evicted ? ' — nikaala: ' + evicted : ''}`);
      });
      const misses = keys.length - hits;
      const rate = Math.round((hits / keys.length) * 1000) / 10;
      print('ok', [
        `policy=${policy.toUpperCase()}  size=${size}  requests=${keys.length}`,
        '',
        ...trace.map((t, i) => `  ${String(i + 1).padStart(2)}. ${t}`),
        '',
        `  cache mein bacha: [ ${cache.map(x => x.k).join(', ')} ]`,
        `  hits ${hits} · misses ${misses} · HIT RATE ${rate}%`,
      ].join('\n'));
      return rec({ kind: 'cache', op: 'sim', policy, size, requests: keys.length, hits, misses, hitRate: rate });
    }

    if (verb === 'hotkey' || verb === 'hot-key') {
      const key = f.key || 'post:celeb42';
      const rps = parseInt(f.rps, 10) || 50000;
      const nodes = Math.max(1, parseInt(f.nodes, 10) || 8);
      const replicas = Math.max(1, parseInt(f.replicas, 10) || 1);
      const perNode = Math.round(rps / replicas);
      const NODE_CAP = 20000;
      const hot = perNode > NODE_CAP;
      print(hot ? 'err' : 'ok', [
        `key            ${key}`,
        `traffic        ${fmt(rps)} rps`,
        `cluster        ${nodes} nodes  (har node ~${fmt(NODE_CAP)} rps sambhal sakta hai)`,
        `copies         ${replicas}  →  ${key}${replicas > 1 ? '#0 .. #' + (replicas - 1) : ''}`,
        `per-node load  ${fmt(perNode)} rps  ${hot ? '🔥 CAP SE ' + Math.round(perNode / NODE_CAP * 10) / 10 + 'x UPAR' : '✅ theek hai'}`,
      ].join('\n'));
      print('sys', hot
        ? `🔥 Ek key ka hash <b>ek hi node</b> par jaata hai. Cluster mein ${nodes} nodes hone se koi farak nahi padta — ` +
          `${nodes - 1} nodes khaali baithe hain aur ek jal raha hai. Consistent hashing yahan madad NAHI karti; ` +
          `woh keys ko baantti hai, <b>ek key ko nahi</b>. Ilaaj: key ki N copies banao (<code>${key}#0..#${nodes - 1}</code>) ` +
          `aur client randomly ek chune.`
        : `✅ Key ki ${replicas} copies ban gayi. Har client randomly ek suffix chunta hai, toh load ${replicas} nodes par bant gaya. ` +
          `Kharch: write par saari ${replicas} copies invalidate karni padengi — isliye yeh sirf <b>read-heavy hot keys</b> ke liye hai.`);
      return rec({ kind: 'cache', op: 'hotkey', key, rps, nodes, replicas, perNode, hot });
    }

    if (verb === 'coalesce' || verb === 'singleflight' || verb === 'single-flight') {
      const misses = parseInt(f.misses, 10) || 5000;
      const on = !!(f.on || f.enable);
      const dbQueries = on ? 1 : misses;
      print(on ? 'ok' : 'err', [
        `ek hi key par ek saath miss   ${fmt(misses)} requests`,
        `DB tak pahunchi                ${fmt(dbQueries)} ${on ? 'query  ✅' : 'queries  💥'}`,
        `baaki                          ${fmt(misses - dbQueries)} requests ${on ? 'usi jawab ka intezaar kar rahi hain' : 'apni-apni query chala rahi hain'}`,
      ].join('\n'));
      print('sys', on
        ? `🤝 Single-flight: pehli request ek "lock" leti hai aur DB jaati hai; baaki usi promise par wait karti hain. ` +
          `Ek key = ek in-flight query. Yeh cache stampede ka <b>seedha</b> ilaaj hai — TTL jitter se alag: ` +
          `jitter expiry ko <b>bikherta</b> hai, coalescing ek hi pal ke dhamake ko <b>samet</b>ta hai. Dono lagao.`
        : `💥 Ek popular key expire hui aur ${fmt(misses)} requests ek saath miss ho gayi — sabne apni query chala di. ` +
          `DB ko ek jaisi ${fmt(misses)} queries ek saath mili. Isi ko <b>thundering herd</b> kehte hain.`);
      return rec({ kind: 'cache', op: 'coalesce', misses, dbQueries, on });
    }

    err("400 — aise:  cache sim --policy lru --size 3 --keys 'a b a b c'   |   cache hotkey --rps 50000 --replicas 8   |   cache coalesce --misses 5000 --on");
  }

  /* =====================================================================
     MIGRATE LAB — dual-write → backfill → verify → cutover (ya rollback)
     ===================================================================== */
  function migState() {
    if (!sim.sys.migration) {
      const t = sim.sys.db.tables[sim.sys.api.primaryTable] || Object.values(sim.sys.db.tables)[0];
      sim.sys.migration = { dualWrite: false, backfilled: 0, total: t ? t.rows : 1000000, drift: 0, verified: false, cutover: false, writesDuring: 0, batch: 0 };
    }
    return sim.sys.migration;
  }

  function cmdMigrate(cmd) {
    const rest = cmd.replace(/^migrate\s*/i, '');
    const verb = (rest.split(' ')[0] || 'status').toLowerCase();
    const f = parseFlags(rest.slice(verb.length).trim());
    const M = migState();
    const pct = () => Math.round(M.backfilled / M.total * 1000) / 10;

    if (verb === 'status') {
      print('ok', [
        `purani table     ${fmt(M.total)} rows`,
        `dual-write       ${M.dualWrite ? 'ON  ✅' : 'OFF ❌'}`,
        `backfill         ${fmt(M.backfilled)} / ${fmt(M.total)}  (${pct()}%)`,
        `drift            ${M.drift ? fmt(M.drift) + ' rows  ❌' : '0 rows'}`,
        `verified         ${M.verified ? 'haan ✅' : 'nahi'}`,
        `cutover          ${M.cutover ? 'ho gaya' : 'nahi hua'}`,
      ].join('\n'));
      return rec({ kind: 'migrate', op: 'status', dualWrite: M.dualWrite, backfilled: M.backfilled, drift: M.drift, verified: M.verified, cutover: M.cutover });
    }

    if (verb === 'dual-write' || verb === 'dualwrite') {
      const on = !/off|false|0/i.test(String(f._[0] || 'on'));
      M.dualWrite = on;
      print('ok', `dual-write = ${on ? 'ON' : 'OFF'}`);
      print('sys', on
        ? `✍️ Ab har naya write <b>dono</b> jagah jaata hai — purani table (source of truth) aur nayi table. ` +
          `Yeh backfill se PEHLE on karna zaroori hai: warna backfill chalte waqt jo naye writes aayenge, ` +
          `woh nayi table mein kabhi pahunchenge hi nahi.`
        : `⚠️ dual-write band. Ab se naye writes sirf purani table mein ja rahe hain — nayi table peechhe chhootne lagegi.`);
      return rec({ kind: 'migrate', op: 'dual-write', dualWrite: on });
    }

    if (verb === 'backfill') {
      const batch = parseInt(f.batch, 10) || 100000;
      M.batch = batch;
      const newWrites = 41204;                 // backfill ke doraan aaye naye writes
      M.backfilled = M.total;
      if (!M.dualWrite) { M.drift += newWrites; M.writesDuring += newWrites; }
      const lockRisk = batch > 50000;
      print(lockRisk ? 'err' : 'ok', [
        `batch size       ${fmt(batch)} rows`,
        `copy kiya        ${fmt(M.total)} / ${fmt(M.total)} rows`,
        `lambi query      ${lockRisk ? 'HAAN — ek batch ~' + (Math.round(batch / 1000) / 10) + 's chali  💥' : 'nahi — har batch ~' + (Math.round(batch / 1000) / 10) + 's'}`,
        `replica lag      ${lockRisk ? fmt(Math.round(batch / 900)) + 's  💥' : Math.max(1, Math.round(batch / 20000)) + 's'}`,
        `backfill ke doraan naye writes   ${fmt(newWrites)}  →  ${M.dualWrite ? 'nayi table mein bhi gaye ✅' : 'SIRF purani table mein gaye ❌'}`,
      ].join('\n'));
      if (lockRisk) print('sys', `💥 Batch bahut bada hai. Ek hi statement mein ${fmt(batch)} rows chhoona matlab ek lambi transaction — ` +
        `woh locks pakadti hai, undo log phulaati hai, aur replica lag chadha deti hai. ` +
        `Chhote batches (1k–10k) + beech mein saans (sleep) lo. Migration ka dhyeya "jaldi" nahi, "kisi ko pata na chale" hai.`);
      if (!M.dualWrite) print('sys', `🚨 dual-write OFF thi. Backfill ne data ka ek <b>snapshot</b> copy kiya, ` +
        `par jo ${fmt(newWrites)} writes copy chalte waqt aaye woh nayi table mein hain hi nahi. ` +
        `Nayi table ab <b>chupchaap galat</b> hai — aur yeh sirf <code>migrate verify</code> hi pakdega.`);
      return rec({ kind: 'migrate', op: 'backfill', batch, backfilled: M.backfilled, dualWrite: M.dualWrite, drift: M.drift, lockRisk });
    }

    if (verb === 'verify') {
      if (!M.backfilled) { print('err', 'Abhi backfill hua hi nahi — verify karne ko kuch nahi.'); return rec({ kind: 'migrate', op: 'verify', drift: -1, verified: false }); }
      M.verified = M.drift === 0;
      print(M.verified ? 'ok' : 'err', [
        `purani table     ${fmt(M.total)} rows`,
        `nayi table       ${fmt(M.total - M.drift)} rows`,
        `mel nahi khaya   ${fmt(M.drift)} rows  ${M.verified ? '✅' : '❌'}`,
        `checksum         ${M.verified ? 'match ✅' : 'MISMATCH ❌'}`,
      ].join('\n'));
      print('sys', M.verified
        ? `✅ Ab cutover safe hai — kyunki tumhare paas <b>saboot</b> hai, ummeed nahi. ` +
          `Asli migrations mein yeh ek continuous job hoti hai jo cutover tak roz chalti hai.`
        : `❌ ${fmt(M.drift)} rows kho gayi. Agar tumne yeh check kiye bina cutover kar diya hota, ` +
          `toh ${fmt(M.drift)} users ka data <b>chup-chaap</b> gayab ho jaata — aur pata mahino baad chalta. ` +
          `Isiliye verify optional nahi hai. Ab: <code>migrate rollback</code>, phir sahi kram se dobara.`);
      return rec({ kind: 'migrate', op: 'verify', drift: M.drift, verified: M.verified });
    }

    if (verb === 'cutover') {
      const safe = M.verified && M.drift === 0;
      M.cutover = true;
      print(safe ? 'ok' : 'err', safe
        ? `✅ Reads ab nayi table se. Purani table abhi bhi likhi ja rahi hai (dual-write ON) — rollback ek flag door hai.`
        : `💥 Cutover ho gaya — par ${fmt(M.drift)} rows verify nahi hui thi. Woh data ab users ko dikh hi nahi raha.`);
      print('sys', safe
        ? `🎛️ Cutover ek <b>flag</b> hona chahiye, deploy nahi. Deploy rollback karne mein 20 minute lagte hain; ` +
          `flag palatne mein 20 second. Aur pehle 1% traffic par kholo, phir 10%, phir 100%.`
        : `🚨 Yahi woh galti hai jo post-incident review mein "silent data loss" likhi jaati hai. ` +
          `Kram hamesha yeh hai: <b>dual-write → backfill → verify → cutover</b>. Ek bhi kadam aage-peechhe, ` +
          `aur nuksaan chup-chaap hota hai. <code>migrate rollback</code> chalao.`);
      return rec({ kind: 'migrate', op: 'cutover', safe, drift: M.drift, cutover: true });
    }

    if (verb === 'rollback') {
      M.cutover = false; M.verified = false; M.backfilled = 0; M.drift = 0;
      print('ok', 'Reads wapas purani table par. Nayi table truncate ho gayi, backfill zero par.');
      print('sys', `↩️ Rollback isliye mumkin tha kyunki <b>purani table abhi bhi source of truth thi</b>. ` +
        `Jis pal tum purani table par likhna band karte ho, rollback ka darwaza band ho jaata hai. ` +
        `Isliye dual-write ko cutover ke baad bhi kuch din chalne do.`);
      return rec({ kind: 'migrate', op: 'rollback', drift: 0, verified: false, cutover: false });
    }

    err('400 — aise:  migrate status | migrate dual-write on | migrate backfill --batch 5000 | migrate verify | migrate cutover | migrate rollback');
  }

  /* =====================================================================
     BENCH — storage engine ka asli farak (B-tree vs LSM)
     ===================================================================== */
  function cmdBench(cmd) {
    const rest = cmd.replace(/^bench\s*/i, '');
    const verb = (rest.split(' ')[0] || '').toLowerCase();
    const f = parseFlags(rest.slice(verb.length).trim());
    const engine = /lsm|rocks|cassandra|leveldb/i.test(String(sim.sys.db.engine || 'postgres')) ? 'lsm' : 'btree';
    const rows = parseInt(f.rows, 10) || 100000;

    if (verb === 'write') {
      const amp = engine === 'lsm' ? 1.3 : 4.2;
      const perOp = engine === 'lsm' ? 0.012 : 0.085;
      const ms = Math.round(rows * perOp);
      print('ok', [
        `engine           ${engine === 'lsm' ? 'LSM-tree (RocksDB / Cassandra jaisa)' : 'B-tree (Postgres / InnoDB jaisa)'}`,
        `writes           ${fmt(rows)}`,
        `disk par gaya    ${engine === 'lsm' ? 'SEQUENTIAL append (memtable → WAL → SSTable)' : 'RANDOM page updates (jahan-jahan row ki jagah hai)'}`,
        `write amp        ${amp}x`,
        `kul waqt         ${fmt(ms)} ms   (${Math.round(rows / (ms / 1000))} writes/sec)`,
      ].join('\n'));
      print('sys', engine === 'lsm'
        ? `⚡ LSM writes tez hain kyunki woh <b>kuch dhoondte hi nahi</b>. Row memory (memtable) mein jaati hai aur ` +
          `disk par sirf append hota hai — koi random seek nahi. Kharch baad mein aata hai: compaction. ` +
          `<code>bench read</code> aur <code>bench compact</code> chalao.`
        : `🌳 B-tree ko har write par woh <b>page dhoondna</b> padta hai jahan row ki jagah hai, use padhna, badalna, wapas likhna. ` +
          `Random I/O + page splits + har index ka apna update. Isiliye write amp ${amp}x hai. ` +
          `Ab <code>sim set db.engine lsm</code> karke dobara chalao.`);
      return rec({ kind: 'bench', op: 'write', engine, rows, amp, ms });
    }

    if (verb === 'read') {
      const levels = engine === 'lsm' ? 5 : 1;
      const perOp = engine === 'lsm' ? 0.055 : 0.021;
      const ms = Math.round(rows * perOp);
      print('ok', [
        `engine           ${engine === 'lsm' ? 'LSM-tree' : 'B-tree'}`,
        `point reads      ${fmt(rows)}`,
        `kahan dhoonda    ${engine === 'lsm' ? 'memtable → L0 → L1 → L2 → L3  (bloom filter har level par)' : 'ek B-tree descent → row mil gayi'}`,
        `read amp         ${levels}x  (${levels} jagah tak dekhna pad sakta hai)`,
        `kul waqt         ${fmt(ms)} ms   (${Math.round(rows / (ms / 1000))} reads/sec)`,
      ].join('\n'));
      print('sys', engine === 'lsm'
        ? `🔍 LSM mein ek key kai levels par ho sakti hai (naya version upar, purana neeche). Point read ko kai SSTables dekhni padti hain — ` +
          `bloom filters zyadatar ko turant "yahan nahi hai" bata dete hain, par <b>range scan</b> ko sab merge karna hi padta hai. ` +
          `Yahi LSM ka sauda hai: <b>write ka dard read par daal do</b>.`
        : `🌳 B-tree ka read seedha hai: ek descent, row mili. Isiliye OLTP (bahut saare chhote random reads + updates) ka default B-tree hai. ` +
          `Ab <code>sim set db.engine lsm</code> karke yeh dobara chalao — farak dekhoge.`);
      return rec({ kind: 'bench', op: 'read', engine, rows, amp: levels, ms });
    }

    if (verb === 'compact') {
      if (engine !== 'lsm') {
        print('err', 'B-tree mein compaction hoti hi nahi — woh page in-place update karta hai.');
        print('sys', `🌳 Yahi to farak hai. B-tree ka kharch <b>har write par</b> chukta hai (random I/O). ` +
          `LSM us kharch ko TAAL deta hai — aur baad mein compaction ke roop mein ek saath chukaata hai. ` +
          `<code>sim set db.engine lsm</code> karke dekho.`);
        return rec({ kind: 'bench', op: 'compact', engine, ran: false });
      }
      print('ok', [
        `L0 → L1 merge    ${fmt(rows * 4)} rows padhi, ${fmt(rows * 4)} likhi`,
        `space amp        2.1x   (purane versions abhi bhi disk par hain, delete = "tombstone")`,
        `is doraan        read latency p99 ~3x  💥  ·  disk I/O saturated`,
      ].join('\n'));
      print('sys', `🧹 Compaction hi LSM ka <b>chhupa hua bill</b> hai. Writes tez the kyunki kaam taala gaya tha; ` +
        `compaction woh kaam karti hai — aur woh CPU, disk I/O aur read latency par bhaari padti hai. ` +
        `Isiliye LSM databases mein "sab theek chal raha tha, achanak p99 chad gaya" ka jawab aksar compaction hota hai. ` +
        `<b>Chunav ka niyam:</b> write-heavy + range scans (time series, events, feeds) → LSM. ` +
        `Read-heavy + chhote random updates (orders, users, payments) → B-tree.`);
      return rec({ kind: 'bench', op: 'compact', engine, ran: true, spaceAmp: 2.1 });
    }

    err('400 — aise:  bench write --rows 100000   |   bench read --rows 100000   |   bench compact');
  }

  /* =====================================================================
     RING — consistent hashing ka akhaada
     ===================================================================== */
  function fnv(str) {                       // deterministic 32-bit hash (FNV-1a + avalanche)
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    /* FNV chhoti, milti-julti strings par kamzor bikharta hai — isliye ek final mix
       (murmur3 ka fmix32). Bina iske 150 vnodes bhi balance nahi karte. */
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h ^= h >>> 16;
    return h >>> 0;
  }
  function ringState() {
    if (!sim.sys.ring) sim.sys.ring = { nodes: ['node-1', 'node-2', 'node-3', 'node-4'], vnodes: 1, keys: 10000 };
    return sim.sys.ring;
  }
  function ringPoints(R) {                  // sorted [hash, node] list
    const pts = [];
    R.nodes.forEach(n => {
      for (let v = 0; v < R.vnodes; v++) pts.push([fnv(n + '#' + v), n]);
    });
    return pts.sort((a, b) => a[0] - b[0]);
  }
  function ringOwners(R) {                  // key -> node
    const pts = ringPoints(R);
    const own = {};
    for (let i = 0; i < R.keys; i++) {
      const h = fnv('key:' + i);
      let lo = 0, hi = pts.length - 1, idx = 0;
      if (h > pts[hi][0]) idx = 0;          // ring wrap
      else { while (lo <= hi) { const m = (lo + hi) >> 1; if (pts[m][0] >= h) { idx = m; hi = m - 1; } else lo = m + 1; } }
      own[i] = pts[idx][1];
    }
    return own;
  }
  function ringSpread(R, own) {
    const c = {}; R.nodes.forEach(n => (c[n] = 0));
    Object.values(own).forEach(n => c[n]++);
    const vals = R.nodes.map(n => c[n]);
    const ideal = R.keys / R.nodes.length;
    const skew = Math.round((Math.max(...vals) / ideal) * 100) / 100;
    return { counts: c, skew };
  }
  function ringBars(R, sp) {
    return R.nodes.map(n => {
      const pct = (sp.counts[n] / R.keys) * 100;
      return `  ${n.padEnd(9)} ${bar(pct, 100 / R.nodes.length * 2, 22)} ${pct.toFixed(1)}%`;
    }).join('\n');
  }

  function cmdRing(cmd) {
    const rest = cmd.replace(/^ring\s*/i, '');
    const verb = (rest.split(' ')[0] || 'show').toLowerCase();
    const f = parseFlags(rest.slice(verb.length).trim());
    const R = ringState();

    if (verb === 'show' || verb === 'status') {
      const sp = ringSpread(R, ringOwners(R));
      print('ok', [
        `nodes            ${R.nodes.length}  (${R.nodes.join(', ')})`,
        `vnodes per node  ${R.vnodes}   →  ring par kul ${R.nodes.length * R.vnodes} points`,
        `keys             ${fmt(R.keys)}`,
        `sabse bhaari node ${sp.skew}x ideal share`,
        '',
        ringBars(R, sp),
      ].join('\n'));
      if (R.vnodes === 1) print('sys', `⚠️ vnodes = 1. Har node ring par sirf EK jagah baithta hai, isliye ` +
        `unke beech ki doori random hai — koi node dugna hissa le sakta hai. Isi ko <b>skew</b> kehte hain. ` +
        `<code>ring set vnodes 150</code> chalao.`);
      return rec({ kind: 'ring', op: 'show', nodes: R.nodes.length, vnodes: R.vnodes, skew: sp.skew });
    }

    if (verb === 'set' && /vnode/i.test(String(f._[0] || ''))) {
      const n = parseInt(f._[1], 10);
      if (!n || n < 1) err('400 — aise:  ring set vnodes 150');
      const before = ringSpread(R, ringOwners(R)).skew;
      R.vnodes = n;
      const sp = ringSpread(R, ringOwners(R));
      print('ok', [`vnodes = ${n}  (ring par ${R.nodes.length * n} points)`, '', ringBars(R, sp),
        '', `skew  ${before}x  →  ${sp.skew}x`].join('\n'));
      print('sys', n >= 50
        ? `✅ Har node ab ring par ${n} jagah baithta hai. Bahut saare chhote tukde milke har node ko lagbhag ` +
          `barabar hissa dete hain — aur node girne par uska load <b>baaki SABHI</b> mein bant jaata hai, ` +
          `sirf ek padosi par nahi. Yahi virtual nodes ka poora kaam hai.`
        : `⚠️ ${n} vnodes abhi bhi kam hain. Practice mein 100–200 per node use hote hain.`);
      return rec({ kind: 'ring', op: 'vnodes', vnodes: n, skew: sp.skew, skewBefore: before });
    }

    if (verb === 'add' || verb === 'remove' || verb === 'rm') {
      const name = f._[0] || (verb === 'add' ? 'node-' + (R.nodes.length + 1) : R.nodes[R.nodes.length - 1]);
      const before = ringOwners(R);
      const nBefore = R.nodes.length;
      if (verb === 'add') { if (R.nodes.includes(name)) err(`400 — '${name}' pehle se hai`); R.nodes.push(name); }
      else { const i = R.nodes.indexOf(name); if (i < 0) err(`400 — '${name}' hai hi nahi`); if (R.nodes.length <= 1) err('400 — aakhri node nahi hata sakte'); R.nodes.splice(i, 1); }
      const after = ringOwners(R);
      let moved = 0;
      for (let i = 0; i < R.keys; i++) if (before[i] !== after[i]) moved++;
      const ringPct = Math.round((moved / R.keys) * 1000) / 10;
      /* mod-N ke saath kitni move hoti */
      let modMoved = 0;
      const nAfter = R.nodes.length;
      for (let i = 0; i < R.keys; i++) if ((fnv('key:' + i) % nBefore) !== (fnv('key:' + i) % nAfter)) modMoved++;
      const modPct = Math.round((modMoved / R.keys) * 1000) / 10;
      const sp = ringSpread(R, after);
      print('ok', [
        `${verb === 'add' ? 'jodha' : 'hataaya'}           ${name}   (${nBefore} → ${nAfter} nodes)`,
        '',
        `hash ring        ${fmt(moved)} / ${fmt(R.keys)} keys move hui   =  ${ringPct}%   ${ringPct < 40 ? '✅' : ''}`,
        `hash % N hota to ${fmt(modMoved)} / ${fmt(R.keys)} keys move hoti  =  ${modPct}%   💥`,
        '',
        ringBars(R, sp),
      ].join('\n'));
      print('sys', `🎯 Ideal ${Math.round(100 / Math.max(nBefore, nAfter))}% hai — ${verb === 'add' ? 'utni keys toh naye node ko jaani hi thi' : 'hataaye gaye node ki utni keys toh baantni hi thi'}. ` +
        `Ring ne ${ringPct}% par kaam kar liya; <code>hash % N</code> ne ${modPct}% keys hila di. ` +
        `Aur har "move" ka matlab hai ek cache miss ya ek data transfer. Isiliye <code>% N</code> se sharding ` +
        `chhote system mein chalti hai aur badhte hi <b>har resize par poora cache thanda</b> kar deti hai.`);
      return rec({ kind: 'ring', op: verb === 'add' ? 'add' : 'remove', node: name, nodes: nAfter, movedPct: ringPct, modPct, vnodes: R.vnodes });
    }

    err('400 — aise:  ring show   |   ring set vnodes 150   |   ring add node-5   |   ring remove node-2');
  }

  /* =====================================================================
     BLOOM / HLL — "thoda galat, par 1000x sasta"
     ===================================================================== */
  function cmdBloom(cmd) {
    const f = parseFlags(cmd.replace(/^bloom\s*/i, ''));
    const n = parseInt(f.items, 10) || 1000000;
    let m, k;
    if (f.fp) {                                   // target false-positive se size nikalo
      const p = parseFloat(f.fp);
      if (!(p > 0 && p < 1)) err('400 — --fp 0 aur 1 ke beech ho:  bloom --items 1000000 --fp 0.01');
      m = Math.ceil(-n * Math.log(p) / (Math.LN2 * Math.LN2));
      k = Math.max(1, Math.round((m / n) * Math.LN2));
    } else {
      m = parseInt(f.bits, 10) || n * 10;
      k = parseInt(f.hashes, 10) || Math.max(1, Math.round((m / n) * Math.LN2));
    }
    const fp = Math.pow(1 - Math.exp(-k * n / m), k);
    const bloomBytes = m / 8;
    const exactBytes = n * 24;                    // ek set mein string key + pointer overhead
    print('ok', [
      `items            ${fmt(n)}`,
      `bits (m)         ${fmt(m)}   →  ${bytes(bloomBytes)}`,
      `hash functions   ${k}`,
      `false positive   ${(fp * 100).toFixed(3)}%   ("hai" bola par tha nahi)`,
      `false negative   0%   ← yeh KABHI nahi hota`,
      '',
      `exact set hota   ${bytes(exactBytes)}   →  bloom ${Math.round(exactBytes / bloomBytes)}x sasta`,
    ].join('\n'));
    print('sys', `🌸 Bloom filter ek hi sawaal ka jawab deta hai: <b>"yeh cheez shayad hai, ya pakka nahi hai?"</b> ` +
      `"Nahi hai" hamesha <b>sach</b> hota hai. "Hai" ${(fp * 100).toFixed(2)}% baar jhooth ho sakta hai — ` +
      `aur isiliye uske baad asli lookup karni padti hai. Faayda yeh hai ki ${(100 - fp * 100).toFixed(1)}% ` +
      `bekaar lookups <b>shuru mein hi</b> kat jaate hain. Isiliye LSM ki har SSTable par ek bloom hota hai, ` +
      `aur cache ke aage bhi (taaki "yeh key hai hi nahi" wali requests DB tak na jaayein). ` +
      `Ek kami: <b>delete nahi hota</b> (bit kisi aur item ka bhi ho sakta hai) — uske liye counting bloom chahiye.`);
    return rec({ kind: 'probabilistic', op: 'bloom', items: n, bits: m, hashes: k, fpRate: +(fp * 100).toFixed(3), bytes: bloomBytes, exactBytes });
  }

  function cmdHll(cmd) {
    const f = parseFlags(cmd.replace(/^hll\s*/i, ''));
    const n = parseInt(f.items, 10) || 100000000;
    const regs = parseInt(f.registers, 10) || 16384;
    const errPct = 1.04 / Math.sqrt(regs) * 100;
    const hllBytes = regs * 6 / 8;                 // 6 bits per register
    const exactBytes = n * 16;
    print('ok', [
      `unique items     ${fmt(n)}`,
      `registers        ${fmt(regs)}`,
      `memory           ${bytes(hllBytes)}   ← items ki sankhya se FARAK NAHI padta`,
      `standard error   ±${errPct.toFixed(2)}%`,
      '',
      `exact set hota   ${bytes(exactBytes)}   →  HLL ${fmt(Math.round(exactBytes / hllBytes))}x sasta`,
    ].join('\n'));
    print('sys', `📊 HyperLogLog "kitne UNIQUE hain" ka jawab deta hai — aur uski memory <b>fix</b> hai. ` +
      `10 lakh unique ho ya 100 crore, ${bytes(hllBytes)} hi lagega. Kaise? Woh values store hi nahi karta — ` +
      `sirf yeh yaad rakhta hai ki kisi hash mein shuru mein sabse zyada kitne zero dekhe. ` +
      `${errPct.toFixed(2)}% galti ke saath. <b>Aur asli sawaal yeh hai:</b> "aaj kitne unique visitors aaye" ` +
      `ke jawab mein 4,82,391 aur 4,84,100 mein kya farak padta hai? Kisi ko nahi. ` +
      `Par exact ginne ke liye ${bytes(exactBytes)} chahiye the. Yahi <b>approximate computing</b> ka sauda hai. ` +
      `Aur HLL <b>merge</b> ho sakte hain — isliye har server apna rakhe, aur baad mein sab jod lo.`);
    return rec({ kind: 'probabilistic', op: 'hll', items: n, registers: regs, errPct: +errPct.toFixed(2), bytes: hllBytes, exactBytes });
  }

  /* =====================================================================
     ID — unique ids at scale (UUIDv4 vs Snowflake vs ULID vs autoinc)
     ===================================================================== */
  const ID_KINDS = {
    uuid4:     { label: 'UUIDv4 (random)',     bytes: 16, sortable: false, sample: () => '3f2a7c91-8b4e-4d2f-a1c6-9e5b7d0a4382' },
    ulid:      { label: 'ULID',                bytes: 16, sortable: true,  sample: () => '01JQK7ZC5T8M3XA9F2VNBH6WDE' },
    snowflake: { label: 'Snowflake (64-bit)',  bytes: 8,  sortable: true,  sample: () => '1789234567890123456' },
    autoinc:   { label: 'AUTO_INCREMENT',      bytes: 8,  sortable: true,  sample: () => '4820193' },
  };

  function cmdId(cmd) {
    const rest = cmd.replace(/^id\s*/i, '');
    const verb = (rest.split(' ')[0] || '').toLowerCase();
    const f = parseFlags(rest.slice(verb.length).trim());

    if (verb === 'gen') {
      const kind = String(f._[0] || f.type || 'uuid4').toLowerCase();
      const K = ID_KINDS[kind];
      if (!K) err(`400 — type: ${Object.keys(ID_KINDS).join(', ')}   (aise: id gen snowflake --n 5)`);
      const n = Math.min(8, parseInt(f.n, 10) || 5);
      const rows = [];
      for (let i = 0; i < n; i++) {
        if (kind === 'uuid4') rows.push(K.sample().replace(/[0-9a-f]/g, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]));
        else if (kind === 'snowflake') rows.push(String(1789234567890123000 + i * 4096 + Math.floor(Math.random() * 400)));
        else if (kind === 'ulid') rows.push('01JQK7ZC' + String(i) + 'T8M3XA9F2VNBH6WD');
        else rows.push(String(4820193 + i));
      }
      print('ok', [`${K.label}   ${K.bytes} bytes   ${K.sortable ? 'time-sortable ✅' : 'random order ❌'}`, '',
        ...rows.map(r => '  ' + r)].join('\n'));
      if (kind === 'snowflake') print('sys', `❄️ Snowflake ka 64-bit ise <b>todta</b> hai: ` +
        `<code>41 bit timestamp | 10 bit machine id | 12 bit sequence</code>. ` +
        `Timestamp sabse aage hai — isliye ids <b>waqt ke kram mein</b> badhti hain. ` +
        `Machine id se do servers kabhi takraate nahi, aur 12-bit sequence se ek machine ` +
        `ek millisecond mein 4096 ids bana sakti hai. Koi coordination nahi, koi central counter nahi.`);
      if (kind === 'uuid4') print('sys', `🎲 UUIDv4 poori tarah random hai. Takraane ka darr nahi, ` +
        `koi coordination nahi — par <b>koi kram bhi nahi</b>. <code>id bench</code> chalao aur dekho ki ` +
        `is "koi kram nahi" ki keemat kya hai.`);
      return rec({ kind: 'id', op: 'gen', type: kind, n, sortable: K.sortable });
    }

    if (verb === 'bench') {
      const kind = String(f.type || f._[0] || 'uuid4').toLowerCase();
      const K = ID_KINDS[kind];
      if (!K) err(`400 — type: ${Object.keys(ID_KINDS).join(', ')}   (aise: id bench --type uuid4 --rows 1000000)`);
      const rows = parseInt(f.rows, 10) || 1000000;
      /* random insert = har baar alag page → splits + random I/O */
      const splitRate = K.sortable ? 0.002 : 0.34;
      const splits = Math.round(rows * splitRate);
      const perRow = K.sortable ? 0.006 : 0.043;
      const ms = Math.round(rows * perRow);
      const idxMB = Math.round(rows * (K.bytes + 12) / 1048576 * (K.sortable ? 1 : 1.45));
      print('ok', [
        `type             ${K.label}`,
        `rows inserted    ${fmt(rows)}`,
        `insert order     ${K.sortable ? 'SEQUENTIAL — hamesha aakhri page par' : 'RANDOM — har baar B-tree mein alag jagah'}`,
        `page splits      ${fmt(splits)}   ${K.sortable ? '' : '💥'}`,
        `index size       ${idxMB} MB   ${K.sortable ? '' : '(fragmentation ke saath)'}`,
        `kul waqt         ${fmt(ms)} ms   (${fmt(Math.round(rows / (ms / 1000)))} rows/sec)`,
        `cursor pagination${K.sortable ? '  ✅ id akela tie-breaker kaafi hai' : '  ❌ id se sort ka koi matlab nahi'}`,
      ].join('\n'));
      print('sys', K.sortable
        ? `✅ Sorted id ka matlab hai har naya row B-tree ke <b>aakhri page</b> par jaata hai — ` +
          `wahi page memory mein pehle se garam hai. Koi split nahi, koi random I/O nahi. ` +
          `Aur bonus: <code>(created_at, id)</code> wala cursor tie-breaker <b>apne aap</b> sahi kaam karta hai, ` +
          `kyunki id ka kram waqt ka kram hai.`
        : `💥 Random id ka matlab hai har insert B-tree mein <b>kahin bhi</b> ja sakta hai. Woh page shayad ` +
          `disk se laana pade, aur bharne par split ho. Isiliye ${fmt(splits)} splits aur ${Math.round(perRow / 0.006)}x dheeme writes. ` +
          `Aur doosri, chhupi hui kami: UUIDv4 se sort karne ka <b>koi matlab nahi</b> — isliye woh cursor ` +
          `pagination ka tie-breaker nahi ban sakta. <b>Ilaaj:</b> external id UUID rakho (URL-safe, guess-proof), ` +
          `par <b>primary key</b> ko sortable rakho (bigint ya Snowflake/ULID).`);
      return rec({ kind: 'id', op: 'bench', type: kind, rows, splits, ms, idxMB, sortable: K.sortable });
    }

    err('400 — aise:  id gen snowflake --n 5   |   id bench --type uuid4 --rows 1000000');
  }

  /* =====================================================================
     NET — protocols, handshakes, load balancer layers
     ===================================================================== */
  function netState() {
    if (!sim.sys.net) sim.sys.net = { rtt: 40, protocol: 'h1', tls: true };
    return sim.sys.net;
  }

  function cmdNet(cmd) {
    const rest = cmd.replace(/^net\s*/i, '');
    const verb = (rest.split(' ')[0] || '').toLowerCase();
    const f = parseFlags(rest.slice(verb.length).trim());
    const N = netState();
    const rtt = parseInt(f.rtt, 10) || N.rtt;
    const proto = String(f.protocol || N.protocol).toLowerCase();

    if (verb === 'trace') {
      const warm = !!f.warm;
      const dns = warm ? 0 : 30;
      const tcp = warm ? 0 : (proto === 'h3' ? 0 : rtt);              // QUIC ka handshake TLS ke saath hai
      const tls = warm ? 0 : (proto === 'h3' ? rtt : rtt * 2);        // TLS 1.3 = 1 RTT, QUIC = 0-RTT ke saath merged
      const ttfb = rtt + 20;
      const total = dns + tcp + tls + ttfb;
      /* warm par setup 0 hai — par sabak ke liye COLD ka kharch chahiye */
      const coldSetup = 30 + (proto === 'h3' ? 0 : rtt) + (proto === 'h3' ? rtt : rtt * 2);
      print('ok', [
        `protocol         ${proto.toUpperCase()}   RTT ${rtt} ms   connection ${warm ? 'WARM (reused)' : 'COLD (nayi)'}`,
        '',
        `  DNS lookup        ${String(dns).padStart(4)} ms  ${bar(dns, total, 18)}`,
        `  TCP handshake     ${String(tcp).padStart(4)} ms  ${bar(tcp, total, 18)}  ${proto === 'h3' ? '(QUIC — TCP hai hi nahi)' : '(SYN → SYN-ACK → ACK)'}`,
        `  TLS handshake     ${String(tls).padStart(4)} ms  ${bar(tls, total, 18)}`,
        `  server + response ${String(ttfb).padStart(4)} ms  ${bar(ttfb, total, 18)}`,
        `  ─────────────────────────`,
        `  TTFB              ${String(total).padStart(4)} ms`,
      ].join('\n'));
      print('sys', warm
        ? `♻️ Warm connection par saara setup <b>gayab</b> ho gaya — sirf ek RTT + server ka waqt bacha. ` +
          `Isiliye connection pooling / keep-alive itna matter karta hai: har NAYI connection ` +
          `${coldSetup} ms ka tax leti hai <b>data bhejne se pehle hi</b> (${total} ms ki jagah ${coldSetup + ttfb} ms). Aur isiliye har request par nayi ` +
          `HTTP connection banana (purane clients ka classic bug) latency dugni kar deta hai.`
        : `🤝 Data ka ek byte jaane se pehle hi ${dns + tcp + tls} ms nikal gaya. ` +
          (proto === 'h3'
            ? `QUIC (HTTP/3) UDP par chalta hai, isliye TCP handshake hai hi nahi — TLS usi ke saath ho jaata hai. ` +
              `Isiliye cold connection par h3 sabse tez hai, aur mobile par (jahan network badalta rehta hai) ` +
              `woh connection ko IP se nahi, ek <b>connection id</b> se pehchanta hai — WiFi se 4G par jaane par bhi connection zinda rehta hai.`
            : `TCP ko pehle ek RTT chahiye, phir TLS ko aur. <code>net trace --protocol h3</code> se farak dekho, ` +
              `aur <code>net trace --warm</code> se dekho ki connection reuse kitna bachaata hai.`));
      return rec({ kind: 'net', op: 'trace', protocol: proto, rtt, warm, dns, tcp, tls, total });
    }

    if (verb === 'compare') {
      const assets = parseInt(f.assets, 10) || 60;
      const conns = 6;                                    // browser ki per-host limit (HTTP/1.1)
      const h1 = Math.round((assets / conns) * (rtt + 15) + rtt * 3);
      const h2 = Math.round(rtt * 3 + assets * 1.2 + rtt);
      const h3 = Math.round(rtt * 1 + assets * 1.2 + rtt);
      print('ok', [
        `${assets} assets, RTT ${rtt} ms`,
        '',
        `  HTTP/1.1   ${String(h1).padStart(5)} ms  ${bar(h1, h1, 20)}  ${conns} connections, har ek par ek-ek karke`,
        `  HTTP/2     ${String(h2).padStart(5)} ms  ${bar(h2, h1, 20)}  ek connection, multiplexed`,
        `  HTTP/3     ${String(h3).padStart(5)} ms  ${bar(h3, h1, 20)}  QUIC — packet loss par baaki streams nahi rukti`,
      ].join('\n'));
      print('sys', `🚦 <b>HTTP/1.1</b> mein ek connection par ek waqt mein ek hi request — isliye browser 6 connections ` +
        `kholta hai aur baaki assets line mein lagti hain. Ise <b>head-of-line blocking</b> kehte hain. ` +
        `<b>HTTP/2</b> ne ek hi connection par saari requests multiplex kar di — par woh TCP par hai, ` +
        `aur TCP mein ek packet kho jaaye toh <b>saari</b> streams ruk jaati hain (HOL blocking bas ek layer neeche chala gaya). ` +
        `<b>HTTP/3</b> QUIC (UDP) par hai jahan har stream apne aap mein hai — isliye packet loss sirf usi stream ko rokta hai. ` +
        `<br><br>Aur yahi wajah hai ki HTTP/2 ke baad "sprite sheets" aur "domain sharding" jaisi purani tricks ` +
        `ab <b>nuksaan</b> karti hain — woh HTTP/1.1 ki 6-connection limit ke liye bani thi.`);
      return rec({ kind: 'net', op: 'compare', assets, rtt, h1, h2, h3 });
    }

    if (verb === 'lb') {
      const layer = String(f._[0] || f.layer || '').toLowerCase().replace('layer', 'l');
      if (!/^l?[47]$/.test(layer)) err('400 — aise:  net lb l4   |   net lb l7');
      const l4 = /4/.test(layer);
      print('ok', [
        `${l4 ? 'LAYER 4 (transport)' : 'LAYER 7 (application)'}`,
        '',
        `  dekhta hai       ${l4 ? 'IP + port — packets forward karta hai' : 'poori HTTP request — path, headers, cookies'}`,
        `  routing          ${l4 ? 'connection ke hisaab se (round-robin, least-conn)' : 'content ke hisaab se (/api → svc-a, /img → svc-b)'}`,
        `  TLS              ${l4 ? 'pass-through — LB padh hi nahi sakta' : 'terminate karta hai (isliye decrypt kar sakta hai)'}`,
        `  WebSocket        ${l4 ? '✅ persistent connection seedha nikal jaati hai' : '⚠️ upgrade support chahiye, aur woh state rakhta hai'}`,
        `  retry / rewrite  ${l4 ? '❌ nahi kar sakta — use request dikhti hi nahi' : '✅ kar sakta hai'}`,
        `  speed            ${l4 ? 'bahut tez, bahut kam CPU' : 'thoda mehenga (parse + decrypt)'}`,
      ].join('\n'));
      print('sys', l4
        ? `🔌 L4 sirf packets aage badhata hai — use pata hi nahi ki andar HTTP hai ya kuch aur. ` +
          `Isliye woh bahut tez hai aur <b>persistent connections</b> (WebSocket, gRPC streams, database connections) ` +
          `ke liye sahi hai. Kharch: woh path se route nahi kar sakta, na hi failed request retry kar sakta hai.`
        : `🧠 L7 poori request padhta hai, isliye path/header se route kar sakta hai, retry kar sakta hai, ` +
          `rate limit laga sakta hai aur TLS terminate kar sakta hai. Zyadatar HTTP traffic ke liye yahi chahiye. ` +
          `Par WebSocket ke liye dhyaan rakho: woh connection ghanton chalti hai, aur L7 LB ko har ek ka state rakhna padta hai.`);
      return rec({ kind: 'net', op: 'lb', layer: l4 ? 4 : 7 });
    }

    err("400 — aise:  net trace [--protocol h1|h2|h3] [--warm] [--rtt 40]   |   net compare --assets 60   |   net lb l4|l7");
  }

  /* =====================================================================
     STREAM — queue vs log, consumer groups, windowing, late events
     ===================================================================== */
  function cmdStream(cmd) {
    const rest = cmd.replace(/^stream\s*/i, '');
    const verb = (rest.split(' ')[0] || '').toLowerCase();
    const f = parseFlags(rest.slice(verb.length).trim());

    if (verb === 'window') {
      const size = parseInt(f.size, 10) || 60;
      const watermark = f.watermark != null ? parseInt(f.watermark, 10) : 0;
      const events = parseInt(f.events, 10) || 100000;
      const latePct = f.late != null ? parseFloat(f.late) : 3;
      const late = Math.round(events * latePct / 100);
      /* watermark ke andar aaye late events pakde jaate hain */
      const caught = watermark <= 0 ? 0 : Math.round(late * Math.min(1, watermark / 30));
      const dropped = late - caught;
      const onTime = events - late;
      print('ok', [
        `window size      ${size}s (tumbling)`,
        `watermark        ${watermark ? watermark + 's — itni der tak late events ka intezaar' : 'nahi — window band, matlab band'}`,
        '',
        `  time par aaye    ${fmt(onTime)}`,
        `  late aaye        ${fmt(late)}   (${latePct}%)`,
        `    ↳ pakde gaye   ${fmt(caught)}   ${caught ? '✅' : ''}`,
        `    ↳ chhoot gaye  ${fmt(dropped)}   ${dropped ? '❌ ginti mein aaye hi nahi' : '✅'}`,
        '',
        `  reported count   ${fmt(onTime + caught)}   (asli ${fmt(events)}, galti ${((dropped / events) * 100).toFixed(2)}%)`,
      ].join('\n'));
      print('sys', watermark
        ? `🌊 Watermark stream processing ka dil hai: woh kehta hai <b>"main maan raha hoon ki ${watermark}s se ` +
          `purana koi event ab nahi aayega"</b>. Us waqt tak window khuli rehti hai. Bada watermark = kam data khoya, ` +
          `par natija utna hi <b>der</b> se milta hai. Yeh seedha tradeoff hai: <b>completeness vs latency</b>. ` +
          `Aur is sawaal ka jawab business deta hai, engineering nahi.`
        : `⚠️ Bina watermark ke window <b>ghadi</b> ke hisaab se band hoti hai, event ke waqt ke hisaab se nahi. ` +
          `Mobile phone jo tunnel mein tha, uske ${fmt(dropped)} events 8 second baad aaye — aur seedha ` +
          `phenk diye gaye. Yeh chup-chaap galat numbers banata hai. <code>--watermark 10</code> ke saath dobara chalao.`);
      return rec({ kind: 'stream', op: 'window', size, watermark, events, late, caught, dropped });
    }

    if (verb === 'replay') {
      const from = f.from != null ? String(f.from) : '0';
      const hasLog = !/^(queue|sqs|rabbit)$/i.test(String(sim.sys.streamKind || 'log'));
      print(hasLog ? 'ok' : 'err', hasLog
        ? [`offset ${from} se replay shuru`, ``,
           `  events replayed  ${fmt(4200000)}`,
           `  consumer group   analytics-v2  (naya group, apna offset)`,
           `  purana group     analytics-v1  par koi asar nahi  ✅`].join('\n')
        : `Queue se replay ho hi nahi sakta — message consume hote hi delete ho gaya tha.`);
      print('sys', hasLog
        ? `⏪ <b>Yahi queue aur log ka asli farak hai.</b> Queue mein message padha ki gaya. Log (Kafka) mein ` +
          `message <b>retention tak rehta hai</b>, aur har consumer group apna offset rakhta hai. ` +
          `Isliye: naya feature banaya? Purana data usi log se replay kar lo. Bug se galat aggregation bani? ` +
          `Offset peeche karo aur dobara chala do. Nayi service aayi? Woh shuru se poora itihaas padh sakti hai. ` +
          `<b>Yeh ek capability hai jo queue de hi nahi sakti</b> — aur aksar yahi Kafka chunne ka asli karan hota hai.`
        : `❌ Yahi queue ki hadd hai. Agar tumhe replay, ya ek hi data ke kai independent consumers, ` +
          `ya "shuru se poora itihaas" chahiye — toh tumhe queue nahi, <b>log</b> chahiye.`);
      return rec({ kind: 'stream', op: 'replay', from, ok: hasLog });
    }

    if (verb === 'partitions' || verb === 'groups') {
      const parts = parseInt(f.partitions, 10) || 6;
      const cons = parseInt(f.consumers, 10) || 3;
      const active = Math.min(cons, parts);
      const idle = Math.max(0, cons - parts);
      const per = Math.ceil(parts / active);
      print('ok', [
        `partitions       ${parts}`,
        `consumers        ${cons}   →  ${active} kaam par, ${idle} khaali`,
        `har consumer     ~${per} partition`,
        '',
        `max parallelism  ${parts}   ← partitions se ZYADA consumers bekaar hain`,
      ].join('\n'));
      print('sys', idle
        ? `😴 ${idle} consumers bilkul khaali baithe hain. Ek partition ek waqt mein <b>ek hi</b> consumer ko milta hai ` +
          `(warna ordering toot jaati). Isliye <b>partitions hi tumhari max parallelism hain</b> — aur unhe badhana ` +
          `baad mein mehenga hai, kyunki key → partition ka mapping badal jaata hai. Partition count shuru mein hi ` +
          `soch ke chuno: aaj ki zaroorat se 2–3x.`
        : `✅ Har consumer ko ~${per} partition mila. Ordering sirf <b>ek partition ke andar</b> guarantee hai — ` +
          `isliye jin cheezon ka kram matter karta hai unhe <b>ek hi key</b> par bhejo (jaise <code>user_id</code>), ` +
          `taaki woh hamesha ek hi partition mein jaayein.`);
      return rec({ kind: 'stream', op: 'partitions', partitions: parts, consumers: cons, idle, maxParallel: parts });
    }

    err('400 — aise:  stream window --size 60 --watermark 10   |   stream replay --from 0   |   stream partitions --partitions 6 --consumers 8');
  }

  /* =====================================================================
     BOOK — contention: do log, ek seat
     ===================================================================== */
  function bookState() {
    if (!sim.sys.booking) sim.sys.booking = { mode: 'none', seats: {}, holds: {} };
    return sim.sys.booking;
  }

  function cmdBook(cmd) {
    const rest = cmd.replace(/^book\s*/i, '');
    const verb = (rest.split(' ')[0] || '').toLowerCase();
    const f = parseFlags(rest.slice(verb.length).trim());
    const B = bookState();

    if (verb === 'status') {
      const sold = Object.keys(B.seats).length, held = Object.keys(B.holds).length;
      print('ok', [
        `mode             ${B.mode}`,
        `seats sold       ${sold}${sold ? '  (' + Object.keys(B.seats).join(', ') + ')' : ''}`,
        `active holds     ${held}${held ? '  (' + Object.keys(B.holds).join(', ') + ')' : ''}`,
      ].join('\n'));
      return rec({ kind: 'book', op: 'status', mode: B.mode, sold, held });
    }

    if (verb === 'reset') { B.seats = {}; B.holds = {}; print('ok', 'Saare seats khaali.'); return rec({ kind: 'book', op: 'reset', mode: B.mode }); }

    if (verb === 'seat' || verb === 'hold' || verb === 'confirm') {
      const seat = f._[0];
      if (!seat) err('400 — aise:  book seat A1 --concurrent 2');
      const conc = Math.max(1, parseInt(f.concurrent, 10) || 1);
      const mode = B.mode;

      if (verb === 'hold') {
        const ttl = parseInt(f.ttl, 10) || 600;
        if (B.seats[seat]) { print('err', `${seat} pehle hi bik chuka hai.`); return rec({ kind: 'book', op: 'hold', seat, ok: false, mode }); }
        B.holds[seat] = ttl;
        print('ok', `${seat} par ${ttl}s ka HOLD lag gaya (checkout ke liye).`);
        print('sys', `🎟️ Reservation pattern: seat ko <b>abhi</b> lock karo, par ek <b>TTL</b> ke saath. ` +
          `User ke paas ${Math.round(ttl / 60)} minute hain payment poora karne ko. ` +
          `Yeh ek DB lock se behtar hai kyunki lock aadmi ke sochne ke waqt tak nahi latakta — ` +
          `aur agar user chhod ke chala gaya, toh seat <b>apne aap</b> wapas aa jaati hai. ` +
          `TTL ke bina abandoned checkouts poora inventory kha jaate hain.`);
        return rec({ kind: 'book', op: 'hold', seat, ttl, ok: true, mode });
      }

      /* seat = kharidne ki koshish, conc log ek saath */
      if (B.holds[seat] && verb !== 'confirm') {
        print('err', `${seat} abhi kisi ke HOLD mein hai — ${B.holds[seat]}s baaki.`);
        print('sys', `✅ Hold ne doosre khareedaar ko bina "sold out" bole rok diya. Use turant pata chal gaya, ` +
          `aur agar pehla user chhod deta hai toh seat ${B.holds[seat]}s mein wapas mil jaayegi.`);
        return rec({ kind: 'book', op: 'seat', seat, ok: false, blockedByHold: true, mode });
      }

      const already = !!B.seats[seat];
      let sold = 0, rejected = 0, doubleBooked = false;
      if (already) { rejected = conc; }
      else if (mode === 'none') { sold = conc; doubleBooked = conc > 1; B.seats[seat] = true; }
      else { sold = 1; rejected = conc - 1; B.seats[seat] = true; }

      const lines = [`seat             ${seat}`, `ek saath koshish  ${conc}`, `mode             ${mode}`, ''];
      if (already) lines.push(`  ❌ ${conc} × 409 Conflict — pehle hi bik chuka hai`);
      else {
        lines.push(`  ✅ ${sold} × 201 Created${doubleBooked ? '   💥 EK HI SEAT, ' + sold + ' LOG!' : ''}`);
        if (rejected) lines.push(`  ❌ ${rejected} × 409 Conflict — kisi aur ne pehle le liya`);
      }
      print(doubleBooked ? 'err' : 'ok', lines.join('\n'));

      if (doubleBooked) print('sys', `💥 <b>Double booking.</b> Dono requests ne "seat khaali hai?" ek saath poochha, ` +
        `dono ko "haan" mila, aur dono ne likh diya. Yeh <b>check-then-act</b> race hai — aur woh testing mein ` +
        `lagbhag kabhi nahi dikhti kyunki uske liye do requests ka <b>theek</b> ek saath aana zaroori hai. ` +
        `Production mein woh roz hoti hai. Ab try karo: <code>sim set booking.mode pessimistic</code> ` +
        `(row lock) ya <code>optimistic</code> (version check).`);
      else if (mode === 'pessimistic') print('sys', `🔒 <b>Pessimistic:</b> pehli request ne row par ` +
        `<code>SELECT … FOR UPDATE</code> se lock liya; doosri wahin ruk gayi aur lock milte hi use ` +
        `"already sold" mila. Seedha aur pakka. Kharch: lock jitni der lagta hai, us seat par baaki sab ruke rehte hain — ` +
        `isliye lock ke <b>andar</b> kabhi network call mat karo.`);
      else if (mode === 'optimistic') print('sys', `🔁 <b>Optimistic:</b> dono ne bina lock ke padha, par update ` +
        `<code>WHERE version = ?</code> ke saath tha. Pehli jeet gayi (version badal gaya), doosri ne 0 rows update kiye ` +
        `aur use pata chal gaya ki woh haar gayi. Conflict kam hon toh yeh <b>tez</b> hai kyunki koi rukta hi nahi. ` +
        `Par ek hot row (jaise sabse popular seat) par sab bar-bar haarenge — wahan pessimistic behtar hai.`);
      else if (mode === 'reservation') print('sys', `🎟️ <b>Reservation:</b> kharidne se pehle ` +
        `<code>book hold ${seat} --ttl 600</code> lagao — user ko checkout ka waqt milta hai bina seat gawaaye.`);

      return rec({ kind: 'book', op: 'seat', seat, concurrent: conc, mode, sold, rejected, doubleBooked, already });
    }

    err('400 — aise:  book seat A1 --concurrent 2   |   book hold A1 --ttl 600   |   book status   |   book reset');
  }

  function cmdHelp() {
    print('ok', [
      'REQUESTS',
      '  GET /api/v1/transactions?page=1&limit=50      list (offset paging)',
      '  GET /api/v1/transactions?cursor=<tok>&limit=50 list (keyset paging)',
      "  POST /v1/payments -H 'Idempotency-Key: abc'    write",
      '  GET /health                                    health check',
      '  ... -n 30                                      same request 30 baar',
      '',
      'DATABASE',
      '  show tables                                    tables + sizes',
      '  EXPLAIN SELECT ... FROM t WHERE ... LIMIT n OFFSET m',
      '  CREATE INDEX ix ON transactions(user_id, created_at)',
      '  DROP INDEX ix ON transactions        show indexes on transactions',
      '',
      'SYSTEM',
      '  sim status                                     poora dashboard',
      '  sim set api.pagination cursor        sim set pool.size 200',
      '  sim add cache --ttl 60 --jitter 20   sim add timeout ledger 500',
      '  sim add retry ledger --max 3 --backoff exp --jitter full',
      '  sim add breaker ledger --threshold 0.5    sim add fallback ledger "stale"',
      '  sim add admission --max-concurrent 150000 --queue 8',
      '  sim add ratelimit --rps 100 --burst 200   sim add bulkhead ledger --max 20',
      '  sim inject latency ledger 3000       sim inject down ledger',
      '  sim inject long-tx --holds 45        sim inject flash',
      '  sim scale app 40 | replicas 5 | pool 200      sim precompute      sim reset',
      '',
      'OBSERVABILITY',
      '  load --rps 500 --duration 8 --pattern deep-page',
      '        patterns: shallow, deep-page, cursor, detail, flash',
      '  trace <request>       metrics       slo --availability 99.9',
      '  estimate --users 12000000 --rps 500 --bytes 2048',
      '  cursor decode <token>',
      '',
      'AUTH',
      "  sim set api.auth header              identity token se (sahi)",
      "  sim set api.auth body                identity query/body se (spoofable)",
      "  GET /v1/transactions?user_id=7 -H 'Authorization: Bearer u7'",
      '',
      'CACHE LAB',
      "  cache sim --policy lru --size 3 --keys 'a b a b c d e f a b'",
      '        policies: lru, lfu, fifo',
      '  cache hotkey --key post:celeb42 --rps 50000 --replicas 8',
      '  cache coalesce --misses 5000 --on',
      '',
      'MIGRATION LAB',
      '  migrate status        migrate dual-write on      migrate backfill --batch 5000',
      '  migrate verify        migrate cutover            migrate rollback',
      '',
      'STORAGE ENGINE',
      '  sim set db.engine lsm | postgres',
      '  bench write --rows 100000    bench read --rows 100000    bench compact',
      '',
      'NETWORK',
      '  net trace [--protocol h1|h2|h3] [--warm] [--rtt 40]',
      '  net compare --assets 60          net lb l4 | l7',
      '',
      'HASH RING',
      '  ring show     ring set vnodes 150     ring add node-5     ring remove node-2',
      '',
      'IDs',
      '  id gen uuid4 | ulid | snowflake | autoinc --n 5',
      '  id bench --type uuid4 --rows 1000000',
      '',
      'PROBABILISTIC',
      '  bloom --items 1000000 --fp 0.01      hll --items 100000000',
      '',
      'STREAMS',
      '  stream window --size 60 --watermark 10',
      '  stream replay --from 0               stream partitions --partitions 6 --consumers 8',
      '',
      'CONTENTION',
      '  sim set booking.mode none|optimistic|pessimistic|reservation',
      '  book seat A1 --concurrent 2          book hold A1 --ttl 600      book status',
    ].join('\n'));
    return rec({ kind: 'help' });
  }

  /* =====================================================================
     DISPATCH
     ===================================================================== */
  function exec(norm) {
    for (const r of sim.responses) {
      const m = norm.match(r.re);
      if (m) {
        if (r.mutate) r.mutate(sim, m);
        const text = typeof r.out === 'function' ? r.out(sim, m) : r.out;
        if (text) print(r.err ? 'err' : 'ok', text);
        rec({ kind: 'custom', matched: String(r.re) });
        return;
      }
    }
    if (/^help\b/i.test(norm)) return cmdHelp();
    if (/^clear\b/i.test(norm)) { out.innerHTML = ''; return; }
    if (/^curl\s/i.test(norm)) {
      let c = norm.replace(/^curl\s+/i, '').replace(/(^|\s)-[isSL]+(\s|$)/g, ' ');
      const xm = c.match(/-X\s+(\w+)\s*/i);
      if (xm) c = xm[1].toUpperCase() + ' ' + c.replace(/-X\s+\w+\s*/i, '');
      else if (!/^(GET|POST|PUT|PATCH|DELETE)\s/i.test(c)) c = 'GET ' + c;
      return cmdHttp(c.replace(/\s+/g, ' ').trim());
    }
    if (/^(GET|POST|PUT|PATCH|DELETE)\s/i.test(norm)) return cmdHttp(norm);
    if (/^explain\b/i.test(norm)) return cmdExplain(norm);
    if (/^create\s+(unique\s+)?index\b/i.test(norm)) return cmdCreateIndex(norm);
    if (/^drop\s+index\b/i.test(norm)) return cmdDropIndex(norm);
    if (/^show\s+index(es)?\b/i.test(norm)) return cmdShowIndexes(norm);
    if (/^show\s+tables\b/i.test(norm)) return cmdShowTables();
    if (/^sim\b/i.test(norm)) return cmdSim(norm);
    if (/^load\b/i.test(norm)) return cmdLoad(norm);
    if (/^trace\b/i.test(norm)) return cmdTrace(norm);
    if (/^metrics\b/i.test(norm)) return cmdMetrics();
    if (/^slo\b/i.test(norm)) return cmdSlo(norm);
    if (/^estimate\b/i.test(norm)) return cmdEstimate(norm);
    if (/^cursor\b/i.test(norm)) return cmdCursor(norm);
    if (/^cache\b/i.test(norm)) return cmdCache(norm);
    if (/^migrate\b/i.test(norm)) return cmdMigrate(norm);
    if (/^bench\b/i.test(norm)) return cmdBench(norm);
    if (/^ring\b/i.test(norm)) return cmdRing(norm);
    if (/^bloom\b/i.test(norm)) return cmdBloom(norm);
    if (/^hll\b/i.test(norm)) return cmdHll(norm);
    if (/^id\b/i.test(norm)) return cmdId(norm);
    if (/^net\b/i.test(norm)) return cmdNet(norm);
    if (/^stream\b/i.test(norm)) return cmdStream(norm);
    if (/^book\b/i.test(norm)) return cmdBook(norm);
    err(`command samajh nahi aaya: '${norm.split(' ')[0]}'. 'help' likho.`);
  }
};
