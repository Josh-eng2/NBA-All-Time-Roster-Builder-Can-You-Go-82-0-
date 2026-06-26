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
  S, startGame, ALL_POSITIONS, POSITIONS, BENCH_POSITIONS,
  TEAMS, DECADES, COACHES, pick, buildBracket, getPlayerSeed,
} from '../logic/state.js';
import {
  spinResult, getAvailablePlayers, availableDecades,
} from '../logic/draft.js';
import { simulateSeason, simulateSeries }            from '../logic/simulation.js';
import {
  saveLeaderboard, saveToTrophyRoom,
  showLeaderboardModal, closeLeaderboardModal,
  showGlobalLeaderboardModal, closeGlobalLeaderboardModal,
} from '../utils/storage.js';
import { submitGlobalScore } from '../utils/firebase.js';
import {
  render, $app, fmtPlayerLine, fmtDecadeShort, showToast,
} from '../ui/render.js'; // circular — safe (used only inside function bodies)

// Expose modal close helpers globally — inline onclicks in modal HTML are outside #app
window.closeLeaderboardModal       = closeLeaderboardModal;
window.closeGlobalLeaderboardModal = closeGlobalLeaderboardModal;

// ── Event binding ─────────────────────────────────────────────────────────────

// A single permanent delegated listener. Calling bindEvents() multiple times
// is safe — the guard ensures the listener is only ever attached once.
let _bound = false;

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
  // ── Coach & Era selection ──────────────────────────────────────────────────
  if (action.startsWith('coach-pick-')) {
    S.coach = action.slice(11);
    S.phase = 'era-select';
    render(); return;
  }
  if (action.startsWith('era-')) { doStartGame(action.slice(4)); return; }

  // ── Navigation ─────────────────────────────────────────────────────────────
  if (action === 'restart') {
    confirmLeave(() => { S.phase = 'coach-select'; S.coach = null; render(); }); return;
  }
  if (action === 'draft-new-roster') { S.phase = 'coach-select'; S.coach = null; render(); return; }
  if (action === 'view-trophies')    { S.phase = 'trophy-room'; render(); return; }
  if (action === 'back-to-menu')     { S.phase = 'coach-select'; render(); return; }

  // ── Draft actions ──────────────────────────────────────────────────────────
  if (action === 'spin')         { doSpin();       return; }
  if (action === 'skip-team')    { doSkipTeam();   return; }
  if (action === 'skip-decade')  { doSkipDecade(); return; }
  if (action.startsWith('draft-pick-')) {
    const idx = parseInt(action.slice(11), 10);
    const p   = S.draftBoard[idx];
    if (!p) { render(); return; }
    S.selectedPlayer = S.selectedPlayer?.id === p.id ? null : p;
    render(); return;
  }
  if (action.startsWith('pick-')) {
    const id = action.slice(5);
    const p  = S.availablePlayers.find(x => x.id === id);
    if (!p) { render(); return; }
    S.selectedPlayer = S.selectedPlayer?.id === id ? null : p;
    render(); return;
  }
  if (action.startsWith('place-')) {
    const pos = action.slice(6);
    if (S.movingPos) moveRosterPlayer(S.movingPos, pos);
    else placePlayer(pos);
    return;
  }
  if (action.startsWith('swap-')) {
    const pos = action.slice(5);
    if (S.selectedPlayer)    placePlayer(pos);
    else if (S.movingPos)    moveRosterPlayer(S.movingPos, pos);
    else                     { S.movingPos = pos; render(); }
    return;
  }

  // ── Season & playoffs ──────────────────────────────────────────────────────
  if (action === 'simulate')            { doSimulate();          return; }
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
  startGame(era); // resets S in state.js
  render();
}

/**
 * Shows a confirmation modal before abandoning an active draft.
 * Calls fn() immediately if there is nothing to lose.
 */
export function confirmLeave(fn) {
  const safe = ['coach-select', 'era-select', 'results', 'playoffs', 'trophy-room'];
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
  if (fromPos === toPos) { render(); return; }
  const a = S.roster[fromPos];
  const b = S.roster[toPos] || null;
  S.roster[fromPos] = b;
  S.roster[toPos]   = a;
  render();
}

