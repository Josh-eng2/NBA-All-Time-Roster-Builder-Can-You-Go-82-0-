/**
 * js/logic/chemistry.js — Advanced Team Chemistry Engine
 *
 * calculateChemistry(starters, coachId?, opts?)
 *
 * opts.asPlacedSlots — when set (live draft UI), score positional fit against
 * the player's placed roster slots instead of optimizeLineup.
 *   Uses coachId when provided; otherwise falls back to S.coach.
 *   Returns { chemBonus, chemScore, chemReport, chemEntries, lineupAssignment }.
 *
 *   chemBonus   — raw float added to adjustedStrength in simulation
 *   chemScore   — 0–100 display value (50 baseline; see chemScoreFromBonus)
 *   chemReport  — array of human-readable strings (🟢 synergies / 🔴 penalties)
 *   chemEntries — structured source of truth the strings are derived from:
 *                 { id, kind: 'synergy'|'penalty'|'info', family, bonus, label }
 *
 * The structured entries exist so downstream systems (defense-mode profile
 * boosts, autopsy, future coach systems) can key off `kind`/`family` instead
 * of regex-matching English prose — the report strings are presentation only.
 *
 * ── Synergy families & caps ──────────────────────────────────────────────────
 * Positive synergies belong to one of four families, each with a hard cap.
 * Stacking within one identity plateaus instead of compounding linearly (a
 * twin-big roster used to bank ~+39% from six overlapping interior synergies
 * before traits). Penalties are never capped. When a family overflows, the
 * overflow is trimmed from chemBonus and an 🟢 info line explains the cap so
 * the player learns to diversify rather than wonder where the % went.
 */

import { S } from '../logic/state.js';

// ── Family caps ──────────────────────────────────────────────────────────────
// Calibrated by A/B sweep against the pre-cap engine over the live DB
// (1500-sample random & star-chasing builds, 150-sample greedy chemistry
// maximizers): random builds land within ±1 expected win of the old engine,
// star-chasing medians stay on the sim's documented ~72-win anchor, and only
// degenerate synergy-stacking builds get trimmed (−4 to −8 expected wins).
// position: natural max is 0.22 (5×3% primary + 7% flawless) — cap never binds,
// it exists so every family reports uniformly.
export const FAMILY_CAPS = {
  position:    0.22,
  offense:     0.38,
  defense:     0.36,
  intangibles: 0.20,
};

// Global tuning knob — every positive synergy bonus is multiplied by this
// before being added to chemBonus. Penalties are unaffected.
const SYNERGY_SCALE = 0.8;

const FAMILY_LABEL = {
  position:    'Positional fit',
  offense:     'Offensive',
  defense:     'Defensive',
  intangibles: 'Intangible',
};

// Display scale: chemScore starts at 50 (empty roster / no synergies).
// Positive bonuses climb toward 100; penalties drop toward 0.
// chemScore = 100 when chemBonus reaches +CHEM_SCORE_SCALE;
// chemScore = 0 when chemBonus reaches −CHEM_SCORE_SCALE.
export const CHEM_SCORE_SCALE = 0.95;
export const CHEM_SCORE_BASE  = 50;

/** 0–100 display score for a raw chemistry bonus. Shared with simulation.js. */
export function chemScoreFromBonus(bonus) {
  const delta = (bonus / CHEM_SCORE_SCALE) * CHEM_SCORE_BASE;
  return Math.round(Math.max(0, Math.min(100, CHEM_SCORE_BASE + delta)));
}

/**
 * Player-facing chemistry tier. Empty roster (score 50) lands on Neutral.
 * Thresholds intentionally hide the raw 0–100 number from the UI.
 *
 * @returns {{ id: string, label: string, score: number }}
 */
export function chemTier(score) {
  const sc = Math.round(Math.max(0, Math.min(100, Number(score) || 0)));
  if (sc >= 95) return { id: 'perfect',     label: 'Perfect',     score: sc };
  if (sc >= 80) return { id: 'veryStrong',  label: 'Very Strong', score: sc };
  if (sc >= 65) return { id: 'strong',      label: 'Strong',      score: sc };
  if (sc >= 45) return { id: 'neutral',     label: 'Neutral',     score: sc };
  if (sc >= 25) return { id: 'weak',        label: 'Weak',        score: sc };
  return { id: 'veryWeak', label: 'Very Weak', score: sc };
}

/** Colors for chemTier badges. Pass dark=true for dark-mode hexes. */
export function chemTierColors(tierId, dark = false) {
  const map = {
    perfect: {
      color: dark ? '#fbbf24' : '#b45309',
      bg:    dark ? 'rgba(251,191,36,0.12)' : '#fffbeb',
    },
    veryStrong: {
      color: dark ? '#4ade80' : '#15803d',
      bg:    dark ? 'rgba(34,197,94,0.12)' : '#ecfdf5',
    },
    strong: {
      color: dark ? '#4ade80' : '#16a34a',
      bg:    dark ? 'rgba(34,197,94,0.12)' : '#f0fdf4',
    },
    neutral: {
      color: dark ? '#fbbf24' : '#d97706',
      bg:    dark ? 'rgba(251,191,36,0.12)' : '#fffbeb',
    },
    weak: {
      color: dark ? '#fb923c' : '#ea580c',
      bg:    dark ? 'rgba(251,146,60,0.12)' : '#fff7ed',
    },
    veryWeak: {
      color: dark ? '#f87171' : '#dc2626',
      bg:    dark ? 'rgba(239,68,68,0.12)' : '#fef2f2',
    },
  };
  return map[tierId] || map.neutral;
}

// ── Lineup Optimizer ──────────────────────────────────────────────────────────

const FLOOR_SLOTS = ['PG', 'SG', 'SF', 'PF', 'C'];

// Ordered slot selections P(5, n), memoized by n. The pool is always
// FLOOR_SLOTS, so the permutation set never changes — but optimizeLineup runs
// inside hot paths (AI-draft candidate scoring calls calculateChemistry twice
// per board player), and rebuilding up to 120 arrays each call was pure waste.
const _slotOrderCache = new Map();

function slotOrders(pool, r) {
  if (r === 0) return [[]];
  const out = [];
  for (let i = 0; i < pool.length; i++) {
    const rest = [...pool.slice(0, i), ...pool.slice(i + 1)];
    for (const sub of slotOrders(rest, r - 1)) out.push([pool[i], ...sub]);
  }
  return out;
}

function slotOrdersForCount(n) {
  if (!_slotOrderCache.has(n)) _slotOrderCache.set(n, slotOrders(FLOOR_SLOTS, n));
  return _slotOrderCache.get(n);
}

// Returns the raw chemBonus contribution for one player-slot pair.
// Primary match = +3%, secondary/flex = +2%, out-of-position = +1%.
// OOP is intentionally lower than secondary — it fills a role but doesn't fit it.
function slotFitScore(player, slot) {
  if (player.pos === slot) return 0.03;
  if ((player.secondaryPos || []).includes(slot)) return 0.02;
  return 0.01;
}

