/* =====================================================================
   🎬 PLAYLIST COURSE — tracks (naya andaaz, 2026-10)
   Source (credit): YouTube playlist "System Design and Architecture" — Software Developer Diaries.
   Lessons khud mein poore hain: video dekhna zaroori nahi.

   Har theme ka ek track: hamesha khula (alwaysUnlocked), levels kisi bhi kram mein (freeOrder).
   Har topic ke levels chaar sawaalon par bante hain:
     KYUN  → asli samasya pehle, slow motion mein        KAISE → andar ka kaam, ek-ek click
     CODE  → asli code + asli library / setup             KAB   → kab lagayein, kab nahi, naapi hui galtiyan
   (Koi level ~20 steps se lamba ho jaaye toh do level ban jaate hain — jaise Circuit Breaker mein Code aur Library.)
   Topic files: data-v2-<topic>-<n>-<hissa>.js — har file SD.registerLevels('<track id>', [ ... ]) karti hai aur
   level par `group` deti hai (level map par topic ka heading). Shape ka poora vivaran: EXTENDING.md §10.

   Yeh file topic files se PEHLE load hoti hai.
   ===================================================================== */
(function () {

/* Sabse upar (unshift): abhi yahi padha ja raha hai. Hamesha-khule tracks agle core track ko lock nahi karte (core.js). */
SD.tracks.unshift({
  id: 'sdd-resil',
  icon: '🛡️',
  name: 'Playlist · 1 Resilience — samasya se code tak',
  blurb: 'System design playlist ka pehla hissa: jab koi service dheemi, bimaar ya band ho jaaye, tab baaki system kaise bache. Har topic chaar sawaal: KYUN (samasya, slow motion mein) → KAISE (andar ka kaam, ek-ek click) → CODE (asli code aur library) → KAB (kab lagayein, kab nahi). Hamesha khula, kisi bhi kram mein.',
  certTitle: 'RESILIENCE RAKSHAK',
  certSub: 'Certificate of Resilience — Kyun, Kaise, Code, Kab',
  motto: 'Har cheez tootegi. Sawaal sirf yeh hai: tootne par baaki system ka kya hoga?',
  formula: 'Timeout tumhe bachata hai · Breaker tumhe AUR bimaar service ko · Fallback user ko',
  alwaysUnlocked: true,
  freeOrder: true,
});

})();
