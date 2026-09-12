/**
 * js/ui/authModal.js — Sign in / Sign up / Reset password, and the account menu
 *
 * Built on the modal pattern the global leaderboard already established in
 * utils/storage.js: mounted OUTSIDE #app on document.body under its own root
 * id, closed on Escape and on a backdrop click, focus-trapped on Tab, with the
 * close helper hung on window so inline handlers in the markup can reach it.
 * render() replaces #app wholesale, so a modal that lived inside it would be
 * destroyed by any re-render behind it.
 *
 * One modal, several views — signin, signup, reset, account, delete, and the
 * two-step phone pair — sharing a shell and switching inline, so a player who
 * guesses wrong about whether they already have an account is one tap from the
 * right form with their email carried across.
 *
 * SEVERAL DOORS, ONE ACCOUNT
 * ──────────────────────────
 * The provider buttons are not just more ways in. Every distinct sign-in method
 * a player uses mints a distinct Firebase uid unless it is LINKED, and a second
 * uid on a device that already belongs to one is a hand-off in
 * utils/cloudSave.js — trophies parked, Trophy Room emptied. So this modal:
 *
 *   * offers linking from the account view, which is the path that adds a door
 *     without adding an account (see linkProvider in utils/auth.js);
 *   * gives auth/account-exists-with-different-credential its own copy, telling
 *     the player to sign in the way they did before and link it, rather than the
 *     generic "something went wrong" that would leave them creating a second
 *     account and losing a Trophy Room to it.
 *
 * Nothing is shown for a provider whose Remote Config key is not true: if
 * enabledProviders() is empty the whole block — buttons, divider and all — is
 * absent rather than disabled. A button that fails every tap is worse than no
 * button.
 *
 * WHAT THIS MODAL WILL NOT DO
 * ───────────────────────────
 * It never gates play. Every mode, screen and feature stays available signed
 * out; an account adds portability, not access. Nothing here is on the path of
 * a draft or a simulation, and every failure resolves to a message in the
 * modal rather than anything the game has to handle.
 *
 * Verification gates cloud sync, not play. Hard-gating sign-in on a verified
 * address would strand every player whose mail went to spam, which is a large
 * fraction of them.
 *
 * Exports:
 *   showAuthModal(view)  — mounts the modal ('signin' | 'signup' | 'reset' | 'account')
 *   closeAuthModal()     — unmounts it
 */

import {
  signUp, signIn, signOut, sendPasswordReset, resendVerification,
  deleteAccount, getCurrentUser, isAuthAvailable,
  PROVIDERS, enabledProviders, providerEnabled, signInWithProvider, linkProvider,
  startPhoneSignIn, startPhoneLink, confirmPhoneCode, cancelPhoneSignIn,
  normalizePhone,
} from '../utils/auth.js';
import { syncOnSignIn, deleteCloudSave, releaseDeletedAccount } from '../utils/cloudSave.js';
import { showToast } from './render.js';

const ROOT_ID = 'auth-modal-root';

const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// ── Validation ────────────────────────────────────────────────────────────────
// Client-side validation is UX, not security — the provider and the Firestore
// rules are the real boundary. Its whole job is to catch a typo before a round
// trip, so it stays deliberately permissive.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Firebase's own floor is 6, which is too low to offer as advice.
const MIN_PASSWORD = 8;
const MIN_NAME = 3;
const MAX_NAME = 24;

// Rejected outright because they are the first guesses in any credential
// stuffing list, not as a substitute for a real strength meter.
const WEAK = new Set([
  'password', 'password1', '12345678', '123456789', 'qwertyui', 'iloveyou',
  'basketball', 'letmein1', 'football', 'baseball',
]);

function emailError(v) {
  if (!v) return 'Enter your email address';
  if (!EMAIL_RE.test(v)) return 'That does not look like an email address';
  return null;
}

