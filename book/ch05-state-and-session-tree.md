# 第 5 章：状态、消息与会话树

## Agent 需要记住什么

前几章我们看的是"动作"：模型如何被调用、工具如何被执行。但 Agent 不只是动作，它还有记忆——它得记住对话进行到哪了、用过哪些工具、当前用什么模型。没有状态的 Agent 会永远重蹈覆辙。

Pi Agent 的状态分两个层次，对应两种截然不同的需求：

- **内存状态**：核心 `Agent` 类持有的当前转录与运行时标志。它生命周期短（一次运行）、读写频繁、不需要持久。
- **持久状态**：会话树。它生命周期长（跨运行、跨重启）、需要可分支可压缩、要能落到磁盘。

这两层之间的关系，以及 Pi Agent 把持久转录建模为**一棵树**而非一个数组的独特选择，是本章的主题。后者是 Pi Agent 区别于绝大多数 Agent 的设计——它让"fork 一个会话""回到三步之前换个思路""压缩但不丢失历史"都成为一等公民。

---

## 第一层：内存状态

核心 `Agent` 类（`packages/agent/src/agent.ts`）是一个"有状态的循环包装器"。它的文档写得很直白：

> Stateful wrapper around the low-level agent loop. `Agent` owns the current transcript, emits lifecycle events, executes tools, and exposes queueing APIs for steering and follow-up messages.

### 用访问器属性复制数组

`Agent` 的状态由 `createMutableAgentState` 创建。这个函数有一个值得注意的细节——`tools` 和 `messages` 不是普通字段，而是 getter/setter 访问器属性，且 setter 会**复制传入的数组**：

```typescript
function createMutableAgentState(initialState?) {
	let tools = initialState?.tools?.slice() ?? [];
	let messages = initialState?.messages?.slice() ?? [];
	return {
		systemPrompt: initialState?.systemPrompt ?? "",
		model: initialState?.model ?? DEFAULT_MODEL,
		thinkingLevel: initialState?.thinkingLevel ?? "off",
		get tools() {
			return tools;
		},
		set tools(nextTools: AgentTool<any>[]) {
			tools = nextTools.slice(); // 复制顶层数组
		},
		get messages() {
			return messages;
		},
		set messages(nextMessages: AgentMessage[]) {
			messages = nextMessages.slice(); // 复制顶层数组
		},
		isStreaming: false,
		streamingMessage: undefined,
		pendingToolCalls: new Set<string>(),
		errorMessage: undefined,
	};
}
```

状态字段分两类。一类是**配置性**的（`systemPrompt`、`model`、`thinkingLevel`、`tools`、`messages`），由调用方设置；另一类是**运行时**的（`isStreaming`、`streamingMessage`、`pendingToolCalls`、`errorMessage`），由 `Agent` 自己在运行期间维护，对外只读。

为什么 setter 要 `slice()` 复制？这是一种轻量的防御性不可变：调用方 `agent.state.messages = someArray` 之后，再修改 `someArray` 不会影响 `Agent` 内部持有的副本。它只复制顶层数组（不深拷贝消息对象），所以在"防止外部数组被意外改动"和"拷贝成本"之间取了平衡。注意循环内部对消息的*追加*（`context.messages.push(...)`）操作的是 `createContextSnapshot()` 复制出来的快照，而不是这个状态数组本身——第 3 章见过，循环拿到的是 `messages.slice()`。

### `processEvents`：事件归约器

第 3 章说循环通过 `emit` 发出 `AgentEvent`。`Agent` 类把这些事件**归约**进自己的状态。`processEvents` 就是这个归约器：

```typescript
private async processEvents(event: AgentEvent): Promise<void> {
	switch (event.type) {
		case "message_start":
			this._state.streamingMessage = event.message;
			break;
		case "message_update":
			this._state.streamingMessage = event.message;
			break;
		case "message_end":
			this._state.streamingMessage = undefined;
			this._state.messages.push(event.message);
			break;
		case "tool_execution_start": {
			const pendingToolCalls = new Set(this._state.pendingToolCalls);
			pendingToolCalls.add(event.toolCallId);
			this._state.pendingToolCalls = pendingToolCalls;
			break;
		}
		case "tool_execution_end": {
			const pendingToolCalls = new Set(this._state.pendingToolCalls);
			pendingToolCalls.delete(event.toolCallId);
			this._state.pendingToolCalls = pendingToolCalls;
			break;
		}
		case "turn_end":
			if (event.message.role === "assistant" && event.message.errorMessage) {
				this._state.errorMessage = event.message.errorMessage;
			}
			break;
		case "agent_end":
			this._state.streamingMessage = undefined;
			break;
	}

	const signal = this.activeRun?.abortController.signal;
	for (const listener of this.listeners) {
		await listener(event, signal);
	}
}
```

