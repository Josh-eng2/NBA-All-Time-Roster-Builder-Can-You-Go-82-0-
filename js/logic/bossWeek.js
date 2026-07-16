/**
 * js/logic/bossWeek.js — Boss of the Week (random opponent each play, unlimited runs).
 */

import { CPU_TEAMS } from './state.js';

/** Curated rotation — references CPU_TEAMS by name. */
const BOSS_ROTATION = [
  '96 Bulls',
  '17 Warriors',
  '86 Celtics',
  '87 Lakers',
  '01 Lakers',
  '13 Heat',
  '14 Spurs',
  '04 Pistons',
  '16 Cavaliers',
  '08 Celtics',
  '94 Rockets',
  '89 Pistons',
];

function findCpu(name) {
  return CPU_TEAMS.find(t => t.name === name) || CPU_TEAMS[0];
}

/** UTC Monday date string for the week containing `date` (Date or YYYY-MM-DD). */
export function weekKeyUTC(dateStr) {
  const d = dateStr
    ? new Date(dateStr + (String(dateStr).includes('T') ? '' : 'T12:00:00Z'))
    : new Date();
  const day = d.getUTCDay(); // 0 Sun … 1 Mon
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff));
  return monday.toISOString().slice(0, 10);
}

/**
 * Pick a Boss of the Week opponent for this play.
 * Random from the rotation; avoids `excludeName` when possible (e.g. last run).
 *
 * @param {{ excludeName?: string|null }} [opts]
 * @returns {{ weekKey: string, name: string, strength: number, prevName: string|null }}
 */
export function pickBossForPlay(opts = {}) {
  const weekKey = weekKeyUTC();
  const exclude = opts.excludeName || null;
  let pool = BOSS_ROTATION.filter(n => n !== exclude);
  if (!pool.length) pool = BOSS_ROTATION.slice();

  const useIdx = Math.floor(Math.random() * pool.length);
  const name = pool[useIdx];
  const cpu = findCpu(name);
  return {
    weekKey,
    name: cpu.name,
    strength: cpu.strength,
    prevName: exclude,
  };
}

/**
 * @deprecated Prefer pickBossForPlay() for new runs. Kept for callers that
 * only need a display fallback; still returns a stable weekly pick for
 * legacy/analytics weekKey alignment.
 * @param {string} [dateStr] YYYY-MM-DD
 */
export function getBossOfWeek(dateStr) {
  // Stable weekly fallback (not used for new plays) — same hash as before.
  let h = 2166136261;
  const weekKey = weekKeyUTC(dateStr);
  for (let i = 0; i < weekKey.length; i++) {
    h ^= weekKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = (h >>> 0) % BOSS_ROTATION.length;
  const name = BOSS_ROTATION[idx];
  const cpu = findCpu(name);
  return {
    weekKey,
    name: cpu.name,
    strength: cpu.strength,
    prevName: null,
  };
}

/** Leaderboard score for a Boss of the Week run. */
export function bossWeekScore(seriesWins, won, playerStrength) {
  return (seriesWins ?? 0) * 100 + (won ? 500 : 0) + Math.floor((playerStrength ?? 0) * 10);
}
