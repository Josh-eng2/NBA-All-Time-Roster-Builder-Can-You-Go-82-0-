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
//   v17 mobile drafting screen: the Overall gauge joins Fans and Chemistry,
//       and the Restart bar is dropped. Changed: render.js, styles.css —
//       both precached, so without this bump a returning player keeps the
//       old pair of gauges and the old Restart bar.
//   v18 Levels + XP progression. New precached module:
//       js/logic/progression.js. Changed: events.js (awards XP once per
//       season and once per title), render.js (the results-screen XP card),
//       storage.js (key registry comment). Without the bump a returning
//       player's cached shell has no progression.js to import and the app
//       fails to boot.
//   v19 level rewards extended to 100. js/logic/progression.js changed (the
//       REWARDS table only — 30 new titles, leaderboard badges and Trophy
//       Room items at every fifth level from 15 to 100). It is precached, so
//       without the bump a returning player keeps the ten-reward table and
//       stops unlocking anything past level 10.
//   v20 header logo replaced with the approved 82-0-logo.png. Changed:
//       render.js (the one <img src>) and the precache entry below. Both are
//       precached, so without the bump a returning player keeps the old
//       roundel and 404s on a logo their cached shell has never seen.
//   v21 accounts foundation. New precached module: js/utils/auth.js (Firebase
//       Auth, email + password). Changed: js/utils/firebase.js, which now
//       exports SDK_BASE and getFirebaseApp() so auth.js attaches to the same
//       app and the same pinned SDK version instead of creating a second one.
//       Nothing imports auth.js yet, so there is no user-visible change. The
//       bump is still required: firebase.js is precached and changed, so
//       without it a returning player keeps the old copy and never receives
//       auth.js at all — leaving the cached shell a version behind on the
//       pair for whichever later change first imports them.
//   v22 accounts UI, shipped behind an off switch. New precached modules:
//       js/utils/cloudSave.js and js/ui/authModal.js. Changed: auth.js (the
//       ACCOUNTS_ENABLED flag, the not-framed gate, persistence choice and
//       account deletion), firebase.js (users/{uid} read/write), render.js
//       (one account pill per header), events.js (the action cases and the
//       auth subscription) and styles.css. ACCOUNTS_ENABLED is false, so
//       nothing about this is visible yet — but every one of those files is
//       precached and they import each other, so a returning player served a
//       mixed set would fail to boot on a missing export.
//   v23 privacy and FAQ copy corrected for optional accounts. Changed:
//       privacy.html (not precached) plus index.html and README.md, which
//       both told players there is no sign-up. index.html IS precached, and
//       HTML is served network-first, so an online visitor already gets the
//       new copy — but an offline/installed one would keep serving the old
//       FAQ answer from the precache. That answer is a claim about what data
//       the game collects, so a stale copy is exactly the one that must not
//       be left in place.
//   v24 the approved crest reaches the icons too. v20 put it in the menu
//       header but left every icon on the old roundel, so the favicon Google
//       Search shows, the installed-app icon and the share card still carried
//       the retired mark. Changed: favicon.ico, icons/icon-{192,512}.png and
//       icons/apple-touch-icon.png (all precached), og-image.png, and
//       render.js. favicon.svg is deleted: the crest is raster artwork and
//       Chromium will not decode an SVG that wraps a raster <image>, so that
//       file could only ever have served the retired mark or a blank icon.
//       render.js now points at logo-crest.png. The header was loading the
//       full 1.7 MB master (82-0-logo.png) to draw it 52 px tall, and that
//       master was precached, so every visitor paid for it on first load.
const CACHE_VERSION = '820-v24';
const PRECACHE = `precache-${CACHE_VERSION}`;
const RUNTIME  = `runtime-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.ico',
  './logo-crest.png',
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
  './js/ui/authModal.js',
  './js/ui/theme.js',
  './js/logic/state.js',
  './js/logic/draft.js',
  './js/logic/era.js',
  './js/logic/positions.js',
  './js/logic/chemistry.js',
  './js/logic/simulation.js',
  './js/logic/seasonTier.js',
  './js/logic/progression.js',
  './js/logic/challenge.js',
  './js/logic/modes.js',
  './js/logic/playoffs.js',
  './js/logic/aiDraft.js',
  './js/logic/dynastyDuel.js',
  './js/logic/rematch.js',
  './js/utils/storage.js',
  './js/utils/viewport.js',
  './js/utils/firebase.js',
  './js/utils/auth.js',
  './js/utils/cloudSave.js',
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
