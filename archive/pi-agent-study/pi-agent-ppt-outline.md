# Pi Agent 源码拆解课程：PPT 完整大纲

## 0. 演示设计说明

- 建议页数：40 页。
- 建议时长：120-150 分钟，可拆成 2 次课程。
- 受众：具备 TypeScript/Node.js 基础，了解 LLM Tool Calling。
- 叙事结构：入门 → 基础模块 → 核心源码 → 进阶原理 → 总结。
- 视觉风格：深色代码主题，架构图用蓝色表示 Runtime、紫色表示 Provider、绿色表示 Tool、橙色表示 Session/UI。
- 每页原则：一个结论、一件源码证据、一个视觉对象。
- 代码截图需保留原始缩进，并在右下角标注 `文件路径:起止行号`。

---

# 第一章 入门

## 第 1 页：封面

**标题**

Pi Agent 源码拆解：从 CLI 到 Agent Loop

**副标题**

多 Provider、工具调用、Session、扩展与 TUI 的工程实现

**核心内容**

- 源码快照：`pi-agent-study/pi`
- 上游记录：`UPSTREAM.md`
- 课程日期：2026-06-09

**建议配图**

- 中央放置简化链路：`CLI → AgentSession → Agent Loop → Provider / Tools`
- 不使用未经验证的项目 Logo，可使用纯文字标题与代码纹理背景。

**代码片段位置**

- 无。

---

## 第 2 页：学习目标

**核心结论**

课程目标不是“读完所有文件”，而是掌握一条请求的完整生命线。

**核心内容**

- 识别四个 package 的职责。
- 画出 Prompt、模型流、工具调用和持久化链路。
- 理解 Agent、AgentSession、SessionManager 的边界。
- 掌握扩展、压缩、重试和差量渲染原理。
- 能迁移到自己的 Agent 项目。

**建议配图**

- 五级阶梯：启动、组装、循环、进阶、迁移。

**代码片段位置**

- 无。

---

## 第 3 页：项目是什么

**核心结论**

Pi 是 Agent Harness，不只是聊天 CLI。

**核心内容**

- Interactive coding agent CLI。
- 通用 Agent Runtime。
- 多 Provider LLM API。
- Terminal UI Library。
- 可扩展工具、命令、Provider 和资源。

**建议配图**

- 产品外壳包住通用内核的同心层图。

**代码片段位置**

- `README.md:26-31`

---

## 第 4 页：技术栈

**核心结论**

Pi 用 TypeScript 自建 Runtime、事件协议和 TUI，第三方 SDK 停留在 Provider 边界。

**核心内容**

- TypeScript 5.9 / ESM。
- Node.js `>=22.19.0`。
- npm workspaces。
- TypeBox 工具 Schema。
- 多家模型官方 SDK。
- JSONL Session。
- 自研 EventStream 与差量 TUI。

**建议配图**

- 技术栈分层条带，不使用图标墙。

**代码片段位置**

- `package.json:4-13`
- `package.json:38-49`

---

## 第 5 页：四个 Package

**核心结论**

四层拆分把厂商差异、循环算法、产品策略和 UI 分开。

**核心内容**

| 层 | Package | 职责 |
| --- | --- | --- |
| Provider | `pi-ai` | 模型、消息、流事件 |
| Runtime | `pi-agent-core` | Agent 与 Agent Loop |
| Product | `pi-coding-agent` | CLI、Session、Tools、Extensions |
| View | `pi-tui` | Terminal Components |

**建议配图**

- 四层架构堆栈，右侧标依赖方向只能向下。

**代码片段位置**

- `README.md:26-31`
- 各 `packages/*/package.json` 的 description。

---

## 第 6 页：整体架构

**核心结论**

一次请求横跨 8 个边界，但核心循环只依赖两个抽象：`StreamFn` 和 `AgentTool`。

**核心内容**

```text
User
→ Mode
→ AgentSession
→ Agent
→ Agent Loop
→ pi-ai
→ Provider
↘ Tools
→ Events
→ Session/UI
```

