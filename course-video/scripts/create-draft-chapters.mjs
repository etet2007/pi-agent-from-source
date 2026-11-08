import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const chapters = [
  {
    id: "04",
    port: 3020,
    title: "Agent Loop 源码精读",
    subtitle: "从 prompt 到 agent_end",
    duration: 270,
    sceneParagraphs: [0, 3, 6, 9, 12, 14],
    narration: [
      "这一章开始读 Agent Loop。先记住一个原则：Prompt 进来以后，第一件事不是立刻调用模型，而是进入运行生命周期。",
      "Agent 会先检查是否已有 active run。如果同一个 Agent 正在工作，新的 prompt 不能直接并发进入。否则两个循环会同时改 transcript、streaming 状态和 pending 工具。",
      "所以 Pi 把新的任务分成三类：新的 prompt、工作中的 steering，以及结束后的 follow-up。它们进入循环的位置不同。",
      "runWithLifecycle 创建 AbortController，把 isStreaming 设为 true，清空旧错误，然后把 signal 交给 runAgentLoop。",
      "Loop 完成后，还要等待事件监听器。因为 message_end 可能正在持久化消息，扩展也可能还在处理事件。主 promise 不能提前假装一切结束。",
      "进入 runAgentLoop 后，程序会复制旧 Context，合并新的 Prompt 消息，然后发出 agent_start、turn_start、message_start 和 message_end。",
      "用户消息也有 start 和 end。这样 UI、Session 和扩展不需要猜消息来源，只需要订阅同一套消息生命周期。",
      "真正的核心在 runLoop。外层循环处理 follow-up，内层循环处理工具调用和 steering。只要上一轮还有工具结果要给模型，或者用户中途追加了 steering，内层就继续。",
      "每个 Turn 都会先注入 pending messages，再调用 streamAssistantResponse。它把 Agent 内部消息转换成 Provider 能理解的 Context，然后消费流式事件。",
      "start 会创建 partial assistant message。text、thinking 或 tool call delta 会不断替换最后一条 partial。done 出现后，final assistant message 替换 partial，并发出 message_end。",
      "如果 assistant message 里有 tool call，Pi 调用 executeToolCalls。工具结果会追加回 Context，下一轮模型才能看到真实环境反馈。",
      "如果没有 tool call，也没有 steering，内层结束。外层再看有没有 follow-up。没有 follow-up，才发出 agent_end。",
      "停止也不只有一种原因。没有工具、模型报错、用户取消、shouldStopAfterTurn、工具批次终止，都会影响循环怎么收尾。",
      "所以 Agent Loop 不是一段神秘自动化。它是消息、事件、工具结果和停止条件组成的状态机。",
      "读源码时只问五个问题：当前 Context 是什么，模型请求在哪里，工具结果怎么回填，事件什么时候发出，循环为什么继续或停止。"
    ],
    scenes: [
      ["生命周期入口", "Agent.prompt 先守住 active run", ["prompt", "steer", "followUp"], "if activeRun: throw"],
      ["起始事件", "user message 也走 message_start / message_end", ["agent_start", "turn_start", "message_start", "message_end"], "history != events"],
      ["双层循环", "内层管工具和 steering，外层管 follow-up", ["inner loop", "outer loop", "pending messages"], "while toolCalls || steering"],
      ["流式消息", "delta 不是新消息，是替换 partial", ["start", "update", "done"], "partial -> final"],
      ["停止条件", "停止不是只有 no tool", ["no tool", "error / aborted", "shouldStopAfterTurn", "terminate batch"], "clean shutdown"],
      ["本章记忆点", "Agent Loop 是可观察状态机", ["Context", "Stream", "Tools", "Events", "Stop"], "read source by checkpoints"]
    ]
  },
  {
    id: "05",
    port: 3021,
    title: "模型如何使用工具",
    subtitle: "tool call 到 tool result",
    duration: 270,
    sceneParagraphs: [0, 3, 6, 9, 12, 15],
    narration: [
      "这一章讲工具。先把一句常见说法改准确：不是模型真的在终端里执行命令，而是模型生成了一个工具调用请求。",
      "宿主程序把工具名、描述和参数 Schema 放进模型请求。模型输出结构化 tool call，比如工具名 bash，参数 command 是 npm test。",
      "Pi 在 assistant message 里找到 tool call，再到自己的工具列表里按名称查找工具。真正执行命令的是 Node.js 宿主进程。",
      "执行结果会被包装成 role 为 toolResult 的消息，放回下一次模型 Context。模型靠这个结果知道外部世界发生了什么。",
      "executeToolCalls 会先拿到同一条 assistant message 里的全部 tool call。默认可以并行执行，但配置或工具本身可以要求 sequential。",
      "每个工具调用先发出 tool_execution_start，然后进入 prepareToolCall。这里会查找工具，规范化参数，并按 Schema 校验。",
      "工具不存在时，Pi 不会让整个 Loop 崩溃，而是生成一个错误 ToolResult，让模型在下一轮看到失败原因。",
      "参数校验通过后，beforeToolCall 可以拦截或要求确认。真正执行完成后，afterToolCall 还能改写结果、标记错误或要求终止。",
      "长时间工具可以产生 partial update。比如 Bash 命令运行时，终端输出会不断变成 tool_execution_update。",
      "并行工具有一个重要细节。完成事件按真实完成时间发出，fast 工具可能先结束。但最终 ToolResult 回填仍保持模型原始 tool call 顺序。",
      "原因是并行路径用 Promise.all 收集结果。Promise 可以先后完成，但数组结果保持输入顺序。",
      "这让 UI 能及时显示完成进度，同时让下一次模型请求拿到稳定顺序，避免上下文变得不可预测。",
      "coding-agent 默认核心工具包括 read、bash、edit 和 write。read 读取文件，bash 运行命令，edit 做旧文本到新文本的替换，write 创建或覆盖文件。",
      "edit 的设计很关键。模型不是上传整个文件，而是提交 oldText 和 newText。宿主确认匹配后再替换，并能展示 diff。",
      "工具安全不能只靠 Schema。Schema 只能说明 command 是字符串，不能说明这个命令安全。",
      "生产环境至少要分三层：协议层限制工具和参数，应用层做确认、Hook、日志和脱敏，系统层用容器、虚拟机或受限用户隔离。"
    ],
    scenes: [
      ["工具调用不是执行", "模型只生成请求，宿主真正执行", ["Model", "Runtime", "Host Tool", "ToolResult"], "toolCall -> execute -> result"],
      ["执行流水线", "查找、校验、Hook、执行、回填", ["lookup", "validate", "before", "execute", "after"], "executeToolCalls"],
      ["错误也是结果", "工具不存在或参数错误，返回 ToolResult", ["not found", "schema error", "isError"], "failure goes back to model"],
      ["并行细节", "完成顺序和回填顺序可以不同", ["fast end first", "results keep call order"], "Promise.all keeps order"],
      ["Coding Tools", "read / bash / edit / write", ["read file", "run command", "replace text", "write file"], "default tools"],
      ["安全边界", "参数合法不等于操作安全", ["Schema", "Policy Hooks", "OS Sandbox"], "do not confuse layers"]
    ]
  },
  {
    id: "06",
    port: 3022,
    title: "为什么 Pi 可以切换模型",
    subtitle: "Provider 抽象与统一事件",
    duration: 240,
    sceneParagraphs: [0, 3, 6, 9, 12, 13],
    narration: [
      "这一章讲模型切换。直觉上，Agent Loop 好像应该直接调用 OpenAI SDK。但这样一来，核心循环会被某一家模型厂商的消息格式绑住。",
      "换到 Anthropic、Google 或 OpenRouter 时，流式事件、工具调用格式、图片、缓存和 thinking 字段都会渗进 Loop。",
      "Pi 的做法是把这些差异放到 pi-ai。Agent Loop 只依赖一个 StreamFn：输入 model、Context 和 options，返回统一的 assistant event stream。",
      "streamAssistantResponse 默认调用 streamSimple。streamSimple 根据 model.api 找到注册的 Provider，再调用 Provider 自己的 streamSimple。",
      "对 Agent Loop 来说，重要的是统一事件：start、text delta、thinking delta、toolcall delta、done 和 error。",
      "底层到底是 SSE、SDK 对象还是别的协议，不应该改变 Loop 的主控制流。这就是依赖倒置。",
      "但统一不等于没有差异。Provider 层要处理 tool call id、thinking signature、cache control、图片格式、重试和认证。",
      "测试里会有很多看似琐碎的兼容用例。它们存在的原因是：把复杂性集中在边界层，上层循环才能保持稳定。",
      "API Key 也不是只在 Agent 创建时读取一次。每次模型请求前都可以动态解析。长任务运行到下一轮时，OAuth token 可能已经变了。",
      "一次 Provider 请求发送的也不是最后一句用户消息。它包含 system prompt、转换后的 messages 和工具定义。",
      "messages 里可能有之前的 assistant tool call，也有对应的 ToolResult。模型知道测试失败，是因为 Bash 输出已经进入了 Context。",
      "工具定义告诉模型有哪些能力和参数结构。模型输出 tool call 时，必须引用这些工具名。",
      "所以 Agent 的能力不是模型记住外部世界，而是 Runtime 持续把新的环境证据投影进 Context。",
      "模型可以切换，是因为 Loop 依赖稳定抽象；模型能继续做事，是因为每一轮请求都带着不断增长的证据链。"
    ],
    scenes: [
      ["不绑定 SDK", "Agent Loop 不直接依赖某一家 SDK", ["Agent Loop", "StreamFn", "Provider"], "dependency inversion"],
      ["统一事件", "Provider 差异收敛成同一组事件", ["start", "text delta", "toolcall delta", "done", "error"], "AssistantMessageEventStream"],
      ["Registry", "model.api 决定使用哪个 Provider", ["OpenAI", "Anthropic", "Google", "OpenRouter"], "api registry"],
      ["差异集中管理", "统一层不消灭差异，只移动差异", ["tool IDs", "thinking", "cache", "images", "auth"], "provider complexity"],
      ["请求里有什么", "不是只发最后一句话", ["system", "messages", "tools", "tool results"], "Context projection"],
      ["本章记忆点", "切模型靠抽象，继续行动靠证据链", ["stable loop", "provider adapter", "growing context"], "model != runtime"]
    ]
  },
  {
    id: "07",
    port: 3023,
    title: "Agent 怎样拥有记忆",
    subtitle: "state、context、session 与压缩",
    duration: 240,
    sceneParagraphs: [0, 3, 6, 9, 12, 14],
    narration: [
      "这一章讲记忆。Agent 领域里，记忆是最容易把不同概念揉在一起的词。",
      "在 Pi 里至少要区分四种东西：Agent.state、LLM Context、Session JSONL 和 AgentEvent。",
      "Agent.state 是当前内存状态，包括 transcript、model、tools、thinking level、是否 streaming、当前 partial message 和 pending tool calls。",
      "LLM Context 是某一次请求真正发送给模型的内容。它包含 system prompt、messages 和 tools，而且可能经过 transform 和 convert。",
      "Session JSONL 是磁盘上的持久化事实。它记录消息、模型变化、thinking level、压缩和分支摘要。",
      "AgentEvent 是运行过程通知，比如 turn_start、message_update 和 tool_execution_end。它会驱动 UI、状态更新和持久化，但它本身不是模型历史。",
      "AgentSession 订阅 AgentEvent。message_start 和 message_update 可以让 UI 实时显示，但主要持久化边界是 message_end。",
      "如果完成的是 user、assistant 或 toolResult，SessionManager 会追加一条消息记录。这样磁盘历史以完成消息为单位，而不是把每个 token delta 都写进去。",
      "Session 不是简单数组，而是一棵树。appendMessage 创建新记录时，会把 parentId 设置为当前 leafId，然后把 leaf 前进到新记录。",
      "如果用户回到历史某个节点继续，新的 child 会形成分支。这样旧路径不会被覆盖，审计和恢复都还能做。",
      "buildSessionContext 接收一个 leaf，从这个 leaf 沿 parentId 走回根，再反转成当前分支。只有这条路径会被投影成当前 Context。",
      "所以磁盘上存在的历史，和当前模型看到的历史，不是同一件事。",
      "压缩也不是删除历史。Pi 会追加 compaction entry，保存摘要、压缩前 token 数量，以及从哪条记录开始保留原消息。",
      "之后构建 Context 时，先放摘要，再放保留的原消息，最后放压缩后的新消息。原始事实仍然留在 Session 里。",
      "这一章最重要的设计是：事实日志和模型上下文分离。事实日志追求可恢复、可分支、可审计；模型 Context 追求在窗口限制内保留当前任务最有价值的信息。"
    ],
    scenes: [
      ["记忆不是一个数组", "至少要分清四层对象", ["Agent.state", "LLM Context", "Session JSONL", "AgentEvent"], "memory has layers"],
      ["运行状态", "当前内存里的 transcript 与 streaming 状态", ["transcript", "model", "tools", "partial"], "runtime state"],
      ["持久化边界", "message_end 才是主要写入点", ["message_start", "message_update", "message_end"], "append completed message"],
      ["Session 是树", "parentId 和 leafId 让历史可以分支", ["parentId", "leafId", "branch"], "A -> B -> C"],
      ["Context 是投影", "模型只看到当前 leaf 的路径", ["facts on disk", "projected context"], "buildSessionContext"],
      ["压缩不等于删除", "追加摘要，保留事实", ["compaction entry", "summary", "kept messages"], "facts != prompt"]
    ]
  },
  {
    id: "08",
    port: 3024,
    title: "从 Pi 提炼自己的 Agent",
    subtitle: "完整链路复盘与最小模块",
    duration: 240,
    sceneParagraphs: [0, 3, 6, 9, 12, 15],
    narration: [
      "最后一章，把整条真实任务重新连起来。",
      "命令行入口解析参数，确定运行模式和 cwd，创建 SessionManager、资源服务、Agent 与 AgentSession。",
      "用户 Prompt 进入 AgentSession.prompt，经过输入处理、模型认证和 system prompt 准备，变成 user message。",
      "Agent.prompt 建立 active run、AbortSignal、Context 快照和 Loop 配置。",
      "runAgentLoop 发出起始事件。Provider 请求后，模型生成 tool call。Runtime 校验参数并执行工具。",
      "ToolResult 进入 Context，开始下一轮。模型根据真实工具反馈继续请求 read、bash、edit 或最终回复。",
      "终端上看起来像 Pi 自己修复了问题。源码层面更准确的说法是：模型与宿主 Runtime 通过多轮结构化消息和真实工具反馈完成闭环任务。",
      "如果你要自己实现 Agent，不需要一开始复制 Pi 的全部能力。可以从七个模块开始。",
      "第一，统一消息类型。至少能表达 user、assistant、tool call 和 tool result。",
      "第二，模型边界。把具体 Provider 封装成一个稳定的 stream 或 complete 接口。",
      "第三，工具接口。包含名称、描述、参数 Schema 和 execute。",
      "第四，最小 Agent Loop。模型返回工具就执行并回填，没有工具就停止。",
      "第五，运行状态。管理 transcript、Abort、当前流式消息和用户追加队列。",
      "第六，应用 Session。负责系统提示词、输入预处理、认证、重试和压缩策略。",
      "第七，追加式持久化与 Context 投影。先保存事实，再决定每次给模型看什么。",
      "Pi 的优点是边界清楚、事件协议统一、Session 保存事实、工具流水线完整，并且多种入口共用业务内核。",
      "代价也真实：Provider 层复杂，Session 职责重，Hook 顺序会形成隐含契约，分支、压缩和恢复会增加 Context 构建复杂度。",
      "所以学习 Pi 不是为了照抄每个选择，而是看清每种能力解决了什么问题，又引入了什么复杂度。",
      "最后，重新认识 Agent：它不是获得电脑控制权的大模型，也不只是更长的 system prompt。",
      "Agent 是模型决策、Runtime 控制、工具反馈、持久化上下文和安全边界组合起来的多步系统。",
      "不要只问模型有多聪明，还要问 Runtime 给了它什么上下文、什么工具、什么反馈、什么停止条件，以及工具运行在什么权限边界里。",
      "一旦你能沿着一次真实 Prompt，把每一层输入和输出说清楚，Agent 就不再是黑盒。它复杂，但可以阅读、运行、记录、测试和重新设计。"
    ],
    scenes: [
      ["完整链路复盘", "从 CLI 到 Session JSONL", ["CLI", "AgentSession", "Agent Loop", "ToolResult"], "end-to-end chain"],
      ["闭环任务", "模型和 Runtime 通过工具反馈协作", ["toolCall", "host execute", "context update"], "not magic"],
      ["七个模块", "自建 Agent 的最小积木", ["Messages", "Provider", "Tools", "Loop"], "start small"],
      ["运行与持久化", "先让链路可测试，再扩展能力", ["Runtime State", "Application Session", "Projection"], "test the loop"],
      ["优点与代价", "每个能力都有复杂度成本", ["clean boundary", "provider complexity", "session complexity"], "tradeoffs"],
      ["重新认识 Agent", "模型不是全部，Runtime 同样关键", ["Model", "Runtime", "Tools", "Context", "Security"], "agent as system"]
    ]
  }
];

