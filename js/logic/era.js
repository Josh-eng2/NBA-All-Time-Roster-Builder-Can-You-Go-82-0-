/**
 * js/logic/era.js — Pace-Based Era Normalization
 *
 * Counting stats (ppg/rpg/apg/spg/bpg) aren't era-neutral: league pace
 * (possessions per 48 min) has swung from ~125 in the run-and-gun 1960s down
 * to ~91 in the isolation-heavy 2000s and back up to ~99 today. A 1960s
 * center's 23 rpg reflects a league with ~30% more possessions to rebound,
 * not necessarily a more dominant rebounder than a 2000s center at 13 rpg.
 *
 * ERA_PACE holds approximate league-average possessions/48min per decade.
 * eraFactor() rescales a decade's raw stats to the 2020s pace baseline —
 * "what would this per-game rate look like at today's tempo?" — so the sim
 * engine compares eras on equal footing instead of rewarding whichever
 * decade happened to play the fastest.
 */

const ERA_PACE = {
  '1960s': 125.0,
  '1970s': 107.0,
  '1980s': 101.0,
  '1990s': 95.0,
  '2000s': 91.0,
  '2010s': 94.5,
  '2020s': 99.5,
};

const REFERENCE_PACE = ERA_PACE['2020s'];

/** Multiplier that rescales a decade's raw counting stats to modern pace. */
export function eraFactor(decade) {
  const pace = decade && ERA_PACE[decade];
  return pace ? REFERENCE_PACE / pace : 1;
}

/** A single stat (ppg/rpg/apg/spg/bpg), rescaled to modern pace. */
export function eraAdjustedStat(player, key) {
  return (player?.[key] || 0) * eraFactor(player?.decade);
}

const COUNTING_STATS = ['ppg', 'rpg', 'apg', 'spg', 'bpg'];

/** All five counting stats, rescaled to modern pace, as a fresh object. */
export function eraAdjustedLine(player) {
  const f = eraFactor(player?.decade);
  const line = {};
  for (const k of COUNTING_STATS) line[k] = (player?.[k] || 0) * f;
  return line;
}

/** Extracts the '1960s'-style decade suffix from a "Team_1960s" DB bucket key. */
export function decadeFromBucketKey(key) {
  return key.match(/_(\d{4}s)$/)?.[1] ?? null;
}
