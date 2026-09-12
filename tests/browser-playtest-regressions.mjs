// Optional real-browser regressions. Same PLAYWRIGHT_MODULE/BROWSER_EXE as
// browser-smoke.mjs. MIGRATION_REFS must be locally available old releases.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(resolve(process.env.PLAYWRIGHT_MODULE, 'package.json'));
const { chromium } = require('./index.js');
const exec = promisify(execFile);
// The release under test, read from sw.js rather than written out here.
// Hard-coding it made this assertion silently pin an old release: every
// CACHE_VERSION bump left the literal behind, and the migration check below
// then failed on main for a cache name that was in fact correct.
const CACHE_VERSION = (await readFile(resolve(root, 'sw.js'), 'utf8'))
  .match(/^const CACHE_VERSION = '([^']+)';$/m)?.[1];
assert.ok(CACHE_VERSION, 'could not read CACHE_VERSION from sw.js');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXE ? { executablePath: process.env.BROWSER_EXE } : {}) });
const errors = [];
let oldRef = null;
const oldFiles = new Map();
const server = createServer(async (request, response) => {
  try {
    let path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).slice(1);
    if (!path || path.endsWith('/')) path += 'index.html';
    assert.ok(!path.split('/').includes('..'));
    let body;
    if (oldRef) {
      const key = oldRef + ':' + path;
      if (!oldFiles.has(key)) oldFiles.set(key, exec('git', ['show', key], { cwd: root, encoding: 'buffer', maxBuffer: 12e6 }).then(r => r.stdout));
      body = await oldFiles.get(key);
    } else body = await readFile(resolve(root, path));
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : path.endsWith('.html') ? 'text/html' : path.endsWith('.webmanifest') ? 'application/manifest+json' : 'application/octet-stream');
    response.end(body);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
async function context(width = 390, height = 844, serviceWorkers = 'block') {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', serviceWorkers });
  await ctx.route('**/*', r => new URL(r.request().url()).origin === base ? r.continue() : r.abort());
  ctx.on('page', p => p.on('pageerror', e => errors.push(e.message)));
  return ctx;
}
async function ready(page) {
  await page.evaluate(async () => { window.testState = (await import('/js/logic/state.js')).S; });
  await page.waitForFunction(() => window.testState.spinState === 'done');
}
async function pick(page) {
  await ready(page);
  const round = await page.evaluate(async () => (await import('/js/logic/state.js')).S.round);
  const button = page.locator('[data-action^="draft-pick-"]:not([disabled])').first();
  await button.scrollIntoViewIfNeeded();
  assert.ok(await button.evaluate(el => {
    const r = el.getBoundingClientRect();
    return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
  }), 'draft button must receive its own center tap');
  await button.click({ timeout: 5000 });
  const slot = page.locator('[data-action^="place-"]');
  if (await slot.count()) await slot.first().click();
  await page.waitForFunction(n => window.testState.round > n, round);
}
try {
  for (const [width, height] of process.env.MIGRATION_ONLY ? [] : [[390, 844], [844, 390], [320, 568]]) {
    const ctx = await context(width, height), page = await ctx.newPage();
    await page.goto(base); await ready(page);
    if (width < 640) {
      const sizes = await page.locator('.draft-card').first().evaluate(el => ({
        font: parseFloat(getComputedStyle(el.querySelector('.draft-card__name')).fontSize),
        zoom: getComputedStyle(el.closest('.draft-board-wrap')).zoom,
        button: el.querySelector('button').getBoundingClientRect().height,
      }));
      assert.ok(sizes.font >= 14 && sizes.button >= 44 && sizes.zoom === '1', JSON.stringify(sizes));
    }
    for (let i = 0; i < 5; i++) await pick(page);
    await page.locator('[data-action="simulate"]').click();
    await page.waitForFunction(() => window.testState.phase === 'results');
    console.log(`Draft and season passed at ${width}x${height}`);
    await ctx.close();
  }
  if (!process.env.MIGRATION_ONLY) {
  const ctx = await context(), page = await ctx.newPage();
  await page.goto(base + '/privacy.html');
  await page.evaluate(() => localStorage.setItem('nba820_owner', 'A'));
  await page.goto(base); await ready(page);
  for (let i = 0; i < 5; i++) await pick(page);
  await page.locator('[data-action="simulate"]').click();
  await page.locator('#team-name-input').fill('Account A roster');
  const handoff = await page.evaluate(async () => {
    const c = await import('/js/utils/cloudSave.js');
    c.applyRemoteToDevice('B', c.emptySave());
    const { S } = await import('/js/logic/state.js');
    return { phase: S.phase, result: S.result, owner: localStorage.getItem('nba820_owner'), save: c.readLocalSave().snapshot.save };
  });
  assert.equal(handoff.phase, 'mode-select'); assert.equal(handoff.result, null); assert.equal(handoff.owner, 'B');
  assert.equal(await page.locator('[data-action="save-run"]').count(), 0);
  await page.locator('[data-action="mode-solo"]').click(); await page.locator('[data-action="spin"]').click(); await ready(page);
  const other = await ctx.newPage(); await other.goto(base + '/privacy.html');
  await other.evaluate(() => { localStorage.setItem('nba820_owner', 'A'); localStorage.setItem('nba820_owner', 'B'); });
  await page.waitForFunction(() => window.testState.phase === 'mode-select');
  console.log('Same-tab handoff and queued cross-tab A/B transitions passed');
  await ctx.close();
  }

  for (const ref of (process.env.MIGRATION_REFS || '4f8a52b,93f7fa34d810cc204ae5eea68d1b17de202be65a').split(',')) {
    oldRef = ref;
    const ctx = await context(1280, 900, 'allow');
    await ctx.addInitScript(() => { window.migrationDocument = Date.now() + ':' + Math.random(); });
    const first = await ctx.newPage(); await first.goto(base);
    await first.evaluate(async () => { window.migrationReg = await navigator.serviceWorker.ready; });
    await first.waitForFunction(() => !!navigator.serviceWorker.controller);
    const second = await ctx.newPage(); await second.goto(base + '/?ref=migration#/classic');
    await second.waitForFunction(() => !!navigator.serviceWorker.controller);
    // Both documents have loaded their old module graphs before the server changes.
    await Promise.all([first, second].map(page => page.evaluate(async () => {
      await import('/js/ui/events.js'); await import('/js/utils/cloudSave.js');
    })));
    oldRef = null;
    await first.evaluate(async () => { await window.migrationReg.update(); });
    await first.waitForFunction(() => window.migrationReg.waiting?.state === 'installed');
    const documentIds = await Promise.all([first, second].map(page => page.evaluate(() => window.migrationDocument)));
    const navigations = Promise.all([first, second].map((page, i) => page.waitForFunction(id =>
      typeof window.migrationDocument === 'string' && window.migrationDocument !== id, documentIds[i], { timeout: 20000 })));
    navigations.catch(() => {}); // retain the primary error if acceptance fails first
    await first.evaluate(() => window.migrationReg.waiting.postMessage({ type: 'ACTIVATE_UPDATE' }));
    try { await navigations; } catch (error) {
      console.error('Migration diagnostics', await Promise.all([first, second].map(p => p.evaluate(async () => ({
        document: window.migrationDocument, url: location.href, caches: await caches.keys(),
        registration: await navigator.serviceWorker.getRegistration().then(r => ({ active: r.active?.state, waiting: r.waiting?.state })),
      })))));
      for (const worker of ctx.serviceWorkers()) {
        console.error('Worker clients', await worker.evaluate(async () => (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).map(c => ({ id: c.id, url: c.url }))));
      }
      throw error;
    }
    for (const page of [first, second]) {
      await page.locator('#app button').first().waitFor();
      const state = await page.evaluate(async () => ({
        schema: (await import('/js/utils/cloudSave.js')).emptySave().schemaVersion,
        // This export distinguishes the fix from v35 (which also has schema 2).
        ownership: typeof (await import('/js/ui/events.js')).ensureRunOwner,
        keys: await caches.keys(),
      }));
      assert.equal(state.schema, 2); assert.equal(state.ownership, 'function');
      assert.ok(state.keys.every(k => k.endsWith(CACHE_VERSION)), JSON.stringify(state));
    }
    assert.equal(new URL(second.url()).searchParams.get('ref'), 'migration');
    await ctx.setOffline(true);
    await first.reload();
    await first.locator('#app button').first().waitFor();
    assert.equal(await first.evaluate(async () => typeof (await import('/js/ui/events.js')).ensureRunOwner), 'function');
    console.log(`Both ${ref} tabs refreshed to ${CACHE_VERSION}`);
    await ctx.close();
  }
  assert.deepEqual(errors, []);
} catch (error) { console.error(error); throw error; }
finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
