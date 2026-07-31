# 第 4 章：工具系统——从定义到执行

## 工具是 Agent 的双手

模型本身只能做一件事：生成文本。它读不了文件、跑不了命令、改不了代码。让模型能"做事"的，是工具——Agent 的双手。第 3 章的循环在 `executeToolCalls` 处一笔带过；本章把它彻底拆开。

Pi Agent 的工具系统有两个值得玩味的设计决策。第一，**工具是自描述对象**：并发模式、参数 schema、UI 渲染方式都内聚在工具定义里，循环对工具的内部一无所知。第二，**工具有两副面孔**：核心运行时认识的 `AgentTool` 是精简的，产品层使用的 `ToolDefinition` 是丰富的（多了提示词元数据和 TUI 渲染器），两者之间只隔着一个薄薄的包装函数。

这两个决策共同服务一个目标：让"新增一个工具"不需要改动循环、改动系统提示词组装、改动 UI 渲染中的任何一处。工具把自己需要的一切都说清楚，系统只是照单全收。

---

## 两副面孔：`AgentTool` 与 `ToolDefinition`

### 核心认识的是 `AgentTool`

核心运行时（`pi-agent-core`）只认识一个精简的接口（`packages/agent/src/types.ts`）：

```typescript
export interface AgentTool<TParameters extends TSchema = TSchema, TDetails = any>
	extends Tool<TParameters> {
	label: string;
	prepareArguments?: (args: unknown) => Static<TParameters>;
	execute: (
		toolCallId: string,
		params: Static<TParameters>,
		signal?: AbortSignal,
		onUpdate?: AgentToolUpdateCallback<TDetails>,
	) => Promise<AgentToolResult<TDetails>>;
	executionMode?: ToolExecutionMode; // "sequential" | "parallel"
}
```

它继承自 `pi-ai` 的 `Tool<TParameters>`（带来 `name`、`description`、`parameters` schema、`constrainedSampling`），再加上四样东西：

- `label`：UI 显示用的标签
- `prepareArguments`：执行前的参数预处理（可选）
- `execute`：真正的执行逻辑，接收工具调用 id、参数、中止信号、进度回调
- `executionMode`：声明自己是该串行还是可并行

注意 `execute` 的返回值 `AgentToolResult<T>`（`packages/agent/src/types.ts`）携带 `content`（回灌给模型的内容）、`details`（给 UI 的结构化细节）、可选的 `usage`、`addedToolNames`，以及一个 `terminate` 提示——后者告诉循环"这个工具完成后可以停了"。

核心刻意**不知道**工具该如何渲染、该往系统提示词里加什么。这些是产品的事。

### 产品使用的是 `ToolDefinition`

产品层（`pi-coding-agent`）需要一个更丰富的接口，因为产品还要管"这个工具怎么出现在提示词里"和"怎么渲染在终端上"。`ToolDefinition`（`packages/coding-agent/src/core/extensions/types.ts`）在 `AgentTool` 的基础上加了这些：

```typescript
export interface ToolDefinition<TParams extends TSchema = TSchema, TDetails = unknown, TState = any> {
	name: string;          // LLM 工具调用用的名字
	label: string;         // UI 标签
	description: string;   // 给 LLM 的描述
	promptSnippet?: string;    // "Available tools" 提示词段落里的一行简介
	promptGuidelines?: string[]; // 工具激活时追加的指南要点
	parameters: TParams;       // TypeBox schema
	constrainedSampling?: false | ConstrainedSamplingConfig;
	renderShell?: "default" | "self";
	prepareArguments?: (args: unknown) => Static<TParams>;
	executionMode?: ToolExecutionMode;
	execute(toolCallId, params, signal, onUpdate, ctx: ExtensionContext): Promise<AgentToolResult<TDetails>>;
	renderCall?(args, theme, context): Component;    // TUI：如何渲染这次调用
	renderResult?(result, options, theme, context): Component; // TUI：如何渲染结果
}
```

多出来的字段分两类：

