(() => {
  const S = SeriesFeature, F = S.fields;
  S.forms.series = (item, _parents, related) => `<div class="form-grid">
    ${S.master.field(item)}
    ${F.field('title_en', 'Series Title EN', item.title_en, 'text', true)}${F.field('title_th', 'Series Title TH', item.title_th)}
    ${F.field('slug', 'Slug', item.slug, 'text', true)}${F.select('status', 'Status', S.types.series.statuses, item.status || 'UPCOMING')}
    ${F.image('banner_url', 'Banner image', item.banner_url || item.cover_url)}
    ${F.area('description', 'Description / Synopsis', item.description)}${F.field('premiere_date', 'Premiere date', item.premiere_date, 'date')}
    <label class="field full"><span>Official hashtags</span><input name="official_hashtag" value="${S.components.e(item.official_hashtag || '')}" aria-describedby="series-hashtag-help" placeholder="#ชื่อซีรีส์ #SeriesName"><small id="series-hashtag-help">ใส่ # นำหน้าแต่ละแฮชแท็กและคั่นด้วยเว้นวรรค บนเว็บไซต์แต่ละแฮชแท็กจะคลิกค้นหาบน X ได้ ปุ่มบัญชี X เพิ่มได้ใน Official Links ด้านล่าง</small></label>${F.area('broadcast_info', 'Broadcast information', item.broadcast_info)}${F.area('streaming_info', 'Streaming information', item.streaming_info)}${F.common(item)}</div>
    ${S.repeat.group('links', 'Official Links', related.links)}${S.repeat.group('cast', 'Cast / Characters', related.cast)}`;
})();
