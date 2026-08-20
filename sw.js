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
//   v13 playoff title odds retuned so the bracket is winnable: state.js gains
//       PLAYOFF_FIELD_SHIFT and simulation.js PLAYOFF_SERIES_K. Without the
//       bump a returning player keeps the old modules, where every roster at
//       2.00 strength or below wins the title 0% of the time.
const CACHE_VERSION = '820-v13';
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