注意两件事。其一，`message_end` 才把消息正式推进 `messages` 数组——`message_start`/`message_update` 期间，消息只存在于 `streamingMessage` 这个"正在生成"的临时字段里。这样 `state.messages` 始终是"已完成的消息"，而 `streamingMessage` 是"进行中的那一条"，UI 可以分别渲染。其二，`pendingToolCalls` 的更新是**复制整个 Set 再赋值**（`new Set(...)` 然后 `add`/`delete`），而不是原地修改——这让任何监听 `pendingToolCalls` 变化的逻辑都能通过引用比较检测到更新。

归约完状态，`processEvents` 按订阅顺序 `await` 每个监听器。监听器是产品层（`AgentSession`）接入的地方——它把 `AgentEvent` 翻译成更高层的 `AgentSessionEvent`。第 9 章详述。

### 失败也是正常的事件序列

`Agent.prompt()` 启动一次运行时，会用 `runWithLifecycle` 包裹。如果执行器意外抛出（注意：正常情况下循环不会抛，因为所有协作者都承诺"永不抛出"——这里是兜底），`handleRunFailure` 会把它**转换成一个正常的事件序列**：

```typescript
private async handleRunFailure(error: unknown, aborted: boolean): Promise<void> {
	const failureMessage = {
		role: "assistant",
		content: [{ type: "text", text: "" }],
		api: this._state.model.api,
		provider: this._state.model.provider,
		model: this._state.model.id,
		usage: EMPTY_USAGE,
		stopReason: aborted ? "aborted" : "error",
		errorMessage: error instanceof Error ? error.message : String(error),
		timestamp: Date.now(),
	} satisfies AgentMessage;
	await this.processEvents({ type: "message_start", message: failureMessage });
	await this.processEvents({ type: "message_end", message: failureMessage });
	await this.processEvents({ type: "turn_end", message: failureMessage, toolResults: [] });
	await this.processEvents({ type: "agent_end", messages: [failureMessage] });
}
```

即使发生了意料之外的异常，监听器看到的依然是一条完整的、合法的事件序列（`message_start` → `message_end` → `turn_end` → `agent_end`），而不是一个半途中断、状态不一致的烂摊子。这是对"事件流契约"的最后一道守护：消费者永远能收到 `agent_end`，永远能把状态归约到一个一致的点。

### 重入保护与两个队列

`Agent.prompt()` 开头有一道重入保护：

```typescript
async prompt(input, images?) {
	if (this.activeRun) {
		throw new Error(
			"Agent is already processing a prompt. Use steer() or followUp() to queue messages, or wait for completion.",
		);
	}
	// ...
}
```

一次只能有一个活跃运行。想在运行期间塞消息？用 `steer()` 或 `followUp()`，它们把消息放进两个 `PendingMessageQueue`：

```typescript
class PendingMessageQueue {
	private messages: AgentMessage[] = [];
	public mode: QueueMode; // "all" | "one-at-a-time"

	drain(): AgentMessage[] {
		if (this.mode === "all") {
			const drained = this.messages.slice();
			this.messages = [];
			return drained;
		}
		const first = this.messages[0];
		if (!first) return [];
		this.messages = this.messages.slice(1);
		return [first];
	}
}
```

`QueueMode` 控制 `drain()` 的行为：`"all"` 一次取光所有排队消息，`"one-at-a-time"` 每次只取一条（默认）。回忆第 3 章：`createLoopConfig` 把 `steeringQueue.drain` 接到 `getSteeringMessages`，把 `followUpQueue.drain` 接到 `getFollowUpMessages`。于是"用户在 agent 工作时插话"和"排队下一个任务"这两种体验，就通过这两个队列 + 两个回调槽位实现了。`one-at-a-time` 模式让每条插话都得到一轮独立的处理，而不是堆在一起。

---

## 第二层：消息与那座桥

### 可扩展的消息联合

