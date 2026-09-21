(() => {
  const S = SeriesFeature, F = S.fields;
  S.forms.moments = (item, parents) => `<div class="form-grid">${F.parent(item, parents)}${F.field('date', 'Date', item.date, 'date')}
    ${F.field('title', 'Title', item.title, 'text', true)}${F.image('image_url', 'Image', item.image_url)}${F.area('description', 'Description', item.description)}
    ${F.field('related_url', 'Related URL', item.related_url, 'url')}${F.common(item)}</div>`;
})();
