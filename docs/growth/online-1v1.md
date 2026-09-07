# Online 1v1 — a live snake draft against a friend

Design plan for letting a player send a link and draft **against a friend in
real time**: both connected at once, alternating picks down the existing snake
order, each watching the other's board fill in.

This is the *live* version of §4.1 in [`invite-a-friend.md`](./invite-a-friend.md),
not the async one that document sketched. The difference matters: an async
"here's my board, beat it" link needs no backend, and a live shared draft
needs one. That trade is the subject of §3 below.

Every file reference is to the code as it stands today.

---

## 1. What already ships

The draft engine already does almost all of this. What it doesn't do is span
two devices.

| Piece | Where | State |
| --- | --- | --- |
| **Snake draft order** | `SNAKE_ORDER` (`js/logic/state.js:37`) — 1-2-2-1-1-2-2-1-1-2 | Done |
| **Dual-roster state machine** | `startGame1v1()` (`js/logic/state.js:404`) | Done |
| **Shared draft pool** | `usedPlayerIds` / `draftedPlayerNames` / `usedDecades` on `S` | Done |
| **The whole draft screen** | `renderDrafting1v1()` (`js/ui/render.js:1169`) — on-the-clock banner, snake dots, both rosters side by side, live recent-picks log | Done |
| **Best-of-7 head-to-head** | `simulateHeadToHeadSeries()` (`js/logic/simulation.js:618`) | Done |
| **Series preview / reveal / recap screens** | `seriesLabels()` (`js/logic/modes.js`) + `render.js` | Done |
| **Forced (replayed) spins** | `forcedSpin()` (`js/ui/events.js:709`) | Done — built for rematch links, reusable |
| **Hash deep-link routing** | `HASH_ROUTE_MAP` (`js/ui/events.js:151`) | Done — needs one new route |
| **Firestore + App Check + Remote Config** | `js/utils/firebase.js`, `firestore.rules` | Done |

`renderDrafting1v1()` is worth calling out specifically. It is *already* the
screen this feature needs — it shows both rosters filling simultaneously, whose
turn it is, and the last five picks. Nothing about it assumes one device. The
only additions are a read-only state for the player who isn't on the clock and
a connection indicator.

**So the feature is not "build an online draft mode". It is "replicate one
state machine across two browsers."** Scoping it any wider than that is the
main way this goes wrong.

What is genuinely missing:

- Anonymous auth. `js/utils/auth.js` implements email + password only.
- A real-time transport. `js/utils/firebase.js:182-186` destructures
  `getDocs`/`getDoc`/`setDoc`/`addDoc` and friends — no `onSnapshot`.
- Any notion of two clients sharing a game.

---

## 2. The sync model: an append-only event log

### 2.1 Why the draft can't be pre-rolled

The obvious cheap design — roll all ten boards at match creation, ship them in
the link, let both clients replay them — does not work here, and the reason is
worth writing down because it is the same reason `rematch.js` encodes literal
spin results instead of an RNG seed.

`spinResult()` (`js/logic/draft.js:325`) draws from the *live* pool. Which
teams and decades are eligible depends on `availableDecades()`
(`js/logic/draft.js:17`), on which players are already gone, and on the pity /
rigging rules in `doSpin()`. Board 4 is not knowable until pick 3 has landed.
A shared-pool snake draft is inherently sequential.

So the client **on the clock is authoritative for its own turn**, and every
wheel and pick event is appended to a shared log.

### 2.2 The log

```js
// matches/{code}/events/{seq} — one immutable document per event
{ seq: 0, by: 'host',  t: 'spin',      team: 'Bulls',  decade: '1990s' }
{ seq: 1, by: 'host',  t: 'pick',      id: 'jordan_96', pos: 'SG' }
{ seq: 2, by: 'guest', t: 'spin',      team: 'Celtics', decade: '1980s' }
{ seq: 3, by: 'guest', t: 'skip-team', team: 'Lakers' }   // re-roll, same round
{ seq: 4, by: 'guest', t: 'pick',      id: 'magic_87', pos: 'PG' }
...
```

Local state is a pure function of the log:

```js
S = events.reduce(applyEvent, startGame1v1(matchContext));
```

Three properties fall out of this, and they are the reason to prefer it over
syncing `S` itself:

1. **Whose turn it is is never transmitted.** It derives from
   `SNAKE_ORDER[pickCount]`, so the two clients cannot disagree about it.
2. **A refresh is free.** Re-read the log, replay it, you're back in the draft.
3. **The sync logic contains no Firebase.** `applyEvent` is a pure reducer that
   unit-tests against the same `S` the browser uses — the pattern
   `tests/state.test.mjs` and `tests/draft.test.mjs` already follow.

### 2.3 Events as documents, not as an array field

