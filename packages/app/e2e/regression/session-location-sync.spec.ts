import { expect, test, type Page } from "@playwright/test"
import { base64Encode } from "@opencode/util/encode"
import { seed } from "../utils/app"
import { fixture } from "../utils/session-fixture"
import { mockMissingLocation, mockOpenCodeServer } from "../utils/mock-server"
import { installSseTransport } from "../utils/sse-transport"

for (const endpoint of ["/api/location", "/api/agent"]) {
  for (const recover of [false, true]) {
    test(`keeps the composer when ${endpoint} ${recover ? "recovers on retry" : "fails"}`, async ({ page }) => {
      const recovery = recoveryRequests(page)
      const directory = "/projects/working-tree"
      const sessionID = "ses_location_sync_failure"
      await mockOpenCodeServer(page, {
        directory: fixture.directory,
        project: fixture.project,
        provider: fixture.provider,
        sessions: [{ id: sessionID, projectID: fixture.project.id, directory, title: "Workspace sync" }],
        fileList: () => [],
        pageMessages: () => ({
          items: [{ id: "msg_saved", type: "user", text: "Keep working in this worktree", time: { created: 1 } }],
        }),
      })
      let requests = 0
      await page.route("**/api/**", (route) => {
        const url = new URL(route.request().url())

        if (url.pathname !== endpoint || url.searchParams.get("location[directory]") !== directory)
          return route.fallback()
        requests++

        if (recover && requests > 1) return route.fallback()

        return route.fulfill({ status: 500, body: "", headers: { "access-control-allow-origin": "*" } })
      })

      const failure = page.waitForResponse(
        (response) => new URL(response.url()).pathname === endpoint && response.status() === 500,
      )

      const settled = page.waitForResponse((response) => {
        const url = new URL(response.url())

        return (
          url.pathname === endpoint &&
          url.searchParams.get("location[directory]") === directory &&
          response.ok() === recover
        )
      })

      await page.goto(`/server/${base64Encode(fixture.serverKey)}/session/${sessionID}`)
      await failure
      await expect(page.getByText("Keep working in this worktree", { exact: true })).toBeVisible()
      const prompt = page.getByRole("textbox", { name: "Prompt", exact: true })
      await expect(prompt).toBeEditable()
      await prompt.fill("Continue after reconnecting")
      await expect(prompt).toHaveText("Continue after reconnecting")
      await settled
      await expect(prompt).toBeEditable()
      await expect(prompt).toHaveText("Continue after reconnecting")
      // The client makes more than one attempt; how many is its own policy, not this keeper's contract.
      await expect.poll(() => requests).toBeGreaterThanOrEqual(2)
      await expect(page.getByText("Session location unavailable", { exact: true })).toHaveCount(0)
      await expect(page.getByRole("button", { name: "Choose directory", exact: true })).toHaveCount(0)
      expect(recovery).toEqual([])
      await page.screenshot({ path: test.info().outputPath("location-sync.png") })
    })
  }
}

test("directory recovery restores the original path without migrating history", async ({ page }) => {
  const directory = "/projects/missing-module"
  const sessionID = "ses_directory_restore"
  let missing = true
  const mutations: string[] = []
  await mockOpenCodeServer(page, {
    directory: fixture.directory,
    project: fixture.project,
    provider: fixture.provider,
    sessions: [{ id: sessionID, projectID: fixture.project.id, directory, title: "Original history" }],
    fileList: () => [],
    pageMessages: () => ({
      items: [{ id: "msg_original", type: "user", text: "Keep original history", time: { created: 1 } }],
    }),
  })
  await seed(page, { settings: { appearance: { tabLayout: "directories" } } })
  await mockMissingLocation(page, directory, () => missing)
  page.on("request", (request) => {
    if (request.method() === "POST" && /\/(move|prompt)$/.test(new URL(request.url()).pathname))
      mutations.push(request.url())
  })
  await page.goto(`/server/${base64Encode(fixture.serverKey)}/session/${sessionID}`)
  await expect(page.getByText("Keep original history", { exact: true })).toBeVisible()
  await expect(page.getByRole("textbox", { name: "Prompt", exact: true })).toHaveCount(0)
  await expect(
    page.getByText(
      "Restore the original path to continue this session, or add a new working directory. The session stays at its original location.",
      { exact: true },
    ),
  ).toBeVisible()
  missing = false
  await page.getByRole("button", { name: "Retry original directory", exact: true }).click()
  await expect(page.getByRole("textbox", { name: "Prompt", exact: true })).toBeEditable()
  await expect(page.getByText("Keep original history", { exact: true })).toBeVisible()
  expect(mutations).toEqual([])
})

