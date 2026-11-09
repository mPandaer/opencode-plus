# Desktop sidebar implementation

- Integration branch: `desktop-directory-groups`
- Base: `release-v2.2.6-plus` at `dc2ffcf8bf` (user requested current branch).
- Issue tracker: local Markdown; update each ticket status and acceptance evidence. No external PR required.
- Specification: [spec.md](spec.md)
- Working directories specify default scope, not a subtree sandbox. Follow existing cross-directory permissions.

## Task graph

- 01 → 02, 04
- 02 → 03, 05, 08
- 03 → 06
- 03 + 04 → 07

## Current integration / review status

- All eight tickets implemented and integrated. Final HEAD `35f58e5db06eb65cba94079b2ad173efc535fda5` on `desktop-directory-groups`; independent fast-forward merger completed without conflicts.
- Two-axis review: four Standards findings (one judgment call) and three Spec findings fixed in `707f86e18b`. Final three E2E regressions fixed in `35f58e5db0`, with original assertions retained. See [review.md](review.md).
- Final implementer: combined built E2E 146/146 and focused/recovery repeats 90/90, five workers and no retries. Independent final merger: app units 2608/0, client solid-data 35/0, four critical built E2Es passed without retries, app/client types and root check 32/32 passed (692 warnings, zero lint errors). Earlier canonical backend suite 18/0. Temporary Windows declaration workaround restored.
- Earlier inbox assertion was not reproduced in isolated/current-parent checks and passed unchanged in the final 146-suite run; no speculative inbox fix or baseline classification.
- Implementation tickets are closed as implemented, not as fully manually accepted. Native picker, actual desktop restart, offline/access-denied disks, model-generated recovery execution and successful performance comparison remain unverified; see [acceptance.md](acceptance.md). E2E compiler still has 181 reported diagnostics in untouched files; latest baseline attribution not independently verified.
- Task implementer worktrees removed except task01 residual directory, whose deletion failed with Windows file-in-use error. No unknown process was killed; unrelated worktrees preserved. No live app/server restart, push or PR.

## Historical progress

