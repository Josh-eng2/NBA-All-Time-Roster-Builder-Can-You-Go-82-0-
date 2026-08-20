/**
 * Playoff title-odds calibration.
 *
 * The postseason is three best-of-7s back to back, so per-game probability
 * compounds hard and the difficulty is very sensitive to two constants:
 * PLAYOFF_FIELD_SHIFT (logic/state.js) and PLAYOFF_SERIES_K (logic/simulation.js).
 * Tuned together so a 60-win season converts about 2% of the time.
 *
 * Before that tuning every roster at 2.00 strength or below won the title
 * 0.00% of the time over 3,000 postseasons per rung — the results screen was
 * inviting teams into a bracket they could not win. These tests pin the shape
 * of the ladder so it cannot silently drift back.
 *
 * Math.random is seeded for the whole file, so the numbers are reproducible
 * rather than flaky; the assertion bands are still wide enough that an
 * innocent change to an unrelated constant will not trip them.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, withSeededRandom } from './helpers.mjs';

const g = await loadGame();
const { getPlayerSeed, buildBracket } = g.state;
const { applyPlayoffRound } = g.playoffs;
const { simulateSeries } = g.sim;

/** Share of `n` simulated postseasons this roster wins, as a percentage. */
function titleOdds(strength, wins, n = 4000) {
  let champ = 0;
  for (let i = 0; i < n; i++) {
    const seed = getPlayerSeed(wins);
    const bracket = buildBracket(seed, strength);
    const po = {
      playerSeed: seed, playerStrength: strength,
      initialBracket: bracket.map(p => p.map(t => ({ ...t }))),
      rounds: [], currentRound: 0, bracket,
      eliminated: false, champion: false, championTeam: null,
      roundNames: ['Conference Quarterfinals', 'Conference Semifinals', 'NBA Finals'],
    };
    while (po.currentRound < 3) {
      applyPlayoffRound(po, po.bracket.map(([a, b]) => ({
        teamA: a, teamB: b, ...simulateSeries(a.strength, b.strength),
      })));
    }
    if (po.champion) champ++;
  }
  return (champ / n) * 100;
}

// (wins, strength) anchors — the strengths real rosters actually produce at
// each win total, sampled from the live player database.
const LADDER = [
  [82, 2.60], [75, 2.40], [70, 2.30], [65, 2.10],
  [60, 2.00], [55, 1.90], [50, 1.80], [41, 1.60], [20, 1.00],
];

test('a 60-win season wins the title roughly 2% of the time', () => {
  const odds = withSeededRandom(20260820, () => titleOdds(2.00, 60, 12000));
  assert.ok(odds >= 1.0 && odds <= 4.0,
    `60-win title odds drifted to ${odds.toFixed(2)}% — the calibration target is ~2%`);
});

test('no playoff seed is mathematically locked out of the title', () => {
  // The regression this file exists for: strengths at and below 2.00 used to
  // return a hard 0.00%. A team good enough to be seeded must have a path.
  const odds = withSeededRandom(7, () => titleOdds(2.10, 65, 12000));
  assert.ok(odds > 0.5,
    `a 65-win team should have a real if slim shot, got ${odds.toFixed(2)}%`);
});

test('an undefeated season is a strong favourite but never a certainty', () => {
  const odds = withSeededRandom(99, () => titleOdds(2.60, 82, 6000));
  assert.ok(odds > 70, `82-0 should be a heavy favourite, got ${odds.toFixed(1)}%`);
  assert.ok(odds < 99, `82-0 must still be beatable, got ${odds.toFixed(1)}%`);
});

test('title odds rise monotonically with roster strength', () => {
  const measured = withSeededRandom(31337, () =>
    LADDER.map(([wins, strength]) => ({ wins, odds: titleOdds(strength, wins, 4000) })));
  for (let i = 1; i < measured.length; i++) {
    const better = measured[i - 1], worse = measured[i];
    // 0.6pt of slack absorbs Monte-Carlo noise between adjacent rungs.
    assert.ok(worse.odds <= better.odds + 0.6,
      `${worse.wins} wins (${worse.odds.toFixed(2)}%) should not beat `
      + `${better.wins} wins (${better.odds.toFixed(2)}%)`);
  }
  // The ladder must actually span a range — a flat curve would mean roster
  // quality stopped mattering in the postseason.
  assert.ok(measured[0].odds - measured.at(-1).odds > 50,
    'the spread between an undefeated team and a 20-win team collapsed');
});

test('the weakest qualifiers stay longshots — the gauntlet is still all-time teams', () => {
  const odds = withSeededRandom(4242, () => titleOdds(1.00, 20, 4000));
  assert.ok(odds < 1.0, `a 20-win team should not be a real contender, got ${odds.toFixed(2)}%`);
});
