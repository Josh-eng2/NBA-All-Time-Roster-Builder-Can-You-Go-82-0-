/**
 * js/logic/chemistry.js — Advanced Team Chemistry Engine
 *
 * calculateChemistry(starters, coachId?)
 *   Uses coachId when provided; otherwise falls back to S.coach.
 *   Returns { chemBonus, chemScore, chemReport }.
 *
 *   chemBonus  — raw float added to adjustedStrength in simulation
 *   chemScore  — 0–100 display value (70 baseline = neutral roster)
 *   chemReport — array of human-readable strings (🟢 synergies / 🔴 penalties)
 */

import { S } from '../logic/state.js';

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
 * @returns {{ assignment: object[], posBonus: number, posReport: string[], flawless: boolean }}
 */
function optimizeLineup(starters) {
  const n = Math.min(starters.length, 5);
  if (n === 0) return { assignment: [], posBonus: 0, posReport: [], flawless: false };

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

  // Build human-readable report
  const posReport = [];
  if (allPrimary) {
    posReport.push('🟢 Flawless Construction: All 5 starters playing natural positions (+7%)');
    for (const { slot, player } of assignment) {
      posReport.push(`🟢 Perfect Fit: ${player.name} plays natural ${slot} (+3%)`);
    }
  } else {
    for (const { slot, player, fit } of assignment) {
      if (fit === 'primary') {
        posReport.push(`🟢 Perfect Fit: ${player.name} plays natural ${slot} (+3%)`);
      } else if (fit === 'flex') {
        posReport.push(`🟢 Flex Fit: ${player.name} (${player.pos}) covers ${slot} via secondary position (+2%)`);
      } else {
        posReport.push(`🟢 Versatile: ${player.name} fills the ${slot} role (+1%)`);
      }
    }
  }

  return { assignment, posBonus, posReport, flawless: allPrimary };
}

/**
 * @param {object[]} starters  5 starter player objects (starters-only format)
 * @returns {{ chemBonus: number, chemScore: number, chemReport: string[], lineupAssignment: object[] }}
 */
