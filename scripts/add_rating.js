'use strict';
/**
 * scripts/add_rating.js
 * Adds two fields to every player in players.json:
 *   ratingRaw — the raw weighted value of the stat line (native scale ~7–40)
 *   rating    — that value mapped onto a 0–100 (2K-style) overall
 * Run:  node scripts/add_rating.js
 *
 * Raw formula (linear weighted value of a stat line):
 *   ratingRaw = 1.76
 *             + ppg * 0.308
 *             + apg * 0.563
 *             + rpg * 0.712
 *             + spg * 1.139
 *             + bpg * 1.480
 *
 * Equivalently, relative to one point (÷0.308): an assist is worth ~1.8 pts,
 * a rebound ~2.3, a steal ~3.7, and a block ~4.8.
 *
 * 0–100 mapping: linear from the 2nd-percentile raw value (→ OVR_LO) to the
 * 99th-percentile raw value (→ OVR_HI), clamped to [OVR_MIN, OVR_MAX]. Anchors
 * are derived from the live data so the scale self-adjusts if stats change.
 * With the current DB this lands: median ≈ 74, stars ≈ 85, GOAT seasons ≈ 99.
 */
const fs   = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'players.json');
const db  = JSON.parse(fs.readFileSync(SRC, 'utf8'));

const BASE = 1.76;
const W = { ppg: 0.308, apg: 0.563, rpg: 0.712, spg: 1.139, bpg: 1.480 };

// 0–100 mapping knobs
const OVR_LO = 60;   // overall assigned to the low anchor (p2 raw)
const OVR_HI = 99;   // overall assigned to the high anchor (p99 raw)
const OVR_MIN = 55;  // hard floor (players below the low anchor)
const OVR_MAX = 99;  // hard ceiling

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function rawRating(p) {
  const raw = BASE
    + (p.ppg || 0) * W.ppg
    + (p.apg || 0) * W.apg
    + (p.rpg || 0) * W.rpg
    + (p.spg || 0) * W.spg
    + (p.bpg || 0) * W.bpg;
  return Math.round(raw * 10) / 10; // 1 decimal place
}

// ── Pass 1: raw value for everyone ────────────────────────────────────────────
const players = [];
for (const key of Object.keys(db)) {
  for (const p of db[key]) {
    p.ratingRaw = rawRating(p);
    players.push(p);
  }
}

// ── Derive mapping anchors from the raw distribution ─────────────────────────
const sorted = players.map(p => p.ratingRaw).sort((a, b) => a - b);
const pct = f => sorted[Math.floor(f * (sorted.length - 1))];
const lo = pct(0.02);
const hi = pct(0.99);

// ── Pass 2: mapped 0–100 overall ─────────────────────────────────────────────
let min = Infinity, max = -Infinity, sum = 0;
for (const p of players) {
  const scaled = OVR_LO + ((p.ratingRaw - lo) / (hi - lo)) * (OVR_HI - OVR_LO);
  p.rating = clamp(Math.round(scaled), OVR_MIN, OVR_MAX);
  sum += p.rating;
  if (p.rating < min) min = p.rating;
  if (p.rating > max) max = p.rating;
}

fs.writeFileSync(SRC, JSON.stringify(db, null, 2), 'utf8');

console.log(`Done.`);
console.log(`  Total players : ${players.length}`);
console.log(`  Raw anchors   : p2=${lo}  p99=${hi}`);
console.log(`  Overall range : ${min} … ${max}  (avg ${(sum / players.length).toFixed(1)})`);
console.log(`Wrote ${SRC}`);
