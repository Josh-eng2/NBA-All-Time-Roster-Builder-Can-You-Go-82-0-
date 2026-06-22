'use strict';

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  DATABASE LOADER                                                             ║
// ║                                                                             ║
// ║  DB is populated asynchronously from players.json at boot.                  ║
// ║  render() is called by loadDatabase() once the data is ready.               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

let DB = null;

function loadDatabase() {
  const overlay = document.getElementById('loading-overlay');

  return fetch('players.json')
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      DB = data;
      if (overlay) overlay.remove();
      render();
    })
    .catch(err => {
      if (overlay) overlay.innerHTML = `
        <p style="color:#ef4444;font-weight:700;font-size:15px">Failed to load player data</p>
        <p style="color:#a1a1aa;font-size:12px;margin-top:4px">${err.message}</p>
        <button onclick="loadDatabase()"
          style="margin-top:16px;padding:8px 20px;background:#f97316;color:#fff;
                 border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px">
          Retry
        </button>`;
    });
}
