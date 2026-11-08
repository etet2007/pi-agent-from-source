# Pi Agent 视频源码与运行取证档案

本文只记录可复核事实，为视频逐字稿提供依据。观点、类比和简化表达不能覆盖这里记录的源码与运行结果。

## 1. 基准

- 上游仓库：`https://github.com/earendil-works/pi.git`
- vendored 源码目录：`pi-agent-study/pi`
- 上游提交：`130ae577acd76ea2f040f2e357b0f3e730a53883`
- vendored 日期：2026-06-08
- 本地 package 版本：`0.78.1`
- 取证日期：2026-06-13
- Pi 要求 Node：`>=22.19.0`
- 实际取证 Node：`24.14.0`

当前外层工作区原本已包含两条临时中文启动日志：

```text
coding-agent main.ts main()
coding-agent 得到createRuntime是一个CreateAgentSessionRuntimeFactory
```

它们不是上游 Pi 的标准输出，视频不能把它们描述为官方行为。

## 2. 基线命令

### 2.1 CLI 从源码启动

命令：

```bash
cd pi-agent-study/pi
PATH=<node-24-bin>:$PATH ./pi-test.sh --help
```

结果：

- 退出码为 0。
- 显示 Interactive、Print、JSON、RPC 相关选项。
- 默认内置工具列为 `read`、`bash`、`edit`、`write`。
- `grep`、`find`、`ls` 是内置但默认未启用的只读工具。

### 2.2 构建

首次直接运行 Agent 测试时，Vite 无法解析 workspace 包
`@earendil-works/pi-ai`，原因是 `dist` 尚未构建。执行：

```bash
npm run build
```

后四个 package 构建成功。构建过程会重新生成模型清单，所以生成文件不应作为本次文稿修改提交。

### 2.3 Agent 核心测试

命令：

```bash
npx vitest run \
  packages/agent/test/agent-loop.test.ts \
  packages/agent/test/agent.test.ts
```

结果：

```text
agent-loop.test.ts  19 passed
agent.test.ts       16 passed
total               35 passed
```

## 3. 可重复的确定性 Runtime 轨迹

脚本：

```text
pi-agent-study/pi/scripts/video-evidence-traces.ts
```

执行：

```bash
cd pi-agent-study/pi
npx tsx scripts/video-evidence-traces.ts
```

脚本直接调用真实的 `agentLoop()`、工具校验与工具执行代码。只有模型端被替换成确定性的 `MockAssistantStream`。

### 3.1 无工具请求

实际事件顺序：

```text
agent_start
turn_start
message_start:user
message_end:user
message_start:assistant
message_end:assistant
turn_end
agent_end
```

返回消息：

```text
user
assistant
```

结论：

- 没有 tool call 时只产生一个 turn。
- 用户消息也经过 `message_start` 和 `message_end`。
- `agent_end` 是本次 run 的最后一个事件。

### 3.2 单工具请求

实际事件顺序：

```text
agent_start
turn_start
message_start:user
message_end:user
message_start:assistant
message_end:assistant
tool_execution_start:echo:echo-1
tool_execution_end:echo:echo-1
message_start:toolResult
message_end:toolResult
turn_end
turn_start
message_start:assistant
message_end:assistant
turn_end
agent_end
```

返回消息：

```text
user
assistant(toolCall)
toolResult(echo-1)
assistant(final)
```

结论：

- 模型返回工具调用后，Pi 在当前 turn 中执行工具。
- 工具结果被包装为 `toolResult` 消息。
- 下一次模型调用属于新的 turn。
- “模型调用工具”应准确表述为“模型输出 tool call，宿主程序执行工具，再把 ToolResult 发回模型”。

### 3.3 两个并行工具

模型按以下顺序生成调用：

```text
slow-1
fast-2
```

工具完成事件的实际顺序：

```text
tool_execution_end:fast-2
tool_execution_end:slow-1
```

最终消息中的 ToolResult 顺序：

```text
toolResult:slow-1
toolResult:fast-2
```

结论：

