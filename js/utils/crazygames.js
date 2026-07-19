/**
 * js/utils/crazygames.js — CrazyGames HTML5 SDK v2 integration
 *
 * Depends on the SDK script tag in index.html:
 *   <script src="https://sdk.crazygames.com/crazygames-sdk-v2.js" async …>
 *
 * The SDK reports one of three environments via getEnvironment():
 *   'crazygames' — embedded in the CrazyGames iframe
 *   'local'      — local development
 *   'disabled'   — any other domain, including our own (canyougo820.com)
 * Calling the SDK's methods while disabled throws, so every export below
 * checks the environment first and silently no-ops elsewhere. This lets the
 * same calls stay in the code whether the game is running on our own site
 * or embedded on CrazyGames — no build flag or separate copy needed.
 */

const envPromise = (async () => {
  try {
    // The SDK <script> is async so it can't block first paint or hang the
    // page when its CDN is unreachable (see index.html). That means it may
    // still be in flight when this module evaluates — wait for its
    // load/error, with flags for the already-settled cases and a timeout so
    // the game can never be held hostage by a slow SDK fetch.
    if (!window.CrazyGames?.SDK && !window.__cgSdkFailed && !window.__cgSdkLoaded) {
      const tag = document.getElementById('cg-sdk');
      if (tag) {
        await new Promise(resolve => {
          tag.addEventListener('load',  resolve, { once: true });
          tag.addEventListener('error', resolve, { once: true });
          setTimeout(resolve, 5000);
        });
      }
    }
    if (!window.CrazyGames?.SDK?.getEnvironment) return 'disabled';
    return await window.CrazyGames.SDK.getEnvironment();
  } catch (_) {
    return 'disabled';
  }
})();

async function isActive() {
  const env = await envPromise;
  return env === 'crazygames' || env === 'local';
}

/** Call as early as possible — right when the game starts loading. */
export async function cgLoadingStart() {
  if (await isActive()) window.CrazyGames.SDK.game.loadingStart();
}

/** Call once the game is first playable (first real frame rendered). */
export async function cgLoadingStop() {
  if (await isActive()) window.CrazyGames.SDK.game.loadingStop();
}

/** Call whenever the player starts or resumes active play. */
export async function cgGameplayStart() {
  if (await isActive()) window.CrazyGames.SDK.game.gameplayStart();
}

/** Call on every break from active play (menus, results, pauses). */
export async function cgGameplayStop() {
  if (await isActive()) window.CrazyGames.SDK.game.gameplayStop();
}

/**
 * Requests a midgame ad at a natural break point. `onDone` fires when the ad
 * finishes, errors, or (outside CrazyGames) immediately — callers gate the
 * next beat of gameplay on it (e.g. doSimulate holds the season reveal until
 * the ad is out of the way) so an ad never plays over live animation.
 * Ads stay disabled during Basic Launch review regardless of this call.
 */
export async function cgRequestMidgameAd(onDone = () => {}) {
  if (!(await isActive())) { onDone(); return; }
  try {
    window.CrazyGames.SDK.ad.requestAd('midgame', {
      adFinished: onDone,
      adError:    onDone,
      adStarted:  () => {},
    });
  } catch (_) { onDone(); }
}

// ── Data module (progress save) ───────────────────────────────────────────
// Same key/value API as localStorage (getItem/setItem/removeItem, string
// values), but on CrazyGames it's backed by their account-linked storage
// instead of the iframe's own localStorage — which browsers increasingly
// partition or block for third-party iframes. Resolved once at boot via
// initCrazyGamesData() so every other call below can stay synchronous.
let _dataEnv = 'disabled';

/** Call once at app boot, before anything reads/writes saved progress. */
export async function initCrazyGamesData() {
  _dataEnv = await envPromise;
}

function usingCgData() {
  return _dataEnv === 'crazygames' || _dataEnv === 'local';
}

/** Drop-in replacement for localStorage.getItem — routes through the
 *  CrazyGames Data Module when embedded there, else plain localStorage. */
export function cgGetItem(key) {
  if (usingCgData()) return window.CrazyGames.SDK.data.getItem(key);
  try { return localStorage.getItem(key); } catch (_) { return null; }
}

/** Drop-in replacement for localStorage.setItem. */
export function cgSetItem(key, value) {
  if (usingCgData()) { window.CrazyGames.SDK.data.setItem(key, value); return; }
  localStorage.setItem(key, value);
}

/** Drop-in replacement for localStorage.removeItem. */
export function cgRemoveItem(key) {
  if (usingCgData()) { window.CrazyGames.SDK.data.removeItem(key); return; }
  try { localStorage.removeItem(key); } catch (_) {}
}
