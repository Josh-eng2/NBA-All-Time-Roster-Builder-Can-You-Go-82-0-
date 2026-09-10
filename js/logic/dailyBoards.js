import { DB } from '../data/players.js';
import { TEAMS, DECADES } from './state.js';
import { checkPickLegal, getLockedPlayer } from './challenge.js';

export const DAILY_RULES_VERSION = 'boards-v2';
// Curated identity aliases: display names remain untouched.
export function personId(player) {
  const name = typeof player === 'string' ? player : player?.name;
  return name === 'Nenê' || name === 'Nene' ? 'nene-hilario' : String(name || '');
}
export function minimumCompletion(boards, taken = [], challenge = null) {
  const names = new Set(taken.map(personId));
  let best = Infinity;
  const visit = (i, total) => {
    if (total >= best) return;
    if (i === boards.length) { best = total; return; }
    const board = boards[i];
    const candidates = (DB?.[`${board.team}_${board.decade}`] || [])
      .filter(p => !names.has(personId(p)) && checkPickLegal(challenge, { ...p, ...board }, [], { remainingFloor: 0 }).legal)
      .slice().sort((a, b) => (a.popularity ?? 50) - (b.popularity ?? 50));
    for (const p of candidates) {
      names.add(personId(p)); visit(i + 1, total + (p.popularity ?? 50)); names.delete(personId(p));
    }
  };
  visit(0, 0); return best;
}
export function getDailyBoards(date, challenge) {
  let seed = 2166136261;
  for (const c of `${DAILY_RULES_VERSION}:${date}:${challenge.id}`) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619);
  const random = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const params = challenge.params || {};
  const locked = getLockedPlayer(challenge);
  const count = locked ? 4 : 5;
  const pool = params.era ? [params.era] : (params.allowedDecades || DECADES);
  for (let attempt = 0; attempt < 128; attempt++) {
    let used = locked?.decade ? [locked.decade] : [];
    const boards = [];
    for (let i = 0; i < count; i++) {
      let decades = pool.filter(d => !used.includes(d));
      if (!decades.length) { decades = pool; used = []; }
      const candidates = [];
      for (const decade of decades) for (const team of TEAMS) {
        if (params.excludeTeams?.includes(team)) continue;
        const players = DB?.[`${team}_${decade}`] || [];
        if (new Set(players.map(personId)).size < 5) continue;
        if (params.maxPopTotal != null && !players.some(p => (p.popularity ?? 50) <= params.maxPopTotal / 5)) continue;
        candidates.push({ team, decade });
      }
      if (!candidates.length) break;
      const board = candidates[Math.floor(random() * candidates.length)];
      boards.push(board); used.push(board.decade);
    }
    const minimum = boards.length === count ? minimumCompletion(boards, locked ? [locked] : [], challenge) : Infinity;
    if (Number.isFinite(minimum) && minimum + (locked?.popularity || 0) <= (params.maxPopTotal ?? Infinity)) return boards;
  }
  throw new Error('Daily board catalog cannot produce a complete legal draft');
}
