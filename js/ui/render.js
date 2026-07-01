/**
 * js/ui/render.js — HTML Template Rendering
 *
 * Exports:
 *   render()        — phase dispatcher; sets #app innerHTML then binds events
 *   $app            — the #app DOM node (shared with events.js)
 *   archetypeBadge  — archetype pill HTML helper
 *   fmtDecadeShort  — "1990s" → "90s"
 *   fmtPlayerLine   — "Jordan (Bulls 90s)"
 *   showToast       — ephemeral bottom toast notification
 */

import {
  S, POSITIONS, BENCH_POSITIONS, ALL_POSITIONS, TOTAL_ROUNDS,
  COACHES, ERA_DESC, TEAM_COLORS, ARCHETYPE_STYLE, DECADES, TEAMS, pick,
} from '../logic/state.js';
import { calculateChemistry }                             from '../logic/chemistry.js';
import { rosterFull, availableDecades }                  from '../logic/draft.js';
import { bindEvents }                                     from '../ui/events.js'; // circular — safe (called inside functions only)

// ── Mount point ───────────────────────────────────────────────────────────────
export const $app = document.getElementById('app');

// ── Chemistry dashboard cache ─────────────────────────────────────────────────
// Keyed by sorted roster player IDs — recalculates only when the roster changes.
let _chemCache = { key: null, result: null };

// ── SVG icons ─────────────────────────────────────────────────────────────────
function iconBall(cls = '') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M4.93 4.93a14.5 14.5 0 0 1 0 14.14"/>
    <path d="M19.07 4.93a14.5 14.5 0 0 0 0 14.14"/>
    <path d="M2 12h20"/><path d="M12 2v20"/>
  </svg>`;
}
function iconCheck(cls = '') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>`;
}
function iconPlus(cls = '') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v16m8-8H4"/></svg>`;
}

// ── Public helpers ────────────────────────────────────────────────────────────
export function archetypeBadge(arch) {
  if (!arch) return '';
  const c = ARCHETYPE_STYLE[arch] || { bg: '#27272a', text: '#a1a1aa' };
  return `<span class="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full mt-0.5" style="background:${c.bg};color:${c.text}">${arch}</span>`;
}

export function fmtDecadeShort(decade) {
  if (!decade) return '';
  const m = decade.match(/(\d{2})(\d{2})s/);
  return m ? m[2] + 's' : decade;
}

export function fmtPlayerLine(p) {
  if (!p) return '—';
  const era = [p.team, p.decade ? fmtDecadeShort(p.decade) : ''].filter(Boolean).join(' ');
  return era ? `${p.name} (${era})` : p.name;
}

export function showToast(msg, duration = 2500) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText =
    'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);' +
    'background:#0f172a;color:#fff;font-family:Fira Sans,sans-serif;font-weight:700;' +
    'font-size:13px;padding:10px 20px;border-radius:999px;z-index:99999;' +
    'box-shadow:0 4px 24px rgba(0,0,0,0.2);transition:opacity 0.3s;white-space:nowrap';
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 350); }, duration);
}

// ── Shared chrome ─────────────────────────────────────────────────────────────
function renderHeader(showRestart = false) {
  const eraLabel = S.selectedEra && S.selectedEra !== 'all' ? S.selectedEra : 'All Eras';
  const coachObj = S.coach ? COACHES.find(c => c.id === S.coach) : null;
  return `
  <header class="sticky top-0 z-50 w-full border-b border-border bg-white" style="box-shadow:0 1px 3px rgba(0,0,0,0.05)">
    <div class="mx-auto flex h-12 max-w-2xl items-center justify-between px-4">
      <div class="flex items-center gap-2 font-black text-base text-foreground">
        ${iconBall('h-5 w-5 text-primary')}
        <span>82-0</span>
      </div>
      <div class="flex items-center gap-1.5">
        ${coachObj ? `<span class="text-[11px] px-2.5 py-1 rounded-full font-bold border border-border bg-card2 text-muted-fg">${coachObj.system}</span>` : ''}
        <span class="text-[11px] px-2.5 py-1 rounded-full font-bold border border-border bg-card2 text-muted-fg">${eraLabel}</span>
        <button data-action="open-leaderboard" class="text-[11px] px-2.5 py-1 rounded-full border border-border bg-card2 text-muted-fg hover:border-primary hover:text-primary transition-all cursor-pointer" title="Personal Best">🏅</button>
        <button data-action="open-global-leaderboard" class="text-[11px] px-2.5 py-1 rounded-full border border-border bg-card2 text-muted-fg hover:border-primary hover:text-primary transition-all cursor-pointer" title="Global Leaderboard">🌍</button>
        ${showRestart ? `<button data-action="restart" class="text-[11px] px-2.5 py-1 rounded-full border border-border bg-card2 text-muted-fg hover:border-primary hover:text-primary transition-all cursor-pointer">Restart</button>` : ''}
      </div>
    </div>
  </header>`;
}

function renderFooter() {
  return `
  <footer class="w-full mt-auto" style="padding:2px 0">
    <p style="font-size:6px;color:#f1f5f9;text-align:center;user-select:none;letter-spacing:0.02em;line-height:1">82-0.com is an independent fan project not affiliated with the NBA or its teams.</p>
  </footer>`;
}

// ── Mode selection ────────────────────────────────────────────────────────────
function renderModeSelect() {
  let trophies = [];
  try { trophies = JSON.parse(localStorage.getItem('nba820_trophies') || '[]'); } catch (e) {}
  return `
  <div class="flex flex-col min-h-screen main-gradient">
    <header class="sticky top-0 z-50 w-full bg-white border-b border-border" style="box-shadow:0 1px 3px rgba(0,0,0,0.05)">
      <div class="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <div class="w-20"></div>
        <img src="logo-badge.svg" alt="82-0" style="height:52px;width:auto;margin-top:2px"/>
        <div class="flex items-center gap-1.5 w-20 justify-end">
          <button data-action="open-leaderboard" class="text-[11px] px-2 py-1 rounded-full border border-border bg-card2 text-muted-fg hover:border-primary hover:text-primary transition-all cursor-pointer" title="Personal Best">🏅</button>
          <button data-action="open-global-leaderboard" class="text-[11px] px-2 py-1 rounded-full border border-border bg-card2 text-muted-fg hover:border-primary hover:text-primary transition-all cursor-pointer" title="Global Leaderboard">🌍</button>
        </div>
      </div>
    </header>

    <main class="flex-1 flex flex-col items-center px-4 pt-6 pb-8">
      <div class="w-full max-w-md animate-fade-up">

        <div class="text-center mb-5">
          <p class="text-sm font-semibold text-muted-fg mb-0.5">Can you go 82-0?</p>
          <h1 class="text-2xl font-black text-foreground mb-1">Choose Your Mode</h1>
          <p class="text-sm text-muted-fg">How do you want to build your all-time team?</p>
        </div>

        <!-- Classic + HoopIQ side by side -->
        <div class="grid grid-cols-2 gap-3 mb-3">
          <button data-action="mode-solo"
            class="rounded-2xl bg-white p-4 flex flex-col items-center gap-2 cursor-pointer card-shadow hover:shadow-md transition-all border border-slate-100">
            <span class="text-3xl" style="pointer-events:none">💯</span>
            <p class="font-black text-base" style="color:#f97316;pointer-events:none">Classic</p>
            <p class="text-xs text-muted-fg text-center leading-snug flex-1" style="pointer-events:none">Draft with full player stats visible — make informed picks.</p>
            <div class="w-full py-2 rounded-xl font-bold text-sm text-white text-center mt-1" style="background:#f97316;pointer-events:none">Play Classic</div>
          </button>

          <button data-action="mode-blind"
            class="rounded-2xl bg-white p-4 flex flex-col items-center gap-2 cursor-pointer card-shadow hover:shadow-md transition-all border border-slate-100">
            <span class="text-3xl" style="pointer-events:none">🧠</span>
            <p class="font-black text-base" style="color:#f97316;pointer-events:none">HoopIQ</p>
            <p class="text-xs text-muted-fg text-center leading-snug flex-1" style="pointer-events:none">Stats hidden — draft by memory and test your ball knowledge.</p>
            <div class="w-full py-2 rounded-xl font-bold text-sm text-white text-center mt-1" style="background:#f97316;pointer-events:none">Play HoopIQ</div>
          </button>
        </div>

        <!-- 1v1 full width -->
        <button data-action="mode-1v1"
          class="w-full rounded-2xl bg-white px-5 py-4 flex flex-col items-center gap-2 cursor-pointer card-shadow hover:shadow-md transition-all border border-slate-100 mb-3">
          <span class="text-3xl" style="pointer-events:none">⚔️</span>
          <p class="font-black text-base" style="color:#f97316;pointer-events:none">1v1</p>
          <p class="text-sm text-muted-fg text-center" style="pointer-events:none">Draft your team, then go head-to-head against a rival lineup.</p>
          <div class="w-full py-2.5 rounded-xl font-bold text-sm text-white text-center mt-1" style="background:#f97316;pointer-events:none">Play</div>
        </button>

        ${trophies.length > 0 ? `
        <button data-action="view-trophies"
          class="w-full py-3 rounded-xl font-bold text-sm border border-amber-200 bg-amber-50 text-amber-700 cursor-pointer transition-all hover:bg-amber-100 card-shadow">
          🏆 Trophy Room · ${trophies.length} Championship${trophies.length === 1 ? '' : 's'}
        </button>` : ''}

      </div>
    </main>
    ${renderFooter()}
  </div>`;
}

