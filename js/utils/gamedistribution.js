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
