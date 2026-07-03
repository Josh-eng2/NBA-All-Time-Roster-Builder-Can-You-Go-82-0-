/**
 * js/logic/simulation.js — Season & Playoff Simulation Engine
 *
 * Starters-only format: team strength comes entirely from the starting 5.
 * A sigmoid maps adjustedStrength → per-game win probability.
 * Chemistry bonuses/penalties (from chemistry.js) are baked into
 * adjustedStrength before the sigmoid is applied.
 *
 * Exports:
 *   simulateSeason(starters, coach)  → full result object
 *   simulateSeries(playerStr, oppStr) → series result object
 */

import { DB }                  from '../data/players.js';
import { calculateChemistry } from '../logic/chemistry.js';
import { TEAMS, pick }         from '../logic/state.js';

// ── Sigmoid tuning knobs ──────────────────────────────────────────────────────
// SIM_K:      steepness — lower = more gradual spread between good/bad teams
// SIM_CENTER: adjustedStrength that maps to exactly 50 % win rate
//             (raise to make 82-0 rarer, lower to make it easier)
// WIN_CAP:    1.0 — 82-0 is possible only for genuinely elite rosters
//
// Recalibrated for the starters-only format (bench removal shifted the whole
// strength distribution down: the old bench ratio was measured against a
// bench-tier baseline, inflating strength by ~0.3, and roster-wide chem procs
// lost their bench reach). Empirical anchors from 300-sample sweeps of
// position-clean builds: elite (pop 85+) median 2.03 → ~73 wins; elite p90
// 2.40 → ~80 wins; mid-tier (68-84) median 1.73 → ~52 wins.
const SIM_K      = 5;
const SIM_CENTER = 1.62;
const WIN_CAP    = 1.0;

let _baselinesCache = null;

/**
 * Derives the dynamic STARTER_BASE from the live DB.
 * Treats the top ~71.4 % of players (by composite score) as the starter tier.
 * Memoized — DB never changes after startup so the sort runs at most once.
 */
function computeSimBaselines() {
  if (_baselinesCache) return _baselinesCache;
  const all    = Object.values(DB).flat();
  const score  = p => p.ppg * 0.35 + p.rpg * 0.20 + p.apg * 0.20 + p.spg * 0.15 + p.bpg * 0.10;
  const sorted = [...all].sort((a, b) => score(b) - score(a));
  const cut    = Math.round(sorted.length * 5 / 7); // tier cut unchanged — keeps STARTER_BASE identical
  const sTier  = sorted.slice(0, cut);
  const avg    = (arr, stat) => arr.reduce((s, p) => s + p[stat], 0) / arr.length;
  const STATS  = ['ppg', 'rpg', 'apg', 'spg', 'bpg'];
  _baselinesCache = {
    STARTER_BASE: Object.fromEntries(STATS.map(k => [k, avg(sTier, k) * 5])),
  };
  return _baselinesCache;
}

// ── Coach system progress ─────────────────────────────────────────────────────
// Every coach earns the same boost envelope: FLOOR guaranteed, FLOOR + RANGE
// at full system mastery. Progress (0→1) is a steerable drafting objective,
// keyed to quantities the sim already computes so it self-normalizes to the
// live player database. Partial-roster-safe: the draft screen calls this
// every round to drive the live system meter.
const COACH_BOOST_FLOOR = 0.008;
const COACH_BOOST_RANGE = 0.032;

const clamp01 = v => Math.max(0, Math.min(1, v));

/** Avg per-stat ratio of the filled starters vs a pro-rated baseline → 0..1. */
function statRatioProgress(players, stats, base, slotCount) {
  if (!players.length) return 0;
  const frac = players.length / slotCount;
  let sum = 0;
  for (const k of stats) {
    const tot = players.reduce((s, p) => s + p[k], 0);
    sum += tot / (base[k] * frac);
  }
  // 1.0 = tier-average roster, 1.3 = elite → full meter
  return clamp01(((sum / stats.length) - 1.0) / 0.30);
}

/**
 * @param {string} coach     coach id
 * @param {object[]} starters filled starter players (0–5 during draft)
 * @returns {{ progress: number, metric: string }}
 */