- 并行工具可以按真实完成时间发出 `tool_execution_end`。
- `Promise.all()` 返回结果仍按输入数组顺序排列。
- ToolResult 消息随后按 assistant 原始 tool call 顺序发出和回填。
- 视频不能简单说“并行工具的所有事件都保持原顺序”。

对应测试：

```text
packages/agent/test/agent-loop.test.ts
"should emit tool_execution_end in completion order but persist tool results in source order"
```

## 4. 真实在线 Pi 编码任务

### 4.1 隔离项目

目录：

```text
pi-agent-study/pi-agent-video-fixture
```

初始实现：

```js
export function calculateFinalPrice(price, discountPercent) {
  return price - price * discountPercent;
}
```

测试：

```js
assert.equal(calculateFinalPrice(200, 15), 170);
```

初始真实测试结果：

```text
actual:   -2800
expected: 170
tests:    1 failed
```

### 4.2 Pi 运行条件

- 源码入口：本地 `pi-test.sh`
- 模式：JSON/Print
- Provider：`openai-codex`
- Model：`gpt-5.4-mini`
- 启动参数包含：`--offline --approve`
- Session 写入 fixture 的隔离 `.sessions` 目录
- Prompt 要求：先运行测试、阅读源码、定位根因、做最小修改、重跑测试，不修改测试

这里的 `--offline` 只禁用启动阶段的网络操作和版本检查，不会阻止已配置 Provider 的模型请求。

### 4.3 模型实际产生的工具调用

第一批，两个 `bash` 并行启动：

```json
{"command":"pwd && find . -maxdepth 2 -type f | ...","timeout":20}
{"command":"npm test --silent","timeout":120}
```

第二批，三个 `read`：

```text
discount.js
discount.test.js
package.json
```

第三批，一个 `edit`：

```diff
- return price - price * discountPercent;
+ return price - price * (discountPercent / 100);
```

第四批，一个 `bash`：

```text
npm test --silent
```

完整工具顺序：

```text
bash + bash
read + read + read
edit
bash
```

这条轨迹证明：

- 在线模型的具体策略不是写死在 Agent Loop 中。
- 同一条用户请求产生多个 assistant turn。
- 模型可以在一条 assistant 消息中请求多个工具。
- Pi 默认并行执行允许并行的同批工具。
- 修改后模型主动请求再次运行测试。

### 4.4 最终结果

修改后代码：

```js
export function calculateFinalPrice(price, discountPercent) {
  return price - price * (discountPercent / 100);
}
```

验证：

```text
tests: 1
pass:  1
fail:  0
```

最终 assistant 的 `stopReason` 为 `stop`。

### 4.5 真实事件骨架

省略大量 `message_update` 流式增量后，实际事件骨架是：

```text
agent_start
turn_start
user message
assistant(toolUse)
bash start x2
bash end x2
toolResult x2
turn_end

turn_start
assistant(toolUse)
read start x3
read end x3
toolResult x3
turn_end

turn_start
assistant(toolUse)
edit start
edit end
toolResult
turn_end

turn_start
assistant(toolUse)
bash start
bash updates
bash end
toolResult
turn_end

turn_start
assistant(stop)
turn_end
agent_end
```

### 4.6 Session JSONL 链

Session 文件包含：

```text
session
model_change
thinking_level_change
user
assistant(toolUse)
toolResult(bash)
toolResult(bash)
assistant(toolUse)
toolResult(read)
toolResult(read)
toolResult(read)
assistant(toolUse)
toolResult(edit)
assistant(toolUse)
toolResult(bash)
assistant(stop)
```

每条非根记录都有 `parentId`，并指向前一条当前分支记录。该真实 Session 是“追加式链是树结构的一个分支”的直接例子。

### 4.7 2026-06-14 正式录制运行

为了制作真实终端素材，在 `/tmp/pi-agent-live-demo` 隔离副本中再次执行了
同一任务。Provider 与模型仍为 `openai-codex/gpt-5.4-mini`。

本次实际工具批次：

```text
bash + bash
read + read + read
bash
edit
bash
final answer
```

