import { chromium } from "../../packages/app/node_modules/@playwright/test"
const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { noDefaults: true })
const page = browser.contexts()[0].pages().find((page) => page.url().includes("5173"))!
await page.locator(".sidebar-directory-heading").hover()
await page.screenshot({ path: "D:/projects/opencode-plus/.scratch/desktop-sidebar/sidebar-a-hover.png" })
console.log(await page.locator(".sidebar-directory-heading").evaluate(element => [...element.querySelectorAll("button")].map(button => ({label:button.getAttribute("aria-label"),opacity:getComputedStyle(button).opacity,width:button.getBoundingClientRect().width}))))
await browser.close()
