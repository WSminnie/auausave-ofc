(() => {
  const C = SeriesFeature.components;
  const labels = { BTS: 'Behind the Scenes', TV: 'TV', OST: 'OST', MV: 'MV' };
  const label = type => labels[type] || String(type).toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
  C.relatedRows = item => [
    ...(item.appearances || []).map(row => ({ ...row, category: row.type || 'Appearance', url: row.official_url })),
    ...(item.media || []).map(row => ({ ...row, category: row.type || 'Media', url: row.official_url })),
    ...(item.moments || []).map(row => ({ ...row, category: 'Moment', thumbnail_url: row.image_url, url: row.related_url }))
  ].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  C.related = item => {
    const rows = C.relatedRows(item);
    if (!rows.length) return '';
    const categories = [...new Set(rows.map(row => row.category))];
    for (const [type, after] of [['REACTION', 'BTS'], ['PILOT', 'TEASER']]) {
      if (!categories.includes(type) || !categories.includes(after)) continue;
      categories.splice(categories.indexOf(type), 1);
      categories.splice(categories.indexOf(after) + 1, 0, type);
    }
    const defaultCategory = categories.includes('OST') ? 'OST' : '';
    return `<section id="series-related" class="series-section"><h2>RELATED CONTENT</h2>
      ${categories.length > 1 ? `<div class="series-filters" role="group" aria-label="Filter related content"><button type="button" data-related-filter="" aria-pressed="${!defaultCategory}">All</button>${categories.map(type => `<button type="button" data-related-filter="${C.e(type)}" aria-pressed="${type === defaultCategory}">${C.e(label(type))}</button>`).join('')}</div>` : ''}
      <div class="series-grid">${rows.map(row => `<article class="series-card" data-related-category="${C.e(row.category)}" ${defaultCategory && row.category !== defaultCategory ? 'hidden' : ''}>${C.image(row.thumbnail_url, row.title)}<div class="series-card-body">${C.badge(label(row.category))}<h3>${C.e(row.title)}</h3>${row.date ? `<time datetime="${C.e(row.date)}">${C.date(row.date)}</time>` : ''}${C.text(row.participants)}${C.text(row.description)}${C.links([{label:'View official source',url:row.url}])}</div></article>`).join('')}</div></section>`;
  };
})();
