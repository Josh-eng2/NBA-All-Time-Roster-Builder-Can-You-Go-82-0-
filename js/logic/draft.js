/**
 * js/logic/draft.js — Draft Pool & Duplicate Prevention
 */
import { S, ALL_POSITIONS, TEAMS, DECADES, pick } from '../logic/state.js';
import { DB }                                     from '../data/players.js';

/** True once all 8 roster slots are filled. */
export function rosterFull() {
  return ALL_POSITIONS.every(p => S.roster[p] !== null);
}

/** Decades still eligible for drafting in the current game. */
export function availableDecades() {
  if (S.selectedEra && S.selectedEra !== 'all') return [S.selectedEra];
  const remaining = DECADES.filter(d => !S.usedDecades.includes(d));
  return remaining.length > 0 ? remaining : DECADES.slice();
}

/** All players from a given team/decade slot. */
export function getPlayers(team, decade) {
  return ((DB || {})[`${team}_${decade}`] || []).slice();
}

/** Players from a slot that haven't been drafted yet. */
export function getAvailablePlayers(team, decade) {
  return getPlayers(team, decade).filter(p =>
    !S.usedPlayerIds.includes(p.id) &&
    !(S.draftedPlayerNames?.has(p.name)) &&
    !(S.takenPlayerIds?.has(p.id))
  );
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
