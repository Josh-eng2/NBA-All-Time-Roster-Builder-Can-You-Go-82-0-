/**
 * js/main.js — Orchestrator / Entry Point
 *
 * This is the ONLY script loaded by index.html (as type="module").
 * It wires together the data loader, renderer, and event system.
 * All other modules are imported transitively from here.
 */

import { loadDatabase }               from './data/players.js';
import { applySecondaryPositions }    from './logic/positions.js';
import { render, showToast }          from './ui/render.js';
import { S, startGame } from './logic/state.js';
import { logAnalyticsEvent, consumeRedirectSignIn, consumeEmailLinkSignIn } from './utils/firebase.js';
import { isReturningPlayer }          from './utils/storage.js';
import { syncOnSignIn }               from './utils/cloudSync.js';
import { cgLoadingStart, cgLoadingStop, initCrazyGamesData } from './utils/crazygames.js';
// events.js is imported for its side-effect: attaching window helpers
// (closeLeaderboardModal) needed by inline onclick in rendered HTML.
import { doSpin } from './ui/events.js';

/**
 * Google and email-link sign-in both complete via a full page reload rather
 * than an in-page callback (see js/utils/firebase.js's file-header note on
 * why Google uses signInWithRedirect, not a popup) — so neither the account
 * modal nor any other UI state can be assumed to still be around by the time
 * the sign-in actually finishes. This runs on every boot, resolves to
 * nothing on the overwhelming majority of ordinary page loads, and only
 * does anything on the one reload that completes a sign-in: sync progress
 * and confirm it with a toast. Deliberately not awaited in init() — it
 * shouldn't delay the player seeing the game.
 */
async function completePendingSignIn() {
  let user = null;
  try { user = await consumeRedirectSignIn(); }
  catch (err) { console.warn('[82-0] Google redirect sign-in failed', err); }
  if (!user) {
    try { user = await consumeEmailLinkSignIn(); }
    catch (err) { console.warn('[82-0] email link sign-in failed', err); }
  }
  if (!user) return;
  logAnalyticsEvent('account_signed_in');
  try {
    await syncOnSignIn(user.uid);
    showToast(`Signed in as ${user.displayName || user.email || 'your account'} — progress synced`);
  } catch (err) {
    console.warn('[82-0] post-sign-in sync failed', err);
    showToast('Signed in — progress will sync on your next save');
  }
}

/**
 * Cold open — a brand-new visitor never sees a menu. They land mid-draft
 * with a coach auto-assigned and the decade wheel already spinning.
 * Mode, coach, and era choices are introduced from run 2 onward, once the
 * player can actually evaluate them.
 *
 * The returning-player flag is NOT set here — it's earned when the hook
 * completes (season simulated) or the player reaches the menus. A bounce
 * mid-draft means the full cold open plays again next visit.
 */
async function init() {
  cgLoadingStart();
  completePendingSignIn(); // fire-and-forget — see its own doc comment
  // Must resolve before anything below reads/writes saved progress (Legends,
  // Trophy Room, personal bests) — decides whether those go through the
  // CrazyGames Data Module or plain localStorage.
  await initCrazyGamesData();
  try {
    await loadDatabase();          // populates DB export
    applySecondaryPositions();     // mutates DB in-memory: adds secondaryPos to every player

    if (!isReturningPlayer()) {
      S.mode           = 'solo';
      S.currentPlayer  = 1;
      S.p1             = null;
      // Always Jackson — the most legible system for a zero-context player,
      // and the rigged first GOAT immediately lights up his star meter.
      // No invisible die roll deciding the first impression.
      S.coach          = 'jackson';
      startGame('all');
      S.coldOpen = true;           // set after startGame — it replaces S
      logAnalyticsEvent('cold_open_start', { coach: S.coach });
      render();
      cgLoadingStop();
      doSpin();                    // wheel is already turning when they look up
      return;
    }

    render();                      // returning players: normal mode-select flow
    cgLoadingStop();
  } catch (err) {
    console.error('[82-0] init failed:', err);
    cgLoadingStop();
    // Replace the "Loading players…" spinner with an actual error — otherwise
    // a failed init leaves the overlay spinning forever with no way out.
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.innerHTML = `
        <h1 style="font-size:22px;font-weight:900;margin:0 0 8px">Something went wrong</h1>
        <p style="margin:0 0 20px;font-size:14px;color:var(--muted-fg);max-width:360px">
          The game failed to start. Check your connection and try again.
        </p>
        <button onclick="location.reload()" style="padding:10px 24px;border-radius:12px;border:none;
          background:var(--primary);color:#fff;font-weight:700;font-size:14px;cursor:pointer;
          font-family:inherit">Reload</button>`;
    }
  }
}

init();
