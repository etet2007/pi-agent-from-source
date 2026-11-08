# Pi Agent 长视频制作包

这个目录把 100 分钟文稿转换为可执行的制作方案，并提供一支 96 秒的视觉样片。

## 先看什么

- `STORYBOARD.md`：40 个镜头的完整分镜，覆盖整篇文稿。
- `ASSET_MANIFEST.md`：每个画面需要的源码、运行证据和素材。
- `DESIGN.md`：色彩、字体、版式、转场和证据标签规范。
- `index.html`：HyperFrames 视觉样片源码。
- `renders/pi-agent-long-course-animatic.mp4`：已渲染的 96 秒样片。
- `assets/terminal/`：真实终端素材与确定性 Runtime 轨迹。
- `evidence/live-run-2026-06-14/`：正式录制在线任务的公开证据。

## 已完成的终端素材

| 文件 | 内容 | 证据类型 |
| --- | --- | --- |
| `01-fixture-failure-vhs.mp4` | 业务预期与真实失败测试 | REAL RUN |
| `02-cli-help-vhs.mp4` | CLI 模式、参数与默认工具 | SOURCE RUN |
| `03-no-tool-trace-vhs.mp4` | 无工具事件序列 | DETERMINISTIC HARNESS |
| `04-single-tool-trace-vhs.mp4` | Tool Call、宿主执行与 ToolResult | DETERMINISTIC HARNESS |
| `05-parallel-tools-trace-vhs.mp4` | 完成顺序与结果回填顺序 | DETERMINISTIC HARNESS |
| `06-core-tests-vhs.mp4` | 35 项 Agent 核心测试 | SOURCE RUN |
| `07-live-run-replay-vhs.mp4` | 在线 Pi 修复任务的已保存 Session 重放 | REAL RUN |
| `08-session-chain-vhs.mp4` | 同一 Session 的脱敏 `parentId` 追加链 | REAL RUN |

## 本地命令

需要 Node.js 24。使用 nvm 时先切换版本：

```bash
nvm use 24
npm run dev
npm run check
npm run render:draft
```

预览服务启动后，HyperFrames Studio 默认位于：

```text
http://localhost:3027/#project/long-course
```

## 证据口径

- `REAL RUN`：来自真实 Pi Agent 运行记录。
- `DETERMINISTIC HARNESS`：来自可复现的确定性测试装置。
- `SOURCE`：直接映射到仓库中的真实函数或类型。

旁白可以简化概念，但画面不能把演示装置包装成线上真实模型调用。
