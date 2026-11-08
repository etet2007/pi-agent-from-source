#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const evidencePath = resolve(
	"evidence/live-run-2026-06-14/session.public.json",
);
const evidence = JSON.parse(await readFile(evidencePath, "utf8"));

const blue = "\u001b[38;2;76;141;255m";
const green = "\u001b[38;2;88;199;146m";
const red = "\u001b[38;2;255;107;116m";
const gray = "\u001b[38;2;169;178;195m";
const white = "\u001b[38;2;241;244;248m";
const reset = "\u001b[0m";

const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
const line = (text = "") => process.stdout.write(`${text}\n`);

line(`${blue}REAL RUN / SAVED SESSION REPLAY${reset}`);
line(`${gray}${evidence.provider} / ${evidence.model}${reset}`);
line();
line(`${white}Task:${reset} fix the discount calculation, then rerun the test`);
await wait(900);

let turn = 0;
for (const step of evidence.steps) {
	if (step.type === "tool_calls") {
		turn += 1;
		line();
		line(`${blue}TURN ${turn}${reset}`);
		for (const call of step.calls) {
			const detail =
				call.name === "bash"
					? call.arguments.command
					: call.arguments.path ?? "";
			line(`${white}tool call${reset}  ${call.name}  ${gray}${detail}${reset}`);
		}
		await wait(850);
		continue;
	}

	if (step.type === "tool_result") {
		if (step.diff) {
			line(`${green}tool result${reset}  edit`);
			for (const diffLine of step.diff.split("\n")) {
				const color = diffLine.startsWith("+")
					? green
					: diffLine.startsWith("-")
						? red
						: gray;
				line(`${color}${diffLine}${reset}`);
			}
		} else if (step.toolName === "bash" && step.text.includes("-2800 !== 170")) {
			line(`${red}tool result  TEST FAILED: -2800 !== 170${reset}`);
		} else if (step.toolName === "bash" && /pass 1/.test(step.text)) {
			line(`${green}tool result  TEST PASSED: 1 passed, 0 failed${reset}`);
		} else {
			const firstMeaningfulLine = step.text
				.split("\n")
				.map((value) => value.trim())
				.find(Boolean);
			line(`${green}tool result${reset}  ${step.toolName}  ${gray}${firstMeaningfulLine ?? "completed"}${reset}`);
		}
		await wait(700);
		continue;
	}

	if (step.type === "final") {
		line();
		line(`${blue}FINAL ANSWER${reset}`);
		for (const finalLine of step.text.split("\n").filter(Boolean)) {
			line(`${white}${finalLine}${reset}`);
		}
	}
}

await wait(2200);
