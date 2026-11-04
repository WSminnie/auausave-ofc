(function (root) {
  function resolve(location) {
    if (location.hash) return location.hash === '#schedule' ? 'schedule' : null;
    return /^\/schedule\/?$/.test(location.pathname) ? 'schedule' : null;
  }
  function canonicalHref(href) {
    const url = new URL(href);
    if (url.searchParams.get('__page') === 'schedule') {
      url.searchParams.delete('__page');
      url.pathname = '/schedule';
    }
    if (url.hash === '#schedule') {
      url.pathname = '/schedule';
      url.hash = '';
    }
    return url.href;
  }
  function syncLocation() {
    const href = canonicalHref(root.location.href);
    if (href !== root.location.href) root.history.replaceState(null, '', href);
  }
  const api = {resolve, canonicalHref, syncLocation};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PublicRoutes = api;
  if (typeof document !== 'undefined') syncLocation();
})(typeof window === 'undefined' ? globalThis : window);
