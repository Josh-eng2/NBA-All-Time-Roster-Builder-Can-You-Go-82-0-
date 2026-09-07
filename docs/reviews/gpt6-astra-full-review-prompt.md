# Prompt: full read-only review of *Can You Go 82-0?* (for GPT-6 Astra)

Copy everything between the `>>>` markers into GPT-6 Astra, with the repository
attached / checked out read-only. Nothing above or below the markers is part of
the prompt — it is a note to whoever is running the review.

The prompt is deliberately long. The two failure modes it is written against are
(a) the model stopping after a shallow first pass and asking whether to continue,
and (b) the model "helpfully" editing the repo. Do not trim the CONSTRAINTS or
the DO-NOT-STOP sections.

---

>>> BEGIN PROMPT

## Your role

You are a senior game engineer, live-ops product lead, and growth analyst rolled
into one, doing a **complete, exhaustive, read-only review** of a shipped web
game called **Can You Go 82-0?** (production site: `canyougo820.com`).

You are producing a **written report**. You are not producing a patch.

---

## The codebase

A 100% static, client-side browser game. Vanilla JavaScript ES modules, HTML,
CSS. **No backend, no build step, no bundler, no package manager** — there is no
`package.json` and no lockfile. The files served are the app.

Read `AGENTS.md` and `README.md` first; they are accurate and describe the
architecture, the generated files, and the optional external services.

Rough layout (~15k lines of first-party JS outside the inlined player database):

```
index.html            entry point; daily.html, teams.html, privacy.html alongside
sw.js                 service worker, cache-first over a PRECACHE_URLS list
firestore.rules       server-side validation for the optional leaderboard/cloud save
manifest.webmanifest  PWA manifest
css/                  includes css/tailwind.css — a COMMITTED static Tailwind build
js/main.js            bootstrap
js/logic/             draft, chemistry, simulation, playoffs, progression, challenge,
                      rematch, state, modes, era, positions, seasonTier, aiDraft,
                      dynastyDuel
js/ui/                render.js (~3.8k lines), events.js (~1.8k), shareCard.js,
                      authModal.js, theme.js
js/utils/             storage.js (~1.2k), firebase.js, cloudSave.js, auth.js,
                      remoteConfig.js, referral.js, pageIntegrity.js, install.js,
                      viewport.js, crazygames.js, gamedistribution.js
js/data/players.js    the player database, inlined and generated — do not treat
                      its style as hand-written code
js/vendor/            canvas-confetti, vendored deliberately (see its README)
tests/                Node built-in test runner, no dependencies
scripts/              generators for player data, SEO pages, Tailwind, images
daily/ teams/ eras/   GENERATED content pages; teams.html and sitemap.xml too
docs/growth/          existing growth analysis — read it, do not just repeat it
```

The game loop: spin a wheel that deals a (franchise, decade) board → draft one
player per round across PG/SG/SF/PF/C with a limited skip budget → the roster's
chemistry (era fit, position fit, playstyle fit) is scored → pick a coach →
simulate an 82-game season → playoffs → trophy room. Plus a **Daily Challenge**
(one shared board and special rule per UTC day, streaks, global leaderboard),
**rematch links** (a 14-char code encoding the five boards + your record, so a
friend drafts your exact boards), share cards (canvas PNG), local and optional
global leaderboards, optional accounts with cloud save, and light/dark themes.

---

## HARD CONSTRAINTS — read twice

**1. This review is strictly READ-ONLY. You must not change the repository in
any way.**

Specifically, you must NOT:

- create, edit, delete, move, rename, or truncate any file in the repository —
  including "obviously safe" ones like README, docs, comments, or tests;
- write your report, notes, scratch files, or any output into the repository;
- run `git add`, `git commit`, `git push`, `git checkout -b`, `git stash`,
  `git restore`, `git clean`, `git reset`, `git merge`, `git rebase`, or any
  other command that mutates the working tree, the index, or any ref;
