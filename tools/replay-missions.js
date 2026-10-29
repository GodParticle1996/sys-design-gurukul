#!/usr/bin/env node
'use strict';
const { loadApp } = require('../dev/load-app');

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
    try { output = t.run(command); } catch (e) { failures.push(`${label}: uncaught ${e.message} for ${JSON.stringify(command)}`); }
    check(!output.some(x => /^simulator error:/.test(x.text)), `${label}: internal simulator error for ${JSON.stringify(command)}`);
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
    const original = JSON.stringify(stage.sys);
    const t = app.terminal(stage);
    check(!stage.success(t.sim), `${id}: fresh mission already succeeds`);
    stage.solution.forEach((command, i) => {
      send(t, command, id);
      check(t.sim.done === (i === stage.solution.length - 1), `${id}: win must occur only at final step (${i + 1}/${stage.solution.length}, done=${t.sim.done})`);
    });
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