- **提示词元数据**（`promptSnippet`、`promptGuidelines`）：第 10 章会看到，系统提示词的"Available tools"段落是从激活工具的 `promptSnippet` 拼出来的，"Guidelines"段落则收集它们的 `promptGuidelines`。工具激活，它的提示词片段就自动出现；工具关闭，片段就消失。
- **TUI 渲染器**（`renderCall`、`renderResult`）：返回一个 `pi-tui` 的 `Component`。第 12 章会看到，工具调用在终端里长什么样（比如 edit 工具的彩色 diff），完全由工具自己决定。

### 桥梁：`wrapToolDefinition`

两副面孔之间只隔着一个薄函数（`packages/coding-agent/src/core/tools/tool-definition-wrapper.ts`）：

```typescript
export function wrapToolDefinition<TDetails = unknown>(
	definition: ToolDefinition<any, TDetails>,
	ctxFactory?: () => ExtensionContext,
): AgentTool<any, TDetails> {
	return {
		name: definition.name,
		label: definition.label,
		description: definition.description,
		parameters: definition.parameters,
		constrainedSampling: definition.constrainedSampling,
		prepareArguments: definition.prepareArguments,
		executionMode: definition.executionMode,
		execute: (toolCallId, params, signal, onUpdate, ctx?: ExtensionContext) =>
			definition.execute(toolCallId, params, signal, onUpdate, ctx ?? (ctxFactory?.() as ExtensionContext)),
	};
}
```

它把丰富的 `ToolDefinition` 投影成精简的 `AgentTool`——丢掉 `promptSnippet`、`promptGuidelines`、`renderCall`、`renderResult`，只保留核心需要的字段。还有一个反向的 `createToolDefinitionFromAgentTool`，当调用方直接提供一个裸 `AgentTool`（没有提示词元数据和渲染器）时，合成一个最小的 `ToolDefinition`，让产品层的注册表保持"定义优先"。

这种"丰富接口 + 精简接口 + 薄包装"的模式，是 Pi Agent 分层哲学的微观体现：核心只拿它需要的，产品保留它额外的，两者互不污染。扩展系统（第 14 章）注册自定义工具时用的也是 `ToolDefinition`——自定义工具因此天然获得提示词集成和 UI 渲染的能力。

---

## 执行管线：prepare / execute / finalize

现在进入循环内部。第 3 章的 `executeToolCalls` 先做一个分派决策：

```typescript
async function executeToolCalls(currentContext, assistantMessage, config, signal, emit) {
	const toolCalls = assistantMessage.content.filter((c) => c.type === "toolCall");
	const hasSequentialToolCall = toolCalls.some(
		(tc) => currentContext.tools?.find((t) => t.name === tc.name)?.executionMode === "sequential",
	);
	if (config.toolExecution === "sequential" || hasSequentialToolCall) {
		return executeToolCallsSequential(currentContext, assistantMessage, toolCalls, config, signal, emit);
	}
	return executeToolCallsParallel(currentContext, assistantMessage, toolCalls, config, signal, emit);
}
```

规则很简单：只要这一批里**有一个**工具声明了 `executionMode: "sequential"`，或者全局配置是 sequential，整批就串行；否则并行。注意这是"一颗老鼠屎坏一锅汤"的策略——一个串行工具会让同批所有工具都串行。这是保守而正确的：串行工具往往有副作用顺序要求，与它并行的工具可能踩到它。

无论串行还是并行，每个工具调用都经过同样的三个阶段。

### 阶段一：prepare

`prepareToolCall` 做执行前的一切准备，返回一个 `PreparedToolCall` 或一个立即的失败结果：

```typescript
async function prepareToolCall(currentContext, assistantMessage, toolCall, config, signal) {
	// 1. 找到工具，找不到立即报错
	const tool = currentContext.tools?.find((t) => t.name === toolCall.name);
	if (!tool) {
		return { kind: "immediate", result: createErrorToolResult(`Tool ${toolCall.name} not found`), isError: true };
	}
	try {
		// 2. 参数预处理（可选）
		const preparedToolCall = prepareToolCallArguments(tool, toolCall);
		// 3. 按 schema 校验参数（来自 pi-ai）
		const validatedArgs = validateToolArguments(tool, preparedToolCall);
		// 4. beforeToolCall 钩子，可以 block
		if (config.beforeToolCall) {
			const beforeResult = await config.beforeToolCall({ assistantMessage, toolCall, args: validatedArgs, context: currentContext }, signal);
			if (signal?.aborted) return { kind: "immediate", result: createErrorToolResult("Operation aborted"), isError: true };
			if (beforeResult?.block) {
				return { kind: "immediate", result: createErrorToolResult(beforeResult.reason || "Tool execution was blocked"), isError: true };
			}
		}
		if (signal?.aborted) return { kind: "immediate", result: createErrorToolResult("Operation aborted"), isError: true };
		return { kind: "prepared", toolCall, tool, args: validatedArgs };
	} catch (error) {
		return { kind: "immediate", result: createErrorToolResult(error instanceof Error ? error.message : String(error)), isError: true };
	}
}
```

