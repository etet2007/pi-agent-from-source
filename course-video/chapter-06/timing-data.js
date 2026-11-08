window.CHAPTER_DATA = {
  "duration": 375.947667,
  "scenes": [
    0,
    91.705,
    182.976,
    259.904,
    335.528,
    356.39
  ],
  "captions": [
    {
      "text": "这一章讲模型切换。",
      "start": 0,
      "end": 3.477
    },
    {
      "text": "直觉上，",
      "start": 3.477,
      "end": 5.215
    },
    {
      "text": "Agent Loop 好像应该直接调用 OpenAI SDK。",
      "start": 5.215,
      "end": 16.516
    },
    {
      "text": "但这样一来，",
      "start": 16.516,
      "end": 18.689
    },
    {
      "text": "核心循环会被某一家模型厂商的消息格式绑住。",
      "start": 18.689,
      "end": 27.381
    },
    {
      "text": "换到 Anthropic、Google 或 OpenRouter 时，",
      "start": 27.381,
      "end": 39.985
    },
    {
      "text": "流式事件、工具调用格式、图片、缓存和 thinking 字段都会渗进 Loop。",
      "start": 39.985,
      "end": 54.328
    },
    {
      "text": "Pi 的做法是把这些差异放到 pi-ai。",
      "start": 54.328,
      "end": 61.716
    },
    {
      "text": "Agent Loop 只依赖一个 StreamFn：",
      "start": 61.716,
      "end": 71.278
    },
    {
      "text": "输入 model、Context 和 options，",
      "start": 71.278,
      "end": 80.84
    },
    {
      "text": "返回统一的 assistant event stream。",
      "start": 80.84,
      "end": 91.705
    },
    {
      "text": "streamAssistantResponse 默认调用 streamSimple。",
      "start": 91.705,
      "end": 108.655
    },
    {
      "text": "streamSimple 根据 model.api 找到注册的 Provider，",
      "start": 108.655,
      "end": 123.867
    },
    {
      "text": "再调用 Provider 自己的 streamSimple。",
      "start": 123.867,
      "end": 135.167
    },
    {
      "text": "对 Agent Loop 来说，",
      "start": 135.167,
      "end": 140.383
    },
    {
      "text": "重要的是统一事件：",
      "start": 140.383,
      "end": 143.86
    },
    {
      "text": "start、text delta、thinking delta、toolcall delta、done 和 error。",
      "start": 143.86,
      "end": 165.591
    },
    {
      "text": "底层到底是 SSE、SDK 对象还是别的协议，",
      "start": 165.591,
      "end": 173.849
    },
    {
      "text": "不应该改变 Loop 的主控制流。",
      "start": 173.849,
      "end": 179.933
    },
    {
      "text": "这就是依赖倒置。",
      "start": 179.933,
      "end": 182.976
    },
    {
      "text": "但统一不等于没有差异。",
      "start": 182.976,
      "end": 187.322
    },
    {
      "text": "Provider 层要处理 tool call id、thinking signature、cache control、图片格式、重试和认证。",
      "start": 187.322,
      "end": 213.399
    },
    {
      "text": "测试里会有很多看似琐碎的兼容用例。",
      "start": 213.399,
      "end": 220.353
    },
    {
      "text": "它们存在的原因是：",
      "start": 220.353,
      "end": 223.83
    },
    {
      "text": "把复杂性集中在边界层，",
      "start": 223.83,
      "end": 228.176
    },
    {
      "text": "上层循环才能保持稳定。",
      "start": 228.176,
      "end": 232.523
    },
    {
      "text": "API Key 也不是只在 Agent 创建时读取一次。",
      "start": 232.523,
      "end": 242.519
    },
    {
      "text": "每次模型请求前都可以动态解析。",
      "start": 242.519,
      "end": 248.604
    },
    {
      "text": "长任务运行到下一轮时，",
      "start": 248.604,
      "end": 252.95
    },
    {
      "text": "OAuth token 可能已经变了。",
      "start": 252.95,
      "end": 259.904
    },
    {
      "text": "一次 Provider 请求发送的也不是最后一句用户消息。",
      "start": 259.904,
      "end": 271.204
    },
    {
      "text": "它包含 system prompt、转换后的 messages 和工具定义。",
      "start": 271.204,
      "end": 285.112
    },
    {
      "text": "messages 里可能有之前的 assistant tool call，",
      "start": 285.112,
      "end": 299.02
    },
    {
      "text": "也有对应的 ToolResult。",
      "start": 299.02,
      "end": 305.539
    },
    {
      "text": "模型知道测试失败，",
      "start": 305.539,
      "end": 309.016
    },
    {
      "text": "是因为 Bash 输出已经进入了 Context。",
      "start": 309.016,
      "end": 318.143
    },
    {
      "text": "工具定义告诉模型有哪些能力和参数结构。",
      "start": 318.143,
      "end": 325.966
    },
    {
      "text": "模型输出 tool call 时，",
      "start": 325.966,
      "end": 331.616
    },
    {
      "text": "必须引用这些工具名。",
      "start": 331.616,
      "end": 335.528
    },
    {
      "text": "所以 Agent 的能力不是模型记住外部世界，",
      "start": 335.528,
      "end": 344.22
    },
    {
      "text": "而是 Runtime 持续把新的环境证据投影进 Context。",
      "start": 344.22,
      "end": 356.39
    },
    {
      "text": "模型可以切换，",
      "start": 356.39,
      "end": 358.997
    },
    {
      "text": "是因为 Loop 依赖稳定抽象；",
      "start": 358.997,
      "end": 364.648
    },
    {
      "text": "模型能继续做事，",
      "start": 364.648,
      "end": 367.69
    },
    {
      "text": "是因为每一轮请求都带着不断增长的证据链。",
      "start": 367.69,
      "end": 375.948
    }
  ]
};
