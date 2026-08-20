/**
 * js/ui/events.js — Event Listeners & Game Action Handlers
 *
 * Exports:
 *   bindEvents()    — attaches the single delegated click listener to #app
 *   confirmLeave()  — modal guard when leaving an in-progress draft
 *
 * Side-effects on load:
 *   window.closeLeaderboardModal is set so the inline onclick in the
 *   leaderboard modal HTML (rendered by storage.js) can call it.
 */

import {
  S, startGame, startGame1v1, POSITIONS, TOTAL_ROUNDS,
  TEAMS, DECADES, COACHES, CPU_TEAMS, pick, pickCosmetic, buildBracket, getPlayerSeed, SNAKE_ORDER,
  getUtcDateString, seedDailyRng, clearDailyRng,
} from '../logic/state.js';
import {
  spinResult, spinResultAtLeast, getAvailablePlayers, availableDecades,
  playerTier, rosterFull, getSkips, useSkip,
} from '../logic/draft.js';
import { simulateSeason, simulateSeries, simulateHeadToHeadSeries, simulateDynastySeries } from '../logic/simulation.js';
import { applyPlayoffRound } from '../logic/playoffs.js';
import {
  saveLeaderboard, saveToTrophyRoom, markReturning, recordLegends,
  showLeaderboardModal, closeLeaderboardModal,
  showGlobalLeaderboardModal, closeGlobalLeaderboardModal,
  getDailyStatus, markDailyPlayed, showDailyLeaderboardModal, closeDailyLeaderboardModal,
  showDailyStatsModal, closeDailyStatsModal,
  saveModeLeaderboard, getDynastyDuelStatus, markDynastyDuelPlayed,
} from '../utils/storage.js';
import { submitGlobalScore, submitDailyScore, logAnalyticsEvent } from '../utils/firebase.js';
import { cgGetItem, cgSetItem } from '../utils/crazygames.js';
import { gdShowAd, gdShowRewardedAd } from '../utils/gamedistribution.js';
import { buildShareCardBlob, buildShareCaption } from './shareCard.js';
import { getDailyChallenge, checkPickLegal, evaluateObjective, dailyScore } from '../logic/challenge.js';
import { pickDynastyForPlay, dynastyDuelScore } from '../logic/dynastyDuel.js';
import { chooseAiPick, bestAiSlot } from '../logic/aiDraft.js';
import { isDualDraft, isBlindDraft, getModeConfig, fansFirstScore, fansFirstPassed } from '../logic/modes.js';
import {
  encodeBoardCode, decodeBoardCode, isRematchableMode,
  buildRematchUrl, buildDailyUrl, buildPlainUrl,
} from '../logic/rematch.js';
import { showInstallPrompt, dismissInstallPrompt } from '../utils/install.js';
import { seasonTier } from '../logic/seasonTier.js';
import {
  render, $app, fmtDecadeShort, showToast,
  computeAutopsy, withConfetti, showTeamReportModal, closeTeamReportModal,
} from '../ui/render.js'; // circular — safe (used only inside function bodies)

// Expose modal close helpers globally — inline onclicks in modal HTML are outside #app
window.closeLeaderboardModal       = closeLeaderboardModal;
window.closeGlobalLeaderboardModal = closeGlobalLeaderboardModal;
window.closeDailyLeaderboardModal  = closeDailyLeaderboardModal;
window.closeDailyStatsModal        = closeDailyStatsModal;
window.closeTeamReportModal        = closeTeamReportModal;
window.runItBackFromReport         = runItBackFromReport;

// ── Event binding ─────────────────────────────────────────────────────────────

// A single permanent delegated listener. Calling bindEvents() multiple times
// is safe — the guard ensures the listener is only ever attached once.
let _bound = false;
let _submittingGlobal = false;

export function bindEvents() {
  if (_bound) return;
  _bound = true;
  $app.addEventListener('click', handleClick);
  window.addEventListener('hashchange', handleHashRoute);
}

const HASH_ROUTE_MAP = {
  daily: 'mode-daily',
  classic: 'mode-solo',
  solo: 'mode-solo',
  blind: 'mode-blind',
  balliq: 'mode-blind',
  '1v1': 'mode-1v1',
  challenges: 'open-more-modes',
  trophies: 'view-trophies',
  legends: 'view-legends',
  defense: 'mode-defense',
  fans: 'mode-fans',
  dynasty: 'mode-dynasty-duel',
  'gm-ai': 'mode-gm-ai',
  rematch: 'mode-rematch',
  era: 'mode-era',
};

/**
 * Splits the hash into its route and query half — `#/rematch?c=a01f…` carries
 * a payload, every other route is bare. Returns null for an absent or empty
 * hash so callers can treat "no deep link" as one case.
 * @returns {{ base: string, params: URLSearchParams }|null}
 */
function parseHashRoute() {
  const raw = (location.hash || '').replace(/^#\/?/, '');
  if (!raw || raw === '/') return null;
  const q    = raw.indexOf('?');
  const base = (q >= 0 ? raw.slice(0, q) : raw).toLowerCase();
  if (!base) return null;
  let params;
  try { params = new URLSearchParams(q >= 0 ? raw.slice(q + 1) : ''); }
  catch (_) { params = new URLSearchParams(); }
  return { base, params };
}

/** True when the current URL hash matches a known deep-link route (e.g.
 *  #/daily) — used by main.js to decide whether a first-time visitor with a
 *  shared link should skip the cold-open draft and land on that route
 *  instead of having the hash silently dropped. */
export function hasKnownHashRoute() {
  const route = parseHashRoute();
  return !!route && !!HASH_ROUTE_MAP[route.base];
}

/** Deep-link hashes from the mode-select screen (e.g. #/daily, #/trophies). */
function handleHashRoute() {
  if (S.phase !== 'mode-select' && S.phase !== 'more-modes') return;
  const route = parseHashRoute();
  if (!route) return;
  const action = HASH_ROUTE_MAP[route.base];
  if (!action) return;
  if (action === 'mode-rematch') { startRematch(route.params.get('c')); return; }
  if (action === 'mode-era')     { startEraRun(route.params.get('d')); return; }
  if ((action === 'mode-defense' || action === 'mode-fans' || action === 'mode-dynasty-duel' || action === 'mode-gm-ai')
      && S.phase === 'mode-select') {
    dispatch('open-more-modes');
  }
  dispatch(action);
}

/**
 * Opens a run on a friend's exact board. A code that fails to decode (stale
 * link, truncated paste, a TEAMS reorder that invalidated the wire format)
 * drops the player on the menu with an explanation rather than starting a
 * "rematch" against a board that isn't the one they were sent.
 * @param {string|null} code
 */
function startRematch(code) {
  const decoded = decodeBoardCode(code);
  if (!decoded) {
    logAnalyticsEvent('rematch_link_invalid', {});
    showToast("That challenge link isn't valid — pick a mode to play");
    return;
  }
  S.mode          = 'rematch';
  S.currentPlayer = 1;
  S.p1            = null;
  S.dailyChallenge = null;
  S.dynastyOpponent = null;
  S.rematch       = decoded;   // preserved across the startGame() reset
  doStartGame('all');
  logAnalyticsEvent('rematch_started', { target_wins: decoded.wins, style: decoded.style });
  render();
}

/**
 * Starts a Classic run locked to one decade. This is what the generated era
 * pages (eras/1990s.html and friends) link to: a reader who just scrolled the
 * whole 1990s pool should land in a 1990s draft, not on the menu.
 * @param {string|null} decade
 */
function startEraRun(decade) {
  if (!DECADES.includes(decade)) { showToast('Unknown era — pick a mode to play'); return; }
  S.mode = 'solo';
  S.currentPlayer = 1;
  S.p1 = null;
  S.dailyChallenge = null;
  S.dynastyOpponent = null;
  S.rematch = null;
  doStartGame(decade);
  // doStartGame -> startGame() already set selectedEra from the argument; lock
  // it so the header picker can't quietly undo the link's whole point.
  S.eraLocked = true;
  logAnalyticsEvent('era_link_started', { era: decade });
  render();
}

function handleClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  dispatch(btn.dataset.action);
}

// ── Action dispatcher ─────────────────────────────────────────────────────────

