# CCC AI Workspace (MiMo)

A lightweight, local-first, developer-governed AI software engineering workspace. This application integrates the **Code Context Compiler (CCC)** with state-of-the-art **Gemini LLMs** inside a secure, interactive, and responsive sandbox to streamline codebase exploration, architectural auditing, and file development.

---

## Key Features

### 🧠 1. Deterministic Codebase Cognition
By interfacing with the Code Context Compiler, the platform maps symbolic structures, dependency relationships, and files across the workspace. If the native compiled environment is unavailable, the workspace seamlessly degrades to optimized, zero-dependency local Node.js regex scanners.

### 🛡️ 2. Human-in-the-Loop Security Gate
The workspace enforces strict safety bounds for AI agents. File write requests (`writeFile`) that overwrite existing files or write substantial content require immediate authorization, generating visual real-time security prompts in the UI.

### 📋 3. Automated Task Orchestrator
Engineering goals are planned, structured, and validated sequentially. The task dashboard monitors and reports on each step, from planning and execution to automated compilation and verification.

### 💾 4. Lightweight Persistence
Conversations, system-wide memories, and task structures are saved locally using standard SQLite databases and markdown files, bypassing heavy, expensive cloud database requirements.

### 📱 5. PWA Mobile-First Layout
A highly optimized, fast-loading, responsive design tailored for smooth desktop use and comfortable mobile audit reviews.

---

## Architecture Overview

* **Frontend**: React, Vite, Tailwind CSS, Framer Motion (for elegant fluid transitions).
* **Backend**: Express, Node.js + TypeScript type stripping, WebSockets (`ws`), SQLite, local Python execution bindings.
* **Integrations**: Gemini 1.5/2.0 API frameworks, Git version control, local system command tool sandboxes.

---

## Installation & Setup

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **npm** (or yarn)
* **Python 3** (Optional, for native CCC compilation bridges)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file in the root directory (using `.env.example` as a template):
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Start Development Server
Launch the full-stack server on port `3000`:
```bash
npm run dev
```

### 4. Build and Compile
Bundle and compile the production assets:
```bash
npm run build
```

---

## Tool Capabilities

* **`readFile` / `writeFile`**: Read file contents, and write files safely behind a real-time user-approval barrier.
* **`gitStatus` / `gitDiff`**: Monitor unstaged modifications, staged changes, and clean working trees directly from the terminal layer.
* **`search`**: Perform lightning-fast, regex-powered text matching across the codebase.
* **`runCommand`**: Run compilation, lint checking, and local script verification routines.
