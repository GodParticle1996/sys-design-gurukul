'use strict';
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const B = require('../lib/budget');
const U = require('../lib/upload');
const L = require('../lib/likes');
const F = require('../lib/feed');
const G = require('../lib/global');
const S = require('../lib/shred');
const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);

test('ex0: budget sheet arithmetic', () => {
  const s = B.sheet();
  near(s.uploadsS, 1157.4, 0.1); near(s.uploadsPeakS, 3472.2, 0.1); near(s.storePByear, 109.5, 1e-9);
  near(s.viewsS, 1157407.4, 0.1); near(s.egressGBs, 231.48, 0.01); near(s.egressUSDday, 1e6, 1); near(s.readWrite, 1000, 1e-9);
  near(s.likesS, 57870.4, 0.1); near(s.walGBsIfBlobsInDB, 5.787, 0.001);
  assert.strictEqual(B.toastChunks(5e6), 2506); assert.strictEqual(B.rowsPerGiB(150), 7158278); assert.strictEqual(B.rowsPerGiB(150, 27), 6066337);
  assert.deepStrictEqual(B.storage(110), { replicated: 330, erasure: 154, survivesEC: 4, repairReads: 10 });
  near(B.fibreMs(10850), 54.25, 1e-9);
  assert.deepStrictEqual(B.HANDSHAKES, { 'TCP + TLS 1.2': 3, 'TCP + TLS 1.3': 2, 'QUIC (HTTP/3)': 1 });
});

test('ex1: presigned upload, resume, orphan sweep, tampering (real HTTP)', async () => {
  const lab = await U.start();
  try {
    const photo = crypto.randomBytes(1e6);
    await U.upload(lab, photo);
    assert.ok(lab.appStats.bytesIn < 200, 'the app server sees only small JSON');
    assert.strictEqual(lab.storeStats.bytesIn, 1e6); assert.strictEqual(lab.rows.length, 1);
    const raw = crypto.randomBytes(5e6), cut = await U.upload(lab, raw, { stopAfter: 9 });
    const wrong = await U.request('PUT', cut.url + '&offset=0', Buffer.from('dup'));          // a stale chunk mid-upload
    assert.strictEqual(wrong.status, 409); assert.strictEqual(wrong.headers['x-offset'], String(4.5e6));
    assert.strictEqual((await U.commit(lab, cut.key, 'too early')).status, 409, 'an incomplete photo is not published');
    const res = await U.resume(lab, cut, raw);
    assert.strictEqual(res.resumedFrom, 4.5e6); assert.strictEqual(res.sent, 5e5); assert.strictEqual(res.renewed, false);
    assert.ok(lab.objects.get(cut.key).bytes.equals(raw), 'resumed object is byte-identical');
    const again = await U.commit(lab, cut.key, 'retry after a lost reply');
    assert.deepStrictEqual([again.status, again.id, lab.rows.length], [200, res.committed.id, 2], 'a repeated commit returns the same row');
    assert.strictEqual((await U.request('PUT', cut.url + '&offset=5000000', Buffer.from('extra'))).status, 409, 'published bytes are frozen');
    const small = crypto.randomBytes(1000), mid = await U.upload(lab, small, { chunk: 300, stopAfter: 3 });
    lab.clock.now += 16 * 60e3;                                                                // the URL expires mid-upload
    const back = await U.resume(lab, mid, small, { chunk: 300 });
    assert.deepStrictEqual([back.renewed, back.resumedFrom, back.sent, back.committed.status], [true, 900, 100, 200]);
    assert.strictEqual(lab.objects.get(mid.key).bytes.length, 1000);
    const orphan = await U.upload(lab, photo, { commit: false });
    lab.clock.now += 23 * 3600e3; assert.strictEqual(lab.sweep(24 * 3600e3), 0, 'too young to expire');
    lab.clock.now += 2 * 3600e3; assert.strictEqual(lab.sweep(24 * 3600e3), 1);
    assert.ok(!lab.objects.has(orphan.key) && lab.objects.size === 3, 'only the uncommitted object goes');
    const fresh = JSON.parse((await U.request('POST', `http://127.0.0.1:${lab.ports.app}/uploads`, Buffer.from('{}'))).body);
    assert.strictEqual((await U.request('PUT', fresh.url.replace(fresh.key, 'p-other') + '&offset=0', Buffer.from('x'))).status, 403);
    const longer = fresh.url.replace(/expires=(\d+)/, (m, e) => `expires=${Number(e) + 3600e3}`);  // stretch the expiry
    assert.strictEqual((await U.request('PUT', longer + '&offset=0', Buffer.from('x'))).status, 403, 'expiry is signed');
    const viaPost = await U.request('POST', fresh.url + '&offset=0', Buffer.from('x'));
    assert.strictEqual(viaPost.status, 403, 'method is signed');
    assert.strictEqual((await U.request('PUT', fresh.url + '&offset=0', Buffer.from('x'))).status, 200);
    lab.clock.now += 16 * 60e3;
    assert.strictEqual((await U.request('PUT', fresh.url + '&offset=1', Buffer.from('y'))).status, 403, 'expired URL');
  } finally { lab.close(); }
});

