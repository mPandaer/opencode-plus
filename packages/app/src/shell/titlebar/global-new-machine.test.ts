import { expect, test } from "bun:test"
import { transitionGlobalNew } from "./global-new-machine"

test("global new claims before lookup, rejects another server and old attempts, and exits every phase", () => {
  const idle = { status: "idle", attempt: 0 } as const
  const loading = transitionGlobalNew(idle, { type: "start", server: "one" })
  expect(loading).toEqual({ status: "loading", attempt: 1, server: "one" })
  expect(transitionGlobalNew(loading, { type: "start", server: "one" })).toBe(loading)
  expect(transitionGlobalNew(loading, { type: "resolved", attempt: 0, server: "one", pick: true })).toBe(loading)
  expect(transitionGlobalNew(loading, { type: "resolved", attempt: 1, server: "two", pick: true })).toBe(loading)
  const picking = transitionGlobalNew(loading, { type: "resolved", attempt: 1, server: "one", pick: true })
  expect(picking.status).toBe("picking")
  for (const state of [loading, picking]) {
    for (const type of ["finished", "failed", "timed-out"] as const)
      expect(transitionGlobalNew(state, { type, attempt: 1, server: "one" }).status).toBe("idle")
    const changed = transitionGlobalNew(state, { type: "target", server: "two" })
    expect(changed.status).toBe("idle")
    expect(transitionGlobalNew(changed, { type: "resolved", attempt: 1, server: "one", pick: false })).toBe(changed)
    const disposed = transitionGlobalNew(state, { type: "disposed" })
    expect(transitionGlobalNew(disposed, { type: "start", server: "one" })).toBe(disposed)
  }
})
