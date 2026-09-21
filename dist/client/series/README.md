# Series archive

The feature uses the existing plain JavaScript application, hash router, Supabase client, login/session, sidebar, modal/form styles, image resizing/uploader and toast. No dependencies were added.

## Routes and administration

- `#series` — opens the default published Series directly, with a horizontal selector when multiple stories are published.
- `#series/<slug>` — published archive with Overview, Episodes, Appearances, Media and optional Moments.
- `#admin` → **Series Management** → Series / Episodes / Appearances / Media / Moments.

New records are hidden by default. Use the **Published / Hidden** switch on each management list row to publish; publication controls are outside the editor. Editing preserves the existing publication state. Child records also need a published parent. Blank fields and empty optional sections are omitted. Official URLs accept HTTP/HTTPS and open with `noopener noreferrer`.

Use **Set as Default** on a published Series to choose the story opened at `#series`. If that story is hidden or deleted, the first published story by display order opens instead. With one published story, the selector is omitted. The additive `20260920063306_series_default.sql` migration adds the default flag, a unique partial index and the authenticated `set_default_series` RPC; it was applied on 20 September 2026.

**Series from Master Data** in Add/Edit Series links an archive to an existing schedule series. Selecting it fills the available name, suggested slug, broadcast channels/times and ONLINE UNCUT streaming details. Thai-only names fill the Thai title; enter an English title separately. Manually edited fields are preserved. These values are editable snapshots, not a live synchronization: archive saves never update Master Data or schedules. Selecting “Enter manually” clears the link and unedited suggestions. Episode importing is not included.

The additive `20260919103643_series_master_link.sql` migration adds nullable `master_series_id` with a foreign key to the existing `series` table, an index and updated transactional save function. It was applied to the configured database. Deleting a Master row clears its link without deleting the archive. Apply this migration after the original Series migration in other environments. `admin/master-data.js` owns the form integration; `tests/series-master-database.sql` verifies persistence, independent titles and safe Master deletion using rollback-only fixtures. Nine unit tests pass, including autofill and preservation of manual edits.

Use Move up / Move down on management rows to arrange content; select a parent series before arranging its episodes, appearances, media or moments. The authenticated `reorder_series_content` RPC saves the complete ordered list atomically, rejects stale/incomplete lists and preserves episode numbers. The `20260920075155_series_content_order.sql` migration was applied. Editing preserves display order; numeric order fields are no longer shown in popups. Cast and link rows retain their own Move up / Move down controls. Series slugs and episode numbers remain unique.

Episodes use responsive horizontal rows with an expandable full synopsis. Keyword precedes Hashtag in a separate metadata block. Long official descriptions are preserved, and the editor provides a larger textarea. The Series editor uses one Banner image field; legacy cover data remains available as a fallback and is preserved on save.

## Files created

- `types.js`: entity/table metadata, enums, ordering.
- `services/series-api.js`: paginated Supabase reads, publication filters, CRUD, transactional save RPCs and existing media upload adapter.
- `pages/series-pages.js`: landing/detail orchestration, loading/error/not-found states and stale-request handling.
- `components/`: shared escaped rendering, cards, hero/overview/cast, episodes, appearances/filters, media/moments and section navigation.
- `admin/management.js`: separate content lists and Series filtering.
- `admin/editor.js`, `form-fields.js`, `repeatable-rows.js`: shared editor lifecycle and reusable controls.
- `admin/image-integration.js`: scoped integration with the existing cropper: 16:9 covers/thumbnails/moment images, 3:1 banners, 1:1 character portraits, English controls and keyboard handling. Other image editors retain their original behavior.
- `admin/series-form.js`, `episode-form.js`, `appearance-form.js`, `media-form.js`, `moment-form.js`: independent forms.
- `styles/series.css`: scoped public/admin responsive styles.
- `../supabase/migrations/20260919095942_series_archive.sql`: relational schema, RLS, grants, timestamps, indexes and save functions.
- `../tests/series-unit.cjs`, `series-database.sql`: unit and rollback-only database tests.
- `../tests/prepare-series-browser.cjs`, `series-browser-fixture.js`, `series-fixture.svg`: local-only browser fixtures, excluded from the production entry point.

Existing files modified: `app.js` (navigation, router, admin dispatch), `index.html` (script/style registration and cache versions), `supabase-db.js` (export existing `uploadEmbeddedMedia`). Existing CSS, content and schedule behavior were not refactored.

