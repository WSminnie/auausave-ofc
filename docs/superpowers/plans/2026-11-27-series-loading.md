# Series Loading Implementation Plan

> Execute inline using superpowers:executing-plans; one fresh-context read-only review at the end.

**Goal:** Remove redundant public Series loading and repeat-navigation requests without changing published data, admin freshness or routing behavior.

**Architecture:** An in-memory 30-second public list/detail cache coalesces pending reads and returns isolated values to consumers. Admin list reads stay fresh. Successful list summaries can seed the selected detail so its parent is not fetched again. Every API mutation clears public caches before and after; errors are not cached; client replacement isolates cached data. Existing page request guards remain authoritative.

**Evidence:** `outputs/series-loading/before-profile.json`: first navigation 2829ms, repeat 953ms; duplicate Series detail/cast/media/episode requests during hydration/routing.

**Spec:** User screenshot of “Loading series…” and request to investigate/fix the delay, 27 Nov 2026.

## Rulings

- Public-only, memory-only cache: no persistent storage, no admin-list caching, no schema/RLS changes.
- TTL is 30 seconds from successful read. Missing detail may be cached for the same brief TTL; failures retry normally.
- Cache results must be isolated so sorting, link attachment or consumer edits cannot corrupt a subsequent read.
- Clearing on mutation also detaches any older pending request; its late response cannot refill the cleared cache.
- A detail may use a supplied published summary only when its slug matches. Child tables still use the existing RLS/filter/pagination logic.
- Keep previous page content during pending navigation, existing stale-route guards and retry behavior. No artificial minimum loading time.
- Existing workspace and prior changes retained; no database writes, commit, push or deployment.

## Tasks

- [x] Reproduce and measure actual public cold/repeat requests.
- [x] Write failing regressions for coalescing/TTL/errors/client isolation, admin bypass, cache invalidation and summary reuse.
- [x] Implement the public cache and page summary handoff; update asset versions/runtime copies.
- [x] Verify full tests, delayed navigation/retry behavior, actual public timing/request counts and visual page.
- [x] Fresh-context review and record limitations/results.

Review ruling: only reuse a known summary when its internal generation/client/expiry metadata is current; matching slug/visibility alone is insufficient after an in-flight mutation. Exact regression observed red then green.
