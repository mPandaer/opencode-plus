# 02: 添加工作目录并使用目录视图

**What to build:** 用户主动添加工作目录，在目录视图中查看该目录的会话，并从目录旁的“＋”直接创建会话。空目录和历史会话目录都能形成稳定入口，目录归属严格依据会话实际记录的工作目录。

**Blocked by:** 01 — 保留所选工作目录，完成子目录会话创建。

**Status:** implemented

## Comments

已完成实现并集成至 `desktop-directory-groups` (`35f58e5db0`)，最终独立核对通过。以下为历史阶段证据；最终结果及未完成的实机验收以 [acceptance.md](../acceptance.md) 为准，未勾选项不表示已人工验收。

2026-11-09：用户选择 A「安静目录树」作为正式侧边栏方向；方案、原型存档和验证记录见 [sidebar-a-decision.md](../sidebar-a-decision.md)。

## Implementation evidence

- Implementation `d4a6576958`, branch tip `7f0eb43fed` after clean integration96281dcc99 merge; independently fast-forward integrated at7f0eb43fed; main app units2583/0, app types and full root check32/32 passed; Windows workaround restored.
- Directory sidebar/catalog and per-server persistence in `sidebar-directories.tsx`; existing native chooser plus explicit server browser via `directory-add.tsx` and confirmation state machine. Default server Location effective flag keeps sidebar policy coherent across tabs.
- History discovery paginates nonarchived root Sessions (archived/child excluded consistent with prior sidebar policy); exact directory grouping, explicit empty entries and saved flat fallback.
- Implementer evidence: tabs66/66, new5flows repeated50/50, postmerge focused11/11, app units2584/0, postmerge root check32/32. Temporary Windows declaration workaround restored. E2E type errors remain documented; no changed-file diagnostics identified.
- Native picker, actual restart and new real-backend filesystem verification not performed. Strobe baseline New session timeout means no performance verdict. Final integrated review/acceptance pending.

- [ ] 添加目录支持系统文件夹选择器和已知项目内浏览；确认前显示完整路径，提交后保留实际选择的目录，取消或失败重试不会误添加其他目录。
- [ ] 支持仓库根目录、仓库子目录、无 Git 普通目录及空目录；同名目录通过项目或路径提示区分，不自动扫描 Maven 模块或添加未选择的子目录。
- [ ] 目录视图呈现“工作目录 → 会话”；主动添加的空目录保持可见，目录旁“＋”进入使用该目录的可确认草稿，并能创建实际位于该目录的会话。
- [ ] 未主动添加的历史会话目录可自动发现；按会话记录的实际工作目录归组，根目录和子目录各自只显示自己的会话，每个会话只出现一次，不根据标题或包含关系推断归属。
- [ ] 已添加目录及视图选择按服务器持久保存；重载后恢复，切换服务器不混用路径，切回原服务器恢复对应状态。后续关闭目录记录应能优先于历史发现。
- [ ] 新样式和新默认行为受仓库功能开关保护；启用新样式且尚无视图选择时优先目录视图，原有平铺视图继续可用，已有会话和展示状态不会丢失。
- [ ] 应用 E2E 覆盖添加、空目录重载、历史发现、父子目录不重复、同名目录、无 Git 目录、目录级新建及独立服务器状态；复用现有目录选择器和存储初始化设施。
- [ ] 系统原生文件夹选择器及桌面重启后的目录和视图恢复有实机验收记录；自动化覆盖选择结果进入应用后的流程，不要求自动操作原生对话框。
- [ ] 遵循匹配的测试技能，在受影响包运行相应测试及类型检查，并通过仓库完整检查。
