import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, flattenDb } from './helpers.mjs';
const g = await loadGame(), players = flattenDb(g.DB);
const permutations = list => list.length ? list.flatMap((x, i) => permutations(list.filter((_, j) => i !== j)).map(tail => [x, ...tail])) : [[]];
const slots = permutations(g.state.POSITIONS);
const fit = (p, pos) => p.pos === pos ? 0.024 : p.secondaryPos?.includes(pos) ? 0 : -0.12;
test('optimizer maximizes the applied position contribution across 120 assignments', () => {
  for (let n = 0; n < 80; n++) {
    const roster = Array.from({ length: 5 }, (_, i) => players[(n * 61 + i * 137) % players.length]);
    const score = perm => roster.reduce((sum, p, i) => sum + fit(p, perm[i]), 0) + (roster.every((p, i) => p.pos === perm[i]) ? 0.056 : 0);
    const best = Math.max(...slots.map(score));
    const result = g.chem.calculateChemistry(roster, null);
    const applied = result.lineupAssignment.reduce((sum, a) => sum + fit(a.player, a.slot), 0) + (result.lineupAssignment.every(a => a.fit === 'primary') ? 0.056 : 0);
    assert.ok(Math.abs(best - applied) < 1e-9);
    assert.equal(g.chem.calculateChemistry([...roster].reverse(), null).chemScore, result.chemScore);
  }
});
test('box-score integer allocations reconcile with team and player season points', () => {
  for (let n = 0; n < 30; n++) {
    const roster = Array.from({ length: 5 }, (_, i) => players[(n * 47 + i * 109) % players.length]);
    const result = g.sim.simulateSeason(roster, null);
    const teamPoints = result.games.reduce((sum, game) => {
      assert.equal(Object.values(game.playerPoints).reduce((a, b) => a + b, 0), game.ps);
      assert.ok(Object.values(game.playerPoints).every(p => Number.isInteger(p) && p >= 0));
      return sum + game.ps;
    }, 0);
    assert.equal(result.playerStats.reduce((sum, p) => sum + p.pts, 0), teamPoints);
  }
});
