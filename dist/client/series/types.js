/* Database field names are shared by the forms, API and renderers. */
window.SeriesFeature = { components: {}, forms: {} };
(() => {
  const S = window.SeriesFeature;
  S.types = {
    series: { table: 'series_archives', singular: 'Series', label: 'Series', statuses: ['UPCOMING', 'ON AIR', 'COMPLETED'] },
    episodes: { table: 'series_episodes', singular: 'Episode', label: 'Episodes', statuses: ['UPCOMING', 'AVAILABLE'] },
    appearances: { table: 'series_appearances', singular: 'Appearance', label: 'Appearances', types: ['INTERVIEW', 'TV', 'RADIO', 'LIVE', 'PRESS', 'EVENT', 'OTHER'] },
    media: { table: 'series_media', singular: 'Media', label: 'Media', types: ['TRAILER', 'TEASER', 'PILOT', 'OST', 'MV', 'BTS', 'REACTION', 'SPECIAL', 'POSTER', 'OTHER'] },
    moments: { table: 'series_moments', singular: 'Moment', label: 'Moments' }
  };
  S.linkTypes = ['WATCH', 'OFFICIAL POST', 'TRAILER', 'TEASER', 'OTHER'];
  S.defaultSeries = rows => {
    const published = S.order(rows.filter(row => row.visible), 'series');
    return published.find(row => row.is_default) || published[0] || null;
  };
  S.order = (rows, kind) => [...rows].sort((a, b) => {
    const manual = a.display_order != null || b.display_order != null;
    const order = manual ? (a.display_order ?? (kind === 'episodes' ? a.episode_number : Infinity)) - (b.display_order ?? (kind === 'episodes' ? b.episode_number : Infinity)) : 0;
    return (Number.isNaN(order) ? 0 : order) || (kind === 'episodes' ? a.episode_number - b.episode_number : String(b.date || '').localeCompare(a.date || '')) || String(a.id).localeCompare(String(b.id));
  });
})();
