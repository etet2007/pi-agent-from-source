# 第三章制作目标

第三章讲清一条用户输入进入 Agent Core 之前发生了什么。

观众看完后应该知道：

- `cli.ts` 是薄入口。
- `main.ts` 负责模式分派和 runtime cwd。
- `sdk.ts:createAgentSession` 组装 `Agent` 和 `AgentSession`。
- 默认工具来自 coding-agent 层，不来自模型 SDK。
- `AgentSession.prompt` 会先处理扩展、hook、模板、队列、认证和压缩。

# 制作约束

1. 不讲 TypeScript 基础概念。
2. 不把源码里的中文调试日志当作课程重点。
3. 画面每页只放一个主结论。
4. 字幕优先使用 Whisper 词级时间戳对齐。
5. 代码片段只截关键行，避免小字堆满屏幕。
