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

// ── The Daily Challenge always has a way out of the playoffs ────────────────
// The three post-season screens (bracket, championship, eliminated) all
// rendered "Draft New Roster". That action is a deliberate no-op in the Daily
// — startFreshDraft() bails on mode 'daily' so the day's one attempt can't be
// re-rolled — and it was the only nav on those screens, so a player who
// entered the Daily's playoffs was stuck there until they reloaded the page.

const PLAYOFF_SCREENS = ['bracket', 'championship', 'eliminated'];

/** Puts S on one of the three post-season screens. */
function enterPlayoffs(which) {
  state.S.phase = 'drafting';
  for (const pos of ['PG', 'SG', 'SF', 'PF', 'C']) state.S.roster[pos] = five[['PG','SG','SF','PF','C'].indexOf(pos)];
  state.S.result = g.sim.simulateSeason(five, state.S.coach);
  state.S.seasonGames = state.S.result.games;
  const seed    = state.getPlayerSeed(state.S.result.wins);
  const bracket = state.buildBracket(seed, state.S.result.strength);
  state.S.playoffs = {
    playerSeed: seed, playerStrength: state.S.result.strength,
    initialBracket: bracket.map(pair => pair.map(t => ({ ...t }))),
    rounds: [], currentRound: which === 'bracket' ? 0 : 3, bracket,
    eliminated:   which === 'eliminated',
    champion:     which === 'championship',
    championTeam: which === 'eliminated' ? { name: '96 Bulls' } : null,
    eliminatedIn: which === 'eliminated' ? 'NBA Finals' : null,
    tickState: null, pendingReveal: false,
    roundNames: ['Conference Quarterfinals', 'Conference Semifinals', 'NBA Finals'],
  };
  state.S.phase = 'playoffs';
}

for (const screen of PLAYOFF_SCREENS) {
  test(`the Daily's ${screen} screen offers a route back to the menu`, () => {
    state.startGame('all');
    state.S.mode  = 'daily';
    state.S.coach = 'jackson';
    enterPlayoffs(screen);
    render();

    assert.ok(app.innerHTML.includes('data-action="back-to-menu"'),
      'the Daily has no other nav here — without this the player is stuck on the screen');
    assert.ok(!app.innerHTML.includes('data-action="draft-new-roster"'),
      'draft-new-roster is a no-op in the Daily, so it must not be the way out');
  });

  test(`every other mode keeps Draft New Roster on the ${screen} screen`, () => {
    state.startGame('all');
    state.S.mode  = 'solo';
    state.S.coach = 'jackson';
    enterPlayoffs(screen);
    render();

    assert.ok(app.innerHTML.includes('data-action="draft-new-roster"'),
      'outside the Daily, re-drafting is the point of the button');
  });
}

// ── A plural dynasty agrees with its verb ───────────────────────────────────
// "🏆 87 Lakers Wins the Series!" — the verb was picked by testing the label
// against the literal 'You', so every 3rd-person label got "Wins". All but one
// dynasty nickname in the rotation is plural.

test('the series headline agrees with the winner it names', () => {
  const p1 = five;
  const p2 = ['PG', 'SG', 'SF', 'PF', 'C'].map((pos, i) =>
    flattenDb(g.DB).filter(p => p.pos === pos && !p1.includes(p))[20 + i]);

  for (const [name, verb] of [['87 Lakers', 'Win'], ['13 Heat', 'Wins']]) {
    state.startGame('all');
    state.S.mode  = 'dynasty-duel';
    state.S.coach = 'jackson';
    state.S.dynastyOpponent = { name, strength: 9, weekKey: '2026-01-05' };
    state.S.seriesResult = g.sim.simulateHeadToHeadSeries(p1, 'jackson', p2, null);
    // Force the dynasty to be the winner so the headline names it.
    state.S.seriesResult.winner  = 'p2';
    state.S.seriesResult.series  = { playerWins: 1, oppWins: 4, games: ['L','L','W','L','L'], won: false };
    state.S.seriesConfettiFired  = true;
    state.S.phase = 'series-result';
    render();

    assert.ok(app.innerHTML.includes(`${name} ${verb} the Series`),
      `"${name}" must take "${verb}", not "${verb === 'Win' ? 'Wins' : 'Win'}"`);
  }
});
