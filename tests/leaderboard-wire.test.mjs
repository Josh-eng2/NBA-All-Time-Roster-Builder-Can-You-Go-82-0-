/**
 * The deployed Firestore rules (documented at the top of js/utils/firebase.js)
 * validate every field and reject the WHOLE document on any violation, so an
 * out-of-range value doesn't degrade an entry — it loses the submission.
 *
 * Regression guard for exactly that: after the player-popularity ceiling was
 * raised (140 -> 350), `avgPopularity` and `fansM` computed by the simulation
 * routinely ran past the rules' 100 / 50 bounds, and the great majority of
 * global-leaderboard submissions were being refused server-side.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, flattenDb, bestFive, mod } from './helpers.mjs';

const { buildGlobalDoc, buildDailyDoc, sdkFromSettled } = await import(mod('js/utils/firebase.js'));

// Bounds transcribed from the rules block in js/utils/firebase.js. If the
// deployed rules ever change, change them here in the same commit.
const GLOBAL_BOUNDS = {
  wins:          [0, 82],
  losses:        [0, 82],
  chemScore:     [0, 100],
  avgPopularity: [0, 100],
  fansM:         [0, 50],
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
    chemScore: 140, avgPopularity: 305, fansM: 324,
    starters: 'd'.repeat(300), timestampMs: 1,
  });
  assertWithinRules(doc, 'clamped');
  assert.equal(doc.avgPopularity, 100);
  assert.equal(doc.fansM, 50);
  assert.equal(doc.chemScore, 100);
  assert.equal(doc.champion, true);
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

  // Sanity check that this test has teeth: the raw simulation output really
  // does run past the rule bounds, which is the bug the clamp exists for.
  const superTeam = g.sim.simulateSeason(bestFive(all), 'jackson');
  assert.ok(superTeam.avgPopularity > 100,
    'expected the superteam to exceed the avgPopularity rule bound pre-clamp');
  assert.ok(superTeam.fansM > 50,
    'expected the superteam to exceed the fansM rule bound pre-clamp');

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
