/* Fill Series data without treating pending or failed collections as empty archives. */
(() => {
  const S=SeriesFeature,V={};
  const pending=(item,key)=>Boolean(item._pending?.[key]);
  const unavailable=(item,key)=>pending(item,key)||Boolean(item._errors?.[key]);
  const message=(item,key,label)=>pending(item,key)
    ? `<div class="series-part-status" role="status" aria-live="polite">Loading ${label.toLowerCase()}…</div>`
    : `<div class="series-part-status" role="alert">Could not load ${label.toLowerCase()}. <button type="button" data-series-part-retry="${key}" ${Object.values(item._pending||{}).some(Boolean)?'disabled title="Retry is available when the remaining content finishes loading"':''}>Try again</button></div>`;
  V.markup=(item,rows)=>{
    const template=document.createElement('template');
    template.innerHTML=S.desktopView.render(item,rows)+S.detailView.render(item,rows);
    const tree=template.content;
    if(unavailable(item,'episodes')){
      tree.querySelector('.dd-hero-meta > span:last-child').textContent=tree.querySelector('.dd-hero-meta > span:last-child').textContent.replace(/(?: · )?0 Episodes/, '');
      tree.querySelectorAll('[data-dd-tab="episodes"] .dd-tab-count,[data-sd-tab="episodes"] .sd-tab-count').forEach(el=>el.textContent=pending(item,'episodes')?'…':'—');
      tree.querySelectorAll('.dd-episode-grid,.sd-episodes').forEach(el=>el.innerHTML=message(item,'episodes','Episodes'));
      tree.querySelectorAll('[data-dd-sort],[data-sd-sort]').forEach(el=>el.hidden=true);
      tree.querySelector('.dd-episode-toolbar h2 span').textContent='';
      tree.querySelector('.sd-episode-toolbar > p').textContent='Episodes';
      const preview=document.createElement('section');preview.className='dd-section';preview.innerHTML='<div class="dd-section-heading"><h2>EPISODES</h2></div>'+message(item,'episodes','Episodes');
      tree.querySelector('#dd-panel-overview').insertBefore(preview,tree.querySelector('[data-dd-related-context="overview"]'));
    }
    if(unavailable(item,'related')){
      tree.querySelectorAll('[data-dd-tab="related"] .dd-tab-count,[data-sd-tab="related"] .sd-tab-count').forEach(el=>el.textContent=pending(item,'related')?'…':'—');
      tree.querySelector('[data-dd-related-context="overview"]').innerHTML='<div class="dd-section-heading"><h2>RELATED CONTENT</h2></div>'+message(item,'related','Related content');
      tree.querySelector('#dd-panel-related').innerHTML=message(item,'related','Related content');
      tree.querySelector('#sd-panel-related').innerHTML=message(item,'related','Related content');
      tree.querySelector('#sd-panel-overview').insertAdjacentHTML('beforeend','<section class="sd-section"><div class="sd-section-heading"><h2>LATEST CONTENT</h2></div>'+message(item,'related','Related content')+'</section>');
    }
    if(unavailable(item,'core')){
      tree.querySelector('.dd-overview-grid').insertAdjacentHTML('beforeend','<section class="dd-cast"><h2>CAST & CHARACTERS</h2>'+message(item,'core','Cast and official links')+'</section>');
      tree.querySelector('#sd-panel-overview').insertAdjacentHTML('beforeend','<section class="sd-section"><h2>CAST & OFFICIAL LINKS</h2>'+message(item,'core','Cast and official links')+'</section>');
    }
    // Stable semantic keys retain keyboard focus even when cards are reordered.
    const occurrences=new Map();
    for(const el of tree.querySelectorAll('a,button')){
      const variant=el.closest('.sd-detail')?'mobile':'desktop';
      const context=el.closest('[data-dd-related-context]')?.dataset.ddRelatedContext||el.closest('[data-dd-episode]')?.dataset.ddEpisode||'';
      const episode=el.closest('[data-episode-number]')?.dataset.episodeNumber||'';
      const action=[...el.attributes].filter(attr=>attr.name.startsWith('data-')||['href','aria-controls','id'].includes(attr.name)).map(attr=>attr.name+'='+attr.value).join('|');
      const key=[variant,context,episode,el.tagName,action].join(':');const index=occurrences.get(key)||0;occurrences.set(key,index+1);el.dataset.seriesFocusKey=key+':'+index;
    }
    return template.innerHTML;
  };
  V.capture=root=>{
    const selected=document.activeElement,focus=selected&&root.contains(selected)?{key:selected.dataset.seriesFocusKey,id:selected.id}:null;
    const related=[...root.querySelectorAll('[data-dd-related-context]')].map(section=>({context:section.dataset.ddRelatedContext,category:section.querySelector('[data-dd-category][aria-pressed="true"]')?.dataset.ddCategory,count:section.querySelectorAll('[data-dd-related-category]:not([hidden])').length}));
    return {y:scrollY,focus,related,sdCategory:root.querySelector('[data-sd-category][aria-pressed="true"]')?.dataset.sdCategory,sdCount:root.querySelectorAll('[data-sd-related]:not([hidden])').length,
      episodesReady:root.dataset.seriesEpisodesReady==='true',ddSort:root.querySelector('[data-dd-sort]')?.textContent.trim(),sdSort:root.querySelector('[data-sd-sort]')?.textContent.trim(),
      expanded:root.querySelector('.sd-episode-toggle[aria-expanded="true"]')?.getAttribute('aria-controls')||null,
      synopsis:[...root.querySelectorAll('[data-dd-synopsis][aria-expanded="true"]')].map(el=>el.dataset.ddSynopsis),readMore:root.querySelector('.sd-synopsis')?.classList.contains('is-expanded'),
      strips:[...root.querySelectorAll('.sd-series-chips,.sd-latest,.sd-related-filters,.dd-series-selector')].map(el=>({className:el.className,x:el.scrollLeft}))};
  };
  V.replace=(root,markup)=>{
    const images=new Map();for(const image of root.querySelectorAll('img')){const key=image.getAttribute('src')+'|'+image.className;if(!images.has(key))images.set(key,[]);images.get(key).push(image);}
    const template=document.createElement('template');template.innerHTML=markup;
    for(const image of template.content.querySelectorAll('img')){const old=images.get(image.getAttribute('src')+'|'+image.className)?.shift();if(old)image.replaceWith(old);}
    root.replaceChildren(template.content);
  };
  V.restore=(root,state)=>{
    if(!state)return;
    const selectCategory=(scope,key,attr)=>{const button=[...scope.querySelectorAll('['+attr+']')].find(el=>el.getAttribute(attr)===key);button?.click();};
    for(const old of state.related){const section=[...root.querySelectorAll('[data-dd-related-context]')].find(el=>el.dataset.ddRelatedContext===old.context);if(!section||old.category===undefined)continue;selectCategory(section,old.category,'data-dd-category');const more=section.querySelector('[data-dd-more]');for(let i=0;i<100&&more&&!more.hidden&&section.querySelectorAll('[data-dd-related-category]:not([hidden])').length<old.count;i++)more.click();}
    if(state.sdCategory!==undefined){selectCategory(root,state.sdCategory,'data-sd-category');const more=root.querySelector('[data-sd-more]');for(let i=0;i<100&&more&&!more.hidden&&root.querySelectorAll('[data-sd-related]:not([hidden])').length<state.sdCount;i++)more.click();}
    if(state.episodesReady){for(const [selector,label] of [['[data-dd-sort]',state.ddSort],['[data-sd-sort]',state.sdSort]]){const button=root.querySelector(selector);if(button&&button.textContent.trim()!==label)button.click();}for(const toggle of root.querySelectorAll('.sd-episode-toggle')){const open=toggle.getAttribute('aria-controls')===state.expanded;toggle.setAttribute('aria-expanded',String(open));root.querySelector('#'+CSS.escape(toggle.getAttribute('aria-controls'))).hidden=!open;}}
    for(const id of state.synopsis){const button=root.querySelector('[data-dd-synopsis="'+CSS.escape(id)+'"]');if(button?.getAttribute('aria-expanded')!=='true')button?.click();}
    if(state.readMore&&root.querySelector('[data-sd-synopsis]')?.getAttribute('aria-expanded')!=='true')root.querySelector('[data-sd-synopsis]')?.click();
    for(const strip of state.strips){const el=[...root.querySelectorAll('.sd-series-chips,.sd-latest,.sd-related-filters,.dd-series-selector')].find(el=>el.className===strip.className);if(el)el.scrollLeft=strip.x;}
    const focused=state.focus;let target=focused?.key?root.querySelector('[data-series-focus-key="'+CSS.escape(focused.key)+'"]'):null;
    if(!target&&focused?.id)target=root.querySelector('#'+CSS.escape(focused.id));
    target?.focus({preventScroll:true});window.scrollTo({top:state.y,behavior:'instant'});
  };
  S.progressiveView=V;
})();
