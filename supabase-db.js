(function () {
  const config = window.SUPABASE_CONFIG;
  if (!config || !window.supabase) return;
  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: {
      // Keep each admin tab independent so two different accounts can work at
      // the same time without replacing one another's Supabase session.
      storage: window.sessionStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  const tables = ['artists', 'events', 'awards', 'presenters', 'videos'];
  const knownIds = {};
  const storageTimestamp = () => {
    const now = new Date(), pad = (value,size=2) => String(value).padStart(size,'0');
    return `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}_${pad(now.getMilliseconds(),3)}`;
  };
  const storagePathFromUrl = value => {
    if (typeof value !== 'string') return '';
    const marker = `/storage/v1/object/public/${config.mediaBucket}/`;
    const markerIndex = value.indexOf(marker);
    if (markerIndex < 0) return '';
    return decodeURIComponent(value.slice(markerIndex + marker.length).split('?')[0]);
  };
  const collectStoragePaths = (value, result = new Set()) => {
    if (typeof value === 'string') {
      const path = storagePathFromUrl(value);
      if (path) result.add(path);
    } else if (Array.isArray(value)) value.forEach(item => collectStoragePaths(item,result));
    else if (value && typeof value === 'object') Object.values(value).forEach(item => collectStoragePaths(item,result));
    return result;
  };
  const removeUnreferencedMedia = async (oldValue, newValue) => {
    const oldPaths = collectStoragePaths(oldValue), newPaths = collectStoragePaths(newValue);
    const obsoletePaths = [...oldPaths].filter(path => !newPaths.has(path));
    if (!obsoletePaths.length) return;
    const {error} = await client.storage.from(config.mediaBucket).remove(obsoletePaths);
    if (error) console.warn('Storage cleanup:', error.message);
  };
  const mergeSettings = (remote, local) => {
    if (Array.isArray(local)) return local;
    if (!local || typeof local !== 'object') return local;
    const result = remote && typeof remote === 'object' && !Array.isArray(remote) ? {...remote} : {};
    Object.entries(local).forEach(([key,value]) => {
      result[key] = value && typeof value === 'object' && !Array.isArray(value)
        ? mergeSettings(result[key], value)
        : value;
    });
    return result;
  };
  const uploadEmbeddedMedia = async (value, path) => {
    if (typeof value === 'string' && value.startsWith('data:')) {
      const blob = await (await fetch(value)).blob();
      const ext = blob.type.includes('video') ? (blob.type.includes('webm') ? 'webm' : 'mp4') : (blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg');
      const safePath = `${path.replace(/[^a-zA-Z0-9/_-]/g,'_')}_${storageTimestamp()}.${ext}`;
      const {error} = await client.storage.from(config.mediaBucket).upload(safePath, blob, {upsert:true,contentType:blob.type});
      if (error) throw error;
      const publicUrl = client.storage.from(config.mediaBucket).getPublicUrl(safePath).data.publicUrl;
      return `${publicUrl}?v=${storageTimestamp()}`;
    }
    if (Array.isArray(value)) return Promise.all(value.map((item,index)=>{
      const segment = item && typeof item === 'object' && item.id ? String(item.id).replace(/[^a-zA-Z0-9_-]/g,'_') : index;
      return uploadEmbeddedMedia(item,`${path}/${segment}`);
    }));
    if (value && typeof value === 'object') {
      const result = {};
      for (const [key,item] of Object.entries(value)) result[key] = await uploadEmbeddedMedia(item,`${path}/${key}`);
      return result;
    }
    return value;
  };
  const mapFromDb = {
    artists: r => ({ id:r.id,name:r.name,realName:r.real_name,role:r.role,birth:r.birth,initial:r.initial,color:r.color,bio:r.bio,image:r.image_url }),
    events: r => ({ id:r.id,artistId:r.artist_id,date:r.event_date,title:r.title,place:r.place,type:r.event_type,seriesId:r.series_id||'',source:r.source_url||'',poster:r.poster_url||'' }),
    awards: r => ({ id:r.id,artistId:r.artist_id,year:String(r.award_year),title:r.title,org:r.organization,source:r.source_url||'' }),
    presenters: r => ({ id:r.id,artistId:r.artist_id,brand:r.brand,role:r.role,year:String(r.presenter_year),color:r.color,url:r.source_url||'',logo:r.logo_url||'',announcementImage:r.announcement_image_url||'',announcementVideo:r.announcement_video_url||'',mediaFit:r.media_fit||'contain',mediaPosition:r.media_position||'center' }),
    videos: r => ({ id:r.id,artistId:r.artist_id,title:r.title,views:r.views_label,url:r.youtube_url,embedUrl:r.embed_url||'',category:r.category,featured:r.featured?'yes':'no',color:r.color,thumbnail:r.thumbnail_url||'' })
  };
  const mapToDb = {
    artists: r => ({ id:r.id,name:r.name,real_name:r.realName,role:r.role,birth:r.birth,initial:r.initial,color:r.color,bio:r.bio,image_url:r.image||null }),
    events: r => ({ id:r.id,artist_id:r.artistId,event_date:r.date,title:r.title,place:r.place,event_type:r.type,series_id:r.seriesId||null,source_url:r.source||null,poster_url:r.poster||null }),
    awards: r => ({ id:r.id,artist_id:r.artistId,award_year:Number(r.year)||null,title:r.title,organization:r.org,source_url:r.source||null }),
    presenters: r => ({ id:r.id,artist_id:r.artistId,brand:r.brand,role:r.role,presenter_year:Number(r.year)||null,color:r.color,source_url:r.url||null,logo_url:r.logo||null,announcement_image_url:r.announcementImage||null,announcement_video_url:r.announcementVideo||null,media_fit:r.mediaFit||'contain',media_position:r.mediaPosition||'center' }),
    videos: r => ({ id:r.id,artist_id:r.artistId,title:r.title,views_label:r.views,youtube_url:r.url,embed_url:r.embedUrl||null,category:r.category||'variety',featured:r.featured==='yes',color:r.color,thumbnail_url:r.thumbnail||null })
  };

  async function load() {
    const result = { masterData:{types:[],series:[]} };
    for (const table of tables) {
      const { data, error } = await client.from(table).select('*');
      if (error) throw error;
      result[table] = data.map(mapFromDb[table]);
      knownIds[table] = new Set(data.map(row => row.id));
    }
    const [{data:types,error:typeError},{data:series,error:seriesError}] = await Promise.all([
      client.from('event_types').select('*').order('sort_order'),
      client.from('series').select('*').order('name')
    ]);
    if (typeError || seriesError) throw typeError || seriesError;
    result.masterData.types = types.map(x=>({id:x.id,label:x.name}));
    result.masterData.series = series.map(x=>({id:x.id,label:x.name}));
    knownIds.event_types = new Set(types.map(row => row.id));
    knownIds.series = new Set(series.map(row => row.id));
    const {data:settings} = await client.from('site_settings').select('settings').eq('id','homepage').maybeSingle();
    result.siteSettings = settings?.settings || {heroImage:'',heroFit:'cover',heroPosition:'center'};
    return result;
  }

  async function save(database) {
    for (const table of tables) {
      const mediaFields = {artists:['image'],events:['poster'],presenters:['logo','announcementImage','announcementVideo'],videos:['thumbnail']}[table] || [];
      const { data:existing, error:readError } = await client.from(table).select('*');
      if (readError) throw readError;
      const knownBeforeSave = knownIds[table] || new Set();
      const oldManagedRecords = (existing || []).filter(row => knownBeforeSave.has(row.id)).map(mapFromDb[table]);
      const prepared = await Promise.all(database[table].map(async record => {
        const copy = {...record};
        for (const field of mediaFields) {
          if (!copy[field] || !String(copy[field]).startsWith('data:')) continue;
          const blob = await (await fetch(copy[field])).blob();
          const ext = blob.type.includes('video') ? (blob.type.includes('webm')?'webm':'mp4') : (blob.type.includes('png')?'png':blob.type.includes('webp')?'webp':'jpg');
          const path = `${table}/${record.id}/${field}_${storageTimestamp()}.${ext}`;
          const { error } = await client.storage.from(config.mediaBucket).upload(path, blob, {upsert:true,contentType:blob.type});
          if (error) throw error;
          const publicUrl = client.storage.from(config.mediaBucket).getPublicUrl(path).data.publicUrl;
          copy[field] = `${publicUrl}?v=${storageTimestamp()}`;
          record[field] = copy[field];
        }
        return copy;
      }));
      const rows = prepared.map(mapToDb[table]);
      const localIds = new Set(rows.map(row => row.id));
      // Delete only records that this browser previously loaded. This prevents a
      // stale admin session from deleting records recently added by another admin.
      const deletedIds = [...(knownIds[table] || new Set())].filter(id => !localIds.has(id));
      if (deletedIds.length) {
        const { error:deleteError } = await client.from(table).delete().in('id', deletedIds);
        if (deleteError) throw deleteError;
      }
      if (rows.length) {
        const { error } = await client.from(table).upsert(rows, { onConflict:'id' });
        if (error) throw error;
      }
      await removeUnreferencedMedia(oldManagedRecords, prepared);
      knownIds[table] = new Set([...(existing || []).map(row => row.id).filter(id => !deletedIds.includes(id)), ...localIds]);
    }
    const typeRows = database.masterData.types.map((x,i)=>({id:x.id,name:x.label,sort_order:i}));
    const seriesRows = database.masterData.series.map(x=>({id:x.id,name:x.label}));
    for (const [table, rows] of [['event_types',typeRows],['series',seriesRows]]) {
      const {data:existing,error:readError} = await client.from(table).select('id');
      if (readError) throw readError;
      const ids = new Set(rows.map(row=>row.id));
      const deletedIds = [...(knownIds[table] || new Set())].filter(id=>!ids.has(id));
      if (deletedIds.length) {
        const {error:deleteError} = await client.from(table).delete().in('id',deletedIds);
        if (deleteError) throw deleteError;
      }
      if (rows.length) {
        const {error} = await client.from(table).upsert(rows,{onConflict:'id'});
        if (error) throw error;
      }
      knownIds[table] = new Set([...(existing||[]).map(row=>row.id).filter(id=>!deletedIds.includes(id)), ...ids]);
    }
    const {data:latestSettings,error:settingsReadError} = await client.from('site_settings').select('settings').eq('id','homepage').maybeSingle();
    if (settingsReadError) throw settingsReadError;
    database.siteSettings = await uploadEmbeddedMedia(database.siteSettings || {}, 'settings/homepage');
    const mergedSettings = mergeSettings(latestSettings?.settings || {}, database.siteSettings || {});
    const {error:settingsError} = await client.from('site_settings').upsert({id:'homepage',settings:mergedSettings},{onConflict:'id'});
    if (settingsError) throw settingsError;
    await removeUnreferencedMedia(latestSettings?.settings || {}, mergedSettings);
    database.siteSettings = mergedSettings;
    return database;
  }

  async function signIn(email,password){return client.auth.signInWithPassword({email,password});}
  async function signOut(){return client.auth.signOut();}
  async function session(){return client.auth.getSession();}

  window.auausaveDB = { client, load, save, signIn, signOut, session };
})();
