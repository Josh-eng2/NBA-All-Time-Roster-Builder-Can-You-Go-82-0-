# Player data realism audit — progress tracker

**Read `rubric.md` first** — this file only tracks status, it doesn't
repeat the methodology.

## Completeness guarantee

Every one of the **938 players** in `players.json` appears in exactly one
batch below, in the per-player checklist. This was generated directly
from `players.json` (not hand-transcribed) and verified 1:1 against it —
938 in, 938 out, zero duplicates, zero gaps, every bucket key accounted
for. If you ever add/remove a player from `players.json` outside this
process, regenerate this file's checklist section the same way (walk
`players.json`, group by the batching rule below) so the guarantee still
holds.

## How to resume (for a fresh session with no memory of prior work)

1. Read `rubric.md` in full.
2. Scan the **summary table** for the first row with status `pending`.
3. Open that batch's section in the **full player checklist** below and
   work through every unchecked player, following the "Per-batch
   workflow" section of `rubric.md`.
4. Flip the summary-table row to `done`, check off every player in that
   batch's checklist, add a note to the Log section, commit, move on.
5. If a batch is left partially checked (a prior session got interrupted
   mid-batch), trust the checkboxes over the summary-table status — finish
   the unchecked names in that batch before starting the next one, and
   verify what actually landed in `players.json` for any player marked
   checked before you trust it.

## PR grouping

One PR per decade (batches sharing a decade land in the same PR), plus
one PR for the popularity batch and one for wrap-up. 9 PRs total.
Squash-merge each after review.

## Batches — summary

| # | Decade | Players | Buckets | Status | Notes |
|---|---|---|---|---|---|
| 1 | 1960s | 35 | `Bucks_1960s`, `Bulls_1960s`, `Celtics_1960s`, `Hawks_1960s`, `Kings_1960s`, `Knicks_1960s`, `Lakers_1960s`, `Pistons_1960s` | **done** | Stats already matched real career/season lines (verified stars vs sources). 2 archetype fixes; popularity gaps logged for batch 27. |
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
| 27 | popularity | 465 named + formula fallback | `scripts/add_popularity.js` `NAMED` dict | pending | Not decade-scoped — audit the whole dict for accuracy/consistency in one pass, then `bash scripts/update_players.sh` to apply. Best done *after* batches 1–26 so stat corrections have already fed the formula fallback for un-named players. |
| 28 | wrap-up | — | n/a | pending | Fix the 3 known duplicate `id`s (`thompson_16`: Klay Thompson vs Tristan Thompson; `vandeweghe_84`: Kiki Vandeweghe's two team stints; `cassell_s_04`: Sam Cassell's two team stints — give each a distinct id, e.g. suffix by team). Final full validation run + full smoke test across all three draft modes. Note the required `SIM_CENTER` re-tuning follow-up (see rubric.md) for a separate future session — do not attempt it as part of this wrap-up. |

## Batches — full player checklist

Every player in `players.json`, grouped exactly as in the summary table above.
Check a player off only once their stats/archetype/traits have been reviewed
and corrected per `rubric.md`. This list is the completeness guarantee — it
was generated directly from `players.json` and re-verified 1:1 against it
(938 players in, 938 players out, no duplicates, no gaps).

### Batch 1 — 1960s (35 players)

**Bucks_1960s** (3)
- [x] Jon McGlocklin (`mcglocklin_69`)
- [x] Len Chappell (`chappell_69`)
- [x] Wayne Embry (`embry_69`)

**Bulls_1960s** (3)
- [x] Jerry Sloan (`sloan_69`)
- [x] Guy Rodgers (`rodgers_67`)
- [x] Bob Boozer (`boozer_67`)

**Celtics_1960s** (7)
- [x] Bill Russell (`russell_65`)
- [x] John Havlicek (`havlicek_68`)
- [x] Sam Jones (`jones_65`)
- [x] Tom Heinsohn (`heinsohn_62`)
- [x] Bob Cousy (`cousy_63`)
- [x] K.C. Jones (`kcjones_65`)
- [x] Don Nelson (`nelson_66`)

**Hawks_1960s** (5)
- [x] Bob Pettit (`pettit_63`)
- [x] Cliff Hagan (`hagan_63`)
- [x] Lenny Wilkens (`wilkens_63`)
- [x] Joe Caldwell (`caldwell_68`)
- [x] Zelmo Beaty (`beaty_68`)

**Kings_1960s** (5)
- [x] Oscar Robertson (`robertson_o_63`)
- [x] Jerry Lucas (`lucas_j_66`)
- [x] Jack Twyman (`twyman_62`)
- [x] Wayne Embry (`embry_63`)
- [x] Adrian Smith (`smith_a_66`)

**Knicks_1960s** (3)
- [x] Willis Reed (`reed_69`)
- [x] Walt Frazier (`frazier_69`)
- [x] Dave DeBusschere (`debusschere_knk_69`)

**Lakers_1960s** (6)
- [x] Jerry West (`west_68`)
- [x] Elgin Baylor (`baylor_68`)
- [x] Wilt Chamberlain (`chamberlain_68`)
- [x] Rudy LaRusso (`larusso_67`)
- [x] Happy Hairston (`hairston_68`)
- [x] Johnny Egan (`egan_68`)

**Pistons_1960s** (3)
- [x] Dave Bing (`bing_68`)
- [x] Dave DeBusschere (`debusschere_pis_65`)
- [x] Bailey Howell (`howell_64`)

### Batch 2 — 1960s (23 players)

**Rockets_1960s** (3)
- [ ] Elvin Hayes (`hayes_69`)
- [ ] Don Kojis (`kojis_68`)
- [ ] Art Williams (`awilliams_69`)

**Sixers_1960s** (6)
- [ ] Wilt Chamberlain (`chamberlain_67`)
- [ ] Hal Greer (`greer_67`)
- [ ] Chet Walker (`walker_67`)
- [ ] Wali Jones (`jones_67`)
- [ ] Billy Cunningham (`cunningham_68`)
- [ ] Luke Jackson (`jackson_67`)

**Suns_1960s** (3)
- [ ] Dick Van Arsdale (`vanarsdale_69`)
- [ ] Gail Goodrich (`goodrich_69`)
- [ ] Paul Silas (`silas_69`)

**Thunder_1960s** (3)
- [ ] Bob Rule (`rule_69`)
- [ ] Walt Hazzard (`hazzard_68`)
- [ ] Tom Meschery (`meschery_68`)

**Warriors_1960s** (3)
- [ ] Wilt Chamberlain (`chamberlain_war_63`)
- [ ] Nate Thurmond (`thurmond_67`)
- [ ] Rick Barry (`rbarry_67`)

**Wizards_1960s** (5)
- [ ] Earl Monroe (`wizards_60s_1`)
- [ ] Wes Unseld (`wizards_60s_2`)
- [ ] Gus Johnson (`wizards_60s_3`)
- [ ] Kevin Loughery (`wizards_60s_4`)
- [ ] Bob Ferry (`wizards_60s_5`)

### Batch 3 — 1970s (37 players)

**Blazers_1970s** (7)
- [ ] Bill Walton (`walton_77`)
- [ ] Maurice Lucas (`lucas_77`)
- [ ] Lionel Hollins (`hollins_77`)
- [ ] Bob Gross (`gross_77`)
- [ ] Terry Porter (`twarren_77`)
- [ ] Larry Steele (`steele_77`)
- [ ] Dave Twardzik (`twarren_77b`)

**Bucks_1970s** (5)
- [ ] Kareem Abdul-Jabbar (`kareem_71`)
- [ ] Oscar Robertson (`oscar_71`)
- [ ] Bob Dandridge (`dandridge_71`)
- [ ] Luol McCarter (`mcghee_71`)
- [ ] Jon McGlocklin (`allen_71`)

**Bulls_1970s** (3)
- [ ] Bob Love (`blove_72`)
- [ ] Norm Van Lier (`vanlier_74`)
- [ ] Artis Gilmore (`gilmore_77`)

**Cavaliers_1970s** (3)
- [ ] Austin Carr (`acarr_74`)
- [ ] Campy Russell (`crussell_77`)
- [ ] Jim Chones (`chones_77`)

**Celtics_1970s** (6)
- [ ] Dave Cowens (`cowens_74`)
- [ ] John Havlicek (`havlicek_74`)
- [ ] Jo Jo White (`white_74`)
- [ ] Paul Silas (`silas_74`)
- [ ] Don Nelson (`nelson_73`)
- [ ] Paul Westphal (`westphal_73`)

