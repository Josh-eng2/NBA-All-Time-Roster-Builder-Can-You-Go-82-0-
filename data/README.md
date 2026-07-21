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

## `nba2k_2010s_peak_ratings.json`  (+ `nba2k_2010s_sources/`)

Per-player **peak** NBA 2K overall across the 2010s — the single highest overall
each player reached in the decade. Same `name` + `overallAttribute` shape as the
current-ratings file, so the same matcher consumes it.

- **Provenance:** derived by `scripts/build_2010s_peak_ratings.py` from the raw
  files in `nba2k_2010s_sources/`, both real scraped 2K ratings (not model
  predictions — spot-checked against known values):
  - `miking98_2k13/2k14/2k15.txt` — NBA 2K13-2K15 editions, from
    [Miking98/NBA-2K-Player-Ratings](https://github.com/Miking98/NBA-2K-Player-Ratings).
  - `willyiamyu_2014-2020.csv` — per-season overalls 2014-15 .. 2019-20 (the
    `rankings` column), trimmed from
    [willyiamyu/nba2k_analysis](https://github.com/willyiamyu/nba2k_analysis).
- **Coverage:** 2012-13 through 2019-20. The 2010-11 and 2011-12 seasons are in
  neither source. Ratings are start-of-season values, so a few mid-season
  patched peaks read slightly low (e.g. Curry's 2K18 95 rather than the later
  99). Why peak: `players.json` has one entry per player per decade, so a single
  number has to stand for the whole decade — the peak represents each player at
  their decade best (the same spirit as the roster itself).
- **Consumed by:** `scripts/match_2k_overalls.py --decade 2010s`, which stamps
  `twoKOverall` onto the matching 2010s entries. Each decade is matched only
  against its own era's ratings, and the matcher only ever touches its target
  decade — so the 2010s and 2020s passes never disturb each other.

To rebuild after editing sources:
`python3 scripts/build_2010s_peak_ratings.py` then
`python3 scripts/match_2k_overalls.py data/nba2k_2010s_peak_ratings.json --decade 2010s`
then the usual `inline_players.js` / `validate_players.js` steps.
