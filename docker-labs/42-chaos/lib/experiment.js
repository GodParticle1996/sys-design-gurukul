/* Chaos prayog (experiment) ka dhancha.
   tools/experiment.js, tools/slowmo-experiment.js aur
   tools/mini.js yahi chalate hain.
     measure()      ek sankhya lautaye, jaise safal %
                    (jitni badi, utni achhi)
     hypothesis(m)  true = "system theek hai"
     inject()       ek fault lagao
     rollback()     fault hatao (hamesha chalta hai)
     abortIf(m)     true = "bas, ab aur nahi" (optional)
     watchMs        fault ke dauraan kitni der dekhna hai
     everyMs        kitne ms baad ek naap
     sleep(ms)      intezaar (slow motion: nakli ghadi) */

async function runExperiment(o) {
  const { measure, hypothesis, inject, rollback } = o;
  const { watchMs, everyMs, abortIf, sleep } = o;

  // 1. pehle naapo: system abhi theek hai?
  const steady = await measure();
  if (!hypothesis(steady)) {
    return {
      verdict: 'shuru hi mat karo',
      steady, worst: steady, abortedAt: null, samples: [],
    };
  }

  // 2. ek fault lagao, har everyMs par dekho
  const samples = [];
  let worst = Infinity;         // abhi kuch dekha nahi
  let abortedAt = null;
  try {
    await inject();
    for (let t = everyMs; t <= watchMs; t += everyMs) {
      await sleep(everyMs);
      const m = await measure();
      samples.push({ t, m });
      worst = Math.min(worst, m);
      if (abortIf && abortIf(m)) {
        abortedAt = t;          // nuksan hadd paar: ruko
        break;
      }
    }
  } finally {
    await rollback();           // kuch bhi ho, fault hatao
  }

  // 3. faisla (ABORT sabse bada)
  let verdict = 'hypothesis tika';
  if (!hypothesis(worst)) verdict = 'hypothesis toota';
  if (abortedAt !== null) verdict = 'ABORT';
  return { verdict, steady, worst, abortedAt, samples };
}

module.exports = { runExperiment };