四个步骤：查工具、`prepareArguments` 预处理、`validateToolArguments` 按 TypeBox schema 校验、`beforeToolCall` 钩子。`beforeToolCall` 是产品层和扩展的拦截点——它可以返回 `{ block: true, reason }` 来阻止执行。回忆第 1 章：Pi Agent 没有逐工具审批弹窗，但扩展可以通过 `beforeToolCall`（或产品层通过 `tool_call` 事件）实现自己的拦截逻辑。安全机制是外推的，但接缝留在这里。

注意所有失败都返回 `kind: "immediate"` 的结果对象，而不是抛出——又一次贯彻了"失败是数据"的契约。

### 阶段二：execute

`executePreparedToolCall` 真正调用工具，并处理进度上报与异常：

```typescript
async function executePreparedToolCall(prepared, signal, emit) {
	const updateEvents: Promise<void>[] = [];
	let acceptingUpdates = true;
	try {
		const result = await prepared.tool.execute(
			prepared.toolCall.id,
			prepared.args,
			signal,
			(partialResult) => {
				if (!acceptingUpdates) return;
				updateEvents.push(Promise.resolve(emit({
					type: "tool_execution_update",
					toolCallId: prepared.toolCall.id,
					toolName: prepared.toolCall.name,
					args: prepared.toolCall.arguments,
					partialResult,
				})));
			},
		);
		acceptingUpdates = false;
		await Promise.all(updateEvents);
		return { result, isError: false };
	} catch (error) {
		acceptingUpdates = false;
		await Promise.all(updateEvents);
		return { result: createErrorToolResult(error instanceof Error ? error.message : String(error)), isError: true };
	} finally {
		acceptingUpdates = false;
	}
}
```

工具通过第四个参数 `onUpdate` 回调上报进度，循环把它转成 `tool_execution_update` 事件。`acceptingUpdates` 标志确保工具返回后不再接受迟到的进度更新。工具抛出的异常被捕获，转换成一个错误工具结果——工具执行失败不会炸掉循环，而是变成一个 `isError: true` 的结果回灌给模型，让模型自己决定如何应对（重试？换个方法？放弃？）。

### 阶段三：finalize

`finalizeExecutedToolCall` 给 `afterToolCall` 钩子最后一次修改结果的机会：

```typescript
async function finalizeExecutedToolCall(currentContext, assistantMessage, prepared, executed, config, signal) {
	let result = executed.result;
	let isError = executed.isError;
	if (config.afterToolCall) {
		try {
			const afterResult = await config.afterToolCall({ assistantMessage, toolCall: prepared.toolCall, args: prepared.args, result, isError, context: currentContext }, signal);
			if (afterResult) {
				result = {
					...result,
					content: afterResult.content ?? result.content,
					details: afterResult.details ?? result.details,
					usage: afterResult.usage ?? result.usage,
					terminate: afterResult.terminate ?? result.terminate,
				};
				isError = afterResult.isError ?? isError;
			}
		} catch (error) {
			result = createErrorToolResult(error instanceof Error ? error.message : String(error));
			isError = true;
		}
	}
	return { toolCall: prepared.toolCall, result, isError };
}
```

`afterToolCall` 可以覆盖 `content`、`details`、`usage`、`terminate`、`isError`。这给了产品层和扩展一个"事后审查"的槽位——比如记录审计日志、修改回灌给模型的内容、或设置 `terminate` 强制循环停止。

最后，`createToolResultMessage` 把最终结果打包成一条 `toolResult` 消息：

