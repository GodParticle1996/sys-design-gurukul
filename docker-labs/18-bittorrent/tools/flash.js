/* Flash crowd: 40 log ek saath 2 MB file maangte hain.
   node tools/flash.js --mode origin     (sab sirf origin se)
   node tools/flash.js --mode swarm      (tracker + peers ek dusre se)
   node tools/flash.js --mode swarm --malicious 5 */
const args = require('./args')();
const { post, get, sleep, host } = require('../lib/util');
const S = `http://${host('swarm')}:4882`;
(async () => {
  const st = await post(S + '/start', { mode: args.mode || 'swarm', peers: args.peers || 40, malicious: args.malicious || 0 });
  console.log(`mode=${st.mode}  peers=${st.peers}  malicious=${st.malicious}  file=${st.fileMB} MB (${st.pieces} pieces)  info_hash=${st.info_hash}…`);
  const limit = +(args.secs || 120) * 1000;
  let s;
  for (;;) {
    await sleep(2000);
    s = await get(S + '/status');
    console.log(`  t=${String(Math.round(s.elapsed_ms / 1000)).padStart(3)}s  finished ${String(s.finished).padStart(2)}/${s.peers}   origin ne bheje ${s.origin_uploaded_pieces}  peers ne bheje ${s.peer_uploaded_pieces}  corrupt pakde ${s.corrupt_pieces_caught}`);
    if (s.finished === s.peers || s.elapsed_ms > limit) break;
  }
  await post(S + '/stop');
  const share = s.origin_uploaded_pieces + s.peer_uploaded_pieces;
  console.log(`\nRESULT ${s.mode}: ${s.finished}/${s.peers} done, last at ${s.last_ms ? (s.last_ms / 1000).toFixed(1) + ' s' : '— (time limit)'}, p50 ${s.p50_ms ? (s.p50_ms / 1000).toFixed(1) + ' s' : '-'}`);
  console.log(`  origin ka upload: ${s.origin_uploaded_pieces} pieces (${share ? Math.round(100 * s.origin_uploaded_pieces / share) : 0}% of total)`);
  if (s.corrupt_pieces_caught) console.log(`  SHA-1 mismatch: ${s.corrupt_pieces_caught} pieces reject, ${s.bans} bans — koi kharab piece file mein nahi gaya`);
})();
