(() => {
  const C = SeriesFeature.components;
  C.episodeCard = item => {
    const number = `EP.${String(item.episode_number).padStart(2, '0')}`;
    const synopsisId = `series-synopsis-${item.id || item.episode_number}`;
    return `<article class="series-archive-episode">
      ${C.image(item.thumbnail_url, item.title || number) || `<div class="series-image series-episode-placeholder" aria-label="${C.e(number)} thumbnail unavailable"><span>${C.e(number)}</span></div>`}
      <div class="series-episode-body"><div class="series-title-row"><h3>${C.e(number)}</h3>${item.status ? `<span class="series-status ${item.status === 'AVAILABLE' ? 'is-available' : 'is-upcoming'}">${C.e(item.status === 'UPCOMING' ? 'COMING SOON' : item.status)}</span>` : ''}</div>
      ${item.air_date ? `<time datetime="${C.e(item.air_date)}">${C.date(item.air_date)}</time>` : ''}
      ${item.title ? `<h4>${C.e(item.title)}</h4>` : ''}
      ${item.description ? `<div class="series-synopsis"><p id="${C.e(synopsisId)}" class="series-copy is-collapsed">${C.e(item.description)}</p><button type="button" class="series-read-more" data-synopsis-toggle aria-controls="${C.e(synopsisId)}" aria-expanded="false" hidden>Read synopsis</button></div>` : ''}
      ${item.keyword || item.hashtag ? `<div class="series-episode-meta">${item.keyword ? `<p class="series-keyword">${C.e(item.keyword)}</p>` : ''}${item.hashtag ? `<p class="series-hashtag">${C.hashtagLinks(item.hashtag)}</p>` : ''}</div>` : ''}
      ${C.links(item.links)}</div></article>`;
  };
  C.episodes = rows => rows.length ? `<section id="series-episodes" class="series-section"><h2>EPISODES <span class="series-count" aria-label="${rows.length} episodes">${String(rows.length).padStart(2, '0')}</span></h2><div class="series-episode-list">${rows.map(C.episodeCard).join('')}</div></section>` : '';
})();
