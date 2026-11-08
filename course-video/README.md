# Pi Agent 长课视频制作

2026-10-24 从 `ForNextJob/pi-agent-course-video/` 整体迁入。这里维护长课的旁白、时间轴、HTML 动画与视频素材；当前现场短分享入口是 [`../presentation/practical/outline.md`](../presentation/practical/outline.md)。

- `chapter-01/` 至 `chapter-08/`：分章节旁白及动画工程。
- `chapter-01/renders/` 至 `chapter-04/renders/`：迁移时存在的本地 MP4。
- `long-course/`：长课分镜、素材清单、运行证据、终端录制和样片源码。
- `scripts/`：章节草稿生成工具，执行前核对覆盖范围。
- [旧版逐字稿](../archive/pi-agent-study/pi-agent-video-script.md)、[运行证据](../archive/pi-agent-study/pi-agent-video-evidence.md)、[旧版源码](../archive/pi-agent-study/pi/)：课程使用的 0.78.1 基准。

在具体章节目录运行 `package.json` 定义的命令。例如：

```bash
cd course-video/chapter-01
npm run preview
npm run check
```

需要 Node.js 24+；HyperFrames 命令使用固定的 0.6.89。录制脚本已指向 `archive/pi-agent-study/`，章节内部相对路径保持原样。

音视频、渲染结果、缓存和原始运行日志保持本地保存，并沿用 `.gitignore`。提交源码不会携带这些媒体，也不会发布视频。

迁移检查不等于重新渲染或播放验收。旧 `long-course/README.md` 的产物记录以实际文件为准；旧录制脚本所需的 `pi-agent-video-fixture/` 在迁移前已缺失，本次保留脚本并在迁移记录中注明。
