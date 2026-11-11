import { chromium } from "../../packages/app/node_modules/@playwright/test"
import { project, session, sessionHref } from "../../packages/app/e2e/utils/app"
import { mockWorkspace } from "../../packages/app/e2e/utils/workspace"

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await mockWorkspace(page, {
  name: "inspect",
  flags: { working_directories: true },
  projects: [project({ id: "proj_inspect", directory: "C:/OpenCode/Inspect", name: "Inspect" })],
  sessions: [
    session({ id: "ses_inspect", directory: "C:/OpenCode/Inspect", title: "Session one" }),
    session({ id: "ses_inspect_two", directory: "C:/OpenCode/Inspect", title: "Session two" }),
  ],
  seed: { locale: "en", settings: { appearance: { tabLayout: "directories" } }, tabs: ["ses_inspect"] },
})
await page.goto(`http://127.0.0.1:4445${sessionHref("ses_inspect")}`)
await page.locator(".sidebar-directory").first().waitFor({ state: "visible", timeout: 60000 })
const info = await page.evaluate(() => {
  const directory = document.querySelector(".sidebar-directory") as HTMLElement
  const before = getComputedStyle(directory, "::before")
  const heading = directory.querySelector(".sidebar-directory-heading")!
  const name = heading.querySelector(".sidebar-directory-fold > div")!
  const row = directory.querySelector("[data-titlebar-tab-action]") as HTMLElement | null
  const rowLabel = row?.querySelector("span.min-w-0") ?? null
  return {
    guide: {
      content: before.content,
      background: before.backgroundColor,
      width: before.width,
      inset: before.insetInlineStart,
      top: before.top,
      bottom: before.bottom,
    },
    headingLeft: heading.getBoundingClientRect().left,
    nameLeft: name.getBoundingClientRect().left,
    rowLeft: row?.getBoundingClientRect().left,
    rowPadding: row ? getComputedStyle(row).paddingInlineStart : null,
    rowLabelLeft: rowLabel?.getBoundingClientRect().left,
  }
})
console.log(JSON.stringify(info, null, 2))
await page.locator(".sidebar-directory").first().screenshot({ path: "D:/projects/opencode-plus/.scratch/desktop-sidebar/inspect-directory.png" })
await page.addStyleTag({ content: ".sidebar-directory::before { background: red !important; }" })
await page.locator(".sidebar-directory").first().screenshot({ path: "D:/projects/opencode-plus/.scratch/desktop-sidebar/inspect-directory-red.png" })
await browser.close()
