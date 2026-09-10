// Read-only release guard. Usage: node scripts/check_cache_version.mjs <base-ref>
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const cwd = fileURLToPath(new URL('../', import.meta.url));
const git = args => execFileSync('git', ['-c', 'core.safecrlf=false', ...args], { cwd, encoding: 'utf8' });
const base = process.argv[2];
if (!base || !/^[a-zA-Z0-9_./~-]+$/.test(base)) throw new Error('Supply a valid base ref');
const current = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const previous = git(['show', `${base}:sw.js`]);
const version = text => text.match(/const CACHE_VERSION = '([^']+)'/)?.[1];
const changed = new Set(git(['diff', '--name-only', base, '--']).trim().split(/\r?\n/));
const precached = [...(current + previous).matchAll(/'\.\/([^']+)'/g)].map(m => m[1]);
if (changed.has('sw.js') || precached.some(path => changed.has(path))) {
  assert.notEqual(version(current), version(previous), 'A precached file changed without a cache version bump');
}
const dailyInputs = ['js/logic/dailyBoards.js', 'js/logic/challenge.js', 'js/logic/state.js', 'js/data/players.js'];
if (dailyInputs.some(path => changed.has(path))) {
  let oldDaily = null;
  if (git(['ls-tree', '--name-only', base, '--', 'js/logic/dailyBoards.js']).trim()) {
    oldDaily = git(['show', `${base}:js/logic/dailyBoards.js`]);
  }
  if (oldDaily) {
    const dailyVersion = text => text.match(/DAILY_RULES_VERSION = '([^']+)'/)?.[1];
    const nextDaily = readFileSync(new URL('../js/logic/dailyBoards.js', import.meta.url), 'utf8');
    assert.notEqual(dailyVersion(nextDaily), dailyVersion(oldDaily), 'Daily inputs changed without separating the leaderboard rules version');
  }
}
console.log(`Cache version check passed: ${version(previous)} → ${version(current)}`);
