import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { installDom, makeEl, registerEl } from './dom-stub.mjs';
installDom();
const originalLookup = document.getElementById;
document.getElementById = id => originalLookup(id) || document.body.children.find(el => el.id === id) || null;
const hook = registerHooks({ load(url, context, next) {
  if (url.endsWith('/js/utils/firebase.js')) return { format: 'module', shortCircuit: true,
    source: `export * from '${url}?real'; export const fetchLeaderboard = tab => globalThis.leaderboardFetch(tab);` };
  return next(url, context);
} });
const storage = await import('../js/utils/storage.js');
hook.deregister();
const tick = () => new Promise(resolve => setImmediate(resolve));
const entry = name => [{ teamName: name, wins: 70, losses: 12, chemScore: 70 }];
test('a slow old tab cannot replace the selected tab or a reopened leaderboard', async () => {
  const pending = [];
  globalThis.leaderboardFetch = tab => new Promise(resolve => pending.push({ tab, resolve }));
  const table = registerEl('global-lb-table', makeEl());
  storage.showGlobalLeaderboardModal('weekly');
  window.switchGlobalLbTab('24h');
  pending[1].resolve(entry('Today')); await tick();
  pending[0].resolve(entry('Stale week')); await tick();
  assert.match(table.innerHTML, /Today/); assert.doesNotMatch(table.innerHTML, /Stale week/);
  window.switchGlobalLbTab('weekly');
  storage.closeGlobalLeaderboardModal();
  storage.showGlobalLeaderboardModal('alltime');
  pending[3].resolve(entry('Reopened')); await tick();
  pending[2].resolve(entry('Closed instance')); await tick();
  assert.match(table.innerHTML, /Reopened/); assert.doesNotMatch(table.innerHTML, /Closed instance/);
  const modal = document.getElementById('global-lb-modal-root');
  let focused = false;
  const first = { focus: () => { focused = true; } }, newlyLoadedRow = {};
  modal.querySelectorAll = () => [first, newlyLoadedRow];
  document.activeElement = newlyLoadedRow;
  modal.__fire('keydown', { key: 'Tab', preventDefault() {} });
  assert.ok(focused, 'focus trap must include rows inserted after the modal opened');
  storage.closeGlobalLeaderboardModal();
});
test('reading Daily statistics does not advance the save timestamp or recount a day', () => {
  const values = new Map();
  globalThis.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) };
  const day = new Date().toISOString().slice(0, 10);
  storage.markDailyPlayed({ date: day, wins: 70, losses: 12, passed: true });
  storage.getDailyStats(); // permits one legacy-shape migration
  const before = [...values];
  assert.equal(storage.getDailyStats().played, 1);
  assert.equal(storage.getDailyStats().played, 1);
  assert.deepEqual([...values], before);
  storage.markDailyPlayed({ date: day, wins: 0, losses: 82, passed: false });
  assert.equal(storage.getDailyStatus().result.wins, 70, 'first completion owns the date');
  assert.deepEqual([...values], before);
});
