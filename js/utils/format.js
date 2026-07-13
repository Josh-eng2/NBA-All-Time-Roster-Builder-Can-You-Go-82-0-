/**
 * js/utils/format.js — Shared formatting/display helpers
 *
 * Single home for helpers that were previously duplicated between
 * js/ui/render.js and js/utils/storage.js (and had already started to
 * drift apart). Anything here must stay dependency-free — it is imported
 * by both the UI and the storage/modal layers.
 */

/**
 * HTML-escapes a user-controlled string before it touches innerHTML or an
 * attribute value. Player/coach names from the bundled DB are trusted app
 * data; team names typed by users and anything read back from Firestore
 * are not.
 */
export const esc = s => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** 5 starters × 100 max popularity each. */
export const FANS_TEAM_MAX = 500;

/** Tier color for an average roster popularity (0–100). */
export function fansBarCol(avg, dark = false) {
  if (avg >= 80) return dark ? '#60a5fa' : '#2563eb';
  if (avg >= 60) return dark ? '#fbbf24' : '#d97706';
  return dark ? '#cbd5e1' : '#94a3b8';
}

/**
 * Tier label + light-mode bar color for an average roster popularity.
 * `emptyTier` customizes the zero-roster label per surface (the draft
 * screen coaches the player; the leaderboard modal just says Unknown).
 */
export function fansTierFromAvg(avg, emptyTier = 'Unknown') {
  if (!avg) return { tier: emptyTier, barCol: '#cbd5e1' };
  return {
    tier:   avg >= 85 ? 'Superstar Lineup' : avg >= 70 ? 'Star Power' : avg >= 55 ? 'Solid Roster' : 'Under the Radar',
    barCol: fansBarCol(avg, false),
  };
}
