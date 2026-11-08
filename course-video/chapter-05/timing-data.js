window.CHAPTER_DATA = {
  "duration": 473.348,
  "scenes": [
    0,
    88.472,
    192.438,
    280.41,
    356.885,
    447.856
  ],
  "captions": [
    {
      "text": "这一章讲工具。",
      "start": 0,
      "end": 2.999
    },
    {
      "text": "先把一句常见说法改准确：",
      "start": 2.999,
      "end": 8.497
    },
    {
      "text": "不是模型真的在终端里执行命令，",
      "start": 8.497,
      "end": 15.495
    },
    {
      "text": "而是模型生成了一个工具调用请求。",
      "start": 15.495,
      "end": 22.993
    },
    {
      "text": "宿主程序把工具名、描述和参数 Schema 放进模型请求。",
      "start": 22.993,
      "end": 35.489
    },
    {
      "text": "模型输出结构化 tool call，",
      "start": 35.489,
      "end": 42.986
    },
    {
      "text": "比如工具名 bash，",
      "start": 42.986,
      "end": 47.485
    },
    {
      "text": "参数 command 是 npm test。",
      "start": 47.485,
      "end": 55.982
    },
    {
      "text": "Pi 在 assistant message 里找到 tool call，",
      "start": 55.982,
      "end": 70.977
    },
    {
      "text": "再到自己的工具列表里按名称查找工具。",
      "start": 70.977,
      "end": 79.474
    },
    {
      "text": "真正执行命令的是 Node.js 宿主进程。",
      "start": 79.474,
      "end": 88.472
    },
    {
      "text": "执行结果会被包装成 role 为 toolResult 的消息，",
      "start": 88.472,
      "end": 101.967
    },
    {
      "text": "放回下一次模型 Context。",
      "start": 101.967,
      "end": 108.965
    },
    {
      "text": "模型靠这个结果知道外部世界发生了什么。",
      "start": 108.965,
      "end": 117.962
    },
    {
      "text": "executeToolCalls 会先拿到同一条 assistant message 里的全部 tool call。",
      "start": 117.962,
      "end": 143.454
    },
    {
      "text": "默认可以并行执行，",
      "start": 143.454,
      "end": 147.453
    },
    {
      "text": "但配置或工具本身可以要求 sequential。",
      "start": 147.453,
      "end": 158.449
    },
    {
      "text": "每个工具调用先发出 tool_execution_start，",
      "start": 158.449,
      "end": 171.945
    },
    {
      "text": "然后进入 prepareToolCall。",
      "start": 171.945,
      "end": 181.442
    },
    {
      "text": "这里会查找工具，",
      "start": 181.442,
      "end": 184.941
    },
    {
      "text": "规范化参数，",
      "start": 184.941,
      "end": 187.44
    },
    {
      "text": "并按 Schema 校验。",
      "start": 187.44,
      "end": 192.438
    },
    {
      "text": "工具不存在时，",
      "start": 192.438,
      "end": 195.437
    },
    {
      "text": "Pi 不会让整个 Loop 崩溃，",
      "start": 195.437,
      "end": 201.935
    },
    {
      "text": "而是生成一个错误 ToolResult，",
      "start": 201.935,
      "end": 210.932
    },
    {
      "text": "让模型在下一轮看到失败原因。",
      "start": 210.932,
      "end": 217.43
    },
    {
      "text": "参数校验通过后，",
      "start": 217.43,
      "end": 220.929
    },
    {
      "text": "beforeToolCall 可以拦截或要求确认。",
      "start": 220.929,
      "end": 232.425
    },
    {
      "text": "真正执行完成后，",
      "start": 232.425,
      "end": 235.924
    },
    {
      "text": "afterToolCall 还能改写结果、标记错误或要求终止。",
      "start": 235.924,
      "end": 249.92
    },
    {
      "text": "长时间工具可以产生 partial update。",
      "start": 249.92,
      "end": 260.916
    },
    {
      "text": "比如 Bash 命令运行时，",
      "start": 260.916,
      "end": 266.414
    },
    {
      "text": "终端输出会不断变成 tool_execution_update。",
      "start": 266.414,
      "end": 280.41
    },
    {
      "text": "并行工具有一个重要细节。",
      "start": 280.41,
      "end": 285.908
    },
    {
      "text": "完成事件按真实完成时间发出，",
      "start": 285.908,
      "end": 292.406
    },
    {
      "text": "fast 工具可能先结束。",
      "start": 292.406,
      "end": 297.904
    },
    {
      "text": "但最终 ToolResult 回填仍保持模型原始 tool call 顺序。",
      "start": 297.904,
      "end": 313.899
    },
    {
      "text": "原因是并行路径用 Promise.all 收集结果。",
      "start": 313.899,
      "end": 324.896
    },
    {
      "text": "Promise 可以先后完成，",
      "start": 324.896,
      "end": 331.394
    },
    {
      "text": "但数组结果保持输入顺序。",
      "start": 331.394,
      "end": 336.892
    },
    {
      "text": "这让 UI 能及时显示完成进度，",
      "start": 336.892,
      "end": 343.39
    },
    {
      "text": "同时让下一次模型请求拿到稳定顺序，",
      "start": 343.39,
      "end": 351.387
    },
    {
      "text": "避免上下文变得不可预测。",
      "start": 351.387,
      "end": 356.885
    },
    {
      "text": "coding-agent 默认核心工具包括 read、bash、edit 和 write。",
      "start": 356.885,
      "end": 375.379
    },
    {
      "text": "read 读取文件，",
      "start": 375.379,
      "end": 379.378
    },
    {
      "text": "bash 运行命令，",
      "start": 379.378,
      "end": 383.377
    },
    {
      "text": "edit 做旧文本到新文本的替换，",
      "start": 383.377,
      "end": 390.874
    },
    {
      "text": "write 创建或覆盖文件。",
      "start": 390.874,
      "end": 396.873
    },
    {
      "text": "edit 的设计很关键。",
      "start": 396.873,
      "end": 401.871
    },
    {
      "text": "模型不是上传整个文件，",
      "start": 401.871,
      "end": 406.869
    },
    {
      "text": "而是提交 oldText 和 newText。",
      "start": 406.869,
      "end": 416.366
    },
    {
      "text": "宿主确认匹配后再替换，",
      "start": 416.366,
      "end": 421.365
    },
    {
      "text": "并能展示 diff。",
      "start": 421.365,
      "end": 425.363
    },
    {
      "text": "工具安全不能只靠 Schema。",
      "start": 425.363,
      "end": 432.361
    },
    {
      "text": "Schema 只能说明 command 是字符串，",
      "start": 432.361,
      "end": 442.858
    },
    {
      "text": "不能说明这个命令安全。",
      "start": 442.858,
      "end": 447.856
    },
    {
      "text": "生产环境至少要分三层：",
      "start": 447.856,
      "end": 452.855
    },
    {
      "text": "协议层限制工具和参数，",
      "start": 452.855,
      "end": 457.853
    },
    {
      "text": "应用层做确认、Hook、日志和脱敏，",
      "start": 457.853,
      "end": 465.351
    },
    {
      "text": "系统层用容器、虚拟机或受限用户隔离。",
      "start": 465.351,
      "end": 473.348
    }
  ]
};