const root = new URL("..", import.meta.url).pathname;

for (const chapter of chapters) {
  const dir = join(root, `chapter-${chapter.id}`);
  if (existsSync(dir) && process.argv.includes("--missing-only")) {
    console.log(`skip existing chapter-${chapter.id}`);
    continue;
  }
  mkdirSync(join(dir, "scripts"), { recursive: true });
  mkdirSync(join(dir, "renders"), { recursive: true });
  writeFileSync(join(dir, "DESIGN.md"), design());
  writeFileSync(join(dir, "hyperframes.json"), JSON.stringify({ compositions: ["index.html"] }, null, 2) + "\n");
  writeFileSync(join(dir, "chapter-meta.json"), JSON.stringify({ sceneParagraphs: chapter.sceneParagraphs }, null, 2) + "\n");
  writeFileSync(join(dir, "narration.txt"), chapter.narration.join("\n\n") + "\n");
  writeFileSync(join(dir, "package.json"), packageJson(chapter));
  writeFileSync(join(dir, "scripts/build-narration.mjs"), buildNarrationScript());
  writeFileSync(join(dir, "scripts/build-timing.mjs"), buildTimingScript());
  writeFileSync(join(dir, "timing-data.js"), `window.CHAPTER_DATA = ${JSON.stringify({
    duration: chapter.duration,
    scenes: chapter.scenes.map((_, index) => (chapter.duration / chapter.scenes.length) * index),
    captions: chapter.narration.map((text, index) => ({
      text: text.split(/[。！？]/)[0].slice(0, 32),
      start: index * 3,
      end: index * 3 + 2.8
    }))
  }, null, 2)};\n`);
  writeFileSync(join(dir, "index.html"), indexHtml(chapter));
}

