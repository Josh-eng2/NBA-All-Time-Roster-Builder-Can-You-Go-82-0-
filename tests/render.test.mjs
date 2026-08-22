/**
 * Smoke coverage for the UI layer, which previously had none.
 *
 * render() is a phase dispatcher over string templates. The failures that
 * actually happen there are template-time crashes — a field read off a null
 * spin, `.toFixed()` on a shape that doesn't carry the number, a helper that
 * divides by an empty roster — and every one of them blanks the screen. This
 * file drives every phase, in both themes, at every roster fill level, and
 * asserts the screen rendered something.
 *
 * It does not (and cannot) check layout or CSS. Those are still verified by
 * playing the game — see the repo README.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { installDom, setTheme, setViewport } from './dom-stub.mjs';

const app = installDom();

const { loadGame, flattenDb, bestFive } = await import('./helpers.mjs');
const g  = await loadGame();
const all = flattenDb(g.DB);
const five = bestFive(all);

const { render } = await import(new URL('../js/ui/render.js', import.meta.url).href);

// startGame() REPLACES the state object, and `S` is an ES module live binding.
// Destructuring it here would snapshot the object that existed at import time
// and every later assertion would be against a dead copy — so state is always
// reached through the namespace (`state.S`), which stays live.
const state = g.state;
const { startGame, startGame1v1, POSITIONS, buildBracket, getPlayerSeed } = state;
const { applyPlayoffRound } = g.playoffs;
const { simulateSeason, simulateSeries, simulateHeadToHeadSeries, simulateDynastySeries } = g.sim;

/**
 * Renders and asserts the screen produced real markup. The `NaN`/`undefined`
 * checks matter as much as the crash: a divide-by-empty-roster or a missing
 * field doesn't throw in a template literal, it silently paints "NaN%" into a
 * style attribute or "undefined" into a stat line.
 */
function renderInto(label) {
  app.innerHTML = '';
  render();
  const html = app.innerHTML;
  assert.ok(html.length > 200, `${label} rendered nothing`);
  assert.ok(!html.includes('NaN'), `${label} painted a NaN into the DOM`);
  assert.ok(!html.includes('undefined'), `${label} leaked an undefined into the DOM`);
  return html;
}

function fillRoster(count) {
  startGame('all');
  state.S.mode = 'solo';
  state.S.coach = 'jackson';
  POSITIONS.slice(0, count).forEach((pos, i) => {
    state.S.roster[pos] = five[i];
    state.S.usedPlayerIds.push(five[i].id);
    state.S.draftedPlayerNames.add(five[i].name);
  });
  state.S.round = count;
}

