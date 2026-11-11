// Inspect the isolated desktop dev window and switch it to the Directories mode if needed.
import { chromium } from "../../packages/app/node_modules/@playwright/test"

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { noDefaults: true })
const context = browser.contexts()[0]
const page = context.pages().find((item) => !item.url().startsWith("devtools://")) ?? context.pages()[0]
if (!page) throw new Error("no desktop page")
console.log("page", page.url())

const sidebar = page.locator('[data-slot="vertical-tabs-sidebar"]')
const directories = page.locator(".sidebar-directories")
let mode = await directories.count()
console.log("sidebar visible", await sidebar.isVisible().catch(() => false), "directories mode", mode)

if (!mode) {
  await page.keyboard.press("Control+,")
  const layout = page.getByRole("group", { name: "Interface layout", exact: true })
  await layout.waitFor({ state: "visible", timeout: 30000 })
  await layout.getByText("Directories", { exact: true }).click()
  await page.getByRole("button", { name: /返回应用|Back to app/ }).click()
  await sidebar.waitFor({ state: "visible", timeout: 30000 })
  mode = await directories.count()
  console.log("switched, directories mode", mode)
}

const info = await page.evaluate(() => {
  const side = document.querySelector('[data-slot="vertical-tabs-sidebar"]')
  if (!side) return { sidebar: false }
  const rows = [...side.querySelectorAll<HTMLElement>(".sidebar-directory-heading, [data-titlebar-tab-action]")]
  const rect = (element: Element) => {
    const box = element.getBoundingClientRect()
    return { x: Math.round(box.x * 10) / 10, y: Math.round(box.y * 10) / 10, h: Math.round(box.height * 10) / 10 }
  }
  return {
    sidebar: true,
    directories: side.querySelectorAll(".sidebar-directory").length,
    rows: rows.map((row) => {
      const heading = row.classList.contains("sidebar-directory-heading")
      const content = row.querySelector<HTMLElement>(heading ? ".sidebar-directory-fold > div" : "[dir=auto]")
      return {
        kind: heading ? "heading" : "session",
        label: heading ? row.getAttribute("aria-label") : row.getAttribute("title"),
        row: rect(row),
        content: content ? rect(content) : undefined,
        slot: row.querySelector<HTMLElement>(":scope > span") ? rect(row.querySelector(":scope > span")!) : undefined,
        pill: heading ? undefined : getComputedStyle(row, "::before").insetInlineStart,
      }
    }),
  }
})
console.log(JSON.stringify(info, null, 2))

await page.screenshot({ path: "D:/projects/opencode-plus/.scratch/desktop-sidebar/desktop-a2.png", animations: "disabled", timeout: 60000 })
if (await directories.count()) {
  await sidebar.screenshot({
    path: "D:/projects/opencode-plus/.scratch/desktop-sidebar/desktop-a2-sidebar.png",
    animations: "disabled",
    timeout: 60000,
  })
}
await browser.close()
console.log("captured")
