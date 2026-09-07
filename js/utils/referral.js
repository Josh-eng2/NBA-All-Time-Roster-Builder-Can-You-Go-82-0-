/**
 * js/utils/referral.js — Inbound link attribution
 *
 * Every link the game hands out carries `?ref=<source>` (see logic/rematch.js
 * link builders). This module reads that on boot, records a first-touch source
 * and channel for the visitor, and reports the landing to analytics.
 *
 * First touch, not last: the question worth answering is "did shared links
 * bring in players who stuck around", so a visitor who arrives via a rematch
 * link and comes back a week later direct still counts as referred. A visitor
 * who arrives direct and only later opens a friend's link is not retroactively
 * relabelled either — whoever got here first gets the credit.
 *
 * `ref` says which of our links they opened; `channel` says where they opened
 * it — the difference between "rematch links get shared" and "rematch links
 * get shared in WhatsApp", which is what decides the share card's shape.
 *
 * firebase.js stamps the stored source onto every analytics event (it reads
 * the storage key directly rather than importing this module — importing would
 * make the two files circular).
 */

import { logAnalyticsEvent } from './firebase.js';

export const REF_KEY = 'nba820_ref';

/** Sources the link builders emit. Anything else is recorded as 'other' so a
 *  crafted or stale ?ref= can't fragment the analytics dimension.
 *  - share/rematch/story/daily/era: a link a player or a content page handed out
 *  - dailypage: the Play button on a daily challenge page, for a reader who
 *    arrived there some other way (search, mostly). Kept distinct from `daily`
 *    so organic traffic through those pages can't be read as shares. */
const KNOWN = ['share', 'rematch', 'daily', 'story', 'era', 'dailypage'];

/**
 * Referrer host → channel. Each entry is matched as a whole-label suffix, so
 * 'l.facebook.com' and 'm.facebook.com' both land on facebook.
 * Ordered: first match wins.
 *
 * Deliberately coarse. The goal is "which surface do our links travel on",
 * not a full attribution product, and every extra bucket is another value to
 * keep an eye on in the console for no decision it would change.
 */
const CHANNELS = [
  ['whatsapp',  ['whatsapp.com', 'wa.me']],
  ['messenger', ['messenger.com', 'm.me']],
  ['facebook',  ['facebook.com', 'fb.me', 'fb.com']],
  ['instagram', ['instagram.com']],
  ['x',         ['t.co', 'twitter.com', 'x.com']],
  ['reddit',    ['reddit.com', 'redd.it']],
  ['discord',   ['discord.com', 'discordapp.com', 'discord.gg']],
  ['telegram',  ['t.me', 'telegram.org', 'telegram.me']],
  ['tiktok',    ['tiktok.com']],
  ['youtube',   ['youtube.com', 'youtu.be']],
  ['linkedin',  ['linkedin.com', 'lnkd.in']],
  ['snapchat',  ['snapchat.com']],
  ['search',    ['bing.com', 'duckduckgo.com', 'search.yahoo.com', 'ecosia.org',
                 'search.brave.com', 'yandex.com', 'baidu.com']],
];

/** Google alone has ~190 country domains (google.co.uk, google.com.au …), so it
 *  gets a pattern rather than a suffix list nobody would keep current. */
const GOOGLE_RE = /(^|\.)google\.[a-z]{2,3}(\.[a-z]{2,3})?$/;

/** Our own pages — a hop through a content page is not a channel. */
const INTERNAL = ['canyougo820.com', 'localhost', '127.0.0.1'];

/**
 * Bucket a referrer hostname.
 *
 * IMPORTANT for reading the numbers: 'direct' is the majority case and does
 * NOT mean "typed the URL". Native share sheets, most messaging apps, and any
 * in-app browser send no Referer at all, so the shares we care about most are
 * exactly the ones that arrive unlabelled. Treat 'direct' as "unattributable"
 * and compare the named channels against each other, not against it.
 *
 * @param {string} host bare hostname, already lowercased
 * @returns {string} channel id
 */
function bucketHost(host) {
  if (!host) return 'direct';
  // Whole-label matching only. A substring test reads 'www.reddit.com' as the
  // 't.co' shortener — the domains here overlap enough that anything looser
  // silently files one channel under another.
  const under = h => host === h || host.endsWith('.' + h);
  if (INTERNAL.some(under)) return 'internal';
  for (const [channel, hosts] of CHANNELS) {
    if (hosts.some(under)) return channel;
  }
  return GOOGLE_RE.test(host) ? 'search' : 'other';
}

/** Hostname of the page that linked here.
 *
 *  `?via=` takes precedence: a shared daily link now lands on the challenge's
 *  own page first (buildDailyUrl), and that page relays the hostname that sent
 *  the reader to it — otherwise every daily share would report 'internal',
 *  which is the one path where the channel matters most. The page validates the
 *  shape; this re-validates rather than trusting it, since it arrives in a URL.
 */
function referrerHost() {
  try {
    const via = new URLSearchParams(location.search).get('via');
    if (via && /^[a-z0-9.-]{1,60}$/i.test(via)) return via.toLowerCase();
  } catch (_) { /* malformed query — fall through to the real referrer */ }
  try {
    return document.referrer ? new URL(document.referrer).hostname.toLowerCase() : '';
  } catch (_) { return ''; }
}

function readStored() {
  try { return JSON.parse(localStorage.getItem(REF_KEY) || 'null'); } catch (_) { return null; }
}

/**
 * Reads ?ref= from the current URL, stores it on first touch, and logs the
 * landing. Safe to call once per page load; later calls are no-ops.
 * @returns {{ ref: string|null, channel: string|null, firstTouch: boolean }}
 */
export function captureReferral() {
  let ref = null;
  try {
    const raw = new URLSearchParams(location.search).get('ref');
    if (raw) ref = KNOWN.includes(raw) ? raw : 'other';
  } catch (_) { /* malformed query — treat as direct */ }

  if (!ref) return { ref: null, channel: null, firstTouch: false };

  const channel = bucketHost(referrerHost());
  const stored = readStored();
  const firstTouch = !stored;
  if (firstTouch) {
    try {
      localStorage.setItem(REF_KEY, JSON.stringify({ ref, channel, at: Date.now() }));
    } catch (_) { /* private mode — attribution is best-effort, never fatal */ }
  }

  logAnalyticsEvent('referral_landing', { ref, channel, first_touch: firstTouch });
  return { ref, channel, firstTouch };
}

/** First-touch source for this visitor, or null if they arrived direct. */
export function getReferralSource() {
  return readStored()?.ref ?? null;
}

/** Channel the first-touch link was opened from, or null. A record stored
 *  before channels were tracked has no channel — hence the `?? null` rather
 *  than a default, so old visitors read as unknown instead of 'direct'. */
export function getReferralChannel() {
  return readStored()?.channel ?? null;
}
