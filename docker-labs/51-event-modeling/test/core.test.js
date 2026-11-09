const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const P = require('../lib/profile');
const A = require('../lib/account');
const { parse } = require('../lib/reader');
const tool = (name, ...args) => execFileSync(process.execPath, [path.join(__dirname, '..', 'tools', name + '.js'), ...args],
  { encoding: 'utf8', timeout: 120000 });

test('profile: field = har field ek event; intent = ghar ek event, email alag', () => {
  const ch = { street: 'S', city: 'C', pin: 'P', email: 'e' };
  assert.deepEqual(P.toEvents('field', 'u', ch).map(e => e.type), ['StreetChanged', 'CityChanged', 'PinChanged', 'EmailChanged']);
  assert.deepEqual(P.toEvents('generic', 'u', ch).map(e => e.type), ['ProfileUpdated']);
  assert.deepEqual(P.toEvents('intent', 'u', ch).map(e => e.type), ['AddressChanged', 'EmailChangeRequested']);
  assert.throws(() => P.toEvents('intent', 'u', { pin: 'P' }), /poora naya address/);
});

test('account: state events se fee aur ATM alag nahi dikhte; facts se dikhte', () => {
  assert.deepEqual(A.answer(A.toEvents('state')).atmOver2000, 3);
  assert.equal(A.answer(A.toEvents('state')).feeNet, null);
  assert.deepEqual(A.answer(A.toEvents('facts')), { atmOver2000: 2, feeNet: 0, why500: 'FeeCharged (card annual fee)' });
});

test('reader: strict anjaana field par mana; tolerant chhod deta hai; amount na ho toh dono mana', () => {
  const ev = data => ({ data });
  assert.equal(parse('strict', ev({ orderId: 'o1', amount: 5, method: 'upi' })).ok, false);
  assert.equal(parse('tolerant', ev({ orderId: 'o1', amount: 5, method: 'upi' })).amount, 5);
  assert.equal(parse('tolerant', ev({ orderId: 'o1', total: 5 })).ok, false);
});

test('ex1-granular: field mode mein mile-jule labels, intent/generic mein nahi', () => {
  const out = tool('granular');
  assert.match(out, /^field +profile-messages=6 mile-jule-labels=2\/2 \[o1: Lake View 5, Pune, 411001; o2: Lake View 5, Bengaluru, 411001\] verifier-jaaga=1/m);
  assert.match(out, /^generic +profile-messages=3 mile-jule-labels=0\/2 verifier-jaaga=3 \(kaam ka 1\)/m);
  assert.match(out, /^intent +profile-messages=4 mile-jule-labels=0\/2 verifier-jaaga=1 \(kaam ka 1\)/m);
});

test('ex2-facts aur ex3-bloat: nateeje', () => {
  assert.match(tool('facts'), /^state .*ATM>2000=3 \(sahi 2\) · fee-net=pata nahi/m);
  const b = tool('bloat');
  assert.match(b, /^addfield-sab +payload-schemas-badle=3 producer-teams-badli=2 bytes=\+617 KB points-sahi=haan/m);
  assert.match(b, /^addfield +payload-schemas-badle=1 producer-teams-badli=1 bytes=\+206 KB points-sahi=haan/m);
  assert.match(b, /^metadata +payload-schemas-badle=0 producer-teams-badli=1 bytes=\+206 KB points-sahi=haan/m);
  assert.match(b, /^readmodel +payload-schemas-badle=0 producer-teams-badli=0 bytes=\+0 KB · OrderPlaced se pehle aaye payments=369 · bina parking: 369 .* points-sahi=haan/m);
});

test('http: error ke saath status bhi aata hai (sirf 422 schema rejection gina jaata hai)', async () => {
  const { serve, call } = require('../lib/http');
  const server = serve(6009, async (m, route) => { if (route === '/bad') return { code: 422, body: { error: 'anjaana field x' } }; throw Error('boom'); });
  await new Promise(r => server.once('listening', r));
  try {
    await assert.rejects(call('http://localhost:6009', '/bad'), e => e.status === 422 && /anjaana field x/.test(e.message));
    await assert.rejects(call('http://localhost:6009', '/other'), e => e.status === 503);
  } finally { server.close(); }
});

test('ex4-evolve (asli processes): strict naye field par toot-ta; rename dono ko todta; expand tolerant ko bachata', () => {
  const out = tool('evolve');
  assert.match(out, /^v1-purana +strict: theek 100\/100 · tolerant: theek 100\/100/m);
  assert.match(out, /^v2-naya-field +strict: mana 100\/100 .* tolerant: theek 100\/100/m);
  assert.match(out, /^v3-naam-badla +strict: mana 100\/100 .* tolerant: mana 100\/100 \(amount nahi\)/m);
  assert.match(out, /^v4-dono-field +strict: mana 100\/100 .* tolerant: theek 100\/100/m);
});
