/**
 * js/utils/cloudSave.js — local save snapshot + additive merge
 *
 * Nothing imports this module yet. It is the second foundation piece, shipped
 * ahead of the UI and the Firestore wiring that will use it.
 *
 * WHAT THIS IS FOR
 * ────────────────
 * A player can accumulate months of progress on one device before an account
 * exists. When they finally sign in — possibly on a second device that also
 * has progress — the two saves have to become one. Doing that with
 * last-write-wins DESTROYS progress: level up on a phone, open a laptop, and
 * the laptop's older save overwrites the phone's.
 *
 * So mergeSaves() below merges FIELD BY FIELD, using the operation that
 * matches each field's meaning. Almost everything this game stores is
 * monotonic by design, which is what makes a correct merge tractable:
 *
 *   xp                 max        progression.js: XP only ever accumulates
 *   rewards            union      an unlock is never revoked
 *   legends            union      a drafted player id is collected forever
 *   lb/trophies/modes  concat, de-dup, re-sort, re-cap
 *   daily stats        per-counter max
 *   daily streak       the record with the later lastPassDate, broken to 0
 *                      when the merged lock shows a failure after that date
 *   daily lock         later date; same date, the first attempt stands
 *   dynasty duel       later weekKey; same week, the first attempt stands
 *   bests              max
 *   lastRun / coach    from whichever save was written more recently
 *
 * TWO RULES THIS MODULE EXISTS TO ENFORCE
 * ───────────────────────────────────────
 *   1. Local is authoritative during play. Nothing here is on the path of a
 *      draft, a simulation or a save. The cloud is a mirror.
 *   2. Never write a partial save. readLocalSave() reports whether every
 *      section parsed; a caller must not upload a save that did not. A
 *      partial upload merged on another device would propagate the loss.
 *
 * mergeSaves() is PURE and SYNCHRONOUS — no network, no DOM, no clock, no
 * storage — so the whole merge table can be unit-tested under Node. That is
 * deliberate: this is the one place in the accounts work where a bug silently
 * destroys player data, so it is the one place that must be exhaustively
 * testable in isolation.
 *
 * Exports:
 *   SCHEMA_VERSION      — integer stamped into every snapshot
 *   emptySave()         — the zero value, same shape as a read
 *   readLocalSave()     — the nba820_* keys as one snapshot
 *   writeLocalSave(s)   — a snapshot back into the nba820_* keys
 *   mergeSaves(a, b)    — pure, additive, order-independent merge
 *   scheduleUpload(fn)  — debounce a snapshot upload
 *   flushUpload()       — run a pending upload now (page hide / unload)
 *   cancelUpload()      — drop a pending upload
 */

import { cgGetItem, cgSetItem }                      from './crazygames.js';
import { fetchUserSave, writeUserSave, deleteUserSave } from './firebase.js';

/** Bumped only when the snapshot shape changes in a way a reader must know. */
export const SCHEMA_VERSION = 1;

// ── Storage keys ──────────────────────────────────────────────────────────────
// Deliberately NOT synced, and absent from every structure below: nba820_theme,
// nba820_returning, nba820_install and nba820_ref. Those are device
// properties, not player properties — syncing the theme would fight a player
// who runs light on a phone and dark on a laptop, and syncing the returning
// flag would replay or suppress the cold open on the wrong device.

const K = {
  progress:   'nba820_progress',
  legends:    'nba820_legends',
  leaderboard:'nba820_lb',
  trophies:   'nba820_trophies',
  dailyLast:  'nba820_daily_last',
  dailyStreak:'nba820_dailyStreak',
  dailyStats: 'nba820_dailyStats',
  duelLast:   'nba820_dynasty_duel_last',
  duelStreak: 'nba820_dynasty_duel_streak',
  best:       'nba820_best',
  bestStreak: 'nba820_bestStreak',
  lastRun:    'nba820_lastRun',
  coach:      'nba820_coach',
};

/** Mode-board keys, mirroring MODE_LB_KEYS in utils/storage.js. */
const MODE_KEYS = {
  defense:        'nba820_lb_defense',
  fans:           'nba820_lb_fans',
  'gm-ai':        'nba820_lb_gmai',
  'dynasty-duel': 'nba820_lb_dynasty',
};

