import { expect } from "bun:test"
import { Session } from "@opencode/schema/session"
import { Effect, Layer, Schema, Schedule } from "effect"
import { rgPath } from "@vscode/ripgrep"
import { RipgrepBinary } from "@opencode/core/ripgrep/binary"
import { it } from "../../core/test/lib/effect"
import { ServerFetch } from "../src/fetch"
import path from "node:path"
import fs from "node:fs/promises"
import { $ } from "bun"
import { tmpdirScoped } from "../../core/test/fixture/tmpdir"
import { initRepo } from "../../core/test/fixture/git"
import { Flag } from "@opencode/core/flag"

it.live(
  "preserves root and module working directories under one Git project with local file search and effective flags",
  () =>
    Effect.gen(function* () {
      const tmp = yield* tmpdirScoped()
      const root = path.join(tmp.path, "repo")
      yield* Effect.promise(async () => {
        await fs.mkdir(path.join(root, "module-a"), { recursive: true })
        await fs.mkdir(path.join(root, "module-b"))
        await initRepo(root)
        await Bun.write(path.join(root, "root-only.txt"), "root")
        await Bun.write(path.join(root, "module-a", "alpha-only.txt"), "alpha")
        await Bun.write(path.join(root, "module-b", "beta-only.txt"), "beta")
      })
      const handler = yield* ServerFetch.make(
        {
          app: { version: "test" },
          database: { path: ":memory:" },
          models: { fetch: false },
          config: { directory: path.join(tmp.path, "config") },
          fs: { filewatcher: false },
        },
        {
          // Use the installed host binary: the production resolver may download rg on a clean machine.
          overrides: [
            RipgrepBinary.node.replace(Layer.succeed(RipgrepBinary.Service, { filepath: Effect.succeed(rgPath) })),
          ],
        },
      )
      const request = (route: string, directory: string, body?: unknown) =>
        Effect.promise(async () => {
          const url = new URL(route, "http://opencode.local")
          url.searchParams.set("location[directory]", directory)
          const response = await handler(
            new Request(
              url,
              body === undefined
                ? undefined
                : {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(body),
                  },
            ),
          )
          expect(response.status).toBe(200)
          return response.json()
        })
      const locations = yield* Effect.forEach(
        [root, path.join(root, "module-a"), path.join(root, "module-b")],
        (directory) =>
          Effect.gen(function* () {
            const location = yield* request("/api/location", directory)
            expect(location.directory).toBe(directory)
            expect(location.project.canonical).toBe(root)
            expect(location.experimental.flags.working_directories).toBe(true)
            const created = yield* request("/api/session", directory, { location: { directory } })
            const saved = yield* request(`/api/session/${created.data.id}`, directory)
            expect(saved.data.location.directory).toBe(directory)
            return location
          }),
      )
      expect(new Set(locations.map((location) => location.project.id)).size).toBe(1)
      const module = path.join(root, "module-a")
      const found = yield* request("/api/fs/find?query=only&type=file", module)
      expect(found.data).toEqual([{ path: "alpha-only.txt", type: "file" }])
      const siblings = yield* request("/api/fs/list?path=../module-b", module)
      expect(siblings.data).toEqual([
        expect.objectContaining({ path: path.join("..", "module-b", "beta-only.txt"), type: "file" }),
      ])
      const vcs = yield* request("/api/vcs", module).pipe(
        Effect.repeat({ while: (result) => result.data.provider !== "git", schedule: Schedule.spaced("10 millis") }),
        Effect.timeout("5 seconds"),
      )
      expect(vcs.data).toMatchObject({
        provider: "git",
        branch: { current: (yield* Effect.promise(() => $`git -C ${root} branch --show-current`.text())).trim() },
      })
      const diff = yield* request("/api/vcs/diff?mode=working", module)
      expect(diff.data).toEqual(expect.arrayContaining([expect.objectContaining({ file: "module-a/alpha-only.txt" })]))
    }).pipe(Effect.provideService(Flag.Overrides, "working_directories"), Effect.scoped),
  // Real Git processes, three Location graphs, persisted Sessions, and filesystem/VCS requests exceed 5s on Windows.
  { timeout: 15_000 },
)