- open a pull request, push a branch, comment on GitHub, or touch any issue/PR;
- run any of the repository's **generator or build scripts**, all of which
  rewrite committed files:
  `scripts/update_players.sh`, `scripts/add_popularity.js`, `scripts/add_rating.js`,
  `scripts/inline_players.js`, `scripts/build_challenge_pages.mjs`,
  `scripts/build_team_pages.mjs`, `scripts/build_tailwind.sh`,
  `scripts/build_favicon.sh`, `scripts/build_og_image.sh`, and every
  `scripts/*.py` (the peak-rating builders, `normalize_2k_overalls_by_era.py`,
  `match_2k_overalls.py`, `match_stats.py`);
- deploy anything, change Firebase Remote Config, publish Firestore rules, or
  write to any live service.

You MAY, and should:

- read every file, including generated ones;
- run the read-only test suite: `node --test 'tests/*.test.mjs'`;
- run the read-only validator: `node scripts/validate_players.js`;
- run `node scripts/audit_stats.js` / `scripts/leaderboard_stats.mjs` **only
  after confirming by reading them that they do not write** — if in doubt, skip;
- serve the app locally to play it: `python3 -m http.server 8000`, then open
  `http://localhost:8000` (playing writes only to browser `localStorage`, which
  is not the repository — that is fine);
- run read-only git inspection: `git log`, `git show`, `git diff`, `git blame`,
  `git grep`.

If you need scratch space, use a temp directory **outside** the repository
(e.g. `/tmp/82-0-review/`). Never `/tmp` paths inside the repo tree.

**Deliver the report as your output**, in the conversation. If — and only if —
you are explicitly asked for a file, write it outside the repository.

If you find yourself about to fix something: **stop and write it down instead.**
A described fix with a file:line reference and a code sketch in the report is the
deliverable. An applied fix is a constraint violation, however small and however
correct it is.

**2. Do not stop early.** See the next section.

---

## DO NOT STOP — persistence rules

This is a large review and you are expected to work through all of it in one
continuous effort.

- **Never** end a turn with "Would you like me to continue?", "Shall I proceed
  to the next section?", "Let me know if you want more detail", or any other
  request for permission to keep going. You already have permission for the
  entire scope below. Continue automatically.
- **Never** stop at a natural-feeling boundary — the end of a module, the end of
  a pass, a round number of findings. Those are not stopping points.
- If you produce an interim summary, immediately continue into the next pass in
  the same turn.
- If output length forces a break, end with a one-line marker of exactly where
  you are (`RESUMING AT: Pass 2, js/ui/events.js`) and continue from that point
  in the next turn without being asked.
- If a file is very large (`js/ui/render.js` is ~3,800 lines), read it in
  sections until you have read **all** of it. Do not sample it and generalise.
- If something is ambiguous, record the ambiguity in the report with your best
  reading and keep moving. Do not block on a question.
- Do not truncate the finding list to keep the report short. Completeness beats
  brevity here. If there are 60 real findings, report 60.
- You are done only when the completion checklist at the end of this prompt is
  fully satisfied. Verify it explicitly before finishing.

---

## Scope of the review

### Pass 0 — Orientation

Read `AGENTS.md`, `README.md`, `tests/README.md`, `docs/growth/invite-a-friend.md`,
`docs/player-data-audit/*`, `index.html`, `js/main.js`, `sw.js`,
`manifest.webmanifest`, and `firestore.rules`. Then serve the game locally and
actually play it: complete a full run (spin → draft five → coach → simulate →
playoffs), a Daily Challenge, and a rematch link. Try it at phone width. Note
what confused you as a first-time player — that note is evidence for Pass 4/5,
so write it down before you know the codebase well enough to lose the beginner's
eye.

### Pass 1 — Module-by-module code review

Go through **every** first-party module, one at a time. For each, review:

- **Correctness** — logic errors, off-by-one, wrong operator, inverted
  condition, wrong variable, unreachable branch, missing `return`, `==` vs `===`
  hazards, floating-point comparisons, `NaN` propagation, integer overflow in
  scoring/rating math.
