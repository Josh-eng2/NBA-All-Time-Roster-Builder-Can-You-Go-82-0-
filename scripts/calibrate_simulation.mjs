// Read-only calibration probe; prints JSON and never rewrites game assets.
// These independent position pools do not model the legal franchise wheel.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadGame, flattenDb, withSeededRandom } from '../tests/helpers.mjs';
import { personId } from '../js/logic/dailyBoards.js';
import { configValue } from '../js/utils/remoteConfig.js';
const game = await loadGame(), all = flattenDb(game.DB);
const samples = 4000, seed = 8202026;
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * p)];
const results = {};
for (const policy of ['random', 'top15']) {
  const pools = game.state.POSITIONS.map(pos => {
    const players = all.filter(p => p.pos === pos).sort((a, b) => b.overall - a.overall || a.id.localeCompare(b.id));
    return policy === 'top15' ? players.slice(0, Math.ceil(players.length * 0.15)) : players;
  });
  const seasons = withSeededRandom(seed, () => Array.from({ length: samples }, () => {
    const used = new Set();
    const five = pools.map(pool => {
      const legal = pool.filter(p => !used.has(personId(p)));
      const player = legal[Math.floor(Math.random() * legal.length)];
      used.add(personId(player)); return player;
    });
    return game.sim.simulateSeason(five, 'jackson');
  }));
  results[policy] = { medianWins: percentile(seasons.map(s => s.wins), 0.5), p90Wins: percentile(seasons.map(s => s.wins), 0.9),
    medianStrength: percentile(seasons.map(s => s.strength), 0.5),
    wins70Rate: seasons.filter(s => s.wins >= 70).length / samples, perfectSeasons: seasons.filter(s => s.wins === 82).length };
}
console.log(JSON.stringify({ seed, samplesPerPolicy: samples, coach: 'jackson',
  dataSha256: createHash('sha256').update(readFileSync(new URL('../js/data/players.js', import.meta.url))).digest('hex'),
  config: Object.fromEntries(['sim_k', 'sim_center', 'win_cap'].map(key => [key, configValue(key)])),
  limitation: 'Independent natural-position pools; not an attainable-wheel strategy or production frequency estimate.', results }, null, 2));