test("a warm-deleted mounted session shows directory recovery after sending", async ({ page }) => {
  const directory = "/projects/warm-module"
  const sessionID = "ses_warm_deleted"
  await mockOpenCodeServer(page, {
    directory: fixture.directory,
    project: fixture.project,
    provider: fixture.provider,
    sessions: [{ id: sessionID, projectID: fixture.project.id, directory }],
    fileList: () => [],
    pageMessages: () => ({
      items: [{ id: "msg_warm", type: "user", text: "Warm original history", time: { created: 1 } }],
    }),
  })
  await seed(page, { settings: { appearance: { tabLayout: "directories" } } })
  await page.goto(`/server/${base64Encode(fixture.serverKey)}/session/${sessionID}`)
  const prompt = page.getByRole("textbox", { name: "Prompt", exact: true })
  await expect(prompt).toBeEditable()
  await expect(page.getByText("Warm original history", { exact: true })).toBeVisible()
  await mockMissingLocation(page, directory, () => true, /\/api\/session\/[^/]+\/prompt/, sessionID)
  await prompt.fill("Continue in the deleted directory")
  await page.locator('[data-action="composer-submit"]').click()
  await expect(page.getByRole("button", { name: "Retry original directory", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Choose new location", exact: true })).toBeVisible()
  await expect(page.getByText("Warm original history", { exact: true })).toBeVisible()
  await expect(prompt).toHaveCount(0)
})

test("choosing a new location adds a directory without moving the unavailable session", async ({ page }) => {
  const directory = "/projects/old-module"
  const destination = "C:\\OpenCode\\SmokeProject"
  const sessionID = "ses_directory_replacement"
  const session = { id: sessionID, projectID: fixture.project.id, directory, title: "Old module history" }
  const moves: string[] = []
  await mockOpenCodeServer(page, {
    directory: fixture.directory,
    project: fixture.project,
    provider: fixture.provider,
    sessions: [session],
    fileList: () => [],
    pageMessages: () => ({
      items: [{ id: "msg_old", type: "user", text: "Original module transcript", time: { created: 1 } }],
    }),
  })
  await seed(page, { settings: { appearance: { tabLayout: "directories" } } })
  await mockMissingLocation(page, directory)
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname.endsWith("/move")) moves.push(request.url())
  })
  await page.goto(`/server/${base64Encode(fixture.serverKey)}/session/${sessionID}`)
  await page.getByRole("button", { name: "Choose new location", exact: true }).click()
  const picker = page.getByRole("dialog", { name: "Add directory", exact: true })
  await expect(picker.getByRole("button", { name: "Select folder", exact: true })).toBeEnabled()
  await picker.getByRole("button", { name: "Select folder", exact: true }).click()
  const confirm = page.getByRole("dialog", { name: "Confirm working directory", exact: true })
  await expect(confirm.getByText(destination, { exact: true })).toBeVisible()
  await confirm.getByRole("button", { name: "Add directory", exact: true }).click()
  await expect(confirm).toBeHidden()
  await expect(page.getByText("Original module transcript", { exact: true })).toBeVisible()
  await expect(page.getByRole("textbox", { name: "Prompt", exact: true })).toHaveCount(0)
  expect(session.directory).toBe(directory)
  expect(moves).toEqual([])
  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.entries(localStorage)
          .filter(([key]) => key.includes("sidebar.directories"))
          .map(([, value]) => value)
          .join(""),
      ),
    )
    .toContain("SmokeProject")
})

