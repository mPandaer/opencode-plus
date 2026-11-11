# Fourth interface mode: Directories

Date: 2026-11-10
Status: implemented; E2E verification and final checks in progress
Architecture decision: [ADR 0001](../../docs/adr/0001-directories-interface-mode.md)
Domain terms: [GLOSSARY.md](../../GLOSSARY.md)

## Why the direction changed

The existing directory grouping is an overlay inside the Side (`vertical`) mode. It is gated by the `working_directories` server flag and, when enabled, bypasses the older experimental `sidebarOrganize: projects` view. Two organizations compete for the same sidebar. The user judged the patch-inside-Side approach structurally wrong and asked for a whole selectable style, following the OpenCode desktop interface-mode entry point.

## Settled decisions

### Shape

- Directory/project navigation is a **fourth interface mode**, `Directories`, in `appearance.tabLayout`, next to `horizontal` (Top), `vertical` (Side) and `inbox` (Inbox). It owns the whole left navigation surface, not only a list slot.
- The new mode has **one view**: project section title → directory group → sessions. There is no separate project view, no flat view, and no view-grouping switch. Flat browsing stays Side's job.
- Interface mode is chosen in Settings > General and is global. Directory state remains **per server**.
- Retire the legacy `sidebarOrganize` setting and `SidebarOrganized`; Side returns to the plain tab list. Keep persisted values decodable but ignored; no elaborate migration.
- No migration for old directory `view` values (`projects`, `list`). The feature was not in official use; decode old values tolerantly as the directory view so existing added directories are not wiped, but do not rewrite state.

### Navigation

- Tree-only: the mode does not render a separate tab strip. Sessions open from the tree; the open session is highlighted in the tree.
- Toolbar is one icon row: Home, add directory, search. Search is collapsed to an icon and expands to one row with the ownership filter; Esc collapses it.
- Each project title carries a hover/focus-only add-directory icon that opens the chooser scoped to that project; the local-folder title adds a local directory. The title never collapses or becomes a project-level tree node.
- Menus keep text labels; icon-only applies to toolbar and row actions.
- Reuse Inbox status-dot semantics (working / needs approval / done) on session rows. Color only the states that need attention.

### Rows and states

- Clean at-rest default: project title = project mark + name (12px secondary); directory header = 500-weight name with folder icon; session row = title + necessary status dot. New-session, menu, project add-directory and drag actions appear only on hover, keyboard focus or open menu, fixed in place and icon-only.
- Hierarchy is carried by indentation alone. There is no vertical guide rail and no per-row node dot: a rail with a dot on every open session reads as a timeline, starts and ends in mid-air, and crosses the selected row. Session titles align with the directory label, and the selected/hovered row is a chip inset to the folder-icon column so the indent gutter stays visible.
- An open tab is a 4px dot in the folder-icon column, centered under the folder icon, so titles keep one column whether a row is open or not. Inactive titles use secondary text (`text-muted`), not faint; only status dots carry the strongest contrast.
- Dragging a directory or project targets the whole group band, not only its title row: dropping over any session in another group reorders to that group. Pointer positions outside every band fall back to the nearest group, so overshooting the first or last row still lands. The source dims while dragging, and the target heading shows a focus ring so the drop slot is visible before release.
- Same-named directories stay same-named at rest; their project section title already distinguishes different owners, and hovering or focusing the header reveals the full path. The path is not a permanent second line.
- The project name is a section title/separator only; it is not collapsible, and row-level project marks are not repeated on every directory. Its only project-level affordance is the hover add-directory icon.
- One "directory unavailable" state with the existing recovery actions (restore path / choose a new location). No per-cause UI fork and no automatic fallback to the project root. Per-cause labels (missing / not a directory / no access / drive offline) are deferred: Core currently maps all of them to `FileSystem.DirectoryNotFoundError`, so the client cannot distinguish them without extending the server error detail.
- Directories without a Git project share one "Local directories" section instead of one section per path.
- Grouping keys use the server-canonical directory so Windows case differences and junctions do not create duplicate groups. Long paths, spaces and Unicode only need correct truncation and a full-path reveal.
- A directory disappearing while a session runs reuses the existing `location-missing` flow; the sidebar marks it unavailable and execution is blocked at the owning boundary.
- Four empty states: no directories ever added (onboarding + add-directory icon); filter/search no results (clear filter); all directories closed (hint to re-add); directory with no sessions (actionable header only, no placeholder row).

