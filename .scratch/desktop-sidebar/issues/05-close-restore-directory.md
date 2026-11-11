# 05: 关闭目录并通过重新添加恢复

**What to build:** 用户通过“关闭目录”整理侧边栏，同时保留磁盘文件和会话历史。主动关闭的目录不会因历史发现而重新出现，只有重新添加同一路径才恢复入口及其历史会话。

**Blocked by:** 02 — 添加工作目录并使用目录视图。

**Status:** implemented

## Comments

已完成实现并集成至 `desktop-directory-groups` (`35f58e5db0`)，最终独立核对通过。以下为历史阶段证据；最终结果及未完成的实机验收以 [acceptance.md](../acceptance.md) 为准，未勾选项不表示已人工验收。

## Implementation evidence

- Integrated final `a117014328` (implementation347e6ee3bd, integration mergeca4d967ead, closed schema repaira117014328), independent fast-forward no conflicts.
- Independent37 persistence/sidebar tests pass; exact normalized-path close/readd, closed schema and history exclusion verified shared across Directory/Project views.
- Implementer full tabs72/72, both-view20/20repeats, earlier lifecycle40/40, units2583/0, serialized root check and server types passed. Real-backend UI verifies unchanged Session/history/directory/file contents and no duplicate Session.
- Ancillary server session-create/session-admit-location/fetch runs13/4 then14/3: OAuth recovery/ports-busy and Session request-routing2s timeouts; no measured baseline attribution. Final idle serialized rerun required.
- Native picker/actual desktop restart unverified; Strobe origin/dev New session locator timeout means no performance verdict. Final integrated code review pending.
-08 server-owned directory state migration must retain `closed` durable field and exact re-add semantics.

- [ ] 操作名称为“关闭目录”，并明确说明会话历史仍会保留；关闭后隐藏该目录入口，适用于空目录和有历史会话的目录。
- [ ] 关闭不删除或修改磁盘文件，不删除会话或迁移会话实际工作目录，也不关闭其他父目录、子目录或同名目录。
- [ ] 主动关闭记录优先于历史会话发现；重载、历史列表刷新和桌面重启后，关闭过的目录不会被自动重新展示。
- [ ] 重新添加同一路径后移除其关闭状态，恢复目录入口及原有会话，不重复创建会话；添加其他路径不恢复该目录。
- [ ] 关闭记录按服务器持久保存；相同路径字符串在另一台服务器上的入口不受影响，切回原服务器仍保持关闭结果。
- [ ] 应用 E2E 覆盖关闭、历史再次发现、重载、重新添加恢复和服务器隔离；如项目视图已交付，在两种分组视图中遵循相同关闭语义。
- [ ] 使用真实后端及隔离临时目录验证关闭和重新添加后会话持久记录及磁盘文件未删除；桌面重启后关闭状态的恢复有实机验收记录。
- [ ] 遵循匹配的测试技能，在受影响包运行相应测试及类型检查，并通过仓库完整检查。
