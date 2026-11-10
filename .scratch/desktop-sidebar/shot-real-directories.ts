// Real-shell screenshot of the shipped Directories interface mode with the shared E2E mock.
import { chromium } from "../../packages/app/node_modules/@playwright/test"
import { project, session, sessionHref } from "../../packages/app/e2e/utils/app"
import { mockWorkspace } from "../../packages/app/e2e/utils/workspace"

const out = "D:/projects/opencode-plus/.scratch/desktop-sidebar"
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on("console", (message) => {
  if (message.type() === "error") console.log("console error:", message.text())
})
page.on("pageerror", (error) => console.log("page error:", error.message))

await mockWorkspace(page, {
  name: "opencode-plus",
  flags: { working_directories: true },
  projects: [
    project({ id: "proj_modules", directory: "C:/OpenCode/Modules", name: "opencode-plus" }),
    project({ id: "proj_other", directory: "C:/OpenCode/Other", name: "personal-site" }),
    project({ id: "global", directory: "C:/Notes", vcs: undefined }),
  ],
  sessions: [
    session({ id: "ses_root", directory: "C:/OpenCode/Modules", title: "优化侧边栏显示效果" }),
    session({ id: "ses_nav", directory: "C:/OpenCode/Modules", title: "目录分组与工作区导航" }),
    session({ id: "ses_scroll", directory: "C:/OpenCode/Modules", title: "修复会话切换后的滚动位置" }),
    session({ id: "ses_api", directory: "C:/OpenCode/Modules/api", title: "补齐订单服务的重试逻辑" }),
    session({ id: "ses_web", directory: "C:/OpenCode/Modules/web", title: "处理长路径的显示与截断" }),
    session({ id: "ses_other_api", directory: "C:/OpenCode/Other/api", title: "回看旧版本的侧边栏实现" }),
    session({ id: "ses_notes", directory: "C:/Notes", title: "整理本周的开发记录" }),
  ],
  seed: { locale: "zh", settings: { appearance: { tabLayout: "directories" } }, tabs: ["ses_root"] },
})

await page.goto(`http://127.0.0.1:4445${sessionHref("ses_root")}`)
await page.locator('[data-slot="vertical-tabs-sidebar"]').waitFor({ state: "visible", timeout: 60000 })
await page.locator('[data-slot="vertical-tabs-sidebar"]').getByRole("group", { name: "C:/OpenCode/Modules/api" }).waitFor()
await page.evaluate(() => document.fonts.ready)
await page.screenshot({ path: `${out}/real-directories.png` })

await page.locator('[data-slot="vertical-tabs-sidebar"]').getByText("opencode-plus", { exact: true }).first().hover()
await page.screenshot({ path: `${out}/real-directories-project-hover.png` })

await page.locator(".sidebar-directory-heading").first().hover()
await page.screenshot({ path: `${out}/real-directories-row-hover.png` })

await page.getByRole("button", { name: "Search sessions and groups" }).click()
await page.screenshot({ path: `${out}/real-directories-search.png` })

await page.goto("http://127.0.0.1:4445/settings")
const interfaceMode = page.locator('[data-component="interface-mode"]')
await interfaceMode.waitFor({ state: "visible", timeout: 60000 })
await interfaceMode.scrollIntoViewIfNeeded()
await page.screenshot({ path: `${out}/real-interface-mode.png` })

await browser.close()
console.log("done")
