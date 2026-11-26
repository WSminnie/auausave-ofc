# Series Responsive Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the supplied three Series Detail mobile designs, tablet variants and accessible interactions while retaining desktop geometry and existing data contracts.

**Architecture:** Keep incumbent desktop components intact and render a separately scoped responsive detail variant below 1024px. One additive component module owns derived status/theme/actions, responsive markup and bindings; a scoped stylesheet owns the new visual world. The page renderer supplies the existing public API records and binds both variants. A narrow router guard restores Series hash tabs without rebuilding the page on back/forward.

**Tech Stack:** Existing classic JavaScript modules, vanilla DOM, CSS media queries, native links/buttons, existing SeriesFeature API, Node tests and Playwright with actual installed Chrome. No schema writes or new dependencies.

- [x] Capture existing public data and desktop/mobile geometry before changes; inspect supplied spec and all three references.
- [x] Add tests for safe theme fallbacks, final-date-derived status (without assuming a partial episode list is finished), official-link selection, related category ordering/paging and escaping.
- [x] Add `series/components/responsive-detail.js`: independently scoped hero, actual hash tabs, overview/read-more/cast/highlight/latest content, sorted single-open episode accordion and related 8-item paging. Reuse all public records and image URLs.
- [x] Add `series/styles/responsive-detail.css`: mobile dark header/hero, 4:1 uncropped banner, sticky three-column navigation, two-column cards, tablet 4/2/3 column grids, safe areas and focus/contrast rules. At desktop only theme/status differences apply.
- [x] Integrate renderer/cleanup and local-hash restoration; preserve other routes and legacy Series links. Add optional full status label to the detail hero without changing shared cards/admin.
- [x] Verify six required widths (375,390,430,768,1024,1440), two status states, missing themes/links/content, touch/keyboard, browser history/direct hashes, resizing, filtering/paging, accordion and desktop before/after geometry. Use public snapshots for visual QA and isolated fixtures for assertions.
- [x] Document backend follow-up: add optional `theme_bg`/`theme_accent` columns and editor controls/RPC handling separately; existing select-* reader already carries them through. No database changes in this task.
- [x] Request one focused independent review after checks; fix important findings, provide local preview and concise handoff with changed files/backend notes.

## Execution record

- Ruling: Preserve the established local checkout/server for the requested review URL; no new worktree or deployment is needed for this local implementation.
- Ruling: Explicit written requirements take precedence over abbreviated mockup copy and smaller mockup touch targets. Existing API content and complete episode descriptions remain intact.
- Ruling: Future theme fields stay backend follow-up; do not hardcode colors by series slug or write schema changes. Use existing public image assets and locally vendored standard icons.
- Initial feature tests failed while the module was absent, then passed after implementation. One existing route integration fixture needed the new detail-view dependency; its production behavior remained unchanged.
- Review regressions were reproduced before fixes: stale sort text after icon replacement and stale menu label after Escape. Browser coverage now asserts both.
- Additional sticky-position check exposed the site's existing body overflow creating a scroll container; a Series-only `overflow-x: clip` override fixes it while preserving menu scroll locking.
- Final evidence and backend notes: `docs/series-responsive/design-qa.md`. Desktop geometry matches baseline; portable and actual-public-data browser checks pass.
