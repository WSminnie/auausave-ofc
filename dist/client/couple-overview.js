/* About AUAUSAVE additions. Journey and global chrome keep their existing renderers. */
(() => {
  const C = {};
  const e = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const safe = value => { try { const u = new URL(value); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch { return ''; } };
  const clean = value => String(value || '').trim().replace(/\s+/g, ' ');
  const unique = (rows, key) => [...new Map(rows.map(row => [key(row), row])).values()];
  const bangkokDate = () => {
    const p = new Intl.DateTimeFormat('en-US', {timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    return ['year','month','day'].map(type => p.find(x => x.type === type).value).join('-');
  };
  const dated = row => {
    const direct = row.premiere_date || row.date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(direct || '')) return direct;
    const year = Number(row.year), month = Number(row.month) || 1, day = Number(row.day) || 1;
    return year >= 1000 && year <= 9999 ? `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}` : '';
  };
  const dateLabel = row => {
    if (!row.month && !/^\d{4}-\d{2}-\d{2}$/.test(row.date || '')) return String(row.year || '');
    const value = dated(row);
    return value ? new Intl.DateTimeFormat('en-GB', {day:row.day || row.date ? 'numeric' : undefined,month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z')) : '';
  };
  C.summarize = (data, options = {}) => {
    const today = options.today || bangkokDate(), year = today.slice(0,4), settings = data.siteSettings || {};
    const canonical = options.canonical || (id => ({duo:'AT01',auau:'AT02',save:'AT03'}[id] || id));
    const pair = row => {
      const ids = [...(Array.isArray(row.artistIds) ? row.artistIds : []), row.artistId].filter(Boolean).map(canonical);
      return ids.includes('AT01') || (ids.includes('AT02') && ids.includes('AT03'));
    };
    const published = row => row && row.visible !== false && row.active !== false;
    const series = unique((settings.timeline || []).filter(row => published(row) && String(row.category || 'series').toLowerCase() === 'series' && pair(row) && !row.upcoming && ![row.status,row.timelineStatus].some(s => String(s).toLowerCase() === 'upcoming') && (dated(row) ? dated(row) <= today : ['on_air','on air','completed'].includes(String(row.timelineStatus || row.status).toLowerCase()))), row => row.id || clean(row.title).toLowerCase() || row.seriesId)
      .sort((a,b) => dated(b).localeCompare(dated(a)));
    const seriesYears = series.map(row => dated(row).slice(0,4)).filter(Boolean).sort();
    const brands = unique((data.presenters || []).filter(row => published(row) && pair(row) && String(row.year) === year && clean(row.brand)), row => clean(row.brand).toLowerCase());
    const awards = unique((data.awards || []).filter(row => published(row) && pair(row)), row => row.id || [row.title,row.org,row.year].join('|'))
      .map(row => ({...row,month:row.month || settings.awardDates?.[row.id]?.month,day:row.day || settings.awardDates?.[row.id]?.day,image:row.image || settings.awardImages?.[row.id] || ''}))
      .sort((a,b) => dated(b).localeCompare(dated(a)));
    const nextEvent = (options.events || data.events || []).filter(row => published(row) && pair(row) && /^\d{4}-\d{2}-\d{2}$/.test(row.date || '') && row.date >= today && !['cancelled','canceled','postponed','rescheduled'].includes(String(row.eventStatus || '').toLowerCase())).sort((a,b) => a.date.localeCompare(b.date))[0] || null;
    const projectSettings = settings.projects || {}, sections = projectSettings.sections || [];
    const projects = (projectSettings.items || []).filter(row => published(row) && sections.some(section => section.id === row.sectionId));
    return {today,year,series,firstYear:seriesYears[0] || '—',latestSeries:series[0] || null,brandCount:brands.length,awards,nextEvent,projects,activeProjects:projects.filter(row => row.status === 'active').length};
  };
  // Tabler trophy, v3.51.0; MIT license in series/assets/icons/LICENSE.
  const trophy = '<svg class="couple-award-trophy" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21l8 0"/><path d="M12 17l0 4"/><path d="M7 4l10 0"/><path d="M17 4v8a5 5 0 0 1 -10 0v-8"/><path d="M3 9a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M17 9a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/></svg>';
  C.award = model => {
    const row = model.awards[0]; if (!row) return '';
    const url = safe(row.source), image = safe(row.image), tag = url ? 'a' : 'article';
    const subtitle = [clean(row.org),dateLabel(row)].filter(Boolean).join(' · ');
    return `<div class="couple-award-group"><${tag} class="couple-hero-award"${url ? ` href="${e(url)}" target="_blank" rel="noopener noreferrer"` : ''}>${image ? `<img class="couple-award-photo" src="${e(image)}" width="48" height="64" alt="AuAu and Save holding the award">` : ''}${trophy}<span class="couple-award-copy"><strong>${e(clean(row.title))}</strong>${subtitle ? `<span>${e(subtitle)}</span>` : ''}</span>${url ? '<span class="couple-award-source">View source</span>' : ''}</${tag}>${model.awards.length > 1 ? `<a class="couple-awards-more" href="/awards">+${model.awards.length-1} more</a>` : ''}</div>`;
  };
  C.highlights = model => `<section class="couple-overview-highlights" aria-label="AUAUSAVE highlights"><div class="container"><dl class="couple-highlights-grid">${[[model.series.length,'Series together'],[model.brandCount,`Brand partners in ${model.year}`],[model.awards.length,model.awards.length === 1 ? 'Award' : 'Awards'],[model.firstYear,'First series together']].map(([value,label]) => `<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`).join('')}</dl></div></section>`;
  C.explore = model => {
    const event = model.nextEvent;
    const next = event ? `Next · ${new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(event.date+'T12:00:00Z'))} — ${event.title}` : 'See all events';
    const series = model.latestSeries ? `${model.series.length} series · ${model.latestSeries.title} now streaming` : 'See all series';
    const projects = model.projects.length ? `${model.projects.length} fan ${model.projects.length === 1 ? 'project' : 'projects'}${model.activeProjects ? ` · ${model.activeProjects} active` : ''}` : 'See all projects';
    const cards = [['Schedule','/schedule',next],['Series','/series',series],['Presenters','/presenters',`${model.brandCount} brands in ${model.year}`],['Projects','/projects',projects]];
    return `<section class="couple-explore"><div class="container"><div class="section-head"><h2>EXPLORE</h2></div><div class="couple-explore-grid">${cards.map(([title,url,summary]) => `<a class="couple-explore-card" href="${url}"><h3>${title}</h3><p>${e(summary)}</p><span class="couple-explore-arrow" aria-hidden="true"><img src="series/assets/icons/arrow-right.svg" width="20" height="20" alt=""></span></a>`).join('')}</div></div></section>`;
  };
  window.CoupleOverview = C;
  if (typeof profile !== 'function') return;
  const enhance = () => {
    const main = document.querySelector('main.couple-archive'), hero = main?.querySelector('.couple-profile');
    if (!hero) return;
    const model = C.summarize(db, {today:homeScheduleBangkokDate(),canonical:canonicalArtistId,events:publicOrderedEvents()});
    hero.classList.add('couple-overview-hero');
    const description = hero.querySelector('h1')?.parentElement.querySelector(':scope > p');
    if (description) description.textContent = description.textContent.replace(/\bAuau Thanaphum\b/g,'AuAu Thanaphum');
    main.querySelectorAll('.couple-award-group,.couple-overview-highlights,.couple-explore').forEach(node => node.remove());
    const buttons = hero.querySelector('.couple-profile-links');
    if (buttons) buttons.insertAdjacentHTML('beforebegin',C.award(model));
    else description?.insertAdjacentHTML('afterend',C.award(model));
    hero.insertAdjacentHTML('afterend',C.highlights(model));
    main.querySelector('.archive-awards')?.remove();
    const journey = main.querySelector('.artist-filmography');
    (journey || hero.nextElementSibling).insertAdjacentHTML('afterend',C.explore(model));
  };
  const previousProfile = profile;
  profile = function(id) { previousProfile(id); if (sameArtistId(id,'AT01')) enhance(); };
  enhance();
})();
