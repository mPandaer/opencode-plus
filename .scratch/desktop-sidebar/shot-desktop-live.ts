// Attach to the running desktop dev window without emulating media or disturbing focus.
import { chromium } from "../../packages/app/node_modules/@playwright/test"

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { noDefaults: true })
const pages = browser.contexts().flatMap((context) => context.pages())
console.log("pages", pages.length)
const page = pages[0]
if (!page) throw new Error("no desktop page")
await page.screenshot({ path: "D:/projects/opencode-plus/.scratch/desktop-sidebar/desktop-live.png" })
await browser.close()
console.log("captured")
