# MEMORY.md

## Memory System Overview

A lightweight persistent memory system to maintain repository and session context.

## Storage Structure
`data/memory/`
- `repositories/` - Long-term repository-specific summaries and notes.
- `sessions/` - Recent chat history and context.
- `summaries/` - High-level architectural summaries.

## Persistence
- **SQLite**: Used for indexing memory (keywords, tags, recency).
- **Markdown/JSON**: Primary storage for the actual memory content.

## Strategy
- **No Vector DB initially**: Use keyword retrieval, CCC query augmentation, and recency.
- **Context Augmentation**: Inject repository memory into the LLM prompt based on the current task.
