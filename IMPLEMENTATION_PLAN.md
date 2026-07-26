# CCC AI Coding Workspace - Phased Implementation Plan (IMPLEMENTATION_PLAN.md)

## Executive Summary & Core Philosophy

This document defines the structured, phased implementation roadmap for building and maintaining the CCC (Code, Context & Control) AI Coding Workspace.

The primary engineering goal is to deliver a **lightweight, chat-first, local-first AI development environment** that provides deep repository awareness and execution control without the bloat of traditional IDEs.

To avoid premature abstractions and ensure an achievable MVP, development follows a strict four-phase sequence:

1. **Phase 1: Runtime Server & Core AI Integration**
2. **Phase 2: Execution Engine & Tool Orchestrator**
3. **Phase 3: Chat-First Mobile & Web Interface**
4. **Phase 4: Persistent Memory & Context Skills**

---

## Phase 1: Runtime Server & Core AI Integration

### Objective
Establish the foundation: an Express-based Node.js runtime server with WebSocket streaming capabilities and direct Gemini API integration (@google/genai SDK).

### Key Deliverables
1. **Express & WebSocket Server (`server.ts`)**
   - Single-port server (Port 3000) running Express with `ws` (WebSocket) server integration.
   - Dual-mode environment: Vite middleware for HMR-less development, compiled bundle for production.
   - Connection lifecycle management: status handshake (`connected`), ping/pong keep-alive, streaming token delivery, and error broadcast.
   - Origin checking and connection sanitization for security.

2. **Core AI Integration (`src/server/ai.ts`)**
   - Server-side Gemini API client using `@google/genai` SDK with secure process environment key handling (`GEMINI_API_KEY`).
   - Bidirectional streaming pipeline delivering incremental tokens (`stream_token`), function call events (`tool_call`), and tool result responses (`tool_result`).
   - Model configuration with system instructions enforcing the CCC engineering personality ("MiMo").

3. **Database & Task State (`src/server/db.ts`, `src/server/taskService.ts`)**
   - Local SQLite database (`better-sqlite3`) for persistent task tracking, session histories, and approval logs.
   - Task lifecycle engine: creating tasks, tracking active steps (`pending`, `active`, `done`, `error`), and maintaining step logs.

---

## Phase 2: Execution Engine & Tool Orchestrator

### Objective
Provide safe, controlled tool execution capabilities allowing the AI agent to inspect, modify, and verify code within mounted workspace repositories.

### Key Deliverables
1. **Tool Orchestrator (`src/server/tools/toolOrchestrator.ts`)**
   - Schema-first tool registry using Zod validation for all tool arguments.
   - Standardized tool result format: `{ success: boolean, tool: string, data?: any, error?: string, duration_ms: number }`.
   - Centralized execution logging for audit trails and UI task panel updates.

2. **Security & Permission Architecture**
   - **Path Traversal Guards (`isPathAllowed`)**: Strict directory boundary validation preventing reads/writes outside workspace root or `mounted_repos/`.
   - **Command Filtering**: Validation on `runCommand` preventing destructive system commands (e.g., `rm -rf /`, `mkfs`, `dd`).
   - **Human-in-the-Loop Security Gate (`src/server/approvalManager.ts`)**: Automatic intervention triggering user approval prompts for file overwrites or large diff applications.

3. **Core Tool Suite (`src/server/tools/index.ts`)**
   - **File Operations**: `readFile`, `writeFile`, `applyPatch` (supporting unified diffs and SEARCH/REPLACE blocks).
   - **Exploration & Search**: `listFiles`, `findFiles`, `search` (grep pattern matching).
   - **Execution & Version Control**: `runCommand`, `gitStatus`, `gitDiff`, `gitCommit`.
   - **CCC Intelligence**: `ccc_query`, `ccc_context`, `ccc_align`, `ccc_workspace`, `ccc_index`.

---

## Phase 3: Chat-First Mobile & Web Interface

### Objective
Build a responsive, highly responsive client interface designed for mobile and desktop, prioritizing conversation, clear diff visibility, and quick action control.

### Key Deliverables
1. **Chat-First Timeline (`src/App.tsx`, `src/components/`)**
   - Streaming markdown rendering with syntax-highlighted code blocks (`react-markdown`).
   - Real-time tool execution chips showing live activity status ("executing", "done", "error").
   - Inline approval modals for approving file write operations.

2. **Mobile Layout & Drawer Architecture**
   - Single-column conversation view optimized for touch targets (44px minimum).
   - Slide-out navigation drawer providing access to mounted repositories, active task panels, and user guides.
   - Sticky bottom input bar with quick upload controls and action buttons.

3. **Repository Switcher & Workspace Ingestion**
   - Multi-repository workspace management (`mounted_repos/`).
   - Drag-and-drop zip file upload and extraction pipeline (`multer`).
   - Repository switcher allowing instantaneous context switching without page reloads.

4. **Diff Review & Task Panel (`src/components/DiffViewer.tsx`, `src/components/TaskPanel.tsx`)**
   - Interactive visual diff viewer displaying additions/deletions with line numbers.
   - Live Task Panel rendering multi-step plans and real-time execution progress.

---

## Phase 4: Persistent Memory & Context Skills

### Objective
Equip the AI agent with long-term memory and structured skill context to enable continuous learning across sessions without relying on complex vector databases.

### Key Deliverables
1. **Lightweight Persistent Memory System (`src/server/memory.ts`)**
   - Repository-specific and session-specific memory storage stored as structured JSON/Markdown files in `data/memory/`.
   - SQLite-indexed retrieval pipeline using tag matching, keyword search, recency sorting, and CCC query augmentation.
   - Direct LLM integration via `saveMemory` and `searchMemory` tools.

2. **Memory Visualization & Management**
   - Dedicated Memory Inspector UI allowing users to view, filter by tag, and search saved repository notes.

3. **Context Skills System (`SKILLS.md`, `src/server/ccc.ts`)**
   - Modular skill guidelines for code refactoring, architecture analysis, testing, and review.
   - Alignment engine (`ccc_align`, `ccc_workspace`) bridging high-level specifications with code changes.

---

## Verification & Quality Strategy

To maintain release readiness throughout development:
- **Linting**: Continuous TypeScript verification (`npm run lint` / `tsc --noEmit`).
- **Compilation**: Full production build verification (`npm run build`).
- **Test Harness**: Independent Bun/Node execution scripts (`bun_runner.ts`, `test_sqlite.ts`) verifying tool orchestrator and database paths.
