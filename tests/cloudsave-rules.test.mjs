/**
 * The cloud save and the Firestore rules that accept it must agree.
 *
 * users/{uid} rejects the WHOLE document on any violation, so a save one entry
 * over a cap does not get trimmed — it stops syncing, silently, behind the
 * same generic PERMISSION_DENIED as a dozen unrelated causes. A player would
 * see no error at all: the game plays from localStorage, so everything looks
 * fine right up until they open their other device and find it stale.
 *
 * This is the same class of failure `leaderboard-wire.test.mjs` guards for the
 * public leaderboard, and the same one the header of `firestore.rules` records
 * from the avgPopularity incident, where the great majority of submissions
 * were refused server-side for weeks.
 *
 * That file transcribes its bounds by hand and asks future edits to keep them
 * in step. This one PARSES `firestore.rules` instead, so the numbers cannot
 * drift apart in the first place: change a cap in the rules and this test
 * immediately measures the client against the new one.
 */
import test   from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadGame, mod } from './helpers.mjs';

const { mergeSaves, emptySave, SCHEMA_VERSION } = await import(mod('js/utils/cloudSave.js'));

const RULES     = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const AUTH_MODAL = readFileSync(new URL('../js/ui/authModal.js', import.meta.url), 'utf8');

/** Pulls one `<name>.size() <= N` bound out of the rules text. */
function listCap(name) {
  const re = new RegExp(`${name}(?:', \\[\\])?\\)?\\.size\\(\\)\\s*<=\\s*(\\d+)`);
  const m  = RULES.match(re);
  assert.ok(m, `firestore.rules no longer bounds ${name} — the cap this test measures against is gone`);
  return Number(m[1]);
}

/** Pulls a `d.<field> >= LO` / `<= HI` numeric range out of the rules text. */
function numericRange(field) {
  const lo = RULES.match(new RegExp(`${field}\\s*>=\\s*(\\d+)`));
  const hi = RULES.match(new RegExp(`${field}\\s*<=\\s*(\\d+)`));
  assert.ok(lo && hi, `firestore.rules no longer bounds ${field}`);
  return [Number(lo[1]), Number(hi[1])];
}

const CAP = {
  legends:     listCap('legends'),
  leaderboard: listCap('leaderboard'),
  trophies:    listCap('trophies'),
  defense:     listCap("defense"),
  fans:        listCap("fans"),
  gmAi:        listCap("gm-ai"),
  duel:        listCap("dynasty-duel"),
};

test('the caps this test measures against were actually found in the rules', () => {
  for (const [name, n] of Object.entries(CAP)) {
    assert.ok(Number.isInteger(n) && n > 0, `${name} cap parsed as ${n}`);
  }
});

test('a merged save never exceeds the array caps users/{uid} enforces', () => {
  // Twice each cap on both sides, so the merge has every chance to overflow.
  const flood = n => Array.from({ length: n }, (_, i) => ({ i, wins: i % 83, score: i, avgPopularity: i }));
  const side  = () => ({
    ...emptySave(),
    save: {
      ...emptySave().save,
      leaderboard: flood(CAP.leaderboard * 2),
      trophies:    flood(CAP.trophies * 2),
      modeBoards: {
        defense:        flood(CAP.defense * 2),
        fans:           flood(CAP.fans * 2),
        'gm-ai':        flood(CAP.gmAi * 2),
        'dynasty-duel': flood(CAP.duel * 2),
      },
    },
  });

  // Distinct entries on each side, so de-duplication cannot mask the cap.
  const a = side();
  const b = side();
  b.save.leaderboard = b.save.leaderboard.map(e => ({ ...e, tag: 'b' }));
  b.save.trophies    = b.save.trophies.map(e => ({ ...e, tag: 'b' }));
  for (const k of Object.keys(b.save.modeBoards)) {
    b.save.modeBoards[k] = b.save.modeBoards[k].map(e => ({ ...e, tag: 'b' }));
  }

  const out = mergeSaves(a, b).save;
  assert.ok(out.leaderboard.length <= CAP.leaderboard,
    `leaderboard merged to ${out.leaderboard.length}, rules reject over ${CAP.leaderboard}`);
  assert.ok(out.trophies.length <= CAP.trophies,
    `trophies merged to ${out.trophies.length}, rules reject over ${CAP.trophies}`);
  for (const [mode, cap] of [['defense', CAP.defense], ['fans', CAP.fans],
                             ['gm-ai', CAP.gmAi], ['dynasty-duel', CAP.duel]]) {
    assert.ok(out.modeBoards[mode].length <= cap,
      `${mode} board merged to ${out.modeBoards[mode].length}, rules reject over ${cap}`);
  }
});

test('the shipped player database cannot produce a save the legends cap rejects', async () => {
  // legends is the one synced array the game never caps: it grows by one per
  // player id ever drafted, so its real ceiling is the size of the database.
  // Capping it in the merge would mean discarding collected legends, which is
  // the one thing the merge must never do — so the invariant runs the other
  // way, and the rules bound has to stay ahead of the data.
  const { DB } = await loadGame();
  const ids = new Set();
  for (const players of Object.values(DB)) for (const p of players) ids.add(p.id);

  assert.ok(ids.size < CAP.legends,
    `the database holds ${ids.size} distinct players but users/{uid} rejects a legends array over ` +
    `${CAP.legends}. A completionist's save would stop syncing. Raise the legends bound in ` +
    `firestore.rules and republish it before shipping this many players.`);

  // Headroom, not just a pass: a bound the data is about to outgrow is the
  // avgPopularity incident happening again.
  assert.ok(ids.size < CAP.legends * 0.75,
    `the database (${ids.size}) is within 25% of the legends cap (${CAP.legends}) — widen the ` +
    `rule now rather than after the first player stops syncing.`);
});

test('SCHEMA_VERSION stays inside the range the rules accept', () => {
  const [lo, hi] = numericRange('d.schemaVersion');
  assert.ok(SCHEMA_VERSION >= lo && SCHEMA_VERSION <= hi,
    `cloudSave.js writes schemaVersion ${SCHEMA_VERSION}, outside the rules' ${lo}..${hi}`);
});

test('the GM name the modal accepts is a name the rules accept', () => {
  // The modal validates a display name before it is ever written into the
  // user document. If it allows a longer one than users/{uid} does, the whole
  // save is refused — the player picks a name and their sync quietly dies.
  const [ruleMin, ruleMax] = numericRange('d.displayName.size\\(\\)');
  const modalMin = Number(AUTH_MODAL.match(/const MIN_NAME = (\d+)/)?.[1]);
  const modalMax = Number(AUTH_MODAL.match(/const MAX_NAME = (\d+)/)?.[1]);
  assert.ok(Number.isInteger(modalMin) && Number.isInteger(modalMax),
    'authModal.js no longer declares MIN_NAME / MAX_NAME');

  assert.ok(modalMin >= ruleMin,
    `the modal accepts names as short as ${modalMin}; the rules require ${ruleMin}`);
  assert.ok(modalMax <= ruleMax,
    `the modal accepts names up to ${modalMax} characters; the rules reject anything over ${ruleMax}`);
});
