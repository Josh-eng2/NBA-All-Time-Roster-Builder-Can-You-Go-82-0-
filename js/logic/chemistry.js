/**
 * js/logic/chemistry.js — Advanced Team Chemistry Engine
 *
 * calculateChemistry(starters, bench)
 *   Reads S.coach for coach-specific amplifiers/suppressors.
 *   Returns { chemBonus, chemScore, chemReport }.
 *
 *   chemBonus  — raw float added to adjustedStrength in simulation
 *   chemScore  — 0–100 display value (70 baseline = neutral roster)
 *   chemReport — array of human-readable strings (🟢 synergies / 🔴 penalties)
 */

import { S } from '../logic/state.js';

/**
 * @param {object[]} starters  5 starter player objects
 * @param {object[]} bench     2 bench player objects
 * @returns {{ chemBonus: number, chemScore: number, chemReport: string[] }}
 */
export function calculateChemistry(starters, bench) {
  const allPlayers = [...starters, ...bench];
  const coach = (typeof S !== 'undefined' && S.coach) ? S.coach : null;

  // Archetype shorthand
  const sA = starters.map(p => p.archetype || '');
  const bA = bench.map(p => p.archetype || '');
  const aA = [...sA, ...bA];

  // Trait shorthand — safe even if a player has no traits array
  const sT = starters.flatMap(p => p.traits || []);
  const aT = allPlayers.flatMap(p => p.traits || []);

  // Pre-computed archetype flags
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

  let chemBonus = 0;
  const chemReport = [];

  // ── PHASE 1: USAGE & OFFENSIVE FLOW ──────────────────────────────────────────
  // Dynamic scoring saturation: top 3 scorers demanding too many shots.
  // Glue Guys on the floor and Phil Jackson's triangle reduce the penalty.
  const top3PPG = [...starters].sort((a, b) => b.ppg - a.ppg).slice(0, 3)
    .reduce((s, p) => s + p.ppg, 0);
  if (top3PPG > 80) {
    const glueCount = sT.filter(t => t === 'Glue Guy').length;
    let satPenalty  = (top3PPG - 80) * 0.005;
    if (coach === 'jackson') satPenalty *= 0.4;
    satPenalty = Math.max(0, satPenalty - glueCount * 0.015);
    if (satPenalty > 0) {
      chemBonus -= satPenalty;
      chemReport.push(`🔴 Scoring Saturation: Top 3 scorers combine for ${top3PPG.toFixed(1)} PPG — shot distribution strained (-${Math.round(satPenalty * 100)}%)`);
    }
  }

  // ── PHASE 2: ARCHETYPE SYNERGIES ────────────────────────────────────────────

  if (sHasPlaymaker && sHasSharpshooter) {
    chemBonus += 0.10;
    chemReport.push('🟢 Drive & Kick (Elite ×1.5): Starter Playmaker feeds Starter Shooters (+10%)');
  } else if (aHasPlaymaker && aHasSharpshooter) {
    chemBonus += 0.07;
    chemReport.push('🟢 Drive & Kick: Playmaker feeds the shooters (+7%)');
  }

  if (sHasPaintBeast && sHasLockdown) {
    const bonus = coach === 'auerbach' ? 0.14 : 0.10;
    chemBonus += bonus;
    chemReport.push(`🟢 Twin Towers (Elite ×1.5)${coach === 'auerbach' ? ' ⭐ Auerbach' : ''}: Interior dominance in the Starting 5 (+${Math.round(bonus * 100)}%)`);
  } else if (aHasPaintBeast && aHasLockdown) {
    const bonus = coach === 'auerbach' ? 0.10 : 0.07;
    chemBonus += bonus;
    chemReport.push(`🟢 Twin Towers${coach === 'auerbach' ? ' ⭐ Auerbach' : ''}: Interior dominance on both ends (+${Math.round(bonus * 100)}%)`);
  }

  if (sHasPlaymaker && sHasPaintBeast) {
    chemBonus += 0.10;
    chemReport.push('🟢 Pick & Roll Maestros (Elite ×1.5): Classic screen-and-roll starting duo (+10%)');
  } else if (aHasPlaymaker && aHasPaintBeast) {
    chemBonus += 0.07;
    chemReport.push('🟢 Pick & Roll Maestros: Playmaker and Paint Beast asset tracking (+7%)');
  }

  if (sHasPlaymaker && aSharpCount >= 2) {
    const bonus = coach === 'popovich' ? 0.12 : coach === 'kerr' ? 0.11 : 0.08;
    chemBonus += bonus;
    chemReport.push(`🟢 Floor General${coach === 'popovich' ? ' ⭐ Pop' : coach === 'kerr' ? ' ⭐ Kerr' : ''}: Starter Playmaker unlocks multiple shooters (+${Math.round(bonus * 100)}%)`);
  }

  const defAnchor = starters.find(
    p => (p.archetype === 'Lockdown Defender' || p.archetype === 'Paint Beast') &&
         (p.spg + p.bpg) >= 2.5
  );
  if (defAnchor) {
    const bonus = coach === 'auerbach' ? 0.12 : 0.08;
    chemBonus += bonus;
    chemReport.push(`🟢 Defensive Anchor${coach === 'auerbach' ? ' ⭐ Auerbach' : ''}: ${defAnchor.name.split(' ').pop()} anchors the defense (+${Math.round(bonus * 100)}%)`);
  }

  const sLockdownCount = sA.filter(a => a === 'Lockdown Defender').length;
  if (sLockdownCount >= 2) {
    const bonus = coach === 'auerbach' ? 0.12 : 0.08;
    chemBonus += bonus;
    chemReport.push(`🟢 Perimeter Lockdown${coach === 'auerbach' ? ' ⭐ Auerbach' : ''}: Multiple locking wings in the Starting 5 (+${Math.round(bonus * 100)}%)`);
  }

  const aSlasherCount = aA.filter(a => a === 'Slasher').length;
  if (aHasPlaymaker && aSlasherCount >= 2) {
    const bonus = coach === 'kerr' ? 0.12 : 0.08;
    chemBonus += bonus;
    chemReport.push(`🟢 Pace & Space Blitz${coach === 'kerr' ? ' ⭐ Kerr' : ''}: High transition attack engine ready (+${Math.round(bonus * 100)}%)`);
  }

  if (aSharpCount >= 3) {
    const bonus = coach === 'kerr' ? 0.105 : 0.07;
    chemBonus += bonus;
    chemReport.push(`🟢 Small Ball Heat${coach === 'kerr' ? ' ⭐ Kerr' : ''}: Spacing overload with 3+ shooters on the roster (+${+(bonus * 100).toFixed(1)}%)`);
  }

  const sixthMan = bench.find(p => p.ppg > 18.0);
  if (sixthMan) {
    const bonus = coach === 'popovich' ? 0.09 : 0.06;
    chemBonus += bonus;
    chemReport.push(`🟢 Sixth Man Spark${coach === 'popovich' ? ' ⭐ Pop' : ''}: ${sixthMan.name.split(' ').pop()} provides elite scoring off the bench (+${Math.round(bonus * 100)}%)`);
  }

  const stretchBig = starters.find(
    p => (p.pos === 'C' || p.pos === 'PF') && p.archetype === 'Sharpshooter'
  );
  if (stretchBig) {
    const bonus = coach === 'kerr' ? 0.10 : 0.07;
    chemBonus += bonus;
    chemReport.push(`🟢 Stretch Five Dynamic${coach === 'kerr' ? ' ⭐ Kerr' : ''}: ${stretchBig.name.split(' ').pop()} opens up the interior lane (+${Math.round(bonus * 100)}%)`);
  }

  const showtimePG      = starters.find(p => p.archetype === 'Playmaker' && p.apg  > 7.0);
  const showtimeSlasher = starters.find(p => p.archetype === 'Slasher'   && p.ppg  > 22.0);
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
    const bonus = (coach === 'riley' || coach === 'auerbach') ? 0.135 : 0.09;
    chemBonus += bonus;
    chemReport.push(`🟢 All-Defensive Team${coach === 'riley' ? ' ⭐ Riley' : coach === 'auerbach' ? ' ⭐ Auerbach' : ''}: High baseline lock pressure across roster (+${+(bonus * 100).toFixed(1)}%)`);
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
    const bonus = coach === 'auerbach' ? 0.10 : 0.07;
    chemBonus += bonus;
    chemReport.push(`🟢 Bully Ball Frontcourt${coach === 'auerbach' ? ' ⭐ Auerbach' : ''}: Combined paint beasts completely overwhelm low blocks (+${Math.round(bonus * 100)}%)`);
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
    const bonus = coach === 'kerr' ? 0.11 : 0.08;
    chemBonus += bonus;
    chemReport.push(`🟢 Three-and-D Paradigm${coach === 'kerr' ? ' ⭐ Kerr' : ''}: Flawless modern floor symmetry (+${Math.round(bonus * 100)}%)`);
  }

  const sPerimSteals = starters
    .filter(p => p.pos === 'PG' || p.pos === 'SG')
    .reduce((sum, p) => sum + p.spg, 0);
  if (starters.filter(p => p.pos === 'PG' || p.pos === 'SG').length === 2 && sPerimSteals >= 3.6) {
    chemBonus += 0.07;
    chemReport.push('🟢 Perimeter Clamps: Stifling backcourt on-ball pressure (+7%)');
  }

  // Dominant frontcourt rebounding
  const frontcourt = starters.filter(p => p.pos === 'SF' || p.pos === 'PF' || p.pos === 'C');
  const fcRPG      = frontcourt.reduce((sum, p) => sum + p.rpg, 0);
  if (frontcourt.length >= 2 && fcRPG > 28) {
    const bonus = coach === 'auerbach' ? 0.11 : 0.08;
    chemBonus += bonus;
    chemReport.push(`🟢 Board Crashers${coach === 'auerbach' ? ' ⭐ Auerbach' : ''}: Frontcourt dominates the glass (${fcRPG.toFixed(1)} RPG combined) (+${Math.round(bonus * 100)}%)`);
  }

  // ── PHASE 3: TRAIT SYNERGIES ──────────────────────────────────────────────────

  if (sT.includes('Point God') && sT.includes('Lob Threat')) {
    chemBonus += 0.08;
    chemReport.push('🟢 Lob City: A Point God feeding a premier Lob Threat — automatic highlight reel (+8%)');
  }

  const clutchCount = aT.filter(t => t === 'Clutch Assassin' || t === 'Mamba Mentality').length;
  if (clutchCount >= 2) {
    chemBonus += 0.06;
    chemReport.push(`🟢 Ice In Their Veins: ${clutchCount} closers on the roster thrive under 4th-quarter pressure (+6%)`);
  }

  // Elite bench: shot creator AND floor orchestrator — different players
  const benchSpark        = bench.find(p => p.ppg > 18.0 || p.traits?.includes('Microwave'));
  const benchOrchestrator = bench.find(
    p => p.archetype === 'Playmaker' || p.traits?.includes('Floor General')
  );
  if (benchSpark && benchOrchestrator && benchSpark !== benchOrchestrator) {
    const bonus = coach === 'popovich' ? 0.09 : 0.06;
    chemBonus += bonus;
    chemReport.push(`🟢 Elite Second Unit${coach === 'popovich' ? ' ⭐ Pop' : ''}: Bench pairs a shot-creator with an orchestrator (+${Math.round(bonus * 100)}%)`);
  }

  // ── PHASE 4: PENALTIES ────────────────────────────────────────────────────────

  if (aSlashPaintCount >= 3 && !aHasSharpshooter) {
    const penalty = sSlashPaintCount >= 3 ? 0.06 : 0.04;
    chemBonus -= penalty;
    chemReport.push(`🔴 No Spacing: Too many paint-cloggers, no shooters (-${Math.round(penalty * 100)}%)`);
  }

  if (sDemandCount >= 3) {
    const glueGuys = sT.filter(t => t === 'Glue Guy').length;
    let penalty    = coach === 'jackson' ? 0.02 : 0.05;
    penalty        = Math.max(0, penalty - glueGuys * 0.015);
    if (penalty > 0) {
      chemBonus -= penalty;
      chemReport.push(`🔴 Clashing Egos${coach === 'jackson' ? ' (softened by Phil)' : ''}: Too many ball-dominant players in the Starting 5 (-${Math.round(penalty * 100)}%)`);
    }
  }

  if (!aHasPlaymaker) {
    chemBonus -= 0.05;
    chemReport.push('🔴 No Playmaking: Zero Playmakers on the roster — no one to run the offense (-5%)');
  }

  if (coach !== 'riley' && coach !== 'auerbach') {
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
    const penalty = coach === 'kerr' ? 0.08 : coach === 'auerbach' ? 0.09 : 0.05;
    chemBonus -= penalty;
    chemReport.push(`🔴 Defensive Sieve${coach === 'kerr' ? ' (heightened by Kerr)' : coach === 'auerbach' ? ' (critical for Auerbach)' : ''}: Starting frontcourt offers zero rim/wing protection (-${Math.round(penalty * 100)}%)`);
  }

  const highUsageCount = starters.filter(p => p.ppg > 25.0 && p.apg < 5.0).length;
  if (highUsageCount >= 3) {
    chemBonus -= 0.05;
    chemReport.push('🔴 High Usage Overlap: 3+ starters average >25 PPG but <5 APG, stalling ball movement (-5%)');
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
    chemReport.push('🔴 Offensive Black Hole: 3+ starters average under 12 PPG, killing floor gravity (-5%)');
  }

  if (coach !== 'auerbach') {
    const pfcBlocksLow = starters
      .filter(p => p.pos === 'PF' || p.pos === 'C')
      .reduce((sum, p) => sum + p.bpg, 0);
    if (starters.filter(p => p.pos === 'PF' || p.pos === 'C').length === 2 && pfcBlocksLow < 1.5) {
      chemBonus -= 0.05;
      chemReport.push('🔴 No Paint Protection: Frontcourt blocks fall below 1.5 BPG (-5%)');
    }
  }

  if (coach !== 'popovich' && (starters.length + bench.length) === 7) {
    const benchTotalPpg = bench.reduce((sum, p) => sum + p.ppg, 0);
    if (benchTotalPpg < 15.0) {
      chemBonus -= 0.04;
      chemReport.push(`🔴 Barren Bench: Bench combines for only ${benchTotalPpg.toFixed(1)} PPG — starters will be gassed (-4%)`);
    }
  }

  // 3 or more starters locked to the same position — role clarity collapses
  const starterPosCounts = starters.reduce((acc, p) => {
    acc[p.pos] = (acc[p.pos] || 0) + 1; return acc;
  }, {});
  if (Object.values(starterPosCounts).some(n => n >= 3)) {
    chemBonus -= 0.10;
    chemReport.push('🔴 Positional Logjam: 3+ starters play the same position — role clarity breaks down (-10%)');
  }

  // ── FINAL SCORE (70 baseline = neutral roster) ────────────────────────────────
  const chemScore = Math.round(Math.max(0, Math.min(100, 70 + (chemBonus / 0.60) * 30)));
  return { chemBonus, chemScore, chemReport };
}