function design() {
  return `## Style Prompt

Technical keynote: a restrained dark presentation for source-code education.
Architecture diagrams must be tied to visible source evidence: source symbols,
event names, function names, or concrete runtime states. Code is evidence, not wallpaper.

## Colors

- Canvas: \`#0B0E14\`
- Raised surface: \`#141923\`
- Primary text: \`#F1F4F8\`
- Secondary text: \`#A9B2C3\`
- Accent blue: \`#4C8DFF\`
- Runtime purple: \`#9B7CFF\`
- Tool green: \`#58C792\`
- Session amber: \`#FFB85C\`

## Typography

- Headline and Chinese body: \`Arial, sans-serif\`
- Code and technical labels: \`"JetBrains Mono", monospace\`

## What NOT to Do

- No abstract AI magic language.
- No tiny source-code screenshots.
- No unexplained architecture names.
- No decorative motion that hides control flow.
`;
}

function packageJson(chapter) {
  return JSON.stringify({
    name: `pi-agent-chapter-${chapter.id}`,
    private: true,
    type: "module",
    engines: { node: ">=24" },
    scripts: {
      narration: "node scripts/build-narration.mjs bf_emma",
      transcribe: "python3 -m whisper narration.wav --model small --language Chinese --word_timestamps True --output_format json --output_dir transcriptions-word --verbose False",
      timing: "node scripts/build-timing.mjs",
      check: "npx --yes hyperframes@0.6.89 lint && npx --yes hyperframes@0.6.89 validate && npx --yes hyperframes@0.6.89 inspect --samples 18",
      preview: `npx --yes hyperframes@0.6.89 preview --port ${chapter.port}`,
      render: `npx --yes hyperframes@0.6.89 render --quality draft --output renders/pi-agent-chapter-${chapter.id}.mp4`
    }
  }, null, 2) + "\n";
}

