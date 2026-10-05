(() => {
  const C = SeriesFeature.components;
  C.episodeCard = item => {
    const number = `EP.${String(item.episode_number).padStart(2, '0')}`;
    const synopsisId = `series-synopsis-${item.id || item.episode_number}`;
    return `<article class="series-archive-episode">
      ${C.image(item.thumbnail_url, item.title || number) || `<div class="series-image series-episode-placeholder" aria-label="${C.e(number)} thumbnail unavailable"><span>${C.e(number)}</span></div>`}
      <div class="series-episode-body"><div class="series-title-row"><h3>${C.e(number)}</h3></div>
      ${item.air_date ? `<time datetime="${C.e(item.air_date)}">${C.date(item.air_date)}</time>` : ''}
      ${item.title ? `<h4>${C.e(item.title)}</h4>` : ''}
      ${item.description ? `<div class="series-synopsis"><p class="series-copy series-synopsis-preview">${C.e(item.description)}</p><button type="button" class="series-read-more" data-synopsis-open aria-haspopup="dialog" aria-controls="${C.e(synopsisId)}">Read synopsis<span class="series-sr-only"> for ${C.e(number)}</span></button></div>
      <dialog id="${C.e(synopsisId)}" class="series-synopsis-dialog" aria-labelledby="${C.e(synopsisId)}-title">
        <header class="series-synopsis-head"><h2 id="${C.e(synopsisId)}-title">${C.e(number)}${item.title ? ` · ${C.e(item.title)}` : ''}</h2><button type="button" class="series-synopsis-close" data-synopsis-close aria-label="Close synopsis" autofocus><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
        <div class="series-synopsis-content"><p class="series-copy">${C.e(item.description)}</p></div>
      </dialog>` : ''}
      ${item.keyword || item.hashtag ? `<div class="series-episode-meta">${item.keyword ? `<p class="series-keyword">${C.e(item.keyword)}</p>` : ''}${item.hashtag ? `<p class="series-hashtag">${C.hashtagLinks(item.hashtag)}</p>` : ''}</div>` : ''}
      ${C.links(item.links)}</div></article>`;
  };
  C.episodes = rows => rows.length ? `<section id="series-episodes" class="series-section"><h2>EPISODES <span class="series-count" aria-label="${rows.length} episodes">${String(rows.length).padStart(2, '0')}</span></h2><div class="series-episode-list">${rows.map(C.episodeCard).join('')}</div></section>` : '';
})();
