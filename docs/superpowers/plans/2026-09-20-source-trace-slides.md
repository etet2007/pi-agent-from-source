# Pi Agent Source Trace Slides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the beginner Pi Agent HTML deck with six source-tracing slides that connect the call chain to real source excerpts, emitted events, and state changes.

**Architecture:** Keep the existing 24-slide conceptual narrative intact and insert one source-reading divider plus five synchronized source walkthrough slides after the product-layer explanation. Each walkthrough uses a consistent source/evidence/state layout and cites the current vendored source snapshot.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Motion One, Markdown outline.

**Spec:** User-approved continuation of the six-slide source walkthrough proposed in the conversation.

## Global Constraints

- Keep Chinese-first beginner language and the existing Indigo Porcelain theme.
- Use the real current call chain and current checkout line anchors.
- Show short source excerpts, not full-file dumps.
- Every walkthrough slide must show source, observable event/output, state change, and the next call-chain hop.
- Preserve keyboard navigation, notes, page numbers, and the existing deck interaction model.
- Commit only `presentation/index.html` and `presentation/outline.md`; leave `docs/` untracked.

## Review Focus

- Source snippets must remain accurate to the vendored `pi-agent-src` snapshot.
- Thirty page numbers and navigation dots must agree.
- Code blocks must remain readable at 1280x720 without overflow.
- Theme rhythm must not contain three consecutive identical themes.
- Existing concept and extension/safety sections must retain their meaning after renumbering.

---

### Task 1: Add the source-tracing narrative to the outline

**Files:**
- Modify: `presentation/outline.md`

**Interfaces:**
- Consumes: the existing 24-page narrative and the approved six-page source trace.
- Produces: a 30-page page map used to verify the HTML deck.

- [ ] **Step 1: Update positioning and duration**

Change the deck description from 24 pages / 30–35 minutes to 30 pages / 40–45 minutes and state that the deck includes a real source-tracing chapter.

- [ ] **Step 2: Insert six source-trace rows**

Add rows for the call-chain divider, product-to-core entry, loop, model stream, tool execution, and session persistence.

- [ ] **Step 3: Renumber the extension, safety, reading-guide, and closing rows**

Move the old pages 20–24 to pages 26–30 and update the visible-content rules.

### Task 2: Implement synchronized source walkthrough slides

**Files:**
- Modify: `presentation/index.html`

**Interfaces:**
- Consumes: current source excerpts from `agent-session.ts`, `agent.ts`, and `agent-loop.ts`.
- Produces: six slides with source/evidence/state synchronization.

- [ ] **Step 1: Add reusable source-trace CSS**

Define compact source code, breadcrumb, evidence, and state-change styles in the shared style block.

- [ ] **Step 2: Insert the six slides after page 19**

Use alternating hero/light/dark themes and add speaker notes to every slide.

- [ ] **Step 3: Renumber the remaining deck**

Update every visible total from 24 to 30 and make the existing last five slides pages 26–30.

### Task 3: Verify and publish

**Files:**
- Test: `presentation/index.html`
- Test: `presentation/outline.md`

**Interfaces:**
- Consumes: the completed deck.
- Produces: a verified commit on the fork `main` branch.

- [ ] **Step 1: Run structural checks**

Verify 30 slides, 30 notes, consecutive page numbers, source anchors, JavaScript syntax, theme rhythm, and `git diff --check`.

- [ ] **Step 2: Run browser layout and interaction checks**

Load the local file in Chrome, inspect the source slides, and verify there is no overflow at 1440x810 and 1280x720.

- [ ] **Step 3: Commit and push only presentation files**

Stage `presentation/index.html` and `presentation/outline.md`, commit, push `fork main`, and compare the local and remote SHA.
