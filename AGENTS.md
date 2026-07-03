# AGENTS.md

## Cursor Cloud specific instructions

### What this is
"Can You Go 82-0?" is a **purely client-side static web app** (vanilla JS ES modules, HTML, CSS). There is **no backend, no package manager, no build step, no test suite, and no linter** in this repo (no `package.json`, no lockfile, no CI). Files are served as-is.

### Running the app (dev)
Serve the repo root over HTTP and open it in a browser:

```bash
python3 -m http.server 8000   # from repo root, then open http://localhost:8000
```

- **Must be served over HTTP(S), not `file://`** — the app loads `js/main.js` as an ES module, which browsers block on the `file://` scheme.
- **Internet access is required for full functionality.** Tailwind, Fira Sans fonts, the Firebase SDK, and `canvas-confetti` all load from CDNs, and the global leaderboard uses Firebase Firestore (config is hardcoded and public in `js/utils/firebase.js`). The app degrades gracefully if Firebase is unreachable (local play, local leaderboard, and trophy room still work).

### Gameplay entry-point gotcha
A **brand-new visitor** (no `localStorage` flag) gets a "cold open": they land mid-draft with coach auto-assigned and the decade wheel already spinning (see `js/main.js`). **Returning players** (flag set in `localStorage`) instead see the normal mode-select screen. To reproduce the first-time flow, clear site data / use a fresh browser profile.

### Optional: regenerating player data (dev only, never needed at runtime)
`players.json` is inlined into `js/data/players.js` at edit-time. Regenerate with `./scripts/update_players.sh` (runs `node scripts/add_popularity.js` then `node scripts/inline_players.js`; uses only Node built-ins, no install). The running app does not `fetch` player data — it's bundled in the JS.
