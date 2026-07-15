/**
 * js/utils/cloudSync.js — Cross-device progress sync (leaderboard, trophies, legends)
 *
 * Sign-in (js/utils/firebase.js signInWithGoogle) is entirely optional — the
 * game never gates play behind it. Once signed in, this module carries a
 * player's local progress (js/utils/storage.js) to a Firestore doc at
 * users/{uid} so it follows them to another device.
 *
 * Merge strategy — every sync reads the cloud doc, reconciles it with this
 * device's local data, and writes the RESULT back to both sides. This (not a
 * one-time pull-on-sign-in) is what keeps two devices signed in at once from
 * clobbering each other: each push is merge-then-write, never a blind
 * overwrite.
 *   • leaderboard / trophies — lossless union, deduped by (date, name/coach,
 *     wins, losses, starters), then re-sorted/capped the same way the local
 *     save functions already do.
 *   • legends                — lossless union of both id sets.
 *   • dailyStreak / dailyStats — these are small running counters, not lists,
 *     so there's no lossless union; the record with the more complete history
 *     (later lastPassDate / higher played count) wins wholesale. This can
 *     under-count a day played on two never-synced devices, but it can never
 *     double-count — the safer failure mode for a stats display.
 *
 * Deliberately NOT synced: nba820_daily_last (today's Daily Challenge lock).
 * Whether "today" is already played is decided per device, same as today —
 * syncing it would mean deciding whether a second device should be allowed
 * to play the same day's challenge, which is a distinct anti-cheat question
 * this feature isn't answering.
 *
 * Exports:
 *   syncOnSignIn(uid) — call once right after a successful sign-in; throws on
 *                       failure so the caller can surface it (matches the
 *                       throw-and-let-the-UI-catch convention in firebase.js)
 *   pushLocalToCloud() — call after any local progress save; no-ops when
 *                        signed out, swallows its own errors (best-effort —
 *                        the local save it follows already succeeded)
 */

import { getCurrentUser, getUserDoc, setUserDoc } from './firebase.js';
import { cgGetItem, cgSetItem } from './crazygames.js';
// circular with storage.js (storage.js calls pushLocalToCloud after its own
// saves) — safe: both sides only touch these bindings inside function
// bodies, never at module-init time. Same pattern already used between
// js/ui/render.js and js/ui/events.js.
import {
  LB_KEY, TROPHIES_KEY, LEGENDS_KEY, DAILY_STREAK_KEY, DAILY_STATS_KEY,
  getCollectedLegends, getDailyStreak, getDailyStats,
} from './storage.js';

const lbEntryKey = e => `${e.date}|${e.teamName}|${e.wins}|${e.losses}|${e.starters}`;
const trophyEntryKey = e => `${e.date}|${e.coachName}|${e.wins}|${e.losses}|${e.starters}`;

function mergeLeaderboard(local, cloud) {
  const seen = new Map();
  for (const e of [...(cloud || []), ...(local || [])]) {
    const key = lbEntryKey(e);
    if (!seen.has(key)) seen.set(key, e);
  }
  const merged = [...seen.values()];
  // Same tie-break as storage.js saveLeaderboard(): 1° wins  2° Team Popularity
  merged.sort((a, b) => (b.wins - a.wins) || ((b.avgPopularity ?? 50) - (a.avgPopularity ?? 50)));
  return merged.slice(0, 20);
}

function mergeTrophies(local, cloud) {
  const seen = new Map();
  for (const e of [...(local || []), ...(cloud || [])]) {
    const key = trophyEntryKey(e);
    if (!seen.has(key)) seen.set(key, e);
  }
  // Trophy entries only carry a locale date string (no time-of-day), so a
  // true chronological interleave across devices isn't reconstructable —
  // same limitation the local-only version already has (unshift order).
  return [...seen.values()].slice(0, 12);
}

function mergeLegends(local, cloud) {
  return [...new Set([...(local || []), ...(cloud || [])])];
}

function mergeDailyStreak(local, cloud) {
  if (!cloud) return local;
  if (!local) return cloud;
  if (local.lastPassDate === cloud.lastPassDate) return local.streak >= cloud.streak ? local : cloud;
  // 'YYYY-MM-DD' sorts lexicographically.
  return (local.lastPassDate || '') > (cloud.lastPassDate || '') ? local : cloud;
}

function mergeDailyStats(local, cloud) {
  if (!cloud) return local;
  if (!local) return cloud;
  return (local.played || 0) >= (cloud.played || 0) ? local : cloud;
}

function readLocalSyncState() {
  let leaderboard = [];
  let trophies    = [];
  try { leaderboard = JSON.parse(cgGetItem(LB_KEY) || '[]'); } catch (_) {}
  try { trophies    = JSON.parse(cgGetItem(TROPHIES_KEY) || '[]'); } catch (_) {}
  return {
    leaderboard,
    trophies,
    legends:     [...getCollectedLegends()],
    dailyStreak: getDailyStreak(),
    dailyStats:  getDailyStats(),
  };
}

function writeLocalSyncState(merged) {
  try { cgSetItem(LB_KEY, JSON.stringify(merged.leaderboard)); } catch (_) {}
  try { cgSetItem(TROPHIES_KEY, JSON.stringify(merged.trophies)); } catch (_) {}
  try { cgSetItem(LEGENDS_KEY, JSON.stringify(merged.legends)); } catch (_) {}
  try { cgSetItem(DAILY_STREAK_KEY, JSON.stringify(merged.dailyStreak)); } catch (_) {}
  try { cgSetItem(DAILY_STATS_KEY, JSON.stringify(merged.dailyStats)); } catch (_) {}
}

async function mergeWithCloud(uid) {
  const cloud = (await getUserDoc(uid)) || {};
  const local = readLocalSyncState();
  return {
    leaderboard: mergeLeaderboard(local.leaderboard, cloud.leaderboard),
    trophies:    mergeTrophies(local.trophies, cloud.trophies),
    legends:     mergeLegends(local.legends, cloud.legends),
    dailyStreak: mergeDailyStreak(local.dailyStreak, cloud.dailyStreak),
    dailyStats:  mergeDailyStats(local.dailyStats, cloud.dailyStats),
  };
}

/**
 * Reconciles this device's local progress with the signed-in user's cloud
 * doc and writes the merged result back to both. Call once right after a
 * successful sign-in.
 * @param {string} uid
 * @returns {Promise<{leaderboard:object[], trophies:object[], legends:string[], dailyStreak:object, dailyStats:object}>} the merged state, for UI feedback (e.g. entry counts)
 */
export async function syncOnSignIn(uid) {
  const merged = await mergeWithCloud(uid);
  writeLocalSyncState(merged);
  await setUserDoc(uid, merged);
  return merged;
}

/**
 * Pushes this device's local progress to the cloud, merged with whatever's
 * already there (so a second signed-in device can't clobber it). No-ops
 * silently when signed out or offline — the local save that triggered this
 * call has already succeeded regardless of sync outcome.
 */
export async function pushLocalToCloud() {
  const user = getCurrentUser();
  if (!user) return;
  try {
    const merged = await mergeWithCloud(user.uid);
    writeLocalSyncState(merged);
    await setUserDoc(user.uid, merged);
  } catch (_) { /* offline / blocked — local data is already safe */ }
}
