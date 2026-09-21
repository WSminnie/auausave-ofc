(() => {
  const C = SeriesFeature.components;
  C.hero = item => `${C.image(item.banner_url || item.cover_url, item.title_en, true)}<header class="series-hero">
    <div class="series-heading"><div class="series-title-row"><h1>${C.e(item.title_en)}</h1>${C.badge(item.status)}</div>
    ${item.title_th ? `<p class="series-thai-title" lang="th">${C.e(item.title_th)}</p>` : ''}
    ${item.premiere_date ? `<p class="series-premiere">Premiere · <time datetime="${C.e(item.premiere_date)}">${C.date(item.premiere_date)}</time></p>` : ''}</div><dl class="series-header-facts">${C.meta('Broadcast', item.broadcast_info)}${C.meta('Streaming', item.streaming_info)}</dl></header>`;
  C.cast = cast => cast.length ? `<section class="series-cast"><h3>Cast & Characters</h3><div class="series-cast-grid">${cast.map(person => `<article>${C.image(person.image_url, person.character_name || person.artist_name)}<div><h4>${C.e(person.artist_name)}</h4>${person.character_name ? `<p>as ${C.e(person.character_name)}</p>` : ''}${C.text(person.description)}</div></article>`).join('')}</div></section>` : '';
  C.overview = item => `<section id="series-overview" class="series-section"><h2>ABOUT THE SERIES</h2>${C.text(item.description)}
    ${item.official_hashtag || item.links.length ? `<div class="series-social-row">${item.links.length ? C.links(item.links) : ''}${item.official_hashtag ? `<p class="series-hashtag">${C.hashtagLinks(item.official_hashtag)}</p>` : ''}</div>` : ''}${C.cast(item.cast)}</section>`;
})();
