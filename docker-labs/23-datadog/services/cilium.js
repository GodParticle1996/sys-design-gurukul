/* Cilium agent (CNI). Shuru hote hi apne rules daalta hai: "jis packet par fwmark 0x200 hai → cilium ki routing table".
   PROTO=cilium → rules par apna naam (protocol tag) bhi lagta hai (asli fix).  WATCH=1 → har 2 sec check kare ki rules abhi bhi hain. */
const { serve, post, get, host, sleep } = require('../lib/util');
const PORT = +process.env.PORT || 4992, K = `http://${host('kernel')}:4991`;
const PROTO = process.env.PROTO || null, WATCH = process.env.WATCH === '1';
let installed = 0, reinstalled = 0;
async function install(first) {
  await post(K + '/rule', { selector: 'fwmark 0x200', table: 'cilium', proto: PROTO, by: 'cilium' });
  if (first) installed++; else reinstalled++;
}
(async () => {
  await sleep(200); await install(true);
  console.log(`[cilium] rules installed (proto=${PROTO || 'koi nahi'})`);
  if (WATCH) setInterval(async () => { const { rules } = await get(K + '/rules'); if (!rules.some(r => r.by === 'cilium')) { await install(false); console.log('[cilium] rules gayab the — dobara daale'); } }, 2000);
})();
serve(PORT, { 'GET /stats': () => ({ proto: PROTO, watch: WATCH, installed, reinstalled }), 'POST /install': () => install(true).then(() => ({ ok: true })) },
  () => console.log(`[cilium] :${PORT}`));