**Clippers_1970s** (5)
- [ ] Bob McAdoo (`mcadoo_74`)
- [ ] Randy Smith (`smith_r_75`)
- [ ] Elmore Smith (`smith_el_73`)
- [ ] Jim McMillian (`mcmillian_74`)
- [ ] Garfield Heard (`heard_75`)

**Hawks_1970s** (5)
- [ ] Pete Maravich (`maravich_73`)
- [ ] Lou Hudson (`hudson_73`)
- [ ] John Drew (`drew_78`)
- [ ] Dan Roundfield (`roundfield_78`)
- [ ] Walt Bellamy (`bellamy_71`)

**Jazz_1970s** (3)
- [ ] Pete Maravich (`maravich_78`)
- [ ] Truck Robinson (`trobinson_78`)
- [ ] Gail Goodrich (`goodrich_jaz_77`)

### Batch 4 — 1970s (38 players)

**Kings_1970s** (5)
- [ ] Nate Archibald (`archibald_73`)
- [ ] Otis Birdsong (`birdsong_78`)
- [ ] Sam Lacey (`lacey_75`)
- [ ] Scott Wedman (`wedman_77`)
- [ ] Phil Ford (`ford_p_79`)

**Knicks_1970s** (7)
- [ ] Walt Frazier (`frazier_72`)
- [ ] Willis Reed (`reed_70`)
- [ ] Bill Bradley (`bradley_72`)
- [ ] Earl Monroe (`monroe_71`)
- [ ] Dave DeBusschere (`debusschere_72`)
- [ ] Jerry Lucas (`lucas_72`)
- [ ] Dick Barnett (`barnett_72`)

**Lakers_1970s** (7)
- [ ] Kareem Abdul-Jabbar (`kareem_76`)
- [ ] Gail Goodrich (`goodrich_74`)
- [ ] Jamaal Wilkes (`wilkes_79`)
- [ ] Jerry West (`west_71`)
- [ ] Spencer Haywood (`haywood_75`)
- [ ] Pat Riley (`rileylak_75`)
- [ ] Don Ford (`mcharter_75`)

**Nets_1970s** (5)
- [ ] Julius Erving (`erving_75`)
- [ ] Billy Paultz (`paultz_75`)
- [ ] John Williamson (`williamson_j_75`)
- [ ] Brian Taylor (`taylor_b_75`)
- [ ] Larry Kenon (`kenon_75`)

**Nuggets_1970s** (3)
- [ ] David Thompson (`dthompson_78`)
- [ ] Dan Issel (`issel_78`)
- [ ] Bobby Jones (`bjones_nug_78`)

**Pacers_1970s** (5)
- [ ] Mel Daniels (`daniels_m_71`)
- [ ] Roger Brown (`brown_r_71`)
- [ ] Bob Netolicky (`netolicky_71`)
- [ ] Don Buse (`buse_77`)
- [ ] Billy Keller (`keller_71`)

**Pistons_1970s** (3)
- [ ] Bob Lanier (`lanier_74`)
- [ ] Dave Bing (`bing_73`)
- [ ] Kevin Porter (`kporter_79`)

**Rockets_1970s** (3)
- [ ] Calvin Murphy (`cmurphy_75`)
- [ ] Rudy Tomjanovich (`rtomjanovich_77`)
- [ ] Moses Malone (`mmalone_79`)

### Batch 5 — 1970s (30 players)

**Sixers_1970s** (3)
- [ ] Julius Erving (`erving_77`)
- [ ] Doug Collins (`dcollins_77`)
- [ ] George McGinnis (`mcginnis_77`)

**Spurs_1970s** (3)
- [ ] George Gervin (`gervin_79`)
- [ ] James Silas (`silas_jm_77`)
- [ ] Larry Kenon (`kenon_78`)

**Suns_1970s** (5)
- [ ] Paul Westphal (`westphal_77`)
- [ ] Alvan Adams (`adams_76`)
- [ ] Charlie Scott (`scott_76`)
- [ ] Paul Silas (`silas_76`)
- [ ] Connie Hawkins (`hawkins_76`)

**Thunder_1970s** (5)
- [ ] Gus Williams (`guswilliams_79`)
- [ ] Dennis Johnson (`djohnson_79`)
- [ ] Fred Brown (`brown_79`)
- [ ] Jack Sikma (`silas_79`)
- [ ] Lonnie Shelton (`green_79`)

**Warriors_1970s** (8)
- [ ] Rick Barry (`barry_75`)
- [ ] Jamaal Wilkes (`jwilkes_75`)
- [ ] Phil Smith (`psmith_75`)
- [ ] Clifford Ray (`cray_75`)
- [ ] Butch Beard (`bbutts_75`)
- [ ] Charles Dudley (`cassell_75`)
- [ ] George Johnson (`dickey_75`)
- [ ] Charles Johnson (`ray_75b`)

**Wizards_1970s** (6)
- [ ] Elvin Hayes (`wizards_70s_1`)
- [ ] Wes Unseld (`wizards_70s_2`)
- [ ] Phil Chenier (`wizards_70s_3`)
- [ ] Kevin Porter (`wizards_70s_4`)
- [ ] Bob Dandridge (`wizards_70s_5`)
- [ ] Tom Henderson (`wizards_70s_6`)

### Batch 6 — 1980s (39 players)

**Blazers_1980s** (5)
- [ ] Clyde Drexler (`drexler_87`)
- [ ] Kiki Vandeweghe (`vandeweghe_84`)
- [ ] Terry Porter (`porter_t_87`)
- [ ] Jerome Kersey (`kersey_86`)
- [ ] Kevin Duckworth (`duckworth_88`)

**Bucks_1980s** (5)
- [ ] Sidney Moncrief (`moncrief_82`)
- [ ] Marques Johnson (`mjohnson_79`)
- [ ] Paul Pressey (`pressey_82`)
- [ ] Terry Cummings (`pierce_82`)
- [ ] Bob Lanier (`lanier_82`)

**Bulls_1980s** (6)
- [ ] Michael Jordan (`mj_88`)
- [ ] Scottie Pippen (`pippen_88`)
- [ ] Horace Grant (`grant_89`)
- [ ] Bill Cartwright (`cartwright_88`)
- [ ] John Paxson (`paxson_88`)
- [ ] Dave Corzine (`corzine_88`)

**Cavaliers_1980s** (5)
- [ ] Mark Price (`price_89`)
- [ ] Brad Daugherty (`daugherty_89`)
- [ ] World B. Free (`free_88`)
- [ ] Craig Ehlo (`ehlo_89`)
- [ ] Larry Nance (`nance_88`)

**Celtics_1980s** (8)
- [ ] Larry Bird (`bird_86`)
- [ ] Kevin McHale (`mchale_87`)
- [ ] Robert Parish (`parish_86`)
- [ ] Danny Ainge (`ainge_87`)
- [ ] Dennis Johnson (`johnson_86`)
- [ ] Bill Walton (`walton_86`)
- [ ] Scott Wedman (`wedman_86`)
- [ ] M.L. Carr (`carr_84`)

**Clippers_1980s** (5)
- [ ] World B. Free (`free_82`)
- [ ] Terry Cummings (`cummings_83`)
- [ ] Norm Nixon (`nixon_83`)
- [ ] Marques Johnson (`johnson_mq_84`)
- [ ] Derek Smith (`smith_dk_85`)

**Hawks_1980s** (5)
- [ ] Dominique Wilkins (`wilkins_85`)
- [ ] Doc Rivers (`rivers_85`)
- [ ] Kevin Willis (`willis_85`)
- [ ] Spud Webb (`webb_85`)
- [ ] Tree Rollins (`rollins_83`)

### Batch 7 — 1980s (42 players)

**Jazz_1980s** (6)
- [ ] Karl Malone (`malone_88`)
- [ ] John Stockton (`stockton_88`)
- [ ] Darrell Griffith (`griffith_85`)
- [ ] Thurl Bailey (`thurl_88`)
- [ ] Mark Eaton (`eaton_88`)
- [ ] Adrian Dantley (`bailey_87`)

**Kings_1980s** (5)
- [ ] Reggie Theus (`theus_84`)
- [ ] Eddie Johnson (`johnson_e_87`)
- [ ] Otis Birdsong (`birdsong_82`)
- [ ] LaSalle Thompson (`thompson_la_86`)
- [ ] Rodney McCray (`mccray_r_87`)

