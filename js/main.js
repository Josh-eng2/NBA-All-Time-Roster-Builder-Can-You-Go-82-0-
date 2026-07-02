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
import { S, startGame, COACHES, pick } from './logic/state.js';
import { logAnalyticsEvent }          from './utils/firebase.js';
// events.js is imported for its side-effect: attaching window helpers
// (closeLeaderboardModal) needed by inline onclick in rendered HTML.
import { doSpin } from './ui/events.js';

const RETURNING_KEY = 'nba820_returning';

/**
 * Cold open — a brand-new visitor never sees a menu. They land mid-draft
 * with a coach auto-assigned and the decade wheel already spinning.
 * Mode, coach, and era choices are introduced from run 2 onward, once the
 * player can actually evaluate them.
 */
function isFirstVisit() {
  try {
    if (localStorage.getItem(RETURNING_KEY)) return false;
    localStorage.setItem(RETURNING_KEY, '1');
    return true;
  } catch (e) {
    return false; // storage blocked — fall back to the normal menu flow
  }
}

async function init() {
  try {
    await loadDatabase();          // populates DB export
    applySecondaryPositions();     // mutates DB in-memory: adds secondaryPos to every player

    if (isFirstVisit()) {
      S.mode           = 'solo';
      S.currentPlayer  = 1;
      S.p1             = null;
      S.takenPlayerIds = new Set();
      S.coach          = pick(COACHES).id;
      startGame('all');
      S.coldOpen = true;           // set after startGame — it replaces S
      logAnalyticsEvent('cold_open_start', { coach: S.coach });
      render();
      doSpin();                    // wheel is already turning when they look up
      return;
    }

    render();                      // returning players: normal mode-select flow
  } catch (err) {
    // loadDatabase already updates the overlay with the error + retry button,
    // so we only need to log here for debugging.
    console.error('[82-0] init failed:', err);
  }
}

init();
