/**
 * js/utils/firebase.js — Firebase Firestore Global Leaderboard
 *
 * LOADING MODEL
 * ─────────────
 * The Firebase SDK modules are loaded via dynamic import(), NOT static
 * imports. This file sits in main.js's static module graph, and an ES module
 * graph fails ATOMICALLY: if a static import of gstatic.com ever failed to
 * fetch (privacy extension, regional block, flaky network), main.js would
 * never execute — not even its error overlay — and the game would hang on
 * the loading spinner forever. With dynamic imports the game always boots;
 * leaderboards/analytics degrade to "unavailable" instead. It also takes
 * ~100KB+ of SDK off the critical startup path: loading kicks off eagerly
 * but nothing blocks on it until a leaderboard is actually used.
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
 *                          && request.resource.data.timestampMs is number
 *                          && request.resource.data.timestamp == request.time;
 *            allow update, delete: if false;
 *          }
 *
 *          match /dailyLeaderboard/{docId} {
 *            allow read: if true;
 *            allow create: if request.resource.data.date is string
 *                          && request.resource.data.date.size() == 10
 *                          && request.resource.data.wins is number
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
 *                          && request.resource.data.chemScore is number
 *                          && request.resource.data.chemScore >= 0
 *                          && request.resource.data.chemScore <= 100
 *                          && request.resource.data.starters is string
 *                          && request.resource.data.starters.size() <= 100
 *                          && request.resource.data.champion is bool
 *                          && request.resource.data.timestampMs is number
 *                          && request.resource.data.timestamp == request.time;
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
 *    `timestamp == request.time` forces every document to carry an honest
 *    serverTimestamp() (the sentinel evaluates to request.time in rules).
 *    Combined with fetchDailyLeaderboard()'s client-side check that each
 *    entry's server write-time actually falls within its claimed UTC day,
 *    this closes the "pre-poison tomorrow's daily board today" hole — a
 *    forged document can claim any `date`, but it cannot forge WHEN it was
 *    written, so it gets filtered out on read.
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
 *    The dailyLeaderboard `date` is the 'YYYY-MM-DD' UTC calendar day (see
 *    state.js getUtcDateString) — reads filter on it with a single equality
 *    `where()`, deliberately with no `orderBy`, so no composite index needs
 *    to be created; results are sorted by wins client-side instead (same
 *    trick the 24h/weekly windows above use).
 *
 * 4. In Firebase Console → Project Settings → Your apps → Add web app.
 *    Copy the firebaseConfig object and paste the values into FIREBASE_CONFIG below.
 * 5. Deploy your site — scores will start flowing in automatically.
 *
 * Exports:
 *   isFirebaseConfigured()      — true only when real credentials are present
 *   logAnalyticsEvent(name, p)  — fire-and-forget; queues until the SDK loads
 *   submitGlobalScore(entry)    — writes one document to 'leaderboard'
 *   fetchLeaderboard(filter)    — reads top entries; filter: 'alltime' | '24h' | 'weekly'
 *   submitDailyScore(entry)     — writes one document to 'dailyLeaderboard'
 *   fetchDailyLeaderboard(date) — reads top entries for a 'YYYY-MM-DD' day
 */

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

// ── Lazy SDK loader ───────────────────────────────────────────────────────────

const SDK_BASE = 'https://www.gstatic.com/firebasejs/10.12.4';

let _loadPromise = null; // resolves to { fs, db } or null (unavailable)
let _analytics   = null;
let _logEvent    = null;

function loadFirebase() {
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    if (!isFirebaseConfigured()) return null;
    let fs, db;
    try {
      const [appMod, fsMod] = await Promise.all([
        import(`${SDK_BASE}/firebase-app.js`),
        import(`${SDK_BASE}/firebase-firestore.js`),
      ]);
      const existing = appMod.getApps();
      const app = existing.length ? existing[0] : appMod.initializeApp(FIREBASE_CONFIG);
      fs = fsMod;
      db = fsMod.getFirestore(app);
      // Analytics is strictly optional — commonly blocked, never worth failing over.
      try {
        const aMod = await import(`${SDK_BASE}/firebase-analytics.js`);
        _analytics = aMod.getAnalytics(app);
        _logEvent  = aMod.logEvent;
      } catch (_) { /* blocked by adblocker / offline */ }
      return { fs, db };
    } catch (_) {
      return null; // SDK unreachable — leaderboards degrade, the game itself is unaffected
    }
  })();
  return _loadPromise;
}