function dispatch(action) {
  // Block human input while the AI GM is drafting
  if (S.mode === 'gm-ai' && S.currentPlayer === 2 && S.phase === 'drafting') {
    const blocked = action === 'spin' || action === 'skip-team' || action === 'skip-decade'
      || action.startsWith('draft-pick-') || action.startsWith('place-')
      || action.startsWith('coach-pick-') || action === 'coach-picker-toggle';
    if (blocked) return;
  }
  // ── Mode selection ─────────────────────────────────────────────────────────
  if (action === 'mode-solo') {
    S.mode = 'solo'; S.currentPlayer = 1; S.p1 = null; S.dailyChallenge = null;
    doStartGame('all'); return;
  }
  if (action === 'mode-1v1') {
    S.mode = '1v1'; S.currentPlayer = 1; S.p1 = null; S.dailyChallenge = null;
    doStartGame('all'); return;
  }
  if (action === 'mode-blind') {
    S.mode = 'blind'; S.currentPlayer = 1; S.p1 = null; S.dailyChallenge = null;
    doStartGame('all'); return;
  }
  if (action === 'mode-gm-ai') {
    S.mode = 'gm-ai'; S.currentPlayer = 1; S.p1 = null; S.dailyChallenge = null; S.dynastyOpponent = null;
    doStartGame('all'); return;
  }
  if (action === 'mode-defense') {
    S.mode = 'defense'; S.currentPlayer = 1; S.p1 = null; S.dailyChallenge = null; S.dynastyOpponent = null;
    doStartGame('all'); return;
  }
  if (action === 'mode-fans') {
    S.mode = 'fans'; S.currentPlayer = 1; S.p1 = null; S.dailyChallenge = null; S.dynastyOpponent = null;
    doStartGame('all'); return;
  }
  if (action === 'mode-dynasty-duel') {
    const status = getDynastyDuelStatus();
    const opponent = pickDynastyForPlay({ excludeName: status.lastOpponentName });
    S.mode = 'dynasty-duel'; S.currentPlayer = 1; S.p1 = null; S.dailyChallenge = null;
    S.dynastyOpponent = opponent;
    doStartGame('all');
    S.teamSkips = 0;
    S.decadeSkips = 0;
    logAnalyticsEvent('dynasty_duel_started', { opponent: opponent.name, week: opponent.weekKey });
    render(); return;
  }
  if (action === 'open-more-modes') {
    S.phase = 'more-modes';
    render(); return;
  }
  if (action === 'more-modes-back') {
    S.phase = 'mode-select';
    render(); return;
  }
  if (action === 'mode-daily') {
    if (getDailyStatus().playedToday) { render(); return; } // already played — mode-select shouldn't even show the button
    const today = getUtcDateString();
    const ch    = getDailyChallenge(today);
    S.mode = 'daily'; S.currentPlayer = 1; S.p1 = null;
    // The day's challenge must be on S BEFORE startGame runs — locked-player
    // challenges pre-fill their star inside the state reset.
    S.dailyChallenge = ch;
    doStartGame('all');
    // Fixed era + zero skips: every player must draw from the identical
    // decade pool in the identical order for the shared board to hold.
    // Era-restricted challenges pin the era instead of 'all' — still the
    // same deterministic sequence for everyone.
    S.dailyDate   = today;
    S.selectedEra = ch.params.era || 'all';
    S.eraLocked   = true;
    S.teamSkips   = 0;
    S.decadeSkips = 0;
    seedDailyRng(today);
    logAnalyticsEvent('daily_started', { challenge: ch.id, date: today });
    render(); return;
  }
  if (action === 'open-daily-leaderboard') { showDailyLeaderboardModal(); return; }
  if (action === 'open-daily-stats')       { showDailyStatsModal(); return; }
  if (action === 'submit-daily')           { doSubmitDaily();             return; }
  // ── Coach (in-draft chip) & Era (header picker) ────────────────────────────
  // Coach lives on the drafting screen; era lives in the header. Both lock on first spin.
  if (action.startsWith('coach-pick-')) {
    if (!S.coachLocked) {
      S.coach = action.slice(11);
      S.coachPickerOpen = false;
      if (S.mode === 'gm-ai') S.p1Coach = S.coach;
    }
    render(); return;
  }
  if (action === 'coach-picker-toggle') {
    if (!S.coachLocked) {
      S.coachPickerOpen = !S.coachPickerOpen;
      if (S.coachPickerOpen) S.eraPickerOpen = false;
    }
    render(); return;
  }
  if (action === 'era-picker-toggle') {
    if (!S.eraLocked) {
      S.eraPickerOpen = !S.eraPickerOpen;
      if (S.eraPickerOpen) S.coachPickerOpen = false;
    }
    render(); return;
  }
  if (action === 'era-picker-close') {
    S.eraPickerOpen = false;
    render(); return;
  }
  if (action.startsWith('era-pick-')) { setEra(action.slice(9)); return; }

  // ── Navigation ─────────────────────────────────────────────────────────────
  // Daily Challenge is one shot — refuse mid-run abandon/re-draft so players
  // can't throw away a bad board and spin again before the day locks.
  // Dynasty Duel is unlimited — Restart / new roster are allowed.
  if (action === 'restart') {
    if (S.mode === 'daily') return;
    confirmLeave(() => { S.mode = null; S.phase = 'mode-select'; S.coach = null; S.p1 = null; S.dailyChallenge = null; S.dynastyOpponent = null; render(); gdShowAd(); }); return;
  }
  if (action === 'draft-new-roster') { startFreshDraft(); return; }
  if (action === 'view-trophies')    { S.phase = 'trophy-room'; render(); return; }
  if (action === 'view-legends')     { S.legendsReturnPhase = S.phase; S.phase = 'legends'; render(); return; }
  if (action === 'legends-back')     { S.phase = S.legendsReturnPhase || 'mode-select'; render(); return; }
  if (action === 'back-to-menu')     { S.mode = null; S.phase = 'mode-select'; S.p1 = null; S.dailyChallenge = null; S.dynastyOpponent = null; render(); gdShowAd(); return; }
  if (action === 'series-play-again') { S.mode = null; S.phase = 'mode-select'; S.p1 = null; S.seriesResult = null; S.seriesRevealedCount = 0; S.dynastyOpponent = null; render(); gdShowAd(); return; }
  if (action === 'begin-series') { S.phase = 'series-sim'; S.seriesRevealedCount = 0; render(); return; }
  if (action === 'sim-next-game') { S.seriesRevealedCount = Math.min((S.seriesRevealedCount || 0) + 1, S.seriesResult.games.length); render(); return; }
  // renderSeriesResult fires its own once-per-series confetti for every mode
  // (guarded by S.seriesConfettiFired) — firing another blast here for
  // gm-ai/dynasty wins doubled the celebration on the same frame.
  if (action === 'series-to-recap') { S.phase = 'series-result'; render(); return; }

  // ── Draft actions ──────────────────────────────────────────────────────────
  if (action === 'spin')         { doSpin();       return; }
  if (action === 'skip-team')    { doSkipTeam();   return; }
  if (action === 'skip-decade')  { doSkipDecade(); return; }
  if (action === 'watch-ad-skips') { doWatchAdForSkips(); return; }
  if (action.startsWith('draft-pick-')) {
    if (S.spinState === 'spinning') return;
    const idx = parseInt(action.slice(11), 10);
    const p   = S.draftBoard[idx];
    if (!p) { render(); return; }
    // Toggle off if the same card is tapped again.
    if (S.selectedPlayer?.id === p.id) {
      S.selectedPlayer = null;
      render();
      return;
    }
    S.selectedPlayer = p;
    // One-tap draft: auto-place into the first empty preferred slot
    // (natural pos, then secondary). Falls back to "tap a slot" only when
    // every preferred slot is already filled.
    // Ball IQ (blind): never auto-place — placing into the natural slot would
    // leak the position the mode asks you to know by memory.
    if (S.mode !== 'blind') {
      const roster = isDualDraft()
        ? (S.currentPlayer === 1 ? S.p1Roster : S.p2Roster)
        : S.roster;
      const preferred = [p.pos, ...(p.secondaryPos || [])].filter(Boolean);
      const autoSlot = preferred.find(pos => roster && !roster[pos]);
      if (autoSlot) {
        if (placePlayer(autoSlot)) {
          announceA11y(`Drafted ${p.name} to ${autoSlot}`);
        } else {
          render();
          announceA11y(`Selected ${p.name}. Tap a roster slot to place them.`);
        }
        return;
      }
    }
    render();
    announceA11y(`Selected ${p.name}. Tap a roster slot to place them.`);
    return;
  }
  if (action.startsWith('place-')) {
    const pos = action.slice(6);
    placePlayer(pos);
    return;
  }

  // ── Season & playoffs ──────────────────────────────────────────────────────
  if (action === 'simulate')            { doSimulate();          return; }
  if (action === 'save-run')             { doSaveRun();           return; }
  if (action === 'advance-to-playoffs') { doAdvanceToPlayoffs(); return; }
  if (action === 'sim-next-round')      { doSimNextRound();      return; }
  if (action === 'sim-all-playoffs')    { doSimAllPlayoffs();    return; }
  if (action === 'playoffs-continue')   {
    S.playoffs.pendingReveal = false;
    render();
    // Confetti was deferred while the filled bracket was on hold — the
    // celebration belongs to the champion splash, not the bracket screen.
    if (S.playoffs.champion) fireChampionConfetti();
    return;
  }

  // ── UI helpers ─────────────────────────────────────────────────────────────
  if (action === 'share')                  { doShare('feed');                    return; }
  if (action === 'share-story')            { doShare('story');                   return; }
  if (action === 'copy-challenge-link')    { doCopyChallengeLink();              return; }
  if (action === 'install-app')            { doInstallApp();                     return; }
  if (action === 'dismiss-install')        { dismissInstallPrompt('not_now'); render(); return; }
  if (action === 'open-leaderboard')       { showLeaderboardModal();             return; }
  if (action === 'open-global-leaderboard'){ showGlobalLeaderboardModal();       return; }
  if (action === 'submit-global')          { doSubmitGlobal();                   return; }
  if (action === 'toggle-theme')           { toggleTheme();                      return; }
  if (action === 'open-team-report')       { showTeamReportModal();              return; }

  render(); // fallback — re-render for unhandled actions
}

