/**
 * Season simulation: the numbers the results screen shows have to be the ones
 * the engine actually computed, and the record has to be a real 82-game
 * season no matter what roster it is handed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, flattenDb, bestFive } from './helpers.mjs';

const g   = await loadGame();
const all = flattenDb(g.DB);

test('a season is always 82 games and wins + losses reconcile', () => {
  const byPos = {};
  for (const p of all) (byPos[p.pos] ||= []).push(p);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  for (let i = 0; i < 200; i++) {
    const five = ['PG', 'SG', 'SF', 'PF', 'C'].map(pos => pick(byPos[pos]));
    const r = g.sim.simulateSeason(five, 'jackson');
    assert.equal(r.games.length, 82);
    assert.equal(r.wins + r.losses, 82);
    assert.equal(r.wins, r.games.filter(x => x.won).length,
      'the win total must equal the wins in the game log');
    assert.ok(r.wins >= 0 && r.wins <= 82);
  }
});

test('every decorated game has a coherent box score', () => {
  const r = g.sim.simulateSeason(bestFive(all), 'jackson');
  for (const game of r.games) {
    assert.ok(Number.isInteger(game.ps) && Number.isInteger(game.os), 'scores are integers');
    assert.ok(game.ps > 0 && game.os > 0, 'nobody scores zero');
    assert.equal(game.won, game.ps > game.os,
      `game marked won=${game.won} but scored ${game.ps}-${game.os}`);
    assert.equal(Math.abs(game.ps - game.os), game.margin,
      'the reported margin must equal the score difference');
    assert.ok(['blowout', 'solid', 'close'].includes(game.type));
  }
});

test('back-to-back games never repeat the same opponent', () => {
  for (let i = 0; i < 20; i++) {
    const r = g.sim.simulateSeason(bestFive(all), null);
    for (let k = 1; k < r.games.length; k++) {
      assert.notEqual(r.games[k].opp, r.games[k - 1].opp,
        `game ${k + 1} repeats opponent ${r.games[k].opp}`);
    }
  }
});

test('an empty or partial roster simulates instead of throwing', () => {
  for (const starters of [[], [all[0]], all.slice(0, 3)]) {
    const r = g.sim.simulateSeason(starters, 'jackson');
    assert.equal(r.wins + r.losses, 82);
    assert.ok(Number.isFinite(r.strength), 'strength must be finite');
    assert.ok(Number.isFinite(r.chemScore));
    assert.ok(Number.isFinite(r.avgPopularity));
    assert.ok(Number.isFinite(r.avgRating));
  }
});

test('reported team totals are the era-adjusted sums of the starters', () => {
  const five = bestFive(all);
  const r = g.sim.simulateSeason(five, null);
  for (const k of ['ppg', 'rpg', 'apg', 'spg', 'bpg']) {
    const expected = five.reduce((s, p) => s + g.era.eraAdjustedStat(p, k), 0);
    assert.ok(Math.abs(r.sTotals[k] - expected) < 1e-9,
      `${k}: reported ${r.sTotals[k]} vs computed ${expected}`);
  }
  assert.ok(Math.abs(r.teamStocks - Number((r.sTotals.spg + r.sTotals.bpg).toFixed(1))) < 1e-9);
});

test('avgRating is the plain mean of the starters\' overall — the same number the UI labels Team OVR', () => {
  const five = bestFive(all);
  const r = g.sim.simulateSeason(five, null);
  const expected = five.reduce((s, p) => s + p.overall, 0) / five.length;
  assert.ok(Math.abs(r.avgRating - Number(expected.toFixed(1))) < 1e-9);
});

test('per-player season lines track the real player and total to the season', () => {
  const five = bestFive(all);
  const r = g.sim.simulateSeason(five, null);
  assert.equal(r.playerStats.length, 5);
  for (const line of r.playerStats) {
    const p = five.find(x => x.id === line.id);
    assert.ok(p, 'every line maps back to a drafted starter');
    assert.equal(line.gp, 82);
    for (const k of ['ppg', 'rpg', 'apg', 'spg', 'bpg']) {
      assert.ok(line[k] >= 0, `${k} can never be negative`);
      // form roll is clamped to 0.91..1.09 and team factor to 0.98..1.02
      assert.ok(line[k] <= p[k] * 1.09 * 1.02 + 0.05,
        `${p.name} ${k}: simulated ${line[k]} drifts too far from real ${p[k]}`);
    }
    assert.equal(line.pts, Math.round(line.ppg * 82), 'season total must match the per-game average');
  }
  // Stat leaders must be the actual leaders of the simulated lines.
  for (const [key, statKey] of [['scoring','ppg'],['rebounding','rpg'],['assists','apg'],['steals','spg'],['blocks','bpg']]) {
    const best = r.playerStats.reduce((m, l) => (l[statKey] > m[statKey] ? l : m));
    assert.equal(r.statLeaders[key].id, best.id, `${key} leader must be the top ${statKey}`);
    assert.equal(r.statLeaders[key].val, best[statKey]);
  }
});

test('a stronger roster wins more: strength is monotonic in win probability', () => {
  const strong = g.sim.simulateSeason(bestFive(all), 'jackson');
  const weakFive = ['PG', 'SG', 'SF', 'PF', 'C'].map(pos =>
    all.filter(p => p.pos === pos).sort((a, b) => a.overall - b.overall)[0]);
  const weak = g.sim.simulateSeason(weakFive, 'jackson');
  assert.ok(strong.strength > weak.strength,
    `superteam strength ${strong.strength} should beat scrubs ${weak.strength}`);
  assert.ok(strong.winPct > weak.winPct);
});

test('coach boost stays inside the documented envelope for every coach', () => {
  const five = bestFive(all);
  for (const coach of g.state.COACHES) {
    const r = g.sim.simulateSeason(five, coach.id);
    assert.ok(r.coachBoost > 0 && r.coachBoost <= g.sim.COACH_BOOST_MAX + 1e-9,
      `${coach.id}: boost ${r.coachBoost} outside 0..${g.sim.COACH_BOOST_MAX}`);
    const { progress } = g.sim.coachSystemProgress(coach.id, five);
    assert.ok(progress >= 0 && progress <= 1, `${coach.id}: progress ${progress} not in 0..1`);
  }
  // No coach at all means no boost.
  assert.equal(g.sim.simulateSeason(five, null).coachBoost, 0);
});

test('defense profile reweights toward stocks and boards', () => {
  const five = bestFive(all);
  const classic = g.sim.simulateSeason(five, null, 'classic');
  const defense = g.sim.simulateSeason(five, null, 'defense');
  assert.equal(classic.simProfile, 'classic');
  assert.equal(defense.simProfile, 'defense');
  // Same roster, same ratios — only the weighting differs, so the diagnosis
  // must come from a defensive category in the defense profile.
  assert.ok(['rpg', 'spg', 'bpg'].includes(defense.weakestStat));
});

test('a best-of-7 always ends 4-N with N < 4', () => {
  for (let i = 0; i < 500; i++) {
    const s = g.sim.simulateSeries(1 + Math.random(), 1 + Math.random());
    const winner = Math.max(s.playerWins, s.oppWins);
    const loser  = Math.min(s.playerWins, s.oppWins);
    assert.equal(winner, 4);
    assert.ok(loser < 4);
    assert.equal(s.games.length, s.playerWins + s.oppWins);
    assert.equal(s.won, s.playerWins === 4);
  }
});