循环内部流转的消息类型是 `AgentMessage`（`packages/agent/src/types.ts`），它是一个**可通过声明合并扩展**的联合类型：

```typescript
export interface CustomAgentMessages {} // 通过声明合并扩展
export type AgentMessage = Message | CustomAgentMessages[keyof CustomAgentMessages];
```

`Message`（来自 `pi-ai`）覆盖标准的 `user | assistant | toolResult`。但产品可以往 `CustomAgentMessages` 接口里塞入自己的消息类型——Harness 层就扩展了它，加入 `bashExecution`、`custom`、`branchSummary`、`compactionSummary` 等类型。这些自定义消息对 UI 和持久化有意义（比如要在终端里显示一段压缩摘要），但模型并不需要、也不理解它们。

### `convertToLlm`：内部表示 ≠ 线上表示

这就引出了第 3 章提到的那座桥。默认的转换器只做一件事——过滤：

```typescript
function defaultConvertToLlm(messages: AgentMessage[]): Message[] {
	return messages.filter(
		(message) => message.role === "user" || message.role === "assistant" || message.role === "toolResult",
	);
}
```

它把自定义消息（`role` 不是这三种的）全部过滤掉，只留下提供商能理解的。产品层用的是 `convertToLlmWithBlockImages` 变体（在 `packages/coding-agent/src/core/messages.ts`），额外处理图片屏蔽。

这个设计的精妙在于：**转录里可以有任何类型的消息，但发给模型的永远是干净的子集。** UI 消息、压缩摘要、分支摘要、bash 执行记录——它们都活在转录里，被持久化、被渲染，但在每次模型调用前被 `convertToLlm` 这座桥过滤或转换掉。内部表示和线上表示的分离，让 Pi Agent 能自由扩展消息类型而不污染提供商协议。`AgentLoopConfig` 的文档甚至给了一个例子：把 `custom` 消息转成 `user` 消息、把 `notification` 消息过滤掉。

`convertToLlm` 也有"must not throw"契约——它必须返回安全兜底值，因为抛异常会"中断底层循环而不产生正常的事件序列"。又一次，契约纪律守护着循环的简洁。

---

## 第三层：会话树

现在到本章的重头戏。内存状态解决"这一次运行"，但 Agent 还需要"跨运行"的记忆——会话持久化。绝大多数 Agent 把转录存成一个扁平的消息数组。Pi Agent 不这样。它把转录建模为**一棵可追加、可分支的不可变条目树**。

### 为什么不是数组

考虑几个真实需求：

- 用户想"回到三步之前，换个思路重新问"——数组做不到，除非复制整个数组。
- 用户想"fork 这个会话，让两个分支各自探索"——数组需要整体拷贝。
- 上下文太长了要压缩，但"压缩"不应该真的删除历史（用户可能想回看）——数组里删除就是删除。

树结构让这些都变得自然：历史是不可变的节点，"当前位置"只是一个指向某个节点的指针（`leaf`）。回到过去 = 移动指针；fork = 从某个节点长出新的分支；压缩 = 插入一个摘要节点，而不是删除旧节点。

### 条目：树的节点

会话树的节点是 `SessionTreeEntry`（`packages/agent/src/harness/types.ts`），一个 11 种类型的联合：

```typescript
export type SessionTreeEntry =
	| MessageEntry            // 一条消息（user/assistant/toolResult/自定义）
	| ThinkingLevelChangeEntry // thinking 级别变更
	| ModelChangeEntry         // 模型变更
	| ActiveToolsChangeEntry   // 激活工具集变更
	| CompactionEntry          // 压缩摘要
	| BranchSummaryEntry       // 分支摘要
	| CustomEntry              // 自定义条目
	| CustomMessageEntry       // 自定义消息条目
	| LabelEntry               // 标签
	| SessionInfoEntry         // 会话信息（如名称）
	| LeafEntry;               // 叶指针：记录当前活跃叶
```

每个条目都有 `id`、`parentId`（树的边）、`timestamp`、`type`。注意这里不只存消息——模型切换、thinking 级别变更、工具集变更都是条目。这意味着"会话的完整历史"包括*配置的变化*，而不仅仅是对话内容。回看一个会话时，你能看到"用户在第 5 轮切换到了更强的模型"这样的信息。

`LeafEntry` 尤其特别：它不携带内容，只是一个**导航标记**，记录"当前活跃叶是哪个条目"。会话的"当前位置"就是 leaf 指向的地方。

