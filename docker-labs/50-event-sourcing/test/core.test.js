const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { open } = require('../lib/store');
const E = require('../lib/events');
const { fold } = require('../lib/account');
const { catchUp } = require('../lib/projector');
const tool = (name, ...args) => execFileSync(process.execPath, [path.join(__dirname, '..', 'tools', name + '.js'), ...args],
  { encoding: 'utf8', timeout: 120000 });
const seed = db => E.append(db, 'a1', 0, [{ type: 'Opened', data: {} }, { type: 'Deposited', data: { amount: 100 } }]);

test('append: purana version maango toh Conflict; any bina jaanch ke jodta hai', () => {
  const db = open(':memory:');
  seed(db);
  E.append(db, 'a1', 2, [{ type: 'Withdrawn', data: { amount: 80 } }]);
  assert.throws(() => E.append(db, 'a1', 2, [{ type: 'Withdrawn', data: { amount: 80 } }]), E.Conflict);
  assert.equal(db.isTransaction, false);
  assert.equal(fold(E.readStream(db, 'a1')).balance, 20);
  E.append(db, 'a1', 'any', [{ type: 'Withdrawn', data: { amount: 80 } }]);
  assert.equal(fold(E.readStream(db, 'a1')).balance, -60);
});

test('fold + upcast: purana schema padhte waqt badla, DB mein wahi', () => {
  const db = open(':memory:');
  db.prepare("INSERT INTO events (stream, version, type, schema, data) VALUES ('o', 1, 'MoneyAdded', 1, '{\"amt\":50}')").run();
  const before = JSON.stringify(db.prepare('SELECT * FROM events').all());
  const evs = E.readStream(db, 'o');
  assert.equal(fold(evs).balance, 50);
  assert.equal(fold(evs, undefined, { upcasting: false }).balance, 0);
  assert.equal(JSON.stringify(db.prepare('SELECT * FROM events').all()), before);
});

test('catchUp: together crash par dono wapas; split crash par dobara apply', () => {
  for (const [mode, want] of [['together', 70], ['split', 40]]) {
    const db = open(':memory:');
    seed(db);
    catchUp(db, 'balances');
    E.append(db, 'a1', 2, [{ type: 'Withdrawn', data: { amount: 30 } }]);
    assert.throws(() => catchUp(db, 'balances', { mode, afterApply: () => { throw Error('crash'); } }), /crash/);
    assert.equal(db.isTransaction, false);
    catchUp(db, 'balances', { mode });                // restart: checkpoint se phir
    assert.equal(db.prepare('SELECT balance FROM balances').get().balance, want, mode);
  }
});

test('withdraw: galat amount par koi event nahi', async () => {
  const { withdraw } = require('../lib/handler');
  const db = open(':memory:');
  seed(db);
  for (const bad of [-80, 0, 1.5, 'oops', null]) assert.equal((await withdraw(db, 'a1', bad)).result, 'invalid');
  assert.equal(E.readStream(db, 'a1').length, 2);
  assert.equal(fold(E.readStream(db, 'a1')).balance, 100);
});

test('minPos tak read model na pahunche toh 503, purana balance nahi', async () => {
  const { withStack } = require('../tools/stack');
  const { call } = require('../lib/http');
  await withStack(async ({ db, service }) => {
    const d = open(db);
    seed(d);
    await service('projector', { PORT: '5914', MODE: 'together', POLL_MS: '20' });
    await assert.rejects(call('http://localhost:5914', '/balance?account=a1&minPos=999'), /read model abhi taiyaar nahi/);
    assert.equal((await call('http://localhost:5914', '/balance?account=a1&minPos=2')).balance, 100);
  });
});

test('waitFor: shart poori na ho toh error, adhura result nahi', async () => {
  const { waitFor } = require('../tools/stack');
  await assert.rejects(waitFor(async () => false, 'kuch nahi hua', -1), /poora nahi hua/);
});

test('ex0-slowmo: teeno kahaniyan', () => {
  assert.match(tool('slowmo', '--story', 'race', '--mode', 'any'), /store=-60 version=4/);
  assert.match(tool('slowmo', '--story', 'race', '--mode', 'expected'), /20 < 80 — command mana \| store=20/);
  assert.match(tool('slowmo', '--story', 'dual', '--mode', 'dual'), /store=70 read=100\n$/);
  assert.match(tool('slowmo', '--story', 'dual', '--mode', 'catchup'), /store=70 read=70\n$/);
  assert.match(tool('slowmo', '--story', 'cache', '--mode', 'cache'), /store=-60/);
  assert.match(tool('slowmo', '--story', 'cache', '--mode', 'tail'), /command mana \| store=20/);
});

test('ex3-replay: history, snapshot aur upcast', () => {
  const out = tool('replay');
  assert.match(out, /as-of v3 = 110/);
  assert.match(out, /snapshot v1,00,000 \+ 350 padhe, [\d.]+ ms · balance 250880 \/ 250880/);
  assert.match(out, /bina upcaster balance=50 · upcaster ke saath 130 · events table hash (\w+) → \1/);
});

test('ex1-race (asli processes): bina version minus balance; expected version nahi', () => {
  const out = tool('race');
  assert.match(out, /^any .* minus-balance=20\/20 aakhri-balance=\[-60\]/m);
  assert.match(out, /^expected .* mana=20 dobara-padha=20 minus-balance=0\/20 aakhri-balance=\[20\]/m);
});

test('ex2-projection (asli crash): dual aur split galat; together sahi; minPos purana nahi', () => {
  const out = tool('projection');
  assert.match(out, /^dual .* client-ko-error=1 crash=1 store≠read-model=1 \[a4 store=70 read=100\]/m);
  assert.match(out, /^together .* crash=1 store≠read-model=0/m);
  assert.match(out, /^split .* crash=1 store≠read-model=1 \[a4 store=70 read=40\]/m);
  assert.match(out, /^read +command-ok=10 turant-padha-purana=\d+\/10 minPos-ke-saath-purana=0\/10 .* galat=0/m);
});
