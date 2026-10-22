---
theme: default
title: 从一次 API 调用，到一个能干活的 Agent
info: |
  Pi 源码实用分享。先看接口，再实现最小 harness，最后理解上下文。
class: cover
colorSchema: dark
transition: none
fonts:
  sans: PingFang SC
  mono: Menlo
  provider: none
drawings:
  persist: false
---

# 从一次 API 调用<br>到一个能干活的 Agent

<div class="subtitle">带着三个问题读 Pi 源码</div>

大模型接口怎么用？程序怎么替它执行动作？上下文由谁管理？

<div class="footnote">源码固定于 784653468 · 简洁分享版 · 2026-10-22</div>

<!--
开场先问：大家调用过大模型 HTTP 接口吗？没调用过也没关系，这次从请求体开始。
目标：听完能自己写一个最小工具循环，知道上下文由谁准备，并能在 Pi 找到对应代码。
约 25–30 分钟。前 10 页可以单独作为入门小分享。不要从包列表开讲。
本地包字段 0.83.0，实际提交是 v0.83.0 标签之后 91 次提交。不能把旧实现的功能范围当成今天产品现状。
-->

---

# 先把聊天窗口拆开看

| 聊天窗口里的动作 | 程序实际做的事 |
|---|---|
| 我输入一句话 | 组装请求，把消息发给模型 API |
| 回答逐字出现 | 接收响应流，把内容画到界面 |
| 下次还能接着聊 | 程序再次带上需要的历史 |
| 它开始读文件 | 程序处理模型返回的工具请求 |

<div class="takeaway">先理解一次请求，再理解多次请求怎样串起来。</div>

<!--
这里说的是本次采用的 Messages API 和客户端工具模式，别扩展成所有 AI 产品都只有这一种接口。服务端工具、托管会话是别的产品能力。
流式传输是把同一次响应分段送来；不会因为逐字显示，就自动多跑了几次完整模型请求。
下一页先不谈工具，让大家看到普通聊天也是请求和响应。
来源：https://platform.claude.com/docs/en/api/messages/create
-->

---

# 第一次调用：把一句话发过去

```json
{
  "model": "你选择的模型 ID",
  "max_tokens": 1024,
  "system": "你是一个代码助手。",
  "messages": [
    { "role": "user", "content": "解释一下加法函数。" }
  ]
}
```

返回的 `content` 可以是一段文本。`max_tokens` 限制本次输出长度。

<div class="source">Anthropic Messages API 请求体示意；省略 HTTP 头。这里还没有工具。</div>

<!--
POST https://api.anthropic.com/v1/messages。HTTP 头包括 x-api-key、anthropic-version、content-type。
model 这一行是占位说明，不是可直接提交的模型 ID。可运行脚本通过 PI_DEMO_MODEL 指定。
system 是应用给的规则，messages 是对话内容；并不需要先有 Agent 框架才能调用。
本次不实际调用付费模型。minimal-harness.mjs 默认使用预设的 API 响应，可把真实请求体打印出来看。
来源：https://platform.claude.com/docs/en/api/messages/create
-->

---

# 想让它读文件，先告诉它有这个工具

请求体多一个 `tools` 字段：

```json
{
  "name": "read",
  "description": "读取一个文本文件",
  "input_schema": {
    "type": "object",
    "properties": { "path": { "type": "string" } },
    "required": ["path"]
  }
}
```

<div class="takeaway">这里给模型的是工具说明和参数格式。读文件的代码留在本机。</div>

<div class="source">tools 数组中的一个元素，示例工具。官方文档：Tool use with Claude。</div>

<!--
把上页用户消息换成“读取 sum.mjs，检查加法实现”。请求里仍然有 model、max_tokens、system、messages。
工具名和说明会影响模型是否选择它；schema 描述输入结构。工具是否可用、路径是否允许访问，需要应用检查。
这里专讲自定义客户端工具。不要泛化到提供商代执行的 server tools。
来源：https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
-->

---

# 模型返回的，可能是这样一段 JSON

```json
{
  "role": "assistant",
  "content": [{
    "type": "tool_use",
    "id": "call_1",
    "name": "read",
    "input": { "path": "sum.mjs" }
  }],
  "stop_reason": "tool_use"
}
```

