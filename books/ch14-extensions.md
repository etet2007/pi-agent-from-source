# 第 14 章：扩展系统——最小化核心的延伸

## 最小化的代价与答案

走到这里，你应该已经注意到 Pi Agent "缺"了很多东西：没有内置的逐工具权限审批，没有 MCP，没有 Claude Code 那种 27 种运行时钩子。第 1 章把这称为"复杂性守恒"——这些能力没有消失，只是被推出了核心。

本章揭示它们被推到了哪里：**扩展系统**。这是最小化哲学的 payoff。核心之所以能保持最小，是因为几乎所有"我想要 Agent 多做一件事"的需求，都可以通过扩展满足，而不需要改动核心。工具、命令、快捷键、CLI flag、消息渲染、生命周期拦截——扩展可以注册这一切。

更重要的是，Pi Agent 的扩展不是运行时钩子字符串（`hooks.on("PreToolUse", ...)`），而是一个**强类型的 TypeScript API**。这个选择背后是对"扩展性"与"可维护性"如何兼得的深思。本章拆解这个系统，并回答那个贯穿全书的问题：为什么 Pi Agent 宁愿没有 MCP，也要把扩展性做成现在这个样子？

---

## 一个扩展长什么样

扩展就是一个工厂函数（`packages/coding-agent/src/core/extensions/types.ts`）：

```typescript
export type ExtensionFactory = (pi: ExtensionAPI) => void | Promise<void>;
```

它接收一个 `pi` 对象（`ExtensionAPI`），在上面注册各种东西。一个最小的扩展可能是：

```typescript
export default function myExtension(pi: ExtensionAPI) {
	pi.registerTool({
		name: "hello",
		label: "hello",
		description: "Greet someone",
		parameters: Type.Object({ name: Type.String() }),
		async execute(_id, { name }) {
			return { content: [{ type: "text", text: `Hello, ${name}!` }], details: {} };
		},
	});
}
```

这就是全部。把它放进项目的 `.pi/extensions/` 目录，pi 启动时会发现并加载它，于是模型多了一个 `hello` 工具。没有配置文件，没有清单，没有注册表——一个导出工厂函数的 TypeScript 文件就是一个扩展。

---

## `ExtensionAPI`：约 40 种事件 + 注册面

`ExtensionAPI`（`packages/coding-agent/src/core/extensions/types.ts:1193`）是扩展能做的全部事情。它分几大类。

### 事件订阅：`on(...)`

扩展可以订阅约 40 种事件，每种都有精确的类型化 payload 和返回值。`on` 是一组重载：

```typescript
export interface ExtensionAPI {
	// 会话生命周期
	on(event: "project_trust", handler: ProjectTrustHandler): void;
	on(event: "session_start", handler: ExtensionHandler<SessionStartEvent>): void;
	on(event: "session_before_switch", handler: ExtensionHandler<SessionBeforeSwitchEvent, SessionBeforeSwitchResult>): void;
	on(event: "session_before_fork", handler: ExtensionHandler<SessionBeforeForkEvent, SessionBeforeForkResult>): void;
	on(event: "session_before_compact", handler: ExtensionHandler<SessionBeforeCompactEvent, SessionBeforeCompactResult>): void;
	on(event: "session_shutdown", handler: ExtensionHandler<SessionShutdownEvent>): void;
	// 提供商层
	on(event: "context", handler: ExtensionHandler<ContextEvent, ContextEventResult>): void;
	on(event: "before_provider_request", handler: ExtensionHandler<BeforeProviderRequestEvent, BeforeProviderRequestEventResult>): void;
	on(event: "before_provider_headers", handler: ExtensionHandler<BeforeProviderHeadersEvent>): void;
	on(event: "after_provider_response", handler: ExtensionHandler<AfterProviderResponseEvent>): void;
	// Agent / 轮次 / 消息
	on(event: "before_agent_start", handler: ExtensionHandler<BeforeAgentStartEvent, BeforeAgentStartEventResult>): void;
	on(event: "agent_start", handler: ExtensionHandler<AgentStartEvent>): void;
	on(event: "turn_start", handler: ExtensionHandler<TurnStartEvent>): void;
	on(event: "message_end", handler: ExtensionHandler<MessageEndEvent, MessageEndEventResult>): void;
	// 工具
	on(event: "tool_call", handler: ExtensionHandler<ToolCallEvent, ToolCallEventResult>): void;
	on(event: "tool_result", handler: ExtensionHandler<ToolResultEvent, ToolResultEventResult>): void;
	// 输入
	on(event: "input", handler: ExtensionHandler<InputEvent, InputEventResult>): void;
	on(event: "user_bash", handler: ExtensionHandler<UserBashEvent, UserBashEventResult>): void;
	// ... 共约 40 种
}
```

