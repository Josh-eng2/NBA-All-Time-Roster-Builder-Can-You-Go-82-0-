/**
 * js/logic/positions.js — Dynamic Secondary Position Mapping
 *
 * Runs once after loadDatabase() populates DB.
 * Mutates player objects in-memory only — players.json is never touched.
 *
 * Rules
 * ─────
 * SF  + high rebounding / interior archetype  →  secondaryPos: ['PF']
 * PG  + high scoring / shooting archetype     →  secondaryPos: ['SG']
 * Dominant C                                  →  secondaryPos: ['PF']
 * Dominant PF                                 →  secondaryPos: ['C']
 */

import { DB } from '../data/players.js';

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
 * Returns the secondary-position array for a single player.
 * @param {object} p  Player object from DB
 * @returns {string[]}
 */
function deriveSecondary(p) {
  const arch = p.archetype || '';

  switch (p.pos) {
    case 'SF':
      // Rebounding power-forward or interior archetype → can slide to PF
      if (p.rpg >= 9.0 || arch === 'Paint Beast') return ['PF'];
      break;

    case 'PG':
      // High-scoring or shooting/slashing combo guard → can slide to SG
      if (p.ppg >= 20.0 || arch === 'Sharpshooter' || arch === 'Slasher') return ['SG'];
      break;

    case 'C':
      // Dominant rim presence → dual frontcourt eligibility at PF
      if (p.rpg >= 12.0 || p.bpg >= 2.0 || arch === 'Paint Beast') return ['PF'];
      break;

    case 'PF':
      // Interior anchor → can cover the C slot
      if (p.rpg >= 10.0 || arch === 'Paint Beast') return ['C'];
      break;
  }

  return [];
}
