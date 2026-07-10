/**
 * js/logic/playoffs.js — Playoff bracket display & round advancement helpers
 */

export const QF_SEED_PAIRS = [[1, 8], [2, 7], [3, 6], [4, 5]];

/** @param {object} result  series result with teamA, teamB, won */
export function seriesWinner(result) {
  return result.won ? result.teamA : result.teamB;
}

/** Scores for top/bottom teams in a matchup result. */
export function matchupScores(result, topTeam, bottomTeam) {
  const topIsA = result.teamA.name === topTeam.name;
  return {
    topScore:    topIsA ? result.playerWins : result.oppWins,
    bottomScore: topIsA ? result.oppWins   : result.playerWins,
    topWon:      topIsA ? result.won       : !result.won,
  };
}

/**
 * Builds a full bracket tree for rendering (QF → SF → Finals → Champion).
 * @param {object} po  S.playoffs
 */
export function getBracketDisplayState(po) {
  const qf = po.initialBracket.map(([top, bottom], i) => {
    const result = po.rounds[0]?.[i];
    const slot   = {
      top, bottom,
      topSeed:    QF_SEED_PAIRS[i][0],
      bottomSeed: QF_SEED_PAIRS[i][1],
      topScore:   null,
      bottomScore: null,
      topWon:     null,
      complete:   false,
      live:       false,
    };
    if (result) {
      const s = matchupScores(result, top, bottom);
      slot.topScore    = s.topScore;
      slot.bottomScore = s.bottomScore;
      slot.topWon      = s.topWon;
      slot.complete    = true;
    }
    return slot;
  });

  const sf = [0, 1].map(mi => {
    const r0 = po.rounds[0]?.[mi * 2];
    const r1 = po.rounds[0]?.[mi * 2 + 1];
    const top    = r0 ? seriesWinner(r0) : null;
    const bottom = r1 ? seriesWinner(r1) : null;
    const result = po.rounds[1]?.[mi];
    const slot   = { top, bottom, topScore: null, bottomScore: null, topWon: null, complete: false, live: false };
    if (result && top && bottom) {
      const s = matchupScores(result, top, bottom);
      slot.topScore    = s.topScore;
      slot.bottomScore = s.bottomScore;
      slot.topWon      = s.topWon;
      slot.complete    = true;
    }
    return slot;
  });

  const sf0 = po.rounds[1]?.[0];
  const sf1 = po.rounds[1]?.[1];
  const finalsTop    = sf0 ? seriesWinner(sf0) : null;
  const finalsBottom = sf1 ? seriesWinner(sf1) : null;
  const finalsResult = po.rounds[2]?.[0];
  const finals = {
    top: finalsTop, bottom: finalsBottom,
    topScore: null, bottomScore: null, topWon: null,
    complete: false, live: false,
  };
  if (finalsResult && finalsTop && finalsBottom) {
    const s = matchupScores(finalsResult, finalsTop, finalsBottom);
    finals.topScore    = s.topScore;
    finals.bottomScore = s.bottomScore;
    finals.topWon      = s.topWon;
    finals.complete    = true;
  }

  let champion = null;
  if (finalsResult && finalsTop && finalsBottom) {
    champion = seriesWinner(finalsResult);
  } else if (po.championTeam) {
    champion = po.championTeam;
  }

  // Live tick-state overlay for the active round
  const ts = po.tickState;
  if (ts?.results) {
    const ri = po.currentRound;
    ts.results.forEach((sr, i) => {
      const rev = sr.games.slice(0, ts.revealedGames);
      const topScore    = rev.filter(g => g === 'W').length;
      const bottomScore = rev.filter(g => g === 'L').length;
      const patch = { topScore, bottomScore, live: !ts.done, complete: ts.done };
      if (ri === 0 && qf[i]) Object.assign(qf[i], patch, { topWon: ts.done ? sr.won : null });
      if (ri === 1 && sf[i]) Object.assign(sf[i], patch, { topWon: ts.done ? sr.won : null });
      if (ri === 2 && i === 0) Object.assign(finals, patch, { topWon: ts.done ? sr.won : null });
    });
  }

  return { qf, sf, finals, champion, currentRound: po.currentRound };
}

/**
 * Applies a completed round's results and advances bracket state.
 * Always simulates the full bracket — player elimination does not halt advancement.
 * @returns {'champion'|'complete'|'eliminated'|'advanced'}
 */
export function applyPlayoffRound(po, results) {
  po.rounds.push(results);

  const playerResult = results.find(r => r.teamA.isPlayer || r.teamB.isPlayer);
  if (playerResult && !po.eliminated) {
    const playerWon = playerResult.teamA.isPlayer ? playerResult.won : !playerResult.won;
    if (!playerWon) {
      po.eliminated   = true;
      po.eliminatedIn = po.roundNames[po.currentRound];
    }
  }

  const winners = results.map(r => (r.won ? r.teamA : r.teamB));

  if (po.currentRound >= 2) {
    po.championTeam = winners[0] ?? null;
    po.champion     = !!po.championTeam?.isPlayer;
    po.currentRound = 3;
    return po.champion ? 'champion' : 'complete';
  }

  po.currentRound++;
  po.bracket = [];
  for (let i = 0; i < winners.length; i += 2) {
    if (winners[i + 1]) po.bracket.push([winners[i], winners[i + 1]]);
  }

  return po.eliminated ? 'eliminated' : 'advanced';
}
