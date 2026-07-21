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

## `nba2k_2000s_peak_ratings.json`  (+ `nba2k_2000s_sources/`)

Per-player **peak** NBA 2K overall across the 2000s — the single highest overall
each player reached in any edition from NBA 2K1 (2000-01) through NBA 2K10
(2009-10). Same `name` + `overallAttribute` shape as the other ratings files,
so the same matcher consumes it.

- **Provenance:** derived by `scripts/build_2000s_peak_ratings.py` from the raw
  files in `nba2k_2000s_sources/`, both real in-game 2K ratings (not model
  predictions — spot-checked against known values):
  - `hoopshype_nba_2k1.json` .. `hoopshype_nba_2k10.json` — the full
    per-edition player lists behind
    [hoopshype.com/nba-2k/players/?game=…](https://hoopshype.com/nba-2k/players/)
    (75-341 players per edition, 1,902 rating rows total), fetched from the
    site's GraphQL data API with cursor pagination.
  - `maddenratings_*.json` — the top-rated players per edition transcribed from
    [maddenratings.weebly.com](https://maddenratings.weebly.com)'s per-game
    pages (NBA 2K1, 2K2, 2K3, ESPN NBA Basketball = the 2003-04 edition,
    ESPN NBA 2K5, and 2K6-2K10; 22-65 players each). Shallower lists, but they
    cover several stars missing from hoopshype's archive (Ray Allen,
    Gary Payton, Scottie Pippen, Alonzo Mourning, Peja Stojakovic,
    Amar'e Stoudemire, Sam Cassell, ...).
- **Coverage:** all ten 2000s editions, 2000-01 through 2009-10 (407 distinct
  players). The two sources reflect different roster snapshots of the same
  editions (launch vs. later roster updates) and disagree by a few points for
  some players; both values are real in-game overalls, and the peak-of-decade
  max simply keeps the higher one. On NBA 2K10, where both are the same
  vintage, they agree exactly on all 26 shared players. Known source quirks
  handled by the builder: hoopshype backfills current legal names onto
  historical rows ("Metta World Peace" → credited to the era name
  "Ron Artest"), and its NBA 2K9/2K10 rows misattributed to Grayson Allen
  (who debuted in 2018) are dropped.
- **Consumed by:** `scripts/match_2k_overalls.py --decade 2000s`, which stamps
  `twoKOverall` onto the matching 2000s entries (152 of 176). The 24 entries
  left without the field are players absent from both archives — mostly
  early-decade role players and stars whose 2K appearances predate the archives'
  coverage depth (e.g. Scottie Pippen, Latrell Sprewell, Jamal Mashburn,
  Robert Horry) — verified absent by sweeping hoopshype's full 9,558-row 2K
  ratings corpus. Per the pipeline's rule, no value is fabricated for them.

To rebuild after editing sources:
`python3 scripts/build_2000s_peak_ratings.py` then
`python3 scripts/match_2k_overalls.py data/nba2k_2000s_peak_ratings.json --decade 2000s`
then the usual `inline_players.js` / `validate_players.js` steps.

## `nba2k_1980s_peak_ratings.json`  (+ `nba2k_1980s_sources/`)

Per-player peak NBA 2K overall for the 1980s, same classic/all-time-roster
methodology and web-search compilation method as the 1960s/1970s files (see
the 1960s section below for the full access-method caveat).

- **Provenance:** `data/nba2k_1980s_sources/2kratings_websearch_compiled.json`.
  As with the 1970s file, a couple of rows reuse the most team-appropriate
  card available rather than a card literally labeled for that decade — e.g.
  Bill Walton's number comes from his 1985-86 Boston Celtics card (his 1980s
  team), not his higher All-Time Portland Trail Blazers or All-Decade 1970s
  numbers, since those represent a different team/decade context.
- **Coverage:** 69 distinct players matched (77 of the 119 1980s team-era
  entries in `players.json`) — the highest match rate of any pre-2000s decade
  so far, as expected: the 1980s produced an unusually large share of 2K's
  marquee classic/all-time cornerstones (Magic, Bird, Jordan, Isiah, Hakeem,
  Stockton, Malone, Ewing among them). The 42 unmatched entries are mostly
  complementary role players (e.g. Andrew Toney, Bobby Jones, Marques Johnson,
  Mike Gminski) who didn't surface an individual 2K classic/all-time card in
  search.
- **Consumed by:** `scripts/match_2k_overalls.py --decade 1980s`, isolated to
  1980s entries only, same as every other decade.

To rebuild after editing sources:
`python3 scripts/build_1980s_peak_ratings.py` then
`python3 scripts/match_2k_overalls.py data/nba2k_1980s_peak_ratings.json --decade 1980s`
then the usual `inline_players.js` / `validate_players.js` steps.

## `nba2k_1970s_peak_ratings.json`  (+ `nba2k_1970s_sources/`)

Per-player peak NBA 2K overall for the 1970s, same classic/all-time-roster
methodology as the 1960s file below (Classic Teams, All-Time Teams, All-Decade
Teams) and the same web-search compilation method — see the 1960s section
immediately below for the full access-method caveat (2kratings.com's
Cloudflare protection blocks both direct HTTP and headless-browser automation,
so this is compiled from attributed search results, not a bulk scrape).

- **Provenance:** `data/nba2k_1970s_sources/2kratings_websearch_compiled.json`,
  same real-and-attributed-but-not-exhaustive caveat as the 1960s file. A
  handful of rows reuse a rating from a different team/decade card than the
  target bucket (e.g. Earl Monroe's number comes from his All-Time Washington
  Wizards card; no All-Time Knicks card surfaced for his 1971-74 Knicks stint)
  — each such case is flagged inline in the source file's `source` field.
- **Coverage:** 50 distinct players matched (58 of the 105 1970s team-era
  entries in `players.json`). The 47 unmatched entries are mostly complementary
  pieces on otherwise-legendary rosters that didn't surface an individual 2K
  classic/all-time card in search — e.g. four of the 1976-77 "Blazer
  Bunch" title-team rotation (Lionel Hollins, Bob Gross, Larry Steele, Dave
  Twardzik) and several ABA-then-NBA role players (Roger Brown, Bob Netolicky,
  Billy Keller).
