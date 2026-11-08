import {
	type AssistantMessage,
	type AssistantMessageEvent,
	EventStream,
	type Message,
	type Model,
	type UserMessage,
} from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { agentLoop } from "../packages/agent/src/agent-loop.ts";
import type {
	AgentContext,
	AgentEvent,
	AgentLoopConfig,
	AgentMessage,
	AgentTool,
} from "../packages/agent/src/types.ts";

class MockAssistantStream extends EventStream<AssistantMessageEvent, AssistantMessage> {
	constructor() {
		super(
			(event) => event.type === "done" || event.type === "error",
			(event) => {
				if (event.type === "done") return event.message;
				if (event.type === "error") return event.error;
				throw new Error("Unexpected event type");
			},
		);
	}
}

const model: Model<"openai-responses"> = {
	id: "video-evidence",
	name: "Video Evidence",
	api: "openai-responses",
	provider: "openai",
	baseUrl: "https://example.invalid",
	reasoning: false,
	input: ["text"],
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	contextWindow: 8192,
	maxTokens: 2048,
};

function usage() {
	return {
		input: 0,
		output: 0,
		cacheRead: 0,
		cacheWrite: 0,
		totalTokens: 0,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
	};
}

function assistant(
	content: AssistantMessage["content"],
	stopReason: AssistantMessage["stopReason"] = "stop",
): AssistantMessage {
	return {
		role: "assistant",
		content,
		api: "openai-responses",
		provider: "openai",
		model: model.id,
		usage: usage(),
		stopReason,
		timestamp: Date.now(),
	};
}

function user(text: string): UserMessage {
	return { role: "user", content: text, timestamp: Date.now() };
}

function convertToLlm(messages: AgentMessage[]): Message[] {
	return messages.filter(
		(message) => message.role === "user" || message.role === "assistant" || message.role === "toolResult",
	) as Message[];
}

function summarizeEvent(event: AgentEvent): string {
	switch (event.type) {
		case "message_start":
		case "message_end":
			return `${event.type}:${event.message.role}`;
		case "tool_execution_start":
		case "tool_execution_end":
			return `${event.type}:${event.toolName}:${event.toolCallId}`;
		default:
			return event.type;
	}
}

async function runTrace(
	name: string,
	tools: AgentTool<any>[],
	streamFn: NonNullable<Parameters<typeof agentLoop>[5]>,
): Promise<void> {
	const context: AgentContext = {
		systemPrompt: "Video evidence harness",
		messages: [],
		tools,
	};
	const config: AgentLoopConfig = {
		model,
		convertToLlm,
	};
	const events: string[] = [];
	const stream = agentLoop([user(name)], context, config, undefined, streamFn);

	for await (const event of stream) {
		events.push(summarizeEvent(event));
	}

	const messages = await stream.result();
	console.log(
		JSON.stringify(
			{
				name,
				events,
				messages: messages.map((message) => ({
					role: message.role,
					toolCallId: message.role === "toolResult" ? message.toolCallId : undefined,
				})),
			},
			null,
			2,
		),
	);
}

await runTrace("no-tool", [], () => {
	const stream = new MockAssistantStream();
	queueMicrotask(() => {
		stream.push({ type: "done", reason: "stop", message: assistant([{ type: "text", text: "done" }]) });
	});
	return stream;
});

const echoSchema = Type.Object({ value: Type.String() });
const echoTool: AgentTool<typeof echoSchema, { value: string }> = {
	name: "echo",
	label: "Echo",
	description: "Return the supplied value",
	parameters: echoSchema,
	async execute(_toolCallId, params) {
		return {
			content: [{ type: "text", text: params.value }],
			details: { value: params.value },
		};
	},
};

let singleToolCallIndex = 0;
await runTrace("single-tool", [echoTool], () => {
	const stream = new MockAssistantStream();
	queueMicrotask(() => {
		const message =
			singleToolCallIndex++ === 0
				? assistant(
						[{ type: "toolCall", id: "echo-1", name: "echo", arguments: { value: "hello" } }],
						"toolUse",
					)
				: assistant([{ type: "text", text: "finished" }]);
		stream.push({ type: "done", reason: message.stopReason, message });
	});
	return stream;
});

const delaySchema = Type.Object({ label: Type.String(), delayMs: Type.Number() });
const delayTool: AgentTool<typeof delaySchema, { label: string; delayMs: number }> = {
	name: "delay",
	label: "Delay",
	description: "Finish after a deterministic delay",
	parameters: delaySchema,
	async execute(_toolCallId, params) {
		await new Promise((resolve) => setTimeout(resolve, params.delayMs));
		return {
			content: [{ type: "text", text: params.label }],
			details: { label: params.label },
		};
	},
};

let parallelCallIndex = 0;
await runTrace("parallel-tools", [delayTool], () => {
	const stream = new MockAssistantStream();
	queueMicrotask(() => {
		const message =
			parallelCallIndex++ === 0
				? assistant(
						[
							{ type: "toolCall", id: "slow-1", name: "delay", arguments: { label: "slow", delayMs: 30 } },
							{ type: "toolCall", id: "fast-2", name: "delay", arguments: { label: "fast", delayMs: 1 } },
						],
						"toolUse",
					)
				: assistant([{ type: "text", text: "finished" }]);
		stream.push({ type: "done", reason: message.stopReason, message });
	});
	return stream;
});
