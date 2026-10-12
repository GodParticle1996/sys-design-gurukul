/* Sensor ka content interpreter — CrowdStrike ke "engine vs fuel" jaisa.
   SENSOR CODE (engine, slow lane, signed): named-pipe event ke liye 20 inputs deta hai.
   TEMPLATE TYPE (contract): kehta hai rule mein 21 fields honge.
   TEMPLATE INSTANCE (fuel, fast lane): ek rule = 21 values, '*' = wildcard (kuch bhi chalega).
   "Kernel" mein array ke bahar padhna = fatal (Windows fail-stop). JS mein undefined milta — isliye yahan khud fatal banaya. */
const SENSOR_INPUTS = 20;          // sensor code asli mein itne deta hai
const TEMPLATE_FIELDS = 21;        // template type ka contract itne kehta hai

function namedPipeEvent(i) {        // ek named-pipe event — 20 inputs
  return Array.from({ length: SENSOR_INPUTS }, (_, k) => `v${(i + k) % 7}`);
}

function evaluate(rule, input) {
  for (let f = 0; f < rule.length; f++) {
    if (rule[f] === '*') continue;                         // wildcard → input padhne ki zaroorat hi nahi
    if (f >= input.length) { const e = new Error('PAGE_FAULT_IN_NONPAGED_AREA (csagent.sys): input[' + f + '] padha, sirf ' + input.length + ' hain'); e.fatal = true; throw e; }
    if (rule[f] !== input[f]) return false;
  }
  return true;
}

/* Content validator — do versions:
   spec     : rule mein TEMPLATE_FIELDS (21) fields hain? bas.  (July 2024 wala)
   contract : har non-wildcard field ka index < sensor jitne inputs deta hai?  (baad wala) */
function validate(rule, mode) {
  if (rule.length !== TEMPLATE_FIELDS) return { ok: false, why: `${rule.length} fields, contract ${TEMPLATE_FIELDS} maangta hai` };
  if (mode === 'contract') {
    const bad = rule.findIndex((v, i) => v !== '*' && i >= SENSOR_INPUTS);
    if (bad >= 0) return { ok: false, why: `field ${bad + 1} par asli value, par sensor sirf ${SENSOR_INPUTS} inputs deta hai` };
  }
  return { ok: true };
}

module.exports = { evaluate, validate, namedPipeEvent, SENSOR_INPUTS, TEMPLATE_FIELDS };
