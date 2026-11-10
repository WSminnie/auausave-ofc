const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const routes = require('../public-routes.js');

function redirects(file, href) {
  const current = new URL(href), calls = [];
  const location = Object.assign({}, ...['href', 'origin', 'pathname', 'search', 'hash'].map(key => ({ [key]: current[key] })), { replace: value => calls.push(String(value)) });
  const context = vm.createContext({ URL, location, PublicRoutes: routes });
  context.window = context;
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (!/\bsrc=/.test(match[1])) vm.runInContext(match[2], context);
  }
  return calls;
}
test('top-level static entries load the shared app and restore clean URLs with query parameters', () => {
  for (const page of ['projects', 'presenters', 'awards', 'artists', 'series', 'schedule', 'admin', 'auausave']) {
    const href = `https://auausaveth.com/${page}?utm_source=test`;
    const calls = redirects(`${page}/index.html`, href);
    assert.equal(calls.length, 1, page);
    assert.equal(routes.canonicalHref(calls[0]), href, page);
  }
});
test('GitHub Pages fallback recovers dynamic details without changing the final shared URL', () => {
  for (const path of ['/project/final-episode', '/series/mr-fanboy', '/artist/custom-id']) {
    const href = `https://auausaveth.com${path}?utm_source=test`;
    const calls = redirects('404.html', href);
    assert.equal(calls.length, 1);
    assert.equal(new URL(calls[0]).pathname, '/');
    assert.equal(routes.canonicalHref(calls[0]), href);
  }
  assert.deepEqual(redirects('404.html', 'https://auausaveth.com/unknown'), []);
});
