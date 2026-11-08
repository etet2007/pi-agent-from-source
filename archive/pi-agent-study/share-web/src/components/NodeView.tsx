import type { NavNode, SnippetData } from "../types";
import { CodePanel } from "./CodePanel";

interface NodeViewProps {
  node: NavNode;
  snippet: SnippetData | undefined;
}

export function NodeView({ node, snippet }: NodeViewProps) {
  return (
    <div className="node-view">
      <h2 className="node-title">{node.title}</h2>
      <div className="node-summary">{node.summary}</div>
      <div className="three-col">
        {snippet ? (
          <CodePanel snippet={snippet} />
        ) : (
          <div className="col-title">源码片段未加载</div>
        )}
        <div>
          <div className="col-title">注释</div>
          <div className="notes-list">
            {node.notes.map((note, i) => (
              <div key={i} className="note-item">
                <div className="note-line">{note.line}</div>
                <div className="note-text">{note.text}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="col-title">事件流</div>
          <div className="events-list">
            {node.events.map((ev, i) => (
              <span key={i} className="event-tag">
                {ev}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
