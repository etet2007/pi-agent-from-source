# Pi Agent 源码详解：从一次真实任务看懂 AI Agent

> 形式：中文技术讲解视频逐字稿
> 预计时长：85-100 分钟
> 源码基准：`earendil-works/pi` commit `130ae577acd76ea2f040f2e357b0f3e730a53883`
> 本地 package 版本：`0.78.1`
> 时间码状态：第一章改用完整源码与 JSON 证据后，现有时间码仅作旧版参考；
> 内容定稿后统一重排。

## 使用说明

每个制作单元包含：

- **旁白**：可直接录音的正文。
- **画面**：录屏、动画、字幕和高亮要求。
- **源码**：对应文件与稳定符号。
- **证据**：对应 `pi-agent-video-evidence.md` 中的真实运行、确定性实验或源码结论。

视频中的“模型思考”“Agent 决定”等表达都是方便交流的简称。第一次出现时必须明确：工程上对应的是模型根据当前 Context 生成内容，以及宿主程序根据结构化输出继续执行控制流。

---

# 第一章 Agent 不是更聪明的聊天框

## 00:00-01:30 开场：一个真实任务

**旁白**

我们直接看一个真实任务。

`greeting.js` 文件，只有一个函数：

```js
export function greet(name) {
  return `Hello, ${name}`;
}
```

我把下面这条Prompt交给Pi Agent：

```text
读取 greeting.js，把问候语改成中文。
```

任务只有两步：读取函数、修改一行。

2026 年 6 月 18 日的真实在线运行，实际顺序是：

```text
read greeting.js
-> edit greeting.js
-> final answer
```

Pi 保存的结构化消息如下。

第一次模型响应是一个 `toolCall`：

```json
{
  "role": "assistant",
  "content": [{
    "type": "toolCall",
    "name": "read",
    "arguments": { "path": "greeting.js" }
  }]
}
```

宿主程序执行 read 后，返回一条 `toolResult`，内容就是文件当时的真实源码：

```json
{
  "role": "toolResult",
  "toolName": "read",
  "content": [{
    "type": "text",
    "text": "export function greet(name) {\n  return `Hello, ${name}`;\n}"
  }]
}
```

下一轮模型看到这个结果以后，生成 edit 调用，明确给出旧文本和新文本：

```json
{
  "role": "assistant",
  "content": [{
    "type": "toolCall",
    "name": "edit",
    "arguments": {
      "path": "greeting.js",
      "edits": [{
        "oldText": "  return `Hello, ${name}`;",
        "newText": "  return `你好，${name}`;"
      }]
    }
  }]
}
```

宿主执行 edit 后返回 diff。最后一轮模型没有再请求工具，直接输出最终回复。

```js
export function greet(name) {
  return `你好，${name}`;
}
```

这次运行包含用户输入、模型输出、工具执行、工具结果和循环控制。

接下来沿着这次任务，依次讲解 CLI 入口、Agent Loop、工具系统、模型 Provider、会话树和上下文压缩。

**画面**

1. 全屏显示修改前的三行 `greeting.js`。
2. 显示完整 Prompt，并分别高亮 read、change、read again。
3. 依次展示脱敏后的 read tool call、read tool result 和 edit tool call JSON。
4. edit diff 出现后，切换到修改后的三行源码。
5. 右下角始终显示真实顺序：

```text
read
edit
final answer
```

6. 每段 JSON 下方注明：`真实 Session 的公开投影；已移除 ID、签名和 reasoning`。
7. 标题出现：`从一次真实任务看懂 AI Agent`。

**源码**

- `pi-agent-study/pi-agent-video-simple-fixture/greeting.js`
- `packages/agent/src/agent-loop.ts`

**证据**

- 2026-06-18 真实在线 Pi 编码任务。
- 修改前源码、edit diff 和修改后源码。
- 脱敏 Session JSONL 中的 tool call 与 tool result。

## 01:30-03:00 Chatbot 与 Agent 的分界线

**旁白**

普通聊天程序的流程是：用户发消息，程序调用模型，模型返回文本，请求结束。

修改文件需要读取当前源码，再执行修改。每一步的结果都会进入下一轮。

Agent 允许模型输出 `toolCall`。宿主程序执行工具，把 `toolResult` 放回上下文，再次调用模型。

在刚才的任务里，模型依次请求 read、edit。最后一轮不再请求工具，循环结束。

模型每轮根据工具结果生成下一步动作。这就是 Agent 的循环与反馈。

**画面**

左右对比：

```text
Chatbot:
User -> Model -> Text -> End

Agent:
User -> Model -> Tool Call -> Host Executes
                     ^              |
                     |-- ToolResult-|
```

字幕强调：

```text
模型生成调用请求
宿主程序真正执行工具
```

**源码**

- 此段先不展示代码。

**证据**

- 单工具确定性 Runtime 轨迹。
- 2026-06-18 greeting.js 的真实 read、edit 轨迹。

## 03:00-06:30 从真实源码抽出最小 Agent Loop

**旁白**

下面的伪代码由 Pi 的 `runLoop()`、`streamAssistantResponse()` 和 `executeToolCalls()` 压缩而来。

第一步，把用户 Prompt 加入当前 Context，并发出 Agent 开始、Turn 开始和用户消息事件。

然后先检查有没有已经排队的 steering 消息。steering 可以理解成 Agent 工作过程中，用户临时追加的方向调整。

接下来进入外层循环。每次外层循环里，还有一个内层循环。只要上一轮存在工具调用，或者还有 steering 消息，内层循环就继续。

进入一个 Turn 后，程序先把等待中的 steering 消息加入 Context。然后调用模型，流式收集一条 assistant message。

如果模型请求失败，或者用户取消，程序发出 Turn 结束和 Agent 结束事件，然后退出。

如果 assistant message 中包含 tool call，程序就查找工具、校验参数、执行工具，再把每个 ToolResult 追加回 Context。

一个 Turn 完成以后，程序可以更新下一轮的 Context、模型或者 thinking level，也可以通过显式停止条件要求结束。否则，再读取一次 steering 队列。

当工具调用和 steering 都结束后，外层循环检查 follow-up 队列。有 follow-up 就重新进入循环，否则发出 `agent_end`。

Pi 的核心由消息上下文、模型生成、工具反馈、双层循环和停止条件组成。

阅读后续源码时，只需判断代码属于哪一步：准备 Context、调用模型、执行工具、回填结果或控制循环。

