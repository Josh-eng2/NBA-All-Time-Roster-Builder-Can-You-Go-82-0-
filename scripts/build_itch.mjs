/**
 * scripts/build_itch.mjs — packages the game as ONE self-contained .html file
 * for itch.io ("Or upload a .html file that contains your entire game").
 *
 * Run:  node scripts/build_itch.mjs
 * Out:  dist/can-you-go-82-0.html   (single file, no sibling assets)
 *
 * Why a single file rather than the zip itch also accepts: it removes every
 * relative path from the equation. No sw.js, no manifest, no css/ or js/
 * directory, so nothing can 404 or resolve differently inside itch's embed
 * iframe than it does on canyougo820.com.
 *
 * What this build deliberately changes vs. the deployed site — each of these
 * is a thing that is correct on our own domain and wrong (or dead weight)
 * inside an itch embed:
 *
 *   1. Portal SDKs (CrazyGames, GameDistribution) are dropped. CrazyGames'
 *      SDK self-disables off crazygames.com, but GameDistribution's loader in
 *      index.html triggers on `window.self !== window.top` — "am I in an
 *      iframe" — which is ALSO true of itch's embed. On itch that loads GD's
 *      ad stack against a gameId not provisioned for the domain. Both
 *      js/utils/*.js wrappers already no-op when their global is undefined,
 *      which is exactly the state this leaves them in.
 *   2. The service worker is dropped. There is no sw.js next to a single-file
 *      build, and a SW registered from inside a third-party embed is a
 *      caching liability, not an offline win.
 *   3. manifest + icon links are dropped (those files don't ship here), and
 *      favicon.svg / logo-badge.svg are inlined as data URIs instead.
 *   4. Domain-specific SEO tags (canonical, site verification, robots) are
 *      dropped — they name canyougo820.com and are actively wrong on itch.
 *   5. Relative .html links (privacy, daily archive, team pages) are
 *      rewritten to absolute canyougo820.com URLs so nothing points at a 404.
 *
 * Everything else — game logic, player DB, CSS, Firebase leaderboards,
 * confetti — is byte-for-byte the deployed code.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const p = (...s) => resolve(ROOT, ...s);
const read = (f) => readFileSync(p(f), 'utf8');

const SITE = 'https://canyougo820.com';
const OUT_DIR = p('dist');
const OUT_FILE = p('dist/can-you-go-82-0.html');

// ── 1. Bundle the ES module graph ────────────────────────────────────────────
// js/main.js is the single entry point; every other module is reached from it.
// The https:// dynamic imports (Firebase SDK) stay external — they are loaded
// at runtime from the CDN and are already guarded to degrade silently.
mkdirSync(OUT_DIR, { recursive: true });
const TMP_BUNDLE = p('dist/.bundle.tmp.js');
execFileSync('npx', [
  '--yes', 'esbuild@0.24.0',
  p('js/main.js'),
  '--bundle',
  '--format=esm',
  '--platform=browser',
  '--external:https://*',
  '--legal-comments=none',
  `--outfile=${TMP_BUNDLE}`,
], { stdio: ['ignore', 'ignore', 'inherit'], cwd: ROOT });

let bundle = readFileSync(TMP_BUNDLE, 'utf8');
rmSync(TMP_BUNDLE, { force: true });

// ── 2. Inline the assets the bundle references by relative path ──────────────
const dataUriSvg = (f) =>
  `data:image/svg+xml;base64,${readFileSync(p(f)).toString('base64')}`;

// render.js renders <img src="logo-badge.svg"> — no such sibling file here.
bundle = bundle.replaceAll('src="logo-badge.svg"', `src="${dataUriSvg('logo-badge.svg')}"`);
// The footer's Privacy link, and any other relative page link in rendered HTML.
bundle = bundle.replaceAll('href="privacy.html"', `href="${SITE}/privacy.html"`);

// ── 3. Assemble the document ─────────────────────────────────────────────────
let html = read('index.html');

const drop = (label, re) => {
  const before = html.length;
  html = html.replace(re, '');
  if (html.length === before) throw new Error(`build_itch: "${label}" matched nothing — index.html changed, update this script`);
};

// Portal SDKs: the CrazyGames tag plus the whole GD bootstrap <script> block.
drop('crazygames sdk', /[ \t]*<!-- CrazyGames HTML5 v2 SDK[\s\S]*?<\/script>\n/);
drop('gamedistribution sdk', /[ \t]*<!-- GameDistribution HTML5 SDK[\s\S]*?\n[ \t]*<\/script>\n/);
// Service worker registration.
drop('service worker', /[ \t]*<!-- Register the service worker[\s\S]*?<\/script>\n/);
// Files that don't exist in a single-file build.
drop('manifest link', /[ \t]*<link rel="manifest"[^>]*>\n/);
drop('apple touch icon', /[ \t]*<link rel="apple-touch-icon"[^>]*>\n/);
drop('favicon ico', /[ \t]*<link rel="icon" href="favicon\.ico"[^>]*>\n/);
// Domain-specific SEO that is wrong when served from itch.
drop('canonical', /[ \t]*<link rel="canonical"[^>]*>\n/);
drop('site verification', /[ \t]*<meta name="google-site-verification"[^>]*>\n/);
drop('robots', /[ \t]*<meta name="robots"[^>]*>\n/);

// favicon.svg -> data URI (keeps the tab icon with no sibling file).
html = html.replace(
  /<link rel="icon" href="favicon\.svg"([^>]*)>/,
  `<link rel="icon" href="${dataUriSvg('favicon.svg')}"$1>`
);

// Remaining relative page links in the static #about section.
html = html.replace(/href="((?:daily|teams|privacy)\.html)"/g, `href="${SITE}/$1"`);

// pageIntegrity.js is a classic (non-module) IIFE, loaded ahead of everything
// else so its title lock is armed first. Inline it in that same position.
html = html.replace(
  /<script src="js\/utils\/pageIntegrity\.js"><\/script>/,
  `<script>\n${read('js/utils/pageIntegrity.js')}\n</script>`
);

// CSS: same four files, same order (responsive.css must stay last — it owns
// the shell contract and layers over both styles.css and desktop.css).
const css = ['css/tailwind.css', 'css/styles.css', 'css/desktop.css', 'css/responsive.css']
  .map((f) => `/* ${f} */\n${read(f)}`)
  .join('\n');
html = html.replace(
  /[ \t]*<link rel="stylesheet" href="css\/tailwind\.css"[^>]*>\n/,
  `  <style>\n${css}\n  </style>\n`
);
for (const f of ['css/styles.css', 'css/desktop.css', 'css/responsive.css']) {
  html = html.replace(new RegExp(`[ \\t]*<link rel="stylesheet" href="${f.replace('.', '\\.')}"[^>]*>\\n`), '');
}

// The bundled module replaces the <script type="module" src="js/main.js">.
html = html.replace(
  /<script type="module" src="js\/main\.js"><\/script>/,
  `<script type="module">\n${bundle}\n</script>`
);

// ── 4. Verify nothing still points at a file we did not ship ─────────────────
const leftovers = [...html.matchAll(/(?:src|href)="(?!https?:|data:|#)([^"]+)"/g)]
  .map((m) => m[1])
  .filter((v, i, a) => a.indexOf(v) === i);
if (leftovers.length) {
  throw new Error(`build_itch: single-file build still references local paths: ${leftovers.join(', ')}`);
}

writeFileSync(OUT_FILE, html);
console.log(`${OUT_FILE}  (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB)`);
