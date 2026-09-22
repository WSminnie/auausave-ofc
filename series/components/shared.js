(() => {
  const C = window.SeriesFeature.components;
  C.e = value => escapePageText(String(value ?? ''));
  C.hashtagLinks = value => String(value || '').split(/(#[\p{L}\p{M}\p{N}_]+)/gu).map(part => part.startsWith('#') && /^#[\p{L}\p{M}\p{N}_]+$/u.test(part)
    ? `<a href="https://x.com/search?q=${encodeURIComponent(part)}" target="_blank" rel="noopener noreferrer">${C.e(part)}<span class="series-sr-only"> (search on X, opens in a new tab)</span></a>`
    : C.e(part)).join('');
  C.date = value => value ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) : '';
  C.text = value => value ? `<p class="series-copy">${C.e(value)}</p>` : '';
  C.statusBadge = value => {
    const statuses = { 'ON AIR': ['ON AIR', 'is-on-air'], UPCOMING: ['UPCOMING', 'is-upcoming'], COMPLETED: ['END', 'is-ended'] };
    const status = statuses[value];
    return status ? `<span class="series-status ${status[1]}">${status[0]}</span>` : C.badge(value);
  };
  C.badge = value => value ? `<span class="series-status">${C.e(value)}</span>` : '';
  C.image = (url, title, hero = false) => {
    const safe = validTimelineUrl(url);
    return safe ? `<div class="series-image${hero ? ' series-banner' : ''}"><img src="${C.e(safe)}" alt="${C.e(title)}" loading="${hero ? 'eager' : 'lazy'}" decoding="async"></div>` : '';
  };
  C.links = links => `<div class="series-links">${(links || []).map(link => {
    const url = validTimelineUrl(link.url);
    return url ? `<a href="${C.e(url)}" target="_blank" rel="noopener noreferrer">${C.e(link.label)}<span class="series-sr-only"> (opens in a new tab)</span></a>` : '';
  }).join('')}</div>`;
  C.meta = (label, value) => value ? `<div><dt>${C.e(label)}</dt><dd>${C.e(value)}</dd></div>` : '';
  document.addEventListener('error', event => {
    if (event.target instanceof HTMLImageElement && event.target.closest('.series-image')) {
      event.target.hidden = true;
      event.target.parentElement.classList.add('series-image-unavailable');
      event.target.parentElement.setAttribute('role', 'img');
      event.target.parentElement.setAttribute('aria-label', `${event.target.alt} — image unavailable`);
    }
  }, true);
})();
