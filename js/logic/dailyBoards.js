import { DB } from '../data/players.js';
import { TEAMS, DECADES, POSITIONS } from './state.js';
import { checkPickLegal, getLockedPlayer } from './challenge.js';

// Bumped with the objective-feasibility guard in getDailyBoards below: the
// boards a date deals are derived from this string, so a change to what makes
// a board set acceptable has to change the string too, or old and new clients
// would disagree about the day's board while sharing one leaderboard.
export const DAILY_RULES_VERSION = 'boards-v3';
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
/** Does `player` fill `slot` naturally or as a secondary position? */
function fitsSlot(player, slot) {
  return player.pos === slot || (player.secondaryPos || []).includes(slot);
}

/** Can these five cover PG–C at once? (Tiny bipartite matching.) */
function coversLineup(players) {
  if (players.length !== POSITIONS.length) return false;
  const match = {};
  const assign = (i, seen) => {
    for (const slot of POSITIONS) {
      if (seen.has(slot) || !fitsSlot(players[i], slot)) continue;
      seen.add(slot);
      if (match[slot] === undefined || assign(match[slot], seen)) { match[slot] = i; return true; }
    }
    return false;
  };
  for (let i = 0; i < players.length; i++) if (!assign(i, new Set())) return false;
  return true;
}

/**
 * Best value of a per-game stat the day's boards can actually produce.
 *
 * `sum: true`  → the five-man total (Swat Team's combined blocks)
 * `sum: false` → the best single starter (Bucket Getter's 30 PPG scorer)
 *
 * Only the top few per board are considered: an optimum on an additive stat
 * never needs a player some other board can beat outright at the same slot,
 * and the cap keeps this to a few thousand cheap comparisons.
 */
const OBJECTIVE_FANOUT = 5;
function bestStat(boards, challenge, locked, stat, sum) {
  const pre = locked ? [locked] : [];
  const preIds = new Set(pre.map(personId));
  const preTotal = pre.reduce((s, p) => s + (p[stat] || 0), 0);
  // Legality depends on the picks so far only through the fans budget, so each
  // board's pool is built once instead of once per branch of the walk below.
  // No challenge in the catalog carries both a budget and a stat objective;
  // should one ever be added, the budget is re-checked on the finished five
  // rather than trusted from this pass.
  const budget = challenge?.params?.maxPopTotal ?? null;
  const pools = boards.map(board => (DB?.[`${board.team}_${board.decade}`] || [])
    .map(p => ({ ...p, ...board }))
    .filter(p => !preIds.has(personId(p))
      && checkPickLegal(challenge, p, pre, { remainingFloor: 0 }).legal)
    .sort((a, b) => (b[stat] || 0) - (a[stat] || 0))
    .slice(0, OBJECTIVE_FANOUT));

  const taken = new Set(preIds);
  const chosen = [];
  let best = 0;
  const visit = (i, acc) => {
    if (i === pools.length) {
      const five = [...pre, ...chosen];
      if (!coversLineup(five)) return;
      if (budget != null && five.reduce((s2, p) => s2 + (p.popularity ?? 50), 0) >= budget) return;
      best = Math.max(best, sum ? acc + preTotal : acc);
      return;
    }
    for (const p of pools[i]) {
      const id = personId(p);
      if (taken.has(id)) continue;
      taken.add(id); chosen.push(p);
      visit(i + 1, sum ? acc + (p[stat] || 0) : Math.max(acc, p[stat] || 0));
      chosen.pop(); taken.delete(id);
    }
  };
  visit(0, 0);
  return best;
}

/**
 * How comfortably the day's stated objective can be met on these boards, as a
 * fraction of what it asks for (1 = exactly reachable). 1 for a challenge with
 * no stat objective — those are decided by the season, not by the draft pool.
 *
 * The win floor is deliberately NOT modelled: losing a 60-win target to a bad
 * simulation roll is the game. Being dealt five boards on which no combination
 * of legal picks can reach 8 blocks a game, and losing the day's one attempt
 * to arithmetic, is not — and that is what the Swat Team and Bucket Getter
 * challenges were doing on most of the days they came up.
 */
function objectiveHeadroom(boards, challenge, locked) {
  const P = challenge?.params || {};
  let worst = Infinity;
  if (P.teamBpg != null) worst = Math.min(worst, bestStat(boards, challenge, locked, 'bpg', true) / P.teamBpg);
  if (P.starterPpg != null) worst = Math.min(worst, bestStat(boards, challenge, locked, 'ppg', false) / P.starterPpg);
  return Number.isFinite(worst) ? worst : 1;
}

export function getDailyBoards(date, challenge) {
  let seed = 2166136261;
  for (const c of `${DAILY_RULES_VERSION}:${date}:${challenge.id}`) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619);
  const random = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const params = challenge.params || {};
  const locked = getLockedPlayer(challenge);
  const count = locked ? 4 : 5;
  const pool = params.era ? [params.era] : (params.allowedDecades || DECADES);
  // Best draftable board set seen so far, for challenges whose objective no
  // attempt can reach. A softer outcome than the throw below on purpose: a
  // hard-but-drafted day beats no Daily at all, and this can only ever return
  // a board set the original loop would already have accepted.
  let fallback = null;
  let fallbackHeadroom = -1;
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
    if (!Number.isFinite(minimum) || minimum + (locked?.popularity || 0) > (params.maxPopTotal ?? Infinity)) continue;
    const headroom = objectiveHeadroom(boards, challenge, locked);
    if (headroom >= 1) return boards;
    if (headroom > fallbackHeadroom) { fallbackHeadroom = headroom; fallback = boards; }
  }
  if (fallback) return fallback;
  throw new Error('Daily board catalog cannot produce a complete legal draft');
}
