# Porting "Can You Go 82-0?" to AFL

A step-by-step plan for producing an Australian Football League version of this
game as a **separate repository and separate site**, reusing this codebase's
architecture but replacing its sport model end to end.

Nothing in this document has been implemented. It is the build order, the
decisions that have to be locked before code starts, and the traps that are
specific to translating a basketball game to Australian football.

**Working title:** *Can You Go 22-0?*

---

## 0. What actually has to change (the honest summary)

The temptation is to treat this as a find-and-replace: swap `Lakers` → `Carlton`,
`PG` → `MID`, `ppg` → `disposals`, `82` → `22`, ship it. That produces a broken
game, for five specific reasons:

1. **The season is a quarter as long.** `WIN_CAP = 0.99` over 82 games gives a
   maxed roster a 44% shot at perfection. Over 22 games the same cap gives it
   **80%**. Every sigmoid constant in `simulation.js` has to be re-derived, not
   copied.
2. **AFL finals are not a bracket.** The AFL Final Eight is a
   double-chance system with byes for qualifying-final winners, and every game
   is single elimination — not best-of-7. `playoffs.js`, `buildBracket()` and
   `simulateSeries()` are rewrites, not renames.
3. **The team × decade grid is full of holes.** Every NBA franchise in this DB
   has a plausible entry in most decades. In the AFL, GWS did not exist before
   2012, Fremantle before 1995, or Adelaide before 1991 — and Brisbane Lions,
   Sydney and Western Bulldogs are all renames/mergers of earlier entities. The
   draft wheel must be taught which cells exist.
4. **Historic AFL stats do not exist for the fields the engine needs.** Tackles
   and hit-outs were not recorded before 1987; clearances and contested
   possessions not before ~1998. The engine's five-stat balance model cannot be
   fed for a 1960s or 1970s bucket without either dropping those decades or
   defining an explicit imputation policy.
5. **There is no NBA 2K for football.** The entire `overall` rating pipeline —
   which is most of `data/`, most of `scripts/`, and the field every gameplay
   constant is now tuned against — has no direct counterpart and must be rebuilt
   from Brownlow votes, All-Australian selections, Champion Data AFL Player
   Ratings and club best-and-fairests.

Points 4 and 5 are the bulk of the work. The JavaScript port is comparatively
mechanical; the data is the project.

---

## 1. Decisions to lock before any code

These change downstream work enough that guessing wrong means rework. My
recommendation is given for each; they are all reversible cheaply *only* if
decided now.

| # | Decision | Recommendation | Why / cost of the alternative |
|---|---|---|---|
| D1 | Season length & title | **22 games — "Can You Go 22-0?"** | 22 was the home-and-away length from 1970 until 2022 and is the number footy fans carry in their heads. The AFL now plays 23 games per club across 24 rounds, so "23-0" is *currently* accurate but reads as arbitrary and dates the brand each time the fixture changes. |
| D2 | Repo strategy | **Fresh repo, copied from this one** | Different domain, different sitemap, different search intent, different Firebase project. A monorepo with a "sport pack" abstraction is architecturally nicer but destabilises a live site that is already earning organic traffic. Revisit only if a third sport appears. |
| D3 | Roster size / slots | **6 slots: KEY DEF · HALF-BACK · MID · RUCK · KEY FWD · SMALL FWD** | 5 slots is the minimum-change option but omits the ruck *or* the small forward, and both are load-bearing in how footy people think about a team. 7+ makes the draft long and the lineup optimiser expensive (see §6.3). 6 is the recognisable spine. |
| D4 | The five balance-scored stats | **Disposals · Goals · Marks · Tackles · Clearances** | Hit-outs is the obvious fifth pick and the wrong one: it is ~zero for five of six positions, so the sim's "weakest stat" balance penalty would fire on every roster and always indict the ruck. Hit-outs is carried as a **sixth display/synergy-only** stat. |
| D5 | Era range | **1970s – 2020s (6 decades)** | 1960s is tempting for the Barassi/Whitten era but has no tackle, hit-out or clearance data at all (§4.2). 1970s is already partly imputed; treat 1960s as a possible later expansion, not v1 scope. |
| D6 | Duel/series format | **Best-of-3 "Challenge Series"** | AFL has no best-of-7 anything. A single Grand Final is the authentic answer but makes 1v1 and Dynasty Duel a coin flip with no drama arc. Best-of-3 is a compromise; flag it in copy as a fantasy exhibition rather than pretending it's a real format. |
| D7 | Draws | **Model them; display W–L–D and percentage** | Home-and-away games can be drawn. It costs little in the sim and it is the single cheapest authenticity signal in the whole port — and it makes "22-0" mean *no losses and no draws*, which is a better dare. |
| D8 | Club branding | **Names + guernsey colours only, no logos, no marks** | Same posture as the NBA version's disclaimer, held slightly tighter — AFL clubs are active about logo enforcement. Colours as hex are fine. |

