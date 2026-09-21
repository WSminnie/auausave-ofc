(() => {
  const C = SeriesFeature.components;
  C.seriesSelector = (rows, selected) => rows.length > 1
    ? `<nav class="series-selector" aria-label="Choose series">${rows.map(row => `<a href="#series/${encodeURIComponent(row.slug)}" ${row.id === selected?.id ? 'aria-current="page"' : ''}>${C.e(row.title_en)}</a>`).join('')}</nav>`
    : '';
})();
