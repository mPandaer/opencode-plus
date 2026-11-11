import type { OpenCodeEvent, SessionInfo } from "@opencode/client/promise"
import { createStore } from "solid-js/store"

// A session moves up the sidebar when the user asks it something. Assistant steps, passive metadata, renames and
// reverts are not the user's attention: two sessions working at once must not overtake each other between prompts.
export function isSidebarAttention(
  event: OpenCodeEvent,
): event is Extract<OpenCodeEvent, { type: "session.inbox.enqueued" }> {
  return event.type === "session.inbox.enqueued" && event.data.item.type === "user"
}

export function createSidebarAttention() {
  const [prompted, setPrompted] = createStore<Record<string, Record<string, number | undefined>>>({})

  return {
    get(server: string, sessionId: string) {
      return prompted[server]?.[sessionId]
    },
    update(server: string, event: OpenCodeEvent) {
      if (!isSidebarAttention(event)) return
      setPrompted(server, (sessions) => ({
        ...sessions,
        [event.data.sessionID]: Math.max(sessions?.[event.data.sessionID] ?? 0, event.created),
      }))
    },
  }
}

// `busy` records the execution the prompt began, and an execution starts once per busy period, so it survives a
// reload where the event stream does not. A prompt steered into a run that already started is only in that stream,
// and a session the user never prompted falls back to when it was created.
export function sessionAttention(session: SessionInfo, prompted: number | undefined) {
  return Math.max(session.time.created, session.time.busy ?? 0, prompted ?? 0)
}

export function compareSessionAttention(
  a: SessionInfo,
  b: SessionInfo,
  prompted: (id: string) => number | undefined,
) {
  const attention = sessionAttention(b, prompted(b.id)) - sessionAttention(a, prompted(a.id))
  if (attention !== 0) return attention

  const created = b.time.created - a.time.created
  if (created !== 0) return created

  // Server lists break equal timestamps by descending ID, so the sidebar keeps that order when attention ties.
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0
}
