/* Responsive Series Detail variant. Existing desktop/admin components stay independent. */
(() => {
  const S = SeriesFeature, C = S.components, D = {};
  const e = value => C.e(value), safe = value => validTimelineUrl(value || '');
  const icon = name => `<span class="sd-icon sd-icon-${name}" aria-hidden="true"></span>`;
  const image = (url, alt, className = '', eager = false) => safe(url)
    ? `<img class="${className}" src="${e(safe(url))}" alt="${e(alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async">`
    : `<span class="sd-image-empty ${className}" role="img" aria-label="${e(alt)} — image unavailable">Image unavailable</span>`;
  const link = (url, label, className = '', symbol = '') => safe(url)
    ? `<a class="${className}" href="${e(safe(url))}" target="_blank" rel="noopener noreferrer">${symbol ? icon(symbol) : ''}${e(label)}<span class="series-sr-only"> (opens in a new tab)</span></a>` : '';
  const episodes = item => [...(item.episodes || [])].sort((a,b) => a.episode_number - b.episode_number);
  const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const finalMarker = row => row.is_finale === true || row.is_final === true || /\bfinal(?:e)?\b|\blast\s+(?:chapter|episode)\b|ตอนจบ/i.test([row.keyword,row.title].join(' ')) || /finalep(?:isode)?\b/i.test(row.hashtag || '');
  D.status = (item, date = today()) => {
    const rows = episodes(item), explicit = rows.filter(finalMarker).at(-1);
    const expected = Number(item.total_episodes || item.episode_count || 0);
    const final = explicit || (expected ? rows.find(row => Number(row.episode_number) === expected) : null) || (item.status === 'COMPLETED' ? rows.at(-1) : null);
    const end = item.finale_date || item.end_date || final?.air_date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(end || '')) return end < date ? 'COMPLETED' : item.premiere_date > date ? 'UPCOMING' : 'ON AIR';
    return ['ON AIR','COMPLETED','UPCOMING'].includes(item.status) ? item.status : item.premiere_date > date ? 'UPCOMING' : 'ON AIR';
  };
  const luminance = hex => {
    const channels = hex.slice(1).match(/../g).map(c => parseInt(c,16)/255).map(c => c <= .04045 ? c/12.92 : ((c+.055)/1.055)**2.4);
    return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
  };
  const contrast = (a,b) => {const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  D.theme = item => {
    const color = value => /^#[0-9a-f]{6}$/i.test(value || '') ? value : '';
    let bg = color(item.theme_bg) || '#1C1A22', accent = color(item.theme_accent) || '#E8D49B';
    if (contrast(bg,'#FFFFFF') < 4.5) bg = '#1C1A22';
    if (contrast(bg,accent) < 4.5) accent = '#E8D49B';
    if (contrast(bg,accent) < 4.5) bg = '#1C1A22';
    return {bg,accent};
  };
  const youtube = url => /(?:^|\.)(?:youtube\.com|youtu\.be)$/i.test(new URL(url).hostname);
  const iqiyi = url => /(?:^|\.)(?:iq\.com|iqiyi\.com)$/i.test(new URL(url).hostname);
  D.watchLink = links => {
    const candidates = (links || []).filter(row => safe(row.url) && !/teaser|trailer|pilot/i.test(row.label || '') && (row.type === 'WATCH' || (!row.type && (iqiyi(row.url) || youtube(row.url) || /watch|episode|stream/i.test(row.label || '')))));
    return candidates.find(row => iqiyi(row.url)) || candidates.find(row => youtube(row.url)) || candidates[0] || null;
  };
  const platform = row => row && iqiyi(row.url) ? 'iQIYI' : row && youtube(row.url) ? 'YouTube' : 'official platform';
  D.buttons = item => {
    const list=episodes(item),completed=D.status(item)==='COMPLETED';
    const start=completed?list[0]:[...list].reverse().find(row=>row.air_date?row.air_date<=today():row.status==='AVAILABLE');
    const watch=D.watchLink(start?.links)||D.watchLink(item.links),primaryUrl=safe(item.primary_button_url)||watch?.url;
    const targetPlatform=primaryUrl?platform({url:primaryUrl}):'';
    const automaticText=!primaryUrl||targetPlatform==='official platform'?'Watch now':start?(completed?`Watch from EP.${start.episode_number} on ${targetPlatform}`:`Watch latest EP on ${targetPlatform}`):`Watch on ${targetPlatform}`;
    const pilot=(item.media||[]).find(row=>row.type==='PILOT'&&row.visible!==false&&safe(row.official_url))||(item.links||[]).find(row=>/pilot/i.test(row.label||'')&&safe(row.url));
    const official=C.officialXLink(item.links);
    const secondaryUrl=safe(item.secondary_button_url)||safe(pilot?.official_url||pilot?.url),tertiaryUrl=safe(item.tertiary_button_url)||safe(official?.url);
    const symbol=url=>url&&youtube(url)?'youtube':url&&C.officialXLink([{url}])?'x':'';
    return [
      {text:String(item.primary_button_text||'').trim()||automaticText,url:primaryUrl,enabled:item.show_primary_button!==false,symbol:primaryUrl&&(youtube(primaryUrl)||iqiyi(primaryUrl))?'play':''},
      {text:String(item.secondary_button_text||'').trim()||'Official Pilot',url:secondaryUrl,enabled:item.show_secondary_button!==false,symbol:symbol(secondaryUrl)},
      {text:String(item.tertiary_button_text||'').trim()||'Official on X',url:tertiaryUrl,enabled:item.show_tertiary_button!==false,symbol:symbol(tertiaryUrl)},
    ];
  };
  const label = category => ({BTS:'Behind the Scenes',OST:'OST',REACTION:'Reaction',TV:'TV',MV:'MV'}[category] || String(category).toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()));
  D.categories = rows => {
    const present=[...new Set(rows.map(row=>row.category))], order=['OST','BTS','REACTION','HIGHLIGHT','SPECIAL','LIVE','TRAILER','TEASER','PILOT'];
    return [...order.filter(type=>present.includes(type)),...present.filter(type=>!order.includes(type))];
  };
  D.defaultRelatedCategory = rows => rows.some(row=>row.category==='OST')?'OST':'';
  const episodeActions = row => {
    const links=row.links || [], watch=D.watchLink(links);
    const teaser=links.find(value=>safe(value.url)&&/teaser/i.test(value.label || value.type || ''));
    const yt=links.find(value=>safe(value.url)&&youtube(value.url)&&!/(teaser|trailer|pilot)/i.test(value.label || '')&&value.url!==watch?.url);
    return `<div class="sd-episode-actions">${watch?link(watch.url,'Watch on '+platform(watch),'sd-button sd-button-dark','play'):''}${teaser?link(teaser.url,'Teaser','sd-button sd-button-outline'):''}${yt?link(yt.url,'YouTube','sd-button sd-button-outline'):''}</div>`;
  };
  const categoryCard = (row, mode='grid') => {
    const content=`${image(row.thumbnail_url,row.title,'sd-content-image')}<span class="sd-content-category">${e(label(row.category))}</span><h3>${e(row.title)}</h3>${mode==='grid'&&row.date?`<time datetime="${e(row.date)}">${C.date(row.date)}</time>`:''}`;
    return safe(row.url)?`<a class="sd-content-card" href="${e(safe(row.url))}" target="_blank" rel="noopener noreferrer">${content}<span class="series-sr-only">Open official source in a new tab</span></a>`:`<article class="sd-content-card">${content}</article>`;
  };
  const hashTab = () => ({'#overview':'overview','#episodes':'episodes','#related':'related','#series-overview':'overview','#series-episodes':'episodes','#series-related':'related'}[location.hash] || 'overview');
  D.render = (item, rows) => {
    const list=episodes(item), status=D.status(item), completed=status==='COMPLETED', related=C.relatedRows(item), categories=D.categories(related);
    const first=list[0], latest=[...list].reverse().find(row => row.air_date ? row.air_date<=today() : row.status==='AVAILABLE') || null;
    const highlighted=completed?list.at(-1):latest;
    const [primary,...secondary]=D.buttons(item);
    const count=list.length, year=String(item.premiere_date || first?.air_date || '').slice(0,4);
    const lastNumber=list.at(-1)?.episode_number;
    const order=completed?'oldest':'newest';
    const sorted=order==='oldest'?list:[...list].reverse();
    const {tv,uncut}=C.broadcastFields(item);
    const relatedDefault=D.defaultRelatedCategory(related),defaultRows=related.filter(row=>!relatedDefault||row.category===relatedDefault),visibleRelated=new Set(defaultRows.slice(0,8));
    return `<div class="sd-detail" data-tab="overview" data-default-order="${order}">
      <div class="sd-overview-hero"><div class="sd-chip-fade"><nav class="sd-series-chips" aria-label="Choose series">${rows.filter(row=>row.visible!==false).map(row=>`<a href="/series/${encodeURIComponent(row.slug)}" ${row.id===item.id?'aria-current="page"':''}>${e(row.title_en)}</a>`).join('')}</nav></div>
      <div class="sd-banner">${image(item.banner_url || item.cover_url,item.title_en,'',true)}</div>
      <header class="sd-hero"><div class="sd-hero-inner"><div class="sd-status-row"><span class="sd-status">${e(status)}</span><span>${e([year,count?`${count} Episodes`:''].filter(Boolean).join(' · '))}</span></div>
      <h1>${e(item.title_en)}</h1>${item.title_th?`<p class="sd-thai-title" lang="th">${e(item.title_th)}</p>`:''}
      ${tv||uncut?`<dl class="sd-broadcast${!tv||!uncut?' is-single':''}">${tv?`<div><dt>TV</dt><dd>${e(tv)}</dd></div>`:''}${uncut?`<div><dt>UNCUT</dt><dd>${e(uncut)}</dd></div>`:''}</dl>`:''}
      ${primary.enabled?link(primary.url,primary.text,'sd-button sd-button-primary',primary.symbol):''}
      <div class="sd-hero-links">${secondary.filter(button=>button.enabled).map(button=>link(button.url,button.text,'sd-button sd-button-secondary',button.symbol)).join('')}</div></div></header></div>
      <nav class="sd-tabs" role="tablist" aria-label="Series sections">${[['overview','Overview',0],['episodes','Episodes',count],['related','Related',related.length]].map(([key,text,total])=>`<button type="button" role="tab" id="sd-tab-${key}" data-sd-tab="${key}" aria-controls="sd-panel-${key}" aria-selected="${key==='overview'}" tabindex="${key==='overview'?0:-1}">${text}${key!=='overview'?`<span class="sd-tab-count">${total}</span>`:''}</button>`).join('')}</nav>
      <div class="sd-panels"><section class="sd-panel sd-overview" id="sd-panel-overview" role="tabpanel" aria-labelledby="sd-tab-overview" tabindex="0">
      ${item.description?`<section class="sd-section"><h2>SYNOPSIS</h2><p class="sd-synopsis" id="sd-synopsis" lang="th">${e(item.description)}</p><button class="sd-read-more" type="button" data-sd-synopsis aria-controls="sd-synopsis" aria-expanded="false">Read more ${icon('down')}</button>${item.official_hashtag?`<div class="sd-social"><p>${C.hashtagLinks(item.official_hashtag)}</p></div>`:''}</section>`:''}
      ${(item.cast || []).length?`<section class="sd-section"><h2>CAST & CHARACTERS</h2><div class="sd-cast-grid">${item.cast.map(person=>`<article class="sd-cast-card">${image(person.image_url,person.artist_name,'sd-cast-image')}<h3>${e(person.artist_name)}</h3>${person.character_name?`<p>as ${e(person.character_name)}</p>`:''}</article>`).join('')}</div></section>`:''}
      ${highlighted?`<section class="sd-section"><div class="sd-section-heading"><h2>${completed?'FINAL':'LATEST'} EPISODE</h2><button type="button" data-sd-tab="episodes">All ${count} episodes</button></div>${(()=>{const w=D.watchLink(highlighted.links),content=`${image(highlighted.thumbnail_url,highlighted.title || 'Episode '+highlighted.episode_number)}<div class="sd-feature-caption"><span>EP.${highlighted.episode_number}${highlighted.air_date?' · '+C.date(highlighted.air_date):''}</span><h3>${e(highlighted.title || 'Episode '+highlighted.episode_number)}</h3></div>${w?`<span class="sd-feature-play">${icon('play')}</span>`:''}`;return w?`<a class="sd-feature" href="${e(safe(w.url))}" target="_blank" rel="noopener noreferrer" aria-label="Watch episode ${highlighted.episode_number}: ${e(highlighted.title || '')}">${content}</a>`:`<article class="sd-feature">${content}</article>`;})()}</section>`:''}
      ${related.length?`<section class="sd-section"><div class="sd-section-heading"><h2>LATEST CONTENT</h2><button type="button" data-sd-tab="related">See all</button></div><div class="sd-latest">${related.slice(0,6).map(row=>categoryCard(row,'latest')).join('')}</div></section>`:''}
      </section>
      <section class="sd-panel" id="sd-panel-episodes" role="tabpanel" aria-labelledby="sd-tab-episodes" tabindex="0" hidden><div class="sd-episode-toolbar"><p>${count} Episodes · ${completed?'Completed':status==='UPCOMING'?'Upcoming':'On air'}</p><button class="sd-sort" type="button" data-sd-sort>${icon('sort')}<span>${completed?'Oldest first':'Newest first'}</span></button></div>
      <div class="sd-episodes">${sorted.map((row,index)=>`<article class="sd-episode" data-episode-number="${row.episode_number}" data-episode-date="${e(row.air_date || '')}"><h3><button type="button" class="sd-episode-toggle" aria-expanded="${index===0}" aria-controls="sd-episode-${e(row.id || row.episode_number)}">${image(row.thumbnail_url,row.title || 'Episode '+row.episode_number,'sd-episode-image')}<span class="sd-episode-meta"><span class="sd-episode-number">EP.${String(row.episode_number).padStart(2,'0')}${completed&&row.episode_number===lastNumber?' · Finale':''}</span><strong>${e(row.title || 'Episode '+row.episode_number)}</strong>${row.air_date?`<time datetime="${e(row.air_date)}">${C.date(row.air_date)}</time>`:''}</span><span class="sd-episode-chevron">${icon('down')}</span></button></h3><div class="sd-episode-expanded" id="sd-episode-${e(row.id || row.episode_number)}" ${index?'hidden':''}>${row.description?`<p class="sd-episode-description" lang="th">${e(row.description)}</p>`:''}${episodeActions(row)}${row.hashtag?`<p class="sd-hashtags">${C.hashtagLinks(row.hashtag)}</p>`:''}</div></article>`).join('') || '<p class="sd-empty">Episodes will be announced soon.</p>'}</div></section>
      <section class="sd-panel" id="sd-panel-related" role="tabpanel" aria-labelledby="sd-tab-related" tabindex="0" hidden>${related.length?`<div class="sd-chip-fade sd-related-fade"><div class="sd-related-filters" role="group" aria-label="Filter related content"><button type="button" data-sd-category="" aria-pressed="${!relatedDefault}">All</button>${categories.map(type=>`<button type="button" data-sd-category="${e(type)}" aria-pressed="${type===relatedDefault}">${e(label(type))}</button>`).join('')}</div></div><div class="sd-related-grid">${related.map(row=>`<div data-sd-related="${e(row.category)}" ${visibleRelated.has(row)?'':'hidden'}>${categoryCard(row)}</div>`).join('')}</div><button type="button" class="sd-load-more" data-sd-more ${defaultRows.length>8?'':'hidden'}>Load more</button>`:'<p class="sd-empty">Related content will be added soon.</p>'}</section></div>
    </div>`;
  };
  let active;
  D.restore = route => {
    if (!active?.root.isConnected || active.root.dataset.seriesRoute !== route || (active.root.dataset.seriesRequestRoute && active.root.dataset.seriesRequestRoute !== route) || !/^(?:#(?:overview|episodes|related|series-overview|series-episodes|series-related))?$/.test(location.hash)) return false;
    active.root.removeAttribute('aria-busy');
    active.tab(hashTab(),false); return true;
  };
  D.bind = root => {
    const view=root.querySelector('.sd-detail');
    if (!view) return ()=>{};
    const media=matchMedia('(max-width: 1023px)'), theme={bg:root.style.getPropertyValue('--series-bg'),accent:root.style.getPropertyValue('--series-accent')};
    const previous=['--series-bg','--series-accent'].map(name=>document.body.style.getPropertyValue(name));
    document.body.classList.add('series-detail-active');
    document.body.style.setProperty('--series-bg',theme.bg);document.body.style.setProperty('--series-accent',theme.accent);
    let header=document.querySelector('.nav');
    const syncHeader=()=>{if(header)root.style.setProperty('--series-header-height',`${header.getBoundingClientRect().height}px`);};
    const headerObserver=new ResizeObserver(syncHeader);
    const replaceHeader=()=>{headerObserver.disconnect();header=document.querySelector('.nav');if(header)headerObserver.observe(header);syncHeader();};
    root.addEventListener('series-headerchange',replaceHeader);
    if(header)headerObserver.observe(header);
    syncHeader();
    const tab=(key,push=true,revealPanel=false)=>{
      if (!['overview','episodes','related'].includes(key)) key='overview';
      const scrollY=window.scrollY;
      view.dataset.tab=key;
      view.querySelectorAll('[role=tab]').forEach(button=>{const selected=button.dataset.sdTab===key;button.setAttribute('aria-selected',selected);button.tabIndex=selected?0:-1;});
      view.querySelectorAll('[role=tabpanel]').forEach(panel=>{panel.hidden=panel.id!=='sd-panel-'+key;});
      if (push && location.hash!=='#'+key){const url=new URL(location.href);url.hash=key;history.pushState(null,'',url);}
      root.dispatchEvent(new CustomEvent('series-detail-tabchange',{detail:{key}}));
      if(revealPanel){
        const hero=view.querySelector('.sd-overview-hero'),header=document.querySelector('.nav');
        window.scrollTo({top:window.scrollY+hero.getBoundingClientRect().bottom-(header?.getBoundingClientRect().height || 56),behavior:'instant'});
      }else window.scrollTo({top:scrollY,behavior:'instant'});
    };
    const chips=[...view.querySelectorAll('.sd-series-chips a')],currentIndex=chips.findIndex(chip=>chip.hasAttribute('aria-current'));
    let limit=8,category=view.querySelector('[data-sd-category][aria-pressed="true"]')?.dataset.sdCategory||'',order=view.dataset.defaultOrder;
    const filter=()=>{
      let matched=0;view.querySelectorAll('[data-sd-related]').forEach(card=>{const match=!category||card.dataset.sdRelated===category;card.hidden=!match||matched++>=limit;});
      const more=view.querySelector('[data-sd-more]');if(more)more.hidden=matched<=limit;
    };
    const click=event=>{
      const button=event.target.closest('button');if(!button || !view.contains(button))return;
      if(button.dataset.sdTab){tab(button.dataset.sdTab,true,button.getAttribute('role')!=='tab');view.querySelector('[role="tab"][data-sd-tab="'+button.dataset.sdTab+'"]').focus({preventScroll:true});return;}
      if(button.hasAttribute('data-sd-synopsis')){
        const expanded=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',expanded);view.querySelector('.sd-synopsis').classList.toggle('is-expanded',expanded);button.innerHTML=(expanded?'Read less':'Read more')+icon('down');
      }else if(button.matches('.sd-episode-toggle')){
        const expanded=button.getAttribute('aria-expanded')!=='true';
        view.querySelectorAll('.sd-episode-toggle').forEach(toggle=>{const open=toggle===button&&expanded;toggle.setAttribute('aria-expanded',open);document.getElementById(toggle.getAttribute('aria-controls')).hidden=!open;});
      }else if(button.hasAttribute('data-sd-sort')){
        order=order==='oldest'?'newest':'oldest';button.lastElementChild.textContent=order==='oldest'?'Oldest first':'Newest first';
        const list=view.querySelector('.sd-episodes');[...list.children].sort((a,b)=>(Number(a.dataset.episodeNumber)-Number(b.dataset.episodeNumber))*(order==='oldest'?1:-1)).forEach(row=>list.append(row));
      }else if(button.hasAttribute('data-sd-category')){
        category=button.dataset.sdCategory;limit=8;view.querySelectorAll('[data-sd-category]').forEach(chip=>chip.setAttribute('aria-pressed',chip===button));filter();
      }else if(button.hasAttribute('data-sd-more')){limit+=8;filter();}
      else if(button.hasAttribute('data-sd-top'))window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    };
    const keydown=event=>{
      if(!event.target.matches('[role=tab]') || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();const tabs=[...view.querySelectorAll('[role=tab]')],i=tabs.indexOf(event.target),next=event.key==='Home'?0:event.key==='End'?2:(i+(event.key==='ArrowRight'?1:2))%3;
      tab(tabs[next].dataset.sdTab);tabs[next].focus();
    };
    view.addEventListener('click',click);view.addEventListener('keydown',keydown);tab(hashTab(),false);
    const selected=chips[currentIndex];
    if(selected && media.matches){const strip=selected.parentElement;strip.scrollLeft=selected.offsetLeft-(strip.clientWidth-selected.offsetWidth)/2;}
    active={root,tab};
    return()=>{
      view.removeEventListener('click',click);view.removeEventListener('keydown',keydown);headerObserver.disconnect();root.removeEventListener('series-headerchange',replaceHeader);
      document.body.classList.remove('series-detail-active');['--series-bg','--series-accent'].forEach((name,i)=>previous[i]?document.body.style.setProperty(name,previous[i]):document.body.style.removeProperty(name));
      if(active?.root===root)active=null;
    };
  };
  S.detailView=D;
})();
