# 第 10 章：系统提示词与资源装配

## Agent 的"岗位说明书"

模型本身不知道自己是谁、能用什么工具、该遵循什么规范。这一切都写在系统提示词里——Agent 的"岗位说明书"。第 9 章的 `prompt()` 漏斗把用户输入处理干净，但在那之前，`AgentSession` 早已装配好了一份系统提示词，作为每次模型调用的背景。

这份提示词不是硬编码的字符串。它是**装配**出来的：根据激活的工具、加载的 skills、项目里的上下文文件、用户的定制，动态拼装。本章拆解这个装配过程，以及它背后的资源系统——skills、prompt 模板、项目上下文文件、斜杠命令。

这里藏着一个 Pi Agent 的标志性模式：**两阶段 skill 加载**。系统提示词里只放 skill 的名字和描述，完整内容让模型按需去读。这个看似简单的决策，解决了"能力越多、提示词越臃肿"的根本矛盾。

---

## `buildSystemPrompt`：装配的主流程

系统提示词由 `buildSystemPrompt`（`packages/coding-agent/src/core/system-prompt.ts`）装配。它的输入是一个选项对象：

```typescript
export interface BuildSystemPromptOptions {
	customPrompt?: string;        // --system-prompt，替换默认提示词
	selectedTools?: string[];     // 默认 [read, bash, edit, write]
	toolSnippets?: Record<string, string>; // 每个工具的一行简介
	promptGuidelines?: string[];  // 追加的指南
	appendSystemPrompt?: string;  // --append-system-prompt，追加到末尾
	cwd: string;
	contextFiles?: Array<{ path: string; content: string }>; // AGENTS.md 等
	skills?: Skill[];
}
```

默认提示词（没有 `customPrompt` 时）的骨架是这样的：

```typescript
let prompt = `You are an expert coding assistant operating inside pi, a coding agent harness. You help users by reading files, executing commands, editing code, and writing new files.

Available tools:
${toolsList}

In addition to the tools above, you may have access to other custom tools depending on the project.

Guidelines:
${guidelines}

Pi documentation (read only when the user asks about pi itself, ...):
- Main documentation: ${readmePath}
- Additional docs: ${docsPath}
- Examples: ${examplesPath}
...`;

if (appendSection) prompt += appendSection;          // --append-system-prompt
// 项目上下文文件
if (contextFiles.length > 0) {
	prompt += "\n\n<project_context>\n\n";
	prompt += "Project-specific instructions and guidelines:\n\n";
	for (const { path: filePath, content } of contextFiles) {
		prompt += `<project_instructions path="${filePath}">\n${content}\n</project_instructions>\n\n`;
	}
	prompt += "</project_context>\n";
}
// skills
if (hasRead && skills.length > 0) prompt += formatSkillsForPrompt(skills);
// 工作目录
prompt += `\nCurrent working directory: ${promptCwd}`;
```

让我们逐段看这个装配。

---

## "Available tools"：来自工具的自描述

提示词里的工具列表不是手写的，而是从激活工具的 `promptSnippet` 拼出来的：

```typescript
const tools = selectedTools || ["read", "bash", "edit", "write"];
const visibleTools = tools.filter((name) => !!toolSnippets?.[name]);
const toolsList = visibleTools.length > 0
	? visibleTools.map((name) => `- ${name}: ${toolSnippets![name]}`).join("\n")
	: "(none)";
```

回忆第 4 章：每个 `ToolDefinition` 都自带一个 `promptSnippet`（比如 read 工具的是 "Read file contents"）。`buildSystemPrompt` 收集激活工具的 snippet，拼成"Available tools"段落。**工具激活，它的简介就自动出现在提示词里；工具关闭，简介就消失。** 这是工具自描述设计的直接收益——新增一个工具，不需要手动更新系统提示词。

注意那句"In addition to the tools above, you may have access to other custom tools depending on the project"——它告诉模型还可能有扩展注册的自定义工具（第 14 章），让模型对未知工具保持开放。

---

## "Guidelines"：根据工具集条件生成

指南段落不是固定的，而是根据**哪些工具激活**动态生成：