**Knicks_1980s** (3)
- [ ] Bernard King (`bking_85`)
- [ ] Patrick Ewing (`ewing_89`)
- [ ] Mark Jackson (`mjackson_88`)

**Lakers_1980s** (8)
- [ ] Magic Johnson (`magic_87`)
- [ ] Kareem Abdul-Jabbar (`kareem_87`)
- [ ] James Worthy (`worthy_88`)
- [ ] Byron Scott (`scott_88`)
- [ ] Michael Cooper (`cooper_88`)
- [ ] Bob McAdoo (`mcadoo_82`)
- [ ] A.C. Green (`acgreen_88`)
- [ ] Kurt Rambis (`rambis_84`)

**Mavericks_1980s** (4)
- [ ] Mark Aguirre (`aguirre_83`)
- [ ] Rolando Blackman (`blackman_87`)
- [ ] Derek Harper (`harper_89`)
- [ ] James Donaldson (`perkins_88`)

**Nets_1980s** (5)
- [ ] Buck Williams (`williams_bu_84`)
- [ ] Micheal Ray Richardson (`richardson_mr_83`)
- [ ] Darryl Dawkins (`dawkins_d_84`)
- [ ] Mike Gminski (`gminski_85`)
- [ ] Darwin Cook (`cook_d_83`)

**Nuggets_1980s** (6)
- [ ] Alex English (`english_83`)
- [ ] Fat Lever (`lever_88`)
- [ ] Blair Rasmussen (`rasmussen_88`)
- [ ] Kiki Vandeweghe (`vandeweghe_84`)
- [ ] Dan Issel (`issel_85`)
- [ ] T.R. Dunn (`dunn_87`)

**Pacers_1980s** (5)
- [ ] Chuck Person (`person_87`)
- [ ] Wayman Tisdale (`tisdale_87`)
- [ ] Vern Fleming (`fleming_85`)
- [ ] Clark Kellogg (`kellogg_83`)
- [ ] Herb Williams (`williams_h_85`)

### Batch 8 — 1980s (38 players)

**Pistons_1980s** (8)
- [ ] Isiah Thomas (`isiah_89`)
- [ ] Joe Dumars (`dumars_89`)
- [ ] Bill Laimbeer (`laimbeer_89`)
- [ ] Dennis Rodman (`rodman_89`)
- [ ] Adrian Dantley (`dantley_87`)
- [ ] Vinnie Johnson (`johnson_89`)
- [ ] John Salley (`salley_89`)
- [ ] Rick Mahorn (`mahorn_89`)

**Rockets_1980s** (3)
- [ ] Hakeem Olajuwon (`hakeem_89`)
- [ ] Ralph Sampson (`rsampson_86`)
- [ ] Robert Reid (`rreid_84`)

**Sixers_1980s** (7)
- [ ] Julius Erving (`erving_83`)
- [ ] Moses Malone (`malone_83`)
- [ ] Maurice Cheeks (`cheeks_87`)
- [ ] Andrew Toney (`toney_83`)
- [ ] Bobby Jones (`toney_83b`)
- [ ] Franklin Edwards (`edwards_83`)
- [ ] Clint Richardson (`richardson_82`)

**Spurs_1980s** (5)
- [ ] George Gervin (`gervin_85`)
- [ ] Mike Mitchell (`mitchell_85`)
- [ ] Alvin Robertson (`robertson_85`)
- [ ] Artis Gilmore (`gilmore_83`)
- [ ] George Johnson (`johnson_85`)

**Suns_1980s** (3)
- [ ] Walter Davis (`wdavis_83`)
- [ ] Larry Nance (`lnance_86`)
- [ ] Kevin Johnson (`kjohnson_89`)

**Thunder_1980s** (3)
- [ ] Gus Williams (`gwilliams_82`)
- [ ] Jack Sikma (`jsikma_85`)
- [ ] Dale Ellis (`dellis_88`)

**Warriors_1980s** (3)
- [ ] World B. Free (`wbfree_82`)
- [ ] Purvis Short (`pshort_84`)
- [ ] Joe Barry Carroll (`jbcarroll_83`)

**Wizards_1980s** (6)
- [ ] Jeff Ruland (`wizards_80s_1`)
- [ ] Gus Williams (`wizards_80s_2`)
- [ ] Frank Johnson (`wizards_80s_3`)
- [ ] Rick Mahorn (`wizards_80s_4`)
- [ ] Greg Ballard (`wizards_80s_5`)
- [ ] Darrell Walker (`wizards_80s_6`)

### Batch 9 — 1990s (42 players)

**Blazers_1990s** (5)
- [ ] Clyde Drexler (`drexler_92`)
- [ ] Arvydas Sabonis (`sabonis_97`)
- [ ] Rasheed Wallace (`wallace_r_98`)
- [ ] Cliff Robinson (`robinson_c_95`)
- [ ] Damon Stoudamire (`stoudamire_99`)

**Bucks_1990s** (3)
- [ ] Glenn Robinson (`grobinson_98`)
- [ ] Ray Allen (`rallen_99`)
- [ ] Vin Baker (`vbaker_96`)

**Bulls_1990s** (8)
- [ ] Michael Jordan (`mj_96`)
- [ ] Scottie Pippen (`pippen_96`)
- [ ] Dennis Rodman (`rodman_96`)
- [ ] Luc Longley (`longley_96`)
- [ ] Toni Kukoc (`kukoc_96`)
- [ ] Steve Kerr (`kerr_96`)
- [ ] John Paxson (`paxson_93`)
- [ ] B.J. Armstrong (`armstrong_92`)

**Cavaliers_1990s** (5)
- [ ] Mark Price (`price_94`)
- [ ] Larry Nance (`nance_90`)
- [ ] Danny Ferry (`ferry_94`)
- [ ] Shawn Kemp (`kemp_97`)
- [ ] Zydrunas Ilgauskas (`ilgauskas_99`)

**Celtics_1990s** (5)
- [ ] Reggie Lewis (`lewis_92`)
- [ ] Paul Pierce (`pierce_99`)
- [ ] Antoine Walker (`walker_99`)
- [ ] Sherman Douglas (`douglas_92`)
- [ ] Dee Brown (`brown_99`)

**Clippers_1990s** (5)
- [ ] Danny Manning (`manning_d_93`)
- [ ] Ron Harper (`harper_r_92`)
- [ ] Loy Vaught (`vaught_94`)
- [ ] Lamond Murray (`murray_lm_96`)
- [ ] Eric Piatkowski (`piatkowski_96`)

**Grizzlies_1990s** (6)
- [ ] Shareef Abdur-Rahim (`grizzlies_90s_1`)
- [ ] Mike Bibby (`grizzlies_90s_2`)
- [ ] Bryant Reeves (`grizzlies_90s_3`)
- [ ] Blue Edwards (`grizzlies_90s_4`)
- [ ] Lawrence Moten (`grizzlies_90s_5`)
- [ ] Othella Harrington (`grizzlies_90s_6`)

**Hawks_1990s** (5)
- [ ] Dominique Wilkins (`wilkins_92`)
- [ ] Mookie Blaylock (`blaylock_95`)
- [ ] Dikembe Mutombo (`mutombo_97`)
- [ ] Steve Smith (`smith_s_96`)
- [ ] Stacey Augmon (`augmon_92`)

### Batch 10 — 1990s (38 players)

**Heat_1990s** (7)
- [ ] Alonzo Mourning (`mourning_97`)
- [ ] Tim Hardaway (`hardaway_97`)
- [ ] Jamal Mashburn (`mashburn_99`)
- [ ] Glen Rice (`rice_96`)
- [ ] Dan Majerle (`zo_95`)
- [ ] P.J. Brown (`willis_97`)
- [ ] Voshon Lenard (`owens_98`)

**Hornets_1990s** (5)
- [ ] Alonzo Mourning (`mourning_93`)
- [ ] Larry Johnson (`johnson_l_93`)
- [ ] Muggsy Bogues (`bogues_93`)
- [ ] Glen Rice (`rice_g_95`)
- [ ] Dell Curry (`curry_d_95`)

