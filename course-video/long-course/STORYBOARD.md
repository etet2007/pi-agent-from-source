# Pi Agent 长篇课程制作分镜

## 制作原则

- 第一章使用 2026 年 6 月 15 日的简单函数任务建立心智模型，真实轨迹为：
  `read -> edit -> read -> final assistant`。
- 折扣 fixture 从工具与测试章节开始使用，主要轨迹为：
  `bash + bash -> read x3 -> bash -> edit -> bash -> final assistant`。
- 2026 年 6 月 13 日的首次取证作为对照：两次运行策略不同，但都由
  同一 Agent Loop 通过工具反馈收敛。
- 能在本地真实运行并录制的内容，优先使用终端录屏。动画只用于放大、
  标注或解释录屏中已经发生的事实，不能代替关键操作。
- 每段终端录屏必须同时交代四件事：当前目录、输入命令、关键输出、
  这段输出为什么会引出下一段源码。
- 在线模型素材使用 `REAL RUN` 角标；faux Provider 和测试夹具使用
  `DETERMINISTIC HARNESS` 角标。
- 源码画面每屏最多高亮三处。旁白解释因果，不朗读样板代码。
- 标题中的数字、报错和代码标识必须先给出业务语境，不能让观众先猜
  `-2800`、`ToolResult` 或函数名为何重要。
- 架构图右下角持续保留当前位置缩略图，帮助观众理解当前调用层。
- 章节内主要使用水平 push；章节之间使用蓝色竖向遮罩转场。

## 镜头表

| 编号 | 时间 | 内容 | 主要画面 | 证据/源码 | 生产方式 |
| --- | --- | --- | --- | --- | --- |
| 01 | 00:00-00:30 | 冷开场 | 展示 `greet()` 修改前源码和完整 Prompt | greeting fixture | 源码卡片+Prompt |
| 02 | 00:30-01:05 | 真实工具轨迹 | 逐项展示脱敏 JSON：read call、read result、edit call、diff、再次 read | 2026-06-15 在线 Session | JSON 与源码并排 |
| 03 | 00:55-01:30 | 提出问题 | 五类对象：输入、模型、工具、结果、循环 | 文稿第一章 | 动态排版 |
| 04 | 01:30-02:10 | Chatbot | `User -> Model -> Text -> End` | no-tool harness | 极简流程图 |
| 05 | 02:10-03:00 | Agent 闭环 | Model/Runtime/Host Tool/ToolResult | single-tool harness | 闭环动画 |
| 06 | 03:00-04:20 | 最小 Loop 上半 | Prompt、steering、内层循环 | `runAgentLoop`、`runLoop` | 源码+伪代码 |
| 07 | 04:20-05:35 | 最小 Loop 下半 | ToolResult、停止、follow-up | `executeToolCalls`、`runLoop` | 源码+伪代码 |
| 08 | 05:35-06:30 | 第一章总结 | Agent 是运行系统，不是神秘模型 | 第一章总结 | 关键词构图 |
| 09 | 06:30-07:10 | 第二章章卡 | `MODEL + RUNTIME` | 官方定位 | 章卡 |
| 10 | 07:10-08:30 | Harness 定义 | 模型在中心，Context/Tools/Loop/State 环绕 | README、源码 | 体系图 |
| 11 | 08:30-10:10 | 四 Package | pi-ai、agent-core、coding-agent、tui | packages | 分层架构图 |
| 12 | 10:10-11:30 | 依赖方向 | product -> runtime -> ai -> provider | imports/package | 依赖动画 |
| 13 | 11:30-12:30 | Agent | state/loop/queue/abort | `agent.ts` | 类图+源码 |
| 14 | 12:30-13:30 | AgentSession | input/extensions/retry/compaction | `agent-session.ts` | 类图+源码 |
| 15 | 13:30-14:30 | SessionManager | JSONL/tree/projection | `session-manager.ts` | 树图 |
| 16 | 14:30-16:30 | CLI 与模式 | 先执行 `pi-test.sh --help`，再映射 cli -> main -> mode dispatch | `cli.ts`、`main.ts` | 真实终端录屏+调用链 |
| 17 | 16:30-19:30 | CWD | 真实 `pwd` 与工具路径，然后解释 Session 如何决定 runtime cwd | `main.ts` | 真实终端录屏+路径图 |
| 18 | 19:30-22:00 | 对象组装 | Services -> Agent -> AgentSession | `sdk.ts` | 装配动画 |
| 19 | 22:00-26:00 | Prompt 预处理 | command/hook/skill/auth/compaction | `prompt()` | 流水线 |
| 20 | 26:00-29:00 | 生命周期 | activeRun/Abort/isStreaming/listeners | `agent.ts` tests | 源码+时序 |
| 21 | 29:00-32:00 | 起始事件 | 运行取证脚本并显示 no-tool 完整事件序列 | harness | 真实终端录屏+事件时间线 |
| 22 | 32:00-37:30 | 双层循环 | inner/outer loop 逐段执行 | `runLoop()` | 主源码精读 |
| 23 | 37:30-42:00 | 流式消息 | 终端真实 JSON 增量滚动，再冻结 start/delta/done | 在线 JSON | 真实终端录屏+源码高亮 |
| 24 | 42:00-45:00 | 停止条件 | no tool/error/abort/terminate/follow-up | tests/source | 决策树 |
| 25 | 45:00-48:00 | Tool Call 边界 | 运行 single-tool harness，观察 tool call 与 ToolResult | single-tool | 真实终端录屏+责任边界图 |
| 26 | 48:00-52:30 | 工具流水线 | lookup/validate/hooks/execute/result | `agent-loop.ts` | 流水线 |
| 27 | 52:30-55:30 | 并行细节 | 运行 parallel-tools harness，显示 fast 先结束、结果按原顺序回填 | harness/test | 真实终端录屏+双时间线 |
| 28 | 55:30-59:00 | Coding Tools | 重放真实 read/bash/edit 调用，并补充 write 的独立演示 | tools 源码 | 四工具真实终端录屏 |
| 29 | 59:00-62:00 | 安全 | Schema/Policy/Sandbox | Hook/source docs | 三层边界图 |
| 30 | 62:00-65:30 | Provider 抽象 | Loop -> StreamFn -> Registry | pi-ai | 依赖图 |
| 31 | 65:30-69:00 | 厂商差异 | IDs/thinking/cache/images/auth | provider tests | 差异矩阵 |
| 32 | 69:00-72:00 | Context 增长 | 从正式录制 Session 提取六次请求，逐轮增加事实 | 在线 Session | Session 终端查看+消息堆栈动画 |
| 33 | 72:00-75:30 | 四种“记忆” | State/Context/History/Event | types/source | 四层图区分 |
| 34 | 75:30-79:00 | 持久化边界 | update 到 UI，end 到 Session | `_handleAgentEvent` | 分叉流程 |
| 35 | 79:00-83:00 | Session 树 | 终端查看真实 JSONL 的 id/parentId，再展开为树 | JSONL/source | 真实终端录屏+树动画 |
| 36 | 83:00-87:00 | Compaction | facts 保留，Context 投影摘要 | `buildSessionContext` | 前后对比 |
| 37 | 87:00-90:30 | 全链路复盘 | 真实任务录屏精简重放，CLI 到 final answer 全路径同步点亮 | 全部证据 | 真实终端录屏+总览动画 |
| 38 | 90:30-94:30 | 七模块 | Messages/Provider/Tools/Loop/State/Session/Persistence | 迁移总结 | 积木构图 |
| 39 | 94:30-97:30 | 优点与代价 | boundaries/events/tree vs complexity/security | 源码审计 | 对照表 |
| 40 | 97:30-100:00 | 结尾 | Runtime 让单次生成变成闭环过程 | 全片总结 | 回环收束 |

