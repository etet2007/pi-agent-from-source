#!/usr/bin/env node
// 从 pi/ 源码提取指定行范围，生成 src/data/snippets.json
// 避免源码漂移导致网页内容失真
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PI_ROOT = resolve(__dirname, "../../pi");
const OUT = resolve(__dirname, "../src/data/snippets.json");

// path: 行范围；可以多个区间用逗号分隔
const SNIPPETS = {
  "cli.ts": {
    file: "packages/coding-agent/src/cli.ts",
    ranges: "10-20",
  },
  "main.ts": {
    file: "packages/coding-agent/src/main.ts",
    ranges: "98-110,542-575",
  },
  "agent-session.ts": {
    file: "packages/coding-agent/src/core/agent-session.ts",
    ranges: "325-351,383-430,476-547",
  },
  "agent.ts": {
    file: "packages/agent/src/agent.ts",
    ranges: "95-180,330-420",
  },
  "agent-loop-runAgentLoop": {
    file: "packages/agent/src/agent-loop.ts",
    ranges: "95-132",
  },
  "agent-loop-runLoop": {
    file: "packages/agent/src/agent-loop.ts",
    ranges: "176-340",
  },
  "stream.ts": {
    file: "packages/ai/src/stream.ts",
    ranges: "40-75",
  },
  "tools-read.ts": {
    file: "packages/coding-agent/src/core/tools/read.ts",
    ranges: "33-40,203-260",
  },
  "tools-bash.ts": {
    file: "packages/coding-agent/src/core/tools/bash.ts",
    ranges: "22-29,269-320",
  },
};
function extractRange(lines, rangeStr) {
  const parts = rangeStr.split(",").map((s) => s.trim());
  const result = [];
  for (const part of parts) {
    const [start, end] = part.split("-").map((n) => parseInt(n, 10));
    const endLine = end ?? start;
    for (let i = start; i <= endLine && i <= lines.length; i++) {
      result.push({ line: i, text: lines[i - 1] ?? "" });
    }
    if (part !== parts[parts.length - 1]) {
      result.push({ line: null, text: "..." });
    }
  }
  return result;
}

const output = {};
for (const [key, spec] of Object.entries(SNIPPETS)) {
  const filePath = resolve(PI_ROOT, spec.file);
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  output[key] = {
    file: spec.file,
    ranges: spec.ranges,
    lines: extractRange(lines, spec.ranges),
  };
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(output, null, 2));
console.log(`Extracted ${Object.keys(output).length} snippets → ${OUT}`);
