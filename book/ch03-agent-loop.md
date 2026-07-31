# 第 3 章：Agent Loop——两层嵌套循环

## 跳动的心脏

第 2 章展示了 `pi-ai` 如何把约 38 个提供商藏到一套统一的流式 API 之后——`StreamFn` 进，`AssistantMessageEventStream` 出，失败编码进流。但单次模型调用不是 Agent。Agent 是一个循环：调用模型，执行工具，把结果反馈回去，再调用模型，直到工作完成。

每个系统都有一个重心。在数据库里是存储引擎，在编译器里是中间表示。在 Pi Agent 里，它是 `packages/agent/src/agent-loop.ts`——驱动每一次交互的核心循环，从 REPL 里的第一次按键到 headless `-p` 调用的最后一次工具调用。

如果你读过参考书里 Claude Code 的 `query.ts`——那个 1,730 行、包含四层压缩、五类错误恢复、十种终止状态的"潜艇"——那么 Pi Agent 的循环会让你松一口气。`agent-loop.ts` 的核心 `runLoop` 函数是一个**两层嵌套的 `while` 循环**，没有压缩迷宫，没有恢复阶梯。它的复杂性不在循环内部，而在它*外推*出去的东西：压缩交给 `transformContext` 回调，错误恢复交给 `pi-ai` 的双层重试，停止决策交给 `shouldStopAfterTurn` 钩子。

本章从头到尾追踪这个循环。读完之后，你会理解它为什么能这么干净——以及那份干净是用什么换来的。

---

## 循环的形状：事件流 + emit 回调

第一个架构问题是：循环如何把它的进展告诉外界？

Pi Agent 的答案是把"纯净的循环逻辑"和"可观察的封装"分成两层。最底层是一个 `emit` 回调：

```typescript
export type AgentEventSink = (event: AgentEvent) => Promise<void> | void;

export async function runAgentLoop(
	prompts: AgentMessage[],
	context: AgentContext,
	config: AgentLoopConfig,
	emit: AgentEventSink,
	signal: AbortSignal | undefined,
	streamFn: StreamFn,
): Promise<AgentMessage[]>
```

`runAgentLoop` 接收一个 `emit` 函数，循环每有进展就调用它，最终返回这一轮新增的所有消息。这是一个纯粹的"跑完一轮"的函数——它不关心谁在监听。

在这之上，`agentLoop` 提供了一个可观察的封装，返回第 2 章见过的 `EventStream`：

```typescript
export function agentLoop(
	prompts: AgentMessage[],
	context: AgentContext,
	config: AgentLoopConfig,
	signal: AbortSignal | undefined,
	streamFn: StreamFn,
): EventStream<AgentEvent, AgentMessage[]> {
	const stream = createAgentStream();
	void runAgentLoop(prompts, context, config, async (event) => {
		stream.push(event);
	}, signal, streamFn).then((messages) => {
		stream.end(messages);
	});
	return stream;
}
```

注意这个封装有多薄：它只是把 `emit` 桥接到 `stream.push`，把返回值桥接到 `stream.end`。`createAgentStream()` 创建的 `EventStream` 以 `agent_end` 事件为完成条件，从该事件里提取 `messages` 作为最终结果。

这与参考书里 Claude Code 的选择形成了对照。Claude Code 用 async generator（`yield` 消息、返回 `Terminal` 联合类型）作为循环的形状。Pi Agent 用 `EventStream` + `emit` 回调。两者都提供背压和可组合性，但 Pi 的分离有一个额外好处：**核心循环 `runLoop` 完全不依赖任何流式抽象**，它只认识一个 `emit` 函数。这让循环本身可以被任何编排器（核心 `Agent`、Harness、产品层的 `AgentSession`）以任意方式驱动。第 6 章会看到 Harness 如何直接驱动 `runAgentLoop`，第 9 章会看到产品层如何通过核心 `Agent` 间接驱动它。

