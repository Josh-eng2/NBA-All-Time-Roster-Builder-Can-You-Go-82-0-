/**
 * js/logic/modes.js — Mode config & helpers for primary + More Modes entries.
 */

import { S } from './state.js';

/** @typedef {'solo'|'blind'|'daily'|'1v1'|'gm-ai'|'dynasty-duel'|'defense'|'fans'} ModeId */

export const MODE_CONFIG = {
  solo:            { draft: 'solo',   postDraft: 'season',        pity: true,  skips: 1, simProfile: 'classic' },
  blind:           { draft: 'solo',   postDraft: 'season',        pity: true,  skips: 1, simProfile: 'classic' },
  daily:           { draft: 'solo',   postDraft: 'season',        pity: true,  skips: 0, simProfile: 'classic' },
  '1v1':           { draft: 'dual',   postDraft: 'series',        pity: false, skips: 1, simProfile: 'classic' },
  'gm-ai':         { draft: 'dual',   postDraft: 'series',        pity: false, skips: 1, simProfile: 'classic' },
  'dynasty-duel':  { draft: 'solo',   postDraft: 'dynastySeries', pity: true,  skips: 0, simProfile: 'classic' },
  defense:         { draft: 'solo',   postDraft: 'season',        pity: true,  skips: 1, simProfile: 'defense' },
  fans:            { draft: 'solo',   postDraft: 'season',        pity: true,  skips: 1, simProfile: 'fans' },
};

export function getModeConfig(mode = S?.mode) {
  return MODE_CONFIG[mode] || MODE_CONFIG.solo;
}

/** Dual-roster snake draft (human 1v1 or GM vs AI). */
export function isDualDraft(mode = S?.mode) {
  return mode === '1v1' || mode === 'gm-ai';
}

/** Modes reached from the Challenges screen (not primary tiles). */
export const MORE_MODES = [
  { id: 'gm-ai',          action: 'mode-gm-ai',          label: 'GM vs AI',      emoji: '🤖',
    desc: 'Draft against a CPU general manager, then face its lineup in a best-of-7.' },
  { id: 'dynasty-duel',   action: 'mode-dynasty-duel',   label: 'Dynasty Duel',  emoji: '👑',
    desc: 'Beat a random legendary team in a best-of-7 — play as often as you want.' },
  { id: 'defense',        action: 'mode-defense',        label: 'Defense Only',  emoji: '🛡️',
    desc: 'Stocks & boards win it — scoring volume matters less this sim.' },
  { id: 'fans',           action: 'mode-fans',           label: 'Fans First',    emoji: '📣',
    desc: 'Optimize star power — score by popularity, fans, and wins.' },
];

/** Display labels for series UI (1v1 / GM vs AI / Dynasty Duel). */
export function seriesLabels() {
  if (S.mode === 'gm-ai') {
    return { p1: 'You', p2: 'AI GM', p1Short: 'YOU', p2Short: 'AI' };
  }
  if (S.mode === 'dynasty-duel') {
    const name = S.dynastyOpponent?.name || 'Dynasty';
    return { p1: 'You', p2: name, p1Short: 'YOU', p2Short: 'DYN' };
  }
  return { p1: 'Player 1', p2: 'Player 2', p1Short: 'P1', p2Short: 'P2' };
}

/** Fans First run score. */
export function fansFirstScore(avgPopularity, fansM, wins) {
  return Math.round((avgPopularity ?? 50) * 10 + (fansM ?? 0) * 5 + (wins ?? 0) * 2);
}

export function fansFirstPassed(avgPopularity, wins) {
  return (avgPopularity ?? 0) >= 70 && (wins ?? 0) >= 35;
}
