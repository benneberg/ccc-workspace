# System Architecture (ARCHITECTURE.md)

## System Overview

This document outlines the technical architecture of the CCC AI Workspace (MiMo) application.

The system is built as a local-first, developer-governed web workspace. A React 18 frontend communicates over WebSockets and Express REST endpoints to a Node.js runtime server powered by Gemini models (@google/genai SDK), SQLite, and the Code Context Compiler (CCC).

---

## 1. High-Level Component Topology

```
┌──────────────────────────────────────────────────────────┐
│                   PWA Frontend (React)                   │
│   - Chat Timeline & Streaming Markdown                   │
│   - Task Panel (TaskPanel.tsx)                           │
│   - Diff Viewer (DiffViewer.tsx)                         │
│   - Memory Inspector (MemoryInspector.tsx)               │
│   - Navigation & Repository Switcher                     │
└────────────────────────────┬─────────────────────────────┘
                             │
            WebSockets (ws) & REST APIs (Port 3000)
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│                 Runtime Server (Express)                 │
│   - Connection Lifecycle & WS Origin Logging             │
│   - Tool Orchestrator Engine (toolOrchestrator.ts)       │
│     * Zod Schema Validation                              │
│     * Path Traversal Protection (isPathAllowed)          │
│     * Security Command Filtering                         │
│     * Human-in-the-Loop Approval Manager                 │
│   - Task Management Service (taskService.ts / SQLite)    │
│   - Persistent Memory Service (memory.ts / SQLite)       │
│   - Repository Management Service (repoService.ts)       │
└────────────────────────────┬─────────────────────────────┘
                             │
               Tool Execution & CCC Engine
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│              Codebase & Execution Sandbox                │
│   - Local Workspaces (`mounted_repos/`)                  │
│   - CCC Symbol Compiler & Query Engine                   │
│   - System Shell Execution (`git`, `grep`, `npm`)        │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Core Subsystems

### A. Tool Orchestrator Engine (`src/server/tools/toolOrchestrator.ts`)
- **Type-Safe Registry**: Every tool (`readFile`, `writeFile`, `applyPatch`, `runCommand`, `search`, `listFiles`, `findFiles`, `gitStatus`, `gitDiff`, `gitCommit`, `saveMemory`, `searchMemory`) is registered with a Zod schema.
- **Security Bounds**:
  - `isPathAllowed`: Verifies file target paths reside within `process.cwd()` or `mounted_repos/` bounds, resolving symlinks to prevent traversal.
  - `permissionCheck`: Command filtering blocks destructive shell operations (`rm -rf /`, `mkfs`, etc.).
- **Human Approval Gate (`approvalManager.ts`)**: Halts file overwrites, diff patches, or commits until the user clicks "Approve" in the UI.

### B. Streaming AI Engine (`src/server/ai.ts`)
- Uses `@google/genai` Gemini API (`gemini-3.5-flash` / `gemini-1.5-pro`) to process conversation histories and system instructions.
- Delivers real-time incremental tokens over WebSockets (`stream_token`).
- Handles tool call loops (`tool_call` -> `orchestrator.execute` -> `tool_result`).

### C. Persistent Memory System (`src/server/memory.ts`)
- Stores repository architectural facts, tags, and notes under `data/memory/repositories/` and `data/memory/sessions/`.
- Retrieves relevant context using keyword searching, tag filtering, recency ranking, and CCC semantic query augmentation.
- Exposed to the UI via `/api/memory` and the `MemoryInspector` component.

### D. Task Management Engine (`src/server/taskService.ts`)
- Tracks structured engineering goals created by AI agents or users in SQLite.
- Supports state transitions (`pending`, `active`, `done`, `error`) and records detailed logs per step.

---

## 3. Data Flow & Event Sequences

### Tool Execution Flow with Approval Gate
```
User Prompt -> WS Chat Event -> Gemini Model
                                      │
                                 Tool Call (e.g. writeFile)
                                      │
                               Tool Orchestrator
                                      │
                        ┌─────────────┴─────────────┐
                        │ Requires User Approval?   │
                        └─────────────┬─────────────┘
                                      │
                   ┌──────────────────┴──────────────────┐
                   ▼                                     ▼
                [ Yes ]                               [ No ]
                   │                                     │
    Approval Manager registers pending            Direct Execution
   Sends `pending_approval` to UI                        │
                   │                                     │
    User clicks "Approve" in UI                          │
   Sends `approve_write` event                           │
                   │                                     │
                   └──────────────────┬──────────────────┘
                                      │
                              Tool Execution
                                      │
                          `tool_result` to Client
```

---

## 4. Deployment & Network Rules

- **Container Port**: Single accessible port `3000` routed via NGINX reverse proxy.
- **Dev & Production Scripts**: Express server serves static Vite production bundle from `dist/` or Vite dev middleware in development.
- **Data Persistence**: Local filesystem SQLite DB (`data/ccc_workspace.db`) and memory JSON files survive application restarts.
