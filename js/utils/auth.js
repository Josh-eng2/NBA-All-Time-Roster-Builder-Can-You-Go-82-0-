/**
 * js/utils/auth.js — Firebase Authentication (email + password, Google, phone)
 *
 * The ONLY module in this project that touches the Firebase Auth SDK. Consumed
 * by js/ui/authModal.js (the account modal) and js/ui/events.js (the session
 * subscription and the accountsEnabled() gate on the header pill). A player
 * who never signs in is unaffected by all of it: nothing here runs at module
 * load, and every export degrades to a structured failure.
 *
 * Design rules this module holds to:
 *
 *   1. It attaches to the SAME Firebase app js/utils/firebase.js already
 *      created (via getFirebaseApp()) and NEVER calls initializeApp() itself.
 *      It also loads the auth build from that module's exported SDK_BASE, so
 *      the pinned version can only ever be changed in one place — two
 *      different base URLs would load two separate firebase-app.js instances
 *      with separate app registries, which is exactly how a second app gets
 *      created by accident.
 *
 *   2. The SDK is pulled by DYNAMIC import inside ensureAuth(), never a static
 *      one at the top of the file — the same reason firebase.js gives: a
 *      blocked or unreachable gstatic.com must degrade to "accounts
 *      unavailable", never take a module graph down with it.
 *
 *   3. Nothing here runs at module load. firebase.js deliberately kicks off
 *      its init eagerly so analytics fires early; auth has no such need, and
 *      an eager import would be a runtime change for every player including
 *      the ones who never sign in.
 *
 *   4. Every export is guarded and returns a STRUCTURED RESULT rather than
 *      throwing — { ok: true, ... } or { ok: false, code, message }. Callers
 *      never need a try/catch, so an auth failure can never interrupt a run.
 *      `code` is the raw Firebase error code (e.g. 'auth/wrong-password',
 *      'auth/email-already-in-use'); mapping those to player-facing copy is
 *      the job of the UI that consumes this module, not of this module.
 *
 *   5. Raw SDK User objects never leave this file. Callers get a plain
 *      snapshot ({ uid, email, emailVerified }), which keeps rule 1 — "the
 *      only module that touches the auth SDK" — true of the whole codebase
 *      rather than only of this file's imports.
 *
 * Exports:
 *   isAuthAvailable()            — true when the SDK loaded and an app exists
 *   getCurrentUser()             — { uid, email, emailVerified } | null
 *   onAuthChanged(cb)            — subscribe; returns an unsubscribe function
 *   signUp(email, password)      — create an account and send the verification mail
 *   signIn(email, password)      — email + password sign-in
 *   signOut()                    — end the session
 *   resendVerification()         — re-send the verification mail to the current user
 *   sendPasswordReset(email)     — send a password-reset mail
 *   deleteAccount()              — delete the signed-in account
 *   providerEnabled(id)          — is this sign-in method switched on
 *   enabledProviders()           — the ids to offer, in display order
 *   signInWithProvider(id, opts) — Google, via popup
 *   startPhoneSignIn(phone, el)  — send the SMS code
 *   confirmPhoneCode(code)       — finish the phone sign-in
 *   cancelPhoneSignIn()          — tear down the reCAPTCHA and drop the attempt
 *   linkProvider(id)             — attach Google to the CURRENT account
 *   normalizePhone(raw)          — E.164 or null, exported for tests
 *
 * ONE ACCOUNT, SEVERAL DOORS
 * ──────────────────────────
 * Adding providers to a game that already has accounts is not a UI change, and
 * the reason is js/utils/cloudSave.js: the device-ownership rule keys on `uid`,
 * and a SECOND uid on a device is a hand-off — the player's trophies are parked
 * under nba820_handoff and the Trophy Room they are looking at empties. That is
 * correct for a shared laptop and catastrophic for one person who signed up with
 * a password in March and taps "Continue with Google" in June.
 *
 * Firebase does not settle this for us. With "One account per email address" on
 * (the Console default), Google sign-in against an address that already holds a
 * VERIFIED password account fails with
 * auth/account-exists-with-different-credential rather than merging; with it
 * off, the player silently gets a second uid, which is the destructive case. So:
 *
 *   * linkProvider() exists, and the account view offers it. Linking attaches a
 *     provider to the uid the player ALREADY has, which is the only path that
 *     adds a door without adding an account.
 *   * signInWithProvider() surfaces account-exists-with-different-credential as
 *     its own outcome so the modal can say "sign in the way you did before,
 *     then link this from your account" instead of a generic failure.
 *   * The Google provider always asks which account to use (prompt=select_account).
 *     Silently reusing whichever Google account the browser last saw is exactly
 *     how a shared device hands one player's progress to the next.
 *
 * POPUP, NOT REDIRECT
 * ───────────────────
 * signInWithRedirect needs the auth handler to be a first-party context, and
 * this site is canyougo820.com against an authDomain of
 * basketball-gm-sim-c33ed.firebaseapp.com — a third-party context in every
 * browser that partitions storage, which is now all of them. The popup IS
 * first-party on firebaseapp.com, so it is the flow that works here.
 *
 * Its own cost is that a popup opened too long after the click is blocked, so
 * ensureAuth() must already be warm when the button is pressed — the modal
 * pre-warms it on mount, and auth/popup-blocked is handled as a normal outcome
 * rather than an error.
 *
 * CONSOLE SETUP, per provider. None of this lives in the repo, and each
 * provider stays behind its Remote Config key until its setup is done — see
 * DEFAULTS in js/utils/remoteConfig.js.
 *
 *   Email/Password  Authentication → Sign-in method → enable. Already on.
 *   Google          Authentication → Sign-in method → Google → enable, set the
 *                   support email. No external account needed; the project is
 *                   already a Google Cloud project. Then publish
 *                   auth_google_enabled = true.
 *   Phone           Authentication → Sign-in method → Phone → enable. COSTS
 *                   MONEY past a small daily free allowance and needs the Blaze
 *                   plan for real volume — this project is otherwise entirely
 *                   on the no-cost tier, so that is a deliberate decision, not
 *                   a toggle. Set a daily SMS quota before publishing
 *                   auth_phone_enabled = true.
 *
 * Every provider also needs the site's domains under Authentication → Settings
 * → Authorized domains (canyougo820.com, www.canyougo820.com,
 * josh-eng2.github.io), or the popup returns auth/unauthorized-domain.
 */

