// node dev/rewrite/replace.js fixes.json [--dry] — fixes.json is [[file, old, new], ...]; each old must occur
// exactly once in its file. Files are checked with node --check and the app reloaded; any failure restores them.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..', '..');
const [patchFile, flag] = process.argv.slice(2);
const fixes = JSON.parse(fs.readFileSync(patchFile, 'utf8'));
const before = {}, after = {};
const problems = [];
for (const [file, oldS, newS] of fixes) {
  const abs = path.join(root, file);
  if (!(file in after)) after[file] = before[file] = fs.readFileSync(abs, 'utf8');
  const n = after[file].split(oldS).length - 1;
  if (n !== 1) { problems.push(`${file}: ${n} matches for: ${oldS.slice(0, 80)}`); continue; }
  after[file] = after[file].replace(oldS, () => newS);
}
if (problems.length) { console.log(problems.map(p => '✗ ' + p).join('\n')); process.exit(1); }
if (flag === '--dry') { console.log(`dry run ok: ${fixes.length} fixes, files: ${Object.keys(after).join(' ')}`); process.exit(0); }
try {
  for (const f in after) fs.writeFileSync(path.join(root, f), after[f]);
  for (const f in after) execFileSync('node', ['--check', path.join(root, f)], { stdio: 'pipe' });
  execFileSync('node', ['-e', "require('./dev/load-app').loadApp()"], { cwd: root, stdio: 'pipe' });
  console.log(`✓ ${fixes.length} fixes applied · ${Object.keys(after).join(' ')}`);
} catch (e) {
  for (const f in before) fs.writeFileSync(path.join(root, f), before[f]);
  console.log('✗ restored: ' + String(e.stderr || e.message).slice(0, 400)); process.exit(1);
}
