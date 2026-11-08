import { useState } from "react";
import { NODES } from "../data/nodes";

interface ScriptStep {
  id: number;
  title: string;
  file: string;
  line: number;
  breakpoint: string;
  say: string;
  navNode?: string;
}

const STEPS: ScriptStep[] = [
  {
    id: 1,
    title: "启动 + attach",
    file: "",
    line: 0,
    breakpoint: "chrome://inspect → inspect",
    say: "先用 node --inspect-brk 启动 Pi，然后在 Chrome 打开 chrome://inspect，点 inspect attach 到 Node inspector。启动命令见上方代码块，把 --help 换成真实 prompt。",
  },
  {
    id: 2,
    title: "agent_start — Loop 起点",
    file: "packages/agent/src/agent-loop.ts",
    line: 123,
    breakpoint: "agent-loop.ts:123",
    say: "断点命中 agent_start。这是整个 Agent Loop 的起点——emit 事件告诉 UI 一轮 run 开始了。注意此时 newMessages 和 currentContext 已经创建好：newMessages 只记本次新增消息，currentContext.messages 是历史加本次 prompt 的全量上下文。",
    navNode: "runAgentLoop",
  },
  {
    id: 3,
    title: "streamAssistantResponse — 模型请求边界",
    file: "packages/agent/src/agent-loop.ts",
    line: 228,
    breakpoint: "agent-loop.ts:228",
    say: "这里调 streamAssistantResponse，是模型请求的边界。进去会看到它调 streamFn，streamFn 来自 coding-agent 层的包装——包了一层 extensions 的 request/response hook，不是直接用 streamSimple。真正发请求是 packages/ai/src/stream.ts:63 的 provider.streamSimple。",
    navNode: "runLoop",
  },
  {
    id: 4,
    title: "toolCalls 过滤 — 识别工具调用",
    file: "packages/agent/src/agent-loop.ts",
    line: 247,
    breakpoint: "agent-loop.ts:247",
    say: "模型返回的 assistant message 里 content 是数组，可能有 text、thinking、toolCall。这里 filter 出 toolCall 类型的 content。如果数组为空，说明模型没调用工具，直接走停止流程。如果非空，进入 executeToolCalls。",
    navNode: "runLoop",
  },
  {
    id: 5,
    title: "executeToolCalls — 工具执行",
    file: "packages/agent/src/agent-loop.ts",
    line: 256,
    breakpoint: "agent-loop.ts:256",
    say: "执行工具。每个工具的 execute 函数返回 content / details / error。bash 工具 spawn 子进程，read 工具读文件并截断。工具结果作为 ToolResultMessage 写回 currentContext.messages——这是为什么模型能多次调用工具：toolResult 进上下文后，下一轮模型请求能看到它。",
    navNode: "tools",
  },
  {
    id: 6,
    title: "turn_end — turn 边界",
    file: "packages/agent/src/agent-loop.ts",
    line: 271,
    breakpoint: "agent-loop.ts:271",
    say: "一个 turn 结束。turn = 一次 assistant response + 对应的 tool calls/results。emit turn_end 后，检查 prepareNextTurn（可切换模型或 thinking level）和 shouldStopAfterTurn。如果有 tool call，hasMoreToolCalls 为 true，内层 while 回到顶部，开始下一个 turn——重新调 streamAssistantResponse。",
    navNode: "runLoop",
  },
  {
    id: 7,
    title: "shouldStopAfterTurn — 停止条件",
    file: "packages/agent/src/agent-loop.ts",
    line: 300,
    breakpoint: "agent-loop.ts:300",
    say: "停止条件检查。真正停止要同时满足：无 tool call（hasMoreToolCalls=false）、无 steering message（pending=0）、无 follow-up message、shouldStopAfterTurn 未阻止。全满足后 emit agent_end，整个 run 结束。回顾刚才的 3 个 turn：bash → read → 最终回复，最终回复无 tool call，走到这里停止。",
    navNode: "runLoop",
  },
];

