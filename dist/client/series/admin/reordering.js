(() => {
  const S = SeriesFeature;
  S.reordering = {
    controls(index, count) {
      return `<div class="series-reorder-controls"><button class="btn outline" data-move="${index}" data-direction="-1" ${index === 0 ? 'disabled' : ''}>Move up</button><button class="btn outline" data-move="${index}" data-direction="1" ${index === count - 1 ? 'disabled' : ''}>Move down</button></div>`;
    },
    bind(container, rows, kind, seriesId, isActive) {
      container.querySelectorAll('[data-move]').forEach(button => button.addEventListener('click', async () => {
        if (container.dataset.pending) return;
        const index = Number(button.dataset.move), target = index + Number(button.dataset.direction);
        if (target < 0 || target >= rows.length) return;
        const ids = rows.map(row => row.id);
        [ids[index], ids[target]] = [ids[target], ids[index]];
        container.dataset.pending = 'true';
        container.querySelectorAll('button,select').forEach(control => { control.disabled = true; });
        try { await S.api.reorder(kind, ids, seriesId); toast('Order saved'); }
        catch (error) { toast(`Could not save order: ${error.message}`); }
        finally { if (isActive()) admin(); }
      }));
    }
  };
})();