Ancillary naming: domain `canyougo220.com` (verify availability before
committing to the title), storage key prefix `afl220_`, Firebase project
distinct from `basketball-gm-sim-c33ed`.

---

## 2. Phase 1 — Repository setup

1. Create the new GitHub repo (suggested: `afl-all-time-team-can-you-go-22-0`).
2. Copy this repo's working tree **without git history** — the history is 200+
   PRs of NBA-specific tuning and will only confuse `git blame` on the new code.
   Record the source commit SHA in the new `README.md` instead.
3. Delete before first commit, so nothing stale ships:
   - `players.json`, `js/data/players.js`
   - all of `data/` (every file is NBA-2K provenance)
   - `scripts/build_*_peak_ratings.py`, `scripts/match_2k_overalls.py`,
     `scripts/normalize_2k_overalls_by_era.py`
   - `daily/*.html`, `sitemap.xml`, `og-image.png`, `favicon.ico`, `CNAME`
   - `docs/player-data-audit/progress.md` (keep `rubric.md` as a template to
     rewrite)
4. Keep and adapt: `scripts/add_rating.js`, `scripts/add_popularity.js`,
   `scripts/inline_players.js`, `scripts/validate_players.js`,
   `scripts/update_players.sh`, `scripts/build_challenge_pages.mjs`,
   `scripts/build_tailwind.sh`, `scripts/build_favicon.sh`,
   `scripts/build_og_image.sh`.
5. Stand up a **stub `players.json`** — 3 clubs × 2 decades, ~40 entries,
   hand-written — on day one. This unblocks every logic and UI task in
   §5–§8 so they don't queue behind the six-week data project in §4.
6. Rewrite `AGENTS.md` and `README.md` for the new game. Leave the
   "static, no build step, no bundler, serve over `python3 -m http.server`"
   contract intact — it is a genuine strength of this codebase.

---

## 3. Phase 2 — The translation table

Write this out as `docs/afl-domain-model.md` in the new repo *before* touching
code. Every later phase refers back to it, and having it in one file is what
stops the taxonomy drifting between `chemistry.js`, `positions.js` and the UI
copy.

### 3.1 Clubs (18) and their era availability

The DB bucket key format `Team_Decade` survives unchanged. What changes is that
the grid is sparse and historically constrained:

| Club | 1970s | 1980s | 1990s | 2000s | 2010s | 2020s | Note |
|---|---|---|---|---|---|---|---|
| Carlton, Collingwood, Essendon, Geelong, Hawthorn, Melbourne, North Melbourne, Richmond, St Kilda | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Continuous VFL/AFL presence |
| Western Bulldogs | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Named **Footscray** until 1996 |
| Sydney Swans | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **South Melbourne** until 1982 |
| West Coast Eagles | — | ✅ (1987+) | ✅ | ✅ | ✅ | ✅ | |
| Brisbane Lions | — | ✅ (1987+) | ✅ | ✅ | ✅ | ✅ | Brisbane **Bears** 1987–96; merged with **Fitzroy** 1997 |
| Adelaide Crows | — | — | ✅ (1991+) | ✅ | ✅ | ✅ | |
| Fremantle | — | — | ✅ (1995+) | ✅ | ✅ | ✅ | |
| Port Adelaide | — | — | ✅ (1997+) | ✅ | ✅ | ✅ | |
| Gold Coast Suns | — | — | — | — | ✅ (2011+) | ✅ | |
| GWS Giants | — | — | — | — | ✅ (2012+) | ✅ | |

Decisions this forces:

- **Renames.** Store the club under its modern name as the bucket key, but add a
  per-entry `eraClubName` field so a Footscray-era player is displayed as
  *Footscray*, not *Western Bulldogs*. Cheap to add now, impossible to retrofit
  once the data is written.
- **Fitzroy.** Either fold Fitzroy players into the Brisbane Lions bucket
  (defensible — the club lineage merged) or add Fitzroy as a defunct-club
  Easter egg. Recommend folding, with `eraClubName: 'Fitzroy'`.
- **Half-decade entries.** West Coast/Brisbane in "the 1980s" means 1987–89
  only. Flag these in the data and consider excluding them from the 1980s spin
  pool unless the bucket reaches a minimum depth (see §5.2).

### 3.2 Positions (6 slots)

