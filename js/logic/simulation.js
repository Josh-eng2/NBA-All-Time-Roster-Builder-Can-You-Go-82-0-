/**
 * js/logic/simulation.js — Season & Playoff Simulation Engine
 *
 * Starters-only format: team strength comes entirely from the starting 5.
 * A sigmoid maps adjustedStrength → per-game win probability.
 * Chemistry bonuses/penalties (from chemistry.js) are baked into
 * adjustedStrength before the sigmoid is applied.
 *
 * Exports:
 *   simulateSeason(starters, coach, profile?)  → full result object
 *   simulateSeries(playerStr, oppStr) → series result object
 *   simulateDynastySeries(playerSeason, opponent) → head-to-head shaped series result
 */

import { DB }                  from '../data/players.js';
import { calculateChemistry, chemScoreFromBonus } from '../logic/chemistry.js';
import { TEAMS, pickCosmetic, S } from '../logic/state.js';
import { eraFactor, eraAdjustedStat, eraAdjustedLine, decadeFromBucketKey } from '../logic/era.js';
import { getModeConfig }       from '../logic/modes.js';

// ── Sigmoid tuning knobs ──────────────────────────────────────────────────────
// SIM_K:      steepness — lower = more gradual spread between good/bad teams
// SIM_CENTER: adjustedStrength that maps to exactly 50 % win rate
//             (raise to make 82-0 rarer, lower to make it easier)
// WIN_CAP:    per-game win probability ceiling — 0.99 means even a maxed
//             roster can lose any given night, so 82-0 is never guaranteed
//
// Retuned (K 5→3.5, CENTER 1.62→1.8, CAP 1.0→0.99) after the previous curve
// made perfection routine: a star-chasing roster hit 80-win medians and went
// 82-0 in roughly a quarter of runs. Empirical anchors from 400-sample sweeps
// against the live DB under THESE constants (strengths are post-multiplier):
//   star-chasing builds — median 2.36 → ~72 wins; p90 2.75 → ~79 wins;
//   P(82-0) ≈ 1.5 % across those builds (the chase stays real but rare)
//   random builds       — median 1.41 → ~17 wins; p90 1.78 → ~40 wins
// Daily-challenge win gates under this curve (star-chasing builds):
//   55+ ≈ 83 % · 60+ ≈ 76 % · 65+ ≈ 66 % · 70+ ≈ 54 % pass rates pre-constraint.
const SIM_K      = 3.5;
const SIM_CENTER = 1.8;
const WIN_CAP    = 0.99;

let _baselinesCache = null;

/**
 * Derives the dynamic STARTER_BASE from the live DB.
 * Treats the top ~71.4 % of players (by composite score) as the starter tier.
 * Stats are pace-adjusted to modern tempo (see era.js) before ranking and
 * averaging, so the tier isn't just "whoever played in the fastest decade" —
 * a 1960s big's raw 23 rpg and a 2000s big's raw 13 rpg are compared on the
 * same footing.
 * Memoized — DB never changes after startup so the sort runs at most once.
 */
