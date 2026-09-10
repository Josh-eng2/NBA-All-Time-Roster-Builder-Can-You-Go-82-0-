/**
 * Rematch board codes are a wire format: they index into TEAMS and DECADES,
 * so a reorder of either array silently invalidates every link already shared.
 * These tests pin the round trip and the rejection of anything malformed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './helpers.mjs';

const g = await loadGame();
const { encodeBoardCode, decodeBoardCode, isRematchableMode,
        buildRematchUrl, buildDailyUrl, buildPlainUrl, ORIGIN } = g.rematch;
const { TEAMS, DECADES, TOTAL_ROUNDS } = g.state;

const board = [
  { team: 'Bulls',    decade: '1990s' },
  { team: 'Lakers',   decade: '1980s' },
  { team: 'Warriors', decade: '2010s' },
  { team: 'Celtics',  decade: '1960s' },
  { team: 'Spurs',    decade: '2000s' },
];

test('historical version-a code keeps its published franchise and decade meaning', () => {
  const historical = 'a00a020j0l131y';
  assert.deepEqual(decodeBoardCode(historical).board, board);
  assert.equal(decodeBoardCode(historical).wins, 70);
  assert.equal(encodeBoardCode({ board, wins: 70, style: 'solo' }), historical);
});

test('a board survives the round trip exactly', () => {
  for (const style of ['solo', 'blind']) {
    for (const wins of [0, 1, 41, 82]) {
      const code = encodeBoardCode({ board, wins, style });
      assert.ok(code, `failed to encode ${style}/${wins}`);
      assert.equal(code.length, 14, 'the wire format is 14 chars');
      assert.match(code, /^[0-9a-z]+$/, 'codes must be URL-safe lowercase base36');
      const back = decodeBoardCode(code);
      assert.ok(back, `failed to decode ${code}`);
      assert.deepEqual(back.board, board);
      assert.equal(back.wins, wins);
      assert.equal(back.losses, 82 - wins);
      assert.equal(back.style, style);
    }
  }
});

test('every team/decade combination encodes distinctly', () => {
  const seen = new Set();
  for (const team of TEAMS) {
    for (const decade of DECADES) {
      const slot = [{ team, decade }, ...board.slice(1)];
      const code = encodeBoardCode({ board: slot, wins: 50, style: 'solo' });
      if (!g.DB[`${team}_${decade}`]?.length) { assert.equal(code, null); continue; }
      assert.ok(code, `${team} ${decade} did not encode`);
      const key = code.slice(2, 4);
      assert.ok(!seen.has(key), `${team} ${decade} collides with another slot`);
      seen.add(key);
      assert.deepEqual(decodeBoardCode(code).board[0], { team, decade });
    }
  }
  assert.equal(seen.size, TEAMS.reduce((n, team) => n + DECADES.filter(d => g.DB[`${team}_${d}`]?.length).length, 0));
});

test('decoding is case- and whitespace-tolerant', () => {
  const code = encodeBoardCode({ board, wins: 60, style: 'solo' });
  assert.deepEqual(decodeBoardCode(`  ${code.toUpperCase()}  `), decodeBoardCode(code));
});

test('malformed, truncated, or out-of-range codes are refused, never guessed at', () => {
  const good = encodeBoardCode({ board, wins: 60, style: 'solo' });
  const bad = [
    null, undefined, 42, '', '   ',
    good.slice(0, -1),            // truncated
    good + 'a',                   // over-long
    'z' + good.slice(1),          // unknown version
    good[0] + 'z' + good.slice(2), // unknown draft style
    good.slice(0, 2) + 'zz' + good.slice(4),   // slot index past the team table
    good.slice(0, 12) + 'zz',     // wins past 82
    good.slice(0, 12) + '__',     // non-base36 payload
  ];
  for (const c of bad) assert.equal(decodeBoardCode(c), null, `should have refused ${JSON.stringify(c)}`);
});

test('a board that is not exactly five rounds cannot be encoded', () => {
  assert.equal(encodeBoardCode({ board: board.slice(0, 4), wins: 10, style: 'solo' }), null);
  assert.equal(encodeBoardCode({ board: [...board, board[0]], wins: 10, style: 'solo' }), null);
  assert.equal(encodeBoardCode({ board: null, wins: 10, style: 'solo' }), null);
  assert.equal(encodeBoardCode({ board, wins: 10, style: 'daily' }), null, 'daily has no code by design');
  assert.equal(encodeBoardCode({
    board: [{ team: 'Nonexistent', decade: '1990s' }, ...board.slice(1)], wins: 10, style: 'solo',
  }), null);
  assert.equal(board.length, TOTAL_ROUNDS);
});

test('wins are clamped into a real season before they reach the wire', () => {
  assert.equal(decodeBoardCode(encodeBoardCode({ board, wins: 999, style: 'solo' })).wins, 82);
  assert.equal(decodeBoardCode(encodeBoardCode({ board, wins: -5,  style: 'solo' })).wins, 0);
});

test('only the modes that produce a single board are rematchable', () => {
  for (const mode of ['solo', 'blind', 'rematch']) assert.equal(isRematchableMode(mode), true, mode);
  for (const mode of ['daily', 'defense', 'fans', '1v1', 'gm-ai', 'dynasty-duel', null, undefined]) {
    assert.equal(isRematchableMode(mode), false, `${mode} should not be rematchable`);
  }
});

test('share links point at the public origin and carry their route', () => {
  const code = encodeBoardCode({ board, wins: 60, style: 'solo' });
  const url  = buildRematchUrl(code);
  assert.ok(url.startsWith(ORIGIN), 'links must never point at a portal iframe or localhost');
  assert.ok(url.includes('#/rematch?c='), 'the route must survive');
  assert.equal(new URL(url).hash.replace(/^#\/rematch\?/, ''), `c=${code}`);
  assert.ok(buildDailyUrl().endsWith('#/daily'));
  assert.ok(buildPlainUrl().startsWith(ORIGIN));
});

/**
 * A shared daily link points at the challenge's generated page rather than at
 * the game, because the hash payload of every other share is invisible to link
 * unfurlers and previews as the bare site card. These pin the two halves of
 * that: the page URL has to match the file the generator actually writes, and a
 * slug that can't be trusted must never reach the path.
 */
test('a daily share links to the challenge page, with attribution', () => {
  const url = buildDailyUrl('boos-only');
  assert.equal(url, `${ORIGIN}/daily/boos-only.html?ref=daily`);
  // ?ref= lives in the query, not the hash: the daily page is a real document
  // request, and a hash never reaches the page's own script or the server.
  assert.equal(new URL(url).searchParams.get('ref'), 'daily');
});

test('an unusable slug falls back to the direct link instead of a broken path', () => {
  const direct = `${ORIGIN}/?ref=daily#/daily`;
  // Missing (an older save, or a catalog entry that lost its slug) — the player
  // still lands in the right mode, only the rich preview is lost.
  assert.equal(buildDailyUrl(), direct);
  assert.equal(buildDailyUrl(undefined), direct);
  assert.equal(buildDailyUrl(''), direct);
  // Anything that could escape the daily/ directory or smuggle a second
  // parameter never reaches the path.
  for (const bad of ['../../evil', 'a/b', 'Boos-Only', 'boos only', 'x?ref=share',
                     'x#/daily', 'x&via=evil.com', '-lead', 'trail-', 'a--b']) {
    assert.equal(buildDailyUrl(bad), direct, `slug "${bad}" must not reach the URL`);
  }
});
