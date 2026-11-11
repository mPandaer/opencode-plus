export type GlobalNewState =
  | { status: "idle"; attempt: number }
  | { status: "loading" | "picking"; attempt: number; server: string }
  | { status: "disposed" }

export type GlobalNewEvent =
  | { type: "start" | "target"; server: string }
  | { type: "resolved"; attempt: number; server: string; pick: boolean }
  | { type: "finished" | "failed" | "timed-out"; attempt: number; server: string }
  | { type: "disposed" }

export function transitionGlobalNew(state: GlobalNewState, event: GlobalNewEvent): GlobalNewState {
  if (state.status === "disposed") return state
  if (event.type === "disposed") return { status: "disposed" }
  if (event.type === "target")
    return state.status !== "idle" && state.server !== event.server
      ? { status: "idle", attempt: state.attempt + 1 }
      : state
  if (event.type === "start")
    return state.status === "idle" ? { status: "loading", attempt: state.attempt + 1, server: event.server } : state
  if (
    state.status === "idle" ||
    !("attempt" in event) ||
    event.attempt !== state.attempt ||
    event.server !== state.server
  )
    return state
  if (event.type === "resolved")
    return state.status === "loading"
      ? event.pick
        ? { ...state, status: "picking" }
        : { status: "idle", attempt: state.attempt }
      : state
  return { status: "idle", attempt: state.attempt }
}

export function globalNewBusy(state: GlobalNewState) {
  return state.status === "loading" || state.status === "picking"
}