### 分支：移动 leaf

`Session` 类（`packages/agent/src/harness/session/session.ts`）封装了对存储的操作。`appendMessage` 追加一个消息条目（返回新条目 id）；`moveTo(entryId, summary?)` 则重新指向 leaf：

```typescript
async moveTo(entryId, summary?): Promise<...> {
	// 把 leaf 重新指向 entryId，实现分支/回溯
}
```

`moveTo` 不删除任何东西——它只是把 leaf 指针移到另一个条目。如果那个条目是某个旧分支上的节点，那么后续的 `appendMessage` 就会从那里长出新的分支。这就是"回到三步之前换个思路"的实现：`moveTo` 到三步之前的节点，然后继续追加。旧的分支依然存在于树里，随时可以 `moveTo` 回去。

`getBranch(fromId?)` 返回从 leaf（或指定节点）到根的路径——也就是"当前这条分支"上的所有条目：

```typescript
async getBranch(fromId?: string): Promise<SessionTreeEntry[]> {
	// 返回 getPathToRootOrCompaction(leafId)
}
```

### 从树到上下文：`buildSessionContext`

模型需要的不是树，而是一条线性的消息序列。`buildSessionContext` 负责把"当前分支的路径"折叠成 `SessionContext`：

```typescript
export interface SessionContext {
	messages: AgentMessage[];
	thinkingLevel: string;
	model: { provider: string; modelId: string } | null;
	activeToolNames: string[] | null;
}
```

折叠过程做两件事：其一，从路径里的 `ModelChangeEntry`/`ThinkingLevelChangeEntry`/`ActiveToolsChangeEntry` 推导出当前的模型、thinking 级别、激活工具（配置是"沿路径累积"的）；其二，把 `MessageEntry` 等投影成 `AgentMessage[]`。

### 压缩在上下文构建期生效

最关键的是压缩如何处理。回忆第 1 章：Pi Agent 的压缩不删除历史。那么压缩如何减少发给模型的 token？答案在 `defaultContextEntryTransform`（`packages/agent/src/harness/session/session.ts`）：

```typescript
export function defaultContextEntryTransform(pathEntries: readonly SessionTreeEntry[]): SessionTreeEntry[] {
	// 找到路径里最后一个 compaction 条目
	let compaction: CompactionEntry | null = null;
	for (const entry of pathEntries) {
		if (entry.type === "compaction") compaction = entry;
	}
	if (!compaction) return [...pathEntries]; // 没有压缩，原样返回

	// 有压缩：上下文 = [压缩摘要] + 保留的尾部
	const entries: SessionTreeEntry[] = [compaction];
	const compactionIdx = pathEntries.findIndex((e) => e.type === "compaction" && e.id === compaction.id);
	if (compaction.retainedTail) {
		for (let i = compactionIdx + 1; i < pathEntries.length; i++) entries.push(pathEntries[i]!);
		return entries;
	}
	if (compaction.firstKeptEntryId) {
		// 从 firstKeptEntryId 开始保留压缩点之前的部分
		// ...
	}
	for (let i = compactionIdx + 1; i < pathEntries.length; i++) entries.push(pathEntries[i]!);
	return entries;
}
```

逻辑是：如果路径里存在一个 `compaction` 条目，那么发给模型的上下文就变成"**压缩摘要 + 压缩点之后保留的尾部**"。压缩点之前的原始历史并没有被删除——它们还在树里——只是在构建上下文时被摘要替代了。

这是一个优雅的分离：**存储层保留完整历史，上下文构建层决定发给模型什么。** 压缩是"上下文视图"的属性，不是"存储"的属性。于是用户可以 `moveTo` 回压缩点之前，重新展开那段历史——压缩是可逆的视图变换，而非不可逆的数据删除。第 7 章会详述压缩摘要如何生成。

### 存储接口：`SessionStorage`

会话树的持久化由 `SessionStorage` 接口抽象（`packages/agent/src/harness/types.ts`）：

