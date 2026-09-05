/**
 * The account modal's wiring.
 *
 * THE BUG THIS EXISTS FOR. paint() replaces the modal root's CHILDREN but not
 * the root itself, and it used to re-attach the delegated action listeners to
 * that surviving root on every repaint. So the listener count doubled on every
 * view switch — 1, 2, 4, 8 — because each live listener handled the click and
 * added one more. Two consequences, both real:
 *
 *   * every subsequent click rebuilt the whole modal 2^n times, so a player
 *     bouncing between "Sign in" and "Create an account" a dozen times froze
 *     the tab;
 *   * reaching the delete view takes exactly one repaint, so two listeners
 *     were always live when "Delete my account" was pressed — and doDelete()
 *     armed its re-entrancy guard AFTER an await, leaving the door open long
 *     enough for both to start deleting.
 *
 * Counting listeners is the assertion that catches the root cause of both.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { installDom } from './dom-stub.mjs';

installDom();

// A click event the delegated handler can read. The stub does not implement
// closest(), so the "button" is supplied directly.
const clickOn = action => ({ target: { closest: () => ({ dataset: { auth: action } }) } });

const { showAuthModal, closeAuthModal } =
  await import(new URL('../js/ui/authModal.js', import.meta.url).href);

/** The mounted root, which the modal appends to document.body. */
const modalRoot = () => document.body.children.find(el => el.id === 'auth-modal-root');

test('switching views does not accumulate action listeners', async () => {
  await showAuthModal('signin');
  const root = modalRoot();
  assert.ok(root, 'the modal did not mount');
  assert.equal(root.__listenerCount('click'), 1, 'more than one action listener on a fresh modal');

  // Two keydown listeners at mount is correct and deliberate — the Tab trap
  // and the Enter-submits shortcut. What must not happen is either count
  // GROWING, so the baseline is captured rather than hard-coded.
  const baselineKeydown = root.__listenerCount('keydown');

  // The exact loop a player performs when they are not sure whether they
  // already have an account.
  const views = ['to-signup', 'to-signin', 'to-reset', 'to-signin', 'to-signup', 'to-signin'];
  for (const action of views) root.__fire('click', clickOn(action));

  assert.equal(root.__listenerCount('click'), 1,
    `click listeners grew to ${root.__listenerCount('click')} across ${views.length} view switches`);
  assert.equal(root.__listenerCount('keydown'), baselineKeydown,
    `keydown listeners grew to ${root.__listenerCount('keydown')} from ${baselineKeydown}`);

  closeAuthModal();
});

test('the listener count is flat, not merely small, over many switches', async () => {
  // Doubling is what makes this fatal rather than untidy: 20 switches is a
  // million listeners and a million rebuilds per click. Assert the count is
  // independent of the number of switches, so a partial fix cannot pass.
  await showAuthModal('signin');
  const root = modalRoot();
  for (let i = 0; i < 20; i++) {
    root.__fire('click', clickOn(i % 2 ? 'to-signin' : 'to-signup'));
  }
  assert.equal(root.__listenerCount('click'), 1,
    `click listeners grew to ${root.__listenerCount('click')} across 20 view switches`);
  closeAuthModal();
});

test('each mount starts clean and closing releases the root', async () => {
  await showAuthModal('signin');
  const first = modalRoot();
  first.__fire('click', clickOn('to-signup'));
  closeAuthModal();

  await showAuthModal('signin');
  const second = modalRoot();
  assert.notEqual(second, first, 'the modal reused a closed root');
  assert.equal(second.__listenerCount('click'), 1, 'a remount inherited listeners');
  closeAuthModal();
  assert.equal(modalRoot(), undefined, 'the root outlived closeAuthModal()');
});

test('the delete confirmation is armed before its first await', async () => {
  // doDelete() is the one handler whose re-entrancy guard has to be set
  // synchronously: the dispatcher reads `_busy` in the same task as the click,
  // so a guard set after `await getCurrentUser()` protects nothing. Reading
  // the source is the only way to pin an ordering the stub cannot execute
  // (getCurrentUser needs the Firebase SDK), and it is worth pinning — this is
  // the single irreversible action in the product.
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../js/ui/authModal.js', import.meta.url), 'utf8');
  // Comments are stripped first — this file explains the ordering in prose
  // right where it matters, and the prose mentions the await it is about.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const body = code.slice(code.indexOf('async function doDelete('));
  const busyAt  = body.indexOf('setBusy(true');
  const awaitAt = body.indexOf('await ');
  assert.ok(busyAt > 0 && awaitAt > 0, 'doDelete no longer has the shape this pins');
  assert.ok(busyAt < awaitAt,
    'doDelete awaits before setting _busy — a second click can start a second deletion');
});