**画面**

逐行出现以下伪代码，每一组右侧标真实函数：

```text
加入 Prompt，发出起始事件                 runAgentLoop

读取 steering
外层循环:
    内层循环: 有工具或有 steering
        注入 pending messages
        assistant = 调用模型并消费流        streamAssistantResponse

        如果 error / aborted:
            结束

        calls = assistant 中的 toolCall
        results = 校验并执行 calls           executeToolCalls
        把 results 加入 Context

        发出 turn_end
        更新下一轮状态
        检查停止条件
        读取 steering

    读取 follow-up
    没有 follow-up 就退出

发出 agent_end
```

动画用两层圆环标出 inner loop 和 outer loop。

**源码**

- `packages/agent/src/agent-loop.ts:runAgentLoop`
- `packages/agent/src/agent-loop.ts:runLoop`
- `packages/agent/src/agent-loop.ts:streamAssistantResponse`
- `packages/agent/src/agent-loop.ts:executeToolCalls`

**证据**

- 最小伪代码逐项映射。
- no-tool、single-tool 和真实多轮轨迹。

---

# 第二章 先看地图：Pi 的四层架构

## 06:30-08:30 Pi 到底是什么

**旁白**

Pi 更准确的定位，不只是一个终端聊天工具，而是一套 Agent Harness 和 Toolkit。

Harness 这个词很重要。测试领域里，test harness 是围绕被测对象搭建的一整套运行环境。类似地，Agent Harness 是围绕模型搭建的运行环境：它负责准备消息、接入 Provider、暴露工具、执行循环、保存历史、处理取消、更新界面。

换句话说，模型只是这套系统里的一个组件。

这也解释了一个常见误区。很多人研究 Agent 时，只盯着 system prompt，仿佛只要找到那段神奇提示词，就找到了 Agent 的全部秘密。但在 Pi 里，真正决定系统行为的，还有 Agent Loop、Tool Schema、事件协议、Session 投影、Provider 兼容、扩展 Hook 和宿主权限。

Prompt 很重要，但 Prompt 不能自己执行 Bash，也不能自己保存 JSONL，更不能自己处理并行工具结果。完成这些工作的是普通程序代码。

**画面**

中心放模型，外围逐项出现：

```text
Context
Tools
Loop
State
Persistence
Provider
UI
```

字幕：`Agent = Model + Runtime`。

**源码**

- 根目录 `README.md`
- 四个 package 的 `package.json`

**证据**

- 官方项目定位与本地 package 描述。

## 08:30-11:30 四个 Package

**旁白**

Pi 把系统拆成四个核心 package。

最底层之一是 `pi-ai`。它负责统一模型、消息、工具描述和流事件，并把 OpenAI、Anthropic、Google 等不同 Provider 的协议差异隔离起来。Agent Loop 不应该因为你换了模型厂商，就重写一遍。

第二层是 `agent-core`。这里保存 Agent 状态，管理 Prompt、取消、steering 和 follow-up 队列，并实现真正的 Agent Loop 和工具调用流水线。我们后面精读的 `agent.ts` 和 `agent-loop.ts` 就在这里。

再往上是 `coding-agent`。这是具体的编码产品层。read、bash、edit、write 等工具，CLI 参数，项目上下文，Skills，扩展系统，Session 持久化，自动压缩和重试，都主要在这里。

最后是 `pi-tui`，负责终端 UI。它处理输入、键盘事件、Markdown、图片和差量渲染，但它不应该决定 Agent 下一步是否调用工具。UI 的职责是消费状态和事件，不是实现业务循环。

这四层的依赖方向很关键：产品层可以依赖通用 Agent Runtime，Agent Runtime 可以依赖统一 AI API，但底层不能反过来知道上层的编码产品细节。

因此，`agent-core` 并不知道“读取文件”是什么意思。它只知道有一个符合 `AgentTool` 接口的工具。它也不知道 OpenAI 或 Anthropic 的 SDK，只知道一个 stream function 最终会给它统一的 assistant 事件。

**画面**

架构图：

```text
User / CLI / RPC
        |
  coding-agent --------> pi-tui
        |
    agent-core
        |
      pi-ai
        |
 Provider APIs
```

画面侧边列职责关键词。

**源码**

- `packages/ai`
- `packages/agent`
- `packages/coding-agent`
- `packages/tui`

**证据**

- package 目录与依赖方向。
- `agent-loop.ts` 只依赖统一类型和 StreamFn。

## 11:30-14:30 三个最容易混淆的对象

**旁白**

接下来必须分清三个名字：`Agent`、`AgentSession` 和 `SessionManager`。

`Agent` 是通用运行时对象。它拥有当前内存里的 transcript、system prompt、model、tools、thinking level 和 streaming 状态。它还能接收 Prompt、取消当前运行、保存 steering 和 follow-up 队列。最终，它调用 `runAgentLoop()`。

`AgentSession` 是编码产品的应用层中枢。用户输入进来以后，它先处理扩展命令、input hook、Skill、Prompt 模板和认证；运行过程中，它把 Agent 事件转发给扩展和 UI，并在消息完成时写入 Session；运行结束后，它还要处理自动重试和上下文压缩。

`SessionManager` 则负责磁盘上的历史事实。它把消息和配置变化追加为 JSONL 记录，每条记录都有 id 和 parentId。它还能从某一个 leaf 向根回溯，投影出当前分支真正应该交给模型的 Context。

可以用一个不完全等价的类比：

`Agent` 像发动机，负责一次运行怎样转起来。

`AgentSession` 像整车控制系统，把发动机、驾驶输入、仪表、维护策略组织起来。

`SessionManager` 像行车记录和路线档案，保存发生过什么，并能恢复当前路线。

但要记住类比的边界：它们最终都是程序对象，不存在一个独立于源码的“Agent 灵魂”。

**画面**

三张卡片：

```text
Agent
内存状态 / Loop / Queue / Abort

AgentSession
输入策略 / Extensions / Retry / Compaction / Persistence

SessionManager
JSONL / Tree / Restore / Context Projection
```

**源码**

- `packages/agent/src/agent.ts:Agent`
- `packages/coding-agent/src/core/agent-session.ts:AgentSession`
- `packages/coding-agent/src/core/session-manager.ts:SessionManager`

**证据**

- 对象字段和调用边界。
- 真实 Session 追加链。

---

# 第三章 一次 Prompt 如何进入系统

## 14:30-16:30 CLI 入口其实很薄

