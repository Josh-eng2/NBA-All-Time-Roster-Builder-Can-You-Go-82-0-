/**
 * js/utils/pageIntegrity.js — defends the page against third-party SDK/ad
 * creative tampering: title rename, forced top-level redirects, and iframes
 * that escape their ad slot to navigate the whole tab.
 *
 * Written after a live incident: a GameDistribution ad-exchange creative
 * renamed document.title to "Blocked" and forced a redirect for organic
 * Google visitors, which got indexed in place of the real page. Nothing
 * here is GD-specific — it protects against the same class of behavior
 * from any ad/portal SDK this game gets embedded with in the future.
 *
 * Loaded as a plain (non-module) <script>, as early as possible in <head>,
 * so the title lock is in place before any SDK script — CrazyGames, GD, or
 * a future addition — has a chance to run. A type="module" script can't be
 * used here: modules are deferred and would load too late.
 */
(function () {
  'use strict';

  // ---- Title lock -------------------------------------------------------
  // Freezes document.title to the real page title and reverts any later
  // attempt to change it, via the document.title setter or by mutating the
  // <title> element's text directly. Nothing in this app's own code sets
  // document.title, so this has no legitimate case to fight — only ever a
  // hijack attempt.
  //
  // THE BASELINE IS CAPTURED SYNCHRONOUSLY, RIGHT HERE, whenever a <title>
  // has already been parsed. index.html puts <title> above this script for
  // exactly that reason, and any page adding this guard should do the same.
  //
  // Why it matters: the fallback below adopts the first non-empty title it
  // ever OBSERVES. This script is loaded ahead of the CrazyGames and
  // GameDistribution SDK tags so the lock is armed before they run — but with
  // <title> parsed after them, one of those synchronous scripts could set
  // document.title first (which creates a <title> element of its own, ahead
  // of the real one in the document) and the guard would then spend the rest
  // of the session defending the hijacked value against the real page. Arming
  // a lock before the value it protects exists is what made that possible.
  //
  // The observer path is kept as a fallback for a page that cannot put its
  // title first: reading document.title at the top there would capture "" and
  // the lock would fight the parser itself, permanently blanking the title.
  var EXPECTED_TITLE = null;

  function onTamper() {
    armNavGuard();
  }

  function currentTitleText() {
    var el = document.querySelector('head > title');
    return el ? el.textContent : '';
  }

  // Synchronous capture, before any other script on the page has run.
  try { EXPECTED_TITLE = currentTitleText() || null; } catch (e) {}

  function checkTitle() {
    var now = currentTitleText();
    if (EXPECTED_TITLE === null) {
      if (now) EXPECTED_TITLE = now; // first real title we've seen — baseline
      return;
    }
    if (now !== EXPECTED_TITLE) {
      onTamper();
      var el = document.querySelector('head > title');
      if (el) el.textContent = EXPECTED_TITLE;
    }
  }

  try {
    var desc = Object.getOwnPropertyDescriptor(Document.prototype, 'title');
    if (desc && desc.configurable && desc.get && desc.set) {
      Object.defineProperty(document, 'title', {
        configurable: true,
        get: function () { return desc.get.call(document); },
        set: function (value) {
          // No baseline yet: nothing established to validate against, so
          // let it through — checkTitle() will adopt it as the baseline
          // once a <title> element backs it.
          if (EXPECTED_TITLE === null || value === EXPECTED_TITLE) {
            desc.set.call(document, value);
          } else {
            onTamper();
            desc.set.call(document, EXPECTED_TITLE);
          }
        }
      });
    }
  } catch (e) {}

  checkTitle(); // in case <title> already exists (e.g. script re-used elsewhere)
  try {
    new MutationObserver(checkTitle).observe(document.head || document.documentElement, {
      childList: true, subtree: true, characterData: true
    });
  } catch (e) {}

  // ---- Transient navigation guard ---------------------------------------
  // Arms a beforeunload confirmation ONLY right after tamper is detected,
  // auto-expiring a few seconds later. Never arms on normal navigation —
  // clicking a link or closing the tab is always silent — so it can only
  // ever interrupt a forced redirect that follows a hijack attempt, never
  // annoy a user doing something ordinary.
  var navGuardUntil = 0;
  function armNavGuard() { navGuardUntil = Date.now() + 8000; }
  window.addEventListener('beforeunload', function (e) {
    if (Date.now() < navGuardUntil) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // ---- Sandbox iframes injected into known ad containers -----------------
  // Ad SDKs render creatives in an iframe they create themselves, so we
  // can't set its `sandbox` attribute at creation time. Instead, watch for
  // iframes landing inside known ad-slot containers and lock them down as
  // soon as they appear: scripts/forms/popups stay allowed (ads still
  // render and click through normally), but the frame can no longer
  // navigate the top-level tab out from under the page — the specific
  // capability the GD incident abused. Add a container id here for any
  // similar portal SDK integrated later.
  var AD_CONTAINER_IDS = ['gdsdk__advertisement'];
  var SAFE_SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation';

  function sandboxIframe(iframe) {
    if (iframe.dataset.pgSandboxed) return;
    iframe.dataset.pgSandboxed = '1';
    try { iframe.setAttribute('sandbox', SAFE_SANDBOX); } catch (e) {}
  }

  function sandboxIframesIn(container) {
    if (!container || !container.querySelectorAll) return;
    var frames = container.querySelectorAll('iframe');
    for (var i = 0; i < frames.length; i++) sandboxIframe(frames[i]);
  }

  function startAdIframeWatch() {
    AD_CONTAINER_IDS.forEach(function (id) {
      var existing = document.getElementById(id);
      if (existing) sandboxIframesIn(existing);
    });
    try {
      new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var added = mutations[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            var node = added[j];
            if (node.nodeType !== 1) continue;
            AD_CONTAINER_IDS.forEach(function (id) {
              var container = document.getElementById(id);
              if (!container) return;
              if (node.tagName === 'IFRAME' && container.contains(node)) {
                sandboxIframe(node);
              } else if (container.contains(node) || node === container) {
                sandboxIframesIn(container);
              }
            });
          }
        }
      }).observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startAdIframeWatch);
  } else {
    startAdIframeWatch();
  }
})();
