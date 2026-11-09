import { expect, type Page } from "@playwright/test"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { spawn } from "node:child_process"
import { once } from "node:events"
import { fileURLToPath } from "node:url"
import { createInterface } from "node:readline"

export async function realDirectoryHistory(page: Page) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "opencode-sidebar-close-"))
  const directory = path.join(root, "module")
  await fs.mkdir(directory)
  await fs.writeFile(path.join(directory, "keep.txt"), "Keep this module and its history.\n")
  const process = spawn("bun", ["test/sidebar-directory-fixture.ts", root], {
    cwd: fileURLToPath(new URL("../../../server/", import.meta.url)),
    stdio: ["pipe", "pipe", "inherit"],
  })
  const lines = createInterface({ input: process.stdout })
  const origin = await new Promise<string>((resolve, reject) => {
    lines.on("line", (line) => {
      if (line.startsWith("http://127.0.0.1:")) resolve(line)
    })
    process.once("error", reject)
    process.once("exit", (code) => reject(new Error(`Directory fixture exited: ${code}`)))
  })
  const created = await fetch(new URL("api/session", origin), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Durable module history", location: { directory } }),
  })
  expect(created.status).toBe(200)
  const session = (await created.json()).data
  await page.route(/\/api\/(?:experimental\/)?session(?:\/|\?|$)/, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const response = await fetch(new URL(url.pathname + url.search, origin), {
      method: request.method(),
      headers: { "content-type": "application/json" },
      body: request.postData(),
    })
    await route.fulfill({ status: response.status, contentType: "application/json", body: await response.text() })
  })
  return {
    directory,
    session,
    async verify() {
      expect(await fs.readFile(path.join(directory, "keep.txt"), "utf8")).toBe("Keep this module and its history.\n")
      const saved = await fetch(new URL(`api/session/${session.id}`, origin))
      expect(saved.status).toBe(200)
      expect((await saved.json()).data).toEqual(session)
      const listed = await fetch(new URL("api/session", origin))
      expect((await listed.json()).data.map((item: { id: string }) => item.id)).toEqual([session.id])
    },
    async [Symbol.asyncDispose]() {
      const exited = once(process, "exit")
      process.stdin.end("stop\n")
      await exited
      lines.close()
      await fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
    },
  }
}
