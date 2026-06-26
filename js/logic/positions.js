/**
 * js/logic/positions.js — Dynamic Secondary Position Scanner
 *
 * Runs once after loadDatabase() populates DB.
 * Mutates player objects in-memory only — players.js is never touched.
 *
 * Each rule collects into a Set (multiple secondaries per player are valid).
 * Output is sorted by positional distance so the closest slot appears first.
 *
 * Rule Categories
 * ───────────────
 * PG  Combo Guard       : high scorer / shooter / slasher       → SG
 * SG  Lead Guard        : high assist / Playmaker arch           → PG
 * SG  Versatile Wing    : strong rebounder / lockdown / two-way  → SF
 * SF  Point Forward     : high assist / Playmaker arch           → PG
 * SF  Swingman          : high scoring, low rebounding wing      → SG
 * SF  Power-Forward role: interior rebounder / shot-blocker      → PF
 * PF  Point Forward     : high assist / Playmaker arch           → PG
 * PF  Stretch Four      : perimeter-shooting big                 → SF
 * PF  Interior Anchor   : dominant rebounder / shot-blocker      → C
 * C   Mobile Center     : skilled / Floor Spacer / shooter       → PF
 * C   Dominant Center   : elite rim protector / rebounder        → PF
 */

import { DB } from '../data/players.js';

// Positional rank used for distance-sorting secondary positions
const POS_RANK = { PG: 0, SG: 1, SF: 2, PF: 3, C: 4 };

/**
 * Appends a `secondaryPos` array to every player object in DB.
 * Safe to call multiple times — always overwrites.
 */
export function applySecondaryPositions() {
  if (!DB) return;
  for (const players of Object.values(DB)) {
    for (const p of players) {
      p.secondaryPos = deriveSecondary(p);
    }
  }
}

/**
 * Returns a sorted secondary-position array for a single player.
 * Positions closest to the player's natural slot appear first.
 *
 * @param {object} p  Player object from DB
 * @returns {string[]}
 */
function deriveSecondary(p) {
  const arch   = p.archetype || '';
  const traits = Array.isArray(p.traits) ? p.traits : [];
  const sec    = new Set();

  switch (p.pos) {

    // ── Point Guard ───────────────────────────────────────────────────────
    case 'PG':
      // Combo Guard: scoring burst / shooting / slashing style → SG
      if (p.ppg > 22.0 || arch === 'Sharpshooter' || arch === 'Slasher') sec.add('SG');
      break;

    // ── Shooting Guard ────────────────────────────────────────────────────
    case 'SG':
      // Lead Guard: runs offense, high assist floor → PG
      if (p.apg > 5.0 || arch === 'Playmaker') sec.add('PG');
      // Versatile Wing: rebounder, lockdown, or two-way impact player → SF
      if (p.rpg > 6.0 || arch === 'Lockdown Defender' || arch === 'Two-Way Star') sec.add('SF');
      break;

    // ── Small Forward ─────────────────────────────────────────────────────
    case 'SF':
      // Point Forward: orchestrates offense with elite playmaking → PG
      if (p.apg > 5.5 || arch === 'Playmaker') sec.add('PG');
      // Swingman: perimeter scorer without interior dominance → SG
      if (p.ppg > 20.0 && p.rpg < 6.0) sec.add('SG');
      // Power Forward role: interior rebounder / shot-blocker / Paint Beast → PF
      if (p.rpg > 7.5 || p.bpg > 1.2 || arch === 'Paint Beast') sec.add('PF');
      break;

    // ── Power Forward ─────────────────────────────────────────────────────
    case 'PF':
      // Point Forward: facilitating big with elite assist numbers → PG
      if (p.apg > 5.5 || arch === 'Playmaker') sec.add('PG');
      // Stretch Four: floor-spacing big who operates on the perimeter → SF
      if (arch === 'Sharpshooter') sec.add('SF');
      // Interior Anchor: dominant rebounder / shot-blocker / Paint Beast → C
      if (p.rpg > 10.0 || p.bpg > 1.5 || arch === 'Paint Beast') sec.add('C');
      break;

    // ── Center ────────────────────────────────────────────────────────────
    case 'C':
      // Mobile / skilled center who can step out → PF
      // Covers both the Floor Spacer / perimeter skill case AND
      // the dominant rim-protecting / rebounding case
      if (
        p.rpg > 12.0 || p.bpg > 2.0 ||
        arch === 'Paint Beast' || arch === 'Sharpshooter' ||
        traits.includes('Floor Spacer')
      ) sec.add('PF');
      break;
  }

  // Sort secondaries by proximity to natural position (ascending distance)
  const myRank = POS_RANK[p.pos] ?? 2;
  return [...sec].sort(
    (a, b) => Math.abs(POS_RANK[a] - myRank) - Math.abs(POS_RANK[b] - myRank)
  );
}
