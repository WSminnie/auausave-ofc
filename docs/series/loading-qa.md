# Series loading investigation and fix

Final result: passed. 27 November 2026. Local only; no database writes, schema changes, commit or deployment.

## Cause and change

`series/pages/series-pages.js` is called repeatedly during initial routing and public-data hydration. Each call previously fetched the full Series list, fetched the selected parent again, then loaded six child collections and episode links. Re-entering Series repeated all of that work. The page's request guard correctly prevented stale rendering but did not prevent redundant network traffic.

`series/services/series-api.js` now coalesces pending public list/detail reads and keeps successful results in memory for 30 seconds. Each caller receives a clone. Admin list reads remain uncached; errors are evicted for retry. Existing API mutations invalidate before and after the operation, and client changes isolate cache entries. Data edited from another browser/tab may take up to the short TTL to appear in this tab.

The page passes the selected list record into detail loading to avoid a second parent query. Reuse requires internal provenance (current cache generation, client and expiry), matching slug and published visibility. An older pending list cannot seed stale parent details after a mutation. Child publication filters, RLS, pagination and link batching are unchanged.

## Actual public-load measurements

Headless Chrome, fresh contexts, existing localhost 5500 and actual public API, without an authenticated session. Cold means navigation until the visible detail heading; repeat means Home → Series. These are local samples, not fixed latency guarantees, and cold navigation includes asset/network loading.

| Sample | Cold | Repeat |
|---|---:|---:|
| Before | 2829ms | 953ms |
| After, final clean sample | 2373ms | 198ms |

Before: four duplicate initial detail groups and one additional group on re-entry (five cast reads total); ten parent reads across both visits. After: one detail group and one parent read total, with no Series request on re-entry. One intermediate sample was disturbed by a local development-server reload and is retained separately; it is not used for the comparison.

Evidence: `outputs/series-loading/before-profile.json`, `second-profile.json` and `profile.cjs`. Initial loads still require the network; the fix removes duplicate work and repeat fetches rather than adding an artificial loading delay.

## Verification

- Nine new behavior tests: pending-read coalescing, 30-second expiry, isolated consumer values, admin bypass, retry after errors, all mutation invalidations, late-response detachment, valid summary reuse and client replacement.
- Fresh-context review reproduced an old-list-after-mutation summary race. Added its exact regression, observed failure, fixed generation/client/expiry provenance, then observed pass.
- Full Node suite: 198 passed, 0 failed.
- Existing responsive and desktop Series browser suites passed, including delayed navigation, route guards, tabs/history, filtering/paging, admin fixture payloads, cross-breakpoint state and cleanup.
- `git diff --check` and runtime mirror hashes checked before handoff.
- Supabase's current SELECT documentation and changelog were consulted; no new backend/API feature or migration is introduced.

## Files

- `series/services/series-api.js`: public read cache/coalescing and invalidation.
- `series/pages/series-pages.js`: hand off the known summary.
- `index.html`: cache versions for both scripts.
- Corresponding `dist/client` runtime copies.
- `tests/series-loading.cjs`: regressions; plan in `docs/superpowers/plans/2026-11-27-series-loading.md`.
