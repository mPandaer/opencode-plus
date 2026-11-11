// Reload the live desktop renderer (to apply HMR) and inspect the directory guide and indent.
import { chromium } from "../../packages/app/node_modules/@playwright/test"

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { noDefaults: true })
const page = browser.contexts().flatMap((context) => context.pages())[0]
if (!page) throw new Error("no desktop page")
await page.reload({ waitUntil: "domcontentloaded" })
const directory = page.locator(".sidebar-directory").first()
await directory.waitFor({ state: "visible", timeout: 60000 })
const fold = directory.locator(".sidebar-directory-fold")
if ((await fold.getAttribute("aria-expanded")) === "false") await fold.click()
const info = await page.evaluate(() => {
  const item = document.querySelector(".sidebar-directory") as HTMLElement
  const before = getComputedStyle(item, "::before")
  const heading = item.querySelector(".sidebar-directory-heading")!
  const name = heading.querySelector(".sidebar-directory-fold > div")!
  const row = item.querySelector("[data-titlebar-tab-action]") as HTMLElement | null
  const label = row?.querySelector("span.min-w-0") ?? null
  return {
    guide: { background: before.backgroundColor, width: before.width, inset: before.insetInlineStart },
    nameLeft: name.getBoundingClientRect().left,
    rowPadding: row ? getComputedStyle(row).paddingInlineStart : null,
    labelLeft: label?.getBoundingClientRect().left,
  }
})
console.log(JSON.stringify(info, null, 2))
await directory.screenshot({ path: "D:/projects/opencode-plus/.scratch/desktop-sidebar/live-directory.png", timeout: 60000 })
await page.addStyleTag({ content: ".sidebar-directory::before { background: red !important; width: 2px !important; }" })
await directory.screenshot({ path: "D:/projects/opencode-plus/.scratch/desktop-sidebar/live-directory-red.png", timeout: 60000 })
await browser.close()
console.log("captured")
