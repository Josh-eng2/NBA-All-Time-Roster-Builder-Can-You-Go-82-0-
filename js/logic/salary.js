/**
 * js/logic/salary.js — Fantasy Budget & Dynamic Salary Engine
 *
 * Salary tiers (popularity-driven linear interpolation):
 *   Generational Superstars (pop 95–100) : $38,000,000 – $50,000,000
 *   All-Stars               (pop 85– 94) : $22,000,000 – $35,000,000
 *   Solid Starters          (pop 75– 84) : $10,000,000 – $20,000,000
 *   Role Players / Bench    (pop  0– 74) : $ 2,500,000 –  $8,000,000
 *
 * GM Elo:
 *   Base 1500
 *   –15 pts per $1M over cap  (luxury tax punishes overspending)
 *   +5  pts per $1M under cap (reward for staying lean)
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
    // Generational Superstar: $38M – $50M
    return Math.round(38_000_000 + ((pop - 95) / 5) * 12_000_000);
  }
  if (pop >= 85) {
    // All-Star: $22M – $35M
    return Math.round(22_000_000 + ((pop - 85) / 9) * 13_000_000);
  }
  if (pop >= 75) {
    // Solid Starter: $10M – $20M
    return Math.round(10_000_000 + ((pop - 75) / 9) * 10_000_000);
  }
  // Role Player / Bench: $2.5M – $8M
  return Math.round(2_500_000 + (pop / 74) * 5_500_000);
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

/** "$38M" or "$2.5M" (one decimal only when non-integer millions) */
export function fmtSalary(n) {
  const m = n / 1_000_000;
  return '$' + (Number.isInteger(m) ? m.toFixed(0) : m.toFixed(1)) + 'M';
}