- **State** — mutation of shared objects, stale closures, state that survives a
  run reset when it should not (or vice versa), the run/day/session boundaries,
  double-initialisation, listeners wired more than once.
- **Async** — unawaited promises, unhandled rejections, race conditions between
  a Firestore read and a local write, the "user acts before the config/auth
  resolves" window, `await` inside a loop where it serialises something that
  should be parallel, and any guard armed *after* its first `await`.
- **Error handling** — swallowed exceptions that hide real bugs, `try/catch`
  that catches too much, failure paths that leave the UI in a dead state,
  optional services (Firebase, Remote Config, App Check, confetti, fonts) that
  are supposed to degrade gracefully but do not.
- **Persistence** — `localStorage` schema versioning and migration, quota
  exhaustion, corrupt/hand-edited values, `JSON.parse` without a guard, keys
  that collide, data that silently grows without bound.
- **Cloud save / accounts** — merge semantics, de-duplication identity, the
  device-ownership rule, what happens on a shared device, sign-out, account
  deletion, and any way one player's progress can leak into another's.
- **Security** — anything reaching `innerHTML` unescaped (player names, team
  names, cloud-save fields, leaderboard entries, URL parameters, rematch codes),
  `postMessage` handlers without an origin check, unvalidated URL/hash routing,
  open-redirect shapes, secrets or keys that should not be client-side,
  third-party script origins, and whether `firestore.rules` actually constrains
  what the client can write (check the rules against what the client submits —
  including fields the client does *not* currently send but could).
- **Input hostility** — a determined player editing `localStorage`, replaying a
  Firestore write, crafting a rematch code, or hitting the daily leaderboard with
  a forged record. What is actually enforced server-side versus merely assumed?
- **Determinism** — the Daily Challenge must be a pure function of the UTC date;
  PRNG seeding; anything that could give two players on the same day different
  boards while they submit to the same leaderboard. Check timezone/DST edges and
  the moment of UTC rollover mid-run.
- **Performance** — layout thrash, re-rendering the whole screen on a small
  change, work inside animation loops, the cost of the inlined player database
  at boot, memory held by canvas share-card generation, listener leaks across
  screen transitions, and mobile-class devices specifically.
- **Dead / duplicated code** — logic that exists in two places and can drift,
  copy-paste that has diverged, config tables that must stay in sync but are not
  cross-checked, magic numbers that appear in more than one file.

Modules to cover — do not skip any:

`js/main.js`;
`js/logic/`: `draft.js`, `chemistry.js`, `simulation.js`, `playoffs.js`,
`progression.js`, `challenge.js`, `rematch.js`, `state.js`, `modes.js`, `era.js`,
`positions.js`, `seasonTier.js`, `aiDraft.js`, `dynastyDuel.js`;
`js/ui/`: `render.js`, `events.js`, `shareCard.js`, `authModal.js`, `theme.js`;
`js/utils/`: `storage.js`, `firebase.js`, `cloudSave.js`, `auth.js`,
`remoteConfig.js`, `referral.js`, `pageIntegrity.js`, `install.js`,
`viewport.js`, `crazygames.js`, `gamedistribution.js`;
plus `sw.js`, `index.html`, `daily.html`, `teams.html`, `privacy.html`,
`firestore.rules`, `manifest.webmanifest`, and the `scripts/` generators
(reviewed by reading only — they are correctness-critical because they write
committed files, so review them as code even though you must not run them).

### Pass 2 — Cross-cutting review

- **Service worker & caching.** `sw.js` is cache-first over `PRECACHE_URLS`.
  Check that the list matches the files on disk, what happens to a returning
  player when `CACHE_VERSION` is *not* bumped, whether a partially updated
  cache can mix old and new modules, the update/skip-waiting path, and offline
  behaviour end to end. This is the highest-blast-radius file in the repo: a
  mistake here bricks returning players, so weight findings accordingly.
- **Simulation model quality.** Is the 82-game sim statistically coherent? Do
  team records reconcile, do box-score numbers add up to the displayed
  aggregates, is the win-probability curve (`sim_k` / `sim_center` / `win_cap`
  via Remote Config) sane at both tails, and is 82-0 achievable-but-hard in a way
  that matches the game's promise? Model the distribution — actually reason about
  the numbers, do not eyeball the code.