function buildNarrationScript() {
  return `import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

const voice = process.argv[2] ?? "bf_emma";
const text = readFileSync("narration.txt", "utf8").trim();
const workDir = ".tts-work";
rmSync(workDir, { recursive: true, force: true });
mkdirSync(workDir, { recursive: true });

const paragraphs = text.split(/\\n\\s*\\n/).map((value) => value.trim()).filter(Boolean);
const chunks = [];
const maxChunkLength = 28;
for (const paragraph of paragraphs) {
  if (paragraph.length <= maxChunkLength) {
    chunks.push(paragraph);
    continue;
  }
  const parts = paragraph.match(/[^，。！？；：]+[，。！？；：]?/g)?.map((value) => value.trim()).filter(Boolean) ?? [paragraph];
  let current = "";
  for (const part of parts) {
    if (part.length > maxChunkLength) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let offset = 0; offset < part.length; offset += maxChunkLength) {
        chunks.push(part.slice(offset, offset + maxChunkLength));
      }
      continue;
    }
    if ((current + part).length > maxChunkLength && current) {
      chunks.push(current);
      current = part;
    } else {
      current += part;
    }
  }
if (current) chunks.push(current);
}

const speakable = /[\\p{Script=Han}A-Za-z0-9]/u;
const normalizedChunks = [];
for (const chunk of chunks) {
  if (!speakable.test(chunk)) {
    if (normalizedChunks.length > 0) {
      normalizedChunks[normalizedChunks.length - 1] += chunk;
    }
    continue;
  }
  normalizedChunks.push(chunk);
}
chunks.length = 0;
chunks.push(...normalizedChunks);

const concatLines = [];
for (let index = 0; index < chunks.length; index += 1) {
  const textPath = join(workDir, \`chunk-\${String(index).padStart(3, "0")}.txt\`);
  const wavPath = join(workDir, \`chunk-\${String(index).padStart(3, "0")}.wav\`);
  const pausePath = join(workDir, \`pause-\${String(index).padStart(3, "0")}.wav\`);
  writeFileSync(textPath, chunks[index]);
  execFileSync("npx", ["--yes", "hyperframes@0.6.89", "tts", textPath, "--voice", voice, "--output", wavPath], {
    stdio: "inherit",
  });
  concatLines.push(\`file '\${resolve(wavPath).replaceAll("'", "'\\\\''")}'\`);
  if (index < chunks.length - 1) {
    execFileSync("ffmpeg", [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "anullsrc=r=24000:cl=mono",
      "-t",
      "0.18",
      "-c:a",
      "pcm_s16le",
      pausePath,
    ], { stdio: "ignore" });
    concatLines.push(\`file '\${resolve(pausePath).replaceAll("'", "'\\\\''")}'\`);
  }
}

const concatPath = join(workDir, "concat.txt");
writeFileSync(concatPath, \`\${concatLines.join("\\n")}\\n\`);
execFileSync("ffmpeg", [
  "-y",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  concatPath,
  "-ar",
  "48000",
  "-ac",
  "1",
  "-c:a",
  "pcm_s16le",
  "narration.wav",
], { stdio: "inherit" });

console.log(JSON.stringify({ voice, chunks: chunks.length, output: "narration.wav" }, null, 2));
`;
}

