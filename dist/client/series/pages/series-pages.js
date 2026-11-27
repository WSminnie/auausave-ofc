(() => {
  const S = SeriesFeature,
    C = S.components;
  let request = 0,
    cleanup, activeRoot;
  const currentRoute = () => globalThis.PublicRoutes?.resolve(location) || location.hash.slice(1);
  const shell = (body, item, routeName) => {
    const theme = item ? S.detailView.theme(item) : null;
    return `${nav("series")}<main class="series-public container${item ? ' series-detail-page' : ''}"${theme ? ` data-series-route="${C.e(routeName)}" style="--series-bg:${theme.bg};--series-accent:${theme.accent}"` : ''}>${body}</main>${item ? C.detailFooter() : footer()}`;
  };
  S.pages = {
    async render(routeName) {
      const mounted = app.querySelector('.series-detail-page');
      if (mounted && mounted === activeRoot && mounted.dataset.seriesRoute === routeName && mounted.dataset.seriesRequestRoute === routeName) {
        const header=app.querySelector('.nav'),fresh=nav('series');
        if(header && header.outerHTML !== fresh){
          header.outerHTML=fresh;
          mounted.dispatchEvent(new Event('series-headerchange'));
        }
        return;
      }
      const current = ++request;
      let published=false,remembered=mounted?.dataset.seriesRoute===routeName?S.progressiveView.capture(mounted):null;
      if (mounted) {
        if(mounted.dataset.seriesRoute===routeName) mounted.removeAttribute('aria-busy');
        else mounted.setAttribute('aria-busy', 'true');
        mounted.dataset.seriesRequestRoute=routeName;
      }
      else { cleanup?.(); app.innerHTML = shell('<p class="series-empty" role="status">Loading series…</p>'); }
      try {
        let body;
        const rows = await S.api.list("series");
        const slug =
          routeName === "series"
            ? S.defaultSeries(rows)?.slug
            : decodeURIComponent(routeName.slice(7));
        const show = item => {
          if (!item || current !== request || currentRoute() !== routeName) return;
          const root=app.querySelector('.series-detail-page'),same=root?.dataset.seriesRoute===routeName;
          const state=same?S.progressiveView.capture(root):remembered;
          if(state&&remembered){
            state.related=state.related.map(group=>group.category===undefined?(remembered.related.find(old=>old.context===group.context)||group):group);
            if(state.sdCategory===undefined){state.sdCategory=remembered.sdCategory;state.sdCount=remembered.sdCount;}
            if(!state.episodesReady&&remembered.episodesReady)Object.assign(state,{episodesReady:true,ddSort:remembered.ddSort,sdSort:remembered.sdSort,expanded:remembered.expanded});
          }
          const markup=S.progressiveView.markup(item,rows);
          cleanup?.();
          if(same)S.progressiveView.replace(root,markup);
          else app.innerHTML=shell(markup,item,routeName);
          const next=app.querySelector('.series-detail-page');
          next.dataset.seriesRequestRoute=routeName;
          next.removeAttribute('aria-busy');
          next.dataset.seriesEpisodesReady=String(!item._pending?.episodes&&!item._errors?.episodes);
          next.dataset.seriesPending=String(Object.values(item._pending||{}).some(Boolean));
          bind(next);S.progressiveView.restore(next,state);
          remembered=state;published=true;
          document.documentElement.classList.remove('initial-route-loading');
        };
        const item = slug ? await S.api.detail(slug, rows.find(row => row.slug === slug), show) : null;
        if (item) {
          // A mock or older API may not publish progress; the final result still renders.
          if (!published && current === request && currentRoute() === routeName) show(item);
          return;
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
        document.documentElement.classList.remove('initial-route-loading');
        const root = app.querySelector(".series-public");
        activeRoot=null;
      } catch (error) {
        if (current !== request || currentRoute() !== routeName) return;
        cleanup?.();
        app.innerHTML = shell(
          '<div class="series-empty" role="alert"><h1>Series could not load</h1><p>Please check your connection and try again.</p><button class="btn" data-series-retry>Try again</button></div>',
        );
        document.documentElement.classList.remove('initial-route-loading');
        app
          .querySelector("[data-series-retry]")
          .addEventListener("click", () => S.pages.render(routeName));
        console.warn("Series:", error.message);
      }
    },
  };
  function bind(root) {
    activeRoot=root;
    const responsiveCleanup=S.detailView.bind(root),desktopCleanup=S.desktopView.bind(root);
    const retry=event=>{if(!event.target.closest('[data-series-part-retry]'))return;activeRoot=null;S.pages.render(root.dataset.seriesRoute);};
    root.addEventListener('click',retry);
    cleanup=()=>{root.removeEventListener('click',retry);desktopCleanup?.();responsiveCleanup?.();};
  }
  const leaveSeries = () => {
    if (!/^series(?:\/|$)/.test(currentRoute())) {
      ++request;
      cleanup?.();
    }
  };
  ["hashchange", "popstate", "publicroutechange"].forEach((event) => window.addEventListener(event, leaveSeries));
})();