- **Consumed by:** `scripts/match_2k_overalls.py --decade 1970s`, isolated to
  1970s entries only, same as every other decade.

To rebuild after editing sources:
`python3 scripts/build_1970s_peak_ratings.py` then
`python3 scripts/match_2k_overalls.py data/nba2k_1970s_peak_ratings.json --decade 1970s`
then the usual `inline_players.js` / `validate_players.js` steps.

## `nba2k_1960s_peak_ratings.json`  (+ `nba2k_1960s_sources/`)

Per-player **peak** NBA 2K overall for the 1960s — but unlike the 2000s/2010s
files above, this isn't a peak across in-era editions (NBA 2K didn't exist
before 1999, so there's no season-accurate rating to peak across). It's the
highest overall a player has reached on any of 2K's **classic/all-time roster**
appearances: Classic Teams (a specific vintage season, e.g. "1964-65 Boston
Celtics"), All-Time Teams (a franchise's greatest players across its whole
history), and All-Decade Teams (the league's best in a given decade). Same
`name` + `overallAttribute` shape as the other ratings files, so the same
matcher consumes it.

- **Provenance — read this before trusting the numbers:** 2kratings.com sits
  behind Cloudflare bot-management that blocks both plain HTTP requests
  (serves an interactive "Just a moment..." JS challenge, unsolvable without a
  real browser) and headless-browser automation (hard `ERR_CONNECTION_RESET`
  on every attempt, consistent with fingerprinting of automated browsers —
  confirmed via direct curl and a Playwright/Chromium session, both from an
  environment where the site is otherwise network-allowlisted). No bulk
  scrape or GitHub mirror of the classic/all-time pages exists (the one
  current-roster mirror this repo already used, MikeYan01/nba2k-player-ratings,
  only contains current-team data). Every other candidate source site
  (hoopshype.com, gaming-press roster roundups, even Wikipedia) is unreachable
  from this environment's network policy.

  So `data/nba2k_1960s_sources/2kratings_websearch_compiled.json` was compiled
  one targeted web search at a time instead: each row is a single
  (player, roster) rating transcribed from a real, attributed 2kratings.com
  search result (a specific player-page title naming the roster and NBA 2K
  edition, e.g. "Bill Russell NBA 2K27 Rating (All-Time Boston Celtics)").
  Every number is real and attributed — nothing here is a model guess or
  estimate — but this method depends on what search results surface, not an
  exhaustive per-roster crawl, so it's strictly lower-confidence and
  lower-coverage than the 2000s/2010s/current files: a player absent here may
  simply not have surfaced in search rather than being confirmed absent from
  2K. If direct or archival access to 2kratings.com ever becomes available,
  re-deriving this file from a full scrape (same shape, same build script)
  would be a strict improvement.
- **Coverage:** 32 distinct players matched (36 of the 58 1960s team-era
  entries in `players.json`, since a few players like Wilt Chamberlain have
  multiple 1960s entries across teams they played for). The 22 unmatched
  entries are mostly deeper-bench role players (e.g. Adrian Smith, Art
  Williams, Bob Ferry, Gus Johnson, Sam Jones, Guy Rodgers) who didn't surface
  a 2K classic/all-time rating in search — expected, since 2K's classic/all-time
  rosters only cover a curated subset of each team's history, skewed hardest
  against the 1960s of any decade in this pipeline.
- **Consumed by:** `scripts/match_2k_overalls.py --decade 1960s`, which stamps
  `twoKOverall` onto the matching 1960s entries only, same isolation guarantee
  as every other decade.

To rebuild after editing sources:
`python3 scripts/build_1960s_peak_ratings.py` then
`python3 scripts/match_2k_overalls.py data/nba2k_1960s_peak_ratings.json --decade 1960s`
then the usual `inline_players.js` / `validate_players.js` steps.
