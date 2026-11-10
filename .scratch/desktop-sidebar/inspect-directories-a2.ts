// Measure the revised directory row geometry.
import { chromium } from "../../packages/app/node_modules/@playwright/test"
import { project, session, sessionHref } from "../../packages/app/e2e/utils/app"
import { mockWorkspace } from "../../packages/app/e2e/utils/workspace"

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await mockWorkspace(page, {
  name: "opencode-plus",
  flags: { working_directories: true },
  projects: [project({ id: "proj_modules", directory: "C:/OpenCode/Modules", name: "opencode-plus" })],
  sessions: [
    session({ id: "ses_root", directory: "C:/OpenCode/Modules", title: "优化侧边栏显示效果" }),
    session({ id: "ses_nav", directory: "C:/OpenCode/Modules", title: "目录分组与工作区导航" }),
    session({ id: "ses_api", directory: "C:/OpenCode/Modules/api", title: "补齐订单服务的重试逻辑" }),
  ],
  seed: {
    locale: "zh",
    settings: { appearance: { tabLayout: "directories" } },
    tabs: ["ses_root", "ses_api"],
  },
})

await page.goto(`http://127.0.0.1:4445${sessionHref("ses_root")}`)
await page.locator('[data-slot="vertical-tabs-sidebar"]').waitFor({ state: "visible", timeout: 60000 })
await page.evaluate(() => document.fonts.ready)

const result = await page.evaluate(() => {
  const sidebar = document.querySelector('[data-slot="vertical-tabs-sidebar"]')!
  const side = sidebar.getBoundingClientRect()
  const rect = (element: Element) => {
    const box = element.getBoundingClientRect()
    return { x: Math.round((box.x - side.x) * 10) / 10, w: Math.round(box.width * 10) / 10 }
  }
  return [...sidebar.querySelectorAll<HTMLElement>(".sidebar-directory-heading, [data-titlebar-tab-action]")].map(
    (row) => {
      const heading = row.classList.contains("sidebar-directory-heading")
      const content = row.querySelector<HTMLElement>(heading ? ".sidebar-directory-fold > div" : "[dir=auto]")
      const slot = row.querySelector<HTMLElement>(":scope > span")
      const before = getComputedStyle(row, "::before")
      return {
        kind: heading ? "heading" : "session",
        label: heading ? row.getAttribute("aria-label") : row.getAttribute("title"),
        row: rect(row),
        content: content ? rect(content) : undefined,
        slot: slot ? rect(slot) : undefined,
        pill: heading
          ? undefined
          : { left: before.left, right: before.right, width: before.width, background: before.backgroundColor },
      }
    },
  )
})
console.log(JSON.stringify(result, null, 2))
await browser.close()
