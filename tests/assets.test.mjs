/**
 * Repo-level invariants about what the page loads and what it caches.
 *
 * Neither of these can be caught by exercising the modules — they are
 * properties of the file set and of the two hand-maintained lists that
 * describe it (`PRECACHE_URLS` in sw.js, and the script the renderer injects).
 * Both have gone wrong before in ways that are silent in a browser:
 *
 *   * confetti was pulled from a CDN with no Subresource Integrity, putting a
 *     third party in a position to run script on the origin that holds the
 *     Firebase session and the cloud-save write path;
 *   * a module missing from PRECACHE_URLS is a module a returning player never
 *     receives, and one that is listed but absent used to reject the whole
 *     install and freeze every future service-worker update.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const read = rel => readFileSync(join(ROOT, rel), 'utf8');

/**
 * Source with comments removed, so a test cannot be tripped by prose that
 * quotes the very thing it forbids — both checks below are about what the code
 * does, and both files explain the rule in a comment right beside it.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')          // block and JSDoc comments
    .replace(/^[ \t]*\/\/.*$/gm, '');            // whole-line // comments
}

/** Every .js under js/, repo-relative, excluding the vendored bundle. */
function appModules(dir = 'js', out = []) {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) { appModules(rel, out); continue; }
    if (rel.endsWith('.js') && !rel.startsWith('js/vendor/')) out.push(rel);
  }
  return out;
}

test('no first-party module injects a script from another origin', () => {
  // The check is on the src, not on the word "script": modules legitimately
  // create <script> elements (that is how confetti is lazy-loaded), and the
  // thing that matters is where the bytes come from.
  //
  // SCOPE, stated plainly: this catches a LITERAL external .js URL in first-
  // party code. The Firebase SDK is still fetched from gstatic.com by dynamic
  // import in js/utils/firebase.js, built from the SDK_BASE constant — that is
  // a deliberate exception (a versioned module graph published by Google,
  // which vendoring would fork) and it is out of this test's reach by
  // construction, not by accident.
  for (const rel of appModules()) {
    const src = stripComments(read(rel));
    const urls = src.match(/(['"`])https?:\/\/[^'"`]+\.js\1/g) ?? [];
    assert.deepEqual(urls, [],
      `${rel} loads executable code from another origin (${urls.join(', ')}) — vendor it under ` +
      `js/vendor/ instead, or the page trusts a host it cannot verify`);
  }
});

test('the confetti bundle is vendored, same-origin and licensed', () => {
  const render = read('js/ui/render.js');
  const src = render.match(/const CONFETTI_SRC = '([^']+)'/)?.[1];
  assert.ok(src, 'render.js no longer declares CONFETTI_SRC');
  assert.ok(!/^https?:/.test(src), `confetti is loaded cross-origin from ${src}`);

  const path = src.replace(/^\.\//, '');
  assert.ok(existsSync(join(ROOT, path)), `${src} is not in the repo`);
  assert.ok(existsSync(join(ROOT, 'js/vendor/canvas-confetti.LICENSE.txt')),
    'the ISC licence must travel with the vendored copy');
  assert.ok(read('js/vendor/confetti.browser.js').includes('canvas-confetti v1.6.0'),
    'the vendored bundle is not the version js/vendor/README.md records');
});

test('every app module is precached, and everything precached exists', () => {
  const sw = read('sw.js');
  const listed = [...sw.matchAll(/'\.\/([^']*)'/g)].map(m => m[1]).filter(p => p !== '');

  for (const rel of appModules()) {
    assert.ok(listed.includes(rel),
      `${rel} is not in sw.js PRECACHE_URLS — a returning player would never receive it`);
  }
  for (const rel of listed) {
    assert.ok(existsSync(join(ROOT, rel)),
      `sw.js precaches ${rel}, which does not exist`);
  }

  // The vendored bundle is deliberately NOT precached: it stays lazily loaded
  // and the runtime cache picks it up the first time a celebration fires.
  assert.ok(!listed.some(p => p.startsWith('js/vendor/')),
    'the vendored confetti bundle is precached — that puts 17KB back into the ' +
    'first-load payload the lazy injection exists to avoid');
});

test('the service worker install cannot be sunk by one missing asset', () => {
  const sw = stripComments(read('sw.js'));
  assert.ok(!/cache\.addAll\(/.test(sw),
    'sw.js uses cache.addAll(), which is all-or-nothing: one 404 rejects the install, ' +
    'skipWaiting() never runs, and every returning visitor is stuck on the old bundle');
  assert.ok(/allSettled/.test(sw), 'sw.js no longer tolerates a partial precache');
});

test('the cache version is bumped whenever a precached file changes', () => {
  // Not a diff — just that the marker exists and is the shape the changelog
  // above it documents, so the rule stays visible at the point of edit.
  const version = read('sw.js').match(/const CACHE_VERSION = '([^']+)'/)?.[1];
  assert.ok(/^820-v\d+$/.test(version ?? ''), `CACHE_VERSION is ${version}, not 820-vN`);
});
