import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './helpers.mjs';
import { getDailyBoards, minimumCompletion, personId } from '../js/logic/dailyBoards.js';
const g = await loadGame();

function play(date, challenge, chooseLast) {
  g.state.S.mode = 'daily'; g.state.S.dailyChallenge = challenge;
  g.state.startGame('all');
  g.state.seedDailyRng(date);
  g.state.S.dailyBoards = getDailyBoards(date, challenge);
  const drawn = [];
  for (let round = 0; round < g.state.S.dailyBoards.length; round++) {
    g.state.S.round = round;
    // Deliberately consume a different amount of simulation/random work.
    for (let n = 0; n < (chooseLast ? 19 : 2); n++) g.state.pick([1, 2, 3]);
    const board = g.draft.spinResult(); drawn.push(board);
    const filled = Object.values(g.state.S.roster).filter(Boolean);
    const names = new Set(filled.map(personId));
    const picks = g.DB[`${board.team}_${board.decade}`].map(p => ({ ...p, ...board }))
      .filter(p => !names.has(personId(p)) && g.draft.isPickDraftable(challenge, p, filled).legal);
    assert.ok(picks.length, `${date}/${challenge.id}/round ${round} stranded a legal draft`);
    const pick = chooseLast ? picks.at(-1) : picks[0];
    const pos = g.state.POSITIONS.find(pos => !g.state.S.roster[pos]);
    g.state.S.roster[pos] = pick;
    g.state.S.usedPlayerIds.push(pick.id); g.state.S.draftedPlayerNames.add(pick.name);
  }
  assert.equal(Object.values(g.state.S.roster).filter(Boolean).length, 5);
  if (challenge.params.maxPopTotal != null) assert.ok(Object.values(g.state.S.roster).reduce((n, p) => n + (p.popularity ?? 50), 0) <= challenge.params.maxPopTotal);
  return drawn;
}
test('every challenge has identical completable boards after different picks and RNG calls', () => {
  for (const challenge of g.challenge.CHALLENGES) {
    for (const date of ['2026-03-08', '2026-09-08', '2026-11-01', '2026-12-31']) {
      assert.deepEqual(play(date, challenge, false), play(date, challenge, true));
    }
  }
});
test('budget lookahead considers actual future buckets and the same athlete under aliases', () => {
  assert.equal(personId('Nene'), personId('Nenê'));
  assert.equal(minimumCompletion([{ team: 'missing', decade: '2000s' }]), Infinity);
  assert.equal(minimumCompletion([]), 0);
});

/**
 * A Daily is one attempt a day. Being handed five boards on which NO legal
 * five-man combination can reach the day's stated stat target spends that
 * attempt on arithmetic, not on play — and it was the normal case: over a
 * sample of dates, Swat Team's 8 combined blocks were unreachable on ~80% of
 * the days it came up (best available ~6.1), and Bucket Getter's 30-PPG
 * scorer on ~half (best available ~25–27).
 *
 * getDailyBoards() now re-rolls past those board sets. This pins the outcome
 * on the stat-objective challenges, by exhaustively searching the day's real
 * boards for a lineup that clears the bar.
 */
test('a stat-objective Daily is never dealt boards that cannot meet it', () => {
  const POS = g.state.POSITIONS;
  const fits = (p, slot) => p.pos === slot || (p.secondaryPos || []).includes(slot);
  const covers = (five) => {
    const match = {};
    const assign = (i, seen) => {
      for (const slot of POS) {
        if (seen.has(slot) || !fits(five[i], slot)) continue;
        seen.add(slot);
        if (match[slot] === undefined || assign(match[slot], seen)) { match[slot] = i; return true; }
      }
      return false;
    };
    return five.every((_, i) => assign(i, new Set()));
  };

  const statChallenges = g.challenge.CHALLENGES.filter(
    c => c.params.teamBpg != null || c.params.starterPpg != null);
  assert.ok(statChallenges.length, 'no stat-objective challenge left to check');

  for (const challenge of statChallenges) {
    for (const date of ['2026-01-02', '2026-03-08', '2026-06-11', '2026-09-08', '2026-12-31']) {
      const boards = getDailyBoards(date, challenge);
      const locked = challenge.type === 'locked' ? g.challenge.getLockedPlayer(challenge) : null;
      const pre = locked ? [locked] : [];
      const need = challenge.params.teamBpg ?? challenge.params.starterPpg;
      const stat = challenge.params.teamBpg != null ? 'bpg' : 'ppg';
      const isSum = challenge.params.teamBpg != null;

      // Top few per board is enough: on an additive stat the optimum never
      // needs a player another board beats outright.
      const pools = boards.map(b => (g.DB[`${b.team}_${b.decade}`] || [])
        .map(p => ({ ...p, ...b }))
        .filter(p => g.challenge.checkPickLegal(challenge, p, pre, { remainingFloor: 0 }).legal)
        .sort((x, y) => (y[stat] || 0) - (x[stat] || 0))
        .slice(0, 5));

      let best = 0;
      const taken = new Set(pre.map(personId));
      const chosen = [];
      const walk = (i, acc) => {
        if (i === pools.length) {
          if (covers([...pre, ...chosen])) {
            best = Math.max(best, isSum ? acc + pre.reduce((s, p) => s + (p[stat] || 0), 0) : acc);
          }
          return;
        }
        for (const p of pools[i]) {
          const id = personId(p);
          if (taken.has(id)) continue;
          taken.add(id); chosen.push(p);
          walk(i + 1, isSum ? acc + (p[stat] || 0) : Math.max(acc, p[stat] || 0));
          chosen.pop(); taken.delete(id);
        }
      };
      walk(0, 0);

      assert.ok(best >= need,
        `${date}/${challenge.id}: best reachable ${stat} is ${best.toFixed(1)}, challenge demands ${need} — the day is unpassable however you draft`);
    }
  }
});
