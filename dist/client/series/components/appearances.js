(() => {
  const C = SeriesFeature.components;
  C.appearanceCard = item => `<article class="series-card" data-appearance-type="${C.e(item.type)}">${C.image(item.thumbnail_url, item.title)}<div class="series-card-body">
    ${item.date ? `<time datetime="${C.e(item.date)}">${C.date(item.date)}</time>` : ''}<h3>${C.e(item.title)}</h3>${C.badge(item.type)}${C.text(item.participants)}${C.text(item.description)}${C.links([{ label: 'Official source', url: item.official_url }])}</div></article>`;
  C.appearances = rows => rows.length ? `<section id="series-appearances" class="series-section"><h2>Promotion & Appearances</h2>
    <div class="series-filters" role="group" aria-label="Filter appearances">${['ALL', ...new Set(rows.map(row => row.type))].map(type => `<button type="button" data-appearance-filter="${C.e(type)}" aria-pressed="${type === 'ALL'}">${C.e(type)}</button>`).join('')}</div>
    <div class="series-grid">${rows.map(C.appearanceCard).join('')}</div></section>` : '';
})();