**旁白**

现在从最外层开始跟一次 Prompt。

`packages/coding-agent/src/cli.ts` 是真正的可执行入口。它做的事情很少：设置进程名称，设置环境标记，配置 HTTP dispatcher，然后把命令行参数交给 `main()`。

薄入口是一个好设计。它避免把启动副作用、参数编排和 Agent 业务逻辑塞进同一个文件。真正复杂的工作发生在 `main.ts`。

`main()` 先处理 offline、安装和配置命令，再解析参数。然后通过 `resolveAppMode()` 决定运行模式。

如果明确指定 RPC，就进入 RPC；指定 JSON，就进入 JSON；使用 `--print`，或者标准输入不是 TTY，就进入 Print；其他情况才进入 Interactive。

注意，JSON 在这里主要是 Print 输出的一种形式。它不是另一套 Agent 内核。

**画面**

代码只高亮：

```ts
main(process.argv.slice(2));
```

再切到 `resolveAppMode()`，动画展示四种模式。

**源码**

- `packages/coding-agent/src/cli.ts`
- `packages/coding-agent/src/main.ts:resolveAppMode`
- `packages/coding-agent/src/main.ts:main`

**证据**

- `./pi-test.sh --help` 真实输出。
- `main.ts` 模式分派。

## 16:30-19:30 为什么先确定 CWD

**旁白**

进入 `main()` 后，有一个很容易被忽略、但对编码 Agent 特别重要的问题：当前工作目录到底是什么？

编码 Agent 的 settings、AGENTS.md、Skills、扩展、Session 和工具路径，几乎都依赖 cwd。如果用户恢复的是另一个项目的 Session，那么不能先按照启动终端所在目录加载一整套资源，再发现 Session 实际属于另一个项目。

所以 Pi 先创建或解析 SessionManager，确定最终 runtime cwd，然后才创建与 cwd 绑定的 SettingsManager、ResourceLoader、Provider 和 Session 服务。

这不是普通 CLI 的小细节。对 Agent 来说，cwd 决定它看到哪些项目规则、哪些文件以及工具操作的根目录。目录搞错，system prompt 和工具权限语境都会跟着错。

在我们的真实 fixture 任务中，Pi 是从 fixture 目录启动的。因此它的 `pwd`、`find`、read 和 edit 都围绕这个小项目，而不会误入 Pi 源码仓库的其他目录。

**画面**

流程图：

```text
startup cwd
   |
resolve/open Session
   |
final runtime cwd
   |
Settings / Resources / Tools / Session
```

显示真实工具第一次调用 `pwd && find ...`。

**源码**

- `packages/coding-agent/src/main.ts:main`
- `createSessionManager()`
- `createAgentSessionRuntime()`

**证据**

- main.ts 中 final runtime cwd 注释与创建顺序。
- fixture 真实 Bash 参数。

## 19:30-22:00 对象是怎样组装出来的

**旁白**

最终，main 会建立一个 runtime factory，再进入 `createAgentSession()`。

这个函数首先准备 AuthStorage、ModelRegistry、SettingsManager 和 SessionManager。如果没有外部 ResourceLoader，它会加载项目上下文、扩展、Skills、Prompt 模板和主题。

然后它检查 Session 里有没有可以恢复的模型和 thinking level。如果没有，就从设置和可用 Provider 中选择初始模型。

接着确定工具。默认活动工具是 read、bash、edit、write。注意，工具不是模型 SDK 自带的，它们是 coding-agent 构造出来，再交给 Agent 的普通 TypeScript 对象。

最后这里会 `new Agent()`。传入初始模型、消息转换函数、stream function、Provider 请求 Hook、工具 Hook、下一轮准备函数和工具执行模式。

然后再 `new AgentSession()`，把 Agent、SessionManager、Settings、ModelRegistry、ResourceLoader 等应用层依赖组合起来。

这种组装方式让 Agent Loop 保持通用。你完全可以不用 Pi 的 TUI，甚至不用它的文件工具，只复用 Agent Core，然后传入自己的模型和工具。

**画面**

逐项装配动画，最后形成：

```text
AgentSession
├── Agent
├── SessionManager
├── ModelRegistry
├── SettingsManager
├── ResourceLoader
└── ExtensionRunner
```

**源码**

- `packages/coding-agent/src/core/sdk.ts:createAgentSession`
- `new Agent` 附近
- `new AgentSession` 附近

**证据**

- SDK 创建流程。

## 22:00-26:00 AgentSession.prompt 的预处理

**旁白**

用户真正提交文本以后，首先进入的不是 Agent Loop，而是 `AgentSession.prompt()`。

第一步，如果文本以斜杠开头，Pi 会尝试把它作为扩展命令立即执行。扩展命令甚至可以自己管理 LLM 交互，所以它不一定进入普通 Prompt 路径。

第二步是 input hook。扩展可以直接处理这次输入，也可以修改文本和图片。

第三步才是展开 Skill 命令和文件形式的 Prompt 模板。

如果这时 Agent 已经在 streaming，Pi 不允许悄悄再启动一个并发 Prompt。调用者必须明确选择 `steer` 或 `followUp`。这说明队列语义不是 UI 临时拼出来的，而是产品层明确要求调用者做出的选择。

如果 Agent 当前空闲，Session 会校验模型和认证，检查上一次回复是否触发上下文压缩，构造标准 user message，注入 pending next-turn message，再发出 `before_agent_start` 扩展事件。扩展还可以添加 custom message 或临时修改 system prompt。

完成这些步骤以后，`_runAgentPrompt()` 才调用 `agent.prompt(messages)`。

所以当我们说“一条用户输入进入 Agent”时，实际并不是把字符串原封不动传给模型。它可能先被扩展处理、Skill 展开、模板替换、上下文压缩和系统提示词重建。

**画面**

纵向流水线：

```text
raw input
-> slash command
-> input hook
-> skill/template
-> queue decision
-> auth/model check
-> compaction check
-> user/custom messages
-> before_agent_start
-> Agent.prompt
```

**源码**

- `packages/coding-agent/src/core/agent-session.ts:prompt`
- `packages/coding-agent/src/core/agent-session.ts:_runAgentPrompt`

**证据**

- AgentSession Prompt 预处理源码顺序。

---

# 第四章 Agent Loop 源码精读

## 26:00-29:00 Agent.prompt 与运行生命周期

**旁白**

进入 `Agent.prompt()` 后，第一件事不是调用模型，而是检查是否已经存在 active run。

