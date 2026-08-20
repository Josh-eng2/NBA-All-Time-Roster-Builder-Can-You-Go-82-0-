/**
 * Game state, mode configuration, era normalization, and the season tier /
 * grade labels that the results screen and the share card both read.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, flattenDb } from './helpers.mjs';

const g = await loadGame();
const { pickDynastyForPlay, weekKeyUTC, dynastyDuelScore } =
  await import(new URL('../js/logic/dynastyDuel.js', import.meta.url).href);
const { S, startGame, startGame1v1, TEAMS, DECADES, POSITIONS, COACHES,
        TEAM_COLORS, ERA_DESC, CPU_TEAMS, SNAKE_ORDER, TOTAL_ROUNDS,
        seedDailyRng, clearDailyRng, pick, pickCosmetic } = g.state;

test('static config tables are complete and mutually consistent', () => {
  assert.equal(new Set(TEAMS).size, TEAMS.length, 'duplicate franchise');
  for (const t of TEAMS) {
    assert.ok(TEAM_COLORS[t], `${t} has no colours`);
    assert.match(TEAM_COLORS[t].bg, /^#[0-9a-fA-F]{6}$/, `${t} bg is not a hex colour`);
    assert.match(TEAM_COLORS[t].accent, /^#[0-9a-fA-F]{6}$/, `${t} accent is not a hex colour`);
  }
  for (const d of DECADES) assert.ok(ERA_DESC[d], `${d} has no era description`);
  assert.equal(new Set(COACHES.map(c => c.id)).size, COACHES.length, 'duplicate coach id');
  for (const c of COACHES) {
    assert.ok(c.name && c.system && c.desc, `${c.id} is missing copy`);
    assert.match(c.accent, /^#[0-9a-fA-F]{6}$/, `${c.id} accent is not a hex colour`);
    assert.ok(DECADES.includes(c.era), `${c.id} is tagged with an unknown era`);
  }
  assert.equal(new Set(CPU_TEAMS.map(t => t.name)).size, CPU_TEAMS.length, 'duplicate CPU team');
  assert.ok(CPU_TEAMS.length >= 8, 'a bracket needs at least seven CPU opponents plus a spare');
  assert.equal(POSITIONS.length, TOTAL_ROUNDS, 'one draft round per starting slot');
});

test('the snake order gives both drafters five picks and no triple turn', () => {
  assert.equal(SNAKE_ORDER.length, 10);
  // Pick 1 is implicit (currentPlayer starts at 1); the table is consulted
  // from index 1 onward, so the real sequence is [1, ...SNAKE_ORDER.slice(1)].
  const order = [1, ...SNAKE_ORDER.slice(1)];
  assert.equal(order.filter(p => p === 1).length, 5, 'player 1 must get five picks');
  assert.equal(order.filter(p => p === 2).length, 5, 'player 2 must get five picks');
  for (let i = 2; i < order.length; i++) {
    assert.ok(!(order[i] === order[i - 1] && order[i] === order[i - 2]),
      `three picks in a row for player ${order[i]} at index ${i}`);
  }
});

test('startGame resets a run cleanly and keeps the choices made before it', () => {
  g.state.S.coach = 'kerr';
  g.state.S.mode  = 'solo';
  startGame('1990s');
  const fresh = g.state.S;
  assert.equal(fresh.phase, 'drafting');
  assert.equal(fresh.coach, 'kerr', 'the coach chosen before the reset must survive it');
  assert.equal(fresh.selectedEra, '1990s');
  assert.equal(fresh.round, 0);
  assert.deepEqual(fresh.roster, { PG: null, SG: null, SF: null, PF: null, C: null });
  assert.deepEqual(fresh.usedPlayerIds, []);
  assert.equal(fresh.draftedPlayerNames.size, 0);
  assert.equal(fresh.result, null);
  assert.equal(fresh.playoffs, null);
  assert.equal(fresh.runSaved, false);
  assert.equal(fresh.coachLocked, false);
  assert.equal(fresh.eraLocked, false);
  assert.ok(fresh.gameId, 'every run needs its own id so a stale spin can be discarded');

  const firstId = fresh.gameId;
  startGame('all');
  assert.notEqual(g.state.S.gameId, firstId, 'a new run must get a new id');
});

test('a locked-player daily starts with that star already registered', () => {
  const locked = g.challenge.CHALLENGES.find(c => c.type === 'locked');
  // startGame() replaces the whole S object, so state must always be reached
  // through the live module binding — never a destructured local.
  g.state.S.mode = 'daily';
  g.state.S.dailyChallenge = locked;
  startGame('all');
  const fresh = g.state.S;
  const p = fresh.roster[locked.params.pos];
  assert.ok(p, 'the locked star should be in their slot');
  assert.equal(p.id, locked.params.playerId);
  assert.ok(fresh.usedPlayerIds.includes(p.id), 'the locked star must count as drafted');
  assert.ok(fresh.draftedPlayerNames.has(p.name), 'and must block their own cross-era twin');
  assert.ok(fresh.usedDecades.includes(p.decade));
  assert.deepEqual({ team: fresh.teamSkips, decade: fresh.decadeSkips }, { team: 0, decade: 0 });
  g.state.S.dailyChallenge = null;
  g.state.S.mode = 'solo';
});

test('startGame1v1 gives both drafters a roster and a skip budget', () => {
  Object.assign(g.state.S, { mode: '1v1', p1Coach: 'kerr', p2Coach: 'riley', p1Era: 'all', p2Era: 'all' });
  startGame1v1();
  const s = g.state.S;
  assert.equal(s.mode, '1v1');
  assert.equal(s.currentPlayer, 1);
  assert.deepEqual(s.p1Roster, { PG: null, SG: null, SF: null, PF: null, C: null });
  assert.deepEqual(s.p2Roster, { PG: null, SG: null, SF: null, PF: null, C: null });
  assert.equal(s.p1TeamSkips, 1);
  assert.equal(s.p2TeamSkips, 1, 'a human opponent gets their own budget');

  Object.assign(g.state.S, { mode: 'gm-ai', p1Coach: 'kerr', p2Coach: 'riley' });
  startGame1v1();
  assert.equal(g.state.S.mode, 'gm-ai');
  assert.equal(g.state.S.p2TeamSkips, 0, 'the AI GM never skips');
  assert.equal(g.state.S.p2DecadeSkips, 0);
  g.state.S.mode = 'solo';
});

test('the daily seed makes pick() identical for everyone, and clearing restores randomness', () => {
  const draw = () => Array.from({ length: 40 }, () => pick(TEAMS));
  seedDailyRng('2026-08-20');
  const a = draw();
  seedDailyRng('2026-08-20');
  const b = draw();
  assert.deepEqual(a, b, 'the same date must deal the same sequence');
  seedDailyRng('2026-08-21');
  assert.notDeepEqual(draw(), a, 'a different date must deal a different sequence');

  // Cosmetic draws must never touch the seeded stream, or the shared board
  // desyncs with the number of re-renders.
  seedDailyRng('2026-08-20');
  pickCosmetic(TEAMS); pickCosmetic(TEAMS); pickCosmetic(TEAMS);
  assert.deepEqual(draw(), a, 'pickCosmetic consumed a seeded draw');

  clearDailyRng();
  const c = draw(), d = draw();
  assert.notDeepEqual(c, d, 'after clearing, draws must be genuinely random');
});

test('mode config covers every reachable mode', () => {
  const MODES = ['solo', 'blind', 'daily', 'rematch', '1v1', 'gm-ai', 'dynasty-duel', 'defense', 'fans'];
  for (const m of MODES) {
    const cfg = g.modes.getModeConfig(m);
    assert.ok(cfg, `${m} has no config`);
    assert.ok(['solo', 'dual'].includes(cfg.draft), `${m}: bad draft type`);
    assert.ok(['season', 'series', 'dynastySeries'].includes(cfg.postDraft), `${m}: bad postDraft`);
    assert.ok(['classic', 'defense', 'fans'].includes(cfg.simProfile), `${m}: bad sim profile`);
    assert.ok(cfg.skips >= 0);
    assert.equal(g.modes.isDualDraft(m), cfg.draft === 'dual');
  }
  // An unknown mode must fall back rather than crash a render.
  assert.deepEqual(g.modes.getModeConfig('nonsense'), g.modes.getModeConfig('solo'));
  for (const m of g.modes.MORE_MODES) {
    assert.ok(g.modes.MODE_CONFIG[m.id], `More Modes lists ${m.id} with no config`);
    assert.ok(m.label && m.desc && m.emoji && m.action, `${m.id} is missing card copy`);
  }
});

test('era normalization rescales to the modern pace baseline', () => {
  const p = { decade: '1960s', ppg: 20, rpg: 20, apg: 5, spg: 1, bpg: 1 };
  const f = g.era.eraFactor('1960s');
  assert.ok(f < 1, 'a faster era must be scaled down');
  assert.equal(g.era.eraFactor('2020s'), 1, 'the reference era is unscaled');
  assert.equal(g.era.eraFactor(undefined), 1, 'an unknown era must not distort anything');
  assert.equal(g.era.eraFactor('1850s'), 1);
  for (const k of ['ppg', 'rpg', 'apg', 'spg', 'bpg']) {
    assert.ok(Math.abs(g.era.eraAdjustedStat(p, k) - p[k] * f) < 1e-12);
  }
  assert.equal(g.era.eraAdjustedStat(null, 'ppg'), 0, 'a missing player must not throw');
  assert.equal(g.era.eraAdjustedStat({ decade: '1990s' }, 'ppg'), 0, 'a missing stat reads as zero');
  assert.deepEqual(Object.keys(g.era.eraAdjustedLine(p)), ['ppg', 'rpg', 'apg', 'spg', 'bpg']);
  assert.equal(g.era.decadeFromBucketKey('Trail Blazers_1970s'), '1970s');
  assert.equal(g.era.decadeFromBucketKey('nonsense'), null);
});

test('season tier and grade never disagree about how good a season was', () => {
  const { seasonTier, seasonGrade } = g.seasonTier;
  assert.equal(seasonTier(82).id, 'perfect');
  assert.equal(seasonGrade(82), 'S');
  let prevTier = null;
  for (let w = 82; w >= 0; w--) {
    const t = seasonTier(w), grade = seasonGrade(w);
    assert.ok(t.id && t.label && t.emoji, `${w} wins has an incomplete tier`);
    assert.ok(grade, `${w} wins has no grade`);
    // Tier boundaries must also be grade boundaries, never the other way round.
    if (prevTier && t.id !== prevTier) {
      assert.notEqual(seasonGrade(w + 1), grade,
        `${w} wins changes tier but not grade — the badge and the label would disagree`);
    }
    prevTier = t.id;
  }
  assert.equal(seasonTier(NaN).id, 'rebuild');
  assert.equal(seasonGrade(NaN), 'F');
});

test('the Fans First pass gate and score are consistent', () => {
  const { fansFirstScore, fansFirstPassed } = g.modes;
  assert.equal(fansFirstScore(70, 20, 40), Math.round(70 * 10 + 20 * 5 + 40 * 2));
  assert.equal(fansFirstScore(undefined, undefined, undefined), 500, 'missing inputs fall back, not NaN');
  assert.equal(fansFirstPassed(70, 35), true);
  assert.equal(fansFirstPassed(69, 35), false);
  assert.equal(fansFirstPassed(70, 34), false);
  // More star power or more wins must never lower the score.
  let prev = -Infinity;
  for (let pop = 0; pop <= 300; pop += 10) {
    const s = fansFirstScore(pop, 10, 50);
    assert.ok(s >= prev, 'score must be monotonic in popularity');
    prev = s;
  }
});

test('the Dynasty Duel rotation resolves to real CPU teams and rotates', () => {
  for (let i = 0; i < 100; i++) {
    const d = pickDynastyForPlay({ excludeName: '96 Bulls' });
    assert.ok(CPU_TEAMS.some(t => t.name === d.name), `${d.name} is not a real CPU team`);
    assert.notEqual(d.name, '96 Bulls', 'the excluded opponent came back around');
    assert.ok(Number.isFinite(d.strength));
    assert.match(d.weekKey, /^\d{4}-\d{2}-\d{2}$/);
  }
  // weekKeyUTC must land on a Monday for any input shape.
  for (const input of ['2026-08-20', '2026-08-17', '2026-08-23', new Date('2026-08-19T05:00:00Z'), undefined]) {
    const k = weekKeyUTC(input);
    assert.match(k, /^\d{4}-\d{2}-\d{2}$/, `weekKeyUTC(${input}) returned ${k}`);
    assert.equal(new Date(k + 'T00:00:00Z').getUTCDay(), 1, `${k} is not a Monday`);
  }
  assert.ok(dynastyDuelScore(4, true, 2.5) > dynastyDuelScore(4, false, 2.5), 'winning must score higher');
  assert.ok(dynastyDuelScore(4, true, 2.5) > dynastyDuelScore(3, true, 2.5), 'more games won must score higher');
});
