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
 * One modal, four views — signin, signup, reset, account — sharing a shell and
 * switching inline, so a player who guesses wrong about whether they already
 * have an account is one tap from the right form with their email carried
 * across.
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
  deleteAccount, getCurrentUser,
} from '../utils/auth.js';
import { syncOnSignIn, deleteCloudSave } from '../utils/cloudSave.js';
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

function nameError(v) {
  if (!v) return 'Choose a GM name';
  if (v.length < MIN_NAME) return `Use at least ${MIN_NAME} characters`;
  if (v.length > MAX_NAME) return `Use at most ${MAX_NAME} characters`;
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
    case 'auth/unavailable':
      return 'Accounts are unavailable right now. Your progress on this device is unaffected.';
    default:
      return 'Something went wrong. Your progress on this device is unaffected.';
  }
}

// ── Shell ─────────────────────────────────────────────────────────────────────

let _view  = 'signin';
let _email = '';
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

function viewHtml(view, user) {
  if (view === 'account' && user) {
    const unverified = !user.emailVerified;
    return `
      <p class="auth-modal__lead">Signed in as <strong>${esc(user.email || 'your account')}</strong></p>
      ${unverified ? `
      <div class="auth-note" id="auth-verify-note">
        <p class="auth-note__title">Verify your email</p>
        <p class="auth-note__body">Your progress saves on this device either way. Verifying switches on syncing to your other devices.</p>
        <button data-auth="resend" type="button" class="auth-btn auth-btn--ghost" id="auth-resend">Resend the email</button>
      </div>` : `
      <div class="auth-note auth-note--ok">
        <p class="auth-note__body">Your progress syncs to every device you sign in on.</p>
      </div>`}
      <button data-auth="signout" type="button" class="auth-btn auth-btn--primary">Sign out</button>
      <p class="auth-modal__fine">Signing out leaves every trophy, legend and level on this device exactly where it is.</p>
      <button data-auth="delete-start" type="button" class="auth-link auth-link--danger">Delete my account</button>`;
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
      ${fieldHtml({ id: 'auth-name', label: 'GM name', type: 'text', autocomplete: 'nickname',
                    extra: `maxlength="${MAX_NAME}"` })}
      ${fieldHtml({ id: 'auth-email', label: 'Email', type: 'email', value: _email, autocomplete: 'email' })}
      ${fieldHtml({ id: 'auth-password', label: 'Password', type: 'password', autocomplete: 'new-password' })}
      <button data-auth="signup" type="button" class="auth-btn auth-btn--primary">Create account</button>
      <button data-auth="to-signin" type="button" class="auth-link">I already have an account</button>`;
  }

  return `
    <p class="auth-modal__lead">Sign in to pick your game up on any device.</p>
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
  el.innerHTML = shellHtml(view, user);
  wire(el);
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
 * closing and never surfaces as a failure — the player is signed in either
 * way, and local progress is untouched by a failed sync.
 */
async function mergeAfterAuth(user, displayName) {
  if (!user?.uid) return;
  try {
    const res = await syncOnSignIn(user.uid, displayName);
    if (res?.ok && res.merged) {
      const lv = res.merged.save?.legends?.length || 0;
      const tr = res.merged.save?.trophies?.length || 0;
      showToast(`Progress merged · ${lv} legends · ${tr} trophies`, 3200);
    }
  } catch (_) { /* the cloud is a mirror; local is what the game plays from */ }
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
  const user = await getCurrentUser();
  setBusy(true, 'Deleting…');
  // Cloud save first: once the auth account is gone the rules no longer let
  // anyone — including us — touch the document it owned.
  if (user?.uid) await deleteCloudSave(user.uid);
  const res = await deleteAccount();
  setBusy(false);
  if (!res.ok) { banner(humanError(res.code)); return; }
  closeAuthModal();
  showToast('Account deleted — your progress stays on this device', 3600);
}

async function repaint(view) {
  banner('');
  paint(view, view === 'account' || view === 'delete' ? await getCurrentUser() : null);
}

function wire(el) {
  el.addEventListener('click', ev => {
    const btn = ev.target.closest('[data-auth]');
    if (!btn || _busy) return;
    const a = btn.dataset.auth;
    if (a === 'close')          { closeAuthModal();      return; }
    if (a === 'to-signin')      { repaint('signin');     return; }
    if (a === 'to-signup')      { repaint('signup');     return; }
    if (a === 'to-reset')       { repaint('reset');      return; }
    if (a === 'to-account')     { repaint('account');    return; }
    if (a === 'delete-start')   { repaint('delete');     return; }
    if (a === 'signin')         { doSignIn();            return; }
    if (a === 'signup')         { doSignUp();            return; }
    if (a === 'reset')          { doReset();             return; }
    if (a === 'resend')         { doResend();            return; }
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
  paint(view, view === 'account' ? await getCurrentUser() : null);
}

export function closeAuthModal() {
  const el = root();
  if (!el) return;
  if (el._removeKey) el._removeKey();
  el.remove();
  _root = null;
  _busy = false;
}

// Inline handlers in rendered markup live outside #app, the same reason
// utils/storage.js exposes its own closers here.
window.closeAuthModal = closeAuthModal;
