// Switch the running desktop dev window to the Directories mode and capture it.
import { chromium } from "../../packages/app/node_modules/@playwright/test"

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { noDefaults: true })
const page = browser.contexts().flatMap((context) => context.pages())[0]
if (!page) throw new Error("no desktop page")
await page.keyboard.press("Control+,")
const layout = page.getByRole("group", { name: "Interface layout", exact: true })
await layout.waitFor({ state: "visible", timeout: 30000 })
const directories = layout.getByRole("radio", { name: "Directories", exact: true })
console.log("directories card", await directories.count())
await layout.getByText("Directories", { exact: true }).click()
await page.getByRole("button", { name: /返回应用|Back to app/ }).click()
await page.locator('[data-slot="vertical-tabs-sidebar"]').waitFor({ state: "visible", timeout: 30000 })
await page.screenshot({ path: "D:/projects/opencode-plus/.scratch/desktop-sidebar/desktop-directories-live.png" })
await browser.close()
console.log("switched and captured")