还有一对"续接"变体 `runAgentLoopContinue` / `agentLoopContinue`，用于重试场景——上下文里已经有用户消息或工具结果，不需要再追加新消息。它有一个前置校验：最后一条消息不能是 `assistant`（否则提供商会拒绝请求）。

---

## 让循环保持简单的契约：永不抛出

在追踪循环体之前，必须理解它为什么能这么简洁。秘密在 `AgentLoopConfig` 的每一个回调上。打开 `packages/agent/src/types.ts`，你会发现每个回调的文档里都重复着同一句话：

```typescript
export interface AgentLoopConfig extends SimpleStreamOptions {
	model: Model<any>;

	// Contract: must not throw or reject. Return a safe fallback value instead.
	convertToLlm: (messages: AgentMessage[]) => Message[] | Promise<Message[]>;

	// Contract: must not throw or reject. Return the original messages or another
	// safe fallback value instead.
	transformContext?: (messages: AgentMessage[], signal?: AbortSignal) => Promise<AgentMessage[]>;

	// Contract: must not throw or reject. Return undefined when no key is available.
	getApiKey?: (provider: string) => Promise<string | undefined> | string | undefined;

	// Contract: must not throw or reject.
	shouldStopAfterTurn?: (context: ShouldStopAfterTurnContext) => boolean | Promise<boolean>;

	prepareNextTurn?: (context: PrepareNextTurnContext) => AgentLoopTurnUpdate | undefined | Promise<...>;

	// Contract: must not throw or reject. Return [] when no steering messages are available.
	getSteeringMessages?: () => Promise<AgentMessage[]>;

	// Contract: must not throw or reject. Return [] when no follow-up messages are available.
	getFollowUpMessages?: () => Promise<AgentMessage[]>;

	toolExecution?: ToolExecutionMode; // 默认 "parallel"
	// ... beforeToolCall / afterToolCall / toolExecution 等
}
```

`convertToLlm`、`transformContext`、`getApiKey`、`shouldStopAfterTurn`、`getSteeringMessages`、`getFollowUpMessages`——每一个都写着 **"must not throw or reject"**。加上第 2 章 `StreamFn` 的"永不抛出"契约，整个循环的所有协作者都承诺：失败是返回值，不是异常。

这就是循环内部几乎没有 `try/catch` 的原因。它不需要防御性地包裹每个回调，因为契约已经排除了异常这条路。复杂性没有消失——它被转移到了契约的*实现方*（`pi-ai` 把失败编码进流，`convertToLlm` 返回安全兜底值）。这是一种用"契约纪律"换"循环简洁"的交易，而 Pi Agent 认为这笔交易划算。

`AgentLoopConfig` 的回调也是循环与外界的全部接缝。压缩？那是 `transformContext` 的事。停止策略？那是 `shouldStopAfterTurn` 的事。轮间换模型？那是 `prepareNextTurn` 的事。循环本身对这些一无所知——它只是在固定的时机调用这些回调。第 7 章的压缩、第 9 章的产品编排，都是通过往这些槽位里塞回调来实现的。

---

## 循环体：两层嵌套

现在看核心。`runLoop` 是整个系统的心跳，它的骨架是这样的（为清晰起见略去了部分细节）：

