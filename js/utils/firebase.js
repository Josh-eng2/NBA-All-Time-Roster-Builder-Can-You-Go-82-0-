/**
 * js/utils/firebase.js — Firebase Firestore Global Leaderboard
 *
 * SETUP INSTRUCTIONS
 * ──────────────────
 * 1. Go to https://console.firebase.google.com → create a project.
 * 2. Click "Firestore Database" → Create database → Start in production mode.
 * 3. Set Firestore Rules (Firestore → Rules tab):
 *
 *      rules_version = '2';
 *      service cloud.firestore {
 *        match /databases/{database}/documents {
 *          match /leaderboard/{docId} {
 *            allow read: if true;
 *            allow create: if request.resource.data.wins is number
 *                          && request.resource.data.wins >= 0
 *                          && request.resource.data.wins <= 82
 *                          && request.resource.data.losses is number
 *                          && request.resource.data.losses >= 0
 *                          && request.resource.data.losses <= 82
 *                          && request.resource.data.teamName is string
 *                          && request.resource.data.teamName.size() <= 30
 *                          && request.resource.data.coachId is string
 *                          && request.resource.data.coachId.size() <= 20
 *                          && request.resource.data.coachName is string
 *                          && request.resource.data.coachName.size() <= 30
 *                          && request.resource.data.era is string
 *                          && request.resource.data.era.size() <= 10
 *                          && request.resource.data.starters is string
 *                          && request.resource.data.starters.size() <= 100
 *                          && request.resource.data.chemScore is number
 *                          && request.resource.data.chemScore >= 0
 *                          && request.resource.data.chemScore <= 100
 *                          && (!('avgPopularity' in request.resource.data)
 *                              || (request.resource.data.avgPopularity is number
 *                                  && request.resource.data.avgPopularity >= 0
 *                                  && request.resource.data.avgPopularity <= 1000))
 *                          && (!('fansM' in request.resource.data)
 *                              || (request.resource.data.fansM is number
 *                                  && request.resource.data.fansM >= 0
 *                                  && request.resource.data.fansM <= 2200))
 *                          && request.resource.data.champion is bool
 *                          && request.resource.data.timestampMs is number;
 *            allow update, delete: if false;
 *          }
 *        }
 *      }
 *
 *    NOTE: every field the client renders must be validated here — documents
 *    can be written by anyone holding the public web config, and the modal
 *    renders them for every visitor. The client also numeric-coerces on read
 *    (storage.js) as defense in depth.
 *
 *    avgPopularity/fansM bounds (0-1000 / 0-2200) are generous headroom
 *    above the ~350 / ~410 theoretical maximums the current player data and
 *    fansM formula can produce — see the comment above clampWireNumber()
 *    below for the client-side mirror of these two numbers, which MUST be
 *    updated together with whatever is actually deployed here.
 *
 *    `timestampMs` is client-reported and MUST NOT be compared against
 *    request.time — do not add `&& request.resource.data.timestampMs <=
 *    request.time.toMillis() + 60000` (or any variant of it) to this rule.
 *    That comparison rejects every write from a device whose system clock
 *    reports a time more than a minute ahead of Firestore's server clock —
 *    a genuinely common condition (unsynced clocks, a wrong timezone, a VM
 *    or container with clock drift), and it fails with the exact same
 *    generic PERMISSION_DENIED the client shows for a dozen unrelated
 *    causes, so it is very easy to reintroduce this by accident while
 *    editing the rule for something else and not notice for weeks. If this
 *    project's LIVE rules currently have that comparison, remove it and
 *    republish — every affected player's submissions are being silently
 *    rejected at the door regardless of what the client code does. Time-
 *    window reads (24h/weekly) filter on the `timestamp` field instead,
 *    which Firestore stamps via serverTimestamp() and is authoritative
 *    regardless of the submitting client's clock — so nothing actually
 *    needs this check to be trustworthy in the first place.
 *
 *    Also add this second rule block for the Daily Challenge leaderboard
 *    (same file, same `match /databases/{database}/documents {` block):
 *
 *      match /dailyLeaderboard/{docId} {
 *        allow read: if true;
 *        allow create: if request.resource.data.date is string
 *                      && request.resource.data.date.size() == 10
 *                      && request.resource.data.wins is number
 *                      && request.resource.data.wins >= 0
 *                      && request.resource.data.wins <= 82
 *                      && request.resource.data.losses is number
 *                      && request.resource.data.losses >= 0
 *                      && request.resource.data.losses <= 82
 *                      && request.resource.data.teamName is string
 *                      && request.resource.data.teamName.size() <= 30
 *                      && request.resource.data.coachId is string
 *                      && request.resource.data.coachId.size() <= 20
 *                      && request.resource.data.coachName is string
 *                      && request.resource.data.coachName.size() <= 30
 *                      && request.resource.data.chemScore is number
 *                      && request.resource.data.chemScore >= 0
 *                      && request.resource.data.chemScore <= 100
 *                      && request.resource.data.starters is string
 *                      && request.resource.data.starters.size() <= 100
 *                      && request.resource.data.champion is bool
 *                      && request.resource.data.timestampMs is number
 *                      && request.resource.data.challengeId is string
 *                      && request.resource.data.challengeId.size() <= 40
 *                      && request.resource.data.passed is bool
 *                      && request.resource.data.score is number
 *                      && request.resource.data.score ==
 *                           request.resource.data.wins * 10
 *                           + (request.resource.data.passed ? 200 : 0);
 *        allow update, delete: if false;
 *      }
 *
 *    The score equality check mirrors js/logic/challenge.js dailyScore()
 *    (wins*10 + 200 pass bonus) — a document whose score doesn't match its
 *    own wins/passed fields was not written by the game and is rejected at
 *    the door. fetchDailyLeaderboard() applies the same check client-side
 *    as defense in depth for documents written before this rule.
 *
 *    `date` is the 'YYYY-MM-DD' UTC calendar day (see state.js getUtcDateString)
 *    — reads filter on it with a single equality `where()`, deliberately with
 *    no `orderBy`, so no composite index needs to be created for this
 *    collection; results are sorted by challenge score client-side instead
 *    (same trick the 24h/weekly windows above use). `challengeId`/`passed`/
 *    `score` describe the day's specific challenge (see js/logic/challenge.js).
 *
 * 4. In Firebase Console → Project Settings → Your apps → Add web app.
 *    Copy the firebaseConfig object and paste the values into FIREBASE_CONFIG below.
 * 5. Deploy your site — scores will start flowing in automatically.
 *
 * Exports:
 *   isFirebaseConfigured()      — true only when real credentials are present
 *   submitGlobalScore(entry)    — writes one document to 'leaderboard'
 *   fetchLeaderboard(filter)    — reads top entries; filter: 'alltime' | '24h' | 'weekly'
 *   submitDailyScore(entry)     — writes one document to 'dailyLeaderboard'
 *   fetchDailyLeaderboard(date) — reads top entries for a 'YYYY-MM-DD' day
 *   fetchDailyCommunityStats(date) — { attempts, passed, pct } for the day's board
 */

