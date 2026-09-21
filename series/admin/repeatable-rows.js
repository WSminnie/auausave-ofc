(() => {
  const S = SeriesFeature, F = S.fields;
  let count = 0;
  function row(kind, value = {}) {
    const key = `series_row_${++count}`;
    const fields = kind === 'cast'
      ? F.field('artist_name', 'Artist', value.artist_name, 'text', true) + F.field('character_name', 'Character name', value.character_name) + F.image(key, 'Character image', value.image_url) + `<input type="hidden" name="description" value="${S.components.e(value.description || '')}">`
      : F.field('label', 'Link label', value.label, 'text', true) + F.field('url', 'Link URL', value.url, 'url', true) + (kind === 'episode-links' ? F.select('type', 'Link type', S.linkTypes, value.type || 'WATCH') : '');
    return `<div class="series-repeat-row" data-row data-image-field="${key}"><div class="form-grid">${fields}</div><div class="series-row-actions"><button type="button" data-move="-1" aria-label="Move row up">Move up</button><button type="button" data-move="1" aria-label="Move row down">Move down</button><button type="button" data-remove>Remove</button></div></div>`;
  }
  function group(kind, label, values) {
    return `<fieldset class="series-repeat-group" data-repeat="${kind}"><legend>${label}</legend><div data-rows>${values.map(value => row(kind, value)).join('')}</div><button type="button" class="btn outline" data-add-row>+ Add ${kind === 'cast' ? 'Cast Member' : 'Link'}</button></fieldset>`;
  }
  function updateButtons(group) {
    const rows = [...group.querySelector('[data-rows]').children];
    rows.forEach((row, index) => {
      row.querySelector('[data-move="-1"]').disabled = index === 0;
      row.querySelector('[data-move="1"]').disabled = index === rows.length - 1;
    });
  }
  function bind(form) {
    form.querySelectorAll('[data-repeat]').forEach(group => {
      updateButtons(group);
      group.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button) return;
        const container = group.querySelector('[data-rows]'), current = button.closest('[data-row]');
        if (button.hasAttribute('data-add-row')) {
          container.insertAdjacentHTML('beforeend', row(group.dataset.repeat));
          container.lastElementChild.querySelector('input')?.focus();
        }
        if (button.hasAttribute('data-remove')) { current.remove(); group.querySelector('[data-add-row]').focus(); }
        if (button.dataset.move === '-1' && current.previousElementSibling) container.insertBefore(current, current.previousElementSibling);
        if (button.dataset.move === '1' && current.nextElementSibling) container.insertBefore(current.nextElementSibling, current);
        updateButtons(group);
      });
    });
  }
  function collect(form, kind) {
    return [...form.querySelectorAll(`[data-repeat="${kind}"] [data-row]`)].map((row, index) => {
      const value = name => row.querySelector(`[name="${name}"]`)?.value.trim() || '';
      const item = { display_order: index, ...(kind === 'cast' ? { artist_name: value('artist_name'), character_name: value('character_name'), image_url: value(row.dataset.imageField), description: value('description') } : { label: value('label'), url: value('url'), ...(kind === 'episode-links' ? { type: value('type') } : {}) }) };
      if (item.url && !validTimelineUrl(item.url)) throw new Error('Links must use an http:// or https:// URL.');
      return item;
    });
  }
  S.repeat = { group, bind, collect };
})();
