# Getting players to invite their friends

Suggestions for turning **Can You Go 82-0?** from a game people play into a game
people *send*. Everything below is grounded in what the repo actually ships
today — file and line references throughout — and split into verified leaks
worth fixing this week, structural gaps worth building, and the metrics that
tell you whether any of it worked.

The hard constraint shaping every recommendation: **no backend, no build step.**
Ideas are ranked with that in mind, and each one says what it costs.

---

## 1. What already ships

Worth stating plainly, because the sharing story here is further along than most
games at this stage and the gaps are specific rather than general.

| Mechanic | Where | What it does |
| --- | --- | --- |
| **Rematch links** | `js/logic/rematch.js` | Encodes the five (team, decade) boards + the record into a 14-char code. The recipient drafts the *identical* boards with your record as the target. |
| **Share cards** | `js/ui/shareCard.js` | Canvas PNG in feed (1080×1200) and story (1080×1920), with a matching text caption. |
| **Copy challenge link** | `js/ui/render.js:1970` | Bare URL for dropping into a group chat without an image. |
| **Daily Challenge** | `js/logic/challenge.js` | One shared board per day for everyone, plus streaks and a global daily leaderboard. |
| **Referral attribution** | `js/utils/referral.js` | First-touch `?ref=` capture, stamped onto every analytics event. |
| **Share funnel events** | `js/ui/events.js:1526` | `share_attempted` → `share_completed` / `share_dismissed` / `share_failed`. |

The rematch link is the strong asset here. "Same five boards, same picks on the
table" is a *fair* challenge, and the code comment in `rematch.js` explaining why
it encodes the literal spin sequence rather than the RNG seed shows the mechanic
was built to actually hold up. The problem is not the invite — it's everything
around it.

---

## 2. Four verified leaks

These are bugs and misconfigurations found while reading the code, not
speculation. All are small.

### 2.1 Challenge links unfurl as the generic homepage

`buildDailyUrl()` (`js/logic/rematch.js:121`) returns
`https://canyougo820.com/?ref=daily#/daily`. The payload lives in the **hash** —
which is never sent to a server and is invisible to every link unfurler. So a
challenge dropped in WhatsApp, iMessage, Discord or Slack previews as the same
generic *"Can You Go 82-0? NBA Team Generator & Roster Builder"* card every
time, saying nothing about the challenge inside it.

In a group chat **the preview is the invite.** It is the only thing most people
see before deciding whether to tap.

**The daily case is fixable today, with no backend.** `daily/<slug>.html` pages
are already generated with per-challenge OG tags:

```html
<meta property="og:title"       content="65-Win Season: Win 65 of 82 — NBA Daily Challenge" />
<meta property="og:description" content="Any roster — win at least 65 games." />
```

Point `buildDailyUrl()` at `https://canyougo820.com/daily/<slug>.html?ref=daily`
and every shared daily link starts previewing the actual challenge.

One wrinkle worth handling deliberately: the slug comes from
`slugify(ch.title)`, and `slugify` currently lives in `scripts/lib/seo-utils.mjs`
— a build-time module the game doesn't load. Copying those four lines into the
client would work but creates two definitions that can silently drift, and a
drifted slug means every shared daily link 404s. Better to have
`build_challenge_pages.mjs` write the slug onto the challenge itself so the page
and the link are generated from one value. (Whatever you do, keep it out of
Remote Config — `getDailyChallenge()` has to stay a pure function of the UTC
date, or two players get different boards on the same day.)

**The rematch case is genuinely constrained.** Codes are unbounded, so you can't
pre-generate a page per code, and a per-code preview needs an edge function —
a backend, which this project deliberately doesn't have. Two honest options:
accept it and lean on the *image* card (which does carry the record, and which
the native share sheet attaches), or route challenge links through a single
static `/c/index.html` whose OG copy is challenge-flavoured
(*"Someone went 64-18 on these five boards. Your turn."*) even if it can't be
record-specific. The second is strictly better than the homepage card.

### 2.2 The page selling the Daily Challenge doesn't start it

`daily/65-win-season.html:102`:

```html
<p><a class="seo-cta" href="../">▶ Play today's challenge</a></p>
```

A reader who just read the whole challenge description clicks "Play today's
challenge" and lands on the **mode-select menu**. They have to find the Daily
tile themselves — and the link drops `?ref=daily`, so the visit isn't even
attributed.

Should be `../?ref=daily#/daily`. The router already handles that route
(`HASH_ROUTE_MAP` in `js/ui/events.js`), and `hasKnownHashRoute()` exists
precisely so a first-time visitor with a deep link skips the cold open. This is
a one-line change in `scripts/build_team_pages.mjs` / `build_challenge_pages.mjs`
and it fixes every generated page at once.

### 2.3 `share_completed` counts downloads

`js/ui/events.js:1553`:

```js
downloadBlob(blob, name);
logAnalyticsEvent('share_completed', { ...base, method: 'download' });
```

