'use strict';

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  SIMULATION ENGINE                                                          ║
// ║                                                                             ║
// ║  Starters (78%) vs bench (22%), each against own baseline.                 ║
// ║  Chemistry bonuses/penalties applied before the sigmoid win curve.         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function calculateChemistry(starters, bench) {
  const sA = starters.map(p => p.archetype || '');
  const aA = [...sA, ...bench.map(p => p.archetype || '')];

  // Starter-only flags
  const sHasPlaymaker    = sA.includes('Playmaker');
  const sHasSharpshooter = sA.includes('Sharpshooter');
  const sHasPaintBeast   = sA.includes('Paint Beast');
  const sHasLockdown     = sA.includes('Lockdown Defender');
  const sSlashPaintCount = sA.filter(a => a === 'Slasher' || a === 'Paint Beast').length;
  const sDemandCount     = sA.filter(a => a === 'Two-Way Star' || a === 'Playmaker').length;

  // All-roster flags
  const aHasPlaymaker    = aA.includes('Playmaker');
  const aHasSharpshooter = aA.includes('Sharpshooter');
  const aHasPaintBeast   = aA.includes('Paint Beast');
  const aHasLockdown     = aA.includes('Lockdown Defender');
  const aSharpCount      = aA.filter(a => a === 'Sharpshooter').length;
  const aSlashPaintCount = aA.filter(a => a === 'Slasher' || a === 'Paint Beast').length;

  let chemBonus = 0;
  const chemReport = [];

  // Synergy 1: Drive & Kick — 1.5× bonus if both are in the Starting 5
  if (sHasPlaymaker && sHasSharpshooter) {
    chemBonus += 0.075;
    chemReport.push('🟢 Drive & Kick (Elite ×1.5): Starter Playmaker feeds Starter Shooters (+7.5%)');
  } else if (aHasPlaymaker && aHasSharpshooter) {
    chemBonus += 0.05;
    chemReport.push('🟢 Drive & Kick: Playmaker feeds the shooters (+5%)');
  }

  // Synergy 2: Twin Towers — 1.5× bonus if both are in the Starting 5
  if (sHasPaintBeast && sHasLockdown) {
    chemBonus += 0.075;
    chemReport.push('🟢 Twin Towers (Elite ×1.5): Interior dominance in the Starting 5 (+7.5%)');
  } else if (aHasPaintBeast && aHasLockdown) {
    chemBonus += 0.05;
    chemReport.push('🟢 Twin Towers: Interior dominance on both ends (+5%)');
  }

  // Synergy 3: Floor General Boost — Playmaker in Starting 5 + ≥2 Sharpshooters on roster
  if (sHasPlaymaker && aSharpCount >= 2) {
    chemBonus += 0.06;
    chemReport.push('🟢 Floor General: Starter Playmaker unlocks multiple shooters (+6%)');
  }

  // Synergy 4: Defensive Anchor — elite defender anchoring the Starting 5
  const defAnchor = starters.find(
    p => p.archetype === 'Lockdown Defender' ||
        (p.archetype === 'Paint Beast' && p.bpg >= 2.5)
  );
  if (defAnchor) {
    chemBonus += 0.06;
    chemReport.push(`🟢 Defensive Anchor: ${defAnchor.name} anchors the defense (+6%)`);
  }

  // Penalty 1: No Spacing — 1.5× penalty if violators are all in the Starting 5
  if (aSlashPaintCount >= 3 && !aHasSharpshooter) {
    const penalty = sSlashPaintCount >= 3 ? 0.12 : 0.08;
    chemBonus -= penalty;
    chemReport.push(`🔴 No Spacing: Too many paint-cloggers, no shooters (-${Math.round(penalty * 100)}%)`);
  }

  // Penalty 2: Clashing Egos — 3+ ball-dominant archetypes in the Starting 5
  if (sDemandCount >= 3) {
    chemBonus -= 0.07;
    chemReport.push('🔴 Clashing Egos: Too many ball-dominant players in the Starting 5 (-7%)');
  }

  // Map to 0–100 score (50 = neutral, max bonus ≈ +0.285, max penalty ≈ −0.19)
  const chemScore = Math.round(Math.max(0, Math.min(100, 50 + (chemBonus / 0.30) * 50)));
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
