# File tabs gain an editable view

Status: accepted

## Context

The fork's file surface is a built-in GUI plugin (`packages/gui-plugins/src/file/`) and is read-only in every path: a file tab renders text through the app's `File` component, artifact kinds go to `ArtifactView`, and no code in the repository writes file content from the UI. The gap is editing — after the agent changes a file, the user must leave the app to fix a line, and the only exits are the "Open in" list of external editors (`apps.ts`) or the terminal.

Upstream has not shipped an editor and is not a route to one: community pull requests adding a Monaco panel were closed because the feature is reserved internally (`anomalyco/opencode#10299`, `#10425`), and the official VS Code extension only opens a terminal. No third-party OpenCode GUI plugin embeds an editor either. Under [0002](0002-fork-releases.md) the fork only maintains its own delta, so this feature must be built and carried here.

Three facts about the existing surfaces shaped the decision:

- A GUI plugin cannot render text inside an existing file tab. `FileViewer` is consulted only for binary and non-text kinds, and the file tree's click path bypasses `LinkHandler`, so a standalone editor plugin would leave two competing ways to open a file.
- `experimental.fs.write` is already exercised in production by composer attachment uploads, but it deliberately reaches outside the location (`packages/core/src/filesystem.ts:221`) and takes no `If-Match`, so confinement and conflict detection have to be client-side.
- The app has no LSP client and no code editor library; highlighting today is `@pierre/highlights`, rendering is `@pierre/diffs`.

## Decision

Editing lives inside the built-in `file` plugin as a self-contained `editor/` module, not as a separate plugin and not behind a new SDK registry. A file tab keeps one tab and gains a second view: the existing read view stays the default, and an edit view is entered on demand through the file tab's toolbar. Line comments remain a read-view capability only; the edit view has native selection and no comment affordance.

The edit view is built on CodeMirror 6 with its official per-language packages, dynamically imported so a language is only loaded when a file of that kind is opened. Markdown is first-class: headings, emphasis, links, lists, quotes, tables, inline code, and fenced code blocks highlighted by their own language. Languages covered: markdown, ts/tsx/js/jsx, json/jsonc, yaml, css, html, python, shell, rust, go, sql, toml, diff; anything else renders as plain text without an error. There is no live preview inside the edit view — the read view already renders Markdown.

Saving is `Ctrl/Cmd+S` to `experimental.fs.write`. The client refuses to save outside the session's working directory, even though the endpoint would allow it. Conflict detection is client-side by comparing the ETag or `Last-Modified` from the last read against a fresh read before writing; when the file changed underneath a dirty buffer the save is refused and the user chooses reload, overwrite, or keep editing. A clean buffer reloads silently when the file changes externally, reusing the existing `files.sync` path. Dirty state shows on the tab title and blocks closing without a prompt.

Out of scope for the first version: LSP (completion, diagnostics, go-to-definition), editing several files at once, syntax-aware rename, live preview, and every file tree mutation (new, rename, delete). The tree stays read-only.

The work is carried on a short branch merged into the long-lived branch, as a handful of logical commits, so the fork delta stays small. It ships without a feature flag: the fork's delta is the product (see the amendment to [0001](0001-directories-interface-mode.md)), and a flag would only add state that updates never carry.

Verification is the smallest set that covers the expensive failure: unit tests for save-path confinement, dirty state and conflict resolution, plus one e2e keeper that opens a file, switches to the edit view, types, saves, reloads and asserts the content.

## Considered Options

- **A standalone GUI plugin.** Rejected: text files have no render seam, so the plugin would have to open its own tabs while the file tree still opened the read-only ones.
- **A new text-view registry in the GUI SDK.** Rejected: it is the cleaner architecture, but it changes the SDK surface upstream also touches, which costs more at every rebase than a fork-local module.
- **Monaco.** Rejected: 3–5 MB plus worker files for a single-file panel, and its IDE-shaped feature set is paid for and unused without LSP.
- **`contenteditable` with a highlight overlay.** Rejected: undo, IME, selection and indentation would all be rebuilt by hand.
- **Embedding OpenVSCode Server / code-server in a desktop web view.** Rejected: a second server process, a second update surface and an unused IDE chrome to solve "edit this one file".
- **Switching to a client that already ships an editor.** Rejected: it discards the fork's delta, which is the reason this fork exists.
- **Reusing `@pierre/highlights` inside the editor.** Rejected: the worker would paint highlighting a frame behind typing, because CodeMirror needs decorations from the same syntax tree that drives cursor, selection and folding.

## Consequences

- The rebase conflict surface is `packages/gui-plugins/src/file/`, a directory upstream is actively changing; conflicts are resolved by hand when upstream ships.
- The editor depends on an experimental endpoint. If upstream moves or changes `fs.write`, the client is updated in the same rebase, and no compatibility shim is added.
- Because the server does not confine writes, confinement is a client rule that any future caller of save must keep.
- Reverting the feature means deleting one module and its wiring in `view.tsx`; nothing outside the file plugin depends on it.
- The app remains without LSP, so editing offers highlighting and text manipulation only — no diagnostics, completion or navigation.