此刻程序拿到了“读取 `sum.mjs`”这个请求，文件还没被读取。

<div class="source">按 API 格式构造的响应节选；这是示例，不是在线模型实测。</div>

<!--
停下来让大家指出：哪个字段是工具名，哪个是参数，哪个把结果和请求关联起来？
模型选择 read，应用才去调用本机函数。真实响应可能同时含 text、多次 tool_use 和其他字段；本页只保留一个调用。
stop_reason 表示这次生成为什么停下，不是业务任务是否完成的验收结论。
来源：https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls
-->

---

# 程序读完文件，再发第二次请求

`messages` 按顺序装入：原问题、上次 assistant 响应、这次工具结果。

```json
{
  "role": "user",
  "content": [{
    "type": "tool_result",
    "tool_use_id": "call_1",
    "content": "export const sum = (a, b) => a - b;"
  }]
}
```

<div class="takeaway">模型这次才拿到文件内容，才有依据指出减法写错了。</div>

<div class="source">第二次请求中新增加的消息节选；model、tools 等请求字段继续提供。</div>

<!--
关键点：应用保留 assistant.content 中的工具请求，并紧跟 tool_result。tool_use_id 必须对应。
Anthropic 把工具结果放在 user 消息的 content 块中，不是新增一个 role: toolResult。
Pi 内部采用 toolResult 类型，在 provider 边界转换成上述格式；不是每个厂商都使用同一套字段。
现场跑 node minimal-harness.mjs，显示两次完整 REQUEST。默认模型响应预设，但读取 fixture 是真实 I/O。
来源：https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls
-->

---

# harness 最先要补出的，就是这个循环

```ts
// 教学伪代码：省略异常、取消、并发和预算处理
for (;;) {
  const reply = await callModel({ messages, tools })
  messages.push(reply)
  const calls = getToolCalls(reply)
  if (calls.length === 0) break
  const results = await executeTools(calls)
  messages.push(...results)
}
```

<div class="takeaway">harness 是模型周围的运行程序：准备输入、执行动作、收集结果、决定是否继续。</div>

<!--
这是教学伪代码，不是 Pi 源码，不能直接复制运行。最小可运行版本在 minimal-harness.mjs。
强调每次工具结果都进入下一次请求；一次用户任务可以包含多次模型请求。
可运行版本额外处理 API stop_reason、工具名/路径校验、错误结果和 6 轮上限。
工程产品还要考虑取消、持久化、输出截断、token 预算和 UI。harness 一词在这里用作通用概念，不等同于本仓库中同名 AgentHarness 类。
-->

---

# 现在回到 Pi：同样的步骤藏在哪里？

```ts
const toolCalls = message.content.filter((c) => c.type === "toolCall");
// … 省略工具调用的分支处理
for (const result of toolResults) {
  currentContext.messages.push(result);
  newMessages.push(result);
}
```

工具执行结果进入 `currentContext.messages`，后面的模型调用会使用它。

<div class="source">SOURCE EXCERPT · … = ELIDED · packages/agent/src/agent-loop.ts · runLoop()</div>

<!--
打开 packages/agent/src/agent-loop.ts，搜索 runLoop。
先看 194 行得到模型回复，204 行筛选 toolCall，214 行执行，218–220 行把结果放回上下文。
hasMoreToolCalls 由工具批次结果控制；内层循环还处理 steering。不要把教学循环说成完整实现。
Pi 的工具类型是 toolCall/toolResult，上一页 API 例子是 Anthropic 的 tool_use/tool_result。
核心和提供商之间的转换稍后讲；这里先认出行为对应。
-->

---

# 跑一个最小例子：修复加法函数

```js
export const sum = (a, b) => a - b;
```

任务：**修复这个加法错误，并运行测试。**

```bash
node demo.mjs
```

[打开代码跟读：单步看源码、messages 和文件变化](./walkthrough.html)

- 直接运行固定 Pi 源码里的 `runLoop` 和工具异常处理函数
- 文件读写、测试失败和通过，真实发生在临时目录
- 模型回复、工具适配器预设，方便稳定观察顺序