// ── Coach selection ───────────────────────────────────────────────────────────
function renderCoachSelect() {
  const coachIcon = `<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
  let trophies = [];
  try { trophies = JSON.parse(localStorage.getItem('nba820_trophies') || '[]'); } catch (e) {}
  return `
  <div class="flex flex-col min-h-screen main-gradient">
    ${renderHeader(false)}
    <main class="flex-1 flex flex-col items-center px-4 pt-6 pb-8">
      <div class="w-full max-w-2xl flex flex-col gap-4 animate-fade-up">
        <div class="text-center pb-2">
          ${S.mode === '1v1' ? `<div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-3 font-bold text-sm" style="background:${S.currentPlayer === 1 ? '#eff6ff' : '#fffbeb'};color:${S.currentPlayer === 1 ? '#2563eb' : '#d97706'};border:1.5px solid ${S.currentPlayer === 1 ? '#bfdbfe' : '#fde68a'}">⚔️ Player ${S.currentPlayer} — Build Your Roster</div>` : ''}
          <p class="text-xs font-bold uppercase tracking-widest text-primary mb-2">Step 1 of 2</p>
          <h1 class="text-2xl font-black text-foreground mb-1.5">Choose Your Coach</h1>
          <p class="text-sm text-muted-fg">Your coach reshapes the chemistry engine — pick a system that fits your philosophy.</p>
        </div>
        <div class="flex flex-col gap-3">
          ${COACHES.map(c => `
            <button data-action="coach-pick-${c.id}"
              class="w-full rounded-2xl border border-border bg-card p-5 text-left cursor-pointer transition-all card-shadow hover:border-primary hover:shadow-md">
              <div class="flex items-start gap-4">
                <div class="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style="background:${c.accent}18;color:${c.accent}">
                  ${coachIcon}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-2 mb-1">
                    <p class="font-black text-base text-foreground">${c.name}</p>
                    <span class="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border" style="background:${c.accent}12;color:${c.accent};border-color:${c.accent}30">${c.system}</span>
                    ${c.era ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">${c.era}</span>` : ''}
                  </div>
                  <p class="text-sm text-muted-fg leading-relaxed">${c.desc}</p>
                </div>
              </div>
            </button>
          `).join('')}
        </div>
        ${trophies.length > 0 ? `
          <button data-action="view-trophies"
            class="w-full py-3.5 rounded-xl font-bold text-sm border border-amber-200 bg-amber-50 text-amber-700 cursor-pointer transition-all hover:bg-amber-100 hover:border-amber-300 card-shadow">
            🏆 View Trophy Room · ${trophies.length} Championship${trophies.length === 1 ? '' : 's'}
          </button>` : ''}
      </div>
    </main>
    ${renderFooter()}
  </div>`;
}

// ── Era selection ─────────────────────────────────────────────────────────────
function renderEraSelect() {
  return `
  <div class="flex flex-col min-h-screen main-gradient">
    ${renderHeader(false)}
    <main class="flex-1 flex flex-col items-center px-4 pt-6 pb-8">
      <div class="w-full max-w-2xl flex flex-col gap-4 animate-fade-up">
        <div class="text-center pb-2">
          ${S.mode === '1v1'
            ? `<div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-3 font-bold text-sm" style="background:#f0fdf4;color:#16a34a;border:1.5px solid #bbf7d0">⚔️ Shared Draft Era</div>`
            : ''}
          <p class="text-xs font-bold uppercase tracking-widest text-primary mb-2">${S.mode === '1v1' ? 'Step 1 of 1' : 'Step 2 of 2'}</p>
          <h1 class="text-2xl font-black text-foreground mb-1.5">Choose Your Era</h1>
          <p class="text-sm text-muted-fg">${S.mode === '1v1' ? 'Pick the era both players will draft from — applies to the entire draft.' : 'Lock into a decade or let the draft board decide every round.'}</p>
        </div>
        <button data-action="era-all" class="era-card w-full rounded-2xl border-2 border-primary bg-primary/5 p-5 text-left cursor-pointer card-shadow">
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Recommended</p>
              <p class="font-black text-xl text-foreground mb-1">All Eras</p>
              <p class="text-sm text-muted-fg">Random decade each spin — 7-era gauntlet across every NBA generation</p>
            </div>
            <div class="flex-shrink-0 mt-1">${iconBall('h-8 w-8 text-primary/40')}</div>
          </div>
        </button>
        <div class="grid grid-cols-2 gap-3">
          ${DECADES.map(d => `
            <button data-action="era-${d}" class="era-card rounded-xl border border-border bg-card p-4 text-left cursor-pointer card-shadow">
              <p class="font-black text-xl text-foreground mb-1">${d}</p>
              <p class="text-xs text-muted-fg leading-snug">${ERA_DESC[d]}</p>
            </button>
          `).join('')}
        </div>
      </div>
    </main>
    ${renderFooter()}
  </div>`;
}

// ── Drafting screen ───────────────────────────────────────────────────────────
function renderDrafting() {
  if (S.mode === '1v1') return renderDrafting1v1();
  const full = rosterFull();
  return `
  <div class="min-h-screen main-gradient">
    ${renderHeader(true)}
    <main class="flex flex-col items-center px-4 pt-2 pb-8">
      <div class="w-full max-w-2xl flex flex-col gap-2">
        ${full ? renderSimulateCard() : ''}
        ${renderRoundBar()}
        ${!full ? renderSlotMachine() : ''}
        ${!full && S.spinState === 'done' ? renderDraftBoard() : ''}
        ${renderPopularityBar()}
        ${renderChemDashboard()}
        ${renderRoster()}
      </div>
    </main>
  </div>`;
}

// ── 1v1 Alternating Draft screen ──────────────────────────────────────────────
function render1v1RosterPanel(roster, playerNum, isActive) {
  const color    = playerNum === 1 ? '#2563eb' : '#d97706';
  const bg       = playerNum === 1 ? '#eff6ff'  : '#fffbeb';
  const bdrCol   = isActive ? color : '#e2e8f0';
  const coachId  = playerNum === 1 ? S.p1Coach : S.p2Coach;
  const coachObj = coachId ? COACHES.find(c => c.id === coachId) : null;
  // Active player with a player selected — slots become tappable placement targets
  const canPlace = isActive && !!S.selectedPlayer;

  const slots = ALL_POSITIONS.map(pos => {
    const p       = roster ? roster[pos] : null;
    const isBench = BENCH_POSITIONS.includes(pos);
    const label   = isBench ? 'BN' : pos;

    if (canPlace && !p) {
      return `<div data-action="place-${pos}"
        class="flex items-center gap-1.5 py-1.5 border-b border-border last:border-0 rounded cursor-pointer transition-all"
        style="background:${bg}">
        <span class="text-[10px] font-black w-5 flex-shrink-0" style="color:${color}">${label}</span>
        <span class="text-[11px] font-bold flex-1" style="color:${color}">Tap to place</span>
        <span class="text-[10px] font-black" style="color:${color}">+</span>
      </div>`;
    }
    return `<div class="flex items-center gap-1.5 py-1 border-b border-border last:border-0 ${p ? 'locked' : ''}">
      <span class="text-[10px] font-black w-5 flex-shrink-0" style="color:${p ? color : '#cbd5e1'}">${label}</span>
      <span class="text-[11px] font-semibold flex-1 truncate ${p ? 'text-foreground' : 'text-muted-fg/40'}">${p ? p.name.split(' ').slice(-1)[0] : '—'}</span>
      ${p ? `<span class="text-[10px] text-muted-fg flex-shrink-0">${p.ppg}pt</span>` : ''}
    </div>`;
  }).join('');

  return `
  <div class="rounded-2xl border-2 bg-white p-3 card-shadow transition-all" style="border-color:${bdrCol}">
    <div class="flex items-center justify-between mb-1.5">
      <p class="text-xs font-black uppercase tracking-wider" style="color:${color}">P${playerNum}</p>
      ${isActive
        ? `<span class="text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse-glow" style="background:${bg};color:${color}">${canPlace ? '👆 Pick a slot' : '🎯 ON CLOCK'}</span>`
        : `<span class="text-[10px] text-muted-fg font-medium">${(playerNum === 1 ? S.p1Round : S.p2Round)}/7</span>`}
    </div>
    ${coachObj ? `<p class="text-[10px] text-muted-fg mb-1.5 truncate">${coachObj.name}</p>` : ''}
    ${slots}
  </div>`;
}

function renderDrafting1v1() {
  const totalPick  = S.p1Round + S.p2Round + 1;
  const isP1Turn   = S.currentPlayer === 1;
  const clockColor = isP1Turn ? '#2563eb' : '#d97706';
  const clockBg    = isP1Turn ? '#eff6ff'  : '#fffbeb';
  const clockBdr   = isP1Turn ? '#bfdbfe'  : '#fde68a';

  // Recent picks log (last 5)
  const recentPicks = S.draftLog.slice(-5).reverse().map(entry => {
    const c = entry.playerNum === 1 ? '#2563eb' : '#d97706';
    return `<div class="flex items-center gap-2 py-1 border-b border-border last:border-0">
      <span class="text-[10px] font-black px-1.5 py-0.5 rounded-full" style="background:${entry.playerNum === 1 ? '#eff6ff' : '#fffbeb'};color:${c}">P${entry.playerNum}</span>
      <span class="text-xs text-foreground font-semibold truncate">${entry.name}</span>
      <span class="text-[10px] text-muted-fg ml-auto flex-shrink-0">Pick ${entry.pick}</span>
    </div>`;
  }).join('');

  return `
  <div class="min-h-screen main-gradient">
    ${renderHeader(true)}
    <main class="flex flex-col items-center px-4 pt-2 pb-8">
      <div class="w-full max-w-3xl flex flex-col gap-3">

        <!-- ON THE CLOCK banner -->
        <div class="flex items-center justify-between px-4 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest"
          style="background:${clockBg};color:${clockColor};border:2px solid ${clockBdr}">
          <span>⚡ Player ${S.currentPlayer} On The Clock</span>
          <span class="text-xs font-bold opacity-70">Pick ${totalPick} of 14</span>
        </div>

        <!-- Side-by-side rosters -->
        <div class="grid grid-cols-2 gap-3">
          ${render1v1RosterPanel(S.p1Roster, 1, isP1Turn)}
          ${render1v1RosterPanel(S.p2Roster, 2, !isP1Turn)}
        </div>

        <!-- Shared draft board -->
        ${renderSlotMachine()}
        ${S.spinState === 'done' ? renderDraftBoard() : ''}

        <!-- Recent picks -->
        ${S.draftLog.length > 0 ? `
        <div class="rounded-xl border border-border bg-white p-3 card-shadow">
          <p class="text-[10px] font-bold uppercase tracking-widest text-muted-fg mb-2">Recent Picks</p>
          ${recentPicks}
        </div>` : ''}

      </div>
    </main>
  </div>`;
}

function renderRoundBar() {
  const filled         = ALL_POSITIONS.filter(p => S.roster[p]).length;
  const startersFilled = POSITIONS.filter(p => S.roster[p]).length;
  const benchFilled    = BENCH_POSITIONS.filter(p => S.roster[p]).length;
  const roleLabel      = S.round < 5 ? `Starters ${startersFilled}/5` : `Bench ${benchFilled}/2`;
  const displayRound   = Math.min(S.round + 1, TOTAL_ROUNDS);

  return `
  <div class="flex flex-col gap-1.5 py-1">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-bold text-foreground">Round ${displayRound} <span class="text-muted-fg font-normal">of ${TOTAL_ROUNDS}</span></p>
        <p class="text-xs text-muted-fg mt-0.5">${filled}/${ALL_POSITIONS.length} spots &nbsp;·&nbsp; ${roleLabel}</p>
      </div>
      <div class="flex gap-1.5 items-center">
        ${Array.from({ length: TOTAL_ROUNDS }, (_, i) => {
          const isStarter = i < 5;
          const done   = i < S.round;
          const active = i === S.round;
          const color  = done || active ? (isStarter ? '#2563eb' : '#64748b') : '#e2e8f0';
          return `<div class="rounded-full transition-all" style="width:${active ? 9 : 7}px;height:${active ? 9 : 7}px;background:${color};border:${active ? '2px solid ' + (isStarter ? '#2563eb' : '#64748b') : 'none'}"></div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

function renderPopularityBar() {
  const drafted = Object.values(S.roster).filter(Boolean);
  const avgPop  = drafted.length
    ? drafted.reduce((s, p) => s + (p.popularity || 50), 0) / drafted.length
    : 0;
  const pct     = drafted.length ? Math.max(0, Math.round(((avgPop - 35) / 65) * 100)) : 0;
  const barCol  = !drafted.length ? '#cbd5e1' : avgPop >= 80 ? '#2563eb' : avgPop >= 60 ? '#d97706' : '#94a3b8';
  const tier    = !drafted.length ? 'Draft players to build star power'
    : avgPop >= 85 ? 'Superstar Lineup' : avgPop >= 70 ? 'Star Power' : avgPop >= 55 ? 'Solid Roster' : 'Under the Radar';
  const scoreLabel = drafted.length ? ` · ${Math.round(avgPop)}/100` : '';
  return `
  <div class="rounded-xl border border-border bg-card px-4 py-3 card-shadow">
    <div class="flex items-center justify-between mb-2">
      <p class="text-[10px] font-bold uppercase tracking-widest text-muted-fg">Team Popularity</p>
      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border" style="color:${barCol};background:${barCol}18;border-color:${barCol}30">${tier}${scoreLabel}</span>
    </div>
    <div class="h-1.5 rounded-full overflow-hidden bg-border">
      <div class="h-full rounded-full transition-all stat-bar-fill" style="width:${pct}%;background:${barCol}"></div>
    </div>
    <p class="text-[10px] mt-1.5 text-muted-fg">High popularity boosts home-court advantage in close games</p>
  </div>`;
}

function renderSlotMachine() {
  const isDone    = S.spinState === 'done';
  const isSpin    = S.spinState === 'spinning';
  const tc        = isDone ? TEAM_COLORS[S.currentSpin.team] : null;
  const activeEra = S.mode === '1v1'
    ? (S.currentPlayer === 1 ? (S.p1Era || 'all') : (S.p2Era || 'all'))
    : (S.selectedEra || 'all');
  const eraLocked = activeEra !== 'all';
  const decPool   = availableDecades();
  return `
  <div class="rounded-2xl border border-border bg-card p-4 animate-scale-in card-shadow">
    <div class="flex items-center gap-2 mb-3">
      <p class="text-xs font-bold uppercase tracking-widest text-muted-fg">Draft Board — Round ${S.round + 1}</p>
      <div class="ml-auto flex gap-1.5">
        ${isDone && S.teamSkips > 0 ? `<button data-action="skip-team" class="text-[11px] px-2.5 py-1 rounded-full border border-border bg-card2 text-muted-fg hover:border-primary hover:text-primary transition-all cursor-pointer">Skip Team (${S.teamSkips})</button>` : ''}
        ${isDone && S.decadeSkips > 0 && !eraLocked ? `<button data-action="skip-decade" class="text-[11px] px-2.5 py-1 rounded-full border border-border bg-card2 text-muted-fg hover:border-primary hover:text-primary transition-all cursor-pointer">Skip Era (${S.decadeSkips})</button>` : ''}      </div>
    </div>
    <div class="grid grid-cols-2 gap-3 mb-4 ${isSpin ? 'slot-spinning' : ''}">
      <div class="rounded-xl border-2 p-4 flex flex-col items-center justify-center min-h-[88px] transition-all"
        style="background:${isDone && tc ? tc.bg + '12' : '#f1f5f9'};border-color:${isDone && tc ? tc.bg + '88' : '#e2e8f0'}">
        <span class="text-[10px] font-bold uppercase tracking-widest mb-2 text-muted-fg">TEAM</span>
        <span class="slot-badge text-xl font-black text-foreground" id="slot-team">
          ${isDone ? S.currentSpin.team : isSpin ? pick(TEAMS) : '—'}
        </span>
        ${isDone ? `<span class="mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white uppercase tracking-wider">LOCKED</span>` : ''}
      </div>
      <div class="rounded-xl border-2 p-4 flex flex-col items-center justify-center min-h-[88px] transition-all"
        style="background:${isDone ? '#eff6ff' : '#f1f5f9'};border-color:${isDone ? '#93c5fd' : '#e2e8f0'}">
        <span class="text-[10px] font-bold uppercase tracking-widest mb-2 text-muted-fg">ERA</span>
        <span class="slot-badge text-xl font-black text-foreground" id="slot-decade">
          ${isDone ? S.currentSpin.decade : isSpin ? (eraLocked ? activeEra : pick(decPool.length ? decPool : DECADES)) : '—'}
        </span>
        ${isDone ? `<span class="mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white uppercase tracking-wider">LOCKED</span>` : ''}
      </div>
    </div>
    ${S.spinState === 'idle' ? `
      <button data-action="spin" class="w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest bg-primary text-white hover:bg-blue-700 transition-all cursor-pointer animate-pulse-glow">
        SPIN THE DRAFT BOARD
      </button>
    ` : S.spinState === 'spinning' ? `
      <button disabled class="w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest bg-primary/70 text-white cursor-not-allowed">
        SPINNING...
      </button>
    ` : `
      <p class="text-center text-xs text-muted-fg py-1">${S.mode === 'blind' ? '❓ Tap a mystery card to reveal — then tap a roster slot to place' : 'Select a player below, then tap a roster slot to place them'}</p>
    `}
  </div>`;
}

// ── Draft board (3-player pick) ───────────────────────────────────────────────
function renderDraftBoard() {
  if (!S.draftBoard || !S.draftBoard.length) return '';
  const team   = S.currentSpin?.team;
  const decade = S.currentSpin?.decade;
  const tc     = team ? TEAM_COLORS[team] : null;
  return `
  <div class="animate-fade-up">
    <div class="flex items-center gap-2 mb-3">
      ${tc ? `<span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${tc.bg}"></span>` : ''}
      <p class="text-xs font-bold uppercase tracking-widest text-muted-fg">${team} · ${decade}</p>
    </div>
    <div class="overflow-y-auto rounded-xl" style="max-height:24vh">
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 pr-1">
        ${S.draftBoard.map((p, i) => renderDraftCard(p, i)).join('')}
      </div>
    </div>
  </div>`;
}

function renderDraftCard(p, index) {
  const pop             = p.popularity ?? 50;
  const popCol          = pop >= 80 ? '#2563eb' : pop >= 60 ? '#d97706' : '#94a3b8';
  const alreadyOnRoster = S.draftedPlayerNames?.has(p.name) ?? false;
  const takenByP1       = !alreadyOnRoster && (S.takenPlayerIds?.has(p.id) ?? false);
  const unavailable     = alreadyOnRoster || takenByP1;
  const isSelected      = !unavailable && S.selectedPlayer?.id === p.id;

  // Blind mode — unselected cards shown face-down; flips to full card on selection
  if (S.mode === 'blind' && !isSelected) {
    const posLabel = p.secondaryPos?.length ? `${p.pos} / ${p.secondaryPos[0]}` : p.pos;
    return `
    <div class="rounded-xl border-2 flex flex-col overflow-hidden card-shadow${unavailable ? ' opacity-40' : ''}"
      style="border-color:${unavailable ? '#e2e8f0' : '#475569'};background:${unavailable ? '#f8fafc' : '#1e293b'}">
      <div class="p-3 flex-1 flex flex-col items-center justify-center gap-2 text-center" style="min-height:120px">
        <span class="text-[10px] font-black px-2 py-0.5 rounded-full"
          style="background:${unavailable ? '#f1f5f9' : '#334155'};color:${unavailable ? '#94a3b8' : '#64748b'}">${posLabel}</span>
        <span class="text-3xl">${unavailable ? '🚫' : '❓'}</span>
        <p class="text-[11px] font-bold" style="color:${unavailable ? '#94a3b8' : '#475569'}">${unavailable ? 'Already Taken' : 'Mystery Player'}</p>
      </div>
      <div class="px-3 pb-3">
        ${unavailable
          ? `<button disabled class="w-full py-2 rounded-lg font-bold text-xs cursor-not-allowed" style="background:#f1f5f9;color:#94a3b8;border:1.5px solid #e2e8f0">Taken</button>`
          : `<button data-action="draft-pick-${index}" class="w-full py-2 rounded-lg font-bold text-xs cursor-pointer transition-all" style="background:#334155;color:#94a3b8;border:1.5px solid #475569">🎲 Mystery Pick</button>`
        }
      </div>
    </div>`;
  }

  // Full-reveal card — all modes, plus selected card in blind mode
  const cardBorder  = unavailable ? '#e2e8f0' : isSelected ? '#2563eb' : '#e2e8f0';
  const cardBg      = unavailable ? '#f8fafc' : isSelected ? '#eff6ff' : '#ffffff';
  const cardOpacity = unavailable ? 'opacity:0.5;' : '';
  return `
  <div class="rounded-xl border-2 flex flex-col overflow-hidden transition-all card-shadow"
    style="border-color:${cardBorder};background:${cardBg};${cardOpacity}">
    ${S.mode === 'blind' && isSelected ? `<div class="pt-2 px-3"><span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full" style="background:#fef9c3;color:#a16207">🔍 Revealed</span></div>` : ''}
    <div class="p-3 flex-1">
      <div class="flex items-center gap-1.5 mb-2">
        <span class="text-[10px] font-black px-1.5 py-0.5 rounded-full border border-border bg-card2 text-muted-fg">${p.secondaryPos?.length ? `${p.pos} / ${p.secondaryPos[0]}` : p.pos}</span>
        ${archetypeBadge(p.archetype)}
        <span class="ml-auto text-xs font-black" style="color:${popCol}">★ ${pop}</span>
      </div>
      <p class="font-bold text-sm text-foreground leading-tight mb-1.5">${p.name}</p>
      <div class="flex flex-wrap gap-x-2 gap-y-0.5">
        ${[['PPG', p.ppg], ['RPG', p.rpg], ['APG', p.apg], ['SPG', p.spg], ['BPG', p.bpg]].map(([l, v]) =>
          `<span class="text-[10px] text-muted-fg"><span class="font-semibold text-foreground">${v}</span> ${l}</span>`
        ).join('')}
      </div>
      ${p.traits && p.traits.length ? `
        <div class="flex flex-wrap gap-1 mt-1.5">
          ${p.traits.map(t => `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">${t}</span>`).join('')}
        </div>` : ''}
    </div>
    <div class="px-3 pb-3">
      ${alreadyOnRoster
        ? `<button disabled class="w-full py-2 rounded-lg font-bold text-xs" style="background:#f1f5f9;color:#94a3b8;border:1.5px solid #e2e8f0;cursor:not-allowed">Already on Roster</button>`
        : takenByP1
        ? `<button disabled class="w-full py-2 rounded-lg font-bold text-xs" style="background:#fef2f2;color:#dc2626;border:1.5px solid #fecaca;cursor:not-allowed">Taken by Player 1</button>`
        : `<button data-action="draft-pick-${index}"
            class="w-full py-2 rounded-lg font-bold text-xs transition-all cursor-pointer"
            style="background:${isSelected ? '#2563eb' : '#eff6ff'};color:${isSelected ? '#fff' : '#2563eb'};border:1.5px solid ${isSelected ? '#2563eb' : '#bfdbfe'}">
            ${isSelected ? (S.mode === 'blind' ? '✓ Revealed — Tap a Roster Slot' : '✓ Selected — Tap a Roster Slot') : 'Draft Player'}
          </button>`
      }
    </div>
  </div>`;
}

// ── Roster ────────────────────────────────────────────────────────────────────
function renderRoster() {
  const hasSelected = !!S.selectedPlayer;
  const filledCount = ALL_POSITIONS.filter(p => S.roster[p]).length;
  return `
  <div>
    <div class="flex items-center justify-between mb-2">
      <p class="text-xs font-bold uppercase tracking-widest text-muted-fg">Your Roster <span class="text-primary">${filledCount}/${ALL_POSITIONS.length}</span></p>
      ${hasSelected ? `<p class="text-xs text-primary animate-fade-up font-medium">Tap an empty slot to place ${S.selectedPlayer.name}</p>` : ''}
    </div>
    <p class="text-[10px] font-bold uppercase tracking-wider text-muted-fg/50 mb-1.5">Starters</p>
    <div class="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
      ${POSITIONS.map(pos => renderRosterSlot(pos, hasSelected, false)).join('')}
    </div>
    <p class="text-[10px] font-bold uppercase tracking-wider text-muted-fg/50 mb-1.5">Bench</p>
    <div class="grid grid-cols-2 gap-2">
      ${BENCH_POSITIONS.map(pos => renderRosterSlot(pos, hasSelected, true)).join('')}
    </div>
  </div>`;
}

function renderRosterSlot(pos, canPlace, isBench) {
  const p             = S.roster[pos];
  const isMoveSrc     = S.movingPos === pos;
  const hasMoveActive = !!S.movingPos;
  const label         = isBench ? 'BN' : pos;

  if (p) {
    const fitType  = !isBench
      ? (p.pos === pos ? 'primary' : (p.secondaryPos || []).includes(pos) ? 'flex' : 'place')
      : null;
    const fitClass  = fitType ? 'fit-' + fitType : '';
    const fitColors = { primary: '#16a34a', flex: '#d97706', place: '#dc2626' };
    const borderColor = isBench ? '#93c5fd' : '#fca5a5';
    const borderTop   = isBench ? '3px solid #2563eb' : '3px solid #dc2626';
    const labelColor  = isBench ? '#2563eb' : (fitType ? fitColors[fitType] : '#dc2626');

    return `
    <div class="rounded-xl border bg-white p-2 flex flex-col items-center gap-0.5 text-center overflow-hidden card-shadow locked ${fitClass}"
      style="border-color:${borderColor};border-top:${borderTop}"
      title="${p.name} · pick locked">
      <span class="text-[10px] font-black uppercase leading-none" style="color:${labelColor}">${label}</span>
      <span class="text-[11px] font-bold text-foreground leading-tight w-full text-center truncate px-0.5">${p.name.split(' ').pop()}</span>
      <span class="text-[10px] text-muted-fg leading-none">${p.ppg}pt</span>
    </div>`;
  }

  // Empty slot — droppable when placing a draft pick OR moving a roster player
  const canDrop      = canPlace || hasMoveActive;
  const sp           = S.selectedPlayer;
  const primaryMatch = !hasMoveActive && canDrop && !isBench && sp && sp.pos === pos;
  const flexMatch    = !hasMoveActive && canDrop && !isBench && sp && !primaryMatch &&
    (sp.secondaryPos || []).includes(pos);
  const action       = canDrop ? (hasMoveActive ? `swap-${pos}` : `place-${pos}`) : '';

  const slotBg     = isBench ? '#eff6ff' : (!canDrop ? '#f8fafc' : '#fff1f2');
  const slotBorder = isBench ? '#93c5fd' : (!canDrop ? '#cbd5e1' : (primaryMatch ? '#86efac' : flexMatch ? '#fde68a' : '#fca5a5'));
  const slotColor  = isBench ? '#2563eb' : (!canDrop ? '#94a3b8' : (primaryMatch ? '#16a34a' : flexMatch ? '#d97706' : '#dc2626'));
  const slotText   = !canDrop ? 'Empty' : (hasMoveActive ? 'Move Here' : primaryMatch ? 'Primary' : flexMatch ? 'Flex' : 'Place');

  return `
  <div data-action="${action}"
    class="rounded-xl border-2 border-dashed p-2 flex flex-col items-center gap-1 text-center transition-all ${canDrop ? 'slot-empty droppable' : ''}"
    style="background:${slotBg};border-color:${slotBorder}">
    <span class="text-[10px] font-black uppercase" style="color:${slotColor}">${label}</span>
    <span class="text-xs" style="color:${slotColor}">${slotText}</span>
  </div>`;
}

// ── Live Chemistry Dashboard ──────────────────────────────────────────────────
function renderChemDashboard() {
  const starters = POSITIONS.map(p => S.roster[p]).filter(Boolean);
  const bench    = BENCH_POSITIONS.map(p => S.roster[p]).filter(Boolean);
  const rosterKey = [...starters, ...bench].map(p => p.id).join(',');
  if (_chemCache.key !== rosterKey) {
    _chemCache.key    = rosterKey;
    _chemCache.result = calculateChemistry(starters, bench);
  }
  const { chemScore, chemReport } = _chemCache.result;
  const scoreColor = chemScore >= 60 ? '#16a34a' : chemScore >= 40 ? '#d97706' : '#dc2626';
  const scoreBg    = chemScore >= 60 ? '#f0fdf4'  : chemScore >= 40 ? '#fffbeb'  : '#fef2f2';
  const scoreLabel = chemScore >= 60 ? 'Strong'   : chemScore >= 40 ? 'Neutral'  : 'Weak';
  return `
  <div class="rounded-2xl border border-border bg-card p-4 card-shadow">
    <div class="flex items-center justify-between mb-3">
      <p class="text-xs font-bold uppercase tracking-widest text-muted-fg">Live Chemistry</p>
      <span class="text-xs font-bold px-2 py-0.5 rounded-full border" style="background:${scoreBg};color:${scoreColor};border-color:${scoreColor}30">${scoreLabel} · ${chemScore}%</span>
    </div>
    <div class="flex items-center gap-3 mb-3">
      <div class="flex-1 h-2 rounded-full overflow-hidden bg-border">
        <div class="h-full rounded-full stat-bar-fill" style="width:${chemScore}%;background:${scoreColor}"></div>
      </div>
    </div>
    ${chemReport.length > 0 ? `
    <div class="flex flex-col gap-1.5">
      ${chemReport.map(item => {
        const isGood = item.startsWith('🟢');
        return `<div class="rounded-lg px-2.5 py-1.5 text-xs font-medium border"
          style="background:${isGood ? '#f0fdf4' : '#fef2f2'};color:${isGood ? '#15803d' : '#dc2626'};border-color:${isGood ? '#bbf7d0' : '#fecaca'}">${item}</div>`;
      }).join('')}
    </div>` : `<p class="text-xs text-muted-fg">No synergies yet — keep drafting.</p>`}
  </div>`;
}

// ── Simulate card ─────────────────────────────────────────────────────────────
function renderSimulateCard() {
  const is1v1   = S.mode === '1v1';
  const isP1    = S.currentPlayer === 1;
  const btnText = is1v1 && isP1
    ? 'Lock In Roster — Pass to Player 2 →'
    : is1v1
    ? 'Simulate Best-of-7 Series →'
    : 'Simulate 82 Games →';
  const btnColor = is1v1 && isP1 ? '#d97706' : '#2563eb';
  const btnHover = is1v1 && isP1 ? '#b45309' : '#1d4ed8';
  const subtitle = is1v1 && isP1
    ? 'All 7 spots locked in. Hand the device to Player 2.'
    : is1v1
    ? 'Both rosters set. Time to settle it on the court.'
    : 'All 7 spots locked in. Ready to run the season.';
  return `
  <div class="rounded-2xl border-2 border-primary bg-white p-5 text-center animate-scale-in card-shadow" style="border-color:${btnColor}20">
    <div class="flex justify-center mb-3">${iconBall('h-10 w-10 text-primary')}</div>
    ${is1v1 ? `<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-2 text-xs font-bold" style="background:${isP1 ? '#eff6ff' : '#fffbeb'};color:${isP1 ? '#2563eb' : '#d97706'}">⚔️ Player ${S.currentPlayer}</div>` : ''}
    <p class="font-black text-lg text-foreground mb-1">Roster Complete</p>
    <p class="text-sm text-muted-fg mb-4">${subtitle}</p>
    <button data-action="simulate" class="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest text-white transition-all cursor-pointer animate-pulse-glow"
      style="background:${btnColor}" onmouseover="this.style.background='${btnHover}'" onmouseout="this.style.background='${btnColor}'">
      ${btnText}
    </button>
  </div>`;
}

// ── Results screen ────────────────────────────────────────────────────────────
function renderResults() {
  const r          = S.result;
  const isPerfect  = r.wins === 82;
  const isHistoric = r.wins >= 73;
  const isElite    = r.wins >= 65;
  const isPlayoff  = r.wins >= 50;

  let label, labelColor, labelBg, emoji;
  if (isPerfect)       { label = 'PERFECT SEASON';        labelColor = '#92400e'; labelBg = '#fef3c7'; emoji = '🏆'; }
  else if (isHistoric) { label = 'Historic Season';        labelColor = '#b45309'; labelBg = '#fffbeb'; emoji = '🔥'; }
  else if (isElite)    { label = 'Championship Contender'; labelColor = '#166534'; labelBg = '#f0fdf4'; emoji = '⭐'; }
  else if (isPlayoff)  { label = 'Playoff Contender';      labelColor = '#1e40af'; labelBg = '#eff6ff'; emoji = '✅'; }
  else                 { label = 'Rebuild Required';       labelColor = '#991b1b'; labelBg = '#fef2f2'; emoji = '📋'; }

  const winsColor = isPerfect || isHistoric ? '#d97706' : isElite ? '#16a34a' : isPlayoff ? '#2563eb' : '#dc2626';

  // ── Popularity / Fan-Hype display helpers ─────────────────────────────────
  const popDelta    = r.popEloDelta ?? 0;
  const fansM       = r.fansM       ?? 2;
  const avgPop      = r.avgPopularity ?? 50;

  // Threshold at 1M so values like 2.0M don't display as "2000K"
  const fansLabel = fansM >= 1
    ? `${fansM.toFixed(1)}M`
    : `${(fansM * 1000).toFixed(0)}K`;

  const hypeBadge = (() => {
    if (Math.abs(popDelta) < 0.002) return ''; // negligible — don't show
    const pos    = popDelta >= 0;
    const sign   = pos ? '+' : '';
    const pctImp = (popDelta / (r.baseStrength || 1) * 100).toFixed(1);
    const bg     = pos ? '#f0fdf4' : '#fef2f2';
    const border = pos ? '#bbf7d0' : '#fecaca';
    const color  = pos ? '#15803d' : '#dc2626';
    const lbl    = pos ? 'Fan Hype' : 'Low Popularity';
    return `<span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border"
      style="background:${bg};border-color:${border};color:${color}">
      ${pos ? '📈' : '📉'} ${sign}${pctImp}% Elo · ${lbl}
    </span>`;
  })();

  const popBarPct  = Math.max(0, Math.round(((avgPop - 35) / 65) * 100));
  const popBarCol  = avgPop >= 80 ? '#2563eb' : avgPop >= 60 ? '#d97706' : '#94a3b8';
  const popTier    = avgPop >= 85 ? 'Superstar Lineup' : avgPop >= 70 ? 'Star Power' : avgPop >= 55 ? 'Solid Roster' : 'Under the Radar';

  const maxes = { ppg: 280, rpg: 120, apg: 75, spg: 22, bpg: 18 };
  const statBar = (key, lbl, val) => {
    const pct   = Math.min(100, (val / maxes[key]) * 100);
    const color = pct >= 70 ? '#2563eb' : pct >= 45 ? '#d97706' : '#94a3b8';
    return `
    <div>
      <div class="flex justify-between text-xs mb-1.5">
        <span class="text-muted-fg font-medium">${lbl}</span>
        <span class="font-bold text-foreground">${val.toFixed(1)}</span>
      </div>
      <div class="h-1.5 rounded-full bg-border overflow-hidden">
        <div class="h-full rounded-full stat-bar-fill" style="width:${pct}%;background:${color}"></div>
      </div>
    </div>`;
  };

  const rosterRow = (p, posLabel, isStarter, fit = null) => {
    if (!p) return '';
    const fitBg    = fit === 'primary' ? '#dcfce7' : fit === 'flex' ? '#fef9c3' : fit ? '#fefce8' : null;
    const fitColor = fit === 'primary' ? '#15803d' : fit === 'flex' ? '#a16207' : fit ? '#d97706' : null;
    const fitText  = fit === 'primary' ? '✓' : fit === 'flex' ? '↔' : fit ? '+' : null;
    const fitBadge = fit
      ? `<span class="text-[8px] font-black px-1 py-0.5 rounded leading-none ml-0.5" style="background:${fitBg};color:${fitColor}">${fitText}</span>`
      : '';
    return `
    <div class="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <div class="flex items-center gap-0 w-12 flex-shrink-0">
        <span class="text-[10px] font-black ${isStarter ? 'text-primary' : 'text-muted-fg'}">${posLabel}</span>${fitBadge}
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm text-foreground truncate">${p.name}</p>
        <div class="flex items-center gap-1.5 mt-0.5">
          <p class="text-xs text-muted-fg">${p.team || ''} ${p.decade ? fmtDecadeShort(p.decade) : ''}</p>
          ${p.archetype ? archetypeBadge(p.archetype) : ''}
        </div>
      </div>
      <div class="flex gap-3 text-xs text-muted-fg flex-shrink-0">
        <span><span class="font-semibold text-foreground">${p.ppg}</span> PPG</span>
        <span><span class="font-semibold text-foreground">${p.rpg}</span> RPG</span>
        <span class="hidden sm:inline"><span class="font-semibold text-foreground">${p.apg}</span> APG</span>
      </div>
    </div>`;
  };

  const chemReportHtml = r.chemReport && r.chemReport.length > 0
    ? r.chemReport.map(item => {
        const isGood = item.startsWith('🟢');
        return `<div class="rounded-lg px-3 py-2 text-sm font-medium border"
          style="background:${isGood ? '#f0fdf4' : '#fef2f2'};border-color:${isGood ? '#bbf7d0' : '#fecaca'};color:${isGood ? '#15803d' : '#dc2626'}">${item}</div>`;
      }).join('')
    : `<p class="text-sm text-muted-fg py-1">No synergies or penalties — balanced roster.</p>`;

  const chemScoreBadge = r.chemScore !== undefined ? (() => {
    const sc      = r.chemScore;
    const scColor = sc >= 60 ? '#16a34a' : sc >= 40 ? '#d97706' : '#dc2626';
    const scBg    = sc >= 60 ? '#f0fdf4'  : sc >= 40 ? '#fffbeb'  : '#fef2f2';
    const scLabel = sc >= 60 ? 'Strong'   : sc >= 40 ? 'Neutral'  : 'Weak';
    return `<span class="text-xs font-bold px-2 py-0.5 rounded-full border" style="background:${scBg};color:${scColor};border-color:${scColor}30">${scLabel} · ${sc}%</span>`;
  })() : '';

  return `
  <div class="flex flex-col min-h-screen main-gradient">
    ${renderHeader(false)}
    <main class="flex-1 flex flex-col items-center px-4 py-6">
      <div class="w-full max-w-2xl flex flex-col gap-4 animate-fade-up">
        <div class="rounded-2xl border-2 bg-white p-6 text-center card-shadow ${isPerfect ? 'perfect-glow' : ''}"
          style="border-color:${isPerfect ? '#fcd34d' : '#e2e8f0'}">
          <p class="text-[10px] font-bold uppercase tracking-widest text-muted-fg mb-3">Season Record</p>
          <div class="text-7xl sm:text-8xl font-black mb-3 flex items-center justify-center gap-3 leading-none">
            <span style="color:${winsColor}">${r.wins}</span>
            <span class="text-muted text-4xl font-light">–</span>
            <span class="text-muted-fg">${r.losses}</span>
          </div>
          <span class="inline-block text-sm font-bold px-4 py-1.5 rounded-full mb-2" style="background:${labelBg};color:${labelColor}">${emoji} ${label}</span>
          <p class="text-xs text-muted-fg mb-2">Win% ${r.winPct}% &nbsp;·&nbsp; Strength Index ${r.strength}</p>
          <div class="flex items-center justify-center gap-2 flex-wrap">
            <span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border border-border bg-slate-50 text-slate-600">
              🌍 Global Fanbase: ${fansLabel}
            </span>
            ${hypeBadge}
          </div>
        </div>
        <div class="rounded-2xl border border-border bg-white p-4 card-shadow">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs font-bold uppercase tracking-widest text-muted-fg">Chemistry Report</p>
            ${chemScoreBadge}
          </div>
          <div class="flex flex-col gap-2">${chemReportHtml}</div>
        </div>
        <!-- ── Popularity / Fan-Hype card ───────────────────────────────── -->
        <div class="rounded-2xl border border-border bg-white p-4 card-shadow">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs font-bold uppercase tracking-widest text-muted-fg">Fan Popularity</p>
            <span class="text-xs font-bold px-2 py-0.5 rounded-full border"
              style="background:#f8fafc;color:${popBarCol};border-color:${popBarCol}30">${popTier}</span>
          </div>
          <!-- Popularity bar -->
          <div class="mb-3">
            <div class="flex justify-between text-xs mb-1.5">
              <span class="text-muted-fg font-medium">Avg. Roster Popularity</span>
              <span class="font-bold text-foreground">${avgPop}/100</span>
            </div>
            <div class="h-2 rounded-full bg-border overflow-hidden">
              <div class="h-full rounded-full stat-bar-fill" style="width:${popBarPct}%;background:${popBarCol}"></div>
            </div>
          </div>
          <!-- Fanbase + Elo impact row -->
          <div class="flex gap-3 flex-wrap">
            <div class="flex-1 rounded-xl border border-border bg-slate-50 px-3 py-2.5 text-center">
              <p class="text-[10px] font-bold uppercase tracking-wider text-muted-fg mb-1">Global Fanbase</p>
              <p class="text-xl font-black text-foreground">🌍 ${fansLabel}</p>
            </div>
            <div class="flex-1 rounded-xl border px-3 py-2.5 text-center"
              style="background:${popDelta >= 0 ? '#f0fdf4' : '#fef2f2'};border-color:${popDelta >= 0 ? '#bbf7d0' : '#fecaca'}">
              <p class="text-[10px] font-bold uppercase tracking-wider mb-1" style="color:${popDelta >= 0 ? '#15803d' : '#dc2626'}">${popDelta >= 0 ? '📈 Hype Boost' : '📉 Hype Penalty'}</p>
              <p class="text-xl font-black" style="color:${popDelta >= 0 ? '#15803d' : '#dc2626'}">${popDelta >= 0 ? '+' : ''}${(popDelta / (r.baseStrength || 1) * 100).toFixed(1)}% Elo</p>
            </div>
          </div>
          <!-- Player popularity breakdown -->
          <div class="mt-3 flex flex-col gap-1.5">
            ${[...Object.entries(S.roster)].filter(([,p]) => p).map(([pos, p]) => {
              const pop     = p.popularity ?? 50;
              const pct     = Math.max(0, Math.round(((pop - 35) / 65) * 100));
              const barCol  = pop >= 80 ? '#2563eb' : pop >= 60 ? '#d97706' : '#94a3b8';
              return `<div class="flex items-center gap-2">
                <span class="text-[10px] font-black w-6 flex-shrink-0 text-muted-fg">${pos}</span>
                <span class="text-xs font-semibold text-foreground w-28 flex-shrink-0 truncate">${p.name}</span>
                <div class="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                  <div class="h-full rounded-full" style="width:${pct}%;background:${barCol}"></div>
                </div>
                <span class="text-[10px] font-bold text-muted-fg w-6 text-right flex-shrink-0">${pop}</span>
              </div>`;
            }).join('')}
          </div>
        </div>
        <div class="rounded-2xl border border-border bg-white p-4 card-shadow">
          <p class="text-xs font-bold uppercase tracking-widest text-muted-fg mb-4">Team Statistics</p>
          <div class="flex flex-col gap-3">
            ${statBar('ppg', 'Points Per Game',   r.totals.ppg)}
            ${statBar('rpg', 'Rebounds Per Game', r.totals.rpg)}
            ${statBar('apg', 'Assists Per Game',  r.totals.apg)}
            ${statBar('spg', 'Steals Per Game',   r.totals.spg)}
            ${statBar('bpg', 'Blocks Per Game',   r.totals.bpg)}
          </div>
        </div>
        <div class="rounded-2xl border border-border bg-white p-4 card-shadow">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs font-bold uppercase tracking-widest text-muted-fg">Optimized Lineup</p>
            ${r.lineupAssignment?.length === 5 ? (() => {
              const allPrimary = r.lineupAssignment.every(a => a.fit === 'primary');
              const hasOOP     = r.lineupAssignment.some(a => a.fit === 'oop');
              const bg    = allPrimary ? '#f0fdf4' : '#fefce8';
              const color = allPrimary ? '#15803d' : '#a16207';
              const label = allPrimary ? '🟢 Flawless' : hasOOP ? '🟡 Versatile' : '🟡 Flex Lineup';
              return `<span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full border" style="background:${bg};color:${color};border-color:${color}30">${label}</span>`;
            })() : ''}
          </div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Starters — Engine Optimal Floor Assignment</p>
          <div class="flex flex-col mb-4">
            ${r.lineupAssignment?.length
              ? r.lineupAssignment.map(({ slot, player, fit }) => rosterRow(player, slot, true, fit)).join('')
              : POSITIONS.map(pos => rosterRow(S.roster[pos], pos, true)).join('')}
          </div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-muted-fg mb-1">Bench</p>
          <div class="flex flex-col">
            ${BENCH_POSITIONS.map(pos => rosterRow(S.roster[pos], S.roster[pos]?.pos || 'BN', false)).join('')}
          </div>
        </div>
        <!-- ── Save to Leaderboard card ─────────────────────────────── -->
        <div id="save-run-card" class="rounded-2xl border bg-white p-4 card-shadow"
          style="border-color:${S.runSaved ? '#bbf7d0' : '#e2e8f0'};background:${S.runSaved ? '#f0fdf4' : '#ffffff'}">
          ${S.runSaved ? `
          <div class="flex items-center gap-3">
            <span class="text-2xl">✅</span>
            <div>
              <p class="font-black text-sm text-green-700">Saved to Leaderboard!</p>
              <p class="text-xs text-green-600 mt-0.5">"${S.teamName}" &nbsp;·&nbsp; ${r.wins}–${r.losses}</p>
            </div>
            <button data-action="open-leaderboard" class="ml-auto text-xs font-bold px-3 py-1.5 rounded-lg border border-green-300 bg-white text-green-700 hover:bg-green-50 transition-all cursor-pointer">
              View Board
            </button>
          </div>` : `
          <p class="text-xs font-bold uppercase tracking-widest text-muted-fg mb-3">Save Your Run</p>
          <div class="flex gap-2">
            <div class="flex-1 relative">
              <input
                id="team-name-input"
                type="text"
                maxlength="20"
                value="${S.teamName || ''}"
                placeholder="Untitled Team"
                class="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-fg focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted pointer-events-none" id="team-name-counter">20</span>
            </div>
            <button data-action="save-run"
              class="flex-shrink-0 px-4 rounded-xl font-bold text-sm bg-primary text-white hover:bg-blue-700 transition-all cursor-pointer card-shadow">
              Save
            </button>
          </div>
          <p class="text-[10px] text-muted-fg mt-2">Defaults to "Untitled Team" if left blank · max 20 characters</p>`}
        </div>
        <!-- ── Action buttons ────────────────────────────────────────── -->
        <div class="flex flex-col gap-3">
          <button data-action="advance-to-playoffs" class="py-3.5 rounded-xl font-bold text-sm bg-primary text-white hover:bg-blue-700 transition-all cursor-pointer text-center card-shadow">
            Advance to Playoffs 🏆
          </button>
          <div class="grid grid-cols-2 gap-3">
            <button data-action="restart" class="py-3 rounded-xl font-bold text-sm border border-border bg-white text-foreground hover:border-primary hover:bg-card2 transition-all cursor-pointer card-shadow">
              Build Another
            </button>
            <button data-action="share" class="py-3 rounded-xl font-bold text-sm border border-border bg-white text-foreground hover:border-primary hover:bg-card2 transition-all cursor-pointer card-shadow">
              Share Result
            </button>
          </div>
        </div>
      </div>
    </main>
    ${renderFooter()}
  </div>`;
}

// ── Global score submit card ──────────────────────────────────────────────────

function renderGlobalSubmitCard(champion) {
  const r = S.result;
  if (!r) return '';

  if (S.globalScoreSubmitted) {
    const record = `${r.wins}–${r.losses}${champion ? ' · 🏆 Champion' : ''}`;
    return `
    <div class="rounded-2xl border p-4 card-shadow" style="border-color:#bbf7d0;background:#f0fdf4">
      <div class="flex items-start gap-3 mb-3">
        <span class="text-2xl flex-shrink-0">🌍</span>
        <div class="flex-1 min-w-0">
          <p class="font-black text-sm text-green-700">You're on the Global Board!</p>
          <p class="text-xs text-green-600 mt-0.5">"${S.teamName}" &nbsp;·&nbsp; ${record}</p>
        </div>
      </div>
      <button data-action="open-global-leaderboard"
        class="w-full py-2.5 rounded-xl font-bold text-sm border border-emerald-300 bg-white text-green-700 hover:bg-emerald-50 transition-all cursor-pointer">
        View Global Leaderboard 🌍
      </button>
    </div>`;
  }

  const label    = champion ? 'Submit Championship Run' : 'Submit Season Record';
  const subLabel = champion ? 'Your championship goes on the global board' : 'Share your season results with the world';
  const errorHtml = S.globalSubmitError
    ? `<p class="text-xs text-red-500 mt-2">⚠️ ${S.globalSubmitError}
        &nbsp;<button data-action="submit-global" class="underline cursor-pointer font-bold">Retry</button></p>`
    : '';

  return `
  <div class="rounded-2xl border border-border bg-white p-4 card-shadow">
    <div class="flex items-center gap-2 mb-3">
      <span class="text-lg">🌍</span>
      <div>
        <p class="text-xs font-black text-foreground">${label}</p>
        <p class="text-[10px] text-muted-fg">${subLabel}</p>
      </div>
    </div>
    <div class="flex gap-2">
      <div class="flex-1 relative">
        <input
          id="global-team-name-input"
          type="text"
          maxlength="30"
          value="${S.teamName || ''}"
          placeholder="Franchise Name"
          class="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-fg focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-100 transition-all"
        />
        <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted pointer-events-none" id="global-team-name-counter">30</span>
      </div>
      <button data-action="submit-global" id="submit-global-btn"
        class="flex-shrink-0 px-4 rounded-xl font-bold text-sm bg-primary text-white hover:bg-blue-700 transition-all cursor-pointer card-shadow">
        Submit
      </button>
    </div>
    ${errorHtml}
    <p class="text-[10px] text-muted-fg mt-2">Compete against players worldwide · max 30 characters</p>
  </div>`;
}

// ── Playoffs ──────────────────────────────────────────────────────────────────
function renderPlayoffs() {
  const po = S.playoffs;
  const r  = S.result;
  if (po.champion)   return renderChampionship();
  if (po.eliminated) return renderEliminated();

  const roundName       = po.roundNames[po.currentRound];
  const completedRounds = po.rounds;

  const renderTeamCard = (team, seriesScore = null, won = null) => {
    const isPlayer = team.isPlayer;
    const badge    = won === true ? '✅' : won === false ? '❌' : '';
    return `
      <div class="flex items-center gap-2 px-3 py-2 rounded-lg border ${isPlayer ? 'border-primary' : 'border-border'} ${isPlayer ? 'bg-blue-50' : 'bg-white'} card-shadow">
        <span class="text-xs font-bold ${isPlayer ? 'text-primary' : 'text-foreground'} flex-1 truncate">${isPlayer ? '⭐ ' : ''}${team.name}</span>
        ${seriesScore !== null ? `<span class="text-xs font-mono font-bold text-muted-fg">${seriesScore}</span>` : ''}
        ${badge ? `<span class="text-xs">${badge}</span>` : ''}
      </div>`;
  };

  const renderMatchup = (teamA, teamB, seriesA = null, seriesB = null) => {
    const wonA = seriesA !== null ? (seriesA > seriesB) : null;
    const wonB = seriesB !== null ? (seriesB > seriesA) : null;
    return `
      <div class="flex flex-col gap-1">
        ${renderTeamCard(teamA, seriesA, wonA)}
        <div class="text-center text-[10px] text-muted-fg font-bold">vs</div>
        ${renderTeamCard(teamB, seriesB, wonB)}
      </div>`;
  };

  let bracketHTML = '';
  const ts = po.tickState;

  for (let ri = 0; ri < completedRounds.length; ri++) {
    bracketHTML += `
      <div class="mb-4">
        <p class="text-[10px] font-bold uppercase tracking-widest text-muted-fg mb-2">${po.roundNames[ri]}</p>
        <div class="grid grid-cols-2 gap-3">
          ${completedRounds[ri].map(sr => renderMatchup(sr.teamA, sr.teamB, sr.playerWins, sr.oppWins)).join('')}
        </div>
      </div>`;
  }

  if (ts) {
    const renderTickingMatchup = (sr) => {
      const isPlayerSeries = sr.teamA.isPlayer || sr.teamB.isPlayer;
      const revealedGames  = sr.games.slice(0, ts.revealedGames);
      const pending        = !ts.done && revealedGames.length < sr.games.length;
      const gameBubbles    = revealedGames.map(g =>
        `<span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black ${g === 'W' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-600 border border-red-200'}">${g}</span>`
      ).join('');
      const pendingDot = pending
        ? `<span class="inline-flex items-center justify-center w-6 h-6 rounded-full border-2 border-dashed border-border text-muted-fg text-[10px] animate-pulse">·</span>`
        : '';
      const pWins = revealedGames.filter(g => g === 'W').length;
      const oWins = revealedGames.filter(g => g === 'L').length;
      return `
        <div class="flex flex-col gap-2 p-3 rounded-xl border ${isPlayerSeries ? 'border-primary bg-blue-50' : 'border-border bg-white'} card-shadow">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-bold ${sr.teamA.isPlayer ? 'text-primary' : 'text-foreground'} truncate">${sr.teamA.isPlayer ? '⭐ ' : ''}${sr.teamA.name}</span>
            <span class="text-xs font-mono text-foreground font-black">${pWins}–${oWins}</span>
            <span class="text-xs font-bold ${sr.teamB.isPlayer ? 'text-primary' : 'text-foreground'} truncate text-right">${sr.teamB.isPlayer ? '⭐ ' : ''}${sr.teamB.name}</span>
          </div>
          <div class="flex flex-wrap gap-1">${gameBubbles}${pendingDot}</div>
        </div>`;
    };
    bracketHTML += `
      <div class="mb-4">
        <p class="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">${roundName} — Simulating...</p>
        <div class="flex flex-col gap-3">${ts.results.map(sr => renderTickingMatchup(sr)).join('')}</div>
      </div>`;
  } else {
    bracketHTML += `
      <div class="mb-4">
        <p class="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">${roundName} — Up Next</p>
        <div class="grid grid-cols-2 gap-3">
          ${po.bracket.map(([a, b]) => renderMatchup(a, b)).join('')}
        </div>
      </div>`;
  }

  return `
  <div class="min-h-screen flex flex-col main-gradient">
    ${renderHeader(false)}
    <main class="flex-1 flex flex-col items-center px-4 py-8">
      <div class="w-full max-w-lg flex flex-col gap-5">
        <div class="text-center">
          <p class="text-xs font-bold uppercase tracking-widest text-primary mb-1">NBA Playoffs</p>
          <h1 class="text-2xl font-black text-foreground">Playoff Bracket</h1>
          <p class="text-sm text-muted-fg mt-1">Regular Season: ${r.wins}–${r.losses} · Seed #${po.playerSeed}</p>
        </div>
        <div class="rounded-2xl border border-border bg-white p-4 card-shadow">${bracketHTML}</div>
        <button data-action="sim-next-round" ${ts ? 'disabled' : ''}
          class="py-4 rounded-xl font-black text-base transition-all text-center card-shadow ${ts ? 'bg-card2 border border-border text-muted-fg cursor-not-allowed' : 'bg-primary text-white hover:bg-blue-700 cursor-pointer'}">
          ${ts ? 'Simulating...' : `Simulate ${roundName} →`}
        </button>
        <button data-action="draft-new-roster"
          class="py-3 rounded-xl font-bold text-sm border border-border bg-white text-foreground hover:border-primary hover:bg-card2 transition-all cursor-pointer text-center card-shadow">
          Draft New Roster
        </button>
      </div>
    </main>
    ${renderFooter()}
  </div>`;
}

function renderChampionship() {
  const po = S.playoffs;
  const r  = S.result;
  const finalsResult = po.rounds[po.rounds.length - 1].find(sr => sr.teamA.isPlayer || sr.teamB.isPlayer);
  const oppTeam = finalsResult.teamA.isPlayer ? finalsResult.teamB : finalsResult.teamA;
  const score   = finalsResult.teamA.isPlayer
    ? `${finalsResult.playerWins}–${finalsResult.oppWins}`
    : `${finalsResult.oppWins}–${finalsResult.playerWins}`;
  const roundSummary = po.rounds.map((round, i) => {
    const sr = round.find(s => s.teamA.isPlayer || s.teamB.isPlayer);
    if (!sr) return '';
    const opp = sr.teamA.isPlayer ? sr.teamB : sr.teamA;
    const w   = sr.teamA.isPlayer ? sr.playerWins : sr.oppWins;
    const l   = sr.teamA.isPlayer ? sr.oppWins   : sr.playerWins;
    return `<p class="text-sm text-muted-fg">${po.roundNames[i]}: <span class="text-foreground font-semibold">def. ${opp.name} ${w}–${l}</span></p>`;
  }).join('');
  return `
  <div class="min-h-screen flex flex-col main-gradient">
    ${renderHeader(false)}
    <main class="flex-1 flex flex-col items-center justify-center px-4 py-8">
      <div class="w-full max-w-lg flex flex-col gap-5 items-center text-center animate-fade-up">
        <div class="text-6xl mb-2">🏆</div>
        <h1 class="text-3xl font-black text-primary">WORLD CHAMPIONS!</h1>
        <p class="text-base text-foreground">Your team conquered the NBA Playoffs!</p>
        <div class="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 w-full text-left card-shadow">
          <p class="text-xs font-bold uppercase tracking-widest text-amber-600 mb-3">Championship Run</p>
          ${roundSummary}
          <p class="text-base font-black text-amber-700 mt-3">NBA Finals: def. ${oppTeam.name} ${score}</p>
          <p class="text-sm text-muted-fg mt-2">Regular Season: ${r.wins}–${r.losses} · Seed #${po.playerSeed}</p>
        </div>
        ${renderGlobalSubmitCard(true)}
        <div class="flex flex-col gap-3 w-full">
          <button data-action="share" class="py-3 rounded-xl font-bold text-sm bg-primary text-white hover:bg-blue-700 transition-all cursor-pointer card-shadow">Share Championship 🏆</button>
          <button data-action="draft-new-roster" class="py-3 rounded-xl font-bold text-sm border border-border bg-white text-foreground hover:border-primary hover:bg-card2 transition-all cursor-pointer card-shadow">Draft New Roster</button>
        </div>
      </div>
    </main>
    ${renderFooter()}
  </div>`;
}

function renderEliminated() {
  const po = S.playoffs;
  const r  = S.result;
  const lastRound = po.rounds[po.rounds.length - 1];
  const roundSummary = po.rounds.map((round, i) => {
    const sr  = round.find(s => s.teamA.isPlayer || s.teamB.isPlayer);
    if (!sr) return '';
    const opp = sr.teamA.isPlayer ? sr.teamB : sr.teamA;
    const w   = sr.teamA.isPlayer ? sr.playerWins : sr.oppWins;
    const l   = sr.teamA.isPlayer ? sr.oppWins   : sr.playerWins;
    const won = w > l;
    return `<p class="text-sm ${won ? 'text-muted-fg' : 'text-red-500'}">${po.roundNames[i]}: <span class="${won ? 'text-foreground' : 'text-red-600'} font-semibold">${won ? `def. ${opp.name} ${w}–${l}` : `lost to ${opp.name} ${w}–${l}`}</span></p>`;
  }).join('');
  return `
  <div class="min-h-screen flex flex-col main-gradient">
    ${renderHeader(false)}
    <main class="flex-1 flex flex-col items-center justify-center px-4 py-8">
      <div class="w-full max-w-lg flex flex-col gap-5 items-center text-center animate-fade-up">
        <div class="text-5xl mb-2">💔</div>
        <h1 class="text-2xl font-black text-foreground">Eliminated</h1>
        <p class="text-sm text-muted-fg">in the <span class="text-foreground font-semibold">${po.eliminatedIn}</span></p>
        <div class="rounded-2xl border border-border bg-white p-5 w-full text-left card-shadow">
          <p class="text-xs font-bold uppercase tracking-widest text-muted-fg mb-3">Playoff Run</p>
          ${roundSummary}
          <p class="text-sm text-muted-fg mt-3">Regular Season: ${r.wins}–${r.losses} · Seed #${po.playerSeed}</p>
        </div>
        ${renderGlobalSubmitCard(false)}
        <div class="flex flex-col gap-3 w-full">
          <button data-action="draft-new-roster" class="py-3 rounded-xl font-bold text-sm bg-primary text-white hover:bg-blue-700 transition-all cursor-pointer card-shadow">Draft New Roster</button>
          <button data-action="share" class="py-3 rounded-xl font-bold text-sm border border-border bg-white text-foreground hover:border-primary hover:bg-card2 transition-all cursor-pointer card-shadow">Share Result</button>
        </div>
      </div>
    </main>
    ${renderFooter()}
  </div>`;
}

// ── Trophy Room ───────────────────────────────────────────────────────────────
function renderTrophyRoom() {
  let trophies = [];
  try { trophies = JSON.parse(localStorage.getItem('nba820_trophies') || '[]'); } catch (e) {}
  const emptyState = `
    <div class="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div class="text-5xl">🏀</div>
      <h2 class="text-xl font-black text-foreground">No Championships Yet</h2>
      <p class="text-sm text-muted-fg max-w-xs">Draft your first legendary roster and win the NBA Finals to enshrine it here.</p>
    </div>`;
  const trophyCards = trophies.map(t => {
    const isPerfect = t.wins === 82 && t.losses === 0;
    const cb  = isPerfect ? 'border-amber-300' : 'border-border';
    const cbg = isPerfect ? 'bg-amber-50' : 'bg-white';
    const cgl = isPerfect ? 'style="box-shadow:0 2px 16px rgba(217,119,6,0.15)"' : 'class="card-shadow"';
    return `
      <div class="rounded-2xl border p-4 flex flex-col gap-3 ${cb} ${cbg}" ${cgl}>
        ${isPerfect ? `<p class="text-[10px] font-black uppercase tracking-widest text-amber-600">⭐ Perfect Season — 82-0</p>` : ''}
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="font-black text-base ${isPerfect ? 'text-amber-700' : 'text-primary'} truncate">${t.coachName}</p>
            <p class="text-xs text-muted-fg">${t.coachSystem}</p>
          </div>
          <div class="text-right flex-shrink-0">
            <p class="font-black text-lg ${isPerfect ? 'text-amber-700' : 'text-foreground'}">${t.wins}–${t.losses}</p>
            <p class="text-xs text-muted-fg">${t.date}</p>
          </div>
        </div>
        <div class="border-t ${isPerfect ? 'border-amber-200' : 'border-border'} pt-3 flex flex-col gap-2">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-widest text-muted-fg mb-1">Starting 5</p>
            <p class="text-xs text-foreground leading-relaxed">${t.starters}</p>
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-widest text-muted-fg mb-1">Bench</p>
            <p class="text-xs text-foreground leading-relaxed">${t.bench}</p>
          </div>
        </div>
        <div class="flex items-center justify-between border-t ${isPerfect ? 'border-amber-200' : 'border-border'} pt-2.5">
          <p class="text-xs text-muted-fg">Chemistry</p>
          <p class="text-xs font-bold ${isPerfect ? 'text-amber-600' : 'text-primary'}">${t.chemScore}%</p>
        </div>
      </div>`;
  }).join('');
  return `
  <div class="flex flex-col min-h-screen main-gradient">
    ${renderHeader(false)}
    <main class="flex-1 flex flex-col items-center px-4 pt-6 pb-8">
      <div class="w-full max-w-2xl flex flex-col gap-5 animate-fade-up">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1">Hall of Fame</p>
            <h1 class="text-2xl font-black text-foreground">Trophy Room</h1>
          </div>
          <button data-action="back-to-menu"
            class="flex-shrink-0 text-[11px] px-3 py-1.5 rounded-full border border-border bg-card2 text-muted-fg hover:text-foreground hover:border-primary transition-all cursor-pointer">
            ← Main Menu
          </button>
        </div>
        ${trophies.length === 0 ? emptyState : `<div class="flex flex-col gap-4">${trophyCards}</div>`}
      </div>
    </main>
    ${renderFooter()}
  </div>`;
}

// ── 1v1 Series Result screen ──────────────────────────────────────────────────
function renderSeriesResult() {
  const sr     = S.seriesResult;
  const winner = sr.winner; // 'p1' | 'p2'
  const p1s    = sr.p1Season;
  const p2s    = sr.p2Season;
  const series = sr.series;  // { playerWins, oppWins, games, won }
  const p1Wins = series.playerWins;
  const p2Wins = series.oppWins;
  const p1Win  = winner === 'p1';

  const winnerColor = p1Win ? '#2563eb' : '#d97706';
  const winnerBg    = p1Win ? '#eff6ff'  : '#fffbeb';
  const loserLabel  = p1Win ? 'Player 2' : 'Player 1';
  const winnerLabel = p1Win ? 'Player 1' : 'Player 2';

  const gameChips = series.games.map((g, i) => {
    const p1Won = g === 'W';
    return `<div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2"
      style="background:${p1Won ? '#eff6ff' : '#fffbeb'};color:${p1Won ? '#2563eb' : '#d97706'};border-color:${p1Won ? '#bfdbfe' : '#fde68a'}">
      ${p1Won ? 'P1' : 'P2'}</div>`;
  }).join('');

  const p1CoachId = S.p1Coach || S.p1?.coach;
  const p2CoachId = S.p2Coach || S.coach;
  const p1Coach   = COACHES.find(c => c.id === p1CoachId);
  const p2Coach   = COACHES.find(c => c.id === p2CoachId);

  const rosterMini = (roster, positions) => positions.map(pos => {
    const p = roster[pos];
    if (!p) return '';
    return `<div class="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
      <span class="text-[10px] font-black text-muted-fg w-6 flex-shrink-0">${pos}</span>
      <span class="text-xs font-semibold text-foreground flex-1 truncate">${p.name}</span>
      <span class="text-[10px] text-muted-fg">${p.ppg}pt</span>
    </div>`;
  }).join('');

  const chemBadge = (chemScore) => {
    const sc = Math.round(chemScore ?? 0);
    const c  = sc >= 60 ? '#16a34a' : sc >= 40 ? '#d97706' : '#dc2626';
    const bg = sc >= 60 ? '#f0fdf4' : sc >= 40 ? '#fffbeb' : '#fef2f2';
    return `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full border" style="color:${c};background:${bg};border-color:${c}30">Chem ${sc}%</span>`;
  };

  // fire confetti for the winner
  setTimeout(() => {
    if (typeof confetti !== 'undefined') {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: p1Win ? ['#2563eb','#93c5fd','#ffffff'] : ['#d97706','#fde68a','#ffffff'] });
    }
  }, 150);

  return `
  <div class="flex flex-col min-h-screen main-gradient">
    ${renderHeader(false)}
    <main class="flex-1 flex flex-col items-center px-4 py-6">
      <div class="w-full max-w-2xl flex flex-col gap-4 animate-fade-up">

        <!-- Winner banner -->
        <div class="rounded-2xl border-2 p-6 text-center card-shadow" style="border-color:${winnerColor}40;background:${winnerBg}">
          <p class="text-[10px] font-bold uppercase tracking-widest text-muted-fg mb-2">Series Result</p>
          <p class="text-5xl font-black mb-2" style="color:${winnerColor}">${p1Wins}–${p2Wins}</p>
          <p class="text-lg font-black text-foreground mb-1">🏆 ${winnerLabel} Wins the Series!</p>
          <p class="text-sm text-muted-fg">${loserLabel} put up a fight — ${p1Win ? p2Wins : p1Wins} ${(p1Win ? p2Wins : p1Wins) === 1 ? 'game' : 'games'} won.</p>
        </div>

        <!-- Game-by-game log -->
        <div class="rounded-2xl border border-border bg-white p-4 card-shadow">
          <p class="text-xs font-bold uppercase tracking-widest text-muted-fg mb-3">Game-by-Game</p>
          <div class="flex gap-2 flex-wrap">${gameChips}</div>
          <div class="flex gap-4 mt-3 text-xs text-muted-fg">
            <span><span class="font-bold" style="color:#2563eb">P1</span> = Player 1 won that game</span>
            <span><span class="font-bold" style="color:#d97706">P2</span> = Player 2 won that game</span>
          </div>
        </div>

        <!-- Roster comparison -->
        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-2xl border p-4 card-shadow" style="border-color:#bfdbfe;background:#f8fbff">
            <div class="flex items-center justify-between mb-3">
              <p class="text-xs font-bold uppercase tracking-widest" style="color:#2563eb">Player 1</p>
              ${chemBadge(p1s.chemScore)}
            </div>
            ${p1Coach ? `<p class="text-[10px] text-muted-fg mb-2 font-medium">Coach: ${p1Coach.name}</p>` : ''}
            <p class="text-[10px] font-bold uppercase tracking-wider text-muted-fg/60 mb-1">Starters</p>
            ${rosterMini(S.p1Roster || S.p1?.roster || {}, ['PG','SG','SF','PF','C'])}
            <p class="text-[10px] font-bold uppercase tracking-wider text-muted-fg/60 mb-1 mt-2">Bench</p>
            ${rosterMini(S.p1Roster || S.p1?.roster || {}, ['B1','B2'])}
          </div>
          <div class="rounded-2xl border p-4 card-shadow" style="border-color:#fde68a;background:#fffef8">
            <div class="flex items-center justify-between mb-3">
              <p class="text-xs font-bold uppercase tracking-widest" style="color:#d97706">Player 2</p>
              ${chemBadge(p2s.chemScore)}
            </div>
            ${p2Coach ? `<p class="text-[10px] text-muted-fg mb-2 font-medium">Coach: ${p2Coach.name}</p>` : ''}
            <p class="text-[10px] font-bold uppercase tracking-wider text-muted-fg/60 mb-1">Starters</p>
            ${rosterMini(S.p2Roster || S.roster, ['PG','SG','SF','PF','C'])}
            <p class="text-[10px] font-bold uppercase tracking-wider text-muted-fg/60 mb-1 mt-2">Bench</p>
            ${rosterMini(S.p2Roster || S.roster, ['B1','B2'])}
          </div>
        </div>

        <!-- Strength comparison -->
        <div class="rounded-2xl border border-border bg-white p-4 card-shadow">
          <p class="text-xs font-bold uppercase tracking-widest text-muted-fg mb-3">Team Strength</p>
          <div class="flex flex-col gap-2">
            ${(() => {
              const maxStr = Math.max(p1s.strength, p2s.strength, 0.01);
              const p1pct  = Math.round((p1s.strength / maxStr) * 100);
              const p2pct  = Math.round((p2s.strength / maxStr) * 100);
              return `
              <div>
                <div class="flex justify-between text-xs mb-1"><span class="font-bold" style="color:#2563eb">Player 1</span><span class="font-semibold text-foreground">${p1s.strength.toFixed(3)}</span></div>
                <div class="h-2.5 rounded-full bg-border overflow-hidden"><div class="h-full rounded-full" style="width:${p1pct}%;background:#2563eb"></div></div>
              </div>
              <div>
                <div class="flex justify-between text-xs mb-1"><span class="font-bold" style="color:#d97706">Player 2</span><span class="font-semibold text-foreground">${p2s.strength.toFixed(3)}</span></div>
                <div class="h-2.5 rounded-full bg-border overflow-hidden"><div class="h-full rounded-full" style="width:${p2pct}%;background:#d97706"></div></div>
              </div>`;
            })()}
          </div>
        </div>

        <!-- Actions -->
        <button data-action="series-play-again"
          class="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest bg-primary text-white hover:bg-blue-700 transition-all cursor-pointer">
          Play Again →
        </button>

      </div>
    </main>
    ${renderFooter()}
  </div>`;
}

