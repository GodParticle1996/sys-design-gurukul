'use strict';
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { EventStore } = require('./store.cjs');
const { createLab } = require('./server.cjs');
const store = new EventStore(), lab = createLab(store);
function request(url, method='GET', headers={}, pressure=false) {
  const response = new EventEmitter();
  Object.assign(response,{chunks:[],destroyed:false,writeHead(code,headers){this.status=code;this.headers=headers;},write(chunk){this.chunks.push(chunk);return !pressure;},end(chunk){if(chunk)this.chunks.push(String(chunk));},destroy(){this.destroyed=true;this.emit('close');}});
  lab.server.emit('request',{url,method,headers},response);
  return response;
}
try {
  const client = request('/events'); assert.equal(client.status,200);
  assert.match(client.chunks.join(''),/event: snapshot/);
  request('/advance','POST',{'x-lab':'1'});
  assert.match(client.chunks.join(''),/id: 1\nevent: update/);
  const blocked = request('/events','GET',{},true); assert(blocked.destroyed);
  request('/advance','POST',{'x-lab':'1'});
  assert.match(request('/events','GET',{'last-event-id':'1'}).chunks.join(''),/id: 2\nevent: update/);
  assert.equal(request('/events','GET',{'last-event-id':'999'}).status,400);
  assert.equal(request('/events','GET',{'last-event-id':'1x'}).status,400);
  request('/disconnect','POST',{'x-lab':'1'}); assert(client.destroyed);
  console.log('PASS: actual request handler with mock HTTP responses; initial snapshot, live publish, replay, invalid input, slow response close, disconnect cleanup.');
  console.log('No network sockets were used. This does not prove HTTP/browser delivery.');
} finally { lab.stop(); store.close(); }
