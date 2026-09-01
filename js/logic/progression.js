/**
 * js/logic/progression.js — Levels + XP progression.
 *
 * Self-contained: the tuning table below is the whole design. Nothing else in
 * the game reads these numbers, so re-balancing the system means editing this
 * one block and nothing more.
 *
 * The system is deliberately additive — XP only ever accumulates, is never
 * spent, and never resets. A level is a record of what you have played, not a
 * currency, which is why nothing here can reduce a stored total.
 *
 * Rewards are cosmetic/identity only, never power. A Level 10 player drafts
 * from exactly the same boards a Level 1 player does, so records stay
 * comparable on the leaderboard.
 */

import { cgGetItem, cgSetItem } from '../utils/crazygames.js';

// ── Tuning table — the entire design lives here ───────────────────────────────

/** Per-pick XP by era-adjusted `overall`. Cutoffs match the rating tiers the
 *  UI already colours by (see ovrColor in ui/theme.js), so a gold-tinted card
 *  is always the 120 and a slate one is always the 10 — no second vocabulary
 *  for the player to learn. Ordered high→low; first match wins. */
const PLAYER_XP_TIERS = [
  { min: 97, xp: 120, label: 'Legend'      },
  { min: 92, xp:  70, label: 'Star'        },
  { min: 85, xp:  40, label: 'Starter'     },
  { min: 80, xp:  20, label: 'Rotation'    },
  { min:  0, xp:  10, label: 'Role player' },
];

/** Flat award for filling all five slots. */
const DRAFT_COMPLETE_XP = 100;

/** Team OVR (the mean starter rating the sim reports as `avgRating`) in bands
 *  rather than a curve: a player can read their OVR off the results screen and
 *  know exactly what it paid. Ordered high→low; first match wins. */
const TEAM_OVR_BANDS = [
  { min: 94, xp: 350 },
  { min: 91, xp: 200 },
  { min: 88, xp: 100 },
  { min: 85, xp:  50 },
  { min:  0, xp:   0 },
];

/** Per starter rated at or above STAR_MIN. Rewards stacking elites, which the
 *  OVR average alone under-pays. Same 92 cutoff the roster cards colour by. */
const STAR_MIN = 92;
const STAR_XP  = 25;

/** Chemistry is binary on purpose — the UI intentionally hides the 0-100
 *  score, so asking the player to reason about a sliding scale would be
 *  asking them to optimise a number they cannot see. 65 is chemTier()'s
 *  "Strong" floor, so this pays for Strong, Very Strong and Perfect. */
const CHEM_MIN_SCORE = 65;
const CHEM_XP        = 75;

/** Season outcome. */
const XP_PER_WIN     = 2;
const PERFECT_XP     = 500;   // 82-0
const CHAMPION_XP    = 250;   // awarded later, when the title is actually won
const DAILY_XP       = 100;   // Daily Challenge is once per day by design

/** Level curve. The step from each level to the next grows by LEVEL_STEP_GROWTH,
 *  so early levels arrive fast and later ones are earned:
 *    1→2 = 400, 2→3 = 700, 3→4 = 1000 … 9→10 = 2800.
 *  Continues on the same pattern past 10 — there is deliberately no cap. */
const LEVEL_BASE_STEP    = 400;
const LEVEL_STEP_GROWTH  = 300;

/** Level → reward. `title` rewards set the player's displayed GM title (the
 *  highest one unlocked wins). `cosmetic` rewards are recorded as unlocked and
 *  listed on the results card; applying them visually would mean reworking the
 *  Trophy Room and draft board, which is out of scope for this system. */
