// Optional integration check. TEST_TOOLS_DIR points to external test-only
// dependencies; the shipped game still has no package.json or install step.
import { createRequire, registerHooks } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const host = process.env.FIRESTORE_EMULATOR_HOST;
if (!host || !/^(127\.0\.0\.1|localhost):\d+$/.test(host)) throw new Error('A local Firestore emulator is required; live endpoints are forbidden');
const require = createRequire(resolve(process.env.TEST_TOOLS_DIR || '', 'package.json'));
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const sdk = require('firebase/firestore');
const { doc, setDoc, getDoc, deleteDoc, serverTimestamp, runTransaction, writeBatch, Timestamp } = sdk;
const { buildGlobalDoc, buildDailyDoc } = await import('../js/utils/firebase.js');
const { emptySave, mergeSaves } = await import('../js/utils/cloudSave.js');
const { loadGame } = await import('./helpers.mjs');
const game = await loadGame();
const env = await initializeTestEnvironment({ projectId: 'demo-820-review', firestore: { host: host.split(':')[0], port: Number(host.split(':')[1]), rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') } });
let checks = 0;
try {
  await env.clearFirestore();
  const publicDb = env.unauthenticatedContext().firestore();
  for (const [collection, build] of [['leaderboard', buildGlobalDoc], ['dailyLeaderboard', buildDailyDoc]]) {
    const valid = { ...build({ date: '2026-09-08', wins: 70, losses: 12, teamName: 'Test', challengeId: 'win-65', passed: true }), timestamp: serverTimestamp() };
    const write = value => setDoc(doc(publicDb, collection, `case-${++checks}`), value);
    await assertSucceeds(write(valid));
    for (const patch of [{ wins: 70.5, losses: 11.5 }, { wins: 82, losses: 82 }, { timestamp: new Date('2099-01-01') }, { payload: 'unexpected' }, { uid: 'spoofed' }]) await assertFails(write({ ...valid, ...patch }));
    if (collection === 'dailyLeaderboard') {
      for (const patch of [{ score: 1020 }, { date: '2026-99-99' }, { challengeId: 'invented:boards-v2' }]) await assertFails(write({ ...valid, ...patch }));
    }
    const existing = doc(publicDb, collection, 'immutable');
    await assertSucceeds(setDoc(existing, valid));
    await assertFails(setDoc(existing, valid));
    await assertFails(deleteDoc(existing)); checks += 3;
  }
  const a = env.authenticatedContext('A').firestore(), b = env.authenticatedContext('B').firestore();
  const ref = doc(a, 'users', 'A');
  const base = emptySave();
  await assertSucceeds(setDoc(ref, base));
  await assertFails(getDoc(doc(b, 'users', 'A')));
  await assertFails(setDoc(doc(b, 'users', 'A'), base));
  await assertFails(setDoc(ref, { ...base, schemaVersion: 1 }));
  const update = (db, id, amount) => runTransaction(db, async tx => {
    const r = doc(db, 'users', 'A'), previous = (await tx.get(r)).data();
    const own = emptySave(); own.save.progress = { base: 0, credits: { [id]: amount }, rewards: [] }; own.save.legends = [id];
    tx.set(r, mergeSaves(previous, own));
  });
  const secondDevice = env.authenticatedContext('A').firestore();
  await Promise.all([update(a, 'phone', 400), update(secondDevice, 'laptop', 200)]);
  const saved = (await getDoc(ref)).data();
  assert.equal(saved.save.progress.xp, 600);
  assert.deepEqual(saved.save.legends.sort(), ['laptop', 'phone']);
  await assertSucceeds(deleteDoc(ref)); checks += 7;
  // Execute the shipped lazy-SDK transport against this emulator. Only the
  // import location/app factory are replaced; query/paging/transaction code
  // runs unchanged and cannot reach a live project.
  globalThis.emulatorSdk = {
    app: { initializeApp: () => ({}), getApps: () => [] },
    firestore: { ...sdk, initializeFirestore: () => a, getFirestore: () => a },
    analytics: { getAnalytics: () => null, logEvent: () => {}, isSupported: async () => false },
    'app-check': { initializeAppCheck: () => null, ReCaptchaV3Provider: class {} },
  };
  const hook = registerHooks({
    resolve(specifier, context, next) {
      const name = specifier.match(/^https:\/\/www\.gstatic\.com\/firebasejs\/.+\/firebase-([a-z-]+)\.js$/)?.[1];
      if (name) return { url: `test-820-sdk:${name}`, shortCircuit: true };
      return next(specifier, context);
    },
    load(url, context, next) {
      const name = url.startsWith('test-820-sdk:') ? url.slice('test-820-sdk:'.length) : null;
      if (!name) return next(url, context);
      return { format: 'module', shortCircuit: true, source: Object.keys(emulatorSdk[name]).filter(key => /^[A-Za-z_$][\w$]*$/.test(key) && key !== 'default')
        .map(key => `export const ${key} = globalThis.emulatorSdk[${JSON.stringify(name)}][${JSON.stringify(key)}];`).join('\n') };
    },
  });
  try {
    await env.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      for (let start = 0; start < 600; start += 200) {
        const batch = writeBatch(db);
        for (let i = start; i < start + 200; i++) {
          const wins = i === 0 ? 82 : 40;
          const timestamp = Timestamp.fromMillis(Date.now() - (600 - i) * 1000);
          batch.set(doc(db, 'leaderboard', `page-${i}`), { ...buildGlobalDoc({ wins, losses: 82 - wins, teamName: 'Paged' }), timestamp });
          batch.set(doc(db, 'dailyLeaderboard', `page-${String(i).padStart(4, '0')}`), { ...buildDailyDoc({ date: '2026-09-10', wins, losses: 82 - wins, teamName: 'Paged', passed: false, challengeId: game.challenge.getDailyChallenge('2026-09-10').id }), timestamp });
        }
        await batch.commit();
      }
    });
    const transport = await import('../js/utils/firebase.js?emulator-test');
    const weekly = await transport.fetchLeaderboard('weekly');
    assert.equal(weekly[0].wins, 82, 'older winner was lost beyond the first 250 recent entries');
    const daily = await transport.fetchDailyLeaderboard('2026-09-10');
    assert.equal(daily[0].wins, 82);
    assert.equal((await transport.fetchDailyCommunityStats('2026-09-10')).attempts, 600, 'daily population was silently capped');
    assert.equal((await transport.transactUserSave('A', previous => mergeSaves(previous, emptySave()))).ok, true);
    assert.equal((await getDoc(ref)).data().schemaVersion, 2); checks += 5;
  } finally { hook.deregister(); }
  console.log(`PASS: ${checks} emulator rule/transaction checks (local demo project only)`);
} finally { await env.cleanup(); }
