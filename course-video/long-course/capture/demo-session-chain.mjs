#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const chainPath = resolve(
	"evidence/live-run-2026-06-14/session-chain.public.json",
);
const evidence = JSON.parse(await readFile(chainPath, "utf8"));

const blue = "\u001b[38;2;76;141;255m";
const green = "\u001b[38;2;88;199;146m";
const gray = "\u001b[38;2;169;178;195m";
const white = "\u001b[38;2;241;244;248m";
const reset = "\u001b[0m";

const wait = (milliseconds) =>
	new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
const line = (text = "") => process.stdout.write(`${text}\n`);

line(`${blue}REAL RUN / APPEND-ONLY SESSION CHAIN${reset}`);
line(`${gray}IDs replaced with public node numbers${reset}`);
line();
line(`${white}NODE   PARENT  PERSISTED ENTRY${reset}`);
await wait(600);

for (const node of evidence.nodes) {
	let label = node.type;
	if (node.role === "assistant") {
		label = node.tools
			? `message / assistant / tools: ${node.tools.join(" + ")}`
			: "message / assistant / final answer";
	} else if (node.role === "toolResult") {
		label = `message / toolResult / ${node.toolName}`;
	} else if (node.role) {
		label = `message / ${node.role}`;
	}

	line(
		`${green}${node.node.padEnd(6)}${gray} ${node.parent.padEnd(7)}${white}${label}${reset}`,
	);
	await wait(210);
}

line();
line(`${blue}READ IT AS A BRANCH${reset}`);
line(`${white}each new line -> points to its parent -> preserves earlier facts${reset}`);
line(`${gray}JSONL append order is storage; parentId is structure.${reset}`);
await wait(1800);
