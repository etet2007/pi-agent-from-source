// 链路节点定义
export interface NavNode {
  id: string;
  label: string;
  snippetKey: string;
  title: string;
  summary: string;
  events: string[];
  notes: { line: string; text: string }[];
}

export const NODES: NavNode[] = [
  {
    id: "cli",
    label: "CLI 入口",
    snippetKey: "cli.ts",
    title: "CLI 入口：argv 解析与模式分派",
    summary:
      "pi-test.sh 用 tsx 直接运行 cli.ts。cli.ts 调用 main(process.argv.slice(2))。main.ts 解析参数，判断 interactive / print / json / rpc 四种模式。--help / --version 这种简单命令不会进入 Agent Loop。",
    events: ["argv 解析", "模式分派"],
    notes: [
      { line: "1", text: "shebang，可被 pi-test.sh 直接调用" },
      { line: "main(...)", text: "把 argv 交给 main.ts 处理" },
    ],
  },
  {
    id: "session",
    label: "AgentSession",
    snippetKey: "agent-session.ts",
    title: "AgentSession：装配 model / tools / messages / streamFn",
    summary:
      "createAgentSession() 负责把 model、tools、历史 messages、streamFn、settings 组装成一个 Agent 实例。modelRegistry 管理模型和 API key。streamFn 在 coding-agent 层包了一层，而不是直接用 streamSimple，以便插入 extensions 的 request/response hook。",
    events: ["session 创建", "Agent 初始化"],
    notes: [
      { line: "createAgentSession", text: "组装点：model + tools + messages + streamFn" },
      { line: "modelRegistry", text: "模型清单与 API key 来源" },
    ],
  },
  {
    id: "prompt",
    label: "Agent.prompt",
    snippetKey: "agent.ts",
    title: "Agent.prompt()：从用户输入到可执行 Loop",
    summary:
      "prompt() 是入口，防止已有 run 正在进行。normalizePromptInput 把 string 转成 user message。runPromptMessages 调用底层 runAgentLoop。createContextSnapshot 复制当前 system prompt / messages / tools。createLoopConfig 把模型、工具 hook、队列、streamFn 打包给 loop。processEvents 把 Loop 事件归约成 Agent state。",
    events: ["prompt 接收", "context snapshot", "loop config 打包"],
    notes: [
      { line: "prompt()", text: "入口，防止并发 run" },
      { line: "normalizePromptInput", text: "string → user message" },
      { line: "runPromptMessages", text: "调用 runAgentLoop" },
    ],
  },
  {
    id: "runAgentLoop",
    label: "runAgentLoop",
    snippetKey: "agent-loop-runAgentLoop",
    title: "runAgentLoop：启动一轮 Loop",
    summary:
      "newMessages 只记录本次 run 新增的消息；currentContext.messages 是历史消息加本次 prompt，后续会作为模型可见上下文继续追加 assistant / toolResult。先 emit agent_start、turn_start，写入 prompt message，然后进入 runLoop()。",
    events: ["agent_start", "turn_start", "message_start", "message_end"],
    notes: [
      { line: "112-116", text: "newMessages vs currentContext：新增 vs 全量上下文" },
      { line: "123-124", text: "agent_start → turn_start 事件" },
      { line: "130", text: "交给 runLoop 主循环" },
    ],
  },
  {
    id: "runLoop",
    label: "runLoop 双层循环",
    snippetKey: "agent-loop-runLoop",
    title: "runLoop：内层 tool call / 外层 follow-up",
    summary:
      "双层 while：内层处理 tool call 和 steering，外层处理 follow-up。每轮先注入 pending messages，再 streamAssistantResponse 拿到 assistant message。如果 stopReason 是 error/aborted 直接结束。检查 content 里的 toolCall，有的话 executeToolCalls，把 toolResult 写回 currentContext。prepareNextTurn 可切换模型或 thinking level。shouldStopAfterTurn 可终止。停止条件：无 tool call + 无 steering + 无 follow-up + 未被 shouldStop 阻止。",
    events: ["turn_start", "streamAssistantResponse", "executeToolCalls", "turn_end", "shouldStopAfterTurn"],
    notes: [
      { line: "196", text: "外层 while：follow-up 驱动" },
      { line: "200", text: "内层 while：tool call + steering 驱动" },
      { line: "228", text: "streamAssistantResponse：模型请求边界" },
      { line: "247", text: "过滤 toolCall content" },
      { line: "256", text: "executeToolCalls：执行工具" },
      { line: "300", text: "shouldStopAfterTurn：停止条件检查" },
    ],
  },
  {
    id: "provider",
    label: "Provider 层",
    snippetKey: "stream.ts",
    title: "streamSimple：从统一接口到厂商 API",
    summary:
      "Agent Loop 不直接依赖 OpenAI SDK，而是依赖 packages/ai 的统一抽象。streamSimple 根据 model.api 找到 provider，调用 provider.streamSimple(model, context, apiKey)。Provider 负责把 Pi 统一消息格式转成厂商 payload，把流式响应归约成 start / text_delta / toolcall_delta / done 事件。API key 优先级：显式 options > 环境变量 > modelRegistry / OAuth。",
    events: ["streamSimple 调用", "provider 分派", "start / text_delta / toolcall_delta / done"],
    notes: [
      { line: "63", text: "resolveApiProvider(model.api)：按 api 找 provider" },
      { line: "64", text: "provider.streamSimple：真正厂商调用" },
      { line: "22-30", text: "withEnvApiKey：API key 优先级" },
    ],
  },
  {
    id: "tools",
    label: "工具系统",
    snippetKey: "tools-read.ts",
    title: "工具：schema → execute → result",
    summary:
      "core/tools/ 下每个工具有 schema（TypeBox）和 execute 函数。execute 返回 content / details / error。read 工具限制路径、截断输出；bash 工具执行命令并清理输出；edit 工具做最小 diff 修改。toolResult 作为新消息写回上下文，触发下一轮模型请求。extensions 可新增或拦截工具。",
    events: ["tool schema 校验", "execute", "toolResult 回填"],
    notes: [
      { line: "schema", text: "TypeBox 定义参数 schema" },
      { line: "execute", text: "返回 content / details / error" },
      { line: "path 限制", text: "read/grep 限制可访问路径" },
    ],
  },
];
