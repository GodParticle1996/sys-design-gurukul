#!/usr/bin/env node
'use strict';
/* Isolated file:// browser; no app server, installation, network or user profile. */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.QA_OUT || '/tmp/sys-design-gurukul-audit';
fs.mkdirSync(OUT, { recursive: true });
function snapshot() {
  const files = ['index.html', 'style.css', ...fs.readdirSync(ROOT).filter(f => f.endsWith('.js'))];
  return Object.fromEntries(files.map(f => [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, f))).digest('hex')]));
}
function playwright() {
  const npx = path.join(os.homedir(), '.npm/_npx');
  for (const dir of fs.existsSync(npx) ? fs.readdirSync(npx) : []) {
    const p = path.join(npx, dir, 'node_modules/playwright');
    if (fs.existsSync(p)) return require(p);
  }
  throw new Error('Existing Playwright not found; no dependencies were installed.');
}
function measure() {
  const offenders = [...document.querySelectorAll('body *')].filter(e => {
    const r = e.getBoundingClientRect();
    if (r.width <= 0 || r.right <= innerWidth + 1) return false;
    for (let p = e.parentElement; p; p = p.parentElement) {
      if (getComputedStyle(p).overflowX !== 'visible' && p.getBoundingClientRect().right <= innerWidth + 1) return false;
    }
    return true;
  }).slice(0, 8).map(e => ({ tag: e.tagName, class: e.className?.baseVal || e.className, text: e.textContent.slice(0, 100) }));
  return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, offenders,
    narrowGuideCells: [...document.querySelectorAll('.guide-details[open] .guide-compare td')].filter(e => e.getBoundingClientRect().width < 140).length,
    buttons: document.querySelectorAll('button,[role=button]').length };
}
function contrastInPage() {
  const rgb = s => { const m = String(s).match(/[\d.]+/g); return m ? [+m[0], +m[1], +m[2], m[3] == null ? 1 : +m[3]] : [0, 0, 0, 0]; };
  const over = (a, b) => [0, 1, 2].map(i => a[i] * a[3] + b[i] * (1 - a[3])).concat(1);
  const lum = a => a.slice(0, 3).map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }).reduce((s, x, i) => s + x * [.2126, .7152, .0722][i], 0);
  const failures = [];
  let tested = 0;
  for (const e of document.querySelectorAll('body *')) {
    if (e.closest('script,style,.locked,[disabled],[aria-disabled=true]') || (!e.matches('input[type=text],textarea,select') && ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))) continue;
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    if (!r.width || !r.height || cs.visibility === 'hidden' || Number(cs.opacity) < .99) continue;
    const ancestors = []; let gradient = false;
    for (let p = e; p; p = p.parentElement) {
      const s = getComputedStyle(p); ancestors.unshift({ color: rgb(s.backgroundColor), gradient: s.backgroundImage !== 'none' });
    }
    // Gradients and image-backed text need separate visual review, not a guessed ratio.
    const bg = ancestors.reduce((b, a) => {
      if (a.color[3] === 1) gradient = false; // an opaque panel covers the body's decorative gradient
      if (a.gradient) gradient = true;
      return over(a.color, b);
    }, [255, 255, 255, 1]);
    if (gradient) continue;
    const fg = over(rgb(cs.color), bg);
    const l = [lum(bg), lum(fg)].sort((a, b) => a - b), ratio = (l[1] + .05) / (l[0] + .05);
    const large = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && parseInt(cs.fontWeight) >= 700);
    tested++;
    if (ratio < (large ? 3 : 4.5)) failures.push({ class: e.className?.baseVal || e.className, text: e.textContent.trim().slice(0, 100), ratio: +ratio.toFixed(2), foreground: cs.color, background: bg.slice(0, 3) });
  }
  return { tested, failures: failures.slice(0, 20) };
}
(async () => {
  const { chromium } = playwright();
  const cached = path.join(os.homedir(), '.cache/ms-playwright');
  const executablePath = fs.readdirSync(cached).filter(d => /^chromium-\d+$/.test(d)).sort().reverse()
    .map(d => path.join(cached, d, 'chrome-linux64/chrome')).find(p => fs.existsSync(p));
  const browser = await chromium.launch({ headless: true, executablePath, args: ['--disable-dev-shm-usage'] });
  const report = { samples: [], errors: [], checks: [], screenshots: [], sourceBefore: snapshot() };
  try {
    for (const theme of ['dark', 'light']) {
      const context = await browser.newContext({ viewport: { width: 360, height: 800 }, colorScheme: theme });
      await context.route(/^https?:\/\//, r => r.abort());
      const page = await context.newPage();
      page.on('pageerror', e => report.errors.push(`${theme}: ${e.message}`));
      page.on('console', m => { if (m.type() === 'error') report.errors.push(`${theme}: ${m.text()}`); });
      await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href);
      await page.evaluate(t => { SD.state.theme = t; SD.applyTheme(); SD.ui.showHome(); }, theme);
      async function sample(id) { report.samples.push({ theme, id, ...await page.evaluate(measure), ...(process.env.QA_CONTRAST ? { contrast: await page.evaluate(contrastInPage) } : {}) }); }
      await sample('home');
      const entries = await page.evaluate(() => SD.tracks.flatMap(t => SD.levelSets[t.id].map(l => ({ track: t.id, id: l.id, stages: SD.ui.allStages(l).length }))));
      for (const { track, id, stages } of entries) {
        await page.evaluate(({ track, id }) => SD.ui.showIntro(SD.levelSets[track].find(l => l.id === id)), { track, id });
        await sample(`${id}/intro`);
        const guide = page.locator('.guide-details');
        if (await guide.count()) {
          await guide.evaluate(e => { e.open = true; });
          await sample(`${id}/guide-expanded`);
          if (['fp-physics-kyun', 'pool', 'ai-safety-filter'].includes(id)) {
            const name = `${theme}-${id}-guide-360.png`;
            await page.screenshot({ path: path.join(OUT, name), fullPage: true }); report.screenshots.push(name);
          }
        }
        for (let i = 0; i < stages; i++) {
          await page.evaluate(({ track, id, i }) => {
            SD.session = { level: SD.levelSets[track].find(l => l.id === id), stageIdx: i, firstTry: 0, total: 0, replay: true };
            SD.ui.runStage();
          }, { track, id, i });
          await sample(`${id}/stage/${i}`);
        }
      }
      for (const track of await page.evaluate(() => SD.tracks.map(t => t.id))) {
        await page.evaluate(id => SD.ui.showTrack(SD.tracks.find(t => t.id === id)), track);
        await sample(`${track}/map`);
        await page.evaluate(id => SD.ui.showCertificate(SD.tracks.find(t => t.id === id)), track);
        await sample(`${track}/certificate`);
      }
      await page.evaluate(() => SD.ui.showHome());
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement.tagName === 'BUTTON' || document.activeElement.getAttribute('role') === 'button');
      report.checks.push({ id: `${theme}/keyboard-home`, pass: focused });
      await page.screenshot({ path: path.join(OUT, `${theme}-home-360.png`), fullPage: true });
      report.screenshots.push(`${theme}-home-360.png`);
      await context.close();
    }
    // Navigation while a delayed completion is queued must not affect a new screen.
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    page.on('pageerror', e => report.errors.push(e.message));
    await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href);
    const race = await page.evaluate(async () => {
      const type = '__audit'; let callback;
      SD.renderers[type] = (s, a, done) => { callback = done; };
      const level = { id: '__audit', icon: '', title: 'Audit', stages: [{ type, title: 'Queued' }] };
      SD.session = { level, stageIdx: 0, firstTry: 0, total: 0, replay: true };
      SD.ui.runStage(); const old = callback;
      SD.ui.showHome(); const before = JSON.stringify(SD.state); old({ firstTry: 1, total: 1 });
      const home = before === JSON.stringify(SD.state) && !document.querySelector('.stage-summary');
      SD.session = { level, stageIdx: 0, firstTry: 0, total: 0, replay: true }; SD.ui.runStage();
      old({ firstTry: 1, total: 1 });
      const other = SD.session.total === 0 && !document.querySelector('.stage-summary');
      callback({ firstTry: 1, total: 1 }); callback({ firstTry: 1, total: 1 });
      const once = SD.session.total === 1 && document.querySelectorAll('.stage-summary').length === 1;
      delete SD.renderers[type]; SD.ui.showHome(); return { home, other, once };
    });
    Object.entries(race).forEach(([id, pass]) => report.checks.push({ id: `callback/${id}`, pass }));
    const persistence = await page.evaluate(() => {
      const l = SD.levelSets['fp-core'][0];
      SD.state.xp = 95; SD.state.completed = ['lifecycle'];
      SD.session = { level: l, stageIdx: 1, firstTry: 1, total: 1, pendingXP: 10, replay: false };
      SD.ui.runStage(); SD.ui.showHome(); return l.id;
    });
    await page.reload();
    report.checks.push({ id: 'persistence/reload-and-resume', pass: await page.evaluate(id => SD.state.xp === 95 && SD.state.completed.includes('lifecycle') && SD.state.checkpoint.levelId === id && !!document.querySelector('.resume-card'), persistence) });
    await context.close();
    report.overflows = report.samples.filter(s => s.scrollWidth > s.width + 1);
    report.narrowGuideCells = report.samples.filter(s => s.narrowGuideCells);
    report.contrast = { tested: report.samples.reduce((n, s) => n + (s.contrast?.tested || 0), 0),
      failures: report.samples.flatMap(s => (s.contrast?.failures || []).map(f => ({ theme: s.theme, screen: s.id, ...f }))),
      scope: 'Solid surfaces after alpha compositing; gradient/image-backed text requires visual review.' };
    report.sourceAfter = snapshot();
    report.sourceChanged = Object.keys(report.sourceBefore).filter(f => report.sourceBefore[f] !== report.sourceAfter[f]);
    report.pass = !report.errors.length && !report.overflows.length && !report.narrowGuideCells.length && !report.contrast.failures.length && !report.sourceChanged.length && report.checks.every(x => x.pass);
    fs.writeFileSync(path.join(OUT, 'REPORT.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(OUT, 'REPORT.md'), `# System Gurukul browser audit\n\n${report.samples.length} screen samples at 360px in light/dark, including every expanded topic guide.\n\n- Runtime/console errors: ${report.errors.length}\n- Document overflows: ${report.overflows.length}\n- Behavioral checks: ${report.checks.filter(x => x.pass).length}/${report.checks.length}\n- Solid-surface text contrast samples: ${report.contrast.tested}; failures: ${report.contrast.failures.length}\n\n${report.contrast.scope}\n\nAll data loaded from local index.html. External Docker labs were not run.\n`);
    console.log(JSON.stringify({ pass: report.pass, samples: report.samples.length, errors: report.errors.slice(0, 8), overflows: report.overflows.slice(0, 15), contrast: { tested: report.contrast.tested, failures: report.contrast.failures.slice(0, 15) }, checks: report.checks, out: OUT }));
    if (!report.pass) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
