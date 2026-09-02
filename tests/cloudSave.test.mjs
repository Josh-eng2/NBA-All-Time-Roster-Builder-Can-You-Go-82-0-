/**
 * The cloud-save merge — the one place in the accounts work where a bug
 * silently destroys progress a player spent months earning.
 *
 * The failure this file exists to prevent: a player is Level 12 with 40
 * legends on their phone and Level 8 with 15 on their laptop. A
 * last-write-wins merge run from the laptop takes the phone's progress away,
 * with no error, no crash, and nothing to notice until much later. Every
 * assertion below is ultimately about that.
 *
 * mergeSaves() is pure and synchronous, so all of it runs with no network, no
 * DOM and no clock. readLocalSave()/writeLocalSave() need storage, which a
 * ten-line stub provides.
 */
import test   from 'node:test';
import assert from 'node:assert/strict';

const {
  SCHEMA_VERSION, emptySave, readLocalSave, writeLocalSave, mergeSaves,
  scheduleUpload, flushUpload, cancelUpload,
} = await import(new URL('../js/utils/cloudSave.js', import.meta.url).href);

// ── Storage stub ──────────────────────────────────────────────────────────────
// cgGetItem/cgSetItem read globalThis.localStorage at call time, so installing
// this after the import is fine.
function installStorage(seed = {}) {
  const m = new Map(Object.entries(seed));
  globalThis.localStorage = {
    getItem(k) { return m.has(k) ? m.get(k) : null; },
    setItem(k, v) { m.set(k, String(v)); },
    removeItem(k) { m.delete(k); },
  };
  return m;
}

/** A snapshot with the given save sections filled in. */
function snap(save = {}, deviceUpdatedAt = 1000) {
  const base = emptySave();
  return {
    ...base,
    deviceUpdatedAt,
    save: { ...base.save, ...save },
  };
}

// ── Shape ─────────────────────────────────────────────────────────────────────

test('emptySave is the zero value every read and merge produces', () => {
  const e = emptySave();
  assert.equal(e.schemaVersion, SCHEMA_VERSION);
  assert.equal(e.save.progress.xp, 0);
  assert.deepEqual(e.save.legends, []);
  assert.deepEqual(e.save.leaderboard, []);
  assert.deepEqual(e.save.trophies, []);
  for (const mode of ['defense', 'fans', 'gm-ai', 'dynasty-duel']) {
    assert.deepEqual(e.save.modeBoards[mode], [], `${mode} board missing`);
  }
  assert.equal(e.save.daily.last, null);
  assert.equal(e.save.dynastyDuel.last, null);
  assert.equal(e.save.bests.bestStreak, 0);
});

test('a snapshot never carries a stored level — progression.js derives it from xp', () => {
  const merged = mergeSaves(snap({ progress: { xp: 5000, rewards: [] } }), null);
  assert.equal(merged.save.progress.xp, 5000);
  assert.ok(!('level' in merged.save.progress), 'level must not be persisted');
});

// ── Empty / absent sides ──────────────────────────────────────────────────────

test('merging two absent saves yields the zero value rather than throwing', () => {
  assert.deepEqual(mergeSaves(null, null), emptySave());
  assert.deepEqual(mergeSaves(undefined, null), emptySave());
});

test('empty local + populated remote keeps everything remote', () => {
  const remote = snap({
    progress: { xp: 9000, rewards: ['title-scout'] },
    legends:  ['p1', 'p2'],
  });
  const merged = mergeSaves(emptySave(), remote);
  assert.equal(merged.save.progress.xp, 9000);
  assert.deepEqual(merged.save.legends, ['p1', 'p2']);
});

test('populated local + no remote keeps everything local — the new-account case', () => {
  const local = snap({
    progress: { xp: 4200, rewards: ['title-scout', 'frame-bronze'] },
    legends:  ['a', 'b', 'c'],
    trophies: [{ date: 'Sep 1, 2026', wins: 82, losses: 0 }],
  });
  const merged = mergeSaves(local, null);
  assert.equal(merged.save.progress.xp, 4200);
  assert.deepEqual(merged.save.legends, ['a', 'b', 'c']);
  assert.equal(merged.save.trophies.length, 1);
});

