/**
 * scripts/leaderboard_stats.mjs — the CSV boundary.
 *
 * This script's input is the two PUBLIC Firestore collections: world-readable
 * by design, and writable by anyone holding the web config committed in
 * js/utils/firebase.js. Its output is a file the operator opens in a
 * spreadsheet. That makes csvCell() a trust boundary, not a formatting helper,
 * and the one it was missing is the leading-quote guard: CSV quoting is
 * stripped at parse, so `"=HYPERLINK(…)"` in a team name is still a formula
 * when Excel or Sheets gets to it.
 *
 * correlation() is pinned alongside because its degenerate cases (zero
 * variance, fewer than two usable pairs) are the ones that would otherwise
 * print NaN as a finding.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mod } from './helpers.mjs';

const { csvCell, toCsv, correlation, decodeValue } =
  await import(mod('scripts/leaderboard_stats.mjs'));

test('a cell that a spreadsheet would evaluate is defused', () => {
  // Every one of these is reachable inside the 30-char teamName the rules allow.
  for (const hostile of ['=1+1', '+1+1', '-1+1', '@SUM(A1)', '=cmd|\'/c calc\'!A1']) {
    assert.ok(csvCell(hostile).startsWith("'"),
      `${hostile} would be evaluated as a formula on open`);
  }
  assert.equal(csvCell('=HYPERLINK("http://evil.example","x")'),
    `"'=HYPERLINK(""http://evil.example"",""x"")"`,
    'the guard and the quoting must compose, not replace each other');
});

test('ordinary values are untouched', () => {
  assert.equal(csvCell('Chicago Bulls'), 'Chicago Bulls');
  assert.equal(csvCell(82), '82');
  assert.equal(csvCell(false), 'false');
  assert.equal(csvCell(null), '');
  assert.equal(csvCell(undefined), '');
  // A negative number is not a formula — the guard costs it one apostrophe,
  // which a spreadsheet strips. Pinned so the trade is deliberate.
  assert.equal(csvCell(-3), "'-3");
});

test('a comma-joined starters list still round-trips as one column', () => {
  const csv = toCsv([{ teamName: 'T', starters: 'Jordan, Bird, Magic' }]);
  assert.equal(csv, 'teamName,starters\nT,"Jordan, Bird, Magic"\n');
});

test('the column set is the union across rows, not the first row', () => {
  // avgPopularity/fansM are optional in the rules, so a board mixing old and
  // new submissions must not lose the newer columns to a row that predates them.
  const csv = toCsv([{ wins: 70 }, { wins: 71, fansM: 200 }]);
  assert.equal(csv.split('\n')[0], 'wins,fansM');
});

test('a correlation with no variance is reported absent, never as NaN', () => {
  const flat = [{ x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 }];
  assert.deepEqual(correlation(flat, 'x', 'y'), { r: null, n: 3 });
  assert.equal(correlation([{ x: 1, y: 1 }], 'x', 'y').r, null);
});

test('a correlation ignores rows missing either value rather than scoring them 0', () => {
  // A run submitted before avgPopularity existed has neither number; counting
  // those as zero invents a cluster at the origin and drags r toward it.
  const rows = [{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 6 }, { y: 8 }, { x: 4 }];
  const { r, n } = correlation(rows, 'x', 'y');
  assert.equal(n, 3);
  assert.ok(Math.abs(r - 1) < 1e-12, 'a perfect line did not read as one');
});

test('Firestore REST integers arrive as strings and come back as numbers', () => {
  assert.equal(decodeValue({ integerValue: '82' }), 82);
  assert.equal(decodeValue({ doubleValue: 1.5 }), 1.5);
  assert.equal(decodeValue({ nullValue: null }), null);
  assert.deepEqual(decodeValue({ arrayValue: { values: [{ stringValue: 'a' }] } }), ['a']);
  assert.deepEqual(decodeValue({ mapValue: { fields: { w: { integerValue: '7' } } } }), { w: 7 });
  // An empty array/map arrives with the key absent, not as an empty list.
  assert.deepEqual(decodeValue({ arrayValue: {} }), []);
  assert.deepEqual(decodeValue({ mapValue: {} }), {});
});
