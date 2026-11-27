# About AUAUSAVE Implementation Plan

> Execute inline with superpowers:executing-plans; one fresh-context review at the end.

**Goal:** Bring the supplied About AUAUSAVE desktop/mobile layout into the existing profile while preserving Journey, global navigation/footer, hero gradient, image shape and button styling.

**Architecture:** Add a small pure summary/markup module alongside the current vanilla-JS renderer. It reads the same public data already loaded into `db`; no schema, content writes or extra runtime requests. Enhance the final pair profile after its existing builder wrappers, and scope new styles to the couple overview elements. Keep the Journey renderer and all its CSS unchanged.

**Spec:** User brief and supplied `10 · About AUAUSAVE (Desktop)@2x.png` / `9 · About AUAUSAVE (Mobile)@2x.png` in Downloads, 27 November 2026.

## Constraints and rulings

- Preserve the current Journey heading "Journey", filters, markup, images, styles and track behavior.
- Capture deterministic before/after Journey PNGs at 375, 390, 768, 1280 and 1920; compare pixel buffers and DOM geometry using an isolated automated fixture. Inspect the live page in the in-app browser.
- Use current Bangkok date/year, exclude upcoming/future series and cancelled/past events. Count unique partner brands for AT01 in the current year.
- Series overview uses the existing pair Journey series records; retain their data and order in Journey. Only the new summary filters/counts them.
- Latest award comes from existing pair awards sorted by date; multiple awards expose +N more. Remove the old lower Awards section on this profile only, including when there are three or more awards (optional restore is not used).
- Zero awards, missing source/image, absent next event, no aired series and unpublished projects need useful fallbacks. Do not create fake destinations.
- Keep supplied colors/sizing except use a darker source-link color if needed to meet the explicit 4.5:1 contrast requirement.
- Mobile hero is image, 60px title, description, award, then two profile links and full-width Schedule. Preserve existing button shapes/colors; height at least 44px.
- Section visible-surface gaps 96px desktop / 48px mobile. Achieve gaps through new section wrappers; do not change Journey padding/styles.
- Existing workspace/local server stays in place. This request is local implementation; no commit, push or deployment unless asked.
- Ruling: restore the original full-size arched image and pill button geometry on the newly stacked mobile hero, instead of carrying over the old compact thumbnail's 14px corners and 7px button text. Desktop geometry stays unchanged. Use the existing Schedule hover shade (#B94D50) for white-text contrast 4.95:1; the original light shade is 3.49:1 and conflicts with the explicit accessibility requirement.
- Ruling: separate timeline records can share a legacy master seriesId (Your Sky / Your Sky of Us). Deduplicate timeline identity rather than master ID. Exclude postponed as well as cancelled/rescheduled events from Next.

## Tasks

- [x] Capture current public-data snapshot and before screenshots/geometry, including Journey and global header/footer.
- [x] Write failing tests for derived counts, latest award, explicit empty states, safe links and date boundaries.
- [x] Implement the summary/render module and page integration; add trophy SVG and scoped CSS.
- [x] Verify model tests, production entry assets and browser interactions. Compare all five Journey captures byte-for-byte at decoded pixel level.
- [x] Compare the provided mobile/desktop targets with local captures in a bounded visual QA pass; make one consolidated correction if needed.
- [x] Fresh-context review; complete meaningful checks and file-level handoff.

## Review focus

- Upcoming or future series must not inflate highlights or the latest-streaming summary.
- Shared brand names and duplicate timeline identities must not inflate counts.
- Missing award URL/image must not create an unsafe or misleading card link.
- No-next-event and no-series/project states must remain useful.
- Existing builder/profile wrappers must not move/remove the new blocks or alter Journey/header/footer.
