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
 *   checkPickLegal(ch, player, filled, opts) → { legal, reason } at draft time
 *   checkRosterConstraint(ch, starters) → { pass, detail } live/final roster check
 *   evaluateObjective(ch, S)            → { pass, pending, detail } post-sim
 *   dailyScore(ch, S)                   → leaderboard score for the run
 *   getLockedPlayer(ch)                 → hydrated player object or null
 */

import { DB }                  from '../data/players.js';
import { decadeFromBucketKey } from './era.js';

// Cheapest total the remaining roster slots could conceivably be filled for,
// when the caller can't see the live draft pool. Derived from the live DB
// (memoized) so a data regeneration can't silently break the feasibility math.
//
// This is the OPTIMISTIC bound and it is deliberately weak: the DB's floor is
// 0, so `remaining * minPopularity()` is 0 and the check degenerates into
// "does this pick alone bust the budget". That is how a Boos Only run could be
// drafted into a dead end — four picks totalling 296 of a 300 budget, with the
// cheapest player the wheel could still deal costing 7. Callers that know what
// is actually still draftable pass `remainingFloor` (see isPickDraftable in
// logic/draft.js); this fallback only serves callers that don't.
let _minPopCache = null;
function minPopularity() {
  if (_minPopCache != null) return _minPopCache;
  if (!DB) return 35;
  let min = Infinity;
  for (const players of Object.values(DB)) {
    for (const p of players) if ((p.popularity ?? 50) < min) min = p.popularity ?? 50;
  }
  _minPopCache = Number.isFinite(min) ? min : 35;
  return _minPopCache;
}

