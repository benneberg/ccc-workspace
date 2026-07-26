# Persistent Memory System Specification (MEMORY.md)

## Overview & Architecture

The CCC AI Workspace incorporates a **local-first, lightweight memory system** designed to maintain context across sessions and repositories without the complexity, overhead, or external dependencies of vector databases.

By utilizing structured file persistence (JSON and Markdown) backed by SQLite metadata indexing and CCC query augmentation, the system achieves fast, reliable context retrieval suitable for embedded and cloud-container environments.

---

## Memory Structures & Storage Layout

All persistent memory entries reside on disk under `data/memory/`.

```
data/memory/
├── repositories/      # Repository-specific notes, conventions, and architectural facts
│   └── <repo>_<id>.json
├── sessions/          # Cross-session chat context and user interaction history
│   └── <session_id>.json
├── summaries/         # High-level task execution summaries
│   └── <task_id>_summary.md
└── architectural_notes.md  # Global system architectural guidelines
```

### 1. Repository Memory (`data/memory/repositories/<repo>_<id>.json`)
Stores technical facts, architectural patterns, dependency constraints, and project conventions learned during AI interaction.

**Schema Format (JSON)**:
```json
{
  "id": "1721900000000",
  "repo": "my-backend-app",
  "content": "The app uses Express with custom middleware for JWT authentication located in src/middleware/auth.ts",
  "tags": ["auth", "express", "middleware", "security"],
  "lastUsed": "2026-07-25T19:50:00.000Z",
  "createdAt": "2026-07-25T18:30:00.000Z"
}
```

### 2. Session Memory (`data/memory/sessions/<session_id>.json`)
Stores conversation turns, active context variables, pinned files, and user preferences for ongoing work sessions.

**Schema Format (JSON)**:
```json
{
  "sessionId": "sess_default",
  "currentRepo": "my-backend-app",
  "pinnedFiles": ["src/middleware/auth.ts", "package.json"],
  "lastActiveTask": "task_102",
  "updatedAt": "2026-07-25T19:55:00.000Z"
}
```

### 3. Task Summaries (`data/memory/summaries/<task_id>_summary.md`)
Human-readable markdown documents generated upon completion of a major task (`updateTaskStatus("done")`). Captures task goals, code changes made, tests executed, and lessons learned.

### 4. Architectural Notes (`data/memory/architectural_notes.md`)
A consolidated markdown file containing global workspace guidelines, code style rules, and build requirements shared across repositories.

---

## Retrieval Strategy

To avoid the memory footprint and cold-start latency of vector embeddings, CCC uses a multi-layered hybrid retrieval engine (`memoryService.searchMemory`):

```
+-------------------------------------------------------+
|                   User Query                          |
+-------------------------------------------------------+
                           |
                           v
         +----------------------------------+
         | 1. Keyword Match (Content Search)|
         +----------------------------------+
                           |
                           v
         +----------------------------------+
         | 2. Tag Matching & Recency Filter |
         +----------------------------------+
                           |
                           v
         +----------------------------------+
         | 3. CCC Semantic Query Augment    |
         +----------------------------------+
                           |
                           v
+-------------------------------------------------------+
|            Ranked Memory Context (Top N)              |
+-------------------------------------------------------+
```

### 1. Keyword Retrieval
- Performs case-insensitive substring search across `content` fields of stored memory entries for the active repository.

### 2. Tag Matching & Recency Ranking
- Matches tags provided in `saveMemory` or extracted from query tokens.
- Ranks results by `lastUsed` timestamp, prioritizing recently referenced architectural decisions over legacy notes.

### 3. CCC Query Augmentation
- Query strings are passed to the CCC alignment engine (`ccc.query(query, "semantic")`).
- CCC provides structural and dependency insight from indexed code symbol graphs, appending virtual context entries (`ccc-augmented`) to the retrieved memory list.

---

## Integration with AI Agent (`ai.ts`)

The memory system is directly accessible to the Gemini AI agent via two core tools:

1. **`saveMemory(content: string, tags?: string[])`**:
   - The AI automatically invokes this tool when discovering crucial repository setup facts, custom conventions, or environment rules.

2. **`searchMemory(query: string)`**:
   - The AI queries persistent memory before beginning complex refactoring tasks to check for prior decisions or known architectural constraints.

---

## Principles & Benefits

- **Zero External Vector DB**: No dependencies on heavy vector indices (Pinecone, ChromaDB, Weaviate).
- **Human Auditable**: Memory entries are standard JSON/Markdown files readable and editable directly in disk tools or text editors.
- **Fast Startup**: Zero initialization overhead on server startup (`fs.mkdir` + local filesystem scan).
- **Persistent Across Restarts**: Preserved on disk across dev server reboots and Cloud Run container re-deployments.