function buildTimingScript() {
  return `import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const text = readFileSync("narration.txt", "utf8").trim();
const meta = JSON.parse(readFileSync("chapter-meta.json", "utf8"));
const paragraphs = text.split(/\\n\\s*\\n/).map((value) => value.trim()).filter(Boolean);
const duration = getDuration();

const normalizeChars = (value) =>
  Array.from(value.toLowerCase()).filter((char) => /[\\p{Script=Han}a-z0-9]/u.test(char));

const splitClauses = (value) =>
  value
    .replace(/\\n+/g, "")
    .match(/[^，。！？；：]+[，。！？；：]?/g)
    ?.map((clause) => clause.trim())
    .filter(Boolean) ?? [];

const clauses = [];
paragraphs.forEach((paragraph, paragraphIndex) => {
  for (const text of splitClauses(paragraph)) {
    clauses.push({ text, paragraphIndex });
  }
});

const captions = estimatedCaptions();
const usedWhisper = applyWhisperTimings(captions);
normalizeCaptionTiming(captions);

const scenes = meta.sceneParagraphs.map((paragraphIndex) => {
  const caption = captions.find((item) => item.paragraphIndex === paragraphIndex);
  return caption?.start ?? 0;
});

for (const caption of captions) {
  delete caption.paragraphIndex;
}

const data = { duration, scenes, captions };
writeFileSync("timing-data.js", \`window.CHAPTER_DATA = \${JSON.stringify(data, null, 2)};\\n\`);
updateIndexDuration(duration);
console.log(JSON.stringify({ duration, scenes, captions: captions.length, usedWhisper }, null, 2));

function getDuration() {
  if (!existsSync("narration.wav")) return 180;
  return Number(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", "narration.wav"],
      { encoding: "utf8" },
    ).trim(),
  );
}

function estimatedCaptions() {
  const weights = clauses.map((clause) => Math.max(4, normalizeChars(clause.text).length));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  let cursor = 0;
  return clauses.map((clause, index) => {
    const start = cursor;
    cursor += (duration * weights[index]) / totalWeight;
    return {
      text: clause.text,
      start,
      end: Math.min(duration, cursor),
      paragraphIndex: clause.paragraphIndex,
    };
  });
}

function applyWhisperTimings(captions) {
  const transcriptionPath = "transcriptions-word/narration.json";
  if (!existsSync(transcriptionPath)) return false;

  const transcription = JSON.parse(readFileSync(transcriptionPath, "utf8"));
  const whisperWords = transcription.segments.flatMap((segment) => segment.words ?? []);
  if (whisperWords.length === 0) return false;

  const sourceChars = [];
  const clauseRanges = [];
  for (const clause of clauses) {
    const start = sourceChars.length;
    for (const char of normalizeChars(clause.text)) sourceChars.push(char);
    clauseRanges.push([start, sourceChars.length]);
  }

  const targetChars = [];
  for (const word of whisperWords) {
    for (const char of normalizeChars(word.word)) {
      targetChars.push({ char, start: word.start, end: word.end });
    }
  }
  if (sourceChars.length === 0 || targetChars.length === 0) return false;

  const rows = sourceChars.length + 1;
  const cols = targetChars.length + 1;
  const dp = Array.from({ length: rows }, () => new Uint16Array(cols));
  for (let row = sourceChars.length - 1; row >= 0; row -= 1) {
    for (let col = targetChars.length - 1; col >= 0; col -= 1) {
      dp[row][col] =
        sourceChars[row] === targetChars[col].char
          ? dp[row + 1][col + 1] + 1
          : Math.max(dp[row + 1][col], dp[row][col + 1]);
    }
  }

  const sourceToTarget = new Map();
  let row = 0;
  let col = 0;
  while (row < sourceChars.length && col < targetChars.length) {
    if (sourceChars[row] === targetChars[col].char) {
      sourceToTarget.set(row, col);
      row += 1;
      col += 1;
    } else if (dp[row + 1][col] >= dp[row][col + 1]) {
      row += 1;
    } else {
      col += 1;
    }
  }

  let alignedCount = 0;
  for (let index = 0; index < captions.length; index += 1) {
    const [startChar, endChar] = clauseRanges[index];
    const matches = [];
    for (let charIndex = startChar; charIndex < endChar; charIndex += 1) {
      if (sourceToTarget.has(charIndex)) matches.push(sourceToTarget.get(charIndex));
    }
    const minMatches = Math.min(3, Math.max(1, Math.floor((endChar - startChar) * 0.2)));
    if (matches.length < minMatches) continue;

    const first = Math.min(...matches);
    const last = Math.max(...matches);
    captions[index].start = Math.max(0, targetChars[first].start - 0.02);
    captions[index].end = Math.min(duration, targetChars[last].end + 0.04);
    alignedCount += 1;
  }
  return alignedCount > captions.length * 0.7;
}

function normalizeCaptionTiming(captions) {
  for (let index = 1; index < captions.length; index += 1) {
    const previous = captions[index - 1];
    const current = captions[index];
    if (current.start < previous.end) current.start = previous.end;
    current.end = Math.max(current.end, current.start + 0.2);
  }
  for (const caption of captions) {
    caption.start = Number(Math.max(0, caption.start).toFixed(3));
    caption.end = Number(Math.min(duration, caption.end).toFixed(3));
  }
}

function updateIndexDuration(value) {
  const html = readFileSync("index.html", "utf8")
    .replace(/data-duration="[\\d.]+"/, \`data-duration="\${Math.ceil(value + 2)}"\`)
    .replace(/<audio([^>]+)data-duration="[\\d.]+"([^>]*)>/, \`<audio$1data-duration="\${value.toFixed(3)}"$2>\`);
  writeFileSync("index.html", html);
}
`;
}

