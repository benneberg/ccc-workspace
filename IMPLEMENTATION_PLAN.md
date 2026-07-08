# IMPLEMENTATION_PLAN.md

## Phased Build Approach

### Phase 1: Foundation & Runtime
- **Runtime Environment**: Initialize Express + TypeScript server (optimized for speed).
- **Real-time Communication**: Establish WebSocket server for low-latency streaming chat and tool telemetry.
- **Intelligence Core**: Integrate Gemini 1.5 (MiMo) with function calling capabilities.
- **Repository Mounting**: Implement local directory scanning and virtual file system mounting.
- **CCC Integration**: Build the bridge to `contextcompiler` for deterministic code indexing and semantic search.

### Phase 2: Tool Runtime & Basic Tools
- **Tool Execution Engine**: Secure sandbox for running file operations and system commands.
- **Core Toolset**:
  - `readFile` & `writeFile`: Reliable state-managed I/O.
  - `search`: Grep-powered repository-wide pattern matching.
  - `applyPatch`: Intelligent diff application and conflict detection.
  - `gitDiff` & `gitStatus`: Version control awareness.
- **Diff System**: Backend logic for generating diffs between current state and proposed AI changes.

### Phase 3: Tasks & Validation
- **Task Orchestrator**: Logic for "Planning -> Executing -> Validating" multi-file changes.
- **Validation Pipeline**:
  - `runLint`: Integration with ESLint/Prettier.
  - `runTests`: Automatic test suite execution after changes.
- **Feedback Loop**: Self-healing logic where AI fix failures discovered during validation.

### Phase 4: Intelligence & Skills
- **Context Management**: 
  - **Memory Persistence**: SQLite-backed session and cross-session knowledge storage.
  - **Skills System**: Dynamic loading of capability-specific instructions from `SKILLS.md`.
- **Repository Summaries**: Automated generation of `ARCHITECTURE.md` and module-level summaries using CCC.

### Phase 5: Polish & Excellence
- **Mobile Excellence**: Complete PWA support (Offline manifests, service workers).
- **Sophisticated Uploads**:
  - Multi-file drag-and-drop.
  - Remote URL mounting (Github/Zip).
- **Concurrency**: Support for multi-user sessions and parallel task execution.

---

## Technical Constraints & Guardrails
1. **No IDE Emulation**: Focus on the chat as the primary view, not a file tree + editor.
2. **Server-Authoritative**: All tool execution and indexing happens on the server.
3. **Deterministic First**: Always prefer CCC semantic indexing over pure "needle-in-a-haystack" LLM search.
4. **Safety**: Destructive file writes must pass through the Diff Review Flow.