| Slot | Code | Meaning | Nearest NBA analogue in the old code |
|---|---|---|---|
| Key Defender | `KD` | Intercepting/shutdown tall back | C |
| Half-Back | `HB` | Rebounding, run-and-carry defender | PG |
| Midfielder | `MID` | Inside/outside on-baller | SG |
| Ruck | `RUC` | Ruckman | PF |
| Key Forward | `KF` | Tall marking forward | SF |
| Small Forward | `SF` | Crumbing/pressure goalkicker | — (new slot) |

`POS_RANK` in `positions.js` becomes a **defence→forward axis**:
`KD 0 · HB 1 · MID 2 · RUC 3 · KF 4 · SF 5`. This is not perfect — a ruck sits
awkwardly on a defence-forward line — but it preserves the "closest secondary
position first" sort, which is all `POS_RANK` is used for.

Secondary-position rules to write (replacing the eleven NBA rules):

- `MID` → `HB` when marks are high and clearances low (outside runner)
- `MID` → `SF` when goals per game are high (forward-half mid)
- `HB` → `MID` when disposals are high (rebounding mid)
- `KD` → `KF` when goals are non-trivial (swingman, a very AFL archetype)
- `KF` → `RUC` when hit-outs are non-trivial (pinch-hitting ruck)
- `RUC` → `KF` on high marks/goals (ruck-forward)
- `SF` → `MID` when disposals are high (forward who rotates through)

### 3.3 Archetypes (6, replacing the NBA six)

| AFL archetype | Replaces | Signature |
|---|---|---|
| Ball Magnet | Playmaker | Elite disposals + clearances |
| Goal Sneak | Sharpshooter | High goals, low disposals, `SF` |
| Power Forward | Slasher | High goals + marks, `KF` |
| Intercept Marker | Paint Beast | High marks, `KD` |
| Lockdown Defender | Lockdown Defender | Name survives — it means the same thing |
| Ruck Bull | Two-Way Star | Hit-outs + contested work |

Keep the count at six. `ARCHETYPE_STYLE` in `state.js` is a straight colour
remap; the archetype **strings** are load-bearing in ~35 places in
`chemistry.js`, so change them once, in one commit, with a grep sweep.

### 3.4 Traits (21 → ~21)

Direct replacements, keeping the same count so trait-density tuning carries
over: Clutch → **Big Game Player**; Floor Spacer → **Elite Kick**; Elite
Playmaker → **Elite Disposal**; Volume Shooter → **Volume Goalkicker**; Rim
Protector → **Intercept King**; Glue Guy → **Team Man**; Point God → **Ball
Winner**; Floor General → **Onball General**; 3-and-D → **Run and Carry**;
Post Scorer → **Contested Marker**; Rebounding Machine → **Hit-out Machine**;
Lob Threat → **Aerialist**; Mid-Range Maestro → **Set Shot Specialist**;
Franchise Player → **One-Club Champion**; Stretch Big → **Ruck-Forward**;
Volume Scorer → **Bag Hunter**; Hustle Player → **Pressure Machine**;
Defensive Stopper → **Tagger**; Clutch Assassin → **Big Finals Performer**;
Slasher → **Line-Breaker**; Lockdown Defender → **Shutdown Back**.

### 3.5 Coaches (8)

Replacing the NBA eight, one per era, each with a genuine tactical identity the
`coachSystemProgress()` meter can key off:

| Coach | Era | System | Meter keys off |
|---|---|---|---|
| Ron Barassi | 1970s | Handball Revolution | Team disposals ratio |
| Tom Hafey | 1970s/80s | Run and Carry | Team marks ratio |
| Allan Jeans | 1980s | Hawthorn Discipline | Worst-slot balance (Rivers analogue) |
| Kevin Sheedy | 1990s | Positional Flexibility | Count of players with a secondary position |
| Leigh Matthews | 2000s | Contested Beasts | Team clearances ratio |
| Paul Roos | 2000s | The Flood | Team tackles ratio |
| Alastair Clarkson | 2010s | Cluster / Press | Count of Lockdown Defenders + Taggers |
| Damien Hardwick | 2010s/20s | Forward Press | Count of Small Forwards + team goals |

### 3.6 Chemistry synergies

Replace all ~20 synergy rules. The family structure (`position`, `offense`,
`defense`, `intangibles`) and all four caps carry over unchanged — retune the
cap values only after §9 sweeps, not before.

Candidate rules: **Ruck-Rover Combination** (Ruck Bull + Ball Magnet — the
oldest synergy in the sport); **Twin Towers Forward Line** (two `KF`);
**Tall Timber** (`KD` + `RUC` both Intercept/Bull); **Engine Room** (3+ high
clearance); **Rebound Chain** (2+ `HB` with high marks); **Forward Press**
(2+ `SF` with high tackles); **Aerial Assault** (team marks over baseline);
**One-Club Spine** (3+ from the same club — direct port of Franchise Loyalty);
**Interstate Academy** (3+ from the same decade — port of era-stacking);
**Goalkicking Spread** (goals distributed across 3+ players, not one bag
hunter). Penalties: **No Ruck** (no `RUC` covering the slot), **No Target
Inside 50** (no `KF`), **Undersized** (three or more smalls), **All Take No
Give** (no player with Elite Disposal).

