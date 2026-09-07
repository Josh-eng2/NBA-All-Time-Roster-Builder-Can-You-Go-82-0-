/**
 * js/logic/match.js — Online 1v1 match core (transport-independent)
 *
 * The model behind a live snake draft played by two people on two devices.
 * Everything here is pure: no Firebase, no sockets, no DOM, no `S`. State is
 * plain JSON — arrays rather than Sets — so it round-trips through a database
 * document or a WebSocket frame without a serializer.
 *
 * WHY THIS IS A SEPARATE MODULE
 * ─────────────────────────────
 * A live shared draft needs shared mutable state with a referee, and where
 * that referee runs (a Firestore document both clients write to, or a server
 * that owns the match) is a deployment decision, not a game-rules decision.
 * The rules are identical either way: the snake order, the shared player pool,
 * which spins are legal, which picks are legal. Keeping them here means that
 * decision stays reversible, and means the rules can be tested exhaustively
 * without standing anything up.
 *
 * THE DIVISION OF LABOUR
 * ──────────────────────
 * This module validates the GAME: is this a legal move, given the state.
 * The transport validates AUTHORSHIP: is this client allowed to submit a move
 * for this seat. The two are deliberately not mixed — Firestore rules and a
 * server socket answer the authorship question in completely different ways,
 * and neither can express the game rules.
 *
 * Consequently `applyEvent` will happily apply an event whose `by` is the seat
 * on the clock no matter who transmitted it. That is what makes the AI
 * takeover (§8.4 of docs/growth/online-1v1.md) work without a second code
 * path: when one player drops, the other's client submits the absent seat's
 * picks, and as far as the model is concerned the draft simply continued.
 *
 * THE STATE IS A FUNCTION OF THE LOG
 * ──────────────────────────────────
 * Nothing here mutates. `applyEvent` returns a new state, so
 * `replay(createMatch(...), events)` reconstructs a draft exactly — which is
 * what a client does after a refresh, a reconnect, or a late join.
 *
 * THE PLAYER DATABASE IS INJECTED
 * ───────────────────────────────
 * Functions that need to know who is draftable take a `pool` argument:
 * `(team, decade) => Array<{id, name}>`. The real one is a thin wrapper over
 * `getPlayers()` in logic/draft.js; the tests pass a small fixed one. This
 * keeps the module free of the 280KB player DB and makes the rule tests
 * independent of whatever the data happens to contain this month.
 */

import { TEAMS, DECADES, POSITIONS, SNAKE_ORDER, TOTAL_ROUNDS } from './state.js';

/** Wire version. Bump when the event or state shape changes incompatibly. */
export const MATCH_V = 1;

/**
 * Match-code alphabet: A–Z and 2–9 minus the characters that are misread when
 * one player reads a code aloud to another or types it off a screenshot —
 * `0/O`, `1/I/L`. 31 symbols over 6 characters is ~887M codes, which is far
 * more than enough for a collision to be a non-event given codes are also
 * short-lived and creation fails outright on a duplicate.
 */
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const CODE_LEN = 6;

/** The two seats. `host` created the match; `guest` joined via the link. */
export const SEATS = ['host', 'guest'];

/** Seat that owns pick N, from the shared snake order (1-2-2-1-1-2-2-1-1-2). */
const SEAT_BY_PICK = SNAKE_ORDER.map(n => (n === 1 ? 'host' : 'guest'));

const emptyRoster = () => POSITIONS.reduce((r, p) => ((r[p] = null), r), {});

// ── Codes ─────────────────────────────────────────────────────────────────────

/**
 * @param {() => number} [rand] injectable for deterministic tests
 * @returns {string} a fresh match code
 */
export function generateMatchCode(rand = Math.random) {
  let out = '';
  for (let i = 0; i < CODE_LEN; i++) {
    out += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  }
  return out;
}

/** True for a well-formed code. Case-insensitive: players type these by hand. */
export function isValidMatchCode(code) {
  if (typeof code !== 'string') return false;
  const c = code.trim().toUpperCase();
  if (c.length !== CODE_LEN) return false;
  return [...c].every(ch => CODE_ALPHABET.includes(ch));
}

