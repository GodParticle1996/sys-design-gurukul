/* Command side: padho → faisla → likho. mode 'any' = video jaisa (bina version ke jodo), 'expected' = jo padha wahi version.
   gapMs = padhne aur likhne ke beech ka kaam (fraud check, network) — lab ki setting. */
const { readStream, append, Conflict } = require('./events');
const { fold } = require('./account');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function withdraw(db, account, amount, { mode = 'expected', gapMs = 0, afterRead = async () => {} } = {}) {
  if (!Number.isSafeInteger(amount) || amount <= 0) return { result: 'invalid', tries: 0 };   // lab: poore rupaye, positive
  for (let tries = 1; ; tries++) {
    const state = fold(readStream(db, account));
    await afterRead(tries);
    await sleep(gapMs);
    if (state.balance < amount) return { result: 'rejected', tries, balance: state.balance };
    try {
      const at = append(db, account, mode === 'any' ? 'any' : state.version, [{ type: 'Withdrawn', data: { amount } }]);
      return { result: 'ok', tries, ...at };
    } catch (err) {
      if (!(err instanceof Conflict)) throw err;     // kisi ne beech mein likha: dobara padho, dobara faisla
    }
  }
}
module.exports = { withdraw, sleep };
