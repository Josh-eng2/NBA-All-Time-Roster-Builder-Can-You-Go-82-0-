# Can You Go 82-0? — standalone itch.io export

`index.html` is the complete game in one self-contained file. `can-you-go-82-0-itch.zip`
contains that exact file at the archive's top level, ready to upload to itch.io.

## Uploading to itch.io

1. Project page → **Kind of project: HTML**.
2. Upload `can-you-go-82-0-itch.zip` and tick **"This file will be played in the browser"**.
3. Set the embed size to **1024 × 768 or larger** (see *Known limitation* below), and enable
   **"Click to launch in fullscreen"** / **mobile friendly** as you prefer.

No other files are needed. There is nothing to build, install or serve.

## What is embedded

Everything the game loads at runtime is inlined into the single HTML file:

| Asset | How it is embedded |
| --- | --- |
| All 27 JS modules (`js/**`) | Bundled to one ES module, inline `<script type="module">` |
| Complete player database (937 players, 178 team-era buckets) | Inside that bundle |
| `css/tailwind.css`, `styles.css`, `desktop.css`, `responsive.css` | One inline `<style>`, original load order |
| Fira Sans 400–900, Barlow Condensed 500–800 (latin + latin-ext) | 20 × base64 `woff2` `@font-face` |
| The approved "Can You Go 82-0?" crest | base64 PNG — menu header logo, favicon and apple-touch-icon |
| canvas-confetti 1.6.0 | Inline `<script>` (no CDN) |

The page makes **no external asset request at all**. The three `href` links in the hidden
guide/FAQ section (Privacy, Daily archive, Team rosters) point at the live site and open in a
new tab; they are never fetched automatically and never navigate the itch.io page.

## Differences from the site build

Four export-only patches; nothing else in the game changed.

1. Menu header logo now uses the approved 82-0 crest instead of `logo-badge.svg`.
2. The lazy canvas-confetti CDN `<script>` injection is removed — the library ships in the page.
3. `Privacy & Terms` in the footer points at `https://canyougo820.com/privacy.html`.
4. The PWA "Add to Home Screen" prompt stays quiet inside an iframe (installing a portal's
   page instead of the game would be wrong, and a single file ships no web manifest).

The CrazyGames and GameDistribution SDK `<script>` tags are not included — they are
portal-specific ad/monetisation loaders that are inert off their own portals and would pull
third-party ads into an itch.io page. Their JS shims are still present and no-op exactly as
they already do on canyougo820.com. The service worker and web manifest are also omitted:
neither can exist alongside a single HTML file.

## Network

The game is fully playable offline. The one server-backed feature is the **Global
Leaderboard / Daily Challenge leaderboard + community stats / analytics**, which talk to
Firebase and load its SDK from `https://www.gstatic.com/firebasejs/10.12.4`. With no
connection those degrade to their existing "unavailable" state — drafting, chemistry, fans,
the 82-game season, playoffs, trophies, legends, XP and saved progress all keep working.

## Known limitation (pre-existing, not introduced by this export)

Between **640 px and 1023 px wide with a short viewport** (e.g. 640×480, 860×540, 960×600) the
Team Status gauges panel overlaps the draft board and covers the Draft buttons. This is
present identically in the site build at the same sizes and was left untouched here, since
the export must not change the game's layout. Every other size tested is clean — including
1024×700 and up, and every mobile size — so an itch.io embed of 1024×768 or larger avoids it.
