# Analytics implementation

Approved design: outputs/analytics-draft/analytics-draft.png and the user's “โอเค เอาตามนี้”. Implement in the current served checkout.

- [x] Add an isolated Analytics module with monthly summary, daily visitors and per-menu counts; retain the existing admin shell and authentication.
- [x] Track public route changes once per navigation, not hydration/re-render. Ignore admin, localhost and signed-in admins. Use a random browser ID; tolerate unavailable storage. No names, emails, IPs or full URLs in analytics records.
- [x] Prepare Supabase storage and RPCs: server timestamps, idempotent event IDs, allowed page keys, private raw data and an explicit reader allowlist. Monthly aggregation in Asia/Bangkok without the REST row limit.
- [x] Test frontend navigation, storage failure, month handling, empty/error states and stale responses; verify desktop/mobile in an isolated fixture. SQL integration tests passed, including anonymous collection and authenticated reporting.
- [x] Apply the additive database migration, verify in a rolled-back transaction, and document deployment and reader access.

Files: analytics.js, analytics.css, index.html, app.js, Supabase migration, tests/analytics.cjs, tests/analytics-database.sql and a local browser fixture.
The owner subsequently authorized Git deployment to `https://auausaveth.com/` on 2026-10-15. Public collection begins when GitHub Pages publishes the updated frontend. The localhost admin reads the production report but local visits are excluded.

On 2026-10-15 the owner explicitly approved installation and access for all existing admin accounts after the initial automatic approval rejection. The migration was then applied successfully, with the three existing confirmed accounts added as readers. Anonymous collection, report authorization and rollback of test data were verified. Future admin onboarding must add an explicit reader entry; no access is granted automatically to future signups.
