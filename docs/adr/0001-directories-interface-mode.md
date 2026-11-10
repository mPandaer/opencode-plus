# Directories is a fourth interface mode

Status: accepted

## Context

Directory grouping was implemented as a content overlay inside the Side (`vertical`) interface mode, next to the older experimental `sidebarOrganize` Projects view. Both reorganized the same region: when the `working_directories` flag was on, the new overlay bypassed `sidebarOrganize` entirely, so the app had two competing organizations for one surface with no clear owner. The product direction changed from "improve the vertical sidebar" to "offer a whole selectable style".

## Decision

Directory navigation becomes a fourth value of the appearance interface mode (`tabLayout`), named **Directories**, alongside Top, Side and Inbox. It owns the entire left navigation surface with a single view: project section title → directory group → sessions. There is no separate project view and no view-grouping switch; the project title carries a hover-only add-directory action. It is not controlled by `sidebarOrganize`. The legacy `sidebarOrganize` setting and `SidebarOrganized` component are retired, and Side returns to the plain tab list. The mode choice stays a global appearance setting; directory state stays per server.

The `working_directories` feature flag remains in place for now. The fourth mode is available wherever that server flag is enabled; graduating the flag so packaged release builds show the mode by default is a later, explicit decision.

## Considered Options

- **Keep it as a Side variant.** Rejected: it would continue to overlap with `sidebarOrganize` and would never read as a distinct style.
- **Add an orthogonal sidebar style setting.** Rejected: it would multiply combinations with Top/Side/Inbox instead of giving the directory experience one clear home.
- **Graduate the flag immediately.** Rejected for now: the packaged-default-on requirement is real, but the acceptance record still has unverified manual items (native picker, desktop restart, offline disks, performance). Deferring graduation keeps that decision reversible.

## Consequences

- The fourth mode replaces tabs with the directory tree. Switching among many open sessions happens through the tree, so parallel-session switching is slower than a tab strip.
- The project view from the earlier specification is dropped. Project ownership remains visible through section titles and each project's add-directory icon; whole-project collapsing is not available.
- Old directory `view` values (`projects`, `list`) are decoded tolerantly as the directory view without a state migration.
- Directory behavior semantics from the earlier working-directory specification are reused unchanged; only presentation and local affordances change.
- The fourth card's availability follows the server's effective flags. A packaged release build will not offer it until `working_directories` graduates.
