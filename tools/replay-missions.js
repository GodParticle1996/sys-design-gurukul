#!/usr/bin/env node
'use strict';
const { loadApp } = require('../dev/load-app');
const standin = require('../dev/rewrite/standin-re');

/* Positive and adversarial replays use the actual browser terminal renderer.
   No hint scraping, synthetic success records, Docker or network requests. */
function run(options = {}) {
  const app = loadApp();
  const failures = [];
  let checks = 0, commands = 0, missions = 0, omissions = 0, fuzz = 0;
  function check(value, message) { if (!value) failures.push(message); else checks++; }
  function send(t, command, label) {
    commands++;
    let output = [];
    try {
      const before = t.out.children.length;
      // The headless DOM stores innerHTML separately from textContent for sys lines.
      output = t.run(command).map((line, i) => ({ ...line, text: line.text || t.out.children[before + i].innerHTML }));
    } catch (e) { failures.push(`${label}: uncaught ${e.message} for ${JSON.stringify(command)}`); }
    check(!output.some(x => /^simulator error:/.test(x.text)), `${label}: internal simulator error for ${JSON.stringify(command)}`);
    if (label !== 'engine/live-state-gate' && t.sim?.stage?.verify && t.sim.stage.tasks.every(task => task.check(t.sim))) {
      check(t.sim.stage.verify(t.sim), `${label}: every task ticks but final verify fails after ${command}`);
    }
    return output;
  }
  const garbage = [
    '', '   ', '\t\n', 'unknown', 'sudo unknown', 'rm -rf /', 'DELETE /everything', 'GET', 'POST', 'curl',
    'GET /api/v1/missing', 'GET /api/v1/transactions?x=%ZZ', 'GET /api/v1/transactions?limit=-1',
    'GET /api/v1/transactions?limit=NaN', 'GET /api/v1/transactions?offset=-1', 'GET /api/v1/transactions -n nope',
    'GET /api/v1/transactions -H', 'GET /api/v1/transactions -H "open', 'load --rps -1', 'load --duration NaN',
    'load --rps Infinity', 'load --rps', 'load --unknown 500', 'load --_ nope', 'load --__proto__ value',
    'sim set api null', 'sim set db.tables null', 'sim set db.tables.transactions.rows 0', 'sim set records true',
    'sim set __proto__.polluted true', 'sim set constructor.prototype.polluted true', 'sim set fake.countTotal false',
    'sim set api.idempotency bananas', 'sim set api.auth invalid', 'sim set pool.size -1', 'sim scale pool -1',
    'sim scale app Infinity', 'sim inject latency', 'sim inject latency ledger nope', 'sim inject error ledger 5',
    'sim add timeout ledger -1', 'sim add retry ledger --max -3', 'sim add retry ledger --jitter bananas',
    'sim add cache --hit-rate 5', 'sim add cache --ttl nope', 'sim add breaker ledger --threshold 7',
    'sim add fallback __proto__ forged', 'CREATE INDEX', 'CREATE INDEX empty ON transactions()',
    'CREATE INDEX bad ON absent(x)', 'DROP INDEX absent', 'EXPLAIN', 'EXPLAIN SELECT * FROM absent',
    'SHOW INDEXES ON absent', 'cursor decode garbage', 'cursor decode e30', 'cache sim --policy banana',
    'cache coalesce --misses -5', 'cache coalesce --on false', 'cache hotkey --replicas -1',
    'bench unknown', 'ring set vnodes 999999999', 'ring remove missing', 'bloom --fp 1', 'bloom --fp -1',
    'hll --registers nope', 'id gen invalid', 'net trace --protocol invalid', 'net compare --assets nope',
    'stream window --late 101', 'stream partitions --consumers -1', 'book seat', 'book seat __proto__',
    'book hold A1 --ttl -1', 'trace nonsense', 'trace GET /missing',
  ];

  app.missions.filter(m => !options.only || m.level.id === options.only || m.id === options.only).forEach(m => {
    missions++;
    const { stage, id } = m;
    check(Array.isArray(stage.solution) && stage.solution.length > 0, `${id}: explicit solution[] missing`);
    check(typeof stage.verify === 'function', `${id}: live-state verify() missing`);
    check((stage.hints || []).length >= 3, `${id}: nudge, stronger hint and near-answer required`);
    if (!Array.isArray(stage.solution) || !stage.solution.length) return;
    check(JSON.stringify(stage.hints[2].split('\n').slice(1)) === JSON.stringify(stage.solution), `${id}: hint 3 differs from solution`);
    check([stage.goal, stage.successText, ...stage.tasks.map(t => t.text), ...stage.hints].every(text => !standin.test(text)), `${id}: mission prose contains a pronoun stand-in`);
    const original = JSON.stringify(stage.sys);
    const t = app.terminal(stage);
    check(!stage.success(t.sim), `${id}: fresh mission already succeeds`);
    const solutionOutput = [];
    stage.solution.forEach((command, i) => {
      solutionOutput.push(...send(t, command, id));
      check(t.sim.done === (i === stage.solution.length - 1), `${id}: win must occur only at final step (${i + 1}/${stage.solution.length}, done=${t.sim.done})`);
    });
    if (m.level.id === 'breaker') {
      const opened = solutionOutput.filter(x => x.text.startsWith('🔌 ledger: ⚡ CIRCUIT OPEN'));
      check(opened.length === 1, `${id}: solution must print exactly one OPEN transition`);
      check(opened[0]?.text.includes('pichhle 20s mein 4 mein se 4 calls fail (hadd 50%). Agle 30s') &&
        opened[0].text.includes('fallback jawab dega.'), `${id}: OPEN message lost real window counts, settings or fallback`);
    }
    check(t.won === 1, `${id}: completion callback must run exactly once`);
    stage.tasks.forEach((task, index) => check(!!task.check(t.sim), `${id}: checklist task ${index + 1} false at win`));
    check(stage.verify(t.sim), `${id}: final live-state verification false`);
    send(t, 'help', id);
    check(t.won === 1, `${id}: post-win command awarded completion again`);
    check(JSON.stringify(stage.sys) === original, `${id}: mission mutated shared initial sys data`);

    // Each intended step contributes evidence or an actual necessary change.
    stage.solution.forEach((_, skip) => {
      omissions++;
      const attempt = app.terminal(stage);
      stage.solution.forEach((command, i) => { if (i !== skip) send(attempt, command, `${id}/skip-${skip + 1}`); });
      check(!attempt.sim.done, `${id}: omitting step ${skip + 1} still wins (${stage.solution[skip]})`);
    });

    const reset = app.terminal(stage);
    stage.solution.slice(0, -1).forEach(command => send(reset, command, id + '/reset'));
    send(reset, 'sim reset', id + '/reset');
    check(JSON.stringify(reset.sim.sys) === JSON.stringify(app.terminal(stage).sim.sys), `${id}: reset did not restore exact mission system`);
    check(reset.sim.records.length === 1 && reset.sim.records[0].op === 'reset', `${id}: reset preserved stale evidence`);
    send(reset, stage.solution.at(-1), id + '/reset');
    check(!reset.sim.done, `${id}: reset plus final command bypassed mission`);

    const wrong = app.terminal(stage);
    for (let i = 0; i < stage.solution.length + 2; i++) send(wrong, i % 2 ? 'help' : 'sim status', id + '/brute-force');
    check(!wrong.sim.done, `${id}: repeated help/status falsely wins`);

    const variant = app.terminal(stage);
    stage.solution.forEach(command => {
      const spaced = command.replace(/^[^ ]+/, v => v.toUpperCase()).replace(/ /, '   \t');
      send(variant, '  sudo -n ' + spaced + '  ;', id + '/input-variants');
    });
    check(variant.sim.done, `${id}: sudo, whitespace or uppercase verb broke valid solution`);

    const bad = app.terminal(stage);
    garbage.forEach(command => { fuzz++; send(bad, command, id + '/garbage'); check(!bad.sim.done, `${id}: garbage command won mission: ${command}`); });
    send(bad, 'sim reset', id + '/garbage-recovery');
    stage.solution.forEach(command => send(bad, command, id + '/garbage-recovery'));
    check(bad.sim.done, `${id}: cannot recover from rejected inputs using reset`);
  });

  if (!options.only || options.only === 'breaker' || options.only === 'breaker/stage/0') {
    const sys = app.SD.defaultSys();
    const t = app.terminal({ sys, tasks: [], success: () => false });
    const label = 'engine/breaker-messages';
    const request = 'GET /api/v1/transactions?limit=5';
    const transitions = output => output.filter(x => /^🔌 ledger: (?:⚡ CIRCUIT OPEN|\d+s ka cooldown poora|test request)/.test(x.text)).map(x => x.text);
    ['sim add breaker ledger --threshold 0.75 --window 7 --half-open 11', 'sim add timeout ledger 200', request,
      'sim inject error ledger 1', request, request].forEach(c => send(t, c, label));
    const opened = transitions(send(t, request, label));
    check(opened.length === 1 && opened[0].includes('pichhle 7s mein 4 mein se 3 calls fail (hadd 75%). Agle 11s'),
      'Breaker OPEN message ignored custom settings or mixed success/failure counts');
    check(!opened.some(text => /fallback/.test(text)) && t.sim.last.status === 504,
      'Breaker without fallback promised a fallback response');
    check(transitions(send(t, request, label)).length === 0, 'Short-circuit request repeated the OPEN transition');
    send(t, 'sim advance 9', label);
    const beforePreview = JSON.stringify(t.sim.sys);
    const preview = app.SD.depCost(t.sim.sys, 'ledger', { nowSec: t.sim.timeSec + 1 });
    check(preview.transitions.length === 0 && JSON.stringify(t.sim.sys) === beforePreview,
      'Read-only dependency cost emitted a transition or changed breaker state');
    const reopened = transitions(send(t, request, label));
    check(reopened.length === 2 && /11s ka cooldown poora.*HALF-OPEN/.test(reopened[0]) &&
      /test request bhi fail.*wapas OPEN.*Agle 11s/.test(reopened[1]),
      'Failed trial must print HALF-OPEN then reopen exactly once at the cooldown boundary');
    check(transitions(send(t, request, label)).length === 0, 'Reopened circuit repeated a transition before the next cooldown');
    send(t, 'sim inject error ledger 0', label);
    send(t, 'sim advance 9', label);
    const recovered = transitions(send(t, request, label));
    check(recovered.length === 2 && /HALF-OPEN/.test(recovered[0]) && /test request pass.*circuit CLOSED/.test(recovered[1]) &&
      t.sim.sys.deps.ledger.breakerState === 'closed' && t.sim.last.status === 200,
      'Healthy dependency must print HALF-OPEN then CLOSED exactly once after cooldown');
    check(transitions(send(t, request, label)).length === 0, 'Healthy closed circuit repeated a transition');
    check([...opened, ...reopened, ...recovered].every(text => !standin.test(text)), 'Breaker transition prose contains a pronoun stand-in');
  }

  // Change one named value and prove that the corresponding checklist rejects it.
  const strictCases = [
    ['networking/stage/0', 3, 'net compare --assets 59', 3],
    ['boundaries/stage/2', 0, 'GET /api/v1/transactions?limit=500', 0],
    ['boundaries/stage/2', 3, 'sim add ratelimit --rps 99 --burst 120', 3],
    ['boundaries/stage/2', 3, 'sim add ratelimit --rps 100 --burst 119', 3],
    ['latency/stage/2', 0, 'load --rps 300 --duration 8', 0],
    ['latency/stage/2', 1, 'slo --availability 99', 1],
    ['estimation/stage/0', 0, 'estimate --users 1000000 --rps 28 --bytes 2048', 0],
    ['estimation/stage/0', 0, 'estimate --users 1200000 --rps 27 --bytes 2048', 0],
    ['estimation/stage/0', 1, 'slo --availability 99', 2],
    ['fanout/stage/2', 1, 'sim inject latency ledger 2000', 1],
    ['fanout/stage/2', 3, 'sim add timeout ledger 200', 3],
    ['numbers/stage/0', 0, 'net trace --rtt 2', 0],
    ['numbers/stage/0', 1, 'net trace --rtt 120', 1],
    ['numbers/stage/0', 2, 'net trace --rtt 120 --protocol h3', 2],
    ['numbers/stage/0', 4, 'load --rps 499 --duration 8', 4],
    ["offset-pain/stage/0", 3, "GET /api/v1/transactions?page=100000&limit=50", 3],
    ["offset-pain/stage/0", 3, "GET /api/v1/transactions?page=485728&limit=51", 3],
    ["offset-pain/stage/0", 4, "EXPLAIN SELECT * FROM transactions ORDER BY created_at DESC LIMIT 50 OFFSET 100000", 4],
    ["offset-pain/interview/1", 2, "GET /api/v1/transactions?page=100000&limit=50", 2],
    ["cursor/stage/0", 0, "GET /api/v1/transactions?page=100000&limit=50", 0],
    ["cursor/stage/0", 1, "CREATE INDEX ix_txn_keyset ON transactions(created_at, amount, id)", 1],
    ["cursor/stage/2", 1, "sim set api.maxPageDepth 999", 1],
    ["cursor/stage/2", 2, "sim set api.maxLimit 99", 2],
    ["idempotency/stage/0", 3, "POST /v1/payments -H 'Idempotency-Key: wrong'", 3],
    ["idempotency/stage/0", 4, "POST /v1/payments -H 'Idempotency-Key: wrong'", 3],
    ["ratelimit/stage/0", 1, "sim add ratelimit --rps 99 --burst 150", 1],
    ["ratelimit/stage/0", 1, "sim add ratelimit --rps 100 --burst 149", 1],
    ["boss-api/stage/1", 1, "CREATE INDEX ix_keyset ON transactions(created_at, amount, id)", 1],
    ["boss-api/stage/1", 5, "sim set api.maxLimit 99", 5],
    ["boss-api/stage/1", 6, "sim add ratelimit --rps 99 --burst 150", 6],
    ["boss-api/stage/1", 7, "help", 5],
    ["boss-api/stage/1", 8, "help", 6],
    ["boss-api/stage/1", 9, "help", 6],
    ["auth/stage/1", 7, "GET /api/v1/transactions?user_id=9&limit=5 -H 'Authorization: Bearer u7'", 7],
    ["ids/stage/0", 2, "id bench --type uuid4 --rows 999999", 2],
    ["ids/stage/0", 3, "id bench --type snowflake --rows 999999", 3],
    ["ids/stage/0", 4, "id bench --type ulid --rows 999999", 5],
    ["pool/stage/0", 1, "sim inject long-tx --holds 44", 1],
    ["caching/stage/0", 2, "sim add cache --ttl 59 --jitter 15 --hit-rate 1", 2],
    ["caching/stage/0", 2, "sim add cache --ttl 60 --jitter 14 --hit-rate 1", 2],
    ["caching/stage/0", 5, "load --rps 499 --duration 5", 5],
    ["stampede/stage/0", 4, "help", 2],
    ["stampede/stage/0", 5, "load --rps 499 --duration 5", 2],
    ["eviction/stage/0", 7, "cache coalesce --misses 4999 --on", 7],
    ["probabilistic/stage/0", 0, "bloom --items 900000 --fp 0.01", 0],
    ["probabilistic/stage/0", 0, "bloom --items 1000000 --fp 0.015", 0],
    ["conshash/stage/0", 1, "ring set vnodes 100", 2],
    ["conshash/stage/0", 2, "ring add node-6", 3],
    ["conshash/stage/0", 3, "ring remove node-3", 5],
    ["timeouts/stage/0", 1, "sim inject latency ledger 5000", 1],
    ["timeouts/stage/0", 3, "sim add timeout ledger 200", 3],
    ["retries/stage/0", 1, "sim add timeout ledger 499", 1],
    ["retries/stage/0", 4, "sim add retry ledger --max 2 --backoff exp --jitter full", 4],
    ["breaker/stage/0", 1, "help", 0],
    ["breaker/stage/0", 2, "sim add breaker ledger --threshold 0.75 --window 20", 1],
    ["breaker/stage/0", 2, "sim add breaker ledger --threshold 0.5 --window 19", 1],
    ["bulkhead/stage/2", 0, "sim inject latency ledger 4000", 0],
    ["bulkhead/stage/2", 1, "sim add timeout ledger 199", 1],
    ["bulkhead/stage/2", 3, "sim add bulkhead ledger --max 21", 3],
    ["bulkhead/stage/2", 4, "help", 3],
    ["bulkhead/stage/2", 5, "load --rps 499 --duration 5 --pattern mixed", 4],
    ["shedding/stage/0", 0, "load --rps 49999 --duration 5 --pattern detail", 0],
    ["shedding/stage/0", 1, "sim add admission --max-rps 201 --queue 8", 1],
    ["shedding/stage/0", 1, "sim add admission --max-rps 200 --queue 7", 1],
    ["shedding/stage/0", 2, "load --rps 49999 --duration 5 --pattern detail", 2],
    ["flashcrowd/stage/0", 0, "load --rps 100000 --duration 4 --pattern detail", 0],
    ["flashcrowd/stage/0", 2, "sim scale pool 399", 2],
    ["flashcrowd/stage/0", 3, "sim add admission --max-rps 150000 --queue 1", 3],
    ["flashcrowd/stage/0", 4, "load --rps 119999 --duration 12 --pattern detail", 4],
    ["observability/stage/0", 4, "slo --availability 99", 4],
    ["boss-resil/stage/0", 1, "sim add timeout ledger 149", 1],
    ["boss-resil/stage/0", 5, "sim add bulkhead ledger --max 19", 5],
    ["exactlyonce/stage/0", 1, "POST /v1/payments -H 'Idempotency-Key: different'", 2],
    ["exactlyonce/stage/0", 2, "POST /v1/payments -H 'Idempotency-Key: different'", 2],
    ["streams/stage/0", 1, "stream window --size 60 --watermark 29 --events 100000 --late 3", 1],
    ["streams/stage/0", 4, "stream partitions --partitions 6 --consumers 7", 4],
    ["boss-dist/stage/1", 1, "help", 1],
    ["boss-dist/stage/1", 1, "POST /v1/orders -H 'Idempotency-Key: other-order'", 1],
    ["boss-dist/stage/1", 3, "CREATE INDEX ix_summary ON order_summary(user_city, status)", 2],
    ["geo/stage/0", 2, "CREATE INDEX ix_geo ON drivers(geohash)", 2],
    ["geo/stage/0", 4, "cache hotkey --key cell:te7ud9 --rps 30000", 4],
    ["geo/stage/0", 5, "cache hotkey --key cell:te7ud9 --rps 39999 --replicas 8", 5],
    ["review/stage/1", 1, "load --rps 499 --duration 8", 1],
    ["review/stage/1", 5, "sim scale pool 199", 5],
    ["review/stage/1", 6, "load --rps 4999 --duration 8", 6],
    ["boss-shapes/stage/0", 1, "load --rps 8001 --duration 8", 1],
    ["boss-shapes/stage/0", 4, "cache hotkey --key cell:other --rps 40000", 4],
    ["boss-shapes/stage/0", 8, "sim add timeout restaurant_svc 299", 8],
    ["boss-shapes/stage/0", 10, "sim scale pool 299", 10],
    ["boss-shapes/stage/0", 11, "load --rps 7999 --duration 8", 11],
    ["boss-shapes/stage/0", 12, "slo --availability 99", 12],
    ["numbers/stage/0", 3, "estimate --users 12000001 --rps 500 --bytes 2048", 3],
    ["estimation/stage/0", 0, "estimate --users 1200000 --rps 28 --bytes 2047", 0],
    ["estimation/stage/0", 0, "estimate --users 1200000 --rps 28 --bytes 2048 --peak 4", 1],
    ["lifecycle/stage/2", 2, "load --rps 501 --duration 6", 2],
    ["offset-pain/interview/1", 0, "CREATE INDEX ix_c ON transactions(user_id)", 0],
    ["btree/stage/0", 3, "GET /api/v1/users?limit=50", 3],
    ["boss-data/stage/0", 1, "CREATE INDEX ix_dash ON transactions(user_id, created_at)", 1],
    ["boss-data/stage/0", 4, "load --rps 499 --duration 5 --path '/api/v1/transactions?user_id=5&page=1&limit=50'", 4],
    ["stampede/stage/0", 2, "sim add cache --ttl 10 --jitter 19 --hit-rate 1", 1],
    ["stampede/stage/0", 0, "sim add cache --ttl 9 --hit-rate 1", 0],
    ["eviction/stage/0", 1, "cache sim --policy lru --size 3 --keys 'a a a a b b c'", 1],
    ["eviction/stage/0", 3, "cache hotkey --key match:live:score --rps 50001", 4],
    ["eviction/stage/0", 8, "load --rps 4999 --duration 5 --pattern flash", 9],
    ["probabilistic/stage/0", 2, "hll --items 100000001", 3],
    ["probabilistic/stage/0", 3, "hll --items 999999", 4],
    ["contention/stage/0", 7, "book hold B4 --ttl 599", 5],
    ["bitly/stage/1", 1, "id bench --type uuid4 --rows 999999", 1],
    ["bitly/stage/1", 2, "id bench --type snowflake --rows 999999", 2],
    ["bitly/stage/1", 3, "load --rps 11999 --duration 8", 3],
    ["bitly/stage/1", 4, "sim add cache --ttl 299 --jitter 20 --hit-rate 1", 4],
    ["bitly/stage/1", 7, "load --rps 11999 --duration 8", 7],
    ["adclick/stage/0", 1, "stream window --size 60 --watermark 9 --events 1000000 --late 4", 1],
    ["adclick/stage/0", 2, "stream window --size 60 --watermark 29 --events 1000000 --late 4", 2],
    ["adclick/stage/0", 4, "stream partitions --partitions 12 --consumers 13", 4],
    ["adclick/stage/0", 5, "bloom --items 9999999 --fp 0.01", 5],
    ["adclick/stage/0", 7, "cache hotkey --key ad:sb2026 --rps 399999 --replicas 32", 7],
    ["ticketmaster/stage/0", 3, "book hold A14 --ttl 599 --owner alice", 3],
    ["ticketmaster/stage/0", 5, "book confirm A14 --owner alice", 5],
    ["ticketmaster/stage/0", 7, "book hold B15 --ttl 20 --owner alice", 7],
    ["ticketmaster/stage/0", 11, "sim add admission --max-rps 2999 --queue 8", 9],
    ["ticketmaster/stage/0", 12, "sim add cache --ttl 3 --jitter 20", 10],
    ["ticketmaster/stage/0", 13, "load --rps 49999 --duration 8", 11],
    ["dropbox/stage/1", 1, "bloom --items 99999999 --fp 0.01", 1],
    ["dropbox/stage/1", 2, "id bench --type ulid --rows 999999", 2],
    ["dropbox/stage/1", 3, "load --rps 11999 --duration 8", 3],
    ["dropbox/stage/1", 4, "sim add cache --ttl 299 --jitter 20 --hit-rate 1", 4],
    ["dropbox/stage/1", 7, "net compare --assets 59", 7],
    ["dropbox/stage/1", 8, "load --rps 11999 --duration 8", 8],
    ["crawler/stage/1", 6, "cache hotkey --key domain:wikipedia.org --rps 49999 --replicas 8", 6],
    ["boss-uber/stage/0", 2, "CREATE INDEX ix_geo ON drivers(geohash)", 2],
    ["boss-uber/stage/0", 5, "ring set vnodes 100", 5],
    ["boss-uber/stage/0", 11, "book hold driver:8891 --ttl 14 --owner rider-1", 10],
    ["boss-uber/stage/0", 19, "sim add timeout pricing 11", 13],
    ["boss-uber/stage/0", 21, "sim add admission --max-rps 7999 --queue 5", 15],
    ["boss-uber/stage/0", 22, "sim scale pool 199", 16],
    ["boss-uber/stage/0", 23, "load --rps 24999 --duration 8 --path '/api/v1/drivers?geohash=te7ud9&limit=50'", 17],
    ["boss-uber/stage/0", 24, "slo --availability 99.9", 18],
  ];
  strictCases.filter(([id]) => !options.only || id === options.only || id.split('/')[0] === options.only).forEach(([id, step, replacement, task]) => {
    const stage = app.missions.find(m => m.id === id).stage;
    const t = app.terminal(stage);
    stage.solution.forEach((command, i) => send(t, i === step ? replacement : command, id + '/strict-value'));
    check(!stage.tasks[task].check(t.sim), `${id}: loose value still ticks task ${task + 1}: ${replacement}`);
    check(!t.sim.done, `${id}: loose value still wins: ${replacement}`);
  });

  // Regression cases that check behavior rather than mirroring implementation.
  if (!options.only) {
    const invalidations = [
      ['offset-pain/stage/1', 'sim set api.countTotal true'],
      ['cursor/stage/0', 'DROP INDEX ix_txn_keyset ON transactions'],
      ['idempotency/stage/0', 'sim set api.idempotency false'],
      ['boss-api/stage/1', 'DROP INDEX ix_keyset ON transactions'],
      ['migrations/stage/0', 'migrate rollback'],
      ['timeouts/stage/0', 'sim add timeout ledger 8000'],
      ['bulkhead/stage/2', 'sim add bulkhead ledger --max 200'],
      ['review/stage/1', 'sim scale pool 1'],
      ['contention/stage/0', 'book reset'],
      ['ticketmaster/stage/0', 'book reset'],
      ['dropbox/stage/1', 'sim set api.cache null'],
      ['crawler/stage/1', 'stream partitions --partitions 6 --consumers 20'],
      ['boss-uber/stage/0', 'DROP INDEX ix_geo ON drivers'],
    ];
    invalidations.forEach(([id, undo]) => {
      const stage = app.missions.find(m => m.id === id).stage;
      const t = app.terminal(stage);
      stage.solution.slice(0, -1).forEach(c => send(t, c, id + '/invalidate'));
      send(t, undo, id + '/invalidate');
      send(t, stage.solution.at(-1), id + '/invalidate');
      check(!t.sim.done, `${id}: stale earlier evidence won after invalidating live state with ${undo}`);
    });
    const probe = { type: 'terminal', goal: 'engine regression', sys: {}, tasks: [], success: () => false };
    const p = app.terminal(probe);
    send(p, 'GET /api/v1/transactions?page=1&limit=50', 'engine/repeated-headers');
    send(p, 'sim set api.auth header', 'engine/repeated-headers');
    send(p, "GET -H 'Idempotency-Key: unused' -H 'Authorization: Bearer u7' /api/v1/transactions?user_id=7&limit=5", 'engine/repeated-headers');
    check(p.sim.last.status === 200 && p.sim.last.actedAs === '7', 'HTTP flags before URL or repeated -H lost Authorization');
    send(p, 'sim reset', 'engine/prototype');
    const pristine = JSON.stringify(p.sim.sys);
    send(p, 'sim set __proto__.polluted true', 'engine/prototype');
    check(p.sim.lastError && JSON.stringify(p.sim.sys) === pristine && p.sim.sys.polluted === undefined, 'Prototype/internal state mutation was accepted');
    ['sim add timeout ledger -1', 'sim add retry ledger --max 1000000000000', 'load --rps -1', 'sim inject latency ledger nope'].forEach(command => {
      const before = JSON.stringify(p.sim.sys);
      send(p, command, 'engine/invalid-numbers');
      check(p.sim.lastError?.startsWith('400 —') && JSON.stringify(p.sim.sys) === before, 'Invalid numeric input changed live state: ' + command);
    });
    send(p, 'cursor decode garbage', 'engine/cursor');
    check(p.sim.lastError?.startsWith('400 — cursor') && p.sim.last.kind !== 'cursor', 'Invalid cursor fabricated a valid decoded record');
    send(p, 'GET /api/v1/transactions?limit=0', 'engine/query-bounds');
    check(p.sim.lastError?.startsWith('400 —'), 'Zero limit accepted');
    send(p, 'sim set api.maxLimit 100', 'engine/limit-cap');
    send(p, 'GET /api/v1/transactions?limit=1000000', 'engine/limit-cap');
    check(p.sim.last.guard === 'maxLimit', 'Requested limit was silently capped before guard validation');
    send(p, 'sim reset', 'engine/migration');
    ['migrate dual-write on', 'migrate backfill --batch 5000', 'migrate verify', 'migrate dual-write off', 'migrate cutover'].forEach(c => send(p, c, 'engine/migration'));
    check(!p.sim.last.safe && !p.sim.sys.migration.verified, 'Stale migration verification allowed unsafe cutover');
    send(p, 'sim reset', 'engine/booking');
    ['book hold A1 --ttl 10', 'book seat A1 --concurrent 2'].forEach(c => send(p, c, 'engine/booking'));
    check(p.sim.last.blockedByHold && !p.sim.sys.booking.seats.A1, 'A held seat could be sold to another request');

    const cacheProbe = app.terminal(probe);
    ['sim add cache --ttl 10 --hit-rate 1', 'GET /api/v1/transactions?limit=5', 'GET /api/v1/transactions?limit=5'].forEach(c => send(cacheProbe, c, 'engine/cache-ttl'));
    check(cacheProbe.sim.last.cache === 'HIT', 'Repeated key did not hit before expiry');
    ['sim advance 10', 'GET /api/v1/transactions?limit=5'].forEach(c => send(cacheProbe, c, 'engine/cache-ttl'));
    check(cacheProbe.sim.last.cache === 'MISS', 'Expired key still returned HIT');
    const peak = jitter => {
      const t = app.terminal(probe);
      [`sim add cache --ttl 10 --jitter ${jitter} --hit-rate 1`, 'load --rps 500 --duration 12'].forEach(c => send(t, c, 'engine/expiry-spike'));
      return t.sim.last;
    };
    const aligned = peak(0), spread = peak(20);
    check(aligned.cacheSteps.some(x => x.expiredKeys === 100) && spread.cacheSteps.every(x => x.expiredKeys < 100) && spread.maxP99 < aligned.maxP99, 'TTL jitter did not reduce measured expiry spike');
    const sf = app.terminal(probe);
    ['cache coalesce --misses 5000', 'GET /api/v1/transactions?limit=5 -n 5000'].forEach(c => send(sf, c, 'engine/single-flight'));
    check(sf.sim.last.dbQueries === 5000, 'Uncoalesced HTTP batch did not reach DB');
    ['cache coalesce --misses 5000 --on', 'sim advance 60', 'GET /api/v1/transactions?limit=5 -n 5000'].forEach(c => send(sf, c, 'engine/single-flight'));
    check(sf.sim.last.cache === 'MISS' && sf.sim.last.dbQueries === 1, 'Single-flight did not affect real HTTP miss batch');

    const retrySys = app.SD.defaultSys();
    retrySys.deps.ledger = { p99: 900, errorRate: 1, timeoutMs: 500, retry: { max: 3, baseMs: 100, backoff: 'exp', jitter: 'none' } };
    const noJitter = app.SD.depCost(retrySys, 'ledger').ms;
    retrySys.deps.ledger.retry.jitter = 'full';
    const fullJitter = app.SD.depCost(retrySys, 'ledger').ms;
    retrySys.deps.ledger.retry.jitter = 'equal';
    check(noJitter === 2700 && fullJitter === 2350 && app.SD.depCost(retrySys, 'ledger').ms === 2525, 'Retry jitter did not change deterministic backoff wait');
    function breakerProbe(threshold, window) {
      const t = app.terminal(probe);
      [`sim add breaker ledger --threshold ${threshold} --window ${window}`, 'sim add timeout ledger 200', 'GET /api/v1/transactions?limit=5', 'GET /api/v1/transactions?limit=5', 'sim inject error ledger 1', 'GET /api/v1/transactions?limit=5', 'GET /api/v1/transactions?limit=5'].forEach(c => send(t, c, 'engine/breaker-window'));
      return t;
    }
    const halfFailures = breakerProbe(0.5, 20), highThreshold = breakerProbe(0.75, 20), narrowWindow = breakerProbe(0.5, 1);
    check(halfFailures.sim.sys.deps.ledger.breakerState === 'open' && highThreshold.sim.sys.deps.ledger.breakerState === 'closed' && narrowWindow.sim.sys.deps.ledger.breakerState === 'closed', 'Breaker ignored configured failure threshold or time window');
    ['sim inject error ledger 0', 'GET /api/v1/transactions?limit=5'].forEach(c => send(halfFailures, c, 'engine/breaker-cooldown'));
    check(halfFailures.sim.sys.deps.ledger.breakerState === 'open', 'Breaker probed before configured cooldown elapsed');
    ['sim advance 30', 'GET /api/v1/transactions?limit=5'].forEach(c => send(halfFailures, c, 'engine/breaker-cooldown'));
    check(halfFailures.sim.sys.deps.ledger.breakerState === 'closed', 'Successful half-open request did not close breaker after virtual cooldown');
    const queue = app.terminal(app.missions.find(m => m.level.id === 'shedding').stage);
    ['sim add admission --max-rps 200 --queue 2', 'load --rps 50000 --duration 12 --pattern detail'].forEach(c => send(queue, c, 'engine/queue-ttl'));
    check(queue.sim.last.rejectedRequests > 0 && queue.sim.last.expiredRequests > 0 && queue.sim.last.waitingRequests <= 400 && queue.sim.last.maxQueueWaitSec <= 2, 'Admission queue failed bounded wait/occupancy/expiry rejection');
    send(queue, 'slo --availability 99.9', 'engine/slo-burn');
    check(queue.sim.last.consumedMin > 0 && queue.sim.last.remainingMin < queue.sim.last.budgetMin && queue.sim.last.burnRate > 1, 'SLO did not report measured consumption and burn');

    const order = app.terminal(probe);
    ['sim set api.idempotency true', "POST /v1/orders -H 'Idempotency-Key: order-probe'"].forEach(c => send(order, c, 'engine/order-resource'));
    const orderBody = JSON.stringify(order.sim.last.body);
    check(order.sim.last.body.id.startsWith('ord_') && order.sim.last.body.status === 'pending' && !('amount' in order.sim.last.body), 'Orders POST still returns payment-shaped response');
    send(order, "POST /v1/orders -H 'Idempotency-Key: order-probe'", 'engine/order-resource');
    check(order.sim.last.idem === 'replay' && JSON.stringify(order.sim.last.body) === orderBody, 'Order retry changed its stored response');

    const holds = app.terminal(probe);
    ['book hold A2 --ttl 10 --owner alice', 'book status', 'sim advance 3', 'book status'].forEach(c => send(holds, c, 'engine/hold-clock'));
    check(holds.sim.last.holds.A2.owner === 'alice' && holds.sim.last.holds.A2.remainingSec === 5, 'Hold TTL did not count down on virtual clock');
    send(holds, 'book hold A2 --ttl 100 --owner bob', 'engine/hold-owner');
    check(!holds.sim.last.ok && holds.sim.sys.booking.holds.A2.owner === 'alice', 'Another owner overwrote an active hold');
    ['book confirm A2 --owner bob', 'book confirm A2'].forEach(c => { send(holds, c, 'engine/hold-owner'); check(!holds.sim.last.ok && !holds.sim.sys.booking.seats.A2, 'Wrong or missing owner confirmed held seat'); });
    send(holds, 'book confirm A2 --owner alice', 'engine/hold-owner');
    check(holds.sim.last.ok && holds.sim.sys.booking.seats.A2 === 'alice' && !holds.sim.sys.booking.holds.A2, 'Holder confirmation did not produce one sale and release hold');
    ['book hold B2 --ttl 2 --owner alice', 'sim advance 2', 'book confirm B2 --owner alice'].forEach(c => send(holds, c, 'engine/hold-expiry'));
    check(!holds.sim.last.ok && holds.sim.last.denied === 'expired-or-missing' && !holds.sim.sys.booking.holds.B2 && !holds.sim.sys.booking.seats.B2, 'Expired hold could be confirmed');
    send(holds, 'book seat B2 --concurrent 1', 'engine/hold-expiry');
    check(holds.sim.last.sold === 1 && holds.sim.last.releasedByExpiry, 'Expired hold did not release inventory');
    const failedCache = app.terminal(probe);
    ['sim add cache --ttl 10 --hit-rate 1', 'sim inject down ledger', 'GET /api/v1/transactions?limit=5', 'GET /api/v1/transactions?limit=5'].forEach(c => send(failedCache, c, 'engine/cache-failure'));
    check(failedCache.sim.last.status === 504 && failedCache.sim.last.cache === 'MISS', 'Failed origin response was cached as a successful HIT');
    send(failedCache, 'load --rps 1 --duration 2 --pattern detail', 'engine/load-dependency');
    check(failedCache.sim.last.errPct === 100, 'Load ignored dependency failure without fallback');
    const copies = app.terminal(probe);
    send(copies, 'cache hotkey --rps 400000 --replicas 32', 'engine/read-copies');
    check(copies.sim.last.nodes >= copies.sim.last.replicas && !copies.sim.last.hot, 'Hot-key copies exceeded physical nodes in capacity estimate');
    send(copies, 'cache hotkey --rps 400000 --replicas 32 --nodes 8', 'engine/read-copies');
    check(/^400/.test(copies.sim.lastError || ''), 'Replica count above explicit node count was accepted');

    const stateProbe = app.terminal({ ...app.missions[0].stage, verify: () => false });
    app.missions[0].stage.solution.forEach(c => send(stateProbe, c, 'engine/live-state-gate'));
    check(!stateProbe.sim.done, 'Engine ignores live-state verification');
    const r = app.terminal(app.missions.find(m => m.level.id === 'shedding').stage);
    ['load --rps 50000 --duration 5 --pattern detail', 'sim add admission --max-rps 5000 --queue 8', 'load --rps 50000 --duration 5 --pattern detail'].forEach(c => send(r, c, 'engine/shedding-wrong-cap'));
    check(r.sim.last.saturated && !r.sim.done, 'Admission above real capacity incorrectly wins shedding mission');
    send(r, 'sim reset', 'engine/admission-unit');
    send(r, 'sim add admission --max-concurrent 200 --queue 8', 'engine/admission-unit');
    check(!r.sim.sys.api.admission && /RATE/.test(r.sim.lastError || ''), 'A concurrency flag was accepted as a requests-per-second cap');
    const net = app.terminal(app.missions.find(m => m.level.id === 'networking').stage);
    send(net, 'net trace --rtt 40', 'engine/tls');
    check(net.sim.last.tlsVersion === '1.3' && net.sim.last.tls === 40, 'Default TLS handshake is not TLS 1.3 (1 RTT)');
    send(net, 'net trace --rtt 40 --tls 1.2', 'engine/tls');
    check(net.sim.last.tls === 80, 'TLS 1.2 handshake is not 2 RTT');
    send(net, 'net trace --protocol h3 --tls 1.2', 'engine/tls');
    check(net.sim.last.tls === 80 && /TLS 1\.3/.test(net.sim.lastError || ''), 'QUIC accepted TLS 1.2');
  }
  check(app.issues.length === 0, 'Engine logged internal exceptions: ' + app.issues.join(' | '));
  const result = { missions, checks, commands, omissions, fuzz, failures };
  if (!options.silent) {
    failures.forEach(f => console.error('FAIL ' + f));
    console.log(`${failures.length ? 'FAIL' : 'PASS'} ${missions} terminal missions · ${omissions} omitted-step attempts · ${fuzz} malformed-input attempts · ${checks} checks · ${commands} commands`);
  }
  return result;
}
if (require.main === module) process.exitCode = run({ only: process.argv[2] }).failures.length ? 1 : 0;
module.exports = { run };
