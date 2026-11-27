# Solo Profile Polish Implementation Plan

> Execute inline using superpowers:executing-plans; one fresh-context read-only review after implementation.

**Goal:** Refine the shared AUAU/SAVE Profile template to the supplied desktop/mobile specification without changing the surrounding shell or other tabs.

**Architecture:** Edit `renderPersonalProfile()` in `app.js` once for both artists. Reuse `formatArtistBirthEnglish()` for the birthday row so the Hero's formatter and output stay unchanged. Add scoped Profile-only rules in `save-profile-tabs.css`; retain existing layout, Hero, navigation, footer and other panel nodes.

**Tech stack:** Existing vanilla JS, CSS, semantic HTML; Node tests and isolated Playwright fixtures.

**Spec:** User brief and Save desktop/mobile PNG references supplied 27 Nov 2026.

## Constraints and rulings

- Preserve all stored data. Format numeric ranges for display only; do not normalize factual prose or edit the database.
- Full finger names and Hand column; all five finger columns retained when any finger sizing exists. Left/Right use row headers; blanks remain blanks.
- Birthday uses the existing Hero formatter, including its leading zero for single-digit dates, because the Hero must not change.
- Updated date uses `personalProfiles[id].updatedDate`. Omit the line when absent; never invent an update date for AUAU.
- More About is legacy free text: recognize standalone Pets/Pet Instagram Account(s) headings, preserve unknown prose, escape content, link valid @handles only to Instagram and replace bullet/name colon presentation with a middle dot.
- Main/Profile/Favorites and sizing layout retained. 11px finger headers, 13px values, fixed table under 768px; two-column More About otherwise.
- Label red #C9383F scoped to Profile card labels only. Keep muted sizing labels and Motto as in supplied reference; no active-tab/menu color changes.
- Explicit mobile tab flex-shrink safeguard may be added without changing its computed geometry; honor existing saved tab visibility.
- Existing worktree and unrelated uncommitted About changes retained. No commit/push/deploy for this request.

## Tasks

- [x] Record before screenshots and protected DOM/geometry for both artists at 375, 390, 768, 1280 and 1920.
- [x] Add meaningful failing tests for shared semantics/date/range formatting, legacy More About parsing/link safety and missing optional data.
- [x] Implement shared template and narrowly scoped CSS; sync runtime copies.
- [x] Verify tests, both artists/five widths, finger overflow, unchanged Hero/tabs and other panel content, a11y and bounded visual comparison.
- [x] Fresh-context review, one correction batch if necessary, final evidence and file summary.

## Review focus

- Missing finger cells cannot collapse the requested five-column structure.
- Unknown More About prose and pet names must survive escaping and parsing.
- Invalid dates or absent updated dates cannot create a fake update claim.
- CSS must not affect Hero, tab geometry, Schedule/Journey/Awards, or the couple page.
- Mobile Favorites must remain horizontal and Sizing boxes 2×2; full headings must fit a 375px viewport.