// The SDK is loaded via dynamic import (below), not a static one. main.js and
// events.js import this module at the top level, so a static import of a
// third-party CDN URL here would mean a blocked/unreachable gstatic.com
// (corporate firewall, privacy extension, flaky connection) takes down the
// ENTIRE module graph — no render, no mode-select, nothing. A dynamic import
// confined to ensureInit() below lets that failure degrade to "leaderboard
// and analytics unavailable" instead of "game never boots".
let initializeApp, getApps, getFirestore, initializeFirestore, collection, addDoc, getDocs,
    query, orderBy, limit, where, serverTimestamp, Timestamp,
    getAnalytics, logEvent;

const SDK_BASE = 'https://www.gstatic.com/firebasejs/10.12.4';

/**
 * Assembles the SDK from three settled dynamic imports.
 *
 * Analytics is OPTIONAL and Firestore is not. `firebase-analytics.js` is on
 * essentially every ad/tracker blocklist (uBlock Origin, Brave Shields,
 * Firefox ETP, Pi-hole, NextDNS), while `firebase-firestore.js` is on almost
 * none — so loading all three with Promise.all meant one blocked analytics
 * module rejected the lot, left the Firebase app uninitialised, and made every
 * leaderboard read AND every score submission fail with "Firebase unavailable"
 * for a player whose Firestore access was working perfectly.
 *
 * Split out and exported so that contract has a test, because the failure it
 * guards against cannot be reproduced from Node (every https import fails
 * there, so the interesting case — analytics down, Firestore up — never
 * arises on its own).
 *
 * @param {PromiseSettledResult<any>[]} settled  [app, firestore, analytics]
 * @returns {{ app: object, firestore: object, analytics: object|null }|null}
 *   null only when a REQUIRED module is missing.
 */
