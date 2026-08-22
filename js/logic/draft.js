/**
 * js/logic/draft.js — Draft Pool & Duplicate Prevention
 */
import { S, ALL_POSITIONS, TEAMS, DECADES, pick } from '../logic/state.js';
import { DB }                                     from '../data/players.js';
import { isDualDraft, getModeConfig }             from '../logic/modes.js';
import { checkPickLegal }                         from '../logic/challenge.js';

/** True once all slots are filled for the active context. */
export function rosterFull() {
  if (isDualDraft()) return false; // dual draft auto-triggers on last pick — never show simulate card
  return ALL_POSITIONS.every(p => S.roster[p] !== null);
}

/** Decades still eligible for drafting in the current game. */
export function availableDecades() {
  const era = isDualDraft()
    ? (S.currentPlayer === 1 ? (S.p1Era || 'all') : (S.p2Era || 'all'))
    : (S.selectedEra || 'all');
  if (era !== 'all') return [era];
  // Daily challenges with a multi-decade window (e.g. "pre-1990 only") narrow
  // the spin pool without locking to a single era.
  const window    = S.dailyChallenge?.params?.allowedDecades ?? null;
  const pool      = window ? DECADES.filter(d => window.includes(d)) : DECADES;
  const remaining = pool.filter(d => !S.usedDecades.includes(d));
  return remaining.length > 0 ? remaining : pool.slice();
}

/**
 * Teams eligible for the current spin. A Daily Challenge that bans
 * franchises outright (e.g. Flyover Hoops: no Lakers/Celtics) removes them
 * from the spin pool entirely — otherwise the seeded wheel can land on a
 * board where every player is off-limits and the round is a dead spin.
 * Same filter for everyone, so the shared deterministic sequence holds.
 */
export function eligibleTeams() {
  const banned = S.mode === 'daily' ? S.dailyChallenge?.params?.excludeTeams : null;
  return banned?.length ? TEAMS.filter(t => !banned.includes(t)) : TEAMS;
}

/**
 * Teams a "Skip Team" re-roll may land on: eligible for the current mode,
 * still stocked for this drafter, and never the team already on the wheel.
 *
 * Lives here rather than in the click handler because it is a draft-pool rule:
 * built from raw TEAMS it ignored a challenge's banned franchises and could
 * hand a skip a board where every player is off-limits.
 *
 * @param {{team: string, decade: string}|null} currentSpin
 * @returns {string[]}
 */
export function skipTeamPool(currentSpin) {
  if (!currentSpin) return [];
  return eligibleTeams().filter(t =>
    t !== currentSpin.team && getAvailablePlayers(t, currentSpin.decade).length > 0
  );
}

/**
 * Decades a "Skip Era" re-roll may land on. Keeps the team fixed — only eras
 * where THIS franchise still has players qualify, so a skip can never
 * silently swap the franchise mid-animation.
 *
 * @param {{team: string, decade: string}|null} currentSpin
 * @returns {string[]}
 */
export function skipDecadePool(currentSpin) {
  if (!currentSpin) return [];
  return availableDecades().filter(d =>
    d !== currentSpin.decade && getAvailablePlayers(currentSpin.team, d).length > 0
  );
}

/** All players from a given team/decade slot. */
export function getPlayers(team, decade) {
  return ((DB || {})[`${team}_${decade}`] || []).slice();
}

// ── Legends catalog ─────────────────────────────────────────────────────────
// The full collectible universe for the Legends collection, keyed by player id
// and grouped by decade. Memoized — DB is immutable after startup.
let _catalogCache = null;

/**
 * @returns {{
 *   decades: string[],
 *   byDecade: Record<string, object[]>,   // decade → player objects (distinct ids, popularity-desc)
 *   idToDecade: Record<string, string>,
 *   total: number                         // distinct-id count across the whole DB
 * }}
 */
export function getLegendCatalog() {
  if (_catalogCache) return _catalogCache;
  const byDecade   = {};
  const idToDecade = {};
  const seen       = new Set();
  for (const [key, players] of Object.entries(DB || {})) {
    const decade = key.split('_')[1];
    (byDecade[decade] ||= []);
    for (const p of players) {
      if (seen.has(p.id)) continue; // collapse the handful of shared ids
      seen.add(p.id);
      byDecade[decade].push(p);
      idToDecade[p.id] = decade;
    }
  }
  for (const decade of Object.keys(byDecade)) {
    byDecade[decade].sort((a, b) => (b.popularity ?? 50) - (a.popularity ?? 50));
  }
  const decades = DECADES.filter(d => byDecade[d]?.length);
  _catalogCache = { decades, byDecade, idToDecade, total: seen.size };
  return _catalogCache;
}

/** Players from a slot that haven't been drafted yet. */
export function getAvailablePlayers(team, decade) {
  return getPlayers(team, decade).filter(p =>
    !S.usedPlayerIds.includes(p.id) &&
    !(S.draftedPlayerNames?.has(p.name))
  );
}

