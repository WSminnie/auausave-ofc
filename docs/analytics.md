# Website Analytics

Analytics is a separate admin menu directly below Dashboard. It reports approximate unique visitors, page views, the most popular menu (excluding Home), daily unique visitors and counts per menu. Detail pages roll up into their parent menu, including Artists. Reports use Asia/Bangkok and the current month stops at today.

## Deployment

1. `supabase-migration-analytics.sql` was applied to project `dgpxhhiyvohvxxntchpo` on 2026-10-15, after the owner explicitly authorized installing the collector and access for every existing admin account.
2. All three existing confirmed admin accounts were added to `analytics_private.readers`. This is a one-time snapshot, not automatic access for future signups. When creating a new admin account, a database administrator must also insert its `auth.users.id` into `analytics_private.readers`.
3. `tests/analytics-database.sql` passed against the installed database in a rolled-back transaction, including actual anonymous-role ingestion. The authenticated-role report also returned the expected empty report. No test events were retained. Adjust old fixture dates before rerunning if historical analytics now exist in those periods.
4. Deploy `index.html`, `app.js`, `analytics.js` and `analytics.css` together by pushing `main` to `WSminnie/auausave-ofc`; GitHub Pages publishes `https://auausaveth.com/`. The owner authorized this deployment on 2026-10-15. Keep the matching assets in `dist/client` synchronized. Local UI fixtures and generated previews are excluded from the deployment commit.

## Counting and storage

The collector runs only on `auausaveth.com` and `www.auausaveth.com`. Localhost visits are excluded, but authenticated local admin pages can read the live production report once configured. A random UUID in localStorage estimates distinct browsers; unavailable storage falls back to a temporary in-memory UUID. Clearing storage or using another browser/device counts as another visitor. No IP, email, name, user agent, referrer or full URL is stored in the analytics tables.

Initial page entry and actual hash changes count once. Data hydration and rerenders do not. Refresh is a new view. Admin routes and authenticated sessions are excluded. Client-side collection can be blocked and anonymous event submission can be imitated; this is approximate traffic reporting, not an audited people count. A per-visitor limit of 120 events/minute bounds accidental event loops, not determined bot traffic.

The private schema denies raw table access to web roles. An anonymous write-only RPC accepts only a random event ID, random visitor ID and a fixed page key. The server supplies timestamps; duplicate event IDs do not increment totals. The report RPC requires an explicit reader entry and returns aggregates only. Reader entries are managed by the database administrator, not by browser users. Records currently remain until an administrator applies a retention policy; no scheduled deletion is configured.

## Verification

`node --test tests/analytics.cjs` tests the collector and month handling. `node tests/prepare-analytics-browser.cjs` generates `tmp/analytics-browser.html` for local UI checks without Supabase. The fixture includes data, empty and error states and must not be deployed. SQL integration assertions passed after installation; production starts with zero events.