export function sdkFromSettled([app, firestore, analytics] = []) {
  if (app?.status !== 'fulfilled' || firestore?.status !== 'fulfilled') return null;
  return {
    app:       app.value,
    firestore: firestore.value,
    analytics: analytics?.status === 'fulfilled' ? analytics.value : null,
  };
}

// A failed load is retried rather than remembered forever: the CDN being
// unreachable for the few hundred ms around page load used to disable the
// leaderboard for the whole session, and the "Retry" button in the modal's
// error message re-entered this same rejected promise, so it could never
// succeed. The cooldown keeps a genuinely offline client from re-importing on
// every analytics event.
const SDK_RETRY_COOLDOWN_MS = 30000;
let _sdkPromise = null;
let _sdkRetryAt = 0;

function loadSdk() {
  if (!_sdkPromise) {
    if (Date.now() < _sdkRetryAt) return Promise.resolve(null);
    _sdkPromise = Promise.allSettled([
      import(`${SDK_BASE}/firebase-app.js`),
      import(`${SDK_BASE}/firebase-firestore.js`),
      import(`${SDK_BASE}/firebase-analytics.js`),
    ]).then(settled => {
      const sdk = sdkFromSettled(settled);
      if (!sdk) { _sdkPromise = null; _sdkRetryAt = Date.now() + SDK_RETRY_COOLDOWN_MS; }
      return sdk;
    });
  }
  return _sdkPromise;
}

// ── Firebase project config ────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyBt1pbWJjeR7ELe0g1ZoRZsQpiiAGvbmNQ',
  authDomain:        'basketball-gm-sim-c33ed.firebaseapp.com',
  projectId:         'basketball-gm-sim-c33ed',
  storageBucket:     'basketball-gm-sim-c33ed.firebasestorage.app',
  messagingSenderId: '686961038101',
  appId:             '1:686961038101:web:9287fec583fea933fc8f1c',
  measurementId:     'G-NWPZD758GE',
};

// ── Configuration check ───────────────────────────────────────────────────────

/** Returns true only when FIREBASE_CONFIG has been filled in with real values. */
export function isFirebaseConfigured() {
  return FIREBASE_CONFIG.apiKey    !== 'YOUR_API_KEY'
      && FIREBASE_CONFIG.projectId !== 'YOUR_PROJECT_ID';
}

// ── Singleton app / Firestore / Analytics instances ───────────────────────────

let _db        = null;
let _analytics = null;
let _app       = null;