const START_CMD = `cd pi-agent-study/pi
node --inspect-brk ./node_modules/tsx/dist/cli.mjs \\
  --tsconfig tsconfig.json \\
  packages/coding-agent/src/cli.ts \\
  -p --provider dashscope --model glm-5.2 \\
  --no-session "读取 greet.js 并解释它的功能"`;

export function DebugScript() {
  const [activeStep, setActiveStep] = useState(0);
  const [copied, setCopied] = useState(false);

  const copyCmd = async () => {
    try {
      await navigator.clipboard.writeText(START_CMD);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const goStep = (delta: number) => {
    setActiveStep((s) => Math.max(0, Math.min(s + delta, STEPS.length - 1)));
  };

  const jumpToNode = (nodeId?: string) => {
    if (!nodeId) return;
    const btns = Array.from(document.querySelectorAll(".nav-item"));
    const target = btns.find((b) => b.textContent?.includes(NODES.find((n) => n.id === nodeId)?.label || "___"));
    (target as HTMLElement)?.click();
  };

  const step = STEPS[activeStep];

  return (
    <div className="debug-script">
      <h2 className="node-title">现场断点调试串讲</h2>
      <div className="node-summary">
        沿着一次真实 prompt 的 7 个断点，讲清楚 Agent Loop 从启动到停止的完整流程。
        每步有断点位置、讲解词、对应源码节点跳转。
      </div>

      {/* 启动命令 */}
      <div className="debug-section">
        <div className="col-title">启动命令</div>
        <div className="debug-cmd-block">
          <pre className="debug-cmd">{START_CMD}</pre>
          <button className={`replay-btn ${copied ? "ok" : ""}`} onClick={copyCmd}>
            {copied ? "✓ 已复制" : "复制"}
          </button>
        </div>
        <p className="debug-note">
          启动后打开 <code>chrome://inspect</code> → 点 inspect。然后把断点打在下面 7 个位置。
        </p>
      </div>

      {/* 步骤导航 */}
      <div className="debug-steps-bar">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            className={`debug-step-chip ${i === activeStep ? "active" : ""} ${i < activeStep ? "done" : ""}`}
            onClick={() => setActiveStep(i)}
          >
            {s.id}
          </button>
        ))}
      </div>

      {/* 当前步骤 */}
      <div className="debug-step-detail">
        <div className="debug-step-header">
          <span className="debug-step-num">步骤 {step.id} / {STEPS.length}</span>
          <h3 className="debug-step-title">{step.title}</h3>
        </div>

        {step.file && (
          <div className="debug-bp">
            <span className="debug-bp-label">断点</span>
            <code className="debug-bp-value">{step.breakpoint}</code>
            <span className="debug-bp-file">{step.file}:{step.line}</span>
          </div>
        )}

        <div className="debug-say">
          <span className="debug-say-label">讲</span>
          <p>{step.say}</p>
        </div>

        <div className="debug-step-actions">
          <button
            className="replay-btn"
            onClick={() => goStep(-1)}
            disabled={activeStep === 0}
          >
            ◀ 上一步
          </button>
          <button
            className="replay-btn primary"
            onClick={() => goStep(1)}
            disabled={activeStep === STEPS.length - 1}
          >
            下一步 ▶
          </button>
          {step.navNode && (
            <button className="replay-btn" onClick={() => jumpToNode(step.navNode)}>
              查看源码 →
            </button>
          )}
        </div>
      </div>

      {/* 全部步骤概览 */}
      <div className="debug-overview">
        <div className="col-title">全部断点</div>
        <table className="debug-bp-table">
          <thead>
            <tr>
              <th>#</th>
              <th>位置</th>
              <th>看什么</th>
            </tr>
          </thead>
          <tbody>
            {STEPS.map((s) => (
              <tr
                key={s.id}
                className={s.id === step.id ? "current" : ""}
                onClick={() => setActiveStep(s.id - 1)}
              >
                <td className="bp-num">{s.id}</td>
                <td><code>{s.breakpoint}</code></td>
                <td>{s.title}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
