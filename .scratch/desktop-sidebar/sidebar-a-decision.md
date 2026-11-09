# Sidebar appearance decision

2026-11-09: user selected prototype A, 安静目录树, from three interactive alternatives, then rejected a conservative subset after seeing it in the desktop app.

## Implemented

- `.sidebar-directory-heading` is a 32px row; the full path moved from a permanent line to the fold button's title.
- The search field and ownership filter share one row; the global add trigger is icon-only in the compact toolbar.
- Directory actions (drag handle, new session, directory menu) keep fixed absolute positions at the row ends and are transparent until hover, keyboard focus, or an open menu. The fold label gets end padding on hover so it never paints under them; button hit targets never move.
- A 1px directory guide runs from the heading to the group's last row, using `--v2-border-border-muted`; it disappears when folded.
- Sortable groups use heading-wide pointer collision targets, disable optimistic DOM sorting (Solid commits the order), and commit the dropped target index. This fixes the compact-row drag overshoot.

## Causes found during verification

- `Retry` inside the fold label bubbled the click into folding; it is now a sibling row.
- The directory menu trigger also reports `aria-expanded`, so selectors keyed on `[aria-expanded]` misidentified it as the fold label. It stayed visible and expanded to 52px on hover, covering the new-session button's hit target. The fold button now has an explicit `sidebar-directory-fold` class.
- `DraftRoute` read `useSearchParams().draftId`, whose per-key proxy can still hold the previous location's keys during the render that first mounts the route after `navigate`. The draft existed in the tab store but the route redirected Home. It now parses `useLocation().search` directly.
- Separately, the first draft navigation in a fresh Playwright process can hang before commit (lazy route chunk cold). The original code shows the same behavior, so it predates this change; the keeper suite warms the chunk earlier.

## Sources

Archived alternatives: [sidebar-prototype.tsx](sidebar-prototype.tsx), [sidebar-prototype.css](sidebar-prototype.css). Development entry hook removed. No commit/branch created; this session was not authorized to commit. Prototype assets stay under `.scratch/desktop-sidebar/`.

Final desktop capture: [sidebar-a-desktop.png](sidebar-a-desktop.png). Hover-state fixture: [sidebar-a-hover-fixture.png](sidebar-a-hover-fixture.png).

## Verification

- Existing browser regressions `tabs.spec.ts:709,754,809,945,1063,1108,1138`: **7 passed** (one worker, zero retries), run after the final selector fix.
- App typecheck and canonical root `bun run check`: pass (temporary Windows `custom-elements.d.ts` workaround applied only during the check, then restored).
- Hover geometry inspected in the fixture: quiet actions opacity 0 at fixed positions; hover shows all three at the same positions; no reflow.
- `git diff --check` clean; all diagnostic logs, temporary specs and scratch copies removed.
- Strobe performance run `exp_ef85ac` refused with VariantMismatch (baseline page 1440×801 vs requested 1440×900); no performance verdict.
- User's live service was not restarted; only the dev desktop client was launched.
