'use strict';
// Arithmetic. SQS STANDARD queue: a message moved to a DLQ keeps its ORIGINAL enqueue time, so it expires `dlqRetentionH`
// after it was first sent — not after it reached the DLQ. (FIFO queues reset the time on the move: keepsOriginalTime = false.)
// Assumptions: messages land in the DLQ at ages spread evenly over 0 … failWindowH (≤ the source retention, otherwise they
// would have expired in the source queue), and someone looks `lookAfterH` hours after each message lands. Fraction gone?
function dlqLoss({ sourceRetentionH = 96, dlqRetentionH = 96, failWindowH = 72, lookAfterH = 48, keepsOriginalTime = true } = {}) {
  if (failWindowH > sourceRetentionH) throw new Error('failWindowH must be ≤ sourceRetentionH');
  let gone = 0; const N = 1000;
  for (let i = 0; i < N; i++) {
    const failAge = failWindowH * (i + 0.5) / N;                        // hours since first sent, when it lands in the DLQ
    const expiresAt = keepsOriginalTime ? dlqRetentionH : failAge + dlqRetentionH;   // measured from first send
    if (failAge + lookAfterH >= expiresAt) gone++;
  }
  return gone / N;
}
// Availability ≈ MTBF / (MTBF + MTTR)
const availability = (mtbfH, mttrH) => mtbfH / (mtbfH + mttrH);
module.exports = { dlqLoss, availability };
