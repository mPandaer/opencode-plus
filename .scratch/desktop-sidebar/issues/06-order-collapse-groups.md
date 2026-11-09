# 06: 稳定排列、拖动与折叠分组

**What to build:** 用户按工作习惯拖动排列项目和工作目录，折叠暂时不用的分组，并在视图切换和重启后保留布局。会话活动只影响组内排序，不使项目或目录组跳动。

**Blocked by:** 03 — 按项目查看目录，并从项目入口新建。

**Status:** implemented

## Comments

已完成实现并集成至 `desktop-directory-groups` (`35f58e5db0`)，最终独立核对通过。以下为历史阶段证据；最终结果及未完成的实机验收以 [acceptance.md](../acceptance.md) 为准，未勾选项不表示已人工验收。

## Implementation evidence

- Branch directory-group-order final4b5b71556d includes integration21f6559957 and combined07/08 merge98e5645de3; own commitsb0b23e3f8f/1d3de87d4d/3525edc455/4b5b71556d. Common06/07 final candidate pending.
- Real project/directory DnD, stable added/discovered order, relative directory order shared across views, per-server collapse/order. Filtered project drag regression fixed preserving hidden positions.
- Implementer pointer-drag/activity/fold/reload/server-isolation tests20/20 repetitions, app types,rootcheck32/32(670warnings0errors),appunits2584/0,diffcheck passed; Windows workaround restored.
- E2E type suite still fails documented areas, no changed tabs errors after fixture metadata correction. Origin/dev Strobe baseline locator timeout no performance verdict. Native/restart unverified.
-07 owns full common tabs verification including final4b5 test-only metadata fixture.

- [ ] 项目和工作目录默认按添加顺序排列，支持拖动调整；历史自动发现的目录加入后不会打乱已有分组的相对顺序。
- [ ] 两种分组视图使用一致的目录顺序；项目视图在每个项目内沿用目录视图中的相对目录顺序，拖动不改变项目身份或会话实际归属。
- [ ] 项目组和目录组可折叠及展开；切换视图保留适用分组的折叠状态。
- [ ] 组内会话按最近活跃排序；会话收到新活动后只调整所在组内会话顺序，项目组和目录组位置保持稳定。
- [ ] 项目顺序、目录顺序及折叠状态按服务器持久保存，重载后恢复；独立服务器可保存不同顺序与折叠状态，切回时正确恢复。
- [ ] 应用 E2E 从用户拖动、折叠和会话活动开始，验证可见顺序、视图间相对顺序、重载恢复和服务器隔离，不复制内部排序算法作为断言。
- [ ] 桌面重启后顺序和折叠状态恢复有实机验收记录。
- [ ] 遵循匹配的测试技能，在受影响包运行相应测试及类型检查，并通过仓库完整检查。
