/**
 * js/logic/simulation.js — Season & Playoff Simulation Engine
 *
 * Starters count 78 %, bench 22 % of the combined stat ratio.
 * A sigmoid maps adjustedStrength → per-game win probability.
 * Chemistry bonuses/penalties (from chemistry.js) are baked into
 * adjustedStrength before the sigmoid is applied.
 *
 * Exports:
 *   simulateSeason(starters, bench)  → full result object
 *   simulateSeries(playerStr, oppStr) → series result object
 */

import { DB }                  from '../data/players.js';
import { calculateChemistry } from '../logic/chemistry.js';

// ── Sigmoid tuning knobs ──────────────────────────────────────────────────────
// SIM_K:      steepness — lower = more gradual spread between good/bad teams
// SIM_CENTER: adjustedStrength that maps to exactly 50 % win rate
//             (raise to make 82-0 rarer, lower to make it easier)
// WIN_CAP:    1.0 — 82-0 is possible only for genuinely elite rosters
const SIM_K      = 7;
const SIM_CENTER = 1.45;
const WIN_CAP    = 1.0;

let _baselinesCache = null;

/**
 * Derives dynamic STARTER_BASE / BENCH_BASE from the live DB.
 * Treats the top ~71.4 % of players (by composite score) as the starter tier.
 * Memoized — DB never changes after startup so the sort runs at most once.
 */
function computeSimBaselines() {
  if (_baselinesCache) return _baselinesCache;
  const all    = Object.values(DB).flat();
  const score  = p => p.ppg * 0.35 + p.rpg * 0.20 + p.apg * 0.20 + p.spg * 0.15 + p.bpg * 0.10;
  const sorted = [...all].sort((a, b) => score(b) - score(a));
  const cut    = Math.round(sorted.length * 5 / 7);
  const sTier  = sorted.slice(0, cut);
  const bTier  = sorted.slice(cut);
  const avg    = (arr, stat) => arr.reduce((s, p) => s + p[stat], 0) / arr.length;
  const STATS  = ['ppg', 'rpg', 'apg', 'spg', 'bpg'];
  _baselinesCache = {
    STARTER_BASE: Object.fromEntries(STATS.map(k => [k, avg(sTier, k) * 5])),
    BENCH_BASE:   Object.fromEntries(STATS.map(k => [k, avg(bTier, k) * 2])),
  };
  return _baselinesCache;
}

/**
 * Simulates a full 82-game regular season.
 *
 * @param {object[]} starters  5 starting player objects
 * @param {object[]} bench     2 bench player objects
 * @returns {object}  { wins, losses, winPct, strength, totals, ratio,
 *                      sTotals, bTotals, chemScore, chemReport }
 */
export function simulateSeason(starters, bench, coach = null) {
  const sumStats = arr => arr.reduce(
    (acc, p) => ({
      ppg: acc.ppg + p.ppg,
      rpg: acc.rpg + p.rpg,
      apg: acc.apg + p.apg,
      spg: acc.spg + p.spg,
      bpg: acc.bpg + p.bpg,
    }),
    { ppg: 0, rpg: 0, apg: 0, spg: 0, bpg: 0 }
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

  const SW = 0.92, BW = 0.08;
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
  const balancePenalty  = minStarterRatio < 0.82 ? (0.82 - minStarterRatio) * 0.8 : 0;

  const { chemBonus, chemScore, chemReport, lineupAssignment } = calculateChemistry(starters, bench);

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

  // ── Popularity / Fan-Hype modifier ───────────────────────────────────────
  // Smoothly maps avg roster popularity (floor 35 → ceil 100) to a multiplier
  // of 0.95x (low-key role-player team) up to 1.08x (all-time superstar lineup).
  const POP_FLOOR   = 35;
  const POP_CEIL    = 100;
  const MUL_MIN     = 0.97;
  const MUL_MAX     = 1.04;
  const allPlayers  = [...starters, ...bench];
  const avgPop      = allPlayers.length
    ? allPlayers.reduce((s, p) => s + (p.popularity || 50), 0) / allPlayers.length
    : 50;
  const popNorm     = Math.max(0, Math.min(1, (avgPop - POP_FLOOR) / (POP_CEIL - POP_FLOOR)));
  const popMul      = MUL_MIN + popNorm * (MUL_MAX - MUL_MIN);
  const adjustedStrength = baseStrength * popMul;
  const popEloDelta = +(baseStrength * (popMul - 1)).toFixed(3); // signed delta

  // Fan base size — power curve: 2M (avg=35) → ~20M (avg=70) → 40M (avg=100)
  const fansM = +(Math.pow(popNorm, 1.5) * 38 + 2).toFixed(1);

  const winPct = Math.min(WIN_CAP, 1 / (1 + Math.exp(-SIM_K * (adjustedStrength - SIM_CENTER))));

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
    wins,
    losses:     82 - wins,
    winPct:     +(winPct * 100).toFixed(1),
    strength:   +adjustedStrength.toFixed(3),
    baseStrength: +baseStrength.toFixed(3),
    totals, ratio, sTotals, bTotals,
    chemScore, chemReport, lineupAssignment,
    avgPopularity: +avgPop.toFixed(1),
    popEloDelta,
    fansM,
    coachBoost: +coachBoost.toFixed(3),
  };
}

/**
 * Simulates a best-of-7 playoff series.
 *
 * @param {number} playerStrength
 * @param {number} opponentStrength
 * @returns {{ playerWins: number, oppWins: number, games: string[], won: boolean }}
 */
export function simulateSeries(playerStrength, opponentStrength) {
  const pWin = 1 / (1 + Math.exp(-6 * (playerStrength - opponentStrength)));
  let playerWins = 0, oppWins = 0;
  const games = [];
  while (playerWins < 4 && oppWins < 4) {
    const won = Math.random() < pWin;
    if (won) playerWins++; else oppWins++;
    games.push(won ? 'W' : 'L');
  }
  return { playerWins, oppWins, games, won: playerWins === 4 };
}

