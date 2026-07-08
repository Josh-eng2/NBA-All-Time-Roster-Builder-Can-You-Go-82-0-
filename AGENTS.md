# 82-0

## Cursor Cloud specific instructions

This is a **100% static, client-side browser game** ("Can You Go 82-0?") — vanilla JS ES modules, HTML, and CSS. There is **no backend, no build step, no bundler, and no package manager** (no `package.json`/lockfile). Node.js and Python 3 are preinstalled; nothing needs to be installed to run or test the app.

### Running the app (development)
Serve the repo root over HTTP (ES modules do not work reliably over `file://`):

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Any static file server works (`npx serve`, etc.). There is no dev/prod distinction — the served files are the app.

### Lint / test / build
There is **no lint tooling, no automated test suite, and no build step required to run** this repo. "Testing" means manually playing the game in a browser: draft a 7-player roster via the decade wheel, pick a coach, then click **SIMULATE 82 GAMES** and confirm a season-result screen appears.

One committed-generated stylesheet: `css/tailwind.css` is a static Tailwind
build (config in `tailwind.config.js`). After adding/removing Tailwind classes
in `index.html` or `js/**`, regenerate it with `bash scripts/build_tailwind.sh`
(uses `npx`, no package.json) — same pattern as the inlined player DB.

### Data regeneration (optional, not needed to run)
The player database is committed pre-generated at `js/data/players.js` (inlined from `players.json`). Only regenerate it if you intentionally change player data:

```bash
scripts/update_players.sh   # runs scripts/add_popularity.js then scripts/inline_players.js (Node built-ins only)
```

Note: these scripts **mutate committed files** (`players.json`, `js/data/players.js`) — only run them when you mean to.

### External services (all optional, degrade gracefully)
- **Google Fonts** — loaded at runtime; falls back to system fonts if blocked. (Tailwind is no longer a runtime CDN — it's the committed static build `css/tailwind.css`, so the UI styles correctly offline.)
- **jsDelivr confetti** — lazy-loaded by `withConfetti()` in `js/ui/render.js` only when a celebration fires; silently skipped if unreachable.
- **Firebase Firestore/Analytics** (`js/utils/firebase.js`) — powers the *optional* global leaderboard and analytics. Every call is guarded by `isFirebaseConfigured()` and wrapped in try/catch; if unreachable it silently no-ops. The local leaderboard and trophy room use `localStorage` and always work.

### Git workflow
When shipping code changes, **always open a pull request** into `main` (do not push directly to `main`). Push a feature branch, then create the PR with `gh pr create` or the GitHub compare URL.

### Git workflow
When shipping code changes, **always open a pull request** into `main` (do not push directly to `main`). Push a feature branch, then create the PR with `gh pr create` or the GitHub compare URL.
