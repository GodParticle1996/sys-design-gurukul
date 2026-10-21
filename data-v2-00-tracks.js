/* =====================================================================
   🎬 PLAYLIST COURSE — tracks (naya andaaz, 2026-10)
   Sources (credit): "System Design and Architecture" — Software Developer Diaries;
   "System Design from First Principal" — FAANG Senior Engineer.
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

/* Har playlist track hamesha khula. Neeche ka naya theme unshift se sabse upar aata hai; core tracks lock nahi hote. */
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

SD.tracks.unshift({
  id: 'sdd-eda',
  icon: '📣',
  name: 'Playlist · 2 EDA Core — ek ghatna, alag kaam',
  blurb: 'KhanaKart ka order save hua. Ab kitchen, notification aur baaki kaam ek-doosre ko roke bina kaise chalein? Pehle samasya, phir har khabar ki copy, asli code, aur naapi hui galtiyan. Hamesha khula, kisi bhi kram mein.',
  certTitle: 'EVENT SAFAR SAATHI',
  certSub: 'Certificate of EDA Core — Kyun, Kaise, Code, Kab',
  motto: 'Khabar pahunchna aur kaam poora hona alag baatein hain.',
  formula: 'Event = ho chuki baat · Har consumer ki apni progress · Accepted se completion prove nahi hoti',
  alwaysUnlocked: true,
  freeOrder: true,
});

SD.tracks.unshift({
  id: 'fp-core',
  icon: '🧪',
  name: 'First Principles — machine se system tak',
  blurb: 'Pehle KhanaKart ki dikkat. Phir data ka raasta, kaam ka size, wait aur capacity ka hisaab. Har topic: KYUN → KAISE → CODE → KAB. Physics of Software se shuru; course numbered order mein badhega. Hamesha khula, kisi bhi kram mein.',
  certTitle: 'FIRST PRINCIPLES SOCHAK',
  certSub: 'Certificate of First Principles — Kyun, Kaise, Code, Kab',
  motto: 'Tool chunne se pehle poochho: waqt aur kaam kahan jaa rahe hain?',
  formula: 'Raasta + kaam + wait + capacity + cost → phir design',
  alwaysUnlocked: true,
  freeOrder: true,
});

})();
