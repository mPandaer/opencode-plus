# 03: 按项目查看目录，并从项目入口新建

**What to build:** 用户可切换到项目视图，以“项目 → 工作目录 → 会话”管理同仓库多个工作目录，并从项目旁的“＋”选择工作目录后创建会话。

**Blocked by:** 02 — 添加工作目录并使用目录视图。

**Status:** implemented

## Comments

已完成实现并集成至 `desktop-directory-groups` (`35f58e5db0`)，最终独立核对通过。以下为历史阶段证据；最终结果及未完成的实机验收以 [acceptance.md](../acceptance.md) 为准，未勾选项不表示已人工验收。

## Implementation evidence

- Commit `610dd6a4d7` on `sidebar-project-view`, based current integration7f0eb43fed; independently fast-forward integrated; app types2336files and11focusedtests passed. Root check stopped at one lint error scanning active nested worktrees; standalone structured lint then warnings-only, not conclusively diagnosed. Final root check pending.
- Hierarchy and project+ selection E2Es red→green; three focused cases pass including server-local view persistence,30/30 concurrent repetitions.
- Implementer app units2583/0 (9200assertions), app types and root check passed, Windows workaround restored.
- Full tabs first attempt blocked before tests by concurrent benchmark build dist cleanup ENOTEMPTY; serialized retry68/68passed, fully parallel5workers0retry.
- Mandated origin/dev Strobe exp_f88ac9 RunIncomplete waiting New session locator, exit4; no performance conclusion. Native/restart unverified. Final integrated review pending.

- [ ] 项目视图呈现“项目 → 工作目录 → 会话”；同一 Git 仓库的根目录和子目录共享项目身份，不为子模块创建独立 Git 项目身份。
- [ ] 无 Git 的工作目录在项目视图中独立成组；同名工作目录仍可通过项目或路径提示区分。
- [ ] 目录视图与项目视图展示一致的会话归属，每个会话只出现一次；切换视图不改变会话记录或工作目录。
- [ ] 项目旁“＋”先要求选择该项目下的工作目录，再进入显示完整路径且允许修改的草稿；不会未经选择直接使用项目根目录。
- [ ] 发送首条消息后会话实际创建于所选工作目录，并显示在对应项目下的目录组；取消目录选择不创建会话。
- [ ] 视图选择按服务器保存，重载和服务器切换后正确恢复；继续沿用新分组样式的功能开关和保留平铺视图的约定。
- [ ] 应用 E2E 覆盖同仓库双子模块、根目录、同名目录、无 Git 目录、视图切换、项目级选择和创建请求目标；复用既有测试集合。
- [ ] 遵循匹配的测试技能，在受影响包运行相应测试及类型检查，并通过仓库完整检查。
