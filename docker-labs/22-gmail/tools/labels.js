/* Inbox ek folder hai ya ek QUERY? 5,000 mails, phir sab archive.
   folder-move: mail ka poora record dobara likho (nayi jagah).   label: sirf "inbox" label hatao.
   node tools/labels.js   (ex1-ack ke stores chahiye) */
const { post, get, host } = require('../lib/util');
const A = `http://${host('store-a')}:4981`, N = 5000;
(async () => {
  console.log('tareeka        archive ke liye rows likhe   bytes likhe   archive ke baad Inbox');
  for (const mode of ['folder-move', 'label']) {
    await post(A + '/reset');
    for (let i = 1; i <= N; i++) await post(A + '/write', { id: 'm' + i, from: 'newsletter@shop.com', subject: 'Sale ' + i, labels: ['inbox'], body_bytes: 2048 });
    const before = await get(A + '/stats');
    for (let i = 1; i <= N; i++) {
      if (mode === 'folder-move') await post(A + '/write', { id: 'm' + i, from: 'newsletter@shop.com', subject: 'Sale ' + i, labels: ['archive'], body_bytes: 2048 });
      else await post(A + '/label', { id: 'm' + i, remove: ['inbox'], add: ['archive'] });
    }
    const after = await get(A + '/stats'), inbox = await get(A + '/q?label=inbox');
    console.log(`${mode.padEnd(15)}${String(after.rowsWritten - before.rowsWritten).padStart(12)}        ${String(after.bytesWritten - before.bytesWritten).padStart(10)}      ${String(inbox.count).padStart(6)} mails`);
  }
  await post(A + '/label', { id: 'm1', add: ['inbox', 'work', 'starred'] });
  const one = await get(A + '/q?label=work');
  console.log(`\nek hi mail teen jagah: ${JSON.stringify(one.sample[0])}`);
  console.log('Label wale mein mail apni jagah se hilta hi nahi — sirf ek chhota metadata update.');
  console.log('Isi liye Gmail mein ek hi mail Inbox + Work + Starred, teeno mein ho sakta hai (3 copies nahi).');
})();
