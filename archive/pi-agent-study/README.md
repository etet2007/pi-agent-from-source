# 旧版 Pi Agent 学习资料

2026-10-24 从 `ForNextJob/pi-agent-study/` 整体迁入，保留当时工作区内容及未提交修改。本目录作为历史资料保存；当前分享请从 [`../../presentation/practical/outline.md`](../../presentation/practical/outline.md) 开始。

| 内容 | 入口 |
|---|---|
| 入门概览 | [1.pi-agent-overview.md](1.pi-agent-overview.md) |
| 完整课程 | [2.pi-agent-complete-course.md](2.pi-agent-complete-course.md) |
| 40 页分享大纲 | [pi-agent-ppt-outline.md](pi-agent-ppt-outline.md) |
| 长视频逐字稿 | [pi-agent-video-script.md](pi-agent-video-script.md) |
| 源码与运行取证 | [pi-agent-video-evidence.md](pi-agent-video-evidence.md) |
| 旧 React 源码导航网页 | `share-web/` |
| 旧版源码及来源 | `pi/`、[UPSTREAM.md](UPSTREAM.md) |

旧源码基准为 `130ae577acd76ea2f040f2e357b0f3e730a53883`，本地包版本 0.78.1；本目录包含在该基准之上的本地修改。它与主项目的 `pi-agent-src/` 子模块分开保存。

文稿里的旧绝对路径、时间码和“已验证”记录属于历史记录，不代表迁移后的运行结果。`pi-agent-learning-plan.md` 在迁移前已经被本地删除，本次没有恢复。

如需查看旧网页，在 `share-web/` 中运行 `npm run dev`；构建为 `npm run build`。源码片段提取仍读取相邻的 `pi/`。新内容优先补充主项目，旧网页功能暂未并入短分享。

迁移清单及验证结果见 [迁移记录](../../research/2026-10-24-fornextjob-migration.md)。
