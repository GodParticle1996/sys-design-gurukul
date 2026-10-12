/* 2,000 videos dikhe (impressions). Sach: 45% ko user ne poora dekha. Action aane mein delay:
   zyadatar 0.2–2 sec, par 20% ka 2–8 sec (network, app background mein, batch upload).
   Alag-alag window par: kitne sahi labels, kitne galat (late → positive ko negative bana diya)?
   node tools/stream.js */
const { post, get, sleep, host } = require('../lib/util');
const J = `http://${host('joiner')}:5051`;
(async () => {
  console.log('window    positive   negative   LATE (galat negative)   sach mein positive the   joiner memory (peak pending)');
  for (const w of [500, 2000, 5000, 9000]) {
    await post(J + '/config', { windowMs: w });
    let truePos = 0; const jobs = [];
    for (let i = 0; i < 2000; i++) {
      await post(J + '/impression', { id: 'imp' + i, features: { video: i % 300, hour: 21 } });
      if (Math.random() < 0.45) {
        truePos++;
        const delay = Math.random() < 0.8 ? 200 + Math.random() * 1800 : 2000 + Math.random() * 6000;
        jobs.push(sleep(delay).then(() => post(J + '/action', { id: 'imp' + i, action: 'finish' })));
      }
      if (i % 50 === 0) await sleep(10);
    }
    await Promise.all(jobs); await sleep(w + 300);
    const s = await get(J + '/stats');
    console.log(`${String(w).padStart(5)} ms   ${String(s.positive).padStart(6)}     ${String(s.negative).padStart(6)}        ${String(s.late).padStart(5)} (${(100 * s.late / truePos).toFixed(1)}%)            ${String(truePos).padStart(5)}                ${s.maxPending}`);
  }
  console.log('\nChhoti window: model jaldi seekhta hai, par kai positive "negative" ban jaate hain (galat sabak).');
  console.log('Badi window: labels sahi, par example der se trainer tak pahunchta hai aur joiner ki memory badhti hai.');
})();
