import { expect, test } from "bun:test"
import { transitionDirectoryAdd } from "./directory-add-machine"

test("directory confirmation claims saves synchronously, retries failure, and ignores late completion after close", () => {
  const saving = transitionDirectoryAdd({ type: "ready" }, { type: "save" })
  expect(saving).toEqual({ type: "saving" })
  expect(transitionDirectoryAdd(saving, { type: "save" })).toBe(saving)
  const failed = transitionDirectoryAdd(saving, { type: "failed" })
  expect(failed).toEqual({ type: "failed" })
  expect(transitionDirectoryAdd(failed, { type: "save" })).toEqual({ type: "saving" })
  expect(transitionDirectoryAdd(saving, { type: "saved" })).toEqual({ type: "closed" })
  const closed = transitionDirectoryAdd(saving, { type: "close" })
  expect(transitionDirectoryAdd(closed, { type: "saved" })).toBe(closed)
  expect(transitionDirectoryAdd(closed, { type: "failed" })).toBe(closed)
  expect(transitionDirectoryAdd(closed, { type: "save" })).toBe(closed)
})
