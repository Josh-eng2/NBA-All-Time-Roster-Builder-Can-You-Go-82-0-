# Player data realism audit — progress tracker

**Read `rubric.md` first** — this file only tracks status, it doesn't
repeat the methodology.

## How to resume (for a fresh session with no memory of prior work)

1. Read `rubric.md` in full.
2. Scan the table below top to bottom for the first row with status
   `pending`.
3. Do that batch, following the "Per-batch workflow" section of
   `rubric.md`.
4. Flip the row to `done`, fill in the Notes column, commit, move on.
5. If a batch is left `in-progress` (a prior session got interrupted
   mid-batch), verify what actually landed in `players.json` for that
   batch's buckets before resuming — don't assume partial edits were
   clean.

## PR grouping

One PR per decade (batches sharing a decade land in the same PR), plus
one PR for the popularity batch and one for wrap-up. 9 PRs total.
Squash-merge each after review.

## Batches

| # | Decade | Players | Buckets | Status | Notes |
|---|---|---|---|---|---|
| 1 | 1960s | 35 | `Bucks_1960s`, `Bulls_1960s`, `Celtics_1960s`, `Hawks_1960s`, `Kings_1960s`, `Knicks_1960s`, `Lakers_1960s`, `Pistons_1960s` | pending | |
| 2 | 1960s | 23 | `Rockets_1960s`, `Sixers_1960s`, `Suns_1960s`, `Thunder_1960s`, `Warriors_1960s`, `Wizards_1960s` | pending | |
| 3 | 1970s | 37 | `Blazers_1970s`, `Bucks_1970s`, `Bulls_1970s`, `Cavaliers_1970s`, `Celtics_1970s`, `Clippers_1970s`, `Hawks_1970s`, `Jazz_1970s` | pending | |
| 4 | 1970s | 38 | `Kings_1970s`, `Knicks_1970s`, `Lakers_1970s`, `Nets_1970s`, `Nuggets_1970s`, `Pacers_1970s`, `Pistons_1970s`, `Rockets_1970s` | pending | |
| 5 | 1970s | 30 | `Sixers_1970s`, `Spurs_1970s`, `Suns_1970s`, `Thunder_1970s`, `Warriors_1970s`, `Wizards_1970s` | pending | |
| 6 | 1980s | 39 | `Blazers_1980s`, `Bucks_1980s`, `Bulls_1980s`, `Cavaliers_1980s`, `Celtics_1980s`, `Clippers_1980s`, `Hawks_1980s` | pending | |
| 7 | 1980s | 42 | `Jazz_1980s`, `Kings_1980s`, `Knicks_1980s`, `Lakers_1980s`, `Mavericks_1980s`, `Nets_1980s`, `Nuggets_1980s`, `Pacers_1980s` | pending | |
| 8 | 1980s | 38 | `Pistons_1980s`, `Rockets_1980s`, `Sixers_1980s`, `Spurs_1980s`, `Suns_1980s`, `Thunder_1980s`, `Warriors_1980s`, `Wizards_1980s` | pending | |
| 9 | 1990s | 42 | `Blazers_1990s`, `Bucks_1990s`, `Bulls_1990s`, `Cavaliers_1990s`, `Celtics_1990s`, `Clippers_1990s`, `Grizzlies_1990s`, `Hawks_1990s` | pending | |
| 10 | 1990s | 38 | `Heat_1990s`, `Hornets_1990s`, `Jazz_1990s`, `Kings_1990s`, `Knicks_1990s`, `Lakers_1990s` | pending | |
| 11 | 1990s | 40 | `Magic_1990s`, `Mavericks_1990s`, `Nets_1990s`, `Nuggets_1990s`, `Pacers_1990s`, `Pistons_1990s`, `Raptors_1990s`, `Rockets_1990s` | pending | |
| 12 | 1990s | 41 | `Sixers_1990s`, `Spurs_1990s`, `Suns_1990s`, `Thunder_1990s`, `Timberwolves_1990s`, `Warriors_1990s`, `Wizards_1990s` | pending | |
| 13 | 2000s | 40 | `Blazers_2000s`, `Bucks_2000s`, `Bulls_2000s`, `Cavaliers_2000s`, `Celtics_2000s`, `Clippers_2000s`, `Grizzlies_2000s` | pending | |
| 14 | 2000s | 36 | `Hawks_2000s`, `Heat_2000s`, `Hornets_2000s`, `Jazz_2000s`, `Kings_2000s`, `Knicks_2000s` | pending | |
| 15 | 2000s | 42 | `Lakers_2000s`, `Magic_2000s`, `Mavericks_2000s`, `Nets_2000s`, `Nuggets_2000s`, `Pacers_2000s`, `Pelicans_2000s` | pending | |
| 16 | 2000s | 41 | `Pistons_2000s`, `Raptors_2000s`, `Rockets_2000s`, `Sixers_2000s`, `Spurs_2000s`, `Suns_2000s`, `Thunder_2000s` | pending | |
| 17 | 2000s | 18 | `Timberwolves_2000s`, `Warriors_2000s`, `Wizards_2000s` | pending | |
| 18 | 2010s | 41 | `Blazers_2010s`, `Bucks_2010s`, `Bulls_2010s`, `Cavaliers_2010s`, `Celtics_2010s`, `Clippers_2010s`, `Grizzlies_2010s` | pending | |
| 19 | 2010s | 36 | `Hawks_2010s`, `Heat_2010s`, `Hornets_2010s`, `Jazz_2010s`, `Kings_2010s`, `Knicks_2010s` | pending | |
| 20 | 2010s | 42 | `Lakers_2010s`, `Magic_2010s`, `Mavericks_2010s`, `Nets_2010s`, `Nuggets_2010s`, `Pacers_2010s`, `Pelicans_2010s`, `Pistons_2010s` | pending | |
| 21 | 2010s | 41 | `Raptors_2010s`, `Rockets_2010s`, `Sixers_2010s`, `Spurs_2010s`, `Suns_2010s`, `Thunder_2010s`, `Timberwolves_2010s` | pending | |
| 22 | 2010s | 15 | `Warriors_2010s`, `Wizards_2010s` | pending | |
| 23 | 2020s | 41 | `Blazers_2020s`, `Bucks_2020s`, `Bulls_2020s`, `Cavaliers_2020s`, `Celtics_2020s`, `Clippers_2020s`, `Grizzlies_2020s`, `Hawks_2020s` | pending | |
| 24 | 2020s | 36 | `Heat_2020s`, `Hornets_2020s`, `Jazz_2020s`, `Kings_2020s`, `Knicks_2020s`, `Lakers_2020s`, `Magic_2020s`, `Mavericks_2020s` | pending | |
| 25 | 2020s | 36 | `Nets_2020s`, `Nuggets_2020s`, `Pacers_2020s`, `Pelicans_2020s`, `Pistons_2020s`, `Raptors_2020s`, `Rockets_2020s`, `Sixers_2020s` | pending | |
| 26 | 2020s | 30 | `Spurs_2020s`, `Suns_2020s`, `Thunder_2020s`, `Timberwolves_2020s`, `Warriors_2020s`, `Wizards_2020s` | pending | |
| 27 | popularity | 465 named + formula fallback | `scripts/add_popularity.js` `NAMED` dict (all 465 current entries) | pending | Not decade-scoped — audit the whole dict for accuracy/consistency in one pass, then `bash scripts/update_players.sh` to apply. Best done *after* batches 1–26 so stat corrections have already fed the formula fallback for un-named players. |
| 28 | wrap-up | — | n/a | pending | Fix the 3 known duplicate `id`s (`thompson_16`: Klay Thompson vs Tristan Thompson; `vandeweghe_84`: Kiki Vandeweghe's two team stints; `cassell_s_04`: Sam Cassell's two team stints — give each a distinct id, e.g. suffix by team). Final full validation run + full smoke test across all three draft modes. Note the required `SIM_CENTER` re-tuning follow-up (see rubric.md) for a separate future session — do not attempt it as part of this wrap-up. |

## Log

(Running notes get appended here per completed batch — notable judgment
calls, players you weren't fully confident on, anything the next session
should double-check.)
