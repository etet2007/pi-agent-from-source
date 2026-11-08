import type { SnippetData } from "../types";

interface CodePanelProps {
  snippet: SnippetData;
}

export function CodePanel({ snippet }: CodePanelProps) {
  return (
    <div>
      <div className="col-title">源码 · {snippet.file}</div>
      <div className="code-block">
        {snippet.lines.map((line, i) =>
          line.line === null ? (
            <div key={`gap-${i}`} className="code-line-gap">
              …
            </div>
          ) : (
            <div key={`l-${i}`} className="code-line">
              <span className="code-line-num">{line.line}</span>
              <span className="code-line-text">{line.text}</span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
