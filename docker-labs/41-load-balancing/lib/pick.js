/* "Yeh request kis server par jaaye?" — chaar tareeke. services/lb.js, tools/slowmo.js aur tools/mini.js yahi chalate hain.
     loads  — har server par abhi kitna kaam hai (array). Yeh jaankari taaza bhi ho sakti hai, purani bhi:
              tareeka wahi rehta hai, nateeja badal jaata hai.
     random — 0 aur 1 ke beech ek sankhya dene wala function (asli code mein Math.random)
   Har function ek server ka number (0, 1, 2 …) lautata hai. */

/* 1. Baari-baari (round robin): 0, 1, 2, 0, 1, 2 …
      Load dekhta hi nahi; bas ek ginti yaad rakhta hai. */
function roundRobin(state, n) {
  return state.next++ % n;
}

/* 2. Koi bhi ek (random).
      Na kuch yaad rakhta hai, na kuch dekhta hai. */
function anyOne(n, random) {
  return Math.floor(random() * n);
}

/* 3. Sabse kam load wala. SAARE servers ko dekhta hai.
      Barabari ho toh barabar walon mein se koi bhi ek. */
function leastLoaded(loads, random) {
  const least = Math.min(...loads);
  const tied = [];          // jin par sabse kam load hai
  loads.forEach((load, i) => {
    if (load === least) tied.push(i);
  });
  // ek hi hai toh wahi; kai hain toh sikka
  return tied[Math.floor(random() * tied.length)];
}

/* 4. Do mein se behtar (power of two choices).
      Do ALAG servers random chuno; kam load wala lo. */
function bestOfTwo(loads, random) {
  const a = anyOne(loads.length, random);
  let b = anyOne(loads.length, random);
  while (b === a) b = anyOne(loads.length, random);
  return loads[a] <= loads[b] ? a : b;
}

module.exports = { roundRobin, anyOne, leastLoaded, bestOfTwo };