**建议配图**

- 完整架构图，标出控制流、数据流和事件流三种箭头。

**代码片段位置**

- `packages/agent/src/types.ts:15-26`
- `packages/agent/src/types.ts:360-384`

---

## 第 7 页：目录地图

**核心结论**

阅读源码应沿主调用链，而不是按文件夹逐个阅读。

**核心内容**

- 入口：`cli.ts`、`main.ts`
- 组装：`sdk.ts`
- 核心：`agent.ts`、`agent-loop.ts`
- 模型：`ai/src/stream.ts`
- 产品：`agent-session.ts`
- 持久化：`session-manager.ts`
- 表现：`interactive-mode.ts`、`tui.ts`

**建议配图**

- 仓库树，高亮 8 个关键文件。

**代码片段位置**

- 无，使用目录树。

---

# 第二章 基础模块

## 第 8 页：CLI 入口很薄

**核心结论**

`cli.ts` 只做进程初始化，复杂度都留给 `main.ts`。

**核心内容**

- 设置进程名和环境变量。
- 禁止默认 warning 输出干扰 TUI。
- 预配置 HTTP Dispatcher。
- 将参数传给 `main()`。

**建议配图**

- 左侧 13 行代码，右侧四个职责标签。

**代码片段位置**

- `packages/coding-agent/src/cli.ts:8-20`

---

## 第 9 页：参数解析

**核心结论**

参数不仅配置模型，也决定 Session、Tools、Extensions、Skills 和运行模式。

**核心内容**

- `--model` / `--provider` / `--thinking`
- `--session` / `--fork` / `--continue`
- `--tools` / `--exclude-tools`
- `--extension` / `--skill`
- 未知长参数保留给扩展 Flag。

**建议配图**

- 参数分组矩阵。

**代码片段位置**

- `packages/coding-agent/src/cli/args.ts:63-210`
- 重点截取 `:140-205`。

---

## 第 10 页：四种运行模式

**核心结论**

Interactive、Print、JSON、RPC 共享业务 Runtime，只替换 I/O。

**核心内容**

- RPC 显式优先。
- JSON 显式优先。
- `-p` 或 stdin 非 TTY 进入 Print。
- 其他情况进入 Interactive。

**建议配图**

- 决策树。

**代码片段位置**

- `packages/coding-agent/src/main.ts:98-115`

---

## 第 11 页：为什么先确定 Session CWD

**核心结论**

恢复其他项目的 Session 时，设置、模型和资源必须按目标 CWD 重建。

**核心内容**

- Startup Settings 只负责找到 Session。
- Session Header 提供原始 CWD。
- 最终 CWD 决定项目设置、AGENTS.md、扩展和模型。
- 避免把当前目录配置错误注入旧会话。

**建议配图**

- 两个项目目录和一个被恢复 Session 的路径切换图。

**代码片段位置**

- `packages/coding-agent/src/main.ts:616-639`
- `packages/coding-agent/src/main.ts:665-705`

---

## 第 12 页：Services 与 Session 分离

**核心结论**

服务先创建，Session 参数再基于这些服务解析。

**核心内容**

- `AuthStorage`
- `SettingsManager`
- `ModelRegistry`
- `ResourceLoader`
- Diagnostics 不直接退出，由 App 层决策。

**建议配图**

- Service Factory 图。

**代码片段位置**

- `packages/coding-agent/src/core/agent-session-services.ts:126-171`

---

## 第 13 页：创建 Agent

**核心结论**

Agent 的行为主要由构造时注入的函数决定。

**核心内容**

- 初始 model、thinking、tools。
- `convertToLlm`
- `streamFn`
- `transformContext`
- Provider request/response Hook。
- steering/follow-up 策略。

**建议配图**

- Agent 构造函数中心，周围是注入点。

**代码片段位置**

- `packages/coding-agent/src/core/sdk.ts:293-359`

---

## 第 14 页：动态认证与请求配置

**核心结论**

