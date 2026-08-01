import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

const config = defineConfig({
	title: "Pi Agent 源码解析",
	description: "一个最小化 AI 编程 Agent 的架构、模式与内部机制",
	lang: "zh-CN",
	// GitHub Pages 将站点挂在 https://<user>.github.io/<repo>/ 下
	base: "/pi-agent-from-source/",
	// 书的正文位于 book/，index.md 为序言页
	srcDir: "book",
	lastUpdated: true,
	themeConfig: {
		nav: [{ text: "序言", link: "/" }],
		socialLinks: [{ icon: "github", link: "https://github.com/kuwii/pi-agent-from-source" }],
		sidebar: [
			{ text: "序言", link: "/" },
			{
				text: "第一部分：基础",
				items: [
					{ text: "第 1 章 · 架构总览", link: "/ch01-architecture" },
					{ text: "第 2 章 · pi-ai 统一 LLM 层", link: "/ch02-ai-layer" },
				],
			},
			{
				text: "第二部分：Agent 核心",
				items: [
					{ text: "第 3 章 · Agent Loop", link: "/ch03-agent-loop" },
					{ text: "第 4 章 · 工具系统", link: "/ch04-tools" },
					{ text: "第 5 章 · 状态、消息与会话树", link: "/ch05-state-and-session-tree" },
				],
			},
			{
				text: "第三部分：持久化编排",
				items: [
					{ text: "第 6 章 · AgentHarness", link: "/ch06-harness" },
					{ text: "第 7 章 · 上下文压缩与分支摘要", link: "/ch07-compaction" },
				],
			},
			{
				text: "第四部分：编码 Agent 产品",
				items: [
					{ text: "第 8 章 · 启动流水线", link: "/ch08-bootstrap" },
					{ text: "第 9 章 · AgentSession", link: "/ch09-agent-session" },
					{ text: "第 10 章 · 系统提示词与资源装配", link: "/ch10-system-prompt" },
					{ text: "第 11 章 · 三种运行模式", link: "/ch11-modes" },
				],
			},
			{
				text: "第五部分：终端界面",
				items: [
					{ text: "第 12 章 · pi-tui 自研渲染器", link: "/ch12-tui-rendering" },
					{ text: "第 13 章 · 输入、按键与编辑器", link: "/ch13-input-and-editor" },
				],
			},
			{
				text: "第六部分：扩展与连接",
				items: [
					{ text: "第 14 章 · 扩展系统", link: "/ch14-extensions" },
					{ text: "第 15 章 · 远程控制", link: "/ch15-remote" },
				],
			},
			{
				text: "第七部分：质量与结语",
				items: [
					{ text: "第 16 章 · 行为评估 pi-evals", link: "/ch16-evals" },
					{ text: "第 17 章 · 结语", link: "/ch17-epilogue" },
				],
			},
		],
		outline: { level: [2, 3], label: "本页目录" },
		search: { provider: "local" },
		docFooter: { prev: "上一章", next: "下一章" },
		lastUpdated: { text: "最后更新" },
		returnToTopLabel: "回到顶部",
		sidebarMenuLabel: "菜单",
		darkModeSwitchLabel: "主题",
		lightModeSwitchTitle: "切换到浅色模式",
		darkModeSwitchTitle: "切换到深色模式",
		footer: {
			message: "基于 MIT 许可的 Pi Agent 源码分析 · 仅供教育用途",
			copyright: "本书与 Pi Agent 维护者无关，未获背书或赞助",
		},
	},
	mermaid: {
		theme: "default",
		// Fix CJK text clipping: mermaid miscalculates foreignObject height
		// for CJK characters, causing bottom lines to be cut off.
		themeCSS: `
			.node foreignObject,
			.node foreignObject > * {
				overflow: visible !important;
			}
			.label foreignObject,
			.label foreignObject > * {
				overflow: visible !important;
			}
		`,
	},
});

export default withMermaid(config);
