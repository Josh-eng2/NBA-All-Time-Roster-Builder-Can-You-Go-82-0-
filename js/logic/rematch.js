/**
 * js/logic/rematch.js — Shareable board codes ("rematch links")
 *
 * A finished run's share card invites the reader to beat the record. For that
 * invitation to mean anything the reader has to draft from the SAME board, so
 * every non-daily share carries a short code encoding the five (team, decade)
 * combos the wheel landed on plus the record to chase. Opening the link drops
 * the reader into a rematch run on that exact board.
 *
 * Why the literal spin sequence and not the RNG seed: pick() draws from a
 * single continuous seeded stream (state.js), so reproducing a board by
 * replaying a seed only holds while both players consume draws in lockstep.
 * A skip re-rolls (extra draw), and `draftedPlayerNames` blocks a player's
 * cross-era twin for whoever drafted him — which can drop a team/decade slot
 * out of one player's candidate list and not the other's. Either desyncs the
 * rest of the draft silently. Recording the five results the wheel actually
 * produced removes that whole class of problem: the recipient is handed the
 * same boards no matter what either player picked or skipped.
 *
 * The Daily Challenge deliberately has no code — every player already gets the
 * same board that day by construction, so a daily result shares as a plain
 * #/daily link (see buildDailyUrl) rather than duplicating the board in a URL.
 *
 * Wire format (14 chars, lowercase base36, URL-safe):
 *   [0]       version tag
 *   [1]       draft style — index into STYLES
 *   [2..11]   five 2-char slots, each (teamIndex * DECADES.length + decadeIndex)
 *   [12..13]  wins (0–82); losses are 82 - wins
 *
 * IMPORTANT: the encoding indexes into TEAMS and DECADES, so those arrays are
 * a wire format now. Appending entries is safe; reordering or removing any
 * invalidates every code already shared — bump VERSION if that ever happens.
 */

import { TEAMS, DECADES, TOTAL_ROUNDS } from './state.js';

/** Canonical public origin. Shared links always point at the real site, never
 *  at the CrazyGames / GameDistribution iframe or a localhost dev server the
 *  run happened to be played on. */
export const ORIGIN = 'https://canyougo820.com';

const VERSION    = 'a';
const SLOT_CHARS = 2;
const CODE_LEN   = 2 + SLOT_CHARS * TOTAL_ROUNDS + SLOT_CHARS;

/** Draft styles a rematch can replay. Index is part of the wire format —
 *  append only. Modes absent here don't produce codes: daily carries extra
 *  draft rules (and is already a shared board), defense/fans simulate on a
 *  different profile, and the dual-draft modes have no single board. */
const STYLES = ['solo', 'blind'];

const enc = n => n.toString(36).padStart(SLOT_CHARS, '0');

/** True when a run in this mode can be shared as a rematch. */
export function isRematchableMode(mode) {
  return STYLES.includes(mode) || mode === 'rematch';
}

/**
 * @param {{ board: Array<{team:string,decade:string}>, wins:number, style:string }} run
 * @returns {string|null} the code, or null if the run can't be encoded
 */
export function encodeBoardCode({ board, wins, style }) {
  if (!Array.isArray(board) || board.length !== TOTAL_ROUNDS) return null;
  const styleIdx = STYLES.indexOf(style);
  if (styleIdx < 0) return null;

  let out = VERSION + styleIdx.toString(36);
  for (const spin of board) {
    const t = TEAMS.indexOf(spin?.team);
    const d = DECADES.indexOf(spin?.decade);
    if (t < 0 || d < 0) return null;
    out += enc(t * DECADES.length + d);
  }
  return out + enc(Math.max(0, Math.min(82, Math.round(wins ?? 0))));
}

/**
 * @param {string} code
 * @returns {{ code:string, board:Array<{team:string,decade:string}>, style:string,
 *             wins:number, losses:number }|null} null when the code is malformed,
 *   truncated, from a future version, or points at a team/decade that no longer
 *   exists — callers fall back to a normal run rather than trusting it.
 */
export function decodeBoardCode(code) {
  if (typeof code !== 'string') return null;
  const c = code.trim().toLowerCase();
  if (c.length !== CODE_LEN || c[0] !== VERSION || !/^[0-9a-z]+$/.test(c)) return null;

  const style = STYLES[parseInt(c[1], 36)];
  if (!style) return null;

  const board = [];
  for (let i = 0; i < TOTAL_ROUNDS; i++) {
    const at = 2 + i * SLOT_CHARS;
    const n  = parseInt(c.slice(at, at + SLOT_CHARS), 36);
    if (!Number.isFinite(n)) return null;
    const team   = TEAMS[Math.floor(n / DECADES.length)];
    const decade = DECADES[n % DECADES.length];
    if (!team || !decade) return null;
    board.push({ team, decade });
  }

  const wins = parseInt(c.slice(2 + SLOT_CHARS * TOTAL_ROUNDS), 36);
  if (!Number.isFinite(wins) || wins < 0 || wins > 82) return null;

  return { code: c, board, style, wins, losses: 82 - wins };
}

// ── Link builders ─────────────────────────────────────────────────────────────
// Attribution lives in the query string (survives analytics, server logs and
// link unfurlers); the route and its payload live in the hash, which is where
// this app's client-side router already reads from.

/** Rematch link — same five boards, the sender's record as the target. */
export function buildRematchUrl(code) {
  return `${ORIGIN}/?ref=rematch#/rematch?c=${encodeURIComponent(code)}`;
}

/** Daily link — the day's board is shared by construction, so no code. */
export function buildDailyUrl() {
  return `${ORIGIN}/?ref=daily#/daily`;
}

/** Plain link, for results that carry no replayable board. */
export function buildPlainUrl() {
  return `${ORIGIN}/?ref=share`;
}
