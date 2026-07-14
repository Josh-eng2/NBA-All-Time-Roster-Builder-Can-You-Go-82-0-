/**
 * js/utils/storage.js — localStorage Leaderboard & Trophy Room + Global Leaderboard Modal
 *
 * Keys:
 *   nba820_lb       — leaderboard, up to 20 entries, sorted desc by wins
 *   nba820_trophies — trophy room,  up to 12 entries (championships only)
 *
 * Exports:
 *   saveLeaderboard()             — persists current result to leaderboard
 *   saveToTrophyRoom()            — persists current championship to trophy room
 *   showLeaderboardModal()        — renders and mounts the local leaderboard modal
 *   closeLeaderboardModal()       — removes the local modal from the DOM
 *   showGlobalLeaderboardModal()  — renders and mounts the global leaderboard modal
 *   closeGlobalLeaderboardModal() — removes the global modal from the DOM
 *   showGlobalLbTeamDetail(i)     — popup for a global leaderboard entry's roster
 *   closeGlobalLbTeamDetail()     — closes the team detail popup
 *   getDailyStatus()              — { today, playedToday, result } for the Daily Challenge
 *   getDailyStreak()              — { streak, lastPassDate } consecutive-day pass chain
 *   getDailyStats()               — Wordle-style lifetime Daily Challenge stats
 *   markDailyPlayed(entry)        — locks the Daily Challenge for the current UTC day
 *   showDailyLeaderboardModal()   — renders and mounts today's Daily Challenge modal
 *   closeDailyLeaderboardModal()  — removes the daily modal from the DOM
 *   showDailyStatsModal()         — Wordle-style Statistics modal for Daily Challenge
 *   closeDailyStatsModal()        — removes the Statistics modal from the DOM
 *
 * Side-effects:
 *   window.closeLeaderboardModal, window.closeGlobalLeaderboardModal,
 *   window.showGlobalLbTeamDetail, window.closeGlobalLbTeamDetail,
 *   window.switchGlobalLbTab, window.closeDailyLeaderboardModal, and
 *   window.closeDailyStatsModal are set at module load so inline onclick
 *   handlers in modal HTML can call them.
 */

import { S, COACHES, POSITIONS, getUtcDateString } from '../logic/state.js';
import { getLegendCatalog }                      from '../logic/draft.js';
import { fetchLeaderboard, fetchDailyLeaderboard } from '../utils/firebase.js';
import { cgGetItem, cgSetItem }                    from '../utils/crazygames.js';
import { getDailyChallenge }                       from '../logic/challenge.js';

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

// Compact, wrapping row of the 5 stored stat leaders for a leaderboard entry.
// Returns '' for entries saved before per-player stats existed.
function leadersLineHtml(leaders) {
  if (!leaders) return '';
  const cats = [
    ['🏀', leaders.pts], ['🪃', leaders.reb], ['🎯', leaders.ast],
    ['🧤', leaders.stl], ['🛡️', leaders.blk],
  ].filter(([, e]) => e && e.name);
  if (!cats.length) return '';
  const pills = cats.map(([icon, e]) =>
    `<span style="font-size:10px;color:var(--muted-fg);white-space:nowrap">${icon} ${esc(e.name)} ${(+e.val).toFixed(1)}</span>`
  ).join('<span style="color:var(--border)">·</span> ');
  return `<div style="display:flex;flex-wrap:wrap;gap:4px 8px;margin-top:4px">${pills}</div>`;
}

// ── First-visit / returning-player flag ───────────────────────────────────────
// The flag is EARNED, not granted on page load: it's set when the cold-open
// hook delivers its payoff (season starts) or when the player deliberately
// reaches the menus. A first-timer who bounces mid-draft gets the full cold
// open again on their next visit.

const RETURNING_KEY = 'nba820_returning';

export function isReturningPlayer() {
  // Storage blocked → treat as returning so the app falls back to the
  // normal menu flow instead of an inescapable cold-open loop.
  try { return !!cgGetItem(RETURNING_KEY); } catch (e) { return true; }
}

export function markReturning() {
  try { cgSetItem(RETURNING_KEY, '1'); } catch (e) {}
}

// ── Legends collection ────────────────────────────────────────────────────────
// A persistent set of every player id the user has ever STARTED (across solo,
// HoopIQ, and both 1v1 rosters). Survives runs — the "number goes up"
// meta-progression hook.

const LEGENDS_KEY = 'nba820_legends';

/** @returns {Set<string>} the set of collected player ids. */
export function getCollectedLegends() {
  try { return new Set(JSON.parse(cgGetItem(LEGENDS_KEY) || '[]')); }
  catch (e) { return new Set(); }
}

/**
 * Records the given players into the collection.
 * @param {object[]} players  player objects (nulls tolerated)
 * @returns {object[]} the players newly added this call (for the "+N new" banner)
 */
export function recordLegends(players) {
  const collected  = getCollectedLegends();
  const newlyAdded = [];
  const seenThisCall = new Set();
  for (const p of players) {
    if (!p || !p.id || collected.has(p.id) || seenThisCall.has(p.id)) continue;
    seenThisCall.add(p.id);
    collected.add(p.id);
    newlyAdded.push(p);
  }
  if (newlyAdded.length) {
    try { cgSetItem(LEGENDS_KEY, JSON.stringify([...collected])); }
    catch (e) { console.warn('[storage] legends not saved', e); }
  }
  return newlyAdded;
}

// ── Save leaderboard entry ────────────────────────────────────────────────────

/**
 * Compacts the engine's statLeaders into a small, serializable shape for
 * persistence: { pts:{name,val}, reb, ast, stl, blk }. Returns null if the
 * result predates per-player stats.
 */
export function packLeaders(r) {
  const L = r?.statLeaders;
  if (!L) return null;
  const one = e => (e ? { name: e.name, val: e.val } : null);
  return { pts: one(L.scoring), reb: one(L.rebounding), ast: one(L.assists), stl: one(L.steals), blk: one(L.blocks) };
}