// ── Daily Challenge legality, evaluated against the live draft pool ──────────
// checkPickLegal() is a pure rules function and cannot see what is still
// draftable. For the fans-budget challenge that blind spot is the difference
// between a legal pick and a dead run, so the lookahead is computed here —
// this module is the one that knows what the wheel can still deal.

// The pool only changes when a player is drafted or the era selection changes,
// and renderDraftCard asks for this once per card on the board, so it is
// memoized on exactly those inputs.
let _floorCache = { key: null, byDecade: null };

/**
 * Still-draftable players grouped by decade, each group sorted cheapest first.
 * Names carried alongside the cost because the floor below has to pick
 * DISTINCT players — several of the cheapest in the database appear in two
 * decades (Karl Malone, popularity 0, is in both the 1980s and 1990s Jazz),
 * and drafting him once removes him from both.
 */
function draftableCosts(afterDecade) {
  const key = `${S.gameId}|${S.usedPlayerIds?.length ?? 0}|${S.selectedEra}|${S.usedDecades?.length ?? 0}`;
  if (_floorCache.key !== key) _floorCache = { key, byDecade: new Map() };
  const cacheKey = afterDecade ?? '';
  if (_floorCache.byDecade.has(cacheKey)) return _floorCache.byDecade.get(cacheKey);

  // Mirrors availableDecades()'s own reset: if excluding this pick's decade
  // would leave nothing, the pool is the full remaining set again.
  const remaining = availableDecades();
  const decades   = remaining.filter(d => d !== afterDecade);
  const pool      = decades.length ? decades : remaining;
  const teams     = eligibleTeams();

  const groups = [];
  const flat   = [];
  const seen   = new Set();
  for (const d of pool) {
    const byName = new Map();   // one entry per player, whatever team he is on
    for (const t of teams) {
      for (const p of getAvailablePlayers(t, d)) {
        const cost = p.popularity ?? 50;
        if (!byName.has(p.name) || cost < byName.get(p.name)) byName.set(p.name, cost);
        if (seen.has(p.name)) continue;
        seen.add(p.name);
        flat.push(cost);
      }
    }
    if (!byName.size) continue;
    groups.push([...byName].map(([name, cost]) => ({ name, cost }))
      .sort((a, b) => a.cost - b.cost));
  }
  flat.sort((a, b) => a - b);
  groups.sort((a, b) => a[0].cost - b[0].cost);
  const costs = { flat, groups };
  _floorCache.byDecade.set(cacheKey, costs);
  return costs;
}

/**
 * Cheapest total `slots` more roster spots could be filled for, drawing only
 * on players the wheel can still deal after a pick from `afterDecade`.
 *
 * Each remaining pick lands on a decade the run hasn't used yet (see
 * availableDecades), so this fills one slot per decade, cheapest decade first,
 * skipping anyone already counted. Two properties matter:
 *
 *   • it is ACHIEVABLE — distinct players in distinct decades — so it is never
 *     below what finishing the roster will actually cost, which is what stops
 *     a budget run being drafted into a dead end;
 *   • it is near-minimal, so it does not block picks that could still be
 *     completed.
 *
 * @param {number} slots
 * @param {string|null} afterDecade
 * @param {string|null} excludeName  the player being picked right now — he is
 *   still in the pool while his own pick is being judged, and counting him as
 *   a future slot is how a 0-popularity name in two decades let a run reach a
 *   state with no legal last pick.
 * @returns {number} Infinity when the remaining slots cannot be filled at all
 */
export function cheapestRemainingTotal(slots, afterDecade = null, excludeName = null) {
  if (slots <= 0) return 0;
  const { flat, groups } = draftableCosts(afterDecade);
  if (!flat.length) return Infinity; // nothing left to draft — never solvable

  const taken = new Set(excludeName ? [excludeName] : []);
  let total = 0;
  let filled = 0;
  for (const group of groups) {
    if (filled === slots) break;
    const next = group.find(p => !taken.has(p.name));
    if (!next) continue;
    taken.add(next.name);
    total += next.cost;
    filled++;
  }
  // More slots than decades left: availableDecades() resets once the decade
  // pool runs out, so the rest come from whatever is cheapest overall.
  for (let i = filled; i < slots; i++) total += flat[Math.min(i, flat.length - 1)];
  return total;
}

/**
 * Daily Challenge legality for a pick, judged against what is actually still
 * draftable. Use this everywhere a board card or a placement is validated;
 * checkPickLegal() alone cannot tell a legal pick from one that strands the
 * run with no legal fifth player anywhere.
 *
 * @param {object} challenge
 * @param {object} player   hydrated with team/decade, as placePlayer attaches them
 * @param {object[]} filled starters already on the roster
 * @returns {{ legal: boolean, reason: string|null }}
 */
