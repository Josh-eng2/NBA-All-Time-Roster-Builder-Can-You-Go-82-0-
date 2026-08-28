/**
 * Focused regressions for defects the UI layer has actually shipped.
 * Each test names the behaviour that broke, not the implementation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  installDom, makeEl, registerEl, unregisterEl, hashWrites, resetHashWrites,
} from './dom-stub.mjs';

const app = installDom();

const { loadGame, flattenDb, bestFive } = await import('./helpers.mjs');
const g = await loadGame();
const five = bestFive(flattenDb(g.DB));

const { render } = await import(new URL('../js/ui/render.js', import.meta.url).href);
const { tierPalette } = await import(new URL('../js/ui/shareCard.js', import.meta.url).href);
const state  = g.state;
const modes  = g.modes;

// ── Ball IQ rules survive a rematch of a Ball IQ board ───────────────────────
// A shared board carries the draft style it was played under (logic/modes.js
// isBlindDraft). Two places checked `S.mode === 'blind'` directly instead —
// the one-tap auto-place and the roster slots' Primary/Flex hints — so opening
// a Ball IQ challenge link handed the recipient the position the mode exists
// to hide.

test('a rematch of a Ball IQ board still hides positions', () => {
  state.S.mode = 'rematch';
  state.S.rematch = { code: 'a0' + '0'.repeat(12), board: [], style: 'blind', wins: 60, losses: 22 };
  assert.equal(modes.isBlindDraft(), true, 'a blind-style rematch must draft blind');

  state.startGame('all');
  state.S.mode  = 'rematch';
  state.S.coach = 'jackson';
  state.S.phase = 'drafting';
  state.S.spinState   = 'done';
  state.S.currentSpin = { team: 'Bulls', decade: '1990s' };
  state.S.availablePlayers = g.DB.Bulls_1990s.slice();
  state.S.draftBoard  = g.DB.Bulls_1990s.slice();
  state.S.selectedPlayer = state.S.draftBoard[0];

  app.innerHTML = '';
  render();
  const html = app.innerHTML;

  // Empty roster slots must not label themselves with the selected player's fit.
  for (const leak of ['Primary', 'Flex<', 'Off-Position']) {
    assert.ok(!html.includes(leak),
      `the rematch draft screen leaked a positional hint (${leak})`);
  }
  // …and no stat lines on the cards either, the rest of the Ball IQ contract.
  assert.ok(!html.includes('PPG'), 'the rematch draft screen leaked player stats');

  state.S.rematch = null;
});

test('a plain Classic rematch keeps the full draft board', () => {
  state.S.mode = 'rematch';
  state.S.rematch = { code: 'a0' + '0'.repeat(12), board: [], style: 'solo', wins: 60, losses: 22 };
  assert.equal(modes.isBlindDraft(), false);

  state.startGame('all');
  state.S.mode  = 'rematch';
  state.S.coach = 'jackson';
  state.S.phase = 'drafting';
  state.S.spinState   = 'done';
  state.S.currentSpin = { team: 'Bulls', decade: '1990s' };
  state.S.availablePlayers = g.DB.Bulls_1990s.slice();
  state.S.draftBoard  = g.DB.Bulls_1990s.slice();
  state.S.selectedPlayer = state.S.draftBoard[0];

  app.innerHTML = '';
  render();
  assert.ok(app.innerHTML.includes('PPG'), 'a Classic rematch should still show stats');

  state.S.rematch = null;
});

// ── Share-card palette covers the tier set ──────────────────────────────────
// The palette was keyed on tier emoji, and the emoji set changed underneath it:
// two of its five keys no longer existed and two live tiers had no entry, so
// a rebuild season and a playoff season shared a colour.

test('every season tier has its own share-card colour treatment', () => {
  const ids = new Set();
  for (let w = 0; w <= 82; w++) ids.add(g.seasonTier.seasonTier(w).id);
  assert.ok(ids.size >= 5, 'expected the full tier ladder');

  const seenText = new Map();
  for (const id of ids) {
    const pal = tierPalette(id);
    assert.ok(pal && pal.text && pal.bg && pal.border, `tier ${id} has no palette`);
    assert.ok(!seenText.has(pal.text),
      `tier ${id} shares its colour with ${seenText.get(pal.text)} — a tier fell through to the default`);
    seenText.set(pal.text, id);
  }
  // A championship always takes the trophy treatment, whatever the record.
  assert.deepEqual(tierPalette('rebuild', true), tierPalette('perfect'));
});

// ── Team name survives a re-render ──────────────────────────────────────────
// The inputs re-emit `value="${S.teamName}"` on every render, but nothing wrote
// what was typed back to S — so any re-render (a theme toggle, a failed submit,
// an unhandled action) silently wiped a half-typed name.

test('a half-typed team name survives a re-render', () => {
  state.startGame('all');
  state.S.mode  = 'solo';
  state.S.coach = 'jackson';
  g.state.POSITIONS.forEach((pos, i) => { state.S.roster[pos] = five[i]; });
  state.S.result   = g.sim.simulateSeason(five, 'jackson');
  state.S.phase    = 'results';
  state.S.runSaved = false;
  state.S.teamName = '';

  const input   = makeEl('input');
  const counter = makeEl('span');
  registerEl('team-name-input', input);
  registerEl('team-name-counter', counter);
  try {
    render();                       // wires the field
    input.value = 'Rip City';
    input.__fire('input');          // the player types

    assert.equal(state.S.teamName, 'Rip City', 'typing must be mirrored onto the state');
    assert.equal(counter.textContent, 30 - 'Rip City'.length, 'the counter must track the field');

    app.innerHTML = '';
    input.__resetListeners();
    render();                       // e.g. a theme toggle
    assert.ok(app.innerHTML.includes('value="Rip City"'),
      're-rendering the results screen must re-emit the typed name');
  } finally {
    unregisterEl('team-name-input');
    unregisterEl('team-name-counter');
  }
});

test('a typed team name is capped at the field length', () => {
  state.S.phase    = 'results';
  state.S.runSaved = false;
  const input   = makeEl('input');
  registerEl('team-name-input', input);
  try {
    render();
    input.value = 'x'.repeat(60);
    input.__fire('input');
    assert.equal(state.S.teamName.length, 30);
  } finally {
    unregisterEl('team-name-input');
    state.S.teamName = '';
  }
});

// ── The URL hash tracks the screen ──────────────────────────────────────────
// syncHashRoute() refused to rewrite ANY non-empty hash while on the menu, so
// coming back from a run left the URL parked on #/results with nothing behind
// it. Only a routable deep link should be protected.

test('the hash follows the active screen and is reset on the menu', () => {
  state.startGame('all');
  state.S.mode  = 'solo';
  state.S.coach = 'jackson';

  state.S.phase = 'drafting';
  resetHashWrites();
  render();
  assert.equal(globalThis.location.hash, '#/draft');

  state.S.phase = 'mode-select';
  resetHashWrites();
  render();
  assert.equal(globalThis.location.hash, '#/',
    'returning to the menu must clear a stale screen hash');
  assert.deepEqual(hashWrites(), ['#/']);
});

test('an inbound deep link is not clobbered by the first menu render', () => {
  globalThis.location.hash = '#/daily';
  state.S.phase = 'mode-select';
  resetHashWrites();
  render();
  assert.equal(globalThis.location.hash, '#/daily',
    'main.js dispatches hashchange after first paint — the route has to still be there');
  assert.deepEqual(hashWrites(), []);
  globalThis.location.hash = '';
});

// ── Starter names reach the wire intact ──────────────────────────────────────
// utils/firebase.js packs the five names into the 100-char cap without cutting
// one in half. That fix was defeated for a while by its own callers: both
// payload builders here did `.join(', ').slice(0, 100)` first, so the fifth name
// arrived already truncated and there was nothing left to repair. The unit test
// on packStarterNames could not see it — it fed the function a full list, which
// is the one input the real path never produced. This drives the real seam.

const events = await import(new URL('../js/ui/events.js', import.meta.url).href);
const { buildGlobalDoc, buildDailyDoc } = await import(new URL('../js/utils/firebase.js', import.meta.url).href);

/** The longest roster the draft can legally produce: distinct positions,
 *  distinct decades, 109 characters joined. */
