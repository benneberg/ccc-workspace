# TASKS.md

## Task System Overview

Tasks are structured execution units handled by the runtime.

Tasks allow the system to:
- Plan work
- Execute steps
- Validate outcomes
- Maintain progress state

Tasks should remain:
- Deterministic
- Inspectable
- Resumable

## Task Lifecycle
Created → Planned → Executing → Validating → Review → Completed

## Task Structure
```json
{
  "id": "task-001",
  "title": "Refactor MQTT reconnect handling",
  "goal": "Improve reconnect reliability using exponential backoff",
  "status": "planned",
  "repository": "iot-platform",
  "constraints": [
    "Do not break public APIs",
    "Maintain test compatibility"
  ],
  "tools_allowed": [
    "readFile",
    "applyPatch",
    "runTests"
  ],
  "success_criteria": [
    "All tests pass",
    "Reconnect retries use exponential backoff"
  ]
}
```

## Task Types
- **Question Task**: Repository understanding only.
- **Refactor Task**: Code modifications across existing functionality.
- **Spec Implementation Task**: Implements functionality from markdown specifications.
- **Review Task**: Analyzes architecture, security, etc.
- **Test Fix Task**: Reproduce failures, identify cause, patch.

## Planning
Every non-trivial task should generate an execution plan, list affected files, risks, and validation steps.

## Validation
Tasks should validate tests, linting, type safety, and dependency integrity.

## Human Approval
Required before destructive changes, dependency changes, commits, or mass refactors.
