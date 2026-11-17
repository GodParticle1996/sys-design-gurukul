'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { environment } = require('../tools/mini-dom');
const { load } = require('../tools/replay-exercises');
const { SD, document, levels } = load();
for (const video of SD.videoLibrary) {
  assert.match(video.id, /^[A-Za-z0-9_-]{11}$/);
  assert(video.levels.every(id=>levels.has(id)));
  assert(video.chapters.every(([seconds],i)=>Number.isSafeInteger(seconds)&&seconds>=0&&(!i||seconds>video.chapters[i-1][0])));
}
const before = JSON.stringify(SD.state);
SD.ui.showIntro(levels.get('sds-live-kaise'));
assert.equal(document.getElementById('app').querySelectorAll('iframe').length,0,'Opening a lesson must not load YouTube');
const play = document.getElementById('app').querySelectorAll('button').find(b=>b.textContent.includes('Yahin video'));
assert(play); play.click();
const frame = document.getElementById('app').querySelector('iframe');
assert.equal(frame.src,'https://www.youtube-nocookie.com/embed/X_DdIXrmWOo?start=0');
assert(frame.title.includes('System Design School'));
play.click(); assert.equal(document.getElementById('app').querySelectorAll('iframe').length,1,'Repeated play replaces the player');
assert(document.getElementById('app').querySelectorAll('a').some(a=>a.href==='https://www.youtube.com/watch?v=X_DdIXrmWOo&t=102s'));
assert.equal(JSON.stringify(SD.state),before,'Watching a source does not earn XP or complete a stage');
SD.ui.showHome(); assert.equal(document.getElementById('app').querySelectorAll('iframe').length,0,'Navigation removes player');
function boot(hash) {
  const env = environment(); env.sandbox.location.hash = hash;
  const context = vm.createContext(env.sandbox), root = path.resolve(__dirname,'..');
  const files = [...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1]);
  for (const file of files) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  return {app:env.document.getElementById('app'), SD:vm.runInContext('SD',context)};
}
const linked = boot('#level=sds-live-kaise');
assert(linked.app.textContent.includes('Road aur register'),'Companion deep link opens its lesson');
assert.equal(linked.SD.state.completed.length,0,'Opening a link does not complete a lesson');
const lockedTrack = SD.tracks.find(t=>!SD.trackUnlocked(t));
const sequential = SD.tracks.find(t=>SD.trackUnlocked(t)&&!t.freeOrder&&SD.levelsOf(t).length>1);
for (const id of [SD.levelsOf(lockedTrack)[0].id, SD.levelsOf(sequential)[1].id]) {
  const blocked = boot('#level='+id);
  assert(blocked.app.textContent.includes('Linked lesson abhi locked'),'Deep link respects existing track and level gates');
  assert.equal(blocked.SD.state.completed.length,0);
}
console.log('PASS: source IDs/level mapping, chapter order, lazy player, timestamp links, navigation cleanup, deep links and course gates, unchanged learner progress (DOM model).');