// ── 1v1 Series Preview screen ─────────────────────────────────────────────────
function renderSeriesPreview() {
  const sr   = S.seriesResult;
  const p1s  = sr.p1Season;
  const p2s  = sr.p2Season;
  const p1CoachObj = COACHES.find(c => c.id === S.p1Coach);
  const p2CoachObj = COACHES.find(c => c.id === S.p2Coach);
  const maxStr  = Math.max(p1s.strength, p2s.strength, 0.01);
  const p1pct   = Math.round((p1s.strength / maxStr) * 100);
  const p2pct   = Math.round((p2s.strength / maxStr) * 100);

  const rosterMini = (roster, color) => ALL_POSITIONS.map(pos => {
    const p = roster[pos];
    const isBench = BENCH_POSITIONS.includes(pos);
    return `<div class="flex items-center gap-1.5 py-1 border-b border-border last:border-0">
      <span class="text-[10px] font-black w-5 flex-shrink-0" style="color:${p ? color : '#cbd5e1'}">${isBench ? 'BN' : pos}</span>
      <span class="text-xs font-semibold flex-1 truncate ${p ? 'text-foreground' : 'text-muted-fg/40'}">${p ? p.name : '—'}</span>
      ${p ? `<span class="text-[10px] text-muted-fg">${p.ppg}pt</span>` : ''}
    </div>`;
  }).join('');

  return `
  <div class="flex flex-col min-h-screen main-gradient">
    ${renderHeader(false)}
    <main class="flex-1 flex flex-col items-center px-4 py-6">
      <div class="w-full max-w-2xl flex flex-col gap-4 animate-fade-up">

        <div class="text-center">
          <p class="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Best-of-7 Series</p>
          <h1 class="text-2xl font-black text-foreground">The Matchup</h1>
          <p class="text-sm text-muted-fg mt-1">Rosters are set. Time to see who wins.</p>
        </div>

        <!-- Strength comparison -->
        <div class="rounded-2xl border border-border bg-white p-4 card-shadow">
          <p class="text-[10px] font-bold uppercase tracking-widest text-muted-fg mb-3">Team Strength</p>
          <div class="flex flex-col gap-2">
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="font-bold" style="color:#2563eb">Player 1${p1CoachObj ? ` · ${p1CoachObj.name}` : ''}</span>
                <span class="font-semibold text-foreground">${p1s.strength.toFixed(3)}</span>
              </div>
              <div class="h-2.5 rounded-full bg-border overflow-hidden">
                <div class="h-full rounded-full stat-bar-fill" style="width:${p1pct}%;background:#2563eb"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="font-bold" style="color:#d97706">Player 2${p2CoachObj ? ` · ${p2CoachObj.name}` : ''}</span>
                <span class="font-semibold text-foreground">${p2s.strength.toFixed(3)}</span>
              </div>
              <div class="h-2.5 rounded-full bg-border overflow-hidden">
                <div class="h-full rounded-full stat-bar-fill" style="width:${p2pct}%;background:#d97706"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Side-by-side rosters -->
        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-2xl border-2 bg-white p-3 card-shadow" style="border-color:#bfdbfe">
            <p class="text-xs font-black uppercase tracking-wider mb-2" style="color:#2563eb">Player 1</p>
            ${rosterMini(S.p1Roster, '#2563eb')}
          </div>
          <div class="rounded-2xl border-2 bg-white p-3 card-shadow" style="border-color:#fde68a">
            <p class="text-xs font-black uppercase tracking-wider mb-2" style="color:#d97706">Player 2</p>
            ${rosterMini(S.p2Roster, '#d97706')}
          </div>
        </div>

        <button data-action="begin-series"
          class="w-full py-4 rounded-xl font-black text-base uppercase tracking-widest bg-primary text-white hover:bg-blue-700 transition-all cursor-pointer animate-pulse-glow card-shadow">
          🏀 Begin The Series →
        </button>

      </div>
    </main>
    ${renderFooter()}
  </div>`;
}

