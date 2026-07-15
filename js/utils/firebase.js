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
 *                                  && request.resource.data.avgPopularity <= 100))
 *                          && (!('fansM' in request.resource.data)
 *                              || (request.resource.data.fansM is number
 *                                  && request.resource.data.fansM >= 0
 *                                  && request.resource.data.fansM <= 50))
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
 *    `timestampMs` is client-reported and intentionally NOT compared against
 *    request.time — an earlier rule did `timestampMs <= request.time.toMillis()
 *    + 60000`, which rejected writes from any device whose system clock ran
 *    fast (symptom: submission works on phone, fails on desktop, because
 *    phones sync time over the cellular network while desktop clocks can
 *    drift or have a misconfigured timezone). Time-window reads (24h/weekly)
 *    filter on the `timestamp` field instead, which Firestore stamps via
 *    serverTimestamp() and is authoritative regardless of the submitting
 *    client's clock.
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
 * ACCOUNTS / CROSS-DEVICE SYNC (optional, on top of the above)
 * ──────────────────────────────────────────────────────────
 * 6. Firebase Console → Authentication → Sign-in method → enable both
 *    "Google" and "Email link (passwordless sign-in)". Only these two are
 *    wired up — sign-in stays fully optional (the game never requires an
 *    account to play), so neither needs a password UI to be built.
 * 7. Firebase Console → Authentication → Settings → Authorized domains →
 *    add your production domain (e.g. canyougo820.com). Firebase Auth
 *    rejects sign-in attempts from any domain not on this list — it does
 *    NOT automatically trust a custom domain just because Firestore/Hosting
 *    already know about it. Forgetting this step is the most common way to
 *    see a working "Sign in with Google" button do nothing (or, on some
 *    mobile browsers, land on a Firebase-hosted "missing initial state"
 *    error page instead of a clean rejection).
 * 8. Firestore Rules — add this block alongside the leaderboard rules above
 *    (same `match /databases/{database}/documents {` block). Unlike the
 *    leaderboard, this collection is owner-only, so it needs no field
 *    validation — a signed-in user can only ever read/write their OWN doc:
 *
 *      match /users/{uid} {
 *        allow read, write: if request.auth != null && request.auth.uid == uid;
 *      }
 *
 * Exports:
 *   isFirebaseConfigured()      — true only when real credentials are present
 *   submitGlobalScore(entry)    — writes one document to 'leaderboard'
 *   fetchLeaderboard(filter)    — reads top entries; filter: 'alltime' | '24h' | 'weekly'
 *   submitDailyScore(entry)     — writes one document to 'dailyLeaderboard'
 *   fetchDailyLeaderboard(date) — reads top entries for a 'YYYY-MM-DD' day
 *   fetchDailyCommunityStats(date) — { attempts, passed, pct } for the day's board
 *   signInWithGoogle()          — starts a Google sign-in redirect (see note below)
 *   consumeRedirectSignIn()     — call once at boot to complete a pending Google redirect
 *   sendEmailSignInLink(email)  — emails a one-time passwordless sign-in link
 *   consumeEmailLinkSignIn()    — call once at boot to complete a tapped email link
 *   signOutUser()                — signs the current user out
 *   getCurrentUser()             — sync snapshot of the signed-in user, or null
 *   getUserDoc(uid)              — reads the cross-device-sync doc at users/{uid}
 *   setUserDoc(uid, data)        — overwrites the cross-device-sync doc at users/{uid}
 *
 * Google sign-in uses signInWithRedirect, not signInWithPopup. The popup
 * flow relies on sessionStorage being readable by BOTH the opener tab and
 * the popup window to relay the result back — several mobile browsers
 * (notably Safari on iOS) partition storage per top-level site and block
 * that, which surfaces as an unrecoverable "missing initial state" error on
 * Firebase's own hosted handler page, with no JS exception this app could
 * catch or retry. Redirect never needs cross-window storage sharing (it's
 * the same tab/session before and after), so it doesn't have this failure
 * mode — the tradeoff is a full page reload, handled by calling
 * consumeRedirectSignIn() once at boot (see main.js).
 */

