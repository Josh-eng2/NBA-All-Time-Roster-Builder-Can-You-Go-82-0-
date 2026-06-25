'use strict';

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  SIMULATION ENGINE                                                          ║
// ║                                                                             ║
// ║  Starters (78%) vs bench (22%), each against own baseline.                 ║
// ║  Chemistry bonuses/penalties applied before the sigmoid win curve.         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// ── Sigmoid tuning knobs ──────────────────────────────────────────────────────
// SIM_K:      steepness — higher = more decisive gap between good and bad teams
// SIM_CENTER: the adjustedStrength value that maps to exactly 50% win rate;
//             raise this (e.g. 1.22) to make 82-0 rarer, lower to make it easier
// WIN_CAP:    hard ceiling — prevents a mathematically guaranteed perfect season
const SIM_K      = 15;
const SIM_CENTER = 1.18;
const WIN_CAP    = 0.965;

// ── Dynamic baselines derived from the live DB ────────────────────────────────
// Rather than hardcoding STARTER_BASE / BENCH_BASE, we sort all players by
// composite score and treat the top 62.5% (5 of 8 roster spots) as the starter
// tier.  The means auto-adjust whenever players are added or stats change.
function computeSimBaselines() {
  const all   = Object.values(DB).flat();
  const score = p => p.ppg*0.35 + p.rpg*0.20 + p.apg*0.20 + p.spg*0.15 + p.bpg*0.10;
  const sorted = [...all].sort((a, b) => score(b) - score(a));
  const cut    = Math.round(sorted.length * 5 / 8);
  const sTier  = sorted.slice(0, cut);
  const bTier  = sorted.slice(cut);
  const avg    = (arr, stat) => arr.reduce((s, p) => s + p[stat], 0) / arr.length;
  const STATS  = ['ppg', 'rpg', 'apg', 'spg', 'bpg'];
  return {
    STARTER_BASE: Object.fromEntries(STATS.map(k => [k, avg(sTier, k) * 5])),
    BENCH_BASE:   Object.fromEntries(STATS.map(k => [k, avg(bTier, k) * 3])),
  };
}

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

  const coach = (typeof S !== 'undefined' && S.coach) ? S.coach : null;

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

  const defAnchor = starters.find(p => (p.archetype === 'Lockdown Defender' || p.archetype === 'Paint Beast') && (p.spg + p.bpg) >= 2.5);
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

  const stretchBig = starters.find(p => (p.pos === 'C' || p.pos === 'PF') && p.archetype === 'Sharpshooter');
  if (stretchBig) {
    const bonus = coach === 'kerr' ? 0.10 : 0.07;
    chemBonus += bonus;
    chemReport.push(`🟢 Stretch Five Dynamic${coach === 'kerr' ? ' ⭐ Kerr' : ''}: ${stretchBig.name.split(' ').pop()} opens up the interior lane (+${Math.round(bonus * 100)}%)`);
  }

  const showtimePG = starters.find(p => p.archetype === 'Playmaker' && p.apg > 7.0);
  const showtimeSlasher = starters.find(p => p.archetype === 'Slasher' && p.ppg > 22.0);
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
  const otherStartersScoring = starters.filter(p => p.archetype !== 'Playmaker' && p.ppg > 16.0);
  if (helioPG && starters.filter(p => p.archetype === 'Playmaker').length === 1 && otherStartersScoring.length === 4) {
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

  const pfCBlocks = starters.filter(p => p.pos === 'PF' || p.pos === 'C').reduce((sum, p) => sum + p.bpg, 0);
  if (starters.filter(p => p.pos === 'PF' || p.pos === 'C').length === 2 && pfCBlocks >= 3.5) {
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
    const penalty = coach === 'jackson' ? 0.02 : 0.05;
    chemBonus -= penalty;
    chemReport.push(`🔴 Clashing Egos${coach === 'jackson' ? ' (softened by Phil)' : ''}: Too many ball-dominant players in the Starting 5 (-${Math.round(penalty * 100)}%)`);
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

  if (coach !== 'auerbach') {
    const pfcBlocksLow = starters
      .filter(p => p.pos === 'PF' || p.pos === 'C')
      .reduce((sum, p) => sum + p.bpg, 0);
    if (starters.filter(p => p.pos === 'PF' || p.pos === 'C').length === 2 && pfcBlocksLow < 1.5) {
      chemBonus -= 0.05;
      chemReport.push('🔴 No Paint Protection: Frontcourt blocks fall below 1.5 BPG (-5%)');
    }
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

function simulateSeason(starters, bench, coach = null) {
  const sumStats = arr => arr.reduce(
    (acc, p) => ({ ppg: acc.ppg+p.ppg, rpg: acc.rpg+p.rpg,
                   apg: acc.apg+p.apg, spg: acc.spg+p.spg, bpg: acc.bpg+p.bpg }),
    { ppg:0, rpg:0, apg:0, spg:0, bpg:0 }
  );

  const sTotals = sumStats(starters);
  const bTotals = sumStats(bench);

  const { STARTER_BASE, BENCH_BASE } = computeSimBaselines();

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

  const { chemBonus, chemScore, chemReport } = calculateChemistry(starters, bench, coach);

  let coachBoost = 0;
  const allForCoach = [...starters, ...bench];
  if (coach === 'jackson') {
    coachBoost = 0.025;
  } else if (coach === 'popovich') {
    coachBoost = 0.020;
  } else if (coach === 'auerbach') {
    const defCount = allForCoach.filter(p => p.archetype === 'Lockdown Defender' || p.archetype === 'Paint Beast').length;
    coachBoost = Math.min(0.06, defCount * 0.012);
  } else if (coach === 'riley') {
    const avgDef = allForCoach.reduce((s, p) => s + p.spg + p.bpg, 0) / (allForCoach.length || 1);
    coachBoost = Math.min(0.05, avgDef * 0.012);
  } else if (coach === 'kerr') {
    const shooterCount = allForCoach.filter(p => p.archetype === 'Sharpshooter').length;
    coachBoost = Math.min(0.05, shooterCount * 0.010);
  }

  const baseStrength = Math.max(0, strength - balancePenalty + chemBonus + coachBoost);

  const POP_FLOOR = 35, POP_CEIL = 100, MUL_MIN = 0.95, MUL_MAX = 1.08;
  const allPlayers = [...starters, ...bench];
  const avgPop  = allPlayers.length
    ? allPlayers.reduce((s, p) => s + (p.popularity || 50), 0) / allPlayers.length
    : 50;
  const popNorm = Math.max(0, Math.min(1, (avgPop - POP_FLOOR) / (POP_CEIL - POP_FLOOR)));
  const popMul  = MUL_MIN + popNorm * (MUL_MAX - MUL_MIN);
  const adjustedStrength = baseStrength * popMul;
  const popEloDelta = +(baseStrength * (popMul - 1)).toFixed(3);
  const fansM = +(Math.pow(popNorm, 1.5) * 38 + 2).toFixed(1);

  const baseWinPct = Math.min(WIN_CAP, 1 / (1 + Math.exp(-SIM_K * (adjustedStrength - SIM_CENTER))));
  const competitiveFactor = Math.max(0, 1 - Math.abs(baseWinPct - 0.5) * 5);
  const clutchBoost = competitiveFactor * (popNorm - 0.4) * 0.04;
  const winPct = Math.min(WIN_CAP, Math.max(0, baseWinPct + clutchBoost));

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
    strength: +adjustedStrength.toFixed(3),
    baseStrength: +baseStrength.toFixed(3),
    totals, ratio, sTotals, bTotals,
    chemScore, chemReport,
    avgPopularity: +avgPop.toFixed(1),
    popEloDelta,
    fansM,
    coachBoost: +coachBoost.toFixed(3),
  };
}

function simulateSeries(playerStrength, opponentStrength) {
  const pWin = 1 / (1 + Math.exp(-14 * (playerStrength - opponentStrength)));
  let playerWins = 0, oppWins = 0;
  const games = [];
  while (playerWins < 4 && oppWins < 4) {
    const won = Math.random() < pWin;
    if (won) playerWins++; else oppWins++;
    games.push(won ? 'W' : 'L');
  }
  return { playerWins, oppWins, games, won: playerWins === 4 };
}
