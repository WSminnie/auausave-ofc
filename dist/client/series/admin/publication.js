(() => {
  const S = SeriesFeature, e = S.components.e;
  S.publication = {
    controls(row, index, kind, defaultId) {
      const title = row.title_en || row.title || `Episode ${row.episode_number}`;
      return `<div class="series-publication-controls"><button type="button" class="series-publish-toggle" role="switch" aria-checked="${Boolean(row.visible)}" aria-label="Publish ${e(title)}" data-publish="${index}"><span aria-hidden="true" class="series-switch-track"></span><span>${row.visible ? 'Published' : 'Hidden'}</span></button>${kind === 'series' ? `<button type="button" class="btn outline series-default-button" data-default="${index}" ${!row.visible || (row.is_default && row.visible) ? 'disabled' : ''} title="${!row.visible ? 'Publish this series first' : row.id === defaultId && !row.is_default ? 'Currently opens first automatically; set as default to keep it first' : 'Open this series first on the Series page'}">${row.is_default && row.visible ? 'Default' : 'Set as Default'}</button>` : ''}</div>`;
    },
    bind(container, rows, kind, isActive) {
      const run = async (button, operation) => {
        if (container.dataset.pending) return;
        container.dataset.pending = 'true';
        container.querySelectorAll('button,select').forEach(control => { control.disabled = true; });
        try { await operation(); toast('Series display updated'); }
        catch (error) { toast(`Could not update display: ${error.message}`); }
        finally { if (isActive()) admin(); }
      };
      container.querySelectorAll('[data-publish]').forEach(button => button.addEventListener('click', () => {
        const row = rows[Number(button.dataset.publish)];
        run(button, () => S.api.setVisible(kind, row.id, !row.visible));
      }));
      container.querySelectorAll('[data-default]').forEach(button => button.addEventListener('click', () => {
        run(button, () => S.api.setDefault(rows[Number(button.dataset.default)].id));
      }));
    }
  };
})();