function doSpin() {
  S.spinState      = 'spinning';
  S.selectedPlayer = null;
  S.movingPos      = null;
  render();

  const eraLocked = S.selectedEra && S.selectedEra !== 'all';
  let ticks = 0;
  const total    = 14;
  const interval = setInterval(() => {
    ticks++;
    const teamEl   = document.getElementById('slot-team');
    const decadeEl = document.getElementById('slot-decade');
    const decPool  = availableDecades();
    if (teamEl)   teamEl.textContent   = pick(TEAMS);
    if (decadeEl) decadeEl.textContent = eraLocked
      ? S.selectedEra
      : pick(decPool.length ? decPool : DECADES);

    if (ticks >= total) {
      clearInterval(interval);
      const spin = spinResult();
      if (!spin) {
        // All player slots exhausted — reset to idle so the user isn't stuck
        S.spinState = 'idle';
        render();
        return;
      }
      S.currentSpin      = spin;
      S.spinState        = 'done';
      S.availablePlayers = getAvailablePlayers(spin.team, spin.decade);
      S.draftBoard       = [...S.availablePlayers].sort((a, b) => (b.popularity ?? 50) - (a.popularity ?? 50));
      S.selectedPlayer   = null;
      render();
    }
  }, 90);
}

function doSkipTeam() {
  if (S.teamSkips <= 0 || !S.currentSpin) { render(); return; }
  const spin = spinResult(null, S.currentSpin.decade);
  if (!spin) { render(); return; }
  S.teamSkips--;
  S.currentSpin      = spin;
  S.availablePlayers = getAvailablePlayers(spin.team, spin.decade);
  S.draftBoard       = [...S.availablePlayers].sort((a, b) => (b.popularity ?? 50) - (a.popularity ?? 50));
  S.selectedPlayer   = null;
  render();
}

function doSkipDecade() {
  if (S.selectedEra !== 'all')               { render(); return; }
  if (S.decadeSkips <= 0 || !S.currentSpin)  { render(); return; }
  const pool = availableDecades().filter(d => d !== S.currentSpin.decade);
  if (!pool.length) { render(); return; }
  const spin = spinResult(S.currentSpin.team, pick(pool));
  if (!spin) { render(); return; }
  S.decadeSkips--;
  S.currentSpin      = spin;
  S.availablePlayers = getAvailablePlayers(spin.team, spin.decade);
  S.draftBoard       = [...S.availablePlayers].sort((a, b) => (b.popularity ?? 50) - (a.popularity ?? 50));
  S.selectedPlayer   = null;
  render();
}

function placePlayer(pos) {
  if (!S.selectedPlayer) { render(); return; }
  const spin      = S.currentSpin;
  const player    = { ...S.selectedPlayer, team: spin?.team, decade: spin?.decade };
  const oldPlayer = S.roster[pos];

  // Block if a different era version of this player is already on the roster
  if (S.draftedPlayerNames?.has(player.name) && oldPlayer?.name !== player.name) {
    showToast('Player already on roster!');
    return;
  }

  // Remove the displaced player from tracking before placing the new one
  if (oldPlayer) {
    const idIdx = S.usedPlayerIds.indexOf(oldPlayer.id);
    if (idIdx !== -1) S.usedPlayerIds.splice(idIdx, 1);
    const decIdx = S.usedDecades.indexOf(oldPlayer.decade);
    if (decIdx !== -1) S.usedDecades.splice(decIdx, 1);
    S.draftedPlayerNames?.delete(oldPlayer.name);
  }

  S.roster[pos]      = player;
  if (spin?.decade) S.usedDecades.push(spin.decade);
  S.usedPlayerIds.push(player.id);
  S.draftedPlayerNames?.add(player.name);
  if (!oldPlayer) S.round++;  // swaps don't consume an additional round
  S.spinState        = 'idle';
  S.currentSpin      = null;
  S.availablePlayers = [];
  S.draftBoard       = [];
  S.selectedPlayer   = null;
  render();
}

// ── Season simulation ─────────────────────────────────────────────────────────

function doSimulate() {
  const starters = POSITIONS.map(p => S.roster[p]).filter(Boolean);
  const bench    = BENCH_POSITIONS.map(p => S.roster[p]).filter(Boolean);
  S.result  = simulateSeason(starters, bench, S.coach);
  S.phase   = 'results';
  S.runSaved = false;
  render();
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
  if (S.globalScoreSubmitted) return;

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

  const benchLines = BENCH_POSITIONS.map(pos => {
    const p = S.roster[pos];
    return p ? `💪 ${fmtPlayerLine(p)}` : '';
  }).filter(Boolean).join('\n');

  const chemLine = r.chemScore !== undefined ? `\nChemistry: ${Math.round(r.chemScore)}%` : '';

  const text = [
    `🏀 ${r.wins}-${r.losses} — ${tier}`,
    '',
    'Starters:',
    starterLines,
    '',
    'Bench:',
    benchLines,
    chemLine,
    '',
    'Can you beat it? → 82-0.com',
  ].join('\n').replace(/\n{3,}/g, '\n\n').trim();

  if (navigator.share) {
    navigator.share({ title: '82-0', text }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text)
      .then(()  => showToast('Copied to clipboard! 🏀'))
      .catch(() => showToast('Failed to copy to clipboard'));
  }

  render(); // ensure click handlers remain active after share dialog dismissal
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