import { getFirebaseApp, SDK_BASE } from './firebase.js';
import { configValue } from './remoteConfig.js';

// ── Feature gate ──────────────────────────────────────────────────────────────

/**
 * THE off switch, now on.
 *
 * The whole account surface shipped behind this constant so it could be
 * written, reviewed and deployed while production stayed exactly as it was.
 * Setting it back to false is the complete rollback: it removes the pill, the
 * modal and all cloud traffic in one line, and touches no player data — local
 * saves are untouched either way, because they are what the game plays from.
 *
 * Rolling back also needs a CACHE_VERSION bump in sw.js, or returning players
 * keep the cached module with the old value — WHICH IS WHY the Remote Config
 * key `accounts_enabled` exists (see js/utils/remoteConfig.js) and is ANDed
 * with this constant in accountsEnabled() below. Publishing that key false
 * turns the account surface off for every client on its next load without a
 * deploy or a cache roll, which is what you want in the case that actually
 * calls for a rollback: something is wrong right now. This constant stays the
 * committed, reviewable source of truth — a permanent change belongs here.
 */
export const ACCOUNTS_ENABLED = true;

/**
 * Accounts are a FIRST-PARTY-DOMAIN feature and must never appear inside a
 * portal embed. Three separate reasons, any one of which would be enough:
 *
 *   Policy    — portals restrict games from collecting player emails inside
 *               the embed, and CrazyGames already gives these players
 *               account-linked saves through its own Data Module.
 *   Technical — third-party storage partitioning makes auth state persisted
 *               in a cross-site iframe unreliable or discarded outright.
 *   Product   — a player already signed in to CrazyGames should not be asked
 *               to make a second account for progress the portal already
 *               keeps.
 *
 * The check is the same one index.html already uses to decide whether to load
 * the GameDistribution SDK, and it is synchronous so render() can call it.
 * A cross-origin parent makes window.top itself throw, which is conclusive:
 * we are framed.
 */
export function isFramed() {
  try { return window.self !== window.top; } catch (_) { return true; }
}

/**
 * Whether the account UI may be shown at all here. Synchronous and cheap —
 * this decides whether a header pill is even rendered, so it must never wait
 * on the network.
 */