每次模型调用都重新解析认证和网络配置，支持短期 OAuth Token。

**核心内容**

- `getApiKeyAndHeaders(model)`
- Timeout 动态读取。
- Retry 参数动态读取。
- Session ID 和 Attribution Header。
- 最终调用 `streamSimple()`。

**建议配图**

- Provider request pipeline。

**代码片段位置**

- `packages/coding-agent/src/core/sdk.ts:301-328`

---

# 第三章 核心源码

## 第 15 页：Agent 是什么

**核心结论**

Agent 是“状态 + 生命周期 + 队列”的通用外壳，不是完整产品。

**核心内容**

- Transcript state。
- Streaming state。
- Pending tool calls。
- Abort 与 waitForIdle。
- Steering / Follow-up Queue。
- Event listeners。

**建议配图**

- Agent 内部状态模型。

**代码片段位置**

- `packages/agent/src/agent.ts:160-219`

---

## 第 16 页：Prompt 入口

**核心结论**

`Agent.prompt()` 做三件事：防并发、规范化消息、启动 Loop。

**核心内容**

- Active run 时拒绝新 Prompt。
- String 转 UserMessage。
- 图片追加到 content。
- 调用 `runPromptMessages()`。

**建议配图**

- 三步漏斗。

**代码片段位置**

- `packages/agent/src/agent.ts:324-399`

---

## 第 17 页：运行生命周期

**核心结论**

Abort、错误消息、监听器结算都由 `runWithLifecycle()` 统一管理。

**核心内容**

- 创建 AbortController。
- `isStreaming = true`
- 捕获异常并生成失败 AssistantMessage。
- 最终清理 pending tools。
- `waitForIdle()` 在监听器完成后才结束。

**建议配图**

- Running 状态机：Idle → Running → Ending → Idle。

**代码片段位置**

- `packages/agent/src/agent.ts:451-500`

---

## 第 18 页：Agent Event

**核心结论**

统一事件协议是持久化、扩展和 UI 解耦的中心。

**核心内容**

- `agent_start/end`
- `turn_start/end`
- `message_start/update/end`
- `tool_execution_start/update/end`

**建议配图**

- 事件时间轴。

**代码片段位置**

- `packages/agent/src/types.ts:396-418`

---

## 第 19 页：Agent Loop 总览

**核心结论**

Agent Loop 是一个“请求模型，执行工具，把结果送回模型”的反馈系统。

**核心内容**

```text
Prompt
→ Stream Assistant
→ Tool Calls?
→ Execute Tools
→ Append Tool Results
→ Next Turn
→ Stop
```

**建议配图**

- 闭环流程图，Tool Results 箭头回到 Provider request。

**代码片段位置**

- `packages/agent/src/agent-loop.ts:95-143`
- `packages/agent/src/agent-loop.ts:155-269`

---

## 第 20 页：双层循环

**核心结论**

内层处理工具与 Steering，外层处理 Follow-up。

**核心内容**

- Inner loop 条件：tool calls 或 pending steering。
- Tool batch 可要求 terminate。
- `prepareNextTurn` 可换模型/上下文。
- Agent 本应停止后才检查 follow-up。

**建议配图**

- 两个嵌套环形箭头。

**代码片段位置**

- `packages/agent/src/agent-loop.ts:163-268`

---

## 第 21 页：停止条件

**核心结论**

Agent 停止不是由单个 `stopReason` 决定。

**核心内容**

停止前检查：

1. 非 error/aborted。
2. 无继续执行的 Tool Call。
3. 无 Steering。
4. 无 Follow-up。
5. 未被 `shouldStopAfterTurn` 截停。

**建议配图**

- 五个 Gate 串联。

**代码片段位置**

- `packages/agent/src/agent-loop.ts:196-268`

---

## 第 22 页：流式响应边界

**核心结论**

只有在 LLM 边界，`AgentMessage[]` 才转换为标准 `Message[]`。

**核心内容**

