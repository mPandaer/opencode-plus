# Shared implementer context

Read this file from the main checkout, because the task documents and user instructions may be untracked and absent from generated worktrees.

## Mandatory pointers

- Root: `D:/projects/opencode-plus`
- Integration branch: `desktop-directory-groups`, based on `release-v2.2.6-plus` at user's request. Worktree starts must match the current integration tip, not origin/dev.
- Spec: `.scratch/desktop-sidebar/spec.md`
- Tickets: `.scratch/desktop-sidebar/issues/`
- Parent `AGENTS.md`, `docs/agents/issue-tracker.md`, `docs/agents/domain.md`, `GLOSSARY.md`; also package AGENTS.md files.
- UI intent: `.scratch/desktop-sidebar/design.md`.
- Evidence: `.scratch/desktop-sidebar/implementation.md`, `.scratch/desktop-sidebar/acceptance.md`.
- State/picker/catalog research: `C:/Users/pandaer/.claude/projects/D--projects-opencode-plus/memory/sidebar-state-research-temp.md`.
- Unavailable directory research: `C:/Users/pandaer/.claude/projects/D--projects-opencode-plus/memory/sidebar-unavailable-research-temp.md`.

## Workflow

Implement only assigned ticket in its own branch/worktree. Call Skill `tdd` before implementation; read matching `.opencode/skills` test instructions before editing tests. Do not delegate. Use actual UI E2E boundaries and real backend isolated filesystem verification where required; do not duplicate implementation logic in tests. Commit conventional messages with scoped affected area and short hyphenated branch names. Merge latest integration tip into your branch before reporting done. Report commit IDs, exact commands and results, required-but-unperformed evidence, and conflict notes. Coordinator handles parent ticket statuses and integration merge through a fresh merger agent.

## Important scope and reuse constraints

- Working directory defines default location, not a subtree sandbox; preserve current cross-module permissions.
- Session ownership is exact stored directory, separate from shared Git Project identity. Preserve actual chosen path through draft/Local/create.
- Existing Home catalog only loads 500 newest root sessions; complete historical discovery needs existing cursor pagination rather than assuming bounded catalog is complete.
- Use `Persist.serverGlobal` and canonical server scope for durable UI state, with hydration and server-owned lifetime. Avoid repurposing used Project IDs as directory entries.
- Explicit new directory selection must support native chooser and known-project in-app browsing. Reuse existing picker, preserve original path and confirm complete path.
- New UI behavior requires actual Core-resolved feature flag delivery, not raw config or the legacy experimental settings page. Ticket01 introduces an experimental Location flag projection; read merged code before inventing another boundary.
- API changes require generation from packages/client; never modify generated clients manually.
- Missing directory recovery currently moves old sessions: ticket08 must add a new directory without moving the old session. Location boot caching does not prove fresh availability after warm deletion. Preserve global durable admission/history boundaries.
- Do not restart the user's live app or server. Native-picker and true desktop-restart acceptance must be reported honestly if not exercised.

## Verification environment

- Bun 1.4.4; Windows core.symlinks=false makes app custom-elements.d.ts a text link target. Verify it before applying temporary declaration-reference workaround; restore before commit. Details in `C:/Users/pandaer/.claude/projects/D--projects-opencode-plus/memory/windows-symlink-typecheck.md`.
- Baseline full lint: 0 errors (warnings); baseline root types pass with temporary symlink workaround. Baseline app units: 2,582 pass. Baseline server fetch + session-admit-location: 14 pass. This isn't verification of later changes.
- Use unique Playwright ports below 49152. Run tests in package directories. Root canonical final check is `bun run check`; no direct tsc.
- Session/timeline modifications require relevant strobe benchmark per packages/app/AGENTS.md; `bunx --no-install strobe --version` works (0.14.0), though plain `strobe` isn't on PATH. Document concrete tooling limits if unavailable.
- Parent lint scans nested .claude/worktrees, so final check is best after cleanup of task-owned implementer worktrees. Never remove pre-existing external worktrees.