function indexHtml(chapter) {
  const sceneHtml = chapter.scenes.map((scene, index) => {
    const [title, lead, chips, code] = scene;
    const chipsHtml = chips.map((chip) => `<div class="chip">${escapeHtml(chip)}</div>`).join("");
    return `<section class="scene" id="s${index + 1}">
        <div class="grid"></div>
        <div class="glow"></div>
        <div class="topline"><span>CHAPTER ${chapter.id}</span><span>${String(index + 1).padStart(2, "0")} / ${String(chapter.scenes.length).padStart(2, "0")}</span></div>
        <div class="body">
          <div class="panel copy">
            <div class="eyebrow">${index === 0 ? "SOURCE READING" : "CONTROL FLOW"}</div>
            <h1>${escapeHtml(title)}</h1>
            <p>${escapeHtml(lead)}</p>
          </div>
          <div class="panel evidence">
            <div class="code-title">真实源码锚点</div>
            <pre>${escapeHtml(code)}</pre>
            <div class="chips">${chipsHtml}</div>
          </div>
        </div>
        <div class="footer"><span>${escapeHtml(chapter.title)}</span><span>${escapeHtml(chapter.subtitle)}</span></div>
      </section>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <script src="timing-data.js"></script>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; background: #0b0e14; }
      #chapter-${chapter.id} {
        position: relative;
        width: 1920px;
        height: 1080px;
        overflow: hidden;
        color: #f1f4f8;
        background: #0b0e14;
        font-family: Arial, sans-serif;
      }
      .scene {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        padding: 78px 104px 128px;
        display: flex;
        flex-direction: column;
        gap: 34px;
        background:
          radial-gradient(circle at 18% 16%, rgba(76, 141, 255, .16), transparent 34%),
          radial-gradient(circle at 86% 26%, rgba(155, 124, 255, .12), transparent 32%),
          #0b0e14;
      }
      .scene:not(#s1) { opacity: 0; }
      .grid {
        position: absolute;
        inset: 0;
        opacity: .2;
        background-image: linear-gradient(rgba(169,178,195,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(169,178,195,.18) 1px, transparent 1px);
        background-size: 64px 64px;
        mask-image: radial-gradient(circle at center, black, transparent 78%);
      }
      .glow {
        position: absolute;
        width: 560px;
        height: 560px;
        right: -120px;
        top: -120px;
        border-radius: 50%;
        background: rgba(76,141,255,.16);
        filter: blur(18px);
      }
      .topline, .footer {
        position: relative;
        z-index: 2;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #a9b2c3;
        font: 22px "JetBrains Mono", monospace;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      .body {
        position: relative;
        z-index: 2;
        flex: 1;
        display: grid;
        grid-template-columns: 1.08fr .92fr;
        gap: 42px;
        min-height: 0;
      }
      .panel {
        border: 1px solid rgba(169, 178, 195, .18);
        background: rgba(20, 25, 35, .9);
        border-radius: 30px;
        padding: 42px;
        box-shadow: 0 24px 80px rgba(0, 0, 0, .28);
        min-height: 0;
      }
      .copy {
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 28px;
      }
      .eyebrow, .code-title {
        color: #4c8dff;
        font: 24px "JetBrains Mono", monospace;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0;
        font-size: 88px;
        line-height: 1.02;
        letter-spacing: -0.055em;
      }
      p {
        margin: 0;
        color: #c6cedb;
        font-size: 36px;
        line-height: 1.38;
      }
      .evidence {
        display: flex;
        flex-direction: column;
        gap: 28px;
        font-family: "JetBrains Mono", monospace;
      }
      pre {
        flex: 1;
        margin: 0;
        padding: 34px;
        border-radius: 24px;
        color: #f1f4f8;
        background: rgba(11,14,20,.84);
        border: 1px solid rgba(255,255,255,.08);
        font-size: 38px;
        line-height: 1.42;
        white-space: pre-wrap;
        display: flex;
        align-items: center;
      }
      .chips {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .chip {
        padding: 20px 22px;
        border-radius: 18px;
        color: #dce5f2;
        background: rgba(76,141,255,.12);
        border: 1px solid rgba(76,141,255,.26);
        font-size: 25px;
      }
      #captions {
        position: absolute;
        left: 190px;
        right: 190px;
        bottom: 120px;
        z-index: 8;
        display: flex;
        justify-content: center;
        pointer-events: none;
      }
      .caption {
        position: absolute;
        visibility: hidden;
        opacity: 0;
        max-width: 1380px;
        padding: 18px 28px;
        color: #f1f4f8;
        background: rgba(11,14,20,.78);
        border: 1px solid rgba(169,178,195,.22);
        border-radius: 18px;
        font-size: 34px;
        line-height: 1.28;
        text-align: center;
        box-shadow: 0 18px 50px rgba(0,0,0,.32);
      }
    </style>
  </head>
  <body>
    <div id="chapter-${chapter.id}" data-composition-id="chapter-${chapter.id}" data-width="1920" data-height="1080" data-start="0" data-duration="${chapter.duration}" data-track-index="0">
      ${sceneHtml}
      <audio id="narration" data-start="0" data-duration="${chapter.duration}" data-track-index="20" src="narration.wav" data-volume="1"></audio>
      <div id="captions"></div>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      const starts = window.CHAPTER_DATA.scenes;
      const sceneSelectors = starts.map((_, index) => "#s" + (index + 1));

      sceneSelectors.forEach((selector, index) => {
        const t = starts[index] ?? 0;
        const scene = document.querySelector(selector);
        const content = scene.querySelectorAll(".topline, .copy, .evidence, .footer");
        if (index > 0) tl.set(selector, { opacity: 1, x: 0 }, Math.max(0, t - .45));
        tl.from(scene.querySelector(".grid"), { opacity: 0, x: index % 2 ? 24 : -24, duration: .75, ease: "sine.out" }, t + .1);
        tl.from(scene.querySelector(".glow"), { opacity: 0, scale: .82, duration: .9, ease: "power2.out" }, t + .12);
        tl.from(content, { opacity: 0, y: 28, scale: .988, duration: .58, stagger: .06, ease: "power3.out" }, t + .2);
        if (index < sceneSelectors.length - 1) {
          const next = starts[index + 1] ?? t + 12;
          tl.to(selector, { x: -90, opacity: 0, duration: .45, ease: "power2.inOut" }, Math.max(0, next - .45));
          tl.fromTo(sceneSelectors[index + 1], { x: 90, opacity: 0 }, { x: 0, opacity: 1, duration: .45, ease: "power2.inOut" }, Math.max(0, next - .45));
        }
      });

      const captionHost = document.getElementById("captions");
      window.CHAPTER_DATA.captions.forEach((group, index) => {
        const element = document.createElement("div");
        element.className = "caption";
        element.id = "caption-" + index;
        element.textContent = group.text;
        captionHost.appendChild(element);
        const visibleStart = group.start + .02;
        const visibleEnd = Math.max(visibleStart + .2, group.end - .04);
        tl.set(element, { visibility: "visible", opacity: 0 }, visibleStart);
        tl.fromTo(element, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .16, ease: "power3.out" }, visibleStart);
        tl.to(element, { opacity: 0, duration: .1, ease: "power2.in" }, Math.max(visibleStart + .2, visibleEnd - .1));
        tl.set(element, { opacity: 0, visibility: "hidden" }, visibleEnd);
      });

      tl.to(".scene:last-of-type .body, .scene:last-of-type .topline, .scene:last-of-type .footer", { opacity: 0, duration: .8, ease: "sine.inOut" }, Math.max(0, window.CHAPTER_DATA.duration - 1.5));
      window.__timelines["chapter-${chapter.id}"] = tl;
    </script>
  </body>
</html>
`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
