// Throwaway screenshots for the Directories interface-mode prototypes.
import { chromium } from "../../packages/app/node_modules/@playwright/test"

const out = "D:/projects/opencode-plus/.scratch/desktop-sidebar"
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on("console", (message) => {
  if (message.type() === "error") console.log("console error:", message.text())
})
page.on("pageerror", (error) => console.log("page error:", error.message))

for (const variant of ["A", "B", "C"]) {
  await page.goto(`http://localhost:4444/?prototype=directories&variant=${variant}`)
  await page.locator(".dp-window").waitFor({ state: "visible", timeout: 60000 })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `${out}/prototype-${variant.toLowerCase()}.png` })
  console.log(`captured ${variant}`)
}

// Project-title add-directory action.
await page.goto(`http://localhost:4444/?prototype=directories&variant=A`)
await page.locator(".dp-window").waitFor({ state: "visible" })
await page.locator(".dp-project-title").first().hover()
await page.screenshot({ path: `${out}/prototype-a-project-add.png` })

// Hover actions on the first directory header.
await page.goto(`http://localhost:4444/?prototype=directories&variant=A`)
await page.locator(".dp-window").waitFor({ state: "visible" })
await page.locator(".dp-dir-heading").first().hover()
await page.screenshot({ path: `${out}/prototype-a-hover.png` })

// Narrow sidebar.
await page.getByRole("button", { name: "窄侧栏" }).click()
await page.screenshot({ path: `${out}/prototype-a-narrow.png` })

// Bad paths and empty state.
await page.getByRole("button", { name: "坏路径" }).click()
await page.screenshot({ path: `${out}/prototype-bad.png` })
await page.getByRole("button", { name: "空状态" }).click()
await page.screenshot({ path: `${out}/prototype-empty.png` })

await browser.close()
console.log("done")
