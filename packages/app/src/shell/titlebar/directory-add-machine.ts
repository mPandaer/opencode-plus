export type DirectoryAddState =
  | { type: "ready"; attempt: number }
  | { type: "saving"; attempt: number }
  | { type: "failed"; attempt: number }
  | { type: "closed"; attempt: number }
export type DirectoryAddEvent =
  | { type: "save" | "close" | "disposed" }
  | { type: "saved" | "failed" | "timed-out"; attempt: number }

export function transitionDirectoryAdd(state: DirectoryAddState, event: DirectoryAddEvent): DirectoryAddState {
  if (state.type === "closed") return state
  if (event.type === "close" || event.type === "disposed") return { ...state, type: "closed" }
  if (event.type === "save")
    return state.type === "ready" || state.type === "failed" ? { type: "saving", attempt: state.attempt + 1 } : state
  if (state.type !== "saving" || !("attempt" in event) || event.attempt !== state.attempt) return state
  return { ...state, type: event.type === "saved" ? "closed" : "failed" }
}

export function directoryAddView(state: DirectoryAddState) {
  return { saving: state.type === "saving", failed: state.type === "failed", closed: state.type === "closed" }
}
