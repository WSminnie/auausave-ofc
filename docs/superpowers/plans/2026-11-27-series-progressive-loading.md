# Series Progressive Loading Implementation Plan

> Execute inline with superpowers:executing-plans; one fresh-context review at the end.

**Goal:** Show useful Series content without waiting for unrelated public hydration or every child collection, including cold/expired-cache visits.

**Architecture:** Extend the existing public detail cache with isolated progress subscriptions. Publish parent immediately, then core (cast/official links), episodes with their links, and Related independently. The page renders explicit pending/error regions, preserves controls/focus/scroll while filling data, and retains route guards. Keep the full-detail API compatible. Load Series editor scripts on demand. Generate a complete /series/ entry from the root document rather than redirecting through root.

**Evidence:** Live investigation in outputs/series-live-investigation: direct entry 4320ms, warm 156ms, expired 1410ms/eight requests; holding Media prevented even the heading from appearing.

## Constraints and rulings

- Preserve final layout/content/themes, tabs/history, user-selected filters/sort/accordion and scroll position across progress. Loading is not an empty-data state; show unknown counts until known.
- Public memory cache remains 30 seconds with existing generation/client/expiry provenance and mutation invalidation. Failed partial data is retryable and is not cached as successful empty data.
- A failed Related collection cannot remove a loaded Hero or Episodes. Retry must not navigate away or accept stale route responses.
- Global database hydration continues for common menu settings/other pages; Series can reveal when its own content is usable and refresh navigation without restarting its data request.
- Shared header remains unchanged. Header observers must clean up when progressive renders rebind controllers.
- Lazy admin loading preserves file order, coalesces callers, checks active admin route after loading, and retries failed downloads without duplicating loaded scripts. No change to auth/RLS or stored data.
- A generated Series entry removes the JavaScript redirect; GitHub Pages may still canonicalize /series to /series/ with its existing HTTP 301.
- Source and referenced runtime copies stay aligned. Existing unrelated workspace files remain untouched. No database migration or production write is required.

## Tasks

- [x] Add failing progress/failure/cache regressions; implement independent API groups.
- [x] Implement staged page filling and state preservation; test slow/failing collections and navigation away.
- [x] Lazy-load Series admin modules and generate direct Series entry; validate admin forms and entry assets.
- [x] Run full tests and browser regressions, measure cold/expired/gated data behavior at desktop/mobile.
- [x] Fresh-context review, one correction pass if needed, then handoff evidence.

## Execution evidence

207 Node tests pass. The API progress/failure tests failed before implementation. Separate review regressions reproduced the hydration state reset, renewed retry TTL, premature retry, missing mobile recovery, lost focus, and A → B → A stall; the corrected progressive browser suite passes. Existing desktop and responsive browser suites also pass. Measurements and scope are recorded in `docs/series-progressive-loading-qa.md`.

Final review: `/root/review_progressive_loading`, read-only fresh context. Six Important findings corrected in one correction pass. Three smaller findings (busy state, physical index route, terminal-state visibility) affect accessibility/loading and were corrected with route/terminal regression coverage. Declined to judge: none. Deferred findings: none.

Implementation decision: a failed section's retry is disabled while other Series sections are still in flight, then becomes available when they settle. This prevents resubscribing to an unchanged pending request. Successful sections retain their original 30-second freshness window. No deployment or production data mutation was performed.
