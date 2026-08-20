/**
 * Draft pool, duplicate prevention, skip budgets, and the player database's
 * own integrity. Duplicate prevention is the rule a player would notice
 * instantly if it broke and the one the draft screen relies on for dimming.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, flattenDb } from './helpers.mjs';

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
