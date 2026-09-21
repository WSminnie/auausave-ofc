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
    const synopsisButtons = [...root.querySelectorAll('[data-synopsis-toggle]')];
    const measure = () => synopsisButtons.forEach(button => {
      const text = button.previousElementSibling;
      button.hidden = button.getAttribute('aria-expanded') !== 'true' && text.scrollHeight <= text.clientHeight + 1;
    });
    synopsisButtons.forEach(button => button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(expanded));
      button.previousElementSibling.classList.toggle('is-collapsed', !expanded);
      button.textContent = expanded ? 'Show less' : 'Read synopsis';
    }));
    const resizeObserver = new ResizeObserver(measure);
    synopsisButtons.forEach(button => resizeObserver.observe(button.previousElementSibling));
    measure();
    return () => { observer.disconnect(); resizeObserver.disconnect(); };
  };
})();