export function coachSystemProgress(coach, starters) {
  const { STARTER_BASE } = computeSimBaselines();

  if (coach === 'jackson') {
    const stars = starters.filter(p => (p.popularity ?? 50) >= 85).length;
    return { progress: clamp01(stars / 4), metric: `${stars}/4 stars` };
  }
  if (coach === 'kerr') {
    const shooters = starters.filter(p => p.archetype === 'Sharpshooter').length;
    return { progress: clamp01(shooters / 3), metric: `${shooters}/3 sharpshooters` };
  }
  if (coach === 'popovich') {
    // The Beautiful Game — efficient team offense (re-homed from bench depth)
    const p = statRatioProgress(starters, ['ppg'], STARTER_BASE, 5);
    return { progress: p, metric: `Offense ${Math.round(p * 100)}%` };
  }
  if (coach === 'rivers') {
    // Cohesion — no weak links: keyed to the worst starter stat ratio,
    // the same signal the sim's balance penalty punishes.
    if (!starters.length) return { progress: 0, metric: 'Balance 0%' };
    const frac = starters.length / 5;
    let minRatio = Infinity;
    for (const k of ['ppg', 'rpg', 'apg', 'spg', 'bpg']) {
      const tot = starters.reduce((s, p) => s + p[k], 0);
      minRatio = Math.min(minRatio, tot / (STARTER_BASE[k] * frac));
    }
    const p = clamp01((minRatio - 0.70) / 0.25);
    return { progress: p, metric: `Balance ${Math.round(p * 100)}%` };
  }
  const starterSystems = {
    auerbach: { stats: ['rpg', 'bpg'], label: 'Interior D' },
    riley:    { stats: ['spg'],        label: 'Perimeter D' },
    holzman:  { stats: ['apg'],        label: 'Ball movement' },
  };
  const sys = starterSystems[coach];
  if (sys) {
    const p = statRatioProgress(starters, sys.stats, STARTER_BASE, 5);
    return { progress: p, metric: `${sys.label} ${Math.round(p * 100)}%` };
  }
  return { progress: 0, metric: '' };
}

/**
 * Simulates a full 82-game regular season.
 *
 * @param {object[]} starters  5 starting player objects
 * @returns {object}  { wins, losses, winPct, strength, totals, ratio,
 *                      sTotals, chemScore, chemReport }
 */
export function simulateSeason(starters, coach = null) {
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

  const { STARTER_BASE } = computeSimBaselines();

  const sRatio = {
    ppg: sTotals.ppg / STARTER_BASE.ppg,
    rpg: sTotals.rpg / STARTER_BASE.rpg,
    apg: sTotals.apg / STARTER_BASE.apg,
    spg: sTotals.spg / STARTER_BASE.spg,
    bpg: sTotals.bpg / STARTER_BASE.bpg,
  };

  // Starters-only: the starting 5 IS the team.
  const ratio = sRatio;

  const strength =
    ratio.ppg * 0.35 +
    ratio.rpg * 0.20 +
    ratio.apg * 0.20 +
    ratio.spg * 0.15 +
    ratio.bpg * 0.10;

  const weakestStatEntry = Object.entries(sRatio).reduce((min, e) => e[1] < min[1] ? e : min);
  const weakestStat      = weakestStatEntry[0];
  const minStarterRatio  = weakestStatEntry[1];
  const balancePenalty   = minStarterRatio < 0.82 ? (0.82 - minStarterRatio) * 0.8 : 0;

  const { chemBonus, chemScore, chemReport, lineupAssignment } = calculateChemistry(starters);

  // Unified coach boost — every coach has the same floor and the same
  // reachable ceiling; only the SYSTEM you must draft toward differs.
  const coachBoost = coach
    ? COACH_BOOST_FLOOR + coachSystemProgress(coach, starters).progress * COACH_BOOST_RANGE
    : 0;

  const baseStrength = Math.max(0, strength - balancePenalty + chemBonus + coachBoost);

  // ── Popularity / Fan-Hype modifier ───────────────────────────────────────
  // Smoothly maps avg roster popularity (floor 35 → ceil 100) to a multiplier
  // of 0.95x (low-key role-player team) up to 1.08x (all-time superstar lineup).
  const POP_FLOOR   = 35;
  const POP_CEIL    = 100;
  const MUL_MIN     = 0.97;
  const MUL_MAX     = 1.04;
  const allPlayers  = starters;
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

  // Per-game log. The win draw is identical to the old single-loop version —
  // opponents, scores, and margins are presentational flavor layered on top.
  let wins = 0;
  const games = [];
  for (let i = 0; i < 82; i++) {
    const won = Math.random() < winPct;
    if (won) wins++;
    games.push({ won });
  }
  wins = Math.max(0, Math.min(82, wins));
  decorateSeasonGames(games, winPct);

  const totals = { ...sTotals };

  return {
    wins,
    losses:     82 - wins,
    winPct:     +(winPct * 100).toFixed(1),
    strength:   +adjustedStrength.toFixed(3),
    baseStrength: +baseStrength.toFixed(3),
    totals, ratio, sTotals,
    balancePenalty: +balancePenalty.toFixed(4), weakestStat,
    chemScore, chemReport, lineupAssignment,
    avgPopularity: +avgPop.toFixed(1),
    popEloDelta,
    fansM,
    coachBoost: +coachBoost.toFixed(3),
    games,
  };
}

