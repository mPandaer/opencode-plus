# Issue tracker: Local Markdown

Specs and tickets live in .scratch/<feature-slug>/.

## File conventions

- Spec: spec.md within the feature directory.
- Tickets: issues/<NN>-<slug>.md, one file per ticket, numbered from 01
  in dependency order.
- Each ticket records Status and Blocked by near the top.
- New implementation tickets use Status: ready-for-agent.
- Append discussion under a ## Comments heading in the relevant file.

## Skill operations

“Publish to the issue tracker” means write local Markdown files.
“Fetch a ticket” means read its file and comments.
Work on tickets whose listed blockers are complete.

Keep each ticket's acceptance criteria and status in its own file.
