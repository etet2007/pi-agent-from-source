window.CHAPTER_DATA = {
  "duration": 184.944,
  "scenes": [
    0,
    36.26,
    73.88,
    113.92,
    151.76,
    172.96
  ],
  "captions": [
    {
      "text": "这一章开始读 Agent Loop。",
      "start": 0,
      "end": 2.14
    },
    {
      "text": "先记住一个原则：",
      "start": 2.58,
      "end": 4.08
    },
    {
      "text": "Prompt 进来以后，",
      "start": 4.08,
      "end": 5.62
    },
    {
      "text": "第一件事不是立刻调用模型，",
      "start": 5.62,
      "end": 8.36
    },
    {
      "text": "而是进入运行生命周期。",
      "start": 8.36,
      "end": 10.76
    },
    {
      "text": "Agent 会先检查是否已有 active run。",
      "start": 10.76,
      "end": 14.16
    },
    {
      "text": "如果同一个 Agent 正在工作，",
      "start": 14.54,
      "end": 16.8
    },
    {
      "text": "新的 prompt 不能直接并发进入。",
      "start": 16.8,
      "end": 19.72
    },
    {
      "text": "否则两个循环会同时改 transcript、streaming 状态和 pending 工具。",
      "start": 19.72,
      "end": 25.72
    },
    {
      "text": "所以 Pi 把新的任务分成三类：",
      "start": 26.24,
      "end": 28.82
    },
    {
      "text": "新的 prompt、工作中的 steering，",
      "start": 28.82,
      "end": 31.36
    },
    {
      "text": "以及结束后的 follow-up。",
      "start": 31.36,
      "end": 33.42
    },
    {
      "text": "它们进入循环的位置不同。",
      "start": 33.42,
      "end": 35.82
    },
    {
      "text": "runWithLifecycle 创建 AbortController，",
      "start": 36.26,
      "end": 39.14
    },
    {
      "text": "把 isStreaming 设为 true，",
      "start": 39.14,
      "end": 41.32
    },
    {
      "text": "清空旧错误，",
      "start": 41.54,
      "end": 42.58
    },
    {
      "text": "然后把 signal 交给 runAgentLoop。",
      "start": 42.58,
      "end": 45.3
    },
    {
      "text": "Loop 完成后，",
      "start": 45.72,
      "end": 46.96
    },
    {
      "text": "还要等待事件监听器。",
      "start": 47.2,
      "end": 49.02
    },
    {
      "text": "因为 message_end 可能正在持久化消息，",
      "start": 49.02,
      "end": 53.38
    },
    {
      "text": "扩展也可能还在处理事件。",
      "start": 53.38,
      "end": 55.94
    },
    {
      "text": "主 promise 不能提前假装一切结束。",
      "start": 55.94,
      "end": 59.36
    },
    {
      "text": "进入 runAgentLoop 后，",
      "start": 59.36,
      "end": 61.62
    },
    {
      "text": "程序会复制旧 Context，",
      "start": 61.94,
      "end": 63.78
    },
    {
      "text": "合并新的 Prompt 消息，",
      "start": 64.28,
      "end": 65.76
    },
    {
      "text": "然后发出 agent_start、turn_start、message_start 和 message_end。",
      "start": 65.76,
      "end": 73.88
    },
    {
      "text": "用户消息也有 start 和 end。",
      "start": 73.88,
      "end": 76.98
    },
    {
      "text": "这样 UI、Session 和扩展不需要猜消息来源，",
      "start": 76.98,
      "end": 81.4
    },
    {
      "text": "只需要订阅同一套消息生命周期。",
      "start": 81.4,
      "end": 84.34
    },
    {
      "text": "真正的核心在 runLoop。",
      "start": 84.34,
      "end": 86.7
    },
    {
      "text": "外层循环处理 follow-up，",
      "start": 86.7,
      "end": 89.44
    },
    {
      "text": "内层循环处理工具调用和 steering。",
      "start": 89.44,
      "end": 92.56
    },
    {
      "text": "只要上一轮还有工具结果要给模型，",
      "start": 92.56,
      "end": 96.08
    },
    {
      "text": "或者用户中途追加了 steering，",
      "start": 96.08,
      "end": 98.7
    },
    {
      "text": "内层就继续。",
      "start": 98.7,
      "end": 100.26
    },
    {
      "text": "每个 Turn 都会先注入 pending messages，",
      "start": 100.26,
      "end": 103.5
    },
    {
      "text": "再调用 streamAssistantResponse。",
      "start": 103.5,
      "end": 106.04
    },
    {
      "text": "它把 Agent 内部消息转换成 Provider 能理解的 Context，",
      "start": 106.5,
      "end": 111.54
    },
    {
      "text": "然后消费流式事件。",
      "start": 111.54,
      "end": 113.46
    },
    {
      "text": "start 会创建 partial assistant message。",
      "start": 113.92,
      "end": 116.68
    },
    {
      "text": "text、thinking 或 tool call delta 会不断替换最后一条 partial。",
      "start": 117.22,
      "end": 122.14
    },
    {
      "text": "done 出现后，",
      "start": 122.14,
      "end": 123.92
    },
    {
      "text": "final assistant message 替换 partial，",
      "start": 123.92,
      "end": 126.46
    },
    {
      "text": "并发出 message_end。",
      "start": 126.68,
      "end": 129.08
    },
    {
      "text": "如果 assistant message 里有 tool call，",
      "start": 129.08,
      "end": 132.04
    },
    {
      "text": "Pi 调用 executeToolCalls。",
      "start": 132.46,
      "end": 134.48
    },
    {
      "text": "工具结果会追加回 Context，",
      "start": 134.48,
      "end": 137.3
    },
    {
      "text": "下一轮模型才能看到真实环境反馈。",
      "start": 137.3,
      "end": 140.74
    },
    {
      "text": "如果没有 tool call，",
      "start": 141.24,
      "end": 142.52
    },
    {
      "text": "也没有 steering，",
      "start": 142.52,
      "end": 143.7
    },
    {
      "text": "内层结束。",
      "start": 143.7,
      "end": 144.9
    },
    {
      "text": "外层再看有没有 follow-up。",
      "start": 144.9,
      "end": 147.64
    },
    {
      "text": "没有 follow-up，",
      "start": 148.12,
      "end": 149.26
    },
    {
      "text": "才发出 agent_end。",
      "start": 149.26,
      "end": 151.76
    },
    {
      "text": "停止也不只有一种原因。",
      "start": 151.76,
      "end": 154
    },
    {
      "text": "没有工具、模型报错、用户取消、shouldStopAfterTurn、工具批次终止，",
      "start": 154.52,
      "end": 160.7
    },
    {
      "text": "都会影响循环怎么收尾。",
      "start": 160.7,
      "end": 162.84
    },
    {
      "text": "所以 Agent Loop 不是一段神秘自动化。",
      "start": 163.34,
      "end": 166.58
    },
    {
      "text": "它是消息、事件、工具结果和停止条件组成的状态机。",
      "start": 166.58,
      "end": 172.06
    },
    {
      "text": "读源码时只问五个问题：",
      "start": 172.96,
      "end": 174.56
    },
    {
      "text": "当前 Context 是什么，",
      "start": 174.56,
      "end": 176.92
    },
    {
      "text": "模型请求在哪里，",
      "start": 176.92,
      "end": 178.72
    },
    {
      "text": "工具结果怎么回填，",
      "start": 178.72,
      "end": 180.5
    },
    {
      "text": "事件什么时候发出，",
      "start": 180.5,
      "end": 182.18
    },
    {
      "text": "循环为什么继续或停止。",
      "start": 182.18,
      "end": 184.36
    }
  ]
};