**Jazz_1990s** (7)
- [ ] Karl Malone (`malone_97`)
- [ ] John Stockton (`stockton_97`)
- [ ] Jeff Hornacek (`hornacek_96`)
- [ ] Greg Ostertag (`ostertag_97`)
- [ ] Mark Eaton (`eaton_97`)
- [ ] David Benoit (`benoit_96`)
- [ ] Antoine Carr (`brown_97`)

**Kings_1990s** (5)
- [ ] Mitch Richmond (`richmond_m_95`)
- [ ] Vlade Divac (`divac_v_98`)
- [ ] Jason Williams (`williams_j_99`)
- [ ] Brian Grant (`grant_b_98`)
- [ ] Spud Webb (`webb_s_96`)

**Knicks_1990s** (7)
- [ ] Patrick Ewing (`ewing_94`)
- [ ] John Starks (`starks_94`)
- [ ] Charles Oakley (`oakley_94`)
- [ ] Allan Houston (`houston_99`)
- [ ] Anthony Mason (`ewing_jr94`)
- [ ] Doc Rivers (`doc_94`)
- [ ] Charlie Ward (`ward_99`)

**Lakers_1990s** (7)
- [ ] Shaquille O'Neal (`shaq_99`)
- [ ] Kobe Bryant (`kobe_99`)
- [ ] Nick Van Exel (`vanexel_97`)
- [ ] Eddie Jones (`jones_97`)
- [ ] Cedric Ceballos (`ceballos_95`)
- [ ] Vlade Divac (`divac_96`)
- [ ] Rick Fox (`fox_99`)

### Batch 11 — 1990s (40 players)

**Magic_1990s** (7)
- [ ] Shaquille O'Neal (`shaq_94`)
- [ ] Anfernee Hardaway (`penny_95`)
- [ ] Nick Anderson (`anderson_95`)
- [ ] Horace Grant (`horace_95`)
- [ ] Brian Shaw (`shaw_95`)
- [ ] Dennis Scott (`scott_95`)
- [ ] Gabriel Hatcher (`gabriel_95`)

**Mavericks_1990s** (3)
- [ ] Jason Kidd (`jkidd_96`)
- [ ] Jamal Mashburn (`mashburn_96`)
- [ ] Jim Jackson (`jjackson_95`)

**Nets_1990s** (5)
- [ ] Drazen Petrovic (`petrovic_93`)
- [ ] Derrick Coleman (`coleman_d_93`)
- [ ] Kenny Anderson (`anderson_k_95`)
- [ ] Keith Van Horn (`vanhorn_98`)
- [ ] Kerry Kittles (`kittles_97`)

**Nuggets_1990s** (3)
- [ ] Dikembe Mutombo (`mutombo_95`)
- [ ] Mahmoud Abdul-Rauf (`abdrauf_95`)
- [ ] LaPhonso Ellis (`lellis_96`)

**Pacers_1990s** (5)
- [ ] Reggie Miller (`miller_r_95`)
- [ ] Rik Smits (`smits_95`)
- [ ] Mark Jackson (`jackson_mk_96`)
- [ ] Dale Davis (`davis_d_97`)
- [ ] Jalen Rose (`rose_j_97`)

**Pistons_1990s** (5)
- [ ] Grant Hill (`hill_96`)
- [ ] Jerry Stackhouse (`stackhouse_97`)
- [ ] Joe Dumars (`dumars_93`)
- [ ] Otis Thorpe (`thomas_95`)
- [ ] Terry Mills (`long_95`)

**Raptors_1990s** (7)
- [ ] Damon Stoudamire (`raptors_90s_1`)
- [ ] Tracy McGrady (`raptors_90s_2`)
- [ ] Marcus Camby (`raptors_90s_3`)
- [ ] Doug Christie (`raptors_90s_4`)
- [ ] Walt Williams (`raptors_90s_5`)
- [ ] Alvin Williams (`raptors_90s_6`)
- [ ] Oliver Miller (`raptors_90s_7`)

**Rockets_1990s** (5)
- [ ] Hakeem Olajuwon (`hakeem_94`)
- [ ] Clyde Drexler (`clyde_95`)
- [ ] Robert Horry (`horry_95`)
- [ ] Sam Cassell (`cassell_95`)
- [ ] Otis Thorpe (`otis_95`)

### Batch 12 — 1990s (41 players)

**Sixers_1990s** (5)
- [ ] Charles Barkley (`barkley_91`)
- [ ] Allen Iverson (`iverson_99`)
- [ ] Derrick Coleman (`coleman_93`)
- [ ] Clarence Weatherspoon (`weatherspoon_95`)
- [ ] Sharone Wright (`mashburn_98`)

**Spurs_1990s** (6)
- [ ] David Robinson (`robinson_95`)
- [ ] Sean Elliott (`elliott_95`)
- [ ] Tim Duncan (`duncan_99`)
- [ ] Avery Johnson (`avery_96`)
- [ ] Chuck Person (`person_97`)
- [ ] Vinny Del Negro (`vinnie_97`)

**Suns_1990s** (7)
- [ ] Charles Barkley (`barkley_93`)
- [ ] Kevin Johnson (`kj_93`)
- [ ] Dan Majerle (`majerle_93`)
- [ ] Danny Manning (`manning_93`)
- [ ] Tom Chambers (`chambers_93`)
- [ ] Cedric Ceballos (`ceballos_93`)
- [ ] Frank Johnson (`johnson_93`)

**Thunder_1990s** (5)
- [ ] Gary Payton (`payton_96`)
- [ ] Shawn Kemp (`kemp_96`)
- [ ] Detlef Schrempf (`schrempf_96`)
- [ ] Nate McMillan (`mcmillan_96`)
- [ ] Kendall Gill (`gill_96`)

**Timberwolves_1990s** (5)
- [ ] Kevin Garnett (`garnett_k_98`)
- [ ] Stephon Marbury (`marbury_s_98`)
- [ ] Tom Gugliotta (`gugliotta_97`)
- [ ] Isaiah Rider (`rider_94`)
- [ ] Christian Laettner (`laettner_94`)

**Warriors_1990s** (7)
- [ ] Tim Hardaway (`hardaway_92`)
- [ ] Chris Mullin (`mullin_92`)
- [ ] Latrell Sprewell (`sprewell_97`)
- [ ] Chris Webber (`webber_94`)
- [ ] Sarunas Marciulionis (`marciulionis_92`)
- [ ] Tyrone Hill (`hill_93`)
- [ ] Billy Owens (`owens_93`)

**Wizards_1990s** (6)
- [ ] Chris Webber (`wizards_90s_1`)
- [ ] Juwan Howard (`wizards_90s_2`)
- [ ] Rod Strickland (`wizards_90s_3`)
- [ ] Mitch Richmond (`wizards_90s_4`)
- [ ] Ben Wallace (`wizards_90s_5`)
- [ ] Harvey Grant (`wizards_90s_6`)

### Batch 13 — 2000s (40 players)

**Blazers_2000s** (5)
- [ ] Brandon Roy (`roy_b_08`)
- [ ] LaMarcus Aldridge (`aldridge_la_09`)
- [ ] Scottie Pippen (`pippen_s_01`)
- [ ] Zach Randolph (`randolph_z_04`)
- [ ] Damon Stoudamire (`stoudamire_d_02`)

**Bucks_2000s** (5)
- [ ] Ray Allen (`rallen_01`)
- [ ] Michael Redd (`redd_06`)
- [ ] Sam Cassell (`cassell_01`)
- [ ] Anthony Mason (`mason_01`)
- [ ] Desmond Mason (`mobley_06`)

**Bulls_2000s** (7)
- [ ] Luol Deng (`deng_08`)
- [ ] Ben Gordon (`gordon_06`)
- [ ] Kirk Hinrich (`hinrich_07`)
- [ ] Andres Nocioni (`nocioni_06`)
- [ ] Elton Brand (`brand_02`)
- [ ] Tyson Chandler (`chandler_02`)
- [ ] Chris Duhon (`duhon_07`)

**Cavaliers_2000s** (4)
- [ ] LeBron James (`lebron_06`)
- [ ] Zydrunas Ilgauskas (`ilg_06`)
- [ ] Larry Hughes (`hughes_07`)
- [ ] Drew Gooden (`gooden_07`)

**Celtics_2000s** (7)
- [ ] Paul Pierce (`pierce_06`)
- [ ] Kevin Garnett (`garnett_08`)
- [ ] Ray Allen (`allen_08`)
- [ ] Rajon Rondo (`rondo_09`)
- [ ] Kendrick Perkins (`perkins_08`)
- [ ] Leon Powe (`powe_08`)
- [ ] Eddie House (`house_08`)

