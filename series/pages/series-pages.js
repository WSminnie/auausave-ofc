(() => {
  const S = SeriesFeature,
    C = S.components;
  let request = 0,
    cleanup;
  const currentRoute = () => globalThis.PublicRoutes?.resolve(location) || location.hash.slice(1);
  const shell = (body, item, routeName) => {
    const theme = item ? S.detailView.theme(item) : null;
    return `${nav("series")}<main class="series-public container${item ? ' series-detail-page' : ''}"${theme ? ` data-series-route="${C.e(routeName)}" style="--series-bg:${theme.bg};--series-accent:${theme.accent}"` : ''}>${body}</main>${item ? C.detailFooter() : footer()}`;
  };
  S.pages = {
    async render(routeName) {
      const current = ++request;
      const mounted = app.querySelector('.series-detail-page');
      if (mounted) mounted.setAttribute('aria-busy', 'true');
      else { cleanup?.(); app.innerHTML = shell('<p class="series-empty" role="status">Loading series…</p>'); }
      try {
        let body;
        const rows = await S.api.list("series");
        const slug =
          routeName === "series"
            ? S.defaultSeries(rows)?.slug
            : decodeURIComponent(routeName.slice(7));
        const item = slug ? await S.api.detail(slug, rows.find(row => row.slug === slug)) : null;
        if (item) {
          body = S.desktopView.render(item, rows) + S.detailView.render(item, rows);
        } else if (routeName === "series" && !rows.length) {
          body =
            '<header class="series-landing-head"><h1>Series</h1></header><p class="series-empty">New stories are on their way. Check back soon.</p>';
        } else {
          body =
            C.seriesSelector(rows, null) +
            '<div class="series-empty"><h1>Series not found</h1><p>This series is not available.</p><a href="#series">Back to Series</a></div>';
        }
        if (current !== request || currentRoute() !== routeName) return;
        if (mounted) cleanup?.();
        app.innerHTML = shell(body, item, routeName);
        const root = app.querySelector(".series-public");
        const responsiveCleanup = S.detailView.bind(root);
        const desktopCleanup = S.desktopView.bind(root);
        cleanup = () => { desktopCleanup?.(); responsiveCleanup?.(); };
      } catch (error) {
        if (current !== request || currentRoute() !== routeName) return;
        cleanup?.();
        app.innerHTML = shell(
          '<div class="series-empty" role="alert"><h1>Series could not load</h1><p>Please check your connection and try again.</p><button class="btn" data-series-retry>Try again</button></div>',
        );
        app
          .querySelector("[data-series-retry]")
          .addEventListener("click", () => S.pages.render(routeName));
        console.warn("Series:", error.message);
      }
    },
  };
  const leaveSeries = () => {
    if (!/^series(?:\/|$)/.test(currentRoute())) {
      ++request;
      cleanup?.();
    }
  };
  ["hashchange", "popstate", "publicroutechange"].forEach((event) => window.addEventListener(event, leaveSeries));
})();
