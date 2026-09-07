/**
 * The online 1v1 match core (js/logic/match.js) is the shared referee for a
 * draft played on two devices, so every rule it gets wrong desyncs two people
 * mid-game rather than inconveniencing one. These tests pin the rules, the
 * turn order, and — most importantly — that a log replays to exactly the state
 * it was recorded from, which is what a client relies on after a refresh.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, mod } from './helpers.mjs';

const g = await loadGame();
const { TEAMS, DECADES, POSITIONS, SNAKE_ORDER, TOTAL_ROUNDS } = g.state;
const M = await import(mod('js/logic/match.js'));
const {
  createMatch, joinMatch, applyEvent, validateEvent, replay,
  seatOnClock, pickCount, isDraftComplete, startersFor, availableDecades,
  availableIn, generateMatchCode, isValidMatchCode, normaliseMatchCode,
  CODE_ALPHABET, CODE_LEN, otherSeat, picksRemaining,
} = M;

// ── Fixtures ─────────────────────────────────────────────────────────────────
// A procedural pool: every bucket holds three players with distinct ids and
// distinct names, so a draft can always be driven to completion. Individual
// tests overlay specific buckets to exercise the edge cases.
function makePool(overrides = {}) {
  return (team, decade) => {
    const key = `${team}_${decade}`;
    if (key in overrides) return overrides[key];
    return [0, 1, 2].map(i => ({
      id:   `${team}-${decade}-${i}`.toLowerCase(),
      name: `${team} ${decade} #${i}`,
    }));
  };
}

const freshMatch = (era = 'all') =>
  joinMatch(createMatch({ code: 'ABC234', era, hostName: 'Josh' }), { guestName: 'Sam' });

/** Drives a legal draft to completion, returning the final state and its log. */
function playDraft(state, pool) {
  const events = [];
  const emit = e => { events.push(e); state = applyEvent(state, e, pool); };
  while (!isDraftComplete(state)) {
    const seat   = seatOnClock(state);
    const decade = availableDecades(state)[0];
    const team   = TEAMS.find(t => availableIn(state, t, decade, pool).length > 0);
    emit({ seq: state.seq, by: seat, t: 'spin', team, decade });
    const board = availableIn(state, team, decade, pool);
    const pos   = POSITIONS.find(p => !state.rosters[seat][p]);
    emit({ seq: state.seq, by: seat, t: 'pick', id: board[0].id, pos });
  }
  return { state, events };
}

// ── Match codes ──────────────────────────────────────────────────────────────

