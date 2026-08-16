/**
 * js/utils/install.js — "Add to home screen" prompt
 *
 * The Daily Challenge's streak is the strongest reason this game has to come
 * back tomorrow, and an installed icon is the only return trigger a static,
 * account-less, notification-less site can own. So the ask is deliberately
 * placed at the one moment the player has just earned a streak rather than on
 * arrival, where an install banner is noise from a site you have not decided
 * to like yet.
 *
 * Two paths, because the platforms differ:
 *   • Chromium — fires `beforeinstallprompt`, which must be captured on load
 *     (it is dispatched once, early) and can be replayed later on a user
 *     gesture. That gives a real one-tap install dialog.
 *   • iOS Safari — no such event and no programmatic install, so the only
 *     honest option is to show where the Share → "Add to Home Screen" item
 *     lives. Shown only on iOS Safari, never as a generic fallback: telling a
 *     desktop Firefox user to tap their share sheet is worse than silence.
 *
 * Never asks twice: a dismissal is remembered, and an install (however it
 * happened) permanently retires the prompt.
 */

import { logAnalyticsEvent } from './firebase.js';

const STATE_KEY = 'nba820_install';

/** Deferred `beforeinstallprompt` event, or null if it never fired. */
let _deferred = null;

function readState() {
  try { return JSON.parse(localStorage.getItem(STATE_KEY) || '{}') || {}; }
  catch (_) { return {}; }
}

function writeState(patch) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify({ ...readState(), ...patch }));
  } catch (_) { /* private mode — worst case we ask once more next visit */ }
}

/** True when the game is already running as an installed app. */
export function isStandalone() {
  try {
    return window.matchMedia?.('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
  } catch (_) { return false; }
}

/** iOS Safari — the one platform that needs manual instructions. Chrome and
 *  Firefox on iOS are WebKit too but cannot install, so they're excluded. */
export function isIosSafari() {
  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua)
    // iPadOS 13+ reports as a Mac; the touch-point check separates it from a desktop.
    || (/Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1);
  if (!iOS) return false;
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

/**
 * Captures the install event and records installs. Must be called before first
 * paint — `beforeinstallprompt` fires once and early.
 */
export function initInstallPrompt() {
  window.addEventListener('beforeinstallprompt', e => {
    // Suppress Chrome's own mini-infobar so the ask happens at the streak
    // moment below rather than on arrival.
    e.preventDefault();
    _deferred = e;
  });
  window.addEventListener('appinstalled', () => {
    _deferred = null;
    writeState({ installed: true });
    logAnalyticsEvent('pwa_installed', {});
  });
}

/**
 * Whether it's worth asking right now.
 * @returns {'prompt'|'ios'|null} the flavour of ask, or null to stay quiet
 */
export function installPromptKind() {
  if (isStandalone()) return null;
  const st = readState();
  if (st.installed || st.dismissed) return null;
  if (_deferred) return 'prompt';
  if (isIosSafari()) return 'ios';
  return null;
}

/** Remembers a "not now" so the prompt never reappears for this visitor. */
export function dismissInstallPrompt(reason = 'dismissed') {
  writeState({ dismissed: true });
  logAnalyticsEvent('pwa_prompt_dismissed', { reason });
}

/**
 * Replays the captured install dialog. Must be called from a user gesture.
 * @returns {Promise<'accepted'|'dismissed'|'unavailable'>}
 */
export async function showInstallPrompt() {
  if (!_deferred) return 'unavailable';
  const evt = _deferred;
  // Single-use: the captured event cannot be replayed after prompt() resolves,
  // so drop the reference before awaiting rather than leaving a dead one around
  // for a second tap to fire at.
  _deferred = null;
  try {
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    logAnalyticsEvent('pwa_prompt_result', { outcome });
    if (outcome !== 'accepted') writeState({ dismissed: true });
    return outcome === 'accepted' ? 'accepted' : 'dismissed';
  } catch (_) {
    return 'unavailable';
  }
}
