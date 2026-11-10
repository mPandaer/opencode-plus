// Screenshot the working-directory confirmation dialog.
import { chromium } from "../../packages/app/node_modules/@playwright/test"
import { sessionHref } from "../../packages/app/e2e/utils/app"
import { fileNode, mockWorkspace } from "../../packages/app/e2e/utils/workspace"

const root = "C:/OpenCode/Picker"
const child = "C:\\OpenCode\\Picker\\empty"
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

await mockWorkspace(page, {
  name: "Picker",
  project: { sandboxes: [child] },
  worktrees: () => [{ directory: root }, { directory: child, strategy: "git" }],
  flags: { working_directories: true },
  sessions: [{ id: "ses_picker", title: "Root history" }],
  fileList: (path) => (path === root ? [fileNode(root, "empty", "directory")] : []),
  seed: { locale: "zh", settings: { appearance: { tabLayout: "directories" } } },
})

await page.goto(`http://127.0.0.1:4445${sessionHref("ses_picker")}`)
const sidebar = page.locator('[data-slot="vertical-tabs-sidebar"]')
await sidebar.getByRole("button", { name: "Add directory", exact: true }).click()
await page.getByRole("menuitem", { name: "Browse Picker", exact: true }).click()
const picker = page.getByRole("dialog", { name: "Add directory", exact: true })
await picker.getByRole("treeitem", { name: "empty", exact: true }).click()
await picker.getByRole("button", { name: "选择文件夹", exact: true }).click()
const confirm = page.getByRole("dialog", { name: "Confirm working directory", exact: true })
await confirm.waitFor({ state: "visible", timeout: 30000 })
await page.evaluate(() => document.fonts.ready)
await confirm.screenshot({
  path: "D:/projects/opencode-plus/.scratch/desktop-sidebar/confirm-directory.png",
  animations: "disabled",
  timeout: 60000,
})
await browser.close()
console.log("done")
