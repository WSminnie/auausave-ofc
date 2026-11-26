(() => {
  const S = SeriesFeature,
    F = S.fields;
  const broadcastField = (item, name, flag, label, channel) => `<div class="full series-broadcast-setting"><label class="series-display-option"><input type="checkbox" name="${flag}" ${item[flag] !== false ? 'checked' : ''}><span>Show ${channel} on website</span></label>${F.area(name,label,item[name])}</div>`;
  const buttonSettings = (item,related) => {
    const defaults=S.detailView.buttons({...item,links:related.links||[],media:related.media||item.media||[]});
    return `<fieldset class="series-button-settings"><legend>Series buttons</legend><p class="series-field-help">Set each button's text and link. Turn it off to hide it. Blank fields use their automatic values.</p>${[['primary','Main button'],['secondary','Left button'],['tertiary','Right button']].map(([prefix,title],index)=>{
      const button=defaults[index];
      return `<section class="series-button-slot" data-button-slot="${prefix}"><div class="series-button-slot-heading"><h3>${title}</h3><label class="series-display-option"><input type="checkbox" name="show_${prefix}_button" ${button.enabled?'checked':''} aria-label="Show ${title.toLowerCase()}"><span>Show button</span></label></div><label class="field"><span>Button text</span><input name="${prefix}_button_text" aria-label="${title} text" value="${S.components.e(item[prefix+'_button_text']||'')}" placeholder="${S.components.e(button.text)}"></label><label class="field"><span>Button link</span><input name="${prefix}_button_url" type="url" aria-label="${title} link" value="${S.components.e(item[prefix+'_button_url']||'')}" placeholder="${S.components.e(button.url||'https://…')}"></label></section>`;
    }).join('')}</fieldset>`;
  };
  S.forms.series = (item, _parents, related) => `<div class="form-grid">
    ${S.master.field(item)}
    ${F.field("title_en", "Series Title EN", item.title_en, "text", true)}${F.field("title_th", "Series Title TH", item.title_th)}
    ${F.field("slug", "Slug", item.slug, "text", true)}${F.select("status", "Status", S.types.series.statuses, item.status || "UPCOMING")}
    ${F.color("theme_bg", "Hero background", item.theme_bg, "#1C1A22")}${F.color("theme_accent", "Accent color", item.theme_accent, "#E8D49B")}
    <p class="series-field-help full" id="series-theme-help">Choose a dark background and a contrasting accent for buttons and highlights. Use the picker or enter a hex color.</p>
    ${F.image("banner_url", "Banner image · 1600 × 400 PX", item.banner_url || item.cover_url)}
    ${F.area("description", "Description / Synopsis", item.description)}${F.field("premiere_date", "Premiere date", item.premiere_date, "date")}
    <label class="field full"><span>Official hashtags</span><input name="official_hashtag" value="${S.components.e(item.official_hashtag || "")}" aria-describedby="series-hashtag-help" placeholder="#ชื่อซีรีส์ #SeriesName"><small id="series-hashtag-help">ใส่ # นำหน้าแต่ละแฮชแท็กและคั่นด้วยเว้นวรรค บนเว็บไซต์แต่ละแฮชแท็กจะคลิกค้นหาบน X ได้</small></label>
    ${buttonSettings(item,related)}
    ${broadcastField(item,"broadcast_info","show_broadcast_info","Broadcast information","TV")}${broadcastField(item,"streaming_info","show_streaming_info","Streaming information","UNCUT")}${F.common(item)}</div>
    ${S.repeat.group("cast", "Cast / Characters", related.cast)}`;
  S.forms.prepareSeries = (values, existingLinks = []) => {
    const {official_x_url, ...record} = values;
    for(const prefix of ['primary','secondary','tertiary'])if(record[prefix+'_button_url']){
      const url=validTimelineUrl(record[prefix+'_button_url']);
      if(!url)throw new Error('Button links must use an http:// or https:// URL.');
      record[prefix+'_button_url']=url;
    }
    for (const key of ['theme_bg','theme_accent']) if(record[key] && !/^#[0-9a-f]{6}$/i.test(record[key])) throw new Error('Enter a six-digit hex color, such as #221833.');
    const theme=S.detailView.theme(record);
    if ((record.theme_bg && theme.bg!==record.theme_bg) || (record.theme_accent && theme.accent!==record.theme_accent)) throw new Error('Choose a darker background and a contrasting accent color for readable text.');
    let links=existingLinks.map(row=>({...row}));
    if(Object.hasOwn(values,'official_x_url')){
      const url=validTimelineUrl(official_x_url || '');
      if(official_x_url && (!url || !S.components.officialXLink([{url}])))throw new Error('Official on X must use an X or Twitter URL.');
      links=links.filter(row=>!S.components.officialXLink([row]));if(url)links.unshift({label:'Official on X',url,display_order:0});
    }
    return {record,links};
  };
  S.forms.bindSeries = form => {
    form.querySelectorAll('[data-series-color]').forEach(picker=>{
      const hex=form.elements.namedItem(picker.dataset.seriesColor);
      picker.addEventListener('input',()=>{hex.value=picker.value.toUpperCase();});
      hex.addEventListener('input',()=>{if(/^#[0-9a-f]{6}$/i.test(hex.value))picker.value=hex.value;});
    });
  };
})();
