import { expect, test } from "bun:test"
import { transitionDirectoryAdd } from "./directory-add-machine"

test("directory confirmation claims saves, times out, and rejects old results after retry or disposal", () => {
  const saving = transitionDirectoryAdd({ type: "ready", attempt: 0 }, { type: "save" })
  expect(saving).toEqual({ type: "saving", attempt: 1 })
  expect(transitionDirectoryAdd(saving, { type: "save" })).toBe(saving)
  const failed = transitionDirectoryAdd(saving, { type: "timed-out", attempt: 1 })
  expect(failed).toEqual({ type: "failed", attempt: 1 })
  const retry = transitionDirectoryAdd(failed, { type: "save" })
  expect(retry).toEqual({ type: "saving", attempt: 2 })
  for (const type of ["saved", "failed", "timed-out"] as const)
    expect(transitionDirectoryAdd(retry, { type, attempt: 1 })).toBe(retry)
  expect(transitionDirectoryAdd(retry, { type: "saved", attempt: 2 }).type).toBe("closed")
  expect(transitionDirectoryAdd(retry, { type: "failed", attempt: 2 }).type).toBe("failed")
  for (const type of ["close", "disposed"] as const) {
    const closed = transitionDirectoryAdd(retry, { type })
    expect(closed.type).toBe("closed")
    expect(transitionDirectoryAdd(closed, { type: "saved", attempt: 2 })).toBe(closed)
    expect(transitionDirectoryAdd(closed, { type: "save" })).toBe(closed)
  }
})
