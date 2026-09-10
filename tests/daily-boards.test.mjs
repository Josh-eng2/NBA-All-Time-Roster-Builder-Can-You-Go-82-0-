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
