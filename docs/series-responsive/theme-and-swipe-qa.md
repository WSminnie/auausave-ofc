# Series themes and swipe follow-up — 26 November 2026

## Delivered

- Edit Series now includes a native color picker and an editable hex value for both Hero background and Accent color. Picker and text stay synchronized. Invalid colors and unreadable foreground/background combinations are rejected before saving.
- The repeatable Official Links editor is replaced by one fixed **Official on X** URL field. It loads the existing X/Twitter account and saves the fixed label through the existing relational API. Other legacy link metadata is preserved if present. The duplicate mobile/tablet X link below the synopsis is removed; hashtags remain.
- The complete hero and series selector stay in the document for Overview, Episodes and Related. Selecting tabs preserves reading position; overview shortcuts reveal the selected panel below the sticky tabs.
- Horizontal touch swipes move to the previous/next visible series and open its Overview. The selected series chip is kept in view. Vertical scrolling, horizontal clip/filter/series strips, native browser edge gestures, reduced motion and first/last boundaries are handled separately.
- While another series loads, the previous page stays visible. Back during loading releases the pending state; stale requests cannot replace the active route. Gestures/listeners, menu observers, timers and theme variables are cleaned up when leaving the page.

## Persisted palettes

| Archive | Background | Accent |
| --- | --- | --- |
| Mr.Fanboy | `#221833` | `#E8D49B` |
| The D Dorm Sitcom | `#1F4B47` | `#FFE14D` |
| Your Sky Of Us | `#1D3557` | `#A8D1F0` |

Other archives retain the existing fallback. There is no slug-to-color override in frontend code.

## Database

Migration `supabase/migrations/20261126113810_series_theme_colors.sql` is applied to the connected project matching the local Supabase API URL. Its local version matches the database migration history.

The migration adds nullable, hex-validated `theme_bg`/`theme_accent` fields and includes them in `save_series_archive`. The function remains **SECURITY INVOKER**, its existing authentication check and permissions remain intact, and Series RLS remains enabled. An older frontend omitting the theme fields preserves the stored palette. An explicit null can clear a field.

SQL checks ran inside a rolled-back transaction: theme create/update, old-client preservation, invalid-hex rejection and explicit clearing all passed. Only the three requested existing archives received persistent palette updates; test records were rolled back.

