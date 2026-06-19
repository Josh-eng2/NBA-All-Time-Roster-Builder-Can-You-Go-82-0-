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
  const aA = [...sA, ...bench.map(p => p.archetype || '')];

  // Starter-only flags
  const sHasPlaymaker     = sA.includes('Playmaker');
  const sHasSharpshooter  = sA.includes('Sharpshooter');
  const sHasPaintBeast    = sA.includes('Paint Beast');
  const sHasLockdown      = sA.includes('Lockdown Defender');
  const sSlashPaintCount  = sA.filter(a => a === 'Slasher' || a === 'Paint Beast').length;
  const sDemandCount      = sA.filter(a => a === 'Two-Way Star' || a === 'Playmaker').length;
  const sLockdownCount    = sA.filter(a => a === 'Lockdown Defender').length;
  const sSlashTwoWayCount = sA.filter(a => a === 'Slasher' || a === 'Two-Way Star').length;

  // All-roster flags
  const aHasPlaymaker    = aA.includes('Playmaker');
  const aHasSharpshooter = aA.includes('Sharpshooter');
  const aHasPaintBeast   = aA.includes('Paint Beast');
  const aHasLockdown     = aA.includes('Lockdown Defender');
  const aSharpCount      = aA.filter(a => a === 'Sharpshooter').length;
  const aSlashPaintCount = aA.filter(a => a === 'Slasher' || a === 'Paint Beast').length;
  const aSlasherCount    = aA.filter(a => a === 'Slasher').length;

  let chemBonus = 0;
  const chemReport = [];

  // ── SYNERGIES ───────────────────────────────────────────────────────────────

  // Drive & Kick — 1.5× bonus if both are in the Starting 5
  if (sHasPlaymaker && sHasSharpshooter) {
    chemBonus += 0.075;
    chemReport.push('🟢 Drive & Kick (Elite ×1.5): Starter Playmaker feeds Starter Shooters (+7.5%)');
  } else if (aHasPlaymaker && aHasSharpshooter) {
    chemBonus += 0.05;
    chemReport.push('🟢 Drive & Kick: Playmaker feeds the shooters (+5%)');
  }

  // Twin Towers — 1.5× bonus if both are in the Starting 5
  if (sHasPaintBeast && sHasLockdown) {
    chemBonus += 0.075;
    chemReport.push('🟢 Twin Towers (Elite ×1.5): Interior dominance in the Starting 5 (+7.5%)');
  } else if (aHasPaintBeast && aHasLockdown) {
    chemBonus += 0.05;
    chemReport.push('🟢 Twin Towers: Interior dominance on both ends (+5%)');
  }

  // Floor General Boost — Playmaker in Starting 5 + ≥2 Sharpshooters on roster
  if (sHasPlaymaker && aSharpCount >= 2) {
    chemBonus += 0.06;
    chemReport.push('🟢 Floor General: Starter Playmaker unlocks multiple shooters (+6%)');
  }

  // Defensive Anchor — elite defender in Starting 5 with spg+bpg ≥ 2.5
  const defAnchor = starters.find(
    p => (p.archetype === 'Lockdown Defender' || p.archetype === 'Paint Beast') &&
         (p.spg + p.bpg) >= 2.5
  );
  if (defAnchor) {
    chemBonus += 0.06;
    chemReport.push(`🟢 Defensive Anchor: ${defAnchor.name} anchors the defense (+6%)`);
  }

  // Pick & Roll Maestros — 1.5× bonus if both are in the Starting 5
  if (sHasPlaymaker && sHasPaintBeast) {
    chemBonus += 0.075;
    chemReport.push('🟢 Pick & Roll Maestros (Elite ×1.5): Starter Playmaker + Starter Paint Beast own the P&R (+7.5%)');
  } else if (aHasPlaymaker && aHasPaintBeast) {
    chemBonus += 0.05;
    chemReport.push('🟢 Pick & Roll Maestros: Playmaker + Paint Beast create an unstoppable P&R (+5%)');
  }

  // Perimeter Lockdown — 2+ Lockdown Defenders in Starting 5
  if (sLockdownCount >= 2) {
    chemBonus += 0.06;
    chemReport.push('🟢 Perimeter Lockdown: Multiple elite defenders suffocate the perimeter (+6%)');
  }

  // Pace & Space Blitz — 1+ Playmaker + 2+ Slashers anywhere on roster
  if (aHasPlaymaker && aSlasherCount >= 2) {
    chemBonus += 0.06;
    chemReport.push('🟢 Pace & Space Blitz: Playmaker + multiple Slashers create a dangerous transition offense (+6%)');
  }

  // Small Ball Heat — 3+ Sharpshooters on total roster
  if (aSharpCount >= 3) {
    chemBonus += 0.05;
    chemReport.push('🟢 Small Ball Heat: Spacing overload with 3+ shooters on the roster (+5%)');
  }

  // Sixth Man Spark — any bench player with > 18.0 PPG
  const sixthMan = bench.find(p => p.ppg > 18.0);
  if (sixthMan) {
    chemBonus += 0.04;
    chemReport.push(`🟢 Sixth Man Spark: ${sixthMan.name} provides elite scoring punch off the bench (+4%)`);
  }

  // Stretch Five Dynamic — starting C or PF has Sharpshooter archetype
  const stretchBig = starters.find(
    p => (p.pos === 'C' || p.pos === 'PF') && p.archetype === 'Sharpshooter'
  );
  if (stretchBig) {
    chemBonus += 0.05;
    chemReport.push(`🟢 Stretch Five Dynamic: ${stretchBig.name} draws rim protectors out of the paint (+5%)`);
  }

  // Showtime Transition — starting Playmaker with > 7.0 APG + starting Slasher with > 22.0 PPG
  const showtimePG = starters.find(p => p.archetype === 'Playmaker' && p.apg > 7.0);
  const showtimeSL = starters.find(p => p.archetype === 'Slasher'   && p.ppg > 22.0);
  if (showtimePG && showtimeSL) {
    chemBonus += 0.06;
    chemReport.push(`🟢 Showtime Transition: ${showtimePG.name} → ${showtimeSL.name} — unstoppable fast break (+6%)`);
  }

  // Franchise Loyalty — 3+ players from the same NBA team franchise
  const teamCounts = {};
  for (const p of allPlayers) {
    if (p.team) teamCounts[p.team] = (teamCounts[p.team] || 0) + 1;
  }
  const loyaltyTeam = Object.keys(teamCounts).find(t => teamCounts[t] >= 3);
  if (loyaltyTeam) {
    chemBonus += 0.05;
    chemReport.push(`🟢 Franchise Loyalty: ${teamCounts[loyaltyTeam]} ${loyaltyTeam} legends playing together (+5%)`);
  }

  // ── PENALTIES ───────────────────────────────────────────────────────────────

  // No Spacing — 1.5× penalty if all violators are in the Starting 5
  if (aSlashPaintCount >= 3 && !aHasSharpshooter) {
    const penalty = sSlashPaintCount >= 3 ? 0.12 : 0.08;
    chemBonus -= penalty;
    chemReport.push(`🔴 No Spacing: Too many paint-cloggers, no shooters (-${Math.round(penalty * 100)}%)`);
  }

  // Clashing Egos — 3+ ball-dominant archetypes in the Starting 5
  if (sDemandCount >= 3) {
    chemBonus -= 0.07;
    chemReport.push('🔴 Clashing Egos: Too many ball-dominant players in the Starting 5 (-7%)');
  }

  // No Playmaking — zero Playmakers on the entire 8-man roster
  if (!aHasPlaymaker) {
    chemBonus -= 0.10;
    chemReport.push('🔴 No Playmaking: Zero Playmakers on the roster — no one to run the offense (-10%)');
  }

  // Defensive Liability — 3+ starters with (spg + bpg) < 1.5
  const defLiabilityCount = starters.filter(p => (p.spg + p.bpg) < 1.5).length;
  if (defLiabilityCount >= 3) {
    chemBonus -= 0.07;
    chemReport.push(`🔴 Defensive Liability: ${defLiabilityCount} starters are defensive liabilities (-7%)`);
  }

  // Rebounding Crisis — zero Paint Beasts on roster AND starting C averages < 8.0 RPG
  const startingC = starters.find(p => p.pos === 'C');
  if (!aHasPaintBeast && (!startingC || startingC.rpg < 8.0)) {
    chemBonus -= 0.06;
    chemReport.push('🔴 Rebounding Crisis: No Paint Beasts and weak rebounding at center (-6%)');
  }

  // Ball Stoppers — 3+ Slashers or Two-Way Stars in the Starting 5
  if (sSlashTwoWayCount >= 3) {
    chemBonus -= 0.06;
    chemReport.push('🔴 Ball Stoppers: Too many isolation-heavy players in the Starting 5 (-6%)');
  }

  // Defensive Sieve — none of the starting frontcourt (SF, PF, C) are Lockdown Defender or Paint Beast
  const frontcourt = starters.filter(p => p.pos === 'SF' || p.pos === 'PF' || p.pos === 'C');
  if (frontcourt.length > 0 &&
      !frontcourt.some(p => p.archetype === 'Lockdown Defender' || p.archetype === 'Paint Beast')) {
    chemBonus -= 0.08;
    chemReport.push('🔴 Defensive Sieve: No interior defender in the starting frontcourt (-8%)');
  }

  // Generational Clash — 2+ old-era (1960s/1970s) AND 2+ new-era (2010s/2020s) players,
  // unless a starting Playmaker with > 8.0 APG bridges the gap
  const oldEraCount = allPlayers.filter(p => p.decade === '1960s' || p.decade === '1970s').length;
  const newEraCount = allPlayers.filter(p => p.decade === '2010s' || p.decade === '2020s').length;
  const bridgePG    = starters.find(p => p.archetype === 'Playmaker' && p.apg > 8.0);
  if (oldEraCount >= 2 && newEraCount >= 2 && !bridgePG) {
    chemBonus -= 0.06;
    chemReport.push('🔴 Generational Clash: Old-school and modern eras clash without a bridge Playmaker (-6%)');
  }

  // High Usage Overlap — 3+ starters each averaging > 25.0 PPG and < 3.5 APG
  const ballStopperCount = starters.filter(p => p.ppg > 25.0 && p.apg < 3.5).length;
  if (ballStopperCount >= 3) {
    chemBonus -= 0.07;
    chemReport.push(`🔴 High Usage Overlap: ${ballStopperCount} high-volume scorers kill ball movement (-7%)`);
  }

  // Map to 0–100 score — divisor at 0.80 for 15-rule range
  // (a solid team at +0.24 → ~65%; only near-perfect rosters approach 100%)
  const chemScore = Math.round(Math.max(0, Math.min(100, 50 + (chemBonus / 0.80) * 50)));
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
