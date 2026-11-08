// 内置示例轨迹：模拟一次真实 Agent 运行的事件序列
// 基于 AgentEvent 真实结构（types.ts:403-418）
// 场景：用户让 Pi 在空目录里创建一个文件并写入内容

export interface TraceEvent {
  type: string;
  ts: number;
  message?: string;
  toolName?: string;
  toolCallId?: string;
  args?: string;
  result?: string;
  isError?: boolean;
  stopReason?: string;
  contentTypes?: string[];
  contextMessageCount?: number;
}

export const TRACE: TraceEvent[] = [
  { type: "agent_start", ts: 0 },
  { type: "turn_start", ts: 10 },
  {
    type: "message_start",
    ts: 15,
    message: "user: 在当前目录创建一个 hello.txt，写入 Hello from Pi",
  },
  { type: "message_end", ts: 16, message: "user: 在当前目录创建一个 hello.txt，写入 Hello from Pi" },

  // Turn 1: 模型决定调用 write 工具
  {
    type: "stream_start",
    ts: 120,
    contextMessageCount: 1,
    note: "streamAssistantResponse 调用 streamSimple",
  },
  {
    type: "message_start",
    ts: 150,
    message: "assistant (partial)",
  },
  {
    type: "toolcall_delta",
    ts: 180,
    toolName: "write",
    args: '{ path: "hello.txt", content: "Hello from Pi" }',
  },
  {
    type: "message_end",
    ts: 220,
    message: "assistant",
    stopReason: "tool_use",
    contentTypes: ["text", "toolCall"],
    note: "检测到 toolCall content → 进入 executeToolCalls",
  },
  {
    type: "tool_execution_start",
    ts: 225,
    toolName: "write",
    toolCallId: "call_001",
    args: '{ path: "hello.txt", content: "Hello from Pi" }',
  },
  {
    type: "tool_execution_end",
    ts: 240,
    toolName: "write",
    toolCallId: "call_001",
    result: "Created hello.txt (14 bytes)",
    isError: false,
  },
  {
    type: "turn_end",
    ts: 245,
    note: "toolResult 写回上下文 → 有 tool call → hasMoreToolCalls = true → 内层 while 继续",
  },

  // Turn 2: 模型收到写入成功，输出最终回复
  { type: "turn_start", ts: 250 },
  {
    type: "stream_start",
    ts: 350,
    contextMessageCount: 3,
    note: "上下文现在有：user + assistant(toolCall) + toolResult",
  },
  {
    type: "message_start",
    ts: 380,
    message: "assistant (partial)",
  },
  {
    type: "text_delta",
    ts: 400,
    note: "已完成创建 hello.txt",
  },
  {
    type: "message_end",
    ts: 500,
    message: "assistant",
    stopReason: "stop",
    contentTypes: ["text"],
    note: "无 toolCall → hasMoreToolCalls = false",
  },
  {
    type: "turn_end",
    ts: 510,
    note: "无 tool call + 无 steering + 无 follow-up → 停止",
  },
  { type: "agent_end", ts: 515 },
];

// 事件类型颜色映射
export const EVENT_COLORS: Record<string, string> = {
  agent_start: "#3fb950",
  agent_end: "#f85149",
  turn_start: "#58a6ff",
  turn_end: "#58a6ff",
  message_start: "#d2a8ff",
  message_end: "#d2a8ff",
  message_update: "#8b949e",
  stream_start: "#f0883e",
  tool_execution_start: "#f0883e",
  tool_execution_end: "#3fb950",
  toolcall_delta: "#f0883e",
  text_delta: "#8b949e",
};

export const EVENT_LABELS: Record<string, string> = {
  agent_start: "Agent 启动",
  agent_end: "Agent 结束",
  turn_start: "Turn 开始",
  turn_end: "Turn 结束",
  message_start: "消息开始",
  message_end: "消息结束",
  stream_start: "模型请求",
  tool_execution_start: "工具执行",
  tool_execution_end: "工具结果",
  toolcall_delta: "工具调用流",
  text_delta: "文本流",
};