// Kick the download off eagerly (non-blocking) so analytics session tracking
// starts near page open and the SDK is usually warm before the first
// leaderboard call. Failure here is silently absorbed by loadFirebase().
loadFirebase();

/**
 * Logs a Firebase Analytics event. Fire-and-forget: queues behind the SDK
 * load and silently no-ops if Analytics is blocked or the SDK never loads.
 * @param {string} eventName
 * @param {object} [params]
 */
export function logAnalyticsEvent(eventName, params = {}) {
  loadFirebase().then(() => {
    try { if (_analytics && _logEvent) _logEvent(_analytics, eventName, params); } catch (_) {}
  });
}

async function requireFirestore() {
  if (!isFirebaseConfigured()) throw new Error('Firebase not configured — see js/utils/firebase.js setup instructions');
  const loaded = await loadFirebase();
  if (!loaded) throw new Error('Leaderboard unavailable — check your connection.');
  return loaded;
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
  const wins = entry.wins ?? 0;
  if (wins < 0 || wins > 82) throw new Error('Invalid wins value');
  const { fs, db } = await requireFirestore();
  const col = fs.collection(db, 'leaderboard');
  const ref = await fs.addDoc(col, {
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
    timestamp:    fs.serverTimestamp(),
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
  const { fs, db } = await requireFirestore();
  const col = fs.collection(db, 'leaderboard');

  let q;
  if (filter === 'alltime') {
    q = fs.query(col, fs.orderBy('wins', 'desc'), fs.limit(10));
  } else {
    const msInDay = 24 * 60 * 60 * 1000;
    // Filter on `timestamp` (server-stamped via serverTimestamp()), not the
    // client-reported `timestampMs` — this keeps the window authoritative
    // regardless of the reading device's own clock.
    const cutoff = fs.Timestamp.fromMillis(Date.now() - (filter === '24h' ? msInDay : 7 * msInDay));
    // Same-field where + orderBy — no composite index required. The window is
    // fetched newest-first then re-sorted by wins client-side, so the limit
    // bounds how many recent entries the top-10 is drawn from; 250 keeps a
    // busy week from dropping high-win runs off the board.
    q = fs.query(col, fs.where('timestamp', '>', cutoff), fs.orderBy('timestamp', 'desc'), fs.limit(250));
  }

  const snap    = await fs.getDocs(q);
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
  const wins = entry.wins ?? 0;
  if (wins < 0 || wins > 82) throw new Error('Invalid wins value');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date || '')) throw new Error('Invalid date');
  const { fs, db } = await requireFirestore();
  const col = fs.collection(db, 'dailyLeaderboard');
  const ref = await fs.addDoc(col, {
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
    timestamp:    fs.serverTimestamp(),
  });
  return ref.id;
}

/**
 * Fetches up to 10 Daily Challenge entries for one UTC day, sorted by wins.
 *
 * Anti-poisoning: entries whose SERVER write-time doesn't fall inside their
 * claimed UTC day (plus a 3h grace window for runs drafted before midnight
 * and submitted just after) are discarded. A spoofer can claim any `date`
 * string, but serverTimestamp() is set by Firestore and can't be forged —
 * so documents written today for a future day never surface on that board.
 *
 * @param {string} date  'YYYY-MM-DD' — see state.js getUtcDateString()
 * @returns {Promise<object[]>}
 */
export async function fetchDailyLeaderboard(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('Invalid date');
  const { fs, db } = await requireFirestore();
  const col = fs.collection(db, 'dailyLeaderboard');
  // Single equality filter, no orderBy — needs no composite index. Sorted by
  // wins client-side, same pattern fetchLeaderboard() uses for 24h/weekly.
  // 150 caps the read cost per open (Firestore bills per document read).
  const q    = fs.query(col, fs.where('date', '==', date), fs.limit(150));
  const snap = await fs.getDocs(q);

  const dayStart = Date.parse(`${date}T00:00:00Z`);
  const dayEnd   = dayStart + (24 + 3) * 60 * 60 * 1000; // +3h submit grace
  const entries  = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(e => {
      const ms = e.timestamp?.toMillis?.();
      return ms != null && ms >= dayStart && ms <= dayEnd;
    });
  entries.sort((a, b) => b.wins - a.wins || (a.timestampMs ?? 0) - (b.timestampMs ?? 0));
  return entries.slice(0, 10);
}