export function calculateChemistry(starters, coachId = null) {
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

  let chemBonus = 0;
  const chemReport = [];

  // ── PHASE 0: LINEUP OPTIMIZER (POSITIONAL FIT) ───────────────────────────────
  const { assignment, posBonus, posReport, flawless } = optimizeLineup(starters);
  chemBonus += posBonus;
  for (const line of posReport) chemReport.push(line);

  // ── PHASE 2: ARCHETYPE SYNERGIES ────────────────────────────────────────────

  if (sHasPlaymaker && sHasSharpshooter) {
    chemBonus += 0.08;
    chemReport.push('🟢 Drive & Kick: Playmaker feeds the shooters (+8%)');
  }

  if (sHasPaintBeast && sHasLockdown) {
    const bonus = coach === 'auerbach' ? 0.10 : 0.08;
    chemBonus += bonus;
    chemReport.push(`🟢 Twin Towers${coach === 'auerbach' ? ' ⭐ Auerbach' : ''}: Interior dominance in the Starting 5 (+${Math.round(bonus * 100)}%)`);
  }

  if (sHasPlaymaker && sHasPaintBeast) {
    chemBonus += 0.08;
    chemReport.push('🟢 Pick & Roll Maestros: Classic screen-and-roll starting duo (+8%)');
  }

  if (sHasPlaymaker && sSharpCount >= 2) {
    const bonus = coach === 'popovich' ? 0.09 : coach === 'kerr' ? 0.09 : coach === 'holzman' ? 0.09 : 0.07;
    chemBonus += bonus;
    chemReport.push(`🟢 Floor General${coach === 'popovich' ? ' ⭐ Pop' : coach === 'kerr' ? ' ⭐ Kerr' : coach === 'holzman' ? ' ⭐ Holzman' : ''}: Starter Playmaker unlocks multiple shooters (+${Math.round(bonus * 100)}%)`);
  }

  const defAnchor = starters.find(
    p => (p.archetype === 'Lockdown Defender' || p.archetype === 'Paint Beast') &&
         (p.spg + p.bpg) >= 2.5
  );
  if (defAnchor) {
    const bonus = coach === 'auerbach' ? 0.09 : 0.07;
    chemBonus += bonus;
    chemReport.push(`🟢 Defensive Anchor${coach === 'auerbach' ? ' ⭐ Auerbach' : ''}: ${defAnchor.name.split(' ').pop()} anchors the defense (+${Math.round(bonus * 100)}%)`);
  }

  const sLockdownCount = sA.filter(a => a === 'Lockdown Defender').length;
  if (sLockdownCount >= 2) {
    const bonus = coach === 'auerbach' ? 0.09 : coach === 'holzman' ? 0.09 : 0.07;
    chemBonus += bonus;
    chemReport.push(`🟢 Perimeter Lockdown${coach === 'auerbach' ? ' ⭐ Auerbach' : coach === 'holzman' ? ' ⭐ Holzman' : ''}: Multiple locking wings in the Starting 5 (+${Math.round(bonus * 100)}%)`);
  }

  const sSlasherCount = sA.filter(a => a === 'Slasher').length;
  if (sHasPlaymaker && sSlasherCount >= 2) {
    const bonus = coach === 'kerr' ? 0.09 : 0.07;
    chemBonus += bonus;
    chemReport.push(`🟢 Pace & Space Blitz${coach === 'kerr' ? ' ⭐ Kerr' : ''}: High transition attack engine ready (+${Math.round(bonus * 100)}%)`);
  }

  if (sSharpCount >= 3) {
    const bonus = coach === 'kerr' ? 0.08 : 0.05;
    chemBonus += bonus;
    chemReport.push(`🟢 Small Ball Heat${coach === 'kerr' ? ' ⭐ Kerr' : ''}: Spacing overload with 3+ shooters in the starting 5 (+${Math.round(bonus * 100)}%)`);
  }

  const stretchBig = starters.find(
    p => (p.pos === 'C' || p.pos === 'PF') && p.archetype === 'Sharpshooter'
  );
  if (stretchBig) {
    const bonus = coach === 'kerr' ? 0.08 : 0.05;
    chemBonus += bonus;
    chemReport.push(`🟢 Stretch Five Dynamic${coach === 'kerr' ? ' ⭐ Kerr' : ''}: ${stretchBig.name.split(' ').pop()} opens up the interior lane (+${Math.round(bonus * 100)}%)`);
  }

  const showtimePG      = starters.find(p => p.archetype === 'Playmaker' && p.apg  > 7.0);
  const showtimeSlasher = starters.find(p => p.archetype === 'Slasher'   && p.ppg  > 22.0);
  if (showtimePG && showtimeSlasher) {
    const bonus = coach === 'riley' ? 0.09 : 0.07;
    chemBonus += bonus;
    chemReport.push(`🟢 Showtime Transition${coach === 'riley' ? ' ⭐ Riley' : ''}: Fast break baseline fully synchronized (+${Math.round(bonus * 100)}%)`);
  }

  const teamCounts = {};
  for (const p of starters) {
    if (p.team) teamCounts[p.team] = (teamCounts[p.team] || 0) + 1;
  }
  if (Object.values(teamCounts).some(count => count >= 3)) {
    chemBonus += 0.05;
    chemReport.push('🟢 Franchise Loyalty: Shared franchise structure yields chemistry boost (+5%)');
  }

  if (sLockdownCount >= 3) {
    const bonus = (coach === 'riley' || coach === 'auerbach' || coach === 'rivers') ? 0.10 : 0.07;
    chemBonus += bonus;
    chemReport.push(`🟢 All-Defensive Team${coach === 'riley' ? ' ⭐ Riley' : coach === 'auerbach' ? ' ⭐ Auerbach' : coach === 'rivers' ? ' ⭐ Rivers' : ''}: High baseline lock pressure across the starting 5 (+${Math.round(bonus * 100)}%)`);
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
    chemBonus += bonus;
    chemReport.push(`🟢 Heliocentric Engine${coach === 'jackson' ? ' ⭐ Triangle' : ''}: System centered cleanly around ${helioPG.name.split(' ').pop()} (+${Math.round(bonus * 100)}%)`);
  }

  const startingPF = starters.find(p => p.pos === 'PF');
  const startingC  = starters.find(p => p.pos === 'C');
  if (startingPF?.archetype === 'Paint Beast' && startingC?.archetype === 'Paint Beast') {
    const bonus = coach === 'auerbach' ? 0.08 : 0.05;
    chemBonus += bonus;
    chemReport.push(`🟢 Bully Ball Frontcourt${coach === 'auerbach' ? ' ⭐ Auerbach' : ''}: Combined paint beasts completely overwhelm low blocks (+${Math.round(bonus * 100)}%)`);
  }

  const eliteScorers = starters.filter(p => p.ppg > 26.0);
  if (eliteScorers.length >= 2) {
    const bonus = coach === 'jackson' ? 0.09 : coach === 'rivers' ? 0.09 : 0.07;
    chemBonus += bonus;
    chemReport.push(`🟢 Dynamic Duo${coach === 'jackson' ? ' ⭐ Triangle' : coach === 'rivers' ? ' ⭐ Ubuntu' : ''}: Explosive baseline tandem active (+${Math.round(bonus * 100)}%)`);
  }

  const pfcBlocks = starters
    .filter(p => p.pos === 'PF' || p.pos === 'C')
    .reduce((sum, p) => sum + p.bpg, 0);
  if (starters.filter(p => p.pos === 'PF' || p.pos === 'C').length === 2 && pfcBlocks >= 3.5) {
    chemBonus += 0.05;
    chemReport.push('🟢 Paint Patrol: Defensive interior blocks active (+5%)');
  }

  if (sSharpCount >= 2 && sLockdownCount >= 2) {
    const bonus = coach === 'kerr' ? 0.09 : 0.07;
    chemBonus += bonus;
    chemReport.push(`🟢 Three-and-D Paradigm${coach === 'kerr' ? ' ⭐ Kerr' : ''}: Flawless modern floor symmetry (+${Math.round(bonus * 100)}%)`);
  }

  const sPerimSteals = starters
    .filter(p => p.pos === 'PG' || p.pos === 'SG')
    .reduce((sum, p) => sum + p.spg, 0);
  if (starters.filter(p => p.pos === 'PG' || p.pos === 'SG').length === 2 && sPerimSteals >= 3.6) {
    chemBonus += 0.05;
    chemReport.push('🟢 Perimeter Clamps: Stifling backcourt on-ball pressure (+5%)');
  }

  // Dominant frontcourt rebounding
  const frontcourt = starters.filter(p => p.pos === 'SF' || p.pos === 'PF' || p.pos === 'C');
  const fcRPG      = frontcourt.reduce((sum, p) => sum + p.rpg, 0);
  if (frontcourt.length >= 2 && fcRPG > 28) {
    const bonus = coach === 'auerbach' ? 0.09 : 0.07;
    chemBonus += bonus;
    chemReport.push(`🟢 Board Crashers${coach === 'auerbach' ? ' ⭐ Auerbach' : ''}: Frontcourt dominates the glass (${fcRPG.toFixed(1)} RPG combined) (+${Math.round(bonus * 100)}%)`);
  }

  // Two-Way Pillars: Two-Way Star finally gets a positive synergy identity
  const sTwoWayCount = sA.filter(a => a === 'Two-Way Star').length;
  if (sTwoWayCount >= 2) {
    const bonus = (coach === 'kerr' || coach === 'auerbach') ? 0.09 : 0.08;
    chemBonus += bonus;
    chemReport.push(`🟢 Two-Way Pillars${coach === 'kerr' ? ' ⭐ Kerr' : coach === 'auerbach' ? ' ⭐ Auerbach' : ''}: 2+ Two-Way Stars in the starting 5 — switchable on every possession (+${Math.round(bonus * 100)}%)`);
  }

  // Inside-Out Attack: Sharpshooter spaces the floor for the Slasher to attack
  const sHasSlasher = sA.includes('Slasher');
  if (sHasSharpshooter && sHasSlasher) {
    const bonus = coach === 'kerr' ? 0.08 : 0.06;
    chemBonus += bonus;
    chemReport.push(`🟢 Inside-Out Attack${coach === 'kerr' ? ' ⭐ Kerr' : ''}: Sharpshooter and Slasher create an unsolvable spacing dilemma (+${Math.round(bonus * 100)}%)`);
  }

  // Lockdown Stars: Two-Way Star + Lockdown Defender eliminate any matchup
  const sHasTwoWay = sA.includes('Two-Way Star');
  if (sHasTwoWay && sHasLockdown) {
    const bonus = (coach === 'riley' || coach === 'auerbach') ? 0.08 : 0.06;
    chemBonus += bonus;
    chemReport.push(`🟢 Lockdown Stars${coach === 'riley' ? ' ⭐ Riley' : coach === 'auerbach' ? ' ⭐ Auerbach' : ''}: Two-Way Star and Lockdown Defender erase any matchup (+${Math.round(bonus * 100)}%)`);
  }

  // ── PHASE 3: TRAIT SYNERGIES ──────────────────────────────────────────────────

  // Pre-computed trait counts used across synergies and penalties
  const sTPointGod        = sT.filter(t => t === 'Point God').length;
  const sTElitePlaymaker  = sT.filter(t => t === 'Elite Playmaker').length;
  const sTRimProtector    = sT.filter(t => t === 'Rim Protector').length;
  const sTFloorSpacer     = sT.filter(t => t === 'Floor Spacer').length;
  const sTLockdownTrait   = sT.filter(t => t === 'Lockdown Defender').length;
  const sTVolumeShooter   = sT.filter(t => t === 'Volume Shooter').length;
  const sTClutch          = sT.filter(t => t === 'Clutch').length;
  const sTGlueGuy         = sT.filter(t => t === 'Glue Guy').length;
  const sTRebMachine      = sT.filter(t => t === 'Rebounding Machine').length;
  const sTHustle          = sT.filter(t => t === 'Hustle Player').length;
  const sTClutchAssassin  = sT.filter(t => t === 'Clutch Assassin').length;
  const sTChampDNA        = sT.filter(t => t === 'Championship DNA').length;
  const sTCourtVision     = sT.filter(t => t === 'Court Vision').length;
  const sTIronMan         = sT.filter(t => t === 'Iron Man').length;
  const sTPostMaestro     = sT.filter(t => t === 'Post Maestro').length;

  // ── Synergies ─────────────────────────────────────────────────────────────────

  // Twin Engines: Point God + Elite Playmaker on two DIFFERENT starters
  const pgStarters = starters.filter(p => (p.traits || []).includes('Point God'));
  const epStarters = starters.filter(p => (p.traits || []).includes('Elite Playmaker'));
  const pgEpUnion  = new Set([...pgStarters, ...epStarters].map(p => p.id));
  if (sTPointGod >= 1 && sTElitePlaymaker >= 1 && pgEpUnion.size >= 2) {
    chemBonus += 0.08;
    chemReport.push('🟢 Twin Engines: A Point God and an Elite Playmaker in the starting 5 — dual-facilitation overload (+8%)');
  }

  // Modern Trifecta: all three pillars of modern basketball in the starting 5
  if (sTElitePlaymaker >= 1 && sTRimProtector >= 1 && sTFloorSpacer >= 1) {
    chemBonus += 0.08;
    chemReport.push('🟢 Modern Trifecta: Elite Playmaker + Rim Protector + Floor Spacer in the starting 5 (+8%)');
  }

  // Shot Clock Killers: two interior threats
  if (sTRimProtector >= 2) {
    chemBonus += 0.07;
    chemReport.push('🟢 Shot Clock Killers: 2+ Rim Protectors in the starting 5 — permanent paint threat every possession (+7%)');
  }

  // Defensive Wall: inside + outside sealed simultaneously
  if (sTRimProtector >= 1 && sTLockdownTrait >= 1) {
    chemBonus += 0.07;
    chemReport.push('🟢 Defensive Wall: Rim Protector and Lockdown Defender both in the starting 5 — inside and outside sealed (+7%)');
  }

  // Boards and Space: glass control meets floor gravity
  if (sTRebMachine >= 1 && sTFloorSpacer >= 1) {
    chemBonus += 0.06;
    chemReport.push('🟢 Boards and Space: Rebounding Machine and Floor Spacer in the starting 5 (+6%)');
  }

  // Clutch Culture: no chokers anywhere
  if (sTClutch >= 4) {
    chemBonus += 0.06;
    chemReport.push(`🟢 Clutch Culture: ${sTClutch} clutch performers in the starting 5 — built for close games (+6%)`);
  }

  // Role Player Heaven: selfless starters free up the stars
  if (sTGlueGuy >= 2) {
    chemBonus += 0.06;
    chemReport.push('🟢 Role Player Heaven: 2+ Glue Guys in the starting 5 — selfless core frees the stars (+6%)');
  }

  // 3-and-D Foundation: modern spacing-defense backbone
  if (sTLockdownTrait >= 1 && sTFloorSpacer >= 1) {
    chemBonus += 0.05;
    chemReport.push('🟢 3-and-D Foundation: Lockdown Defender and Floor Spacer in the starting 5 (+5%)');
  }

  // Elite Spacing: maximum floor gravity
  if (sTFloorSpacer >= 3) {
    chemBonus += 0.05;
    chemReport.push(`🟢 Elite Spacing: ${sTFloorSpacer} Floor Spacers in the starting 5 — maximum floor gravity (+5%)`);
  }

  // Ice In Their Veins: multiple closers dominate crunch time
  if (sTClutchAssassin >= 2) {
    chemBonus += 0.05;
    chemReport.push(`🟢 Ice In Their Veins: ${sTClutchAssassin} Clutch Assassins in the starting 5 thrive under 4th-quarter pressure (+5%)`);
  }

  // Second Chance City: grit generates extra possessions
  if (sTHustle >= 1) {
    chemBonus += 0.05;
    chemReport.push('🟢 Second Chance City: A Hustle Player on the roster — grit generates extra possessions (+5%)');
  }

  // Winner's Circle: championship pedigree across the roster
  if (sTChampDNA >= 2) {
    const bonus = sTChampDNA >= 3 ? 0.10 : 0.08;
    chemBonus += bonus;
    chemReport.push(`🟢 Winner's Circle: ${sTChampDNA} players with Championship DNA — rings breed rings (+${Math.round(bonus * 100)}%)`);
  }

  // Pinpoint Passing: Court Vision starter feeds wide-open shooters
  if (sTCourtVision >= 1 && sTFloorSpacer >= 2) {
    chemBonus += 0.07;
    chemReport.push(`🟢 Pinpoint Passing: A Court Vision starter dissects defenses with ${sTFloorSpacer} shooters spread wide (+7%)`);
  }

  // Iron Man: bulletproof durability on the roster
  if (sTIronMan >= 1) {
    chemBonus += 0.04;
    chemReport.push('🟢 Iron Man: Bulletproof durability on the roster — no load management needed (+4%)');
  }

  // Kick-Out Game: Post Maestro creates kick-out looks for perimeter shooters
  if (sTPostMaestro >= 1 && sTFloorSpacer >= 2) {
    chemBonus += 0.07;
    chemReport.push(`🟢 Kick-Out Game: Post Maestro creates for ${sTFloorSpacer} shooters spread around the perimeter (+7%)`);
  }

  // ── PHASE 4: PENALTIES ────────────────────────────────────────────────────────

  if (sSlashPaintCount >= 3 && !sHasSharpshooter) {
    chemBonus -= 0.07;
    chemReport.push('🔴 No Spacing: Too many paint-cloggers, no shooters (-7%)');
  }

  if (sDemandCount >= 3) {
    const glueGuys = sT.filter(t => t === 'Glue Guy').length;
    if (coach !== 'rivers') {
      let penalty = coach === 'jackson' ? 0.03 : 0.07;
      penalty     = Math.max(0, penalty - glueGuys * 0.015);
      if (penalty > 0) {
        chemBonus -= penalty;
        chemReport.push(`🔴 Clashing Egos${coach === 'jackson' ? ' (softened by Phil)' : ''}: Too many ball-dominant players in the Starting 5 (-${Math.round(penalty * 100)}%)`);
      }
    }
  }

  if (!sHasPlaymaker && starters.length > 4) {
    chemBonus -= 0.07;
    chemReport.push('🔴 No Playmaking: Zero Playmakers in the starting 5 — no one to run the offense (-7%)');
  }

  if (coach !== 'riley' && coach !== 'auerbach') {
    const defLiabilityCount = starters.filter(p => (p.spg + p.bpg) < 1.5).length;
    if (defLiabilityCount >= 3) {
      chemBonus -= 0.04;
      chemReport.push('🔴 Defensive Liability: 3+ starters have weak defensive stats (-4%)');
    }
  }

  const totalFcRPG = frontcourt.reduce((s, p) => s + p.rpg, 0);
  if (frontcourt.length >= 2 && !sHasPaintBeast && totalFcRPG < 18.0) {
    chemBonus -= 0.07;
    chemReport.push(`🔴 Rebounding Crisis: Frontcourt combines for only ${totalFcRPG.toFixed(1)} RPG with no Paint Beast in sight (-7%)`);
  }

  const hasFrontDefend = frontcourt.some(
    p => p.archetype === 'Lockdown Defender' || p.archetype === 'Paint Beast'
  );
  if (frontcourt.length === 3 && !hasFrontDefend) {
    const penalty = coach === 'kerr' ? 0.10 : coach === 'auerbach' ? 0.11 : 0.07;
    chemBonus -= penalty;
    chemReport.push(`🔴 Defensive Sieve${coach === 'kerr' ? ' (heightened by Kerr)' : coach === 'auerbach' ? ' (critical for Auerbach)' : ''}: Starting frontcourt offers zero rim/wing protection (-${Math.round(penalty * 100)}%)`);
  }

  const highUsageCount = starters.filter(p => p.ppg > 25.0 && p.apg < 5.0).length;
  if (highUsageCount >= 3) {
    chemBonus -= 0.07;
    chemReport.push('🔴 High Usage Overlap: 3+ starters average >25 PPG but <5 APG, stalling ball movement (-7%)');
  }

  const perimSlotsFilled = starters.filter(p => ['PG','SG','SF'].includes(p.pos)).length;
  const perimWeakCount   = starters.filter(p => ['PG','SG','SF'].includes(p.pos) && p.rpg < 4.5).length;
  if (perimSlotsFilled === 3 && perimWeakCount === 3) {
    chemBonus -= 0.05;
    chemReport.push('🔴 Small Ball Weakness: Perimeter group struggles on defensive boards (-5%)');
  }

  const weakScoringStarters = starters.filter(p => p.ppg < 12.0).length;
  if (weakScoringStarters >= 3) {
    chemBonus -= 0.07;
    chemReport.push('🔴 Offensive Black Hole: 3+ starters average under 12 PPG, killing floor gravity (-7%)');
  }

  if (coach !== 'auerbach') {
    const pfcBlocksLow = starters
      .filter(p => p.pos === 'PF' || p.pos === 'C')
      .reduce((sum, p) => sum + p.bpg, 0);
    if (starters.filter(p => p.pos === 'PF' || p.pos === 'C').length === 2 && pfcBlocksLow < 1.5) {
      chemBonus -= 0.07;
      chemReport.push('🔴 No Paint Protection: Frontcourt blocks fall below 1.5 BPG (-7%)');
    }
  }

  // 3 or more starters locked to the same position — role clarity collapses
  // Exception: if secondary positions allow at least one player to slide over,
  // the logjam resolves automatically and no penalty is applied.
  const starterPosCounts = starters.reduce((acc, p) => {
    acc[p.pos] = (acc[p.pos] || 0) + 1; return acc;
  }, {});
  if (Object.values(starterPosCounts).some(n => n >= 3) && !logjamResolvable(starters)) {
    chemBonus -= 0.12;
    chemReport.push('🔴 Positional Logjam: 3+ starters play the same position — role clarity breaks down (-12%)');
  }

  // ── PHASE 5: TRAIT PENALTIES ─────────────────────────────────────────────────

  // ISO Hell: ball-dominant starters with nobody to facilitate
  if (sTVolumeShooter >= 3 && sTElitePlaymaker === 0) {
    chemBonus -= 0.07;
    chemReport.push('🔴 ISO Hell: 3+ Volume Shooters in the starting 5 with no Elite Playmaker anywhere to facilitate (-7%)');
  }

  // Open Basket: no interior protection at all
  if (sTRimProtector === 0 && starters.length >= 5) {
    chemBonus -= 0.06;
    chemReport.push('🔴 Open Basket: No Rim Protector in the starting 5 — every drive finishes uncontested (-6%)');
  }

  // Mental Fragility: team folds in close games
  if (sTClutch === 0 && starters.length >= 5) {
    chemBonus -= 0.06;
    chemReport.push('🔴 Mental Fragility: No clutch performers in the starting 5 — team collapses in tight games (-6%)');
  }

  // Too Many Cooks: roster-wide ball-dominant congestion
  if (sTVolumeShooter >= 4) {
    chemBonus -= 0.07;
    chemReport.push(`🔴 Too Many Cooks: ${sTVolumeShooter} Volume Shooters in the starting 5 — everyone wants the ball, nobody passes (-7%)`);
  }

  // Spacing Nightmare: no spacing and no playmaking in the starting 5
  if (sTFloorSpacer === 0 && sTElitePlaymaker === 0 && starters.length >= 5) {
    chemBonus -= 0.05;
    chemReport.push('🔴 Spacing Nightmare: No Floor Spacers and no Elite Playmaker in the starting 5 — halfcourt offense collapses (-5%)');
  }

  // Scoring Drought: lockdown-heavy lineup with no scorers anywhere
  if (sTLockdownTrait >= 3 && sTVolumeShooter === 0) {
    chemBonus -= 0.05;
    chemReport.push('🔴 Scoring Drought: 3+ Lockdown Defenders in the starting 5 with no Volume Shooters anywhere to score (-5%)');
  }

  // Soft in the Paint: spacing without any rim protection
  if (sTFloorSpacer >= 3 && sTRimProtector === 0) {
    chemBonus -= 0.05;
    chemReport.push('🔴 Soft in the Paint: 3+ Floor Spacers but no Rim Protector anywhere — annihilated at the rim (-5%)');
  }

  // ── FINAL SCORE (scaled so 0.80 chemBonus = 100) ─────────────────────────────
  // Positional-only teams land ~"Neutral"; stacking synergies across archetypes and
  // traits reaches "Strong"; a complete elite build approaches 100%.
  const chemScore = Math.round(Math.max(0, Math.min(100, (chemBonus / 1.10) * 100)));
  return { chemBonus, chemScore, chemReport, lineupAssignment: assignment };
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