```typescript
async function runLoop(
	initialContext: AgentContext,
	newMessages: AgentMessage[],
	initialConfig: AgentLoopConfig,
	signal: AbortSignal | undefined,
	emit: AgentEventSink,
	streamFunction: StreamFn,
): Promise<void> {
	let currentContext = initialContext;
	let config = initialConfig;
	let firstTurn = true;
	let pendingMessages: AgentMessage[] = (await config.getSteeringMessages?.()) || [];

	// 外层循环：当 agent 本应停止后又有 follow-up 消息到达时继续
	while (true) {
		let hasMoreToolCalls = true;

		// 内层循环：处理工具调用与 steering 消息
		while (hasMoreToolCalls || pendingMessages.length > 0) {
			if (!firstTurn) await emit({ type: "turn_start" });
			else firstTurn = false;

			// 1. 注入待处理消息（steering）
			if (pendingMessages.length > 0) {
				for (const message of pendingMessages) {
					await emit({ type: "message_start", message });
					await emit({ type: "message_end", message });
					currentContext.messages.push(message);
					newMessages.push(message);
				}
				pendingMessages = [];
			}

			// 2. 流式获取助手响应
			const message = await streamAssistantResponse(currentContext, config, signal, emit, streamFunction);
			newMessages.push(message);

			// 3. 错误/中止 → 立即终止
			if (message.stopReason === "error" || message.stopReason === "aborted") {
				await emit({ type: "turn_end", message, toolResults: [] });
				await emit({ type: "agent_end", messages: newMessages });
				return;
			}

			// 4. 执行工具调用
			const toolCalls = message.content.filter((c) => c.type === "toolCall");
			const toolResults: ToolResultMessage[] = [];
			hasMoreToolCalls = false;
			if (toolCalls.length > 0) {
				const executedToolBatch =
					message.stopReason === "length"
						? await failToolCallsFromTruncatedMessage(toolCalls, emit)
						: await executeToolCalls(currentContext, message, config, signal, emit);
				toolResults.push(...executedToolBatch.messages);
				hasMoreToolCalls = !executedToolBatch.terminate;
				for (const result of toolResults) {
					currentContext.messages.push(result);
					newMessages.push(result);
				}
			}

			await emit({ type: "turn_end", message, toolResults });

			// 5. 轮间准备：可替换 context / model / thinking
			const nextTurnSnapshot = await config.prepareNextTurn?.({ message, toolResults, context: currentContext, newMessages });
			if (nextTurnSnapshot) {
				currentContext = nextTurnSnapshot.context ?? currentContext;
				config = { ...config, model: nextTurnSnapshot.model ?? config.model, /* thinking... */ };
			}

			// 6. 停止检查
			if (await config.shouldStopAfterTurn?.({ message, toolResults, context: currentContext, newMessages })) {
				await emit({ type: "agent_end", messages: newMessages });
				return;
			}

			// 7. 轮询 steering 消息
			pendingMessages = (await config.getSteeringMessages?.()) || [];
		}

		// 内层结束：agent 本应停止。检查 follow-up 消息。
		const followUpMessages = (await config.getFollowUpMessages?.()) || [];
		if (followUpMessages.length > 0) {
			pendingMessages = followUpMessages;
			continue; // 外层循环继续
		}
		break; // 真的结束了
	}

	await emit({ type: "agent_end", messages: newMessages });
}
```

这就是整个循环。让我们拆解它的结构。

### 内层循环：工具调用与 steering

内层 `while (hasMoreToolCalls || pendingMessages.length > 0)` 是经典 Agent 循环的形状：只要还有工具调用要处理，就继续。每次迭代：

1. 发出 `turn_start`（首轮除外）
2. 注入任何待处理的 steering 消息
3. 流式获取助手响应
4. 如果响应出错/中止，终止整个 agent
5. 提取并执行工具调用，把结果追加进上下文
6. 发出 `turn_end`
7. 调用 `prepareNextTurn`（可换模型/上下文）
8. 调用 `shouldStopAfterTurn`（可优雅停止）
9. 轮询新的 steering 消息

`hasMoreToolCalls` 的更新是关键：它等于 `!executedToolBatch.terminate`。也就是说，只要这一批工具调用里没有一个"终止信号"，循环就继续。模型不需要显式说"我还要继续"——只要它发出了工具调用，循环就默认继续；只要它不再发工具调用，`hasMoreToolCalls` 就是 `false`，内层循环结束。

### 外层循环：follow-up

