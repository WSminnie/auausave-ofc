const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { sourceIndex } = require('./source-section.cjs');
const source = fs.readFileSync('app.js', 'utf8');

function setup(settings = {}) {
  const context = vm.createContext({ db: { siteSettings: settings } });
  vm.runInContext(source.slice(
    sourceIndex(source, 'function nav('),
    sourceIndex(source, 'function closePublicMenu('),
  ), context);
  return context;
}

test('About opens a collapsed artist menu in the requested order using existing profile routes', () => {
  const html = setup().nav();
  const menu = html.match(/<details\b([^>]*)>([\s\S]*?)<\/details>/);
  assert.ok(menu, 'About is a disclosure');
  assert.doesNotMatch(menu[1], /\bopen(?:\s|=|$)/);
  assert.match(menu[2], /<summary\b[^>]*>[\s\S]*About[\s\S]*<\/summary>/);
  assert.deepEqual(Array.from(menu[2].matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g), row => [row[2], row[1]]), [
    ['AUAUSAVE', '#/AUAUSAVE'],
    ['AUAU', '#/AUAU'],
    ['SAVE', '#/SAVE'],
    ['MHIIPREAW', '#/MhiiPraew'],
  ]);
  assert.ok(html.indexOf('About') < html.indexOf('Schedule'));
  assert.doesNotMatch(html, /href="#artists"/);
});

test('Home is the first navigation item and links back to the existing home route', () => {
  const context = setup();
  const links = context.nav().split('id="public-navigation">')[1];
  assert.match(links, /^\s*<a\b[^>]*href="#home"[^>]*>Home<\/a>/);
  assert.ok(links.indexOf('Home') < links.indexOf('About'));
  assert.match(context.nav('home'), /<a\b[^>]*class="active"[^>]*href="#home"/);
  assert.doesNotMatch(context.nav('projects'), /<a\b[^>]*class="active"[^>]*href="#home"/);
});

test('About is independently visible by default even if the previous AuauSave link was hidden', () => {
  const context = setup({ publicMenuVisibility: { artists: false, projects: false } });
  vm.runInContext(source.slice(
    sourceIndex(source, 'const PUBLIC_MENU_ITEMS ='),
    sourceIndex(source, 'const navBeforeVisibilitySettings ='),
  ), context);
  const visibility = context.ensurePublicMenuSettings();
  assert.equal(visibility.home, true);
  assert.equal(visibility.about, true);
  assert.equal(visibility.projects, false);
  assert.equal(visibility.artists, false);
  visibility.about = false;
  assert.equal(context.ensurePublicMenuSettings().about, false);
});
