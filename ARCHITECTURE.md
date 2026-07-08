# ARCHITECTURE.md

## System Overview

The system is a lightweight local-first AI coding runtime built around CCC (Code Context Compiler).

CCC provides deterministic repository cognition.
The runtime orchestrates:
- AI models
- Tools
- Memory
- Tasks
- Skills

The architecture prioritizes:
- Simplicity
- Speed
- Local execution
- Deterministic context assembly
- Mobile usability

## High-Level Architecture

┌────────────────────────────────────┐
│              Web UI                │
│        PWA / Mobile First          │
└────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────┐
│           Runtime Server           │
│                                    │
│ - Chat Session Manager             │
│ - Task Executor                    │
│ - Tool Orchestrator                │
│ - Context Composer                 │
│ - Model Router                     │
│ - Memory Manager                   │
│ - Skill Runtime                    │
└────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────┐
│         CCC Intelligence           │
│                                    │
│ - Query Engine                     │
│ - Dependency Analysis              │
│ - Symbol Resolution                │
│ - Workspace Analysis               │
│ - Convention Extraction            │
│ - Impact Analysis                  │
└────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────┐
│             Repository             │
│        Files / Git / Tests         │
└────────────────────────────────────┘

## Core Principles

### CCC Is The Source Of Repository Truth
The runtime MUST NOT duplicate:
- Indexing
- Dependency analysis
- Symbol resolution
- Architecture extraction

Those responsibilities belong to CCC. The runtime consumes CCC artifacts and query APIs.

### Local First
The system should:
- Run locally
- Store memory locally
- Execute tools locally
- Avoid cloud infrastructure dependencies

Only relevant context should be sent to models.

### Human-Governed Automation
The runtime may:
- Propose edits
- Generate plans
- Execute tasks

But destructive actions require user approval.

### Thin Runtime
The runtime should remain lightweight. Avoid:
- Microservices
- Distributed orchestration
- Autonomous swarms
- Excessive abstraction

## Runtime Responsibilities

### Chat Session Management
Handles:
- Conversations
- Streaming responses
- Session persistence
- Context tracking

### Context Composition
Builds focused AI context using:
- CCC queries
- Repository memory
- Active task state
- Relevant files
- Skill instructions

Context assembly should be deterministic and minimal.

### Task Execution
Responsible for:
- Structured task planning
- Tool execution
- Validation workflows
- Retries
- Status updates

### Tool Orchestration
Responsible for:
- Invoking tools
- Validating tool permissions
- Capturing outputs
- Error handling

### Model Routing
Routes tasks to appropriate Gemini models.

### Memory Management
Maintains:
- Repository memory
- Session memory
- Task history
- Architectural notes

Storage:
- SQLite
- Markdown
- JSON

### Skill Runtime
Responsible for:
- Loading skills
- Evaluating triggers
- Injecting skill instructions
- Attaching skill resources

## Repository Structure

- `src/` - Backend and Frontend source
  - `server/` - Runtime orchestration server (Express)
  - `client/` - Frontend PWA (React + Tailwind)
- `packages/` (Simulated or actual subdirectories)
  - `ccc-adapter/` - Bridge between runtime and CCC
  - `agent/` - Task planning and execution
  - `tools/` - Deterministic tool runtime
  - `memory/` - Persistent memory system
  - `skills/` - Skill loading and execution
- `data/` - Memory, sessions, tasks
- `skills/` - Default skills definitions

## Persistence

### SQLite
Used for:
- Sessions
- Tasks
- Memory index
- Settings

### File Storage
Used for:
- Markdown memories
- Skill definitions
- Task logs
- Generated plans

## Security Model

### Allowed
- Local filesystem access
- Local git operations
- Local command execution

### Restricted
- Destructive commands without approval
- Unrestricted shell execution
- Automatic external uploads

## Mobile Architecture
The frontend MUST function as:
- Responsive web app
- Installable PWA
- Touch-friendly UI

Primary mobile workflows:
- Ask questions
- Review diffs
- Approve changes
- Inspect repositories
- Upload files/images