外层 `while (true)` 处理一种特殊情况：agent 已经没有工具调用、也没有 steering 消息，*本应停止*了——但此时可能有 follow-up 消息在排队。

steering 与 follow-up 的区别是时机：**steering** 是"agent 还在工作时插话"（内层循环每轮末尾轮询），**follow-up** 是"等 agent 忙完再说下一件事"（外层循环在内层结束后轮询）。这个二层结构让产品层可以实现"用户在 agent 工作时输入了补充说明"（steering）和"用户排队了下一个任务"（follow-up）两种体验。第 9 章会看到 `AgentSession` 如何用两个队列驱动这两个回调。

### 续接与停止：所有决策点

把循环的退出路径列成一张表，你会发现它少得惊人：

| 决策点 | 条件 | 结果 |
|--------|------|------|
| 模型失败 | `stopReason === "error" \| "aborted"` | 发 `agent_end`，返回 |
| 工具终止 | 一批工具调用全部 `terminate: true` | `hasMoreToolCalls = false`，内层结束 |
| 无工具调用 | 助手消息没有 `toolCall` 块 | `hasMoreToolCalls = false`，内层结束 |
| 优雅停止 | `shouldStopAfterTurn()` 返回 true | 发 `agent_end`，返回 |
| follow-up 到达 | `getFollowUpMessages()` 非空 | 外层循环继续 |
| 自然完成 | 无工具、无 steering、无 follow-up | `break`，发 `agent_end` |

没有"四层压缩"，没有"升级阶梯"，没有十种终止状态的可辨识联合。循环的终止原因被外推了：压缩失败、token 超限这些会在 `transformContext` 或 `pi-ai` 里处理，最终以 `stopReason: "error"` 的形式进入第 3 个决策点。这是最小化哲学在循环内部的直接体现。

---

## `streamAssistantResponse`：LLM 边界

循环里唯一与模型打交道的地方是 `streamAssistantResponse`。它的注释一针见血：

> This is where AgentMessage[] gets transformed to Message[] for the LLM.

```typescript
async function streamAssistantResponse(
	context: AgentContext,
	config: AgentLoopConfig,
	signal: AbortSignal | undefined,
	emit: AgentEventSink,
	streamFunction: StreamFn,
): Promise<AssistantMessage> {
	// 1. 可选的上下文变换（AgentMessage[] → AgentMessage[]）
	let messages = context.messages;
	if (config.transformContext) {
		messages = await config.transformContext(messages, signal);
	}

	// 2. 转换成 LLM 消息（AgentMessage[] → Message[]）
	const llmMessages = await config.convertToLlm(messages);

	// 3. 构建 LLM 上下文
	const llmContext: Context = {
		systemPrompt: context.systemPrompt,
		messages: llmMessages,
		tools: context.tools,
	};

	// 4. 解析 API key（对会过期的 token 很重要）
	const resolvedApiKey =
		(config.getApiKey ? await config.getApiKey(config.model.provider) : undefined) || config.apiKey;

	// 5. 调用 StreamFn，迭代事件流
	const response = await streamFunction(config.model, llmContext, { ...config, apiKey: resolvedApiKey, signal });

	let partialMessage: AssistantMessage | null = null;
	let addedPartial = false;
	for await (const event of response) {
		switch (event.type) {
			case "start":
				partialMessage = event.partial;
				context.messages.push(partialMessage);
				addedPartial = true;
				await emit({ type: "message_start", message: { ...partialMessage } });
				break;
			case "text_delta": /* ...各类 delta... */
				if (partialMessage) {
					partialMessage = event.partial;
					context.messages[context.messages.length - 1] = partialMessage;
					await emit({ type: "message_update", assistantMessageEvent: event, message: { ...partialMessage } });
				}
				break;
			case "done":
			case "error": {
				const finalMessage = await response.result();
				context.messages[context.messages.length - 1] = finalMessage;
				await emit({ type: "message_end", message: finalMessage });
				return finalMessage;
			}
		}
	}
	// ...
}
```

