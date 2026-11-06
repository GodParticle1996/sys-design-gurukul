const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { createBroker } = require('../lib/broker');
const { open } = require('../lib/store');
const A = require('../lib/apply');
const tool = (name, ...args) => execFileSync(process.execPath, [path.join(__dirname, '..', 'tools', name + '.js'), ...args],
  { encoding: 'utf8', timeout: 120000 });

test('broker: lease khatam toh dobara, keyed mein ek key ek waqt', () => {
  const b = createBroker({ leaseMs: 100, keyed: true });
  b.publish('a1', 'a'); b.publish('a2', 'a'); b.publish('b1', 'b');
  assert.equal(b.receive(0).body, 'a1');
  assert.equal(b.receive(0).body, 'b1', 'a2 ruka: key a abhi bahar hai');
  assert.equal(b.receive(0), null);
  const again = b.receive(150);
  assert.deepEqual([again.body, again.attempt], ['a1', 2], 'ack nahi aaya: lease ke baad dobara');
});

test('inOrder: buffer kram theek karta hai; gap par atakta hai', () => {
  const db = open(':memory:');
  assert.deepEqual([3, 1, 2].map(s => A.inOrder(db, { order: 'o', seq: s, status: 's' + s }, 'A')), ['buffered', 'applied', 'applied']);
  assert.equal(db.prepare('SELECT seq FROM orders').get().seq, 3);
  A.inOrder(db, { order: 'o', seq: 5, status: 's5' }, 'A');
  assert.equal(db.prepare('SELECT seq FROM orders').get().seq, 3, '#4 nahi aaya: #5 buffer mein');
  assert.equal(db.prepare('SELECT count(*) c FROM buffer').get().c, 1);
});

test('broker: purane attempt ka ack naye worker ki delivery nahi hatata', () => {
  const b = createBroker({ leaseMs: 100 });
  b.publish('x', 'k');
  const old = b.receive(0), fresh = b.receive(100);
  assert.equal(fresh.attempt, 2);
  assert.equal(b.ack(old.id, old.attempt), false, 'lease ke baad purane worker ka ack');
  assert.equal(b.pending(), 1);
  assert.equal(b.ack(fresh.id, fresh.attempt), true);
  assert.equal(b.pending(), 0);
});

test('inOrder: pehle likha seq dobara aaye toh duplicate, buffer mein nahi', () => {
  const db = open(':memory:');
  assert.deepEqual([1, 2, 2, 3].map(s => A.inOrder(db, { order: 'o', seq: s, status: 's' + s }, 'A')),
    ['applied', 'applied', 'duplicate', 'applied']);
  assert.equal(db.prepare('SELECT seq FROM orders').get().seq, 3);
  assert.equal(db.prepare('SELECT count(*) c FROM buffer').get().c, 0);
});

test('SQL error par ROLLBACK: na key bachti, na charge; agla payment chalta hai', () => {
  const db = open(':memory:');
  db.exec("CREATE TRIGGER fail_p1 BEFORE INSERT ON charges WHEN NEW.payment = 'p1' BEGIN SELECT RAISE(ABORT, 'charge-failure'); END;");
  assert.throws(() => A.charge(db, { id: 'p1', user: 'u1', amount: 100 }, 'paymentId'), /charge-failure/);
  assert.equal(db.isTransaction, false);
  assert.equal(db.prepare('SELECT count(*) c FROM processed').get().c, 0);
  assert.equal(A.charge(db, { id: 'p2', user: 'u1', amount: 100 }, 'paymentId'), 'charged');
  db.exec("CREATE TRIGGER fail_o BEFORE INSERT ON applied WHEN NEW.seq = 2 BEGIN SELECT RAISE(ABORT, 'apply-failure'); END;");
  A.inOrder(db, { order: 'o', seq: 1, status: 's1' }, 'A');
  assert.throws(() => A.inOrder(db, { order: 'o', seq: 2, status: 's2' }, 'A'), /apply-failure/);
  assert.equal(db.isTransaction, false);
  assert.equal(db.prepare('SELECT seq FROM orders').get().seq, 1);
});

test('drain: timeout par adhura result nahi, error', async () => {
  const { drain } = require('../tools/stack');
  await assert.rejects(drain(async () => ({ pending: 1 }), -1), /poora nahi hua/);
  await drain(async () => ({ pending: 0 }));
});

test('charge: kaunsi key duplicate pakadti hai', async () => {
  const p1 = { id: 'p1', user: 'u1', amount: 100 }, p2 = { id: 'p2', user: 'u1', amount: 100 };
  const run = async mode => {
    const db = open(':memory:');
    const out = [];
    for (const p of [p1, p1, p2]) {                   // har delivery alag millisecond mein
      out.push(A.charge(db, p, mode));
      await new Promise(r => setTimeout(r, 3));
    }
    return out;
  };
  assert.deepEqual(await run('none'), ['charged', 'charged', 'charged']);
  assert.deepEqual(await run('arrival'), ['charged', 'charged', 'charged']);
  assert.deepEqual(await run('userAmount'), ['charged', 'duplicate', 'duplicate']);
  assert.deepEqual(await run('paymentId'), ['charged', 'duplicate', 'charged']);
});

test('ex2-conflict (asli processes): padho-ruko-likho updates khota hai; cas aur atomic nahi', () => {
  const out = tool('conflict');
  assert.match(out, /^unsafe +balance=(?!1200)\d+ /m);
  assert.match(out, /^cas +balance=1200 /m);
  assert.match(out, /^atomic +balance=1200 /m);
  assert.match(out, /delta events \(\+100, −30\) 1000 se: sahi kram 1070 · ulta kram 1070/);
});

test('ex3-phantom (asli crash): sirf paymentId key sahi', () => {
  const out = tool('phantom');
  assert.match(out, /^none +crash=1 charges=3 \[p1,p2,p1\]/m);
  assert.match(out, /^userAmount +crash=1 charges=1 \[p1\]/m);
  assert.match(out, /^arrival +crash=1 charges=3/m);
  assert.match(out, /^paymentId +crash=1 charges=2 \[p1,p2\] sahi/m);
});

test('ex1-order (asli processes): keyed aur buffer kram bachate; gap par buffer atakta', () => {
  const out = tool('order');
  assert.match(out, /^keyed +likhe=15 ulte-kram=0 galat-aakhri=0/m);
  assert.match(out, /^buffer +likhe=15 ulte-kram=0 galat-aakhri=0 buffer-mein-atke=0/m);
  assert.match(out, /^buffer-gap +likhe=12 ulte-kram=0 galat-aakhri=o2=paid buffer-mein-atke=2/m);
});
