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
  const aLockdownCount   = aA.filter(a => a === 'Lockdown Defender').length;

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

  // All-Defensive Team — 3+ Lockdown Defenders across the full 8-man roster
  if (aLockdownCount >= 3) {
    chemBonus += 0.07;
    chemReport.push('🟢 All-Defensive Team: 3+ Lockdown Defenders on the roster — elite team defense (+7%)');
  }

  // Heliocentric Engine — exactly 1 starting Playmaker with > 9.0 APG, other 4 starters all > 16.0 PPG
  const helioPlaymakers = starters.filter(p => p.archetype === 'Playmaker');
  const helioScorers    = starters.filter(p => p.archetype !== 'Playmaker' && p.ppg > 16.0);
  if (helioPlaymakers.length === 1 && helioPlaymakers[0].apg > 9.0 && helioScorers.length === 4) {
    chemBonus += 0.06;
    chemReport.push(`🟢 Heliocentric Engine: ${helioPlaymakers[0].name} orchestrates 4 elite scorers (+6%)`);
  }

  // Bully Ball Frontcourt — starting PF AND starting C both have Paint Beast archetype
  const startingPF = starters.find(p => p.pos === 'PF');
  const startingC  = starters.find(p => p.pos === 'C');
  if (startingPF?.archetype === 'Paint Beast' && startingC?.archetype === 'Paint Beast') {
    chemBonus += 0.05;
    chemReport.push(`🟢 Bully Ball Frontcourt: ${startingPF.name} + ${startingC.name} bully the paint (+5%)`);
  }

  // Dynamic Duo — 2+ starters each averaging > 26.0 PPG
  const eliteScorers = starters.filter(p => p.ppg > 26.0);
  if (eliteScorers.length >= 2) {
    chemBonus += 0.06;
    chemReport.push(`🟢 Dynamic Duo: ${eliteScorers.map(p => p.name).join(' + ')} — elite co-stars (+6%)`);
  }

  // Paint Patrol — starting PF + C combined BPG ≥ 3.5
  const paintPatrolBpg = (startingPF?.bpg || 0) + (startingC?.bpg || 0);
  if (paintPatrolBpg >= 3.5) {
    chemBonus += 0.05;
    chemReport.push(`🟢 Paint Patrol: Frontcourt combines for ${paintPatrolBpg.toFixed(1)} BPG — rim locked down (+5%)`);
  }

  // Second Unit General — at least one bench player with Playmaker archetype
  const benchPlaymaker = bench.find(p => p.archetype === 'Playmaker');
  if (benchPlaymaker) {
    chemBonus += 0.04;
    chemReport.push(`🟢 Second Unit General: ${benchPlaymaker.name} runs the offense off the bench (+4%)`);
  }

  // Three-and-D Paradigm — 2+ Sharpshooters AND 2+ Lockdown Defenders on roster
  if (aSharpCount >= 2 && aLockdownCount >= 2) {
    chemBonus += 0.06;
    chemReport.push('🟢 Three-and-D Paradigm: Multiple shooters and defenders create the modern ideal (+6%)');
  }

  // Era Monolith — 4+ players sharing the exact same decade
  const decadeCounts = {};
  for (const p of allPlayers) {
    if (p.decade) decadeCounts[p.decade] = (decadeCounts[p.decade] || 0) + 1;
  }
  const monolithDecade = Object.keys(decadeCounts).find(d => decadeCounts[d] >= 4);
  if (monolithDecade) {
    chemBonus += 0.05;
    chemReport.push(`🟢 Era Monolith: ${decadeCounts[monolithDecade]} ${monolithDecade} legends dominate the roster (+5%)`);
  }

  // Perimeter Clamps — starting PG + SG combined SPG ≥ 3.6
  const startingPG   = starters.find(p => p.pos === 'PG');
  const startingSG   = starters.find(p => p.pos === 'SG');
  const perimClampSpg = (startingPG?.spg || 0) + (startingSG?.spg || 0);
  if (perimClampSpg >= 3.6) {
    chemBonus += 0.05;
    chemReport.push(`🟢 Perimeter Clamps: Backcourt combines for ${perimClampSpg.toFixed(1)} SPG — thieves at the top (+5%)`);
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

  // Small Ball Weakness — starting PG, SG, and SF all average < 4.5 RPG
  const perimSlotsFilled = starters.filter(p => p.pos === 'PG' || p.pos === 'SG' || p.pos === 'SF').length;
  const perimWeakCount   = starters.filter(
    p => (p.pos === 'PG' || p.pos === 'SG' || p.pos === 'SF') && p.rpg < 4.5
  ).length;
  if (perimSlotsFilled === 3 && perimWeakCount === 3) {
    chemBonus -= 0.06;
    chemReport.push('🔴 Small Ball Weakness: Entire perimeter averages under 4.5 RPG — glass is wide open (-6%)');
  }

  // Offensive Black Hole — 3+ starters averaging < 12.0 PPG
  const lowScorerCount = starters.filter(p => p.ppg < 12.0).length;
  if (lowScorerCount >= 3) {
    chemBonus -= 0.08;
    chemReport.push(`🔴 Offensive Black Hole: ${lowScorerCount} starters average under 12 PPG — no offensive gravity (-8%)`);
  }

  // Chucker Syndrome — 2+ starting Sharpshooters or Slashers with > 20.0 PPG but < 2.5 APG
  const chuckerCount = starters.filter(
    p => (p.archetype === 'Sharpshooter' || p.archetype === 'Slasher') &&
         p.ppg > 20.0 && p.apg < 2.5
  ).length;
  if (chuckerCount >= 2) {
    chemBonus -= 0.06;
    chemReport.push(`🔴 Chucker Syndrome: ${chuckerCount} high-volume scorers hoard shots and stall the offense (-6%)`);
  }

  // Weak Interior — starting C averages < 1.0 BPG and is not a Paint Beast
  if (startingC && startingC.bpg < 1.0 && startingC.archetype !== 'Paint Beast') {
    chemBonus -= 0.06;
    chemReport.push(`🔴 Weak Interior: ${startingC.name} provides virtually no rim protection (-6%)`);
  }

  // Turnstile Guards — starting PG and SG both average < 1.1 SPG
  if (startingPG && startingSG && startingPG.spg < 1.1 && startingSG.spg < 1.1) {
    chemBonus -= 0.05;
    chemReport.push('🔴 Turnstile Guards: Both guards lack perimeter defensive pressure (-5%)');
  }

  // Old School Fatigue — 4+ players from the 1960s or 1970s on the roster
  if (oldEraCount >= 4) {
    chemBonus -= 0.06;
    chemReport.push(`🔴 Old School Fatigue: ${oldEraCount} classic-era players struggle with modern pacing (-6%)`);
  }

  // No Paint Protection — starting PF + C combined BPG < 1.5
  if (startingPF && startingC && paintPatrolBpg < 1.5) {
    chemBonus -= 0.07;
    chemReport.push(`🔴 No Paint Protection: Frontcourt combines for only ${paintPatrolBpg.toFixed(1)} BPG — rim is wide open (-7%)`);
  }

  // Combo Guard Crisis — starting PG averages > 22.0 PPG but < 4.5 APG
  if (startingPG && startingPG.ppg > 22.0 && startingPG.apg < 4.5) {
    chemBonus -= 0.06;
    chemReport.push(`🔴 Combo Guard Crisis: ${startingPG.name} scores but won't pass (-6%)`);
  }

  // Barren Bench — combined bench PPG < 32.0
  const benchTotalPpg = bench.reduce((sum, p) => sum + p.ppg, 0);
  if (benchTotalPpg < 32.0) {
    chemBonus -= 0.06;
    chemReport.push(`🔴 Barren Bench: Bench combines for only ${benchTotalPpg.toFixed(1)} PPG — starters can't rest (-6%)`);
  }

  // Map to 0–100 score — divisor at 1.85 for 33-rule range
  // (a solid team at ~+0.46 → ~62%; only elite rosters approach 100%)
  const chemScore = Math.round(Math.max(0, Math.min(100, 50 + (chemBonus / 1.85) * 50)));
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
