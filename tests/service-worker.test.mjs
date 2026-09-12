import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
function worker({ broken = '', offline = false, status = 200, windows = [] } = {}) {
  const listeners = {}, stores = new Map();
  const key = value => new URL(value.url || value, 'https://game.test/').href;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async add(url) { if (url === broken) throw new Error('404'); store.set(key(url), new Response(url.endsWith('.html') ? '<html><head></head><body>game</body></html>' : url)); },
        async put(url, response) { store.set(key(url), response); },
        async match(url) { return store.get(key(url))?.clone(); },
        async delete(url) { return store.delete(key(url)); },
      };
    },
    keys: async () => [...stores.keys()],
    delete: async name => stores.delete(name),
  };
  let skipped = false;
  let claims = 0;
  const self = { location: new URL('https://game.test/sw.js'), registration: { scope: 'https://game.test/' },
    clients: { claim: async () => { claims++; }, matchAll: async () => windows },
    addEventListener: (name, fn) => { listeners[name] = fn; }, skipWaiting: async () => { skipped = true; } };
  vm.runInNewContext(source, { self, caches, URL, Response, fetch: async () => { if (offline) throw new Error('offline'); return new Response('network', { status }); } });
  const dispatch = (name, extra = {}) => {
    let result;
    listeners[name]({ ...extra, waitUntil: promise => { result = promise; }, respondWith: promise => { result = promise; } });
    return result;
  };
  return { dispatch, caches, stores, skipped: () => skipped, claims: () => claims };
}
const navigation = path => ({ method: 'GET', mode: 'navigate', url: 'https://game.test' + path, headers: new Headers({ accept: 'text/html' }) });

test('accepted update navigates every old scope tab without requiring page listeners', async () => {
  const navigated = [];
  const windows = ['https://game.test/#/daily', 'https://game.test/?ref=friend#/rematch', 'https://other.test/']
    .map(url => ({ url, navigate: async target => { navigated.push(target); } }));
  windows.unshift({ url: 'https://game.test/closed', navigate: async () => { throw new Error('closed'); } });
  const w = worker({ windows });
  await w.dispatch('install');
  await w.dispatch('message', { data: { type: 'ACTIVATE_UPDATE' } });
  await w.dispatch('activate');
  assert.deepEqual(navigated, windows.slice(1, 3).map(w => {
    const url = new URL(w.url); url.searchParams.set('__820_update', '820-v36'); return url.href;
  }));
  assert.equal(w.claims(), 1, 'navigation requires this worker to control the target');
});

test('ordinary activation does not navigate live pages without update consent', async () => {
  const w = worker({ windows: [{ url: 'https://game.test/', navigate: () => assert.fail('unsolicited reload') }] });
  await w.dispatch('install');
  await w.dispatch('activate');
  assert.equal(w.claims(), 1);
});

test('activation finishes before the requested navigations finish loading', async () => {
  let started = false;
  const w = worker({ windows: [{ url: 'https://game.test/', navigate: () => {
    started = true; return new Promise(() => {});
  } }] });
  await w.dispatch('install');
  await w.dispatch('message', { data: { type: 'ACTIVATE_UPDATE' } });
  await w.dispatch('activate');
  assert.equal(started, true);
});
test('a missing executable rejects installation without activating it', async () => {
  const w = worker({ broken: './js/main.js' });
  await assert.rejects(w.dispatch('install'), /404/);
  assert.equal(w.skipped(), false);
});
test('optional media failure permits installation; activation requires a message', async () => {
  const w = worker({ broken: './icons/icon-192.png' });
  await w.dispatch('install');
  assert.equal(w.skipped(), false);
  await w.dispatch('message', { data: { type: 'ACTIVATE_UPDATE' } });
  assert.equal(w.skipped(), true);
});
test('nested offline and server-error navigations receive a rooted shell', async () => {
  for (const options of [{ offline: true }, { status: 502 }]) {
    const w = worker(options); await w.dispatch('install');
    const response = await w.dispatch('fetch', { request: navigation('/teams/not-cached.html') });
    assert.equal(response.status, 200);
    assert.match(await response.text(), /<base href="https:\/\/game.test\/">/);
  }
});
test('another release cache cannot supply this release with modules', async () => {
  const w = worker();
  const other = await w.caches.open('precache-820-v999');
  await other.put('./js/main.js', new Response('wrong release'));
  await w.dispatch('install');
  const response = await w.dispatch('fetch', { request: { method: 'GET', url: 'https://game.test/js/main.js', headers: new Headers() } });
  assert.equal(await response.text(), './js/main.js');
});
