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
  S, startGame, startGame1v1, POSITIONS,
  TEAMS, DECADES, COACHES, CPU_TEAMS, pick, buildBracket, getPlayerSeed, SNAKE_ORDER,
  getUtcDateString, seedDailyRng, clearDailyRng,
} from '../logic/state.js';
import {
  spinResult, spinResultAtLeast, getAvailablePlayers, availableDecades,
  playerTier, rosterFull, getSkips, useSkip,
} from '../logic/draft.js';
import { simulateSeason, simulateSeries, simulateHeadToHeadSeries, simulateBossSeries } from '../logic/simulation.js';
import { applyPlayoffRound } from '../logic/playoffs.js';
import {
  saveLeaderboard, saveToTrophyRoom, markReturning, recordLegends,
  showLeaderboardModal, closeLeaderboardModal,
  showGlobalLeaderboardModal, closeGlobalLeaderboardModal,
  getDailyStatus, markDailyPlayed, showDailyLeaderboardModal, closeDailyLeaderboardModal,
  showDailyStatsModal, closeDailyStatsModal,
  saveModeLeaderboard, getBossWeekStatus, markBossWeekPlayed,
} from '../utils/storage.js';
import { submitGlobalScore, submitDailyScore, logAnalyticsEvent, isFirebaseConfigured } from '../utils/firebase.js';
import { cgGetItem, cgSetItem } from '../utils/crazygames.js';
import { buildShareCardBlob, buildShareCaption } from './shareCard.js';
import { getDailyChallenge, checkPickLegal, evaluateObjective, dailyScore } from '../logic/challenge.js';
import { getBossOfWeek, bossWeekScore } from '../logic/bossWeek.js';
import { chooseAiPick, bestAiSlot } from '../logic/aiDraft.js';
import { isDualDraft, getModeConfig, fansFirstScore, fansFirstPassed } from '../logic/modes.js';
import {
  render, $app, fmtDecadeShort, showToast, renderSeasonTickerRows,
  computeAutopsy, liveStreakLabel, withConfetti,
} from '../ui/render.js'; // circular — safe (used only inside function bodies)

// Expose modal close helpers globally — inline onclicks in modal HTML are outside #app
window.closeLeaderboardModal       = closeLeaderboardModal;
window.closeGlobalLeaderboardModal = closeGlobalLeaderboardModal;
window.closeDailyLeaderboardModal  = closeDailyLeaderboardModal;
window.closeDailyStatsModal        = closeDailyStatsModal;

// ── Event binding ─────────────────────────────────────────────────────────────

// A single permanent delegated listener. Calling bindEvents() multiple times
// is safe — the guard ensures the listener is only ever attached once.
let _bound = false;
let _submittingGlobal = false;

