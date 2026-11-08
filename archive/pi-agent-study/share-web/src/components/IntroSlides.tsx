// 介绍 slides：Pi 是什么、OMP 是什么、为什么要看源码
export function IntroSlides() {
  return (
    <div>
      {/* Slide 1: 封面 */}
      <div className="slide">
        <div className="slide-header">
          <span className="slide-num">01</span>
          <h1 className="slide-title">Pi Agent 源码交互式讲解</h1>
        </div>
        <div className="slide-body">
          <p>
            一次 prompt 在 Agent 里到底走了哪些路？这次分享不讲概念，
            直接沿着 <strong>Pi</strong> 的真实源码，从 CLI 入口一直拆到 Agent Loop、
            Provider 和工具系统。
          </p>
          <p>
            三种交互方式：<strong>可点击源码导航</strong> +{" "}
            <strong>现场断点调试</strong> + <strong>JSONL 事件回放</strong>。
          </p>
        </div>
      </div>

      {/* Slide 2: Pi 是什么 */}
      <div className="slide">
        <div className="slide-header">
          <span className="slide-num">02</span>
          <h2 className="slide-title">Pi 是什么</h2>
        </div>
        <div className="slide-body">
          <p>
            <strong>Pi</strong> 是一个开源的终端编码 Agent harness（agent 框架），
            由 <strong>earendil-works</strong> 开发，仓库{" "}
            <code>earendil-works/pi</code>。
          </p>
          <p>它不是一个单文件 CLI，而是一个分层的 TypeScript monorepo，四个核心 package：</p>
          <div className="arch-diagram">
{`  ┌─────────────────┐
  │ `}<span className="hl-orange">coding-agent</span>{`  │  CLI / TUI / session / 工具 / extensions
  └────────┬────────┘
           │
  ┌────────▼────────┐
  │ `}<span className="hl-orange">agent-core</span>{`  │  Agent 状态 + Agent Loop + tool call
  └────────┬────────┘
           │
  ┌────────▼────────┐
  │ `}<span className="hl-purple">pi-ai</span>{`     │  统一多 Provider（OpenAI / Anthropic / Google…）
  └────────┬────────┘
           │
  ┌────────▼────────┐
  │ `}<span className="hl-blue">厂商 API</span>{`  │  真正的模型请求
  └─────────────────┘`}
          </div>
          <p>
            Pi 的设计哲学：<strong>最小 harness，可扩展</strong>。不内置 sub-agent 和 plan mode，
            而是让你用 TypeScript extensions / skills / prompt templates 自己拼。
          </p>
        </div>
      </div>

      {/* Slide 3: OMP 是什么 */}
      <div className="slide">
        <div className="slide-header">
          <span className="slide-num">03</span>
          <h2 className="slide-title">OMP 是什么</h2>
        </div>
        <div className="slide-body">
          <p>
            <strong>OMP（Oh My Pi）</strong> 是 Pi 的一个扩展/封装形态，
            在 Pi harness 之上增加了多模型路由、工具设备（xd:// 工具）、
            skills（专项知识）、MCP 集成、hub（子 Agent 协调）等能力。
          </p>
          <p>
            简单类比：如果 <strong>Pi</strong> 是 Agent 的 kernel（内核），
            <strong>OMP</strong> 就像是在这个内核上装了一层发行版，
            把更多开箱即用的工具和协调能力接了进来。
          </p>
          <p>
            <strong>本次分享聚焦 Pi harness 本身的运行逻辑</strong>，
            也就是 OMP 底层依赖的那一层。理解了 Pi 的 Agent Loop，
            再看 OMP 的扩展机制会非常容易定位。
          </p>
        </div>
      </div>

      {/* Slide 4: 为什么读源码 */}
      <div className="slide">
        <div className="slide-header">
          <span className="slide-num">04</span>
          <h2 className="slide-title">为什么要看源码</h2>
        </div>
        <div className="slide-body">
          <p>
            平时我们只看到终端上一段连续对话，但源码里其实是一套{" "}
            <strong>分层运行系统</strong>，至少包含五种完全不同的东西：
          </p>
          <div className="events-list" style={{ marginBottom: "16px" }}>
            <span className="event-tag">用户输入</span>
            <span className="event-tag">模型输出</span>
            <span className="event-tag">工具执行</span>
            <span className="event-tag">工具结果</span>
            <span className="event-tag">循环控制</span>
          </div>
          <p>
            模型为什么能多次调用工具？什么时候停止？什么时候进入下一轮？
            这些答案不在 prompt 里，而在 <strong>Agent Loop</strong> 的代码里。
            看懂它，你不只会用 Agent，而是能解释一个 Agent 为什么能工作。
          </p>
        </div>
      </div>

      {/* Slide 5: 主调用链 */}
      <div className="slide">
        <div className="slide-header">
          <span className="slide-num">05</span>
          <h2 className="slide-title">主调用链</h2>
        </div>
        <div className="slide-body">
          <p>接下来沿着这条链路逐层拆解：</p>
          <div className="arch-diagram">
{`  `}<span className="hl-orange">CLI / TUI</span>{`
     │  cli.ts → main.ts → 模式分派
     ▼
  `}<span className="hl-orange">AgentSession</span>{`
     │  createAgentSession()：装配 model + tools + streamFn
     ▼
  `}<span className="hl-green">Agent.prompt()</span>{`
     │  normalizePromptInput → createContextSnapshot → createLoopConfig
     ▼
  `}<span className="hl-green">runAgentLoop</span>{`
     │  agent_start → turn_start → 写入 prompt
     ▼
  `}<span className="hl-green">runLoop（双层循环）</span>{`
     │  ┌─ streamAssistantResponse → streamSimple ──┐
     │  │                                            ▼
     │  │  `}<span className="hl-purple">Provider</span>{`（OpenAI / Anthropic / Google…）
     │  │  ◄── start / text_delta / toolcall_delta / done
     │  │
     │  ├─ 识别 toolCall content
     │  ├─ `}<span className="hl-orange">executeToolCalls</span>{`（read / bash / edit / write）
     │  ├─ toolResult 写回上下文
     │  ├─ prepareNextTurn / shouldStopAfterTurn
     │  └─ 下一轮 or 停止
     ▼
  `}<span className="hl-green">agent_end</span>{``}
          </div>
          <p>
            <strong>核心问题</strong>：模型为什么能多次调用工具？因为 toolResult 被写回上下文，
            Loop 重新请求模型。停止条件是：无 tool call + 无 steering + 无 follow-up。
          </p>
        </div>
      </div>
    </div>
  );
}