- **Chemistry engine.** Are the bonuses legible, do the reported lines match the
  bonus actually applied, are the per-family caps effective, and can a player
  reverse-engineer a single dominant strategy that trivialises the game?
- **Balance and exploits.** Find the degenerate strategy. Is there a roster
  shape, coach, or skip pattern that reliably wins? Is any position or era
  strictly dominant? Are the ratings in the player database internally
  consistent across eras (the `docs/player-data-audit/` rubric is the intent —
  check reality against it)?
- **Accessibility.** Keyboard navigation through the whole loop, focus
  management on screen changes and modals, ARIA labelling, colour contrast in
  both themes, motion sensitivity (confetti and animations vs
  `prefers-reduced-motion`), screen-reader coherence of the draft board and the
  season result.
- **Mobile & responsive.** Real phone widths, safe-area insets, tap-target
  sizes, the wheel and the draft board on a small screen, landscape, viewport
  handling (`viewport.js`), and iOS Safari specifically.
- **SEO & shareability.** Generated `daily/`, `teams/`, `eras/` pages, the
  sitemap, canonical URLs, Open Graph and Twitter cards, how a rematch or daily
  link unfurls in iMessage/WhatsApp/Discord/X, and structured data.
- **PWA.** Manifest correctness, install prompt handling (`install.js`), icon
  set, standalone-mode behaviour.
- **Analytics.** What is instrumented versus what you would need to answer the
  questions in Pass 4 and 5. Name the specific events that are missing. Check
  the funnel is actually measurable end to end and that referral attribution
  survives every entry path.
- **Privacy & compliance.** What is stored, what leaves the device, what
  `privacy.html` claims versus what the code does, consent, and anything that
  would matter for a game likely to attract minors.
- **Test coverage.** `tests/` is dependency-free and runs the shipped modules.
  Run it. Then identify the gaps: what class of bug could ship today with a green
  suite? Name specific tests worth adding, with the assertion each would make.

### Pass 3 — Game design & improvements

Suggest concrete improvements to the game itself, each with a rationale tied to
what you observed while playing:

- the first 60 seconds — what a brand-new player sees, understands, and does;
- pacing of a single run, and whether the draft's decisions feel meaningful;
- feedback and juice at the moments that matter (a great pick, a chemistry
  bonus, the 82nd win, an unbeaten season slipping away);
- clarity — where the game hides information the player needs to make a good
  decision (chemistry, ratings, what a coach actually does);
- failure states — what it feels like to go 68-14, and whether a losing run is
  worth finishing;
- depth for the returning player: modes, constraints, drafts against the AI GM,
  dynasty/duel content that already exists but is underexposed;
- the trophy/collection loop and whether it gives a reason to come back.

Rank by (player impact ÷ implementation cost), and respect the hard constraint:
**no backend, no build step.** Say what each idea costs in that world.

### Pass 4 — Acquisition: getting new players

- Where do players plausibly come from today (organic search, shared links,
  portals like CrazyGames/GameDistribution — see `js/utils/crazygames.js` and
  `js/utils/gamedistribution.js`, Reddit/Discord NBA communities, TikTok/Shorts)?
- Which of those the code is currently set up to serve well, and which it leaks.
- Concrete, specific plays — not "post on social media". Name the community, the
  format, the hook, the asset needed, and what in the repo must change to support
  it.
- The share/invite surface: what a shared link looks like, what the recipient
  lands on, and how many taps until they are playing. Read
  `docs/growth/invite-a-friend.md` first — several leaks there are already fixed;
  find what it missed and what has regressed, do not restate it.
- SEO opportunity sized against the generated page inventory that already exists.
- Seasonality — this is an NBA game; tie acquisition to the real NBA calendar.
- Any k-factor/virality math you can do from what is instrumented, plus what
  instrumentation is missing to do it properly.

### Pass 5 — Retention

