'use strict';
// ex5 — blast radius of a bad config (arithmetic) and crypto-shredding (real AES-256-GCM from node:crypto).
const crypto = require('node:crypto');

// Rollout in waves of cells; a bad config is caught `detectMin` minutes after it reaches users. Users hit = users in cells
// that had the config when it was caught. waves: cumulative cell counts; bakeMin: wait before the next wave.
function blast({ cells = 100, usersPerCell = 10e6, waves = [1, 5, 25, 100], bakeMin = 30, detectMin = 10 } = {}) {
  let t = 0;
  for (const w of waves) {
    if (detectMin <= t + bakeMin) return { cellsHit: w, usersHit: w * usersPerCell, share: w / cells };
    t += bakeMin;
  }
  return { cellsHit: cells, usersHit: cells * usersPerCell, share: 1 };
}

// Envelope encryption: each user's data key (DEK) encrypts their personal data; a master key (KEK) encrypts the DEK.
const seal = (key, plain) => { const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(plain), c.final()]); return { iv, ct, tag: c.getAuthTag() }; };
const open = (key, box) => { const d = crypto.createDecipheriv('aes-256-gcm', key, box.iv); d.setAuthTag(box.tag);
  return Buffer.concat([d.update(box.ct), d.final()]); };

function vault() {
  const kek = crypto.randomBytes(32), wrapped = new Map();             // userId → DEK sealed with the KEK
  return {
    addUser(id) { wrapped.set(id, seal(kek, crypto.randomBytes(32))); },
    encrypt(id, text) { return seal(open(kek, wrapped.get(id)), Buffer.from(text)); },
    decrypt(id, box) { const w = wrapped.get(id); if (!w) throw new Error('key nahi mili'); return open(open(kek, w), box).toString(); },
    shred(id) { return wrapped.delete(id); },
    keys: () => wrapped.size,
  };
}
// Without the key, the only way in is guessing a 256-bit key: try a few random keys to show the tag check fails.
function guess(box, tries = 1000) { let ok = 0; for (let i = 0; i < tries; i++) { try { open(crypto.randomBytes(32), box); ok++; } catch { /* tag mismatch */ } } return ok; }
module.exports = { blast, vault, guess, seal, open };