export function saveLeaderboard() {
  const r = S.result;
  if (!r) return;
  const entry = {
    date:          new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    teamName:      (S.teamName || '').trim().slice(0, 20) || 'Untitled Team',
    wins:          r.wins,
    losses:        r.losses,
    starters:      POSITIONS.map(p => S.roster[p]?.name || '—').join(', '),
    avgPopularity: r.avgPopularity ?? 50,
    leaders:       packLeaders(r),
  };
  let lb = [];
  try { lb = JSON.parse(cgGetItem('nba820_lb') || '[]'); } catch (e) {}
  lb.push(entry);
  // Tie-breakers: 1° wins  2° Team Popularity
  lb.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return (b.avgPopularity ?? 50) - (a.avgPopularity ?? 50);
  });
  if (lb.length > 20) lb = lb.slice(0, 20);
  try {
    cgSetItem('nba820_lb', JSON.stringify(lb));
  } catch (e) {
    console.warn('[storage] leaderboard not saved', e);
  }
}

// ── Save trophy room entry ────────────────────────────────────────────────────

export function saveToTrophyRoom() {
  const r        = S.result;
  const coachObj = S.coach ? COACHES.find(c => c.id === S.coach) : null;
  const entry = {
    date:        new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    coachName:   coachObj ? coachObj.name   : 'Unknown',
    coachSystem: coachObj ? coachObj.system : '',
    wins:        r.wins,
    losses:      r.losses,
    chemScore:   Math.round(r.chemScore),
    starters:    POSITIONS.map(p => S.roster[p]?.name || '—').join(', '),
  };
  let trophies = [];
  try { trophies = JSON.parse(cgGetItem('nba820_trophies') || '[]'); } catch (e) {}
  trophies.unshift(entry);
  if (trophies.length > 12) trophies = trophies.slice(0, 12);
  try {
    cgSetItem('nba820_trophies', JSON.stringify(trophies));
  } catch (e) {
    console.warn('[storage] trophy room not saved', e);
  }
}

// ── Leaderboard modal ─────────────────────────────────────────────────────────

