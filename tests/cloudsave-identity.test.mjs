/**
 * The merge's IDENTITY, and the device-ownership rule around it.
 *
 * Both defects these pin were invisible to tests/cloudSave.test.mjs, and for
 * the same reason: that file builds both sides of a merge in JavaScript, from
 * the same factory, so the two sides always agreed on key order and on which
 * account they came from. The interesting cases only exist at the boundary
 * this file models — a save that has been through Firestore, and a device that
 * has been through more than one account.
 *
 *   1. Identity. mergeSaves() used to de-duplicate on JSON.stringify, which is
 *      key-ORDER sensitive. A local entry keeps the insertion order of the
 *      object literal in utils/storage.js; the same entry fetched back from
 *      Firestore comes out of a protobuf map with its keys sorted. So one run
 *      counted as two, every sync added another copy, and once past the caps
 *      (20 leaderboard rows, 12 trophies) the copies evicted real runs.
 *
 *   2. Ownership. syncOnSignIn() merged whatever it found on the device into
 *      whichever account signed in. On a shared laptop that moved player A's
 *      trophies, legends and XP into player B's account — additively, so
 *      nothing could ever separate them again.
 */
import test   from 'node:test';
import assert from 'node:assert/strict';

const {
  emptySave, mergeSaves, canonicalJson, readLocalSave, applyRemoteToDevice,
  deleteCloudSave, pushLocalSave,
} = await import(new URL('../js/utils/cloudSave.js', import.meta.url).href);

function installStorage(seed = {}) {
  const m = new Map(Object.entries(seed));
  globalThis.localStorage = {
    getItem(k) { return m.has(k) ? m.get(k) : null; },
    setItem(k, v) { m.set(k, String(v)); },
    removeItem(k) { m.delete(k); },
  };
  return m;
}

function snap(save = {}, deviceUpdatedAt = 1000) {
  const base = emptySave();
  return { ...base, deviceUpdatedAt, save: { ...base.save, ...save } };
}

/** The same object as Firestore hands it back: identical content, keys sorted. */
const asFetched = o => Object.fromEntries(
  Object.entries(o)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => [k, (v && typeof v === 'object' && !Array.isArray(v)) ? asFetched(v) : v]),
);

// ── Identity ──────────────────────────────────────────────────────────────────

test('canonicalJson ignores key order but nothing else', () => {
  assert.equal(canonicalJson({ a: 1, b: 2 }), canonicalJson({ b: 2, a: 1 }));
  assert.equal(canonicalJson({ o: { x: 1, y: 2 } }), canonicalJson({ o: { y: 2, x: 1 } }));

  // Order inside an array is meaning, not noise — a roster is not a set.
  assert.notEqual(canonicalJson([1, 2]), canonicalJson([2, 1]));
  // Values are still compared exactly. Nothing here rounds or coerces.
  assert.notEqual(canonicalJson({ w: 70 }), canonicalJson({ w: 71 }));
  assert.notEqual(canonicalJson({ w: 70 }), canonicalJson({ w: '70' }));
  assert.notEqual(canonicalJson({ w: 0 }), canonicalJson({ w: null }));

  // A cyclic entry cannot have come from storage or Firestore; it must throw
  // rather than recurse, and mergeList's catch drops it.
  const cyclic = { a: 1 };
  cyclic.self = cyclic;
  assert.throws(() => canonicalJson(cyclic));
});

test('a leaderboard entry survives a Firestore round trip without duplicating', () => {
  const entry = {
    date: 'Sep 1, 2026', teamName: 'Dream Team', wins: 70, losses: 12,
    starters: 'A, B, C, D, E', avgPopularity: 180,
    leaders: { pts: { name: 'A', val: 30.1 }, reb: null },
  };
  const fetched = asFetched(entry);

  // Precondition: this test is worthless if the two happen to be byte-equal.
  assert.notEqual(JSON.stringify(entry), JSON.stringify(fetched),
    'the fixture no longer models a key-order difference');

  const out = mergeSaves(snap({ leaderboard: [entry] }), snap({ leaderboard: [fetched] }));
  assert.equal(out.save.leaderboard.length, 1, 'one run counted as two');
});