/** Abandons the current roster and returns to mode-select. Shared by the
 *  results-screen "Build Another" flow and the Team Report autopsy's
 *  "Run It Back" CTA. Daily Challenge is one attempt — never offered there
 *  (both call sites already gate on that before reaching here). */
function startFreshDraft() {
  if (S.mode === 'daily') return;
  S.mode = null; S.phase = 'mode-select'; S.coach = null; S.p1 = null; S.dailyChallenge = null; S.dynastyOpponent = null;
  S.rematch = null; // a fresh draft is never still chasing a shared board
  render();
  gdShowAd();
}

/** "Run It Back" inside the Team Report popup — the popup is mounted outside
 *  #app (see showTeamReportModal), so its buttons use inline onclick + a
 *  window-bound export instead of data-action delegation. */
export function runItBackFromReport() {
  closeTeamReportModal();
  startFreshDraft();
}

// ── Game lifecycle ────────────────────────────────────────────────────────────

function toggleTheme() {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  if (next === 'dark') {
    html.setAttribute('data-theme', 'dark');
  } else {
    html.removeAttribute('data-theme');
  }
  try { localStorage.setItem('nba820_theme', next); } catch (e) {}
  render();
}

function setEra(era) {
  if (S.phase !== 'drafting' || S.eraLocked) return;
  if (isDualDraft()) {
    S.p1Era = era;
    S.p2Era = era;
    S.selectedEra = era;
  } else {
    S.selectedEra = era;
  }
  S.eraPickerOpen = false;
  render();
}

function doStartGame(era = 'all') {
  clearDailyRng(); // every draft (re)start begins real-random; mode-daily re-seeds right after this returns
  if (S.mode === '1v1') {
    // Single shared era — no per-player coach selection, launch draft immediately
    S.p1Coach = null;
    S.p2Coach = null;
    S.p1Era   = era;
    S.p2Era   = era;
    startGame1v1();
    logAnalyticsEvent('1v1_draft_started', { era });
    render(); return;
  }
  if (S.mode === 'gm-ai') {
    if (!S.coach) {
      let remembered = null;
      try { remembered = localStorage.getItem('nba820_coach'); } catch (e) {}
      S.coach = COACHES.some(c => c.id === remembered) ? remembered : 'jackson';
    }
    S.p1Coach = S.coach;
    S.p2Coach = pick(COACHES).id;
    S.p1Era   = era;
    S.p2Era   = era;
    startGame1v1();
    logAnalyticsEvent('gm_ai_draft_started', { era, coach: S.p1Coach, aiCoach: S.p2Coach });
    render(); return;
  }
  // Default coach: last one used, else the recommended starter system.
  // Changeable from the drafting screen until the first spin locks it.
  if (!S.coach) {
    let remembered = null;
    try { remembered = localStorage.getItem('nba820_coach'); } catch (e) {}
    S.coach = COACHES.some(c => c.id === remembered) ? remembered : 'jackson';
  }
  startGame(era);
  logAnalyticsEvent('game_started', { era, coach: S.coach ?? 'none', mode: S.mode ?? 'solo' });
  render();
}

/**
 * Shows a confirmation modal before abandoning an active draft.
 * Calls fn() immediately if there is nothing to lose.
 * @param {() => void} fn
 * @param {{ title?: string, confirmLabel?: string }} [opts] — the only current
 *   caller is the Restart button, so the copy defaults to match it; pass an
 *   override if this is ever reused for a different leave action.
 */
