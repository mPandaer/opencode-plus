// Throwaway fixture for the Directories interface-mode prototypes. Not production data.
export type SessionStatus = "working" | "approval" | "done"

export type DirectoryFault = "missing" | "file" | "denied" | "offline"

export interface PrototypeSession {
  id: string
  title: string
  status?: SessionStatus
}

export interface PrototypeDirectory {
  id: string
  name: string
  path: string
  sessions: PrototypeSession[]
  fault?: DirectoryFault
}

export interface PrototypeGroup {
  project?: { id: string; name: string; worktree: string }
  directories: PrototypeDirectory[]
}

const session = (id: string, title: string, status?: SessionStatus): PrototypeSession => ({ id, title, status })

export const normalGroups: PrototypeGroup[] = [
  {
    project: { id: "prj_opencode", name: "opencode-plus", worktree: "D:/projects/opencode-plus" },
    directories: [
      {
        id: "dir_opencode",
        name: "opencode-plus",
        path: "D:/projects/opencode-plus",
        sessions: [
          session("ses_1", "优化侧边栏显示效果", "working"),
          session("ses_2", "目录分组与工作区导航"),
          session("ses_3", "修复会话切换后的滚动位置"),
        ],
      },
      {
        id: "dir_groups",
        name: "desktop-directory-groups",
        path: "D:/worktrees/desktop-directory-groups",
        sessions: [
          session("ses_4", "验证桌面端目录分组", "approval"),
          session("ses_5", "处理长路径的显示与截断"),
        ],
      },
    ],
  },
  {
    project: { id: "prj_site", name: "personal-site", worktree: "D:/projects/personal-site" },
    directories: [
      {
        id: "dir_site",
        name: "personal-site",
        path: "D:/projects/personal-site",
        sessions: [session("ses_6", "调整文章页排版"), session("ses_7", "添加深色主题", "done")],
      },
    ],
  },
  {
    directories: [
      {
        id: "dir_notes",
        name: "notes",
        path: "D:/notes",
        sessions: [session("ses_8", "整理本周的开发记录")],
      },
      {
        id: "dir_archive",
        name: "opencode-plus",
        path: "D:/archive/opencode-plus",
        sessions: [session("ses_9", "回看旧版本的侧边栏实现")],
      },
      {
        id: "dir_long",
        name: "非常长的模块目录名 with spaces 和中文",
        path: "D:/projects/mall/非常长的模块目录名 with spaces 和中文/src/main/java/com/example/order",
        sessions: [session("ses_10", "确认长路径的截断与完整路径提示")],
      },
    ],
  },
]

export const badGroups: PrototypeGroup[] = [
  {
    project: { id: "prj_opencode", name: "opencode-plus", worktree: "D:/projects/opencode-plus" },
    directories: [
      {
        id: "dir_opencode",
        name: "opencode-plus",
        path: "D:/projects/opencode-plus",
        sessions: [session("ses_1", "优化侧边栏显示效果", "working"), session("ses_3", "修复会话切换后的滚动位置")],
      },
      {
        id: "dir_missing",
        name: "order-service",
        path: "D:/work/mall/order-service",
        sessions: [session("ses_11", "补齐订单服务的重试逻辑", "approval")],
        fault: "missing",
      },
      {
        id: "dir_denied",
        name: "payment-service",
        path: "D:/work/mall/payment-service",
        sessions: [session("ses_12", "排查支付回调超时")],
        fault: "denied",
      },
    ],
  },
  {
    project: { id: "prj_tools", name: "tooling", worktree: "E:/offline/tooling" },
    directories: [
      {
        id: "dir_offline",
        name: "tooling",
        path: "E:/offline/tooling",
        sessions: [session("ses_13", "整理构建脚本")],
        fault: "offline",
      },
      {
        id: "dir_file",
        name: "release-notes.md",
        path: "D:/work/release-notes.md",
        sessions: [],
        fault: "file",
      },
    ],
  },
  {
    directories: [
      {
        id: "dir_notes",
        name: "notes",
        path: "D:/notes",
        sessions: [session("ses_8", "整理本周的开发记录")],
      },
    ],
  },
]

export const emptyGroups: PrototypeGroup[] = []
