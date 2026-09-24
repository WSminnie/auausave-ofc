const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function setup(files) {
  const context = vm.createContext({ console, URL, Intl, Date, document: { addEventListener() {} }, escapePageText: value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), validTimelineUrl: value => { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } } });
  context.window = context;
  for (const file of ['series/types.js', ...files]) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
  return context;
}
test('long episode synopsis stays complete and metadata follows in keyword-first order', () => {
  const { SeriesFeature: S } = setup(['series/components/shared.js', 'series/components/episodes.js']);
  const description = 'A long official synopsis. '.repeat(200) + '<final paragraph>';
  const html = S.components.episodeCard({ episode_number: 1, description, keyword: 'CHAPTER ONE', hashtag: '#Episode1', links: [] });
  assert.ok(html.includes('A long official synopsis. '.repeat(200)));
  assert.ok(html.includes('&lt;final paragraph&gt;'));
  assert.ok(!html.includes('<dt>'));
  assert.ok(html.indexOf('CHAPTER ONE') < html.indexOf('#Episode1'));
  assert.ok(html.includes('series-episode-placeholder'));
  assert.ok(html.includes('aria-expanded="false"'));
});

test('empty related content and unavailable watch links do not create actions', () => {
  const { SeriesFeature: S } = setup(['series/components/shared.js', 'series/components/episodes.js', 'series/components/related-content.js']);
  assert.equal(S.components.related({ appearances: [], media: [], moments: [] }), '');
  assert.ok(!S.components.episodeCard({ episode_number: 4, links: [] }).includes('<a '));
});

test('related adapter preserves each source record and its URL without mutating input', () => {
  const { SeriesFeature: S } = setup(['series/components/shared.js', 'series/components/related-content.js']);
  // Empty optional fields exercise the same database shapes without adding content.
  const appearance = Object.freeze({ official_url: null, type: 'INTERVIEW', participants: null });
  const media = Object.freeze({ official_url: null, type: 'BTS', description: null });
  const moment = Object.freeze({ related_url: null, image_url: null });
  const rows = S.components.relatedRows({ appearances: [appearance], media: [media], moments: [moment] });
  assert.deepEqual(Array.from(rows, row => row.category), ['INTERVIEW', 'BTS', 'Moment']);
  assert.ok(rows.every(row => row.url === null));
  assert.equal(rows[2].thumbnail_url, null);
  assert.equal(Object.hasOwn(appearance, 'category'), false);
  assert.ok(!S.components.related({appearances:[appearance]}).includes('<a '));
});