import { initializeApp, getApps }   from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import {
  getFirestore, collection, addDoc, getDocs,
  query, orderBy, limit, where, serverTimestamp, Timestamp,
  doc, getDoc, setDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
import { getAnalytics, logEvent } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-analytics.js';
import {
  getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut as fbSignOut,
  isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink,
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';

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

// Initialize the Firebase app and Analytics eagerly at module load so that
// session tracking and page-view events fire immediately on page open.
const _app = (() => {
  if (!isFirebaseConfigured()) return null;
  try {
    const existing = getApps();
    const app = existing.length ? existing[0] : initializeApp(FIREBASE_CONFIG);
    try { _analytics = getAnalytics(app); } catch (_) { /* blocked by adblocker */ }
    return app;
  } catch (_) { return null; }
})();

function getDb() {
  if (_db) return _db;
  if (!_app) return null;
  _db = getFirestore(_app);
  return _db;
}

let _auth = null;

function getAuthInstance() {
  if (_auth) return _auth;
  if (!_app) return null;
  _auth = getAuth(_app);
  return _auth;
}

const toPublicUser = u => u
  ? { uid: u.uid, displayName: u.displayName, email: u.email, photoURL: u.photoURL }
  : null;

/**
 * Logs a Firebase Analytics event. Silently no-ops if Analytics is blocked.
 * @param {string} eventName
 * @param {object} [params]
 */
export function logAnalyticsEvent(eventName, params = {}) {
  try {
    if (_analytics) logEvent(_analytics, eventName, params);
  } catch (_) { /* silently ignore */ }
}

// ── Accounts / cross-device sync ────────────────────────────────────────────
// Sign-in is entirely optional — the game never gates play behind it. It
// exists solely so a player can carry their leaderboard/trophy history to
// another device. See js/utils/cloudSync.js for the merge logic that uses
// getUserDoc/setUserDoc below.

/**
 * Starts a Google sign-in redirect — navigates the whole page to Google and
 * back. See the file-header note above for why this isn't a popup. Because
 * it navigates away, this never resolves with a user; call
 * consumeRedirectSignIn() at boot on the page it returns to instead.
 */
export async function signInWithGoogle() {
  if (!isFirebaseConfigured()) throw new Error('Firebase not configured — see js/utils/firebase.js setup instructions');
  const auth = getAuthInstance();
  if (!auth) throw new Error('Firebase auth unavailable');
  await signInWithRedirect(auth, new GoogleAuthProvider());
}

/**
 * Call once at boot, before anything else needs to know the auth state.
 * Completes a Google sign-in that was in progress before the redirect
 * navigated away. Resolves to null on every ordinary page load (i.e. almost
 * always) — cheap and safe to call unconditionally.
 * @returns {Promise<{uid:string, displayName:string|null, email:string|null, photoURL:string|null}|null>}
 */
export async function consumeRedirectSignIn() {
  const auth = getAuthInstance();
  if (!auth) return null;
  const cred = await getRedirectResult(auth);
  return toPublicUser(cred?.user ?? null);
}

// Where sendSignInLinkToEmail's emailed link points back to, and the
// localStorage key that carries the address across the email round-trip —
// plain localStorage (not cgGetItem/storage.js's CrazyGames-routed storage)
// is correct here: this is a short-lived auth-handshake artifact, not player
// progress, and the whole email-sign-in feature is hidden inside the
// CrazyGames iframe anyway (see showAccountButton() in render.js).
const EMAIL_LINK_SETTINGS = () => ({ url: window.location.origin + window.location.pathname, handleCodeInApp: true });
const EMAIL_FOR_SIGN_IN_KEY = 'nba820_emailForSignIn';

/**
 * Emails a one-time passwordless sign-in link to the given address.
 * @param {string} email
 */
export async function sendEmailSignInLink(email) {
  if (!isFirebaseConfigured()) throw new Error('Firebase not configured — see js/utils/firebase.js setup instructions');
  const auth = getAuthInstance();
  if (!auth) throw new Error('Firebase auth unavailable');
  await sendSignInLinkToEmail(auth, email, EMAIL_LINK_SETTINGS());
  try { window.localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, email); } catch (_) {}
}

/**
 * Call once at boot. If the current URL is a link the player just tapped
 * from their email, completes the sign-in and cleans the link's params out
 * of the URL either way (so a refresh can't replay a used/expired link).
 * Resolves to null on every ordinary page load.
 * @returns {Promise<{uid:string, displayName:string|null, email:string|null, photoURL:string|null}|null>}
 */
export async function consumeEmailLinkSignIn() {
  const auth = getAuthInstance();
  if (!auth || !isSignInWithEmailLink(auth, window.location.href)) return null;
  const href = window.location.href;
  window.history.replaceState({}, document.title, window.location.pathname);
  let email = null;
  try { email = window.localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY); } catch (_) {}
  if (!email) {
    // Link opened in a different browser/device than the one that requested
    // it — Firebase can't recover the address on its own, so ask once.
    email = window.prompt('Confirm your email to finish signing in:');
  }
  if (!email) return null;
  const cred = await signInWithEmailLink(auth, email, href);
  try { window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY); } catch (_) {}
  return toPublicUser(cred.user);
}

/** Signs the current user out. No-ops if Firebase isn't configured. */
export async function signOutUser() {
  const auth = getAuthInstance();
  if (!auth) return;
  await fbSignOut(auth);
}

