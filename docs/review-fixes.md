# Review fixes and rollout

This change addresses the requested critical findings, bugs except **B6**, code risks, test gaps and acquisition support from the review of commit `288061b`. It is based on main commit `c6712f3`, retaining the intervening fixes and optional Google/Apple/phone sign-in work. It adds no runtime package manager, backend or build requirement.

## Finding coverage

- **C1–C5:** device ownership survives failed deletion; per-account backups are verified before switching; interrupted adoption has a rollback journal; sign-in and upload use serialized, identity-checked Firestore transactions. Unclaimed devices must persist ownership before receiving private cloud data.
- **C6:** saved streaks are normalized and escaped before Statistics rendering.
- **C7:** rules restrict public fields, integer records totalling 82, server timestamps, known challenge IDs and date format. Reads exclude inconsistent scores and incorrect day/challenge/version combinations. The remaining honor-system limitation is explained below.
- **B1:** Daily boards are precomputed independently of choices and cosmetic RNG. Budget picks preserve a feasible unique-athlete completion. `boards-v2` separates the new competition cohort.
- **B2–B4, B32:** service-worker installation requires all critical shell files; optional media may fail. Updates wait for player acceptance, cache reads stay within one release, nested offline routes get a correctly based shell, and 5xx responses use available cached content. The portal SDK loads asynchronously with a bounded environment decision.
- **B5:** all Daily playoff outcomes return to the menu. **B6 is intentionally unchanged:** the existing mobile draft navigation CSS remains as requested.
- **B7–B8:** failed global saves retain retry; championship submission status reflects the payload actually sent.
- **B9–B12:** XP merges per-device earning counters over a shared legacy baseline; Daily aggregates derive from date-keyed first attempts; later duel losses break stale streaks; snapshot reads do not manufacture modification timestamps.
- **B13–B16:** auth listeners recover with the SDK, leaderboard queries page their complete eligible population, stale modal responses cannot replace another tab, and local list writers normalize nonarray JSON.
- **B17–B19, B34:** generated CTAs relay attribution after DOM construction, Daily links open Daily, direct first visits are recorded, and franchise CTA copy describes the unrestricted destination honestly.
- **B20–B24:** position optimization uses applied chemistry weights; Bully Ball is order-independent; player points reconcile with game scores; Nene/Nenê share an athlete identity; invalid/exhausted rematches are rejected without substituting random boards.
- **B25–B30:** Wire to Wire discloses both goals; Ball IQ hides overall/fit clues and uses neutral labels; manual placement uses buttons; modal focus includes asynchronously loaded rows; confetti honors reduced motion; announced cosmetic rewards have visible consumers.
- **B31, B33:** Windows asset paths are portable; save writes report durability and the game displays a storage-failure warning.
- **Q1–Q3:** CI checks cache/Daily version changes, rematch version-a tables are frozen with golden fixtures, and unsupported cloud schemas cannot be downgraded by this client or the updated rules.
- **Q4–Q6:** unknown embeds cannot authorize GameDistribution injection; privacy copy lists actual services and analytics omit free-text team labels; a repeatable calibration script replaces stale balance assumptions. Firestore setup comments point to the one complete rules file.
- **T1–T12:** expanded dependency-free regressions, local Firestore integration checks and browser smoke flows cover the reported failure classes. See `tests/README.md` for commands and limits.
- **A1–A7:** share IDs and run IDs support joined funnels; the generic preview sells the same-board challenge; real-run share assets, community/video formats, search inventory measurement, NBA event-relative campaigns and portal acceptance guidance are in `docs/growth/campaign-kit.md`. No posts, messages, advertisements or portal listings were published.

## Compatibility and remaining limits

Public scores remain **self-reported**. Firestore validates structure and relationships present in a submission; it cannot prove that the browser performed an honest draft or simulation. Exact challenge selection is validated on reads, not cryptographically enforced on public writes. Date format validation alone does not attest to when a run began. Existing fabricated but internally valid records are not automatically identifiable or removed. Strong competitive anti-cheat needs trusted execution outside this static architecture.

Schema 2 preserves legacy totals conservatively. Aggregate-only historical XP/Daily data cannot reveal which old devices earned independent progress versus copies of the same progress. Newly recorded XP components and Daily dates merge without that ambiguity. A failed durable handoff leaves its backup/journal on the device and blocks synchronization until recovery; browser storage being erased externally is not recoverable by local code.

The new Daily cohort excludes earlier unversioned boards from its ranking; stored historical documents remain untouched. Existing daily locks/streaks remain in place. Weekly/Daily reads now cover the whole matching population, so read cost grows with activity; assess production volume before expanding promotion.

Browser verification uses Chromium/Edge with blocked optional services, phone/desktop viewports and reduced motion. Physical iOS Safari, assistive-technology sessions, native share destinations and real portal/ad callbacks still require provider/device acceptance testing. Analytics/Search Console dashboards need operator access and actual traffic; the campaign kit does not claim measured growth.

## Rollout

1. Review and merge the feature PR through the normal repository process. The generated styles/pages and preview PNG are committed with their sources; service-worker version is `820-v35`.
2. Separately publish the complete `firestore.rules` file in the Firebase Console after reviewing the emulator results. **This patch does not publish rules.** Until that step, live server enforcement remains unchanged. The rules accept existing known unversioned Daily challenge IDs during the cache transition; schema downgrades are rejected once a document reaches version 2.
3. Returning players receive a visible update action after the critical shell is ready. Accepting it reloads controlled tabs; defer it until the current run is finished.
4. Verify sign-in and second-device recovery against the deployed app before widening account promotion. Monitor failures and leaderboard read volume. App Check, Remote Config, consent configuration and portal publication are separate operator-controlled settings.

Do not roll back to a schema-1-only client after schema 2 has been written; its uploads will be rejected by the downgrade guard. Preserve the schema-aware save logic in any rollback build.
