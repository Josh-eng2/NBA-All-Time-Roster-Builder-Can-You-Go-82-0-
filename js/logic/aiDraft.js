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
 * @param {object} roster  current CPU roster
 * @param {string|null} coachId
 */
function scoreCandidate(player, roster, coachId) {
  const ratingNorm = Math.max(0, Math.min(1, ((player.rating ?? 70) - 60) / 35));
  const popNorm    = Math.max(0, Math.min(1, ((player.popularity ?? 50) - 35) / 65));

  const slots = emptySlots(roster);
  let posNeed = 0;
  for (const pos of slots) posNeed = Math.max(posNeed, fitsPos(player, pos));

  const slot = bestAiSlot(player, roster);
  let chemDelta = 0;
  if (slot) {
    const before = calculateChemistry(Object.values(roster).filter(Boolean), coachId).chemBonus;
    const nextRoster = { ...roster, [slot]: player };
    const after = calculateChemistry(Object.values(nextRoster).filter(Boolean), coachId).chemBonus;
    chemDelta = Math.max(0, Math.min(1, (after - before + 0.05) / 0.25));
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
  let best = null;
  let bestScore = -Infinity;
  for (const p of board) {
    const score = scoreCandidate(p, roster, coachId);
    const tie = (p.rating ?? 0);
    if (score > bestScore || (score === bestScore && tie > (best?.rating ?? 0))) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}