/**
 * Sync snapshot of the signed-in user, or null. Firebase restores a prior
 * session from IndexedDB asynchronously, so this can read null for a
 * moment right at page load even for a previously-signed-in player — callers
 * that only run well after boot (e.g. a button click) won't observe that gap.
 */
export function getCurrentUser() {
  return toPublicUser(getAuthInstance()?.currentUser ?? null);
}

/**
 * Reads the cross-device-sync document for a signed-in user.
 * @param {string} uid
 * @returns {Promise<object|null>} the stored doc's data, or null if it doesn't exist yet
 */
export async function getUserDoc(uid) {
  const db = getDb();
  if (!db) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

/**
 * Overwrites the cross-device-sync document for a signed-in user.
 * @param {string} uid
 * @param {object} data
 */
export async function setUserDoc(uid, data) {
  const db = getDb();
  if (!db) return;
  await setDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
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
export async function submitGlobalScore(entry) {
  if (!isFirebaseConfigured()) throw new Error('Firebase not configured — see js/utils/firebase.js setup instructions');
  const wins = entry.wins ?? 0;
  if (wins < 0 || wins > 82) throw new Error('Invalid wins value');
  const db  = getDb();
  const col = collection(db, 'leaderboard');
  const ref = await addDoc(col, {
    teamName:    (entry.teamName || 'Untitled Team').slice(0, 30),
    wins:         entry.wins        ?? 0,
    losses:       entry.losses      ?? 0,
    champion:     entry.champion    ?? false,
    coachId:      entry.coachId     ?? '',
    coachName:    entry.coachName   ?? '',
    era:          entry.era         ?? 'all',
    chemScore:    entry.chemScore   ?? 0,
    ...(entry.avgPopularity != null ? { avgPopularity: entry.avgPopularity } : {}),
    ...(entry.fansM       != null ? { fansM:       entry.fansM       } : {}),
    // Rules cap starters at 100 chars — truncate here too so a long-named
    // roster can never fail the whole write.
    starters:    (entry.starters    ?? '').slice(0, 100),
    timestampMs:  entry.timestampMs ?? 0,
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
  });
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
  const db  = getDb();
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

  const snap    = await getDocs(q);
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
export async function submitDailyScore(entry) {
  if (!isFirebaseConfigured()) throw new Error('Firebase not configured — see js/utils/firebase.js setup instructions');
  const wins = entry.wins ?? 0;
  if (wins < 0 || wins > 82) throw new Error('Invalid wins value');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date || '')) throw new Error('Invalid date');
  const db  = getDb();
  const col = collection(db, 'dailyLeaderboard');
  const ref = await addDoc(col, {
    date:         entry.date,
    teamName:    (entry.teamName || 'Untitled Team').slice(0, 30),
    wins:         entry.wins        ?? 0,
    losses:       entry.losses      ?? 0,
    champion:     entry.champion    ?? false,
    coachId:      entry.coachId     ?? '',
    coachName:    entry.coachName   ?? '',
    chemScore:    entry.chemScore   ?? 0,
    starters:    (entry.starters    ?? '').slice(0, 100),
    timestampMs:  entry.timestampMs ?? 0,
    timestamp:    serverTimestamp(),
    // Day's specific challenge (era rules, rating caps, win targets, …):
    // score = wins*10 + 200 pass bonus — the board's primary sort key.
    challengeId:  (entry.challengeId ?? '').slice(0, 40),
    passed:       !!entry.passed,
    score:        Math.max(0, Math.min(2000, Math.round(entry.score ?? 0))),
  });
  return ref.id;
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
  if (!isFirebaseConfigured()) throw new Error('Firebase not configured — see js/utils/firebase.js setup instructions');
  const db  = getDb();
  const col = collection(db, 'dailyLeaderboard');
  // Single equality filter, no orderBy — needs no composite index. Sorted
  // client-side, same pattern fetchLeaderboard() uses for 24h/weekly.
  const q    = query(col, where('date', '==', date), limit(500));
  const snap = await getDocs(q);
  let entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));

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
  if (!isFirebaseConfigured()) throw new Error('Firebase not configured — see js/utils/firebase.js setup instructions');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('Invalid date');
  const db  = getDb();
  const col = collection(db, 'dailyLeaderboard');
  const q    = query(col, where('date', '==', date), limit(500));
  const snap = await getDocs(q);
  let attempts = 0;
  let passed   = 0;
  for (const d of snap.docs) {
    const data = d.data();
    // Skip pre-challenge-system submissions that never recorded a verdict.
    if (typeof data.passed !== 'boolean') continue;
    attempts += 1;
    if (data.passed) passed += 1;
  }
  const pct = attempts > 0 ? Math.round((passed / attempts) * 100) : null;
  return { attempts, passed, pct };
}
