/**
 * js/logic/challenge.js — Daily Challenge Engine
 *
 * Every calendar day (UTC) all players get the SAME challenge, selected
 * deterministically from CHALLENGES by hashing the date string. Only the
 * selection is seeded — the draft spins and season sim stay fully random,
 * so the day is a shared prompt, not a shared outcome.
 *
 * Challenge types:
 *   constraint — rules on who you may draft (era, rating cap, fans
 *                budget, excluded franchises). Enforced at pick time.
 *   objective  — a result target beyond the constraint's win floor
 *                (win total, a stat-leader line, the championship).
 *   locked     — a named star is pre-locked into their slot; draft the
 *                other four around them.
 *
 * Every challenge carries a `minWins` floor so pass/fail is always about
 * the season, never just "you finished the draft".
 *
 * Exports:
 *   todayUTC()                          → 'YYYY-MM-DD' (supports ?dailydate= dev override)
 *   getDailyChallenge(dateStr?)         → catalog entry for the day
 *   checkPickLegal(ch, player, S)      → { legal, reason } at draft time
 *   checkRosterConstraint(ch, starters) → { pass, detail } live/final roster check
 *   evaluateObjective(ch, S)            → { pass, pending, detail } post-sim
 *   dailyScore(ch, S)                   → leaderboard score for the run
 *   getLockedPlayer(ch)                 → hydrated player object or null
 */

import { DB }                  from '../data/players.js';
import { decadeFromBucketKey } from './era.js';

// Cheapest player popularity in the DB — used to prove a budget pick can
// still be completed with the remaining slots.
const MIN_POPULARITY = 35;

// ── Catalog ───────────────────────────────────────────────────────────────────
// NOTE on `era` vs `allowedDecades`: `era` locks the header picker to one
// decade (spins only land there); `allowedDecades` keeps 'all'-mode spins but
// restricts which decades count as available (multi-decade windows).
// Locked `playerId`s must exist in players.json — getDailyChallenge skips
// entries whose id has drifted after a data regeneration.
export const CHALLENGES = [
  // ── Draft constraints ──
  { id: 'nineties-only',  type: 'constraint', emoji: '📼', title: "'90s Night",
    desc: 'Only 1990s players — win 55+ games.',
    params: { era: '1990s', minWins: 55 } },
  { id: 'y2k-ball',       type: 'constraint', emoji: '💿', title: 'Y2K Ball',
    desc: 'Only 2000s players — win 55+ games.',
    params: { era: '2000s', minWins: 55 } },
  { id: 'old-school',     type: 'constraint', emoji: '🎩', title: 'Old School',
    desc: 'Pre-1990 players only (60s–80s) — win 50+ games.',
    params: { allowedDecades: ['1960s', '1970s', '1980s'], minWins: 50 } },
  { id: 'modern-era',     type: 'constraint', emoji: '🚀', title: 'Modern Era',
    desc: 'Only 2010s and 2020s players — win 55+ games.',
    params: { allowedDecades: ['2010s', '2020s'], minWins: 55 } },
  { id: 'no-superstars',  type: 'constraint', emoji: '🚫', title: 'No Superstars',
    desc: 'No player rated 85 or higher — win 50+ games.',
    params: { maxRating: 84, minWins: 50 } },
  { id: 'bench-mob',      type: 'constraint', emoji: '🪑', title: 'Bench Mob',
    desc: 'No player rated 80 or higher — win 45+ games.',
    params: { maxRating: 79, minWins: 45 } },
  { id: 'budget-ball',    type: 'constraint', emoji: '🛠️', title: 'Role Players',
    desc: 'Total roster fans under 300 — win 50+ games.',
    params: { maxPopTotal: 300, minWins: 50 } },
  { id: 'no-la-boston',   type: 'constraint', emoji: '🙅', title: 'Flyover Hoops',
    desc: 'No Lakers, no Celtics — win 60+ games.',
    params: { excludeTeams: ['Lakers', 'Celtics'], minWins: 60 } },

  // ── Result objectives ──
  { id: 'win-65',         type: 'objective', emoji: '🎯', title: '65-Win Season',
    desc: 'Any roster — win at least 65 games.',
    params: { minWins: 65 } },
  { id: 'win-70',         type: 'objective', emoji: '🏔️', title: 'Air Rare',
    desc: 'Any roster — win at least 70 games.',
    params: { minWins: 70 } },
  { id: 'volume-scorer',  type: 'objective', emoji: '🔥', title: 'Bucket Getter',
    desc: 'A starter must average 30+ PPG this season — and win 50+ games.',
    params: { minWins: 50, starterPpg: 30 } },
  { id: 'swat-team',      type: 'objective', emoji: '🖐️', title: 'Swat Team',
    desc: 'Your five must combine for 8+ blocks per game — and win 50+ games.',
    params: { minWins: 50, teamBpg: 8 } },
  { id: 'chemistry-class', type: 'objective', emoji: '🧪', title: 'Chemistry Class',
    desc: 'Reach 85+ team chemistry and win 55+ games.',
    params: { minWins: 55, minChem: 85 } },
  { id: 'wire-to-wire',   type: 'objective', emoji: '⚡', title: 'Wire to Wire',
    desc: 'Put together a 20-game win streak at some point in the season.',
    params: { minWins: 50, minStreak: 20 } },

  // ── Locked-player builds ──
  { id: 'build-around-shaq',    type: 'locked', emoji: '🪓', title: 'Shaq Attack',
    desc: "Shaquille O'Neal ('94 Magic) is locked at center. Build around him — win 60+ games.",
    params: { playerId: 'shaq_94', pos: 'C', minWins: 60 } },
  { id: 'build-around-lebron',  type: 'locked', emoji: '👑', title: 'The King\'s Court',
    desc: "LeBron James ('18 Lakers) is locked at small forward. Win 60+ games.",
    params: { playerId: 'lebron_18', pos: 'SF', minWins: 60 } },
  { id: 'build-around-magic',   type: 'locked', emoji: '🎩', title: 'Showtime',
    desc: "Magic Johnson ('87 Lakers) is locked at point guard. Win 60+ games.",
    params: { playerId: 'magic_87', pos: 'PG', minWins: 60 } },
  { id: 'build-around-giannis', type: 'locked', emoji: '🦌', title: 'Freak Show',
    desc: 'Giannis (\'19 Bucks) is locked at power forward. Win 60+ games.',
    params: { playerId: 'giannis_19', pos: 'PF', minWins: 60 } },
];

