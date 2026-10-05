(() => {
  const C = SeriesFeature.components;
  C.navigation = item => `<nav class="series-section-nav" aria-label="Series sections">${[['overview', 'Overview', true], ['episodes', 'Episodes', item.episodes.length], ['related', 'Related', (item.appearances?.length || item.media?.length || item.moments?.length)]].filter(([, , visible]) => visible).map(([key, label], index) => `<button type="button" data-series-section="series-${key}" ${index === 0 ? 'aria-current="location"' : ''}>${label}</button>`).join('')}</nav>`;
  C.bindNavigation = root => {
    root.querySelectorAll('[data-series-section]').forEach(button => button.addEventListener('click', () => {
      root.querySelector(`#${button.dataset.seriesSection}`)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }));
    const observer = new IntersectionObserver(entries => {
      const entry = entries.find(value => value.isIntersecting);
      if (!entry) return;
      root.querySelectorAll('[data-series-section]').forEach(button => {
        if (button.dataset.seriesSection === entry.target.id) button.setAttribute('aria-current', 'location');
        else button.removeAttribute('aria-current');
      });
    }, { rootMargin: '-15% 0px -65% 0px' });
    root.querySelectorAll('.series-section').forEach(section => observer.observe(section));
    root.querySelectorAll('[data-appearance-filter]').forEach(button => button.addEventListener('click', () => {
      root.querySelectorAll('[data-appearance-filter]').forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
      root.querySelectorAll('[data-appearance-type]').forEach(card => { card.hidden = button.dataset.appearanceFilter !== 'ALL' && card.dataset.appearanceType !== button.dataset.appearanceFilter; });
    }));
    root.querySelectorAll('[data-related-filter]').forEach(button => button.addEventListener('click', () => {
      root.querySelectorAll('[data-related-filter]').forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
      root.querySelectorAll('[data-related-category]').forEach(card => { card.hidden = Boolean(button.dataset.relatedFilter) && card.dataset.relatedCategory !== button.dataset.relatedFilter; });
    }));
    let activeDialog, previousOverflow;
    const releaseScroll = () => {
      if (!activeDialog) return;
      document.documentElement.style.overflow = previousOverflow;
      activeDialog = null;
    };
    root.querySelectorAll('[data-synopsis-open]').forEach(button => {
      const dialog = root.querySelector(`#${CSS.escape(button.getAttribute('aria-controls'))}`);
      button.addEventListener('click', () => {
        if (activeDialog) return;
        dialog.showModal();
        activeDialog = dialog;
        previousOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
      });
      dialog.querySelector('[data-synopsis-close]').addEventListener('click', () => dialog.close());
      dialog.addEventListener('close', () => {
        if (activeDialog === dialog) releaseScroll();
      });
      dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
      });
    });
    return () => {
      observer.disconnect();
      activeDialog?.close();
      releaseScroll();
    };
  };
})();
