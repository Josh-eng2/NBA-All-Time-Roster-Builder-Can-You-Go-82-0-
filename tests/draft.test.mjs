/**
 * Draft pool, duplicate prevention, skip budgets, and the player database's
 * own integrity. Duplicate prevention is the rule a player would notice
 * instantly if it broke and the one the draft screen relies on for dimming.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, flattenDb, mod } from './helpers.mjs';

const g   = await loadGame();
const all = flattenDb(g.DB);

test('the player database is internally consistent', () => {
  const REQUIRED = ['id', 'name', 'pos', 'ppg', 'rpg', 'apg', 'spg', 'bpg', 'archetype', 'popularity', 'overall'];
  const ids = new Map();
  for (const p of all) {
    for (const k of REQUIRED) {
      assert.notEqual(p[k], undefined, `${p.name} is missing ${k}`);
      if (typeof p[k] === 'number') {
        assert.ok(Number.isFinite(p[k]), `${p.name} has a non-finite ${k}`);
        assert.ok(p[k] >= 0, `${p.name} has a negative ${k}`);
      }
    }
    assert.ok(g.state.POSITIONS.includes(p.pos), `${p.name} has unknown position ${p.pos}`);
    assert.ok(Array.isArray(p.traits), `${p.name} traits must be an array`);
    // One id must never describe two different people — usedPlayerIds dedupes
    // on it, and the Legends catalog keys on it.
    if (ids.has(p.id)) assert.equal(ids.get(p.id), p.name, `id ${p.id} is shared by two players`);
    ids.set(p.id, p.name);
  }
});

test('every team/decade bucket a spin can land on has players', () => {
  for (const [key, players] of Object.entries(g.DB)) {
    assert.ok(players.length > 0, `${key} is an empty bucket — a spin there would deal nothing`);
    const decade = g.era.decadeFromBucketKey(key);
    assert.ok(g.state.DECADES.includes(decade), `${key} has an unrecognised decade`);
  }
});

test('secondary positions are derived, sorted by distance, and never the primary', () => {
  const RANK = { PG: 0, SG: 1, SF: 2, PF: 3, C: 4 };
  for (const p of all) {
    assert.ok(Array.isArray(p.secondaryPos), `${p.name} has no secondaryPos array`);
    assert.ok(!p.secondaryPos.includes(p.pos), `${p.name} lists its own position as secondary`);
    assert.equal(new Set(p.secondaryPos).size, p.secondaryPos.length, `${p.name} has duplicate secondaries`);
    const dists = p.secondaryPos.map(s => Math.abs(RANK[s] - RANK[p.pos]));
    assert.deepEqual(dists, [...dists].sort((a, b) => a - b), `${p.name} secondaries are out of order`);
  }
});

/** Minimal in-memory S for the draft helpers, which read the live module state. */
function draftState(over = {}) {
  g.state.startGame('all');
  Object.assign(g.state.S, over);
  return g.state.S;
}

test('a drafted player is removed from every future board, in every era', () => {
  const S = draftState();
  // Pick someone who exists in more than one team/decade bucket.
  const counts = new Map();
  for (const p of all) counts.set(p.name, (counts.get(p.name) || 0) + 1);
  const cloned = all.find(p => counts.get(p.name) > 1);
  assert.ok(cloned, 'expected at least one player to appear in more than one bucket');

  const before = g.draft.getAvailablePlayers(cloned.team, cloned.decade);
  assert.ok(before.some(p => p.id === cloned.id), 'the player should start out available');

  S.usedPlayerIds.push(cloned.id);
  S.draftedPlayerNames.add(cloned.name);

  for (const twin of all.filter(p => p.name === cloned.name)) {
    const board = g.draft.getAvailablePlayers(twin.team, twin.decade);
    assert.ok(!board.some(p => p.name === cloned.name),
      `${cloned.name} is still draftable from ${twin.team} ${twin.decade}`);
  }
});

test('spinResult only ever lands on a board that has players left', () => {
  const S = draftState();
  for (let i = 0; i < 300; i++) {
    const spin = g.draft.spinResult();
    assert.ok(spin, 'the wheel must always find a board');
    assert.ok(g.draft.getAvailablePlayers(spin.team, spin.decade).length > 0,
      `${spin.team} ${spin.decade} is empty`);
    // Draft the top player so the pool actually drains as the loop runs.
    const [p] = g.draft.getAvailablePlayers(spin.team, spin.decade);
    S.usedPlayerIds.push(p.id);
    S.draftedPlayerNames.add(p.name);
  }
});

