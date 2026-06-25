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

// ── Firebase project config — FILL THESE IN ───────────────────────────────────
// Get from: Firebase Console → Project Settings → Your apps → Web → SDK config
const FIREBASE_CONFIG = {
  apiKey:            'YOUR_API_KEY',
  authDomain:        'YOUR_PROJECT_ID.firebaseapp.com',
  projectId:         'YOUR_PROJECT_ID',
  storageBucket:     'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId:             'YOUR_APP_ID',
};

// ── Configuration check ───────────────────────────────────────────────────────

/** Returns true only when FIREBASE_CONFIG has been filled in with real values. */
export function isFirebaseConfigured() {
  return FIREBASE_CONFIG.apiKey    !== 'YOUR_API_KEY'
      && FIREBASE_CONFIG.projectId !== 'YOUR_PROJECT_ID';
}

// ── Singleton Firestore instance ──────────────────────────────────────────────

let _db = null;

function getDb() {
  if (_db) return _db;
  const existing = getApps();
  const app = existing.length ? existing[0] : initializeApp(FIREBASE_CONFIG);
  _db = getFirestore(app);
  return _db;
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
    q = query(col, orderBy('wins', 'desc'), limit(50));
  } else {
    const msInDay = 24 * 60 * 60 * 1000;
    const cutoff  = Date.now() - (filter === '24h' ? msInDay : 7 * msInDay);
    // Same-field where + orderBy — no composite index required
    q = query(col, where('timestampMs', '>', cutoff), orderBy('timestampMs', 'desc'), limit(200));
  }

  const snap    = await getDocs(q);
  const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (filter !== 'alltime') entries.sort((a, b) => b.wins - a.wins);
  return entries.slice(0, 50);
}