test('ex2: hot row vs counter rows, retries, region counters', () => {
  const hot = L.viral({ perMs: 1 }), rows = L.viral({ perMs: 100 }), feedsFirst = L.viral({ perMs: 1, admit: 'feeds-first' });
  const big = L.viral({ perMs: 1, workers: 60000 }), mix = L.viral({ perMs: 1, admit: 'interleaved' });
  for (const v of [hot, rows, feedsFirst, big, mix]) assert.strictEqual(v.ok + v.noWorker + v.timedOut + v.waiting, v.total, 'every like is counted once');
  assert.deepStrictEqual([hot.ok, hot.noWorker, hot.timedOut, hot.feedFail, hot.firstFeedFailMs], [9999, 88001, 0, 196188, 177]);
  assert.ok(rows.ok > 99000 && rows.feedFail === 0 && rows.noWorker === 0);
  assert.ok(feedsFirst.feedFail === 0 && feedsFirst.ok === 9999, 'admission order decides the collateral damage, not the row speed');
  assert.ok(big.timedOut === 40002 && big.feedFail === 0, 'a bigger pool turns rejections into timeouts');
  assert.ok(mix.feedFail > 100000 && mix.feedFail < hot.feedFail);
  const r = L.retries();
  assert.strictEqual(r.set, r.truth); near(r.counter / r.truth, 1.02, 0.002);
  const g = L.regions();
  for (const x of L.REGIONS) { assert.strictEqual(g.gcounter[x], 9000); assert.notStrictEqual(g.lww[x], 9000); assert.ok(g.naive[x] > 9000); }
  assert.deepStrictEqual(L.crossRegionRetry(), { counter: 2, set: 1 });
});

test('ex3: feed model calibration and hybrid trade', () => {
  near(F.FMAX * F.S(1, F.N, F.ALPHA) / F.N, 300, 0.01);
  const push = F.hybrid(Infinity), h = F.hybrid(1e5), h4 = F.hybrid(1e4);
  near(push.pushWritesPerS, 3472 * 300, 1); near(push.maxFanoutSeconds, 600, 1e-9);
  assert.ok(h.maxFanout <= 1e5 && h.vipListsPerRead > 20 && h.vipListsPerRead < 50);
  assert.ok(h.pushWritesPerS < push.pushWritesPerS && h.pushWritesPerS > 0.85 * push.pushWritesPerS, 'hybrid trims the average only a little');
  assert.ok(h4.pushWritesPerS < h.pushWritesPerS && h4.vipListsPerRead > h.vipListsPerRead, 'lower threshold: fewer writes, more read merges');
  near(F.pullSlow(500), 0.9934, 0.0001); assert.strictEqual(F.inboxBytes(), 2e12);
  near(h.maxFanoutSeconds, 0.1, 0.001); near(h4.maxFanoutSeconds, 0.01, 0.0001);
  near(push.utilization, 1.0416, 0.0001); near(h.utilization, 0.9288, 0.001);
  const all = F.hybrid(50);                                                      // threshold below the smallest account
  assert.deepStrictEqual([all.vips, all.pushWritesPerS, all.maxFanout], [F.N, 0, 0]); assert.throws(() => F.hybrid(0));
});