具体行为：

1. 两个 Bash 并行扫描文件和搜索折扣、价格相关代码。
2. 三个 read 并行读取 package.json、discount.js 和 discount.test.js。
3. Bash 运行测试，确认 `-2800 !== 170`。
4. edit 将 `discountPercent` 除以 100。
5. Bash 复测，得到 1 passed、0 failed。
6. assistant 输出最终回复并停止。

这次运行与 2026-06-13 的首次取证轨迹不同：首次运行在第一批 Bash
中就执行了测试，正式录制运行则在读取源码后才执行测试。两次差异是
“工具策略来自模型当前判断，而不是 Agent Loop 写死步骤”的直接证据。

公开取证文件位于：

```text
pi-agent-course-video/long-course/evidence/live-run-2026-06-14/
```

公开版本不包含 reasoning 签名、response ID、tool call ID 或用户主目录。

### 4.8 2026-06-18 简单函数修改

为了让第一章面对初学者时不被测试、Bash 和项目结构分散注意力，新增
一个只有 `greeting.js` 的隔离任务。

初始源码：

```js
export function greet(name) {
  return `Hello, ${name}`;
}
```

提交给 Pi 的完整 Prompt：

```text
读取 greeting.js，把问候语改成中文。
```

Provider 与模型为
`openai-codex/gpt-5.4-mini`。真实工具顺序：

```text
read greeting.js
edit greeting.js
final answer
```

第一次 read 返回初始源码。edit 的真实 diff：

```diff
 export function greet(name) {
-  return `Hello, ${name}`;
+  return `你好，${name}`;
 }
```

最终回复：

```text
已改成中文：`你好，${name}`
```

公开取证文件：

```text
pi-agent-course-video/long-course/evidence/greeting-natural-run-2026-06-18/
```

`session.public.json` 保留工具名称、参数、读取内容、edit diff 和最终回复，
但删除 reasoning、签名、响应 ID、tool call ID 和本机路径。

## 5. 源码调用链

## 5.1 CLI 与模式

入口：

```text
packages/coding-agent/src/cli.ts
-> main(process.argv.slice(2))
```

主编排：

```text
packages/coding-agent/src/main.ts:542 main()
packages/coding-agent/src/main.ts:100 resolveAppMode()
```

模式判定：

```text
parsed.mode === "rpc"  -> rpc
parsed.mode === "json" -> json
parsed.print           -> print
stdin 非 TTY           -> print
否则                   -> interactive
```

最终分派：

```text
runRpcMode(runtime)
new InteractiveMode(runtime).run()
runPrintMode(runtime, ...)
```

关键结论：

- 模式层不实现另一套 Agent Loop。
- 四种模式共享同一个 AgentSession Runtime。
- Interactive、Print、JSON、RPC 的主要差异在输入输出适配。

## 5.2 Session 与 Agent 的组装

```text
packages/coding-agent/src/core/sdk.ts:166 createAgentSession()
```

主要步骤：

1. 确定 cwd 和 agentDir。
2. 创建或复用 AuthStorage、ModelRegistry、SettingsManager、SessionManager。
3. 加载资源、扩展、Skills、Prompt 模板和项目上下文文件。
4. 从 Session 或配置解析模型与 thinking level。
5. 建立默认工具集合。
6. `new Agent({...})`。
7. `new AgentSession({...})`。

Agent 构造位置：

```text
packages/coding-agent/src/core/sdk.ts:293
```

AgentSession 构造位置：

```text
packages/coding-agent/src/core/sdk.ts:375
```

边界：

- `Agent`：当前 transcript、运行状态、队列、生命周期和通用 Loop。
- `AgentSession`：编码产品策略、扩展、Skills、认证、重试、压缩和持久化。
- `SessionManager`：追加式 Session 事实记录与 Context 投影。

## 5.3 Prompt 预处理

```text
packages/coding-agent/src/core/agent-session.ts:986 AgentSession.prompt()
```

顺序：