/**
 * Brute-force optimal assignment of up to 5 starters into floor slots.
 * Tries all P(5, n) ordered slot selections — at most 120 iterations for n=5.
 *
 * @param {object[]} starters
 * @returns {{ assignment: object[], posBonus: number, flawless: boolean }}
 */
function optimizeLineup(starters) {
  const n = Math.min(starters.length, 5);
  if (n === 0) return { assignment: [], posBonus: 0, flawless: false };

  const players = starters.slice(0, n);

  let bestSlots = null;
  let bestScore = -Infinity;
  for (const perm of slotOrdersForCount(n)) {
    const score = players.reduce((s, p, i) => s + slotFitScore(p, perm[i]), 0);
    if (score > bestScore) { bestScore = score; bestSlots = perm; }
  }

  // Build assignment
  const assignment = [];
  let posBonus = 0;
  for (let i = 0; i < n; i++) {
    const p     = players[i];
    const slot  = bestSlots[i];
    const score = slotFitScore(p, slot);
    let fit;
    if (p.pos === slot)                              fit = 'primary';
    else if ((p.secondaryPos || []).includes(slot)) fit = 'flex';
    else                                              fit = 'oop';
    assignment.push({ slot, player: p, fit, bonus: score });
    posBonus += score;
  }

  const allPrimary = n === 5 && assignment.every(a => a.fit === 'primary');
  if (allPrimary) posBonus += 0.07;

  return { assignment, posBonus, flawless: allPrimary };
}

/**
 * Score positional fit against the player's *placed* roster slots (PG→C order),
 * not the engine's optimized floor. Used by the live draft chemistry panel so
 * "Perfect Fit … natural SG" matches the SG chip the player actually sees.
 *
 * @param {object[]} starters  players in POSITIONS order (empties already filtered)
 * @param {string[]} slots     matching slot labels for each starter
 */
function placementLineup(starters, slots) {
  const n = Math.min(starters.length, slots.length, 5);
  if (n === 0) return { assignment: [], posBonus: 0, flawless: false };

  const assignment = [];
  let posBonus = 0;
  for (let i = 0; i < n; i++) {
    const p     = starters[i];
    const slot  = slots[i];
    const score = slotFitScore(p, slot);
    let fit;
    if (p.pos === slot)                              fit = 'primary';
    else if ((p.secondaryPos || []).includes(slot)) fit = 'flex';
    else                                              fit = 'oop';
    assignment.push({ slot, player: p, fit, bonus: score });
    posBonus += score;
  }

  const allPrimary = n === 5 && assignment.every(a => a.fit === 'primary');
  if (allPrimary) posBonus += 0.07;

  return { assignment, posBonus, flawless: allPrimary };
}

/**
 * @param {object[]} starters  5 starter player objects (starters-only format)
 * @param {string|null} coachId
 * @param {{ asPlacedSlots?: string[] }} [opts]  when set, score fit against these
 *   placed slots (same order as starters) instead of optimizeLineup — for live UI
 * @returns {{ chemBonus: number, chemScore: number, chemReport: string[], chemEntries: object[], lineupAssignment: object[] }}
 */
