# AGENTS.md

本文件为 AI 驱动的书籍内容维护而写。动手修改前，请先阅读本文件，再对照 `book/style.css`、`book/common.js` 和任一现有章节（推荐 `book/ch01-architecture.html`）确认当前约定——它们是活文档。

## 项目概述

这是一个技术书籍项目：《**Pi Agent 源码解析**》——对 [Pi Agent](https://pi.dev)（`@earendil-works/pi-coding-agent` 及其同族包，版本 `v0.83.0`）的源码分析笔记。

- 书籍以**零依赖 HTML** 直接编写：只有 `book/style.css` 与 `book/common.js` 两个共享文件，**禁止任何第三方 CSS / JS / 字体 / CDN**。
- 无构建步骤。浏览器直接打开 `book/index.html`（file:// 协议即可）阅读全书。
- **双语出版**：`book/` 为中文版，`book/en/` 为英文版（同一页面框架、英文内容，部署后以 `/en/...` 访问）。**修改任何内容必须同步两个语言版本**（见「双语维护」）。
- 教育性、独立的源码分析，与 Pi Agent 维护者无关（免责声明由 `common.js` 自动写入页脚）。
- 姊妹作品：《Prime Agent 源码解析》（续作，其代码库正是 `pi-mono` 的派生）；《Claude Code 源码解析》（参照系，代表"综合体"路线）。

## 仓库布局

| 路径 | 职责 | 注意事项 |
|---|---|---|
| `book/` | 书籍全部内容：`index.html`（序言）、`ch01–ch17` 章节、`style.css`、`common.js` | 本项目唯一需要维护的产物 |
| `book/en/` | 英文版：与 `book/` 一一对应的 `index.html` + `ch01–ch17`，同框架、英文内容 | 修改正文时必须同步（见「双语维护」） |
| `pi-agent-src/` | git submodule，指向 https://github.com/earendil-works/pi.git | **分析对象，只读，禁止修改** |
| `.github/workflows/deploy.yml` | GitHub Pages 静态部署 + 资源 cache-bust | 直接部署 `book/` 下的 HTML（含 `book/en/`），无需构建 |
| `.tmp/` | 临时与参照资料（git-ignored） | 不要提交 |

## 书籍结构与元数据

全书七部分、17 章 + 序言，**章节清单只维护一处：`book/common.js` 顶部的 `BOOKS.zh.chapters` 与 `BOOKS.en.chapters`**（两份列表的 `file`/`no` 相同，`title`/`part` 分别为中英文）。它们驱动页头面包屑、目录、章内 TOC、前后章导航、页脚。

```
第一部分 · 基础           ch01 架构总览   ch02 pi-ai 统一 LLM 层
第二部分 · Agent 核心     ch03 agent-loop ch04 tools  ch05 state-and-session-tree
第三部分 · 持久化编排     ch06 harness    ch07 compaction
第四部分 · 编码 Agent 产品 ch08 bootstrap  ch09 agent-session  ch10 system-prompt  ch11 modes
第五部分 · 终端界面       ch12 tui-rendering  ch13 input-and-editor
第六部分 · 扩展与连接     ch14 extensions ch15 remote
第七部分 · 质量与结语     ch16 evals      ch17 epilogue
```

- 新增/重排/改名章节，必须同步更新 `BOOKS.zh.chapters` 与 `BOOKS.en.chapters` 两份清单（`file`、`no`、`title`、`part`），否则导航与目录会错乱。
- 部分名（如「第二部分 · Agent 核心」/「Part II · Agent Core」）同时出现在 `common.js` 的章节清单与章节页面的 `chapter-kicker` 中，中英文各自保持一致。
- 目录与章内目录由 `style.css` 的媒体查询响应式控制：`<1180px` 目录为点击弹出的抽屉；`1180–1599px` 目录常驻左侧栏（无章内目录）；`≥1600px` 右侧再显示章内目录。
- 页面为**固定深色蓝黑主题**，不随系统明暗切换；配色变量全部集中在 `style.css` 的 `:root`。

## 单章 HTML 骨架

新章节以现有章节为模板复制，遵循以下结构：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>第 N 章 · 短标题 | Pi Agent 源码解析</title>
<link rel="stylesheet" href="style.css?v=__CACHE_BUST__">
</head>
<body data-chapter="chNN">          <!-- 序言页为 <body data-page="index"> -->

<div id="pb-main">
<div class="pb-content-col">
<article class="chapter">

<header class="chapter-head">
  <p class="chapter-kicker">第二部分 · Agent 核心</p>   <!-- 部分名 -->
  <h1>第 N 章：长标题</h1>
  <p class="chapter-sub">一句话副题</p>
</header>

<!-- h2 章节标题需显式写 id（锚点稳定），如 <h2 id="hook"> -->

<!-- ……正文…… -->

<h2 id="practice">实践应用</h2>       <!-- 章节收尾固定两节 -->
<ol>…几条可迁移的经验…</ol>
<h2 id="summary">总结</h2>
<p>…总结 + 引向下一章的过渡段…</p>

<div id="pb-nav-holder"></div>
</article>
</div>
</div>

<script src="common.js?v=__CACHE_BUST__"></script>
<script>
PB.fig("fig-name", function (d) { … });
</script>
</body>
</html>
```

要点：

- **不要**手写页头、目录、前后章导航、页脚——`common.js` 会根据当前语言的 `BOOK`（`BOOKS.zh` / `BOOKS.en`）自动生成，章节内只留 `<div id="pb-nav-holder"></div>`。
- 标题格式：`<title>` 用 `第 N 章 · 短标题 | Pi Agent 源码解析`；`<h1>` 用 `第 N 章：长标题`；`.chapter-sub` 是凝练的一句话副题。英文版见「双语维护」。
- h2 会由 `common.js` 自动加 `§` 前缀并生成章内 TOC 与右侧目录；h2/h3 未写 id 时会自动补，但约定上**显式写 id** 以保证锚点稳定。
- `<link>`/`<script>` 的 URL 带 `?v=__CACHE_BUST__` 占位符；部署时由 GitHub Actions 用 `style.css` + `common.js` 的内容哈希替换（见 `.github/workflows/deploy.yml`），用于绕过浏览器缓存。**勿手动改占位符**，新增章节复制骨架时保留它。

## 代码引用约定（本书的核心规范）

- 书中所有文件路径**相对于 `pi-agent-src/` 目录**（即 Pi Agent 仓库根）。
- 代码块写法（内容为**已做 HTML 转义**的源码，由 `common.js` 客户端高亮，不要手写 `<span>` 高亮类）：

```html
<pre class="code" data-lang="ts" data-file="packages/agent/src/agent-loop.ts">
// 源码原文，注意 &lt; &gt; &amp; 必须转义
</pre>
```

- `data-lang` 支持：`ts` / `python` / `bash` / `json` / `toml` / `yaml` / `text`（别名：`js`/`jsx`/`tsx`/`typescript`→ts，`py`→python，`sh`/`shell`→bash，`jsonc`→json，`ini`→toml）。
- 片段可省略类型标注或分支，但**函数名、类型名、字段名、文件位置必须与源码一致，可直接检索核对**。
- 写作前必须先在 `pi-agent-src/` 中核实引用的代码与路径，严禁凭记忆写代码引用。

## 插图（canvas + PB.fig）

```html
<figure class="fig">
  <div class="fig-box"><canvas data-fig="NAME" data-w="860" data-h="430"></canvas></div>
  <figcaption>图 N：图题</figcaption>
</figure>
```

- 图号**每章从 1 重新计数**；`data-fig` 名称在页面内唯一。
- 绘图代码写在页尾 `<script>PB.fig("NAME", function (d) { … })</script>`，API：`d.box` / `d.pill` / `d.group` / `d.arrow` / `d.path` / `d.text` / `d.sequence`（时序图）/ `d.stack`（分层图）。用法见 `book/ch01-architecture.html` 与 `book/index.html`。
- 坐标以 canvas 的 `data-w` / `data-h` 为基准；配色用 `tone: "accent" | "teal" | "gold" | "violet" | "slate"`（蓝 / 青 / 琥珀 / 紫 / 灰蓝）。
- 画布绘制是响应式的（DPR、重绘由库处理），只需要保证 `data-w`/`data-h` 与绘图坐标匹配，且不要把元素画到画布外。

## 其他排版元素（样式见 style.css）

- 提示框：`<div class="callout note|compare|deep|warn">`，内含 `<div class="callout-title">标题</div>`。本书常用 `compare` 做与 Claude Code 综合体路线的对照。
- 表格：外层包 `<div class="table-wrap">`（横向滚动）。
- `blockquote`（引用源码注释/官方文档）、`.epigraph`（题记，强调句）、`kbd`（键位）、`hr.sep`（分隔线）。
- 行内代码用 `<code>`，行内路径同样相对 `pi-agent-src/`。

## 写作风格与原则

- **中文行文**；代码、标识符、文件路径、CLI 命令保持英文，不翻译。
- 分析必须有源码证据；对设计的解读以「作者解读」的口吻表述，不冒充官方文档。
- 全书主线：**最小化核心 / 复杂性守恒 / 与 Claude Code 综合体路线对照**。每个看似"缺失"的功能都要能解释为「被刻意放在了核心之外」。
- 版本声明：分析基于 `v0.83.0`。若升级 submodule 的分析版本，需同步检查 `index.html` 的版本表述与各章过时内容。
- 章节收尾固定「实践应用 + 总结」两节，总结段末尾要写一句引向下一章的过渡。

## 零依赖铁律

- 只允许使用 `style.css` 与 `common.js`。禁止引入任何第三方 CSS / JS / 字体 / 图标库 / CDN 链接 / 构建工具。
- 所有内容就地以 HTML 编写；没有构建步骤，改动即生效。

## 双语维护（zh ↔ en）

本书有中英双版本：`book/`（中文）与 `book/en/`（英文，部署后位于 `/en/...`）。页面框架（`style.css`、`common.js`）为两版共享，改一次即同时生效；正文与元数据则有两份，必须同步。

- **铁律：修改任何内容时必须同步两个语言版本**——章节正文、插图（图题 + 画布文字）、表格、callout、README、导航文案。只改一版视为未完成。
- 章节新增/重排/改名：同时更新 `common.js` 中 `BOOKS.zh.chapters` 与 `BOOKS.en.chapters`（两份的 `file`/`no` 相同，`title`/`part` 分别为中英文），并在两个语言版本中同步新建/修改/删除对应页面。英文部分名与章标题以 `BOOKS.en` 为准。
- 英文版页面规则：
  - `book/en/*.html` 与中文版一一对应；h2/h3 的 id、`data-fig` 名称、canvas 尺寸、`<pre class="code">` 内容必须与中文版**逐字节一致**；`PB.fig` 坐标与结构不变，仅翻译字符串标签。
  - `<html lang="zh-CN">` → `<html lang="en">`；`style.css` / `common.js` 引用加 `../` 前缀（保留 `?v=__CACHE_BUST__` 占位符）；章间链接仍为同目录文件名。
  - 标题格式：`<title>` 用 `Chapter N · 短标题 | Pi Agent Source Code Analysis`；`<h1>` 用 `Chapter N：长标题`；kicker 用英文部分名；图题 `Figure N：…`。
- 语言切换按钮组（页头「中文 | English」）与 README 顶部的 `[ **中文** | [English](README.en.md) ]` 由 `common.js` 与两个 README 各自维护，**不要**在章节 HTML 里手写切换链接。
- README 修改必须同步 `README.md` 与 `README.en.md`，两版顶部的语言切换行都要保留，互链指向对方版本。

## 修改后验证

在浏览器中打开 `book/index.html`（file:// 即可），逐页检查：

1. 新章节出现在页头面包屑、目录、前后章导航中（即 `BOOKS[LANG].chapters` 注册正确）。
2. 代码块渲染为带 `cb-head` 文件头的卡片且语法高亮正常——**未转义或转义错误会直接导致高亮错乱或页面 HTML 被破坏**。
3. canvas 插图正常显示，缩放窗口后仍正常（库会自动重绘）。
4. 浏览器 console 无报错。
5. 双语改动：同时打开 `book/en/` 对应页面，确认结构一致、无残留中文；页头语言切换按钮可跳转到另一版本。

另有可选的自动化校验（位于 `.tmp/verify/`，git-ignored，仅本机使用）：

- `node .tmp/verify/verify-book.mjs [文件名]` —— 静态校验：BOOK.chapters 对照、标签平衡、HTML 转义、内部链接、data-fig/PB.fig 配对。
- `node .tmp/verify/verify-en.mjs [文件名]` —— 英文版校验：与中文版对照 id/data-fig/canvas/代码块一致性、`../` 资源引用、残留中文扫描。
- `node .tmp/verify/fig-test.mjs [文件名]` —— 图形校验：以记录器重放每个 PB.fig（坐标边界、箭头 id 引用），再用伪造 canvas 真实渲染冒烟。

## Git 约定

- 提交信息风格：小写、简短、祈使句，如 `migrate book to zero-dependency html`。
- 只暂存明确的路径（`git add <path1> <path2>`）；**绝不**使用 `git add -A` / `git add .`。
- `pi-agent-src` 是 submodule，由上游管理，不要在其中提交，也不要改动其指针；`.tmp/` 已被 `.gitignore` 忽略，不要提交。

## 给 AI 维护者的事项清单

- **事实性内容**（路径、函数名、行为描述、版本号）改动前必须对照 `pi-agent-src/` 源码核实。
- **任何内容改动都要中英文两版同步**（见「双语维护」）；漏改英文版视为未完成。
- 改书籍元数据（标题、顺序、部分划分）只动 `common.js` 的 `BOOKS.zh.chapters` 与 `BOOKS.en.chapters`。
- 新增章节：复制现有章节骨架 → 写正文 → 注册进 `BOOKS.zh.chapters` 与 `BOOKS.en.chapters` → 在 `book/en/` 同步英文版 → 浏览器验证（或跑 `.tmp/verify/` 的脚本）。
- 不要向 `pi-agent-src/` 写入任何内容；不要改动上游仓库。
