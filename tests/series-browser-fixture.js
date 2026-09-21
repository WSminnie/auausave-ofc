/* Local browser harness only. Never loaded by index.html; no network writes. */
(() => {
  const rows = {
    series: [
      { id: 'fixture-one', title_en: 'A Story to Remember', title_th: 'เรื่องราวที่อยากจดจำ', slug: 'fixture-one', status: 'ON AIR', visible: true, premiere_date: '2026-08-29', description: 'LOCAL TEST FIXTURE — An archive of episodes, cast appearances, and official moments. This content is used only to verify the interface.', broadcast_info: 'Official broadcast channel', streaming_info: 'Official streaming platform', official_hashtag: '#SeriesFixture', cover_url: '', banner_url: '', display_order: 0 },
      { id: 'fixture-two', title_en: 'Another Story', slug: 'fixture-two', status: 'UPCOMING', visible: true, display_order: 1 },
      { id: 'fixture-hidden', title_en: 'Hidden Story', slug: 'fixture-hidden', status: 'UPCOMING', visible: false }
    ],
    episodes: [1, 2, 3].map(n => ({ id: `fixture-ep-${n}`, series_id: 'fixture-one', episode_number: n, status: n === 3 ? 'UPCOMING' : 'AVAILABLE', visible: true, air_date: `2026-09-0${n}`, title: n === 1 ? 'The beginning of a new story' : '', links: [{ label: 'Watch official episode', url: 'https://example.com', type: 'WATCH', display_order: 0 }, { label: 'Official post', url: 'https://example.com/post', type: 'OFFICIAL POST', display_order: 1 }] })),
    appearances: ['INTERVIEW', 'RADIO', 'PRESS'].map((type, n) => ({ id: `fixture-appearance-${n}`, series_id: 'fixture-one', title: `${type} · Cast appearance`, type, date: '2026-09-17', participants: 'Artist A & Artist B', description: 'An official conversation about the series.', official_url: 'https://example.com', visible: true })),
    media: [{ id: 'fixture-media', series_id: 'fixture-one', type: 'TRAILER', title: 'Official Trailer', official_url: 'https://example.com', visible: true }],
    moments: [{ id: 'fixture-moment', series_id: 'fixture-one', title: 'Premiere day', date: '2026-08-29', description: 'A special day for the cast and fans.', visible: true }]
  };
  const sampleImage = `${location.origin}/tests/series-fixture.svg`;
  rows.series[0].cover_url = sampleImage;
  rows.series[0].banner_url = sampleImage;
  rows.episodes[0].thumbnail_url = sampleImage;
  rows.media[0].thumbnail_url = sampleImage;
  const cast = [{ artist_name: 'Artist A', character_name: 'Character A', image_url: sampleImage, description: 'Character information supplied by the admin.' }, { artist_name: 'Artist B', character_name: 'Character B' }];
  const links = [{ label: 'Official page', url: 'https://example.com', display_order: 0 }];
  window.auausaveDB = {
    session: async () => ({ data: { session: { user: { email: 'local-test@example.com' } } } }),
    load: async () => structuredClone(db), save: async value => value, signOut: async () => {}, uploadEmbeddedMedia: async value => value
  };
  SeriesFeature.api = {
    reorder: async (kind, ids) => { ids.forEach((id, index) => { rows[kind].find(row => row.id === id).display_order = index; }); },
    setVisible: async (kind, id, visible) => { rows[kind].find(row => row.id === id).visible = visible; },
    setDefault: async id => { rows.series.forEach(row => { row.is_default = row.id === id; }); },
    list: async (kind, { seriesId, admin = false } = {}) => SeriesFeature.order(rows[kind].filter(item => (admin || item.visible) && (!seriesId || item.series_id === seriesId)), kind),
    related: async (table, _field, id) => table === 'series_cast' ? (rows.series.find(row => row.id === id)?.cast || cast) : table === 'series_links' ? (rows.series.find(row => row.id === id)?.links || links) : rows.episodes.find(row => row.id === id)?.links || [],
    detail: async slug => {
      const item = rows.series.find(row => row.slug === slug && row.visible);
      if (!item) return null;
      const archive = { ...item, cast: item.id === 'fixture-one' ? item.cast || cast : [], links: item.id === 'fixture-one' ? item.links || links : [] };
      for (const kind of ['episodes', 'appearances', 'media', 'moments']) archive[kind] = await SeriesFeature.api.list(kind, { seriesId: item.id });
      return archive;
    },
    save: async (kind, record, related) => {
      const index = rows[kind].findIndex(row => row.id === record.id);
      const item = { ...record, ...related };
      if (index < 0) rows[kind].push(item); else rows[kind][index] = item;
    },
    remove: async (kind, id) => { rows[kind] = rows[kind].filter(row => row.id !== id); }
  };
  router();
})();
