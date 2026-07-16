/**
 * js/logic/dynastyDuel.js — Dynasty Duel (random legendary opponent each play).
 */

import { CPU_TEAMS } from './state.js';

/** Curated rotation — references CPU_TEAMS by name. */
const DYNASTY_ROTATION = [
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
 * Pick a Dynasty Duel opponent for this play.
 * Random from the rotation; avoids `excludeName` when possible (e.g. last run).
 *
 * @param {{ excludeName?: string|null }} [opts]
 * @returns {{ weekKey: string, name: string, strength: number, prevName: string|null }}
 */
export function pickDynastyForPlay(opts = {}) {
  const weekKey = weekKeyUTC();
  const exclude = opts.excludeName || null;
  let pool = DYNASTY_ROTATION.filter(n => n !== exclude);
  if (!pool.length) pool = DYNASTY_ROTATION.slice();

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

/** Leaderboard score for a Dynasty Duel run. */
export function dynastyDuelScore(seriesWins, won, playerStrength) {
  return (seriesWins ?? 0) * 100 + (won ? 500 : 0) + Math.floor((playerStrength ?? 0) * 10);
}