function passwordError(v) {
  if (!v) return 'Enter a password';
  if (v.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters`;
  if (WEAK.has(v.toLowerCase())) return 'That password is too easy to guess';
  return null;
}

/**
 * Counted by CHARACTER, not by UTF-16 code unit.
 *
 * The users/{uid} Firestore rule bounds displayName with size(), which counts
 * characters. A two-emoji GM name is `.length` 4 and size() 2, so a bare
 * `.length` check accepted a name the rule then rejected — and because the
 * rule validates the whole document, that lost the entire first cloud save
 * to a generic permission-denied. cloudSave.js slices the same way.
 */
function nameError(v) {
  if (!v) return 'Choose a GM name';
  const chars = [...v].length;
  if (chars < MIN_NAME) return `Use at least ${MIN_NAME} characters`;
  if (chars > MAX_NAME) return `Use at most ${MAX_NAME} characters`;
  return null;
}

/**
 * Turns a provider error code into something a player can act on.
 *
 * With email enumeration protection on — which it should be — a wrong password
 * and an unknown address both arrive as 'auth/invalid-credential'. That is the
 * point: the copy must not imply which one it was, or the protection is
 * undone by the error message.
 */
function humanError(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'That email or password is incorrect.';
    case 'auth/email-already-in-use':
      return 'That email already has an account. Try signing in instead.';
    case 'auth/invalid-email':
      return 'That does not look like an email address.';
    case 'auth/weak-password':
      return `Use a password of at least ${MIN_PASSWORD} characters.`;
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a minute, or reset your password.';
    case 'auth/network-request-failed':
      return 'Could not reach the network. Check your connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Accounts are not switched on yet. Nothing is wrong with yours.';
    case 'auth/requires-recent-login':
      return 'For safety this needs a fresh sign-in. Sign out, sign back in, then try again.';
    case 'auth/user-mismatch':
      return 'The signed-in account changed. Close this window and confirm deletion again.';
    case 'auth/unavailable':
      return 'Accounts are unavailable right now. Your progress on this device is unaffected.';

    // ── Federated sign-in ────────────────────────────────────────────────────
    case 'auth/account-exists-with-different-credential':
      // The one message here that has to teach rather than apologise. Creating
      // a second account is what a player does next if this is vague, and a
      // second account on this device parks their Trophy Room.
      return 'That email already has an account from a different sign-in method. '
           + 'Sign in the way you did before, then add this one from Your account — '
           + 'that keeps all your progress on one account.';
    case 'auth/credential-already-in-use':
    case 'auth/provider-already-linked':
      return 'That is already connected to an account. Sign in with it instead.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/user-cancelled':
      // Closing the window is a decision, not a fault. Say nothing.
      return '';
    case 'auth/unauthorized-domain':
      return 'Sign-in is not set up for this address yet. Nothing is wrong with your account.';

    // ── Phone ────────────────────────────────────────────────────────────────
    case 'auth/invalid-phone-number':
    case 'auth/missing-phone-number':
      return 'Enter your number with its country code, like +1 415 555 0132.';
    case 'auth/invalid-verification-code':
      return 'That code is not right. Check the message and try again.';
    case 'auth/code-expired':
      return 'That code has expired. Send a new one.';
    case 'auth/missing-verification-code':
      return 'Enter the code from the message.';
    case 'auth/quota-exceeded':
      // The project's SMS allowance, not anything the player did.
      return 'Too many codes have been sent today. Try another sign-in method.';
    case 'auth/captcha-check-failed':
      return 'The robot check did not pass. Reload the page and try again.';
    case 'auth/no-phone-attempt':
      return 'That code request has expired. Enter your number again.';

    default:
      return 'Something went wrong. Your progress on this device is unaffected.';
  }
}

// ── Shell ─────────────────────────────────────────────────────────────────────

let _view  = 'signin';
let _deleteUid = null;
let _email = '';
let _phone = '';
// Whether the phone attempt in flight is LINKING to the signed-in account or
// signing a new one in. The code step looks identical either way, so without
// this the "use a different number" link would send a linking player back to
// the sign-in flow and mint the second uid the linking existed to avoid.
let _phoneLinking = false;
let _busy  = false;
let _resendAt = 0;

function fieldHtml({ id, label, type, value = '', autocomplete, hint = '', extra = '' }) {
  return `
    <label class="auth-field">
      <span class="auth-field__label">${esc(label)}</span>
      <input class="auth-field__input" id="${id}" type="${type}" value="${esc(value)}"
             autocomplete="${autocomplete}" ${extra}
             ${type === 'email' ? 'inputmode="email" autocapitalize="none" spellcheck="false"' : ''} />
      <span class="auth-field__err" id="${id}-err" role="alert">${esc(hint)}</span>
    </label>`;
}

// ── Provider buttons ──────────────────────────────────────────────────────────
// Inline SVG, not an <img> and not a font: the marks have to render on the
// first paint of a modal that may be opened offline, and Google's own branding
// guidance requires its wordmark button to carry the G. Everything here is
// same-origin by construction — see tests/assets.test.mjs.

const PROVIDER_ICON = {
  google: `<svg class="auth-provider__icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
  </svg>`,
  phone: `<svg class="auth-provider__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="6" y="2" width="12" height="20" rx="2.5"/><line x1="11" y1="18" x2="13" y2="18"/>
  </svg>`,
};

/**
 * Required attribution.
 *
 * The reCAPTCHA phone auth uses is invisible and its badge is hidden by
 * #auth-recaptcha's styling. Google's terms allow hiding the badge only if this
 * notice is shown to the user instead, so the two are a pair — restyle the
 * container to show the badge and this can go, and not before.
 */
const RECAPTCHA_NOTICE = `<p class="auth-modal__fine auth-recaptcha-notice">This step is protected by reCAPTCHA. Google's
      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a> and
      <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> apply.</p>`;

const PROVIDER_LABEL = {
  google: 'Continue with Google',
  phone:  'Continue with a phone number',
};

/** The action each button dispatches, by view. */
const PROVIDER_ACTION = { google: 'provider-google', phone: 'to-phone' };

/**
 * The provider block above the email form, or '' when none is switched on.
 *
 * Returning '' takes the divider with it. A lone "or" rule above an email form
 * with nothing above it looks like a rendering fault, and the shipped build —
 * every key false — is exactly that case.
 */
function providersHtml() {
  const ids = enabledProviders();
  if (!ids.length) return '';
  const buttons = ids.map(id => `
    <button data-auth="${PROVIDER_ACTION[id]}" type="button" class="auth-provider auth-provider--${id}">
      ${PROVIDER_ICON[id] || ''}<span>${esc(PROVIDER_LABEL[id])}</span>
    </button>`).join('');
  return `<div class="auth-providers">${buttons}</div>
    <div class="auth-divider"><span>or</span></div>`;
}

/** Friendly names for the provider ids Firebase reports back on a user. */
const LINKED_LABEL = {
  'password':   'Email and password',
  'google.com': 'Google',
  'phone':      'Phone',
};

/**
 * The "how you sign in" block on the account view.
 *
 * Lists what is already attached and offers what is not, because linking is
 * the only way to add a sign-in method without minting a second uid — and a
 * second uid on this device parks the player's save (see the header note).
 * Unlinking is deliberately absent: removing the last method would strand the
 * account outright, and the guard for that is worth more thought than a
 * symmetry argument.
 */
function linkedHtml(user) {
  const linked = new Set(user?.providers || []);
  const rows = [...linked].map(pid =>
    `<li class="auth-linked__row"><span>${esc(LINKED_LABEL[pid] || pid)}</span><span class="auth-linked__on">Connected</span></li>`
  ).join('');

  const offer = Object.values(PROVIDERS)
    .filter(spec => providerEnabled(spec.id) && !linked.has(spec.providerId))
    .map(spec => `
      <button data-auth="${spec.kind === 'phone' ? 'to-phone-link' : `link-${spec.id}`}"
              type="button" class="auth-provider auth-provider--sm auth-provider--${spec.id}">
        ${PROVIDER_ICON[spec.id] || ''}<span>Add ${esc(spec.label)}</span>
      </button>`).join('');

  if (!rows && !offer) return '';
  return `
    <div class="auth-linked">
      <p class="auth-linked__title">How you sign in</p>
      ${rows ? `<ul class="auth-linked__list">${rows}</ul>` : ''}
      ${offer ? `<div class="auth-providers auth-providers--sm">${offer}</div>
      <p class="auth-modal__fine">Adding a method keeps you on this same account — your trophies, legends and level stay exactly where they are.</p>` : ''}
    </div>`;
}

function viewHtml(view, user) {
  if (view === 'account' && user) {
    // A phone-only account HAS no email address, so the verify note would be an
    // instruction its owner cannot follow — and the Resend button under it would
    // fail every press. Key the note on there being an address to verify, not on
    // the flag alone, which is false for every phone account by construction.
    const unverified = !!user.email && !user.emailVerified;
    const who = user.email || user.phoneNumber || user.displayName || 'your account';
    return `
      <p class="auth-modal__lead">Signed in as <strong>${esc(who)}</strong></p>
      ${unverified ? `
      <div class="auth-note" id="auth-verify-note">
        <p class="auth-note__title">Verify your email</p>
        <p class="auth-note__body">Your progress saves on this device either way. Verifying switches on syncing to your other devices.</p>
        <button data-auth="resend" type="button" class="auth-btn auth-btn--ghost" id="auth-resend">Resend the email</button>
      </div>` : `
      <div class="auth-note auth-note--ok">
        <p class="auth-note__body">Your progress syncs to every device you sign in on.</p>
      </div>`}
      ${linkedHtml(user)}
      <button data-auth="sync" type="button" class="auth-btn auth-btn--ghost">Sync progress now</button>
      <button data-auth="signout" type="button" class="auth-btn auth-btn--primary">Sign out</button>
      <p class="auth-modal__fine">Signing out leaves every trophy, legend and level on this device exactly where it is.</p>
      <button data-auth="delete-start" type="button" class="auth-link auth-link--danger">Delete my account</button>`;
  }

  // ── Phone, step 1: the number ───────────────────────────────────────────────
  // The reCAPTCHA container must be in the DOM before startPhoneSignIn() runs,
  // and it is invisible — it solves itself and is never seen. It lives in the
  // markup rather than being created on demand so the verifier always has a
  // stable element to attach to.
  if (view === 'phone' || view === 'phone-link') {
    const linking = view === 'phone-link';
    return `
      <p class="auth-modal__lead">${linking
        ? 'Add a phone number to this account. We will text you a code.'
        : 'We will text you a six-digit code. No password to remember.'}</p>
      ${fieldHtml({ id: 'auth-phone', label: 'Phone number', type: 'tel', value: _phone,
                    autocomplete: 'tel', hint: '', extra: 'placeholder="+1 415 555 0132"' })}
      <p class="auth-modal__fine">Include your country code. Standard message rates apply.</p>
      <div id="auth-recaptcha"></div>
      ${RECAPTCHA_NOTICE}
      <button data-auth="${linking ? 'phone-link-send' : 'phone-send'}" type="button" class="auth-btn auth-btn--primary">Send the code</button>
      <button data-auth="${linking ? 'to-account' : 'to-signin'}" type="button" class="auth-link">${linking ? 'Cancel' : 'Back to sign in'}</button>`;
  }

  // ── Phone, step 2: the code ─────────────────────────────────────────────────
  if (view === 'phone-code') {
    return `
      <p class="auth-modal__lead">We texted a code to <strong>${esc(_phone)}</strong>.</p>
      ${fieldHtml({ id: 'auth-code', label: 'Six-digit code', type: 'text', autocomplete: 'one-time-code',
                    extra: 'inputmode="numeric" pattern="[0-9]*" maxlength="6"' })}
      <div id="auth-recaptcha"></div>
      ${RECAPTCHA_NOTICE}
      <button data-auth="phone-confirm" type="button" class="auth-btn auth-btn--primary">Sign in</button>
      <button data-auth="${_phoneLinking ? 'to-phone-link' : 'to-phone'}" type="button" class="auth-link">Use a different number</button>`;
  }

  if (view === 'delete') {
    return `
      <p class="auth-modal__lead">This permanently deletes your account and the save stored in the cloud.</p>
      <p class="auth-modal__fine">Your progress on <strong>this device</strong> stays exactly as it is — trophies, legends and level all remain.</p>
      ${fieldHtml({ id: 'auth-confirm', label: 'Type DELETE to confirm', type: 'text', autocomplete: 'off' })}
      <button data-auth="delete-confirm" type="button" class="auth-btn auth-btn--danger">Delete my account</button>
      <button data-auth="to-account" type="button" class="auth-link">Cancel</button>`;
  }

  if (view === 'reset') {
    return `
      <p class="auth-modal__lead">We will email you a link to set a new password.</p>
      ${fieldHtml({ id: 'auth-email', label: 'Email', type: 'email', value: _email, autocomplete: 'email' })}
      <button data-auth="reset" type="button" class="auth-btn auth-btn--primary">Send the link</button>
      <button data-auth="to-signin" type="button" class="auth-link">Back to sign in</button>`;
  }

  if (view === 'signup') {
    return `
      <p class="auth-modal__lead">Keep your trophies, legends and level on every device you play on.</p>
      ${providersHtml()}
      ${fieldHtml({ id: 'auth-name', label: 'GM name', type: 'text', autocomplete: 'nickname',
                    extra: `maxlength="${MAX_NAME}"` })}
      ${fieldHtml({ id: 'auth-email', label: 'Email', type: 'email', value: _email, autocomplete: 'email' })}
      ${fieldHtml({ id: 'auth-password', label: 'Password', type: 'password', autocomplete: 'new-password' })}
      <button data-auth="signup" type="button" class="auth-btn auth-btn--primary">Create account</button>
      <button data-auth="to-signin" type="button" class="auth-link">I already have an account</button>`;
  }

  return `
    <p class="auth-modal__lead">Sign in to pick your game up on any device.</p>
    ${providersHtml()}
    ${fieldHtml({ id: 'auth-email', label: 'Email', type: 'email', value: _email, autocomplete: 'email' })}
    ${fieldHtml({ id: 'auth-password', label: 'Password', type: 'password', autocomplete: 'current-password' })}
    <label class="auth-check">
      <input type="checkbox" id="auth-remember" checked />
      <span>Keep me signed in</span>
    </label>
    <button data-auth="signin" type="button" class="auth-btn auth-btn--primary">Sign in</button>
    <div class="auth-modal__links">
      <button data-auth="to-signup" type="button" class="auth-link">Create an account</button>
      <button data-auth="to-reset" type="button" class="auth-link">Forgot password?</button>
    </div>`;
}

const TITLES = {
  signin: 'Sign in', signup: 'Create an account', reset: 'Reset your password',
  account: 'Your account', delete: 'Delete your account',
  phone: 'Sign in with your phone', 'phone-link': 'Add a phone number',
  'phone-code': 'Enter your code',
};

function shellHtml(view, user) {
  return `
  <div class="auth-modal__backdrop" data-auth="close" aria-hidden="true"></div>
  <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
    <div class="auth-modal__head">
      <h2 class="auth-modal__title" id="auth-modal-title">${TITLES[view] || 'Account'}</h2>
      <button data-auth="close" type="button" class="auth-modal__x" aria-label="Close">×</button>
    </div>
    <div class="auth-modal__body">
      <p class="auth-modal__banner" id="auth-banner" role="alert" hidden></p>
      ${viewHtml(view, user)}
    </div>
    <p class="auth-modal__foot">The game is free and always playable without an account.</p>
  </div>`;
}

// ── Mount / unmount ───────────────────────────────────────────────────────────

// The mounted root, held directly rather than looked up by id on every call.
// The game's own screens carry plenty of ids, and every query below is scoped
// to this element, so the modal can never reach into the page behind it or be
// confused by a collision with it.
let _root = null;

function root() { return _root; }

/** Scoped lookup — never document-wide. */
function q(sel) { return _root ? _root.querySelector(sel) : null; }

function paint(view, user) {
  const el = root();
  if (!el) return;
  _view = view;
  _deleteUid = view === 'delete' ? user?.uid || null : null;
  el.innerHTML = shellHtml(view, user);
  // Only the FIELD listeners are re-bound here. The delegated action listeners
  // live on the root, which paint() does not replace — see wireActions().
  wireFields(el);
  el.querySelector('.auth-field__input, .auth-btn')?.focus();
}

function banner(msg) {
  const el = q('#auth-banner');
  if (!el) return;
  el.textContent = msg || '';
  el.hidden = !msg;
}

function fieldErr(id, msg) {
  const el = q(`#${id}-err`);
  if (el) el.textContent = msg || '';
  q(`#${id}`)?.classList.toggle('auth-field__input--bad', !!msg);
  return !msg;
}

/** Disables the form while a request is in flight so it cannot be submitted twice. */
function setBusy(on, label) {
  _busy = on;
  const el = root();
  if (!el) return;
  el.querySelectorAll('input, button').forEach(n => { n.disabled = on; });
  const primary = el.querySelector('.auth-btn--primary, .auth-btn--danger');
  if (primary) {
    if (on) {
      primary.dataset.idleLabel = primary.dataset.idleLabel || primary.textContent;
      primary.textContent = label || 'Working…';
    } else if (primary.dataset.idleLabel) {
      primary.textContent = primary.dataset.idleLabel;
    }
  }
}

const val = id => (q(`#${id}`)?.value || '').trim();

/**
 * After a successful sign-in or sign-up, pull the account's save down and
 * merge it with whatever is on this device. Never blocks the modal from
 * closing. Sync failure is reported separately from sign-in success, with a
 * retry action in the account view.
 */
async function mergeAfterAuth(user, displayName) {
  if (!user?.uid) return;
  try {
    const res = await syncOnSignIn(user.uid, displayName);
    if (!res?.ok || !res.merged) { showToast('Signed in, but progress could not sync. Use Sync progress now in Account to retry.', 5000); return; }
    // A hand-off is not a merge and must not be reported as one: this device
    // was signed in to a different account, so nothing that was on it has
    // been added to this one (see cloudSave.js "Device ownership").
    if (res.handedOff) {
      showToast('Loaded your account — this device was last used by a different account', 4200);
      return;
    }
    if (!res.uploaded) { showToast('Progress is on this device. Cloud backup is pending; use Sync progress now in Account to retry.', 5000); return; }
    const lv = res.merged.save?.legends?.length || 0;
    const tr = res.merged.save?.trophies?.length || 0;
    showToast(`Progress merged · ${lv} legends · ${tr} trophies`, 3200);
  } catch (_) { /* the cloud is a mirror; local is what the game plays from */ }
}

/**
 * Google, via popup.
 *
 * setBusy() first and synchronously: it is DOM work only, so it does not spend
 * the click's user activation, and it is the guard against a second popup being
 * opened behind the first. signInWithProvider() then awaits ensureAuth(), which
 * showAuthModal() has already pre-warmed — an SDK import at this point would
 * outlast the activation window and the browser would block the popup.
 *
 * @param {'google'} id
 */
async function doProvider(id) {
  banner('');
  setBusy(true, 'Opening…');
  const remember = !!q('#auth-remember')?.checked || _view !== 'signin';
  const res = await signInWithProvider(id, { remember });
  setBusy(false);
  if (!res.ok) { banner(humanError(res.code)); return; }
  closeAuthModal();
  showToast('Signed in');
  // The provider's own display name becomes the GM name, so a Google player
  // never has to invent one. Phone accounts have none, which snapshotToRemote()
  // handles by simply omitting the field.
  mergeAfterAuth(res.user, res.user?.displayName || undefined);
}

/** Attaches a provider to the account already signed in. Stays in the modal. */
async function doLink(id) {
  banner('');
  setBusy(true, 'Opening…');
  const res = await linkProvider(id);
  setBusy(false);
  if (!res.ok) { banner(humanError(res.code)); return; }
  showToast(`${PROVIDERS[id]?.label || 'Sign-in method'} added`);
  // Repaint from the SDK's own view of the account rather than from res.user:
  // the account view lists what is linked, and that list is exactly what just
  // changed.
  repaint('account');
}

/** Phone step 1 — send the code. `linking` keeps a signed-in player on their uid. */
async function doPhoneSend(linking) {
  const raw = val('auth-phone');
  banner('');
  if (!fieldErr('auth-phone', normalizePhone(raw) ? null : 'Include your country code, like +1 415 555 0132')) return;
  _phone = raw;
  _phoneLinking = !!linking;
  setBusy(true, 'Sending…');
  const send = linking
    ? await startPhoneLink(raw, 'auth-recaptcha')
    : await startPhoneSignIn(raw, 'auth-recaptcha');
  setBusy(false);
  if (!send.ok) { banner(humanError(send.code)); return; }
  // Show the number back in the format it was actually sent in, not as typed.
  _phone = send.phone || raw;
  await repaint('phone-code');
}

/**
 * Phone step 2 — confirm.
 *
 * A wrong code keeps the attempt alive so the player can retype it; only an
 * expired one (which auth.js drops) sends them back to the number.
 */
async function doPhoneConfirm() {
  const code = val('auth-code');
  banner('');
  if (!fieldErr('auth-code', code ? null : 'Enter the code from the message')) return;
  setBusy(true, 'Checking…');
  const res = await confirmPhoneCode(code);
  setBusy(false);
  if (!res.ok) {
    const expired = res.code === 'auth/code-expired' || res.code === 'auth/no-phone-attempt';
    // repaint() clears the banner, so the message is set AFTER it — otherwise
    // the player lands back on the number field with no explanation.
    if (expired) await repaint(_phoneLinking ? 'phone-link' : 'phone');
    banner(humanError(res.code));
    return;
  }
  if (_phoneLinking) {
    _phoneLinking = false;
    showToast('Phone number added');
    repaint('account');
    return;
  }
  closeAuthModal();
  showToast('Signed in');
  mergeAfterAuth(res.user, res.user?.displayName || undefined);
}

async function doSignIn() {
  const email = val('auth-email');
  const pw    = q('#auth-password')?.value || '';
  banner('');
  const ok = [fieldErr('auth-email', emailError(email)),
              fieldErr('auth-password', pw ? null : 'Enter your password')].every(Boolean);
  if (!ok) return;
  _email = email;
  const remember = !!q('#auth-remember')?.checked;
  setBusy(true, 'Signing in…');
  const res = await signIn(email, pw, { remember });
  setBusy(false);
  if (!res.ok) { banner(humanError(res.code)); return; }
  closeAuthModal();
  showToast('Signed in');
  mergeAfterAuth(res.user);
}

async function doSignUp() {
  const name  = val('auth-name');
  const email = val('auth-email');
  const pw    = q('#auth-password')?.value || '';
  banner('');
  const ok = [fieldErr('auth-name', nameError(name)),
              fieldErr('auth-email', emailError(email)),
              fieldErr('auth-password', passwordError(pw))].every(Boolean);
  if (!ok) return;
  _email = email;
  setBusy(true, 'Creating…');
  const res = await signUp(email, pw);
  setBusy(false);
  if (!res.ok) { banner(humanError(res.code)); return; }
  closeAuthModal();
  showToast(res.verificationSent ? 'Account created — check your email' : 'Account created');
  mergeAfterAuth(res.user, name);
}

async function doReset() {
  const email = val('auth-email');
  banner('');
  if (!fieldErr('auth-email', emailError(email))) return;
  _email = email;
  setBusy(true, 'Sending…');
  const res = await sendPasswordReset(email);
  setBusy(false);
  // Deliberately the same answer whether or not an account exists — that is
  // what email enumeration protection is for, and the copy has to be written
  // so it reassures rather than sounding evasive.
  if (!res.ok && res.code === 'auth/unavailable') { banner(humanError(res.code)); return; }
  closeAuthModal();
  showToast('If that email has an account, the link is on its way', 3600);
}

async function doResend() {
  const now = Date.now();
  if (now < _resendAt) {
    banner(`Wait ${Math.ceil((_resendAt - now) / 1000)}s before sending another.`);
    return;
  }
  setBusy(true, 'Sending…');
  const res = await resendVerification();
  setBusy(false);
  if (!res.ok) { banner(humanError(res.code)); return; }
  _resendAt = Date.now() + 60000;
  banner('Verification email sent. Check your spam folder if it does not arrive.');
}

async function doSignOut() {
  setBusy(true, 'Signing out…');
  const res = await signOut();
  setBusy(false);
  if (!res.ok) { banner(humanError(res.code)); return; }
  closeAuthModal();
  showToast('Signed out — your progress stays on this device');
}

async function doDelete() {
  if (val('auth-confirm').toUpperCase() !== 'DELETE') {
    fieldErr('auth-confirm', 'Type DELETE to confirm');
    return;
  }
  // Armed BEFORE the first await, not after it. The click dispatcher's `_busy`
  // check is the only thing standing between one tap and two concurrent
  // deletions, and it is read in the same task as the tap — so setting the
  // flag after `await getCurrentUser()` left the guard down for exactly as
  // long as that await took. On the one irreversible action in the product,
  // the loser of that race reported "Something went wrong" over a deletion
  // that had in fact succeeded.
  setBusy(true, 'Deleting…');
  const expectedUid = _deleteUid;
  const user = await getCurrentUser();
  if (!expectedUid || user?.uid !== expectedUid) {
    setBusy(false);
    banner('The signed-in account changed. Close this window and confirm deletion again.');
    return;
  }
  // Cloud save first: once the auth account is gone the rules no longer let
  // anyone — including us — touch the document it owned. So a failure here
  // has to STOP the deletion: carrying on would erase the only credential
  // that can ever reach that document again and leave the player's saved
  // progress — and the display name on it — stranded in the database with
  // nobody able to read or remove it. The account is untouched, so the player
  // can simply try again.
  if (user?.uid) {
    const wiped = await deleteCloudSave(user.uid);
    if (!wiped?.ok) {
      setBusy(false);
      banner('Could not delete your cloud save, so your account was left alone. Check your connection and try again.');
      return;
    }
  }
  const res = await deleteAccount(expectedUid);
  setBusy(false);
  if (!res.ok) { banner(humanError(res.code)); return; }
  releaseDeletedAccount(user?.uid);
  closeAuthModal();
  showToast('Account deleted — your progress stays on this device', 3600);
}

// Views that need the signed-in user to render. 'phone-link' is here because
// it is reached from the account view and returns to it.
const USER_VIEWS = ['account', 'delete', 'phone-link'];

async function repaint(view) {
  banner('');
  paint(view, USER_VIEWS.includes(view) ? await getCurrentUser() : null);
}

/**
 * The delegated action listeners. Attached ONCE, to the root element, by
 * showAuthModal().
 *
 * They must not be re-attached on every paint. The root outlives every
 * repaint (paint() only replaces its children), so wiring it again per view
 * switch left the previous listeners in place and DOUBLED the count each
 * time: 1 → 2 → 4 → 8. Toggling between "Sign in" and "Create an account" a
 * dozen times had every click rebuild the modal thousands of times over, and
 * two live listeners were enough to start account deletion twice at once.
 */
function wireActions(el) {
  el.addEventListener('click', ev => {
    const btn = ev.target.closest('[data-auth]');
    if (!btn || _busy) return;
    const a = btn.dataset.auth;
    if (a === 'close')          { closeAuthModal();      return; }
    if (a === 'to-signin')      { cancelPhoneSignIn(); _phoneLinking = false; repaint('signin'); return; }
    if (a === 'to-signup')      { repaint('signup');     return; }
    if (a === 'to-reset')       { repaint('reset');      return; }
    if (a === 'to-account')     { cancelPhoneSignIn(); _phoneLinking = false; repaint('account'); return; }
    // Leaving the phone flow by any route drops the pending attempt AND the
    // reCAPTCHA widget with it. Without the teardown the next attempt fails on
    // "reCAPTCHA has already been rendered in this element" rather than on
    // anything the player did.
    if (a === 'to-phone')       { cancelPhoneSignIn(); _phoneLinking = false; repaint('phone'); return; }
    if (a === 'to-phone-link')  { cancelPhoneSignIn(); _phoneLinking = true;  repaint('phone-link'); return; }
    if (a === 'provider-google'){ doProvider('google');  return; }
    if (a === 'link-google')    { doLink('google');      return; }
    if (a === 'phone-send')     { doPhoneSend(false);    return; }
    if (a === 'phone-link-send'){ doPhoneSend(true);     return; }
    if (a === 'phone-confirm')  { doPhoneConfirm();      return; }
    if (a === 'delete-start')   { repaint('delete');     return; }
    if (a === 'signin')         { doSignIn();            return; }
    if (a === 'signup')         { doSignUp();            return; }
    if (a === 'reset')          { doReset();             return; }
    if (a === 'resend')         { doResend();            return; }
    if (a === 'sync') {
      setBusy(true);
      getCurrentUser().then(user => mergeAfterAuth(user, user?.displayName))
        .catch(() => showToast('Sync unavailable. Try again when connected.', 4000))
        .finally(() => setBusy(false));
      return;
    }
    if (a === 'signout')        { doSignOut();           return; }
    if (a === 'delete-confirm') { doDelete();            return; }
  });

  // Enter submits the view's primary action — the inputs are not in a <form>,
  // the same gap the team-name fields in render.js had to close.
  el.addEventListener('keydown', ev => {
    if (ev.key !== 'Enter' || _busy) return;
    if (!ev.target.classList?.contains('auth-field__input')) return;
    ev.preventDefault();
    el.querySelector('.auth-btn--primary, .auth-btn--danger')?.click();
  });
}

/**
 * Per-field validation. These listeners DO belong in paint(): they attach to
 * the inputs, which paint() replaces wholesale, so the old ones are collected
 * with the old DOM and there is nothing to clean up.
 */
function wireFields(el) {
  // Validate on blur, never per keystroke — telling someone their email is
  // invalid while they are still typing it is noise, not help.
  el.querySelectorAll('.auth-field__input').forEach(input => {
    input.addEventListener('blur', () => {
      const v = input.value.trim();
      if (!v) return;
      if (input.id === 'auth-email')    fieldErr('auth-email', emailError(v));
      if (input.id === 'auth-name')     fieldErr('auth-name', nameError(v));
      if (input.id === 'auth-password' && _view === 'signup') {
        fieldErr('auth-password', passwordError(input.value));
      }
    });
  });
}

/**
 * Mounts the modal.
 * @param {'signin'|'signup'|'reset'|'account'} [view]
 */
export async function showAuthModal(view = 'signin') {
  closeAuthModal();
  const el = document.createElement('div');
  el.id = ROOT_ID;
  document.body.appendChild(el);
  _root = el;

  // Once, on the root, for the life of the modal. Every later view switch
  // repaints the root's children but must not re-run this.
  wireActions(el);

  // Pre-warm the auth SDK the moment the modal opens, unawaited. A popup has to
  // be opened inside the click's user-activation window, and a first-call
  // dynamic import of firebase-auth.js takes far longer than that — so without
  // this the FIRST tap of a provider button is the one the browser blocks.
  // Nothing waits on it: the email form is usable either way.
  try { isAuthAvailable(); } catch (_) { /* the button paths report their own failures */ }

  const onKey = e => { if (e.key === 'Escape' && !_busy) closeAuthModal(); };
  document.addEventListener('keydown', onKey);
  el._removeKey = () => document.removeEventListener('keydown', onKey);

  // Tab trap — same approach as the global leaderboard modal.
  el.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const f = [...el.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])')]
      .filter(n => !n.disabled && n.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    }
  });

  _busy = false;
  paint(view, USER_VIEWS.includes(view) ? await getCurrentUser() : null);
}

export function closeAuthModal() {
  const el = root();
  if (!el) return;
  if (el._removeKey) el._removeKey();
  // The reCAPTCHA widget is attached to an element inside this root, so it has
  // to go before the root does — a verifier left pointing at detached DOM makes
  // the next attempt fail on the widget instead of on the number.
  cancelPhoneSignIn();
  _phoneLinking = false;
  el.remove();
  _root = null;
  _busy = false;
}

// Inline handlers in rendered markup live outside #app, the same reason
// utils/storage.js exposes its own closers here.
window.closeAuthModal = closeAuthModal;
