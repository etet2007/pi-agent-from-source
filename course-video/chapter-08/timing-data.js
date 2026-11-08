window.CHAPTER_DATA = {
  "duration": 512.826667,
  "scenes": [
    0,
    70.438,
    152.024,
    225.502,
    280.23,
    334.959
  ],
  "captions": [
    {
      "text": "最后一章，",
      "start": 0,
      "end": 2.027
    },
    {
      "text": "把整条真实任务重新连起来。",
      "start": 2.027,
      "end": 8.108
    },
    {
      "text": "命令行入口解析参数，",
      "start": 8.108,
      "end": 12.669
    },
    {
      "text": "确定运行模式和 cwd，",
      "start": 12.669,
      "end": 17.736
    },
    {
      "text": "创建 SessionManager、资源服务、Agent 与 AgentSession。",
      "start": 17.736,
      "end": 36.992
    },
    {
      "text": "用户 Prompt 进入 AgentSession.prompt，",
      "start": 36.992,
      "end": 51.181
    },
    {
      "text": "经过输入处理、模型认证和 system prompt 准备，",
      "start": 51.181,
      "end": 63.85
    },
    {
      "text": "变成 user message。",
      "start": 63.85,
      "end": 70.438
    },
    {
      "text": "Agent.prompt 建立 active run、AbortSignal、Context 快照和 Loop 配置。",
      "start": 70.438,
      "end": 95.268
    },
    {
      "text": "runAgentLoop 发出起始事件。",
      "start": 95.268,
      "end": 104.39
    },
    {
      "text": "Provider 请求后，",
      "start": 104.39,
      "end": 109.964
    },
    {
      "text": "模型生成 tool call。",
      "start": 109.964,
      "end": 116.045
    },
    {
      "text": "Runtime 校验参数并执行工具。",
      "start": 116.045,
      "end": 124.153
    },
    {
      "text": "ToolResult 进入 Context，",
      "start": 124.153,
      "end": 133.781
    },
    {
      "text": "开始下一轮。",
      "start": 133.781,
      "end": 136.315
    },
    {
      "text": "模型根据真实工具反馈继续请求 read、bash、edit 或最终回复。",
      "start": 136.315,
      "end": 152.024
    },
    {
      "text": "终端上看起来像 Pi 自己修复了问题。",
      "start": 152.024,
      "end": 160.132
    },
    {
      "text": "源码层面更准确的说法是：",
      "start": 160.132,
      "end": 165.706
    },
    {
      "text": "模型与宿主 Runtime 通过多轮结构化消息和真实工具反馈完成闭环任务。",
      "start": 165.706,
      "end": 182.935
    },
    {
      "text": "如果你要自己实现 Agent，",
      "start": 182.935,
      "end": 189.523
    },
    {
      "text": "不需要一开始复制 Pi 的全部能力。",
      "start": 189.523,
      "end": 197.124
    },
    {
      "text": "可以从七个模块开始。",
      "start": 197.124,
      "end": 201.685
    },
    {
      "text": "第一，",
      "start": 201.685,
      "end": 203.712
    },
    {
      "text": "统一消息类型。",
      "start": 203.712,
      "end": 206.752
    },
    {
      "text": "至少能表达 user、assistant、tool call 和 tool result。",
      "start": 206.752,
      "end": 225.502
    },
    {
      "text": "第二，",
      "start": 225.502,
      "end": 227.529
    },
    {
      "text": "模型边界。",
      "start": 227.529,
      "end": 229.556
    },
    {
      "text": "把具体 Provider 封装成一个稳定的 stream 或 complete 接口。",
      "start": 229.556,
      "end": 247.799
    },
    {
      "text": "第三，",
      "start": 247.799,
      "end": 249.826
    },
    {
      "text": "工具接口。",
      "start": 249.826,
      "end": 251.853
    },
    {
      "text": "包含名称、描述、参数 Schema 和 execute。",
      "start": 251.853,
      "end": 263.001
    },
    {
      "text": "第四，",
      "start": 263.001,
      "end": 265.028
    },
    {
      "text": "最小 Agent Loop。",
      "start": 265.028,
      "end": 270.602
    },
    {
      "text": "模型返回工具就执行并回填，",
      "start": 270.602,
      "end": 276.683
    },
    {
      "text": "没有工具就停止。",
      "start": 276.683,
      "end": 280.23
    },
    {
      "text": "第五，",
      "start": 280.23,
      "end": 282.257
    },
    {
      "text": "运行状态。",
      "start": 282.257,
      "end": 284.284
    },
    {
      "text": "管理 transcript、Abort、当前流式消息和用户追加队列。",
      "start": 284.284,
      "end": 299.487
    },
    {
      "text": "第六，",
      "start": 299.487,
      "end": 301.514
    },
    {
      "text": "应用 Session。",
      "start": 301.514,
      "end": 306.074
    },
    {
      "text": "负责系统提示词、输入预处理、认证、重试和压缩策略。",
      "start": 306.074,
      "end": 316.716
    },
    {
      "text": "第七，",
      "start": 316.716,
      "end": 318.743
    },
    {
      "text": "追加式持久化与 Context 投影。",
      "start": 318.743,
      "end": 326.851
    },
    {
      "text": "先保存事实，",
      "start": 326.851,
      "end": 329.385
    },
    {
      "text": "再决定每次给模型看什么。",
      "start": 329.385,
      "end": 334.959
    },
    {
      "text": "Pi 的优点是边界清楚、事件协议统一、Session 保存事实、工具流水线完整，",
      "start": 334.959,
      "end": 352.188
    },
    {
      "text": "并且多种入口共用业务内核。",
      "start": 352.188,
      "end": 358.269
    },
    {
      "text": "代价也真实：",
      "start": 358.269,
      "end": 360.803
    },
    {
      "text": "Provider 层复杂，",
      "start": 360.803,
      "end": 366.377
    },
    {
      "text": "Session 职责重，",
      "start": 366.377,
      "end": 371.445
    },
    {
      "text": "Hook 顺序会形成隐含契约，",
      "start": 371.445,
      "end": 378.032
    },
    {
      "text": "分支、压缩和恢复会增加 Context 构建复杂度。",
      "start": 378.032,
      "end": 389.181
    },
    {
      "text": "所以学习 Pi 不是为了照抄每个选择，",
      "start": 389.181,
      "end": 397.289
    },
    {
      "text": "而是看清每种能力解决了什么问题，",
      "start": 397.289,
      "end": 404.89
    },
    {
      "text": "又引入了什么复杂度。",
      "start": 404.89,
      "end": 409.451
    },
    {
      "text": "最后，",
      "start": 409.451,
      "end": 411.478
    },
    {
      "text": "重新认识 Agent：",
      "start": 411.478,
      "end": 416.038
    },
    {
      "text": "它不是获得电脑控制权的大模型，",
      "start": 416.038,
      "end": 423.133
    },
    {
      "text": "也不只是更长的 system prompt。",
      "start": 423.133,
      "end": 432.761
    },
    {
      "text": "Agent 是模型决策、Runtime 控制、工具反馈、持久化上下文和安全边界组合起来的多步系统。",
      "start": 432.761,
      "end": 454.551
    },
    {
      "text": "不要只问模型有多聪明，",
      "start": 454.551,
      "end": 459.618
    },
    {
      "text": "还要问 Runtime 给了它什么上下文、什么工具、什么反馈、什么停止条件，",
      "start": 459.618,
      "end": 475.834
    },
    {
      "text": "以及工具运行在什么权限边界里。",
      "start": 475.834,
      "end": 482.929
    },
    {
      "text": "一旦你能沿着一次真实 Prompt，",
      "start": 482.929,
      "end": 491.037
    },
    {
      "text": "把每一层输入和输出说清楚，",
      "start": 491.037,
      "end": 497.118
    },
    {
      "text": "Agent 就不再是黑盒。",
      "start": 497.118,
      "end": 502.692
    },
    {
      "text": "它复杂，",
      "start": 502.692,
      "end": 504.719
    },
    {
      "text": "但可以阅读、运行、记录、测试和重新设计。",
      "start": 504.719,
      "end": 512.827
    }
  ]
};
