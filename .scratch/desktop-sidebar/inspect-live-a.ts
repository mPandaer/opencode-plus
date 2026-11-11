import { chromium } from "../../packages/app/node_modules/@playwright/test"
const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { noDefaults: true })
const page = browser.contexts()[0].pages().find((page) => page.url().includes("5173"))!
await page.screenshot({ path: "D:/projects/opencode-plus/.scratch/desktop-sidebar/sidebar-a-live.png" })
console.log(await page.locator(".sidebar-directory-heading").evaluateAll((elements) => elements.map((element) => ({ text: element.textContent, width: element.getBoundingClientRect().width }))))
await browser.close()