如果当前 Agent 正在处理 Prompt，第二次直接调用会抛错。正确做法是使用 `steer()`、`followUp()`，或者等待当前运行结束。这个限制保护了 transcript 和生命周期状态，避免两个 Loop 同时修改同一份上下文。

接着，`normalizePromptInput()` 把字符串、单条消息或消息数组统一为 AgentMessage 数组。字符串会变成 role 为 user 的消息，图片也会放入 content。

`runPromptMessages()` 调用 `runWithLifecycle()`。这里创建 AbortController，把 `isStreaming` 设为 true，清空旧错误，然后把 signal 交给 `runAgentLoop()`。

Loop 结束以后，Agent 还要等待所有事件监听器完成。测试明确证明，即使已经发出了 `agent_end`，如果异步 listener 尚未结束，`prompt()` 也不会提前 resolve，Agent 仍保持 streaming 状态。

这个细节非常工程化：事件监听器里可能正在持久化消息或执行扩展逻辑。如果主 Promise 提前结束，调用者会误以为所有工作都完成了。

**画面**

高亮：

```ts
if (this.activeRun) throw ...
```

再显示：

```text
runWithLifecycle
  create AbortController
  isStreaming = true
  await executor
  await listeners
  isStreaming = false
```

**源码**

- `packages/agent/src/agent.ts:prompt`
- `normalizePromptInput`
- `runPromptMessages`
- `runWithLifecycle`
- `processEvents`

**证据**

- `agent.test.ts` active run、async subscriber 和 abort 测试。

## 29:00-32:00 runAgentLoop 的起始事件

**旁白**

`runAgentLoop()` 接收五类关键输入：新的 Prompt 消息、旧的 Agent Context、Loop 配置、事件 emit 函数，以及 AbortSignal 和可替换的 stream function。

它不会直接修改调用者传入的 messages 数组，而是建立新的 `currentContext`，把旧消息和新 Prompt 合并。

接着依次发出 `agent_start`、`turn_start`，并为每条 Prompt 发出 `message_start` 和 `message_end`。

为什么用户消息也要有 start 和 end？因为 Pi 的其他层只需要订阅统一事件，不必猜测消息是从哪里加入的。AgentSession 可以在 `message_end` 时统一持久化 user、assistant 和 toolResult；UI 也可以按同一种消息生命周期更新。

在无工具的确定性实验里，完整顺序就是：

Agent 开始，Turn 开始，用户消息开始和结束，assistant 消息开始和结束，Turn 结束，Agent 结束。

这说明 Event 不是聊天历史的另一个名字。历史描述“有哪些消息”，Event 描述“运行过程发生了什么”。

**画面**

展示 no-tool 真实事件时间线。

**源码**

- `packages/agent/src/agent-loop.ts:runAgentLoop`
- `createAgentStream`

**证据**

- no-tool 确定性轨迹。

## 32:00-37:30 双层循环逐段拆解

**旁白**

现在进入核心的 `runLoop()`。

函数先复制当前 Context 和 config，设置 `firstTurn`，并读取一次 steering 队列。用户可能在等待模型前就已经输入了补充要求，所以第一次模型调用前也要检查。

外层是一个无限循环。每次开始时，把 `hasMoreToolCalls` 设为 true。

然后进入内层循环。条件是：还有工具调用，或者还有 pending message。

第一轮不重复发 `turn_start`，因为 `runAgentLoop()` 已经发过了。从第二轮开始，每一次新的模型请求前都会产生新的 Turn。

如果 pendingMessages 不为空，Pi 会为每条消息发出 start 和 end，再追加到 currentContext 与 newMessages。这里插入的就是 steering 或外层传下来的 follow-up。

随后调用 `streamAssistantResponse()` 得到完整 assistant message，并把它加入 newMessages。

如果 stopReason 是 error 或 aborted，Pi 不再寻找工具，直接发出 `turn_end` 和 `agent_end`。这条路径保证失败也尽量形成完整生命周期，而不是在半路抛出一个无人处理的异常。

正常情况下，程序从 assistant content 中过滤出所有 `toolCall`。如果存在，就调用 `executeToolCalls()`。返回的 ToolResult 会逐条追加到 Context 和 newMessages。`hasMoreToolCalls` 取决于这批工具是否要求终止。

然后发出 `turn_end`。

Turn 结束后，`prepareNextTurn` 可以替换下一次请求使用的 Context、model 和 thinking level。之后 `shouldStopAfterTurn` 可以要求优雅停止。

如果没有停止，再读取 steering 队列。只要有工具结果需要交给模型，或者有 steering 消息，内层循环都会继续。

当内层终于结束，说明当前没有工具，也没有 steering。此时外层检查 follow-up。如果有，就把 follow-up 放进 pendingMessages，继续外层循环；没有才 break，最后发出 `agent_end`。

这就是为什么 steering 和 follow-up 不能混为一谈。steering 是工作中的转向，follow-up 是本来要收工以后再追加一项。

**画面**

代码与状态机并排。

状态机节点：

```text
Start Turn
-> Inject Pending
-> Stream Assistant
-> Error? End
-> Tool Calls?
-> Execute Tools
-> Turn End
-> Stop?
-> Steering?
-> Follow-up?
-> Agent End
```

内外循环用两种颜色。

**源码**

- `packages/agent/src/agent-loop.ts:runLoop`
- `packages/agent/src/agent.ts:createLoopConfig`

**证据**

- 双层循环源码。
- single-tool 的两个 Turn。
- 2026-06-18 greeting.js 真实任务的三个 Turn。

## 37:30-42:00 流式响应怎样变成一条消息

**旁白**

进入 `streamAssistantResponse()`，第一步是处理 Context 边界。

Agent 内部可以包含 custom message 或 UI 专用消息，所以先可选执行 `transformContext()`，再调用 `convertToLlm()`，把 AgentMessage 转成 Provider 能理解的标准 Message。

随后构造真正的 LLM Context：system prompt、messages 和 tools。

API Key 不是 Agent 创建时只取一次。这里每次模型请求前都可以动态解析，适合会过期的 OAuth 凭据。

stream function 返回一个异步事件流。Pi 用 `for await` 消费它。

收到 start 时，程序把 partial assistant message 追加到 Context，并发出 `message_start`。

收到 text delta、thinking delta 或 toolcall delta 时，程序用最新 partial 替换 Context 最后一条消息，再发出 `message_update`。它不是把每个 token 都追加成独立聊天消息，而是在不断更新同一条进行中的 assistant message。