Security advisors before and after this migration had the same pre-existing findings outside this scope: [private analytics tables without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [RLS disabled on award_data_migrations](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public), and [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). This migration introduced no additional finding.

## Verification

- **161 Node tests passed.** Regression tests first reproduced the missing form controls, duplicate X action, swipe intent, preservation of legacy non-X links and pending-navigation Back state.
- Portable browser checks pass at **375, 390, 430, 768, 1024 and 1440px**. They cover retained hero, true tabs/history, sort labels/order, accordion, paging/filtering, keyboard/menu behavior, empty data and route cleanup.
- Chrome CDP touch tests pass for left/right series navigation, non-wrapping edges, native vertical reading scroll, native horizontal clip scrolling and delayed navigation/back cancellation.
- The overview shortcut test also checks the first row of the target panel after scrolling. It reproduced a sticky-position offset error; target positioning now uses the hero's document boundary rather than the sticky tab's viewport position.
- Admin browser checks verify picker/hex synchronization and the exact editor save payload, including fixed X label, cast preservation and removal of the transient `official_x_url` parent field. RPC persistence is verified separately against the actual database.
- Actual local API data returns all three configured palettes. Public screenshots and admin dialog screenshots were inspected at mobile and desktop sizes. Existing desktop bounding rectangles remain identical to the pre-redesign baseline at 1024 and 1440px.
- One independent review found the potential loss of legacy non-X links. The save preparation now retains those records; the regression test passes. No other blocking finding remained.

Evidence is in `outputs/series-followup/`: palette screenshots, six-width captures, `admin-390.png`, `admin-1440.png`, fixed-X dialog captures, actual public data snapshot and Node test output. The browser harness is `tests/series-responsive.browser.mjs`.

Physical iOS/Safari testing has not been run. The frontend is available for local review; it has not been published in this follow-up.

## Main files

`series/admin/form-fields.js`, `series-form.js`, `editor.js`; `series/components/shared.js`, `responsive-detail.js`; `series/pages/series-pages.js`; `series/styles/responsive-detail.css`; `index.html`; the migration and regression tests above.

## TV / UNCUT display controls follow-up

Edit Series now has independent **Show TV on website** and **Show UNCUT on website** checkboxes next to the saved broadcast/streaming text. All four combinations are supported on mobile, tablet and desktop. One visible mobile channel fills the row; neither selected removes the facts block. Turning display off keeps the underlying text saved. Existing and new records default to both enabled, and missing fields from older clients preserve stored preferences.

Migration `20261126120639_series_broadcast_visibility.sql` adds non-null booleans with true defaults and extends the same SECURITY INVOKER save RPC. It is applied and aligned with database migration history. SQL rollback checks passed all four combinations, text/theme preservation and old-client saves. Security advisor findings remain the same as the pre-existing findings documented above.

**162 Node tests pass**, plus the six-width browser suite with editor checkbox save/false-value persistence, desktop/mobile omission and an unchanged Watch button. Actual API defaults and screenshots at 375/1440 were verified in `outputs/series-visibility/` without changing existing archives' visibility choices.

Watch-button copy remains automatic: a completed series uses its first episode number and the platform identified from its watch link; an airing series uses the latest available episode. Source: `series/components/responsive-detail.js` (`start`, `watch`, `platform` and the primary button template). The copy is independent of TV/UNCUT display settings.

## Editable main button follow-up

Edit Series includes full-width **Main button text** and **Main button link** fields. Nonempty values override only the main hero action; episode watch links and secondary actions remain unchanged. Leaving a field blank keeps its automatic episode-based value. A custom link can also provide an action for an archive with no episodes yet.

Migration `20261126122457_series_primary_action.sql` adds nullable overrides and extends the existing invoker RPC. It is applied and matches the database history. Old clients omitting the fields preserve configured values; explicit null restores automatic behavior. SQL rollback checks passed round-trip, older-client preservation, unsafe URL rejection and explicit reset, with RLS/invoker status intact. Advisor findings remain the same pre-existing findings above.

**163 Node tests passed**. The six-width browser suite verifies admin inputs are saved into the record and the public main action uses the custom label and URL. Unit coverage checks escaping, automatic fallback and unchanged episode links. Actual API/form screenshots are in `outputs/series-visibility/admin-primary-*.png`; screenshot harnesses use isolated copies and do not change the user's settings.

## Unified three-button settings

The latest Edit Series dialog replaces the separate main/X controls with a **Series buttons** fieldset: Main button, Left button and Right button. Each has editable text, an arbitrary HTTP(S) destination and an independent Show button checkbox. Fields remain vertically stacked at desktop and mobile widths. Secondary labels are no longer fixed to Official Pilot / Official on X. Icons follow recognized destination platforms; generic links do not inherit a misleading platform icon.

Unset overrides stay empty in the editor, with current automatic values shown as placeholders. An unrelated save therefore does not freeze the current Pilot/X fallback. Existing episode actions, media entries and official-link metadata remain separate and are preserved. The old fixed-X submission format is still accepted for compatibility, but the new form does not impose that restriction on the right button.

Migration `20261126124013_series_button_group.sql` is applied and matches remote history. It adds secondary text/URL overrides and three true-by-default visibility flags. The invoker RPC preserves omitted fields for older clients. Rolled-back SQL tests verify text/link/visibility round-trips and unsafe URL rejection; RLS remains enabled and advisor findings match the documented baseline.

**164 Node tests pass**, plus six-width browser checks saving and displaying three arbitrary button labels/URLs. Independent review caught potential persistence of resolved defaults; regression tests now ensure untouched automatic values remain unset and unpublished automatic Pilots lose their button. Admin captures are `outputs/series-visibility/buttons-{primary,secondary,tertiary}-{375,1440}.png`.