test('a trophy survives a Firestore round trip without duplicating', () => {
  const t = {
    date: 'Sep 1, 2026', coachName: 'Phil Jackson', coachSystem: 'Triangle Offense',
    wins: 82, losses: 0, chemScore: 96, starters: 'A, B, C, D, E',
  };
  const out = mergeSaves(snap({ trophies: [t] }), snap({ trophies: [asFetched(t)] }));
  assert.equal(out.save.trophies.length, 1, 'one championship counted as two');
});

test('every mode board de-duplicates across a round trip too', () => {
  const rows = {
    defense:        { teamName: 'D', wins: 60, losses: 22, teamStocks: 14.2, date: 'Sep 1' },
    fans:           { teamName: 'F', score: 900, wins: 55, fansM: 210, avgPopularity: 190, passed: true, date: 'Sep 1' },
    'gm-ai':        { won: true, margin: 3, strength: 2.1, date: 'Sep 1' },
    'dynasty-duel': { opponentName: '96 Bulls', won: true, score: 900, weekKey: '2026-08-31', date: 'Sep 1' },
  };
  for (const [mode, row] of Object.entries(rows)) {
    const out = mergeSaves(
      snap({ modeBoards: { ...emptySave().save.modeBoards, [mode]: [row] } }),
      snap({ modeBoards: { ...emptySave().save.modeBoards, [mode]: [asFetched(row)] } }),
    );
    assert.equal(out.save.modeBoards[mode].length, 1, `${mode} board duplicated a run`);
  }
});

test('repeated sync cycles converge instead of growing', () => {
  // The shape of the real bug: merge, upload, fetch back re-ordered, merge
  // again. It used to add one row per cycle until the cap started evicting
  // genuine runs.
  const entry = { date: 'Sep 1, 2026', teamName: 'T', wins: 70, losses: 12, starters: 'A', avgPopularity: 100 };
  let local = snap({ leaderboard: [entry] });
  for (let i = 0; i < 10; i++) {
    const remote = snap({ leaderboard: local.save.leaderboard.map(asFetched) });
    local = mergeSaves(local, remote);
  }
  assert.equal(local.save.leaderboard.length, 1, `grew to ${local.save.leaderboard.length} copies`);
});

test('two genuinely different runs are still two runs', () => {
  const a = { date: 'Sep 1, 2026', teamName: 'T', wins: 70, losses: 12, starters: 'A', avgPopularity: 100 };
  const b = { ...a, wins: 71, losses: 11 };
  const out = mergeSaves(snap({ leaderboard: [a] }), snap({ leaderboard: [asFetched(b)] }));
  assert.equal(out.save.leaderboard.length, 2, 'a real run was fused away');
});

// ── Device ownership ──────────────────────────────────────────────────────────

const A_SAVE = {
  nba820_progress: JSON.stringify({ xp: 12000, rewards: ['title-scout'] }),
  nba820_legends:  JSON.stringify(['a1', 'a2', 'a3']),
  nba820_trophies: JSON.stringify([{ date: 'Sep 1, 2026', wins: 82, losses: 0 }]),
};

test('the first account to sign in claims the device it finds', () => {
  const m = installStorage({ ...A_SAVE });
  const { merged, handedOff } = applyRemoteToDevice('uid-A', null);

  assert.equal(handedOff, false, 'an unclaimed device is not a hand-off');
  assert.equal(merged.save.progress.xp, 12000, 'months of signed-out play must be claimed');
  assert.deepEqual(merged.save.legends, ['a1', 'a2', 'a3']);
  assert.equal(m.get('nba820_owner'), 'uid-A', 'ownership was not recorded');
});