1. 尝试执行扩展命令。
2. 发出 input hook，允许 handled 或 transform。
3. 展开 Skill 命令和 Prompt 模板。
4. 若 Agent 正在运行，则按配置进入 steering 或 follow-up 队列。
5. 刷新待持久化的 Bash 消息。
6. 校验模型和认证。
7. 必要时先做上下文压缩。
8. 创建 user message。
9. 注入 pending next-turn messages。
10. 运行 `before_agent_start` 扩展 Hook。
11. 设置本轮 system prompt。
12. `_runAgentPrompt(messages)`。

底层入口：

```text
AgentSession._runAgentPrompt()
-> Agent.prompt()
-> Agent.runPromptMessages()
-> runAgentLoop()
```

## 6. Agent 与 Loop

### 6.1 Agent Prompt

```text
packages/agent/src/agent.ts:327 Agent.prompt()
```

重要行为：

- 若已有 active run，拒绝第二次直接 `prompt()`。
- 文本被标准化为 user message。
- 创建 context 快照和 loop config。
- `runWithLifecycle()` 建立 AbortController 和 streaming 状态。
- Loop 事件由 `processEvents()` 更新 Agent state 并通知订阅者。

### 6.2 从真实代码抽取的最小伪代码

下面不是通用 Agent 教科书模板，而是当前 Pi 源码的压缩投影：

```text
把新 Prompt 追加进当前 Context
发出 agent_start、turn_start 和 Prompt 消息事件

先读取可能已排队的 steering 消息

外层循环：
    标记“可能还有工具调用”

    内层循环：当还有工具调用，或还有 steering 消息
        必要时发出 turn_start
        把 steering 消息加入 Context

        调用模型并流式得到 assistant message

        如果模型失败或被取消：
            发出 turn_end、agent_end，然后结束

        找出 assistant message 中的 tool call
        如果存在：
            校验并执行工具
            把 ToolResult 追加到 Context

        发出 turn_end
        应用下一轮 Context/模型更新
        检查显式停止条件
        再读取 steering 队列

    Agent 原本将停止时，读取 follow-up 队列
    如果有 follow-up，把它作为 pending message 继续外层循环
    否则退出

发出 agent_end
```

逐段映射：

| 伪代码 | 真实函数 |
| --- | --- |
| 追加 Prompt、起始事件 | `runAgentLoop()` |
| 外层与内层循环 | `runLoop()` |
| 调用模型与流式消息 | `streamAssistantResponse()` |
| 校验和执行工具 | `executeToolCalls()`、`prepareToolCall()`、`executePreparedToolCall()` |
| ToolResult 回填 | `createToolResultMessage()` 与 `runLoop()` |
| steering/follow-up | `runLoop()` 与 `Agent.createLoopConfig()` |
| Abort 与 streaming 生命周期 | `Agent.runWithLifecycle()` |

当前路径中没有独立 Planner、Reflection 引擎、任务图调度器或向量记忆数据库。视频不得把这些常见 Agent 概念强加到 Pi 的这条核心路径上。

### 6.3 双层循环

真实内层条件：

```ts
while (hasMoreToolCalls || pendingMessages.length > 0)
```

内层继续的原因：

- 上一次 assistant message 产生 tool call。
- 用户在运行过程中加入 steering message。

外层继续的原因：

- Agent 本来要停止时发现 follow-up message。

steering 在当前 assistant turn 和工具批次完成后注入；它不会取消已经产生的当前工具调用。follow-up 只在 Agent 原本将停止时注入。

### 6.4 流式响应

```text
packages/agent/src/agent-loop.ts:275 streamAssistantResponse()
```

真实顺序：

1. 可选 `transformContext()`。
2. `convertToLlm()`。
3. 构造 systemPrompt/messages/tools Context。
4. 动态解析 API Key。
5. 调用 stream function。
6. `for await` 消费 start、delta、done/error。
7. partial assistant message 始终替换 Context 最后一项。
8. done/error 后写入 final message 并发出 `message_end`。

## 7. 工具执行

入口：

```text
packages/agent/src/agent-loop.ts:373 executeToolCalls()
```

顺序：

