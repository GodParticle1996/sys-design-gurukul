'use strict';
// node test/mutate.js — copies the lab to a temp folder, breaks one line at a time, and checks that `node --test` fails.
// Every line below is a deliberate bug that would change a number or claim the lab teaches.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), { spawnSync } = require('node:child_process');
const MUTATIONS = [
  ['lib/budget.js', 'const uploadsDay = a.dau * a.uploadShare, uploadsS = uploadsDay / DAY;', 'const uploadsDay = a.dau * a.uploadShare, uploadsS = uploadsDay / 3600;', 'per-second rate'],
  ['lib/budget.js', 'uniquePB * (k + m) / k', 'uniquePB * (k + m) / m', 'erasure-coding overhead'],
  ['lib/budget.js', 'const toastChunks = bytes => Math.ceil(bytes / 1996);', 'const toastChunks = bytes => Math.ceil(bytes / 2048);', 'TOAST chunk size'],
  ['lib/upload.js', "&& clock.now <= exp;", ";", 'presigned URL expiry'],
  ['lib/upload.js', 'update(`${method}\\n/o/${key}\\n${expires}`)', 'update(`${method}\\n/o/${key}`)', 'expiry is part of the signature'],
  ['lib/upload.js', "sign(secret, req.method === 'HEAD' ? 'PUT' : req.method, key, exp)", "sign(secret, 'PUT', key, exp)", 'method is part of the signature'],
  ['lib/shred.js', 'const iv = crypto.randomBytes(12)', 'const iv = Buffer.alloc(12)', 'fresh AES-GCM nonce'],
  ['lib/shred.js', 'encrypt(id, text) { return seal(open(kek, wrapped.get(id)), Buffer.from(text)); },', "encrypt(id, text) { return seal(open(kek, wrapped.get('a') || wrapped.get(id)), Buffer.from(text)); },", 'each user has a separate key'],
  ['lib/upload.js', "if (offset !== obj.bytes.length) {", "if (false) {", 'resume at the stored offset'],
  ['lib/upload.js', "if (o.tags.status === 'pending' && clock.now - o.created > ageMs)", "if (clock.now - o.created > ageMs)", 'lifecycle rule matches only pending objects'],
  ['lib/upload.js', "obj.tags.status = 'final';", '', 'commit removes the lifecycle tag'],
  ['lib/likes.js', 'for (let k = 0; k < perMs && head < queue.length; k++)', 'for (let k = 0; k < perMs * 100 && head < queue.length; k++)', 'store throughput per ms'],
  ['lib/likes.js', 'for (let s = 0; s < sends; s++) { counter++; set.add(user); }', 'for (let s = 0; s < sends; s++) { counter++; set.add(user * 10 + s); }', 'set dedupes a retried like'],
  ['lib/likes.js', 'gc[m.to][x] = Math.max(gc[m.to][x], m.gc[x]);', 'gc[m.to][x] += m.gc[x];', 'G-Counter merge = max'],
  ['lib/feed.js', 'const pushPerPost = FMAX * S(vips + 1, N, ALPHA) / N;', 'const pushPerPost = FMAX * S(1, N, ALPHA) / N;', 'VIP posts do not push'],
  ['lib/feed.js', 'if (FMAX * S(1, N, mid) / N > MEAN) lo = mid; else hi = mid;', 'if (FMAX * S(1, N, mid) / N > MEAN) hi = mid; else lo = mid;', 'α calibration'],
  ['lib/global.js', 't = Math.min(prim, hedgeAfterMs + rep);', 't = Math.min(prim, rep);', 'a hedge starts only after the wait'],
  ['lib/global.js', 'if (prim > 100 && r() < correlated) rep = Math.max(rep, prim);', '', 'correlated slowness'],
  ['lib/global.js', 'const acks = [...rtt].sort((a, b) => a - b), need = Math.floor((rtt.length + 1) / 2);', 'const acks = [...rtt].sort((a, b) => a - b), need = rtt.length;', 'majority, not all'],
  ['lib/global.js', "out[k] = !x ? y : !y ? x : (later(x, y) ? x : y);", "out[k] = y || x;", 'per-cell LWW compares timestamps'],
  ['lib/global.js', "return aBig && bBig ? 'concurrent'", "return aBig || bBig ? 'concurrent'", 'vector-clock concurrency'],
  ['lib/shred.js', 'shred(id) { return wrapped.delete(id); },', 'shred(id) { return true; },', 'shredding deletes the key'],
  ['lib/shred.js', 'if (detectMin <= t + bakeMin) return', 'if (detectMin <= t + bakeMin * 10) return', 'wave timing'],
  ['lib/budget.js', "const HANDSHAKES = { 'TCP + TLS 1.2': 3, 'TCP + TLS 1.3': 2, 'QUIC (HTTP/3)': 1 };", "const HANDSHAKES = { 'TCP + TLS 1.2': 0, 'TCP + TLS 1.3': 0, 'QUIC (HTTP/3)': 0 };", 'handshake round trips'],
  ['lib/upload.js', 'if (h.status === 403) {', 'if (false) {', 'resume renews an expired URL'],
  ['lib/upload.js', 'if (obj.bytes.length !== ses.size || hash !== ses.sha256)', 'if (false)', 'only a complete photo is published'],
  ['lib/upload.js', "if (ses.photoId) return reply(res, 200, { id: ses.photoId, repeat: true });", '', 'a repeated commit returns the same row'],
  ['lib/upload.js', "if (obj.tags.status === 'final') { res.statusCode = 409; return res.end(); }", '', 'published bytes are frozen'],
  ['lib/likes.js', 'while (head < queue.length && t - queue[head] >= timeoutMs)', 'while (false)', 'timeouts'],
  ['lib/likes.js', 'if (free()) queue.push(t); else noWorker++;', 'if (free()) queue.push(t); else timedOut++;', 'rejected vs timed-out accounting'],
  ['lib/likes.js', "if (admit === 'likes-first') {", "if (admit === 'likes-first' || admit === 'feeds-first') {", 'admission order'],
  ['lib/feed.js', 'maxFanoutSeconds: maxFanout / writesPerS', 'maxFanoutSeconds: 600', 'largest-post service time per threshold'],
  ['lib/feed.js', 'const rankAbove = T => Math.min(N, ', 'const rankAbove = T => (', 'VIP population capped at N'],
  ['lib/global.js', 'return Math.max(acks[need - 1], 2 * epsilonMs);', 'return acks[need - 1];', 'commit wait'],
  ['lib/global.js', "function lwwRow(a, b) { return later({ ts: a.ts, w: a.region }, { ts: b.ts, w: b.region }) ? a : b; }", 'function lwwRow(a, b) { return a; }', 'row LWW compares timestamps'],
  ['lib/global.js', 'String(x.w) > String(y.w)', 'true', 'deterministic tie-break'],
  ['lib/global.js', "bBig ? 'b-newer'", "bBig ? 'a-newer'", 'vector clock: b newer'],
  ['lib/global.js', ": 'equal';", ": 'concurrent';", 'vector clock: equal'],
  ['lib/global.js', 'p99: percentile(out, 99)', 'p99: 0', 'page p99'],
];
const lab = path.join(__dirname, '..'), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lab65-mut-'));
fs.cpSync(lab, tmp, { recursive: true });
// Run the suite once. 'pass' and 'fail' come from node --test itself; anything else (spawn error, signal, timeout,
// a crash before any test ran) is an infrastructure error and must never count as a caught mutation.
function suite() {
  const r = spawnSync(process.execPath, ['--test', 'test/core.test.js'], { cwd: tmp, encoding: 'utf8', timeout: 120000 });
  if (r.error || r.signal) return { kind: 'infra', why: r.error ? r.error.message : `signal ${r.signal}` };
  const failed = Number((/^ℹ fail (\d+)/m.exec(r.stdout) || [])[1]), passed = Number((/^ℹ pass (\d+)/m.exec(r.stdout) || [])[1]);
  if (!Number.isFinite(failed) || !Number.isFinite(passed)) return { kind: 'infra', why: 'no test summary' };
  if (r.status === 0 && failed === 0) return { kind: 'pass' };
  const name = (/^✖ (.+?) \(\d/m.exec(r.stdout) || [])[1] || '?';
  return { kind: 'fail', why: name };
}
const base = suite();
if (base.kind !== 'pass') {
  console.log(`baseline did not pass (${base.kind}: ${base.why || 'tests failed'}) — fix that first; no mutation score.`);
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(2);
}
let missed = 0, infra = 0;
for (const [file, from, to, claim] of MUTATIONS) {
  const f = path.join(tmp, file), src = fs.readFileSync(f, 'utf8');
  if (src.split(from).length !== 2) throw new Error(`mutation anchor not found once: ${file}: ${from}`);
  fs.writeFileSync(f, src.replace(from, to));
  const r = suite();
  fs.writeFileSync(f, src);
  if (r.kind === 'pass') missed++;
  if (r.kind === 'infra') infra++;
  console.log(`${r.kind === 'pass' ? 'MISSED' : r.kind === 'infra' ? 'ERROR ' : 'caught'}  ${claim}${r.kind === 'fail' ? `  (failed: ${r.why})` : r.kind === 'infra' ? `  (${r.why})` : ''}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${MUTATIONS.length - missed - infra} / ${MUTATIONS.length} mutations caught${infra ? ` · ${infra} infrastructure errors` : ''}`);
process.exitCode = missed || infra ? 1 : 0;
