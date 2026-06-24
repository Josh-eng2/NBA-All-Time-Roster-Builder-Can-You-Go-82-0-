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
// SIM_K:      steepness — higher = more decisive gap between good/bad teams
// SIM_CENTER: adjustedStrength that maps to exactly 50 % win rate
//             (raise to make 82-0 rarer, lower to make it easier)
// WIN_CAP:    hard ceiling — prevents a mathematically guaranteed perfect season
const SIM_K      = 15;
const SIM_CENTER = 1.18;
const WIN_CAP    = 0.965;

/**
 * Derives dynamic STARTER_BASE / BENCH_BASE from the live DB.
 * Treats the top 62.5 % of players (by composite score) as the starter tier.
 * Auto-adjusts whenever players are added or stats change.
 */
function computeSimBaselines() {
  const all    = Object.values(DB).flat();
  const score  = p => p.ppg * 0.35 + p.rpg * 0.20 + p.apg * 0.20 + p.spg * 0.15 + p.bpg * 0.10;
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

/**
 * Simulates a full 82-game regular season.
 *
 * @param {object[]} starters  5 starting player objects
 * @param {object[]} bench     up to 3 bench player objects
 * @returns {object}  { wins, losses, winPct, strength, totals, ratio,
 *                      sTotals, bTotals, chemScore, chemReport }
 */
export function simulateSeason(starters, bench) {
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
  const winPct = Math.min(
    WIN_CAP,
    1 / (1 + Math.exp(-SIM_K * (adjustedStrength - SIM_CENTER)))
  );

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
    losses:   82 - wins,
    winPct:   +(winPct * 100).toFixed(1),
    strength: +adjustedStrength.toFixed(2),
    totals, ratio, sTotals, bTotals,
    chemScore, chemReport,
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