这里有几个值得注意的设计。

**两次消息转换，职责分明。** `transformContext` 在 `AgentMessage` 层面工作（裁剪旧消息、注入外部上下文），`convertToLlm` 把 `AgentMessage[]` 翻译成提供商的 `Message[]`（过滤掉 UI-only 的自定义消息）。第 7 章的压缩挂在 `transformContext` 上，第 5 章的自定义消息过滤挂在 `convertToLlm` 上。两个槽位，两种关注点。

**partial message 的原地更新。** 流式开始时，`start` 事件带来一个 `partial` 消息，被 push 进 `context.messages`；之后每个 delta 事件都用新的 `partial` **替换数组最后一个元素**（`context.messages[context.messages.length - 1] = partialMessage`）。这样上下文里始终只有一个"正在生成中"的助手消息，而不是每个 delta 一个。`done`/`error` 时用 `response.result()` 拿到的最终消息替换它。

**`getApiKey` 每次调用都解析。** 注释解释了原因：像 GitHub Copilot 这样的短期 OAuth token 可能在漫长的工具执行阶段过期。每次模型调用前重新解析 key，避免用过期凭证请求。

**`done` 和 `error` 走同一条路径。** 因为 `EventStream` 的 `result()` 在出错时也 resolve（resolve 成那个 `stopReason: "error"` 的消息），这里不需要区分成功与失败——统一拿最终消息、发 `message_end`、返回。失败的处理被推迟到循环体的第 3 步（检查 `stopReason`）。

---

## 截断保护：当输出被 token 限制切断

循环里有一处防御性代码，背后是一个真实的陷阱。当助手响应的 `stopReason === "length"`（输出被 token 上限截断）时，它发出的工具调用可能携带**被截断的参数**。

问题在于：流式工具调用的参数是用一个"尽力而为的 JSON  salvager"增量解析的。一个被截断的工具调用，其参数可能恰好解析并校验通过，但内容是悄悄不完整的——比如一个文件路径被截断了一半。执行这样的工具调用是危险的。

循环的处理是直接失败掉这一批所有工具调用：

```typescript
const executedToolBatch =
	message.stopReason === "length"
		? await failToolCallsFromTruncatedMessage(toolCalls, emit)
		: await executeToolCalls(currentContext, message, config, signal, emit);
```

`failToolCallsFromTruncatedMessage` 为每个工具调用生成一个错误结果，告诉模型：

> Tool call "X" was not executed: the response hit the output token limit, so its arguments may be truncated. Re-issue the tool call with complete arguments.

这样模型会重新发出完整的工具调用。这是一个"宁可失败也不执行可疑调用"的安全选择——而且因为失败结果被回灌进上下文，循环会自然地继续，给模型重发的机会。

---

## `prepareNextTurn`：轮间变身

`prepareNextTurn` 是一个容易被忽略但很强大的钩子。它在每轮 `turn_end` 之后被调用，可以返回一个新的 `context`、`model`、`thinkingLevel`：

```typescript
const nextTurnSnapshot = await config.prepareNextTurn?.({ message, toolResults, context: currentContext, newMessages });
if (nextTurnSnapshot) {
	currentContext = nextTurnSnapshot.context ?? currentContext;
	config = {
		...config,
		model: nextTurnSnapshot.model ?? config.model,
		reasoning: nextTurnSnapshot.thinkingLevel === undefined ? config.reasoning : /* ... */,
	};
}
```

注意它替换的是循环的**局部变量** `currentContext` 和 `config`——下一轮就用新的值。这让产品层可以在一轮对话中途切换模型（比如"这个任务用更强的模型"）、重新读取会话树以拾取运行中的变更、或调整 thinking 级别。第 9 章会看到 `AgentSession` 如何用这个钩子在轮间重新从会话树构建上下文。

---

## `AgentEvent`：循环的语言