// ── 1v1 Series Simulation screen ──────────────────────────────────────────────
function renderSeriesSim() {
  const sr       = S.seriesResult;
  const revealed = S.seriesRevealedCount ?? 0;
  const games    = sr.games; // array of { gameNum, p1Score, p2Score, p1Won, p1WinsAfter, p2WinsAfter }
  const lastGame = revealed > 0 ? games[revealed - 1] : null;
  const p1Wins   = lastGame ? lastGame.p1WinsAfter : 0;
  const p2Wins   = lastGame ? lastGame.p2WinsAfter : 0;
  const seriesOver = p1Wins === 4 || p2Wins === 4;
  const nextGameNum = revealed + 1;

  let statusText, statusColor, statusBg, statusBdr;
  if (!revealed) {
    statusText  = 'Series Not Started';
    statusColor = '#64748b'; statusBg = '#f8fafc'; statusBdr = '#e2e8f0';
  } else if (seriesOver) {
    const w = p1Wins === 4 ? 'Player 1' : 'Player 2';
    const wc = p1Wins === 4 ? '#2563eb' : '#d97706';
    statusText  = `🏆 ${w} wins the series ${p1Wins}–${p2Wins}!`;
    statusColor = wc; statusBg = p1Wins === 4 ? '#eff6ff' : '#fffbeb'; statusBdr = wc + '40';
  } else if (p1Wins === p2Wins) {
    statusText  = `Series tied ${p1Wins}–${p2Wins}`;
    statusColor = '#64748b'; statusBg = '#f8fafc'; statusBdr = '#e2e8f0';
  } else {
    const leader = p1Wins > p2Wins ? 'Player 1' : 'Player 2';
    const lc     = p1Wins > p2Wins ? '#2563eb' : '#d97706';
    const lw = Math.max(p1Wins, p2Wins), ll = Math.min(p1Wins, p2Wins);
    statusText  = `${leader} leads ${lw}–${ll}`;
    statusColor = lc; statusBg = p1Wins > p2Wins ? '#eff6ff' : '#fffbeb'; statusBdr = lc + '40';
  }

  const gameRows = games.map((g, i) => {
    if (i >= revealed) {
      return `<div class="flex items-center gap-3 py-2.5 border-b border-border last:border-0 opacity-40">
        <span class="text-[10px] font-bold text-muted-fg w-12 flex-shrink-0">Game ${g.gameNum}</span>
        <span class="flex-1 text-xs text-muted-fg font-medium">TBD</span>
      </div>`;
    }
    const p1Won = g.p1Won;
    const wc    = p1Won ? '#2563eb' : '#d97706';
    const wlbl  = p1Won ? 'P1 W' : 'P2 W';
    const wbg   = p1Won ? '#eff6ff' : '#fffbeb';
    return `<div class="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <span class="text-[10px] font-bold text-muted-fg w-12 flex-shrink-0">Game ${g.gameNum}</span>
      <span class="flex-1 text-sm font-black text-foreground">
        <span style="color:#2563eb">${g.p1Score}</span>
        <span class="text-muted-fg font-normal mx-1">–</span>
        <span style="color:#d97706">${g.p2Score}</span>
      </span>
      <span class="text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0" style="background:${wbg};color:${wc}">${wlbl}</span>
      <span class="text-[10px] text-muted-fg flex-shrink-0">${g.p1WinsAfter}–${g.p2WinsAfter}</span>
    </div>`;
  }).join('');

  return `
  <div class="flex flex-col min-h-screen main-gradient">
    ${renderHeader(false)}
    <main class="flex-1 flex flex-col items-center px-4 py-6">
      <div class="w-full max-w-xl flex flex-col gap-4 animate-fade-up">

        <!-- Series status banner -->
        <div class="rounded-xl px-4 py-3 text-center font-black text-sm border-2 transition-all"
          style="background:${statusBg};color:${statusColor};border-color:${statusBdr}">
          ${statusText}
        </div>

        <!-- Win counters -->
        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-2xl border-2 p-4 text-center card-shadow" style="border-color:${p1Wins > p2Wins ? '#2563eb' : '#bfdbfe'};background:${p1Wins > p2Wins ? '#eff6ff' : '#f8fbff'}">
            <p class="text-[10px] font-bold uppercase tracking-widest mb-1" style="color:#2563eb">Player 1</p>
            <p class="text-5xl font-black" style="color:#2563eb">${p1Wins}</p>
            <p class="text-[10px] text-muted-fg mt-1">${p1Wins === 1 ? 'win' : 'wins'}</p>
          </div>
          <div class="rounded-2xl border-2 p-4 text-center card-shadow" style="border-color:${p2Wins > p1Wins ? '#d97706' : '#fde68a'};background:${p2Wins > p1Wins ? '#fffbeb' : '#fffef8'}">
            <p class="text-[10px] font-bold uppercase tracking-widest mb-1" style="color:#d97706">Player 2</p>
            <p class="text-5xl font-black" style="color:#d97706">${p2Wins}</p>
            <p class="text-[10px] text-muted-fg mt-1">${p2Wins === 1 ? 'win' : 'wins'}</p>
          </div>
        </div>

        <!-- Scoreboard -->
        <div class="rounded-2xl border border-border bg-white p-4 card-shadow">
          <div class="flex items-center justify-between mb-3">
            <p class="text-[10px] font-bold uppercase tracking-widest text-muted-fg">Scoreboard</p>
            <div class="flex gap-3 text-[10px] font-bold text-muted-fg">
              <span style="color:#2563eb">P1</span>
              <span style="color:#d97706">P2</span>
            </div>
          </div>
          <div class="flex flex-col">${gameRows}</div>
        </div>

        <!-- CTA button -->
        ${seriesOver
          ? `<button data-action="series-to-recap"
              class="w-full py-4 rounded-xl font-black text-base uppercase tracking-widest bg-primary text-white hover:bg-blue-700 transition-all cursor-pointer card-shadow animate-pulse-glow">
              View Full Recap →
            </button>`
          : `<button data-action="sim-next-game"
              class="w-full py-4 rounded-xl font-black text-base uppercase tracking-widest bg-primary text-white hover:bg-blue-700 transition-all cursor-pointer card-shadow">
              ▶ Simulate Game ${nextGameNum}
            </button>`
        }

      </div>
    </main>
    ${renderFooter()}
  </div>`;
}

