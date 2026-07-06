'use strict';
/**
 * scripts/inline_players.js
 * Reads players.json and writes js/data/players.js with the full
 * database inlined as a const — no fetch() at runtime.
 * Run once:  node scripts/inline_players.js
 */
const fs   = require('fs');
const path = require('path');

const root    = path.join(__dirname, '..');
const jsonSrc = path.join(root, 'players.json');
const jsDest  = path.join(root, 'js', 'data', 'players.js');

const db   = JSON.parse(fs.readFileSync(jsonSrc, 'utf8'));
const keys = Object.keys(db);

let playerCount = 0;
keys.forEach(k => { playerCount += db[k].length; });

// Strip fields that exist only for the data pipeline, not the game.
// `ratingRaw` is the intermediate weighted-stat value behind `rating`
// (see scripts/add_rating.js) — nothing at runtime reads it, so shipping
// it would cost ~19 KB per page load. It stays in players.json.
for (const k of keys) {
  for (const p of db[k]) delete p.ratingRaw;
}

// Emit compact JSON wrapped in JSON.parse(...): roughly half the bytes of
// pretty-printed output, and V8 parses a JSON string significantly faster
// (and with less peak memory) than an equivalent JS object literal.
// The double JSON.stringify safely escapes the payload as a JS string.
const jsonBody = `JSON.parse(${JSON.stringify(JSON.stringify(db))})`;

const output = `/**
 * js/data/players.js — Inlined Player Database (auto-generated)
 *
 * ${keys.length} team-era buckets · ${playerCount} players total
 *
 * DO NOT EDIT BY HAND.
 * Re-generate with:  node scripts/inline_players.js
 *
 * The \`DB\` export is a live binding (export let).
 * Once loadDatabase() is called, every importing module that reads
 * \`DB\` will see the fully populated object.
 */

/** @type {object|null} */
export let DB = null;

/**
 * Populates DB synchronously from the inlined data, then removes
 * the loading overlay.  Returns a resolved Promise so callers that
 * previously awaited the fetch-based version keep working unchanged.
 */
export function loadDatabase() {
  DB = PLAYER_DB;
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.remove();
  return Promise.resolve();
}

// ─── Data ────────────────────────────────────────────────────────────────────
// Placed at the end of the file so the public API is visible at the top.

const PLAYER_DB = ${jsonBody};
`;

fs.writeFileSync(jsDest, output, 'utf8');

const lines = output.split('\n').length;
const kbOut = (Buffer.byteLength(output) / 1024).toFixed(1);
console.log(`Written: ${jsDest}`);
console.log(`  Team-era buckets : ${keys.length}`);
console.log(`  Total players    : ${playerCount}`);
console.log(`  Output size      : ${kbOut} KB  (${lines} lines)`);