```typescript
const hasBash = tools.includes("bash");
const hasGrep = tools.includes("grep");
const hasFind = tools.includes("find");
const hasLs = tools.includes("ls");

// 文件探索指南
if (hasBash && !hasGrep && !hasFind && !hasLs) {
	addGuideline("Use bash for file operations like ls, rg, find");
}

for (const guideline of promptGuidelines ?? []) {
	addGuideline(guideline.trim()); // 工具自带的 promptGuidelines
}

// 总是包含
addGuideline("Be concise in your responses");
addGuideline("Show file paths clearly when working with files");
```

看第一条条件：如果激活了 `bash` 但没有 `grep`/`find`/`ls`（默认情况就是如此），就告诉模型"用 bash 做 ls、rg、find 这类文件操作"。因为默认工具集里这三个只读工具是关闭的（第 4 章），模型需要知道它该用 bash 命令来搜索文件。如果用户用 `--tools` 开启了 grep/find/ls，这条指南就不会出现——因为模型有专门工具了。

`addGuideline` 用一个 `Set` 去重——工具的 `promptGuidelines`（第 4 章）和默认指南合并时不会重复。于是每个工具自带的指南（比如 read 的 "Use read to examine files instead of cat or sed"）也会自动进入这个段落。

这又是一个自描述的胜利：工具不仅声明自己"是什么"（snippet），还声明"用我时该注意什么"（guidelines），系统提示词自动收集。

---

## 项目上下文文件：`<project_context>`

如果项目目录里有 `AGENTS.md`（或 `CLAUDE.md`）这类上下文文件，它们的内容会被包进一个 `<project_context>` 块：

```
<project_context>

Project-specific instructions and guidelines:

<project_instructions path="AGENTS.md">
...文件内容...
</project_instructions>

</project_context>
```

这些文件由 `ResourceLoader`（`packages/coding-agent/src/core/resource-loader.ts` 的 `loadProjectContextFiles`）发现并加载。用 XML 风格的标签包裹有两个好处：其一，给模型一个清晰的结构化边界（"这是项目特定的指令"）；其二，`path` 属性让模型知道每条指令来自哪个文件。

回忆第 1 章的安全模型：项目上下文文件来自可能不可信的第三方仓库，所以它们的加载受**项目信任**门控。`--no-approve` 或 `--no-context-files` 会跳过它们。这是"项目信任"决策在提示词装配处的体现——不信任，就不把项目文件注入提示词。

---

## 两阶段 skill 加载

现在到本章的精华。skills 是"针对特定任务的专业指令"——比如"如何审查代码""如何写迁移脚本"。一个项目可能有几十个 skill，每个 skill 的完整内容可能有几百行。如果把所有 skill 的完整内容都塞进系统提示词，提示词会爆炸。

Pi Agent 的解法是**两阶段加载**：系统提示词里只放 skill 的**名字、描述、位置**，完整内容让模型**按需读取**。`formatSkillsForPrompt`（`packages/coding-agent/src/core/skills.ts`）：

```typescript
export function formatSkillsForPrompt(skills: Skill[]): string {
	const visibleSkills = skills.filter((s) => !s.disableModelInvocation);
	if (visibleSkills.length === 0) return "";

	const lines = [
		"\n\nThe following skills provide specialized instructions for specific tasks.",
		"Use the read tool to load a skill's file when the task matches its description.",
		"When a skill file references a relative path, resolve it against the skill directory ...",
		"",
		"<available_skills>",
	];
	for (const skill of visibleSkills) {
		lines.push("  <skill>");
		lines.push(`    <name>${escapeXml(skill.name)}</name>`);
		lines.push(`    <description>${escapeXml(skill.description)}</description>`);
		lines.push(`    <location>${escapeXml(skill.filePath)}</location>`);
		lines.push("  </skill>");
	}
	lines.push("</available_skills>");
	return lines.join("\n");
}
```

看这段提示词的关键指令：

> Use the read tool to load a skill's file when the task matches its description.

系统提示词只给模型一份"skill 目录"（名字 + 描述 + 文件位置），并告诉它："当任务匹配某个 skill 的描述时，用 read 工具去读它的文件。"于是：