注意 `ExtensionHandler<Event, Result>` 这个泛型：每种事件的 payload 类型和返回值类型都是精确约束的。订阅 `tool_call` 事件时，你的 handler 收到的 `event` 是 `ToolCallEvent` 类型，返回 `ToolCallEventResult`（可以 `{ block: true, reason }` 阻止工具）。写错事件名、payload 字段、返回类型，都会在**编译期**报错。

这与运行时钩子字符串形成鲜明对比。回忆第 6 章 Harness 的 `AgentHarnessEventResultMap`——产品层的扩展系统继承了那个"类型化扩展"的品味，并把它发扬光大。约 40 种事件覆盖了会话、提供商、Agent、轮次、消息、工具、输入的整个生命周期。

这些事件很多是我们在前几章见过的接缝的产品化暴露：

- `context` → 第 3 章的 `transformContext` 槽位
- `tool_call`/`tool_result` → 第 4 章的 `beforeToolCall`/`afterToolCall`
- `input` → 第 9 章 `prompt()` 漏斗的扩展拦截
- `before_provider_headers` → 第 8 章 `streamFn` 里的 `transformHeaders`
- `session_before_compact`/`session_before_tree` → 第 7 章的压缩/分支 hook

核心和 Harness 提供机制（槽位），产品层的扩展系统把这些机制暴露成约 40 个类型化事件给扩展。这是分层的又一次体现。

### 工具注册：`registerTool`

```typescript
registerTool<TParams extends TSchema, TDetails, TState>(tool: ToolDefinition<TParams, TDetails, TState>): void;
```

扩展注册的工具用的是第 4 章的 `ToolDefinition`——带 `promptSnippet`、`promptGuidelines`、`renderCall`、`renderResult` 的丰富接口。于是自定义工具天然获得：进入系统提示词（snippet/guidelines，第 10 章）、在终端里被渲染（renderCall/renderResult，第 12 章）、被循环执行（第 4 章）。`registerTool` 内部把 `ToolDefinition` 包成 `AgentTool`（`wrapToolDefinition`）交给核心。

自定义工具和内置工具在系统里是完全平等的——模型不知道也不关心一个工具是内置的还是扩展注册的。这是工具自描述设计的终极收益：扩展工具不需要任何特殊处理。

### 命令、快捷键、flag 注册

```typescript
registerCommand(name: string, options: Omit<RegisteredCommand, "name" | "sourceInfo">): void;
registerShortcut(shortcut: KeyId, options: { description?; handler: (ctx) => void | Promise<void> }): void;
registerFlag(name: string, options: { description?; type: "boolean" | "string"; default? }): void;
getFlag(name: string): boolean | string | undefined;
```

扩展可以注册：

- **斜杠命令**（`registerCommand`）：加入第 10 章的 `/` 命令面，与 22 个内置命令并列。
- **快捷键**（`registerShortcut`）：`shortcut` 是第 13 章的类型安全 `KeyId`，绑定一个 handler。
- **CLI flag**（`registerFlag`）：回忆第 8 章——核心 CLI 把未知 `--flag` 收集进 `unknownFlags`，扩展通过 `registerFlag` 声明自己的 flag、用 `getFlag` 读取。于是扩展能拥有自己的命令行参数。

这三个注册面让扩展可以接入产品的每一个交互入口：命令、键盘、命令行。

### 渲染注册

```typescript
registerMessageRenderer<T>(customType: string, renderer: MessageRenderer<T>): void;
registerEntryRenderer<T>(customType: string, renderer: EntryRenderer<T>): void;
registerMarkdownTransformer(transformer: MarkdownTransformer): void;
```

回忆第 5 章：`AgentMessage` 可通过声明合并扩展自定义类型。扩展可以注册自定义消息类型，并用 `registerMessageRenderer`/`registerEntryRenderer` 提供它们在终端里的渲染器（返回 `pi-tui` 组件）。`registerMarkdownTransformer` 则可以在 pi 渲染前变换用户/助手的 Markdown。

于是扩展不仅能影响 Agent 的行为，还能影响它的**呈现**——自定义消息类型 + 自定义渲染，让扩展可以往转录里加任何它想显示的东西。

