# Player data realism rubric

This is the methodology for the player-database realism audit. Read this
before touching any batch — it's written so a session with zero memory of
prior conversations can pick up `progress.md` and execute correctly without
re-deriving any of these decisions.

**Source of truth:** `players.json` (root of repo). Edit it directly.
`js/data/players.js` is generated — never hand-edit it; regenerate with
`node scripts/inline_players.js` after every batch.

**Do not touch:** `secondaryPos` isn't stored anywhere — it's derived at
runtime by `js/logic/positions.js` from `pos`/`ppg`/`apg`/`rpg`/`bpg`/
`archetype`/`traits`. Fixing those fields fixes secondary positions
automatically; there's nothing to hand-edit.

## Per-field targets

### Stats (`ppg`, `rpg`, `apg`, `spg`, `bpg`)
Each entry represents one player's real per-game averages for a specific
team, in a season that plausibly falls within the entry's decade bucket.
Not a fabricated "sounds about right" line — an actual season that player
had with that team. Preserve the existing numeric style (mixed integers
and one-decimal floats, e.g. `22`, `26.9` — don't force uniform decimal
places).

Two known bad patterns already found in the data to watch for everywhere:
- **Inflated/fabricated lines** that don't correspond to any real season
  (example found in scoping: a Bulls_1980s Jordan entry at 40 ppg / 4.5
  spg — no such Jordan season exists; his real career-high was 37.1 ppg
  in '86-87, 3.2 spg in '87-88).
- **Team/decade mismatches** — stats attributed to a team/decade the
  player barely played for (example found: a Lakers_2010s LeBron entry
  at 35.5 ppg / 11 apg — not a real LeBron season, and he only played
  half of one partial season for the Lakers before the 2010s ended).

Era-pace note: 1960s/1970s league-wide rebounding and scoring pace was
much higher than modern basketball (no shot clock pressure comparable to
today, faster pace, no 3-point line until 1979-80). Big rebounding/scoring
numbers in those decades are normal and shouldn't be "corrected" toward
modern-looking numbers — verify against real stats for that era, not
modern intuition.

### Rigor tiers (how hard to verify)
Checking all 938 entries against a box score with equal rigor isn't a good
use of a limited number of sessions. Split by the entry's **current**
`popularity` value before you start correcting it:

- **`popularity >= 75`** (star/GOAT tier, ~150-200 entries): full
  research-grade verification. Use WebFetch/WebSearch against a real
  stats source (Basketball-Reference or equivalent) and confirm the
  specific season. These are the players anyone playing the game will
  recognize and scrutinize — get them right.
- **`popularity < 75`** (the long tail, ~700+ entries): a lighter
  internal-consistency pass. Fix anything statistically absurd (a
  bench-tier player with superstar numbers, obviously copy-pasted stat
  lines between different players, a stat at zero across the board,
  numbers inconsistent with the assigned archetype/position) without
  necessarily verifying every decimal against a box score. If something
  looks fine and plausible for a role player of that era/position, leave
  it. Spend your lookups on the top tier.

### Archetype
Exactly one of these 6 values (case-sensitive, must match exactly —
`js/logic/chemistry.js` and `js/logic/positions.js` both switch on the
literal string):

| Archetype | Real-world signal |
|---|---|
| `Playmaker` | Primary ball-handler/facilitator; offense runs through their passing |
| `Sharpshooter` | Elite perimeter/catch-and-shoot scorer; floor-spacing threat |
| `Lockdown Defender` | Defense is their calling card — on-ball stopper or havoc-generating defender |
| `Slasher` | Attacks the rim off the dribble/in transition; scores by getting downhill, not standing shooting |
| `Paint Beast` | Interior force — rebounding and/or rim protection is the primary value |
| `Two-Way Star` | Genuine two-way superstar — elite on both ends, not just good defense with modest offense |

Pick by real playing style and reputation, not just "which stat is
highest" — e.g., a player who both defends elite and scores at a star
level is `Two-Way Star`, not `Lockdown Defender` just because their
steal/block numbers are good.

### Traits
2 or 3 tags per player (existing data never uses 1 or 4+ — keep that
convention). Full vocabulary, split by whether the trait is read by
chemistry bonuses/penalties (`js/logic/chemistry.js`) or purely
decorative:

**Mechanically live** (chemistry.js checks for these exact strings):
`Point God`, `Elite Playmaker`, `Rim Protector`, `Floor Spacer`,
`Lockdown Defender`, `Volume Shooter`, `Clutch`, `Glue Guy`,
`Rebounding Machine`, `Hustle Player`, `Clutch Assassin`,
`Championship DNA`, `Court Vision`, `Iron Man`, `Post Maestro`.