<!--
现场演示 2 分钟。不要把它包装成模型真的发现了 bug。
脚本从只读上游文件提取 runLoop 与 executePreparedToolCall 原函数，去除 TypeScript 类型后执行；不重新实现这两个函数。
streamAssistantResponse、executeToolCalls 适配层由脚本替换，read/edit/bash 是 fixture 实现，不是 Pi 的完整内置工具。
模型预设五次响应。这个演示验证循环与异常反馈，不评价模型能力，不覆盖真实 API 转换、流式、会话和取消。
trace.json 保存完整角色顺序、工具结果及事件。每次运行创建新临时目录，不写源码和旧稿。
浏览器打开 /walkthrough.html，建议先走完前三个观察点，再跳到“测试失败”，然后点“下一次模型调用”。
这是 V8 断点捕获的真实执行快照回放，模型输出仍预设，点击下一步不会重新执行文件操作。
需要刷新记录时运行 pnpm demo:trace。上游源码没有插入观察语句或修改。
-->

---

# 一次任务，实际问了模型五次

| 请求 | 预设的模型选择 | 真实执行结果 |
|---|---|---|
| 1 | 读文件 | 看到 `a - b` |
| 2 | 运行测试 | 退出码 1：预期 5，得到 -1 |
| 3 | 把减法改成加法 | 文件写入 `a + b` |
| 4 | 再运行测试 | `PASS: sum(2, 3) = 5` |
| 5 | 返回完成说明 | 本次循环结束 |

<div class="takeaway">下一次模型请求的材料，比上一次多了实际执行的结果。</div>

<div class="source">本地演示实测；模型决策预设。完整记录由 demo.mjs 生成到 .tmp/practical-demo/。</div>

<!--
给大家看第三次模型请求 seen 字段：user, assistant, toolResult, assistant, toolResult(error)。
错误不是 UI 上单独闪一下，它确实进入了后续上下文。
五次是这个脚本安排的次数，不是所有修复任务固定五轮，也不是模型一定会先测试。
-->

---

# 工具失败，为什么还能继续？

```ts
} catch (error) {
  acceptingUpdates = false;
  await Promise.all(updateEvents);
  return {
    result: createErrorToolResult(
      error instanceof Error ? error.message : String(error)),
    isError: true,
  };
}
```

<div class="takeaway">Pi 把工具异常变成错误结果，再让模型决定下一步。修复是否有效，仍要验证。</div>

<div class="source">SOURCE EXCERPT · 换行排版 · agent-loop.ts · executePreparedToolCall()</div>

<!--
错误处理是 catch 后返回 result 和 isError，不是让异常直接击穿整个任务。
再到 runLoop 看结果 push 回 messages。正常路径下因此可以继续下一轮。
区分工具失败、模型接口失败、用户取消：stopReason error/aborted 会结束本次循环，产品层另有重试机制。
这不意味着所有错误都能自动恢复。模型可能重复错误，也可能停止求助。
-->

---

# “说完成了”，应该检查什么？

| 观察到的东西 | 能说明什么 |
|---|---|
| assistant 返回“已完成” | 模型给出了这个结论 |
| 工具返回“写入成功” | 这次文件操作执行成功 |
| 测试通过 | 被测试覆盖的行为符合预期 |
| 人看过 diff 和运行结果 | 进一步确认需求与改动范围 |

<div class="takeaway">循环的停止条件和需求的验收条件，需要分别定义。</div>

<!--
可以用本例反问：只有 sum(2,3) 的测试，够不够证明整个加法模块正确？当然不够。
源码里还有 shouldStopAfterTurn、取消、工具批次 terminate、steering 和 follow-up 等条件，不能说只要没有 toolCall 就永远退出。
实践：给任务一个可验证目标，例如“增加一个失败测试，修复后再跑”，再审 diff。
参考 Mario 2026-03-25 工作反思，但本页表格为本次归纳，不作为原文引述。
-->

---

# 上下文：每次请求，究竟带上什么？

```text
请求 1   问题
请求 2   问题 + 读文件请求 + 文件内容
请求 3   上面的历史 + 测试请求 + 错误输出
请求 4   上面的历史 + 修改请求 + 修改结果
```