- `transformContext`
- `convertToLlm`
- 构建 `Context`
- 动态 API Key
- `streamFunction(model, context, options)`

**建议配图**

- Agent Message 到 Provider Message 的转换桥。

**代码片段位置**

- `packages/agent/src/agent-loop.ts:275-308`

---

## 第 23 页：流事件如何变成 UI 事件

**核心结论**

Provider Delta 被归一为 partial message，再转换为 `message_update`。

**核心内容**

- `start`：把 partial 放入 context。
- delta：替换 context 最后一项。
- `done/error`：写入 final message。
- 始终产生 `message_end`。

**建议配图**

- Token delta 流入一个逐渐增长的 AssistantMessage。

**代码片段位置**

- `packages/agent/src/agent-loop.ts:310-367`

---

## 第 24 页：工具调用流水线

**核心结论**

工具执行前后都有可控边界，并且任何错误都会转成 ToolResult。

**核心内容**

```text
Lookup
→ prepareArguments
→ validate
→ beforeToolCall
→ execute
→ afterToolCall
→ ToolResultMessage
```

**建议配图**

- 七段 Pipeline。

**代码片段位置**

- `packages/agent/src/agent-loop.ts:548-625`
- `packages/agent/src/agent-loop.ts:628-707`

---

## 第 25 页：并行工具执行

**核心结论**

实时完成顺序与上下文写入顺序被刻意分开。

**核心内容**

- 默认 parallel。
- 有 sequential 工具时整批顺序执行。
- `tool_execution_end` 按完成顺序。
- ToolResultMessage 按模型调用顺序。
- 保持 UI 实时性和上下文确定性。

**建议配图**

- 三条并发泳道，末端重新按 1、2、3 排序。

**代码片段位置**

- `packages/agent/src/agent-loop.ts:373-388`
- `packages/agent/src/agent-loop.ts:451-515`

---

## 第 26 页：Coding Tools

**核心结论**

具体编码能力位于产品层，不污染通用 Agent Core。

**核心内容**

- 默认：read、bash、edit、write。
- 可选只读：grep、find、ls。
- ToolDefinition 同时包含执行、Prompt 与 TUI Renderer。
- Operations 可替换为 SSH/Sandbox 实现。

**建议配图**

- Tool Registry 表格。

**代码片段位置**

- `packages/coding-agent/src/core/tools/index.ts:81-195`

---

## 第 27 页：Write 工具的并发安全

**核心结论**

并行 Agent Tool 不代表同一文件可以并行修改。

**核心内容**

- Path 解析为绝对路径。
- `withFileMutationQueue` 按文件排队。
- Abort 在 await 边界检查。
- 直到底层文件操作结束才释放队列。

**建议配图**

- 多个 tool call 汇入单文件队列。

**代码片段位置**

- `packages/coding-agent/src/core/tools/write.ts:181-225`

---

## 第 28 页：Provider Registry

**核心结论**

分派键是 `model.api`，不是厂商品牌名。

**核心内容**

- `registerApiProvider`
- `getApiProvider`
- `streamSimple`
- API 类型检查 Wrapper。
- 支持 Extension 动态注册与注销。

**建议配图**

- `model.api` 指向不同 Provider Adapter。

**代码片段位置**

- `packages/ai/src/api-registry.ts:40-98`
- `packages/ai/src/stream.ts:32-65`

---

## 第 29 页：统一消息模型

**核心结论**

跨 Provider 统一的真正难点是消息与流语义，不只是 URL。

**核心内容**

- User / Assistant / ToolResult。
- Text / Thinking / Image / ToolCall。
- Usage 与 Cost。
- StopReason。
- Provider-specific signature 保留在统一类型中。

**建议配图**

- Message Union 类型图。

**代码片段位置**

- `packages/ai/src/types.ts:229-313`

---

# 第四章 进阶原理

## 第 30 页：AgentSession 是产品中枢

**核心结论**

AgentSession 通过事件监听把通用 Runtime 变成编码产品。

**核心内容**

