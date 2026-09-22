(() => {
  const C = SeriesFeature.components;
  C.seriesCard = item => `<a class="series-card series-cover-card" href="#series/${encodeURIComponent(item.slug)}">
    ${C.image(item.cover_url || item.banner_url, item.title_en)}
    <div class="series-card-body">${C.statusBadge(item.status)}<h2>${C.e(item.title_en)}</h2>
    ${item.title_th ? `<p lang="th">${C.e(item.title_th)}</p>` : ''}
    ${item.premiere_date ? `<time datetime="${C.e(item.premiere_date)}">${C.date(item.premiere_date)}</time>` : ''}
    ${C.text(item.description)}<span class="series-card-cta">View Series <span aria-hidden="true">→</span></span></div></a>`;
})();
