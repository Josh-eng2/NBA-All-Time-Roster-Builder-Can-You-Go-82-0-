/**
 * js/utils/storage.js — localStorage Leaderboard & Trophy Room
 *
 * Keys:
 *   nba820_lb       — leaderboard, up to 20 entries, sorted desc by wins
 *   nba820_trophies — trophy room,  up to 12 entries (championships only)
 *
 * Exports:
 *   saveLeaderboard()       — persists current result to leaderboard
 *   saveToTrophyRoom()      — persists current championship to trophy room
 *   showLeaderboardModal()  — renders and mounts the leaderboard modal
 *   closeLeaderboardModal() — removes the modal from the DOM
 *
 * Side-effect:
 *   window.closeLeaderboardModal is set in events.js so the inline
 *   onclick in the modal HTML can call it.
 */

import { S, COACHES, POSITIONS, BENCH_POSITIONS } from '../logic/state.js';

// ── Save leaderboard entry ────────────────────────────────────────────────────

export function saveLeaderboard() {
  const r = S.result;
  if (!r) return;
  const entry = {
    date:     new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
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
    payroll:     S.currentPayroll,
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
        const rankColor = i === 0 ? '#2563eb' : '#94a3b8';
        const winsColor = isPerfect ? '#b45309' : '#0f172a';
        return `
        <div style="border-radius:12px;border:1.5px solid;padding:12px;display:flex;align-items:center;gap:12px;${rowBg}">
          <span style="font-size:18px;font-weight:900;width:28px;text-align:center;flex-shrink:0;color:${rankColor}">${i + 1}</span>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span style="font-weight:900;font-size:16px;color:${winsColor}">${e.wins}–${e.losses}</span>
              ${isPerfect ? '<span style="font-size:10px;font-weight:900;padding:2px 8px;border-radius:999px;background:#fef3c7;color:#92400e;border:1px solid #fcd34d">🏆 PERFECT</span>' : ''}
            </div>
            <p style="font-size:12px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:2px 0 0">${e.starters}</p>
            <p style="font-size:10px;color:#94a3b8;margin:2px 0 0">${e.date}</p>
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