---

## 4. Phase 3 — Data acquisition (the long pole)

Budget the majority of the project here. Target roughly **800–1000 entries**
across ~90 populated `Club_Decade` buckets, matching the current DB's density
(937 entries / 178 buckets).

### 4.1 Sources

| Source | Covers | Access |
|---|---|---|
| **AFL Tables** (afltables.com) | Per-player, per-season, per-club totals and averages from 1897; Brownlow votes; club best-and-fairest | Free HTML; the canonical open AFL dataset |
| **fitzRoy** (R package) | Wraps AFL Tables + Footywire + AFL.com + Squiggle | Best-maintained scraper; recommend using this rather than writing one |
| **Footywire** | Champion Data derived stats (clearances, contested possessions, inside 50s) 1998+ | Free HTML |
| **AFL Player Ratings** (Champion Data) | Official per-player rating, 2012+ | Proprietary — published rankings are usable, bulk data is not |
| **Wikipedia / AFL.com** | All-Australian teams, Brownlow, Coleman, Norm Smith, club Team of the Century | Free |

Check each source's terms before scraping and cache raw pulls into `data/` with
a provenance note, exactly as `data/README.md` does today. That file is the
model to imitate — it is unusually good about stating what is real, what is
derived, and what is missing.

### 4.2 The historic-stats problem, and the policy for it

This is the single largest data risk. What is actually available:

- Kicks, handballs, **disposals**, **marks**, **goals**: from 1965.
- **Hit-outs** and **tackles**: from **1987** only.
- **Clearances**, contested possessions, inside 50s: from **~1998** only.

So two of the five chosen balance stats (D4) simply do not exist for the 1970s,
and clearances do not exist for the 1980s or most of the 1990s.

Three options, in order of preference:

1. **Impute by position and era, and label it.** Derive per-decade, per-position
   medians from the earliest era where the stat *is* recorded, scale by that
   decade's pace factor, and stamp each imputed value with
   `"imputed": ["tackles","clearances"]` on the entry. The UI shows an
   asterisk on imputed stat lines. Honest, keeps the eras, and costs one
   script. **Recommended.**
2. **Narrow the era range to 1990s–2020s.** Cleanest data, but throws away the
   Barassi/Hafey/Jeans era that makes an all-time footy game feel all-time.
3. **Change the stat five to disposals/goals/marks/kicks/handballs**, all
   available from 1965. Fully historical, but disposals = kicks + handballs, so
   three of the five stats are collinear and the balance model degenerates.
   Rejected.

Whichever is chosen, it must be written into the AFL equivalent of
`docs/player-data-audit/rubric.md` before data entry begins, not decided
per-entry by whoever is filling in a bucket.

### 4.3 Era normalisation (`era.js`)

The NBA version normalises by possessions per 48 minutes. AFL needs **two**
factors, because the game moved in opposite directions on two axes:

- **Disposal factor** — league average disposals per team per game climbed from
  roughly the low 300s in the 1970s to the low 400s by the 2010s (interchange
  rotations, handball-heavy ball movement). Without correction every modern
  midfielder outranks every historic one.
- **Scoring factor** — league average score per team peaked around 100+ points
  in the high-scoring late 1980s/early 1990s and fell to the low 80s by the
  2020s (defensive structures, the flood, congestion). Without correction every
  historic forward outranks every modern one.

So `ERA_PACE` becomes `ERA_FACTORS = { '1990s': { disposal: …, scoring: … }, … }`
and `eraAdjustedStat()` picks the factor by stat key: goals use the scoring
factor; disposals, marks, tackles and clearances use the disposal factor.
Derive the actual multipliers from AFL Tables league totals — do not
hand-wave them.

This is a **genuine improvement** over the NBA version's single factor and is
worth doing properly; it is also the thing most likely to be got wrong, because
the two curves move in opposite directions and a sign error will look
superficially plausible.

### 4.4 The `overall` rating pipeline

There is no NBA 2K equivalent, so build a composite. Proposed inputs, in
descending weight:

1. **AFL Player Ratings** (Champion Data) where available — 2012+ only.
2. **All-Australian selections** in the decade (count, plus captaincy).
3. **Brownlow Medal votes** in the decade (career-best season and decade total).
4. **Coleman Medal / leading goalkicker** finishes, for forwards.
5. **Club best-and-fairest** wins — the best available signal for players whose
   value never showed in Brownlow votes (key defenders, taggers, rucks, whose
   Brownlow undercount is systematic and well known).
