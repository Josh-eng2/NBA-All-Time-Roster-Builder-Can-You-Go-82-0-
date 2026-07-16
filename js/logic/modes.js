/**
 * js/logic/modes.js — Mode config & helpers for primary + More Modes entries.
 */

import { S } from './state.js';

/** @typedef {'solo'|'blind'|'daily'|'1v1'|'gm-ai'|'boss-week'|'defense'|'fans'} ModeId */

export const MODE_CONFIG = {
  solo:       { draft: 'solo',   postDraft: 'season',     pity: true,  skips: 1, simProfile: 'classic' },
  blind:      { draft: 'solo',   postDraft: 'season',     pity: true,  skips: 1, simProfile: 'classic' },
  daily:      { draft: 'solo',   postDraft: 'season',     pity: true,  skips: 0, simProfile: 'classic' },
  '1v1':      { draft: 'dual',   postDraft: 'series',     pity: false, skips: 1, simProfile: 'classic' },
  'gm-ai':    { draft: 'dual',   postDraft: 'series',     pity: false, skips: 1, simProfile: 'classic' },
  'boss-week':{ draft: 'solo',   postDraft: 'bossSeries', pity: true,  skips: 0, simProfile: 'classic' },
  defense:    { draft: 'solo',   postDraft: 'season',     pity: true,  skips: 1, simProfile: 'defense' },
  fans:       { draft: 'solo',   postDraft: 'season',     pity: true,  skips: 1, simProfile: 'fans' },
};

export function getModeConfig(mode = S?.mode) {
  return MODE_CONFIG[mode] || MODE_CONFIG.solo;
}

/** Dual-roster snake draft (human 1v1 or GM vs AI). */
export function isDualDraft(mode = S?.mode) {
  return mode === '1v1' || mode === 'gm-ai';
}

/** Modes that use the More Modes dropdown (not primary tiles). */
export const MORE_MODES = [
  { id: 'gm-ai',     action: 'mode-gm-ai',     label: 'GM vs AI' },
  { id: 'boss-week', action: 'mode-boss-week', label: 'Boss of the Week' },
  { id: 'defense',   action: 'mode-defense',   label: 'Defense Only' },
  { id: 'fans',      action: 'mode-fans',      label: 'Fans First' },
];

/** Display labels for series UI (1v1 / GM vs AI / Boss). */
export function seriesLabels() {
  if (S.mode === 'gm-ai') {
    return { p1: 'You', p2: 'AI GM', p1Short: 'YOU', p2Short: 'AI' };
  }
  if (S.mode === 'boss-week') {
    const name = S.bossOfWeek?.name || 'Boss';
    return { p1: 'You', p2: name, p1Short: 'YOU', p2Short: 'BOSS' };
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
