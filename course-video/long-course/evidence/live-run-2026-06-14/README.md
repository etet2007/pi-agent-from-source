# 2026-06-14 在线任务证据

本目录记录一次真实 `openai-codex/gpt-5.4-mini` Pi Agent 运行。

可用于制作和公开复核的文件：

- `session.public.json`：删除 reasoning、签名、响应 ID 和 tool call ID 后的
  工具调用、工具结果、diff 与最终回复。
- `tool-sequence.public.json`：每个 assistant turn 的工具批次。

`*.raw.*` 仅用于本地复核并被 `.gitignore` 排除。正片、截图和公开文档
不得直接展示 raw 文件。
