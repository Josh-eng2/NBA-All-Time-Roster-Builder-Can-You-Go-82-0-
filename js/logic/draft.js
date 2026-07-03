/**
 * js/logic/draft.js — Draft Pool & Duplicate Prevention
 */
import { S, ALL_POSITIONS, TEAMS, DECADES, pick } from '../logic/state.js';
import { DB }                                     from '../data/players.js';

/** True once all slots are filled for the active context. */
export function rosterFull() {
  if (S.mode === '1v1') return false; // 1v1 auto-triggers on last pick — never show simulate card
  return ALL_POSITIONS.every(p => S.roster[p] !== null);
}

/** Decades still eligible for drafting in the current game. */
export function availableDecades() {
  const era = S.mode === '1v1'
    ? (S.currentPlayer === 1 ? (S.p1Era || 'all') : (S.p2Era || 'all'))
    : (S.selectedEra || 'all');
  if (era !== 'all') return [era];
  const remaining = DECADES.filter(d => !S.usedDecades.includes(d));
  return remaining.length > 0 ? remaining : DECADES.slice();
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
    !(S.draftedPlayerNames?.has(p.name)) &&
    !(S.takenPlayerIds?.has(p.id))
  );
}

// ── Player tiers ──────────────────────────────────────────────────────────────
// Mirrors the popularity brackets already used by salary.js so the whole
// engine speaks one tier language.
const TIER_RANK = { starter: 0, star: 1, goat: 2 };

/** Quality tier derived from the engine's popularity scale. */
export function playerTier(p) {
  const pop = p.popularity ?? 50;
  if (pop >= 95) return 'goat';
  if (pop >= 85) return 'star';
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
  const teams   = fixedTeam   ? [fixedTeam]   : TEAMS;

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
  const teams   = fixedTeam   ? [fixedTeam]   : TEAMS;

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
    for (const t of TEAMS) {
      if (getAvailablePlayers(t, d).length > 0) fallback.push({ team: t, decade: d });
    }
  }
  return fallback.length ? pick(fallback) : null;
}