// Caps mirror the writers in utils/storage.js exactly. A merge that produced a
// longer list than the game itself writes would hand the render layer more
// rows than it has ever been asked to draw.
const LEADERBOARD_CAP = 20;
const TROPHY_CAP      = 12;
const MODE_CAP        = 20;

// ── Small helpers ─────────────────────────────────────────────────────────────

const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const arr = v => (Array.isArray(v) ? v : []);

const obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : null);

/** Larger of two numbers, treating non-numbers as absent. */
const maxNum = (a, b) => Math.max(num(a, 0), num(b, 0));

/** Later of two 'YYYY-MM-DD' strings; null-safe. Plain string compare is
 *  correct for this format and avoids a timezone-dependent Date parse. */
function laterDate(a, b) {
  const x = typeof a === 'string' ? a : null;
  const y = typeof b === 'string' ? b : null;
  if (!x) return y;
  if (!y) return x;
  return x >= y ? x : y;
}

/**
 * Concatenate two lists, drop exact duplicates, sort, and cap.
 *
 * Identity is the entry's own JSON. That is deliberately strict: it can only
 * ever collapse entries that are byte-identical — the same run synced twice —
 * and can never fuse two genuinely different runs that happen to share a
 * score. Losing a real run to an over-eager identity heuristic would be the
 * exact failure this module exists to prevent.
 */
function mergeList(a, b, cmp, cap) {
  const out  = [];
  const seen = new Set();
  for (const entry of [...arr(a), ...arr(b)]) {
    if (entry === null || entry === undefined) continue;
    let id;
    try { id = JSON.stringify(entry); } catch (_) { continue; } // cyclic — cannot be ours
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(entry);
  }
  if (cmp) out.sort(cmp);
  return out.slice(0, cap);
}