```typescript
function createToolResultMessage(finalized): ToolResultMessage {
	return {
		role: "toolResult",
		toolCallId: finalized.toolCall.id,
		toolName: finalized.toolCall.name,
		content: finalized.result.content ?? [],
		details: finalized.result.details,
		usage: finalized.result.usage,
		...(finalized.result.addedToolNames?.length ? { addedToolNames: finalized.result.addedToolNames } : {}),
		isError: finalized.isError,
		timestamp: Date.now(),
	};
}
```

这条消息会被追加进上下文，成为下一次模型调用的输入。`addedToolNames` 是一个有趣的字段：工具可以声明"我执行之后，请把这些工具也加入可用集合"——这是工具动态扩展工具集的一条暗道。

---

## 并发：并行执行如何安全发生

默认 `toolExecution: "parallel"`。并行执行的设计有一个精妙之处——**预检串行，执行并行**：

```typescript
async function executeToolCallsParallel(currentContext, assistantMessage, toolCalls, config, signal, emit) {
	const finalizedCalls: FinalizedToolCallEntry[] = [];

	for (const toolCall of toolCalls) {
		await emit({ type: "tool_execution_start", toolCallId: toolCall.id, toolName: toolCall.name, args: toolCall.arguments });

		// 预检（prepare）是串行的
		const preparation = await prepareToolCall(currentContext, assistantMessage, toolCall, config, signal);
		if (preparation.kind === "immediate") {
			// 立即结果直接收尾
			const finalized = { toolCall, result: preparation.result, isError: preparation.isError };
			await emitToolExecutionEnd(finalized, emit);
			finalizedCalls.push(finalized);
			continue;
		}

		// 真正的执行被包成一个 thunk，稍后并行跑
		finalizedCalls.push(async () => {
			const executed = await executePreparedToolCall(preparation, signal, emit);
			const finalized = await finalizeExecutedToolCall(currentContext, assistantMessage, preparation, executed, config, signal);
			await emitToolExecutionEnd(finalized, emit);
			return finalized;
		});
	}

	// 所有 thunk 并行执行
	const orderedFinalizedCalls = await Promise.all(
		finalizedCalls.map((entry) => (typeof entry === "function" ? entry() : Promise.resolve(entry))),
	);

	// 结果按助手消息里的原始顺序发出
	const messages: ToolResultMessage[] = [];
	for (const finalized of orderedFinalizedCalls) {
		const toolResultMessage = createToolResultMessage(finalized);
		await emitToolResultMessage(toolResultMessage, emit);
		messages.push(toolResultMessage);
	}
	return { messages, terminate: shouldTerminateToolBatch(orderedFinalizedCalls) };
}
```

为什么要"预检串行、执行并行"？因为 `prepareToolCall` 里的 `beforeToolCall` 钩子可能有副作用（记录日志、弹审批、修改状态），让它们按模型发出的顺序确定性地发生，比让它们竞态要可预测得多。而真正的执行（读文件、跑命令）是耗时的，并行它们才有收益。于是：

- **`tool_execution_start`** 按原始顺序发出（预检是串行的）
- **`tool_execution_end`** 按**完成顺序**发出（谁先跑完谁先发，UI 可以即时显示）
- **`toolResult` 消息**按**原始顺序**追加进上下文（保证转录的确定性）

这个"事件按完成序、消息按原始序"的区分很关键：UI 想要即时反馈（谁好了先显示谁），但模型看到的转录必须是确定的（同样的输入产生同样的消息序列，否则缓存和重放都会出问题）。Pi Agent 用 `Promise.all` 保住了执行顺序与数组顺序的一致，从而让消息序列确定。

### 终止信号

一批工具执行完后，`shouldTerminateToolBatch` 决定是否停止循环：

```typescript
function shouldTerminateToolBatch(finalizedCalls: FinalizedToolCallOutcome[]): boolean {
	return finalizedCalls.length > 0 && finalizedCalls.every((finalized) => finalized.result.terminate === true);
}
```

只有当**每一个**最终结果都设置了 `terminate: true`，这一批才终止循环。这是一个"全票通过"的规则：只要有一个工具没说"该停了"，循环就继续。这避免了某个工具过早地掐断还在进行中的工作。

---

## 文件互斥：并行写同一个文件怎么办

