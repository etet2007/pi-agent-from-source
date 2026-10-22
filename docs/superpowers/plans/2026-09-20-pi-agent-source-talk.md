# Pi Agent Source Talk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chinese, source-backed, single-entry HTML presentation that explains Pi Agent v0.83.0 to a mixed technical audience in 20–25 minutes.

**Architecture:** Keep the cloned analysis repository and upstream submodule read-only, and place the talk in an independent `presentation/` directory. Start from the magazine/e-ink HTML template, embed concise slides plus per-slide speaker notes, and verify both source claims and rendered behavior.

**Tech Stack:** Static HTML/CSS/JavaScript, WebGL background, Lucide icons, Motion One fallback asset.

**Spec:** `README.md`, `AGENTS.md`, and the source-backed Chinese chapters under `book/`.

## Global Constraints

- Chinese-first, aimed mainly at programmers with brief explanations for non-R&D colleagues.
- One browser entrypoint: `presentation/index.html`; no build step.
- Theme preset: Indigo Porcelain.
- Preserve the upstream book and `pi-agent-src/` submodule unchanged.
- All factual claims must be traceable to the checked-out source or book at commit `113aa7bd333334d967b86f037796e17b1b847e54`.
- No emoji icons; use Lucide or text.

## Review Focus

- Slides must remain readable at 16:9 and avoid vertical overflow.
- Keyboard, wheel, touch, overview, pipeline stepping, and speaker-note toggling must coexist.
- Every page must declare a valid light/dark theme and preserve the planned visual rhythm.
- Source paths and counts must match the checked-out submodule.
- The deck must still show content if fonts, Lucide, or Motion CDN requests fail.

---

### Task 1: Establish the source-backed story

**Files:**
- Create: `presentation/outline.md`
- Read: `book/index.html`, `book/ch01-architecture.html`, `book/ch03-agent-loop.html`, `book/ch09-agent-session.html`, `pi-agent-src/packages/agent/src/agent-loop.ts`

**Interfaces:**
- Consumes: repository prose and the `v0.83.0` submodule source.
- Produces: an 18-slide narrative, theme rhythm, source anchors, and speaker-note intent.

- [x] **Step 1: Record the audience, duration, thesis, and three-act narrative.**
- [x] **Step 2: Map every technical claim to a repository path.**
- [x] **Step 3: Fix the 18-page theme rhythm before writing markup.**
- [x] **Step 4: Check that the outline contains no generic TypeScript tutorial detours.**

### Task 2: Implement the single-entry HTML deck

**Files:**
- Create: `presentation/index.html`
- Create: `presentation/assets/motion.min.js`

**Interfaces:**
- Consumes: `presentation/outline.md` and the magazine template.
- Produces: a horizontal presentation with embedded speaker notes.

- [x] **Step 1: Copy the template and replace the title and theme variables.**
- [x] **Step 2: Add 18 sections using only verified template classes and inline layout overrides.**
- [x] **Step 3: Add hidden source-backed speaker notes to every section.**
- [x] **Step 4: Add an `N` keyboard shortcut and a readable notes overlay without changing slide navigation.**
- [x] **Step 5: Copy the local Motion One fallback asset.**

### Task 3: Validate structure and rendering

**Files:**
- Verify: `presentation/index.html`
- Verify: `presentation/assets/motion.min.js`

**Interfaces:**
- Consumes: the completed presentation artifacts.
- Produces: static and visual evidence that the deck is ready to present.

- [x] **Step 1: Run placeholder, page-count, theme-rhythm, and source-path checks.**
- [x] **Step 2: Parse the HTML and confirm all 18 sections and 18 notes blocks exist.**
- [x] **Step 3: Open the page in a browser and inspect representative dense, hero, and pipeline slides.**
- [x] **Step 4: Exercise ArrowRight, End, Escape, and `N`; inspect the browser console.**
- [x] **Step 5: Fix visible overflow, wrapping, or interaction regressions and repeat the checks.**