export function calculateChemistry(starters, coachId = null, opts = {}) {
  const coach = coachId ?? ((typeof S !== 'undefined' && S.coach) ? S.coach : null);

  // Archetype shorthand
  const sA = starters.map(p => p.archetype || '');

  // Trait shorthand — safe even if a player has no traits array
  const sT = starters.flatMap(p => p.traits || []);

  // Pre-computed archetype flags
  const sHasPlaymaker    = sA.includes('Playmaker');
  const sHasSharpshooter = sA.includes('Sharpshooter');
  const sHasPaintBeast   = sA.includes('Paint Beast');
  const sHasLockdown     = sA.includes('Lockdown Defender');
  const sSharpCount      = sA.filter(a => a === 'Sharpshooter').length;
  const sSlashPaintCount = sA.filter(a => a === 'Slasher' || a === 'Paint Beast').length;
  const sDemandCount     = sA.filter(a => a === 'Playmaker').length;

  // Structured entries — the single source of truth. chemBonus, chemReport,
  // and the family-cap math are all derived from this list at the end.
  const entries = [];
  const add = (id, kind, family, bonus, label) => entries.push({ id, kind, family, bonus, label });
  // All positive synergy bonuses are scaled down 20% here — single point of
  // control so every call site (base and coach-boosted alike) stays in sync,
  // and the label's "(+N%)" is rewritten to match the post-scale value.
  const synergy = (id, family, bonus, label) => {
    const scaledBonus = bonus * SYNERGY_SCALE;
    const scaledLabel = label.replace(/\+\d+(?:\.\d+)?%/, `+${Math.round(scaledBonus * 100)}%`);
    add(id, 'synergy', family, scaledBonus, scaledLabel);
  };
  const penalty = (id, bonus, label) => add(id, 'penalty', null, -Math.abs(bonus), label);

  // ── PHASE 0: LINEUP OPTIMIZER (POSITIONAL FIT) ───────────────────────────────
  // Sim uses optimizeLineup (engine may rematch slots). Live draft UI passes
  // asPlacedSlots so Perfect Fit / Versatile lines match the visible roster.
  const { assignment, posBonus, flawless } = opts.asPlacedSlots
    ? placementLineup(starters, opts.asPlacedSlots)
    : optimizeLineup(starters);
  if (flawless) {
    synergy('flawless-construction', 'position', 0.07,
      'Flawless Construction: All 5 starters playing natural positions (+7%)');
    for (const { slot, player, bonus } of assignment) {
      synergy(`fit-${slot}`, 'position', bonus,
        `Perfect Fit: ${player.name} plays natural ${slot} (+3%)`);
    }
  } else {
    for (const { slot, player, fit, bonus } of assignment) {
      if (fit === 'primary') {
        synergy(`fit-${slot}`, 'position', bonus,
          `Perfect Fit: ${player.name} plays natural ${slot} (+3%)`);
      } else if (fit === 'flex') {
        synergy(`fit-${slot}`, 'position', bonus,
          `Flex Fit: ${player.name} (${player.pos}) covers ${slot} via secondary position (+2%)`);
      } else {
        synergy(`fit-${slot}`, 'position', bonus,
          `Versatile: ${player.name} fills the ${slot} role (+1%)`);
      }
    }
  }

  // ── PHASE 2: ARCHETYPE SYNERGIES ────────────────────────────────────────────

  if (sHasPlaymaker && sHasSharpshooter) {
    synergy('drive-and-kick', 'offense', 0.08,
      'Drive & Kick: Playmaker feeds the shooters (+8%)');
  }

  if (sHasPaintBeast && sHasLockdown) {
    const bonus = coach === 'auerbach' ? 0.10 : 0.08;
    synergy('twin-towers', 'defense', bonus,
      `Twin Towers${coach === 'auerbach' ? ' ⭐ Auerbach' : ''}: Interior dominance in the Starting 5 (+${Math.round(bonus * 100)}%)`);
  }

  if (sHasPlaymaker && sHasPaintBeast) {
    synergy('pick-and-roll', 'offense', 0.08,
      'Pick & Roll Maestros: Classic screen-and-roll starting duo (+8%)');
  }

  if (sHasPlaymaker && sSharpCount >= 2) {
    const bonus = coach === 'popovich' ? 0.09 : coach === 'kerr' ? 0.09 : coach === 'holzman' ? 0.09 : 0.07;
    synergy('floor-general', 'offense', bonus,
      `Floor General${coach === 'popovich' ? ' ⭐ Pop' : coach === 'kerr' ? ' ⭐ Kerr' : coach === 'holzman' ? ' ⭐ Holzman' : ''}: Starter Playmaker unlocks multiple shooters (+${Math.round(bonus * 100)}%)`);
  }

  const defAnchor = starters.find(
    p => (p.archetype === 'Lockdown Defender' || p.archetype === 'Paint Beast') &&
         (p.spg + p.bpg) >= 2.5
  );
  if (defAnchor) {
    const bonus = coach === 'auerbach' ? 0.09 : 0.07;
    synergy('defensive-anchor', 'defense', bonus,
      `Defensive Anchor${coach === 'auerbach' ? ' ⭐ Auerbach' : ''}: ${defAnchor.name.split(' ').pop()} anchors the defense (+${Math.round(bonus * 100)}%)`);
  }

  const sLockdownCount = sA.filter(a => a === 'Lockdown Defender').length;
  if (sLockdownCount >= 2) {
    const bonus = coach === 'auerbach' ? 0.09 : coach === 'holzman' ? 0.09 : 0.07;
    synergy('perimeter-lockdown', 'defense', bonus,
      `Perimeter Lockdown${coach === 'auerbach' ? ' ⭐ Auerbach' : coach === 'holzman' ? ' ⭐ Holzman' : ''}: Multiple locking wings in the Starting 5 (+${Math.round(bonus * 100)}%)`);
  }

  const sSlasherCount = sA.filter(a => a === 'Slasher').length;
  if (sHasPlaymaker && sSlasherCount >= 2) {
    const bonus = coach === 'kerr' ? 0.09 : 0.07;
    synergy('pace-and-space', 'offense', bonus,
      `Pace & Space Blitz${coach === 'kerr' ? ' ⭐ Kerr' : ''}: High transition attack engine ready (+${Math.round(bonus * 100)}%)`);
  }

  if (sSharpCount >= 3) {
    const bonus = coach === 'kerr' ? 0.08 : 0.05;
    synergy('small-ball-heat', 'offense', bonus,
      `Small Ball Heat${coach === 'kerr' ? ' ⭐ Kerr' : ''}: Spacing overload with 3+ shooters in the starting 5 (+${Math.round(bonus * 100)}%)`);
  }

  const stretchBig = starters.find(
    p => (p.pos === 'C' || p.pos === 'PF') && p.archetype === 'Sharpshooter'
  );
  if (stretchBig) {
    const bonus = coach === 'kerr' ? 0.08 : 0.05;
    synergy('stretch-five', 'offense', bonus,
      `Stretch Five Dynamic${coach === 'kerr' ? ' ⭐ Kerr' : ''}: ${stretchBig.name.split(' ').pop()} opens up the interior lane (+${Math.round(bonus * 100)}%)`);
  }

  const showtimePG      = starters.find(p => p.archetype === 'Playmaker' && p.apg  > 7.0);
  const showtimeSlasher = starters.find(p => p.archetype === 'Slasher'   && p.ppg  > 22.0);
  if (showtimePG && showtimeSlasher) {
    const bonus = coach === 'riley' ? 0.09 : 0.07;
    synergy('showtime', 'offense', bonus,
      `Showtime Transition${coach === 'riley' ? ' ⭐ Riley' : ''}: Fast break baseline fully synchronized (+${Math.round(bonus * 100)}%)`);
  }

  const teamCounts = {};
  for (const p of starters) {
    if (p.team) teamCounts[p.team] = (teamCounts[p.team] || 0) + 1;
  }
  if (Object.values(teamCounts).some(count => count >= 3)) {
    synergy('franchise-loyalty', 'intangibles', 0.05,
      'Franchise Loyalty: Shared franchise structure yields chemistry boost (+5%)');
  }

  if (sLockdownCount >= 3) {
    const bonus = (coach === 'riley' || coach === 'auerbach' || coach === 'rivers') ? 0.10 : 0.07;
    synergy('all-defensive-team', 'defense', bonus,
      `All-Defensive Team${coach === 'riley' ? ' ⭐ Riley' : coach === 'auerbach' ? ' ⭐ Auerbach' : coach === 'rivers' ? ' ⭐ Rivers' : ''}: High baseline lock pressure across the starting 5 (+${Math.round(bonus * 100)}%)`);
  }

  const helioPG = starters.find(p => p.archetype === 'Playmaker' && p.apg > 9.0);
  const otherStartersScoring = starters.filter(
    p => p.archetype !== 'Playmaker' && p.ppg > 14.0
  );
  if (
    helioPG &&
    starters.filter(p => p.archetype === 'Playmaker').length === 1 &&
    otherStartersScoring.length === 4
  ) {
    const bonus = coach === 'jackson' ? 0.09 : 0.07;
    synergy('heliocentric', 'offense', bonus,
      `Heliocentric Engine${coach === 'jackson' ? ' ⭐ Triangle' : ''}: System centered cleanly around ${helioPG.name.split(' ').pop()} (+${Math.round(bonus * 100)}%)`);
  }

  const startingPF = starters.find(p => p.pos === 'PF');
  const startingC  = starters.find(p => p.pos === 'C');
  if (startingPF?.archetype === 'Paint Beast' && startingC?.archetype === 'Paint Beast') {
    const bonus = coach === 'auerbach' ? 0.08 : 0.05;
    synergy('bully-ball', 'defense', bonus,
      `Bully Ball Frontcourt${coach === 'auerbach' ? ' ⭐ Auerbach' : ''}: Combined paint beasts completely overwhelm low blocks (+${Math.round(bonus * 100)}%)`);
  }

  const eliteScorers = starters.filter(p => p.ppg > 26.0);
  if (eliteScorers.length >= 2) {
    const bonus = coach === 'jackson' ? 0.09 : coach === 'rivers' ? 0.09 : 0.07;
    synergy('dynamic-duo', 'offense', bonus,
      `Dynamic Duo${coach === 'jackson' ? ' ⭐ Triangle' : coach === 'rivers' ? ' ⭐ Ubuntu' : ''}: Explosive baseline tandem active (+${Math.round(bonus * 100)}%)`);
  }

  const pfcBlocks = starters
    .filter(p => p.pos === 'PF' || p.pos === 'C')
    .reduce((sum, p) => sum + p.bpg, 0);
  if (starters.filter(p => p.pos === 'PF' || p.pos === 'C').length === 2 && pfcBlocks >= 3.5) {
    synergy('paint-patrol', 'defense', 0.05,
      'Paint Patrol: Defensive interior blocks active (+5%)');
  }

  if (sSharpCount >= 2 && sLockdownCount >= 2) {
    const bonus = coach === 'kerr' ? 0.09 : 0.07;
    synergy('three-and-d-paradigm', 'defense', bonus,
      `Three-and-D Paradigm${coach === 'kerr' ? ' ⭐ Kerr' : ''}: Flawless modern floor symmetry (+${Math.round(bonus * 100)}%)`);
  }

  const sPerimSteals = starters
    .filter(p => p.pos === 'PG' || p.pos === 'SG')
    .reduce((sum, p) => sum + p.spg, 0);
  if (starters.filter(p => p.pos === 'PG' || p.pos === 'SG').length === 2 && sPerimSteals >= 3.6) {
    synergy('perimeter-clamps', 'defense', 0.05,
      'Perimeter Clamps: Stifling backcourt on-ball pressure (+5%)');
  }

  // Dominant frontcourt rebounding
  const frontcourt = starters.filter(p => p.pos === 'SF' || p.pos === 'PF' || p.pos === 'C');
  const fcRPG      = frontcourt.reduce((sum, p) => sum + p.rpg, 0);
  if (frontcourt.length >= 2 && fcRPG > 28) {
    const bonus = coach === 'auerbach' ? 0.09 : 0.07;
    synergy('board-crashers', 'defense', bonus,
      `Board Crashers${coach === 'auerbach' ? ' ⭐ Auerbach' : ''}: Frontcourt dominates the glass (${fcRPG.toFixed(1)} RPG combined) (+${Math.round(bonus * 100)}%)`);
  }

  // Two-Way Pillars: Two-Way Star finally gets a positive synergy identity
  const sTwoWayCount = sA.filter(a => a === 'Two-Way Star').length;
  if (sTwoWayCount >= 2) {
    const bonus = (coach === 'kerr' || coach === 'auerbach') ? 0.09 : 0.08;
    synergy('two-way-pillars', 'defense', bonus,
      `Two-Way Pillars${coach === 'kerr' ? ' ⭐ Kerr' : coach === 'auerbach' ? ' ⭐ Auerbach' : ''}: 2+ Two-Way Stars in the starting 5 — switchable on every possession (+${Math.round(bonus * 100)}%)`);
  }

  // Inside-Out Attack: Sharpshooter spaces the floor for the Slasher to attack
  const sHasSlasher = sA.includes('Slasher');
  if (sHasSharpshooter && sHasSlasher) {
    const bonus = coach === 'kerr' ? 0.08 : 0.06;
    synergy('inside-out', 'offense', bonus,
      `Inside-Out Attack${coach === 'kerr' ? ' ⭐ Kerr' : ''}: Sharpshooter spaces the floor for the Slasher to attack (+${Math.round(bonus * 100)}%)`);
  }

  // Lockdown Stars: Two-Way Star + Lockdown Defender eliminate any matchup
  const sHasTwoWay = sA.includes('Two-Way Star');
  if (sHasTwoWay && sHasLockdown) {
    const bonus = (coach === 'riley' || coach === 'auerbach') ? 0.08 : 0.06;
    synergy('lockdown-stars', 'defense', bonus,
      `Lockdown Stars${coach === 'riley' ? ' ⭐ Riley' : coach === 'auerbach' ? ' ⭐ Auerbach' : ''}: Two-Way Star and Lockdown Defender erase any matchup (+${Math.round(bonus * 100)}%)`);
  }

  // ── PHASE 3: TRAIT SYNERGIES ──────────────────────────────────────────────────

  // Pre-computed trait counts used across synergies and penalties.
  // Every trait below exists in the live player DB — counts in comments are
  // from the 937-player audit (see docs/player-data-audit).
  const sTPointGod        = sT.filter(t => t === 'Point God').length;         // 27
  const sTElitePlaymaker  = sT.filter(t => t === 'Elite Playmaker').length;   // 135
  const sTRimProtector    = sT.filter(t => t === 'Rim Protector').length;     // 191
  const sTFloorSpacer     = sT.filter(t => t === 'Floor Spacer').length;      // 279
  const sTLockdownTrait   = sT.filter(t => t === 'Lockdown Defender').length; // 153
  const sTVolumeShooter   = sT.filter(t => t === 'Volume Shooter').length;    // 359
  const sTClutch          = sT.filter(t => t === 'Clutch').length;            // 240
  const sTGlueGuy         = sT.filter(t => t === 'Glue Guy').length;          // 219
  const sTRebMachine      = sT.filter(t => t === 'Rebounding Machine').length;// 105
  const sTHustle          = sT.filter(t => t === 'Hustle Player').length;     // 36
  const sTClutchAssassin  = sT.filter(t => t === 'Clutch Assassin').length;   // 68
  const sTDefStopper      = sT.filter(t => t === 'Defensive Stopper').length; // 81
  const sTFloorGeneral    = sT.filter(t => t === 'Floor General').length;     // 77
  const sTPostScorer      = sT.filter(t => t === 'Post Scorer').length;       // 62
  const sTMidRange        = sT.filter(t => t === 'Mid-Range Maestro').length; // 48
  const sTThreeAndD       = sT.filter(t => t === '3-and-D').length;           // 44
  const sTLobThreat       = sT.filter(t => t === 'Lob Threat').length;        // 3
  const sTSlasherTrait    = sT.filter(t => t === 'Slasher').length;           // 63

  // ── Synergies ─────────────────────────────────────────────────────────────────

  // Twin Engines: Point God + Elite Playmaker on two DIFFERENT starters
  const pgStarters = starters.filter(p => (p.traits || []).includes('Point God'));
  const epStarters = starters.filter(p => (p.traits || []).includes('Elite Playmaker'));
  const pgEpUnion  = new Set([...pgStarters, ...epStarters].map(p => p.id));
  if (sTPointGod >= 1 && sTElitePlaymaker >= 1 && pgEpUnion.size >= 2) {
    synergy('twin-engines', 'offense', 0.08,
      'Twin Engines: A Point God and an Elite Playmaker in the starting 5 — dual-facilitation overload (+8%)');
  }

  // Modern Trifecta: all three pillars of modern basketball in the starting 5
  if (sTElitePlaymaker >= 1 && sTRimProtector >= 1 && sTFloorSpacer >= 1) {
    synergy('modern-trifecta', 'offense', 0.08,
      'Modern Trifecta: Elite Playmaker + Rim Protector + Floor Spacer in the starting 5 (+8%)');
  }

  // Shot Clock Killers: two interior threats
  if (sTRimProtector >= 2) {
    synergy('shot-clock-killers', 'defense', 0.07,
      'Shot Clock Killers: 2+ Rim Protectors in the starting 5 — permanent paint threat every possession (+7%)');
  }

  // Defensive Wall: inside + outside sealed simultaneously
  if (sTRimProtector >= 1 && sTLockdownTrait >= 1) {
    synergy('defensive-wall', 'defense', 0.07,
      'Defensive Wall: Rim Protector and Lockdown Defender both in the starting 5 — inside and outside sealed (+7%)');
  }

  // Boards and Space: glass control meets floor gravity
  if (sTRebMachine >= 1 && sTFloorSpacer >= 1) {
    synergy('boards-and-space', 'offense', 0.06,
      'Boards and Space: Rebounding Machine and Floor Spacer in the starting 5 (+6%)');
  }

  // Clutch Culture: no chokers anywhere
  if (sTClutch >= 4) {
    synergy('clutch-culture', 'intangibles', 0.06,
      `Clutch Culture: ${sTClutch} clutch performers in the starting 5 — built for close games (+6%)`);
  }

  // Role Player Heaven: selfless starters free up the stars
  if (sTGlueGuy >= 2) {
    synergy('role-player-heaven', 'intangibles', 0.06,
      'Role Player Heaven: 2+ Glue Guys in the starting 5 — selfless core frees the stars (+6%)');
  }

  // 3-and-D Foundation: modern spacing-defense backbone
  if (sTLockdownTrait >= 1 && sTFloorSpacer >= 1) {
    synergy('three-and-d-foundation', 'defense', 0.05,
      '3-and-D Foundation: Lockdown Defender and Floor Spacer in the starting 5 (+5%)');
  }

  // Elite Spacing: maximum floor gravity
  if (sTFloorSpacer >= 3) {
    synergy('elite-spacing', 'offense', 0.05,
      `Elite Spacing: ${sTFloorSpacer} Floor Spacers in the starting 5 — maximum floor gravity (+5%)`);
  }

  // Ice In Their Veins: multiple closers dominate crunch time
  if (sTClutchAssassin >= 2) {
    synergy('ice-veins', 'intangibles', 0.05,
      `Ice In Their Veins: ${sTClutchAssassin} Clutch Assassins in the starting 5 thrive under 4th-quarter pressure (+5%)`);
  }

  // Second Chance City: grit generates extra possessions
  if (sTHustle >= 1) {
    synergy('second-chance-city', 'intangibles', 0.05,
      'Second Chance City: A Hustle Player on the roster — grit generates extra possessions (+5%)');
  }

  // Pinpoint Passing: a Point God dissects a spread floor.
  // (Retargeted from the nonexistent 'Court Vision' trait — it never fired.)
  if (sTPointGod >= 1 && sTFloorSpacer >= 2) {
    const bonus = coach === 'holzman' ? 0.09 : 0.07;
    synergy('pinpoint-passing', 'offense', bonus,
      `Pinpoint Passing${coach === 'holzman' ? ' ⭐ Holzman' : ''}: A Point God dissects defenses with ${sTFloorSpacer} shooters spread wide (+${Math.round(bonus * 100)}%)`);
  }

  // Kick-Out Game: post gravity creates open perimeter looks.
  // (Retargeted from the nonexistent 'Post Maestro' trait — it never fired.)
  if (sTPostScorer >= 1 && sTFloorSpacer >= 2) {
    synergy('kick-out-game', 'offense', 0.07,
      `Kick-Out Game: A Post Scorer creates for ${sTFloorSpacer} shooters spread around the perimeter (+7%)`);
  }

  // Two-Man Game: guard-big orchestration on two different starters
  // (Stockton–Malone fantasy; uses two previously-unused traits).
  const fgStarters = starters.filter(p => (p.traits || []).includes('Floor General'));
  const psStarters = starters.filter(p => (p.traits || []).includes('Post Scorer'));
  const fgPsUnion  = new Set([...fgStarters, ...psStarters].map(p => p.id));
  if (sTFloorGeneral >= 1 && sTPostScorer >= 1 && fgPsUnion.size >= 2) {
    const bonus = coach === 'popovich' ? 0.09 : 0.07;
    synergy('two-man-game', 'offense', bonus,
      `Two-Man Game${coach === 'popovich' ? ' ⭐ Pop' : ''}: Floor General and Post Scorer run endless guard-big actions (+${Math.round(bonus * 100)}%)`);
  }

  // Switch Everything: multiple positionless stoppers erase mismatches
  if (sTDefStopper >= 2) {
    const bonus = (coach === 'riley' || coach === 'rivers') ? 0.09 : 0.07;
    synergy('switch-everything', 'defense', bonus,
      `Switch Everything${coach === 'riley' ? ' ⭐ Riley' : coach === 'rivers' ? ' ⭐ Rivers' : ''}: ${sTDefStopper} Defensive Stoppers switch every screen without leaking a mismatch (+${Math.round(bonus * 100)}%)`);
  }

  // 3-and-D Corps: wings who hit corner threes AND guard the other star
  if (sTThreeAndD >= 2) {
    const bonus = coach === 'kerr' ? 0.08 : 0.06;
    synergy('three-and-d-corps', 'defense', bonus,
      `3-and-D Corps${coach === 'kerr' ? ' ⭐ Kerr' : ''}: ${sTThreeAndD} true 3-and-D wings — spacing on offense, clamps on defense (+${Math.round(bonus * 100)}%)`);
  }

  // Bucket Getters: shot creation that needs no spacing or setup
  if (sTMidRange >= 2) {
    const bonus = coach === 'jackson' ? 0.08 : 0.06;
    synergy('bucket-getters', 'offense', bonus,
      `Bucket Getters${coach === 'jackson' ? ' ⭐ Triangle' : ''}: ${sTMidRange} Mid-Range Maestros rise over any defense — no spacing required (+${Math.round(bonus * 100)}%)`);
  }

  // Lob City: a vertical-spacing big with an elite table-setter (rare — few
  // Lob Threats exist in the DB, so this is a delight, not a build target).
  if (sTLobThreat >= 1 && (sTPointGod >= 1 || sTElitePlaymaker >= 1)) {
    synergy('lob-city', 'offense', 0.04,
      'Lob City: An elite passer puts the Lob Threat on a permanent alley-oop track (+4%)');
  }

  // ── PHASE 3B: EXPANSION SYNERGIES ────────────────────────────────────────────
  // Balanced-coverage pass: gives every archetype and live trait at least one
  // positive identity (Volume Shooter's first, Two-Way Star's third/fourth)
  // and thickens the intangibles family (was 5 synergies vs 19/16 off/def).

  // Downhill Attack: multiple downhill drivers bend the defense every trip
  if (sTSlasherTrait >= 2) {
    const bonus = coach === 'riley' ? 0.08 : 0.06;
    synergy('downhill-attack', 'offense', bonus,
      `Downhill Attack${coach === 'riley' ? ' ⭐ Riley' : ''}: ${sTSlasherTrait} Slashers put relentless rim pressure on every trip (+${Math.round(bonus * 100)}%)`);
  }

  // Green Light: a gunner with a table-setter to feed him — Volume Shooter's
  // first positive identity (359 holders, previously penalty-only).
  const vsStarters = starters.filter(p => (p.traits || []).includes('Volume Shooter'));
  const vsFgUnion  = new Set([...vsStarters, ...fgStarters].map(p => p.id));
  if (sTVolumeShooter >= 1 && sTFloorGeneral >= 1 && vsFgUnion.size >= 2) {
    const bonus = coach === 'holzman' ? 0.08 : 0.06;
    synergy('green-light', 'offense', bonus,
      `Green Light${coach === 'holzman' ? ' ⭐ Holzman' : ''}: A Floor General keeps the Volume Shooter fed with clean looks (+${Math.round(bonus * 100)}%)`);
  }

  // High-Low Game: twin post hubs passing over the defense
  if (sTPostScorer >= 2) {
    const bonus = coach === 'jackson' ? 0.08 : 0.06;
    synergy('high-low-game', 'offense', bonus,
      `High-Low Game${coach === 'jackson' ? ' ⭐ Triangle' : ''}: ${sTPostScorer} Post Scorers play high-low over the top of the defense (+${Math.round(bonus * 100)}%)`);
  }

  // Three-Level Scoring: threats at the rim, the mid-range, and the arc
  if (sTFloorSpacer >= 1 && sTMidRange >= 1 && (sTSlasherTrait >= 1 || sTPostScorer >= 1)) {
    synergy('three-level-scoring', 'offense', 0.07,
      'Three-Level Scoring: Rim, mid-range, and arc all covered — nothing to scheme away (+7%)');
  }

  // No-Fly Zone: interior eraser plus a positionless stopper
  if (sTRimProtector >= 1 && sTDefStopper >= 1) {
    const bonus = coach === 'rivers' ? 0.08 : 0.06;
    synergy('no-fly-zone', 'defense', bonus,
      `No-Fly Zone${coach === 'rivers' ? ' ⭐ Rivers' : ''}: Rim Protector and Defensive Stopper close every airspace (+${Math.round(bonus * 100)}%)`);
  }

  // Junkyard Crew: grit plus clamps — loose balls never reach the offense
  if (sTHustle >= 1 && sTLockdownTrait >= 1) {
    const bonus = coach === 'auerbach' ? 0.07 : 0.05;
    synergy('junkyard-crew', 'defense', bonus,
      `Junkyard Crew${coach === 'auerbach' ? ' ⭐ Auerbach' : ''}: Hustle Player and Lockdown Defender turn every loose ball into a stop (+${Math.round(bonus * 100)}%)`);
  }

  // Glass Cleaners: two dedicated rebounders end possessions at one shot
  if (sTRebMachine >= 2) {
    const bonus = coach === 'auerbach' ? 0.08 : 0.06;
    synergy('glass-cleaners', 'defense', bonus,
      `Glass Cleaners${coach === 'auerbach' ? ' ⭐ Auerbach' : ''}: ${sTRebMachine} Rebounding Machines end every opponent possession at one shot (+${Math.round(bonus * 100)}%)`);
  }

  // Two-Way Anchor: a do-everything star backstopped by rim protection
  if (sHasTwoWay && sTRimProtector >= 1) {
    const bonus = coach === 'kerr' ? 0.08 : 0.06;
    synergy('two-way-anchor', 'defense', bonus,
      `Two-Way Anchor${coach === 'kerr' ? ' ⭐ Kerr' : ''}: Two-Way Star pressures the ball with a Rim Protector backstopping (+${Math.round(bonus * 100)}%)`);
  }

  // Captains' Council: ladders above Role Player Heaven (2+ Glue Guys)
  if (sTGlueGuy >= 3) {
    synergy('captains-council', 'intangibles', 0.06,
      `Captains' Council: ${sTGlueGuy} Glue Guys set the locker-room tone — zero agendas, all wins (+6%)`);
  }

  // Dagger Time: crunch-time pull-up shotmaking on two different starters
  const caStarters = starters.filter(p => (p.traits || []).includes('Clutch Assassin'));
  const mrStarters = starters.filter(p => (p.traits || []).includes('Mid-Range Maestro'));
  const caMrUnion  = new Set([...caStarters, ...mrStarters].map(p => p.id));
  if (sTClutchAssassin >= 1 && sTMidRange >= 1 && caMrUnion.size >= 2) {
    synergy('dagger-time', 'intangibles', 0.05,
      'Dagger Time: Clutch Assassin and Mid-Range Maestro trade daggers when it matters (+5%)');
  }

  // Lunch-Pail Crew: ladders above Second Chance City (1+ Hustle Player).
  // Rare (36 holders in the DB) — a delight, not a build target.
  if (sTHustle >= 2) {
    synergy('lunch-pail-crew', 'intangibles', 0.06,
      `Lunch-Pail Crew: ${sTHustle} Hustle Players — every 50/50 ball belongs to you (+6%)`);
  }

  // No-Ego Star: a Two-Way Star who also does the dirty work (same player)
  const noEgoStar = starters.find(
    p => p.archetype === 'Two-Way Star' && (p.traits || []).includes('Glue Guy')
  );
  if (noEgoStar) {
    synergy('no-ego-star', 'intangibles', 0.05,
      `No-Ego Star: ${noEgoStar.name.split(' ').pop()} stars on both ends and still does the dirty work (+5%)`);
  }

  // ── PHASE 4: PENALTIES ────────────────────────────────────────────────────────

  if (sSlashPaintCount >= 3 && !sHasSharpshooter) {
    penalty('no-spacing', 0.07,
      'No Spacing: Too many paint-cloggers, no shooters (-7%)');
  }

  if (sDemandCount >= 3) {
    const glueGuys = sT.filter(t => t === 'Glue Guy').length;
    if (coach !== 'rivers') {
      let amt = coach === 'jackson' ? 0.03 : 0.07;
      amt     = Math.max(0, amt - glueGuys * 0.015);
      if (amt > 0) {
        penalty('clashing-egos', amt,
          `Clashing Egos${coach === 'jackson' ? ' (softened by Phil)' : ''}: Too many ball-dominant players in the Starting 5 (-${Math.round(amt * 100)}%)`);
      }
    }
  }

  if (!sHasPlaymaker && starters.length > 4) {
    penalty('no-playmaking', 0.07,
      'No Playmaking: Zero Playmakers in the starting 5 — no one to run the offense (-7%)');
  }

  if (coach !== 'riley' && coach !== 'auerbach') {
    const defLiabilityCount = starters.filter(p => (p.spg + p.bpg) < 1.5).length;
    if (defLiabilityCount >= 3) {
      penalty('defensive-liability', 0.04,
        'Defensive Liability: 3+ starters have weak defensive stats (-4%)');
    }
  }

  const totalFcRPG = frontcourt.reduce((s, p) => s + p.rpg, 0);
  if (frontcourt.length >= 2 && !sHasPaintBeast && totalFcRPG < 18.0) {
    penalty('rebounding-crisis', 0.07,
      `Rebounding Crisis: Frontcourt combines for only ${totalFcRPG.toFixed(1)} RPG with no Paint Beast in sight (-7%)`);
  }

  const hasFrontDefend = frontcourt.some(
    p => p.archetype === 'Lockdown Defender' || p.archetype === 'Paint Beast'
  );
  if (frontcourt.length === 3 && !hasFrontDefend) {
    const amt = coach === 'kerr' ? 0.10 : coach === 'auerbach' ? 0.11 : 0.07;
    penalty('defensive-sieve', amt,
      `Defensive Sieve${coach === 'kerr' ? ' (heightened by Kerr)' : coach === 'auerbach' ? ' (critical for Auerbach)' : ''}: Starting frontcourt offers zero rim/wing protection (-${Math.round(amt * 100)}%)`);
  }

  const highUsageCount = starters.filter(p => p.ppg > 25.0 && p.apg < 5.0).length;
  if (highUsageCount >= 3) {
    penalty('high-usage-overlap', 0.07,
      'High Usage Overlap: 3+ starters average >25 PPG but <5 APG, stalling ball movement (-7%)');
  }

  const perimSlotsFilled = starters.filter(p => ['PG','SG','SF'].includes(p.pos)).length;
  const perimWeakCount   = starters.filter(p => ['PG','SG','SF'].includes(p.pos) && p.rpg < 4.5).length;
  if (perimSlotsFilled === 3 && perimWeakCount === 3) {
    penalty('small-ball-weakness', 0.05,
      'Small Ball Weakness: Perimeter group struggles on defensive boards (-5%)');
  }

  const weakScoringStarters = starters.filter(p => p.ppg < 12.0).length;
  if (weakScoringStarters >= 3) {
    penalty('offensive-black-hole', 0.07,
      'Offensive Black Hole: 3+ starters average under 12 PPG, killing floor gravity (-7%)');
  }

  if (coach !== 'auerbach') {
    const pfcBlocksLow = starters
      .filter(p => p.pos === 'PF' || p.pos === 'C')
      .reduce((sum, p) => sum + p.bpg, 0);
    if (starters.filter(p => p.pos === 'PF' || p.pos === 'C').length === 2 && pfcBlocksLow < 1.5) {
      penalty('no-paint-protection', 0.07,
        'No Paint Protection: Frontcourt blocks fall below 1.5 BPG (-7%)');
    }
  }

  // 3 or more starters locked to the same position — role clarity collapses
  // Exception: if secondary positions allow at least one player to slide over,
  // the logjam resolves automatically and no penalty is applied.
  const starterPosCounts = starters.reduce((acc, p) => {
    acc[p.pos] = (acc[p.pos] || 0) + 1; return acc;
  }, {});
  if (Object.values(starterPosCounts).some(n => n >= 3) && !logjamResolvable(starters)) {
    penalty('positional-logjam', 0.12,
      'Positional Logjam: 3+ starters play the same position — role clarity breaks down (-12%)');
  }

  // One-Note Roster: 4+ starters sharing one archetype — a single gear the
  // opponent can scheme against. Keeps 3-of-a-kind synergies (Small Ball
  // Heat, All-Defensive Team) net-positive while taxing the redundant 4th.
  // Two-Way Star is exempt: it is the versatility archetype — four of them
  // is the opposite of one-note.
  const archCounts = sA.reduce((acc, a) => { if (a) acc[a] = (acc[a] || 0) + 1; return acc; }, {});
  const dominantArch = Object.entries(archCounts).find(([a, n]) => n >= 4 && a !== 'Two-Way Star');
  if (dominantArch) {
    penalty('one-note-roster', 0.06,
      `One-Note Roster: ${dominantArch[1]} starters share the ${dominantArch[0]} archetype — one gear, easy to scheme against (-6%)`);
  }

  // No Post Presence: a two-big frontcourt with zero interior scoring touch —
  // mirrors No Paint Protection (blocks) and Rebounding Crisis (boards) on
  // the offensive end. An 18+ PPG big applies interior pressure regardless of
  // trait tagging, so high-scoring frontcourts are exempt.
  const pfcStarters = starters.filter(p => p.pos === 'PF' || p.pos === 'C');
  if (pfcStarters.length === 2 && !pfcStarters.some(
    p => p.archetype === 'Paint Beast' ||
         (p.traits || []).includes('Post Scorer') ||
         p.ppg >= 18.0
  )) {
    penalty('no-post-presence', 0.05,
      'No Post Presence: Neither big can score with their back to the basket — the defense never collapses (-5%)');
  }

  // Late-Clock Bailouts: nobody on the floor can create their own shot when
  // the play breaks down (no mid-range pull-up, no post-up, no downhill
  // slasher, no closer). A 24+ PPG scorer self-creates by definition — traits
  // alone under-tag elite scorers, so they exempt the roster.
  if (starters.length >= 5 &&
      sTMidRange === 0 && sTPostScorer === 0 && sTSlasherTrait === 0 && sTClutchAssassin === 0 &&
      !starters.some(p => p.ppg > 24.0)) {
    penalty('late-clock-bailouts', 0.05,
      'Late-Clock Bailouts: No self-creators anywhere — when the play breaks down, the possession dies (-5%)');
  }

  // ── PHASE 5: TRAIT PENALTIES ─────────────────────────────────────────────────

  // ISO Hell: ball-dominant starters with nobody to facilitate
  // (starters.length >= 5: "no Elite Playmaker anywhere" is only a fair
  // verdict once the roster is complete — same reasoning as Open Basket /
  // Mental Fragility / Spacing Nightmare below, which a partial roster
  // mid-draft or an AI-GM candidate score must not indict early.)
  if (sTVolumeShooter >= 3 && sTElitePlaymaker === 0 && starters.length >= 5) {
    penalty('iso-hell', 0.07,
      'ISO Hell: 3+ Volume Shooters in the starting 5 with no Elite Playmaker anywhere to facilitate (-7%)');
  }

  // Open Basket: no interior protection at all
  if (sTRimProtector === 0 && starters.length >= 5) {
    penalty('open-basket', 0.06,
      'Open Basket: No Rim Protector in the starting 5 — every drive finishes uncontested (-6%)');
  }

  // Mental Fragility: team folds in close games
  if (sTClutch === 0 && starters.length >= 5) {
    penalty('mental-fragility', 0.06,
      'Mental Fragility: No clutch performers in the starting 5 — team collapses in tight games (-6%)');
  }

  // Too Many Cooks: roster-wide ball-dominant congestion
  if (sTVolumeShooter >= 4) {
    penalty('too-many-cooks', 0.07,
      `Too Many Cooks: ${sTVolumeShooter} Volume Shooters in the starting 5 — everyone wants the ball, nobody passes (-7%)`);
  }

  // Spacing Nightmare: no spacing and no playmaking in the starting 5
  if (sTFloorSpacer === 0 && sTElitePlaymaker === 0 && starters.length >= 5) {
    penalty('spacing-nightmare', 0.05,
      'Spacing Nightmare: No Floor Spacers and no Elite Playmaker in the starting 5 — halfcourt offense collapses (-5%)');
  }

  // Scoring Drought: lockdown-heavy lineup with no scorers anywhere
  if (sTLockdownTrait >= 3 && sTVolumeShooter === 0 && starters.length >= 5) {
    penalty('scoring-drought', 0.05,
      'Scoring Drought: 3+ Lockdown Defenders in the starting 5 with no Volume Shooters anywhere to score (-5%)');
  }

  // Soft in the Paint: spacing without any rim protection
  if (sTFloorSpacer >= 3 && sTRimProtector === 0 && starters.length >= 5) {
    penalty('soft-in-the-paint', 0.05,
      'Soft in the Paint: 3+ Floor Spacers but no Rim Protector anywhere — annihilated at the rim (-5%)');
  }

  // ── PHASE 5B: EXPANSION PENALTIES ────────────────────────────────────────────
  // Counterweights for the Phase 3B synergies (stacking one identity plateaus,
  // same pattern as No Spacing vs Bully Ball) plus absence verdicts for trait
  // groups that previously had no penalty pathway. Absence checks are guarded
  // by starters.length >= 5 — a partial roster mid-draft or an AI-GM candidate
  // score must not be indicted for pieces it hasn't drafted yet.

  // All Gas No Brakes: downhill drivers with nobody pumping the brakes —
  // counterweight to Downhill Attack.
  if (sTSlasherTrait >= 3 && sTFloorGeneral === 0 && sTPointGod === 0 && starters.length >= 5) {
    penalty('all-gas-no-brakes', 0.05,
      'All Gas No Brakes: 3+ Slashers with no Floor General or Point God to steady the attack — turnovers pile up (-5%)');
  }

  // Matador Defense: perimeter counterpart to Open Basket (which covers the rim)
  if (sTLockdownTrait === 0 && sTDefStopper === 0 && sTThreeAndD === 0 && starters.length >= 5) {
    penalty('matador-defense', 0.06,
      'Matador Defense: No Lockdown Defender, Defensive Stopper, or 3-and-D wing anywhere — guards waltz to the paint (-6%)');
  }

  // Second-Chance Bleed: trait-side counterpart to the stat-based Rebounding
  // Crisis — skipped when that already fired so one weakness isn't billed twice.
  // A 10+ RPG starter controls the glass by definition — traits under-tag
  // elite rebounders (same reasoning as Late-Clock Bailouts' 24-PPG exemption).
  if (sTRebMachine === 0 && sTHustle === 0 && starters.length >= 5 &&
      !starters.some(p => p.rpg >= 10.0) &&
      !entries.some(e => e.id === 'rebounding-crisis')) {
    penalty('second-chance-bleed', 0.05,
      'Second-Chance Bleed: No Rebounding Machine or Hustle Player — opponents feast on putbacks (-5%)');
  }

  // Station-to-Station: no transition game at all — walk it up every trip
  if (sTSlasherTrait === 0 && !sHasSlasher &&
      !starters.some(p => p.archetype === 'Playmaker' && p.apg > 7.0) &&
      starters.length >= 5) {
    penalty('station-to-station', 0.04,
      'Station-to-Station: No Slashers and no up-tempo Playmaker — zero easy transition buckets (-4%)');
  }

  // Crowded Post: high-low bigs with no shooters to punish the double —
  // counterweight to High-Low Game.
  if (sTPostScorer >= 2 && sTFloorSpacer === 0) {
    penalty('crowded-post', 0.05,
      'Crowded Post: 2+ Post Scorers with zero Floor Spacers — defenses double the block without consequence (-5%)');
  }

  // Glue Overload: too selfless — nobody takes over. Deliberate tension with
  // Captains' Council: 3+ Glue Guys only cash in alongside a real star.
  if (sTGlueGuy >= 3 && !starters.some(p => p.ppg > 20.0) && starters.length >= 5) {
    penalty('glue-overload', 0.05,
      'Glue Overload: 3+ Glue Guys but no 20-PPG star to defer to — everyone passes, nobody takes over (-5%)');
  }

  // Closer Logjam: diminishing returns by design — with Ice In Their Veins
  // (+5% at 2+) a third Clutch Assassin nets out to roughly +1%.
  if (sTClutchAssassin >= 3) {
    penalty('closer-logjam', 0.04,
      `Closer Logjam: ${sTClutchAssassin} Clutch Assassins all want the last shot — crunch-time possessions stall (-4%)`);
  }

  // Whose Team Is It: star-stacking without a connector. 22-PPG threshold
  // targets true heliocentric star piles, not every strong starting five —
  // star-chasing is the game's core fantasy and shouldn't be taxed by default.
  if (starters.filter(p => p.ppg > 22.0).length >= 4 && sTGlueGuy === 0 && starters.length >= 5) {
    penalty('whose-team-is-it', 0.05,
      'Whose Team Is It: 4+ 22-PPG scorers and zero Glue Guys — no one connects the pieces (-5%)');
  }

  // Gunners Galore: milder cousin of ISO Hell (which keys off Elite Playmaker);
  // fires when the table-setter traits are missing entirely. Skipped when ISO
  // Hell already fired so the same shape isn't billed twice.
  if (sTVolumeShooter >= 3 && sTFloorGeneral === 0 && sTPointGod === 0 && starters.length >= 5 &&
      !entries.some(e => e.id === 'iso-hell')) {
    penalty('gunners-galore', 0.04,
      'Gunners Galore: 3+ Volume Shooters with no Floor General or Point God to set the table (-4%)');
  }

  // Soft Two-Way: keeps the One-Note Roster exemption honest — stacking
  // Two-Way Stars is only fine when the defensive tags back it up.
  const twStarters = starters.filter(p => p.archetype === 'Two-Way Star');
  const DEF_TRAITS = ['Lockdown Defender', 'Defensive Stopper', '3-and-D', 'Rim Protector'];
  if (twStarters.length >= 3 &&
      !twStarters.some(p => (p.traits || []).some(t => DEF_TRAITS.includes(t)))) {
    penalty('soft-two-way', 0.04,
      'Soft Two-Way: 3+ Two-Way Stars but none carry a real defensive tag — the label doesn\'t guard anyone (-4%)');
  }

  // ── FAMILY CAPS + FINAL SCORE ────────────────────────────────────────────────
  // Sum positives per family; overflow past the family cap is trimmed and
  // reported as an info line so the player learns to diversify. Penalties are
  // never capped.
  let chemBonus = 0;
  const familySums = {};
  for (const e of entries) {
    if (e.kind === 'synergy') familySums[e.family] = (familySums[e.family] || 0) + e.bonus;
    else if (e.kind === 'penalty') chemBonus += e.bonus;
  }
  for (const [family, sum] of Object.entries(familySums)) {
    const cap = FAMILY_CAPS[family] ?? Infinity;
    if (sum > cap + 1e-9) {
      chemBonus += cap;
      add(`cap-${family}`, 'info', family, 0,
        `${FAMILY_LABEL[family]} synergies maxed: capped at +${Math.round(cap * 100)}% — diversify the build to gain more`);
    } else {
      chemBonus += sum;
    }
  }

  const chemScore  = chemScoreFromBonus(chemBonus);
  const chemReport = entries.map(e => (e.kind === 'penalty' ? '🔴 ' : '🟢 ') + e.label);
  return { chemBonus, chemScore, chemReport, chemEntries: entries, lineupAssignment: assignment };
}

/**
 * Returns true if the positional logjam (3+ starters at the same pos) can be
 * resolved by sliding one or more players to their secondary position.
 *
 * Uses backtracking over each player's [primary, ...secondary] options.
 * Worst case: 2^5 = 32 paths — negligible.
 *
 * @param {object[]} starters
 * @returns {boolean}
 */
function logjamResolvable(starters) {
  const posOptions = starters.map(p => [p.pos, ...(p.secondaryPos || [])]);

  function tryAssign(idx, counts) {
    if (idx === posOptions.length) {
      return Object.values(counts).every(n => n < 3);
    }
    for (const pos of posOptions[idx]) {
      counts[pos] = (counts[pos] || 0) + 1;
      if (tryAssign(idx + 1, counts)) {
        counts[pos]--;
        return true;
      }
      counts[pos]--;
    }
    return false;
  }

  return tryAssign(0, {});
}