export function accountsEnabled() {
  // `!== false` rather than a truthiness test: configValue() returns the
  // shipped default for an unknown or unfetched key, and the one value that
  // must switch accounts off is an explicit published false — never a
  // reachability problem, which is a reason to keep working, not to hide the
  // account system from a player who may already be signed in.
  return ACCOUNTS_ENABLED && configValue('accounts_enabled') !== false && !isFramed();
}

// ── SDK loading ───────────────────────────────────────────────────────────────

let getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
    firebaseSignOut, sendEmailVerification, sendPasswordResetEmail,
    onAuthStateChanged, deleteUser,
    setPersistence, browserLocalPersistence, browserSessionPersistence,
    GoogleAuthProvider, signInWithPopup, linkWithPopup,
    RecaptchaVerifier, signInWithPhoneNumber, linkWithPhoneNumber;

// Same retry policy as firebase.js loadSdk(): a failed load is retried rather
// than remembered forever, so a CDN blip around the moment of the first call
// does not disable accounts for the whole session, while a genuinely offline
// client is not re-importing on every call either.
const AUTH_RETRY_COOLDOWN_MS = 30000;
let _authPromise = null;
let _authRetryAt = 0;
let _auth        = null;

/**
 * Resolves the Auth instance bound to the shared Firebase app, or null when
 * it cannot be had (no credentials, blocked CDN, offline, SDK error).
 * Memoized; a failure is not memoized, so a later call can retry.
 * @returns {Promise<object|null>}
 */
function ensureAuth() {
  if (!_authPromise) {
    if (Date.now() < _authRetryAt) return Promise.resolve(null);
    _authPromise = (async () => {
      // firebase.js owns app creation. No app means no credentials or a failed
      // SDK load there — either way there is nothing for auth to attach to,
      // and initialising our own would be the second app rule 1 forbids.
      const app = await getFirebaseApp();
      if (!app) return null;
      const mod = await import(`${SDK_BASE}/firebase-auth.js`);
      ({
        getAuth,
        createUserWithEmailAndPassword,
        signInWithEmailAndPassword,
        signOut: firebaseSignOut,
        sendEmailVerification,
        sendPasswordResetEmail,
        onAuthStateChanged,
        deleteUser,
        setPersistence,
        browserLocalPersistence,
        browserSessionPersistence,
        GoogleAuthProvider,
        signInWithPopup,
        linkWithPopup,
        RecaptchaVerifier,
        signInWithPhoneNumber,
        linkWithPhoneNumber,
      } = mod);
      _auth = getAuth(app);
      return _auth;
    })().catch(() => null).then(auth => {
      if (!auth) { _authPromise = null; _authRetryAt = Date.now() + AUTH_RETRY_COOLDOWN_MS; }
      if (auth) attachAuthObserver(auth);
      return auth;
    });
  }
  return _authPromise;
}

// ── Result helpers ────────────────────────────────────────────────────────────

// Last resolved auth state, kept so render() can ask synchronously — it paints
// a whole screen in one pass and cannot await anything. `undefined` means "not
// resolved yet", which is deliberately distinct from `null` ("signed out"):
// the header must show a neutral placeholder during session restoration rather
// than flash a Sign in button at somebody who is already signed in.
let _lastUser;

/** The resolved auth state, or undefined while the session is still restoring. */
export function currentUserSync() {
  return _lastUser;
}

/**
 * The plain, SDK-free shape every caller sees.
 *
 * `providers` is the list of provider ids already attached to this account
 * ('password', 'google.com', 'phone'). It is what lets the account
 * view offer only the doors this account does not already have, and what keeps
 * rule 5 true now that there is more than one way in.
 *
 * `email` is genuinely null for a phone-only account, and `displayName` is null
 * for a phone or a password one — so neither may be treated as present. The
 * account view keys its "verify your email" note on `email && !emailVerified`
 * for exactly that reason: a phone account has no address to verify, and
 * telling its owner to check their inbox is an instruction they cannot follow.
 */
function userSnapshot(user) {
  if (!user) return null;
  return {
    uid:           user.uid,
    email:         user.email ?? null,
    emailVerified: !!user.emailVerified,
    displayName:   user.displayName ?? null,
    phoneNumber:   user.phoneNumber ?? null,
    providers:     (user.providerData ?? []).map(p => p?.providerId).filter(Boolean),
  };
}

/** Uniform failure result. `code` is the raw Firebase code where there is one. */
function fail(err, fallbackCode) {
  return {
    ok:      false,
    code:    err?.code || fallbackCode,
    message: err?.message || String(err ?? fallbackCode),
  };
}

