// Optional real-browser test; no app dependency or build step is introduced.
// PLAYWRIGHT_MODULE: path to an installed playwright folder.
// BROWSER_EXE: optional system Chrome/Edge. APP_URL defaults to local port 8001.
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const require = createRequire(resolve(process.env.PLAYWRIGHT_MODULE, 'package.json'));
const { chromium } = require('./index.js');
const base = process.env.APP_URL || 'http://127.0.0.1:8001';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Smoke tests must not submit to production');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXE ? { executablePath: process.env.BROWSER_EXE } : {}) });
const errors = [];
async function open(path, width = 390) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.route('**/*', r => new URL(r.request().url()).origin === base ? r.continue() : r.abort());
  await context.addInitScript(() => {
    // Exercise the deterministic download fallback, not an OS share dialog.
    Object.defineProperty(navigator, 'canShare', { value: () => false });
    Object.defineProperty(navigator, 'share', { value: undefined });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + path);
  if (!path.includes('.html')) await page.locator('[data-action="spin"], [data-action^="draft-pick-"]').first().waitFor();
  return page;
}
async function draft(page) {
  if (await page.locator('[data-action="spin"]').count()) await page.locator('[data-action="spin"]').click();
  for (let n = 0; n < 5; n++) {
    if (await page.locator('[data-action="simulate"]').count()) break;
    await page.waitForFunction(async () => (await import('/js/logic/state.js')).S.spinState === 'done');
    const before = await page.evaluate(async () => (await import('/js/logic/state.js')).S.round);
    await page.locator('[data-action^="draft-pick-"]:not([disabled])').first().click();
    const placement = page.locator('[data-action^="place-"]');
    if (await placement.count()) await placement.first().press('Enter');
    await page.waitForFunction(async round => (await import('/js/logic/state.js')).S.round > round, before);
  }
  await page.locator('[data-action="simulate"]').click();
  await page.waitForFunction(async () => (await import('/js/logic/state.js')).S.phase === 'results');
  const result = await page.evaluate(async () => {
    const { S } = await import('/js/logic/state.js');
    const { encodeBoardCode, buildRematchUrl } = await import('/js/logic/rematch.js');
    const code = encodeBoardCode({ board: S.boardLog, wins: S.result.wins, style: 'solo' });
    return { wins: S.result.wins, losses: S.result.losses, roster: Object.values(S.roster).filter(Boolean).length,
      boards: S.boardLog, code, link: code ? buildRematchUrl(code) : null,
      exactPoints: S.result.games.every(g => Object.values(g.playerPoints).reduce((a, b) => a + b, 0) === g.ps) };
  });
  assert.equal(result.roster, 5); assert.equal(result.wins + result.losses, 82); assert.ok(result.exactPoints);
  return result;
}
async function playoffs(page) {
  if (!(await page.locator('[data-action="advance-to-playoffs"]').count())) return false;
  await page.locator('[data-action="advance-to-playoffs"]').click();
  await page.locator('[data-action="sim-all-playoffs"]').click();
  await page.locator('[data-action="playoffs-continue"]').click();
  return true;
}
try {
  // Leave the SDK request pending: an immediate abort would miss blocking
  // script tags. Separately emulate a loaded SDK whose environment hangs.
  for (const hungEnvironment of [false, true]) {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const stalled = [];
    await context.route('**/*', r => {
      if (new URL(r.request().url()).origin === base) return r.continue();
      if (r.request().url().includes('crazygames-sdk')) { stalled.push(r); return; }
      return r.abort();
    });
    if (hungEnvironment) await context.addInitScript(() => {
      window.CrazyGames = { SDK: { getEnvironment: () => new Promise(() => {}) } };
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.locator('[data-action="spin"], [data-action^="draft-pick-"]').first().waitFor({ timeout: 10000 });
    for (const route of stalled) await route.abort();
    await context.close();
  }
  const classic = await open('/');
  const result = await draft(classic);
  const reducedMotion = await classic.evaluate(async () => {
    let fired = false;
    (await import('/js/ui/render.js')).withConfetti(() => { fired = true; });
    return { fired, canvas: !!document.querySelector('canvas') };
  });
  assert.equal(reducedMotion.fired, false);
  await classic.locator('#team-name-input').fill('Local smoke roster');
  await classic.locator('[data-action="save-run"]').click();
  await classic.getByRole('button', { name: 'Retry global submission' }).waitFor();
  await classic.getByRole('button', { name: 'Retry global submission' }).click();
  await classic.waitForFunction(async () => !!(await import('/js/logic/state.js')).S.globalSubmitError);
  // Optional export of real-run marketing examples; no fabricated record.
  if (process.env.SMOKE_ASSETS) {
    for (const [action, name] of [['share', 'example-feed.png'], ['share-story', 'example-story.png']]) {
      const download = classic.waitForEvent('download');
      await classic.locator(`[data-action="${action}"]`).click();
      await (await download).saveAs(resolve(process.env.SMOKE_ASSETS, name));
    }
    writeFileSync(resolve(process.env.SMOKE_ASSETS, 'example-run.json'), JSON.stringify(result, null, 2) + '\n');
  }
  await playoffs(classic);
  const daily = await open('/?ref=daily#/daily');
  const dailyResult = await draft(daily);
  if (await playoffs(daily)) {
    assert.equal(await daily.locator('[data-action="draft-new-roster"]').count(), 0);
    await daily.locator('[data-action="back-to-menu"]').click();
    assert.equal(await daily.locator('[data-action="mode-daily"]').count(), 0);
  }
  const invitation = new URL(result.link);
  invitation.searchParams.set('sid', 'browser-smoke');
  const rematch = await open(invitation.pathname + invitation.search + invitation.hash, 1280);
  const replay = await draft(rematch);
  assert.deepEqual(replay.boards, result.boards);
  await playoffs(rematch);
  const relay = await open('/daily/showtime.html?ref=daily&sid=smoke-invite&campaign=smoke');
  const target = new URL(await relay.locator('#cp-play').getAttribute('href'), relay.url());
  assert.equal(target.searchParams.get('ref'), 'daily');
  assert.equal(target.searchParams.get('sid'), 'smoke-invite');
  assert.equal(target.searchParams.get('campaign'), 'smoke');
  assert.equal(target.hash, '#/daily');
  const keyboard = await open('/');
  await keyboard.waitForFunction(async () => (await import('/js/logic/state.js')).S.spinState === 'done');
  // Reach the actual manual-placement screen with the preferred slots filled.
  const placedId = await keyboard.evaluate(async () => {
    const state = await import('/js/logic/state.js');
    const { DB } = await import('/js/data/players.js');
    state.S.mode = '1v1'; state.startGame1v1();
    const S = state.S, player = { ...Object.values(DB).flat().find(p => p.pos === 'PG') };
    S.currentSpin = { team: 'Lakers', decade: '1980s' }; S.spinState = 'done';
    for (const pos of [player.pos, ...(player.secondaryPos || [])]) S.p1Roster[pos] = { ...player, id: 'filled-' + pos, name: 'Filled ' + pos };
    S.selectedPlayer = player;
    (await import('/js/ui/render.js')).render();
    return player.id;
  });
  const slot = keyboard.locator('button[data-action^="place-"]').first();
  await slot.focus(); await keyboard.keyboard.press('Enter');
  assert.ok(await keyboard.evaluate(async id => Object.values((await import('/js/logic/state.js')).S.p1Roster).some(p => p?.id === id), placedId));
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ classic: result.wins, daily: dailyResult.wins, rematch: replay.wins, sameBoards: true, pageErrors: errors.length, relay: 'passed', stalledSdk: 'passed' }));
} finally { await browser.close(); }
