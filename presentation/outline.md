# 《Pi Agent 源码解析》演讲结构

## 定位

- 受众：以程序员为主，也照顾结构工程师与非研发同事。
- 时长：20–25 分钟。
- 基线：`pi-agent-from-source` 提交 `113aa7bd333334d967b86f037796e17b1b847e54`；上游源码子模块 `784653468c42387f607d41ed5ca533100e7eb2fe`（`v0.83.0-91-g784653468`）；包版本 `0.83.0`。
- 主题：靛蓝瓷（Indigo Porcelain）。
- 核心问题：一个生产级编码 Agent，怎样让核心保持小，而不把能力一起删掉？
- 主结论：复杂性不会消失，只会移动；Pi 把机制留在核心，把策略推向 Harness、产品层、扩展和执行边界。

## 18 页叙事与主题节奏

| 页 | 主题 | 内容 | 主要源码锚点 |
|---:|---|---|---|
| 01 | hero dark | 封面：Pi Agent 源码解析 | `README.md` |
| 02 | light | 钩子：核心到底需要多大？ | `book/index.html` |
| 03 | dark | 六个数字建立规模感；区分工作区包、默认工具和 CLI 消费路径 | `packages/**`, `agent-loop.ts`, `agent-session.ts`, `coding-agent/README.md` |
| 04 | hero light | 第一幕：最小核心 | `book/ch01-architecture.html` |
| 05 | light | 九个包与单向依赖 | `pi-agent-src/packages/` |
| 06 | dark | `StreamFn` 是模型边界 | `packages/agent/src/types.ts` |
| 07 | light | 两层 Agent Loop | `packages/agent/src/agent-loop.ts` |
| 08 | dark | 工具管线与并发策略 | `agent-loop.ts`, `coding-agent/src/core/tools/` |
| 09 | hero light | 第二幕：复杂性没有消失 | `book/ch01-architecture.html` |
| 10 | light | Core / Harness / Product 三层 | `packages/agent/src/harness/`, `core/sdk.ts` |
| 11 | dark | 会话树与压缩 | `harness/session/`, `ch05`, `ch07` |
| 12 | light | `AgentSession.prompt()` 产品漏斗 | `core/agent-session.ts` |
| 13 | dark | 同一事件流，三种 CLI 消费路径（SDK 是独立嵌入入口） | `modes/interactive`, `print-mode.ts`, `rpc-mode.ts`, `core/sdk.ts` |
| 14 | hero dark | 第三幕：边界与赌注 | `book/ch17-epilogue.html` |
| 15 | light | 类型化扩展面：33 个 `on(...)` 重载 | `core/extensions/types.ts` |
| 16 | dark | 项目信任只管资源加载，执行隔离依赖外部边界 | `coding-agent/docs/security.md` |
| 17 | hero light | 三条可迁移原则 | 全书综合 |
| 18 | hero dark | 收束问题：你把复杂性放在哪里？ | 演讲总结 |

## 演讲节奏

- 01–03：用问题与数字建立反差，不先讲 API。
- 04–08：只讲核心机制：边界、循环、工具。
- 09–13：解释“复杂性守恒”，展示复杂性如何移动到外层。
- 14–16：诚实讨论扩展与安全的代价，不把“最小化”包装成普遍最优。
- 17–18：把源码观察抽象成可迁移的架构判断。