/** Union of two id lists, order-stable on first appearance. */
function mergeIds(a, b) {
  const out  = [];
  const seen = new Set();
  for (const id of [...arr(a), ...arr(b)]) {
    if (typeof id !== 'string' || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

// ── Sort comparators — mirrors of the writers in utils/storage.js ─────────────
// Each of these reproduces the sort its writer applies, so a merged list is
// ordered exactly as the game would have ordered it had both runs happened on
// one device. Any drift here shows up as rows appearing in the wrong order.

const cmpLeaderboard = (a, b) =>
  (num(b?.wins) - num(a?.wins)) || (num(b?.avgPopularity, 50) - num(a?.avgPopularity, 50));

// Trophies are written with unshift() — newest first, never sorted by score.
// `date` is the only ordering signal and is always produced with an en-US
// 'Mon D, YYYY' locale string, so it parses consistently. Unparseable dates
// sort last rather than throwing off the entries around them.
const cmpTrophies = (a, b) => {
  const ta = Date.parse(a?.date);
  const tb = Date.parse(b?.date);
  const va = Number.isNaN(ta) ? -Infinity : ta;
  const vb = Number.isNaN(tb) ? -Infinity : tb;
  return vb - va;
};

const MODE_CMP = {
  defense:        (a, b) => (num(b?.wins) - num(a?.wins)) || (num(b?.teamStocks) - num(a?.teamStocks)),
  fans:           (a, b) => (num(b?.score) - num(a?.score)) || (num(b?.wins) - num(a?.wins)),
  'dynasty-duel': (a, b) => num(b?.score) - num(a?.score),
  'gm-ai':        (a, b) =>
    (b?.won === a?.won ? 0 : b?.won ? 1 : -1)
    || (num(b?.margin) - num(a?.margin))
    || (num(b?.strength) - num(a?.strength)),
};

// ── Zero value ────────────────────────────────────────────────────────────────

/** The shape every read and merge produces. */
export function emptySave() {
  return {
    schemaVersion:   SCHEMA_VERSION,
    deviceUpdatedAt: 0,
    save: {
      progress:    { xp: 0, rewards: [] },
      legends:     [],
      leaderboard: [],
      trophies:    [],
      modeBoards:  { defense: [], fans: [], 'gm-ai': [], 'dynasty-duel': [] },
      daily:       { last: null, streak: null, stats: null },
      dynastyDuel: { last: null, streak: null },
      bests:       { best: null, bestStreak: 0, lastRun: null, coach: null },
    },
  };
}

// ── Local read ────────────────────────────────────────────────────────────────

/** Parse one JSON key. Reports failure separately from "absent". */
function readJson(key, state) {
  let raw;
  try { raw = cgGetItem(key); } catch (_) { state.complete = false; return null; }
  if (raw === null || raw === undefined || raw === '') return null;
  try { return JSON.parse(raw); } catch (_) { state.complete = false; return null; }
}

/**
 * Every synced nba820_* key as one snapshot.
 *
 * `complete` is false when a key was PRESENT but could not be parsed. A caller
 * must NOT upload an incomplete snapshot: a save missing a section, merged on
 * another device, would propagate the loss rather than heal it. Local play is
 * unaffected either way — the game reads its own keys directly.
 *
 * What `complete` deliberately does NOT detect is blocked storage. cgGetItem()
 * swallows its own errors and returns null, so a device in Safari private mode
 * is indistinguishable here from a device with no progress, and both read as
 * empty-and-complete. That is safe rather than lucky: mergeSaves() is additive,
 * so an empty snapshot can never remove anything from the remote save.
 *
 * @returns {{snapshot: object, complete: boolean}}
 */
export function readLocalSave() {
  const state = { complete: true };
  const out   = emptySave();

  const progress = obj(readJson(K.progress, state));
  if (progress) {
    // `level` is intentionally not stored: progression.js recomputes it from
    // xp on every read and treats a disagreeing stored level as stale.
    out.save.progress = { xp: Math.max(0, num(progress.xp)), rewards: arr(progress.rewards) };
  }

  out.save.legends     = arr(readJson(K.legends, state)).filter(id => typeof id === 'string');
  out.save.leaderboard = arr(readJson(K.leaderboard, state));
  out.save.trophies    = arr(readJson(K.trophies, state));

  for (const [mode, key] of Object.entries(MODE_KEYS)) {
    out.save.modeBoards[mode] = arr(readJson(key, state));
  }

  out.save.daily = {
    last:   obj(readJson(K.dailyLast, state)),
    streak: obj(readJson(K.dailyStreak, state)),
    stats:  obj(readJson(K.dailyStats, state)),
  };

  out.save.dynastyDuel = {
    last:   obj(readJson(K.duelLast, state)),
    streak: obj(readJson(K.duelStreak, state)),
  };

  // bestStreak is stored as a BARE STRING, not JSON — events.js writes it with
  // String(n) and reads it with parseInt. Parsing it as JSON would mark an
  // otherwise healthy save incomplete.
  let bestStreak = 0;
  try {
    const rawStreak = cgGetItem(K.bestStreak);
    if (rawStreak !== null && rawStreak !== undefined && rawStreak !== '') {
      bestStreak = Math.max(0, num(parseInt(rawStreak, 10)));
    }
  } catch (_) { state.complete = false; }

  // coach is likewise a bare string (a coach id), not JSON.
  let coach = null;
  try {
    const rawCoach = cgGetItem(K.coach);
    if (typeof rawCoach === 'string' && rawCoach !== '') coach = rawCoach;
  } catch (_) { state.complete = false; }

  out.save.bests = {
    best:       obj(readJson(K.best, state)),
    bestStreak,
    lastRun:    obj(readJson(K.lastRun, state)),
    coach,
  };

  out.deviceUpdatedAt = Date.now();
  return { snapshot: out, complete: state.complete };
}

// ── Local write ───────────────────────────────────────────────────────────────

function writeJson(key, value, state) {
  if (value === null || value === undefined) return;   // never clear a key
  try { cgSetItem(key, JSON.stringify(value)); } catch (_) { state.ok = false; }
}

/**
 * Writes a snapshot back into the nba820_* keys.
 *
 * Only ever writes: a null section is skipped rather than clearing the key it
 * would have written. Nothing in the accounts work is permitted to remove a
 * player's local progress, and that guarantee is easier to keep here than to
 * audit at every call site.
 *
 * The return value reports whether there was a valid snapshot to write, NOT
 * whether it reached the disk. cgSetItem() catches its own failures by design
 * — "a save that cannot be persisted must never break the run in progress" —
 * so a blocked write is invisible from here, exactly as it already is to the
 * Trophy Room and the local leaderboard. This function makes the same bargain
 * rather than pretending to a certainty the seam cannot give it.
 *
 * @returns {boolean} false only when the snapshot was missing or malformed
 */
export function writeLocalSave(snapshot) {
  const s = obj(snapshot)?.save;
  if (!s) return false;
  const state = { ok: true };

  if (obj(s.progress)) {
    // Written without `level` on purpose — see readLocalSave().
    writeJson(K.progress, { xp: Math.max(0, num(s.progress.xp)), rewards: arr(s.progress.rewards) }, state);
  }
  if (arr(s.legends).length)     writeJson(K.legends,     s.legends,     state);
  if (arr(s.leaderboard).length) writeJson(K.leaderboard, s.leaderboard, state);
  if (arr(s.trophies).length)    writeJson(K.trophies,    s.trophies,    state);

  const boards = obj(s.modeBoards) || {};
  for (const [mode, key] of Object.entries(MODE_KEYS)) {
    if (arr(boards[mode]).length) writeJson(key, boards[mode], state);
  }

  const daily = obj(s.daily) || {};
  writeJson(K.dailyLast,   daily.last,   state);
  writeJson(K.dailyStreak, daily.streak, state);
  writeJson(K.dailyStats,  daily.stats,  state);

  const duel = obj(s.dynastyDuel) || {};
  writeJson(K.duelLast,   duel.last,   state);
  writeJson(K.duelStreak, duel.streak, state);

  const bests = obj(s.bests) || {};
  writeJson(K.best,    bests.best,    state);
  writeJson(K.lastRun, bests.lastRun, state);
  if (num(bests.bestStreak) > 0) {
    try { cgSetItem(K.bestStreak, String(Math.round(num(bests.bestStreak)))); } catch (_) { state.ok = false; }
  }
  if (typeof bests.coach === 'string' && bests.coach !== '') {
    try { cgSetItem(K.coach, bests.coach); } catch (_) { state.ok = false; }
  }

  return state.ok;
}

// ── Merge ─────────────────────────────────────────────────────────────────────

/** Daily streak: the chain anchored to the later pass date. */
function mergeDailyStreak(a, b) {
  const x = obj(a);
  const y = obj(b);
  if (!x) return y;
  if (!y) return x;
  const dx = typeof x.lastPassDate === 'string' ? x.lastPassDate : null;
  const dy = typeof y.lastPassDate === 'string' ? y.lastPassDate : null;
  if (dx === dy) {
    // Same anchor day — the same chain seen twice; the longer count is the
    // one that actually happened.
    return num(x.streak) >= num(y.streak) ? x : y;
  }
  if (!dx) return y;
  if (!dy) return x;
  // A streak is a chain with a date anchor. Taking the larger number across
  // different anchors would fabricate a chain that never happened.
  return dx > dy ? x : y;
}

/**
 * Today's Daily lock: the record for the later date.
 *
 * Same date on both sides is the anti-exploit case — the reason this field is
 * synced at all. One attempt per day is the design, so the FIRST attempt is
 * the one that counted; keeping it means a second device cannot buy a second
 * try. (`at` is a client clock, used only to order two records that already
 * agree on the day, never to gate a write.)
 */
function mergeDailyLast(a, b) {
  const x = obj(a);
  const y = obj(b);
  if (!x) return y;
  if (!y) return x;
  const dx = typeof x.date === 'string' ? x.date : null;
  const dy = typeof y.date === 'string' ? y.date : null;
  if (dx === dy) return num(x.at, Infinity) <= num(y.at, Infinity) ? x : y;
  if (!dx) return y;
  if (!dy) return x;
  return dx > dy ? x : y;
}

/** Dynasty Duel weekly lock — the Daily rule on a weekly cadence. */
function mergeDuelLast(a, b) {
  const x = obj(a);
  const y = obj(b);
  if (!x) return y;
  if (!y) return x;
  const wx = typeof x.weekKey === 'string' ? x.weekKey : null;
  const wy = typeof y.weekKey === 'string' ? y.weekKey : null;
  if (wx === wy) return num(x.at, Infinity) <= num(y.at, Infinity) ? x : y;
  if (!wx) return y;
  if (!wy) return x;
  return wx > wy ? x : y;
}

/** Dynasty Duel streak: chain anchored to the later winning week. */
function mergeDuelStreak(a, b) {
  const x = obj(a);
  const y = obj(b);
  if (!x) return y;
  if (!y) return x;
  const wx = typeof x.lastWinWeek === 'string' ? x.lastWinWeek : null;
  const wy = typeof y.lastWinWeek === 'string' ? y.lastWinWeek : null;
  if (wx === wy) return num(x.streak) >= num(y.streak) ? x : y;
  if (!wx) return y;
  if (!wy) return x;
  return wx > wy ? x : y;
}

/**
 * Zeroes a merged streak that a later failed Daily has already broken.
 *
 * A failed attempt zeroes the streak locally but leaves `lastPassDate` on the
 * last day that DID pass (storage.js markDailyPlayed), so the failing device
 * and a device still holding the pre-failure record agree on the anchor date
 * while disagreeing about the count — and mergeDailyStreak's "the longer count
 * is the one that actually happened" then hands the broken chain straight
 * back. The day's own lock record supplies the ordering the anchor cannot: a
 * FAILED attempt on a day later than the last pass ends the chain there,
 * whatever count either side is carrying.
 *
 * Only a strictly later failure counts. Two devices that both played the same
 * day and disagree about it is the double-play case mergeDailyLast already
 * arbitrates ("the first attempt stands"), and a lock record predating the
 * challenge system has no `passed` field to judge at all — both are left
 * exactly as they were rather than guessed at.
 */
function breakStreakOnLaterFail(streak, last) {
  const s = obj(streak);
  const l = obj(last);
  if (!s || !l || !('passed' in l) || l.passed) return s;
  const failDate = typeof l.date === 'string' ? l.date : null;
  const passDate = typeof s.lastPassDate === 'string' ? s.lastPassDate : null;
  if (!failDate || !passDate || failDate <= passDate) return s;
  return { ...s, streak: 0 };
}

/** Daily lifetime stats: every counter only ever rises. */
function mergeDailyStats(a, b) {
  const x = obj(a);
  const y = obj(b);
  if (!x) return y;
  if (!y) return x;
  const dist = {};
  for (const key of new Set([
    ...Object.keys(obj(x.distribution) || {}),
    ...Object.keys(obj(y.distribution) || {}),
  ])) {
    dist[key] = maxNum(obj(x.distribution)?.[key], obj(y.distribution)?.[key]);
  }
  return {
    played:         maxNum(x.played, y.played),
    wins:           maxNum(x.wins, y.wins),
    // Recomputed live by getDailyStats() from the streak record on every read,
    // so this is a starting value rather than a source of truth.
    currentStreak:  maxNum(x.currentStreak, y.currentStreak),
    maxStreak:      maxNum(x.maxStreak, y.maxStreak),
    lastPlayedDate: laterDate(x.lastPlayedDate, y.lastPlayedDate),
    distribution:   dist,
  };
}

/** Personal best: the better record. */
function mergeBest(a, b) {
  const x = obj(a);
  const y = obj(b);
  if (!x) return y;
  if (!y) return x;
  return num(x.wins) >= num(y.wins) ? x : y;
}

/**
 * Merges two save snapshots additively. Pure, synchronous, and
 * order-independent for every monotonic field, so two devices uploading
 * concurrently converge instead of ping-ponging.
 *
 * Either argument may be null (a brand-new account has no remote save), of the
 * wrong type, or missing sections — anything unreadable is treated as absent
 * rather than throwing, because a corrupt remote document must never be able
 * to damage a healthy local one.
 *
 * @param {object|null} a
 * @param {object|null} b
 * @returns {object} a new snapshot; neither argument is mutated
 */
export function mergeSaves(a, b) {
  const A = obj(a);
  const B = obj(b);
  if (!A && !B) return emptySave();
  if (!A) return mergeSaves(emptySave(), B);
  if (!B) return mergeSaves(A, emptySave());

  const sa = obj(A.save) || {};
  const sb = obj(B.save) || {};
  const out = emptySave();

  // Which side was written more recently. Used ONLY for the two convenience
  // fields that carry no timestamp of their own (lastRun, coach) — never to
  // decide a competitive value, and never to gate a write.
  const aNewer = num(A.deviceUpdatedAt) >= num(B.deviceUpdatedAt);

  out.deviceUpdatedAt = maxNum(A.deviceUpdatedAt, B.deviceUpdatedAt);

  // XP only ever accumulates (progression.js), so max cannot lose progress;
  // level is derived from xp on read, so it follows automatically.
  const pa = obj(sa.progress) || {};
  const pb = obj(sb.progress) || {};
  out.save.progress = {
    xp:      maxNum(pa.xp, pb.xp),
    rewards: mergeIds(pa.rewards, pb.rewards),
  };

  out.save.legends     = mergeIds(sa.legends, sb.legends);
  out.save.leaderboard = mergeList(sa.leaderboard, sb.leaderboard, cmpLeaderboard, LEADERBOARD_CAP);
  out.save.trophies    = mergeList(sa.trophies, sb.trophies, cmpTrophies, TROPHY_CAP);

  const ba = obj(sa.modeBoards) || {};
  const bb = obj(sb.modeBoards) || {};
  for (const mode of Object.keys(MODE_KEYS)) {
    out.save.modeBoards[mode] = mergeList(ba[mode], bb[mode], MODE_CMP[mode], MODE_CAP);
  }

  const da = obj(sa.daily) || {};
  const db = obj(sb.daily) || {};
  const dailyLast = mergeDailyLast(da.last, db.last);
  out.save.daily = {
    last:   dailyLast,
    streak: breakStreakOnLaterFail(mergeDailyStreak(da.streak, db.streak), dailyLast),
    stats:  mergeDailyStats(da.stats, db.stats),
  };

  const ua = obj(sa.dynastyDuel) || {};
  const ub = obj(sb.dynastyDuel) || {};
  out.save.dynastyDuel = {
    last:   mergeDuelLast(ua.last, ub.last),
    streak: mergeDuelStreak(ua.streak, ub.streak),
  };

  const ea = obj(sa.bests) || {};
  const eb = obj(sb.bests) || {};
  const newer = aNewer ? ea : eb;
  const older = aNewer ? eb : ea;
  out.save.bests = {
    best:       mergeBest(ea.best, eb.best),
    bestStreak: maxNum(ea.bestStreak, eb.bestStreak),
    // No timestamp of their own — fall back to the newer snapshot, then to
    // whatever exists at all.
    lastRun:    obj(newer.lastRun) || obj(older.lastRun),
    coach:      (typeof newer.coach === 'string' && newer.coach) ? newer.coach
              : (typeof older.coach === 'string' && older.coach) ? older.coach
              : null,
  };

  return out;
}

// ── Debounced upload scheduling ───────────────────────────────────────────────
// The uploader is supplied by the caller rather than imported. This module
// deliberately holds no Firestore reference: the merge above is the part that
// must be testable with no network, and keeping the transport out means the
// whole file stays importable under Node.

const UPLOAD_DEBOUNCE_MS = 4000;
let _timer   = null;
let _pending = null;

/**
 * Schedules an upload, collapsing a burst of events into one write. A run
 * saved, XP added, a Daily played and a trophy earned all land within a second
 * or two of each other; without this they would be four writes.
 * @param {() => any} uploadFn
 */
export function scheduleUpload(uploadFn) {
  if (typeof uploadFn !== 'function') return;
  _pending = uploadFn;
  if (_timer !== null) clearTimeout(_timer);
  _timer = setTimeout(() => { _timer = null; flushUpload(); }, UPLOAD_DEBOUNCE_MS);
}

/**
 * Runs a pending upload immediately — for `visibilitychange` / `pagehide`,
 * where waiting out the debounce would lose the write. Safe to call with
 * nothing pending. Never throws: a failed upload must not surface as an error
 * during a page transition.
 */
export function flushUpload() {
  if (_timer !== null) { clearTimeout(_timer); _timer = null; }
  const fn = _pending;
  _pending = null;
  if (!fn) return;
  try {
    const r = fn();
    if (r && typeof r.catch === 'function') r.catch(() => {});
  } catch (_) { /* a sync throw in the uploader is not the caller's problem */ }
}

/** Drops any pending upload without running it (e.g. on sign-out). */
export function cancelUpload() {
  if (_timer !== null) { clearTimeout(_timer); _timer = null; }
  _pending = null;
}

// ── Sync ──────────────────────────────────────────────────────────────────────
// Everything below is the transport. It never throws and never blocks: a
// failed sync leaves local storage exactly as it was, which is the state the
// game plays from anyway.

/** Strips the wire fields the rules do not accept back out of a fetched doc. */
function remoteToSnapshot(data) {
  const d = obj(data);
  if (!d) return null;
  return {
    schemaVersion:   num(d.schemaVersion, SCHEMA_VERSION),
    // The server's own updatedAt is authoritative for conflict reasoning, but
    // the merge's recency tie-break wants the client clock the save was
    // written with — that is what deviceUpdatedAt is for.
    deviceUpdatedAt: num(d.deviceUpdatedAt),
    save:            obj(d.save) || emptySave().save,
  };
}

/** The document body to write, with only the fields users/{uid} allows. */
function snapshotToRemote(snapshot, displayName) {
  const body = {
    schemaVersion:   SCHEMA_VERSION,
    deviceUpdatedAt: num(snapshot.deviceUpdatedAt, Date.now()),
    save:            snapshot.save,
  };
  if (typeof displayName === 'string' && displayName.length >= 3) {
    body.displayName = displayName.slice(0, 24);
  }
  return body;
}

/**
 * The first-sign-in sequence, and the one run on every boot with a live
 * session. In order, deliberately:
 *
 *   1. Read the complete local save BEFORE any network call.
 *   2. Fetch the remote. Absent means a brand-new account — the local save
 *      becomes the document as-is and nothing is at risk.
 *   3. Merge additively.
 *   4. Write local FIRST, then upload. If the network dies after step 3 the
 *      player still ends up better off than before, never worse.
 *
 * An incomplete local read aborts the upload but still applies the merge
 * locally: a save missing a section must never be pushed, because merging
 * into it on another device would propagate the loss instead of healing it.
 *
 * @param {string} uid
 * @param {string} [displayName]
 * @returns {Promise<{ok: boolean, code?: string, merged?: object, uploaded?: boolean}>}
 */
export async function syncOnSignIn(uid, displayName) {
  if (!uid) return { ok: false, code: 'no-uid' };
  const { snapshot: local, complete } = readLocalSave();

  const res = await fetchUserSave(uid);
  if (!res.ok) return { ok: false, code: res.code };

  const remote = res.exists ? remoteToSnapshot(res.data) : null;
  const merged = mergeSaves(local, remote);

  writeLocalSave(merged);

  if (!complete) return { ok: true, merged, uploaded: false, code: 'local-incomplete' };

  const put = await writeUserSave(uid, snapshotToRemote(merged, displayName), { isNew: !res.exists });
  return { ok: true, merged, uploaded: put.ok, code: put.ok ? undefined : put.code };
}

/**
 * Uploads the current local save. Used by the debounced scheduler after a run
 * is saved, XP is added or a Daily is played.
 *
 * Read-merge-write, exactly like syncOnSignIn() — never a blind overwrite.
 * The write is a document-level setDoc(merge: true), so whatever this uploads
 * REPLACES the remote's arrays and counters, and the local snapshot is not
 * automatically the newer one: readLocalSave() reports blocked storage as
 * empty-and-complete (see its comment), and a device that has been idle since
 * another one played is stale by definition. Either would push the account
 * backwards. Merging the fetched remote in first makes that impossible — the
 * merge is additive, so the upload can only ever be a superset of what is
 * already there.
 *
 * A failed fetch aborts rather than falling back to a blind push: if the
 * remote cannot be read it cannot be safely replaced, and the next save
 * retries. Local storage is untouched either way, which is what the game
 * plays from.
 *
 * @param {string} uid
 * @param {string} [displayName]
 */
export async function pushLocalSave(uid, displayName) {
  if (!uid) return { ok: false, code: 'no-uid' };
  const { snapshot, complete } = readLocalSave();
  if (!complete) return { ok: false, code: 'local-incomplete' };

  const res = await fetchUserSave(uid);
  if (!res.ok) return { ok: false, code: res.code };

  const merged = res.exists ? mergeSaves(snapshot, remoteToSnapshot(res.data)) : snapshot;
  return writeUserSave(uid, snapshotToRemote(merged, displayName), { isNew: !res.exists });
}

/** Schedules a debounced upload of the current local save. */
export function requestSync(uid, displayName) {
  if (!uid) return;
  scheduleUpload(() => pushLocalSave(uid, displayName));
}

/**
 * Removes the cloud save. Local progress is deliberately left alone — the
 * person deleting their account is still the person at this device.
 */
export async function deleteCloudSave(uid) {
  cancelUpload();
  return deleteUserSave(uid);
}