### Scope and rollout

- v1 is wide desktop only; narrow and mobile fall back to the existing Side behavior.
- The `working_directories` flag stays. The fourth card appears only when the current server's effective flags include it. Selecting the mode does not write server config; it is the only user action.
- Packaged-desktop default-on is deferred until the flag graduates. Graduation is a later explicit decision and must include the outstanding manual acceptance items.

### Reused behavior

The working-directory specification remains authoritative for behavior: actual recorded working directory owns sessions, parent/child directories group separately, add/close, order/collapse, search and ownership filters, per-server persistence, and unavailable-directory recovery. Implementation may adjust local affordances but not ownership rules or backend contracts.

## Prototype plan

Three full interactive prototypes, same fixture, evaluated on the desktop at wide and narrow widths.

| Variant | Direction |
| --- | --- |
| A | **Chosen.** Directory-first: the project name is a quiet section title (a separator, not a tree node) with a hover add-directory icon; each directory is the first-level collapsible and actionable unit. No separate project view. |
| B | Reference only: project-first tree. |
| C | Reference only: filter-first chips and compact grouped list. |

Fixture states every prototype must cover: no directories; one project with two directories; same-named directories; unavailable directory; inactive and active filter; hover/focus actions; narrow width. Bad paths: missing, path is a file, no access, offline/removable drive, long/space/Unicode path, case-only duplicate.

After selection: archive the two losers under `.scratch/desktop-sidebar/`, remove the development entry hook, and implement the chosen variant in the real app behind the fourth interface mode.

### Study entry and implementation

- The temporary `?prototype=directories` entry hook and source folder were removed after A shipped. The prototype source is archived at `prototype-src/`.
- Real implementation: `packages/app/src/shell/titlebar/sidebar-directories.tsx` (single directory view), the `directories` branch in `shell/titlebar/titlebar.tsx`, and the flag-gated fourth card in `settings/general/interface-mode.tsx`.
- Screenshots: `prototype-a.png`, `prototype-b.png`, `prototype-c.png`, `prototype-bad.png`, `prototype-empty.png`, `prototype-a-hover.png`, `prototype-a-narrow.png`, plus the real-shell `real-directories.png`, `real-directories-project-hover.png`, `real-directories-search.png`, `real-interface-mode.png`.

## Verification

- App unit suite: 2,586 pass, 0 fail across 268 files.
- Canonical root `bun run check`: 32/32 tasks successful.
- Focused E2E: directory-mode `tabs.spec.ts` group 14 passed; settings/home/session-location directory cases 7 passed; project-title add-directory case passed; the new-session shortcut case passed after seeding a remembered working directory.
- Real-shell screenshots: `real-directories.png`, `real-directories-project-hover.png`, `real-directories-search.png`, `real-interface-mode.png`. The settings card is present with the flag on and absent with the flag off (unless the stored mode is already Directories, which keeps the card visible so the user can switch).
- Sidebar visual pass (2026-11-10): removed the guide rail and per-row nodes, inset the selection chip to the session column, moved the open-tab dot beside the title, and raised inactive titles from faint to secondary. Focused directory E2E: 12 passed. Screenshots: `real-directories-a2.png`, `real-directories-a2-hover.png`, `real-directories-a2-sidebar.png`.
- One unrelated settings E2E case still fails in isolation (`worktrees prefetch ... reuses the request`: two `/api/worktree/refresh` calls instead of one). No worktree code was touched; it reproduces without these edits' directory-mode paths.

## Open items

- Finish the acceptance items that the flag still protects before any graduation: native folder picker, actual desktop restart, offline/access-denied disks, performance comparison.
- Decide the final user-visible copy and icon set for the toolbar and empty states (English source strings first).
- Verify the fourth card preview sketch in Settings and the settings-to-mode transition (no state migration).
- Decide whether the directory validation currently behind the flag becomes unconditional when it graduates.
- Add per-cause unavailable labels if the server starts exposing the cause (not-found / not-a-directory / access-denied / offline).
