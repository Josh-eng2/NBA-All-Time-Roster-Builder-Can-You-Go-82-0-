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
There is **no lint tooling and no build step required to run** this repo.

Logic tests live in `tests/` and use Node's built-in runner — no dependencies,
no package.json:

```bash
node --test 'tests/*.test.mjs'
```

They import the shipped ES modules straight out of `js/`, so they exercise the
same code the browser runs. Run them after any change under `js/`. See
`tests/README.md` for what each file pins.

`render.test.mjs` and `ui-regressions.test.mjs` cover the UI layer too, on a
tiny DOM stub (`tests/dom-stub.mjs`) — enough to render every screen and catch
the crashes, `NaN`s and leaked `undefined`s that blank one. They do **not**
model layout, CSS or event delivery, so still verify a real change by playing
the game in a browser: draft a 5-player roster via the decade wheel, pick a
coach, then click **SIMULATE 82 GAMES** and confirm a season-result screen
appears.

One committed-generated stylesheet: `css/tailwind.css` is a static Tailwind
build (config in `tailwind.config.js`). After adding/removing Tailwind classes
in `index.html` or `js/**`, regenerate it with `bash scripts/build_tailwind.sh`
(uses `npx`, no package.json) — same pattern as the inlined player DB.

### Generated content pages
`daily/`, `teams/`, `eras/`, `teams.html` and `sitemap.xml` are **generated** — do not hand-edit.
Rebuild them with:

```bash
node scripts/build_challenge_pages.mjs   # also builds teams/ + eras/ and rewrites sitemap.xml
```

That script is the only writer of `sitemap.xml`; `scripts/build_team_pages.mjs` is imported by
it (running the team script alone writes its pages but deliberately leaves the sitemap alone).
Both only rewrite files whose content actually changed, so a no-op run produces no diff.

### Service worker cache
`sw.js` serves same-origin static assets **cache-first**. After changing any file in its
`PRECACHE_URLS` list — or adding a new JS module — bump `CACHE_VERSION`, or returning players
keep running the old build.

### Data regeneration (optional, not needed to run)
The player database is committed pre-generated at `js/data/players.js` (inlined from `players.json`). Only regenerate it if you intentionally change player data:

```bash
scripts/update_players.sh   # runs add_popularity.js -> add_rating.js -> inline_players.js (Node built-ins only)
```

Sanity-check the result with `node scripts/validate_players.js` (read-only:
structural checks on `players.json`, exits non-zero and prints every violation).

Note: these scripts **mutate committed files** (`players.json`, `js/data/players.js`) — only run them when you mean to.

### External services (all optional, degrade gracefully)
- **Google Fonts** — loaded at runtime; falls back to system fonts if blocked. (Tailwind is no longer a runtime CDN — it's the committed static build `css/tailwind.css`, so the UI styles correctly offline.)
- **Confetti** — no longer third-party. `canvas-confetti` is committed at `js/vendor/confetti.browser.js` and lazy-loaded same-origin by `withConfetti()` in `js/ui/render.js` only when a celebration fires; silently skipped if it cannot be fetched. See `js/vendor/README.md` before changing or updating it.
- **Firebase Firestore/Analytics** (`js/utils/firebase.js`) — powers the *optional* global leaderboard and analytics. Every call is guarded by `isFirebaseConfigured()` and wrapped in try/catch; if unreachable it silently no-ops. The local leaderboard and trophy room use `localStorage` and always work.
- **Firebase Remote Config** (`js/utils/remoteConfig.js`) — runtime values that can change without a deploy or a `CACHE_VERSION` roll: currently `accounts_enabled` (the kill switch mirrored from `ACCOUNTS_ENABLED`) and the sim curve `sim_k` / `sim_center` / `win_cap`. `DEFAULTS` in that file is both the offline fallback and the whitelist — a key absent from it can never be introduced by a publish, and every fetched number is type-checked and clamped to its bounds. Adding a NEW key still needs a deploy + cache bump (a cached bundle only reads keys it already knows); changing an existing one does not. Never put the Daily Challenge pool behind it — `getDailyChallenge()` must stay a pure function of the UTC date, or two players on the same day get different challenges and submit to the same board.
- **Firebase App Check** (reCAPTCHA v3, same file) — attests that Firestore requests come from a page served by a registered domain, so a forged submission needs a real browser instead of a `curl` against the public config. `APP_CHECK_SITE_KEY` plus the Console setup are documented in that file's header; it initialises only when the key is filled in, uses a debug token on `localhost`, and a blocked App Check module degrades to "unattested request", never to a broken boot. Bump `CACHE_VERSION` and let it propagate *before* switching on Firestore enforcement in the Console, or cached clients get locked out.

### Git workflow
When shipping code changes, **always open a pull request** into `main` (do not push directly to `main`). Push a feature branch, then create the PR with `gh pr create` or the GitHub compare URL.