**Clippers_2000s** (5)
- [ ] Elton Brand (`brand_e_03`)
- [ ] Corey Maggette (`maggette_04`)
- [ ] Sam Cassell (`cassell_s_04`)
- [ ] Chris Kaman (`kaman_06`)
- [ ] Shaun Livingston (`livingston_s_06`)

**Grizzlies_2000s** (7)
- [ ] Pau Gasol (`grizzlies_00s_1`)
- [ ] Shane Battier (`grizzlies_00s_2`)
- [ ] Mike Miller (`grizzlies_00s_3`)
- [ ] Jason Williams (`grizzlies_00s_4`)
- [ ] Lorenzen Wright (`grizzlies_00s_5`)
- [ ] James Posey (`grizzlies_00s_6`)
- [ ] Stromile Swift (`grizzlies_00s_7`)

### Batch 14 — 2000s (36 players)

**Hawks_2000s** (5)
- [ ] Joe Johnson (`johnson_j_06`)
- [ ] Josh Smith (`smith_j_05`)
- [ ] Al Horford (`horford_08`)
- [ ] Mike Bibby (`bibby_08`)
- [ ] Jason Terry (`terry_02`)

**Heat_2000s** (6)
- [ ] Dwyane Wade (`wade_06`)
- [ ] Shaquille O'Neal (`shaq_05`)
- [ ] Udonis Haslem (`haslem_07`)
- [ ] Alonzo Mourning (`mourning_06`)
- [ ] James Posey (`posey_06`)
- [ ] Gary Payton (`payton_06`)

**Hornets_2000s** (5)
- [ ] Gerald Wallace (`wallace_g_06`)
- [ ] Emeka Okafor (`okafor_e_05`)
- [ ] Stephen Jackson (`jackson_s_07`)
- [ ] Boris Diaw (`diaw_07`)
- [ ] Raymond Felton (`felton_06`)

**Jazz_2000s** (6)
- [ ] Carlos Boozer (`boozer_08`)
- [ ] Deron Williams (`deron_08`)
- [ ] Mehmet Okur (`okur_07`)
- [ ] Andrei Kirilenko (`kirilenko_07`)
- [ ] Matt Harpring (`harpring_07`)
- [ ] Eric Maynor (`maynor_09`)

**Kings_2000s** (8)
- [ ] Chris Webber (`cwebber_02`)
- [ ] Peja Stojakovic (`peja_02`)
- [ ] Mike Bibby (`bibby_02`)
- [ ] Vlade Divac (`divac_02`)
- [ ] Doug Christie (`christie_02`)
- [ ] Scot Pollard (`pollard_02`)
- [ ] Hedo Turkoglu (`turkoglu_02`)
- [ ] Bobby Jackson (`jackson_02`)

**Knicks_2000s** (6)
- [ ] Stephon Marbury (`marbury_03`)
- [ ] Jamal Crawford (`crawford_06`)
- [ ] David Lee (`lee_09`)
- [ ] Jamal Crawford (`thomas_05`)
- [ ] Eddy Curry (`curry_07`)
- [ ] Nate Robinson (`james_07`)

### Batch 15 — 2000s (42 players)

**Lakers_2000s** (8)
- [ ] Kobe Bryant (`kobe_06`)
- [ ] Shaquille O'Neal (`shaq_02`)
- [ ] Pau Gasol (`gasol_09`)
- [ ] Lamar Odom (`odom_04`)
- [ ] Derek Fisher (`fisher_02`)
- [ ] Robert Horry (`horry_02`)
- [ ] Rick Fox (`fox_02`)
- [ ] Brian Grant (`grant_02`)

**Magic_2000s** (7)
- [ ] Tracy McGrady (`tmac_03`)
- [ ] Dwight Howard (`dwight_09`)
- [ ] Hedo Turkoglu (`turkoglu_08`)
- [ ] Rashard Lewis (`lewis_09`)
- [ ] Grant Hill (`arenas_04`)
- [ ] Keith Bogans (`bogans_09`)
- [ ] Mickael Pietrus (`pietrus_09`)

**Mavericks_2000s** (5)
- [ ] Dirk Nowitzki (`dirk_07`)
- [ ] Steve Nash (`nash_02`)
- [ ] Michael Finley (`finley_02`)
- [ ] Antawn Jamison (`walker_02`)
- [ ] Jason Terry (`terry_07`)

**Nets_2000s** (5)
- [ ] Jason Kidd (`kidd_j_03`)
- [ ] Vince Carter (`carter_v_05`)
- [ ] Richard Jefferson (`jefferson_r_04`)
- [ ] Kenyon Martin (`martin_k_03`)
- [ ] Brook Lopez (`lopez_br_09`)

**Nuggets_2000s** (7)
- [ ] Carmelo Anthony (`melo_06`)
- [ ] Allen Iverson (`iverson_07`)
- [ ] Marcus Camby (`camby_07`)
- [ ] Kenyon Martin (`martin_07`)
- [ ] Nene (`nene_06`)
- [ ] Earl Boykins (`boykins_04`)
- [ ] J.R. Smith (`anthony_09`)

**Pacers_2000s** (5)
- [ ] Jermaine O'Neal (`oneal_j_03`)
- [ ] Reggie Miller (`miller_r_03`)
- [ ] Ron Artest (`artest_03`)
- [ ] Danny Granger (`granger_07`)
- [ ] Stephen Jackson (`jackson_s_04`)

**Pelicans_2000s** (5)
- [ ] Chris Paul (`paul_c_08`)
- [ ] Baron Davis (`davis_b_03`)
- [ ] Peja Stojakovic (`stojakovic_p_07`)
- [ ] Jamal Mashburn (`mashburn_03`)
- [ ] David West (`west_d_07`)

### Batch 16 — 2000s (41 players)

**Pistons_2000s** (7)
- [ ] Chauncey Billups (`billups_04`)
- [ ] Rasheed Wallace (`rasheed_04`)
- [ ] Richard Hamilton (`hamilton_04`)
- [ ] Tayshaun Prince (`prince_04`)
- [ ] Ben Wallace (`ben_04`)
- [ ] Lindsey Hunter (`hunter_04`)
- [ ] Antonio McDyess (`mcdyess_06`)

**Raptors_2000s** (7)
- [ ] Vince Carter (`raptors_00s_1`)
- [ ] Chris Bosh (`raptors_00s_2`)
- [ ] Tracy McGrady (`raptors_00s_3`)
- [ ] Jose Calderon (`raptors_00s_4`)
- [ ] Morris Peterson (`raptors_00s_5`)
- [ ] Jalen Rose (`raptors_00s_6`)
- [ ] Antonio Davis (`raptors_00s_7`)

**Rockets_2000s** (5)
- [ ] Yao Ming (`yao_06`)
- [ ] Tracy McGrady (`tmac_04`)
- [ ] Luis Scola (`scola_07`)
- [ ] Rafer Alston (`alston_07`)
- [ ] Chuck Hayes (`hayes_07`)

**Sixers_2000s** (5)
- [ ] Allen Iverson (`iverson_01`)
- [ ] Chris Webber (`webber_05`)
- [ ] Andre Iguodala (`iguodala_09`)
- [ ] Eric Snow (`mckinley_03`)
- [ ] Samuel Dalembert (`dalembrt_04`)

**Spurs_2000s** (7)
- [ ] Tim Duncan (`duncan_03`)
- [ ] Tony Parker (`parker_07`)
- [ ] Manu Ginobili (`ginobili_05`)
- [ ] Bruce Bowen (`bowen_03`)
- [ ] Robert Horry (`horry_05`)
- [ ] Stephen Jackson (`popovich_03`)
- [ ] Rasho Nesterovic (`nesterovic_04`)

**Suns_2000s** (7)
- [ ] Steve Nash (`nash_06`)
- [ ] Amar'e Stoudemire (`amare_06`)
- [ ] Shawn Marion (`marion_06`)
- [ ] Leandro Barbosa (`barbosa_07`)
- [ ] Quentin Richardson (`richardson_06`)
- [ ] James Jones (`jones_06`)
- [ ] Boris Diaw (`tmac_suns`)

**Thunder_2000s** (3)
- [ ] Ray Allen (`rallen_son_05`)
- [ ] Rashard Lewis (`rlewis_06`)
- [ ] Gary Payton (`gpayton_02`)

