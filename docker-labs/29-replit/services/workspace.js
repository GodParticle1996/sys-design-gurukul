/* Agent ka workspace — asli disk par (./data).
   Snapshot do tarah ka:
     full → poora project folder copy (har snapshot = poori copy)
     cow  → content-addressed blocks: file ko 64 KB tukdon mein todo, har tukde ka SHA-256 naam. Snapshot = sirf "kaunse blocks"
            ki list (manifest). Jo block pehle se hai, dobara nahi likha jaata (copy-on-write / dedup).
   Rollback = snapshot se project wapas banao. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { serve } = require('../lib/util');
const PORT = +process.env.PORT || 5071, DATA = process.env.DATA || path.join(__dirname, '..', 'data');
const P = path.join(DATA, 'project'), FULL = path.join(DATA, 'full-snaps'), BLOCKS = path.join(DATA, 'blocks'), MAN = path.join(DATA, 'manifests');
const BS = 64 * 1024;
const du = dir => { let n = 0; if (!fs.existsSync(dir)) return 0; for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); n += f.isDirectory() ? du(p) : fs.statSync(p).size; } return n; };
const files = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(f => f.isDirectory() ? files(path.join(dir, f.name)) : [path.join(dir, f.name)]);
let snaps = 0, last = new Map();                                  // file → {mtimeMs, size, blocks} (pichhle snapshot se)
function reset() { fs.rmSync(DATA + '/project', { recursive: true, force: true }); for (const d of [FULL, BLOCKS, MAN]) fs.rmSync(d, { recursive: true, force: true }); [P, FULL, BLOCKS, MAN].forEach(d => fs.mkdirSync(d, { recursive: true })); snaps = 0; last = new Map(); }
reset();
serve(PORT, {
  'POST /project': (req, res, url, p, b) => {                         // naya project: n files, kul sizeMB (node_modules jaisa bhaari)
    reset(); const n = +(b.files || 200), each = Math.floor(+(b.sizeMB || 1) * 1048576 / n);
    for (let i = 0; i < n; i++) { const d = path.join(P, 'src', 'm' + (i % 20)); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, `f${i}.js`), crypto.randomBytes(each)); }
    return { files: n, bytes: du(P) };
  },
  'POST /edit': (req, res, url, p, b) => {                            // agent ne kuch files badli (ya tod di)
    const all = files(P).sort(); const k = +(b.files || 3);
    for (let i = 0; i < k; i++) fs.writeFileSync(all[(i * 37) % all.length], b.break ? 'syntax error {{{' : crypto.randomBytes(2048));
    return { edited: k };
  },
  'POST /snapshot': (req, res, url, p, b) => {
    const t = process.hrtime.bigint(), id = 's' + (++snaps); let written = 0;
    if (b.mode === 'full') { fs.cpSync(P, path.join(FULL, id), { recursive: true }); written = du(path.join(FULL, id)); }
    else {
      const man = []; let rehashed = 0;
      for (const f of files(P).sort()) {
        const st = fs.statSync(f), prev = last.get(f);
        if (prev && prev.mtimeMs === st.mtimeMs && prev.size === st.size) { man.push({ f: path.relative(P, f), blocks: prev.blocks, mtimeMs: st.mtimeMs }); continue; }   // file nahi badli → purane blocks
        rehashed++;
        const buf = fs.readFileSync(f), blocks = [];
        for (let o = 0; o < buf.length || o === 0; o += BS) {
          const chunk = buf.subarray(o, o + BS), h = crypto.createHash('sha256').update(chunk).digest('hex'), bp = path.join(BLOCKS, h);
          if (!fs.existsSync(bp)) { fs.writeFileSync(bp, chunk); written += chunk.length; }   // naya block hi likho
          blocks.push(h); if (!buf.length) break;
        }
        man.push({ f: path.relative(P, f), blocks, mtimeMs: st.mtimeMs }); last.set(f, { mtimeMs: st.mtimeMs, size: st.size, blocks });
      }
      b.rehashed = rehashed;
      fs.writeFileSync(path.join(MAN, id + '.json'), JSON.stringify(man)); written += fs.statSync(path.join(MAN, id + '.json')).size;
    }
    return { id, mode: b.mode, ms: +(Number(process.hrtime.bigint() - t) / 1e6).toFixed(1), writtenBytes: written, filesHashed: b.rehashed };
  },
  'POST /rollback': (req, res, url, p, b) => {
    const t = process.hrtime.bigint(); let rewritten = 0;
    if (fs.existsSync(path.join(FULL, b.id))) { fs.rmSync(P, { recursive: true, force: true }); fs.cpSync(path.join(FULL, b.id), P, { recursive: true }); rewritten = files(P).length; }
    else {
      const man = JSON.parse(fs.readFileSync(path.join(MAN, b.id + '.json'))); last = new Map();
      for (const e of man) {                                          // sirf wahi files dobara likho jo snapshot ke baad badli
        const out = path.join(P, e.f), st = fs.existsSync(out) ? fs.statSync(out) : null;
        if (!st || st.mtimeMs !== e.mtimeMs) { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, Buffer.concat(e.blocks.map(h => fs.readFileSync(path.join(BLOCKS, h))))); rewritten++; }
        const ns = fs.statSync(out); last.set(out, { mtimeMs: ns.mtimeMs, size: ns.size, blocks: e.blocks }); e.mtimeMs = ns.mtimeMs;
      }
    }
    const broken = files(P).filter(f => fs.readFileSync(f).toString('latin1').startsWith('syntax error')).length;
    return { restored: b.id, ms: +(Number(process.hrtime.bigint() - t) / 1e6).toFixed(1), brokenFiles: broken, filesRewritten: rewritten };
  },
  'GET /stats': () => ({ projectBytes: du(P), fullSnapBytes: du(FULL), cowBytes: du(BLOCKS) + du(MAN), broken: files(P).filter(f => fs.readFileSync(f).toString('latin1').startsWith('syntax error')).length }),
}, () => console.log(`[workspace] :${PORT} data=${DATA}`));
