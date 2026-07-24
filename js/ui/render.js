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
  S, POSITIONS, ALL_POSITIONS, TOTAL_ROUNDS,
  COACHES, ERA_DESC, TEAM_COLORS, ARCHETYPE_STYLE, DECADES, TEAMS, pickCosmetic, SNAKE_ORDER,
  getUtcDateString,
} from '../logic/state.js';
import { calculateChemistry, chemTier, chemTierColors }                             from '../logic/chemistry.js';
import { rosterFull, availableDecades, getLegendCatalog, getSkips } from '../logic/draft.js';
import { coachSystemProgress }                            from '../logic/simulation.js';
import { getBracketDisplayState }                         from '../logic/playoffs.js';
import { markReturning, getCollectedLegends, getDailyStatus } from '../utils/storage.js';
import { cgGameplayStart, cgGameplayStop, cgGetItem }     from '../utils/crazygames.js';
import { gdRewardedAvailable }                            from '../utils/gamedistribution.js';
import { getDailyChallenge, checkPickLegal, checkRosterConstraint } from '../logic/challenge.js';
import { isDualDraft, seriesLabels, MORE_MODES, fansFirstScore } from '../logic/modes.js';
import { seasonTier } from '../logic/seasonTier.js';
import { fetchDailyCommunityStats, isFirebaseConfigured } from '../utils/firebase.js';
import { bindEvents }                                     from '../ui/events.js'; // circular — safe (called inside functions only)

// ── Mount point ───────────────────────────────────────────────────────────────
export const $app = document.getElementById('app');

// ── HTML escaping ─────────────────────────────────────────────────────────────
// For user-controlled strings (team names) interpolated into innerHTML or
// attribute values. Player/coach names from the DB are trusted app data.
const esc = s => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// ── Chemistry dashboard cache ─────────────────────────────────────────────────
// Keyed by coach + roster slot order (fixed PG/SG/SF/PF/C order, so this is
// stable per roster) — recalculates only when the roster or coach changes.
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
function isDark() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;
}

// The drafting screen swaps to an entirely different DOM structure (3-column
// app shell, each column scrolling independently so the whole screen fits in
// one viewport) at this width — see renderDrafting(). Below it, the screen
// is the original flat single-column layout untouched.
function isDesktopDraftLayout() {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
}

// Re-render on resize if that swap needs to flip, since nothing else
// triggers a render when the user just drags the window across the
// breakpoint without otherwise interacting.
if (typeof window !== 'undefined') {
  let _lastIsDesktopDraft = isDesktopDraftLayout();
  window.addEventListener('resize', () => {
    const now = isDesktopDraftLayout();
    if (now !== _lastIsDesktopDraft) {
      _lastIsDesktopDraft = now;
      if (S.phase === 'drafting') render();
    }
  });
}

const FANS_TEAM_MAX = 500; // 5 starters × 100 max fans each

function fansBarCol(avg, dark = isDark()) {
  if (avg >= 80) return dark ? '#60a5fa' : '#2563eb';
  if (avg >= 60) return dark ? '#fbbf24' : '#d97706';
  return dark ? '#cbd5e1' : '#94a3b8';
}

function fansTierFromAvg(avg) {
  if (!avg) return { tier: '', barCol: '#cbd5e1' };
  return {
    tier:   avg >= 85 ? 'Superstar Lineup' : avg >= 70 ? 'Star Power' : avg >= 55 ? 'Solid Roster' : 'Under the Radar',
    barCol: fansBarCol(avg, false),
  };
}

/** Sum roster fans for UI. Boos Only daily caps the meter at maxPopTotal (300). */
function calcTeamFans(players) {
  const list = players.filter(Boolean);
  const sum  = list.reduce((s, p) => s + (p.popularity ?? 50), 0);
  const max  = S.dailyChallenge?.params?.maxPopTotal ?? FANS_TEAM_MAX;
  const pct  = Math.min(100, Math.round((sum / max) * 100));
  const avg  = list.length ? sum / list.length : 0;
  const { tier, barCol } = fansTierFromAvg(avg);
  return { sum, max, pct, avg, count: list.length, tier, barCol };
}

function themeIcon() {
  return isDark() ? '☀️' : '🌙';
}
function iconPlus(cls = '') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v16m8-8H4"/></svg>`;
}

// ── Public helpers ────────────────────────────────────────────────────────────
export function archetypeBadge(arch) {
  if (!arch) return '';
  const c = ARCHETYPE_STYLE[arch] || { bg: '#27272a', text: '#a1a1aa' };
  if (isDark()) {
    const bright = {
      'Playmaker': '#93c5fd', 'Sharpshooter': '#fcd34d', 'Lockdown Defender': '#c4b5fd',
      'Slasher': '#c4b5fd', 'Paint Beast': '#4ade80', 'Two-Way Star': '#fb923c',
    };
    const text = bright[arch] || c.text;
    return `<span class="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full mt-0.5" style="background:${text}20;color:${text}">${arch}</span>`;
  }
  return `<span class="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full mt-0.5" style="background:${c.bg};color:${c.text}">${arch}</span>`;
}

/** Per-game stat display (PPG/RPG/APG/SPG/BPG) — real & simulated values carry
 *  2 decimals of precision for the math; the UI only needs 1 for readability. */
export function fmtPG(n) {
  return (Number(n) || 0).toFixed(1);
}

/** Conjugate series status verbs for 2nd-person "You" vs 3rd-person labels. */
function seriesAgree(label, thirdPerson, secondPerson) {
  return label === 'You' ? secondPerson : thirdPerson;
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

// ── Team rating (0–100 overall) display helper ────────────────────────────────
/** 2K-style tier color for a 0–100 overall. Cutoffs 97/92/85 are the old
 * rating-scale 90/82/74 tiers' percentile equivalents on the `overall`
 * (era-adjusted 2K) scale the sim now averages. */
export function ovrColor(rating) {
  const r = rating ?? 0;
  if (r >= 97) return '#d97706'; // gold — GOAT tier
  if (r >= 92) return '#2563eb'; // blue — star
  if (r >= 85) return '#0f766e'; // teal — solid starter
  return '#64748b';              // slate — role player
}

// ── Confetti (lazy) ───────────────────────────────────────────────────────────
// canvas-confetti is only needed on celebration screens, so it's injected on
// first use instead of shipping in the page-load payload. Degrades silently
// if the CDN is unreachable — same behavior as the old `typeof confetti`
// guards this replaces.
let _confettiLoading = null;
export function withConfetti(fire) {
  if (typeof confetti !== 'undefined') { fire(); return; }
  if (!_confettiLoading) {
    _confettiLoading = new Promise(resolve => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
      s.onload  = resolve;
      s.onerror = resolve; // resolve either way; the typeof check below decides
      document.head.appendChild(s);
    });
  }
  _confettiLoading.then(() => { if (typeof confetti !== 'undefined') fire(); });
}

// Toasts live in a shared flex column so simultaneous ones stack instead of
// overlapping at the same fixed spot (e.g. streak milestone + personal best).
function toastContainer() {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    c.style.cssText =
      'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);' +
      'display:flex;flex-direction:column-reverse;align-items:center;gap:8px;' +
      'z-index:99999;pointer-events:none';
    document.body.appendChild(c);
  }
  return c;
}

/** Removes any still-visible toast tagged with `kind` immediately (no fade-out
 *  wait). Used so a stale "streak ends" toast can't linger onscreen next to a
 *  toast about a brand-new streak that has since replaced it — those two read
 *  as a contradiction when the reveal cadence outpaces the toast duration,
 *  even though they're about two different streaks at two different moments. */
export function clearToastsOfKind(kind) {
  toastContainer().querySelectorAll(`[data-toast-kind="${kind}"]`).forEach(el => el.remove());
}

export function showToast(msg, duration = 2500, kind = null) {
  const el = document.createElement('div');
  el.textContent = msg;
  if (kind) el.dataset.toastKind = kind;
  const bg = isDark() ? '#f1f5f9' : '#0f172a';
  const fg = isDark() ? '#0f172a' : '#fff';
  el.style.cssText =
    `background:${bg};color:${fg};font-family:Fira Sans,sans-serif;font-weight:700;` +
    `font-size:13px;padding:10px 20px;border-radius:999px;` +
    `box-shadow:0 4px 24px rgba(0,0,0,0.2);transition:opacity 0.3s;white-space:nowrap`;
  toastContainer().appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 350); }, duration);
}

// ── Shared chrome ─────────────────────────────────────────────────────────────
function getActiveEra() {
  if (isDualDraft()) return S.p1Era || S.p2Era || S.selectedEra || 'all';
  return S.selectedEra || 'all';
}

function getEraLabel() {
  const era = getActiveEra();
  return era !== 'all' ? era : 'All Eras';
}

function renderEraPickerSheet() {
  const active = getActiveEra();

  function eraRow(eraId, label, subtitle, action) {
    const selected = active === eraId;
    return `
    <button data-action="${action}"
      class="era-picker-row${selected ? ' era-picker-row--active' : ''}">
      <span class="era-picker-row__label">${label}</span>
      ${subtitle ? `<span class="era-picker-row__sub">${subtitle}</span>` : ''}
      <span class="era-picker-row__check" aria-hidden="true">${selected ? '✓' : ''}</span>
    </button>`;
  }

  return `
  <div class="era-picker-panel" role="listbox" aria-label="Draft era">
    <div class="era-picker-panel__head">
      <p class="era-picker-panel__title">Draft era</p>
      <p class="era-picker-panel__hint">Locks on first spin</p>
    </div>
    <div class="era-picker-panel__list">
      ${eraRow('all', 'All Eras', 'Random decade each spin', 'era-pick-all')}
      <div class="era-picker-panel__divider" role="separator"></div>
      ${DECADES.map(d => eraRow(d, d, ERA_DESC[d], `era-pick-${d}`)).join('')}
    </div>
  </div>`;
}

function renderHeader(showRestart = false) {
  const eraLabel         = getEraLabel();
  const coachObj         = S.coach ? COACHES.find(c => c.id === S.coach) : null;
  const eraInteractive   = S.phase === 'drafting' && !S.eraLocked;
  const eraPickerOpen    = S.eraPickerOpen && !S.eraLocked;
  const eraPill = eraInteractive
    ? `<button data-action="era-picker-toggle" type="button"
        class="header-pill header-pill--interactive${eraPickerOpen ? ' header-pill--open' : ''}"
        aria-expanded="${eraPickerOpen}" aria-haspopup="listbox">
        <span>${eraLabel}</span>
        <svg class="header-pill__chev${eraPickerOpen ? ' header-pill__chev--open' : ''}" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>`
    : `<span class="header-pill">${eraLabel}${S.eraLocked ? '<span class="header-pill__lock" aria-hidden="true">🔒</span>' : ''}</span>`;

  // Daily Challenge is one attempt — never offer Restart mid-run.
  // Dynasty Duel is unlimited; Restart is fine.
  const canRestart = showRestart && S.mode !== 'daily';
  const restartBtn = canRestart
    ? `<button data-action="restart" type="button" class="header-pill header-pill--muted header-pill--restart">Restart</button>`
    : '';

  const eraOverlay = eraPickerOpen ? `
    <div data-action="era-picker-close" class="era-picker-backdrop" aria-hidden="true"></div>
    <div class="era-picker-anchor">
      ${renderEraPickerSheet()}
    </div>` : '';

  return `
  <div class="app-header-wrap">
    <header class="app-header">
      <div class="app-header__inner">
        <div class="app-header__brand">
          ${iconBall('h-5 w-5 text-primary')}
          <span>82-0</span>
        </div>
        <div class="app-header__actions">
          ${coachObj ? `<span class="header-pill header-pill--muted">${coachObj.system}</span>` : ''}
          ${eraPill}
          <button data-action="open-leaderboard" type="button" class="header-pill header-pill--icon" title="Personal Best" aria-label="Personal Best">🏅</button>
          <button data-action="open-global-leaderboard" type="button" class="header-pill header-pill--icon" title="Global Leaderboard" aria-label="Global Leaderboard">🌍</button>
          <button data-action="toggle-theme" type="button" class="header-pill header-pill--icon" title="Toggle Dark Mode" aria-label="Toggle Dark Mode">${themeIcon()}</button>
          ${restartBtn}
        </div>
      </div>
    </header>
    <div class="sr-only" aria-live="polite" id="aria-live-status"></div>
    ${canRestart ? `
    <div class="mobile-restart-bar">
      <button data-action="restart" type="button" class="mobile-restart-bar__btn">↩ Restart Run</button>
    </div>` : ''}
    ${eraOverlay}
  </div>`;
}

function renderFooter() {
  return `
  <footer class="w-full mt-auto" style="padding:2px 0">
    <p style="font-size:6px;color:var(--border);text-align:center;user-select:none;letter-spacing:0.02em;line-height:1">
      82-0.com is an independent fan project not affiliated with the NBA or its teams. ·
      <a href="privacy.html" target="_blank" rel="noopener noreferrer" style="color:var(--border);text-decoration:underline;user-select:auto">Privacy &amp; Terms</a>
    </p>
  </footer>`;
}

// ── Mode selection ────────────────────────────────────────────────────────────
// Community pass-rate cache — one fetch per UTC day per page load.
const COMMUNITY_STATS_MIN = 3; // hide until enough board submissions for the day
let _communityStatsCache = { date: null, promise: null, data: null };

function communityStatsLabels(stats) {
  if (!stats || stats.pct == null || stats.attempts < COMMUNITY_STATS_MIN) return null;
  return {
    short: `${stats.pct}% passed today`,
    full:  `${stats.pct}% of players passed today's challenge`,
  };
}

/** Dual short/full copy — CSS shows short on mobile, full from sm up. */
function communityStatsSpanHtml(labels, accent) {
  return `<span class="daily-community-copy" style="color:${accent}">`
    + `<span class="daily-community-copy__short">📊 ${labels.short}</span>`
    + `<span class="daily-community-copy__full">📊 ${labels.full}</span>`
    + `</span>`;
}

/**
 * Own-line community slot (played Daily card).
 * Always the short "X% passed today" copy so the post-play card stays three clean lines.
 */
function renderCommunityStatsLine() {
  if (!isFirebaseConfigured()) return '';
  const cached = (_communityStatsCache.date === getUtcDateString() && _communityStatsCache.data)
    ? communityStatsLabels(_communityStatsCache.data)
    : null;
  if (_communityStatsCache.date === getUtcDateString() && _communityStatsCache.data && !cached) {
    return '';
  }
  const accent = isDark() ? '#fdba74' : '#c2410c';
  if (cached) {
    return `<p id="daily-community-stats" class="text-[11px] font-bold mt-0.5 leading-snug" style="color:${accent}" data-slot="line" data-state="ready" aria-live="polite">📊 ${cached.short}</p>`;
  }
  return `<p id="daily-community-stats" class="text-[11px] font-bold mt-0.5 leading-snug" style="color:${accent};display:none" data-slot="line" data-state="loading" aria-live="polite" hidden></p>`;
}

/**
 * Inline fragment merged into an existing line (unplayed card / results).
 * e.g. " · 📊 73% passed today"
 */
function renderCommunityStatsMerged() {
  if (!isFirebaseConfigured()) return '';
  const cached = (_communityStatsCache.date === getUtcDateString() && _communityStatsCache.data)
    ? communityStatsLabels(_communityStatsCache.data)
    : null;
  if (_communityStatsCache.date === getUtcDateString() && _communityStatsCache.data && !cached) {
    return '';
  }
  const accent = isDark() ? '#fdba74' : '#c2410c';
  if (cached) {
    return ` · <span id="daily-community-stats" data-slot="merged" data-state="ready" aria-live="polite">${communityStatsSpanHtml(cached, accent)}</span>`;
  }
  return ` <span id="daily-community-stats" data-slot="merged" data-state="loading" aria-live="polite" hidden style="display:none"></span>`;
}

function paintCommunityStatsEl(el, stats) {
  if (!el) return;
  const labels = communityStatsLabels(stats);
  const accent = isDark() ? '#fdba74' : '#c2410c';
  if (!labels) {
    if (el.dataset.slot === 'merged') {
      const prev = el.previousSibling;
      if (prev && prev.nodeType === 3 && /^\s*·\s*$/.test(prev.textContent)) prev.remove();
    }
    el.remove();
    return;
  }
  el.dataset.state = 'ready';
  el.hidden = false;
  el.style.display = '';
  if (el.dataset.slot === 'line') {
    el.style.color = accent;
    el.textContent = `📊 ${labels.short}`;
    return;
  }
  if (el.dataset.slot === 'merged') {
    const prev = el.previousSibling;
    const hasDot = prev && prev.nodeType === 3 && prev.textContent.includes('·');
    if (!hasDot) {
      el.parentNode?.insertBefore(document.createTextNode(' · '), el);
    }
  }
  el.innerHTML = communityStatsSpanHtml(labels, accent);
}

async function hydrateDailyCommunityStats() {
  const el = document.getElementById('daily-community-stats');
  if (!el || !isFirebaseConfigured()) return;
  const date = getUtcDateString();
  try {
    if (_communityStatsCache.date !== date) {
      _communityStatsCache = { date, promise: null, data: null };
    }
    if (_communityStatsCache.data) {
      paintCommunityStatsEl(el, _communityStatsCache.data);
      return;
    }
    if (!_communityStatsCache.promise) {
      _communityStatsCache.promise = fetchDailyCommunityStats(date)
        .then(data => {
          _communityStatsCache.data = data;
          return data;
        })
        .catch(err => {
          _communityStatsCache.promise = null;
          throw err;
        });
    }
    const stats = await _communityStatsCache.promise;
    const live = document.getElementById('daily-community-stats');
    paintCommunityStatsEl(live, stats);
  } catch (_) {
    const live = document.getElementById('daily-community-stats');
    if (live) {
      if (live.dataset.slot === 'merged') {
        const prev = live.previousSibling;
        if (prev && prev.nodeType === 3 && /^\s*·\s*$/.test(prev.textContent)) prev.remove();
      }
      live.remove();
    }
  }
}