Each event is its **own document** under `matches/{code}/events/{seq}`, not an
entry in an array field on the match document. Three reasons, in order of
importance:

- **Immutability is enforceable.** `allow update, delete: if false` on the
  subcollection makes a written event permanent. Firestore rules cannot slice
  an array, so "the log grew by exactly one entry and the earlier entries are
  unchanged" is *not* expressible as a rule on an array field. With one doc per
  event it is free.
- **It matches this repo's existing posture.** Both public collections
  (`leaderboard`, `dailyLeaderboard`) are already create-only, never-update, for
  exactly this reason. Introducing the project's first mutable public collection
  to hold a game log would be a step backwards.
- **Duplicate appends fail cleanly.** The doc id *is* the sequence number, so a
  double-tap or a retry after a flaky write collides with an existing document
  and is rejected, rather than corrupting the log with a duplicate turn.

---

## 3. Architecture

| Concern | Decision | Why |
| --- | --- | --- |
| Transport | Firestore + `onSnapshot` | Already configured, App Check already wired, no new vendor. |
| Identity | **Anonymous auth** (new) | Rules need `request.auth.uid` to bind a seat. A client-held secret cannot be verified by a rule. |
| Match code | 6 chars from a 32-char alphabet, no `0 O 1 I L` | ~1e9 space; readable aloud; `create` fails naturally on collision. |
| Series result | Computed **independently on both clients** | See §5. |
| Kill switch | `online_1v1_enabled` in `DEFAULTS` (`js/utils/remoteConfig.js:78`) | Mirrors `accounts_enabled` — turn the mode off without a deploy or a `CACHE_VERSION` roll. |

### 3.1 On accepting a backend

This project has been deliberately backend-light, and that constraint has been
load-bearing for its architecture. It is worth being explicit that a live shared
draft breaks it, and that no amount of cleverness avoids that: two people
drafting from one pool at the same time need shared mutable state with a
referee. A link cannot be one.

What softens it:

- Firestore is **already a dependency** — leaderboards, cloud saves, analytics,
  App Check and Remote Config all run on it. This adds a collection, not a
  platform.
- The mode is **fully isolated**. Nothing else in the game reads or writes
  `matches/`. If it is switched off via Remote Config, or Firebase is blocked,
  every other mode is untouched (§8.6).

### 3.2 The invite link

```
https://canyougo820.com/vs/?m=XK7Q2M     →  ../?ref=vs#/vs?m=XK7Q2M
```

The static `vs/index.html` hop exists for one reason: **the preview is the
invite.** `invite-a-friend.md` §2.1 documents this at length — a payload in the
hash is invisible to every unfurler, so a hash-only link previews in a group
chat as the same generic homepage card as everything else. A real path with its
own `og:title` ("Someone challenged you to a 1v1 draft") previews as a
challenge. The page is a five-line forwarder that preserves `?m=` and stamps
`?ref=vs`, the same shape the generated `daily/<slug>.html` pages already use.

Add `'vs'` to `KNOWN` in `js/utils/referral.js:33` so the attribution isn't
normalised to `'other'`.

---

## 4. Data model and rules

```
matches/{code}
  v            1
  status       'waiting' | 'drafting' | 'complete' | 'abandoned'
  era          '1990s' | 'all'          // shared, set by the host
  seq          next event sequence number
  turnUid      whose turn it is
  host   { uid, name, seen }            // seen = heartbeat ms
  guest  { uid, name, seen } | null
  createdAt    serverTimestamp
  expiresAt    ms — Firestore TTL policy deletes the match

matches/{code}/events/{seq}
  seq, by, t, ...payload                // immutable, see §2.2
```

Rules sketch (the real thing belongs in `firestore.rules` alongside the
existing blocks, with the same field-by-field validation the leaderboard rules
use):

```
match /matches/{code} {
  allow read: if request.auth != null;
  allow create: if request.auth != null
                && request.resource.data.host.uid == request.auth.uid
                && request.resource.data.status == 'waiting'
                && request.resource.data.guest == null;
  // Two legal updates: the guest claims the empty seat once, and a seated
  // player advances the turn / stamps their own heartbeat.
  allow update: if request.auth != null && (
      (resource.data.guest == null
       && request.resource.data.guest.uid == request.auth.uid)
   || (request.auth.uid in [resource.data.host.uid, resource.data.guest.uid]
       && request.resource.data.seq == resource.data.seq + 1)
  );
  allow delete: if false;

  match /events/{seq} {
    allow read:   if request.auth != null;
    allow create: if request.auth != null
                  && request.auth.uid == get(/databases/$(database)/documents/matches/$(code)).data.turnUid;
    allow update, delete: if false;      // the log is history
  }
}
```

The header doc carries a TTL field so abandoned lobbies are collected by
Firestore's own TTL policy rather than accumulating forever. This is the one
piece of console configuration the feature needs beyond the rules themselves.

