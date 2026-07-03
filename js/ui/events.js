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
  S, startGame, startGame1v1, ALL_POSITIONS, POSITIONS,
  TEAMS, DECADES, COACHES, CPU_TEAMS, pick, buildBracket, getPlayerSeed,
} from '../logic/state.js';
import {
  spinResult, spinResultAtLeast, getAvailablePlayers, availableDecades,
  playerTier, rosterFull,
} from '../logic/draft.js';
import { simulateSeason, simulateSeries, simulateHeadToHeadSeries } from '../logic/simulation.js';
import {
  saveLeaderboard, saveToTrophyRoom, markReturning,
  showLeaderboardModal, closeLeaderboardModal,
  showGlobalLeaderboardModal, closeGlobalLeaderboardModal,
} from '../utils/storage.js';
import { submitGlobalScore, logAnalyticsEvent } from '../utils/firebase.js';
import {
  render, $app, fmtPlayerLine, fmtDecadeShort, showToast, renderSeasonTickerRows,
  computeAutopsy, liveStreakLabel,
} from '../ui/render.js'; // circular — safe (used only inside function bodies)

// Expose modal close helpers globally — inline onclicks in modal HTML are outside #app
window.closeLeaderboardModal       = closeLeaderboardModal;
window.closeGlobalLeaderboardModal = closeGlobalLeaderboardModal;

// ── Event binding ─────────────────────────────────────────────────────────────

// A single permanent delegated listener. Calling bindEvents() multiple times
// is safe — the guard ensures the listener is only ever attached once.
let _bound = false;
let _submittingGlobal = false;

export function bindEvents() {
  if (_bound) return;
  _bound = true;
  $app.addEventListener('click', handleClick);
}

function handleClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  dispatch(btn.dataset.action);
}

// ── Action dispatcher ─────────────────────────────────────────────────────────