function renderDailyModeCard() {
  // Same white-card + orange-accent treatment the old "Best season" callout
  // used (and that Classic/Ball IQ/1v1 still use below it) — bg-white and
  // border-slate-100 both already have dark-mode overrides, so this themes
  // correctly for free instead of needing a bespoke gradient per mode.
  const status = getDailyStatus();
  const ch     = getDailyChallenge(getUtcDateString());
  if (status.playedToday) {
    const r = status.result;
    // Recaps written before the challenge system have no `passed` field —
    // treat those as complete with a neutral tick.
    const tick = !('passed' in r) || r.passed
      ? `<span style="color:#15803d;font-weight:900" aria-label="Passed">✓</span>`
      : `<span style="color:#dc2626;font-weight:900" aria-label="Failed">✗</span>`;
    return `
    <div class="w-full rounded-2xl bg-white px-3 py-2.5 flex items-center gap-2 mb-3 card-shadow border border-slate-100">
      <span class="text-2xl flex-shrink-0">${ch.emoji}</span>
      <div class="flex-1 min-w-0">
        <p class="font-black text-sm text-foreground flex flex-wrap items-center gap-x-2 gap-y-1">Daily Challenge ${tick}</p>
        <p class="text-[11px] text-muted-fg mt-0.5 leading-snug">${ch.title}: you went <span style="color:#f97316;font-weight:700">${r.wins}–${r.losses}</span></p>
      </div>
      <button data-action="open-daily-stats" class="text-[11px] font-bold px-2 py-1.5 rounded-lg border flex-shrink-0 cursor-pointer" style="border-color:var(--border);background:var(--card);color:var(--muted-fg)" title="Daily Challenge Stats">Stats</button>
      <button data-action="open-daily-leaderboard" class="text-[11px] font-bold px-2 py-1.5 rounded-lg border flex-shrink-0 cursor-pointer" style="border-color:var(--border);background:var(--card);color:var(--muted-fg)">Board</button>
    </div>`;
  }
  const community = renderCommunityStatsMerged();
  return `
  <div class="mb-3">
    <button data-action="mode-daily"
      class="w-full rounded-2xl bg-white px-3 py-2 flex items-center gap-2 cursor-pointer card-shadow hover:shadow-md transition-all border border-slate-100 text-left">
      <span class="text-2xl flex-shrink-0" style="pointer-events:none">${ch.emoji}</span>
      <div class="flex-1 min-w-0" style="pointer-events:none">
        <p class="font-black text-sm flex flex-wrap items-center gap-x-2 gap-y-1" style="color:#f97316">Daily Challenge · ${ch.title}</p>
        <p class="text-[11px] text-muted-fg leading-snug mt-0.5">${ch.desc}${community}</p>
        <p class="text-[10px] text-muted-fg mt-0.5">One attempt per day · board locks after you play</p>
      </div>
      <span class="text-[11px] font-bold px-2 py-1 rounded-lg border flex-shrink-0" style="border-color:#fdba74;background:var(--card);color:${isDark() ? '#fdba74' : '#c2410c'};pointer-events:none">Play →</span>
    </button>
  </div>`;
}

function renderModeSelect() {
  // Anyone who reaches the menus — by finishing the cold open or escaping
  // it deliberately — is a returning player from now on. Idempotent.
  markReturning();
  let trophies = [];
  try { trophies = JSON.parse(cgGetItem('nba820_trophies') || '[]'); } catch (e) {}
  return `
  <div class="flex flex-col min-h-screen main-gradient">
    <header class="sticky top-0 z-50 w-full bg-white border-b border-border mode-header" style="box-shadow:0 1px 3px var(--header-shadow)">
      <div class="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 mode-header__inner">
        <div class="w-20 mode-header__spacer"></div>
        <img src="logo-badge.svg" alt="82-0" class="mode-header__logo" style="height:52px;width:auto;margin-top:2px"/>
        <div class="flex items-center gap-1.5 justify-end mode-header__actions">
          <button data-action="open-daily-stats" class="text-[11px] px-2 py-1 rounded-full border border-border bg-card2 text-muted-fg hover:border-primary hover:text-primary transition-all cursor-pointer" title="Daily Challenge Stats" aria-label="Daily Challenge Stats">📊</button>
          <button data-action="open-leaderboard" class="text-[11px] px-2 py-1 rounded-full border border-border bg-card2 text-muted-fg hover:border-primary hover:text-primary transition-all cursor-pointer" title="Personal Best" aria-label="Personal Best">🏅</button>
          <button data-action="open-global-leaderboard" class="text-[11px] px-2 py-1 rounded-full border border-border bg-card2 text-muted-fg hover:border-primary hover:text-primary transition-all cursor-pointer" title="Global Leaderboard" aria-label="Global Leaderboard">🌍</button>
          <button data-action="toggle-theme" class="theme-toggle" title="Toggle Dark Mode" aria-label="Toggle Dark Mode">${themeIcon()}</button>
        </div>
      </div>
    </header>

    <main class="flex-1 flex flex-col items-center px-4 pt-3 pb-8">
      <div class="w-full max-w-md animate-fade-up">

        ${renderDailyModeCard()}

        <!-- Classic full width -->
        <button data-action="mode-solo"
          class="w-full rounded-2xl bg-white px-5 py-4 flex flex-col items-center gap-2 cursor-pointer card-shadow hover:shadow-md transition-all border border-slate-100 mb-3">
          <span class="text-3xl" style="pointer-events:none">💯</span>
          <p class="font-black text-base" style="color:#f97316;pointer-events:none">Classic</p>
          <p class="text-sm text-muted-fg text-center" style="pointer-events:none">Draft with full player stats visible — make informed picks.</p>
          <div class="w-full py-2.5 rounded-xl font-bold text-sm text-white text-center mt-1" style="background:#f97316;pointer-events:none">Play Classic</div>
        </button>

        <!-- Ball IQ + 1v1 side by side -->
        <div class="grid grid-cols-2 gap-3 mb-3">
          <button data-action="mode-blind"
            class="rounded-2xl bg-white p-4 flex flex-col items-center gap-2 cursor-pointer card-shadow hover:shadow-md transition-all border border-slate-100">
            <span class="text-3xl" style="pointer-events:none">🧠</span>
            <p class="font-black text-base" style="color:#f97316;pointer-events:none">Ball IQ</p>
            <p class="text-xs text-muted-fg text-center leading-snug flex-1" style="pointer-events:none">Names only — draft by memory and test your Ball IQ.</p>
            <div class="w-full py-2 rounded-xl font-bold text-sm text-white text-center mt-1" style="background:#f97316;pointer-events:none">Play Ball IQ</div>
          </button>

          <button data-action="mode-1v1"
            class="rounded-2xl bg-white p-4 flex flex-col items-center gap-2 cursor-pointer card-shadow hover:shadow-md transition-all border border-slate-100">
            <span class="text-3xl" style="pointer-events:none">⚔️</span>
            <p class="font-black text-base" style="color:#f97316;pointer-events:none">1v1</p>
            <p class="text-xs text-muted-fg text-center leading-snug flex-1" style="pointer-events:none">Draft your team, then go head-to-head against a rival lineup.</p>
            <div class="w-full py-2 rounded-xl font-bold text-sm text-white text-center mt-1" style="background:#f97316;pointer-events:none">Play</div>
          </button>
        </div>

        <button data-action="view-trophies"
          class="w-full py-3 rounded-xl font-bold text-sm border border-amber-200 bg-amber-50 text-amber-700 cursor-pointer transition-all hover:bg-amber-100 card-shadow mb-3">
          🏆 Trophy Room${trophies.length > 0 ? ` · ${trophies.length}` : ''}
        </button>

        ${renderMoreModesButton()}

      </div>
    </main>
    ${renderFooter()}
  </div>`;
}

/** Challenges entry — a button that opens the full challenge-select screen. */
function renderMoreModesButton() {
  return `
  <button data-action="open-more-modes"
    class="w-full mb-3 rounded-xl border border-border bg-white/80 px-4 py-3 flex items-center justify-between gap-3 cursor-pointer card-shadow hover:border-primary hover:bg-card2 transition-all">
    <span class="flex items-center gap-2" style="pointer-events:none">
      <span class="text-xl">🎮</span>
      <span class="flex flex-col text-left">
        <span class="text-[10px] font-bold uppercase tracking-widest text-muted-fg">Challenges</span>
        <span class="text-sm font-bold text-foreground">Explore more game modes</span>
      </span>
    </span>
    <span class="text-lg text-muted-fg" style="pointer-events:none">→</span>
  </button>`;
}

/** Full-screen challenge picker — one card per secondary mode. */
function renderMoreModesScreen() {
  const cards = MORE_MODES.map(m => `
    <button data-action="${m.action}"
      class="w-full rounded-2xl bg-white px-5 py-4 flex items-center gap-4 cursor-pointer card-shadow hover:shadow-md transition-all border border-slate-100 text-left">
      <span class="text-3xl flex-shrink-0" style="pointer-events:none">${m.emoji}</span>
      <span class="flex flex-col gap-1 flex-1" style="pointer-events:none">
        <span class="font-black text-base" style="color:#f97316">${m.label}</span>
        <span class="text-sm text-muted-fg leading-snug">${m.desc}</span>
      </span>
      <span class="text-lg text-muted-fg flex-shrink-0" style="pointer-events:none">→</span>
    </button>`).join('');

  return `
  <div class="flex flex-col min-h-screen main-gradient">
    <header class="sticky top-0 z-50 w-full bg-white border-b border-border" style="box-shadow:0 1px 3px var(--header-shadow)">
      <div class="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <button data-action="more-modes-back" class="text-sm font-bold text-muted-fg hover:text-primary transition-all cursor-pointer">← Back</button>
        <p class="text-sm font-black text-foreground">🎮 Challenges</p>
        <div class="w-12"></div>
      </div>
    </header>
    <main class="flex-1 flex flex-col items-center px-4 py-6">
      <div class="w-full max-w-md flex flex-col gap-3 animate-fade-up">
        <p class="text-center text-sm text-muted-fg mb-1">Pick a challenge mode to play.</p>
        ${cards}
      </div>
    </main>
    ${renderFooter()}
  </div>`;
}

// ── Legends collection ────────────────────────────────────────────────────────
function renderLegends() {
  const { decades, byDecade, total } = getLegendCatalog();
  const collected = getCollectedLegends();
  const have      = collected.size;
  const pct       = total ? Math.round((have / total) * 100) : 0;

  const decadeCards = decades.map(decade => {
    const players = byDecade[decade];
    const got     = players.filter(p => collected.has(p.id));
    const dPct    = players.length ? Math.round((got.length / players.length) * 100) : 0;
    const done    = got.length === players.length;
    // Collected legends shown as chips, best-first; locked ones as a tail count.
    const chips = got.length
      ? got.map(p => `<span class="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700 mr-1 mb-1">${p.name}</span>`).join('')
      : `<span class="text-[11px] text-muted-fg italic">None yet — draft a ${decade} legend to start.</span>`;
    const lockedCount = players.length - got.length;
    return `
    <div class="rounded-xl border border-border bg-white p-3 card-shadow">
      <div class="flex items-center justify-between mb-1.5">
        <p class="text-sm font-black text-foreground">${decade}${done ? ' <span class="text-[10px]" title="Decade complete">✅</span>' : ''}</p>
        <span class="text-xs font-bold" style="color:${done ? (isDark() ? '#4ade80' : '#16a34a') : (isDark() ? '#a5b4fc' : '#6366f1')}">${got.length}/${players.length}</span>
      </div>
      <div class="h-1.5 rounded-full overflow-hidden mb-2.5" style="background:var(--surface-track)">
        <div class="h-full rounded-full" style="width:${dPct}%;background:${done ? (isDark() ? '#4ade80' : '#16a34a') : (isDark() ? '#818cf8' : '#6366f1')}"></div>
      </div>
      <div class="leading-tight">
        ${chips}
        ${lockedCount > 0 && got.length > 0 ? `<span class="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-muted-fg mb-1">+${lockedCount} locked</span>` : ''}
      </div>
    </div>`;
  }).join('');

  return `
  <div class="flex flex-col min-h-screen main-gradient">
    <header class="sticky top-0 z-50 w-full bg-white border-b border-border" style="box-shadow:0 1px 3px var(--header-shadow)">
      <div class="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <button data-action="legends-back" class="text-sm font-bold text-muted-fg hover:text-primary transition-all cursor-pointer">← Back</button>
        <p class="text-sm font-black text-foreground">🃏 Legends</p>
        <div class="w-12"></div>
      </div>
    </header>
    <main class="flex-1 flex flex-col items-center px-4 py-6">
      <div class="w-full max-w-2xl flex flex-col gap-3 animate-fade-up">
        <div class="rounded-2xl border-2 bg-white p-5 text-center card-shadow" style="border-color:#c7d2fe">
          <p class="text-[10px] font-bold uppercase tracking-widest text-muted-fg mb-2">Legends Collected</p>
          <div class="text-5xl font-black mb-2" style="color:${isDark() ? '#a5b4fc' : '#6366f1'}">${have}<span class="text-2xl text-muted-fg font-light"> / ${total}</span></div>
          <div class="h-2 rounded-full overflow-hidden mx-auto max-w-xs" style="background:var(--surface-track)">
            <div class="h-full rounded-full stat-bar-fill" style="width:${pct}%;background:${isDark() ? '#818cf8' : '#6366f1'}"></div>
          </div>
          <p class="text-xs text-muted-fg mt-2">${pct}% of every legend across all seven decades${have === 0 ? ' — draft a roster to start collecting.' : have === total ? ' — you collected them all. 🏆' : ''}</p>
        </div>
        ${decadeCards}
        <button data-action="legends-back" class="w-full py-3 rounded-xl font-bold text-sm border border-border bg-white text-foreground hover:border-primary hover:bg-card2 transition-all cursor-pointer card-shadow">
          ← Back
        </button>
      </div>
    </main>
    ${renderFooter()}
  </div>`;
}

// ── Coach selection ───────────────────────────────────────────────────────────
// Coach selection lives on the drafting screen as a chip + picker sheet;
// era selection lives in the header and locks on the first spin.
// One line: coach, system, live system meter. Tap to swap until the first
// spin locks it. The meter converts the coach from a blind pre-commit bet
// into a drafting objective you can see filling.
function renderCoachChip() {
  const coach = COACHES.find(c => c.id === S.coach);
  if (!coach) return '';
  const starters = POSITIONS.map(p => S.roster[p]).filter(Boolean);
  const sys      = coachSystemProgress(coach.id, starters);
  const filled   = Math.round(sys.progress * 4);
  const meter    = Array.from({ length: 4 }, (_, i) =>
    `<span style="color:${i < filled ? coach.accent : 'var(--border)'}">★</span>`).join('');
  const locked   = !!S.coachLocked;

  const chipInner = `
    <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${coach.accent}"></span>
    <span class="text-xs font-black text-foreground flex-shrink-0">${coach.name}</span>
    <span class="text-[10px] font-bold uppercase tracking-wider truncate" style="color:${coach.accent}">${coach.system}</span>
    <span class="ml-auto flex items-center gap-1.5 flex-shrink-0">
      <span class="text-sm leading-none tracking-tight">${meter}</span>
      <span class="text-[10px] text-muted-fg font-semibold">${sys.metric}</span>
      <span class="text-xs text-muted-fg">${locked ? '🔒' : '▾'}</span>
    </span>`;

  const chip = locked
    ? `<div class="w-full rounded-xl border border-border bg-card px-3 py-2 flex items-center gap-2 card-shadow" title="Coach locked for this run">${chipInner}</div>`
    : `<button data-action="coach-picker-toggle"
        class="w-full rounded-xl border bg-card px-3 py-2 flex items-center gap-2 card-shadow cursor-pointer transition-all hover:border-primary text-left"
        style="border-color:${S.coachPickerOpen ? coach.accent : 'var(--border)'}">${chipInner}</button>`;

  const picker = !locked && S.coachPickerOpen ? `
    <div class="rounded-xl border border-border bg-white card-shadow overflow-hidden animate-scale-in">
      <p class="text-[10px] font-bold uppercase tracking-widest text-muted-fg px-3 pt-2.5 pb-1.5">Pick your system — locks on first spin</p>
      ${COACHES.map(c => `
      <button data-action="coach-pick-${c.id}"
        class="w-full px-3 py-2 flex items-center gap-2.5 text-left cursor-pointer transition-all hover:bg-slate-50 border-t border-border"
        style="${c.id === S.coach ? `background:${c.accent}0d` : ''}">
        <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${c.accent}"></span>
        <span class="text-xs font-black text-foreground flex-shrink-0 w-28 truncate">${c.name}</span>
        <span class="text-[10px] font-bold uppercase tracking-wider flex-shrink-0" style="color:${c.accent}">${c.system}</span>
        <span class="text-[10px] text-muted-fg truncate hidden sm:inline">${c.desc.split('—')[0].trim()}</span>
        ${c.id === S.coach ? `<span class="ml-auto text-xs flex-shrink-0" style="color:${c.accent}">✓</span>` : ''}
      </button>`).join('')}
    </div>` : '';

  return `<div class="draft-coach-chip">${chip}${picker}</div>`;
}

// ── Drafting screen ───────────────────────────────────────────────────────────
function renderColdOpenBanner() {
  if (!S.coldOpen || S.round > 0) return '';
  const coach = COACHES.find(c => c.id === S.coach);
  return `
  <div class="rounded-2xl p-3.5 flex items-center gap-3 animate-fade-up card-shadow draft-cold-open"
    style="background:var(--surface-orange);border:1.5px solid #fed7aa">
    <span class="text-2xl flex-shrink-0">🏀</span>
    <div class="min-w-0">
      <p class="text-sm font-black text-foreground leading-tight">Welcome to 82-0 — your first pick is waiting.</p>
      <p class="text-xs text-muted-fg mt-0.5">Coach <b>${coach ? coach.name : ''}</b> is running the show${coach ? ` (${coach.system})` : ''}. Draft 5 legends, then chase the perfect season.</p>
    </div>
  </div>`;
}

function shouldShowDraftBoard(full) {
  if (full) return false;
  if (S.spinState === 'done' && S.draftBoard?.length) return true;
  // Keep the empty board frame during spin (after first pick landed)
  if (S.spinState === 'spinning' && S.round > 0) return true;
  return false;
}

// ── Daily Challenge — drafting banner ─────────────────────────────────────────
// Persistent reminder of today's rules with a live constraint status chip.
function renderDailyDraftBanner() {
  const ch = S.dailyChallenge;
  if (!ch || S.mode !== 'daily') return '';
  const filled = Object.values(S.roster || {}).filter(Boolean);
  const status = checkRosterConstraint(ch, filled);
  const chip   = status.detail
    ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full" style="white-space:nowrap;${status.pass
        ? 'background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0'
        : 'background:#fef2f2;color:#dc2626;border:1px solid #fecaca'}">${status.pass ? '✓' : '✗'} ${status.detail}</span>`
    : '';
  return `
  <div class="rounded-xl border-2 px-4 py-3 card-shadow" style="border-color:#fdba74;background:var(--card)">
    <div class="flex items-center gap-2 flex-wrap">
      <span class="text-lg">${ch.emoji}</span>
      <p class="text-xs font-black uppercase tracking-widest" style="color:${isDark() ? '#fdba74' : '#c2410c'}">Today's Challenge</p>
      <p class="text-xs font-bold text-foreground">${ch.title}</p>
      <span class="ml-auto">${chip}</span>
    </div>
    <p class="text-[11px] text-muted-fg mt-1">${ch.desc}</p>
  </div>`;
}

/**
 * Daily-mode dead-end check: the spun board has players, but every one of
 * them is barred (already rostered or blocked by today's rules) and the
 * daily draft has no skips — without an escape the run would soft-lock.
 */
function dailyBoardDeadEnd() {
  if (S.mode !== 'daily' || !S.dailyChallenge) return false;
  if (S.spinState !== 'done' || !S.draftBoard?.length) return false;
  const filled = Object.values(S.roster || {}).filter(Boolean);
  return !S.draftBoard.some(p =>
    !(S.draftedPlayerNames?.has(p.name)) &&
    checkPickLegal(S.dailyChallenge,
      { ...p, team: S.currentSpin?.team, decade: S.currentSpin?.decade }, filled).legal
  );
}

