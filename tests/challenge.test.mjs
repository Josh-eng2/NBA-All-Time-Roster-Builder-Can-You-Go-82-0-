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
