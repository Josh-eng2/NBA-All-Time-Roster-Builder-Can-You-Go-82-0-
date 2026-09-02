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
  getUtcDateString, getPlayerSeed,
} from '../logic/state.js';
import { calculateChemistry, chemTier, chemTierColors }                             from '../logic/chemistry.js';
import { rosterFull, availableDecades, getLegendCatalog, getSkips, isPickDraftable } from '../logic/draft.js';
import { coachSystemProgress, COACH_BOOST_MAX }           from '../logic/simulation.js';
import { getBracketDisplayState }                         from '../logic/playoffs.js';
import { markReturning, getCollectedLegends, getDailyStatus, FANS_TEAM_MAX, FANS_PLAYER_MAX } from '../utils/storage.js';
import { cgGameplayStart, cgGameplayStop, cgGetItem }     from '../utils/crazygames.js';
import { gdRewardedAvailable }                            from '../utils/gamedistribution.js';
import { getDailyChallenge, checkRosterConstraint } from '../logic/challenge.js';
import { isDualDraft, isBlindDraft, seriesLabels, MORE_MODES, fansFirstScore } from '../logic/modes.js';
import { seasonTier, seasonGrade } from '../logic/seasonTier.js';
import { levelProgress, titleForLevel } from '../logic/progression.js';
import { fetchDailyCommunityStats, isFirebaseConfigured } from '../utils/firebase.js';
import { bindEvents, buildRematchCode, hasKnownHashRoute } from '../ui/events.js'; // circular — safe (called inside functions only)
import { installPromptKind }                              from '../utils/install.js';
import { isDark, ovrColor, fansBarCol }                   from '../ui/theme.js';
import { accountsEnabled, currentUserSync }               from '../utils/auth.js';

// Re-exported so the module's public surface is unchanged by the move of
// these ramps into ui/theme.js (see that file for why they moved).
export { ovrColor };

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
function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;
}

// The desktop redesign swaps in a different DOM for a few screens (the draft
// workspace's two columns, the results rail). Everything else is handled by
// css/desktop.css at the same breakpoint — keep the two in step.
const DESKTOP_MQ = '(min-width: 1024px)';
function isDesktopLayout() {
  return typeof window !== 'undefined' && window.matchMedia(DESKTOP_MQ).matches;
}

// Dragging the window across the breakpoint has to re-render, since nothing
// else triggers one and the desktop screens emit different markup.
if (typeof window !== 'undefined' && window.matchMedia) {
  const mq = window.matchMedia(DESKTOP_MQ);
  const onFlip = () => render();
  if (mq.addEventListener) mq.addEventListener('change', onFlip);
  else if (mq.addListener) mq.addListener(onFlip); // Safari < 14
}


// ── Team Overall ──────────────────────────────────────────────────────────────
/** Live team OVR for the drafting screen.
 *
 *  Deliberately the same quantity the simulation reports as `avgRating` —
 *  the mean of each starter's era-adjusted `overall` (see simulation.js). The
 *  sim is the source of truth; this only lets the gauge show the number
 *  before a season has been run, so the two never disagree. */
function calcTeamOverall(players) {
  const list = players.filter(Boolean);
  if (!list.length) return { ovr: null, count: 0, pct: 0 };
  const ovr = list.reduce((s, p) => s + (p.overall ?? 82), 0) / list.length;
  // 70–100 is the meaningful band on the `overall` scale (mean ≈87, sd ≈6.1),
  // so the arc spends its sweep where rosters actually differ.
  const pct = Math.max(0, Math.min(100, ((ovr - 70) / 30) * 100));
  return { ovr, count: list.length, pct };
}

/** Short qualitative descriptor under the OVR gauge. Mirrors ovrColor()'s
 *  tiers so the colour and the words never contradict each other. */
function ovrTierLabel(ovr) {
  if (ovr == null)  return 'No roster';
  if (ovr >= 97)    return 'All-Time';
  if (ovr >= 92)    return 'Elite Core';
  if (ovr >= 85)    return 'Solid Starters';
  return 'Role Players';
}

function fansTierFromAvg(avg) {
  // barCol paints the Fans gauge, which sits on a themed card, so it has to
  // follow the theme. This used to pass `false` unconditionally, so light-mode
  // slate was painted in dark mode too. (Only the drafting gauge reads this
  // field; the results cards call fansBarCol() directly, and the share image
  // in utils/storage.js keeps its own fixed-light copy for its white canvas.)
  if (!avg) return { tier: '', barCol: isDark() ? '#cbd5e1' : '#64748b' };
  return {
    tier:   avg >= 85 ? 'Superstar Lineup' : avg >= 70 ? 'Star Power' : avg >= 55 ? 'Solid Roster' : 'Under the Radar',
    barCol: fansBarCol(avg),
  };
}

/** Sum roster fans for UI. Boos Only daily caps the meter at maxPopTotal (300).
 *  Mode-gated like every other dailyChallenge read (placePlayer, the draft
 *  banner, the card dimming) so a challenge left on S can never rescale the
 *  gauge in a mode that isn't playing by its rules. */
function calcTeamFans(players) {
  const list = players.filter(Boolean);
  const sum  = list.reduce((s, p) => s + (p.popularity ?? 50), 0);
  const max  = (S.mode === 'daily' ? S.dailyChallenge?.params?.maxPopTotal : null) ?? FANS_TEAM_MAX;
  const pct  = Math.min(100, Math.round((sum / max) * 100));
  const avg  = list.length ? sum / list.length : 0;
  const { tier, barCol } = fansTierFromAvg(avg);
  return { sum, max, pct, avg, count: list.length, tier, barCol };
}

