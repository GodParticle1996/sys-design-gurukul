'use strict';
// Original, deliberately small teaching protocol. NOT a Stripe SDK replacement.
// Header: t=<integer seconds>,v1=<hex HMAC of timestamp + '.' + original bytes>.
const {createHmac, timingSafeEqual} = require('node:crypto');
function sign(rawBody, secret, timestamp) {
  if (!Buffer.isBuffer(rawBody)) throw Error('Pass original request bytes as a Buffer');
  if (!Number.isSafeInteger(timestamp) || timestamp < 0) throw Error('Invalid timestamp');
  const digest = createHmac('sha256',secret).update(String(timestamp)+'.').update(rawBody).digest('hex');
  return `t=${timestamp},v1=${digest}`;
}
function verify(rawBody, header, secret, now, tolerance=300) {
  if (!Buffer.isBuffer(rawBody) || !Number.isSafeInteger(now) ||
      !Number.isSafeInteger(tolerance) || tolerance <= 0) return false;
  // Lab supports one active signature and a maximum 64 KiB payload.
  if (rawBody.length > 65536 || typeof header !== 'string' || header.length > 100) return false;
  const parts = /^t=(0|[1-9]\d{0,15}),v1=([a-f0-9]{64})$/.exec(header);
  if (!parts) return false;
  const timestamp = Number(parts[1]);
  if (!Number.isSafeInteger(timestamp) || Math.abs(now-timestamp)>tolerance) return false;
  const expected = Buffer.from(sign(rawBody,secret,timestamp).split('v1=')[1],'hex');
  return timingSafeEqual(expected,Buffer.from(parts[2],'hex'));
}
module.exports={sign,verify};