it.live(
  "rejects creation and fresh prompts after warm directory deletion and recovers at the original path",
  () =>
    Effect.gen(function* () {
      const tmp = yield* tmpdirScoped()
      const root = path.join(tmp.path, "repo")
      const directory = path.join(root, "module")
      const plain = path.join(tmp.path, "plain")
      yield* Effect.promise(async () => {
        await fs.mkdir(directory, { recursive: true })
        await fs.mkdir(plain)
        await initRepo(root)
      })
      const handler = yield* ServerFetch.make(
        {
          app: { version: "test" },
          database: { path: ":memory:" },
          models: { fetch: false },
          config: { directory: path.join(tmp.path, "config") },
          fs: { filewatcher: false },
        },
        {
          overrides: [
            RipgrepBinary.node.replace(Layer.succeed(RipgrepBinary.Service, { filepath: Effect.succeed(rgPath) })),
          ],
        },
      )
      const request = (route: string, body?: unknown) =>
        Effect.promise(() =>
          handler(
            new Request(`http://opencode.local${route}`, {
              method: body === undefined ? "GET" : "POST",
              headers: { "content-type": "application/json" },
              body: body === undefined ? undefined : JSON.stringify(body),
            }),
          ),
        )
      expect((yield* request(`/api/location?location[directory]=${encodeURIComponent(directory)}`)).status).toBe(200)
      const created = yield* request("/api/session", { location: { directory } })
      const session = Schema.decodeUnknownSync(Schema.Struct({ data: Session.Info }))(
        yield* Effect.promise(() => created.json()),
      ).data
      expect(
        (yield* request(`/api/session/${session.id}/synthetic`, { text: "saved history", resume: false })).status,
      ).toBe(200)
      yield* Effect.promise(() => fs.rm(directory, { recursive: true }))
      expect((yield* request(`/api/session/${session.id}/message`)).status).toBe(200)
      expect((yield* request(`/api/session/${session.id}`)).status).toBe(200)
      expect((yield* request(`/api/location?location[directory]=${encodeURIComponent(directory)}`)).status).toBe(404)
      expect((yield* request("/api/session", { location: { directory } })).status).toBe(404)
      expect((yield* request(`/api/session/${session.id}/prompt`, { text: "continue", resume: false })).status).toBe(
        404,
      )
      yield* Effect.promise(() => fs.mkdir(directory))
      expect((yield* request(`/api/location?location[directory]=${encodeURIComponent(directory)}`)).status).toBe(200)
      const fetched = yield* request(`/api/session/${session.id}`)
      const saved = Schema.decodeUnknownSync(Schema.Struct({ data: Session.Info }))(
        yield* Effect.promise(() => fetched.json()),
      ).data
      expect(String(saved.location.directory)).toBe(directory)
      const continued = yield* request(`/api/session/${session.id}/prompt`, {
        text: "continue at original path",
        resume: false,
      })
      expect(continued.status).toBe(200)
      const marker = path.join(directory, "execution.txt")
      expect(
        (yield* request(`/api/session/${session.id}/shell`, { command: `echo restored > execution.txt` })).status,
      ).toBe(204)
      const output = yield* Effect.promise(() => fs.readFile(marker, "utf8")).pipe(
        Effect.retry(Schedule.spaced("10 millis")),
        Effect.timeout("5 seconds"),
      )
      expect(output.trim()).toBe("restored")
      expect(yield* Effect.promise(() => Bun.file(path.join(root, "execution.txt")).exists())).toBe(false)
      const replacement = yield* request("/api/session", { location: { directory: plain } })
      expect(replacement.status).toBe(200)
      const plainSession = Schema.decodeUnknownSync(Schema.Struct({ data: Session.Info }))(
        yield* Effect.promise(() => replacement.json()),
      ).data
      yield* Effect.promise(() => fs.rm(plain, { recursive: true }))
      expect((yield* request("/api/session", { location: { directory: plain } })).status).toBe(404)
      expect(
        (yield* request(`/api/session/${plainSession.id}/prompt`, { text: "cold missing", resume: false })).status,
      ).toBe(404)
      expect((yield* request(`/api/session/${plainSession.id}/message`)).status).toBe(200)
      yield* Effect.promise(() => fs.mkdir(plain))
      expect(
        (yield* request(`/api/session/${plainSession.id}/prompt`, { text: "cold restored", resume: false })).status,
      ).toBe(200)
      const original = yield* request(`/api/session/${session.id}`)
      expect((yield* Effect.promise(() => original.json())).data.location.directory).toBe(directory)
    }).pipe(Effect.provideService(Flag.Overrides, "working_directories")),
  // Boots real Git/Location services and runs an actual shell in the restored directory on Windows.
  { timeout: 15_000 },
)

const SessionResponse = Schema.Struct({ data: Schema.toEncoded(Session.Info) })
const SessionsResponse = Schema.Struct({ data: Schema.Array(Schema.toEncoded(Session.Info)) })

it.live("creates a child at its parent's location and lists it under the parent", () =>
  Effect.gen(function* () {
    const handler = yield* ServerFetch.make({
      app: { version: "test" },
      database: { path: ":memory:" },
      fs: { filewatcher: false },
    })
    const create = (body: unknown) =>
      Effect.promise(async () => {
        const response = await handler(
          new Request("http://opencode.local/api/session", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }),
        )
        expect(response.status).toBe(200)
        return Schema.decodeUnknownSync(SessionResponse)(await response.json()).data
      })
    const parent = yield* create({ title: "Parent" })
    const child = yield* create({ parentID: parent.id, title: "Child", location: { directory: "/unused" } })
    const response = yield* Effect.promise(() =>
      handler(new Request(`http://opencode.local/api/session?parentID=${parent.id}`)),
    )
    expect(response.status).toBe(200)
    const children = Schema.decodeUnknownSync(SessionsResponse)(yield* Effect.promise(() => response.json()))

    expect(child).toMatchObject({ parentID: parent.id, location: parent.location })
    expect(children.data.map((session) => session.id)).toEqual([child.id])
  }).pipe(Effect.scoped),
)

it.live("returns not found when creating a child of a missing session", () =>
  Effect.gen(function* () {
    const handler = yield* ServerFetch.make({
      app: { version: "test" },
      database: { path: ":memory:" },
      fs: { filewatcher: false },
    })
    const parentID = Session.ID.create()
    const response = yield* Effect.promise(() =>
      handler(
        new Request("http://opencode.local/api/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ parentID, title: "Child" }),
        }),
      ),
    )
    expect(response.status).toBe(404)
    expect(yield* Effect.promise(() => response.json())).toMatchObject({
      _tag: "SessionNotFoundError",
      sessionID: parentID,
    })
  }).pipe(Effect.scoped),
)
