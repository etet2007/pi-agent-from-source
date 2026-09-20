# 《Pi Agent 如何工作》零基础演讲结构

## 定位

- 受众：不了解 Agent、LLM Tool Calling 或 Pi 源码的零基础读者；也兼顾希望继续深入源码的程序员。
- 时长：40–45 分钟；其中约 10 分钟用于真实源码跟读。
- 阅读目标：不依赖现场讲解，顺着页面也能回答“Pi 收到一句话后，怎样调用模型、执行工具、保存历史并把过程显示出来”。
- 贯穿任务：`请在 README 增加安装说明，然后运行测试。`
- 基线：`pi-agent-from-source` 提交 `113aa7bd333334d967b86f037796e17b1b847e54`；上游源码子模块 `784653468c42387f607d41ed5ca533100e7eb2fe`（`v0.83.0-91-g784653468`）；包版本 `0.83.0`。
- 源码规模锚点：九个工作区单元（不计 `install-lock`）、两层 Agent Loop、十种核心事件、七个内置工具定义与四个默认工具。
- 主题：靛蓝瓷（Indigo Porcelain）。
- 核心结论：Pi 的工作方式不是“模型直接操作电脑”，而是产品层准备上下文、核心循环协调模型和工具、会话层保存过程、界面层消费事件。

## 初学者术语表

| 术语 | 本演讲中的含义 |
|---|---|
| Model / LLM | 根据输入预测下一段内容；它能提出工具请求，但不会亲自读写本机文件 |
| Context | 本次发给模型的系统提示、历史消息和工具说明 |
| Tool Call | 模型输出的结构化请求，例如 `{name:"read", path:"README.md"}` |
| Tool Result | 程序执行工具后写回对话的结果 |
| Turn | 一次模型回复，以及紧随其后的工具执行与结果 |
| Run | 从一次用户输入开始，到 `agent_end` 为止的完整处理过程 |
| Session | 多次 Run 加上持久化历史、分支、压缩和产品状态 |
| Event | 运行过程中的结构化通知；TUI、JSON 与 RPC 都消费它 |

## 30 页叙事与主题节奏

| 页 | 主题 | 本页回答的问题 | 主要源码锚点 |
|---:|---|---|---|
| 01 | hero dark | 这场分享会讲清什么？ | `README.md` |
| 02 | light | 看完以后能解释哪些问题？ | 演讲学习目标 |
| 03 | dark | Agent 与普通聊天机器人差在哪？ | `packages/agent/src/types.ts` |
| 04 | light | 我们要追踪哪一个具体任务？ | 贯穿案例 |
| 05 | dark | 一句话从输入到完成要经过哪些层？ | `coding-agent/src/main.ts`, `core/sdk.ts` |
| 06 | hero light | 第一幕要学什么？ | 核心机制总览 |
| 07 | light | Model、Tool、Agent、Session、UI 分别做什么？ | `types.ts`, `agent.ts`, `agent-session.ts` |
| 08 | dark | 核心怎样调用不同模型提供商？ | `packages/agent/src/types.ts` |
| 09 | light | 模型输出为什么只是“提议”？ | `AgentToolCall`, `AgentToolResult` |
| 10 | dark | UI 怎样知道过程进行到哪一步？ | `AgentEvent` 十种事件 |
| 11 | light | Agent Loop 的两层循环怎么跑？ | `packages/agent/src/agent-loop.ts` |
| 12 | dark | 第一轮为什么先读取 README？ | `streamAssistantResponse`, `read` tool |
| 13 | light | 工具从收到请求到返回结果发生什么？ | `executeToolCalls`, `core/tools/index.ts` |
| 14 | dark | 第二、三轮怎样编辑文件并运行测试？ | `edit`, `bash`, tool result feedback |
| 15 | light | Agent 什么时候停止，用户插话又怎么办？ | steering / follow-up queues |
| 16 | hero dark | 核心之外还剩什么复杂性？ | 产品编排总览 |
| 17 | light | `AgentSession.prompt()` 为什么是产品漏斗？ | `core/agent-session.ts` |
| 18 | dark | 历史怎样保存、回退、分支和压缩？ | `core/session-manager.ts`, harness/session |
| 19 | light | 同一过程怎样显示成 TUI、文本、JSON 或 RPC？ | `modes/`, `core/sdk.ts` |
| 20 | hero dark | 学源码时要同时追踪哪四类证据？ | 调用链、源码、事件、状态 |
| 21 | light | 用户输入怎样从产品层进入核心 Agent？ | `agent-session.ts:1114`, `agent.ts:339,398` |
| 22 | dark | Tool Result 为什么会触发下一轮模型判断？ | `agent-loop.ts:155–275` |
| 23 | light | 模型厂商的流怎样变成统一 AgentEvent？ | `agent-loop.ts:281–365` |
| 24 | dark | Tool Call 怎样经过准备、执行和收尾？ | `agent-loop.ts:411–485` |
| 25 | light | 当前 Run 的消息怎样持久化为 Session 历史？ | `agent-session.ts:393,625–641` |
| 26 | hero light | 最后要看哪些取舍？ | 扩展与安全总览 |
| 27 | dark | Pi 没有内置 MCP，如何扩展？ | `core/extensions/types.ts` |
| 28 | light | 项目信任、工具权限和沙箱是什么关系？ | `coding-agent/docs/security.md` |
| 29 | dark | 零基础读者下一步按什么顺序读源码？ | 五个关键源码入口 |
| 30 | hero dark | 一句话怎样变成可验证的行动？ | 全链路回顾 |

## 可见内容规则

- 每个概念第一次出现时先用生活语言解释，再给英文类型名。
- 每个机制页必须可见地说明“输入 → 处理 → 输出”，不能只在讲者备注里解释。
- 页脚标明源码位置；类比和架构归纳不得伪装成源码原话。
- 源码跟读页统一展示“调用链位置 + 真实源码 + 事件/日志 + 状态变化 + 下一跳”，代码每页只保留解释当前行为所需的关键行。
- 每页保留一个“为什么重要”的结论，帮助读者把局部步骤接回完整链路。
- 贯穿任务在 04、05、12、14、17、18、19、21–25、30 页重复出现，避免读者丢失上下文。
