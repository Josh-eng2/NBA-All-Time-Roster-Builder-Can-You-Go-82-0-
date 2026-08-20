/**
 * Playoff seeding, bracket construction, and round advancement. The bracket is
 * the one place where a wrong pairing is invisible in a single run but wrong
 * in every run, so it is asserted structurally rather than by eyeballing.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './helpers.mjs';

const g = await loadGame();
const { getPlayerSeed, buildBracket, CPU_TEAMS, PLAYOFF_FIELD_SHIFT } = g.state;
const { QF_SEED_PAIRS, applyPlayoffRound, getBracketDisplayState, seriesWinner } = g.playoffs;

test('seeding is a monotonic ladder over the whole win range', () => {
  let prev = getPlayerSeed(82);
  const seen = new Set([prev]);
  for (let wins = 81; wins >= 0; wins--) {
    const seed = getPlayerSeed(wins);
    assert.ok(seed >= 1 && seed <= 8, `${wins} wins gave seed ${seed}`);
    assert.ok(seed >= prev,
      `fewer wins must never earn a better seed: ${wins} wins -> #${seed}, ${wins + 1} wins -> #${prev}`);
    seen.add(seed);
    prev = seed;
  }
  assert.equal(seen.size, 8, 'all eight seeds should be reachable, not just the extremes');
  assert.equal(getPlayerSeed(82), 1);
  assert.equal(getPlayerSeed(0), 8);
});

test('the bracket holds all 8 distinct teams with the player in their seed slot', () => {
  for (let seed = 1; seed <= 8; seed++) {
    const bracket = buildBracket(seed, 2.0);
    assert.equal(bracket.length, 4);
    const teams = bracket.flat();
    assert.equal(teams.length, 8);
    assert.equal(new Set(teams.map(t => t.name)).size, 8, 'no duplicate teams');
    assert.equal(teams.filter(t => t.isPlayer).length, 1, 'exactly one player slot');
    for (const t of teams) assert.ok(Number.isFinite(t.strength), `${t.name} has no strength`);

    // The player must sit where QF_SEED_PAIRS says their seed sits, since the
    // renderer labels the rows from that table.
    let found = null;
    bracket.forEach(([top, bottom], i) => {
      if (top.isPlayer)    found = QF_SEED_PAIRS[i][0];
      if (bottom.isPlayer) found = QF_SEED_PAIRS[i][1];
    });
    assert.equal(found, seed, `seed ${seed} player is rendered in the wrong bracket row`);
  }
});

test('the top two seeds are kept apart until the final', () => {
  // Adjacent pairs feed the same semifinal (applyPlayoffRound pairs [0,1] and
  // [2,3]), so seeds 1 and 2 must not share a half.
  const half = {};
  QF_SEED_PAIRS.forEach((pair, i) => { for (const s of pair) half[s] = i < 2 ? 'top' : 'bottom'; });
  assert.notEqual(half[1], half[2], 'seeds 1 and 2 share a half of the bracket');
  assert.notEqual(half[1], half[3]);
  assert.notEqual(half[2], half[4]);
});

/** Runs a whole postseason with a forced outcome function. */
function runPlayoffs(seed, strength, decide) {
  const bracket = buildBracket(seed, strength);
  const po = {
    playerSeed: seed, playerStrength: strength,
    initialBracket: bracket.map(pair => pair.map(t => ({ ...t }))),
    rounds: [], currentRound: 0, bracket,
    eliminated: false, champion: false, championTeam: null, tickState: null,
    roundNames: ['Conference Quarterfinals', 'Conference Semifinals', 'NBA Finals'],
  };
  const outcomes = [];
  let guard = 0;
  while (po.currentRound < 3) {
    assert.ok(++guard <= 4, 'playoff advancement failed to terminate');
    const results = po.bracket.map(([a, b]) => {
      const aWon = decide(a, b);
      const pw = aWon ? 4 : 1 + Math.floor(Math.random() * 3);
      const ow = aWon ? 1 + Math.floor(Math.random() * 3) : 4;
      return { teamA: a, teamB: b, playerWins: pw, oppWins: ow,
               games: Array(pw + ow).fill('W'), won: aWon };
    });
    outcomes.push(applyPlayoffRound(po, results));
  }
  return { po, outcomes };
}

test('a dominant player wins the title from every seed', () => {
  for (let seed = 1; seed <= 8; seed++) {
    const { po, outcomes } = runPlayoffs(seed, 99, (a, b) => a.strength >= b.strength);
    assert.equal(po.champion, true, `seed ${seed} should have won`);
    assert.equal(po.eliminated, false);
    assert.equal(po.championTeam.isPlayer, true);
    assert.equal(po.rounds.length, 3);
    assert.equal(po.currentRound, 3);
    assert.equal(outcomes.at(-1), 'champion');
  }
});

