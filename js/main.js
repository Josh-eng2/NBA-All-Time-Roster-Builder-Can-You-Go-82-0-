/**
 * js/main.js — Orchestrator / Entry Point
 *
 * This is the ONLY script loaded by index.html (as type="module").
 * It wires together the data loader, renderer, and event system.
 * All other modules are imported transitively from here.
 */

import { loadDatabase }             from './data/players.js';
import { applySecondaryPositions }  from './logic/positions.js';
import { render }                   from './ui/render.js';
// events.js is imported for its side-effect: attaching window helpers
// (closeLeaderboardModal) needed by inline onclick in rendered HTML.
import './ui/events.js';

async function init() {
  try {
    await loadDatabase();          // populates DB export
    applySecondaryPositions();     // mutates DB in-memory: adds secondaryPos to every player
    render();                      // kicks off the coach-select phase
  } catch (err) {
    // loadDatabase already updates the overlay with the error + retry button,
    // so we only need to log here for debugging.
    console.error('[82-0] init failed:', err);
  }
}

init();
