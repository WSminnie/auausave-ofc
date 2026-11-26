# Series Desktop Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the supplied desktop Series Detail refinement at >=1024px and the supplied branded footer at mobile sizes, preserving all other mobile/tablet content and behavior.

**Architecture:** Add an independently scoped `desktop-detail.js` / `desktop-detail.css` variant. Reuse `detailView.status`, `theme`, `buttons`, `watchLink` and existing API records. Keep the mobile markup intact except its replaced footer; a root tab-change event synchronizes desktop/local hashes through the existing route guard. A shared Series-only footer replaces both the old inner mobile footer and external desktop footer on detail routes. Legacy shared components retain their defaults.

**Tech Stack:** Existing vanilla JS/classic script order, scoped CSS media queries, Node tests and installed Chrome/Playwright. No schema or backend changes.

- [x] Capture actual public data, current mobile/tablet markup and geometry at 375/390/430/768/1023 before edits. Inspect the desktop/mobile references and existing footer markup.
- [x] Write failing tests for desktop preview limits, safe full-card links, button/status reuse, compact episode actions, conditional metadata and common creator footer.
- [x] Add desktop render/bind module: themed hero, 3 true tabs/counts, overview synopsis/cast, first 4 episodes, full sortable episode tab, related filters/8-item paging in overview and full tab, inline synopsis expansion.
- [x] Add scoped desktop stylesheet at >=1024: max1120 containers, 400px hero/cast column, 208px episode thumbnails, 4/3 related columns, sticky tabs and accessible focus. Add Series-only responsive creator footer matching the supplied reference.
- [x] Integrate the variant and tab-state event, retaining all existing mobile interactions, custom buttons, broadcast visibility and route cleanup. Update entry asset cache keys/order tests.
- [x] Verify 1024/1280/1440/1920 plus all mobile baseline widths, actual Completed/On Air and no-theme archives; inspect batched screenshots against the references; run Node/browser checks and one independent review.
- [x] Document changed files, evidence, intentional data-dependent differences and any device-testing limits; keep local preview available.

## Rulings

- User-saved button overrides and TV/UNCUT visibility remain authoritative. Sample labels/colors/counts do not override actual records; missing genre metadata is omitted rather than invented.
- Existing data without a usable source URL renders as an honest noninteractive card; do not fabricate an href or silently drop records.
- Footer changes are limited to Series Detail, matching the request's scope. Its three creator links remain on one row on mobile as in the supplied reference.
- Use the established checkout and local servers for review. Do not deploy this desktop change unless requested.

## Execution record

- Desktop feature tests were observed failing while the new module/footer were absent, then all four passed. Full Node suite: 168 passed.
- Browser suites passed all four desktop widths and the existing responsive flow. Before/after mobile DOM and geometry match exactly at five widths, all three tabs, excluding only the allowed footer.
- A root tab-change event bridges the existing responsive history coordinator with the independent desktop panels; no duplicate fetch is needed for tab history or resizing.
- Visual comparison uses actual records, preserving the user's configured buttons and hidden broadcast blocks. One bounded correction pass equalized episode row heights and fixed the reproduced global-hover foreground regression.
- Independent review: no blockers. See `docs/series-responsive/desktop-design-qa.md` for changed files, evidence, data differences and device-testing limits.
