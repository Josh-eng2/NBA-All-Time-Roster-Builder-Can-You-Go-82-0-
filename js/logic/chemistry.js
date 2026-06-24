/**
 * js/logic/chemistry.js — Team Chemistry Engine
 *
 * calculateChemistry(starters, bench)
 *   Reads S.coach for coach-specific amplifiers/suppressors.
 *   Returns { chemBonus, chemScore, chemReport }.
 *
 *   chemBonus  — raw float added to adjustedStrength in simulation
 *   chemScore  — 0–100 display value
 *   chemReport — array of human-readable strings (🟢 synergies / 🔴 penalties)
 */

import { S } from '../logic/state.js';

/**
 * @param {object[]} starters  5 starter player objects
 * @param {object[]} bench     up to 3 bench player objects
 * @returns {{ chemBonus: number, chemScore: number, chemReport: string[] }}
 */
export function calculateChemistry(starters, bench) {
  const allPlayers = [...starters, ...bench];
  const sA = starters.map(p => p.archetype || '');
  const bA = bench.map(p => p.archetype || '');
  const aA = [...sA, ...bA];

  const sHasPlaymaker    = sA.includes('Playmaker');
  const sHasSharpshooter = sA.includes('Sharpshooter');
  const sHasPaintBeast   = sA.includes('Paint Beast');
  const sHasLockdown     = sA.includes('Lockdown Defender');
  const aHasPlaymaker    = aA.includes('Playmaker');
  const aHasSharpshooter = aA.includes('Sharpshooter');
  const aHasPaintBeast   = aA.includes('Paint Beast');
  const aHasLockdown     = aA.includes('Lockdown Defender');
  const aSharpCount      = aA.filter(a => a === 'Sharpshooter').length;
  const sSlashPaintCount = sA.filter(a => a === 'Slasher' || a === 'Paint Beast').length;
  const aSlashPaintCount = aA.filter(a => a === 'Slasher' || a === 'Paint Beast').length;
  const sDemandCount     = sA.filter(a => a === 'Two-Way Star' || a === 'Playmaker').length;

  const coach = (typeof S !== 'undefined' && S.coach) ? S.coach : null;

  let chemBonus = 0;
  const chemReport = [];

  // ── SYNERGIES ────────────────────────────────────────────────────────────

  if (sHasPlaymaker && sHasSharpshooter) {
    chemBonus += 0.10;
    chemReport.push('🟢 Drive & Kick (Elite ×1.5): Starter Playmaker feeds Starter Shooters (+10%)');
  } else if (aHasPlaymaker && aHasSharpshooter) {
    chemBonus += 0.07;
    chemReport.push('🟢 Drive & Kick: Playmaker feeds the shooters (+7%)');
  }

  if (sHasPaintBeast && sHasLockdown) {
    chemBonus += 0.10;
    chemReport.push('🟢 Twin Towers (Elite ×1.5): Interior dominance in the Starting 5 (+10%)');
  } else if (aHasPaintBeast && aHasLockdown) {
    chemBonus += 0.07;
    chemReport.push('🟢 Twin Towers: Interior dominance on both ends (+7%)');
  }

  if (sHasPlaymaker && sHasPaintBeast) {
    chemBonus += 0.10;
    chemReport.push('🟢 Pick & Roll Maestros (Elite ×1.5): Classic screen-and-roll starting duo (+10%)');
  } else if (aHasPlaymaker && aHasPaintBeast) {
    chemBonus += 0.07;
    chemReport.push('🟢 Pick & Roll Maestros: Playmaker and Paint Beast asset tracking (+7%)');
  }

  if (sHasPlaymaker && aSharpCount >= 2) {
    const bonus = coach === 'popovich' ? 0.12 : 0.08;
    chemBonus += bonus;
    chemReport.push(`🟢 Floor General${coach === 'popovich' ? ' ⭐ Pop' : ''}: Starter Playmaker unlocks multiple shooters (+${Math.round(bonus * 100)}%)`);
  }

  const defAnchor = starters.find(
    p => (p.archetype === 'Lockdown Defender' || p.archetype === 'Paint Beast') &&
         (p.spg + p.bpg) >= 2.5
  );
  if (defAnchor) {
    chemBonus += 0.08;
    chemReport.push(`🟢 Defensive Anchor: ${defAnchor.name.split(' ').pop()} anchors the defense (+8%)`);
  }

  const sLockdownCount = sA.filter(a => a === 'Lockdown Defender').length;
  if (sLockdownCount >= 2) {
    chemBonus += 0.08;
    chemReport.push('🟢 Perimeter Lockdown: Multiple locking wings in the Starting 5 (+8%)');
  }

  const aSlasherCount = aA.filter(a => a === 'Slasher').length;
  if (aHasPlaymaker && aSlasherCount >= 2) {
    const bonus = coach === 'dantoni' ? 0.12 : 0.08;
    chemBonus += bonus;
    chemReport.push(`🟢 Pace & Space Blitz${coach === 'dantoni' ? " ⭐ D'Antoni" : ''}: High transition attack engine ready (+${Math.round(bonus * 100)}%)`);
  }

  if (aSharpCount >= 3) {
    const bonus = coach === 'dantoni' ? 0.105 : 0.07;
    chemBonus += bonus;
    chemReport.push(`🟢 Small Ball Heat${coach === 'dantoni' ? " ⭐ D'Antoni" : ''}: Spacing overload with 3+ shooters on the roster (+${+(bonus * 100).toFixed(1)}%)`);
  }

  const sixthMan = bench.find(p => p.ppg > 18.0);
  if (sixthMan) {
    chemBonus += 0.06;
    chemReport.push(`🟢 Sixth Man Spark: ${sixthMan.name.split(' ').pop()} provides elite scoring off the bench (+6%)`);
  }

  const stretchBig = starters.find(
    p => (p.pos === 'C' || p.pos === 'PF') && p.archetype === 'Sharpshooter'
  );
  if (stretchBig) {
    chemBonus += 0.07;
    chemReport.push(`🟢 Stretch Five Dynamic: ${stretchBig.name.split(' ').pop()} opens up the interior lane (+7%)`);
  }

  const showtimePG      = starters.find(p => p.archetype === 'Playmaker'  && p.apg  > 7.0);
  const showtimeSlasher = starters.find(p => p.archetype === 'Slasher'    && p.ppg  > 22.0);
  if (showtimePG && showtimeSlasher) {
    const bonus = coach === 'riley' ? 0.12 : 0.08;
    chemBonus += bonus;
    chemReport.push(`🟢 Showtime Transition${coach === 'riley' ? ' ⭐ Riley' : ''}: Fast break baseline fully synchronized (+${Math.round(bonus * 100)}%)`);
  }

  const teamCounts = {};
  for (const p of allPlayers) {
    if (p.team) teamCounts[p.team] = (teamCounts[p.team] || 0) + 1;
  }
  if (Object.values(teamCounts).some(count => count >= 3)) {
    chemBonus += 0.07;
    chemReport.push('🟢 Franchise Loyalty: Shared franchise structure yields chemistry boost (+7%)');
  }

  const aLockdownCount = aA.filter(a => a === 'Lockdown Defender').length;
  if (aLockdownCount >= 3) {
    const bonus = coach === 'riley' ? 0.135 : 0.09;
    chemBonus += bonus;
    chemReport.push(`🟢 All-Defensive Team${coach === 'riley' ? ' ⭐ Riley' : ''}: High baseline lock pressure across roster (+${+(bonus * 100).toFixed(1)}%)`);
  }

  const helioPG = starters.find(p => p.archetype === 'Playmaker' && p.apg > 9.0);
  const otherStartersScoring = starters.filter(
    p => p.archetype !== 'Playmaker' && p.ppg > 16.0
  );
  if (
    helioPG &&
    starters.filter(p => p.archetype === 'Playmaker').length === 1 &&
    otherStartersScoring.length === 4
  ) {
    const bonus = coach === 'jackson' ? 0.12 : 0.08;
    chemBonus += bonus;
    chemReport.push(`🟢 Heliocentric Engine${coach === 'jackson' ? ' ⭐ Triangle' : ''}: System centered cleanly around ${helioPG.name.split(' ').pop()} (+${Math.round(bonus * 100)}%)`);
  }

  const startingPF = starters.find(p => p.pos === 'PF');
  const startingC  = starters.find(p => p.pos === 'C');
  if (startingPF?.archetype === 'Paint Beast' && startingC?.archetype === 'Paint Beast') {
    chemBonus += 0.07;
    chemReport.push('🟢 Bully Ball Frontcourt: Combined paint beasts completely overwhelm low blocks (+7%)');
  }

  const eliteScorers = starters.filter(p => p.ppg > 26.0);
  if (eliteScorers.length >= 2) {
    const bonus = coach === 'jackson' ? 0.12 : 0.08;
    chemBonus += bonus;
    chemReport.push(`🟢 Dynamic Duo${coach === 'jackson' ? ' ⭐ Triangle' : ''}: Explosive baseline tandem active (+${Math.round(bonus * 100)}%)`);
  }

  const pfcBlocks = starters
    .filter(p => p.pos === 'PF' || p.pos === 'C')
    .reduce((sum, p) => sum + p.bpg, 0);
  if (starters.filter(p => p.pos === 'PF' || p.pos === 'C').length === 2 && pfcBlocks >= 3.5) {
    chemBonus += 0.07;
    chemReport.push('🟢 Paint Patrol: Defensive interior blocks active (+7%)');
  }

  if (bench.some(p => p.archetype === 'Playmaker')) {
    const bonus = coach === 'popovich' ? 0.09 : 0.06;
    chemBonus += bonus;
    chemReport.push(`🟢 Second Unit General${coach === 'popovich' ? ' ⭐ Pop' : ''}: Secondary unit run by a natural Playmaker (+${Math.round(bonus * 100)}%)`);
  }

  if (aSharpCount >= 2 && aLockdownCount >= 2) {
    chemBonus += 0.08;
    chemReport.push('🟢 Three-and-D Paradigm: Flawless modern floor symmetry (+8%)');
  }

  const sPerimSteals = starters
    .filter(p => p.pos === 'PG' || p.pos === 'SG')
    .reduce((sum, p) => sum + p.spg, 0);
  if (starters.filter(p => p.pos === 'PG' || p.pos === 'SG').length === 2 && sPerimSteals >= 3.6) {
    chemBonus += 0.07;
    chemReport.push('🟢 Perimeter Clamps: Stifling backcourt on-ball pressure (+7%)');
  }

  // ── PENALTIES ───────────────────────────────────────────────────────────────

  if (aSlashPaintCount >= 3 && !aHasSharpshooter) {
    const penalty = sSlashPaintCount >= 3 ? 0.06 : 0.04;
    chemBonus -= penalty;
    chemReport.push(`🔴 No Spacing: Too many paint-cloggers, no shooters (-${Math.round(penalty * 100)}%)`);
  }

  if (sDemandCount >= 3) {
    const penalty = coach === 'jackson' ? 0.02 : 0.05;
    chemBonus -= penalty;
    chemReport.push(`🔴 Clashing Egos${coach === 'jackson' ? ' (softened by Phil)' : ''}: Too many ball-dominant players in the Starting 5 (-${Math.round(penalty * 100)}%)`);
  }

  if (!aHasPlaymaker) {
    chemBonus -= 0.05;
    chemReport.push('🔴 No Playmaking: Zero Playmakers on the roster — no one to run the offense (-5%)');
  }

  if (coach !== 'riley') {
    const defLiabilityCount = starters.filter(p => (p.spg + p.bpg) < 1.5).length;
    if (defLiabilityCount >= 3) {
      chemBonus -= 0.02;
      chemReport.push('🔴 Defensive Liability: 3+ starters have weak defensive stats (-2%)');
    }
  }

  const startingC_Reb = starters.find(p => p.pos === 'C');
  if (!aHasPaintBeast && startingC_Reb && startingC_Reb.rpg < 8.0) {
    chemBonus -= 0.05;
    chemReport.push('🔴 Rebounding Crisis: Missing length/boards inside paint (-5%)');
  }

  if (sSlashPaintCount >= 3 && sDemandCount >= 3) {
    chemBonus -= 0.05;
    chemReport.push('🔴 Ball Stoppers: Isolation overlaps halt ball movement (-5%)');
  }

  const sFrontcourt    = starters.filter(p => p.pos === 'SF' || p.pos === 'PF' || p.pos === 'C');
  const hasFrontDefend = sFrontcourt.some(
    p => p.archetype === 'Lockdown Defender' || p.archetype === 'Paint Beast'
  );
  if (sFrontcourt.length === 3 && !hasFrontDefend) {
    const penalty = coach === 'dantoni' ? 0.08 : 0.05;
    chemBonus -= penalty;
    chemReport.push(`🔴 Defensive Sieve${coach === 'dantoni' ? " (heightened by D'Antoni)" : ''}: Starting frontcourt offers zero rim/wing protection (-${Math.round(penalty * 100)}%)`);
  }

  const highUsageCount = starters.filter(p => p.ppg > 25.0 && p.apg < 5.0).length;
  if (highUsageCount >= 3) {
    chemBonus -= 0.05;
    chemReport.push('🔴 High Usage Overlap: 3+ starters average >25.0 PPG but <5.0 APG, stalling ball movement (-5%)');
  }

  const perimSlotsFilled = starters.filter(p => ['PG','SG','SF'].includes(p.pos)).length;
  const perimWeakCount   = starters.filter(p => ['PG','SG','SF'].includes(p.pos) && p.rpg < 4.5).length;
  if (perimSlotsFilled === 3 && perimWeakCount === 3) {
    chemBonus -= 0.04;
    chemReport.push('🔴 Small Ball Weakness: Perimeter group struggles on defensive boards (-4%)');
  }

  const weakScoringStarters = starters.filter(p => p.ppg < 12.0).length;
  if (weakScoringStarters >= 3) {
    chemBonus -= 0.05;
    chemReport.push('🔴 Offensive Black Hole: 3+ starters average under 12.0 PPG, killing floor gravity (-5%)');
  }

  const pfcBlocksLow = starters
    .filter(p => p.pos === 'PF' || p.pos === 'C')
    .reduce((sum, p) => sum + p.bpg, 0);
  if (starters.filter(p => p.pos === 'PF' || p.pos === 'C').length === 2 && pfcBlocksLow < 1.5) {
    chemBonus -= 0.05;
    chemReport.push('🔴 No Paint Protection: Frontcourt blocks fall below 1.5 BPG (-5%)');
  }

  if (coach !== 'popovich' && (starters.length + bench.length) === 8) {
    const benchTotalPpg = bench.reduce((sum, p) => sum + p.ppg, 0);
    if (benchTotalPpg < 32.0) {
      chemBonus -= 0.04;
      chemReport.push(`🔴 Barren Bench: Bench combines for only ${benchTotalPpg.toFixed(1)} PPG — starters can't rest (-4%)`);
    }
  }

  const chemScore = Math.round(Math.max(0, Math.min(100, 70 + (chemBonus / 0.60) * 30)));
  return { chemBonus, chemScore, chemReport };
}

