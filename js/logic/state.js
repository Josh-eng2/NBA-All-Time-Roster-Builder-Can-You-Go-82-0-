/**
 * js/logic/state.js — Global Game State & Configuration Constants
 *
 * Exports:
 *   • All static config constants (TEAMS, DECADES, COACHES, TEAM_COLORS, …)
 *   • `S`          — the live, mutable game-state object (ES module live binding)
 *   • `startGame`  — resets / initialises S for a new draft session
 *   • `pick`       — tiny array-random-pick utility used across multiple modules
 *   • `getPlayerSeed` / `buildBracket` — playoff seeding helpers
 */

import { getLockedPlayer } from './challenge.js';

// ── Static configuration ──────────────────────────────────────────────────────

export const TEAMS = [
  'Lakers','Bulls','Warriors','Celtics','Heat','Spurs','Knicks',
  'Jazz','Pistons','Magic','Suns','Nuggets','Sixers',
  'Rockets','Thunder','Bucks','Mavericks','Cavaliers',
  'Blazers','Nets','Kings','Raptors','Hawks','Hornets','Pacers','Clippers','Timberwolves','Pelicans',
  'Grizzlies','Wizards',
];

export const DECADES = ['1960s','1970s','1980s','1990s','2000s','2010s','2020s'];

export const POSITIONS     = ['PG','SG','SF','PF','C'];
export const ALL_POSITIONS  = [...POSITIONS]; // starters-only format — no bench
export const TOTAL_ROUNDS   = 5;

/**
 * Snake draft pick order for 1v1 (10 total picks, 5 per player).
 * Pattern: 1-2-2-1-1-2-2-1-1-2
 * Indexed by overall pick number (0 = first pick).
 * Eliminates the structural first-pick advantage of strict alternation.
 */
export const SNAKE_ORDER = [1, 2, 2, 1, 1, 2, 2, 1, 1, 2];

export const ERA_DESC = {
  '1960s': 'Chamberlain · West · Russell',
  '1970s': 'Kareem · Erving · Frazier',
  '1980s': 'Bird · Magic · Jordan',
  '1990s': 'Jordan · Shaq · Barkley',
  '2000s': 'Kobe · AI · T-Mac',
  '2010s': 'LeBron · Curry · Durant',
  '2020s': 'Jokic · LeBron · Booker',
};

export const TEAM_COLORS = {
  Lakers:     { bg: '#552583', accent: '#FDB927' },
  Bulls:      { bg: '#CE1141', accent: '#ffffff' },
  Warriors:   { bg: '#1D428A', accent: '#FFC72C' },
  Celtics:    { bg: '#007A33', accent: '#ffffff' },
  Heat:       { bg: '#98002E', accent: '#F9A01B' },
  Spurs:      { bg: '#C4CED4', accent: '#000000' },
  Knicks:     { bg: '#006BB6', accent: '#F58426' },
  Jazz:       { bg: '#002B5C', accent: '#F9A01B' },
  Pistons:    { bg: '#C8102E', accent: '#1D428A' },
  Magic:      { bg: '#0077C0', accent: '#C4CED4' },
  Suns:       { bg: '#1D1160', accent: '#E56020' },
  Nuggets:    { bg: '#0E2240', accent: '#FEC524' },
  Sixers:     { bg: '#006BB6', accent: '#ED174C' },
  Rockets:    { bg: '#CE1141', accent: '#000000' },
  Thunder:    { bg: '#007AC3', accent: '#FDBB30' },
  Bucks:      { bg: '#00471B', accent: '#EEE1C6' },
  Mavericks:  { bg: '#00538C', accent: '#B8C4CA' },
  Cavaliers:  { bg: '#860038', accent: '#FDBB30' },
  Blazers:    { bg: '#E03A3E', accent: '#000000' },
  Nets:       { bg: '#000000', accent: '#ffffff' },
  Kings:      { bg: '#5A2D81', accent: '#63727A' },
  Raptors:    { bg: '#CE1141', accent: '#000000' },
  Hawks:      { bg: '#E03A3E', accent: '#C1D32F' },
  Hornets:    { bg: '#1D1160', accent: '#00788C' },
  Pacers:     { bg: '#002D62', accent: '#FDBB30' },
  Clippers:      { bg: '#C8102E', accent: '#1D428A' },
  Timberwolves:  { bg: '#0C2340', accent: '#78BE20' },
  Pelicans:      { bg: '#002B5C', accent: '#B4975A' },
  Grizzlies:     { bg: '#5D76A9', accent: '#12173F' },
  Wizards:       { bg: '#002B5C', accent: '#E31837' },
};

