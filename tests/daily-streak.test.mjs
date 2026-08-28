/**
 * The Daily Challenge streak — the mode's only reason to come back tomorrow,
 * and the thing the install prompt is timed against.
 *
 * It used to reset to zero on any failed day. Against a catalog whose reference
 * pass rate is ~39% that put the expected streak length under one day, so the
 * 🔥 counter read 0 or 1 essentially forever and the prompt could never fire.
 * One forgiven miss per chain is the fix; these tests pin its exact shape,
 * because "forgiving" is only correct if it is also finite.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { installDom } from './dom-stub.mjs';

installDom();

const { mod } = await import('./helpers.mjs');
const storage = await import(mod('js/utils/storage.js'));

const DAY = ['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06'];

function reset() {
  globalThis.localStorage.clear();
}

/** Records a day's result and returns the streak it leaves behind. */
function play(date, passed) {
  return storage.markDailyPlayed({
    date, wins: passed ? 60 : 20, losses: passed ? 22 : 62,
    chemScore: 70, champion: false, challengeId: 'win-65', passed, score: 0,
  });
}

test('consecutive passes build the streak', () => {
  reset();
  assert.equal(play(DAY[0], true), 1);
  assert.equal(play(DAY[1], true), 2);
  assert.equal(play(DAY[2], true), 3);
});

test('one missed day is forgiven and the streak keeps counting', () => {
  reset();
  play(DAY[0], true);
  play(DAY[1], true);
  assert.equal(play(DAY[2], false), 2, 'a single miss must not reset the streak');
  assert.equal(play(DAY[3], true), 3, 'the chain continues through the forgiven day');
});

test('two misses in a row end the streak', () => {
  reset();
  play(DAY[0], true);
  play(DAY[1], true);
  assert.equal(play(DAY[2], false), 2, 'first miss is forgiven');
  assert.equal(play(DAY[3], false), 0, 'the second consecutive miss ends it');
  assert.equal(play(DAY[4], true), 1, 'and the next pass starts a fresh chain');
});

test('the grace is one per chain, not one per miss', () => {
  reset();
  play(DAY[0], true);
  play(DAY[1], false);          // grace spent
  assert.equal(play(DAY[2], true), 2);
  assert.equal(play(DAY[3], false), 0,
    'a chain that already spent its grace must not be forgiven twice');
});

test('a fresh chain gets its grace back', () => {
  reset();
  play(DAY[0], true);
  play(DAY[1], false);
  play(DAY[2], false);          // chain dead
  assert.equal(play(DAY[3], true), 1, 'new chain');
  assert.equal(play(DAY[4], false), 1, 'the new chain has its own grace');
  assert.equal(play(DAY[5], true), 2);
});

test('skipping a day entirely ends the streak — the grace only covers a played miss', () => {
  reset();
  play(DAY[0], true);
  play(DAY[1], true);
  assert.equal(play(DAY[4], true), 1, 'a two-day gap is not a continuous chain');
});

test('replaying the same day does not double-count', () => {
  reset();
  play(DAY[0], true);
  assert.equal(play(DAY[1], true), 2);
  assert.equal(play(DAY[1], true), 2, 'a same-day double-call is idempotent');
  reset();
  play(DAY[0], true);
  assert.equal(play(DAY[1], false), 1);
  assert.equal(play(DAY[1], false), 1, 'a repeated failed day must not burn a second grace');
});

test('currentDailyStreak keeps showing a streak through the forgiven day', () => {
  reset();
  play(DAY[0], true);
  play(DAY[1], true);
  play(DAY[2], false);                                   // forgiven
  assert.equal(storage.currentDailyStreak(DAY[2]), 2, 'still alive on the missed day');
  assert.equal(storage.currentDailyStreak(DAY[3]), 2, 'still alive the day after');
  assert.equal(storage.currentDailyStreak(DAY[4]), 0, 'dead once the gap widens');
});

test('a streak record written before the grace existed still reads correctly', () => {
  reset();
  // Legacy shape: no graceDate field at all.
  globalThis.localStorage.setItem('nba820_dailyStreak',
    JSON.stringify({ streak: 5, lastPassDate: DAY[0] }));
  assert.equal(storage.currentDailyStreak(DAY[1]), 5, 'legacy chain still counts');
  assert.equal(play(DAY[1], false), 5, 'and its unspent grace is available');
});
