# What ads are worth at 60 players a day

A grounded answer to "how much can I make from ads on this game?" at current
scale, with the arithmetic shown so the numbers can be re-run when traffic
changes. File and line references throughout — the estimates start from what
the repo actually ships, not from generic publisher averages.

**Short answer: roughly $10–$45/month, midpoint ~$25 — and $0 of that is being
earned today.**

---

## 1. What ships today

| Surface | Where | Status on `canyougo820.com` |
| --- | --- | --- |
| **GameDistribution interstitial** | `js/utils/gamedistribution.js:22`, 5 call sites in `js/ui/events.js` | **Never loads.** Gated behind `if (GD_IN_IFRAME)` (`index.html:74`) |
| **GameDistribution rewarded** | `js/utils/gamedistribution.js:43`, `js/ui/events.js:838` | **Never loads.** Same gate; button hidden by `gdRewardedAvailable()` (`js/ui/render.js:1482`) |
| **CrazyGames midgame** | `js/utils/crazygames.js:82` | **Never fires.** SDK reports `'disabled'` off-portal, and `cgRequestMidgameAd()` isn't wired to any call site (`js/ui/render.js:3650`) |
| **Display / AdSense** | — | Not integrated anywhere |

So the honest baseline: **60 players a day on the site earn nothing.** Every ad
path in the codebase is portal-only. Whatever GD and CrazyGames pay comes from
*their* traffic through *their* embeds — it is not a function of the 60.

That gate was deliberate. The comment at `index.html:56` records the reason: GD
was filling real ads on the bare domain and a low-tier exchange creative
hijacked the tab — retitled it "Blocked" and forced a redirect — for visitors
arriving from Google. The gate is the fix. Section 5 is about what it costs to
undo it.

---

## 2. The arithmetic

60 players/day → **1,800 sessions/month** (~21,900/year).

The game is a single-page app: one pageview per session, however long the
session runs. Ad inventory therefore comes from *break points*, not from
pagination. The interstitial call sites already in `events.js` are the natural
ones — back-to-menu (`:380`, `:403`), play-again (`:404`), fresh draft (`:503`).

Per-session value, assuming every surface above were switched on:

| Surface | Impressions/session | eCPM | Value/session |
| --- | --- | --- | --- |
| Display (1 pageview) | 1.0 | $2–$6 | $0.002–$0.006 |
| Interstitial | 0.8–1.5 | $4–$12 | $0.003–$0.018 |
| Rewarded (5–10% of drafts) | 0.05–0.10 | $10–$20 | $0.0005–$0.002 |
| **Total** | | | **$0.006–$0.026** |

Interstitials land below 1-per-session because every network frequency-caps
them: five call sites is not five impressions, it's one impression and four
no-fills. Rewarded uptake is low by design — the button only renders once both
skip budgets are spent and only once per draft (`js/ui/events.js:831`).

**1,800 × $0.006–$0.026 = $11–$47/month.**

| Scenario | Assumption | Monthly | Annual |
| --- | --- | --- | --- |
| Conservative | Mixed international geo, thin fill | **~$10** | ~$120 |
| Mid | US-heavy sports traffic, normal fill | **~$25** | ~$300 |
| Optimistic | US-heavy, strong fill, good rewarded uptake | **~$45** | ~$550 |

Geo is the single biggest swing factor — US/CA/UK/AU traffic is worth 3–5× the
same session count from most other markets. An NBA game skews favourably here,
which is why the mid case is the fair planning number rather than the low one.

### The payout-threshold problem

AdSense pays at a **$100 minimum**. At ~$25/month that's a cheque every four
months; at the conservative $10, every ten. Most portal networks sit at $50–$100
with monthly NET-30/60 terms. At this scale the money is real but it arrives
slowly and in lumps, which matters more than the headline figure.

---

## 3. What scale changes the answer

Holding the mid case ($0.014/session) constant:

| Target | Sessions/month | Players/day |
| --- | --- | --- |
| $100/month | ~7,000 | **~235** |
| $500/month | ~36,000 | **~1,200** |
| $1,000/month | ~71,000 | **~2,350** |

And the ad-network tiers worth knowing, since they raise the *rate*, not just
the volume:

| Network | Requirement | Players/day needed |
| --- | --- | --- |
| AdSense / Ezoic | No minimum | Available now |
| Mediavine Journey | 10k sessions/mo | ~330 |
| Mediavine | 50k sessions/mo | ~1,650 |
| Raptive | 100k pageviews/mo | ~3,300 |

Crossing into Mediavine roughly doubles session RPM on top of the traffic gain,
so the curve bends upward — the jump from 60 to 1,650 players/day is worth far
more than the 27× traffic multiple suggests.

---

## 4. Where the money actually is at this scale

Three observations that follow from the numbers rather than from preference:

**The portals out-earn the site.** GD and CrazyGames bring their own audience.
A game that gets picked up and featured on CrazyGames can see more sessions in a
week than 60/day produces in a year, and the ad plumbing for both is already
written and tested. Getting placement is worth more than optimizing the
$25/month.

**Traffic work beats monetization work below ~500/day.** Every hour spent on ad
setup at 60 players/day is competing against `docs/growth/invite-a-friend.md`,
where the same hour compounds. Ads are a multiplier on an audience; there isn't
one yet.

**Non-ad revenue scales differently.** 1,800 monthly sessions won't support ads,
but it can support a small number of people paying for something. That's not a
recommendation to build a store — it's a note that the revenue-per-session
ceiling for ads at this scale is about 2.6¢, and almost anything else has a
higher one.

---

## 5. If you turn ads on anyway

Entirely reasonable — $25/month covers the domain and then some. What it costs:

1. **The hijack risk returns.** `index.html:56` documents what happened last
   time. Turning the gate off re-exposes organic Google traffic to the same ad
   exchange. If you do it, keep `js/utils/pageIntegrity.js` in place — it exists
   for exactly this — and prefer a network with tighter creative review over
   whichever pays the highest nominal eCPM.
2. **The privacy policy needs an advertising section.** `privacy.html` currently
   documents account data and cloud saves only, with no mention of advertising
   cookies or third-party ad partners. AdSense and most networks require that
   disclosure, and EU traffic requires a consent flow (Google demands a
   certified CMP). This is a hard blocker, not a nicety.
3. **`ads.txt` is missing.** Programmatic display revenue on your own domain
   needs one at the root; without it most demand partners won't bid at all.
4. **Interstitials cost returning players.** The five `gdShowAd()` sites fire on
   back-to-menu and play-again — precisely the actions the most engaged players
   take most often. The players generating the most impressions are the ones the
   interstitial annoys most.
5. **Bump `CACHE_VERSION` in `sw.js`.** Ad tags added to `index.html` won't reach
   returning players otherwise — the service worker serves it cache-first.

The lowest-risk version, if you want revenue on the board without re-opening the
hijack vector: leave the SPA gated as it is and put a single display unit on the
53 generated SEO pages (`teams/`, `eras/`, `daily/`). They're static HTML with no
game state to corrupt, they're what organic search lands on, and the downside of
a bad creative there is a bad pageview rather than a hijacked game session.