// Initialize the Firebase app and Analytics eagerly at module load (kicked
// off below, not awaited) so that session tracking and page-view events fire
// as soon as the SDK resolves. Memoized — safe to call from every exported
// function without re-triggering the dynamic import.
let _initPromise = null;
function ensureInit() {
  if (!_initPromise) {
    _initPromise = (async () => {
      // Nothing to retry when there are no credentials — that memo is kept.
      if (!isFirebaseConfigured()) return;
      const sdk = await loadSdk();
      if (sdk) {
        try {
          ({ initializeApp, getApps } = sdk.app);
          ({ getFirestore, initializeFirestore, collection, addDoc, getDocs,
             query, orderBy, limit, where, serverTimestamp, Timestamp } = sdk.firestore);
          // `?? {}`: analytics is optional, so sdk.analytics is null whenever
          // that module was blocked. Destructuring null throws, and the throw
          // would land in the catch below and null out _app — reintroducing
          // the exact "analytics takes Firestore down with it" bug one layer
          // lower down.
          ({ getAnalytics, logEvent } = sdk.analytics ?? {});
          const existing = getApps();
          _app = existing.length ? existing[0] : initializeApp(FIREBASE_CONFIG);
          if (getAnalytics) {
            try { _analytics = getAnalytics(_app); } catch (_) { /* blocked by adblocker */ }
          }
        } catch (_) { _app = null; }
      }
      // A failed init must not be remembered, or ensureInit() would never call
      // loadSdk() again and its retry cooldown could never fire — the modal's
      // Retry button would be re-entering a permanently failed memo.
      if (!_app) _initPromise = null;
    })();
  }
  return _initPromise;
}
ensureInit();

/**
 * Firestore's default web transport streams over a long-lived HTTP/2
 * connection (WebChannel). That stream is exactly the shape a fair number of
 * restrictive networks and proxies interfere with — corporate firewalls,
 * some VPNs, buffering intermediaries — silently hanging or resetting it
 * instead of erroring cleanly, which surfaces here as submitGlobalScore()
 * eventually rejecting with a generic "unavailable"/network error. None of
 * that is reachable from a plain REST POST (bypasses the streaming layer
 * entirely) or from Node (a different transport), which is why the previous
 * "leaderboard is failing" diagnosis — one blocked analytics import taking
 * the whole SDK down — was real but not the only cause: fixing it does
 * nothing for a submission that fails because the WRITE stream itself never
 * got through.
 *
 * `experimentalAutoDetectLongPolling` is Firebase's own documented fix: probe
 * once, and only fall back to plain long-polling if the streaming transport
 * doesn't work. It has no cost on a normal connection (the streaming path is
 * still tried first) and turns a hard failure into a slightly slower success
 * on the networks where it matters. Despite the flag's name this has shipped
 * as the standard recommendation for exactly this symptom for years.
 *
 * initializeFirestore() throws FAILED_PRECONDITION if this database instance
 * was already initialized elsewhere (e.g. a host page that embeds this game
 * and has its own Firebase app under the same config) with different
 * settings — falls back to the plain getFirestore() instance in that case
 * rather than losing the leaderboard entirely over a setting we can't apply.
 *
 * Pulled out of getDb() as a pure function of its inputs so the fallback
 * logic has a unit test: the module-level SDK functions below are only ever
 * populated by a dynamic `import('https://...')`, which Node's loader
 * rejects outright, so getDb() itself can never be exercised from the test
 * suite — this can.
 *
 * @param {object} app
 * @param {{ initializeFirestore?: Function, getFirestore?: Function }} fns
 * @returns {object|null}
 */
export function firestoreDbFor(app, { initializeFirestore, getFirestore } = {}) {
  if (!app) return null;
  if (initializeFirestore) {
    try {
      return initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
    } catch (_) { /* already initialized elsewhere with different settings — fall through */ }
  }
  return getFirestore ? getFirestore(app) : null;
}

async function getDb() {
  await ensureInit();
  if (_db) return _db;
  _db = firestoreDbFor(_app, { initializeFirestore, getFirestore });
  return _db;
}

