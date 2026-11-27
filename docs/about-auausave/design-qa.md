# About AUAUSAVE — design QA

Final result: passed. Local implementation, 27 November 2026; no commit, push, deployment or database writes.

## Sources and implementation

- User references: `D:/Users/warintorn.sak/Downloads/10 · About AUAUSAVE (Desktop)@2x.png` (2880×4880) and `9 · About AUAUSAVE (Mobile)@2x.png` (780×5400).
- Local entry: `http://127.0.0.1:5500/#/AUAUSAVE`.
- Existing renderer: `coupleArchivePage()` in `app.js`, enhanced after the final profile/builder wrappers by `couple-overview.js`. Existing Journey, navigation and footer renderers/styles are unchanged.
- Sources: `db.awards` plus `siteSettings.awardDates/awardImages`; `siteSettings.timeline` for shared series; `db.presenters` for brands; `publicOrderedEvents()` for Schedule; published, assigned `siteSettings.projects.items` for Projects. No additional production requests.
- Snapshot values: 5 aired shared series, 7 unique partner brands in 2026, 1 award, first shared series in 2024. The reference's example counts are not hardcoded. Upcoming/future series and cancelled/postponed/rescheduled events are excluded from the new summaries only.

## Visual verification

Checked 375, 390, 768, 1280 and 1920 CSS pixels. New surfaces align with the existing Journey container; visible section gaps are 48px below 768 and 96px otherwise. Mobile profile buttons share a row, Schedule spans the next row; all three links have a minimum 44px target, including tablet.

Journey HTML and container dimensions match before/after at all five widths. Navigation/footer HTML and the hero gradient match. Pixel comparisons use the original Journey subtree in its original inset container at a fixed document origin, with the production stylesheets, then add the new scoped stylesheet. Each capture waits for two consecutive equal screenshots after image decoding to avoid Chromium poster-raster settling differences. Decoded before/after pixel buffers match at all five widths. This is a component comparison; full-page absolute coordinates intentionally change when Highlights is inserted above Journey. Evidence: `outputs/about-auausave/pixel-check.json` and `before-journey-*.png` / `after-journey-*.png`.

Compared normalized supplied mobile/desktop references with local captures in `outputs/about-auausave/mobile-comparison.png` and `desktop-comparison.png`. Live localhost also inspected in the in-app browser; proof screenshots are `live-desktop.jpg` and `live-mobile.jpg`. Header/footer, original desktop hero geometry and Journey retain the site's existing design.

Intentional accessibility resolutions: source-link text uses #B63842 (5.78:1 on white) instead of reference #E0525A. Schedule uses its existing deeper hover shade #B94D50 for white-text contrast 4.95:1; pill shape and button family remain. Mobile restores the original full-size arched image and pill shapes while replacing the old compact thumbnail layout. The trophy is decorative inline SVG; award photo has the requested alt text; real links, visible focus states and no nested anchors.

## Functional verification

- `node --test tests/*.cjs`: 184 passed, 0 failed.
- Five-width browser checks: no horizontal page overflow, aligned containers, exact section gaps, real data summaries, title/button layout, latest award placement, lower Awards removal, and working original Journey filters.
- Empty Schedule fixture renders “See all events”; additional-award fixture renders a separate “+1 more” Awards link. Navigating to a solo profile removes pair-only additions. Fixtures are isolated; production data is not changed.
- Unit checks cover deduplication, current-year/date boundaries, upcoming series, latest awards, empty collections and escaping/unsafe sources.
- Fresh-context review found shared master series IDs collapsing distinct timeline records and postponed events appearing as Next; both were corrected and regression-tested. No remaining important findings.
- `git diff --check` passed. Runtime files and SVGs match their `dist/client` copies.

## Files

- `couple-overview.js`: derived data, compact latest award, Highlights, Explore and final profile enhancement.
- `couple-overview.css`: scoped responsive additions.
- `index.html`: load the two additions after existing profile wrappers.
- `series/assets/icons/trophy.svg`, `arrow-right.svg`: Tabler v3.51.0 MIT assets; existing license retained.
- `tests/couple-overview.cjs`, `tests/entry-assets.cjs`: meaningful model regressions and entry-asset validation.
- Matching runtime copies in `dist/client`; implementation plan in `docs/superpowers/plans/2026-11-27-about-auausave.md`.

No schema or stored content changes. Main Awards page and award records remain intact. The optional lower Awards restoration for 3+ awards is not used.