test("follows a live session move while the agent catalog is still loading", async ({ page }) => {
  const recovery = recoveryRequests(page)
  const directory = "/projects/old-tree"
  const destination = "/projects/current-tree"
  const sessionID = "ses_location_moved_while_loading"
  const session = { id: sessionID, projectID: fixture.project.id, directory, title: "Moved session" }
  const requested = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  await page.addInitScript(() => {
    localStorage.setItem(
      "settings.v3",
      JSON.stringify({ general: { timelineDetail: { notices: { placement: "separate" } } } }),
    )
  })
  const transport = await installSseTransport(page, { server: fixture.serverKey })
  await mockOpenCodeServer(page, {
    directory: fixture.directory,
    project: fixture.project,
    provider: fixture.provider,
    sessions: [session],
    fileList: () => [],
    pageMessages: () => ({
      items: [{ id: "msg_saved", type: "user", text: "Follow the session move", time: { created: 1 } }],
    }),
  })
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url())

    if (url.pathname === "/api/agent" && url.searchParams.get("location[directory]") === directory) {
      requested.resolve()
      await release.promise
    }

    return route.fallback()
  })
  await page.goto(`/server/${base64Encode(fixture.serverKey)}/session/${sessionID}`)
  await requested.promise
  const prompt = page.getByRole("textbox", { name: "Prompt", exact: true })
  await expect(prompt).toBeEditable()
  await prompt.fill("Keep this draft")
  await expect(page.getByText("Session location unavailable", { exact: true })).toHaveCount(0)
  await transport.waitForConnection()

  const resolved = page.waitForResponse((response) => {
    const url = new URL(response.url())

    return url.pathname === "/api/agent" && url.searchParams.get("location[directory]") === destination && response.ok()
  })

  session.directory = destination
  await transport.send({
    id: "evt_location_moved_while_loading",
    type: "session.moved",
    created: 2,
    durable: { aggregateID: sessionID, seq: 1, version: 1 },
    data: { sessionID, location: { directory: destination }, projectID: fixture.project.id },
  })
  await resolved

  const delayed = page.waitForResponse((response) => {
    const url = new URL(response.url())

    return url.pathname === "/api/agent" && url.searchParams.get("location[directory]") === directory && response.ok()
  })

  release.resolve()
  await delayed
  await expect(prompt).toBeEditable()
  await expect(prompt).toHaveText("Keep this draft")
  await expect(page.getByText("Follow the session move", { exact: true })).toBeVisible()
  await expect(page.locator('[data-type="location-switched"]').getByText(destination, { exact: true })).toBeVisible()
  await expect(page.getByText("Session location unavailable", { exact: true })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Choose directory", exact: true })).toHaveCount(0)
  expect(recovery).toEqual([])
})

