# Pi Agent Source Code Analysis

[ [中文](README.md) | **English** ]

An educational source-code analysis: a line-by-line breakdown of [Pi Agent](https://pi.dev) (`@earendil-works/pi-coding-agent` and its companion packages) — a deliberately minimal open-source coding agent (version `v0.83.0`).

The book is written in English, in **zero-dependency HTML** (only two shared files, `book/style.css` and `book/common.js`), with no build step and no third-party libraries — open it in a browser and read.

## Unified material entry points (2026-10-24)

| Purpose | Entry point | Maintenance role |
|---|---|---|
| Current live talk | [presentation/practical/outline.md](presentation/practical/outline.md) | Primary 21-slide talk, minimal harness and source execution replay |
| In-depth reading | [book/en/index.html](book/en/index.html) | English book; Chinese edition is in `book/` |
| Long-form video | [course-video/README.md](course-video/README.md) | Narration, animation, assets and local renders moved from ForNextJob |
| Historical study materials | [archive/pi-agent-study/README.md](archive/pi-agent-study/README.md) | Earlier course, evidence, React viewer and vendored 0.78.1 source |
| Migration and versions | [research/2026-10-24-fornextjob-migration.md](research/2026-10-24-fornextjob-migration.md) | Provenance, paths, verification and remaining work |

The practical talk pins source commit `784653468`; the imported course uses `130ae577` (package version 0.78.1). Check each claim against its source version before incorporating older content. Historical materials retain their original text; this move does not deduplicate their content.
Media and dependencies were moved locally and remain Git-ignored. The existing Pages workflow deploys only the book.
The book license applies to the book; imported materials retain their provenance and license files. Moving them does not change their licensing.

## How to read

- **Online**: Chinese edition at <https://kuwii.xyz/pi-agent-from-source/>; the English edition is served under `/en/` (<https://kuwii.xyz/pi-agent-from-source/en/>)
- **Locally**: open `book/index.html` (Chinese) or `book/en/index.html` (English) directly in a browser (`file://` protocol — no server or dependencies required)

## About this book

Pi Agent is an extreme example of the "minimalist" approach: nine single-purpose npm packages, a clean two-level nested Agent loop, no built-in per-tool permission approval (isolation is delegated to containers), no MCP (extensibility is delegated to a strongly typed `ExtensionAPI`). Through "conservation of complexity", it pushes every piece of extra complexity outside the core — the core stays small and clean while the system's overall capability envelope never shrinks.

Following this thread, the book starts at the `pi-ai` unified LLM layer and dissects, bottom-up, the core loop, the tool system, the session tree, persistent orchestration, product assembly, the terminal UI, extensions, and remote control, closing with behavioral evaluation and architectural bets. Seven parts, 17 chapters + a preface:

| Part | Contents |
|---|---|
| Part I · Foundations | Architecture overview, pi-ai unified LLM layer |
| Part II · Agent Core | Agent Loop, tool system, state and session tree |
| Part III · Persistent Orchestration | AgentHarness, context compaction and branch summaries |
| Part IV · Coding Agent Product | Bootstrap pipeline, AgentSession, system prompts, three operating modes |
| Part V · Terminal UI | The homegrown pi-tui renderer, input and the editor |
| Part VI · Extensions & Connectivity | Extension system, remote control |
| Part VII · Quality & Conclusion | Behavioral evaluation, epilogue |

> Version note: the analysis is based on `v0.83.0` of the Pi Agent monorepo packages. All file paths in the book are relative to `pi-agent-src/`.

## Repository layout

| Path | Description |
|---|---|
| `book/` | All book content: `index.html` (preface), chapters `ch01`–`ch17`, and the shared `style.css` and `common.js` |
| `book/en/` | English edition of the book (same framework, English content); deployed at `/en/...` |
| `pi-agent-src/` | git submodule pointing at upstream [earendil-works/pi](https://github.com/earendil-works/pi.git), **read-only analysis target** |
| `AGENTS.md` | Writing conventions and the checklist for AI maintainers |

The manuscript is written in place as zero-dependency HTML; changes take effect immediately. Content-maintenance rules (including the zh ↔ en sync rule) live in `AGENTS.md`.

## Companion works

- [Analyzing Prime Agent](https://kuwii.xyz/prime-agent-from-source/) — the sequel; Prime Agent's codebase is a fork of `pi-mono`, and this book is its direct predecessor
- [Analyzing Claude Code](https://kuwii.xyz/claude-code-from-source-cn/) — the reference point; it represents the "monolith" approach

## Disclaimer

This book is an independent, educational source-code study. All code excerpts are taken directly from Pi Agent's real source code, and every file path and function name can be verified. This book is not affiliated with the Pi Agent maintainers and has not been endorsed or sponsored by them.

## License

The book content is released under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The `pi-agent-src/` submodule is the upstream project and follows its own MIT license; it is not managed by this repository.
