'use strict';
// 32-bit hash of a string: the first 4 bytes of MD5 (same as lab 34). MD5 is fine for spreading keys, not for security.
const crypto = require('node:crypto');
const h32 = s => crypto.createHash('md5').update(String(s)).digest().readUInt32BE(0);
module.exports = { h32 };
// Cheap 32-bit mix for integer keys (MurmurHash3 finalizer): the router calls it for every row, so it must be fast.
function mix32(x) {
  x = (x ^ (x >>> 16)) >>> 0; x = Math.imul(x, 0x85ebca6b) >>> 0;
  x = (x ^ (x >>> 13)) >>> 0; x = Math.imul(x, 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}
module.exports.mix32 = mix32;