/** Normalises user-typed input to the canonical form, or null if unusable. */
export function normaliseMatchCode(code) {
  return isValidMatchCode(code) ? code.trim().toUpperCase() : null;
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

/**
 * A new match, waiting for an opponent.
 *
 * `era` is shared by both seats, exactly as local 1v1 shares one era
 * (`setEra` writes p1Era and p2Era together). Coaches are deliberately absent
 * — local 1v1 has none, and v1 matches it (§8.5).
 *
 * @param {{ code: string, era?: string, hostName?: string }} opts
 */
export function createMatch({ code, era = 'all', hostName = 'Host' } = {}) {
  const c = normaliseMatchCode(code);
  if (!c) throw new Error(`invalid match code: ${code}`);
  if (era !== 'all' && !DECADES.includes(era)) throw new Error(`unknown era: ${era}`);
  return {
    v:       MATCH_V,
    code:    c,
    era,
    status:  'waiting',
    seq:     0,
    aiFrom:  null,
    seats:   { host: { name: String(hostName).slice(0, 24) }, guest: null },
    rosters: { host: emptyRoster(), guest: emptyRoster() },
    rounds:  { host: 0, guest: 0 },
    // Per-seat skip budgets, matching local 1v1's `p1TeamSkips` / `p1DecadeSkips`.
    skips:   { host: { team: 1, era: 1 }, guest: { team: 1, era: 1 } },
    // Shared across both seats — this is a shared-pool draft, so a player
    // taken by one is gone for both. Names as well as ids, because the same
    // player appears in the DB under several ids across decades and drafting
    // one must remove his cross-era twins (see draft.js getAvailablePlayers).
    usedPlayerIds:   [],
    usedPlayerNames: [],
    usedDecades:     [],
    currentSpin:     null,
    draftLog:        [],
  };
}

/** Seats the second player and opens the draft. */
export function joinMatch(state, { guestName = 'Guest' } = {}) {
  if (state.status !== 'waiting') throw new Error(`cannot join a ${state.status} match`);
  return {
    ...state,
    status: 'drafting',
    seats: { ...state.seats, guest: { name: String(guestName).slice(0, 24) } },
  };
}

// ── Derived state ─────────────────────────────────────────────────────────────

/** Picks made so far, across both seats. */
export function pickCount(state) {
  return state.rounds.host + state.rounds.guest;
}

/**
 * Seat on the clock. Derived from the pick count rather than stored, so the
 * two clients cannot hold different opinions about whose turn it is — the
 * single most valuable property of deriving instead of syncing.
 */
export function seatOnClock(state) {
  return SEAT_BY_PICK[pickCount(state)] ?? null;
}

export function isDraftComplete(state) {
  return pickCount(state) >= SNAKE_ORDER.length;
}

/** The other seat. */
export const otherSeat = seat => (seat === 'host' ? 'guest' : 'host');

/**
 * Decades the wheel may still land on.
 *
 * Mirrors `availableDecades()` in logic/draft.js, including its fallback: once
 * every decade has been used the whole pool comes back rather than the wheel
 * running out of legal landings. In a ten-pick shared draft that fallback is
 * reached in normal play — there are seven decades and ten picks — so it is
 * load-bearing here, not an edge case.
 */
export function availableDecades(state) {
  if (state.era !== 'all') return [state.era];
  const remaining = DECADES.filter(d => !state.usedDecades.includes(d));
  return remaining.length ? remaining : DECADES.slice();
}

/**
 * Players from one team/decade bucket that nobody has taken yet.
 * @param {(team: string, decade: string) => Array<{id: string, name: string}>} pool
 */
export function availableIn(state, team, decade, pool) {
  return (pool(team, decade) || []).filter(p =>
    !state.usedPlayerIds.includes(p.id) && !state.usedPlayerNames.includes(p.name));
}

/** Starters in POSITIONS order, ready for simulateHeadToHeadSeries. */
export function startersFor(state, seat) {
  return POSITIONS.map(p => state.rosters[seat][p]).filter(Boolean);
}

// ── Event validation ──────────────────────────────────────────────────────────

const fail = reason => ({ ok: false, reason });
const OK = { ok: true };

/**
 * Is this event legal against this state?
 *
 * Returns a structured result rather than throwing, so a transport can reject
 * a bad frame without a try/catch and a UI can explain the refusal. The reason
 * strings are diagnostic, not player-facing copy.
 *
 * @param {object} state
 * @param {object} event
 * @param {(team: string, decade: string) => Array} pool
 */
export function validateEvent(state, event, pool) {
  if (!event || typeof event !== 'object') return fail('event is not an object');
  if (state.status !== 'drafting' && state.status !== 'ai-takeover') {
    return fail(`match is ${state.status}`);
  }
  if (event.seq !== state.seq) return fail(`expected seq ${state.seq}, got ${event.seq}`);

  // Takeover is about who is *driving* a seat, not about whose turn it is, so
  // it is checked before the on-the-clock rule below.
  if (event.t === 'takeover') {
    if (state.status === 'ai-takeover') return fail('already taken over');
    if (!SEATS.includes(event.by)) return fail(`unknown seat: ${event.by}`);
    return OK;
  }

  const onClock = seatOnClock(state);
  if (!onClock) return fail('draft is over');
  if (event.by !== onClock) return fail(`${event.by} played out of turn (${onClock} is on the clock)`);

  switch (event.t) {
    case 'spin':      return validateSpin(state, event, pool);
    case 'skip-team': return validateSkip(state, event, pool, 'team');
    case 'skip-era':  return validateSkip(state, event, pool, 'era');
    case 'pick':      return validatePick(state, event, pool);
    default:          return fail(`unknown event type: ${event.t}`);
  }
}

/** A landing is legal when it is on the board and still has someone to draft. */
function validateLanding(state, team, decade, pool) {
  if (!TEAMS.includes(team)) return fail(`unknown team: ${team}`);
  if (!availableDecades(state).includes(decade)) return fail(`decade not available: ${decade}`);
  if (!availableIn(state, team, decade, pool).length) return fail(`no players left in ${team} ${decade}`);
  return OK;
}

function validateSpin(state, event, pool) {
  if (state.currentSpin) return fail('a spin is already on the board this turn');
  return validateLanding(state, event.team, event.decade, pool);
}

/**
 * Skips re-roll one axis and hold the other, matching skipTeamPool /
 * skipDecadePool in logic/draft.js: skipping the team keeps the decade, and
 * skipping the era keeps the franchise. Holding the other axis is what stops a
 * skip quietly swapping the whole board mid-animation.
 */
function validateSkip(state, event, pool, axis) {
  const spin = state.currentSpin;
  if (!spin) return fail('nothing to skip — no spin on the board');
  if ((state.skips[event.by]?.[axis] ?? 0) <= 0) return fail(`${event.by} has no ${axis} skips left`);

  if (axis === 'team') {
    if (event.decade !== spin.decade) return fail('a team skip must keep the decade');
    if (event.team === spin.team)     return fail('a team skip must change the team');
  } else {
    if (event.team !== spin.team)       return fail('an era skip must keep the team');
    if (event.decade === spin.decade)   return fail('an era skip must change the decade');
  }
  return validateLanding(state, event.team, event.decade, pool);
}

/**
 * A pick is legal when the player is on the current board, nobody has taken
 * him, and the slot is empty. Note there is no position rule: any player may
 * fill any empty slot, exactly as the live game allows (`canPlace` in
 * render.js is `isActive && !!selectedPlayer`), because chemistry.js
 * re-optimises the lineup at simulation time regardless of where cards were
 * dropped.
 */
function validatePick(state, event, pool) {
  const spin = state.currentSpin;
  if (!spin) return fail('cannot pick before spinning');
  if (!POSITIONS.includes(event.pos)) return fail(`unknown slot: ${event.pos}`);
  if (state.rosters[event.by][event.pos]) return fail(`${event.by}'s ${event.pos} is already filled`);

  const player = availableIn(state, spin.team, spin.decade, pool).find(p => p.id === event.id);
  if (!player) return fail(`${event.id} is not draftable from ${spin.team} ${spin.decade}`);
  return OK;
}

// ── Reducer ───────────────────────────────────────────────────────────────────

/**
 * Applies one event, returning a NEW state. Throws on an illegal event —
 * callers that cannot tolerate that should ask `validateEvent` first. The
 * throw is deliberate: an invalid event reaching this point means the log is
 * corrupt or the transport let something through, and silently ignoring it
 * would desync the two clients rather than fail loudly.
 */
export function applyEvent(state, event, pool) {
  const check = validateEvent(state, event, pool);
  if (!check.ok) throw new Error(`illegal event at seq ${event?.seq}: ${check.reason}`);

  const next = {
    ...state,
    seq:             state.seq + 1,
    rosters:         { host: { ...state.rosters.host }, guest: { ...state.rosters.guest } },
    rounds:          { ...state.rounds },
    skips:           { host: { ...state.skips.host }, guest: { ...state.skips.guest } },
    usedPlayerIds:   state.usedPlayerIds.slice(),
    usedPlayerNames: state.usedPlayerNames.slice(),
    usedDecades:     state.usedDecades.slice(),
    draftLog:        state.draftLog.slice(),
  };

  switch (event.t) {
    case 'takeover':
      next.status = 'ai-takeover';
      next.aiFrom = pickCount(state) + 1;
      return next;

    case 'spin':
    case 'skip-team':
    case 'skip-era':
      if (event.t === 'skip-team') next.skips[event.by].team -= 1;
      if (event.t === 'skip-era')  next.skips[event.by].era  -= 1;
      next.currentSpin = { team: event.team, decade: event.decade };
      return next;

    case 'pick': {
      const spin   = state.currentSpin;
      const player = availableIn(state, spin.team, spin.decade, pool).find(p => p.id === event.id);
      // Stamp the landing onto the stored player the way the live draft does,
      // so a roster card knows which team/era it was drafted from.
      const drafted = { ...player, team: spin.team, decade: spin.decade };

      next.rosters[event.by][event.pos] = drafted;
      next.rounds[event.by] += 1;
      next.usedPlayerIds.push(player.id);
      next.usedPlayerNames.push(player.name);
      next.usedDecades.push(spin.decade);
      next.draftLog.push({
        name: player.name, seat: event.by, pos: event.pos,
        pick: pickCount(state) + 1, ai: !!event.ai,
      });
      next.currentSpin = null;
      // A fresh turn restores the full skip budget to nobody — budgets are
      // per-seat for the whole draft, not per-turn, matching local 1v1.
      if (isDraftComplete(next)) next.status = 'complete';
      return next;
    }

    default:
      throw new Error(`unreachable: ${event.t}`);
  }
}

/** Rebuilds a match from its log — what a client does after a refresh. */
export function replay(state, events, pool) {
  return (events || []).reduce((s, e) => applyEvent(s, e, pool), state);
}

/** Convenience: the number of picks a seat still owes. */
export function picksRemaining(state, seat) {
  return TOTAL_ROUNDS - state.rounds[seat];
}