### Batch 17 — 2000s (18 players)

**Timberwolves_2000s** (5)
- [ ] Kevin Garnett (`garnett_k_04`)
- [ ] Sam Cassell (`cassell_s_04`)
- [ ] Latrell Sprewell (`sprewell_04`)
- [ ] Wally Szczerbiak (`szczerbiak_03`)
- [ ] Trenton Hassell (`hassell_04`)

**Warriors_2000s** (7)
- [ ] Baron Davis (`baron_07`)
- [ ] Monta Ellis (`monta_09`)
- [ ] Stephen Jackson (`jackson_04`)
- [ ] Jason Richardson (`richardson_07`)
- [ ] Mickael Pietrus (`pietrus_07`)
- [ ] Al Harrington (`harrington_07`)
- [ ] Adonal Foyle (`foyle_07`)

**Wizards_2000s** (6)
- [ ] Gilbert Arenas (`wizards_00s_1`)
- [ ] Caron Butler (`wizards_00s_2`)
- [ ] Antawn Jamison (`wizards_00s_3`)
- [ ] Larry Hughes (`wizards_00s_4`)
- [ ] Brendan Haywood (`wizards_00s_5`)
- [ ] DeShawn Stevenson (`wizards_00s_6`)

### Batch 18 — 2010s (41 players)

**Blazers_2010s** (5)
- [ ] Damian Lillard (`lillard_d_15`)
- [ ] LaMarcus Aldridge (`aldridge_la_14`)
- [ ] CJ McCollum (`mccollum_cj_16`)
- [ ] Jusuf Nurkic (`nurkic_j_18`)
- [ ] Nicolas Batum (`batum_n_14`)

**Bucks_2010s** (3)
- [ ] Giannis Antetokounmpo (`giannis_19`)
- [ ] Khris Middleton (`middleton_19`)
- [ ] Malcolm Brogdon (`brogdon_18`)

**Bulls_2010s** (8)
- [ ] Derrick Rose (`rose_11`)
- [ ] Jimmy Butler (`butler_17`)
- [ ] Joakim Noah (`noah_14`)
- [ ] Carlos Boozer (`boozer_11`)
- [ ] Luol Deng (`deng_13`)
- [ ] Taj Gibson (`gibson_14`)
- [ ] Pau Gasol (`pgasol_15`)
- [ ] Mike Dunleavy Jr. (`dunleavy_14`)

**Cavaliers_2010s** (6)
- [ ] LeBron James (`lebron_16`)
- [ ] Kyrie Irving (`kyrie_16`)
- [ ] Kevin Love (`love_16`)
- [ ] Tristan Thompson (`thompson_16`)
- [ ] Iman Shumpert (`shumpert_16`)
- [ ] J.R. Smith (`jrsmith_16`)

**Celtics_2010s** (7)
- [ ] Kyrie Irving (`irving_18`)
- [ ] Jayson Tatum (`tatum_19`)
- [ ] Jaylen Brown (`brown_19`)
- [ ] Al Horford (`horford_17`)
- [ ] Marcus Smart (`smart_19`)
- [ ] Marcus Morris (`morris_19`)
- [ ] Terry Rozier (`rozier_19`)

**Clippers_2010s** (5)
- [ ] Chris Paul (`paul_c_13`)
- [ ] Blake Griffin (`griffin_b_14`)
- [ ] DeAndre Jordan (`jordan_da_14`)
- [ ] J.J. Redick (`redick_14`)
- [ ] Jamal Crawford (`crawford_j_14`)

**Grizzlies_2010s** (7)
- [ ] Marc Gasol (`grizzlies_10s_1`)
- [ ] Zach Randolph (`grizzlies_10s_2`)
- [ ] Mike Conley (`grizzlies_10s_3`)
- [ ] Tony Allen (`grizzlies_10s_4`)
- [ ] Rudy Gay (`grizzlies_10s_5`)
- [ ] Courtney Lee (`grizzlies_10s_6`)
- [ ] Vince Carter (`grizzlies_10s_7`)

### Batch 19 — 2010s (36 players)

**Hawks_2010s** (5)
- [ ] Al Horford (`horford_13`)
- [ ] Paul Millsap (`millsap_14`)
- [ ] Kyle Korver (`korver_14`)
- [ ] Jeff Teague (`teague_13`)
- [ ] Dennis Schröder (`schroeder_16`)

**Heat_2010s** (8)
- [ ] LeBron James (`lebron_13`)
- [ ] Dwyane Wade (`wade_13`)
- [ ] Chris Bosh (`bosh_13`)
- [ ] Mario Chalmers (`chalmers_12`)
- [ ] Mike Miller (`miller_13`)
- [ ] Norris Cole (`cole_13`)
- [ ] Udonis Haslem (`haslem_13`)
- [ ] Chris Andersen (`andersen_14`)

**Hornets_2010s** (5)
- [ ] Kemba Walker (`walker_k_15`)
- [ ] Nicolas Batum (`batum_15`)
- [ ] Al Jefferson (`jefferson_al_14`)
- [ ] Jeremy Lamb (`lamb_j_17`)
- [ ] Marvin Williams (`williams_ma_16`)

**Jazz_2010s** (7)
- [ ] Gordon Hayward (`hayward_16`)
- [ ] Rudy Gobert (`gobert_17`)
- [ ] Donovan Mitchell (`mitchell_19`)
- [ ] Joe Ingles (`ingles_18`)
- [ ] Derrick Favors (`favors_16`)
- [ ] Jae Crowder (`crowder_18`)
- [ ] Dante Exum (`exum_16`)

**Kings_2010s** (5)
- [ ] DeMarcus Cousins (`cousins_dm_15`)
- [ ] Isaiah Thomas (`thomas_i_13`)
- [ ] Rudy Gay (`gay_r_14`)
- [ ] Willie Cauley-Stein (`cauley_stein_16`)
- [ ] Ben McLemore (`mclemore_14`)

**Knicks_2010s** (6)
- [ ] Carmelo Anthony (`melo_13`)
- [ ] Amar'e Stoudemire (`amare_11`)
- [ ] Tyson Chandler (`chandler_12`)
- [ ] Jason Kidd (`kidd_13`)
- [ ] J.R. Smith (`jrsmith_13`)
- [ ] Raymond Felton (`felton_13`)

### Batch 20 — 2010s (42 players)

**Lakers_2010s** (8)
- [ ] Kobe Bryant (`kobe_13`)
- [ ] LeBron James (`lebron_18`)
- [ ] Anthony Davis (`davis_19`)
- [ ] Dwight Howard (`dwight_13`)
- [ ] Pau Gasol (`gasol_14`)
- [ ] Steve Nash (`nash_13`)
- [ ] Julius Randle (`randle_15`)
- [ ] Brandon Ingram (`ingram_18`)

**Magic_2010s** (5)
- [ ] Dwight Howard (`dwight_11`)
- [ ] Nikola Vucevic (`vucevic_14`)
- [ ] Aaron Gordon (`gordon_18`)
- [ ] Ryan Anderson (`anderson_13`)
- [ ] Arron Afflalo (`afflalo_14`)

**Mavericks_2010s** (5)
- [ ] Dirk Nowitzki (`dirk_11`)
- [ ] Jason Kidd (`kidd_12`)
- [ ] Jason Terry (`terry_11`)
- [ ] Shawn Marion (`marion_11`)
- [ ] Tyson Chandler (`chandler_11`)

**Nets_2010s** (5)
- [ ] Deron Williams (`williams_de_13`)
- [ ] Brook Lopez (`lopez_br_14`)
- [ ] Paul Pierce (`pierce_p_14`)
- [ ] Kevin Garnett (`garnett_k_14`)
- [ ] Joe Johnson (`johnson_jo_14`)

**Nuggets_2010s** (6)
- [ ] Nikola Jokic (`jokic_19`)
- [ ] Jamal Murray (`murray_19`)
- [ ] Carmelo Anthony (`melo_11`)
- [ ] Kenneth Faried (`faried_14`)
- [ ] Ty Lawson (`lawson_14`)
- [ ] Danilo Gallinari (`gallinari_13`)

**Pacers_2010s** (5)
- [ ] Paul George (`george_p_14`)
- [ ] Roy Hibbert (`hibbert_13`)
- [ ] David West (`west_d_14`)
- [ ] Lance Stephenson (`stephenson_14`)
- [ ] Victor Oladipo (`oladipo_18`)