function renderLeaderboardModal() {
  let lb = [];
  try { lb = JSON.parse(cgGetItem('nba820_lb') || '[]'); } catch (e) {}
  const top5 = lb.slice(0, 5);

  const rows = top5.length === 0
    ? `<p style="font-size:14px;color:var(--muted-fg);text-align:center;padding:24px 0">No runs yet — simulate a season to get on the board!</p>`
    : top5.map((e, i) => {
        const isPerfect = e.wins === 82;
        const rowBg     = isPerfect
          ? 'background:var(--surface-amber);border-color:var(--amber-border)'
          : 'background:var(--card3);border-color:var(--border)';
        const medals    = ['🥇','🥈','🥉','4️⃣','5️⃣'];
        const winsColor = isPerfect ? 'var(--amber-strong)' : 'var(--fg)';
        const name      = esc(e.teamName || 'Untitled Team');
        return `
        <div style="border-radius:12px;border:1.5px solid;padding:12px;display:flex;align-items:center;gap:12px;${rowBg}">
          <span style="font-size:20px;width:28px;text-align:center;flex-shrink:0">${medals[i]}</span>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:2px">
              <span style="font-weight:900;font-size:15px;color:var(--fg);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px">${name}</span>
              ${isPerfect ? '<span style="font-size:10px;font-weight:900;padding:2px 8px;border-radius:999px;background:var(--amber-badge-bg);color:var(--amber-text);border:1px solid var(--amber-border)">🏆 PERFECT</span>' : ''}
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span style="font-weight:900;font-size:16px;color:${winsColor}">${e.wins}–${e.losses}</span>
              <span style="font-size:11px;color:var(--muted-fg)">${e.date}</span>
            </div>
            <p style="font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:3px 0 0">${esc(e.starters || '')}</p>
            ${leadersLineHtml(e.leaders)}
          </div>
        </div>`;
      }).join('');

  return `
  <div id="lb-modal-backdrop" onclick="if(event.target===this)closeLeaderboardModal()"
    style="position:fixed;inset:0;background:var(--overlay);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px">
    <div style="background:var(--card);border:1.5px solid var(--border);border-radius:20px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;padding:24px;font-family:'Fira Sans',sans-serif;color:var(--fg);animation:scaleIn 0.2s ease-out;box-shadow:0 20px 60px var(--shadow)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div>
          <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--primary);margin:0 0 4px">Personal Best</p>
          <h2 style="font-size:22px;font-weight:900;margin:0;color:var(--fg)">Leaderboard</h2>
        </div>
        <button onclick="closeLeaderboardModal()"
          style="background:var(--card2);border:1px solid var(--border);color:var(--muted-fg);border-radius:999px;width:32px;height:32px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">✕</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${rows}
      </div>
      ${lb.length > 5 ? `<p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:14px">${lb.length} total runs tracked</p>` : ''}
    </div>
  </div>`;
}

export function showLeaderboardModal() {
  closeLeaderboardModal();
  const div = document.createElement('div');
  div.id = 'lb-modal-root';
  div.innerHTML = renderLeaderboardModal();
  document.body.appendChild(div);
  const onKey = e => { if (e.key === 'Escape') closeLeaderboardModal(); };
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

export function closeLeaderboardModal() {
  const el = document.getElementById('lb-modal-root');
  if (el) {
    if (el._removeKey) el._removeKey();
    el.remove();
  }
}

// ── Global leaderboard modal ──────────────────────────────────────────────────

const GLOBAL_TABS = [
  { id: 'alltime', label: 'All-Time' },
  { id: '24h',     label: '24 Hours' },
  { id: 'weekly',  label: 'This Week' },
];

let _globalLbCache   = [];
let _playerNameMap   = null;

const FANS_TEAM_MAX  = 500;
const POP_FLOOR      = 35;
const POP_CEIL       = 100;

function _fansBarCol(avg) {
  if (avg >= 80) return '#2563eb';
  if (avg >= 60) return '#d97706';
  return '#94a3b8';
}

function _fansTierFromAvg(avg) {
  if (!avg) return { tier: 'Unknown', barCol: '#94a3b8' };
  return {
    tier:   avg >= 85 ? 'Superstar Lineup' : avg >= 70 ? 'Star Power' : avg >= 55 ? 'Solid Roster' : 'Under the Radar',
    barCol: _fansBarCol(avg),
  };
}

function _formatFansM(fansM) {
  const n = Number(fansM) || 0;
  return n >= 1 ? `${n.toFixed(1)}M` : `${(n * 1000).toFixed(0)}K`;
}

function _fansMFromAvg(avg) {
  const popNorm = Math.max(0, Math.min(1, (avg - POP_FLOOR) / (POP_CEIL - POP_FLOOR)));
  return +(Math.pow(popNorm, 1.5) * 38 + 2).toFixed(1);
}

function _chemStyle(score) {
  const sc = Number(score) || 0;
  if (sc >= 60) return { label: 'Strong',  color: '#16a34a', bg: '#f0fdf4' };
  if (sc >= 40) return { label: 'Neutral', color: '#d97706', bg: '#fffbeb' };
  return { label: 'Weak', color: '#dc2626', bg: '#fef2f2' };
}

function _lookupPlayerByName(name) {
  if (!name || name === '—') return null;
  if (!_playerNameMap) {
    _playerNameMap = new Map();
    const { byDecade, decades } = getLegendCatalog();
    for (const decade of decades) {
      for (const p of byDecade[decade] || []) {
        if (!_playerNameMap.has(p.name)) _playerNameMap.set(p.name, p);
      }
    }
  }
  return _playerNameMap.get(name) || null;
}

function _parseStarterNames(startersStr) {
  if (!startersStr) return [];
  return String(startersStr).split(', ').map(s => s.trim());
}

function _resolveStarterLineup(entry) {
  const names = _parseStarterNames(entry.starters);
  return POSITIONS.map((pos, i) => {
    const name   = names[i] || '—';
    const player = _lookupPlayerByName(name);
    return { pos, name, player };
  });
}

function _teamFansFromEntry(entry, lineup) {
  const players = lineup.map(l => l.player).filter(Boolean);
  let avg = Number(entry.avgPopularity) || 0;
  if (!avg && players.length) {
    avg = players.reduce((s, p) => s + (p.popularity ?? 50), 0) / players.length;
  }
  if (!avg) return null;
  const sum  = players.length
    ? players.reduce((s, p) => s + (p.popularity ?? 50), 0)
    : Math.round(avg * 5);
  const pct  = Math.min(100, Math.round((sum / FANS_TEAM_MAX) * 100));
  const fansM = Number(entry.fansM) > 0 ? Number(entry.fansM) : _fansMFromAvg(avg);
  const { tier, barCol } = _fansTierFromAvg(avg);
  return { avg, sum, pct, fansM, tier, barCol };
}

function _globalLbTeamDetailHtml(entry) {
  const wins      = Number(entry.wins)   || 0;
  const losses    = Number(entry.losses) || 0;
  const chemScore = Number(entry.chemScore) || 0;
  const chem      = _chemStyle(chemScore);
  const lineup    = _resolveStarterLineup(entry);
  const fans      = _teamFansFromEntry(entry, lineup);
  const name      = esc((entry.teamName || 'Untitled Team').slice(0, 30));

  const starterRows = lineup.map(({ pos, name: pName, player }) => {
    const era = player
      ? [player.team, player.decade ? player.decade.replace(/(\d{2})(\d{2})s/, '$2s') : ''].filter(Boolean).join(' ')
      : '';
    return `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:10px;font-weight:900;color:var(--primary);width:24px;flex-shrink:0;font-family:Fira Sans,sans-serif">${pos}</span>
      <div style="flex:1;min-width:0">
        <p style="font-weight:700;font-size:14px;color:var(--fg);margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:Fira Sans,sans-serif">${esc(pName)}</p>
        ${era ? `<p style="font-size:11px;color:var(--muted-fg);margin:2px 0 0;font-family:Fira Sans,sans-serif">${esc(era)}</p>` : ''}
      </div>
    </div>`;
  }).join('');

  const fansHtml = fans ? `
    <div style="margin-top:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted-fg);margin:0;font-family:Fira Sans,sans-serif">Fans</p>
        <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;border:1px solid ${fans.barCol}30;color:${fans.barCol};background:${fans.barCol}18;font-family:Fira Sans,sans-serif">${fans.tier}</span>
      </div>
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px">
        <span style="font-size:22px;font-weight:900;color:var(--fg);font-family:Fira Sans,sans-serif">🌍 ${_formatFansM(fans.fansM)}</span>
        <span style="font-size:11px;color:var(--muted-fg);font-family:Fira Sans,sans-serif">${Math.round(fans.sum)}/${FANS_TEAM_MAX} star power</span>
      </div>
      <div style="height:6px;border-radius:999px;background:var(--border);overflow:hidden">
        <div style="height:100%;width:${fans.pct}%;border-radius:999px;background:${fans.barCol}"></div>
      </div>
    </div>` : `
    <div style="margin-top:16px">
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted-fg);margin:0 0 6px;font-family:Fira Sans,sans-serif">Fans</p>
      <p style="font-size:13px;color:var(--muted-fg);margin:0;font-family:Fira Sans,sans-serif">Not available for this run</p>
    </div>`;

  return `
  <div id="global-lb-detail-backdrop" onclick="if(event.target===this)window.closeGlobalLbTeamDetail()"
    style="position:fixed;inset:0;background:var(--overlay);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px">
    <div style="background:var(--card);border:1.5px solid var(--border);border-radius:20px;width:100%;max-width:420px;max-height:90vh;overflow-y:auto;padding:22px;font-family:Fira Sans,sans-serif;color:var(--fg);animation:scaleIn 0.2s ease-out;box-shadow:0 20px 60px var(--shadow)">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px">
        <div style="min-width:0">
          <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--primary);margin:0 0 4px">Team Breakdown</p>
          <h3 style="font-size:20px;font-weight:900;margin:0;color:var(--fg);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</h3>
          <p style="font-size:14px;font-weight:800;color:var(--fg);margin:6px 0 0;font-family:Fira Sans,sans-serif">${wins}–${losses}${entry.champion ? ' · 🏆 Champ' : ''}</p>
          ${entry.coachName ? `<p style="font-size:12px;color:var(--muted-fg);margin:4px 0 0;font-family:Fira Sans,sans-serif">${esc(entry.coachName)}</p>` : ''}
        </div>
        <button onclick="window.closeGlobalLbTeamDetail()"
          style="background:var(--card2);border:1px solid var(--border);color:var(--muted-fg);border-radius:999px;width:32px;height:32px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">✕</button>
      </div>

      <div style="margin-bottom:4px">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted-fg);margin:0 0 8px;font-family:Fira Sans,sans-serif">Starting 5</p>
        <div>${starterRows}</div>
      </div>

      <div style="margin-top:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted-fg);margin:0;font-family:Fira Sans,sans-serif">Chemistry</p>
          <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;border:1px solid ${chem.color}30;color:${chem.color};background:${chem.bg};font-family:Fira Sans,sans-serif">${chem.label} · ${chemScore}%</span>
        </div>
        <div style="height:6px;border-radius:999px;background:var(--border);overflow:hidden">
          <div style="height:100%;width:${chemScore}%;border-radius:999px;background:${chem.color}"></div>
        </div>
      </div>

      ${fansHtml}
    </div>
  </div>`;
}

function showGlobalLbTeamDetail(index) {
  const entry = _globalLbCache[index];
  if (!entry) return;
  closeGlobalLbTeamDetail();
  const div = document.createElement('div');
  div.id = 'global-lb-detail-root';
  div.innerHTML = _globalLbTeamDetailHtml(entry);
  document.body.appendChild(div);
  const onKey = e => {
    if (e.key === 'Escape') closeGlobalLbTeamDetail();
  };
  document.addEventListener('keydown', onKey);
  div._removeKey = () => document.removeEventListener('keydown', onKey);
}

function closeGlobalLbTeamDetail() {
  const el = document.getElementById('global-lb-detail-root');
  if (el) {
    if (el._removeKey) el._removeKey();
    el.remove();
  }
}

window.showGlobalLbTeamDetail = showGlobalLbTeamDetail;
window.closeGlobalLbTeamDetail = closeGlobalLbTeamDetail;

function _globalLbLoadingHtml() {
  return `
  <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 0;gap:12px">
    <div style="width:28px;height:28px;border:3px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:_spin 0.7s linear infinite"></div>
    <p style="font-size:13px;color:var(--muted-fg);font-family:Fira Sans,sans-serif">Loading leaderboard…</p>
  </div>`;
}

function _globalLbRowsHtml(entries) {
  if (!entries || entries.length === 0) {
    return `<p style="font-size:14px;color:var(--muted-fg);text-align:center;padding:28px 0;font-family:Fira Sans,sans-serif">No runs yet — be the first on the global board!</p>`;
  }
  const medals = ['🥇', '🥈', '🥉'];
  return entries.map((e, i) => {
    // Firestore documents are written by anyone holding the public config, and
    // the security rules don't validate every field — coerce all numerics
    // before they touch innerHTML so a crafted document can't inject markup.
    const wins       = Number(e.wins)      || 0;
    const losses     = Number(e.losses)    || 0;
    const chemScore  = Number(e.chemScore) || 0;
    const isPerfect  = wins === 82;
    const rowBg      = isPerfect ? 'background:var(--surface-amber);border-color:var(--amber-border)' : 'background:var(--card3);border-color:var(--border)';
    const medal      = i < 3
      ? `<span style="font-size:18px">${medals[i]}</span>`
      : `<span style="font-size:12px;font-weight:800;color:var(--muted)">#${i + 1}</span>`;
    const name       = esc((e.teamName || 'Untitled Team').slice(0, 30));
    const winsColor  = isPerfect ? 'var(--amber-strong)' : wins >= 70 ? '#16a34a' : wins >= 50 ? 'var(--primary)' : 'var(--fg)';
    const champBadge = e.champion
      ? `<span style="font-size:10px;font-weight:900;padding:2px 7px;border-radius:999px;background:var(--amber-badge-bg);color:var(--amber-text);border:1px solid var(--amber-border);white-space:nowrap">🏆 CHAMP</span>`
      : '';
    const perfectBadge = isPerfect && !e.champion
      ? `<span style="font-size:10px;font-weight:900;padding:2px 7px;border-radius:999px;background:var(--amber-badge-bg);color:var(--amber-text);border:1px solid var(--amber-border);white-space:nowrap">82–0</span>`
      : '';
    return `
    <div role="button" tabindex="0" data-global-lb-index="${i}"
      onclick="window.showGlobalLbTeamDetail(${i})"
      onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.showGlobalLbTeamDetail(${i})}"
      title="View starting 5, chemistry & fans"
      style="border-radius:12px;border:1.5px solid;padding:10px 12px;display:flex;align-items:center;gap:10px;${rowBg};cursor:pointer;transition:box-shadow 0.15s,border-color 0.15s"
      onmouseover="this.style.boxShadow='0 2px 8px var(--shadow)'"
      onmouseout="this.style.boxShadow='none'">
      <div style="width:28px;text-align:center;flex-shrink:0">${medal}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:2px;flex-wrap:wrap">
          <span style="font-weight:900;font-size:14px;color:var(--fg);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:150px;font-family:Fira Sans,sans-serif">${name}</span>
          ${champBadge}${perfectBadge}
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-weight:900;font-size:15px;color:${winsColor};font-family:Fira Sans,sans-serif">${wins}–${losses}</span>
          ${e.coachName ? `<span style="font-size:11px;color:var(--muted-fg);font-family:Fira Sans,sans-serif">${esc(e.coachName)}</span>` : ''}
          ${e.era && e.era !== 'all' ? `<span style="font-size:11px;color:var(--muted);font-family:Fira Sans,sans-serif">${esc(e.era)}</span>` : ''}
        </div>
        ${e.starters ? `<p style="font-size:10px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:2px 0 0;font-family:Fira Sans,sans-serif">${esc(e.starters)}</p>` : ''}
      </div>
      <div style="text-align:right;flex-shrink:0">
        <p style="font-size:10px;color:var(--muted);margin:0 0 2px;font-family:Fira Sans,sans-serif">CHEM</p>
        <p style="font-size:13px;font-weight:800;color:var(--primary);margin:0;font-family:Fira Sans,sans-serif">${chemScore}%</p>
      </div>
    </div>`;
  }).join('');
}

