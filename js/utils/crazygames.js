/**
 * js/utils/crazygames.js — CrazyGames HTML5 SDK v2 integration
 *
 * Depends on the SDK script tag in index.html:
 *   <script src="https://sdk.crazygames.com/crazygames-sdk-v2.js"></script>
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

/**
 * Local SDK stubs report env 'local' (so isActive() is true) but often omit
 * individual game.* methods. Guard each call the same way usingCgData()
 * guards SDK.data — existence check + try/catch, never unhandled rejection.
 */
function cgGame() {
  return window.CrazyGames?.SDK?.game;
}

/** Call as early as possible — right when the game starts loading. */
export async function cgLoadingStart() {
  try {
    if (!(await isActive())) return;
    const fn = cgGame()?.loadingStart;
    if (typeof fn === 'function') fn.call(cgGame());
  } catch (_) { /* local stub incomplete */ }
}

/** Call once the game is first playable (first real frame rendered). */
export async function cgLoadingStop() {
  try {
    if (!(await isActive())) return;
    const fn = cgGame()?.loadingStop;
    if (typeof fn === 'function') fn.call(cgGame());
  } catch (_) { /* local stub incomplete */ }
}

/** Call whenever the player starts or resumes active play. */
export async function cgGameplayStart() {
  try {
    if (!(await isActive())) return;
    const fn = cgGame()?.gameplayStart;
    if (typeof fn === 'function') fn.call(cgGame());
  } catch (_) { /* local stub incomplete */ }
}

/** Call on every break from active play (menus, results, pauses). */
export async function cgGameplayStop() {
  try {
    if (!(await isActive())) return;
    const fn = cgGame()?.gameplayStop;
    if (typeof fn === 'function') fn.call(cgGame());
  } catch (_) { /* local stub incomplete */ }
}

/**
 * Requests a midgame ad at a natural break point (e.g. after simulating a
 * season, before advancing to the playoffs). No-ops outside CrazyGames.
 * Ads stay disabled during Basic Launch review regardless of this call —
 * this just wires the hook up ahead of time for when ads are enabled.
 */
export async function cgRequestMidgameAd() {
  try {
    if (!(await isActive())) return;
    const ad = window.CrazyGames?.SDK?.ad;
    if (typeof ad?.requestAd !== 'function') return;
    ad.requestAd('midgame', {
      adFinished: () => {},
      adError:    () => {},
      adStarted:  () => {},
    });
  } catch (_) { /* local stub incomplete */ }
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
  // 'local' reports as active (isActive() above) so ad/loading hooks can be
  // exercised in dev, but the Data Module itself is only actually provided
  // under the real 'crazygames' embed — calling SDK.data.* under 'local'
  // throws (window.CrazyGames.SDK.data is undefined there). Check the module
  // exists, not just the environment string, so local/plain-web runs fall
  // through to localStorage instead of crashing every save/load call.
  return (_dataEnv === 'crazygames' || _dataEnv === 'local') && !!window.CrazyGames?.SDK?.data;
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
