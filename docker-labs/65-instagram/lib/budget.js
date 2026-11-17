'use strict';
// ex0 — the video's budget sheet, recomputed. Every input is the video's assumption unless marked otherwise.
const DAY = 86400;
const A = {                                  // video assumptions
  dau: 500e6, uploadShare: 1 / 5, peak: 3, storedMBPerPhoto: 3, viewsPerUser: 200, viewKB: 200,
  egressUSDperGB: 0.05, likesPerUser: 10, rawPhotoMB: 5, metaRowBytes: 150,
};
function sheet(a = A) {
  const uploadsDay = a.dau * a.uploadShare, uploadsS = uploadsDay / DAY;
  const viewsDay = a.dau * a.viewsPerUser, viewsS = viewsDay / DAY;
  const egressGBs = viewsS * a.viewKB / 1e6;                     // GB per second (decimal units)
  const egressPBday = egressGBs * DAY / 1e6;
  const likesS = a.dau * a.likesPerUser / DAY;
  return {
    uploadsDay, uploadsS, uploadsPeakS: uploadsS * a.peak,
    storeTBday: uploadsDay * a.storedMBPerPhoto / 1e6, storePByear: uploadsDay * a.storedMBPerPhoto * 365 / 1e9,
    viewsDay, viewsS, readWrite: viewsS / uploadsS,
    egressGBs, egressTbps: egressGBs * 8 / 1000, egressPBday, egressUSDday: egressPBday * 1e6 * a.egressUSDperGB,
    likesS, likesPeakS: likesS * a.peak, likesVsUploadsPeak: likesS / uploadsS,
    walGBsIfBlobsInDB: uploadsS * a.rawPhotoMB / 1000,
  };
}
// Postgres stores a large value out of line (TOAST) in chunks of TOAST_MAX_CHUNK_SIZE = 1996 bytes with 8 KB pages.
const toastChunks = bytes => Math.ceil(bytes / 1996);
// Rows per GiB: raw row bytes only, and with the 23-byte tuple header + 4-byte line pointer (page headers ignored).
const rowsPerGiB = (rowBytes, overhead = 0) => Math.floor(2 ** 30 / (rowBytes + overhead));
// Storage: n copies vs Reed-Solomon k data + m parity (lab 14 runs a real Reed-Solomon coder).
const storage = (uniquePB, { copies = 3, k = 10, m = 4 } = {}) => ({ replicated: uniquePB * copies, erasure: uniquePB * (k + m) / k, survivesEC: m, repairReads: k });
// Speed of light in fibre ~200,000 km/s. Handshake round trips before the first HTTP request byte.
const fibreMs = km => km / 200000 * 1000;
const HANDSHAKES = { 'TCP + TLS 1.2': 3, 'TCP + TLS 1.3': 2, 'QUIC (HTTP/3)': 1 };
module.exports = { A, DAY, sheet, toastChunks, rowsPerGiB, storage, fibreMs, HANDSHAKES };
