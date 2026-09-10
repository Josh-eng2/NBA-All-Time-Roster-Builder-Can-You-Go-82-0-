// Classic deferred script: usable on static content pages without the game bundle.
(() => {
  const query = new URLSearchParams(location.search);
  for (const anchor of document.querySelectorAll('a.seo-cta')) {
    const url = new URL(anchor.href, location.href);
    if (url.origin !== location.origin) continue;
    const ref = query.get('ref');
    if (/^(daily|share|rematch|story|campaign)$/.test(ref || '')) url.searchParams.set('ref', ref);
    for (const key of ['sid', 'campaign']) {
      const value = query.get(key);
      if (/^[a-zA-Z0-9_-]{1,64}$/.test(value || '')) url.searchParams.set(key, value);
    }
    try {
      const host = query.get('via') || (document.referrer ? new URL(document.referrer).hostname : '');
      if (/^[a-z0-9.-]{1,60}$/i.test(host)) url.searchParams.set('via', host);
    } catch (_) {}
    anchor.href = url.href;
  }
})();
