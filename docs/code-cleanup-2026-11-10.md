# Code cleanup — 10 November 2026

## Changes

- Inspected the production script/style graph, HTML route entries, local fixtures, tests, deployment copies, and database migration references.
- Removed 15 unused declarations from `app.js`: two retired handlers, six unused global aliases/state variables, and seven unused locals or intermediate render results.
- Consolidated the initial `artistCards`, `scheduleRows`, and `homeScheduleSection` implementations. Their older bodies were overwritten before the first router call, without being called or captured during initialization.
- Removed 86 selector branches from 81 CSS rules for retired markup. Retained classes generated from status, crop type, social platform, grid width, or stored layout settings.
- Extracted 11 inline style blocks from `index.html` into `archive.css`, in their original sequence and position between `styles.css` and the Series stylesheet.
- Formatted 33 production JavaScript files and five stylesheets. HTML inside JavaScript templates remains untouched. Added shared Prettier configuration.
- Made source boundaries in existing tests insensitive to whitespace and fail explicitly if a boundary is missing. Preserved the existing behavior assertions.
- Added three checks for asset existence/case, combined classic-script syntax/load order, and stylesheet order.
- Fixed the existing local server's handling of directory URLs such as `/schedule` and `/savewrg` after reproducing a local 404.
- Documented source responsibilities and repeatable verification commands in `README.md`.

## Verification

- Baseline: 105 existing tests passed before changes.
- Final regression suite: 108 tests passed, including the three new asset checks.
- JavaScript AST comparison and independent review confirmed that formatting preserves executable structure, apart from the documented removals and consolidation.
- Local-variable and unreachable-code lint: no remaining findings across the 33 production scripts. This intentionally excludes unused arguments and externally callable global handlers.
- Prettier formatting/semantic checks and Git whitespace checks passed.
- Home page after hydration: all 474 captured DOM elements and 11 computed style properties per element matched the pre-cleanup capture exactly.
- Browser smoke checks: Home, Schedule, Series, Presenters, Awards, Projects, SAVE, SAVE Schedule, AUAU, and Mhii Praew rendered. Live Series data loaded without console errors.
- At 390px: schedule/list controls, Series synopsis dialog, and Analytics rendered without horizontal overflow. Opened the admin event editor using isolated fixture data; did not submit changes to production content.
- The local server returned HTTP 200 for `/`, `/schedule`, `/savewrg`, `/savewrg/schedule`, `/auautnp`, `/mhiipraew`, and `/archive.css`.

## Preserved deliberately

Existing uncommitted work was retained. Database migrations, deployment copies in `dist/`, fixture assets, renderer wrappers with active dependencies, and dynamic classes remain because lack of a literal filename/class reference does not establish that they are unused. No database migration, deployment, or production-content edit was performed.

The original source snapshot is in `tmp/cleanup-before/`; verification logs and deletion inventories are in `tmp/cleanup-*.json` and `tmp/cleanup-verification.log`. These are local recovery/audit artifacts and are not part of the production entry point.
