import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCrazyGamesEnvironment } from '../js/utils/crazygames.js';

test('standalone startup does not wait for an absent optional SDK', async () => {
  const win = {}; win.self = win; win.top = win;
  assert.equal(await resolveCrazyGamesEnvironment(win), 'disabled');
});

test('portal startup accepts an async SDK before its deadline', async () => {
  const win = { self: {}, top: {} };
  const timer = setTimeout(() => { win.CrazyGames = { SDK: { getEnvironment: async () => 'crazygames' } }; }, 5);
  try { assert.equal(await resolveCrazyGamesEnvironment(win, 200), 'crazygames'); }
  finally { clearTimeout(timer); }
});

test('missing and never-resolving portal SDKs have a bounded fallback', async () => {
  for (const win of [{ self: {}, top: {} }, { CrazyGames: { SDK: { getEnvironment: () => new Promise(() => {}) } } }]) {
    assert.equal(await resolveCrazyGamesEnvironment(win, 30), 'disabled');
  }
});

test('a late portal data module cannot change storage after initialization', async () => {
  globalThis.window = { CrazyGames: { SDK: { getEnvironment: async () => 'crazygames' } } };
  const data = new Map();
  globalThis.localStorage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  const adapter = await import('../js/utils/crazygames.js?late-data');
  await adapter.initCrazyGamesData();
  window.CrazyGames.SDK.data = { getItem: () => 'wrong account', setItem: () => { throw Error('provider changed'); } };
  await adapter.initCrazyGamesData();
  assert.equal(adapter.cgSetItem('fixture', 'local'), true);
  assert.equal(adapter.cgGetItem('fixture'), 'local');
  delete globalThis.window; delete globalThis.localStorage;
});