const REWARDS = [
  { level:  2, id: 'title-scout',      kind: 'title',    label: 'Scout' },
  { level:  3, id: 'frame-bronze',     kind: 'cosmetic', label: 'Bronze Trophy Room frame' },
  { level:  4, id: 'title-asst-gm',    kind: 'title',    label: 'Assistant GM' },
  { level:  5, id: 'leaderboard-badge',kind: 'cosmetic', label: 'Level badge on the leaderboard' },
  { level:  6, id: 'accent-1',         kind: 'cosmetic', label: 'Draft board accent colour' },
  { level:  7, id: 'title-gm',         kind: 'title',    label: 'General Manager' },
  { level:  8, id: 'frame-silver',     kind: 'cosmetic', label: 'Silver Trophy Room frame' },
  { level:  9, id: 'accent-2',         kind: 'cosmetic', label: 'Draft board accent colour II' },
  { level: 10, id: 'title-hof-gm',     kind: 'title',    label: 'Hall of Fame GM' },
  { level: 10, id: 'frame-gold',       kind: 'cosmetic', label: 'Gold Trophy Room frame' },

  // ── Levels 15-100 ────────────────────────────────────────────────────────
  // A milestone every five levels. Three kinds only — `trophy` (Trophy Room
  // décor), `badge` (leaderboard marks) and `title` — which is finer-grained
  // than the `cosmetic` tag the ten entries above use; those predate the split
  // and are deliberately left as they are, so anything listing Trophy Room
  // items should read `trophy` OR `cosmetic`.
  //
  // MUST stay sorted by level: titleForLevel() takes the LAST title at or
  // below the player's level, so an out-of-order row would hand back a junior
  // title to a senior player.
  //
  // Front-office ladder (15-50) -> mythic (60-90) -> the goal itself (100).
  { level:  15, id: 'title-front-office',      kind: 'title',  label: 'Front Office Fixture' },
  { level:  20, id: 'title-team-president',    kind: 'title',  label: 'Team President' },
  { level:  20, id: 'trophy-rafter-spotlights',kind: 'trophy', label: 'Rafter Spotlights' },
  { level:  25, id: 'badge-bronze-star',       kind: 'badge',  label: 'Bronze Star' },
  { level:  25, id: 'trophy-hardwood-inlay',   kind: 'trophy', label: 'Hardwood Floor Inlay' },
  { level:  30, id: 'title-franchise-architect',kind:'title',  label: 'Franchise Architect' },
  { level:  35, id: 'trophy-jersey-rack',      kind: 'trophy', label: 'Retired Jersey Rack' },
  { level:  40, id: 'title-dynasty-builder',   kind: 'title',  label: 'Dynasty Builder' },
  { level:  40, id: 'badge-silver-star',       kind: 'badge',  label: 'Silver Star' },
  { level:  45, id: 'trophy-glass-case',       kind: 'trophy', label: 'Glass Trophy Case' },
  // Halfway — the first three-part milestone.
  { level:  50, id: 'title-exec-decade',       kind: 'title',  label: 'Executive of the Decade' },
  { level:  50, id: 'badge-gold-star',         kind: 'badge',  label: 'Gold Star' },
  { level:  50, id: 'trophy-confetti',         kind: 'trophy', label: 'Championship Confetti' },
  { level:  55, id: 'trophy-plinth-bronze',    kind: 'trophy', label: 'Bronze Statue Plinth' },
  { level:  60, id: 'title-kingmaker',         kind: 'title',  label: 'Kingmaker' },
  { level:  65, id: 'badge-platinum-star',     kind: 'badge',  label: 'Platinum Star' },
  { level:  70, id: 'trophy-booth-backdrop',   kind: 'trophy', label: 'Broadcast Booth Backdrop' },
  // Three quarters — the second three-part milestone.
  { level:  75, id: 'title-ring-collector',    kind: 'title',  label: 'Ring Collector' },
  { level:  75, id: 'badge-diamond-star',      kind: 'badge',  label: 'Diamond Star' },
  { level:  75, id: 'trophy-rafters-legends',  kind: 'trophy', label: 'Rafters of Legends' },
  { level:  80, id: 'trophy-marble-floor',     kind: 'trophy', label: 'Marble Hall Floor' },
  { level:  85, id: 'badge-obsidian-crest',    kind: 'badge',  label: 'Obsidian Crest' },
  { level:  90, id: 'title-immortal-exec',     kind: 'title',  label: 'Immortal Executive' },
  { level:  90, id: 'trophy-eternal-flame',    kind: 'trophy', label: 'Eternal Flame Pedestal' },
  { level:  95, id: 'badge-emerald-crown',     kind: 'badge',  label: 'Emerald Crown' },
  { level:  95, id: 'trophy-legends-wing',     kind: 'trophy', label: 'Hall of Legends Wing' },
  // Level 100. The Trophy Room ships with twelve pedestals; the Banner of
  // Perfection is a thirteenth no season can ever raise.
  { level: 100, id: 'title-perfect-gm',        kind: 'title',  label: 'The Perfect GM' },
  { level: 100, id: 'badge-perfect-crown',     kind: 'badge',  label: 'The 82-0 Crown' },
  { level: 100, id: 'trophy-monument',         kind: 'trophy', label: 'The 82-0 Monument' },
  { level: 100, id: 'trophy-banner-perfection',kind: 'trophy', label: 'Banner of Perfection' },
];

// ── Level maths ───────────────────────────────────────────────────────────────

/** XP needed to go from `level` to `level + 1`. */
function stepFor(level) {
  return LEVEL_BASE_STEP + (Math.max(1, level) - 1) * LEVEL_STEP_GROWTH;
}

/** Total XP required to have reached `level`. Level 1 starts at 0.
 *  Closed form of summing stepFor(1..level-1), so this stays O(1) at any
 *  level rather than looping over a curve with no upper bound. */
export function xpToReachLevel(level) {
  const n = Math.max(1, Math.floor(level)) - 1;
  return LEVEL_BASE_STEP * n + LEVEL_STEP_GROWTH * (n * (n - 1)) / 2;
}

/** The level a given lifetime XP total corresponds to. */
export function levelForXp(totalXp) {
  const xp = Math.max(0, Number(totalXp) || 0);
  let level = 1;
  while (xp >= xpToReachLevel(level + 1)) level++;
  return level;
}