// ── Catalog ───────────────────────────────────────────────────────────────────
// NOTE on `era` vs `allowedDecades`: `era` locks the header picker to one
// decade (spins only land there); `allowedDecades` keeps 'all'-mode spins but
// restricts which decades count as available (multi-decade windows).
// Locked `playerId`s must exist in players.json — getDailyChallenge skips
// entries whose id has drifted after a data regeneration.
// `maxRating` caps (none currently in the catalog) are on the `overall` scale
// (era-adjusted 2K rating, mean ≈87), NOT the stats-derived `rating` scale.
// ── Gate calibration ─────────────────────────────────────────────────────────
// Every threshold below is measured, not guessed. The reference player drafts
// the best LEGAL player on every board (a strong, ordinary line of play — no
// coach matching, no steering toward the objective), and each challenge was
// sampled 900+ times end to end through the real rigged/pity draft and the real
// season sim. Under that reference the median run wins ~48 games, the 75th
// percentile ~56 and the 90th ~61, and secondary metrics land at:
//
//   chemScore   p50 66   p75 75   p90 82
//   team BPG    p50 5.3  p75 6.7  p90 8.2
//   win streak  p50 7    p75 9    p90 12
//   top PPG     p50 27.8 p75 29.5
//
// The catalog used to be written against none of that. Gates sat at or past the
// reference p90 — chemistry wanted 95 against a p90 of 82 and passed 0.2% of
// the time, a 20-game streak against a p90 of 12 passed 1.3%, 8 team BPG passed
// 6.7% — and the catalog mean was 21%. With a hard streak reset on any failure
// that put the expected streak at 0.26 days, so the mode's whole retention hook
// could never fire. Gates now target ~40-50% for a standard day and ~20-30% for
// the hard tier, keeping one deliberate marquee day (Air Rare) near 20%.
//
// If the sim curve or the player data is retuned, re-measure and re-tune these
// together — a gate is only meaningful relative to what the draft can produce.
export const CHALLENGES = [
  // ── Draft constraints ──
  { id: 'nineties-only',  type: 'constraint', emoji: '📼', title: "'90s Night",
    desc: 'Only 1990s players — win 48+ games.',
    params: { era: '1990s', minWins: 48 } },
  { id: 'y2k-ball',       type: 'constraint', emoji: '💿', title: 'Y2K Ball',
    desc: 'Only 2000s players — win 50+ games.',
    params: { era: '2000s', minWins: 50 } },
  { id: 'old-school',     type: 'constraint', emoji: '🎩', title: 'Old School',
    desc: 'Pre-1990 players only (60s–80s) — win 50+ games.',
    params: { allowedDecades: ['1960s', '1970s', '1980s'], minWins: 50 } },
  { id: 'modern-era',     type: 'constraint', emoji: '🚀', title: 'Modern Era',
    desc: 'Only 2010s and 2020s players — win 48+ games.',
    params: { allowedDecades: ['2010s', '2020s'], minWins: 48 } },
  { id: 'budget-ball',    type: 'constraint', emoji: '👎', title: 'Boos Only',
    desc: 'Total roster fans under 300 — win 44+ games.',
    params: { maxPopTotal: 300, minWins: 44 } },
  { id: 'no-la-boston',   type: 'constraint', emoji: '🙅', title: 'Flyover Hoops',
    desc: 'No Lakers, no Celtics — win 50+ games.',
    params: { excludeTeams: ['Lakers', 'Celtics'], minWins: 50 } },

  // ── Result objectives ──
  // NOTE: `id` is the wire key for the daily leaderboard, the local play record
  // and the lifetime stats, so it never changes even when the title does —
  // `win-65` keeps its id after being retuned to a 55-win target.
  { id: 'win-65',         type: 'objective', emoji: '🎯', title: '55-Win Season',
    desc: 'Any roster — win at least 55 games.',
    params: { minWins: 55 } },
  { id: 'win-70',         type: 'objective', emoji: '🏔️', title: 'Air Rare',
    desc: 'Any roster — win at least 58 games. The hardest day on the board.',
    params: { minWins: 58 } },
  { id: 'volume-scorer',  type: 'objective', emoji: '🔥', title: 'Bucket Getter',
    desc: 'A starter must average 28+ PPG this season — and win 44+ games.',
    params: { minWins: 44, starterPpg: 28 } },
  { id: 'swat-team',      type: 'objective', emoji: '🖐️', title: 'Swat Team',
    desc: 'Your five must combine for 6+ blocks per game — and win 44+ games.',
    params: { minWins: 44, teamBpg: 6 } },
  { id: 'chemistry-class', type: 'objective', emoji: '🧪', title: 'Chemistry Class',
    desc: 'Reach Strong team chemistry (72+) and win 44+ games.',
    params: { minWins: 44, minChem: 72 } },
  { id: 'wire-to-wire',   type: 'objective', emoji: '⚡', title: 'Wire to Wire',
    desc: 'Put together a 9-game win streak at some point in the season — and win 44+.',
    params: { minWins: 44, minStreak: 9 } },

  // ── Locked-player builds ──
  { id: 'build-around-shaq',    type: 'locked', emoji: '🪓', title: 'Shaq Attack',
    desc: "Shaquille O'Neal ('94 Magic) is locked at center. Build around him — win 54+ games.",
    params: { playerId: 'shaq_94', pos: 'C', minWins: 54 } },
  { id: 'build-around-lebron',  type: 'locked', emoji: '👑', title: 'The King\'s Court',
    desc: "LeBron James ('18 Lakers) is locked at small forward. Win 58+ games.",
    params: { playerId: 'lebron_18', pos: 'SF', minWins: 58 } },
  { id: 'build-around-magic',   type: 'locked', emoji: '🎩', title: 'Showtime',
    desc: "Magic Johnson ('87 Lakers) is locked at point guard. Win 56+ games.",
    params: { playerId: 'magic_87', pos: 'PG', minWins: 56 } },
  { id: 'build-around-giannis', type: 'locked', emoji: '🦌', title: 'Greek Freak',
    desc: 'Giannis (\'19 Bucks) is locked at power forward. Win 50+ games.',
    params: { playerId: 'giannis_19', pos: 'PF', minWins: 50 } },
];

// ── Date & seeded selection ───────────────────────────────────────────────────

/**
 * Today's UTC date as 'YYYY-MM-DD'. A `?dailydate=YYYY-MM-DD` query param
 * overrides it, but ONLY on a local dev host — in production that override
 * was a cheat door (scout tomorrow's board/challenge, replay any date,
 * submit to another day's leaderboard).
 */
