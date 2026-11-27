# Series loading correction — 27 November 2026

## Behavior

The published Series parent now renders immediately after the Series list. Cast/official links, Episodes with their watch links, and Related fill independently. They display explicit loading/error states instead of false zero counts or an empty archive. A failed section can be retried while successful sections remain available. Retry becomes actionable when the other Series requests settle. Partial retries cannot renew the original parent/successful-data freshness window.

Global site hydration still updates common navigation/settings, but no longer hides an already usable Series page or resets scroll, sorting, synopsis expansion or filters. Progress replacements preserve image elements and semantic keyboard focus. Route tokens prevent late responses from replacing another page, including rapid A → pending B → A navigation.

The public document loads one small Series admin loader. The 13 editor modules download in order when administration is opened, with shared concurrent loading, download retry and route/auth checks. The direct `/series/` entry is a generated copy of the app shell, removing its JavaScript redirect to `/`. GitHub Pages may still send its normal `/series` → `/series/` canonical redirect. `/series/index.html` resolves to the landing page.

## Measurements

Chrome on this workstation, local changed code on port 8765, real published read-only Supabase data, no throttling:

| Scenario | First main content | Additional evidence |
| --- | ---: | --- |
| Fresh context, direct `/series/` | 1,717 ms | One HTML document; 29 script elements; no editor module downloads |
| Return while cache is fresh | 318 ms | Zero Series API requests |
| Return after a real 31-second wait | 294 ms | All Series data settled at 858 ms; eight Series requests; zero editor module downloads |

Earlier deployed-site sample was 4,320 ms for direct `/series`, with three documents and 40 script elements. That is a different document host and network sample, so it is **not a controlled speedup percentage**. These values measure first main content, not completion of all images. Network/CDN/database delays and the remaining shared application bundle still affect cold visits.

The decisive controlled test holds Related Media and global hydration indefinitely: Hero, Synopsis and Episodes render and work before either gate is released. The previous implementation kept the heading behind Media. Loading is therefore decoupled structurally, beyond the existing 30-second cache.

Raw timing reports, screenshots and regression RED/GREEN logs are in the local ignored `outputs/series-progressive-loading/` directory. No production records were created, changed or deleted.

## Validation

- `node --test tests/*.cjs`: 207 passing tests, no failures.
- `node tests/series-desktop.browser.mjs`: 1024/1280/1440/1920px; shared header/container, true tabs/history/keyboard, preview episodes, sort/synopsis, filters/paging, themes and footer.
- `node tests/series-responsive.browser.mjs`: 375/390/430/768/1024/1440px; mobile navigation/accordion, native scrolling, delayed route completion, lazy-loaded real editor form and save payload fixture.
- `node tests/series-progressive.browser.mjs`: independent delayed/failing collections, global hydration, warm/expired cache, local retry, preserved sort/synopsis/accordion/focus/scroll, mobile core recovery, A → B → A race and no public editor downloads; no horizontal overflow from 375 to 1920px.
- Loader tests cover ordered/coalesced loading, failed download retry without duplicate successful modules, and leaving admin before completion.
- Empty/fatal states reveal independently of global hydration; physical Series index resolves correctly.
- Fresh independent review completed; all actionable findings addressed. No deferred findings.

## Files

- `series/services/series-api.js`: progress subscriptions, independent groups, failure retry and cache freshness.
- `series/pages/series-pages.js`: staged rendering, request guards, terminal reveal and header refresh.
- `series/components/progressive-detail.js`: pending/error presentation, state/image/focus preservation.
- `series/components/responsive-detail.js`: header observer refresh and pending-route restoration guard.
- `series/admin/load.js`: on-demand editor loading.
- `series/styles/series.css`: loading/error presentation and retry focus/touch targets.
- `app.js`: hydration route event and Series scroll preservation.
- `public-routes.js`: physical Series index handling.
- `index.html`, `series/index.html`, `scripts/sync-series-entry.cjs`: runtime registrations/versions and direct document generation.
- `series/README.md`, this QA report and the implementation plan: maintenance and evidence.
- Loading, loader, route and progressive-browser tests; corresponding `dist/client` runtime copies.

After changing the root document, run `node scripts/sync-series-entry.cjs` and synchronize referenced runtime copies. This correction is local; deployment is a separate step.