test('elimination is recorded once, in the right round, and the bracket still finishes', () => {
  for (let seed = 1; seed <= 8; seed++) {
    const { po } = runPlayoffs(seed, 0, (a, b) => a.strength >= b.strength);
    assert.equal(po.champion, false);
    assert.equal(po.eliminated, true);
    assert.equal(po.eliminatedIn, 'Conference Quarterfinals',
      'a hopeless team must go out in round one');
    assert.equal(po.rounds.length, 3, 'the CPU bracket plays on after the player is out');
    assert.ok(po.championTeam && !po.championTeam.isPlayer);
  }
});

test('the rendered bracket agrees with the recorded results', () => {
  const { po } = runPlayoffs(3, 99, (a, b) => a.strength >= b.strength);
  const view = getBracketDisplayState(po);
  assert.equal(view.qf.length, 4);
  assert.equal(view.sf.length, 2);
  assert.ok(view.qf.every(s => s.complete));
  assert.ok(view.sf.every(s => s.complete));
  assert.ok(view.finals.complete);
  assert.equal(view.champion.name, 'Your Team');
  // Semifinal entrants must be the quarterfinal winners, in bracket order.
  for (const i of [0, 1]) {
    assert.equal(view.sf[i].top.name, seriesWinner(po.rounds[0][i * 2]).name);
    assert.equal(view.sf[i].bottom.name, seriesWinner(po.rounds[0][i * 2 + 1]).name);
  }
  assert.equal(view.finals.top.name, seriesWinner(po.rounds[1][0]).name);
  assert.equal(view.finals.bottom.name, seriesWinner(po.rounds[1][1]).name);
  // Every displayed series score must be a completed best-of-7.
  for (const slot of [...view.qf, ...view.sf, view.finals]) {
    assert.equal(Math.max(slot.topScore, slot.bottomScore), 4);
    assert.ok(Math.min(slot.topScore, slot.bottomScore) < 4);
  }
});

test('an untouched bracket renders as empty rather than throwing', () => {
  const bracket = buildBracket(4, 1.8);
  const po = {
    playerSeed: 4, playerStrength: 1.8,
    initialBracket: bracket.map(p => p.map(t => ({ ...t }))),
    rounds: [], currentRound: 0, bracket, eliminated: false, champion: false,
    championTeam: null, tickState: null, roundNames: ['a', 'b', 'c'],
  };
  const view = getBracketDisplayState(po);
  assert.equal(view.champion, null);
  assert.ok(view.qf.every(s => !s.complete && s.top && s.bottom));
  assert.ok(view.sf.every(s => s.top === null && s.bottom === null));
  assert.equal(view.finals.top, null);
});

test('the bracket draws the top CPU tier, lowered by the shift, without mutating CPU_TEAMS', () => {
  const before = JSON.stringify(CPU_TEAMS);
  buildBracket(1, 2.0);
  buildBracket(8, 1.0);
  // Load-bearing: logic/dynastyDuel.js reads these same strengths and faces
  // those teams at full power. If buildBracket ever mutated them in place, it
  // would silently retune a mode that has nothing to do with the bracket.
  assert.equal(JSON.stringify(CPU_TEAMS), before, 'buildBracket must not mutate or sort CPU_TEAMS in place');

  const cpuSorted = [...CPU_TEAMS].sort((a, b) => b.strength - a.strength);
  const filled = buildBracket(1, 2.0).flat().filter(t => !t.isPlayer);
  assert.equal(filled.length, 7);

  // Each entrant is one of the top 7, lowered by exactly the shift, with its
  // identity intact — the whole point of shifting rather than rewriting them.
  for (const t of filled) {
    const source = cpuSorted.find(c => c.name === t.name);
    assert.ok(source, `${t.name} is not one of the CPU teams`);
    assert.ok(Math.abs(t.strength - (source.strength - PLAYOFF_FIELD_SHIFT)) < 1e-9,
      `${t.name}: expected ${source.strength} - ${PLAYOFF_FIELD_SHIFT}, got ${t.strength}`);
  }
  // Ranking among the field is preserved by a constant shift.
  const names = filled.map(t => t.name);
  assert.deepEqual(
    [...filled].sort((a, b) => b.strength - a.strength).map(t => t.name),
    cpuSorted.filter(c => names.includes(c.name)).map(c => c.name),
    'a constant shift must not reorder the field');
});