6. **AFL Team of the Century / club Team of the Century** membership as a
   ceiling anchor.
7. **Games played for the club in that decade** as a floor, so a two-season
   cameo cannot outrank a decade-long champion.

Then apply the *same* per-era quantile normalisation this repo already uses
(`normalize_2k_overalls_by_era.py`) so each decade's peak lands on a shared 99
ceiling and cross-era means converge. That script is the most transferable
asset in the whole repo — port it, change only the input field.

Award-based ratings have a **known structural bias against defenders**: Brownlow
votes go to ball-winners, and All-Australian defensive slots are fewer. Correct
for it explicitly with a per-position calibration pass, and document that you
did, or every draft board will make key defenders look like filler.

### 4.5 `popularity` ("fans")

Used by the Fans First mode, the Boos Only challenge, and Phil Jackson's
star-count meter. Build from: Brownlow/Norm Smith/Coleman wins, AFL Hall of Fame
and Legend status, games played, premierships, and a subjective
recognisability pass. Same 35–99 scale, same shape.

### 4.6 Pipeline scripts to port

| Script | Change |
|---|---|
| `add_rating.js` | Stat weights change from `ppg/rpg/apg/spg/bpg` to the AFL five; percentile-anchor remapping logic unchanged |
| `add_popularity.js` | Input signals per §4.5 |
| `normalize_*_by_era.py` | Rename to `normalize_overalls_by_era.py`, input field becomes the §4.4 composite |
| `inline_players.js` | Unchanged |
| `validate_players.js` | Rewrite the schema assertions: new positions, new archetypes, new traits, new stat keys, plus new checks for `eraClubName` and club-era legality |
| `audit_stats.js` | Rewrite thresholds for AFL stat ranges |

Add one **new** validator this repo doesn't have and should: assert that no
entry places a player at a club in a decade the club did not exist (§3.1). It
is the AFL-specific failure mode that will otherwise slip through.

---

## 5. Phase 4 — Core logic port

Ordered so each step compiles and plays against the stub DB.

### 5.1 `js/logic/state.js`

- `TEAMS` → 18 clubs. `TEAM_COLORS` → guernsey primary/secondary hex per club.
- `DECADES` → `['1970s','1980s','1990s','2000s','2010s','2020s']`.
- `POSITIONS` → the six slots; `TOTAL_ROUNDS` → 6.
- `SNAKE_ORDER` → 12 picks. Extend the existing 1-2-2-1 pattern:
  `[1,2,2,1,1,2,2,1,1,2,2,1]`.
- `ERA_DESC` → three signature names per decade.
- `COACHES` → the eight from §3.5.
- `CPU_TEAMS` → rename to AFL dynasty sides with plausible strengths
  (1970s Richmond, 1980s Hawthorn, 1990s West Coast, 2000s Brisbane, 2010s
  Hawthorn, 2020s Melbourne/Geelong).
- **New:** a `CLUB_ERAS` map encoding §3.1, exported for the draft and
  validators.

### 5.2 `js/logic/draft.js`

- `eligibleTeams()` must additionally filter by `CLUB_ERAS` for the decade under
  consideration, and by a **minimum bucket depth** (suggest 4 players) so a
  thin half-decade bucket like West Coast 1980s cannot produce a dead spin.
- Confirm the existing dead-spin guard (`if (!spin)` in `events.js`) actually
  covers a fully-exhausted grid; with the sparser AFL grid this path will be hit
  far more often than it ever was in the NBA version. Add a test board that
  deliberately exhausts a decade.
- Star/GOAT tier cutoffs are tuned to the NBA `overall` distribution — re-derive
  them from the AFL distribution's percentiles once real data lands (§9).

### 5.3 `js/logic/positions.js`

Rewrite `POS_RANK` and `deriveSecondary()` per §3.2. Same structure, new rules,
new thresholds. Thresholds must be set from the real AFL stat distributions, not
transposed.

### 5.4 `js/logic/era.js`

Rewrite per §4.3 — dual factors. This is the file where a quiet error does the
most damage, because everything downstream (`STARTER_BASE`, coach meters, loss
diagnosis, AI draft) reads through it. Write it with a small self-check that
prints per-decade adjusted means and confirms they converge.

### 5.5 `js/logic/chemistry.js`

The largest single-file port (~1000 lines). Order of work:

1. `FLOOR_SLOTS` → the six AFL slots.
2. `optimizeLineup()` — logic unchanged, but see the performance note in §6.3.
3. Replace the archetype flag block (`sHasPlaymaker`, `sSharpCount`, …) with AFL
   equivalents.
