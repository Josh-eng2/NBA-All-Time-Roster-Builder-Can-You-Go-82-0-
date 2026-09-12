import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { installDom, makeEl } from './dom-stub.mjs';

installDom();
window.self = window; window.top = window;
globalThis.deletionTest = { auth: { currentUser: null }, observer: () => {} };
const hook = registerHooks({
  resolve(specifier, context, next) {
    return specifier.startsWith('deletion-sdk:') ? { url: specifier, shortCircuit: true } : next(specifier, context);
  },
  load(url, context, next) {
    let source;
    if (url.endsWith('/js/utils/firebase.js')) source = `export const SDK_BASE='deletion-sdk:root'; export const getFirebaseApp=async()=>({});`;
    if (url.endsWith('/js/utils/remoteConfig.js')) source = `export const configValue=k=>k==='accounts_enabled';`;
    if (url.startsWith('deletion-sdk:')) source = `
      export const getAuth=()=>deletionTest.auth;
      export const onAuthStateChanged=(auth, cb)=>{ deletionTest.observer=cb; cb(auth.currentUser); return ()=>{}; };
      export const deleteUser=user=>deletionTest.delete(user);`;
    if (url.endsWith('/js/ui/render.js')) source = `export const showToast=()=>{};`;
    if (url.endsWith('/js/utils/cloudSave.js')) source = `
      export const syncOnSignIn=async()=>({ok:true});
      export const deleteCloudSave=uid=>deletionTest.cloud(uid);
      export const releaseDeletedAccount=uid=>deletionTest.released=uid;`;
    return source ? { format: 'module', shortCircuit: true, source } : next(url, context);
  },
});
const auth = await import('../js/utils/auth.js');
const modal = await import('../js/ui/authModal.js');
const user = uid => ({ uid, email: uid + '@example.invalid', providerData: [] });
function switchTo(uid) { deletionTest.auth.currentUser = uid ? user(uid) : null; deletionTest.observer(deletionTest.auth.currentUser); }
const settle = () => new Promise(resolve => setImmediate(resolve));
async function confirmation() {
  switchTo('A');
  await modal.showAuthModal('delete');
  const root = document.body.children.find(e => e.id === 'auth-modal-root');
  const input = makeEl('input'); input.value = 'DELETE';
  root.querySelector = selector => selector === '#auth-confirm' ? input : null;
  return () => root.__fire('click', { target: { closest: () => ({ dataset: { auth: 'delete-confirm' } }) } });
}

test('changing accounts before confirmation cannot delete either account', async () => {
  const click = await confirmation();
  deletionTest.cloud = () => assert.fail('cloud deletion for unconfirmed account');
  deletionTest.delete = () => assert.fail('auth deletion for unconfirmed account');
  switchTo('B'); click(); await settle();
  assert.equal(auth.currentUserSync().uid, 'B');
  modal.closeAuthModal();
});

test('switching accounts during cloud deletion never deletes the new login', async () => {
  const click = await confirmation();
  let finish, cloudUid;
  deletionTest.cloud = uid => { cloudUid = uid; return new Promise(resolve => { finish = resolve; }); };
  deletionTest.delete = () => assert.fail('must not delete B after deleting A cloud save');
  click(); await settle();
  assert.equal(cloudUid, 'A');
  switchTo('B'); finish({ ok: true }); await settle();
  assert.equal(auth.currentUserSync().uid, 'B');
  modal.closeAuthModal();
});

test('auth deletion requires a confirmed UID and retains a new session during its await', async () => {
  switchTo('A');
  assert.equal((await auth.deleteAccount()).code, 'auth/user-mismatch');
  assert.equal((await auth.deleteAccount('B')).code, 'auth/user-mismatch');
  let finish, deleted;
  deletionTest.delete = u => { deleted = u; return new Promise(resolve => { finish = resolve; }); };
  const pending = auth.deleteAccount('A'); await settle();
  assert.equal(deleted.uid, 'A');
  switchTo('B'); finish();
  assert.equal((await pending).ok, true);
  assert.equal(auth.currentUserSync().uid, 'B');
});

test('ordinary confirmed deletion completes for the same account', async () => {
  const click = await confirmation();
  deletionTest.cloud = async uid => { assert.equal(uid, 'A'); return { ok: true }; };
  deletionTest.delete = async u => { assert.equal(u.uid, 'A'); switchTo(null); };
  click(); await settle();
  assert.equal(deletionTest.released, 'A');
  assert.equal(auth.currentUserSync(), null);
});
