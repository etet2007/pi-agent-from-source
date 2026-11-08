import { useState, useEffect, useRef } from "react";
import { NODES } from "./data/nodes";
import type { Snippets } from "./types";
import { IntroSlides } from "./components/IntroSlides";
import { NodeView } from "./components/NodeView";
import { ReplayView } from "./components/ReplayView";
import { DebugScript } from "./components/DebugScript";
import { LoopDiagram } from "./components/LoopDiagram";
import snippetsData from "./data/snippets.json";

const snippets = snippetsData as unknown as Snippets;

type View = "intro" | "replay" | string;

export function App() {
  const [view, setView] = useState<View>("intro");
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 节点播放：按顺序自动切换 7 个源码节点
  useEffect(() => {
    if (!playing) return;
    const nodeIds = NODES.map((n) => n.id);
    const currentIdx = nodeIds.indexOf(view);
    if (currentIdx < 0 || currentIdx >= nodeIds.length - 1) {
      setPlaying(false);
      return;
    }
    timerRef.current = setTimeout(() => {
      setView(nodeIds[currentIdx + 1]);
    }, 4000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playing, view]);

  const startPlay = () => {
    setView(NODES[0].id);
    setPlaying(true);
  };
  const stopPlay = () => {
    setPlaying(false);
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">Pi Agent 源码讲解</div>
        <div className="sidebar-section">介绍</div>
        <button
          className={`nav-item ${view === "intro" ? "active" : ""}`}
          onClick={() => { stopPlay(); setView("intro"); }}
        >
          背景 & 主调用链
        </button>
        <div className="sidebar-section">源码链路</div>
        {NODES.map((node, i) => (
          <div key={node.id} className="nav-item-wrap">
            <button
              className={`nav-item ${view === node.id ? "active" : ""}`}
              onClick={() => { stopPlay(); setView(node.id); }}
            >
              <span className="nav-num">{i + 1}</span> {node.label}
            </button>
          </div>
        ))}
        <div className="sidebar-section">交互</div>
        <button
          className={`nav-item ${view === "loop" ? "active" : ""}`}
          onClick={() => { stopPlay(); setView("loop"); }}
        >
          双层循环动画
        </button>
        <button
          className={`nav-item ${view === "replay" ? "active" : ""}`}
          onClick={() => { stopPlay(); setView("replay"); }}
        >
          JSONL 事件回放
        </button>
        <button
          className={`nav-item ${view === "debug" ? "active" : ""}`}
          onClick={() => { stopPlay(); setView("debug"); }}
        >
          现场断点调试
        </button>
        <div className="sidebar-section">播放</div>
        <button
          className="nav-item play-btn"
          onClick={playing ? stopPlay : startPlay}
        >
          {playing ? "⏸ 停止播放" : "▶ 播放链路"}
        </button>
      </aside>

      <main className="main">
        {view === "intro" && <IntroSlides />}
        {view === "replay" && <ReplayView />}
        {view === "debug" && <DebugScript />}
        {view === "loop" && (
          <div>
            <NodeView node={NODES.find((n) => n.id === "runLoop")!} snippet={snippets["agent-loop-runLoop"]} />
            <LoopDiagram />
          </div>
        )}
        {NODES.some((n) => n.id === view) && (
          <NodeView
            node={NODES.find((n) => n.id === view)!}
            snippet={snippets[NODES.find((n) => n.id === view)!.snippetKey]}
          />
        )}
      </main>
    </div>
  );
}