// ── Main render dispatcher ────────────────────────────────────────────────────
export function render() {
  if      (S.phase === 'mode-select')   $app.innerHTML = renderModeSelect();
  else if (S.phase === 'coach-select')  $app.innerHTML = renderCoachSelect();
  else if (S.phase === 'era-select')    $app.innerHTML = renderEraSelect();
  else if (S.phase === 'drafting')      $app.innerHTML = renderDrafting();
  else if (S.phase === 'results')       $app.innerHTML = renderResults();
  else if (S.phase === 'playoffs')      $app.innerHTML = renderPlayoffs();
  else if (S.phase === 'trophy-room')   $app.innerHTML = renderTrophyRoom();
  else if (S.phase === 'series-preview') $app.innerHTML = renderSeriesPreview();
  else if (S.phase === 'series-sim')    $app.innerHTML = renderSeriesSim();
  else if (S.phase === 'series-result') $app.innerHTML = renderSeriesResult();
  bindEvents();

  // Wire up character counter for the local save input (results screen)
  if (S.phase === 'results' && !S.runSaved) {
    const input   = document.getElementById('team-name-input');
    const counter = document.getElementById('team-name-counter');
    if (input && counter) {
      const update = () => { counter.textContent = 20 - input.value.length; };
      update();
      input.addEventListener('input', update);
    }
  }

  // Wire up character counter for the global submit input (championship / eliminated)
  if (!S.globalScoreSubmitted) {
    const gInput   = document.getElementById('global-team-name-input');
    const gCounter = document.getElementById('global-team-name-counter');
    if (gInput && gCounter) {
      const update = () => { gCounter.textContent = 30 - gInput.value.length; };
      update();
      gInput.addEventListener('input', update);
    }
  }
}
