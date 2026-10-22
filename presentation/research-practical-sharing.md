# Pi 源码分享：可借鉴的一手经验

调研日期：2026-10-22。本文为新分享的研究笔记，不改现有书籍与演讲稿。

## 先说结论

更值得借鉴的材料，不是另一份按模块整理的源码目录，而是作者和使用者遇到问题后，怎样观察、定位、改变自己的工具。新分享建议从「我用了 Agent 后产生了哪些疑问，读源码后怎么解释」切入，每段遵循：实际现象 → 自己的猜测 → 关键源码 → 能带走的判断。

以上是本次策划判断，不是原作者的结论。外部实践适合提供问题，具体答案仍以本地固定提交为准。

## 版本边界

- 仓库说明与包版本写 `v0.83.0`，但实际 submodule HEAD 为 `784653468c42387f607d41ed5ca533100e7eb2fe`，`git describe --tags --always` 返回 `v0.83.0-91-g784653468`。准确的分享脚注宜同时列版本字段和提交号，不能称它是原封不动的 v0.83.0 标签。
- 本次在线打开 [上游 latest release](https://github.com/earendil-works/pi/releases/latest)，重定向至 [v1.4.0](https://github.com/earendil-works/pi/releases/tag/v1.4.0)。发布说明包含 codemode、MCP、in-process subagents 等。2025–2026 年初文章的「不内建 MCP / 子代理」必须标为当时设计背景，不能直接用作今天产品现状。
- 不升级 submodule、不改上游源码。新分享仍可讲固定提交的核心循环，现行功能只作版本差异提示。

## 1. Mario：为什么我要自己做一个 Agent？

来源：[What I learned building an opinionated and minimal coding agent](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/)，2025-11-30，Pi 作者。

**核心经验**：他首先讲自己使用工具时的不满：升级改变行为、上下文被隐藏注入、难以检查交互和处理会话；再说明如何用小核心和可观察的事件解决。不是先逐包介绍 API。

**分享问题**：我输入一句话后，程序到底替我发给模型什么？模型如何让电脑真正修改文件？为什么工具执行后还要再问模型？

**建议采用**：先展示一轮 assistant toolCall → toolResult → assistant 的记录，再跳到循环，不先堆包名。文章属于早期实现；里面的 API 示例、包名、缺失功能不能照搬到本地提交。

## 2. Armin：把工作中的小麻烦变成可改的扩展

来源：[Pi: The Minimal Agent Within OpenClaw](https://lucumr.pocoo.org/2026/1/31/pi/)，2026-01-31，使用者及贡献者 Armin Ronacher。其链接的 [review 扩展源码](https://github.com/mitsuhiko/agent-stuff/blob/main/extensions/review.ts) 目前仍可访问，但 main 会变化。

**核心经验**：`/answer` 解决长回复里问题不好逐个回答；`/files` 找会话提到的文件；`/review` 借会话分支得到新的审查上下文，再回主线处理。扩展是日常流程中的小工具。

**分享问题**：做需求做到一半，想临时审查代码，怎样避免把两件事搅在一起？为什么会话不只是消息数组？

**建议采用**：以主任务 → 临时分支 → 返回主任务的图解引出 `id / parentId`。这是对文章工作流的解释；未在本机安装运行其扩展，不承诺该 main 版本兼容本地固定提交。不是 Pi 原生内建 `/review`。

## 3. 作者公开真实会话：比编造一条顺滑演示更有价值

来源：[badlogicgames/pi-mono 会话数据集](https://huggingface.co/datasets/badlogicgames/pi-mono)。本地提交的 [官方 README](https://github.com/earendil-works/pi/blob/784653468c42387f607d41ed5ca533100e7eb2fe/packages/coding-agent/README.md) 主动链接此数据集。

**实际看见**：页面预览有分析 issue、审查 PR、检查发布说明的工作；字段包含 messages、tools、trace、模型与会话信息。作者的任务不是一个提示词自动完成，预览中能看到多轮用户消息与多次工具调用。

**分享问题**：真人使用时会怎样纠正 Agent？为什么“测试通过”之外，人还要看 diff 和改动范围？

**边界**：本次核实了数据卡与预览，没有完整解析某次长会话。页面当前显示 DatasetGenerationError，预览仍可见；不能说已完整回放或复现。数据经过删减与审查，不能假设工作区、模型、代码版本可完全恢复。后续若选它作案例，先精读单个会话，截取连续的原始轮次，并标明删节。

## 4. Mario：Agent 有闭环，不等于人真的理解了

来源：[Thoughts on slowing the fuck down](https://mariozechner.at/posts/2026-03-25-thoughts-on-slowing-the-fuck-down/)，2026-03-25。

**核心经验**：挑范围清楚、可评价的任务；人的阅读能力约束生成量；关键设计要留在人的理解范围内。他特别区分“有一个评价指标”和完整的软件质量。

**分享问题**：循环什么时候结束？它结束是否代表需求完成？工具报错后为什么还可能继续？

**建议采用**：用一次失败的工具调用讲「程序把错误送回模型」，再区分「模型决定下一步」与「人验证结果」。文中对行业情况的判断包含个人经验，不作为统计证据，也不声称自动评价足以保证质量。

## 5. 固定源码：把讲法落在能自己检索的地方

来源：[固定提交 Agent Loop](https://github.com/earendil-works/pi/blob/784653468c42387f607d41ed5ca533100e7eb2fe/packages/agent/src/agent-loop.ts)、[edit 工具](https://github.com/earendil-works/pi/blob/784653468c42387f607d41ed5ca533100e7eb2fe/packages/coding-agent/src/core/tools/edit.ts)、[官方 README](https://github.com/earendil-works/pi/blob/784653468c42387f607d41ed5ca533100e7eb2fe/packages/coding-agent/README.md)。本次同时读取本地文件核实。

**已核实的可讲行为**：`runLoop()` 筛选模型消息中的 `toolCall`，执行后将结果写入上下文；`executePreparedToolCall()` 捕获异常，构造错误结果并标记 `isError`；edit 由本地代码执行文件读取与写入，结果含给模型的文本及单独的 diff/patch 详情。模型并没有直接碰文件系统。

**分享问题**：真正写文件的是谁？哪里判断参数、实际写入、返回错误？屏幕上的 diff 和模型看到的工具输出是同一份东西吗？

**边界**：这是静态源码验证，未调用在线模型完成任务。可以明确标注“按源码构造的示例消息”，不能标注成实测日志。后续演示优先用临时目录和可控工具错误，不修改这份只读 submodule。

## 推荐的新分享骨架

建议题目：《我读 Pi 源码时，终于弄明白的几件事》。约 15–18 页，讲 20–30 分钟；简洁 Slidev、每页一个疑问、一块短源码或一张小图，详解放讲稿。视觉形式是策划建议，可延续原有 PPT 项目的排版。

1. 我为什么读它：用了 Agent，但不知道它怎么执行动作。
2. 一个普通任务，先看最终变更与一次工具结果。
3. 它真的会改文件吗：toolCall 是请求，本地 execute 才动手。
4. 为什么它改完还会继续：工具结果是下一轮输入。
5. 它改失败了怎么办：错误也是给模型的消息。
6. 为什么越聊越跑偏：实际上下文包含哪些消息。
7. 想岔开一会再回来：会话树解决什么问题。
8. 为什么这套代码可以被拿去做别的 Agent：最后才回顾层次边界。
9. 读源码之后，我现在如何使用和验证 Agent。

其中第 2–5 段优先连成一条连续案例。树与扩展作为第二个短故事，时间不够就移到附录。不要把“讲全四个包”当成成功标准；听众应能回答谁调用模型、谁执行工具、结果为什么回传、谁负责最终验收。

## 用户进一步明确后的调整

用户指出最主要的断点是：很多听众并不知道大模型接口实际如何工作，因而无法理解怎样搭出 harness；上下文管理也是关键。

最终简洁版先用 Anthropic Messages 的两次连续请求建立基础，再到 Pi 源码找同样的行为。接口依据为 [官方工具调用处理文档](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls) 和 [Messages API](https://platform.claude.com/docs/en/api/messages/create)。示例仅讲客户端自定义工具，不能扩展为“所有模型 API 都不能执行服务端工具”。

新增 `practical/minimal-harness.mjs`（预设 API 响应，真实读 fixture）和 `practical/demo.mjs`（直接运行固定源码原始循环，使用预设模型和 fixture 工具，真实测试先失败后通过）。本次未调用在线模型，不把演示包装为模型自主完成修复的实测。