**Pelicans_2010s** (5)
- [ ] Anthony Davis (`davis_ad_16`)
- [ ] DeMarcus Cousins (`cousins_dm_17`)
- [ ] Jrue Holiday (`holiday_j_16`)
- [ ] Eric Gordon (`gordon_e_15`)
- [ ] Ryan Anderson (`anderson_r_14`)

**Pistons_2010s** (3)
- [ ] Andre Drummond (`drummond_16`)
- [ ] Blake Griffin (`bgriffin_pis_18`)
- [ ] Reggie Jackson (`rjackson_17`)

### Batch 21 — 2010s (41 players)

**Raptors_2010s** (8)
- [ ] Kawhi Leonard (`kawhi_19`)
- [ ] Pascal Siakam (`siakam_19`)
- [ ] Kyle Lowry (`lowry_19`)
- [ ] Marc Gasol (`mgasol_19`)
- [ ] Danny Green (`dgreen_19`)
- [ ] DeMar DeRozan (`derozan_16`)
- [ ] Serge Ibaka (`ibaka_19`)
- [ ] Fred VanVleet (`vvanvleet_19`)

**Rockets_2010s** (5)
- [ ] James Harden (`harden_19`)
- [ ] Chris Paul (`cp3_18`)
- [ ] P.J. Tucker (`tucker_18`)
- [ ] Eric Gordon (`gordon_18b`)
- [ ] Clint Capela (`capela_18`)

**Sixers_2010s** (6)
- [ ] Joel Embiid (`embiid_19`)
- [ ] Ben Simmons (`simmons_19`)
- [ ] Tobias Harris (`harris_19`)
- [ ] Dario Saric (`saric_18`)
- [ ] Robert Covington (`covington_18`)
- [ ] J.J. Redick (`redick_18`)

**Spurs_2010s** (9)
- [ ] Kawhi Leonard (`kawhi_16`)
- [ ] LaMarcus Aldridge (`aldridge_16`)
- [ ] Tony Parker (`parker_12`)
- [ ] Tim Duncan (`duncan_14`)
- [ ] Patty Mills (`mills_14`)
- [ ] Boris Diaw (`diaw_14`)
- [ ] Tiago Splitter (`splitter_14`)
- [ ] Danny Green (`green_14`)
- [ ] Manu Ginobili (`mginobili_16`)

**Suns_2010s** (3)
- [ ] Devin Booker (`booker_19`)
- [ ] Goran Dragic (`gdragic_14`)
- [ ] Eric Bledsoe (`ebledsoe_15`)

**Thunder_2010s** (5)
- [ ] Kevin Durant (`durant_12`)
- [ ] Russell Westbrook (`russ_17`)
- [ ] James Harden (`harden_12`)
- [ ] Serge Ibaka (`ibaka_12`)
- [ ] Kendrick Perkins (`perkins_12`)

**Timberwolves_2010s** (5)
- [ ] Kevin Love (`love_k_12`)
- [ ] Ricky Rubio (`rubio_r_13`)
- [ ] Karl-Anthony Towns (`towns_kat_17`)
- [ ] Andrew Wiggins (`wiggins_a_17`)
- [ ] Zach LaVine (`lavine_z_16`)

### Batch 22 — 2010s (15 players)

**Warriors_2010s** (9)
- [ ] Stephen Curry (`curry_16`)
- [ ] Kevin Durant (`durant_18`)
- [ ] Klay Thompson (`thompson_16`)
- [ ] Draymond Green (`green_16`)
- [ ] Andre Iguodala (`iguodala_15`)
- [ ] Shaun Livingston (`livingston_16`)
- [ ] David West (`dwest_16`)
- [ ] JaVale McGee (`mcgee_17`)
- [ ] DeMarcus Cousins (`kcousins_19`)

**Wizards_2010s** (6)
- [ ] John Wall (`wizards_10s_1`)
- [ ] Bradley Beal (`wizards_10s_2`)
- [ ] Otto Porter Jr. (`wizards_10s_3`)
- [ ] Marcin Gortat (`wizards_10s_4`)
- [ ] Nenê (`wizards_10s_5`)
- [ ] Trevor Ariza (`wizards_10s_6`)

### Batch 23 — 2020s (41 players)

**Blazers_2020s** (5)
- [ ] Damian Lillard (`lillard_d_22`)
- [ ] Anfernee Simons (`simons_a_23`)
- [ ] Jerami Grant (`grant_j_23`)
- [ ] Jusuf Nurkic (`nurkic_j_22`)
- [ ] Scoot Henderson (`henderson_s_24`)

**Bucks_2020s** (5)
- [ ] Giannis Antetokounmpo (`giannis_20`)
- [ ] Damian Lillard (`dame_23`)
- [ ] Khris Middleton (`middleton_22`)
- [ ] Bobby Portis (`portis_22`)
- [ ] Brook Lopez (`brook_22`)

**Bulls_2020s** (3)
- [ ] Zach LaVine (`lavine_21`)
- [ ] DeMar DeRozan (`derozan_bulls_22`)
- [ ] Nikola Vucevic (`vucevic_21`)

**Cavaliers_2020s** (4)
- [ ] Donovan Mitchell (`mitchell_23`)
- [ ] Darius Garland (`garland_24`)
- [ ] Evan Mobley (`mobley_24`)
- [ ] Jarrett Allen (`allen_24`)

**Celtics_2020s** (7)
- [ ] Jayson Tatum (`tatum_24`)
- [ ] Jaylen Brown (`brown_24`)
- [ ] Derrick White (`white_24`)
- [ ] Kristaps Porzingis (`porzingis_24`)
- [ ] Jrue Holiday (`holiday_24`)
- [ ] Al Horford (`horford_24`)
- [ ] Payton Pritchard (`pritchard_24`)

**Clippers_2020s** (5)
- [ ] Kawhi Leonard (`leonard_k_21`)
- [ ] Paul George (`george_p_21`)
- [ ] Norman Powell (`powell_n_22`)
- [ ] Ivica Zubac (`zubac_21`)
- [ ] Reggie Jackson (`jackson_rg_22`)

**Grizzlies_2020s** (7)
- [ ] Ja Morant (`grizzlies_20s_1`)
- [ ] Jaren Jackson Jr. (`grizzlies_20s_2`)
- [ ] Desmond Bane (`grizzlies_20s_3`)
- [ ] Dillon Brooks (`grizzlies_20s_4`)
- [ ] Brandon Clarke (`grizzlies_20s_5`)
- [ ] Tyus Jones (`grizzlies_20s_6`)
- [ ] Xavier Tillman (`grizzlies_20s_7`)

**Hawks_2020s** (5)
- [ ] Trae Young (`young_t_22`)
- [ ] Dejounte Murray (`murray_d_23`)
- [ ] Clint Capela (`capela_22`)
- [ ] John Collins (`collins_j_22`)
- [ ] De Andre Hunter (`hunter_d_22`)

### Batch 24 — 2020s (36 players)

**Heat_2020s** (7)
- [ ] Jimmy Butler (`butler_23`)
- [ ] Bam Adebayo (`adebayo_23`)
- [ ] Tyler Herro (`herro_23`)
- [ ] Kyle Lowry (`lowry_22`)
- [ ] Max Strus (`strus_23`)
- [ ] Gabe Vincent (`vincent_23`)
- [ ] Duncan Robinson (`robinson_23`)

**Hornets_2020s** (5)
- [ ] LaMelo Ball (`ball_lm_22`)
- [ ] Miles Bridges (`bridges_mi_22`)
- [ ] Terry Rozier (`rozier_22`)
- [ ] P.J. Washington (`washington_pj_22`)
- [ ] Mark Williams (`williams_mk_22`)

**Jazz_2020s** (3)
- [ ] Donovan Mitchell (`dmitchell_22`)
- [ ] Rudy Gobert (`rgobert_21`)
- [ ] Lauri Markkanen (`markkanen_23`)

**Kings_2020s** (5)
- [ ] De'Aaron Fox (`fox_da_23`)
- [ ] Domantas Sabonis (`sabonis_d_23`)
- [ ] Malik Monk (`monk_m_23`)
- [ ] Harrison Barnes (`barnes_h_23`)
- [ ] Keegan Murray (`murray_kg_23`)