test('ex4: hedging, quorum write, conflicts', () => {
  const none = G.page(), hedge = G.page({ hedgeAfterMs: 20 }), corr = G.page({ hedgeAfterMs: 20, correlated: 1 });
  near(none.slowPages, 1 - 0.99 ** 100, 0.02); assert.ok(hedge.slowPages < 0.02 && hedge.p50 > 20 && hedge.p50 < 40);
  near(hedge.extraLoad, 0.06, 0.015); assert.ok(corr.slowPages > 0.55, 'correlated slowness defeats hedging');
  assert.ok(none.p99 > 200 && hedge.p99 > 150 && none.p50 > 200, 'page percentiles carry the 200 ms stall');
  assert.strictEqual(G.quorumWriteMs([150, 230]), 150); assert.strictEqual(G.quorumWriteMs([90, 150, 230, 250]), 150);
  assert.strictEqual(G.quorumWriteMs([2, 3], 7), 14, 'nearby regions: commit wait (2ε) dominates');
  const base = { bio: { v: 'old', ts: 0, w: 's' }, phone: { v: '1', ts: 0, w: 's' } };
  const row = G.lwwRow({ ts: 1005, region: 't', cells: { ...base, bio: { v: 'A', ts: 1005, w: 't' } } }, { ts: 1003, region: 'p', cells: { ...base, phone: { v: '2', ts: 1003, w: 'p' } } });
  assert.strictEqual(row.cells.phone.v, '1', 'row-level LWW loses the other field');
  const cell = G.lwwCell({ cells: { ...base, bio: { v: 'A', ts: 1005, w: 't' } } }, { cells: { ...base, phone: { v: '2', ts: 1003, w: 'p' } } });
  assert.deepStrictEqual([cell.bio.v, cell.phone.v], ['A', '2']);
  const tA = { cells: { bio: { v: 'A', ts: 1000, w: 'tokyo' } } }, tB = { cells: { bio: { v: 'B', ts: 1000, w: 'paris' } } };
  assert.strictEqual(G.lwwCell(tA, tB).bio.v, G.lwwCell(tB, tA).bio.v, 'a timestamp tie resolves the same in both orders');
  const rA = { ts: 7, region: 'tokyo', cells: {} }, rB = { ts: 7, region: 'paris', cells: {} };
  assert.strictEqual(G.lwwRow(rA, rB), G.lwwRow(rB, rA));
  assert.strictEqual(G.compareVC({ t: 1 }, { p: 1 }), 'concurrent'); assert.strictEqual(G.compareVC({ t: 1, p: 1 }, { t: 1 }), 'a-newer');
  assert.strictEqual(G.compareVC({ t: 1 }, { t: 2 }), 'b-newer'); assert.strictEqual(G.compareVC({ t: 1, p: 0 }, { t: 1 }), 'equal');
});

test('ex5: blast radius and crypto-shredding', () => {
  assert.strictEqual(S.blast({ detectMin: 10 }).share, 0.01); assert.strictEqual(S.blast({ detectMin: 45 }).share, 0.05);
  assert.strictEqual(S.blast({ detectMin: 10, waves: [100] }).share, 1);
  const v = S.vault(); v.addUser('a'); v.addUser('b');
  const ba = v.encrypt('a', 'a@x'), bb = v.encrypt('b', 'b@x');
  assert.strictEqual(v.decrypt('a', ba), 'a@x'); assert.ok(v.shred('a'));
  assert.throws(() => v.decrypt('a', ba)); assert.strictEqual(v.decrypt('b', bb), 'b@x');
  assert.strictEqual(S.guess(ba, 200), 0);
  const v2 = S.vault(); v2.addUser('a'); v2.addUser('b');
  const x1 = v2.encrypt('a', 'same'), x2 = v2.encrypt('a', 'same');
  assert.ok(!x1.iv.equals(x2.iv) && !x1.ct.equals(x2.ct), 'a fresh nonce per encryption');
  assert.throws(() => v2.decrypt('b', x1), 'one user key cannot open another user data');
  v2.shred('b'); assert.strictEqual(v2.decrypt('a', x1), 'same', 'shredding b leaves a readable');
});
