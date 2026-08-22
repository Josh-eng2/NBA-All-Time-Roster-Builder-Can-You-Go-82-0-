/**
 * Daily Challenge: one shared prompt per UTC day, deterministic for everyone,
 * and — the part a player would rage at — never an unwinnable or dead-ended
 * board.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, flattenDb } from './helpers.mjs';

const g   = await loadGame();
const all = flattenDb(g.DB);
const { CHALLENGES, getDailyChallenge, checkPickLegal, checkRosterConstraint,
        evaluateObjective, dailyScore, getLockedPlayer } = g.challenge;

/** Walks days forward from a fixed anchor so the suite is date-independent. */
function days(n, from = '2026-01-01') {
  const out = [];
  let t = Date.parse(from + 'T00:00:00Z');
  for (let i = 0; i < n; i++) { out.push(new Date(t).toISOString().slice(0, 10)); t += 86400000; }
  return out;
}

test('the catalog is well formed and every challenge can be scored', () => {
  const ids = new Set();
  for (const ch of CHALLENGES) {
    assert.ok(ch.id && !ids.has(ch.id), `duplicate or missing challenge id: ${ch.id}`);
    ids.add(ch.id);
    assert.ok(ch.emoji && ch.title && ch.desc, `${ch.id} is missing display copy`);
    assert.ok(['constraint', 'objective', 'locked'].includes(ch.type), `${ch.id} has an unknown type`);
    assert.ok(ch.params, `${ch.id} has no params`);
    // Every challenge must carry a win floor, or "pass" would just mean
    // "finished the draft".
    assert.ok(typeof ch.params.minWins === 'number' && ch.params.minWins > 0,
      `${ch.id} has no minWins floor`);
    assert.ok(ch.params.minWins <= 82, `${ch.id} demands more than a full season`);
    if (ch.params.era) assert.ok(g.state.DECADES.includes(ch.params.era), `${ch.id}: bad era`);
    if (ch.params.allowedDecades) {
      for (const d of ch.params.allowedDecades) assert.ok(g.state.DECADES.includes(d), `${ch.id}: bad decade ${d}`);
    }
    if (ch.params.excludeTeams) {
      for (const t of ch.params.excludeTeams) assert.ok(g.state.TEAMS.includes(t), `${ch.id}: bad team ${t}`);
    }
    if (ch.type === 'locked') {
      const p = getLockedPlayer(ch);
      assert.ok(p, `${ch.id}: locked player ${ch.params.playerId} is not in the database`);
      assert.equal(p.pos, ch.params.pos,
        `${ch.id}: ${p.name} is a ${p.pos} but the challenge locks them at ${ch.params.pos}`);
      assert.ok(p.team && p.decade, `${ch.id}: locked player was not hydrated with team/decade`);
    }
  }
});

test('the day\'s challenge is deterministic and never repeats back to back', () => {
  const seq = days(400).map(d => ({ d, ch: getDailyChallenge(d) }));
  for (const { d, ch } of seq) {
    assert.ok(ch, `${d} produced no challenge`);
    assert.equal(getDailyChallenge(d).id, ch.id, `${d} is not deterministic`);
  }
  for (let i = 1; i < seq.length; i++) {
    assert.notEqual(seq[i].ch.id, seq[i - 1].ch.id,
      `${seq[i].d} repeats ${seq[i - 1].d}'s challenge (${seq[i].ch.id})`);
  }
  // …and the rotation actually uses the catalog rather than cycling two entries.
  assert.ok(new Set(seq.map(s => s.ch.id)).size >= Math.min(8, CHALLENGES.length));
});

