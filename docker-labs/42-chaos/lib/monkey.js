/* Chaos monkey ka dimaag: ek target chuno, tod do.
   tools/monkey.js aur tools/mini.js yahi chalate hain.
     targets  — jo toote ja sakte hain (list)
     kill(t)  — ek target ko todne ka kaam (tum likhte ho)
     random   — 0 aur 1 ke beech sankhya dene wala function
                (asli mein Math.random; test mein tay beej)
     everyMs  — start() ke baad har itne ms par ek baar */

function createMonkey({ targets, kill, random, everyMs }) {
  let timer = null;

  // ek baar: ek random target todo, aur bata do kaun tha
  function strike() {
    const i = Math.floor(random() * targets.length);
    kill(targets[i]);
    return targets[i];
  }

  return {
    strike,
    start() {
      timer = setInterval(strike, everyMs);
    },
    stop() {
      clearInterval(timer);
    },
  };
}

module.exports = { createMonkey };
