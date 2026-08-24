/**
 * Every CSS animation the app asks for has to be defined somewhere that
 * outlives the element using it.
 *
 * `@keyframes _spin` was declared in an inline <style> INSIDE #loading-overlay.
 * js/data/players.js removes that overlay the moment the database is in, which
 * deleted the keyframes from the document — so the boot spinner turned, and
 * then every later user of the same animation (the global and daily
 * leaderboard modals) painted a circle that could never move. Nothing catches
 * that at runtime: an animation whose keyframes don't exist is not an error,
 * it just silently does nothing.
 *
 * This is a static check, so it needs no DOM: collect the animation names the
 * markup and the JS reference, collect the names the STYLESHEETS define, and
 * require the first set to be covered by the second. Keyframes declared inside
 * an inline <style> don't count — that is exactly the trap being guarded.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => readFileSync(join(ROOT, rel), 'utf8');

/** Stylesheets the browser loads and keeps for the whole session. */
const STYLESHEETS = readdirSync(join(ROOT, 'css'))
  .filter(f => f.endsWith('.css') && f !== 'tailwind.in.css')
  .map(f => `css/${f}`);

/** Files that can reference an animation by name. */
const CONSUMERS = [
  'index.html',
  ...readdirSync(join(ROOT, 'js'), { recursive: true })
    .filter(f => String(f).endsWith('.js'))
    .map(f => `js/${String(f).replaceAll('\\', '/')}`),
];

/** `@keyframes foo` / `@-webkit-keyframes foo` declared in a stylesheet. */
function keyframesIn(text) {
  return new Set(
    [...text.matchAll(/@(?:-webkit-)?keyframes\s+([A-Za-z_][\w-]*)/g)].map(m => m[1]),
  );
}

/**
 * Animation names a file asks for, from both the `animation` shorthand and
 * `animation-name`. The shorthand interleaves durations, timing functions and
 * keywords with the name, so drop anything that is a number, a time, or a
 * known keyword and keep the rest.
 */
const ANIMATION_KEYWORDS = new Set([
  'none', 'infinite', 'normal', 'reverse', 'alternate', 'alternate-reverse',
  'forwards', 'backwards', 'both', 'running', 'paused', 'linear', 'ease',
  'ease-in', 'ease-out', 'ease-in-out', 'step-start', 'step-end', 'initial',
  'inherit', 'unset', 'revert',
]);

function animationNamesIn(text) {
  const names = new Set();
  for (const m of text.matchAll(/animation(-name)?\s*:\s*([^;"'`}]+)/g)) {
    for (const token of m[2].split(/[\s,]+/)) {
      const t = token.trim();
      if (!t) continue;
      if (ANIMATION_KEYWORDS.has(t)) continue;
      if (/^-?[\d.]/.test(t)) continue;                 // 0.7s, 200ms, 3
      if (/^(cubic-bezier|steps|var)\(/.test(t)) continue;
      if (!/^[A-Za-z_][\w-]*$/.test(t)) continue;       // ${...}, calc(, etc.
      names.add(t);
    }
  }
  return names;
}

test('every animation referenced by the app has keyframes in a stylesheet', () => {
  const defined = new Set();
  for (const sheet of STYLESHEETS) for (const n of keyframesIn(read(sheet))) defined.add(n);
  assert.ok(defined.size > 0, 'no @keyframes found in css/ at all — the scan is broken');

  const missing = [];
  for (const file of [...CONSUMERS, ...STYLESHEETS]) {
    for (const name of animationNamesIn(read(file))) {
      if (!defined.has(name)) missing.push(`${name} (used in ${file})`);
    }
  }
  assert.deepEqual(missing, [],
    `these animations have no @keyframes in any stylesheet:\n  ${missing.join('\n  ')}`);
});

test('the boot overlay does not carry keyframes it takes to the grave with it', () => {
  const html = read('index.html');
  // js/data/players.js removes #loading-overlay wholesale once the DB is in.
  assert.match(read('js/data/players.js'), /loading-overlay[\s\S]{0,200}remove\(\)/,
    'expected loadDatabase() to still remove the overlay — if it does not, this guard needs rewriting');

  const overlay = html.slice(html.indexOf('id="loading-overlay"'));
  const overlayEnd = overlay.indexOf('<!-- Crawlable fallback');
  assert.ok(overlayEnd > 0, 'could not find the end of the loading overlay block');
  const inside = overlay.slice(0, overlayEnd);

  assert.doesNotMatch(inside, /@(?:-webkit-)?keyframes/,
    'keyframes declared inside #loading-overlay are deleted when the overlay is removed — put them in css/');
});

test('a busy spinner keeps moving when the OS asks for reduced motion', () => {
  const responsive = read('css/responsive.css');
  const reduceBlock = responsive.slice(responsive.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.ok(reduceBlock.length, 'expected a prefers-reduced-motion block');

  // The blanket rule collapses every animation to a single 0.01ms iteration.
  // A spinner frozen mid-rotation tells the player nothing is happening, so it
  // has to be exempted — reduced motion targets vestibular triggers, and both
  // WCAG and the spec exempt animation carrying essential information.
  assert.match(reduceBlock, /\.app-spinner\s*\{[^}]*animation-iteration-count:\s*infinite/,
    'the spinner must keep iterating under prefers-reduced-motion');
  const dur = reduceBlock.match(/\.app-spinner\s*\{[^}]*animation-duration:\s*([\d.]+)s/);
  assert.ok(dur, 'the reduced-motion spinner needs an explicit duration');
  assert.ok(Number(dur[1]) >= 1,
    `reduced motion should slow the spinner, not keep it at ${dur[1]}s`);
});

test('both spinners share one definition rather than repeating it inline', () => {
  for (const file of ['index.html', 'js/utils/storage.js']) {
    const text = read(file);
    assert.match(text, /class="app-spinner"/, `${file} should use the shared .app-spinner`);
    assert.doesNotMatch(text, /animation:\s*_spin/,
      `${file} re-declares the spin animation inline instead of using .app-spinner`);
  }
  assert.match(read('css/styles.css'), /\.app-spinner\s*\{[^}]*animation:\s*_spin/,
    'css/styles.css should own the .app-spinner animation');
});
