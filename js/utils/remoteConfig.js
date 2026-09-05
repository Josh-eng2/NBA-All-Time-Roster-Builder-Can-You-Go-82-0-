/**
 * js/utils/remoteConfig.js — Firebase Remote Config
 *
 * WHY THIS EXISTS
 * ───────────────
 * sw.js serves this game's modules cache-first, which is what makes it
 * playable offline and what makes every behavioural change a two-part
 * operation: edit the file, and bump CACHE_VERSION so returning players and
 * installed PWAs actually receive it. That is correct for CODE. It is a poor
 * fit for VALUES — the off switch you want to flip during an incident, a sim
 * constant you want to nudge after watching a week of real seasons. Those
 * would each cost a full redeploy plus a cache roll, and would reach an
 * installed PWA only on its next update cycle.
 *
 * Remote Config carries values over the network at runtime, so they land on
 * a client whose bundle is still being served from the v29 precache. Free and
 * unlimited on the Spark plan.
 *
 * THE ONE RULE: a key must already exist, with a default, in the SHIPPED
 * bundle. Remote Config changes the VALUE of a key the cached code already
 * reads; it cannot introduce a key that code has never heard of. So adding a
 * new knob is still a deploy — it is only every later adjustment of that knob
 * that is free. Ship the knob before you need it.
 *
 * SETUP (Firebase Console)
 * ────────────────────────
 * 1. Console → Run → Remote Config → Create configuration.
 * 2. For each key in DEFAULTS below: add a parameter with EXACTLY that key
 *    name, matching data type, and the same value as the default here.
 *    Same value, deliberately: publishing a config that merely restates the
 *    shipped defaults is a no-op you can verify in production before it is
 *    also a lever you can pull under pressure.
 * 3. Publish changes. Clients pick the new value up on their next fetch —
 *    at most FETCH_INTERVAL_MS after it is published, and applied on their
 *    NEXT page load (see activation policy below).
 * 4. To roll a change back: edit the parameter back, or use the Console's
 *    change history to restore a previous version. No deploy either way.
 *
 * WHAT MUST NOT GO IN HERE
 * ────────────────────────
 * Anything that has to be identical for every player at the same moment.
 * The Daily Challenge is the concrete case: getDailyChallenge() in
 * js/logic/challenge.js is a pure function of the UTC date so that every
 * player in the world gets the same challenge, dailyLeaderboard rows for a
 * date are comparable, and the pre-generated pages under daily/ describe what
 * players actually saw. Remote Config reaches clients at different times —
 * two players on the same day would draft against different rules and submit
 * to the same board. Change the CHALLENGES catalog in a deploy, where the
 * generated pages are rebuilt in the same commit.
 *
 * The sim constants below are a milder version of the same tension (a season
 * played before a fetch and one played after are scored on slightly different
 * curves, and the daily board sees both). They are here because tuning them
 * is a real need and the effect is a nudge rather than a different game — but
 * treat a change to them as a calibration event, not a routine edit: see the
 * measured anchors at the top of js/logic/simulation.js, which must be
 * re-measured if these settle at new values.
 */

import { getFirebaseApp, SDK_BASE, isFirebaseConfigured } from './firebase.js';

/**
 * Every remotely-tunable value, its shipped default, and its bounds.
 *
 * This object is the contract in both directions: it is what the game falls
 * back to when Remote Config is unreachable (blocked SDK, offline, first-ever
 * load, no Firebase config at all), and it is the whitelist a fetched value
 * has to survive. A key absent from here can never be introduced by a
 * publish, which is the property that keeps a Console typo from reaching game
 * logic as `undefined` or a string where a number belongs.
 *
 * `min`/`max` are not decoration. A published value passes through no review
 * and no test run, so the bounds are the only thing between a fat-fingered
 * `sim_k: 140` and every player going 82-0 for as long as it takes someone to
 * notice. They are deliberately tight around what the game was calibrated
 * for — wide enough to tune in, too narrow to break the game with.
 */
export const DEFAULTS = {
  // The accounts off switch, mirrored from ACCOUNTS_ENABLED in js/utils/auth.js.
  // That constant's own comment notes a rollback needs a CACHE_VERSION bump;
  // this key is what removes that requirement, which matters because the
  // rollback case is the one that happens under pressure.
  accounts_enabled: { value: true, type: 'boolean' },

  // Sim curve — see the measured anchors and method at the top of
  // js/logic/simulation.js. Bounds are roughly ±30 % around the calibrated
  // values: enough to shift the win-rate distribution meaningfully, not
  // enough to make every roster win 82 or none of them win 20.
  sim_k:      { value: 1.40, type: 'number', min: 0.80, max: 2.20 },
  sim_center: { value: 1.40, type: 'number', min: 0.80, max: 2.20 },
  // At 1.00 the cap never binds. Below ~0.90 it starts eating 82-0 runs
  // outright, so the floor is where the game still keeps its own promise.
  win_cap:    { value: 1.00, type: 'number', min: 0.90, max: 1.00 },
};

