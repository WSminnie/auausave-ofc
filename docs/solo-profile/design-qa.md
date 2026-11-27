# AUAU / SAVE Profile refinement — QA

Final result: passed. Local changes, 27 November 2026; no commit, push, deployment or database writes.

## Shared implementation

Both pages use `renderPersonalProfile()` in `app.js`. The work updates this template once; no per-page implementation. Existing Hero calls to `formatArtistBirthEnglish()` retain their defaults; Personal Information now uses that same formatter, with optional short-month formatting for the stored update date. Numeric ranges change only in rendered sizing values.

The legacy More About free-text field is read without data migration: standalone Pets / Pet Instagram Account(s) headings become consistent labeled sections. Account bullets are removed, pet-name colon separators become middle dots and escaped @handles link to Instagram. Unknown prose is retained. Missing sizing and dates do not produce invented facts; AUAU has no finger values or saved update date, so neither is fabricated. SAVE uses its recorded 24 Nov 2026 update date.

## Visual and responsive evidence

References: supplied Save desktop PNG (2880×4210) and mobile PNG (780px wide). Source/implementation comparisons normalized to 1280px / 390px are in `outputs/solo-profile-polish/desktop-comparison.png` and `mobile-comparison.png`. Existing main layout, Hero, tabs, header and footer were preserved rather than resized to match the example images.

Verified both artists at 375, 390, 768, 1280 and 1920 CSS pixels (10 combinations):

- No page overflow. SAVE's finger table has identical client/scroll widths, including 297px at the 375px viewport; six semantic column headers and Left/Right row headers. Mobile headers 11px and values 13px; fixed table layout.
- Profile title is 22px below 768 and 28px otherwise. Stored update date is 13px, beside the title on desktop and below it on mobile. Intro sentence is retained on mobile only.
- Mobile Favorites retains two columns; Bust/Waist/Shirt/Shoe retain 2×2. More About has one column on mobile and two otherwise.
- Protected Hero and tab HTML and bounding rectangles match before/after in all 10 combinations. Navigation/footer HTML and all Schedule/Journey/Awards panel HTML also match. New CSS targets the Profile component; the mobile flex-shrink safeguard changes no measured tab geometry. Existing administrator-controlled tab visibility remains respected.
- Red card labels are #C9383F (5.10:1 against white); muted sizing labels and Motto retain their existing appearance. Social links have platform names and targets at least 44×44px; new pet links are at least 44px high and have a visible focus outline.

Live localhost checked in the in-app browser on desktop and mobile, including switching AUAU to Journey and back while the Hero remains present. Proof: `live-save-desktop.jpg`, `live-save-mobile.jpg` and `live-auau-mobile.jpg`. Full before/after fixture captures and reports are in `outputs/solo-profile-polish/`.

## Checks and review

- New tests observed failing before implementation, then passed: shared names/date formatting; complete semantic finger grid with partial values; range preservation/no mutation; safe legacy pet-account links; unknown prose, missing dates/sizes and escaping.
- `node --test tests/*.cjs`: 189 passed, 0 failed.
- Final focused Profile/navigation checks: 11 passed. `assert-captures.cjs` passed all 10 combinations with no page errors.
- Fresh-context read-only review found no important actionable issues. External Instagram account availability was not independently verified; destinations derive from the stored handles.
- `git diff --check` and runtime-copy hashes checked before handoff.

## Files changed

- `app.js`: shared Profile renderer, display-only helpers and optional format options on the existing date formatter.
- `save-profile-tabs.css`: scoped heading, label, More About, finger-table rules and mobile tab shrink safeguard.
- `index.html`: updated asset cache versions; existing About additions retained.
- `tests/solo-profile-polish.cjs`: five behavior/semantic regressions.
- Corresponding `dist/client/app.js`, `save-profile-tabs.css` and `index.html` runtime copies.
- Plan: `docs/superpowers/plans/2026-11-27-solo-profile-polish.md`.