/** The failure every export returns when the SDK or the app is unavailable. */
const UNAVAILABLE = 'auth/unavailable';

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Whether accounts can be used at all right now. Answering it costs one SDK
 * load, so callers should treat a false as "not this time" rather than
 * "never" — the cooldown above lets a later call succeed.
 * @returns {Promise<boolean>}
 */
export async function isAuthAvailable() {
  return !!(await ensureAuth());
}

/**
 * The signed-in user, or null when signed out or unavailable.
 *
 * Note this reflects the session as currently RESOLVED: immediately after a
 * page load the SDK may still be restoring a persisted session, and this can
 * return null for a user who is in fact signed in. Use onAuthChanged() when
 * that distinction matters.
 *
 * @returns {Promise<{uid: string, email: string|null, emailVerified: boolean}|null>}
 */
export async function getCurrentUser() {
  const auth = await ensureAuth();
  if (!auth) return null;
  return userSnapshot(auth.currentUser);
}

/**
 * Subscribes to sign-in / sign-out, including the initial resolution of a
 * persisted session. Fires with a snapshot or null.
 *
 * Always returns an unsubscribe function, including when auth is unavailable
 * — in that case the callback is invoked once with null (a definite "signed
 * out" answer, so a caller is never left waiting on a subscription that can
 * never fire) and the returned function is a no-op.
 *
 * @param {(user: object|null) => void} cb
 * @returns {() => void} unsubscribe
 */
const authSubscribers = new Set();
let observerAuth = null;
let observerUnsubscribe = null;
function attachAuthObserver(auth) {
  if (observerAuth === auth) return;
  observerUnsubscribe?.(); observerAuth = auth;
  observerUnsubscribe = onAuthStateChanged(auth, user => {
    _lastUser = userSnapshot(user);
    for (const cb of authSubscribers) { try { cb(_lastUser); } catch (_) {} }
  });
}
export function onAuthChanged(cb) {
  authSubscribers.add(cb);
  ensureAuth().then(auth => {
    if (!authSubscribers.has(cb)) return;
    if (!auth) { _lastUser = null; cb(null); }
    else if (_lastUser !== undefined) cb(_lastUser);
  });
  return () => authSubscribers.delete(cb);
}

/**
 * Creates an account and sends the verification mail.
 *
 * The account is created and signed in even if the verification mail fails to
 * send — the account exists at that point, so reporting failure would be
 * wrong. `verificationSent` says which happened, so a caller can offer a
 * resend without having to guess.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ok: true, user: object, verificationSent: boolean}|{ok: false, code: string, message: string}>}
 */
export async function signUp(email, password) {
  const auth = await ensureAuth();
  if (!auth) return fail(null, UNAVAILABLE);
  let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth, email, password);
  } catch (err) {
    return fail(err, 'auth/sign-up-failed');
  }
  let verificationSent = false;
  try {
    await sendEmailVerification(cred.user);
    verificationSent = true;
  } catch (_) { /* account exists regardless — the caller can resend */ }
  return { ok: true, user: userSnapshot(cred.user), verificationSent };
}

/**
 * Email + password sign-in.
 *
 * `remember` defaults to true, which is the right default for a game: a
 * player should not have to sign in again to see their trophy room. Passing
 * false scopes the session to the tab, which is the correct behaviour on a
 * shared or public computer.
 *
 * The choice is applied by applyPersistence() below, which the provider flows
 * share and which never fails the caller over a preference.
 *
 * @param {string} email
 * @param {string} password
 * @param {{ remember?: boolean }} [opts]
 * @returns {Promise<{ok: true, user: object}|{ok: false, code: string, message: string}>}
 */
export async function signIn(email, password, { remember = true } = {}) {
  const auth = await ensureAuth();
  if (!auth) return fail(null, UNAVAILABLE);
  await applyPersistence(auth, remember);
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { ok: true, user: userSnapshot(cred.user) };
  } catch (err) {
    return fail(err, 'auth/sign-in-failed');
  }
}

/**
 * Applies the remember-me choice, and never fails the caller over it.
 *
 * A failure to APPLY the persistence choice is not a failure to sign in — the
 * SDK's default (persistent local) still applies, so the sign-in proceeds
 * rather than stranding the player over a preference.
 */
async function applyPersistence(auth, remember) {
  try {
    const mode = remember ? browserLocalPersistence : browserSessionPersistence;
    if (setPersistence && mode) await setPersistence(auth, mode);
  } catch (_) { /* keep the SDK default rather than block the sign-in */ }
}