## 长镜头拆分

以下段落必须拆成多个视觉状态，不能用一张静态 PPT 撑完整段：

- 03:00-06:30：至少 4 个伪代码构建状态。
- 22:00-26:00：Prompt 预处理至少 5 个节点分批出现。
- 32:00-37:30：`runLoop()` 至少 6 个代码高亮状态。
- 48:00-52:30：工具流水线至少 5 个状态。
- 69:00-72:00：Context 按正式录制的真实 6 个 Turn 增长。
- 79:00-87:00：Session tree 与 compaction 分成两个独立图示。

## 真实终端录屏执行表

| 对应镜头 | 终端中真实执行/展示 | 观众必须看清 | 随后解释的源码 |
| --- | --- | --- | --- |
| 01 | 在 fixture 中运行 `npm test --silent` | cwd、测试名称、expected `170`、actual `-2800` | `discount.js`、`discount.test.js` |
| 02、37 | 从本地源码启动 Pi，执行隔离编码任务 | 用户 Prompt、每次工具调用、修改 diff、复测通过、最终回复 | `agent-loop.ts`、`agent.ts` |
| 16 | `./pi-test.sh --help` | Interactive/Print/JSON/RPC 与默认工具 | `cli.ts`、`main.ts` |
| 17 | fixture 录屏中的 cwd，以及 Pi 的文件扫描 Bash | 工具真实运行目录是隔离 fixture，不是源码仓库根目录 | `main.ts`、`sdk.ts` |
| 21、25、27 | `npx tsx scripts/video-evidence-traces.ts` | no-tool、single-tool、parallel-tools 的真实事件顺序 | `agent-loop.ts` |
| 23 | Pi JSON 模式的 `message_update` 片段 | assistant 消息由多次增量组成 | Provider stream、Agent state |
| 28 | 真实 read、bash、edit、write 操作 | 参数、宿主执行、ToolResult；edit 前后差异 | `tools/*`、`executeToolCalls()` |
| 32、35 | 使用脱敏命令查看 fixture Session JSONL | message 类型、toolUse/toolResult、id/parentId 链 | `session-manager.ts` |
| 39 | 运行两项 Agent 核心测试 | `19 passed + 16 passed = 35 passed` | 对应测试与被测实现 |

### 录屏剪辑规则

- 命令必须由真实键入或真实 shell 历史重放产生，不伪造终端输出。
- 首次出现命令时保留完整命令；后续重复命令可以加速，但不能剪掉结果。
- 长 JSON 输出采用“实时滚动 -> 冻结关键行 -> 局部放大”的三段式处理。
- 录屏与源码之间使用 match cut：冻结终端中的事件名、函数名或文件名，
  下一镜直接落到源码中的同名位置。
- 在线模型的工具选择只称为“一次真实运行”，不暗示每次运行顺序都相同。

## 角标规范

```text
REAL RUN
真实在线模型运行；工具选择具有非确定性。

DETERMINISTIC HARNESS
真实 Runtime + Mock Stream；用于稳定证明事件和顺序。

SOURCE
直接来自当前源码快照的静态结论。
```
