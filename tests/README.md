# tests/

Logic tests for the game engine. No dependencies and no build step — they use
Node's built-in test runner and import the shipped ES modules straight out of
`js/`, so what they exercise is exactly what the browser runs.

```bash
node --test 'tests/*.test.mjs'
```

`helpers.mjs` provides the one shim the browser modules need under Node (a
`document` stub for the loading-overlay removal in `js/data/players.js`), loads
the player database once, and applies secondary positions the way `js/main.js`
does at startup.

What is covered:

| file | what it pins |
| --- | --- |
| `simulation.test.mjs` | 82-game records reconcile, box scores are coherent, displayed team/player numbers equal the computed ones, coach boost envelope, best-of-7 shape |
| `chemistry.test.mjs` | report lines match their structured entries, labels state the bonus actually applied, per-family caps, lineup assignment validity |
| `playoffs.test.mjs` | seeding ladder, bracket construction, round advancement, elimination, rendered bracket vs recorded results |
| `draft.test.mjs` | player-database integrity, cross-era duplicate prevention, spin pools, skip budgets and skip re-roll pools, the AI GM's pick policy, Legends catalog |
| `challenge.test.mjs` | Daily Challenge determinism, no back-to-back repeats, every challenge is completable (including a star-chasing fans-budget run, which used to strand), pick legality vs roster check |
| `rematch.test.mjs` | share-code round trip (a wire format), rejection of malformed codes |
| `leaderboard-wire.test.mjs` | submitted documents stay inside the deployed Firestore rule ranges — an out-of-range field loses the whole submission — and the builders' key sets match the `hasOnly()` lists read back out of `firestore.rules`, in both directions |
| `state.test.mjs` | config tables, run resets, snake draft order, daily PRNG seeding, mode config, era normalization, tier/grade agreement |
| `render.test.mjs` | every screen renders — each phase, both themes, phone and desktop layouts, every roster fill level — with no crash, `NaN` or `undefined` reaching the DOM |
| `ui-regressions.test.mjs` | UI defects that have shipped: Ball IQ rules surviving a rematch, the share card's tier palette covering the tier set, a half-typed team name surviving a re-render, the URL hash tracking the screen |
| `cloudsave-identity.test.mjs` | the merge's de-duplication identity across a Firestore round trip (key order must not make one run into two), and the device-ownership rule that stops a shared laptop merging one player's progress into another player's account |
| `authmodal.test.mjs` | the account modal wires its root once, so listeners cannot double per view switch, and the delete guard is armed before its first await |
| `escaping.test.mjs` | nothing a cloud save can carry reaches innerHTML unescaped — Trophy Room, local leaderboard modal, Daily Statistics distribution |
| `assets.test.mjs` | no first-party module loads script from another origin, the confetti bundle is vendored and licensed, and sw.js's precache list matches the files on disk |
| `authproviders.test.mjs` | Google / Apple / phone sign-in: that all three ship switched off and refuse at the API as well as in the markup, E.164 normalisation (a guessed country code sends a real SMS to a stranger), and that the account-collision copy teaches linking rather than leaving a player to make a second account |
| `leaderboard-export.test.mjs` | `scripts/leaderboard_stats.mjs`'s CSV boundary — a public, world-writable board feeding a file someone opens in a spreadsheet, so a cell that would be evaluated as a formula is defused — plus the degenerate correlation cases |

`dom-stub.mjs` is the minimum DOM those tests need (a mount point, the theme
attribute, `matchMedia`, `localStorage`, and enough of the event and child-list
plumbing to tell a re-wired node from a replaced one). It is deliberately not a browser:
layout, CSS and event delivery are not modelled, so the *look* of the game is
still verified by playing it (see the repo README). What the render tests catch
is the class of failure that blanks a screen — a field read off a null, a
divide by an empty roster, a helper called with a shape it doesn't handle.

## Review regression coverage

- `save-model.test.mjs`: independent XP credits, first-attempt Daily ledgers, merge invariants and hostile streak values.
- `cloudsave-transport.test.mjs`: failed deletion/backup/adoption, returning owners, interrupted handoffs, stale authentication, transaction retries, corrupt saves and future schemas.
- `auth-recovery.test.mjs`: original subscriptions reconnect after SDK recovery.
- `daily-boards.test.mjs`: divergent legal picks receive identical precomputed boards, with bounded budget feasibility and athlete aliases.
- `optimizer-invariants.test.mjs`: all 120 position assignments and integer player/team scoring reconciliation.
- `leaderboard-ui.test.mjs`: stale tab requests, reopened dialogs, dynamic keyboard focus, and read-only Daily timestamps.
- `service-worker.test.mjs`: failed critical installation, optional assets, coherent release caches, nested offline navigation and HTTP 5xx fallback.
- `portal-startup.test.mjs`: absent, delayed and hung portal SDKs, with stable storage selection.
- Historical rematch codes and Windows file URLs are pinned in their existing suites.

The normal suite remains dependency-free. Tests using `node:module` hooks need Node 22.15+; CI uses current Node 22 on Windows and Linux.

## Optional integration checks

`browser-smoke.mjs` requires Playwright installed **outside the application**. Set `PLAYWRIGHT_MODULE` to its installed package directory and optionally `BROWSER_EXE` to Chrome/Edge. Serve the repository on `http://127.0.0.1:8001`, then run `node tests/browser-smoke.mjs`. It blocks external requests and exercises Classic/Daily/rematch/playoffs, stalled SDK startup, failed submission retry, keyboard placement, reduced motion and generated-page attribution. `SMOKE_ASSETS` optionally exports real feed/story cards plus the matching run metadata to that directory.

`rules-emulator.mjs` requires external test tooling (`firebase@10.12.4`, `@firebase/rules-unit-testing@3.0.4`, `firebase-tools@13.35.1`) and Java 21. Set `TEST_TOOLS_DIR` to that tooling directory and `FIRESTORE_EMULATOR_HOST=127.0.0.1:8087`. Start a local Firestore emulator for **demo-820-review**, then run `node tests/rules-emulator.mjs`. It clears that demo database, evaluates malicious writes, exercises concurrent transactions and pages more than 500 records through the shipped transport. It refuses live endpoints. CI provisions this isolated setup automatically.

Before release, run `node scripts/check_cache_version.mjs <base-ref>`. For a repeatable, read-only balance probe, run `node scripts/calibrate_simulation.mjs`; its output includes the seed, data hash, policy and configuration. Its position pools do not model an attainable wheel draft.