循环不说别的，只说 `AgentEvent`。这个可辨识联合（`packages/agent/src/types.ts`）是循环与外界唯一的通信语言：

```typescript
export type AgentEvent =
	// Agent 生命周期
	| { type: "agent_start" }
	| { type: "agent_end"; messages: AgentMessage[] }
	// 轮次生命周期 - 一个轮次 = 一次助手响应 + 其工具调用/结果
	| { type: "turn_start" }
	| { type: "turn_end"; message: AgentMessage; toolResults: ToolResultMessage[] }
	// 消息生命周期 - user、assistant、toolResult 都会发
	| { type: "message_start"; message: AgentMessage }
	| { type: "message_update"; message: AgentMessage; assistantMessageEvent: AssistantMessageEvent }
	| { type: "message_end"; message: AgentMessage }
	// 工具执行生命周期
	| { type: "tool_execution_start"; toolCallId: string; toolName: string; args: any }
	| { type: "tool_execution_update"; toolCallId: string; toolName: string; args: any; partialResult: any }
	| { type: "tool_execution_end"; toolCallId: string; toolName: string; result: any; isError: boolean };
```

十种事件，覆盖了 agent、轮次、消息、工具四个层次的生命周期。`message_update` 只在助手消息流式期间发出，携带原始的 `AssistantMessageEvent`（来自 `pi-ai`），让消费者可以做增量渲染。

核心 `Agent` 类（`packages/agent/src/agent.ts`）的角色就是这条事件流的**归约器**（reducer）。它的 `processEvents(event)` 方法根据事件类型更新自己的可变状态——`message_end` 把消息推进 `messages`，`tool_execution_start/end` 往 `pendingToolCalls` 集合里增删——然后把事件分发给所有订阅者。第 5 章会详述 `Agent` 的状态管理。

这种"循环发事件、上层归约"的架构，让同一个循环可以服务完全不同的消费者：TUI 把事件渲染成画面，print 模式把事件写成文本或 JSON，RPC 模式把事件序列化过管道。它们订阅同一条 `AgentEvent` 流，只是归约方式不同。第 11 章会看到三种运行模式如何消费这条流。

---

## 实例演练："修复 auth.ts 里的 bug"

让循环具体化。追踪一次真实交互的三轮。

**用户输入：** `Fix the null pointer bug in src/auth/validate.ts`

**轮次 1：模型读文件。** `runAgentLoop` 发出 `agent_start`、`turn_start`，把用户消息发出 `message_start`/`message_end`。内层循环第一轮：`streamAssistantResponse` 调用模型，流式返回"让我看看这个文件"加一个 `toolCall`：`read({ path: "src/auth/validate.ts" })`。`stopReason` 是 `toolUse`，不是 error，继续。提取到一个工具调用，`executeToolCalls` 执行它（read 是并发安全的，第 4 章详述），文件内容作为 `toolResult` 追加进上下文。`hasMoreToolCalls = true`（没有 terminate）。`turn_end`。`shouldStopAfterTurn` 返回 false。轮询 steering——没有。内层继续。

**轮次 2：模型编辑文件。** `turn_start`。模型流式返回"第 42 行有 bug——`userId` 可能为 null"加一个 `toolCall`：`edit({ path: ..., old_string: ..., new_string: ... })`。edit 不是并发安全的，但这一批只有一个工具，串行执行。编辑应用成功，`toolResult` 追加。`turn_end`。继续。

**轮次 3：模型宣布完成。** `turn_start`。模型流式返回"我加了一个守卫子句修复了空指针 bug"。没有 `toolCall` 块。`toolCalls.length === 0`，所以 `hasMoreToolCalls` 保持 `false`。`turn_end`。`shouldStopAfterTurn` 返回 false。轮询 steering——没有。内层循环条件 `hasMoreToolCalls || pendingMessages.length > 0` 为假，退出内层。外层轮询 follow-up——没有。`break`。发出 `agent_end`。

