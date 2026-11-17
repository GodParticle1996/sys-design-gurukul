'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Objects, readRelease } = require('./model.cjs');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gurukul-storage-'));
let fd;
try {
  fs.mkdirSync(path.join(root, 'draft'));
  fs.writeFileSync(path.join(root, 'draft', 'report.txt'), 'report-v1');
  fs.writeFileSync(path.join(root, 'draft', 'budget.txt'), 'budget-v1');
  fd = fs.openSync(path.join(root, 'draft', 'report.txt'), 'r');
  fs.renameSync(path.join(root, 'draft'), path.join(root, 'published'));
  assert.equal(fs.existsSync(path.join(root, 'draft')), false);
  assert.deepEqual(fs.readdirSync(path.join(root, 'published')).sort(), ['budget.txt', 'report.txt']);
  assert.equal(fs.readFileSync(fd, 'utf8'), 'report-v1');
  console.log('PASS filesystem: directory renamed; both children reachable; old open handle still reads report-v1');
} finally {
  if (fd !== undefined) fs.closeSync(fd);
  fs.rmSync(root, { recursive: true, force: true });
}

const rename = new Objects();
rename.put('draft/report.txt', 'report-v1');
rename.put('draft/budget.txt', 'budget-v1');
// Failure injected between operations, not an OS crash or a network timeout.
assert.throws(() => {
  rename.copy('draft/report.txt', 'published/report.txt');
  throw new Error('Worker stopped before delete and next copy');
}, /Worker stopped/);
assert.deepEqual(rename.list('draft/'), ['draft/budget.txt', 'draft/report.txt']);
assert.deepEqual(rename.list('published/'), ['published/report.txt']);
console.log('PASS object model: draft has 2 keys; published has 1; report exists under both prefixes');

const mixed = new Objects();
mixed.put('current/report.txt', 'report-v1');
mixed.put('current/budget.txt', 'budget-v1');
mixed.put('current/report.txt', 'report-v2');
assert.deepEqual(readRelease(mixed, '["current/report.txt","current/budget.txt"]'), ['report-v2', 'budget-v1']);
console.log('PASS object model: immediate reads still return mixed release report-v2 + budget-v1');

const releases = new Objects();
releases.put('v1/report.txt', 'report-v1');
releases.put('v1/budget.txt', 'budget-v1');
releases.put('active.json', '["v1/report.txt","v1/budget.txt"]');
const reader = releases.get('active.json'); // pin exactly once per logical read
releases.put('v2/report.txt', 'report-v2');
assert.deepEqual(readRelease(releases, releases.get('active.json').body), ['report-v1', 'budget-v1']);
// Do not publish the v2 manifest until every immutable object is stored successfully.
releases.put('v2/budget.txt', 'budget-v2');
releases.put('active.json', '["v2/report.txt","v2/budget.txt"]', reader.version);
assert.deepEqual(readRelease(releases, reader.body), ['report-v1', 'budget-v1']);
assert.deepEqual(readRelease(releases, releases.get('active.json').body), ['report-v2', 'budget-v2']);
console.log('PASS manifest: pinned reader gets all v1; new reader gets all v2');

assert.throws(() => releases.put('active.json', '["v1/report.txt","v1/budget.txt"]', reader.version), /Precondition failed/);
assert.deepEqual(readRelease(releases, releases.get('active.json').body), ['report-v2', 'budget-v2']);
console.log('PASS condition: stale publisher cannot overwrite the newer active manifest');

// Show why deleting old generations immediately breaks readers that pinned them.
releases.delete('v1/budget.txt');
assert.throws(() => readRelease(releases, reader.body), /Missing object: v1\/budget.txt/);
console.log('PASS retention counterexample: deleting v1 too early breaks the pinned reader');