for (const theme of ['light', 'dark']) {
  test(`every menu and draft screen renders in ${theme} mode`, () => {
    setTheme(theme);
    setViewport('mobile');

    state.S.phase = 'mode-select';  renderInto('mode-select');
    state.S.phase = 'more-modes';   renderInto('more-modes');
    state.S.phase = 'trophy-room';  renderInto('trophy-room');
    state.S.phase = 'legends';      renderInto('legends');

    // Every roster fill level, including the two that used to be the fragile
    // ones: 0 starters (gauges with nothing to average) and 5 (simulate card).
    for (let n = 0; n <= 5; n++) {
      fillRoster(n);
      state.S.phase = 'drafting';
      renderInto(`drafting with ${n} starters, pre-spin`);

      // …and mid-spin / post-spin, where currentSpin is the field that has
      // blanked this screen before.
      state.S.spinState = 'spinning';
      renderInto(`drafting with ${n} starters, spinning`);
      state.S.spinState = 'done';
      state.S.currentSpin = { team: 'Bulls', decade: '1990s' };
      state.S.availablePlayers = g.DB.Bulls_1990s.slice();
      state.S.draftBoard = g.DB.Bulls_1990s.slice();
      renderInto(`drafting with ${n} starters, board dealt`);
      state.S.selectedPlayer = state.S.draftBoard[0];
      renderInto(`drafting with ${n} starters, player selected`);
    }
  });

  test(`the desktop draft workspace renders in ${theme} mode`, () => {
    setTheme(theme);
    setViewport('desktop');
    try {
      // The >=1024px layout is a different DOM (two-column workspace, the
      // three-gauge Team Status rail, the synergy panel) built from the same
      // helpers — it has its own null-roster and full-roster edges.
      for (const n of [0, 3, 5]) {
        fillRoster(n);
        state.S.phase = 'drafting';
        renderInto(`desktop drafting, ${n} starters, pre-spin`);
        state.S.spinState = 'done';
        state.S.currentSpin = { team: 'Celtics', decade: '1980s' };
        state.S.availablePlayers = g.DB.Celtics_1980s.slice();
        state.S.draftBoard = g.DB.Celtics_1980s.slice();
        renderInto(`desktop drafting, ${n} starters, board dealt`);
      }
      // Ball IQ locks the chemistry gauge and the synergy rail — a separate
      // branch of both.
      fillRoster(3);
      state.S.mode = 'blind';
      renderInto('desktop Ball IQ drafting');
    } finally {
      setViewport('mobile');
    }
  });

  test(`the results, playoff and series screens render in ${theme} mode`, () => {
    setTheme(theme);
    setViewport('mobile');

    fillRoster(5);
    state.S.result = simulateSeason(five, state.S.coach);
    state.S.seasonGames = state.S.result.games;
    state.S.seasonGames.forEach((game, i) => { game.num = i + 1; });
    state.S.phase = 'results';
    renderInto('results');

    // Saved / submitted variants of the same screen.
    state.S.runSaved = true; state.S.teamName = 'Test & "Co"';
    renderInto('results after save');
    state.S.globalSubmitError = 'network down';
    renderInto('results with a submit error');
    state.S.runSaved = false; state.S.globalSubmitError = null;

    // Playoffs: initial bracket, mid-tick, and both terminal splashes.
    const seed = getPlayerSeed(state.S.result.wins);
    const bracket = buildBracket(seed, state.S.result.strength);
    state.S.playoffs = {
      playerSeed: seed, playerStrength: state.S.result.strength,
      initialBracket: bracket.map(pair => pair.map(t => ({ ...t }))),
      rounds: [], currentRound: 0, bracket,
      eliminated: false, champion: false, championTeam: null,
      tickState: null, pendingReveal: false,
      roundNames: ['Conference Quarterfinals', 'Conference Semifinals', 'NBA Finals'],
    };
    state.S.phase = 'playoffs';
    renderInto('playoffs round 1');

    const roundResults = state.S.playoffs.bracket.map(([a, b]) => ({
      teamA: a, teamB: b, ...simulateSeries(a.strength, b.strength),
    }));
    state.S.playoffs.tickState = {
      results: roundResults, revealedGames: 3,
      maxGames: Math.max(...roundResults.map(r => r.games.length)),
      done: false, playerWon: true,
    };
    renderInto('playoffs mid-tick');
    state.S.playoffs.tickState = null;

    while (state.S.playoffs.currentRound < 3) {
      const results = state.S.playoffs.bracket.map(([a, b]) => ({
        teamA: a, teamB: b, ...simulateSeries(a.strength, b.strength),
      }));
      applyPlayoffRound(state.S.playoffs, results);
    }
    renderInto(state.S.playoffs.champion ? 'championship' : 'eliminated');

    // Both terminal splashes, regardless of which way the sim went.
    state.S.playoffs.champion   = true;
    state.S.playoffs.eliminated = false;
    renderInto('championship (forced)');
    state.S.playoffs.champion   = false;
    state.S.playoffs.eliminated = true;
    state.S.playoffs.eliminatedIn = 'NBA Finals';
    renderInto('eliminated (forced)');
  });

  test(`the 1v1 / GM-vs-AI / Dynasty screens render in ${theme} mode`, () => {
    setTheme(theme);
    setViewport('mobile');

    // Alternating draft, at the pick where one roster is ahead of the other.
    state.S.mode = '1v1';
    state.S.p1Coach = 'jackson'; state.S.p2Coach = 'kerr'; state.S.p1Era = 'all'; state.S.p2Era = 'all';
    startGame1v1();
    state.S.p1Roster.PG = five[0]; state.S.p1Round = 1;
    state.S.draftLog.push({ name: five[0].name, playerNum: 1, pick: 1 });
    state.S.currentPlayer = 2;
    state.S.spinState = 'done';
    state.S.currentSpin = { team: 'Lakers', decade: '1980s' };
    state.S.draftBoard = g.DB.Lakers_1980s.slice();
    state.S.phase = 'drafting';
    renderInto('1v1 drafting');

    const p1 = five;
    const p2 = ['PG', 'SG', 'SF', 'PF', 'C'].map(pos =>
      all.filter(p => p.pos === pos && !p1.includes(p))[3]);
    state.S.p2Roster = Object.fromEntries(['PG', 'SG', 'SF', 'PF', 'C'].map((pos, i) => [pos, p2[i]]));
    state.S.seriesResult = simulateHeadToHeadSeries(p1, 'jackson', p2, 'kerr');
    state.S.seriesRevealedCount = 0;

    state.S.phase = 'series-preview'; renderInto('1v1 series preview');
    state.S.phase = 'series-sim';     renderInto('1v1 series sim, nothing revealed');
    state.S.seriesRevealedCount = state.S.seriesResult.games.length;
    renderInto('1v1 series sim, fully revealed');
    state.S.phase = 'series-result';  renderInto('1v1 series result');

    // Dynasty Duel reuses the same series screens with a CPU opponent that
    // has no roster cards and a p2Season that carries only a few fields.
    state.S.seriesConfettiFired = false;
    state.S.mode = 'dynasty-duel';
    state.S.dynastyOpponent = { weekKey: '2026-01-05', name: '96 Bulls', strength: 2.38, prevName: null };
    const season = simulateSeason(five, 'jackson');
    state.S.seriesResult = simulateDynastySeries(season, state.S.dynastyOpponent);
    state.S.p1Roster = { ...state.S.roster };
    state.S.p2Roster = { PG: null, SG: null, SF: null, PF: null, C: null };
    state.S.p1Coach = 'jackson'; state.S.p2Coach = null;
    state.S.phase = 'series-preview'; renderInto('dynasty preview');
    state.S.phase = 'series-result';  renderInto('dynasty result');
  });
}

