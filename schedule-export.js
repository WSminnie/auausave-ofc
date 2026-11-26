/* Local PNG export. Uses the same public event scope as the visible schedule. */
(function (root) {
  'use strict';
  function parseMonth(value) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value) || Number(value.slice(0, 4)) < 1000)
      throw Error('Choose a valid month.');
    const [year, month] = value.split('-').map(Number);
    return { year, month, lastDay: new Date(Date.UTC(year, month, 0)).getUTCDate() };
  }
  function shiftMonth(value, step) {
    const {year, month} = parseMonth(value);
    const next = Math.max(1000 * 12, Math.min(9999 * 12 + 11, year * 12 + month - 1 + step));
    return `${Math.floor(next / 12)}-${String(next % 12 + 1).padStart(2, '0')}`;
  }
  // Uncompressed ZIP keeps PNG bytes intact and needs no external export service.
  async function buildZip(files) {
    const local = [], central = []; let offset = 0, centralSize = 0;
    for (const file of files) {
      const name = new TextEncoder().encode(file.name), bytes = new Uint8Array(await file.blob.arrayBuffer());
      let crc = 0xffffffff;
      for (const byte of bytes) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
      crc = (crc ^ 0xffffffff) >>> 0;
      const header = new Uint8Array(30 + name.length), h = new DataView(header.buffer);
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x800, true);
      h.setUint16(12, 33, true); h.setUint32(14, crc, true); h.setUint32(18, bytes.length, true);
      h.setUint32(22, bytes.length, true); h.setUint16(26, name.length, true); header.set(name, 30);
      const entry = new Uint8Array(46 + name.length), c = new DataView(entry.buffer);
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true);
      c.setUint16(8, 0x800, true); c.setUint16(14, 33, true); c.setUint32(16, crc, true);
      c.setUint32(20, bytes.length, true); c.setUint32(24, bytes.length, true); c.setUint16(28, name.length, true);
      c.setUint32(42, offset, true); entry.set(name, 46);
      local.push(header, bytes); central.push(entry); offset += header.length + bytes.length; centralSize += entry.length;
    }
    const end = new Uint8Array(22), e = new DataView(end.buffer);
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, centralSize, true); e.setUint32(16, offset, true);
    return new Blob([...local, ...central, end], {type: 'application/zip'});
  }
  function partition(events, month) {
    const { lastDay } = parseMonth(month);
    const valid = events.filter(e => typeof e.date === 'string' && e.date.startsWith(month + '-') &&
      /^\d{4}-\d{2}-\d{2}$/.test(e.date) && Number(e.date.slice(8)) >= 1 && Number(e.date.slice(8)) <= lastDay)
      .slice().sort((a, b) => a.date.localeCompare(b.date));
    return [{ start: 1, end: 16, events: valid.filter(e => Number(e.date.slice(8)) <= 16) },
      { start: 17, end: lastDay, events: valid.filter(e => Number(e.date.slice(8)) >= 17) }];
  }
  function columns(events, weight = () => 1, maxHeight = Infinity) {
    if (events.length < 2) return [events.slice(), []];
    const sums = [0]; events.forEach(e => sums.push(sums.at(-1) + weight(e)));
    const total = sums.at(-1), height = index => Math.max(sums[index], total - sums[index]);
    const all = events.slice(1).map((_, i) => i + 1);
    const boundaries = all.filter(i => events[i - 1].date !== events[i].date);
    const best = candidates => candidates.reduce((a, b) => height(b) < height(a) ? b : a);
    let mid = best(boundaries.length ? boundaries : all);
    if (height(mid) > maxHeight) mid = best(all);
    return [events.slice(0, mid), events.slice(mid)];
  }
  function planPages(rows, month, contentTop) {
    const halves = partition(rows, month), all = halves.flatMap(part => part.events);
    const footerSpace = 162, targetHeight = 1800;
    const tallest = cols => Math.max(...cols.map(col => col.reduce((sum, r) => sum + r.height, 0)));
    const whole = columns(all, row => row.height, targetHeight - contentTop - footerSpace);
    const pages = contentTop + tallest(whole) + footerSpace <= targetHeight
      ? [{ start: 1, end: parseMonth(month).lastDay, columns: whole }]
      : halves.map(part => ({ start: part.start, end: part.end, columns: columns(part.events, row => row.height) }));
    const height = Math.ceil(Math.max(targetHeight, ...pages.map(page => contentTop + tallest(page.columns) + footerSpace)) / 20) * 20;
    return { pages, height };
  }
  function wrapText(text, width, measure) {
    const result = [];
    for (const paragraph of String(text || '').split(/\r?\n/)) {
      let line = '';
      const tokens = typeof Intl.Segmenter === 'function'
        ? Array.from(new Intl.Segmenter('th', { granularity: 'word' }).segment(paragraph), s => s.segment)
        : paragraph.split(/(\s+)/);
      for (const token of tokens) {
        if (measure(line + token) <= width) { line += token; continue; }
        if (line.trim()) { result.push(line.trim()); line = ''; }
        for (const char of Array.from(token.trimStart())) {
          if (line && measure(line + char) > width) { result.push(line.trimEnd()); line = ''; }
          line += char;
        }
      }
      if (line.trim()) result.push(line.trim());
    }
    return result;
  }
  function wrapColorRuns(runs, width, measure) {
    let offset = 0;
    const spans = runs.map(run => {
      const start = offset; offset += run.text.length;
      return {...run, start, end: offset};
    });
    const text = runs.map(run => run.text).join('');
    let cursor = 0;
    return wrapText(text, width, measure).map(line => {
      const start = text.indexOf(line, cursor), end = start + line.length;
      cursor = end;
      return spans.filter(run => run.end > start && run.start < end).map(run => ({
        text: run.text.slice(Math.max(0, start - run.start), Math.min(run.text.length, end - run.start)), color: run.color
      }));
    });
  }
  const api = { parseMonth, shiftMonth, buildZip, partition, columns, planPages, wrapText, wrapColorRuns };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ScheduleImageExport = api;
  if (typeof document === 'undefined') return;

  const assetBase = new URL('assets/schedule-export/', document.currentScript.src);
  const outputScale = 2;
  const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/></svg>';
  const calendarIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 11h18M7 3v5M17 3v5"/></svg>';
  const chevron = direction => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${direction === 'left' ? 'm14 6-6 6 6 6' : 'm10 6 6 6-6 6'}"/></svg>`;
  const logoSpecs = [
    ['auausave-house.png', 33, 38, 612, 345, 58],
    ['with-auau.png', 155, 197, 197, 95, 43],
    ['savewrg-ofc.png', 337, 501, 2701, 2355, 66]
  ];
  let resources;
  const conditionImages = new Map();
  const loadedConditionImages = new Map();
  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(Error('An export image could not load. Please try again.'));
      img.src = url;
    });
  }
  function loadResources() {
    if (!resources) resources = Promise.all([
      ...[['ScheduleInter', 400, 'inter-regular.ttf'], ['ScheduleInter', 600, 'inter-semibold.ttf'],
        ['ScheduleThai', 400, 'noto-thai-regular.ttf'], ['ScheduleThai', 600, 'noto-thai-semibold.ttf']]
        .map(async ([family, weight, file]) => {
          const font = await new FontFace(family, `url("${new URL(file, assetBase)}")`, { weight: String(weight) }).load();
          document.fonts.add(font);
        }),
      ...logoSpecs.map(spec => loadImage(new URL(spec[0], assetBase).href))
    ]).then(items => items.slice(4)).catch(error => { resources = null; throw error; });
    return resources;
  }
  function conditionImage(option) {
    if (!conditionImages.has(option.id)) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${option.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${option.path}</svg>`;
      conditionImages.set(option.id, loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg))
        .then(img => { loadedConditionImages.set(option.id, img); return img; })
        .catch(error => { conditionImages.delete(option.id); throw error; }));
    }
    return conditionImages.get(option.id);
  }
  function currentScope(trigger) {
    const profile = trigger.closest('.artist-profile-schedule');
    const filters = profile?.querySelector('[data-schedule-owner]');
    const owner = filters?.dataset.scheduleOwner;
    const collaborator = filters?.querySelector('[data-schedule-collaborator]')?.value || 'all';
    const type = !owner && typeof publicTypeFilter !== 'undefined' ? publicTypeFilter : 'all';
    const today = homeScheduleBangkokDate();
    const month = !owner && typeof calendarDate !== 'undefined'
      ? `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}` : today.slice(0, 7);
    const typeLabel = type === 'all' ? '' : db.masterData.types.find(item => item.id === type)?.label || type;
    const label = owner ? artistName(owner) + (collaborator === 'solo' ? ' · Solo schedules' : collaborator === 'all' ? '' : ' · ' + artistName(collaborator))
      : typeLabel ? 'All artists · ' + typeLabel : 'All artists';
    return { owner, collaborator, type, month, label };
  }
  function exportArtistSlug(owner) {
    return ({ AT02: 'auautnp', AT03: 'savewrg' })[owner] || String(owner || '').toLowerCase();
  }
  function scopedEvents(scope) {
    return publicOrderedEvents().filter(event => scope.owner
      ? artistProfileScheduleFilterMatches(event, scope.owner, scope.collaborator)
      : scope.type === 'all' || eventHasType(event, scope.type));
  }
  function model(event) {
    const ids = artistProfileScheduleTags(event);
    const artists = (ids.length ? ids : [event.artistId].filter(Boolean)).map(id => ({
      id: canonicalArtistId(id), label: artistName(id).toUpperCase(), color: artistDisplayColor(id, 0)
    }));
    const baseMeta = unifiedHomeScheduleMeta(event);
    const meta = [event.time && !baseMeta.includes(event.time) ? event.time : '', baseMeta].filter(Boolean).join(' | ');
    const status = eventStatusLabel(event);
    return { ...event,
      artists: artists.length ? artists : [{id:'', label:'EVENT', color:'#77736c'}],
      title: String(event.title || 'Untitled event').normalize('NFKC').replace(/[📸🦋🎓]/gu, '').trim(),
      kind: String(event.type || 'Event').replace(/\s*\|\s*/g, ' · '), meta: meta || 'TBC',
      conditions: eventParticipationOptions(event), status
    };
  }
  function font(ctx, size, weight = 400) {
    ctx.font = `${weight} ${size}px ScheduleInter, ScheduleThai, sans-serif`;
  }
  function measureRow(ctx, event) {
    const lines = (text, size, weight, width = 555) => {
      font(ctx, size, weight); return wrapText(text, width, s => ctx.measureText(s).width);
    };
    const runs = [];
    event.artists.forEach((artist, index) => {
      if (index) runs.push({text:' · ',color:'#77736c'});
      runs.push({text:artist.label,color:artist.color});
    });
    runs.push({text:' · ' + event.kind.toUpperCase(),color:'#77736c'});
    font(ctx, 14, 600);
    const label = wrapColorRuns(runs, 555, text => ctx.measureText(text).width);
    const title = lines(event.title, 25, 600);
    const meta = lines(event.meta, 18, 400);
    const status = lines(event.status, 16, 600);
    const conditions = event.conditions.map(option => ({ option, lines: lines(option.label, 16, 400, 529) }));
    const height = 16 + label.length * 22 + 6 + title.length * 34 + 7 + meta.length * 27 +
      (status.length ? 8 + status.length * 24 : 0) +
      (conditions.length ? 8 + conditions.reduce((sum, item) => sum + item.lines.length * 24, 0) : 0) + 16;
    return { event, date: event.date, label, title, meta, status, conditions, height: Math.max(120, height) };
  }
  function drawLines(ctx, lines, x, y, size, leading, weight, color) {
    font(ctx, size, weight); ctx.fillStyle = color;
    for (const line of lines) { ctx.fillText(line, x, y); y += leading; }
    return y;
  }
  function drawColorLines(ctx, lines, x, y) {
    font(ctx, 14, 600);
    for (const line of lines) {
      let cursor = x;
      for (const run of line) {
        ctx.fillStyle = run.color; ctx.fillText(run.text, cursor, y);
        cursor += ctx.measureText(run.text).width;
      }
      y += 22;
    }
    return y;
  }
  async function renderImages(events, month) {
    const logos = await loadResources();
    const { year, lastDay } = parseMonth(month);
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(new Date(month + '-01T12:00:00Z'));
    const monthShort = monthName.slice(0, 3).toUpperCase();
    const measuring = document.createElement('canvas').getContext('2d');
    const items = partition(events, month).flatMap(part => part.events).map(model);
    const labels = new Map([
      ['AT01', { label: 'AUAUSAVE', color: '#4E8994' }],
      ['AT02', { label: 'AUAU', color: '#5F9272' }],
      ['AT03', { label: 'SAVE', color: '#D65E64' }]
    ]);
    items.forEach(e => {
      e.artists.forEach(artist => {
        if (artist.id && !labels.has(artist.id)) labels.set(artist.id, { label: artist.label, color: artist.color });
      });
    });
    // Measure real text before deciding whether the full month fits one image.
    font(measuring, 18, 600);
    let legendX = 58, legendRows = 1;
    const legend = [...labels.values()].map(item => {
      const width = measuring.measureText(item.label).width + 48;
      if (legendX + width > 1382 && legendX > 58) { legendRows++; legendX = 58; }
      const result = { ...item, x: legendX, row: legendRows - 1 }; legendX += width; return result;
    });
    const legendY = 243;
    const legendBottom = legendY + legendRows * 30 + 8;
    const contentTop = legendBottom + 18;
    const { pages, height } = planPages(items.map(event => measureRow(measuring, event)), month, contentTop);
    if (height > 8192) throw Error('This schedule is too long for two images. Choose an artist or event filter and try again.');
    await Promise.all(items.flatMap(e => e.conditions.map(conditionImage)));
    const updated = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' }).format(new Date());
    return pages.map(part => {
      const canvas = document.createElement('canvas'); canvas.width = 1440 * outputScale; canvas.height = height * outputScale;
      const ctx = canvas.getContext('2d');
      // Draw fonts and original logo assets directly at output resolution.
      ctx.scale(outputScale, outputScale);
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#faf9f6'; ctx.fillRect(0, 0, 1440, height); ctx.textBaseline = 'top';
      ctx.fillStyle = '#ef4b47'; ctx.beginPath(); ctx.arc(58, 52, 6, 0, Math.PI * 2); ctx.fill();
      ctx.letterSpacing = '2px';
      drawLines(ctx, ['AUAUSAVE THAILAND'], 78, 42, 19, 24, 600, '#202020');
      ctx.letterSpacing = '0px';
      font(ctx, 92, 600); ctx.fillStyle = '#191919'; ctx.fillText(monthName, 58, 109);
      const titleWidth = ctx.measureText(monthName).width;
      drawLines(ctx, [String(year)], 58 + titleWidth + 25, 109, 92, 110, 400, '#8a8883');
      ctx.textAlign = 'right'; ctx.letterSpacing = '1px';
      drawLines(ctx, [`${part.start}–${part.end} ${monthName.toUpperCase()}`], 1382, 152, 29, 36, 600, '#777778');
      ctx.textAlign = 'left'; ctx.letterSpacing = '0px';
      ctx.strokeStyle = '#ddd9d2'; ctx.lineWidth = 1;
      for (const y of [220, legendBottom]) {
        ctx.beginPath(); ctx.moveTo(58, y); ctx.lineTo(1382, y); ctx.stroke();
      }
      for (const item of legend) {
        const y = legendY + item.row * 30;
        ctx.fillStyle = item.color; ctx.beginPath(); ctx.arc(item.x + 5, y + 10, 5, 0, Math.PI * 2); ctx.fill();
        drawLines(ctx, [item.label], item.x + 20, y, 18, 25, 600, '#202020');
      }
      for (const [colIndex, col] of part.columns.entries()) {
        let y = contentTop, previousDate = '';
        const left = 58 + colIndex * 685;
        for (const [rowIndex, row] of col.entries()) {
          const e = row.event, x = left + 84, rowY = y + 16;
          ctx.strokeStyle = '#ddd9d2'; ctx.lineWidth = 1;
          if (rowIndex > 0) {
            ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + 639, y); ctx.stroke();
          }
          if (e.date !== previousDate) {
            drawLines(ctx, [String(Number(e.date.slice(8)))], left, rowY, 50, 55, 600, '#202020');
            drawLines(ctx, [monthShort], left + 2, rowY + 58, 14, 18, 600, '#76736e');
          }
          previousDate = e.date;
          let cursor = drawColorLines(ctx, row.label, x, rowY) + 6;
          cursor = drawLines(ctx, row.title, x, cursor, 25, 34, 600, '#202020') + 7;
          cursor = drawLines(ctx, row.meta, x, cursor, 18, 27, 400, '#77736c');
          if (row.status.length) cursor = drawLines(ctx, row.status, x, cursor + 8, 16, 24, 600, '#ad3937');
          if (row.conditions.length) cursor += 8;
          for (const condition of row.conditions) {
            ctx.drawImage(loadedConditionImages.get(condition.option.id), x, cursor + 2, 18, 18);
            cursor = drawLines(ctx, condition.lines, x + 26, cursor, 16, 24, 400, '#77736c');
          }
          y += row.height;
        }
      }
      const count = part.columns.reduce((sum, col) => sum + col.length, 0);
      if (!count) drawLines(ctx, ['No schedules in this period.'], 58, contentTop + 24, 25, 34, 400, '#77736c');
      const footerY = height - 126;
      ctx.strokeStyle = '#ddd9d2'; ctx.beginPath(); ctx.moveTo(58, footerY); ctx.lineTo(1382, footerY); ctx.stroke();
      drawLines(ctx, ['auausaveth.com'], 58, footerY + 26, 19, 26, 600, '#353431');
      drawLines(ctx, ['Updated ' + updated], 58, footerY + 57, 15, 22, 400, '#77736c');
      let x = 1382 - logoSpecs.reduce((sum, spec) => sum + spec[3] / spec[4] * spec[5], 0) - 64;
      logoSpecs.forEach((spec, i) => {
        const [, sx, sy, sw, sh, h] = spec, w = sw / sh * h;
        ctx.drawImage(logos[i], sx, sy, sw, sh, x, footerY + 22 + (66 - h) / 2, w, h); x += w + 32;
      });
      return { canvas, start: part.start, end: part.end, count, month, lastDay };
    });
  }
  api.renderImages = renderImages;
  api.scopedEvents = scopedEvents;

  function element(tag, className, text) {
    const node = document.createElement(tag); if (className) node.className = className;
    if (text !== undefined) node.textContent = text; return node;
  }
  function open(trigger) {
    if (document.querySelector('.schedule-export-dialog')) return;
    const scope = currentScope(trigger);
    const dialog = element('dialog', 'schedule-export-dialog');
    dialog.setAttribute('aria-labelledby', 'schedule-export-title');
    dialog.innerHTML = `<div class="schedule-export-shell"><div class="schedule-export-handle" aria-hidden="true"></div><header class="schedule-export-head"><div><h2 id="schedule-export-title">Export schedule</h2><div class="schedule-export-subhead"><span class="schedule-export-badge">${calendarIcon}<span class="schedule-export-scope"></span></span><span class="schedule-export-subtitle">PNG images for sharing</span></div></div><button class="schedule-export-close" type="button" aria-label="Close export"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header><form class="schedule-export-form"><label class="schedule-export-month-label" for="schedule-export-month">Month</label><div class="schedule-export-month-nav"><button type="button" data-month-step="-1" aria-label="Previous export month">${chevron('left')}</button><div class="schedule-export-month-picker"><span class="schedule-export-month-text" aria-hidden="true"></span><input id="schedule-export-month" type="month" name="month" aria-label="Export month" required min="1000-01" max="9999-12"></div><button type="button" data-month-step="1" aria-label="Next export month">${chevron('right')}</button></div></form><div class="schedule-export-summary"><p class="schedule-export-status" role="status" aria-live="polite"></p><span class="schedule-export-fit"></span></div><p class="schedule-export-hint" hidden>Too many events to fit one image, so the month is split in two.</p><button type="button" class="schedule-export-retry" hidden>Try again</button><div class="schedule-export-results" aria-label="Schedule downloads"></div></div><footer class="schedule-export-footer"><button type="button" class="schedule-export-cancel">Cancel</button><button type="button" class="schedule-export-primary" disabled>${icon}<span>Preparing images…</span></button><p class="schedule-export-download-note"></p></footer>`;
    dialog.querySelector('.schedule-export-scope').textContent = scope.label;
    const form = dialog.querySelector('form'), input = form.elements.month;
    input.value = scope.month;
    const status = dialog.querySelector('.schedule-export-status'), results = dialog.querySelector('.schedule-export-results');
    const retry = dialog.querySelector('.schedule-export-retry');
    const primary = dialog.querySelector('.schedule-export-primary'), primaryText = primary.querySelector('span');
    const fit = dialog.querySelector('.schedule-export-fit'), hint = dialog.querySelector('.schedule-export-hint');
    const note = dialog.querySelector('.schedule-export-download-note');
    let urls = [], disposed = false, generation = 0, ready = null;
    const revoke = () => { urls.forEach(url => URL.revokeObjectURL(url)); urls = []; };
    function close() { if (dialog.open) dialog.close(); }
    dialog.addEventListener('close', () => { disposed = true; generation++; dialog.remove(); setTimeout(revoke, 1000); }, { once: true });
    dialog.querySelector('.schedule-export-close').addEventListener('click', close);
    dialog.querySelector('.schedule-export-cancel').addEventListener('click', close);
    dialog.addEventListener('click', event => { if (event.target === dialog) {
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
    } });
    const clear = () => {
      revoke(); ready = null; primary.disabled = true; primaryText.textContent = 'Preparing images…';
      results.replaceChildren(); status.textContent = ''; status.classList.remove('has-error');
      fit.textContent = ''; hint.hidden = true; note.textContent = '';
    };
    function updateMonthLabel() {
      if (!input.value || !input.validity.valid) return;
      dialog.querySelector('.schedule-export-month-text').textContent = new Intl.DateTimeFormat('en-US', {month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(input.value+'-01T12:00:00Z'));
      dialog.querySelector('[data-month-step="-1"]').disabled = input.value === '1000-01';
      dialog.querySelector('[data-month-step="1"]').disabled = input.value === '9999-12';
    }
    primary.addEventListener('click', async () => {
      if (!ready) return;
      const current = ready;
      if (current.share) {
        primary.disabled = true;
        try { await navigator.share({files:current.files}); }
        catch (error) {
          if (ready === current && error.name !== 'AbortError') {
            current.share = false;
            primaryText.textContent = current.files.length === 1 ? 'Download image' : 'Download both';
            note.textContent = 'Sharing is unavailable. Tap Download to save the files instead.';
          }
        } finally { if (ready === current) primary.disabled = false; }
      } else {
        const link = element('a'); link.href = current.url; link.download = current.name;
        dialog.append(link); link.click(); link.remove();
      }
    });
    async function generate() {
      const request = ++generation;
      clear(); retry.hidden = true;
      updateMonthLabel();
      if (!input.value || !input.validity.valid) {
        results.setAttribute('aria-busy', 'false');
        status.textContent = 'Choose a valid month to export.';
        return;
      }
      status.textContent = 'Preparing download…'; results.setAttribute('aria-busy', 'true');
      const selectedMonth = input.value;
      const isCurrent = () => !disposed && generation === request;
      const pendingUrls = [];
      try {
        const images = await renderImages(scopedEvents(scope), selectedMonth);
        const cards = document.createDocumentFragment(), files = [];
        const monthShort = new Intl.DateTimeFormat('en-US',{month:'short',timeZone:'UTC'}).format(new Date(selectedMonth+'-01T12:00:00Z'));
        for (const part of images) {
          if (!isCurrent()) return;
          const blob = await new Promise((resolve, reject) => part.canvas.toBlob(value => value ? resolve(value) : reject(Error('Could not create the PNG. Try again.')), 'image/png'));
          if (!isCurrent()) return;
          const url = URL.createObjectURL(blob); pendingUrls.push(url);
          const card = element('article', 'schedule-export-result');
          const stage = element('div', 'schedule-export-thumbnail');
          const img = element('img'); img.src = url; img.alt = `${monthShort} ${part.start}–${part.end} schedule`;
          img.width = part.canvas.width; img.height = part.canvas.height; stage.append(img);
          const caption = element('div','schedule-export-caption');
          const details = element('div');
          details.append(element('strong','',`${monthShort} ${part.start}–${part.end}`),element('p','',`${part.count} ${part.count === 1 ? 'event' : 'events'}`));
          const save = element('a', 'schedule-export-save'); save.innerHTML = icon; save.href = url;
          save.setAttribute('aria-label',`Download ${part.start}–${part.end}`); save.title=`Download ${part.start}–${part.end}`;
          const artistSlug = scope.owner ? exportArtistSlug(scope.owner) + '-' : '';
          save.download = `auausave-${artistSlug}${selectedMonth}-${String(part.start).padStart(2, '0')}-${part.end}.png`;
          files.push(new File([blob],save.download,{type:'image/png'}));
          caption.append(details,save); card.append(stage,caption); cards.append(card);
        }
        let share = false;
        try { share = matchMedia('(max-width: 600px)').matches && typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({files}); } catch (_) { /* Use the download fallback. */ }
        let bundleUrl = pendingUrls[0], bundleName = files[0].name;
        if (images.length > 1) {
          const zip = await buildZip(files.map(file => ({name:file.name,blob:file})));
          if (!isCurrent()) return;
          bundleUrl = URL.createObjectURL(zip); pendingUrls.push(bundleUrl);
          bundleName = `auausave-${scope.owner ? exportArtistSlug(scope.owner)+'-' : ''}${selectedMonth}.zip`;
        }
        if (isCurrent()) {
          urls = pendingUrls.splice(0); results.replaceChildren(cards);
          const total = images.reduce((sum, image) => sum + image.count, 0);
          status.textContent = `${images.length} ${images.length === 1 ? 'image' : 'images'} · ${total} ${total === 1 ? 'event' : 'events'}`;
          fit.textContent = images.length === 1 ? 'Whole month fits' : 'Split at the 16th';
          hint.hidden = images.length === 1;
          results.classList.toggle('is-single',images.length === 1);
          ready = {files,share,url:bundleUrl,name:bundleName}; primary.disabled = false;
          primaryText.textContent = share ? (images.length === 1 ? 'Save image' : 'Save both images') : (images.length === 1 ? 'Download image' : 'Download both');
          note.textContent = share ? 'Choose where to save in your device’s share menu.' : images.length > 1 ? '2 PNG files in one ZIP download' : '';
        }
      } catch (error) {
        if (isCurrent()) { clear(); status.textContent = error.message || 'Could not create images. Please try again.'; status.classList.add('has-error'); retry.hidden = false; }
      } finally {
        pendingUrls.forEach(url => URL.revokeObjectURL(url));
        if (isCurrent()) results.setAttribute('aria-busy', 'false');
      }
    }
    form.addEventListener('submit', event => { event.preventDefault(); generate(); });
    input.addEventListener('input', generate);
    dialog.querySelectorAll('[data-month-step]').forEach(button => button.addEventListener('click',()=>{
      input.value = shiftMonth(input.value || scope.month,Number(button.dataset.monthStep)); generate();
    }));
    retry.addEventListener('click', generate);
    document.body.append(dialog);
    dialog.classList.toggle('is-pointer-opened', typeof eventDialogKeyboardInput !== 'undefined' && !eventDialogKeyboardInput);
    dialog.addEventListener('keydown', () => dialog.classList.remove('is-pointer-opened'));
    dialog.showModal();
    generate();
  }
  api.open = open;
  function mount() {
    document.querySelectorAll('.dynamic-calendar-legend > .public-type-filter, .mobile-calendar-controls > select, .artist-schedule-collaborator > select').forEach(select => {
      const controls = element('div', 'schedule-export-controls');
      const currentMonth = select.parentElement.matches('.dynamic-calendar-legend') ? select.previousElementSibling : null;
      select.before(controls);
      if (currentMonth?.tagName === 'BUTTON') {
        currentMonth.classList.add('schedule-current-month'); controls.append(currentMonth);
      }
      controls.append(select);
      const button = element('button', 'schedule-export-trigger'); button.type = 'button'; button.innerHTML = icon;
      button.setAttribute('aria-label', 'Export schedule'); button.setAttribute('aria-haspopup', 'dialog'); button.title = 'Export schedule';
      button.addEventListener('click', () => open(button)); controls.append(button);
    });
  }
  const appRoot = document.querySelector('#app');
  if (appRoot) { new MutationObserver(mount).observe(appRoot, { childList: true, subtree: true }); mount(); }
})(typeof globalThis !== 'undefined' ? globalThis : this);
