# 真实终端素材采集

这些脚本在 macOS Terminal 中执行真实命令，再由系统 `screencapture`
录制指定窗口区域。脚本只负责重放命令、控制停顿、隐藏用户主目录，
以及过滤仓库中已有的临时调试日志，不伪造命令结果。

## 录制单段

```bash
chmod +x capture/*.sh
capture/record-terminal-clip.sh \
  capture/01-fixture-failure.sh \
  16 \
  assets/terminal/01-fixture-failure.mov
```

## 首批素材

- `01-fixture-failure.sh`：业务预期与真实失败测试。
- `02-cli-help.sh`：本地源码 CLI 的真实帮助输出。
- `03-runtime-traces.sh`：真实 Agent Loop 的三条确定性轨迹。
- `04-core-tests.sh`：Agent Loop 与 Agent 的 35 项核心测试。

## VHS

正式视频优先使用 `.tape` 文件生成稳定的纯终端画面：

```bash
cd course-video/long-course
capture/run-vhs.sh capture/01-fixture-failure.tape
```

VHS 负责固定分辨率、字体、主题、输入速度与停顿。终端中的命令仍然
实际执行，不使用预先写死的输出。

Runtime 轨迹先完整执行 `video-evidence-traces.ts`，再用 `jq` 将同一份
结果投影为紧凑事件列表，避免关键事件因完整 JSON 过长而滚出画面。

fixture 录制会在开始前复制到 `/tmp/pi-agent-demo`。这是同一份代码的
隔离副本，可保留真实 Node 测试输出，同时避免堆栈泄露用户主目录。

当前 macOS 环境中的 `ttyd` 仅监听 IPv4，而 VHS 0.11.0 内部使用
`localhost` 导航。`run-vhs.sh` 会优先使用本机的 `vhs-ipv4` 兼容副本；
该副本只把内部地址替换为等长的 `127.0.0.1`，原始 VHS 保持不变。

正式录制前需关闭可能遮挡 Terminal 的窗口，并确保系统已授予
Terminal/当前执行程序屏幕录制权限。
