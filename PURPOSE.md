# PURPOSE.md

## Product Purpose & Value Proposition

### 1. Product Summary
The **CCC AI Workspace (MiMo)** is a local-first, highly responsive, developer-governed AI coding sandbox. It is engineered to seamlessly bridge the gap between deterministic code cognition (via the Code Context Compiler) and standard large language model (LLM) agents, enabling precise codebase exploration, automated task tracking, and safe, guided code generation.

---

### 2. Problem Statement
Modern AI software engineering assistants often struggle with:
1. **Context Bloat**: Feeding entire codebases into LLMs is slow, costly, and leads to hallucinations.
2. **Lack of Determinism**: Purely vector-based or LLM-driven file search fails on exact structural, symbolic, and dependency resolutions.
3. **Safety Concerns**: Autonomous file modifications can corrupt active branches without a reliable, structured review mechanism.
4. **Desktop-Centricity**: Developers cannot easily monitor progress, answer repo questions, or review/approve code changes while on mobile devices.

---

### 3. Target Audience
* **Software Engineers & Architects** (Confidence: `High`): Developers looking for precise codebase analysis, fast symbolic searches, and structured task-execution loops.
* **Open Source Maintainers** (Confidence: `Medium`): Teams managing diverse contributions needing high-fidelity dependency tracing and impact assessment before merging changes.
* **AI Developers / Prompt Engineers** (Confidence: `High`): Creators building and testing complex agentic toolflows in a local sandbox workspace.

---

### 4. Value Proposition
* **Deterministic Repository Cognition**: Replaces loose heuristics with formal symbols, dependencies, and workspace analysis via the Code Context Compiler.
* **Human-in-the-Loop Safeguards**: Integrated write approvals gate every overwrite and large creation, visualised through rich, responsive sidebars.
* **Lightweight SQLite-backed State**: Avoids heavy, complex databases, instead using standard, performant local SQLite and markdown engines.

---

### 5. Features

#### Verified Features (Observed in Codebase)
* **Real-time Streaming Chat**: Multi-turn agent dialog displaying live execution traces.
* **Interactive Task Planner**: Supports "Plan &rarr; Execute &rarr; Validate" progressions, tracked in a sliding panels drawer.
* **CCC Cognition Adapter**: Queries symbols, context, and dependencies with structured, regex-based fallback processors.
* **VCS Integration**: Built-in, live `gitStatus` and `gitDiff` operations.
* **Write Security Gate**: An overlay blocking substantial or destructive file overwrites until verified and approved in the UI.

#### Inferred Features
* **Semantic Code Grounding**: Automatically pulling in contextual memories when querying standard codebase files.

#### Future Features
* **Branch Isolation**: Running code changes in isolated git branches for risk-free sandbox evaluation.