// ── Federated providers ───────────────────────────────────────────────────────

/**
 * The sign-in methods this build knows how to offer.
 *
 * `id` is ours and is what the UI and the Remote Config keys use; `providerId`
 * is Firebase's, and is what comes back in a user's providerData — the two are
 * kept apart deliberately, because 'google.com' is a string the Console owns
 * and 'google' is a string this codebase owns.
 *
 * Order is display order: Google first because it is the one most players
 * already have, phone last because it is the one that costs money to send.
 */
export const PROVIDERS = {
  google: { id: 'google', providerId: 'google.com', label: 'Google', flag: 'auth_google_enabled', kind: 'oauth' },
  phone:  { id: 'phone',  providerId: 'phone',      label: 'phone',  flag: 'auth_phone_enabled',  kind: 'phone' },
};

const PROVIDER_ORDER = ['google', 'phone'];

/**
 * Whether one method may be offered right now.
 *
 * `=== true` and not a truthiness test, the mirror image of accountsEnabled()'s
 * `!== false`: these keys ship OFF, so the value that switches a provider ON has
 * to be an explicit published true. An unfetched key, an unreachable config or a
 * Console typo must all leave the button hidden — a button for a provider the
 * Console has not enabled fails every tap with auth/operation-not-allowed, and a
 * player reads that as a broken game rather than as a missing setting.
 *
 * @param {string} id
 */
export function providerEnabled(id) {
  const spec = PROVIDERS[id];
  return !!spec && configValue(spec.flag) === true;
}

/** The provider ids to offer, in display order. Empty is the shipped state. */
export function enabledProviders() {
  return PROVIDER_ORDER.filter(providerEnabled);
}

/**
 * A configured provider instance.
 *
 * prompt=select_account is not a nicety. Without it Google reuses whichever
 * account the browser last authorised, with no visible choice — so on a shared
 * device the second player is signed straight into the first player's account,
 * which is the precise failure the cloud-save ownership rule spends a whole
 * section defending against. Making the chooser unconditional costs one tap.
 */
function buildProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

/**
 * Google sign-in, via popup.
 *
 * MUST be reached from a click with ensureAuth() already warm — see the
 * "POPUP, NOT REDIRECT" note in the file header. auth/popup-blocked and
 * auth/popup-closed-by-user are ordinary outcomes here, not errors: the first
 * is a browser setting and the second is a player changing their mind.
 *
 * auth/account-exists-with-different-credential is the one worth reading
 * closely. It means this email already has an account through a DIFFERENT
 * method, and Firebase has refused to guess. Do not treat it as a failure to
 * retry — the answer is to sign in the original way and then linkProvider(),
 * which keeps the uid and therefore keeps the device's save.
 *
 * @param {'google'} id
 * @param {{ remember?: boolean }} [opts]
 */
export async function signInWithProvider(id, { remember = true } = {}) {
  const spec = PROVIDERS[id];
  if (!spec || spec.kind !== 'oauth') return fail(null, 'auth/unknown-provider');
  if (!providerEnabled(id)) return fail(null, 'auth/operation-not-allowed');
  const auth = await ensureAuth();
  if (!auth) return fail(null, UNAVAILABLE);
  await applyPersistence(auth, remember);
  try {
    const cred = await signInWithPopup(auth, buildProvider());
    return { ok: true, user: userSnapshot(cred.user) };
  } catch (err) {
    return fail(err, 'auth/sign-in-failed');
  }
}

/**
 * Attaches a provider to the account that is ALREADY signed in.
 *
 * This is the operation that makes several sign-in methods safe here. Signing
 * in with a new provider mints a new uid, and a new uid on a device that
 * already belongs to one is a hand-off in cloudSave.js — the player's local
 * progress is parked and the Trophy Room in front of them empties. Linking adds
 * the door to the account they already have, so the uid never changes and
 * nothing is parked.
 *
 * auth/credential-already-in-use means that Google identity is already
 * its own separate account. Merging two existing accounts is not something this
 * can do — there is no server to reconcile two saves — so the caller reports it
 * rather than pretending.
 *
 * @param {'google'} id
 */
