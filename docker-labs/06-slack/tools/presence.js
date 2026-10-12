/* Presence events: sabko sab batao vs sirf screen par dikhne walon ko (simulation) */
const a = require('./args')();
const USERS = +(a.users || 2000), FLICKERS = +(a.flickers || 3), MODE = process.env.PRESENCE || 'all';
const ON_SCREEN = 25;                    /* ek client ki screen par lagbhag kitne log */
const WATCHERS = 206;                    /* ek user ko aam taur par kitne log dekh sakte hain (channels + DMs) */
let events = 0;
for (let u = 0; u < USERS; u++) {
  for (let f = 0; f < FLICKERS; f++) {
    if (MODE === 'all') events += WATCHERS;                                        /* har watcher ko batao */
    else events += Math.round(WATCHERS * (ON_SCREEN / 120));                       /* sirf jinke screen par abhi yeh user hai */
  }
}
console.log(`PRESENCE=${MODE.padEnd(8)} users: ${USERS}   status badlav: ${USERS * FLICKERS}   events sent: ${events.toLocaleString('en-IN')}`);