test('a fans-budget challenge can always still be completed after a legal pick', () => {
  const budget = CHALLENGES.find(c => c.params.maxPopTotal != null);
  assert.ok(budget, 'expected a maxPopTotal challenge in the catalog');
  const cap = budget.params.maxPopTotal;
  const cheapest = Math.min(...all.map(p => p.popularity ?? 50));

  // Greedily draft the cheapest legal player at each slot; the feasibility
  // guard in checkPickLegal must never paint the roster into a corner.
  const filled = [];
  for (const pos of g.state.POSITIONS) {
    const legal = all
      .filter(p => p.pos === pos && !filled.some(f => f.name === p.name))
      .filter(p => checkPickLegal(budget, p, filled).legal)
      .sort((a, b) => (a.popularity ?? 50) - (b.popularity ?? 50));
    assert.ok(legal.length > 0, `no legal ${pos} left under the ${cap} fans budget`);
    filled.push(legal[0]);
  }
  const status = checkRosterConstraint(budget, filled);
  assert.equal(status.pass, true, `finished roster busts the budget: ${status.detail}`);
  const sum = filled.reduce((s, p) => s + p.popularity, 0);
  assert.ok(sum < cap, `roster fans ${sum} must be under ${cap}`);
  assert.ok(cheapest * 5 < cap, 'the cheapest possible five must fit the budget');
});

// The test above drafts the CHEAPEST legal player each round, which can never
// paint itself into a corner. A player chasing star power does the opposite,
// and that is how a Boos Only run reached 296 of a 300 budget with four
// starters while the cheapest player the wheel could still deal cost 7 — no
// legal fifth pick existed anywhere and the run could only spin forever.
// checkPickLegal alone cannot see that coming (its fallback floor is the
// DB-wide minimum, which is 0); isPickDraftable judges against the pool that
// is actually still draftable.

/** Plays a whole budget run through the real draft loop, taking the most
 *  expensive legal player on every board. Returns null if it ever strands. */
function greedyBudgetRun(challenge, legalFn) {
  g.state.clearDailyRng();
  g.state.S.mode = 'daily';
  g.state.S.dailyChallenge = challenge;
  g.state.startGame('all');
  const S = g.state.S;
  S.mode = 'daily';
  S.selectedEra = 'all';

  for (let round = 0; round < g.state.POSITIONS.length; round++) {
    let placed = false;
    for (let spin = 0; spin < 3000 && !placed; spin++) {
      const landed = g.draft.spinResult();
      if (!landed) break;
      const board = g.draft.getAvailablePlayers(landed.team, landed.decade)
        .slice().sort((a, b) => (b.popularity ?? 50) - (a.popularity ?? 50));
      const filled = g.state.POSITIONS.map(p => S.roster[p]).filter(Boolean);
      for (const p of board) {
        const hydrated = { ...p, team: landed.team, decade: landed.decade };
        if (!legalFn(challenge, hydrated, filled).legal) continue;
        S.roster[g.state.POSITIONS.find(x => !S.roster[x])] = hydrated;
        S.usedPlayerIds.push(p.id);
        S.draftedPlayerNames.add(p.name);
        S.usedDecades.push(landed.decade);
        placed = true;
        break;
      }
    }
    if (!placed) return null;
  }
  return g.state.POSITIONS.map(p => S.roster[p]);
}

test('a star-chasing fans-budget run can always be finished', () => {
  const budget = CHALLENGES.find(c => c.params.maxPopTotal != null);
  const cap    = budget.params.maxPopTotal;
  let best = 0;
  for (let i = 0; i < 120; i++) {
    const five = greedyBudgetRun(budget, g.draft.isPickDraftable);
    assert.ok(five, 'a Boos Only run was drafted into a state with no legal pick left');
    const sum = five.reduce((s, p) => s + (p.popularity ?? 50), 0);
    assert.ok(sum < cap, `finished roster busts the budget: ${sum} >= ${cap}`);
    assert.equal(new Set(five.map(p => p.name)).size, 5, 'a player was drafted twice');
    best = Math.max(best, sum);
  }
  // …and the guard must not be so cautious that the budget stops being usable.
  assert.ok(best > cap * 0.9,
    `the budget became unusable — best roster only reached ${best} of ${cap} fans`);
});

