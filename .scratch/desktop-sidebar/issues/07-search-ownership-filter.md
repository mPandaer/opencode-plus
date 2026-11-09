# 07: 搜索和多选归属筛选，并保证新会话可见

**What to build:** 用户通过名称搜索和多选项目、工作目录缩小侧边栏展示范围，保持当前分组结构。筛选不改变新会话的工作目录；新建成功后自动让被筛选隐藏的新会话可见。

**Blocked by:** 03 — 按项目查看目录，并从项目入口新建；04 — 全局新建沿用当前或上次工作目录。

**Status:** implemented

## Comments

已完成实现并集成至 `desktop-directory-groups` (`35f58e5db0`)，最终独立核对通过。以下为历史阶段证据；最终结果及未完成的实机验收以 [acceptance.md](../acceptance.md) 为准，未勾选项不表示已人工验收。

## Implementation evidence

- Common06/07 candidateb3fe514e08 on directory-search includes latest21f6559957. Independent merger in progress; remaining inbox status failure under current-vs-parent comparison.
- Title/directory/project search+multi-select ownership retain hierarchy; transient per-server filters; creation current/last/explicit/project targets unaffected. Successful-create-only reveal clears only blocking conditions and expands both groups; pending/failed creates retain filters.
- Final focused repeats40/40,appunits2584/0,rootcheck32/32; no changed-file E2E diagnostics but global E2E typecheck remains failing.
- Full tabs75/76: inbox expected empty status received New live question is working; not baseline-classified. No full-green claim.
- Origin/dev Strobe New session locator timeout no performance verdict; desktop restart unverified. Clean worktree and temporary declaration restored; final integrated review pending.

- [ ] 名称搜索覆盖会话标题、目录名及项目名，不搜索会话正文；归属筛选支持多选项目和工作目录，并可与文本搜索组合使用。
- [ ] 搜索和筛选结果保留当前目录视图或项目视图的结构；清空条件后恢复完整列表，不改变会话实际归属。
- [ ] 筛选只影响展示：目录级新建使用该目录，项目级新建先选择目录，全局新建仍依次采用当前会话目录、上次使用目录或要求选择。
- [ ] 覆盖“当前会话在订单模块、筛选支付模块”的场景：全局新建仍使用订单目录；支付模块旁“＋”仍使用支付目录。
- [ ] 创建成功后，若搜索或归属筛选使新会话不可见，则清空阻挡它的筛选条件，并展开所在项目组及目录组，保证新会话可见；无阻挡条件时不无故清空筛选。
- [ ] 搜索和归属筛选为临时状态，应用重载和桌面重启后清空；不同服务器的当前视图不混用临时条件，长期目录及布局状态保持原有持久化契约。
- [ ] 应用 E2E 覆盖三类名称匹配、多选与组合筛选、结构保持、清空恢复、三类新建入口的目录不受筛选影响、新建后可见及重载清空；断言可见结果和创建请求目标。
- [ ] 桌面重启后临时条件清空有实机验收记录；遵循匹配的测试技能，在受影响包运行相应测试及类型检查，并通过仓库完整检查。
