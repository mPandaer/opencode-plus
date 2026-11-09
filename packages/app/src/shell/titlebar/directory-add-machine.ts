export type DirectoryAddState = { type: "ready" } | { type: "saving" } | { type: "failed" } | { type: "closed" }
export type DirectoryAddEvent = { type: "save" } | { type: "saved" } | { type: "failed" } | { type: "close" }

export function transitionDirectoryAdd(state: DirectoryAddState, event: DirectoryAddEvent): DirectoryAddState {
  if (event.type === "close") return { type: "closed" }
  if (event.type === "save" && (state.type === "ready" || state.type === "failed")) return { type: "saving" }
  if (state.type !== "saving") return state
  if (event.type === "saved") return { type: "closed" }
  if (event.type === "failed") return { type: "failed" }
  return state
}
