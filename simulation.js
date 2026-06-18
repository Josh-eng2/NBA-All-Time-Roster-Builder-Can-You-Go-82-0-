'use strict';

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  SIMULATION ENGINE                                                          ║
// ║                                                                             ║
// ║  Starters (78%) vs bench (22%), each against own baseline.                 ║
// ║  Chemistry bonuses/penalties applied before the sigmoid win curve.         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

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

  // ── Chemistry ──────────────────────────────────────────────────────────────────
  const allPlayers      = [...starters, ...bench];
  const archetypes      = allPlayers.map(p => p.archetype || '');

  const hasPlaymaker    = archetypes.includes('Playmaker');
  const hasSharpshooter = archetypes.includes('Sharpshooter');
  const hasPaintBeast   = archetypes.includes('Paint Beast');
  const hasLockdown     = archetypes.includes('Lockdown Defender');
  const slashPaintCount = archetypes.filter(a => a === 'Slasher' || a === 'Paint Beast').length;

  let chemBonus = 0;
  const chemReport = [];

  if (hasPlaymaker && hasSharpshooter) {
    chemBonus += 0.05;
    chemReport.push('🟢 Drive & Kick: Playmaker feeds the shooters (+5%)');
  }
  if (hasPaintBeast && hasLockdown) {
    chemBonus += 0.05;
    chemReport.push('🟢 Twin Towers: Interior dominance on both ends (+5%)');
  }
  if (slashPaintCount >= 3 && !hasSharpshooter) {
    chemBonus -= 0.08;
    chemReport.push('🔴 No Spacing: Too many paint-cloggers, no shooters (-8%)');
  }

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
    totals, ratio, sTotals, bTotals, chemReport,
  };
}
