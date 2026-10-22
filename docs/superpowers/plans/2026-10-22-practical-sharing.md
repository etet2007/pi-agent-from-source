# Pi 源码实用分享改版计划

目标：用一次可复现的修 bug 过程，解释 Agent 连续行动、错误反馈与上下文；另存简洁 Slidev 新版，旧稿保留。

文件：
- presentation/research-practical-sharing.md：公开一手经验、日期与版本边界。
- presentation/practical/slides.md、style.css、package.json：独立 Slidev 工程，3032 端口。
- presentation/practical/demo.mjs：固定模型输出，调用本地原始 runLoop，真实执行临时目录测试。明确标记模拟与实际执行部分。
- presentation/practical/outline.md：讲述顺序、现场演示、来源与逐页源码定位。

步骤：
1. 核实旧稿问题、一手经验和固定源码版本。
2. 做无密钥的源码循环演示，保存真实执行结果。
3. 写约 20 页简洁中文幻灯片，短源码、实际结果、讲者备注。
4. 安装/构建，浏览器逐页查看，核对 1280×720 与 1440×810、翻页和备注。

约束：不修改源码子模块，不变更旧稿，不改书籍，不自动提交或发布。无需为可逆内容修改新建测试套件，验证以真实演示、Slidev 构建及浏览器为准。