export const ARCHETYPE_STYLE = {
  'Playmaker':         { bg: '#dbeafe', text: '#1d4ed8' },
  'Sharpshooter':      { bg: '#fef3c7', text: '#92400e' },
  'Lockdown Defender': { bg: '#f3e8ff', text: '#6d28d9' },
  'Slasher':           { bg: '#ede9fe', text: '#5b21b6' },
  'Paint Beast':       { bg: '#dcfce7', text: '#15803d' },
  'Two-Way Star':      { bg: '#ffedd5', text: '#9a3412' },
};

export const COACHES = [
  {
    id:     'auerbach',
    name:   'Red Auerbach',
    era:    '1960s',
    system: 'Celtic Pride',
    desc:   'Defense-first — Twin Towers, Defensive Anchor, and All-Defensive Team bonuses amplified; interior defense penalties negated.',
    accent: '#4ade80',
  },
  {
    id:     'holzman',
    name:   'Red Holzman',
    era:    '1970s',
    system: 'Hit the Open Man',
    desc:   'Unselfish ball-movement — Floor General and Perimeter Lockdown bonuses amplified ×1.5.',
    accent: '#0369a1',
  },
  {
    id:     'riley',
    name:   'Pat Riley',
    era:    '1980s',
    system: 'Grit & Grind / Showtime',
    desc:   'Defense and transition driven — Showtime Transition and All-Defensive Team amplified ×1.5; Defensive Liability penalty negated.',
    accent: '#f87171',
  },
  {
    id:     'jackson',
    name:   'Phil Jackson',
    era:    '1990s',
    system: 'Triangle Offense',
    desc:   'Star-driven — Dynamic Duo and Heliocentric Engine bonuses amplified ×1.5; Clashing Egos penalty softened to −2%.',
    accent: '#c084fc',
  },
  {
    id:     'popovich',
    name:   'Gregg Popovich',
    era:    '2000s',
    system: 'The Beautiful Game',
    desc:   'Offense-first — The Beautiful Game rewards efficient team scoring; Floor General bonus amplified ×1.5.',
    accent: '#60a5fa',
  },
  {
    id:     'kerr',
    name:   'Steve Kerr',
    era:    '2010s',
    system: 'Motion Offense',
    desc:   'Spacing and ball-movement driven — Small Ball Heat, Three-and-D Paradigm, and Floor General bonuses amplified; Defensive Sieve penalty heightened.',
    accent: '#fbbf24',
  },
  {
    id:     'rivers',
    name:   'Doc Rivers',
    era:    '2020s',
    system: 'Ubuntu',
    desc:   'Cohesion-first — Dynamic Duo and All-Defensive Team bonuses amplified ×1.5; Clashing Egos penalty fully negated.',
    accent: '#34d399',
  },
];

// ── Playoff CPU opponents ─────────────────────────────────────────────────────