test('the remaining-slots floor is an assignment the draft could really make', () => {
  const budget = CHALLENGES.find(c => c.params.maxPopTotal != null);
  g.state.clearDailyRng();
  g.state.S.mode = 'daily';
  g.state.S.dailyChallenge = budget;
  g.state.startGame('all');
  g.state.S.mode = 'daily';
  g.state.S.selectedEra = 'all';

  // With nothing drafted, four more slots must cost at least the four cheapest
  // DISTINCT players — never the same 0-fans player counted once per decade
  // he appears in, which is what let a run strand.
  const cheapestByName = new Map();
  for (const p of all) {
    const c = p.popularity ?? 50;
    if (!cheapestByName.has(p.name) || c < cheapestByName.get(p.name)) cheapestByName.set(p.name, c);
  }
  const distinct = [...cheapestByName.values()].sort((a, b) => a - b);
  const floor4 = g.draft.cheapestRemainingTotal(4, null);
  assert.ok(floor4 >= distinct.slice(0, 4).reduce((s, c) => s + c, 0),
    'the floor is below the four cheapest distinct players — it is double-counting someone');
  assert.equal(g.draft.cheapestRemainingTotal(0, null), 0, 'no slots left costs nothing');

  // The player being judged is still in the pool; counting him as one of his
  // own future slots is exactly the double-count that stranded a run.
  const zero = all.filter(p => (p.popularity ?? 50) === 0)[0];
  if (zero) {
    const withHim    = g.draft.cheapestRemainingTotal(1, null);
    const withoutHim = g.draft.cheapestRemainingTotal(1, null, zero.name);
    assert.ok(withoutHim >= withHim,
      'excluding the pick under judgement must never lower the floor');
  }
});

test('pick legality and the finished-roster check agree with each other', () => {
  for (const ch of CHALLENGES) {
    // Build the strictest-legal roster we can for this challenge.
    const filled = [];
    for (const pos of g.state.POSITIONS) {
      const legal = all.filter(p => p.pos === pos
        && !filled.some(f => f.name === p.name)
        && checkPickLegal(ch, p, filled).legal);
      assert.ok(legal.length > 0, `${ch.id}: no legal ${pos} exists at all`);
      filled.push(legal[0]);
    }
    const status = checkRosterConstraint(ch, filled);
    assert.equal(status.pass, true,
      `${ch.id}: a roster built entirely from legal picks failed the roster check (${status.detail})`);
  }
});

test('an illegal pick is rejected with a reason a player can act on', () => {
  const banned = CHALLENGES.find(c => c.params.excludeTeams);
  const lakers = all.find(p => p.team === 'Lakers');
  const check  = checkPickLegal(banned, lakers, []);
  assert.equal(check.legal, false);
  assert.match(check.reason, /Lakers/);

  const window = CHALLENGES.find(c => c.params.allowedDecades);
  const outside = all.find(p => !window.params.allowedDecades.includes(p.decade));
  const c2 = checkPickLegal(window, outside, []);
  assert.equal(c2.legal, false);
  assert.match(c2.reason, new RegExp(outside.decade));
});

test('evaluateObjective fails on the win floor and passes when it is met', () => {
  const winOnly = CHALLENGES.find(c => c.type === 'objective' && Object.keys(c.params).length === 1);
  assert.ok(winOnly, 'expected a pure win-total challenge');
  const roster = {};
  for (const pos of g.state.POSITIONS) roster[pos] = all.find(p => p.pos === pos);

  const short = { roster, result: { wins: winOnly.params.minWins - 1, playerStats: [], simTotals: {} } };
  const met   = { roster, result: { wins: winOnly.params.minWins,     playerStats: [], simTotals: {} } };
  assert.equal(evaluateObjective(winOnly, short).pass, false);
  assert.match(evaluateObjective(winOnly, short).detail, /needed/);
  assert.equal(evaluateObjective(winOnly, met).pass, true);

  // Score always tracks the verdict — the Firestore rule asserts the identity.
  assert.equal(dailyScore(winOnly, short), short.result.wins * 10);
  assert.equal(dailyScore(winOnly, met),   met.result.wins * 10 + 200);
});

test('a missing season result fails cleanly instead of throwing', () => {
  for (const ch of CHALLENGES) {
    const v = evaluateObjective(ch, { roster: {}, result: null });
    assert.equal(v.pass, false);
    assert.ok(v.detail);
  }
});
