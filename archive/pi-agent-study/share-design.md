# Pi Agent 源码交互式技术分享 — 设计文档

> 状态：设计稿，待确认后开始实现
> 日期：2026-08-05
> 受众：技术同行（懂编程、懂 LLM API，不一定了解 Agent 内部）

## 1. 目标

用三种可交互形式，让听众理解 Pi Agent 一次 prompt 的完整生命线：

1. **可点击源码导航网页** — 主线讲解，观众自行探索。
2. **现场断点调试** — 跟着真实 prompt 走一遍 Agent Loop。
3. **JSONL 事件回放** — 回放真实任务每一轮的 tool call / tool result。

三者覆盖：主线 + Provider 层 + 工具系统。

## 2. 分享范围（要讲清楚的链路）

```
CLI (cli.ts / main.ts)
  → AgentSession (core/agent-session.ts)
  → Agent.prompt() (agent.ts)
  → runAgentLoop (agent-loop.ts)
  → runLoop 双层循环
    → streamAssistantResponse (调 streamSimple)
      → resolveApiProvider → provider.streamSimple (packages/ai)
    → 识别 toolCall content
    → executeToolCalls
    → toolResult 写回 currentContext.messages
    → prepareNextTurn / shouldStopAfterTurn
    → 下一轮 or 停止
  → agent_end
```

三条主线讲透：

- **Agent Loop 主线**：双层 while、turn 边界、停止条件（无 tool call / 无 steering / 无 follow-up / shouldStopAfterTurn）。
- **Provider 层**：`streamSimple` 如何按 `model.api` 找 provider、统一消息如何转厂商 payload、API key 优先级。
- **工具系统**：tool schema → execute → content/details/error，bash/read/edit 如何执行。

不覆盖：TUI 差量渲染、JSONL 会话树、compaction、OAuth。

## 3. 源码基准

- 仓库：`pi-agent-study/pi`（vendored 自 `earendil-works/pi`）
- 上游 commit：`130ae577acd76ea2f040f2e357b0f3e730a53883`（见 `UPSTREAM.md`）
- 本地 package 版本：`0.78.1`
- 注意：`agent-loop.ts` 当前含本地 `[调试]` console.log，是既有改动，分享时可复用作为事件流来源。

## 4. 形式一：可点击源码导航网页（Vite + React）

### 4.1 技术栈

- Vite + React + TypeScript
- 目录：`pi-agent-study/share-web/`（新建）
- 单页应用，左侧链路导航，右侧源码 + 注释 + 事件流。

### 4.2 页面结构

单页，一个长滚动 + 左侧 sticky 导航，分 7 个节点：

| # | 节点 | 对应源码 | 展示内容 |
| --- | --- | --- | --- |
| 1 | CLI 入口 | `coding-agent/src/cli.ts` `main.ts` | argv 解析、interactive/print/json/rpc 分派、为什么 `--help` 不进 Loop |
| 2 | AgentSession | `core/agent-session.ts` `sdk.ts` | `createAgentSession()`、model/tools/messages/streamFn 从哪来 |
| 3 | Agent.prompt | `agent/src/agent.ts` | `prompt()` → `normalizePromptInput` → `runPromptMessages` → `createContextSnapshot` → `createLoopConfig` |
| 4 | runAgentLoop | `agent/src/agent-loop.ts` | `agent_start` → `turn_start` → 写入 prompt → `runLoop()` |
| 5 | runLoop 双层循环 | 同上 176-340 行 | 内层（tool call）、外层（follow-up）、停止条件 |
| 6 | streamAssistantResponse → Provider | `agent-loop.ts` + `ai/src/stream.ts` | `convertToLlm` → `streamFn` → `streamSimple` → `resolveApiProvider` → 厂商 payload |
| 7 | executeToolCalls → 工具 | `agent-loop.ts` + `coding-agent/src/core/tools/` | schema、execute、content/details/error、结果回填 |

每个节点页面包含三栏（响应式下折叠）：

- **左：源码片段**（带行号，点击可展开上下文）
- **中：注释**（这段代码在做什么、为什么这样设计）
- **右：事件流**（这一步会发出哪些 AgentEvent，如 `turn_start`/`message_start`/`message_end`/`turn_end`）

### 4.3 交互点

- 点击源码行 → 高亮 + 弹出该符号在链路中的角色。
- 点击事件名 → 跳转到 JSONL 回放页对应事件。
- "播放"按钮 → 按顺序高亮节点，模拟一次 prompt 流经整条链路（纯前端动画）。
- 节点 5 的双层循环用 mermaid 或手画 SVG 展示内/外层 while。

### 4.4 源码片段提取

源码片段不手抄，用构建期脚本从 `pi-agent-study/pi/` 提取指定行范围，嵌入 JSON。避免源码漂移导致失真。提取配置：

```json
{
  "cli.ts": "packages/coding-agent/src/cli.ts:1-40",
  "main.ts": "packages/coding-agent/src/main.ts:1-60",
  "agent-session.ts": "packages/coding-agent/src/core/agent-session.ts:1-80",
  "agent.ts": "packages/agent/src/agent.ts:1-60,150-220",
  "agent-loop-runAgentLoop": "packages/agent/src/agent-loop.ts:95-132",
  "agent-loop-runLoop": "packages/agent/src/agent-loop.ts:176-340",
  "stream.ts": "packages/ai/src/stream.ts:40-75",
  "tools-read.ts": "packages/coding-agent/src/core/tools/read.ts:1-60"
}
```