test('the Daily Challenge draft screen renders with the day\'s rules applied', () => {
  setTheme('light');
  for (const ch of g.challenge.CHALLENGES) {
    state.S.mode = 'solo';
    state.S.dailyChallenge = ch;
    startGame('all');
    state.S.mode = 'daily';
    state.S.coach = 'jackson';
    state.S.dailyDate = '2026-03-04';
    state.S.selectedEra = ch.params.era || 'all';
    state.S.phase = 'drafting';
    state.S.spinState = 'done';
    state.S.currentSpin = { team: 'Bulls', decade: '1990s' };
    state.S.availablePlayers = g.DB.Bulls_1990s.slice();
    state.S.draftBoard = g.DB.Bulls_1990s.slice();
    renderInto(`daily draft — ${ch.id}`);

    state.S.result = simulateSeason(Object.values(state.S.roster).filter(Boolean).length === 5
      ? Object.values(state.S.roster).filter(Boolean) : five, 'jackson');
    state.S.seasonGames = state.S.result.games;
    state.S.dailyResult = { ...g.challenge.evaluateObjective(ch, state.S), score: 420, streak: 3 };
    state.S.phase = 'results';
    renderInto(`daily results — ${ch.id}`);
  }
  state.S.dailyChallenge = null;
  state.S.dailyResult = null;
});
