# CCC AI Coding Workspace

A lightweight, local-first, developer-governed AI software engineering workspace. This application integrates the **Code Context Compiler (CCC)** with state-of-the-art **Gemini LLMs** (@google/genai SDK) inside a secure, interactive, and responsive sandbox to streamline codebase exploration, architectural auditing, and automated file development.

---

## Key Features & System Capabilities

### 🧠 1. Deterministic Codebase Cognition (CCC)
Interfaces with the Code Context Compiler to map symbolic structures, dependency relationships, and repository files. Integrates semantic queries (`ccc_query`, `ccc_context`, `ccc_align`) to inform AI model reasoning.

### 🛡️ 2. Zod-Validated Tool Orchestrator (`src/server/tools/toolOrchestrator.ts`)
All tool invocations are schema-validated with Zod, logged for auditability, and guarded by security checks:
- **Path Traversal Protection**: Enforces strict directory boundaries on file paths.
- **Command Security**: Blocks destructive system commands (`rm -rf /`, `mkfs`, fork bombs).
- **Human-in-the-Loop Approval Gate**: Overwrites and substantial writes trigger real-time approval modals in the UI.

### 📋 3. Automated Task Orchestrator (`src/server/taskService.ts`)
Engineering goals are planned, structured, and validated sequentially. The Task Panel (`src/components/TaskPanel.tsx`) tracks steps (`pending`, `active`, `done`, `error`) and logs execution metrics.

### 💾 4. Local-First Persistent Memory & Inspector (`src/components/MemoryInspector.tsx`)
Repository notes, conventions, and architectural facts are persisted locally in `data/memory/` and indexed via SQLite. Users can search and inspect saved tags directly from the UI.

### 📱 5. Mobile-First Chat UX (`UI.md`)
Designed for mobile browsers and tablets with single-column streaming chat, slide-out drawer navigation, inline diff viewing (`DiffViewer.tsx`), and zip repository drag-and-drop ingestion.

---

## Documentation Index

- [**IMPLEMENTATION_PLAN.md**](./IMPLEMENTATION_PLAN.md) - Phased development roadmap (Runtime Server -> Tools -> UI -> Memory).
- [**UI.md**](./UI.md) - Detailed UI/UX specification, mobile layout, diff review flow, and anti-IDE principles.
- [**MEMORY.md**](./MEMORY.md) - Specification of persistent memory structures, storage layouts, and retrieval strategies.
- [**ARCHITECTURE.md**](./ARCHITECTURE.md) - Full technical architectural breakdown and data flow diagrams.
- [**TODO.md**](./TODO.md) - Action item tracking and feature completion statuses.

---

## Architecture Overview

* **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion (`motion/react`), Lucide Icons.
* **Backend**: Express on Node.js 20, TypeScript, WebSockets (`ws`), SQLite (`better-sqlite3`), Multer zip parser.
* **Integrations**: Gemini API (@google/genai SDK), Git version control, Tool Orchestrator engine.

---

## Installation & Setup

### Prerequisites
* **Node.js** (v18 or v20 recommended)
* **npm** (or yarn)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env` based on `.env.example`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Start Development Server
Launch the server on port `3000`:
```bash
npm run dev
```

### 4. Build and Lint
Verify type safety and compile production assets:
```bash
npm run lint
npm run build
```

---

## Tool Capabilities Summary

* **`readFile` / `writeFile`**: Read file contents and write files safely with path sanitization and user approvals.
* **`applyPatch`**: Apply unified diffs or SEARCH/REPLACE blocks.
* **`runCommand`**: Execute shell commands with security pattern filtering.
* **`gitStatus` / `gitDiff` / `gitCommit`**: Inspect status, review diffs, and create semantic commits.
* **`search` / `listFiles` / `findFiles`**: Search code patterns via grep, list directories, and match file paths.
* **`saveMemory` / `searchMemory`**: Store and retrieve persistent repository knowledge.