test('official hashtags link individually to encoded X searches and escape plain text', () => {
  const { SeriesFeature: S } = setup(['series/components/shared.js', 'series/components/series-overview.js']);
  const html = S.components.hashtagLinks('#รักสุดใจ #MrFanboySeries <script>');
  assert.ok(html.includes('https://x.com/search?q=' + encodeURIComponent('#รักสุดใจ')));
  assert.ok(html.includes('https://x.com/search?q=%23MrFanboySeries'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
});

test('episodes use numeric order with manual overrides', () => {
  const { SeriesFeature: S } = setup([]);
  const result = S.order([{ id: 'ten', episode_number: 10 }, { id: 'two', episode_number: 2 }, { id: 'manual', episode_number: 3, display_order: 0 }], 'episodes');
  assert.deepEqual(Array.from(result, row => row.id), ['manual', 'two', 'ten']);
});
test('default Series chooses published preference then ordered fallback', () => {
  const { SeriesFeature: S } = setup([]);
  const rows = [{id:'one',visible:true,display_order:1},{id:'two',visible:true,is_default:true,display_order:2}];
  assert.equal(S.defaultSeries(rows).id, 'two');
  rows[1].visible = false;
  assert.equal(S.defaultSeries(rows).id, 'one');
  assert.equal(S.defaultSeries(rows.slice(0,1)).id, 'one');
  rows[0].visible = false;
  assert.equal(S.defaultSeries(rows), null);
});
test('series selector is hidden for one story and marks the selected story', () => {
  const { SeriesFeature: S } = setup(['series/components/shared.js','series/components/series-selector.js']);
  const first = {id:'a',title_en:'First <story>',slug:'first'}, second = {id:'b',title_en:'Second',slug:'second'};
  assert.equal(S.components.seriesSelector([first], first), '');
  const html = S.components.seriesSelector([first,second], second);
  assert.match(html, /First &lt;story&gt;/);
  assert.match(html, /href="#series\/second" aria-current="page"/);
});
test('publication controls are outside forms and default requires publication', () => {
  const { SeriesFeature: S } = setup(['series/components/shared.js','series/admin/publication.js']);
  const html = S.publication.controls({id:'a',title_en:'Story',visible:false},0,'series',null);
  assert.match(html, /role="switch" aria-checked="false"/);
  assert.match(html, /data-default="0" disabled/);
  const commonSource = fs.readFileSync(path.join(root,'series/admin/form-fields.js'),'utf8');
  assert.ok(!commonSource.includes('name="visible"'));
});
test('image crop presets match Series display aspect ratios', () => {
  const { SeriesFeature: S } = setup(['series/admin/image-integration.js']);
  assert.equal(S.images.preset('cover_url').ratio, 16 / 9);
  assert.equal(S.images.preset('thumbnail_url').ratio, 16 / 9);
  assert.equal(S.images.preset('banner_url').ratio, 4);
  assert.equal(S.images.preset('image_url').ratio, 16 / 9);
  assert.equal(S.images.preset('series_row_1').ratio, 1);
});
test('Master defaults use existing broadcast normalization and preserve manual edits', () => {
  const ctx = setup(['series/admin/master-data.js']);
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  vm.runInContext(app.slice(app.indexOf('function normalizeBroadcasts('), app.indexOf('function seriesBroadcastRow(')), ctx);
  const master = { id: 'sample', label: 'Sample Series', broadcasts: [{channel:'TV',time:'22:30',mode:'live'}, {channel:'Stream',time:'23:30',mode:'online_uncut'}] };
  const values = ctx.SeriesFeature.master.defaults(master);
  assert.equal(values.slug, 'sample-series');
  assert.equal(values.broadcast_info, 'TV · 22:30');
  assert.equal(values.streaming_info, 'Stream · 23:30 · UNCUT');
  assert.equal(ctx.SeriesFeature.master.defaults({id:'thai_name',label:'ชื่อไทย'}).title_th, 'ชื่อไทย');
  assert.equal(ctx.SeriesFeature.master.defaults({id:'thai_name',label:'ชื่อไทย'}).slug, 'thai-name');
  let change;
  const elements = Object.fromEntries(Object.keys(values).map(key => [key, {value:''}]));
  elements.master_series_id = {addEventListener:(_name,handler)=>{change=handler;}};
  ctx.db = {masterData:{series:[master,{id:'second',label:'Second Series',broadcasts:[]}]}};
  ctx.SeriesFeature.master.bind({elements});
  change({target:{value:'sample'}});
  elements.title_en.value='My edited title';
  change({target:{value:'second'}});
  assert.equal(elements.title_en.value, 'My edited title');
  assert.equal(elements.slug.value, 'second-series');
  assert.equal(elements.broadcast_info.value, '');
  change({target:{value:''}});
  assert.equal(elements.title_en.value, 'My edited title');
  assert.equal(elements.slug.value, '');
});
test('dated content uses newest first, with manual order first', () => {
  const { SeriesFeature: S } = setup([]);
  assert.deepEqual(Array.from(S.order([{ id: 'old', date: '2026-01-01' }, { id: 'new', date: '2026-09-01' }, { id: 'pin', display_order: 0 }], 'media'), row => row.id), ['pin', 'new', 'old']);
});
test('renderers escape content, reject unsafe URLs and omit absent sections', () => {
  const { SeriesFeature: S } = setup(['series/components/shared.js', 'series/components/episodes.js', 'series/components/appearances.js', 'series/components/media-moments.js', 'series/components/navigation.js']);
  const C = S.components;
  const html = C.episodeCard({ episode_number: 1, title: '<script>alert(1)</script>', links: [{ label: 'Unsafe', url: 'javascript:alert(1)' }, { label: '<Watch>', url: 'https://example.com' }] });
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('javascript:'));
  assert.match(html, /&lt;Watch&gt;/);
  assert.match(html, /rel="noopener noreferrer"/);
  for (const kind of ['episodes', 'appearances', 'media', 'moments']) assert.equal(C[kind]([]), '');
  const nav = C.navigation({ episodes: [], appearances: [], media: [], moments: [] });
  assert.ok(nav.includes('Overview'));
  assert.ok(!nav.includes('Episodes'));
});
test('API filters public data and pages beyond database row limits', async () => {
  const ctx = setup(['series/services/series-api.js']);
  const calls = [];
  const query = {
    select() { return this; }, eq(...args) { calls.push(args); return this; }, order() { return this; },
    range(start) { return Promise.resolve({ data: start === 0 ? Array.from({ length: 500 }, (_, n) => ({ id: String(n), episode_number: n })) : [{ id: 'last', episode_number: 501 }], error: null }); }
  };
  ctx.auausaveDB = { client: { from: () => query } };
  const rows = await ctx.SeriesFeature.api.list('episodes', { seriesId: 'parent' });
  assert.equal(rows.length, 501);
  assert.deepEqual(calls, [['visible', true], ['series_id', 'parent']]);
});
test('Series and Episode API saves use atomic RPCs and existing media uploader', async () => {
  const ctx = setup(['series/services/series-api.js']);
  const calls = [];
  ctx.auausaveDB = {
    session: async () => ({ data: { session: {} } }),
    uploadEmbeddedMedia: async value => value,
    client: { rpc: async (name, payload) => { calls.push({ name, payload }); return { data: 'saved', error: null }; } }
  };
  await ctx.SeriesFeature.api.save('series', { id: 's' }, { cast: [{ artist_name: 'Actor' }], links: [{ label: 'Official' }] });
  await ctx.SeriesFeature.api.save('episodes', { id: 'ep' }, { links: [{ label: 'Watch' }, { label: 'Teaser' }] });
  assert.equal(calls[0].name, 'save_series_archive');
  assert.equal(calls[0].payload.p_cast.length, 1);
  assert.equal(calls[1].name, 'save_series_episode');
  assert.equal(calls[1].payload.p_links.length, 2);
});
test('API does not silently accept failed writes or expired sessions', async () => {
  const ctx = setup(['series/services/series-api.js']);
  ctx.auausaveDB = { session: async () => ({ data: { session: null } }) };
  await assert.rejects(ctx.SeriesFeature.api.save('series', { id: 's' }), /session has expired/);
  ctx.auausaveDB = { session: async () => ({ data: { session: {} } }), uploadEmbeddedMedia: async value => value, client: { rpc: async () => ({ error: { code: '23505' } }) } };
  await assert.rejects(ctx.SeriesFeature.api.save('series', { id: 's' }), /already exists/);
});
test('detail batches episode links and assigns each to its own episode', async () => {
  const ctx = setup(['series/services/series-api.js']);
  let linkRequests = 0;
  ctx.auausaveDB = { client: { from(table) {
    return {
      select() { return this; }, eq() { return this; }, order() { return this; },
      in(field, ids) { assert.equal(field, 'episode_id'); assert.equal(ids.length, 2); ++linkRequests; return this; },
      maybeSingle: async () => ({ data: { id: 's', slug: 'story', visible: true } }),
      range: async () => ({ data: table === 'series_episodes' ? [{ id: 'ep1', episode_number: 1 }, { id: 'ep2', episode_number: 2 }] : table === 'series_episode_links' ? [{ episode_id: 'ep2', label: 'Second' }, { episode_id: 'ep1', label: 'First' }] : [] })
    };
  } } };
  const detail = await ctx.SeriesFeature.api.detail('story');
  assert.equal(detail.episodes[0].links[0].label, 'First');
  assert.equal(detail.episodes[1].links[0].label, 'Second');
  assert.equal(linkRequests, 1);
});

test('Series menu defaults visible, can hide, and sits directly after Schedule in admin', () => {
  const ctx = setup([]);
  const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  ctx.db = { siteSettings: {} };
  ctx.adminTab = 'series';
  vm.runInContext(source.slice(source.indexOf('function nav('), source.indexOf('function closePublicMenu(')), ctx);
  vm.runInContext(source.slice(source.indexOf('const ADMIN_MENU_ITEMS ='), source.indexOf('function admin()')), ctx);
  assert.ok(ctx.nav().includes('href="#series"'));
  ctx.db.siteSettings.seriesMenuVisible = false;
  assert.ok(!ctx.nav().includes('href="#series"'));
  assert.ok(ctx.nav().includes('href="#schedule"'));
  ctx.db.siteSettings.seriesMenuVisible = true;
  assert.ok(ctx.nav().includes('href="#series"'));
  assert.equal(vm.runInContext('ADMIN_MENU_ITEMS[ADMIN_MENU_ITEMS.findIndex(row => row[0] === "events") + 1][0]', ctx), 'series');
  assert.ok(!ctx.adminSidebarMarkup().includes('Series Management'));
});

test('menu preference persists, rolls back on failure, and rejects unauthenticated changes', async () => {
  const ctx = setup(['series/components/shared.js', 'series/admin/management.js']);
  ctx.db = { siteSettings: {} };
  ctx.adminAuthenticated = true;
  ctx.auausaveDB = { session: async () => ({data:{session:{}}}) };
  ctx.save = () => {};
  ctx.syncDatabaseInBackground = async () => true;
  await ctx.SeriesFeature.admin.setMenuVisible(false);
  assert.equal(ctx.db.siteSettings.seriesMenuVisible, false);
  ctx.syncDatabaseInBackground = async () => false;
  await assert.rejects(ctx.SeriesFeature.admin.setMenuVisible(true));
  assert.equal(ctx.db.siteSettings.seriesMenuVisible, false);
  delete ctx.db.siteSettings.seriesMenuVisible;
  await assert.rejects(ctx.SeriesFeature.admin.setMenuVisible(false));
  assert.equal(Object.hasOwn(ctx.db.siteSettings, 'seriesMenuVisible'), false);
  ctx.adminAuthenticated = false;
  await assert.rejects(ctx.SeriesFeature.admin.setMenuVisible(false));
  assert.equal(Object.hasOwn(ctx.db.siteSettings, 'seriesMenuVisible'), false);
});

test('related content sorts newest first across categories and places undated items last', () => {
  const {SeriesFeature:S}=setup(['series/components/shared.js','series/components/related-content.js']);
  const item={appearances:[{id:'old',date:'2026-01-01',display_order:0}],media:[{id:'undated',date:null},{id:'latest',date:'2026-09-23',display_order:99}],moments:[{id:'middle',date:'2026-05-01'}]};
  const before=JSON.stringify(item);
  assert.deepEqual(Array.from(S.components.relatedRows(item),row=>row.id),['latest','middle','old','undated']);
  assert.equal(JSON.stringify(item),before);
});

test('related filters position new media types and select OST by default',()=>{
 const {SeriesFeature:S}=setup(['series/components/shared.js','series/components/related-content.js']);
 assert.ok(S.types.media.types.includes('REACTION'));assert.ok(S.types.media.types.includes('PILOT'));
 const html=S.components.related({media:['REACTION','PILOT','OST','BTS','TEASER'].map(type=>({type}))});
 const filters=Array.from(html.matchAll(/data-related-filter="([^"]*)"/g),m=>m[1]);
 assert.equal(filters[filters.indexOf('BTS')+1],'REACTION');assert.equal(filters[filters.indexOf('TEASER')+1],'PILOT');
 assert.ok(html.includes('data-related-filter="OST" aria-pressed="true"'));
 assert.ok(html.includes('data-related-category="REACTION" hidden'));
 assert.ok(!html.includes('data-related-category="OST" hidden'));
 const noOst=S.components.related({media:[{type:'BTS'},{type:'PILOT'}]});
 assert.ok(noOst.includes('data-related-filter="" aria-pressed="true"'));
 assert.ok(!noOst.includes(' hidden'));
});
