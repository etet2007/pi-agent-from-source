window.CHAPTER_DATA = {
  "duration": 260.016,
  "scenes": [
    0,
    6.825,
    29.797,
    61.241,
    105.338,
    119.588,
    151.662,
    180.515,
    242.004
  ],
  "captions": [
    {
      "text": "第三章从入口开始。",
      "start": 0,
      "end": 2.025
    },
    {
      "text": "我们跟踪一条用户输入，",
      "start": 2.085,
      "end": 4.585
    },
    {
      "text": "怎样从命令行进入 AgentSession。",
      "start": 4.645,
      "end": 6.765
    },
    {
      "text": "先看 cli.ts。",
      "start": 6.825,
      "end": 8.255
    },
    {
      "text": "这个文件很薄。",
      "start": 8.315,
      "end": 9.882
    },
    {
      "text": "它设置进程名，",
      "start": 9.942,
      "end": 13.718
    },
    {
      "text": "设置 PI_CODING_AGENT 标记，",
      "start": 13.778,
      "end": 15.636
    },
    {
      "text": "关闭默认 warning 输出，",
      "start": 15.696,
      "end": 17.601
    },
    {
      "text": "配置 HTTP dispatcher。",
      "start": 17.661,
      "end": 19.747
    },
    {
      "text": "最后一行，",
      "start": 19.807,
      "end": 21.554
    },
    {
      "text": "把 process.argv 去掉前两个元素，",
      "start": 21.614,
      "end": 22.997
    },
    {
      "text": "交给 main。",
      "start": 23.057,
      "end": 24.918
    },
    {
      "text": "所以 cli.ts 不解析业务，",
      "start": 24.978,
      "end": 26.317
    },
    {
      "text": "不创建 Agent，",
      "start": 26.377,
      "end": 27.977
    },
    {
      "text": "也不调用模型。",
      "start": 28.037,
      "end": 29.737
    },
    {
      "text": "复杂度从 main.ts 开始。",
      "start": 29.797,
      "end": 31.932
    },
    {
      "text": "main 会先解析参数，",
      "start": 31.992,
      "end": 34.452
    },
    {
      "text": "再决定运行模式。",
      "start": 34.512,
      "end": 35.712
    },
    {
      "text": "这里有四种模式：",
      "start": 35.772,
      "end": 38.285
    },
    {
      "text": "rpc、json、print、interactive。",
      "start": 38.345,
      "end": 40.528
    },
    {
      "text": "显式 rpc 优先。",
      "start": 40.588,
      "end": 42.135
    },
    {
      "text": "显式 json 次之。",
      "start": 42.195,
      "end": 43.501
    },
    {
      "text": "如果传了 print，",
      "start": 43.561,
      "end": 44.998
    },
    {
      "text": "或者标准输入不是 TTY，",
      "start": 45.058,
      "end": 46.887
    },
    {
      "text": "就进入 print。",
      "start": 46.947,
      "end": 49.133
    },
    {
      "text": "其他情况才是 interactive。",
      "start": 49.193,
      "end": 51.083
    },
    {
      "text": "这一步说明，",
      "start": 51.143,
      "end": 53.936
    },
    {
      "text": "交互终端、一次性输出、JSON 输出和 RPC，",
      "start": 53.996,
      "end": 56.771
    },
    {
      "text": "并不是四套 Agent 内核。",
      "start": 56.831,
      "end": 58.927
    },
    {
      "text": "它们主要是不同的输入输出外壳。",
      "start": 58.987,
      "end": 61.181
    },
    {
      "text": "接下来是一个容易忽略的点：",
      "start": 61.241,
      "end": 63.626
    },
    {
      "text": "先确定最终 cwd。",
      "start": 63.686,
      "end": 67.522
    },
    {
      "text": "cwd 就是 Agent 认为自己在哪个项目里工作。",
      "start": 67.582,
      "end": 71.964
    },
    {
      "text": "这会影响 settings、AGENTS.md、Skills、扩展、Session 和工具路径。",
      "start": 72.024,
      "end": 76.576
    },
    {
      "text": "如果用户恢复的是另一个项目的 Session，",
      "start": 76.636,
      "end": 79.961
    },
    {
      "text": "不能先按当前终端目录加载资源。",
      "start": 80.021,
      "end": 82.824
    },
    {
      "text": "所以 main 先创建或打开 SessionManager。",
      "start": 82.884,
      "end": 87.337
    },
    {
      "text": "SessionManager 确认最终 runtime cwd。",
      "start": 87.397,
      "end": 95.029
    },
    {
      "text": "然后才创建和 cwd 绑定的 SettingsManager、ResourceLoader、ModelRegistry 等服务。",
      "start": 95.089,
      "end": 98.875
    },
    {
      "text": "目录错了，",
      "start": 98.935,
      "end": 103.144
    },
    {
      "text": "Agent 看到的项目规则和文件边界都会错。",
      "start": 103.204,
      "end": 105.278
    },
    {
      "text": "确定 cwd 后，",
      "start": 105.338,
      "end": 107.881
    },
    {
      "text": "main 建立 runtime factory。",
      "start": 107.941,
      "end": 111.774
    },
    {
      "text": "真正组装对象的地方在 sdk.ts 的 createAgentSession。",
      "start": 111.834,
      "end": 115.837
    },
    {
      "text": "这里先选择模型和 thinking level。",
      "start": 115.897,
      "end": 119.528
    },
    {
      "text": "然后确定默认工具。",
      "start": 119.588,
      "end": 122.497
    },
    {
      "text": "默认活动工具是 read、bash、edit、write。",
      "start": 122.557,
      "end": 125.583
    },
    {
      "text": "这些工具不是模型 SDK 自带的。",
      "start": 125.643,
      "end": 129.438
    },
    {
      "text": "它们是 coding-agent 层构造出来，",
      "start": 129.498,
      "end": 131.717
    },
    {
      "text": "再交给 Agent 的宿主工具。",
      "start": 131.777,
      "end": 133.545
    },
    {
      "text": "随后代码 new Agent。",
      "start": 133.605,
      "end": 136.253
    },
    {
      "text": "传进去的不是一个神秘大对象，",
      "start": 136.313,
      "end": 137.607
    },
    {
      "text": "而是一组明确的依赖。",
      "start": 137.667,
      "end": 146.024
    },
    {
      "text": "包括 model、convertToLlm、streamFn、transformContext、provider hook、工具 hook、steering 和 follow-up 策略。",
      "start": 146.084,
      "end": 151.602
    },
    {
      "text": "Agent 创建之后，",
      "start": 151.662,
      "end": 155.47
    },
    {
      "text": "再 new AgentSession。",
      "start": 155.53,
      "end": 166.441
    },
    {
      "text": "AgentSession 持有 Agent、SessionManager、SettingsManager、ResourceLoader、ModelRegistry 和 ExtensionRunner。",
      "start": 166.501,
      "end": 171.926
    },
    {
      "text": "到这里，",
      "start": 171.986,
      "end": 176.119
    },
    {
      "text": "运行时已经组装完，",
      "start": 176.179,
      "end": 178.216
    },
    {
      "text": "但用户输入还没有直接进模型。",
      "start": 178.276,
      "end": 180.455
    },
    {
      "text": "用户真正提交文本后，",
      "start": 180.515,
      "end": 183.886
    },
    {
      "text": "先进入 AgentSession.prompt。",
      "start": 183.946,
      "end": 186.722
    },
    {
      "text": "如果文本以斜杠开头，",
      "start": 186.782,
      "end": 188.14
    },
    {
      "text": "Pi 会先尝试扩展命令。",
      "start": 188.2,
      "end": 189.931
    },
    {
      "text": "扩展命令处理成功，",
      "start": 189.991,
      "end": 192.244
    },
    {
      "text": "就不会进入普通 Agent 主循环。",
      "start": 192.304,
      "end": 194.487
    },
    {
      "text": "然后是 input hook。",
      "start": 194.547,
      "end": 196.686
    },
    {
      "text": "扩展可以拦截输入，",
      "start": 196.746,
      "end": 198.836
    },
    {
      "text": "也可以改写文本和图片。",
      "start": 198.896,
      "end": 199.911
    },
    {
      "text": "再往后，",
      "start": 199.971,
      "end": 202.561
    },
    {
      "text": "才展开 skill 命令和 prompt template。",
      "start": 202.621,
      "end": 206.707
    },
    {
      "text": "如果 Agent 正在 streaming，",
      "start": 206.767,
      "end": 210.746
    },
    {
      "text": "Pi 不会偷偷启动第二个并发 prompt。",
      "start": 210.806,
      "end": 213.779
    },
    {
      "text": "调用者必须明确选择 steer 或 followUp。",
      "start": 213.839,
      "end": 216.5
    },
    {
      "text": "如果 Agent 空闲，",
      "start": 216.56,
      "end": 219.166
    },
    {
      "text": "Session 会校验模型和认证，",
      "start": 219.226,
      "end": 220.498
    },
    {
      "text": "检查是否需要压缩上下文，",
      "start": 220.558,
      "end": 224.237
    },
    {
      "text": "构造 user message。",
      "start": 224.297,
      "end": 227.594
    },
    {
      "text": "然后触发 before_agent_start hook。",
      "start": 227.654,
      "end": 230.567
    },
    {
      "text": "扩展可以追加 custom message，",
      "start": 230.627,
      "end": 234.496
    },
    {
      "text": "也可以临时改写 system prompt。",
      "start": 234.556,
      "end": 236.461
    },
    {
      "text": "最后，",
      "start": 236.521,
      "end": 240.117
    },
    {
      "text": "_runAgentPrompt 才调用 agent.prompt。",
      "start": 240.177,
      "end": 241.944
    },
    {
      "text": "这一章的结论很简单。",
      "start": 242.004,
      "end": 244.312
    },
    {
      "text": "一条输入不是直接扔给模型。",
      "start": 244.372,
      "end": 248.635
    },
    {
      "text": "它先经过 CLI 模式分派、cwd 确认、运行时组装、输入预处理、扩展 hook、队列判断，",
      "start": 248.695,
      "end": 251.835
    },
    {
      "text": "最后才进入 Agent Core。",
      "start": 251.895,
      "end": 253.435
    },
    {
      "text": "下一章，",
      "start": 253.495,
      "end": 256.436
    },
    {
      "text": "我们进入 Agent.prompt 和 Agent Loop。",
      "start": 256.496,
      "end": 259.437
    }
  ]
};
