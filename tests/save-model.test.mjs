import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProgress, mergeProgress, mergeDailyHistory, normalizeStreak } from '../js/logic/saveModel.js';

test('independent XP earnings survive repeated and reordered device merges', () => {
  const baseline = { xp: 1000 };
  const phone = normalizeProgress({ base: 1000, credits: { phone: 400 } });
  const laptop = normalizeProgress({ base: 1000, credits: { laptop: 200 } });
  const merged = mergeProgress(phone, laptop);
  assert.equal(merged.xp, 1600);
  assert.deepEqual(mergeProgress(merged, phone), merged);
  assert.deepEqual(mergeProgress(laptop, phone), merged);
  assert.deepEqual(mergeProgress(mergeProgress(baseline, phone), laptop), merged);
  assert.equal(mergeProgress(merged, baseline).xp, 1600);
});

test('daily attempts merge by date, count different days, and retain first attempts', () => {
  const first = { attempts: { '2026-09-01': { at: 10, wins: 70, passed: true } } };
  const second = { attempts: { '2026-09-02': { at: 20, wins: 60, passed: false }, '2026-09-01': { at: 30, wins: 82, passed: true } } };
  const merged = mergeDailyHistory(first, second);
  assert.equal(merged.played, 2);
  assert.equal(merged.wins, 1);
  assert.equal(merged.distribution['70-79'], 1);
  assert.equal(merged.distribution['80-82'], 0);
  assert.equal(Object.values(merged.distribution).reduce((a, b) => a + b), merged.played);
  assert.deepEqual(mergeDailyHistory(merged, first), merged);
  assert.deepEqual(mergeDailyHistory(second, first), merged);
});

test('hostile streak counters cannot become markup or non-finite values', () => {
  for (const streak of ['<img src=x onerror=alert(1)>', Infinity, NaN, {}, -1]) {
    assert.equal(normalizeStreak({ streak }).streak, 0);
  }
});