function themeIcon() {
  return isDark() ? '☀️' : '🌙';
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

/**
 * The account control, and the only chrome the account system adds.
 *
 * Renders nothing at all unless accounts are switched on AND this is the
 * first-party site — inside a portal embed there is deliberately no account
 * UI, so a player there sees exactly the header they see today.
 *
 * Three states, not two. `undefined` means the session is still restoring, and
 * it paints a neutral placeholder: flashing "Sign in" at somebody who is
 * already signed in is the classic visible bug in this pattern, and it lasts
 * just long enough to be noticed.
 *
 * @param {string} cls  the pill classes for whichever header is asking
 * @param {{ signedInOnly?: boolean }} [opts]  the in-game header passes true:
 *   during a draft a signed-in player still gets their account, but nobody is
 *   ever invited to sign in mid-run. Never interrupt the thing they came for.
 */
function accountPillHtml(cls, { signedInOnly = false } = {}) {
  if (!accountsEnabled()) return '';
  const user = currentUserSync();
  if (user === undefined) {
    return signedInOnly ? ''
      : `<span class="${cls} account-pill account-pill--pending" aria-hidden="true">·</span>`;
  }
  if (!user) {
    return signedInOnly ? ''
      : `<button data-action="open-auth" type="button" class="${cls} account-pill"
          title="Sign in" aria-label="Sign in">Sign in</button>`;
  }
  const initial = (user.email || '?').trim().charAt(0).toUpperCase();
  return `<button data-action="open-account" type="button" class="${cls} account-pill account-pill--in"
    title="${esc(user.email || 'Your account')}" aria-label="Your account">${esc(initial)}</button>`;
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
    // role="option" + aria-selected: the panel declares role="listbox", and a
    // listbox whose children aren't options exposes nothing to a screen reader
    // — the selected era was unannounced and the rows read as loose buttons.
    return `
    <button data-action="${action}" role="option" aria-selected="${selected}"
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

  // Daily Challenge is one attempt — never offer Restart mid-run, because
  // Restart would re-roll the run. Dynasty Duel is unlimited; Restart is fine.
  //
  // Leaving, however, is not re-rolling, and Daily used to offer neither: its
  // draft screen carried no Restart and no route to the menu, so a player who
  // opened the Daily to see what it was had no way back except reloading the
  // page. Nothing was being protected by that — markDailyPlayed only fires at
  // sim time, so abandoning mid-draft leaves nba820_daily_last unset and the
  // attempt intact, and the board is seeded from the UTC date, so coming back
  // deals the identical board. Daily therefore gets Menu where every other
  // mode gets Restart.
  const canRestart  = showRestart && S.mode !== 'daily';
  const canLeaveDaily = showRestart && S.mode === 'daily';
  const restartBtn = canRestart
    ? `<button data-action="restart" type="button" class="header-pill header-pill--muted header-pill--restart">Restart</button>`
    : canLeaveDaily
    ? `<button data-action="daily-to-menu" type="button" class="header-pill header-pill--muted header-pill--restart">Menu</button>`
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
        <!-- h1, not a div: this is the page's primary heading and the only
             one that survives into the rendered DOM. The loading-overlay h1
             is removed once players load and the <noscript> h1 never renders
             for crawlers (Googlebot executes JS), so without this the indexed
             page had no h1 at all. Text matches what's visible on screen. -->
        <h1 class="app-header__brand">
          ${iconBall('h-5 w-5 text-primary')}
          <span>82-0</span>
        </h1>
        <div class="app-header__actions">
          ${coachObj ? `<span class="header-pill header-pill--muted" title="${esc(coachObj.system)}"><span class="header-pill__text">${coachObj.system}</span></span>` : ''}
          ${eraPill}
          <button data-action="open-leaderboard" type="button" class="header-pill header-pill--icon" title="Personal Best" aria-label="Personal Best">🏅</button>
          <button data-action="open-global-leaderboard" type="button" class="header-pill header-pill--icon" title="Global Leaderboard" aria-label="Global Leaderboard">🌍</button>
          <button data-action="toggle-theme" type="button" class="header-pill header-pill--icon" title="Toggle Dark Mode" aria-label="Toggle Dark Mode">${themeIcon()}</button>
          ${accountPillHtml('header-pill header-pill--icon', { signedInOnly: true })}
          ${restartBtn}
        </div>
      </div>
    </header>
    <div class="sr-only" aria-live="polite" id="aria-live-status"></div>
    ${canRestart ? `
    <div class="mobile-restart-bar">
      <button data-action="restart" type="button" class="mobile-restart-bar__btn">↩ Restart Run</button>
    </div>` : canLeaveDaily ? `
    <div class="mobile-restart-bar">
      <button data-action="daily-to-menu" type="button" class="mobile-restart-bar__btn">← Menu</button>
    </div>` : ''}
    ${eraOverlay}
  </div>`;
}

/**
 * Legal line + Privacy link. Rendered on the mode-select screen only — it is
 * the entry point every player passes through, so the disclosure stays one
 * click from anywhere without repeating on all eleven screens. Do not add
 * this back to gameplay screens; it was removed from them deliberately.
 */
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

/**
 * Countdown to the next Daily Challenge. The board rolls at UTC midnight
 * (getUtcDateString is what getDailyStatus compares), so this counts to the
 * next 00:00Z rather than the viewer's local midnight.
 *
 * Rendered once per render() rather than ticking on a timer: the card is a
 * menu item, not a live clock, and an interval here would keep firing behind
 * every other screen. Rounding is deliberate — "in 7h 4m" reads better than a
 * second-accurate value that is stale the moment it paints.
 */
function timeToNextDaily(now = new Date()) {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const mins = Math.max(0, Math.ceil((next - now.getTime()) / 60000));
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
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
    <div class="w-full rounded-2xl bg-white px-3 py-2.5 flex items-center gap-2 mb-3 card-shadow border border-slate-100 home-card--daily">
      <span class="text-2xl flex-shrink-0">${ch.emoji}</span>
      <div class="flex-1 min-w-0">
        <p class="font-black text-sm text-foreground flex flex-wrap items-center gap-x-2 gap-y-1">Daily Challenge ${tick}</p>
        <p class="text-[11px] text-muted-fg mt-0.5 leading-snug">${ch.title}: you went <span style="color:#f97316;font-weight:700">${r.wins}–${r.losses}</span></p>
        <p class="text-[11px] mt-0.5 leading-snug" style="color:#f97316;font-weight:700">Next challenge in ${timeToNextDaily()}</p>
        ${renderCommunityStatsLine()}
      </div>
      <button data-action="open-daily-stats" class="text-[11px] font-bold px-2 py-1.5 rounded-lg border flex-shrink-0 cursor-pointer" style="border-color:var(--border);background:var(--card);color:var(--muted-fg)" title="Daily Challenge Stats">Stats</button>
      <button data-action="open-daily-leaderboard" class="text-[11px] font-bold px-2 py-1.5 rounded-lg border flex-shrink-0 cursor-pointer" style="border-color:var(--border);background:var(--card);color:var(--muted-fg)">Board</button>
    </div>`;
  }
  const community = renderCommunityStatsMerged();
  return `
  <div class="mb-3 home-daily-wrap">
    <button data-action="mode-daily"
      class="w-full rounded-2xl bg-white px-3 py-2 flex items-center gap-2 cursor-pointer card-shadow hover:shadow-md transition-all border border-slate-100 text-left home-card--daily">
      <span class="text-2xl flex-shrink-0" style="pointer-events:none">${ch.emoji}</span>
      <div class="flex-1 min-w-0" style="pointer-events:none">
        <p class="font-black text-sm flex flex-wrap items-center gap-x-2 gap-y-1" style="color:#f97316">Daily Challenge · ${ch.title}</p>
        <p class="text-[11px] text-muted-fg leading-snug mt-0.5">${ch.desc}${community}</p>
        <p class="text-[10px] text-muted-fg mt-0.5">One attempt per day · board locks after you play</p>
      </div>
      <span class="text-[11px] font-black px-3 py-1.5 rounded-lg flex-shrink-0 text-white" style="background:#f97316;pointer-events:none">Play →</span>
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
        <img src="82-0-logo.png" alt="82-0" class="mode-header__logo" style="height:52px;width:auto;margin-top:2px"/>
        <div class="flex items-center gap-1.5 justify-end mode-header__actions">
          <button data-action="open-daily-stats" class="text-[11px] px-2 py-1 rounded-full border border-border bg-card2 text-muted-fg hover:border-primary hover:text-primary transition-all cursor-pointer" title="Daily Challenge Stats" aria-label="Daily Challenge Stats">📊</button>
          <button data-action="open-leaderboard" class="text-[11px] px-2 py-1 rounded-full border border-border bg-card2 text-muted-fg hover:border-primary hover:text-primary transition-all cursor-pointer" title="Personal Best" aria-label="Personal Best">🏅</button>
          <button data-action="open-global-leaderboard" class="text-[11px] px-2 py-1 rounded-full border border-border bg-card2 text-muted-fg hover:border-primary hover:text-primary transition-all cursor-pointer" title="Global Leaderboard" aria-label="Global Leaderboard">🌍</button>
          <button data-action="toggle-theme" class="theme-toggle" title="Toggle Dark Mode" aria-label="Toggle Dark Mode">${themeIcon()}</button>
          ${accountPillHtml('text-[11px] px-2 py-1 rounded-full border border-border bg-card2 text-muted-fg hover:border-primary hover:text-primary transition-all cursor-pointer')}
        </div>
      </div>
    </header>

    <main class="flex-1 flex flex-col items-center px-4 pt-3 pb-8 mode-screen__main">
      <div class="w-full max-w-md animate-fade-up home-shell">
        ${renderHomeIntro()}
        <div class="home-grid">

        ${renderDailyModeCard()}

        <!-- Classic full width -->
        <button data-action="mode-solo"
          class="w-full rounded-2xl bg-white px-5 py-4 flex flex-col items-center gap-2 cursor-pointer card-shadow hover:shadow-md transition-all border border-slate-100 mb-3 home-card--classic">
          <span class="text-3xl" style="pointer-events:none">💯</span>
          <p class="font-black text-base" style="color:#f97316;pointer-events:none">Classic</p>
          <p class="text-sm text-muted-fg text-center" style="pointer-events:none">Draft with full player stats visible — make informed picks.</p>
          <div class="w-full py-2.5 rounded-xl font-bold text-sm text-white text-center mt-1" style="background:#f97316;pointer-events:none">Play Classic</div>
        </button>

        <!-- Ball IQ + 1v1 side by side -->
        <div class="grid grid-cols-2 gap-3 mb-3 home-pair">
          <button data-action="mode-blind"
            class="rounded-2xl bg-white p-4 flex flex-col items-center gap-2 cursor-pointer card-shadow hover:shadow-md transition-all border border-slate-100 home-card--balliq">
            <span class="text-3xl" style="pointer-events:none">🧠</span>
            <p class="font-black text-base" style="color:#f97316;pointer-events:none">Ball IQ</p>
            <p class="text-xs text-muted-fg text-center leading-snug flex-1" style="pointer-events:none">Names only — draft by memory and test your Ball IQ.</p>
            <div class="w-full py-2 rounded-xl font-bold text-sm text-white text-center mt-1" style="background:#f97316;pointer-events:none">Play Ball IQ</div>
          </button>

          <button data-action="mode-1v1"
            class="rounded-2xl bg-white p-4 flex flex-col items-center gap-2 cursor-pointer card-shadow hover:shadow-md transition-all border border-slate-100 home-card--1v1">
            <span class="text-3xl" style="pointer-events:none">⚔️</span>
            <p class="font-black text-base" style="color:#f97316;pointer-events:none">1v1</p>
            <p class="text-xs text-muted-fg text-center leading-snug flex-1" style="pointer-events:none">Draft your team, then go head-to-head against a rival lineup.</p>
            <div class="w-full py-2 rounded-xl font-bold text-sm text-white text-center mt-1" style="background:#f97316;pointer-events:none">Play</div>
          </button>
        </div>

        <button data-action="view-trophies"
          class="w-full py-3 rounded-xl font-bold text-sm border border-amber-200 bg-amber-50 text-amber-700 cursor-pointer transition-all hover:bg-amber-100 card-shadow mb-3 home-card--trophy">
          <span class="home-card__trophy-icon" style="pointer-events:none">🏆</span>
          <span class="home-card__trophy-body" style="pointer-events:none">
            <span class="home-card__trophy-title">Trophy Room${trophies.length > 0 ? ` · ${trophies.length}` : ''}</span>
            <span class="home-card__trophy-sub">Relive your best runs, rings and record seasons.</span>
          </span>
          <span class="home-card__trophy-chev" style="pointer-events:none">→</span>
        </button>

        ${renderMoreModesButton()}

        </div>
      </div>
    </main>
    ${renderFooter()}
  </div>`;
}

/** Desktop-only intro band above the mode grid. Hidden below 1024px (see
 *  css/desktop.css) — it is presentation the narrow layout has no room for,
 *  not a duplicate of any control. Legend counts come from the real
 *  collection, not the reference's sample numbers. */
function renderHomeIntro() {
  let collected = 0, total = 0;
  try {
    collected = getCollectedLegends().size ?? 0;
    total     = getLegendCatalog().total ?? 0;
  } catch (e) { /* collection unavailable — fall through to the stat-less band */ }

  return `
  <div class="home-intro" style="display:none">
    <div>
      <h1 class="home-intro__title">Build a team that goes <em>82-0</em></h1>
      <p class="home-intro__sub">Draft five all-time greats. Chase the perfect season.</p>
    </div>
    ${total ? `
    <div class="home-intro__stat">
      <span class="home-intro__stat-label">Legends collected</span>
      <span class="home-intro__stat-value cond">${collected}<small>/${total}</small></span>
    </div>` : ''}
  </div>`;
}

/** Challenges entry — a button that opens the full challenge-select screen. */
function renderMoreModesButton() {
  return `
  <button data-action="open-more-modes"
    class="w-full mb-3 rounded-xl border border-border bg-white px-4 py-3 flex items-center justify-between gap-3 cursor-pointer card-shadow hover:border-primary hover:bg-card2 transition-all home-card--challenges">
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

  // The picker is in normal flow on mobile (it pushes the column down, which
  // is fine there). On desktop the chip lives inside the fixed-height stepper
  // strip, so css/desktop.css floats this same node under the chip instead of
  // letting it reflow the one-viewport draft layout — hence the hook class.
  const picker = !locked && S.coachPickerOpen ? `
    <div class="rounded-xl border border-border bg-white card-shadow overflow-hidden animate-scale-in draft-coach-chip__picker">
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
    isPickDraftable(S.dailyChallenge,
      { ...p, team: S.currentSpin?.team, decade: S.currentSpin?.decade }, filled).legal
  );
}

function renderModeDraftBanner() {
  if (S.mode === 'daily') return renderDailyDraftBanner();
  if (S.mode === 'rematch' && S.rematch) {
    const { wins, losses, style } = S.rematch;
    return `<div class="rounded-xl border px-3 py-2 text-xs font-semibold mode-banner mode-banner--rematch"
      style="border-color:color-mix(in srgb, #22c55e 38%, var(--border));background:color-mix(in srgb, #22c55e 13%, var(--card));color:var(--fg)">
      ⚔️ Rematch — these are the exact five boards your challenger drafted from${style === 'blind' ? ' (Ball IQ: names only)' : ''}.
      Beat <strong>${wins}–${losses}</strong>. No skips: the board is the board.
    </div>`;
  }
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
    // No upper clamp — mirrors simulation.js's unclamped popNorm so the live
    // preview doesn't undersell a roster averaging above 100 popularity.
    const fansM = Math.pow(Math.max(0, (avg - 35) / 65), 1.5) * 38 + 2;
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

/** Desktop round stepper — one segment per real draft round, labelled with
 *  the game's own phase names (DRAFT_PHASES). The reference mockup showed
 *  five invented phases; the real game has three spanning five rounds, so the
 *  label is printed once at the round each phase begins rather than
 *  inventing mechanics to match the picture. */
function renderDraftStepper(full) {
  const displayRound = Math.min(S.round + 1, TOTAL_ROUNDS);
  const segments = Array.from({ length: TOTAL_ROUNDS }, (_, i) => {
    const phase     = DRAFT_PHASES.find(ph => i <= ph.max) || DRAFT_PHASES[DRAFT_PHASES.length - 1];
    const prevPhase = i > 0 ? (DRAFT_PHASES.find(ph => (i - 1) <= ph.max) || null) : null;
    const startsPhase = !prevPhase || prevPhase.label !== phase.label;
    const state = full || i < S.round ? 'done' : i === S.round ? 'active' : 'todo';
    return `<div class="draft-stepper__phase draft-stepper__phase--${state}">
      <div class="draft-stepper__bar"></div>
      <span class="draft-stepper__name">${startsPhase ? esc(phase.label) : '&nbsp;'}</span>
    </div>`;
  }).join('');

  return `
  <div class="draft-stepper${full ? ' draft-stepper--complete' : ''}">
    <div class="draft-stepper__head">
      <span class="draft-stepper__eyebrow">${full ? 'Draft Complete' : 'Draft Progress'}</span>
      <span class="draft-stepper__round cond">Round ${displayRound} <small>/ ${TOTAL_ROUNDS}</small></span>
    </div>
    <div class="draft-stepper__phases">${segments}</div>
    ${full
      ? `<span class="draft-stepper__done-chip">✓ All ${TOTAL_ROUNDS} spots locked</span>`
      : renderCoachChip()}
  </div>`;
}

/** Chemistry synergies rail. Reads the same cached calculateChemistry()
 *  result the gauge uses — no second calculation, no second source of truth. */
function renderSynergyPanel() {
  if (isBlindDraft()) {
    return `
    <div class="dk-synergy">
      <div class="dk-synergy__head"><span class="dk-section-label">Chemistry Synergies</span></div>
      <div class="dk-synergy__empty">
        <span class="dk-synergy__empty-icon" aria-hidden="true">🔒</span>
        <p class="dk-synergy__empty-text">Names only — synergies unlock after you simulate.</p>
      </div>
    </div>`;
  }

  const starters = POSITIONS.map(pos => S.roster[pos]).filter(Boolean);
  const report   = starters.length && _chemCache.result ? (_chemCache.result.chemReport || []) : [];

  const body = report.length
    ? `<div class="dk-synergy__list">${report.map(item => {
        const good = item.startsWith('🟢');
        return `<div class="dk-synergy__item dk-synergy__item--${good ? 'good' : 'bad'}">${item}</div>`;
      }).join('')}</div>`
    : `<div class="dk-synergy__empty">
        <span class="dk-synergy__empty-icon" aria-hidden="true">🔗</span>
        <p class="dk-synergy__empty-text">No synergies yet — keep drafting to unlock team chemistry bonuses.</p>
      </div>`;

  return `
  <div class="dk-synergy">
    <div class="dk-synergy__head">
      <span class="dk-section-label">Chemistry Synergies</span>
      ${report.length ? `<span class="dk-synergy__count">${report.length} active</span>` : ''}
    </div>
    ${body}
  </div>`;
}

/** Live team status rail — the three-gauge dashboard plus synergies. */
function renderTeamStatusRail() {
  return `
  <div class="dk-team-status">
    <span class="dk-team-status__label">Team Status</span>
    ${renderStatGauges({ withOverall: true, showSub: true })}
  </div>
  ${renderSynergyPanel()}`;
}

function renderDrafting() {
  if (isDualDraft()) return renderDrafting1v1();
  const full = rosterFull();

  // A cold-open welcome or mode banner costs the column ~6rem it can't spare
  // on a one-viewport mobile layout. Flagging it here lets the CSS trade the
  // draft cards' trait chips for that height, so the "Draft" button still
  // clears the fold — on the first-run screen above all.
  const banners = renderColdOpenBanner() + renderModeDraftBanner();

  // ── Desktop: two-column draft workspace ────────────────────────────────
  // Left is the workspace you act in (spin, board, roster); right is the
  // live read-out you judge against. Same render helpers as mobile — only
  // the arrangement differs.
  if (isDesktopLayout()) {
    return `
    <div class="min-h-screen main-gradient draft-screen">
      ${renderHeader(true)}
      <main class="flex flex-col items-center draft-screen__main">
        <!-- Before the first spin the left column holds only the spinner and
             the empty roster — no board — so nothing in it wants the leftover
             height and the whole workspace ends up floating in the middle of
             the screen. Flagging that state lets css/desktop.css hand the
             space to the spinner instead, which is the only thing you can
             act on at that moment. -->
        <div class="draft-workspace${shouldShowDraftBoard(full) ? '' : ' draft-workspace--no-board'}">
          ${banners}
          ${renderDraftStepper(full)}
          <div class="draft-workspace__cols">
            <div class="draft-workspace__left">
              ${full ? renderSimulateCard() : ''}
              ${!full ? renderSlotMachine() : ''}
              ${shouldShowDraftBoard(full) ? renderDraftBoard() : ''}
              ${renderRoster()}
              ${full ? renderCoachChip() : ''}
            </div>
            <div class="draft-workspace__right">
              ${renderTeamStatusRail()}
            </div>
          </div>
        </div>
      </main>
    </div>`;
  }

  // ── Mobile / tablet: the shipped single-column "Arena" layout ──────────
  return `
  <div class="min-h-screen main-gradient draft-screen">
    ${renderHeader(true)}
    <main class="flex flex-col items-center px-4 pt-2 pb-8 draft-screen__main">
      <div class="w-full max-w-2xl flex flex-col gap-2 draft-screen__inner${banners ? ' draft-screen__inner--banner' : ''}">
        ${banners}
        ${full ? renderSimulateCard() : ''}
        ${renderRoundBar()}
        ${renderCoachChip()}
        ${!full ? renderSlotMachine() : ''}
        ${shouldShowDraftBoard(full) ? renderDraftBoard() : ''}
        ${renderStatGauges({ withOverall: true })}
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

// ── Live stat gauges (Fans + Chemistry) — drafting screen, every width ───────
// 2K-style radial arcs (design handoff: "Arena — dark broadcast"). These are
// the only live meters on the drafting screen now; the linear Fans bar and
// Team Chemistry bar they replaced are gone, and the chemistry synergy chips
// that used to sit beside them live on the results screen
// (renderChemistryReportCard) instead.

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

// The arc and the emoji badge are decorative: the value + label below them
// already state the reading in text, and an unhidden emoji is announced by its
// Unicode name ("busts in silhouette"), which is pure noise over the number a
// screen-reader user actually wants. Hiding them leaves a clean "37M Fans".
function renderStatGauge({ id, icon, pct, value, suffix, label, color, sub = '', locked = false, lockedNote = '' }) {
  if (locked) {
    return `
    <div class="rounded-xl border border-border bg-card draft-stat-gauge">
      <div class="draft-stat-gauge__arc-wrap" aria-hidden="true">
        <svg viewBox="0 0 100 84" class="draft-stat-gauge__svg" focusable="false">
          <path d="${GAUGE_TRACK_PATH}" fill="none" stroke="var(--card2)" stroke-width="7" stroke-linecap="round"/>
        </svg>
        <div class="draft-stat-gauge__icon" style="background:var(--card2);border-color:var(--border)">🔒</div>
      </div>
      <div class="draft-stat-gauge__value cond" style="color:var(--muted-fg)" aria-hidden="true">—</div>
      <div class="draft-stat-gauge__label">${label}</div>
      ${lockedNote ? `<p class="draft-stat-gauge__note">${lockedNote}</p>` : ''}
    </div>`;
  }
  const gradId  = `gauge-${id}`;
  const badgeBg = `color-mix(in srgb, ${color} 16%, var(--card))`;
  return `
  <div class="rounded-xl border border-border bg-card draft-stat-gauge">
    <div class="draft-stat-gauge__arc-wrap" aria-hidden="true">
      <svg viewBox="0 0 100 84" class="draft-stat-gauge__svg" focusable="false">
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
    ${sub ? `<p class="draft-stat-gauge__sub">${sub}</p>` : ''}
  </div>`;
}

/** Live meters for the drafting screen.
 *
 *  Both draft layouts show all three (Fans + Chemistry + Overall); the
 *  `withOverall` flag stays so a caller can still ask for just the pair.
 *  All three read real roster state; none of them fabricate a value. */
function renderStatGauges({ withOverall = false, trio = false, showSub = false } = {}) {
  // `sub` is a desktop-only affordance — the shipped mobile gauge is a bare
  // value + label and must stay that way.
  const sub = t => (showSub ? t : '');
  const roster = Object.values(S.roster);
  const fans   = calcTeamFans(roster);
  const fansGauge = renderStatGauge({
    id: 'fans', icon: '👥', pct: fans.pct,
    // Empty roster reads "—", matching the Chemistry and Overall gauges
    // beside it. "0M" claimed a measured value where none exists yet.
    value: fans.count ? `${Math.round(fans.sum)}M` : '—', suffix: '',
    label: 'Fans', color: fans.count ? fans.barCol : 'var(--muted-fg)',
    sub: sub(fans.count ? (fans.tier || 'Building') : 'No draw yet'),
  });

  let chemGauge;
  if (isBlindDraft()) {
    // Ball IQ: don't leak natural-position fit through the gauge while the
    // mode is testing memory — it unlocks with the rest of the report.
    chemGauge = renderStatGauge({
      id: 'chem', icon: '🧪', label: 'Chemistry', locked: true,
      lockedNote: 'Unlocks after you simulate',
    });
  } else {
    // Scored exactly the way simulateSeason() will score it: no
    // `asPlacedSlots`, so calculateChemistry runs its own optimizeLineup.
    //
    // This gauge used to score the slots the player had tapped instead, to
    // match the roster chips. But the engine re-assigns the floor at sim
    // time and ignores placement entirely (see computeAutopsy's note), so
    // for any deliberately out-of-position roster the two disagreed — over
    // 2,000 sampled rosters the placed-vs-optimized chemistry score differed
    // by 33 points on average (worst 41), i.e. the draft screen read "Very
    // Weak" and the results screen read "Very Strong" for the same five
    // players. A live meter that claims to predict the season has to predict
    // the season. Rosters placed naturally — every one-tap draft — are
    // unaffected: the two scorings agree exactly there.
    const placedPairs = POSITIONS
      .map(pos => ({ pos, player: S.roster[pos] }))
      .filter(x => x.player);
    const starters = placedPairs.map(x => x.player);

    if (starters.length === 0) {
      // Nothing drafted yet — start at 0 like the Fans gauge, instead of
      // chemTier(0)'s "Very Weak" (a false negative before you've begun).
      chemGauge = renderStatGauge({
        id: 'chem', icon: '🧪', pct: 0,
        value: '—', suffix: '',
        label: 'Chemistry', color: 'var(--muted-fg)',
        sub: sub('No pairings yet'),
      });
    } else {
      // Keyed on the starters themselves, not their slots — the optimizer
      // decides the floor, so two placements of the same five score alike.
      const rosterKey = 'opt|' + (S.coach || '') + '|' + starters.map(p => p.id).join(',');
      if (_chemCache.key !== rosterKey) {
        _chemCache.key    = rosterKey;
        _chemCache.result = calculateChemistry(starters, S.coach);
      }
      const tier  = chemTier(_chemCache.result.chemScore);
      const color = chemTierColors(tier.id, isDark()).color;
      const synCount = (_chemCache.result.chemReport || []).length;
      // No raw score digits — chemTier() intentionally hides the 0-100 number
      // from the UI; the arc's sweep still encodes it visually.
      chemGauge = renderStatGauge({
        id: 'chem', icon: '🧪', pct: _chemCache.result.chemScore,
        value: tier.label, suffix: '',
        label: 'Chemistry', color,
        sub: sub(synCount ? `${synCount} synerg${synCount === 1 ? 'y' : 'ies'}` : 'No synergies yet'),
      });
    }
  }

  let ovrGauge = '';
  if (withOverall) {
    const { ovr, count, pct } = calcTeamOverall(roster);
    ovrGauge = renderStatGauge({
      id: 'ovr', icon: '🏀', pct,
      value: ovr == null ? '—' : String(Math.round(ovr)), suffix: '',
      label: 'Overall',
      color: ovr == null ? 'var(--muted-fg)' : ovrColor(ovr),
      sub: sub(ovr == null ? 'No roster' : `${ovrTierLabel(ovr)} · ${count}/${POSITIONS.length}`),
    });
  }

  return `<div class="draft-stat-gauges${trio ? ' dk-gauge-trio' : ''}">${fansGauge}${chemGauge}${ovrGauge}</div>`;
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
    <div class="flex items-center gap-2 mb-3 flex-wrap">
      <p class="text-xs font-bold uppercase tracking-widest text-muted-fg whitespace-nowrap">Draft Board — ${boardLabel}</p>
      <div class="ml-auto flex gap-1.5 flex-wrap justify-end">
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
      <p class="text-center text-xs text-muted-fg py-1">${isBlindDraft() ? 'Names only — select a player, then tap a roster slot to place them' : 'Draft places into an open natural slot — or tap a roster slot to choose'}</p>
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
    const check  = isPickDraftable(S.dailyChallenge,
      { ...p, team: S.currentSpin?.team, decade: S.currentSpin?.decade }, filled);
    if (!check.legal) dailyBlock = check.reason;
  }
  const unavailable     = alreadyOnRoster || !!dailyBlock;
  const isSelected      = !unavailable && S.selectedPlayer?.id === p.id;
  const cardBorder      = unavailable ? 'var(--border)' : isSelected ? 'var(--primary)' : 'var(--border)';
  const cardBg          = unavailable ? 'var(--card3)' : isSelected ? 'var(--card2)' : 'var(--card)';
  const cardOpacity     = unavailable ? 'opacity:0.5;' : '';
  // The selected state must always say what to do next. Mobile used to read a
  // bare "✓ Selected" while desktop said "✓ Selected — Tap a Roster Slot": the
  // narrow viewport — the one where the roster slots sit below the fold — got
  // the label with no instruction in the exact state where the player is
  // stuck. Mobile gets its own shorter wording rather than desktop's, which
  // wraps at 375px; "below" is accurate because the roster always renders
  // under the board.
  const pickLabel       = isBlindDraft()
    ? (isSelected ? '✓ Selected — Tap a Roster Slot' : 'Draft → Tap Slot')
    : isMobileViewport()
    ? (isSelected ? '✓ Tap a Slot Below' : 'Draft → Slot')
    : (isSelected ? '✓ Selected — Tap a Roster Slot' : 'Draft → Tap Slot');

  // HoopIQ — name only, no stats or position hints
  if (isBlindDraft()) {
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
    // Primary green, flex amber, off-position slate.
    //
    // The off-position chip used to be red, on the grounds that chemistry.js
    // charges a -12% "Versatile" penalty. It does — but for a roster the
    // lineup optimizer cannot seat naturally, NOT for where the player tapped:
    // the engine re-assigns the whole floor at sim time (see computeAutopsy),
    // so a placement never costs anything by itself. Red announced a penalty
    // that never lands. Slate still tells you this isn't their natural spot,
    // without calling a free choice a mistake.
    //
    // Theme-aware, like the empty-slot branch below already was. These label
    // colours were a single fixed-light set painted onto the dark card too:
    // the 10px position label measured 3.3:1 for green in light mode and
    // 3.1:1 for slate in dark, both under the 4.5:1 AA floor for small text.
    // The values below clear it on both surfaces (light card #fff, dark card
    // #1e293b / #080d1a) and reuse the dark tints the empty slot already uses.
    const dark = isDark();
    const fitColors  = dark
      ? { primary: '#4ade80', flex: '#fbbf24', place: '#cbd5e1' }
      : { primary: '#15803d', flex: '#b45309', place: '#64748b' };
    const fitBorders = { primary: '#86efac', flex: '#fde68a', place: '#cbd5e1' };
    const fitTops    = { primary: '#16a34a', flex: '#d97706', place: '#94a3b8' };
    const borderColor = fitBorders[fitType];
    const borderTop   = `3px solid ${fitTops[fitType]}`;
    const labelColor  = fitColors[fitType];
    const ppgLine = isBlindDraft()
      ? ''
      : `<span class="text-[10px] text-muted-fg leading-none">${fmtPG(p.ppg)}pt</span>`;

    // Desktop roster cards lead with OVR (the reference's treatment) instead
    // of PPG. Emitted only at desktop widths so the mobile card is untouched.
    const ovrLine = isDesktopLayout() && !isBlindDraft() && p.overall != null
      ? `<span class="cond draft-roster-slot__ovr" style="color:${ovrColor(p.overall)}">${Math.round(p.overall)}</span>
         <span class="draft-roster-slot__ovr-label">OVR</span>`
      : ppgLine;

    return `
    <div class="rounded-xl border bg-white p-2 flex flex-col items-center gap-0.5 text-center overflow-hidden card-shadow locked draft-roster-slot draft-roster-slot--filled ${fitClass}"
      style="border-color:${borderColor};border-top:${borderTop}"
      title="${p.name} · pick locked">
      <span class="text-[10px] font-black uppercase leading-none draft-roster-slot__pos" style="color:${labelColor}">${label}</span>
      <span class="text-[11px] font-bold text-foreground leading-tight w-full text-center truncate px-0.5 draft-roster-slot__name">${p.name.split(' ').pop()}</span>
      ${ovrLine}
    </div>`;
  }

  // Empty slot — droppable when placing a draft pick.
  // Ball IQ hides the Primary/Flex hints: highlighting the selected player's
  // natural slots would leak the position the mode asks you to know.
  const canDrop      = canPlace;
  const sp           = S.selectedPlayer;
  // isBlindDraft(), not `mode === 'blind'`: a Ball IQ board replayed as a
  // rematch keeps the names-only rules, so the Primary/Flex/Off-Position hints
  // must stay hidden there too.
  const showFit      = !isBlindDraft();
  const primaryMatch = showFit && canDrop && sp && sp.pos === pos;
  const flexMatch    = showFit && canDrop && sp && !primaryMatch &&
    (sp.secondaryPos || []).includes(pos);
  // Off-position drops read slate, not red — see the filled-slot note above:
  // the engine re-assigns the floor at sim time, so no placement carries a
  // penalty of its own. The three tiers still say whether this is the
  // player's natural spot, which is what a drafter wants to know.
  const oopMatch     = showFit && canDrop && sp && !primaryMatch && !flexMatch;

  const slotBg     = !canDrop ? 'var(--card3)' : (isDark() ? 'rgba(234,179,8,0.08)' : '#fffbeb');
  const slotBorder = !canDrop ? 'var(--border)' : (primaryMatch ? (isDark() ? '#4ade80' : '#86efac') : flexMatch ? (isDark() ? '#fbbf24' : '#fde68a') : (isDark() ? '#94a3b8' : '#cbd5e1'));
  const slotColor  = !canDrop ? 'var(--muted)' : (primaryMatch ? (isDark() ? '#4ade80' : '#16a34a') : flexMatch ? (isDark() ? '#fbbf24' : '#d97706') : (isDark() ? '#cbd5e1' : '#64748b'));
  const slotText   = !canDrop ? 'Empty' : primaryMatch ? 'Primary' : flexMatch ? 'Flex' : oopMatch ? 'Off-Position' : 'Place';
  // Short form for the accessible name (read out five times in a row);
  // the long form explains the consequence on hover.
  const fitWord    = primaryMatch ? 'natural position'
                   : flexMatch    ? 'secondary position'
                   : 'off position';
  const slotTitle  = !canDrop ? '' : primaryMatch
    ? `${sp.name} is a natural ${label}`
    : flexMatch
    ? `${sp.name} covers ${label} as a secondary position`
    : `${label} is not ${sp.name}'s natural spot — the lineup optimizer still picks the best floor at tip-off, so this costs nothing`;

  return `
  <button type="button" ${canDrop ? `data-action="place-${pos}"` : 'disabled'}
    class="rounded-xl border-2 border-dashed p-2 flex flex-col items-center gap-1 text-center transition-all draft-roster-slot ${canDrop ? 'slot-empty droppable cursor-pointer' : 'opacity-90'}"
    style="background:${slotBg};border-color:${slotBorder}"
    ${slotTitle ? `title="${esc(slotTitle)}"` : ''}
    aria-label="${canDrop ? `Place ${esc(sp.name)} at ${label} — ${fitWord}` : `${label} empty`}">
    <span class="text-[10px] font-black uppercase draft-roster-slot__pos" style="color:${slotColor}">${label}</span>
    <span class="text-xs draft-roster-slot__state" style="color:${slotColor}">${slotText}</span>
  </button>`;
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
      fix:    'One roster change removes this penalty — check the Team Report for details.',
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
                aria-label="Team name"
                enterkeyhint="done"
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

/**
 * Secondary share row. "Share Result" above it stays the one-tap default
 * (image + caption through the native sheet); this row carries the two shares
 * that need their own affordance:
 *
 *   • the bare challenge link, for dropping into a group chat without an
 *     image — only offered when the run actually produced a replayable board
 *   • a 9:16 card, because the 1080×1200 feed card is the wrong shape for
 *     Stories/Reels/TikTok and gets letterboxed or cropped
 */
function renderChallengeShareCard() {
  const code = buildRematchCode();
  return `
  <div class="rounded-2xl border p-3 card-shadow dk-res-challenge" style="border-color:var(--border);background:var(--card)">
    ${code ? `
    <p class="text-[10px] font-bold uppercase tracking-widest text-muted-fg mb-1.5">Challenge a friend</p>
    <p class="text-xs text-muted-fg mb-2.5 leading-snug">Sends your exact five boards. They draft the same teams and eras — your ${S.result.wins}–${S.result.losses} is the target.</p>` : ''}
    <div class="grid ${code ? 'grid-cols-2' : 'grid-cols-1'} gap-2">
      ${code ? `<button data-action="copy-challenge-link" type="button" class="py-2 rounded-xl font-bold text-xs text-white cursor-pointer" style="background:#f97316">🔗 Copy challenge link</button>` : ''}
      <button data-action="share-story" type="button" class="py-2 rounded-xl font-bold text-xs border cursor-pointer" style="border-color:var(--border);background:var(--card2);color:var(--fg)">📱 Story card (9:16)</button>
    </div>
  </div>`;
}

// ── Rematch — head-to-head verdict banner ─────────────────────────────────────
function renderRematchResultBanner() {
  const rm = S.rematch;
  const rr = S.rematchResult;
  if (S.mode !== 'rematch' || !rm || !rr) return '';
  const won = rr.beat;
  const border = won ? 'color-mix(in srgb, #22c55e 45%, var(--border))' : 'color-mix(in srgb, #64748b 40%, var(--border))';
  const bg     = won ? 'color-mix(in srgb, #22c55e 14%, var(--card))'   : 'color-mix(in srgb, #64748b 10%, var(--card))';
  const color  = won ? (isDark() ? '#4ade80' : '#15803d') : 'var(--muted-fg)';
  // margin is (yours − theirs), so a tie lands here as 0 — the challenger keeps
  // the record until it is actually beaten.
  const detail = won
    ? `You won by ${rr.margin} game${rr.margin === 1 ? '' : 's'} on the same five boards.`
    : rr.margin === 0
      ? 'Dead level — a tie leaves the record standing.'
      : `Short by ${Math.abs(rr.margin)} game${Math.abs(rr.margin) === 1 ? '' : 's'} on the same five boards.`;
  return `
  <div class="rounded-2xl border-2 p-4 card-shadow text-center" style="background:${bg};border-color:${border}">
    <p class="text-xs font-black uppercase tracking-widest mb-1" style="color:${color}">${won ? '⚔️ Challenge beaten!' : '⚔️ Challenge not beaten'}</p>
    <p class="text-sm font-bold" style="color:var(--fg)">You ${S.result.wins}–${S.result.losses} &nbsp;vs&nbsp; their ${rm.wins}–${rm.losses}</p>
    <p class="text-xs mt-1" style="color:${color}">${detail}</p>
    <p class="text-[10px] mt-1.5" style="color:var(--muted-fg)">Share your run to pass the same board on — the link carries your record as the new target.</p>
  </div>`;
}

/**
 * "Add to home screen" ask. Shown on the results screen only after a Daily
 * Challenge, and only once the player has an actual streak going — that's the
 * first moment there is something to come back for, and the only honest reason
 * to want the icon on their home screen. install.js decides whether the
 * platform can be asked at all and remembers a refusal.
 */
function renderInstallPromptCard() {
  if (S.mode !== 'daily' || !S.dailyResult) return '';
  if ((S.dailyResult.streak ?? 0) < 1) return '';
  const kind = installPromptKind();
  if (!kind) return '';
  const streak = S.dailyResult.streak;
  const body = kind === 'ios'
    ? 'Tap <strong>Share</strong> → <strong>Add to Home Screen</strong> to keep it one tap away.'
    : 'Add it to your home screen and the next one is one tap away.';
  return `
  <div class="rounded-2xl border p-4 card-shadow" style="border-color:#fdba74;background:${isDark() ? 'rgba(249,115,22,0.1)' : '#fff7ed'}">
    <div class="flex items-center gap-3">
      <span class="text-2xl flex-shrink-0">🔥</span>
      <div class="min-w-0 flex-1">
        <p class="font-black text-sm" style="color:${isDark() ? '#fdba74' : '#9a3412'}">${streak}-day streak — don't break it</p>
        <p class="text-xs mt-0.5" style="color:${isDark() ? '#fed7aa' : '#c2410c'}">New challenge every midnight UTC. ${body}</p>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-2 mt-3">
      ${kind === 'prompt'
        ? `<button data-action="install-app" type="button" class="py-2 rounded-xl font-bold text-xs text-white cursor-pointer" style="background:#f97316">Add to home screen</button>`
        : `<span class="py-2 rounded-xl font-bold text-xs text-center" style="background:var(--card2);color:var(--muted-fg)">Share → Add to Home Screen</span>`}
      <button data-action="dismiss-install" type="button" class="py-2 rounded-xl font-bold text-xs border cursor-pointer" style="border-color:var(--border);background:var(--card);color:var(--muted-fg)">Not now</button>
    </div>
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
          aria-label="Franchise name for today's Daily Challenge board"
          enterkeyhint="done"
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

/** Light-weight starting-5 summary for the main results scroll — position,
 *  name, and OVR only. The fuller per-game-stat / floor-assignment version
 *  (with fit badges) lives in the Team Report popup's Optimized Lineup card
 *  (see reportRosterRow / renderOptimizedLineupReportCard). Reads S.roster
 *  by natural slot, matching what the player actually drafted rather than
 *  the engine's optimized re-assignment. */
function renderStartingFiveRow(posLabel, p) {
  if (!p) return '';
  return `
    <div class="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <span class="text-[10px] font-black text-primary w-7 flex-shrink-0">${posLabel}</span>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm text-foreground truncate">${p.name}</p>
        <p class="text-xs text-muted-fg">${p.team || ''} ${p.decade ? fmtDecadeShort(p.decade) : ''}</p>
      </div>
      <span class="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style="background:${ovrColor(p.overall)}18;color:${ovrColor(p.overall)}">OVR ${Math.round(p.overall ?? 0)}</span>
    </div>`;
}

/** XP + level card for the results screen. Reads the breakdown `doSimulate()`
 *  already stored on the run — it never computes or awards anything itself, so
 *  re-rendering the results screen cannot grant XP twice. Renders nothing at
 *  all for a run that predates the system (a result object with no `xp`). */
function renderXpCard() {
  const xp = S.result?.xp;
  if (!xp) return '';
  const a    = xp.award;
  const prog = levelProgress(a.xpAfter);
  const title = titleForLevel(prog.level);

  const row = (label, value) => value
    ? `<div class="flex items-center justify-between gap-2">
         <span class="text-xs text-muted-fg">${label}</span>
         <span class="text-xs font-bold text-foreground">+${value}</span>
       </div>`
    : '';

  const rewards = a.newRewards.length
    ? `<p class="text-xs font-bold mt-1" style="color:var(--acc)">Unlocked: ${a.newRewards.map(r => esc(r.label)).join(' · ')}</p>`
    : '';

  return `
  <div class="w-full rounded-2xl border card-shadow px-4 py-3 dk-res-xp"
    style="border-color:var(--border);background:var(--card)">
    <div class="flex items-center justify-between gap-2 mb-2">
      <p class="text-xs font-bold uppercase tracking-widest text-muted-fg">Experience</p>
      <p class="text-sm font-black" style="color:var(--acc)">+${a.gain.toLocaleString()} XP</p>
    </div>

    ${row('Players drafted', xp.players)}
    ${row('Draft completed', xp.complete)}
    ${row('Team rating', xp.ovrBand)}
    ${row('Star players', xp.stars)}
    ${row('Team chemistry', xp.chem)}
    ${row(`Season wins (${S.result.wins})`, xp.winXp)}
    ${row('Perfect season', xp.perfect)}
    ${row('Daily Challenge', xp.daily)}

    <div class="flex items-center justify-between gap-2 mt-2">
      <span class="text-sm font-black text-foreground">Level ${prog.level}${title ? ` · ${esc(title)}` : ''}</span>
      <span class="text-xs text-muted-fg">${prog.into.toLocaleString()} / ${prog.need.toLocaleString()}</span>
    </div>
    <div class="h-2 rounded-full overflow-hidden mt-1" style="background:var(--surface-track)">
      <div class="h-full rounded-full" style="width:${prog.pct}%;background:var(--acc)"></div>
    </div>
    ${a.leveledUp ? `<p class="text-xs font-black mt-2" style="color:var(--acc)">⬆ Level up! ${a.levelBefore} → ${a.levelAfter}</p>` : ''}
    ${rewards}
  </div>`;
}

function renderStartingFiveCard() {
  return `
    <div class="rounded-2xl border border-border bg-white p-4 card-shadow">
      <p class="text-xs font-bold uppercase tracking-widest text-muted-fg mb-1">Starting 5</p>
      <div class="flex flex-col">
        ${POSITIONS.map(pos => renderStartingFiveRow(pos, S.roster[pos])).join('')}
      </div>
    </div>`;
}

function renderResults() {
  const r          = S.result;
  const tier       = seasonTier(r.wins);
  const isPerfect  = tier.id === 'perfect';

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

  const label = tier.label, emoji = tier.emoji;

  const modeBadge = S.mode === 'defense'
    ? `<span class="inline-block text-[11px] font-bold px-3 py-1 rounded-full border" style="border-color:color-mix(in srgb,#8b5cf6 35%,var(--border));background:color-mix(in srgb,#8b5cf6 14%,var(--card));color:var(--fg)">🛡️ DEF profile · ${r.teamStocks ?? 0} stocks</span>`
    : S.mode === 'fans'
    ? `<span class="inline-block text-[11px] font-bold px-3 py-1 rounded-full border" style="border-color:color-mix(in srgb,#ec4899 35%,var(--border));background:color-mix(in srgb,#ec4899 14%,var(--card));color:var(--fg)">📣 Fans First score ${r.fansScore ?? 0}${r.fansPassed ? ' · ✓ (≥70 pop & ≥35 wins)' : ' · need ≥70 pop & ≥35 wins'}</span>`
    : '';

  // The mode-select screen names each run type; the hero eyebrow echoes it so
  // a shared/screenshotted result says which ruleset produced the record.
  const modeName = S.mode === 'daily'   ? 'Daily Challenge'
                 : S.mode === 'rematch' ? (isBlindDraft() ? 'Rematch · Ball IQ' : 'Rematch')
                 : S.mode === 'blind'   ? 'Ball IQ'
                 : S.mode === 'defense' ? 'Defense Only'
                 : S.mode === 'fans'    ? 'Fans First'
                 : 'Classic';

  // ── Team rating (0–100 overall) display helpers ───────────────────────────
  const teamOvr = Math.round(r.avgRating ?? 0);

  // ── Popularity / Fan-Hype display helpers ─────────────────────────────────
  // Full per-player breakdown, tier badge, and Elo-impact detail live in the
  // Fans report card (renderFansReportCard) — this screen only needs the
  // roll-up for the FANS quick-tile.
  const teamFans = calcTeamFans(POSITIONS.map(p => S.roster[p]));

  // Team Chemistry / Fans / Season Leaders / Team Statistics / Optimized
  // Lineup / Loss Autopsy card builders, plus the detailed Team OVR Elo,
  // Fans Elo, and Coach mastery chips, now live in the Team Report popup
  // builders below (renderSeasonImpactReportCard, renderChemistryReportCard,
  // renderFansReportCard, etc.) — the main screen only keeps the 82-0
  // congrats treatment, since that's a celebration beat rather than analysis
  // (see renderAutopsyReportCard for the imperfect-season detail).

  // ── Courtside hero ────────────────────────────────────────────────────────
  const grade     = seasonGrade(r.wins);
  const seed      = getPlayerSeed(r.wins);
  const madeBid   = r.wins >= 20;
  // Seed only means something once there's a bracket to be seeded into. The
  // nbsp keeps "#2 seed" intact when the sub-line wraps on a narrow phone.
  const seedLine  = madeBid ? ` · <b>#${seed}&nbsp;seed</b>` : '';

  // The presented game order (post cold-open reorder / rivalry night) is what
  // the player just watched tick by tick — the strip has to match that, not
  // the engine's raw pre-shuffle log.
  const stripGames = (S.seasonGames?.length === 82 ? S.seasonGames : r.games) || [];
  const streak     = r.longestStreak ?? 0;
  const seasonStripHtml = stripGames.length ? `
    <div class="season-strip">
      <div class="season-strip__pips" role="img"
        aria-label="Season game log: ${r.wins} wins, ${r.losses} losses">
        ${stripGames.map(g => `<div class="season-strip__pip${g.won ? '' : ' season-strip__pip--loss'}"></div>`).join('')}
      </div>
      <div class="season-strip__meta">
        <span class="season-strip__streak">${streak >= 3 ? `🔥 ${streak}-game win streak` : ''}</span>
        <span class="season-strip__count">${stripGames.length} games · full season</span>
      </div>
    </div>` : '';

  // Chemistry as a single letter for the quick tile — the same bands the
  // Team Chemistry Report (inside the Team Report popup) uses, so the
  // letter and the label agree.
  const chemTileGrade = { perfect: 'S', veryStrong: 'A', strong: 'B', neutral: 'C', weak: 'D', veryWeak: 'F' };
  const chemT      = r.chemScore !== undefined ? chemTier(r.chemScore) : null;
  const chemLetter = chemT ? (chemTileGrade[chemT.id] ?? '—') : '—';
  const chemCol    = chemT ? chemTierColors(chemT.id, isDark()).color : 'var(--muted-fg)';

  const coachTile = r.coachBoost
    ? `+${(r.coachBoost * 100).toFixed(1)}<small>%</small>`
    : '—';

  // Mode-specific badge only — the detailed Team OVR Elo / Fans Elo /
  // Coach mastery chips that used to live here moved into the Team Report
  // popup (renderSeasonImpactReportCard / renderFansReportCard).
  const signalChips = [modeBadge].filter(Boolean).join('');

  return `
  <div class="flex flex-col min-h-screen main-gradient">
    ${renderHeader(false)}
    <main class="flex-1 flex flex-col items-center px-4 py-6">
      <div class="w-full max-w-2xl flex flex-col gap-4 animate-fade-up results-layout">
        <!-- ── Courtside hero ─────────────────────────────────────────── -->
        <div class="results-block--hero courtside-hero${isPerfect ? ' courtside-hero--perfect' : ''}">
          <div class="courtside-hero__top">
            <p class="courtside-hero__eyebrow">Season Complete · ${modeName}</p>
            <span class="courtside-hero__tier">${emoji} ${label}</span>
          </div>
          <div class="courtside-hero__body">
            <div class="grade-badge">
              <div class="grade-badge__inner">
                <span class="cond grade-badge__letter${grade.length > 1 ? ' grade-badge__letter--wide' : ''}">${grade}</span>
                <span class="grade-badge__label">GRADE</span>
              </div>
            </div>
            <div class="courtside-hero__col">
              <div class="courtside-record">
                <span class="cond courtside-record__w">${r.wins}</span>
                <span class="courtside-record__dash">–</span>
                <span class="cond courtside-record__l">${r.losses}</span>
              </div>
              <p class="courtside-hero__sub">Projected&nbsp;${Math.round(r.winPct)}% · Team&nbsp;OVR&nbsp;${teamOvr}${seedLine}</p>
            </div>
          </div>
          ${seasonStripHtml}
        </div>

        <!-- The two .results-col wrappers are layout-only. They are
             display:contents at phone and tablet widths, so the blocks
             inside stay direct flex items of .results-layout and the
             existing order-based phone sequence is untouched. Only the
             desktop composition promotes them to real columns, which is
             what lets each column flow independently instead of sharing
             grid rows with the other. -->
        <div class="results-col results-col--main">
        <!-- ── Quick tiles ────────────────────────────────────────────── -->
        <div class="results-block--hero quick-tiles dk-res-tiles">
          <div class="quick-tile">
            <p class="quick-tile__label">OVR</p>
            <p class="cond quick-tile__value" style="color:var(--fg)">${teamOvr}</p>
          </div>
          <div class="quick-tile">
            <p class="quick-tile__label">CHEM</p>
            <p class="cond quick-tile__value" style="color:${chemCol}">${chemLetter}</p>
          </div>
          <div class="quick-tile">
            <p class="quick-tile__label">FANS</p>
            <p class="cond quick-tile__value" style="color:var(--acc)">${Math.round(teamFans.sum)}<small>M</small></p>
          </div>
          <div class="quick-tile">
            <p class="quick-tile__label">COACH</p>
            <p class="cond quick-tile__value" style="color:var(--acc)">${coachTile}</p>
          </div>
        </div>

        ${signalChips ? `<div class="results-block--hero flex items-center justify-center gap-2 flex-wrap">${signalChips}</div>` : ''}

        <div class="results-block--hero dk-res-five">${renderStartingFiveCard()}</div>

        <!-- Legends collected sits under the Starting 5 rather than in the
             rail: it reports on the run you just played, which is what this
             column is for, and the rail is reserved for what you do next.
             The phone layout is unchanged — css/styles.css orders this block
             last there, so it still reads after the action buttons. -->
        ${r.newLegends > 0 ? (() => {
          const { total } = getLegendCatalog();
          const have = getCollectedLegends().size;
          return `
          <button data-action="view-legends"
            class="w-full rounded-2xl border cursor-pointer transition-all hover:bg-indigo-100 card-shadow flex items-center gap-3 px-4 py-3 text-left dk-res-legends"
            style="border-color:#c7d2fe;background:var(--surface-indigo)">
            <span class="text-2xl flex-shrink-0">🃏</span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-black text-indigo-700">+${r.newLegends} new legend${r.newLegends === 1 ? '' : 's'} collected!</p>
              <p class="text-xs text-indigo-500 mt-0.5">${have}/${total} all-time legends in your collection · tap to view</p>
            </div>
            <span class="text-indigo-400 flex-shrink-0">›</span>
          </button>`;
        })() : ''}
        ${renderXpCard()}
        ${renderDailyResultBanner()}
        ${renderRematchResultBanner()}
        ${renderInstallPromptCard()}
        ${renderDailySubmitCard()}
        </div><!-- /.results-col--main -->

        <div class="results-col results-col--rail">
        <!-- ── Playoff CTA + Team Report ──────────────────────────────── -->
        <div class="results-block--playoffs flex flex-col gap-3.5 dk-res-rail">
          ${madeBid ? `
          <button data-action="advance-to-playoffs" type="button" class="courtside-cta">
            <span class="courtside-cta__icon">🏆</span>
            <span class="flex-1 min-w-0">
              <span class="courtside-cta__title block">Enter the Playoffs</span>
              <span class="courtside-cta__sub block">${r.wins} wins locks the #${seed} seed · chase the ring</span>
            </span>
            <span class="courtside-cta__chev">→</span>
          </button>` : `
          <div class="courtside-cta courtside-cta--locked">
            <span class="courtside-cta__icon">📋</span>
            <span class="flex-1">
              <span class="courtside-cta__title block">No Playoff Bid</span>
              <span class="courtside-cta__sub block">Need at least 20 wins to crack the bracket. Run it back and rebuild.</span>
            </span>
          </div>`}
          ${isPerfect ? `
          <div class="autopsy-strip autopsy-strip--gold">
            <span class="autopsy-strip__icon">🏆</span>
            <span class="autopsy-strip__body">
              <span class="autopsy-strip__title block">82–0. You went undefeated.</span>
              <span class="autopsy-strip__fix block">No losses to dissect — you drafted an all-time roster and ran the table.</span>
              <span class="autopsy-strip__detail block">No NBA team has ever done it. Take the #1 seed into the playoffs and finish the job.</span>
            </span>
          </div>` : ''}
          <!-- Full breakdown (autopsy, chemistry, fans, leaders, stats, lineup)
               lives in the Team Report popup — see renderTeamReportModal(). -->
          <button data-action="open-team-report" type="button"
            class="w-full rounded-xl border border-border bg-white px-4 py-3 flex items-center justify-between gap-3 cursor-pointer card-shadow hover:border-primary hover:bg-card2 transition-all">
            <span class="flex items-center gap-2.5" style="pointer-events:none">
              <span class="text-xl">📊</span>
              <span class="flex flex-col text-left">
                <span class="text-[10px] font-bold uppercase tracking-widest text-muted-fg">Team Report</span>
                <span class="text-sm font-bold text-foreground">Chemistry, fans, stats &amp; lineup</span>
              </span>
            </span>
            <span class="text-lg text-muted-fg" style="pointer-events:none">→</span>
          </button>
        </div>

        <div class="results-block--save dk-res-save">${renderSaveRunCard()}</div>

        <!-- ── Action buttons ────────────────────────────────────────── -->
        <div class="grid grid-cols-2 gap-3 dk-res-actions">
          ${S.mode === 'daily'
            ? `<button data-action="back-to-menu" type="button" class="btn-neutral-outline card-shadow">Back to Menu</button>`
            : `<button data-action="restart" type="button" class="btn-neutral-outline card-shadow">Build Another</button>`}
          <button data-action="share" type="button" class="btn-courtside-outline card-shadow">Share Result</button>
        </div>
        ${renderChallengeShareCard()}
        </div><!-- /.results-col--rail -->
      </div>
    </main>
  </div>`;
}

// ── Team Report popup ─────────────────────────────────────────────────────────
// The sections below used to render inline on the results screen; they now
// live only inside the Team Report popup (see renderTeamReportModal), opened
// via the results screen's "Team Report" button. Each card independently
// reads S/S.result so it can be called standalone here.

/** Team OVR Elo impact + coach system mastery — the two detail chips that
 *  used to sit in the results screen's signal-chips row. Fans' equivalent
 *  Elo detail already has a natural home in renderFansReportCard, so it's
 *  folded in there (High/Low Fans label) instead of duplicated here. */
function renderSeasonImpactReportCard() {
  const r = S.result;
  const teamOvr     = Math.round(r.avgRating ?? 0);
  const ratingDelta = r.ratingEloDelta ?? 0;
  const ratingPct   = ratingDelta / (r.baseStrength || 1) * 100;
  const ratingImpactLabel = Math.abs(ratingPct) >= 0.1
    ? ` · ${ratingPct >= 0 ? '+' : ''}${ratingPct.toFixed(1)}% Elo`
    : '';
  const ovrRow = ratingImpactLabel
    ? `<div class="rounded-lg px-3 py-2 text-sm font-bold border" style="background:${ovrColor(teamOvr)}12;border-color:${ovrColor(teamOvr)}40;color:${ovrColor(teamOvr)}">🏀 Team OVR ${teamOvr}${ratingImpactLabel}</div>`
    : '';

  const coachObj = r.coachBoost ? (S.coach ? COACHES.find(c => c.id === S.coach) : null) : null;
  const coachRow = coachObj ? (() => {
    const pctOfMax = r.coachBoost / COACH_BOOST_MAX;
    const grade    = pctOfMax >= 0.75 ? 'Mastered' : pctOfMax >= 0.4 ? 'Building' : 'Faint';
    return `<div class="rounded-lg px-3 py-2 text-sm font-bold border" style="background:${coachObj.accent}12;border-color:${coachObj.accent}40;color:${coachObj.accent}">📋 ${coachObj.system}: +${(r.coachBoost * 100).toFixed(1)}% · ${grade}</div>`;
  })() : '';

  if (!ovrRow && !coachRow) return '';
  return `
    <div class="rounded-2xl border border-border bg-white p-4 card-shadow">
      <p class="text-xs font-bold uppercase tracking-widest text-muted-fg mb-3">Season Impact</p>
      <div class="flex flex-col gap-2">
        ${ovrRow}
        ${coachRow}
      </div>
    </div>`;
}

function renderAutopsyReportCard() {
  const r = S.result;
  const isPerfect = seasonTier(r.wins).id === 'perfect';
  if (isPerfect) return ''; // 82-0 congrats stays on the main results screen
  const autopsy = computeAutopsy();
  if (!autopsy) return '';
  const body = `
    <span class="autopsy-strip__icon">${autopsy.icon}</span>
    <span class="autopsy-strip__body">
      <span class="autopsy-strip__title block">${autopsy.title}</span>
      <span class="autopsy-strip__fix block">💡 ${autopsy.fix}</span>
      <span class="autopsy-strip__detail block">${autopsy.detail}</span>
    </span>`;
  // Daily Challenge is one attempt — no "run it back", so the strip stays a
  // plain read-only panel there. This popup is mounted outside #app (see
  // showTeamReportModal below), so its buttons use inline onclick + a
  // window-bound export instead of data-action delegation.
  return S.mode === 'daily'
    ? `<div class="autopsy-strip">${body}</div>`
    : `<button type="button" class="autopsy-strip" onclick="window.runItBackFromReport()"
         aria-label="Run it back — draft a new roster">
         ${body}
         <span class="autopsy-strip__cta">Fix ›</span>
       </button>`;
}

function renderChemistryReportCard() {
  const r = S.result;
  const chemReportHtml = r.chemReport && r.chemReport.length > 0
    ? r.chemReport.map(item => {
        const isGood = item.startsWith('🟢');
        return `<div class="rounded-lg px-3 py-2 text-sm font-medium border"
          style="background:${isGood ? 'var(--surface-green)' : 'var(--surface-red)'};border-color:${isGood ? (isDark() ? 'rgba(74,222,128,0.35)' : '#bbf7d0') : (isDark() ? 'rgba(248,113,113,0.35)' : '#fecaca')};color:${isGood ? (isDark() ? '#4ade80' : '#15803d') : (isDark() ? '#f87171' : '#dc2626')}">${item}</div>`;
      }).join('')
    : `<p class="text-sm text-muted-fg py-1">No synergies or penalties — balanced roster.</p>`;
  const chemScoreBadge = r.chemScore !== undefined ? (() => {
    const tier = chemTier(r.chemScore);
    const { color: scColor, bg: scBg } = chemTierColors(tier.id, isDark());
    return `<span class="text-xs font-bold px-2 py-0.5 rounded-full border" style="background:${scBg};color:${scColor};border-color:${scColor}30">${tier.label}</span>`;
  })() : '';
  return `
    <div class="rounded-2xl border border-border bg-white p-4 card-shadow">
      <div class="flex items-center justify-between mb-3">
        <p class="text-xs font-bold uppercase tracking-widest text-muted-fg">Team Chemistry Report</p>
        ${chemScoreBadge}
      </div>
      <div class="flex flex-col gap-2">${chemReportHtml}</div>
    </div>`;
}

function renderFansReportCard() {
  const r         = S.result;
  const popDelta  = r.popEloDelta ?? 0;
  const teamFans  = calcTeamFans(POSITIONS.map(p => S.roster[p]));
  const popBarPct = teamFans.pct;
  const popBarCol = fansBarCol(teamFans.avg);
  const popTier   = teamFans.tier;
  // Hoisted out of the two <p> tags below, which each repeated it. Light red
  // was #dc2626, measuring 4.41:1 on --surface-red — just under the 4.5:1 AA
  // floor for the 10px label. #b91c1c takes it to 6.0:1. The green side
  // already measures 4.8:1, so only the red moves.
  const eloColor  = popDelta >= 0
    ? (isDark() ? '#4ade80' : '#15803d')
    : (isDark() ? '#f87171' : '#b91c1c');
  return `
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
      <!-- Elo impact row — "High/Low Fans" is the same qualitative label the
           results screen's hype chip used to show before it moved here. -->
      <div class="flex gap-3 flex-wrap">
        <div class="flex-1 rounded-xl border px-3 py-2.5 text-center"
          style="background:${popDelta >= 0 ? 'var(--surface-green)' : 'var(--surface-red)'};border-color:${popDelta >= 0 ? (isDark() ? 'rgba(74,222,128,0.35)' : '#bbf7d0') : (isDark() ? 'rgba(248,113,113,0.35)' : '#fecaca')}">
          <p class="text-[10px] font-bold uppercase tracking-wider mb-1" style="color:${eloColor}">${popDelta >= 0 ? '📈 Hype Boost' : '📉 Hype Penalty'}${Math.abs(popDelta) < 0.002 ? '' : (popDelta >= 0 ? ' · High Fans' : ' · Low Fans')}</p>
          <p class="text-xl font-black" style="color:${eloColor}">${popDelta >= 0 ? '+' : ''}${(popDelta / (r.baseStrength || 1) * 100).toFixed(1)}% Elo</p>
        </div>
      </div>
      <!-- Player popularity breakdown -->
      <div class="mt-3 flex flex-col gap-1.5">
        ${[...Object.entries(S.roster)].filter(([, p]) => p).map(([pos, p]) => {
          const pop    = p.popularity ?? 50;
          // Share of one starter's slot in the team gauge (FANS_TEAM_MAX / 5),
          // so a full player bar and a full team gauge mean the same thing.
          // The old (pop - 35) / 65 window was written for a 0-100 popularity
          // scale; popularity now runs to 350, so it returned up to 484% and
          // pinned every star to a full bar — the breakdown stopped
          // distinguishing anyone. Clamped, because the NAMED overrides
          // deliberately exceed a single slot's share.
          const pct    = Math.max(0, Math.min(100, Math.round((pop / FANS_PLAYER_MAX) * 100)));
          // Was an inline copy of fansBarCol()'s tiers that drifted out of
          // sync with it — its light slate (#94a3b8) rendered these fills at
          // 2.08:1 against the track, under the 3:1 floor for a graphic that
          // carries meaning. Call the real thing so there's one tier ramp.
          const barCol = fansBarCol(pop);
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
    </div>`;
}

function renderSeasonLeadersReportCard() {
  const r = S.result;
  const leaders = r.statLeaders || null;
  const leaderRows = leaders ? [
    { icon: '🏀', label: 'Points',   key: 'ppg', e: leaders.scoring    },
    { icon: '🪃', label: 'Rebounds', key: 'rpg', e: leaders.rebounding },
    { icon: '🎯', label: 'Assists',  key: 'apg', e: leaders.assists    },
    { icon: '🧤', label: 'Steals',   key: 'spg', e: leaders.steals     },
    { icon: '🛡️', label: 'Blocks',   key: 'bpg', e: leaders.blocks     },
  ].filter(row => row.e) : [];
  if (!leaderRows.length) return '';
  return `
    <div class="rounded-2xl border border-border bg-white p-4 card-shadow">
      <div class="flex items-center justify-between mb-2.5">
        <p class="text-[11px] font-bold uppercase tracking-widest text-muted-fg">Season Leaders</p>
        <span class="text-[9px] font-bold text-muted-fg">82-game avg</span>
      </div>
      <div class="flex flex-col gap-[7px]">
        ${leaderRows.map(({ icon, key, e }) => `
          <div class="leaders-row">
            <span class="leaders-row__icon">${icon}</span>
            <span class="leaders-row__name">${e.name}</span>
            <span class="cond leaders-row__val">${e.val.toFixed(1)}</span>
            <span class="leaders-row__key">${key.toUpperCase()}</span>
          </div>`).join('')}
      </div>
    </div>`;
}

// Scaled to 5-starter sums (an elite roster reads ~85-95%): the theoretical
// ceilings in this DB are ~187 ppg / 117 rpg / 59 apg / 16 spg / 20 bpg for
// the five best per category — unreachable simultaneously.
const REPORT_STAT_MAXES = { ppg: 150, rpg: 65, apg: 40, spg: 10, bpg: 10 };
function reportStatBar(key, lbl, val) {
  const pct   = Math.min(100, (val / REPORT_STAT_MAXES[key]) * 100);
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
}

function renderTeamStatsReportCard() {
  const r = S.result;
  const t = r.simTotals || r.totals;
  return `
    <div class="rounded-2xl border border-border bg-white p-4 card-shadow">
      <p class="text-xs font-bold uppercase tracking-widest text-muted-fg mb-4">Team Statistics</p>
      <div class="flex flex-col gap-3">
        ${reportStatBar('ppg', 'Points Per Game',   t.ppg)}
        ${reportStatBar('rpg', 'Rebounds Per Game', t.rpg)}
        ${reportStatBar('apg', 'Assists Per Game',  t.apg)}
        ${reportStatBar('spg', 'Steals Per Game',   t.spg)}
        ${reportStatBar('bpg', 'Blocks Per Game',   t.bpg)}
      </div>
    </div>`;
}

function reportRosterRow(p, posLabel, isStarter, fit, simById) {
  if (!p) return '';
  const fitBg    = fit === 'primary' ? (isDark() ? 'rgba(34,197,94,0.15)' : '#dcfce7') : fit === 'flex' ? (isDark() ? 'rgba(234,179,8,0.15)' : '#fef9c3') : fit ? (isDark() ? 'rgba(239,68,68,0.15)' : '#fef2f2') : null;
  const fitColor = fit === 'primary' ? (isDark() ? '#4ade80' : '#15803d') : fit === 'flex' ? (isDark() ? '#fbbf24' : '#a16207') : fit ? (isDark() ? '#f87171' : '#dc2626') : null;
  const fitText  = fit === 'primary' ? '✓' : fit === 'flex' ? '↔' : fit ? '!' : null;
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
          <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style="background:${ovrColor(p.overall)}18;color:${ovrColor(p.overall)}">OVR ${Math.round(p.overall ?? 0)}</span>
        </div>
      </div>
      <div class="flex gap-3 text-xs text-muted-fg flex-shrink-0">
        <span><span class="font-semibold text-foreground">${fmtPG(s.ppg)}</span> PPG</span>
        <span><span class="font-semibold text-foreground">${fmtPG(s.rpg)}</span> RPG</span>
        <span class="hidden sm:inline"><span class="font-semibold text-foreground">${fmtPG(s.apg)}</span> APG</span>
      </div>
    </div>`;
}

function renderOptimizedLineupReportCard() {
  const r = S.result;
  const simById = Object.fromEntries((r.playerStats || []).map(l => [l.id, l]));
  return `
    <div class="rounded-2xl border border-border bg-white p-4 card-shadow">
      <div class="flex items-center justify-between mb-3">
        <p class="text-xs font-bold uppercase tracking-widest text-muted-fg">Optimized Lineup</p>
        ${r.lineupAssignment?.length === 5 ? (() => {
          const allPrimary = r.lineupAssignment.every(a => a.fit === 'primary');
          const hasOOP     = r.lineupAssignment.some(a => a.fit === 'oop');
          const bg    = allPrimary ? (isDark() ? 'rgba(34,197,94,0.12)' : '#f0fdf4') : hasOOP ? (isDark() ? 'rgba(239,68,68,0.12)' : '#fef2f2') : (isDark() ? 'rgba(234,179,8,0.12)' : '#fefce8');
          const color = allPrimary ? (isDark() ? '#4ade80' : '#15803d') : hasOOP ? (isDark() ? '#f87171' : '#dc2626') : (isDark() ? '#fbbf24' : '#a16207');
          const label = allPrimary ? '🟢 Flawless' : hasOOP ? '🔴 Versatile' : '🟡 Flex Lineup';
          return `<span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full border" style="background:${bg};color:${color};border-color:${color}30">${label}</span>`;
        })() : ''}
      </div>
      <p class="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Starters — Engine Optimal Floor Assignment</p>
      <div class="flex flex-col mb-4">
        ${r.lineupAssignment?.length
          ? r.lineupAssignment.map(({ slot, player, fit }) => reportRosterRow(player, slot, true, fit, simById)).join('')
          : POSITIONS.map(pos => reportRosterRow(S.roster[pos], pos, true, null, simById)).join('')}
      </div>
    </div>`;
}

/** Body-level modal (matches storage.js's leaderboard/daily-stats pattern) —
 *  mounted outside #app so it survives a results-screen re-render untouched
 *  (e.g. if a targeted DOM update ever touches #app while this is open). */
function renderTeamReportModal() {
  return `
  <div id="team-report-backdrop" class="app-modal-backdrop" onclick="if(event.target===this)window.closeTeamReportModal()"
    style="position:fixed;inset:0;background:var(--overlay);z-index:9998;display:flex;
           align-items:center;justify-content:center;padding:16px">
    <div role="dialog" aria-labelledby="team-report-title" aria-modal="true" class="app-modal-panel"
      style="background:var(--card);border:1.5px solid var(--border);border-radius:20px;width:100%;
             max-width:640px;color:var(--fg);
             font-family:'Fira Sans',sans-serif;animation:scaleIn 0.2s ease-out;
             box-shadow:0 20px 60px var(--shadow)">
      <div style="position:sticky;top:0;z-index:1;background:var(--card);display:flex;
                   align-items:center;justify-content:space-between;gap:12px;
                   padding:20px 24px 14px;border-bottom:1px solid var(--border);border-radius:20px 20px 0 0">
        <h2 id="team-report-title" style="font-size:18px;font-weight:900;margin:0;color:var(--fg)">📊 Team Report</h2>
        <button onclick="window.closeTeamReportModal()" aria-label="Close"
          style="background:var(--card2);border:1px solid var(--border);color:var(--muted-fg);
                 border-radius:999px;width:32px;height:32px;font-size:16px;cursor:pointer;
                 display:flex;align-items:center;justify-content:center;flex-shrink:0">✕</button>
      </div>
      <div style="padding:18px 24px 24px;display:flex;flex-direction:column;gap:16px">
        ${renderSeasonImpactReportCard()}
        ${renderAutopsyReportCard()}
        ${renderChemistryReportCard()}
        ${renderFansReportCard()}
        ${renderSeasonLeadersReportCard()}
        ${renderTeamStatsReportCard()}
        ${renderOptimizedLineupReportCard()}
      </div>
    </div>
  </div>`;
}

export function showTeamReportModal() {
  closeTeamReportModal();
  const div = document.createElement('div');
  div.id = 'team-report-root';
  div.innerHTML = renderTeamReportModal();
  document.body.appendChild(div);
  const onKey = e => { if (e.key === 'Escape') closeTeamReportModal(); };
  document.addEventListener('keydown', onKey);
  div._removeKey = () => document.removeEventListener('keydown', onKey);
  const focusable = div.querySelectorAll('button, [tabindex]:not([tabindex="-1"])');
  const first = focusable[0], last = focusable[focusable.length - 1];
  div.addEventListener('keydown', e => {
    if (e.key !== 'Tab' || !first) return;
    if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    }
  });
  first?.focus();
}

export function closeTeamReportModal() {
  const el = document.getElementById('team-report-root');
  if (el) {
    if (el._removeKey) el._removeKey();
    el.remove();
  }
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
          aria-label="Team name for the global leaderboard"
          enterkeyhint="done"
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

// Short round names for tight spots — the bracket's column headers and the
// broadcast band's status line. S.playoffs.roundNames holds the long forms
// ("Conference Quarterfinals") used on the simulate buttons.
const BRACKET_ROUND_LABELS = ['Quarterfinals', 'Semifinals', 'Finals'];

/**
 * One-sentence description of the bracket for assistive tech. The tree is
 * exposed as a single image (its visual structure carries the meaning, and the
 * matchup markup is layout, not a list), so the label has to carry the state a
 * sighted player reads off it — "NBA Playoff bracket" alone said nothing about
 * seed, round, series score or who is still alive.
 */
function bracketAriaLabel(po, display) {
  const bits = [`NBA Playoff bracket, ${BRACKET_ROUND_LABELS.length} rounds`];
  bits.push(`your team is the number ${po.playerSeed} seed`);
  const slots = po.currentRound === 0 ? display.qf
              : po.currentRound === 1 ? display.sf
              : [display.finals];
  const mine  = slots.find(m => m?.top?.isPlayer || m?.bottom?.isPlayer);
  if (display.champion) {
    bits.push(`${display.champion.isPlayer ? 'your team is' : `${display.champion.name} are`} the champion`);
  } else if (po.eliminated) {
    bits.push(`eliminated in the ${po.eliminatedIn}`);
  } else if (mine) {
    const iAmTop = !!mine.top?.isPlayer;
    const opp    = (iAmTop ? mine.bottom : mine.top)?.name;
    const my     = iAmTop ? mine.topScore : mine.bottomScore;
    const theirs = iAmTop ? mine.bottomScore : mine.topScore;
    const round  = BRACKET_ROUND_LABELS[Math.min(po.currentRound, BRACKET_ROUND_LABELS.length - 1)];
    bits.push(my !== null && theirs !== null
      ? `${round} against ${opp ?? 'an opponent'}, series ${my} to ${theirs}`
      : `${round} against ${opp ?? 'an opponent'}`);
  }
  return bits.join(', ') + '.';
}

function renderPlayoffBracketTree(po) {
  const display = getBracketDisplayState(po);
  const { qf, sf, finals, champion } = display;
  const roundLabels = BRACKET_ROUND_LABELS;

  return `
  <div class="playoff-bracket-wrap brk-o">
    <div class="playoff-bracket" role="img" aria-label="${esc(bracketAriaLabel(po, display))}">
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
        ? '🏆 WORLD CHAMPIONS!'
        : po.championTeam
          ? `🏆 ${po.championTeam.name.toUpperCase()} WIN THE TITLE`
          : `💔 ELIMINATED — ${(po.eliminatedIn || '').toUpperCase()}`)
    : 'ROAD TO THE RING';

  // Third segment of the band's sub-line — where the player actually stands
  // right now. Reads off the same display state the bracket renders from, so
  // the sentence and the tree can never disagree.
  const seriesStatus = (() => {
    if (reveal) return '';
    if (po.eliminated) return ` · Eliminated in the ${po.eliminatedIn}`;
    // Short label here — "Conference Quarterfinals, series 3–0" pushed the
    // line onto a second row on every phone.
    const shortRound = BRACKET_ROUND_LABELS[Math.min(po.currentRound, BRACKET_ROUND_LABELS.length - 1)];
    const bd    = getBracketDisplayState(po);
    const slots = po.currentRound === 0 ? bd.qf : po.currentRound === 1 ? bd.sf : [bd.finals];
    const mine  = slots.find(m => m?.top?.isPlayer || m?.bottom?.isPlayer);
    if (!mine) return ` · ${shortRound}`;
    const iAmTop = !!mine.top?.isPlayer;
    const my     = iAmTop ? mine.topScore : mine.bottomScore;
    const theirs = iAmTop ? mine.bottomScore : mine.topScore;
    // The opponent is already named in the bracket directly below — repeating
    // it here only pushed the line onto a second row on phones.
    if (mine.live && my !== null && theirs !== null) {
      return ` · ${shortRound}, ${my === theirs ? `series&nbsp;tied&nbsp;${my}–${theirs}` : `series&nbsp;${my}–${theirs}`}`;
    }
    return ` · ${shortRound}`;
  })();

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
      <div class="w-full max-w-3xl flex flex-col gap-3.5 playoffs-layout">
        <!-- ── Broadcast title band ───────────────────────────────────── -->
        <div class="broadcast-band">
          <p class="broadcast-band__eyebrow">NBA Playoffs</p>
          <h1 class="cond broadcast-band__title">${headline}</h1>
          <p class="broadcast-band__sub">Regular&nbsp;season&nbsp;${r.wins}–${r.losses} · <b>#${po.playerSeed}&nbsp;seed</b>${seriesStatus}</p>
        </div>
        <div class="rounded-2xl border border-border bg-white p-3 sm:p-4 card-shadow overflow-hidden">
          ${renderPlayoffBracketTree(po)}
          <p class="bracket-hint">← swipe the bracket →</p>
        </div>
        ${champBanner}
        <div class="flex flex-col gap-2">
          ${reveal ? `
          <button data-action="playoffs-continue" type="button" class="btn-courtside card-shadow">
            ${po.champion ? 'Continue to Championship 🏆' : 'Continue →'}
          </button>` : `
          <button data-action="sim-next-round" type="button" ${ts || po.currentRound >= 3 ? 'disabled' : ''}
            class="btn-courtside card-shadow dk-po-primary">
            ${ts ? 'Simulating...' : `${simLabel} →`}
          </button>
          <button data-action="sim-all-playoffs" type="button" ${ts || po.currentRound >= 3 ? 'disabled' : ''}
            class="btn-courtside-outline btn-courtside-outline--playoffs card-shadow dk-po-secondary">
            Simulate Entire Playoffs →
          </button>`}
          <button data-action="draft-new-roster" type="button" class="btn-neutral-outline card-shadow dk-po-tertiary">
            Draft New Roster
          </button>
        </div>
      </div>
    </main>
  </div>`;
}

/** One line on the championship screen for the title's own XP award. The
 *  season results screen was rendered before the title existed, so this is the
 *  only place that bonus can be reported. Reads what onPlayoffChampion()
 *  already stored; renders nothing if no award was made. */
function renderTitleXpLine() {
  const a = S.playoffs?.xpTitleAward;
  if (!a) return '';
  const prog = levelProgress(a.xpAfter);
  return `
  <p class="text-sm font-black w-full text-center" style="color:var(--acc)">
    +${a.gain.toLocaleString()} XP — Championship${a.leveledUp ? ` · Level ${a.levelAfter}!` : ` · Level ${prog.level}`}
  </p>`;
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
        ${renderTitleXpLine()}
        ${renderGlobalSubmitCard(true)}
        <div class="flex flex-col gap-3 w-full">
          <button data-action="share" class="py-3 rounded-xl font-bold text-sm bg-primary text-white hover:bg-blue-700 transition-all cursor-pointer card-shadow">Share Championship 🏆</button>
          <button data-action="draft-new-roster" class="py-3 rounded-xl font-bold text-sm border border-border bg-white text-foreground hover:border-primary hover:bg-card2 transition-all cursor-pointer card-shadow">Draft New Roster</button>
        </div>
      </div>
    </main>
  </div>`;
}

function renderEliminated() {
  const po = S.playoffs;
  const r  = S.result;
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
      <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style="background:${ovrColor(p.overall)}18;color:${ovrColor(p.overall)}">${Math.round(p.overall ?? 0)}</span>
      <span class="text-[10px] text-muted-fg">${fmtPG(p.ppg)}pt</span>
    </div>`;
  }).join('');

  // Theme-aware, like every other chemTier badge on the results screens: this
  // sits on a themed card (--surface-sky / --surface-cream), so the fixed
  // light ramp was painting dark-on-dark here.
  const chemBadge = (chemScore) => {
    const tier = chemTier(chemScore);
    const { color: c, bg } = chemTierColors(tier.id, isDark());
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
      ${p ? `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style="background:${ovrColor(p.overall)}18;color:${ovrColor(p.overall)}">${Math.round(p.overall ?? 0)}</span>` : ''}
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
  </div>`;
}

// Phases where the player is actively drafting/simulating, as opposed to a
// menu or a results/summary screen — drives the CrazyGames gameplayStart/Stop
// calls so their platform knows when it's safe to show an ad.
const CG_GAMEPLAY_PHASES = new Set(['drafting', 'playoffs', 'series-sim']);
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
  // dispatches hashchange after first paint to honor #/daily etc. Only a
  // *routable* hash is protected: leaving on any non-empty one meant coming
  // back to the menu from a run left the URL stuck on #/results (or #/draft,
  // #/playoffs) with nothing behind it.
  if (S.phase === 'mode-select' && hasKnownHashRoute()) return;
  const next = HASH_BY_PHASE[S.phase] || '#/';
  if (location.hash !== next) {
    try { history.replaceState(null, '', next); } catch (_) {}
  }
}