export const CPU_TEAMS = [
  { name: '96 Bulls',       strength: 2.38 },
  { name: '17 Warriors',    strength: 2.37 },
  { name: '86 Celtics',     strength: 2.25 },
  { name: '87 Lakers',      strength: 2.20 },
  { name: '01 Lakers',      strength: 2.15 },
  { name: '13 Heat',        strength: 2.00 },
  { name: '14 Spurs',       strength: 1.95 },
  { name: '04 Pistons',     strength: 1.94 },
  { name: '16 Cavaliers',   strength: 1.93 },
  { name: '94 Rockets',     strength: 1.92 },
  { name: '11 Mavericks',   strength: 1.91 },
  { name: '08 Celtics',     strength: 1.90 },
  { name: '05 Spurs',       strength: 1.89 },
  { name: '03 Spurs',       strength: 1.88 },
  { name: '89 Pistons',     strength: 1.87 },
];

// ── Utility ───────────────────────────────────────────────────────────────────

/** Pick a random element from an array. */
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// ── Playoff helpers ───────────────────────────────────────────────────────────

/**
 * Returns a playoff seed (1–8) based on the regular-season win total.
 * @param {number} wins
 * @returns {number}
 */
export function getPlayerSeed(wins) {
  if (wins >= 70) return 1;
  if (wins >= 60) return 2;
  if (wins >= 50) return 3;
  if (wins >= 41) return 4;
  return 8;
}

/**
 * Builds the first-round bracket of four matchups.
 * The player occupies their seed slot; remaining 7 slots are filled by the
 * top CPU teams sorted by strength.
 *
 * @param {number} playerSeed       1–8
 * @param {number} playerStrength   adjusted Elo-like strength number
 * @returns {Array<[object, object]>}  four [teamA, teamB] pairs
 */
export function buildBracket(playerSeed, playerStrength) {
  const cpuSorted = [...CPU_TEAMS].sort((a, b) => b.strength - a.strength);
  // seeds is 0-indexed; index 0 = seed 1
  const seeds = Array(8).fill(null);
  seeds[playerSeed - 1] = { name: 'Your Team', strength: playerStrength, isPlayer: true };

  let cpuIdx = 0;
  for (let i = 0; i < 8; i++) {
    if (!seeds[i]) seeds[i] = { ...cpuSorted[cpuIdx++], isPlayer: false };
  }

  // Classic 1v8, 2v7, 3v6, 4v5 bracket
  return [
    [seeds[0], seeds[7]],
    [seeds[1], seeds[6]],
    [seeds[2], seeds[5]],
    [seeds[3], seeds[4]],
  ];
}

// ── Mutable game state (ES module live binding) ───────────────────────────────
//
// Rules:
//   • Always access S via the named import — never destructure it at the
//     module top level, since startGame() replaces the entire object.
//   • All modules that read S must do so inside function bodies, not at
//     module-init time, so they always pick up the live reference.

/** @type {object} */
export let S = {
  phase:          'mode-select', // 'mode-select' | 'drafting' | 'season-sim' | 'results' | 'playoffs' | 'trophy-room' | 'series-result'
  mode:           null,          // 'solo' | '1v1'
  currentPlayer:  1,             // 1 or 2 (1v1 only)
  p1:             null,          // snapshot of P1 after sequential draft (old 1v1 flow — kept for compat)
  seriesResult:   null,
  coach:          null,
  selectedEra:    null,
  // 1v1 alternating draft state (set by startGame1v1)
  p1Coach: null, p1Era: null, p2Coach: null, p2Era: null,
  p1Roster: null, p2Roster: null,
  p1Round: 0, p2Round: 0,
  draftLog: [],
};

/**
 * Resets S to a fresh drafting state.
 * Called by the events module when a coach + era have been selected.
 *
 * @param {string} era  e.g. '1990s' or 'all'
 */