4. Replace every synergy and penalty rule per §3.6, keeping `id`/`kind`/`family`
   shape intact so `render.js` and the defence-mode profile boosts keep working
   untouched.
5. Replace coach-amplification branches (`coach === 'auerbach'` etc.) with the
   §3.5 coach ids.
6. Leave `SYNERGY_SCALE`, `FAMILY_CAPS`, `CHEM_SCORE_SCALE` at current values
   until §9 says otherwise.

---

## 6. Phase 5 — Simulation and finals

### 6.1 Retuning the sigmoid (do not skip)

`SIM_K = 3.5`, `SIM_CENTER = 1.8`, `WIN_CAP = 0.99` were fitted for 82 games.
The arithmetic of why they cannot survive the change:

| Per-game win prob | P(perfect) over 82 | P(perfect) over 22 |
|---|---|---|
| 0.99 | 44% | 80% |
| 0.95 | 1.5% | 32% |
| 0.90 | 0.02% | 10% |
| 0.85 | ~10⁻⁶ | 2.8% |
| 0.82 | ~10⁻⁷ | 1.3% |

To preserve this game's actual design target — *P(perfect) ≈ 1.5% for a
star-chasing build, so the chase stays real but rare* — the top of the strength
distribution must map to a per-game win probability around **0.82**, not 0.99.

Concretely: lower `WIN_CAP` to ≈ 0.88, raise `SIM_CENTER`, and re-fit `SIM_K`
against the real DB with the same 400-sample sweep methodology already
documented in the `simulation.js` header comment. Reproduce that comment block
with the new AFL anchors — it is the best piece of documentation in this
codebase and the new version deserves the equivalent.

### 6.2 Season model

- Loop bound `82` → `22` (three occurrences in `simulation.js`).
- **Draws** (D7): a narrow probability band around the 50% line resolves to a
  draw. Return `{ wins, losses, draws, premiershipPoints, percentage }`.
- **Percentage** = points for ÷ points against × 100 — needs the sim to produce
  actual scores, which it currently does not. Generate a per-game score from
  team strength: goals and behinds separately, so the display can render
  `15.12 (102)`. This is a genuine feature add, not a port, and is what will
  make the results screen read as footy.
- `seasonTier()` thresholds → `22` perfect · `≥19` Minor Premiership · `≥16`
  Top Four · `≥13` Finals · else Rebuild. (13 of 22 is a realistic historic
  eighth-place cut; confirm against ladder history before locking.)
- The `balancePenalty` threshold `0.82` is a *ratio*, not a game count — leave
  it alone. Easy thing to "fix" by mistake during a 82→22 sweep.

### 6.3 Lineup optimiser performance

`optimizeLineup()` enumerates ordered slot selections P(slots, n). Going 5 → 6
slots takes the full permutation count from **120 to 720**, and
`aiDraft.js` calls `calculateChemistry()` twice per board player on every CPU
pick. Expect roughly a 6× cost increase on the hottest path in the app.

Almost certainly still fine on modern hardware, but measure it before shipping,
and if it bites, the fix is to prune obviously-bad assignments (a `KD` will
never optimally fill `SF`) rather than to shrink the roster.

### 6.4 Finals — the AFL Final Eight

Rewrite `buildBracket()` in `state.js` and all of `playoffs.js`. Structure:

- **Week 1:** Qualifying Final 1 (1 v 4), Qualifying Final 2 (2 v 3),
  Elimination Final 1 (5 v 8), Elimination Final 2 (6 v 7).
- **Week 2:** QF winners have a **bye** and advance straight to Preliminary
  Finals. Semi Finals pair the QF losers against the EF winners, crossed
  between brackets.
- **Week 3:** Preliminary Finals — each QF winner hosts a Semi Final winner.
- **Week 4:** Grand Final.

Every game is single elimination, so `simulateSeries()` becomes
`simulateFinal()` — one game, with extra time on a draw. Confirm the exact
cross-bracket pairing against the AFL's published system before coding; the
rule is well defined but easy to mis-transcribe from memory.

`QF_SEED_PAIRS`, `matchupScores()` and `getBracketDisplayState()` all rebuild
around the new tree, and the bracket **renderer** in `render.js` needs a new
shape — the AFL tree is asymmetric (byes on one side), so the existing
symmetric 8→4→2→1 layout will not do.

Upside: a correctly-drawn AFL finals bracket with the double chance is an
authenticity signal footy fans will notice immediately.

---

## 7. Phase 6 — Modes, challenges, storage

### 7.1 `modes.js`

