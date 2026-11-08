#!/usr/bin/env node
// 把 Pi JSON 模式输出的 JSONL 转换成网页回放页用的 trace.ts 格式
// 输入: trace.jsonl (Pi --mode json 输出)
// 输出: real-trace.ts (网页内置数据)
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const input = process.argv[2] || resolve(__dirname, "../../../trace.jsonl");
const output = resolve(__dirname, "../src/data/real-trace.ts");

const lines = readFileSync(input, "utf-8").trim().split("\n");
const events = [];
let ts = 0;

for (const line of lines) {
  try {
    const obj = JSON.parse(line);
    const type = obj.type;

    // 跳过 message_update 中的 thinking_delta / text_delta（太密集）
    if (type === "message_update") {
      const sub = obj.assistantMessageEvent?.type;
      if (sub === "thinking_delta" || sub === "text_delta") continue;
      // 只保留 toolcall_delta, thinking_start/end, text_start/end 等关键子事件
      if (!sub) continue;
    }

    const ev = { type, ts: ts += 10 };

    // 提取关键字段
    if (obj.message) {
      const msg = obj.message;
      const role = msg.role;
      if (role === "user") {
        const text = typeof msg.content === "string" ? msg.content : msg.content?.map(c => c.text || "").join("");
        ev.message = `user: ${text?.slice(0, 100)}`;
      } else if (role === "assistant") {
        const contentTypes = msg.content?.map(c => c.type) || [];
        ev.contentTypes = contentTypes;
        ev.stopReason = msg.stopReason;
        if (contentTypes.includes("toolCall")) {
          ev.message = "assistant (含 toolCall)";
        } else if (contentTypes.includes("text")) {
          ev.message = "assistant";
        } else {
          ev.message = `assistant (${contentTypes.join(",")})`;
        }
      }
    }

    if (obj.toolName) ev.toolName = obj.toolName;
    if (obj.toolCallId) ev.toolCallId = obj.toolCallId;
    if (obj.args) {
      const argsStr = typeof obj.args === "string" ? obj.args : JSON.stringify(obj.args);
      ev.args = argsStr.length > 120 ? argsStr.slice(0, 120) + "…" : argsStr;
    }
    if (obj.result) {
      const r = typeof obj.result === "string" ? obj.result : JSON.stringify(obj.result);
      ev.result = r.length > 120 ? r.slice(0, 120) + "…" : r;
    }
    if (obj.isError !== undefined) ev.isError = obj.isError;

    // assistantMessageEvent 子类型
    if (obj.assistantMessageEvent) {
      const sub = obj.assistantMessageEvent.type;
      ev.subType = sub;
      if (sub === "toolcall_delta") {
        ev.toolName = obj.assistantMessageEvent.partial?.content?.find(c => c.type === "toolCall")?.name;
      }
    }

    events.push(ev);
  } catch {
    // skip invalid lines
  }
}

// 写成 TS
const tsContent = `// 自动生成：从真实 Pi JSON 模式输出转换
// 源文件: ${input}
// 生成时间: ${new Date().toISOString()}
// 任务: 读取 greet.js 文件并解释它的功能
// 模型: dashscope/glm-5.2

import type { TraceEvent } from "./trace";

export const REAL_TRACE: TraceEvent[] = ${JSON.stringify(events, null, 2)};
`;

writeFileSync(output, tsContent);
console.log(`Converted ${events.length} events → ${output}`);
console.log(`Event types: ${[...new Set(events.map(e => e.type))].join(", ")}`);