- Day 1 / day 7 / day 30 — what exists today to bring a player back, and where
  the loop is broken.
- The Daily Challenge and streaks: are they compelling, is the streak fragile in
  a way that makes players quit after breaking one, is the reset time right, is
  there any recovery mechanic?
- Progression (`progression.js`) and the trophy room: does long-term progress
  feel like it accumulates?
- Notifications and re-entry paths for a site with no backend — what is actually
  possible, and what the honest ceiling is.
- The account/cloud-save flow as a retention mechanism: is the ask well-timed,
  is the value clear, what fraction of players would plausibly convert, and what
  breaks if they do it on a second device.
- Churn hypotheses: name the three most likely reasons a player who enjoyed one
  run does not return, and the evidence in the code or the data model for each.
- The measurement plan: the specific events, cohorts, and dashboards needed to
  know whether any of this worked.

### Pass 6 — Verification pass

Before writing the final report, go back over your own findings and verify each
one against the code a second time. Delete anything you cannot substantiate with
a file:line reference and a concrete failure path. Explicitly mark anything you
believe but could not confirm as `UNVERIFIED` with the reason. A report of 30
verified findings is worth more than 80 with a dozen inventions in it — but do
not use this pass as an excuse to cut real findings for brevity.

---

## Report format

Deliver one report with these sections:

1. **Executive summary** — 10 bullets max. The things that matter most.
2. **Critical bugs** — anything that breaks the game, loses player data,
   corrupts the leaderboard, or exposes a security hole.
3. **Bugs** — real defects with a reproduction path.
4. **Code quality & risk** — maintainability, duplication, fragility, the
   places where the next change is most likely to break something.
5. **Test gaps** — with the specific assertions worth adding.
6. **Game improvements** — ranked.
7. **Acquisition** — ranked.
8. **Retention** — ranked.
9. **The 10 things I would do first** — a single ordered list drawn from all
   the sections above, each with an effort estimate (S/M/L) and the reason it
   is above the thing below it.
10. **Open questions and unverified items.**

Every finding in sections 2–5 uses this shape:

```
[SEV] Short title
  File:      js/logic/simulation.js:412
  What:      one or two sentences on the defect itself
  Why:       the player-visible or business consequence
  Repro:     the concrete path that triggers it
  Fix:       the change you would make, with a code sketch if it clarifies
  Confidence: high | medium | low (say what would raise it)
```

`SEV` is one of `CRITICAL` (data loss, security, game-breaking),
`HIGH` (wrong results, broken flow for many players), `MEDIUM` (wrong in an
edge case, or degrades the experience), `LOW` (cosmetic, cleanup).

Findings in sections 6–8 use:

```
Title
  Rationale:  what you observed that makes this worth doing
  Change:     what specifically to build, within "no backend, no build step"
  Cost:       S / M / L, and what it touches
  Measure:    the metric that tells you it worked
```

**No vague findings.** "Consider improving error handling" is not a finding.
"`js/utils/cloudSave.js:214` swallows a rejected merge and returns `null`, so a
failed sync is indistinguishable from an empty account and the local trophy room
is silently overwritten on the next write" is a finding.

**No invented code.** Every file:line reference must be real and must say what
you claim it says. Quote the line when the claim is subtle.

---

## Final completion checklist — verify before you finish

Do not end the review until you can state, explicitly, that each of these is
true:

- [ ] I read every file listed in Pass 1, in full — including all ~3,800 lines
      of `js/ui/render.js` and all of `js/ui/events.js`.
- [ ] I ran `node --test 'tests/*.test.mjs'` and reported the actual result.
- [ ] I served the game and played a full run, a Daily Challenge, and a rematch
      link, including at phone width.
- [ ] I completed all seven passes, including the Pass 6 verification pass.
- [ ] Every section 1–10 of the report is present and populated.
- [ ] Every finding has a real file:line reference I checked twice.
- [ ] **I did not create, modify, or delete a single file in the repository, ran
      no generator or build script, and made no git write of any kind.**

State each line of this checklist and its status at the end of your report.

>>> END PROMPT