**Knicks_2020s** (3)
- [ ] Jalen Brunson (`brunson_24`)
- [ ] Julius Randle (`randle_21`)
- [ ] RJ Barrett (`rjbarrett_23`)

**Lakers_2020s** (6)
- [ ] LeBron James (`lebron_23`)
- [ ] Anthony Davis (`davis_23`)
- [ ] Russell Westbrook (`russ_22`)
- [ ] Austin Reaves (`reaves_24`)
- [ ] D'Angelo Russell (`drussell_24`)
- [ ] Jaxson Hayes (`hayes_24`)

**Magic_2020s** (3)
- [ ] Paolo Banchero (`banchero_23`)
- [ ] Franz Wagner (`fwagner_23`)
- [ ] Cole Anthony (`canthony_22`)

**Mavericks_2020s** (4)
- [ ] Luka Doncic (`luka_24`)
- [ ] Kyrie Irving (`kyrie_23`)
- [ ] P.J. Washington (`washington_24`)
- [ ] Spencer Dinwiddie (`dinwiddie_24`)

### Batch 25 — 2020s (36 players)

**Nets_2020s** (5)
- [ ] Kevin Durant (`durant_bk_22`)
- [ ] Kyrie Irving (`irving_bk_22`)
- [ ] James Harden (`harden_bk_21`)
- [ ] Mikal Bridges (`bridges_mi_23`)
- [ ] Nic Claxton (`claxton_n_23`)

**Nuggets_2020s** (5)
- [ ] Nikola Jokic (`jokic_23`)
- [ ] Jamal Murray (`murray_23`)
- [ ] Michael Porter Jr. (`porter_23`)
- [ ] Aaron Gordon (`gordon_23`)
- [ ] Christian Braun (`braun_24`)

**Pacers_2020s** (5)
- [ ] Tyrese Haliburton (`haliburton_23`)
- [ ] Myles Turner (`turner_m_23`)
- [ ] Pascal Siakam (`siakam_24`)
- [ ] Buddy Hield (`hield_23`)
- [ ] Bennedict Mathurin (`mathurin_23`)

**Pelicans_2020s** (5)
- [ ] Zion Williamson (`williamson_z_22`)
- [ ] Brandon Ingram (`ingram_b_22`)
- [ ] CJ McCollum (`mccollum_cj_22`)
- [ ] Herb Jones (`jones_h_23`)
- [ ] Jonas Valanciunas (`valanciunas_22`)

**Pistons_2020s** (3)
- [ ] Cade Cunningham (`cunningham_23`)
- [ ] Jalen Duren (`duren_23`)
- [ ] Saddiq Bey (`sbey_22`)

**Raptors_2020s** (7)
- [ ] Pascal Siakam (`raptors_20s_1`)
- [ ] OG Anunoby (`raptors_20s_2`)
- [ ] Scottie Barnes (`raptors_20s_3`)
- [ ] Fred VanVleet (`raptors_20s_4`)
- [ ] Jakob Poeltl (`raptors_20s_5`)
- [ ] Gary Trent Jr. (`raptors_20s_6`)
- [ ] RJ Barrett (`raptors_20s_7`)

**Rockets_2020s** (3)
- [ ] Jalen Green (`jgreen_23`)
- [ ] Alperen Sengun (`sengun_24`)
- [ ] Jabari Smith Jr. (`jsmith_23`)

**Sixers_2020s** (3)
- [ ] Joel Embiid (`embiid_24`)
- [ ] Tyrese Maxey (`maxey_24`)
- [ ] Tobias Harris (`tharris_21`)

### Batch 26 — 2020s (30 players)

**Spurs_2020s** (3)
- [ ] Victor Wembanyama (`wembanyama_24`)
- [ ] Dejounte Murray (`dmurray_22`)
- [ ] DeMar DeRozan (`derozan_spurs_21`)

**Suns_2020s** (6)
- [ ] Devin Booker (`booker_22`)
- [ ] Kevin Durant (`durant_23`)
- [ ] Bradley Beal (`beal_23`)
- [ ] Mikal Bridges (`bridges_22`)
- [ ] Deandre Ayton (`ayton_22`)
- [ ] Chris Paul (`cp3_22`)

**Thunder_2020s** (4)
- [ ] Shai Gilgeous-Alexander (`sga_24`)
- [ ] Jalen Williams (`williams_24`)
- [ ] Lu Dort (`dort_24`)
- [ ] Chet Holmgren (`holmgren_24`)

**Timberwolves_2020s** (5)
- [ ] Anthony Edwards (`edwards_a_23`)
- [ ] Karl-Anthony Towns (`towns_kat_23`)
- [ ] Rudy Gobert (`gobert_r_23`)
- [ ] Mike Conley (`conley_m_23`)
- [ ] Jaden McDaniels (`mcdaniels_j_23`)

**Warriors_2020s** (6)
- [ ] Stephen Curry (`curry_22`)
- [ ] Klay Thompson (`thompson_22`)
- [ ] Draymond Green (`green_22`)
- [ ] Jordan Poole (`poole_22`)
- [ ] Andrew Wiggins (`wiggins_22`)
- [ ] Kevon Looney (`looney_22`)

**Wizards_2020s** (6)
- [ ] Bradley Beal (`wizards_20s_1`)
- [ ] Kyle Kuzma (`wizards_20s_2`)
- [ ] Kristaps Porzingis (`wizards_20s_3`)
- [ ] Jordan Poole (`wizards_20s_4`)
- [ ] Tyus Jones (`wizards_20s_5`)
- [ ] Corey Kispert (`wizards_20s_6`)

<!-- checklist total: 938 players -->

## Log

(Running notes get appended here per completed batch — notable judgment
calls, players you weren't fully confident on, anything the next session
should double-check.)

### Batch 1 — 1960s (Bucks, Bulls, Celtics, Hawks, Kings, Knicks, Lakers, Pistons)

The 1960s stat lines are, overwhelmingly, already accurate — they match
real career or specific-season averages. Research-grade checks on the
star tier all held up:
- **Wilt Chamberlain** (Lakers_1960s, 24.3/23.8/4.4) — verified against
  his 1968-69 Lakers season (his only 1960s Lakers year); Wikipedia
  reports 24.3 pts / 23.8 reb, so the entry is correct. Left unchanged.
  (I initially suspected inflation and nearly "corrected" it to a wrong
  20.5/21.1 — the source check prevented introducing an error.)
- Oscar Robertson (30.8/—/11.4), Jerry West (26.9 = career avg), Walt
  Frazier (17.5 ≈ '68-69), Elgin Baylor (27.1/13.5 = career), Bill
  Russell (career line), Bob Cousy (early-60s decline line), Willis Reed
  (peak line) — all consistent with real data. Left unchanged.

**Two archetype fixes (the only edits this batch):**
- **Jerry West** (Lakers_1960s): `Sharpshooter` → `Two-Way Star`. He was
  a shot-creating scorer + 4× All-Defensive First Team, not a
  catch-and-shoot floor-spacer; "Sharpshooter" also conflicted with his
  existing `Elite Playmaker` trait. Verified defensive credentials via
  source.
- **Joe Caldwell** (Hawks_1960s, pop 37): `Two-Way Star` → `Slasher`.
  "Two-Way Star" (per rubric = genuine two-way *superstar*) was inflating
  a role player and would have mis-fired the Two-Way Pillars chemistry
  synergy; `Slasher` matches his athletic-scorer role and his existing
  `Slasher` trait.

**Head start for batch 27 (popularity) — genuine all-time greats the
formula severely under-rates in this batch (do NOT hand-edit here; add to
the `NAMED` dict in batch 27):**
- **Bob Pettit** (Hawks) — pop **52**. 2× MVP, 26.4/16.2 career, first
  to 20k points. Egregiously low; should be ~80s.
- **Lenny Wilkens** (Hawks) — pop **35** (floor!). HOF PG, 9× All-Star.
- Jerry Lucas (Kings) 60, Jack Twyman (Kings) 39, Dave Bing (Pistons) 65,
  Bailey Howell (Pistons) 48 — all Hall of Famers rated as role players.

**Minor archetype mismatches left as-is** (sub-75, no clean fit among the
6 archetypes, per the "leave plausible role-player data" rule): Don Nelson
(Celtics) as `Paint Beast` for a 10/5 crafty stretch forward; Tom Heinsohn
(Celtics) as `Slasher` for a volume jump-shooter. Flag only if a future
pass wants stricter archetype fidelity for the long tail.
