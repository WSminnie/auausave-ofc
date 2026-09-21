(() => {
  const S = SeriesFeature;
  let opening = 0;
  S.openEditor = async (kind, item = {}, parents = [], onSaved) => {
    S.images.install();
    const recordId = item.id || crypto.randomUUID();
    const ticket = ++opening;
    try {
      const related = { cast: [], links: [] };
      if (item.id && kind === 'series') [related.cast, related.links] = await Promise.all([S.api.related('series_cast', 'series_id', item.id), S.api.related('series_links', 'series_id', item.id)]);
      if (item.id && kind === 'episodes') related.links = await S.api.related('series_episode_links', 'episode_id', item.id);
      if (ticket !== opening || location.hash !== '#admin' || adminTab !== 'series') return;
      closeModal();
      const previousFocus = document.activeElement;
      const modal = document.createElement('div');
      modal.id = 'modal';
      modal.className = 'modal-backdrop';
      modal.innerHTML = `<div class="modal series-admin-modal" role="dialog" aria-modal="true" aria-labelledby="series-editor-title"><div class="modal-head"><h2 id="series-editor-title">${item.id ? 'Edit' : 'Add'} ${S.types[kind].singular}</h2><button type="button" class="close" data-cancel aria-label="Close">×</button></div><form><fieldset class="series-editor-fields">${S.forms[kind](item, parents, related)}</fieldset><p class="series-form-error" role="alert" hidden></p><div class="form-actions"><button type="button" class="btn outline" data-cancel>Cancel</button><button type="submit" class="btn">Save ${S.types[kind].singular}</button></div></form></div>`;
      document.body.append(modal);
      const form = modal.querySelector('form'), submit = form.querySelector('[type="submit"]');
      let busy = false;
      const dismiss = () => { if (!busy) { modal.remove(); previousFocus?.focus(); } };
      modal.querySelectorAll('[data-cancel]').forEach(button => button.addEventListener('click', dismiss));
      modal.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismiss(); }
        if (event.key !== 'Tab') return;
        const controls = [...modal.querySelectorAll('button:not(:disabled), input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled)')];
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      });
      S.repeat.bind(form);
      if (kind === 'series') S.master.bind(form);
      form.querySelector('input:not([type="hidden"]), select')?.focus();
      if (kind === 'series') form.elements.slug.pattern = '[a-z0-9]+(-[a-z0-9]+)*';
      if (kind === 'episodes') form.elements.episode_number.min = '1';
      form.addEventListener('submit', async event => {
        event.preventDefault();
        if (busy) return;
        const errorBox = form.querySelector('[role="alert"]');
        errorBox.hidden = true;
        try {
          // Only direct fields belong to the parent; repeatable rows remain relational.
          const fields = form.querySelector('.series-editor-fields > .form-grid');
          const record = { id: recordId, visible: Boolean(item.visible), display_order: item.display_order ?? null };
          if (kind === 'series') record.cover_url = item.cover_url || null;
          fields.querySelectorAll('[name]').forEach(input => {
            if (input.type === 'file') return;
            record[input.name] = input.type === 'checkbox' ? input.checked : input.type === 'number' ? (input.value === '' ? null : Number(input.value)) : input.value.trim() || null;
          });
          for (const key of ['official_url', 'related_url']) if (record[key] && !validTimelineUrl(record[key])) throw new Error('Links must use an http:// or https:// URL.');
          const cast = S.repeat.collect(form, 'cast'), links = S.repeat.collect(form, kind === 'episodes' ? 'episode-links' : 'links');
          busy = true;
          form.querySelector('.series-editor-fields').disabled = true;
          submit.disabled = true;
          submit.textContent = 'Saving…';
          await S.api.save(kind, record, { cast, links });
          busy = false;
          dismiss();
          toast(`${S.types[kind].singular} saved`);
          onSaved();
        } catch (error) {
          busy = false;
          form.querySelector('.series-editor-fields').disabled = false;
          submit.disabled = false;
          submit.textContent = `Save ${S.types[kind].singular}`;
          errorBox.textContent = error.message;
          errorBox.hidden = false;
          errorBox.scrollIntoView({ block: 'nearest' });
        }
      });
    } catch (error) { toast(`Cannot open editor: ${error.message}`); }
  };
})();