```typescript
export interface SessionStorage<TMetadata extends SessionMetadata = SessionMetadata> {
	getMetadata(): Promise<TMetadata>;
	getLeafId(): Promise<string | null>;
	setLeafId(leafId: string | null): Promise<LeafEntry>;
	createEntryId(): Promise<string>;
	appendEntry(entry: SessionTreeEntry): Promise<void>;
	getEntry(id: string): Promise<SessionTreeEntry | undefined>;
	findEntries<TType extends SessionTreeEntry["type"]>(type: TType): Promise<Array<Extract<SessionTreeEntry, { type: TType }>>>;
	getLabel(id: string): Promise<string | undefined>;
	getSessionName(): Promise<string | undefined>;
	getSessionStats(): Promise<SessionStats>;
	getPathToRootOrCompaction(leafId: string | null): Promise<SessionTreeEntry[]>;
	getEntries(options?: SessionEntryCursorOptions): Promise<SessionTreeEntry[]>;
}
```

核心操作是 `appendEntry`（追加不可变条目）、`setLeafId`（移动 leaf，即分支）、`getPathToRootOrCompaction`（取当前分支路径，遇到压缩点或根停止）。这个接口是存储后端可插拔的关键——核心定义了"会话树需要什么操作"，具体怎么存是后端的事。

---

## 第四层：存储后端

`SessionStorage` 有三个实现，体现了"从简单到强大"的渐进。

### JSONL：默认的轻量后端

默认后端是 JSONL（每行一个 JSON 对象）。`pi-agent-core` 的 Harness 层提供了 `JsonlSessionStorage`（`packages/agent/src/harness/session/jsonl-storage.ts`），产品层 `pi-coding-agent` 也有自己的 `SessionManager`（`packages/coding-agent/src/core/session-manager.ts`）基于 JSONL：

```typescript
export class SessionManager {
	static create(cwd, sessionDir?, options?);
	static forkFrom(sourcePath, cwd, sessionDir?, options?);
	appendMessage(message): string;
	appendModelChange(provider, modelId);
	appendThinkingLevelChange(level);
	getBranch(fromId?): SessionEntry[];
	buildSessionContext(): SessionContext;
	// ...
}
```

一个会话就是一个 JSONL 文件：一个 `SessionHeader` 加一串类型化的条目。追加操作就是 append 一行——简单、可追加、人类可读、易于备份和版本控制。fork 一个会话（`forkFrom`）就是复制文件并设置 `parentSessionPath`。对于单用户本地 CLI，JSONL 是恰到好处的选择——没有数据库依赖，没有迁移负担。

### SQLite：可选的强大后端

当会话变多、需要全文搜索、需要快速打开时，JSONL 的"每次打开都要重放整个文件"就成了瓶颈。`pi-storage-sqlite-node`（`packages/storage/sqlite-node`）提供了一个 SQLite 后端 `SqliteSessionStorage`，实现同一个 `SessionStorage` 接口。

它的数据库 schema（`packages/storage/sqlite-node/src/sqlite/migrations/001_initial.sql`）把会话树存成关系表：

- `sessions`：会话元数据 + `active_leaf_id`
- `session_entries`：`(session_id, id)` 主键，`entry_seq`（单调递增）、`parent_id`（树的边）、`type`、`payload`（JSON）
- `branch_entries`：物化的分支成员关系
- `session_materialized` / `entry_materialized`：预计算的聚合状态

两个优化值得注意。其一，**物化聚合**：`SessionMaterializedState` 缓存了 `messageCount`、token 数、成本总和、当前模型等。每次 `appendEntry` 时增量更新这些聚合（`applyEntryToMaterializedState`），于是打开一个会话不需要重放所有条目——直接读物化状态。其二，**FTS5 全文搜索**：`createSqliteSessionSearch` 用 SQLite 的 FTS5（trigram 分词）建立搜索索引，`search()` 跑 `MATCH` 查询并按 `bm25()` 排序。这让"在我所有会话里搜'那个 auth bug'"成为可能。

关键在于：SQLite 后端和 JSONL 后端实现的是**同一个接口**。核心代码（`Session` 类、`buildSessionContext`）完全不知道底层是文件还是数据库。这就是接口抽象的价值——存储后端是真正的可插拔。

### InMemory：测试与临时用途

还有 `InMemorySessionStorage`（`packages/agent/src/harness/session/memory-storage.ts`），把条目存在内存里。它服务于测试（evals 就用 `SettingsManager.inMemory()` 和临时会话）和不需要持久化的临时场景。

---

## 实例演练：一个会话的生命周期

把这几层串起来。你运行 `pi`，输入几个提示词，中途切换了一次模型，然后 fork 了会话。