并行执行带来一个真实的危险：如果模型在同一批里发出两个 `edit` 调用，都改同一个文件，会怎样？两个写操作交错，文件可能被写坏。

Pi Agent 的解法是一个按路径的互斥队列 `withFileMutationQueue`（`packages/agent/src/harness/tools/file-mutation-queue.ts`）。它的核心是一个 `WeakMap`，按 `ExecutionEnv` 维护一张"路径 → promise 链"的表：

```typescript
const states = new WeakMap<ExecutionEnv, MutationQueueState>();

export async function withFileMutationQueue<T>(env: ExecutionEnv, path: string, fn: () => Promise<T>): Promise<T> {
	const state = getState(env);
	const registration = state.registration.then(async () => {
		const key = await getMutationQueueKey(env, path); // 规范化路径作为 key
		const currentQueue = state.queues.get(key) ?? Promise.resolve();

		let releaseNext = () => {};
		const nextQueue = new Promise<void>((resolve) => { releaseNext = resolve; });
		const chainedQueue = currentQueue.then(() => nextQueue);
		state.queues.set(key, chainedQueue);
		return { key, currentQueue, chainedQueue, releaseNext };
	});
	state.registration = registration.then(() => undefined, () => undefined);

	const { key, currentQueue, chainedQueue, releaseNext } = await registration;
	await currentQueue; // 等前面的写操作完成
	try {
		return await fn();
	} finally {
		releaseNext(); // 放行下一个
		if (state.queues.get(key) === chainedQueue) state.queues.delete(key);
	}
}
```

机制是经典的"promise 链互斥"：每个针对同一规范化路径的写操作，都把自己接到该路径当前 promise 链的末尾，先 `await currentQueue` 等前面的完成，执行完再 `releaseNext()` 放行下一个。于是并行的 `edit`/`write` 调用到了文件层面会自动排成串行，彼此不交错。

两个细节值得注意。其一，key 是**规范化路径**（`canonicalPath`）——这样 `./foo/bar.ts` 和 `/abs/foo/bar.ts` 指向同一个队列，不会因为写法不同而漏掉互斥。其二，用 `WeakMap` 以 `ExecutionEnv` 为键，意味着不同执行环境（比如不同的沙箱）有各自独立的队列，且环境被回收时队列也自动清理。`createEditTool` 和 `createWriteTool` 把自己的执行体包在这个队列里，而 `read` 不需要（读不冲突）。

这是一个"在正确的层次解决并发"的好例子：循环层允许工具并行（收益），工具层用路径互斥消除写冲突（安全），两者各司其职。

---

## 七个内置工具

产品层提供七个内置工具，每个都在 `packages/coding-agent/src/core/tools/` 下有自己的文件：

| 工具 | 文件 | 职责 | 默认激活 |
|------|------|------|---------|
| `read` | `read.ts` | 读文件/图片，支持 offset/limit，自动截断 | 是 |
| `bash` | `bash.ts` | 执行 shell 命令 | 是 |
| `edit` | `edit.ts` | 精确字符串替换编辑 | 是 |
| `write` | `write.ts` | 写入/创建文件 | 是 |
| `grep` | `grep.ts` | 内容搜索（只读） | 否 |
| `find` | `find.ts` | 文件查找（只读） | 否 |
| `ls` | `ls.ts` | 列目录（只读） | 否 |

注册表在 `packages/coding-agent/src/core/tools/index.ts`：

```typescript
export type ToolName = "read" | "bash" | "edit" | "write" | "grep" | "find" | "ls";
export const allToolNames: Set<ToolName> = new Set(["read", "bash", "edit", "write", "grep", "find", "ls"]);
export function createCodingToolDefinitions(cwd, options?)  // read, bash, edit, write
export function createReadOnlyToolDefinitions(cwd, options?) // read, grep, find, ls
```

默认激活集合是 `["read", "bash", "edit", "write"]`（在 `packages/coding-agent/src/core/sdk.ts` 里设定）。`grep`/`find`/`ls` 可用但默认关闭——因为有 `bash` 在，模型完全可以用 `rg`/`find`/`ls` 命令达到同样目的；这三个只读工具是给"想要一个更受限工具集"的场景准备的（通过 `--tools` 显式开启）。

看一个具体工具的定义（`read.ts`，节选）：

