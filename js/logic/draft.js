/**
 * js/logic/draft.js — Draft Pool & Duplicate Prevention
 */
import { S, ALL_POSITIONS, TEAMS, DECADES, pick } from '../logic/state.js';
import { DB }                                     from '../data/players.js';
import { isDualDraft, getModeConfig }             from '../logic/modes.js';

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
