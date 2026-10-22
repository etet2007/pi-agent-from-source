# 从一次 API 调用，到一个能干活的 Agent

## 这次为什么改

旧稿先讲术语、模块和分层，再追调用链。用户反馈是看完不清楚在讲什么，也不像自己读源码的感受。进一步确认：听众的主要断点在大模型 API 实际怎么工作、怎样自己做 harness，以及上下文怎样管理。

因此改成“先看 API 的两次请求，再写循环，最后到 Pi 找证据”。不以讲全所有包为目标，不预设听众懂 tool calling。外部实践提供问题，本地源码提供实现证据。

## 形式

- 独立 Slidev 工程，21 页，约 25–30 分钟。
- 参考已有 Effective Engineer PPT 的深色、绿色强调和常规标题/代码排版，进一步去掉装饰。
- 无动画、外部字体、CDN 和远程图片。每页有 Markdown 讲者备注。
- 旧版 `../index.html` 与 `../outline.md` 原样保留。
- 分析基线：`784653468c42387f607d41ed5ca533100e7eb2fe`，描述为 `v0.83.0-91-g784653468`，包字段 `0.83.0`。本次不更新源码。
- 2026-10-22 调研时上游 v1.4.0 已加入 MCP 等功能，旧文章的功能清单不代表今日产品。

## 逐页讲述

| 页 | 目的 | 内容或证据 |
|---:|---|---|
| 1 | 定义三个问题 | API、harness、上下文 |
| 2 | 拆开聊天产品表象 | 输入、流式、历史、工具 |
| 3 | 建立一次请求的形状 | model、system、messages、max_tokens |
| 4 | 工具如何告知模型 | tools、description、input_schema |
| 5 | 看清模型返回了什么 | assistant tool_use，不含文件执行 |
| 6 | 理解第二次调用 | 旧消息 + assistant 请求 + user tool_result；运行 minimal-harness.mjs |
| 7 | 得到最小 harness | 教学循环；区别通用术语与具体 AgentHarness 类 |
| 8 | 到 Pi 验证 | runLoop 筛选调用并将结果追加至上下文 |
| 9 | 说明演示边界 | 原始循环 + 预设模型 + fixture 工具 + 真实文件测试 |
| 10 | 看真实反馈顺序 | 五次模型请求，四次工具执行，先失败后通过 |
| 11 | 看异常变成消息 | executePreparedToolCall catch / isError |
| 12 | 区分停止与验收 | 模型结论、文件写入、测试覆盖、人工检查 |
| 13 | 逐次展开上下文 | 每次请求需要的历史由应用组织 |
| 14 | 看 Pi 的边界转换 | transformContext、convertToLlm，随后 provider 协议转换 |
| 15 | 分清三份数据 | 磁盘记录、分支上下文、本次 API 请求 |
| 16 | 理解压缩 | 摘要、保留消息、约束可能丢失；不把所有跑偏归因于压缩 |
| 17 | 借鉴实际使用经验 | Mario 透明上下文；Armin review 扩展，未本机安装复现 |
| 18 | 认出产品工程问题 | 校验、预算、取消、持久化、事件 |
| 19 | 提供读源码入口 | 五个入口，用问题找函数 |
| 20 | 检验听众理解 | 能复述三个问题，并跑两个脚本 |
| 21 | 保留可查来源 | 官方接口、作者、实践者、固定提交与版本 |

时间紧时可跳过 17 页；不要删前六页，否则会回到默认听众懂 API 的老问题。

## 运行

在本目录执行：

```bash
pnpm install --frozen-lockfile
pnpm dev
```

演示地址：http://localhost:3032/ 。构建 `pnpm build` 输出到被忽略的 `../../.tmp/practical-dist`。

演讲者视图：http://localhost:3032/presenter/1?password=local 。可看到 slides.md 中的逐页备注。

两个演示都不需要模型密钥：

```bash
node minimal-harness.mjs
node demo.mjs
```

### minimal-harness.mjs：看接口与自己写循环

- 默认模型响应固定，展示两次完整 Anthropic Messages 请求，读取 `fixtures/sum.mjs` 是真实操作。
- 第二次请求包含 user、assistant tool_use 和 user tool_result。不会把 Pi 内部 toolResult 角色误写成 Anthropic API 角色。
- 工具只允许读取示例文件，默认 6 轮上限。教学用，不是完整生产 harness。
- `--live` 分支允许用户自行设置 `ANTHROPIC_API_KEY`、`PI_DEMO_MODEL` 后访问真实 API。本次未调用真实在线模型，也未验证此分支的在线响应。
- 可修改模拟输出，演示多工具调用或错误结果如何进入下一次请求。

### demo.mjs：验证 Pi 循环会怎样跑

- 读取本地固定源码文件，直接提取并执行 `runLoop`、`executePreparedToolCall` 原函数，仅移除 TypeScript 类型。
- `streamAssistantResponse` 与工具批次适配层为教学替身；工具为 fixture 实现，不是完整 Pi 内置工具。
- 模型输出预设为 read、bash 测试、edit、bash 重测、text。
- 每次创建 `.tmp/practical-demo/run-*`，在其中生成、修改并测试文件。不会修改 fixture、源码或用户项目。
- 实际检查：五次模型请求、失败工具 `isError=true`、通过工具 `isError=false`、最后 `agent_end`。异常时脚本退出失败。
- 完整记录位于本次运行目录 `trace.json`。这是循环与反馈的执行证据，不是模型自主修 bug 的证明。

