# TODO.md

## Codebase TODOs and Enhancements

This list tracks priority actions to continuously improve and harden the CCC AI Workspace application.

---

### Phase 1: Security Hardening (High Priority)
- [ ] **Path Traversal Guards**: Add path-sanitization rules to `readFile` and `writeFile` to ensure files cannot be read from or written to directories outside of the workspace or designated folder bounds.
- [ ] **Command Whitelisting**: Define a strict list of allowed command patterns for `runCommand` (e.g. `npm test`, `git status`, `git diff`, `npm run lint`) and reject other invocations.
- [ ] **WS Origin Check**: Configure origin-checking headers in the Express WebSocket handshake (`server.ts`) to ensure connections originate only from approved clients.

---

### Phase 2: Feature Extensions (Medium Priority)
- [ ] **Interactive Diff Editor**: Enhance the `DiffViewer.tsx` to allow line-by-line selection and staging of changes before applying writes.
- [ ] **Memory Tags Visualization**: Build a frontend page displaying current repository memories and associations stored in the SQLite database.
- [ ] **Git Committing Tools**: Add a structured `gitCommit` tool, allowing the agent to create granular, semantic commits after writing successful code.

---

### Phase 3: Developer Experience & Quality (Low Priority)
- [ ] **Vitest Suite**: Add full test configurations and mock environments for Express routes.
- [ ] **GitHub Action CI**: Define a standard workflow file in `.github/workflows/` to automatically lint and compile the workspace on code change events.
