# data/

Source data used by the pipeline scripts in `scripts/`. These files are
inputs — the game ships from `js/data/players.js`, which is regenerated from
`players.json`.

## `nba2k_current_ratings.json`

Current-roster NBA 2K Play Now ratings (the live 2K27 database), one record
per active player with `overallAttribute` plus the full attribute breakdown.

- **Provenance:** scraped from [2kratings.com](https://www.2kratings.com) by the
  open-source [MikeYan01/nba2k-player-ratings](https://github.com/MikeYan01/nba2k-player-ratings)
  project, whose committed `data/league.json` output this mirrors.
- **Coverage:** 518 present-day players across the 30 current franchises only.
  It contains **no** classic / all-time / retired players — 2K's historical
  rosters live on separate pages the scraper never touches.
- **Consumed by:** `scripts/match_2k_overalls.py`, which stamps a `twoKOverall`
  field onto the matching **2020s-decade** entries in `players.json`. Older
  decades are intentionally left without a 2K overall (a current-season rating
  can't be applied to a 1990s stint), so they keep only the stats-derived
  `rating`.

To refresh: replace this file with a newer scrape (same array-of-objects shape,
`name` + `overallAttribute` required), then re-run
`python3 scripts/match_2k_overalls.py data/nba2k_current_ratings.json` followed
by the usual `inline_players.js` / `validate_players.js` steps.