// First-touch referral source, stamped onto every event so any funnel question
// ("do players who arrive from a shared link finish a season?") can be answered
// by splitting on one dimension instead of joining sessions by hand.
//
// Read straight from storage rather than importing utils/referral.js: that
// module logs its own landing event through here, so importing it would make
// the two files circular. Only a successful read is cached — an event that
// fires before captureReferral() has written the key (module-load events race
// with init) must not pin the dimension to null for the rest of the session.
let _refSource = null;
function referralParam() {
  if (!_refSource) {
    try { _refSource = JSON.parse(localStorage.getItem('nba820_ref') || 'null')?.ref ?? null; }
    catch (_) { _refSource = null; }
  }
  return _refSource ? { ref_source: _refSource } : null;
}

/**
 * Logs a Firebase Analytics event. Silently no-ops if Analytics is blocked.
 * @param {string} eventName
 * @param {object} [params]
 */
export function logAnalyticsEvent(eventName, params = {}) {
  ensureInit().then(() => {
    try {
      if (_analytics) logEvent(_analytics, eventName, { ...params, ...referralParam() });
    } catch (_) { /* silently ignore */ }
  }).catch(() => {});
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Submits a score entry to the global leaderboard.
 *
 * @param {{
 *   teamName:    string,
 *   wins:        number,
 *   losses:      number,
 *   champion:    boolean,
 *   coachId:     string,
 *   coachName:   string,
 *   era:         string,
 *   chemScore:   number,
 *   avgPopularity?: number,
 *   fansM?:        number,
 *   starters:    string,
 *   timestampMs: number,
 * }} entry
 * @returns {Promise<string>} Firestore document ID
 */
/**
 * Coerces an optional numeric field into the range the deployed Firestore
 * rules accept, or drops it entirely when it isn't a finite number.
 *
 * The rules validate every field and reject the WHOLE document on any
 * violation, so an out-of-range value doesn't degrade the entry — it loses
 * the submission. Same defensive reasoning as the `starters` truncation
 * below.
 *
 * `avgPopularity`/`fansM` are derived from player popularity, whose data
 * ceiling was raised (140 -> 350) after the ORIGINAL rules were written —
 * a star-chasing roster reports avgPopularity ~150-300 and fansM ~90-320,
 * both well past that original 0-100 / 0-50 rule ceiling, so the great
 * majority of global submissions were being refused at the door. The
 * deployed rules were subsequently widened to 0-1000 / 0-2200 to actually
 * fit the real range (headroom well above the ~350 / ~410 theoretical
 * maximums the current data and formulas can produce) — the bounds below
 * must always match whatever the CURRENTLY deployed rules say, not the
 * game's own believed data range, since a mismatch here either clamps away
 * real precision for no reason (bound too tight) or loses submissions to a
 * rule the client never learns about (bound too loose). If the deployed
 * rules change again, change these two numbers in the same commit.
 *
 * Clamping is kept even with the wider bounds as defense-in-depth: the
 * rules are deployed server-side and can't be changed from this repo, so a
 * future data change that pushes past even this ceiling degrades to a
 * clamped submission instead of losing the whole entry. The leaderboard UI
 * also recomputes the true full-scale numbers from the entry's own starter
 * names anyway (see _teamFansFromEntry in utils/storage.js), so nothing the
 * player sees depends on the clamped copy.
 */
function clampWireNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, n));
}

