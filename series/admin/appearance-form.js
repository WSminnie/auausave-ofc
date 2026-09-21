(() => {
  const S = SeriesFeature, F = S.fields;
  S.forms.appearances = (item, parents) => `<div class="form-grid">${F.parent(item, parents)}${F.field('date', 'Date', item.date, 'date')}
    ${F.field('title', 'Program / Event name', item.title, 'text', true)}${F.select('type', 'Appearance type', S.types.appearances.types, item.type || 'INTERVIEW')}
    ${F.field('participants', 'Artists / Participants', item.participants)}${F.image('thumbnail_url', 'Thumbnail', item.thumbnail_url)}
    ${F.area('description', 'Short description', item.description)}${F.field('official_url', 'Official URL', item.official_url, 'url')}${F.common(item)}</div>`;
})();
