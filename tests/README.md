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
| `draft.test.mjs` | player-database integrity, cross-era duplicate prevention, spin pools, skip budgets, Legends catalog |
| `challenge.test.mjs` | Daily Challenge determinism, no back-to-back repeats, every challenge is completable, pick legality vs roster check |
| `rematch.test.mjs` | share-code round trip (a wire format), rejection of malformed codes |
| `leaderboard-wire.test.mjs` | submitted documents stay inside the deployed Firestore rule ranges — an out-of-range field loses the whole submission |
| `state.test.mjs` | config tables, run resets, snake draft order, daily PRNG seeding, mode config, era normalization, tier/grade agreement |

The UI layer is not covered here — it is verified by playing the game in a
browser (see the repo README).