- Prompt 预处理。
- Tools/System Prompt。
- Session persistence。
- Extensions。
- Compaction。
- Retry。
- Bash 和 Session Navigation。

**建议配图**

- AgentSession 位于中心，连接六个子系统。

**代码片段位置**

- `packages/coding-agent/src/core/agent-session.ts:1-14`
- `packages/coding-agent/src/core/agent-session.ts:325-350`

---

## 第 31 页：Prompt 预处理顺序

**核心结论**

输入处理顺序是一条必须稳定的产品契约。

**核心内容**

```text
Extension Command
→ Input Hook
→ Skill
→ Prompt Template
→ Steering/Follow-up
→ Auth
→ Compaction
→ before_agent_start
→ Agent.prompt
```

**建议配图**

- 水平处理流水线。

**代码片段位置**

- `packages/coding-agent/src/core/agent-session.ts:986-1125`

---

## 第 32 页：事件驱动持久化

**核心结论**

只有 `message_end` 才写 Session，流式 partial 不落盘。

**核心内容**

- 先发扩展事件。
- 再通知 UI。
- 最后按消息角色追加 Session Entry。
- Assistant 完成后触发压缩/重试判断。

**建议配图**

- 一个 AgentEvent 分叉到 Extension、UI、Storage。

**代码片段位置**

- `packages/coding-agent/src/core/agent-session.ts:475-547`

---

## 第 33 页：JSONL 追加式会话树

**核心结论**

Session 是树形事件日志，不是覆盖式消息数组。

**核心内容**

- Header：版本、Session ID、CWD。
- Entry：`id`、`parentId`、timestamp。
- Model/Thinking 也进入历史。
- Leaf 决定当前分支。
- 新分支不修改旧历史。

**建议配图**

- JSONL 行与树节点一一对应。

**代码片段位置**

- `packages/coding-agent/src/core/session-manager.ts:30-78`
- `packages/coding-agent/src/core/session-manager.ts:746-769`

---

## 第 34 页：从日志投影 LLM Context

**核心结论**

持久化事实、当前分支和模型上下文是三个不同概念。

**核心内容**

- 从 leaf 沿 parent 回溯。
- 提取最新模型与 thinking。
- 自定义 Entry 可选择是否进入 Context。
- Compaction Summary 替换旧消息。

**建议配图**

- 全量树中高亮一条分支，再投影为线性消息列表。

**代码片段位置**

- `packages/coding-agent/src/core/session-manager.ts:325-431`

---

## 第 35 页：动态系统提示词

**核心结论**

System Prompt 是工具、资源和项目上下文的运行时投影。

**核心内容**

- 启用工具决定可见 Tool Snippet。
- Tool Guideline 去重。
- 加载 AGENTS.md / CLAUDE.md。
- Skills 仅在 read 可用时加入。
- 附加日期和 CWD。

**建议配图**

- 多个输入块汇聚成 System Prompt 文档。

**代码片段位置**

- `packages/coding-agent/src/core/agent-session.ts:896-929`
- `packages/coding-agent/src/core/system-prompt.ts:88-172`

---

## 第 36 页：扩展系统

**核心结论**

扩展通过事件和 Actions 注入能力，不直接控制内部对象。

**核心内容**

- Tools、Commands、Shortcuts、Flags。
- Input、Context、Provider、Tool Hook。
- Session lifecycle。
- Custom Provider。
- TUI Widgets。

**建议配图**

- Extension 插入点覆盖整条业务链。

**代码片段位置**

- `packages/coding-agent/src/core/extensions/types.ts:1-9`
- `packages/coding-agent/src/core/extensions/runner.ts:269-340`

---

## 第 37 页：工具安全 Hook

**核心结论**

工具授权应发生在参数校验之后、实际副作用之前。

**核心内容**

- `beforeToolCall` 可 block。
- 扩展错误默认阻止执行。
- `afterToolCall` 可脱敏或重写。
- Pi 默认没有 OS 级权限沙箱。

**建议配图**