// ── The headline case ─────────────────────────────────────────────────────────

test('two devices with real progress: XP takes the maximum, nothing is lost', () => {
  const phone  = snap({ progress: { xp: 21000, rewards: ['title-scout', 'title-gm'] },
                        legends: ['a', 'b', 'c', 'd'] }, 2000);
  const laptop = snap({ progress: { xp: 9000, rewards: ['title-scout', 'frame-bronze'] },
                        legends: ['c', 'd', 'e'] }, 1000);

  const merged = mergeSaves(laptop, phone);
  assert.equal(merged.save.progress.xp, 21000, 'the lower XP must never win');
  assert.deepEqual(
    [...merged.save.progress.rewards].sort(),
    ['frame-bronze', 'title-gm', 'title-scout'],
    'rewards union — an unlock is never revoked',
  );
  assert.deepEqual([...merged.save.legends].sort(), ['a', 'b', 'c', 'd', 'e']);
  assert.equal(merged.save.legends.length, 5, 'legends must not duplicate');
});

// ── Capped, sorted lists ──────────────────────────────────────────────────────

test('leaderboard merges, de-duplicates, re-sorts and stays within its cap of 20', () => {
  const mk = (wins, pop, tag) =>
    ({ date: 'Sep 1, 2026', teamName: tag, wins, losses: 82 - wins, avgPopularity: pop });
  const shared = mk(70, 100, 'shared');

  const a = snap({ leaderboard: [mk(82, 50, 'a1'), shared, mk(60, 50, 'a2')] });
  const b = snap({ leaderboard: [mk(75, 50, 'b1'), shared, mk(75, 200, 'b2')] });

  const out = mergeSaves(a, b).save.leaderboard;
  assert.equal(out.filter(e => e.teamName === 'shared').length, 1, 'identical entry kept twice');
  assert.equal(out.length, 5);
  assert.deepEqual(out.map(e => e.wins), [82, 75, 75, 70, 60], 'not sorted by wins desc');
  assert.equal(out[1].teamName, 'b2', 'popularity must break a wins tie');

  const many = snap({ leaderboard: Array.from({ length: 30 }, (_, i) => mk(i, 50, `x${i}`)) });
  assert.equal(mergeSaves(many, a).save.leaderboard.length, 20, 'cap of 20 exceeded');
});

test('trophies stay newest-first and within the cap of 12', () => {
  const t = (d, w) => ({ date: d, coachName: 'Jackson', wins: w, losses: 82 - w });
  const a = snap({ trophies: [t('Sep 1, 2026', 82), t('Aug 1, 2026', 70)] });
  const b = snap({ trophies: [t('Sep 5, 2026', 75), t('Aug 1, 2026', 70)] });

  const out = mergeSaves(a, b).save.trophies;
  assert.equal(out.length, 3, 'the duplicate championship was kept twice');
  assert.deepEqual(out.map(e => e.date), ['Sep 5, 2026', 'Sep 1, 2026', 'Aug 1, 2026']);

  const many = snap({ trophies: Array.from({ length: 20 }, (_, i) => t(`Sep ${i + 1}, 2026`, 82)) });
  assert.equal(mergeSaves(many, a).save.trophies.length, 12, 'cap of 12 exceeded');
});

test('each mode board sorts by its own comparator, matching storage.js', () => {
  const a = snap({ modeBoards: {
    defense:        [{ wins: 60, teamStocks: 900 }, { wins: 60, teamStocks: 500 }],
    fans:           [{ score: 10, wins: 50 }],
    'gm-ai':        [{ won: false, margin: 20, strength: 5 }],
    'dynasty-duel': [{ score: 100 }],
  } });
  const b = snap({ modeBoards: {
    defense:        [{ wins: 82, teamStocks: 100 }],
    fans:           [{ score: 99, wins: 1 }, { score: 10, wins: 70 }],
    'gm-ai':        [{ won: true, margin: 1, strength: 1 }],
    'dynasty-duel': [{ score: 400 }],
  } });

  const m = mergeSaves(a, b).save.modeBoards;
  assert.deepEqual(m.defense.map(e => e.wins), [82, 60, 60], 'defense: wins desc');
  assert.equal(m.defense[1].teamStocks, 900, 'defense: stocks break a wins tie');
  assert.deepEqual(m.fans.map(e => e.score), [99, 10, 10], 'fans: score desc');
  assert.equal(m.fans[1].wins, 70, 'fans: wins break a score tie');
  assert.equal(m['gm-ai'][0].won, true, 'gm-ai: a win outranks a loss');
  assert.deepEqual(m['dynasty-duel'].map(e => e.score), [400, 100]);

  const many = snap({ modeBoards: { fans: Array.from({ length: 30 }, (_, i) => ({ score: i })) } });
  assert.equal(mergeSaves(many, b).save.modeBoards.fans.length, 20, 'mode cap of 20 exceeded');
});

