# 长篇课程素材清单

## 已有

- [x] 完整逐字稿：`pi-agent-study/pi-agent-video-script.md`
- [x] 运行取证：`pi-agent-study/pi-agent-video-evidence.md`
- [x] 确定性轨迹脚本：`pi-agent-study/pi/scripts/video-evidence-traces.ts`
- [x] 可重复失败 fixture：`pi-agent-study/pi-agent-video-fixture`
- [x] 旧版短视频的视觉规范与 12 场参考实现

## 需要录制

- [x] fixture 初始测试失败：画面包含 cwd、`npm test --silent`、测试名称、
  expected `170` 和 actual `-2800`。
- [x] 在线 Pi 真实运行：从完整 Prompt 开始，保留工具名、参数摘要、结果、
  edit diff、复测通过和最终回复。
- [x] `bash + bash` 同批开始的事件视图。
- [x] 三个 read 调用及其 ToolResult。
- [x] edit 一行 diff。
- [x] 最终测试通过。
- [x] `./pi-test.sh --help`，展示输出模式和默认工具。
- [x] Session JSONL 的 message 类型与 parentId 链，使用脱敏节点编号重放。
- [x] 运行 `npx tsx scripts/video-evidence-traces.ts`，录制 no-tool、
  single-tool、parallel-tools 三条确定性轨迹。
- [x] 运行 Agent 核心测试，保留 `19 passed`、`16 passed` 和总计 35 项。

## 录屏与源码绑定

- 终端 `message_update` -> Provider stream 与 Agent partial message 更新。
- 终端 `tool_execution_start/end` -> `executeToolCalls()`。
- 终端 `toolResult` -> ToolResult message 回填 Context。
- 终端 `pwd` -> runtime cwd 解析与 `createAgentSession()`。
- 终端 edit diff -> `edit` 工具执行及真实文件变化。
- Session `id/parentId` -> `SessionManager` 的追加式树结构。
- 测试通过统计 -> `agent-loop.test.ts` 与 `agent.test.ts`。

## 需要生成

- [ ] 40 个分镜单元的章节进度条数据。
- [ ] CLI 到 Provider 的全局架构 SVG。
- [ ] Agent Loop 双层循环 SVG。
- [ ] Tool Call 责任边界 SVG。
- [ ] 四种状态/记忆关系 SVG。
- [ ] Session tree 与 compaction SVG。
- [ ] 七模块最小 Agent Runtime SVG。

## 素材安全

- [x] 不显示 API Key、OAuth Token 或 auth.json 内容。
- [x] 不显示私人 Session 文本。
- [x] 用户主目录替换为 `/tmp/pi-agent-demo` 或 `~/pi-source`。
- [x] 临时中文调试日志不作为官方 Pi 输出出现。
- [x] 在线模型镜头保留 `REAL RUN` 或 `SAVED SESSION REPLAY` 角标。
