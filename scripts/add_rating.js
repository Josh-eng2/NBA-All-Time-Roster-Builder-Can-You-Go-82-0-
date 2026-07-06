'use strict';
/**
 * scripts/add_rating.js
 * Adds a `rating` number to every player in players.json, computed from
 * their per-game stats. Run:  node scripts/add_rating.js
 *
 * Formula (linear weighted value of a stat line):
 *   rating = 1.76
 *          + ppg * 0.308
 *          + apg * 0.563
 *          + rpg * 0.712
 *          + spg * 1.139
 *          + bpg * 1.480
 *
 * Equivalently, relative to one point (÷0.308): an assist is worth ~1.8 pts,
 * a rebound ~2.3, a steal ~3.7, and a block ~4.8.
 *
 * Rounded to 1 decimal place.
 */
const fs   = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'players.json');
const db  = JSON.parse(fs.readFileSync(SRC, 'utf8'));

const BASE = 1.76;
const W = { ppg: 0.308, apg: 0.563, rpg: 0.712, spg: 1.139, bpg: 1.480 };

function formulaRating(p) {
  const raw = BASE
    + (p.ppg || 0) * W.ppg
    + (p.apg || 0) * W.apg
    + (p.rpg || 0) * W.rpg
    + (p.spg || 0) * W.spg
    + (p.bpg || 0) * W.bpg;
  return Math.round(raw * 10) / 10; // 1 decimal place
}

let total = 0, min = Infinity, max = -Infinity, sum = 0;

for (const key of Object.keys(db)) {
  for (const player of db[key]) {
    const r = formulaRating(player);
    player.rating = r;
    total++;
    sum += r;
    if (r < min) min = r;
    if (r > max) max = r;
  }
}

fs.writeFileSync(SRC, JSON.stringify(db, null, 2), 'utf8');

console.log(`Done.`);
console.log(`  Total players : ${total}`);
console.log(`  Rating range  : ${min} … ${max}`);
console.log(`  Average       : ${(sum / total).toFixed(2)}`);
console.log(`Wrote ${SRC}`);