function _globalModalShellHtml(activeTab) {
  const tabsHtml = GLOBAL_TABS.map(t => `
    <button id="global-lb-tab-${t.id}"
      onclick="window.switchGlobalLbTab('${t.id}')"
      style="flex:1;padding:7px 4px;border-radius:8px;border:none;cursor:pointer;transition:background 0.15s,color 0.15s;
             font-family:Fira Sans,sans-serif;font-size:12px;font-weight:700;
             background:${activeTab === t.id ? 'var(--primary)' : 'var(--card2)'};
             color:${activeTab === t.id ? 'var(--primary-fg)' : 'var(--muted-fg)'}">
      ${t.label}
    </button>`).join('');

  return `
  <div id="global-lb-modal-backdrop" onclick="if(event.target===this)window.closeGlobalLeaderboardModal()"
    style="position:fixed;inset:0;background:var(--overlay);z-index:9998;display:flex;
           align-items:center;justify-content:center;padding:16px">
    <div style="background:var(--card);border:1.5px solid var(--border);border-radius:20px;width:100%;
                max-width:520px;max-height:90vh;overflow-y:auto;padding:24px;
                font-family:Fira Sans,sans-serif;color:var(--fg);
                animation:scaleIn 0.2s ease-out;box-shadow:0 20px 60px var(--shadow)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div>
          <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--primary);margin:0 0 4px">Global Competition</p>
          <h2 style="font-size:22px;font-weight:900;margin:0;color:var(--fg)">🌍 Global Leaderboard</h2>
        </div>
        <button onclick="window.closeGlobalLeaderboardModal()"
          style="background:var(--card2);border:1px solid var(--border);color:var(--muted-fg);border-radius:999px;
                 width:32px;height:32px;font-size:16px;cursor:pointer;display:flex;
                 align-items:center;justify-content:center;flex-shrink:0">✕</button>
      </div>
      <div style="display:flex;gap:5px;padding:4px;background:var(--card2);border-radius:10px;margin-bottom:16px">
        ${tabsHtml}
      </div>
      <div id="global-lb-table" style="display:flex;flex-direction:column;gap:8px">
        ${_globalLbLoadingHtml()}
      </div>
      <p style="text-align:center;font-size:11px;color:var(--muted-fg);margin:12px 0 0;font-family:Fira Sans,sans-serif">Tap a team to view starting 5, chemistry &amp; fans</p>
    </div>
  </div>`;
}

