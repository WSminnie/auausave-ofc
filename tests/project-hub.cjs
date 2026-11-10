const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { sourceIndex } = require('./source-section.cjs');

const source = fs.readFileSync('app.js', 'utf8');
const hubSource = source.slice(
  sourceIndex(source, 'function projectHubSimpleCard('),
  sourceIndex(source, 'async function refreshPersonalProjectCardCount('),
);
const sections = [
  { id: 'projects', title: 'Projects' },
  { id: 'food', title: 'Food Support Queue' },
  { id: 'past', title: 'Past campaigns' },
];
function project(id, overrides = {}) {
  return { id, slug: id, title: id, sectionId: 'projects', status: 'active', ...overrides };
}
function render(items, sectionList = sections) {
  const refreshed = [];
  const context = vm.createContext({
    db: { siteSettings: { projects: { sections: sectionList, items } } },
    app: { innerHTML: '' },
    ensureProjectSettings() {},
    nav: () => '<nav>Navigation</nav>',
    footer: () => '<footer>Footer</footer>',
    escapePageText: value => String(value),
    projectSummaryMoney: value => `฿${Number(value) || 0}`,
    refreshProjectCardTotal: item => refreshed.push(item.id),
    refreshPersonalProjectCardCount: item => refreshed.push(item.id),
    refreshFoodProjectCardTotal: item => refreshed.push(item.id),
  });
  vm.runInContext(hubSource, context);
  context.projectHubPage();
  const groups = Array.from(context.app.innerHTML.matchAll(
    /<section class="project-type-group">([\s\S]*?)<\/section>/g,
  ), match => ({
    title: /<b>(.*?)<\/b>/.exec(match[1])[1],
    slugs: Array.from(match[1].matchAll(/href="#project\/([^"]+)"/g), card => card[1]),
    html: match[1],
  }));
  return { html: context.app.innerHTML, groups, refreshed };
}

test('closed projects from every section appear once at the end in actual closure order', () => {
  const items = [
    project('active-donation'),
    project('old', { status: 'closed', closedAt: '2026-02-01T12:00:00+07:00', createdAt: '2026-12-01' }),
    project('active-food', { sectionId: 'food', projectType: 'foodSupportQueue' }),
    project('latest', { sectionId: 'food', projectType: 'personalSupportQueue', status: 'closed', closedAt: '2026-11-10T04:00:00Z', createdAt: '2025-01-01' }),
    project('middle', { sectionId: 'past', status: 'closed', closedAt: '2026-11-10T10:00:00+07:00' }),
  ];
  const before = JSON.stringify(items);
  const { groups, html } = render(items);
  assert.deepEqual(groups.map(group => [group.title, group.slugs]), [
    ['Projects', ['active-donation']],
    ['Food Support Queue', ['active-food']],
    ['Closed Projects', ['latest', 'middle', 'old']],
  ]);
  assert.equal((html.match(/class="project-closed-badge">PROJECT CLOSED/g) || []).length, 3);
  assert.equal(JSON.stringify(items), before, 'render must not move or reorder stored projects');
});

test('missing and invalid closure dates go last without using creation or update dates', () => {
  const { groups } = render([
    project('missing', { status: 'closed', createdAt: '2099-12-31', updatedAt: '2099-12-31' }),
    project('invalid', { status: 'closed', closedAt: 'invalid' }),
    project('dated', { status: 'closed', closedAt: '2026-01-01' }),
    project('same-date', { status: 'closed', closedAt: '2026-01-01' }),
  ]);
  assert.deepEqual(groups.map(group => [group.title, group.slugs]), [
    ['Closed Projects', ['dated', 'same-date', 'missing', 'invalid']],
  ]);
});

test('hidden and unassigned projects stay unpublished and active order stays unchanged', () => {
  const { groups, html } = render([
    project('second'),
    project('first', { status: 'upcoming' }),
    project('hidden-closed', { visible: false, status: 'closed' }),
    project('unassigned-closed', { sectionId: '', status: 'closed' }),
    project('removed-section', { sectionId: 'removed', status: 'closed' }),
  ]);
  assert.deepEqual(groups.map(group => [group.title, group.slugs]), [
    ['Projects', ['second', 'first']],
  ]);
  assert.doesNotMatch(html, /Closed Projects|#project\/(?:hidden|unassigned|removed)/);
});

test('only active cards refresh live totals and queue counts', () => {
  const { refreshed } = render([
    project('donation', { sheetUrl: 'fixture' }),
    project('personal', { projectType: 'personalSupportQueue' }),
    project('combined', { projectType: 'foodSupportQueue' }),
    ...['donation', 'personalSupportQueue', 'foodSupportQueue'].map((projectType, i) =>
      project(`closed-${i}`, { projectType, status: 'closed', sheetUrl: 'fixture', closedAt: '2026-01-01' })),
  ]);
  assert.deepEqual(refreshed, ['donation', 'personal', 'combined']);
});

test('one and two card sections reuse the same container, section and grid markup', () => {
  const { html, groups } = render([
    project('one'),
    project('closed-one', { status: 'closed', closedAt: '2026-02-01' }),
    project('closed-two', { status: 'closed', closedAt: '2026-01-01' }),
  ]);
  assert.match(html, /class="container project-type-groups"/);
  assert.deepEqual(groups.map(group => group.slugs.length), [1, 2]);
  groups.forEach(group => assert.match(group.html, /class="project-hub-grid food-project-hub-grid"/));
  assert.equal((html.match(/class="project-hub-card project-simple-card /g) || []).length, 3);
  assert.doesNotMatch(html, /style=/);
});

test('closed projects start collapsed with a native keyboard-accessible disclosure', () => {
  const { groups } = render([
    project('active'),
    project('closed', { status: 'closed', closedAt: '2026-01-01' }),
  ]);
  const active = groups.find(group => group.title === 'Projects');
  const closed = groups.find(group => group.title === 'Closed Projects');
  assert.doesNotMatch(active.html, /<details/);
  const disclosure = closed.html.match(/<details\b([^>]*)>/);
  assert.ok(disclosure, 'closed cards must be inside a disclosure');
  assert.doesNotMatch(disclosure[1], /\bopen(?:\s|=|$)/, 'default must be collapsed');
  assert.match(closed.html, /<summary\b[^>]*>[\s\S]*Closed Projects[\s\S]*<\/summary>/);
  assert.match(closed.html, /<\/summary>[\s\S]*href="#project\/closed"[\s\S]*<\/details>/);
});
