/**
 * js/logic/daily.js — Daily Draft (seeded, one attempt, shareable)
 *
 * Everyone who plays on the same calendar day gets:
 *   • the same 5 team/decade draft boards, in the same order, and
 *   • the same season win-draw stream,
 * so two identical rosters produce the identical record — the property
 * that makes a shared daily leaderboard fair and a result card shareable
 * (Wordle-style).
 *
 * The player's skill is *which* five legends they pick from the forced
 * boards, and which coach system they build toward. No re-spins, no skips.
 *
 * Exports:
 *   dailyDateKey(date?)     → "YYYY-MM-DD" in local time
 *   getDailyDraft(dateKey?) → { dateKey, buckets: [{team, decade}] ×5 }
 *   dailySeasonRng(dateKey) → seeded () => [0,1) for the win draws
 */

import { DB }             from '../data/players.js';
import { TEAMS, DECADES } from '../logic/state.js';

// ── Seeded PRNG (mulberry32) + string hash (FNV-1a) ───────────────────────────

/** Deterministic 32-bit PRNG. Returns a function producing floats in [0, 1). */
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a → unsigned 32-bit seed. */
export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Local-time date key so the puzzle rolls at the player's midnight. */
export function dailyDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ── Board sequence ────────────────────────────────────────────────────────────

function seededShuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * The 5 forced draft boards for a given day.
 *
 * Rules, all deterministic from the date seed:
 *   • distinct teams
 *   • distinct decades where possible (relaxed only if it can't be satisfied)
 *   • every board has ≥3 players (so there's an actual choice), and
 *   • at least 2 boards contain a star (popularity ≥85), so the day always
 *     offers a shot at a strong roster.
 *
 * @param {string} dateKey
 * @returns {{ dateKey: string, buckets: {team:string, decade:string}[] }}
 */
export function getDailyDraft(dateKey = dailyDateKey()) {
  const rng = mulberry32(hashString('82-0-daily-boards-' + dateKey));

  const starBuckets = [];
  const normalBuckets = [];
  for (const team of TEAMS) {
    for (const decade of DECADES) {
      const arr = (DB || {})[`${team}_${decade}`];
      if (!arr || arr.length < 3) continue;
      const hasStar = arr.some(p => (p.popularity ?? 50) >= 85);
      (hasStar ? starBuckets : normalBuckets).push({ team, decade, hasStar });
    }
  }

  const stars  = seededShuffle(starBuckets, rng);
  const others = seededShuffle(normalBuckets, rng);

  const chosen      = [];
  const usedTeams   = new Set();
  const usedDecades = new Set();

  const tryTake = (b, requireDistinctDecade) => {
    if (usedTeams.has(b.team)) return false;
    if (requireDistinctDecade && usedDecades.has(b.decade)) return false;
    usedTeams.add(b.team);
    usedDecades.add(b.decade);
    chosen.push(b);
    return true;
  };

  // 2 star boards, distinct decades preferred.
  for (const b of stars) { if (chosen.length >= 2) break; tryTake(b, true); }
  // Fill to 5 from the normal pool, distinct decades preferred.
  for (const b of others) { if (chosen.length >= 5) break; tryTake(b, true); }
  // Relaxation passes if the distinct-decade constraint left us short.
  if (chosen.length < 5) for (const b of [...stars, ...others]) { if (chosen.length >= 5) break; tryTake(b, false); }

  const buckets = seededShuffle(chosen, rng).slice(0, 5).map(({ team, decade }) => ({ team, decade }));
  return { dateKey, buckets };
}

/** Seeded RNG for the season win draws — date-only so equal rosters tie. */
export function dailySeasonRng(dateKey = dailyDateKey()) {
  return mulberry32(hashString('82-0-daily-season-' + dateKey));
}
