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
 *
 * Side-effects:
 *   window.closeLeaderboardModal, window.closeGlobalLeaderboardModal,
 *   and window.switchGlobalLbTab are set at module load so inline
 *   onclick handlers in modal HTML can call them.
 */

import { S, COACHES, POSITIONS, BENCH_POSITIONS } from '../logic/state.js';
import { fetchLeaderboard }                        from '../utils/firebase.js';

// ── Save leaderboard entry ────────────────────────────────────────────────────

export function saveLeaderboard() {
  const r = S.result;
  if (!r) return;
  const entry = {
    date:     new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    teamName: (S.teamName || '').trim().slice(0, 20) || 'Untitled Team',
    wins:     r.wins,
    losses:   r.losses,
    starters: POSITIONS.map(p => S.roster[p]?.name || '—').join(', '),
  };
  let lb = [];
  try { lb = JSON.parse(localStorage.getItem('nba820_lb') || '[]'); } catch (e) {}
  lb.push(entry);
  lb.sort((a, b) => b.wins - a.wins);
  if (lb.length > 20) lb = lb.slice(0, 20);
  try { localStorage.setItem('nba820_lb', JSON.stringify(lb)); } catch (e) {}
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
    bench:       BENCH_POSITIONS.map(p => S.roster[p]?.name || '—').join(', '),
  };
  let trophies = [];
  try { trophies = JSON.parse(localStorage.getItem('nba820_trophies') || '[]'); } catch (e) {}
  trophies.unshift(entry);
  if (trophies.length > 12) trophies = trophies.slice(0, 12);
  try { localStorage.setItem('nba820_trophies', JSON.stringify(trophies)); } catch (e) {}
}

// ── Leaderboard modal ─────────────────────────────────────────────────────────

function renderLeaderboardModal() {
  let lb = [];
  try { lb = JSON.parse(localStorage.getItem('nba820_lb') || '[]'); } catch (e) {}
  const top5 = lb.slice(0, 5);

  const rows = top5.length === 0
    ? `<p style="font-size:14px;color:#64748b;text-align:center;padding:24px 0">No runs yet — simulate a season to get on the board!</p>`
    : top5.map((e, i) => {
        const isPerfect = e.wins === 82;
        const rowBg     = isPerfect
          ? 'background:#fffbeb;border-color:#fcd34d'
          : 'background:#f8fafc;border-color:#e2e8f0';
        const medals    = ['🥇','🥈','🥉','4️⃣','5️⃣'];
        const rankColor = i === 0 ? '#2563eb' : '#94a3b8';
        const winsColor = isPerfect ? '#b45309' : '#0f172a';
        const name      = e.teamName || 'Untitled Team';
        return `
        <div style="border-radius:12px;border:1.5px solid;padding:12px;display:flex;align-items:center;gap:12px;${rowBg}">
          <span style="font-size:20px;width:28px;text-align:center;flex-shrink:0">${medals[i]}</span>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:2px">
              <span style="font-weight:900;font-size:15px;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px">${name}</span>
              ${isPerfect ? '<span style="font-size:10px;font-weight:900;padding:2px 8px;border-radius:999px;background:#fef3c7;color:#92400e;border:1px solid #fcd34d">🏆 PERFECT</span>' : ''}
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span style="font-weight:900;font-size:16px;color:${winsColor}">${e.wins}–${e.losses}</span>
              <span style="font-size:11px;color:#64748b">${e.date}</span>
            </div>
            <p style="font-size:11px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:3px 0 0">${e.starters}</p>
          </div>
        </div>`;
      }).join('');

  return `
  <div id="lb-modal-backdrop" onclick="if(event.target===this)closeLeaderboardModal()"
    style="position:fixed;inset:0;background:rgba(15,23,42,0.5);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px">
    <div style="background:#ffffff;border:1.5px solid #e2e8f0;border-radius:20px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;padding:24px;font-family:'Fira Sans',sans-serif;color:#0f172a;animation:scaleIn 0.2s ease-out;box-shadow:0 20px 60px rgba(0,0,0,0.12)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div>
          <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#2563eb;margin:0 0 4px">Personal Best</p>
          <h2 style="font-size:22px;font-weight:900;margin:0;color:#0f172a">Hall of Fame</h2>
        </div>
        <button onclick="closeLeaderboardModal()"
          style="background:#f1f5f9;border:1px solid #e2e8f0;color:#64748b;border-radius:999px;width:32px;height:32px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">✕</button>
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

function _globalLbLoadingHtml() {
  return `
  <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 0;gap:12px">
    <div style="width:28px;height:28px;border:3px solid #e2e8f0;border-top-color:#2563eb;border-radius:50%;animation:_spin 0.7s linear infinite"></div>
    <p style="font-size:13px;color:#64748b;font-family:Fira Sans,sans-serif">Loading leaderboard…</p>
  </div>`;
}

function _globalLbRowsHtml(entries) {
  if (!entries || entries.length === 0) {
    return `<p style="font-size:14px;color:#64748b;text-align:center;padding:28px 0;font-family:Fira Sans,sans-serif">No runs yet — be the first on the global board!</p>`;
  }
  const medals = ['🥇', '🥈', '🥉'];
  return entries.map((e, i) => {
    const isPerfect  = e.wins === 82;
    const rowBg      = isPerfect ? 'background:#fffbeb;border-color:#fcd34d' : 'background:#f8fafc;border-color:#e2e8f0';
    const medal      = i < 3
      ? `<span style="font-size:18px">${medals[i]}</span>`
      : `<span style="font-size:12px;font-weight:800;color:#94a3b8">#${i + 1}</span>`;
    const name       = (e.teamName || 'Untitled Team').slice(0, 30);
    const winsColor  = isPerfect ? '#b45309' : e.wins >= 70 ? '#16a34a' : e.wins >= 50 ? '#2563eb' : '#0f172a';
    const champBadge = e.champion
      ? `<span style="font-size:10px;font-weight:900;padding:2px 7px;border-radius:999px;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;white-space:nowrap">🏆 CHAMP</span>`
      : '';
    const perfectBadge = isPerfect && !e.champion
      ? `<span style="font-size:10px;font-weight:900;padding:2px 7px;border-radius:999px;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;white-space:nowrap">82–0</span>`
      : '';
    return `
    <div style="border-radius:12px;border:1.5px solid;padding:10px 12px;display:flex;align-items:center;gap:10px;${rowBg}">
      <div style="width:28px;text-align:center;flex-shrink:0">${medal}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:2px;flex-wrap:wrap">
          <span style="font-weight:900;font-size:14px;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:150px;font-family:Fira Sans,sans-serif">${name}</span>
          ${champBadge}${perfectBadge}
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-weight:900;font-size:15px;color:${winsColor};font-family:Fira Sans,sans-serif">${e.wins}–${e.losses}</span>
          ${e.coachName ? `<span style="font-size:11px;color:#64748b;font-family:Fira Sans,sans-serif">${e.coachName}</span>` : ''}
          ${e.era && e.era !== 'all' ? `<span style="font-size:11px;color:#94a3b8;font-family:Fira Sans,sans-serif">${e.era}</span>` : ''}
        </div>
        ${e.starters ? `<p style="font-size:10px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:2px 0 0;font-family:Fira Sans,sans-serif">${e.starters}</p>` : ''}
      </div>
      <div style="text-align:right;flex-shrink:0">
        <p style="font-size:10px;color:#94a3b8;margin:0 0 2px;font-family:Fira Sans,sans-serif">CHEM</p>
        <p style="font-size:13px;font-weight:800;color:#2563eb;margin:0;font-family:Fira Sans,sans-serif">${e.chemScore ?? 0}%</p>
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
             background:${activeTab === t.id ? '#2563eb' : '#f1f5f9'};
             color:${activeTab === t.id ? '#fff' : '#64748b'}">
      ${t.label}
    </button>`).join('');

  return `
  <div id="global-lb-modal-backdrop" onclick="if(event.target===this)window.closeGlobalLeaderboardModal()"
    style="position:fixed;inset:0;background:rgba(15,23,42,0.5);z-index:9998;display:flex;
           align-items:center;justify-content:center;padding:16px">
    <div style="background:#ffffff;border:1.5px solid #e2e8f0;border-radius:20px;width:100%;
                max-width:520px;max-height:90vh;overflow-y:auto;padding:24px;
                font-family:Fira Sans,sans-serif;color:#0f172a;
                animation:scaleIn 0.2s ease-out;box-shadow:0 20px 60px rgba(0,0,0,0.12)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div>
          <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#2563eb;margin:0 0 4px">Global Competition</p>
          <h2 style="font-size:22px;font-weight:900;margin:0;color:#0f172a">🌍 Global Leaderboard</h2>
        </div>
        <button onclick="window.closeGlobalLeaderboardModal()"
          style="background:#f1f5f9;border:1px solid #e2e8f0;color:#64748b;border-radius:999px;
                 width:32px;height:32px;font-size:16px;cursor:pointer;display:flex;
                 align-items:center;justify-content:center;flex-shrink:0">✕</button>
      </div>
      <div style="display:flex;gap:5px;padding:4px;background:#f1f5f9;border-radius:10px;margin-bottom:16px">
        ${tabsHtml}
      </div>
      <div id="global-lb-table" style="display:flex;flex-direction:column;gap:8px">
        ${_globalLbLoadingHtml()}
      </div>
    </div>
  </div>`;
}

