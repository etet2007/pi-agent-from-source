# ForNextJob Pi 材料迁移记录

日期：2026-10-24。

## 来源与去向

源仓库：`/Users/qitianliu/Documents/AndroidProjects/ForNextJob`，迁移前 HEAD `11ab48a`。
目标：`/Users/qitianliu/Documents/AndroidProjects/AiSharing/pi-agent-from-source`，迁移前 HEAD `9d76c4e`；它是独立 Git 仓库，不属于外层 AiSharing 的提交范围。

| 原目录 | 新目录 | 迁移校验条目数 |
|---|---|---:|
| `pi-agent-study/` | `archive/pi-agent-study/` | 22990 |
| `pi-agent-course-video/` | `course-video/` | 171 |

移动包含跟踪文件、未跟踪文件、依赖、音视频和本地修改。移动完成、路径修正前，逐文件 SHA-256、权限以及符号链接目标与迁移前清单全部一致。原位置只留下 README 入口。旧 Git 提交历史仍留在源仓库；本次没有把两个仓库的历史合并。

迁移前工作区状态、原始本地差异补丁、逐文件校验清单在本机 `.tmp/migration-2026-10-24/`，由 Git 忽略。该清单是迁移时的快照；后续明确的路径与说明更新会使对应文件哈希变化。

## 维护入口与版本

1. 当前短分享：`presentation/practical/`，固定源码 `784653468c42387f607d41ed5ca533100e7eb2fe`，包字段 0.83.0。
2. 深入阅读：`book/` 与 `book/en/`。
3. 长视频：`course-video/`；历史稿件和证据仍放在 `archive/pi-agent-study/`，通过链接引用。
4. 旧源码：`archive/pi-agent-study/pi/`，基准 `130ae577acd76ea2f040f2e357b0f3e730a53883`，本地包 0.78.1，并含既有修改。

本次完成存放位置和入口统一，保留不同版本的内容。旧网页、旧课程与当前分享之间尚未做逐段去重或事实迁移。引用旧证据时保留基准版本。

## 路径更新

- 视频 capture shell 脚本及 fixture tape：指向新 `archive/pi-agent-study/`。
- capture README：命令改为 `course-video/long-course`。
- 两份主 README：增加当前短分享、书籍、视频及归档入口；说明媒体本地保存和各自许可边界。
- 两个仓库的维护指南：增加迁移位置，避免继续维护旧目录。

## 已知历史缺口

- `pi-agent-video-fixture/` 在迁移前已不存在，旧 discount 演示不能直接重录；不要用 greeting fixture 冒充相同证据。
- `pi-agent-learning-plan.md` 在迁移前已被本地删除，维持该状态。
- 旧文稿中的绝对路径、时间码、版本描述及历史验证记录未批量改写。
- 没有改动当前短分享、书籍和只读 `pi-agent-src/` 子模块。
- 视频和依赖已在本地迁移，沿用忽略规则；本次没有提交或推送迁移。

## 验证

逐文件迁移一致性已通过。其余迁移后检查结果在本节追加；不将静态检查等同于播放或渲染验收。

- 二次检查覆盖全部迁入条目，只有 10 个明确修正路径的文件内容变化，其余原文件内容与权限保持一致。
- 检查源仓库 929 条跟踪路径：除迁移前已删除的学习计划外，其余文件在目标存在且均未被目标忽略规则隐藏。
- 两份主 README、视频 README、归档 README 和两个原目录入口，共 30 条本地链接有效。
- 全部 capture shell 脚本通过 `bash -n`；实际加载 `lib.sh` 后能找到新位置的旧版源码取证脚本。
- 音频、MP4 和依赖仍被 Git 忽略；只读子模块仍为 `784653468`。
- 当前短分享的 `node minimal-harness.mjs` 与 `node demo.mjs` 均退出 0；后者验证 5 次预设模型请求、4 次真实 fixture 工具执行、测试先失败后通过和最终 `agent_end`。Node 输出了 TypeScript 类型移除 API 的实验特性提示。
- 迁入的旧源码 `./pi-test.sh --help` 退出 0，保留原有中文调试日志；本次没有向模型提交任务。
- 两个仓库的 `git diff --check` 通过。未重新渲染视频、未检查媒体播放，未安装旧 React 网页依赖或构建该网页。
