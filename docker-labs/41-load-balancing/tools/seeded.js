/* Chhota random generator jiska beej (seed) tay hai — wahi beej, wahi "random" sankhyaein. Slow motion mein isliye,
   taaki har run mein wahi intezaar aaye aur lesson ka dry run aur tumhara output mil sakein. Asli code mein Math.random hi theek hai. */
module.exports = function seeded(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
};