function renderModeDraftBanner() {
  if (S.mode === 'daily') return renderDailyDraftBanner();
  if (S.mode === 'defense') {
    return `<div class="rounded-xl border px-3 py-2 text-xs font-semibold mode-banner mode-banner--defense"
      style="border-color:color-mix(in srgb, #8b5cf6 35%, var(--border));background:color-mix(in srgb, #8b5cf6 14%, var(--card));color:var(--fg)">
      🛡️ Defense Only — stocks &amp; boards carry this sim. Scoring volume matters less.
    </div>`;
  }
  if (S.mode === 'fans') {
    const starters = Object.values(S.roster || {}).filter(Boolean);
    const avg = starters.length
      ? starters.reduce((s, p) => s + (p.popularity || 50), 0) / starters.length
      : 0;
    const fansM = Math.pow(Math.max(0, Math.min(1, (avg - 35) / 65)), 1.5) * 38 + 2;
    // Estimate wins from star power instead of hardcoding 50 — keeps the
    // "live proj" honest while the season hasn't been simulated yet.
    const estWins = starters.length
      ? Math.round(Math.min(72, Math.max(18, 25 + ((avg - 40) / 60) * 50)))
      : null;
    const proj = starters.length ? fansFirstScore(avg, fansM, estWins) : null;
    return `<div class="rounded-xl border px-3 py-2 text-xs font-semibold mode-banner mode-banner--fans"
      style="border-color:color-mix(in srgb, #ec4899 35%, var(--border));background:color-mix(in srgb, #ec4899 14%, var(--card));color:var(--fg)">
      📣 Fans First — optimize star power. Pass needs ≥70 avg popularity and ≥35 wins. Score ≈ pop×10 + fansM×5 + wins×2${proj != null ? ` · live proj ~${Math.round(proj)} (@~${estWins}W)` : ''}.
    </div>`;
  }
  if (S.mode === 'dynasty-duel' && S.dynastyOpponent) {
    return `<div class="rounded-xl border px-3 py-2 text-xs font-semibold mode-banner mode-banner--dynasty"
      style="border-color:color-mix(in srgb, #f59e0b 40%, var(--border));background:color-mix(in srgb, #f59e0b 14%, var(--card));color:var(--fg)">
      👑 Dynasty Duel — beat the <strong>${S.dynastyOpponent.name}</strong> in a best-of-7. New random dynasty every run — play as often as you want.
    </div>`;
  }
  return '';
}

function renderDrafting() {
  if (isDualDraft()) return renderDrafting1v1();
  const full = rosterFull();

  if (isDesktopDraftLayout()) {
    // 3-column app shell: Live Chemistry is a fixed left rail, the vertical
    // Fans meter a fixed right rail, and the normal draft flow scrolls on
    // its own in the center — so the whole screen fits in one viewport with
    // no page scrollbar. See .draft-screen--desktop in styles.css.
    return `
    <div class="min-h-screen main-gradient draft-screen draft-screen--desktop">
      ${renderHeader(true)}
      <main class="flex flex-col items-center px-4 pt-2 pb-8 draft-screen__main">
        <div class="w-full max-w-2xl draft-screen__inner draft-screen__inner--desktop">
          ${renderChemDashboard()}
          <div class="draft-screen__center">
            ${renderColdOpenBanner()}
            ${renderModeDraftBanner()}
            ${full ? renderSimulateCard() : ''}
            ${renderRoundBar()}
            ${renderCoachChip()}
            ${!full ? renderSlotMachine() : ''}
            ${shouldShowDraftBoard(full) ? renderDraftBoard() : ''}
            ${renderRoster()}
          </div>
          ${renderPopularityBarVertical()}
        </div>
      </main>
    </div>`;
  }

  return `
  <div class="min-h-screen main-gradient draft-screen">
    ${renderHeader(true)}
    <main class="flex flex-col items-center px-4 pt-2 pb-8 draft-screen__main">
      <div class="w-full max-w-2xl flex flex-col gap-2 draft-screen__inner">
        ${renderColdOpenBanner()}
        ${renderModeDraftBanner()}
        ${full ? renderSimulateCard() : ''}
        ${renderRoundBar()}
        ${renderCoachChip()}
        ${!full ? renderSlotMachine() : ''}
        ${shouldShowDraftBoard(full) ? renderDraftBoard() : ''}
        ${renderStatGauges()}
        ${renderRoster()}
      </div>
    </main>
  </div>`;
}

