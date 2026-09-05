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
| `leaderboard-wire.test.mjs` | submitted documents stay inside the deployed Firestore rule ranges — an out-of-range field loses the whole submission; the optional SDK modules (analytics, performance) can each be blocked without taking the leaderboard down; `measure()` stays invisible when the Performance SDK never loads |
| `state.test.mjs` | config tables, run resets, snake draft order, daily PRNG seeding, mode config, era normalization, tier/grade agreement |
| `render.test.mjs` | every screen renders — each phase, both themes, phone and desktop layouts, every roster fill level — with no crash, `NaN` or `undefined` reaching the DOM |
| `ui-regressions.test.mjs` | UI defects that have shipped: Ball IQ rules surviving a rematch, the share card's tier palette covering the tier set, a half-typed team name surviving a re-render, the URL hash tracking the screen |
| `cloudsave-identity.test.mjs` | the merge's de-duplication identity across a Firestore round trip (key order must not make one run into two), and the device-ownership rule that stops a shared laptop merging one player's progress into another player's account |
| `authmodal.test.mjs` | the account modal wires its root once, so listeners cannot double per view switch, and the delete guard is armed before its first await |
| `escaping.test.mjs` | nothing a cloud save can carry reaches innerHTML unescaped — Trophy Room, local leaderboard modal, Daily Statistics distribution |
| `assets.test.mjs` | no first-party module loads script from another origin, the confetti bundle is vendored and licensed, and sw.js's precache list matches the files on disk |

`dom-stub.mjs` is the minimum DOM those tests need (a mount point, the theme
attribute, `matchMedia`, `localStorage`, and enough of the event and child-list
plumbing to tell a re-wired node from a replaced one). It is deliberately not a browser:
layout, CSS and event delivery are not modelled, so the *look* of the game is
still verified by playing it (see the repo README). What the render tests catch
is the class of failure that blanks a screen — a field read off a null, a
divide by an empty roster, a helper called with a shape it doesn't handle.