function dispatch(action) {
  // ── Mode selection ─────────────────────────────────────────────────────────
  if (action === 'mode-solo') {
    S.mode = 'solo'; S.currentPlayer = 1; S.p1 = null;
    S.takenPlayerIds = new Set(); S.phase = 'era-select';
    render(); return;
  }
  if (action === 'mode-1v1') {
    S.mode = '1v1'; S.currentPlayer = 1; S.p1 = null;
    S.takenPlayerIds = new Set(); S.phase = 'era-select';
    render(); return;
  }
  if (action === 'mode-blind') {
    S.mode = 'blind'; S.currentPlayer = 1; S.p1 = null;
    S.takenPlayerIds = new Set(); S.phase = 'era-select';
    render(); return;
  }

  // ── Coach (in-draft chip) & Era selection ──────────────────────────────────
  // Coach lives on the drafting screen and locks on the first spin.
  if (action.startsWith('coach-pick-')) {
    if (!S.coachLocked) {
      S.coach = action.slice(11);
      S.coachPickerOpen = false;
    }
    render(); return;
  }
  if (action === 'coach-picker-toggle') {
    if (!S.coachLocked) S.coachPickerOpen = !S.coachPickerOpen;
    render(); return;
  }
  if (action.startsWith('era-')) { doStartGame(action.slice(4)); return; }

  // ── Navigation ─────────────────────────────────────────────────────────────
  if (action === 'restart') {
    confirmLeave(() => { S.mode = null; S.phase = 'mode-select'; S.coach = null; S.p1 = null; S.takenPlayerIds = new Set(); render(); }); return;
  }
  if (action === 'draft-new-roster') { S.mode = null; S.phase = 'mode-select'; S.coach = null; S.p1 = null; S.takenPlayerIds = new Set(); render(); return; }
  if (action === 'view-trophies')    { S.phase = 'trophy-room'; render(); return; }
  if (action === 'back-to-menu')     { S.mode = null; S.phase = 'mode-select'; S.p1 = null; S.takenPlayerIds = new Set(); render(); return; }
  if (action === 'series-play-again') { S.mode = null; S.phase = 'mode-select'; S.p1 = null; S.takenPlayerIds = new Set(); S.seriesResult = null; S.seriesRevealedCount = 0; render(); return; }
  if (action === 'begin-series') { S.phase = 'series-sim'; S.seriesRevealedCount = 0; render(); return; }
  if (action === 'sim-next-game') { S.seriesRevealedCount = Math.min((S.seriesRevealedCount || 0) + 1, S.seriesResult.games.length); render(); return; }
  if (action === 'series-to-recap') { S.phase = 'series-result'; render(); return; }

  // ── Draft actions ──────────────────────────────────────────────────────────
  if (action === 'spin')         { doSpin();       return; }
  if (action === 'skip-team')    { doSkipTeam();   return; }
  if (action === 'skip-decade')  { doSkipDecade(); return; }
  if (action.startsWith('draft-pick-')) {
    const idx = parseInt(action.slice(11), 10);
    const p   = S.draftBoard[idx];
    if (!p) { render(); return; }
    S.pendingPlacePos = null; // new card in hand — any armed slot goes stale
    if (S.mode === 'blind') {
      // HoopIQ: the reveal IS the pick — no toggling, no second look.
      // Escape hatch: team/era skips still replace the whole board, at the
      // cost of a limited resource.
      if (S.selectedPlayer) {
        if (S.selectedPlayer.id !== p.id) showToast('🔒 Pick locked — place them in a slot');
        return;
      }
      S.selectedPlayer = p;
      render(); return;
    }
    S.selectedPlayer = S.selectedPlayer?.id === p.id ? null : p;
    render(); return;
  }
  if (action.startsWith('pick-')) {
    const id = action.slice(5);
    const p  = S.availablePlayers.find(x => x.id === id);
    if (!p) { render(); return; }
    S.pendingPlacePos = null;
    S.selectedPlayer = S.selectedPlayer?.id === id ? null : p;
    render(); return;
  }
  if (action.startsWith('place-')) {
    // Two-tap confirm: picks are permanent, and auto-spin fires the instant
    // a slot is placed — a single fast tap shouldn't be able to lock in a
    // misclick. First tap arms the slot; a second tap on the SAME slot
    // confirms it. Tapping a different slot just re-arms there instead.
    const pos = action.slice(6);
    if (S.pendingPlacePos === pos) {
      S.pendingPlacePos = null;
      placePlayer(pos);
    } else {
      S.pendingPlacePos = pos;
      render();
    }
    return;
  }
  if (action.startsWith('swap-')) {
    const pos = action.slice(5);
    if (S.selectedPlayer) placePlayer(pos);
    else render();
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

  // ── UI helpers ─────────────────────────────────────────────────────────────
  if (action === 'share')                  { doShare();                          return; }
  if (action === 'open-leaderboard')       { showLeaderboardModal();             return; }
  if (action === 'open-global-leaderboard'){ showGlobalLeaderboardModal();       return; }
  if (action === 'submit-global')          { doSubmitGlobal();                   return; }

  render(); // fallback — re-render for unhandled actions
}

// ── Game lifecycle ────────────────────────────────────────────────────────────

function doStartGame(era = 'all') {
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
  // Default coach: last one used, else the recommended starter system.
  // Changeable from the drafting screen until the first spin locks it.
  if (!S.coach) {
    let remembered = null;
    try { remembered = localStorage.getItem('nba820_coach'); } catch (e) {}
    S.coach = COACHES.some(c => c.id === remembered) ? remembered : 'jackson';
  }
  startGame(era);
  logAnalyticsEvent('game_started', { era, coach: S.coach ?? 'none' });
  render();
}

/**
 * Shows a confirmation modal before abandoning an active draft.
 * Calls fn() immediately if there is nothing to lose.
 */
export function confirmLeave(fn) {
  const safe = ['era-select', 'results', 'playoffs', 'trophy-room'];
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

function moveRosterPlayer(fromPos, toPos) {
  S.movingPos = null;
  if (!ALL_POSITIONS.includes(fromPos) || !ALL_POSITIONS.includes(toPos)) { render(); return; }
  if (fromPos === toPos) { render(); return; }
  const a = S.roster[fromPos];
  const b = S.roster[toPos] || null;
  S.roster[fromPos] = b;
  S.roster[toPos]   = a;
  render();
}

export function doSpin() {
  if (S.spinState !== 'idle') return;
  S.pendingPlacePos = null;

  // First spin commits the coach — the system is chosen with zero players
  // seen, so the system meter is an objective rather than a post-hoc score.
  if (S.mode !== '1v1' && !S.coachLocked) {
    S.coachLocked     = true;
    S.coachPickerOpen = false;
    try { if (S.coach) localStorage.setItem('nba820_coach', S.coach); } catch (e) {}
  }

  S.spinState      = 'spinning';
  S.selectedPlayer = null;
  S.movingPos      = null;
  render();

  const activeEra  = S.mode === '1v1'
    ? (S.currentPlayer === 1 ? (S.p1Era || 'all') : (S.p2Era || 'all'))
    : (S.selectedEra || 'all');
  const eraLocked  = activeEra !== 'all';
  const spinGameId = S.gameId; // capture so a mid-spin restart can't mutate the new game
  let ticks = 0;
  const total    = 14;
  const interval = setInterval(() => {
    if (S.gameId !== spinGameId) { clearInterval(interval); return; }
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
      // Escalating rounds for solo/blind runs:
      //   round 1      — GOAT-tier guarantee (the hook)
      //   rounds 2–3   — star-or-better guarantee (front-loaded generosity)
      //   rounds 4+    — pure random, protected by the pity timer:
      //                  4 consecutive starless boards force a star-tier spin
      // 1v1 keeps pure random spins for competitive fairness.
      const solo    = S.mode !== '1v1';
      const rigGoat = solo && S.round === 0;
      const rigStar = solo && !rigGoat && S.round <= 2;
      const pity    = solo && !rigGoat && !rigStar && (S.drySpins ?? 0) >= 4;
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
      S.pendingPlacePos  = null;
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
  if (S.mode === '1v1') return;
  const hasStar = S.availablePlayers.some(p => playerTier(p) !== 'starter');
  S.drySpins = hasStar ? 0 : (S.drySpins ?? 0) + 1;
}

function doSkipTeam() {
  if (S.teamSkips <= 0 || !S.currentSpin || S.spinState !== 'done') { render(); return; }
  const spin = spinResult(null, S.currentSpin.decade);
  if (!spin) { render(); return; }
  S.teamSkips--;
  S.currentSpin      = spin;
  S.availablePlayers = getAvailablePlayers(spin.team, spin.decade);
  S.draftBoard       = buildDraftBoard();
  S.selectedPlayer   = null;
  S.pendingPlacePos  = null;
  updateDryCounter();
  render();
}

function doSkipDecade() {
  const activeEra = S.mode === '1v1'
    ? (S.currentPlayer === 1 ? (S.p1Era || 'all') : (S.p2Era || 'all'))
    : (S.selectedEra || 'all');
  if (activeEra !== 'all')                   { render(); return; }
  if (S.decadeSkips <= 0 || !S.currentSpin)  { render(); return; }
  const pool = availableDecades().filter(d => d !== S.currentSpin.decade);
  if (!pool.length) { render(); return; }
  const spin = spinResult(S.currentSpin.team, pick(pool));
  if (!spin) { render(); return; }
  S.decadeSkips--;
  S.currentSpin      = spin;
  S.availablePlayers = getAvailablePlayers(spin.team, spin.decade);
  S.draftBoard       = buildDraftBoard();
  S.selectedPlayer   = null;
  S.pendingPlacePos  = null;
  updateDryCounter();
  render();
}

function placePlayer(pos) {
  if (!S.selectedPlayer) { render(); return; }
  const spin   = S.currentSpin;
  const player = { ...S.selectedPlayer, team: spin?.team, decade: spin?.decade };

  // ── 1v1 alternating draft ──────────────────────────────────────────────────
  if (S.mode === '1v1') {
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
    const pick = S.p1Round + S.p2Round;
    S.draftLog.push({ name: player.name, playerNum: S.currentPlayer, pick });

    logAnalyticsEvent('player_drafted', { player: player.name, pos, playerNum: S.currentPlayer });
    S.spinState = 'idle'; S.currentSpin = null; S.availablePlayers = []; S.draftBoard = []; S.selectedPlayer = null;

    // Both rosters complete — auto-simulate series
    if (S.p1Round >= 5 && S.p2Round >= 5) {
      const p1s = POSITIONS.map(p => S.p1Roster[p]).filter(Boolean);
      const p2s = POSITIONS.map(p => S.p2Roster[p]).filter(Boolean);
      S.seriesResult       = simulateHeadToHeadSeries(p1s, S.p1Coach, p2s, S.p2Coach);
      S.seriesRevealedCount = 0;
      S.phase = 'series-preview';
      logAnalyticsEvent('1v1_series_simulated', { winner: S.seriesResult.winner });
      render(); return;
    }

    // Alternate turn
    S.currentPlayer = S.currentPlayer === 1 ? 2 : 1;
    render(); return;
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
  S.spinState        = 'idle';
  S.currentSpin      = null;
  S.availablePlayers = [];
  S.draftBoard       = [];
  S.selectedPlayer   = null;

  // No idle state mid-run: the next wheel starts turning the moment a pick
  // lands, so there is always a pending decision on screen.
  if (!rosterFull()) { doSpin(); return; }
  render();
}

// ── Season simulation ─────────────────────────────────────────────────────────

function doSimulate() {
  if (S.phase !== 'drafting' || S.mode === '1v1') return;
  const starters = POSITIONS.map(p => S.roster[p]).filter(Boolean);
  S.result  = simulateSeason(starters, S.coach);
  S.runSaved = false;
  logAnalyticsEvent('season_simulated', { wins: S.result.wins, losses: S.result.losses, coach: S.coach ?? 'none', era: S.selectedEra ?? 'all' });

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

  // Auto-persist personal best, best streak, and last-run tip — feeds the
  // mode-select greeting without requiring a manual "Save Run".
  try {
    const prevBest = JSON.parse(localStorage.getItem('nba820_best') || 'null');
    if (!prevBest || S.result.wins > prevBest.wins) {
      localStorage.setItem('nba820_best', JSON.stringify({ wins: S.result.wins, losses: S.result.losses }));
    }
    const prevStreak = parseInt(localStorage.getItem('nba820_bestStreak') || '0', 10);
    if (longestStreak > prevStreak) localStorage.setItem('nba820_bestStreak', String(longestStreak));
    localStorage.setItem('nba820_lastRun', JSON.stringify({
      wins: S.result.wins, losses: S.result.losses,
      tip: computeAutopsy()?.fix || null,
    }));
  } catch (e) {}

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
      setTimeout(() => {
        if (S.gameId !== simId || S.phase !== 'season-sim') return;
        S.phase = 'results';
        render();
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
}

function doSaveRun() {
  const input = document.getElementById('team-name-input');
  const raw   = input ? input.value.trim() : '';
  S.teamName  = raw.slice(0, 20) || 'Untitled Team';
  S.runSaved  = true;
  saveLeaderboard();
  showToast('✅ Saved to Leaderboard!');
  render();
}

// ── Global leaderboard submit ─────────────────────────────────────────────────

async function doSubmitGlobal() {
  if (S.globalScoreSubmitted || _submittingGlobal) return;
  _submittingGlobal = true;

  // Read team name from the global input; fall back to any previously saved name
  const input  = document.getElementById('global-team-name-input');
  const raw    = input ? input.value.trim() : '';
  S.teamName   = raw.slice(0, 30) || S.teamName || 'Untitled Team';

  // Optimistic button feedback
  const btn = document.getElementById('submit-global-btn');
  if (btn) {
    btn.disabled         = true;
    btn.textContent      = 'Submitting…';
    btn.style.opacity    = '0.7';
    btn.style.cursor     = 'not-allowed';
  }

  const coachObj = S.coach ? COACHES.find(c => c.id === S.coach) : null;
  const r        = S.result;
  const isChamp  = S.playoffs?.champion ?? false;

  try {
    await submitGlobalScore({
      teamName:    S.teamName,
      wins:        r.wins,
      losses:      r.losses,
      champion:    isChamp,
      coachId:     S.coach         ?? '',
      coachName:   coachObj?.name  ?? '',
      era:         S.selectedEra   ?? 'all',
      chemScore:   Math.round(r.chemScore ?? 0),
      starters:    POSITIONS.map(p => S.roster[p]?.name || '—').join(', '),
      timestampMs: Date.now(),
    });
    S.globalScoreSubmitted = true;
    S.globalSubmitError    = null;
    render();
    showToast('🌍 You\'re on the global board!');
  } catch (err) {
    S.globalSubmitError = err.message || 'Submission failed — check your connection.';
    render();
  } finally {
    _submittingGlobal = false;
  }
}

// ── Share ─────────────────────────────────────────────────────────────────────

function doShare() {
  const r = S.result;
  if (!r) return;

  const isPerfect  = r.wins === 82;
  const isHistoric = r.wins >= 75;
  const isElite    = r.wins >= 70;
  const isPlayoff  = r.wins >= 60;

  let tier;
  if (isPerfect)       tier = '🏆 PERFECT SEASON';
  else if (isHistoric) tier = '🔥 Historic Season';
  else if (isElite)    tier = '⚡ Elite Season';
  else if (isPlayoff)  tier = '✅ Playoff Contender';
  else                 tier = '😬 Rough Season';

  const starterLines = POSITIONS.map(pos => {
    const p = S.roster[pos];
    return p ? `🌟 ${fmtPlayerLine(p)}` : '';
  }).filter(Boolean).join('\n');

  const chemLine = r.chemScore !== undefined ? `\nChemistry: ${Math.round(r.chemScore)}%` : '';

  const text = [
    `🏀 ${r.wins}-${r.losses} — ${tier}`,
    '',
    'Starting 5:',
    starterLines,
    chemLine,
    '',
    'Can you beat it? → 82-0.com',
  ].join('\n').replace(/\n{3,}/g, '\n\n').trim();

  if (navigator.share) {
    navigator.share({ title: '82-0', text }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
      .then(()  => showToast('Copied to clipboard! 🏀'))
      .catch(() => showToast('Failed to copy to clipboard'));
  } else {
    showToast('Failed to copy to clipboard');
  }
}

// ── Playoffs ──────────────────────────────────────────────────────────────────

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
    eliminated:   false,
    champion:     false,
    tickState:    null,
    roundNames:   ['Conference Quarterfinals', 'Conference Semifinals', 'NBA Finals'],
  };
  S.phase = 'playoffs';
  render();
}

function doSimNextRound() {
  const po = S.playoffs;
  if (po.tickState) return; // guard against double-click during animation

  const results = po.bracket.map(([teamA, teamB]) => {
    const series = simulateSeries(teamA.strength, teamB.strength);
    return { teamA, teamB, ...series };
  });

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
        po.rounds.push(po.tickState.results);
        const { results: r2, playerWon: pw } = po.tickState;
        po.tickState = null;
        if (!pw) {
          po.eliminated   = true;
          po.eliminatedIn = po.roundNames[po.currentRound];
        } else {
          const winners = r2.map(r => r.won ? r.teamA : r.teamB);
          po.currentRound++;
          if (po.currentRound === 3) {
            po.champion = true;
            saveToTrophyRoom();
            logAnalyticsEvent('championship_won', { team: S.teamName, wins: S.result?.wins ?? 0, coach: S.coach ?? 'none', era: S.selectedEra ?? 'all' });
            setTimeout(() => {
              if (typeof confetti !== 'undefined') {
                confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#f97316', '#eab308', '#ffffff'] });
              }
            }, 200);
          } else {
            po.bracket = [];
            for (let i = 0; i < winners.length; i += 2) {
              po.bracket.push([winners[i], winners[i + 1]]);
            }
          }
        }
        render();
      }, 800);
    }
  }, 400);
}