// ── 1v1 Alternating Draft screen ──────────────────────────────────────────────
function render1v1RosterPanel(roster, playerNum, isActive) {
  const color    = playerNum === 1 ? '#2563eb' : '#d97706';
  const bg       = playerNum === 1 ? '#eff6ff'  : '#fffbeb';
  const bdrCol   = isActive ? color : 'var(--border)';
  const coachId  = playerNum === 1 ? S.p1Coach : S.p2Coach;
  const coachObj = coachId ? COACHES.find(c => c.id === coachId) : null;
  // Active player with a player selected — slots become tappable placement targets
  const canPlace = isActive && !!S.selectedPlayer;

  const slots = ALL_POSITIONS.map(pos => {
    const p       = roster ? roster[pos] : null;
    const label   = pos;

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
      ${p ? `<span class="text-[10px] text-muted-fg flex-shrink-0">${fmtPG(p.ppg)}pt</span>` : ''}
    </div>`;
  }).join('');

  return `
  <div class="rounded-2xl border-2 bg-white p-3 card-shadow transition-all" style="border-color:${bdrCol}">
    <div class="flex items-center justify-between mb-1.5">
      <p class="text-xs font-black uppercase tracking-wider" style="color:${color}">${playerNum === 1 ? seriesLabels().p1 : seriesLabels().p2}</p>
      ${isActive
        ? `<span class="text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse-glow" style="background:${bg};color:${color}">${canPlace ? '👆 Pick a slot' : '🎯 ON CLOCK'}</span>`
        : `<span class="text-[10px] text-muted-fg font-medium">${(playerNum === 1 ? S.p1Round : S.p2Round)}/5</span>`}
    </div>
    ${coachObj ? `<p class="text-[10px] text-muted-fg mb-1.5 truncate">${coachObj.name}</p>` : ''}
    ${slots}
  </div>`;
}

function renderDrafting1v1() {
  const labels = seriesLabels();
  const completedPicks = S.p1Round + S.p2Round;
  const totalPick      = completedPicks + 1;
  const totalPicks     = SNAKE_ORDER.length; // 10
  const isP1Turn       = S.currentPlayer === 1;
  const isAiThinking   = S.mode === 'gm-ai' && !isP1Turn;
  const clockColor     = isP1Turn ? '#2563eb' : '#d97706';
  const clockBg        = isP1Turn ? '#eff6ff'  : '#fffbeb';
  const clockBdr       = isP1Turn ? '#bfdbfe'  : '#fde68a';
  const turnLabel      = isAiThinking
    ? '🤖 AI GM is picking…'
    : `⚡ ${isP1Turn ? labels.p1 : labels.p2} On The Clock`;

  // Snake order tracker — shows all 10 pick slots with player colour coding
  const snakeDots = SNAKE_ORDER.map((player, idx) => {
    const isDone    = idx < completedPicks;
    const isCurrent = idx === completedPicks;
    const p1Pick    = player === 1;
    const dotBg     = isDone
      ? (p1Pick ? '#93c5fd' : '#fcd34d')
      : isCurrent
        ? (p1Pick ? '#2563eb' : '#d97706')
        : 'var(--border)';
    const dotText   = isDone
      ? (p1Pick ? '#1e40af' : '#92400e')
      : isCurrent
        ? '#ffffff'
        : '#94a3b8';
    const short = p1Pick ? labels.p1Short : labels.p2Short;
    const label     = isCurrent ? short : (isDone ? '✓' : short);
    const ringStyle = isCurrent
      ? `box-shadow:0 0 0 2px ${p1Pick ? '#2563eb' : '#d97706'};`
      : '';
    return `<div class="flex flex-col items-center gap-0.5">
      <div class="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black transition-all"
        style="background:${dotBg};color:${dotText};${ringStyle}">${label}</div>
      <span class="text-[8px] text-muted-fg font-semibold">${idx + 1}</span>
    </div>`;
  }).join('');

  // Recent picks log (last 5)
  const recentPicks = S.draftLog.slice(-5).reverse().map(entry => {
    const c = entry.playerNum === 1 ? '#2563eb' : '#d97706';
    const who = entry.playerNum === 1 ? labels.p1Short : labels.p2Short;
    return `<div class="flex items-center gap-2 py-1 border-b border-border last:border-0">
      <span class="text-[10px] font-black px-1.5 py-0.5 rounded-full" style="background:${entry.playerNum === 1 ? '#eff6ff' : '#fffbeb'};color:${c}">${who}</span>
      <span class="text-xs text-foreground font-semibold truncate">${entry.name}</span>
      <span class="text-[10px] text-muted-fg ml-auto flex-shrink-0">Pick ${entry.pick}</span>
    </div>`;
  }).join('');

  const aiCoach = COACHES.find(c => c.id === S.p2Coach);

  return `
  <div class="min-h-screen main-gradient">
    ${renderHeader(true)}
    <main class="flex flex-col items-center px-4 pt-2 pb-8">
      <div class="w-full max-w-3xl flex flex-col gap-3">

        ${S.mode === 'gm-ai' ? renderCoachChip() : ''}

        <!-- ON THE CLOCK banner -->
        <div class="flex items-center justify-between px-4 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest"
          style="background:${clockBg};color:${clockColor};border:2px solid ${clockBdr}">
          <span>${turnLabel}</span>
          <span class="text-xs font-bold opacity-70">Pick ${totalPick} of ${totalPicks}</span>
        </div>

        <!-- Snake draft order tracker -->
        <div class="rounded-xl border border-border bg-white px-4 py-3 card-shadow">
          <p class="text-[9px] font-bold uppercase tracking-widest text-muted-fg mb-2">🐍 Snake Draft Order</p>
          <div class="flex items-end justify-between gap-1">
            ${snakeDots}
          </div>
          <div class="flex items-center gap-3 mt-2">
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full inline-block" style="background:#2563eb"></span><span class="text-[9px] text-muted-fg">${labels.p1}</span></span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full inline-block" style="background:#d97706"></span><span class="text-[9px] text-muted-fg">${labels.p2}${aiCoach ? ` · ${aiCoach.name}` : ''}</span></span>
          </div>
        </div>

        <!-- Side-by-side rosters -->
        <div class="grid grid-cols-2 gap-3">
          ${render1v1RosterPanel(S.p1Roster, 1, isP1Turn)}
          ${render1v1RosterPanel(S.p2Roster, 2, !isP1Turn)}
        </div>

        <!-- Shared draft board (hidden while AI is picking) -->
        ${isAiThinking ? '' : renderSlotMachine()}
        ${!isAiThinking && S.spinState === 'done' ? renderDraftBoard() : ''}

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

// Draft phases — stakes escalate as slots run out
const DRAFT_PHASES = [
  { max: 1, label: 'Foundation',  color: '#2563eb', hint: 'Build around greatness' },
  { max: 3, label: 'The Squeeze', color: '#d97706', hint: 'Fits get harder — weigh every tradeoff' },
  { max: 4, label: 'Final Piece', color: '#dc2626', hint: 'One slot left — complete your identity' },
];

function renderRoundBar() {
  const filled         = ALL_POSITIONS.filter(p => S.roster[p]).length;
  const displayRound   = Math.min(S.round + 1, TOTAL_ROUNDS);
  const phase          = DRAFT_PHASES.find(ph => S.round <= ph.max) || DRAFT_PHASES[2];

  return `
  <div class="flex flex-col gap-1.5 py-1 draft-round-bar">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-bold text-foreground">Round ${displayRound} <span class="text-muted-fg font-normal">of ${TOTAL_ROUNDS}</span>
          <span class="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ml-1 align-middle"
            style="background:${phase.color}15;color:${phase.color};border:1px solid ${phase.color}30">${phase.label}</span>
        </p>
        <p class="text-xs text-muted-fg mt-0.5 draft-round-bar__meta">${filled}/${ALL_POSITIONS.length} starters &nbsp;·&nbsp; <span style="color:${phase.color}">${phase.hint}</span></p>
      </div>
      <div class="flex gap-1.5 items-center">
        ${Array.from({ length: TOTAL_ROUNDS }, (_, i) => {
          const done   = i < S.round;
          const active = i === S.round;
          const color  = done || active ? 'var(--primary)' : 'var(--border)';
          return `<div class="rounded-full transition-all" style="width:${active ? 9 : 7}px;height:${active ? 9 : 7}px;background:${color};border:${active ? '2px solid #2563eb' : 'none'}"></div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

// ── Live stat gauges (Fans + Chemistry) — mobile/tablet drafting screen ──────
// 2K-style radial arcs replacing the old linear Fans bar + Team Chemistry bar
// below the desktop breakpoint (design handoff: "Arena — dark broadcast").
// Desktop keeps the linear meter + synergy chips (renderChemDashboard /
// renderPopularityBarVertical below) untouched.

// Fixed 270° track, start point (21.7,78.3) at 135°, sweeping clockwise to
// (78.3,78.3) at 45°+360 — see gaugeArcPath() for the matching progress arc.
const GAUGE_TRACK_PATH = 'M21.7 78.3 A40 40 0 1 1 78.3 78.3';

/** Progress-arc `d` for a gauge, driven by pct (0-100) rather than a baked-in
 *  sweep — same track math as GAUGE_TRACK_PATH, just stopping early. */
function gaugeArcPath(pct) {
  const sweep    = Math.max(0, Math.min(100, pct)) / 100 * 270;
  const rad      = (135 + sweep) * Math.PI / 180;
  const x        = (50 + 40 * Math.cos(rad)).toFixed(2);
  const y        = (50 + 40 * Math.sin(rad)).toFixed(2);
  const largeArc = sweep > 180 ? 1 : 0;
  return `M21.7 78.3 A40 40 0 ${largeArc} 1 ${x} ${y}`;
}

function renderStatGauge({ id, icon, pct, value, suffix, label, color, locked = false, lockedNote = '' }) {
  if (locked) {
    return `
    <div class="rounded-xl border border-border bg-card draft-stat-gauge">
      <div class="draft-stat-gauge__arc-wrap">
        <svg viewBox="0 0 100 84" class="draft-stat-gauge__svg">
          <path d="${GAUGE_TRACK_PATH}" fill="none" stroke="var(--card2)" stroke-width="7" stroke-linecap="round"/>
        </svg>
        <div class="draft-stat-gauge__icon" style="background:var(--card2);border-color:var(--border)">🔒</div>
      </div>
      <div class="draft-stat-gauge__value cond" style="color:var(--muted-fg)">—</div>
      <div class="draft-stat-gauge__label">${label}</div>
      ${lockedNote ? `<p class="draft-stat-gauge__note">${lockedNote}</p>` : ''}
    </div>`;
  }
  const gradId  = `gauge-${id}`;
  const badgeBg = `color-mix(in srgb, ${color} 16%, var(--card))`;
  return `
  <div class="rounded-xl border border-border bg-card draft-stat-gauge">
    <div class="draft-stat-gauge__arc-wrap">
      <svg viewBox="0 0 100 84" class="draft-stat-gauge__svg">
        <defs><linearGradient id="${gradId}" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" style="stop-color:${color}"/>
          <stop offset="1" style="stop-color:color-mix(in srgb, #ffffff 45%, ${color})"/>
        </linearGradient></defs>
        <path d="${GAUGE_TRACK_PATH}" fill="none" stroke="var(--card2)" stroke-width="7" stroke-linecap="round"/>
        <path d="${gaugeArcPath(pct)}" fill="none" stroke="url(#${gradId})" stroke-width="7" stroke-linecap="round"/>
      </svg>
      <div class="draft-stat-gauge__icon" style="background:${badgeBg};border-color:${color}">${icon}</div>
    </div>
    <div class="draft-stat-gauge__value cond" style="color:${color}">${value}<span class="draft-stat-gauge__suffix">${suffix}</span></div>
    <div class="draft-stat-gauge__label">${label}</div>
  </div>`;
}

function renderStatGauges() {
  const fans = calcTeamFans(Object.values(S.roster));
  const fansGauge = renderStatGauge({
    id: 'fans', icon: '👥', pct: fans.pct,
    value: `${Math.round(fans.sum)}M`, suffix: '',
    label: 'Fans', color: fans.barCol,
  });

  let chemGauge;
  if (S.mode === 'blind') {
    // Ball IQ: same reasoning as renderChemDashboard() below — don't leak
    // natural-position fit through the gauge while the mode is testing memory.
    chemGauge = renderStatGauge({
      id: 'chem', icon: '🧪', label: 'Chemistry', locked: true,
      lockedNote: 'Unlocks after you simulate',
    });
  } else {
    // As-placed slots so this matches the visible roster chips, same as
    // renderChemDashboard()'s desktop version.
    const placedPairs = POSITIONS
      .map(pos => ({ pos, player: S.roster[pos] }))
      .filter(x => x.player);
    const starters = placedPairs.map(x => x.player);
    const asPlacedSlots = placedPairs.map(x => x.pos);
    const rosterKey = 'placed|' + (S.coach || '') + '|' + asPlacedSlots.map((s, i) => s + ':' + starters[i].id).join(',');
    if (_chemCache.key !== rosterKey) {
      _chemCache.key    = rosterKey;
      _chemCache.result = calculateChemistry(starters, S.coach, { asPlacedSlots });
    }
    const tier  = chemTier(_chemCache.result.chemScore);
    const color = chemTierColors(tier.id, isDark()).color;
    // No raw score digits — chemTier() intentionally hides the 0-100 number
    // from the UI; the arc's sweep still encodes it visually.
    chemGauge = renderStatGauge({
      id: 'chem', icon: '🧪', pct: _chemCache.result.chemScore,
      value: tier.label, suffix: '',
      label: 'Chemistry', color,
    });
  }

  return `<div class="draft-stat-gauges">${fansGauge}${chemGauge}</div>`;
}

// Desktop-only vertical fans meter — same calcTeamFans() data as the mobile/
// tablet Fans gauge in renderStatGauges(), shown in the right rail instead
// when the draft screen switches to its 3-column layout (see
// .draft-pop-bar-vertical in styles.css).
function renderPopularityBarVertical() {
  const fans = calcTeamFans(Object.values(S.roster));
  const label = `${Math.round(fans.sum)}M`;
  return `
  <div class="rounded-xl border border-border bg-card px-2 py-3 card-shadow draft-pop-bar-vertical" title="${fans.tier}${fans.count ? ` · ${label}` : ''}">
    <p class="text-[9px] font-bold uppercase tracking-widest text-muted-fg draft-pop-bar-vertical__label">Fans</p>
    <div class="draft-pop-bar-vertical__track">
      <div class="draft-pop-bar-vertical__fill" style="height:${fans.pct}%;background:${fans.barCol}"></div>
    </div>
    <p class="text-[11px] font-bold draft-pop-bar-vertical__value" style="color:${fans.barCol}">${label}</p>
  </div>`;
}

function renderSlotMachine() {
  const isDone    = S.spinState === 'done';
  const isSpin    = S.spinState === 'spinning';
  const tc        = isDone ? TEAM_COLORS[S.currentSpin.team] : null;
  const activeEra = isDualDraft()
    ? (S.currentPlayer === 1 ? (S.p1Era || 'all') : (S.p2Era || 'all'))
    : (S.selectedEra || 'all');
  const eraLocked = activeEra !== 'all';
  const decPool   = availableDecades();
  const skips = getSkips();
  const boardLabel = isDualDraft()
    ? `Pick ${S.p1Round + S.p2Round + 1} of ${SNAKE_ORDER.length}`
    : `Round ${S.round + 1}`;
  return `
  <div class="rounded-2xl border border-border bg-card p-4 animate-scale-in card-shadow draft-slot-machine">
    <div class="flex items-center gap-2 mb-3">
      <p class="text-xs font-bold uppercase tracking-widest text-muted-fg">Draft Board — ${boardLabel}</p>
      <div class="ml-auto flex gap-1.5">
        ${isDone && skips.team > 0 ? `<button data-action="skip-team" class="text-[11px] px-2.5 py-1 rounded-full border border-border bg-card2 text-muted-fg hover:border-primary hover:text-primary transition-all cursor-pointer">Skip Team (${skips.team})</button>` : ''}
        ${isDone && skips.decade > 0 && !eraLocked ? `<button data-action="skip-decade" class="text-[11px] px-2.5 py-1 rounded-full border border-border bg-card2 text-muted-fg hover:border-primary hover:text-primary transition-all cursor-pointer">Skip Era (${skips.decade})</button>` : ''}
        ${isDone && skips.team <= 0 && skips.decade <= 0 && !S.adSkipsEarned
            && S.mode !== 'daily' && S.mode !== 'dynasty-duel' && gdRewardedAvailable()
          ? `<button data-action="watch-ad-skips" class="text-[11px] px-2.5 py-1 rounded-full border border-border bg-card2 text-muted-fg hover:border-primary hover:text-primary transition-all cursor-pointer">🎬 Watch Ad · +2 Skips</button>` : ''}      </div>
    </div>
    <div class="grid grid-cols-2 gap-3 mb-4 draft-slot-machine__grid ${isSpin ? 'slot-spinning' : ''}">
      <div class="rounded-xl border-2 p-4 flex flex-col items-center justify-center draft-slot-machine__cell transition-all"
        style="background:${isDone && tc ? tc.bg + '12' : 'var(--card2)'};border-color:${isDone && tc ? tc.bg + '88' : 'var(--border)'}">
        <span class="text-[10px] font-bold uppercase tracking-widest mb-2 text-muted-fg">TEAM</span>
        <span class="slot-badge text-xl font-black text-foreground" id="slot-team">
          ${isDone ? S.currentSpin.team : isSpin ? pickCosmetic(TEAMS) : '—'}
        </span>
        ${isDone ? `<span class="mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white uppercase tracking-wider">LOCKED</span>` : ''}
      </div>
      <div class="rounded-xl border-2 p-4 flex flex-col items-center justify-center draft-slot-machine__cell transition-all"
        style="background:${isDone ? 'var(--surface-blue)' : 'var(--card2)'};border-color:${isDone ? '#93c5fd' : 'var(--border)'}">
        <span class="text-[10px] font-bold uppercase tracking-widest mb-2 text-muted-fg">ERA</span>
        <span class="slot-badge text-xl font-black text-foreground" id="slot-decade">
          ${isDone ? S.currentSpin.decade : isSpin ? (eraLocked ? activeEra : pickCosmetic(decPool.length ? decPool : DECADES)) : '—'}
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
      ${dailyBoardDeadEnd() ? `
      <button data-action="spin" class="w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest bg-primary text-white hover:bg-blue-700 transition-all cursor-pointer">
        🚫 No legal picks here — spin a new board
      </button>
      ` : `
      <p class="text-center text-xs text-muted-fg py-1">${S.mode === 'blind' ? 'Names only — select a player, then tap a roster slot to place them' : 'Draft places into an open natural slot — or tap a roster slot to choose'}</p>
      `}
    `}
  </div>`;
}

// ── Draft board (full team/decade pool for the current spin) ─────────────────
function renderDraftBoard() {
  const isShell = S.spinState === 'spinning' && (!S.draftBoard || !S.draftBoard.length);
  if ((!S.draftBoard || !S.draftBoard.length) && !isShell) return '';
  const team    = S.currentSpin?.team;
  const decade  = S.currentSpin?.decade;
  const tc      = team ? TEAM_COLORS[team] : null;
  const fadeIn  = !isMobileViewport() && S.spinState === 'done';
  const cards   = S.draftBoard?.length
    ? S.draftBoard.map((p, i) => renderDraftCard(p, i)).join('')
    : '';
  return `
  <div class="${fadeIn ? 'animate-fade-up ' : ''}draft-board-wrap">
    <div class="flex items-center gap-2 mb-3 draft-board-wrap__head">
      ${tc ? `<span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${tc.bg}"></span>` : ''}
      <p class="text-xs font-bold uppercase tracking-widest text-muted-fg">${team || '—'} · ${decade || '—'}</p>
    </div>
    <div class="overflow-y-auto rounded-xl draft-board-scroll${isShell ? ' draft-board-scroll--shell' : ''}">
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 pr-1 draft-board-grid">
        ${cards}
      </div>
    </div>
  </div>`;
}

function renderDraftCard(p, index) {
  const alreadyOnRoster = S.draftedPlayerNames?.has(p.name) ?? false;
  // Daily Challenge — players today's rules forbid render dimmed with the reason.
  let dailyBlock = null;
  if (S.dailyChallenge && S.mode === 'daily' && !alreadyOnRoster) {
    const filled = Object.values(S.roster || {}).filter(Boolean);
    const check  = checkPickLegal(S.dailyChallenge,
      { ...p, team: S.currentSpin?.team, decade: S.currentSpin?.decade }, filled);
    if (!check.legal) dailyBlock = check.reason;
  }
  const unavailable     = alreadyOnRoster || !!dailyBlock;
  const isSelected      = !unavailable && S.selectedPlayer?.id === p.id;
  const cardBorder      = unavailable ? 'var(--border)' : isSelected ? 'var(--primary)' : 'var(--border)';
  const cardBg          = unavailable ? 'var(--card3)' : isSelected ? 'var(--card2)' : 'var(--card)';
  const cardOpacity     = unavailable ? 'opacity:0.5;' : '';
  const pickLabel       = S.mode === 'blind'
    ? (isSelected ? '✓ Selected — Tap a Roster Slot' : 'Draft → Tap Slot')
    : isMobileViewport()
    ? (isSelected ? '✓ Selected' : 'Draft → Slot')
    : (isSelected ? '✓ Selected — Tap a Roster Slot' : 'Draft → Tap Slot');

  // HoopIQ — name only, no stats or position hints
  if (S.mode === 'blind') {
    return `
  <div class="rounded-xl border-2 flex flex-col overflow-hidden transition-all card-shadow draft-card draft-card--blind"
    style="border-color:${cardBorder};background:${cardBg};${cardOpacity}">
    <div class="p-3 flex-1 flex items-center justify-center draft-card-body draft-card-body--blind">
      <p class="font-bold text-sm text-foreground leading-tight text-center draft-card__name">${p.name}</p>
    </div>
    <div class="px-3 pb-3 draft-card__actions">
      ${unavailable
        ? `<button disabled class="w-full py-2 rounded-lg font-bold text-xs draft-card-btn" style="background:var(--card2);color:var(--muted);border:1.5px solid var(--border);cursor:not-allowed" ${dailyBlock ? `title="${dailyBlock}"` : ''}>${alreadyOnRoster ? 'Already on Roster' : '🚫 Off-Limits Today'}</button>`
        : `<button data-action="draft-pick-${index}"
            class="w-full py-2 rounded-lg font-bold text-xs transition-all cursor-pointer draft-card-btn"
            style="background:${isSelected ? 'var(--primary)' : 'var(--card2)'};color:${isSelected ? 'var(--primary-fg)' : 'var(--primary)'};border:1.5px solid ${isSelected ? 'var(--primary)' : '#bfdbfe'}">
            ${pickLabel}
          </button>`
      }
    </div>
  </div>`;
  }

  return `
  <div class="rounded-xl border-2 flex flex-col overflow-hidden transition-all card-shadow draft-card"
    style="border-color:${cardBorder};background:${cardBg};${cardOpacity}">
    <div class="p-3 flex-1 draft-card-body">
      <div class="flex items-center gap-1.5 mb-2 draft-card__head">
        <span class="text-[10px] font-black px-1.5 py-0.5 rounded-full border border-border bg-card2 text-muted-fg draft-card__pos">${p.secondaryPos?.length ? `${p.pos} / ${p.secondaryPos[0]}` : p.pos}</span>
        <span class="draft-card__arch">${archetypeBadge(p.archetype)}</span>
      </div>
      <p class="font-bold text-sm text-foreground leading-tight mb-1.5 draft-card__name">${p.name}</p>
      <div class="flex flex-wrap gap-x-2 gap-y-0.5 draft-card__stats">
        ${[['PPG', p.ppg], ['RPG', p.rpg], ['APG', p.apg], ['SPG', p.spg], ['BPG', p.bpg]].map(([l, v]) =>
          `<span class="text-[10px] text-muted-fg"><span class="font-semibold text-foreground">${fmtPG(v)}</span> ${l}</span>`
        ).join('')}
      </div>
      ${p.traits && p.traits.length ? `
        <div class="flex flex-wrap gap-1 mt-1.5 draft-card-traits">
          ${p.traits.map(t => `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">${t}</span>`).join('')}
        </div>` : ''}
    </div>
    <div class="px-3 pb-3 draft-card__actions">
      ${unavailable
        ? `<button disabled class="w-full py-2 rounded-lg font-bold text-xs draft-card-btn" style="background:var(--card2);color:var(--muted);border:1.5px solid var(--border);cursor:not-allowed" ${dailyBlock ? `title="${dailyBlock}"` : ''}>${alreadyOnRoster ? 'Already on Roster' : '🚫 Off-Limits Today'}</button>`
        : `<button data-action="draft-pick-${index}"
            class="w-full py-2 rounded-lg font-bold text-xs transition-all cursor-pointer draft-card-btn"
            style="background:${isSelected ? 'var(--primary)' : 'var(--card2)'};color:${isSelected ? 'var(--primary-fg)' : 'var(--primary)'};border:1.5px solid ${isSelected ? 'var(--primary)' : '#bfdbfe'}">
            ${pickLabel}
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
  <div class="draft-roster">
    <div class="flex items-center justify-between mb-2 draft-roster__head">
      <p class="text-xs font-bold uppercase tracking-widest text-muted-fg">Your Roster <span class="text-primary">${filledCount}/${ALL_POSITIONS.length}</span></p>
      ${hasSelected ? `<p class="text-xs text-primary animate-fade-up font-medium draft-roster__place-hint">Tap an empty slot to place ${S.selectedPlayer.name}</p>` : ''}
    </div>
    <div class="grid grid-cols-3 sm:grid-cols-5 gap-2">
      ${POSITIONS.map(pos => renderRosterSlot(pos, hasSelected)).join('')}
    </div>
  </div>`;
}

function renderRosterSlot(pos, canPlace) {
  const p     = S.roster[pos];
  const label = pos;

  if (p) {
    const fitType  = p.pos === pos ? 'primary' : (p.secondaryPos || []).includes(pos) ? 'flex' : 'place';
    const fitClass  = 'fit-' + fitType;
    // Match empty-slot + chem language: primary green, flex amber, OOP/versatile
    // warm amber — never a "bad" red that fights Versatile (+1%) chem lines.
    const fitColors = { primary: '#16a34a', flex: '#d97706', place: '#c2410c' };
    const fitBorders = { primary: '#86efac', flex: '#fde68a', place: '#fdba74' };
    const fitTops = { primary: '#16a34a', flex: '#d97706', place: '#ea580c' };
    const borderColor = fitBorders[fitType];
    const borderTop   = `3px solid ${fitTops[fitType]}`;
    const labelColor  = fitColors[fitType];
    const ppgLine = S.mode === 'blind'
      ? ''
      : `<span class="text-[10px] text-muted-fg leading-none">${fmtPG(p.ppg)}pt</span>`;

    return `
    <div class="rounded-xl border bg-white p-2 flex flex-col items-center gap-0.5 text-center overflow-hidden card-shadow locked draft-roster-slot ${fitClass}"
      style="border-color:${borderColor};border-top:${borderTop}"
      title="${p.name} · pick locked">
      <span class="text-[10px] font-black uppercase leading-none" style="color:${labelColor}">${label}</span>
      <span class="text-[11px] font-bold text-foreground leading-tight w-full text-center truncate px-0.5">${p.name.split(' ').pop()}</span>
      ${ppgLine}
    </div>`;
  }

  // Empty slot — droppable when placing a draft pick.
  // Ball IQ hides the Primary/Flex hints: highlighting the selected player's
  // natural slots would leak the position the mode asks you to know.
  const canDrop      = canPlace;
  const sp           = S.selectedPlayer;
  const showFit      = S.mode !== 'blind';
  const primaryMatch = showFit && canDrop && sp && sp.pos === pos;
  const flexMatch    = showFit && canDrop && sp && !primaryMatch &&
    (sp.secondaryPos || []).includes(pos);
  // Out-of-position is NOT a bad fit — chemistry.js's optimizeLineup() scores
  // every slot on a 3-tier scale (primary/flex/oop) and oop still nets a
  // positive "Versatile (+1%)" synergy line, never a penalty. Amber/neutral
  // instead of red keeps the roster chip in agreement with chemistry copy.
  const oopMatch     = showFit && canDrop && sp && !primaryMatch && !flexMatch;

  const slotBg     = !canDrop ? 'var(--card3)' : (isDark() ? 'rgba(234,179,8,0.08)' : '#fffbeb');
  const slotBorder = !canDrop ? 'var(--border)' : (primaryMatch ? (isDark() ? '#4ade80' : '#86efac') : flexMatch ? (isDark() ? '#fbbf24' : '#fde68a') : oopMatch ? (isDark() ? '#fdba74' : '#fed7aa') : (isDark() ? '#f87171' : '#fca5a5'));
  const slotColor  = !canDrop ? 'var(--muted)' : (primaryMatch ? (isDark() ? '#4ade80' : '#16a34a') : flexMatch ? (isDark() ? '#fbbf24' : '#d97706') : oopMatch ? (isDark() ? '#fb923c' : '#c2410c') : (isDark() ? '#f87171' : '#dc2626'));
  const slotText   = !canDrop ? 'Empty' : primaryMatch ? 'Primary' : flexMatch ? 'Flex' : oopMatch ? 'Versatile' : 'Place';

  return `
  <button type="button" ${canDrop ? `data-action="place-${pos}"` : 'disabled'}
    class="rounded-xl border-2 border-dashed p-2 flex flex-col items-center gap-1 text-center transition-all draft-roster-slot ${canDrop ? 'slot-empty droppable cursor-pointer' : 'opacity-90'}"
    style="background:${slotBg};border-color:${slotBorder}"
    aria-label="${canDrop ? `Place ${sp?.name || 'player'} at ${label}` : `${label} empty`}">
    <span class="text-[10px] font-black uppercase" style="color:${slotColor}">${label}</span>
    <span class="text-xs" style="color:${slotColor}">${slotText}</span>
  </button>`;
}

// ── Live Chemistry Dashboard ──────────────────────────────────────────────────
function renderChemDashboard() {
  // Ball IQ: hide archetype / natural-position report lines while drafting —
  // they leak the answers the mode is testing. Keep the score meter only.
  if (S.mode === 'blind') {
    return `
  <div class="rounded-xl border border-border bg-card px-4 py-3 card-shadow draft-chem-dashboard">
    <div class="flex items-center justify-between mb-2 draft-chem-dashboard__head">
      <p class="text-[10px] font-bold uppercase tracking-widest text-muted-fg">Team Chemistry</p>
      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border border-border bg-card2 text-muted-fg">Ball IQ</span>
    </div>
    <p class="text-xs text-muted-fg draft-chem-report__empty">Names only — chemistry details unlock after you simulate.</p>
  </div>`;
  }

  // As-placed slots so Perfect Fit / Versatile lines match the visible roster
  // chips (sim still uses optimizeLineup inside calculateChemistry by default).
  const placedPairs = POSITIONS
    .map(pos => ({ pos, player: S.roster[pos] }))
    .filter(x => x.player);
  const starters = placedPairs.map(x => x.player);
  const asPlacedSlots = placedPairs.map(x => x.pos);
  const rosterKey = 'placed|' + (S.coach || '') + '|' + asPlacedSlots.map((s, i) => s + ':' + starters[i].id).join(',');
  if (_chemCache.key !== rosterKey) {
    _chemCache.key    = rosterKey;
    _chemCache.result = calculateChemistry(starters, S.coach, { asPlacedSlots });
  }
  const { chemScore, chemReport } = _chemCache.result;
  const tier = chemTier(chemScore);
  const { color: scoreColor, bg: scoreBg } = chemTierColors(tier.id, isDark());
  return `
  <div class="rounded-xl border border-border bg-card px-4 py-3 card-shadow draft-chem-dashboard">
    <div class="flex items-center justify-between mb-2 draft-chem-dashboard__head">
      <p class="text-[10px] font-bold uppercase tracking-widest text-muted-fg">Team Chemistry</p>
      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border" style="background:${scoreBg};color:${scoreColor};border-color:${scoreColor}30">${tier.label}</span>
    </div>
    <div class="h-1.5 rounded-full overflow-hidden bg-border draft-chem-dashboard__meter mb-3">
      <div class="h-full rounded-full stat-bar-fill" style="width:${chemScore}%;background:${scoreColor}"></div>
    </div>
    ${chemReport.length > 0 ? `
    <div class="flex flex-col gap-1.5 draft-chem-report">
      ${chemReport.map(item => {
        const isGood = item.startsWith('🟢');
        return `<div class="rounded-lg px-2.5 py-1.5 text-xs font-medium border draft-chem-report__item"
          style="background:${isGood ? 'var(--surface-green)' : 'var(--surface-red)'};color:${isGood ? (isDark() ? '#4ade80' : '#15803d') : (isDark() ? '#f87171' : '#dc2626')};border-color:${isGood ? (isDark() ? 'rgba(74,222,128,0.35)' : '#bbf7d0') : (isDark() ? 'rgba(248,113,113,0.35)' : '#fecaca')}">${item}</div>`;
      }).join('')}
    </div>` : `<p class="text-xs text-muted-fg draft-chem-report__empty">No synergies yet — keep drafting.</p>`}
  </div>`;
}

// ── Simulate card ─────────────────────────────────────────────────────────────
function renderSimulateCard() {
  const isDual  = isDualDraft();
  const isP1    = S.currentPlayer === 1;
  const isDynasty = S.mode === 'dynasty-duel';
  const btnText = isDual && isP1
    ? 'Lock In Roster — Pass to Player 2 →'
    : isDual
    ? 'Simulate Best-of-7 Series →'
    : isDynasty
    ? `Challenge ${S.dynastyOpponent?.name || 'Dynasty'} →`
    : S.mode === 'defense'
    ? 'Simulate Defense Season →'
    : S.mode === 'fans'
    ? 'Simulate Fans First Season →'
    : 'Simulate 82 Games →';
  const btnColor = isDual && isP1 ? '#d97706' : isDynasty ? '#b45309' : '#2563eb';
  const btnHover = isDual && isP1 ? '#b45309' : isDynasty ? '#92400e' : '#1d4ed8';
  const subtitle = isDual && isP1
    ? 'All 5 spots locked in. Hand the device to Player 2.'
    : isDual
    ? 'Both rosters set. Time to settle it on the court.'
    : isDynasty
    ? 'Skip the regular season — go straight at a legendary dynasty.'
    : S.mode === 'defense'
    ? 'Win probability leans on stocks, boards, and defensive chemistry.'
    : S.mode === 'fans'
    ? 'Star power scores the run — still need ~35 wins to look legit.'
    : 'All 5 spots locked in. Ready to run the season.';
  return `
  <div class="rounded-2xl border-2 border-primary bg-white p-5 text-center animate-scale-in card-shadow draft-simulate-card" style="border-color:${btnColor}20">
    <div class="flex justify-center mb-3">${iconBall('h-10 w-10 text-primary')}</div>
    ${isDual ? `<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-2 text-xs font-bold" style="background:${isP1 ? '#eff6ff' : '#fffbeb'};color:${isP1 ? '#2563eb' : '#d97706'}">⚔️ ${seriesLabels().p1} / ${seriesLabels().p2}</div>` : ''}
    <p class="font-black text-lg text-foreground mb-1">Roster Complete</p>
    <p class="text-sm text-muted-fg mb-4">${subtitle}</p>
    <button data-action="simulate" class="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest text-white transition-all cursor-pointer animate-pulse-glow"
      style="background:${btnColor}" onmouseover="this.style.background='${btnHover}'" onmouseout="this.style.background='${btnColor}'">
      ${btnText}
    </button>
  </div>`;
}

// ── Results screen ────────────────────────────────────────────────────────────
// ── Loss autopsy ──────────────────────────────────────────────────────────────
// Attribution priority order:
//   1. Balance penalty (≥ 0.03)  — the engine's primary loss driver, takes
//      precedence over chemistry so the player gets the real fix signal first
//   2. Chemistry penalty         — secondary structural issue
//   3. Balance penalty (< 0.03)  — minor but still real
//   4. Balanced-but-not-elite    — honest catch-all
//
// NOTE: roster-slot placement is deliberately NOT diagnosed. The engine
// auto-optimizes the floor assignment (chemistry.js optimizeLineup), so where
// the user parked a player has zero effect on the simulation — blaming an
// "out of position" placement would be advice that changes nothing.
//
// The engine packages `S.result.lossDiagnosis` with position-aware culprit
// selection. This function renders that diagnosis verbatim — no re-derivation.
export function computeAutopsy() {
  if (!S.result || !S.roster) return null;

  const d = S.result.lossDiagnosis;

  // ── 1. Significant balance penalty (≥ 0.03 strength units) ────────────────
  // This is the engine's primary loss mechanism. It fires before chemistry so
  // players get the real fix signal, not a secondary structural note.
  if (d && d.penaltyAmount >= 0.03) return _renderBalanceDiagnosis(d);

  // ── 2. Chemistry penalty ───────────────────────────────────────────────────
  const chemPenalty = (S.result.chemReport || []).find(l => l.startsWith('🔴'));
  if (chemPenalty) {
    // A single archetype gap (e.g. no playmaker) can coexist with an
    // otherwise-elite chemistry score — positional-fit bonuses dominate the
    // 0-100 scale, so "Perfect"/"Very Strong" up top and a 🔴 penalty here
    // are both correct, just about different things. Reusing the word
    // "chemistry" for both used to read as a flat contradiction; name the
    // gap without disputing the badge once the score is already high.
    const tier = chemTier(S.result.chemScore);
    const eliteOverall = tier.id === 'perfect' || tier.id === 'veryStrong';
    return {
      icon:   '🧪',
      title:  eliteOverall ? 'One gap still cost you games' : 'Your chemistry sprung a leak',
      detail: (eliteOverall
        ? `Your starting five's chemistry grades out ${tier.label} overall — but this one gap let opponents exploit it all season: `
        : '') + chemPenalty.replace('🔴', '').trim(),
      fix:    'One roster change removes this penalty — check the Team Chemistry Report below.',
    };
  }

  // ── 3. Minor balance penalty (> 0 but < 0.03) ─────────────────────────────
  if (d && d.penaltyAmount > 0) return _renderBalanceDiagnosis(d);

  // ── 4. Balanced but not elite anywhere ────────────────────────────────────
  return {
    icon:   '📊',
    title:  'No single flaw — just not championship-caliber yet',
    detail: 'Every category is solid but none is dominant. There is no one weak link to fix — the whole roster needs to level up.',
    fix:    'Target players with elite composite stats across all five categories.',
  };
}

/**
 * Converts a `lossDiagnosis` object (built by the engine) into the autopsy
 * card shape the UI template expects.
 *
 * When the culprit is clearly below the per-player baseline for their stat,
 * we name them specifically and tell the player what that stat gap looks like.
 * When the issue is genuinely team-wide (all starters near baseline but the
 * aggregate still falls short) we describe the team gap instead of inventing
 * a scapegoat.
 *
 * @param {object} d — lossDiagnosis from S.result
 */
function _renderBalanceDiagnosis(d) {
  const { statKey, statLabel, culpritName, culpritPos, culpritStat,
          perPlayerBase, culpritBelowBase, recommendedFix } = d;
  const statUpper = statKey.toUpperCase();

  if (culpritBelowBase && culpritName) {
    // Single player is the clear upgrade point.
    return {
      icon:   '📉',
      title:  `${culpritName} was the weak link on ${statLabel}`,
      detail: `From the ${culpritPos} slot, ${culpritName} averaged ${culpritStat} ${statUpper} — below the starter baseline of ${perPlayerBase} ${statUpper}. Opponents attacked that gap every night until it dragged the whole lineup down.`,
      fix:    `Next draft, target ${recommendedFix}.`,
    };
  }

  // Team-wide gap — no single player to blame, but the fix is still specific.
  return {
    icon:   '📉',
    title:  `Your ${statLabel} fell below championship level`,
    detail: `The starting five's combined ${statLabel} didn't reach the baseline for title contenders — no one starter is the villain, but the collective gap gave opponents a free lane all season.`,
    fix:    `Next draft, target ${recommendedFix}.`,
  };
}

// ── Paced season reveal ───────────────────────────────────────────────────────
/** Live win-streak display for the season-sim screen — escalates with heat. */
export function liveStreakLabel(n) {
  if (n === 0)  return { text: '', color: '#94a3b8' };
  if (n >= 30)  return { text: `🔥🔥🔥 ${n} STRAIGHT`, color: '#dc2626' };
  if (n >= 15)  return { text: `🔥🔥 ${n} straight wins`, color: '#d97706' };
  if (n >= 5)   return { text: `🔥 ${n} straight wins`, color: '#2563eb' };
  return { text: `${n} in a row`, color: '#94a3b8' };
}

export function renderSeasonTickerRows() {
  const idx    = S.seasonRevealIdx || 0;
  const recent = (S.seasonGames || []).slice(Math.max(0, idx - 8), idx).reverse();
  return recent.map((g, i) => {
    const latest   = i === 0;
    const col      = g.won ? '#16a34a' : '#dc2626';
    const lateLoss = !g.won && (g.num || 0) > 60;
    const rowStyle = g.rival
      ? `background:#fffbeb;border:1px solid #fde68a${latest ? '' : ';opacity:0.75'}`
      : g.revenge
      ? `background:#f5f3ff;border:1px solid #ddd6fe${latest ? '' : ';opacity:0.75'}`
      : latest ? '' : 'opacity:0.55';
    const chip = g.rival
      ? `<span class="text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0" style="background:#0f172a;color:#fbbf24">🔥 RIVALRY</span>`
      : g.revenge
      ? `<span class="text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0" style="background:#4c1d95;color:#c4b5fd">⚡ REVENGE</span>`
      : g.isFirstLoss
      ? `<span class="text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0" style="background:#450a0a;color:#fca5a5">STREAK ENDED</span>`
      : lateLoss
      ? `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style="background:#fef2f2;color:#b91c1c">GUT PUNCH</span>`
      : g.type === 'close'
      ? `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style="background:#fef3c7;color:#a16207">CLUTCH</span>`
      : '';
    return `
    <div class="flex items-center gap-2 py-1.5 px-3 rounded-lg${latest ? ' bg-white card-shadow' : ''}"${rowStyle ? ` style="${rowStyle}"` : ''}>
      <span class="text-[10px] font-black w-8 flex-shrink-0 text-muted-fg">G${g.num}</span>
      <span class="text-xs font-bold flex-1 truncate text-foreground">vs ${g.opp}</span>
      ${chip}
      <span class="text-xs font-semibold text-muted-fg" style="font-variant-numeric:tabular-nums">${g.ps}–${g.os}</span>
      <span class="text-sm font-black w-5 text-center flex-shrink-0" style="color:${col}">${g.won ? 'W' : 'L'}</span>
    </div>`;
  }).join('');
}

function renderSeasonSim() {
  const idx    = S.seasonRevealIdx || 0;
  const total  = (S.seasonGames || []).length || 82;
  const played = (S.seasonGames || []).slice(0, idx);
  const w      = played.filter(g => g.won).length;
  const l      = played.length - w;
  const pct    = (played.length / total) * 100;
  const done   = idx >= total;
  const g1     = S.seasonGames?.[0];
  let liveN = 0;
  for (let i = played.length - 1; i >= 0 && played[i].won; i--) liveN++;
  const streakLbl = liveStreakLabel(liveN);
  return `
  <div class="flex flex-col min-h-screen main-gradient">
    ${renderHeader(true)}
    <main class="flex-1 flex flex-col items-center px-4 pt-8 pb-24 season-sim-main">
      <div class="w-full max-w-md flex flex-col gap-4 animate-fade-up">

        <div class="text-center">
          <p class="text-xs font-bold uppercase tracking-widest text-muted-fg mb-1.5">Season in progress</p>
          <p id="sim-record" class="text-5xl font-black text-foreground leading-none" style="font-variant-numeric:tabular-nums">${w}–${l}</p>
          <p id="sim-gp" class="text-xs text-muted-fg mt-2">Game ${played.length} of ${total}</p>
          <p id="sim-streak" class="text-xs font-bold mt-1" style="color:${streakLbl.color}">${streakLbl.text}</p>
          <p id="sim-beststart" class="text-xs font-bold mt-0.5 text-muted-fg" style="min-height:1em"></p>
        </div>

        <div class="h-2 rounded-full overflow-hidden" style="background:var(--border)">
          <div id="sim-progress" class="h-full rounded-full" style="width:${pct}%;background:var(--primary);transition:width 0.15s linear"></div>
        </div>

        ${S.seasonPaused && g1 ? `
        <div class="rounded-2xl bg-white p-5 card-shadow text-center animate-scale-in" style="border:2px solid #fbbf24">
          <p class="text-sm font-black text-foreground mb-1">🏆 Game 1: W ${g1.ps}–${g1.os} over the ${g1.opp}!</p>
          <p class="text-xs text-muted-fg mb-4">GAME 2 — <b style="color:#b45309">TOUGH MATCHUP</b>. The road only gets harder from here.</p>
          <button data-action="season-continue"
            class="w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest text-white cursor-pointer animate-pulse-glow"
            style="background:#d97706">Play Game 2 →</button>
        </div>` : ''}

        ${S.rivalTease ? (() => {
          const rival = (S.seasonGames || []).find(g => g.rival);
          return `
          <div class="rounded-2xl p-5 text-center card-shadow animate-scale-in" style="background:#0f172a;border:2px solid #f59e0b">
            <p class="text-[10px] font-black uppercase mb-1.5" style="color:#fbbf24;letter-spacing:0.25em">🔥 Rivalry Night</p>
            <p class="text-base font-black text-white">The ${rival ? rival.opp : 'legends'} are in town.</p>
            <p class="text-[11px] mt-1 text-muted-fg">Statement game. The whole league is watching.</p>
          </div>`;
        })() : ''}

        <div id="sim-ticker" class="flex flex-col gap-1 season-sim-ticker">${renderSeasonTickerRows()}</div>

        ${!done && !S.seasonPaused ? `
        <button data-action="season-skip" id="season-skip-btn"
          class="season-skip-btn py-2.5 rounded-xl font-bold text-xs border border-border bg-card2 text-muted-fg hover:border-primary hover:text-primary transition-all cursor-pointer">
          Skip to Final Record ⏭
        </button>` : ''}

      </div>
    </main>
    ${renderFooter()}
  </div>`;
}

function renderSaveRunCard() {
  const r = S.result;
  if (!r) return '';
  return `
        <div id="save-run-card" class="rounded-2xl border bg-white p-4 card-shadow"
          style="border-color:${S.runSaved ? '#bbf7d0' : 'var(--border)'};background:${S.runSaved ? '#f0fdf4' : 'var(--card)'}">
          ${S.runSaved ? `
          <div class="flex items-center gap-3">
            <span class="text-2xl">✅</span>
            <div class="min-w-0 flex-1">
              <p class="font-black text-sm text-green-700">Submitted!</p>
              <p class="text-xs text-green-600 mt-0.5">"${esc(S.teamName)}" &nbsp;·&nbsp; ${r.wins}–${r.losses}</p>
              <p class="text-[10px] text-green-600 mt-0.5">Personal leaderboard${S.globalScoreSubmitted ? ' · Global board 🌍' : ''}</p>
            </div>
            <div class="flex flex-col gap-1.5 flex-shrink-0">
              <button data-action="open-leaderboard" class="text-xs font-bold px-3 py-1.5 rounded-lg border border-green-300 bg-white text-green-700 hover:bg-green-50 transition-all cursor-pointer">
                Personal
              </button>
              ${S.globalScoreSubmitted ? `<button data-action="open-global-leaderboard" class="text-xs font-bold px-3 py-1.5 rounded-lg border border-green-300 bg-white text-green-700 hover:bg-green-50 transition-all cursor-pointer">Global 🌍</button>` : ''}
            </div>
          </div>` : `
          <p class="text-xs font-bold uppercase tracking-widest text-muted-fg mb-3">Save Your Run</p>
          <div class="flex gap-2">
            <div class="flex-1 relative">
              <input
                id="team-name-input"
                type="text"
                maxlength="30"
                value="${esc(S.teamName || '')}"
                placeholder="Untitled Team"
                class="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-fg focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted pointer-events-none" id="team-name-counter">30</span>
            </div>
            <button data-action="save-run"
              class="flex-shrink-0 px-4 rounded-xl font-bold text-sm bg-primary text-white hover:bg-blue-700 transition-all cursor-pointer card-shadow">
              Submit
            </button>
          </div>
          <p class="text-[10px] text-muted-fg mt-2">Saves to your personal leaderboard and global board · max 30 characters</p>`}
        </div>`;
}

// ── Daily Challenge — results verdict banner ──────────────────────────────────
function renderDailyResultBanner() {
  const ch = S.dailyChallenge;
  const dr = S.dailyResult;
  if (S.mode !== 'daily' || !ch || !dr) return '';
  const style = dr.pass
    ? {
        bg: 'color-mix(in srgb, #22c55e 14%, var(--card))',
        border: 'color-mix(in srgb, #22c55e 45%, var(--border))',
        color: isDark() ? '#4ade80' : '#15803d',
        title: 'var(--fg)',
        muted: 'var(--muted-fg)',
        icon: '🎉',
        head: 'Challenge passed!',
      }
    : {
        bg: 'color-mix(in srgb, #ef4444 12%, var(--card))',
        border: 'color-mix(in srgb, #ef4444 45%, var(--border))',
        color: isDark() ? '#f87171' : '#dc2626',
        title: 'var(--fg)',
        muted: 'var(--muted-fg)',
        icon: '💔',
        head: 'Challenge failed',
      };
  const streakLine = dr.pass && dr.streak > 0 ? ` · 🔥 ${dr.streak}-day streak` : '';
  return `
  <div class="rounded-2xl border-2 p-4 card-shadow text-center" style="background:${style.bg};border-color:${style.border}">
    <p class="text-xs font-black uppercase tracking-widest mb-1" style="color:${style.color}">${style.icon} Daily Challenge — ${style.head}</p>
    <p class="text-sm font-bold" style="color:${style.title}">${ch.emoji} ${ch.title}</p>
    <p class="text-xs mt-1" style="color:${style.color}">${dr.detail}${streakLine}</p>
    <p class="text-[10px] mt-1.5" style="color:${style.muted}">Score ${dr.score} · new challenge tomorrow (midnight UTC)${renderCommunityStatsMerged()}</p>
    <button data-action="open-daily-stats" class="mt-3 text-xs font-bold px-3 py-1.5 rounded-lg border cursor-pointer"
      style="border-color:${style.border};background:var(--card);color:${style.color}">Daily Challenge Stats 📊</button>
  </div>`;
}

function renderDailySubmitCard() {
  if (S.mode !== 'daily') return '';
  const r = S.result;
  if (!r) return '';

  if (S.dailyScoreSubmitted) {
    return `
    <div class="rounded-2xl border p-4 card-shadow" style="border-color:#fdba74;background:${isDark() ? 'rgba(249,115,22,0.1)' : '#fff7ed'}">
      <div class="flex items-center gap-3">
        <span class="text-2xl">✅</span>
        <div class="min-w-0 flex-1">
          <p class="font-black text-sm" style="color:${isDark() ? '#fdba74' : '#9a3412'}">On the daily board!</p>
          <p class="text-xs mt-0.5" style="color:${isDark() ? '#fed7aa' : '#c2410c'}">"${esc(S.teamName)}" &nbsp;·&nbsp; ${r.wins}–${r.losses}</p>
        </div>
        <button data-action="open-daily-leaderboard" class="text-xs font-bold px-3 py-1.5 rounded-lg border flex-shrink-0 cursor-pointer" style="border-color:var(--border);background:var(--card);color:var(--muted-fg)">
          Board
        </button>
      </div>
    </div>`;
  }

  const errorHtml = S.dailySubmitError
    ? `<p class="text-xs text-red-500 mt-2">⚠️ ${esc(S.dailySubmitError)} &nbsp;<button data-action="submit-daily" class="underline cursor-pointer font-bold">Retry</button></p>`
    : '';
  return `
  <div class="rounded-2xl border p-4 card-shadow" style="border-color:#fdba74;background:${isDark() ? 'rgba(249,115,22,0.07)' : '#fffaf5'}">
    <p class="text-xs font-bold uppercase tracking-widest mb-2" style="color:${isDark() ? '#fdba74' : '#c2410c'}">🗓️ Daily Challenge</p>
    <p class="text-xs mb-3" style="color:${isDark() ? '#cbd5e1' : '#475569'}">Name your franchise, then submit your record to today's leaderboard.</p>
    <div class="flex gap-2">
      <div class="flex-1 relative">
        <input
          id="daily-team-name-input"
          type="text"
          maxlength="30"
          value="${esc(S.teamName || '')}"
          placeholder="Franchise Name"
          class="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-fg focus:outline-none focus:border-primary focus:ring-2 focus:ring-orange-100 transition-all"
        />
        <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted pointer-events-none" id="daily-team-name-counter">30</span>
      </div>
      <button data-action="submit-daily" id="submit-daily-btn"
        class="flex-shrink-0 px-4 rounded-xl font-bold text-sm text-white hover:opacity-90 transition-all cursor-pointer card-shadow" style="background:#ea580c">
        Submit
      </button>
    </div>
    ${errorHtml}
    <p class="text-[10px] text-muted-fg mt-2">Appears on today's daily board · max 30 characters</p>
  </div>`;
}

function renderResults() {
  const r          = S.result;
  const tier       = seasonTier(r.wins);
  const isPerfect  = tier.id === 'perfect';
  const isHistoric = tier.id === 'historic';
  const isElite    = tier.id === 'elite';
  const isPlayoff  = tier.id === 'playoff';

  // Fire confetti for 82-0 — once per results screen, not on every re-render.
  if (isPerfect && !S.perfectConfettiFired) {
    S.perfectConfettiFired = true;
    setTimeout(() => {
      withConfetti(() => {
        confetti({ particleCount: 180, spread: 90, origin: { y: 0.55 }, zIndex: 40, colors: ['#f97316', '#eab308', '#fcd34d', '#ffffff'] });
        setTimeout(() => confetti({ particleCount: 100, spread: 120, origin: { y: 0.7 }, zIndex: 40, colors: ['#fbbf24', '#fde68a', '#ffffff'] }), 250);
      });
    }, 200);
  }

  let label = tier.label, emoji = tier.emoji, labelColor, labelBg;
  if (isPerfect)       { labelColor = isDark() ? '#fcd34d' : '#92400e'; labelBg = isDark() ? 'rgba(251,191,36,0.15)' : '#fef3c7'; }
  else if (isHistoric) { labelColor = isDark() ? '#fbbf24' : '#b45309'; labelBg = isDark() ? 'rgba(251,191,36,0.12)' : '#fffbeb'; }
  else if (isElite)    { labelColor = isDark() ? '#4ade80' : '#166534'; labelBg = isDark() ? 'rgba(34,197,94,0.12)' : '#f0fdf4'; }
  else if (isPlayoff)  { labelColor = isDark() ? '#93c5fd' : '#1e40af'; labelBg = isDark() ? 'rgba(59,130,246,0.12)' : '#eff6ff'; }
  else                 { labelColor = isDark() ? '#f87171' : '#991b1b'; labelBg = isDark() ? 'rgba(239,68,68,0.12)' : '#fef2f2'; }

  const modeBadge = S.mode === 'defense'
    ? `<span class="inline-block text-[11px] font-bold px-3 py-1 rounded-full mb-2 border" style="border-color:color-mix(in srgb,#8b5cf6 35%,var(--border));background:color-mix(in srgb,#8b5cf6 14%,var(--card));color:var(--fg)">🛡️ DEF profile · ${r.teamStocks ?? 0} stocks</span>`
    : S.mode === 'fans'
    ? `<span class="inline-block text-[11px] font-bold px-3 py-1 rounded-full mb-2 border" style="border-color:color-mix(in srgb,#ec4899 35%,var(--border));background:color-mix(in srgb,#ec4899 14%,var(--card));color:var(--fg)">📣 Fans First score ${r.fansScore ?? 0}${r.fansPassed ? ' · ✓ (≥70 pop & ≥35 wins)' : ' · need ≥70 pop & ≥35 wins'}</span>`
    : '';

  const winsColor = isPerfect || isHistoric ? (isDark() ? '#fbbf24' : '#d97706') : isElite ? (isDark() ? '#4ade80' : '#16a34a') : isPlayoff ? (isDark() ? '#60a5fa' : '#2563eb') : (isDark() ? '#f87171' : '#dc2626');

  // ── Team rating (0–100 overall) display helpers ───────────────────────────
  const teamOvr     = Math.round(r.avgRating ?? 0);
  const ratingDelta = r.ratingEloDelta ?? 0;
  const ratingPct   = ratingDelta / (r.baseStrength || 1) * 100;
  const ratingImpactLabel = Math.abs(ratingPct) >= 0.1
    ? ` · ${ratingPct >= 0 ? '+' : ''}${ratingPct.toFixed(1)}% Elo`
    : '';

  // ── Per-player season stats (this simulated run) ──────────────────────────
  // Frozen in r by the engine — the renderer only reads. Look up each starter's
  // line by id so the roster rows and leaders show the season that was saved.
  const simById   = Object.fromEntries((r.playerStats || []).map(l => [l.id, l]));
  const leaders   = r.statLeaders || null;
  const leaderRows = leaders ? [
    { icon: '🏀', label: 'Points',   key: 'ppg', e: leaders.scoring    },
    { icon: '🪃', label: 'Rebounds', key: 'rpg', e: leaders.rebounding },
    { icon: '🎯', label: 'Assists',  key: 'apg', e: leaders.assists    },
    { icon: '🧤', label: 'Steals',   key: 'spg', e: leaders.steals     },
    { icon: '🛡️', label: 'Blocks',   key: 'bpg', e: leaders.blocks     },
  ].filter(row => row.e) : [];
  const seasonLeadersCard = leaderRows.length ? `
    <div class="rounded-2xl border border-border bg-white p-4 card-shadow">
      <div class="flex items-center justify-between mb-3">
        <p class="text-xs font-bold uppercase tracking-widest text-muted-fg">Season Leaders</p>
        <span class="text-[10px] font-bold text-muted-fg">82-game averages</span>
      </div>
      <div class="flex flex-col gap-1.5">
        ${leaderRows.map(({ icon, label, key, e }) => `
          <div class="flex items-center gap-3 py-1">
            <span class="text-base w-6 flex-shrink-0 text-center">${icon}</span>
            <span class="text-[10px] font-bold uppercase tracking-wider text-muted-fg w-16 flex-shrink-0">${label}</span>
            <span class="text-sm font-semibold text-foreground flex-1 min-w-0 truncate">${e.name}</span>
            <span class="text-sm font-black text-foreground flex-shrink-0">${e.val.toFixed(1)}</span>
            <span class="text-[10px] font-bold text-muted-fg w-8 flex-shrink-0">${key.toUpperCase()}</span>
          </div>`).join('')}
      </div>
    </div>` : '';

  // ── Popularity / Fan-Hype display helpers ─────────────────────────────────
  const popDelta    = r.popEloDelta ?? 0;
  const teamFans    = calcTeamFans(POSITIONS.map(p => S.roster[p]));
  const popBarPct   = teamFans.pct;
  const popBarCol   = fansBarCol(teamFans.avg);
  const popTier     = teamFans.tier;

  const hypeBadge = (() => {
    if (Math.abs(popDelta) < 0.002) return ''; // negligible — don't show
    const pos    = popDelta >= 0;
    const sign   = pos ? '+' : '';
    const pctImp = (popDelta / (r.baseStrength || 1) * 100).toFixed(1);
    const bg     = pos ? (isDark() ? 'rgba(34,197,94,0.12)' : '#f0fdf4') : (isDark() ? 'rgba(239,68,68,0.12)' : '#fef2f2');
    const border = pos ? (isDark() ? 'rgba(74,222,128,0.35)' : '#bbf7d0') : (isDark() ? 'rgba(248,113,113,0.35)' : '#fecaca');
    const color  = pos ? (isDark() ? '#4ade80' : '#15803d') : (isDark() ? '#f87171' : '#dc2626');
    const lbl    = pos ? 'High Fans' : 'Low Fans';
    return `<span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border"
      style="background:${bg};border-color:${border};color:${color}">
      ${pos ? '📈' : '📉'} ${sign}${pctImp}% Elo · ${lbl}
    </span>`;
  })();

  // Scaled to 5-starter sums (an elite roster reads ~85-95%): the theoretical
  // ceilings in this DB are ~187 ppg / 117 rpg / 59 apg / 16 spg / 20 bpg for
  // the five best per category — unreachable simultaneously.
  const maxes = { ppg: 150, rpg: 65, apg: 40, spg: 10, bpg: 10 };
  const statBar = (key, lbl, val) => {
    const pct   = Math.min(100, (val / maxes[key]) * 100);
    const color = pct >= 70 ? (isDark() ? '#60a5fa' : '#2563eb') : pct >= 45 ? (isDark() ? '#fbbf24' : '#d97706') : (isDark() ? '#cbd5e1' : '#94a3b8');
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
    const fitBg    = fit === 'primary' ? (isDark() ? 'rgba(34,197,94,0.15)' : '#dcfce7') : fit === 'flex' ? (isDark() ? 'rgba(234,179,8,0.15)' : '#fef9c3') : fit ? (isDark() ? 'rgba(249,115,22,0.15)' : '#fefce8') : null;
    const fitColor = fit === 'primary' ? (isDark() ? '#4ade80' : '#15803d') : fit === 'flex' ? (isDark() ? '#fbbf24' : '#a16207') : fit ? (isDark() ? '#fb923c' : '#d97706') : null;
    const fitText  = fit === 'primary' ? '✓' : fit === 'flex' ? '↔' : fit ? '+' : null;
    const fitBadge = fit
      ? `<span class="text-[8px] font-black px-1 py-0.5 rounded leading-none ml-0.5" style="background:${fitBg};color:${fitColor}">${fitText}</span>`
      : '';
    // Prefer this season's simulated line; fall back to the player's real
    // averages if stats weren't generated (e.g. an older cached result).
    const s = simById[p.id] || p;
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
        <span><span class="font-semibold text-foreground">${fmtPG(s.ppg)}</span> PPG</span>
        <span><span class="font-semibold text-foreground">${fmtPG(s.rpg)}</span> RPG</span>
        <span class="hidden sm:inline"><span class="font-semibold text-foreground">${fmtPG(s.apg)}</span> APG</span>
      </div>
    </div>`;
  };

  const chemReportHtml = r.chemReport && r.chemReport.length > 0
    ? r.chemReport.map(item => {
        const isGood = item.startsWith('🟢');
        return `<div class="rounded-lg px-3 py-2 text-sm font-medium border"
          style="background:${isGood ? 'var(--surface-green)' : 'var(--surface-red)'};border-color:${isGood ? (isDark() ? 'rgba(74,222,128,0.35)' : '#bbf7d0') : (isDark() ? 'rgba(248,113,113,0.35)' : '#fecaca')};color:${isGood ? (isDark() ? '#4ade80' : '#15803d') : (isDark() ? '#f87171' : '#dc2626')}">${item}</div>`;
      }).join('')
    : `<p class="text-sm text-muted-fg py-1">No synergies or penalties — balanced roster.</p>`;

  // Hoisted once — autopsy for imperfect seasons; congrats card uses isPerfect inline.
  const autopsy = !isPerfect ? computeAutopsy() : null;

  const chemScoreBadge = r.chemScore !== undefined ? (() => {
    const tier = chemTier(r.chemScore);
    const { color: scColor, bg: scBg } = chemTierColors(tier.id, isDark());
    return `<span class="text-xs font-bold px-2 py-0.5 rounded-full border" style="background:${scBg};color:${scColor};border-color:${scColor}30">${tier.label}</span>`;
  })() : '';

  // Surfaced next to the headline Team OVR chip below — OVR alone is a poor
  // predictor of the record (fit/archetype synergy swings wins far more than
  // raw overall), so the fit-adjusted Chemistry tier sits right beside it
  // instead of only appearing further down in the Team Chemistry Report.
  const chemTopChip = r.chemScore !== undefined ? (() => {
    const tier = chemTier(r.chemScore);
    const { color: scColor, bg: scBg } = chemTierColors(tier.id, isDark());
    return `<span class="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full border"
      style="background:${scBg};border-color:${scColor}40;color:${scColor}">
      🧪 Chemistry: ${tier.label}
    </span>`;
  })() : '';

  return `
  <div class="flex flex-col min-h-screen main-gradient">
    ${renderHeader(false)}
    <main class="flex-1 flex flex-col items-center px-4 py-6">
      <div class="w-full max-w-2xl flex flex-col gap-4 animate-fade-up results-layout">
        <div class="results-block--record rounded-2xl border-2 bg-white p-6 text-center card-shadow ${isPerfect ? 'perfect-glow' : ''}"
          style="border-color:${isPerfect ? '#fcd34d' : 'var(--border)'}">
          <p class="text-[10px] font-bold uppercase tracking-widest text-muted-fg mb-3">Season Record</p>
          <div class="text-7xl sm:text-8xl font-black mb-3 flex items-center justify-center gap-3 leading-none">
            <span style="color:${winsColor}">${r.wins}</span>
            <span class="text-muted text-4xl font-light">–</span>
            <span class="text-muted-fg">${r.losses}</span>
          </div>
          <span class="inline-block text-sm font-bold px-4 py-1.5 rounded-full mb-2" style="background:${labelBg};color:${labelColor}">${emoji} ${label}</span>
          ${modeBadge}
          <p class="text-xs text-muted-fg mb-2">Projected Win% ${r.winPct}% &nbsp;·&nbsp; Team OVR ${teamOvr} &nbsp;·&nbsp; Strength Index ${r.strength}</p>
          <div class="flex items-center justify-center gap-2 flex-wrap">
            <span class="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full border"
              style="background:${ovrColor(teamOvr)}12;border-color:${ovrColor(teamOvr)}40;color:${ovrColor(teamOvr)}">
              🏀 Team OVR ${teamOvr}${ratingImpactLabel}
            </span>
            ${chemTopChip}
            ${r.longestStreak >= 5 ? `<span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border" style="background:#fef2f2;border-color:#fecaca;color:#dc2626">🔥 ${r.longestStreak}-game win streak</span>` : ''}
            <span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border border-border bg-slate-50 text-slate-600">
              🌍 Fans: ${Math.round(teamFans.sum)}M
            </span>
            ${(() => {
              if (!r.coachBoost) return '';
              const coachObj = S.coach ? COACHES.find(c => c.id === S.coach) : null;
              if (!coachObj) return '';
              const pctOfMax = r.coachBoost / 0.040;
              const grade    = pctOfMax >= 0.75 ? 'Mastered' : pctOfMax >= 0.4 ? 'Building' : 'Faint';
              return `<span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border"
                style="background:${coachObj.accent}12;border-color:${coachObj.accent}40;color:${coachObj.accent}">
                📋 ${coachObj.system}: +${(r.coachBoost * 100).toFixed(1)}% · ${grade}
              </span>`;
            })()}
            ${hypeBadge}
          </div>
        </div>

        <!-- Advance to Playoffs + Autopsy side by side -->
        <div class="results-block--playoffs grid grid-cols-1 sm:grid-cols-2 gap-4">
          ${r.wins >= 20 ? `
          <div class="rounded-2xl border-2 border-primary bg-white p-5 card-shadow flex flex-col justify-between">
            <div class="text-center mb-4">
              <span class="text-4xl mb-2 block">🏆</span>
              <p class="text-sm font-black text-foreground mb-1">Advance to Playoffs</p>
              <p class="text-xs text-muted-fg">${r.wins / 82 < 0.35
                ? `Sneak that ${r.wins}-win squad into the bracket anyway — every low seed dreams of a stolen series.`
                : `Take your ${r.wins}-win roster into the postseason bracket.`}</p>
            </div>
            <button data-action="advance-to-playoffs"
              class="w-full py-3 rounded-xl font-bold text-sm bg-primary text-white hover:bg-blue-700 transition-all cursor-pointer card-shadow">
              Enter Playoffs →
            </button>
          </div>` : `
          <div class="rounded-2xl border border-border bg-white p-5 card-shadow flex flex-col justify-between opacity-90">
            <div class="text-center mb-2">
              <span class="text-4xl mb-2 block">📋</span>
              <p class="text-sm font-black text-foreground mb-1">No Playoff Bid</p>
              <p class="text-xs text-muted-fg">Need at least 20 wins to crack the bracket. Run it back and rebuild.</p>
            </div>
          </div>`}
          ${autopsy ? `
          <div class="rounded-2xl bg-white p-5 card-shadow flex flex-col" style="border:1.5px solid #fecaca">
            <p class="text-xs font-bold uppercase tracking-widest mb-2.5" style="color:#dc2626">
              Loss Autopsy — ${r.losses} ${r.losses === 1 ? 'loss' : 'losses'}
            </p>
            <div class="flex items-start gap-3 flex-1">
              <span class="text-2xl flex-shrink-0">${autopsy.icon}</span>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-black text-foreground mb-0.5">${autopsy.title}</p>
                <p class="text-xs text-muted-fg leading-relaxed">${autopsy.detail}</p>
                <p class="text-xs font-bold mt-2" style="color:var(--primary)">💡 ${autopsy.fix}</p>
              </div>
            </div>
            ${S.mode !== 'daily' ? `<button data-action="draft-new-roster"
              class="w-full mt-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-white cursor-pointer transition-all hover:opacity-90"
              style="background:#dc2626">🔁 Run It Back — Fix It</button>` : ''}
          </div>` : isPerfect ? `
          <div class="rounded-2xl p-4 card-shadow flex flex-col perfect-glow" style="border:1.5px solid #fcd34d;background:${isDark() ? 'rgba(251,191,36,0.08)' : '#fffbeb'}">
            <p class="text-xs font-bold uppercase tracking-widest mb-2.5" style="color:${isDark() ? '#fcd34d' : '#b45309'}">
              Congratulations — 82-0
            </p>
            <div class="flex items-start gap-3 flex-1">
              <span class="text-2xl flex-shrink-0">🏆</span>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-black mb-0.5" style="color:${isDark() ? '#fcd34d' : '#92400e'}">You went undefeated!</p>
                <p class="text-xs leading-relaxed" style="color:${isDark() ? '#fde68a' : '#b45309'}">No losses to dissect — you drafted an all-time roster, nailed the chemistry, and ran the table. No NBA team has ever gone 82–0. Now take the #1 seed into the playoffs and finish the job.</p>
                <p class="text-xs font-bold mt-2" style="color:${isDark() ? '#fbbf24' : '#d97706'}">🎉 Immortality is one playoff run away.</p>
              </div>
            </div>
          </div>` : `<div></div>`}
        </div>

        <div class="results-block--save">${renderSaveRunCard()}</div>
        ${renderDailyResultBanner()}
        ${renderDailySubmitCard()}

        <div class="rounded-2xl border border-border bg-white p-4 card-shadow">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs font-bold uppercase tracking-widest text-muted-fg">Team Chemistry Report</p>
            ${chemScoreBadge}
          </div>
          <div class="flex flex-col gap-2">${chemReportHtml}</div>
        </div>
        <!-- ── Fans card ───────────────────────────────────────────────── -->
        <div class="rounded-2xl border border-border bg-white p-4 card-shadow">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs font-bold uppercase tracking-widest text-muted-fg">Fans</p>
            <span class="text-xs font-bold px-2 py-0.5 rounded-full border"
              style="background:var(--surface-muted);color:${popBarCol};border-color:${popBarCol}30">${popTier}</span>
          </div>
          <!-- Popularity bar -->
          <div class="mb-3">
            <div class="flex justify-between text-xs mb-1.5">
              <span class="text-muted-fg font-medium">Team Fans</span>
              <span class="font-bold text-foreground">${Math.round(teamFans.sum)}M</span>
            </div>
            <div class="h-2 rounded-full bg-border overflow-hidden">
              <div class="h-full rounded-full stat-bar-fill" style="width:${popBarPct}%;background:${popBarCol}"></div>
            </div>
          </div>
          <!-- Elo impact row -->
          <div class="flex gap-3 flex-wrap">
            <div class="flex-1 rounded-xl border px-3 py-2.5 text-center"
              style="background:${popDelta >= 0 ? 'var(--surface-green)' : 'var(--surface-red)'};border-color:${popDelta >= 0 ? (isDark() ? 'rgba(74,222,128,0.35)' : '#bbf7d0') : (isDark() ? 'rgba(248,113,113,0.35)' : '#fecaca')}">
              <p class="text-[10px] font-bold uppercase tracking-wider mb-1" style="color:${popDelta >= 0 ? (isDark() ? '#4ade80' : '#15803d') : (isDark() ? '#f87171' : '#dc2626')}">${popDelta >= 0 ? '📈 Hype Boost' : '📉 Hype Penalty'}</p>
              <p class="text-xl font-black" style="color:${popDelta >= 0 ? (isDark() ? '#4ade80' : '#15803d') : (isDark() ? '#f87171' : '#dc2626')}">${popDelta >= 0 ? '+' : ''}${(popDelta / (r.baseStrength || 1) * 100).toFixed(1)}% Elo</p>
            </div>
          </div>
          <!-- Player popularity breakdown -->
          <div class="mt-3 flex flex-col gap-1.5">
            ${[...Object.entries(S.roster)].filter(([,p]) => p).map(([pos, p]) => {
              const pop     = p.popularity ?? 50;
              const pct     = Math.max(0, Math.round(((pop - 35) / 65) * 100));
              const barCol  = pop >= 80 ? (isDark() ? '#60a5fa' : '#2563eb') : pop >= 60 ? (isDark() ? '#fbbf24' : '#d97706') : (isDark() ? '#cbd5e1' : '#94a3b8');
              return `<div class="flex items-center gap-2">
                <span class="text-[10px] font-black w-6 flex-shrink-0 text-muted-fg">${pos}</span>
                <span class="text-xs font-semibold text-foreground w-28 flex-shrink-0 truncate">${p.name}</span>
                <div class="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                  <div class="h-full rounded-full" style="width:${pct}%;background:${barCol}"></div>
                </div>
                <span class="text-[10px] font-bold text-muted-fg w-9 text-right flex-shrink-0">${pop}M</span>
              </div>`;
            }).join('')}
          </div>
        </div>
        ${seasonLeadersCard}
        <div class="rounded-2xl border border-border bg-white p-4 card-shadow">
          <p class="text-xs font-bold uppercase tracking-widest text-muted-fg mb-4">Team Statistics</p>
          <div class="flex flex-col gap-3">
            ${(() => { const t = r.simTotals || r.totals; return `
            ${statBar('ppg', 'Points Per Game',   t.ppg)}
            ${statBar('rpg', 'Rebounds Per Game', t.rpg)}
            ${statBar('apg', 'Assists Per Game',  t.apg)}
            ${statBar('spg', 'Steals Per Game',   t.spg)}
            ${statBar('bpg', 'Blocks Per Game',   t.bpg)}`; })()}
          </div>
        </div>
        <div class="rounded-2xl border border-border bg-white p-4 card-shadow">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs font-bold uppercase tracking-widest text-muted-fg">Optimized Lineup</p>
            ${r.lineupAssignment?.length === 5 ? (() => {
              const allPrimary = r.lineupAssignment.every(a => a.fit === 'primary');
              const hasOOP     = r.lineupAssignment.some(a => a.fit === 'oop');
              const bg    = allPrimary ? (isDark() ? 'rgba(34,197,94,0.12)' : '#f0fdf4') : (isDark() ? 'rgba(234,179,8,0.12)' : '#fefce8');
              const color = allPrimary ? (isDark() ? '#4ade80' : '#15803d') : (isDark() ? '#fbbf24' : '#a16207');
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
        </div>
        <!-- ── Action buttons ────────────────────────────────────────── -->
        <div class="grid grid-cols-2 gap-3">
          ${S.mode === 'daily'
            ? `<button data-action="back-to-menu" class="py-3 rounded-xl font-bold text-sm border border-border bg-white text-foreground hover:border-primary hover:bg-card2 transition-all cursor-pointer card-shadow">
            Back to Menu
          </button>`
            : `<button data-action="restart" class="py-3 rounded-xl font-bold text-sm border border-border bg-white text-foreground hover:border-primary hover:bg-card2 transition-all cursor-pointer card-shadow">
            Build Another
          </button>`}
          <button data-action="share" class="py-3 rounded-xl font-bold text-sm border border-border bg-white text-foreground hover:border-primary hover:bg-card2 transition-all cursor-pointer card-shadow">
            Share Result
          </button>
        </div>

        ${r.newLegends > 0 ? (() => {
          const { total } = getLegendCatalog();
          const have = getCollectedLegends().size;
          return `
          <button data-action="view-legends"
            class="w-full rounded-2xl border cursor-pointer transition-all hover:bg-indigo-100 card-shadow flex items-center gap-3 px-4 py-3 text-left"
            style="border-color:#c7d2fe;background:var(--surface-indigo)">
            <span class="text-2xl flex-shrink-0">🃏</span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-black text-indigo-700">+${r.newLegends} new legend${r.newLegends === 1 ? '' : 's'} collected!</p>
              <p class="text-xs text-indigo-500 mt-0.5">${have}/${total} all-time legends in your collection · tap to view</p>
            </div>
            <span class="text-indigo-400 flex-shrink-0">›</span>
          </button>`;
        })() : ''}
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
    const record = `${r.wins}–${r.losses}${S.globalSubmittedChampion ? ' · 🏆 Champion' : ''}`;
    return `
    <div class="rounded-2xl border p-4 card-shadow" style="border-color:${isDark() ? 'rgba(74,222,128,0.35)' : '#bbf7d0'};background:var(--surface-green)">
      <div class="flex items-start gap-3 mb-3">
        <span class="text-2xl flex-shrink-0">✅</span>
        <div class="flex-1 min-w-0">
          <p class="font-black text-sm text-green-700">Submitted!</p>
          <p class="text-xs text-green-600 mt-0.5">"${esc(S.teamName)}" &nbsp;·&nbsp; ${record}</p>
          <p class="text-[10px] text-green-600 mt-0.5">Personal leaderboard · Global board 🌍</p>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button data-action="open-leaderboard"
          class="py-2.5 rounded-xl font-bold text-sm border border-emerald-300 bg-white text-green-700 hover:bg-emerald-50 transition-all cursor-pointer">
          Personal 🏅
        </button>
        <button data-action="open-global-leaderboard"
          class="py-2.5 rounded-xl font-bold text-sm border border-emerald-300 bg-white text-green-700 hover:bg-emerald-50 transition-all cursor-pointer">
          Global 🌍
        </button>
      </div>
    </div>`;
  }

  const label    = champion ? 'Submit Championship Run' : 'Submit Season Record';
  const subLabel = champion ? 'Your championship goes on the global board' : 'Share your season results with the world';
  const errorHtml = S.globalSubmitError
    ? `<p class="text-xs text-red-500 mt-2">⚠️ ${esc(S.globalSubmitError)}
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
          value="${esc(S.teamName || '')}"
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
    <p class="text-[10px] text-muted-fg mt-2">Saves to your personal leaderboard and global board · max 30 characters</p>
  </div>`;
}

// ── Playoffs ──────────────────────────────────────────────────────────────────

function renderBracketTeam(team, seed, score, won, isLive) {
  if (!team) {
    return `<div class="bracket-team bracket-team--tbd"><span class="bracket-team__seed">—</span><span class="bracket-team__name">TBD</span></div>`;
  }
  const isPlayer = team.isPlayer;
  const cls = [
    'bracket-team',
    isPlayer ? 'bracket-team--player' : '',
    won === true  ? 'bracket-team--won'  : '',
    won === false ? 'bracket-team--lost' : '',
    isLive        ? 'bracket-team--live' : '',
  ].filter(Boolean).join(' ');
  const scoreHtml = score !== null && score !== undefined
    ? `<span class="bracket-team__score">${score}</span>` : '';
  return `
  <div class="${cls}">
    <span class="bracket-team__seed">${seed ?? '·'}</span>
    <span class="bracket-team__name">${isPlayer ? '⭐ ' : ''}${team.name}</span>
    ${scoreHtml}
  </div>`;
}

function renderBracketMatchup(top, bottom, opts = {}) {
  const { topSeed, bottomSeed, topScore, bottomScore, topWon, live } = opts;
  const topWonState    = topWon === null ? null : topWon;
  const bottomWonState = topWon === null ? null : !topWon;
  return `
  <div class="bracket-matchup${live ? ' bracket-matchup--live' : ''}">
    ${renderBracketTeam(top, topSeed, topScore, topWonState, live)}
    ${renderBracketTeam(bottom, bottomSeed, bottomScore, bottomWonState, live)}
  </div>`;
}

function renderPlayoffBracketTree(po) {
  const { qf, sf, finals, champion } = getBracketDisplayState(po);
  const roundLabels = ['Quarterfinals', 'Semifinals', 'Finals'];

  return `
  <div class="playoff-bracket-wrap">
    <div class="playoff-bracket" role="img" aria-label="NBA Playoff bracket">
      <div class="playoff-bracket__col playoff-bracket__col--qf">
        <p class="playoff-bracket__round-label">${roundLabels[0]}</p>
        <div class="playoff-bracket__stack">
          ${qf.map((m, i) => `
          <div class="bracket-matchup-wrap bracket-matchup-wrap--qf${i}">
            ${renderBracketMatchup(m.top, m.bottom, {
              topSeed: m.topSeed, bottomSeed: m.bottomSeed,
              topScore: m.topScore, bottomScore: m.bottomScore,
              topWon: m.complete || m.live ? m.topWon : null,
              live: m.live,
            })}
          </div>`).join('')}
        </div>
      </div>
      <div class="playoff-bracket__col playoff-bracket__col--sf">
        <p class="playoff-bracket__round-label">${roundLabels[1]}</p>
        <div class="playoff-bracket__stack playoff-bracket__stack--sf">
          ${sf.map((m, i) => `
          <div class="bracket-matchup-wrap bracket-matchup-wrap--sf${i}">
            ${renderBracketMatchup(m.top, m.bottom, {
              topScore: m.topScore, bottomScore: m.bottomScore,
              topWon: m.complete || m.live ? m.topWon : null,
              live: m.live,
            })}
          </div>`).join('')}
        </div>
      </div>
      <div class="playoff-bracket__col playoff-bracket__col--f">
        <p class="playoff-bracket__round-label">${roundLabels[2]}</p>
        <div class="playoff-bracket__stack playoff-bracket__stack--f">
          <div class="bracket-matchup-wrap bracket-matchup-wrap--f">
            ${renderBracketMatchup(finals.top, finals.bottom, {
              topScore: finals.topScore, bottomScore: finals.bottomScore,
              topWon: finals.complete || finals.live ? finals.topWon : null,
              live: finals.live,
            })}
          </div>
        </div>
      </div>
      <div class="playoff-bracket__col playoff-bracket__col--champ">
        <p class="playoff-bracket__round-label">Champion</p>
        <div class="bracket-champion${champion ? ' bracket-champion--filled' : ''}">
          ${champion
            ? `<span class="bracket-champion__icon">🏆</span><span class="bracket-champion__name">${champion.isPlayer ? '⭐ ' : ''}${champion.name}</span>`
            : `<span class="bracket-champion__placeholder">?</span>`}
        </div>
      </div>
    </div>
  </div>`;
}

function renderPlayoffs() {
  const po = S.playoffs;
  const r  = S.result;
  if (po.currentRound >= 3 && !po.pendingReveal) {
    return po.champion ? renderChampionship() : renderEliminated();
  }

  const ts     = po.tickState;
  // "Simulate Entire Playoffs" resolves the whole tournament at once — hold
  // on the fully-filled bracket so the result is visible before handing off
  // to the champion/eliminated splash screen.
  const reveal = po.pendingReveal;
  const roundName = po.roundNames[Math.min(po.currentRound, po.roundNames.length - 1)];
  const simLabel   = ts ? 'Simulating...' : `Simulate ${roundName}`;
  const headline   = reveal
    ? (po.champion
        ? '🏆 World Champions!'
        : po.championTeam
          ? `🏆 ${po.championTeam.name} Win the Title`
          : `💔 Eliminated — ${po.eliminatedIn}`)
    : 'Playoff Bracket';
  const champBanner = reveal && po.championTeam && !po.champion ? `
        <div class="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-center card-shadow">
          <p class="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1">NBA Champion</p>
          <p class="text-xl font-black text-amber-700">🏆 ${po.championTeam.name}</p>
          <p class="text-xs text-muted-fg mt-1">Your run ended in the ${po.eliminatedIn || 'playoffs'}</p>
        </div>` : '';

  return `
  <div class="min-h-screen flex flex-col main-gradient">
    ${renderHeader(false)}
    <main class="flex-1 flex flex-col items-center px-4 py-6">
      <div class="w-full max-w-3xl flex flex-col gap-4">
        <div class="text-center">
          <p class="text-xs font-bold uppercase tracking-widest text-primary mb-1">NBA Playoffs</p>
          <h1 class="text-2xl font-black text-foreground">${headline}</h1>
          <p class="text-sm text-muted-fg mt-1">Regular Season: ${r.wins}–${r.losses} · Seed #${po.playerSeed}</p>
        </div>
        <div class="rounded-2xl border border-border bg-white p-3 sm:p-4 card-shadow overflow-hidden">
          ${renderPlayoffBracketTree(po)}
        </div>
        ${champBanner}
        <div class="flex flex-col gap-2">
          ${reveal ? `
          <button data-action="playoffs-continue" type="button"
            class="py-3.5 rounded-xl font-black text-sm transition-all text-center card-shadow bg-primary text-white hover:bg-blue-700 cursor-pointer">
            ${po.champion ? 'Continue to Championship 🏆' : 'Continue →'}
          </button>` : `
          <button data-action="sim-next-round" type="button" ${ts || po.currentRound >= 3 ? 'disabled' : ''}
            class="py-3.5 rounded-xl font-black text-sm transition-all text-center card-shadow ${ts || po.currentRound >= 3 ? 'bg-card2 border border-border text-muted-fg cursor-not-allowed' : 'bg-primary text-white hover:bg-blue-700 cursor-pointer'}">
            ${ts ? 'Simulating...' : `${simLabel} →`}
          </button>
          <button data-action="sim-all-playoffs" type="button" ${ts || po.currentRound >= 3 ? 'disabled' : ''}
            class="py-3.5 rounded-xl font-bold text-sm transition-all text-center card-shadow border-2 border-primary/30 bg-white text-primary hover:bg-blue-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            Simulate Entire Playoffs →
          </button>`}
          <button data-action="draft-new-roster" type="button"
            class="py-3 rounded-xl font-bold text-sm border border-border bg-white text-foreground hover:border-primary hover:bg-card2 transition-all cursor-pointer text-center card-shadow">
            Draft New Roster
          </button>
        </div>
      </div>
    </main>
    ${renderFooter()}
  </div>`;
}

function renderChampionship() {
  const po = S.playoffs;
  const r  = S.result;
  const roundSummary = po.rounds.map((round, i) => {
    const sr = round.find(s => s.teamA.isPlayer || s.teamB.isPlayer);
    if (!sr) return '';
    const opp = sr.teamA.isPlayer ? sr.teamB : sr.teamA;
    const w   = sr.teamA.isPlayer ? sr.playerWins : sr.oppWins;
    const l   = sr.teamA.isPlayer ? sr.oppWins   : sr.playerWins;
    const isFinals = i === po.rounds.length - 1;
    const line = `${po.roundNames[i]}: <span class="text-foreground font-semibold">def. ${opp.name} ${w}–${l}</span>`;
    return isFinals
      ? `<p class="text-base font-black text-amber-700 mt-1">${line}</p>`
      : `<p class="text-sm text-muted-fg">${line}</p>`;
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
        ${po.championTeam ? `
        <div class="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 w-full text-center card-shadow">
          <p class="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1">NBA Champion</p>
          <p class="text-xl font-black text-amber-700">🏆 ${po.championTeam.name}</p>
        </div>` : ''}
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
  try { trophies = JSON.parse(cgGetItem('nba820_trophies') || '[]'); } catch (e) {}

  // Twelve pedestals — the empty ones are the hook.
  const PEDESTALS = 12;
  const pedestalGrid = `
    <div class="rounded-2xl bg-white p-4 card-shadow border border-border">
      <div class="flex items-center justify-between mb-3">
        <p class="text-xs font-bold uppercase tracking-widest text-muted-fg">Banners Raised</p>
        <span class="text-xs font-black" style="color:${isDark() ? '#fbbf24' : '#d97706'}">${trophies.length} / ${PEDESTALS}</span>
      </div>
      <div class="grid grid-cols-4 sm:grid-cols-6 gap-2">
        ${Array.from({ length: PEDESTALS }, (_, i) => {
          const t = trophies[i];
          if (!t) return `
          <div class="rounded-xl flex flex-col items-center justify-center py-3 gap-1" style="border:1.5px dashed var(--border)">
            <span class="text-xl" style="opacity:0.15;filter:grayscale(1)">🏆</span>
            <span class="text-[8px] font-bold uppercase" style="color:var(--muted)">Empty</span>
          </div>`;
          const perfect = t.wins === 82;
          return `
          <div class="rounded-xl flex flex-col items-center justify-center py-3 gap-1 ${perfect ? 'perfect-glow' : 'card-shadow'}"
            style="background:${perfect ? '#fffbeb' : 'var(--card3)'};border:1.5px solid ${perfect ? '#fcd34d' : 'var(--border)'}">
            <span class="text-xl">🏆</span>
            <span class="text-[9px] font-black" style="color:${perfect ? (isDark() ? '#fcd34d' : '#b45309') : 'var(--fg)'}">${t.wins}–${t.losses}</span>
          </div>`;
        }).join('')}
      </div>
      ${trophies.length === 0
        ? `<p class="text-xs text-muted-fg text-center mt-3">Twelve pedestals. Zero banners. Win the Finals to raise your first.</p>`
        : ''}
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
          ${t.bench ? `
          <div>
            <p class="text-[10px] font-bold uppercase tracking-widest text-muted-fg mb-1">Bench</p>
            <p class="text-xs text-foreground leading-relaxed">${t.bench}</p>
          </div>` : ''}
        </div>
        <div class="flex items-center justify-between border-t ${isPerfect ? 'border-amber-200' : 'border-border'} pt-2.5">
          <p class="text-xs text-muted-fg">Team Chemistry</p>
          <p class="text-xs font-bold ${isPerfect ? 'text-amber-600' : 'text-primary'}">${chemTier(t.chemScore).label}</p>
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
            <h1 class="text-2xl font-black text-foreground">Trophy Room</h1>
          </div>
          <button data-action="back-to-menu"
            class="flex-shrink-0 text-[11px] px-3 py-1.5 rounded-full border border-border bg-card2 text-muted-fg hover:text-foreground hover:border-primary transition-all cursor-pointer">
            ← Main Menu
          </button>
        </div>
        ${pedestalGrid}
        ${(() => {
          const { total } = getLegendCatalog();
          const collected = getCollectedLegends().size;
          const pct = total ? Math.round((collected / total) * 100) : 0;
          return `
          <button data-action="view-legends"
            class="w-full rounded-2xl border border-indigo-200 bg-indigo-50 cursor-pointer transition-all hover:bg-indigo-100 card-shadow overflow-hidden text-left">
            <div class="flex items-center gap-2.5 px-4 py-3">
              <span class="text-lg flex-shrink-0">🃏</span>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-bold text-indigo-700">Legends Collected · ${collected}/${total}</p>
                <div class="mt-1 h-1.5 rounded-full overflow-hidden" style="background:#e0e7ff">
                  <div class="h-full rounded-full" style="width:${pct}%;background:#6366f1"></div>
                </div>
              </div>
              <span class="text-xs font-black text-indigo-400 flex-shrink-0">${pct}% ›</span>
            </div>
          </button>`;
        })()}
        ${trophies.length > 0 ? `<div class="flex flex-col gap-4">${trophyCards}</div>` : ''}
      </div>
    </main>
    ${renderFooter()}
  </div>`;
}

// ── 1v1 Series Result screen ──────────────────────────────────────────────────
function renderSeriesResult() {
  const labels = seriesLabels();
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
  const loserLabel  = p1Win ? labels.p2 : labels.p1;
  const winnerLabel = p1Win ? labels.p1 : labels.p2;
  // seriesLabels() uses 'You' (2nd person) for the human side in GM vs AI /
  // Dynasty Duel — "You Wins the Series!" doesn't agree; every other label
  // ('Player 1', 'AI GM', a dynasty name) is 3rd person and takes "Wins".
  const winnerVerb  = winnerLabel === 'You' ? 'Win' : 'Wins';

  const gameChips = series.games.map((g, i) => {
    const p1Won = g === 'W';
    return `<div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2"
      style="background:${p1Won ? '#eff6ff' : '#fffbeb'};color:${p1Won ? '#2563eb' : '#d97706'};border-color:${p1Won ? '#bfdbfe' : '#fde68a'}">
      ${p1Won ? labels.p1Short : labels.p2Short}</div>`;
  }).join('');

  const p1CoachId = S.p1Coach || S.p1?.coach;
  // No fallback to S.coach here — in Dynasty Duel S.coach is the PLAYER's
  // coach and S.p2Coach is deliberately null (the CPU dynasty has no coach
  // card), so falling back printed the player's own coach under the
  // dynasty's roster column.
  const p1Coach   = COACHES.find(c => c.id === p1CoachId);
  const p2Coach   = COACHES.find(c => c.id === S.p2Coach);

  const rosterMini = (roster, positions) => positions.map(pos => {
    const p = roster[pos];
    if (!p) return '';
    return `<div class="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
      <span class="text-[10px] font-black text-muted-fg w-6 flex-shrink-0">${pos}</span>
      <span class="text-xs font-semibold text-foreground flex-1 truncate">${p.name}</span>
      <span class="text-[10px] text-muted-fg">${fmtPG(p.ppg)}pt</span>
    </div>`;
  }).join('');

  const chemBadge = (chemScore) => {
    const tier = chemTier(chemScore);
    const { color: c, bg } = chemTierColors(tier.id, false);
    return `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full border" style="color:${c};background:${bg};border-color:${c}30">${tier.label}</span>`;
  };

  // Fire confetti for the winner — once per series, not on every re-render
  // of this screen (e.g. a theme toggle would otherwise replay it). In
  // GM vs AI / Dynasty Duel, p1 is always the human — a p2 win there is a
  // loss for the player, so confetti must not fire (it previously fired
  // regardless of winner, celebrating the AI GM/dynasty beating you). 1v1
  // has no CPU side, so either winner is a real human win worth celebrating.
  const isVsCpu       = S.mode === 'gm-ai' || S.mode === 'dynasty-duel';
  const shouldCelebrate = !isVsCpu || p1Win;
  if (!S.seriesConfettiFired) {
    S.seriesConfettiFired = true;
    if (shouldCelebrate) {
      setTimeout(() => {
      withConfetti(() => confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, zIndex: 40, colors: p1Win ? ['#2563eb','#93c5fd','#ffffff'] : ['#d97706','#fde68a','#ffffff'] }));
      }, 150);
    }
  }

  const loserGames = p1Win ? p2Wins : p1Wins;
  const fightLine = loserGames === 0
    ? `${loserLabel} ${seriesAgree(loserLabel, 'was', 'were')} swept — couldn't steal a game.`
    : `${loserLabel} put up a fight — ${loserGames} ${loserGames === 1 ? 'game' : 'games'} won.`;

  return `
  <div class="flex flex-col min-h-screen main-gradient">
    ${renderHeader(false)}
    <main class="flex-1 flex flex-col items-center px-4 py-6">
      <div class="w-full max-w-2xl flex flex-col gap-4 animate-fade-up">

        <!-- Winner banner -->
        <div class="rounded-2xl border-2 p-6 text-center card-shadow" style="border-color:${winnerColor}40;background:${winnerBg}">
          <p class="text-[10px] font-bold uppercase tracking-widest text-muted-fg mb-2">Series Result</p>
          <p class="text-5xl font-black mb-2" style="color:${winnerColor}">${p1Wins}–${p2Wins}</p>
          <p class="text-lg font-black text-foreground mb-1">🏆 ${winnerLabel} ${winnerVerb} the Series!</p>
          <p class="text-sm text-muted-fg">${fightLine}</p>
        </div>

        <!-- Game-by-game log -->
        <div class="rounded-2xl border border-border bg-white p-4 card-shadow">
          <p class="text-xs font-bold uppercase tracking-widest text-muted-fg mb-3">Game-by-Game</p>
          <div class="flex gap-2 flex-wrap">${gameChips}</div>
          <div class="flex gap-4 mt-3 text-xs text-muted-fg">
            <span><span class="font-bold" style="color:#2563eb">${labels.p1Short}</span> = ${labels.p1} won that game</span>
            <span><span class="font-bold" style="color:#d97706">${labels.p2Short}</span> = ${labels.p2} won that game</span>
          </div>
        </div>

        <!-- Roster comparison -->
        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-2xl border p-4 card-shadow" style="border-color:#bfdbfe;background:var(--surface-sky)">
            <div class="flex items-center justify-between mb-3">
              <p class="text-xs font-bold uppercase tracking-widest" style="color:#2563eb">${labels.p1}</p>
              ${chemBadge(p1s.chemScore)}
            </div>
            ${p1Coach ? `<p class="text-[10px] text-muted-fg mb-2 font-medium">Coach: ${p1Coach.name}</p>` : ''}
            <p class="text-[10px] font-bold uppercase tracking-wider text-muted-fg/60 mb-1">Starting 5</p>
            ${rosterMini(S.p1Roster || S.p1?.roster || {}, ['PG','SG','SF','PF','C'])}
          </div>
          <div class="rounded-2xl border p-4 card-shadow" style="border-color:#fde68a;background:var(--surface-cream)">
            <div class="flex items-center justify-between mb-3">
              <p class="text-xs font-bold uppercase tracking-widest" style="color:#d97706">${labels.p2}</p>
              ${chemBadge(p2s.chemScore)}
            </div>
            ${p2Coach ? `<p class="text-[10px] text-muted-fg mb-2 font-medium">Coach: ${p2Coach.name}</p>` : ''}
            <p class="text-[10px] font-bold uppercase tracking-wider text-muted-fg/60 mb-1">Starting 5</p>
            ${S.mode === 'dynasty-duel'
              ? `<p class="text-xs text-muted-fg py-2">Legendary ${labels.p2} — strength ${p2s.strength.toFixed(2)}</p>`
              : rosterMini(S.p2Roster || S.roster, ['PG','SG','SF','PF','C'])}
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
                <div class="flex justify-between text-xs mb-1"><span class="font-bold" style="color:#2563eb">${labels.p1}</span><span class="font-semibold text-foreground">${p1s.strength.toFixed(3)}</span></div>
                <div class="h-2.5 rounded-full bg-border overflow-hidden"><div class="h-full rounded-full" style="width:${p1pct}%;background:#2563eb"></div></div>
              </div>
              <div>
                <div class="flex justify-between text-xs mb-1"><span class="font-bold" style="color:#d97706">${labels.p2}</span><span class="font-semibold text-foreground">${p2s.strength.toFixed(3)}</span></div>
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
  const labels = seriesLabels();
  const sr   = S.seriesResult;
  const p1s  = sr.p1Season;
  const p2s  = sr.p2Season;
  const p1CoachObj = COACHES.find(c => c.id === S.p1Coach);
  const p2CoachObj = COACHES.find(c => c.id === S.p2Coach);
  const isDynasty = S.mode === 'dynasty-duel';
  const maxStr  = Math.max(p1s.strength, p2s.strength, 0.01);
  const p1pct   = Math.round((p1s.strength / maxStr) * 100);
  const p2pct   = Math.round((p2s.strength / maxStr) * 100);

  const rosterMini = (roster, color) => ALL_POSITIONS.map(pos => {
    const p = roster[pos];
    return `<div class="flex items-center gap-1.5 py-1 border-b border-border last:border-0">
      <span class="text-[10px] font-black w-5 flex-shrink-0" style="color:${p ? color : '#cbd5e1'}">${pos}</span>
      <span class="text-xs font-semibold flex-1 truncate ${p ? 'text-foreground' : 'text-muted-fg/40'}">${p ? p.name : '—'}</span>
      ${p ? `<span class="text-[10px] text-muted-fg">${fmtPG(p.ppg)}pt</span>` : ''}
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
                <span class="font-bold" style="color:#2563eb">${labels.p1}${p1CoachObj ? ` · ${p1CoachObj.name}` : ''}</span>
                <span class="font-semibold text-foreground">${p1s.strength.toFixed(3)}</span>
              </div>
              <div class="h-2.5 rounded-full bg-border overflow-hidden">
                <div class="h-full rounded-full stat-bar-fill" style="width:${p1pct}%;background:#2563eb"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="font-bold" style="color:#d97706">${labels.p2}${p2CoachObj ? ` · ${p2CoachObj.name}` : ''}</span>
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
            <p class="text-xs font-black uppercase tracking-wider mb-2" style="color:#2563eb">${labels.p1}</p>
            ${rosterMini(S.p1Roster || S.roster, '#2563eb')}
          </div>
          <div class="rounded-2xl border-2 bg-white p-3 card-shadow" style="border-color:#fde68a">
            <p class="text-xs font-black uppercase tracking-wider mb-2" style="color:#d97706">${labels.p2}</p>
            ${isDynasty
              ? `<p class="text-xs text-muted-fg leading-relaxed py-2">Legendary CPU dynasty. Strength ${p2s.strength.toFixed(2)}.</p>`
              : rosterMini(S.p2Roster, '#d97706')}
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
  const labels   = seriesLabels();
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
    statusColor = 'var(--muted-fg)'; statusBg = 'var(--card3)'; statusBdr = 'var(--border)';
  } else if (seriesOver) {
    const w = p1Wins === 4 ? labels.p1 : labels.p2;
    const wc = p1Wins === 4 ? '#2563eb' : '#d97706';
    statusText  = `🏆 ${w} ${seriesAgree(w, 'wins', 'win')} the series ${p1Wins}–${p2Wins}!`;
    statusColor = wc; statusBg = p1Wins === 4 ? '#eff6ff' : '#fffbeb'; statusBdr = wc + '40';
  } else if (p1Wins === p2Wins) {
    statusText  = `Series tied ${p1Wins}–${p2Wins}`;
    statusColor = 'var(--muted-fg)'; statusBg = 'var(--card3)'; statusBdr = 'var(--border)';
  } else {
    const leader = p1Wins > p2Wins ? labels.p1 : labels.p2;
    const lc     = p1Wins > p2Wins ? '#2563eb' : '#d97706';
    const lw = Math.max(p1Wins, p2Wins), ll = Math.min(p1Wins, p2Wins);
    statusText  = `${leader} ${seriesAgree(leader, 'leads', 'lead')} ${lw}–${ll}`;
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
    const wlbl  = p1Won ? `${labels.p1Short} W` : `${labels.p2Short} W`;
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
            <p class="text-[10px] font-bold uppercase tracking-widest mb-1" style="color:#2563eb">${labels.p1}</p>
            <p class="text-5xl font-black" style="color:#2563eb">${p1Wins}</p>
            <p class="text-[10px] text-muted-fg mt-1">${p1Wins === 1 ? 'win' : 'wins'}</p>
          </div>
          <div class="rounded-2xl border-2 p-4 text-center card-shadow" style="border-color:${p2Wins > p1Wins ? '#d97706' : '#fde68a'};background:${p2Wins > p1Wins ? '#fffbeb' : '#fffef8'}">
            <p class="text-[10px] font-bold uppercase tracking-widest mb-1" style="color:#d97706">${labels.p2}</p>
            <p class="text-5xl font-black" style="color:#d97706">${p2Wins}</p>
            <p class="text-[10px] text-muted-fg mt-1">${p2Wins === 1 ? 'win' : 'wins'}</p>
          </div>
        </div>

        <!-- Scoreboard -->
        <div class="rounded-2xl border border-border bg-white p-4 card-shadow">
          <div class="flex items-center justify-between mb-3">
            <p class="text-[10px] font-bold uppercase tracking-widest text-muted-fg">Scoreboard</p>
            <div class="flex gap-3 text-[10px] font-bold text-muted-fg">
              <span style="color:#2563eb">${labels.p1Short}</span>
              <span style="color:#d97706">${labels.p2Short}</span>
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

// Phases where the player is actively drafting/simulating, as opposed to a
// menu or a results/summary screen — drives the CrazyGames gameplayStart/Stop
// calls so their platform knows when it's safe to show an ad.
const CG_GAMEPLAY_PHASES = new Set(['drafting', 'season-sim', 'playoffs', 'series-sim']);
let _cgGameplayActive = null;

function updateCrazyGamesGameplayState() {
  const active = CG_GAMEPLAY_PHASES.has(S.phase);
  if (active === _cgGameplayActive) return;
  _cgGameplayActive = active;
  if (active) cgGameplayStart(); else cgGameplayStop();
}

// CrazyGames' SDK can leave a full-screen "A midgame ad would appear here"
// placeholder node sitting directly in <body> (a dev-mode stub — our own
// code never renders that text; cgRequestMidgameAd() exists but isn't wired
// up anywhere yet). Since it's appended outside #app, replacing #app's
// innerHTML on every render doesn't clear it, and if it's ever left
// visible/interactive it sits on top of results/playoffs and eats every
// click. Neutralize it defensively on each render — cheap (body has only a
// handful of top-level children) and can't touch our own markup since #app
// is explicitly skipped.
function neutralizeStaleAdStubs() {
  for (const el of document.body.children) {
    if (el.id === 'app' || el.id === 'loading-overlay') continue;
    if ((el.textContent || '').includes('midgame ad would appear here')) {
      el.style.pointerEvents = 'none';
      el.style.visibility    = 'hidden';
    }
  }
  // GD overlay: never let a hidden full-screen node keep pointer-events:auto.
  const gd = document.getElementById('gdsdk__advertisement');
  if (gd) {
    const vis = gd.style.visibility || getComputedStyle(gd).visibility;
    if (vis === 'hidden') gd.style.pointerEvents = 'none';
  }
}

/** Keep the URL hash in sync with the active phase so deep links aren't purely cosmetic. */
const HASH_BY_PHASE = {
  'mode-select':    '#/',
  'more-modes':     '#/challenges',
  'drafting':       '#/draft',
  'season-sim':     '#/season',
  'results':        '#/results',
  'playoffs':       '#/playoffs',
  'trophy-room':    '#/trophies',
  'legends':        '#/legends',
  'series-preview': '#/series',
  'series-sim':     '#/series',
  'series-result':  '#/series',
};

function syncHashRoute() {
  // Don't clobber an inbound deep link while sitting on the menu — main.js
  // dispatches hashchange after first paint to honor #/daily etc.
  if (S.phase === 'mode-select') {
    const inbound = (location.hash || '').replace(/^#\/?/, '');
    if (inbound && inbound !== '/') return;
  }
  const next = HASH_BY_PHASE[S.phase] || '#/';
  if (location.hash !== next) {
    try { history.replaceState(null, '', next); } catch (_) {}
  }
}

// ── Main render dispatcher ────────────────────────────────────────────────────
export function render() {
  updateCrazyGamesGameplayState();
  neutralizeStaleAdStubs();
  if      (S.phase === 'mode-select')   $app.innerHTML = renderModeSelect();
  else if (S.phase === 'more-modes')    $app.innerHTML = renderMoreModesScreen();
  else if (S.phase === 'drafting')      $app.innerHTML = renderDrafting();
  else if (S.phase === 'season-sim')    $app.innerHTML = renderSeasonSim();
  else if (S.phase === 'results')       $app.innerHTML = renderResults();
  else if (S.phase === 'playoffs')      $app.innerHTML = renderPlayoffs();
  else if (S.phase === 'trophy-room')   $app.innerHTML = renderTrophyRoom();
  else if (S.phase === 'legends')       $app.innerHTML = renderLegends();
  else if (S.phase === 'series-preview') $app.innerHTML = renderSeriesPreview();
  else if (S.phase === 'series-sim')    $app.innerHTML = renderSeriesSim();
  else if (S.phase === 'series-result') $app.innerHTML = renderSeriesResult();
  bindEvents();
  syncHashRoute();

  // Wire up character counter for the local save input (results screen)
  if (S.phase === 'results' && !S.runSaved) {
    const input   = document.getElementById('team-name-input');
    const counter = document.getElementById('team-name-counter');
    if (input && counter) {
      const update = () => { counter.textContent = 30 - input.value.length; };
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

  // Wire up character counter for the daily board submit input
  if (S.phase === 'results' && S.mode === 'daily' && !S.dailyScoreSubmitted) {
    const dInput   = document.getElementById('daily-team-name-input');
    const dCounter = document.getElementById('daily-team-name-counter');
    if (dInput && dCounter) {
      const update = () => { dCounter.textContent = 30 - dInput.value.length; };
      update();
      dInput.addEventListener('input', update);
    }
  }

  // Community pass-rate for Daily Challenge (mode select + daily results)
  if (
    S.phase === 'mode-select'
    || (S.phase === 'results' && S.mode === 'daily')
  ) {
    hydrateDailyCommunityStats();
  }
}