const LONGEST_ROSTER = [
  'Shai Gilgeous-Alexander', 'Sarunas Marciulionis', 'Quentin Richardson',
  'Giannis Antetokounmpo', 'Kareem Abdul-Jabbar',
];

function seatLongestRoster() {
  const all = flattenDb(g.DB);
  state.startGame('all');
  state.S.mode  = 'solo';
  state.S.coach = 'jackson';
  state.POSITIONS.forEach((pos, i) => {
    const p = all.find(x => x.name === LONGEST_ROSTER[i]);
    assert.ok(p, `${LONGEST_ROSTER[i]} is no longer in the database — pick a new long name`);
    state.S.roster[pos] = p;
  });
  state.S.result     = g.sim.simulateSeason(Object.values(state.S.roster).filter(Boolean), 'jackson');
  state.S.teamName   = 'Long Names FC';
  state.S.dailyDate  = '2026-03-01';
  state.S.dailyChallenge = g.challenge.CHALLENGES[0];
  state.S.dailyResult    = { pass: true, score: 400 };
}

test('the submit path hands the wire full names, and gets all five back', () => {
  seatLongestRoster();

  for (const [label, payload, doc] of [
    ['global', events.buildGlobalScorePayload, buildGlobalDoc],
    ['daily',  events.buildDailyScorePayload,  buildDailyDoc],
  ]) {
    const entry = payload();
    assert.equal(entry.starters, LONGEST_ROSTER.join(', '),
      `the ${label} payload trimmed the names before the wire packer saw them — ` +
      'fitting the cap is buildGlobalDoc/buildDailyDoc\'s job, not the caller\'s');

    const wire  = doc(entry);
    const names = wire.starters.split(', ');
    assert.ok(wire.starters.length <= 100, `${label} doc is ${wire.starters.length} chars, over the rule cap`);
    assert.equal(names.length, 5, `${label} doc lost a starter`);
    assert.ok(names[4].endsWith('Abdul-Jabbar'),
      `${label} doc truncated the fifth starter to "${names[4]}"`);
  }
});