// ── Daily ─────────────────────────────────────────────────────────────────────

test('daily lifetime stats take a per-counter maximum', () => {
  const a = snap({ daily: { last: null, streak: null, stats: {
    played: 30, wins: 12, currentStreak: 2, maxStreak: 9,
    lastPlayedDate: '2026-08-30', distribution: { '0-39': 5, '80-82': 1 },
  } } });
  const b = snap({ daily: { last: null, streak: null, stats: {
    played: 22, wins: 20, currentStreak: 5, maxStreak: 4,
    lastPlayedDate: '2026-09-02', distribution: { '0-39': 2, '70-79': 7 },
  } } });

  const s = mergeSaves(a, b).save.daily.stats;
  assert.equal(s.played, 30);
  assert.equal(s.wins, 20);
  assert.equal(s.maxStreak, 9);
  assert.equal(s.lastPlayedDate, '2026-09-02', 'the later play date must win');
  assert.deepEqual(s.distribution, { '0-39': 5, '80-82': 1, '70-79': 7 },
    'every bin takes its own maximum and no bin is dropped');
});

test('daily streak follows the later pass date, not the larger number', () => {
  const stale = snap({ daily: { last: null, stats: null,
    streak: { streak: 40, lastPassDate: '2026-01-01' } } });
  const live  = snap({ daily: { last: null, stats: null,
    streak: { streak: 3, lastPassDate: '2026-09-02' } } });

  const s = mergeSaves(stale, live).save.daily.streak;
  assert.equal(s.streak, 3, 'taking the bigger number fabricates a chain that never happened');
  assert.equal(s.lastPassDate, '2026-09-02');

  // Same anchor day is the same chain seen twice — the longer count is real.
  const sameA = snap({ daily: { last: null, stats: null, streak: { streak: 4, lastPassDate: '2026-09-02' } } });
  const sameB = snap({ daily: { last: null, stats: null, streak: { streak: 6, lastPassDate: '2026-09-02' } } });
  assert.equal(mergeSaves(sameA, sameB).save.daily.streak.streak, 6);
});

test("today's Daily lock cannot be dodged by switching devices", () => {
  const played = { date: '2026-09-02', wins: 55, passed: false, score: 550, at: 1000 };
  const none   = snap({ daily: { last: null, streak: null, stats: null } });

  // A fresh device must inherit the lock rather than grant a second attempt.
  assert.deepEqual(
    mergeSaves(none, snap({ daily: { last: played, streak: null, stats: null } })).save.daily.last,
    played,
  );

  // Same day on both sides: the first attempt is the one that counted.
  const first  = { date: '2026-09-02', wins: 40, score: 400, at: 1000 };
  const second = { date: '2026-09-02', wins: 82, score: 1020, at: 9000 };
  const a = snap({ daily: { last: first,  streak: null, stats: null } });
  const b = snap({ daily: { last: second, streak: null, stats: null } });
  assert.equal(mergeSaves(a, b).save.daily.last.at, 1000, 'a replay must not overwrite the first attempt');
  assert.equal(mergeSaves(b, a).save.daily.last.at, 1000, 'and must not depend on merge order');

  // A newer day supersedes an older one.
  const older = { date: '2026-09-01', wins: 82, at: 1 };
  const newer = { date: '2026-09-02', wins: 10, at: 2 };
  assert.equal(
    mergeSaves(snap({ daily: { last: newer, streak: null, stats: null } }),
               snap({ daily: { last: older, streak: null, stats: null } })).save.daily.last.date,
    '2026-09-02',
  );
});