---

## 5. Deterministic simulation

Both clients must show the **same Game 7**. Two friends watching different
scores on the same series is the kind of bug that ends the mode's credibility
in one session.

`simulateHeadToHeadSeries()` currently calls bare `Math.random()` at five
sites: the 82-game loop (`simulation.js:512`), `decorateSeasonGames`
(`:565`, `:568`, plus `pickCosmetic` for opponent names),
`gaussian()` (`:325-326`), and `generateGameScore()` (`:598-605`).

**Thread an optional `rng` parameter through those, defaulting to
`Math.random`.** Every existing caller is then byte-for-byte unchanged by
construction, and `tests/simulation.test.mjs` proves it. Seed it from the match
code; `mulberry32` already exists at `js/logic/state.js:180`.

One subtlety to comment at the call site: `decorateSeasonGames` deliberately
uses `pickCosmetic` (never the seeded stream) so that cosmetic draws cannot
desync the Daily Challenge board. That rule is about the *daily* generator
specifically. A match-local rng is a different stream and does not violate it —
but the reason needs writing down, or the next reader will "fix" it back.

### 5.1 Why not just have one client compute and write the result

It is cheaper and needs no refactor: the guest simulates, writes the result to
the match doc, the host renders it. It was rejected for one specific failure:
**if the guest closes the tab right after their fifth pick, the host has a
complete draft and no way to ever see a result.** There is no server to fall
back on. Seeding removes that hole, and removes the question of trusting a
number another client asserted.

---

## 6. Screen flow

```
HOST                                    GUEST
────                                    ─────
"Play a friend"
  → writes matches/{code}
  → lobby: big code + Share link
  → status: waiting                     opens /vs/?m=XK7Q2M
                                          → "Josh challenged you"
                                          → claims guest seat
  ◄──────── status: drafting ─────────►

  ┌─────────── existing renderDrafting1v1 on both devices ──────────┐
  │  on the clock: spin → pick → append events                       │
  │  off the clock: read-only board, "Josh is on the clock", picks   │
  │                 appearing live in the recent-picks log           │
  └──────────────────────────────────────────────────────────────────┘

  ten picks land → both clients run the seeded sim independently
  → identical best-of-7, revealed game by game on both screens
  → recap + Rematch (new code, seats swapped)
```

The middle box is the part that already exists.

---

## 7. Work breakdown

Phased so each lands independently and nothing is a big-bang merge.

### Phase 0 — foundations (no user-visible change)

- `js/logic/simulation.js` — injectable rng (§5), plus a test pinning
  byte-identical output for a fixed seed and confirming unseeded runs still vary.
- `js/utils/auth.js` — `signInAnonymously`, guarded, structured-result, obeying
  the five design rules stated in that module's header.
- `js/utils/firebase.js` — add `onSnapshot`, `updateDoc`, `increment` to the
  destructured SDK list at `:182-186`.

Mergeable on its own. Phase 0 is also the only phase that touches an existing
load-bearing module, so it is worth landing and sitting on before anything else.

### Phase 1 — match logic and transport

- **New** `js/logic/match.js` — code generation, event schema, `applyEvent`,
  `seatOnClock`, validation. **No Firebase import.** This is the file the tests
  care about.
- **New** `js/utils/matchNet.js` — create / join / subscribe / append /
  heartbeat / leave. Every call guarded by `isFirebaseConfigured()` and wrapped
  in try/catch, same as `js/utils/firebase.js`.
- `firestore.rules` — the `matches/{code}` block + a console TTL policy.
- **New** `tests/match.test.mjs` — log replay reproduces a known draft, snake
  order holds, out-of-order and duplicate `seq` are rejected, code format.

### Phase 2 — mode and UI

- `js/logic/modes.js` — `'1v1-online'` in `MODE_CONFIG` (`draft: 'dual'`,
  `postDraft: 'series'`), `isDualDraft()`, and `seriesLabels()` returning the
  two players' real names instead of "Player 1 / Player 2".
- `js/logic/state.js` — `startGame1v1()` takes match context (code, seat,
  opponent name).
- `js/ui/events.js` — the `#/vs` route; lobby actions; a gate so only the
  on-the-clock client's `doSpin()` / `doSkipTeam()` (`:804`) /
  `doSkipDecade()` (`:812`) / `placePlayer()` append events; subscribe and
  unsubscribe lifecycle.
- `js/ui/render.js` — lobby, join, waiting-for-opponent, and the read-only
  variant of `renderDrafting1v1`.
- `index.html` — entry point. Best placement is a sheet on the existing 1v1
  tile: **Same device** / **Online**, so the mode is discovered by people
  already looking for a friend to play.

### Phase 3 — polish