1. **启动**：`SessionManager.create(cwd)` 创建一个 JSONL 文件，写入 `SessionHeader`。leaf 为空。
2. **第一条消息**：`appendMessage(userMessage)` 追加一个 `MessageEntry`（parentId 指向根），leaf 移到它。
3. **助手回复 + 工具**：循环产生的 assistant 消息、toolResult 消息依次 `appendMessage`，每个条目 parentId 指向前一个，形成一条链。
4. **切换模型**：你 `/model` 切到更强的模型。`appendModelChange(provider, modelId)` 追加一个 `ModelChangeEntry`。之后的 `buildSessionContext` 会从它推导出"当前模型已变更"。
5. **压缩**：上下文快满了。压缩逻辑生成摘要，`appendCompaction(...)` 追加一个 `CompactionEntry`。历史没删——但从今往后 `defaultContextEntryTransform` 会用"摘要 + 尾部"替代压缩点之前的内容。
6. **fork**：你想换个思路。`moveTo(三步之前的entryId)` 把 leaf 移回去（追加一个 `LeafEntry` 记录新位置），然后 `appendMessage(新的用户消息)` 从那里长出新分支。旧的分支完好无损，`/tree` 命令能看到整棵树。

整个过程中，内存层的 `Agent.state.messages` 持有"当前运行的线性转录"，持久层的会话树持有"完整的、可分支的历史"。两者通过 `buildSessionContext`（树 → 线性上下文）和 `appendMessage`（线性消息 → 树条目）相互投影。

---

## 实践应用

Pi Agent 的状态设计为"如何管理 Agent 的状态与历史"提供了四条可迁移的模式。

**区分内存状态与持久状态。** 内存状态（当前转录、运行时标志）用可变对象 + 访问器属性，追求读写轻量和防御性复制；持久状态（会话历史）用不可变条目树，追求可分支可压缩。它解决的问题是：用一套机制同时服务两种访问模式，结果两边都不舒服。两层状态对应两种生命周期和两种需求。

**事件归约，而非直接改状态。** 循环发事件，`Agent` 把事件归约进状态，监听器再消费事件。它解决的问题是：状态修改散落在各处、UI 与逻辑耦合。当所有状态变更都流经同一条事件流，你就能免费获得"任何消费者都能重建状态"的能力——TUI、print、RPC 都是同一个归约的不同投影。

**内部表示 ≠ 线上表示，用桥连接。** 转录里可以有任意自定义消息类型，但发给模型的永远是过滤/转换后的干净子集。它解决的问题是：为了 UI 或持久化往消息里塞东西，结果污染了提供商协议。当 `convertToLlm` 是唯一出口，内部就能自由扩展而不影响外部。

**把历史建模为不可变树，把"当前位置"建模为指针。** 回溯 = 移动指针，fork = 长新分支，压缩 = 插入摘要节点而非删除。它解决的问题是：扁平数组下"回到过去""分支探索""可逆压缩"都需要整体拷贝或不可逆删除。当历史不可变、位置是指针，这些操作都退化成指针操作。代价是存储和上下文构建稍微复杂——但对一个"用户会不断试错、回溯、fork"的交互式 Agent，这份代价物有所值。

---

## 总结

Pi Agent 的状态分四层：内存里，`Agent` 用带防御性复制的访问器属性持有当前转录，用 `processEvents` 把 `AgentEvent` 归约进状态，连失败都转成正常的事件序列；消息层，可扩展的 `AgentMessage` 联合让转录容纳任意自定义类型，`convertToLlm` 在模型边界过滤出干净子集；持久层，会话被建模为 11 种不可变条目的可追加分支树，leaf 指针标记当前位置，压缩在上下文构建期生效而非删除历史；存储层，`SessionStorage` 接口让 JSONL、SQLite、InMemory 三个后端可插拔。

最深刻的洞见是那个树结构。它不是"另一种存消息的方式"，而是对"会话是什么"的重新定义：会话不是一条线，而是一棵探索的树，用户可以在任意节点分叉、回溯、压缩。理解了这一点，你就理解了 Pi Agent 为什么能优雅地支持 fork、`/tree`、可逆压缩这些在扁平数组模型里极其别扭的功能。

下一章，我们离开核心运行时，进入 `pi-agent-core` 的 Harness 层——看它如何在最小核心之上，搭建一个开箱即用的持久化编排器。