Mode ids survive; `postDraft: 'series'` becomes `'finalsSeries'` (best-of-3 per
D6). Mode copy is rewritten: "Defense Only" → **"Stoppers Only"** (tackles and
marks carry the sim); "Fans First" survives with AFL popularity.

### 7.2 `challenge.js` — new catalog

All 16 challenges are NBA-specific and get replaced. Candidates:

| Type | Challenge | Rule |
|---|---|---|
| constraint | **Ninety-Nine Fever** | 1990s players only |
| constraint | **The Modern Game** | 2010s + 2020s only |
| constraint | **Before the Merger** | 1970s + 1980s only |
| constraint | **No Victorians** | No Vic clubs — win 16+ |
| constraint | **Cheap Seats** | Total roster fans under a budget |
| constraint | **One Club Only** | Every player from a single club |
| objective | **Minor Premiers** | Win 19+ |
| objective | **The Bag** | A forward line kicking 5+ goals a game |
| objective | **Chip and Chase** | Team disposals above a threshold |
| objective | **Lockdown** | Concede under a points-against threshold |
| objective | **Flag or Nothing** | Must win the Grand Final |
| locked | **Around the Big Man** | Pre-locked ruck |
| locked | **Buddy Ball** | Pre-locked key forward |
| locked | **The Rat** / **Chris Judd** / **Gary Ablett Jr** | Pre-locked mid |

`checkPickLegal`, `checkRosterConstraint`, `evaluateObjective` and `dailyScore`
keep their shapes; only the params and predicates change. `minPopularity()`
recomputes from the new DB automatically.

**New param needed:** `excludeStates` (or a `state` field on clubs) for
Victorian/interstate challenges — a dimension the NBA version has no analogue
for and which is very natural in footy.

### 7.3 Storage and Firebase

- Every `nba820_*` key in `storage.js` → `afl220_*`. There are ~20; sweep them
  in one commit and confirm no string is built dynamically.
- **New Firebase project.** Do not reuse `basketball-gm-sim-c33ed` and do not
  reuse the `leaderboard` / `dailyLeaderboard` collections — a shared collection
  would mix two games' scores irrecoverably.
- Migration: none. This is a new game with a new audience; a fresh leaderboard
  is correct.

### 7.4 Ad/portal SDKs

`crazygames.js` and `gamedistribution.js` need new game ids and fresh portal
registrations. `pageIntegrity.js` ports unchanged — it is sport-agnostic and
was written after a real incident; keep it.

---

## 8. Phase 7 — UI, copy, branding, SEO

1. **Copy sweep.** Every user-facing string. `render.js` (3154 lines) and
   `events.js` (1541) carry most of it; `index.html` has 27 instances of "82-0"
   alone. Terminology: *season* → *home-and-away season*; *playoffs* → *finals*;
   *championship* → *premiership / flag*; *coach* stays *coach*; *roster* →
   *team* or *side*; *starting five* → *the spine*; *wins* → *wins* but shown as
   W–L–D with percentage.
2. **Assets.** New `favicon.svg` (Sherrin, not an orange ball) → rebuild
   `favicon.ico` via `build_favicon.sh`. New `og-image.svg` → rebuild the PNG.
   New `logo-badge.svg`.
3. **Colour system.** `css/styles.css` and `tailwind.config.js` — swap the
   NBA-orange accent for something footy-neutral (do not use any single club's
   palette as the site accent). Re-run `scripts/build_tailwind.sh` after class
   changes.
4. **SEO.** New `<title>`, meta description, canonical, OG/Twitter tags, JSON-LD
   `WebApplication` block, FAQ section, keyword set. Target Australian search
   intent: *AFL team generator*, *AFL all-time team builder*, *AFL season
   simulator*, *AFL draft game*, *build your AFL dream team*. **Do not copy the
   NBA site's canonical URLs** — a stray canonical pointing at
   `canyougo820.com` would hand the new site's ranking to the old one.
5. **`daily.html` + `daily/`.** Regenerate from the new catalog via
   `build_challenge_pages.mjs` (change `ORIGIN`, `LAUNCH`, and the copy
   templates). Port the nightly refresh GitHub Action as-is.
6. **`privacy.html`, `robots.txt`, `sitemap.xml`, `CNAME`** — new domain
   throughout.
7. **Disclaimer.** Same shape as the NBA one: *not affiliated with, endorsed by,
   or sponsored by the AFL or any club; all club and player names are the
   property of their respective owners and are used for identification only.*

---

## 9. Phase 8 — Balance, QA, launch

1. **Write the sweep harness first.** The NBA version's tuning comments cite
   400- and 1500-sample sweeps; that harness isn't in the repo. Write it as
   `scripts/sweep.mjs` — it is the only way to hit the §6.1 targets without
   guessing, and it pays for itself immediately.