test('a second account gets a hand-off, and takes none of the first one\'s progress', () => {
  const m = installStorage({ ...A_SAVE, nba820_owner: 'uid-A' });
  const remote = snap({ progress: { xp: 300, rewards: [] }, legends: ['b1'] });

  const { merged, handedOff } = applyRemoteToDevice('uid-B', remote);

  assert.equal(handedOff, true, 'a different account must not merge');
  assert.equal(merged.save.progress.xp, 300, "B's own save is what B gets");
  assert.deepEqual(merged.save.legends, ['b1'], "A's legends leaked into B's save");
  assert.equal(m.get('nba820_owner'), 'uid-B', 'the device did not change hands');

  // And nothing of A's is left in the keys the next upload would read.
  const after = readLocalSave().snapshot;
  assert.equal(after.save.progress.xp, 300);
  assert.equal(after.save.trophies.length, 0, "A's Trophy Room is still on B's device");
});

test('a hand-off parks the outgoing save rather than destroying it', () => {
  const m = installStorage({ ...A_SAVE, nba820_owner: 'uid-A' });
  applyRemoteToDevice('uid-B', null);

  const parked = JSON.parse(m.get('nba820_handoff'));
  assert.equal(parked.uid, 'uid-A');
  assert.equal(parked.snapshot.save.progress.xp, 12000, "A's progress was not recoverable");
  assert.deepEqual(parked.snapshot.save.legends, ['a1', 'a2', 'a3']);
});

test('a racing second hand-off cannot overwrite the parked save with an empty one', () => {
  // A sign-up fires syncOnSignIn twice — once from the modal, once from the
  // auth subscription — so both can read owner=A before either writes.
  const m = installStorage({ ...A_SAVE, nba820_owner: 'uid-A' });
  applyRemoteToDevice('uid-B', null);            // winner: parks A's real save
  applyRemoteToDevice('uid-B', null);            // loser: device is already empty

  const parked = JSON.parse(m.get('nba820_handoff'));
  assert.equal(parked.snapshot.save.progress.xp, 12000, 'the real backup was clobbered');
});

test('signing back in on your own device still merges', () => {
  const m = installStorage({ ...A_SAVE, nba820_owner: 'uid-A' });
  const remote = snap({ progress: { xp: 500, rewards: [] }, legends: ['a9'] });

  const { merged, handedOff } = applyRemoteToDevice('uid-A', remote);
  assert.equal(handedOff, false);
  assert.equal(merged.save.progress.xp, 12000, 'the owner lost their own progress');
  assert.deepEqual([...merged.save.legends].sort(), ['a1', 'a2', 'a3', 'a9']);
  assert.equal(m.get('nba820_owner'), 'uid-A');
});

test('an upload for an account that does not own this device is refused', async () => {
  installStorage({ ...A_SAVE, nba820_owner: 'uid-A' });
  const res = await pushLocalSave('uid-B');
  assert.equal(res.ok, false);
  assert.equal(res.code, 'device-owned-elsewhere',
    "B's gameplay upload would have carried A's save");
});

test('deleting an account releases the device so the next one can claim it', async () => {
  const m = installStorage({ ...A_SAVE, nba820_owner: 'uid-A' });
  await deleteCloudSave('uid-A');   // the network half fails under Node; the release must not
  assert.equal(m.get('nba820_owner'), undefined, 'ownership outlived the account');

  // The player is still here and was promised their local progress survives —
  // so their next account must claim it, not hand it off.
  const { merged, handedOff } = applyRemoteToDevice('uid-C', null);
  assert.equal(handedOff, false);
  assert.equal(merged.save.progress.xp, 12000);
});

test('ownership is device-local and never rides along in a synced snapshot', () => {
  installStorage({ ...A_SAVE, nba820_owner: 'uid-A', nba820_handoff: '{"uid":"uid-Z"}' });
  const wire = JSON.stringify(readLocalSave().snapshot);
  assert.ok(!wire.includes('uid-A'), 'the owner uid reached the wire shape');
  assert.ok(!wire.includes('uid-Z'), 'the parked hand-off reached the wire shape');
});