- **启动时**：只加载 skill 的 frontmatter（名字、描述），成本极低。
- **调用时**：模型判断当前任务匹配某个 skill，用 `read` 工具读取完整的 `SKILL.md`，把详细指令加载进上下文。

这就是两阶段：**frontmatter 进提示词，body 按需读取。** 30 个 skill 的目录可能只占几百 token，而它们的完整内容可能有几万 token——但后者只在真正需要时才进入上下文。

`Skill` 接口（`packages/coding-agent/src/core/skills.ts`）：

```typescript
export interface SkillFrontmatter {
	name?: string;
	description?: string;
	"disable-model-invocation"?: boolean;
	[key: string]: unknown;
}

export interface Skill {
	name: string;
	description: string;
	filePath: string;
	baseDir: string;
	sourceInfo: SourceInfo;
	disableModelInvocation: boolean;
}
```

skill 是一个带 YAML frontmatter 的 `SKILL.md` 文件。`disableModelInvocation: true` 的 skill 不会出现在提示词里（`visibleSkills` 过滤掉它们）——它们只能由用户显式 `/skill:name` 调用，模型不能自主触发。这给了一些 skill "只对人不给模型"的控制。

两阶段加载是 Pi Agent "把复杂性推到边缘"哲学的又一例：系统提示词保持精简（核心），完整能力按需加载（边缘）。它和参考书里 Claude Code 的"两阶段 Skill 加载"模式异曲同工——这是一个被反复验证的好模式。

---

## prompt 模板：可复用的提示词片段

prompt 模板（`packages/coding-agent/src/core/prompt-templates.ts`）是另一个"可复用提示词"机制，但和 skill 不同：模板是**用户输入时展开**的，skill 是**模型按需读取**的。

```typescript
export interface PromptTemplate {
	name: string;
	description: string;
	argumentHint?: string;
	content: string;
	sourceInfo: SourceInfo;
	filePath: string;
}
```

模板是一个文件，内容是带占位符的提示词。用户输入 `/template-name arg1 arg2` 时，`expandPromptTemplate`（`:269`）把它展开成完整文本，`substituteArgs`（`:70`）把参数填进占位符：

```typescript
export function substituteArgs(content: string, args: string[]): string {
	// 把 $1, $2, ... 和 $@ 等占位符替换为实际参数
}
```

`parseCommandArgs` 用 bash 风格的引号规则解析参数（支持 `"quoted arg"`）。于是用户可以定义一个 `/review` 模板，内容是"请审查以下方面的代码：$1"，输入 `/review security` 就展开成"请审查以下方面的代码：security"。

模板和 skill 的分工：

| | prompt 模板 | skill |
|---|------------|-------|
| 触发者 | 用户（输入 `/name`） | 模型（判断任务匹配）或用户 |
| 展开时机 | 输入时（`prompt()` 漏斗里） | 运行时（模型用 read 读取） |
| 进系统提示词 | 否（只在用到时展开） | 是（目录进提示词） |
| 用途 | 用户常用的提示词快捷方式 | 给模型的专业任务指令 |

两者都是"把常用的提示词固化成文件"，但服务的对象和时机不同。

---

## 斜杠命令：22 个内置入口

用户以 `/` 开头的输入会被当作命令。`BUILTIN_SLASH_COMMANDS`（`packages/coding-agent/src/core/slash-commands.ts`）定义了 22 个内置命令：

```
/settings  /model  /scoped-models  /export  /import  /share  /copy
/name  /session  /changelog  /hotkeys  /fork  /clone  /tree
/trust  /login  /logout  /new  /compact  /resume  /reload  /quit
```

这些命令分几类：

- **会话管理**：`/new`（新会话）、`/session`（切换）、`/fork`/`/clone`（分支）、`/tree`（查看会话树）、`/resume`（恢复）、`/name`（命名）
- **模型与设置**：`/model`（选模型）、`/scoped-models`、`/settings`、`/hotkeys`
- **压缩**：`/compact`（手动压缩，第 7 章）
- **导入导出**：`/export`/`/import`（HTML/JSONL）、`/share`（GitHub gist）、`/copy`
- **认证**：`/login`/`/logout`
- **信任**：`/trust`（项目信任，第 1 章）
- **扩展**：`/reload`（重新加载扩展/资源）