// ── Dynasty Duel ──────────────────────────────────────────────────────────────

test('dynasty duel locks on the later week and keeps the first attempt', () => {
  const wk1 = { weekKey: '2026-08-24', won: true,  score: 300, at: 100 };
  const wk2 = { weekKey: '2026-08-31', won: false, score: 10,  at: 200 };
  const a = snap({ dynastyDuel: { last: wk1, streak: { streak: 5, lastWinWeek: '2026-08-24' } } });
  const b = snap({ dynastyDuel: { last: wk2, streak: { streak: 0, lastWinWeek: null } } });

  const d = mergeSaves(a, b).save.dynastyDuel;
  assert.equal(d.last.weekKey, '2026-08-31', 'the later week must win');
  assert.equal(d.streak.streak, 5, 'a dated streak beats an undated zero');

  const same = mergeSaves(
    snap({ dynastyDuel: { last: { weekKey: '2026-08-31', at: 500 }, streak: null } }),
    snap({ dynastyDuel: { last: { weekKey: '2026-08-31', at: 900 }, streak: null } }),
  );
  assert.equal(same.save.dynastyDuel.last.at, 500, 'same week keeps the first attempt');
});

// ── Bests ─────────────────────────────────────────────────────────────────────

test('personal bests take the maximum; untimestamped fields follow the newer save', () => {
  const older = snap({ bests: {
    best: { wins: 82, losses: 0 }, bestStreak: 30,
    lastRun: { wins: 82, losses: 0, tip: 'old' }, coach: 'jackson',
  } }, 1000);
  const newer = snap({ bests: {
    best: { wins: 40, losses: 42 }, bestStreak: 12,
    lastRun: { wins: 40, losses: 42, tip: 'new' }, coach: 'popovich',
  } }, 5000);

  const b = mergeSaves(older, newer).save.bests;
  assert.deepEqual(b.best, { wins: 82, losses: 0 }, 'a best is monotonic');
  assert.equal(b.bestStreak, 30);
  assert.equal(b.lastRun.tip, 'new', 'lastRun carries no timestamp — the newer save wins');
  assert.equal(b.coach, 'popovich');
  assert.equal(mergeSaves(newer, older).save.bests.lastRun.tip, 'new', 'and not by argument order');
});

// ── Robustness ────────────────────────────────────────────────────────────────

test('a corrupt or hostile remote save cannot damage a healthy local one', () => {
  const local = snap({
    progress: { xp: 12345, rewards: ['title-gm'] },
    legends:  ['a', 'b'],
    trophies: [{ date: 'Sep 1, 2026', wins: 82 }],
  });

  for (const junk of [
    'a string', 42, [], true,
    { save: null },
    { save: 'nope' },
    { save: { progress: 'nope', legends: 'nope', leaderboard: {}, trophies: 7 } },
    { save: { progress: { xp: NaN }, legends: [1, 2, null], modeBoards: 'nope' } },
    { save: { daily: 'nope', dynastyDuel: 5, bests: [] } },
    { save: { progress: { xp: -999, rewards: 'nope' } } },
  ]) {
    const merged = mergeSaves(local, junk);
    assert.equal(merged.save.progress.xp, 12345, `xp lost against ${JSON.stringify(junk)}`);
    assert.deepEqual(merged.save.legends, ['a', 'b'], 'legends lost');
    assert.equal(merged.save.trophies.length, 1, 'trophies lost');
  }
});

test('merging does not mutate either input', () => {
  const a = snap({ progress: { xp: 100, rewards: ['x'] }, legends: ['a'] });
  const b = snap({ progress: { xp: 200, rewards: ['y'] }, legends: ['b'] });
  const beforeA = JSON.stringify(a);
  const beforeB = JSON.stringify(b);
  mergeSaves(a, b);
  assert.equal(JSON.stringify(a), beforeA, 'left argument mutated');
  assert.equal(JSON.stringify(b), beforeB, 'right argument mutated');
});

