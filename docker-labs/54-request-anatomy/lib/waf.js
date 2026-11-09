'use strict';
// A toy WAF: N signature rules, every rule scans the whole request body. All rules are linear-time (no nested
// quantifiers), so this measures the honest cost of "rules × bytes", not a catastrophic-backtracking bug.
const BASE = [
  /union\s+(?:all\s+)?select/i, /\bor\s+1\s*=\s*1\b/i, /;\s*drop\s+table/i, /<script\b/i, /javascript:/i,
  /\bonerror\s*=/i, /\.\.\/\.\.\//, /\/etc\/passwd/, /\$\{jndi:/i, /\bsleep\s*\(\s*\d+\s*\)/i,
  /\bbenchmark\s*\(/i, /\bxp_cmdshell\b/i, /<iframe\b/i, /\bdocument\.cookie\b/i, /\beval\s*\(/i,
  /\bexec\s*\(/i, /\bwaitfor\s+delay\b/i, /%00/, /\bload_file\s*\(/i, /\binto\s+outfile\b/i,
];
const WORDS = ['char', 'concat', 'substr', 'ascii', 'hex', 'unhex', 'version', 'database', 'user', 'schema', 'table',
  'column', 'order', 'group', 'having', 'cast', 'convert', 'md5', 'sha1', 'base64', 'system', 'popen', 'require', 'import',
  'fetch', 'alert', 'prompt', 'confirm', 'atob', 'btoa'];
function rules(n) {
  const out = BASE.slice(0, Math.min(n, BASE.length));
  for (let i = 0; out.length < n; i++) {           // more signature-like rules: word + suffix + "(" with spacing
    const w = WORDS[i % WORDS.length], k = Math.floor(i / WORDS.length);
    out.push(new RegExp(`\\b${w}_${k}\\s*\\(`, 'i'));
  }
  return out;
}
function scan(ruleSet, body) {                      // index of the first rule that matches, or -1
  for (let i = 0; i < ruleSet.length; i++) if (ruleSet[i].test(body)) return i;
  return -1;
}
module.exports = { BASE, rules, scan };