export function buildGlobalDoc(entry) {
  return {
    teamName:    (entry.teamName || 'Untitled Team').slice(0, 30),
    wins:         entry.wins        ?? 0,
    losses:       entry.losses      ?? 0,
    champion:    !!(entry.champion  ?? false),
    coachId:     (entry.coachId     ?? '').slice(0, 20),
    coachName:   (entry.coachName   ?? '').slice(0, 30),
    era:         (entry.era         ?? 'all').slice(0, 10),
    chemScore:    clampWireNumber(entry.chemScore, 0, 100) ?? 0,
    // Bounds mirror the CURRENTLY deployed Firestore rules (see the comment
    // above clampWireNumber) — 0-1000 / 0-2200, not the game's own data range.
    ...(clampWireNumber(entry.avgPopularity, 0, 1000) != null
      ? { avgPopularity: clampWireNumber(entry.avgPopularity, 0, 1000) } : {}),
    ...(clampWireNumber(entry.fansM, 0, 2200) != null
      ? { fansM: clampWireNumber(entry.fansM, 0, 2200) } : {}),
    // Rules cap starters at 100 chars — truncate here too so a long-named
    // roster can never fail the whole write.
    starters:    (entry.starters    ?? '').slice(0, 100),
    timestampMs:  entry.timestampMs ?? 0,
  };
}

/**
 * Rethrows a Firestore SDK rejection with its `.code` (e.g. "unavailable",
 * "permission-denied") folded into the message. The UI's error banner and
 * toast otherwise showed a bare "Submission failed — check your connection"
 * for every failure alike, so a genuine rules rejection and a network-level
 * block on the write stream (see the long-polling note on getDb()) were
 * indistinguishable from the outside — there was no way to tell which one a
 * player was actually hitting without adding console access to their session.
 * @param {Promise} p
 */
export async function withFirestoreErrorCode(p) {
  try {
    return await p;
  } catch (err) {
    if (err?.code && !String(err.message || '').includes(err.code)) {
      err.message = `${err.message} (${err.code})`;
    }
    throw err;
  }
}

export async function submitGlobalScore(entry) {
  if (!isFirebaseConfigured()) throw new Error('Firebase not configured — see js/utils/firebase.js setup instructions');
  const wins = entry.wins ?? 0;
  if (wins < 0 || wins > 82) throw new Error('Invalid wins value');
  const db  = await getDb();
  if (!db) throw new Error('Firebase unavailable — leaderboard could not load');
  const col = collection(db, 'leaderboard');
  const ref = await withFirestoreErrorCode(addDoc(col, {
    ...buildGlobalDoc(entry),
    timestamp:    serverTimestamp(),
    // ── FUTURE: per-run stat leaders on the GLOBAL board ──────────────────
    // Per-player season stats already persist to the LOCAL leaderboard
    // (storage.js → packLeaders). To surface leaders globally too, add:
    //     leaders: entry.leaders ?? null,   // { pts, reb, ast, stl, blk }
    // BUT the Firestore security rule above validates the document shape and
    // will REJECT the whole write if it uses hasOnly()/strict field checks.
    // So publish the rule change FIRST (allow a `leaders` map field in the
    // Firebase Console → Firestore → Rules), THEN uncomment the line above and
    // pass `leaders` from the save-run handler. Leaving it out keeps global
    // submissions working until then.
  }));
  return ref.id;
}

/**
 * Fetches up to 50 leaderboard entries, sorted by wins descending.
 *
 * @param {'alltime'|'24h'|'weekly'} filter
 * @returns {Promise<object[]>}
 */
export async function fetchLeaderboard(filter = 'alltime') {
  if (!isFirebaseConfigured()) throw new Error('Firebase not configured — see js/utils/firebase.js setup instructions');
  const db  = await getDb();
  if (!db) throw new Error('Firebase unavailable — leaderboard could not load');
  const col = collection(db, 'leaderboard');

  let q;
  if (filter === 'alltime') {
    q = query(col, orderBy('wins', 'desc'), limit(10));
  } else {
    const msInDay = 24 * 60 * 60 * 1000;
    // Filter on `timestamp` (server-stamped via serverTimestamp()), not the
    // client-reported `timestampMs` — this keeps the window authoritative
    // regardless of the reading device's own clock.
    const cutoff = Timestamp.fromMillis(Date.now() - (filter === '24h' ? msInDay : 7 * msInDay));
    // Same-field where + orderBy — no composite index required. The window is
    // fetched newest-first then re-sorted by wins client-side, so the limit
    // bounds how many recent entries the top-10 is drawn from; 250 keeps a
    // busy week from dropping high-win runs off the board.
    q = query(col, where('timestamp', '>', cutoff), orderBy('timestamp', 'desc'), limit(250));
  }

  const snap    = await withFirestoreErrorCode(getDocs(q));
  const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (filter !== 'alltime') entries.sort((a, b) => b.wins - a.wins);
  return entries.slice(0, 10);
}

