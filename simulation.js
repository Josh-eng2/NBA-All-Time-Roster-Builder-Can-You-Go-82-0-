'use strict';

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  SIMULATION ENGINE                                                          ║
// ║                                                                             ║
// ║  Starters (78%) vs bench (22%), each against own baseline.                 ║
// ║  Chemistry bonuses/penalties applied before the sigmoid win curve.         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function calculateChemistry(starters, bench) {
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

  let chemBonus = 0;
  const chemReport = [];

  // ── SYNERGIES (Buffed and Improved) ──
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
    chemBonus += 0.08;
    chemReport.push('🟢 Floor General: Starter Playmaker unlocks multiple shooters (+8%)');
  }

  const defAnchor = starters.find(p => (p.archetype === 'Lockdown Defender' || p.archetype === 'Paint Beast') && (p.spg + p.bpg) >= 2.5);
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
    chemBonus += 0.08;
    chemReport.push('🟢 Pace & Space Blitz: High transition attack engine ready (+8%)');
  }

  if (aSharpCount >= 3) {
    chemBonus += 0.07;
    chemReport.push('🟢 Small Ball Heat: Spacing overload with 3+ shooters on the roster (+7%)');
  }

  const sixthMan = bench.find(p => p.ppg > 18.0);
  if (sixthMan) {
    chemBonus += 0.06;
    chemReport.push(`🟢 Sixth Man Spark: ${sixthMan.name.split(' ').pop()} provides elite scoring off the bench (+6%)`);
  }

  const stretchBig = starters.find(p => (p.pos === 'C' || p.pos === 'PF') && p.archetype === 'Sharpshooter');
  if (stretchBig) {
    chemBonus += 0.07;
    chemReport.push(`🟢 Stretch Five Dynamic: ${stretchBig.name.split(' ').pop()} opens up the interior lane (+7%)`);
  }

  const showtimePG = starters.find(p => p.archetype === 'Playmaker' && p.apg > 7.0);
  const showtimeSlasher = starters.find(p => p.archetype === 'Slasher' && p.ppg > 22.0);
  if (showtimePG && showtimeSlasher) {
    chemBonus += 0.08;
    chemReport.push('🟢 Showtime Transition: Fast break baseline fully synchronized (+8%)');
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
    chemBonus += 0.09;
    chemReport.push('🟢 All-Defensive Team: High baseline lock pressure across roster (+9%)');
  }

  const helioPG = starters.find(p => p.archetype === 'Playmaker' && p.apg > 9.0);
  const otherStartersScoring = starters.filter(p => p.archetype !== 'Playmaker' && p.ppg > 16.0);
  if (helioPG && starters.filter(p => p.archetype === 'Playmaker').length === 1 && otherStartersScoring.length === 4) {
    chemBonus += 0.08;
    chemReport.push(`🟢 Heliocentric Engine: System centered cleanly around ${helioPG.name.split(' ').pop()} (+8%)`);
  }

  const startingPF = starters.find(p => p.pos === 'PF');
  const startingC  = starters.find(p => p.pos === 'C');
  if (startingPF?.archetype === 'Paint Beast' && startingC?.archetype === 'Paint Beast') {
    chemBonus += 0.07;
    chemReport.push('🟢 Bully Ball Frontcourt: Combined paint beasts completely overwhelm low blocks (+7%)');
  }

  const eliteScorers = starters.filter(p => p.ppg > 26.0);
  if (eliteScorers.length >= 2) {
    chemBonus += 0.08;
    chemReport.push('🟢 Dynamic Duo: Explosive baseline tandem active (+8%)');
  }

  const pfCBlocks = starters.filter(p => p.pos === 'PF' || p.pos === 'C').reduce((sum, p) => sum + p.bpg, 0);
  if (starters.filter(p => p.pos === 'PF' || p.pos === 'C').length === 2 && pfCBlocks >= 3.5) {
    chemBonus += 0.07;
    chemReport.push('🟢 Paint Patrol: Defensive interior blocks active (+7%)');
  }

  if (bench.some(p => p.archetype === 'Playmaker')) {
    chemBonus += 0.06;
    chemReport.push('🟢 Second Unit General: Secondary unit run by a natural Playmaker (+6%)');
  }

  if (aSharpCount >= 2 && aLockdownCount >= 2) {
    chemBonus += 0.08;
    chemReport.push('🟢 Three-and-D Paradigm: Flawless modern floor symmetry (+8%)');
  }

  const sPerimSteals = starters.filter(p => p.pos === 'PG' || p.pos === 'SG').reduce((sum, p) => sum + p.spg, 0);
  if (starters.filter(p => p.pos === 'PG' || p.pos === 'SG').length === 2 && sPerimSteals >= 3.6) {
    chemBonus += 0.07;
    chemReport.push('🟢 Perimeter Clamps: Stifling backcourt on-ball pressure (+7%)');
  }

  // ── PENALTIES ──
  if (aSlashPaintCount >= 3 && !aHasSharpshooter) {
    const penalty = sSlashPaintCount >= 3 ? 0.06 : 0.04;
    chemBonus -= penalty;
    chemReport.push(`🔴 No Spacing: Too many paint-cloggers, no shooters (-${Math.round(penalty * 100)}%)`);
  }

  if (sDemandCount >= 3) {
    chemBonus -= 0.05;
    chemReport.push('🔴 Clashing Egos: Too many ball-dominant players in the Starting 5 (-5%)');
  }

  if (!aHasPlaymaker) {
    chemBonus -= 0.05;
    chemReport.push('🔴 No Playmaking: Zero Playmakers on the roster — no one to run the offense (-5%)');
  }

  const defLiabilityCount = starters.filter(p => (p.spg + p.bpg) < 1.5).length;
  if (defLiabilityCount >= 3) {
    chemBonus -= 0.02;
    chemReport.push('🔴 Defensive Liability: 3+ starters have weak defensive stats (-2%)');
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

  const sFrontcourtDef = starters.filter(p => p.pos === 'SF' || p.pos === 'PF' || p.pos === 'C');
  const hasFrontcourtDef = sFrontcourtDef.some(p => p.archetype === 'Lockdown Defender' || p.archetype === 'Paint Beast');
  if (sFrontcourtDef.length === 3 && !hasFrontcourtDef) {
    chemBonus -= 0.05;
    chemReport.push('🔴 Defensive Sieve: Starting frontcourt offers zero rim/wing protection (-5%)');
  }

  const highUsageCount = starters.filter(p => p.ppg > 25.0 && p.apg < 5.0).length;
  if (highUsageCount >= 3) {
    chemBonus -= 0.05;
    chemReport.push('🔴 High Usage Overlap: 3+ starters average >25.0 PPG but <5.0 APG, stalling ball movement (-5%)');
  }

  const perimSlotsFilled = starters.filter(p => p.pos === 'PG' || p.pos === 'SG' || p.pos === 'SF').length;
  const perimWeakCount = starters.filter(p => (p.pos === 'PG' || p.pos === 'SG' || p.pos === 'SF') && p.rpg < 4.5).length;
  if (perimSlotsFilled === 3 && perimWeakCount === 3) {
    chemBonus -= 0.04;
    chemReport.push('🔴 Small Ball Weakness: Perimeter group struggles on defensive boards (-4%)');
  }

  const weakScoringStarters = starters.filter(p => p.ppg < 12.0).length;
  if (weakScoringStarters >= 3) {
    chemBonus -= 0.05;
    chemReport.push('🔴 Offensive Black Hole: 3+ starters average under 12.0 PPG, killing floor gravity (-5%)');
  }

  const pfCBlocksLow = starters.filter(p => p.pos === 'PF' || p.pos === 'C').reduce((sum, p) => sum + p.bpg, 0);
  if (starters.filter(p => p.pos === 'PF' || p.pos === 'C').length === 2 && pfCBlocksLow < 1.5) {
    chemBonus -= 0.05;
    chemReport.push('🔴 No Paint Protection: Frontcourt blocks fall below 1.5 BPG (-5%)');
  }

  if ((starters.length + bench.length) === 8) {
    const benchTotalPpg = bench.reduce((sum, p) => sum + p.ppg, 0);
    if (benchTotalPpg < 32.0) {
      chemBonus -= 0.04;
      chemReport.push(`🔴 Barren Bench: Bench combines for only ${benchTotalPpg.toFixed(1)} PPG — starters can't rest (-4%)`);
    }
  }

  const chemScore = Math.round(Math.max(0, Math.min(100, 70 + (chemBonus / 0.60) * 30)));
  return { chemBonus, chemScore, chemReport };
}

