/* GPU pool scheduler — ek din (1,440 minute) ka simulation, har minute ek kadam.
   150 GPUs (default), teen tarah ke log:
     👩‍🎓 interactive — notebook mein cells chalate hain (20–120 min), phir TAB KHULA chhod dete hain (0–8 ghante idle)
     🏋️ trainer     — 10–30 ghante lagataar training chahiye
     ⛏️ miner       — 24 ghante 100% GPU, koi cell nahi chalta (free GPU "farm" karna)
   policy=none  : pehle aao pehle pao; GPU tab tak tumhara jab tak tum khud na jao
   policy=idle  : sirf 90 min idle → GPU wapas
   policy=colab : 90 min idle → GPU wapas · 12 ghante ki hadd · miner pakdo (60 min bina interaction, 100% util) · interactive ko pehle
   Seeded random — har run same number deta hai. */
const { serve } = require('../lib/util');
const PORT = +process.env.PORT || 4812;

const { simulate } = require('../lib/pool-sim');

serve(PORT, {
  'GET /simulate': (req, res, url) => simulate(url.searchParams.get('policy') || 'none', +(url.searchParams.get('gpus') || 150), +(url.searchParams.get('seed') || 7)),
}, () => console.log(`pool → http://localhost:${PORT}/simulate?policy=none|colab`));
