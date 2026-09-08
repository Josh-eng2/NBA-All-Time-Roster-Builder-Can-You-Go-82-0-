/**
 * The federated sign-in methods (Google, Apple, phone), and the two rules that
 * keep adding them from costing anyone their progress.
 *
 *   1. THEY SHIP OFF. Each provider needs Console configuration this repo
 *      cannot carry out — Google a toggle, Apple a paid Developer membership
 *      and a signing key, phone a billed SMS allowance. A button for a
 *      provider the Console has not enabled does not degrade gracefully: it
 *      fails every single tap with auth/operation-not-allowed, which a player
 *      reads as a broken game. So the shipped build renders no provider block
 *      at all, and each key is published true only once its provider works.
 *
 *   2. A SECOND SIGN-IN METHOD MUST NOT MEAN A SECOND ACCOUNT. Every distinct
 *      method mints a distinct uid unless it is linked, and a second uid on a
 *      device that already belongs to one is a hand-off in cloudSave.js — the
 *      player's trophies parked, the Trophy Room in front of them emptied.
 *      That is why linkProvider() exists and why the account view offers it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installDom } from './dom-stub.mjs';
import { mod } from './helpers.mjs';

installDom();

const auth = await import(mod('js/utils/auth.js'));
const { DEFAULTS } = await import(mod('js/utils/remoteConfig.js'));
const { showAuthModal, closeAuthModal } =
  await import(new URL('../js/ui/authModal.js', import.meta.url).href);

const modalRoot = () => document.body.children.find(el => el.id === 'auth-modal-root');
const clickOn = action => ({ target: { closest: () => ({ dataset: { auth: action } }) } });

// ── Shipped state ─────────────────────────────────────────────────────────────

test('every provider ships switched off', () => {
  assert.deepEqual(auth.enabledProviders(), [],
    'a provider is offered in the shipped build — every tap of it would fail');
  for (const id of Object.keys(auth.PROVIDERS)) {
    assert.equal(auth.providerEnabled(id), false, `${id} is enabled by default`);
  }
});

test('each provider has a Remote Config key, and that key defaults to false', () => {
  // Catches a provider added to PROVIDERS without the switch that gates it —
  // providerEnabled() would then read an unknown key, get undefined, and the
  // provider would stay dark with no way to turn it on.
  for (const spec of Object.values(auth.PROVIDERS)) {
    const key = DEFAULTS[spec.flag];
    assert.ok(key, `${spec.id} names a Remote Config key (${spec.flag}) that does not exist`);
    assert.equal(key.type, 'boolean');
    assert.equal(key.value, false, `${spec.flag} ships true — it would fail every tap until the Console matches`);
  }
});

test('an unfetched or malformed flag leaves a provider off, never on', () => {
  // providerEnabled() is `=== true`, the mirror of accountsEnabled()'s
  // `!== false`: these keys ship off, so only an explicit published true may
  // switch one on. A key this build has never heard of must not.
  assert.equal(auth.providerEnabled('bogus'), false);
  assert.equal(auth.providerEnabled(''), false);
  assert.equal(auth.providerEnabled(undefined), false);
});

test('a disabled provider refuses at the API, not only in the markup', async () => {
  // Hiding the button is the first line; a caller that reaches the function
  // anyway (a stale view, a hand-typed action) must still be refused rather
  // than opening a popup that can only fail.
  for (const id of ['google', 'apple']) {
    const res = await auth.signInWithProvider(id);
    assert.equal(res.ok, false);
    assert.equal(res.code, 'auth/operation-not-allowed', `${id} attempted a popup while switched off`);
  }
  const link = await auth.linkProvider('google');
  assert.equal(link.code, 'auth/operation-not-allowed');
  const sms = await auth.startPhoneSignIn('+14155550132', 'auth-recaptcha');
  assert.equal(sms.code, 'auth/operation-not-allowed', 'an SMS would have been sent, and billed');
});

test('an unknown provider id is rejected before anything else', async () => {
  assert.equal((await auth.signInWithProvider('facebook')).code, 'auth/unknown-provider');
  assert.equal((await auth.linkProvider('phone')).code, 'auth/unknown-provider',
    'phone is not an OAuth popup provider and must not be treated as one');
});

// ── Phone numbers ─────────────────────────────────────────────────────────────

test('a phone number is normalised to E.164 or refused', () => {
  const ok = {
    '+14155550132':        '+14155550132',
    '+1 415 555 0132':     '+14155550132',
    '+1-415-555-0132':     '+14155550132',
    '+1 (415) 555.0132':   '+14155550132',
    '  +44 20 7946 0958 ': '+442079460958',
    // 00 is how much of the world writes the international prefix, and it
    // means exactly what + means.
    '0044 20 7946 0958':   '+442079460958',
    '+123456789012345':    '+123456789012345',   // 15 digits, the E.164 ceiling
  };
  for (const [input, want] of Object.entries(ok)) {
    assert.equal(auth.normalizePhone(input), want, `${input} did not normalise`);
  }
});

test('a number that is not E.164 is refused rather than guessed at', () => {
  // Refusing is the point. Inferring a country code from the browser's locale
  // sends a real SMS, at real cost, to a real stranger's phone.
  for (const bad of ['4155550132', '415-555-0132', '+0155550132', '+1', '+1234567890123456',
                     '+1 415 555 013a', '++14155550132', '', '   ', null, undefined, 12345]) {
    assert.equal(auth.normalizePhone(bad), null, `${JSON.stringify(bad)} was accepted`);
  }
});

test('a code cannot be confirmed without an attempt in flight', async () => {
  const res = await auth.confirmPhoneCode('123456');
  assert.equal(res.ok, false);
  assert.equal(res.code, 'auth/no-phone-attempt');
  assert.equal(auth.phoneAttemptPending(), false);
});

// ── The modal ─────────────────────────────────────────────────────────────────

test('the shipped sign-in view renders no provider block and no stray divider', async () => {
  await showAuthModal('signin');
  const html = modalRoot().innerHTML;
  assert.ok(!html.includes('auth-provider'), 'a provider button rendered while every provider is off');
  assert.ok(!html.includes('auth-divider'),
    'an "or" rule rendered with nothing above it, which reads as a rendering fault');
  assert.ok(html.includes('auth-email'), 'the email form is missing');
  closeAuthModal();
});

test('the phone views render and switch without the user being signed in', async () => {
  await showAuthModal('signin');
  const root = modalRoot();

  root.__fire('click', clickOn('to-phone'));
  await Promise.resolve(); await Promise.resolve();
  assert.ok(root.innerHTML.includes('auth-phone'), 'the number field is missing');
  assert.ok(root.innerHTML.includes('auth-recaptcha'),
    'the reCAPTCHA container must exist in the DOM before the verifier is built');

  root.__fire('click', clickOn('to-signin'));
  await Promise.resolve(); await Promise.resolve();
  assert.ok(root.innerHTML.includes('auth-password'), 'did not return to the sign-in form');
  closeAuthModal();
});

test('the new views do not reintroduce doubling listeners', async () => {
  // The bug tests/authmodal.test.mjs exists for, re-run across every route the
  // provider work added — each one is another repaint of a root that survives.
  await showAuthModal('signin');
  const root = modalRoot();
  assert.equal(root.__listenerCount('click'), 1);
  for (const action of ['to-phone', 'to-signin', 'to-signup', 'to-phone', 'to-signin', 'to-reset']) {
    root.__fire('click', clickOn(action));
    await Promise.resolve(); await Promise.resolve();
  }
  assert.equal(root.__listenerCount('click'), 1,
    'a view switch re-wired the surviving root — the 1, 2, 4, 8 bug is back');
  closeAuthModal();
});

// ── Copy ──────────────────────────────────────────────────────────────────────

test('the collision error teaches linking instead of apologising', () => {
  // auth/account-exists-with-different-credential is the one code here whose
  // wording has consequences: a player who reads a vague message creates a
  // SECOND account, and a second account on this device parks their Trophy
  // Room where nothing can merge it back.
  const src = readFileSync(new URL('../js/ui/authModal.js', import.meta.url), 'utf8');
  const at = src.indexOf("case 'auth/account-exists-with-different-credential':");
  assert.ok(at > 0, 'the collision code is not handled at all');
  const copy = src.slice(at, at + 600);
  assert.ok(/Sign in the way you did before/.test(copy),
    'the copy does not tell the player how to recover, so they will make a second account');
  for (const code of ['auth/popup-blocked', 'auth/invalid-verification-code',
                      'auth/code-expired', 'auth/quota-exceeded', 'auth/invalid-phone-number']) {
    assert.ok(src.includes(`case '${code}':`), `${code} falls through to the generic message`);
  }
});
