# js/vendor/

Third-party code committed into the repo rather than loaded from a CDN at
runtime — the same call this project already made for Tailwind (`css/tailwind.css`
is a committed static build, not `cdn.tailwindcss.com`).

## Why vendored, not a CDN `<script>`

`js/ui/render.js` used to inject canvas-confetti from `cdn.jsdelivr.net` with no
Subresource Integrity, which meant a compromised CDN path could execute
arbitrary JavaScript on `canyougo820.com` — the origin that holds the Firebase
auth session, every `nba820_*` key and the cloud-save write path. Vendoring
closes that outright, and beats adding SRI on three counts:

* nothing third-party executes on the page at all, so there is no hash to keep
  in sync and no CDN to trust;
* the celebration works offline, like the rest of the app after a first visit
  (the service worker caches it on first use — see `sw.js`);
* it costs nothing at page load, because `withConfetti()` still injects the
  script lazily, only when a celebration actually fires.

## canvas-confetti 1.6.0

`confetti.browser.js` is `dist/confetti.browser.js` taken verbatim from the
npm tarball `canvas-confetti-1.6.0.tgz`, whose SHA-512 was checked against the
`dist.integrity` field the npm registry publishes for that version:

```
sha512-ej+w/m8Jzpv9Z7W7uJZer14Ke8P2ogsjg4ZMGIuq4iqUOqY2Jq8BNW42iGmNfRwREaaEfFIczLuZZiEVSYNHAA==
```

Do not hand-edit it. To update, download the tarball for the new version, verify
its hash against the registry the same way, and replace both this file and the
version recorded here.

Licensed ISC — see `canvas-confetti.LICENSE.txt`, kept alongside as the licence
requires the copyright notice to travel with the code.