/**
 * Submits a score entry to the Daily Challenge leaderboard.
 *
 * @param {{
 *   date:        string,  // 'YYYY-MM-DD' UTC — see state.js getUtcDateString()
 *   teamName:    string,
 *   wins:        number,
 *   losses:      number,
 *   champion:    boolean,
 *   coachId:     string,
 *   coachName:   string,
 *   chemScore:   number,
 *   starters:    string,
 *   timestampMs: number,
 * }} entry
 * @returns {Promise<string>} Firestore document ID
 */
/**
 * Wire shape for one dailyLeaderboard document (everything but the
 * server-stamped `timestamp`). Split out of submitDailyScore for the same
 * reason as buildGlobalDoc: the deployed rules reject the whole document on
 * any field violation, so the field coercion is the part worth testing.
 *
 * `score` is recomputed from wins/passed rather than trusted: the rule
 * asserts `score == wins * 10 + (passed ? 200 : 0)` exactly, so any caller
 * drift between the three fields would silently lose the submission.
 * Mirrors dailyScore() in logic/challenge.js.
 */
export function buildDailyDoc(entry) {
  const wins   = clampWireNumber(entry.wins,   0, 82) ?? 0;
  const passed = !!entry.passed;
  return {
    date:         entry.date,
    teamName:    (entry.teamName || 'Untitled Team').slice(0, 30),
    wins,
    losses:       clampWireNumber(entry.losses, 0, 82) ?? 0,
    champion:    !!(entry.champion  ?? false),
    coachId:     (entry.coachId     ?? '').slice(0, 20),
    coachName:   (entry.coachName   ?? '').slice(0, 30),
    chemScore:    clampWireNumber(entry.chemScore, 0, 100) ?? 0,
    starters:    (entry.starters    ?? '').slice(0, 100),
    timestampMs:  entry.timestampMs ?? 0,
    // Day's specific challenge (era rules, rating caps, win targets, …):
    // score = wins*10 + 200 pass bonus — the board's primary sort key.
    challengeId: (entry.challengeId ?? '').slice(0, 40),
    passed,
    score:        wins * 10 + (passed ? 200 : 0),
  };
}

export async function submitDailyScore(entry) {
  if (!isFirebaseConfigured()) throw new Error('Firebase not configured — see js/utils/firebase.js setup instructions');
  const wins = entry.wins ?? 0;
  if (wins < 0 || wins > 82) throw new Error('Invalid wins value');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date || '')) throw new Error('Invalid date');
  const db  = await getDb();
  if (!db) throw new Error('Firebase unavailable — leaderboard could not load');
  const col = collection(db, 'dailyLeaderboard');
  const ref = await withFirestoreErrorCode(addDoc(col, {
    ...buildDailyDoc(entry),
    timestamp:    serverTimestamp(),
  }));
  // The day's cached documents are now stale — the player must see their own
  // submission the moment they open the board.
  invalidateDailyDocs();
  return ref.id;
}

// One UTC day's dailyLeaderboard documents, shared by the board list and the
// community pass-rate. Both used to issue the identical
// `where('date','==',date) limit(500)` query, and the daily modal fires them
// together in a Promise.all — so opening it cost two full reads of the same
// documents, plus a third from the mode-select/results pass-rate line.
// A short TTL keeps the board fresh (and submitDailyScore drops the entry
// outright, so a player always sees their own run immediately).
const DAILY_DOCS_TTL_MS = 60000;
let _dailyDocs = { date: null, at: 0, promise: null };

