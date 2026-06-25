/**
 * js/logic/salary.js — Fantasy Budget & Dynamic Salary Engine
 *
 * Salary tiers (popularity-driven linear interpolation):
 *   Generational Superstars (pop 95–100) : $28,000,000 – $30,000,000
 *   All-Stars               (pop 85– 94) : $18,000,000 – $25,000,000
 *   Solid Starters          (pop 75– 84) : $ 8,000,000 – $15,000,000
 *   Role Players / Bench    (pop  0– 74) : $ 1,500,000 –  $5,000,000
 *
 * With 5 max-tier superstars ($30M × 5 = $150M) + 2 minimum bench
 * players ($1.5M × 2 = $3M) the total is $153M — just under the
 * $154,647,000 soft cap. Any upgrade to the bench breaks the cap.
 *
 * GM Elo:
 *   Base 1500
 *   –15 pts per $1M over cap  (luxury tax punishes overspending)
 *   +5 pts per $1M under cap  (reward for staying lean)
 */

export const CAP = 154_647_000;

/**
 * Deterministic salary for a player based on their popularity score.
 * Linearly interpolates within each popularity tier.
 * @param {object} player
 * @returns {number} salary in whole dollars
 */
export function getPlayerSalary(player) {
  const pop = player.popularity ?? 50;

  if (pop >= 95) {
    // Generational Superstar: $28M – $30M
    return Math.round(28_000_000 + ((pop - 95) / 5) * 2_000_000);
  }
  if (pop >= 85) {
    // All-Star: $18M – $25M
    return Math.round(18_000_000 + ((pop - 85) / 9) * 7_000_000);
  }
  if (pop >= 75) {
    // Solid Starter: $8M – $15M
    return Math.round(8_000_000 + ((pop - 75) / 9) * 7_000_000);
  }
  // Role Player / Bench: $1.5M – $5M
  return Math.round(1_500_000 + (pop / 74) * 3_500_000);
}

/**
 * Human-readable tier label for a player's salary bracket.
 * @param {object} player
 * @returns {string}
 */
export function getSalaryTier(player) {
  const pop = player.popularity ?? 50;
  if (pop >= 95) return 'Generational';
  if (pop >= 85) return 'All-Star';
  if (pop >= 75) return 'Solid Starter';
  return 'Role Player';
}

/**
 * Total payroll for all filled slots in the roster map.
 * @param {object} roster  S.roster — keyed by position
 * @returns {number}
 */
export function computePayroll(roster) {
  return Object.values(roster).reduce(
    (sum, p) => (p ? sum + getPlayerSalary(p) : sum), 0
  );
}

/**
 * GM Elo rating from payroll vs cap.
 *   Base 1500 · –15 pts / $1M over cap · +5 pts / $1M under cap
 * @param {number} payroll
 * @returns {number}
 */
export function computeGmElo(payroll) {
  const deltaMil = (payroll - CAP) / 1_000_000;
  return Math.round(deltaMil > 0 ? 1500 - deltaMil * 15 : 1500 - deltaMil * 5);
}

/** "$28M" or "$1.5M" (one decimal only when non-integer millions) */
export function fmtSalary(n) {
  const m = n / 1_000_000;
  return '$' + (Number.isInteger(m) ? m.toFixed(0) : m.toFixed(1)) + 'M';
}