test('generated codes are the right shape and avoid misread characters', () => {
  for (const bad of ['0', 'O', '1', 'I', 'L']) {
    assert.ok(!CODE_ALPHABET.includes(bad), `${bad} is too easily misread to be in the alphabet`);
  }
  let seq = 0;
  const rand = () => ((seq = (seq * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = 0; i < 500; i++) {
    const code = generateMatchCode(rand);
    assert.equal(code.length, CODE_LEN);
    assert.ok(isValidMatchCode(code), `${code} failed its own validator`);
  }
});

test('codes are accepted however a player types them, and junk is rejected', () => {
  assert.equal(normaliseMatchCode('abc234'), 'ABC234', 'lower case is how a code gets typed');
  assert.equal(normaliseMatchCode('  ABC234 '), 'ABC234', 'pasted codes carry whitespace');
  for (const bad of ['', 'ABC23', 'ABC2345', 'ABC23O', 'ABC-234', null, undefined, 42, {}]) {
    assert.equal(normaliseMatchCode(bad), null, `${JSON.stringify(bad)} should not validate`);
    assert.equal(isValidMatchCode(bad), false);
  }
});

test('a match cannot be created with an unusable code or an unknown era', () => {
  assert.throws(() => createMatch({ code: 'nope' }), /invalid match code/);
  assert.throws(() => createMatch({ code: 'ABC234', era: '1950s' }), /unknown era/);
});

// ── Turn order ───────────────────────────────────────────────────────────────

test('the seat on the clock follows the shared snake order for all ten picks', () => {
  const pool = makePool();
  let state = freshMatch();
  const seen = [];
  while (!isDraftComplete(state)) {
    seen.push(seatOnClock(state) === 'host' ? 1 : 2);
    const decade = availableDecades(state)[0];
    const team   = TEAMS.find(t => availableIn(state, t, decade, pool).length > 0);
    const seat   = seatOnClock(state);
    state = applyEvent(state, { seq: state.seq, by: seat, t: 'spin', team, decade }, pool);
    const pos = POSITIONS.find(p => !state.rosters[seat][p]);
    state = applyEvent(state, {
      seq: state.seq, by: seat, t: 'pick',
      id: availableIn(state, team, decade, pool)[0].id, pos,
    }, pool);
  }
  assert.deepEqual(seen, SNAKE_ORDER, 'turn order must be the same snake the local game uses');
  assert.equal(seatOnClock(state), null, 'nobody is on the clock once the draft is done');
});

test('a completed draft gives each seat a full starting five', () => {
  const { state } = playDraft(freshMatch(), makePool());
  assert.equal(state.status, 'complete');
  assert.equal(pickCount(state), SNAKE_ORDER.length);
  for (const seat of ['host', 'guest']) {
    assert.equal(state.rounds[seat], TOTAL_ROUNDS);
    assert.equal(picksRemaining(state, seat), 0);
    assert.equal(startersFor(state, seat).length, TOTAL_ROUNDS);
    assert.ok(POSITIONS.every(p => state.rosters[seat][p]), `${seat} has an empty slot`);
  }
  assert.equal(otherSeat('host'), 'guest');
  assert.equal(otherSeat('guest'), 'host');
});

// ── Replay ───────────────────────────────────────────────────────────────────

test('a log replays to exactly the state it was recorded from', () => {
  const pool = makePool();
  const { state, events } = playDraft(freshMatch(), pool);
  const rebuilt = replay(freshMatch(), events, pool);
  assert.deepEqual(rebuilt, state, 'replay is what a client does after a refresh');
});

test('replaying a prefix reconstructs the draft mid-flight', () => {
  const pool = makePool();
  const { events } = playDraft(freshMatch(), pool);
  // Six events in is three completed picks — host, guest, guest.
  const partial = replay(freshMatch(), events.slice(0, 6), pool);
  assert.equal(pickCount(partial), 3);
  assert.equal(partial.rounds.host, 1);
  assert.equal(partial.rounds.guest, 2);
  assert.equal(partial.status, 'drafting');
  assert.equal(seatOnClock(partial), 'host', 'pick 4 is the host by the snake order');
});

test('applying an event never mutates the state handed to it', () => {
  const pool  = makePool();
  const state = freshMatch();
  const frozen = structuredClone(state);
  applyEvent(state, { seq: 0, by: 'host', t: 'spin', team: 'Bulls', decade: '1990s' }, pool);
  assert.deepEqual(state, frozen, 'the reducer must be pure — replay depends on it');
});

// ── Sequence and turn enforcement ────────────────────────────────────────────

test('events must arrive in sequence', () => {
  const pool  = makePool();
  const state = freshMatch();
  const spin  = { by: 'host', t: 'spin', team: 'Bulls', decade: '1990s' };
  assert.equal(validateEvent(state, { ...spin, seq: 1 }, pool).ok, false, 'a gap is rejected');
  assert.equal(validateEvent(state, { ...spin, seq: -1 }, pool).ok, false);
  assert.equal(validateEvent(state, { ...spin, seq: 0 }, pool).ok, true);
  const after = applyEvent(state, { ...spin, seq: 0 }, pool);
  assert.equal(validateEvent(after, { ...spin, seq: 0 }, pool).ok, false, 'a replayed event is rejected');
});

test('a seat cannot play out of turn', () => {
  const pool  = makePool();
  const state = freshMatch();
  const res = validateEvent(state, { seq: 0, by: 'guest', t: 'spin', team: 'Bulls', decade: '1990s' }, pool);
  assert.equal(res.ok, false);
  assert.match(res.reason, /out of turn/);
});

test('nothing can be played before the guest joins or after the draft ends', () => {
  const pool    = makePool();
  const waiting = createMatch({ code: 'ABC234' });
  assert.equal(validateEvent(waiting, { seq: 0, by: 'host', t: 'spin', team: 'Bulls', decade: '1990s' }, pool).ok, false);
  assert.throws(() => joinMatch(joinMatch(waiting, {}), {}), /cannot join/);

  const { state } = playDraft(freshMatch(), pool);
  const res = validateEvent(state, { seq: state.seq, by: 'host', t: 'spin', team: 'Bulls', decade: '1990s' }, pool);
  assert.equal(res.ok, false);
  assert.match(res.reason, /complete/);
});

// ── Pool rules ───────────────────────────────────────────────────────────────

test('a player taken by one seat is gone for the other', () => {
  // Era-locked, so both seats keep landing on the same bucket — in an 'all'
  // match the decade the host used would be off the wheel next turn anyway.
  const pool  = makePool();
  let state = freshMatch('1990s');
  state = applyEvent(state, { seq: 0, by: 'host', t: 'spin', team: 'Bulls', decade: '1990s' }, pool);
  const taken = availableIn(state, 'Bulls', '1990s', pool)[0];
  state = applyEvent(state, { seq: 1, by: 'host', t: 'pick', id: taken.id, pos: 'PG' }, pool);

  assert.ok(!availableIn(state, 'Bulls', '1990s', pool).some(p => p.id === taken.id),
    'the shared pool is what makes this a draft rather than two solo runs');

  state = applyEvent(state, { seq: 2, by: 'guest', t: 'spin', team: 'Bulls', decade: '1990s' }, pool);
  const res = validateEvent(state, { seq: 3, by: 'guest', t: 'pick', id: taken.id, pos: 'PG' }, pool);
  assert.equal(res.ok, false);
  assert.match(res.reason, /not draftable/);

  const free = availableIn(state, 'Bulls', '1990s', pool)[0];
  assert.equal(validateEvent(state, { seq: 3, by: 'guest', t: 'pick', id: free.id, pos: 'PG' }, pool).ok,
    true, 'the rest of the board is still open');
});

test('drafting a player blocks his cross-era twin, who has a different id', () => {
  // The real DB carries the same person under several ids across decades;
  // draft.js excludes by name as well as id for exactly this reason.
  const pool = makePool({
    Bulls_1990s: [{ id: 'jordan_96', name: 'Michael Jordan' }],
    Bulls_1980s: [{ id: 'jordan_88', name: 'Michael Jordan' },
                  { id: 'pippen_88', name: 'Scottie Pippen' }],
    Lakers_1980s: [{ id: 'jordan_85', name: 'Michael Jordan' }],
  });
  let state = freshMatch();
  state = applyEvent(state, { seq: 0, by: 'host', t: 'spin', team: 'Bulls', decade: '1990s' }, pool);
  const afterPick = applyEvent(state, { seq: 1, by: 'host', t: 'pick', id: 'jordan_96', pos: 'SG' }, pool);

  // A bucket holding nothing but the twin is not a board at all, so the wheel
  // may not land there — the rule removes the spin, not just the pick. Checked
  // from a turn with an empty board, or the one-spin-per-turn rule answers first.
  const dead = validateEvent(afterPick, { seq: 2, by: 'guest', t: 'spin', team: 'Lakers', decade: '1980s' }, pool);
  assert.equal(dead.ok, false);
  assert.match(dead.reason, /no players left/);

  state = applyEvent(afterPick, { seq: 2, by: 'guest', t: 'spin', team: 'Bulls', decade: '1980s' }, pool);
  const res = validateEvent(state, { seq: 3, by: 'guest', t: 'pick', id: 'jordan_88', pos: 'SG' }, pool);
  assert.equal(res.ok, false, 'the same man must not appear on both rosters');
  assert.match(res.reason, /not draftable/);
  assert.equal(validateEvent(state, { seq: 3, by: 'guest', t: 'pick', id: 'pippen_88', pos: 'SG' }, pool).ok,
    true, 'only the twin is blocked, not the bucket');
});

test('a slot can only be filled once, and only a real slot', () => {
  const pool = makePool();
  let state = freshMatch();
  state = applyEvent(state, { seq: 0, by: 'host', t: 'spin', team: 'Bulls', decade: '1990s' }, pool);
  const board = availableIn(state, 'Bulls', '1990s', pool);
  state = applyEvent(state, { seq: 1, by: 'host', t: 'pick', id: board[0].id, pos: 'PG' }, pool);

  // Host's next turn is pick 4 under the snake order; drive to it.
  state = applyEvent(state, { seq: 2, by: 'guest', t: 'spin', team: 'Lakers', decade: '1980s' }, pool);
  state = applyEvent(state, { seq: 3, by: 'guest', t: 'pick', id: availableIn(state, 'Lakers', '1980s', pool)[0].id, pos: 'PG' }, pool);
  state = applyEvent(state, { seq: 4, by: 'guest', t: 'spin', team: 'Celtics', decade: '1960s' }, pool);
  state = applyEvent(state, { seq: 5, by: 'guest', t: 'pick', id: availableIn(state, 'Celtics', '1960s', pool)[0].id, pos: 'SG' }, pool);
  assert.equal(seatOnClock(state), 'host');

  state = applyEvent(state, { seq: 6, by: 'host', t: 'spin', team: 'Heat', decade: '2010s' }, pool);
  const next = availableIn(state, 'Heat', '2010s', pool)[0];
  assert.equal(validateEvent(state, { seq: 7, by: 'host', t: 'pick', id: next.id, pos: 'PG' }, pool).ok,
    false, 'PG is already filled');
  assert.equal(validateEvent(state, { seq: 7, by: 'host', t: 'pick', id: next.id, pos: 'XX' }, pool).ok,
    false, 'XX is not a slot');
  assert.equal(validateEvent(state, { seq: 7, by: 'host', t: 'pick', id: next.id, pos: 'C' }, pool).ok, true);
});

test('a pick needs a board, and a spin needs an empty board', () => {
  const pool  = makePool();
  const state = freshMatch();
  const noBoard = validateEvent(state, { seq: 0, by: 'host', t: 'pick', id: 'anything', pos: 'PG' }, pool);
  assert.equal(noBoard.ok, false);
  assert.match(noBoard.reason, /before spinning/);

  const spun = applyEvent(state, { seq: 0, by: 'host', t: 'spin', team: 'Bulls', decade: '1990s' }, pool);
  const twice = validateEvent(spun, { seq: 1, by: 'host', t: 'spin', team: 'Lakers', decade: '1980s' }, pool);
  assert.equal(twice.ok, false, 'one spin per turn — a second would be a free re-roll');
});

test('the wheel cannot land somewhere with nobody left to draft', () => {
  const pool  = makePool({ Bulls_1990s: [] });
  const state = freshMatch();
  const res = validateEvent(state, { seq: 0, by: 'host', t: 'spin', team: 'Bulls', decade: '1990s' }, pool);
  assert.equal(res.ok, false);
  assert.match(res.reason, /no players left/);
  assert.equal(validateEvent(state, { seq: 0, by: 'host', t: 'spin', team: 'Sonics', decade: '1990s' }, pool).ok,
    false, 'and not on a team that does not exist');
});

// ── Eras ─────────────────────────────────────────────────────────────────────

test('an era-locked match only ever offers that decade', () => {
  const pool  = makePool();
  const state = freshMatch('1990s');
  assert.deepEqual(availableDecades(state), ['1990s']);
  assert.equal(validateEvent(state, { seq: 0, by: 'host', t: 'spin', team: 'Bulls', decade: '1980s' }, pool).ok, false);
  const { state: done } = playDraft(state, pool);
  assert.ok(done.usedDecades.every(d => d === '1990s'));
});

test('decades come back once all seven are used, so a ten-pick draft can finish', () => {
  // Not an edge case: there are seven decades and ten picks, so the fallback
  // in availableDecades is reached in ordinary play.
  const pool  = makePool();
  const state = freshMatch();
  const used  = { ...state, usedDecades: DECADES.slice() };
  assert.deepEqual(availableDecades(used), DECADES, 'an exhausted wheel refills rather than jamming');
  const { state: done } = playDraft(state, pool);
  assert.equal(done.usedDecades.length, SNAKE_ORDER.length);
});

// ── Skips ────────────────────────────────────────────────────────────────────

test('a team skip holds the decade and an era skip holds the team', () => {
  const pool  = makePool();
  let state = freshMatch();
  state = applyEvent(state, { seq: 0, by: 'host', t: 'spin', team: 'Bulls', decade: '1990s' }, pool);

  const badTeamSkip = validateEvent(state, { seq: 1, by: 'host', t: 'skip-team', team: 'Lakers', decade: '1980s' }, pool);
  assert.equal(badTeamSkip.ok, false, 'a team skip must not also move the decade');
  const sameTeam = validateEvent(state, { seq: 1, by: 'host', t: 'skip-team', team: 'Bulls', decade: '1990s' }, pool);
  assert.equal(sameTeam.ok, false, 'a skip has to actually change something');

  const badEraSkip = validateEvent(state, { seq: 1, by: 'host', t: 'skip-era', team: 'Lakers', decade: '1980s' }, pool);
  assert.equal(badEraSkip.ok, false, 'an era skip must not swap the franchise');

  assert.equal(validateEvent(state, { seq: 1, by: 'host', t: 'skip-team', team: 'Lakers', decade: '1990s' }, pool).ok, true);
  assert.equal(validateEvent(state, { seq: 1, by: 'host', t: 'skip-era',  team: 'Bulls',  decade: '1980s' }, pool).ok, true);
});

test('each seat gets one team skip and one era skip for the whole draft', () => {
  const pool  = makePool();
  let state = freshMatch();
  state = applyEvent(state, { seq: 0, by: 'host', t: 'spin',      team: 'Bulls',  decade: '1990s' }, pool);
  state = applyEvent(state, { seq: 1, by: 'host', t: 'skip-team', team: 'Lakers', decade: '1990s' }, pool);
  assert.equal(state.skips.host.team, 0);
  assert.equal(state.skips.guest.team, 1, 'budgets are per seat, not shared');

  const spent = validateEvent(state, { seq: 2, by: 'host', t: 'skip-team', team: 'Heat', decade: '1990s' }, pool);
  assert.equal(spent.ok, false);
  assert.match(spent.reason, /no team skips left/);

  state = applyEvent(state, { seq: 2, by: 'host', t: 'skip-era', team: 'Lakers', decade: '1980s' }, pool);
  assert.equal(state.skips.host.era, 0);
  assert.equal(state.currentSpin.decade, '1980s');

  // Budgets do not refresh on the next turn.
  state = applyEvent(state, { seq: 3, by: 'host', t: 'pick', id: availableIn(state, 'Lakers', '1980s', pool)[0].id, pos: 'PG' }, pool);
  state = applyEvent(state, { seq: 4, by: 'guest', t: 'spin', team: 'Bulls', decade: '1990s' }, pool);
  state = applyEvent(state, { seq: 5, by: 'guest', t: 'pick', id: availableIn(state, 'Bulls', '1990s', pool)[0].id, pos: 'PG' }, pool);
  state = applyEvent(state, { seq: 6, by: 'guest', t: 'spin', team: 'Heat', decade: '2000s' }, pool);
  state = applyEvent(state, { seq: 7, by: 'guest', t: 'pick', id: availableIn(state, 'Heat', '2000s', pool)[0].id, pos: 'SG' }, pool);
  assert.equal(seatOnClock(state), 'host');
  state = applyEvent(state, { seq: 8, by: 'host', t: 'spin', team: 'Spurs', decade: '2010s' }, pool);
  assert.equal(validateEvent(state, { seq: 9, by: 'host', t: 'skip-team', team: 'Suns', decade: '2010s' }, pool).ok,
    false, 'a spent budget stays spent for the rest of the draft');
});

test('nothing can be skipped before the wheel has landed', () => {
  const pool  = makePool();
  const state = freshMatch();
  const res = validateEvent(state, { seq: 0, by: 'host', t: 'skip-team', team: 'Bulls', decade: '1990s' }, pool);
  assert.equal(res.ok, false);
  assert.match(res.reason, /nothing to skip/);
});

// ── AI takeover ──────────────────────────────────────────────────────────────

test('a takeover is recorded in the log and the draft carries on', () => {
  const pool  = makePool();
  let state = freshMatch();
  state = applyEvent(state, { seq: 0, by: 'host', t: 'spin', team: 'Bulls', decade: '1990s' }, pool);
  state = applyEvent(state, { seq: 1, by: 'host', t: 'pick', id: availableIn(state, 'Bulls', '1990s', pool)[0].id, pos: 'PG' }, pool);

  state = applyEvent(state, { seq: 2, by: 'host', t: 'takeover' }, pool);
  assert.equal(state.status, 'ai-takeover');
  assert.equal(state.aiFrom, 2, 'the guest is replaced from pick 2, which is their turn');
  assert.equal(validateEvent(state, { seq: 3, by: 'host', t: 'takeover' }, pool).ok, false, 'once only');

  // The absent seat's picks still belong to that seat — the model does not
  // care which client transmitted them, only that the seat is on the clock.
  state = applyEvent(state, { seq: 3, by: 'guest', t: 'spin', team: 'Lakers', decade: '1980s' }, pool);
  state = applyEvent(state, {
    seq: 4, by: 'guest', t: 'pick', ai: true,
    id: availableIn(state, 'Lakers', '1980s', pool)[0].id, pos: 'PG',
  }, pool);
  assert.equal(state.rounds.guest, 1);
  assert.equal(state.draftLog.at(-1).ai, true, 'the result screen has to be able to say so');

  const { state: done } = playDraft(state, pool);
  assert.equal(done.status, 'complete', 'a takeover still produces a finished draft');
});

// ── Illegal events fail loudly ───────────────────────────────────────────────

test('applying an illegal event throws rather than desyncing the two clients', () => {
  const pool  = makePool();
  const state = freshMatch();
  assert.throws(() => applyEvent(state, { seq: 9, by: 'host', t: 'spin', team: 'Bulls', decade: '1990s' }, pool),
    /illegal event/);
  assert.throws(() => applyEvent(state, { seq: 0, by: 'host', t: 'nonsense' }, pool), /illegal event/);
  assert.equal(validateEvent(state, null, pool).ok, false);
});

// ── Against the real player database ─────────────────────────────────────────

test('a full draft runs on the real player database', () => {
  // The fixtures above pin the rules; this pins that the rules survive contact
  // with the shipped data — bucket sizes of three, shared names across decades,
  // and all of it.
  const pool = (team, decade) => g.draft.getPlayers(team, decade);
  const { state, events } = playDraft(freshMatch(), pool);

  assert.equal(state.status, 'complete');
  const ids   = [...state.usedPlayerIds];
  const names = [...state.usedPlayerNames];
  assert.equal(new Set(ids).size, ids.length, 'nobody was drafted twice');
  assert.equal(new Set(names).size, names.length, 'and no cross-era twin slipped through');

  for (const seat of ['host', 'guest']) {
    const five = startersFor(state, seat);
    assert.equal(five.length, 5);
    for (const p of five) {
      assert.ok(p.id && p.name, 'a drafted card carries a real player');
      assert.ok(TEAMS.includes(p.team) && DECADES.includes(p.decade),
        'and the landing it came from, for the roster card');
    }
  }
  assert.deepEqual(replay(freshMatch(), events, pool), state);
});

test('rosters drafted through the core simulate a real series', () => {
  // The point of the whole exercise: what comes out the far end has to be
  // something simulateHeadToHeadSeries accepts unchanged.
  const pool = (team, decade) => g.draft.getPlayers(team, decade);
  const { state } = playDraft(freshMatch(), pool);
  const series = g.sim.simulateHeadToHeadSeries(
    startersFor(state, 'host'), null, startersFor(state, 'guest'), null);

  assert.ok(['p1', 'p2'].includes(series.winner));
  assert.equal(Math.max(series.p1Wins, series.p2Wins), 4, 'best of seven');
  assert.ok(series.games.length >= 4 && series.games.length <= 7);
});
