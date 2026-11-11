// Independent check for the flag-off fallback and settings card availability.
import { chromium } from "../../packages/app/node_modules/@playwright/test"
import { session, sessionHref } from "../../packages/app/e2e/utils/app"
import { mockWorkspace } from "../../packages/app/e2e/utils/workspace"

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await mockWorkspace(page, {
  name: "flag-off",
  flags: { working_directories: false },
  sessions: [session({ id: "ses_flag", directory: "C:/OpenCode/FlagOff", title: "Flag off" })],
  seed: { locale: "en", settings: { appearance: { tabLayout: "directories" } }, tabs: ["ses_flag"] },
})

await page.goto(`http://127.0.0.1:4445${sessionHref("ses_flag")}`)
await page.locator('[data-slot="vertical-tabs-sidebar"]').waitFor({ state: "visible", timeout: 60000 })
await page.locator('[data-slot="vertical-tabs-sidebar"] [data-titlebar-tab]').first().waitFor({ timeout: 15000 })
const groups = await page.locator('[data-slot="vertical-tabs-sidebar"] [role="group"]').count()
const tabs = await page.locator('[data-slot="vertical-tabs-sidebar"] [data-titlebar-tab]').count()
console.log("flag-off sidebar groups", groups, "tabs", tabs)

const settingsPage = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await mockWorkspace(settingsPage, {
  name: "flag-off-settings",
  flags: { working_directories: false },
  sessions: [session({ id: "ses_flag_settings", directory: "C:/OpenCode/FlagOff", title: "Flag off" })],
  seed: { locale: "en", settings: { appearance: { tabLayout: "horizontal" } }, tabs: ["ses_flag_settings"] },
})
await settingsPage.goto("http://127.0.0.1:4445/settings")
await settingsPage.locator('[data-component="interface-mode"]').waitFor({ state: "visible", timeout: 60000 })
const cards = settingsPage.locator('[data-slot="interface-mode-option"]')
console.log("flag-off cards", await cards.count(), await cards.allTextContents())

await browser.close()
