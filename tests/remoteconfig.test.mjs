/**
 * Remote Config — the boundary where a value someone typed into a web form
 * five minutes ago enters game logic, with no review, no test run and no
 * deploy in between.
 *
 * Every failure mode here is silent by nature: a NaN reaches a win
 * probability and comes out as a blank season, a string where a number
 * belongs poisons the sim curve, and an unbounded number quietly makes every
 * roster go 82-0 for as long as it takes someone to notice. coerceRemoteValue()
 * is the only thing standing between those and the game, so it is pinned
 * here, hard — including the case that matters most in practice, a Console
 * value that is simply unreachable.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mod } from './helpers.mjs';

const { DEFAULTS, coerceRemoteValue, valuesFrom, configValue, configSnapshot } =
  await import(mod('js/utils/remoteConfig.js'));

// Stands in for a Remote Config Value. asNumber() returns 0 for anything
// unparseable and asBoolean() reads "true"/"1"/"t"/"y"/"yes" — this mirrors
// that, so the tests exercise what the SDK actually hands over rather than an
// idealised version of it.
const val = raw => ({
  asString:  () => String(raw),
  asNumber:  () => (Number.isFinite(Number(raw)) ? Number(raw) : 0),
  asBoolean: () => ['true', '1', 't', 'y', 'yes'].includes(String(raw).toLowerCase()),
});

test('an unreachable config leaves every shipped default in force', () => {
  const values = valuesFrom({});
  for (const [key, spec] of Object.entries(DEFAULTS)) {
    assert.equal(values[key], spec.value,
      `${key} must fall back to the value this build was tested with`);
  }
});

test('a published value inside its bounds is taken as given', () => {
  assert.equal(coerceRemoteValue('sim_k', val(1.75)), 1.75);
  assert.equal(coerceRemoteValue('win_cap', val(0.95)), 0.95);
  assert.equal(coerceRemoteValue('accounts_enabled', val('false')), false);
});

test('an out-of-range number is clamped into calibrated territory', () => {
  // The fat-finger case: a trailing zero on sim_k would flatten the curve to
  // "everybody wins 82" if it reached the sim unclamped.
  assert.equal(coerceRemoteValue('sim_k', val(140)), DEFAULTS.sim_k.max);
  assert.equal(coerceRemoteValue('sim_k', val(-5)), DEFAULTS.sim_k.min);
  assert.equal(coerceRemoteValue('win_cap', val(0.10)), DEFAULTS.win_cap.min,
    'a low cap eats 82-0 runs outright — the floor is where the game keeps its own promise');
  assert.equal(coerceRemoteValue('win_cap', val(9)), 1.00);
});

test('a value of the wrong shape can never reach game logic', () => {
  // asNumber() reports unparseable text as a finite 0, so it is the bounds
  // rather than a NaN check that catches this — which is exactly why the
  // bounds are not optional.
  assert.equal(coerceRemoteValue('sim_center', val('one point four')), DEFAULTS.sim_center.min);
  assert.equal(coerceRemoteValue('sim_k', val('')), DEFAULTS.sim_k.min);
  // A getter that throws (a malformed entry) must not take the game with it.
  const hostile = { asNumber() { throw new Error('boom'); },
                    asBoolean() { throw new Error('boom'); },
                    asString() { throw new Error('boom'); } };
  assert.equal(coerceRemoteValue('sim_k', hostile), DEFAULTS.sim_k.value);
  assert.equal(coerceRemoteValue('accounts_enabled', hostile), true);
});

test('a key this build has never heard of is ignored entirely', () => {
  // Remote Config can change the value of a key the shipped bundle already
  // reads; it cannot introduce one. A publish of `sim_wins_always` must not
  // become a property anything downstream can pick up.
  assert.equal(coerceRemoteValue('sim_wins_always', val(1)), undefined);
  const values = valuesFrom({ sim_wins_always: val(1), sim_k: val(1.6) });
  assert.deepEqual(Object.keys(values).sort(), Object.keys(DEFAULTS).sort());
  assert.equal(values.sim_k, 1.6);
});

test('accessors answer synchronously, before any fetch could have landed', () => {
  // accountsEnabled() decides whether a header pill renders and is called on
  // the first paint — it must never wait on, or be undefined because of, the
  // network.
  for (const key of Object.keys(DEFAULTS)) {
    assert.equal(configValue(key), DEFAULTS[key].value);
  }
  assert.equal(configValue('not_a_key'), undefined);
  const snap = configSnapshot();
  snap.sim_k = 99;
  assert.equal(configValue('sim_k'), DEFAULTS.sim_k.value, 'the snapshot must be a copy');
});

test('the accounts kill switch turns off only on an explicit published false', () => {
  // A blocked SDK, an offline client and a key that was never published all
  // read as "default" — none of them is a reason to hide the account system
  // from a player who may already be signed in. Only a deliberate false is.
  assert.equal(valuesFrom({}).accounts_enabled, true);
  assert.equal(valuesFrom({ accounts_enabled: val('false') }).accounts_enabled, false);
  assert.equal(valuesFrom({ accounts_enabled: val('nonsense') }).accounts_enabled, false,
    'asBoolean() reads anything outside its true-list as false — the Console UI is a toggle, so this is reachable only by an explicit edit');
});

test('the sim constants and their Remote Config defaults agree', () => {
  // simulation.js keeps SIM_K / SIM_CENTER / WIN_CAP as the calibrated,
  // committed values and reads the keys at simulate time; remoteConfig.js
  // repeats them as the defaults every client uses until a publish lands. If
  // the two drift, a client with Remote Config unreachable and a client with
  // an untouched Console play on different curves — and the measured anchors
  // at the top of simulation.js describe only one of them.
  const src = readFileSync(new URL('../js/logic/simulation.js', import.meta.url), 'utf8');
  const shipped = name => Number(src.match(new RegExp(`const ${name}\\s*=\\s*([0-9.]+);`))?.[1]);
  assert.equal(DEFAULTS.sim_k.value,      shipped('SIM_K'));
  assert.equal(DEFAULTS.sim_center.value, shipped('SIM_CENTER'));
  assert.equal(DEFAULTS.win_cap.value,    shipped('WIN_CAP'));
});
