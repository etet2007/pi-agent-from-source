import { useState, useRef, useEffect, useCallback } from "react";
import { TRACE, EVENT_COLORS, EVENT_LABELS, type TraceEvent } from "../data/trace";
import { REAL_TRACE } from "../data/real-trace";

const TRACES = [
  { id: "real", label: "真实轨迹 (DashScope/GLM-5.2)", data: REAL_TRACE },
  { id: "demo", label: "示例轨迹 (内置)", data: TRACE },
];

export function ReplayView() {
  const [traceId, setTraceId] = useState("real");
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trace = TRACES.find((t) => t.id === traceId) ?? TRACES[0];
  const traceData = trace.data;

  const step = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= traceData.length) {
        setPlaying(false);
        return;
      }
      setCurrentIdx(idx);
      const ev = traceData[idx];
      const next = idx + 1;
      if (next < traceData.length) {
        const delay = (traceData[next].ts - ev.ts) * 3 + 300;
        timerRef.current = setTimeout(() => step(next), delay);
      } else {
        setPlaying(false);
      }
    },
    [traceData],
  );

  const play = () => {
    if (playing) return;
    setPlaying(true);
    step(0);
  };

  const pause = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPlaying(false);
  };

  const reset = () => {
    pause();
    setCurrentIdx(-1);
  };

  const stepNext = () => {
    pause();
    setCurrentIdx((i) => Math.min(i + 1, traceData.length - 1));
  };

  const stepPrev = () => {
    pause();
    setCurrentIdx((i) => Math.max(i - 1, 0));
  };

  const switchTrace = (id: string) => {
    pause();
    setTraceId(id);
    setCurrentIdx(-1);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const current: TraceEvent | undefined = currentIdx >= 0 ? traceData[currentIdx] : undefined;

  return (
    <div className="replay-view">
      <div className="replay-header">
        <h2 className="node-title">JSONL 事件回放</h2>
        <div className="trace-switcher">
          {TRACES.map((t) => (
            <button
              key={t.id}
              className={`replay-btn ${traceId === t.id ? "primary" : ""}`}
              onClick={() => switchTrace(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="node-summary">
          {traceId === "real"
            ? "真实运行：用 DashScope GLM-5.2 让 Pi 读取 greet.js 并解释功能。产生 3 个 turn：第一个 bash 工具检查文件，第二个 read 工具读取内容，第三个输出最终解释。"
            : "内置示例：模拟用户让 Pi 创建 hello.txt 并写入内容。2 个 turn：第一个 write 工具，第二个最终回复。"}
          <br />
          共 {traceData.length} 个事件。现场分享时可重新跑真实模型采集新轨迹。
        </p>
      </div>

      <div className="replay-controls">
        <button className="replay-btn" onClick={stepPrev} disabled={currentIdx <= 0 && currentIdx !== -1}>
          ◀ 上一步
        </button>
        <button className={`replay-btn primary ${playing ? "active" : ""}`} onClick={playing ? pause : play}>
          {playing ? "⏸ 暂停" : "▶ 播放"}
        </button>
        <button className="replay-btn" onClick={stepNext} disabled={currentIdx >= traceData.length - 1}>
          下一步 ▶
        </button>
        <button className="replay-btn" onClick={reset}>
          ↻ 重置
        </button>
        <span className="replay-progress">
          {currentIdx + 1} / {traceData.length}
        </span>
      </div>

      <div className="timeline">
        {traceData.map((ev, i) => (
          <button
            key={i}
            className={`timeline-event ${i === currentIdx ? "current" : ""} ${i <= currentIdx ? "passed" : ""}`}
            style={{ borderColor: EVENT_COLORS[ev.type] || "#8b949e" }}
            onClick={() => {
              pause();
              setCurrentIdx(i);
            }}
            title={`${EVENT_LABELS[ev.type] || ev.type} @${ev.ts}ms`}
          >
            <span className="timeline-dot" style={{ background: EVENT_COLORS[ev.type] || "#8b949e" }} />
            <span className="timeline-label">{EVENT_LABELS[ev.type] || ev.type}</span>
          </button>
        ))}
      </div>

      {current && (
        <div className="event-detail">
          <div className="event-detail-header" style={{ borderColor: EVENT_COLORS[current.type] || "#8b949e" }}>
            <span className="event-type-badge" style={{ background: EVENT_COLORS[current.type] || "#8b949e" }}>
              {EVENT_LABELS[current.type] || current.type}
            </span>
            <span className="event-ts">@ {current.ts}ms</span>
          </div>
          <div className="event-detail-body">
            {current.message && (
              <div className="event-field">
                <span className="event-field-label">message</span>
                <code className="event-field-value">{current.message}</code>
              </div>
            )}
            {current.toolName && (
              <div className="event-field">
                <span className="event-field-label">toolName</span>
                <code className="event-field-value">{current.toolName}</code>
              </div>
            )}
            {current.args && (
              <div className="event-field">
                <span className="event-field-label">args</span>
                <pre className="event-field-value pre">{current.args}</pre>
              </div>
            )}
            {current.result && (
              <div className="event-field">
                <span className="event-field-label">result</span>
                <code className={`event-field-value ${current.isError ? "err" : ""}`}>{current.result}</code>
              </div>
            )}
            {current.stopReason && (
              <div className="event-field">
                <span className="event-field-label">stopReason</span>
                <code className={`event-field-value ${current.stopReason === "stop" ? "ok" : "warn"}`}>{current.stopReason}</code>
              </div>
            )}
            {current.contentTypes && current.contentTypes.length > 0 && (
              <div className="event-field">
                <span className="event-field-label">contentTypes</span>
                <code className="event-field-value">[{current.contentTypes.join(", ")}]</code>
              </div>
            )}
            {current.contextMessageCount !== undefined && (
              <div className="event-field">
                <span className="event-field-label">context.msgCount</span>
                <code className="event-field-value">{current.contextMessageCount}</code>
              </div>
            )}
            {(current as any).subType && (
              <div className="event-field">
                <span className="event-field-label">subEvent</span>
                <code className="event-field-value">{(current as any).subType}</code>
              </div>
            )}
            {(current as any).note && (
              <div className="event-note">{(current as any).note}</div>
            )}
          </div>
        </div>
      )}

      {current && (
        <div className="context-state">
          <div className="col-title">上下文 messages（累积）</div>
          <ContextState events={traceData.slice(0, currentIdx + 1)} />
        </div>
      )}
    </div>
  );
}

function ContextState({ events }: { events: TraceEvent[] }) {
  const messages: { role: string; content: string; isTool?: boolean }[] = [];
  for (const ev of events) {
    if (ev.type === "message_start" && ev.message?.startsWith("user:")) {
      messages.push({ role: "user", content: ev.message.slice(5).trim() });
    } else if (ev.type === "message_end" && ev.message?.startsWith("assistant")) {
      if (ev.stopReason === "toolUse" || ev.message.includes("toolCall")) {
        messages.push({ role: "assistant", content: `[toolCall] ${ev.contentTypes?.join(", ")}` });
      } else if (ev.stopReason === "stop") {
        messages.push({ role: "assistant", content: "模型输出最终回复" });
      }
    } else if (ev.type === "tool_execution_end" && ev.result) {
      messages.push({ role: "toolResult", content: `${ev.toolName}: ${ev.result}`, isTool: true });
    }
  }
  return (
    <div className="context-list">
      {messages.map((m, i) => (
        <div key={i} className={`context-msg role-${m.role}`}>
          <span className="context-role">{m.role}</span>
          <span className="context-content">{m.content}</span>
        </div>
      ))}
    </div>
  );
}