export function startGame(era = 'all') {
  const coach         = S.coach;         // preserve the coach selected in the previous phase
  const mode          = S.mode;
  const currentPlayer = S.currentPlayer;
  const p1            = S.p1;
  const dailyChallenge = S.dailyChallenge ?? null; // daily mode context survives the reset
  const dailyDate      = S.dailyDate      ?? null;
  S = {
    phase:            'drafting',
    coach,
    coachLocked:      false,   // locks on the first spin — commit before you see players
    coachPickerOpen:  false,
    eraLocked:        false,   // locks on the first spin — same moment as coach
    eraPickerOpen:    false,
    mode,
    currentPlayer,
    p1,
    seriesResult:     null,
    selectedEra:      era,
    gameId:           crypto.randomUUID(),
    round:            0,
    usedDecades:      [],
    usedPlayerIds:    [],
    draftedPlayerNames: new Set(), // names of players currently on the roster (blocks cross-era clones)
    teamSkips:        1,
    decadeSkips:      1,
    drySpins:         0,        // consecutive boards without a star+ player (pity timer)

    spinState:        'idle',   // 'idle' | 'spinning' | 'done'
    currentSpin:      null,     // { team, decade }
    availablePlayers: [],
    draftBoard:       [],       // pick board — all available players from the current spin's team/decade
    selectedPlayer:   null,
    roster: { PG: null, SG: null, SF: null, PF: null, C: null },
    result:  null,
    playoffs: null,
    teamName: '',
    runSaved: false,
    globalScoreSubmitted: false,
    globalSubmitError:    null,
    globalSubmittedChampion: false,

    // Paced season reveal
    seasonGames:     [],
    seasonRevealIdx: 0,
    seasonPaused:    false,
    rivalTease:      false,  // Rivalry Night banner currently showing
    rivalTeased:     false,  // one-shot guard — tease fires once per season

    // Daily Challenge context (null outside daily runs)
    dailyChallenge,
    dailyDate,
    dailyResult: null,       // { pass, pending, detail, streak } — set at sim time
  };

  // Locked-player daily challenges start with the star already in their slot,
  // registered exactly like a drafted pick (id/name/decade dedup all apply).
  if (dailyChallenge?.type === 'locked') {
    const locked = getLockedPlayer(dailyChallenge);
    if (locked) {
      const pos = dailyChallenge.params.pos;
      S.roster[pos] = locked;
      S.usedPlayerIds.push(locked.id);
      S.draftedPlayerNames.add(locked.name);
      if (locked.decade) S.usedDecades.push(locked.decade);
    }
  }
}

/**
 * Initialises S for a 1v1 alternating draft.
 * Called after both players have selected their coach + era.
 */
export function startGame1v1() {
  const { p1Coach, p1Era, p2Coach, p2Era } = S;
  S = {
    phase:    'drafting',
    mode:     '1v1',
    currentPlayer: 1,
    p1Coach, p1Era, p2Coach, p2Era,
    p1Roster: { PG: null, SG: null, SF: null, PF: null, C: null },
    p2Roster: { PG: null, SG: null, SF: null, PF: null, C: null },
    p1Round:  0,
    p2Round:  0,
    draftLog: [],
    eraLocked:     false,
    eraPickerOpen: false,

    // Shared draft-pool tracking
    gameId:    crypto.randomUUID(),
    usedDecades: [],
    usedPlayerIds: [],
    draftedPlayerNames: new Set(),
    // Per-player skip budgets — each drafter gets their own team/era skip
    p1TeamSkips: 1, p1DecadeSkips: 1,
    p2TeamSkips: 1, p2DecadeSkips: 1,
    drySpins:   0,
    spinState:  'idle',
    currentSpin: null,
    availablePlayers: [],
    draftBoard: [],
    selectedPlayer: null,

    // Solo-mode fields kept to avoid undefined refs
    roster: { PG: null, SG: null, SF: null, PF: null, C: null },
    round: 0,
    result: null,
    playoffs: null,
    teamName: '',
    runSaved: false,
    globalScoreSubmitted: false,
    globalSubmitError: null,
    globalSubmittedChampion: false,
    teamSkips: 0,
    decadeSkips: 0,
    seriesResult: null,
    p1: null,
    selectedEra: null,
    coach: null,
  };
}
