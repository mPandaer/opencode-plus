# 04: 全局新建沿用当前或上次工作目录

**What to build:** 用户通过全局新建连续处理同一工作目录的任务：有当前会话时沿用其目录，没有当前会话时沿用当前服务器上次使用的目录，首次使用没有默认目录时先选择。发送前可确认或修改目录。

**Blocked by:** 01 — 保留所选工作目录，完成子目录会话创建。

**Status:** implemented

## Comments

已完成实现并集成至 `desktop-directory-groups` (`35f58e5db0`)，最终独立核对通过。以下为历史阶段证据；最终结果及未完成的实机验收以 [acceptance.md](../acceptance.md) 为准，未勾选项不表示已人工验收。

## Implementation evidence

- Commit `96281dcc99` integrated by independently verified fast-forward on `desktop-directory-groups`, no conflicts. Main app units2654/0 and diff check/lint passed. Independent root `bun run check` passed after temporary Windows declaration workaround; original link-target text restored. Completed task-owned worktree removed with per-command Git long-path support.
- Implements current Session directory → per-server persisted last-used directory → explicit picker; successful submission remembers final edited directory. Canonical server scope and effective Core `working_directories` flag preserve legacy disabled behavior.
- Shared Local submission correction uses selected SDK directory instead of Project root for non-managed locations; coordinated with02.
- Implementer reports new E2E40/40 at5workers, final4/4; app units2582/0; app types and root check32/32 passed with temporary Windows declaration workaround restored.
- Full new-session + multi-server keepers:52pass/2fail (POSIX/Windows long-path overflow); baseline not measured, not classified as pre-existing.
- Strobe origin/dev comparison failed waiting for New session; no performance verdict. E2E typecheck has recorded existing fixture/Vite declaration errors. Native picker/restart and new real-backend run not performed.
- Final integrated review/acceptance pending; checklist intentionally not marked from implementer report alone.

- [ ] 全局新建优先使用当前会话实际记录的工作目录，即使它是仓库子目录，也不替换为项目根目录。
- [ ] 无当前会话时使用当前服务器上次使用的工作目录；既无当前会话也无上次目录时，要求选择目录后进入草稿，不静默选择仓库根目录。
- [ ] 从 Home、设置等无当前会话的页面使用全局新建时遵循同一规则；取消选择不会创建会话。
- [ ] 发送首条消息前显示完整工作目录并允许修改；最终会话使用确认后的目录，上次使用目录的记录与用户实际使用的目录保持一致。
- [ ] 上次使用的目录按服务器持久保存，重载后可用；切换服务器不沿用其他服务器的目录，切回原服务器恢复对应记录。
- [ ] 新默认行为遵循仓库功能开关规范，与其他工作目录创建入口使用相同的目录保留契约。
- [ ] 应用 E2E 覆盖当前目录优先于上次目录、无当前会话回退、首次选择、发送前修改、取消、重载和多服务器隔离，并断言最终创建请求目标。
- [ ] 遵循匹配的测试技能，在受影响包运行相应测试及类型检查，并通过仓库完整检查。