- `vs/index.html` + `'vs'` in `referral.js` `KNOWN`.
- Pick clock and auto-pick; disconnect handling (§8.4).
- Analytics: `online_match_created`, `online_match_joined`,
  `online_match_completed`, `online_match_abandoned`. The ratio of created to
  joined is the health of the invite; joined to completed is the health of the
  mode.
- `online_1v1_enabled` in Remote Config `DEFAULTS`.
- `sw.js` — bump `CACHE_VERSION` (`:224`, currently `820-v32`) and add the new
  modules to `PRECACHE_URLS`. Non-optional: without it a returning player gets
  an `events.js` with no `#/vs` route and the invite link dead-ends.

---

## 8. Risks and open decisions

### 8.1 Anonymous auth vs. cloud save — the sharpest edge

`requestSync()` (`js/utils/cloudSave.js:953`) mirrors local progress to
`users/{uid}` whenever something meaningful changes, and `syncProgress()` in
`events.js` is called from the dual-draft completion path *specifically*
(`events.js:923`, with a comment explaining why). An anonymous uid reaching
that path would write a junk user document per online match, and worse, could
entangle a signed-in player's progress with a throwaway session.

**This needs an explicit guard before phase 0 ships**, plus a decision on what
happens when an anonymous player later signs in with an email. The conservative
answer — anonymous sessions never sync, ever — is almost certainly right, and
it should be enforced in `cloudSave.js` rather than remembered at each call site.

### 8.2 Turn authority is only partly enforceable

The `get()` on the parent doc in the events rule enforces "only the player whose
turn it is may append", which is the important one. What rules *cannot* check is
the content: the spinning client picks its own board, so a modified client could
rig its own wheel or claim a player it shouldn't have.

That is acceptable and should be documented in the module header rather than
engineered around. This is a game between two friends who chose to play each
other; the leaderboards it can reach are none. The line worth holding is that
online 1v1 results must not write to any global board — which is already true,
since `1v1` doesn't submit scores today.

### 8.3 Cost

Roughly per match: 1 header create + 1 join update + ~25 event creates + ~15
heartbeat updates ≈ **55 writes**; each client reads each event and each header
change once ≈ **100 reads**. Against the Firestore free tier (20k writes,
50k reads per day) that is **write-bound at roughly 350 matches a day** before
the mode costs anything. Worth knowing the number before launch, not after.

Heartbeats are the cheapest thing to tune if that ceiling gets close — they
only need to run during `drafting`, and a pick write is itself a heartbeat.

### 8.4 Disconnects — **open decision**

Firestore has no native presence, so this is a `seen` timestamp written every
~20s and a >45s staleness threshold. What to *do* about it is a product call
with three defensible answers:

1. **Abandon** — match over, no result. Simplest, most honest.
2. **Claim the win** — the remaining player takes it. Invites rage-quit-proofing
   but also invites a bad-connection player losing unfairly.
3. **AI takes over** — `chooseAiPick()` (`js/logic/aiDraft.js:73`) already
   drafts a competent roster, and GM vs AI already runs it mid-draft. The draft
   finishes and there's a real series at the end.

(3) is the most fun and reuses code that exists; (1) is the least surprising.
Needs deciding before phase 3.

### 8.5 Coaches — **open decision**

Local 1v1 deliberately has none: `doStartGame()` (`js/ui/events.js:543`) sets
`p1Coach = p2Coach = null` and launches straight into the draft, and `doSpin()`
skips the coach lock for `'1v1'` entirely.

Online is a better moment for per-player coach identity — it is a real
difference between the two teams and a natural thing to show next to a name.
But it
adds a lobby step before the draft and a synced field. Recommend keeping it out
of v1 and revisiting once the mode has players.

### 8.6 Degradation

Roughly 15% of clients block `gstatic.com`, and every Firebase call in this
project is written to degrade silently for exactly that reason. This mode
cannot degrade silently — it has nothing to fall back to. It must instead
degrade *loudly and usefully*: "Online play isn't available right now — play
1v1 on one device instead", with a button that starts local 1v1. The same
message covers a Remote Config kill switch and a Firestore outage.

---

## 9. What this does not do

Worth stating so it isn't assumed:

- **No matchmaking.** You play someone you sent a link to. A public queue is a
  different feature with a different moderation surface.
- **No accounts required.** Anonymous auth means no signup wall in front of the
  invite — which is the whole point of a link.
- **No global online leaderboard.** See §8.2: client-authoritative spins mean
  these results should never reach a public board.
- **No spectating, chat, or reconnect-into-someone-else's-match.**

---

## 10. Sequencing

Phase 0 first, and let it sit — it is the only work that touches a module the
whole game depends on. Phases 1 and 2 are the feature. Phase 3 is what makes it
survivable on a real network.

The single decision that most changes the shape of the build is §8.1: settle
how anonymous sessions and cloud saves coexist before writing the auth code,
not after.