export async function linkProvider(id) {
  const spec = PROVIDERS[id];
  if (!spec || spec.kind !== 'oauth') return fail(null, 'auth/unknown-provider');
  if (!providerEnabled(id)) return fail(null, 'auth/operation-not-allowed');
  const auth = await ensureAuth();
  if (!auth) return fail(null, UNAVAILABLE);
  const user = auth.currentUser;
  if (!user) return fail(null, 'auth/no-current-user');
  try {
    const cred = await linkWithPopup(user, buildProvider());
    return { ok: true, user: userSnapshot(cred.user) };
  } catch (err) {
    return fail(err, 'auth/link-failed');
  }
}

// ── Phone ─────────────────────────────────────────────────────────────────────

/**
 * A typed number as E.164, or null when it cannot be one.
 *
 * Deliberately strict about the leading `+` rather than guessing a country from
 * the browser's locale: a guessed country code sends a real SMS, at real cost,
 * to a real stranger's phone. Asking for the country code is a smaller cost
 * than that. Spaces, hyphens, brackets and dots are stripped, since every
 * country writes its own numbers with some of them.
 *
 * E.164 is at most 15 digits including the country code, and the first digit
 * is never 0.
 *
 * @param {string} raw
 * @returns {string|null}
 */
export function normalizePhone(raw) {
  const trimmed = String(raw ?? '').trim();
  // A leading 00 is the other way half the world writes an international
  // prefix, and it means exactly what + means.
  const plus = trimmed.startsWith('00') ? `+${trimmed.slice(2)}` : trimmed;
  if (!plus.startsWith('+')) return null;
  const digits = plus.slice(1).replace(/[\s\-().]/g, '');
  return /^[1-9]\d{6,14}$/.test(digits) ? `+${digits}` : null;
}

// The live attempt. Module-private for the same reason raw User objects are:
// a ConfirmationResult is an SDK object, and handing one to the UI would put
// the SDK back in a second file. The verifier is held so it can be torn down —
// reCAPTCHA refuses to render twice into the same element, so a retry after a
// wrong number fails at the widget rather than at the number without this.
let _phoneConfirmation = null;
let _phoneVerifier     = null;

function tearDownVerifier() {
  if (_phoneVerifier) {
    try { _phoneVerifier.clear(); } catch (_) { /* already gone */ }
    _phoneVerifier = null;
  }
}

/**
 * Sends the SMS code.
 *
 * The reCAPTCHA is invisible and solves itself on the way through, so the
 * container element only ever has to exist — it is never seen. It is separate
 * from the reCAPTCHA v3 that App Check uses (js/utils/firebase.js): different
 * product, different key, and they coexist.
 *
 * This costs money on a real project. auth/quota-exceeded is the project's SMS
 * allowance, not the player's fault, and is worth reporting as such.
 *
 * @param {string} phone     as typed; normalised here
 * @param {string} container id of an element that already exists in the DOM
 */
export async function startPhoneSignIn(phone, container, { remember = true } = {}) {
  if (!providerEnabled('phone')) return fail(null, 'auth/operation-not-allowed');
  const e164 = normalizePhone(phone);
  if (!e164) return fail(null, 'auth/invalid-phone-number');
  const auth = await ensureAuth();
  if (!auth) return fail(null, UNAVAILABLE);
  await applyPersistence(auth, remember);
  tearDownVerifier();
  try {
    _phoneVerifier = new RecaptchaVerifier(auth, container, { size: 'invisible' });
    _phoneConfirmation = await signInWithPhoneNumber(auth, e164, _phoneVerifier);
    return { ok: true, phone: e164 };
  } catch (err) {
    // A failed send leaves a spent verifier behind; the next attempt needs a
    // fresh one or it fails on the widget rather than on the number.
    tearDownVerifier();
    _phoneConfirmation = null;
    return fail(err, 'auth/phone-send-failed');
  }
}

/**
 * Finishes a phone sign-in with the code from the SMS.
 *
 * A wrong code does NOT end the attempt — auth/invalid-verification-code leaves
 * the confirmation live so the player can simply retype it, which is what
 * someone who fat-fingered one digit expects. Only an expired code
 * (auth/code-expired) is terminal, and it sends them back to the number.
 *
 * @param {string} code
 */
export async function confirmPhoneCode(code) {
  if (!_phoneConfirmation) return fail(null, 'auth/no-phone-attempt');
  try {
    const cred = await _phoneConfirmation.confirm(String(code ?? '').trim());
    cancelPhoneSignIn();
    return { ok: true, user: userSnapshot(cred.user) };
  } catch (err) {
    if (err?.code === 'auth/code-expired') cancelPhoneSignIn();
    return fail(err, 'auth/phone-confirm-failed');
  }
}