export function isPickDraftable(challenge, player, filled = []) {
  // The lookahead only bears on the fans budget, and it walks the whole pool —
  // skip it entirely on the other fifteen challenges.
  if (challenge?.params?.maxPopTotal == null) {
    return checkPickLegal(challenge, player, filled);
  }
  const slots = Math.max(0, ALL_POSITIONS.length - filled.length - 1);
  return checkPickLegal(challenge, player, filled, {
    remainingFloor: cheapestRemainingTotal(slots, player?.decade ?? null, player?.name ?? null),
  });
}

// ── Skip budgets ──────────────────────────────────────────────────────────────
// Solo/HoopIQ use the shared teamSkips/decadeSkips counters; 1v1 gives each
// drafter their own budget so one player can't burn the other's skips.

/** Remaining skips for the active drafter: { team, decade }. */
export function getSkips() {
  if (isDualDraft()) {
    // AI never skips — hide skip UI on CPU turns
    if (S.mode === 'gm-ai' && S.currentPlayer === 2) return { team: 0, decade: 0 };
    return S.currentPlayer === 1
      ? { team: S.p1TeamSkips ?? 0, decade: S.p1DecadeSkips ?? 0 }
      : { team: S.p2TeamSkips ?? 0, decade: S.p2DecadeSkips ?? 0 };
  }
  const cfg = getModeConfig();
  return { team: S.teamSkips ?? cfg.skips, decade: S.decadeSkips ?? cfg.skips };
}

/** Consumes one skip of the given kind for the active drafter. */
export function useSkip(kind) {
  const field = kind === 'team' ? 'TeamSkips' : 'DecadeSkips';
  if (isDualDraft()) {
    const key = `p${S.currentPlayer}${field}`;
    S[key] = Math.max(0, (S[key] ?? 0) - 1);
  } else if (kind === 'team') {
    S.teamSkips = Math.max(0, (S.teamSkips ?? 0) - 1);
  } else {
    S.decadeSkips = Math.max(0, (S.decadeSkips ?? 0) - 1);
  }
}

// ── Player tiers ──────────────────────────────────────────────────────────────
// Quality tier keyed to `overall` (the era-adjusted real-2K rating). This is
// the on-court quality signal the draft steers toward when seeking stars/GOATs.
const TIER_RANK = { starter: 0, star: 1, goat: 2 };

/** Quality tier derived from the player's `overall` (era-adjusted 2K rating).
 * Cutoffs 92/97 are the old rating-scale 82/90 cutoffs' percentile
 * equivalents, keeping the star/goat pool sizes essentially unchanged
 * (~24% / ~8% of all entries). */
export function playerTier(p) {
  const overall = p.overall ?? 82;
  if (overall >= 97) return 'goat';
  if (overall >= 92) return 'star';
  return 'starter';
}

/**
 * Like spinResult, but only lands on (team, decade) combos whose available
 * players include at least one of the given tier or better.
 * Falls back to a normal spinResult when no combo qualifies.
 * @param {'star'|'goat'} tier
 */
export function spinResultAtLeast(tier, fixedTeam = null, fixedDecade = null) {
  const wantRank   = TIER_RANK[tier] ?? 0;
  const decadePool = availableDecades();
  if (!decadePool.length) return null;

  const decades = fixedDecade ? [fixedDecade] : decadePool;
  const teams   = fixedTeam   ? [fixedTeam]   : eligibleTeams();

  const valid = [];
  for (const d of decades) {
    for (const t of teams) {
      if (getAvailablePlayers(t, d).some(p => TIER_RANK[playerTier(p)] >= wantRank)) {
        valid.push({ team: t, decade: d });
      }
    }
  }
  return valid.length ? pick(valid) : spinResult(fixedTeam, fixedDecade);
}

/**
 * Pick a random (team, decade) combo that has available players.
 * Supports optional fixedTeam / fixedDecade constraints.
 * @param {string|null} fixedTeam
 * @param {string|null} fixedDecade
 * @returns {{ team: string, decade: string } | null}
 */
export function spinResult(fixedTeam = null, fixedDecade = null) {
  const decadePool = availableDecades();
  if (!decadePool.length) return null;

  const decades = fixedDecade ? [fixedDecade] : decadePool;
  const teams   = fixedTeam   ? [fixedTeam]   : eligibleTeams();

  const valid = [];
  for (const d of decades) {
    for (const t of teams) {
      if (getAvailablePlayers(t, d).length > 0) valid.push({ team: t, decade: d });
    }
  }
  if (valid.length) return pick(valid);

  // Constraint exhausted — fall back to any remaining combo
  const fallback = [];
  for (const d of decadePool) {
    for (const t of eligibleTeams()) {
      if (getAvailablePlayers(t, d).length > 0) fallback.push({ team: t, decade: d });
    }
  }
  return fallback.length ? pick(fallback) : null;
}
