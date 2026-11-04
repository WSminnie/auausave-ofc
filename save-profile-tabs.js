/* Shared solo navigation shell. Legacy save-* class names are retained for compatibility. */
(function (root) {
  const tabs = ['profile', 'schedule', 'journey', 'awards'];
  const soloRoutes = {
    AT02: {slug:'auautnp', aliases:['auau','auautnp','at02']},
    AT03: {slug:'savewrg', aliases:['save','savewrg','at03']},
    AT04: {slug:'mhiipraew', aliases:['mhiipraew','mhiipreaw','at04']},
  };
  function resolveRoute(location) {
    let value;
    try {
      value = decodeURIComponent(location.hash ? location.hash.slice(1) : location.pathname);
    } catch (_) { return null; }
    const parts = value.replace(/^\/+|\/+$/g, '').toLowerCase().split('/');
    if (parts[0] === 'artist') parts.shift();
    const artist = Object.keys(soloRoutes).find(id => soloRoutes[id].aliases.includes(parts[0]));
    if (!artist || parts.length > 2 || !tabs.includes(parts[1] || 'profile')) return null;
    return {artist, tab:parts[1] || 'profile'};
  }
  function resolve(location) { return resolveRoute(location)?.tab || null; }
  function resolveArtist(location) { return resolveRoute(location)?.artist || null; }
  function path(tab, artistId = 'AT03') {
    const slug = soloRoutes[artistId]?.slug || String(artistId).toLowerCase();
    return '/' + slug + (tabs.includes(tab) && tab !== 'profile' ? '/' + tab : '');
  }
  function socialMeta(platform) {
    const key = String(platform || '').trim().toLowerCase();
    const known = {
      x: ['X', 'global', 'x'],
      instagram: ['Instagram', 'global', 'instagram'],
      tiktok: ['TikTok', 'global', 'tiktok'],
      weibo: ['Weibo', 'china', 'weibo'],
      douyin: ['Douyin', 'china', 'tiktok'],
      rednote: ['RedNote', 'china', 'rednote'],
      xiaohongshu: ['RedNote', 'china', 'rednote'],
    }[key];
    return known ? {label: known[0], group: known[1], icon: '/assets/socials/' + known[2] + '.png', artwork: known[2]}
      : {label: String(platform || 'Other'), group: 'other', icon: null};
  }
  function availableTabs(builder = [], visibility = {}) {
    const settings = new Map(builder.map(section => [section.id, section.visible !== false]));
    const keys = {schedule:['events','events'],journey:['timeline','series'],awards:['awards','awards']};
    return tabs.filter(tab => tab === 'profile' || (settings.get(keys[tab][0]) !== false && visibility[keys[tab][1]] !== false));
  }
  const api = {resolve, resolveArtist, path, socialMeta, availableTabs};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SaveProfileTabs = api;
  if (typeof document === 'undefined') return;

  function enhanceSocials(head) {
    const grid = head.querySelector('.artist-social-grid');
    if (!grid) return;
    const groups = new Map();
    [...grid.querySelectorAll('.artist-social-button')].forEach(link => {
      const meta = socialMeta(link.querySelector('.artist-social-platform-label')?.textContent);
      const username = link.querySelector('.artist-social-copy small')?.textContent.trim() || '';
      if (!groups.has(meta.group)) groups.set(meta.group, []);
      groups.get(meta.group).push(link);
      link.classList.remove('artist-social-button');
      link.classList.add('save-social-link');
      link.dataset.platform = meta.label;
      link.setAttribute('aria-label', meta.label + (username ? ' · ' + username : ''));
      const icon = document.createElement('span');
      icon.className = 'save-social-icon';
      icon.setAttribute('aria-hidden', 'true');
      if (meta.icon) {
        const image = document.createElement('img');
        image.src = meta.icon;
        image.alt = '';
        image.className = 'save-social-artwork-' + meta.artwork;
        icon.appendChild(image);
      } else icon.textContent = meta.label.slice(0, 2);
      const label = document.createElement('span');
      label.className = 'save-social-caption';
      label.textContent = meta.label;
      link.replaceChildren(icon, label);
    });
    grid.classList.add('save-social-groups');
    grid.replaceChildren();
    for (const [key, title] of [['global', 'ไทย / Global'], ['china', 'จีน / China'], ['other', 'Other']]) {
      if (!groups.has(key)) continue;
      const group = document.createElement('div');
      group.className = 'save-social-group';
      group.dataset.socialGroup = key;
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', title);
      const links = document.createElement('div');
      links.className = 'save-social-links';
      links.append(...groups.get(key));
      group.appendChild(links);
      grid.appendChild(group);
    }
  }

  function select(main, tab) {
    main.querySelectorAll('[data-save-tab]').forEach(link => {
      const active = link.dataset.saveTab === tab;
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    main.querySelectorAll('[data-save-panel]').forEach(panel => {
      panel.hidden = panel.dataset.savePanel !== tab;
    });
    if (tab === 'journey' && typeof syncTimelineTrackRules === 'function') {
      requestAnimationFrame(() => syncTimelineTrackRules(main));
    }
  }
  function mount(tab, artistId) {
    const main = document.querySelector('main');
    const head = main?.querySelector('.profile-head');
    if (!head || main.querySelector('.save-profile-tabs')) return;
    const available = availableTabs(artistBuilderSections(artistId), db.siteSettings.artistArchive?.[artistId]?.visibility);
    if (!available.includes(tab)) {
      tab = 'profile';
      const url = new URL(location.href);
      url.pathname = path(tab, artistId);
      url.hash = '';
      history.replaceState(null, '', url);
    }
    main.classList.add('save-profile-page');
    const hero = head.closest('.section');
    hero.classList.add('save-profile-header');
    enhanceSocials(head);
    const journey = main.querySelector('.artist-filmography');
    const allCategories = journey?.querySelector('[data-category="all"]');
    if (allCategories) filterTimelineCategory(allCategories, 'all');
    const navigation = document.createElement('nav');
    navigation.className = 'container save-profile-tabs';
    navigation.setAttribute('aria-label', artistName(artistId) + ' sections');
    navigation.hidden = available.length < 2;
    navigation.innerHTML = available.map(key =>
      `<a href="${path(key, artistId)}" data-save-tab="${key}" id="save-tab-${key}" aria-controls="save-panel-${key}">${{profile:'Profile',schedule:'Schedule',journey:'Journey',awards:'Awards'}[key]}</a>`
    ).join('');
    const sections = [...main.children].filter(node => node !== hero);
    hero.insertAdjacentElement('afterend', navigation);
    const panels = Object.fromEntries(tabs.map(key => {
      const panel = document.createElement('div');
      panel.id = 'save-panel-' + key;
      panel.dataset.savePanel = key;
      panel.setAttribute('role', 'region');
      panel.setAttribute('aria-labelledby', 'save-tab-' + key);
      main.appendChild(panel);
      return [key, panel];
    }));
    sections.forEach(section => {
      const key = section.matches('.artist-filmography') || section.querySelector('.artist-filmography') ? 'journey'
        : section.querySelector('.artist-profile-schedule-content, .schedule-wrap') ? 'schedule'
        : section.querySelector('.award-grid') ? 'awards' : 'profile';
      panels[key].appendChild(section);
    });
    tabs.forEach(key => {
      const visible = [...panels[key].children].some(section => section.style.display !== 'none' && !section.hidden);
      if (!visible && key !== 'profile' && available.includes(key)) {
        const empty = document.createElement('p');
        empty.className = 'empty save-profile-empty';
        empty.textContent = 'ยังไม่มีข้อมูลในส่วนนี้';
        panels[key].appendChild(empty);
      }
    });
    navigation.addEventListener('click', event => {
      const link = event.target.closest('[data-save-tab]');
      if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      // Keep the rendered nodes, filters and selected dates when changing tabs.
      const url = new URL(location.href);
      url.pathname = path(link.dataset.saveTab, artistId);
      url.hash = '';
      if (url.href !== location.href) history.pushState(null, '', url);
      select(main, link.dataset.saveTab);
      route = '/' + artistPublicSlug(artistId);
    });
    select(main, tab);
  }
  const renderProfile = profile;
  profile = function (id) {
    renderProfile(id);
    id = canonicalArtistId(id);
    if (id !== 'AT01' && artistById(id)) mount(resolve(location) || 'profile', id);
  };
  window.addEventListener('popstate', () => router());
  // Static hosting entry pages pass a tab through the root document. All assets
  // have root-relative resolution before restoring the shareable clean URL.
  const entry = new URL(location.href);
  const entryTab = entry.searchParams.get('__artist_tab') || entry.searchParams.get('__save_tab');
  const entryArtist = entry.searchParams.get('__artist_id') || 'AT03';
  if (tabs.includes(entryTab) && soloRoutes[entryArtist]) {
    entry.searchParams.delete('__save_tab');
    entry.searchParams.delete('__artist_tab');
    entry.searchParams.delete('__artist_id');
    entry.pathname = path(entryTab, entryArtist);
    entry.hash = '';
    history.replaceState(null, '', entry);
  }
  if (resolve(location)) router();
})(typeof window === 'undefined' ? globalThis : window);