/**
 * Wires one team-name input: live character counter plus Enter-to-submit.
 * The submit action is dispatched by clicking the real button so the click
 * delegation in ui/events.js stays the single entry point (and its
 * in-flight guards still apply).
 *
 * @param {string} inputId
 * @param {string} counterId
 * @param {string} submitAction  data-action of the paired submit button
 * @param {boolean} active       false when this field isn't on screen
 */
function wireTeamNameField(inputId, counterId, submitAction, active) {
  if (!active) return;
  const input   = document.getElementById(inputId);
  const counter = document.getElementById(counterId);
  if (!input) return;
  // Mirror what is typed onto S so a re-render (toggling the theme, an
  // unhandled action, a submit error) re-emits it as the field's `value`.
  // Without this every re-render silently wiped a half-typed team name.
  const update = () => {
    S.teamName = input.value.slice(0, 30);
    if (counter) counter.textContent = 30 - input.value.length;
  };
  update();
  input.addEventListener('input', update);
  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    $app.querySelector(`[data-action="${submitAction}"]`)?.click();
  });
}

/**
 * Two scroll behaviours for the draft workspace, both fixes for the same
 * root cause: the game shell is viewport-locked (see css/responsive.css), so
 * the draft panel is the only thing that scrolls and a short phone shows a
 * board that ends mid-row with nothing to say more exists.
 *
 * 1. When a pick lands in the select-then-place state, the instruction
 *    ("tap a roster slot") names a target that can sit below the fold — at
 *    375x667 the C slot rendered 35px past the viewport with the panel still
 *    at scrollTop 0. Bring the roster into view so the thing the player is
 *    told to tap is actually on screen.
 * 2. Otherwise, mark the panel when content remains below so the CSS can
 *    fade its bottom edge — an affordance for a scroll that is only ~42px on
 *    a 667px viewport and is easy to miss entirely.
 *
 * Both are no-ops off the drafting screen and safe when the panel is absent.
 */
