import { Effect } from "effect"
import { ServerFetch } from "../src/fetch"
import path from "node:path"
import { once } from "node:events"

// Isolated real HTTP backend for the app keeper's directory lifecycle evidence.
const root = process.argv[2]!
await Effect.runPromise(
  Effect.gen(function* () {
    const handler = yield* ServerFetch.make({
      app: { version: "test" },
      database: { path: path.join(root, "sessions.db") },
      config: { directory: path.join(root, "config"), project: false },
      models: { fetch: false },
      fs: { filewatcher: false },
    })
    const server = yield* Effect.acquireRelease(
      Effect.sync(() => Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: (request) => handler(request), idleTimeout: 0 })),
      (server) => Effect.promise(() => server.stop(true)),
    )
    console.log(server.url.href)
    yield* Effect.promise(() => once(process.stdin, "data"))
  }).pipe(Effect.scoped),
)
