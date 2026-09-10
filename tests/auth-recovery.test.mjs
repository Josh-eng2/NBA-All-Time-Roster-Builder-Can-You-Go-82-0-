import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

test('subscribers survive an initial SDK failure and receive later sign-in/sign-out', async () => {
  globalThis.window = {}; window.self = window; window.top = window;
  globalThis.authRecovery = { app: null, auth: { currentUser: null }, observer: null };
  const hook = registerHooks({
    resolve(specifier, context, next) {
      if (specifier.startsWith('test-auth:')) return { url: specifier, shortCircuit: true };
      return next(specifier, context);
    },
    load(url, context, next) {
      let source;
      if (url.endsWith('/js/utils/firebase.js')) source = `export const SDK_BASE = 'test-auth:root'; export const getFirebaseApp = async () => globalThis.authRecovery.app;`;
      if (url.endsWith('/js/utils/remoteConfig.js')) source = `export const configValue = () => true;`;
      if (url.startsWith('test-auth:')) source = `export const getAuth = () => globalThis.authRecovery.auth;
        export const onAuthStateChanged = (auth, callback) => { globalThis.authRecovery.observer = callback; callback(auth.currentUser); return () => {}; };`;
      return source ? { format: 'module', shortCircuit: true, source } : next(url, context);
    },
  });
  const now = Date.now;
  try {
    const auth = await import('../js/utils/auth.js');
    const seen = [];
    const unsubscribe = auth.onAuthChanged(user => seen.push(user?.uid || null));
    await auth.getCurrentUser();
    await Promise.resolve();
    assert.ok(seen.includes(null));
    authRecovery.app = {};
    Date.now = () => now() + 31000;
    await auth.getCurrentUser();
    assert.equal(typeof authRecovery.observer, 'function');
    authRecovery.observer({ uid: 'A', email: 'test@example.invalid', providerData: [] });
    assert.equal(auth.currentUserSync().uid, 'A');
    authRecovery.observer(null);
    assert.deepEqual(seen.slice(-2), ['A', null]);
    unsubscribe();
    authRecovery.observer({ uid: 'B', providerData: [] });
    assert.equal(seen.at(-1), null);
  } finally { Date.now = now; hook.deregister(); }
});