收到 done 或 error 时，通过 `response.result()` 取得 final message，用它替换 partial，然后发出 `message_end` 并返回。

真实在线任务的 JSON 输出中出现了大量 `message_update`，这正是流式增量。为了讲清主链，我们在事件骨架里会折叠这些 update，但不能误以为模型一次就返回了完整消息。

**画面**

动画：

```text
start -> partial assistant
delta -> replace last partial
delta -> replace last partial
done  -> final assistant
```

旁边展示真实 JSON 中连续的 `message_update`，快速滚动后折叠。

**源码**

- `packages/agent/src/agent-loop.ts:streamAssistantResponse`

**证据**

- 真实 JSON 流事件。
- stream 源码。

## 42:00-45:00 停止不是只有一种原因

**旁白**

Agent 什么时候停止？答案不只是“模型没有调用工具”。

最普通的情况是 assistant message 没有 tool call，steering 队列为空，follow-up 队列也为空。内层和外层循环自然结束。

第二种是模型请求失败或运行被取消，stopReason 为 error 或 aborted。

第三种是 `shouldStopAfterTurn()` 返回 true。它允许应用在当前 Turn 和工具执行完整结束以后优雅停止，例如上下文策略要求暂时中断。

第四种来自工具批次。工具结果可以带 `terminate`。当前实现只有当这批所有最终工具结果都明确 `terminate === true` 时，才把整批视为终止。这避免一个并行工具单方面让其他结果失去反馈机会。

第五种是外层没有 follow-up。

所以一个健壮的 Agent Loop，必须把停止条件设计得和继续条件一样清楚。否则最常见的结果不是 Agent 更自主，而是死循环、重复调用、丢失工具结果或者取消后状态无法收尾。

**画面**

停止条件卡片：

```text
No tool + no queues
Error / Aborted
shouldStopAfterTurn
Whole tool batch terminates
No follow-up
```

**源码**

- `runLoop`
- `shouldTerminateToolBatch`
- `Agent.abort`

**证据**

- Agent Loop stop tests。
- Abort 生命周期测试。

---

# 第五章 模型如何“使用工具”

## 45:00-48:00 Tool Call 不是函数真的在模型里执行

**旁白**

现在回到最容易被拟人化的一句话：“模型使用了 Bash 工具。”

更准确的过程是：

第一，宿主程序把工具名称、描述和参数 Schema 放进模型请求。

第二，模型生成一个结构化内容块，例如工具名是 bash，参数是 command 等于 `npm test --silent`。

第三，Pi 在 assistant content 中发现这个 toolCall。

第四，Pi 在自己的工具列表里按名称找到 Bash Tool。

第五，Node.js 进程真正执行命令。

第六，执行结果被包装成 role 为 toolResult 的消息，再进入下一次模型 Context。

模型本身没有越过 API 伸出一只手去操作终端。真正拥有文件系统和进程权限的是运行 Pi 的宿主进程。

这一区分直接关系到安全。模型只是产生请求，但如果宿主程序默认允许高权限工具，并且没有确认、Hook 或沙箱，请求仍然可能造成真实影响。

**画面**

用四个明确主体：

```text
Model
  emits toolCall
Agent Runtime
  validates and dispatches
Host Tool
  performs operation
ToolResult
  returns evidence to Model
```

**源码**

- `AgentTool` 类型
- `executeToolCalls`
- `createToolResultMessage`

**证据**

- single-tool 轨迹。
- 真实 Bash/Edit/Read 调用。

## 48:00-52:30 工具执行流水线

**旁白**

`executeToolCalls()` 先取出 assistant message 中的全部 tool call。

然后判断执行模式。默认配置是 parallel，但如果全局指定 sequential，或者同一批任意工具声明自己的 `executionMode` 为 sequential，整批就走顺序执行路径。

每个调用首先发出 `tool_execution_start`。接着进入 `prepareToolCall()`。

这里先按名称查找工具。找不到时不会让整个 Loop 崩溃，而是立即生成一个错误 ToolResult，让模型知道工具不存在。

找到工具后，可以先用 `prepareArguments()` 兼容旧参数或做规范化。然后调用 `validateToolArguments()` 按 Schema 校验。

校验之后才进入 `beforeToolCall`。Hook 可以观察已经校验的参数，也可以阻止执行并给出原因。

准备成功以后，`executePreparedToolCall()` 调用真正的 `tool.execute()`。工具执行过程中可以通过回调不断产生 partial result，Pi 把它们转换为 `tool_execution_update`，这就是长时间 Bash 命令能持续更新终端输出的原因。

工具完成后，`afterToolCall` 还能替换 content、details、isError 或 terminate。最后发出 `tool_execution_end`，再创建 ToolResult message。

请注意这条顺序：参数校验、before hook、真实执行、after hook、execution end、ToolResult message。Hook 所处的位置会决定它到底能保护什么、修改什么。

**画面**

流水线：

```text
lookup
-> prepare args
-> validate schema
-> beforeToolCall
-> execute
-> partial updates
-> afterToolCall
-> execution_end
-> ToolResult
```

**源码**

- `packages/agent/src/agent-loop.ts:executeToolCalls`
- `prepareToolCall`
- `executePreparedToolCall`
- `finalizeExecutedToolCall`

**证据**

- 工具流水线源码。

## 52:30-55:30 并行工具的一个反直觉细节

**旁白**

并行执行里有一个很适合检验你是否真正读懂源码的细节。

我们让模型按顺序请求两个 delay 工具：第一个叫 slow-1，等待 30 毫秒；第二个叫 fast-2，只等待 1 毫秒。

真实事件显示，fast-2 的 `tool_execution_end` 先发出，slow-1 后发出。这符合真实完成时间。

但最终回填到消息数组里的 ToolResult 顺序仍然是 slow-1、fast-2，也就是模型原始 tool call 顺序。

为什么？

并行路径把每个执行包装成 Promise，并在各自完成时立即发出 end 事件。但后面使用的 `Promise.all()`，返回数组会保持输入 Promise 的顺序。Pi 再按这个数组创建 ToolResult message。

因此 UI 可以及时看到哪个工具先完成，而下一次模型请求仍得到稳定的原始调用顺序。

这类细节如果只看终端最终结果很难发现，但它会影响事件消费者、持久化和测试设计。

**画面**

双时间线：

