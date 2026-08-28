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
 * Fans-meter thresholds, on the average-popularity scale.
 *
 * Rescaled when the popularity data ceiling went to 350. The old 85/70/55 cuts
 * were written for a ~100-point scale and had stopped separating anything: 77%
 * of star-chasing rosters and 61% of ordinary best-player-available rosters all
 * landed in "Superstar Lineup", so the meter read the same for a good team and
 * the best team possible. Measured over 6,000 drafts per strategy, the cuts
 * below put roughly 9% / 43% / 39% / 8% of star-chasing rosters across the four
 * tiers, and leave 73% of random rosters under the radar where they belong.
 */
const FANS_TIERS = [
  { min: 170, label: 'Superstar Lineup' },
  { min: 110, label: 'Star Power' },
  { min:  70, label: 'Solid Roster' },
  { min:   0, label: 'Under the Radar' },
];

/**
 * Fans-meter tier colour for an average popularity. Cuts track FANS_TIERS so
 * the colour always changes on the same boundary as the label.
 *
 * Light: slate was #94a3b8 (2.56:1 on white — under the 3:1 floor for a
 * graphic that carries meaning) and amber was #d97706 (3.05:1 as badge text);
 * both were darkened. Dark: blue was #60a5fa (2.98:1 as a bar fill on
 * `--border`), lifted to #93c5fd.
 */
export function fansBarCol(avg, dark = isDark()) {
  if (avg >= 170) return dark ? '#93c5fd' : '#2563eb';
  if (avg >= 110) return dark ? '#fbbf24' : '#b45309';
  return dark ? '#cbd5e1' : '#64748b';
}

/**
 * Label + colour for an average popularity. The single source of truth — the
 * results screen and the leaderboard modals each carried their own copy of the
 * threshold ladder, which is why they could disagree after a rescale.
 * @param {number} avg
 * @returns {{ tier: string, barCol: string }}
 */
export function fansTier(avg, dark = isDark()) {
  const a = Number(avg) || 0;
  return {
    tier:   (FANS_TIERS.find(t => a >= t.min) ?? FANS_TIERS[FANS_TIERS.length - 1]).label,
    barCol: fansBarCol(a, dark),
  };
}
