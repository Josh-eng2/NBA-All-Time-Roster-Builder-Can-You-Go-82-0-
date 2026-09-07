/**
 * Referral attribution: which of our links a visitor opened (`ref`) and where
 * they opened it (`channel`).
 *
 * Both end up as analytics dimensions, so the thing worth pinning is that
 * neither can be fragmented from outside — a crafted ?ref= or ?via= must
 * collapse into a known bucket rather than minting a new one. Also pinned:
 * first-touch never gets overwritten, since the whole question the module
 * exists to answer is whether shared links bring in players who stay.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mod } from './helpers.mjs';

// referral.js reads location/localStorage/document.referrer at call time, so the
// stubs only have to exist before captureReferral() runs — not before import.
function stubBrowser({ search = '', referrer = '' } = {}) {
  const store = new Map();
  globalThis.location = { search };
  globalThis.document = { getElementById: () => null, referrer };
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  };
  return store;
}

const { captureReferral, getReferralSource, getReferralChannel, REF_KEY } =
  await import(mod('js/utils/referral.js'));

const stored = () => JSON.parse(globalThis.localStorage.getItem(REF_KEY) || 'null');

test('a known source is recorded on first touch', () => {
  stubBrowser({ search: '?ref=rematch', referrer: 'https://www.reddit.com/r/nba/' });
  const r = captureReferral();
  assert.equal(r.ref, 'rematch');
  assert.equal(r.channel, 'reddit');
  assert.equal(r.firstTouch, true);
  assert.equal(getReferralSource(), 'rematch');
  assert.equal(getReferralChannel(), 'reddit');
});

test('an unknown source collapses to "other" rather than minting a dimension', () => {
  for (const raw of ['spoofed', 'REMATCH', 'daily ', '../x', '<script>']) {
    stubBrowser({ search: `?ref=${encodeURIComponent(raw)}` });
    assert.equal(captureReferral().ref, 'other', `"${raw}" must normalise`);
  }
});

test('every source a link builder emits is recognised', () => {
  // These are the values logic/rematch.js and the generated pages actually put
  // in front of players; any of them falling through to 'other' would silently
  // merge a real channel into the junk bucket.
  for (const ref of ['share', 'rematch', 'daily', 'story', 'era', 'dailypage']) {
    stubBrowser({ search: `?ref=${ref}` });
    assert.equal(captureReferral().ref, ref);
  }
});

test('no ?ref= is not a referral, and stores nothing', () => {
  stubBrowser({ search: '?utm_source=newsletter' });
  const r = captureReferral();
  assert.equal(r.ref, null);
  assert.equal(r.channel, null);
  assert.equal(stored(), null, 'a direct visit must not occupy the first-touch slot');
});

test('first touch wins — a later link never relabels the visitor', () => {
  stubBrowser({ search: '?ref=era', referrer: 'https://www.google.com/' });
  captureReferral();
  const first = stored();

  globalThis.location = { search: '?ref=rematch' };
  globalThis.document = { getElementById: () => null, referrer: 'https://t.co/abc' };
  const second = captureReferral();

  assert.equal(second.firstTouch, false);
  assert.deepEqual(stored(), first, 'the stored record must not move');
  assert.equal(getReferralSource(), 'era');
});

test('referrer hosts bucket into channels, subdomains included', () => {
  const cases = [
    ['https://l.facebook.com/l.php?u=x', 'facebook'],
    ['https://m.facebook.com/',          'facebook'],
    ['https://t.co/abc123',              'x'],
    ['https://twitter.com/i/web',        'x'],
    ['https://www.reddit.com/r/nba/',    'reddit'],
    ['https://out.reddit.com/x',         'reddit'],
    ['https://discord.com/channels/1',   'discord'],
    ['https://web.whatsapp.com/',        'whatsapp'],
    ['https://t.me/somechat',            'telegram'],
    ['https://www.google.com/search',    'search'],
    ['https://www.google.co.uk/search',  'search'],
    ['https://duckduckgo.com/',          'search'],
    ['https://example.invalid/blog',     'other'],
  ];
  for (const [referrer, channel] of cases) {
    stubBrowser({ search: '?ref=share', referrer });
    assert.equal(captureReferral().channel, channel, `${referrer} → ${channel}`);
  }
});

test('an empty referrer is "direct", not a guess', () => {
  // The common case, and the reason 'direct' must never be read as "typed the
  // URL": native share sheets and in-app browsers send no Referer at all.
  stubBrowser({ search: '?ref=share', referrer: '' });
  assert.equal(captureReferral().channel, 'direct');
});

test('our own pages are "internal", so a content-page hop is not a channel', () => {
  stubBrowser({ search: '?ref=daily', referrer: 'https://canyougo820.com/daily/boos-only.html' });
  assert.equal(captureReferral().channel, 'internal');
});

test('?via= carries the channel across the daily-page hop', () => {
  // The daily page relays who sent the reader to it; without this every daily
  // share reads as 'internal', which is the one path the channel matters on.
  stubBrowser({
    search: '?ref=daily&via=web.whatsapp.com',
    referrer: 'https://canyougo820.com/daily/boos-only.html',
  });
  assert.equal(captureReferral().channel, 'whatsapp');
});

test('a crafted ?via= cannot smuggle anything into the dimension', () => {
  for (const via of ['<script>', 'a'.repeat(200), 'has space', 'http://x.com/p', '"quoted"']) {
    stubBrowser({ search: `?ref=share&via=${encodeURIComponent(via)}`, referrer: '' });
    const ch = captureReferral().channel;
    assert.match(ch, /^[a-z]+$/, `via "${via}" produced "${ch}"`);
  }
});
