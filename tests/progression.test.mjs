/**
 * tests/progression.test.mjs — pins the Levels + XP numbers to the plan.
 *
 * Everything here is a value from the design, not an implementation detail:
 * if a test fails, the system no longer pays what it was specified to pay.
 * That is the point — the tuning table in js/logic/progression.js is easy to
 * edit, so it needs something holding it to the agreed design.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

// progression.js persists through utils/crazygames.js, which reaches for
// localStorage at call time. Stub it before importing.
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
};
globalThis.window = globalThis;

const {
  playerDraftXp, computeRunXp, xpToReachLevel, levelForXp, levelProgress,
  titleForLevel, rewardsUpTo, addXp, getProgression, CHAMPION_BONUS_XP,
} = await import('../js/logic/progression.js');

test('per-player XP matches the plan tiers', () => {
  assert.equal(playerDraftXp(75), 10);   // role player
  assert.equal(playerDraftXp(80), 20);   // rotation, lower edge
  assert.equal(playerDraftXp(84), 20);   // rotation, upper edge
  assert.equal(playerDraftXp(85), 40);   // starter, lower edge
  assert.equal(playerDraftXp(91), 40);   // starter, upper edge
  assert.equal(playerDraftXp(92), 70);   // star, lower edge
  assert.equal(playerDraftXp(96), 70);   // star, upper edge
  assert.equal(playerDraftXp(97), 120);  // legend, lower edge
  assert.equal(playerDraftXp(99), 120);
  // A player with no rating must never crash or pay the top tier.
  assert.equal(playerDraftXp(undefined), 10);
});

test('level thresholds match the plan table for levels 1-10', () => {
  const expected = [0, 400, 1100, 2100, 3400, 5000, 6900, 9100, 11600, 14400];
  expected.forEach((xp, i) => assert.equal(xpToReachLevel(i + 1), xp, `level ${i + 1}`));
  // The curve continues past 10 rather than capping.
  assert.ok(xpToReachLevel(11) > 14400);
  assert.equal(levelForXp(0), 1);
  assert.equal(levelForXp(399), 1);
  assert.equal(levelForXp(400), 2);
  assert.equal(levelForXp(14400), 10);
});

test("the plan's worked example pays 1,227 XP and reaches level 3", () => {
  const starters = [{ overall: 97 }, { overall: 99 }, { overall: 93 }, { overall: 88 }, { overall: 99 }];
  const b = computeRunXp({ starters, avgRating: 95, chemScore: 85, wins: 66 });
  assert.equal(b.players, 470);
  assert.equal(b.complete, 100);
  assert.equal(b.ovrBand, 350);
  assert.equal(b.stars, 100);          // four starters at 92+
  assert.equal(b.chem, 75);
  assert.equal(b.teamQuality, 525);
  assert.equal(b.winXp, 132);          // 66 wins x 2
  assert.equal(b.total, 1227);

  const p = levelProgress(b.total);
  assert.equal(p.level, 3);
  assert.equal(p.into, 127);
  assert.equal(p.need, 1000);
});

test('team quality bonus tops out at 550 and bands are inclusive at the edges', () => {
  const five = ovr => Array.from({ length: 5 }, () => ({ overall: ovr }));
  assert.equal(computeRunXp({ starters: five(99), avgRating: 99, chemScore: 99 }).teamQuality, 550);
  const band = avg => computeRunXp({ starters: five(70), avgRating: avg, chemScore: 0 }).ovrBand;
  assert.equal(band(84.9), 0);
  assert.equal(band(85), 50);
  assert.equal(band(88), 100);
  assert.equal(band(91), 200);
  assert.equal(band(94), 350);
  // Chemistry is binary at chemTier()'s "Strong" floor of 65.
  const chem = score => computeRunXp({ starters: five(70), avgRating: 0, chemScore: score }).chem;
  assert.equal(chem(64), 0);
  assert.equal(chem(65), 75);
});

test('season bonuses: 2 per win, 500 for 82-0, 100 for the Daily, 250 for a title', () => {
  const five = Array.from({ length: 5 }, () => ({ overall: 70 }));
  assert.equal(computeRunXp({ starters: five, wins: 41 }).winXp, 82);
  assert.equal(computeRunXp({ starters: five, wins: 81 }).perfect, 0);
  assert.equal(computeRunXp({ starters: five, wins: 82 }).perfect, 500);
  assert.equal(computeRunXp({ starters: five, isDaily: true }).daily, 100);
  assert.equal(computeRunXp({ starters: five, isDaily: false }).daily, 0);
  assert.equal(CHAMPION_BONUS_XP, 250);
});

test('an incomplete roster earns no completion bonus, and empty input never throws', () => {
  const four = Array.from({ length: 4 }, () => ({ overall: 90 }));
  assert.equal(computeRunXp({ starters: four }).complete, 0);
  assert.equal(computeRunXp({}).total, 0);
});

test('rewards unlock at their plan levels and titles pick the highest earned', () => {
  assert.equal(titleForLevel(1), null);
  assert.equal(titleForLevel(2), 'Scout');
  assert.equal(titleForLevel(3), 'Scout');          // L3 is a frame, not a title
  assert.equal(titleForLevel(4), 'Assistant GM');
  assert.equal(titleForLevel(7), 'General Manager');
  assert.equal(titleForLevel(10), 'Hall of Fame GM');
  assert.equal(rewardsUpTo(1).length, 0);
  assert.equal(rewardsUpTo(10).length, 10);
});

test('addXp accumulates, resolves multi-level jumps, and never re-grants a reward', () => {
  store.clear();
  assert.deepEqual(getProgression(), { xp: 0, level: 1, rewards: [] });

  const first = addXp(1227);
  assert.equal(first.levelBefore, 1);
  assert.equal(first.levelAfter, 3);
  assert.equal(first.leveledUp, true);
  assert.deepEqual(first.newRewards.map(r => r.id), ['title-scout', 'frame-bronze']);
  assert.equal(getProgression().xp, 1227);

  // One huge run can cross several levels at once — every reward in between
  // has to come with it, not just the top one. 1,227 + 13,173 lands exactly
  // on the level 10 threshold (14,400), collecting levels 4 through 10.
  const jump = addXp(13173);
  assert.equal(jump.xpAfter, 14400);
  assert.equal(jump.levelBefore, 3);
  assert.equal(jump.levelAfter, 10);
  assert.equal(jump.newRewards.length, 8);   // levels 4,5,6,7,8,9 + both at 10

  // Already-held rewards are never handed out again.
  assert.equal(addXp(0).newRewards.length, 0);
  // XP only ever goes up.
  const total = getProgression().xp;
  assert.equal(addXp(-500).xpAfter, total);
  assert.equal(addXp(NaN).xpAfter, total);
});

test('a corrupt or absent saved entry reads as a fresh level 1 player', () => {
  store.clear();
  store.set('nba820_progress', '{not json');
  assert.deepEqual(getProgression(), { xp: 0, level: 1, rewards: [] });
  // Level always follows XP, even if a stored level disagrees.
  store.set('nba820_progress', JSON.stringify({ xp: 3400, level: 1, rewards: [] }));
  assert.equal(getProgression().level, 5);
});
