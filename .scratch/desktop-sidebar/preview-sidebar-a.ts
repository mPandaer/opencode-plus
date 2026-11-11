// One-off visual smoke using the existing isolated browser fixture.
import { chromium } from "../../packages/app/node_modules/@playwright/test"
import { mockWorkspace } from "../../packages/app/e2e/utils/workspace"
import { sessionHref } from "../../packages/app/e2e/utils/app"

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, serviceWorkers: "block" })
await mockWorkspace(page, {
  name: "opencode-plus",
  sessions: [
    { id: "ses_sidebar_a", title: "优化侧边栏显示效果" },
    { id: "ses_sidebar_b", title: "目录分组与工作区导航" },
    { id: "ses_sidebar_c", title: "验证桌面端目录分组", directory: "C:/OpenCode/opencode-plus/desktop-directory-groups" },
    { id: "ses_sidebar_d", title: "处理长路径的显示与截断", directory: "C:/OpenCode/opencode-plus/desktop-directory-groups" },
  ],
  seed: { locale: "zh", settings: { appearance: { tabLayout: "vertical" } }, tabs: ["ses_sidebar_a"] },
})
await page.goto(`http://127.0.0.1:31988${sessionHref("ses_sidebar_a")}`)
await page.locator(".sidebar-directories").waitFor({ state: "visible", timeout: 60000 })
await page.locator(".sidebar-directory").getByText("优化侧边栏显示效果", { exact: true }).waitFor({ state: "visible" })
await page.locator('[data-component="composer-editor"]').waitFor({ state: "visible", timeout: 60000 })
await page.screenshot({ path: "D:/projects/opencode-plus/.scratch/desktop-sidebar/sidebar-a-production.png" })
console.log("Production sidebar screenshot captured")
await browser.close()