```typescript
const readSchema = Type.Object({
	path: Type.String({ description: "Path to the file to read (relative or absolute)" }),
	offset: Type.Optional(Type.Number({ description: "Line number to start reading from (1-indexed)" })),
	limit: Type.Optional(Type.Number({ description: "Maximum number of lines to read" })),
});

export function createReadToolDefinition(cwd, options?): ToolDefinition<typeof readSchema, ReadToolDetails | undefined> {
	return {
		name: "read",
		label: "read",
		description: `Read the contents of a file. Supports text files and images ...`,
		promptSnippet: "Read file contents",
		promptGuidelines: ["Use read to examine files instead of cat or sed."],
		parameters: readSchema,
		async execute(_toolCallId, { path, offset, limit }, signal?, _onUpdate?, ctx?) {
			// 读文件/图片，截断过长内容
		},
		renderCall(args, theme, context) { /* 返回一个 pi-tui Text 组件 */ },
		renderResult(result, options, theme, context) { /* 语法高亮预览 */ },
	};
}

export function createReadTool(cwd, options?): AgentTool<typeof readSchema> {
	return wrapToolDefinition(createReadToolDefinition(cwd, options));
}
```

这个定义把工具的一切都说清楚了：参数 schema（`readSchema`）、给模型的描述（`description`）、提示词里的一行简介（`promptSnippet`）、激活时的指南（`promptGuidelines`）、执行逻辑（`execute`）、以及两个 TUI 渲染器。`createReadTool` 只是 `wrapToolDefinition(createReadToolDefinition(...))`——丰富定义投影成精简 `AgentTool`。

工具还可以有可插拔的 `operations`（比如 `ReadOperations`），让文件 IO 可以委托给远程系统（如 SSH）。这是为远程执行场景留的接缝，第 15 章会回到。

---

## 实践应用

Pi Agent 的工具系统为"如何设计可扩展的工具/插件机制"提供了四条可迁移的模式。

**工具自描述，编排器无知。** 让每个工具声明自己的参数 schema、并发模式、提示词片段、UI 渲染方式；编排器（循环）只读这些声明，不"了解"任何具体工具。它解决的问题是：中央编排器变成上帝对象，每加一个工具都要改它。当工具自描述，新增第 N+1 个工具对现有代码的改动是零。

**丰富接口 + 精简接口 + 薄包装。** 核心只需要工具的执行能力，产品还需要提示词和渲染元数据——用两个接口分别表达，用一个薄函数投影。它解决的问题是：核心被迫背上产品层的关注点。当 `AgentTool` 不知道 `renderCall` 的存在，核心就能在任何没有 UI 的环境（SDK、浏览器、守护进程）里复用。

**预检串行，执行并行。** 把有副作用、需要确定顺序的预检（校验、审批钩子）串行执行，把耗时的真正执行并行。它解决的问题是：要么全串行（慢），要么全并行（预检竞态、转录不确定）。这个拆分同时拿到了并行的速度和确定的顺序。

**在正确的层次解决并发。** 循环层允许工具并行以提速，工具层用按路径的 promise 链互斥消除写冲突。它解决的问题是：要么在循环层粗暴地全串行（牺牲并发收益），要么对冲突视而不见（写坏文件）。把互斥下沉到"实际共享资源"的层次，并发与安全才能兼得。

---

## 总结

Pi Agent 的工具是自描述对象：核心认识精简的 `AgentTool`，产品使用丰富的 `ToolDefinition`，两者由 `wrapToolDefinition` 桥接。每个工具调用经过 prepare（查工具、预处理、校验、`beforeToolCall`）、execute（执行 + 进度上报 + 异常捕获）、finalize（`afterToolCall` 事后修改）三个阶段。并发上，预检串行、执行并行，事件按完成序发出而消息按原始序追加；写冲突由按规范化路径的 promise 链互斥消除。

七个内置工具（read/bash/edit/write/grep/find/ls）各自把参数、描述、提示词片段、渲染器说清楚，默认激活前四个。整个系统没有一处"了解所有工具"的中央代码——这正是它能线性扩展的原因。

下一章，我们看工具产生的消息如何被组织进状态——以及 Pi Agent 那个独特的、把转录建模为可分支树的设计。
