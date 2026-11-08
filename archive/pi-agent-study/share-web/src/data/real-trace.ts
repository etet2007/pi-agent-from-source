// 自动生成：从真实 Pi JSON 模式输出转换
// 源文件: /tmp/pi-demo-trace/trace.jsonl
// 生成时间: 2026-08-05T04:30:16.949Z
// 任务: 读取 greet.js 文件并解释它的功能
// 模型: dashscope/glm-5.2

import type { TraceEvent } from "./trace";

export const REAL_TRACE: TraceEvent[] = [
  {
    "type": "session",
    "ts": 10
  },
  {
    "type": "agent_start",
    "ts": 20
  },
  {
    "type": "turn_start",
    "ts": 30
  },
  {
    "type": "message_start",
    "ts": 40,
    "message": "user: 读取 greet.js 文件并解释它的功能"
  },
  {
    "type": "message_end",
    "ts": 50,
    "message": "user: 读取 greet.js 文件并解释它的功能"
  },
  {
    "type": "message_start",
    "ts": 60,
    "contentTypes": [],
    "stopReason": "stop",
    "message": "assistant ()"
  },
  {
    "type": "message_update",
    "ts": 70,
    "contentTypes": [
      "thinking"
    ],
    "stopReason": "stop",
    "message": "assistant (thinking)",
    "subType": "thinking_start"
  },
  {
    "type": "message_update",
    "ts": 80,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "stop",
    "message": "assistant (含 toolCall)",
    "subType": "toolcall_start"
  },
  {
    "type": "message_update",
    "ts": 90,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "stop",
    "message": "assistant (含 toolCall)",
    "subType": "toolcall_delta",
    "toolName": "bash"
  },
  {
    "type": "message_update",
    "ts": 100,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "stop",
    "message": "assistant (含 toolCall)",
    "subType": "toolcall_delta",
    "toolName": "bash"
  },
  {
    "type": "message_update",
    "ts": 110,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "stop",
    "message": "assistant (含 toolCall)",
    "subType": "toolcall_delta",
    "toolName": "bash"
  },
  {
    "type": "message_update",
    "ts": 120,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "stop",
    "message": "assistant (含 toolCall)",
    "subType": "toolcall_delta",
    "toolName": "bash"
  },
  {
    "type": "message_update",
    "ts": 130,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "stop",
    "message": "assistant (含 toolCall)",
    "subType": "toolcall_delta",
    "toolName": "bash"
  },
  {
    "type": "message_update",
    "ts": 140,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "stop",
    "message": "assistant (含 toolCall)",
    "subType": "toolcall_delta",
    "toolName": "bash"
  },
  {
    "type": "message_update",
    "ts": 150,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "stop",
    "message": "assistant (含 toolCall)",
    "subType": "toolcall_delta",
    "toolName": "bash"
  },
  {
    "type": "message_update",
    "ts": 160,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "stop",
    "message": "assistant (含 toolCall)",
    "subType": "toolcall_delta",
    "toolName": "bash"
  },
  {
    "type": "message_update",
    "ts": 170,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "stop",
    "message": "assistant (含 toolCall)",
    "subType": "toolcall_delta",
    "toolName": "bash"
  },
  {
    "type": "message_update",
    "ts": 180,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "stop",
    "message": "assistant (含 toolCall)",
    "subType": "toolcall_delta",
    "toolName": "bash"
  },
  {
    "type": "message_update",
    "ts": 190,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "stop",
    "message": "assistant (含 toolCall)",
    "subType": "toolcall_delta",
    "toolName": "bash"
  },
  {
    "type": "message_update",
    "ts": 200,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "stop",
    "message": "assistant (含 toolCall)",
    "subType": "toolcall_delta",
    "toolName": "bash"
  },
  {
    "type": "message_update",
    "ts": 210,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "toolUse",
    "message": "assistant (含 toolCall)",
    "subType": "thinking_end"
  },
  {
    "type": "message_update",
    "ts": 220,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "toolUse",
    "message": "assistant (含 toolCall)",
    "subType": "toolcall_end"
  },
  {
    "type": "message_end",
    "ts": 230,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "toolUse",
    "message": "assistant (含 toolCall)"
  },
  {
    "type": "tool_execution_start",
    "ts": 240,
    "toolName": "bash",
    "toolCallId": "call_a630f6818cf4455cb529b397",
    "args": "{\"command\":\"ls -la greet.js 2>&1 || echo \\\"NOT_FOUND\\\"\"}"
  },
  {
    "type": "tool_execution_update",
    "ts": 250,
    "toolName": "bash",
    "toolCallId": "call_a630f6818cf4455cb529b397",
    "args": "{\"command\":\"ls -la greet.js 2>&1 || echo \\\"NOT_FOUND\\\"\"}"
  },
  {
    "type": "tool_execution_update",
    "ts": 260,
    "toolName": "bash",
    "toolCallId": "call_a630f6818cf4455cb529b397",
    "args": "{\"command\":\"ls -la greet.js 2>&1 || echo \\\"NOT_FOUND\\\"\"}"
  },
  {
    "type": "tool_execution_end",
    "ts": 270,
    "toolName": "bash",
    "toolCallId": "call_a630f6818cf4455cb529b397",
    "result": "{\"content\":[{\"type\":\"text\",\"text\":\"-rw-r--r--@ 1 stephen.lau  wheel  59 Aug  5 12:29 greet.js\\n\"}]}",
    "isError": false
  },
  {
    "type": "message_start",
    "ts": 280
  },
  {
    "type": "message_end",
    "ts": 290
  },
  {
    "type": "turn_end",
    "ts": 300,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "toolUse",
    "message": "assistant (含 toolCall)"
  },
  {
    "type": "turn_start",
    "ts": 310
  },
  {
    "type": "message_start",
    "ts": 320,
    "contentTypes": [],
    "stopReason": "stop",
    "message": "assistant ()"
  },
  {
    "type": "message_update",
    "ts": 330,
    "contentTypes": [
      "thinking"
    ],
    "stopReason": "stop",
    "message": "assistant (thinking)",
    "subType": "thinking_start"
  },
  {
    "type": "message_update",
    "ts": 340,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "stop",
    "message": "assistant (含 toolCall)",
    "subType": "toolcall_start"
  },
  {
    "type": "message_update",
    "ts": 350,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "stop",
    "message": "assistant (含 toolCall)",
    "subType": "toolcall_delta",
    "toolName": "read"
  },
  {
    "type": "message_update",
    "ts": 360,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "stop",
    "message": "assistant (含 toolCall)",
    "subType": "toolcall_delta",
    "toolName": "read"
  },
  {
    "type": "message_update",
    "ts": 370,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "stop",
    "message": "assistant (含 toolCall)",
    "subType": "toolcall_delta",
    "toolName": "read"
  },
  {
    "type": "message_update",
    "ts": 380,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "stop",
    "message": "assistant (含 toolCall)",
    "subType": "toolcall_delta",
    "toolName": "read"
  },
  {
    "type": "message_update",
    "ts": 390,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "stop",
    "message": "assistant (含 toolCall)",
    "subType": "toolcall_delta",
    "toolName": "read"
  },
  {
    "type": "message_update",
    "ts": 400,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "toolUse",
    "message": "assistant (含 toolCall)",
    "subType": "thinking_end"
  },
  {
    "type": "message_update",
    "ts": 410,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "toolUse",
    "message": "assistant (含 toolCall)",
    "subType": "toolcall_end"
  },
  {
    "type": "message_end",
    "ts": 420,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "toolUse",
    "message": "assistant (含 toolCall)"
  },
  {
    "type": "tool_execution_start",
    "ts": 430,
    "toolName": "read",
    "toolCallId": "call_aac33e0598a14c90b96c9653",
    "args": "{\"path\":\"greet.js\"}"
  },
  {
    "type": "tool_execution_end",
    "ts": 440,
    "toolName": "read",
    "toolCallId": "call_aac33e0598a14c90b96c9653",
    "result": "{\"content\":[{\"type\":\"text\",\"text\":\"export function greet(name) {\\n  return \\\"Hello, \\\" + name;\\n}\\n\"}]}",
    "isError": false
  },
  {
    "type": "message_start",
    "ts": 450
  },
  {
    "type": "message_end",
    "ts": 460
  },
  {
    "type": "turn_end",
    "ts": 470,
    "contentTypes": [
      "thinking",
      "toolCall"
    ],
    "stopReason": "toolUse",
    "message": "assistant (含 toolCall)"
  },
  {
    "type": "turn_start",
    "ts": 480
  },
  {
    "type": "message_start",
    "ts": 490,
    "contentTypes": [],
    "stopReason": "stop",
    "message": "assistant ()"
  },
  {
    "type": "message_update",
    "ts": 500,
    "contentTypes": [
      "text"
    ],
    "stopReason": "stop",
    "message": "assistant",
    "subType": "text_start"
  },
  {
    "type": "message_update",
    "ts": 510,
    "contentTypes": [
      "text"
    ],
    "stopReason": "stop",
    "message": "assistant",
    "subType": "text_end"
  },
  {
    "type": "message_end",
    "ts": 520,
    "contentTypes": [
      "text"
    ],
    "stopReason": "stop",
    "message": "assistant"
  },
  {
    "type": "turn_end",
    "ts": 530,
    "contentTypes": [
      "text"
    ],
    "stopReason": "stop",
    "message": "assistant"
  },
  {
    "type": "agent_end",
    "ts": 540
  }
];