### 动作：跨进程的 UI

`ExtensionAPI` 还提供一组"动作"方法（节选）：`select`、`confirm`、`input`、`notify`、widget 等。扩展可以弹一个选择框、要一个确认、请求输入、发一个通知。

这些 UI 动作在交互模式下由 TUI 直接渲染。但在 RPC 模式下（第 11 章），它们通过 `extension_ui_request`/`extension_ui_response` 机制跨越进程边界——UI 请求被序列化发给对端（IDE），对端渲染并把用户选择发回来。于是同一个扩展，在交互模式和 RPC 模式下都能弹 UI，只是渲染的位置不同。这是"事件流即契约"在扩展 UI 上的延伸。

---

## 扩展的加载与信任

扩展从哪里来？由 `ResourceLoader`（第 10 章）发现，`discoverAndLoadExtensions`（`packages/coding-agent/src/core/extensions/loader.ts`）加载，`ExtensionRunner`（`runner.ts`）运行。发现的位置包括：

- 项目的 `.pi/extensions/`
- 用户全局的 `~/.pi/extensions/`
- `--extension/-e` flag 指定的路径
- 内置扩展（`builtInExtensions`）

加载受**项目信任**门控（第 1 章）。这是安全模型的关键落点：项目目录里的扩展来自可能不可信的第三方仓库，它们能注册工具、拦截事件、影响 Agent 行为——这是巨大的攻击面。所以 pi 在加载项目扩展前会问："你信任这个项目吗？"不信任（`--no-approve`）就不加载其扩展。

回忆第 1 章：Pi Agent 没有逐工具审批，把隔离交给容器。但扩展加载这个项目信任决策，是它在"边界处一次性把关"的具体体现——不在每个工具调用前设卡，但在加载可能恶意的扩展前问你一次。`project_trust` 事件甚至允许扩展参与这个决策（`ProjectTrustHandler`）。

`--no-extensions` 可以完全禁用扩展，`--extension` 可以显式加载特定扩展。未知 flag 通过 `unknownFlags` 转交给扩展（第 8 章）。

---

## 内置扩展：llama.cpp

最有趣的例子是内置扩展。`packages/coding-agent/src/extensions/index.ts`：

```typescript
export const builtInExtensions: InlineExtension[] = [
	{ name: "llama.cpp", factory: llamaExtension, hidden: true },
];
```

Pi Agent 把 **llama.cpp 本地模型支持**做成了一个扩展（`src/extensions/llama/`）！这个扩展包含 `provider.ts`（注册一个本地模型提供商）、`client.ts`（与 llama.cpp 服务器通信）、`huggingface.ts`（下载模型）、`ui.ts`（模型管理界面）。

这个例子完美诠释了扩展系统的表达力：**连"新增一个 LLM 提供商"都可以是扩展，而不必进核心。** 回忆第 2 章，`pi-ai` 的提供商是核心能力；但 llama.cpp 这种"小众、可选、需要额外依赖"的提供商，被放在扩展里，按需加载。核心的提供商列表保持精简，长尾需求由扩展承接。

`hidden: true` 意味着它不出现在扩展列表里（它是内置的，不需要用户管理）。第 8 章的 `main()` 通过 `MainOptions.extensionFactories` 把它注入。

---

## skills、模板、主题：更轻的扩展点

扩展系统（TypeScript 代码）是最强大的扩展点，但不是唯一的。第 10 章介绍的几个机制是更轻量的扩展方式：

| 扩展点 | 形式 | 能力 | 门槛 |
|--------|------|------|------|
| **扩展** | TypeScript 代码 | 工具、事件、命令、UI、提供商……一切 | 高（要写代码） |
| **skills** | `SKILL.md` 文件 | 给模型的任务指令 | 低（写 Markdown） |
| **prompt 模板** | 模板文件 | 用户提示词快捷方式 | 低 |
| **主题** | JSON 文件 | 终端配色 | 低 |
| **自定义提供商** | 扩展 + `pi-ai` API | 接入新 LLM | 中 |

这是一个**分层的扩展体系**：简单的需求（加一段任务指令）用 skill 这种纯文本方式，复杂的需求（注册工具、拦截事件）用 TypeScript 扩展。门槛与能力成正比。用户不必为了"给模型加一条规则"而写一个扩展——那是 skill 的工作。

这种分层本身就是最小化哲学的体现：核心不内置一堆"规则配置""模板配置"的复杂机制，而是提供从纯文本到代码的渐进扩展点，让用户按需选择最轻的那个。

