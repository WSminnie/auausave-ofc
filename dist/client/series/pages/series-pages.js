(() => {
  const S = SeriesFeature, C = S.components;
  let request = 0, cleanup;
  const shell = body => `${nav('series')}<main class="series-public container">${body}</main>${footer()}`;
  S.pages = {
    async render(routeName) {
      const current = ++request;
      cleanup?.();
      app.innerHTML = shell('<p class="series-empty" role="status">Loading series…</p>');
      try {
        let body;
        const rows = await S.api.list('series');
        const slug = routeName === 'series' ? S.defaultSeries(rows)?.slug : decodeURIComponent(routeName.slice(7));
        const item = slug ? await S.api.detail(slug) : null;
        if (item) {
          body = C.seriesSelector(rows, item) + C.hero(item) + C.navigation(item) + C.overview(item) + C.episodes(item.episodes) + C.related(item);
        } else if (routeName === 'series' && !rows.length) {
          body = '<header class="series-landing-head"><h1>Series</h1></header><p class="series-empty">New stories are on their way. Check back soon.</p>';
        } else {
          body = C.seriesSelector(rows, null) + '<div class="series-empty"><h1>Series not found</h1><p>This series is not available.</p><a href="#series">Back to Series</a></div>';
        }
        if (current !== request || location.hash.slice(1) !== routeName) return;
        app.innerHTML = shell(body);
        cleanup = C.bindNavigation(app.querySelector('.series-public'));
        app.querySelector('.series-selector [aria-current]')?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      } catch (error) {
        if (current !== request || location.hash.slice(1) !== routeName) return;
        app.innerHTML = shell('<div class="series-empty" role="alert"><h1>Series could not load</h1><p>Please check your connection and try again.</p><button class="btn" data-series-retry>Try again</button></div>');
        app.querySelector('[data-series-retry]').addEventListener('click', () => S.pages.render(routeName));
        console.warn('Series:', error.message);
      }
    }
  };
  window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#series')) { ++request; cleanup?.(); } });
})();
