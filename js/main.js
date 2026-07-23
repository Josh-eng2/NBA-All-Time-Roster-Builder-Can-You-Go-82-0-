/**
 * js/main.js — Orchestrator / Entry Point
 *
 * This is the ONLY script loaded by index.html (as type="module").
 * It wires together the data loader, renderer, and event system.
 * All other modules are imported transitively from here.
 */

import { loadDatabase }               from './data/players.js';
import { applySecondaryPositions }    from './logic/positions.js';
import { render }                     from './ui/render.js';
import { S, startGame } from './logic/state.js';
import { logAnalyticsEvent }          from './utils/firebase.js';
import { isReturningPlayer }          from './utils/storage.js';
import { cgLoadingStart, cgLoadingStop, initCrazyGamesData } from './utils/crazygames.js';
// events.js is imported for its side-effect: attaching window helpers
// (closeLeaderboardModal) needed by inline onclick in rendered HTML.
import { doSpin } from './ui/events.js';

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
    // Honor deep-link hashes after the menu paints (e.g. #/daily).
    try {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (_) {
      // HashChangeEvent may be unavailable in older engines — click path still works.
    }
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
