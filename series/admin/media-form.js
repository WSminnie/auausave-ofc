(() => {
  const S = SeriesFeature, F = S.fields;
  S.forms.media = (item, parents) => `<div class="form-grid">${F.parent(item, parents)}${F.select('type', 'Media type', S.types.media.types, item.type || 'TRAILER')}
    ${F.field('title', 'Title', item.title, 'text', true)}${F.field('date', 'Date', item.date, 'date')}${F.image('thumbnail_url', 'Thumbnail', item.thumbnail_url)}
    ${F.area('description', 'Description', item.description)}${F.field('official_url', 'Official URL', item.official_url, 'url')}${F.common(item)}</div>`;
})();