## 源码入口与协议来源

路径均相对 `pi-agent-src/`，固定提交链接：

- [runLoop / executePreparedToolCall / streamAssistantResponse](https://github.com/earendil-works/pi/blob/784653468c42387f607d41ed5ca533100e7eb2fe/packages/agent/src/agent-loop.ts)
- [Anthropic convertToolResult / convertMessages](https://github.com/earendil-works/pi/blob/784653468c42387f607d41ed5ca533100e7eb2fe/packages/ai/src/api/anthropic-messages.ts)
- [buildSessionContext / buildContextEntries / appendMessage](https://github.com/earendil-works/pi/blob/784653468c42387f607d41ed5ca533100e7eb2fe/packages/coding-agent/src/core/session-manager.ts)
- [AgentSession.prompt / message_end 持久化](https://github.com/earendil-works/pi/blob/784653468c42387f607d41ed5ca533100e7eb2fe/packages/coding-agent/src/core/agent-session.ts)
- [Anthropic 官方工具生命周期](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)

一手经验与版本核实细节见 [调研笔记](../research-practical-sharing.md)。讲者可把第 17 页替换为自己的真实读码发现，避免冒用别人的体验当作个人经历。

## 本次验证记录（2026-10-22）

- `pnpm install --frozen-lockfile`、`pnpm build` 通过；锁文件复用本工作区 Effective Engineer 项目已用的依赖组合（Slidev 52.19.1），避免旧 52.3.0 与新传递依赖的兼容问题。
- 两个默认无密钥演示执行通过，`node --check` 通过；实际 trace 和临时工程保存在 `.tmp/`。
- 21 页与 21 份讲者备注一致。1280×720 逐页截图并检查，正文与代码无边界溢出或页脚遮挡。更正：前次虽然请求过 1440×810，但未核对实际视口，不能据此声称该尺寸已验证。
- 右箭头翻页验证通过；演讲者第 6 页能看到当前页、下一页和完整备注。带 `?password=local` 访问演讲者页，避免内嵌浏览器不支持原生 prompt。
- 旧稿、书籍与源码子模块未修改。新增内容未提交、未发布。在线模型分支未执行。

## 可单步查看的源码执行回放（2026-10-22）

- 入口：`http://localhost:3032/walkthrough.html`。也可以直接打开 `public/walkthrough.html`，回放本身不需要服务器或网络。
- 第 9 页已加入入口。左侧按真实命中顺序列 21 个观察点，中间显示原源码行与高亮位置，右侧显示当时的内部消息、最近的模型输出/工具结果和临时文件内容。
- 支持左右方向键、上一步/下一步、下一次模型调用、跳到测试失败、从头重看。
- 断点是在执行当前高亮行**之前**采样。执行到工具 catch 时，错误还没被追加至 messages；走到后一个 `turn_end` 观察点才看见 `toolResult(error)`。
- `pnpm demo:trace` 重新执行真实 fixture 测试，用 Node 内置 `inspector` / V8 在两段原始函数上设置断点，生成新快照与 `public/walkthrough.html`。没有插入跟踪语句，上游源码不改动。
- 为使断点行号对应，移除 TypeScript 类型后的函数在 VM 脚本里补齐原始空行；页面展示只读源文件的实际文本，长行按视觉换行，行号保留。
- 观察的原函数仅为 `runLoop` 与 `executePreparedToolCall`；模型/流式处理与工具批次适配器仍是教学替身。因此不能把这份局部调用栈称为完整 Pi 启动栈或完整产品调试。
- 本页是**执行记录回放**，点击下一步不会重新运行文件、请求模型或把浏览器附加到正在运行的进程。如需现场调试器交互暂停，另在 IDE/Node 调试器启动脚本。
- UI 模板源文件为 `walkthrough.template.html`，自包含成品为 `public/walkthrough.html`。手改模板后运行 `pnpm demo:trace` 刷新成品。证据原始 JSON 仍写入 `.tmp/practical-demo/run-*/trace.json`，浏览器成品把临时绝对路径替换为 `[临时目录]`。

### 跟读页验证

- Node/V8 采样通过：21 个断点，恰好 1 次工具异常，结束时 10 条消息。普通 `node demo.mjs` 无调试器模式也通过。
- 浏览器逐步点完 21 个观察点，源码行号依次命中 193/203/675/224，失败时命中 701，最后命中 274。检查了修复前后文件和错误消息的变化。
- “跳到测试失败”、下一步、从头看可用，当前页面 console 无错误。
- 实际浏览器视口为 1280×720，无横向溢出，关键断点高亮可见。视口工具请求其他尺寸后实际仍为 1280×720，因此本轮不把其他尺寸记为通过。
- 成品自包含数据和脚本。浏览器策略不允许 file:// 验证，本轮使用 localhost 验证，不声称已经完成浏览器离线打开检查。