---

## 为什么没有 MCP

现在回答那个问题：为什么 Pi Agent 不支持 MCP（Model Context Protocol）？

MCP 是一个标准化的"外部工具协议"——它定义了 Agent 如何连接外部工具服务器（8 种传输方式、OAuth、工具封装）。综合体路线（如 Claude Code）内置 MCP，让 Agent 能接入庞大的 MCP 工具生态。

Pi Agent 的选择是：**不内置，但扩展可以实现。** 它的逻辑是：

1. MCP 是一个**可选的、外部生态相关**的能力，不属于"最小核心"。
2. 扩展系统足够强大，完全可以写一个"连接 MCP 服务器、把 MCP 工具注册成 pi 工具"的扩展（用 `registerTool` + 一个 MCP 客户端）。
3. 内置 MCP 会把 8 种传输、OAuth、协议版本管理这些复杂性吸进核心——违背最小化原则。

于是 Pi Agent 把"是否支持 MCP"变成了一个扩展决策，而非核心决策。想要 MCP 的用户，装一个 MCP 扩展即可；不想要的用户，核心里根本没有这份代码。

这与第 2 章"llama.cpp 作为扩展"是同一个逻辑：**长尾的、可选的、生态相关的能力，交给扩展；核心只保留普遍的、必需的。** 这是最小化核心保持最小的根本方法——不是不做这些事，而是让它们成为可插拔的边缘。

当然，这个选择有代价：Pi Agent 开箱即用地接入 MCP 生态不如内置 MCP 的方案方便，需要社区提供扩展。这是"最小化"与"开箱即用"之间的权衡，Pi Agent 明确选择了前者。

---

## 实践应用

Pi Agent 的扩展系统为"如何设计可扩展系统"提供了四条可迁移的模式。

**扩展性用类型化 API，而非钩子字符串。** 扩展面对一个强类型的 `ExtensionAPI`，约 40 种事件的 payload 和返回值都有精确类型，写错编译报错。它解决的问题是：运行时钩子字符串（事件名、payload 形状）要到运行时才暴露错误，且没有自动补全。当扩展面是类型化的，扩展开发就有了编译期安全和 IDE 支持，可维护性大幅提升。

**扩展与内置在系统里平等。** 扩展注册的工具用同一个 `ToolDefinition`，与内置工具被同样对待；连新增提供商都可以是扩展。它解决的问题是：扩展是"二等公民"，能力受限或需要特殊路径。当扩展和内置走同一套机制，扩展的表达力就没有人为上限，核心也无需为扩展开特例。

**分层扩展点，门槛与能力成正比。** 纯文本的 skill/模板/主题给简单需求，TypeScript 扩展给复杂需求。它解决的问题是：只有一种重量级的扩展方式，导致"加一条规则"也要写代码。当扩展点从轻到重分层，用户总能选到最轻的那个，核心也不必内置各种配置机制。

**把可选生态能力外推为扩展。** MCP、llama.cpp 这类可选/生态相关的能力不进核心，而由扩展承接。它解决的问题是：核心被长尾需求绑架，越来越臃肿。当核心只保留普遍必需的能力，把长尾交给可插拔扩展，核心就能长期保持最小——这是"复杂性守恒"在扩展维度的落地。

---

## 总结

Pi Agent 的扩展系统是最小化哲学的 payoff：核心保持最小，是因为几乎所有"多做一件事"的需求都能通过扩展满足。扩展是一个工厂函数 `(pi: ExtensionAPI) => void`，`ExtensionAPI` 提供约 40 种类型化事件订阅、工具/命令/快捷键/flag 注册、自定义消息渲染、以及跨进程的 UI 动作。扩展加载受项目信任门控——这是"边界处一次性把关"安全模型的落点。内置的 llama.cpp 扩展证明了连"新增提供商"都可以是扩展；skills/模板/主题则是更轻的扩展点。

它没有 MCP，也没有运行时钩子字符串——这不是缺失，而是选择：MCP 这类可选生态能力交给扩展实现，扩展性本身用强类型 API 而非字符串钩子来表达。理解了这一点，你就理解了 Pi Agent 如何在"不内置一切"的前提下，依然拥有近乎无限的扩展能力。

下一章，我们看 Pi Agent 如何延伸到 localhost 之外：守护进程、RPC 子进程、远程中继，以及两套截然不同的远程控制设计。