// How stale a cached value may be before the SDK fetches again. One hour: a
// flip reaches a player mid-session at worst an hour late, and a player who
// reloads all day still costs a handful of requests. (Remote Config is free
// and unlimited, so this is about not hammering the network on a phone, not
// about quota.)
const FETCH_INTERVAL_MS = 60 * 60 * 1000;
// Give up quickly. Nothing waits on this — a slow fetch just means the
// defaults stay in force for this load, which is the normal, safe state.
const FETCH_TIMEOUT_MS = 10 * 1000;

/**
 * Validates one fetched value against its DEFAULTS entry.
 *
 * Pure, exported, and tested: this is the boundary where a value someone
 * typed into a web form five minutes ago enters game logic, and every failure
 * mode here is silent by nature — a NaN propagates into a win probability and
 * comes out as a blank season, not as an error anyone sees.
 *
 * Out-of-range numbers are CLAMPED rather than rejected. A published 3.0 for
 * sim_k is much more likely to be someone reaching past the range than
 * someone meaning to switch the sim off, and clamping keeps the game inside
 * calibrated territory either way.
 *
 * @param {string} key
 * @param {{ asBoolean: Function, asNumber: Function, asString: Function }|null} entry
 *   a Remote Config Value, or null when the key is absent from the fetch
 * @param {object} [defaults]
 * @returns {*} the value to use — always the default when anything is off
 */
export function coerceRemoteValue(key, entry, defaults = DEFAULTS) {
  const spec = defaults[key];
  if (!spec) return undefined;          // not a key this build knows about
  if (!entry) return spec.value;        // absent from the fetched config
  try {
    if (spec.type === 'boolean') return entry.asBoolean();
    if (spec.type === 'string') {
      const s = entry.asString();
      // An empty string is what an unset/blank Console parameter reads as,
      // and is almost never a deliberate value — take the default instead of
      // rendering nothing.
      return s === '' ? spec.value : s;
    }
    const n = entry.asNumber();
    // asNumber() returns 0 for anything unparseable, so a Console value of
    // "one point four" arrives as a perfectly finite 0 — the bounds, not the
    // Number.isFinite check, are what actually catch that.
    if (!Number.isFinite(n)) return spec.value;
    return Math.min(spec.max ?? Infinity, Math.max(spec.min ?? -Infinity, n));
  } catch (_) {
    return spec.value;
  }
}

/**
 * Builds the active value map from a fetched config.
 *
 * Split from the SDK plumbing for the same reason firestoreDbFor() in
 * firebase.js is: the SDK arrives via a dynamic https import that Node's
 * loader refuses outright, so anything left inside the async path cannot be
 * exercised by the test suite.
 *
 * @param {Record<string, object>} all  getAll() output, or {}
 * @param {object} [defaults]
 * @returns {Record<string, *>} every key in defaults, always
 */
export function valuesFrom(all = {}, defaults = DEFAULTS) {
  const out = {};
  for (const key of Object.keys(defaults)) out[key] = coerceRemoteValue(key, all[key], defaults);
  return out;
}

// The live values. Seeded with the shipped defaults so every accessor below
// is synchronous and correct from the very first line of code that runs —
// accountsEnabled() decides whether a header pill renders, and must never
// wait on the network to answer.
let _values = valuesFrom({}, DEFAULTS);

/**
 * Snapshot policy: values are fetched and activated exactly ONCE per page
 * load, kicked off in main.js's init(), and `_values` is never touched again
 * after that one assignment. So a config published mid-session cannot change
 * the rules underneath a player who is already drafting — the worst case is
 * the narrow window between first paint and the fetch landing, during which
 * the shipped defaults are in force and anything read in that window (the
 * account pill's first render, a season simulated within the first second)
 * sees the default rather than the published value. That is the right way
 * round: the default is the value this build was tested with.
 */
let _initPromise = null;

/**
 * Fetches and activates Remote Config. Fire-and-forget: nothing awaits this,
 * every failure keeps the shipped defaults, and no failure is surfaced.
 * Safe to call more than once — memoized.
 *
 * @returns {Promise<Record<string, *>>} the active values
 */
export function initRemoteConfig() {
  if (!_initPromise) {
    _initPromise = (async () => {
      if (!isFirebaseConfigured()) return _values;
      try {
        const app = await getFirebaseApp();
        if (!app) return _values;
        const { getRemoteConfig, fetchAndActivate, getAll } =
          await import(`${SDK_BASE}/firebase-remote-config.js`);
        const rc = getRemoteConfig(app);
        rc.settings.minimumFetchIntervalMillis = FETCH_INTERVAL_MS;
        rc.settings.fetchTimeoutMillis = FETCH_TIMEOUT_MS;
        // The SDK's own defaults, so a key the Console has never had still
        // resolves rather than throwing on read.
        rc.defaultConfig = Object.fromEntries(
          Object.entries(DEFAULTS).map(([k, s]) => [k, s.value]));
        await fetchAndActivate(rc);
        _values = valuesFrom(getAll(rc), DEFAULTS);
      } catch (_) { /* offline, blocked, or misconfigured — defaults stand */ }
      return _values;
    })();
  }
  return _initPromise;
}

/**
 * One config value, synchronously. Returns the shipped default until (and
 * unless) a fetch has landed.
 * @param {string} key
 */
export function configValue(key) {
  return _values[key];
}

/** Every active value, for debugging and for tests. */
export function configSnapshot() {
  return { ..._values };
}