async function _loadGlobalLb(tab) {
  try {
    const entries  = await fetchLeaderboard(tab);
    const tableEl  = document.getElementById('global-lb-table');
    if (tableEl) tableEl.innerHTML = _globalLbRowsHtml(entries);
  } catch (err) {
    const tableEl = document.getElementById('global-lb-table');
    const msg     = err.message.includes('not configured')
      ? 'Firebase not set up yet — see <code>js/utils/firebase.js</code> for instructions.'
      : 'Failed to load — check your connection. <button onclick="window.switchGlobalLbTab(\'' + tab + '\')" style="text-decoration:underline;cursor:pointer;font-family:Fira Sans,sans-serif">Retry</button>';
    if (tableEl) tableEl.innerHTML = `<p style="color:#dc2626;font-size:13px;text-align:center;padding:24px 0;font-family:Fira Sans,sans-serif">${msg}</p>`;
  }
}

// Exposed on window so inline onclick in the modal (outside #app) can call it
window.switchGlobalLbTab = function (tab) {
  GLOBAL_TABS.forEach(t => {
    const btn = document.getElementById(`global-lb-tab-${t.id}`);
    if (!btn) return;
    btn.style.background = t.id === tab ? '#2563eb' : '#f1f5f9';
    btn.style.color      = t.id === tab ? '#ffffff' : '#64748b';
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
  const onKey = e => { if (e.key === 'Escape') closeGlobalLeaderboardModal(); };
  document.addEventListener('keydown', onKey);
  div._removeKey = () => document.removeEventListener('keydown', onKey);
  _loadGlobalLb(tab);
}

export function closeGlobalLeaderboardModal() {
  const el = document.getElementById('global-lb-modal-root');
  if (el) {
    if (el._removeKey) el._removeKey();
    el.remove();
  }
}