test("keeps the side panel's tabs and selection when the session moves", async ({ page }) => {
  const directory = "/projects/tabs-before-move"
  const destination = "/projects/tabs-after-move"
  const sessionID = "ses_location_moved_tabs"
  const session = { id: sessionID, projectID: fixture.project.id, directory, title: "Moved tabs" }
  const transport = await installSseTransport(page, { server: fixture.serverKey })
  await mockOpenCodeServer(page, {
    directory: fixture.directory,
    project: fixture.project,
    provider: fixture.provider,
    sessions: [session],
    fileList: () => [],
    findFiles: (input) => ["README.md", "NOTES.md"].filter((name) => name.startsWith(input.query)),
    fileContent: (path) => ({ type: "text", content: `contents:${session.directory}:${path}` }),
    pageMessages: () => ({
      items: [{ id: "msg_saved", type: "user", text: "Keep my tabs", time: { created: 1 } }],
    }),
  })
  await page.goto(`/server/${base64Encode(fixture.serverKey)}/session/${sessionID}`)
  await expect(page.getByRole("textbox", { name: "Prompt", exact: true })).toBeEditable()

  const panel = page.getByRole("complementary", { name: "Review and files" })
  const files = panel.getByRole("tab", { name: /\.md$/ })
  const notes = panel.getByRole("tab", { name: "NOTES.md", exact: true })

  // A lost selection would fall back to the first file tab, README.md, so NOTES.md stays selected only if it carries.
  for (const name of ["README", "NOTES"]) {
    await page.keyboard.press("ControlOrMeta+Shift+P")

    const dialog = page.getByRole("dialog")
    const search = dialog.getByRole("combobox")
    await search.fill(name)
    await expect(dialog.getByRole("option", { name: `/ ${name}.md`, exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    await search.press("Enter")
    await expect(dialog).toHaveCount(0)
    await expect(panel.getByRole("tab", { name: `${name}.md`, exact: true })).toHaveAttribute("aria-selected", "true")
  }

  await expect(files).toHaveText(["README.md", "NOTES.md"])
  await expect(panel.getByText(`contents:${directory}:NOTES.md`, { exact: true })).toBeVisible()

  await transport.waitForConnection()

  const resolved = page.waitForResponse((response) => {
    const url = new URL(response.url())

    return (
      url.pathname === "/api/location" && url.searchParams.get("location[directory]") === destination && response.ok()
    )
  })

  session.directory = destination
  await transport.send({
    id: "evt_location_moved_tabs",
    type: "session.moved",
    created: 2,
    durable: { aggregateID: sessionID, seq: 1, version: 1 },
    data: { sessionID, location: { directory: destination }, projectID: fixture.project.id },
  })
  await resolved
  await expect(page.locator('[data-type="location-switched"]').getByText(destination, { exact: true })).toBeVisible()
  await expect(files).toHaveText(["README.md", "NOTES.md"])
  await expect(notes).toHaveAttribute("aria-selected", "true")
  // The carried tab shows the file in the new directory.
  await expect(panel.getByText(`contents:${destination}:NOTES.md`, { exact: true })).toBeVisible()
})

test("refreshes a session moved during disconnection without losing the draft", async ({ page }) => {
  const recovery = recoveryRequests(page)
  const directory = "/projects/before-reconnect"
  const destination = "/projects/after-reconnect"
  const sessionID = "ses_location_reconnect"
  const session = { id: sessionID, projectID: fixture.project.id, directory, title: "Reconnected session" }
  const transport = await installSseTransport(page, { server: fixture.serverKey })
  await mockOpenCodeServer(page, {
    directory: fixture.directory,
    project: fixture.project,
    provider: fixture.provider,
    sessions: [session],
    fileList: () => [],
    pageMessages: () => ({
      items: [{ id: "msg_saved", type: "user", text: "Resume in the current worktree", time: { created: 1 } }],
    }),
  })
  await page.goto(`/server/${base64Encode(fixture.serverKey)}/session/${sessionID}`)
  const prompt = page.getByRole("textbox", { name: "Prompt", exact: true })
  await expect(prompt).toBeEditable()
  await prompt.fill("Draft before disconnect")
  const connection = await transport.waitForConnection()

  const resolved = page.waitForResponse((response) => {
    const url = new URL(response.url())

    return (
      url.pathname === "/api/location" && url.searchParams.get("location[directory]") === destination && response.ok()
    )
  })

  session.directory = destination
  await transport.close()
  await transport.waitForConnection({ after: connection.id })
  await resolved
  await expect(prompt).toBeEditable()
  await expect(prompt).toHaveText("Draft before disconnect")
  await expect(page.getByText("Resume in the current worktree", { exact: true })).toBeVisible()
  await expect(page.getByText("Session location unavailable", { exact: true })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Choose directory", exact: true })).toHaveCount(0)
  expect(recovery).toEqual([])
})

test("ignores an old failed location read after reconnecting", async ({ page }) => {
  const recovery = recoveryRequests(page)
  const directory = "/projects/reconnected-tree"
  const sessionID = "ses_location_stale_response"
  const requested = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  const transport = await installSseTransport(page, { server: fixture.serverKey })
  await mockOpenCodeServer(page, {
    directory: fixture.directory,
    project: fixture.project,
    provider: fixture.provider,
    sessions: [{ id: sessionID, projectID: fixture.project.id, directory }],
    fileList: () => [],
    pageMessages: () => ({ items: [] }),
  })
  let requests = 0
  await page.route("**/api/location?**", async (route) => {
    if (new URL(route.request().url()).searchParams.get("location[directory]") !== directory) return route.fallback()
    requests++

    if (requests > 1) return route.fallback()
    requested.resolve()
    await release.promise

    return route.fulfill({
      status: 500,
      body: "",
      headers: { "access-control-allow-origin": "*" },
    })
  })
  await page.goto(`/server/${base64Encode(fixture.serverKey)}/session/${sessionID}`)
  await requested.promise
  const prompt = page.getByRole("textbox", { name: "Prompt", exact: true })
  await expect(prompt).toBeEditable()
  await prompt.fill("Keep typing here")
  const connection = await transport.waitForConnection()
  const metadata = page.waitForResponse((response) => new URL(response.url()).pathname === `/api/session/${sessionID}`)

  const resolved = page.waitForResponse((response) => {
    const url = new URL(response.url())

    return (
      url.pathname === "/api/location" && url.searchParams.get("location[directory]") === directory && response.ok()
    )
  })

  await transport.close()
  await transport.waitForConnection({ after: connection.id })
  await metadata
  release.resolve()
  await resolved
  await expect(prompt).toBeEditable()
  await expect(prompt).toHaveText("Keep typing here")
  await expect(page.getByText("Session location unavailable", { exact: true })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Choose directory", exact: true })).toHaveCount(0)
  expect(requests).toBe(2)
  expect(recovery).toEqual([])
})

// Relocation: moving the session or creating a worktree. Showing a resolved Location also refreshes its project's
// worktree inventory (`/api/worktree/refresh`), which is routine discovery, not recovery.
function recoveryRequests(page: Page) {
  const requests: string[] = []
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname

    if (request.method() === "POST" && /^\/api\/(session\/[^/]+\/move|worktree)$/.test(path)) requests.push(path)
  })

  return requests
}
