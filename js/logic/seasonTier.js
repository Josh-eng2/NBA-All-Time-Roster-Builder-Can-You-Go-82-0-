/**
 * Shared season-tier labels — used by the results screen AND share cards so
 * the emotional punchline never disagrees with the clipboard caption.
 *
 * Thresholds (wins):
 *   82      → PERFECT SEASON
 *   ≥73     → Historic Season
 *   ≥65     → Championship Contender
 *   ≥41     → Playoff Contender  (aligned with playoff seeding bands)
 *   else    → Rebuild Required
 */
export function seasonTier(wins) {
  const w = Number(wins) || 0;
  if (w === 82) return { id: 'perfect',  label: 'PERFECT SEASON',         emoji: '🏆' };
  if (w >= 73)  return { id: 'historic', label: 'Historic Season',        emoji: '🔥' };
  if (w >= 65)  return { id: 'elite',    label: 'Championship Contender', emoji: '⭐' };
  if (w >= 41)  return { id: 'playoff',  label: 'Playoff Contender',      emoji: '✅' };
  return            { id: 'rebuild', label: 'Rebuild Required',       emoji: '📋' };
}
