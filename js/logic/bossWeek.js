/**
 * js/logic/bossWeek.js — Boss of the Week rotation (UTC Monday boundary).
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

function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
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

function findCpu(name) {
  return CPU_TEAMS.find(t => t.name === name) || CPU_TEAMS[0];
}

/**
 * @param {string} [dateStr] YYYY-MM-DD
 * @returns {{ weekKey: string, name: string, strength: number, prevName: string|null }}
 */
export function getBossOfWeek(dateStr) {
  const weekKey = weekKeyUTC(dateStr);
  const idx = hashStr(weekKey) % BOSS_ROTATION.length;

  // Avoid repeating last week's boss when possible.
  const prevKey = (() => {
    const d = new Date(weekKey + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - 7);
    return d.toISOString().slice(0, 10);
  })();
  const prevIdx = hashStr(prevKey) % BOSS_ROTATION.length;
  let useIdx = idx;
  if (idx === prevIdx && BOSS_ROTATION.length > 1) {
    useIdx = (idx + 1) % BOSS_ROTATION.length;
  }

  const name = BOSS_ROTATION[useIdx];
  const cpu = findCpu(name);
  return {
    weekKey,
    name: cpu.name,
    strength: cpu.strength,
    prevName: BOSS_ROTATION[prevIdx] || null,
  };
}

/** Leaderboard score for a Boss of the Week run. */
export function bossWeekScore(seriesWins, won, playerStrength) {
  return (seriesWins ?? 0) * 100 + (won ? 500 : 0) + Math.floor((playerStrength ?? 0) * 10);
}
