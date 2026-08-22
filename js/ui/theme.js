/**
 * js/ui/theme.js — the one place the theme is read and tier colours are defined.
 *
 * These three helpers used to live in ui/render.js with hand-copied duplicates
 * in utils/storage.js ("duplicated locally to avoid a render.js <-> storage.js
 * cycle"). The copies drifted twice — the storage.js versions kept shipping
 * light-mode hexes onto surfaces that are themed (`--card` is #1e293b in dark
 * mode), so the leaderboard modals painted e.g. #b45309 on a dark card at
 * 2.9:1, under the 4.5:1 AA floor for their 13px bold text.
 *
 * This module imports nothing, so both render.js and storage.js can depend on
 * it without a cycle and there is only ever one ramp to keep accessible.
 */

/** True when the explicit dark theme is active. */
export function isDark() {
  return typeof document !== 'undefined'
    && document.documentElement?.getAttribute('data-theme') === 'dark';
}

/**
 * 2K-style tier colour for a 0–100 overall. Cutoffs 97/92/85 are the old
 * rating-scale 90/82/74 tiers' percentile equivalents on the `overall`
 * (era-adjusted 2K) scale the sim averages.
 *
 * The dark ramp lifts each tint until it clears 4.5:1 on `--card` (#1e293b):
 * the light gold (#d97706) measured 2.9:1 and the light blue (#2563eb) 2.6:1
 * on that surface.
 */
export function ovrColor(rating, dark = isDark()) {
  const r = rating ?? 0;
  if (r >= 97) return dark ? '#fbbf24' : '#d97706'; // gold  — GOAT tier
  if (r >= 92) return dark ? '#93c5fd' : '#2563eb'; // blue  — star
  if (r >= 85) return dark ? '#5eead4' : '#0f766e'; // teal  — solid starter
  return dark ? '#cbd5e1' : '#64748b';              // slate — role player
}

/**
 * Fans-meter tier colour for an average popularity.
 *
 * Light: slate was #94a3b8 (2.56:1 on white — under the 3:1 floor for a
 * graphic that carries meaning) and amber was #d97706 (3.05:1 as badge text);
 * both were darkened. Dark: blue was #60a5fa (2.98:1 as a bar fill on
 * `--border`), lifted to #93c5fd.
 */
export function fansBarCol(avg, dark = isDark()) {
  if (avg >= 80) return dark ? '#93c5fd' : '#2563eb';
  if (avg >= 60) return dark ? '#fbbf24' : '#b45309';
  return dark ? '#cbd5e1' : '#64748b';
}