- Tool 执行前后的两个安全闸门。

**代码片段位置**

- `packages/coding-agent/src/core/agent-session.ts:403-450`
- `README.md:53-62`

---

## 第 38 页：压缩与重试

**核心结论**

Context overflow 和暂时性 Provider 错误必须走不同恢复路径。

**核心内容**

- 压缩：Summary + Keep Recent。
- 阈值：`contextWindow - reserveTokens`。
- Overflow 不进入 Retry。
- 429/5xx/网络错误指数退避。
- 错误保留在历史，但从重试 Context 移除。

**建议配图**

- 左右双路径：Compaction 与 Retry。

**代码片段位置**

- `packages/coding-agent/src/core/compaction/compaction.ts:115-125`
- `packages/coding-agent/src/core/compaction/compaction.ts:216-222`
- `packages/coding-agent/src/core/agent-session.ts:2462-2534`

---

## 第 39 页：TUI 差量渲染

**核心结论**

流式 Agent UI 应更新组件状态，而不是持续打印新行。

**核心内容**

- Component 输出 lines。
- TUI 保存 previousLines。
- 事件触发 `requestRender()`。
- 16ms 最小刷新间隔。
- 支持 Focus、Overlay、Cursor 和 Terminal Protocol。

**建议配图**

- 新旧屏幕行 Diff，只高亮变化行。

**代码片段位置**

- `packages/tui/src/tui.ts:36-63`
- `packages/tui/src/tui.ts:262-280`
- `packages/coding-agent/src/modes/interactive/interactive-mode.ts:2681-2871`

---

# 第五章 总结

## 第 40 页：完整链路与迁移清单

**核心结论**

Pi 最值得复用的不是某个工具，而是清晰的边界和事件驱动闭环。

**核心内容**

完整链路：

```text
CLI
→ Runtime Services
→ AgentSession
→ Agent
→ Agent Loop
→ Provider
→ Tool
→ Events
→ Session/UI
```

迁移到自有项目的最小清单：

1. 统一 Message/Tool/Model 类型。
2. Provider Registry。
3. Agent Loop。
4. Abort 与 Queue。
5. Session 编排。
6. Append-only persistence。
7. Event consumer。

**建议配图**

- 左侧完整架构闭环，右侧七项实施清单。

**代码片段位置**

- 使用全课程关键路径索引，不再放大段代码。

---

# 讲师备注

## 建议演示顺序

1. 执行 `./pi-test.sh --help`，说明短路路径。
2. 执行 print 模式，展示最终输出。
3. 在 `AgentSession.prompt()`、`runLoop()`、`streamAssistantResponse()` 打断点。
4. 使用可控 Provider 或测试构造一个 tool call。
5. 打开生成的 Session JSONL，展示 `id/parentId`。
6. 最后展示 InteractiveMode 如何消费同一事件。

## 建议课堂提问

- 为什么 `Agent` 不直接保存 Session 文件？
- 为什么 Tool Result 必须回到模型上下文？
- 为什么错误也要形成 AssistantMessage？
- 为什么并行工具结果仍按源顺序写入上下文？
- 为什么扩展 Context 在 Session 替换后必须失效？
- 为什么压缩保留历史而只改变 Context Projection？

## 建议配套练习

1. 新增一个只读 `pwd` 工具。
2. 编写扩展阻止 `write` 到指定目录。
3. 新增一个 faux Provider，固定返回两次 tool call。
4. 为 AgentEvent 写一个控制台 Trace Consumer。
5. 从 JSONL 重建指定 leaf 的 Context。
6. 将 Tool Execution 从 parallel 改为 sequential，比较事件顺序。

## 代码展示规范

- 单页代码不超过 22 行。
- 长函数拆成“入口、核心分支、结束处理”三页。
- 代码字号建议 16-18 pt。
- 路径和行号固定放在代码框底部。
- 高亮控制流关键字：`await`、`emit`、`continue`、`return`。
- 不裁掉与结论直接相关的错误处理和注释。
