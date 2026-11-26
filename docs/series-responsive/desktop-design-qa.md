# Series desktop detail and creator footer — 26 November 2026

> Follow-up: the Load more button now has no numeric caption, per the user's preference. It still reveals eight items at a time.

> Related now defaults to OST in desktop Overview and the Related tab on all screen sizes. Series without OST default to All. Desktop and responsive browser suites pass with the updated filter behavior.

## Delivered

Desktop Series Detail now has a scoped variant at **>=1024px**. It uses the same API records, computed status, theme validation, configured three-button settings and TV/UNCUT visibility as mobile.

- Themed header/series selector/banner/hero, 1120px maximum content width, uncropped 4:1 banner, 400px right column, main action plus labelled 46px icon actions.
- True Overview / Episodes / Related tabs with real counts, local hashes, keyboard navigation and browser-history restoration. Tab selection stays synchronized when crossing the 1024px breakpoint.
- Overview has synopsis/cast, four episode previews, and eight initially visible related cards. The full Episodes tab has all episodes and a working oldest/newest toggle. Completed series begin oldest-first; airing series begin newest-first.
- Episode cards retain 208px 16:9 thumbnails, consistent actual platform button names, two-line synopsis previews and inline full synopsis. Keyword lines are removed; hashtags appear only with the expanded synopsis. Cards stretch to equal heights within each row.
- Related cards use four columns at >=1280px and three at 1024–1279px. Actual populated categories appear beside the heading. Both related contexts page by eight with a current/total label. Valid-source cards are a single link; records without a usable source remain noninteractive rather than receiving fabricated links.
- A common **Series-only** footer matches the supplied creator-credit design, including three real creator links on one row on mobile, copyright and MADE FOR EVERY FAN. Other pages' footer remains unchanged.

## Files

| File | Responsibility |
| --- | --- |
| `series/components/desktop-detail.js` | Desktop rendering, previews, filters/paging, inline synopsis, sort and tab bindings |
| `series/styles/desktop-detail.css` | Scoped desktop theme/layout and common responsive Series footer |
| `series/components/detail-footer.js` | Creator-credit markup shared across Series screen sizes |
| `series/pages/series-pages.js` | Desktop/mobile composition, footer selection and combined cleanup |
| `series/components/responsive-detail.js` | Removes the replaced inner footer and emits a root tab-state event; mobile content markup otherwise unchanged |
| `index.html` | Ordered new assets and updated cache keys |
| `series/assets/icons/heart.svg`, `external.svg` | Standard Tabler icons under the existing MIT license |
| `tests/series-desktop.cjs`, `series-desktop.browser.mjs` | Desktop rendering/interaction regression checks |
| Existing asset-order and clean-route integration tests | New module dependency expectations |

No API contract, schema, stored record or admin editor changes were needed for this desktop task.

## Verification

- **168 Node tests passed**, with no whitespace errors from `git diff --check`.
- Desktop browser suite passed at **1024, 1280, 1440 and 1920px**: container/banner/column sizing, preview counts, true tabs/hash/back-forward/keyboard, related filtering/paging, synopsis, ordering/labels, sticky tabs, navigation dropdown, footer, shared themes and cross-breakpoint state.
- Existing responsive browser suite passed, including touch swipes, native scrolling, three-button editor payloads and route cleanup.
- A before/after comparison of **mobile DOM and bounding rectangles** at **375, 390, 430, 768 and 1023px**, across all three tabs, is exact. The explicitly replaced footer and insignificant inter-tag whitespace are excluded. No horizontal page overflow was found.
- Actual public snapshot checks include Mr.Fanboy (**COMPLETED**), The D Dorm (**ON AIR**) and Your Sky Series (missing theme values, correctly using **#1C1A22 / #E8D49B**).
- Compared the supplied desktop reference alongside the 1440px rendered Overview, and the supplied mobile footer alongside the rendered footer. Inspected desktop 1024px, Related tab and footer variants in the same initial batch; one correction batch aligned episode-card heights and fixed hover/focus foreground colors affected by global link styles.
- A new hover assertion first reproduced the incorrect main-action foreground and then passed with the scoped override.
- One independent read-only review found no blocking issue and independently passed 13 desktop/route integration checks.

## Data-dependent differences from the references

The current Mr.Fanboy record has **44 related records**, not the mockup's 50+. User-saved TV/UNCUT visibility and custom buttons are honored. The latest actual banner and full authored synopsis are retained. Missing genre metadata is omitted rather than hardcoding Drama. The first real episode has an additional YouTube link, so its action row may wrap while retaining the requested 208px thumbnail.

These differences explain changes in page height versus the abbreviated mockup while retaining its visual hierarchy and requested tokens.

## Evidence and preview

Evidence is in `outputs/series-desktop/`: the public snapshot, mobile before/after records and images, four desktop-width captures, two additional archive variants, `reference-desktop-comparison.png`, `reference-footer-comparison.png`, and test output.

Local entry: `http://127.0.0.1:5500/#series/mr-fanboy-series`. The application canonicalizes the URL after loading. View it at >=1024px for the desktop variant.

Browser checks used installed Windows Chrome. Physical iOS/Safari testing was not run. The change is available for local review and has not been deployed in this task.
