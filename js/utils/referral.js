/**
 * js/utils/referral.js — Inbound link attribution
 *
 * Every link the game hands out carries `?ref=<source>` (see logic/rematch.js
 * link builders). This module reads that on boot, records a first-touch source
 * for the visitor, and reports the landing to analytics.
 *
 * First touch, not last: the question worth answering is "did shared links
 * bring in players who stuck around", so a visitor who arrives via a rematch
 * link and comes back a week later direct still counts as referred. A visitor
 * who arrives direct and only later opens a friend's link is not retroactively
 * relabelled either — whoever got here first gets the credit.
 *
 * firebase.js stamps the stored source onto every analytics event (it reads
 * the storage key directly rather than importing this module — importing would
 * make the two files circular).
 */

import { logAnalyticsEvent } from './firebase.js';

export const REF_KEY = 'nba820_ref';

/** Sources the link builders emit. Anything else is recorded as 'other' so a
 *  crafted or stale ?ref= can't fragment the analytics dimension. */
const KNOWN = ['share', 'rematch', 'daily', 'story'];

function readStored() {
  try { return JSON.parse(localStorage.getItem(REF_KEY) || 'null'); } catch (_) { return null; }
}

/**
 * Reads ?ref= from the current URL, stores it on first touch, and logs the
 * landing. Safe to call once per page load; later calls are no-ops.
 * @returns {{ ref: string|null, firstTouch: boolean }}
 */
export function captureReferral() {
  let ref = null;
  try {
    const raw = new URLSearchParams(location.search).get('ref');
    if (raw) ref = KNOWN.includes(raw) ? raw : 'other';
  } catch (_) { /* malformed query — treat as direct */ }

  if (!ref) return { ref: null, firstTouch: false };

  const stored = readStored();
  const firstTouch = !stored;
  if (firstTouch) {
    try {
      localStorage.setItem(REF_KEY, JSON.stringify({ ref, at: Date.now() }));
    } catch (_) { /* private mode — attribution is best-effort, never fatal */ }
  }

  logAnalyticsEvent('referral_landing', { ref, first_touch: firstTouch });
  return { ref, firstTouch };
}

/** First-touch source for this visitor, or null if they arrived direct. */
export function getReferralSource() {
  return readStored()?.ref ?? null;
}
