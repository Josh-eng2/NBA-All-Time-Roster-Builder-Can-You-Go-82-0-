import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Replace only external transport/auth imports. Every storage and merge
// operation below executes the shipped cloudSave.js implementation.
const hook = registerHooks({ load(url, context, next) {
  if (url.endsWith('/js/utils/auth.js')) return { format: 'module', shortCircuit: true, source: `
    export const currentUserSync = () => globalThis.saveTest.user;
    export const accountsEnabled = () => globalThis.saveTest.enabled;
  ` };
  if (url.endsWith('/js/utils/firebase.js')) return { format: 'module', shortCircuit: true, source: `
    export const fetchUserSave = (...a) => globalThis.saveTest.fetch(...a);
    export const transactUserSave = (...a) => globalThis.saveTest.transact(...a);
    export const deleteUserSave = (...a) => globalThis.saveTest.delete(...a);
  ` };
  return next(url, context);
} });
const cloud = await import('../js/utils/cloudSave.js');
hook.deregister();
const snapshot = (xp = 0, id = '') => ({ ...cloud.emptySave(), save: { ...cloud.emptySave().save, progress: { xp, rewards: [] }, legends: id ? [id] : [] } });
function setup() {
  cloud.invalidateSync();
  const store = new Map([['nba820_owner', 'A'], ['nba820_progress', JSON.stringify({ xp: 1200 })], ['nba820_legends', '["A-legend"]']]);
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
  globalThis.saveTest = { user: { uid: 'A' }, enabled: true, fetch: async () => ({ ok: true, exists: false }),
    transact: async (uid, merge) => { saveTest.written = merge(null); return { ok: true }; }, delete: async () => ({ ok: true }) };
  return store;
}
test('quota failure while parking leaves all live keys and ownership untouched', () => {
  const store = setup(), before = [...store];
  const write = localStorage.setItem;
  localStorage.setItem = (k, v) => { if (k === 'nba820_handoff') throw new Error('quota'); write(k, v); };
  assert.throws(() => cloud.applyRemoteToDevice('B', snapshot(40, 'B-legend')), /handoff-backup-failed/);
  assert.deepEqual([...store], before);
});
test('an ownership write failure cannot leave private progress unclaimed', () => {
  const store = setup(); store.delete('nba820_owner');
  const before = [...store], write = localStorage.setItem;
  localStorage.setItem = (k, v) => { if (k === 'nba820_owner') throw new Error('quota'); write(k, v); };
  assert.throws(() => cloud.applyRemoteToDevice('A', snapshot(9000, 'private-A')), /owner-write-failed/);
  assert.deepEqual([...store], before);
});
test('failed adoption rolls back from a verified journal', () => {
  const store = setup(), before = [...store];
  const write = localStorage.setItem;
  let fail = true;
  localStorage.setItem = (k, v) => { if (fail && k === 'nba820_progress') { fail = false; throw new Error('quota'); } write(k, v); };
  assert.throws(() => cloud.applyRemoteToDevice('B', snapshot(40)), /handoff-restore-failed/);
  for (const [k, v] of before) assert.equal(store.get(k), v, k);
  assert.equal(store.has('nba820_handoff_pending'), false);
});
test('A to B to A to C to A restores each owner without cross-account merges', () => {
  const store = setup();
  cloud.applyRemoteToDevice('B', snapshot(40, 'B-legend'));
  cloud.applyRemoteToDevice('A', null);
  assert.equal(cloud.readLocalSave().snapshot.save.progress.xp, 1200);
  cloud.applyRemoteToDevice('C', snapshot(70, 'C-legend'));
  cloud.applyRemoteToDevice('A', null);
  assert.deepEqual(cloud.readLocalSave().snapshot.save.legends, ['A-legend']);
  assert.deepEqual(Object.keys(JSON.parse(store.get('nba820_handoff')).accounts).sort(), ['A', 'B', 'C']);
});
test('cloud deletion alone never releases a still-existing account', async () => {
  const store = setup();
  assert.equal((await cloud.deleteCloudSave('A')).ok, true);
  cloud.releaseDeletedAccount('A');
  assert.equal(store.get('nba820_owner'), 'A');
  saveTest.user = null;
  cloud.releaseDeletedAccount('A');
  assert.equal(store.has('nba820_owner'), false);
});

test('a cloud delete completing after an account switch cannot continue account deletion', async () => {
  setup();
  let finish, called;
  saveTest.delete = uid => { called = uid; return new Promise(resolve => { finish = resolve; }); };
  const deleting = cloud.deleteCloudSave('A');
  await Promise.resolve();
  assert.equal(called, 'A');
  saveTest.user = { uid: 'B' };
  cloud.invalidateSync();
  finish({ ok: true });
  assert.equal((await deleting).code, 'stale-session');
});

test('a queued delete checks identity before it touches cloud storage', async () => {
  setup();
  let finish;
  saveTest.fetch = () => new Promise(resolve => { finish = resolve; });
  const pending = cloud.syncOnSignIn('A');
  await Promise.resolve();
  saveTest.delete = () => assert.fail('must not delete after account switch');
  const deleting = cloud.deleteCloudSave('A');
  saveTest.user = { uid: 'B' };
  cloud.invalidateSync();
  finish({ ok: true, exists: false });
  await pending;
  assert.equal((await deleting).code, 'stale-session');
});
test('a delayed fetch after account change cannot adopt or upload its result', async () => {
  const store = setup(), before = [...store];
  let resolveFetch;
  saveTest.fetch = () => new Promise(resolve => { resolveFetch = resolve; });
  const syncing = cloud.syncOnSignIn('A');
  await Promise.resolve();
  saveTest.user = { uid: 'B' }; cloud.invalidateSync();
  resolveFetch({ ok: true, exists: true, data: snapshot(9000, 'remote-A') });
  assert.equal((await syncing).code, 'stale-session');
  assert.deepEqual([...store], before);
  assert.equal(saveTest.written, undefined);
});
test('transaction retries merge the latest remote and current local earnings', async () => {
  setup();
  saveTest.transact = async (uid, merge) => {
    const first = merge(snapshot(0, 'remote-1'));
    assert.ok(first.save.legends.includes('A-legend'));
    localStorage.setItem('nba820_legends', '["A-legend","new-local"]');
    const retried = merge(snapshot(0, 'remote-2'));
    assert.deepEqual(retried.save.legends.sort(), ['A-legend', 'new-local', 'remote-2']);
    return { ok: true };
  };
  assert.equal((await cloud.syncOnSignIn('A')).ok, true);
});
test('corruption between local adoption and transaction retry blocks upload', async () => {
  setup();
  saveTest.transact = async (uid, merge) => { localStorage.setItem('nba820_progress', '{broken'); return merge(null); };
  assert.equal((await cloud.syncOnSignIn('A')).code, 'local-incomplete');
});
test('a future schema cannot replace the local snapshot', () => {
  const store = setup(), before = [...store];
  assert.throws(() => cloud.applyRemoteToDevice('A', { ...snapshot(), schemaVersion: 900 }), /unsupported-schema/);
  assert.deepEqual([...store], before);
});
