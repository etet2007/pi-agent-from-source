#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const [sessionPath, outputDirectory] = process.argv.slice(2);

if (!sessionPath || !outputDirectory) {
	console.error("Usage: build-live-run-public-evidence.mjs <session.jsonl> <output-directory>");
	process.exit(2);
}

const source = await readFile(resolve(sessionPath), "utf8");
const entries = source
	.split("\n")
	.filter(Boolean)
	.map((line) => JSON.parse(line));

const sanitizeText = (value) =>
	value
		.replaceAll("/private/tmp/pi-agent-live-demo", "/tmp/pi-agent-demo")
		.replaceAll("/tmp/pi-agent-live-demo", "/tmp/pi-agent-demo")
		.replaceAll("/private/tmp/pi-agent-greeting-demo", "/tmp/pi-agent-demo")
		.replaceAll("/tmp/pi-agent-greeting-demo", "/tmp/pi-agent-demo");

const steps = [];
const publicMessages = [];
let provider;
let model;
let task;

for (const entry of entries) {
	if (entry.type !== "message" || !entry.message) continue;

	const message = entry.message;
	if (message.provider) provider = message.provider;
	if (message.model) model = message.model;
	if (!task && message.role === "user") {
		task = (message.content ?? [])
			.filter((item) => item.type === "text")
			.map((item) => item.text)
			.join("\n")
			.trim();
	}

	if (message.role === "user") {
		publicMessages.push({
			role: "user",
			content: (message.content ?? [])
				.filter((item) => item.type === "text")
				.map((item) => ({ type: "text", text: sanitizeText(item.text) })),
		});
	}

	if (message.role === "assistant") {
		const calls = (message.content ?? [])
			.filter((item) => item.type === "toolCall")
			.map((item) => ({
				name: item.name,
				arguments: item.arguments,
			}));

		if (calls.length > 0) {
			steps.push({ type: "tool_calls", calls });
			publicMessages.push({
				role: "assistant",
				content: calls.map((call) => ({
					type: "toolCall",
					name: call.name,
					arguments: call.arguments,
				})),
			});
		}

		const finalText = (message.content ?? [])
			.filter((item) => item.type === "text")
			.map((item) => item.text)
			.join("\n")
			.trim();

		if (finalText) {
			steps.push({ type: "final", text: sanitizeText(finalText) });
			publicMessages.push({
				role: "assistant",
				content: [{ type: "text", text: sanitizeText(finalText) }],
			});
		}
	}

	if (message.role === "toolResult") {
		const text = (message.content ?? [])
			.filter((item) => item.type === "text")
			.map((item) => item.text)
			.join("\n");

		steps.push({
			type: "tool_result",
			toolName: message.toolName,
			isError: Boolean(message.isError),
			text: sanitizeText(text),
			diff: message.details?.diff ? sanitizeText(message.details.diff) : undefined,
		});
		publicMessages.push({
			role: "toolResult",
			toolName: message.toolName,
			isError: Boolean(message.isError),
			content: [{ type: "text", text: sanitizeText(text) }],
			diff: message.details?.diff ? sanitizeText(message.details.diff) : undefined,
		});
	}
}

const publicEvidence = {
	evidenceType: "REAL RUN",
	recordedAt: entries.find((entry) => entry.type === "session")?.timestamp,
	provider,
	model,
	task: sanitizeText(task ?? ""),
	sourceSession: "local-private-session.jsonl",
	steps,
};

await mkdir(resolve(outputDirectory), { recursive: true });
await writeFile(
	resolve(outputDirectory, "session.public.json"),
	`${JSON.stringify(publicEvidence, null, 2)}\n`,
);

const toolSequence = steps
	.filter((step) => step.type === "tool_calls")
	.map((step) => step.calls.map((call) => call.name));

await writeFile(
	resolve(outputDirectory, "tool-sequence.public.json"),
	`${JSON.stringify(toolSequence, null, 2)}\n`,
);

await writeFile(
	resolve(outputDirectory, "messages.public.json"),
	`${JSON.stringify(publicMessages, null, 2)}\n`,
);

const persistedEntries = entries.filter((entry) => entry.type !== "session" && entry.id);
const publicIds = new Map(
	persistedEntries.map((entry, index) => [
		entry.id,
		`n${String(index + 1).padStart(2, "0")}`,
	]),
);

const sessionChain = persistedEntries.map((entry) => {
	const message = entry.message;
	const tools =
		message?.role === "assistant"
			? (message.content ?? [])
					.filter((item) => item.type === "toolCall")
					.map((item) => item.name)
			: [];

	return {
		node: publicIds.get(entry.id),
		parent: publicIds.get(entry.parentId) ?? "ROOT",
		type: entry.type,
		role: message?.role,
		toolName: message?.role === "toolResult" ? message.toolName : undefined,
		tools: tools.length > 0 ? tools : undefined,
	};
});

await writeFile(
	resolve(outputDirectory, "session-chain.public.json"),
	`${JSON.stringify(
		{
			evidenceType: "REAL RUN / SANITIZED SESSION CHAIN",
			recordedAt: publicEvidence.recordedAt,
			nodes: sessionChain,
		},
		null,
		2,
	)}\n`,
);
