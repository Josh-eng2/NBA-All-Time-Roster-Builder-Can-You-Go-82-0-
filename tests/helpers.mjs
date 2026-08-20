/**
 * tests/helpers.mjs — bootstrap for the Node test suite.
 *
 * The game is a browser app with no build step, so the logic modules are
 * imported straight from js/ and run under Node. Two shims make that work:
 *
 *  • `document` — js/data/players.js removes the loading overlay after
 *    populating DB, and js/ui/render.js resolves #app at module scope.
 *    Only the logic layer is exercised here, so a stub with getElementById
 *    is enough.
 *  • nothing else. js/utils/firebase.js is import-safe under Node: its
 *    dynamic `import('https://…')` of the Firebase SDK rejects immediately
 *    (Node has no HTTPS import loader) and the module's own .catch() turns
 *    that into "leaderboard unavailable", so importing it makes no network
 *    request.
 *
 * Run the suite with:  node --test tests/
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

if (!globalThis.document) {
  globalThis.document = { getElementById: () => null };
}

/** Absolute file: URL for a repo-relative module path. */
export const mod = rel => new URL(`file://${join(ROOT, rel)}`).href;

let _ready = null;

/**
 * Loads the player DB once and applies secondary positions, exactly as
 * js/main.js does at startup. Returns the modules the tests share.
 */
export function loadGame() {
  if (!_ready) {
    _ready = (async () => {
      const players   = await import(mod('js/data/players.js'));
      const positions = await import(mod('js/logic/positions.js'));
      await players.loadDatabase();
      positions.applySecondaryPositions();
      const [state, draft, sim, chem, era, modes, playoffs, challenge, rematch, seasonTier] =
        await Promise.all([
          import(mod('js/logic/state.js')),
          import(mod('js/logic/draft.js')),
          import(mod('js/logic/simulation.js')),
          import(mod('js/logic/chemistry.js')),
          import(mod('js/logic/era.js')),
          import(mod('js/logic/modes.js')),
          import(mod('js/logic/playoffs.js')),
          import(mod('js/logic/challenge.js')),
          import(mod('js/logic/rematch.js')),
          import(mod('js/logic/seasonTier.js')),
        ]);
      // Re-import so DB is the populated live binding.
      const { DB } = await import(mod('js/data/players.js'));
      return { DB, state, draft, sim, chem, era, modes, playoffs, challenge, rematch, seasonTier };
    })();
  }
  return _ready;
}

/** Every DB entry flattened, with `team` and `decade` attached the way
 *  events.js placePlayer() attaches them to a drafted pick. */
export function flattenDb(DB) {
  const out = [];
  for (const [key, players] of Object.entries(DB)) {
    const cut    = key.lastIndexOf('_');
    const team   = key.slice(0, cut);
    const decade = key.slice(cut + 1);
    for (const p of players) out.push({ ...p, team, decade });
  }
  return out;
}

/** The highest-`overall` player at each position — a deterministic superteam. */
export function bestFive(all) {
  return ['PG', 'SG', 'SF', 'PF', 'C'].map(pos =>
    all.filter(p => p.pos === pos).sort((a, b) => b.overall - a.overall)[0]);
}

/** Deterministic PRNG installed over Math.random for a single test body. */
export function withSeededRandom(seed, fn) {
  const original = Math.random;
  let s = seed >>> 0;
  Math.random = () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try { return fn(); } finally { Math.random = original; }
}
