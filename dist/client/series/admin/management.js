(() => {
  const S = SeriesFeature, e = S.components.e;
  let kind = 'series', seriesId = '', request = 0;
  const collapsed = new Set();
  function tabs() {
    return `<nav class="series-section-nav" aria-label="Series management">${Object.entries(S.types).map(([key, value]) => `<button type="button" data-kind="${key}" ${key === kind ? 'aria-current="page"' : ''}>${value.label}</button>`).join('')}</nav>`;
  }
  const active = ticket => ticket === request && location.hash === '#admin' && adminTab === 'series' && adminAuthenticated;
  S.admin = {
    async setMenuVisible(visible) {
      const { data, error } = await window.auausaveDB.session();
      if (error || !data?.session || !adminAuthenticated) throw new Error('กรุณาเข้าสู่ระบบอีกครั้ง');
      db.siteSettings ||= {};
      const previous = db.siteSettings.seriesMenuVisible;
      try {
        db.siteSettings.seriesMenuVisible = visible;
        save(false);
        if (!await syncDatabaseInBackground()) throw new Error('บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง');
      } catch (error) {
        if (previous === undefined) delete db.siteSettings.seriesMenuVisible;
        else db.siteSettings.seriesMenuVisible = previous;
        save(false);
        throw error;
      }
    },
    async render() {
      const ticket = ++request;
      app.innerHTML = `<div class="admin"><div class="admin-shell">${adminSidebarMarkup()}<main class="admin-main series-admin"><div class="admin-top"><div><h1>SERIES MANAGEMENT</h1><p>Manage stories and their official archive.</p></div></div><div class="series-menu-setting"><label><input type="checkbox" data-series-menu ${db.siteSettings?.seriesMenuVisible !== false ? 'checked' : ''}> Show Series in website menu</label><p>แสดงเมนู Series บนหน้าบ้าน · การซ่อนเมนูไม่เปลี่ยนสถานะเผยแพร่ของแต่ละเรื่อง</p><span data-menu-status role="status"></span></div>${tabs()}<div data-series-manager role="status">Loading…</div></main></div></div>`;
      const menuToggle = app.querySelector('[data-series-menu]');
      const menuStatus = app.querySelector('[data-menu-status]');
      menuToggle.addEventListener('change', async () => {
        menuToggle.disabled = true;
        menuStatus.textContent = 'กำลังบันทึก…';
        try {
          await S.admin.setMenuVisible(menuToggle.checked);
          menuStatus.textContent = 'บันทึกแล้ว';
        } catch (error) {
          menuToggle.checked = db.siteSettings?.seriesMenuVisible !== false;
          menuStatus.textContent = error.message;
        } finally { menuToggle.disabled = false; }
      });
      app.querySelectorAll('[data-kind]').forEach(button => button.addEventListener('click', () => { kind = button.dataset.kind; admin(); }));
      try {
        const parents = await S.api.list('series', { admin: true });
        if (seriesId && !parents.some(parent => parent.id === seriesId)) seriesId = '';
        const rows = kind === 'series' ? parents : await S.api.list(kind, { seriesId, admin: true });
                const defaultId = S.defaultSeries(parents)?.id;
        if (!active(ticket)) return;
        const container = app.querySelector('[data-series-manager]');
        container.removeAttribute('role');
        const renderRows = rows => `${rows.length ? `<div class="series-admin-list">${rows.map((row, index) => `<article><div><h3>${e(row.title_en || row.title || `EP.${row.episode_number}`)}</h3>${kind !== 'series' ? `<p>${e(parents.find(parent => parent.id === row.series_id)?.title_en || '')}${kind === 'episodes' ? ` · EP.${row.episode_number}` : ''}</p>` : ''}${kind !== 'series' && row.visible && !parents.find(parent => parent.id === row.series_id)?.visible ? '<p>Not public while the parent series is hidden.</p>' : ''}</div><div class="series-row-controls">${S.reordering.controls(index, rows.length)}${S.publication.controls(row, index, kind, defaultId)}<div class="actions"><button class="btn outline" data-edit="${index}">Edit</button><button class="btn outline" data-delete="${index}">Delete</button></div></div></article>`).join('')}</div>` : `<div class="series-empty"><p>${kind !== 'series' && !parents.length ? 'Add a series first to start its archive.' : `No ${S.types[kind].label.toLowerCase()} yet. Use Add ${S.types[kind].singular} to get started.`}</p></div>`}`;
        container.innerHTML = `<div class="series-admin-toolbar"><h2>${S.types[kind].label}</h2>${kind !== 'series' ? `<label>Series <select data-parent-filter><option value="">All series</option>${parents.map(parent => `<option value="${e(parent.id)}" ${seriesId === parent.id ? 'selected' : ''}>${e(parent.title_en)}</option>`).join('')}</select></label>` : ''}<button class="btn" data-add ${kind !== 'series' && !parents.length ? 'disabled' : ''}>+ Add ${S.types[kind].singular}</button></div>
          <p class="series-order-hint">Use Move up / Move down within each series. Changes save automatically.</p>${kind === 'series' || !parents.length ? renderRows(rows) : parents.filter(parent => !seriesId || parent.id === seriesId).map((parent, index) => `<details class="series-admin-group" data-group="${index}" ${collapsed.has(kind + ':' + parent.id) ? '' : 'open'}><summary><h3>${e(parent.title_en)}</h3><span>${rows.filter(row => row.series_id === parent.id).length} ${S.types[kind].label}</span></summary><div class="series-group-content"><div class="series-group-toolbar"><button class="btn" data-add-parent="${e(parent.id)}">+ Add ${S.types[kind].singular}</button></div>${renderRows(rows.filter(row => row.series_id === parent.id))}</div></details>`).join('')}`;
        const bindRows = (scope, scopedRows, parentId) => {
          S.publication.bind(scope, scopedRows, kind, () => active(ticket));
          S.reordering.bind(scope, scopedRows, kind, parentId, () => active(ticket));
          scope.querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => S.openEditor(kind, scopedRows[Number(button.dataset.edit)], parents, () => admin())));
          scope.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', async () => {
            const item = scopedRows[Number(button.dataset.delete)];
            if (!confirm(kind === 'series' ? 'Delete this series and all its archive content? Schedule data will be preserved.' : 'Delete this item? This cannot be undone.')) return;
            button.disabled = true;
            try { await S.api.remove(kind, item.id); if(active(ticket)) admin(); }
            catch(error) { toast(error.message); button.disabled = false; }
          }));
        };
        if(kind === 'series') bindRows(container, rows, '');
        else {
          const selectedParents = parents.filter(parent => !seriesId || parent.id === seriesId);
          container.querySelectorAll('[data-group]').forEach(group => {
            const parent = selectedParents[Number(group.dataset.group)];
            bindRows(group, rows.filter(row => row.series_id === parent.id), parent.id);
            group.addEventListener('toggle', () => { const key=kind+':'+parent.id; if(group.open) collapsed.delete(key); else collapsed.add(key); });
          });
          container.querySelectorAll('[data-add-parent]').forEach(button => button.addEventListener('click', () => S.openEditor(kind, {series_id:button.dataset.addParent,visible:false}, parents, () => admin())));
        }
        container.querySelector('[data-parent-filter]')?.addEventListener('change', event => { seriesId = event.target.value; admin(); });
        container.querySelector('[data-add]').addEventListener('click', () => S.openEditor(kind, { series_id: seriesId, visible: false }, parents, () => admin()));

      } catch (error) {
        if (!active(ticket)) return;
        const container = app.querySelector('[data-series-manager]');
        container.innerHTML = `<div class="series-empty" role="alert"><p>Could not load the archive: ${e(error.message)}</p><button class="btn" data-retry>Try again</button></div>`;
        container.querySelector('[data-retry]').addEventListener('click', () => admin());
      }
    }
  };
})();