export function confirmLeave(fn, opts = {}) {
  const { title = 'Restart Run?', confirmLabel = 'Yes, Restart' } = opts;
  const safe = ['results', 'playoffs', 'trophy-room'];
  if (safe.includes(S.phase)) { fn(); return; }
  // A double-click (or two rapid nav taps) before the first overlay mounts
  // would otherwise stack a second one on top of it — same guard pattern
  // storage.js's modal openers use.
  document.getElementById('_confirm-leave-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = '_confirm-leave-overlay';
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;' +
    'align-items:center;justify-content:center;z-index:9999';
  overlay.innerHTML = `
    <div role="dialog" aria-modal="true" aria-labelledby="_cl_title" class="confirm-leave-card">
      <p id="_cl_title" class="confirm-leave-card__title">${title}</p>
      <p class="confirm-leave-card__body">Your progress will be lost.</p>
      <div class="confirm-leave-card__actions">
        <button id="_cl_cancel" type="button" class="confirm-leave-card__btn confirm-leave-card__btn--cancel">Cancel</button>
        <button id="_cl_confirm" type="button" class="confirm-leave-card__btn confirm-leave-card__btn--confirm">${confirmLabel}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#_cl_cancel').onclick  = () => { close(); render(); };
  overlay.querySelector('#_cl_confirm').onclick = () => { close(); fn(); };
  overlay.addEventListener('keydown', e => { if (e.key === 'Escape') { close(); render(); } });
  setTimeout(() => overlay.querySelector('#_cl_cancel').focus(), 0);
}

// ── Draft mechanics ───────────────────────────────────────────────────────────

export function doSpin() {
  if (S.spinState === 'spinning') return;

  // First spin commits the coach — the system is chosen with zero players
  // seen, so the system meter is an objective rather than a post-hoc score.
  // Pure 1v1 has no coach; GM vs AI does.
  if (S.mode !== '1v1' && !S.coachLocked) {
    S.coachLocked     = true;
    S.coachPickerOpen = false;
    if (S.mode === 'gm-ai') S.p1Coach = S.coach;
    try { if (S.coach) localStorage.setItem('nba820_coach', S.coach); } catch (e) {}
  }

  if (!S.eraLocked) {
    S.eraLocked     = true;
    S.eraPickerOpen = false;
  }

  S.spinState      = 'spinning';
  S.selectedPlayer = null;
  S.draftBoard     = [];
  render();

  const activeEra  = isDualDraft()
    ? (S.currentPlayer === 1 ? (S.p1Era || 'all') : (S.p2Era || 'all'))
    : (S.selectedEra || 'all');
  const eraLocked  = activeEra !== 'all';
  const spinGameId = S.gameId; // capture so a mid-spin restart can't mutate the new game
  let ticks = 0;
  const total    = 14;
  const interval = setInterval(() => {
    // A restart to the menu keeps the same gameId, so also bail when the
    // draft screen is gone — otherwise the final tick mutates stale state.
    if (S.gameId !== spinGameId || S.phase !== 'drafting') { clearInterval(interval); return; }
    ticks++;
    const teamEl   = document.getElementById('slot-team');
    const decadeEl = document.getElementById('slot-decade');
    const decPool  = availableDecades();
    // Tumble frames are pure decoration — pickCosmetic keeps them off the
    // seeded daily stream, whose draw count must not depend on DOM state.
    if (teamEl)   teamEl.textContent   = pickCosmetic(TEAMS);
    if (decadeEl) decadeEl.textContent = eraLocked
      ? activeEra
      : pickCosmetic(decPool.length ? decPool : DECADES);

    if (ticks >= total) {
      clearInterval(interval);
      // Escalating rounds for pity-enabled modes; dual draft stays pure random.
      const usePity = getModeConfig().pity;
      const rigGoat = usePity && (isDualDraft() ? false : S.round === 0);
      const rigStar = usePity && !rigGoat && !isDualDraft() && S.round <= 2;
      const pity    = usePity && !rigGoat && !rigStar && !isDualDraft() && (S.drySpins ?? 0) >= 1;
      if (pity) logAnalyticsEvent('pity_spin_triggered', { round: S.round + 1 });
      // A rematch replays the sender's board, so the wheel is not consulted at
      // all — the rigging and pity rules above only decide where a free spin
      // lands, and this round's landing is already known.
      const forced = forcedSpin();
      const spin = forced ? forced
        : rigGoat ? spinResultAtLeast('goat')
        : (rigStar || pity) ? spinResultAtLeast('star')
        : spinResult();
      if (!spin) {
        // All player slots exhausted — reset to idle so the user isn't stuck
        S.spinState = 'idle';
        render();
        return;
      }
      recordBoardSpin(spin);
      S.currentSpin      = spin;
      S.spinState        = 'done';
      S.availablePlayers = getAvailablePlayers(spin.team, spin.decade);
      S.draftBoard       = buildDraftBoard();
      S.selectedPlayer   = null;
      updateDryCounter();
      render();
    }
  }, 90);
}

/**
 * The (team, decade) this round must land on when replaying a shared board,
 * or null to spin normally.
 *
 * Returns null if the slot has no players left for THIS drafter, which the
 * sender may not have hit: `draftedPlayerNames` blocks a player's cross-era
 * twin, so a slot whose only entry is that twin can be empty for one player
 * and stocked for the other. Spinning normally is a far better failure than
 * handing them a board with nothing on it.
 */
function forcedSpin() {
  if (S.mode !== 'rematch') return null;
  const spin = S.rematch?.board?.[S.round];
  if (!spin) return null;
  return getAvailablePlayers(spin.team, spin.decade).length ? spin : null;
}

/**
 * Records where the wheel landed for the current round, so the finished run
 * can be shared as a replayable board (logic/rematch.js). Indexed by round
 * rather than appended: a skip re-spins the same round and must overwrite it,
 * not add a sixth entry.
 */
function recordBoardSpin(spin) {
  if (isDualDraft() || !spin) return;
  if (!Array.isArray(S.boardLog)) S.boardLog = [];
  S.boardLog[S.round] = { team: spin.team, decade: spin.decade };
}

/**
 * Builds the pick board from the current availablePlayers.
 * Classic/1v1: sorted best-first by popularity.
 * HoopIQ (blind): Fisher-Yates shuffled — card order must not leak quality.
 */
function buildDraftBoard() {
  const pool = [...S.availablePlayers];
  if (isBlindDraft()) {
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
  }
  return pool.sort((a, b) => (b.popularity ?? 50) - (a.popularity ?? 50));
}

/**
 * Pity-timer bookkeeping — call whenever a new board lands.
 * A "dry" board has no star-or-better player on it. In the Daily Challenge a
 * star the day's rules forbid (rating cap, fans budget, banned decade) can't
 * be drafted, so it must not reset the counter — otherwise a board whose only
 * star is off-limits silently eats the pity spin.
 */
function updateDryCounter() {
  if (isDualDraft() || !getModeConfig().pity) return;
  const filled  = (S.mode === 'daily' && S.dailyChallenge)
    ? Object.values(S.roster || {}).filter(Boolean)
    : null;
  const hasStar = S.availablePlayers.some(p => {
    if (playerTier(p) === 'starter') return false;
    if (!filled) return true;
    const hydrated = { ...p, team: S.currentSpin?.team, decade: S.currentSpin?.decade };
    return checkPickLegal(S.dailyChallenge, hydrated, filled).legal;
  });
  S.drySpins = hasStar ? 0 : (S.drySpins ?? 0) + 1;
}

/**
 * Re-plays the slot-machine spin animation before landing on an
 * already-determined result — used by skip-team/skip-decade so a skip
 * feels like a re-spin, not an instant swap. Whichever slot didn't change
 * stays fixed on its current value throughout; the other tumbles.
 * @param {{team:string, decade:string}} spin  the predetermined landing result
 * @param {boolean} tumbleTeam
 * @param {boolean} tumbleDecade
 */
function animateSkipReveal(spin, tumbleTeam, tumbleDecade) {
  S.spinState      = 'spinning';
  S.selectedPlayer = null;
  S.draftBoard     = [];
  render();
  const spinGameId = S.gameId; // guards against a mid-spin restart
  let ticks = 0;
  const total = 14;
  const interval = setInterval(() => {
    if (S.gameId !== spinGameId || S.phase !== 'drafting') { clearInterval(interval); return; }
    ticks++;
    const teamEl   = document.getElementById('slot-team');
    const decadeEl = document.getElementById('slot-decade');
    if (teamEl)   teamEl.textContent   = tumbleTeam   ? pickCosmetic(TEAMS)   : spin.team;
    if (decadeEl) decadeEl.textContent = tumbleDecade ? pickCosmetic(DECADES) : spin.decade;

    if (ticks >= total) {
      clearInterval(interval);
      recordBoardSpin(spin);
      S.currentSpin      = spin;
      S.spinState        = 'done';
      S.availablePlayers = getAvailablePlayers(spin.team, spin.decade);
      S.draftBoard       = buildDraftBoard();
      S.selectedPlayer   = null;
      updateDryCounter();
      render();
    }
  }, 90);
}

function doSkipTeam() {
  if (getSkips().team <= 0 || !S.currentSpin || S.spinState !== 'done') { render(); return; }
  // A skip must actually change the team — exclude the current one.
  const pool = TEAMS.filter(t =>
    t !== S.currentSpin.team && getAvailablePlayers(t, S.currentSpin.decade).length > 0
  );
  if (!pool.length) { showToast('No other team has players left in this era'); render(); return; }
  useSkip('team');
  animateSkipReveal({ team: pick(pool), decade: S.currentSpin.decade }, true, false);
}

function doSkipDecade() {
  const activeEra = isDualDraft()
    ? (S.currentPlayer === 1 ? (S.p1Era || 'all') : (S.p2Era || 'all'))
    : (S.selectedEra || 'all');
  if (activeEra !== 'all')                          { render(); return; }
  // Same 'done' gate as doSkipTeam — a skip triggered mid-tumble would burn
  // the budget AND start a second interval racing the one already running.
  if (getSkips().decade <= 0 || !S.currentSpin || S.spinState !== 'done') { render(); return; }
  // A skip keeps the team — only land on eras where THIS team has players,
  // so the fallback can never silently swap the franchise mid-animation.
  const pool = availableDecades().filter(d =>
    d !== S.currentSpin.decade && getAvailablePlayers(S.currentSpin.team, d).length > 0
  );
  if (!pool.length) { showToast(`No other era has ${S.currentSpin.team} players left`); render(); return; }
  useSkip('decade');
  animateSkipReveal({ team: S.currentSpin.team, decade: pick(pool) }, false, true);
}

// GameDistribution rewarded ad → +1 team & +1 era skip, once per draft.
// Only offered where skips exist by design: daily and dynasty-duel zero
// their budgets to keep boards fair, so no ad top-up there.
let _rewardedAdBusy = false;
async function doWatchAdForSkips() {
  if (_rewardedAdBusy || S.adSkipsEarned) return;
  if (S.mode === 'daily' || S.mode === 'dynasty-duel') return;
  _rewardedAdBusy = true;
  const watched = await gdShowRewardedAd();
  _rewardedAdBusy = false;
  if (!watched) { showToast('No ad available right now — try again later'); return; }
  S.adSkipsEarned = true;
  if (S.mode === '1v1' || S.mode === 'gm-ai') {
    const k = `p${S.currentPlayer}`;
    S[`${k}TeamSkips`]   = (S[`${k}TeamSkips`]   ?? 0) + 1;
    S[`${k}DecadeSkips`] = (S[`${k}DecadeSkips`] ?? 0) + 1;
  } else {
    S.teamSkips   = (S.teamSkips   ?? 0) + 1;
    S.decadeSkips = (S.decadeSkips ?? 0) + 1;
  }
  logAnalyticsEvent('rewarded_ad_skips', { mode: S.mode });
  showToast('🎬 Reward earned — +1 Team Skip, +1 Era Skip!');
  render();
}

/** @returns {boolean} true if the player was actually placed on a roster. */
function placePlayer(pos) {
  if (!S.selectedPlayer) { render(); return false; }
  const spin   = S.currentSpin;
  const player = { ...S.selectedPlayer, team: spin?.team, decade: spin?.decade };

  // Daily Challenge — today's draft rules are hard: illegal picks never place.
  // Mode-gated to match the render-side dimming, so a stray dailyChallenge
  // left on S can never veto picks in another mode.
  if (S.mode === 'daily' && S.dailyChallenge) {
    const filled = Object.values(S.roster || {}).filter(Boolean);
    const { legal, reason } = checkPickLegal(S.dailyChallenge, player, filled);
    if (!legal) {
      showToast(`🚫 ${reason}`);
      return false;
    }
  }

  // ── Dual draft (1v1 / GM vs AI) ────────────────────────────────────────────
  if (isDualDraft()) {
    const activeRoster = S.currentPlayer === 1 ? S.p1Roster : S.p2Roster;

    if (activeRoster[pos]) {
      showToast('Slot already filled — picks are permanent!');
      return false;
    }

    if (S.draftedPlayerNames?.has(player.name)) {
      showToast('Player already drafted!');
      return false;
    }

    activeRoster[pos] = player;
    if (spin?.decade) S.usedDecades.push(spin.decade);
    S.usedPlayerIds.push(player.id);
    S.draftedPlayerNames?.add(player.name);

    if (S.currentPlayer === 1) S.p1Round++;
    else S.p2Round++;
    const pickNum = S.p1Round + S.p2Round;
    S.draftLog.push({ name: player.name, playerNum: S.currentPlayer, pick: pickNum });

    logAnalyticsEvent('player_drafted', { player: player.name, pos, playerNum: S.currentPlayer, mode: S.mode });
    S.spinState = 'idle'; S.currentSpin = null; S.availablePlayers = []; S.draftBoard = []; S.selectedPlayer = null;

    // Both rosters complete — auto-simulate series
    if (S.p1Round >= 5 && S.p2Round >= 5) {
      const p1s = POSITIONS.map(p => S.p1Roster[p]).filter(Boolean);
      const p2s = POSITIONS.map(p => S.p2Roster[p]).filter(Boolean);
      recordLegends([...p1s, ...p2s]);
      S.seriesResult       = simulateHeadToHeadSeries(p1s, S.p1Coach, p2s, S.p2Coach);
      S.seriesRevealedCount = 0;
      S.phase = 'series-preview';
      logAnalyticsEvent(S.mode === 'gm-ai' ? 'gm_ai_series_simulated' : '1v1_series_simulated', {
        winner: S.seriesResult.winner,
      });
      if (S.mode === 'gm-ai') {
        saveModeLeaderboard('gm-ai', {
          won: S.seriesResult.winner === 'p1',
          margin: Math.abs(S.seriesResult.p1Wins - S.seriesResult.p2Wins),
          strength: S.seriesResult.p1Season.strength,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        });
      }
      render(); return true;
    }

    // Snake draft turn order: 1-2-2-1-1-2-2-1-1-2
    const completedPicks = S.p1Round + S.p2Round;
    S.currentPlayer = SNAKE_ORDER[completedPicks];
    render();
    if (S.mode === 'gm-ai' && S.currentPlayer === 2 && S.p2Round < 5) {
      setTimeout(() => doAiTurn(), 750);
    }
    return true;
  }

  // ── Solo draft ─────────────────────────────────────────────────────────────
  if (S.roster[pos]) {
    showToast('Slot already filled — picks are permanent!');
    return false;
  }

  if (S.draftedPlayerNames?.has(player.name)) {
    showToast('Player already on roster!');
    return false;
  }

  S.roster[pos]      = player;
  if (spin?.decade) S.usedDecades.push(spin.decade);
  S.usedPlayerIds.push(player.id);
  S.draftedPlayerNames?.add(player.name);
  S.round++;
  logAnalyticsEvent('player_drafted', { player: player.name, pos, round: S.round });
  S.selectedPlayer = null;

  if (!rosterFull()) { doSpin(); return true; }

  S.spinState        = 'idle';
  S.currentSpin      = null;
  S.availablePlayers = [];
  S.draftBoard       = [];
  render();
  return true;
}

// ── Season simulation ─────────────────────────────────────────────────────────

/** Instant spin + pick for the AI GM (no slot-machine animation). */
function doAiTurn() {
  if (S.mode !== 'gm-ai' || S.currentPlayer !== 2 || S.phase !== 'drafting') return;
  if (S.p2Round >= 5) return;

  if (!S.coachLocked) {
    S.coachLocked = true;
    S.coachPickerOpen = false;
  }
  if (!S.eraLocked) {
    S.eraLocked = true;
    S.eraPickerOpen = false;
  }

  let spin = spinResult();
  if (!spin) {
    showToast('AI GM has no players left to draft');
    return;
  }
  S.currentSpin      = spin;
  S.availablePlayers = getAvailablePlayers(spin.team, spin.decade);
  S.draftBoard       = buildDraftBoard();
  S.spinState        = 'done';

  // Empty board — try one re-spin
  if (!S.draftBoard.length) {
    spin = spinResult();
    if (!spin) return;
    S.currentSpin      = spin;
    S.availablePlayers = getAvailablePlayers(spin.team, spin.decade);
    S.draftBoard       = buildDraftBoard();
  }

  const choice = chooseAiPick(S.draftBoard, S.p2Roster, S.p2Coach);
  if (!choice) return;
  const pos = bestAiSlot(choice, S.p2Roster);
  if (!pos) return;
  S.selectedPlayer = choice;
  placePlayer(pos);
}

function doSimulate() {
  if (S.phase !== 'drafting' || isDualDraft()) return;
  const starters = POSITIONS.map(p => S.roster[p]).filter(Boolean);

  // Dynasty Duel — skip the 82-game ticker; go straight to a best-of-7.
  if (S.mode === 'dynasty-duel') {
    const opponent = S.dynastyOpponent || pickDynastyForPlay();
    S.result = simulateSeason(starters, S.coach);
    S.result.newLegends = recordLegends(starters).length;
    S.seriesResult = simulateDynastySeries(S.result, opponent);
    S.seriesRevealedCount = 0;
    // Mirror player roster into p1 for series UI; p2 is the dynasty (no cards).
    S.p1Roster = { ...S.roster };
    S.p2Roster = { PG: null, SG: null, SF: null, PF: null, C: null };
    S.p1Coach = S.coach;
    S.p2Coach = null;

    const won = S.seriesResult.winner === 'p1';
    const score = dynastyDuelScore(S.seriesResult.p1Wins, won, S.result.strength);
    S.dynastyDuelResult = { won, score, opponentName: opponent.name, weekKey: opponent.weekKey };
    markDynastyDuelPlayed({
      weekKey: opponent.weekKey,
      opponentName: opponent.name,
      won,
      score,
      seriesWins: S.seriesResult.p1Wins,
      seriesLosses: S.seriesResult.p2Wins,
    });
    saveModeLeaderboard('dynasty-duel', {
      opponentName: opponent.name,
      won,
      score,
      weekKey: opponent.weekKey,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
    logAnalyticsEvent('dynasty_duel_series', { opponent: opponent.name, won, score });
    S.phase = 'series-preview';
    render();
    return;
  }

  S.result  = simulateSeason(starters, S.coach);
  S.runSaved = false;

  // Meta-progression: every started legend joins the permanent collection.
  S.result.newLegends = recordLegends(starters).length;

  if (S.mode === 'fans') {
    S.result.fansScore = fansFirstScore(S.result.avgPopularity, S.result.fansM, S.result.wins);
    S.result.fansPassed = fansFirstPassed(S.result.avgPopularity, S.result.wins);
  }

  logAnalyticsEvent('season_simulated', {
    wins: S.result.wins, losses: S.result.losses,
    coach: S.coach ?? 'none', era: S.selectedEra ?? 'all', mode: S.mode ?? 'solo',
  });

  // First-visit hook payoff delivered — from here on they're a veteran.
  if (S.coldOpen) markReturning();

  // Game log for the results screen's season strip, in final presented order
  // (cold-open reorder + rivalry insertion happen below).
  S.seasonGames = S.result.games;

  // Cold-open cliffhanger: lead the sequence with the season's biggest win
  // so Game 1 is a guaranteed blowout W. Reordering never changes the record.
  if (S.coldOpen && S.result.wins > 0) {
    let best = -1;
    S.seasonGames.forEach((g, i) => {
      if (g.won && (best < 0 || g.margin > S.seasonGames[best].margin)) best = i;
    });
    if (best > 0) S.seasonGames.unshift(S.seasonGames.splice(best, 1)[0]);
  }
  S.seasonGames.forEach((g, i) => { g.num = i + 1; });

  // Rivalry Night — one mid-season marquee game against an all-time great.
  // W/L stays exactly as drawn; only the opponent and score dress up.
  const rg = S.seasonGames[28 + Math.floor(Math.random() * 31)]; // games 29–59
  rg.rival  = true;
  // Cosmetic draw — the daily seed governs draft OFFERS only (state.js), so
  // season dressing must not consume from the deterministic stream.
  rg.opp    = `'` + pickCosmetic(CPU_TEAMS).name;                // "'96 Bulls"
  rg.margin = 2 + Math.floor(Math.random() * 6);                 // rivalry games are tight
  const rBase = 95 + Math.floor(Math.random() * 28);
  rg.ps   = rg.won ? rBase + Math.ceil(rg.margin / 2) : rBase - Math.floor(rg.margin / 2);
  rg.os   = rg.won ? rBase - Math.floor(rg.margin / 2) : rBase + Math.ceil(rg.margin / 2);
  rg.type = 'close';

  // Longest streak + first-loss marker — computed on the final presented
  // order (post cold-open reorder, post rival insert). The first loss of
  // the season always gets the dramatic beat, whenever it lands — that
  // moment is the biggest emotional swing an 82-0 chase can produce.
  let curStreak = 0, longestStreak = 0;
  for (const g of S.seasonGames) {
    curStreak = g.won ? curStreak + 1 : 0;
    if (curStreak > longestStreak) longestStreak = curStreak;
  }
  S.result.longestStreak = longestStreak;
  const firstLossIdx = S.seasonGames.findIndex(g => !g.won);
  if (firstLossIdx >= 0) {
    S.seasonGames[firstLossIdx].isFirstLoss  = true;
    S.seasonGames[firstLossIdx].streakBroken = firstLossIdx;
  }

  // Revenge game tagging — two passes over the ordered game log.
  // Pass 1: record the game number of the first loss to each opponent.
  // Pass 2: tag the very first rematch against that opponent (after the loss)
  //         so the ticker chip can surface the "will you get them back?" beat.
  // Rival games (CPU all-time teams) are excluded — they never rematch.
  const _firstLossAt = {};
  for (const g of S.seasonGames) {
    if (!g.won && !g.rival && g.opp && !_firstLossAt[g.opp]) _firstLossAt[g.opp] = g.num;
  }
  const _revengeMarked = new Set();
  for (const g of S.seasonGames) {
    if (!g.rival && g.opp && _firstLossAt[g.opp] && g.num > _firstLossAt[g.opp] && !_revengeMarked.has(g.opp)) {
      g.revenge = true;
      _revengeMarked.add(g.opp);
    }
  }

  // Captured BEFORE overwriting saved progress below, so the results screen
  // can tell whether this run set a new personal best.
  let _prevBestSnap = null;
  try { _prevBestSnap = JSON.parse(cgGetItem('nba820_best') || 'null'); } catch (e) {}
  S._prevBestWins = _prevBestSnap ? _prevBestSnap.wins : 0;

  // Auto-persist personal best, best streak, and last-run tip — feeds the
  // mode-select greeting without requiring a manual "Save Run".
  try {
    const prevBest = JSON.parse(cgGetItem('nba820_best') || 'null');
    if (!prevBest || S.result.wins > prevBest.wins) {
      cgSetItem('nba820_best', JSON.stringify({ wins: S.result.wins, losses: S.result.losses }));
    }
    const prevStreak = parseInt(cgGetItem('nba820_bestStreak') || '0', 10);
    if (longestStreak > prevStreak) cgSetItem('nba820_bestStreak', String(longestStreak));
    cgSetItem('nba820_lastRun', JSON.stringify({
      wins: S.result.wins, losses: S.result.losses,
      tip: computeAutopsy()?.fix || null,
    }));
  } catch (e) {}

  // Lock the Daily Challenge the moment the regular season is decided — not
  // on submit — so re-drafting the (memorized) shared board for a better
  // simulation roll can't grind the daily leaderboard.
  if (S.mode === 'daily') {
    // Verdict on the day's specific challenge (era rules, rating caps,
    // win targets, …) — decided here, alongside the play lock.
    const ch      = S.dailyChallenge;
    const verdict = ch ? evaluateObjective(ch, S) : null;
    const score   = ch ? dailyScore(ch, S) : S.result.wins * 10;
    const streak  = markDailyPlayed({
      // The day the run was seeded with, NOT the wall clock — a run that
      // crosses UTC midnight mid-sim still belongs to the day it started.
      date: S.dailyDate,
      wins: S.result.wins, losses: S.result.losses,
      chemScore: Math.round(S.result.chemScore ?? 0),
      champion: false,
      challengeId: ch?.id ?? null,
      passed:      verdict?.pass ?? false,
      score,
    });
    S.dailyResult = verdict ? { ...verdict, score, streak } : null;
    if (ch) logAnalyticsEvent('daily_completed', { challenge: ch.id, passed: verdict.pass, wins: S.result.wins });
  }

  // Rematch verdict — the whole point of the shared board is this comparison.
  // A tie counts as falling short: the challenger keeps the record until it is
  // actually beaten.
  if (S.mode === 'rematch' && S.rematch) {
    const margin = S.result.wins - S.rematch.wins;
    S.rematchResult = { beat: margin > 0, margin };
    logAnalyticsEvent('rematch_completed', {
      beat: margin > 0, margin, target_wins: S.rematch.wins, wins: S.result.wins,
    });
  }

  // Simulation is fully resolved above — land directly on the results screen,
  // no paced game-by-game reveal in between.
  if ((S._prevBestWins || 0) > 0 && S.result.wins > S._prevBestWins) {
    showToast(`🆕 New personal best — ${S.result.wins} wins!`, 2800);
  }
  S.phase = 'results';
  render();
  // Wordle-style: the Daily's Statistics modal surfaces after the day's one
  // shot lands.
  if (S.mode === 'daily') {
    const simId = S.gameId;
    setTimeout(() => {
      if (S.gameId === simId && S.phase === 'results' && S.mode === 'daily') {
        showDailyStatsModal();
      }
    }, 700);
  }
}

function buildGlobalScorePayload() {
  const coachObj = S.coach ? COACHES.find(c => c.id === S.coach) : null;
  const r        = S.result;
  return {
    teamName:    S.teamName,
    wins:        r.wins,
    losses:      r.losses,
    champion:    S.playoffs?.champion ?? false,
    coachId:     S.coach       ?? '',
    coachName:   coachObj?.name  ?? '',
    era:         S.selectedEra ?? 'all',
    chemScore:   Math.round(r.chemScore ?? 0),
    avgPopularity: r.avgPopularity ?? 50,
    fansM:       r.fansM ?? 2,
    starters:    POSITIONS.map(p => S.roster[p]?.name || '—').join(', ').slice(0, 100),
    timestampMs: Date.now(),
  };
}

async function doSaveRun() {
  if (_submittingGlobal) return;
  const input = document.getElementById('team-name-input');
  const raw   = input ? input.value.trim() : '';
  if (!raw) {
    showToast('Enter a team name');
    input?.focus();
    return;
  }
  if (raw.length < 3) {
    showToast('Team name must be at least 3 characters');
    input?.focus();
    return;
  }
  S.teamName  = raw.slice(0, 30);
  S.runSaved  = true;
  saveLeaderboard();
  if (S.mode === 'defense' && S.result) {
    saveModeLeaderboard('defense', {
      teamName: S.teamName,
      wins: S.result.wins,
      losses: S.result.losses,
      teamStocks: S.result.teamStocks ?? 0,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
  }
  if (S.mode === 'fans' && S.result) {
    saveModeLeaderboard('fans', {
      teamName: S.teamName,
      score: S.result.fansScore ?? 0,
      wins: S.result.wins,
      fansM: S.result.fansM,
      avgPopularity: S.result.avgPopularity,
      passed: !!S.result.fansPassed,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
  }
  render();

  await doSubmitGlobal();
  if (!S.globalScoreSubmitted && !S.globalSubmitError) {
    showToast('✅ Saved to your personal leaderboard!');
  }
}

// ── Global leaderboard submit ─────────────────────────────────────────────────

async function doSubmitGlobal() {
  if (S.globalScoreSubmitted || _submittingGlobal) return;
  _submittingGlobal = true;

  // Read team name from the global input; fall back to any previously saved name
  const input  = document.getElementById('global-team-name-input');
  const raw    = input ? input.value.trim() : '';
  const name   = (raw || S.teamName || '').trim();
  if (!name || name === 'Untitled Team') {
    showToast('Enter a team name (at least 3 characters)');
    input?.focus();
    _submittingGlobal = false;
    return;
  }
  if (name.length < 3) {
    showToast('Team name must be at least 3 characters');
    input?.focus();
    _submittingGlobal = false;
    return;
  }
  S.teamName   = name.slice(0, 30);

  if (!S.runSaved) {
    S.runSaved = true;
    saveLeaderboard();
  }

  // Optimistic button feedback
  const btn = document.getElementById('submit-global-btn');
  if (btn) {
    btn.disabled         = true;
    btn.textContent      = 'Submitting…';
    btn.style.opacity    = '0.7';
    btn.style.cursor     = 'not-allowed';
  }

  try {
    await submitGlobalScore(buildGlobalScorePayload());
    S.globalScoreSubmitted    = true;
    S.globalSubmitError       = null;
    S.globalSubmittedChampion = S.playoffs?.champion ?? false;
    render();
    showToast('✅ Submitted to personal & global leaderboards!');
  } catch (err) {
    S.globalSubmitError = err.message || 'Submission failed — check your connection.';
    render();
    showToast('✅ Saved to your personal leaderboard · global submit failed');
  } finally {
    _submittingGlobal = false;
  }
}

// ── Daily Challenge leaderboard submit ────────────────────────────────────────

let _submittingDaily = false;

function buildDailyScorePayload() {
  const coachObj = S.coach ? COACHES.find(c => c.id === S.coach) : null;
  const r        = S.result;
  return {
    date:        S.dailyDate || getUtcDateString(),
    teamName:    S.teamName,
    wins:        r.wins,
    losses:      r.losses,
    champion:    false, // the daily board captures the shared regular-season board only
    coachId:     S.coach       ?? '',
    coachName:   coachObj?.name  ?? '',
    chemScore:   Math.round(r.chemScore ?? 0),
    starters:    POSITIONS.map(p => S.roster[p]?.name || '—').join(', ').slice(0, 100),
    timestampMs: Date.now(),
    // Day's specific challenge — verdict decided at sim time (doSimulate)
    challengeId: S.dailyChallenge?.id     ?? '',
    passed:      S.dailyResult?.pass      ?? false,
    score:       S.dailyResult?.score     ?? (r.wins * 10),
  };
}

async function doSubmitDaily() {
  if (S.mode !== 'daily' || S.dailyScoreSubmitted || _submittingDaily) return;
  _submittingDaily = true;

  // Prefer the daily submit name field; fall back to Save Run / previously saved name.
  const dailyInput = document.getElementById('daily-team-name-input');
  const saveInput  = document.getElementById('team-name-input');
  const raw = (dailyInput?.value ?? saveInput?.value ?? '').trim();
  const name = (raw || S.teamName || '').trim();
  if (!name || name === 'Untitled Team' || name.length < 3) {
    showToast('Enter a team name (at least 3 characters)');
    (dailyInput || saveInput)?.focus();
    _submittingDaily = false;
    return;
  }
  S.teamName = name.slice(0, 30);

  const btn = document.getElementById('submit-daily-btn');
  if (btn) {
    btn.disabled      = true;
    btn.textContent   = 'Submitting…';
    btn.style.opacity = '0.7';
    btn.style.cursor  = 'not-allowed';
  }

  try {
    await submitDailyScore(buildDailyScorePayload());
    S.dailyScoreSubmitted = true;
    S.dailySubmitError    = null;
    render();
    showToast('✅ On the daily leaderboard!');
  } catch (err) {
    S.dailySubmitError = err.message || 'Submission failed — check your connection.';
    render();
    showToast('⚠️ Daily submit failed — check your connection');
  } finally {
    _submittingDaily = false;
  }
}

// ── Share ─────────────────────────────────────────────────────────────────────

function formatDailyShareLabel() {
  if (!S.dailyDate) return null;
  const label = new Date(S.dailyDate + 'T00:00:00Z')
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  // Include the day's specific challenge and verdict in the share caption —
  // "Daily Challenge — Jul 14, 2026 · 👎 Boos Only · PASSED ✅". The share
  // card itself keeps its fixed-width corner badge (shareCard.js).
  const ch  = S.dailyChallenge;
  const chBit = ch ? ` · ${ch.emoji} ${ch.title}` : '';
  const vBit  = S.dailyResult ? (S.dailyResult.pass ? ' · PASSED ✅' : ' · FAILED ✗') : '';
  return `Daily Challenge — ${label}${chBit}${vBit}`;
}

/**
 * Board code for the finished run, or null when this run can't be replayed —
 * an unshareable mode, or a board log that didn't capture all five rounds
 * (a run restored from an older save, or one that hit the exhausted-pool
 * bail-out in doSpin).
 */
export function buildRematchCode() {
  if (!S.result || !isRematchableMode(S.mode)) return null;
  const board = (S.boardLog || []).slice(0, TOTAL_ROUNDS);
  if (board.length !== TOTAL_ROUNDS || board.some(b => !b?.team || !b?.decade)) return null;
  // A rematch of a rematch keeps the original draft style, so a chain of
  // challenges on one board all play by the same rules.
  const style = S.mode === 'rematch' ? (S.rematch?.style || 'solo') : S.mode;
  return encodeBoardCode({ board, wins: S.result.wins, style });
}

function buildResultCardData() {
  const r = S.result;
  if (!r) return null;

  const tier = seasonTier(r.wins);
  const tierLabel = tier.label;
  const tierEmoji = tier.emoji;

  const starters = POSITIONS.map(pos => {
    const p = S.roster[pos];
    if (!p) return null;
    return { pos, name: p.name, team: p.team || '', decade: p.decade ? fmtDecadeShort(p.decade) : '' };
  }).filter(Boolean);

  // Link priority: a replayable board beats everything, because it's the only
  // link that makes "can you beat it?" answerable. The Daily needs no code —
  // every player already draws that day's board — so it deep-links to #/daily.
  const rematchCode = buildRematchCode();
  const shareUrl = S.mode === 'daily' ? buildDailyUrl()
    : rematchCode                     ? buildRematchUrl(rematchCode)
    : buildPlainUrl();

  return {
    wins: r.wins, losses: r.losses, winPct: r.winPct,
    chemScore: r.chemScore, longestStreak: r.longestStreak,
    tierLabel, tierEmoji,
    isChampion: !!S.playoffs?.champion,
    starters,
    dailyLabel: S.mode === 'daily' ? formatDailyShareLabel() : null,
    rematchCode,
    shareUrl,
    // Set when this run was itself a rematch — the caption leads with the
    // head-to-head rather than the bare record.
    beatTarget: S.mode === 'rematch' && S.rematch
      ? { targetWins: S.rematch.wins, beat: !!S.rematchResult?.beat }
      : null,
  };
}

function doShare(variant = 'feed') {
  const data = buildResultCardData();
  if (!data) return;
  shareResultCard(data, variant);
}

/**
 * Shares the result card, degrading through native share → download+clipboard
 * → text-only. Every branch reports to analytics: without it there's no way to
 * tell whether shares are happening at all, let alone whether the links convert.
 *
 * A resolved navigator.share() is treated as completed. That is the strongest
 * signal the API gives — it does not report which target the user chose, or
 * whether they ultimately sent the message — so `share_completed` means "the
 * sheet closed without cancelling", not "a friend received this".
 */
async function shareResultCard(data, variant = 'feed') {
  const caption = buildShareCaption(data);
  const base = { mode: S.mode ?? 'solo', variant, has_code: !!data.rematchCode };
  logAnalyticsEvent('share_attempted', base);

  let blob = null;
  try { blob = await buildShareCardBlob(data, variant); }
  catch (e) { logAnalyticsEvent('share_card_failed', base); /* canvas unsupported — text-only below */ }

  if (blob) {
    const name = variant === 'story' ? 'can-you-go-82-0-story.png' : 'can-you-go-82-0.png';
    const file = new File([blob], name, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ title: '82-0', text: caption, files: [file] });
        logAnalyticsEvent('share_completed', { ...base, method: 'native_files' });
        return;
      } catch (e) {
        if (e?.name === 'AbortError') {
          logAnalyticsEvent('share_dismissed', { ...base, method: 'native_files' });
          return;
        }
        logAnalyticsEvent('share_failed', { ...base, method: 'native_files' });
        // fall through to download
      }
    }
    downloadBlob(blob, name);
    logAnalyticsEvent('share_completed', { ...base, method: 'download' });
    if (navigator.clipboard) {
      navigator.clipboard.writeText(caption)
        .then(()  => showToast('🖼️ Card downloaded + link copied!'))
        .catch(() => showToast('🖼️ Card downloaded!'));
    } else {
      showToast('🖼️ Card downloaded!');
    }
    return;
  }

  if (navigator.share) {
    navigator.share({ title: '82-0', text: caption })
      .then(() => logAnalyticsEvent('share_completed', { ...base, method: 'native_text' }))
      .catch(e => logAnalyticsEvent(
        e?.name === 'AbortError' ? 'share_dismissed' : 'share_failed',
        { ...base, method: 'native_text' },
      ));
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(caption)
      .then(()  => { logAnalyticsEvent('share_completed', { ...base, method: 'clipboard' }); showToast('Copied to clipboard! 🏀'); })
      .catch(() => { logAnalyticsEvent('share_failed', { ...base, method: 'clipboard' }); showToast('Failed to copy to clipboard'); });
  } else {
    logAnalyticsEvent('share_failed', { ...base, method: 'none' });
    showToast('Failed to copy to clipboard');
  }
}

/** Replays the captured install dialog. Either outcome retires the card, so
 *  the results screen re-renders once the choice is made. */
async function doInstallApp() {
  const outcome = await showInstallPrompt();
  if (outcome === 'unavailable') showToast('Install unavailable on this browser');
  else if (outcome === 'accepted') showToast('🏀 Added — see you tomorrow!');
  render();
}

/** Copies just the rematch link — the low-friction path for someone who wants
 *  to drop a challenge into a group chat without an image attached. */
function doCopyChallengeLink() {
  const data = buildResultCardData();
  if (!data?.rematchCode) return;
  const base = { mode: S.mode ?? 'solo', variant: 'link', has_code: true };
  logAnalyticsEvent('share_attempted', base);
  if (!navigator.clipboard) {
    logAnalyticsEvent('share_failed', { ...base, method: 'clipboard' });
    showToast('Clipboard unavailable on this browser');
    return;
  }
  navigator.clipboard.writeText(data.shareUrl)
    .then(()  => { logAnalyticsEvent('share_completed', { ...base, method: 'clipboard' }); showToast('🔗 Challenge link copied — same board, your record to beat!', 3200); })
    .catch(() => { logAnalyticsEvent('share_failed', { ...base, method: 'clipboard' }); showToast('Failed to copy link'); });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ── Playoffs ──────────────────────────────────────────────────────────────────

function computeRoundResults(bracket) {
  return bracket.map(([teamA, teamB]) => {
    const series = simulateSeries(teamA.strength, teamB.strength);
    return { teamA, teamB, ...series };
  });
}

function onPlayoffChampion() {
  saveToTrophyRoom();
  // The results screen lets a player submit their global score before
  // advancing to the playoffs, which locks in champion:false (playoffs
  // hadn't happened yet) and — since globalScoreSubmitted is now true —
  // permanently hides the submit card, so the eventual title never reaches
  // the global board. Reopen it so the championship gets its own accurate
  // submission; a prior non-champion entry is harmless leaderboard noise.
  if (S.globalScoreSubmitted && !S.globalSubmittedChampion) {
    S.globalScoreSubmitted = false;
    S.globalSubmitError    = null;
  }
  logAnalyticsEvent('championship_won', {
    team:  S.teamName,
    wins:  S.result?.wins ?? 0,
    coach: S.coach ?? 'none',
    era:   S.selectedEra ?? 'all',
  });
}

function fireChampionConfetti() {
  setTimeout(() => {
    withConfetti(() => confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, zIndex: 40, colors: ['#f97316', '#eab308', '#ffffff'] }));
  }, 200);
}

function doAdvanceToPlayoffs() {
  if (!S.result || S.result.wins < 20) {
    showToast('Need at least 20 wins to enter the playoffs');
    return;
  }
  const playerStrength = S.result.strength;
  const playerSeed     = getPlayerSeed(S.result.wins);
  const bracket        = buildBracket(playerSeed, playerStrength);

  S.playoffs = {
    playerSeed,
    playerStrength,
    initialBracket: bracket.map(pair => pair.map(t => ({ ...t }))),
    rounds:       [],
    currentRound: 0,
    bracket,
    eliminated:    false,
    champion:      false,
    championTeam:  null,
    tickState:     null,
    pendingReveal: false, // true right after "Simulate Entire Playoffs" — holds on the filled bracket before the champion/eliminated splash
    roundNames:   ['Conference Quarterfinals', 'Conference Semifinals', 'NBA Finals'],
  };
  S.phase = 'playoffs';
  render();
}

function doSimNextRound() {
  const po = S.playoffs;
  if (po.tickState) return;

  const results = computeRoundResults(po.bracket);

  const playerResult = results.find(r => r.teamA.isPlayer || r.teamB.isPlayer);
  const playerWon    = playerResult
    ? (playerResult.teamA.isPlayer ? playerResult.won : !playerResult.won)
    : true;

  const maxGames = Math.max(...results.map(r => r.games.length));
  po.tickState   = { results, revealedGames: 0, maxGames, done: false, playerWon };
  render();

  const ticker = setInterval(() => {
    if (S.phase !== 'playoffs') { clearInterval(ticker); return; }
    po.tickState.revealedGames++;
    render();
    if (po.tickState.revealedGames >= po.tickState.maxGames) {
      clearInterval(ticker);
      po.tickState.done = true;
      render();
      setTimeout(() => {
        if (S.phase !== 'playoffs') return;
        const { results: r2 } = po.tickState;
        po.tickState = null;
        const outcome = applyPlayoffRound(po, r2);
        if (outcome === 'champion') { onPlayoffChampion(); fireChampionConfetti(); }
        render();
      }, 800);
    }
  }, 400);
}

function doSimAllPlayoffs() {
  const po = S.playoffs;
  if (po.tickState || po.currentRound >= 3) return;

  while (po.currentRound < 3) {
    const results = computeRoundResults(po.bracket);
    applyPlayoffRound(po, results);
  }
  if (po.champion) onPlayoffChampion();
  po.pendingReveal = true;
  render();
}

/** Update the polite aria-live region for draft/spin status. */
function announceA11y(msg) {
  const el = document.getElementById('aria-live-status');
  if (!el) return;
  el.textContent = '';
  // Force a DOM change so screen readers re-announce identical strings.
  requestAnimationFrame(() => { el.textContent = msg; });
}
