const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { sourceIndex } = require('./source-section.cjs');
const PublicRoutes = require('../public-routes.js');

test('clean admin URL completes the existing unauthenticated-session check', async () => {
  const source = fs.readFileSync('app.js', 'utf8'), logins = [];
  const context = vm.createContext({
    location: new URL('https://auausaveth.com/admin'), adminAuthRequest: 0,
    app: { innerHTML: '' }, renderAdminLogin: message => logins.push(message),
    window: { PublicRoutes, auausaveDB: { session: async () => ({ data: { session: null } }) } },
  });
  vm.runInContext(source.slice(sourceIndex(source, 'async function requestAdminAccess('), sourceIndex(source, 'async function adminSignIn(')), context);
  await context.requestAdminAccess();
  assert.equal(logins.length, 1);
  assert.equal(context.adminAuthenticated, false);
});
test('late authentication results do not overwrite a clean public route', async () => {
  const source = fs.readFileSync('app.js', 'utf8'), logins = [];
  let finish;
  const context = vm.createContext({
    location: new URL('https://auausaveth.com/admin'), adminAuthRequest: 0,
    app: { innerHTML: '' }, renderAdminLogin: message => logins.push(message),
    window: { PublicRoutes, auausaveDB: { session: () => new Promise(resolve => { finish = resolve; }) } },
  });
  vm.runInContext(source.slice(sourceIndex(source, 'async function requestAdminAccess('), sourceIndex(source, 'async function adminSignIn(')), context);
  const work = context.requestAdminAccess();
  context.location.pathname = '/projects';
  finish({ data: { session: null } });
  await work;
  assert.equal(logins.length, 0);
});

test('late authentication rejection does not replace the departed page', async () => {
  const source = fs.readFileSync('app.js', 'utf8'), logins = [];
  let reject;
  const context = vm.createContext({ location: new URL('https://auausaveth.com/admin'), adminAuthRequest: 0,
    app: { innerHTML: '' }, renderAdminLogin: message => logins.push(message),
    window: { PublicRoutes, auausaveDB: { session: () => new Promise((_, no) => { reject = no; }) } } });
  vm.runInContext(source.slice(sourceIndex(source, 'async function requestAdminAccess('), sourceIndex(source, 'async function adminSignIn(')), context);
  const work = context.requestAdminAccess();
  context.location.pathname = '/projects'; reject(new Error('offline')); await work;
  assert.deepEqual(logins, []);
});

test('sign-in completion and rejection do not render after leaving admin', async () => {
  const source = fs.readFileSync('app.js', 'utf8');
  for (const failure of [false, true]) {
    let finish;
    const renders = [];
    const context = vm.createContext({ location: new URL('https://auausaveth.com/admin'), adminAuthRequest: 0,
      FormData: class { get(key) { return key === 'email' ? 'test@example.com' : 'secret'; } },
      admin: () => renders.push('admin'), renderAdminLogin: () => renders.push('login'), toast() {}, connectAdminDatabase: async () => {},
      window: { PublicRoutes, auausaveDB: { signIn: () => new Promise((resolve, reject) => { finish = failure ? reject : resolve; }) } } });
    vm.runInContext(source.slice(sourceIndex(source, 'async function adminSignIn('), sourceIndex(source, 'async function adminSignOut(')), context);
    const work = context.adminSignIn({ preventDefault() {}, currentTarget: { querySelector: () => ({}) } });
    context.location.pathname = '/projects'; finish(failure ? new Error('offline') : { data: { user: {} } }); await work;
    assert.deepEqual(renders, [], failure ? 'rejected sign-in' : 'completed sign-in');
  }
});

test('Series administration accepts clean admin paths and rejects other pages', () => {
  const source = fs.readFileSync('series/admin/management.js', 'utf8');
  const guard = source.slice(source.indexOf('const active ='), source.indexOf('S.admin ='));
  const context = vm.createContext({ PublicRoutes, location: new URL('https://auausaveth.com/admin'), request: 1, adminTab: 'series', adminAuthenticated: true });
  context.window = context;
  vm.runInContext(guard + '; globalThis.checkActive = active;', context);
  assert.equal(context.checkActive(1), true);
  context.location.pathname = '/projects'; assert.equal(context.checkActive(1), false);
});

test('Series editor opens on a clean admin path', async () => {
  let opened = false;
  const context = vm.createContext({ PublicRoutes, location: new URL('https://auausaveth.com/admin'), adminTab: 'series',
    SeriesFeature: { images: { install() {} } }, crypto: { randomUUID: () => 'new' },
    closeModal: () => { opened = true; throw new Error('stop before creating modal'); }, toast() {} });
  context.window = context;
  vm.runInContext(fs.readFileSync('series/admin/editor.js', 'utf8'), context);
  await context.SeriesFeature.openEditor('series');
  assert.equal(opened, true);
});

