/**
 * Nothing that came off the network reaches innerHTML unescaped.
 *
 * The nba820_* keys stopped being purely local when cloud saves shipped:
 * js/utils/cloudSave.js writes several of them back from the `users/{uid}`
 * Firestore document, and that document's rule deliberately bounds SIZE and
 * STRUCTURE but never values — "a rule tighter than what the game legitimately
 * produces rejects real saves". So a string in a trophy, a leaderboard row or
 * the Daily distribution is data that crossed a network boundary under a rule
 * that does not police what is in it, and every screen that paints one is a
 * sink.
 *
 * The global-leaderboard modals have always escaped and coerced (see
 * _globalLbRowsHtml in utils/storage.js); the Trophy Room, the local
 * leaderboard modal and the Daily Statistics modal did not. This file pins all
 * of them, so the next screen that renders stored data has a pattern to copy
 * and a test that notices if it doesn't.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { installDom } from './dom-stub.mjs';

const app = installDom();

const { loadGame } = await import('./helpers.mjs');
const g = await loadGame();

const { render } = await import(new URL('../js/ui/render.js', import.meta.url).href);
const storage    = await import(new URL('../js/utils/storage.js', import.meta.url).href);

const state = g.state;

/** Every shape an injection can take in an HTML template or an attribute. */
const PAYLOAD = `<img src=x onerror="alert(1)">" onmouseover="alert(2)`;

/**
 * The assertions that matter. `esc()` turns every one of these into an entity,
 * so their presence in the output means a raw value reached the markup.
 */
function assertNoInjection(html, label) {
  // No tag can be opened...
  assert.ok(!html.includes('<img'),    `${label}: a raw <img> reached the DOM`);
  assert.ok(!html.includes('<script'), `${label}: a raw <script> reached the DOM`);
  // ...and no attribute can be broken out of. `onerror=` on its own is not the
  // test: escaped, the payload still reads "onerror=&quot;" as inert text. The
  // raw quote after it is what would make it an attribute.
  assert.ok(!html.includes('onerror="'),     `${label}: an onerror attribute reached the DOM`);
  assert.ok(!html.includes('onmouseover="'), `${label}: an onmouseover attribute reached the DOM`);
  // The payload must still be VISIBLE, escaped — dropping it silently would
  // pass the checks above while losing the player's own data.
  assert.ok(html.includes('&lt;img'), `${label}: the value was dropped rather than escaped`);
}

function seedStorage(entries) {
  const m = new Map(Object.entries(entries));
  globalThis.localStorage = {
    getItem(k) { return m.has(k) ? m.get(k) : null; },
    setItem(k, v) { m.set(k, String(v)); },
    removeItem(k) { m.delete(k); },
  };
}

test('the Trophy Room escapes every field a cloud save can carry', () => {
  seedStorage({
    nba820_trophies: JSON.stringify([{
      date:        PAYLOAD,
      coachName:   PAYLOAD,
      coachSystem: PAYLOAD,
      starters:    PAYLOAD,
      bench:       PAYLOAD,
      // Numbers are a sink too: `${t.wins}` interpolates whatever is there,
      // and a string never equals 82 so the "perfect" branch is no guard.
      wins:        PAYLOAD,
      losses:      PAYLOAD,
      chemScore:   PAYLOAD,
    }]),
  });

  state.S.phase = 'trophy-room';
  app.innerHTML = '';
  render();
  const html = app.innerHTML;

  assertNoInjection(html, 'trophy room');
  assert.ok(!html.includes('NaN'), 'trophy room painted a NaN from a non-numeric field');
});

test('the Trophy Room survives a save whose entries are not objects at all', () => {
  seedStorage({ nba820_trophies: JSON.stringify([null, 'nope', 7, []]) });
  state.S.phase = 'trophy-room';
  app.innerHTML = '';
  render();
  assert.ok(app.innerHTML.length > 200, 'a malformed trophy list blanked the screen');
  assert.ok(!app.innerHTML.includes('undefined'), 'a malformed trophy leaked undefined');
});

test('the Trophy Room survives a save that is not a list', () => {
  seedStorage({ nba820_trophies: JSON.stringify({ not: 'a list' }) });
  state.S.phase = 'trophy-room';
  app.innerHTML = '';
  render();
  assert.ok(app.innerHTML.length > 200, 'a non-array trophy store blanked the screen');
});

test('the local leaderboard modal escapes its stored fields', () => {
  seedStorage({
    nba820_lb: JSON.stringify([{
      date: PAYLOAD, teamName: PAYLOAD, starters: PAYLOAD, wins: PAYLOAD, losses: PAYLOAD,
      leaders: { pts: { name: PAYLOAD, val: 30 } },
    }]),
  });

  let captured = '';
  const realCreate = globalThis.document.createElement;
  globalThis.document.createElement = tag => {
    const el = realCreate(tag);
    Object.defineProperty(el, 'innerHTML', {
      configurable: true,
      get() { return captured; },
      set(v) { captured = v; },
    });
    return el;
  };
  try {
    storage.showLeaderboardModal();
  } finally {
    globalThis.document.createElement = realCreate;
    storage.closeLeaderboardModal();
  }

  assertNoInjection(captured, 'leaderboard modal');
  assert.ok(!captured.includes('NaN'), 'leaderboard modal painted a NaN');
});

test('the Daily Statistics modal coerces its stored distribution', () => {
  seedStorage({
    nba820_dailyStats: JSON.stringify({
      played: 5, wins: 2, currentStreak: 1, maxStreak: 3,
      lastPlayedDate: '2026-09-01',
      distribution: { '0-39': PAYLOAD, '70-79': '<script>alert(3)</script>' },
    }),
  });

  const stats = storage.getDailyStats();
  for (const [bin, count] of Object.entries(stats.distribution)) {
    assert.equal(typeof count, 'number', `distribution["${bin}"] survived as a non-number`);
    assert.ok(Number.isFinite(count) && count >= 0, `distribution["${bin}"] is not a real count`);
  }
});