```text
Completion events: fast-2 -> slow-1
ToolResult messages: slow-1 -> fast-2
```

显示确定性脚本真实 JSON。

**源码**

- `executeToolCallsParallel`
- `Promise.all`

**证据**

- parallel-tools 确定性轨迹。
- 对应 Vitest 用例。

## 55:30-59:00 Pi 的 Coding Tools

**旁白**

coding-agent 默认启用四个主要工具：read、bash、edit、write。

read 读取文件内容，并处理行范围、图片和输出截断等问题。

bash 在指定 cwd 中启动命令，持续产生输出更新，并处理超时、取消和平台差异。

edit 不是让模型上传一个完整新文件，而是描述旧文本和新文本。工具检查匹配情况，再执行替换。这样更容易限制修改范围，也方便在 UI 中展示 diff。

write 用于创建或覆盖完整文件。

另外还有 grep、find 和 ls，它们属于只读工具，但默认没有全部启用。

我们的真实任务很有意思。2026 年 6 月 14 日的正式录制中，模型最开始没有直接调用 read，而是用两个 Bash 分别扫描文件和搜索相关代码，下一轮才并行 read 三个文件，随后运行测试确认故障。前一天的取证运行则把“确认目录”和“运行测试”放在了第一批 Bash 中。

两次运行都修复了同一个问题，但中间策略并不相同。这说明 Agent Loop 没有规定“第一步必须读文件”或“测试必须在哪一轮执行”。它提供的是工具、反馈与继续运行的机制，具体下一步来自模型对当前 Context 的判断。视频里必须把每条轨迹称为“一次真实运行”，不能宣称所有 Pi 任务都固定走同一组步骤。

**画面**

四个默认工具卡片，再播放真实工具序列。

**源码**

- `packages/coding-agent/src/core/tools/read.ts`
- `bash.ts`
- `edit.ts`
- `write.ts`
- `sdk.ts` 默认工具列表

**证据**

- CLI help。
- fixture 在线运行。

## 59:00-62:00 权限与安全边界

**旁白**

工具安全不能只看参数有没有 Schema。

Schema 能保证 bash 的 command 是字符串，read 的 path 符合预期结构，但它不能保证命令本身安全，也不能保证路径里的内容适合被模型读取。

`beforeToolCall` 可以建立确认机制、路径规则或策略拦截。`afterToolCall` 可以脱敏结果。但这些 Hook 仍然运行在同一个应用信任边界里，不是强隔离。

Pi 默认继承启动进程的文件、进程、网络和凭据权限。如果你从拥有广泛权限的终端启动它，工具也可能拥有相应能力。

所以生产环境里要区分三层：

第一层，模型协议层：限制可用工具和参数 Schema。

第二层，应用策略层：确认、allowlist、Hook、日志和敏感信息处理。

第三层，系统隔离层：容器、虚拟机、受限用户或专门沙箱。

不要把第一层当成第三层。Tool calling 让模型获得了一个请求能力，真正的风险取决于宿主愿意执行什么。

**画面**

三层盾牌：

```text
Schema
Policy Hooks
OS Sandbox
```

字幕：`参数合法 ≠ 操作安全`。

**源码**

- `beforeToolCall`
- `afterToolCall`
- coding-agent sandbox 扩展示例

**证据**

- 源码 Hook 边界。
- 官方权限模型说明。

---

# 第六章 为什么 Pi 可以切换模型

## 62:00-65:30 Agent Loop 不直接依赖 OpenAI SDK

**旁白**

如果 Agent Loop 直接调用 OpenAI SDK，那么换到 Anthropic 时，消息格式、流式事件和工具调用格式都会渗入循环。时间一长，核心代码会到处充满 Provider 条件分支。

Pi 把这部分放进 `pi-ai`。

在 Agent Loop 看来，它只需要一个 `StreamFn`：输入 model、统一 Context 和 options，返回统一的 AssistantMessageEventStream。

`streamAssistantResponse()` 默认使用 `streamSimple`。`streamSimple()` 根据 `model.api` 找到已注册的 API Provider，然后调用 Provider 自己的 `streamSimple()`。

所以 Agent Loop 关心的是统一事件：start、text delta、thinking delta、toolcall delta、done 和 error。至于底层是 SSE、WebSocket，还是某个 SDK 的专用对象，不应该改变 Loop 的主要控制流。

这就是依赖倒置带来的价值：高层循环依赖抽象边界，而不是依赖某一个模型厂商。

**画面**

```text
Agent Loop
   |
 StreamFn / unified events
   |
API Registry
 /    |     \
OpenAI Anthropic Google
```

**源码**

- `packages/agent/src/types.ts:StreamFn`
- `packages/ai/src/stream.ts:streamSimple`
- `packages/ai/src/api-registry.ts`

**证据**

- Provider Registry 源码。

## 65:30-69:00 统一不等于没有差异

**旁白**

这里也不能把抽象层讲得过于理想化。

不同 Provider 对消息、thinking、缓存、图片、工具 Schema、工具调用 ID、重试和认证的要求并不相同。Pi 的测试目录里有大量看似琐碎的兼容用例，例如跨 Provider handoff、thinking signature、tool call ID normalization、缓存控制和不同协议的图片结果。

所以统一层不是让差异消失，而是把差异集中管理，让上层 Agent Loop 尽量只看稳定协议。

代价也很明显：Provider 层本身会变复杂，而且模型厂商更新协议时，这层需要持续维护。

另外，API Key 在每一次模型请求前都可以动态解析。对短期 OAuth Token 来说，这很重要。一个 Agent 可能在工具阶段运行很久，如果只在 Session 创建时读取一次凭据，下一轮请求时 Token 可能已经过期。

因此，多 Provider 能力不是简单维护一个模型名称列表，而是一整套协议适配、认证刷新和事件归一化工作。

**画面**

统一层上方保持干净，下方出现差异标签：

```text
tool IDs
thinking
cache
images
auth
stream protocol
```

**源码**

- `packages/ai/src/providers`
- `packages/ai/test`
- `sdk.ts` 自定义 streamFn 和动态认证

**证据**

- Provider 测试文件和 Registry。

## 69:00-72:00 一次 Provider 请求实际拿到什么

**旁白**

从 Agent Loop 的视角，一次请求不是只发送用户最后一句话。

它发送一个 Context，其中包含 system prompt、转换后的 messages 和工具定义。