export function todayUTC() {
  try {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
      const o = new URLSearchParams(window.location.search).get('dailydate');
      if (o && /^\d{4}-\d{2}-\d{2}$/.test(o)) return o;
    }
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
 * A date's catalog index after repeat-avoidance. Each day must be bumped off
 * the previous day's index *after its own bump*, not off its raw hash: when
 * yesterday collided and got bumped forward, today's raw index could land
 * exactly on yesterday's final challenge and a raw-vs-raw comparison never
 * saw it — a back-to-back repeat roughly every ~80 days, the very thing the
 * avoidance logic exists to prevent. Bumps chain (a bumped day shifts what
 * its successor must avoid), so the exact value is computed by replaying the
 * bump rule forward from a fixed horizon; 32 days is exact unless every one
 * of 32 consecutive raw hashes chain-collides, which is effectively never.
 * Pure function of the date string — identical on every client.
 */
function finalIndexFor(dateStr) {
  const HORIZON = 32;
  const dates = [dateStr];
  for (let i = 0; i < HORIZON; i++) dates.push(yesterdayOf(dates[dates.length - 1]));
  dates.reverse(); // oldest → newest
  let prev = rawIndex(dates[0]); // anchor: beyond the horizon, treat raw as final
  for (let i = 1; i < dates.length; i++) {
    let idx = rawIndex(dates[i]);
    if (idx === prev) idx = (idx + 1) % CHALLENGES.length;
    prev = idx;
  }
  return prev;
}

/**
 * The day's challenge. Deterministic: same date → same entry for everyone.
 * Skips (a) yesterday's challenge, so no back-to-back repeats, and
 * (b) locked entries whose playerId is missing from the DB (data drift).
 * Memoized per date — render paths call this every frame, and the locked-id
 * validity check scans the whole player DB.
 */
const _challengeCache = new Map();
export function getDailyChallenge(dateStr = todayUTC()) {
  if (_challengeCache.has(dateStr)) return _challengeCache.get(dateStr);
  const avoid = finalIndexFor(yesterdayOf(dateStr));
  let idx = rawIndex(dateStr);
  if (idx === avoid) idx = (idx + 1) % CHALLENGES.length; // == finalIndexFor(dateStr)
  let found = CHALLENGES[idx]; // fallback — unreachable unless the whole catalog is broken
  for (let tries = 0; tries < CHALLENGES.length; tries++) {
    const j = (idx + tries) % CHALLENGES.length;
    // Skipping a broken locked entry must not walk back onto yesterday's
    // challenge — that would reintroduce the back-to-back repeat the
    // pre-loop adjustment exists to prevent.
    if (j === avoid) continue;
    const ch = CHALLENGES[j];
    if (ch.type === 'locked' && !getLockedPlayer(ch)) {
      console.warn(`[daily] locked player ${ch.params.playerId} missing from DB — skipping ${ch.id}`);
      continue;
    }
    found = ch;
    break;
  }
  // Don't cache pre-DB-load lookups — a locked entry could be wrongly skipped.
  if (DB) _challengeCache.set(dateStr, found);
  return found;
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
 * @param {object} challenge
 * @param {object} player
 * @param {object[]} [filled]
 * @param {{ remainingFloor?: number }} [opts] — `remainingFloor` is the
 *   cheapest total the slots left AFTER this pick could be filled for, given
 *   what the wheel can still deal. Supply it wherever the draft pool is
 *   visible (logic/draft.js isPickDraftable); without it the budget check
 *   falls back to the DB-wide floor, which cannot see a dead end coming.
 * @returns {{ legal: boolean, reason: string|null }}
 */
export function checkPickLegal(challenge, player, filled = [], opts = {}) {
  const P = challenge?.params;
  if (!P) return { legal: true, reason: null };

  if (P.maxRating != null && (player.overall ?? 82) > P.maxRating) {
    return { legal: false, reason: `Rated ${player.overall} — today's cap is ${P.maxRating}` };
  }
  if (P.excludeTeams && player.team && P.excludeTeams.includes(player.team)) {
    return { legal: false, reason: `No ${player.team} players today` };
  }
  if (P.allowedDecades && player.decade && !P.allowedDecades.includes(player.decade)) {
    return { legal: false, reason: `${player.decade} is outside today's window` };
  }
  if (P.maxPopTotal != null) {
    // Block picks that make the budget impossible to finish: current sum +
    // this player + the cheapest the remaining slots can still be filled for.
    // Blocking only the pick that busts the budget outright is not enough —
    // it lets a roster walk into a state where no legal fifth pick exists
    // anywhere and the run can only spin forever.
    const sum       = filled.reduce((s, p) => s + (p.popularity ?? 50), 0);
    const remaining = Math.max(0, 5 - filled.length - 1);
    const floor     = opts.remainingFloor ?? remaining * minPopularity();
    if (sum + (player.popularity ?? 50) + floor >= P.maxPopTotal) {
      return {
        legal: false,
        reason: remaining > 0 && (sum + (player.popularity ?? 50)) < P.maxPopTotal
          ? `Too pricey — leaves no room to fill the last ${remaining} spot${remaining === 1 ? '' : 's'}`
          : `Too many fans — busts the ${P.maxPopTotal} budget`,
      };
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
    const bad = starters.find(p => (p.overall ?? 82) > P.maxRating);
    return bad
      ? { pass: false, detail: `${bad.name} (${bad.overall} OVR) breaks the ${P.maxRating} cap` }
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
    failures.push('Team Chemistry too low — stack more synergies');
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
