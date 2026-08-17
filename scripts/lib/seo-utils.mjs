/**
 * scripts/lib/seo-utils.mjs — shared plumbing for the static page generators
 *
 * Both generators (build_challenge_pages.mjs, build_team_pages.mjs) write pages
 * into the same site and must agree on escaping, change detection and lastmod
 * dating. They also feed one sitemap: build_challenge_pages.mjs owns writing
 * sitemap.xml and pulls the team/era URLs in, so there is a single writer and
 * the two generators can never clobber each other's entries.
 *
 * prevLastmod snapshots the existing sitemap at module load — before either
 * generator rewrites it — so an unchanged page keeps the date it already had.
 */

import { writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const ORIGIN = 'https://canyougo820.com';
export const TODAY = new Date().toISOString().slice(0, 10);

// Key file lives at the repo root (<key>.txt) so it serves from the site root
// once deployed — that's how IndexNow verifies we own the host.
export const INDEXNOW_KEY = '8bb440ec6d685113df0538f94aed335d';

export const esc = s => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const slugify = s => String(s).toLowerCase()
  .replace(/['’]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

/**
 * BreadcrumbList JSON-LD.
 *
 * Search Console's "Search appearance" report is empty — these pages earn no
 * rich result of any kind, so every listing is a bare blue link. Breadcrumbs
 * are the one treatment Google still shows broadly for pages like these: they
 * replace the raw URL line in the result and tell the searcher the page sits
 * inside a real franchise/era index rather than being a loose page.
 *
 * This markup is only legal because every generated page renders a visible
 * trail (the `.cp-crumb` link back to its hub) — Google requires the
 * breadcrumb be on the page, not invented in the schema. Keep that link if
 * you keep this call.
 *
 * `trail` is [name, url] pairs, root first; the last entry is the current
 * page and still carries its own url, per Google's spec.
 */
export const breadcrumbLd = trail => ({
  '@type': 'BreadcrumbList',
  itemListElement: trail.map(([name, item], i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name,
    item,
  })),
});

/**
 * Guard for a <title>. Google truncates the result link at roughly 600px —
 * about 60 characters — and a title that gets cut mid-phrase loses exactly
 * the keyword it was lengthened to carry. Generated titles are built from
 * team/challenge names of varying length, so this catches a bad one at build
 * time instead of after it ships to 50-odd pages.
 */
export function assertTitleFits(title, ctx) {
  if (title.length > 60) {
    throw new Error(`title too long (${title.length} chars) for ${ctx}: ${title}`);
  }
  return title;
}

/** Writes only when content actually differs. Returns true if it wrote. */
export function writeIfChanged(path, content) {
  try {
    if (readFileSync(path, 'utf8') === content) return false;
  } catch (_) { /* file doesn't exist yet */ }
  writeFileSync(path, content, 'utf8');
  return true;
}

/** Last commit date for a path, 'YYYY-MM-DD', or null outside a git checkout. */
export function gitDate(relPath) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', relPath],
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch (_) { return null; }
}

/** loc -> lastmod from the sitemap as it stood before this run. */
const prevLastmod = (() => {
  const map = new Map();
  try {
    const xml = readFileSync(join(ROOT, 'sitemap.xml'), 'utf8');
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)) {
      map.set(m[1], m[2]);
    }
  } catch (_) { /* first run */ }
  return map;
})();

/**
 * lastmod must reflect when the page's content last actually changed, not
 * when this script last ran — a sitemap that stamps every URL with today on
 * every build trains Google to ignore the field. So: today only if we just
 * rewrote the file, otherwise the date git last recorded a change to it.
 */
export function lastmodFor(url, relPath, changed) {
  if (changed) return TODAY;
  return gitDate(relPath) || prevLastmod.get(url) || TODAY;
}

/**
 * Push notification for pages we actually rewrote. Google ignores IndexNow (it
 * wants the sitemap), but Bing and Yandex use it to fetch a changed URL right
 * away instead of on their own crawl schedule.
 */
export async function notifyIndexNow(urls) {
  if (!urls.length) { console.log('IndexNow: nothing changed, skipping.'); return; }
  const body = {
    host: new URL(ORIGIN).host,
    key: INDEXNOW_KEY,
    keyLocation: `${ORIGIN}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  };
  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
    // 200 = accepted, 202 = accepted (key not yet verified everywhere) — both fine.
    if (res.ok) {
      console.log(`IndexNow: notified ${urls.length} URL(s) (HTTP ${res.status})`);
    } else {
      console.warn(`IndexNow: submission returned HTTP ${res.status} — not fatal, sitemap.xml is still authoritative`);
    }
  } catch (err) {
    console.warn(`IndexNow: submission failed (${err.message}) — not fatal, sitemap.xml is still authoritative`);
  }
}

/** Loads the player DB headlessly (js/data/players.js pokes the DOM on load). */
export async function loadPlayerDb() {
  globalThis.document ??= { getElementById: () => null };
  const mod = await import('../../js/data/players.js');
  mod.loadDatabase();
  if (!mod.DB) throw new Error('player DB failed to load');
  return mod.DB;
}
