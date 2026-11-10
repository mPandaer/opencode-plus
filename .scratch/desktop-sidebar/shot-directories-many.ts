// Many open tabs in one directory: check the open dot column.
import { chromium } from "../../packages/app/node_modules/@playwright/test"
import { project, session, sessionHref } from "../../packages/app/e2e/utils/app"
import { mockWorkspace } from "../../packages/app/e2e/utils/workspace"

const out = "D:/projects/opencode-plus/.scratch/desktop-sidebar"
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await mockWorkspace(page, {
  name: "opencode-plus",
  flags: { working_directories: true },
  projects: [project({ id: "proj_modules", directory: "C:/OpenCode/Modules", name: "opencode-plus" })],
  sessions: [
    session({ id: "ses_root", directory: "C:/OpenCode/Modules", title: "优化侧边栏显示效果" }),
    session({ id: "ses_nav", directory: "C:/OpenCode/Modules", title: "目录分组与工作区导航" }),
    session({ id: "ses_scroll", directory: "C:/OpenCode/Modules", title: "修复会话切换后的滚动位置" }),
    session({ id: "ses_api", directory: "C:/OpenCode/Modules/api", title: "补齐订单服务的重试逻辑" }),
    session({ id: "ses_web", directory: "C:/OpenCode/Modules/web", title: "Greeting" }),
  ],
  seed: {
    locale: "zh",
    settings: { appearance: { tabLayout: "directories" } },
    tabs: ["ses_root", "ses_nav", "ses_scroll", "ses_api", "ses_web"],
  },
})

await page.goto(`http://127.0.0.1:4445${sessionHref("ses_root")}`)
await page.locator('[data-slot="vertical-tabs-sidebar"]').waitFor({ state: "visible", timeout: 60000 })
await page.evaluate(() => document.fonts.ready)
await page.locator('[data-slot="vertical-tabs-sidebar"]').screenshot({ path: `${out}/real-directories-a2-many.png` })
await browser.close()
console.log("done")