async function _loadGlobalLb(tab) {
  try {
    const entries  = await fetchLeaderboard(tab);
    _globalLbCache = entries;
    const tableEl  = document.getElementById('global-lb-table');
    if (tableEl) tableEl.innerHTML = _globalLbRowsHtml(entries);
  } catch (err) {
    const tableEl = document.getElementById('global-lb-table');
    const isPermission = err.message.includes('permission') || err.message.includes('Permission') || err.message.includes('PERMISSION');
    const msg     = err.message.includes('not configured')
      ? 'Firebase not set up yet — see <code>js/utils/firebase.js</code> for instructions.'
      : isPermission
        ? 'Firestore permission denied — open Firebase Console → Firestore → Rules and publish the allow-read rule. <button onclick="window.switchGlobalLbTab(\'' + tab + '\')" style="text-decoration:underline;cursor:pointer;font-family:Fira Sans,sans-serif">Retry</button>'
        : 'Failed to load — check your connection. <button onclick="window.switchGlobalLbTab(\'' + tab + '\')" style="text-decoration:underline;cursor:pointer;font-family:Fira Sans,sans-serif">Retry</button>';
    if (tableEl) tableEl.innerHTML = `<p style="color:#dc2626;font-size:13px;text-align:center;padding:24px 0;font-family:Fira Sans,sans-serif">${msg}</p>`;
  }
}

// Exposed on window so inline onclick in the modal (outside #app) can call it
window.switchGlobalLbTab = function (tab) {
  GLOBAL_TABS.forEach(t => {
    const btn = document.getElementById(`global-lb-tab-${t.id}`);
    if (!btn) return;
    // CSS vars, not hardcoded hexes — must match the shell HTML in dark mode
    btn.style.background = t.id === tab ? 'var(--primary)'    : 'var(--card2)';
    btn.style.color      = t.id === tab ? 'var(--primary-fg)' : 'var(--muted-fg)';
  });
  const tableEl = document.getElementById('global-lb-table');
  if (tableEl) tableEl.innerHTML = _globalLbLoadingHtml();
  _loadGlobalLb(tab);
};

export function showGlobalLeaderboardModal(tab = 'alltime') {
  closeGlobalLeaderboardModal();
  const div  = document.createElement('div');
  div.id     = 'global-lb-modal-root';
  div.innerHTML = _globalModalShellHtml(tab);
  document.body.appendChild(div);
  const onKey = e => {
    if (e.key === 'Escape') {
      if (document.getElementById('global-lb-detail-root')) closeGlobalLbTeamDetail();
      else closeGlobalLeaderboardModal();
    }
  };
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
  _loadGlobalLb(tab);
}

export function closeGlobalLeaderboardModal() {
  closeGlobalLbTeamDetail();
  const el = document.getElementById('global-lb-modal-root');
  if (el) {
    if (el._removeKey) el._removeKey();
    el.remove();
  }
}

// ── Daily Challenge — local lock/recap + leaderboard modal ────────────────────

const DAILY_KEY = 'nba820_daily_last';

/** @returns {{ today: string, playedToday: boolean, result: object|null }} */
export function getDailyStatus() {
  const today = getUtcDateString();
  let last = null;
  try { last = JSON.parse(cgGetItem(DAILY_KEY) || 'null'); } catch (e) {}
  const playedToday = !!(last && last.date === today);
  return { today, playedToday, result: playedToday ? last : null };
}

const DAILY_STREAK_KEY = 'nba820_dailyStreak';
const DAILY_STATS_KEY  = 'nba820_dailyStats';

/** Season-win bins for the Wordle-style distribution chart (6 rows). */
export const DAILY_WIN_BINS = [
  { key: '0-39',  label: '0–39',  min: 0,  max: 39 },
  { key: '40-49', label: '40–49', min: 40, max: 49 },
  { key: '50-59', label: '50–59', min: 50, max: 59 },
  { key: '60-69', label: '60–69', min: 60, max: 69 },
  { key: '70-79', label: '70–79', min: 70, max: 79 },
  { key: '80-82', label: '80–82', min: 80, max: 82 },
];

