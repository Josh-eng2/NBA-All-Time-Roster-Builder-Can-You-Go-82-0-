# Acquisition kit

The shipped game remains static and dependency-free. These are prepared materials and measurement instructions, not a record of posts or advertising already placed. Check each community's current promotion rules before posting. No account access, paid placement or outbound messages are required to build the assets below.

## 1. Same-board invitations

Use **Copy Challenge Link** after a real Classic run. Caption: “I got [record]. You get my exact five boards. Who are you taking differently?” Attach the generated feed image for Discord or a group chat, and include the link in the message. Never claim the target record was played if the code was created by hand.

Each share action now creates an `invite_id` (`sid` in the URL). It travels through Daily content pages, native text shares and clipboard links. Outbound `share_attempted`, `share_completed`, `share_downloaded` and inbound `referral_landing` carry it; gameplay events also carry `run_id`. A downloaded image alone is not a delivered invitation. A native share resolving is not evidence that the message was sent.

## 2. Basketball communities

Prepare one discussion post for r/NBATalk and one franchise-specific comparison for r/chicagobulls or the corresponding team community. Format: five board screenshots, the actual picks, one disputed choice, and the exact-board link. Hook: “Would you take this team's second-best guard to keep a natural center slot?” Give readers the complete choice in the post; include a link only where community rules permit. Use Discord's designated basketball-game or self-promotion channel rather than unsolicited DMs.

Track distinct campaign values such as `nbatalk_board_01` and `bulls_board_01`. Add `&campaign=...` before the hash in a copied link. Treat small cohorts as directional; compare recipient season completion, not votes or impressions alone.

## 3. Shorts / TikTok capture sheet

Use **Story card** to export the existing 1080×1920 result format. Suggested 20-second video:

1. 0–2s: “Five boards. One chance to go 82–0.” Show the actual first board.
2. 2–8s: three quick picks; pause on the hard positional choice.
3. 8–13s: reveal the final five and chemistry label.
4. 13–17s: reveal the real record; keep a loss in the edit.
5. 17–20s: “Same boards in the link. Beat [record].” Hold the Story card.

Use a profile/description link where the platform supports it. Campaign values: `short_board_01` and `tiktok_board_01`. The sample [feed card](assets/example-feed.png) and [story card](assets/example-story.png) are exports from the browser test's real random run; its [record and challenge link](assets/example-run.json) travel with them. They are not promises of expected results. Generate fresh assets from a stronger or more interesting real draft before public use.

## 4. Search pages that lead into play

The generated inventory is 16 challenge pages, 30 franchise pages, seven era pages and the roster index. Daily links now enter the Daily route. Franchise pages honestly describe their random-franchise game destination; era links keep the era constraint. All content CTAs relay valid campaign and invite IDs after the DOM exists.

In Search Console, group the 16 challenge, 30 team and seven era URLs separately. Export impressions, clicks, CTR and average position every 28 days. In Analytics, compare `ref_source=dailypage`, `teampage`, and `era` by first draft and first completed season. Improve titles on pages with meaningful impressions and weak CTR before adding more pages. No search-volume or traffic claims are inferred from the number of pages.

## 5. NBA calendar playbook

Use event-relative scheduling, then confirm actual dates against the NBA's published calendar before scheduling a post:

- Opening week: “Could this era's stars beat a full 82-game season?” A modern-era board and one historical counterpart.
- Christmas games / rivalry nights: a same-board challenge featuring a franchise from the televised matchup; use an actual qualifying run rather than promising the random wheel will pick that franchise.
- All-Star weekend: an all-time lineup debate and a 20-second pick clip.
- Playoffs and Finals: “Great regular season. Can this five finish the job?” Show the playoff outcome too.
- Draft and offseason: compare an established veteran roster with a modern-era draft. Avoid implying an unlisted rookie is available.

Prepare two assets per window and retire variants that attract clicks without completed drafts. This document does not schedule or publish anything.

## 6. Portal distribution

Test CrazyGames and GameDistribution independently, including blocked SDKs, rewarded-ad cancellation and navigation after an ad. Unknown iframes no longer trigger the GameDistribution ad loader. Keep accounts absent inside portals, retain the portal's storage adapter, and provide feed/story art plus the manifest icons in the submission packet. Portal approval, ad consent and listing changes remain operator actions outside this patch.

Measure portal sessions separately from direct web traffic. SDK loading/gameplay callbacks are integration signals; ad completion is only counted when the platform confirms it. Never treat an ad request as a completed reward.

## 7. Conversion dashboard

Use exported Analytics events; no new backend is required. Register low-cardinality campaign/mode/version dimensions. Avoid registering each invite or run ID as a report dimension; use raw event export for those joins if available.

Weekly cohorts: first-touch source × campaign × platform × app version. Funnel: referral landing → game started → first player drafted → five drafted → season simulated → share attempted → share completed. Use `run_id` to avoid joining separate drafts. Keep downloads, clipboard success and native share success as separate methods. Compare anonymous recipient devices with the sender before attributing conversions; repeat opens by the sender are not acquisition.

Observed invite yield = distinct new recipient devices completing a season / distinct sender devices in the cohort. Decompose it into invitations per sender × recipients per invitation × recipient completion rate. This is an observed browser/device estimate, not a person-level viral coefficient: privacy controls, missing referrers and cross-device use leave gaps. Report sample size and missing-attribution share beside every rate.

Do not configure reminders, tracking services, portal listings or community posts as part of a code-only rollout. Nothing in this kit has been sent externally.