1. 按名称寻找工具。
2. 可选 `prepareArguments()`。
3. `validateToolArguments()`。
4. `beforeToolCall()`。
5. `tool.execute()`。
6. 处理中可发出 `tool_execution_update`。
7. `afterToolCall()` 可覆盖结果字段。
8. 发出 `tool_execution_end`。
9. 创建并发出 ToolResult message。

默认 `toolExecution` 为 `parallel`。但只要同批某个工具声明
`executionMode === "sequential"`，整批进入顺序执行路径。

安全边界：

- Schema 校验保证参数结构，不等于操作系统权限隔离。
- Hook 可以阻止工具调用，但不是强沙箱。
- Pi 默认继承启动进程权限。
- 强隔离需要容器、虚拟机或沙箱扩展。

## 8. Provider 边界

```text
packages/ai/src/stream.ts:58 streamSimple()
packages/ai/src/api-registry.ts:66 registerApiProvider()
packages/ai/src/api-registry.ts:80 getApiProvider()
```

`streamSimple()` 根据 `model.api` 解析 Provider，再调用该 Provider 的
`streamSimple()`。Agent Loop 不直接 import OpenAI、Anthropic 或 Google SDK。

这层统一的对象包括：

- Model。
- Context。
- Message。
- Tool。
- AssistantMessageEventStream。

统一层仍需承担厂商差异，例如工具调用 ID、thinking 数据、缓存标记、认证方式和流协议。因此“统一”不是差异消失，而是差异被集中到 Loop 边界之外。

## 9. 状态、Context、历史和事件

必须区分：

| 名称 | 用途 |
| --- | --- |
| `Agent.state` | 当前内存中的 transcript、模型、工具、streaming 状态 |
| LLM Context | 某一次 Provider 请求实际发送的 system prompt、messages、tools |
| Session JSONL | 追加式、可分支、可恢复的历史事实 |
| AgentEvent | 本次运行过程通知，供状态、持久化、扩展和 UI 消费 |

`AgentSession._handleAgentEvent()` 在 `message_end` 时把 user、assistant 和
toolResult 追加到 SessionManager。

## 10. Session 树与 Context 投影

```text
packages/coding-agent/src/core/session-manager.ts:950 appendMessage()
packages/coding-agent/src/core/session-manager.ts:325 buildSessionContext()
```

`appendMessage()`：

- 新记录的 `parentId` 指向当前 `leafId`。
- 追加后当前 leaf 前进到新记录。

`buildSessionContext()`：

1. 从指定 leaf 沿 `parentId` 回溯到根。
2. 得到当前分支 path。
3. 恢复 model 与 thinking level。
4. 查找最后一个 compaction。
5. 没有 compaction 时投影当前 path 上的消息。
6. 有 compaction 时先放摘要，再放保留消息和压缩后的新消息。

因此：

- Session 文件保存的事实不等于每次都完整发给模型。
- 分支是同一棵追加式树上的不同 leaf path。
- 压缩新增 compaction entry，不需要删除原始历史。

## 11. 文稿事实使用规则

以下内容可作为“真实在线运行”描述：

- 2026-06-18 简单函数任务：`read -> edit -> final answer`。
- greeting.js 修改前源码、edit diff 和修改后源码。
- fixture 的初始失败测试。
- 2026-06-13：`bash + bash -> read x3 -> edit -> bash`。
- 2026-06-14：`bash + bash -> read x3 -> bash -> edit -> bash`。
- 实际修改内容。
- 最终测试通过。
- 首次运行的五个 assistant turn，以及正式录制运行的六个 assistant turn。
- Session JSONL 的 parent 链。

以下内容必须标为“确定性 Runtime 实验”：

- no-tool 固定事件序列。
- single-tool 的固定 echo 轨迹。
- slow/fast 并行顺序实验。

以下内容属于源码结论，不应伪装成一次录屏观察：

- Provider Registry 的所有可替换能力。
- steering/follow-up 的完整时机。
- compaction 与 branch 的所有分支逻辑。
- Hook 的所有异常处理路径。
