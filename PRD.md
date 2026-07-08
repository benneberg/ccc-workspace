# PRD: CCC AI Workspace

## Project Vision

Build a lightweight local-first AI coding workspace optimized for personal software engineering workflows.

The system should combine:
- Gemini AI models
- CCC repository cognition
- Tool-assisted coding workflows
- Persistent lightweight memory
- Mobile-first usability

The product is designed primarily for:
- Personal use
- Fast iteration
- Repository understanding
- AI-assisted development
- Specification-driven coding

The system should prioritize:
- Speed
- Simplicity
- Deterministic behavior
- Low infrastructure complexity
- Local execution
- Developer control

## Core Goals

The application must allow the user to:
- Open existing repositories
- Upload zip files or individual files
- Create empty projects
- Ask questions about codebases
- Generate code from markdown specifications
- Refactor existing code
- Run tests and linting
- Review architecture and dependencies
- Maintain lightweight persistent memory
- Use reusable AI skills/workflows
- Work efficiently from desktop and iPhone

## Non-Goals

The MVP should NOT attempt to become:
- A full IDE
- An autonomous agent swarm
- A cloud platform
- A distributed orchestration system
- A replacement for GitHub
- A multi-user enterprise platform

The system should remain:
- Single-user
- Local-first
- Lightweight
- Understandable
- Hackable

## Core Product Philosophy

### CCC is the source of repository intelligence
The runtime should rely on CCC for:
- Repository indexing
- Dependency analysis
- Symbol resolution
- Architecture understanding
- Convention extraction
- Impact analysis

The runtime should orchestrate CCC rather than duplicate its responsibilities.

## Core Workflows

### Repository Understanding
User asks:
- “How does authentication work?”
- “What depends on UserService?”
- “Where is MQTT reconnect logic implemented?”

System:
1. Queries CCC
2. Builds focused context
3. Asks Gemini model
4. Returns grounded answer

### Spec-Driven Development
User provides:
- Markdown specification
- Architecture notes
- Feature request

System:
1. Analyzes repository
2. Generates implementation plan
3. Edits files
4. Runs tests
5. Presents diff

### Refactoring Workflow
User requests:
- Rename
- Migration
- Cleanup
- Architecture improvement

System:
1. Performs impact analysis via CCC
2. Proposes changes
3. Executes edits
4. Validates with tests/linting
5. Shows reviewable diff

### Review Workflow
User asks for:
- Code review
- Architecture review
- Security review
- Dependency review

System:
1. Gathers repository context
2. Analyzes affected areas
3. Produces structured findings

## Supported Models
- **Gemini 1.5 Flash**: Fast lightweight tasks (summaries, indexing helpers, quick edits, autocomplete).
- **Gemini 1.5 Pro**: Complex reasoning (architecture, planning, refactoring, specification execution).
- **Gemini 1.5 Flash (Multimodal)**: Image and multimodal workflows.

## UX Principles
- Chat-first interface
- Mobile-friendly
- Streaming responses
- Minimal UI complexity
- Fast interactions
- Clear diff review before edits
- Human approval before destructive actions

## Technical Principles
- Local-first
- Node.js + TypeScript runtime
- SQLite persistence
- PWA frontend
- File-based memory where practical
- WebSocket streaming
- Structured tool execution
- Deterministic repository cognition through CCC

## Success Criteria
The MVP is successful if it can reliably:
- Answer repository questions accurately
- Generate useful code changes
- Refactor safely
- Run and interpret tests
- Maintain repository memory
- Work smoothly on iPhone
- Operate locally with low overhead