/** @param {string} date 'YYYY-MM-DD' @returns {Promise<object[]>} */
function fetchDailyDocs(date) {
  if (!isFirebaseConfigured()) {
    return Promise.reject(new Error('Firebase not configured — see js/utils/firebase.js setup instructions'));
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
    return Promise.reject(new Error('Invalid date'));
  }
  const now = Date.now();
  if (_dailyDocs.date === date && _dailyDocs.promise && now - _dailyDocs.at < DAILY_DOCS_TTL_MS) {
    return _dailyDocs.promise;
  }
  const pending = (async () => {
    const db = await getDb();
    if (!db) throw new Error('Firebase unavailable — leaderboard could not load');
    const col = collection(db, 'dailyLeaderboard');
    // Single equality filter, no orderBy — needs no composite index. Sorted
    // client-side, same pattern fetchLeaderboard() uses for 24h/weekly.
    const snap = await withFirestoreErrorCode(getDocs(query(col, where('date', '==', date), limit(500))));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  })().catch(err => {
    // A failed read must not be cached — the next call has to retry.
    if (_dailyDocs.promise === pending) invalidateDailyDocs();
    throw err;
  });
  _dailyDocs = { date, at: now, promise: pending };
  return pending;
}

/** Drops the cached day so the next read hits Firestore. */
function invalidateDailyDocs() {
  _dailyDocs = { date: null, at: 0, promise: null };
}

/**
 * Fetches up to 10 Daily Challenge entries for one UTC day, best first.
 * Sorted by challenge score (falls back to wins*10 for entries written
 * before the challenge system), then earliest submission.
 *
 * @param {string} date  'YYYY-MM-DD' — see state.js getUtcDateString()
 * @returns {Promise<object[]>}
 */
export async function fetchDailyLeaderboard(date) {
  // filter() below produces a fresh array, so the shared cached one is never
  // sorted or mutated in place.
  let entries = await fetchDailyDocs(date);

  // Defense-in-depth against hand-forged documents (writes only need the
  // public web config, and rules can't verify a run actually happened):
  // drop rows whose numbers are internally impossible. The score is fully
  // determined by wins + passed (wins*10 + 200 pass bonus), so any row
  // where they disagree was not written by the game. Entries from before
  // the challenge system (no challengeId) keep the plain wins*10 path.
  entries = entries.filter(e => {
    const wins = Number(e.wins);
    if (!Number.isInteger(wins) || wins < 0 || wins > 82) return false;
    if (e.challengeId) {
      const expected = wins * 10 + (e.passed === true ? 200 : 0);
      if (Number(e.score) !== expected) return false;
    }
    return true;
  });

  const scoreOf = e => Number(e.score) || (Number(e.wins) || 0) * 10;
  entries.sort((a, b) => scoreOf(b) - scoreOf(a) || (a.timestampMs ?? 0) - (b.timestampMs ?? 0));
  return entries.slice(0, 10);
}

/**
 * Community pass-rate for one UTC Daily Challenge day.
 * Aggregates `passed` flags from that day's dailyLeaderboard submissions
 * (same query shape as fetchDailyLeaderboard — no composite index).
 *
 * @param {string} date  'YYYY-MM-DD'
 * @returns {Promise<{ attempts: number, passed: number, pct: number|null }>}
 */
export async function fetchDailyCommunityStats(date) {
  const docs = await fetchDailyDocs(date);
  let attempts = 0;
  let passed   = 0;
  for (const data of docs) {
    // Skip pre-challenge-system submissions that never recorded a verdict.
    if (typeof data.passed !== 'boolean') continue;
    attempts += 1;
    if (data.passed) passed += 1;
  }
  const pct = attempts > 0 ? Math.round((passed / attempts) * 100) : null;
  return { attempts, passed, pct };
}