/** Drops a pending attempt and releases the reCAPTCHA widget. */
export function cancelPhoneSignIn() {
  _phoneConfirmation = null;
  tearDownVerifier();
}

/** True while a code has been sent and not yet confirmed. */
export function phoneAttemptPending() {
  return _phoneConfirmation !== null;
}

/**
 * Attaches a phone number to the account already signed in — the phone half of
 * linkProvider(), and there for the same reason.
 */
export async function startPhoneLink(phone, container) {
  if (!providerEnabled('phone')) return fail(null, 'auth/operation-not-allowed');
  const e164 = normalizePhone(phone);
  if (!e164) return fail(null, 'auth/invalid-phone-number');
  const auth = await ensureAuth();
  if (!auth) return fail(null, UNAVAILABLE);
  const user = auth.currentUser;
  if (!user) return fail(null, 'auth/no-current-user');
  tearDownVerifier();
  try {
    _phoneVerifier = new RecaptchaVerifier(auth, container, { size: 'invisible' });
    _phoneConfirmation = await linkWithPhoneNumber(user, e164, _phoneVerifier);
    return { ok: true, phone: e164 };
  } catch (err) {
    tearDownVerifier();
    _phoneConfirmation = null;
    return fail(err, 'auth/phone-send-failed');
  }
}

/**
 * Ends the session. Signing out is a session operation only — it must never
 * touch the nba820_* keys, which belong to the device and to the person still
 * sitting in front of it.
 * @returns {Promise<{ok: true}|{ok: false, code: string, message: string}>}
 */
export async function signOut() {
  const auth = await ensureAuth();
  if (!auth) return fail(null, UNAVAILABLE);
  try {
    // A half-finished phone attempt belongs to the session that started it.
    cancelPhoneSignIn();
    await firebaseSignOut(auth);
    return { ok: true };
  } catch (err) {
    return fail(err, 'auth/sign-out-failed');
  }
}

/**
 * Re-sends the verification mail to the signed-in user.
 * @returns {Promise<{ok: true}|{ok: false, code: string, message: string}>}
 */
export async function resendVerification() {
  const auth = await ensureAuth();
  if (!auth) return fail(null, UNAVAILABLE);
  const user = auth.currentUser;
  if (!user) return fail(null, 'auth/no-current-user');
  try {
    await sendEmailVerification(user);
    return { ok: true };
  } catch (err) {
    return fail(err, 'auth/verification-send-failed');
  }
}

/**
 * Sends a password-reset mail.
 *
 * With email-enumeration protection enabled (the console default), this
 * resolves ok for an address that has no account, so a caller must not read
 * an ok result as proof the account exists.
 *
 * @param {string} email
 * @returns {Promise<{ok: true}|{ok: false, code: string, message: string}>}
 */
export async function sendPasswordReset(email) {
  const auth = await ensureAuth();
  if (!auth) return fail(null, UNAVAILABLE);
  try {
    await sendPasswordResetEmail(auth, email);
    return { ok: true };
  } catch (err) {
    return fail(err, 'auth/reset-send-failed');
  }
}

/**
 * Deletes the signed-in account.
 *
 * Only the auth account — the caller is responsible for the cloud save, and
 * NOTHING here touches local progress. Deleting an account removes what is
 * stored in the cloud, not what is on the device the player is sitting at.
 *
 * Firebase requires a recent sign-in for this, and returns
 * 'auth/requires-recent-login' when the session is too old. That is a normal
 * outcome to be shown to the player, not an error to swallow.
 *
 * @param {string} expectedUid The account displayed in the deletion confirmation.
 * @returns {Promise<{ok: true}|{ok: false, code: string, message: string}>}
 */
export async function deleteAccount(expectedUid) {
  const auth = await ensureAuth();
  if (!auth) return fail(null, UNAVAILABLE);
  const user = auth.currentUser;
  if (!user) return fail(null, 'auth/no-current-user');
  if (!expectedUid || user.uid !== expectedUid) return fail(null, 'auth/user-mismatch');
  try {
    await deleteUser(user);
    // A different account may have signed in while this request was pending.
    _lastUser = userSnapshot(auth.currentUser);
    return { ok: true };
  } catch (err) {
    return fail(err, 'auth/delete-failed');
  }
}
