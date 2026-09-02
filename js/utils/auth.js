/**
 * js/utils/auth.js — Firebase Authentication (email + password)
 *
 * The ONLY module in this project that touches the Firebase Auth SDK. Nothing
 * imports it yet: this is the foundation module, shipped ahead of the UI that
 * will use it, so it has zero user-visible surface and no effect on a player
 * who never signs in.
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
 *
 * Requires "Email/Password" to be enabled in the Firebase console for project
 * basketball-gm-sim-c33ed, and the site's domains to be listed under
 * Authentication → Settings → Authorized domains.
 */

import { getFirebaseApp, SDK_BASE } from './firebase.js';

// ── SDK loading ───────────────────────────────────────────────────────────────

let getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
    firebaseSignOut, sendEmailVerification, sendPasswordResetEmail,
    onAuthStateChanged;

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
      } = mod);
      _auth = getAuth(app);
      return _auth;
    })().catch(() => null).then(auth => {
      if (!auth) { _authPromise = null; _authRetryAt = Date.now() + AUTH_RETRY_COOLDOWN_MS; }
      return auth;
    });
  }
  return _authPromise;
}

// ── Result helpers ────────────────────────────────────────────────────────────

/** The plain, SDK-free shape every caller sees. */
function userSnapshot(user) {
  if (!user) return null;
  return {
    uid:           user.uid,
    email:         user.email ?? null,
    emailVerified: !!user.emailVerified,
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
export function onAuthChanged(cb) {
  let unsub    = null;
  let stopped  = false;
  ensureAuth().then(auth => {
    if (stopped) return;
    if (!auth) { try { cb(null); } catch (_) {} return; }
    unsub = onAuthStateChanged(auth, user => {
      try { cb(userSnapshot(user)); } catch (_) { /* a subscriber must not break auth */ }
    });
  });
  return () => {
    stopped = true;
    if (unsub) { try { unsub(); } catch (_) {} unsub = null; }
  };
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
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ok: true, user: object}|{ok: false, code: string, message: string}>}
 */
export async function signIn(email, password) {
  const auth = await ensureAuth();
  if (!auth) return fail(null, UNAVAILABLE);
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { ok: true, user: userSnapshot(cred.user) };
  } catch (err) {
    return fail(err, 'auth/sign-in-failed');
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
