// Capture the live desktop directory row at rest and on hover after the action-layout fix.
import { chromium } from "../../packages/app/node_modules/@playwright/test"

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { noDefaults: true })
const page = browser.contexts().flatMap((context) => context.pages())[0]
if (!page) throw new Error("no desktop page")
const sidebar = page.locator('[data-slot="vertical-tabs-sidebar"]')
await sidebar.waitFor({ state: "visible", timeout: 30000 })
await page.screenshot({ path: "D:/projects/opencode-plus/.scratch/desktop-sidebar/desktop-directories-rest.png", timeout: 60000 })
const heading = sidebar.locator(".sidebar-directory-heading").first()
await heading.hover()
await page.screenshot({ path: "D:/projects/opencode-plus/.scratch/desktop-sidebar/desktop-directories-hover.png", timeout: 60000 })
await browser.close()
console.log("captured")