messages 里可能有用户消息、之前的 assistant 回复、tool call，以及与这些调用对应的 ToolResult。模型之所以知道测试失败，是因为 Bash 输出已经被包装成 ToolResult 放进下一次请求。

工具定义则告诉模型有哪些能力、各自用途和参数结构。模型输出的 tool call 必须引用这些工具名。

我们的 fixture 任务里，第一次 Provider 请求只知道用户目标和项目环境。第一次工具结果返回以后，第二次 Provider 请求才知道测试实际失败为 `-2800 !== 170`，也知道目录中有哪些文件。读取结果返回以后，下一次请求才看到具体实现。

所以 Agent 的能力不是模型“记住了外部世界”，而是 Runtime 持续把最新环境证据投影进 Context。

**画面**

每轮 Context 增长动画：

```text
Request 1: user + tools
Request 2: user + assistant calls + bash results
Request 3: ... + read results
Request 4: ... + edit result
Request 5: ... + test result
```

**源码**

- `streamAssistantResponse`
- `Context` 类型
- fixture Session JSONL

**证据**

- 在线 Session 消息链。

---

# 第七章 Agent 怎样拥有“记忆”

## 72:00-75:30 “记忆”至少有四种

**旁白**

Agent 领域里，“记忆”是最容易把不同概念揉在一起的词。

在 Pi 里，至少要区分四种东西。

第一，`Agent.state`。这是当前内存状态，包括 transcript、model、tools、thinking level、是否 streaming、当前 partial message 和 pending tool calls。

第二，LLM Context。这是某一次请求真正发送给模型的 system prompt、messages 和 tools。它可能经过 transform 和 convert，不一定等于 Agent 内存中的全部消息。

第三，Session JSONL。这是磁盘上的持久化事实。它记录消息、模型变化、thinking level、压缩、分支摘要等条目。

第四，AgentEvent。这是运行过程通知，例如 turn_start、message_update 和 tool_execution_end。事件会被 Agent state、AgentSession、扩展和 UI 消费，但它本身不等于模型历史。

如果不区分这四层，就会问出很多无法准确回答的问题，比如：“Agent 的记忆是不是一个数组？”你指的是内存 transcript、发给模型的 Context、磁盘历史，还是 UI 当前显示的内容？

**画面**

四层同心图：

```text
Runtime State
LLM Context
Session History
Events / UI Projection
```

**源码**

- `AgentState`
- `AgentContext`
- `SessionEntry`
- `AgentEvent`

**证据**

- 类型定义与事件持久化路径。

## 75:30-79:00 message_end 为什么是持久化边界

**旁白**

AgentSession 订阅 AgentEvent。

当事件是 `message_start` 和 `message_update` 时，UI 可以立即显示正在生成的内容。但真正写入 SessionManager 的主要边界是 `message_end`。

如果完成的是 custom message，就写 custom entry。如果是 user、assistant 或 toolResult，就调用 `sessionManager.appendMessage()`。

这使持久化历史以完成消息为单位，而不是把每一个 token delta 都写成一条 Session 记录。

同一个 handler 还会记录最后一条 assistant message，用于 Agent 结束后检查自动重试和压缩。成功回复也会重置重试计数。

注意事件监听器是被等待的。持久化和扩展处理没有完成时，当前 Prompt 不应被视为彻底 idle。

真实 fixture Session 里，每一个 assistant toolUse 和每一个 toolResult 都成为独立 message entry。最终我们能从 JSONL 重建完整工具链，而不是只剩用户问题和最后答案。

**画面**

流式事件分叉：

```text
message_update -> UI only / live state
message_end    -> Session append
```

展示真实 Session 摘要。

**源码**

- `packages/coding-agent/src/core/agent-session.ts:_handleAgentEvent`
- `SessionManager.appendMessage`

**证据**

- fixture Session 16 条记录摘要。

## 79:00-83:00 为什么 Session 是树

**旁白**

`appendMessage()` 创建新记录时，会把 `parentId` 设置为当前 `leafId`，然后把 leaf 前进到新记录。

如果一直正常对话，这看起来就是一条链。但只要用户回到历史某个节点，再从那里继续，就会产生另一个 child，于是链自然变成树。

为什么不直接保存一个 messages 数组？

因为覆盖数组会丢失被放弃的未来历史。树结构允许同一份 Session 保留多个分支，既能恢复，也能审计某个答案是从哪条路径产生的。

`buildSessionContext()` 接收一个 leaf，从这个 leaf 沿 parentId 一直走到根，再把路径反转成当前分支。只有这条 path 会被投影成当前 Context。

因此，磁盘上“存在的历史”与当前模型“看到的历史”不是一回事。

我们的 fixture 只走了一条分支，所以每个 parentId 都指向上一条记录。它是树结构最简单的特例：一条链。

**画面**

先画链，再从中间节点分叉：

```text
A -> B -> C -> D
          \
           E -> F
```

切换 leaf 时高亮不同 path。

**源码**

- `SessionManager.appendMessage`
- `buildSessionContext`
- branch 相关方法

**证据**

- SessionManager parent/leaf 实现。
- fixture parent 链。

## 83:00-87:00 压缩不是删除历史

**旁白**

模型上下文窗口有限，所以 Session 历史不能无限原样发送。

Pi 的 compaction 不是简单把 JSONL 前半部分删掉。它会追加一个 compaction entry，保存摘要、压缩前 token 数量，以及从哪一条记录开始保留原消息。

以后 `buildSessionContext()` 投影当前分支时，如果发现 compaction，就先生成一条压缩摘要消息，再加入需要保留的原消息，最后加入压缩之后的新消息。

原始 Session 事实仍然存在，变化的是下一次发给模型的 Context 投影。

这体现了一个非常值得迁移的设计：事实日志与模型上下文分离。

事实日志追求可恢复、可分支和可审计；模型 Context 追求在窗口限制内保留当前任务最有价值的信息。

如果把两者混成同一个 messages 数组，压缩时就很容易永久丢失历史；分支和恢复也会变得混乱。

**画面**

```text
Session facts:
A B C D E F G H

Projected Context:
[Summary of A-E] F G H
```

强调原始 A-E 没有从磁盘消失。

**源码**

- `SessionManager.appendCompaction`
- `buildSessionContext`
- `core/compaction`

**证据**

- Session Context 投影源码。

---

# 第八章 从 Pi 提炼自己的 Agent

## 87:00-90:30 完整真实链路复盘

**旁白**

现在把整条真实任务重新连起来。

