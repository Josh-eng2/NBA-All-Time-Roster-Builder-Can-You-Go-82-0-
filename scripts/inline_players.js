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

// Produce pretty JSON indented with 2 spaces, then wrap in the module scaffold.
const jsonBody = JSON.stringify(db, null, 2);

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