/**
 * Decorates a season's win/loss sequence with opponents, scores, and margins.
 * Stronger teams (higher winPct) win bigger; losses skew close so they read
 * as heartbreakers rather than blowouts.
 */
function decorateSeasonGames(games, winPct) {
  let lastOpp = null;
  for (const g of games) {
    let opp = pick(TEAMS);
    if (opp === lastOpp) opp = pick(TEAMS); // one retry is enough de-duping
    lastOpp = opp;

    const r      = Math.random();
    const exp    = g.won ? Math.max(0.55, 1.6 - winPct) : 2.2;
    const margin = 2 + Math.floor(Math.pow(r, exp) * 26);   // 2–28
    const base   = 95 + Math.floor(Math.random() * 28);      // 95–122

    g.opp    = opp;
    g.ps     = g.won ? base + Math.ceil(margin / 2) : base - Math.floor(margin / 2);
    g.os     = g.won ? base - Math.floor(margin / 2) : base + Math.ceil(margin / 2);
    g.margin = margin;
    g.type   = margin >= 15 ? 'blowout' : margin >= 8 ? 'solid' : 'close';
  }
}

/**
 * Simulates a head-to-head best-of-7 series between two drafted rosters.
 * Returns season stats for both teams + the series outcome.
 *
 * @param {object[]} p1Starters  @param {string|null} p1Coach
 * @param {object[]} p2Starters  @param {string|null} p2Coach
 * @returns {{ p1Season, p2Season, series, winner: 'p1'|'p2' }}
 */
/**
 * Generates a realistic NBA-style score for one head-to-head game.
 * Scores fall in the 88–128 range; margin typically 2–22 pts.
 */
function generateGameScore(p1Strength, p2Strength) {
  const totalStr  = p1Strength + p2Strength;
  const p1WinProb = 1 / (1 + Math.exp(-6 * (p1Strength - p2Strength)));
  const p1Wins    = Math.random() < p1WinProb;

  // Tempo: faster teams score more
  const base   = 95 + Math.floor(Math.random() * 28);   // 95–122
  // Margin: skewed toward close games (square the random to weight lower values)
  const r      = Math.random();
  const margin = 2 + Math.floor(r * r * 26);             // 2–27, skewed low

  const winnerScore = base + Math.floor(margin / 2);
  const loserScore  = base - Math.ceil(margin / 2);

  return {
    p1Score: p1Wins ? winnerScore : loserScore,
    p2Score: p1Wins ? loserScore  : winnerScore,
    p1Won:   p1Wins,
  };
}

export function simulateHeadToHeadSeries(p1Starters, p1Coach, p2Starters, p2Coach) {
  const p1Season = simulateSeason(p1Starters, p1Coach);
  const p2Season = simulateSeason(p2Starters, p2Coach);

  const p1Str = p1Season.strength;
  const p2Str = p2Season.strength;

  // Pre-compute all games with realistic scores
  const games = [];
  let p1Wins = 0, p2Wins = 0;
  while (p1Wins < 4 && p2Wins < 4) {
    const g = generateGameScore(p1Str, p2Str);
    if (g.p1Won) p1Wins++; else p2Wins++;
    games.push({ gameNum: games.length + 1, ...g, p1WinsAfter: p1Wins, p2WinsAfter: p2Wins });
  }

  const winner = p1Wins === 4 ? 'p1' : 'p2';
  // backwards-compat shape used by renderSeriesResult
  const series = {
    playerWins: p1Wins,
    oppWins:    p2Wins,
    games:      games.map(g => g.p1Won ? 'W' : 'L'),
    won:        winner === 'p1',
  };

  return { p1Season, p2Season, games, p1Wins, p2Wins, winner, series };
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

