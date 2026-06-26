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

// ── Static configuration ──────────────────────────────────────────────────────

export const TEAMS = [
  'Lakers','Bulls','Warriors','Celtics','Heat','Spurs','Knicks',
  'Jazz','Pistons','Magic','Suns','Nuggets','Sixers',
  'Rockets','Thunder','Bucks','Mavericks','Cavaliers',
];

export const DECADES = ['1960s','1970s','1980s','1990s','2000s','2010s','2020s'];

export const POSITIONS       = ['PG','SG','SF','PF','C'];
export const BENCH_POSITIONS = ['B1','B2'];
export const ALL_POSITIONS   = [...POSITIONS, ...BENCH_POSITIONS];
export const TOTAL_ROUNDS    = 7;

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
    id:     'jackson',
    name:   'Phil Jackson',
    system: 'Triangle Offense',
    desc:   'Star-driven — Dynamic Duo and Heliocentric Engine bonuses amplified ×1.5; Clashing Egos penalty softened to −2%.',
    accent: '#c084fc',
  },
  {
    id:     'popovich',
    name:   'Gregg Popovich',
    system: 'The Beautiful Game',
    desc:   'Bench and ball-movement driven — Second Unit General and Floor General amplified ×1.5; Barren Bench penalty negated.',
    accent: '#60a5fa',
  },
  {
    id:     'auerbach',
    name:   'Red Auerbach',
    system: 'Celtic Pride',
    desc:   'Defense-first — Twin Towers, Defensive Anchor, and All-Defensive Team bonuses amplified; interior defense penalties negated.',
    accent: '#4ade80',
  },
  {
    id:     'riley',
    name:   'Pat Riley',
    system: 'Grit & Grind / Showtime',
    desc:   'Defense and transition driven — Showtime Transition and All-Defensive Team amplified ×1.5; Defensive Liability penalty negated.',
    accent: '#f87171',
  },
  {
    id:     'kerr',
    name:   'Steve Kerr',
    system: 'Motion Offense',
    desc:   'Spacing and ball-movement driven — Small Ball Heat, Three-and-D Paradigm, and Floor General bonuses amplified; Defensive Sieve penalty heightened.',
    accent: '#fbbf24',
  },
];

// ── Playoff CPU opponents ─────────────────────────────────────────────────────

export const CPU_TEAMS = [
  { name: '96 Bulls',       strength: 1.38 },
  { name: '17 Warriors',    strength: 1.34 },
  { name: '86 Celtics',     strength: 1.30 },
  { name: '87 Lakers',      strength: 1.28 },
  { name: '01 Lakers',      strength: 1.26 },
  { name: '13 Heat',        strength: 1.24 },
  { name: '14 Spurs',       strength: 1.22 },
  { name: '04 Pistons',     strength: 1.18 },
  { name: '16 Cavaliers',   strength: 1.16 },
  { name: '94 Rockets',     strength: 1.14 },
  { name: '11 Mavericks',   strength: 1.12 },
  { name: '08 Celtics',     strength: 1.10 },
  { name: '05 Spurs',       strength: 1.08 },
  { name: '03 Spurs',       strength: 1.06 },
  { name: '89 Pistons',     strength: 1.04 },
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
  phase:       'coach-select', // 'coach-select' | 'era-select' | 'drafting' | 'results' | 'playoffs' | 'trophy-room'
  coach:       null,
  selectedEra: null,
};

/**
 * Resets S to a fresh drafting state.
 * Called by the events module when a coach + era have been selected.
 *
 * @param {string} era  e.g. '1990s' or 'all'
 */
export function startGame(era = 'all') {
  const coach = S.coach; // preserve the coach selected in the previous phase
  S = {
    phase:            'drafting',
    coach,
    selectedEra:      era,
    round:            0,
    usedDecades:      [],
    usedPlayerIds:    [],
    draftedPlayerNames: new Set(), // names of players currently on the roster (blocks cross-era clones)
    teamSkips:        1,
    decadeSkips:      1,
    hasMulligan:      true,
    spinState:        'idle',   // 'idle' | 'spinning' | 'done'
    currentSpin:      null,     // { team, decade }
    availablePlayers: [],
    draftBoard:       [],       // 3-player pick array
    selectedPlayer:   null,
    roster: {
      PG: null, SG: null, SF: null, PF: null, C: null,
      B1: null, B2: null,
    },
    result:  null,
    playoffs: null,
    teamName: '',
    runSaved: false,
    globalScoreSubmitted: false,
    globalSubmitError:    null,
  };
}
