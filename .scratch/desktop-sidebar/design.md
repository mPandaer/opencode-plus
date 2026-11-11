# Sidebar design constraints

This is an extension of the existing desktop workspace navigation, for developers managing several modules within one Git repository. Preserve existing application typography, colors and component primitives; the specification already fixes the product and grouping hierarchy.

- Directory view: directory header → its exact sessions.
- Project view: project header → directory headers → each directory's exact sessions.
- Distinguish directory names from session titles with existing folder/project icons, hierarchy and indentation. Show path/project context to distinguish same-named folders; expose the complete selected path before confirmation.
- Use the app's existing semantic color tokens, inherited UI font and code-font role for actual paths. No new fixed palette or font family.
- Keep directory creation actions attached to the directory header. Project creation opens a directory chooser. Global creation has its own current/last-used resolution.
- Keep empty explicitly added directories actionable. Missing directories remain identifiable with history access and a recovery action.
- Search and ownership filters occupy compact navigation controls and retain the current grouping hierarchy.
- Use existing keyboard focus, menus, native scrolling/menu scrolling, typography metrics, drag patterns and accessible labels. Motion should explain user-driven folding/reordering only.

Review against the brief: avoid a separate card-based directory surface, recursive directory-tree inference or decorative metadata. A directory group represents exact session ownership, not the whole descendant filesystem. Reuse production picker components for the centered searchable add-directory interaction.