/** Level plus progress through it, for the XP bar. */
export function levelProgress(totalXp) {
  const xp     = Math.max(0, Number(totalXp) || 0);
  const level  = levelForXp(xp);
  const floor  = xpToReachLevel(level);
  const need   = stepFor(level);
  const into   = xp - floor;
  return { level, into, need, pct: Math.max(0, Math.min(100, (into / need) * 100)) };
}

/** Every reward unlocked at or below `level`. */
export function rewardsUpTo(level) {
  return REWARDS.filter(r => r.level <= level);
}

/** The GM title a level carries — the highest title reward unlocked, or null
 *  below Level 2 where none has been earned yet. */
export function titleForLevel(level) {
  const titles = rewardsUpTo(level).filter(r => r.kind === 'title');
  return titles.length ? titles[titles.length - 1].label : null;
}

// ── XP for one run ────────────────────────────────────────────────────────────

/** XP a single drafted player is worth. */
export function playerDraftXp(overall) {
  const ovr = Number(overall);
  if (!Number.isFinite(ovr)) return PLAYER_XP_TIERS[PLAYER_XP_TIERS.length - 1].xp;
  return (PLAYER_XP_TIERS.find(t => ovr >= t.min) ?? PLAYER_XP_TIERS[PLAYER_XP_TIERS.length - 1]).xp;
}

/**
 * The full XP breakdown for a completed season.
 *
 * Pure: it reads the values the run already produced and returns numbers. It
 * does not touch storage, so it is safe to call for display without awarding
 * anything.
 */
export function computeRunXp({ starters = [], avgRating = 0, chemScore = 0, wins = 0, isDaily = false } = {}) {
  const list = starters.filter(Boolean);

  const players = list.reduce((sum, p) => sum + playerDraftXp(p.overall), 0);
  // Only a full five-man roster counts as a completed draft.
  const complete = list.length >= 5 ? DRAFT_COMPLETE_XP : 0;

  const ovrBand = (TEAM_OVR_BANDS.find(b => avgRating >= b.min) ?? { xp: 0 }).xp;
  const stars   = list.filter(p => Number(p.overall) >= STAR_MIN).length * STAR_XP;
  const chem    = chemScore >= CHEM_MIN_SCORE ? CHEM_XP : 0;
  const teamQuality = ovrBand + stars + chem;

  const winXp   = Math.max(0, Math.round(wins)) * XP_PER_WIN;
  const perfect = wins >= 82 ? PERFECT_XP : 0;
  const daily   = isDaily ? DAILY_XP : 0;

  return {
    players, complete,
    ovrBand, stars, chem, teamQuality,
    winXp, perfect, daily,
    total: players + complete + teamQuality + winXp + perfect + daily,
  };
}

/** The standalone championship award, granted when the title is actually won
 *  (the season results screen cannot know it yet). */
export const CHAMPION_BONUS_XP = CHAMPION_XP;

// ── Persistence ───────────────────────────────────────────────────────────────

const PROGRESS_KEY = 'nba820_progress';

const EMPTY = { xp: 0, level: 1, rewards: [] };

/** Lifetime progression. Never throws — a corrupt or absent entry reads as a
 *  fresh Level 1 player rather than breaking the screen that asked. */
export function getProgression() {
  try {
    const raw = JSON.parse(cgGetItem(PROGRESS_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return { ...EMPTY };
    const xp = Math.max(0, Number(raw.xp) || 0);
    return {
      xp,
      // Recomputed from XP rather than trusted: XP is the single source of
      // truth, so a stored level that disagrees (an old build, a hand-edited
      // entry) self-corrects instead of sticking.
      level: levelForXp(xp),
      rewards: Array.isArray(raw.rewards) ? raw.rewards : [],
    };
  } catch (e) {
    return { ...EMPTY };
  }
}

/**
 * Add XP and resolve any level-ups.
 *
 * Returns what changed so the caller can show it: the level before and after,
 * and every reward newly unlocked (a single big run can cross more than one
 * level, so this is a list, not one reward).
 *
 * Storage failures are swallowed — a player in private mode still sees the XP
 * they earned for this run, it just will not persist, which is the same
 * bargain the Trophy Room and leaderboard already make.
 */
export function addXp(amount) {
  const gain   = Math.max(0, Math.round(Number(amount) || 0));
  const before = getProgression();
  const after  = { xp: before.xp + gain, level: 0, rewards: before.rewards.slice() };
  after.level  = levelForXp(after.xp);

  const newRewards = rewardsUpTo(after.level).filter(r => !after.rewards.includes(r.id));
  newRewards.forEach(r => after.rewards.push(r.id));

  try { cgSetItem(PROGRESS_KEY, JSON.stringify(after)); } catch (e) {}

  return {
    gain,
    xpBefore: before.xp, xpAfter: after.xp,
    levelBefore: before.level, levelAfter: after.level,
    leveledUp: after.level > before.level,
    newRewards,
  };
}
