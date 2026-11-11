# 08: 目录不可用时保留历史并阻止错误执行

**What to build:** 工作目录移动、删除或磁盘不可用时，用户仍能找到目录组并查看历史，理解无法执行的原因。创建或继续执行前要求恢复原路径或选择新位置，不静默使用 Git 根目录，也不将旧会话关联到新位置。

**Blocked by:** 02 — 添加工作目录并使用目录视图。

**Status:** implemented

## Comments

已完成实现并集成至 `desktop-directory-groups` (`35f58e5db0`)，最终独立核对通过。以下为历史阶段证据；最终结果及未完成的实机验收以 [acceptance.md](../acceptance.md) 为准，未勾选项不表示已人工验收。

## Implementation evidence

- Branch `missing-directory`, final21f6559957 includes currenta117014328; independently fast-forward integrated at21f6559957. Canonical backend final18/0 (177assertions), core/server types and client regeneration match passed. Initial combined15/3 timeout failures then fetch13/0 and combined18/0 under active load; final idle serial run pending. Commitsdf25b90929/0303513dd8/42680a82f2/87f070f57e/21f6559957.
- Fresh local checks at Location HTTP/create/fresh prompt and actual runner drain/step detect warm deletion without cache invalidation. History/control admission and idempotent reconciliation remain independent; explicit workspace skips host probe; no sandbox.
- Server-owned ctx.directories state supports recovery without mounted sidebar, retains closed/project view. Flagged recovery retries original or confirms+adds replacement without Session.move.
- Implementer real ServerFetch cold/warm delete+restore10/10, backend18/18, core48/48, app2592/0, location-sync11/11, recovery3cases×10=30/30. Real restored shell writes original module and no root marker; prompt resume:false restored success, old Session unchanged after new location added.
- Root checks/affected types/generation/protocol identifiers passed, Windows workaround restored. Shared parallel UI check4/5 failed empty-directory draft locator, isolated rerun passed: concurrency gap not baseline-classified.
- Native picker/restart/offline-access-denied/model-generated tool execution not exercised; actual restored shell cwd proven. E2E types documented failures; strobe viewport VariantMismatch no performance verdict. Final integrated review pending.

- [ ] 目录不可用时保留目录组和历史入口，显示“目录不可用”，用户仍可查看旧会话历史。
- [ ] 在不可用目录创建会话或继续执行旧会话前受阻，并提示恢复原路径或选择新位置；不发送以仓库根目录或其他目录替代的执行请求。
- [ ] 恢复原路径后，可重新尝试并继续原会话，实际执行仍使用原目录，不需要迁移会话。
- [ ] 选择新位置仅添加新工作目录，不修改旧会话的位置或历史归属；旧目录与旧会话保持原有关系，新目录可按正常流程创建自己的会话。
- [ ] 不可用状态不导致目录入口被丢弃、自动关闭或清除持久记录；适用于仓库子目录及无 Git 目录。
- [ ] 所有已经交付的新建入口遵循相同的不可用目录约束；后续接入的全局或项目新建入口复用该约束，不为不存在的目录静默回退。
- [ ] 应用 E2E 验证不可用提示、历史可读、创建和继续执行受阻、恢复重试以及选择新位置的界面流程和请求目标。
- [ ] 使用真实后端及隔离临时目录验证目录移走或删除、无根目录回退、原路径恢复后执行成功，以及新位置未改写旧会话持久记录；模拟 API 用例不能代替这些证明。
- [ ] 遵循匹配的测试技能，在受影响包运行相应测试及类型检查，并通过仓库完整检查；如确需修改公共契约，遵循代码生成和兼容规则。