系统提示、工具定义也占输入。文件内容要被读取并装入消息，模型才能用到。

<div class="takeaway">在本次 Messages API 模式下，程序负责构造历史；模型不会自动读取本地工作区。</div>

<!--
这页最重要的口头解释：刚才 API 的第二次调用没带“神奇 sessionId”，应用把需要的历史再次提供。
提供商缓存可能降低重复输入成本，不能因此假设省略历史也能保留语义。
这是本次客户端工具请求的解释，不覆盖托管会话、服务端工具等其他接口。
附件、图像、工具输出都可成为输入，但仍有格式和预算。
-->

---

# Pi 在模型调用前，还有一次整理

```ts
let messages = context.messages;
if (config.transformContext) {
  messages = await config.transformContext(messages, signal);
}
const llmMessages = await config.convertToLlm(messages);
```

先整理内部消息，再转换成模型提供商能接收的格式。

<div class="source">SOURCE EXCERPT · agent-loop.ts · streamAssistantResponse()</div>

<!--
继续往下读 llmContext：systemPrompt、messages、tools 被组装后交给 streamFunction。
transformContext 是可选钩子，不要说它在每轮一定做压缩；产品层的压缩有自己的逻辑。
convertToLlm 先从 AgentMessage 转成 pi-ai Message；Anthropic API 的具体字段转换还在 packages/ai/src/api/anthropic-messages.ts。
可打开 convertToolResult，看 toolCallId 映射到 tool_use_id，isError 映射到 is_error。
这解释了通用循环为什么不用写满每个厂商的协议分支。
-->

---

# 保存过的历史，不一定全发给模型

| 数据放在哪里 | 用来做什么 |
|---|---|
| 磁盘上的会话记录 | 保留消息、分支、压缩记录 |
| 当前分支整理出的消息 | 决定这次任务接着哪条历史继续 |
| 本次 API 请求 | 放入实际要交给模型的输入 |

<div class="takeaway">排查“它为什么忘了”，要看本次请求选了哪些内容，不能只看聊天窗口。</div>

<div class="source">session-manager.ts · appendMessage() / buildSessionContext() / buildContextEntries()</div>

<!--
产品层 AgentSession 监听 message_end，把 user/assistant/toolResult 写给 SessionManager。
SessionManager 维护 append-only JSONL 树，id/parentId 建立分支。buildSessionContext 从当前叶子构造上下文。
buildContextEntries 处理最新压缩记录：旧消息被摘要与保留范围替代。磁盘记录未等于被删光。
不要暗示界面显示的每一个片段都会逐字发往模型。产品消息还可能经 convertToLlm 筛选转换。
-->

---

# 聊久了“忘事”，先看摘要保留了什么

```text
较早的对话       →  压缩摘要
近期需要的消息   →  继续保留
新的工具结果     →  加入下一次请求
```

- 摘要有机会丢掉具体约束或中间判断
- 大段日志也会占据上下文空间
- 重要约束写进项目文件，需要时重新读取核对

<div class="source">session-manager.ts · buildContextEntries()；压缩触发由产品层管理。</div>

<!--
不要把跑偏一律归因于压缩，也可能是任务歧义、工具输出不足、错误推断。
源码证明的是“有这种上下文整理路径”，不是给某一次错误作诊断。
现场举例：几十轮前说过“不要改数据库结构”，摘要若没保留就要重新提供约束。这个例子是解释场景，不是本地实测的模型失误。
“写进文件”也不是自动永久记忆，需要程序/模型确实读入，而且仍占预算。
-->

---

# 这些经验，别人是从什么问题出发的？

**Mario：我想知道模型到底看见了什么。**

检查实际输入、工具结果和会话，比只看聊天界面更容易解释行为。

**Armin：写需求时，想临时做一次代码审查。**

他的 `/review` 扩展利用会话分支组织审查，再返回主线处理。

<div class="source">作者原文（2025-11-30）；Armin 实践（2026-01-31）。链接与版本说明见末页。</div>

