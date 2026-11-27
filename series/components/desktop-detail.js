/* Desktop-only Series Detail variant; mobile continues to own its existing markup. */
(() => {
  const S = SeriesFeature, C = S.components, D = S.detailView, V = {};
  const e = value => C.e(value), safe = value => validTimelineUrl(value || '');
  const icon = name => `<span class="dd-icon dd-icon-${name}" aria-hidden="true"></span>`;
  const image = (url, alt, className, eager = false) => safe(url)
    ? `<img class="${className}" src="${e(safe(url))}" alt="${e(alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async">`
    : `<span class="${className} dd-image-empty" role="img" aria-label="${e(alt)} — image unavailable">Image unavailable</span>`;
  const external = url => new URL(url).origin !== globalThis.location?.origin;
  const anchor = (url, text, className = '', symbol = '', iconOnly = false) => {
    const href = safe(url); if (!href) return '';
    return `<a class="${className}" href="${e(href)}"${external(href) ? ' target="_blank" rel="noopener noreferrer"' : ''}${iconOnly ? ` aria-label="${e(text)}" title="${e(text)}"` : ''}>${symbol ? icon(symbol) : ''}${iconOnly ? '' : e(text)}</a>`;
  };
  const categoryName = value => ({ BTS: 'Behind the Scenes', OST: 'OST', TV: 'TV', MV: 'MV' }[value] || String(value || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()));
  const numbered = item => [...(item.episodes || [])].sort((a,b) => a.episode_number - b.episode_number);
  const youtube = url => /(?:^|\.)(?:youtube\.com|youtu\.be)$/i.test(new URL(url).hostname);
  const watchName = url => /(?:^|\.)(?:iq\.com|iqiyi\.com)$/i.test(new URL(url).hostname) ? 'Watch on iQIYI' : youtube(url) ? 'Watch on YouTube' : 'Watch now';
  const episodeLinks = row => {
    const links = row.links || [], watch = D.watchLink(links);
    const teaser = links.find(link => safe(link.url) && /teaser/i.test(link.label || link.type || ''));
    const yt = links.find(link => safe(link.url) && youtube(link.url) && !/teaser|trailer|pilot/i.test(link.label || '') && link.url !== watch?.url);
    return `${watch ? anchor(watch.url, watchName(watch.url), 'dd-button dd-watch', 'play') : ''}${teaser ? anchor(teaser.url, 'Teaser', 'dd-button dd-outline') : ''}${yt ? anchor(yt.url, 'YouTube', 'dd-button dd-outline') : ''}`;
  };
  V.episodeCard = (row, context) => {
    const id = `dd-synopsis-${context}-${row.id || row.episode_number}`;
    return `<article class="dd-episode" data-dd-episode="${context}" data-episode-number="${row.episode_number}">
      ${image(row.thumbnail_url, row.title || 'Episode '+row.episode_number, 'dd-episode-image')}
      <div class="dd-episode-body"><div class="dd-episode-meta"><span>EP.${String(row.episode_number).padStart(2,'0')}</span>${row.air_date ? `<time datetime="${e(row.air_date)}">${C.date(row.air_date)}</time>` : ''}</div>
      <h3>${e(row.title || 'Episode '+row.episode_number)}</h3>${row.description ? `<p class="dd-episode-preview" lang="th">${e(row.description)}</p>` : ''}
      <div class="dd-episode-actions">${episodeLinks(row)}${row.description ? `<button type="button" class="dd-synopsis-toggle" data-dd-synopsis="${e(id)}" aria-controls="${e(id)}" aria-expanded="false">Synopsis</button>` : ''}</div></div>
      ${row.description ? `<div class="dd-episode-expanded" id="${e(id)}" hidden><p lang="th">${e(row.description)}</p>${row.hashtag ? `<p class="dd-hashtags">${C.hashtagLinks(row.hashtag)}</p>` : ''}</div>` : ''}
    </article>`;
  };
  V.relatedCard = row => {
    const href = safe(row.url), content = `${image(row.thumbnail_url, row.title || 'Related content', 'dd-related-image')}<span class="dd-related-category">${e(categoryName(row.category))}</span><h3>${e(row.title)}</h3>${row.date ? `<time datetime="${e(row.date)}">${C.date(row.date)}</time>` : ''}`;
    return href ? `<a class="dd-related-card" href="${e(href)}"${external(href) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${content}</a>` : `<article class="dd-related-card">${content}</article>`;
  };
  const relatedSection = (rows, context) => {
    const category=D.defaultRelatedCategory(rows),matches=rows.filter(row=>!category||row.category===category),visible=new Set(matches.slice(0,8));
    return `<section class="dd-section dd-related-section" data-dd-related-context="${context}" data-dd-default-category="${category}"><div class="dd-section-heading dd-related-heading"><h2>RELATED CONTENT</h2>${rows.length ? `<div class="dd-related-filters" role="group" aria-label="Filter ${context === 'overview' ? 'overview ' : ''}related content"><button type="button" data-dd-category="" aria-pressed="${!category}">All</button>${D.categories(rows).map(type => `<button type="button" data-dd-category="${e(type)}" aria-pressed="${type===category}">${e(categoryName(type))}</button>`).join('')}</div>` : ''}</div>
    <div class="dd-related-grid">${rows.map(row => `<div data-dd-related-category="${e(row.category)}"${visible.has(row) ? '' : ' hidden'}>${V.relatedCard(row)}</div>`).join('')}</div>
    ${rows.length ? `<button type="button" class="dd-load-more" data-dd-more${matches.length <= 8 ? ' hidden' : ''}>Load more</button>` : '<p class="dd-empty">Related content will be added soon.</p>'}
  </section>`;
  };
  const currentTab = () => {
    const key = location.hash.replace(/^#(?:series-)?/,'');
    return ['overview','episodes','related'].includes(key) ? key : 'overview';
  };
  V.render = (item, rows) => {
    const status = D.status(item), completed = status === 'COMPLETED', allEpisodes = numbered(item), episodes = completed ? allEpisodes : [...allEpisodes].reverse(), related = C.relatedRows(item);
    const [primary,...secondary] = D.buttons(item), {tv,uncut} = C.broadcastFields(item);
    const year = String(item.premiere_date || allEpisodes[0]?.air_date || '').slice(0,4);
    const genre = Array.isArray(item.genres) ? item.genres.filter(value => typeof value === 'string').join(', ') : typeof item.genre === 'string' ? item.genre : '';
    const meta = [year, `${episodes.length} Episodes`, genre, item.premiere_date ? 'Premiere '+C.date(item.premiere_date) : ''].filter(Boolean);
    const cast = (item.cast || []).map(person => `<article class="dd-cast-card">${image(person.image_url,person.artist_name,'dd-cast-image')}<div><h3>${e(person.artist_name)}</h3>${person.character_name ? `<p>as ${e(person.character_name)}</p>` : ''}</div></article>`).join('');
    return `<div class="series-desktop-detail dd-detail" data-dd-default-order="${completed ? 'oldest' : 'newest'}">
      <section class="dd-hero"><div class="dd-container container"><nav class="dd-series-selector" aria-label="Choose series">${rows.filter(row => row.visible !== false).map(row => `<a href="/series/${encodeURIComponent(row.slug)}"${row.id === item.id ? ' aria-current="page"' : ''}>${e(row.title_en)}</a>`).join('')}</nav>
      <div class="dd-banner">${image(item.banner_url || item.cover_url,item.title_en,'dd-banner-image',true)}</div>
      <header class="dd-hero-grid"><div class="dd-hero-heading"><div class="dd-hero-meta"><span class="dd-status">${e(status)}</span><span>${e(meta.join(' · '))}</span></div><h1>${e(item.title_en)}</h1>${item.title_th ? `<p class="dd-thai-title" lang="th">${e(item.title_th)}</p>` : ''}</div>
      <div class="dd-hero-side">${tv || uncut ? `<dl class="dd-broadcast${!tv || !uncut ? ' is-single' : ''}">${tv ? `<div><dt>TV</dt><dd>${e(tv)}</dd></div>` : ''}${uncut ? `<div><dt>UNCUT</dt><dd>${e(uncut)}</dd></div>` : ''}</dl>` : ''}<div class="dd-hero-actions">${primary.enabled ? anchor(primary.url,primary.text,'dd-primary','play') : ''}${secondary.filter(button => button.enabled).map(button => anchor(button.url,button.text,'dd-icon-button',button.symbol || 'external',true)).join('')}</div></div></header></div></section>
      <nav class="dd-tabs" aria-label="Series sections" role="tablist"><div class="dd-container container">${[['overview','Overview',0],['episodes','Episodes',episodes.length],['related','Related',related.length]].map(([key,text,count]) => `<button type="button" role="tab" id="dd-tab-${key}" data-dd-tab="${key}" aria-controls="dd-panel-${key}" aria-selected="${key === 'overview'}" tabindex="${key === 'overview' ? 0 : -1}">${text}${key !== 'overview' ? `<span class="dd-tab-count">${count}</span>` : ''}</button>`).join('')}</div></nav>
      <div class="dd-panels dd-container container"><section class="dd-panel" id="dd-panel-overview" role="tabpanel" aria-labelledby="dd-tab-overview" tabindex="0">
      <div class="dd-overview-grid"><section class="dd-synopsis"><h2>SYNOPSIS</h2>${item.description ? `<p lang="th">${e(item.description)}</p>` : '<p class="dd-empty">More about this series will be added soon.</p>'}${(item.links || []).length || item.official_hashtag ? `<div class="dd-social">${C.officialXLink(item.links) ? anchor(C.officialXLink(item.links).url,'Official on X') : ''}${item.official_hashtag ? `<p>${C.hashtagLinks(item.official_hashtag)}</p>` : ''}</div>` : ''}</section>${cast ? `<section class="dd-cast"><h2>CAST & CHARACTERS</h2><div class="dd-cast-list">${cast}</div></section>` : ''}</div>
      ${episodes.length ? `<section class="dd-section"><div class="dd-section-heading"><h2>EPISODES</h2><button type="button" data-dd-open="episodes">All ${episodes.length} episodes →</button></div><div class="dd-episode-grid">${episodes.slice(0,4).map(row => V.episodeCard(row,'overview')).join('')}</div></section>` : ''}${relatedSection(related,'overview')}
      </section><section class="dd-panel" id="dd-panel-episodes" role="tabpanel" aria-labelledby="dd-tab-episodes" tabindex="0" hidden><div class="dd-episode-toolbar"><h2>EPISODES <span>${episodes.length} · ${completed ? 'Completed' : status === 'UPCOMING' ? 'Upcoming' : 'On air'}</span></h2><button type="button" class="dd-sort" data-dd-sort>${icon('sort')}<span>${completed ? 'Oldest first' : 'Newest first'}</span></button></div><div class="dd-episode-grid" data-dd-episode-list>${episodes.map(row => V.episodeCard(row,'episodes')).join('') || '<p class="dd-empty">Episodes will be announced soon.</p>'}</div></section>
      <section class="dd-panel" id="dd-panel-related" role="tabpanel" aria-labelledby="dd-tab-related" tabindex="0" hidden>${relatedSection(related,'related')}</section></div>
    </div>`;
  };
  V.bind = root => {
    const view = root.querySelector('.dd-detail'); if (!view) return () => {};
    const media = matchMedia('(min-width: 1024px)');
    const activate = key => {
      view.querySelectorAll('[role="tab"]').forEach(button => { const active = button.dataset.ddTab === key; button.setAttribute('aria-selected',String(active)); button.tabIndex = active ? 0 : -1; });
      view.querySelectorAll('[role="tabpanel"]').forEach(panel => { panel.hidden = panel.id !== 'dd-panel-'+key; });
    };
    const select = (key,reveal = false) => {
      const scrollY = window.scrollY, url = new URL(location.href); url.hash = key;
      if (url.href !== location.href) history.pushState(null,'',url);
      S.detailView.restore(root.dataset.seriesRoute); activate(key);
      if (reveal) {
        const boundary = view.querySelector('.dd-hero').getBoundingClientRect().bottom + window.scrollY, header = document.querySelector('.nav')?.getBoundingClientRect().height || 72;
        window.scrollTo({top:boundary-header,behavior:'instant'});
      } else window.scrollTo({top:scrollY,behavior:'instant'});
    };
    const relatedStates = new Map([...view.querySelectorAll('[data-dd-related-context]')].map(section => [section,{limit:8,category:section.dataset.ddDefaultCategory||''}]));
    const filter = section => {
      const state = relatedStates.get(section); let count = 0;
      section.querySelectorAll('[data-dd-related-category]').forEach(card => { const match = !state.category || card.dataset.ddRelatedCategory === state.category; card.hidden = !match || count++ >= state.limit; });
      const more = section.querySelector('[data-dd-more]');
      if (more) more.hidden = count <= state.limit;
    };
    let order = view.dataset.ddDefaultOrder;
    const click = event => {
      const button = event.target.closest('button'); if (!button || !view.contains(button)) return;
      if (button.dataset.ddTab || button.dataset.ddOpen) { const key = button.dataset.ddTab || button.dataset.ddOpen; select(key,Boolean(button.dataset.ddOpen)); view.querySelector('[role="tab"][data-dd-tab="'+key+'"]').focus({preventScroll:true}); }
      else if (button.hasAttribute('data-dd-sort')) {
        order = order === 'oldest' ? 'newest' : 'oldest'; button.lastElementChild.textContent = order === 'oldest' ? 'Oldest first' : 'Newest first';
        const list = view.querySelector('[data-dd-episode-list]'); [...list.children].sort((a,b) => (Number(a.dataset.episodeNumber)-Number(b.dataset.episodeNumber))*(order === 'oldest' ? 1 : -1)).forEach(row => list.append(row));
      } else if (button.hasAttribute('data-dd-category')) {
        const section = button.closest('[data-dd-related-context]'), state = relatedStates.get(section); state.category = button.dataset.ddCategory; state.limit = 8;
        section.querySelectorAll('[data-dd-category]').forEach(chip => chip.setAttribute('aria-pressed',String(chip === button))); filter(section);
      } else if (button.hasAttribute('data-dd-more')) { const section = button.closest('[data-dd-related-context]'); relatedStates.get(section).limit += 8; filter(section); }
      else if (button.dataset.ddSynopsis) { const expanded = button.getAttribute('aria-expanded') !== 'true'; button.setAttribute('aria-expanded',String(expanded)); document.getElementById(button.dataset.ddSynopsis).hidden = !expanded; button.textContent = expanded ? 'Hide synopsis' : 'Synopsis'; }
    };
    const keydown = event => {
      if (!event.target.matches('[role="tab"]') || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault(); const tabs = [...view.querySelectorAll('[role="tab"]')], current = tabs.indexOf(event.target), next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (current+(event.key === 'ArrowRight' ? 1 : 2))%3;
      select(tabs[next].dataset.ddTab); tabs[next].focus();
    };
    const sync = event => activate(event.detail.key);
    const resized = () => { if (media.matches) window.closePublicMenu?.(); };
    view.addEventListener('click',click); view.addEventListener('keydown',keydown); root.addEventListener('series-detail-tabchange',sync); media.addEventListener('change',resized); activate(currentTab()); resized();
    return () => { view.removeEventListener('click',click); view.removeEventListener('keydown',keydown); root.removeEventListener('series-detail-tabchange',sync); media.removeEventListener('change',resized); };
  };
  S.desktopView = V;
})();