- 01: integrated by fast-forward as `10aa80a14a` from `preserve-working-directory`, independently inspected by merger agent. Experimental effective-flags projection on Location.Info is Location-scoped and generated via client codegen.
- 02: implementation commit `d4a6576958`, tip `7f0eb43fed` independently integrated, no conflicts. Main app units2583/0, app types and full root check32/32 passed (temporary Windows workaround restored). Reports new5UI flows50/50 repetitions, tabs66/66, postmerge11/11, app units2584/0 and postmerge root check32/32 passed. Same selected-child submission fix coordinated with04. Sidebar effective flag uses default server Location.Info; history catalog pages all nonarchived root Sessions. Native/restart unverified.
- 04: integrated `96281dcc99` by verified fast-forward, no conflicts. Independent main app units2654/0 (9385assertions), diff check and full root check passed after temporary Windows symlink workaround restored. Implementer new E2E40/40 repeated plus4/4 final; two long-path keeper failures not baseline-classified. Worktree clean, task processes exited, cleanup safe.
- 03: implementation `610dd6a4d7` on `sidebar-project-view`, independent merger running. Reports3newE2E/30repeats green,2583units/root check passed; full tabs serialized retry pending after benchmark build collision. origin/dev Strobe exp_f88ac9 locator timeout, no performance verdict. Shared seams: SidebarDirectories DirectoryState view directories/projects/list, projects derived from same ordered directories, shared exact-session directoryRow;06 persists order/collapse,07 filters derived groups without changing creation.
- 05: independently integrateda117014328;37focusedtests pass; implementer72tabs/20both-view repeats/40lifecycle repeats/rootcheck/units pass.03/05 completed worktrees removed. Ancillary server timeouts await final serialized rerun.
- 08: implementation ready branch `missing-directory` HEAD21f6559957, integratesa117014328 via87f070f57e; final evidence pending. Core fresh checks guard flagged creation/fresh prompts and runner step, HTTP Location refreshes cached dirs; history/control admission preserved. Shared ctx.directories recovery adds new without moving old, retries original.
- 06/07 final shared candidate `c838c7154b` on directory-search includes06 merge98e5645de3 and07 collapse-reveal testb2877a5c94, latest parent21f655 included, clean. Combined production root check passed; final fully-parallel tabs pending. Do not integrate until final test report.
- 07: commits93f6009d1c/e711cedb08; pre08/06 fulltabs74/74 plus40newflowrepeats passed. Merged08 integration21f655 as02875c3c7d then06 shared75178886de asf8a010b39c; combined collapse/filter/create-reveal assertions and final checks underway.
- 03 integrated610dd6a4d7; independent app types and11focusedtests passed; root lint transient one-error nested-worktree failure not conclusively diagnosed. Final cleanup/root check remains required.
- Cleanup02/04: clean, fully integrated worktrees removed successfully with per-command Git long-path support.
- Cleanup01: verified clean and fully integrated; `git worktree remove` failed on Windows `Filename too long` after unlock. Task-owned directory cleanup remains pending; preserve all unrelated worktrees.
- 01 implementer evidence: focused E2E 3 passed, server session-create 3 passed/52 assertions, affected app units and root check passed. Strobe timed out at existing New session locator; native manual acceptance unverified. Final integrated review pending.
- 01 integration blockers resolved: `4707cf1530` adds host-only `@vscode/ripgrep@1.18.0` server devDependency and existing binary service override, eliminating cached-PATH/download dependence. `02152a34b0` adds documented15s timeout only for actual Git/three-Location/filesystem/VCS integration test. Both fast-forward integrated. After frozen install, independent canonical command `bun run --cwd packages/server test -- ./test/session-create.test.ts ./test/session-admit-location.test.ts ./test/fetch.test.ts` passed:17pass/0fail/204assertions,21.99s, no PATH or CLI timeout overrides; two existing listener warnings. Earlier missing-binary and5s timeout failures retained as red evidence in session logs `bxrmt3pma.output` and `bph0zwex7.output`.
- Baseline `bun run check`: lint passed (0 errors; warnings include nested agent worktree); typecheck failed before app checking because Windows checked `packages/app/src/custom-elements.d.ts` out as symlink-target text (TS1128). Temporary local declaration-reference workaround required for meaningful app checks; restore before commits. With that temporary workaround, baseline root `bun run typecheck` passed (exit 0); original tracked file restored afterwards.

## Research pointers

- Sidebar state/pickers/catalog/flag delivery: `C:/Users/pandaer/.claude/projects/D--projects-opencode-plus/memory/sidebar-state-research-temp.md`. Bounded Home index isn't complete history; effective Core flags currently lack frontend transport; local desktop needs explicit access to existing in-app project browsing.
- UI constraints: `.scratch/desktop-sidebar/design.md` (preserve production component styling and exact-directory hierarchy).
- Cross-ticket acceptance matrix: `.scratch/desktop-sidebar/acceptance.md`.

- Missing-directory behavior: `C:/Users/pandaer/.claude/projects/D--projects-opencode-plus/memory/sidebar-unavailable-research-temp.md`. Existing recovery moves old sessions and cached Location startup does not detect every post-start deletion; ticket 08 must preserve historical location and validate execution at the owning boundary.

## Verification

- Baseline app `bun run --cwd packages/app test:unit`: 2,582 pass, 0 fail, 9,192 assertions across 266 files (100.44s).
- Baseline server `bun run --cwd packages/server test -- ./test/fetch.test.ts ./test/session-admit-location.test.ts`: 14 pass, 0 fail, 110 assertions (15.68s); existing MaxListenersExceededWarning emitted.
- Baseline `bun run --cwd packages/app typecheck:e2e`: failed before feature changes; existing composer catalog default-shape errors, compaction `recent` fields, unused declarations, animation listener types, and missing Vite/CSS/SVG declarations. Full log: `C:/Users/pandaer/AppData/Local/Temp/claude/D--projects-opencode-plus/e897ce40-7416-45fe-b20f-870f671767ab/tasks/bwybe8b60.output`. Compare additions against this baseline rather than claiming E2E types are green.

Record automated outcomes and any unavailable manual desktop checks explicitly. Do not mark manual acceptance complete without exercising it.
