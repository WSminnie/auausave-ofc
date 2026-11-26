# Series Detail responsive redesign — 26 November 2026

> Follow-up: color fields, persisted palettes, fixed X editing, retained hero and series swipes are now implemented. See [theme-and-swipe-qa.md](theme-and-swipe-qa.md). The initial-delivery snapshot below is retained for comparison.

## Result

Implemented the three supplied mobile references as a scoped Series Detail variant. Mobile and tablet use real Overview / Episodes / Related tabs. Desktop retains its existing layout; selected-series color, detail status badge and section underline use the page theme. No database writes, deployment or unrelated page redesign was performed.

## Files

- `series/components/responsive-detail.js`: status/theme derivation, safe official actions, responsive markup, hash/history restoration, keyboard navigation, single-open episode accordion, sorting and related-content paging.
- `series/styles/responsive-detail.css`: mobile/tablet layout, scoped header/footer, safe areas, sticky tabs, typography and desktop theme overrides. `series/assets/icons/` contains vendored Tabler icons and their MIT license.
- `series/pages/series-pages.js`: renders and cleans up both variants using the same API response. `series/components/shared.js` and `series-overview.js` add an optional complete status label while preserving other consumers' defaults.
- `app.js`: narrow same-Series local-hash restoration guard. `index.html`: additive assets and updated cache keys.
- `tests/series-responsive.cjs`, `tests/series-responsive.browser.mjs`: feature checks. Existing clean-route integration stubs and stylesheet load-order expectations were updated.

## Verification

- Node suite: **157 passed, 0 failed**.
- Browser suite: **375, 390, 430, 768, 1024 and 1440px**, with no horizontal page overflow.
- Actual public data: Mr.Fanboy derives **COMPLETED** from its final episode metadata/date; The D Dorm remains **ON AIR** because its partial episode list has no finale marker. Mr.Fanboy currently has **12 episodes and 44 related records**.
- Tabs, direct hashes, browser back/forward, arrow/Home/End keys, sticky position below the 56px header, read-more, focus after overview shortcuts, single-open accordion, both sort directions and labels, category filtering, 8-item paging, menu/Escape and route cleanup pass.
- Fixtures verify missing theme fields, custom theme fields, missing links, empty episodes/content and resizing between mobile and desktop.
- Desktop before/after bounding rectangles match **exactly** for banner, hero, navigation, overview/cast, episode list and related grid at both 1024 and 1440px.
- Actual localhost entry with the existing API loaded successfully: 12 episodes, 44 related records, Completed / Oldest first. Live Server entry URL: `http://127.0.0.1:5500/#series/mr-fanboy-series` (the application canonicalizes it after loading).
- Independent review identified a stale sort label and a stale menu accessible label after Escape; regression checks reproduced both, and both are fixed.

## Visual comparison

Compared each reference at 390 CSS pixels alongside the corresponding screenshot, plus desktop before/after captures. Evidence is in `outputs/series-responsive/compare-overview.png`, `compare-episodes.png`, `compare-related.png`, `compare-desktop-1024.png` and `compare-desktop-1440.png`.

Intentional differences from the mockups:

- Existing records have no theme fields, so the specified fallback **#1C1A22 / #E8D49B** is used instead of hardcoding Mr.Fanboy's example purple.
- Real titles, authored synopsis spacing, full expanded episode descriptions, actual image assets and actual counts are preserved. These make the page lengths differ from abbreviated mockup copy.
- Chips, secondary buttons, sorting and header links meet the requested 44px touch target, even where the visual mockup is more compact.
- Screenshot-only capture code eagerly decodes below-fold episode images for comparison. Production thumbnails retain native lazy loading; only banners are eager.

Chrome browser checks were run on the installed Windows browser. Physical iOS/Safari testing is still a separate device check.

## Backend follow-up

Add optional `theme_bg` and `theme_accent` fields to the Series archive record, corresponding admin color inputs and handling in the save RPC/validation. The current public reader uses `select('*')`, so it already carries these fields into the new renderer when available. No schema or admin form changes are needed to use the fallback immediately.

The renderer accepts safe six-digit hex values and falls back when colors are missing, invalid or do not meet the required foreground contrast. Completion uses finale/end-date metadata where supplied, explicit final markers in existing episode metadata, and the stored series status as fallback. It does not assume that the last currently entered episode is the finale.
