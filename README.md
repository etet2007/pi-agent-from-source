# Pi Agent 源码解析

[ **中文** | [English](README.en.md) ]

一份教育性的源码分析笔记：逐行拆解 [Pi Agent](https://pi.dev)（`@earendil-works/pi-coding-agent` 及其同族包）——一个刻意保持最小化的开源编码 Agent（版本 `v0.83.0`）。

全书以中文写成，用**零依赖 HTML** 直接编写（仅 `book/style.css` 与 `book/common.js` 两个共享文件），无构建步骤、无第三方库，浏览器打开即可阅读。英文版位于 `book/en/`（部署后以 `/en/...` 访问）。

## 统一材料入口（2026-10-24）

| 用途 | 入口 | 维护定位 |
|---|---|---|
| 当前现场分享 | [presentation/practical/outline.md](presentation/practical/outline.md) | 21 页短分享、最小 harness 与源码执行回放，优先维护 |
| 深入阅读 | [book/index.html](book/index.html) | 中文书籍；英文版位于 `book/en/` |
| 长课视频 | [course-video/README.md](course-video/README.md) | 从 ForNextJob 迁入的旁白、动画、素材和本地成片 |
| 历史学习资料 | [archive/pi-agent-study/README.md](archive/pi-agent-study/README.md) | 旧课程、证据、React 网页及 0.78.1 源码副本 |
| 迁移与版本说明 | [research/2026-10-24-fornextjob-migration.md](research/2026-10-24-fornextjob-migration.md) | 来源、路径、校验和待处理事项 |

短分享固定源码提交为 `784653468`；迁入的旧课程基于 `130ae577`（包版本 0.78.1）。吸收旧内容前逐项核对版本与证据。历史资料保持原文，本次没有进行内容去重。
媒体和依赖在本机一并移动，仍由 Git 忽略；现有 Pages 工作流只部署书籍。
本书的许可声明适用于书籍；迁入材料保留原来源与许可文件，迁移不改变其授权。

## 如何阅读

- **在线**：<https://kuwii.xyz/pi-agent-from-source/>；英文版在 `/en/` 下（<https://kuwii.xyz/pi-agent-from-source/en/>）
- **本地**：直接用浏览器打开 `book/index.html` 即可（`file://` 协议，无需起服务器或安装任何依赖）；英文版打开 `book/en/index.html`

## 关于本书

Pi Agent 是"最小化"路线的一个极端样本：九个职责单一的 npm 包、一个干净的两层嵌套 Agent 循环、没有内置的逐工具权限审批（把隔离交给容器）、没有 MCP（把扩展性交给强类型 `ExtensionAPI`）。它用"复杂性守恒"把每一份额外的复杂性都推到核心之外——核心保持小而干净，系统整体的能力边界并未收缩。

本书沿着这条主线，从 `pi-ai` 统一 LLM 层开始，自底向上拆解它的核心循环、工具系统、会话树、持久化编排、产品组装、终端界面、扩展与远程控制，最后以行为评估与架构赌注收尾。全书七部分、17 章 + 序言：

| 部分 | 内容 |
|---|---|
| 第一部分 · 基础 | 架构总览、pi-ai 统一 LLM 层 |
| 第二部分 · Agent 核心 | Agent Loop、工具系统、状态与会话树 |
| 第三部分 · 持久化编排 | AgentHarness、上下文压缩与分支摘要 |
| 第四部分 · 编码 Agent 产品 | 启动流水线、AgentSession、系统提示词、三种运行模式 |
| 第五部分 · 终端界面 | pi-tui 自研渲染器、输入与编辑器 |
| 第六部分 · 扩展与连接 | 扩展系统、远程控制 |
| 第七部分 · 质量与结语 | 行为评估、结语 |

> 版本声明：分析基于 Pi Agent monorepo 各包 `v0.83.0`。书内所有文件路径均相对于 `pi-agent-src/`。

## 仓库结构

| 路径 | 说明 |
|---|---|
| `book/` | 书籍全部内容：`index.html`（序言）与 `ch01–ch17` 各章，以及共享的 `style.css`、`common.js` |
| `book/en/` | 英文版（同框架、英文内容），部署后位于 `/en/...` |
| `pi-agent-src/` | git submodule，指向上游 [earendil-works/pi](https://github.com/earendil-works/pi.git)，**只读分析对象** |
| `AGENTS.md` | 给 AI 维护者的写作规范与事项清单 |

书稿以零依赖 HTML 就地编写，改动即生效；内容维护规范见 `AGENTS.md`。

## 姊妹作品

- [《Prime Agent 源码解析》](https://kuwii.xyz/prime-agent-from-source/) —— 续作；Prime Agent 的代码库正是 `pi-mono` 的派生，本书是其直接前作
- [《Claude Code 源码解析》](https://kuwii.xyz/claude-code-from-source-cn/) —— 参照系；代表"综合体"路线

## 免责声明

本书是一份独立的教育性源码研究笔记。书中所有代码片段均直接取自 Pi Agent 的真实源码，文件路径与函数名可逐一核对。本书与 Pi Agent 的维护者无关，未获其背书或赞助。

## 许可

本书内容以 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 许可发布。`pi-agent-src/` 子模块为上游项目，遵循其自身的 MIT 许可，不由本仓库管理。