function _emptyDailyDist() {
  const d = {};
  for (const b of DAILY_WIN_BINS) d[b.key] = 0;
  return d;
}

function _binKeyForWins(wins) {
  const w = Math.max(0, Math.min(82, Number(wins) || 0));
  for (const b of DAILY_WIN_BINS) {
    if (w >= b.min && w <= b.max) return b.key;
  }
  return '0-39';
}

/** @returns {{ streak: number, lastPassDate: string|null }} consecutive-day challenge passes */
export function getDailyStreak() {
  try { return JSON.parse(cgGetItem(DAILY_STREAK_KEY) || 'null') || { streak: 0, lastPassDate: null }; }
  catch (e) { return { streak: 0, lastPassDate: null }; }
}

/** UTC day before the given 'YYYY-MM-DD'. */
function _dayBefore(dateStr) {
  return new Date(Date.parse(dateStr + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
}

/**
 * The streak as it stands RIGHT NOW: the stored value only counts if the
 * last pass was today or yesterday. Without this, skipping a day kept
 * showing the old 🔥 count on the mode card until the next play quietly
 * zeroed it — the display and the math disagreed.
 * @returns {number}
 */
export function currentDailyStreak(today = getUtcDateString()) {
  const s = getDailyStreak();
  if (!s.lastPassDate) return 0;
  return (s.lastPassDate === today || s.lastPassDate === _dayBefore(today)) ? s.streak : 0;
}

/**
 * Lifetime Daily Challenge stats (Wordle-style).
 * Soft-migrates today's locked result into lifetime totals if stats were
 * added after the player already finished the day.
 * @returns {{ played: number, wins: number, currentStreak: number, maxStreak: number, lastPlayedDate: string|null, distribution: Record<string, number> }}
 */
export function getDailyStats() {
  // Live value — a stored streak stops counting once a day has been skipped
  // (see currentDailyStreak), so the Statistics modal never shows a dead 🔥.
  const liveStreak = currentDailyStreak();
  let stats = null;
  try { stats = JSON.parse(cgGetItem(DAILY_STATS_KEY) || 'null'); } catch (e) {}
  if (!stats || typeof stats !== 'object') {
    stats = {
      played: 0,
      wins: 0,
      currentStreak: liveStreak,
      maxStreak: liveStreak,
      lastPlayedDate: null,
      distribution: _emptyDailyDist(),
    };
  } else {
    const dist = { ..._emptyDailyDist(), ...(stats.distribution || {}) };
    const currentStreak = liveStreak;
    const storedMax = Number(stats.maxStreak);
    const maxStreak = Math.max(
      Number.isFinite(storedMax) ? Math.max(0, storedMax) : 0,
      Number(stats.currentStreak) || 0,
      currentStreak,
    );
    stats = {
      played:        Math.max(0, Number(stats.played) || 0),
      wins:          Math.max(0, Number(stats.wins) || 0),
      currentStreak,
      maxStreak,
      lastPlayedDate: stats.lastPlayedDate || null,
      distribution:  dist,
    };
  }

  // If today's daily is already locked but never recorded into lifetime
  // stats (upgrade mid-day), fold it in once.
  const status = getDailyStatus();
  if (status.playedToday && status.result && stats.lastPlayedDate !== status.today) {
    stats.played += 1;
    if (status.result.passed) stats.wins += 1;
    const bin = _binKeyForWins(status.result.wins);
    stats.distribution[bin] = (stats.distribution[bin] || 0) + 1;
    stats.lastPlayedDate = status.today;
    stats.currentStreak = liveStreak;
    if (stats.currentStreak > stats.maxStreak) stats.maxStreak = stats.currentStreak;
    try {
      cgSetItem(DAILY_STATS_KEY, JSON.stringify({
        played: stats.played,
        wins: stats.wins,
        currentStreak: stats.currentStreak,
        maxStreak: stats.maxStreak,
        lastPlayedDate: stats.lastPlayedDate,
        distribution: stats.distribution,
      }));
    } catch (e) {}
  }

  return stats;
}

/**
 * Locks the Daily Challenge for the day the run BELONGS TO, stores a compact
 * recap for the mode-select card, updates the pass streak (consecutive UTC
 * days passed chain; a failed day resets to 0), and accumulates lifetime
 * stats.
 *
 * `date` must be the challenge date the run was started/seeded with
 * (S.dailyDate) — NOT the wall clock at sim time. A run started at 23:50 UTC
 * that finishes at 00:05 belongs to the old day; stamping the new day here
 * used to burn the NEXT day's attempt while leaving the played day unlocked,
 * and credited the streak to the wrong date.
 *
 * @returns {number} the streak after this result
 */
export function markDailyPlayed({ date, wins, losses, chemScore, champion, challengeId = null, passed = false, score = 0 }) {
  const day = (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) ? date : getUtcDateString();
  try {
    cgSetItem(DAILY_KEY, JSON.stringify({
      date: day, wins, losses, chemScore, champion, challengeId, passed, score, at: Date.now(),
    }));
  } catch (e) {}

  let streakVal = 0;
  try {
    const s = getDailyStreak();
    if (passed) {
      if (s.lastPassDate !== day) { // idempotent for a same-day double-call
        s.streak       = s.lastPassDate === _dayBefore(day) ? s.streak + 1 : 1;
        s.lastPassDate = day;
      }
    } else {
      s.streak = 0;
    }
    cgSetItem(DAILY_STREAK_KEY, JSON.stringify(s));
    streakVal = s.streak;
  } catch (e) { streakVal = 0; }

  try {
    const stats = getDailyStats();
    if (stats.lastPlayedDate !== day) {
      stats.played += 1;
      if (passed) stats.wins += 1;
      const bin = _binKeyForWins(wins);
      stats.distribution[bin] = (stats.distribution[bin] || 0) + 1;
      stats.lastPlayedDate = day;
    }
    stats.currentStreak = streakVal;
    if (streakVal > stats.maxStreak) stats.maxStreak = streakVal;
    cgSetItem(DAILY_STATS_KEY, JSON.stringify({
      played: stats.played,
      wins: stats.wins,
      currentStreak: stats.currentStreak,
      maxStreak: stats.maxStreak,
      lastPlayedDate: stats.lastPlayedDate,
      distribution: stats.distribution,
    }));
  } catch (e) {}

  return streakVal;
}

function _dailyLbRowsHtml(entries) {
  if (!entries || entries.length === 0) {
    return `<p style="font-size:14px;color:var(--muted-fg);text-align:center;padding:28px 0;font-family:Fira Sans,sans-serif">No runs yet — be the first on today's board!</p>`;
  }
  const medals = ['🥇', '🥈', '🥉'];
  return entries.map((e, i) => {
    // Same defense-in-depth numeric coercion as _globalLbRowsHtml — Firestore
    // rules validate shape but a crafted document must never reach innerHTML raw.
    const wins       = Number(e.wins)      || 0;
    const losses     = Number(e.losses)    || 0;
    const chemScore  = Number(e.chemScore) || 0;
    const isPerfect  = wins === 82;
    const rowBg      = isPerfect ? 'background:var(--surface-amber);border-color:var(--amber-border)' : 'background:var(--card3);border-color:var(--border)';
    const medal      = i < 3
      ? `<span style="font-size:18px">${medals[i]}</span>`
      : `<span style="font-size:12px;font-weight:800;color:var(--muted)">#${i + 1}</span>`;
    const name       = esc((e.teamName || 'Untitled Team').slice(0, 30));
    const winsColor  = isPerfect ? 'var(--amber-strong)' : wins >= 70 ? '#16a34a' : wins >= 50 ? 'var(--primary)' : 'var(--fg)';
    const champBadge = e.champion
      ? `<span style="font-size:10px;font-weight:900;padding:2px 7px;border-radius:999px;background:var(--amber-badge-bg);color:var(--amber-text);border:1px solid var(--amber-border);white-space:nowrap">🏆 CHAMP</span>`
      : '';
    const perfectBadge = isPerfect && !e.champion
      ? `<span style="font-size:10px;font-weight:900;padding:2px 7px;border-radius:999px;background:var(--amber-badge-bg);color:var(--amber-text);border:1px solid var(--amber-border);white-space:nowrap">82–0</span>`
      : '';
    // Challenge verdict — entries written before the challenge system lack
    // the field entirely and show no badge.
    const passBadge = ('passed' in e)
      ? (e.passed
          ? `<span style="font-size:10px;font-weight:900;padding:2px 7px;border-radius:999px;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;white-space:nowrap">✅ PASSED</span>`
          : `<span style="font-size:10px;font-weight:900;padding:2px 7px;border-radius:999px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;white-space:nowrap">✗ FAILED</span>`)
      : '';
    return `
    <div style="border-radius:12px;border:1.5px solid;padding:10px 12px;display:flex;align-items:center;gap:10px;${rowBg}">
      <div style="width:28px;text-align:center;flex-shrink:0">${medal}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:2px;flex-wrap:wrap">
          <span style="font-weight:900;font-size:14px;color:var(--fg);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:150px;font-family:Fira Sans,sans-serif">${name}</span>
          ${champBadge}${perfectBadge}${passBadge}
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-weight:900;font-size:15px;color:${winsColor};font-family:Fira Sans,sans-serif">${wins}–${losses}</span>
          ${e.coachName ? `<span style="font-size:11px;color:var(--muted-fg);font-family:Fira Sans,sans-serif">${esc(e.coachName)}</span>` : ''}
        </div>
        ${e.starters ? `<p style="font-size:10px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:2px 0 0;font-family:Fira Sans,sans-serif">${esc(e.starters)}</p>` : ''}
      </div>
      <div style="text-align:right;flex-shrink:0">
        <p style="font-size:10px;color:var(--muted);margin:0 0 2px;font-family:Fira Sans,sans-serif">CHEM</p>
        <p style="font-size:13px;font-weight:800;color:var(--primary);margin:0;font-family:Fira Sans,sans-serif">${chemScore}%</p>
      </div>
    </div>`;
  }).join('');
}

function _dailyModalShellHtml(dateLabel) {
  const ch = getDailyChallenge(getUtcDateString());
  return `
  <div id="daily-lb-modal-backdrop" onclick="if(event.target===this)window.closeDailyLeaderboardModal()"
    style="position:fixed;inset:0;background:var(--overlay);z-index:9998;display:flex;
           align-items:center;justify-content:center;padding:16px">
    <div style="background:var(--card);border:1.5px solid var(--border);border-radius:20px;width:100%;
                max-width:520px;max-height:90vh;overflow-y:auto;padding:24px;
                font-family:Fira Sans,sans-serif;color:var(--fg);
                animation:scaleIn 0.2s ease-out;box-shadow:0 20px 60px var(--shadow)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div>
          <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--primary);margin:0 0 4px">${dateLabel}</p>
          <h2 style="font-size:22px;font-weight:900;margin:0;color:var(--fg)">🗓️ Daily Challenge</h2>
          <p style="font-size:12px;font-weight:700;color:var(--muted-fg);margin:6px 0 0">${ch.emoji} ${ch.title} — <span style="font-weight:500">${ch.desc}</span></p>
        </div>
        <button onclick="window.closeDailyLeaderboardModal()"
          style="background:var(--card2);border:1px solid var(--border);color:var(--muted-fg);border-radius:999px;
                 width:32px;height:32px;font-size:16px;cursor:pointer;display:flex;
                 align-items:center;justify-content:center;flex-shrink:0">✕</button>
      </div>
      <div id="daily-lb-table" style="display:flex;flex-direction:column;gap:8px">
        ${_globalLbLoadingHtml()}
      </div>
      <p style="text-align:center;font-size:11px;color:var(--muted-fg);margin:12px 0 0;font-family:Fira Sans,sans-serif">Everyone drafts from the same board today — only your picks and your season differ</p>
    </div>
  </div>`;
}

async function _loadDailyLb(date) {
  const tableEl = document.getElementById('daily-lb-table');
  if (tableEl) tableEl.innerHTML = _globalLbLoadingHtml();
  try {
    const entries = await fetchDailyLeaderboard(date);
    if (tableEl) tableEl.innerHTML = _dailyLbRowsHtml(entries);
  } catch (err) {
    const isPermission = err.message.includes('permission') || err.message.includes('Permission') || err.message.includes('PERMISSION');
    const msg = err.message.includes('not configured')
      ? 'Firebase not set up yet — see <code>js/utils/firebase.js</code> for instructions.'
      : isPermission
        ? 'Firestore permission denied — open Firebase Console → Firestore → Rules and publish the dailyLeaderboard rule.'
        : 'Failed to load — check your connection. <button onclick="window._retryDailyLb()" style="text-decoration:underline;cursor:pointer;font-family:Fira Sans,sans-serif">Retry</button>';
    if (tableEl) tableEl.innerHTML = `<p style="color:#dc2626;font-size:13px;text-align:center;padding:24px 0;font-family:Fira Sans,sans-serif">${msg}</p>`;
  }
}
window._retryDailyLb = () => _loadDailyLb(getUtcDateString());

export function showDailyLeaderboardModal() {
  closeDailyLeaderboardModal();
  const today = getUtcDateString();
  const dateLabel = new Date(today + 'T00:00:00Z')
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const div  = document.createElement('div');
  div.id     = 'daily-lb-modal-root';
  div.innerHTML = _dailyModalShellHtml(dateLabel);
  document.body.appendChild(div);
  const onKey = e => { if (e.key === 'Escape') closeDailyLeaderboardModal(); };
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
  _loadDailyLb(today);
}

export function closeDailyLeaderboardModal() {
  const el = document.getElementById('daily-lb-modal-root');
  if (el) {
    if (el._removeKey) el._removeKey();
    el.remove();
  }
}

// ── Daily Challenge — Wordle-style Statistics modal ───────────────────────────

function _dailyStatsBodyHtml() {
  const stats   = getDailyStats();
  const status  = getDailyStatus();
  const winPct  = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
  const todayWins = status.playedToday ? Number(status.result?.wins) : null;
  const todayBin  = todayWins != null ? _binKeyForWins(todayWins) : null;
  const maxCount  = Math.max(1, ...DAILY_WIN_BINS.map(b => stats.distribution[b.key] || 0));

  const cells = [
    { value: stats.played,        label: 'Played' },
    { value: winPct,              label: 'Win %' },
    { value: stats.currentStreak, label: 'Current<br>Streak' },
    { value: stats.maxStreak,     label: 'Max<br>Streak' },
  ].map(c => `
    <div style="text-align:center;flex:1;min-width:0">
      <p style="font-size:36px;font-weight:700;line-height:1;margin:0;color:var(--fg);font-family:Fira Sans,sans-serif">${c.value}</p>
      <p style="font-size:11px;font-weight:600;line-height:1.2;margin:6px 0 0;color:var(--muted-fg);text-transform:uppercase;letter-spacing:0.04em;font-family:Fira Sans,sans-serif">${c.label}</p>
    </div>`).join('');

  const bars = DAILY_WIN_BINS.map(b => {
    const count = stats.distribution[b.key] || 0;
    const pct   = Math.max(count > 0 ? 8 : 7, Math.round((count / maxCount) * 100));
    const isToday = todayBin === b.key;
    const barBg = isToday ? '#ea580c' : (count > 0 ? 'var(--muted-fg)' : 'var(--muted)');
    return `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
      <span style="width:42px;flex-shrink:0;font-size:13px;font-weight:700;color:var(--fg);text-align:right;font-family:Fira Sans,sans-serif">${b.label}</span>
      <div style="flex:1;min-width:0;display:flex">
        <div style="background:${barBg};color:#fff;font-size:12px;font-weight:700;line-height:1;padding:4px 6px;
                    min-width:${count > 0 ? '20px' : '18px'};width:${pct}%;max-width:100%;
                    display:flex;align-items:center;justify-content:flex-end;
                    font-family:Fira Sans,sans-serif;border-radius:2px;box-sizing:border-box">${count}</div>
      </div>
    </div>`;
  }).join('');

  return `
  <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:28px;padding:0 4px">
    ${cells}
  </div>
  <p style="font-size:14px;font-weight:800;text-align:center;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 12px;color:var(--fg);font-family:Fira Sans,sans-serif">Win Distribution</p>
  <div style="padding:0 4px">${bars}</div>
  ${stats.played === 0
    ? `<p style="text-align:center;font-size:12px;color:var(--muted-fg);margin:16px 0 0;font-family:Fira Sans,sans-serif">Play today's Daily Challenge to start tracking stats.</p>`
    : ''}`;
}

export function showDailyStatsModal() {
  closeDailyStatsModal();
  const div = document.createElement('div');
  div.id = 'daily-stats-modal-root';
  div.innerHTML = `
  <div id="daily-stats-modal-backdrop" onclick="if(event.target===this)window.closeDailyStatsModal()"
    style="position:fixed;inset:0;background:var(--overlay);z-index:9998;display:flex;
           align-items:center;justify-content:center;padding:16px">
    <div role="dialog" aria-labelledby="daily-stats-title" aria-modal="true"
      style="background:var(--card);border:1.5px solid var(--border);border-radius:20px;width:100%;
             max-width:380px;max-height:90vh;overflow-y:auto;padding:28px 24px 24px;
             font-family:Fira Sans,sans-serif;color:var(--fg);
             animation:scaleIn 0.2s ease-out;box-shadow:0 20px 60px var(--shadow)">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px">
        <h2 id="daily-stats-title" style="font-size:16px;font-weight:800;margin:0;letter-spacing:0.12em;
                   text-transform:uppercase;color:var(--fg);width:100%;text-align:center;padding-left:32px">Statistics</h2>
        <button onclick="window.closeDailyStatsModal()" aria-label="Close"
          style="background:var(--card2);border:1px solid var(--border);color:var(--muted-fg);border-radius:999px;
                 width:32px;height:32px;font-size:16px;cursor:pointer;display:flex;
                 align-items:center;justify-content:center;flex-shrink:0;margin-left:-32px">✕</button>
      </div>
      ${_dailyStatsBodyHtml()}
    </div>
  </div>`;
  document.body.appendChild(div);
  const onKey = e => { if (e.key === 'Escape') closeDailyStatsModal(); };
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

export function closeDailyStatsModal() {
  const el = document.getElementById('daily-stats-modal-root');
  if (el) {
    if (el._removeKey) el._removeKey();
    el.remove();
  }
}