回忆第 9 章：`prompt()` 漏斗的第一步就是 `_tryExecuteExtensionCommand`——以 `/` 开头的输入先尝试匹配扩展命令。扩展、skills、模板都可以注册自己的斜杠命令（`SlashCommandSource = "extension" | "prompt" | "skill"`），与内置命令共享同一个 `/` 入口。于是 `/` 成了产品、扩展、skill、模板的统一命令面。

---

## `ResourceLoader`：资源的发现者

skills、模板、上下文文件、扩展、主题——这些资源从哪里来？由 `ResourceLoader` 统一发现（`packages/coding-agent/src/core/resource-loader.ts`）：

```typescript
export interface ResourceLoader {
	reload(): Promise<...>; // 重新发现并加载所有资源
	// ...
}
export class DefaultResourceLoader implements ResourceLoader { ... }
```

`DefaultResourceLoader.reload` 扫描多个位置（项目目录的 `.pi/`、用户全局的 `~/.pi/`、CLI flag 指定的路径），发现扩展、skills、prompt 模板、主题、上下文文件。它尊重 `--extension`/`--no-extensions`、`--skill`/`--no-skills`、`--prompt-template`、`--theme`、`--no-context-files` 等 flag。

`/reload` 命令会重新调用 `reload()`——当你编辑了一个扩展或 skill，不用重启 pi，`/reload` 就能重新加载。`AgentSessionRuntime`（第 8 章）的工厂闭包在这里发挥作用：reload 可能触发会话重建。

资源发现也受项目信任门控——不信任的项目，其 `.pi/` 里的扩展和 skill 不会被加载。这又一次把第 1 章的安全模型落到了实处。

---

## 实践应用

Pi Agent 的资源装配为"如何给 Agent 注入能力和指令"提供了四条可迁移的模式。

**系统提示词是装配出来的，不是硬编码的。** 工具列表来自工具的 snippet，指南根据激活工具条件生成，项目文件和 skills 动态注入。它解决的问题是：提示词与工具集/能力脱节，加一个工具要手动改提示词。当提示词从组件的自描述里装配，能力与提示词永远同步。

**两阶段加载：目录进提示词，内容按需读。** skill 只在提示词里放名字+描述+位置，完整 body 让模型用 read 工具按需加载。它解决的问题是：能力越多提示词越臃肿，最终撑爆上下文或稀释注意力。当只有"目录"常驻、"内容"按需，能力的数量就不再受提示词大小限制。这个模式适用于任何"有很多可选能力，但每次只用少数几个"的场景。

**区分"给人的快捷方式"和"给模型的专业指令"。** prompt 模板由用户输入时展开，skill 由模型按需读取——两者都是固化提示词，但触发者和时机不同。它解决的问题是：把两类需求混为一谈，导致要么用户记不住命令、要么模型不知道何时该用。分清服务对象，机制才能各司其职。

**统一的命令入口，开放的注册面。** 内置命令、扩展命令、skill、模板共享 `/` 入口，`prompt()` 漏斗第一步就分发给扩展。它解决的问题是：命令系统封闭，扩展无法拥有自己的命令。当入口统一且对扩展开放，产品的命令面可以随扩展线性增长。

---

## 总结

Pi Agent 的系统提示词是装配出来的：`buildSystemPrompt` 从激活工具的 `promptSnippet`/`promptGuidelines` 拼出工具列表和指南（工具自描述的胜利），把项目上下文文件包进 `<project_context>`（受项目信任门控），用两阶段加载注入 skills（目录进提示词、body 按需读），最后加上工作目录。prompt 模板和 skills 是两种"可复用提示词"，分别服务用户和模型；22 个内置斜杠命令与扩展/skill/模板命令共享 `/` 入口；`ResourceLoader` 统一发现所有资源，并支持 `/reload` 热加载。

最深刻的是两阶段 skill 加载。它用"目录常驻、内容按需"解决了"能力越多、提示词越臃肿"的根本矛盾——这又一次体现了 Pi Agent 的核心哲学：把复杂性推到边缘，让核心（这里是系统提示词）保持精简。

下一章，我们看装配好的 `AgentSession` 如何被三种运行模式消费——同一条事件流，三种截然不同的呈现。