test('spinResultAtLeast honours the requested tier when one exists', () => {
  draftState();
  for (let i = 0; i < 100; i++) {
    for (const tier of ['star', 'goat']) {
      const spin = g.draft.spinResultAtLeast(tier);
      const board = g.draft.getAvailablePlayers(spin.team, spin.decade);
      const rank = { starter: 0, star: 1, goat: 2 };
      assert.ok(board.some(p => rank[g.draft.playerTier(p)] >= rank[tier]),
        `${tier} spin landed on ${spin.team} ${spin.decade} with no ${tier}`);
    }
  }
});

test('a banned franchise is never offered, and a locked era never leaves its decade', () => {
  const S = draftState();
  S.mode = 'daily';
  S.dailyChallenge = { params: { excludeTeams: ['Lakers', 'Celtics'] } };
  for (let i = 0; i < 200; i++) {
    const spin = g.draft.spinResult();
    assert.ok(!['Lakers', 'Celtics'].includes(spin.team), `banned team ${spin.team} was offered`);
  }
  S.dailyChallenge = null;
  S.mode = 'solo';
  S.selectedEra = '1990s';
  for (let i = 0; i < 100; i++) {
    assert.equal(g.draft.spinResult().decade, '1990s');
  }
});

test('skip budgets are per mode and never go negative', () => {
  const S = draftState();
  S.mode = 'solo';
  assert.deepEqual(g.draft.getSkips(), { team: 1, decade: 1 });
  for (let i = 0; i < 5; i++) { g.draft.useSkip('team'); g.draft.useSkip('decade'); }
  assert.deepEqual(g.draft.getSkips(), { team: 0, decade: 0 });

  // Daily and rematch are shared-board modes: no re-rolls at all.
  for (const mode of ['daily', 'dynasty-duel', 'rematch']) {
    g.state.S.mode = mode;
    g.state.startGame('all');
    assert.deepEqual(g.draft.getSkips(), { team: 0, decade: 0 }, `${mode} should have no skips`);
  }
});

test('the Legends catalog covers every distinct player exactly once', () => {
  const catalog = g.draft.getLegendCatalog();
  const distinct = new Set(all.map(p => p.id));
  assert.equal(catalog.total, distinct.size);
  const listed = new Set();
  for (const decade of catalog.decades) {
    for (const p of catalog.byDecade[decade]) {
      assert.ok(!listed.has(p.id), `${p.name} is listed twice in the catalog`);
      listed.add(p.id);
      assert.equal(catalog.idToDecade[p.id], decade);
    }
    const pops = catalog.byDecade[decade].map(p => p.popularity ?? 50);
    assert.deepEqual(pops, [...pops].sort((a, b) => b - a), `${decade} is not popularity-sorted`);
  }
  assert.equal(listed.size, distinct.size);
});

// ── Skip re-roll pools ──────────────────────────────────────────────────────
// A skip re-rolls the wheel, so it has to obey exactly the rules the wheel
// obeys. The team pool was built from raw TEAMS and ignored a challenge's
// banned franchises, so a skip could land on a board where every player was
// off-limits.

test('a Team Skip never lands on the current team, an empty slot, or a banned franchise', () => {
  const S = draftState({
    mode: 'daily',
    dailyChallenge: { id: 'no-la-boston', type: 'constraint', params: { excludeTeams: ['Lakers', 'Celtics'], minWins: 60 } },
  });
  for (const decade of g.state.DECADES) {
    for (const team of g.state.TEAMS) {
      const pool = g.draft.skipTeamPool({ team, decade });
      assert.ok(!pool.includes(team), `${team} skipped onto itself`);
      for (const t of pool) {
        assert.ok(!['Lakers', 'Celtics'].includes(t), `skip pool offered the banned ${t}`);
        assert.ok(g.draft.getAvailablePlayers(t, decade).length > 0,
          `skip pool offered ${t}_${decade} with nothing left to draft`);
      }
    }
  }
  // Without a ban in force, the pool is drawn from every stocked franchise.
  S.dailyChallenge = null;
  S.mode = 'solo';
  assert.ok(g.draft.skipTeamPool({ team: 'Bulls', decade: '1990s' }).includes('Lakers'));
});

