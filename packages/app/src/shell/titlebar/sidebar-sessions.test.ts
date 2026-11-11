import { expect, test } from "bun:test"
import type { OpenCodeEvent, SessionInfo } from "@opencode/client/promise"
import { compareSessionAttention, createSidebarAttention, isSidebarAttention } from "./sidebar-sessions"

const base: SessionInfo = {
  id: "ses_sidebar",
  projectID: "project",
  cost: 0,
  tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
  time: { created: 1, updated: 10 },
  title: "Indexed title",
  location: { directory: "/project" },
}

const envelope = {
  id: "evt_sidebar",
  created: 50,
  durable: { aggregateID: base.id, seq: 1, version: 1 as const },
}

const prompt = {
  ...envelope,
  type: "session.inbox.enqueued",
  data: {
    sessionID: base.id,
    inboxID: "msg_sidebar",
    item: { type: "user", payload: { text: "Hello" }, delivery: "steer" },
  },
} satisfies OpenCodeEvent

test("records the newest prompt for a previously unseen server and session", () => {
  const attention = createSidebarAttention()

  expect(attention.get("server", base.id)).toBeUndefined()
  attention.update("server", prompt)
  expect(attention.get("server", base.id)).toBe(50)
  attention.update("server", { ...prompt, created: 40 })
  expect(attention.get("server", base.id)).toBe(50)
})

test.each([
  { event: { ...envelope, type: "session.viewed", data: { sessionID: base.id, idle: 10 } }, expected: false },
  {
    event: { ...envelope, type: "session.metadata.updated", data: { sessionID: base.id, metadata: { a: 1 } } },
    expected: false,
  },
  {
    event: { ...envelope, type: "session.agent.selected", data: { sessionID: base.id, agent: "build" } },
    expected: false,
  },
  {
    event: { ...envelope, type: "session.renamed", data: { sessionID: base.id, title: "New title" } },
    expected: false,
  },
  {
    event: {
      ...envelope,
      type: "session.step.started",
      data: {
        sessionID: base.id,
        assistantMessageID: "msg_step",
        agent: "build",
        model: { providerID: "provider", id: "model" },
        started: 50,
      },
    },
    expected: false,
  },
  {
    event: {
      ...envelope,
      type: "session.inbox.enqueued",
      data: {
        sessionID: base.id,
        inboxID: "msg_compaction",
        item: { type: "compaction", payload: {}, delivery: "steer" },
      },
    },
    expected: false,
  },
  { event: prompt, expected: true },
] satisfies { event: OpenCodeEvent; expected: boolean }[])(
  "$event.type counts as sidebar attention: $expected",
  ({ event, expected }) => {
    expect(isSidebarAttention(event)).toBe(expected)
  },
)

test("orders by the prompt that began the run, not by assistant steps", () => {
  const stepped = { ...base, id: "ses_stepped", time: { created: 1, updated: 900, busy: 10 } }
  const prompted = { ...base, id: "ses_prompted", time: { created: 2, updated: 20, busy: 20 } }

  expect([stepped, prompted].toSorted((a, b) => compareSessionAttention(a, b, () => undefined))).toEqual([
    prompted,
    stepped,
  ])
})

test("a prompt steered into a running session outranks every run that started earlier", () => {
  const running = { ...base, id: "ses_running", time: { created: 1, updated: 20, busy: 20 } }
  const steered = { ...base, id: "ses_steered", time: { created: 2, updated: 10, busy: 10 } }
  const prompted = (id: string) => (id === steered.id ? 30 : undefined)

  expect([steered, running].toSorted((a, b) => compareSessionAttention(a, b, prompted))).toEqual([steered, running])
})

test("a session the user never prompted falls back to when it was created", () => {
  const empty = { ...base, id: "ses_empty", time: { created: 30, updated: 30 } }
  const older = { ...base, id: "ses_older", time: { created: 1, updated: 20, busy: 20 } }

  expect([older, empty].toSorted((a, b) => compareSessionAttention(a, b, () => undefined))).toEqual([empty, older])
})

test("equal attention breaks by creation time and then by descending ID", () => {
  const a = { ...base, id: "ses_a", time: { created: 10, updated: 10 } }
  const b = { ...base, id: "ses_b", time: { created: 10, updated: 10 } }
  const newer = { ...base, id: "ses_newer", time: { created: 20, updated: 20 } }

  expect([a, b, newer].toSorted((x, y) => compareSessionAttention(x, y, () => undefined))).toEqual([newer, b, a])
})
