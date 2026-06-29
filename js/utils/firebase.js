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
 *                          && request.resource.data.teamName is string
 *                          && request.resource.data.teamName.size() <= 30;
 *            allow update, delete: if false;
 *          }
 *        }
 *      }
 *
 * 4. In Firebase Console → Project Settings → Your apps → Add web app.
 *    Copy the firebaseConfig object and paste the values into FIREBASE_CONFIG below.
 * 5. Deploy your site — scores will start flowing in automatically.
 *
 * Exports:
 *   isFirebaseConfigured()   — true only when real credentials are present
 *   submitGlobalScore(entry) — writes one document to 'leaderboard'
 *   fetchLeaderboard(filter) — reads top entries; filter: 'alltime' | '24h' | 'weekly'
 */

import { initializeApp, getApps }   from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import {
  getFirestore, collection, addDoc, getDocs,
  query, orderBy, limit, where, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
import { getAnalytics, logEvent } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-analytics.js';

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

function getApp() {
  const existing = getApps();
  return existing.length ? existing[0] : initializeApp(FIREBASE_CONFIG);
}

function getDb() {
  if (_db) return _db;
  _db = getFirestore(getApp());
  return _db;
}

function getAnalyticsInstance() {
  if (_analytics) return _analytics;
  try { _analytics = getAnalytics(getApp()); } catch (_) { /* blocked by adblocker */ }
  return _analytics;
}

/**
 * Logs a Firebase Analytics event. Silently no-ops if Analytics is blocked.
 * @param {string} eventName
 * @param {object} [params]
 */
export function logAnalyticsEvent(eventName, params = {}) {
  if (!isFirebaseConfigured()) return;
  try {
    const a = getAnalyticsInstance();
    if (a) logEvent(a, eventName, params);
  } catch (_) { /* silently ignore */ }
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
    starters:     entry.starters    ?? '',
    timestampMs:  entry.timestampMs ?? 0,
    timestamp:    serverTimestamp(),
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
    const cutoff  = Date.now() - (filter === '24h' ? msInDay : 7 * msInDay);
    // Same-field where + orderBy — no composite index required
    q = query(col, where('timestampMs', '>', cutoff), orderBy('timestampMs', 'desc'), limit(100));
  }

  const snap    = await getDocs(q);
  const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (filter !== 'alltime') entries.sort((a, b) => b.wins - a.wins);
  return entries.slice(0, 10);
}