test('an Era Skip keeps the franchise and only offers eras it still has players in', () => {
  draftState();
  for (const team of g.state.TEAMS) {
    const pool = g.draft.skipDecadePool({ team, decade: '1990s' });
    assert.ok(!pool.includes('1990s'), `${team} skipped onto its current era`);
    for (const d of pool) {
      assert.ok(g.draft.getAvailablePlayers(team, d).length > 0,
        `era skip offered ${team}_${d} with nothing left to draft`);
    }
  }
});

test('the skip pools tolerate being asked before the wheel has landed', () => {
  draftState();
  assert.deepEqual(g.draft.skipTeamPool(null), []);
  assert.deepEqual(g.draft.skipDecadePool(null), []);
});

// ── AI GM pick policy ───────────────────────────────────────────────────────
// chooseAiPick() used to recompute the roster's "before" chemistry once per
// board player even though it cannot vary between them. Hoisting it halves
// the work of a CPU turn — and must not move a single pick.

const ai = await import(mod('js/logic/aiDraft.js'));

/** Reference scorer: the policy written out longhand, per candidate. */
function referencePick(board, roster, coachId) {
  const POS = ['PG', 'SG', 'SF', 'PF', 'C'];
  const empty = POS.filter(p => !roster[p]);
  const fits = (player, pos) =>
    player.pos === pos ? 1 : (player.secondaryPos || []).includes(pos) ? 0.55 : 0.15;
  const score = player => {
    const ratingNorm = Math.max(0, Math.min(1, ((player.overall ?? 82) - 74) / 25));
    const popNorm    = Math.max(0, ((player.popularity ?? 50) - 35) / 65);
    const posNeed    = empty.reduce((m, pos) => Math.max(m, fits(player, pos)), 0);
    const slot = ai.bestAiSlot(player, roster);
    let chemDelta = 0;
    if (slot) {
      const before = g.chem.calculateChemistry(Object.values(roster).filter(Boolean), coachId).chemBonus;
      const after  = g.chem.calculateChemistry(
        Object.values({ ...roster, [slot]: player }).filter(Boolean), coachId).chemBonus;
      chemDelta = Math.max(0, Math.min(1, (after - before + 0.05) / 0.25));
    }
    return 0.45 * ratingNorm + 0.25 * popNorm + 0.20 * posNeed + 0.10 * chemDelta;
  };
  let best = null, bestScore = -Infinity;
  for (const p of board) {
    const sc = score(p);
    if (sc > bestScore || (sc === bestScore && (p.overall ?? 0) > (best?.overall ?? 0))) {
      bestScore = sc; best = p;
    }
  }
  return best;
}

test('the AI GM picks the same player at every stage of a roster', () => {
  const POS = ['PG', 'SG', 'SF', 'PF', 'C'];
  const byPos = pos => all.filter(p => p.pos === pos);
  const boards = ['Bulls_1990s', 'Lakers_1980s', 'Warriors_2010s', 'Spurs_2000s']
    .map(k => g.DB[k]).filter(Boolean);

  for (const coach of [null, 'jackson', 'auerbach', 'kerr']) {
    for (let filled = 0; filled <= 4; filled++) {
      const roster = Object.fromEntries(POS.map(p => [p, null]));
      POS.slice(0, filled).forEach((pos, i) => { roster[pos] = byPos(pos)[i * 3]; });
      for (const board of boards) {
        const picked = ai.chooseAiPick(board, roster, coach);
        const expect = referencePick(board, roster, coach);
        assert.equal(picked?.id, expect?.id,
          `AI pick drifted (coach ${coach}, ${filled} filled)`);
        assert.ok(board.includes(picked), 'the AI picked a player that was not on the board');
      }
    }
  }
});

test('the AI GM always places into an empty slot, and gives up when full', () => {
  const POS = ['PG', 'SG', 'SF', 'PF', 'C'];
  const roster = Object.fromEntries(POS.map(p => [p, null]));
  const player = all.find(p => p.pos === 'C');
  for (let i = 0; i < 5; i++) {
    const slot = ai.bestAiSlot(player, roster);
    assert.ok(POS.includes(slot), 'expected an empty slot');
    assert.equal(roster[slot], null, 'the AI targeted a slot that was already filled');
    roster[slot] = all[i];
  }
  assert.equal(ai.bestAiSlot(player, roster), null, 'a full roster must yield no slot');
});