function simulateSeason(starters, bench) {
  const sumStats = arr => arr.reduce(
    (acc, p) => ({ ppg: acc.ppg+p.ppg, rpg: acc.rpg+p.rpg,
                   apg: acc.apg+p.apg, spg: acc.spg+p.spg, bpg: acc.bpg+p.bpg }),
    { ppg:0, rpg:0, apg:0, spg:0, bpg:0 }
  );

  const sTotals = sumStats(starters);
  const bTotals = sumStats(bench);

  const STARTER_BASE = { ppg:95,  rpg:42, apg:22, spg:7.5, bpg:5 };
  const BENCH_BASE   = { ppg:57,  rpg:25, apg:13, spg:4.5, bpg:3 };

  const sRatio = {
    ppg: sTotals.ppg / STARTER_BASE.ppg,
    rpg: sTotals.rpg / STARTER_BASE.rpg,
    apg: sTotals.apg / STARTER_BASE.apg,
    spg: sTotals.spg / STARTER_BASE.spg,
    bpg: sTotals.bpg / STARTER_BASE.bpg,
  };
  const bRatio = {
    ppg: bTotals.ppg / BENCH_BASE.ppg,
    rpg: bTotals.rpg / BENCH_BASE.rpg,
    apg: bTotals.apg / BENCH_BASE.apg,
    spg: bTotals.spg / BENCH_BASE.spg,
    bpg: bTotals.bpg / BENCH_BASE.bpg,
  };

  const SW = 0.78, BW = 0.22;
  const ratio = {
    ppg: sRatio.ppg * SW + bRatio.ppg * BW,
    rpg: sRatio.rpg * SW + bRatio.rpg * BW,
    apg: sRatio.apg * SW + bRatio.apg * BW,
    spg: sRatio.spg * SW + bRatio.spg * BW,
    bpg: sRatio.bpg * SW + bRatio.bpg * BW,
  };

  const strength =
    ratio.ppg * 0.35 +
    ratio.rpg * 0.20 +
    ratio.apg * 0.20 +
    ratio.spg * 0.15 +
    ratio.bpg * 0.10;

  const minStarterRatio = Math.min(...Object.values(sRatio));
  const balancePenalty  = minStarterRatio < 0.80 ? (0.80 - minStarterRatio) * 0.6 : 0;

  const { chemBonus, chemScore, chemReport } = calculateChemistry(starters, bench);

  const adjustedStrength = Math.max(0, strength - balancePenalty + chemBonus);
  const winPct = 1 / (1 + Math.exp(-14 * (adjustedStrength - 1.12)));

  let wins = 0;
  for (let i = 0; i < 82; i++) { if (Math.random() < winPct) wins++; }
  wins = Math.max(0, Math.min(82, wins));

  const totals = {
    ppg: sTotals.ppg + bTotals.ppg,
    rpg: sTotals.rpg + bTotals.rpg,
    apg: sTotals.apg + bTotals.apg,
    spg: sTotals.spg + bTotals.spg,
    bpg: sTotals.bpg + bTotals.bpg,
  };

  return {
    wins, losses: 82 - wins,
    winPct:  +(winPct * 100).toFixed(1),
    strength: +adjustedStrength.toFixed(2),
    totals, ratio, sTotals, bTotals,
    chemScore, chemReport,
  };
}