// ── Date & seeded selection ───────────────────────────────────────────────────

/**
 * Today's UTC date as 'YYYY-MM-DD'. A `?dailydate=YYYY-MM-DD` query param
 * overrides it (dev/testing only — gating and streaks all key off this).
 */
export function todayUTC() {
  try {
    const o = new URLSearchParams(window.location.search).get('dailydate');
    if (o && /^\d{4}-\d{2}-\d{2}$/.test(o)) return o;
  } catch (_) { /* non-browser context */ }
  return new Date().toISOString().slice(0, 10);
}

/** UTC day before the given 'YYYY-MM-DD'. */
function yesterdayOf(dateStr) {
  return new Date(Date.parse(dateStr + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
}

/** xmur3 string hash → non-negative 32-bit int. Deterministic across sessions. */
function hashStr(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** Raw catalog index for a date — before repeat-avoidance and validity checks. */
const rawIndex = dateStr => hashStr(dateStr) % CHALLENGES.length;

/**
 * The day's challenge. Deterministic: same date → same entry for everyone.
 * Skips (a) yesterday's challenge, so no back-to-back repeats, and
 * (b) locked entries whose playerId is missing from the DB (data drift).
 */
export function getDailyChallenge(dateStr = todayUTC()) {
  const avoid = rawIndex(yesterdayOf(dateStr));
  let idx = rawIndex(dateStr);
  if (idx === avoid) idx = (idx + 1) % CHALLENGES.length;
  for (let tries = 0; tries < CHALLENGES.length; tries++) {
    const ch = CHALLENGES[(idx + tries) % CHALLENGES.length];
    if (ch.type === 'locked' && !getLockedPlayer(ch)) {
      console.warn(`[daily] locked player ${ch.params.playerId} missing from DB — skipping ${ch.id}`);
      continue;
    }
    return ch;
  }
  return CHALLENGES[idx]; // unreachable unless the whole catalog is broken
}

/** Look up a catalog entry by id (for the TEMP test picker). */
export function getChallengeById(id) {
  if (!id) return null;
  return CHALLENGES.find(c => c.id === id) || null;
}

// ── Locked-player lookup ──────────────────────────────────────────────────────

/**
 * Hydrates a locked challenge's player from the DB, with team + decade
 * attached exactly like a drafted player gets (events.js placePlayer).
 * Returns null when the id no longer exists (players.json regenerated).
 */
export function getLockedPlayer(challenge) {
  const id = challenge?.params?.playerId;
  if (!id || !DB) return null;
  for (const [key, players] of Object.entries(DB)) {
    const p = players.find(x => x.id === id);
    if (p) return { ...p, team: key.split('_')[0], decade: decadeFromBucketKey(key) };
  }
  return null;
}

// ── Draft-time legality ───────────────────────────────────────────────────────

/**
 * Whether a player may be drafted under the day's rules. `player` should
 * carry `team`/`decade` (attach from the current spin when checking board
 * entries). `filled` = starters already on the roster.
 *
 * @returns {{ legal: boolean, reason: string|null }}
 */
export function checkPickLegal(challenge, player, filled = []) {
  const P = challenge?.params;
  if (!P) return { legal: true, reason: null };

  if (P.maxRating != null && (player.rating ?? 70) > P.maxRating) {
    return { legal: false, reason: `Rated ${player.rating} — today's cap is ${P.maxRating}` };
  }
  if (P.excludeTeams && player.team && P.excludeTeams.includes(player.team)) {
    return { legal: false, reason: `No ${player.team} players today` };
  }
  if (P.allowedDecades && player.decade && !P.allowedDecades.includes(player.decade)) {
    return { legal: false, reason: `${player.decade} is outside today's window` };
  }
  if (P.maxPopTotal != null) {
    // Block picks that make the budget mathematically impossible: current sum
    // + this player + a floor-priced player in every remaining slot.
    const sum       = filled.reduce((s, p) => s + (p.popularity ?? 50), 0);
    const remaining = Math.max(0, 5 - filled.length - 1);
    if (sum + (player.popularity ?? 50) + remaining * MIN_POPULARITY >= P.maxPopTotal) {
      return { legal: false, reason: `Too many fans — busts the ${P.maxPopTotal} budget` };
    }
  }
  return { legal: true, reason: null };
}

/**
 * Roster-level constraint status — drives the live draft banner and is
 * re-checked at sim time. With pick blocking active this should always pass,
 * but a fail is soft: the season still simulates, the challenge just fails.
 */
export function checkRosterConstraint(challenge, starters) {
  const P = challenge?.params;
  if (!P) return { pass: true, detail: '' };

  if (P.maxPopTotal != null) {
    const sum = starters.reduce((s, p) => s + (p.popularity ?? 50), 0);
    return sum < P.maxPopTotal
      ? { pass: true,  detail: `Fans ${sum} / ${P.maxPopTotal}` }
      : { pass: false, detail: `Fans ${sum} — over the ${P.maxPopTotal} budget` };
  }
  if (P.maxRating != null) {
    const bad = starters.find(p => (p.rating ?? 70) > P.maxRating);
    return bad
      ? { pass: false, detail: `${bad.name} (${bad.rating} OVR) breaks the ${P.maxRating} cap` }
      : { pass: true,  detail: `All starters under ${P.maxRating + 1} OVR` };
  }
  if (P.excludeTeams) {
    const bad = starters.find(p => p.team && P.excludeTeams.includes(p.team));
    return bad
      ? { pass: false, detail: `${bad.name} plays for the ${bad.team}` }
      : { pass: true,  detail: `No ${P.excludeTeams.join('/')} players` };
  }
  if (P.allowedDecades) {
    const bad = starters.find(p => p.decade && !P.allowedDecades.includes(p.decade));
    return bad
      ? { pass: false, detail: `${bad.name} (${bad.decade}) is outside the window` }
      : { pass: true,  detail: `All picks inside ${P.allowedDecades.join(' · ')}` };
  }
  return { pass: true, detail: '' };
}

// ── Post-sim evaluation ───────────────────────────────────────────────────────

/**
 * Pass/fail for the day, decided at the end of the regular season (the
 * daily board deliberately captures the shared 82-game run only — playoffs
 * stay out of it, matching markDailyPlayed's lock-at-sim-time rule).
 *
 * Reads S.result (wins, playerStats, simTotals, chemScore, longestStreak)
 * and S.roster.
 */
export function evaluateObjective(challenge, S) {
  const P = challenge?.params;
  const r = S.result;
  if (!P || !r) return { pass: false, detail: 'No season result' };

  const failures = [];

  const roster = checkRosterConstraint(challenge, Object.values(S.roster || {}).filter(Boolean));
  if (!roster.pass) failures.push(roster.detail);

  if (r.wins < (P.minWins ?? 0)) failures.push(`Won ${r.wins} — needed ${P.minWins}`);

  if (P.starterPpg != null) {
    const best = (r.playerStats || []).reduce((m, l) => Math.max(m, l.ppg), 0);
    if (best < P.starterPpg) failures.push(`Top scorer averaged ${best.toFixed(1)} — needed ${P.starterPpg}+`);
  }
  if (P.teamBpg != null && (r.simTotals?.bpg ?? 0) < P.teamBpg) {
    failures.push(`Team blocked ${(r.simTotals?.bpg ?? 0).toFixed(1)}/game — needed ${P.teamBpg}+`);
  }
  if (P.minChem != null && (r.chemScore ?? 0) < P.minChem) {
    failures.push(`Chemistry ${Math.round(r.chemScore ?? 0)} — needed ${P.minChem}+`);
  }
  if (P.minStreak != null && (r.longestStreak ?? 0) < P.minStreak) {
    failures.push(`Longest streak ${r.longestStreak ?? 0} — needed ${P.minStreak}`);
  }

  return failures.length
    ? { pass: false, detail: failures[0] }
    : { pass: true,  detail: 'Challenge complete!' };
}

/**
 * Leaderboard score for the day's run: wins always count, passing the
 * challenge stacks a bonus on top.
 */
export function dailyScore(challenge, S) {
  const wins = S.result?.wins ?? 0;
  return wins * 10 + (evaluateObjective(challenge, S).pass ? 200 : 0);
}
