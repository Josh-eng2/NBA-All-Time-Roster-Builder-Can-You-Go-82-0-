/**
 * Chemistry engine. The report strings a player reads are derived from the
 * structured entries, and the 0-100 score shown on screen is derived from the
 * raw bonus the simulation adds — these tests pin those two relationships,
 * plus the family caps that stop one identity from compounding forever.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, flattenDb, bestFive } from './helpers.mjs';

const g   = await loadGame();
const all = flattenDb(g.DB);
const { calculateChemistry, chemScoreFromBonus, chemTier, chemTierColors,
        FAMILY_CAPS, CHEM_SCORE_SCALE, CHEM_SCORE_BASE } = g.chem;

const byPos = {};
for (const p of all) (byPos[p.pos] ||= []).push(p);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const randomFive = () => g.state.POSITIONS.map(pos => pick(byPos[pos]));

test('an empty roster is neutral, not condemned', () => {
  const r = calculateChemistry([], null);
  assert.equal(r.chemBonus, 0);
  assert.equal(r.chemScore, CHEM_SCORE_BASE);
  assert.deepEqual(r.chemReport, []);
  assert.deepEqual(r.lineupAssignment, []);
  assert.equal(chemTier(r.chemScore).id, 'neutral');
});

test('the displayed score is the documented transform of the raw bonus', () => {
  for (let i = 0; i < 200; i++) {
    const r = calculateChemistry(randomFive(), pick(g.state.COACHES).id);
    const expected = Math.round(Math.max(0, Math.min(100,
      CHEM_SCORE_BASE + (r.chemBonus / CHEM_SCORE_SCALE) * CHEM_SCORE_BASE)));
    assert.equal(r.chemScore, expected, 'chemScore must be chemScoreFromBonus(chemBonus)');
    assert.equal(r.chemScore, chemScoreFromBonus(r.chemBonus));
    assert.ok(r.chemScore >= 0 && r.chemScore <= 100);
  }
});

test('every report line is derived from an entry, with the right marker', () => {
  for (let i = 0; i < 100; i++) {
    const r = calculateChemistry(randomFive(), pick(g.state.COACHES).id);
    assert.equal(r.chemReport.length, r.chemEntries.length);
    r.chemEntries.forEach((e, idx) => {
      const line = r.chemReport[idx];
      assert.ok(line.startsWith(e.kind === 'penalty' ? '🔴 ' : '🟢 '),
        `entry ${e.id} (${e.kind}) rendered as "${line}"`);
      assert.ok(line.endsWith(e.label), `entry ${e.id} label does not match its line`);
      assert.ok(['synergy', 'penalty', 'info'].includes(e.kind));
      if (e.kind === 'synergy') assert.ok(e.bonus >= 0, `${e.id}: a synergy must never be negative`);
      if (e.kind === 'penalty') assert.ok(e.bonus <= 0, `${e.id}: a penalty must never be positive`);
      if (e.kind === 'info')    assert.equal(e.bonus, 0);
    });
    assert.equal(new Set(r.chemEntries.map(e => e.id)).size, r.chemEntries.length,
      'the same synergy must not fire twice');
  }
});

test('a synergy label states the bonus it actually contributes', () => {
  // Every positive bonus is scaled by SYNERGY_SCALE before it lands in
  // chemBonus; the label is rewritten to match, so the two must never drift.
  for (let i = 0; i < 200; i++) {
    for (const e of calculateChemistry(randomFive(), null).chemEntries) {
      if (e.kind !== 'synergy') continue;
      const stated = e.label.match(/\+(\d+(?:\.\d+)?)%/);
      if (!stated) continue;             // Flex Fit lines state "0%"
      assert.equal(Number(stated[1]), Math.round(e.bonus * 100),
        `"${e.label}" claims ${stated[1]}% but contributes ${(e.bonus * 100).toFixed(2)}%`);
    }
  }
});

test('positive synergies are capped per family, and the cap is explained', () => {
  for (let i = 0; i < 400; i++) {
    const r = calculateChemistry(randomFive(), pick(g.state.COACHES).id);
    const sums = {};
    for (const e of r.chemEntries) {
      if (e.kind === 'synergy') sums[e.family] = (sums[e.family] || 0) + e.bonus;
    }
    let expected = 0;
    for (const e of r.chemEntries) if (e.kind === 'penalty') expected += e.bonus;
    for (const [family, sum] of Object.entries(sums)) {
      const cap = FAMILY_CAPS[family] ?? Infinity;
      expected += Math.min(sum, cap);
      if (sum > cap + 1e-9) {
        assert.ok(r.chemEntries.some(e => e.id === `cap-${family}`),
          `${family} overflowed its cap with no info line to explain it`);
      }
    }
    assert.ok(Math.abs(r.chemBonus - expected) < 1e-9,
      `chemBonus ${r.chemBonus} does not equal the capped family sum ${expected}`);
  }
});

test('the lineup assignment covers the roster with no slot used twice', () => {
  for (let i = 0; i < 200; i++) {
    const five = randomFive();
    const r = calculateChemistry(five, null);
    assert.equal(r.lineupAssignment.length, five.length);
    const slots = r.lineupAssignment.map(a => a.slot);
    assert.equal(new Set(slots).size, slots.length, 'two starters were put in the same slot');
    for (const a of r.lineupAssignment) {
      assert.ok(g.state.POSITIONS.includes(a.slot));
      assert.ok(['primary', 'flex', 'oop'].includes(a.fit));
      const expected = a.fit === 'primary' ? 0.03 : a.fit === 'flex' ? 0.02 : 0.01;
      assert.ok(Math.abs(a.bonus - expected) < 1e-9, `${a.fit} fit scored ${a.bonus}`);
      if (a.fit === 'primary') assert.equal(a.player.pos, a.slot);
      if (a.fit === 'flex')    assert.ok((a.player.secondaryPos || []).includes(a.slot));
    }
  }
});

test('the score depends on the five players, never on where they were placed', () => {
  // The engine assigns the floor itself at sim time, so the draft screen's
  // live gauge and the results screen must agree for any placement. This is
  // the invariant that broke when the gauge scored tapped slots instead:
  // a deliberately shuffled roster read ~33 points lower than the season
  // it went on to play.
  for (let i = 0; i < 100; i++) {
    const five = randomFive();
    const a = calculateChemistry(five, 'jackson');
    const b = calculateChemistry([...five].reverse(), 'jackson');
    assert.equal(a.chemScore, b.chemScore,
      'reordering the same five starters must not change their chemistry');
    assert.ok(Math.abs(a.chemBonus - b.chemBonus) < 1e-9);
  }
  // …and the optimizer really does seat naturals at their own position.
  const pg = byPos.PG.find(p => !(p.secondaryPos || []).includes('C'));
  const c  = byPos.C.find(p => !(p.secondaryPos || []).includes('PG'));
  const opt = calculateChemistry([c, pg], null);
  const slotOf = name => opt.lineupAssignment.find(a => a.player.name === name).slot;
  assert.equal(slotOf(pg.name), 'PG');
  assert.equal(slotOf(c.name), 'C');
  assert.ok(opt.lineupAssignment.every(a => a.fit === 'primary'));
});

test('a flawless five is rewarded and a logjam is punished', () => {
  const five = bestFive(all);
  const flawless = calculateChemistry(five, null);
  assert.ok(flawless.chemEntries.some(e => e.id === 'flawless-construction'),
    'five players at their natural positions should earn Flawless Construction');

  const threeGuards = [byPos.PG[0], byPos.PG[1], byPos.PG[2], byPos.C[0], byPos.C[1]];
  const jam = calculateChemistry(threeGuards, null);
  const hasJam = jam.chemEntries.some(e => e.id === 'positional-logjam');
  const resolvable = new Set(threeGuards.flatMap(p => [p.pos, ...(p.secondaryPos || [])])).size >= 3;
  assert.ok(hasJam || resolvable,
    'three players at one position must either be flagged or be slidable elsewhere');
});

test('coaches only ever amplify their own systems, never break the score', () => {
  const five = bestFive(all);
  const base = calculateChemistry(five, null);
  for (const coach of g.state.COACHES) {
    const r = calculateChemistry(five, coach.id);
    assert.ok(Number.isFinite(r.chemBonus), `${coach.id} produced a non-finite bonus`);
    assert.ok(r.chemScore >= 0 && r.chemScore <= 100);
    // Same roster, same synergy set — coaches change magnitudes, not which
    // synergies exist (bar the penalties they explicitly negate).
    const synergyIds = new Set(r.chemEntries.filter(e => e.kind === 'synergy').map(e => e.id));
    const baseIds    = new Set(base.chemEntries.filter(e => e.kind === 'synergy').map(e => e.id));
    for (const id of baseIds) assert.ok(synergyIds.has(id), `${coach.id} dropped synergy ${id}`);
  }
});

test('chem tiers and their colours are defined across the whole 0-100 range', () => {
  let last = null;
  for (let sc = 0; sc <= 100; sc++) {
    const t = chemTier(sc);
    assert.ok(t.label && t.id, `score ${sc} has no tier`);
    assert.equal(t.score, sc);
    for (const dark of [true, false]) {
      const c = chemTierColors(t.id, dark);
      assert.match(c.color, /^#|^rgba?\(/, `${t.id} has no colour`);
      assert.ok(c.bg, `${t.id} has no background`);
    }
    last = t;
  }
  assert.equal(chemTier(-5).id, 'veryWeak');
  assert.equal(chemTier(500).id, 'perfect');
  assert.equal(chemTier(NaN).id, 'veryWeak');
  assert.ok(last);
});