test('monotonic fields converge regardless of merge order', () => {
  const a = snap({
    progress: { xp: 700, rewards: ['r1'] }, legends: ['a', 'b'],
    daily: { last: null, streak: { streak: 2, lastPassDate: '2026-09-01' },
             stats: { played: 5, wins: 1, maxStreak: 2, distribution: { '0-39': 5 } } },
  }, 1000);
  const b = snap({
    progress: { xp: 300, rewards: ['r2'] }, legends: ['b', 'c'],
    daily: { last: null, streak: { streak: 9, lastPassDate: '2026-09-02' },
             stats: { played: 2, wins: 2, maxStreak: 9, distribution: { '70-79': 2 } } },
  }, 2000);

  const ab = mergeSaves(a, b);
  const ba = mergeSaves(b, a);
  assert.equal(ab.save.progress.xp, ba.save.progress.xp);
  assert.deepEqual([...ab.save.progress.rewards].sort(), [...ba.save.progress.rewards].sort());
  assert.deepEqual([...ab.save.legends].sort(), [...ba.save.legends].sort());
  assert.deepEqual(ab.save.daily.streak, ba.save.daily.streak);
  assert.deepEqual(ab.save.daily.stats, ba.save.daily.stats);
});

// ── Local read / write ────────────────────────────────────────────────────────

test('readLocalSave gathers every synced key and ignores the device-only ones', () => {
  installStorage({
    nba820_progress:   JSON.stringify({ xp: 8000, level: 5, rewards: ['title-scout'] }),
    nba820_legends:    JSON.stringify(['p1', 'p2']),
    nba820_lb:         JSON.stringify([{ wins: 70, avgPopularity: 100 }]),
    nba820_trophies:   JSON.stringify([{ date: 'Sep 1, 2026', wins: 82 }]),
    nba820_lb_fans:    JSON.stringify([{ score: 5 }]),
    nba820_daily_last: JSON.stringify({ date: '2026-09-02', wins: 50, at: 1 }),
    nba820_dailyStats: JSON.stringify({ played: 3, wins: 1, distribution: {} }),
    nba820_best:       JSON.stringify({ wins: 82, losses: 0 }),
    nba820_bestStreak: '17',
    nba820_coach:      'jackson',
    // Device-only — must not appear in the snapshot.
    nba820_theme:      'dark',
    nba820_returning:  '1',
    nba820_ref:        JSON.stringify({ ref: 'reddit' }),
  });

  const { snapshot, complete } = readLocalSave();
  assert.equal(complete, true);
  assert.equal(snapshot.save.progress.xp, 8000);
  assert.deepEqual(snapshot.save.legends, ['p1', 'p2']);
  assert.equal(snapshot.save.trophies.length, 1);
  assert.equal(snapshot.save.modeBoards.fans.length, 1);
  assert.equal(snapshot.save.daily.last.date, '2026-09-02');
  assert.equal(snapshot.save.bests.bestStreak, 17, 'bestStreak is a bare string, not JSON');
  assert.equal(snapshot.save.bests.coach, 'jackson', 'coach is a bare string, not JSON');
  assert.ok(!JSON.stringify(snapshot).includes('reddit'), 'referral data must not be synced');
  assert.ok(!JSON.stringify(snapshot).includes('dark'), 'theme must not be synced');
});

test('an unparseable key marks the snapshot incomplete so it is never uploaded', () => {
  installStorage({
    nba820_progress: '{not json',
    nba820_legends:  JSON.stringify(['p1']),
  });
  const { snapshot, complete } = readLocalSave();
  assert.equal(complete, false, 'a partial save must be flagged, never silently uploaded');
  assert.deepEqual(snapshot.save.legends, ['p1'], 'the readable sections still parse');
});

test('an empty device reads as complete and empty, not as a failure', () => {
  installStorage({});
  const { snapshot, complete } = readLocalSave();
  assert.equal(complete, true);
  assert.equal(snapshot.save.progress.xp, 0);
});