## 5. 形式二：现场断点调试

### 5.1 启动方式

```bash
cd pi-agent-study/pi
node --inspect-brk ./node_modules/tsx/dist/cli.mjs \
  --tsconfig tsconfig.json \
  packages/coding-agent/src/cli.ts -p --provider <provider> --model <model> "读取 discount.js 并解释"
```

> 注意：fixture 已随长视频删除，现场用一个极简 prompt（如"列出当前目录文件"）代替，或现场新建一个 demo 目录。

### 5.2 推荐断点

| 断点位置 | 看什么 |
| --- | --- |
| `agent-loop.ts:123` `agent_start` emit | Loop 启动 |
| `agent-loop.ts:228` `streamAssistantResponse` 调用 | 模型请求边界 |
| `agent-loop.ts:247` `toolCalls` 过滤 | 识别 tool call |
| `agent-loop.ts:256` `executeToolCalls` | 工具执行 |
| `agent-loop.ts:271` `turn_end` emit | turn 边界 |
| `agent-loop.ts:300` `shouldStopAfterTurn` | 停止条件 |
| `ai/src/stream.ts:63` `provider.streamSimple` | provider 分派 |

### 5.3 现场脚本

1. 打开 Chrome DevTools `chrome://inspect`，attach。
2. 在 `agent_start` 命中后，讲"这就是一轮 Loop 的起点"。
3. 单步到 `streamAssistantResponse`，讲模型请求边界。
4. 命中 `executeToolCalls`，切到工具源码讲 schema/execute。
5. 命中 `turn_end` 后讲"如果有 tool call，回到内层 while 顶部"。
6. 命中 `shouldStopAfterTurn` 或无 tool call，讲停止条件。

## 6. 形式三：JSONL 事件回放

### 6.1 采集

现场跑真实在线模型任务，用 `--json` 模式输出 Session JSONL，或复用 `agent-loop.ts` 里已有的 `[调试]` console.log 重定向到文件。

推荐任务（简单可复现）：让 Pi 在一个空目录里创建一个文件并写入内容。会产生：assistant response → bash/write tool call → tool result → 最终回复。

### 6.2 回放页

网页内的一个独立路由 `/replay`：

- 加载一份 JSONL（上传或选内置）。
- 时间轴：横向列出每个 event，点击跳转。
- 每个事件卡片：type、toolName、stopReason、durationMs（如果调试日志里有）。
- 三栏对照：左 = 事件类型，中 = 当时上下文 messages 摘要，右 = 对应源码行。

### 6.3 确定性轨迹备选

如果现场跑失败或没 API key，备选：读 `packages/agent/test/agent-loop.test.ts`，提取测试里构造的假 stream/假 tool，做成一份可复现的 fixture JSONL。这样回放页总有内容可看。

## 7. 目录结构

```
pi-agent-study/
  share-web/                 # 新建：Vite + React 网页
    package.json
    vite.config.ts
    index.html
    src/
      main.tsx
      App.tsx
      components/
        NodeNav.tsx          # 左侧导航
        CodePanel.tsx       # 源码片段
        EventStream.tsx     # 事件流
        ReplayView.tsx      # JSONL 回放
      data/
        snippets.json        # 构建期生成
        trace.json          # 内置 JSONL 轨迹
    scripts/
      extract-snippets.mjs  # 从 pi/ 提取源码片段
  share-design.md           # 本文档
```

## 8. 实现顺序

1. ✅ 搭 `share-web/` Vite + React 骨架。
2. ✅ 写 `extract-snippets.mjs`，生成 `snippets.json`（9 个片段，行范围已优化为展示实质逻辑）。
3. ✅ 实现节点导航 + 源码面板 + 事件流面板（7 个节点静态）。
4. ✅ 跑一次真实任务，采集 JSONL（DashScope/GLM-5.2，读取 greet.js，3 turn / 54 事件）。
5. ✅ 实现 JSONL 回放页（支持真实轨迹 + 内置示例切换）。
6. ✅ 做节点 5 双层循环动画（10 步逐步高亮 + 停止条件）。
7. ✅ 现场断点调试串讲页（7 步脚本 + 启动命令 + 断点表格 + 源码跳转）。
8. ✅ 播放链路功能（7 个节点每 4 秒自动切换）。

## 9. 验证
- ✅ `cd share-web && npm run dev` 能打开（验证通过）。
- ✅ 7 个节点源码片段与 `pi/` 真实行号对得上（构建期提取，已验证）。
- ✅ 回放页能加载真实 JSONL 并渲染 54 个事件（DashScope/GLM-5.2）。
- ✅ 断点调试页 7 步脚本完整，启动命令可复制，断点表格可点击跳转。
- ✅ 不改动 `pi/` 源码（调试日志保留现状）。

## 10. 非目标

- 不做完整产品级 UI。
- 不覆盖 TUI / Session 持久化 / compaction / OAuth。
- 不修改 `pi/` 上游源码（调试日志是既有改动，保留）。
- 不生成最终视频成片（本次是现场交互分享）。
