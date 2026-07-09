# ARCHITECTURE.md

## System Architecture

This document outlines the architectural blueprint of the CCC AI Workspace (MiMo) application.

---

### 1. High-Level Component Layout
The system implements a dual-layer local-first architecture: a React PWA frontend communicating over WebSockets to a Node.js full-stack Express server, backed by SQLite and a Code Context Compiler (CCC) adapter.

```
       ┌──────────────────────────────┐
       │     PWA Frontend (React)     │
       └──────────────────────────────┘
                      ▲
                      │ (WebSockets & REST APIs)
                      ▼
       ┌──────────────────────────────┐
       │    Runtime Server (Express)  │
       │   - Session Manager          │
       │   - Task service (SQLite)    │
       │   - Approval Gate            │
       │   - Memory Service (SQLite)  │
       └──────────────────────────────┘
                      ▲
                      │ (Bridge CLI / Fallbacks)
                      ▼
       ┌──────────────────────────────┐
       │     CCC Adapter (Python)     │
       │   - Symbol Resolver          │
       │   - Dependency Tracer        │
       │   - Code Base Indexer        │
       └──────────────────────────────┘
```

* **Confidence**: `High` (Matches verified package structure and imported files).

---

### 2. Data Flow & Source of Truth
* **State Management**:
  - The UI maintains active session messages and active task progress states.
  - **Single Source of Truth (Database)**: Task lists, statuses, and repository memories are persisted in local SQLite databases, indexed by repository path.
  - **Single Source of Truth (Filesystem)**: The physical files inside active directories are read/written directly via the `fs/promises` toolsets.
* **WebSocket Flow**:
  1. The user inputs a prompt or uploads a file.
  2. The prompt is dispatched over WebSockets to the server.
  3. The server processes the request, routing tool calls (such as CCC, search, command, git status/diff, or writes) through approval checks.
  4. Large/overwriting file-write tools are halted inside `approvalManager`, which registers the pending operation and fires a `pending_approval` WebSocket frame back to the client.
  5. The client reviews the diff, clicks Approve/Reject, sending an `approve_write` event to release the block and proceed with the write or return an abort error.
  6. Conversational tokens are streamed back in real-time.

* **Confidence**: `High` (Directly verified in `server.ts`, `src/App.tsx`, and `src/server/approvalManager.ts`).

---

### 3. Core Subsystems & Integrations
* **CCC Cognition Adapter (`src/server/ccc/index.ts`)**:
  - Coordinates Python bridge commands (`ccc_bridge.py`) for index-heavy symbol mapping.
  - Implements fully redundant, zero-dependency Node.js fallback mechanisms using highly optimized text/regex scanning algorithms.
* **Task Planner & Status Tracker (`src/server/taskService.ts`)**:
  - Automatically structures larger engineering operations into organized task sequences, tracking states such as pending, active, completed, or failed.
* **Memory Indexer (`src/server/memory.ts`)**:
  - Saves architectural findings and facts into a database index for subsequent context retrieval.
* **Integrated Version Control (Git)**:
  - Leverages local host shell instances to call `git status` and `git diff` on target directories, formatting outputs cleanly for AI prompt alignment.

* **Confidence**: `High` (Validated via code inspections and successful builds).

---

### 4. Deployment Model
* **Model**: Local-first or self-hosted workspace container (e.g., Cloud Run or local desktop).
* **Network Constraints**: Port 3000 is the sole externally accessible port routed via the reverse proxy. All WebSocket traffic binds to the Express listener on `0.0.0.0:3000`.

* **Confidence**: `High` (Consistent with the environment parameters and platform rules).

---

### 5. Risks and Mitigations
* **Risk**: The target system lacks `python3` or the custom CCC Python bindings are absent.
  - **Mitigation**: The system detects failures and switches transparently to local Node-native regex scanners for symbol mapping and file searching.
* **Risk**: Deleting or overwriting critical configuration files by accident.
  - **Mitigation**: The `approvalManager` enforces a mandatory security gate in the UI, blocking any write operation that modifies existing files or creates files larger than 1000 characters until a user actively confirms.

* **Confidence**: `High` (Observed in `src/server/tools/index.ts` and `src/server/ccc/index.ts`).