export function bindEvents() {
  if (_bound) return;
  _bound = true;
  $app.addEventListener('click', handleClick);
  $app.addEventListener('change', e => {
    if (e.target?.id === 'more-modes-select') dispatch('more-mode-change');
  });
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
    S.mode = 'gm-ai'; S.currentPlayer = 1; S.p1 = null; S.dailyChallenge = null; S.bossOfWeek = null;
    doStartGame('all'); return;
  }
  if (action === 'mode-defense') {
    S.mode = 'defense'; S.currentPlayer = 1; S.p1 = null; S.dailyChallenge = null; S.bossOfWeek = null;
    doStartGame('all'); return;
  }
  if (action === 'mode-fans') {
    S.mode = 'fans'; S.currentPlayer = 1; S.p1 = null; S.dailyChallenge = null; S.bossOfWeek = null;
    doStartGame('all'); return;
  }
  if (action === 'mode-boss-week') {
    if (getBossWeekStatus().playedThisWeek) { showToast('Already played Boss of the Week — come back Monday'); render(); return; }
    const boss = getBossOfWeek(getUtcDateString());
    S.mode = 'boss-week'; S.currentPlayer = 1; S.p1 = null; S.dailyChallenge = null;
    S.bossOfWeek = boss;
    doStartGame('all');
    S.teamSkips = 0;
    S.decadeSkips = 0;
    logAnalyticsEvent('boss_week_started', { boss: boss.name, week: boss.weekKey });
    render(); return;
  }
  if (action === 'more-mode-change') {
    const sel = document.getElementById('more-modes-select');
    const val = sel?.value;
    if (!val) return;
    if (sel) sel.value = '';
    dispatch(val);
    return;
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
  if (action === 'restart') {
    if (S.mode === 'daily' || S.mode === 'boss-week') return;
    confirmLeave(() => { S.mode = null; S.phase = 'mode-select'; S.coach = null; S.p1 = null; S.dailyChallenge = null; S.bossOfWeek = null; render(); }); return;
  }
  if (action === 'draft-new-roster') {
    if (S.mode === 'daily' || S.mode === 'boss-week') return;
    S.mode = null; S.phase = 'mode-select'; S.coach = null; S.p1 = null; S.dailyChallenge = null; S.bossOfWeek = null; render(); return;
  }
  if (action === 'view-trophies')    { S.phase = 'trophy-room'; render(); return; }
  if (action === 'view-legends')     { S.legendsReturnPhase = S.phase; S.phase = 'legends'; render(); return; }
  if (action === 'legends-back')     { S.phase = S.legendsReturnPhase || 'mode-select'; render(); return; }
  if (action === 'back-to-menu')     { S.mode = null; S.phase = 'mode-select'; S.p1 = null; S.dailyChallenge = null; S.bossOfWeek = null; render(); return; }
  if (action === 'series-play-again') { S.mode = null; S.phase = 'mode-select'; S.p1 = null; S.seriesResult = null; S.seriesRevealedCount = 0; S.bossOfWeek = null; render(); return; }
  if (action === 'begin-series') { S.phase = 'series-sim'; S.seriesRevealedCount = 0; render(); return; }
  if (action === 'sim-next-game') { S.seriesRevealedCount = Math.min((S.seriesRevealedCount || 0) + 1, S.seriesResult.games.length); render(); return; }
  if (action === 'series-to-recap') {
    S.phase = 'series-result';
    if (S.seriesResult?.winner === 'p1' && (S.mode === 'gm-ai' || S.mode === 'boss-week')) {
      withConfetti(() => {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#f97316', '#2563eb', '#fcd34d'] });
      });
    }
    render();
    return;
  }

  // ── Draft actions ──────────────────────────────────────────────────────────
  if (action === 'spin')         { doSpin();       return; }
  if (action === 'skip-team')    { doSkipTeam();   return; }
  if (action === 'skip-decade')  { doSkipDecade(); return; }
  if (action.startsWith('draft-pick-')) {
    if (S.spinState === 'spinning') return;
    const idx = parseInt(action.slice(11), 10);
    const p   = S.draftBoard[idx];
    if (!p) { render(); return; }
    S.selectedPlayer = S.selectedPlayer?.id === p.id ? null : p;
    render(); return;
  }
  if (action.startsWith('place-')) {
    const pos = action.slice(6);
    placePlayer(pos);
    return;
  }

  // ── Season & playoffs ──────────────────────────────────────────────────────
  if (action === 'simulate')            { doSimulate();          return; }
  if (action === 'season-continue')     { S.seasonPaused = false; render(); runSeasonReveal(); return; }
  if (action === 'season-skip')         {
    S.seasonRevealIdx = (S.seasonGames || []).length;
    S.seasonPaused = false;
    S.rivalTease   = false;
    S.phase = 'results';
    render(); return;
  }
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
  if (action === 'share')                  { doShare();                          return; }
  if (action === 'open-leaderboard')       { showLeaderboardModal();             return; }
  if (action === 'open-global-leaderboard'){ showGlobalLeaderboardModal();       return; }
  if (action === 'submit-global')          { doSubmitGlobal();                   return; }
  if (action === 'toggle-theme')           { toggleTheme();                      return; }

  render(); // fallback — re-render for unhandled actions
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
 */
export function confirmLeave(fn) {
  const safe = ['results', 'playoffs', 'trophy-room'];
  if (safe.includes(S.phase)) { fn(); return; }
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;' +
    'align-items:center;justify-content:center;z-index:9999';
  overlay.innerHTML = `
    <div style="background:#ffffff;border:1.5px solid #e2e8f0;border-radius:16px;padding:24px;
      max-width:320px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.12);text-align:center">
      <p style="font-size:18px;font-weight:800;color:#0f172a;margin-bottom:8px">Leave Game?</p>
      <p style="font-size:14px;color:#64748b;margin-bottom:20px">Your progress will be lost.</p>
      <div style="display:flex;gap:10px;justify-content:center">
        <button id="_cl_cancel"
          style="flex:1;padding:10px 16px;border-radius:10px;background:#f1f5f9;
                 border:1.5px solid #e2e8f0;color:#0f172a;font-weight:700;cursor:pointer">Cancel</button>
        <button id="_cl_confirm"
          style="flex:1;padding:10px 16px;border-radius:10px;background:#2563eb;
                 border:none;color:#ffffff;font-weight:700;cursor:pointer">Yes, Restart</button>
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
    if (teamEl)   teamEl.textContent   = pick(TEAMS);
    if (decadeEl) decadeEl.textContent = eraLocked
      ? activeEra
      : pick(decPool.length ? decPool : DECADES);

    if (ticks >= total) {
      clearInterval(interval);
      // Escalating rounds for pity-enabled modes; dual draft stays pure random.
      const usePity = getModeConfig().pity;
      const rigGoat = usePity && (isDualDraft() ? false : S.round === 0);
      const rigStar = usePity && !rigGoat && !isDualDraft() && S.round <= 2;
      const pity    = usePity && !rigGoat && !rigStar && !isDualDraft() && (S.drySpins ?? 0) >= 1;
      if (pity) logAnalyticsEvent('pity_spin_triggered', { round: S.round + 1 });
      const spin = rigGoat ? spinResultAtLeast('goat')
        : (rigStar || pity) ? spinResultAtLeast('star')
        : spinResult();
      if (!spin) {
        // All player slots exhausted — reset to idle so the user isn't stuck
        S.spinState = 'idle';
        render();
        return;
      }
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
 * Builds the pick board from the current availablePlayers.
 * Classic/1v1: sorted best-first by popularity.
 * HoopIQ (blind): Fisher-Yates shuffled — card order must not leak quality.
 */
function buildDraftBoard() {
  const pool = [...S.availablePlayers];
  if (S.mode === 'blind') {
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
 * A "dry" board has no star-or-better player on it.
 */
function updateDryCounter() {
  if (isDualDraft() || !getModeConfig().pity) return;
  const hasStar = S.availablePlayers.some(p => playerTier(p) !== 'starter');
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
    if (teamEl)   teamEl.textContent   = tumbleTeam   ? pick(TEAMS)   : spin.team;
    if (decadeEl) decadeEl.textContent = tumbleDecade ? pick(DECADES) : spin.decade;

    if (ticks >= total) {
      clearInterval(interval);
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
  if (getSkips().decade <= 0 || !S.currentSpin)     { render(); return; }
  // A skip keeps the team — only land on eras where THIS team has players,
  // so the fallback can never silently swap the franchise mid-animation.
  const pool = availableDecades().filter(d =>
    d !== S.currentSpin.decade && getAvailablePlayers(S.currentSpin.team, d).length > 0
  );
  if (!pool.length) { showToast(`No other era has ${S.currentSpin.team} players left`); render(); return; }
  useSkip('decade');
  animateSkipReveal({ team: S.currentSpin.team, decade: pick(pool) }, false, true);
}

function placePlayer(pos) {
  if (!S.selectedPlayer) { render(); return; }
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
      return;
    }
  }

  // ── Dual draft (1v1 / GM vs AI) ────────────────────────────────────────────
  if (isDualDraft()) {
    const activeRoster = S.currentPlayer === 1 ? S.p1Roster : S.p2Roster;

    if (activeRoster[pos]) {
      showToast('Slot already filled — picks are permanent!');
      return;
    }

    if (S.draftedPlayerNames?.has(player.name)) {
      showToast('Player already drafted!');
      return;
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
      render(); return;
    }

    // Snake draft turn order: 1-2-2-1-1-2-2-1-1-2
    const completedPicks = S.p1Round + S.p2Round;
    S.currentPlayer = SNAKE_ORDER[completedPicks];
    render();
    if (S.mode === 'gm-ai' && S.currentPlayer === 2 && S.p2Round < 5) {
      setTimeout(() => doAiTurn(), 750);
    }
    return;
  }

  // ── Solo draft ─────────────────────────────────────────────────────────────
  if (S.roster[pos]) {
    showToast('Slot already filled — picks are permanent!');
    return;
  }

  if (S.draftedPlayerNames?.has(player.name)) {
    showToast('Player already on roster!');
    return;
  }

  S.roster[pos]      = player;
  if (spin?.decade) S.usedDecades.push(spin.decade);
  S.usedPlayerIds.push(player.id);
  S.draftedPlayerNames?.add(player.name);
  S.round++;
  logAnalyticsEvent('player_drafted', { player: player.name, pos, round: S.round });
  S.selectedPlayer = null;

  if (!rosterFull()) { doSpin(); return; }

  S.spinState        = 'idle';
  S.currentSpin      = null;
  S.availablePlayers = [];
  S.draftBoard       = [];
  render();
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

  // Boss of the Week — skip the 82-game ticker; go straight to a best-of-7.
  if (S.mode === 'boss-week') {
    const boss = S.bossOfWeek || getBossOfWeek(getUtcDateString());
    S.result = simulateSeason(starters, S.coach);
    S.result.newLegends = recordLegends(starters).length;
    S.seriesResult = simulateBossSeries(S.result, boss);
    S.seriesRevealedCount = 0;
    // Mirror player roster into p1 for series UI; p2 is the boss (no cards).
    S.p1Roster = { ...S.roster };
    S.p2Roster = { PG: null, SG: null, SF: null, PF: null, C: null };
    S.p1Coach = S.coach;
    S.p2Coach = null;

    const won = S.seriesResult.winner === 'p1';
    const score = bossWeekScore(S.seriesResult.p1Wins, won, S.result.strength);
    S.bossWeekResult = { won, score, bossName: boss.name, weekKey: boss.weekKey };
    markBossWeekPlayed({
      weekKey: boss.weekKey,
      bossName: boss.name,
      won,
      score,
      seriesWins: S.seriesResult.p1Wins,
      seriesLosses: S.seriesResult.p2Wins,
    });
    saveModeLeaderboard('boss-week', {
      bossName: boss.name,
      won,
      score,
      weekKey: boss.weekKey,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
    logAnalyticsEvent('boss_week_series', { boss: boss.name, won, score });
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

  // Paced reveal — outcome is already decided; this is presentation only.
  S.seasonGames     = S.result.games;
  S.seasonRevealIdx = 0;
  S.seasonPaused    = false;
  S.rivalTease      = false;
  S.rivalTeased     = false;

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
  rg.opp    = `'` + pick(CPU_TEAMS).name;                        // "'96 Bulls"
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

  // Capture personal bests BEFORE overwriting saved progress so the live
  // reveal can fire "tied your streak" and "new personal best" moments.
  let _prevBestSnap = null;
  try { _prevBestSnap = JSON.parse(cgGetItem('nba820_best') || 'null'); } catch (e) {}
  S._prevBestWins   = _prevBestSnap ? _prevBestSnap.wins : 0;
  S._prevBestStreak = parseInt(cgGetItem('nba820_bestStreak') || '0', 10);

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

  S.phase = 'season-sim';
  render();
  runSeasonReveal();
}

const STREAK_MILESTONES = [10, 20, 30, 40, 50, 60, 70, 80];

/**
 * Reveals season games on a montage cadence: consecutive blowouts flash by
 * in batches, solid wins tick steadily, close games get a slow dramatic beat.
 * Cold-open runs pause after Game 1 for the "TOUGH MATCHUP" cliffhanger.
 */
function runSeasonReveal() {
  const simId = S.gameId;
  const step = () => {
    if (S.gameId !== simId || S.phase !== 'season-sim' || S.seasonPaused) return;
    const total = S.seasonGames.length;

    if (S.seasonRevealIdx >= total) {
      // New personal best — fire before transitioning to results so it lands
      // while the player is still in the season-sim screen.
      if ((S._prevBestWins || 0) > 0 && S.result.wins > S._prevBestWins) {
        showToast(`🆕 New personal best — ${S.result.wins} wins!`, 2800);
      }
      setTimeout(() => {
        if (S.gameId !== simId || S.phase !== 'season-sim') return;
        S.phase = 'results';
        render();
        // Wordle-style: surface Statistics after the day's one shot lands.
        if (S.mode === 'daily') {
          setTimeout(() => {
            if (S.gameId === simId && S.phase === 'results' && S.mode === 'daily') {
              showDailyStatsModal();
            }
          }, 700);
        }
      }, 900);
      return;
    }

    // Rivalry Night — hold the montage on a full-screen tease, then reveal
    // the marquee game solo with a long linger before the montage resumes.
    const upcoming = S.seasonGames[S.seasonRevealIdx];
    if (upcoming?.rival && !S.rivalTeased) {
      S.rivalTeased = true;
      S.rivalTease  = true;
      render();
      setTimeout(() => {
        if (S.gameId !== simId || S.phase !== 'season-sim') return;
        S.rivalTease = false;
        S.seasonRevealIdx++;
        render();                 // clears the banner, lands the rival row
        // This path bypasses the batched reveal below, so fire its dramatic
        // beats here too: the streak-ended toast and any milestone crossed.
        const rivalGame = S.seasonGames[S.seasonRevealIdx - 1];
        if (rivalGame?.isFirstLoss) showToast(`💔 The streak ends at ${rivalGame.streakBroken}`, 3200);
        let rivalStreak = 0;
        for (let i = S.seasonRevealIdx - 1; i >= 0 && S.seasonGames[i].won; i--) rivalStreak++;
        if (STREAK_MILESTONES.includes(rivalStreak)) showToast(`🔥 ${rivalStreak} STRAIGHT WINS!`, 2200);
        setTimeout(step, 1200);   // linger on the result
      }, 1700);
      return;
    }

    // Batch up to 4 consecutive blowout WINS per tick — Game 1 always solo,
    // and never batch into (or past) the rival game or any loss.
    let n = 1;
    if (S.seasonRevealIdx > 0) {
      while (
        n < 4 &&
        S.seasonRevealIdx + n < total &&
        S.seasonGames[S.seasonRevealIdx + n - 1].type === 'blowout' &&
        S.seasonGames[S.seasonRevealIdx + n - 1].won &&
        S.seasonGames[S.seasonRevealIdx + n].type === 'blowout' &&
        S.seasonGames[S.seasonRevealIdx + n].won &&
        !S.seasonGames[S.seasonRevealIdx + n].rival
      ) n++;
    }
    const prevIdx = S.seasonRevealIdx;
    S.seasonRevealIdx = Math.min(S.seasonRevealIdx + n, total);
    updateSeasonSimDOM();

    // The streak-ends beat — fires the tick the first loss lands, whatever
    // game number it is.
    const justRevealed = S.seasonGames.slice(prevIdx, S.seasonRevealIdx);
    const brokeHere = justRevealed.find(g => g.isFirstLoss);
    if (brokeHere) showToast(`💔 The streak ends at ${brokeHere.streakBroken}`, 3200);

    // Live win-streak milestones — checked against the streak as of the end
    // of this tick, since blowout batching can jump several games at once.
    let liveStreak = 0;
    for (let i = S.seasonRevealIdx - 1; i >= 0 && S.seasonGames[i].won; i--) liveStreak++;
    const crossed = STREAK_MILESTONES.find(m => liveStreak >= m && liveStreak - n < m);
    if (crossed) showToast(`🔥 ${crossed} STRAIGHT WINS!`, 2200);

    // Personal streak record — fires exactly once when the live streak ties
    // then again when it first surpasses the previous personal best.
    // Uses (liveStreak - n) as the pre-tick value; clamped to 0 so the first
    // batch (where n may equal liveStreak) doesn't produce a negative.
    const _pbs = S._prevBestStreak || 0;
    if (_pbs > 0) {
      const preTick = Math.max(0, liveStreak - n);
      if (liveStreak >= _pbs && preTick < _pbs) {
        if (liveStreak === _pbs) showToast(`⚡ Matching your best-ever streak — ${_pbs} straight!`, 2400);
        else                     showToast(`🏆 New streak record — ${liveStreak} straight!`, 2800);
      }
    }

    // Cliffhanger — first-ever run pauses after a won Game 1
    if (S.coldOpen && S.seasonRevealIdx === 1 && S.seasonGames[0].won) {
      S.seasonPaused = true;
      render();
      return;
    }

    // The season's first loss always gets the slow-motion beat, whenever it
    // lands. Later losses keep the late-season-only treatment (game 61+);
    // earlier ones tick by at montage speed to protect a new roster's
    // confidence — the first loss is the one exception worth dramatizing.
    const next  = S.seasonGames[S.seasonRevealIdx];
    const delay = !next ? 500
      : next.isFirstLoss ? 1100
      : (!next.won && (next.num || 0) > 60) ? 950
      : next.type === 'close' ? 550
      : next.type === 'solid' ? 200
      : 95;
    setTimeout(step, delay);
  };
  step();
}

/** Targeted DOM update per reveal tick — avoids 80 full re-renders. */
function updateSeasonSimDOM() {
  const recEl  = document.getElementById('sim-record');
  const tickEl = document.getElementById('sim-ticker');
  if (!recEl || !tickEl) { render(); return; } // fallback: full render
  const played = S.seasonGames.slice(0, S.seasonRevealIdx);
  const w = played.filter(g => g.won).length;
  recEl.textContent = `${w}–${played.length - w}`;
  const gpEl = document.getElementById('sim-gp');
  if (gpEl) gpEl.textContent = `Game ${played.length} of 82`;
  const barEl = document.getElementById('sim-progress');
  if (barEl) barEl.style.width = `${(played.length / 82) * 100}%`;
  tickEl.innerHTML = renderSeasonTickerRows();

  const streakEl = document.getElementById('sim-streak');
  if (streakEl) {
    let n = 0;
    for (let i = played.length - 1; i >= 0 && played[i].won; i--) n++;
    const { text, color } = liveStreakLabel(n);
    streakEl.textContent = text;
    streakEl.style.color = color;
  }

  // Live best-start pace comparison — compares current wins to a pro-rated
  // target based on the player's personal best final record.
  // Stays blank for the first 4 games (too noisy) and when there's no history.
  const bsEl = document.getElementById('sim-beststart');
  if (bsEl) {
    const prevBestWins = S._prevBestWins || 0;
    let bsText = '', bsColor = '#94a3b8';
    if (prevBestWins > 0 && played.length >= 5) {
      const pace = Math.round(prevBestWins * played.length / 82);
      const diff = w - pace;
      if (diff > 0) {
        bsText  = `↑ ${diff} ahead of ${prevBestWins}-win pace`;
        bsColor = '#16a34a';
      } else if (diff < 0) {
        bsText  = `↓ ${Math.abs(diff)} behind ${prevBestWins}-win pace`;
        bsColor = '#dc2626';
      } else {
        bsText  = `On ${prevBestWins}-win pace`;
        bsColor = '#2563eb';
      }
    }
    bsEl.textContent = bsText;
    bsEl.style.color  = bsColor;
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
  S.teamName  = raw.slice(0, 20) || 'Untitled Team';
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
  S.teamName   = raw.slice(0, 30) || S.teamName || 'Untitled Team';

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
  S.teamName = raw.slice(0, 30) || S.teamName || 'Untitled Team';

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

function buildResultCardData() {
  const r = S.result;
  if (!r) return null;

  const isPerfect  = r.wins === 82;
  const isHistoric = r.wins >= 75;
  const isElite    = r.wins >= 70;
  const isPlayoff  = r.wins >= 60;

  let tierLabel, tierEmoji;
  if (isPerfect)       { tierLabel = 'PERFECT SEASON';   tierEmoji = '🏆'; }
  else if (isHistoric) { tierLabel = 'Historic Season';  tierEmoji = '🔥'; }
  else if (isElite)    { tierLabel = 'Elite Season';     tierEmoji = '⚡'; }
  else if (isPlayoff)  { tierLabel = 'Playoff Contender';tierEmoji = '✅'; }
  else                 { tierLabel = 'Rough Season';     tierEmoji = '😬'; }

  const starters = POSITIONS.map(pos => {
    const p = S.roster[pos];
    if (!p) return null;
    return { pos, name: p.name, team: p.team || '', decade: p.decade ? fmtDecadeShort(p.decade) : '' };
  }).filter(Boolean);

  return {
    wins: r.wins, losses: r.losses, winPct: r.winPct,
    chemScore: r.chemScore, longestStreak: r.longestStreak,
    tierLabel, tierEmoji,
    isChampion: !!S.playoffs?.champion,
    starters,
    dailyLabel: S.mode === 'daily' ? formatDailyShareLabel() : null,
  };
}

function doShare() {
  const data = buildResultCardData();
  if (!data) return;
  shareResultCard(data);
}

async function shareResultCard(data) {
  const caption = buildShareCaption(data);
  let blob = null;
  try { blob = await buildShareCardBlob(data); } catch (e) { /* canvas unsupported — degrade to text-only share below */ }

  if (blob) {
    const file = new File([blob], 'can-you-go-82-0.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ title: '82-0', text: caption, files: [file] }); return; }
      catch (e) { if (e?.name === 'AbortError') return; /* user cancelled — otherwise fall through to download */ }
    }
    downloadBlob(blob, 'can-you-go-82-0.png');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(caption)
        .then(()  => showToast('🖼️ Card downloaded + caption copied!'))
        .catch(() => showToast('🖼️ Card downloaded!'));
    } else {
      showToast('🖼️ Card downloaded!');
    }
    return;
  }

  if (navigator.share) {
    navigator.share({ title: '82-0', text: caption }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(caption)
      .then(()  => showToast('Copied to clipboard! 🏀'))
      .catch(() => showToast('Failed to copy to clipboard'));
  } else {
    showToast('Failed to copy to clipboard');
  }
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
  logAnalyticsEvent('championship_won', {
    team:  S.teamName,
    wins:  S.result?.wins ?? 0,
    coach: S.coach ?? 'none',
    era:   S.selectedEra ?? 'all',
  });
}

function fireChampionConfetti() {
  setTimeout(() => {
    withConfetti(() => confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#f97316', '#eab308', '#ffffff'] }));
  }, 200);
}

function doAdvanceToPlayoffs() {
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
