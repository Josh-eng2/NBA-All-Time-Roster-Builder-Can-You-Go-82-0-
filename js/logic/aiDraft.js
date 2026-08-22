/**
 * js/logic/aiDraft.js — CPU GM pick policy for GM vs AI mode.
 */

import { POSITIONS } from './state.js';
import { calculateChemistry } from './chemistry.js';

function emptySlots(roster) {
  return POSITIONS.filter(pos => !roster[pos]);
}

function fitsPos(player, pos) {
  if (player.pos === pos) return 1;
  if ((player.secondaryPos || []).includes(pos)) return 0.55;
  return 0.15;
}

/**
 * Best empty slot for a player given the current CPU roster.
 * @param {object} player
 * @param {object} roster
 */
export function bestAiSlot(player, roster) {
  const slots = emptySlots(roster);
  if (!slots.length) return null;
  let best = slots[0];
  let bestScore = -Infinity;
  for (const pos of slots) {
    const score = fitsPos(player, pos);
    if (score > bestScore) { bestScore = score; best = pos; }
  }
  return best;
}

/**
 * Score a board player for the AI GM.
 * @param {object} player
 * @param {object} roster    current CPU roster
 * @param {string|null} coachId
 * @param {number} chemBefore  chemBonus of `roster` as it stands — identical
 *   for every candidate on the board, so the caller computes it once.
 */
function scoreCandidate(player, roster, coachId, chemBefore) {
  // 74–99 window = the old 60–95 rating window's percentile equivalents on the
  // `overall` (era-adjusted 2K) scale.
  const ratingNorm = Math.max(0, Math.min(1, ((player.overall ?? 82) - 74) / 25));
  // No upper clamp: a popularity value above 100 keeps scaling the AI's
  // draft weight instead of capping out at the same pull as exactly 100.
  const popNorm    = Math.max(0, ((player.popularity ?? 50) - 35) / 65);

  const slots = emptySlots(roster);
  let posNeed = 0;
  for (const pos of slots) posNeed = Math.max(posNeed, fitsPos(player, pos));

  const slot = bestAiSlot(player, roster);
  let chemDelta = 0;
  if (slot) {
    const nextRoster = { ...roster, [slot]: player };
    const after = calculateChemistry(Object.values(nextRoster).filter(Boolean), coachId).chemBonus;
    chemDelta = Math.max(0, Math.min(1, (after - chemBefore + 0.05) / 0.25));
  }

  return 0.45 * ratingNorm + 0.25 * popNorm + 0.20 * posNeed + 0.10 * chemDelta;
}

/**
 * Choose the best player from the current draft board for the AI.
 * @param {object[]} board
 * @param {object} roster
 * @param {string|null} coachId
 * @returns {object|null}
 */
export function chooseAiPick(board, roster, coachId) {
  if (!board?.length) return null;
  // The "before" chemistry is a property of the roster, not of the candidate —
  // recomputing it per board player doubled the work of the AI's turn (each
  // calculateChemistry runs the brute-force lineup optimiser).
  const chemBefore = calculateChemistry(Object.values(roster).filter(Boolean), coachId).chemBonus;
  let best = null;
  let bestScore = -Infinity;
  for (const p of board) {
    const score = scoreCandidate(p, roster, coachId, chemBefore);
    const tie = (p.overall ?? 0);
    if (score > bestScore || (score === bestScore && tie > (best?.overall ?? 0))) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}
