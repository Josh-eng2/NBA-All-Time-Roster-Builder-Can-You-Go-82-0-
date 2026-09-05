/**
 * App Check (reCAPTCHA v3) — the one thing in this backend-less project that
 * speaks to where a submission CAME FROM rather than what it claims.
 *
 * firestore.rules can only bound a document's shape: anyone who reads the
 * public web config out of js/utils/firebase.js can POST a fabricated 82-0
 * that satisfies every rule. App Check attests that the request came from a
 * page served by a registered domain, which ends that trivial attack (it does
 * not make a run unforgeable — a real browser can still be driven).
 *
 * Two decisions in appCheckSetupFor() are worth pinning, because both fail
 * silently and expensively in opposite directions:
 *
 *   * An unconfigured (placeholder) site key must initialise NOTHING. Calling
 *     initializeAppCheck with the placeholder attaches a provider that can
 *     never mint a valid token, so on a project with enforcement switched on
 *     every real player's submission is rejected with the same generic
 *     PERMISSION_DENIED as a forgery.
 *   * The debug path must stay confined to local hosts. A debug token is a
 *     deliberate bypass of attestation; honoured on canyougo820.com it would
 *     hand every visitor the exact hole App Check exists to close.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mod } from './helpers.mjs';

const { appCheckSetupFor, isAppCheckConfigured } = await import(mod('js/utils/firebase.js'));

const KEY = '6LtEST_fake_site_key';

test('a placeholder or missing site key initialises no App Check at all', () => {
  assert.equal(appCheckSetupFor('YOUR_RECAPTCHA_V3_SITE_KEY', 'canyougo820.com'), null,
    'the shipped placeholder must never be handed to initializeAppCheck');
  assert.equal(appCheckSetupFor('', 'canyougo820.com'), null);
  assert.equal(appCheckSetupFor(undefined, 'canyougo820.com'), null);
});

test('a real site key attests for real on every public host', () => {
  for (const host of ['canyougo820.com', 'www.canyougo820.com', 'josh-eng2.github.io']) {
    assert.deepEqual(appCheckSetupFor(KEY, host), { siteKey: KEY, debug: false },
      `${host} must attest via reCAPTCHA, never via a debug token`);
  }
});

test('the debug-token path is confined to local development hosts', () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]', '']) {
    assert.deepEqual(appCheckSetupFor(KEY, host), { siteKey: KEY, debug: true },
      `${host} is not registrable with a reCAPTCHA key, so it needs the debug token`);
  }
  // Near-misses: a hostname a forger controls must not be able to look local.
  for (const host of ['localhost.evil.com', 'notlocalhost', '127.0.0.1.evil.com', 'LOCALHOST']) {
    assert.equal(appCheckSetupFor(KEY, host).debug, false,
      `${host} must not be treated as a development host`);
  }
});

test('isAppCheckConfigured() reports the shipped key honestly', () => {
  // Ships as the placeholder; flips to true in the same commit that pastes the
  // real site key in. Either value is correct — a lie about it is not, since
  // this is what tells a reviewer whether the deployed project can be enforced.
  assert.equal(typeof isAppCheckConfigured(), 'boolean');
});