function updateDraftPanelScroll() {
  const panel = document.querySelector('.draft-screen__inner');
  if (!panel) return;

  const markOverflow = () => {
    const more = panel.scrollHeight - panel.clientHeight - panel.scrollTop > 8;
    panel.classList.toggle('has-more-below', more);
  };

  // Re-mark as the player scrolls. render() replaces this node wholesale, so
  // the listener goes with the old DOM — nothing to clean up.
  panel.addEventListener('scroll', markOverflow, { passive: true });

  // scrollIntoView on the roster would also scroll the page in browsers that
  // treat the locked shell as scrollable; set scrollTop directly so only this
  // panel moves. The roster is the last thing in the panel, so scrolling to
  // the end is exactly "show the slots".
  if (S.phase === 'drafting' && S.selectedPlayer && panel.querySelector('.draft-roster')) {
    panel.scrollTop = panel.scrollHeight;
  }
  markOverflow();
}

// ── Main render dispatcher ────────────────────────────────────────────────────
export function render() {
  updateCrazyGamesGameplayState();
  neutralizeStaleAdStubs();
  if      (S.phase === 'mode-select')   $app.innerHTML = renderModeSelect();
  else if (S.phase === 'more-modes')    $app.innerHTML = renderMoreModesScreen();
  else if (S.phase === 'drafting')      $app.innerHTML = renderDrafting();
  else if (S.phase === 'results')       $app.innerHTML = renderResults();
  else if (S.phase === 'playoffs')      $app.innerHTML = renderPlayoffs();
  else if (S.phase === 'trophy-room')   $app.innerHTML = renderTrophyRoom();
  else if (S.phase === 'legends')       $app.innerHTML = renderLegends();
  else if (S.phase === 'series-preview') $app.innerHTML = renderSeriesPreview();
  else if (S.phase === 'series-sim')    $app.innerHTML = renderSeriesSim();
  else if (S.phase === 'series-result') $app.innerHTML = renderSeriesResult();
  bindEvents();
  syncHashRoute();
  updateDraftPanelScroll();

  // Character counter + Enter-to-submit for each team-name field. The inputs
  // are not inside a <form>, so Enter did nothing and the only way to submit
  // was to reach for the button — a dead end for keyboard users and a
  // surprise for everyone else. Both listeners live on nodes that render()
  // replaces wholesale, so they are collected with the old DOM; there is
  // nothing to clean up.
  wireTeamNameField('team-name-input', 'team-name-counter', 'save-run',
    S.phase === 'results' && !S.runSaved);
  wireTeamNameField('global-team-name-input', 'global-team-name-counter', 'submit-global',
    !S.globalScoreSubmitted);
  wireTeamNameField('daily-team-name-input', 'daily-team-name-counter', 'submit-daily',
    S.phase === 'results' && S.mode === 'daily' && !S.dailyScoreSubmitted);

  // Community pass-rate for Daily Challenge (mode select + daily results)
  if (
    S.phase === 'mode-select'
    || (S.phase === 'results' && S.mode === 'daily')
  ) {
    hydrateDailyCommunityStats();
  }
}
