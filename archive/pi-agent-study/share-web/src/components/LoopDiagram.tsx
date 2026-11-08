import { useState, useEffect, useRef } from "react";

// runLoop 双层循环动画
// 内层 while: hasMoreToolCalls || pendingMessages.length > 0
// 外层 while: true (follow-up 驱动)
const INNER_STEPS = [
  "turn_start",
  "注入 pending messages (steering/follow-up)",
  "streamAssistantResponse → streamSimple",
  "◄ 接收 start / text_delta / toolcall_delta / done",
  "检查 assistant message 的 toolCall content",
  "有 toolCall → executeToolCalls",
  "toolResult 写回 currentContext.messages",
  "turn_end",
  "prepareNextTurn (可切换 model/thinking)",
  "shouldStopAfterTurn 检查",
];

export function LoopDiagram() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!playing) return;
    timerRef.current = setTimeout(() => {
      setStep((s) => {
        if (s >= INNER_STEPS.length - 1) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 800);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playing, step]);

  const play = () => {
    if (step >= INNER_STEPS.length - 1) setStep(0);
    setPlaying(true);
  };
  const reset = () => {
    setPlaying(false);
    setStep(0);
  };

  return (
    <div className="loop-diagram">
      <div className="loop-header">
        <h3>runLoop 双层循环</h3>
        <div className="loop-controls">
          <button className="replay-btn primary" onClick={playing ? () => setPlaying(false) : play}>
            {playing ? "⏸" : "▶ 播放"}
          </button>
          <button className="replay-btn" onClick={reset}>↻</button>
        </div>
      </div>

      <div className="loop-visual">
        {/* 外层循环 */}
        <div className="loop-outer">
          <div className="loop-label">外层 while (true)</div>
          <div className="loop-label-sub">follow-up 驱动</div>

          <div className="loop-arrow-down">↓</div>

          {/* 内层循环 */}
          <div className="loop-inner">
            <div className="loop-label">内层 while</div>
            <div className="loop-label-sub">hasMoreToolCalls || pending &gt; 0</div>

            <div className="loop-steps">
              {INNER_STEPS.map((s, i) => {
                const isActive = i === step;
                const isPassed = i < step;
                const isToolCall = s.includes("executeToolCalls") || s.includes("toolResult");
                const isStream = s.includes("streamAssistantResponse") || s.includes("接收");
                return (
                  <div
                    key={i}
                    className={`loop-step ${isActive ? "active" : ""} ${isPassed ? "passed" : ""} ${
                      isToolCall ? "tool" : isStream ? "stream" : ""
                    }`}
                  >
                    <span className="step-idx">{i + 1}</span>
                    <span className="step-text">{s}</span>
                  </div>
                );
              })}
            </div>

            {/* 回环箭头 */}
            {step >= 6 && step < 8 && (
              <div className="loop-back-arrow">
                ← toolResult 写回 → 回到内层 while 顶部（下一轮模型请求）
              </div>
            )}
          </div>

          <div className="loop-arrow-down">↓</div>

          {/* 停止条件 */}
          <div className={`loop-stop ${step >= INNER_STEPS.length - 1 ? "active" : ""}`}>
            <div className="loop-label">停止条件</div>
            <ul>
              <li>无 tool call (hasMoreToolCalls = false)</li>
              <li>无 steering message (pending = 0)</li>
              <li>无 follow-up message</li>
              <li>未被 shouldStopAfterTurn 阻止</li>
            </ul>
            <div className="loop-label-sub">→ emit agent_end</div>
          </div>
        </div>
      </div>

      <div className="loop-current-step">
        当前步骤 {step + 1} / {INNER_STEPS.length}：{INNER_STEPS[step]}
      </div>
    </div>
  );
}