test('writeLocalSave round-trips a merged save back into the game keys', () => {
  const m = installStorage({});
  const merged = mergeSaves(
    snap({ progress: { xp: 5000, rewards: ['a'] }, legends: ['x'],
           bests: { best: { wins: 70, losses: 12 }, bestStreak: 9, lastRun: null, coach: 'riley' } }),
    snap({ progress: { xp: 9000, rewards: ['b'] }, legends: ['y'],
           bests: { best: { wins: 82, losses: 0 }, bestStreak: 4, lastRun: null, coach: null } }),
  );
  assert.equal(writeLocalSave(merged), true);

  assert.equal(JSON.parse(m.get('nba820_progress')).xp, 9000);
  assert.deepEqual(JSON.parse(m.get('nba820_legends')).sort(), ['x', 'y']);
  assert.deepEqual(JSON.parse(m.get('nba820_best')), { wins: 82, losses: 0 });
  assert.equal(m.get('nba820_bestStreak'), '9', 'bestStreak must be written as a bare string');
  assert.equal(m.get('nba820_coach'), 'riley');

  const reread = readLocalSave().snapshot;
  assert.equal(reread.save.progress.xp, 9000, 'a write the reader cannot read back is a lost save');
  assert.deepEqual([...reread.save.legends].sort(), ['x', 'y']);
});

test('writeLocalSave only ever writes — it can never clear existing progress', () => {
  const m = installStorage({
    nba820_trophies: JSON.stringify([{ date: 'Sep 1, 2026', wins: 82 }]),
    nba820_legends:  JSON.stringify(['keep-me']),
  });
  writeLocalSave(emptySave());
  assert.equal(JSON.parse(m.get('nba820_trophies')).length, 1, 'trophy room was cleared');
  assert.deepEqual(JSON.parse(m.get('nba820_legends')), ['keep-me'], 'legends were cleared');
});

test('blocked storage degrades quietly and can never delete remote progress', () => {
  globalThis.localStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
  };

  // The cg* seam swallows storage errors by design, so neither call can
  // detect the block — what matters is that neither throws and the run
  // continues, the same bargain the Trophy Room already makes.
  assert.doesNotThrow(() => writeLocalSave(snap({ legends: ['a'] })));
  const { snapshot, complete } = readLocalSave();
  assert.equal(complete, true, 'a blocked read is indistinguishable from an empty device');
  assert.deepEqual(snapshot.save.legends, [], 'and reads as empty');

  // The safety net: that empty snapshot merged against a real remote save
  // takes nothing away, so a private-mode device cannot wipe an account.
  const remote = snap({ progress: { xp: 9000, rewards: ['r'] }, legends: ['x', 'y'] });
  const merged = mergeSaves(snapshot, remote);
  assert.equal(merged.save.progress.xp, 9000, 'an empty local save must never erase the remote');
  assert.deepEqual(merged.save.legends, ['x', 'y']);
});

test('writeLocalSave reports a missing or malformed snapshot', () => {
  installStorage({});
  assert.equal(writeLocalSave(null), false);
  assert.equal(writeLocalSave('nope'), false);
  assert.equal(writeLocalSave({}), false, 'a snapshot with no save section is not writable');
});

// ── Upload scheduling ─────────────────────────────────────────────────────────

test('a burst of events collapses into one upload, and flush runs it now', () => {
  let calls = 0;
  scheduleUpload(() => { calls += 1; });
  scheduleUpload(() => { calls += 1; });
  scheduleUpload(() => { calls += 1; });
  assert.equal(calls, 0, 'the upload must not fire synchronously');
  flushUpload();
  assert.equal(calls, 1, 'three events produced more than one write');
  flushUpload();
  assert.equal(calls, 1, 'flushing twice must not upload twice');
});

test('a pending upload can be cancelled, and a failing one never throws', () => {
  let calls = 0;
  scheduleUpload(() => { calls += 1; });
  cancelUpload();
  flushUpload();
  assert.equal(calls, 0, 'a cancelled upload still ran');

  scheduleUpload(() => { throw new Error('network down'); });
  assert.doesNotThrow(() => flushUpload(), 'a sync failure must not surface to the caller');

  scheduleUpload(() => Promise.reject(new Error('network down')));
  assert.doesNotThrow(() => flushUpload(), 'a rejected upload must not become an unhandled rejection');

  scheduleUpload('not a function');
  assert.doesNotThrow(() => flushUpload());
});