<!--
以上为转述，不是逐字引用。Mario 文章讲透明上下文和可检查交互的动机。
Armin 的 review 是他自己的扩展，不是此版本 Pi 默认内置命令，也不是本次已安装复现的功能。
本地版本的树结构可以解释为什么能组织这种流程：条目有 id/parentId，当前 leaf 决定上下文路径。
这段可选讲 2 分钟，时间紧可跳过，避免再展开完整扩展架构。
-->

---

# 从最小循环到工程产品，还要补什么？

| 实际问题 | harness 需要的能力 |
|---|---|
| 模型请求了不存在的工具 | 工具查找与参数校验 |
| 一直重复失败的动作 | 轮次、时间或成本预算与停止机制 |
| 用户想停下来 | 取消信号与队列处理 |
| 关掉再打开 | 持久化与上下文恢复 |
| 想知道卡在哪 | 事件和可检查的执行记录 |

<div class="takeaway">Pi 源码的价值，是看这些工程问题怎样接到同一个循环周围。</div>

<!--
本表是实现自己的 harness 时的能力清单，不声称 Pi 默认提供统一的轮次/成本上限。
最小脚本做了 6 轮限制，但不代表生产级产品。Pi 循环提供 shouldStopAfterTurn 等钩子，产品能力要逐项核实。
现在再回顾 Agent 是实时循环、AgentSession 做产品编排、SessionManager 管历史，名字才有意义。
-->

---

# 下次读源码，按问题找这五个入口

| 想弄明白什么 | 文件与搜索词 |
|---|---|
| 为什么还能继续执行 | `agent/src/agent-loop.ts` · `runLoop` |
| 工具失败如何回传 | 同一文件 · `executePreparedToolCall` |
| Pi 消息怎么变成 API 字段 | `ai/src/api/anthropic-messages.ts` · `convertToolResult` |
| 本次请求用了哪些历史 | `coding-agent/src/core/session-manager.ts` · `buildSessionContext` |
| 谁把循环组装成可用产品 | `coding-agent/src/core/agent-session.ts` · `prompt` |

<div class="source">路径相对 packages/。固定提交 784653468，使用函数名定位，避免记旧行号。</div>

<!--
建议现场只打开前两个文件，API 转换和上下文留给会后。
告诉大家读法：先问一个可以观察的问题，找状态读写和下一次调用，再按需扩大范围。
这是本次分享推荐的入口，不是穷尽全部架构。TUI、远程接口、评估暂不展开。
-->

---

# 三个问题，现在应该能自己回答

**大模型接口怎么工作？** 发送上下文，得到文本或工具请求。

**harness 怎么做出来？** 执行请求，把结果放回输入，继续调用。

**上下文怎么管理？** 保存历史，选择分支，整理并转换成下一次请求。

<div class="takeaway">会后练习：运行两个演示，把第二次请求的 messages 打开看。</div>

<!--
收尾让听众用自己的话复述，不再复读所有类名。
练习一：node minimal-harness.mjs，找 call_1 和它的 tool_result。
练习二：node demo.mjs，比较第三、第五次请求 seen 字段。
进阶：改默认模拟响应，增加一次工具错误，观察输入的变化。修改模拟脚本时，不动 pi-agent-src。
-->

---

# 参考资料与版本

- [Claude 官方：工具调用与结果回传](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)
- [Mario：为什么做 Pi、如何观察上下文](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/)
- [Armin：实际工作中的 Pi 扩展与会话分支](https://lucumr.pocoo.org/2026/1/31/pi/)
- [Mario：范围、反馈和人的理解](https://mariozechner.at/posts/2026-03-25-thoughts-on-slowing-the-fuck-down/)
- [本次分析的固定源码](https://github.com/earendil-works/pi/tree/784653468c42387f607d41ed5ca533100e7eb2fe)

<div class="version-note">本地提交：v0.83.0-91-g784653468，包字段 0.83.0。<br>截至 2026-10-22，上游发布到 v1.4.0，已加入 MCP 等功能。早期文章只代表当时背景。</div>

<!--
本次源码、术语和函数定位以固定提交为准。公开文章提供经验和问题，不充当当前版本功能清单。
旧稿保留在 presentation/index.html；新稿在独立 practical/ 下。
完整调研：../research-practical-sharing.md。作者真实会话数据集已列在那里，本次没有完整回放，因此没冒充现场案例。
-->
