(() => {
  const S = SeriesFeature, F = S.fields;
  S.forms.episodes = (item, parents, related) => `<div class="form-grid">${F.parent(item, parents)}
    ${F.field('episode_number', 'Episode number', item.episode_number ?? '', 'number', true)}${F.field('title', 'Episode title', item.title)}
    ${F.field('air_date', 'Air date', item.air_date, 'date')}${F.select('status', 'Status', S.types.episodes.statuses, item.status || 'UPCOMING')}
    ${F.image('thumbnail_url', 'Thumbnail', item.thumbnail_url)}${F.area('description', 'Episode synopsis / Description', item.description)}
    ${F.field('keyword', 'Keyword', item.keyword)}${F.field('hashtag', 'Hashtag', item.hashtag)}${F.common(item)}</div>
    ${S.repeat.group('episode-links', 'Episode Links', related.links)}`;
})();
