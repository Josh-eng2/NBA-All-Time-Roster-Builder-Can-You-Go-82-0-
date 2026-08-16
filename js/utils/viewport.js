/**
 * js/utils/viewport.js — the single source of truth for "how much room do we
 * actually have?".
 *
 * Everything about the responsive system is CSS-first (see css/responsive.css);
 * this module exists only for the two things CSS genuinely cannot measure:
 *
 *  1. `--app-h` — the *visual* viewport height. `100dvh` is correct on modern
 *     browsers, but it updates on a different schedule to the visual viewport
 *     on iOS/Android when the URL bar slides, and it ignores the on-screen
 *     keyboard entirely. `window.visualViewport.height` is the number the user
 *     can actually see, so we publish it and let CSS use it with a `100dvh`
 *     fallback baked into the declaration order.
 *  2. `--app-w` — same story horizontally (pinch-zoom shrinks the visual
 *     viewport width).
 *
 * Nothing here decides layout. No breakpoint logic, no device detection, no
 * class toggling — all of that lives in media queries where it belongs. If you
 * find yourself wanting to branch on a width in JS, add a media query instead.
 *
 * Updates are coalesced into one rAF so a drag-resize (which fires `resize`
 * dozens of times a second) costs one style write per frame.
 */

let rafId       = 0;
let installed   = false;
let vvListeners = [];   // [target, event, handler] triples, for teardown
let ro          = null;

/** Write the measured viewport to CSS custom properties (one rAF max). */
function publish() {
  rafId = 0;
  const vv = window.visualViewport;
  // visualViewport is the visible box; innerHeight is the layout box. Prefer
  // the former, fall back to the latter on browsers without it.
  const h = Math.round(vv ? vv.height : window.innerHeight);
  const w = Math.round(vv ? vv.width  : window.innerWidth);
  const root = document.documentElement;
  // Guard against the transient 0 some browsers report mid-orientation-change:
  // writing it would collapse the whole shell for a frame.
  if (h > 0) root.style.setProperty('--app-h', h + 'px');
  if (w > 0) root.style.setProperty('--app-w', w + 'px');
}

function schedule() {
  if (rafId) return;
  rafId = requestAnimationFrame(publish);
}

function on(target, event, handler) {
  if (!target) return;
  target.addEventListener(event, handler, { passive: true });
  vvListeners.push([target, event, handler]);
}

/**
 * Start tracking the viewport. Idempotent — calling it twice is a no-op, so
 * it is safe to call from more than one entry point.
 */
export function initViewport() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const vv = window.visualViewport;
  // `resize` covers window drags and orientation; `scroll` on visualViewport is
  // what fires when a mobile URL bar slides away without a resize event.
  on(window, 'resize', schedule);
  on(window, 'orientationchange', schedule);
  on(document, 'fullscreenchange', schedule);
  on(document, 'webkitfullscreenchange', schedule);
  on(vv, 'resize', schedule);
  on(vv, 'scroll', schedule);

  // Safety net for the cases no event covers: a container query-ish resize of
  // the document itself (embeds, iframes, devtools docking, CrazyGames/GD
  // wrappers resizing the frame we live in).
  if ('ResizeObserver' in window) {
    ro = new ResizeObserver(schedule);
    ro.observe(document.documentElement);
  }

  publish();
}

/**
 * Stop tracking and remove every listener. Not used by the game itself (the
 * shell lives for the whole session) but keeps the module honest and testable,
 * and makes it safe to embed.
 */
export function destroyViewport() {
  if (!installed) return;
  installed = false;
  if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  for (const [target, event, handler] of vvListeners) {
    target.removeEventListener(event, handler);
  }
  vvListeners = [];
  if (ro) { ro.disconnect(); ro = null; }
  const root = document.documentElement;
  root.style.removeProperty('--app-h');
  root.style.removeProperty('--app-w');
}
