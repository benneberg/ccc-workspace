# UI Design & Experience (UI.md)

## Core Philosophy
The interface is **Chat-First** and **Mobile-First**. It is designed to feel like a sophisticated conversation with an expert engineer who has full access to your codebase. 

We avoid "IDE-bloat". This is not a VSCode replacement; it is a **reasoning and execution engine** that you can use from your phone or a slim browser window.

---

## Layout Architecture

### 1. Mobile-First Layout
- **Single Column View**: The primary view is the chat timeline.
- **Drawer Navigation**: Repositories, settings, and context management are hidden behind a "Hamburger" or "Swipe-right" drawer.
- **Action Overlays**: Context-sensitive menus (like selecting a file or approving a diff) appear as slide-up sheets or overlays.
- **Bottom Bar**: A persistent input area with "Plus" menu for quick actions (camera, file upload, search).

### 2. Repository Switcher
- **Visual Identity**: Each repository has a unique generated icon or color-coded avatar.
- **Quick-Access**: A horizontal scroll at the top of the drawer or a dropdown below the chat header.
- **Context Pinning**: Ability to "pin" active files or directories to the current conversation context.

### 3. Task Panel
- **Status Hub**: A dedicated area (collapsible sidebar on desktop, overlay on mobile) that shows:
  - **Plan**: The multi-step sequence the AI has generated.
  - **Activity**: Real-time logs of tool executions (grep, lint, test).
  - **Health**: Indicator of build status and test results.
- **Interactive Steps**: Users can tap steps to see logs or manually override/approve transitions.

### 4. Diff Review Flow
- **Inline Diffs**: Small changes are shown as code blocks with standard +/- highlighting.
- **Complex Diffs**: Larger changes trigger a "Review Mode" overlay.
  - **Side-by-Side (Desktop)** / **Stacked (Mobile)** comparison.
  - **Partial Approval**: Checkboxes to approve specific chunks of code.
  - **Comment & Loop**: Option to say "do this but slightly differently" directly on the diff.

---

## Interaction Model

### 1. Streaming UX
- **Incremental Rendering**: Markdown and code blocks render as they are received via WebSocket.
- **Ghosting Tools**: When the AI decides to use a tool, a "ghost" element appears showing the tool being invoked (e.g., "Searching for class 'AuthHelper'...") before the result returns.

### 2. Conversation with Awareness
- **File Reference Chips**: Mentioning a file with `@file` creates an interactive chip that links to the code.
- **Context Injection**: Users can drag folders or code snippets into the chat to "feed" the AI specific context.

### 3. Upload & Ingestion UX
- **Drag & Drop**: In desktop, drop zip files or folders to "mount" them.
- **Progress Tracking**: Large uploads show a byte-by-byte progress bar and an immediate "Indexing" status once complete.
- **Scan Phase**: After upload, the UI shows a "Summary" of what was found (detected languages, framework, entry points).

---

## Aesthetic: "Sophisticated Brutalism"
- **Colors**: Deep blacks (#050505), Slate grays (#1A1A1A), and high-contrast Emerald/Amber for status.
- **Typography**: Inter for interface, JetBrains Mono for code and logs.
- **Borders**: Thin, 1px borders with subtle glows for active elements.
- **Animation**: Use `motion` for fluid drawer transitions and staggered list entrances.
