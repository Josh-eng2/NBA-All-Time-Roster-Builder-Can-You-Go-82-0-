/**
 * js/utils/gamedistribution.js — GameDistribution HTML5 SDK integration
 *
 * Depends on the SDK bootstrap in index.html, which sets window.GD_OPTIONS
 * (with our gameId) and injects https://html5.api.gamedistribution.com/main.min.js.
 * That script exposes window.gdsdk once loaded. Off the GameDistribution
 * network (our own site, other platforms), gdsdk stays undefined or its
 * calls simply return no fill — every export below guards with a typeof
 * check so nothing throws either way.
 */

function ready() {
  return typeof gdsdk !== 'undefined' && typeof gdsdk.showAd === 'function';
}

/**
 * Requests an interstitial ad at a natural break point (new game, restart,
 * back to menu). Must be called synchronously from inside a user click
 * handler — GD's SDK requires the request to originate from user
 * interaction. No-ops off the GameDistribution network.
 */
export function gdShowAd() {
  if (ready()) gdsdk.showAd();
}

/** True when rewarded ads can even be attempted (i.e. gdsdk is live) —
 *  gates the "watch ad" button so it never renders on other platforms. */
export function gdRewardedAvailable() {
  return ready();
}

// GD fires SDK_REWARDED_WATCH_COMPLETE through the GD_OPTIONS.onEvent hook
// in index.html, which relays it here as a DOM event. The reward is granted
// only when BOTH the showAd promise resolves and this event fired — per GD's
// own guidance, a resolved promise alone can mean a skipped/errored ad.
let _rewardedWatched = false;
window.addEventListener('gd-rewarded-complete', () => { _rewardedWatched = true; });

/**
 * Preloads and shows a rewarded ad. Resolves true only when the viewer
 * watched it to completion; false on no-fill, error, or early close.
 */
export async function gdShowRewardedAd() {
  if (!ready() || typeof gdsdk.preloadAd !== 'function') return false;
  _rewardedWatched = false;
  try {
    await gdsdk.preloadAd('rewarded');
    await gdsdk.showAd('rewarded');
  } catch (_) {
    return false;
  }
  return _rewardedWatched;
}