总计：三次模型调用，两次工具执行，零次权限弹窗（Pi Agent 没有逐工具审批，第 1 章详述）。整个流程在同一个两层 `while` 结构里完成，没有一处特殊分支。

---

## 实践应用

Pi Agent 的循环为"如何设计 Agent 主循环"提供了四条可迁移的模式。

**用契约纪律换循环简洁。** 让循环的所有协作者（模型调用、消息转换、停止判断、消息队列）都承诺"永不抛出，失败是返回值"。它解决的问题是：循环里 `try/catch` 散落、错误处理与正常逻辑纠缠。当异常这条路被契约排除，循环就退化成了一串直白的顺序步骤。代价是你必须认真实现这些契约——但复杂性被推到了边界，而不是弥漫在核心。

**把循环逻辑与可观察封装分离。** 核心循环只认识一个 `emit` 回调；`EventStream` 封装是薄薄一层桥接。它解决的问题是：循环被绑死在某一种消费方式上。当 `runLoop` 不依赖任何流式抽象，它就能被任意编排器以任意方式驱动——内存 Agent、持久 Harness、产品会话，全都复用同一个循环。

**用嵌套循环表达不同时机的事件。** 内层处理"工作期间的插入"（steering），外层处理"工作结束后的续接"（follow-up）。它解决的问题是：把两种时机混为一谈，导致要么插话被忽略、要么续接提前触发。两个循环、两个队列、两个回调槽位，时机语义就清晰了。

**对"看似成功实则可疑"的结果保持怀疑。** 截断的工具调用参数可能解析通过但内容不完整——宁可失败掉让模型重发，也不要执行可疑调用。它解决的问题是：流式增量解析的"尽力而为"特性会悄悄产生半截数据。在 Agent 系统里，"能解析"不等于"安全"，对边界情况保持偏执是值得的。

如果你从零开始，最小循环骨架就是：

```
async function runLoop(context, config, emit, streamFn) {
  while (true) {
    let hasMore = true;
    while (hasMore || pending.length) {
      inject(pending); pending = [];
      const msg = await streamAssistantResponse(context, config, streamFn);
      if (msg.stopReason === "error" || msg.stopReason === "aborted") return end();
      const calls = toolCalls(msg);
      hasMore = calls.length ? !execute(calls).terminate : false;
      if (await config.shouldStopAfterTurn?.()) return end();
      pending = await config.getSteeringMessages?.() || [];
    }
    const followUp = await config.getFollowUpMessages?.() || [];
    if (followUp.length) { pending = followUp; continue; }
    break;
  }
  return end();
}
```

Pi Agent 循环里的每一处细节都是对这个骨架的细化：`streamAssistantResponse` 细化了模型调用，`failToolCallsFromTruncatedMessage` 细化了工具执行，`prepareNextTurn` 细化了轮间转换。从骨架开始，只在你真正遇到某个细化所解决的问题时才加上它。

---

## 总结

Pi Agent 的核心循环是一个两层嵌套的 `while`：内层处理工具调用与 steering，外层处理 follow-up。它通过 `emit` 回调发出十种 `AgentEvent`，通过 `StreamFn` 与模型世界相交，通过一组"永不抛出"的回调槽位（`transformContext`、`convertToLlm`、`shouldStopAfterTurn`、`prepareNextTurn`、`getSteeringMessages`、`getFollowUpMessages`）把压缩、停止、续接、轮间转换全部外推。

它之所以干净，不是因为 Agent 这件事简单，而是因为复杂性被有意识地推到了循环之外。理解这一点，你就理解了 Pi Agent 与综合体路线最根本的分歧：不是谁做得多，而是谁把复杂性放在了哪里。

下一章，我们放大循环里那个被一笔带过的 `executeToolCalls`——工具如何定义、校验、执行，以及并发是如何安全地发生的。