2. **Fit the constants** against real data, in this order: `era.js` factors →
   `overall` distribution percentiles (star/GOAT cutoffs, AI-draft window, badge
   colours) → sim sigmoid → `FAMILY_CAPS` and `SYNERGY_SCALE` → daily-challenge
   win gates. Each depends on the ones before it; doing them out of order means
   doing them twice.
3. **Targets to hit:** random builds median ≈ 6–8 wins of 22; star-chasing
   builds median ≈ 17–18; P(22-0) ≈ 1–2%; finals (13+ wins) reachable by a
   competent draft roughly half the time.
4. **Manual QA matrix:** every mode × every decade × light/dark × mobile;
   deliberately exhausted draft grids; a full finals run including a draw in the
   Grand Final; offline (fonts blocked, Firebase unreachable, confetti CDN
   blocked) — all three must degrade gracefully as they do today.
5. **Data audit.** Port `docs/player-data-audit/rubric.md` to AFL rules and run
   a full pass. Every entry must be a real season that player had at that club
   in that decade, per the existing rubric's standard — that discipline is why
   the NBA data holds up, and it is the easiest thing to quietly drop.
6. **Launch:** domain + GitHub Pages + `CNAME`, Search Console, sitemap
   submission, portal submissions (CrazyGames, GameDistribution), then seed the
   daily challenge archive.

---

## 10. Sequencing and effort

| Phase | Work | Rough effort | Blocks |
|---|---|---|---|
| 1 | Repo setup + stub DB | 0.5 day | everything |
| 2 | Domain model doc | 1 day | 3, 4, 5 |
| 3 | Data acquisition + pipeline | **3–6 weeks** | 8 (tuning), not 4–7 |
| 4 | Core logic port | 3–5 days | 5 |
| 5 | Sim retune + finals rewrite | 3–4 days | 8 |
| 6 | Modes, challenges, storage | 2–3 days | |
| 7 | UI, copy, branding, SEO | 4–6 days | |
| 8 | Balance, QA, launch | 1 week | |

**Critical path is the data, and only the data** — which is exactly why §2 step 5
(the stub DB) matters: with a 40-player stub in place on day one, phases 4
through 7 run fully in parallel with phase 3, and the real DB drops in at the
end with only the tuning pass (§9 step 2) left to do.

Total: roughly **6–9 weeks** with the data work running alongside, or 2–3 weeks
of engineering if a usable AFL dataset already exists.

---

## 11. Top risks

| Risk | Impact | Mitigation |
|---|---|---|
| Historic tackle/hit-out/clearance data doesn't exist (§4.2) | Two eras unusable or dishonest | Decide the imputation policy up front; label imputed values in the UI |
| Sim constants copied rather than re-derived (§6.1) | 22-0 becomes trivial; the game's central dare collapses | Build the sweep harness before touching the constants |
| Sparse club × decade grid produces dead spins (§5.2) | Draft softlocks | `CLUB_ERAS` filter + minimum bucket depth + a deliberately-exhausted test board |
| Award-based ratings undervalue defenders (§4.4) | Key defenders read as filler on every board | Explicit per-position calibration pass, documented |
| Dual era factors get the sign wrong (§4.3) | Whole decades systematically over/under-rated, plausibly enough to go unnoticed | Self-check that prints per-decade adjusted means |
| Canonical/OG tags copied from the NBA site (§8.4) | New site's ranking credited to the old domain | Explicit pre-launch sweep for `canyougo820` across all HTML |
| AFL/club trademark exposure (D8) | Takedown | Text + colours only; no logos; disclaimer on every page |
| Finals bracket mis-transcribed (§6.4) | Immediately visible to the target audience | Verify against the AFL's published Final Eight system, not memory |

---

## 12. What to port unchanged

Worth stating explicitly, because the instinct on a port is to touch
everything:

- `js/utils/pageIntegrity.js` — sport-agnostic, written after a real incident.
- `js/utils/storage.js` structure — only the key prefixes change.
- `scripts/inline_players.js`, `scripts/build_tailwind.sh`,
  `scripts/build_favicon.sh`, `scripts/build_og_image.sh`.
- `scripts/build_challenge_pages.mjs` — reads the game's own modules rather than
  duplicating data, which is the right design and survives the port intact.
- The nightly refresh GitHub Action.
- The whole no-build-step, static-ES-modules, graceful-degradation architecture.
- `normalize_*_by_era.py`'s quantile-normalisation approach — the most valuable
  transferable idea in the repo.
- The documentation discipline in `data/README.md` and
  `docs/player-data-audit/rubric.md`. Imitate the standard, not just the format.
