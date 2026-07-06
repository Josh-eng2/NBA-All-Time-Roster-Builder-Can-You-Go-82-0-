'use strict';
/**
 * scripts/audit_stats.js — Realism triage for the player-data audit.
 *
 * This is NOT structural validation (that's validate_players.js). It's a
 * heuristic pass that surfaces the LIKELY-fabricated / copy-pasted / implausible
 * stat lines so each audit batch can fix the worst offenders first instead of
 * eyeballing 938 rows blind. Every flag is a *candidate for review*, not a
 * proven error — verify against a real source before changing anything
 * (WebSearch works; Basketball-Reference blocks direct fetch).
 *
 * Run:             node scripts/audit_stats.js
 * One decade only: node scripts/audit_stats.js --decade=1980
 *
 * Checks:
 *   1. DUP    — different players sharing an identical 5-stat line (copy-paste).
 *   2. SELFDUP— the same player with an identical line in two buckets.
 *   3. OUT    — a single stat beyond an era-aware plausibility ceiling.
 *   4. SUPER  — "superman" lines leading 3+ categories at once (near-impossible).
 */
const fs   = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'players.json');
const db  = JSON.parse(fs.readFileSync(SRC, 'utf8'));

const arg      = process.argv.find(a => a.startsWith('--decade='));
const onlyDec  = arg ? arg.split('=')[1].replace(/s$/, '') : null;

// A player's decade comes straight from its bucket key (e.g. "Bulls_1980s").
const DECADE_OF = key => (key.match(/_(\d{4})s$/) || [])[1];

// ── Era-aware plausibility ceilings ───────────────────────────────────────────
// Set just ABOVE the real single-season per-game records, so an OUTLIER flag
// means "beyond anything ever recorded" = almost certainly fabricated. Real
// record-holders (Wilt 50.4 ppg / 27.2 rpg, Stockton 14.5 apg, Robertson 3.67
// spg, Eaton 5.56 bpg, Rodman 18.7 modern rpg) sit just under these and won't
// trip. Pre-1974 steals/blocks are estimates (not an official stat yet).
function ceilings(decade) {
  const d = Number(decade);
  return {
    ppg: 51,
    apg: 15,
    rpg: d <= 1970 ? 28 : 19,
    spg: 3.7,
    bpg: 5.6,
  };
}

const flat = [];
for (const [key, players] of Object.entries(db)) {
  const decade = DECADE_OF(key);
  if (onlyDec && decade !== onlyDec) continue;
  for (const p of players) flat.push({ ...p, _bucket: key, _decade: decade });
}

const findings = { DUP: [], SELFDUP: [], OUT: [], SUPER: [] };

// ── 1 & 2: duplicate stat lines ───────────────────────────────────────────────
const lineKey = p => [p.ppg, p.rpg, p.apg, p.spg, p.bpg].join('|');
const byLine  = {};
for (const p of flat) (byLine[lineKey(p)] ||= []).push(p);
for (const [line, group] of Object.entries(byLine)) {
  if (group.length < 2) continue;
  const names = new Set(group.map(g => g.name));
  const entry = { line, players: group.map(g => `${g.name} (${g._bucket})`) };
  if (names.size > 1) findings.DUP.push(entry);
  else               findings.SELFDUP.push(entry);
}

// ── 3: single-stat outliers ───────────────────────────────────────────────────
for (const p of flat) {
  const c = ceilings(p._decade);
  for (const k of ['ppg', 'rpg', 'apg', 'spg', 'bpg']) {
    if (p[k] > c[k]) {
      findings.OUT.push({ who: `${p.name} (${p._bucket})`, stat: k, val: p[k], ceiling: c[k] });
    }
  }
}

// ── 4: "superman" — leads 3+ categories at once ──────────────────────────────
for (const p of flat) {
  const hits = [];
  if (p.ppg >= 28) hits.push(`${p.ppg}pt`);
  if (p.rpg >= (Number(p._decade) <= 1970 ? 18 : 12)) hits.push(`${p.rpg}rb`);
  if (p.apg >= 8)  hits.push(`${p.apg}as`);
  if (p.spg >= 2.5) hits.push(`${p.spg}st`);
  if (p.bpg >= 2.5) hits.push(`${p.bpg}bk`);
  if (hits.length >= 3) findings.SUPER.push({ who: `${p.name} (${p._bucket})`, hits });
}

// ── Report ────────────────────────────────────────────────────────────────────
function line(s) { console.log(s); }
line(`\n=== Player-data realism triage — ${flat.length} players${onlyDec ? ` (${onlyDec}s only)` : ''} ===`);
line(`(candidates for review, not proven errors — verify before editing)\n`);

line(`① COPY-PASTE — identical 5-stat line across DIFFERENT players: ${findings.DUP.length}`);
for (const f of findings.DUP) line(`   [${f.line}]  ${f.players.join('  |  ')}`);

line(`\n② SELF-DUP — same player, identical line in two buckets: ${findings.SELFDUP.length}`);
for (const f of findings.SELFDUP) line(`   [${f.line}]  ${f.players.join('  |  ')}`);

line(`\n③ OUTLIER — a stat past its era-aware ceiling: ${findings.OUT.length}`);
for (const f of findings.OUT) line(`   ${f.who}: ${f.stat}=${f.val} (ceiling ${f.ceiling})`);

line(`\n④ SUPERMAN — leads 3+ categories at once: ${findings.SUPER.length}`);
for (const f of findings.SUPER) line(`   ${f.who}: ${f.hits.join(' / ')}`);

const total = findings.DUP.length + findings.SELFDUP.length + findings.OUT.length + findings.SUPER.length;
line(`\nTotal flags: ${total}\n`);
