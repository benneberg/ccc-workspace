# SKILLS.md

## Skill System Overview

Skills are reusable cognitive workflows that extend the runtime.
A skill provides specialized instructions, execution patterns, context strategies, and validation guidance.

## Goals
- Improve consistency
- Reduce prompt repetition
- Encode workflows
- Improve context quality

## Skill Structure
`skills/[skill-name]/`
- `SKILL.md`
- `metadata.json`
- `templates/`
- `references/`

## Initial MVP Skills

### repository-review
Architecture review guidance, dependency review, risk analysis.

### refactor-assistant
Impact-aware refactoring guidance, validation steps, migration planning.

### spec-implementation
Markdown spec interpretation, implementation planning, validation workflows.

### test-fixer
Failure analysis, debugging workflows, validation loops.

## Skill Principles
- **Keep Skills Small**: Focused, composable, understandable.
- **Prefer Guidance Over Control**: Skills guide execution; the runtime owns the flow.
