'use strict';
const { Shortener, Analytics, createLink } = require('./store.cjs');
const scenario = process.argv[2] || 'early';
const store = new Shortener(), consumer = new Analytics();
const show = (step, value) => console.log(step + ': ' + JSON.stringify(value));
try {
  if (['early','sync','pending'].includes(scenario)) {
    show('1. Create response', createLink(store, scenario, 'abc', 'https://example.com/menu'));
    show('2. Immediate redirect', store.redirect('abc'));
    if (scenario !== 'sync') {
      show('3. Job status before worker', store.status('abc'));
      show('4. Worker result', store.work('abc'));
      show('5. Job status after commit', store.status('abc'));
      show('6. Redirect after commit', store.redirect('abc'));
    }
    console.log(scenario === 'early' ? 'Diagnosis: created was reported before the mapping existed.' : scenario === 'sync' ? 'Diagnosis: this primary-only read path can see the committed mapping.' : 'Diagnosis: accepted was truthful; the client must check job completion.');
  } else if (scenario === 'retry') {
    createLink(store, 'sync', 'abc', 'https://example.com/menu');
    try { store.relay(consumer, () => { throw Error('Injected sender failure after consumer commit'); }); }
    catch (error) { show('1. Failure', error.message); }
    show('2. Consumer count', consumer.count('abc'));
    show('3. Sender still has unsent intent', store.pendingEvents());
    show('4. Retried deliveries', store.relay(consumer));
    show('5. Consumer count after duplicate', consumer.count('abc'));
    console.log('Diagnosis: delivery retried; the local consumer applied the same event ID once. No external broker was tested.');
  } else throw Error('Choose early, sync, pending or retry');
} finally { consumer.close(); store.close(); }
