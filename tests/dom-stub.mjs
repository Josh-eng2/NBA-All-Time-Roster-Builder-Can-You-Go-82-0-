/**
 * tests/dom-stub.mjs — the minimum DOM the UI layer needs to run under Node.
 *
 * render.js is pure string templating plus a handful of DOM reads (the mount
 * point, the theme attribute, matchMedia for the desktop breakpoint), so a
 * stub this small is enough to execute every screen's template end to end and
 * catch the failures that actually happen there: reading a field off a null
 * (`S.currentSpin.team`), calling a method on a value the shape doesn't carry
 * (`p2Season.strength.toFixed`), or a helper that throws on an empty roster.
 *
 * It is deliberately NOT a browser. Layout, CSS and event delivery are not
 * modelled and are still verified by playing the game (see the repo README).
 *
 * Must be imported before any UI module, since ui/render.js resolves #app at
 * module scope.
 */

const noop = () => {};

/** Minimal element: enough for innerHTML assignment, listeners and lookups. */
export function makeEl(tag = 'div') {
  const listeners = new Map();
  const el = {
    tagName: String(tag).toUpperCase(),
    id: '',
    value: '',
    innerHTML: '',
    textContent: '',
    style: { setProperty: noop, removeProperty: noop, cssText: '' },
    dataset: {},
    classList: { add: noop, remove: noop, contains: () => false },
    children: [],
    parentNode: null,
    setAttribute(k, v) { this[`_attr_${k}`] = String(v); },
    getAttribute(k) { return this[`_attr_${k}`] ?? null; },
    removeAttribute(k) { delete this[`_attr_${k}`]; },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener(type, fn) {
      const list = listeners.get(type);
      if (list) listeners.set(type, list.filter(f => f !== fn));
    },
    /** Test-only: invokes the handlers registered for `type`.
     *  Iterates a COPY, the way the DOM spec dispatches: a handler that adds
     *  another listener must not have it run for the event in flight. */
    __fire(type, event = {}) {
      for (const fn of [...(listeners.get(type) ?? [])]) fn({ type, target: el, ...event });
    },
    /** Test-only: how many handlers are registered for `type`. Guards against
     *  a re-render re-wiring a node it does not replace. */
    __listenerCount(type) { return (listeners.get(type) ?? []).length; },
    /** Test-only: drops every registered handler (a re-render replaces the node). */
    __resetListeners() { listeners.clear(); },
    appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
    insertBefore(child) { this.children.push(child); child.parentNode = this; return child; },
    // Detaches from the parent's child list too, not just the back-reference.
    // Leaving it in place made a removed node still findable through
    // document.body.children, so a test could not tell a closed modal from a
    // reopened one.
    remove() {
      const kids = this.parentNode?.children;
      const at = kids ? kids.indexOf(this) : -1;
      if (at >= 0) kids.splice(at, 1);
      this.parentNode = null;
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    contains: () => false,
    focus: noop,
    click: noop,
  };
  return el;
}

let _installed = false;

/**
 * Installs the stub globals. Idempotent, and returns the #app element so a
 * test can read back the HTML a render produced.
 */
export function installDom() {
  if (_installed) return globalThis.__app820;
  _installed = true;

  const app  = makeEl('div');
  const html = makeEl('html');
  const head = makeEl('head');
  const body = makeEl('body');
  app.id = 'app';

  const byId = new Map([['app', app]]);
  // Tests register the handful of elements the UI reads back out of the DOM
  // (the team-name inputs and their counters).
  globalThis.__registerEl820 = (id, el) => { byId.set(id, el); return el; };
  globalThis.__unregisterEl820 = id => byId.delete(id);

  globalThis.document = {
    documentElement: html,
    head, body,
    readyState: 'complete',
    getElementById: id => byId.get(id) ?? null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: tag => makeEl(tag),
    createTextNode: text => ({ nodeType: 3, textContent: text, remove: noop }),
    addEventListener: noop,
    removeEventListener: noop,
  };

  globalThis.window = globalThis;
  globalThis.location = {
    hash: '', search: '', hostname: 'localhost', origin: 'http://localhost',
  };
  // Records what syncHashRoute() writes, so a test can pin the route the app
  // leaves in the URL for each phase.
  globalThis.__hashWrites820 = [];
  globalThis.history = {
    replaceState: (_s, _t, url) => {
      globalThis.__hashWrites820.push(url);
      globalThis.location.hash = url;
    },
  };
  // render.js branches on two media queries: the 1024px desktop layout (which
  // emits a different DOM) and the 639px mobile check. `setViewport` below
  // drives them so both arrangements can be rendered.
  globalThis.__mq820 = { desktop: false };
  globalThis.matchMedia = q => ({
    matches: /min-width:\s*1024px/.test(q)
      ? globalThis.__mq820.desktop
      : /max-width:\s*639px/.test(q)
        ? !globalThis.__mq820.desktop
        : false,
    addEventListener: noop, addListener: noop, removeEventListener: noop,
  });
  globalThis.requestAnimationFrame = cb => setTimeout(cb, 0);
  globalThis.cancelAnimationFrame  = noop;
  if (!globalThis.navigator) {
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'node', maxTouchPoints: 0 }, configurable: true,
    });
  }
  globalThis.localStorage = {
    _m: new Map(),
    getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
    setItem(k, v) { this._m.set(k, String(v)); },
    removeItem(k) { this._m.delete(k); },
    clear() { this._m.clear(); },
  };
  globalThis.addEventListener    = noop;
  globalThis.removeEventListener = noop;
  globalThis.crypto ??= { randomUUID: () => `id-${Math.random().toString(36).slice(2)}` };

  globalThis.__app820 = app;
  return app;
}

/** Switches the stub between light and dark so both ramps get exercised. */
export function setTheme(theme) {
  if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
}

/** Switches the stub between the phone and desktop layouts (>=1024px). */
export function setViewport(kind) {
  globalThis.__mq820.desktop = kind === 'desktop';
}

/** Registers an element under an id so document.getElementById finds it. */
export function registerEl(id, el) { return globalThis.__registerEl820(id, el); }

/** Removes a previously registered element. */
export function unregisterEl(id) { globalThis.__unregisterEl820(id); }

/** Every URL syncHashRoute() has written since the last reset. */
export function hashWrites() { return globalThis.__hashWrites820; }

/** Clears the recorded hash writes. */
export function resetHashWrites() { globalThis.__hashWrites820.length = 0; }
