# TESTING_DELTA.md

## Testing Status and Expansion Plan

This document outlines the current testing status, the delta required to achieve production readiness, and concrete strategies to implement the tests.

---

### 1. Current Testing Status
- **Observed**:
  - Code compiles successfully (`npm run build`).
  - Linter checks pass (`npm run lint`).
  - Currently, there is a `test_sqlite.ts` script in the root directory to verify SQLite database access.
  - No formal test suite (e.g., Jest, Vitest, Cypress) is configured in `package.json`.
- **Status Summary**: `STATIC & LINT VALIDATION ONLY`. The build and lint checks are highly reliable, but unit and integration test coverage is currently absent.

---

### 2. Testing Delta (Required vs Present)
To elevate this codebase to professional, production-ready standards, the following testing gaps must be closed:

| Area | Priority | Target Suite | Objective |
| :--- | :--- | :--- | :--- |
| **Approval Manager** | High | Vitest / Jest | Verify that substantial file writes and overwrites trigger an approval and await approval resolution correctly. |
| **Tools Sandbox** | High | Vitest / Jest | Assert that `readFile` and `writeFile` handle paths correctly and prevent writing invalid content. |
| **CCC Fallback Logic** | Medium | Vitest | Validate that CCC search-based fallbacks compile symbols and dependencies accurately when Python is missing. |
| **WebSocket Protocol** | Medium | Supertest | Verify that Express successfully handles WebSocket stream connection events and routes messages correctly. |

---

### 3. Proposed Testing Strategy

#### Unit Testing Framework: Vitest
We recommend installing `vitest` as a dev dependency and writing localized tests.

**Example Unit Test for `approvalManager` (`src/server/approvalManager.test.ts`):**
```typescript
import { describe, it, expect, vi } from "vitest";
import { approvalManager } from "./approvalManager";

describe("ApprovalManager Tests", () => {
  it("should detect overwrite approval requirements correctly", async () => {
    const result = await approvalManager.checkWriteApprovalNeeded(
      "package.json",
      "new content",
      process.cwd()
    );
    expect(result.needed).toBe(true);
    expect(result.reason).toContain("overwritten");
  });
});
```

---

### 4. Continuous Integration (CI)
- Configured lint script can be plugged into a standard GitHub Action to ensure all commits are audited before merging:
```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm run build
```
