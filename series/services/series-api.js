(() => {
  const S = window.SeriesFeature;
  const client = () => {
    if (!window.auausaveDB?.client) throw new Error('Cannot connect to the database. Please try again.');
    return window.auausaveDB.client;
  };
  const result = async query => {
    const { data, error } = await query;
    if (error) throw new Error(error.code === '23505' ? 'This slug or episode number already exists. Please choose another.' : error.message);
    return data;
  };
  async function list(kind, { seriesId, admin = false } = {}) {
    let query = client().from(S.types[kind].table).select('*');
    if (!admin) query = query.eq('visible', true);
    if (seriesId) query = query.eq('series_id', seriesId);
    // Page through PostgREST's row limit so archives are not silently truncated.
    const rows = [];
    for (let offset = 0; ; offset += 500) {
      const page = await result(query.order('id').range(offset, offset + 499));
      rows.push(...page);
      if (page.length < 500) break;
    }
    return S.order(rows, kind);
  }
  async function related(table, field, id) {
    const rows = [];
    for (let offset = 0; ; offset += 500) {
      const page = await result(client().from(table).select('*').eq(field, id).order('display_order').order('id').range(offset, offset + 499));
      rows.push(...page);
      if (page.length < 500) return rows;
    }
  }
  async function detail(slug) {
    const item = await result(client().from('series_archives').select('*').eq('slug', slug).eq('visible', true).maybeSingle());
    if (!item) return null;
    const [cast, links, episodes, appearances, media, moments] = await Promise.all([
      related('series_cast', 'series_id', item.id), related('series_links', 'series_id', item.id),
      ...['episodes', 'appearances', 'media', 'moments'].map(kind => list(kind, { seriesId: item.id }))
    ]);
    // Batch link requests rather than issue one network request per episode.
    // RLS additionally checks both episode and series publication.
    const linksByEpisode = new Map(episodes.map(episode => [episode.id, []]));
    for (let start = 0; start < episodes.length; start += 100) {
      const ids = episodes.slice(start, start + 100).map(episode => episode.id);
      for (let offset = 0; ; offset += 500) {
        const page = await result(client().from('series_episode_links').select('*').in('episode_id', ids).order('display_order').order('id').range(offset, offset + 499));
        page.forEach(link => linksByEpisode.get(link.episode_id)?.push(link));
        if (page.length < 500) break;
      }
    }
    episodes.forEach(episode => { episode.links = linksByEpisode.get(episode.id); });
    return { ...item, cast, links, episodes, appearances, media, moments };
  }
  async function save(kind, values, { cast = [], links = [] } = {}) {
    const { data, error } = await window.auausaveDB.session();
    if (error || !data?.session) throw new Error('Your session has expired. Sign in again to save.');
    const record = await window.auausaveDB.uploadEmbeddedMedia(values, `series/${values.id}`);
    if (kind === 'series') {
      cast = await window.auausaveDB.uploadEmbeddedMedia(cast, `series/${values.id}/cast`);
      await result(client().rpc('save_series_archive', { p_record: record, p_cast: cast, p_links: links }));
    } else if (kind === 'episodes') {
      await result(client().rpc('save_series_episode', { p_record: record, p_links: links }));
    } else {
      await result(client().from(S.types[kind].table).upsert(record).select('id').single());
    }
  }
  async function remove(kind, id) {
    await result(client().from(S.types[kind].table).delete().eq('id', id).select('id').single());
  }
  async function setVisible(kind, id, visible) {
    await result(client().from(S.types[kind].table).update({ visible }).eq('id', id).select('id').single());
  }
  async function setDefault(id) {
    await result(client().rpc('set_default_series', { p_series_id: id }));
  }
  async function reorder(kind, ids, seriesId) {
    await result(client().rpc('reorder_series_content', { p_kind: kind, p_ids: ids, p_series_id: seriesId || null }));
  }
  S.api = { list, detail, related, save, remove, setVisible, setDefault, reorder };
})();
