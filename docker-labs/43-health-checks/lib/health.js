/* App ka health wala hissa — do sawaal, do jawab, aur band hone ka tareeka.
   services/pod.js aur tools/mini.js yahi chalate hain.
     live()   "kya main atak gaya hoon?"         jawab na mile → checker app ko RESTART karta hai
     ready()  "kya abhi mujhe traffic bhejein?"   jawab "nahi" → checker bas traffic ROKTA hai
     stop()   band hone ka signal aa gaya          → pehle traffic rukwao; chalte kaam baad mein poore honge
   check   — (optional) dependency se poochhne wala function; true / false lautata hai.
             Yeh probe ke raaste mein NAHI chalta: har everyMs par ek baar, aur jawab yaad rakha jaata hai. */

function createHealth({ check, everyMs = 2000 } = {}) {
  let depOk = true;       // dependency ka aakhri jawab
  let stopping = false;
  let timer = null;

  async function refresh() {
    depOk = await check();
  }

  return {
    start() {
      if (!check) return;
      refresh();
      timer = setInterval(refresh, everyMs);
    },
    live() {
      return true;        // kisi aur se nahi poochhta
    },
    ready() {
      return !stopping && depOk;
    },
    stop() {
      stopping = true;
      clearInterval(timer);
    },
  };
}

module.exports = { createHealth };
