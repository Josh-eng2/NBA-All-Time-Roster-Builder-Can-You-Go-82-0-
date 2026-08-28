/**
 * The deployed Firestore rules (documented at the top of js/utils/firebase.js)
 * validate every field and reject the WHOLE document on any violation, so an
 * out-of-range value doesn't degrade an entry — it loses the submission.
 *
 * Regression guard for exactly that: after the player-popularity ceiling was
 * raised (140 -> 350), `avgPopularity` and `fansM` computed by the simulation
 * routinely ran past the rules' original 100 / 50 bounds, and the great
 * majority of global-leaderboard submissions were being refused server-side.
 * The deployed rules were subsequently widened to 0-1000 / 0-2200 to actually
 * fit the real range — these bounds must always match whatever the
 * CURRENTLY deployed rules say, not the game's own believed data range.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, flattenDb, bestFive, mod } from './helpers.mjs';

const { buildGlobalDoc, buildDailyDoc, packStarterNames, sdkFromSettled, firestoreDbFor, withFirestoreErrorCode } = await import(mod('js/utils/firebase.js'));

// Bounds transcribed from the rules block in js/utils/firebase.js. If the
// deployed rules ever change, change them here in the same commit.
const GLOBAL_BOUNDS = {
  wins:          [0, 82],
  losses:        [0, 82],
  chemScore:     [0, 100],
  avgPopularity: [0, 1000],
  fansM:         [0, 2200],
};
const STRING_CAPS = { teamName: 30, coachId: 20, coachName: 30, era: 10, starters: 100 };

function assertWithinRules(doc, label) {
  for (const [field, [lo, hi]] of Object.entries(GLOBAL_BOUNDS)) {
    if (!(field in doc)) continue;
    assert.equal(typeof doc[field], 'number', `${label}: ${field} must be a number`);
    assert.ok(Number.isFinite(doc[field]), `${label}: ${field} must be finite`);
    assert.ok(doc[field] >= lo && doc[field] <= hi,
      `${label}: ${field} = ${doc[field]} is outside the rule range ${lo}..${hi}`);
  }
  for (const [field, cap] of Object.entries(STRING_CAPS)) {
    if (!(field in doc)) continue;
    assert.equal(typeof doc[field], 'string', `${label}: ${field} must be a string`);
    assert.ok(doc[field].length <= cap,
      `${label}: ${field} is ${doc[field].length} chars, rule caps it at ${cap}`);
  }
  assert.equal(typeof doc.champion, 'boolean', `${label}: champion must be a bool`);
  assert.equal(typeof doc.timestampMs, 'number', `${label}: timestampMs must be a number`);
}

test('buildGlobalDoc clamps out-of-range numbers into the rule ranges', () => {
  const doc = buildGlobalDoc({
    teamName: 'x'.repeat(60), wins: 82, losses: 0, champion: 1,
    coachId: 'a'.repeat(40), coachName: 'b'.repeat(60), era: 'c'.repeat(30),
    // Comfortably past the CURRENT rule ceilings (1000 / 2200), not just the
    // superseded 100 / 50 ones — a regression back to the tight bounds would
    // otherwise pass this test by accident (305/324 already clamp under both).
    chemScore: 140, avgPopularity: 1500, fansM: 2500,
    starters: 'd'.repeat(300), timestampMs: 1,
  });
  assertWithinRules(doc, 'clamped');
  assert.equal(doc.avgPopularity, 1000);
  assert.equal(doc.fansM, 2200);
  assert.equal(doc.chemScore, 100);
  assert.equal(doc.champion, true);
});

test('buildGlobalDoc does not clamp a real star-chasing roster\'s avgPopularity/fansM', () => {
  // The whole reason the rules were widened: a real 5-star roster's numbers
  // must reach the document as computed, not pinned to the old 100 / 50
  // ceiling the rules no longer impose.
  const doc = buildGlobalDoc({
    teamName: 'Dream Team', wins: 70, losses: 12, champion: true,
    coachId: 'jackson', coachName: 'Phil Jackson', era: 'all',
    chemScore: 90, avgPopularity: 280, fansM: 260,
    starters: 'A, B, C, D, E', timestampMs: Date.now(),
  });
  assertWithinRules(doc, 'star-chasing');
  assert.equal(doc.avgPopularity, 280, 'a real avgPopularity under 1000 must pass through unclamped');
  assert.equal(doc.fansM, 260, 'a real fansM under 2200 must pass through unclamped');
});

test('buildGlobalDoc omits non-numeric optional fields rather than sending NaN', () => {
  const doc = buildGlobalDoc({ wins: 10, losses: 72, avgPopularity: undefined, fansM: 'lots' });
  assert.equal('avgPopularity' in doc, false);
  assert.equal('fansM' in doc, false);
  assertWithinRules(doc, 'omitted');
});

test('every simulated roster produces a rules-valid global document', async () => {
  const g = await loadGame();
  const all = flattenDb(g.DB);
  const byPos = {};
  for (const p of all) (byPos[p.pos] ||= []).push(p);
  const pickOne = arr => arr[Math.floor(Math.random() * arr.length)];

  // A deliberate mix: the superteam (worst case for the popularity fields),
  // star-chasing rosters, and purely random ones.
  const rosters = [bestFive(all)];
  for (let i = 0; i < 60; i++) {
    rosters.push(['PG', 'SG', 'SF', 'PF', 'C'].map(pos => {
      const pool = Array.from({ length: 8 }, () => pickOne(byPos[pos]));
      return i % 2 ? pool.sort((a, b) => b.popularity - a.popularity)[0] : pool[0];
    }));
  }

  // The current 1000 / 2200 rule bounds are generous enough that realistic
  // simulation output — even the strongest legal roster in the database —
  // should never actually need clamping; buildGlobalDoc's clamp is a
  // defensive backstop for a future data change, not something normal play
  // is expected to hit (that WAS true under the original 100 / 50 bounds,
  // which is why they had to be widened — see the comment above
  // clampWireNumber() in js/utils/firebase.js). If this ever starts firing,
  // either the data ceiling moved again or the deployed rules got tighter —
  // both are worth knowing about explicitly rather than silently clamping.
  const superTeam = g.sim.simulateSeason(bestFive(all), 'jackson');
  assert.ok(superTeam.avgPopularity <= 1000 && superTeam.fansM <= 2200,
    `the strongest roster in the DB now exceeds the deployed rule bounds pre-clamp ` +
    `(avgPopularity ${superTeam.avgPopularity}, fansM ${superTeam.fansM}) — ` +
    `widen GLOBAL_BOUNDS/clampWireNumber AND the deployed Firestore rules together`);

  for (const starters of rosters) {
    const r = g.sim.simulateSeason(starters, 'jackson');
    const doc = buildGlobalDoc({
      teamName: 'Test', wins: r.wins, losses: r.losses, champion: false,
      coachId: 'jackson', coachName: 'Phil Jackson', era: 'all',
      chemScore: Math.round(r.chemScore ?? 0),
      avgPopularity: r.avgPopularity, fansM: r.fansM,
      starters: starters.map(p => p.name).join(', '),
      timestampMs: Date.now(),
    });
    assertWithinRules(doc, `roster ${starters.map(p => p.name).join('/')}`);
    assert.equal(doc.wins + doc.losses, 82, 'wins + losses must always be a full season');
  }
});

test('buildDailyDoc keeps score == wins*10 + pass bonus, the rule asserts equality', async () => {
  const g = await loadGame();
  for (const wins of [0, 1, 41, 55, 82]) {
    for (const passed of [true, false]) {
      const doc = buildDailyDoc({
        date: '2026-08-20', teamName: 'T', wins, losses: 82 - wins, passed,
        // A caller passing a stale/incorrect score must not be able to
        // produce a document the rule rejects.
        score: 99999, chemScore: 50, starters: 'a', timestampMs: 1,
      });
      assert.equal(doc.score, doc.wins * 10 + (doc.passed ? 200 : 0));
      assert.ok(doc.score >= 0 && doc.score <= 1020);
      assertWithinRules(doc, `daily ${wins}/${passed}`);
    }
  }
  // …and it matches logic/challenge.js dailyScore(), the other side of the pair.
  const ch = g.challenge.getDailyChallenge('2026-08-20');
  const S  = { result: { wins: 60 }, roster: {} };
  const expected = g.challenge.dailyScore(ch, S);
  const doc = buildDailyDoc({
    date: '2026-08-20', wins: 60, losses: 22,
    passed: g.challenge.evaluateObjective(ch, S).pass,
  });
  assert.equal(doc.score, expected, 'wire score and dailyScore() must agree');
});

// ── SDK assembly ────────────────────────────────────────────────────────────
// The leaderboard needs firebase-app + firebase-firestore. It does NOT need
// firebase-analytics — but that module is on essentially every ad/tracker
// blocklist while firestore is on almost none, and loading all three with
// Promise.all meant one blocked analytics file rejected the lot. The Firebase
// app was then never initialised, so getDb() returned null and EVERY score
// submission and leaderboard read failed with "Firebase unavailable" for a
// player whose Firestore access was working fine.

const ok   = value => ({ status: 'fulfilled', value });
const dead = () => ({ status: 'rejected', reason: new Error('ERR_BLOCKED_BY_CLIENT') });
const APP = { initializeApp() {}, getApps: () => [] };
const FS  = { getFirestore() {} };
const AN  = { getAnalytics() {}, logEvent() {} };

test('a blocked analytics module still leaves a usable Firestore SDK', () => {
  const sdk = sdkFromSettled([ok(APP), ok(FS), dead()]);
  assert.ok(sdk, 'an ad blocker on firebase-analytics.js must not disable the leaderboard');
  assert.equal(sdk.app, APP);
  assert.equal(sdk.firestore, FS);
  assert.equal(sdk.analytics, null, 'analytics must be reported absent, not faked');
});

test('the SDK is unusable only when a module the leaderboard needs is missing', () => {
  assert.equal(sdkFromSettled([dead(), ok(FS), ok(AN)]), null, 'no firebase-app means no app');
  assert.equal(sdkFromSettled([ok(APP), dead(), ok(AN)]), null, 'no firestore means no leaderboard');
  assert.equal(sdkFromSettled([dead(), dead(), dead()]), null, 'everything offline');
  assert.equal(sdkFromSettled([]), null, 'a malformed settle list is not a usable SDK');
  assert.equal(sdkFromSettled(), null, 'no arguments is not a usable SDK');
});

test('all three modules loading gives the full SDK', () => {
  const sdk = sdkFromSettled([ok(APP), ok(FS), ok(AN)]);
  assert.deepEqual(sdk, { app: APP, firestore: FS, analytics: AN });
});

// ── Firestore transport: auto-detect long polling ────────────────────────────
// Firestore's default web transport streams over a long-lived HTTP/2
// connection (WebChannel), which restrictive networks and proxies — corporate
// firewalls, some VPNs, buffering intermediaries — are prone to silently
// hanging or resetting instead of erroring cleanly. That surfaces as
// submitGlobalScore() eventually rejecting with a generic network error, and
// is reachable from neither a raw REST replay (bypasses the streaming layer
// entirely) nor from Node (a different transport) — which is why fixing the
// earlier "one blocked module takes the whole SDK down" bug was real but not
// sufficient on its own: a submission whose WRITE STREAM never gets through
// fails the exact same way whether or not the SDK finished loading.
//
// `experimentalAutoDetectLongPolling` is Firebase's own documented fix for
// this failure class: probe once, fall back to long-polling only if the
// streaming transport doesn't work. firestoreDbFor() is the pulled-out,
// pure-function shape of that choice — getDb() itself can never run under
// Node (its SDK functions only ever arrive via a dynamic `import('https://…')`,
// which Node's loader rejects outright), so this is what stands in for it.

test('the database is opened with auto-detect long polling when available', () => {
  const calls = [];
  const fakeApp = { name: 'app' };
  const fakeDb  = { tag: 'initialized' };
  const db = firestoreDbFor(fakeApp, {
    initializeFirestore: (app, settings) => { calls.push(['initializeFirestore', app, settings]); return fakeDb; },
    getFirestore:        (app)           => { calls.push(['getFirestore', app]); return fakeDb; },
  });
  assert.equal(db, fakeDb);
  assert.equal(calls.length, 1, 'getFirestore must not be called when initializeFirestore succeeded');
  assert.deepEqual(calls[0], ['initializeFirestore', fakeApp, { experimentalAutoDetectLongPolling: true }]);
});

test('a database already initialised elsewhere falls back to getFirestore', () => {
  // initializeFirestore() throws FAILED_PRECONDITION if this app's Firestore
  // instance already exists under different settings — e.g. a host page
  // embedding this game that initialised its own Firebase app first. Losing
  // the leaderboard entirely over a setting we can't apply would be worse
  // than dropping just the long-polling preference.
  const fakeDb = { tag: 'plain' };
  const db = firestoreDbFor({}, {
    initializeFirestore: () => { throw new Error('FAILED_PRECONDITION: already initialized'); },
    getFirestore:        () => fakeDb,
  });
  assert.equal(db, fakeDb, 'must fall back to getFirestore() rather than surface the throw');
});

test('a missing app or a missing SDK never throws', () => {
  assert.equal(firestoreDbFor(null, { initializeFirestore: () => ({}), getFirestore: () => ({}) }), null);
  assert.equal(firestoreDbFor({}, {}), null, 'neither function available');
  assert.equal(firestoreDbFor({}, { getFirestore: () => 'plain-only' }), 'plain-only',
    'an older SDK build without initializeFirestore must still work');
});

// ── Surfacing the real Firestore error code ─────────────────────────────────
// The UI showed the identical "Submission failed — check your connection" for
// a rules rejection and for a network-level transport failure alike, so there
// was no way to tell which one a report was describing without console access
// to the reporting player's own browser.

test('a Firestore rejection is rethrown with its error code folded in', async () => {
  const err = new Error('The operation could not be completed');
  err.code = 'unavailable';
  await assert.rejects(
    () => withFirestoreErrorCode(Promise.reject(err)),
    e => e.message.includes('unavailable') && e.message.includes('could not be completed'),
  );
});

test('a code already present in the message is not duplicated', async () => {
  const err = new Error('permission-denied: insufficient permissions');
  err.code = 'permission-denied';
  await assert.rejects(
    () => withFirestoreErrorCode(Promise.reject(err)),
    e => (e.message.match(/permission-denied/g) || []).length === 1,
  );
});

test('a rejection with no .code passes through unchanged', async () => {
  const err = new Error('plain failure');
  await assert.rejects(() => withFirestoreErrorCode(Promise.reject(err)), e => e.message === 'plain failure');
});

test('a fulfilled promise is unaffected', async () => {
  assert.equal(await withFirestoreErrorCode(Promise.resolve('ok')), 'ok');
});

// ── Starter names on the wire ────────────────────────────────────────────────
// The rules cap `starters` at 100 characters and the longest legal five is 109,
// so a blind slice cut the last name in half ("Kareem Abd"), which resolved to
// nobody: the leaderboard's team popup showed a mangled fifth starter and
// recomputed the roster's fans over four players instead of five.

const LONGEST_FIVE = [
  'Shai Gilgeous-Alexander', 'Sarunas Marciulionis', 'Quentin Richardson',
  'Giannis Antetokounmpo', 'Kareem Abdul-Jabbar',
];

test('the longest legal roster fits the wire cap with every name intact', () => {
  assert.ok(LONGEST_FIVE.join(', ').length > 100, 'this roster is supposed to overflow');

  const packed = packStarterNames(LONGEST_FIVE);
  assert.ok(packed.length <= 100, `packed to ${packed.length} chars, over the rule cap`);

  const parts = packed.split(', ');
  assert.equal(parts.length, 5, 'all five starters must survive');
  for (let i = 0; i < 5; i++) {
    const surname = LONGEST_FIVE[i].slice(LONGEST_FIVE[i].indexOf(' ') + 1);
    assert.ok(parts[i].endsWith(surname),
      `"${parts[i]}" lost or truncated the surname "${surname}"`);
  }
});

test('a roster that already fits is written unchanged', () => {
  const five = ['Stephen Curry', 'Michael Jordan', 'LeBron James', 'Tim Duncan', 'Bill Russell'];
  assert.equal(packStarterNames(five), five.join(', '));
});

test('every real drafted roster survives buildGlobalDoc without losing a name', async () => {
  const g     = await loadGame();
  const five  = bestFive(flattenDb(g.DB));
  const doc   = buildGlobalDoc({ wins: 70, losses: 12, starters: five.map(p => p.name).join(', ') });
  assert.ok(doc.starters.length <= STRING_CAPS.starters);
  assert.equal(doc.starters.split(', ').length, 5);

  // …and the pathological one too.
  const worst = buildGlobalDoc({ wins: 70, losses: 12, starters: LONGEST_FIVE.join(', ') });
  assert.ok(worst.starters.length <= STRING_CAPS.starters);
  assert.equal(worst.starters.split(', ').length, 5);
});
