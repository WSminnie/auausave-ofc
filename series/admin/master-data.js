(() => {
  const S = SeriesFeature;
  function defaults(master) {
    const name = String(master.label || '').trim();
    const english = /[a-z]/i.test(name);
    const slug = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const channels = normalizeBroadcasts(master.broadcasts);
    const describe = row => [row.channel, row.time, row.mode === 'online_uncut' ? 'UNCUT' : ''].filter(Boolean).join(' · ');
    return {
      title_en: english ? name : '',
      title_th: english ? '' : name,
      slug: slug(name) || slug(master.id),
      broadcast_info: channels.filter(row => row.mode === 'live').map(describe).join('\n'),
      streaming_info: channels.filter(row => row.mode === 'online_uncut').map(describe).join('\n')
    };
  }
  function field(item) {
    const rows = db.masterData?.series || [];
    return `<div class="field full">${S.fields.select('master_series_id', 'Series from Master Data', [{value:'',label:'Enter manually (no Master link)'}, ...rows.map(row => ({value:row.id,label:row.label}))], item.master_series_id || '')}<small>Select a series to fill available details. Your edits are kept. Saving here does not change Master Data or schedules.</small></div>`;
  }
  function bind(form) {
    const last = {};
    form.elements.master_series_id.addEventListener('change', event => {
      const master = (db.masterData?.series || []).find(row => row.id === event.target.value);
      const values = master ? defaults(master) : Object.fromEntries(Object.keys(last).map(key => [key, '']));
      for (const [key, value] of Object.entries(values)) {
        const input = form.elements[key];
        if (!input.value.trim() || (Object.hasOwn(last, key) && input.value === last[key])) {
          input.value = value;
          last[key] = value;
        }
      }
    });
  }
  S.master = { defaults, field, bind };
})();