**Decorative only** (shown as badges, no bonus logic reads them):
`Defensive Stopper`, `Floor General`, `Slasher` (as a trait — distinct
from the `Slasher` archetype), `Post Scorer`, `Mid-Range Maestro`,
`3-and-D`, `Lob Threat`, `Franchise Player`, `Stretch Big`,
`Volume Scorer`.

**Currently unused anywhere in the data**: `Championship DNA`,
`Court Vision`, `Iron Man`, `Post Maestro`. Their chemistry bonuses
("Winner's Circle," "Pinpoint Passing," "Iron Man," "Kick-Out Game")
have never fired for anyone. Decision (approved): assign these where
genuinely earned during the audit —
- `Championship DNA` → multiple-ring players with a real case for it
- `Court Vision` → elite passers, can coexist with `Elite Playmaker`/`Point God`
- `Iron Man` → players known for durability/never missing games
- `Post Maestro` → true back-to-the-basket scorers

Prefer accuracy over forcing these in — only assign where a player
genuinely earns it, don't pad every batch with a quota of them.

### Popularity
Handled separately from the per-decade stat batches — see
`progress.md` batch 27. Two mechanisms:
- `NAMED` dict in `scripts/add_popularity.js` (keyed by **player name**,
  applies to every team/decade entry that player has — approved decision:
  keep it name-keyed, not per-career-stage; don't restructure this into
  an id-keyed override).
- Stat-derived formula (`formulaPopularity()` in the same file) for
  everyone not in `NAMED`. This auto-corrects once the underlying stats
  are fixed — don't hand-set popularity for un-named role players.

Curate `NAMED` by real career accolades + Hall-of-Fame stature + cultural
fame, on the existing 35–99 scale. Known-bad examples found in scoping to
anchor calibration: Harden and Embiid (both MVPs) pinned at 65, below
several non-MVP role players; Karl Malone (2x MVP, 2nd all-time scorer at
retirement) at 70; Jokic (multi-MVP) at 80, below several non-MVP peers.
After editing `NAMED`, regenerate with `bash scripts/update_players.sh`
(runs `add_popularity.js` then `inline_players.js`) rather than hand-editing
`popularity` values in `players.json` directly.

## Per-batch workflow

1. Open `progress.md`, find the first batch with status `pending`.
2. For each player in that batch's buckets: check/correct stats
   (research-grade if `popularity >= 75`, consistency-pass otherwise),
   reassign `archetype`/`traits` if wrong.
3. Run `node scripts/validate_players.js` — must pass clean before
   moving on.
4. Run `node scripts/inline_players.js` to resync `js/data/players.js`.
5. Smoke-test: serve the repo root, load the app with a Firebase-CDN
   stub import map (network is blocked in this sandbox — see any prior
   session's use of `_fb-stub.js` + an import map redirecting the three
   `gstatic.com` firebase URLs to it), draft a roster touching a few
   just-edited players, run a season sim. Confirm no console errors and
   the picks/stats render as expected.
6. Commit the batch with a message naming what changed (e.g. "Player
   data audit: batch 3 — 1970s Blazers-Jazz").
7. Update `progress.md`: flip the batch to `done`, add a one-line log
   entry of anything notable (corrections made, judgment calls, players
   you weren't fully confident on).

## Data integrity constraints (enforced by `scripts/validate_players.js`)
- Every `id` unique across the whole file (3 known collisions exist at
  the start of this project — see `progress.md` batch 28).
- `archetype` ∈ the 6 canonical values.
- `pos` ∈ `{PG, SG, SF, PF, C}`.
- `traits.length` ∈ `{2, 3}`.
- `popularity` is an integer in `[35, 99]` (observed existing range).
- Stats are non-negative numbers within loose sanity bounds (ppg ≤ 50,
  rpg ≤ 30, apg ≤ 20, spg ≤ 6, bpg ≤ 8) — catches fat-finger typos, not a
  realism check by itself.

## Review cadence
One PR per decade (7 checkpoints: 1960s, 1970s, 1980s, 1990s, 2000s,
2010s, 2020s), squash-merged after review — same workflow as the rest of
this project. The popularity-dict batch and the wrap-up batch each get
their own PR too.

## Required follow-up after the full pass (not part of this project)
Once all batches land, the underlying stat distribution across all 938
players will have shifted (fabricated inflated lines get corrected, which
likely compresses the top end). `js/logic/simulation.js`'s `STARTER_BASE`
(derived live from the DB) will shift with it, and `SIM_CENTER` was
calibrated against the pre-audit distribution. Flag a difficulty
re-calibration pass once this project is done — this was already an open
thread from the original project brief ("playtest feel of the 5-pick
draft + new difficulty").
