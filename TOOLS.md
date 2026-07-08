# TOOLS.md

## Tool Runtime Overview

Tools are deterministic runtime capabilities exposed to the AI runtime.

Tools allow models to:
- Inspect repositories
- Modify files
- Execute commands
- Validate changes
- Query CCC

All tools must:
- Have explicit schemas
- Return structured responses
- Support logging
- Support permission validation

## Core Principles

### Deterministic Execution
Tools should produce predictable outputs. Avoid:
- Hidden side effects
- Uncontrolled state mutation
- Implicit context

### Explicit Permissions
Every tool must declare:
- Capabilities
- Filesystem scope
- Destructive potential

### Structured Results
All tool outputs must be machine-readable.

## Tool Categories

### Repository Tools
- **readFile**: Reads file contents.
- **writeFile**: Writes file contents. Requires approval for overwrites/large changes.
- **applyPatch**: Applies unified diffs. Preferred over full rewrites.
- **search**: Repository text search (regex, glob, symbol).

### CCC Tools
- **cccQuery**: Executes CCC queries (context, symbolism, etc).
- **cccImpact**: Runs impact analysis.
- **cccWorkspaceQuery**: Queries multi-repository workspace context.

### Git Tools
- **gitDiff**: Returns current diff.
- **gitStatus**: Returns repository status.
- **gitCommit**: Creates commits (approval required).

### Execution Tools
- **runCommand**: Executes terminal commands (restricted).
- **runTests**: Runs repository tests (structured output).
- **runLint**: Runs linters/typecheckers.

## Tool Result Format
All tools return:
```json
{
  "success": true,
  "tool": "readFile",
  "data": {},
  "error": null,
  "duration_ms": 32
}
```

## Approval Rules

### Auto Allowed
- Reads
- Searches
- CCC queries
- Diffs

### Approval Required
- File writes
- Patch applications
- Command execution
- Git commits
- Dependency installation

## MVP Tool Set
- `readFile`
- `writeFile`
- `applyPatch`
- `search`
- `cccQuery`
- `gitDiff`
- `gitStatus`
- `runTests`
- `runLint`
- `runCommand`
