/**
 * js/utils/crazygames.js — CrazyGames HTML5 SDK v2 integration
 *
 * Depends on the SDK script tag in index.html:
 *   <script async src="https://sdk.crazygames.com/crazygames-sdk-v2.js"></script>
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

/** A stalled optional SDK must never hold the loading screen indefinitely. */
export function resolveCrazyGamesEnvironment(win, timeoutMs = 1500) {
  if (!win) return Promise.resolve('disabled');
  let embedded = false;
  try { embedded = !!win.top && win.self !== win.top; } catch (_) { embedded = true; }
  // Direct visits need no portal storage. Embeds allow a short window for the
  // async script to arrive, including when the parent suppresses its referrer.
  if (!embedded && !win.CrazyGames?.SDK?.getEnvironment) return Promise.resolve('disabled');
  return new Promise(resolve => {
    let poll;
    let settled = false;
    const finish = env => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      clearTimeout(poll);
      resolve(env === 'crazygames' || env === 'local' ? env : 'disabled');
    };
    const deadline = setTimeout(() => finish('disabled'), timeoutMs);
    const inspect = () => {
      try {
        const sdk = win.CrazyGames?.SDK;
        if (typeof sdk?.getEnvironment === 'function') {
          Promise.resolve(sdk.getEnvironment()).then(finish, () => finish('disabled'));
        } else {
          poll = setTimeout(inspect, 25);
        }
      } catch (_) { finish('disabled'); }
    };
    inspect();
  });
}

const envPromise = resolveCrazyGamesEnvironment(typeof window === 'undefined' ? null : window);

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
let _dataStore = null;
let _dataInitialized = false;

/** Call once at app boot, before anything reads/writes saved progress. */
export async function initCrazyGamesData() {
  const env = await envPromise;
  if (_dataInitialized) return;
  _dataInitialized = true;
  _dataStore = (env === 'crazygames' || env === 'local') ? window.CrazyGames?.SDK?.data || null : null;
}

function usingCgData() {
  // 'local' reports as active (isActive() above) so ad/loading hooks can be
  // exercised in dev, but the Data Module itself is only actually provided
  // under the real 'crazygames' embed — calling SDK.data.* under 'local'
  // throws (window.CrazyGames.SDK.data is undefined there). Check the module
  // exists, not just the environment string, so local/plain-web runs fall
  // through to localStorage instead of crashing every save/load call.
  return !!_dataStore;
}

// The three accessors below all follow the same shape: try the Data Module
// when we're embedded on CrazyGames, and fall back to localStorage if that
// call throws. The fallback matters — the SDK branch used to be unguarded, so
// a Data Module failure (quota, transport, a partial stub) meant the write
// went nowhere at all rather than landing in localStorage, silently losing a
// player's progress. localStorage itself throws in Safari private mode and
// wherever site data is blocked, so that branch is guarded too: a save that
// cannot be persisted must never break the run in progress.

/** Drop-in replacement for localStorage.getItem — routes through the
 *  CrazyGames Data Module when embedded there, else plain localStorage. */
export function cgGetItem(key) {
  if (usingCgData()) {
    try { return _dataStore.getItem(key); } catch (_) { /* fall through */ }
  }
  try { return localStorage.getItem(key); } catch (_) { return null; }
}

let persistenceFailed = false;
export const hasPersistenceFailure = () => persistenceFailed;
/** Returns whether the write reached durable storage. */
export function cgSetItem(key, value, { remote = false } = {}) {
  const remember = () => {
    if (!remote && key.startsWith('nba820_') && !['nba820_modified', 'nba820_owner', 'nba820_handoff'].includes(key)) {
      cgSetItem('nba820_modified', String(Date.now()), { remote: true });
    }
    return true;
  };
  if (usingCgData()) {
    try { _dataStore.setItem(key, value); return remember(); } catch (_) { /* fall through */ }
  }
  try { localStorage.setItem(key, value); return remember(); }
  catch (e) { persistenceFailed = true; console.warn('[storage] could not persist', key); return false; }
}

/** Drop-in replacement for localStorage.removeItem. */
export function cgRemoveItem(key) {
  if (usingCgData()) {
    try { _dataStore.removeItem(key); return; } catch (_) { /* fall through */ }
  }
  try { localStorage.removeItem(key); } catch (_) {}
}
