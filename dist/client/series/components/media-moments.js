(() => {
  const C = SeriesFeature.components;
  C.mediaCard = item => `<article class="series-card">${C.image(item.thumbnail_url, item.title)}<div class="series-card-body">${C.badge(item.type)}<h3>${C.e(item.title)}</h3>${item.date ? `<time datetime="${C.e(item.date)}">${C.date(item.date)}</time>` : ''}${C.text(item.description)}${C.links([{ label: 'View official media', url: item.official_url }])}</div></article>`;
  C.media = rows => rows.length ? `<section id="series-media" class="series-section"><h2>Official Media</h2><div class="series-grid">${rows.map(C.mediaCard).join('')}</div></section>` : '';
  C.moments = rows => rows.length ? `<section id="series-moments" class="series-section"><h2>Series Moments</h2><div class="series-grid">${rows.map(item => `<article class="series-card">${C.image(item.image_url, item.title)}<div class="series-card-body">${item.date ? `<time datetime="${C.e(item.date)}">${C.date(item.date)}</time>` : ''}<h3>${C.e(item.title)}</h3>${C.text(item.description)}${C.links([{ label: 'View moment', url: item.related_url }])}</div></article>`).join('')}</div></section>` : '';
})();