function computeSimBaselines() {
  if (_baselinesCache) return _baselinesCache;
  const STATS = ['ppg', 'rpg', 'apg', 'spg', 'bpg'];
  const all   = [];
  for (const [bucketKey, players] of Object.entries(DB)) {
    const decade = decadeFromBucketKey(bucketKey);
    for (const p of players) all.push({ ...eraAdjustedLine({ ...p, decade }) });
  }
  const score  = p => p.ppg * 0.35 + p.rpg * 0.20 + p.apg * 0.20 + p.spg * 0.15 + p.bpg * 0.10;
  const sorted = [...all].sort((a, b) => score(b) - score(a));
  const cut    = Math.round(sorted.length * 5 / 7); // tier cut unchanged — keeps STARTER_BASE identical
  const sTier  = sorted.slice(0, cut);
  const avg    = (arr, stat) => arr.reduce((s, p) => s + p[stat], 0) / arr.length;
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
    const tot = players.reduce((s, p) => s + eraAdjustedStat(p, k), 0);
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
      const tot = starters.reduce((s, p) => s + eraAdjustedStat(p, k), 0);
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

// ── Loss diagnosis ────────────────────────────────────────────────────────────
// Human-readable labels for each tracked stat.
const STAT_LABEL = {
  ppg: 'scoring',
  rpg: 'rebounding',
  apg: 'playmaking',
  spg: 'perimeter defense',
  bpg: 'rim protection',
};

// Which position slot is most accountable for generating each stat.
// The first position in each array is "most responsible" and so on down.
// This ensures a C with low APG is never indicted for a playmaking gap —
// the PG owns that slot.
const STAT_ROLE_PRIORITY = {
  ppg: ['SG', 'SF', 'PG', 'PF', 'C'],
  rpg: ['C',  'PF', 'SF', 'SG', 'PG'],
  apg: ['PG', 'SG', 'SF', 'PF', 'C'],
  spg: ['PG', 'SG', 'SF', 'PF', 'C'],
  bpg: ['C',  'PF', 'SF', 'SG', 'PG'],
};

// Plain-English draft advice for each stat gap.
const STAT_DRAFT_FIX = {
  ppg: 'a higher-scoring starter — look for strong PPG at SG or SF',
  rpg: 'a dominant rebounder — target a C or PF with elite RPG',
  apg: 'a playmaking guard — look for strong APG at PG',
  spg: 'a perimeter stopper — target a PG or SG with high SPG',
  bpg: 'a rim protector — look for a C or PF with strong BPG',
};

/**
 * Packages the engine's balance-penalty diagnosis into a structured object
 * the UI can display verbatim — no re-derivation on the UI side needed.
 *
 * Culprit selection uses position-role priority so a center is never blamed
 * for a playmaking gap, a guard is never blamed for a rim-protection gap, etc.
 * Tie-breaking follows: (1) role priority, (2) worst contributor relative to
 * per-player baseline, (3) lowest raw stat value, (4) draft-slot order.
 *
 * @param {object[]} starters
 * @param {string}   weakestStat   — 'ppg'|'rpg'|'apg'|'spg'|'bpg'
 * @param {number}   balancePenalty
 * @param {object}   sRatio        — team stat / STARTER_BASE per stat
 * @param {object}   STARTER_BASE  — 5-player aggregate baselines
 * @returns {object|null}
 */
function buildLossDiagnosis(starters, weakestStat, balancePenalty, sRatio, STARTER_BASE) {
  if (!weakestStat || !starters.length) return null;

  const statLabel      = STAT_LABEL[weakestStat] || weakestStat;
  const teamRatio      = sRatio[weakestStat];
  const perPlayerBase  = STARTER_BASE[weakestStat] / 5; // expected per-starter contribution
  const rolePriority   = STAT_ROLE_PRIORITY[weakestStat] || ['PG', 'SG', 'SF', 'PF', 'C'];

  // All comparisons below use pace-adjusted stats (STARTER_BASE is itself
  // pace-adjusted) so a 1960s starter isn't cleared — or a 2000s starter
  // isn't indicted — purely because of the possessions their era played with.
  const adj = p => eraAdjustedStat(p, weakestStat);

  // Build a position → player map for fast lookup. Two starters can share a
  // natural position — keep the weaker one for the weakest stat, since the
  // culprit search below indicts the worst contributor at each role.
  const byPos = {};
  for (const p of starters) {
    if (!byPos[p.pos] || adj(p) < adj(byPos[p.pos])) byPos[p.pos] = p;
  }

  // ── Step 1: find the role-priority player whose stat is below per-player baseline.
  // This is the most actionable upgrade: the "responsible" slot is underperforming.
  let culprit    = null;
  let culpritPos = null;

  for (const rolePos of rolePriority) {
    const p = byPos[rolePos];
    if (p && adj(p) < perPlayerBase) {
      culprit    = p;
      culpritPos = rolePos;
      break;
    }
  }

  // ── Step 2: every role-priority player is at or above baseline, but the team
  // ratio is still low (secondary positions are dragging). Indict the starter
  // in the role-priority order who has the lowest raw stat — the clearest
  // upgrade point.
  if (!culprit) {
    for (const rolePos of rolePriority) {
      const p = byPos[rolePos];
      if (p && (!culprit || adj(p) < adj(culprit))) {
        culprit    = p;
        culpritPos = rolePos;
      }
    }
  }

  // ── Step 3: safety net — position not filled; fall back to lowest raw value.
  if (!culprit) {
    for (const p of starters) {
      if (!culprit || adj(p) < adj(culprit)) culprit = p;
    }
    culpritPos = culprit?.pos ?? null;
  }

  // If the culprit is actually at or above the per-player baseline the weakness
  // is genuinely team-wide, not a single-player failure — flag it that way.
  const culpritBelowBase = culprit ? adj(culprit) < perPlayerBase : false;

  return {
    primaryCause:      'balance_penalty',
    statKey:           weakestStat,
    statLabel,
    teamRatio:         +teamRatio.toFixed(3),
    penaltyAmount:     +balancePenalty.toFixed(4),
    culpritId:         culprit?.id          ?? null,
    culpritName:       culprit?.name        ?? null,
    culpritPos,
    culpritStat:       culprit ? +adj(culprit).toFixed(1) : null,
    perPlayerBase:     +perPlayerBase.toFixed(1),
    culpritBelowBase,
    recommendedFix:    STAT_DRAFT_FIX[weakestStat] ?? `a stronger ${statLabel} contributor`,
  };
}

// ── Per-player season stat lines ──────────────────────────────────────────────
// Believable individual box-score lines for a simulated season. Each starter's
// line tracks their real per-game averages, perturbed by a per-season "form"
// roll (a hot/cold year) and gently coupled to team success — so two sims of the
// same roster differ without drifting away from who the player really is.
//
// Generated ONCE inside simulateSeason() and frozen into the result — never in
// the renderer — so the numbers shown on the end screen are identical to the
// ones saved to the leaderboard.
const PLAYER_STAT_KEYS = ['ppg', 'rpg', 'apg', 'spg', 'bpg'];
// per-game key → season-total key
const SEASON_TOTAL_KEY = { ppg: 'pts', rpg: 'reb', apg: 'ast', spg: 'stl', bpg: 'blk' };

/** Standard-normal sample via Box–Muller. */
function gaussian() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const clampNum = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Generates believable per-player season lines + a stat-leader summary.
 *
 * @param {object[]} starters
 * @param {number}   winPct  team per-game win probability (0..1)
 * @returns {{ playerStats: object[], statLeaders: object, simTotals: object }}
 */
function simulatePlayerStats(starters, winPct) {
  // Team-success coupling: a juggernaut lifts everyone slightly, a cellar team
  // drags them down — deliberately gentle so it never distorts who the player is.
  const teamFactor = 1 + (clampNum(winPct, 0, 1) - 0.5) * 0.04; // 0.98 … 1.02
  const gp = 82;

  const playerStats = starters.map(p => {
    // One hot/cold roll per season. Season averages over 82 games are stable in
    // reality, so the swing is tight — a 30-PPG scorer lands ~28–32, not 24–37.
    const form = clampNum(1 + gaussian() * 0.035, 0.91, 1.09);
    const line = { id: p.id, name: p.name, pos: p.pos, gp };
    for (const k of PLAYER_STAT_KEYS) {
      const perGame = Math.max(0, (p[k] || 0) * form * teamFactor);
      const rounded = Math.round(perGame * 10) / 10;
      line[k] = rounded;
      line[SEASON_TOTAL_KEY[k]] = Math.round(rounded * gp); // season total
    }
    return line;
  });

  // Best starter in each category this season.
  const leaderFor = k => {
    let best = null;
    for (const l of playerStats) if (!best || l[k] > best[k]) best = l;
    return best ? { id: best.id, name: best.name, val: best[k] } : null;
  };
  const statLeaders = {
    scoring:    leaderFor('ppg'),
    rebounding: leaderFor('rpg'),
    assists:    leaderFor('apg'),
    steals:     leaderFor('spg'),
    blocks:     leaderFor('bpg'),
  };

  const simTotals = PLAYER_STAT_KEYS.reduce((acc, k) => {
    acc[k] = +playerStats.reduce((s, l) => s + l[k], 0).toFixed(1);
    return acc;
  }, {});

  return { playerStats, statLeaders, simTotals };
}

/**
 * Simulates a full 82-game regular season.
 *
 * @param {object[]} starters  5 starting player objects
 * @param {string|null} coach
 * @param {string} [profile]   'classic' | 'defense' | 'fans' — defaults from S.mode
 * @returns {object}
 */
export function simulateSeason(starters, coach = null, profile = null) {
  const simProfile = profile || getModeConfig(S?.mode).simProfile || 'classic';

  // Pace-adjusted (era-neutral) totals drive the win-probability engine, so a
  // roster stacked with fast-paced-era players doesn't out-strength an
  // equally good roster from a slower era just because of possession counts.
  const sumStats = arr => arr.reduce(
    (acc, p) => {
      const adj = eraAdjustedLine(p);
      return {
        ppg: acc.ppg + adj.ppg,
        rpg: acc.rpg + adj.rpg,
        apg: acc.apg + adj.apg,
        spg: acc.spg + adj.spg,
        bpg: acc.bpg + adj.bpg,
      };
    },
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

  const weights = simProfile === 'defense'
    ? { ppg: 0.10, rpg: 0.30, apg: 0.10, spg: 0.25, bpg: 0.25 }
    : { ppg: 0.35, rpg: 0.20, apg: 0.20, spg: 0.15, bpg: 0.10 };

  const strength =
    ratio.ppg * weights.ppg +
    ratio.rpg * weights.rpg +
    ratio.apg * weights.apg +
    ratio.spg * weights.spg +
    ratio.bpg * weights.bpg;

  // Defense mode: prefer diagnosing RPG/SPG/BPG shortfalls first.
  const diagEntries = simProfile === 'defense'
    ? Object.entries(sRatio).filter(([k]) => k === 'rpg' || k === 'spg' || k === 'bpg')
    : Object.entries(sRatio);
  const weakestStatEntry = (diagEntries.length ? diagEntries : Object.entries(sRatio))
    .reduce((min, e) => e[1] < min[1] ? e : min);
  const weakestStat      = weakestStatEntry[0];
  const minStarterRatio  = weakestStatEntry[1];
  const balancePenalty   = minStarterRatio < 0.82 ? (0.82 - minStarterRatio) * 0.8 : 0;

  const lossDiagnosis = buildLossDiagnosis(starters, weakestStat, balancePenalty, sRatio, STARTER_BASE);

  let { chemBonus, chemScore, chemReport, chemEntries, lineupAssignment } = calculateChemistry(starters, coach);

  if (simProfile === 'defense') {
    // Structured families replace the old label-regex sniffing, which silently
    // broke whenever a synergy was renamed and misclassified edge cases
    // (e.g. Two-Way Pillars never matched the defense pattern).
    const hasDef = chemEntries.some(e => e.kind === 'synergy' && e.family === 'defense');
    const hasOff = chemEntries.some(e => e.kind === 'synergy' && e.family === 'offense');
    if (hasDef) chemBonus *= 1.35;
    else if (hasOff) chemBonus *= 0.75;
    chemScore = chemScoreFromBonus(chemBonus);
  }

  // Unified coach boost — every coach has the same floor and the same
  // reachable ceiling; only the SYSTEM you must draft toward differs.
  const coachBoost = coach
    ? COACH_BOOST_FLOOR + coachSystemProgress(coach, starters).progress * COACH_BOOST_RANGE
    : 0;

  const baseStrength = Math.max(0, strength - balancePenalty + chemBonus + coachBoost);

  // ── Popularity / Fan-Hype modifier ───────────────────────────────────────
  const POP_FLOOR   = 35;
  const POP_CEIL    = 100;
  const MUL_MIN     = simProfile === 'fans' ? 0.90 : 0.97;
  const MUL_MAX     = simProfile === 'fans' ? 1.12 : 1.04;
  const allPlayers  = starters;
  const avgPop      = allPlayers.length
    ? allPlayers.reduce((s, p) => s + (p.popularity || 50), 0) / allPlayers.length
    : 50;
  const popNorm     = Math.max(0, Math.min(1, (avgPop - POP_FLOOR) / (POP_CEIL - POP_FLOOR)));
  const popMul      = MUL_MIN + popNorm * (MUL_MAX - MUL_MIN);

  // ── Player-Rating modifier ────────────────────────────────────────────────
  // Keyed to `overall` (era-adjusted 2K rating, mean ≈87 sd ≈6.1), not the
  // stats-derived `rating` (mean ≈77 sd ≈8.3). MID/SPAN are the same
  // percentile anchors as the old 76/14 re-expressed on the new scale, so the
  // multiplier's distribution across rosters is unchanged.
  const RATING_MID  = 87;
  const RATING_SPAN = 10;
  const RATING_AMP  = 0.04;
  const avgRating   = allPlayers.length
    ? allPlayers.reduce((s, p) => s + (p.overall ?? 82), 0) / allPlayers.length
    : 82;
  const ratingNorm  = Math.max(-1, Math.min(1, (avgRating - RATING_MID) / RATING_SPAN));
  const ratingMul   = 1 + ratingNorm * RATING_AMP;

  const adjustedStrength = baseStrength * popMul * ratingMul;
  const popEloDelta    = +(baseStrength * (popMul - 1)).toFixed(3);
  const ratingEloDelta = +(baseStrength * popMul * (ratingMul - 1)).toFixed(3);

  const fansM = +(Math.pow(popNorm, 1.5) * 38 + 2).toFixed(1);

  const winPct = Math.min(WIN_CAP, 1 / (1 + Math.exp(-SIM_K * (adjustedStrength - SIM_CENTER))));

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

  const { playerStats, statLeaders, simTotals } = simulatePlayerStats(starters, winPct);

  const teamStocks = +(sTotals.spg + sTotals.bpg).toFixed(1);

  return {
    wins,
    losses:     82 - wins,
    winPct:     +(winPct * 100).toFixed(1),
    strength:   +adjustedStrength.toFixed(3),
    baseStrength: +baseStrength.toFixed(3),
    totals, ratio, sTotals,
    balancePenalty: +balancePenalty.toFixed(4), weakestStat, lossDiagnosis,
    chemScore, chemReport, chemEntries, lineupAssignment,
    avgPopularity: +avgPop.toFixed(1),
    popEloDelta,
    avgRating:  +avgRating.toFixed(1),
    ratingMul:  +ratingMul.toFixed(4),
    ratingEloDelta,
    playerStats, statLeaders, simTotals,
    fansM,
    coachBoost: +coachBoost.toFixed(3),
    games,
    simProfile,
    teamStocks,
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
    // pickCosmetic, not pick: the daily seed governs draft OFFERS only —
    // season dressing drawing from the seeded stream contradicted that
    // invariant (documented in state.js) whenever a daily run simulated.
    let opp = pickCosmetic(TEAMS);
    // Re-draw until the opponent differs from the previous game's (bounded —
    // a single retry still let back-to-back repeats slip through ~0.1% of rows)
    for (let t = 0; t < 5 && opp === lastOpp; t++) opp = pickCosmetic(TEAMS);
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
 * Best-of-7 vs a Dynasty Duel CPU team (no opposing roster cards).
 * Returns the same shape as simulateHeadToHeadSeries for shared series UI.
 */
export function simulateDynastySeries(playerSeason, opponent) {
  const p1Str = playerSeason.strength;
  const p2Str = opponent.strength;
  const p2Season = {
    strength: p2Str,
    chemScore: 88,
    chemReport: [`🟢 Legendary dynasty: ${opponent.name}`],
    wins: 70,
    losses: 12,
    avgPopularity: 92,
    fansM: 38,
    teamStocks: 0,
  };

  const games = [];
  let p1Wins = 0, p2Wins = 0;
  while (p1Wins < 4 && p2Wins < 4) {
    const g = generateGameScore(p1Str, p2Str);
    if (g.p1Won) p1Wins++; else p2Wins++;
    games.push({ gameNum: games.length + 1, ...g, p1WinsAfter: p1Wins, p2WinsAfter: p2Wins });
  }

  const winner = p1Wins === 4 ? 'p1' : 'p2';
  const series = {
    playerWins: p1Wins,
    oppWins:    p2Wins,
    games:      games.map(g => g.p1Won ? 'W' : 'L'),
    won:        winner === 'p1',
  };

  return { p1Season: playerSeason, p2Season, games, p1Wins, p2Wins, winner, series, opponent };
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