When the native share sheet is unavailable the card is downloaded to the user's
disk and logged as a completed share. Nothing was shared with anyone. The
function's own header is careful and honest about the `native_files` case
("the sheet closed without cancelling", not "a friend received this") — but the
download branch is a different thing entirely: no sheet ever opened.

This inflates the headline share number with desktop users who got a PNG in
their Downloads folder, and it does it *unevenly* across platforms, so
share-rate comparisons between mobile and desktop are currently meaningless.
Rename it `share_downloaded`. The number will drop. That's the point.

### 2.4 No channel dimension

`share_completed` records `method` (`native_files`, `native_text`, `clipboard`)
but nothing about *where* the share went. The Web Share API genuinely doesn't
report the chosen target, so this can't be captured directly — but the inbound
side can approximate it: add a channel hint to the copy-link path (the one case
where the user picks a destination themselves), and segment `referral_landing`
by `document.referrer` where it survives. Without this you cannot answer "should
we optimise the card for WhatsApp or for X", which changes the card's shape.

---

## 3. Three structural gaps

The leaks above are worth fixing. These are why invites don't compound.

### 3.1 The loop never closes

**This is the single biggest gap.**

Today: you send a challenge link. Your friend opens it, drafts the same boards,
simulates, and sees a verdict banner (`renderRematchResultBanner`,
`js/ui/render.js:1985`) telling *them* whether they beat you.

**You never find out.** `rematch_completed` fires into analytics and stops
there. The sender gets no signal, ever.

Every viral loop that actually compounds has a return signal — Wordle's shared
grid invites a reply, chess and Words With Friends notify you it's your move.
Without one, a challenge is a single outbound message with no reason to send a
second. You get one invite per player, not a rally.

**The fix needs no backend.** The verdict screen already computes `beat` and
`margin`. Add a **"Send it back"** button that generates a reply — the recipient's
*own* new board code plus a caption that carries the result:

> You sent 64-18. I went 71-11 on the same five boards ⚔️ Your turn.
> → *(their rematch link)*

The reply is itself a new invite. One link becomes a back-and-forth, and the
same two people re-invite each other indefinitely. Reuses `encodeBoardCode()`
and `buildShareCaption()` almost as-is.

Worth adding to the share card too: the head-to-head chip already exists
(`shareCard.js`, the `hasVerdict` block) — a beaten record is the most
screenshot-worthy thing this game produces and it should be the loudest element
on the card, not a small chip.

### 3.2 The invite is anonymous

The rematch code carries the board and the record — and nothing else. The
recipient's draft banner (`js/ui/render.js:942`) reads as a target from *nobody*.

"Beat 64 wins" is a chore. "**Josh** went 64-18 on these exact boards" is a
callout. Same board, completely different conversion rate — and it's the
difference between a link that looks like spam in a group chat and one that
obviously came from a person.

Cheap to add: put the name in the **query string**, not the code —
`?ref=rematch&n=Josh#/rematch?c=...`. The wire format stays untouched, so no
`VERSION` bump and every existing link keeps working. Source it from the account
`displayName` (the "GM name" field already exists, `js/ui/authModal.js:186`) or
prompt once at first share and keep it in `localStorage` for players without an
account.

Escape it and cap the length on the way in — the repo already has
`tests/escaping.test.mjs` for exactly this class of bug, and a name from a URL
rendered into a banner is textbook injection surface.

### 3.3 The invite only exists at the finish line

`renderChallengeShareCard()` renders on the results screen only. To be *asked*
to invite anyone, a player must draft five players, pick a coach, and simulate
82 games.

Everyone who bounces mid-draft — the majority of first sessions — is never asked
at all. And the moments with the most emotional energy aren't wired to sharing:

| Moment | Where | Why it's the right moment |
| --- | --- | --- |
| Drafting a 97+ Legend | `progression.js` `PLAYER_XP_TIERS` | "I just got prime Jordan on my board" is a message people want to send. |
| A 20+ game win streak | already on the card | Peak run excitement, mid-season. |
| 82-0 or a championship | `renderChampionScreen` | The rarest outcome; currently shares as a normal result. |
| **Abandoning a draft** | the exit path | The board still exists — "send it to someone who'd do better with it" costs nothing and converts a bounce. |

The last one is the sleeper. A player quitting mid-draft is a total loss today.
The board is fully encodable at that point (it's the wheel results, not the
picks), so a departing player can still hand someone a challenge.

Keep these as small non-blocking chips, not modals. A modal between a player and
their next pick will cost more sessions than it earns invites.

---

## 4. Bigger bets

Ranked by leverage per unit of effort.

### 4.1 Async 1v1 by link — *high leverage, medium effort*

The mode most obviously *about* a friend is the one you can't play with a remote
friend. 1v1 is same-device pass-and-play: *"All 5 spots locked in. Hand the
device to Player 2"* (`js/ui/render.js:1761`).

The engine already does everything hard — dual-roster snake draft, a best-of-7
series, `seriesLabels()` for the UI. What's missing is only the handoff.

