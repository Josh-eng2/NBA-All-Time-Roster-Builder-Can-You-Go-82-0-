/**
 * Service worker — makes Can You Go 82-0? installable as a PWA and keeps
 * core playable assets available offline after the first visit.
 *
 * Strategy:
 *   - Precache the app shell + local static assets on install
 *   - Cache-first for same-origin static files (CSS/JS/icons/SVG)
 *   - Network-first for HTML navigations (so deploys show up quickly)
 *   - Leave third-party CDNs (Firebase, fonts, CrazyGames, etc.) alone
 *
 * Bump CACHE_VERSION when shipping asset changes so old caches are dropped.
 */
// The rule, which this file has now proved four times: any change to a file in
// PRECACHE_URLS needs this version bumped in the same commit. Static assets are
// served cache-first below, so without the bump a returning visitor keeps the
// old copy indefinitely while network-first HTML hands them the new index —
// a mix of old modules and new markup, which behaves worse than either alone.
//
//   v2  desktop redesign: css/desktop.css new, styles.css + render.js changed
//   v3  responsive system: css/responsive.css + js/utils/viewport.js new
//   v4  laptop-height draft tier: css/desktop.css changed again
//   v5  share/rematch work: js/logic/rematch.js, js/utils/referral.js and
//       js/utils/install.js are new, and events.js/render.js/shareCard.js
//       changed — without it, a shared rematch link opens on a build whose
//       events.js has no #/rematch route.
//   v6  header pill alignment, pre-spin draft layout, legends placement:
//       desktop.css, styles.css, responsive.css and render.js all changed.
//   v7  footer scoped to the menu, icon glyphs centred, results columns
//       levelled: desktop.css, styles.css and render.js changed.
//   v8  popularity data regenerated against the current NAMED table:
//       js/data/players.js changed. Without it a returning user keeps the
//       stale precached DB, where every roster sits under POP_FLOOR and the
//       fans mechanics stay inert.
//   v9  fans gauge constant de-duplicated into utils/storage.js (ceiling
//       stays 500): render.js and utils/storage.js changed.
//   v10 popularity ceiling raised 140 -> 350 (POPULARITY_SCALE 0.4 -> 1.0 in
//       add_popularity.js, NAMED's own scale): js/data/players.js changed.
//       This rescales every player, not just the top — see the commit.
//   v11 fans gauge ceiling 500 -> 750 (popularity data now tops out at 350,
//       not 140 — 500 was pinning at the median for star-chasing rosters):
//       utils/storage.js changed.
//   v12 audit pass. Changed precached files: firebase.js (clamps
//       avgPopularity/fansM to the deployed Firestore rule ranges — global
//       submissions were being rejected server-side), chemistry.js + render.js
//       (the live draft chemistry gauge now scores the same optimized lineup
//       the season simulation uses), storage.js + render.js (fans display),
//       shareCard.js (Win% now matches the record), crazygames.js (storage
//       fallbacks), styles.css (trophy card below 1024px, header pill
//       ellipsis, roster fit colours). js/utils/pageIntegrity.js is also new
//       to the precache list below.
//   v13 audit pass. New precached module: js/ui/theme.js (the single theme /
//       tier-colour ramp that ui/render.js and utils/storage.js had been
//       keeping hand-copied, drifting, light-only duplicates of). Changed
//       precached files: challenge.js + draft.js (a fans-budget Daily run
//       could be drafted into a state with no legal pick left — the pick
//       lookahead now judges against what is actually still draftable),
//       render.js, storage.js, events.js, shareCard.js, aiDraft.js,
//       simulation.js and css/tailwind.css (regenerated — the committed build
//       was missing `w-7`/`grid-cols-1`). firebase.js matters most here: it
//       loaded firebase-analytics.js as a REQUIRED module, so an ad blocker
//       on that one file took the whole leaderboard down. A returning player
//       kept on the old precached copy keeps that bug, so this bump is what
//       actually ships the fix.
//   v14 loading spinner. `@keyframes _spin` lived in an inline <style> inside
//       #loading-overlay, which js/data/players.js removes once the database
//       is in — so the keyframes were deleted at boot and the leaderboard
//       modals' spinners could never turn. It now lives in css/styles.css as
//       .app-spinner, shared by both call sites, and is exempt from
//       css/responsive.css's prefers-reduced-motion freeze (a busy indicator
//       is status, not decoration). Changed: index.html, css/styles.css,
//       css/responsive.css, js/utils/storage.js.
//   v15 global/daily leaderboard submissions were still failing after v13's
//       fix (which only covered one blocked-analytics-module case). Root
//       cause: Firestore's default web transport streams over a long-lived
//       HTTP/2 connection, which a fair number of restrictive networks and
//       proxies interfere with — silently hanging or resetting the write
//       instead of erroring cleanly. getDb() now opens Firestore via
//       initializeFirestore(app, { experimentalAutoDetectLongPolling: true }),
//       Firebase's own documented fix, falling back to plain getFirestore()
//       if the app was already initialized elsewhere. Submission failures also
//       now surface the underlying Firestore error code instead of one bare
//       "check your connection" for every cause. Changed: firebase.js only.
//   v16 the deployed Firestore rules' avgPopularity/fansM ceilings were
//       widened (100/50 -> 1000/2200) to actually fit the current data
//       range, but firebase.js's own clamp was still capping submissions at
//       the old, superseded 100/50 — quietly throwing away real precision
//       the rules would have accepted. clampWireNumber() calls and the
//       in-file setup-instructions comment now mirror the wider, currently-
//       deployed bounds. This does not fix "global submit failed" by
//       itself — that also requires removing the rules' clock-sensitive
//       `timestampMs <= request.time.toMillis() + 60000` check, which is
//       server-side config outside this repo. Changed: firebase.js only.
//   v17 QA pass. Two things this bump has to ship, on top of the usual rule.
//
//       First, the DEBT: v16 was never bumped for the four commits that landed
//       after it, so index.html (network-first) was already being served new
//       while render.js, events.js, simulation.js and styles.css (cache-first)
//       stayed old — a mixed build. The commit stranded that way was "Give the
//       Daily an exit, and make Dynasty Duel winnable", so every returning
//       player still had an unwinnable Dynasty Duel and a Daily with no exit.
//       That is the fifth time this file's own rule has been proved; the list
//       above is now five entries long for a reason.
//
//       Second, this pass. Changed precached files: draft.js (the wheel now
//       only lands on boards the drafter can legally pick from — the pity timer
//       and a nearly-spent fans budget between them could pin it to boards
//       where every player was barred, and a Boos Only run soft-locked for
//       ~11% of players, deterministically, since the Daily board is seeded);
//       simulation.js (the popularity multiplier is clamped again now the data
//       ceiling is 350, and the fans formula is exported instead of copied);
//       aiDraft.js (same clamp — the AI GM was drafting Rodman over Kareem);
//       challenge.js (every daily gate re-measured against what the draft can
//       actually produce); storage.js + theme.js + render.js (fans gauge
//       rescaled, tier ladder de-duplicated, one forgiven miss per streak);
//       firebase.js (starter names are packed, not sliced, so a long roster
//       stops losing its fifth player on the wire); state.js (rematch context
//       no longer survives into other modes); players.js (three inert traits
//       normalised away); index.html + pageIntegrity.js (the real <title> now
//       precedes the title guard, so a third-party SDK can no longer get its
//       own title adopted as the baseline and enforced).
//   v18 self-review of the v17 pass — five defects in the fixes themselves.
//       Changed precached files: firebase.js + events.js (the starter-name
//       packing added in v17 was defeated by its own callers, which sliced the
//       joined list to 100 chars before the packer saw it, so the fifth name of
//       a long roster still arrived cut in half; buildDailyDoc was never packed
//       at all); storage.js (results can arrive out of order when two tabs
//       straddle UTC midnight — recording the older run reset a live streak to
//       1, rolled lastPassDate backwards, and rolled the play lock back, which
//       handed the player a second attempt at the newer day; plus stored dates
//       are now validated as real calendar days, since a shape-valid
//       impossibility like "9999-99-99" sorted after every real date and froze
//       the chain forever); draft.js (spinResult's new legality preference was
//       overriding an explicit fixedTeam/fixedDecade pin — a wrong board rather
//       than a degraded one).
//
//       Bumped separately from v17 rather than folded into it: v17 is already
//       committed, and if it reached anyone's cache before this landed, reusing
//       the number would ship exactly the mixed build this file exists to
//       prevent. A redundant log entry is the cheaper mistake.
//   v19 the Overall read-out reaches the phone. Changed precached files:
//       render.js (the roster slot's OVR badge and the third live gauge were
//       both desktop-only, so a phone could not see the number the sim weights
//       most directly — both now render at every width, and the Overall gauge
//       locks in Ball IQ because it is the MEAN of `overall` and with one
//       player drafted it reads that player's exact rating); styles.css (the
//       phone/tablet baseline for the badge, and viewport-scaled sizing for
//       the three-up gauge row — three 96px arcs overflow a 320px screen);
//       desktop.css (the badge wrapper dissolves with display:contents so the
//       desktop stack is unchanged); theme.js (the light GOAT tint moved
//       #d97706 -> #b45309: that ramp is painted at 9-13px in six places and
//       #d97706 measures 3.19:1 on the white card, which clears the 3:1
//       large-text floor the 20px desktop slot relied on but fails the 4.5:1
//       small-text floor every other call site needs).
const CACHE_VERSION = '820-v19';
const PRECACHE = `precache-${CACHE_VERSION}`;
const RUNTIME  = `runtime-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './logo-badge.svg',
  './css/tailwind.css',
  './css/styles.css',
  './css/desktop.css',
  './css/responsive.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  // Loaded by index.html as a classic script before any third-party SDK, so
  // it belongs in the shell — without it a first-run-then-offline visit has
  // no page-integrity guard at all.
  './js/utils/pageIntegrity.js',
  // App shell modules — enough for Classic play offline after install.
  './js/main.js',
  './js/data/players.js',
  './js/ui/events.js',
  './js/ui/render.js',
  './js/ui/shareCard.js',
  './js/ui/theme.js',
  './js/logic/state.js',
  './js/logic/draft.js',
  './js/logic/era.js',
  './js/logic/positions.js',
  './js/logic/chemistry.js',
  './js/logic/simulation.js',
  './js/logic/seasonTier.js',
  './js/logic/challenge.js',
  './js/logic/modes.js',
  './js/logic/playoffs.js',
  './js/logic/aiDraft.js',
  './js/logic/dynastyDuel.js',
  './js/logic/rematch.js',
  './js/utils/storage.js',
  './js/utils/viewport.js',
  './js/utils/firebase.js',
  './js/utils/crazygames.js',
  './js/utils/gamedistribution.js',
  './js/utils/referral.js',
  './js/utils/install.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== PRECACHE && key !== RUNTIME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

function isStaticAsset(url) {
  return /\.(?:css|js|mjs|svg|png|jpg|jpeg|webp|woff2?|webmanifest)$/i.test(url.pathname);
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch (_) { return; }

  // Never intercept cross-origin requests (Firebase, fonts, portal SDKs).
  if (!isSameOrigin(url)) return;

  if (isNavigationRequest(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(RUNTIME);
    cache.put(request, fresh.clone());
    return fresh;
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const shell = await caches.match('./index.html');
    if (shell) return shell;
    throw new Error('Offline and no cached shell');
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  // Only cache successful same-origin responses.
  if (fresh && fresh.ok) {
    const cache = await caches.open(RUNTIME);
    cache.put(request, fresh.clone());
  }
  return fresh;
}
