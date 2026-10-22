# Beginner Pi Agent Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Pi Agent HTML deck so a reader with no Agent background can follow one concrete task from user input to model response, tool execution, session persistence, UI projection, extension, and security boundaries.

**Architecture:** Keep the existing single-file magazine deck, Indigo Porcelain theme, navigation, speaker notes, and Motion One runtime. Replace the 18-slide expert-first narrative with a 24-slide beginner-first story centered on “update README and run tests,” using visible explanatory prose and source-backed diagrams instead of relying on spoken narration.

**Tech Stack:** Static HTML/CSS/JavaScript, WebGL background, Motion One, Lucide icons, Playwright with local Google Chrome.

**Spec:** `presentation/outline.md`

## Global Constraints

- Chinese-first copy; define jargon on first use.
- Every concept page must visibly answer what it receives, what it does, and what it outputs.
- Keep the Pi source snapshot fixed at `784653468c42387f607d41ed5ca533100e7eb2fe`.
- Preserve the existing Indigo Porcelain theme and single-file runtime.
- Keep the source boundary honest: distinguish source facts, explanatory analogy, and architectural inference.
- Do not introduce images; use existing typography, grids, pipelines, rowlines, callouts, and Lucide icons.
- Preserve keyboard, wheel, touch, dots, ESC overview, and N speaker-notes controls.

## Review Focus

- A reader who does not know LLM tool calling must understand that a tool call is a structured request, not direct execution.
- A reader must be able to trace the example task across multiple model and tool rounds without losing the current state.
- `Agent`, `AgentSession`, `SessionManager`, and UI modes must remain distinct roles.
- Default tools (4) and available built-in catalog (7) must not be conflated.
- Project trust must not be described as a sandbox or per-tool permission system.

---

### Task 1: Replace the expert-first outline with a beginner learning path

**Files:**
- Modify: `presentation/outline.md`

**Interfaces:**
- Consumes: pinned source facts from `pi-agent-src/`
- Produces: 24-page page map, theme rhythm, running example, and per-page source anchor

- [ ] **Step 1: Write the 24-page narrative map**

Use four sections: mental model, core loop, product/session layer, extension/security. Thread the same README-and-tests task through pages 4, 5, 12, 14, 17, 18, 19, and 23.

- [ ] **Step 2: Check beginner coverage**

Confirm the outline explicitly defines Agent, model, context, tool call, tool result, turn, run, session, event, and UI consumer before relying on those terms.

- [ ] **Step 3: Check source anchors**

Map every factual page to `types.ts`, `agent-loop.ts`, `core/tools/index.ts`, `agent-session.ts`, `session-manager.ts`, `modes/`, `extensions/types.ts`, or `docs/security.md`.

### Task 2: Rewrite the deck content while preserving the visual system

**Files:**
- Modify: `presentation/index.html`

**Interfaces:**
- Consumes: the 24-page outline and existing template CSS/runtime
- Produces: 24 visible slides and 24 hidden speaker-note blocks

- [ ] **Step 1: Replace all 18 slide sections**

Create 24 sections with the planned light/dark/hero rhythm. Every non-divider page must include a visible explanation paragraph, structured rows/cards, and a one-sentence “why it matters” takeaway.

- [ ] **Step 2: Make the running example explicit**

Show this exact input: `请在 README 增加安装说明，然后运行测试。` Follow it through preprocessing, `read`, tool result, `edit`, `bash`, final answer, persistence, and UI rendering.

- [ ] **Step 3: Preserve source-backed numbers and boundaries**

Keep 9 workspace units, 2 nested loops, 10 core events, 7 built-in tool definitions with 4 defaults, 3333 `AgentSession` lines, and 33 extension event overloads. Label SDK as an embedding entry rather than one of the three CLI consumers.

- [ ] **Step 4: Update notes and fixed page numbers**

Each slide gets one or two explanatory note paragraphs; every chrome page number must use `NN / 24`.

### Task 3: Verify facts, readability, and interaction

**Files:**
- Verify: `presentation/index.html`
- Verify: `presentation/outline.md`

**Interfaces:**
- Consumes: completed deck
- Produces: source-audit output and Chrome screenshots

- [ ] **Step 1: Run structural and source assertions**

Assert 24 slides, 24 notes, 24 dots, page-number sequence, theme rhythm, terminology definitions, source-backed counts, and absence of stale 18-page copy.

- [ ] **Step 2: Run Chrome interaction checks**

Load the local file in Google Chrome through Playwright. Check page errors, arrow navigation, ESC overview with 24 cards, N notes, pipeline stepping, and source labels.

- [ ] **Step 3: Render representative screenshots**

Capture the mental-model page, end-to-end map, core loop, concrete tool round, session layer, and security page at 1440×810. Inspect text wrapping, clipping, contrast, and bottom navigation collisions.

- [ ] **Step 4: Commit only presentation artifacts**

Stage `presentation/index.html` and `presentation/outline.md`, keep `docs/superpowers/plans/` local, commit the verified revision, push to `fork/main`, and compare local and remote SHAs.
