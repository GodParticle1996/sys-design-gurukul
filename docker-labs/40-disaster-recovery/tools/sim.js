/* Nakli ghadi (fixed clock) — saare slow motion tools (slowmo*.js) yahi chalate hain.
   at(t, order, fn)  t ms par fn chalao. Ek hi pal par kaun pehle: chhota `order` pehle (phir jo pehle likha gaya).
   say(text)         ek line, aaj ke "samay" ke saath, turant chhapti hai
   go()              saare events samay ke kram mein chalata hai. --fast ho toh intezaar nahi; warna asli samay ke hisaab se.
   Har event ke baad ek macrotask ruk-ke sab promise poore hone dete hain — isliye --fast aur asli raftaar, dono mein output wahi.
   ids([1,2,3,5]) → "#1–#3, #5" */
const { sleep } = require('../lib/util');

const s2 = ms => (ms / 1000).toFixed(2) + ' s';
const settle = () => new Promise(r => setImmediate(r));

function createSim({ fast, run }) {
  const events = [];
  let clock = 0, seq = 0;
  const at = (t, order, fn) => events.push({ t, order, seq: seq++, fn });
  const say = text => console.log(`   ${s2(clock).padStart(7)}  ${text}`);
  async function go() {
    const t0 = Date.now();
    while (events.length) {
      events.sort((a, b) => a.t - b.t || a.order - b.order || a.seq - b.seq);
      const e = events.shift();
      if (e.t > run) break;
      if (!fast) await sleep(Math.max(0, t0 + e.t - Date.now()));
      clock = e.t; e.fn();
      await settle();
    }
  }
  return { at, say, go, now: () => clock };
}

/* order ke number ek line mein: 3 ya zyada lagataar ho toh "#1–#6", warna "#7, #9" */
function ids(list) {
  const a = list.slice().sort((x, y) => x - y), out = [];
  for (let i = 0; i < a.length;) {
    let j = i;
    while (j + 1 < a.length && a[j + 1] === a[j] + 1) j++;
    if (j - i >= 2) out.push(`#${a[i]}–#${a[j]}`);
    else for (let k = i; k <= j; k++) out.push(`#${a[k]}`);
    i = j + 1;
  }
  return out.join(', ') || '(koi nahi)';
}

module.exports = { createSim, s2, ids };