test('artist history selects existing panels while data refresh still renders fresh content', () => {
  const panels = ['profile', 'schedule'].map(tab => ({ dataset: { savePanel: tab }, hidden: tab !== 'profile' }));
  const links = ['profile', 'schedule'].map(tab => ({ dataset: { saveTab: tab }, setAttribute() {}, removeAttribute() {} }));
  const main = { dataset: { saveArtist: 'AT03' }, retainedFilter: 'selected', querySelector: () => links[1],
    querySelectorAll: selector => selector.includes('data-save-tab') ? links : panels };
  let renders = 0;
  const context = vm.createContext({ location: new URL('https://auausaveth.com/savewrg/schedule'), PublicRoutes: { ...PublicRoutes, syncLocation() {} },
    artistPublicSlug: () => 'SAVE', scrollPageToTop() {}, renderPublicArtistProfile: () => { renders++; } });
  context.window = context;
  vm.runInContext(fs.readFileSync('save-profile-tabs.js', 'utf8'), context);
  context.document = { querySelector: () => main, documentElement: {} };
  const source = fs.readFileSync('app.js', 'utf8');
  vm.runInContext(source.slice(sourceIndex(source, 'function router('), sourceIndex(source, 'function scrollPageToTop(')), context);
  context.router({ type: 'popstate' });
  assert.equal(renders, 0);
  assert.equal(main.retainedFilter, 'selected');
  assert.equal(panels[1].hidden, false);
  assert.equal(panels[0].hidden, true);
  context.router();
  assert.equal(renders, 1, 'database hydration must still render fresh profile data');
});

function seriesContext(list) {
  const listeners = {};
  const item = { slug: 'example', episodes: [] };
  const components = Object.fromEntries(['seriesSelector', 'navigation', 'overview', 'episodes', 'related'].map(key => [key, () => '']));
  components.hero = () => '<h1>Example Series</h1>';
  components.e = String;
  components.detailFooter = () => '';
  components.bindNavigation = () => () => {};
  const context = vm.createContext({
    PublicRoutes, location: new URL('https://auausaveth.com/series/example'), console,
    document: {documentElement:{classList:{remove(){}}}},
    app: { innerHTML: '', querySelector(selector) {return this.innerHTML.includes('<h1>Example Series</h1>')&&selector==='.series-detail-page'?{dataset:{},removeAttribute(){},addEventListener(){},removeEventListener(){}}:null;} }, nav: () => '', footer: () => '',
    SeriesFeature: { progressiveView:{markup:()=>components.hero(),restore(){}}, components, desktopView: { render: () => components.hero(), bind: () => () => {} }, api: { list, detail: async () => item }, detailView: {
      theme: () => ({ bg: '#1C1A22', accent: '#E8D49B' }), status: () => 'ON AIR',
      render: () => '', bind: () => () => {},
    } },
    addEventListener: (event, callback) => { listeners[event] = callback; },
  });
  context.window = context;
  vm.runInContext(fs.readFileSync('series/pages/series-pages.js', 'utf8'), context);
  return { context, listeners };
}
test('Series detail finishes loading when the current URL has a path and no hash', async () => {
  const { context } = seriesContext(async () => []);
  await context.SeriesFeature.pages.render('series/example');
  assert.match(context.app.innerHTML, /<h1>Example Series<\/h1>/);
});
test('a pending Series response is discarded after clean-path navigation away', async () => {
  let finish;
  const { context, listeners } = seriesContext(() => new Promise(resolve => { finish = resolve; }));
  const work = context.SeriesFeature.pages.render('series/example');
  context.location.pathname = '/projects';
  listeners.publicroutechange();
  context.app.innerHTML = '<h1>Projects</h1>';
  finish([]);
  await work;
  assert.equal(context.app.innerHTML, '<h1>Projects</h1>');
});

test('empty and failed Series pages reveal without waiting for global hydration', async () => {
  for(const failed of [false,true]) {
    const {context}=seriesContext(async()=>{if(failed)throw new Error('offline');return [];});
    const removed=[];context.location.pathname='/series';context.SeriesFeature.defaultSeries=()=>null;
    context.document.documentElement.classList.remove=value=>removed.push(value);
    const query=context.app.querySelector.bind(context.app);
    context.app.querySelector=selector=>selector==='[data-series-retry]'?{addEventListener(){}}:query(selector);
    await context.SeriesFeature.pages.render('series');
    assert.ok(removed.includes('initial-route-loading'),failed?'fatal error':'empty archive');
  }
});