## Database and setup

The migration was applied to the configured `aas-ofc` project on 19 September 2026. No sample records were committed to that database. For another environment, run the existing base schema first, then apply the Series migration through Supabase CLI or SQL Editor. Do not rerun an already-applied migration.

Eight new tables: `series_archives`, `series_cast`, `series_links`, `series_episodes`, `series_episode_links`, `series_appearances`, `series_media`, `series_moments`. IDs remain text. All child rows have cascading foreign keys; episode links reference episodes. The existing `public.series` table remains schedule taxonomy, untouched by archive operations and publication. This separation prevents the legacy full-snapshot schedule save from overwriting archive records.

Public reads require published content and published ancestors. Provisioned authenticated users retain the existing back-office editor model; anonymous auth sessions are excluded. All new tables have RLS. `save_series_archive` and `save_series_episode` are security-invoker functions that atomically save a parent and its repeatable rows. JSON is RPC transport, not the database storage model.

No new keys or storage buckets are needed. Deploy the updated three shared files together with the complete `series/` directory. The frontend changes have not been published by this implementation.

## Verification

Run `node --test tests/series-unit.cjs`. Run `tests/series-database.sql` in the migrated Supabase database; its fixtures and modifications are rolled back. The suite checks publication, draft ancestry, anonymous/anonymous-auth write rejection, editor saves, repeatable rows, failed-save rollback, duplicate episodes and cascading deletion.

For isolated browser checks, run `node tests/prepare-series-browser.cjs`, start the existing local server (`node .codex-local-server.cjs`) and open `http://127.0.0.1:8765/tmp/series-browser.html#series`. The generated page omits the real Supabase client and uses in-memory fixtures; it must not be deployed as a public page. Refresh resets fixture edits.

Browser verification covers populated/empty public routes, responsive grids at 1366/768/390 pixels, appearance filters, independent admin creation, optional fields, repeatable episode links and row order. The real landing page was checked against Supabase with no records, and original navigation was smoke-tested.

Live-account verification completed on 19 September 2026 after the user signed in: created and edited a hidden Series through the actual admin UI, uploaded an image to Supabase Storage, reopened persisted cast/official links, and created an Episode (with two reordered links), Appearance, Media and Moment. Database queries confirmed all five content types and link order; an anonymous query returned no hidden test Series. The temporary Series and its child records were deleted after verification. Two small generated test images remain in the media bucket under `series/d6e81858-932e-400c-a4b9-bbce1d759fc2/`; archive deletion intentionally does not delete storage assets that might be referenced elsewhere.

The live upload check found the legacy cropper's portrait fallback was incorrectly used for new Series fields. The scoped adapter fixes those ratios while retaining the existing crop/resize/upload pipeline. A 1600×900 test image produced the expected 1200×675 crop. Save retries also retain the same record ID to avoid creating a second record after an uncertain response. Eight unit tests pass.

The 20 September update passed 12 unit tests and rollback-only database checks for default switching, rejecting hidden defaults, preserving content during visibility updates and anonymous permission restrictions. Browser fixtures verified horizontal selection, configured default, hidden-default fallback, single-story selector omission, mobile layout and publication preservation after editing. The frontend changes have not been deployed.

## Editorial redesign — 21 September 2026

The existing page now uses a split title/broadcast header, compact cast cards, a two-column desktop episode grid (one column at 1100px and below), consistent thumbnail placeholders, three-line expandable synopsis previews, unlabelled keyword/hashtag text and compact external actions. Related Content combines the existing appearances/media/moments arrays without changing the API or stored records; empty sections and unavailable actions are omitted. Category controls only use categories present in the returned data.

This revision changes only `components/episodes.js`, `components/series-overview.js`, `components/navigation.js`, new `components/related-content.js`, `pages/series-pages.js`, `styles/series.css`, registration/cache versions in `../index.html`, and `../tests/series-unit.cjs` (plus this documentation). Global `styles.css`, fonts, background, main navigation/footer, admin files and database are unchanged by this revision.

Validation: 15 unit tests pass; JavaScript syntax and diff whitespace checks pass. Live data checked at 375, 768, 1024 and 1440px with no horizontal overflow; both published Series switch correctly; long Thai synopsis expansion/collapse, absent thumbnail placeholder, and one/two-platform links checked. No real related rows were available for visual/filter interaction testing; empty state and source adaptation are unit tested. No production content was inserted or changed. Frontend remains local and has not been deployed.
