'use strict';
const assert = require('node:assert/strict');
const { EventStore } = require('./store.cjs');
const { createLab } = require('./server.cjs');
(async () => {
  const store = new EventStore(); const lab = createLab(store);
  try {
    await new Promise((resolve, reject) => {
      lab.server.once('error', reject); lab.server.listen(0, '127.0.0.1', resolve);
    });
    const base = `http://127.0.0.1:${lab.server.address().port}`;
    const get = (url, options = {}) => fetch(base + url, { ...options, signal: AbortSignal.timeout(4000) });
    async function event(cursor) {
      const res = await get('/events', { headers: cursor == null ? {} : { 'Last-Event-ID': String(cursor) } });
      assert.equal(res.status, 200); assert.match(res.headers.get('content-type'), /text\/event-stream/);
      const reader = res.body.getReader(); let text = '';
      try {
        while (!/data: .*\n\n/.test(text)) { const part = await reader.read(); if (part.done) throw Error('Stream ended'); text += new TextDecoder().decode(part.value); }
        return text;
      } finally { await reader.cancel(); }
    }
    assert.match(await event(), /event: snapshot/);
    for (let i=0;i<2;i++) assert.equal((await get('/advance',{method:'POST',headers:{'X-Lab':'1'}})).status,200);
    const replay = await event(1); assert.match(replay,/id: 2\nevent: update/); assert(!replay.includes('id: 1\n'));
    for (let i=0;i<2;i++) await get('/advance',{method:'POST',headers:{'X-Lab':'1'}});
    assert.match(await event(0),/id: 4\nevent: reset/);
    for (const value of ['-1','999','1.5','abc']) {
      const response = await get('/events',{headers:{'Last-Event-ID':value}});
      assert.equal(response.status,400); await response.text();
    }
    console.log('PASS: actual loopback HTTP snapshot, replay, retention reset and invalid-cursor responses. Browser EventSource remains a separate test.');
  } finally { lab.stop(); lab.server.closeAllConnections(); store.close(); }
})().catch(error => { console.error('HTTP CHECK NOT PASSED:',error.message); process.exitCode=1; });
