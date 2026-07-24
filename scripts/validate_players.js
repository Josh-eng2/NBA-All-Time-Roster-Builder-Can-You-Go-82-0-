'use strict';
/**
 * scripts/validate_players.js
 * Structural sanity checks for players.json — run after every player
 * data audit batch (see docs/player-data-audit/rubric.md).
 *
 * This is NOT a realism check — it only catches mechanical mistakes
 * (typos, duplicate ids, out-of-range values, wrong trait counts) that
 * would otherwise sit undetected across many batches.
 *
 * Run:  node scripts/validate_players.js
 * Exits non-zero and prints every violation if any are found.
 */
const fs   = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'players.json');

const ARCHETYPES = new Set([
  'Playmaker', 'Sharpshooter', 'Lockdown Defender',
  'Slasher', 'Paint Beast', 'Two-Way Star',
]);
const POSITIONS = new Set(['PG', 'SG', 'SF', 'PF', 'C']);

const STAT_BOUNDS = {
  ppg: [0, 50],
  rpg: [0, 30],
  apg: [0, 20],
  spg: [0, 6],
  bpg: [0, 8],
};

const BUCKET_KEY_RE = /^[A-Za-z]+_(19[6-9]0s|20[0-2]0s)$/;

function main() {
  let raw;
  try {
    raw = fs.readFileSync(SRC, 'utf8');
  } catch (e) {
    fail([`Could not read ${SRC}: ${e.message}`]);
  }

  let db;
  try {
    db = JSON.parse(raw);
  } catch (e) {
    fail([`players.json is not valid JSON: ${e.message}`]);
  }

  const errors = [];
  const idsSeen = new Map(); // id -> [ "Team_decade / Name", ... ]

  for (const bucketKey of Object.keys(db)) {
    if (!BUCKET_KEY_RE.test(bucketKey)) {
      errors.push(`Bucket key "${bucketKey}" doesn't match TEAM_decade pattern`);
    }

    const players = db[bucketKey];
    if (!Array.isArray(players)) {
      errors.push(`Bucket "${bucketKey}" is not an array`);
      continue;
    }

    for (const p of players) {
      const where = `${bucketKey} / ${p.name || p.id || '(unnamed)'}`;

      if (!p.id || typeof p.id !== 'string') {
        errors.push(`${where}: missing or invalid "id"`);
      } else {
        const label = `${bucketKey} / ${p.name || p.id}`;
        if (!idsSeen.has(p.id)) idsSeen.set(p.id, []);
        idsSeen.get(p.id).push(label);
      }

      if (!p.name || typeof p.name !== 'string') {
        errors.push(`${where}: missing or invalid "name"`);
      }

      if (!POSITIONS.has(p.pos)) {
        errors.push(`${where}: invalid pos "${p.pos}" (must be one of ${[...POSITIONS].join(', ')})`);
      }

      for (const [stat, [min, max]] of Object.entries(STAT_BOUNDS)) {
        const v = p[stat];
        if (typeof v !== 'number' || Number.isNaN(v)) {
          errors.push(`${where}: "${stat}" is not a number (${JSON.stringify(v)})`);
        } else if (v < min || v > max) {
          errors.push(`${where}: "${stat}" = ${v} is outside sane bounds [${min}, ${max}]`);
        }
      }

      if (!ARCHETYPES.has(p.archetype)) {
        errors.push(`${where}: invalid archetype "${p.archetype}" (must be one of ${[...ARCHETYPES].join(', ')})`);
      }

      if (!Array.isArray(p.traits)) {
        errors.push(`${where}: "traits" is not an array`);
      } else if (p.traits.length !== 2 && p.traits.length !== 3) {
        errors.push(`${where}: "traits" has ${p.traits.length} entries (must be 2 or 3)`);
      } else if (p.traits.some(t => typeof t !== 'string' || !t.trim())) {
        errors.push(`${where}: "traits" contains an empty/non-string entry`);
      }

      if (typeof p.popularity !== 'number' || !Number.isInteger(p.popularity)) {
        errors.push(`${where}: "popularity" = ${JSON.stringify(p.popularity)} is not an integer`);
      }
    }
  }

  for (const [id, labels] of idsSeen) {
    if (labels.length > 1) {
      errors.push(`Duplicate id "${id}" used by: ${labels.join(' | ')}`);
    }
  }

  if (errors.length) fail(errors);

  const totalPlayers = Object.values(db).reduce((n, arr) => n + arr.length, 0);
  console.log(`OK — ${Object.keys(db).length} buckets, ${totalPlayers} players, no structural issues found.`);
}

function fail(errors) {
  console.error(`FAILED — ${errors.length} issue(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

main();