命令行入口解析参数，确定 JSON Print 模式和 fixture cwd，创建 SessionManager、资源服务、Agent 与 AgentSession。

用户 Prompt 进入 `AgentSession.prompt()`，经过输入处理、模型认证和 system prompt 准备，变成 user message。

`Agent.prompt()` 建立 active run、AbortSignal、Context 快照和 Loop 配置。

`runAgentLoop()` 发出起始事件。第一次 Provider 请求后，模型生成两个 Bash tool call。Runtime 校验参数并并行执行，一个扫描项目文件，一个搜索折扣、价格和促销相关代码。

两个 ToolResult 进入 Context，开始第二个 Turn。模型根据文件列表和搜索结果，请求并行读取 package.json、discount.js 和 discount.test.js。

读取结果进入第三次 Provider 请求。模型先请求运行测试，真实结果为 `-2800 !== 170`。

失败的 ToolResult 进入第四次请求。模型生成 edit 调用，宿主进程修改 discount.js。

edit 结果进入第五次请求。模型要求再次运行测试。

测试通过的 ToolResult 进入第六次请求。模型生成最终文本，没有新的工具调用。

steering 和 follow-up 都为空，Loop 发出 `agent_end`。与此同时，每条完成消息在 `message_end` 时被追加进 Session JSONL，最终形成可恢复的 parent 链。

终端上看起来像 Pi “自己找到并修复了 Bug”。源码层面的准确描述是：模型与宿主 Runtime 通过多轮结构化消息和真实工具反馈，完成了一次闭环任务。

**画面**

全链路长图从左向右点亮：

```text
CLI
-> AgentSession.prompt
-> Agent.prompt
-> Agent Loop
-> pi-ai Provider
-> toolCall
-> Host Tool
-> ToolResult
-> next turn
-> Session JSONL
-> UI
```

**源码**

- 全部主链文件。

**证据**

- fixture 在线运行和 Session。

## 90:30-94:30 自建 Agent 的七个最小模块

**旁白**

如果你想自己实现一个 Agent，不需要一开始复制 Pi 的全部能力。可以从七个模块开始。

第一，统一消息类型。至少能表达 user、assistant、tool call 和 tool result。

第二，模型边界。把具体 Provider 封装成一个稳定的 stream 或 complete 接口。

第三，工具接口。包含名称、描述、参数 Schema 和 execute。

第四，最小 Agent Loop。模型返回工具就执行并回填，没有工具就停止。

第五，运行状态。管理 transcript、Abort、当前流式消息和用户追加队列。

第六，应用 Session。负责系统提示词、输入预处理、认证、重试和压缩策略。

第七，追加式持久化与 Context 投影。先保存事实，再决定每次给模型看什么。

最初版本甚至可以先不做 TUI、分支、扩展和多 Provider。先确保这条最短路径可靠：

Prompt 进入，模型产生 tool call，宿主校验并执行，ToolResult 回填，再次调用模型，直到得到最终回复，并把消息保存下来。

当这条链能够被测试、取消和观察以后，再增加并行工具、steering、follow-up、压缩和扩展。

**画面**

七块积木逐层搭建：

```text
Messages
Provider
Tools
Loop
Runtime State
Application Session
Persistence + Projection
```

**源码**

- Pi 各层对应模块。

**证据**

- 从完整架构反向提炼。

## 94:30-97:30 Pi 的优点与代价

**旁白**

Pi 这套设计最值得学习的地方有几个。

第一，Agent Loop 与具体 Provider、具体工具和具体 UI 分离。

第二，运行过程通过统一 Event 暴露，状态、持久化、扩展和界面可以围绕同一协议协作。

第三，Session 保存事实，Context 是投影，因此分支和压缩不必破坏历史。

第四，工具调用路径有参数校验、前后 Hook、取消、更新事件和并行策略。

第五，Interactive、Print、JSON 和 RPC 共用同一业务内核。

但代价同样真实。

Provider 统一层要追赶大量厂商差异。AgentSession 承担了很多产品职责，源码学习成本高。扩展 Hook 的先后顺序会形成隐含契约。流式状态、事件和持久化必须保持一致。分支、压缩和恢复也会让 Context 构建变复杂。

安全上，它提供的是工具框架和策略切入点，不是默认的强系统隔离。

所以学习源码不是为了得出“Pi 的每一个选择都必须照抄”，而是看清每种能力解决了什么问题，又引入了什么复杂度。

**画面**

左右两列：

```text
Strengths              Costs
clean boundaries       provider complexity
event protocol         session complexity
fact log + projection  restore/branch complexity
tool pipeline          security responsibility
shared runtime         implicit hook contracts
```

**源码**

- 全局架构。

**证据**

- 源码结构与测试规模。

## 97:30-100:00 结尾：重新认识 Agent

**旁白**

最后，我们回到开场的问题：AI Agent 到底是什么？

它不是一个突然获得电脑控制权的大模型，也不只是一个更长的 system prompt。

模型负责根据当前 Context 生成下一步内容。Runtime 负责把环境能力描述成工具，校验和执行模型请求，把真实结果反馈回去，并决定何时继续、何时停止。

Session 负责保存发生过什么。Context 投影负责决定模型这一次能看到什么。Provider 层负责把不同模型协议翻译成统一事件。UI 负责把这一切呈现给用户。

当这些部分组合起来，模型的单次生成就变成了可以与真实环境交互的多步过程。

因此，理解 Agent 最重要的转变是：不要只问模型有多聪明，还要问 Runtime 给了它什么上下文、什么工具、什么反馈、什么停止条件，以及工具最终运行在什么权限边界里。

这也是为什么读 Pi 源码很有价值。它把“Agent”这个容易被神秘化的词，拆回了我们熟悉的工程对象：类型、消息、事件、循环、接口、队列、日志和进程。

一旦你能沿着一次真实 Prompt，把每一层的输入和输出说清楚，Agent 就不再是黑盒。

它仍然复杂，但这种复杂是可以阅读、运行、记录、测试和重新设计的。

**画面**

回到开场真实任务，依次给每一步标注所属模块。最后收束为：

```text
Agent = Model decisions
      + Runtime control
      + Tool feedback
      + Persistent context
      + Security boundaries
```

片尾字幕：

```text
先跟真实调用链，再读抽象。
先保存事实，再投影 Context。
先明确权限，再开放工具。
```

**源码**

- 全片回顾。

**证据**

- 全部取证档案。
