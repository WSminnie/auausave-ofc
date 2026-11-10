# Clean URL implementation plan

> Execution: inline with one fresh-context final review.

**Goal:** Remove route hashes from the existing website while preserving legacy links, artist tabs, Series loading, authentication, analytics and browser history.

**Architecture:** Extend the existing PublicRoutes module to map known routes to same-origin paths and handle client navigation through History API. Keep current rendering identifiers and templates compatible. Use existing static entry redirects for top-level pages and a validated GitHub Pages 404 entry for dynamic detail links.

**Constraints:** Keep the current GitHub Pages host and all UI/data unchanged. Do not rewrite external links, modifier clicks, downloads or ordinary fragment anchors. Unknown routes must remain 404s. Preserve query parameters. Keep authentication checks tied to the current route.

## Tasks

- [x] Add failing route, legacy-link, static-entry, analytics and async-navigation regression checks.
- [x] Extend PublicRoutes and connect router/history, artist-tab history, Series cancellation and admin route guards. Normalize rendered internal links without changing public menu visibility behavior.
- [x] Add static page entries and safe dynamic-route fallback. Verify navigation, direct loads, reloads, Back/Forward, modified clicks and admin login using isolated browser data.
- [ ] Run the complete suite, refresh asset versions, commit only this change, deploy to the existing Pages branch and verify the live routes.

## Review focus

1. A late Series/auth response must not overwrite the next page.
2. A direct project/Series link must survive static-host refresh and preserve query parameters.
3. Artist tab navigation must preserve mounted content and selected tab through Back/Forward.
4. Analytics must classify clean paths and continue excluding admin/unknown paths.
5. External links and non-route anchors must retain native browser behavior.

## Verification record

- Full Node test suite: 136 passed, 0 failed.
- Isolated Edge browser: 16 groups passed, including direct entry and refresh on nine paths, legacy URLs, navigation/history, retained artist DOM, login, Series management/editor, 404 recovery, menu visibility and native link behavior.
- Fresh-context final review identified clean-admin Series guards, late authentication error rendering and artist history remounting. All three fixed with regression coverage; authentication and Series guards were observed failing before fixes. Artist history preserves mounted nodes only on popstate so data hydration still renders fresh content.
- Production deployment and live routing verification follow this commit. No database schema/data changes.
