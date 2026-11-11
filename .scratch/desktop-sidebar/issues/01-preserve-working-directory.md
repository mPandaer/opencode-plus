# 01: 保留所选工作目录，完成子目录会话创建

**What to build:** 用户从现有目录选择入口选中仓库子目录后，该工作目录贯穿新会话草稿、Local 目标解析和最终会话创建。发送首条消息前可查看并修改完整路径；创建后的文件浏览、`@` 文件候选和工具默认操作使用同一工作目录，Git 继续识别外层仓库。

**Blocked by:** None (can start immediately).

**Status:** implemented

## Comments

已完成实现并集成至 `desktop-directory-groups` (`35f58e5db0`)，最终独立核对通过。以下为历史阶段证据；最终结果及未完成的实机验收以 [acceptance.md](../acceptance.md) 为准，未勾选项不表示已人工验收。

## Implementation evidence

- Integrated commit: `10aa80a14a` (`feat(app): preserve selected working directories`) on `desktop-directory-groups`.
- Implementer reports focused application E2E: 3 passed; real backend session-create suite: 3 passed / 52 assertions; affected app unit tests passed; root `bun run check` passed with temporary Windows symlink representation workaround restored afterwards.
- Effective flags are projected through `Location.Info.experimental.flags`, resolved at Location scope; client regenerated.
- Required Strobe navigation comparison was attempted but timed out on an existing New session locator; no usable performance comparison. Native desktop picker/manual checks remain unverified. Final integrated code review pending.
- Checklist remains unmarked until acceptance evidence is verified; this implementation unblocks dependent code work without claiming all manual acceptance complete.
- Independent integrated backend rerun initially failed (2 pass / 1 fail) on forbidden ripgrep download. Fixture fix `4707cf1530` is integrated and dependencies installed: real host-only npm binary via existing service override, no PATH/cache dependency. Default5s run then timed out; scoped15s followup `02152a34b0` reports 15/0 over five repetitions and17/0 with neighboring suites, without CLI timeout overrides. Both followups integrated; independent default package command covering session-create, session-admit-location and fetch passed17/0 with204assertions (21.99s), no PATH or CLI timeout overrides. Existing listener warnings only.

- [ ] 选择仓库子目录后，草稿保留实际选择的路径，发送首条消息前显示完整路径并允许修改；最终创建使用修改后的目录。
- [ ] Local 解析不会将所选子目录改写为仓库根目录；主动切换 checkout 的现有行为仍然有效，并有回归验收。
- [ ] 用同一 Git 仓库的根目录及两个子模块验证会话实际持久记录的工作目录；复用现有项目身份，不为每个子模块创建新的 Git 项目身份。
- [ ] 文件浏览、`@` 文件及目录候选和工具默认操作均使用会话工作目录；模块内外的可区分文件能证明默认搜索范围。
- [ ] 真实后端验证外层 Git 归属、分支及差异识别仍然有效；跨模块访问遵循现有权限，不新增子树沙箱。
- [ ] 应用 E2E 从用户选择目录到提交首条消息验证可见路径和请求目标；实际路径保存、文件检索及工具默认目录另用真实后端和隔离临时目录验证，不以模拟 API 断言替代。
- [ ] 按仓库实验性行为与功能开关规范交付新增行为；仅在确需调整公共契约时变更 API，并遵循代码生成和兼容规则。
- [ ] 复用对应产品区域的现有测试设施，遵循匹配的测试技能；在受影响包运行相应测试及类型检查，并通过仓库完整检查。
