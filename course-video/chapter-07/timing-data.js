window.CHAPTER_DATA = {
  "duration": 419.116667,
  "scenes": [
    0,
    80.82,
    174.006,
    278.233,
    342.271,
    389.527
  ],
  "captions": [
    {
      "text": "这一章讲记忆。",
      "start": 0,
      "end": 2.65
    },
    {
      "text": "Agent 领域里，",
      "start": 2.65,
      "end": 6.183
    },
    {
      "text": "记忆是最容易把不同概念揉在一起的词。",
      "start": 6.183,
      "end": 13.691
    },
    {
      "text": "在 Pi 里至少要区分四种东西：",
      "start": 13.691,
      "end": 19.432
    },
    {
      "text": "Agent.state、LLM Context、Session JSONL 和 AgentEvent。",
      "start": 19.432,
      "end": 38.423
    },
    {
      "text": "Agent.state 是当前内存状态，",
      "start": 38.423,
      "end": 45.931
    },
    {
      "text": "包括 transcript、model、tools、thinking level、是否 streaming、当前 partial message 和 pending tool calls。",
      "start": 45.931,
      "end": 80.82
    },
    {
      "text": "LLM Context 是某一次请求真正发送给模型的内容。",
      "start": 80.82,
      "end": 92.303
    },
    {
      "text": "它包含 system prompt、messages 和 tools，",
      "start": 92.303,
      "end": 105.11
    },
    {
      "text": "而且可能经过 transform 和 convert。",
      "start": 105.11,
      "end": 115.268
    },
    {
      "text": "Session JSONL 是磁盘上的持久化事实。",
      "start": 115.268,
      "end": 124.984
    },
    {
      "text": "它记录消息、模型变化、thinking level、压缩和分支摘要。",
      "start": 124.984,
      "end": 137.792
    },
    {
      "text": "AgentEvent 是运行过程通知，",
      "start": 137.792,
      "end": 145.3
    },
    {
      "text": "比如 turn_start、message_update 和 tool_execution_end。",
      "start": 145.3,
      "end": 163.407
    },
    {
      "text": "它会驱动 UI、状态更新和持久化，",
      "start": 163.407,
      "end": 169.59
    },
    {
      "text": "但它本身不是模型历史。",
      "start": 169.59,
      "end": 174.006
    },
    {
      "text": "AgentSession 订阅 AgentEvent。",
      "start": 174.006,
      "end": 184.606
    },
    {
      "text": "message_start 和 message_update 可以让 UI 实时显示，",
      "start": 184.606,
      "end": 200.063
    },
    {
      "text": "但主要持久化边界是 message_end。",
      "start": 200.063,
      "end": 208.454
    },
    {
      "text": "如果完成的是 user、assistant 或 toolResult，",
      "start": 208.454,
      "end": 221.703
    },
    {
      "text": "SessionManager 会追加一条消息记录。",
      "start": 221.703,
      "end": 231.861
    },
    {
      "text": "这样磁盘历史以完成消息为单位，",
      "start": 231.861,
      "end": 238.044
    },
    {
      "text": "而不是把每个 token delta 都写进去。",
      "start": 238.044,
      "end": 246.877
    },
    {
      "text": "Session 不是简单数组，",
      "start": 246.877,
      "end": 252.618
    },
    {
      "text": "而是一棵树。",
      "start": 252.618,
      "end": 254.826
    },
    {
      "text": "appendMessage 创建新记录时，",
      "start": 254.826,
      "end": 263.218
    },
    {
      "text": "会把 parentId 设置为当前 leafId，",
      "start": 263.218,
      "end": 272.492
    },
    {
      "text": "然后把 leaf 前进到新记录。",
      "start": 272.492,
      "end": 278.233
    },
    {
      "text": "如果用户回到历史某个节点继续，",
      "start": 278.233,
      "end": 284.416
    },
    {
      "text": "新的 child 会形成分支。",
      "start": 284.416,
      "end": 289.716
    },
    {
      "text": "这样旧路径不会被覆盖，",
      "start": 289.716,
      "end": 294.132
    },
    {
      "text": "审计和恢复都还能做。",
      "start": 294.132,
      "end": 298.107
    },
    {
      "text": "buildSessionContext 接收一个 leaf，",
      "start": 298.107,
      "end": 310.032
    },
    {
      "text": "从这个 leaf 沿 parentId 走回根，",
      "start": 310.032,
      "end": 318.423
    },
    {
      "text": "再反转成当前分支。",
      "start": 318.423,
      "end": 321.956
    },
    {
      "text": "只有这条路径会被投影成当前 Context。",
      "start": 321.956,
      "end": 330.789
    },
    {
      "text": "所以磁盘上存在的历史，",
      "start": 330.789,
      "end": 335.205
    },
    {
      "text": "和当前模型看到的历史，",
      "start": 335.205,
      "end": 339.621
    },
    {
      "text": "不是同一件事。",
      "start": 339.621,
      "end": 342.271
    },
    {
      "text": "压缩也不是删除历史。",
      "start": 342.271,
      "end": 346.246
    },
    {
      "text": "Pi 会追加 compaction entry，",
      "start": 346.246,
      "end": 355.079
    },
    {
      "text": "保存摘要、压缩前 token 数量，",
      "start": 355.079,
      "end": 361.262
    },
    {
      "text": "以及从哪条记录开始保留原消息。",
      "start": 361.262,
      "end": 367.445
    },
    {
      "text": "之后构建 Context 时，",
      "start": 367.445,
      "end": 372.744
    },
    {
      "text": "先放摘要，",
      "start": 372.744,
      "end": 374.511
    },
    {
      "text": "再放保留的原消息，",
      "start": 374.511,
      "end": 378.044
    },
    {
      "text": "最后放压缩后的新消息。",
      "start": 378.044,
      "end": 382.461
    },
    {
      "text": "原始事实仍然留在 Session 里。",
      "start": 382.461,
      "end": 389.527
    },
    {
      "text": "这一章最重要的设计是：",
      "start": 389.527,
      "end": 393.943
    },
    {
      "text": "事实日志和模型上下文分离。",
      "start": 393.943,
      "end": 399.243
    },
    {
      "text": "事实日志追求可恢复、可分支、可审计；",
      "start": 399.243,
      "end": 405.867
    },
    {
      "text": "模型 Context 追求在窗口限制内保留当前任务最有价值的信息。",
      "start": 405.867,
      "end": 419.117
    }
  ]
};
