# Series themes, fixed X field and swipe follow-up

**Scope:** Extend the existing Series edit dialog with native color pickers and editable hex values; persist both theme fields through the existing invoker RPC; initialize the three user-specified palettes. Replace the Series repeatable links editor with a single Official on X URL while retaining the existing relational storage. Remove the duplicated mobile synopsis X link. Keep the complete hero and series selector in all responsive tabs. Add touch swipes between visible series with directional motion and no interference with vertical scrolling or horizontal content strips.

**Decisions:** Use the navy/blue option supplied for Your Sky Of Us. Other series retain the established fallback. Changing series opens Overview, matching a chip selection. Tabs preserve the current reading position; overview shortcuts reveal their target panel. Keep the old page visible while fetching the next series. Desktop layout stays unchanged.

- [x] Add regression tests for form values/validation, theme preservation in the RPC, retained hero, duplicate X removal and swipe intent.
- [x] Add migration using the CLI; preserve absent theme keys when older clients save; initialize only the three requested records; apply and verify in the connected project.
- [x] Implement admin color controls/fixed X field and responsive tab/swipe behavior, including cleanup, reduced motion, edge resistance and selected-chip visibility.
- [x] Run Node/browser checks, actual API/admin save verification, six-width visual batch and focused review. Keep the local preview available.

## Evidence / rulings

- Migration created with CLI v3.4.0, applied through the connected Supabase tool, then local filename aligned to the verified database history version `20261126113810`.
- User requested the simpler X editor, not removal of legacy data. Preserve any non-X records in the save payload; all four current archives had only their X row at inspection time.
- Gesture handling uses non-passive touch movement only after horizontal intent. Native horizontal strips and browser edge zones are excluded; vertical reading gestures are not prevented.
- A new browser test reproduced Back during an in-flight swipe leaving the retained page busy; history restoration now clears both busy and gesture-pending states.
- Full Node suite: 161 passed. Six-width browser suite, native touch tests, admin save-payload checks and SQL rollback checks pass. Desktop geometry remains identical. See `docs/series-responsive/theme-and-swipe-qa.md`.