P1 drafts, gets a link. P2 opens it, drafts the same board **without seeing P1's
picks**, and the series simulates on P2's device with both rosters revealed
together. The board encoding exists; this additionally needs P1's five picks in
the code (five player indices), which is a natural extension of the same
scheme — bump `VERSION` and add a style.

This makes inviting a friend the *point* of a mode rather than an afterthought
attached to a results screen. It's the highest-value new thing on this list.

### 4.2 Crews — private friend leaderboards on the Daily — *highest ceiling, highest cost*

The Daily Challenge is already the same board for everyone. That's the ideal
group mechanic and it's currently only pointed at a global board of 50 strangers.

Let a player create a **crew** from a link. Everyone who joins through it sees a
friends-only daily board alongside the global one.

Why it's the highest ceiling: every other idea here produces a *one-shot* invite.
A crew produces a **recurring reason to come back and to pull others in** —
because a board with four people you know on it beats a board with fifty you
don't, every single day.

Why it's the highest cost: it needs a `crews` collection, `firestore.rules`
work, and join/leave flows — real backend surface in a project that has stayed
deliberately backend-light. Worth doing *after* the loop is closed, not before;
if one-to-one challenges don't rally today, group challenges won't either.

A cheap intermediate step: since the daily board is identical for everyone,
a "compare with a friend" link that just carries *your* daily result needs no
Firestore at all, and tests the appetite before you build the infrastructure.

### 4.3 Reward the inviter — *medium leverage, low effort*

Nothing in the game currently rewards bringing someone in.

The progression system's constraint is exactly right and should be kept:
*"Rewards are cosmetic/identity only, never power. A Level 10 player drafts from
exactly the same boards a Level 1 player does, so records stay comparable."*
Referral rewards must obey it — anything that makes an inviter's team stronger
breaks the leaderboard.

So reward with **identity**, which this game already trades in: titles and
badges alongside Scout / Assistant GM / Hall of Fame GM.

| Milestone | Title |
| --- | --- |
| 1 friend plays your challenge | **Recruiter** |
| 5 | **Scout Network** |
| 25 | **Front Office** |

Needs a sender ID in the link (`?r=<short-uid>`) and a way to count completions.
A Firestore counter is the clean version; a client-side approximation from
"send it back" replies (§3.1) works with no backend and is a reasonable first cut.

### 4.4 Make streaks social — *low effort, good retention*

Daily streaks exist (`getDailyStreak()`, `js/utils/storage.js:790`) and are
entirely private. A streak at risk is a proven return lever; a streak *other
people can see* is an invite lever. Surface crew streaks on the daily screen
once crews exist, and let a streak milestone (7, 30, 100) generate a share card
of its own — those are natural, non-annoying moments to ask.

---

## 5. Measurement

You can't tune any of this without a funnel. The pieces exist —
`firebase.js` already stamps the stored `?ref=` onto every analytics event — but
nothing currently defines the numbers that matter.

**Define these four:**

1. **Invite rate** — `share_completed` ÷ `season_simulated`. *What share of
   finishers send anything?* (Fix §2.3 first or this is inflated.)
2. **Landing rate** — `referral_landing` ÷ invites sent. *Do the links get
   opened?* This is the number §2.1 moves.
3. **Activation rate** — `game_started` ÷ `referral_landing`. *Do arrivals play?*
   This is the number §2.2 and §3.2 move.
4. **k-factor** — new players activated per existing player. Below 1 invites are
   a retention feature; above 1 they're a growth engine. Worth knowing which
   one you have.

Two dimensions are missing and cheap to add: `ref` isn't broken out by *which*
share produced it (add the source distinction to `KNOWN` in `referral.js` —
it already normalises unknown values to `'other'`, so the guard rail is there),
and there's no event at all for the return leg of a rally. If §3.1 ships, add
`rematch_reply_sent` — the ratio of replies to challenges *is* the health of the
loop, in one number.

---

## 6. What to do first

Sequenced so each step makes the next one measurable.

**Week 1 — stop the leaks.** Fix `share_completed` (§2.3) so the baseline is
real, point daily shares at the generated pages (§2.1) and make those pages
start the challenge (§2.2). All three are small; together they fix attribution
*and* the group-chat preview, and nothing after this is legible without them.

**Week 2 — close the loop.** "Send it back" (§3.1) and names on challenges
(§3.2). This is where one-shot invites become rallies, and it's the highest
ratio of impact to effort on the list.

**Week 3 — widen the ask.** Invite chips at the Legend pick, the streak, the
championship, and the abandoned draft (§3.3). Now that the funnel is
instrumented you can tell which moments actually convert and drop the ones that
don't.

**Then — build a mode around it.** Async 1v1 (§4.1), and crews (§4.2) if the
one-to-one loop is rallying by then.

The ordering matters more than the individual ideas: **fixing the funnel first
means every later change is measurable, and closing the loop before widening the
ask means the extra invites have somewhere to go.**
