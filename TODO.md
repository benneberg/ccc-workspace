# TODO.md - Workspace Action Tracking

## Codebase TODOs and Status Summary

This file tracks implementation progress, security hardening, and feature completion across the CCC AI Workspace application.

---

### Phase 1: Security Hardening (Completed ✅)
- [x] **Path Traversal Guards**: Implemented `isPathAllowed` rules in `ToolOrchestrator` (`src/server/tools/toolOrchestrator.ts`) resolving real paths and preventing directory traversal outside `process.cwd()` and `mounted_repos/`.
- [x] **Command Security & Filtering**: Added regex and pattern filtering in `runCommand` (`src/server/tools/toolOrchestrator.ts`) blocking destructive commands (`rm -rf /`, `mkfs`, `dd`, fork bombs).
- [x] **WS Origin Logging & Validation**: Configured origin header inspection during WebSocket handshake in `server.ts` to log and sanitize client origins.

---

### Phase 2: Core Feature Extensions (Completed ✅)
- [x] **Interactive Diff Reviewer**: `src/components/DiffViewer.tsx` displays clean side-by-side (desktop) and stacked (mobile) diff comparisons with additions/deletions and chunk approval triggers.
- [x] **Memory Tags Inspector Component**: Added `src/components/MemoryInspector.tsx` rendering interactive repository memories, searchable tags, and timestamp indicators directly in the navigation drawer.
- [x] **Git Committing Tool**: Added `gitCommit` tool to `ToolOrchestrator` and `ai.ts` tool definitions with automated staging (`git add -A`), semantic commit messages, and human approval verification.

---

### Phase 3: Developer Experience & Quality (Completed ✅)
- [x] **Test Harness & Runner**: Created `src/server/tools/bun_runner.ts` and `test_sqlite.ts` for running end-to-end tool execution and database unit tests.
- [x] **GitHub Actions CI Workflow**: Added `.github/workflows/ci.yml` defining automated Node.js 20 build and lint (`tsc --noEmit`) steps on push and pull requests.
- [x] **Comprehensive Documentation Alignment**: Updated `IMPLEMENTATION_PLAN.md`, `UI.md`, `MEMORY.md`, `README.md`, `ARCHITECTURE.md`, `PURPOSE.md`, `REPO_STATUS.md`, `AUDIT.md`, `TESTING_DELTA.md`, `PRD.md`, `SKILLS.md`, `TASKS.md`, `TOOLS.md`.
